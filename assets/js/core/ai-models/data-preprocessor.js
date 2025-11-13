// data-preprocessor.js
// Service untuk preprocessing data sensor sebelum digunakan oleh model AI
// ============================================================

/**
 * Normalisasi data sensor ke range 0-1
 * @param {number} value - Nilai yang akan dinormalisasi
 * @param {number} min - Nilai minimum dari range
 * @param {number} max - Nilai maksimum dari range
 * @returns {number} Nilai yang sudah dinormalisasi (0-1)
 */
export function normalizeValue(value, min, max) {
    if (max === min) return 0.5; // Avoid division by zero
    return (value - min) / (max - min);
}

/**
 * Denormalisasi nilai dari range 0-1 ke range asli
 * @param {number} normalizedValue - Nilai yang sudah dinormalisasi (0-1)
 * @param {number} min - Nilai minimum dari range asli
 * @param {number} max - Nilai maksimum dari range asli
 * @returns {number} Nilai yang sudah didenormalisasi
 */
export function denormalizeValue(normalizedValue, min, max) {
    return normalizedValue * (max - min) + min;
}

/**
 * Menangani missing values dalam data sensor
 * Menggunakan forward fill (mengisi dengan nilai sebelumnya) atau mean imputation
 * @param {Array} dataArray - Array data sensor
 * @param {string} strategy - Strategi: 'forward' atau 'mean'
 * @returns {Array} Array data yang sudah diisi missing values
 */
export function handleMissingValues(dataArray, strategy = 'forward') {
    if (!dataArray || dataArray.length === 0) return [];
    
    const processed = [...dataArray];
    
    if (strategy === 'forward') {
        // Forward fill: isi dengan nilai sebelumnya
        for (let i = 1; i < processed.length; i++) {
            if (processed[i] === null || processed[i] === undefined || isNaN(processed[i])) {
                processed[i] = processed[i - 1];
            }
        }
        // Handle first value jika null
        if (processed[0] === null || processed[0] === undefined || isNaN(processed[0])) {
            processed[0] = processed.find(v => v !== null && v !== undefined && !isNaN(v)) || 0;
        }
    } else if (strategy === 'mean') {
        // Mean imputation: isi dengan rata-rata
        const validValues = processed.filter(v => v !== null && v !== undefined && !isNaN(v));
        const mean = validValues.length > 0 
            ? validValues.reduce((a, b) => a + b, 0) / validValues.length 
            : 0;
        
        for (let i = 0; i < processed.length; i++) {
            if (processed[i] === null || processed[i] === undefined || isNaN(processed[i])) {
                processed[i] = mean;
            }
        }
    }
    
    return processed;
}

/**
 * Membuat sequence data untuk LSTM (time-series)
 * Mengubah array data menjadi sequences dengan window size tertentu
 * @param {Array} data - Array data sensor
 * @param {number} windowSize - Ukuran window (jumlah timesteps)
 * @param {number} stepSize - Step size untuk sliding window (default: 1)
 * @returns {Array} Array of sequences untuk training LSTM
 */
export function createSequences(data, windowSize, stepSize = 1) {
    if (!data || data.length < windowSize) {
        console.warn('Data tidak cukup untuk membuat sequences');
        return [];
    }
    
    const sequences = [];
    for (let i = 0; i <= data.length - windowSize; i += stepSize) {
        sequences.push(data.slice(i, i + windowSize));
    }
    
    return sequences;
}

/**
 * Normalisasi array data sensor
 * @param {Array} dataArray - Array data sensor
 * @param {Object} minMax - Object dengan min dan max untuk setiap sensor
 * @returns {Object} {normalized: Array, minMax: Object} - Data yang sudah dinormalisasi dan minMax values
 */
export function normalizeSensorData(dataArray, minMax = null) {
    if (!dataArray || dataArray.length === 0) return { normalized: [], minMax: {} };
    
    // Hitung min dan max jika tidak diberikan
    if (!minMax) {
        minMax = {
            temperature: { min: Math.min(...dataArray.map(d => d.temperature || 0)), max: Math.max(...dataArray.map(d => d.temperature || 0)) },
            humidity: { min: Math.min(...dataArray.map(d => d.humidity || 0)), max: Math.max(...dataArray.map(d => d.humidity || 0)) },
            lightLevel: { min: Math.min(...dataArray.map(d => d.lightLevel || 0)), max: Math.max(...dataArray.map(d => d.lightLevel || 0)) },
            soilMoisture: { min: Math.min(...dataArray.map(d => d.soilMoisture || 0)), max: Math.max(...dataArray.map(d => d.soilMoisture || 0)) }
        };
    }
    
    // Normalisasi setiap data point
    const normalized = dataArray.map(data => ({
        temperature: normalizeValue(data.temperature || 0, minMax.temperature.min, minMax.temperature.max),
        humidity: normalizeValue(data.humidity || 0, minMax.humidity.min, minMax.humidity.max),
        lightLevel: normalizeValue(data.lightLevel || 0, minMax.lightLevel.min, minMax.lightLevel.max),
        soilMoisture: normalizeValue(data.soilMoisture || 0, minMax.soilMoisture.min, minMax.soilMoisture.max),
        timestamp: data.timestamp
    }));
    
    return { normalized, minMax };
}

/**
 * Feature engineering: menambahkan fitur tambahan dari data sensor
 * @param {Array} sensorData - Array data sensor
 * @returns {Array} Array data dengan fitur tambahan
 */
export function engineerFeatures(sensorData) {
    if (!sensorData || sensorData.length === 0) return [];
    
    return sensorData.map((data, index) => {
        const features = { ...data };
        
        // Moving average (3 points)
        if (index >= 2) {
            features.tempMA3 = (sensorData[index - 2].temperature + 
                               sensorData[index - 1].temperature + 
                               data.temperature) / 3;
            features.humidityMA3 = (sensorData[index - 2].humidity + 
                                   sensorData[index - 1].humidity + 
                                   data.humidity) / 3;
        }
        
        // Rate of change (derivative)
        if (index > 0) {
            features.tempChange = data.temperature - sensorData[index - 1].temperature;
            features.humidityChange = data.humidity - sensorData[index - 1].humidity;
        }
        
        // Time-based features
        if (data.timestamp) {
            const date = new Date(data.timestamp);
            features.hour = date.getHours();
            features.dayOfWeek = date.getDay();
            features.isDaytime = date.getHours() >= 6 && date.getHours() < 18;
        }
        
        // Interaction features
        features.tempHumidityRatio = data.temperature / (data.humidity + 1); // +1 to avoid division by zero
        features.comfortIndex = (data.temperature + data.humidity) / 2;
        
        return features;
    });
}

/**
 * Prepare data untuk LSTM model
 * Mengubah data sensor menjadi format yang siap untuk LSTM
 * @param {Array} sensorData - Array data sensor historis (24 jam terakhir)
 * @param {number} sequenceLength - Panjang sequence untuk LSTM (default: 24 untuk 24 jam)
 * @returns {Object} {sequences: Array, targets: Array, minMax: Object} - Data yang siap untuk training/prediction
 */
export function prepareLSTMData(sensorData, sequenceLength = 24) {
    if (!sensorData || sensorData.length < sequenceLength) {
        console.warn('Data sensor tidak cukup untuk LSTM (minimal 24 data points)');
        return { sequences: [], targets: [], minMax: null };
    }
    
    // Handle missing values
    const processedData = handleMissingValues(sensorData.map(d => ({
        temperature: d.temperature || 0,
        humidity: d.humidity || 0,
        lightLevel: d.lightLevel || 0,
        soilMoisture: d.soilMoisture || 0,
        timestamp: d.timestamp
    })));
    
    // Feature engineering
    const featuresData = engineerFeatures(processedData);
    
    // Normalisasi
    const { normalized, minMax } = normalizeSensorData(featuresData);
    
    // Buat sequences untuk LSTM
    // Input: sequenceLength data points
    // Output: 1-3 jam ke depan (3 data points untuk 1, 2, 3 jam)
    const sequences = [];
    const targets = [];
    
    for (let i = 0; i <= normalized.length - sequenceLength - 3; i++) {
        // Input sequence
        const sequence = normalized.slice(i, i + sequenceLength).map(d => [
            d.temperature,
            d.humidity,
            d.lightLevel,
            d.soilMoisture
        ]);
        
        // Target: 1, 2, 3 jam ke depan
        const target = [
            normalized[i + sequenceLength].temperature,
            normalized[i + sequenceLength].humidity,
            normalized[i + sequenceLength + 1]?.temperature || normalized[i + sequenceLength].temperature,
            normalized[i + sequenceLength + 1]?.humidity || normalized[i + sequenceLength].humidity,
            normalized[i + sequenceLength + 2]?.temperature || normalized[i + sequenceLength].temperature,
            normalized[i + sequenceLength + 2]?.humidity || normalized[i + sequenceLength].humidity
        ];
        
        sequences.push(sequence);
        targets.push(target);
    }
    
    return { sequences, targets, minMax };
}

/**
 * Prepare data untuk Random Forest (harvest prediction)
 * Agregasi data harian selama siklus tanam
 * @param {Array} dailyData - Array data harian selama siklus tanam
 * @returns {Object} {features: Array, labels: Array} - Features dan labels untuk training
 */
export function prepareHarvestData(dailyData) {
    if (!dailyData || dailyData.length === 0) return { features: [], labels: [] };
    
    const features = dailyData.map(day => ({
        avgTemperature: day.avgTemperature || 0,
        avgHumidity: day.avgHumidity || 0,
        totalLightExposure: day.totalLightExposure || 0,
        totalWaterIrrigation: day.totalWaterIrrigation || 0,
        cycleDuration: day.cycleDuration || 0,
        plantType: day.plantType || 'unknown'
    }));
    
    const labels = dailyData.map(day => day.harvestYield || 0);
    
    return { features, labels };
}

/**
 * Prepare data untuk Random Forest (disease risk detection)
 * Analisis pola mikroklimat untuk deteksi risiko penyakit
 * @param {Array} sensorData - Array data sensor dengan pola mikroklimat
 * @returns {Object} {features: Array, riskLevels: Array} - Features dan risk levels
 */
export function prepareDiseaseRiskData(sensorData) {
    if (!sensorData || sensorData.length === 0) return { features: [], riskLevels: [] };
    
    const features = [];
    const riskLevels = [];
    
    // Analisis setiap window 6 jam
    const windowSize = 6;
    for (let i = 0; i <= sensorData.length - windowSize; i++) {
        const window = sensorData.slice(i, i + windowSize);
        
        // Hitung statistik untuk window ini
        const avgHumidity = window.reduce((sum, d) => sum + (d.humidity || 0), 0) / window.length;
        const avgTemperature = window.reduce((sum, d) => sum + (d.temperature || 0), 0) / window.length;
        const maxHumidity = Math.max(...window.map(d => d.humidity || 0));
        const minTemperature = Math.min(...window.map(d => d.temperature || 0));
        
        // Hitung durasi kondisi tidak optimal
        const highHumidityDuration = window.filter(d => (d.humidity || 0) > 90).length;
        const lowTempDuration = window.filter(d => (d.temperature || 0) < 15).length;
        
        features.push({
            avgHumidity,
            avgTemperature,
            maxHumidity,
            minTemperature,
            highHumidityDuration,
            lowTempDuration,
            humidityVariation: Math.max(...window.map(d => d.humidity || 0)) - Math.min(...window.map(d => d.humidity || 0)),
            tempVariation: Math.max(...window.map(d => d.temperature || 0)) - Math.min(...window.map(d => d.temperature || 0))
        });
        
        // Tentukan risk level berdasarkan kondisi
        let riskLevel = 'low';
        if (highHumidityDuration >= 6 && avgHumidity > 90) {
            riskLevel = 'high'; // Risiko tinggi jamur
        } else if (highHumidityDuration >= 4 || avgHumidity > 85) {
            riskLevel = 'medium';
        }
        
        riskLevels.push(riskLevel);
    }
    
    return { features, riskLevels };
}

console.log('✅ Data preprocessor module loaded');

