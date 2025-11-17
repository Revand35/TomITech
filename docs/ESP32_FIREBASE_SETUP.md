# Setup Firebase Realtime Database untuk ESP32 - TOMITECH

## Overview
Panduan ini menjelaskan cara menghubungkan ESP32 ke Firebase Realtime Database untuk mengirim data sensor secara real-time.

## Prerequisites
1. Firebase project sudah dibuat
2. Realtime Database sudah diaktifkan
3. ESP32 sudah terhubung ke WiFi

---

## Langkah 1: Setup Firebase Project

### 1.1 Buat/Login ke Firebase Console
1. Buka https://console.firebase.google.com
2. Pilih project TOMITECH Anda (atau buat baru)

### 1.2 Aktifkan Realtime Database
1. Di Firebase Console, klik **Realtime Database**
2. Klik **Create Database**
3. Pilih lokasi: **asia-southeast1** (Singapore) atau sesuai kebutuhan
4. Pilih mode: **Start in test mode** (untuk development)
5. Klik **Enable**

### 1.3 Dapatkan Database URL
1. Setelah database dibuat, copy **Database URL**
   - Format: `https://tomitech-id-default-rtdb.asia-southeast1.firebasedatabase.app/`
   - Simpan URL ini untuk digunakan di ESP32

### 1.4 Generate Service Account Key (untuk autentikasi)
1. Di Firebase Console, klik **Project Settings** (ikon gear)
2. Tab **Service Accounts**
3. Klik **Generate New Private Key**
4. Download file JSON (ini adalah credentials untuk ESP32)
5. **PENTING**: Simpan file ini dengan aman, jangan commit ke Git!

---

## Langkah 2: Install Library Firebase di Arduino IDE

### 2.1 Install Firebase ESP32 Client
1. Buka Arduino IDE
2. **Tools → Manage Libraries** (Ctrl+Shift+I)
3. Cari: `Firebase ESP32 Client`
4. Install: **Firebase ESP32 Client by Mobizt**
5. Versi: Pilih yang terbaru

### 2.2 Library yang akan terinstall otomatis:
- Firebase ESP32 Client
- Firebase Arduino Client Library for ESP8266 and ESP32

---

## Langkah 3: Setup Firebase di ESP32

### 3.1 Tambahkan Firebase credentials ke kode

Buat file baru `firebase_config.h` di folder sketch Anda:

```cpp
#ifndef FIREBASE_CONFIG_H
#define FIREBASE_CONFIG_H

// Firebase Realtime Database URL
#define FIREBASE_DATABASE_URL "https://tomitech-id-default-rtdb.asia-southeast1.firebasedatabase.app/"

// Firebase Service Account Credentials
// Dapatkan dari Firebase Console → Project Settings → Service Accounts → Generate New Private Key
#define FIREBASE_PROJECT_ID "tomitech-id"
#define FIREBASE_CLIENT_EMAIL "firebase-adminsdk-xxxxx@tomitech-id.iam.gserviceaccount.com"
#define FIREBASE_PRIVATE_KEY "-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----\n"

#endif
```

**Cara mendapatkan credentials:**
1. Buka file JSON yang didownload dari Firebase Console
2. Copy nilai:
   - `project_id` → `FIREBASE_PROJECT_ID`
   - `client_email` → `FIREBASE_CLIENT_EMAIL`
   - `private_key` → `FIREBASE_PRIVATE_KEY` (pastikan ada `\n` di setiap baris)

### 3.2 Update kode ESP32

Tambahkan di bagian atas `coba2.ino`:

```cpp
// Tambahkan include Firebase
#include <FirebaseESP32.h>
#include "firebase_config.h"

// Firebase objects
FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;
```

### 3.3 Setup Firebase di fungsi `setup()`

Tambahkan setelah WiFi terhubung:

```cpp
void setupFirebase() {
    // Set Firebase credentials
    config.database_url = FIREBASE_DATABASE_URL;
    config.signer.tokens.legacy_token = ""; // Tidak digunakan untuk service account
    
    // Setup service account authentication
    config.service_account.data.client_email = FIREBASE_CLIENT_EMAIL;
    config.service_account.data.project_id = FIREBASE_PROJECT_ID;
    config.service_account.data.private_key = FIREBASE_PRIVATE_KEY;
    
    // Initialize Firebase
    Firebase.begin(&config, &auth);
    Firebase.reconnectWiFi(true);
    
    // Set buffer size
    fbdo.setBSSLBufferSize(4096, 1024);
    
    Serial.println("✅ Firebase initialized");
}
```

Panggil di `setup()` setelah `startWebServer()`:

```cpp
void setup() {
    // ... kode yang sudah ada ...
    
    WiFi.onEvent(WiFiEvent);
    WiFi.begin(ssid, password);
    
    Serial.println("Hardware diinisialisasi. Menunggu WiFi...");
}

void WiFiEvent(WiFiEvent_t event) {
    switch (event) {
        case ARDUINO_EVENT_WIFI_STA_GOT_IP: 
            Serial.println("WiFi Terhubung!");
            Serial.print("IP: ");
            Serial.println(WiFi.localIP());
            startWebServer();
            setupFirebase(); // ← TAMBAHKAN INI
            break;
        // ... kode lainnya ...
    }
}
```

---

## Langkah 4: Kirim Data Sensor ke Firebase

### 4.1 Fungsi untuk mengirim data ke Firebase

Tambahkan fungsi ini di kode Anda:

```cpp
void sendDataToFirebase() {
    if (Firebase.ready()) {
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
            Serial.println("✅ Data berhasil dikirim ke Firebase");
        } else {
            Serial.printf("❌ Error: %s\n", fbdo.errorReason().c_str());
        }
    }
}
```

### 4.2 Panggil fungsi di `loop()`

Update fungsi `loop()` untuk mengirim data setiap interval tertentu:

```cpp
void loop() {
    static unsigned long lastSensorRead = 0;
    static unsigned long lastFirebaseUpdate = 0;
    
    if (millis() - lastSensorRead >= 2000) {
        lastSensorRead = millis();
        
        // ... kode baca sensor yang sudah ada ...
        
        // Kirim ke Firebase setiap 10 detik
        if (millis() - lastFirebaseUpdate >= 10000) {
            lastFirebaseUpdate = millis();
            sendDataToFirebase();
        }
        
        // ... kode lainnya ...
    }
    
    ws.cleanupClients();
}
```

---

## Langkah 5: Struktur Data di Firebase

Data akan tersimpan di Firebase dengan struktur:

```
/sensor_data/
  ├── 1234567890/
  │   ├── temperature: 30.8
  │   ├── humidity: 74.5
  │   ├── soilMoisture: 45.2
  │   ├── soil_raw: 2500
  │   ├── fan1: true
  │   ├── fan2: false
  │   ├── fan3: false
  │   ├── fan4: false
  │   ├── pump: true
  │   ├── mode: 1
  │   └── timestamp: 1234567890
  ├── 1234567891/
  │   └── ...
  └── ...
```

---

## Alternatif: Menggunakan User ID (untuk multi-user)

Jika ingin menyimpan data per user:

```cpp
void sendDataToFirebase(String userId, String greenhouseId) {
    if (Firebase.ready()) {
        // Path: /users/{userId}/greenhouses/{greenhouseId}/sensor_data/{timestamp}
        String path = "/users/" + userId + "/greenhouses/" + greenhouseId + "/sensor_data/" + String(millis());
        
        FirebaseJson json;
        json.set("temperature", temperature);
        json.set("humidity", humidity);
        json.set("soilMoisture", soilMoisturePercent);
        json.set("timestamp", Firebase.getCurrentTime());
        
        if (Firebase.setJSON(fbdo, path, json)) {
            Serial.println("✅ Data berhasil dikirim ke Firebase");
        }
    }
}
```

---

## Troubleshooting

### Error: "Firebase not ready"
- Pastikan WiFi sudah terhubung
- Pastikan Firebase credentials benar
- Cek koneksi internet ESP32

### Error: "Permission denied"
- Cek Firebase Realtime Database Rules
- Pastikan service account memiliki akses

### Error: "SSL connection failed"
- Pastikan library Firebase ESP32 Client terinstall
- Cek buffer size: `fbdo.setBSSLBufferSize(4096, 1024);`

### Data tidak muncul di Firebase
- Cek Serial Monitor untuk error messages
- Pastikan path Firebase benar
- Cek Firebase Console → Realtime Database

---

## Firebase Database Rules (untuk development)

Di Firebase Console → Realtime Database → Rules:

```json
{
  "rules": {
    ".read": "auth != null",
    ".write": "auth != null",
    "sensor_data": {
      ".read": true,
      ".write": true
    }
  }
}
```

**PENTING**: Rules di atas hanya untuk development. Untuk production, gunakan rules yang lebih ketat!

---

## Contoh Kode Lengkap

Lihat file `coba2_firebase.ino` untuk contoh kode lengkap dengan integrasi Firebase.

