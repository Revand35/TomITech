# Panduan Setup Firebase untuk TOMITECH

## Langkah-langkah Setup Firebase Project

### 1. Buat Firebase Project Baru
1. Buka [Firebase Console](https://console.firebase.google.com/)
2. Klik "Add Project" atau "Tambah Project"
3. Nama project: `tomitech-greenhouse` (atau sesuai keinginan)
4. Enable Google Analytics (opsional)
5. Klik "Create Project"

### 2. Daftarkan Web App
1. Di Firebase Console, klik ikon Web (</>) atau "Add App" > Web
2. Register app dengan nama: `TOMITECH Web`
3. Centang "Also set up Firebase Hosting" (opsional)
4. Klik "Register app"
5. **COPY** konfigurasi Firebase yang muncul (akan digunakan di config.js)

### 3. Enable Authentication
1. Di sidebar, klik "Authentication"
2. Klik "Get Started"
3. Enable "Google" sign-in method
4. Masukkan email support (untuk OAuth consent screen)
5. Save

### 4. Setup Firestore Database
1. Di sidebar, klik "Firestore Database"
2. Klik "Create Database"
3. Pilih "Start in test mode" (kita akan update rules nanti)
4. Pilih lokasi: `asia-southeast2` (Jakarta) atau sesuai kebutuhan
5. Klik "Enable"

### 5. Setup Storage (Optional)
1. Di sidebar, klik "Storage"
2. Klik "Get Started"
3. Start in test mode
4. Pilih lokasi yang sama dengan Firestore
5. Click "Done"

### 6. Update Config File
Setelah mendapatkan konfigurasi Firebase, update file `config/config.js` dengan data dari Firebase Console.

### 7. Deploy Firestore Rules
Setelah setup selesai, deploy Firestore rules menggunakan:
```bash
firebase deploy --only firestore:rules
```

## Struktur Firestore Database

### Collections yang akan dibuat:
- `users` - Data pengguna
- `greenhouses` - Data greenhouse
- `plants` - Data tanaman yang ditanam
- `daily_logs` - Log harian (penyiraman, kondisi)
- `sensor_data` - Data dari sensor (kelembaban, cahaya)
- `ai_summaries` - Kesimpulan harian dari AI Assistant

