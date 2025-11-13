# ✅ Status Koneksi Firebase TOMITECH

## Konfigurasi Firebase

**Project ID**: `tomitech-id`  
**Status**: ✅ Sudah diupdate di `config/config.js`

### Konfigurasi yang Sudah Diupdate:
- ✅ `apiKey`: Sudah diupdate
- ✅ `authDomain`: `tomitech-id.firebaseapp.com`
- ✅ `projectId`: `tomitech-id`
- ✅ `storageBucket`: `tomitech-id.firebasestorage.app`
- ✅ `messagingSenderId`: `755011279325`
- ✅ `appId`: `1:755011279325:web:c00587f50e985528047e34`

## Langkah Selanjutnya

### 1. Setup Authentication di Firebase Console
1. Buka [Firebase Console](https://console.firebase.google.com/)
2. Pilih project `tomitech-id`
3. Klik **Authentication** > **Get Started**
4. Enable **Google** sign-in method
5. Masukkan support email
6. Klik **Save**

### 2. Setup Firestore Database
1. Di Firebase Console, klik **Firestore Database**
2. Klik **Create Database**
3. Pilih **Start in test mode** (kita akan deploy rules nanti)
4. Pilih lokasi: `asia-southeast2` (Jakarta)
5. Klik **Enable**

### 3. Deploy Firestore Rules
Setelah Firestore dibuat, deploy rules:

**Option A: Menggunakan Firebase CLI**
```bash
firebase login
firebase use tomitech-id
firebase deploy --only firestore:rules
```

**Option B: Manual di Firebase Console**
1. Di Firebase Console > Firestore Database > Rules
2. Copy isi file `config/firestore.rules`
3. Paste ke editor
4. Klik **Publish**

### 4. Deploy Firestore Indexes
```bash
firebase deploy --only firestore:indexes
```

Atau indexes akan dibuat otomatis saat diperlukan.

### 5. Test Koneksi
1. Buka aplikasi di browser
2. Coba login dengan Google
3. Jika berhasil, Firebase sudah terhubung!

## Checklist Setup

- [x] Konfigurasi Firebase di `config/config.js` sudah diupdate
- [ ] Authentication (Google) sudah enabled di Firebase Console
- [ ] Firestore Database sudah dibuat
- [ ] Firestore Rules sudah di-deploy
- [ ] Test login berhasil
- [ ] Test create greenhouse berhasil
- [ ] Test add plant berhasil

## Troubleshooting

### Error: "Firebase: Error (auth/unauthorized-domain)"
**Solusi**: 
1. Firebase Console > Authentication > Settings
2. Scroll ke "Authorized domains"
3. Tambahkan domain Anda (localhost untuk development)

### Error: "Firestore permission denied"
**Solusi**: 
1. Pastikan Firestore rules sudah di-deploy
2. Cek apakah user sudah login
3. Pastikan rules mengizinkan operasi yang dilakukan

### Error: "Collection not found"
**Solusi**: 
- Collection akan dibuat otomatis saat pertama kali menulis data
- Pastikan rules mengizinkan create

---

**Status**: ✅ Konfigurasi sudah terhubung!  
**Action Required**: Setup Authentication dan Firestore di Firebase Console

