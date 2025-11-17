// =================================================================
// ==      ESP32 Greenhouse Control: 5-RELAY + WEBSOCKET (FINAL v2) ==
// ==  Logika: 4 Kipas + 1 Pompa + Mode Manual LENGKAP + Rata-rata  ==
// ==  Arsitektur: .INO (Server) + .H (Web Page)                    ==
// =================================================================

// --- Library Bawaan ---
#include <Arduino.h>
#include "DHT.h"
#include <WiFi.h>
#include <ESPmDNS.h>
#include <esp_task_wdt.h> // Untuk watchdog timer

// Tambahkan include Firebase
#include <FirebaseESP32.h>
#include "firebase_config.h"

// Firebase objects
FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;

// --- Library Tambahan (Wajib Install) ---
#include <AsyncTCP.h>
#include <ESPAsyncWebServer.h> // Termasuk WebSocket
#include <ArduinoJson.h>

// --- HALAMAN WEB DARI FILE HEADER ---
#include "web_page.h"

// --- Konfigurasi Jaringan & MDNS ---
const char* ssid = "enumatechz";
const char* password = "3numaTechn0l0gy"; 
const char* mdnsHostname = "esp32-greenhouse";

// --- Konfigurasi Sensor ---
#define DHTPIN 4
#define DHTTYPE DHT11
DHT dht(DHTPIN, DHTTYPE);
#define SOIL_PIN 34

// --- Konfigurasi Pin Relay (5-CHANNEL) ---
const int RELAY_FAN1_PIN = 22;
const int RELAY_FAN2_PIN = 23;
const int RELAY_FAN3_PIN = 25;
const int RELAY_FAN4_PIN = 26;
const int RELAY_PUMP_PIN = 13;

// --- Thresholds Kontrol ---
const float TEMP_FAN1_ON = 30.0;
const float TEMP_FAN2_ON = 32.0;
const float TEMP_FAN3_ON = 34.0;
const float TEMP_FAN4_ON = 36.0;
const float SOIL_PUMP_ON = 45.0;

// --- Kalibrasi Sensor Soil Moisture ---
const int SOIL_VALUE_DRY = 3100;
const int SOIL_VALUE_WET = 1200;

// --- HISTERESIS (mengurangi fluktuasi) ---
const float TEMP_HYST = 1.0;     // ±1°C untuk kipas
const float SOIL_HYST = 3.0;     // ±3% untuk pompa

// --- (BARU) FAKTOR SMOOTHING UNTUK DHT22 ---
const float DHT_SMOOTHING_FACTOR = 0.2; 

// --- Variabel Global ---
AsyncWebServer server(80);
AsyncWebSocket ws("/ws"); 
bool serverRunning = false;
int systemMode = 1; // 1 = Otomatis, 2 = Manual

// Variabel Status Sistem
float temperature = 0.0, humidity = 0.0, soilMoisturePercent = 0.0;
int soil_raw = 0;
bool fan1State = false, fan2State = false, fan3State = false, fan4State = false, pumpState = false;

// Flag untuk mencegah multiple initialization
bool firebaseInitialized = false;
bool wifiConnected = false;

// --- FUNGSI BANTUAN: Menerapkan Status ke 5 Relay ---
// (DIMODIFIKASI: Disederhanakan, logika dipindah)
void applySystemState() {
    // Fungsi ini sekarang HANYA menerapkan state global ke pin
    // Logika (auto/manual) sudah di-handle di void loop() atau onWsEvent()
    digitalWrite(RELAY_FAN1_PIN, fan1State ? LOW : HIGH);
    digitalWrite(RELAY_FAN2_PIN, fan2State ? LOW : HIGH);
    digitalWrite(RELAY_FAN3_PIN, fan3State ? LOW : HIGH);
    digitalWrite(RELAY_FAN4_PIN, fan4State ? LOW : HIGH);
    digitalWrite(RELAY_PUMP_PIN, pumpState ? LOW : HIGH);
}

// --- FUNGSI: Mengirim Data ke Klien WebSocket ---
void notifyClients() {
    StaticJsonDocument<512> doc;
    
    // Kirim semua data sensor dan status relay
    doc["temp"] = temperature;
    doc["hum"] = humidity;
    doc["soil_percent"] = soilMoisturePercent;
    doc["soil_raw"] = soil_raw;
    doc["fan1"] = fan1State ? "ON" : "OFF";
    doc["fan2"] = fan2State ? "ON" : "OFF";
    doc["fan3"] = fan3State ? "ON" : "OFF";
    doc["fan4"] = fan4State ? "ON" : "OFF";
    doc["pump"] = pumpState ? "ON" : "OFF";
    doc["mode"] = systemMode; // Kirim status mode
    
    if (WiFi.status() == WL_CONNECTED) doc["ip"] = WiFi.localIP().toString();
    else doc["ip"] = "Disconnected";
    doc["mdns"] = mdnsHostname;
    
    String jsonResponse;
    serializeJson(doc, jsonResponse);
    ws.textAll(jsonResponse);
}

// --- FUNGSI: Menangani Event WebSocket ---
// (DIMODIFIKASI: Menambahkan 4 toggle kipas manual)
void onWsEvent(AsyncWebSocket *server, AsyncWebSocketClient *client, AwsEventType type, void *arg, uint8_t *data, size_t len) {
  switch (type) {
    case WS_EVT_CONNECT:
      Serial.printf("WebSocket client #%u terhubung\n", client->id());
      notifyClients();
      break;
    case WS_EVT_DISCONNECT:
      Serial.printf("WebSocket client #%u terputus\n", client->id());
      break;
    case WS_EVT_DATA:
      { 
        AwsFrameInfo* info = (AwsFrameInfo*)arg;
        if (info->final && info->index == 0 && info->len == len && info->opcode == WS_TEXT) {
            data[len] = 0;
            String message = (char*)data;
            Serial.printf("Perintah dari Web: %s\n", message.c_str());
            if (message == "TOGGLE_MODE") {
                systemMode = (systemMode == 1) ? 2 : 1;
                if (systemMode == 2) { // Baru ganti ke Manual
                    // Matikan semua relay sebagai safety
                    fan1State = false; fan2State = false; fan3State = false; fan4State = false; pumpState = false;
                }
                // (Logika auto akan otomatis aktif di loop berikutnya jika systemMode == 1)
            } 
            // --- (BARU) KONTROL MANUAL UNTUK SEMUA 5 RELAY ---
            else if (systemMode == 2) { // Hanya proses jika mode MANUAL
                if (message == "TOGGLE_FAN1") {
                    fan1State = !fan1State;
                } else if (message == "TOGGLE_FAN2") {
                    fan2State = !fan2State;
                } else if (message == "TOGGLE_FAN3") {
                    fan3State = !fan3State;
                } else if (message == "TOGGLE_FAN4") {
                    fan4State = !fan4State;
                } else if (message == "TOGGLE_PUMP") {
                    pumpState = !pumpState;
                }
            }
            
            // Terapkan state baru (jika ada perubahan)
            applySystemState(); 
            // Kirim status terbaru ke semua klien
            notifyClients(); 
        }
      }
      break;
    case WS_EVT_PONG:
    case WS_EVT_ERROR:
      break;
  }
}

// --- FUNGSI BANTUAN: Menjalankan Server ---
void startWebServer() {
    if (serverRunning) return;
    
    MDNS.begin(mdnsHostname);
    MDNS.addService("http", "tcp", 80); 
    
    // Sajikan halaman utama dari "web_page.h"
    server.on("/", HTTP_GET, [](AsyncWebServerRequest *request){
        request->send_P(200, "text/html", index_html);
    });
    
    // =================================================================
    // == TAMBAHKAN HANDLER /api DENGAN CORS HEADERS (UNTUK MONITORING) ==
    // =================================================================
    
    // Handler untuk GET /api - Mengembalikan data sensor dalam format JSON
    server.on("/api", HTTP_GET, [](AsyncWebServerRequest *request){
        // Buat JSON response dengan data sensor terbaru
        StaticJsonDocument<256> doc;
        doc["temperature"] = temperature;
        doc["humidity"] = humidity;
        doc["soilMoisture"] = soilMoisturePercent;
        doc["soil_raw"] = soil_raw;
        
        String jsonResponse;
        serializeJson(doc, jsonResponse);
        
        // Kirim response dengan CORS headers
        AsyncWebServerResponse *response = request->beginResponse(200, "application/json", jsonResponse);
        response->addHeader("Access-Control-Allow-Origin", "*");
        response->addHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
        response->addHeader("Access-Control-Allow-Headers", "Content-Type");
        request->send(response);
        
        Serial.printf("API Request: GET /api -> T:%.1f H:%.1f S:%.1f\n", temperature, humidity, soilMoisturePercent);
    });
    
    // Handler untuk OPTIONS /api - Preflight CORS check
    server.on("/api", HTTP_OPTIONS, [](AsyncWebServerRequest *request){
        AsyncWebServerResponse *response = request->beginResponse(200, "text/plain", "");
        response->addHeader("Access-Control-Allow-Origin", "*");
        response->addHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
        response->addHeader("Access-Control-Allow-Headers", "Content-Type");
        request->send(response);
        
        Serial.println("API Request: OPTIONS /api (CORS preflight)");
    });
    
    // =================================================================
    
    server.begin();
    serverRunning = true;
    Serial.println("Async Web Server Aktif!");
    Serial.printf("Akses di: http://%s.local/\n", mdnsHostname);
    Serial.println("API Endpoint: http://esp32-greenhouse.local/api");
}

void stopWebServer() {
    if (serverRunning) {
        ws.closeAll();
        server.end();
        MDNS.end();
        serverRunning = false;
        Serial.println("Web Server & MDNS Dihentikan.");
    }
}

// =================================================================
// == FUNGSI FIREBASE (TAMBAHAN) ==
// =================================================================

// --- FUNGSI: Setup Firebase ---
void setupFirebase() {
    // Cek jika sudah diinisialisasi
    if (firebaseInitialized) {
        Serial.println("⚠️ Firebase sudah diinisialisasi sebelumnya");
        return;
    }
    
    // Pastikan WiFi sudah connected
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
    
    // Set timeout untuk mencegah blocking terlalu lama
    config.timeout.serverResponse = 10 * 1000;
    config.timeout.socketConnection = 10 * 1000;
    
    // Initialize Firebase (begin() tidak return boolean, langsung initialize)
    Firebase.begin(&config, &auth);
    Firebase.reconnectWiFi(true);
    
    // Set buffer size untuk SSL (dikurangi untuk menghemat memory)
    fbdo.setBSSLBufferSize(2048, 512);
    fbdo.setResponseSize(2048);
    
    // Tunggu sebentar untuk memastikan Firebase ready (dengan yield untuk watchdog)
    for (int i = 0; i < 10; i++) {
        delay(100);
        yield(); // Feed watchdog setiap 100ms
    }
    
    // Cek apakah Firebase ready setelah initialization
    if (Firebase.ready()) {
        firebaseInitialized = true;
        Serial.println("✅ Firebase initialized successfully");
    } else {
        Serial.println("⚠️ Firebase initialized but not ready yet");
        Serial.println("   Will retry in next loop...");
        // Jangan set flag, biarkan retry di loop berikutnya
    }
    
    // Feed watchdog setelah Firebase init
    esp_task_wdt_reset();
}

// --- FUNGSI: Kirim Data ke Firebase ---
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

// --- HANDLER EVENT WI-FI ---
void WiFiEvent(WiFiEvent_t event) {
    switch (event) {
        case ARDUINO_EVENT_WIFI_STA_DISCONNECTED: 
            if (wifiConnected) {
                Serial.println("⚠️ WiFi Terputus! Mencoba reconnect...");
                wifiConnected = false;
                firebaseInitialized = false; // Reset Firebase flag
                stopWebServer();
            }
            // WiFi akan otomatis reconnect karena WiFi.begin() sudah dipanggil
            break;
            
        case ARDUINO_EVENT_WIFI_STA_GOT_IP: 
            if (!wifiConnected) {
                Serial.println("✅ WiFi Terhubung!");
                Serial.print("IP: ");
                Serial.println(WiFi.localIP());
                wifiConnected = true;
                
                // Start web server hanya sekali
                if (!serverRunning) {
                    startWebServer();
                }
                
                // Setup Firebase hanya sekali
                if (!firebaseInitialized) {
                    // Tunggu WiFi stabil dengan yield untuk watchdog
                    for (int i = 0; i < 10; i++) {
                        delay(100);
                        yield();
                    }
                    setupFirebase();
                }
                
                // Feed watchdog setelah WiFi connected
                esp_task_wdt_reset();
            }
            break;
            
        default: break;
    }
}

// =================================================================
// ==                           SETUP UTAMA                         ==
// =================================================================
void setup() {
    Serial.begin(115200);
    delay(2000); // Tunggu Serial ready lebih lama
    
    // Nonaktifkan watchdog timer untuk mencegah reboot
    disableCore0WDT();
    disableCore1WDT();
    
    // Setup watchdog dengan timeout lebih lama (30 detik)
    // Untuk ESP32 versi baru, gunakan struktur config
    esp_task_wdt_config_t wdt_config;
    wdt_config.timeout_ms = 30000;  // 30 detik
    wdt_config.idle_core_mask = 0;
    wdt_config.trigger_panic = false;
    esp_task_wdt_init(&wdt_config);
    esp_task_wdt_add(NULL);
    
    Serial.println("\n--- ESP32 Greenhouse Web Control (v2 - Full Manual + Firebase) ---");
    Serial.printf("Free heap: %d bytes\n", ESP.getFreeHeap());
    
    // Setup hardware
    pinMode(RELAY_FAN1_PIN, OUTPUT);
    pinMode(RELAY_FAN2_PIN, OUTPUT);
    pinMode(RELAY_FAN3_PIN, OUTPUT);
    pinMode(RELAY_FAN4_PIN, OUTPUT);
    pinMode(RELAY_PUMP_PIN, OUTPUT);
    digitalWrite(RELAY_FAN1_PIN, HIGH);
    digitalWrite(RELAY_FAN2_PIN, HIGH);
    digitalWrite(RELAY_FAN3_PIN, HIGH);
    digitalWrite(RELAY_FAN4_PIN, HIGH);
    digitalWrite(RELAY_PUMP_PIN, HIGH);
    
    // Initialize DHT sensor
    dht.begin();
    delay(500); // Tunggu sensor stabil
    
    // Setup WebSocket
    ws.onEvent(onWsEvent);
    server.addHandler(&ws);
    
    // Setup WiFi event handler SEBELUM begin
    WiFi.onEvent(WiFiEvent);
    
    // Setup WiFi (non-blocking)
    WiFi.mode(WIFI_STA);
    WiFi.setAutoReconnect(true); // Auto reconnect jika terputus
    WiFi.persistent(true); // Simpan WiFi credentials
    WiFi.setSleep(false); // Nonaktifkan WiFi sleep mode
    
    Serial.println("Hardware diinisialisasi. Menunggu WiFi...");
    WiFi.begin(ssid, password);
    
    // Feed watchdog
    esp_task_wdt_reset();
}

// =================================================================
// ==                           LOOP UTAMA                          ==
// =================================================================
void loop() {
    static unsigned long lastSensorRead = 0;
    static unsigned long lastFirebaseUpdate = 0; // ← TAMBAHKAN VARIABEL INI
    
    if (millis() - lastSensorRead >= 2000) {
        lastSensorRead = millis();
    
        // --- 1. BACA SENSOR (DHT) DENGAN SMOOTHING FILTER ---
        float temp_raw = dht.readTemperature();
        float hum_raw = dht.readHumidity();
        if (!isnan(temp_raw) && !isnan(hum_raw)) {
            if (temperature == 0.0) temperature = temp_raw;
            else temperature = (DHT_SMOOTHING_FACTOR * temp_raw) + ((1.0 - DHT_SMOOTHING_FACTOR) * temperature);
            
            if (humidity == 0.0) humidity = hum_raw;
            else humidity = (DHT_SMOOTHING_FACTOR * hum_raw) + ((1.0 - DHT_SMOOTHING_FACTOR) * humidity);
        }
        
        // --- 2. BACA SENSOR (SOIL) DENGAN AVERAGING ---
        long sumADC = 0;
        for (int i = 0; i < 10; i++) {
            sumADC += analogRead(SOIL_PIN);
            yield(); // Beri waktu ke watchdog timer
            delayMicroseconds(5000); // Delay 5ms tanpa blocking (lebih aman dari delay())
        }
        soil_raw = sumADC / 10;
        long soil_mapped = map(soil_raw, SOIL_VALUE_DRY, SOIL_VALUE_WET, 0, 100);
        soilMoisturePercent = constrain(soil_mapped, 0, 100);
        
        // --- 3. LOGIKA KONTROL OTOMATIS (HANYA JIKA MODE AUTO) ---
        if (systemMode == 1) { // Mode Otomatis
            fan1State = (fan1State) ? (temperature > TEMP_FAN1_ON - TEMP_HYST) : (temperature > TEMP_FAN1_ON);
            fan2State = (fan2State) ? (temperature > TEMP_FAN2_ON - TEMP_HYST) : (temperature > TEMP_FAN2_ON);
            fan3State = (fan3State) ? (temperature > TEMP_FAN3_ON - TEMP_HYST) : (temperature > TEMP_FAN3_ON);
            fan4State = (fan4State) ? (temperature > TEMP_FAN4_ON - TEMP_HYST) : (temperature > TEMP_FAN4_ON);
            pumpState = (pumpState) ? (soilMoisturePercent < SOIL_PUMP_ON + SOIL_HYST) : (soilMoisturePercent < SOIL_PUMP_ON);
            
            // Terapkan state otomatis
            applySystemState();
        }
        // Jika mode 2 (Manual), loop ini tidak melakukan apa-apa ke relay.
        // State relay HANYA diubah oleh 'onWsEvent'
        
        // --- 4. TAMPILKAN DATA DI SERIAL MONITOR ---
        Serial.printf("T:%.1f H:%.1f S:%.1f | F1:%d F2:%d F3:%d F4:%d | P:%d | Mode:%s\n",
            temperature, humidity, soilMoisturePercent,
            fan1State, fan2State, fan3State, fan4State, pumpState,
            (systemMode == 1) ? "AUTO" : "MANUAL");
            
        // --- 5. KIRIM DATA KE SEMUA KLIEN WEB ---
        if (serverRunning) {
            notifyClients();
        }
        
        // --- 6. KIRIM DATA KE FIREBASE (SETIAP 2 DETIK) ---
        if (millis() - lastFirebaseUpdate >= 2000) { // ← Kirim setiap 2 detik
            lastFirebaseUpdate = millis();
            
            // Cek WiFi masih connected
            if (WiFi.status() == WL_CONNECTED) {
                // Jika Firebase belum initialized, coba initialize lagi
                if (!firebaseInitialized) {
                    setupFirebase();
                }
                
                // Kirim data jika Firebase ready
                if (Firebase.ready()) {
                    sendDataToFirebase();
                }
            } else {
                // WiFi terputus, reset flags
                if (wifiConnected) {
                    Serial.println("⚠️ WiFi disconnected, waiting for reconnect...");
                    wifiConnected = false;
                    firebaseInitialized = false;
                }
            }
        }
    }
    
    ws.cleanupClients();
    
    // Feed watchdog timer secara berkala
    static unsigned long lastWatchdogFeed = 0;
    if (millis() - lastWatchdogFeed >= 5000) { // Feed setiap 5 detik
        lastWatchdogFeed = millis();
        esp_task_wdt_reset();
    }
    
    yield(); // Beri waktu ke watchdog timer untuk mencegah reboot
}

