// ai-model-service.js
// Service untuk koordinasi semua model AI dan menyediakan API terpadu
// ============================================================

import { predictMicroclimate, checkOptimalThresholds } from './lstm-microclimate-predictor.js';
import { getHistoricalSensorData } from '../../greenhouse/greenhouse-service.js';
import { db } from '../../../config/firebase-init.js';
import { collection, addDoc, Timestamp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

/**
 * Prediksi mikroklimat dan generate rekomendasi proaktif
 * @param {string} greenhouseId - ID greenhouse
 * @param {Object} thresholds - Ambang batas optimal (opsional)
 * @returns {Promise<Object>} Prediksi dan rekomendasi
 */
export async function getMicroclimatePrediction(greenhouseId, thresholds = null) {
    try {
        console.log('🔮 Memulai prediksi mikroklimat untuk greenhouse:', greenhouseId);
        
        // Ambil data sensor 24 jam terakhir
        const historicalData = await getHistoricalSensorData(greenhouseId, 24);
        
        if (!historicalData.success || historicalData.data.length < 24) {
            return {
                success: false,
                error: 'Data sensor tidak cukup untuk prediksi (minimal 24 data points)',
                data: null
            };
        }
        
        // Prediksi menggunakan LSTM
        const prediction = await predictMicroclimate(historicalData.data);
        
        if (!prediction.success) {
            return prediction;
        }
        
        // Cek ambang batas optimal
        const defaultThresholds = thresholds || {
            temperature: { min: 20, max: 30 },
            humidity: { min: 40, max: 70 }
        };
        
        const thresholdCheck = checkOptimalThresholds(prediction.predictions, defaultThresholds);
        
        // Simpan prediksi ke Firestore
        await savePredictionToFirestore(greenhouseId, prediction, thresholdCheck);
        
        // Generate rekomendasi proaktif jika diperlukan
        if (thresholdCheck.hasAlert) {
            await generateProactiveRecommendation(greenhouseId, thresholdCheck);
        }
        
        return {
            success: true,
            predictions: prediction.predictions,
            thresholdCheck,
            timestamp: prediction.timestamp
        };
        
    } catch (error) {
        console.error('❌ Error dalam getMicroclimatePrediction:', error);
        return {
            success: false,
            error: error.message,
            data: null
        };
    }
}

/**
 * Simpan prediksi ke Firestore
 * @param {string} greenhouseId - ID greenhouse
 * @param {Object} prediction - Hasil prediksi
 * @param {Object} thresholdCheck - Hasil pengecekan ambang batas
 */
async function savePredictionToFirestore(greenhouseId, prediction, thresholdCheck) {
    try {
        const predictionData = {
            greenhouseId: greenhouseId,
            predictions: prediction.predictions,
            hasAlert: thresholdCheck.hasAlert,
            isOptimal: thresholdCheck.isOptimal,
            alerts: thresholdCheck.alerts,
            recommendations: thresholdCheck.recommendations,
            timestamp: Timestamp.now(),
            createdAt: Timestamp.now()
        };
        
        await addDoc(collection(db, 'ai_predictions'), predictionData);
        console.log('✅ Prediksi disimpan ke Firestore');
    } catch (error) {
        console.error('❌ Error menyimpan prediksi:', error);
    }
}

/**
 * Generate rekomendasi proaktif dan simpan ke Firestore
 * @param {string} greenhouseId - ID greenhouse
 * @param {Object} thresholdCheck - Hasil pengecekan ambang batas
 */
async function generateProactiveRecommendation(greenhouseId, thresholdCheck) {
    try {
        const recommendation = {
            greenhouseId: greenhouseId,
            type: 'proactive',
            priority: thresholdCheck.alerts.some(a => a.severity === 'high') ? 'high' : 'medium',
            alerts: thresholdCheck.alerts,
            recommendations: thresholdCheck.recommendations,
            actionRequired: true,
            timestamp: Timestamp.now(),
            createdAt: Timestamp.now()
        };
        
        await addDoc(collection(db, 'ai_recommendations'), recommendation);
        console.log('✅ Rekomendasi proaktif disimpan');
    } catch (error) {
        console.error('❌ Error menyimpan rekomendasi:', error);
    }
}

/**
 * Get latest prediction untuk greenhouse
 * @param {string} greenhouseId - ID greenhouse
 * @returns {Promise<Object>} Latest prediction
 */
export async function getLatestPrediction(greenhouseId) {
    try {
        const { collection, query, where, orderBy, limit, getDocs } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
        
        const q = query(
            collection(db, 'ai_predictions'),
            where('greenhouseId', '==', greenhouseId),
            orderBy('timestamp', 'desc'),
            limit(1)
        );
        
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
            return { success: true, data: null };
        }
        
        const docData = querySnapshot.docs[0].data();
        return {
            success: true,
            data: {
                id: querySnapshot.docs[0].id,
                ...docData,
                timestamp: docData.timestamp?.toDate() || null
            }
        };
    } catch (error) {
        console.error('❌ Error getting latest prediction:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Get latest recommendations untuk greenhouse
 * @param {string} greenhouseId - ID greenhouse
 * @param {number} limitCount - Jumlah rekomendasi (default: 5)
 * @returns {Promise<Object>} Latest recommendations
 */
export async function getLatestRecommendations(greenhouseId, limitCount = 5) {
    try {
        const { collection, query, where, orderBy, limit, getDocs } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
        
        const q = query(
            collection(db, 'ai_recommendations'),
            where('greenhouseId', '==', greenhouseId),
            where('actionRequired', '==', true),
            orderBy('timestamp', 'desc'),
            limit(limitCount)
        );
        
        const querySnapshot = await getDocs(q);
        const recommendations = [];
        
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            recommendations.push({
                id: doc.id,
                ...data,
                timestamp: data.timestamp?.toDate() || null
            });
        });
        
        return {
            success: true,
            data: recommendations,
            count: recommendations.length
        };
    } catch (error) {
        console.error('❌ Error getting recommendations:', error);
        return { success: false, error: error.message, data: [] };
    }
}

console.log('✅ AI Model Service module loaded');

