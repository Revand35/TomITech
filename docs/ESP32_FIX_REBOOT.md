# Solusi: ESP32 Terus Reboot (Restart Loop)

## Masalah
ESP32 terus restart/reboot setelah upload kode.

## Penyebab Umum:
1. **Watchdog Timer Reset** - Kode terlalu lama di loop tanpa memberi waktu ke watchdog
2. **Stack Overflow** - Terlalu banyak variabel atau buffer besar
3. **Exception/Panic** - Error yang tidak tertangani
4. **WiFi Connection Blocking** - WiFi.begin() blocking terlalu lama
5. **Firebase Initialization Error** - Firebase init gagal dan menyebabkan panic

---

## Solusi 1: Nonaktifkan Watchdog Timer (Temporary Fix)

Tambahkan di `setup()`:

```cpp
void setup() {
    Serial.begin(115200);
    delay(1000); // Tunggu Serial ready
    
    // Nonaktifkan watchdog timer
    disableCore0WDT();
    disableCore1WDT();
    
    Serial.println("\n--- ESP32 Greenhouse Web Control (v2 - Full Manual + Firebase) ---");
    
    // ... kode lainnya ...
}
```

**Catatan**: Ini hanya temporary fix. Lebih baik perbaiki kode yang menyebabkan masalah.

---

## Solusi 2: Perbaiki WiFi Connection (Non-blocking)

Ubah cara koneksi WiFi menjadi non-blocking:

```cpp
void setup() {
    Serial.begin(115200);
    delay(1000);
    
    Serial.println("\n--- ESP32 Greenhouse Web Control (v2 - Full Manual + Firebase) ---");
    
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
    dht.begin();
    
    ws.onEvent(onWsEvent);
    server.addHandler(&ws);
    
    // Setup WiFi event handler SEBELUM begin
    WiFi.onEvent(WiFiEvent);
    
    // JANGAN blocking - WiFi.begin() akan connect di background
    WiFi.mode(WIFI_STA);
    WiFi.begin(ssid, password);
    
    Serial.println("Hardware diinisialisasi. Menunggu WiFi...");
}
```

---

## Solusi 3: Perbaiki Firebase Initialization (Dengan Error Handling)

Tambahkan error handling di `setupFirebase()`:

```cpp
void setupFirebase() {
    Serial.println("🔥 Initializing Firebase...");
    
    // Pastikan WiFi sudah connected
    if (WiFi.status() != WL_CONNECTED) {
        Serial.println("❌ WiFi not connected, skipping Firebase init");
        return;
    }
    
    // Set Firebase Database URL
    config.database_url = FIREBASE_DATABASE_URL;
    
    // Setup service account authentication
    config.service_account.data.client_email = FIREBASE_CLIENT_EMAIL;
    config.service_account.data.project_id = FIREBASE_PROJECT_ID;
    config.service_account.data.private_key = FIREBASE_PRIVATE_KEY;
    
    // Set timeout lebih pendek
    config.timeout.serverResponse = 5 * 1000;
    config.timeout.socketConnection = 5 * 1000;
    
    // Initialize Firebase dengan error handling
    if (Firebase.begin(&config, &auth)) {
        Firebase.reconnectWiFi(true);
        fbdo.setBSSLBufferSize(2048, 512);
        fbdo.setResponseSize(2048);
        Serial.println("✅ Firebase initialized successfully");
    } else {
        Serial.println("❌ Firebase initialization failed");
        Serial.printf("Error: %s\n", config.signer.tokens.error.message.c_str());
    }
}
```

---

## Solusi 4: Perbaiki Loop() - Hapus Delay yang Blocking

Ubah `loop()` untuk menghindari delay yang terlalu lama:

```cpp
void loop() {
    static unsigned long lastSensorRead = 0;
    static unsigned long lastFirebaseUpdate = 0;
    
    // JANGAN gunakan delay() di loop utama
    // Gunakan millis() untuk timing
    
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
        // HAPUS delay(5) di dalam loop - gunakan non-blocking
        long sumADC = 0;
        for (int i = 0; i < 10; i++) {
            sumADC += analogRead(SOIL_PIN);
            // HAPUS delay(5) - atau gunakan yield() untuk memberi waktu ke watchdog
            yield(); // Memberi waktu ke watchdog timer
        }
        soil_raw = sumADC / 10;
        long soil_mapped = map(soil_raw, SOIL_VALUE_DRY, SOIL_VALUE_WET, 0, 100);
        soilMoisturePercent = constrain(soil_mapped, 0, 100);
        
        // --- 3. LOGIKA KONTROL OTOMATIS ---
        if (systemMode == 1) {
            fan1State = (fan1State) ? (temperature > TEMP_FAN1_ON - TEMP_HYST) : (temperature > TEMP_FAN1_ON);
            fan2State = (fan2State) ? (temperature > TEMP_FAN2_ON - TEMP_HYST) : (temperature > TEMP_FAN2_ON);
            fan3State = (fan3State) ? (temperature > TEMP_FAN3_ON - TEMP_HYST) : (temperature > TEMP_FAN3_ON);
            fan4State = (fan4State) ? (temperature > TEMP_FAN4_ON - TEMP_HYST) : (temperature > TEMP_FAN4_ON);
            pumpState = (pumpState) ? (soilMoisturePercent < SOIL_PUMP_ON + SOIL_HYST) : (soilMoisturePercent < SOIL_PUMP_ON);
            applySystemState();
        }
        
        // --- 4. TAMPILKAN DATA DI SERIAL MONITOR ---
        Serial.printf("T:%.1f H:%.1f S:%.1f | F1:%d F2:%d F3:%d F4:%d | P:%d | Mode:%s\n",
            temperature, humidity, soilMoisturePercent,
            fan1State, fan2State, fan3State, fan4State, pumpState,
            (systemMode == 1) ? "AUTO" : "MANUAL");
            
        // --- 5. KIRIM DATA KE SEMUA KLIEN WEB ---
        if (serverRunning) {
            notifyClients();
        }
        
        // --- 6. KIRIM DATA KE FIREBASE (SETIAP 10 DETIK) ---
        if (millis() - lastFirebaseUpdate >= 10000) {
            lastFirebaseUpdate = millis();
            if (Firebase.ready()) { // Cek Firebase ready dulu
                sendDataToFirebase();
            }
        }
    }
    
    ws.cleanupClients();
    yield(); // Beri waktu ke watchdog timer
}
```

---

## Solusi 5: Tambahkan Exception Handler

Tambahkan di awal `setup()` untuk menangkap exception:

```cpp
#include <esp_task_wdt.h>

void setup() {
    Serial.begin(115200);
    delay(1000);
    
    // Setup exception handler
    esp_task_wdt_init(30, true); // 30 detik timeout
    esp_task_wdt_add(NULL); // Add current task to watchdog
    
    Serial.println("\n--- ESP32 Greenhouse Web Control (v2 - Full Manual + Firebase) ---");
    
    // ... kode lainnya ...
}
```

---

## Solusi 6: Debug - Cek Error Message

Tambahkan kode untuk melihat error yang menyebabkan reboot:

```cpp
void printStackTrace() {
    Serial.println("\n=== STACK TRACE ===");
    Serial.printf("Free heap: %d bytes\n", ESP.getFreeHeap());
    Serial.printf("Largest free block: %d bytes\n", ESP.getMaxAllocHeap());
    Serial.printf("Free PSRAM: %d bytes\n", ESP.getFreePsram());
    Serial.println("==================\n");
}

void setup() {
    Serial.begin(115200);
    delay(2000); // Tunggu Serial ready
    
    printStackTrace(); // Print memory info
    
    // ... kode lainnya ...
}
```

---

## Rekomendasi Urutan Perbaikan:

1. **Solusi 2** - Perbaiki WiFi connection (non-blocking)
2. **Solusi 4** - Hapus delay() dan tambahkan yield()
3. **Solusi 3** - Tambahkan error handling di Firebase
4. **Solusi 1** - Nonaktifkan watchdog (temporary)

---

## Kode Loop() yang Diperbaiki (Tanpa Delay Blocking):

```cpp
void loop() {
    static unsigned long lastSensorRead = 0;
    static unsigned long lastFirebaseUpdate = 0;
    
    if (millis() - lastSensorRead >= 2000) {
        lastSensorRead = millis();
    
        // Baca sensor DHT
        float temp_raw = dht.readTemperature();
        float hum_raw = dht.readHumidity();
        if (!isnan(temp_raw) && !isnan(hum_raw)) {
            if (temperature == 0.0) temperature = temp_raw;
            else temperature = (DHT_SMOOTHING_FACTOR * temp_raw) + ((1.0 - DHT_SMOOTHING_FACTOR) * temperature);
            
            if (humidity == 0.0) humidity = hum_raw;
            else humidity = (DHT_SMOOTHING_FACTOR * hum_raw) + ((1.0 - DHT_SMOOTHING_FACTOR) * humidity);
        }
        
        // Baca sensor soil - TANPA delay()
        long sumADC = 0;
        for (int i = 0; i < 10; i++) {
            sumADC += analogRead(SOIL_PIN);
            yield(); // Ganti delay(5) dengan yield()
        }
        soil_raw = sumADC / 10;
        long soil_mapped = map(soil_raw, SOIL_VALUE_DRY, SOIL_VALUE_WET, 0, 100);
        soilMoisturePercent = constrain(soil_mapped, 0, 100);
        
        // Kontrol otomatis
        if (systemMode == 1) {
            fan1State = (fan1State) ? (temperature > TEMP_FAN1_ON - TEMP_HYST) : (temperature > TEMP_FAN1_ON);
            fan2State = (fan2State) ? (temperature > TEMP_FAN2_ON - TEMP_HYST) : (temperature > TEMP_FAN2_ON);
            fan3State = (fan3State) ? (temperature > TEMP_FAN3_ON - TEMP_HYST) : (temperature > TEMP_FAN3_ON);
            fan4State = (fan4State) ? (temperature > TEMP_FAN4_ON - TEMP_HYST) : (temperature > TEMP_FAN4_ON);
            pumpState = (pumpState) ? (soilMoisturePercent < SOIL_PUMP_ON + SOIL_HYST) : (soilMoisturePercent < SOIL_PUMP_ON);
            applySystemState();
        }
        
        Serial.printf("T:%.1f H:%.1f S:%.1f | F1:%d F2:%d F3:%d F4:%d | P:%d | Mode:%s\n",
            temperature, humidity, soilMoisturePercent,
            fan1State, fan2State, fan3State, fan4State, pumpState,
            (systemMode == 1) ? "AUTO" : "MANUAL");
            
        if (serverRunning) {
            notifyClients();
        }
        
        if (millis() - lastFirebaseUpdate >= 10000) {
            lastFirebaseUpdate = millis();
            if (Firebase.ready()) {
                sendDataToFirebase();
            }
        }
    }
    
    ws.cleanupClients();
    yield(); // Penting: beri waktu ke watchdog
}
```

