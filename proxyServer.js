// Cyberpunk browsing controller with local-only auth
const urlInput = () => document.getElementById('urlInput');
const frame = () => document.getElementById('proxyFrame');
const currentUrlLabel = () => document.getElementById('currentUrl');
const authLayer = () => document.getElementById('authLayer');
const setPasswordSection = () => document.getElementById('setPasswordSection');
const loginSection = () => document.getElementById('loginSection');
const feedback = () => document.getElementById('authFeedback');

let fullscreen = false;
let currentTarget = '';

// Utility to hash password locally
async function sha256(text) {
    const data = new TextEncoder().encode(text);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function setAuthView(isNew) {
    if (isNew) {
        setPasswordSection().classList.remove('hidden');
        loginSection().classList.add('hidden');
    } else {
        setPasswordSection().classList.add('hidden');
        loginSection().classList.remove('hidden');
    }
}

async function handleSetPassword() {
    const value = document.getElementById('newPassword').value.trim();
    if (value.length < 20) {
        feedback().textContent = 'Passphrase must be at least 20 characters.';
        return;
    }
    const digest = await sha256(value);
    localStorage.setItem('ic_password_hash', digest);
    feedback().textContent = 'Password stored locally. Use it to unlock.';
    setAuthView(false);
}

async function handleLogin() {
    const stored = localStorage.getItem('ic_password_hash');
    const value = document.getElementById('passwordInput').value;
    if (!stored) {
        feedback().textContent = 'No password stored. Create one first.';
        return;
    }
    if (value.length < 20) {
        feedback().textContent = 'Passphrase must be at least 20 characters.';
        return;
    }
    const digest = await sha256(value);
    if (digest === stored) {
        sessionStorage.setItem('ic_authenticated', '1');
        authLayer().classList.add('hidden');
        feedback().textContent = '';
    } else {
        feedback().textContent = 'Incorrect passphrase.';
    }
}

function initAuth() {
    const stored = localStorage.getItem('ic_password_hash');
    const authed = sessionStorage.getItem('ic_authenticated') === '1';
    if (authed) {
        authLayer().classList.add('hidden');
        return;
    }
    authLayer().classList.remove('hidden');
    setAuthView(!stored);
}

function normalizeUrl(raw) {
    if (!raw) return '';
    const trimmed = raw.trim();
    const hasProtocol = /^https?:\/\//i.test(trimmed);
    if (!hasProtocol) {
        return `https://${trimmed}`;
    }
    return trimmed;
}

function displayUrl(url) {
    if (!url) return '—';
    const max = 56;
    return url.length > max ? `${url.slice(0, max)}…` : url;
}

function cloakHistory() {
    const base = window.location.pathname || '/';
    const phantom = `${base}?cloak=${Math.random().toString(36).slice(2, 10)}`;
    history.replaceState({ cloaked: true }, '', phantom);
}

function browse(url) {
    const normalized = normalizeUrl(url);
    if (!normalized || !/^https?:\/\//i.test(normalized)) {
        alert('Use a valid http(s) URL.');
        return;
    }
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(normalized)}`;
    currentTarget = normalized;
    frame().src = proxyUrl;
    currentUrlLabel().textContent = displayUrl(normalized);
    cloakHistory();
}

function toggleFullscreen() {
    fullscreen = !fullscreen;
    document.body.classList.toggle('fullscreen', fullscreen);
    const btn = document.getElementById('fullscreenToggle');
    btn.textContent = fullscreen ? 'Exit Full Screen' : 'Full Screen';
}

function refreshFrame() {
    if (!currentTarget) return;
    browse(currentTarget);
}

function collapseViewport() {
    const panel = document.getElementById('viewportPanel');
    const iframe = frame();
    const collapsed = panel.classList.toggle('collapsed');
    iframe.style.display = collapsed ? 'none' : 'block';
    const btn = document.getElementById('collapseBtn');
    btn.textContent = collapsed ? 'Expand' : 'Collapse';
}

function attachEvents() {
    document.getElementById('browseBtn').addEventListener('click', () => browse(urlInput().value));
    document.getElementById('urlInput').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') browse(urlInput().value);
    });
    document.getElementById('fullscreenToggle').addEventListener('click', toggleFullscreen);
    document.getElementById('refreshBtn').addEventListener('click', refreshFrame);
    document.getElementById('collapseBtn').addEventListener('click', collapseViewport);
    document.querySelectorAll('.chip').forEach(chip => {
        chip.addEventListener('click', () => {
            const url = chip.getAttribute('data-url');
            urlInput().value = url;
            browse(url);
        });
    });
    document.getElementById('setPasswordBtn').addEventListener('click', handleSetPassword);
    document.getElementById('loginBtn').addEventListener('click', handleLogin);
}

window.addEventListener('DOMContentLoaded', () => {
    initAuth();
    attachEvents();
});
