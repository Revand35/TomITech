# Setup CORS untuk ESP32 - TOMITECH

## Masalah
Browser memblokir request ke ESP32 karena tidak ada CORS headers. Error yang muncul:
```
Access to fetch at 'http://192.168.1.11/api' from origin 'http://127.0.0.1:8080' 
has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present
```

## Solusi: Tambahkan CORS Headers di ESP32

### ⚠️ PENTING: Pilih library yang sesuai!

Ada 2 jenis web server library untuk ESP32:
1. **ESPAsyncWebServer** (Async) - Lebih modern, non-blocking
2. **WebServer** (Sync) - Standard Arduino

---

### ✅ Untuk ESPAsyncWebServer (RECOMMENDED - Non-blocking)

**Jika Anda menggunakan `ESPAsyncWebServer.h`** (seperti di `coba2.ino`):

```cpp
#include <WiFi.h>
#include <ESPAsyncWebServer.h>
#include <ArduinoJson.h>

AsyncWebServer server(80);

// Handler untuk endpoint /api
void handleApi(AsyncWebServerRequest *request) {
    // TAMBAHKAN CORS HEADERS INI
    AsyncWebServerResponse *response = request->beginResponse(200, "application/json", "{}");
    response->addHeader("Access-Control-Allow-Origin", "*");
    response->addHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    response->addHeader("Access-Control-Allow-Headers", "Content-Type");
    
    // Baca data sensor (contoh)
    float temperature = 25.5; // Ganti dengan pembacaan sensor sebenarnya
    float humidity = 60.0;    // Ganti dengan pembacaan sensor sebenarnya
    
    // Buat JSON response
    DynamicJsonDocument doc(1024);
    doc["temperature"] = temperature;
    doc["humidity"] = humidity;
    
    String json;
    serializeJson(doc, json);
    
    // Update response dengan JSON
    response = request->beginResponse(200, "application/json", json);
    response->addHeader("Access-Control-Allow-Origin", "*");
    response->addHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    response->addHeader("Access-Control-Allow-Headers", "Content-Type");
    
    request->send(response);
}

// Handler untuk OPTIONS (preflight CORS check)
void handleOptions(AsyncWebServerRequest *request) {
    AsyncWebServerResponse *response = request->beginResponse(200, "text/plain", "");
    response->addHeader("Access-Control-Allow-Origin", "*");
    response->addHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    response->addHeader("Access-Control-Allow-Headers", "Content-Type");
    request->send(response);
}

void setup() {
    Serial.begin(115200);
    
    // Setup WiFi
    WiFi.begin("SSID_WIFI", "PASSWORD_WIFI");
    while (WiFi.status() != WL_CONNECTED) {
        delay(500);
        Serial.print(".");
    }
    Serial.println("");
    Serial.print("IP Address: ");
    Serial.println(WiFi.localIP());
    
    // Setup server routes
    server.on("/api", HTTP_GET, handleApi);
    server.on("/api", HTTP_OPTIONS, handleOptions);  // PENTING: Handle OPTIONS
    
    server.begin();
    Serial.println("Async Web Server started");
}
```

**Atau versi lebih sederhana (tanpa ArduinoJson):**

```cpp
void handleApi(AsyncWebServerRequest *request) {
    // Baca data sensor
    float temperature = 25.5;
    float humidity = 60.0;
    
    // Buat JSON response
    String json = "{";
    json += "\"temperature\":" + String(temperature) + ",";
    json += "\"humidity\":" + String(humidity);
    json += "}";
    
    // Kirim response dengan CORS headers
    AsyncWebServerResponse *response = request->beginResponse(200, "application/json", json);
    response->addHeader("Access-Control-Allow-Origin", "*");
    response->addHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    response->addHeader("Access-Control-Allow-Headers", "Content-Type");
    request->send(response);
}

void handleOptions(AsyncWebServerRequest *request) {
    AsyncWebServerResponse *response = request->beginResponse(200, "text/plain", "");
    response->addHeader("Access-Control-Allow-Origin", "*");
    response->addHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    response->addHeader("Access-Control-Allow-Headers", "Content-Type");
    request->send(response);
}

// Di setup():
server.on("/api", HTTP_GET, handleApi);
server.on("/api", HTTP_OPTIONS, handleOptions);  // JANGAN LUPA INI!
```

---

### Untuk WebServer (Standard - Blocking)

**Jika Anda menggunakan `WebServer.h`** (standard Arduino):

```cpp
#include <WiFi.h>
#include <WebServer.h>

WebServer server(80);

// Handler untuk endpoint /api
void handleApi() {
    // TAMBAHKAN CORS HEADERS INI
    server.sendHeader("Access-Control-Allow-Origin", "*");
    server.sendHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    server.sendHeader("Access-Control-Allow-Headers", "Content-Type");
    
    // Handle OPTIONS request (preflight CORS check)
    if (server.method() == HTTP_OPTIONS) {
        server.send(200, "text/plain", "");
        return;
    }
    
    // Baca data sensor (contoh)
    float temperature = 25.5; // Ganti dengan pembacaan sensor sebenarnya
    float humidity = 60.0;    // Ganti dengan pembacaan sensor sebenarnya
    
    // Buat JSON response
    String json = "{";
    json += "\"temperature\":" + String(temperature) + ",";
    json += "\"humidity\":" + String(humidity);
    json += "}";
    
    // Kirim response
    server.send(200, "application/json", json);
}

void setup() {
    Serial.begin(115200);
    
    // Setup WiFi
    WiFi.begin("SSID_WIFI", "PASSWORD_WIFI");
    while (WiFi.status() != WL_CONNECTED) {
        delay(500);
        Serial.print(".");
    }
    Serial.println("");
    Serial.print("IP Address: ");
    Serial.println(WiFi.localIP());
    
    // Setup server routes
    server.on("/api", handleApi);
    
    server.begin();
    Serial.println("Server started");
}

void loop() {
    server.handleClient();
}
```

### Untuk ESP8266 (Arduino Framework)

```cpp
#include <ESP8266WiFi.h>
#include <ESP8266WebServer.h>

ESP8266WebServer server(80);

// Handler untuk endpoint /api
void handleApi() {
    // TAMBAHKAN CORS HEADERS INI
    server.sendHeader("Access-Control-Allow-Origin", "*");
    server.sendHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    server.sendHeader("Access-Control-Allow-Headers", "Content-Type");
    
    // Handle OPTIONS request (preflight CORS check)
    if (server.method() == HTTP_OPTIONS) {
        server.send(200, "text/plain", "");
        return;
    }
    
    // Baca data sensor (contoh)
    float temperature = 25.5;
    float humidity = 60.0;
    
    // Buat JSON response
    String json = "{";
    json += "\"temperature\":" + String(temperature) + ",";
    json += "\"humidity\":" + String(humidity);
    json += "}";
    
    // Kirim response
    server.send(200, "application/json", json);
}

void setup() {
    Serial.begin(115200);
    
    // Setup WiFi
    WiFi.begin("SSID_WIFI", "PASSWORD_WIFI");
    while (WiFi.status() != WL_CONNECTED) {
        delay(500);
        Serial.print(".");
    }
    Serial.println("");
    Serial.print("IP Address: ");
    Serial.println(WiFi.localIP());
    
    // Setup server routes
    server.on("/api", handleApi);
    
    server.begin();
    Serial.println("Server started");
}

void loop() {
    server.handleClient();
}
```

### Contoh Lengkap dengan DHT22 Sensor

```cpp
#include <WiFi.h>
#include <WebServer.h>
#include <DHT.h>

#define DHTPIN 4        // Pin DHT22
#define DHTTYPE DHT22   // Tipe sensor

DHT dht(DHTPIN, DHTTYPE);
WebServer server(80);

// Handler untuk endpoint /api
void handleApi() {
    // TAMBAHKAN CORS HEADERS
    server.sendHeader("Access-Control-Allow-Origin", "*");
    server.sendHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    server.sendHeader("Access-Control-Allow-Headers", "Content-Type");
    
    // Handle OPTIONS request (preflight)
    if (server.method() == HTTP_OPTIONS) {
        server.send(200, "text/plain", "");
        return;
    }
    
    // Baca data dari sensor DHT22
    float temperature = dht.readTemperature();
    float humidity = dht.readHumidity();
    
    // Cek jika pembacaan gagal
    if (isnan(temperature) || isnan(humidity)) {
        server.send(500, "application/json", "{\"error\":\"Failed to read sensor\"}");
        return;
    }
    
    // Buat JSON response
    String json = "{";
    json += "\"temperature\":" + String(temperature) + ",";
    json += "\"humidity\":" + String(humidity);
    json += "}";
    
    // Kirim response
    server.send(200, "application/json", json);
}

void setup() {
    Serial.begin(115200);
    dht.begin();
    
    // Setup WiFi
    WiFi.begin("SSID_WIFI", "PASSWORD_WIFI");
    while (WiFi.status() != WL_CONNECTED) {
        delay(500);
        Serial.print(".");
    }
    Serial.println("");
    Serial.print("IP Address: ");
    Serial.println(WiFi.localIP());
    
    // Setup server routes
    server.on("/api", handleApi);
    
    server.begin();
    Serial.println("Server started");
}

void loop() {
    server.handleClient();
    delay(100);
}
```

## Langkah-langkah

1. **Buka kode ESP32 Anda** di Arduino IDE atau platform lainnya
2. **Cari handler `/api`** atau buat handler baru
3. **Tambahkan 3 baris CORS headers** di awal handler:
   ```cpp
   server.sendHeader("Access-Control-Allow-Origin", "*");
   server.sendHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
   server.sendHeader("Access-Control-Allow-Headers", "Content-Type");
   ```
4. **Tambahkan handler untuk OPTIONS request** (preflight):
   ```cpp
   if (server.method() == HTTP_OPTIONS) {
       server.send(200, "text/plain", "");
       return;
   }
   ```
5. **Upload kode ke ESP32**
6. **Refresh halaman monitoring** di browser

## Testing

Setelah upload, test endpoint dengan browser atau curl:

```bash
# Test dengan curl
curl -X GET http://192.168.1.11/api

# Test OPTIONS (preflight)
curl -X OPTIONS http://192.168.1.11/api -H "Origin: http://127.0.0.1:8080"
```

Response harus mengandung header:
- `Access-Control-Allow-Origin: *`
- `Access-Control-Allow-Methods: GET, OPTIONS`
- `Access-Control-Allow-Headers: Content-Type`

## Catatan Penting

1. **`Access-Control-Allow-Origin: *`** mengizinkan semua origin. Untuk production, ganti dengan origin spesifik:
   ```cpp
   server.sendHeader("Access-Control-Allow-Origin", "http://127.0.0.1:8080");
   ```

2. **OPTIONS request** adalah preflight check yang dilakukan browser sebelum request sebenarnya. Harus di-handle dengan benar.

3. **Pastikan ESP32 dan komputer dalam jaringan WiFi yang sama**.

4. **Format JSON response** harus sesuai dengan yang diharapkan:
   ```json
   {
     "temperature": 25.5,
     "humidity": 60.0
   }
   ```

## Troubleshooting

### Masih error CORS setelah menambahkan headers?
- Pastikan headers ditambahkan **sebelum** `server.send()`
- Pastikan handler OPTIONS sudah ditambahkan
- Cek di Serial Monitor apakah handler dipanggil
- Test dengan curl untuk melihat response headers

### Error 500 Internal Server Error?
- Cek Serial Monitor untuk error messages
- Pastikan sensor terhubung dengan benar
- Pastikan format JSON valid
- Cek apakah ada error di kode ESP32

### Tidak bisa connect ke ESP32?
- Pastikan IP address benar (cek di Serial Monitor)
- Pastikan ESP32 dan komputer dalam WiFi yang sama
- Coba ping IP address: `ping 192.168.1.11`
- Cek firewall settings

