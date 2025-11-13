# Setup Email/Password Authentication di Firebase

## 📋 Checklist Setup

### 1. ✅ Kode Sudah Diupdate
- ✅ `assets/js/auth.js` - Menambahkan fungsi `signUpWithEmail()`, `signInWithEmail()`, dan `resetPassword()`
- ✅ `login.html` - Menambahkan form email/password dengan toggle antara Email dan Google login

### 2. 🔧 Aktifkan Email/Password di Firebase Console

**Langkah-langkah:**

1. **Buka Firebase Console**
   - Kunjungi: https://console.firebase.google.com/
   - Pilih project: **tomitech-id** (atau project Anda)

2. **Buka Authentication**
   - Di sidebar kiri, klik **Authentication**
   - Klik tab **Sign-in method**

3. **Aktifkan Email/Password**
   - Cari **Email/Password** di daftar providers
   - Klik **Email/Password**
   - Toggle **Enable** menjadi **ON**
   - Klik **Save**

4. **Konfigurasi Email Templates (Opsional)**
   - Di tab **Templates**, Anda bisa custom email untuk:
     - Email verification
     - Password reset
     - Email change

### 3. ✅ Test Login

Setelah setup selesai, test dengan:

1. **Daftar Akun Baru:**
   - Buka halaman login
   - Pilih tab "Email"
   - Klik "Daftar sekarang"
   - Isi nama, email, dan password
   - Klik "Daftar"

2. **Login dengan Email:**
   - Masukkan email dan password
   - Klik "Masuk"

3. **Reset Password:**
   - Klik "Lupa password?"
   - Masukkan email
   - Cek inbox untuk link reset password

---

## 🎯 Fitur yang Tersedia

### ✅ Login dengan Email/Password
- Form login dengan validasi
- Toggle show/hide password
- Error handling yang user-friendly

### ✅ Daftar Akun Baru
- Form registrasi dengan field nama
- Validasi email dan password
- Auto-create user document di Firestore

### ✅ Reset Password
- Link "Lupa password?"
- Kirim email reset password via Firebase
- User bisa reset password dari email

### ✅ Toggle Login Method
- Switch antara Email dan Google login
- UI yang clean dan modern

---

## ⚠️ Troubleshooting

### Error: "Email/Password sign-in is not enabled"
**Solusi:** Aktifkan Email/Password di Firebase Console → Authentication → Sign-in method

### Error: "Email already in use"
**Solusi:** Email sudah terdaftar. Gunakan email lain atau login dengan email tersebut.

### Error: "Password is too weak"
**Solusi:** Password minimal 6 karakter. Gunakan password yang lebih kuat.

### Email reset password tidak terkirim
**Solusi:**
1. Cek spam folder
2. Pastikan email sudah terdaftar
3. Cek Firebase Console → Authentication → Users untuk melihat status email

### User tidak terbuat di Firestore
**Solusi:** 
- Pastikan Firestore rules sudah di-deploy
- Cek browser console untuk error
- Pastikan user sudah login dengan sukses

---

## 📝 Catatan Penting

1. **Email/Password harus diaktifkan di Firebase Console** sebelum bisa digunakan
2. **Password minimal 6 karakter** (sesuai Firebase requirement)
3. **User document** akan dibuat otomatis di Firestore saat pertama kali login/daftar
4. **Email verification** bisa diaktifkan di Firebase Console jika diperlukan

---

## 🔐 Keamanan

- Password disimpan dengan hashing oleh Firebase (tidak bisa dilihat di Firestore)
- Email harus valid format
- Rate limiting otomatis oleh Firebase untuk mencegah brute force
- Firestore rules memastikan user hanya bisa akses data sendiri

