// modal.js - Reusable Modal Component
// ============================================================

/**
 * Create and show modal
 * @param {Object} options - Modal options
 * @param {string} options.title - Modal title
 * @param {string} options.content - Modal content (HTML string)
 * @param {Function} options.onClose - Callback when modal closes
 * @param {boolean} options.closable - Whether modal can be closed (default: true)
 * @returns {HTMLElement} Modal element
 */
export function showModal({ title, content, onClose, closable = true }) {
    // Remove existing modal if any
    const existingModal = document.querySelector('.modal-overlay');
    if (existingModal) {
        existingModal.remove();
    }
    
    // Create modal overlay
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    
    // Create modal content
    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content';
    
    // Create modal header
    const header = document.createElement('div');
    header.className = 'modal-header';
    
    const titleEl = document.createElement('h2');
    titleEl.className = 'modal-title';
    titleEl.textContent = title;
    
    const closeBtn = document.createElement('button');
    closeBtn.className = 'modal-close';
    closeBtn.innerHTML = '<i class="fas fa-times"></i>';
    closeBtn.setAttribute('aria-label', 'Close modal');
    
    header.appendChild(titleEl);
    if (closable) {
        header.appendChild(closeBtn);
    }
    
    // Create modal body
    const body = document.createElement('div');
    body.className = 'modal-body';
    body.innerHTML = content;
    
    // Assemble modal
    modalContent.appendChild(header);
    modalContent.appendChild(body);
    overlay.appendChild(modalContent);
    
    // Add to DOM
    document.body.appendChild(overlay);
    
    // Show modal with animation
    setTimeout(() => {
        overlay.classList.add('active');
    }, 10);
    
    // Close handlers
    const closeModal = () => {
        overlay.classList.remove('active');
        setTimeout(() => {
            overlay.remove();
            if (onClose) onClose();
        }, 300);
    };
    
    if (closable) {
        closeBtn.addEventListener('click', closeModal);
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                closeModal();
            }
        });
    }
    
    // ESC key to close
    const escHandler = (e) => {
        if (e.key === 'Escape' && closable) {
            closeModal();
            document.removeEventListener('keydown', escHandler);
        }
    };
    document.addEventListener('keydown', escHandler);
    
    return overlay;
}

/**
 * Close modal
 */
export function closeModal() {
    const modal = document.querySelector('.modal-overlay.active');
    if (modal) {
        modal.classList.remove('active');
        setTimeout(() => {
            modal.remove();
        }, 300);
    }
}

console.log('✅ Modal component loaded');

