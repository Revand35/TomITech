// environmental-activity-service.js
// Service untuk mengelola Environmental Activities di Firebase Firestore

import { auth, db } from '../../../config/firebase-init.js';
import { collection, addDoc, getDocs, query, where, orderBy, limit, serverTimestamp, updateDoc, deleteDoc, doc } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

/**
 * Hitung nilai ekonomi berdasarkan jenis aktivitas
 * Formula sederhana untuk perhitungan Green Accounting
 */
function calculateEconomicValue(activityType, materialType, amount, action) {
    // Base value per kg/unit untuk setiap material
    const materialValues = {
        'plastic': 3000,      // Rp 3.000/kg
        'paper': 2000,        // Rp 2.000/kg
        'metal': 5000,        // Rp 5.000/kg
        'organic': 1000,      // Rp 1.000/kg
        'electricity': 1500,  // Rp 1.500/kWh
        'water': 500          // Rp 500/liter
    };
    
    // Action multiplier
    const actionMultipliers = {
        'recycled': 1.5,      // Daur ulang bernilai lebih tinggi
        'reduced': 1.2,       // Pengurangan juga bagus
        'reused': 1.3,        // Penggunaan ulang
        'disposed': 0.5,      // Pembuangan nilai lebih rendah
        'conserved': 1.4      // Penghematan
    };
    
    const baseValue = materialValues[materialType] || 1000;
    const multiplier = actionMultipliers[action] || 1;
    
    return Math.round(parseFloat(amount) * baseValue * multiplier);
}

/**
 * Hitung Eco-Score berdasarkan aktivitas
 * Score 1-10 berdasarkan dampak lingkungan
 */
function calculateEcoScore(activityType, action, amount) {
    // Base score untuk action
    const actionScores = {
        'recycled': 8,
        'reduced': 7,
        'reused': 7,
        'disposed': 3,
        'conserved': 6
    };
    
    // Bonus untuk jumlah besar
    const amountNum = parseFloat(amount);
    let bonus = 0;
    if (amountNum >= 100) bonus = 2;
    else if (amountNum >= 50) bonus = 1;
    
    const baseScore = actionScores[action] || 5;
    return Math.min(10, baseScore + bonus); // Max 10
}

/**
 * Simpan aktivitas lingkungan ke Firestore
 * @param {Object} activityData - Data aktivitas yang akan disimpan
 * @returns {Promise<Object>} - Data aktivitas yang telah disimpan dengan ID
 */
export async function saveEnvironmentalActivity(activityData) {
    try {
        // Pastikan user sudah login
        const user = auth.currentUser;
        if (!user) {
            throw new Error('User belum login. Silakan login terlebih dahulu.');
        }
        
        console.log('💾 Saving environmental activity to Firestore...', activityData);
        
        // Hitung nilai ekonomi dan eco-score
        const economicValue = activityData.cost && parseFloat(activityData.cost) > 0 
            ? parseFloat(activityData.cost)
            : calculateEconomicValue(
                activityData.activityType, 
                activityData.materialType, 
                activityData.amount, 
                activityData.action
            );
        
        const ecoScore = calculateEcoScore(
            activityData.activityType, 
            activityData.action, 
            activityData.amount
        );
        
        // Siapkan data untuk Firestore
        const firestoreData = {
            // User information
            userId: user.uid,
            userEmail: user.email,
            userName: user.displayName || 'User',
            
            // Activity details
            activityType: activityData.activityType,
            materialType: activityData.materialType,
            amount: parseFloat(activityData.amount),
            unit: activityData.unit,
            action: activityData.action,
            notes: activityData.notes || '',
            
            // Calculated values
            economicValue: economicValue,
            ecoScore: ecoScore,
            
            // Metadata
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            timestamp: new Date().toISOString() // For sorting
        };
        
        // Simpan ke Firestore collection 'environmental_activities'
        const docRef = await addDoc(collection(db, 'environmental_activities'), firestoreData);
        
        console.log('✅ Activity saved successfully with ID:', docRef.id);
        
        // Return data dengan ID
        return {
            id: docRef.id,
            ...firestoreData,
            economicValue: economicValue,
            ecoScore: ecoScore
        };
        
    } catch (error) {
        console.error('❌ Error saving environmental activity:', error);
        throw new Error(`Gagal menyimpan aktivitas: ${error.message}`);
    }
}

/**
 * Ambil semua aktivitas user dari Firestore
 * @param {number} limitCount - Jumlah maksimal data yang diambil (default: 50)
 * @returns {Promise<Array>} - Array of activities
 */
export async function getUserActivities(limitCount = 50) {
    try {
        const user = auth.currentUser;
        if (!user) {
            throw new Error('User belum login');
        }
        
        console.log('📖 Fetching user activities from Firestore...');
        
        // Query activities untuk user ini, sorted by createdAt descending
        const q = query(
            collection(db, 'environmental_activities'),
            where('userId', '==', user.uid),
            orderBy('createdAt', 'desc'),
            limit(limitCount)
        );
        
        const querySnapshot = await getDocs(q);
        const activities = [];
        
        querySnapshot.forEach((doc) => {
            activities.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        console.log(`✅ Fetched ${activities.length} activities`);
        return activities;
        
    } catch (error) {
        console.error('❌ Error fetching activities:', error);
        throw new Error(`Gagal mengambil data aktivitas: ${error.message}`);
    }
}

/**
 * Hitung statistik dari semua aktivitas user
 * @returns {Promise<Object>} - Statistik agregat
 */
export async function getActivityStats() {
    try {
        const user = auth.currentUser;
        if (!user) {
            throw new Error('User belum login');
        }
        
        console.log('📊 Calculating activity statistics...');
        
        // Ambil semua aktivitas user
        const activities = await getUserActivities(1000); // Ambil banyak untuk stats
        
        // Hitung statistik
        const stats = {
            totalActivities: activities.length,
            totalWasteAmount: 0,
            totalEconomicValue: 0,
            totalEcoScore: 0,
            averageEcoScore: 0,
            activityBreakdown: {
                waste: 0,
                energy: 0,
                water: 0,
                carbon: 0,
                recycling: 0
            },
            actionBreakdown: {
                recycled: 0,
                reduced: 0,
                reused: 0,
                disposed: 0,
                conserved: 0
            }
        };
        
        // Agregasi data
        activities.forEach(activity => {
            // Total amounts
            if (activity.activityType === 'waste' || activity.activityType === 'recycling') {
                stats.totalWasteAmount += activity.amount || 0;
            }
            
            stats.totalEconomicValue += activity.economicValue || 0;
            stats.totalEcoScore += activity.ecoScore || 0;
            
            // Breakdown by type
            if (stats.activityBreakdown[activity.activityType] !== undefined) {
                stats.activityBreakdown[activity.activityType]++;
            }
            
            // Breakdown by action
            if (stats.actionBreakdown[activity.action] !== undefined) {
                stats.actionBreakdown[activity.action]++;
            }
        });
        
        // Calculate averages
        if (stats.totalActivities > 0) {
            stats.averageEcoScore = Math.round(stats.totalEcoScore / stats.totalActivities);
        }
        
        console.log('✅ Statistics calculated:', stats);
        return stats;
        
    } catch (error) {
        console.error('❌ Error calculating statistics:', error);
        throw new Error(`Gagal menghitung statistik: ${error.message}`);
    }
}

/**
 * Update aktivitas yang sudah ada
 * @param {string} activityId - ID dokumen di Firestore
 * @param {Object} updates - Data yang akan diupdate
 * @returns {Promise<void>}
 */
export async function updateActivity(activityId, updates) {
    try {
        const user = auth.currentUser;
        if (!user) {
            throw new Error('User belum login');
        }
        
        console.log('✏️ Updating activity:', activityId);
        
        const activityRef = doc(db, 'environmental_activities', activityId);
        await updateDoc(activityRef, {
            ...updates,
            updatedAt: serverTimestamp()
        });
        
        console.log('✅ Activity updated successfully');
        
    } catch (error) {
        console.error('❌ Error updating activity:', error);
        throw new Error(`Gagal mengupdate aktivitas: ${error.message}`);
    }
}

/**
 * Hapus aktivitas
 * @param {string} activityId - ID dokumen di Firestore
 * @returns {Promise<void>}
 */
export async function deleteActivity(activityId) {
    try {
        const user = auth.currentUser;
        if (!user) {
            throw new Error('User belum login');
        }
        
        console.log('🗑️ Deleting activity:', activityId);
        
        const activityRef = doc(db, 'environmental_activities', activityId);
        await deleteDoc(activityRef);
        
        console.log('✅ Activity deleted successfully');
        
    } catch (error) {
        console.error('❌ Error deleting activity:', error);
        throw new Error(`Gagal menghapus aktivitas: ${error.message}`);
    }
}

// Export semua fungsi
export default {
    saveEnvironmentalActivity,
    getUserActivities,
    getActivityStats,
    updateActivity,
    deleteActivity,
    calculateEconomicValue,
    calculateEcoScore
};

