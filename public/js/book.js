// book.js - Book Details & PayPal Checkout Integration
let currentBook = null;
let userAuth = null;
let hasPurchased = false;

document.addEventListener('DOMContentLoaded', initBookPage);

async function initBookPage() {
    const bookId = new URLSearchParams(window.location.search).get('id');
    if (!bookId) { window.location.href = 'index.html'; return; }

    try {
        userAuth = await checkAuthState();

        const bookRes = await fetch(`/api/books/${bookId}`);
        if (!bookRes.ok) throw new Error("Book not found.");
        currentBook = await bookRes.json();

        document.title = `${currentBook.title} | RPS E-Bookstore`;

        // Check ownership
        if (userAuth.authenticated) {
            if (userAuth.role === 'admin') {
                hasPurchased = true;
            } else {
                const purRes = await fetch('/api/users/me/purchases');
                if (purRes.ok) {
                    const ownedBooks = await purRes.json();
                    hasPurchased = ownedBooks.some(b => b.bookId === bookId);
                }
            }
        }

        // Free book is always "owned"
        if (parseFloat(currentBook.price) === 0) hasPurchased = true;

        renderBookDetails();
    } catch (err) {
        const container = document.getElementById('bookDetailsContainer');
        if (container) container.innerHTML = `
            <div style="grid-column:1/-1; text-align:center; color:var(--danger); padding:3rem 0;">
                <i class="fas fa-exclamation-triangle" style="font-size:2.5rem; margin-bottom:1rem; display:block;"></i>
                <h3>${err.message}</h3>
            </div>`;
    }
}

function renderBookDetails() {
    const container = document.getElementById('bookDetailsContainer');
    if (!container) return;

    const price = parseFloat(currentBook.price);
    const isFree = price === 0;
    const priceDisplay = isFree ? 'Free' : `$${price.toFixed(2)}`;

    let actionHtml = '';

    if (!userAuth.authenticated) {
        actionHtml = `
            <div class="book-details-action">
                <span class="price-tag">${priceDisplay}</span>
                <a href="login.html" class="btn-primary" style="text-decoration:none;">
                    <i class="fas fa-sign-in-alt"></i> Sign In to ${isFree ? 'Download' : 'Purchase'}
                </a>
            </div>`;
    } else if (hasPurchased) {
        actionHtml = `
            <div class="book-details-action">
                <div>
                    <span style="color:var(--success); font-weight:700; font-size:1rem; display:block;">
                        <i class="fas fa-check-circle"></i> You own this book
                    </span>
                    <span class="price-tag" style="color:var(--success);">${priceDisplay}</span>
                </div>
                <button class="btn-primary" onclick="downloadBook('${currentBook.bookId}')"
                    style="background:linear-gradient(135deg,var(--success),#55efc4); box-shadow:0 4px 15px rgba(0,184,148,0.4);">
                    <i class="fas fa-download"></i> Download PDF
                </button>
            </div>`;
    } else {
        actionHtml = `
            <div class="book-details-action" style="flex-direction:column; align-items:stretch; gap:1rem;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <span style="color:#aaa; font-weight:600;">Purchase Price:</span>
                    <span class="price-tag">${priceDisplay}</span>
                </div>
                <div id="paypal-button-container"></div>
                <p style="text-align:center; color:#666; font-size:0.8rem; margin-top:0.5rem;">
                    <i class="fas fa-lock"></i> Secure checkout powered by PayPal
                </p>
            </div>`;
    }

    container.innerHTML = `
        <div class="book-details-left">
            <div class="book-details-cover">
                <img src="${currentBook.coverUrl}" alt="${currentBook.title}"
                     onerror="this.src='https://images.unsplash.com/photo-1543002588-bfa74002ed7e?q=80&w=600&auto=format&fit=crop'">
            </div>
        </div>
        <div class="book-details-right">
            <span class="book-details-category">${currentBook.category}</span>
            <h1 class="book-details-title">${currentBook.title}</h1>
            <div class="book-details-meta">
                <span><i class="fas fa-calendar-alt"></i> ${new Date(currentBook.uploadDate).toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' })}</span>
                <span><i class="fas fa-file-pdf"></i> PDF Format</span>
            </div>
            <div class="book-details-description">${currentBook.description}</div>
            ${actionHtml}
        </div>`;

    // Load PayPal buttons if needed
    if (userAuth.authenticated && !hasPurchased && !isFree) {
        loadPayPal();
    }
}

async function downloadBook(bookId) {
    showToast("Preparing your download...", "info");
    window.location.href = `/api/books/${bookId}/download`;
}

async function loadPayPal() {
    try {
        const configRes = await fetch('/api/payments/config');
        const { clientId } = await configRes.json();

        // Remove any existing PayPal script to avoid duplicates
        const existing = document.getElementById('paypal-sdk');
        if (existing) existing.remove();

        const script = document.createElement('script');
        script.id = 'paypal-sdk';
        script.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&currency=USD&disable-funding=card,credit`;
        script.async = true;
        script.onload = renderPayPalButtons;
        script.onerror = () => showToast("PayPal failed to load. Check your internet connection.", "error");
        document.body.appendChild(script);
    } catch (e) {
        showToast("Could not initialize PayPal.", "error");
    }
}

function renderPayPalButtons() {
    if (typeof paypal === 'undefined') {
        showToast("PayPal SDK unavailable.", "warning");
        return;
    }

    paypal.Buttons({
        style: { layout: 'vertical', color: 'gold', shape: 'rect', label: 'paypal' },

        createOrder: async () => {
            try {
                const res = await fetch('/api/payments/create-order', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ bookId: currentBook.bookId })
                });
                if (!res.ok) {
                    const err = await res.json();
                    throw new Error(err.message || "Could not create order.");
                }
                const { orderID } = await res.json();
                return orderID;
            } catch (err) {
                showToast(err.message, "error");
                throw err;
            }
        },

        onApprove: async (data) => {
            showToast("Verifying payment...", "info");
            try {
                const res = await fetch('/api/payments/capture-order', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ orderID: data.orderID, bookId: currentBook.bookId })
                });
                if (!res.ok) {
                    const err = await res.json();
                    throw new Error(err.message);
                }
                showToast("Payment successful! E-book unlocked.", "success");
                hasPurchased = true;
                setTimeout(renderBookDetails, 1500);
            } catch (err) {
                showToast(err.message || "Payment capture failed.", "error");
            }
        },

        onCancel: () => showToast("Payment cancelled.", "warning"),
        onError: (err) => {
            console.error("PayPal error:", err);
            showToast("A PayPal error occurred. Please try again.", "error");
        }
    }).render('#paypal-button-container');
}
