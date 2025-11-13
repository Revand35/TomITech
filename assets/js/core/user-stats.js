// user-stats.js - Enhanced version with realtime tracking and material progress
import { auth, db } from '../../../config/firebase-init.js';
import { doc, getDoc, setDoc, updateDoc, increment, serverTimestamp, onSnapshot, collection, query, where } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';

class UserStatsManager {
    static instance = null;

    static getInstance() {
        if (!UserStatsManager.instance) {
            UserStatsManager.instance = new UserStatsManager();
        }
        return UserStatsManager.instance;
    }

    constructor() {
        // Prevent multiple initialization
        if (UserStatsManager.instance) {
            return UserStatsManager.instance;
        }
        
        this.currentUser = null;
        this.unsubscribeListeners = [];
        this.lastLogTime = 0; // For debouncing logs
        this.statsCache = {
            activeDays: 0,
            forumPosts: 0,
            materialsRead: 0,
            materialsCompleted: 0
        };
        
        // Material tracking properties
        this.currentMaterial = null;
        this.progressInterval = null;
        this.readingStartTime = null;
        this.lastScrollPosition = 0;
        this.isTracking = false;
        this.progressThreshold = 0.8;
        this.maxScrollReached = 0;
        this.totalScrollHeight = 0;

        console.log('Firebase db instance:', db);
        if (!db) {
            console.error('Firestore db is not initialized!');
            return;
        }
        
        UserStatsManager.instance = this;
        this.initializeAuth();
        this.initializeMaterialTracking();
    }

    initializeAuth() {
        onAuthStateChanged(auth, (user) => {
            if (user) {
                this.currentUser = user;
                this.initializeUserStats();
                this.updateLastActiveDate();
                this.startRealtimeListeners();
                // calculateAndDisplayActiveDays will be called from startRealtimeListeners
            } else {
                this.currentUser = null;
                this.cleanup();
                document.querySelectorAll('[data-stat="active-days"]').forEach(el => {
                    el.textContent = 0;
                });
            }
        });
    }

    async calculateAndDisplayActiveDays(user) {
        try {
            // ALWAYS use Firebase Auth metadata.creationTime as source of truth
            const authCreationTime = new Date(user.metadata.creationTime);

            console.log('[UserStats] Firebase Auth creationTime:', user.metadata.creationTime);

            // Check if firstLoginDate needs update (only update if different or missing)
            const userDocRef = doc(db, 'users', user.uid);
            const userDoc = await getDoc(userDocRef);

            let needsUpdate = false;
            if (!userDoc.exists()) {
                needsUpdate = true;
            } else {
                const userData = userDoc.data();
                const storedDate = userData.firstLoginDate;

                // Only update if missing or significantly different (>1 day)
                if (!storedDate) {
                    needsUpdate = true;
                } else {
                    const storedTime = new Date(storedDate).getTime();
                    const authTime = authCreationTime.getTime();
                    const diffDays = Math.abs(storedTime - authTime) / (1000 * 60 * 60 * 24);

                    if (diffDays > 1) {
                        needsUpdate = true;
                        console.log('[UserStats] Stored date differs by', diffDays, 'days, updating...');
                    }
                }
            }

            // Only write to Firestore if needed
            if (needsUpdate) {
                if (!userDoc.exists()) {
                    await setDoc(userDocRef, {
                        uid: user.uid,
                        email: user.email,
                        firstLoginDate: authCreationTime.toISOString(),
                        createdAt: new Date().toISOString()
                    });
                    console.log('[UserStats] Created user document with firstLoginDate');
                } else {
                    await updateDoc(userDocRef, {
                        firstLoginDate: authCreationTime.toISOString()
                    });
                    console.log('[UserStats] Updated firstLoginDate');
                }
            }

            const firstLoginDate = authCreationTime;

            // Calculate active days
            const todayMidnight = new Date();
            todayMidnight.setHours(0, 0, 0, 0);

            const loginDate = new Date(firstLoginDate);
            loginDate.setHours(0, 0, 0, 0);

            const diffTime = todayMidnight - loginDate;
            const activeDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;

            console.log('[UserStats] First login:', loginDate.toLocaleDateString('id-ID'));
            console.log('[UserStats] Today:', todayMidnight.toLocaleDateString('id-ID'));
            console.log('[UserStats] Active days:', activeDays);

            // Update all displays
            this.updateStatsElementsWithNoCache('[data-stat="active-days"]', activeDays);

            // Store in cache
            this.statsCache.activeDays = activeDays;

            // Dispatch event for pages to sync
            window.dispatchEvent(new CustomEvent('activeDaysCalculated', {
                detail: { activeDays }
            }));

        } catch (error) {
            console.error('Error calculating active days:', error);
            this.updateStatsElementsWithNoCache('[data-stat="active-days"]', 0);
        }
    }

    async initializeUserStats() {
        if (!this.currentUser) return;
        
        try {
            const userStatsRef = doc(db, 'userStats', this.currentUser.uid);
            const statsDoc = await getDoc(userStatsRef);
            
            if (!statsDoc.exists()) {
                const initialStats = {
                    userId: this.currentUser.uid,
                    email: this.currentUser.email,
                    activeDays: 1,
                    forumPosts: 0,
                    materialsRead: 0,
                    materialsCompleted: 0,
                    materialsStarted: [],
                    materialsFinished: [],
                    firstLoginDate: serverTimestamp(),
                    lastActiveDate: serverTimestamp(),
                    activeDatesHistory: [new Date().toDateString()],
                    createdAt: serverTimestamp()
                };
                
                await setDoc(userStatsRef, initialStats);
                this.statsCache = initialStats;
            } else {
                const data = statsDoc.data();
                this.statsCache = {
                    activeDays: data.activeDays || 0,
                    forumPosts: data.forumPosts || 0,
                    materialsRead: data.materialsRead || 0,
                    materialsCompleted: data.materialsCompleted || 0
                };
            }
            
            this.updateStatsDisplay();
        } catch (error) {
            console.error('Error initializing user stats:', error);
        }
    }

    startRealtimeListeners() {
        if (!this.currentUser) return;

        // Calculate active days ONCE when listeners start
        this.calculateAndDisplayActiveDays(this.currentUser);

        // Listen to posts collection for real-time forum post count
        const postsQuery = query(collection(db, 'posts'), where('authorId', '==', this.currentUser.uid));
        const unsubscribePosts = onSnapshot(postsQuery, (snapshot) => {
            const userPostCount = snapshot.size;
            console.log('[UserStats] Real-time forum posts update:', userPostCount);

            this.statsCache.forumPosts = userPostCount;

            // Update display silently without spam
            this.updateStatsElementsWithNoCache('[data-stat="forum-posts"]', userPostCount);
            this.updateStatsElementsWithNoCache('[data-stat="post-forum"]', userPostCount);

            // Dispatch event for pages to sync
            window.dispatchEvent(new CustomEvent('forumPostsUpdated', {
                detail: { count: userPostCount }
            }));
        });

        this.unsubscribeListeners.push(unsubscribePosts);

        // Listen to quizResults collection for real-time quiz completed count
        const quizQuery = query(collection(db, 'quizResults'), where('userId', '==', this.currentUser.uid));
        const unsubscribeQuiz = onSnapshot(quizQuery, (snapshot) => {
            const quizCompletedCount = snapshot.size;
            console.log('[UserStats] Real-time quiz completed update:', quizCompletedCount);

            this.statsCache.quizCompleted = quizCompletedCount;

            // Update display
            this.updateStatsElementsWithNoCache('[data-stat="quiz-completed"]', quizCompletedCount);
            this.updateStatsElementsWithNoCache('[data-stat="quiz-selesai"]', quizCompletedCount);

            // Dispatch event for pages to sync
            window.dispatchEvent(new CustomEvent('quizCompletedUpdated', {
                detail: { count: quizCompletedCount }
            }));
        });

        this.unsubscribeListeners.push(unsubscribeQuiz);
    }

    async updateLastActiveDate() {
        if (!this.currentUser) return;
        
        try {
            const userStatsRef = doc(db, 'userStats', this.currentUser.uid);
            const today = new Date().toDateString();
            
            const statsDoc = await getDoc(userStatsRef);
            if (statsDoc.exists()) {
                const currentStats = statsDoc.data();
                const activeDatesHistory = currentStats.activeDatesHistory || [];
                
                if (!activeDatesHistory.includes(today)) {
                    await updateDoc(userStatsRef, {
                        activeDays: increment(1),
                        lastActiveDate: serverTimestamp(),
                        activeDatesHistory: [...activeDatesHistory, today]
                    });
                    
                    this.statsCache.activeDays += 1;
                    this.updateStatsDisplay();
                } else {
                    await updateDoc(userStatsRef, {
                        lastActiveDate: serverTimestamp()
                    });
                }
            }
        } catch (error) {
            console.error('Error updating last active date:', error);
        }
    }

    // incrementForumPosts removed - real-time updates handled by onSnapshot listener in startRealtimeListeners()

    async startReadingMaterial(materialId, materialName) {
        if (!this.currentUser) return;

        try {
            const userStatsRef = doc(db, 'userStats', this.currentUser.uid);
            const userStatsDoc = await getDoc(userStatsRef);
            
            if (userStatsDoc.exists()) {
                const data = userStatsDoc.data();
                const materialsStarted = data.materialsStarted || [];
                
                const alreadyStarted = materialsStarted.find(m => m.id === materialId);
                
                if (!alreadyStarted) {
                    const now = new Date().toISOString();
                    
                    await updateDoc(userStatsRef, {
                        materialsRead: increment(1),
                        materialsStarted: [...materialsStarted, {
                            id: materialId,
                            name: materialName,
                            startedAt: now,
                            progress: 0
                        }],
                        lastActiveDate: serverTimestamp()
                    });

                    this.statsCache.materialsRead += 1;
                    this.updateStatsDisplay();

                    console.log('Started reading material:', materialName);
                }
            }
        } catch (error) {
            console.error('Error tracking material start:', error);
        }
    }

    async updateMaterialProgress(materialId, progress) {
        if (!this.currentUser) return;

        try {
            const userStatsRef = doc(db, 'userStats', this.currentUser.uid);
            const userStatsDoc = await getDoc(userStatsRef);
            
            if (userStatsDoc.exists()) {
                const data = userStatsDoc.data();
                const materialsStarted = data.materialsStarted || [];
                
                const updatedMaterials = materialsStarted.map(material => {
                    if (material.id === materialId) {
                        return { 
                            ...material, 
                            progress, 
                            lastRead: new Date().toISOString()
                        };
                    }
                    return material;
                });

                await updateDoc(userStatsRef, {
                    materialsStarted: updatedMaterials,
                    lastActiveDate: serverTimestamp()
                });
            }
        } catch (error) {
            console.error('Error updating material progress:', error);
        }
    }

    async completeMaterial(materialId, materialName) {
        if (!this.currentUser) return;

        try {
            const userStatsRef = doc(db, 'userStats', this.currentUser.uid);
            const userStatsDoc = await getDoc(userStatsRef);
            
            if (userStatsDoc.exists()) {
                const data = userStatsDoc.data();
                const materialsFinished = data.materialsFinished || [];
                
                const alreadyCompleted = materialsFinished.find(m => m.id === materialId);
                
                if (!alreadyCompleted) {
                    const now = new Date().toISOString();
                    
                    await updateDoc(userStatsRef, {
                        materialsCompleted: increment(1),
                        materialsFinished: [...materialsFinished, {
                            id: materialId,
                            name: materialName,
                            completedAt: now
                        }],
                        lastActiveDate: serverTimestamp()
                    });

                    this.statsCache.materialsCompleted += 1;
                    this.updateStatsDisplay();

                    this.showCompletionNotification(materialName);
                    console.log('Material completed:', materialName);
                }
            }
        } catch (error) {
            console.error('Error tracking material completion:', error);
        }
    }

    initializeMaterialTracking() {
        window.addEventListener('scroll', this.handleScroll.bind(this));
        window.addEventListener('beforeunload', this.handlePageUnload.bind(this));
        document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
    }

    startMaterialTracking(materialId, materialName, materialType = 'document') {
        if (this.isTracking && this.currentMaterial?.id === materialId) {
            return;
        }

        this.stopMaterialTracking();

        this.currentMaterial = {
            id: materialId,
            name: materialName,
            type: materialType,
            startTime: Date.now()
        };

        this.readingStartTime = Date.now();
        this.lastScrollPosition = window.pageYOffset;
        this.maxScrollReached = 0;
        this.isTracking = true;

        this.updateScrollMetrics();
        this.startReadingMaterial(materialId, materialName);

        this.progressInterval = setInterval(() => {
            this.updateProgress();
        }, 5000);

        console.log(`Started tracking material: ${materialName}`);
        this.showTrackingNotification(`Mulai membaca: ${materialName}`);
    }

    stopMaterialTracking() {
        if (!this.isTracking) return;

        if (this.progressInterval) {
            clearInterval(this.progressInterval);
            this.progressInterval = null;
        }

        this.updateProgress();

        const progress = this.calculateProgress();
        if (progress >= this.progressThreshold) {
            this.markAsCompleted();
        }

        console.log(`Stopped tracking material: ${this.currentMaterial?.name}`);
        
        this.currentMaterial = null;
        this.isTracking = false;
        this.readingStartTime = null;
    }

    handleScroll() {
        if (!this.isTracking) return;

        const currentScroll = window.pageYOffset;
        
        if (currentScroll > this.maxScrollReached) {
            this.maxScrollReached = currentScroll;
            this.updateScrollMetrics();
            this.updateProgress();
        }

        this.lastScrollPosition = currentScroll;
    }

    handlePageUnload() {
        if (this.isTracking) {
            this.stopMaterialTracking();
        }
    }

    handleVisibilityChange() {
        if (!this.isTracking) return;

        if (document.hidden) {
            this.pauseTracking();
        } else {
            this.resumeTracking();
        }
    }

    pauseTracking() {
        if (this.progressInterval) {
            clearInterval(this.progressInterval);
            this.progressInterval = null;
        }
    }

    resumeTracking() {
        if (!this.progressInterval && this.isTracking) {
            this.progressInterval = setInterval(() => {
                this.updateProgress();
            }, 5000);
        }
    }

    updateScrollMetrics() {
        this.totalScrollHeight = Math.max(
            document.body.scrollHeight,
            document.body.offsetHeight,
            document.documentElement.clientHeight,
            document.documentElement.scrollHeight,
            document.documentElement.offsetHeight
        ) - window.innerHeight;
    }

    calculateProgress() {
        if (this.totalScrollHeight <= 0) return 0;
        
        const scrollProgress = Math.min(this.maxScrollReached / this.totalScrollHeight, 1);
        const timeProgress = Math.min((Date.now() - this.readingStartTime) / (2 * 60 * 1000), 1);
        
        return (scrollProgress * 0.7) + (timeProgress * 0.3);
    }

    updateProgress() {
        if (!this.isTracking || !this.currentMaterial) return;

        const progress = this.calculateProgress();

        this.updateMaterialProgress(this.currentMaterial.id, progress);
        this.updateProgressIndicator(progress);

        if (progress >= this.progressThreshold && !this.currentMaterial.completed) {
            this.markAsCompleted();
        }
    }

    markAsCompleted() {
        if (!this.currentMaterial || this.currentMaterial.completed) return;

        this.currentMaterial.completed = true;
        this.currentMaterial.completedAt = Date.now();

        this.completeMaterial(this.currentMaterial.id, this.currentMaterial.name);

        console.log(`Material completed: ${this.currentMaterial.name}`);
    }

    updateProgressIndicator(progress) {
        const progressBar = document.getElementById('material-progress-bar');
        const progressText = document.getElementById('material-progress-text');
        
        if (progressBar) {
            progressBar.style.width = `${progress * 100}%`;
        }
        
        if (progressText) {
            progressText.textContent = `${Math.round(progress * 100)}% selesai`;
        }
    }

    updateStatsDisplay() {
        this.updateStatsDisplayWithNoCache();
    }

    updateStatsDisplayWithNoCache() {
        // Update materials stats only (forum posts handled by real-time listener)
        this.updateStatsElementsWithNoCache('[data-stat="materials-read"]', this.statsCache.materialsRead);
        this.updateStatsElementsWithNoCache('[data-stat="materials-completed"]', this.statsCache.materialsCompleted);
        this.updateStatsElementsWithNoCache('[data-stat="materi-selesai"]', this.statsCache.materialsCompleted);
        this.updateStatsElementsWithNoCache('[data-stat="quiz-completed"]', this.statsCache.quizCompleted || 0);
    }

    updateStatsElementsWithNoCache(selector, value) {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => {
            el.textContent = value;
            el.setAttribute('data-last-update', Date.now());
            // Force repaint
            el.style.transform = 'translateZ(0)';
            setTimeout(() => {
                el.style.transform = '';
            }, 0);
        });
    }

    updateGlobalStats(statType, value) {
        const elements = document.querySelectorAll(`[data-global-stat="${statType}"]`);
        elements.forEach(el => {
            el.textContent = value;
        });
    }

    showCompletionNotification(materialName) {
        const notification = document.createElement('div');
        notification.className = 'fixed top-20 right-4 bg-green-500 text-white px-6 py-4 rounded-lg shadow-lg z-50 transform translate-x-full transition-transform duration-300';
        notification.innerHTML = `
            <div class="flex items-center space-x-3">
                <div class="text-2xl">🎉</div>
                <div>
                    <div class="font-semibold">Materi Selesai!</div>
                    <div class="text-sm opacity-90">${materialName}</div>
                </div>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.remove('translate-x-full');
        }, 100);
        
        setTimeout(() => {
            notification.classList.add('translate-x-full');
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, 4000);
    }

    showTrackingNotification(message) {
        const notification = document.createElement('div');
        notification.className = 'fixed top-20 right-4 bg-blue-500 text-white px-4 py-3 rounded-lg shadow-lg z-50 transform translate-x-full transition-transform duration-300';
        notification.innerHTML = `
            <div class="flex items-center space-x-2">
                <div class="text-lg">📖</div>
                <div class="text-sm font-medium">${message}</div>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.remove('translate-x-full');
        }, 100);
        
        setTimeout(() => {
            notification.classList.add('translate-x-full');
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, 3000);
    }

    forceCompleteMaterial() {
        if (this.isTracking && this.currentMaterial) {
            this.markAsCompleted();
        }
    }

    getTrackingStatus() {
        if (!this.isTracking) return null;
        
        return {
            material: this.currentMaterial,
            progress: this.calculateProgress(),
            readingTime: this.readingStartTime ? Date.now() - this.readingStartTime : 0,
            isCompleted: this.currentMaterial?.completed || false
        };
    }

    getStats() {
        return this.statsCache;
    }

    calculateStreak() {
        if (!this.statsCache.activeDatesHistory) return 0;
        
        const dates = this.statsCache.activeDatesHistory
            .map(dateStr => new Date(dateStr))
            .sort((a, b) => b - a);
        
        let streak = 0;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        for (let i = 0; i < dates.length; i++) {
            const date = new Date(dates[i]);
            date.setHours(0, 0, 0, 0);
            
            const expectedDate = new Date(today);
            expectedDate.setDate(today.getDate() - i);
            
            if (date.getTime() === expectedDate.getTime()) {
                streak++;
            } else {
                break;
            }
        }
        
        return streak;
    }

    cleanup() {
        this.unsubscribeListeners.forEach(unsubscribe => {
            if (typeof unsubscribe === 'function') {
                unsubscribe();
            }
        });
        this.unsubscribeListeners = [];
        
        if (this.isTracking) {
            this.stopMaterialTracking();
        }
    }
}

// Legacy functions for backward compatibility
console.log('Loading user stats...');

function getQuizHistory() {
    try {
        const data = localStorage.getItem('quizHistory');
        return data ? JSON.parse(data) : [];
    } catch (error) {
        console.warn('Error loading quiz history:', error);
        return [];
    }
}

function getForumPostsCount() {
    try {
        const count = localStorage.getItem('userForumPosts');
        return count ? parseInt(count, 10) : 0;
    } catch (error) {
        console.warn('Error loading forum posts count:', error);
        return 0;
    }
}

function getAverageQuizScore() {
    try {
        const quizHistory = getQuizHistory();
        
        if (quizHistory.length === 0) {
            return 0;
        }
        
        const totalScore = quizHistory.reduce((sum, quiz) => {
            return sum + (quiz.overallScore || 0);
        }, 0);
        
        return Math.round(totalScore / quizHistory.length);
    } catch (error) {
        console.warn('Error calculating average score:', error);
        return 0;
    }
}

// Legacy updateUserStatistics removed - now handled by UserStats class

function animateNumber(element, targetNumber) {
    const startNumber = 0;
    const duration = 1000;
    const startTime = performance.now();
    
    function updateNumber(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        const easeOutQuart = 1 - Math.pow(1 - progress, 4);
        const currentNumber = Math.floor(easeOutQuart * targetNumber);
        
        element.textContent = currentNumber;
        
        if (progress < 1) {
            requestAnimationFrame(updateNumber);
        } else {
            element.textContent = targetNumber;
        }
    }
    
    requestAnimationFrame(updateNumber);
}

// incrementForumPosts and decrementForumPosts removed - use UserStats.getInstance().incrementForumPost()

function getDetailedQuizStats() {
    try {
        const quizHistory = getQuizHistory();
        
        if (quizHistory.length === 0) {
            return {
                totalCompleted: 0,
                averageScore: 0,
                bestScore: 0,
                latestScore: 0,
                improvement: 0
            };
        }
        
        const scores = quizHistory.map(quiz => quiz.overallScore || 0);
        const totalCompleted = quizHistory.length;
        const averageScore = Math.round(scores.reduce((sum, score) => sum + score, 0) / totalCompleted);
        const bestScore = Math.max(...scores);
        const latestScore = scores[0] || 0;
        
        const firstScore = scores[scores.length - 1] || 0;
        const improvement = totalCompleted > 1 ? latestScore - firstScore : 0;
        
        return {
            totalCompleted,
            averageScore,
            bestScore,
            latestScore,
            improvement
        };
    } catch (error) {
        console.error('Error getting detailed quiz stats:', error);
        return {
            totalCompleted: 0,
            averageScore: 0,
            bestScore: 0,
            latestScore: 0,
            improvement: 0
        };
    }
}

// Legacy event listeners removed - UserStats class handles everything

// Export utility functions for backward compatibility
window.getDetailedQuizStats = getDetailedQuizStats;
window.getQuizHistory = getQuizHistory;

console.log('User stats module loaded');

// Disable browser cache for real-time data
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(function(registrations) {
        for(let registration of registrations) {
            // Don't cache stats data
            if (registration.scope.includes('stats') || registration.scope.includes('user')) {
                registration.unregister();
            }
        }
    });
}

// Add cache-busting headers
const originalFetch = window.fetch;
window.fetch = function(...args) {
    const url = args[0];
    if (typeof url === 'string' && (url.includes('firestore') || url.includes('users') || url.includes('posts'))) {
        const urlObj = new URL(url, window.location.origin);
        urlObj.searchParams.set('_t', Date.now());
        args[0] = urlObj.toString();
    }
    return originalFetch.apply(this, args);
};

// Create global instance (singleton pattern)
let userStats;
if (!window.userStats) {
    userStats = new UserStatsManager();
    console.log('✅ UserStatsManager initialized');
} else {
    userStats = window.userStats;
    console.log('🔄 Using existing UserStatsManager instance');
}

// Export for global use
window.userStats = userStats;
window.realtimeStats = userStats;
window.startReadingMaterial = (id, name) => userStats.startReadingMaterial(id, name);
window.updateMaterialProgress = (id, progress) => userStats.updateMaterialProgress(id, progress);
window.completeMaterial = (id, name) => userStats.completeMaterial(id, name);
window.startMaterialTracking = (id, name, type) => userStats.startMaterialTracking(id, name, type);
window.stopMaterialTracking = () => userStats.stopMaterialTracking();
window.forceCompleteMaterial = () => userStats.forceCompleteMaterial();

window.materialTracker = {
    startTracking: (id, name, type) => userStats.startMaterialTracking(id, name, type),
    stopTracking: () => userStats.stopMaterialTracking(),
    forceComplete: () => userStats.forceCompleteMaterial(),
    getTrackingStatus: () => userStats.getTrackingStatus()
};

// Export class and instance
export { UserStatsManager, userStats as UserStats };
export default userStats;