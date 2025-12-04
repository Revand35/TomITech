# 📊 Fitur-Fitur Halaman Forum/Reports

Dokumentasi lengkap fitur-fitur yang tersedia di halaman `pages/features/forum.html` (Green Reports).

---

## 🎯 Overview

Halaman **Green Reports** adalah dashboard untuk melihat, menganalisis, dan mengelola laporan data greenhouse. Halaman ini menampilkan laporan dari dua sumber utama:
- **Aggregate Data** - Data agregat dari greenhouse (tanaman, nilai ekonomi, eco-score)
- **AI Summaries** - Ringkasan analisis AI dengan rekomendasi

---

## ✨ Fitur Utama

### 1. 📋 **Tampilan Report Cards**

Setiap report ditampilkan dalam bentuk card yang informatif dengan:

- **Header Card:**
  - Icon dengan warna berbeda (hijau untuk tanaman, biru untuk analisis)
  - Judul greenhouse
  - Subtitle jenis laporan
  - Waktu relatif (contoh: "2 jam lalu", "Kemarin")

- **Metrics Display:**
  - **Tanaman Aktif/Total** - Jumlah tanaman di greenhouse
  - **Nilai Ekonomi** - Estimasi nilai ekonomi (format: Rp 1.5M, Rp 500K)
  - **Eco-Score** - Skor kesehatan lingkungan (0-100)

- **Engagement Metrics:**
  - Views (jumlah dilihat)
  - Comments (jumlah komentar)
  - Likes (jumlah suka)

- **Category Tag:**
  - Badge kategori (Tanaman, Analisis, Energi, Karbon, Air)

**Interaksi:**
- Hover effect (card naik sedikit saat di-hover)
- Click untuk melihat detail lengkap

---

### 2. 🔍 **Search & Filter**

#### Search Bar
- **Fitur:**
  - Real-time search dengan debounce 300ms
  - Mencari berdasarkan:
    - Judul greenhouse
    - Subtitle laporan
    - Nama greenhouse
  - Auto-save search term ke user preferences

#### Filter Chips
- **Kategori Filter:**
  - **Semua** - Tampilkan semua laporan
  - **Tanaman** - Laporan aggregate data
  - **Analisis** - Laporan AI summaries
  - **Energi** - Laporan terkait energi
  - **Karbon** - Laporan emisi karbon
  - **Air** - Laporan penggunaan air

- **Fitur:**
  - Active state visual (highlight)
  - Auto-save filter preference
  - Kombinasi dengan search

---

### 3. 🔄 **Sorting Reports**

#### Sort Options
- **Berdasarkan Tanggal:**
  - Ascending (terlama → terbaru)
  - Descending (terbaru → terlama) - Default

- **Berdasarkan Judul:**
  - A-Z atau Z-A

- **Berdasarkan Kategori:**
  - Alphabetical sorting

#### UI:
- Tombol sort di header (ikon sort)
- Dropdown menu dengan visual indicator
- Auto-save sort preference

---

### 4. 📱 **Real-time Updates**

#### Firebase Real-time Listener
- **Fitur:**
  - Auto-detect perubahan data di Firestore
  - Update otomatis tanpa refresh manual
  - Notifikasi saat data diperbarui

#### Notification:
- Banner notifikasi di bagian atas
- Icon spinning untuk indikasi loading
- Auto-hide setelah 3 detik
- Animasi smooth (slideDown)

---

### 5. 💾 **User Preferences (Firebase)**

#### Auto-save Preferences
- **Data yang Disimpan:**
  - Kategori filter aktif
  - Search term terakhir
  - Sort by (tanggal/judul/kategori)
  - Sort order (asc/desc)

#### Auto-load Preferences
- **Saat halaman dibuka:**
  - Load preferences dari Firestore
  - Apply ke UI (filter chips, search input, sort)
  - Fallback ke localStorage jika Firestore tidak tersedia

#### Storage:
- **Primary:** Firestore (`user_preferences` collection)
- **Fallback:** localStorage

---

### 6. 📄 **Report Detail Modal**

#### Fitur Detail:
- **Modal Popup** dengan informasi lengkap:
  - Header dengan icon dan judul
  - Category badge dan waktu
  - Tanggal laporan (format lengkap Indonesia)
  - Metrics cards (3 kolom grid)

- **Ringkasan Analisis** (untuk AI summaries):
  - Text lengkap summary
  - Styled dengan border accent

- **Rekomendasi** (untuk AI summaries):
  - List rekomendasi dengan icon check
  - Styled cards per item

#### Actions:
- **Export PDF:**
  - Generate PDF dengan jsPDF
  - Include semua informasi report
  - Footer dengan nomor halaman
  - Auto-download

- **Share Report:**
  - Web Share API (jika tersedia)
  - Fallback: Copy to clipboard
  - Include title, subtitle, dan link

#### UX:
- Close button (X)
- Close on backdrop click
- Close on ESC key
- Smooth animations

---

### 7. 🔄 **Refresh Reports**

#### Manual Refresh
- **Tombol Refresh:**
  - Icon sync di header
  - Spinning animation saat loading
  - Force reload dari Firestore (bypass cache)

#### Auto Refresh:
- Real-time listener auto-refresh saat data berubah

---

### 8. 📦 **Offline Support & Caching**

#### Caching Strategy:
- **Cache Reports:**
  - Auto-cache ke localStorage
  - Cache valid 1 jam
  - Format: JSON dengan timestamp

#### Offline Mode:
- **Fallback ke Cache:**
  - Jika Firestore gagal, load dari cache
  - Indikator offline banner
  - Tetap bisa melihat data yang sudah di-cache

#### Offline Indicator:
- Banner kuning di bagian bawah
- Icon WiFi dengan strikethrough
- Auto-hide setelah 5 detik

---

### 9. 📊 **Analytics Tracking**

#### Report View Tracking
- **Auto-track saat:**
  - User klik report card
  - Modal detail dibuka

- **Data yang Dicatat:**
  - User ID
  - Report ID
  - Report Type (aggregate/summary)
  - Timestamp
  - User Agent
  - Platform

#### Storage:
- Firestore collection: `report_views`
- Non-blocking (tidak mengganggu UX jika gagal)

---

### 10. 🗑️ **Delete Report**

#### Fitur:
- Delete report dari Firestore
- Konfirmasi sebelum delete
- Auto-reload setelah delete
- Error handling

#### Access:
- Via `deleteReportHandler()` function
- Bisa diintegrasikan dengan UI button

---

### 11. 🎨 **UI/UX Features**

#### Visual Design:
- **Modern Card Design:**
  - Rounded corners
  - Shadow effects
  - Hover animations
  - Color-coded icons

- **Responsive Layout:**
  - Grid layout untuk metrics
  - Mobile-friendly
  - Touch-friendly buttons

- **Loading States:**
  - Spinner dengan text
  - Skeleton loading (jika ada)
  - Error states dengan retry button

#### Animations:
- Fade in untuk cards
- Slide down untuk notifications
- Smooth transitions
- Hover effects

---

### 12. 🔐 **Authentication & Security**

#### Features:
- **Auth Guard:**
  - Redirect ke login jika tidak authenticated
  - Check user state dengan `onAuthStateChanged`

- **Data Isolation:**
  - User hanya melihat reports mereka sendiri
  - Firestore security rules
  - User preferences per user

---

### 13. 📱 **Navigation Integration**

#### Bottom Navigation:
- Integrated dengan TOMITECH bottom nav
- Active state indicator
- Smooth transitions

#### Header Actions:
- Sort button
- Refresh button
- Styled dengan TOMITECH design system

---

## 🔧 Technical Features

### 1. **Firebase Integration**
- Firestore untuk data storage
- Real-time listeners dengan `onSnapshot`
- User preferences di Firestore
- Analytics tracking

### 2. **Performance Optimizations**
- Debounce untuk search (300ms)
- Event delegation untuk click handlers
- Caching untuk offline support
- Lazy loading untuk reports

### 3. **Error Handling**
- Try-catch untuk semua async operations
- Fallback mechanisms (cache, localStorage)
- User-friendly error messages
- Retry buttons

### 4. **Code Organization**
- Modular JavaScript (ES6 modules)
- Separation of concerns:
  - `reports-service.js` - Data fetching
  - `reports-renderer.js` - UI rendering
  - `reports-utils.js` - Utility functions

---

## 📋 Data Sources

### 1. **Aggregate Data** (`aggregate_data` collection)
- Total plants
- Active plants
- Economic value
- Eco-score
- Greenhouse info

### 2. **AI Summaries** (`ai_summaries` collection)
- Summary text
- Recommendations array
- Analysis date
- Greenhouse info

---

## 🎯 User Flow

1. **Page Load:**
   - Check authentication
   - Load user preferences
   - Load reports (Firestore → Cache fallback)
   - Setup real-time listener

2. **User Interaction:**
   - Filter/Search/Sort → Save preferences
   - Click report → Track view → Show detail
   - Export/Share → Generate PDF/Share

3. **Real-time Update:**
   - Firestore change detected
   - Show notification
   - Reload reports
   - Update UI

---

## 📊 Metrics & Analytics

### Tracked Events:
- Report views
- Filter usage
- Search queries
- Sort preferences
- Export actions

### Data Stored:
- `report_views` collection
- `user_preferences` collection
- localStorage cache

---

## 🚀 Future Enhancements (Potential)

1. **Pagination** - Load more reports
2. **Export Options** - CSV, Excel
3. **Report Comparison** - Compare multiple reports
4. **Charts & Graphs** - Visualisasi data
5. **Report Templates** - Custom report formats
6. **Email Reports** - Send via email
7. **Report Scheduling** - Auto-generate reports
8. **Advanced Filters** - Date range, greenhouse filter
9. **Report Sharing** - Share dengan user lain
10. **Report Comments** - Discussion feature

---

## 📝 Summary

Halaman Forum/Reports adalah dashboard lengkap untuk:
- ✅ View reports dengan UI modern
- ✅ Search & filter reports
- ✅ Sort reports
- ✅ Real-time updates
- ✅ User preferences
- ✅ Offline support
- ✅ Analytics tracking
- ✅ Export & share
- ✅ Detail modal
- ✅ Responsive design

**Total Fitur:** 13+ fitur utama dengan berbagai sub-fitur

---

**Last Updated:** 2025-01-XX  
**Version:** 1.0

