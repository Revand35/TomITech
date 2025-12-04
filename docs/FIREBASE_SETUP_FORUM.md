# Setup Firebase untuk Halaman Forum/Reports

Panduan lengkap untuk setup Firebase Firestore yang diperlukan untuk fitur real-time updates, user preferences, dan analytics tracking di halaman Reports.

## 📋 Daftar Checklist

- [ ] Setup Firestore Collections
- [ ] Setup Firestore Indexes
- [ ] Setup Security Rules
- [ ] Test Real-time Listeners
- [ ] Verify Analytics Tracking

---

## 1. Setup Firestore Collections

### Collection: `user_preferences`

**Path:** `user_preferences/{userId}`

**Struktur Data:**
```json
{
  "reports": {
    "category": "Semua",
    "searchTerm": "",
    "sortBy": "date",
    "sortOrder": "desc"
  },
  "updatedAt": "2025-01-XX..."
}
```

**Cara Setup:**
1. Buka Firebase Console → Firestore Database
2. Klik "Start collection" atau gunakan collection yang sudah ada
3. Collection ID: `user_preferences`
4. Document ID: Gunakan `{userId}` (akan dibuat otomatis saat user pertama kali menyimpan preferences)
5. Fields:
   - `reports` (map)
     - `category` (string)
     - `searchTerm` (string)
     - `sortBy` (string)
     - `sortOrder` (string)
   - `updatedAt` (timestamp)

**Note:** Collection ini akan dibuat otomatis saat user pertama kali menggunakan fitur filter/sort. Tidak perlu membuat document manual.

---

### Collection: `report_views`

**Path:** `report_views/{autoId}`

**Struktur Data:**
```json
{
  "userId": "user_uid",
  "reportId": "report_id",
  "reportType": "aggregate" | "summary",
  "viewedAt": "2025-01-XX...",
  "userAgent": "Mozilla/5.0...",
  "platform": "Win32"
}
```

**Cara Setup:**
1. Buka Firebase Console → Firestore Database
2. Klik "Start collection"
3. Collection ID: `report_views`
4. Document ID: Auto-generate (biarkan Firebase generate ID otomatis)
5. Fields:
   - `userId` (string)
   - `reportId` (string)
   - `reportType` (string)
   - `viewedAt` (timestamp)
   - `userAgent` (string)
   - `platform` (string)

**Note:** Collection ini akan dibuat otomatis saat user membuka detail report. Tidak perlu membuat document manual.

---

## 2. Setup Firestore Indexes

Firestore memerlukan composite indexes untuk query dengan `where` dan `orderBy` pada field yang berbeda.

### Index 1: `aggregate_data` dengan `userId` + `timestamp`

**Query yang digunakan:**
```javascript
query(
  collection(db, 'aggregate_data'),
  where('userId', '==', userId),
  orderBy('timestamp', 'desc'),
  limit(20)
)
```

**Cara Setup:**
1. Buka Firebase Console → Firestore Database → Indexes
2. Klik "Create Index"
3. Collection ID: `aggregate_data`
4. Fields to index:
   - `userId` (Ascending)
   - `timestamp` (Descending)
5. Query scope: Collection
6. Klik "Create"

**Atau gunakan link otomatis:**
Saat pertama kali menjalankan query, Firebase akan menampilkan error dengan link untuk membuat index. Klik link tersebut untuk auto-setup.

---

### Index 2: `ai_summaries` dengan `userId` + `date`

**Query yang digunakan:**
```javascript
query(
  collection(db, 'ai_summaries'),
  where('userId', '==', userId),
  orderBy('date', 'desc'),
  limit(20)
)
```

**Cara Setup:**
1. Buka Firebase Console → Firestore Database → Indexes
2. Klik "Create Index"
3. Collection ID: `ai_summaries`
4. Fields to index:
   - `userId` (Ascending)
   - `date` (Descending)
5. Query scope: Collection
6. Klik "Create"

**Atau gunakan link otomatis:**
Saat pertama kali menjalankan query, Firebase akan menampilkan error dengan link untuk membuat index. Klik link tersebut untuk auto-setup.

---

## 3. Setup Security Rules

Tambahkan security rules untuk collections baru di Firestore Rules.

### Buka Firestore Rules

1. Buka Firebase Console → Firestore Database → Rules
2. Edit rules sesuai kebutuhan

### Rules untuk `user_preferences`

```javascript
match /user_preferences/{userId} {
  // User hanya bisa read/write preferences mereka sendiri
  allow read, write: if request.auth != null && request.auth.uid == userId;
}
```

### Rules untuk `report_views`

```javascript
match /report_views/{viewId} {
  // User bisa create view tracking untuk diri mereka sendiri
  allow create: if request.auth != null && 
                   request.resource.data.userId == request.auth.uid;
  
  // Admin bisa read semua views untuk analytics
  allow read: if request.auth != null && 
                 get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
  
  // User tidak bisa update/delete views
  allow update, delete: if false;
}
```

### Rules Lengkap (Tambahkan ke rules yang sudah ada)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // ... existing rules ...
    
    // User Preferences
    match /user_preferences/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Report Views (Analytics)
    match /report_views/{viewId} {
      allow create: if request.auth != null && 
                       request.resource.data.userId == request.auth.uid;
      allow read: if request.auth != null;
      allow update, delete: if false;
    }
    
    // Aggregate Data (existing - pastikan sudah ada)
    match /aggregate_data/{dataId} {
      allow read, write: if request.auth != null && 
                           request.resource.data.userId == request.auth.uid;
    }
    
    // AI Summaries (existing - pastikan sudah ada)
    match /ai_summaries/{summaryId} {
      allow read, write: if request.auth != null && 
                            request.resource.data.userId == request.auth.uid;
    }
  }
}
```

**Cara Update Rules:**
1. Copy rules di atas
2. Paste ke Firebase Console → Firestore Database → Rules
3. Klik "Publish"

---

## 4. Test Setup

### Test 1: Real-time Listener

1. Buka halaman `forum.html` di browser
2. Buka Developer Console (F12)
3. Cek console log:
   - Harus muncul: `✅ Real-time listener setup complete`
   - Harus muncul: `📡 Setting up real-time reports listener for user: {userId}`

4. **Test Update Real-time:**
   - Buka Firebase Console → Firestore Database
   - Tambah/edit document di `aggregate_data` atau `ai_summaries`
   - Cek browser: Harus muncul notifikasi "Memperbarui laporan..."

### Test 2: User Preferences

1. Buka halaman `forum.html`
2. Ubah filter category (misalnya: klik "Tanaman")
3. Ubah search term
4. Ubah sort option
5. Refresh halaman
6. **Verifikasi:** Preferences harus tersimpan dan auto-load saat refresh

**Cek di Firebase Console:**
- Buka `user_preferences` collection
- Harus ada document dengan ID = `{userId}`
- Cek field `reports` harus berisi preferences yang disimpan

### Test 3: Analytics Tracking

1. Buka halaman `forum.html`
2. Klik salah satu report card untuk buka detail
3. **Verifikasi di Firebase Console:**
   - Buka `report_views` collection
   - Harus ada document baru dengan:
     - `userId` = user ID yang sedang login
     - `reportId` = ID report yang diklik
     - `reportType` = "aggregate" atau "summary"
     - `viewedAt` = timestamp saat ini

### Test 4: Offline Support

1. Buka halaman `forum.html` (pastikan data sudah di-load)
2. Buka Developer Tools → Network tab
3. Set ke "Offline" mode
4. Refresh halaman
5. **Verifikasi:** 
   - Harus muncul indikator "Mode offline - Menampilkan data cache"
   - Reports masih bisa dilihat (dari cache)

---

## 5. Troubleshooting

### Error: "The query requires an index"

**Solusi:**
1. Klik link yang muncul di error message
2. Atau buat index manual di Firebase Console → Indexes
3. Tunggu beberapa menit hingga index selesai dibuat

### Error: "Missing or insufficient permissions"

**Solusi:**
1. Cek Firestore Rules sudah benar
2. Pastikan user sudah login
3. Pastikan `userId` di document match dengan `request.auth.uid`

### Real-time listener tidak bekerja

**Solusi:**
1. Cek console untuk error messages
2. Pastikan indexes sudah dibuat
3. Pastikan security rules mengizinkan read access
4. Cek koneksi internet

### Preferences tidak tersimpan

**Solusi:**
1. Cek console untuk error messages
2. Pastikan security rules mengizinkan write access
3. Pastikan user sudah login
4. Cek localStorage sebagai fallback

---

## 6. Monitoring & Analytics

### Monitor Usage di Firebase Console

1. **Firestore Usage:**
   - Buka Firebase Console → Firestore Database → Usage
   - Monitor read/write operations

2. **Report Views Analytics:**
   - Buka `report_views` collection
   - Bisa export data untuk analisis lebih lanjut

3. **User Preferences:**
   - Buka `user_preferences` collection
   - Lihat preferensi user untuk insights UX

---

## 7. Optional: Setup Indexes via firestore.indexes.json

Jika project sudah menggunakan `firestore.indexes.json`, tambahkan:

```json
{
  "indexes": [
    {
      "collectionGroup": "aggregate_data",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "userId",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "timestamp",
          "order": "DESCENDING"
        }
      ]
    },
    {
      "collectionGroup": "ai_summaries",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "userId",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "date",
          "order": "DESCENDING"
        }
      ]
    }
  ],
  "fieldOverrides": []
}
```

**Deploy indexes:**
```bash
firebase deploy --only firestore:indexes
```

---

## ✅ Checklist Final

Setelah setup selesai, pastikan:

- [ ] Collection `user_preferences` bisa diakses
- [ ] Collection `report_views` bisa diakses
- [ ] Indexes untuk `aggregate_data` sudah dibuat
- [ ] Indexes untuk `ai_summaries` sudah dibuat
- [ ] Security rules sudah di-update
- [ ] Real-time listener bekerja (test dengan update data)
- [ ] User preferences tersimpan dan auto-load
- [ ] Analytics tracking bekerja (test dengan klik report)
- [ ] Offline support bekerja (test dengan offline mode)

---

## 📞 Support

Jika ada masalah:
1. Cek console browser untuk error messages
2. Cek Firebase Console → Firestore Database → Usage untuk melihat aktivitas
3. Cek Firestore Rules untuk permission issues
4. Pastikan semua indexes sudah dibuat dan status "Enabled"

---

**Last Updated:** 2025-01-XX
**Version:** 1.0

