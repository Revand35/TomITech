#ifndef FIREBASE_CONFIG_H
#define FIREBASE_CONFIG_H

// =================================================================
// KONFIGURASI FIREBASE REALTIME DATABASE
// =================================================================

// Firebase Realtime Database URL
// Dapatkan dari: Firebase Console → Realtime Database → Data
#define FIREBASE_DATABASE_URL "https://tomitech-id-default-rtdb.asia-southeast1.firebasedatabase.app/"

// Firebase Service Account Credentials
// Project ID
#define FIREBASE_PROJECT_ID "tomitech-id"

// Client Email
#define FIREBASE_CLIENT_EMAIL "firebase-adminsdk-fbsvc@tomitech-id.iam.gserviceaccount.com"

// Private Key
#define FIREBASE_PRIVATE_KEY "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCRMjyx1B2dnOPd\n6rO1/27CHhY4aHpANILM/YhTnuAivnQTuAZhHKLE8ymEI929bYM2LZ/otpkF+N2p\nXWEpoIaTmn4e3JWuPM5+CVhmB48LYCKxOjZBizx7Lm2BzIyWaEP4eYXSB54XjdOQ\nySsC6ZA5S/M6+pvwP1/FKokx3F+wz45eWEd1CYeGjmWe1zNkP8u63ziqMgHnS7Qu\n8EhuTUljJ1srFgnWuF4nUKijxBGIRWyRazTWnmayGG86ZU0kNdVSJIQBplQYyI+j\nQiV/Hy4AXUaBON+KSzOFD6KDjRmISy7hN7f29aCbpSRuglOJSMU5k22mnpwUIofZ\nCVWevwiDAgMBAAECggEADLDF4ksZk/ZfA9bCnCRckDKxNLJZB3YvfbtywdBJY3AF\nbqXI4cFvFP5ZDhe7OhYxmWr1psR/unUzUCn9VvYukDi46Xlt/ohWo5utS/mnWuvg\ncsbiPOqIP9uU4a5SfJQimlVqYpGc4HUnQ5vgAQV2DOcvaRb3Yze+zXMqztG/biry\noub4mZMSWNzJQyd+kgAHLmL72q188X3bHvTOBnTlJX5xBrLtys8ULCgNMact9igA\nnu9KOuz7uXpJjp9etiiRZVmp6/nCPMHQ1DZPGWYVGK/0/MBCgXiXLw7QkY1bKFVZ\nGWL69CSxZaQ3dlKV9E4nfaYBwkYJlmFGPOZ37zIz6QKBgQDKzCakL26AxF3f9GVK\nKUG0NcExwgrLv1Kpu/7NnRA3MTXkGkqwD1WkHOQo0WQZM64jYd6J0kBkzk8wAHTL\nvT6B9zNu9T9lIKtylis01w6SF7cr+yb3y/xc1oPemufJZ+hrf3DYU988WQedVEUS\n81q5nccerGdp6SghDL5Kn3d1iwKBgQC3SZiQMgFEaNpxvqpg1LFWt93X0RA8Bm1U\nJ4iMX8KjJ2jtAYC04t0SYJR0xO2iStc9uHjErbDnfM5vJQSY8vpd3/pjaf4MwE8Y\n+6Bzxf7zkaYq1NnPUV8ZfDWf83uB+M+RnIZ9EWFzMdnMlVUJ0zPAZp1gjRiMR40p\nAzSzLLLH6QKBgAr1Dt1uJqVUdtID7XkdU4x+HwsmNdkeZEQBgVnws5CX2xaRCRoM\nKg9s9DL0ZVkrPqxwvEpsDsijkQnB7I2ZkwgIqEHFhIBdTIYrcPgw6nugRmhc8JUQ\n83i8qnFbo0xxjdBJGXrGxVgIY23vwK+ucGd5C+ovXIMPcvieLKXxic3TAoGBAJrH\nJHWINLe/T9DD8P8KPaN8a3Nnka0OxF5PcCkSaLv8eMfEABtAhO2S72rYLdBiIPd3\nA00bXAtvwqfq+8HpVfHWRYyUIjxEXcc8HlgF+HFZKph63GANWCCeWm5zX3X3Vdmh\n85REDCYKD+GKraA5YTd1sCqrm/JCLftXQLaZ5XOZAoGAE9LkiiKmNbS8t4R5flUc\nsgMoYtUWh4HtAdCpbyAOogpvch5QCvcam49YPHzxkN0cwEKKOm7WGzcamGmy/Out\nGDcFaZlwNKT917fDyW0mWnHBn6IA7+ZxCQL1cGYcw3Bzgw7qxnp89Ko7xv5YQ1/n\nsKn8nu1+Mle3BggXJ3dwnu0=\n-----END PRIVATE KEY-----\n"

// =================================================================
// CARA MENDAPATKAN CREDENTIALS:
// =================================================================
// 1. Buka Firebase Console: https://console.firebase.google.com
// 2. Pilih project TOMITECH
// 3. Klik ikon gear (⚙️) → Project Settings
// 4. Tab "Service Accounts"
// 5. Klik "Generate New Private Key"
// 6. Download file JSON
// 7. Buka file JSON dengan text editor
// 8. Copy nilai:
//    - "project_id" → FIREBASE_PROJECT_ID
//    - "client_email" → FIREBASE_CLIENT_EMAIL
//    - "private_key" → FIREBASE_PRIVATE_KEY (ganti \n dengan \n di kode)
// =================================================================

#endif

