// auth.js - Shared Authentication & Toast System
const GOOGLE_CLIENT_ID = "654666286126-0p3r9scc72pg4hefme5hafg0haoth1ni.apps.googleusercontent.com";

// ─── Toast Notification Helper ────────────────────────────────────
function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icons = { success: 'fa-check-circle', error: 'fa-exclamation-circle', warning: 'fa-exclamation-triangle', info: 'fa-info-circle' };
    toast.innerHTML = `<i class="fas ${icons[type] || icons.info}"></i><div class="toast-message">${message}</div>`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.animation = 'fadeIn 0.3s ease reverse';
        setTimeout(() => toast.remove(), 300);
    }, 4500);
}

// ─── Authentication State ─────────────────────────────────────────
async function checkAuthState() {
    try {
        const res = await fetch('/api/auth/me');
        if (!res.ok) return { authenticated: false };
        return await res.json();
    } catch (e) {
        return { authenticated: false };
    }
}

// ─── Navbar Injection ─────────────────────────────────────────────
async function updateNavbar() {
    const navLinks = document.getElementById('navLinks');
    if (!navLinks) return;
    const auth = await checkAuthState();
    navLinks.innerHTML = '<a href="index.html">Home</a>';
    if (auth.authenticated) {
        if (auth.role === 'admin') {
            navLinks.innerHTML += `
                <a href="admin.html">Admin Panel</a>
                <button class="btn-secondary" onclick="triggerLogout()" style="padding:0.4rem 1.2rem; font-size:0.9rem;">
                    <i class="fas fa-sign-out-alt"></i> Logout
                </button>`;
        } else {
            navLinks.innerHTML += `
                <a href="dashboard.html">My Library</a>
                <span style="color:var(--primary-light); font-weight:600; font-size:0.95rem;">
                    Hi, ${auth.user.name ? auth.user.name.split(' ')[0] : 'User'}
                </span>
                <button class="btn-secondary" onclick="triggerLogout()" style="padding:0.4rem 1.2rem; font-size:0.9rem;">
                    <i class="fas fa-sign-out-alt"></i> Logout
                </button>`;
        }
    } else {
        navLinks.innerHTML += `
            <a href="register.html">Sign Up</a>
            <a href="login.html" class="btn-primary" style="color:white; padding:0.4rem 1.2rem; font-size:0.9rem; border-radius:20px;">
                Sign In
            </a>`;
    }
}

// ─── Logout ───────────────────────────────────────────────────────
async function triggerLogout() {
    try {
        await fetch('/api/auth/logout', { method: 'POST' });
        showToast("Logged out successfully.", "success");
        setTimeout(() => { window.location.href = 'index.html'; }, 900);
    } catch (e) {
        showToast("Logout failed.", "error");
    }
}

// ─── Email Login ──────────────────────────────────────────────────
async function handleEmailLogin(email, password) {
    try {
        const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        return res.ok ? { success: true, user: data.user } : { success: false, message: data.message };
    } catch (e) {
        return { success: false, message: "Server connection failed." };
    }
}

// ─── Email Registration ───────────────────────────────────────────
async function handleEmailRegister(name, email, password) {
    try {
        const res = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password })
        });
        const data = await res.json();
        return res.ok ? { success: true, user: data.user } : { success: false, message: data.message };
    } catch (e) {
        return { success: false, message: "Server connection failed." };
    }
}

// ─── Admin Login ──────────────────────────────────────────────────
async function handleAdminLogin(email, password) {
    try {
        const res = await fetch('/api/auth/admin-login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        return res.ok ? { success: true, admin: data.admin } : { success: false, message: data.message };
    } catch (e) {
        return { success: false, message: "Server connection failed." };
    }
}

// ─── Google OAuth Callback ────────────────────────────────────────
async function handleGoogleCredentialResponse(response) {
    const idToken = response.credential;
    try {
        const res = await fetch('/api/auth/google', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idToken })
        });
        const data = await res.json();
        if (res.ok) {
            showToast("Logged in with Google!", "success");
            setTimeout(() => { window.location.href = 'dashboard.html'; }, 1200);
        } else {
            showToast(data.message || "Google auth failed.", "error");
        }
    } catch (e) {
        showToast("Could not authenticate with Google.", "error");
    }
}

// ─── Initialization ───────────────────────────────────────────────
window.addEventListener('load', () => {
    updateNavbar();

    // Initialize Google Sign-In if googleBtn element exists on page
    const googleBtnEl = document.getElementById('googleBtn');
    if (googleBtnEl && typeof google !== 'undefined') {
        google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: handleGoogleCredentialResponse
        });
        google.accounts.id.renderButton(googleBtnEl, {
            theme: "outline",
            size: "large",
            width: "380"
        });
    } else if (googleBtnEl) {
        // Google SDK not yet loaded, wait for it
        const interval = setInterval(() => {
            if (typeof google !== 'undefined') {
                clearInterval(interval);
                google.accounts.id.initialize({
                    client_id: GOOGLE_CLIENT_ID,
                    callback: handleGoogleCredentialResponse
                });
                google.accounts.id.renderButton(googleBtnEl, {
                    theme: "outline",
                    size: "large",
                    width: "380"
                });
            }
        }, 300);
    }
});
