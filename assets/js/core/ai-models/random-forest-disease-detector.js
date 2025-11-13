// random-forest-disease-detector.js
// Model Random Forest untuk deteksi risiko penyakit
// ============================================================

import { prepareDiseaseRiskData } from './data-preprocessor.js';
import { db } from '../../../config/firebase-init.js';
import { collection, addDoc, Timestamp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

/**
 * Simple Random Forest-like classifier untuk deteksi risiko penyakit
 * Menggunakan decision rules berdasarkan pola mikroklimat
 */
class SimpleDiseaseDetector {
    constructor() {
        // Disease patterns (bisa di-expand dengan training data)
        this.diseasePatterns = {
            'fungal_disease': {
                // Jamur: kelembaban tinggi > 90% untuk waktu lama
                conditions: {
                    highHumidityDuration: 6, // jam
                    avgHumidity: 90,
                    temperature: { min: 20, max: 30 }
                },
                riskLevel: 'high'
            },
            'bacterial_disease': {
                // Bakteri: kelembaban tinggi + suhu tinggi
                conditions: {
                    avgHumidity: 85,
                    avgTemperature: 28,
                    highHumidityDuration: 4
                },
                riskLevel: 'high'
            },
            'pest_infestation': {
                // Hama: kondisi tidak optimal berkepanjangan
                conditions: {
                    avgTemperature: { min: 15, max: 35 },
                    humidityVariation: 30, // Variasi besar
                    lowTempDuration: 4
                },
                riskLevel: 'medium'
            }
        };
    }
    
    /**
     * Deteksi risiko penyakit berdasarkan pola mikroklimat
     * @param {Array} sensorData - Data sensor dengan pola mikroklimat
     * @returns {Object} Hasil deteksi risiko
     */
    detectRisk(sensorData) {
        try {
            if (!sensorData || sensorData.length < 6) {
                return {
                    riskLevel: 'low',
                    confidence: 0.5,
                    diseases: [],
                    message: 'Data tidak cukup untuk analisis risiko'
                };
            }
            
            // Prepare data untuk analisis
            const { features } = prepareDiseaseRiskData(sensorData);
            
            if (features.length === 0) {
                return {
                    riskLevel: 'low',
                    confidence: 0.5,
                    diseases: []
                };
            }
            
            // Analisis setiap window
            const detectedDiseases = [];
            let maxRiskLevel = 'low';
            let totalRiskScore = 0;
            
            features.forEach((feature, index) => {
                // Cek setiap pola penyakit
                for (const [diseaseName, pattern] of Object.entries(this.diseasePatterns)) {
                    const match = this.checkDiseasePattern(feature, pattern);
                    if (match.matched) {
                        detectedDiseases.push({
                            disease: diseaseName,
                            riskLevel: pattern.riskLevel,
                            confidence: match.confidence,
                            windowIndex: index
                        });
                        
                        // Update max risk level
                        if (pattern.riskLevel === 'high' && maxRiskLevel !== 'high') {
                            maxRiskLevel = 'high';
                        } else if (pattern.riskLevel === 'medium' && maxRiskLevel === 'low') {
                            maxRiskLevel = 'medium';
                        }
                        
                        totalRiskScore += match.confidence;
                    }
                }
            });
            
            // Hitung overall risk
            const avgRiskScore = detectedDiseases.length > 0 
                ? totalRiskScore / detectedDiseases.length 
                : 0;
            
            // Tentukan overall risk level
            let overallRiskLevel = 'low';
            if (maxRiskLevel === 'high' || avgRiskScore > 0.7) {
                overallRiskLevel = 'high';
            } else if (maxRiskLevel === 'medium' || avgRiskScore > 0.5) {
                overallRiskLevel = 'medium';
            }
            
            // Generate recommendations
            const recommendations = this.generateRecommendations(overallRiskLevel, detectedDiseases);
            
            return {
                riskLevel: overallRiskLevel,
                confidence: Math.round(avgRiskScore * 100),
                diseases: detectedDiseases,
                recommendations: recommendations,
                message: this.getRiskMessage(overallRiskLevel, detectedDiseases)
            };
            
        } catch (error) {
            console.error('❌ Error dalam deteksi risiko penyakit:', error);
            return {
                riskLevel: 'low',
                confidence: 0,
                diseases: [],
                error: error.message
            };
        }
    }
    
    /**
     * Cek apakah feature match dengan pola penyakit
     * @param {Object} feature - Feature dari data sensor
     * @param {Object} pattern - Pola penyakit yang dicek
     * @returns {Object} {matched: boolean, confidence: number}
     */
    checkDiseasePattern(feature, pattern) {
        const conditions = pattern.conditions;
        let matchedConditions = 0;
        let totalConditions = 0;
        
        // Cek high humidity duration
        if (conditions.highHumidityDuration !== undefined) {
            totalConditions++;
            if (feature.highHumidityDuration >= conditions.highHumidityDuration) {
                matchedConditions++;
            }
        }
        
        // Cek average humidity
        if (conditions.avgHumidity !== undefined) {
            totalConditions++;
            if (feature.avgHumidity >= conditions.avgHumidity) {
                matchedConditions++;
            }
        }
        
        // Cek average temperature
        if (conditions.avgTemperature !== undefined) {
            totalConditions++;
            if (typeof conditions.avgTemperature === 'object') {
                if (feature.avgTemperature >= conditions.avgTemperature.min && 
                    feature.avgTemperature <= conditions.avgTemperature.max) {
                    matchedConditions++;
                }
            } else {
                if (feature.avgTemperature >= conditions.avgTemperature) {
                    matchedConditions++;
                }
            }
        }
        
        // Cek temperature range
        if (conditions.temperature !== undefined && typeof conditions.temperature === 'object') {
            totalConditions++;
            if (feature.avgTemperature >= conditions.temperature.min && 
                feature.avgTemperature <= conditions.temperature.max) {
                matchedConditions++;
            }
        }
        
        // Cek humidity variation
        if (conditions.humidityVariation !== undefined) {
            totalConditions++;
            if (feature.humidityVariation >= conditions.humidityVariation) {
                matchedConditions++;
            }
        }
        
        // Cek low temp duration
        if (conditions.lowTempDuration !== undefined) {
            totalConditions++;
            if (feature.lowTempDuration >= conditions.lowTempDuration) {
                matchedConditions++;
            }
        }
        
        const confidence = totalConditions > 0 ? matchedConditions / totalConditions : 0;
        const matched = confidence >= 0.6; // Minimal 60% conditions harus match
        
        return { matched, confidence };
    }
    
    /**
     * Generate rekomendasi berdasarkan risiko yang terdeteksi
     * @param {string} riskLevel - Level risiko
     * @param {Array} diseases - Daftar penyakit yang terdeteksi
     * @returns {Array} Array rekomendasi
     */
    generateRecommendations(riskLevel, diseases) {
        const recommendations = [];
        
        if (riskLevel === 'high') {
            recommendations.push('Segera tingkatkan sirkulasi udara di greenhouse');
            recommendations.push('Kurangi kelembaban dengan membuka ventilasi');
            recommendations.push('Pertimbangkan penggunaan fungisida preventif');
            recommendations.push('Monitor tanaman secara ketat untuk gejala penyakit');
        } else if (riskLevel === 'medium') {
            recommendations.push('Tingkatkan monitoring kondisi mikroklimat');
            recommendations.push('Pastikan sirkulasi udara cukup');
            recommendations.push('Hindari penyiraman berlebihan');
        } else {
            recommendations.push('Kondisi mikroklimat dalam batas normal');
            recommendations.push('Lanjutkan monitoring rutin');
        }
        
        // Specific recommendations berdasarkan jenis penyakit
        diseases.forEach(disease => {
            if (disease.disease === 'fungal_disease') {
                recommendations.push('Risiko jamur tinggi - kurangi kelembaban dan tingkatkan sirkulasi');
            } else if (disease.disease === 'bacterial_disease') {
                recommendations.push('Risiko bakteri tinggi - hindari kondisi lembab dan panas');
            } else if (disease.disease === 'pest_infestation') {
                recommendations.push('Kondisi tidak optimal dapat menarik hama - stabilkan lingkungan');
            }
        });
        
        return [...new Set(recommendations)]; // Remove duplicates
    }
    
    /**
     * Get risk message untuk user
     * @param {string} riskLevel - Level risiko
     * @param {Array} diseases - Daftar penyakit
     * @returns {string} Message
     */
    getRiskMessage(riskLevel, diseases) {
        if (riskLevel === 'high') {
            return `Risiko TINGGI terdeteksi. ${diseases.length} jenis penyakit potensial teridentifikasi. Tindakan segera diperlukan.`;
        } else if (riskLevel === 'medium') {
            return `Risiko SEDANG terdeteksi. Perlu peningkatan monitoring dan tindakan preventif.`;
        } else {
            return `Risiko RENDAH. Kondisi mikroklimat dalam batas normal.`;
        }
    }
}

// Export singleton instance
const diseaseDetector = new SimpleDiseaseDetector();

/**
 * Deteksi risiko penyakit berdasarkan data sensor
 * @param {Array} sensorData - Data sensor dengan pola mikroklimat
 * @returns {Promise<Object>} Hasil deteksi risiko
 */
export async function detectDiseaseRisk(sensorData) {
    try {
        console.log('🔍 Memulai deteksi risiko penyakit...');
        
        const detection = diseaseDetector.detectRisk(sensorData);
        
        // Simpan alert ke Firestore jika risiko tinggi atau sedang
        if (detection.riskLevel !== 'low' && sensorData[0]?.greenhouseId) {
            await saveDiseaseRiskAlert(sensorData[0].greenhouseId, detection);
        }
        
        console.log('✅ Deteksi risiko penyakit selesai:', detection);
        return {
            success: true,
            detection: detection,
            timestamp: new Date().toISOString()
        };
        
    } catch (error) {
        console.error('❌ Error dalam deteksi risiko penyakit:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Simpan alert risiko penyakit ke Firestore
 * @param {string} greenhouseId - ID greenhouse
 * @param {Object} detection - Hasil deteksi
 */
async function saveDiseaseRiskAlert(greenhouseId, detection) {
    try {
        const alertData = {
            greenhouseId: greenhouseId,
            riskLevel: detection.riskLevel,
            confidence: detection.confidence,
            diseases: detection.diseases,
            recommendations: detection.recommendations,
            message: detection.message,
            timestamp: Timestamp.now(),
            createdAt: Timestamp.now(),
            acknowledged: false
        };
        
        await addDoc(collection(db, 'disease_risk_alerts'), alertData);
        console.log('✅ Alert risiko penyakit disimpan ke Firestore');
    } catch (error) {
        console.error('❌ Error menyimpan alert risiko penyakit:', error);
    }
}

console.log('✅ Random Forest disease detector module loaded');

