// ai-summary-service.js
// Service untuk menghasilkan kesimpulan harian dari AI Assistant
// ===========================================================

import { geminiApiKey } from '../../config/config.js';
import { 
    getGreenhousePlants,
    getDailyLog,
    getLatestSensorData,
    saveAISummary
} from './greenhouse-service.js';

/**
 * Generate AI summary untuk hari ini
 * Menggabungkan data tanaman, penyiraman, dan sensor untuk membuat kesimpulan
 */
export async function generateDailyAISummary(userId, greenhouseId) {
    try {
        // Get all data for today
        const [plantsResult, dailyLogResult, sensorResult] = await Promise.all([
            getGreenhousePlants(greenhouseId),
            getDailyLog(greenhouseId, new Date()),
            getLatestSensorData(greenhouseId)
        ]);
        
        if (!plantsResult.success) {
            throw new Error('Failed to get plants data');
        }
        
        const plants = plantsResult.data || [];
        const dailyLog = dailyLogResult.success ? dailyLogResult.data : null;
        const sensorData = sensorResult.success ? sensorResult.data : null;
        
        // Prepare context for AI
        const context = buildContextForAI(plants, dailyLog, sensorData);
        
        // Generate summary using Gemini AI
        const summary = await callGeminiAI(context);
        
        // Parse AI response
        const parsedSummary = parseAIResponse(summary);
        
        // Save to Firestore
        const saveResult = await saveAISummary(userId, greenhouseId, parsedSummary);
        
        if (!saveResult.success) {
            throw new Error('Failed to save AI summary');
        }
        
        return {
            success: true,
            data: parsedSummary
        };
        
    } catch (error) {
        console.error('Error generating AI summary:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Build context untuk AI dari data yang dikumpulkan
 */
function buildContextForAI(plants, dailyLog, sensorData) {
    const today = new Date();
    const dateStr = today.toLocaleDateString('id-ID', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
    
    let context = `Anda adalah AI Assistant untuk AgriHouse Greenhouse Monitoring System.\n\n`;
    context += `Tanggal: ${dateStr}\n\n`;
    
    // Plants information
    context += `=== DATA TANAMAN ===\n`;
    if (plants.length === 0) {
        context += `Belum ada tanaman yang ditanam di greenhouse.\n\n`;
    } else {
        context += `Total tanaman aktif: ${plants.length}\n\n`;
        
        // Group by type
        const sayur = plants.filter(p => p.plantType === 'sayur');
        const buah = plants.filter(p => p.plantType === 'buah');
        
        if (sayur.length > 0) {
            context += `Sayuran (${sayur.length}):\n`;
            sayur.forEach(plant => {
                context += `- ${plant.plantName} (ditanam: ${formatDate(plant.plantedDate)})\n`;
                if (plant.lastWatered) {
                    context += `  Terakhir disiram: ${formatDate(plant.lastWatered)}\n`;
                }
                context += `  Total penyiraman: ${plant.totalWaterings}x\n`;
            });
            context += `\n`;
        }
        
        if (buah.length > 0) {
            context += `Buah-buahan (${buah.length}):\n`;
            buah.forEach(plant => {
                context += `- ${plant.plantName} (ditanam: ${formatDate(plant.plantedDate)})\n`;
                if (plant.lastWatered) {
                    context += `  Terakhir disiram: ${formatDate(plant.lastWatered)}\n`;
                }
                context += `  Total penyiraman: ${plant.totalWaterings}x\n`;
            });
            context += `\n`;
        }
    }
    
    // Daily log information
    context += `=== LOG HARIAN ===\n`;
    if (dailyLog) {
        context += `Status penyiraman pukul 7 pagi: ${dailyLog.wateredAt7AM ? 'Sudah disiram ✓' : 'Belum disiram ✗'}\n`;
        if (dailyLog.wateringTime) {
            context += `Waktu penyiraman: ${formatDateTime(dailyLog.wateringTime)}\n`;
        }
        if (dailyLog.plantsWatered && dailyLog.plantsWatered.length > 0) {
            context += `Tanaman yang disiram: ${dailyLog.plantsWatered.length} tanaman\n`;
        }
        if (dailyLog.notes) {
            context += `Catatan: ${dailyLog.notes}\n`;
        }
    } else {
        context += `Belum ada log untuk hari ini.\n`;
    }
    context += `\n`;
    
    // Sensor data
    context += `=== DATA SENSOR ===\n`;
    if (sensorData) {
        context += `Data terbaru: ${formatDateTime(sensorData.timestamp)}\n`;
        if (sensorData.humidity !== null) {
            context += `Kelembaban udara: ${sensorData.humidity}%\n`;
        }
        if (sensorData.lightLevel !== null) {
            context += `Level cahaya: ${sensorData.lightLevel}\n`;
        }
        if (sensorData.temperature !== null) {
            context += `Suhu: ${sensorData.temperature}°C\n`;
        }
    } else {
        context += `Belum ada data sensor.\n`;
    }
    context += `\n`;
    
    // Instructions for AI
    context += `\n=== TUGAS ANDA ===\n`;
    context += `Berdasarkan data di atas, buatkan kesimpulan harian yang mencakup:\n`;
    context += `1. Ringkasan kondisi greenhouse hari ini\n`;
    context += `2. Analisis status penyiraman dan tanaman\n`;
    context += `3. Insight penting berdasarkan data sensor (jika ada)\n`;
    context += `4. Rekomendasi untuk perawatan tanaman (jika diperlukan)\n`;
    context += `5. Catatan khusus atau peringatan (jika ada)\n\n`;
    context += `Format respons dalam JSON dengan struktur:\n`;
    context += `{\n`;
    context += `  "summary": "Ringkasan singkat dalam 2-3 kalimat",\n`;
    context += `  "insights": ["insight 1", "insight 2", ...],\n`;
    context += `  "recommendations": ["rekomendasi 1", "rekomendasi 2", ...]\n`;
    context += `}\n`;
    context += `\nGunakan bahasa Indonesia yang ramah dan mudah dipahami.`;
    
    return context;
}

/**
 * Call Gemini AI API
 */
async function callGeminiAI(context) {
    try {
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${geminiApiKey}`;
        
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: context
                    }]
                }],
                generationConfig: {
                    temperature: 0.7,
                    topK: 40,
                    topP: 0.95,
                    maxOutputTokens: 2048,
                }
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || 'Failed to call Gemini API');
        }
        
        const data = await response.json();
        
        if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
            throw new Error('Invalid response from Gemini API');
        }
        
        return data.candidates[0].content.parts[0].text;
        
    } catch (error) {
        console.error('Error calling Gemini API:', error);
        throw error;
    }
}

/**
 * Parse AI response menjadi structured data
 */
function parseAIResponse(aiResponse) {
    try {
        // Try to extract JSON from response
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
        
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            return {
                summary: parsed.summary || aiResponse,
                insights: parsed.insights || [],
                recommendations: parsed.recommendations || []
            };
        }
        
        // If no JSON found, return as summary
        return {
            summary: aiResponse,
            insights: [],
            recommendations: []
        };
        
    } catch (error) {
        console.error('Error parsing AI response:', error);
        // Fallback: return raw response as summary
        return {
            summary: aiResponse,
            insights: [],
            recommendations: []
        };
    }
}

/**
 * Format date helper
 */
function formatDate(date) {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });
}

/**
 * Format date time helper
 */
function formatDateTime(date) {
    if (!date) return 'N/A';
    return new Date(date).toLocaleString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

