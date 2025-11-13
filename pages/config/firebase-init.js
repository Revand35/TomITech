// firebase-init.js
import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";
import { firebaseConfig } from "./config.js";

// ✅ Inisialisasi Firebase - Check jika sudah ada app dengan nama DEFAULT
let app;
try {
    const existingApps = getApps();
    if (existingApps.length > 0) {
        // Gunakan app yang sudah ada
        app = existingApps[0];
        console.log('✅ Using existing Firebase app');
    } else {
        // Inisialisasi app baru
        app = initializeApp(firebaseConfig);
        console.log('✅ Firebase app initialized');
    }
} catch (error) {
    console.error('❌ Error initializing Firebase:', error);
    // Fallback: coba initialize lagi
    try {
        app = initializeApp(firebaseConfig);
        console.log('✅ Firebase app initialized (fallback)');
    } catch (fallbackError) {
        console.error('❌ Failed to initialize Firebase:', fallbackError);
        throw fallbackError;
    }
}

const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// ✅ Ekspor
export { app, auth, db, storage };
