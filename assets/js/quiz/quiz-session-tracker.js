import { auth } from '../../../config/firebase-init.js';
import {
    saveQuizResultToFirestore,
    getQuizHistoryFromFirestore
} from './quiz-firestore-service.js';

let isFirestoreReady = false;
let syncInProgress = false;

/**
 * Initialize session tracker
 */
export function initSessionTracker() {
    console.log('🔄 Initializing quiz session tracker...');
    
    // Listen to auth state changes
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            console.log('✅ User logged in, syncing quiz history...');
            await syncQuizHistory();
            isFirestoreReady = true;
        } else {
            console.log('⚠️ User not logged in');
            isFirestoreReady = false;
        }
    });
}

/**
 * Sync local quiz history to Firestore
 */
async function syncQuizHistory() {
    if (syncInProgress) {
        console.log('⏳ Sync already in progress...');
        return;
    }
    
    syncInProgress = true;

    try {
        // Load history from Firestore
        const firestoreHistory = await getQuizHistoryFromFirestore(10);
        
        if (firestoreHistory.length > 0) {
            // Update localStorage with Firestore data
            const localHistory = getLocalQuizHistory();
            
            // Merge histories, prioritizing Firestore data
            const mergedHistory = mergeHistories(localHistory, firestoreHistory);
            saveLocalQuizHistory(mergedHistory);
            
            console.log('✅ Quiz history synced successfully');
        }
    } catch (error) {
        console.error('❌ Error syncing quiz history:', error);
    } finally {
        syncInProgress = false;
    }
}

/**
 * Merge local and Firestore histories
 */
function mergeHistories(localHistory, firestoreHistory) {
    const merged = [...firestoreHistory];
    
    // Add local entries that don't exist in Firestore
    localHistory.forEach(localEntry => {
        const existsInFirestore = firestoreHistory.some(fsEntry => 
            fsEntry.timestamp === localEntry.date || 
            (fsEntry.overallScore === localEntry.overallScore && 
             Math.abs(new Date(fsEntry.timestamp) - new Date(localEntry.date)) < 60000)
        );
        
        if (!existsInFirestore) {
            merged.push(localEntry);
        }
    });
    
    // Sort by date descending
    return merged.sort((a, b) => {
        const dateA = new Date(a.timestamp || a.date);
        const dateB = new Date(b.timestamp || b.date);
        return dateB - dateA;
    }).slice(0, 10);
}

/**
 * Save quiz result (both localStorage and Firestore)
 */
export async function saveQuizResult(resultsData) {
    try {
        // Save to localStorage first
        const historyEntry = { 
            date: new Date().toISOString(), 
            ...resultsData 
        };
        
        const localHistory = getLocalQuizHistory();
        localHistory.unshift(historyEntry);
        const updatedHistory = localHistory.slice(0, 10);
        saveLocalQuizHistory(updatedHistory);
        
        // Save to Firestore if user is logged in
        if (isFirestoreReady && auth.currentUser) {
            const firestoreId = await saveQuizResultToFirestore(resultsData);
            
            if (firestoreId) {
                // Update local entry with Firestore ID
                updatedHistory[0].id = firestoreId;
                saveLocalQuizHistory(updatedHistory);
                console.log('✅ Quiz saved to both localStorage and Firestore');
            }
        } else {
            console.log('✅ Quiz saved to localStorage (Firestore not ready)');
        }
        
        return updatedHistory;
    } catch (error) {
        console.error('❌ Error saving quiz result:', error);
        throw error;
    }
}

/**
 * Get quiz history (from localStorage or Firestore)
 */
export async function getQuizHistory() {
    try {
        if (isFirestoreReady && auth.currentUser) {
            const firestoreHistory = await getQuizHistoryFromFirestore(10);
            if (firestoreHistory.length > 0) {
                saveLocalQuizHistory(firestoreHistory);
                return firestoreHistory;
            }
        }
        
        return getLocalQuizHistory();
    } catch (error) {
        console.error('❌ Error getting quiz history:', error);
        return getLocalQuizHistory();
    }
}

/**
 * Get local quiz history
 */
function getLocalQuizHistory() {
    try {
        const data = localStorage.getItem('quizHistory');
        return data ? JSON.parse(data) : [];
    } catch {
        return [];
    }
}

/**
 * Save local quiz history
 */
function saveLocalQuizHistory(history) {
    try {
        localStorage.setItem('quizHistory', JSON.stringify(history));
    } catch {
        console.warn('Could not save to localStorage');
    }
}

/**
 * Check if Firestore is ready
 */
export function isFirestoreAvailable() {
    return isFirestoreReady;
}

// Auto-initialize on load
if (typeof window !== 'undefined') {
    initSessionTracker();
}

console.log('✅ Quiz session tracker loaded');