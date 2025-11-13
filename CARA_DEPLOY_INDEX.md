# 🚀 Cara Deploy Index Firestore ke Firebase

## 📋 Langkah-Langkah Deploy Index

### **Opsi 1: Deploy via Firebase CLI (PALING MUDAH & CEPAT)** ⭐

#### Langkah 1: Install Firebase CLI (jika belum ada)

```bash
# Install via npm
npm install -g firebase-tools
```

#### Langkah 2: Login ke Firebase

```bash
firebase login
```

**PENTING: Login dengan email `hexohm72@gmail.com`**

- Browser akan terbuka otomatis
- **Login dengan akun Google: `hexohm72@gmail.com`** (email yang digunakan untuk Firebase project ini)
- Jika browser tidak terbuka, buka manual: https://accounts.google.com
- Setelah login, tutup browser dan kembali ke terminal
- Pastikan email yang muncul di terminal adalah `hexohm72@gmail.com`

**Alternatif (jika ada masalah):**
```bash
# Login dengan email spesifik
firebase login --no-localhost
```
Kemudian copy kode yang muncul dan login di: https://accounts.google.com/o/oauth2/v2/auth

#### Langkah 3: Pastikan di Folder Project

```bash
# Pastikan Anda berada di folder project TomITech
cd C:\Users\USER\Downloads\TomITech\TomITech
```

#### Langkah 3.5: Set Project ID yang Benar

```bash
# Set project ID ke tomitech-id
firebase use tomitech-id
```

**PENTING:** Pastikan menggunakan project `tomitech-id`, bukan project lain.

**Cek project yang sedang digunakan:**
```bash
firebase use
```

**Output yang diharapkan:**
```
Using project tomitech-id
```

#### Langkah 4: Deploy Index

```bash
firebase deploy --only firestore:indexes
```

**Jika menggunakan PowerShell, gunakan tanda kutip:**
```powershell
firebase deploy --only "firestore:indexes"
```

**Output yang diharapkan:**
```
✔  Deploy complete!

Project Console: https://console.firebase.google.com/project/tomitech-id/overview
```

#### Langkah 5: Tunggu Index Dibuat (2-10 menit)

1. Buka: https://console.firebase.google.com/project/tomitech-id/firestore/indexes
2. Tunggu sampai semua index status menjadi **"Enabled"** (hijau)
3. Refresh halaman aplikasi Anda

---

### **Opsi 2: Deploy Manual via Firebase Console** (Jika CLI tidak bisa)

#### Langkah 1: Buka Firebase Console

1. Buka: https://console.firebase.google.com/project/tomitech-id/firestore/indexes
2. Klik tab **"Indexes"**

#### Langkah 2: Klik "Add Index"

Klik tombol biru **"Add index"** di kanan atas

#### Langkah 3: Buat Index Satu Per Satu

Buat index berikut (klik "Add index" untuk setiap index):

**Index 1: Plants (userId + greenhouseId + createdAt)**
- Collection ID: `plants`
- Query scope: `Collection`
- Fields:
  - Field 1: `userId` → Ascending
  - Field 2: `greenhouseId` → Ascending
  - Field 3: `createdAt` → Descending
  - Field 4: `__name__` → Descending
- Klik **"Create"**

**Index 2: Sensor Data (DESC)**
- Collection ID: `sensor_data`
- Query scope: `Collection`
- Fields:
  - Field 1: `greenhouseId` → Ascending
  - Field 2: `timestamp` → Descending
  - Field 3: `__name__` → Descending
- Klik **"Create"**

**Index 3: Sensor Data (ASC)**
- Collection ID: `sensor_data`
- Query scope: `Collection`
- Fields:
  - Field 1: `greenhouseId` → Ascending
  - Field 2: `timestamp` → Ascending
  - Field 3: `__name__` → Ascending
- Klik **"Create"**

**Index 4: Aggregate Data**
- Collection ID: `aggregate_data`
- Query scope: `Collection`
- Fields:
  - Field 1: `greenhouseId` → Ascending
  - Field 2: `timestamp` → Descending
  - Field 3: `__name__` → Descending
- Klik **"Create"**

#### Langkah 4: Tunggu Index Dibuat

- Setiap index membutuhkan waktu 2-5 menit
- Status akan berubah dari "Building" → "Enabled"
- Tunggu sampai semua index status **"Enabled"** (hijau)

---

### **Opsi 3: Klik Link dari Error Console** (Paling Cepat untuk Index Spesifik)

1. Buka halaman aplikasi yang menampilkan error
2. Buka Developer Console (F12)
3. Copy link dari error message (contoh: `https://console.firebase.google.com/v1/r/project/...`)
4. Buka link tersebut di browser
5. Klik **"Create Index"**
6. Tunggu sampai status menjadi **"Enabled"**

**Ulangi untuk setiap error yang muncul!**

---

## ✅ Verifikasi Index Sudah Dibuat

### Cara Cek:

1. Buka: https://console.firebase.google.com/project/tomitech-id/firestore/indexes
2. Pastikan semua index status: **"Enabled"** ✅ (hijau)
3. Jika masih "Building", tunggu beberapa menit lagi

### Index yang Harus Ada:

1. ✅ `greenhouses` - userId + createdAt + __name__
2. ✅ `plants` - userId + greenhouseId + createdAt + __name__
3. ✅ `sensor_data` - greenhouseId + timestamp (DESC) + __name__
4. ✅ `sensor_data` - greenhouseId + timestamp (ASC) + __name__
5. ✅ `aggregate_data` - greenhouseId + timestamp + __name__
6. ✅ `environmental_activities` - userId + createdAt + __name__

---

## ⏱️ Waktu yang Dibutuhkan

- **Via CLI:** 2-10 menit (semua index sekaligus)
- **Via Console Manual:** 5-15 menit (satu per satu)
- **Via Link Error:** 2-5 menit per index

---

## 🔧 Troubleshooting

### Error: "firebase: command not found"
**Solusi:** Install Firebase CLI dulu:
```bash
npm install -g firebase-tools
```

### Error: "Cannot understand what targets to deploy"
**Solusi:** Pastikan `firebase.json` memiliki konfigurasi Firestore:
```json
{
  "firestore": {
    "rules": "config/firestore.rules",
    "indexes": "firestore.indexes.json"
  }
}
```

**Jika menggunakan PowerShell dan error dengan command:**
```powershell
# Gunakan tanda kutip untuk --only
firebase deploy --only "firestore:indexes"
```

### Error: "Not logged in"
**Solusi:** Login dulu dengan email yang benar:
```bash
firebase login
```
**PENTING:** Pastikan login dengan email `hexohm72@gmail.com` (email Firebase project)

**Cek email yang sedang digunakan:**
```bash
firebase login:list
```

**Logout dan login ulang dengan email yang benar:**
```bash
firebase logout
firebase login
```
Pastikan pilih akun `hexohm72@gmail.com` saat login.

### Error: "Project not found" atau "Permission denied"
**Solusi:** Pastikan project ID benar dan menggunakan akun yang benar:
```bash
# Cek project yang sedang digunakan
firebase use

# Set project ke tomitech-id
firebase use tomitech-id

# Atau set project secara manual
firebase use --add
# Pilih project: tomitech-id
# Alias: default
```

**Pastikan menggunakan akun yang benar:**
```bash
# Cek akun yang sedang digunakan
firebase login:list

# Jika bukan hexohm72@gmail.com, logout dan login ulang
firebase logout
firebase login
# Pilih akun: hexohm72@gmail.com
```

**Jika masih error "Permission denied":**
1. Pastikan akun `hexohm72@gmail.com` memiliki akses ke project `tomitech-id`
2. Buka Firebase Console: https://console.firebase.google.com/project/tomitech-id
3. Pastikan bisa akses project tersebut
4. Jika tidak bisa, minta owner project untuk memberikan akses

### Index masih "Building" setelah 10 menit
**Solusi:**
- Refresh halaman Firebase Console
- Cek apakah ada error di Firebase Console
- Tunggu lebih lama (bisa sampai 15 menit)

### Error masih muncul setelah index dibuat
**Solusi:**
- Hard refresh browser: `Ctrl + Shift + R` (Windows) atau `Cmd + Shift + R` (Mac)
- Clear browser cache
- Pastikan semua index status "Enabled"
- Tunggu 1-2 menit setelah index selesai

---

## 💡 Tips

1. **Gunakan CLI** - Lebih cepat dan mudah
2. **Tunggu sampai "Enabled"** - Jangan refresh aplikasi sebelum semua index selesai
3. **Cek status di Console** - Pastikan semua index sudah "Enabled"
4. **Satu kali deploy** - Index hanya perlu dibuat sekali, akan digunakan selamanya

---

## 📞 Bantuan

Jika masih bermasalah:
1. Screenshot error di console
2. Screenshot status index di Firebase Console
3. Cek apakah ada index yang masih "Building"
4. Pastikan menggunakan project Firebase yang benar


