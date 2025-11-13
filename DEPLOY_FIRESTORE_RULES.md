# Deploy Firestore Rules

## 📋 Overview

File `config/firestore.rules` sudah diperbarui dengan rules lengkap untuk semua collection yang digunakan di aplikasi.

## 🚀 Cara Deploy Rules ke Firebase

### Opsi 1: Via Firebase CLI (Recommended)

1. **Pastikan Firebase CLI sudah terinstall:**
```bash
npm install -g firebase-tools
```

2. **Login ke Firebase:**
```bash
firebase login
```

3. **Deploy rules:**
```bash
firebase deploy --only firestore:rules
```

### Opsi 2: Via Firebase Console

1. Buka [Firebase Console](https://console.firebase.google.com/)
2. Pilih project: **tomitech-id**
3. Buka **Firestore Database** → **Rules**
4. Copy semua isi dari file `config/firestore.rules`
5. Paste ke editor rules di Firebase Console
6. Klik **Publish**

## ✅ Collections yang Sudah Ada di Rules

1. ✅ `users` - Data user
2. ✅ `greenhouses` - Data greenhouse
3. ✅ `plants` - Data tanaman
4. ✅ `daily_logs` - Log harian
5. ✅ `sensor_data` - Data sensor (untuk LSTM)
6. ✅ `aggregate_data` - Data agregat (untuk Random Forest)
7. ✅ `ai_summaries` - Kesimpulan AI
8. ✅ `environmental_activities` - Aktivitas lingkungan
9. ✅ `chat_messages` - Pesan chat dengan AI
10. ✅ `chatHistory` - History chat (alternatif)
11. ✅ `quizResults` - Hasil quiz
12. ✅ `surveyResponses` - Hasil survey
13. ✅ `posts` - Postingan forum
14. ✅ `materi` - Materi pembelajaran
15. ✅ `disease_risk_alerts` - Alert risiko penyakit
16. ✅ `harvest_predictions` - Prediksi hasil panen
17. ✅ `ai_predictions` - Prediksi AI
18. ✅ `ai_recommendations` - Rekomendasi AI

## 🔒 Security Rules Pattern

Semua rules mengikuti pattern yang sama:

```javascript
match /collection_name/{docId} {
  // Read: Semua user yang login bisa baca
  allow read: if isAuthenticated();
  
  // Create: User harus login dan userId harus match
  allow create: if isAuthenticated() && request.resource.data.userId == request.auth.uid;
  
  // Update/Delete: User harus login dan userId harus match dengan data yang ada
  allow update, delete: if isAuthenticated() && resource.data.userId == request.auth.uid;
}
```

**Kecuali:**
- `posts` menggunakan `authorId` bukan `userId`
- `materi` lebih permissive (semua user login bisa create/update/delete)

## ⚠️ Penting

1. **Deploy rules setelah update** - Rules tidak otomatis ter-update, harus di-deploy manual
2. **Test setelah deploy** - Pastikan aplikasi masih berfungsi setelah deploy rules
3. **Backup rules lama** - Simpan rules lama sebelum update (jika perlu)

## 🧪 Testing Rules

Setelah deploy, test dengan:
1. Login sebagai user
2. Coba input data (sensor, aggregate, plant)
3. Cek apakah data tersimpan di Firestore
4. Cek console browser untuk error permission

## 📝 Catatan

- Rules menggunakan `rules_version = '2'` (Firestore Rules v2)
- Default rule: **deny all** - Semua collection yang tidak disebutkan akan ditolak
- Helper functions: `isAuthenticated()` dan `isOwner(userId)` untuk memudahkan penulisan rules

