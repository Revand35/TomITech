// quiz-firestore-service.js - Enhanced version dengan CRUD lengkap untuk quiz

import { db, auth } from '../../../config/firebase-init.js';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  getDocs, 
  serverTimestamp,
  doc,
  getDoc,
  updateDoc,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const QUIZ_RESULTS_COLLECTION = 'quizResults';

// ==================== SIMPAN HASIL QUIZ ====================
export async function saveQuizResultToFirestore(resultsData) {
  try {
    const user = auth.currentUser;
    
    if (!user) {
      console.warn("⚠️ User belum login, hasil tidak bisa disimpan.");
      return null;
    }

    const quizData = {
      userId: user.uid,
      email: user.email || "anonymous",
      displayName: user.displayName || user.email?.split('@')[0] || "User",
      
      // Data hasil quiz
      aspectScores: resultsData.aspectScores,
      overallScore: resultsData.overallScore,
      overallCategory: resultsData.overallCategory,
      
      // Data jawaban lengkap (opsional, bisa makan storage)
      answers: resultsData.answers || null,
      
      // Metadata
      completedAt: serverTimestamp(),
      createdAt: new Date().toISOString(), // fallback ISO string
      
      // Stats tambahan
      totalQuestions: resultsData.totalQuestions || 70,
      timeSpent: resultsData.timeSpent || null,
    };

    const docRef = await addDoc(collection(db, QUIZ_RESULTS_COLLECTION), quizData);
    
    console.log("✅ Quiz result saved with ID:", docRef.id);
    return docRef.id;
    
  } catch (error) {
    console.error("❌ Error saving quiz result:", error);
    throw error;
  }
}

// ==================== AMBIL HISTORY QUIZ USER ====================
export async function getQuizHistoryFromFirestore(userId = null, limitCount = 10) {
  try {
    const user = userId || auth.currentUser?.uid;

    if (!user) {
      console.warn("⚠️ No user ID provided");
      return [];
    }

    const q = query(
      collection(db, QUIZ_RESULTS_COLLECTION),
      where('userId', '==', user),
      limit(limitCount)
    );

    const snapshot = await getDocs(q);

    let history = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      // Convert Timestamp to Date string
      date: doc.data().completedAt?.toDate?.()?.toISOString() || doc.data().createdAt
    }));

    // Sort by date descending (newest first) in JavaScript
    history.sort((a, b) => {
      const dateA = new Date(a.date || a.createdAt);
      const dateB = new Date(b.date || b.createdAt);
      return dateB - dateA;
    });

    console.log(`✅ Loaded ${history.length} quiz results for user ${user}`);
    return history;

  } catch (error) {
    console.error("❌ Error loading quiz history:", error);
    return [];
  }
}

// ==================== GET SINGLE QUIZ RESULT ====================
export async function getQuizResultById(quizId) {
  try {
    const docRef = doc(db, QUIZ_RESULTS_COLLECTION, quizId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...docSnap.data(),
        date: docSnap.data().completedAt?.toDate?.()?.toISOString() || docSnap.data().createdAt
      };
    }
    
    return null;
  } catch (error) {
    console.error("❌ Error getting quiz result:", error);
    return null;
  }
}

// ==================== UPDATE QUIZ RESULT ====================
export async function updateQuizResult(quizId, updates) {
  try {
    const docRef = doc(db, QUIZ_RESULTS_COLLECTION, quizId);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });
    
    console.log("✅ Quiz result updated:", quizId);
    return true;
  } catch (error) {
    console.error("❌ Error updating quiz result:", error);
    return false;
  }
}

// ==================== HAPUS QUIZ RESULT ====================
export async function deleteQuizResult(quizId) {
  try {
    await deleteDoc(doc(db, QUIZ_RESULTS_COLLECTION, quizId));
    console.log("✅ Quiz result deleted:", quizId);
    return true;
  } catch (error) {
    console.error("❌ Error deleting quiz result:", error);
    return false;
  }
}

// ==================== ADMIN: GET ALL QUIZ RESULTS ====================
export async function getAllQuizResults(limitCount = 100) {
  try {
    const q = query(
      collection(db, QUIZ_RESULTS_COLLECTION),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );

    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      date: doc.data().completedAt?.toDate?.()?.toISOString() || doc.data().createdAt
    }));
    
  } catch (error) {
    console.error("❌ Error getting all quiz results:", error);
    return [];
  }
}

// ==================== ADMIN: GET STATS PER USER ====================
export async function getUserQuizStats(userId) {
  try {
    const results = await getQuizHistoryFromFirestore(userId, 100);
    
    if (results.length === 0) {
      return {
        totalQuizzes: 0,
        averageScore: 0,
        bestScore: 0,
        latestScore: 0,
        improvement: 0,
        aspectAverages: {}
      };
    }

    const scores = results.map(r => r.overallScore);
    const totalQuizzes = results.length;
    const averageScore = scores.reduce((sum, s) => sum + s, 0) / totalQuizzes;
    const bestScore = Math.max(...scores);
    const latestScore = scores[0];
    const firstScore = scores[scores.length - 1];
    const improvement = totalQuizzes > 1 ? latestScore - firstScore : 0;

    // Calculate average per aspect
    const aspectAverages = {};
    const aspectNames = ['empati', 'hatiNurani', 'pengendalianDiri', 'hormat', 'kebaikanHati', 'toleransi', 'keadilan'];
    
    aspectNames.forEach(aspect => {
      const aspectScores = results
        .map(r => r.aspectScores?.find(a => a.aspect === aspect)?.score)
        .filter(s => s !== undefined);
      
      if (aspectScores.length > 0) {
        aspectAverages[aspect] = aspectScores.reduce((sum, s) => sum + s, 0) / aspectScores.length;
      }
    });

    return {
      totalQuizzes,
      averageScore: Math.round(averageScore * 10) / 10,
      bestScore,
      latestScore,
      improvement: Math.round(improvement * 10) / 10,
      aspectAverages,
      results
    };
    
  } catch (error) {
    console.error("❌ Error getting user quiz stats:", error);
    return null;
  }
}

// ==================== ADMIN: GET ANALYTICS ====================
export async function getQuizAnalytics() {
  try {
    const allResults = await getAllQuizResults(1000);
    
    if (allResults.length === 0) {
      return {
        totalQuizzes: 0,
        totalUsers: 0,
        averageScore: 0,
        scoreDistribution: {},
        aspectAverages: {}
      };
    }

    const uniqueUsers = new Set(allResults.map(r => r.userId));
    const scores = allResults.map(r => r.overallScore);
    const averageScore = scores.reduce((sum, s) => sum + s, 0) / scores.length;

    // Score distribution
    const scoreDistribution = {
      'Kurang (0-40)': scores.filter(s => s <= 40).length,
      'Cukup (41-60)': scores.filter(s => s > 40 && s <= 60).length,
      'Baik (61-80)': scores.filter(s => s > 60 && s <= 80).length,
      'Sangat Baik (81-100)': scores.filter(s => s > 80).length
    };

    // Average per aspect across all users
    const aspectAverages = {};
    const aspectNames = ['empati', 'hatiNurani', 'pengendalianDiri', 'hormat', 'kebaikanHati', 'toleransi', 'keadilan'];
    
    aspectNames.forEach(aspect => {
      const aspectScores = allResults
        .map(r => r.aspectScores?.find(a => a.aspect === aspect)?.score)
        .filter(s => s !== undefined);
      
      if (aspectScores.length > 0) {
        aspectAverages[aspect] = aspectScores.reduce((sum, s) => sum + s, 0) / aspectScores.length;
      }
    });

    return {
      totalQuizzes: allResults.length,
      totalUsers: uniqueUsers.size,
      averageScore: Math.round(averageScore * 10) / 10,
      scoreDistribution,
      aspectAverages,
      recentResults: allResults.slice(0, 10)
    };
    
  } catch (error) {
    console.error("❌ Error getting quiz analytics:", error);
    return null;
  }
}

// ==================== MIGRATE FROM LOCALSTORAGE ====================
export async function migrateLocalStorageToFirestore() {
  try {
    const localHistory = localStorage.getItem('quizHistory');
    
    if (!localHistory) {
      console.log("No local quiz history to migrate");
      return 0;
    }

    const history = JSON.parse(localHistory);
    let migrated = 0;

    for (const quiz of history) {
      try {
        await saveQuizResultToFirestore(quiz);
        migrated++;
      } catch (error) {
        console.error("Error migrating quiz:", error);
      }
    }

    console.log(`✅ Migrated ${migrated} quiz results to Firestore`);
    return migrated;
    
  } catch (error) {
    console.error("❌ Error migrating data:", error);
    return 0;
  }
}