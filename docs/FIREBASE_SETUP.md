# 🚀 Panduan Setup Firebase untuk TOMITECH

## 📋 Daftar Isi
1. [Membuat Firebase Project](#1-membuat-firebase-project)
2. [Setup Authentication](#2-setup-authentication)
3. [Setup Firestore Database](#3-setup-firestore-database)
4. [Setup Storage (Opsional)](#4-setup-storage-opsional)
5. [Update Konfigurasi Project](#5-update-konfigurasi-project)
6. [Deploy Firestore Rules](#6-deploy-firestore-rules)
7. [Struktur Database](#7-struktur-database)

---

## 1. Membuat Firebase Project

### Langkah-langkah:
1. Buka [Firebase Console](https://console.firebase.google.com/)
2. Klik **"Add Project"** atau **"Tambah Project"**
3. Isi nama project: `tomitech-greenhouse` (atau sesuai keinginan)
4. **Enable Google Analytics** (opsional, disarankan untuk production)
5. Klik **"Create Project"** dan tunggu hingga selesai

---

## 2. Setup Authentication

### Enable Google Sign-In:
1. Di sidebar Firebase Console, klik **"Authentication"**
2. Klik **"Get Started"**
3. Di tab **"Sign-in method"**, klik **"Google"**
4. Enable Google sign-in provider
5. Masukkan **Support email** (email Anda)
6. **Project support email** akan otomatis terisi
7. Klik **"Save"**

---

## 3. Setup Firestore Database

### Membuat Database:
1. Di sidebar, klik **"Firestore Database"**
2. Klik **"Create Database"**
3. Pilih **"Start in test mode"** (kita akan deploy rules nanti)
4. Pilih **lokasi database**: `asia-southeast2` (Jakarta) - **PENTING untuk performa**
5. Klik **"Enable"** dan tunggu hingga database aktif

### Indexes yang Diperlukan (akan dibuat otomatis saat deploy):
- `greenhouses`: `userId` (Ascending) + `createdAt` (Descending)
- `plants`: `greenhouseId` (Ascending) + `status` (Ascending) + `plantedDate` (Descending)
- `daily_logs`: `greenhouseId` (Ascending) + `date` (Ascending)
- `sensor_data`: `greenhouseId` (Ascending) + `timestamp` (Descending)
- `ai_summaries`: `greenhouseId` (Ascending) + `date` (Ascending)

---

## 4. Setup Storage (Opsional)

Jika ingin menyimpan foto tanaman:
1. Di sidebar, klik **"Storage"**
2. Klik **"Get Started"**
3. Start in **test mode**
4. Pilih lokasi yang sama dengan Firestore
5. Klik **"Done"**

---

## 5. Update Konfigurasi Project

### Mendapatkan Firebase Config:
1. Di Firebase Console, klik **⚙️ (Settings)** > **"Project settings"**
2. Scroll ke bawah ke bagian **"Your apps"**
3. Klik ikon **Web (</>)** atau **"Add app"** > **"Web"**
4. Register app dengan nama: `TOMITECH Web`
5. **Centang** "Also set up Firebase Hosting" (opsional)
6. Klik **"Register app"**
7. **COPY** konfigurasi Firebase yang muncul (akan seperti ini):

```javascript
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "tomitech-greenhouse.firebaseapp.com",
  projectId: "tomitech-greenhouse",
  storageBucket: "tomitech-greenhouse.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef..."
};
```

### Update File Config:
1. Buka file `config/config.js` di project
2. Ganti semua nilai dengan data dari Firebase Console:

```javascript
export const firebaseConfig = {
    apiKey: "PASTE_API_KEY_HERE",
    authDomain: "PASTE_AUTH_DOMAIN_HERE",
    projectId: "PASTE_PROJECT_ID_HERE",
    storageBucket: "PASTE_STORAGE_BUCKET_HERE",
    messagingSenderId: "PASTE_MESSAGING_SENDER_ID_HERE",
    appId: "PASTE_APP_ID_HERE"
};
```

### Gemini API Key:
1. Buka [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Login dengan Google account
3. Klik **"Create API Key"**
4. Copy API key
5. Paste ke `config/config.js` pada bagian `geminiApiKey`

---

## 6. Deploy Firestore Rules

### Install Firebase CLI (jika belum):
```bash
npm install -g firebase-tools
```

### Login ke Firebase:
```bash
firebase login
```

### Initialize Firebase (jika belum):
```bash
firebase init firestore
```
- Pilih project yang sudah dibuat
- Pilih file `firestore.rules` yang sudah ada
- Pilih file `firestore.indexes.json` yang sudah ada

### Deploy Rules:
```bash
firebase deploy --only firestore:rules
```

**Atau** copy-paste rules secara manual:
1. Di Firebase Console, klik **"Firestore Database"**
2. Klik tab **"Rules"**
3. Copy isi file `config/firestore.rules`
4. Paste ke editor rules
5. Klik **"Publish"**

---

## 7. Struktur Database

### Collections di Firestore:

#### 1. `users`
```javascript
{
  userId: "user123",
  email: "user@example.com",
  displayName: "User Name",
  photoURL: "https://...",
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

#### 2. `greenhouses`
```javascript
{
  userId: "user123",
  name: "Greenhouse Utama",
  location: "Jakarta",
  totalPlants: 10,
  activePlants: 8,
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

#### 3. `plants`
```javascript
{
  userId: "user123",
  greenhouseId: "gh123",
  plantType: "sayur", // atau "buah"
  plantName: "Bayam",
  plantedDate: Timestamp,
  status: "active", // active, harvested, removed
  lastWatered: Timestamp,
  totalWaterings: 5,
  notes: "Catatan...",
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

#### 4. `daily_logs`
```javascript
{
  userId: "user123",
  greenhouseId: "gh123",
  date: Timestamp, // tanggal (00:00:00)
  wateredAt7AM: true,
  wateringTime: Timestamp,
  plantsWatered: ["plant1", "plant2"],
  notes: "Catatan hari ini",
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

#### 5. `sensor_data`
```javascript
{
  userId: "user123",
  greenhouseId: "gh123",
  humidity: 65.5, // persentase
  lightLevel: 750, // lux atau level
  temperature: 28.5, // celcius (opsional)
  timestamp: Timestamp,
  createdAt: Timestamp
}
```

#### 6. `ai_summaries`
```javascript
{
  userId: "user123",
  greenhouseId: "gh123",
  date: Timestamp, // tanggal (00:00:00)
  summary: "Ringkasan kondisi greenhouse...",
  insights: ["Insight 1", "Insight 2"],
  recommendations: ["Rekomendasi 1", "Rekomendasi 2"],
  createdAt: Timestamp
}
```

---

## ✅ Checklist Setup

- [ ] Firebase project dibuat
- [ ] Authentication (Google) enabled
- [ ] Firestore Database dibuat
- [ ] Storage dibuat (opsional)
- [ ] Firebase config di-copy
- [ ] File `config/config.js` di-update
- [ ] Gemini API key diisi
- [ ] Firestore rules di-deploy
- [ ] Test login dengan Google
- [ ] Test create greenhouse
- [ ] Test add plant
- [ ] Test daily log
- [ ] Test AI summary

---

## 🐛 Troubleshooting

### Error: "Firebase: Error (auth/unauthorized-domain)"
- **Solusi**: Di Firebase Console > Authentication > Settings > Authorized domains
- Tambahkan domain Anda (localhost untuk development)

### Error: "Firestore permission denied"
- **Solusi**: Pastikan Firestore rules sudah di-deploy dengan benar
- Cek apakah user sudah login

### Error: "Gemini API key invalid"
- **Solusi**: Pastikan API key sudah benar di `config/config.js`
- Cek apakah API key masih aktif di Google AI Studio

### Error: "Collection not found"
- **Solusi**: Collection akan dibuat otomatis saat pertama kali menulis data
- Pastikan rules mengizinkan create

---

## 📞 Support

Jika ada masalah dengan setup, cek:
1. Firebase Console untuk error messages
2. Browser Console untuk error JavaScript
3. Network tab untuk error API calls

---

**Selamat! Firebase sudah siap digunakan untuk TOMITECH! 🎉**

