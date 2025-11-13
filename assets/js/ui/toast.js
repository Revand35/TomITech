// toast.js - Toast Notification Component
// ============================================================

let toastContainer = null;

/**
 * Initialize toast container
 */
function initToastContainer() {
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.className = 'toast-container';
        document.body.appendChild(toastContainer);
    }
    return toastContainer;
}

/**
 * Show toast notification
 * @param {Object} options - Toast options
 * @param {string} options.type - Toast type: 'success', 'error', 'warning', 'info'
 * @param {string} options.title - Toast title
 * @param {string} options.message - Toast message
 * @param {number} options.duration - Duration in ms (default: 3000)
 * @returns {HTMLElement} Toast element
 */
export function showToast({ type = 'info', title, message, duration = 3000 }) {
    const container = initToastContainer();
    
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    // Icons for each type
    const icons = {
        success: '<i class="fas fa-check-circle"></i>',
        error: '<i class="fas fa-exclamation-circle"></i>',
        warning: '<i class="fas fa-exclamation-triangle"></i>',
        info: '<i class="fas fa-info-circle"></i>'
    };
    
    // Create toast icon
    const icon = document.createElement('div');
    icon.className = 'toast-icon';
    icon.innerHTML = icons[type] || icons.info;
    
    // Create toast content
    const content = document.createElement('div');
    content.className = 'toast-content';
    
    if (title) {
        const titleEl = document.createElement('div');
        titleEl.className = 'toast-title';
        titleEl.textContent = title;
        content.appendChild(titleEl);
    }
    
    if (message) {
        const messageEl = document.createElement('div');
        messageEl.className = 'toast-message';
        messageEl.textContent = message;
        content.appendChild(messageEl);
    }
    
    // Assemble toast
    toast.appendChild(icon);
    toast.appendChild(content);
    
    // Add to container
    container.appendChild(toast);
    
    // Auto remove after duration
    if (duration > 0) {
        setTimeout(() => {
            removeToast(toast);
        }, duration);
    }
    
    // Click to dismiss
    toast.addEventListener('click', () => {
        removeToast(toast);
    });
    
    return toast;
}

/**
 * Remove toast
 * @param {HTMLElement} toast - Toast element to remove
 */
function removeToast(toast) {
    toast.style.animation = 'slideInRight 0.3s ease reverse';
    setTimeout(() => {
        if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
        }
    }, 300);
}

/**
 * Helper functions for different toast types
 */
export const toast = {
    success: (title, message, duration) => showToast({ type: 'success', title, message, duration }),
    error: (title, message, duration) => showToast({ type: 'error', title, message, duration }),
    warning: (title, message, duration) => showToast({ type: 'warning', title, message, duration }),
    info: (title, message, duration) => showToast({ type: 'info', title, message, duration })
};

console.log('✅ Toast component loaded');

