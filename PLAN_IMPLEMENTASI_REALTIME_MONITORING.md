# 📋 PLAN IMPLEMENTASI REAL-TIME MONITORING GREENHOUSE
## Analisis & Rencana Implementasi Template TOMITECH ke Projek Utama

---

## 🎯 TUJUAN PROJEK
- Memantau **3 greenhouse** secara real-time
- Akses dan monitoring kondisi di dalam setiap greenhouse
- Visualisasi data sensor dengan grafik real-time
- Menampilkan lokasi greenhouse di peta (Google Maps)

---

## 📊 ANALISIS TEMPLATE TOMITECH

### 1. **Struktur Template Dashboard**
- **Framework**: Material Dashboard (Dark Edition)
- **Charts**: Chart.js dengan plugin streaming untuk real-time
- **Maps**: Google Maps API
- **Data Source**: API eksternal (XMLHttpRequest polling setiap 1 detik)
- **UI Components**: 
  - Stat cards untuk nilai sensor real-time
  - Live charts dengan streaming plugin
  - Google Maps untuk lokasi
  - Dropdown untuk switch antar station

### 2. **Fitur Template yang Bisa Diadopsi**
✅ **Real-time Charts** - Chart.js dengan streaming plugin
✅ **Stat Cards** - Menampilkan nilai sensor terkini
✅ **Google Maps** - Menampilkan lokasi greenhouse
✅ **Multi-station Support** - Dropdown untuk switch antar station
✅ **Dark Theme UI** - Material Dashboard design
✅ **Responsive Design** - Mobile & desktop friendly

### 3. **Perbedaan dengan Projek Utama**
| Aspek | Template | Projek Utama |
|-------|----------|--------------|
| Data Source | API Eksternal (polling) | Firestore (real-time listener) |
| Framework | Material Dashboard | TOMITECH Design System |
| Charts | Chart.js + Streaming | Belum ada |
| Maps | Google Maps | Belum ada |
| Greenhouse | Multiple stations | Multiple greenhouses (sudah ada) |
| Sensor Data | Weather station | Greenhouse sensors (temperature, humidity, light, soil) |

---

## 🏗️ STRUKTUR PROJEK SAAT INI

### **File yang Sudah Ada:**
- ✅ `dashboard.html` - Dashboard utama
- ✅ `assets/js/greenhouse/greenhouse-service.js` - Service untuk greenhouse
- ✅ `assets/js/greenhouse/ai-summary-service.js` - AI summary service
- ✅ Firestore collections: `greenhouses`, `sensor_data`, `plants`, `aggregate_data`
- ✅ Fungsi: `getUserGreenhouses()`, `getLatestSensorData()`, `getHistoricalSensorData()`

### **Data Structure di Firestore:**
```javascript
// greenhouses collection
{
  userId: string,
  name: string,
  location: string,  // ← Bisa ditambah lat/lng untuk maps
  totalPlants: number,
  activePlants: number,
  createdAt: Timestamp,
  updatedAt: Timestamp
}

// sensor_data collection
{
  userId: string,
  greenhouseId: string,
  temperature: number,      // °C
  humidity: number,         // %
  lightLevel: number,       // lux
  soilMoisture: number,     // %
  timestamp: Timestamp,
  createdAt: Timestamp
}
```

---

## 📝 PLAN IMPLEMENTASI (TANPA MENGUBAH FILE LAMA)

### **PHASE 1: Setup Dependencies & Assets**

#### 1.1 Copy Assets dari Template
**File Baru yang Perlu Dibuat:**
```
assets/js/charts/
  ├── chartjs-plugin-streaming.min.js  (dari template)
  └── realtime-chart-manager.js        (BARU - manager untuk charts)

assets/js/maps/
  └── greenhouse-map-manager.js       (BARU - manager untuk Google Maps)

assets/js/monitoring/
  ├── realtime-sensor-monitor.js       (BARU - Firestore real-time listener)
  └── greenhouse-selector.js          (BARU - switch antar greenhouse)
```

#### 1.2 Update HTML untuk Include Libraries
**File Baru:** `pages/features/monitoring.html` (halaman monitoring baru)
- Include Chart.js dari CDN
- Include Chart.js streaming plugin
- Include Google Maps API
- Include semua service files baru

---

### **PHASE 2: Real-Time Sensor Monitoring Service**

#### 2.1 File: `assets/js/monitoring/realtime-sensor-monitor.js`
**Fungsi:**
- Setup Firestore `onSnapshot` listener untuk real-time updates
- Support multiple greenhouse monitoring
- Auto-update stat cards dan charts saat data baru masuk
- Handle connection status (online/offline)
- Cleanup listener saat tidak digunakan

**Struktur:**
```javascript
class RealtimeSensorMonitor {
  constructor(greenhouseId) {
    this.greenhouseId = greenhouseId;
    this.listeners = {};
    this.charts = {};
  }
  
  // Setup real-time listener untuk sensor data
  startMonitoring(callback) {
    // Firestore onSnapshot untuk real-time updates
  }
  
  // Update stat cards
  updateStatCards(sensorData) {
    // Update temperature, humidity, light, soil moisture cards
  }
  
  // Update charts
  updateCharts(sensorData) {
    // Push data ke Chart.js streaming charts
  }
  
  // Stop monitoring
  stopMonitoring() {
    // Cleanup listeners
  }
}
```

---

### **PHASE 3: Real-Time Charts Implementation**

#### 3.1 File: `assets/js/charts/realtime-chart-manager.js`
**Fungsi:**
- Initialize Chart.js dengan streaming plugin
- Setup 4 charts: Temperature, Humidity, Light Level, Soil Moisture
- Konfigurasi real-time streaming (duration: 20 detik, delay: 2 detik)
- Update charts dari Firestore real-time data
- Responsive design untuk mobile

**Chart Configuration:**
```javascript
{
  type: 'line',
  data: {
    datasets: [{
      label: 'Temperature',
      backgroundColor: 'rgba(76, 175, 80, 0.1)',
      borderColor: '#4CAF50',
      data: []
    }]
  },
  options: {
    scales: {
      xAxes: [{
        type: 'realtime',
        realtime: {
          duration: 20000,  // 20 detik window
          delay: 2000       // 2 detik delay
        }
      }]
    }
  }
}
```

---

### **PHASE 4: Google Maps Integration**

#### 4.1 File: `assets/js/maps/greenhouse-map-manager.js`
**Fungsi:**
- Initialize Google Maps
- Tampilkan 3 greenhouse sebagai markers di map
- Info window untuk setiap greenhouse (nama, status, sensor terbaru)
- Auto-center map untuk menampilkan semua greenhouse
- Custom markers dengan icon berbeda per greenhouse

**Data Structure untuk Maps:**
```javascript
// Perlu update greenhouse collection untuk include coordinates
{
  userId: string,
  name: string,
  location: string,
  latitude: number,    // ← BARU
  longitude: number,  // ← BARU
  status: 'active' | 'inactive',
  // ... fields lainnya
}
```

**Map Features:**
- Marker untuk setiap greenhouse
- Click marker → show info window dengan:
  - Nama greenhouse
  - Status (active/inactive)
  - Sensor data terbaru
  - Link ke detail monitoring
- Cluster markers jika greenhouse berdekatan
- Fit bounds untuk menampilkan semua greenhouse

---

### **PHASE 5: Greenhouse Selector Component**

#### 5.1 File: `assets/js/monitoring/greenhouse-selector.js`
**Fungsi:**
- Dropdown/selector untuk switch antar 3 greenhouse
- Load data greenhouse dari Firestore
- Switch monitoring saat greenhouse dipilih
- Update semua charts dan stat cards
- Persist selected greenhouse di localStorage

**UI Component:**
```html
<div class="greenhouse-selector">
  <select id="greenhouse-select">
    <option value="gh1">Greenhouse 1 - Lokasi A</option>
    <option value="gh2">Greenhouse 2 - Lokasi B</option>
    <option value="gh3">Greenhouse 3 - Lokasi C</option>
  </select>
</div>
```

---

### **PHASE 6: Halaman Monitoring Baru**

#### 6.1 File: `pages/features/monitoring.html` (BARU)
**Layout Structure:**
```
┌─────────────────────────────────────────┐
│ Header (TOMITECH)                      │
├─────────────────────────────────────────┤
│ Greenhouse Selector Dropdown           │
├─────────────────────────────────────────┤
│ Stat Cards Row (4 cards)                │
│ [Temp] [Humidity] [Light] [Soil]       │
├─────────────────────────────────────────┤
│ Real-time Charts Row (2x2 grid)        │
│ [Temp Chart] [Humidity Chart]          │
│ [Light Chart] [Soil Chart]             │
├─────────────────────────────────────────┤
│ Google Maps (Full width)                │
│ [Map dengan 3 greenhouse markers]      │
└─────────────────────────────────────────┘
```

**Features:**
- Real-time stat cards (update otomatis dari Firestore)
- 4 real-time charts dengan streaming
- Google Maps dengan 3 greenhouse markers
- Responsive untuk mobile
- Dark/light theme sesuai TOMITECH design system

---

## 🗺️ PLAN IMPLEMENTASI MAPS

### **Step 1: Update Greenhouse Data Structure**
**File:** `assets/js/greenhouse/greenhouse-service.js` (EXTEND, tidak replace)
- Tambah fungsi `updateGreenhouseLocation(greenhouseId, lat, lng)`
- Update `createGreenhouse()` untuk support lat/lng
- Tambah fungsi `getGreenhouseWithLocation(userId)`

### **Step 2: Google Maps Manager**
**File Baru:** `assets/js/maps/greenhouse-map-manager.js`
```javascript
class GreenhouseMapManager {
  constructor(mapElementId) {
    this.map = null;
    this.markers = {};
    this.infoWindows = {};
  }
  
  // Initialize map
  initMap(centerLat, centerLng) {
    // Google Maps initialization
  }
  
  // Add greenhouse marker
  addGreenhouseMarker(greenhouse) {
    // Create marker dengan custom icon
    // Setup info window
    // Click handler untuk show detail
  }
  
  // Update marker position
  updateMarker(greenhouseId, lat, lng) {
    // Update marker position
  }
  
  // Fit bounds untuk semua greenhouse
  fitBounds() {
    // Auto-zoom untuk menampilkan semua markers
  }
  
  // Show info window
  showInfoWindow(greenhouseId) {
    // Display info window dengan data terbaru
  }
}
```

### **Step 3: Map Integration dengan Real-time Data**
- Update info window saat sensor data baru masuk
- Change marker color berdasarkan status (green = normal, red = alert)
- Click marker → switch ke greenhouse tersebut di monitoring

---

## 📦 FILE YANG AKAN DIBUAT (SEMUA BARU)

### **JavaScript Services:**
1. `assets/js/monitoring/realtime-sensor-monitor.js` - Real-time Firestore listener
2. `assets/js/charts/realtime-chart-manager.js` - Chart.js manager
3. `assets/js/maps/greenhouse-map-manager.js` - Google Maps manager
4. `assets/js/monitoring/greenhouse-selector.js` - Greenhouse switcher

### **HTML Pages:**
5. `pages/features/monitoring.html` - Halaman monitoring baru

### **CSS (Optional):**
6. `assets/css/monitoring.css` - Styling khusus monitoring (jika perlu)

### **Assets dari Template:**
7. Copy `chartjs-plugin-streaming.min.js` dari template ke `assets/js/charts/`

---

## 🔄 INTEGRASI DENGAN SISTEM LAMA

### **Tidak Mengubah File Lama:**
- ✅ `dashboard.html` - Tetap seperti semula
- ✅ `greenhouse-service.js` - Hanya EXTEND dengan fungsi baru
- ✅ Semua file existing - Tidak diubah

### **Cara Integrasi:**
1. **Link dari Dashboard** - Tambah button/card baru di dashboard untuk akses monitoring
2. **Navigation** - Tambah menu item di bottom nav (jika perlu)
3. **Shared Services** - Gunakan fungsi existing dari `greenhouse-service.js`
4. **Firestore** - Gunakan collection yang sama, tidak perlu collection baru

---

## 🎨 UI/UX DESIGN PLAN

### **Design System:**
- Gunakan **TOMITECH Design System** yang sudah ada
- Warna: Green theme (#4CAF50, #2d8659, dll)
- Typography: Poppins & Inter (sudah ada)
- Icons: Font Awesome 6 (sudah ada)

### **Layout:**
- **Desktop**: 2-column layout untuk charts, full-width untuk maps
- **Tablet**: 1-column untuk charts, full-width untuk maps
- **Mobile**: Stacked layout, charts full-width

### **Components:**
- Stat Cards: Menggunakan design system yang ada
- Charts: Chart.js dengan TOMITECH color scheme
- Maps: Google Maps dengan custom markers (greenhouse icon)
- Selector: Dropdown dengan TOMITECH styling

---

## 🔌 FIREBASE/FIRESTORE REQUIREMENTS

### **Collection yang Digunakan:**
- ✅ `greenhouses` - Sudah ada, perlu ditambah field `latitude`, `longitude`
- ✅ `sensor_data` - Sudah ada, digunakan untuk real-time monitoring

### **Firestore Rules:**
- ✅ Rules sudah ada dan cukup (read untuk authenticated users)

### **Indexes:**
- ✅ Index untuk `sensor_data` sudah ada (greenhouseId + timestamp)

### **Real-time Listeners:**
- Setup `onSnapshot` untuk query:
  ```javascript
  query(
    collection(db, 'sensor_data'),
    where('greenhouseId', '==', selectedGreenhouseId),
    orderBy('timestamp', 'desc'),
    limit(1)
  )
  ```

---

## 📱 RESPONSIVE DESIGN PLAN

### **Breakpoints:**
- **Desktop** (≥1024px): 2-column charts, side-by-side layout
- **Tablet** (768px-1023px): 1-column charts, stacked layout
- **Mobile** (<768px): Full-width charts, stacked stat cards

### **Mobile Optimizations:**
- Touch-friendly chart interactions
- Swipe untuk switch greenhouse
- Collapsible sections untuk menghemat space
- Bottom sheet untuk greenhouse selector

---

## 🚀 IMPLEMENTATION STEPS (URUTAN KERJA)

### **Step 1: Setup Dependencies**
1. Copy Chart.js streaming plugin dari template
2. Setup Google Maps API key (dari config atau environment)
3. Include libraries di halaman monitoring

### **Step 2: Create Services**
1. Buat `realtime-sensor-monitor.js` - Firestore listener
2. Buat `realtime-chart-manager.js` - Chart initialization
3. Buat `greenhouse-map-manager.js` - Maps initialization
4. Buat `greenhouse-selector.js` - Dropdown component

### **Step 3: Create Monitoring Page**
1. Buat `monitoring.html` dengan layout structure
2. Include semua services
3. Setup initialization flow

### **Step 4: Extend Greenhouse Service**
1. Tambah fungsi untuk update location (lat/lng)
2. Tambah fungsi untuk get greenhouse dengan location
3. Test dengan data dummy

### **Step 5: Integration & Testing**
1. Test real-time updates dari Firestore
2. Test chart updates
3. Test maps dengan multiple markers
4. Test greenhouse switching
5. Test responsive design

### **Step 6: Link dari Dashboard**
1. Tambah card/button di dashboard untuk akses monitoring
2. Test navigation flow

---

## ⚠️ CONSIDERATIONS & LIMITATIONS

### **Firestore Real-time:**
- ✅ Lebih efisien daripada polling (template menggunakan polling)
- ✅ Auto-update saat data baru masuk
- ⚠️ Perlu handle connection status
- ⚠️ Perlu cleanup listener saat tidak digunakan

### **Google Maps:**
- ⚠️ Perlu API key (setup di config)
- ⚠️ Perlu quota management
- ✅ Free tier cukup untuk 3 greenhouse

### **Chart.js Streaming:**
- ✅ Plugin sudah tersedia di template
- ⚠️ Perlu handle banyak charts (4 charts × 3 greenhouse = 12 charts potential)
- ✅ Bisa reuse chart instances saat switch greenhouse

### **Performance:**
- ⚠️ Multiple real-time listeners (1 per greenhouse)
- ✅ Firestore efficient untuk real-time
- ⚠️ Chart updates bisa heavy jika terlalu sering
- ✅ Limit data points di chart (20 detik window)

---

## 📊 DATA FLOW DIAGRAM

```
User opens monitoring.html
    ↓
Load user's 3 greenhouses from Firestore
    ↓
User selects greenhouse (default: first)
    ↓
Setup Firestore onSnapshot listener for selected greenhouse
    ↓
┌─────────────────────────────────────┐
│ Real-time Data Flow:                │
│                                     │
│ Firestore → onSnapshot →            │
│   ├─ Update Stat Cards              │
│   ├─ Update Charts (streaming)      │
│   └─ Update Map Info Window        │
└─────────────────────────────────────┘
    ↓
User switches greenhouse
    ↓
Stop previous listener
    ↓
Start new listener for selected greenhouse
    ↓
Update all UI components
```

---

## 🎯 SUCCESS CRITERIA

### **Functional:**
- ✅ User bisa melihat 3 greenhouse di dropdown
- ✅ User bisa switch antar greenhouse
- ✅ Stat cards update real-time dari Firestore
- ✅ Charts update real-time dengan streaming
- ✅ Maps menampilkan 3 greenhouse dengan markers
- ✅ Click marker → switch ke greenhouse tersebut

### **Performance:**
- ✅ Update latency < 1 detik dari Firestore
- ✅ Smooth chart animations
- ✅ No memory leaks (proper cleanup)
- ✅ Responsive di mobile & desktop

### **UX:**
- ✅ Intuitive greenhouse switching
- ✅ Clear visual feedback untuk updates
- ✅ Easy navigation dari dashboard
- ✅ Consistent dengan TOMITECH design system

---

## 📝 NEXT STEPS SETELAH PLAN DITERIMA

1. **Review & Approval** - User review plan ini
2. **Setup Environment** - Google Maps API key, dll
3. **Create Files** - Mulai implementasi sesuai plan
4. **Testing** - Test dengan data real
5. **Deployment** - Deploy ke production

---

## 🔗 DEPENDENCIES

### **External Libraries:**
- Chart.js (via CDN)
- Chart.js Streaming Plugin (dari template)
- Google Maps API (via CDN)

### **Internal Services:**
- `greenhouse-service.js` (extend)
- `firebase-init.js` (existing)
- TOMITECH Design System CSS (existing)

---

## 📌 NOTES

- **TIDAK ADA FILE YANG DIUBAH** - Semua implementasi menggunakan file baru
- **EXTEND, NOT REPLACE** - Fungsi baru ditambah, fungsi lama tetap ada
- **BACKWARD COMPATIBLE** - Sistem lama tetap berfungsi normal
- **GRADUAL ROLLOUT** - Bisa deploy bertahap, test per komponen

---

**Plan ini siap untuk diimplementasikan! 🚀**

