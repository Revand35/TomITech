// cloudinary-service.js - Alternative to Firebase Storage
// Cloudinary configuration
const CLOUDINARY_CONFIG = {
  cloud_name: 'your-cloud-name', // Ganti dengan cloud name Anda
  upload_preset: 'your-upload-preset', // Ganti dengan upload preset Anda
  api_key: 'your-api-key', // Optional, untuk signed uploads
  api_secret: 'your-api-secret' // Optional, untuk signed uploads
};

const FOLDER_PATH = 'greenomics/materi';

/**
 * Upload file ke Cloudinary
 * @param {File} file - File yang akan diupload
 * @param {Object} metadata - Metadata file
 * @returns {Promise<Object>} - Data file yang terupload
 */
export const uploadFileToCloudinary = async (file, metadata = {}) => {
  try {
    // Validasi file
    if (!file) {
      throw new Error('File tidak ditemukan');
    }

    // Validasi ukuran file (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      throw new Error('Ukuran file terlalu besar. Maksimal 10MB');
    }

    // Validasi tipe file
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf', 'application/msword', 
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain', 'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];

    if (!allowedTypes.includes(file.type)) {
      throw new Error('Tipe file tidak didukung');
    }

    // Siapkan form data
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_CONFIG.upload_preset);
    formData.append('folder', FOLDER_PATH);
    
    // Tambahkan metadata
    if (metadata.judul) {
      formData.append('public_id', `${Date.now()}_${metadata.judul.replace(/[^a-zA-Z0-9]/g, '_')}`);
    }
    
    // Transformasi untuk image (resize, optimize)
    if (file.type.startsWith('image/')) {
      formData.append('transformation', 'f_auto,q_auto,w_auto');
    }

    // Upload ke Cloudinary
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CONFIG.cloud_name}/upload`,
      {
        method: 'POST',
        body: formData
      }
    );

    if (!response.ok) {
      throw new Error(`Upload gagal: ${response.statusText}`);
    }

    const result = await response.json();

    // Return data yang konsisten dengan Firebase Storage
    return {
      id: result.public_id,
      fileName: result.original_filename,
      originalName: result.original_filename,
      url: result.secure_url,
      publicUrl: result.secure_url,
      size: result.bytes,
      format: result.format,
      width: result.width,
      height: result.height,
      uploadedAt: new Date(result.created_at).toISOString(),
      ...metadata
    };

  } catch (error) {
    console.error('❌ Error uploading to Cloudinary:', error);
    throw new Error(`Gagal upload file: ${error.message}`);
  }
};

/**
 * Hapus file dari Cloudinary
 * @param {string} publicId - Public ID file di Cloudinary
 * @returns {Promise<boolean>} - True jika berhasil dihapus
 */
export const deleteFileFromCloudinary = async (publicId) => {
  try {
    if (!publicId) {
      throw new Error('Public ID tidak ditemukan');
    }

    // Hapus dari Cloudinary
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CONFIG.cloud_name}/image/destroy`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          public_id: publicId,
          upload_preset: CLOUDINARY_CONFIG.upload_preset
        })
      }
    );

    if (!response.ok) {
      throw new Error(`Delete gagal: ${response.statusText}`);
    }

    const result = await response.json();
    return result.result === 'ok';

  } catch (error) {
    console.error('❌ Error deleting from Cloudinary:', error);
    throw new Error(`Gagal hapus file: ${error.message}`);
  }
};

/**
 * Generate optimized URL untuk image
 * @param {string} publicId - Public ID file
 * @param {Object} options - Transformasi options
 * @returns {string} - Optimized URL
 */
export const getOptimizedImageUrl = (publicId, options = {}) => {
  const {
    width = 'auto',
    height = 'auto',
    quality = 'auto',
    format = 'auto',
    crop = 'scale'
  } = options;

  return `https://res.cloudinary.com/${CLOUDINARY_CONFIG.cloud_name}/image/upload/w_${width},h_${height},q_${quality},f_${format},c_${crop}/${publicId}`;
};

/**
 * Upload multiple files ke Cloudinary
 * @param {FileList} files - Multiple files
 * @param {Object} metadata - Metadata untuk semua files
 * @returns {Promise<Array>} - Array hasil upload
 */
export const uploadMultipleFilesToCloudinary = async (files, metadata = {}) => {
  try {
    const uploadPromises = Array.from(files).map(file => 
      uploadFileToCloudinary(file, metadata)
    );

    const results = await Promise.all(uploadPromises);
    return results;

  } catch (error) {
    console.error('❌ Error uploading multiple files:', error);
    throw new Error(`Gagal upload multiple files: ${error.message}`);
  }
};

/**
 * Get file info dari Cloudinary
 * @param {string} publicId - Public ID file
 * @returns {Promise<Object>} - File info
 */
export const getFileInfoFromCloudinary = async (publicId) => {
  try {
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CONFIG.cloud_name}/image/${publicId}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${btoa(`${CLOUDINARY_CONFIG.api_key}:${CLOUDINARY_CONFIG.api_secret}`)}`
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Get info gagal: ${response.statusText}`);
    }

    return await response.json();

  } catch (error) {
    console.error('❌ Error getting file info:', error);
    throw new Error(`Gagal get file info: ${error.message}`);
  }
};

// Export untuk penggunaan global
window.cloudinaryService = {
  uploadFileToCloudinary,
  deleteFileFromCloudinary,
  getOptimizedImageUrl,
  uploadMultipleFilesToCloudinary,
  getFileInfoFromCloudinary
};

console.log('✅ Cloudinary Service loaded successfully');
