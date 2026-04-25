(function () {
    const btn = document.getElementById('dark-mode-toggle');
    const stored = localStorage.getItem('craiglist-theme');

    if (stored === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
        if (btn) btn.textContent = '☀ light mode';
    }

    if (btn) {
        btn.addEventListener('click', function () {
            const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
            if (isDark) {
                document.documentElement.removeAttribute('data-theme');
                localStorage.setItem('craiglist-theme', 'light');
                btn.textContent = '☾ dark mode';
            } else {
                document.documentElement.setAttribute('data-theme', 'dark');
                localStorage.setItem('craiglist-theme', 'dark');
                btn.textContent = '☀ light mode';
            }
        });
    }
})();

function showToast(message, type = 'info', duration = 3500) {
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        container.setAttribute('role', 'status');
        container.setAttribute('aria-live', 'polite');
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'toastOut 0.3s ease forwards';
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

function openModal(modalId) {
    const overlay = document.getElementById(modalId);
    if (!overlay) return;
    overlay.classList.add('is-open');
    overlay.setAttribute('aria-hidden', 'false');
    const focusable = overlay.querySelector('button, input, textarea, select, a[href]');
    if (focusable) focusable.focus();
    overlay.addEventListener('keydown', trapFocus);
}

function closeModal(modalId) {
    const overlay = document.getElementById(modalId);
    if (!overlay) return;
    overlay.classList.remove('is-open');
    overlay.setAttribute('aria-hidden', 'true');
    overlay.removeEventListener('keydown', trapFocus);
}

function trapFocus(e) {
    if (e.key !== 'Tab') return;
    const modal = e.currentTarget.querySelector('.modal');
    const focusables = modal.querySelectorAll('button, input, textarea, select, a[href], [tabindex]:not([tabindex="-1"])');
    const first = focusables[0];
    const last = focusables[focusables.length - 1];

    if (e.shiftKey) {
        if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
        }
    } else {
        if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
        }
    }
}


document.addEventListener('click', function (e) {
    if (e.target.classList.contains('modal-overlay')) {
        closeModal(e.target.id);
    }
});

document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
        const open = document.querySelector('.modal-overlay.is-open');
        if (open) closeModal(open.id);
    }
});

document.addEventListener('click', function (e) {
    const opener = e.target.closest('[data-open-modal]');
    if (opener) openModal(opener.dataset.openModal);
    const closer = e.target.closest('[data-close-modal]');
    if (closer) closeModal(closer.dataset.closeModal);
});