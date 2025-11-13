// random-forest-harvest-predictor.js
// Model Random Forest untuk prediksi hasil panen
// ============================================================

import { prepareHarvestData } from './data-preprocessor.js';
import { db } from '../../../config/firebase-init.js';
import { collection, addDoc, Timestamp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

/**
 * Simple Random Forest-like prediction menggunakan decision tree sederhana
 * Untuk implementasi penuh bisa menggunakan TensorFlow.js Decision Forest
 */
class SimpleHarvestPredictor {
    constructor() {
        // Model parameters (bisa di-load dari training)
        this.weights = {
            avgTemperature: 0.25,
            avgHumidity: 0.20,
            totalLightExposure: 0.30,
            totalWaterIrrigation: 0.15,
            cycleDuration: 0.10
        };
        
        // Base yield per plant type (kg)
        this.baseYield = {
            'sayur': {
                'Bayam': 2.5,
                'Kangkung': 3.0,
                'Sawi': 2.8,
                'Selada': 2.0,
                'Pakcoy': 2.5,
                'Cabai': 1.5,
                'Tomat': 3.5,
                'Terong': 2.0
            },
            'buah': {
                'Strawberry': 1.0,
                'Tomato': 4.0,
                'Cucumber': 3.5,
                'Pepaya': 15.0,
                'Melon': 5.0,
                'Semangka': 8.0
            }
        };
    }
    
    /**
     * Prediksi hasil panen berdasarkan data agregat siklus tanam
     * @param {Object} cycleData - Data agregat selama siklus tanam
     * @returns {number} Estimasi hasil panen dalam kg
     */
    predict(cycleData) {
        try {
            const {
                avgTemperature = 25,
                avgHumidity = 60,
                totalLightExposure = 1000,
                totalWaterIrrigation = 500,
                cycleDuration = 30,
                plantType = 'sayur',
                plantName = 'Bayam',
                numberOfPlants = 10
            } = cycleData;
            
            // Base yield untuk jenis tanaman
            const baseYieldPerPlant = this.baseYield[plantType]?.[plantName] || 2.0;
            
            // Hitung faktor optimalitas untuk setiap fitur
            const tempOptimality = this.calculateTemperatureOptimality(avgTemperature, plantName);
            const humidityOptimality = this.calculateHumidityOptimality(avgHumidity, plantName);
            const lightOptimality = this.calculateLightOptimality(totalLightExposure, cycleDuration);
            const waterOptimality = this.calculateWaterOptimality(totalWaterIrrigation, cycleDuration);
            
            // Weighted average dari semua faktor
            const overallOptimality = 
                tempOptimality * this.weights.avgTemperature +
                humidityOptimality * this.weights.avgHumidity +
                lightOptimality * this.weights.totalLightExposure +
                waterOptimality * this.weights.totalWaterIrrigation +
                (cycleDuration >= 30 ? 1.0 : cycleDuration / 30) * this.weights.cycleDuration;
            
            // Prediksi yield per tanaman
            const predictedYieldPerPlant = baseYieldPerPlant * overallOptimality;
            
            // Total yield untuk semua tanaman
            const totalYield = predictedYieldPerPlant * numberOfPlants;
            
            return {
                yieldPerPlant: Math.round(predictedYieldPerPlant * 10) / 10,
                totalYield: Math.round(totalYield * 10) / 10,
                optimality: Math.round(overallOptimality * 100),
                factors: {
                    temperature: Math.round(tempOptimality * 100),
                    humidity: Math.round(humidityOptimality * 100),
                    light: Math.round(lightOptimality * 100),
                    water: Math.round(waterOptimality * 100)
                }
            };
            
        } catch (error) {
            console.error('❌ Error dalam prediksi hasil panen:', error);
            return null;
        }
    }
    
    /**
     * Hitung optimalitas suhu untuk jenis tanaman
     * @param {number} temperature - Rata-rata suhu
     * @param {string} plantName - Nama tanaman
     * @returns {number} Optimality score (0-1)
     */
    calculateTemperatureOptimality(temperature, plantName) {
        // Optimal temperature ranges untuk berbagai tanaman
        const optimalRanges = {
            'Bayam': { min: 15, max: 25, optimal: 20 },
            'Kangkung': { min: 20, max: 30, optimal: 25 },
            'Tomat': { min: 18, max: 28, optimal: 23 },
            'Cabai': { min: 20, max: 30, optimal: 25 },
            'Strawberry': { min: 15, max: 22, optimal: 18 }
        };
        
        const range = optimalRanges[plantName] || { min: 18, max: 28, optimal: 23 };
        
        if (temperature >= range.min && temperature <= range.max) {
            // Optimal range: score berdasarkan jarak dari optimal
            const distanceFromOptimal = Math.abs(temperature - range.optimal);
            const maxDistance = Math.max(range.optimal - range.min, range.max - range.optimal);
            return 1 - (distanceFromOptimal / maxDistance) * 0.5; // Max 50% reduction
        } else {
            // Outside range: score menurun drastis
            const distance = temperature < range.min 
                ? range.min - temperature 
                : temperature - range.max;
            return Math.max(0, 1 - distance * 0.1);
        }
    }
    
    /**
     * Hitung optimalitas kelembaban
     * @param {number} humidity - Rata-rata kelembaban
     * @returns {number} Optimality score (0-1)
     */
    calculateHumidityOptimality(humidity) {
        const optimal = 60;
        const range = 20; // ±20% dari optimal
        
        if (humidity >= 40 && humidity <= 80) {
            const distance = Math.abs(humidity - optimal);
            return 1 - (distance / range) * 0.3;
        } else {
            return Math.max(0, 0.5 - Math.abs(humidity - optimal) * 0.01);
        }
    }
    
    /**
     * Hitung optimalitas paparan cahaya
     * @param {number} totalLight - Total paparan cahaya
     * @param {number} cycleDuration - Durasi siklus (hari)
     * @returns {number} Optimality score (0-1)
     */
    calculateLightOptimality(totalLight, cycleDuration) {
        // Optimal light exposure per hari: 8-12 hours
        const avgLightPerDay = totalLight / cycleDuration;
        const optimalPerDay = 10; // hours
        
        if (avgLightPerDay >= 6 && avgLightPerDay <= 14) {
            const distance = Math.abs(avgLightPerDay - optimalPerDay);
            return 1 - (distance / 4) * 0.2;
        } else {
            return Math.max(0, 0.6 - Math.abs(avgLightPerDay - optimalPerDay) * 0.05);
        }
    }
    
    /**
     * Hitung optimalitas air irigasi
     * @param {number} totalWater - Total air irigasi (liter)
     * @param {number} cycleDuration - Durasi siklus (hari)
     * @returns {number} Optimality score (0-1)
     */
    calculateWaterOptimality(totalWater, cycleDuration) {
        // Optimal water per hari: 1-2 liter per tanaman
        const avgWaterPerDay = totalWater / cycleDuration;
        const optimalPerDay = 1.5; // liters
        
        if (avgWaterPerDay >= 0.8 && avgWaterPerDay <= 2.5) {
            const distance = Math.abs(avgWaterPerDay - optimalPerDay);
            return 1 - (distance / 0.85) * 0.2;
        } else {
            return Math.max(0, 0.5 - Math.abs(avgWaterPerDay - optimalPerDay) * 0.1);
        }
    }
}

// Export singleton instance
const harvestPredictor = new SimpleHarvestPredictor();

/**
 * Prediksi hasil panen untuk siklus tanam
 * @param {Object} cycleData - Data agregat selama siklus tanam
 * @returns {Promise<Object>} Prediksi hasil panen
 */
export async function predictHarvestYield(cycleData) {
    try {
        console.log('🌾 Memulai prediksi hasil panen...');
        
        const prediction = harvestPredictor.predict(cycleData);
        
        if (!prediction) {
            throw new Error('Gagal membuat prediksi hasil panen');
        }
        
        // Simpan prediksi ke Firestore
        if (cycleData.greenhouseId) {
            await saveHarvestPrediction(cycleData.greenhouseId, cycleData, prediction);
        }
        
        console.log('✅ Prediksi hasil panen selesai:', prediction);
        return {
            success: true,
            prediction: prediction,
            timestamp: new Date().toISOString()
        };
        
    } catch (error) {
        console.error('❌ Error dalam prediksi hasil panen:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Simpan prediksi hasil panen ke Firestore
 * @param {string} greenhouseId - ID greenhouse
 * @param {Object} cycleData - Data siklus tanam
 * @param {Object} prediction - Hasil prediksi
 */
async function saveHarvestPrediction(greenhouseId, cycleData, prediction) {
    try {
        const predictionData = {
            greenhouseId: greenhouseId,
            plantType: cycleData.plantType,
            plantName: cycleData.plantName,
            numberOfPlants: cycleData.numberOfPlants,
            cycleDuration: cycleData.cycleDuration,
            predictedYield: prediction.totalYield,
            yieldPerPlant: prediction.yieldPerPlant,
            optimality: prediction.optimality,
            factors: prediction.factors,
            timestamp: Timestamp.now(),
            createdAt: Timestamp.now()
        };
        
        await addDoc(collection(db, 'harvest_predictions'), predictionData);
        console.log('✅ Prediksi hasil panen disimpan ke Firestore');
    } catch (error) {
        console.error('❌ Error menyimpan prediksi hasil panen:', error);
    }
}

console.log('✅ Random Forest harvest predictor module loaded');

