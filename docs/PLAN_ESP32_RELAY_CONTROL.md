# Planning: ESP32 Relay Control & Mode Management

## 📋 Overview
Dokumen ini menjelaskan requirement dan spesifikasi yang perlu diimplementasikan di **ESP32** untuk mendukung fitur Mode Otomatis dan Mode Manual di aplikasi web TOMITECH.

**Target:** Developer ESP32 (Teman Anda)

---

## 🎯 Tujuan
ESP32 perlu memiliki kemampuan untuk:
1. **Mode Otomatis** - Mengikuti sensor secara otomatis (contoh: suhu > 30°C → kipas menyala)
2. **Mode Manual** - Mengabaikan sensor, hanya mengikuti perintah dari web
3. **Mode Switching** - Bisa diubah dari web melalui API endpoint

---

## 🔌 Spesifikasi Relay

### Total: 7 Channel Relay
1. **Relay Kipas 1** (Fan 1)
2. **Relay Kipas 2** (Fan 2)
3. **Relay Exhaust 1** (Exhaust Fan 1)
4. **Relay Exhaust 2** (Exhaust Fan 2)
5. **Relay Pompa** (Water Pump)
6. **Relay Valve A** (Valve A)
7. **Relay Valve B** (Valve B)

---

## 🔄 Logika Mode

### Mode Otomatis (ESP32 Autonomous)
- **ESP32 mengikuti sensor secara otomatis**
- ESP32 membuat keputusan sendiri berdasarkan sensor
- Web hanya monitoring, tidak mengirim perintah relay
- **Contoh logika yang diharapkan:**
  - Suhu > 30°C → Kipas 1 & 2 menyala
  - Suhu < 25°C → Kipas 1 & 2 mati
  - Humidity > 80% → Exhaust 1 & 2 menyala
  - Humidity < 70% → Exhaust 1 & 2 mati
  - Soil Moisture < 40% → Pompa + Valve A + Valve B menyala
  - Soil Moisture > 60% → Pompa + Valve A + Valve B mati

### Mode Manual (Web Controlled)
- **ESP32 mengabaikan sensor**, hanya mengikuti perintah dari web
- ESP32 hanya eksekusi perintah, tidak membuat keputusan sendiri
- Web mengirim perintah relay ke ESP32
- **Contoh:** Suhu > 30°C tapi kipas tetap mati (kecuali user klik button di web)

---

## 🌐 API Endpoint Requirements

### 1. Endpoint: Set Mode (Auto/Manual)

**Endpoint:** `POST /api/mode`

**Request:**
```
POST http://{ESP32_IP}/api/mode
Content-Type: application/json

{
  "mode": "auto" | "manual"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Mode updated",
  "mode": "auto" | "manual",
  "previousMode": "auto" | "manual"
}
```

**Response (Error):**
```json
{
  "error": "Invalid mode"
}
```

**CORS Headers Required:**
```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: POST, OPTIONS
Access-Control-Allow-Headers: Content-Type
```

**OPTIONS Request Handling:**
- Jika method = `OPTIONS`, return `200 OK` dengan empty body
- Ini untuk CORS preflight request

---

### 2. Endpoint: Get Current Mode

**Endpoint:** `GET /api/mode`

**Request:**
```
GET http://{ESP32_IP}/api/mode
```

**Response:**
```json
{
  "mode": "auto" | "manual",
  "timestamp": "2025-11-26T22:30:00Z"  // ISO 8601 format
}
```

**CORS Headers Required:**
```
Access-Control-Allow-Origin: *
```

---

### 3. Endpoint: Control Relay

**Endpoint:** `POST /api/relay`

**Request:**
```
POST http://{ESP32_IP}/api/relay
Content-Type: application/json

{
  "relays": {
    "fan1": true/false,      // Relay Kipas 1
    "fan2": true/false,      // Relay Kipas 2
    "exhaust1": true/false,  // Relay Exhaust 1
    "exhaust2": true/false,  // Relay Exhaust 2
    "pump": true/false,      // Relay Pompa
    "valveA": true/false,    // Relay Valve A
    "valveB": true/false     // Relay Valve B
  }
}
```

**Response (Success - Mode Manual):**
```json
{
  "success": true,
  "message": "Relay updated",
  "relays": {
    "fan1": true,
    "fan2": false,
    "exhaust1": true,
    "exhaust2": false,
    "pump": false,
    "valveA": false,
    "valveB": false
  }
}
```

**Response (Error - Mode Auto):**
```json
{
  "error": "Manual mode required. Current mode: auto"
}
```

**Response (Error - Invalid Request):**
```json
{
  "error": "Invalid relay configuration"
}
```

**⚠️ PENTING:**
- Endpoint ini **HANYA bekerja jika mode = "manual"**
- Jika mode = "auto", return error dengan status code `403` atau `400`
- Atau bisa juga: ESP32 tetap update relay tapi akan di-override oleh logika auto (tidak disarankan)

**CORS Headers Required:**
```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: POST, OPTIONS
Access-Control-Allow-Headers: Content-Type
```

---

### 4. Endpoint: Get Relay Status

**Endpoint:** `GET /api/relay/status`

**Request:**
```
GET http://{ESP32_IP}/api/relay/status
```

**Response:**
```json
{
  "relays": {
    "fan1": true,
    "fan2": false,
    "exhaust1": true,
    "exhaust2": false,
    "pump": false,
    "valveA": false,
    "valveB": false
  },
  "mode": "auto" | "manual",
  "timestamp": "2025-11-26T22:30:00Z"
}
```

**CORS Headers Required:**
```
Access-Control-Allow-Origin: *
```

---

## 🔥 Firebase Realtime Database Integration

### Overview
ESP32 perlu mengirim data sensor dan status relay ke **Firebase Realtime Database** untuk:
- Real-time monitoring dari web application
- Historical data tracking
- Multi-device synchronization
- Offline data persistence

### 1. Setup Firebase Realtime Database

#### Library yang Diperlukan
```cpp
#include <FirebaseESP32.h>
```

**Install Library:**
- Arduino IDE: Library Manager → Search "FirebaseESP32" → Install
- Atau download dari: https://github.com/mobizt/Firebase-ESP32

#### Konfigurasi Firebase

**File: `firebase_config.h`** (buat file terpisah untuk credentials)

```cpp
#ifndef FIREBASE_CONFIG_H
#define FIREBASE_CONFIG_H

// Firebase Realtime Database URL
#define FIREBASE_DATABASE_URL "https://your-project-id-default-rtdb.firebaseio.com/"

// Service Account Credentials (dari Firebase Console)
#define FIREBASE_CLIENT_EMAIL "firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com"
#define FIREBASE_PROJECT_ID "your-project-id"
#define FIREBASE_PRIVATE_KEY "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

#endif
```

**Cara Mendapatkan Credentials:**
1. Buka Firebase Console → Project Settings
2. Service Accounts tab
3. Generate new private key
4. Download JSON file
5. Extract `client_email`, `project_id`, dan `private_key` dari JSON

#### Initialize Firebase

```cpp
// Firebase objects
FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;

bool firebaseInitialized = false;

void setupFirebase() {
    if (firebaseInitialized) {
        return;
    }
    
    if (WiFi.status() != WL_CONNECTED) {
        Serial.println("❌ WiFi not connected, cannot initialize Firebase");
        return;
    }
    
    Serial.println("🔥 Initializing Firebase...");
    
    // Set Firebase Database URL
    config.database_url = FIREBASE_DATABASE_URL;
    
    // Setup service account authentication
    config.service_account.data.client_email = FIREBASE_CLIENT_EMAIL;
    config.service_account.data.project_id = FIREBASE_PROJECT_ID;
    config.service_account.data.private_key = FIREBASE_PRIVATE_KEY;
    
    // Set timeout
    config.timeout.serverResponse = 10 * 1000;
    config.timeout.socketConnection = 10 * 1000;
    
    // Initialize Firebase
    Firebase.begin(&config, &auth);
    Firebase.reconnectWiFi(true);
    
    // Set buffer size untuk SSL
    fbdo.setBSSLBufferSize(2048, 512);
    fbdo.setResponseSize(2048);
    
    // Wait for initialization
    delay(1000);
    
    if (Firebase.ready()) {
        firebaseInitialized = true;
        Serial.println("✅ Firebase initialized successfully");
    } else {
        Serial.println("⚠️ Firebase initialization failed");
    }
}
```

---

### 2. Mengirim Data Sensor ke Firebase

#### Path Structure di Firebase

**Format Path:**
```
/sensor_data/{greenhouseId}/{timestamp}
```

**Contoh:**
```
/sensor_data/greenhouse_001/1732647000000
```

**Struktur Data:**
```json
{
  "temperature": 30.5,
  "humidity": 65.0,
  "soilMoisture": 45.0,
  "soil_raw": 2500,
  "timestamp": 1732647000000,
  "mode": "auto"
}
```

#### Fungsi Send Sensor Data

```cpp
void sendSensorDataToFirebase(String greenhouseId) {
    if (!Firebase.ready() || !firebaseInitialized) {
        return;
    }
    
    // Path di Firebase: /sensor_data/{greenhouseId}/{timestamp}
    String path = "/sensor_data/" + greenhouseId + "/" + String(millis());
    
    // Buat JSON object
    FirebaseJson json;
    json.set("temperature", temperature);
    json.set("humidity", humidity);
    json.set("soilMoisture", soilMoisturePercent);
    json.set("soil_raw", soil_raw);
    json.set("mode", currentMode); // "auto" or "manual"
    json.set("timestamp", millis());
    
    // Kirim ke Firebase Realtime Database
    if (Firebase.setJSON(fbdo, path, json)) {
        Serial.println("✅ Sensor data sent to Firebase");
    } else {
        Serial.printf("❌ Firebase Error: %s\n", fbdo.errorReason().c_str());
        // Handle error (retry, log, etc.)
    }
}
```

**Timing:**
- Kirim data sensor setiap **2-5 detik** (sesuai kebutuhan)
- Jangan terlalu sering untuk menghemat bandwidth dan quota Firebase

---

### 3. Mengirim Status Relay ke Firebase (Optional)

#### Path Structure

**Format Path:**
```
/relay_status/{greenhouseId}
```

**Struktur Data:**
```json
{
  "fan1": true,
  "fan2": false,
  "exhaust1": true,
  "exhaust2": false,
  "pump": false,
  "valveA": false,
  "valveB": false,
  "mode": "manual",
  "timestamp": 1732647000000
}
```

#### Fungsi Send Relay Status

```cpp
void sendRelayStatusToFirebase(String greenhouseId) {
    if (!Firebase.ready() || !firebaseInitialized) {
        return;
    }
    
    // Path di Firebase: /relay_status/{greenhouseId}
    String path = "/relay_status/" + greenhouseId;
    
    // Buat JSON object
    FirebaseJson json;
    json.set("fan1", digitalRead(RELAY_FAN1) == LOW); // LOW = ON (jika active low)
    json.set("fan2", digitalRead(RELAY_FAN2) == LOW);
    json.set("exhaust1", digitalRead(RELAY_EXHAUST1) == LOW);
    json.set("exhaust2", digitalRead(RELAY_EXHAUST2) == LOW);
    json.set("pump", digitalRead(RELAY_PUMP) == LOW);
    json.set("valveA", digitalRead(RELAY_VALVE_A) == LOW);
    json.set("valveB", digitalRead(RELAY_VALVE_B) == LOW);
    json.set("mode", currentMode);
    json.set("timestamp", millis());
    
    // Update (bukan set) untuk overwrite data yang sama
    if (Firebase.setJSON(fbdo, path, json)) {
        Serial.println("✅ Relay status sent to Firebase");
    } else {
        Serial.printf("❌ Firebase Error: %s\n", fbdo.errorReason().c_str());
    }
}
```

**Timing:**
- Kirim status relay setiap kali **relay state berubah**
- Atau kirim secara periodic setiap **5-10 detik** untuk sync

---

### 4. Mengirim Mode State ke Firebase (Optional)

#### Path Structure

**Format Path:**
```
/system_mode/{greenhouseId}
```

**Struktur Data:**
```json
{
  "mode": "auto" | "manual",
  "timestamp": 1732647000000
}
```

#### Fungsi Send Mode State

```cpp
void sendModeStateToFirebase(String greenhouseId) {
    if (!Firebase.ready() || !firebaseInitialized) {
        return;
    }
    
    // Path di Firebase: /system_mode/{greenhouseId}
    String path = "/system_mode/" + greenhouseId;
    
    // Buat JSON object
    FirebaseJson json;
    json.set("mode", currentMode);
    json.set("timestamp", millis());
    
    // Update mode state
    if (Firebase.setJSON(fbdo, path, json)) {
        Serial.println("✅ Mode state sent to Firebase");
    } else {
        Serial.printf("❌ Firebase Error: %s\n", fbdo.errorReason().c_str());
    }
}
```

**Timing:**
- Kirim mode state setiap kali **mode berubah** (dari endpoint `/api/mode`)

---

### 5. Integration dengan Loop Utama

```cpp
void loop() {
    // ... sensor reading ...
    
    // Update relay states berdasarkan mode
    if (currentMode == MODE_AUTO) {
        // Auto logic
        // ...
    }
    
    // Kirim data ke Firebase setiap 2 detik
    static unsigned long lastFirebaseUpdate = 0;
    if (millis() - lastFirebaseUpdate >= 2000) {
        lastFirebaseUpdate = millis();
        
        if (Firebase.ready() && firebaseInitialized) {
            sendSensorDataToFirebase("greenhouse_001"); // Ganti dengan greenhouse ID yang sesuai
        } else if (!firebaseInitialized) {
            // Retry initialization jika belum initialized
            setupFirebase();
        }
    }
    
    // Kirim relay status jika berubah (atau periodic)
    // ...
    
    // ... server.handleClient() ...
}
```

---

### 6. Error Handling

#### Reconnection Logic

```cpp
void handleFirebaseError() {
    if (fbdo.httpCode() == HTTP_CODE_UNAUTHORIZED || 
        fbdo.httpCode() == HTTP_CODE_FORBIDDEN) {
        Serial.println("❌ Firebase authentication failed");
        firebaseInitialized = false;
        // Retry setup
        setupFirebase();
    } else if (fbdo.httpCode() == HTTP_CODE_BAD_REQUEST) {
        Serial.println("❌ Firebase bad request - check data format");
    } else if (fbdo.httpCode() == HTTP_CODE_TIMEOUT) {
        Serial.println("⚠️ Firebase timeout - will retry");
    } else {
        Serial.printf("❌ Firebase Error: %s\n", fbdo.errorReason().c_str());
    }
}
```

#### WiFi Reconnection

```cpp
void WiFiEvent(WiFiEvent_t event) {
    switch (event) {
        case ARDUINO_EVENT_WIFI_STA_DISCONNECTED:
            Serial.println("⚠️ WiFi disconnected");
            wifiConnected = false;
            firebaseInitialized = false; // Reset Firebase flag
            break;
            
        case ARDUINO_EVENT_WIFI_STA_CONNECTED:
            Serial.println("✅ WiFi connected");
            wifiConnected = true;
            // Setup Firebase setelah WiFi connected
            if (!firebaseInitialized) {
                setupFirebase();
            }
            break;
    }
}
```

---

### 7. Firebase Database Rules (Security Rules)

**⚠️ PENTING:** Set Firebase Realtime Database Rules di Firebase Console

**Path:** Firebase Console → Realtime Database → Rules

**Recommended Rules:**
```json
{
  "rules": {
    "sensor_data": {
      "$greenhouseId": {
        ".read": "auth != null",
        ".write": "auth != null"
      }
    },
    "relay_status": {
      "$greenhouseId": {
        ".read": "auth != null",
        ".write": "auth != null"
      }
    },
    "system_mode": {
      "$greenhouseId": {
        ".read": "auth != null",
        ".write": "auth != null"
      }
    }
  }
}
```

**Atau untuk testing (tidak disarankan untuk production):**
```json
{
  "rules": {
    ".read": true,
    ".write": true
  }
}
```

---

### 8. Memory Management

**Tips untuk menghemat memory:**
- Gunakan `FirebaseJson` dengan size yang sesuai
- Set buffer size yang minimal tapi cukup
- Jangan terlalu sering kirim data (interval 2-5 detik sudah cukup)
- Cleanup old data di Firebase secara periodic

**Buffer Size Configuration:**
```cpp
fbdo.setBSSLBufferSize(2048, 512);  // SSL buffer
fbdo.setResponseSize(2048);         // Response buffer
```

---

### 9. Testing Checklist

- [ ] Firebase initialization berhasil
- [ ] Data sensor terkirim ke Firebase
- [ ] Data bisa dibaca dari web application
- [ ] Relay status terkirim saat berubah
- [ ] Mode state terkirim saat berubah
- [ ] Error handling bekerja dengan baik
- [ ] Reconnection logic bekerja setelah WiFi disconnect
- [ ] Memory usage stabil (tidak ada memory leak)
- [ ] Firebase quota tidak terpakai berlebihan

---

## 🔧 Implementation Requirements

### 1. Mode State Management

**Variable yang diperlukan:**
- Variable untuk menyimpan mode state (`"auto"` atau `"manual"`)
- Default mode: `"auto"` (untuk backward compatibility)
- Mode harus persistent (disimpan di EEPROM atau flash) agar tidak reset saat restart

**Contoh struktur:**
```cpp
String currentMode = "auto";  // Default: auto mode
const String MODE_AUTO = "auto";
const String MODE_MANUAL = "manual";
```

---

### 2. Logika Conditional (di loop utama)

**Struktur logika yang diperlukan:**

```cpp
void loop() {
  // ... sensor reading ...
  
  if (currentMode == MODE_AUTO) {
    // ===== MODE OTOMATIS =====
    // Ikuti sensor rules
    // Contoh:
    if (temperature > 30.0) {
      digitalWrite(RELAY_FAN1, HIGH);
      digitalWrite(RELAY_FAN2, HIGH);
    } else if (temperature < 25.0) {
      digitalWrite(RELAY_FAN1, LOW);
      digitalWrite(RELAY_FAN2, LOW);
    }
    
    if (humidity > 80.0) {
      digitalWrite(RELAY_EXHAUST1, HIGH);
      digitalWrite(RELAY_EXHAUST2, HIGH);
    } else if (humidity < 70.0) {
      digitalWrite(RELAY_EXHAUST1, LOW);
      digitalWrite(RELAY_EXHAUST2, LOW);
    }
    
    if (soilMoisture < 40.0) {
      digitalWrite(RELAY_PUMP, HIGH);
      digitalWrite(RELAY_VALVE_A, HIGH);
      digitalWrite(RELAY_VALVE_B, HIGH);
    } else if (soilMoisture > 60.0) {
      digitalWrite(RELAY_PUMP, LOW);
      digitalWrite(RELAY_VALVE_A, LOW);
      digitalWrite(RELAY_VALVE_B, LOW);
    }
    
  } else if (currentMode == MODE_MANUAL) {
    // ===== MODE MANUAL =====
    // Abaikan sensor, hanya ikuti perintah web
    // Jangan update relay berdasarkan sensor
    // Relay hanya diupdate melalui endpoint /api/relay
  }
  
  // ... server.handleClient() ...
}
```

**Catatan:**
- Threshold sensor bisa disesuaikan sesuai kebutuhan
- Logika auto bisa lebih kompleks (hysteresis, delay, dll)
- Di mode manual, jangan ada logika yang mengubah relay berdasarkan sensor

---

### 3. Endpoint Handler: Set Mode

**Fungsi yang diperlukan:**
- Parse JSON request body
- Validasi mode value (`"auto"` atau `"manual"`)
- Update `currentMode` variable
- Simpan mode ke EEPROM/flash (optional, untuk persistence)
- Return response dengan previous mode

**Error Handling:**
- Invalid mode value → return error
- JSON parse error → return error
- Missing "mode" field → return error

---

### 4. Endpoint Handler: Get Mode

**Fungsi yang diperlukan:**
- Return current mode state
- Include timestamp (optional)

---

### 5. Endpoint Handler: Control Relay

**Fungsi yang diperlukan:**
- **Check mode:** Jika mode != "manual", return error
- Parse JSON request body
- Validasi relay configuration
- Update relay states sesuai request
- Return current relay states

**Error Handling:**
- Mode != "manual" → return error 403
- Invalid JSON → return error 400
- Missing "relays" field → return error 400
- Invalid relay name → ignore atau return error

---

### 6. Endpoint Handler: Get Relay Status

**Fungsi yang diperlukan:**
- Read current relay states (digitalRead)
- Return semua relay states
- Include current mode dan timestamp

---

## 📝 Contoh Request/Response

### Scenario 1: Switch ke Manual Mode
```
Request:
POST /api/mode
{
  "mode": "manual"
}

Response:
{
  "success": true,
  "message": "Mode updated",
  "mode": "manual",
  "previousMode": "auto"
}
```

### Scenario 2: Control Relay di Manual Mode
```
Request:
POST /api/relay
{
  "relays": {
    "fan1": true,
    "fan2": false,
    "pump": true,
    "valveA": true,
    "valveB": true
  }
}

Response:
{
  "success": true,
  "message": "Relay updated",
  "relays": {
    "fan1": true,
    "fan2": false,
    "exhaust1": false,
    "exhaust2": false,
    "pump": true,
    "valveA": true,
    "valveB": true
  }
}
```

### Scenario 3: Control Relay di Auto Mode (Error)
```
Request:
POST /api/relay
{
  "relays": {
    "fan1": true
  }
}

Response (Error):
{
  "error": "Manual mode required. Current mode: auto"
}
```

### Scenario 4: Switch kembali ke Auto Mode
```
Request:
POST /api/mode
{
  "mode": "auto"
}

Response:
{
  "success": true,
  "message": "Mode updated",
  "mode": "auto",
  "previousMode": "manual"
}

// Setelah ini, ESP32 mulai mengikuti sensor lagi
```

---

## ⚠️ Important Notes

1. **CORS Support:**
   - Semua endpoint harus support CORS
   - Handle OPTIONS request untuk preflight
   - Set header `Access-Control-Allow-Origin: *`

2. **Mode Persistence:**
   - Disarankan simpan mode ke EEPROM/flash
   - Saat restart, load mode terakhir dari storage
   - Default: "auto" jika tidak ada saved mode

3. **Error Handling:**
   - Return appropriate HTTP status codes
   - Return JSON error messages yang jelas
   - Log errors ke Serial Monitor untuk debugging

4. **Backward Compatibility:**
   - Default mode = "auto" (seperti behavior existing)
   - Jika endpoint mode tidak ada, anggap mode = "auto"
   - Existing sensor logic tetap berfungsi

5. **Security (Optional):**
   - Bisa tambahkan authentication jika diperlukan
   - Rate limiting untuk prevent spam request
   - Input validation untuk prevent invalid data

---

## 🧪 Testing Checklist

### Functional Testing
- [ ] Endpoint `/api/mode` (POST) berfungsi dengan baik
- [ ] Endpoint `/api/mode` (GET) return current mode
- [ ] Endpoint `/api/relay` (POST) bekerja di mode manual
- [ ] Endpoint `/api/relay` (POST) return error di mode auto
- [ ] Endpoint `/api/relay/status` (GET) return status semua relay
- [ ] Mode switching berfungsi dengan baik
- [ ] Mode persistence setelah restart (jika diimplementasikan)

### Logic Testing
- [ ] Mode auto: Relay mengikuti sensor rules
- [ ] Mode manual: Relay tidak mengikuti sensor (hanya perintah web)
- [ ] Mode auto: Suhu > 30°C → Kipas menyala
- [ ] Mode manual: Suhu > 30°C → Kipas tetap mati (kecuali perintah web)
- [ ] Mode switching tidak mereset relay state

### Integration Testing
- [ ] CORS headers ter-set dengan benar
- [ ] OPTIONS request di-handle dengan benar
- [ ] JSON parsing berfungsi dengan baik
- [ ] Error handling return response yang benar
- [ ] Multiple request tidak menyebabkan conflict

### Firebase Testing
- [ ] Firebase initialization berhasil
- [ ] Data sensor terkirim ke Firebase Realtime Database
- [ ] Data bisa dibaca dari web application
- [ ] Relay status terkirim saat berubah (jika diimplementasikan)
- [ ] Mode state terkirim saat berubah (jika diimplementasikan)
- [ ] Error handling Firebase bekerja dengan baik
- [ ] Reconnection logic bekerja setelah WiFi disconnect
- [ ] Memory usage stabil (tidak ada memory leak)

---

## 📚 Reference

### Existing Endpoint (Sudah Ada)
- `GET /api` - Sensor data (temperature, humidity, soilMoisture)

### New Endpoints (Perlu Ditambahkan)
- `POST /api/mode` - Set mode (auto/manual)
- `GET /api/mode` - Get current mode
- `POST /api/relay` - Control relay (hanya di mode manual)
- `GET /api/relay/status` - Get relay status

### Firebase Realtime Database (Perlu Ditambahkan)
- Setup Firebase Realtime Database connection
- Send sensor data ke `/sensor_data/{greenhouseId}/{timestamp}`
- Send relay status ke `/relay_status/{greenhouseId}` (optional)
- Send mode state ke `/system_mode/{greenhouseId}` (optional)

---

## 📞 Contact

Jika ada pertanyaan tentang requirement ini, silakan hubungi developer web project.

**Status:** Requirement Document ✅
**Target:** ESP32 Developer
**Next Step:** Implementasi di ESP32 sesuai requirement ini

