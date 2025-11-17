#ifndef FIREBASE_CONFIG_H
#define FIREBASE_CONFIG_H

// =================================================================
// KONFIGURASI FIREBASE REALTIME DATABASE
// =================================================================

// Firebase Realtime Database URL
// Dapatkan dari: Firebase Console → Realtime Database → Data
// Format: https://PROJECT_ID-default-rtdb.REGION.firebasedatabase.app/
#define FIREBASE_DATABASE_URL "https://tomitech-id-default-rtdb.asia-southeast1.firebasedatabase.app/"

// Firebase Service Account Credentials
// Dapatkan dari: Firebase Console → Project Settings → Service Accounts → Generate New Private Key
// Download file JSON, lalu copy nilai-nilai berikut:

// Project ID (dari file JSON: "project_id")
#define FIREBASE_PROJECT_ID "tomitech-id"

// Client Email (dari file JSON: "client_email")
#define FIREBASE_CLIENT_EMAIL "firebase-adminsdk-xxxxx@tomitech-id.iam.gserviceaccount.com"

// Private Key (dari file JSON: "private_key")
// PENTING: Pastikan ada \n di setiap baris!
#define FIREBASE_PRIVATE_KEY "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n...\n-----END PRIVATE KEY-----\n"

// =================================================================
// CARA MENDAPATKAN CREDENTIALS:
// =================================================================
// 1. Buka Firebase Console: https://console.firebase.google.com
// 2. Pilih project TOMITECH
// 3. Klik ikon gear (⚙️) → Project Settings
// 4. Tab "Service Accounts"
// 5. Klik "Generate New Private Key"
// 6. Download file JSON
// 7. Buka file JSON dengan text editor
// 8. Copy nilai:
//    - "project_id" → FIREBASE_PROJECT_ID
//    - "client_email" → FIREBASE_CLIENT_EMAIL
//    - "private_key" → FIREBASE_PRIVATE_KEY (ganti \n dengan \n di kode)
// =================================================================

#endif

