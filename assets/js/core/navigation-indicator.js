// navigation-indicator.js
// Script untuk mengatur animasi background indicator pada bottom navigation
// ===========================================================

/**
 * Get previous navigation position from localStorage
 * Mengambil posisi menu sebelumnya untuk animasi
 */
function getPreviousNavPosition() {
    const previousPosition = localStorage.getItem('previousNavPosition');
    return previousPosition ? parseFloat(previousPosition) : null;
}

/**
 * Save current navigation position to localStorage
 * Menyimpan posisi menu saat ini untuk animasi halaman berikutnya
 */
function saveCurrentNavPosition(position) {
    localStorage.setItem('previousNavPosition', position.toString());
}

/**
 * Calculate position for navigation indicator
 * Menghitung posisi indicator berdasarkan nav item yang aktif
 */
function calculateIndicatorPosition(activeItem, nav, navItems) {
    if (!activeItem || !nav) return 0;
    
    const navWidth = nav.offsetWidth;
    const itemLeft = activeItem.offsetLeft;
    const itemWidth = activeItem.offsetWidth;
    const indicatorWidth = navWidth / navItems.length;
    
    // Center the indicator on the active item
    return itemLeft + (itemWidth - indicatorWidth) / 2;
}

/**
 * Initialize navigation indicator animation
 * Menghitung posisi menu aktif dan menggerakkan background indicator
 * Animasi dimulai dari posisi menu sebelumnya (jika ada)
 */
export function initNavigationIndicator() {
    const nav = document.querySelector('.tomitech-bottom-nav');
    if (!nav) {
        console.warn('⚠️ Bottom navigation not found');
        return;
    }

    // Find active nav item
    const activeItem = nav.querySelector('.tomitech-nav-item.active');
    if (!activeItem) {
        console.warn('⚠️ No active nav item found');
        return;
    }

    // Get all nav items
    const navItems = nav.querySelectorAll('.tomitech-nav-item');
    
    // Calculate current position (posisi halaman saat ini yang sedang dibuka)
    const currentPosition = calculateIndicatorPosition(activeItem, nav, navItems);
    
    // Get previous position from localStorage (posisi halaman sebelumnya)
    const previousPosition = getPreviousNavPosition();
    
    // Check if previous position is valid and different from current
    // Validasi: posisi harus berbeda minimal 10px dan tidak null
    const positionDiff = previousPosition !== null ? Math.abs(previousPosition - currentPosition) : 0;
    const isValidPrevious = previousPosition !== null && positionDiff > 10; // Minimum 10px difference
    
    if (isValidPrevious) {
        // Animate from previous position (halaman sebelumnya) to current position (halaman saat ini)
        // Force GPU acceleration
        nav.style.willChange = 'transform';
        
        // Set initial position to previous (no transition) - mulai dari posisi halaman sebelumnya
        nav.style.setProperty('--nav-indicator-position', `${previousPosition}px`);
        nav.classList.add('no-transition');
        
        // Use requestAnimationFrame for smooth animation
        requestAnimationFrame(() => {
            // Force reflow to ensure initial position is applied
            void nav.offsetWidth;
            
            // Enable transition and animate to current position in next frame
            requestAnimationFrame(() => {
                nav.classList.remove('no-transition');
                nav.style.setProperty('--nav-indicator-position', `${currentPosition}px`);
                
                // Remove will-change after animation completes
                setTimeout(() => {
                    nav.style.willChange = 'auto';
                }, 500);
                
                console.log('✅ Navigation indicator animating from previous page', previousPosition + 'px to current page', currentPosition + 'px');
            });
        });
    } else {
        // No valid previous position or same page, set directly to current position
        nav.style.setProperty('--nav-indicator-position', `${currentPosition}px`);
        console.log('✅ Navigation indicator initialized at current page position:', currentPosition + 'px');
    }
    
    // Save current position for next page (untuk animasi saat pindah ke halaman berikutnya)
    saveCurrentNavPosition(currentPosition);
}

/**
 * Update navigation indicator when clicking on nav items
 * Menambahkan event listener untuk animasi saat klik
 */
export function setupNavigationClickHandlers() {
    const nav = document.querySelector('.tomitech-bottom-nav');
    if (!nav) return;

    const navItems = nav.querySelectorAll('.tomitech-nav-item');
    
    navItems.forEach((item) => {
        item.addEventListener('click', (e) => {
            // Get current active item position (starting point)
            const currentActiveItem = nav.querySelector('.tomitech-nav-item.active');
            const startPosition = currentActiveItem ? 
                calculateIndicatorPosition(currentActiveItem, nav, navItems) : 
                parseFloat(nav.style.getPropertyValue('--nav-indicator-position') || '0');
            
            // Calculate target position based on clicked item
            const targetPosition = calculateIndicatorPosition(item, nav, navItems);
            
            // Save current position BEFORE navigation (untuk halaman berikutnya)
            saveCurrentNavPosition(startPosition);
            
            // Force GPU acceleration
            nav.style.willChange = 'transform';
            
            // Remove active class from all items first
            navItems.forEach(navItem => navItem.classList.remove('active'));
            
            // Add active class to clicked item
            item.classList.add('active');
            
            // Use requestAnimationFrame for smooth animation
            requestAnimationFrame(() => {
                // Update CSS variable with animation (from current to target)
                nav.style.setProperty('--nav-indicator-position', `${targetPosition}px`);
                
                // Remove will-change after animation completes
                setTimeout(() => {
                    nav.style.willChange = 'auto';
                }, 500);
                
                console.log('📍 Navigation indicator moving from', startPosition + 'px to', targetPosition + 'px');
            });
        });
    });
}

/**
 * Save position before page unload
 * Menyimpan posisi saat ini sebelum halaman di-unload
 */
function setupBeforeUnloadHandler() {
    window.addEventListener('beforeunload', () => {
        const nav = document.querySelector('.tomitech-bottom-nav');
        if (!nav) return;
        
        const activeItem = nav.querySelector('.tomitech-nav-item.active');
        if (!activeItem) return;
        
        const navItems = nav.querySelectorAll('.tomitech-nav-item');
        const currentPosition = calculateIndicatorPosition(activeItem, nav, navItems);
        
        // Save position before navigation
        saveCurrentNavPosition(currentPosition);
        console.log('💾 Saved position before unload:', currentPosition + 'px');
    });
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        // Setup before unload handler first
        setupBeforeUnloadHandler();
        
        // Small delay to ensure layout is complete
        setTimeout(() => {
            initNavigationIndicator();
            setupNavigationClickHandlers();
        }, 50);
    });
} else {
    // DOM already loaded
    setupBeforeUnloadHandler();
    setTimeout(() => {
        initNavigationIndicator();
        setupNavigationClickHandlers();
    }, 50);
}
