// greenhouse-service.js
// Service untuk mengelola data greenhouse, tanaman, dan sensor
// ===========================================================

import { db } from '../../../config/firebase-init.js';
import { 
    collection, 
    addDoc, 
    updateDoc, 
    deleteDoc, 
    doc, 
    getDoc, 
    getDocs, 
    query, 
    where, 
    orderBy, 
    limit,
    Timestamp 
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

// ===========================================================
// TYPES OF PLANTS DATA
// ===========================================================
export const PLANT_TYPES = {
    SAYUR: 'sayur',
    BUAH: 'buah'
};

export const SAYUR_OPTIONS = [
    'Bayam',
    'Kangkung',
    'Sawi',
    'Selada',
    'Pakcoy',
    'Cabai',
    'Tomat',
    'Terong',
    'Bawang Merah',
    'Bawang Putih',
    'Kubis',
    'Wortel',
    'Brokoli',
    'Kacang Panjang',
    'Buncis'
];

export const BUAH_OPTIONS = [
    'Strawberry',
    'Tomato',
    'Cucumber',
    'Pepaya',
    'Melon',
    'Semangka',
    'Cabai Rawit',
    'Terong',
    'Labu',
    'Zucchini',
    'Paprika',
    'Okra',
    'Terong Belanda',
    'Markisa',
    'Anggur'
];

// ===========================================================
// GREENHOUSE FUNCTIONS
// ===========================================================

/**
 * Membuat greenhouse baru untuk user
 */
export async function createGreenhouse(userId, greenhouseData) {
    try {
        const greenhouse = {
            userId: userId,
            name: greenhouseData.name || 'Greenhouse Saya',
            location: greenhouseData.location || '',
            // Optional coordinates if provided
            latitude: greenhouseData.latitude !== undefined ? greenhouseData.latitude : undefined,
            longitude: greenhouseData.longitude !== undefined ? greenhouseData.longitude : undefined,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
            // Metadata greenhouse
            totalPlants: 0,
            activePlants: 0
        };
        
        const docRef = await addDoc(collection(db, 'greenhouses'), greenhouse);
        return { success: true, id: docRef.id };
    } catch (error) {
        console.error('Error creating greenhouse:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Mendapatkan semua greenhouse milik user
 */
export async function getUserGreenhouses(userId) {
    try {
        const q = query(
            collection(db, 'greenhouses'),
            where('userId', '==', userId),
            orderBy('createdAt', 'desc')
        );
        
        const querySnapshot = await getDocs(q);
        const greenhouses = [];
        
        querySnapshot.forEach((doc) => {
            greenhouses.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        return { success: true, data: greenhouses };
    } catch (error) {
        console.error('Error getting greenhouses:', error);
        
        // If error is about missing index, try without orderBy as fallback
        if (error.message && error.message.includes('requires an index')) {
            console.warn('⚠️ Index not found, trying query without orderBy...');
            try {
                const qFallback = query(
                    collection(db, 'greenhouses'),
                    where('userId', '==', userId)
                );
                
                const querySnapshot = await getDocs(qFallback);
                const greenhouses = [];
                
                querySnapshot.forEach((doc) => {
                    greenhouses.push({
                        id: doc.id,
                        ...doc.data()
                    });
                });
                
                // Sort manually by createdAt
                greenhouses.sort((a, b) => {
                    const aTime = a.createdAt?.toMillis?.() || a.createdAt?.seconds || 0;
                    const bTime = b.createdAt?.toMillis?.() || b.createdAt?.seconds || 0;
                    return bTime - aTime; // Descending
                });
                
                console.log('✅ Fallback query successful, returning', greenhouses.length, 'greenhouses');
                return { success: true, data: greenhouses };
            } catch (fallbackError) {
                console.error('❌ Fallback query also failed:', fallbackError);
                return { success: false, error: error.message };
            }
        }
        
        return { success: false, error: error.message };
    }
}

// ===========================================================
// PLANT FUNCTIONS
// ===========================================================

/**
 * Menambahkan tanaman baru ke greenhouse
 */
export async function addPlant(userId, greenhouseId, plantData) {
    try {
        console.log('🌱 Adding plant to Firestore:', {
            userId,
            greenhouseId,
            plantData
        });
        
        // Parse planting date jika ada
        let plantedDate = Timestamp.now();
        if (plantData.plantingDate) {
            const date = new Date(plantData.plantingDate);
            if (!isNaN(date.getTime())) {
                plantedDate = Timestamp.fromDate(date);
            }
        }
        
        const plant = {
            userId: userId,
            greenhouseId: greenhouseId,
            plantType: plantData.plantType || 'sayur', // 'sayur' atau 'buah'
            plantName: plantData.plantName || '', // nama spesifik tanaman
            plantedDate: plantedDate,
            status: 'active', // active, harvested, removed
            // Data tracking
            lastWatered: null,
            totalWaterings: 0,
            notes: plantData.notes || '',
            // Additional fields from form
            plantingLocation: plantData.plantingLocation || '',
            healthStatus: plantData.healthStatus || 'sehat',
            growthStage: plantData.growthStage || 'benih',
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now()
        };
        
        console.log('📝 Plant document to save:', plant);
        
        const docRef = await addDoc(collection(db, 'plants'), plant);
        
        console.log('✅ Plant saved successfully with ID:', docRef.id);
        
        // Update jumlah tanaman di greenhouse
        await updateGreenhousePlantCount(greenhouseId);
        
        return { success: true, id: docRef.id };
    } catch (error) {
        console.error('❌ Error adding plant to Firestore:', error);
        console.error('Error details:', {
            code: error.code,
            message: error.message,
            stack: error.stack
        });
        return { success: false, error: error.message };
    }
}

/**
 * Mendapatkan semua tanaman di greenhouse
 */
export async function getGreenhousePlants(greenhouseId) {
    try {
        const q = query(
            collection(db, 'plants'),
            where('greenhouseId', '==', greenhouseId),
            where('status', '==', 'active'),
            orderBy('plantedDate', 'desc')
        );
        
        const querySnapshot = await getDocs(q);
        const plants = [];
        
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            plants.push({
                id: doc.id,
                ...data,
                plantedDate: data.plantedDate?.toDate() || null,
                lastWatered: data.lastWatered?.toDate() || null
            });
        });
        
        return { success: true, data: plants };
    } catch (error) {
        console.error('Error getting plants:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Update jumlah tanaman di greenhouse
 */
async function updateGreenhousePlantCount(greenhouseId) {
    try {
        const plantsResult = await getGreenhousePlants(greenhouseId);
        if (plantsResult.success) {
            const activeCount = plantsResult.data.length;
            const totalCount = activeCount; // Bisa dihitung dari semua status
            
            const greenhouseRef = doc(db, 'greenhouses', greenhouseId);
            await updateDoc(greenhouseRef, {
                activePlants: activeCount,
                totalPlants: totalCount,
                updatedAt: Timestamp.now()
            });
        }
    } catch (error) {
        console.error('Error updating plant count:', error);
    }
}

// ===========================================================
// DAILY LOG FUNCTIONS
// ===========================================================

/**
 * Membuat log harian (penyiraman, kondisi)
 */
export async function createDailyLog(userId, greenhouseId, logData) {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const log = {
            userId: userId,
            greenhouseId: greenhouseId,
            date: Timestamp.fromDate(today),
            // Data penyiraman
            wateredAt7AM: logData.wateredAt7AM || false,
            wateringTime: logData.wateringTime || null, // Timestamp kapan disiram
            plantsWatered: logData.plantsWatered || [], // Array plant IDs yang disiram
            // Data kondisi
            notes: logData.notes || '',
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now()
        };
        
        const docRef = await addDoc(collection(db, 'daily_logs'), log);
        return { success: true, id: docRef.id };
    } catch (error) {
        console.error('Error creating daily log:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Mendapatkan log harian untuk tanggal tertentu
 */
export async function getDailyLog(greenhouseId, date) {
    try {
        const targetDate = new Date(date);
        targetDate.setHours(0, 0, 0, 0);
        const nextDay = new Date(targetDate);
        nextDay.setDate(nextDay.getDate() + 1);
        
        const q = query(
            collection(db, 'daily_logs'),
            where('greenhouseId', '==', greenhouseId),
            where('date', '>=', Timestamp.fromDate(targetDate)),
            where('date', '<', Timestamp.fromDate(nextDay)),
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
                date: docData.date?.toDate() || null,
                wateringTime: docData.wateringTime?.toDate() || null
            }
        };
    } catch (error) {
        console.error('Error getting daily log:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Update log harian (misalnya update status penyiraman)
 */
export async function updateDailyLog(logId, updateData) {
    try {
        const logRef = doc(db, 'daily_logs', logId);
        await updateDoc(logRef, {
            ...updateData,
            updatedAt: Timestamp.now()
        });
        
        return { success: true };
    } catch (error) {
        console.error('Error updating daily log:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Update status penyiraman tanaman
 */
export async function markPlantWatered(plantId, wateredTime = null) {
    try {
        const plantRef = doc(db, 'plants', plantId);
        const wateringTimestamp = wateredTime || Timestamp.now();
        
        await updateDoc(plantRef, {
            lastWatered: wateringTimestamp,
            totalWaterings: (await getDoc(plantRef)).data().totalWaterings + 1,
            updatedAt: Timestamp.now()
        });
        
        return { success: true };
    } catch (error) {
        console.error('Error marking plant as watered:', error);
        return { success: false, error: error.message };
    }
}

// ===========================================================
// SENSOR DATA FUNCTIONS
// ===========================================================

/**
 * Menyimpan data sensor (kelembaban, cahaya)
 */
export async function saveSensorData(userId, greenhouseId, sensorData) {
    try {
        const data = {
            userId: userId,
            greenhouseId: greenhouseId,
            temperature: parseFloat(sensorData.temperature) || null, // suhu dalam °C
            humidity: parseFloat(sensorData.humidity) || null, // persentase kelembaban
            lightLevel: parseFloat(sensorData.lightLevel) || null, // level cahaya dalam lux
            soilMoisture: parseFloat(sensorData.soilMoisture) || null, // kelembaban tanah dalam %
            notes: sensorData.notes || '',
            timestamp: Timestamp.now(),
            createdAt: Timestamp.now()
        };
        
        const docRef = await addDoc(collection(db, 'sensor_data'), data);
        return { success: true, id: docRef.id };
    } catch (error) {
        console.error('Error saving sensor data:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Menyimpan data agregat untuk Random Forest (prediksi hasil panen & deteksi penyakit)
 */
export async function saveAggregateData(userId, greenhouseId, aggregateData) {
    try {
        const data = {
            userId: userId,
            greenhouseId: greenhouseId,
            // Data untuk Random Forest Regression (prediksi hasil panen)
            avgDailyTemp: parseFloat(aggregateData.avgDailyTemp) || null, // rata-rata suhu harian
            totalLightExposure: parseFloat(aggregateData.totalLightExposure) || null, // total paparan cahaya (lux-hours)
            totalWaterIrrigation: parseFloat(aggregateData.totalWaterIrrigation) || null, // jumlah total air irigasi (liter)
            cycleDuration: parseInt(aggregateData.cycleDuration) || null, // durasi siklus tanam (hari)
            // Data untuk Random Forest Classifier (deteksi penyakit)
            highHumidityDuration: parseFloat(aggregateData.highHumidityDuration) || null, // durasi kelembaban > 90% (jam)
            // Data hasil panen (untuk training model)
            harvestYield: aggregateData.harvestYield ? parseFloat(aggregateData.harvestYield) : null, // estimasi hasil panen (kg)
            notes: aggregateData.notes || '',
            timestamp: Timestamp.now(),
            createdAt: Timestamp.now()
        };
        
        const docRef = await addDoc(collection(db, 'aggregate_data'), data);
        return { success: true, id: docRef.id };
    } catch (error) {
        console.error('Error saving aggregate data:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Mendapatkan data sensor terbaru
 */
export async function getLatestSensorData(greenhouseId) {
    try {
        const q = query(
            collection(db, 'sensor_data'),
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
        console.error('Error getting sensor data:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Mendapatkan data sensor historis (24 jam terakhir) untuk prediksi AI
 * @param {string} greenhouseId - ID greenhouse
 * @param {number} hours - Jumlah jam historis yang diambil (default: 24)
 * @returns {Promise<Object>} Data sensor historis
 */
export async function getHistoricalSensorData(greenhouseId, hours = 24) {
    try {
        const now = new Date();
        const pastDate = new Date(now.getTime() - (hours * 60 * 60 * 1000));
        
        const q = query(
            collection(db, 'sensor_data'),
            where('greenhouseId', '==', greenhouseId),
            where('timestamp', '>=', Timestamp.fromDate(pastDate)),
            orderBy('timestamp', 'asc')
        );
        
        const querySnapshot = await getDocs(q);
        const sensorData = [];
        
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            sensorData.push({
                id: doc.id,
                temperature: data.temperature || null,
                humidity: data.humidity || null,
                lightLevel: data.lightLevel || null,
                soilMoisture: data.soilMoisture || null,
                timestamp: data.timestamp?.toDate() || null
            });
        });
        
        return {
            success: true,
            data: sensorData,
            count: sensorData.length
        };
    } catch (error) {
        console.error('Error getting historical sensor data:', error);
        return { success: false, error: error.message, data: [] };
    }
}

// ===========================================================
// AI SUMMARY FUNCTIONS
// ===========================================================

/**
 * Menyimpan kesimpulan harian dari AI
 */
export async function saveAISummary(userId, greenhouseId, summaryData) {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const summary = {
            userId: userId,
            greenhouseId: greenhouseId,
            date: Timestamp.fromDate(today),
            summary: summaryData.summary, // Teks kesimpulan dari AI
            insights: summaryData.insights || [], // Array insights
            recommendations: summaryData.recommendations || [], // Array rekomendasi
            createdAt: Timestamp.now()
        };
        
        const docRef = await addDoc(collection(db, 'ai_summaries'), summary);
        return { success: true, id: docRef.id };
    } catch (error) {
        console.error('Error saving AI summary:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Mendapatkan kesimpulan AI untuk hari ini
 */
export async function getTodayAISummary(greenhouseId) {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const nextDay = new Date(today);
        nextDay.setDate(nextDay.getDate() + 1);
        
        const q = query(
            collection(db, 'ai_summaries'),
            where('greenhouseId', '==', greenhouseId),
            where('date', '>=', Timestamp.fromDate(today)),
            where('date', '<', Timestamp.fromDate(nextDay)),
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
                date: docData.date?.toDate() || null
            }
        };
    } catch (error) {
        console.error('Error getting AI summary:', error);
        return { success: false, error: error.message };
    }
}

// ===========================================================
// AI DATA FETCHING FUNCTIONS
// ===========================================================

/**
 * Mendapatkan semua data greenhouse user untuk AI analysis
 * Mengambil greenhouses, plants, sensor data, dan aggregate data
 */
export async function getUserGreenhouseDataForAI(userId) {
    try {
        console.log('📊 Fetching greenhouse data for AI analysis, userId:', userId);
        
        // Get all greenhouses
        const greenhousesResult = await getUserGreenhouses(userId);
        const greenhouses = greenhousesResult.success ? greenhousesResult.data : [];
        
        if (greenhouses.length === 0) {
            console.log('⚠️ No greenhouses found for user');
            return { success: true, data: null };
        }
        
        // Get the first greenhouse (or most recent)
        const primaryGreenhouse = greenhouses[0];
        const greenhouseId = primaryGreenhouse.id;
        
        // Get all plants for this greenhouse
        const plantsResult = await getUserPlants(userId, greenhouseId);
        const plants = plantsResult.success ? plantsResult.data : [];
        
        // Get latest sensor data
        const latestSensorResult = await getLatestSensorData(greenhouseId);
        const latestSensor = latestSensorResult.success ? latestSensorResult.data : null;
        
        // Get historical sensor data (24 hours)
        const historicalSensorResult = await getHistoricalSensorData(greenhouseId, 24);
        const historicalSensor = historicalSensorResult.success ? historicalSensorResult.data : [];
        
        // Get latest aggregate data
        const latestAggregateResult = await getLatestAggregateData(greenhouseId);
        const latestAggregate = latestAggregateResult.success ? latestAggregateResult.data : null;
        
        // Get all aggregate data for analysis
        const allAggregateResult = await getAllAggregateData(greenhouseId);
        const allAggregate = allAggregateResult.success ? allAggregateResult.data : [];
        
        const greenhouseData = {
            greenhouse: {
                id: primaryGreenhouse.id,
                name: primaryGreenhouse.name,
                location: primaryGreenhouse.location,
                createdAt: primaryGreenhouse.createdAt?.toDate() || null,
                totalPlants: primaryGreenhouse.totalPlants || 0,
                activePlants: primaryGreenhouse.activePlants || 0
            },
            plants: plants.map(plant => ({
                id: plant.id,
                type: plant.plantType,
                name: plant.plantName,
                status: plant.status,
                plantedDate: plant.plantedDate?.toDate() || null,
                lastWatered: plant.lastWatered?.toDate() || null,
                totalWaterings: plant.totalWaterings || 0,
                notes: plant.notes || ''
            })),
            latestSensor: latestSensor ? {
                temperature: latestSensor.temperature,
                humidity: latestSensor.humidity,
                lightLevel: latestSensor.lightLevel,
                soilMoisture: latestSensor.soilMoisture,
                timestamp: latestSensor.timestamp,
                notes: latestSensor.notes || ''
            } : null,
            historicalSensor: historicalSensor.map(sensor => ({
                temperature: sensor.temperature,
                humidity: sensor.humidity,
                lightLevel: sensor.lightLevel,
                soilMoisture: sensor.soilMoisture,
                timestamp: sensor.timestamp
            })),
            latestAggregate: latestAggregate ? {
                avgDailyTemp: latestAggregate.avgDailyTemp,
                totalLightExposure: latestAggregate.totalLightExposure,
                totalWaterIrrigation: latestAggregate.totalWaterIrrigation,
                cycleDuration: latestAggregate.cycleDuration,
                highHumidityDuration: latestAggregate.highHumidityDuration,
                harvestYield: latestAggregate.harvestYield,
                timestamp: latestAggregate.timestamp,
                notes: latestAggregate.notes || ''
            } : null,
            allAggregate: allAggregate.map(agg => ({
                avgDailyTemp: agg.avgDailyTemp,
                totalLightExposure: agg.totalLightExposure,
                totalWaterIrrigation: agg.totalWaterIrrigation,
                cycleDuration: agg.cycleDuration,
                highHumidityDuration: agg.highHumidityDuration,
                harvestYield: agg.harvestYield,
                timestamp: agg.timestamp
            }))
        };
        
        console.log('✅ Greenhouse data fetched for AI:', {
            greenhouses: greenhouses.length,
            plants: plants.length,
            hasLatestSensor: !!latestSensor,
            historicalSensorCount: historicalSensor.length,
            hasLatestAggregate: !!latestAggregate,
            aggregateCount: allAggregate.length
        });
        
        return { success: true, data: greenhouseData };
    } catch (error) {
        console.error('❌ Error fetching greenhouse data for AI:', error);
        return { success: false, error: error.message, data: null };
    }
}

/**
 * Mendapatkan data agregat terbaru
 */
export async function getLatestAggregateData(greenhouseId) {
    try {
        const q = query(
            collection(db, 'aggregate_data'),
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
        console.error('Error getting aggregate data:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Mendapatkan semua data agregat untuk greenhouse
 */
export async function getAllAggregateData(greenhouseId) {
    try {
        const q = query(
            collection(db, 'aggregate_data'),
            where('greenhouseId', '==', greenhouseId),
            orderBy('timestamp', 'desc'),
            limit(50)
        );
        
        const querySnapshot = await getDocs(q);
        const aggregateData = [];
        
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            aggregateData.push({
                id: doc.id,
                ...data,
                timestamp: data.timestamp?.toDate() || null
            });
        });
        
        return { success: true, data: aggregateData };
    } catch (error) {
        console.error('Error getting all aggregate data:', error);
        return { success: false, error: error.message, data: [] };
    }
}

/**
 * Mendapatkan semua tanaman user untuk greenhouse tertentu
 */
export async function getUserPlants(userId, greenhouseId) {
    try {
        const q = query(
            collection(db, 'plants'),
            where('userId', '==', userId),
            where('greenhouseId', '==', greenhouseId),
            orderBy('createdAt', 'desc')
        );
        
        const querySnapshot = await getDocs(q);
        const plants = [];
        
        querySnapshot.forEach((doc) => {
            plants.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        return { success: true, data: plants };
    } catch (error) {
        console.error('Error getting plants:', error);
        return { success: false, error: error.message, data: [] };
    }
}

// ===========================================================
// LOCATION FUNCTIONS (EXTENDED FOR MAPS)
// ===========================================================

/**
 * Update greenhouse location dengan latitude dan longitude
 * @param {string} greenhouseId - Greenhouse ID
 * @param {number} latitude - Latitude
 * @param {number} longitude - Longitude
 * @param {string} location - Location name/address (optional)
 */
export async function updateGreenhouseLocation(greenhouseId, latitude, longitude, location = '') {
    try {
        const greenhouseRef = doc(db, 'greenhouses', greenhouseId);
        
        await updateDoc(greenhouseRef, {
            latitude: latitude,
            longitude: longitude,
            location: location || '',
            updatedAt: Timestamp.now()
        });
        
        console.log('✅ Greenhouse location updated:', greenhouseId);
        return { success: true };
    } catch (error) {
        console.error('❌ Error updating greenhouse location:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Get greenhouse dengan location data (latitude, longitude)
 * @param {string} userId - User ID
 */
export async function getGreenhousesWithLocation(userId) {
    try {
        const result = await getUserGreenhouses(userId);
        
        if (!result.success || !result.data) {
            return { success: false, error: 'Failed to get greenhouses', data: [] };
        }
        
        // Filter greenhouses yang punya location coordinates
        const greenhousesWithLocation = result.data.filter(gh => 
            gh.latitude !== undefined && gh.longitude !== undefined
        );
        
        return { 
            success: true, 
            data: greenhousesWithLocation,
            total: result.data.length,
            withLocation: greenhousesWithLocation.length
        };
    } catch (error) {
        console.error('❌ Error getting greenhouses with location:', error);
        return { success: false, error: error.message, data: [] };
    }
}

