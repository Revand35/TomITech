// config.js - Firebase Configuration untuk TOMITECH Greenhouse Monitoring
// Updated: 2025-01-XX
export const firebaseConfig = {
    apiKey: "AIzaSyDpGCx73WhbOqW7hbo3jOPPdMSko6e2DMw",
    authDomain: "tomitech-id.firebaseapp.com",
    projectId: "tomitech-id",
    storageBucket: "tomitech-id.firebasestorage.app",
    messagingSenderId: "755011279325",
    appId: "1:755011279325:web:c00587f50e985528047e34"
};

// Gemini API Key
export const geminiApiKey = "AIzaSyBKCLB3d6ucJOMjnShtQogMFh6OHVL2Mck";

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