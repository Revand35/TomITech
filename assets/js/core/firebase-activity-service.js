// firebase-activity-service.js - Service untuk mengelola aktivitas lingkungan di Firebase
import { db } from '../../../config/firebase-init.js';
import { collection, addDoc, getDocs, query, where, orderBy, limit, doc, updateDoc, deleteDoc } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { auth } from '../../../config/firebase-init.js';

// =============================
// Firebase Activity Service
// =============================

/**
 * Simpan aktivitas lingkungan baru ke Firestore
 * @param {Object} activityData - Data aktivitas lingkungan
 * @returns {Promise<Object>} - Data aktivitas yang tersimpan dengan ID
 */
export async function saveActivityToFirestore(activityData) {
    try {
        // Pastikan user sudah login
        const user = auth.currentUser;
        if (!user) {
            throw new Error('User harus login untuk menyimpan aktivitas');
        }

        // Validasi data yang diperlukan
        const validationResult = validateActivityData(activityData);
        if (!validationResult.isValid) {
            throw new Error(validationResult.error);
        }

        // Hitung nilai ekonomi dan eco-score
        const economicValue = calculateEconomicValue(activityData);
        const ecoScore = calculateEcoScore(activityData);

        // Siapkan data untuk disimpan
        const activityToSave = {
            userId: user.uid,
            userEmail: user.email,
            activityType: activityData.activityType.trim(),
            materialType: activityData.materialType.trim(),
            amount: parseFloat(activityData.amount),
            unit: activityData.unit.trim(),
            action: activityData.action.trim(),
            cost: parseFloat(activityData.cost) || 0,
            notes: (activityData.notes || '').trim(),
            economicValue: economicValue,
            ecoScore: ecoScore,
            timestamp: new Date(),
            createdAt: new Date(),
            updatedAt: new Date()
        };

        // Simpan ke Firestore
        const docRef = await addDoc(collection(db, 'environmental_activities'), activityToSave);
        
        console.log('✅ Aktivitas berhasil disimpan ke Firestore dengan ID:', docRef.id);
        
        return {
            id: docRef.id,
            ...activityToSave
        };

    } catch (error) {
        console.error('❌ Error menyimpan aktivitas ke Firestore:', error);
        
        // Handle specific Firebase errors
        if (error.code === 'permission-denied') {
            throw new Error('Anda tidak memiliki izin untuk menyimpan aktivitas. Pastikan Anda sudah login.');
        } else if (error.code === 'unavailable') {
            throw new Error('Database sedang tidak tersedia. Silakan coba lagi nanti.');
        } else if (error.code === 'invalid-argument') {
            throw new Error('Data yang dimasukkan tidak valid. Periksa kembali input Anda.');
        }
        
        throw new Error(`Gagal menyimpan aktivitas: ${error.message}`);
    }
}

/**
 * Ambil semua aktivitas lingkungan user dari Firestore
 * @param {number} limitCount - Jumlah maksimal data yang diambil
 * @returns {Promise<Array>} - Array aktivitas lingkungan
 */
export async function getActivitiesFromFirestore(limitCount = 50) {
    try {
        const user = auth.currentUser;
        if (!user) {
            throw new Error('User harus login untuk mengambil data aktivitas');
        }

        // Validasi limit count
        if (limitCount < 1 || limitCount > 1000) {
            throw new Error('Limit count harus antara 1-1000');
        }

        // Query untuk mengambil aktivitas user, diurutkan berdasarkan timestamp terbaru
        const q = query(
            collection(db, 'environmental_activities'),
            where('userId', '==', user.uid),
            orderBy('timestamp', 'desc'),
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

        console.log(`📊 Mengambil ${activities.length} aktivitas dari Firestore`);
        return activities;

    } catch (error) {
        console.error('❌ Error mengambil aktivitas dari Firestore:', error);
        
        // Handle specific Firebase errors
        if (error.code === 'permission-denied') {
            throw new Error('Anda tidak memiliki izin untuk mengakses data aktivitas. Pastikan Anda sudah login.');
        } else if (error.code === 'unavailable') {
            throw new Error('Database sedang tidak tersedia. Silakan coba lagi nanti.');
        } else if (error.code === 'invalid-argument') {
            throw new Error('Parameter query tidak valid.');
        }
        
        throw new Error(`Gagal mengambil data aktivitas: ${error.message}`);
    }
}

/**
 * Ambil statistik aktivitas lingkungan user
 * @returns {Promise<Object>} - Objek statistik aktivitas
 */
export async function getActivityStatsFromFirestore() {
    try {
        const activities = await getActivitiesFromFirestore(1000); // Ambil lebih banyak untuk statistik
        
        if (activities.length === 0) {
            return {
                totalActivities: 0,
                totalWasteAmount: 0,
                totalEconomicValue: 0,
                averageEcoScore: 0,
                materialBreakdown: {},
                actionBreakdown: {},
                monthlyTrend: [],
                recommendations: []
            };
        }

        // Hitung statistik
        const totalWasteAmount = activities.reduce((sum, activity) => 
            sum + (activity.amount || 0), 0);
        
        const totalEconomicValue = activities.reduce((sum, activity) => 
            sum + (activity.economicValue || 0), 0);
        
        const averageEcoScore = activities.reduce((sum, activity) => 
            sum + (activity.ecoScore || 0), 0) / activities.length;

        // Breakdown berdasarkan material
        const materialBreakdown = {};
        activities.forEach(activity => {
            const material = activity.materialType;
            if (!materialBreakdown[material]) {
                materialBreakdown[material] = { count: 0, amount: 0, value: 0 };
            }
            materialBreakdown[material].count++;
            materialBreakdown[material].amount += activity.amount || 0;
            materialBreakdown[material].value += activity.economicValue || 0;
        });

        // Breakdown berdasarkan aksi
        const actionBreakdown = {};
        activities.forEach(activity => {
            const action = activity.action;
            if (!actionBreakdown[action]) {
                actionBreakdown[action] = { count: 0, amount: 0, value: 0 };
            }
            actionBreakdown[action].count++;
            actionBreakdown[action].amount += activity.amount || 0;
            actionBreakdown[action].value += activity.economicValue || 0;
        });

        // Trend bulanan (6 bulan terakhir)
        const monthlyTrend = calculateMonthlyTrend(activities);

        // Rekomendasi berdasarkan data
        const recommendations = generateRecommendations(activities, materialBreakdown, actionBreakdown);

        return {
            totalActivities: activities.length,
            totalWasteAmount,
            totalEconomicValue,
            averageEcoScore: Math.round(averageEcoScore),
            materialBreakdown,
            actionBreakdown,
            monthlyTrend,
            recommendations
        };

    } catch (error) {
        console.error('❌ Error menghitung statistik aktivitas:', error);
        throw new Error(`Gagal menghitung statistik: ${error.message}`);
    }
}

/**
 * Update aktivitas lingkungan di Firestore
 * @param {string} activityId - ID aktivitas yang akan diupdate
 * @param {Object} updateData - Data yang akan diupdate
 * @returns {Promise<Object>} - Data aktivitas yang terupdate
 */
export async function updateActivityInFirestore(activityId, updateData) {
    try {
        const user = auth.currentUser;
        if (!user) {
            throw new Error('User harus login untuk mengupdate aktivitas');
        }

        // Hitung ulang nilai ekonomi dan eco-score jika ada perubahan
        if (updateData.amount || updateData.action || updateData.materialType) {
            const activity = { ...updateData };
            updateData.economicValue = calculateEconomicValue(activity);
            updateData.ecoScore = calculateEcoScore(activity);
        }

        updateData.updatedAt = new Date();

        const activityRef = doc(db, 'environmental_activities', activityId);
        await updateDoc(activityRef, updateData);

        console.log('✅ Aktivitas berhasil diupdate di Firestore:', activityId);
        return { id: activityId, ...updateData };

    } catch (error) {
        console.error('❌ Error mengupdate aktivitas di Firestore:', error);
        throw new Error(`Gagal mengupdate aktivitas: ${error.message}`);
    }
}

/**
 * Hapus aktivitas lingkungan dari Firestore
 * @param {string} activityId - ID aktivitas yang akan dihapus
 * @returns {Promise<boolean>} - True jika berhasil dihapus
 */
export async function deleteActivityFromFirestore(activityId) {
    try {
        const user = auth.currentUser;
        if (!user) {
            throw new Error('User harus login untuk menghapus aktivitas');
        }

        const activityRef = doc(db, 'environmental_activities', activityId);
        await deleteDoc(activityRef);

        console.log('✅ Aktivitas berhasil dihapus dari Firestore:', activityId);
        return true;

    } catch (error) {
        console.error('❌ Error menghapus aktivitas dari Firestore:', error);
        throw new Error(`Gagal menghapus aktivitas: ${error.message}`);
    }
}

// =============================
// Helper Functions
// =============================

/**
 * Validasi data aktivitas lingkungan
 * @param {Object} activityData - Data aktivitas yang akan divalidasi
 * @returns {Object} - {isValid: boolean, error: string}
 */
function validateActivityData(activityData) {
    // Validasi field yang wajib diisi
    const requiredFields = ['activityType', 'materialType', 'amount', 'unit', 'action'];
    for (const field of requiredFields) {
        if (!activityData[field] || activityData[field].toString().trim() === '') {
            return {
                isValid: false,
                error: `Field ${field} harus diisi`
            };
        }
    }

    // Validasi jumlah (harus berupa angka positif)
    const amount = parseFloat(activityData.amount);
    if (isNaN(amount) || amount <= 0) {
        return {
            isValid: false,
            error: 'Jumlah harus berupa angka positif'
        };
    }

    // Validasi biaya (jika diisi, harus berupa angka non-negatif)
    if (activityData.cost && activityData.cost.toString().trim() !== '') {
        const cost = parseFloat(activityData.cost);
        if (isNaN(cost) || cost < 0) {
            return {
                isValid: false,
                error: 'Biaya harus berupa angka non-negatif'
            };
        }
    }

    // Validasi jenis aktivitas
    const validActivityTypes = ['waste', 'energy', 'water', 'carbon', 'recycling'];
    if (!validActivityTypes.includes(activityData.activityType)) {
        return {
            isValid: false,
            error: 'Jenis aktivitas tidak valid'
        };
    }

    // Validasi material type
    const validMaterialTypes = ['plastic', 'paper', 'metal', 'organic', 'electricity', 'water'];
    if (!validMaterialTypes.includes(activityData.materialType)) {
        return {
            isValid: false,
            error: 'Jenis material tidak valid'
        };
    }

    // Validasi aksi
    const validActions = ['recycled', 'reused', 'reduced', 'disposed', 'conserved'];
    if (!validActions.includes(activityData.action)) {
        return {
            isValid: false,
            error: 'Jenis aksi tidak valid'
        };
    }

    // Validasi unit
    const validUnits = ['kg', 'liter', 'kwh', 'piece', 'ton'];
    if (!validUnits.includes(activityData.unit)) {
        return {
            isValid: false,
            error: 'Unit tidak valid'
        };
    }

    // Validasi panjang catatan (maksimal 500 karakter)
    if (activityData.notes && activityData.notes.length > 500) {
        return {
            isValid: false,
            error: 'Catatan maksimal 500 karakter'
        };
    }

    return {
        isValid: true,
        error: null
    };
}

/**
 * Hitung nilai ekonomi aktivitas
 * @param {Object} activityData - Data aktivitas
 * @returns {number} - Nilai ekonomi dalam rupiah
 */
function calculateEconomicValue(activityData) {
    const amount = parseFloat(activityData.amount) || 0;
    const materialType = activityData.materialType;
    const action = activityData.action;
    
    const basePrices = {
        'plastic': 3000,
        'paper': 2000,
        'metal': 5000,
        'organic': 1500,
        'electricity': 1500,
        'water': 500
    };
    
    const actionMultipliers = {
        'recycled': 1.2,
        'reused': 1.1,
        'reduced': 0.8,
        'disposed': 0.5,
        'conserved': 1.5
    };
    
    const basePrice = basePrices[materialType] || 1000;
    const multiplier = actionMultipliers[action] || 1;
    
    return Math.round(amount * basePrice * multiplier);
}

/**
 * Hitung eco-score aktivitas
 * @param {Object} activityData - Data aktivitas
 * @returns {number} - Eco-score (0-100)
 */
function calculateEcoScore(activityData) {
    const action = activityData.action;
    const amount = parseFloat(activityData.amount) || 0;
    
    const actionScores = {
        'recycled': 15,
        'reused': 12,
        'reduced': 10,
        'conserved': 20,
        'disposed': -5
    };
    
    const baseScore = actionScores[action] || 5;
    const amountBonus = Math.min(amount * 0.1, 10);
    
    return Math.max(0, Math.min(100, baseScore + amountBonus));
}

/**
 * Hitung trend bulanan aktivitas
 * @param {Array} activities - Array aktivitas
 * @returns {Array} - Array trend bulanan
 */
function calculateMonthlyTrend(activities) {
    const monthlyData = {};
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    activities.forEach(activity => {
        const activityDate = activity.timestamp.toDate ? activity.timestamp.toDate() : new Date(activity.timestamp);
        if (activityDate >= sixMonthsAgo) {
            const monthKey = `${activityDate.getFullYear()}-${String(activityDate.getMonth() + 1).padStart(2, '0')}`;
            if (!monthlyData[monthKey]) {
                monthlyData[monthKey] = { count: 0, amount: 0, value: 0 };
            }
            monthlyData[monthKey].count++;
            monthlyData[monthKey].amount += activity.amount || 0;
            monthlyData[monthKey].value += activity.economicValue || 0;
        }
    });

    return Object.entries(monthlyData).map(([month, data]) => ({
        month,
        ...data
    })).sort((a, b) => a.month.localeCompare(b.month));
}

/**
 * Generate rekomendasi berdasarkan data aktivitas
 * @param {Array} activities - Array aktivitas
 * @param {Object} materialBreakdown - Breakdown material
 * @param {Object} actionBreakdown - Breakdown aksi
 * @returns {Array} - Array rekomendasi
 */
function generateRecommendations(activities, materialBreakdown, actionBreakdown) {
    const recommendations = [];

    // Rekomendasi berdasarkan material yang paling banyak
    const topMaterial = Object.entries(materialBreakdown)
        .sort(([,a], [,b]) => b.amount - a.amount)[0];
    
    if (topMaterial) {
        recommendations.push({
            type: 'material',
            priority: 'high',
            title: `Fokus pada ${topMaterial[0]}`,
            description: `Anda menggunakan ${topMaterial[0]} paling banyak. Pertimbangkan strategi daur ulang yang lebih efisien.`,
            action: 'Lihat strategi daur ulang'
        });
    }

    // Rekomendasi berdasarkan aksi
    const recycledCount = actionBreakdown.recycled?.count || 0;
    const totalCount = activities.length;
    const recycleRate = totalCount > 0 ? (recycledCount / totalCount) * 100 : 0;

    if (recycleRate < 50) {
        recommendations.push({
            type: 'action',
            priority: 'medium',
            title: 'Tingkatkan Tingkat Daur Ulang',
            description: `Tingkat daur ulang Anda ${recycleRate.toFixed(1)}%. Targetkan minimal 70% untuk eco-score yang lebih baik.`,
            action: 'Pelajari strategi daur ulang'
        });
    }

    // Rekomendasi berdasarkan frekuensi aktivitas
    const recentActivities = activities.filter(activity => {
        const activityDate = activity.timestamp.toDate ? activity.timestamp.toDate() : new Date(activity.timestamp);
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        return activityDate >= oneWeekAgo;
    });

    if (recentActivities.length < 3) {
        recommendations.push({
            type: 'frequency',
            priority: 'low',
            title: 'Tingkatkan Frekuensi Aktivitas',
            description: 'Coba catat aktivitas lingkungan lebih sering untuk tracking yang lebih baik.',
            action: 'Set reminder harian'
        });
    }

    return recommendations;
}

// =============================
// Export untuk penggunaan global
// =============================
window.firebaseActivityService = {
    saveActivityToFirestore,
    getActivitiesFromFirestore,
    getActivityStatsFromFirestore,
    updateActivityInFirestore,
    deleteActivityFromFirestore
};

console.log('✅ Firebase Activity Service loaded successfully');
