// config.js - Firebase Configuration untuk TOMITECH Greenhouse Monitoring
// ====================================================================
// INSTRUKSI: Ganti nilai-nilai di bawah ini dengan data dari Firebase Console
// ====================================================================

export const firebaseConfig = {
    // Dapatkan dari Firebase Console > Project Settings > Your apps > Web app
    apiKey: "YOUR_API_KEY_HERE",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// Gemini API Key (untuk AI Assistant)
// Dapatkan dari: https://makersuite.google.com/app/apikey
export const geminiApiKey = "YOUR_GEMINI_API_KEY_HERE";

// App Configuration untuk TOMITECH
export const appConfig = {
    maxRetries: 3,
    retryDelay: 1000,
    maxTokens: 2048,
    temperature: 0.7,
    // Konfigurasi Greenhouse
    wateringTime: "07:00", // Waktu penyiraman standar (7 pagi)
    sensorUpdateInterval: 60000 // Update sensor setiap 60 detik (1 menit)
};

// Notification function
export function showNotification(message, type = 'info') {
    const existingNotif = document.getElementById('api-notification');
    if (existingNotif) {
        existingNotif.remove();
    }
    
    const colors = {
        success: 'bg-green-100 text-green-800 border-green-200',
        error: 'bg-red-100 text-red-800 border-red-200',
        warning: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        info: 'bg-blue-100 text-blue-800 border-blue-200'
    };
    
    const notificationHTML = `
        <div id="api-notification" class="fixed top-4 right-4 z-50 ${colors[type]} border rounded-lg p-4 shadow-lg max-w-sm">
            <div class="flex items-center justify-between">
                <p class="text-sm font-medium">${message}</p>
                <button onclick="document.getElementById('api-notification').remove()" class="ml-3 text-lg leading-none">&times;</button>
            </div>
        </div>`;
    
    document.body.insertAdjacentHTML('beforeend', notificationHTML);
    
    setTimeout(() => {
        const notif = document.getElementById('api-notification');
        if (notif) notif.remove();
    }, 5000);
}

// Export untuk global access
window.showNotification = showNotification;

