/**
 * Real-time Activity Tracking System
 * Tracks user login activity across all pages
 * Usage: Include this script in all pages and call initializeActivityTracking()
 */

// Track user login/visit for "Hari Aktif"
function trackUserLogin() {
    try {
        const today = new Date().toDateString();
        let loginDates = JSON.parse(localStorage.getItem('userLoginDates') || '[]');
        
        // Add today's date if not already present
        if (!loginDates.includes(today)) {
            loginDates.push(today);
            localStorage.setItem('userLoginDates', JSON.stringify(loginDates));
            console.log('✅ Login tracked:', today);
            console.log('📊 Total active days:', loginDates.length);
        }
        
        // Update display immediately
        updateAllStats();
    } catch (error) {
        console.error('❌ Error tracking login:', error);
    }
}

// Update quiz completed count
function updateQuizCompletedDisplay() {
    try {
        const quizHistory = JSON.parse(localStorage.getItem('quizHistory') || '[]');
        const elements = document.querySelectorAll('[data-stat="quiz-completed"]');
        
        elements.forEach(el => {
            if (el) {
                el.textContent = quizHistory.length;
                el.classList.add('stat-pulse');
            }
        });
        
        console.log('🧠 Quiz completed: ' + quizHistory.length);
    } catch (error) {
        console.error('❌ Error updating quiz count:', error);
    }
}

// Update forum posts count
function updateForumPostsDisplay() {
    try {
        const forumPosts = localStorage.getItem('userForumPosts') || '0';
        const elements = document.querySelectorAll('[data-stat="post-forum"]');
        
        elements.forEach(el => {
            if (el) {
                el.textContent = forumPosts;
                el.classList.add('stat-pulse');
            }
        });
        
        console.log('💬 Forum posts: ' + forumPosts);
    } catch (error) {
        console.error('❌ Error updating forum posts:', error);
    }
}

// Update all statistics
function updateAllStats() {
    updateQuizCompletedDisplay();
    updateForumPostsDisplay();
}

// Initialize activity tracking when page loads
function initializeActivityTracking() {
    console.log('🚀 Initializing activity tracking...');
    
    // Track this login/visit
    trackUserLogin();
    
    // Set up periodic updates (every 30 seconds)
    setInterval(() => {
        updateAllStats();
    }, 30000);
    
    // Listen for storage changes (sync across tabs)
    window.addEventListener('storage', (e) => {
        if (e.key === 'userLoginDates' || 
            e.key === 'quizHistory' || 
            e.key === 'userForumPosts') {
            console.log('📡 Storage changed, updating stats...');
            updateAllStats();
        }
    });
    
    console.log('✅ Activity tracking initialized');
}

// Export functions for global use
window.trackUserLogin = trackUserLogin;
window.updateAllStats = updateAllStats;
window.initializeActivityTracking = initializeActivityTracking;

// Auto-initialize on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeActivityTracking);
} else {
    initializeActivityTracking();
}