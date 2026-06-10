// dashboard.js - User Library Dashboard

document.addEventListener('DOMContentLoaded', () => {
    window.addEventListener('load', initDashboard);
});

async function initDashboard() {
    const authState = await checkAuthState();
    if (!authState.authenticated || authState.role !== 'user') {
        showToast("Please sign in to access your dashboard.", "warning");
        setTimeout(() => { window.location.href = 'login.html'; }, 1200);
        return;
    }
    populateProfile(authState.user);
    fetchPurchasedBooks();
}

function populateProfile(user) {
    const name = user.name || 'User';
    if (document.getElementById('profileName')) document.getElementById('profileName').textContent = name;
    if (document.getElementById('profileEmail')) document.getElementById('profileEmail').textContent = user.email || '-';
    if (document.getElementById('profileInitials')) document.getElementById('profileInitials').textContent = name.charAt(0).toUpperCase();
    if (document.getElementById('profileId')) document.getElementById('profileId').textContent = user.userId || '-';
    if (document.getElementById('profileProvider')) document.getElementById('profileProvider').textContent = `${user.authProvider || 'email'} account`;
    if (document.getElementById('profileDate') && user.registrationDate) {
        document.getElementById('profileDate').textContent = new Date(user.registrationDate).toLocaleDateString('en-US', {
            year: 'numeric', month: 'long', day: 'numeric'
        });
    }
}

async function fetchPurchasedBooks() {
    const grid = document.getElementById('purchasedBooksGrid');
    if (!grid) return;
    try {
        const res = await fetch('/api/users/me/purchases');
        if (!res.ok) throw new Error("Failed to load books.");
        const books = await res.json();

        if (books.length === 0) {
            grid.innerHTML = `
                <div style="grid-column:1/-1; text-align:center; color:#a0a0b0; padding:4rem 0;">
                    <i class="fas fa-book-open" style="font-size:3rem; color:#333; margin-bottom:1rem; display:block;"></i>
                    <h3 style="margin-bottom:0.5rem;">Your Library is Empty</h3>
                    <p style="margin-bottom:1.5rem;">Purchase some e-books from the storefront to start reading.</p>
                    <a href="index.html" class="btn-primary" style="text-decoration:none;">Browse Store</a>
                </div>`;
            return;
        }

        grid.innerHTML = '';
        books.forEach((book, i) => {
            grid.innerHTML += `
                <div class="book-card" style="animation:fadeIn 0.4s ease forwards; animation-delay:${i * 0.06}s; opacity:0;">
                    <div class="book-cover">
                        <img src="${book.coverUrl}" alt="${book.title}"
                             onerror="this.src='https://images.unsplash.com/photo-1543002588-bfa74002ed7e?q=80&w=600&auto=format&fit=crop'">
                    </div>
                    <div class="book-info">
                        <span class="book-category">${book.category}</span>
                        <h3 class="book-title">${book.title}</h3>
                        <div class="book-footer" style="margin-top:1.5rem;">
                            <button class="btn-primary" onclick="downloadBook('${book.bookId}')"
                                style="width:100%; border-radius:8px; padding:0.5rem 1rem; font-size:0.9rem;
                                       background:linear-gradient(135deg,var(--success),#55efc4); box-shadow:0 4px 15px rgba(0,184,148,0.25);">
                                <i class="fas fa-download"></i> Download PDF
                            </button>
                        </div>
                    </div>
                </div>`;
        });
    } catch (e) {
        grid.innerHTML = `<p style="grid-column:1/-1; text-align:center; color:var(--danger); padding:2rem 0;">
            <i class="fas fa-exclamation-triangle"></i> ${e.message}
        </p>`;
    }
}

async function downloadBook(bookId) {
    showToast("Starting download...", "info");
    window.location.href = `/api/books/${bookId}/download`;
}

function switchPanel(panelName) {
    document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
    document.querySelectorAll('.dashboard-panel').forEach(p => p.classList.remove('active'));

    // Find matching sidebar link
    document.querySelectorAll('.sidebar-link').forEach(l => {
        if (l.getAttribute('onclick') && l.getAttribute('onclick').includes(panelName)) {
            l.classList.add('active');
        }
    });

    const panel = document.getElementById(`${panelName}Panel`);
    if (panel) panel.classList.add('active');
}
