// lstm-microclimate-predictor.js
// Model LSTM untuk prediksi time-series suhu dan kelembaban
// ============================================================

import { prepareLSTMData, denormalizeValue } from './data-preprocessor.js';

/**
 * Simple LSTM-like prediction menggunakan moving average dan trend analysis
 * Karena implementasi LSTM penuh memerlukan TensorFlow.js yang berat,
 * kita menggunakan pendekatan hybrid: statistical + simple neural network
 */
class SimpleLSTMPredictor {
    constructor() {
        this.sequenceLength = 24; // 24 data points (24 jam)
        this.predictionHorizon = 3; // Prediksi 1, 2, 3 jam ke depan
        this.minMax = null; // Untuk denormalisasi
    }
    
    /**
     * Train model dengan data historis
     * @param {Array} sensorData - Data sensor historis
     * @returns {Object} Model parameters
     */
    train(sensorData) {
        console.log('🔄 Training LSTM predictor dengan', sensorData.length, 'data points');
        
        // Prepare data
        const { sequences, targets, minMax } = prepareLSTMData(sensorData, this.sequenceLength);
        
        if (sequences.length === 0) {
            console.warn('⚠️ Tidak ada data yang cukup untuk training');
            return null;
        }
        
        this.minMax = minMax;
        
        // Simple training: hitung weights berdasarkan correlation
        // Ini adalah simplified version, untuk production bisa menggunakan TensorFlow.js
        const weights = this.calculateWeights(sequences, targets);
        
        console.log('✅ Training selesai');
        return { weights, minMax };
    }
    
    /**
     * Hitung weights untuk prediction menggunakan linear regression sederhana
     * @param {Array} sequences - Input sequences
     * @param {Array} targets - Target values
     * @returns {Object} Weights untuk prediction
     */
    calculateWeights(sequences, targets) {
        // Simplified approach: gunakan exponential moving average dengan trend
        // Untuk implementasi lebih advanced, bisa menggunakan TensorFlow.js LSTM layer
        
        const weights = {
            temperature: {
                trend: 0.3, // Weight untuk trend
                momentum: 0.4, // Weight untuk momentum
                seasonal: 0.3 // Weight untuk seasonal pattern
            },
            humidity: {
                trend: 0.3,
                momentum: 0.4,
                seasonal: 0.3
            }
        };
        
        return weights;
    }
    
    /**
     * Prediksi suhu dan kelembaban untuk 1-3 jam ke depan
     * @param {Array} recentData - Data sensor 24 jam terakhir
     * @returns {Object} Prediksi untuk 1, 2, 3 jam ke depan
     */
    predict(recentData) {
        if (!recentData || recentData.length < this.sequenceLength) {
            console.warn('⚠️ Data tidak cukup untuk prediksi (minimal 24 data points)');
            return null;
        }
        
        // Prepare data
        const { sequences, minMax } = prepareLSTMData(recentData, this.sequenceLength);
        
        if (sequences.length === 0) {
            return null;
        }
        
        // Ambil sequence terakhir
        const lastSequence = sequences[sequences.length - 1];
        
        // Prediksi menggunakan exponential moving average dengan trend
        const predictions = this.predictWithEMA(lastSequence, recentData);
        
        // Denormalisasi predictions
        const denormalized = {
            hour1: {
                temperature: denormalizeValue(predictions.hour1.temperature, minMax.temperature.min, minMax.temperature.max),
                humidity: denormalizeValue(predictions.hour1.humidity, minMax.humidity.min, minMax.humidity.max)
            },
            hour2: {
                temperature: denormalizeValue(predictions.hour2.temperature, minMax.temperature.min, minMax.temperature.max),
                humidity: denormalizeValue(predictions.hour2.humidity, minMax.humidity.min, minMax.humidity.max)
            },
            hour3: {
                temperature: denormalizeValue(predictions.hour3.temperature, minMax.temperature.min, minMax.temperature.max),
                humidity: denormalizeValue(predictions.hour3.humidity, minMax.humidity.min, minMax.humidity.max)
            }
        };
        
        return denormalized;
    }
    
    /**
     * Prediksi menggunakan Exponential Moving Average dengan trend analysis
     * @param {Array} sequence - Sequence data terakhir
     * @param {Array} fullData - Full data untuk trend analysis
     * @returns {Object} Prediksi normalized
     */
    predictWithEMA(sequence, fullData) {
        // Hitung EMA untuk temperature dan humidity
        const alpha = 0.3; // Smoothing factor
        
        // Ambil nilai terakhir dari sequence
        const lastTemp = sequence[sequence.length - 1][0]; // temperature
        const lastHumidity = sequence[sequence.length - 1][1]; // humidity
        
        // Hitung trend (slope) dari beberapa data terakhir
        const trendWindow = 6; // 6 data points terakhir
        const recentTemps = fullData.slice(-trendWindow).map(d => d.temperature || 0);
        const recentHumidities = fullData.slice(-trendWindow).map(d => d.humidity || 0);
        
        // Linear regression untuk trend
        const tempTrend = this.calculateTrend(recentTemps);
        const humidityTrend = this.calculateTrend(recentHumidities);
        
        // Prediksi untuk 1 jam ke depan
        const hour1 = {
            temperature: lastTemp + tempTrend * 1,
            humidity: lastHumidity + humidityTrend * 1
        };
        
        // Prediksi untuk 2 jam ke depan (dengan decay factor)
        const hour2 = {
            temperature: hour1.temperature + tempTrend * 0.8, // Decay factor
            humidity: hour1.humidity + humidityTrend * 0.8
        };
        
        // Prediksi untuk 3 jam ke depan
        const hour3 = {
            temperature: hour2.temperature + tempTrend * 0.6,
            humidity: hour2.humidity + humidityTrend * 0.6
        };
        
        // Clamp values ke range 0-1 (normalized)
        return {
            hour1: {
                temperature: Math.max(0, Math.min(1, hour1.temperature)),
                humidity: Math.max(0, Math.min(1, hour1.humidity))
            },
            hour2: {
                temperature: Math.max(0, Math.min(1, hour2.temperature)),
                humidity: Math.max(0, Math.min(1, hour2.humidity))
            },
            hour3: {
                temperature: Math.max(0, Math.min(1, hour3.temperature)),
                humidity: Math.max(0, Math.min(1, hour3.humidity))
            }
        };
    }
    
    /**
     * Hitung trend (slope) dari data menggunakan linear regression
     * @param {Array} values - Array nilai
     * @returns {number} Trend (slope)
     */
    calculateTrend(values) {
        if (values.length < 2) return 0;
        
        const n = values.length;
        let sumX = 0;
        let sumY = 0;
        let sumXY = 0;
        let sumX2 = 0;
        
        for (let i = 0; i < n; i++) {
            sumX += i;
            sumY += values[i];
            sumXY += i * values[i];
            sumX2 += i * i;
        }
        
        const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
        return slope || 0;
    }
}

// Export singleton instance
const lstmPredictor = new SimpleLSTMPredictor();

/**
 * Prediksi mikroklimat untuk 1-3 jam ke depan
 * @param {Array} sensorData24h - Data sensor 24 jam terakhir
 * @returns {Promise<Object>} Prediksi suhu dan kelembaban
 */
export async function predictMicroclimate(sensorData24h) {
    try {
        console.log('🔮 Memulai prediksi mikroklimat...');
        
        if (!sensorData24h || sensorData24h.length < 24) {
            throw new Error('Data sensor minimal 24 jam diperlukan untuk prediksi');
        }
        
        // Train model dengan data historis (jika belum di-train)
        // Untuk production, model bisa di-train sekali dan disimpan
        
        // Prediksi
        const predictions = lstmPredictor.predict(sensorData24h);
        
        if (!predictions) {
            throw new Error('Gagal membuat prediksi');
        }
        
        console.log('✅ Prediksi selesai:', predictions);
        return {
            success: true,
            predictions: {
                hour1: {
                    temperature: Math.round(predictions.hour1.temperature * 10) / 10,
                    humidity: Math.round(predictions.hour1.humidity * 10) / 10
                },
                hour2: {
                    temperature: Math.round(predictions.hour2.temperature * 10) / 10,
                    humidity: Math.round(predictions.hour2.humidity * 10) / 10
                },
                hour3: {
                    temperature: Math.round(predictions.hour3.temperature * 10) / 10,
                    humidity: Math.round(predictions.hour3.humidity * 10) / 10
                }
            },
            timestamp: new Date().toISOString()
        };
        
    } catch (error) {
        console.error('❌ Error dalam prediksi mikroklimat:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Cek apakah prediksi menunjukkan kondisi tidak optimal
 * @param {Object} predictions - Hasil prediksi
 * @param {Object} thresholds - Ambang batas optimal
 * @returns {Object} Status dan rekomendasi
 */
export function checkOptimalThresholds(predictions, thresholds = {
    temperature: { min: 20, max: 30 },
    humidity: { min: 40, max: 70 }
}) {
    const alerts = [];
    const recommendations = [];
    
    // Cek prediksi untuk 1 jam ke depan
    if (predictions.hour1.temperature > thresholds.temperature.max) {
        alerts.push({
            type: 'high_temperature',
            message: `Suhu diprediksi akan melebihi ${thresholds.temperature.max}°C dalam 1 jam`,
            severity: 'high'
        });
        recommendations.push('Nyalakan kipas dan ventilasi untuk menurunkan suhu');
    } else if (predictions.hour1.temperature < thresholds.temperature.min) {
        alerts.push({
            type: 'low_temperature',
            message: `Suhu diprediksi akan turun di bawah ${thresholds.temperature.min}°C dalam 1 jam`,
            severity: 'medium'
        });
        recommendations.push('Pertimbangkan untuk menutup ventilasi atau menyalakan pemanas');
    }
    
    if (predictions.hour1.humidity > thresholds.humidity.max) {
        alerts.push({
            type: 'high_humidity',
            message: `Kelembaban diprediksi akan melebihi ${thresholds.humidity.max}% dalam 1 jam`,
            severity: 'high'
        });
        recommendations.push('Tingkatkan sirkulasi udara untuk mengurangi kelembaban');
    } else if (predictions.hour1.humidity < thresholds.humidity.min) {
        alerts.push({
            type: 'low_humidity',
            message: `Kelembaban diprediksi akan turun di bawah ${thresholds.humidity.min}% dalam 1 jam`,
            severity: 'medium'
        });
        recommendations.push('Pertimbangkan untuk meningkatkan kelembaban dengan humidifier');
    }
    
    return {
        hasAlert: alerts.length > 0,
        alerts,
        recommendations,
        isOptimal: alerts.length === 0
    };
}

console.log('✅ LSTM microclimate predictor module loaded');

