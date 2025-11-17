// =================================================================
// CONTOH INTEGRASI FIREBASE KE COBA2.INO
// Copy bagian yang diperlukan ke file coba2.ino Anda
// =================================================================

// =================================================================
// BAGIAN 1: TAMBAHKAN DI BAGIAN ATAS (setelah include yang sudah ada)
// =================================================================

// Tambahkan include Firebase
#include <FirebaseESP32.h>
#include "firebase_config.h"  // File konfigurasi Firebase (buat file baru)

// Firebase objects
FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;

// =================================================================
// BAGIAN 2: TAMBAHKAN FUNGSI SETUP FIREBASE
// =================================================================

void setupFirebase() {
    Serial.println("🔥 Initializing Firebase...");
    
    // Set Firebase Database URL
    config.database_url = FIREBASE_DATABASE_URL;
    
    // Setup service account authentication
    config.service_account.data.client_email = FIREBASE_CLIENT_EMAIL;
    config.service_account.data.project_id = FIREBASE_PROJECT_ID;
    config.service_account.data.private_key = FIREBASE_PRIVATE_KEY;
    
    // Initialize Firebase
    Firebase.begin(&config, &auth);
    Firebase.reconnectWiFi(true);
    
    // Set buffer size untuk SSL
    fbdo.setBSSLBufferSize(4096, 1024);
    
    // Set timeout
    fbdo.setResponseSize(4096);
    
    Serial.println("✅ Firebase initialized successfully");
}

// =================================================================
// BAGIAN 3: FUNGSI UNTUK MENGIRIM DATA KE FIREBASE
// =================================================================

void sendDataToFirebase() {
    if (!Firebase.ready()) {
        Serial.println("⚠️ Firebase not ready");
        return;
    }
    
    // Path di Firebase: /sensor_data/{timestamp}
    String path = "/sensor_data/" + String(millis());
    
    // Buat JSON object
    FirebaseJson json;
    json.set("temperature", temperature);
    json.set("humidity", humidity);
    json.set("soilMoisture", soilMoisturePercent);
    json.set("soil_raw", soil_raw);
    json.set("fan1", fan1State);
    json.set("fan2", fan2State);
    json.set("fan3", fan3State);
    json.set("fan4", fan4State);
    json.set("pump", pumpState);
    json.set("mode", systemMode);
    json.set("timestamp", millis());
    
    // Kirim ke Firebase
    if (Firebase.setJSON(fbdo, path, json)) {
        Serial.println("✅ Data berhasil terkirim ke Firebase");
    } else {
        Serial.printf("❌ Firebase Error: %s\n", fbdo.errorReason().c_str());
    }
}

// =================================================================
// BAGIAN 4: UPDATE FUNGSI WiFiEvent (tambahkan setupFirebase)
// =================================================================

void WiFiEvent(WiFiEvent_t event) {
    switch (event) {
        case ARDUINO_EVENT_WIFI_STA_DISCONNECTED: 
            Serial.println("WiFi Terputus!");
            stopWebServer(); 
            break;
        case ARDUINO_EVENT_WIFI_STA_GOT_IP: 
            Serial.println("WiFi Terhubung!");
            Serial.print("IP: ");
            Serial.println(WiFi.localIP());
            startWebServer();
            setupFirebase(); // ← TAMBAHKAN BARIS INI
            break;
        default: break;
    }
}

// =================================================================
// BAGIAN 5: UPDATE FUNGSI loop() (tambahkan pengiriman ke Firebase)
// =================================================================

void loop() {
    static unsigned long lastSensorRead = 0;
    static unsigned long lastFirebaseUpdate = 0; // ← TAMBAHKAN VARIABEL INI
    
    if (millis() - lastSensorRead >= 2000) {
        lastSensorRead = millis();
    
        // ... kode baca sensor yang sudah ada ...
        
        // Kirim ke Firebase setiap 10 detik (atau sesuai kebutuhan)
        if (millis() - lastFirebaseUpdate >= 10000) { // ← TAMBAHKAN BLOK INI
            lastFirebaseUpdate = millis();
            sendDataToFirebase();
        }
        
        // ... kode lainnya yang sudah ada ...
    }
    
    ws.cleanupClients();
}

// =================================================================
// ALTERNATIF: Mengirim data per user/greenhouse
// =================================================================

void sendDataToFirebaseWithUser(String userId, String greenhouseId) {
    if (!Firebase.ready()) {
        return;
    }
    
    // Path: /users/{userId}/greenhouses/{greenhouseId}/sensor_data/{timestamp}
    String path = "/users/" + userId + "/greenhouses/" + greenhouseId + "/sensor_data/" + String(millis());
    
    FirebaseJson json;
    json.set("temperature", temperature);
    json.set("humidity", humidity);
    json.set("soilMoisture", soilMoisturePercent);
    json.set("timestamp", Firebase.getCurrentTime());
    
    if (Firebase.setJSON(fbdo, path, json)) {
        Serial.println("✅ Data berhasil terkirim ke Firebase");
    } else {
        Serial.printf("❌ Firebase Error: %s\n", fbdo.errorReason().c_str());
    }
}

// =================================================================
// CATATAN PENTING:
// =================================================================
// 1. Install library: Firebase ESP32 Client by Mobizt
// 2. Buat file firebase_config.h dengan credentials Firebase
// 3. Pastikan WiFi sudah terhubung sebelum setup Firebase
// 4. Data akan tersimpan di Firebase Realtime Database
// 5. Cek Firebase Console untuk melihat data yang masuk
// =================================================================

