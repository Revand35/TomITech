# 🔐 Cara Login Firebase dengan Email hexohm72@gmail.com

## 📋 Informasi Project

- **Project ID:** `tomitech-id`
- **Email Firebase:** `hexohm72@gmail.com`
- **Project Name:** TOMITECH

---

## 🚀 Langkah-Langkah Login Firebase

### **Langkah 1: Install Firebase CLI** (jika belum ada)

```bash
npm install -g firebase-tools
```

### **Langkah 2: Login ke Firebase**

```bash
firebase login
```

### **Langkah 3: Pilih Akun yang Benar**

1. Browser akan terbuka otomatis
2. **PENTING: Login dengan email `hexohm72@gmail.com`**
3. Jika ada beberapa akun Google, pilih akun `hexohm72@gmail.com`
4. Setelah login, tutup browser dan kembali ke terminal

### **Langkah 4: Verifikasi Login**

```bash
# Cek email yang sedang digunakan
firebase login:list
```

**Output yang diharapkan:**
```
Logged in as hexohm72@gmail.com (hexohm72@gmail.com)
```

---

## 🔄 Jika Sudah Login dengan Akun Lain

### **Langkah 1: Logout**

```bash
firebase logout
```

### **Langkah 2: Login Ulang dengan Email yang Benar**

```bash
firebase login
```

**PENTING:** Pastikan pilih akun `hexohm72@gmail.com` saat login di browser.

---

## 🛠️ Troubleshooting

### **Error: "Not logged in"**

```bash
# Cek status login
firebase login:list

# Jika tidak ada, login ulang
firebase login
```

### **Login dengan Akun yang Salah**

```bash
# Logout
firebase logout

# Login ulang
firebase login
# Pilih akun: hexohm72@gmail.com
```

### **Browser Tidak Terbuka**

**Gunakan metode alternatif:**

```bash
# Login tanpa localhost (akan memberikan link untuk login)
firebase login --no-localhost
```

1. Copy kode yang muncul
2. Buka link yang diberikan
3. Paste kode tersebut
4. Login dengan email `hexohm72@gmail.com`

### **Tidak Bisa Akses Project**

**Pastikan project ID benar:**

```bash
# Cek project yang sedang digunakan
firebase use

# Set project secara manual
firebase use tomitech-id

# Atau tambahkan project baru
firebase use --add
# Pilih project: tomitech-id
# Alias: default
```

### **Email Tidak Sesuai**

**Cek dan ganti akun:**

```bash
# Cek akun yang sedang digunakan
firebase login:list

# Logout semua akun
firebase logout --all

# Login ulang dengan akun yang benar
firebase login
# Pilih: hexohm72@gmail.com
```

---

## ✅ Verifikasi Setup

### **1. Cek Email Login**

```bash
firebase login:list
```

**Harus menampilkan:**
```
Logged in as hexohm72@gmail.com (hexohm72@gmail.com)
```

### **2. Cek Project**

```bash
firebase use
```

**Harus menampilkan:**
```
Using project tomitech-id
```

### **3. Test Deploy (Opsional)**

```bash
# Test dengan deploy index
firebase deploy --only firestore:indexes --dry-run
```

Jika tidak ada error, berarti setup sudah benar!

---

## 📝 Catatan Penting

1. **Email harus sesuai:** `hexohm72@gmail.com`
2. **Project ID:** `tomitech-id`
3. **Login hanya perlu sekali** - akan tersimpan di komputer Anda
4. **Jika ganti komputer**, perlu login ulang

---

## 🆘 Masih Bermasalah?

Jika masih ada masalah:

1. **Cek email di Firebase Console:**
   - Buka: https://console.firebase.google.com/project/tomitech-id/settings/general
   - Pastikan email yang muncul adalah `hexohm72@gmail.com`

2. **Cek permission:**
   - Pastikan akun `hexohm72@gmail.com` memiliki akses ke project `tomitech-id`
   - Jika tidak, minta owner project untuk memberikan akses

3. **Clear cache Firebase:**
   ```bash
   # Hapus cache Firebase
   firebase logout --all
   firebase login
   ```

4. **Reinstall Firebase CLI:**
   ```bash
   npm uninstall -g firebase-tools
   npm install -g firebase-tools
   firebase login
   ```

---

## 🔗 Link Penting

- **Firebase Console:** https://console.firebase.google.com/project/tomitech-id
- **Firestore Indexes:** https://console.firebase.google.com/project/tomitech-id/firestore/indexes
- **Firebase CLI Docs:** https://firebase.google.com/docs/cli

