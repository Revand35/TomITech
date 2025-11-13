// local-storage-service.js - Service untuk Local Storage
// File ini berisi fungsi Local Storage untuk environmental activities dan histori data input

// =============================
// Local Storage Functions untuk Environmental Activities
// =============================

/**
 * Simpan aktivitas lingkungan ke Local Storage
 * @param {Object} activityData - Data aktivitas
 * @returns {Promise<Object>} - Data aktivitas yang disimpan
 */
export const saveActivityToLocalStorage = async (activityData) => {
  try {
    // Hitung nilai ekonomi dan eco-score
    const economicValue = calculateEconomicValue(activityData);
    const ecoScore = calculateEcoScore(activityData);

    // Buat objek aktivitas untuk disimpan
    const activityToSave = {
      id: Date.now().toString(),
      userId: 'local-user',
      userEmail: 'local@user.com',
      activityType: activityData.activityType,
      materialType: activityData.materialType,
      amount: parseFloat(activityData.amount),
      unit: activityData.unit,
      action: activityData.action,
      cost: parseFloat(activityData.cost) || 0,
      notes: activityData.notes || '',
      economicValue: economicValue,
      ecoScore: ecoScore,
      timestamp: new Date(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Simpan ke Local Storage
    const existingActivities = JSON.parse(localStorage.getItem('environmental_activities') || '[]');
    existingActivities.unshift(activityToSave);
    localStorage.setItem('environmental_activities', JSON.stringify(existingActivities));

    console.log('✅ Aktivitas berhasil disimpan ke Local Storage:', activityToSave.id);

    return activityToSave;

  } catch (error) {
    console.error('❌ Error saving activity to Local Storage:', error);
    throw new Error(`Gagal menyimpan aktivitas: ${error.message}`);
  }
};

/**
 * Ambil aktivitas lingkungan dari Local Storage
 * @param {number} limitCount - Jumlah maksimal data
 * @returns {Promise<Array>} - Array aktivitas
 */
export const getActivitiesFromLocalStorage = async (limitCount = 50) => {
  try {
    const activities = JSON.parse(localStorage.getItem('environmental_activities') || '[]');
    
    return activities.slice(0, limitCount).map(item => ({
      id: item.id,
      userId: item.userId,
      userEmail: item.userEmail,
      activityType: item.activityType,
      materialType: item.materialType,
      amount: item.amount,
      unit: item.unit,
      action: item.action,
      cost: item.cost,
      notes: item.notes,
      economicValue: item.economicValue,
      ecoScore: item.ecoScore,
      timestamp: new Date(item.timestamp),
      createdAt: item.createdAt,
      updatedAt: item.updatedAt
    }));

  } catch (error) {
    console.error('❌ Error fetching activities from Local Storage:', error);
    throw new Error(`Gagal mengambil data aktivitas: ${error.message}`);
  }
};

/**
 * Ambil statistik aktivitas dari Local Storage
 * @returns {Promise<Object>} - Statistik aktivitas
 */
export const getActivityStatsFromLocalStorage = async () => {
  try {
    const activities = JSON.parse(localStorage.getItem('environmental_activities') || '[]');
    
    const stats = {
      totalActivities: activities.length,
      totalWasteAmount: 0,
      totalEconomicValue: 0,
      totalEcoScore: 0,
      averageEcoScore: 0,
      activitiesByType: {},
      activitiesByMaterial: {},
      activitiesByAction: {}
    };

    // Hitung statistik
    activities.forEach(activity => {
      // Total waste amount
      if (activity.unit === 'kg' || activity.unit === 'liter') {
        stats.totalWasteAmount += activity.amount;
      }
      
      // Total economic value
      stats.totalEconomicValue += activity.economicValue;
      
      // Total eco score
      stats.totalEcoScore += activity.ecoScore;
      
      // Count by type
      stats.activitiesByType[activity.activityType] = (stats.activitiesByType[activity.activityType] || 0) + 1;
      
      // Count by material
      stats.activitiesByMaterial[activity.materialType] = (stats.activitiesByMaterial[activity.materialType] || 0) + 1;
      
      // Count by action
      stats.activitiesByAction[activity.action] = (stats.activitiesByAction[activity.action] || 0) + 1;
    });

    // Hitung rata-rata eco score
    stats.averageEcoScore = activities.length > 0 ? Math.round(stats.totalEcoScore / activities.length) : 0;

    console.log('📊 Stats calculated from Local Storage:', stats);
    return stats;

  } catch (error) {
    console.error('❌ Error calculating stats from Local Storage:', error);
    throw new Error(`Gagal menghitung statistik: ${error.message}`);
  }
};

// =============================
// Histori Data Input Functions
// =============================

/**
 * Simpan data input ke histori untuk digunakan ulang
 * @param {Object} inputData - Data input yang akan disimpan
 * @returns {Promise<Object>} - Data histori yang disimpan
 */
export const saveInputToHistory = async (inputData) => {
  try {
    const historyItem = {
      id: Date.now().toString(),
      timestamp: new Date(),
      createdAt: new Date().toISOString(),
      type: 'input_data',
      data: inputData,
      summary: generateInputSummary(inputData)
    };

    // Simpan ke Local Storage
    const existingHistory = JSON.parse(localStorage.getItem('input_history') || '[]');
    existingHistory.unshift(historyItem);
    
    // Batasi maksimal 100 item histori
    if (existingHistory.length > 100) {
      existingHistory.splice(100);
    }
    
    localStorage.setItem('input_history', JSON.stringify(existingHistory));

    console.log('✅ Input data saved to history:', historyItem.id);
    return historyItem;

  } catch (error) {
    console.error('❌ Error saving input to history:', error);
    throw new Error(`Gagal menyimpan histori: ${error.message}`);
  }
};

/**
 * Ambil histori data input
 * @param {number} limitCount - Jumlah maksimal data
 * @returns {Promise<Array>} - Array histori data input
 */
export const getInputHistory = async (limitCount = 50) => {
  try {
    const history = JSON.parse(localStorage.getItem('input_history') || '[]');
    
    return history.slice(0, limitCount).map(item => ({
      id: item.id,
      timestamp: new Date(item.timestamp),
      createdAt: item.createdAt,
      type: item.type,
      data: item.data,
      summary: item.summary
    }));

  } catch (error) {
    console.error('❌ Error fetching input history:', error);
    throw new Error(`Gagal mengambil histori: ${error.message}`);
  }
};

/**
 * Hapus item dari histori
 * @param {string} historyId - ID item histori yang akan dihapus
 * @returns {Promise<boolean>} - Status penghapusan
 */
export const deleteInputHistoryItem = async (historyId) => {
  try {
    const history = JSON.parse(localStorage.getItem('input_history') || '[]');
    const filteredHistory = history.filter(item => item.id !== historyId);
    localStorage.setItem('input_history', JSON.stringify(filteredHistory));

    console.log('✅ Input history item deleted:', historyId);
    return true;

  } catch (error) {
    console.error('❌ Error deleting input history item:', error);
    throw new Error(`Gagal menghapus histori: ${error.message}`);
  }
};

// =============================
// Helper Functions
// =============================

/**
 * Hitung nilai ekonomi berdasarkan material dan aksi
 * @param {Object} activityData - Data aktivitas
 * @returns {number} - Nilai ekonomi
 */
function calculateEconomicValue(activityData) {
  const { materialType, amount, action } = activityData;
  
  // Harga per unit berdasarkan material
  const materialPrices = {
    'plastic': 5000,    // Rp 5,000 per kg
    'paper': 3000,      // Rp 3,000 per kg
    'metal': 15000,     // Rp 15,000 per kg
    'organic': 2000,    // Rp 2,000 per kg
    'electricity': 1500, // Rp 1,500 per kWh
    'water': 5000       // Rp 5,000 per m³
  };
  
  // Multiplier berdasarkan aksi
  const actionMultipliers = {
    'recycled': 1.2,    // 20% lebih tinggi untuk daur ulang
    'reduced': 0.8,     // 20% lebih rendah untuk pengurangan
    'reused': 1.5,      // 50% lebih tinggi untuk penggunaan ulang
    'disposed': 0.1,    // 90% lebih rendah untuk pembuangan
    'conserved': 1.0    // Normal untuk konservasi
  };
  
  const basePrice = materialPrices[materialType] || 1000;
  const multiplier = actionMultipliers[action] || 1.0;
  
  return Math.round(amount * basePrice * multiplier);
}

/**
 * Hitung eco score berdasarkan material dan aksi
 * @param {Object} activityData - Data aktivitas
 * @returns {number} - Eco score
 */
function calculateEcoScore(activityData) {
  const { materialType, action, amount } = activityData;
  
  // Base score berdasarkan material
  const materialScores = {
    'plastic': 10,      // Plastik = 10 poin
    'paper': 8,         // Kertas = 8 poin
    'metal': 12,        // Logam = 12 poin
    'organic': 6,       // Organik = 6 poin
    'electricity': 15,  // Listrik = 15 poin
    'water': 20         // Air = 20 poin
  };
  
  // Multiplier berdasarkan aksi
  const actionMultipliers = {
    'recycled': 1.5,    // Daur ulang = 1.5x
    'reduced': 2.0,     // Pengurangan = 2.0x
    'reused': 1.8,      // Penggunaan ulang = 1.8x
    'disposed': 0.2,    // Pembuangan = 0.2x
    'conserved': 1.0    // Konservasi = 1.0x
  };
  
  const baseScore = materialScores[materialType] || 5;
  const multiplier = actionMultipliers[action] || 1.0;
  const amountMultiplier = Math.min(amount / 10, 3); // Max 3x untuk amount besar
  
  return Math.round(baseScore * multiplier * amountMultiplier);
}

/**
 * Generate ringkasan data input untuk display
 * @param {Object} inputData - Data input
 * @returns {string} - Ringkasan data
 */
function generateInputSummary(inputData) {
  const { activityType, materialType, amount, unit, action } = inputData;
  
  const activityNames = {
    'waste': 'Limbah',
    'energy': 'Energi',
    'water': 'Air',
    'carbon': 'Karbon',
    'recycling': 'Daur Ulang'
  };
  
  const materialNames = {
    'plastic': 'Plastik',
    'paper': 'Kertas',
    'metal': 'Logam',
    'organic': 'Organik',
    'electricity': 'Listrik',
    'water': 'Air'
  };
  
  const actionNames = {
    'recycled': 'Daur Ulang',
    'reduced': 'Dikurangi',
    'reused': 'Digunakan Ulang',
    'disposed': 'Dibuang',
    'conserved': 'Dihasilkan'
  };
  
  const activityName = activityNames[activityType] || activityType;
  const materialName = materialNames[materialType] || materialType;
  const actionName = actionNames[action] || action;
  
  return `${activityName} - ${materialName} ${amount} ${unit} (${actionName})`;
}

console.log('✅ Local Storage service loaded');
