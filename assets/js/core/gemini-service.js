// gemini-service.js - Prioritize gemini-2.0-flash with safe fallbacks
import { geminiApiKeys, geminiApiKey, appConfig } from "../../../config/config.js";
import { getUserActivities, getActivityStats } from './environmental-activity-service.js';
import { getUserGreenhouseDataForAI } from '../greenhouse/greenhouse-service.js';
import { auth } from '../../../config/firebase-init.js';

// Cache & state
let genAI = null;
let GoogleGenerativeAI = null;
let availableModels = null;
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

// API Key rotation state
let currentApiKeyIndex = 0;
let failedApiKeys = new Set(); // Track keys yang sudah gagal
const API_KEY_STORAGE_KEY = 'gemini_current_api_key_index';
const FAILED_KEYS_STORAGE_KEY = 'gemini_failed_api_keys';

// Initialize API key rotation
function initializeApiKeyRotation() {
    // Load saved index from localStorage
    const savedIndex = parseInt(localStorage.getItem(API_KEY_STORAGE_KEY) || '0');
    currentApiKeyIndex = savedIndex < geminiApiKeys.length ? savedIndex : 0;
    
    // Load failed keys from localStorage
    const savedFailedKeys = localStorage.getItem(FAILED_KEYS_STORAGE_KEY);
    if (savedFailedKeys) {
        try {
            failedApiKeys = new Set(JSON.parse(savedFailedKeys));
        } catch (e) {
            failedApiKeys = new Set();
        }
    }
    
    console.log(`🔑 API Key Rotation initialized. Using key ${currentApiKeyIndex + 1}/${geminiApiKeys.length}`);
}

// Get current API key
function getCurrentApiKey() {
    if (geminiApiKeys.length === 0) {
        console.error('❌ No API keys configured');
        return geminiApiKey || '';
    }
    return geminiApiKeys[currentApiKeyIndex] || geminiApiKeys[0] || geminiApiKey || '';
}

// Switch to next API key
function switchToNextApiKey() {
    const previousIndex = currentApiKeyIndex;
    
    // Mark current key as failed
    failedApiKeys.add(currentApiKeyIndex);
    localStorage.setItem(FAILED_KEYS_STORAGE_KEY, JSON.stringify(Array.from(failedApiKeys)));
    
    // Find next available key
    let attempts = 0;
    while (attempts < geminiApiKeys.length) {
        currentApiKeyIndex = (currentApiKeyIndex + 1) % geminiApiKeys.length;
        
        if (!failedApiKeys.has(currentApiKeyIndex)) {
            localStorage.setItem(API_KEY_STORAGE_KEY, currentApiKeyIndex.toString());
            console.log(`🔄 Switched to API key ${currentApiKeyIndex + 1}/${geminiApiKeys.length}`);
            
            // Reset genAI instance untuk menggunakan key baru
            genAI = null;
            return true;
        }
        
        attempts++;
    }
    
    // All keys failed
    console.error('❌ All API keys have failed. Please check your API keys.');
    currentApiKeyIndex = previousIndex;
    return false;
}

// Reset failed keys (bisa dipanggil setelah beberapa waktu)
function resetFailedKeys() {
    failedApiKeys.clear();
    localStorage.removeItem(FAILED_KEYS_STORAGE_KEY);
    console.log('🔄 Reset failed API keys list');
}

// Auto-reset failed keys daily
function checkAndResetFailedKeys() {
    const lastReset = localStorage.getItem('gemini_failed_keys_reset_date');
    const today = new Date().toDateString();
    
    if (lastReset !== today) {
        resetFailedKeys();
        localStorage.setItem('gemini_failed_keys_reset_date', today);
        console.log('🔄 Daily reset: Failed API keys list cleared');
    }
}

// Initialize on module load
initializeApiKeyRotation();
checkAndResetFailedKeys();

// Rate limiting (existing logic)
let lastRequestTime = 0;
let requestCount = 0;
let dailyRequestCount = parseInt(localStorage.getItem('gemini_daily_requests') || '0');
let lastResetDate = localStorage.getItem('gemini_last_reset') || new Date().toDateString();
if (lastResetDate !== new Date().toDateString()) {
    dailyRequestCount = 0;
    localStorage.setItem('gemini_daily_requests', '0');
    localStorage.setItem('gemini_last_reset', new Date().toDateString());
}

const FREE_TIER_LIMITS = {
    RPM: 15,
    DAILY: 1500,
    MIN_INTERVAL: 4000
};

async function initializeGemini() {
    if (!genAI) {
        try {
            if (!GoogleGenerativeAI) {
                const module = await import('https://esm.run/@google/generative-ai');
                GoogleGenerativeAI = module.GoogleGenerativeAI;
            }
            const currentKey = getCurrentApiKey();
            if (!currentKey) {
                throw new Error('No API key available');
            }
            genAI = new GoogleGenerativeAI(currentKey);
            console.log(`✅ Gemini AI initialized successfully with API key ${currentApiKeyIndex + 1}/${geminiApiKeys.length}`);
        } catch (error) {
            console.error('❌ Failed to initialize Gemini AI:', error);
            genAI = null;
        }
    }
    return genAI;
}

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function checkRateLimit() {
    const now = Date.now();
    if (dailyRequestCount >= FREE_TIER_LIMITS.DAILY) {
        throw new Error('Daily quota exceeded. Please wait until tomorrow or upgrade to paid plan.');
    }
    const timeSinceLastRequest = now - lastRequestTime;
    if (timeSinceLastRequest < FREE_TIER_LIMITS.MIN_INTERVAL) {
        const waitTime = FREE_TIER_LIMITS.MIN_INTERVAL - timeSinceLastRequest;
        console.log(`🕒 Rate limiting: waiting ${waitTime}ms before next request`);
        await delay(waitTime);
    }
    lastRequestTime = Date.now();
    requestCount++;
    dailyRequestCount++;
    localStorage.setItem('gemini_daily_requests', dailyRequestCount.toString());
}

// Get available models from API but prioritize gemini-2.0-flash
async function getAvailableModels() {
    if (availableModels) return availableModels;

    let lastError = null;
    const maxAttempts = geminiApiKeys.length || 1;
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        try {
            const currentKey = getCurrentApiKey();
            if (!currentKey) {
                throw new Error('No API key available');
            }
            
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${currentKey}`);
            if (!response.ok) {
                // Check if it's an API key error
                if (response.status === 401 || response.status === 403) {
                    console.warn(`⚠️ API key ${currentApiKeyIndex + 1} failed (${response.status}), trying next key...`);
                    if (switchToNextApiKey()) {
                        continue; // Try with next key
                    } else {
                        throw new Error(`All API keys failed. HTTP status: ${response.status}`);
                    }
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();

        // All model names (normalize)
        const modelsFromApi = (data.models || []).map(m => m.name.replace('models/', ''));

        // Preferred explicit order: gemini-2.0-flash first, then its variants, then older flash/pro models
        const preferredOrder = [
            'gemini-2.0-flash',
            'gemini-2.0-flash-latest',
            'gemini-2.0-pro',
            'gemini-1.5-flash',
            'gemini-1.5-flash-latest',
            'gemini-1.5-pro',
            'gemini-pro'
        ];

        // Build result: include preferred models that exist in API first, then any other useful models
        const prioritized = [];
        for (const pref of preferredOrder) {
            if (modelsFromApi.includes(pref)) prioritized.push(pref);
        }

        // Add other flash/pro models returned by API (avoid duplicates)
        for (const m of modelsFromApi) {
            if (!prioritized.includes(m) && (m.includes('flash') || m.includes('pro') || m.includes('2.0') || m.includes('1.5'))) {
                prioritized.push(m);
            }
        }

        // As last resort, allow any model returned
        for (const m of modelsFromApi) {
            if (!prioritized.includes(m)) prioritized.push(m);
        }

            availableModels = prioritized;
            console.log(`✅ Available models (prioritized) with API key ${currentApiKeyIndex + 1}/${geminiApiKeys.length}:`, availableModels);
            return availableModels;

        } catch (error) {
            lastError = error;
            console.error(`❌ Failed to fetch models with API key ${currentApiKeyIndex + 1}:`, error);
            
            // If API key error and we have more keys, try next
            if ((error.message.includes('401') || error.message.includes('403') || error.message.includes('API key')) && attempt < maxAttempts - 1) {
                if (switchToNextApiKey()) {
                    continue; // Try with next key
                }
            }
        }
    }
    
    // All attempts failed, return fallback
    console.warn('⚠️ All API keys failed, using fallback model list');
    // Provide robust fallback list including gemini-2.0-flash names
    return [
        'gemini-2.0-flash',
        'gemini-2.0-flash-latest',
        'gemini-1.5-flash-latest',
        'gemini-1.5-flash',
        'gemini-pro'
    ];
}

// Try to get model instance with explicit preference for gemini-2.0-flash
async function getModelWithFallback(retryCount = 0) {
    const ai = await initializeGemini();
    if (!ai) {
        throw new Error('Gemini AI is not properly initialized. Please check your API key.');
    }

    const models = await getAvailableModels();
    if (!models || models.length === 0) {
        throw new Error('No models available. Please check your API key permissions.');
    }

    let lastError = null;

    // Try models in order returned by getAvailableModels (which was prioritized)
    for (const modelName of models) {
        try {
            // Use exact modelName to get generative model instance
            const model = ai.getGenerativeModel({ model: modelName });
            console.log(`✅ Using model: ${modelName}`);
            return model;
        } catch (error) {
            console.warn(`⚠️ Failed to use model ${modelName}:`, error?.message || error);
            lastError = error;
        }
    }

    throw new Error(`All models are currently unavailable. Last error: ${lastError?.message || lastError}`);
}

function getErrorMessage(error) {
    const errorMsg = (error && error.message) ? error.message : String(error);

    if (errorMsg.includes('quota') || errorMsg.includes('429')) {
        return { message: "API quota exceeded. Menunggu reset atau upgrade plan.", type: 'quota', waitTime: 60000 };
    }
    if (errorMsg.includes('API key') || errorMsg.includes('401')) {
        return { message: "API key tidak valid. Generate API key baru di https://aistudio.google.com/app/apikey", type: 'auth' };
    }
    if (errorMsg.includes('503')) {
        return { message: "Server Gemini sedang sibuk. Mencoba lagi...", type: 'server', waitTime: 5000 };
    }
    if (errorMsg.includes('404') || errorMsg.includes('Model tidak tersedia') || errorMsg.includes('not found')) {
        return { message: "Model tidak tersedia. Periksa kembali nama model atau hak akses API key.", type: 'model' };
    }
    return { message: "Terjadi kesalahan. Silakan coba lagi dalam beberapa saat.", type: 'general', waitTime: 3000 };
}

/**
 * Fetch user's greenhouse and plant data from Firestore for AI analysis
 * @returns {Promise<Object>} User greenhouse data context
 */
async function getUserDataContext() {
    try {
        console.log('📊 Fetching user greenhouse data context from Firestore...');
        
        // Get current user
        const user = auth.currentUser;
        if (!user) {
            console.warn('⚠️ No user logged in, cannot fetch greenhouse data');
            return null;
        }
        
        // Get greenhouse data (plants, sensor, aggregate)
        const greenhouseDataResult = await getUserGreenhouseDataForAI(user.uid);
        
        if (!greenhouseDataResult.success || !greenhouseDataResult.data) {
            console.log('⚠️ No greenhouse data available');
            return null;
        }
        
        const greenhouseData = greenhouseDataResult.data;
        
        // Format data untuk AI context
        let contextText = `**DATA GREENHOUSE & TANAMAN PENGGUNA:**\n\n`;
        
        // Greenhouse info
        contextText += `**Greenhouse:**\n`;
        contextText += `- Nama: ${greenhouseData.greenhouse.name || 'N/A'}\n`;
        contextText += `- Lokasi: ${greenhouseData.greenhouse.location || 'N/A'}\n`;
        contextText += `- Total Tanaman: ${greenhouseData.greenhouse.totalPlants || 0}\n`;
        contextText += `- Tanaman Aktif: ${greenhouseData.greenhouse.activePlants || 0}\n\n`;
        
        // Plants info
        if (greenhouseData.plants && greenhouseData.plants.length > 0) {
            contextText += `**Daftar Tanaman (${greenhouseData.plants.length}):**\n`;
            greenhouseData.plants.forEach((plant, index) => {
                contextText += `${index + 1}. ${plant.name} (${plant.type})\n`;
                contextText += `   - Status: ${plant.status}\n`;
                if (plant.plantedDate) {
                    const plantedDate = new Date(plant.plantedDate);
                    contextText += `   - Ditanam: ${plantedDate.toLocaleDateString('id-ID')}\n`;
                }
                if (plant.lastWatered) {
                    const wateredDate = new Date(plant.lastWatered);
                    contextText += `   - Terakhir Disiram: ${wateredDate.toLocaleDateString('id-ID')} ${wateredDate.toLocaleTimeString('id-ID')}\n`;
                }
                contextText += `   - Total Penyiraman: ${plant.totalWaterings || 0}x\n`;
                if (plant.notes) {
                    contextText += `   - Catatan: ${plant.notes}\n`;
                }
                contextText += `\n`;
            });
        }

        // Latest sensor data
        if (greenhouseData.latestSensor) {
            contextText += `**Data Sensor Terbaru:**\n`;
            contextText += `- Suhu: ${greenhouseData.latestSensor.temperature !== null ? greenhouseData.latestSensor.temperature + '°C' : 'N/A'}\n`;
            contextText += `- Kelembaban: ${greenhouseData.latestSensor.humidity !== null ? greenhouseData.latestSensor.humidity + '%' : 'N/A'}\n`;
            contextText += `- Level Cahaya: ${greenhouseData.latestSensor.lightLevel !== null ? greenhouseData.latestSensor.lightLevel + ' lux' : 'N/A'}\n`;
            contextText += `- Kelembaban Tanah: ${greenhouseData.latestSensor.soilMoisture !== null ? greenhouseData.latestSensor.soilMoisture + '%' : 'N/A'}\n`;
            if (greenhouseData.latestSensor.timestamp) {
                const sensorDate = new Date(greenhouseData.latestSensor.timestamp);
                contextText += `- Waktu: ${sensorDate.toLocaleString('id-ID')}\n`;
            }
            if (greenhouseData.latestSensor.notes) {
                contextText += `- Catatan: ${greenhouseData.latestSensor.notes}\n`;
            }
            contextText += `\n`;
        }
        
        // Historical sensor data (trends)
        if (greenhouseData.historicalSensor && greenhouseData.historicalSensor.length > 0) {
            contextText += `**Trend Data Sensor (24 Jam Terakhir - ${greenhouseData.historicalSensor.length} data):**\n`;
            
            // Calculate averages
            const validTemps = greenhouseData.historicalSensor.filter(s => s.temperature !== null).map(s => s.temperature);
            const validHumidity = greenhouseData.historicalSensor.filter(s => s.humidity !== null).map(s => s.humidity);
            const validLight = greenhouseData.historicalSensor.filter(s => s.lightLevel !== null).map(s => s.lightLevel);
            const validSoil = greenhouseData.historicalSensor.filter(s => s.soilMoisture !== null).map(s => s.soilMoisture);
            
            if (validTemps.length > 0) {
                const avgTemp = validTemps.reduce((a, b) => a + b, 0) / validTemps.length;
                const minTemp = Math.min(...validTemps);
                const maxTemp = Math.max(...validTemps);
                contextText += `- Suhu: Rata-rata ${avgTemp.toFixed(1)}°C (Min: ${minTemp}°C, Max: ${maxTemp}°C)\n`;
            }
            if (validHumidity.length > 0) {
                const avgHumidity = validHumidity.reduce((a, b) => a + b, 0) / validHumidity.length;
                const minHumidity = Math.min(...validHumidity);
                const maxHumidity = Math.max(...validHumidity);
                contextText += `- Kelembaban: Rata-rata ${avgHumidity.toFixed(1)}% (Min: ${minHumidity}%, Max: ${maxHumidity}%)\n`;
        }
            if (validLight.length > 0) {
                const avgLight = validLight.reduce((a, b) => a + b, 0) / validLight.length;
                contextText += `- Level Cahaya: Rata-rata ${avgLight.toFixed(0)} lux\n`;
            }
            if (validSoil.length > 0) {
                const avgSoil = validSoil.reduce((a, b) => a + b, 0) / validSoil.length;
                contextText += `- Kelembaban Tanah: Rata-rata ${avgSoil.toFixed(1)}%\n`;
            }
            contextText += `\n`;
        }

        // Latest aggregate data
        if (greenhouseData.latestAggregate) {
            contextText += `**Data Agregat Siklus Tanam Terbaru:**\n`;
            if (greenhouseData.latestAggregate.avgDailyTemp !== null) {
                contextText += `- Rata-rata Suhu Harian: ${greenhouseData.latestAggregate.avgDailyTemp}°C\n`;
            }
            if (greenhouseData.latestAggregate.totalLightExposure !== null) {
                contextText += `- Total Paparan Cahaya: ${greenhouseData.latestAggregate.totalLightExposure} lux-hours\n`;
            }
            if (greenhouseData.latestAggregate.totalWaterIrrigation !== null) {
                contextText += `- Total Air Irigasi: ${greenhouseData.latestAggregate.totalWaterIrrigation} liter\n`;
            }
            if (greenhouseData.latestAggregate.cycleDuration !== null) {
                contextText += `- Durasi Siklus: ${greenhouseData.latestAggregate.cycleDuration} hari\n`;
            }
            if (greenhouseData.latestAggregate.highHumidityDuration !== null) {
                contextText += `- Durasi Kelembaban > 90%: ${greenhouseData.latestAggregate.highHumidityDuration} jam\n`;
            }
            if (greenhouseData.latestAggregate.harvestYield !== null) {
                contextText += `- Hasil Panen: ${greenhouseData.latestAggregate.harvestYield} kg\n`;
            }
            if (greenhouseData.latestAggregate.notes) {
                contextText += `- Catatan: ${greenhouseData.latestAggregate.notes}\n`;
            }
            contextText += `\n`;
        }
        
        // Aggregate data summary
        if (greenhouseData.allAggregate && greenhouseData.allAggregate.length > 0) {
            contextText += `**Riwayat Siklus Tanam (${greenhouseData.allAggregate.length} siklus):**\n`;
            const withHarvest = greenhouseData.allAggregate.filter(a => a.harvestYield !== null);
            if (withHarvest.length > 0) {
                const avgYield = withHarvest.reduce((sum, a) => sum + (a.harvestYield || 0), 0) / withHarvest.length;
                contextText += `- Rata-rata Hasil Panen: ${avgYield.toFixed(1)} kg\n`;
            }
            contextText += `\n`;
        }

        const context = {
            hasData: true,
            greenhouseData: greenhouseData,
            contextText: contextText
        };

        console.log('✅ User greenhouse data context fetched');
        return context;

    } catch (error) {
        console.error('❌ Error fetching user greenhouse data context:', error);
        return null;
    }
}

// Main function to get chat response
export async function getChatResponse(prompt, chatHistory = [], retryCount = 0) {
    try {
        console.log('🤖 Starting Gemini API call...');
        console.log('📝 Message:', prompt);
        console.log('📊 Daily requests:', dailyRequestCount);
        
        await checkRateLimit();

        const model = await getModelWithFallback();
        console.log('✅ Using model:', model);
        // generation config (bounded for free tier)
        const generationConfig = {
            temperature: appConfig.temperature || 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: Math.min(appConfig.maxTokens || 1024, 1024),
        };

        const safetySettings = [
            { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_ONLY_HIGH" },
            { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_ONLY_HIGH" },
            { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_ONLY_HIGH" },
            { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_ONLY_HIGH" },
        ];

        // Fetch user data context from Firestore
        const userContext = await getUserDataContext();
        
        let systemPrompt = `Anda adalah AI Assistant AgriHouse, konsultan ahli Greenhouse dan Tanaman. Anda membantu pengguna dalam:

1. **Konsultasi Greenhouse:**
   - Manajemen kondisi udara di dalam greenhouse (kelembaban, suhu, cahaya)
   - Optimasi lingkungan untuk pertumbuhan tanaman
   - Monitoring sensor dan kondisi lingkungan
   - Troubleshooting masalah greenhouse

2. **Konsultasi Tanaman Secara Umum:**
   - Jenis-jenis tanaman (sayur dan buah) yang cocok untuk greenhouse
   - Perawatan tanaman (penyiraman, pemupukan, pemangkasan)
   - Identifikasi masalah tanaman (penyakit, hama, kekurangan nutrisi)
   - Tips budidaya tanaman organik dan sehat
   - Jadwal penyiraman dan perawatan optimal

3. **Monitoring dan Analisis:**
   - Analisis data sensor (humidity, light, temperature)
   - Evaluasi kondisi tanaman berdasarkan data
   - Rekomendasi perbaikan kondisi greenhouse
   - Prediksi dan pencegahan masalah

4. **Panduan Praktis:**
   - Cara mengatur jadwal penyiraman (khususnya pukul 7 pagi)
   - Teknik budidaya yang efisien
   - Tips menghemat air dan sumber daya
   - Best practices untuk greenhouse management

Berikan jawaban yang:
- Praktis dan mudah diterapkan untuk greenhouse
- Berdasarkan pengetahuan botani dan pertanian
- Menggunakan contoh nyata dari tanaman yang umum ditanam
- Ramah dan mendukung
- Fokus pada kesehatan tanaman dan efisiensi greenhouse

**Format Tabel:**
Saat memberikan data dalam bentuk tabel, gunakan format Markdown table yang rapi:
| Header 1 | Header 2 | Header 3 |
| Data 1 | Data 2 | Data 3 |

Pastikan setiap kolom terpisah dengan jelas menggunakan pipe (|) dan data tersusun rapi.`;

        // Add user data context if available (greenhouse/plant data)
        if (userContext && userContext.hasData) {
            console.log('📊 Adding user greenhouse data context to AI prompt');
            
            // Add formatted greenhouse data context
            if (userContext.contextText) {
                systemPrompt += `\n\n${userContext.contextText}`;
                
                systemPrompt += `\n**INSTRUKSI ANALISIS:**\n`;
                systemPrompt += `Berdasarkan data di atas, WAJIB berikan:\n\n`;
                systemPrompt += `**1. KESIMPULAN KONDISI GREENHOUSE (PENTING!)**\n`;
                systemPrompt += `Berikan kesimpulan menyeluruh tentang kondisi greenhouse saat ini dalam 2-3 paragraf. Evaluasi:\n`;
                systemPrompt += `- Apakah kondisi greenhouse optimal, baik, atau perlu perhatian?\n`;
                systemPrompt += `- Bagaimana kondisi keseluruhan berdasarkan semua data yang ada?\n`;
                systemPrompt += `- Apakah ada indikasi masalah atau hal yang perlu diperhatikan?\n\n`;
                systemPrompt += `**2. ANALISIS DETAIL:**\n`;
                systemPrompt += `- Status kesehatan tanaman berdasarkan data sensor\n`;
                systemPrompt += `- Evaluasi parameter sensor (suhu, kelembaban, cahaya, tanah)\n`;
                systemPrompt += `- Identifikasi masalah potensial (jika ada)\n`;
                systemPrompt += `- Rekomendasi perbaikan dan optimasi yang praktis\n`;
                systemPrompt += `- Prediksi kondisi ke depan berdasarkan trend data\n`;
                systemPrompt += `- Tips perawatan spesifik untuk tanaman yang ada\n\n`;
                systemPrompt += `**PENTING:** Selalu mulai dengan KESIMPULAN KONDISI GREENHOUSE yang jelas dan mudah dipahami. Gunakan data yang tersedia untuk memberikan analisis yang akurat dan praktis.`;
            }
        } else {
            console.log('⚠️ No user greenhouse data context available');
        }
        
        systemPrompt += `\n\nJawab dalam bahasa Indonesia yang natural dan mudah dipahami.`;

        const history = [
            { role: "user", parts: [{ text: systemPrompt }] },
            { role: "model", parts: [{ text: "Baik, saya siap membantu Anda dengan konsultasi Greenhouse dan Tanaman. Saya bisa membantu menganalisis data sensor, memberikan prediksi mikroklimat, optimasi hasil panen, deteksi risiko penyakit, dan memberikan rekomendasi untuk manajemen greenhouse yang optimal." }] },
            ...chatHistory.slice(-8)
        ];

        const chat = model.startChat({
            generationConfig,
            safetySettings,
            history: history
        });

        let result, response, text;

        try {
            console.log('🔄 Sending message to Gemini with chat...');
            result = await chat.sendMessage(prompt);
            response = await result.response;
            text = response.text();
            console.log('✅ Response received from chat:', text);

            if (!text || text.trim() === '') {
                console.log('Empty response from chat, attempting fallback generation...');
                if (response.candidates && response.candidates[0]) {
                    const candidate = response.candidates[0];
                    if (candidate.finishReason === 'SAFETY') {
                        return "Maaf, respons diblokir oleh filter keamanan. Coba ajukan pertanyaan dengan cara yang berbeda.";
                    }
                }
                const directResult = await model.generateContent(prompt);
                const directResponse = await directResult.response;
                text = directResponse.text();
                console.log('Response from direct generation fallback:', text);
            }
        } catch (chatError) {
            console.warn('Chat method failed, trying direct generation:', chatError?.message || chatError);
            const directResult = await model.generateContent(prompt);
            const directResponse = await directResult.response;
            text = directResponse.text();
            console.log('Response from fallback direct generation:', text);
        }

        if (!text || text.trim() === '') {
            console.warn('Still empty response after all attempts');
            return "Maaf, saya tidak dapat memberikan respons saat ini. Silakan coba dengan pertanyaan yang lebih spesifik.";
        }

        console.log(`📊 Requests today: ${dailyRequestCount}/${FREE_TIER_LIMITS.DAILY}`);
        return text.trim();

    } catch (error) {
        console.error('❌ Error getting chat response:', error);
        console.error('❌ Error details:', {
            message: error.message,
            name: error.name,
            stack: error.stack
        });
        
        // Check for specific API key errors - try next key if available
        if (error.message.includes('API_KEY') || error.message.includes('API key expired') || error.message.includes('API_KEY_INVALID') || error.message.includes('403') || error.message.includes('401')) {
            console.warn(`⚠️ API Key ${currentApiKeyIndex + 1} failed: ${error.message}`);
            
            // Try switching to next API key
            if (switchToNextApiKey() && retryCount < MAX_RETRIES) {
                console.log(`🔄 Retrying with API key ${currentApiKeyIndex + 1}...`);
                // Reset genAI and availableModels to force re-initialization
                genAI = null;
                availableModels = null;
                // Retry the request
                return getChatResponse(prompt, chatHistory, retryCount + 1);
            }
            
            // All keys failed
            console.error('❌ All API keys have failed');
            console.error('📋 Solusi:');
            console.error('   1. Buka https://aistudio.google.com/app/apikey');
            console.error('   2. Buat API key baru');
            console.error('   3. Tambahkan ke array geminiApiKeys di config/config.js');
            console.error('   4. Refresh halaman');
            return "❌ **Semua API Key Expired atau Tidak Valid**\n\n🔧 **Cara Memperbaiki:**\n\n1. Buka: https://aistudio.google.com/app/apikey\n2. Buat beberapa API key baru\n3. Tambahkan ke array `geminiApiKeys` di file `config/config.js`:\n   ```javascript\n   export const geminiApiKeys = [\n       \"API_KEY_1\",\n       \"API_KEY_2\",\n       \"API_KEY_3\"\n   ];\n   ```\n4. Refresh halaman (F5)\n\n📖 Sistem akan otomatis menggunakan API key yang tersedia.";
        }
        
        // Check for quota errors - try next key if available
        if (error.message.includes('quota') || error.message.includes('429')) {
            console.warn(`⚠️ Quota exceeded for API key ${currentApiKeyIndex + 1}, trying next key...`);
            
            // Try switching to next API key
            if (switchToNextApiKey() && retryCount < MAX_RETRIES) {
                console.log(`🔄 Retrying with API key ${currentApiKeyIndex + 1}...`);
                // Reset genAI and availableModels to force re-initialization
                genAI = null;
                availableModels = null;
                // Retry the request
                return getChatResponse(prompt, chatHistory, retryCount + 1);
            }
            
            // All keys quota exceeded
            console.error('❌ All API keys quota exceeded');
            return "❌ Error: Kuota harian AI telah habis untuk semua API key. Silakan coba lagi besok atau tambahkan API key baru di `config/config.js`.";
        }
        
        const errorInfo = getErrorMessage(error);

        if (errorInfo.type === 'quota' || errorInfo.type === 'server') {
            if (retryCount < MAX_RETRIES) {
                const waitTime = errorInfo.waitTime * (retryCount + 1);
                console.log(`🔄 Retrying in ${waitTime}ms... (${retryCount + 1}/${MAX_RETRIES})`);
                await delay(waitTime);
                return getChatResponse(prompt, chatHistory, retryCount + 1);
            }
        }
        return errorInfo.message;
    }
}

export async function getResponseWithContext(context, prompt, chatHistory = []) {
    try {
        await checkRateLimit();
        const model = await getModelWithFallback();

        const generationConfig = {
            temperature: 0.6,
            topK: 40,
            topP: 0.9,
            maxOutputTokens: 1024,
        };

        const limitedContext = context.substring(0, 2000) + (context.length > 2000 ? '...' : '');

        const contextPrompt = `Berdasarkan dokumen/konten berikut:

${limitedContext}

Pertanyaan: ${prompt}

Berikan analisis yang komprehensif dan praktis berdasarkan konten tersebut. Fokus pada insights yang berguna dan actionable.`;

        const chat = model.startChat({
            generationConfig,
            history: chatHistory.slice(-6)
        });

        const result = await chat.sendMessage(contextPrompt);
        const response = await result.response;
        const text = response.text();

        return text.trim();

    } catch (error) {
        console.error('❌ Error getting context response:', error);
        const errorInfo = getErrorMessage(error);
        return errorInfo.message;
    }
}

// =============================
// Greenhouse Data Analysis Functions
// =============================

/**
 * Analisis data greenhouse dan berikan rekomendasi
 * @param {Object} greenhouseData - Data greenhouse dari user
 * @returns {Promise<Object>} - Analisis dan rekomendasi
 */
export async function analyzeGreenhouseData(greenhouseData) {
    try {
        const analysisPrompt = `
Sebagai konsultan Greenhouse dan Tanaman, analisis data greenhouse berikut:

**Data Greenhouse:**
- Suhu: ${greenhouseData.temperature || 'N/A'}°C
- Kelembaban: ${greenhouseData.humidity || 'N/A'}%
- Level Cahaya: ${greenhouseData.lightLevel || 'N/A'}
- Kelembaban Tanah: ${greenhouseData.soilMoisture || 'N/A'}%
- Jenis Tanaman: ${greenhouseData.plantType || 'N/A'}
- Catatan: ${greenhouseData.notes || 'Tidak ada'}

**Berikan analisis dalam format JSON:**
{
    "conditionAnalysis": {
        "overallStatus": "Status keseluruhan (Optimal/Baik/Perlu Perhatian)",
        "temperatureStatus": "Status suhu",
        "humidityStatus": "Status kelembaban",
        "lightStatus": "Status cahaya",
        "soilStatus": "Status kelembaban tanah"
    },
    "recommendations": [
        "Rekomendasi praktis 1",
        "Rekomendasi praktis 2",
        "Rekomendasi praktis 3"
    ],
    "predictions": {
        "nextHour": "Prediksi kondisi 1 jam ke depan",
        "nextDay": "Prediksi kondisi 1 hari ke depan",
        "riskLevel": "Level risiko (Rendah/Sedang/Tinggi)"
    },
    "actionItems": [
        "Tindakan yang perlu dilakukan 1",
        "Tindakan yang perlu dilakukan 2",
        "Tindakan yang perlu dilakukan 3"
    ]
}

Berikan analisis yang praktis dan bisa diterapkan untuk greenhouse.`;

        const response = await getChatResponse(analysisPrompt);
        
        // Parse JSON response
        try {
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
        } catch (parseError) {
            console.warn('Failed to parse JSON response:', parseError);
        }

        // Fallback jika parsing gagal
        return {
            conditionAnalysis: {
                overallStatus: "Analisis sedang diproses",
                temperatureStatus: "Sedang dianalisis",
                humidityStatus: "Sedang dianalisis",
                lightStatus: "Sedang dianalisis",
                soilStatus: "Sedang dianalisis"
            },
            recommendations: ["Analisis sedang diproses", "Silakan tunggu sebentar"],
            predictions: {
                nextHour: "Prediksi sedang dihitung",
                nextDay: "Prediksi sedang dihitung",
                riskLevel: "Sedang dianalisis"
            },
            actionItems: ["Analisis sedang diproses"],
            rawResponse: response
        };

    } catch (error) {
        console.error('❌ Error analyzing greenhouse data:', error);
        throw new Error(`Gagal menganalisis data greenhouse: ${error.message}`);
    }
}

/**
 * Analisis kondisi optimal greenhouse
 * @param {Object} greenhouseData - Data greenhouse
 * @returns {Object} - Analisis kondisi optimal
 */
export function analyzeGreenhouseCondition(greenhouseData) {
    const temperature = parseFloat(greenhouseData.temperature) || 25;
    const humidity = parseFloat(greenhouseData.humidity) || 60;
    const lightLevel = parseFloat(greenhouseData.lightLevel) || 50;
    const soilMoisture = parseFloat(greenhouseData.soilMoisture) || 50;
    
    // Optimal ranges untuk greenhouse
    const optimalRanges = {
        temperature: { min: 20, max: 30, optimal: 25 },
        humidity: { min: 40, max: 70, optimal: 60 },
        lightLevel: { min: 40, max: 80, optimal: 60 },
        soilMoisture: { min: 40, max: 70, optimal: 55 }
    };
    
    // Hitung score untuk setiap parameter (0-100)
    function calculateParameterScore(value, range) {
        if (value >= range.min && value <= range.max) {
            const distanceFromOptimal = Math.abs(value - range.optimal);
            const maxDistance = Math.max(range.optimal - range.min, range.max - range.optimal);
            return Math.max(0, 100 - (distanceFromOptimal / maxDistance) * 50);
        } else {
            const distance = value < range.min ? range.min - value : value - range.max;
            return Math.max(0, 50 - distance * 5);
        }
    }
    
    const tempScore = calculateParameterScore(temperature, optimalRanges.temperature);
    const humidityScore = calculateParameterScore(humidity, optimalRanges.humidity);
    const lightScore = calculateParameterScore(lightLevel, optimalRanges.lightLevel);
    const soilScore = calculateParameterScore(soilMoisture, optimalRanges.soilMoisture);
    
    // Overall health score
    const overallScore = (tempScore + humidityScore + lightScore + soilScore) / 4;
    
    // Determine status
    let status = 'Optimal';
    if (overallScore < 60) status = 'Perlu Perhatian';
    else if (overallScore < 80) status = 'Baik';

    return {
        overallScore: Math.round(overallScore),
        status,
        parameters: {
            temperature: { value: temperature, score: Math.round(tempScore), optimal: optimalRanges.temperature },
            humidity: { value: humidity, score: Math.round(humidityScore), optimal: optimalRanges.humidity },
            lightLevel: { value: lightLevel, score: Math.round(lightScore), optimal: optimalRanges.lightLevel },
            soilMoisture: { value: soilMoisture, score: Math.round(soilScore), optimal: optimalRanges.soilMoisture }
        }
    };
}

/**
 * Generate rekomendasi optimasi untuk greenhouse
 * @param {Object} greenhouseData - Data greenhouse
 * @returns {Array} - Array rekomendasi optimasi
 */
export function generateOptimizationRecommendations(greenhouseData) {
    const condition = analyzeGreenhouseCondition(greenhouseData);
    const recommendations = [];
    
    // Rekomendasi berdasarkan kondisi suhu
    if (condition.parameters.temperature.score < 70) {
        if (condition.parameters.temperature.value < condition.parameters.temperature.optimal.min) {
            recommendations.push({
                priority: 'high',
                action: 'Tingkatkan Suhu',
                description: 'Suhu terlalu rendah. Pertimbangkan menutup ventilasi atau menyalakan pemanas.',
                impact: 'Meningkatkan pertumbuhan tanaman'
            });
        } else {
            recommendations.push({
                priority: 'high',
                action: 'Turunkan Suhu',
                description: 'Suhu terlalu tinggi. Nyalakan kipas dan buka ventilasi untuk pendinginan.',
                impact: 'Mencegah stress panas pada tanaman'
            });
        }
    }
    
    // Rekomendasi berdasarkan kelembaban
    if (condition.parameters.humidity.score < 70) {
        if (condition.parameters.humidity.value < condition.parameters.humidity.optimal.min) {
            recommendations.push({
                priority: 'medium',
                action: 'Tingkatkan Kelembaban',
                description: 'Kelembaban terlalu rendah. Gunakan humidifier atau semprotkan air.',
                impact: 'Mencegah dehidrasi tanaman'
            });
        } else {
            recommendations.push({
                priority: 'high',
                action: 'Turunkan Kelembaban',
                description: 'Kelembaban terlalu tinggi. Tingkatkan sirkulasi udara untuk mencegah jamur.',
                impact: 'Mencegah risiko penyakit jamur'
            });
        }
    }
    
    // Rekomendasi berdasarkan cahaya
    if (condition.parameters.lightLevel.score < 70) {
        if (condition.parameters.lightLevel.value < condition.parameters.lightLevel.optimal.min) {
            recommendations.push({
                priority: 'medium',
                action: 'Tingkatkan Paparan Cahaya',
                description: 'Level cahaya terlalu rendah. Buka tirai atau tambahkan lampu grow light.',
                impact: 'Meningkatkan fotosintesis'
            });
        } else {
            recommendations.push({
                priority: 'low',
                action: 'Kurangi Paparan Cahaya',
                description: 'Level cahaya terlalu tinggi. Tutup sebagian tirai untuk menghindari stress.',
                impact: 'Mencegah daun terbakar'
            });
        }
    }
    
    // Rekomendasi berdasarkan kelembaban tanah
    if (condition.parameters.soilMoisture.score < 70) {
        if (condition.parameters.soilMoisture.value < condition.parameters.soilMoisture.optimal.min) {
            recommendations.push({
                priority: 'high',
                action: 'Siram Tanaman',
                description: 'Kelembaban tanah terlalu rendah. Lakukan penyiraman sesuai jadwal.',
                impact: 'Mencegah kekeringan akar'
            });
        } else {
            recommendations.push({
                priority: 'medium',
                action: 'Kurangi Penyiraman',
                description: 'Kelembaban tanah terlalu tinggi. Kurangi frekuensi penyiraman.',
                impact: 'Mencegah busuk akar'
            });
        }
    }
    
    // Jika semua optimal
    if (recommendations.length === 0) {
        recommendations.push({
            priority: 'info',
            action: 'Kondisi Optimal',
            description: 'Semua parameter dalam kondisi optimal. Lanjutkan monitoring rutin.',
            impact: 'Pertumbuhan tanaman optimal'
        });
    }
    
    return recommendations;
}

export function getQuotaStatus() {
    return {
        dailyUsed: dailyRequestCount,
        dailyLimit: FREE_TIER_LIMITS.DAILY,
        remaining: FREE_TIER_LIMITS.DAILY - dailyRequestCount,
        resetTime: 'midnight UTC'
    };
}

// Export functions for window access
window.getChatResponse = getChatResponse;
window.getResponseWithContext = getResponseWithContext;
window.getQuotaStatus = getQuotaStatus;
window.analyzeGreenhouseData = analyzeGreenhouseData;
window.analyzeGreenhouseCondition = analyzeGreenhouseCondition;
window.generateOptimizationRecommendations = generateOptimizationRecommendations;
window.getUserDataContext = getUserDataContext;

/**
 * Analyze greenhouse data for AI recommendations
 * @param {string} prompt - The analysis prompt
 * @returns {Promise<string>} - AI analysis result
 */
async function analyzeGreenhouseActivity(prompt) {
    try {
        console.log('🤖 Starting greenhouse data analysis...');
        
        // Check quota
        if (dailyRequestCount >= FREE_TIER_LIMITS.DAILY) {
            throw new Error('Daily quota exceeded. Please try again tomorrow.');
        }
        
        // Increment counter
        dailyRequestCount++;
        localStorage.setItem('gemini_daily_count', dailyRequestCount.toString());
        
        // Use the existing getChatResponse function
        const response = await getChatResponse(prompt);
        
        console.log('✅ Greenhouse data analysis completed');
        return response;
        
    } catch (error) {
        console.error('❌ Error in greenhouse data analysis:', error);
        throw error;
    }
}

// Export for module usage
export { getUserDataContext, analyzeGreenhouseActivity };

console.log('✅ Improved Gemini service module loaded (2.0-flash prioritized)');
console.log(`📊 Current quota: ${dailyRequestCount}/${FREE_TIER_LIMITS.DAILY} requests used today`);
