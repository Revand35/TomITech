# Solusi: Mengurangi Ukuran Program ESP32

## Masalah
```
Sketch uses 1385387 bytes (105%) of program storage space. Maximum is 1310720 bytes.
```

## Solusi 1: Ubah Partition Scheme (RECOMMENDED)

### Langkah-langkah:
1. Di Arduino IDE, buka **Tools → Partition Scheme**
2. Pilih: **"Huge APP (3MB No OTA/1MB SPIFFS)"** atau **"No OTA (2MB APP/2MB SPIFFS)"**
3. Compile ulang

**Ini akan memberikan lebih banyak ruang untuk program (3MB instead of 1.3MB)**

---

## Solusi 2: Optimasi Library Firebase

### Gunakan Firebase dengan mode minimal:

Di `setupFirebase()`, tambahkan:

```cpp
void setupFirebase() {
    Serial.println("🔥 Initializing Firebase...");
    
    // Set Firebase Database URL
    config.database_url = FIREBASE_DATABASE_URL;
    
    // Setup service account authentication
    config.service_account.data.client_email = FIREBASE_CLIENT_EMAIL;
    config.service_account.data.project_id = FIREBASE_PROJECT_ID;
    config.service_account.data.private_key = FIREBASE_PRIVATE_KEY;
    
    // OPTIMASI: Nonaktifkan fitur yang tidak digunakan
    config.signer.test_mode = false;
    config.timeout.serverResponse = 10 * 1000;
    config.timeout.socketConnection = 10 * 1000;
    
    // Initialize Firebase
    Firebase.begin(&config, &auth);
    Firebase.reconnectWiFi(true);
    
    // Set buffer size lebih kecil
    fbdo.setBSSLBufferSize(2048, 512); // Kurangi dari 4096, 1024
    fbdo.setResponseSize(2048); // Kurangi dari 4096
    
    Serial.println("✅ Firebase initialized successfully");
}
```

---

## Solusi 3: Kompres HTML di web_page.h

### Gunakan HTML yang lebih minimal:

Ganti isi `web_page.h` dengan versi yang lebih ringkas:

```cpp
#ifndef WEB_PAGE_H
#define WEB_PAGE_H

const char index_html[] PROGMEM = R"rawliteral(
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>ESP32 Greenhouse</title>
<style>
body{font-family:Arial;max-width:800px;margin:0 auto;padding:20px;background:#f0f0f0}
.container{background:#fff;padding:20px;border-radius:10px;box-shadow:0 2px 10px rgba(0,0,0,0.1)}
h1{color:#2c4d32;text-align:center}
.sensor-data{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:15px;margin:20px 0}
.sensor-box{background:#edefed;padding:15px;border-radius:8px;text-align:center}
.sensor-value{font-size:24px;font-weight:bold;color:#3ea377}
button{padding:12px;border:none;border-radius:5px;font-size:16px;cursor:pointer}
.btn-on{background:#3ea377;color:#fff}
.btn-off{background:#ccc;color:#333}
</style>
</head>
<body>
<div class="container">
<h1>🌱 ESP32 Greenhouse Control</h1>
<div id="status" style="text-align:center;padding:10px;margin:10px 0;border-radius:5px;background:#f8d7da;color:#721c24">Menghubungkan...</div>
<div class="sensor-data">
<div class="sensor-box"><h3>🌡️ Suhu</h3><div class="sensor-value" id="temp">--</div><small>°C</small></div>
<div class="sensor-box"><h3>💧 Kelembaban</h3><div class="sensor-value" id="hum">--</div><small>%</small></div>
<div class="sensor-box"><h3>🌱 Tanah</h3><div class="sensor-value" id="soil">--</div><small>%</small></div>
</div>
<div style="text-align:center;margin:20px 0">
<button onclick="toggleMode()" style="padding:15px 30px;font-size:18px;background:#4285F4;color:#fff">Mode: <span id="modeText">AUTO</span></button>
</div>
<div><h2>Kontrol Relay</h2>
<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px">
<button id="fan1" class="btn-off" onclick="toggleRelay('FAN1')">Kipas 1: OFF</button>
<button id="fan2" class="btn-off" onclick="toggleRelay('FAN2')">Kipas 2: OFF</button>
<button id="fan3" class="btn-off" onclick="toggleRelay('FAN3')">Kipas 3: OFF</button>
<button id="fan4" class="btn-off" onclick="toggleRelay('FAN4')">Kipas 4: OFF</button>
<button id="pump" class="btn-off" onclick="toggleRelay('PUMP')">Pompa: OFF</button>
</div>
</div>
</div>
<script>
let ws,currentMode=1;
function initWebSocket(){
const wsUrl=(window.location.protocol==='https:'?'wss:':'ws:')+'//'+window.location.hostname+'/ws';
ws=new WebSocket(wsUrl);
ws.onopen=()=>{document.getElementById('status').textContent='Terhubung';document.getElementById('status').style.background='#d4edda';document.getElementById('status').style.color='#155724'};
ws.onclose=()=>{document.getElementById('status').textContent='Terputus - Reconnecting...';document.getElementById('status').style.background='#f8d7da';document.getElementById('status').style.color='#721c24';setTimeout(initWebSocket,2000)};
ws.onmessage=e=>{const d=JSON.parse(e.data);updateDisplay(d)};
ws.onerror=e=>console.error('WebSocket Error:',e)
}
function updateDisplay(d){
if(d.temp!==undefined)document.getElementById('temp').textContent=d.temp.toFixed(1);
if(d.hum!==undefined)document.getElementById('hum').textContent=d.hum.toFixed(1);
if(d.soil_percent!==undefined)document.getElementById('soil').textContent=d.soil_percent.toFixed(1);
if(d.mode!==undefined){currentMode=d.mode;document.getElementById('modeText').textContent=currentMode===1?'AUTO':'MANUAL'}
updateRelayButton('fan1',d.fan1);updateRelayButton('fan2',d.fan2);updateRelayButton('fan3',d.fan3);updateRelayButton('fan4',d.fan4);updateRelayButton('pump',d.pump)
}
function updateRelayButton(id,state){
const btn=document.getElementById(id),isOn=state==='ON',labels={'fan1':'Kipas 1','fan2':'Kipas 2','fan3':'Kipas 3','fan4':'Kipas 4','pump':'Pompa'};
btn.className=isOn?'btn-on':'btn-off';btn.textContent=labels[id]+': '+state
}
function toggleMode(){if(ws&&ws.readyState===WebSocket.OPEN)ws.send('TOGGLE_MODE')}
function toggleRelay(r){
if(currentMode!==2){alert('Mode harus MANUAL!');return}
if(ws&&ws.readyState===WebSocket.OPEN){
const c={'FAN1':'TOGGLE_FAN1','FAN2':'TOGGLE_FAN2','FAN3':'TOGGLE_FAN3','FAN4':'TOGGLE_FAN4','PUMP':'TOGGLE_PUMP'};
ws.send(c[r])
}
}
window.onload=initWebSocket;
</script>
</body>
</html>
)rawliteral";

#endif
```

**Ini akan mengurangi ukuran HTML dari ~8KB menjadi ~3KB**

---

## Solusi 4: Nonaktifkan Fitur yang Tidak Digunakan

### Hapus atau comment bagian yang tidak perlu:

1. **Jika tidak menggunakan WebSocket**, hapus:
   - `AsyncWebSocket ws("/ws");`
   - Fungsi `onWsEvent()`
   - `ws.onEvent()` di setup

2. **Jika tidak menggunakan mDNS**, hapus:
   - `#include <ESPmDNS.h>`
   - `MDNS.begin()` dan `MDNS.addService()`

3. **Kurangi buffer size**:
   ```cpp
   // Di setupFirebase()
   fbdo.setBSSLBufferSize(1024, 256); // Minimal
   fbdo.setResponseSize(1024);
   ```

---

## Solusi 5: Gunakan Compiler Flags

### Di Arduino IDE:
1. **File → Preferences**
2. Di "Additional Boards Manager URLs", tambahkan (jika belum ada)
3. **Tools → Compiler warnings** → Pilih "None" (untuk mengurangi ukuran)

---

## Solusi 6: Alternatif - Gunakan HTTP POST ke Firebase (Lebih Ringan)

Jika Firebase library terlalu besar, gunakan HTTP POST langsung:

```cpp
#include <HTTPClient.h>

void sendDataToFirebaseHTTP() {
    HTTPClient http;
    String url = String(FIREBASE_DATABASE_URL) + "/sensor_data/" + String(millis()) + ".json";
    
    http.begin(url);
    http.addHeader("Content-Type", "application/json");
    
    String json = "{";
    json += "\"temperature\":" + String(temperature) + ",";
    json += "\"humidity\":" + String(humidity) + ",";
    json += "\"soilMoisture\":" + String(soilMoisturePercent);
    json += "}";
    
    int httpResponseCode = http.PUT(json);
    if (httpResponseCode > 0) {
        Serial.println("✅ Data terkirim ke Firebase");
    } else {
        Serial.printf("❌ Error: %d\n", httpResponseCode);
    }
    http.end();
}
```

**Catatan**: Ini memerlukan Firebase Database Rules yang mengizinkan write tanpa auth, atau menggunakan Database Secret.

---

## Rekomendasi Urutan Solusi:

1. **Coba Solusi 1 dulu** (Ubah Partition Scheme) - Paling mudah dan efektif
2. Jika masih terlalu besar, **Solusi 3** (Kompres HTML)
3. Jika masih terlalu besar, **Solusi 2** (Optimasi Firebase)
4. Terakhir, **Solusi 6** (Gunakan HTTP langsung, tanpa Firebase library)

---

## Setelah Mengubah Partition Scheme:

1. Upload kode lagi
2. Jika masih error, coba solusi lainnya
3. Monitor ukuran program di output compile

