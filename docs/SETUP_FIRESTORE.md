# Setup Firestore untuk TOMITECH

## 📋 Checklist Setup Firebase/Firestore

### 1. ✅ Firestore Rules
File `config/firestore.rules` sudah dikonfigurasi untuk collection berikut:
- ✅ `sensor_data` - Data sensor untuk LSTM
- ✅ `aggregate_data` - Data agregat untuk Random Forest
- ✅ `plants` - Data tanaman
- ✅ `greenhouses` - Data greenhouse
- ✅ `daily_logs` - Log harian

### 2. ✅ Firestore Indexes
File `firestore.indexes.json` sudah dikonfigurasi dengan index untuk:
- ✅ Query sensor_data by greenhouseId + timestamp
- ✅ Query aggregate_data by greenhouseId + timestamp
- ✅ Query aggregate_data by userId + timestamp

### 3. 🚀 Deploy ke Firebase

#### A. Deploy Firestore Rules
```bash
firebase deploy --only firestore:rules
```

#### B. Deploy Firestore Indexes
```bash
firebase deploy --only firestore:indexes
```

**Atau deploy keduanya sekaligus:**
```bash
firebase deploy --only firestore
```

### 4. ⚠️ Penting: Tunggu Index Selesai Dibuat

Setelah deploy indexes, Firebase perlu waktu untuk membuat index. Anda bisa:
1. Cek status di Firebase Console → Firestore → Indexes
2. Tunggu sampai status menjadi "Enabled" (bisa beberapa menit)
3. Jika ada error, klik link error untuk membuat index via console

### 5. 🔍 Verifikasi di Firebase Console

Pastikan collection berikut ada dan bisa diakses:
- `sensor_data` - untuk data sensor (suhu, kelembaban, cahaya, kelembaban tanah)
- `aggregate_data` - untuk data agregat (rata-rata suhu, total cahaya, dll)
- `plants` - untuk data tanaman
- `greenhouses` - untuk data greenhouse
- `daily_logs` - untuk log harian

### 6. 🧪 Test Data Input

Setelah setup selesai, test dengan:
1. Login ke aplikasi
2. Buka halaman "Input Data"
3. Input data sensor → cek di Firestore Console apakah tersimpan
4. Input data agregat → cek di Firestore Console apakah tersimpan
5. Input data tanaman → cek di Firestore Console apakah tersimpan

### 7. 📊 Monitoring

Jika ada error saat menyimpan data:
1. Buka Browser Console (F12)
2. Cek error message
3. Pastikan user sudah login
4. Pastikan Firestore rules sudah di-deploy
5. Pastikan indexes sudah enabled

---

## 🔧 Troubleshooting

### Error: "Missing or insufficient permissions"
**Solusi:** Pastikan Firestore rules sudah di-deploy dan user sudah login

### Error: "The query requires an index"
**Solusi:** 
1. Deploy indexes: `firebase deploy --only firestore:indexes`
2. Atau klik link error di console untuk membuat index via Firebase Console

### Error: "Collection not found"
**Solusi:** Collection akan dibuat otomatis saat pertama kali data disimpan. Pastikan rules mengizinkan create.

### Data tidak tersimpan
**Cek:**
1. User sudah login?
2. Firestore rules sudah di-deploy?
3. Browser console ada error?
4. Network tab menunjukkan request berhasil?

---

## 📝 Catatan Penting

1. **Firestore Rules** harus di-deploy sebelum aplikasi bisa menyimpan data
2. **Indexes** perlu waktu untuk dibuat (bisa beberapa menit)
3. Collection akan dibuat otomatis saat pertama kali data disimpan
4. Pastikan user sudah login sebelum input data

