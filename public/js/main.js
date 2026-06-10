// main.js - Homepage Catalog Logic
let booksData = [];
let activeCategory = 'all';
let searchQuery = '';

document.addEventListener('DOMContentLoaded', () => {
    fetchCategories();
    fetchBooks();
    setupListeners();
});

async function fetchCategories() {
    try {
        const res = await fetch('/api/categories');
        if (!res.ok) return;
        const categories = await res.json();
        const container = document.getElementById('categoriesContainer');
        if (!container) return;
        container.innerHTML = '<button class="category-btn active" data-category="all">All Books</button>';
        categories.forEach(cat => {
            container.innerHTML += `<button class="category-btn" data-category="${cat}">${cat}</button>`;
        });
    } catch (e) {
        console.error("Categories fetch error:", e);
    }
}

async function fetchBooks() {
    const grid = document.getElementById('bookGrid');
    if (!grid) return;
    try {
        const res = await fetch('/api/books');
        if (!res.ok) throw new Error("Could not load books.");
        booksData = await res.json();
        renderBooks();
    } catch (e) {
        grid.innerHTML = `<p style="grid-column:1/-1; text-align:center; color:var(--danger); padding:3rem 0;">
            <i class="fas fa-exclamation-triangle"></i> Failed to load books. Is the server running?
        </p>`;
    }
}

function renderBooks() {
    const grid = document.getElementById('bookGrid');
    if (!grid) return;
    const filtered = booksData.filter(book => {
        const catMatch = activeCategory === 'all' || book.category.toLowerCase() === activeCategory.toLowerCase();
        const q = searchQuery.toLowerCase();
        const searchMatch = book.title.toLowerCase().includes(q) || book.category.toLowerCase().includes(q);
        return catMatch && searchMatch;
    });

    if (filtered.length === 0) {
        grid.innerHTML = `<p style="grid-column:1/-1; text-align:center; color:#a0a0b0; padding:4rem 0; font-size:1.1rem;">
            No books found matching your search.
        </p>`;
        return;
    }

    grid.innerHTML = '';
    filtered.forEach((book, i) => {
        const isFree = parseFloat(book.price) === 0;
        const displayPrice = isFree ? 'Free' : `$${parseFloat(book.price).toFixed(2)}`;
        const priceColor = isFree ? 'var(--success)' : 'var(--primary-light)';

        grid.innerHTML += `
            <div class="book-card" style="animation:fadeIn 0.4s ease forwards; animation-delay:${i * 0.06}s; opacity:0;">
                <div class="book-cover">
                    <img src="${book.coverUrl}" alt="${book.title}"
                         onerror="this.src='https://images.unsplash.com/photo-1543002588-bfa74002ed7e?q=80&w=600&auto=format&fit=crop'">
                </div>
                <div class="book-info">
                    <span class="book-category">${book.category}</span>
                    <h3 class="book-title">${book.title}</h3>
                    <p class="book-author" style="color:#888; font-size:0.9rem; margin-bottom:0.5rem;">Published by RPS</p>
                    <div class="book-footer">
                        <span class="book-price" style="color:${priceColor};">${displayPrice}</span>
                        <a href="book.html?id=${book.bookId}" class="btn-primary"
                           style="padding:0.4rem 1rem; border-radius:20px; font-size:0.9rem; text-decoration:none;">
                            View Details
                        </a>
                    </div>
                </div>
            </div>
        `;
    });
}

function setupListeners() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', e => {
            searchQuery = e.target.value;
            renderBooks();
        });
    }

    const categoriesContainer = document.getElementById('categoriesContainer');
    if (categoriesContainer) {
        categoriesContainer.addEventListener('click', e => {
            if (e.target.classList.contains('category-btn')) {
                document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                activeCategory = e.target.dataset.category;
                renderBooks();
            }
        });
    }
}
