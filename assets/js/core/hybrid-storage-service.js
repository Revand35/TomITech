// hybrid-storage-service.js - Service yang bisa switch antara Firebase Storage dan Cloudinary
import { db } from '../../../config/firebase-init.js';
import { collection, addDoc, serverTimestamp, query, orderBy, getDocs, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";
import { storage } from '../../../config/firebase-init.js';
import { uploadFileToCloudinary, deleteFileFromCloudinary } from './cloudinary-service.js';

// =============================
// Storage Configuration
// =============================

const STORAGE_CONFIG = {
  // Pilih storage provider: 'firebase' atau 'cloudinary'
  provider: 'firebase', // Default ke Firebase
  
  // Firebase Storage config
  firebase: {
    folder: 'materi'
  },
  
  // Cloudinary config
  cloudinary: {
    folder: 'greenomics/materi'
  }
};

// =============================
// Hybrid Storage Service
// =============================

/**
 * Upload file menggunakan provider yang dipilih
 * @param {File} file - File yang akan diupload
 * @param {Object} metadata - Metadata file
 * @returns {Promise<Object>} - Data file yang terupload
 */
export const uploadFile = async (file, metadata = {}) => {
  try {
    let uploadResult;
    
    if (STORAGE_CONFIG.provider === 'firebase') {
      uploadResult = await uploadToFirebaseStorage(file, metadata);
    } else if (STORAGE_CONFIG.provider === 'cloudinary') {
      uploadResult = await uploadToCloudinary(file, metadata);
    } else {
      throw new Error('Storage provider tidak didukung');
    }

    // Simpan metadata ke Firestore
    const docRef = await addDoc(collection(db, 'materi'), {
      nama_file: uploadResult.fileName,
      original_name: uploadResult.originalName,
      url_file: uploadResult.url,
      judul: metadata.judul || file.name,
      deskripsi: metadata.deskripsi || '',
      tipe_file: file.type,
      ukuran_file: file.size,
      storage_provider: STORAGE_CONFIG.provider,
      storage_id: uploadResult.id,
      uploaded_at: serverTimestamp(),
      created_at: new Date().toISOString()
    });

    return {
      id: docRef.id,
      fileName: uploadResult.fileName,
      publicUrl: uploadResult.url,
      storageProvider: STORAGE_CONFIG.provider,
      ...metadata
    };

  } catch (error) {
    console.error('❌ Error uploading file:', error);
    throw error;
  }
};

/**
 * Upload ke Firebase Storage
 * @param {File} file - File yang akan diupload
 * @param {Object} metadata - Metadata file
 * @returns {Promise<Object>} - Upload result
 */
async function uploadToFirebaseStorage(file, metadata) {
  const fileName = `${Date.now()}_${file.name}`;
  const filePath = `${STORAGE_CONFIG.firebase.folder}/${fileName}`;

  // Upload file ke Firebase Storage
  const storageRef = ref(storage, filePath);
  const uploadResult = await uploadBytes(storageRef, file);

  // Ambil download URL
  const downloadURL = await getDownloadURL(uploadResult.ref);

  return {
    id: fileName,
    fileName: fileName,
    originalName: file.name,
    url: downloadURL
  };
}

/**
 * Upload ke Cloudinary
 * @param {File} file - File yang akan diupload
 * @param {Object} metadata - Metadata file
 * @returns {Promise<Object>} - Upload result
 */
async function uploadToCloudinary(file, metadata) {
  const result = await uploadFileToCloudinary(file, metadata);
  
  return {
    id: result.id,
    fileName: result.fileName,
    originalName: result.originalName,
    url: result.url
  };
}

/**
 * Ambil semua materi dari Firestore
 * @returns {Promise<Array>} - Array materi
 */
export const getAllMateri = async () => {
  try {
    // Load from Firestore
    const q = query(collection(db, 'materi'), orderBy('created_at', 'desc'));
    const snapshot = await getDocs(q);

    const materials = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      materials.push({
        id: doc.id,
        nama_file: data.nama_file,
        original_name: data.original_name,
        url_file: data.url_file,
        judul: data.judul,
        deskripsi: data.deskripsi,
        tipe_file: data.tipe_file,
        ukuran_file: data.ukuran_file,
        storage_provider: data.storage_provider || 'firebase',
        storage_id: data.storage_id,
        uploaded_at: data.uploaded_at || data.created_at
      });
    });

    return materials;
  } catch (error) {
    console.error('❌ Error fetching materials:', error);
    throw error;
  }
};

/**
 * Hapus materi dari storage dan Firestore
 * @param {string} materiId - ID materi di Firestore
 * @param {string} fileName - Nama file
 * @param {string} storageProvider - Provider storage
 * @param {string} storageId - ID file di storage
 * @returns {Promise<boolean>} - True jika berhasil dihapus
 */
export const deleteMateri = async (materiId, fileName, storageProvider = 'firebase', storageId = null) => {
  try {
    // Hapus dari storage provider
    if (storageProvider === 'firebase') {
      const filePath = `${STORAGE_CONFIG.firebase.folder}/${fileName}`;
      const storageRef = ref(storage, filePath);
      await deleteObject(storageRef);
    } else if (storageProvider === 'cloudinary') {
      await deleteFileFromCloudinary(storageId || fileName);
    }

    // Hapus dari Firestore
    await deleteDoc(doc(db, 'materi', materiId));

    return true;
  } catch (error) {
    console.error('❌ Error deleting material:', error);
    throw error;
  }
};

/**
 * Switch storage provider
 * @param {string} provider - 'firebase' atau 'cloudinary'
 */
export const switchStorageProvider = (provider) => {
  if (['firebase', 'cloudinary'].includes(provider)) {
    STORAGE_CONFIG.provider = provider;
    console.log(`✅ Storage provider switched to: ${provider}`);
  } else {
    throw new Error('Provider tidak didukung. Gunakan "firebase" atau "cloudinary"');
  }
};

/**
 * Get current storage provider
 * @returns {string} - Current provider
 */
export const getCurrentStorageProvider = () => {
  return STORAGE_CONFIG.provider;
};

/**
 * Get storage configuration
 * @returns {Object} - Storage config
 */
export const getStorageConfig = () => {
  return { ...STORAGE_CONFIG };
};

// =============================
// Utility Functions
// =============================

/**
 * Format file size
 * @param {number} bytes - File size in bytes
 * @returns {string} - Formatted size
 */
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Get file icon berdasarkan tipe file
 * @param {string} fileType - MIME type file
 * @returns {string} - Icon emoji
 */
export const getFileIcon = (fileType) => {
  if (fileType.startsWith('image/')) return '🖼️';
  if (fileType.includes('pdf')) return '📄';
  if (fileType.includes('word')) return '📝';
  if (fileType.includes('excel') || fileType.includes('spreadsheet')) return '📊';
  if (fileType.includes('powerpoint') || fileType.includes('presentation')) return '📽️';
  if (fileType.includes('text')) return '📄';
  return '📁';
};

/**
 * Validate file type
 * @param {File} file - File yang akan divalidasi
 * @returns {Object} - {isValid: boolean, error: string}
 */
export const validateFile = (file) => {
  const allowedTypes = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf', 'application/msword', 
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain', 'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ];

  const maxSize = 10 * 1024 * 1024; // 10MB

  if (!file) {
    return { isValid: false, error: 'File tidak ditemukan' };
  }

  if (!allowedTypes.includes(file.type)) {
    return { isValid: false, error: 'Tipe file tidak didukung' };
  }

  if (file.size > maxSize) {
    return { isValid: false, error: 'Ukuran file terlalu besar. Maksimal 10MB' };
  }

  return { isValid: true, error: null };
};

// =============================
// Export untuk penggunaan global
// =============================
window.hybridStorageService = {
  uploadFile,
  getAllMateri,
  deleteMateri,
  switchStorageProvider,
  getCurrentStorageProvider,
  getStorageConfig,
  formatFileSize,
  getFileIcon,
  validateFile
};

console.log('✅ Hybrid Storage Service loaded successfully');
