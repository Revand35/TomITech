# Planning: Mode Manual Kontrol Relay di Monitoring Page

## 📋 Overview
Menambahkan fitur kontrol relay manual di halaman `monitoring.html` dengan 2 mode operasi:
1. **Mode Otomatis** (existing) - ESP32 mengikuti sensor (contoh: suhu > 30°C → kipas menyala otomatis)
2. **Mode Manual** (new) - ESP32 mengabaikan sensor, relay hanya dikontrol manual dari web

---

## 🎯 Tujuan
- Memberikan kontrol manual untuk 7 channel relay melalui 5 button
- Mempertahankan semua fitur existing (monitoring, stat cards, maps)
- Menyediakan UI yang intuitif untuk switch antara mode otomatis dan manual
- **Mengatur ESP32 untuk mengikuti mode yang dipilih (otomatis vs manual)**

---

## 🔄 Logika Mode Otomatis vs Manual

### Mode Otomatis (ESP32 Autonomous)
- **ESP32 mengikuti sensor secara otomatis**
- Contoh logika:
  - Suhu > 30°C → Kipas 1 & 2 menyala
  - Suhu < 25°C → Kipas 1 & 2 mati
  - Humidity > 80% → Exhaust 1 & 2 menyala
  - Soil Moisture < 40% → Pompa + Valve A + Valve B menyala
- **Web hanya monitoring**, tidak mengirim perintah relay
- ESP32 membuat keputusan sendiri berdasarkan sensor

### Mode Manual (Web Controlled)
- **ESP32 mengabaikan sensor**, hanya mengikuti perintah dari web
- Contoh: Suhu > 30°C tapi kipas tetap mati (kecuali user klik button)
- **Web mengirim perintah relay** ke ESP32
- ESP32 hanya eksekusi perintah, tidak membuat keputusan sendiri
- User punya kontrol penuh melalui button di web

### ⚠️ Penting: Perlu Update KEDUA Kode

**YA, perlu update KEDUA:**
1. **Kode ESP32** - Untuk handle mode switching dan logika auto/manual
2. **Kode Project Web** - Untuk mengirim perintah set mode ke ESP32

**Alasan:**
- ESP32 perlu tahu kapan harus mengikuti sensor vs mengikuti perintah web
- ESP32 perlu memiliki flag/mode state yang menentukan behavior
- Web perlu mengirim perintah untuk switch mode ke ESP32

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

### Button Layout (5 Button)
1. **Button Kipas 1** → Control Relay Kipas 1
2. **Button Kipas 2** → Control Relay Kipas 2
3. **Button Exhaust 1** → Control Relay Exhaust 1
4. **Button Exhaust 2** → Control Relay Exhaust 2
5. **Button Sistem Irigasi** → Control 3 relay sekaligus (Pompa + Valve A + Valve B)

---

## ✅ Jawaban: Apakah 1 Button Bisa untuk 3 Relay?

**YA, BISA!** 

Satu button dapat mengontrol 3 relay sekaligus dengan cara:
- Mengirim 1 request HTTP ke ESP32 dengan payload yang berisi perintah untuk mengaktifkan/menonaktifkan 3 relay sekaligus
- ESP32 akan menerima perintah dan mengaktifkan/menonaktifkan 3 relay secara bersamaan
- Contoh payload: `{ "pump": true, "valveA": true, "valveB": true }`

**Keuntungan:**
- Lebih efisien (1 request vs 3 request)
- Sinkronisasi lebih baik (semua relay aktif/mati bersamaan)
- Mengurangi beban network
- User experience lebih baik (1 klik untuk sistem irigasi lengkap)

---

## 📐 Struktur UI

### 1. Mode Selector (Toggle Switch)
```
┌─────────────────────────────────────┐
│  Mode: [Otomatis] [Manual]          │
│  ─────────────────────────────────  │
└─────────────────────────────────────┘
```

**Lokasi:** Setelah Greenhouse Selector, sebelum Stat Cards

**Komponen:**
- Toggle switch dengan 2 opsi: "Otomatis" dan "Manual"
- Visual indicator untuk mode aktif
- Smooth transition animation

### 2. Mode Otomatis (Existing)
- Tetap seperti sekarang
- Stat Cards (Temperature, Humidity, Soil Moisture)
- Mini Charts
- Map dengan markers
- Real-time sensor monitoring

### 3. Perbandingan Mode Otomatis vs Manual

| Fitur | Mode Otomatis | Mode Manual |
|-------|--------------|-------------|
| **Stat Cards** | ✅ Ditampilkan | ✅ Ditampilkan (sama) |
| **Mini Charts** | ✅ Update real-time | ✅ Update real-time (sama) |
| **Sensor Monitoring** | ✅ Aktif | ✅ Aktif (sama) |
| **Map** | ✅ Ditampilkan | ✅ Ditampilkan (sama) |
| **Kontrol Relay** | ❌ Tidak ada | ✅ **Ditambahkan** |

**Kesimpulan:** Mode manual = Mode otomatis + Kontrol Relay

### 4. Mode Manual (New Section)
```
┌─────────────────────────────────────┐
│  Stat Cards (Sama seperti Otomatis)│
│  ─────────────────────────────────  │
│  [Temperature] [Humidity] [Soil]    │
│  (dengan mini charts)                │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  Kontrol Relay Manual               │
│  ─────────────────────────────────  │
│                                      │
│  [Kipas 1]  [Kipas 2]               │
│  [Exhaust 1] [Exhaust 2]            │
│  [Sistem Irigasi]                   │
│                                      │
│  Status Relay:                       │
│  • Kipas 1: ON/OFF                  │
│  • Kipas 2: ON/OFF                  │
│  • Exhaust 1: ON/OFF                │
│  • Exhaust 2: ON/OFF                │
│  • Pompa: ON/OFF                    │
│  • Valve A: ON/OFF                  │
│  • Valve B: ON/OFF                  │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  Map (Sama seperti Otomatis)        │
│  ─────────────────────────────────  │
│  [Greenhouse Location Map]          │
└─────────────────────────────────────┘
```

**Lokasi:** 
- Stat Cards tetap ditampilkan (sama seperti mode otomatis)
- Kontrol Relay section ditambahkan setelah Stat Cards
- Map tetap ditampilkan di bawah

**Komponen:**
- **Stat Cards & Mini Charts** (sama seperti mode otomatis)
  - Temperature card dengan mini chart
  - Humidity card dengan mini chart
  - Soil Moisture card dengan mini chart
  - Real-time sensor monitoring tetap aktif
- **Kontrol Relay Section**
  - 5 button kontrol relay
  - Status indicator untuk setiap relay (ON/OFF dengan warna)
  - Visual feedback saat button diklik
  - Loading state saat mengirim perintah ke ESP32
- **Map Section** (sama seperti mode otomatis)
  - Greenhouse location map
  - Markers dan area tools

---

## 🔧 Implementasi Teknis

### 1. ESP32 API Endpoint Requirements

#### ⚠️ PENTING: ESP32 Perlu Diupdate

**ESP32 perlu memiliki endpoint berikut (dikembangkan oleh developer ESP32):**

1. **`POST /api/mode`** - Set mode (auto/manual)
   - Request: `{ "mode": "auto" | "manual" }`
   - Response: `{ "success": true, "mode": "auto" | "manual", "previousMode": "..." }`

2. **`GET /api/mode`** - Get current mode
   - Response: `{ "mode": "auto" | "manual", "timestamp": "..." }`

3. **`POST /api/relay`** - Control relay (hanya di mode manual)
   - Request: `{ "relays": { "fan1": true, "fan2": false, ... } }`
   - Response: `{ "success": true, "relays": {...} }`
   - ⚠️ Hanya bekerja jika mode = "manual"

4. **`GET /api/relay/status`** - Get relay status
   - Response: `{ "relays": {...}, "mode": "auto" | "manual", "timestamp": "..." }`

**📄 Detail lengkap requirement ESP32 ada di:** `docs/PLAN_ESP32_RELAY_CONTROL.md`

**File tersebut berisi:**
- Spesifikasi lengkap semua endpoint
- Request/Response format
- Error handling requirements
- Testing checklist
- Contoh request/response

**File tersebut bisa diberikan ke developer ESP32 untuk implementasi.**

### 2. JavaScript Service Module

**File baru:** `assets/js/monitoring/relay-control-service.js`

**Fungsi:**
```javascript
// Set mode ESP32 (auto/manual)
async function setEsp32Mode(mode) {
  // mode: "auto" | "manual"
  // Mengirim POST request ke ESP32 /api/mode
  // Return: { success: true, mode: "manual" }
}

// Get current mode ESP32
async function getEsp32Mode() {
  // Mengirim GET request ke ESP32 /api/mode
  // Return: { mode: "auto" | "manual" }
}

// Kontrol relay individual atau multiple
async function controlRelay(relayConfig) {
  // relayConfig: { fan1: true, fan2: false, ... }
  // Mengirim POST request ke ESP32 /api/relay
  // ⚠️ Hanya bekerja jika mode = "manual"
}

// Ambil status semua relay
async function getRelayStatus() {
  // Mengirim GET request ke ESP32 /api/relay/status
  // Return: { fan1: true, fan2: false, ... }
}

// Kontrol sistem irigasi (3 relay sekaligus)
async function controlIrrigationSystem(on) {
  // on: true/false
  // Mengaktifkan/menonaktifkan: pump + valveA + valveB
  // ⚠️ Hanya bekerja jika mode = "manual"
}
```

### 3. UI Components

**File:** `pages/features/monitoring.html`

**Tambahan HTML:**
- Mode selector toggle
- Manual control section (hidden by default, ditampilkan setelah stat cards)
- 5 button kontrol
- Status indicator untuk setiap relay
- **Note:** Stat Cards dan Map tetap ditampilkan di kedua mode

**Tambahan CSS:**
- Style untuk mode selector
- Style untuk button kontrol relay
- Style untuk status indicator
- Animation untuk transition mode
- Responsive design untuk mobile

**Tambahan JavaScript:**
- Event handler untuk mode selector
  - **Saat switch ke "Manual":** Kirim `POST /api/mode` dengan `{ "mode": "manual" }`
  - **Saat switch ke "Otomatis":** Kirim `POST /api/mode` dengan `{ "mode": "auto" }`
  - **Validasi:** Pastikan ESP32 berhasil switch mode sebelum enable button
- Event handler untuk button relay
  - **Validasi mode:** Pastikan mode = "manual" sebelum kirim perintah
  - **Error handling:** Jika ESP32 masih mode "auto", tampilkan warning
- Function untuk update status relay
- **Sensor monitoring tetap aktif di mode manual** (sama seperti mode otomatis)
- Polling status relay (setiap 2-3 detik saat mode manual)
- Polling sensor data (setiap 5 detik, sama seperti mode otomatis)
- **Polling mode ESP32** (setiap 5 detik untuk sync state)
- Error handling untuk komunikasi ESP32
- **Shared sensor monitoring logic** antara mode otomatis dan manual
- **Mode sync logic:** Pastikan UI mode sesuai dengan ESP32 mode

---

## 📱 Layout Responsif

### Desktop (> 768px)
- **Stat Cards:** 3 kolom (Temperature, Humidity, Soil Moisture)
- **Kontrol Relay:**
  - Button grid: 2 kolom untuk 4 button pertama, 1 kolom untuk button irigasi
  - Status indicator: Side-by-side dengan button
- **Map:** Full width di bawah

### Mobile (≤ 768px)
- **Stat Cards:** 1 kolom (stacked)
- **Kontrol Relay:**
  - Button grid: 1 kolom (stacked)
  - Status indicator: Di bawah button
  - Full width button untuk kemudahan tap
- **Map:** Full width dengan height 300px

---

## 🔄 Flow Diagram

### Mode Otomatis (Existing)
```
User → Select Greenhouse → Monitor Sensor → Update UI
```

### Mode Manual (New)
```
User → Switch to Manual → Send POST /api/mode { "mode": "manual" }
  ↓
ESP32 → Set Mode = "manual" → Disable Auto Logic
  ↓
Display Stat Cards + Control Buttons
  ↓
Continue Monitoring Sensors (same as Auto mode)
  ↓
User → Click Button → Send POST /api/relay { "relays": {...} }
  ↓
ESP32 → Check Mode = "manual" → Process Command → Update Relay State
  ↓
ESP32 → Return Status → Update UI Status Indicator
  ↓
Poll Relay Status Every 2-3 seconds → Keep UI in sync
Poll Sensor Data Every 5 seconds → Keep Stat Cards updated
Poll ESP32 Mode Every 5 seconds → Keep mode in sync
```

### Mode Otomatis (Switch from Manual)
```
User → Switch to Auto → Send POST /api/mode { "mode": "auto" }
  ↓
ESP32 → Set Mode = "auto" → Enable Auto Logic
  ↓
ESP32 → Start Following Sensor Rules
  ↓
Hide Control Buttons, Show Only Stat Cards
  ↓
ESP32 Auto Logic:
  - Suhu > 30°C → Kipas menyala
  - Humidity > 80% → Exhaust menyala
  - Soil < 40% → Pompa + Valve menyala
  ↓
Continue Monitoring Sensors
```

---

## 🎨 UI/UX Considerations

### Visual Feedback
1. **Button States:**
   - Default: Gray/Neutral
   - Active (ON): Green dengan icon check
   - Inactive (OFF): Gray dengan icon X
   - Loading: Spinner animation
   - Error: Red dengan error icon

2. **Status Indicator:**
   - ON: Green badge dengan text "ON"
   - OFF: Gray badge dengan text "OFF"
   - Unknown: Yellow badge dengan text "?"

3. **Mode Transition:**
   - Smooth fade in/out animation
   - Loading state saat switch mode
   - Preserve state saat switch mode

### Error Handling
1. **ESP32 Tidak Terhubung:**
   - Tampilkan warning banner
   - Disable semua button
   - Tampilkan pesan: "ESP32 tidak terhubung"

2. **Request Timeout:**
   - Tampilkan error toast
   - Retry button
   - Log error ke console

3. **Invalid Response:**
   - Tampilkan error message
   - Fallback ke status terakhir yang diketahui

---

## 📝 File yang Akan Dimodifikasi/Ditambahkan

### File Baru:
1. `assets/js/monitoring/relay-control-service.js` - Service untuk komunikasi dengan ESP32 relay API

### File yang Dimodifikasi:
1. `pages/features/monitoring.html`
   - Tambah mode selector UI
   - Tambah manual control section
   - Tambah CSS untuk mode manual
   - Tambah JavaScript untuk mode switching dan relay control

---

## 🧪 Testing Checklist

### Functional Testing
- [ ] Mode selector berfungsi dengan baik
- [ ] **Stat Cards tetap ditampilkan di mode manual**
- [ ] **Mini Charts tetap update di mode manual**
- [ ] **Sensor monitoring tetap aktif di mode manual**
- [ ] Button relay mengirim perintah ke ESP32
- [ ] Status relay ter-update dengan benar
- [ ] Button sistem irigasi mengaktifkan 3 relay sekaligus
- [ ] Polling status relay bekerja dengan baik
- [ ] **Polling sensor data bekerja di kedua mode**
- [ ] **Mode switching mengirim perintah ke ESP32 (POST /api/mode)**
- [ ] **ESP32 mode sync dengan UI mode**
- [ ] **Button relay hanya bekerja di mode manual**
- [ ] **ESP32 mengabaikan sensor di mode manual (contoh: suhu > 30 tapi kipas tetap mati)**
- [ ] **ESP32 mengikuti sensor di mode otomatis (contoh: suhu > 30 → kipas menyala)**
- [ ] Error handling untuk ESP32 tidak terhubung
- [ ] Mode otomatis tetap berfungsi seperti sebelumnya
- [ ] **Tidak ada duplikasi polling saat switch mode**

### UI/UX Testing
- [ ] Transisi mode smooth
- [ ] Button responsive dan mudah diklik
- [ ] Status indicator jelas dan mudah dibaca
- [ ] Loading state terlihat jelas
- [ ] Error message informatif
- [ ] Mobile responsive

### Integration Testing
- [ ] Komunikasi dengan ESP32 berjalan dengan baik
- [ ] Multiple button click tidak menyebabkan conflict
- [ ] Status sync antara UI dan ESP32
- [ ] Tidak ada memory leak dari polling

---

## 🚀 Implementation Steps

### Phase 1: Setup (Tidak mengubah existing code)
1. Buat file `relay-control-service.js`
2. Buat HTML structure untuk mode selector dan manual control (hidden)
3. Buat CSS untuk mode manual (belum aktif)

### Phase 2: Mode Switching
1. Implement mode selector toggle
2. **Stat Cards dan Map tetap visible di kedua mode**
3. Show/hide hanya kontrol relay section berdasarkan mode
4. Test transition animation
5. **Pastikan sensor monitoring tidak terhenti saat switch mode**

### Phase 3: Mode Management
1. Implement `setEsp32Mode()` function
2. Implement `getEsp32Mode()` function
3. **Update ESP32 code untuk handle mode switching**
4. Test mode switching dengan ESP32
5. Validasi mode sebelum enable button relay

### Phase 4: Relay Control
1. Implement button click handlers
2. Implement `controlRelay()` function
3. Implement `getRelayStatus()` function
4. **Validasi mode = "manual" sebelum kirim perintah**
5. Test komunikasi dengan ESP32

### Phase 5: Status Polling
1. Implement polling mechanism untuk relay status
2. Implement polling mechanism untuk ESP32 mode
3. Update status indicator
4. Handle error states
5. **Sync UI mode dengan ESP32 mode**

### Phase 6: Polish & Testing
1. Add loading states
2. Add error handling
3. Test semua scenarios
4. Optimize performance

---

## ⚠️ Catatan Penting

1. **Tidak Mengubah Existing Code:**
   - Mode otomatis harus tetap berfungsi 100% seperti sebelumnya
   - Semua fitur existing (sensor monitoring, maps, charts) tidak boleh terganggu
   - **Stat Cards dan Mini Charts tetap ditampilkan di mode manual**

2. **Sensor Monitoring di Mode Manual:**
   - Sensor monitoring tetap aktif di mode manual (sama seperti mode otomatis)
   - Stat Cards (Temperature, Humidity, Soil Moisture) tetap update real-time
   - Mini Charts tetap menampilkan data sensor terbaru
   - Map tetap ditampilkan dengan markers
   - **Tidak ada perbedaan dalam hal sensor monitoring antara mode otomatis dan manual**

3. **ESP32 Requirements:**
   
   **⚠️ PENTING:** ESP32 perlu diupdate oleh developer ESP32 sesuai requirement di `docs/PLAN_ESP32_RELAY_CONTROL.md`
   
   **Summary requirement ESP32:**
   - Endpoint `POST /api/mode` - Set mode (auto/manual)
   - Endpoint `GET /api/mode` - Get current mode
   - Endpoint `POST /api/relay` - Control relay (hanya di mode manual)
   - Endpoint `GET /api/relay/status` - Get relay status
   - Mode state management (auto/manual)
   - Logika conditional (auto = ikuti sensor, manual = ikuti perintah web)
   - CORS support untuk semua endpoint
   
   **Detail lengkap:** Lihat `docs/PLAN_ESP32_RELAY_CONTROL.md`

4. **Backward Compatibility:**
   - Jika ESP32 tidak support relay control, mode manual harus disable dengan pesan yang jelas
   - Default mode adalah "Otomatis" untuk menjaga kompatibilitas
   - **Sensor monitoring tetap berfungsi meskipun relay control tidak tersedia**

5. **Security:**
   - Pastikan hanya user yang terautentikasi bisa mengontrol relay
   - Validasi input sebelum mengirim ke ESP32
   - Rate limiting untuk mencegah spam request

---

## 📚 Referensi

- ESP32 Web Server API documentation
- Existing sensor monitoring implementation
- TOMITECH Design System CSS variables

---

---

## 📚 Referensi File Terkait

### ESP32 Planning (Untuk Developer ESP32)
**File:** `docs/PLAN_ESP32_RELAY_CONTROL.md`

File ini berisi requirement lengkap untuk implementasi ESP32:
- Spesifikasi semua endpoint yang diperlukan
- Request/Response format detail
- Logika conditional yang diperlukan
- Contoh request/response scenarios
- Testing checklist untuk ESP32

**File tersebut bisa diberikan langsung ke developer ESP32 untuk implementasi.**

### Web Project Planning (File Ini)
**File:** `docs/PLAN_MODE_MANUAL_RELAY_CONTROL.md`

File ini berisi planning untuk implementasi di project web:
- UI/UX design
- JavaScript service module
- HTML/CSS components
- Integration dengan ESP32 API
- Testing checklist untuk web

---

**Status:** Planning Complete ✅
**Next Step:** Review planning dengan user sebelum implementasi

