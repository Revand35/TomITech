# Deploy Firestore Index

## Masalah
Query pada collection `environmental_activities` memerlukan composite index untuk:
- `userId` (ASCENDING)
- `createdAt` (DESCENDING)

## Solusi

### Opsi 1: Deploy via Firebase CLI (Recommended)

1. Pastikan Firebase CLI sudah terinstall:
```bash
npm install -g firebase-tools
```

2. Login ke Firebase:
```bash
firebase login
```

3. Deploy index:
```bash
firebase deploy --only firestore:indexes
```

### Opsi 2: Via Firebase Console

1. Buka link error yang muncul di console:
```
https://console.firebase.google.com/v1/r/project/tomitech-id/firestore/indexes?create_composite=Clxwcm9qZWN0cy90b21pdGVjaC1pZC9kYXRhYmFzZXMvKGRlZmF1bHQpL2NvbGxlY3Rpb25Hcm91cHMvZW52aXJvbm1lbnRhbF9hY3Rpdml0aWVzL2luZGV4ZXMvXxABGgoKBnVzZXJJZBABGg0KCWNyZWF0ZWRBdBACGgwKCF9fbmFtZV9fEAI
```

2. Atau buka manual:
   - Firebase Console → Firestore Database → Indexes
   - Klik "Create Index"
   - Collection: `environmental_activities`
   - Fields:
     - `userId` (Ascending)
     - `createdAt` (Descending)
   - Klik "Create"

### Opsi 3: Auto-create dari Error Link

Firebase biasanya memberikan link langsung di error message. Klik link tersebut dan index akan dibuat otomatis.

## File Indexes

File `firestore.indexes.json` sudah diupdate dengan index yang diperlukan. Deploy file ini untuk memastikan semua index tersedia.

## Catatan

- Index creation biasanya memakan waktu beberapa menit
- Setelah index dibuat, error akan hilang otomatis
- Aplikasi akan tetap berfungsi, hanya query yang akan lebih lambat sampai index selesai dibuat


