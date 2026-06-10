// admin.js - Admin Dashboard Controller
let categoriesList = [];

document.addEventListener('DOMContentLoaded', initAdminPanel);

async function initAdminPanel() {
    const authState = await checkAuthState();
    if (!authState.authenticated || authState.role !== 'admin') {
        showToast("Unauthorized. Admin access required.", "error");
        setTimeout(() => { window.location.href = 'admin-login.html'; }, 1200);
        return;
    }

    await Promise.all([
        loadSalesDashboard(),
        loadBooksSection(),
        loadUsersSection(),
        loadCategoriesSection()
    ]);

    setupAdminListeners();
}

// ─── Sales Dashboard ──────────────────────────────────────────────
async function loadSalesDashboard() {
    try {
        const res = await fetch('/api/admin/sales-summary');
        if (!res.ok) throw new Error();
        const summary = await res.json();

        document.getElementById('statRevenue').textContent = `$${summary.totalRevenue.toFixed(2)}`;
        document.getElementById('statSales').textContent = summary.salesCount;
        document.getElementById('statUsers').textContent = summary.usersCount;
        document.getElementById('statBooks').textContent = summary.booksCount;

        renderCategoryChart(summary.salesByCategory);

        const tbody = document.getElementById('recentTransactionsTable');
        if (!summary.recentSales || summary.recentSales.length === 0) {
            tbody.innerHTML = `<tr><td colspan="3" style="text-align:center; color:#888; padding:1.5rem 0;">No sales yet</td></tr>`;
        } else {
            tbody.innerHTML = '';
            summary.recentSales.forEach(sale => {
                tbody.innerHTML += `
                    <tr>
                        <td>${sale.userName}</td>
                        <td style="max-width:120px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${sale.bookTitle}</td>
                        <td style="color:var(--success); font-weight:700;">$${parseFloat(sale.amountPaid).toFixed(2)}</td>
                    </tr>`;
            });
        }
    } catch (e) {
        showToast("Could not load sales data.", "error");
    }
}

function renderCategoryChart(data = {}) {
    const container = document.getElementById('categoryRevenueChart');
    if (!container) return;
    const entries = Object.entries(data);
    if (entries.length === 0) {
        container.innerHTML = `<p style="color:#aaa; text-align:center; padding:2rem 0;">No sales data yet</p>`;
        return;
    }
    const maxVal = Math.max(...entries.map(e => e[1]));
    container.innerHTML = '';
    entries.forEach(([cat, amount]) => {
        const pct = maxVal > 0 ? (amount / maxVal) * 100 : 0;
        container.innerHTML += `
            <div class="chart-bar-item">
                <div class="chart-bar-label" title="${cat}">${cat}</div>
                <div class="chart-bar-track">
                    <div class="chart-bar-fill" style="width:${pct}%"></div>
                </div>
                <div class="chart-bar-val">$${amount.toFixed(2)}</div>
            </div>`;
    });
}

// ─── Books Section ────────────────────────────────────────────────
async function loadBooksSection() {
    const grid = document.getElementById('managerBooksGrid');
    if (!grid) return;
    try {
        const res = await fetch('/api/books');
        if (!res.ok) throw new Error();
        const books = await res.json();

        if (books.length === 0) {
            grid.innerHTML = `<p style="grid-column:1/-1; text-align:center; color:#aaa; padding:3rem 0;">
                No books uploaded yet. Click "Upload New E-Book" to add one.
            </p>`;
            return;
        }

        grid.innerHTML = '';
        books.forEach((book, i) => {
            const isFree = book.price === 0;
            grid.innerHTML += `
                <div class="manager-book-card" style="animation:fadeIn 0.4s ease forwards; animation-delay:${i * 0.05}s; opacity:0;">
                    <div class="manager-book-cover">
                        <img src="${book.coverUrl}" alt="${book.title}"
                             onerror="this.src='https://images.unsplash.com/photo-1543002588-bfa74002ed7e?q=80&w=600&auto=format&fit=crop'">
                    </div>
                    <div class="manager-book-info">
                        <div>
                            <span class="manager-book-category">${book.category}</span>
                            <h4 class="manager-book-title">${book.title}</h4>
                        </div>
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-top:0.5rem;">
                            <span class="manager-book-price" style="color:${isFree ? 'var(--success)' : 'var(--primary-light)'};">
                                ${isFree ? 'Free' : `$${book.price.toFixed(2)}`}
                            </span>
                            <div class="manager-actions">
                                <button class="btn-icon edit" onclick="editBook('${book.bookId}')" title="Edit">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="btn-icon delete" onclick="deleteBook('${book.bookId}')" title="Delete">
                                    <i class="fas fa-trash-alt"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>`;
        });
    } catch (e) {
        grid.innerHTML = `<p style="grid-column:1/-1; color:var(--danger); text-align:center;">Failed to load books.</p>`;
    }
}

// ─── Book Modal ───────────────────────────────────────────────────
function openBookModal() {
    document.getElementById('editBookId').value = '';
    document.getElementById('modalTitle').textContent = 'Upload E-Book';
    document.getElementById('bookForm').reset();
    document.getElementById('coverUploadText').textContent = 'Click to select cover image';
    document.getElementById('pdfUploadText').textContent = 'Click to select PDF file';
    document.getElementById('coverRequiredNote').style.display = 'inline';
    document.getElementById('pdfRequiredNote').style.display = 'inline';

    const select = document.getElementById('bookCategory');
    select.innerHTML = '';
    categoriesList.forEach(cat => {
        select.innerHTML += `<option value="${cat}">${cat}</option>`;
    });

    document.getElementById('bookModal').classList.add('active');
}

function closeBookModal() {
    document.getElementById('bookModal').classList.remove('active');
}

function previewFilename(input, textId) {
    const el = document.getElementById(textId);
    if (input.files && input.files[0]) el.textContent = input.files[0].name;
}

async function editBook(bookId) {
    try {
        const res = await fetch(`/api/books/${bookId}`);
        if (!res.ok) throw new Error("Could not fetch book.");
        const book = await res.json();

        document.getElementById('editBookId').value = book.bookId;
        document.getElementById('modalTitle').textContent = 'Edit E-Book';
        document.getElementById('bookTitle').value = book.title;
        document.getElementById('bookDescription').value = book.description;
        document.getElementById('bookPrice').value = book.price;

        document.getElementById('coverUploadText').textContent = 'Current cover (click to replace)';
        document.getElementById('pdfUploadText').textContent = 'Current PDF (click to replace)';
        document.getElementById('coverRequiredNote').style.display = 'none';
        document.getElementById('pdfRequiredNote').style.display = 'none';

        const select = document.getElementById('bookCategory');
        select.innerHTML = '';
        categoriesList.forEach(cat => {
            select.innerHTML += `<option value="${cat}" ${cat === book.category ? 'selected' : ''}>${cat}</option>`;
        });

        document.getElementById('bookModal').classList.add('active');
    } catch (e) {
        showToast(e.message, "error");
    }
}

async function deleteBook(bookId) {
    if (!confirm("Delete this e-book permanently? This cannot be undone.")) return;
    try {
        const res = await fetch(`/api/books/${bookId}`, { method: 'DELETE' });
        const data = await res.json();
        if (res.ok) {
            showToast(data.message, "success");
            await loadBooksSection();
            await loadSalesDashboard();
        } else {
            showToast(data.message || "Delete failed.", "error");
        }
    } catch (e) {
        showToast("Connection error.", "error");
    }
}

// ─── Users & Purchases ────────────────────────────────────────────
async function loadUsersSection() {
    try {
        const [usersRes, purchasesRes] = await Promise.all([
            fetch('/api/admin/users'),
            fetch('/api/admin/purchases')
        ]);

        if (usersRes.ok) {
            const users = await usersRes.json();
            const tbody = document.getElementById('usersTableBody');
            if (users.length === 0) {
                tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:#888;">No users registered.</td></tr>`;
            } else {
                tbody.innerHTML = '';
                users.forEach(u => {
                    tbody.innerHTML += `
                        <tr>
                            <td style="font-family:monospace; font-size:0.8rem; color:var(--primary-light);">${u.userId}</td>
                            <td>${u.name}</td>
                            <td>${u.email}</td>
                            <td style="text-transform:capitalize;">
                                <span class="status-badge ${u.authProvider === 'google' ? 'pending' : 'completed'}">${u.authProvider}</span>
                            </td>
                            <td>${new Date(u.registrationDate).toLocaleDateString()}</td>
                        </tr>`;
                });
            }
        }

        if (purchasesRes.ok) {
            const purchases = await purchasesRes.json();
            const tbody = document.getElementById('purchasesTableBody');
            if (purchases.length === 0) {
                tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:#888;">No purchases yet.</td></tr>`;
            } else {
                tbody.innerHTML = '';
                purchases.forEach(p => {
                    tbody.innerHTML += `
                        <tr>
                            <td style="font-family:monospace; font-size:0.8rem; color:var(--primary-light);">${p.purchaseId}</td>
                            <td>${p.userName}</td>
                            <td>${p.bookTitle}</td>
                            <td style="color:var(--success); font-weight:700;">$${parseFloat(p.amountPaid).toFixed(2)}</td>
                            <td><span class="status-badge completed">${p.paymentStatus}</span></td>
                            <td>${new Date(p.purchaseDate).toLocaleDateString()}</td>
                        </tr>`;
                });
            }
        }
    } catch (e) {
        console.error("Admin users/purchases error:", e);
    }
}

// ─── Categories ───────────────────────────────────────────────────
async function loadCategoriesSection() {
    const container = document.getElementById('categoryTagsContainer');
    if (!container) return;
    try {
        const res = await fetch('/api/categories');
        if (!res.ok) throw new Error();
        categoriesList = await res.json();
        container.innerHTML = '';
        categoriesList.forEach(cat => {
            container.innerHTML += `<span class="category-tag"><i class="fas fa-tag"></i> ${cat}</span>`;
        });
    } catch (e) {
        console.error("Categories fetch error:", e);
    }
}

// ─── Subtab switching ─────────────────────────────────────────────
function switchSubtab(tab) {
    ['users', 'purchases'].forEach(t => {
        document.getElementById(`subtab${t.charAt(0).toUpperCase() + t.slice(1)}`).classList.remove('active');
        document.getElementById(`${t}TableContainer`).style.display = 'none';
    });
    document.getElementById(`subtab${tab.charAt(0).toUpperCase() + tab.slice(1)}`).classList.add('active');
    document.getElementById(`${tab}TableContainer`).style.display = 'block';
}

// ─── Panel switching ──────────────────────────────────────────────
function switchPanel(panelName) {
    document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
    document.querySelectorAll('.dashboard-panel').forEach(p => p.classList.remove('active'));

    document.querySelectorAll('.sidebar-link').forEach(l => {
        if (l.getAttribute('onclick') && l.getAttribute('onclick').includes(panelName)) {
            l.classList.add('active');
        }
    });

    const panel = document.getElementById(`${panelName}Panel`);
    if (panel) panel.classList.add('active');
}

// ─── Form Listeners ───────────────────────────────────────────────
function setupAdminListeners() {
    // Book form submit
    const bookForm = document.getElementById('bookForm');
    if (bookForm) {
        bookForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const editBookId = document.getElementById('editBookId').value;
            const isEditing = editBookId !== '';
            const btn = document.getElementById('saveBookBtn');

            const formData = new FormData();
            formData.append('title', document.getElementById('bookTitle').value);
            formData.append('description', document.getElementById('bookDescription').value);
            formData.append('category', document.getElementById('bookCategory').value);
            formData.append('price', document.getElementById('bookPrice').value);

            const coverFile = document.getElementById('bookCoverInput').files[0];
            const pdfFile = document.getElementById('bookPdfInput').files[0];
            if (coverFile) formData.append('cover', coverFile);
            if (pdfFile) formData.append('pdf', pdfFile);

            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

            const url = isEditing ? `/api/books/${editBookId}` : '/api/books';
            const method = isEditing ? 'PUT' : 'POST';

            try {
                const res = await fetch(url, { method, body: formData });
                const data = await res.json();
                if (res.ok) {
                    showToast(data.message || "Book saved.", "success");
                    closeBookModal();
                    await loadBooksSection();
                    await loadSalesDashboard();
                } else {
                    showToast(data.message || "Save failed.", "error");
                }
            } catch (err) {
                showToast("Connection error.", "error");
            }

            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-save"></i> Save E-Book';
        });
    }

    // Category form submit
    const catForm = document.getElementById('addCategoryForm');
    if (catForm) {
        catForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('newCategoryName').value.trim();
            try {
                const res = await fetch('/api/categories', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name })
                });
                const data = await res.json();
                if (res.ok) {
                    showToast(data.message || "Category created.", "success");
                    document.getElementById('newCategoryName').value = '';
                    await loadCategoriesSection();
                } else {
                    showToast(data.message || "Failed.", "error");
                }
            } catch (err) {
                showToast("Connection error.", "error");
            }
        });
    }
}
