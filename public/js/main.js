// main.js - Homepage Dynamic Catalog Logic
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
        const container = document.getElementById('categoryContainer');
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
        grid.innerHTML = `<p style="grid-column:1/-1; text-align:center; color:var(--accent); padding:3rem 0; font-size:1.1rem; font-weight:600;">
            <i class="fas fa-exclamation-triangle"></i> Failed to load books from server. Please try again.
        </p>`;
    }
}

function renderBooks() {
    const grid = document.getElementById('bookGrid');
    if (!grid) return;
    const filtered = booksData.filter(book => {
        const catMatch = activeCategory === 'all' || book.category.toLowerCase() === activeCategory.toLowerCase();
        const q = searchQuery.toLowerCase();
        const searchMatch = book.title.toLowerCase().includes(q) || 
                            book.category.toLowerCase().includes(q) ||
                            (book.description && book.description.toLowerCase().includes(q));
        return catMatch && searchMatch;
    });

    if (filtered.length === 0) {
        grid.innerHTML = `<p style="grid-column:1/-1; text-align:center; color:#a0a0b0; padding:4rem 0; font-size:1.1rem;">
            No books found matching your search or category filter.
        </p>`;
        return;
    }

    grid.innerHTML = '';
    filtered.forEach((book, i) => {
        const isFree = parseFloat(book.price) === 0;
        const displayPrice = isFree ? 'Free' : `$${parseFloat(book.price).toFixed(2)}`;
        const priceColor = isFree ? 'var(--primary-light)' : 'var(--accent)';

        // Create the card element to support hover animations & event handlers
        const card = document.createElement('div');
        card.className = 'book-card fade-in-up';
        card.style.opacity = '0';
        card.style.animation = `fadeIn 0.5s ease forwards`;
        card.style.animationDelay = `${i * 0.08}s`;
        
        card.innerHTML = `
            <div class="book-cover">
                <img src="${book.coverUrl}" alt="${book.title} cover"
                     onerror="this.src='https://images.unsplash.com/photo-1543002588-bfa74002ed7e?q=80&w=600&auto=format&fit=crop'">
                <h3 style="display:none;">${book.title}</h3>
            </div>
            <div class="book-info">
                <span class="book-category">${book.category}</span>
                <h4 class="book-title">${book.title}</h4>
                <span class="book-author">by RPS Bookstore</span>
                <div class="book-footer">
                    <span class="book-price" style="color: ${priceColor}; font-weight:700;">${displayPrice}</span>
                    <button class="read-btn">Details</button>
                </div>
            </div>
        `;
        
        // Make entire card clickable for details redirection
        card.addEventListener('click', () => {
            window.location.href = `book.html?id=${book.bookId}`;
        });
        
        grid.appendChild(card);
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

    const searchBtn = document.getElementById('searchBtn');
    if (searchBtn && searchInput) {
        searchBtn.addEventListener('click', () => {
            searchQuery = searchInput.value;
            renderBooks();
        });
    }

    const categoryContainer = document.getElementById('categoryContainer');
    if (categoryContainer) {
        categoryContainer.addEventListener('click', e => {
            if (e.target.classList.contains('category-btn')) {
                document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                activeCategory = e.target.dataset.category;
                renderBooks();
            }
        });
    }
}
