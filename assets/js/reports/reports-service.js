// reports-service.js - Service untuk load dan generate reports dari Firestore
import { db, auth } from '../../../config/firebase-init.js';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  getDocs,
  Timestamp,
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/**
 * Ambil semua reports untuk user (dari aggregate_data dan ai_summaries)
 */
export async function getAllReports(userId = null) {
  try {
    const user = auth.currentUser;
    const targetUserId = userId || user?.uid;
    
    if (!targetUserId) {
      console.warn('⚠️ No user ID provided');
      return [];
    }

    console.log('📊 Fetching reports for user:', targetUserId);

    // Ambil aggregate data (untuk metrics)
    const aggregateReports = await getAggregateReports(targetUserId);
    
    // Ambil AI summaries (untuk insights)
    const summaryReports = await getSummaryReports(targetUserId);
    
    // Gabungkan dan sort by date
    const allReports = [...aggregateReports, ...summaryReports];
    allReports.sort((a, b) => {
      const timeA = a.timestamp?.toDate?.()?.getTime() || a.createdAt?.toDate?.()?.getTime() || 0;
      const timeB = b.timestamp?.toDate?.()?.getTime() || b.createdAt?.toDate?.()?.getTime() || 0;
      return timeB - timeA; // Terbaru dulu
    });

    console.log(`✅ Loaded ${allReports.length} reports`);
    return allReports;
    
  } catch (err) {
    console.error('❌ Error loading reports:', err);
    return [];
  }
}

/**
 * Ambil nama greenhouse dari ID
 */
async function getGreenhouseName(greenhouseId) {
  if (!greenhouseId) return 'Greenhouse';
  
  try {
    const greenhouseDoc = await getDoc(doc(db, 'greenhouses', greenhouseId));
    if (greenhouseDoc.exists()) {
      return greenhouseDoc.data().name || 'Greenhouse';
    }
  } catch (err) {
    console.warn('⚠️ Error getting greenhouse name:', err);
  }
  
  return 'Greenhouse';
}

/**
 * Ambil aggregate reports
 */
async function getAggregateReports(userId) {
  try {
    let snapshot;
    let useOrderBy = true;
    
    // Coba dengan orderBy dulu
    try {
      const q = query(
        collection(db, 'aggregate_data'),
        where('userId', '==', userId),
        orderBy('timestamp', 'desc'),
        limit(20)
      );
      // Test query dengan getDocs untuk catch error
      snapshot = await getDocs(q);
      // Jika berhasil, gunakan snapshot ini
    } catch (orderByError) {
      // Fallback tanpa orderBy jika index belum ada
      console.warn('⚠️ orderBy failed (index may not exist), using fallback:', orderByError.message);
      useOrderBy = false;
      const q = query(
        collection(db, 'aggregate_data'),
        where('userId', '==', userId)
      );
      snapshot = await getDocs(q);
    }
    const reports = [];

    for (const docSnap of snapshot.docs) {
      const data = docSnap.data();
      const greenhouseName = data.greenhouseName || await getGreenhouseName(data.greenhouseId);
      
      reports.push({
        id: docSnap.id,
        type: 'aggregate',
        category: 'Tanaman',
        greenhouseId: data.greenhouseId,
        greenhouseName: greenhouseName,
        title: greenhouseName,
        subtitle: 'Laporan Data Agregat Greenhouse',
        timestamp: data.timestamp,
        createdAt: data.createdAt || data.timestamp,
        metrics: {
          totalPlants: data.totalPlants || 0,
          activePlants: data.activePlants || 0,
          economicValue: calculateEconomicValue(data),
          ecoScore: calculateEcoScore(data)
        },
        icon: 'industry',
        iconColor: 'green'
      });
    }

    // Sort di client-side jika tidak menggunakan orderBy atau jika perlu
    if (!useOrderBy || reports.length > 0) {
      reports.sort((a, b) => {
        let timeA = 0;
        let timeB = 0;
        
        if (a.timestamp) {
          if (a.timestamp.toDate) {
            timeA = a.timestamp.toDate().getTime();
          } else if (a.timestamp instanceof Date) {
            timeA = a.timestamp.getTime();
          } else if (typeof a.timestamp === 'string') {
            timeA = new Date(a.timestamp).getTime();
          }
        } else if (a.createdAt) {
          if (a.createdAt.toDate) {
            timeA = a.createdAt.toDate().getTime();
          } else if (a.createdAt instanceof Date) {
            timeA = a.createdAt.getTime();
          } else if (typeof a.createdAt === 'string') {
            timeA = new Date(a.createdAt).getTime();
          }
        }
        
        if (b.timestamp) {
          if (b.timestamp.toDate) {
            timeB = b.timestamp.toDate().getTime();
          } else if (b.timestamp instanceof Date) {
            timeB = b.timestamp.getTime();
          } else if (typeof b.timestamp === 'string') {
            timeB = new Date(b.timestamp).getTime();
          }
        } else if (b.createdAt) {
          if (b.createdAt.toDate) {
            timeB = b.createdAt.toDate().getTime();
          } else if (b.createdAt instanceof Date) {
            timeB = b.createdAt.getTime();
          } else if (typeof b.createdAt === 'string') {
            timeB = new Date(b.createdAt).getTime();
          }
        }
        
        return timeB - timeA; // Descending (terbaru dulu)
      });
    }

    console.log(`✅ Loaded ${reports.length} aggregate reports`);
    return reports;
  } catch (err) {
    console.error('❌ Error loading aggregate reports:', err);
    // Jika error, return empty array (jangan crash aplikasi)
    return [];
  }
}

/**
 * Ambil summary reports
 */
async function getSummaryReports(userId) {
  try {
    let snapshot;
    let useOrderBy = true;
    
    // Coba dengan orderBy dulu
    try {
      const q = query(
        collection(db, 'ai_summaries'),
        where('userId', '==', userId),
        orderBy('date', 'desc'),
        limit(20)
      );
      // Test query dengan getDocs untuk catch error
      snapshot = await getDocs(q);
      // Jika berhasil, gunakan snapshot ini
    } catch (orderByError) {
      // Fallback tanpa orderBy jika index belum ada
      console.warn('⚠️ orderBy failed (index may not exist), using fallback:', orderByError.message);
      useOrderBy = false;
      const q = query(
        collection(db, 'ai_summaries'),
        where('userId', '==', userId)
      );
      snapshot = await getDocs(q);
    }
    const reports = [];

    for (const docSnap of snapshot.docs) {
      const data = docSnap.data();
      const greenhouseName = data.greenhouseName || await getGreenhouseName(data.greenhouseId);
      
      reports.push({
        id: docSnap.id,
        type: 'summary',
        category: 'Analisis',
        greenhouseId: data.greenhouseId,
        greenhouseName: greenhouseName,
        title: greenhouseName,
        subtitle: 'Kesimpulan Analisis AI',
        timestamp: data.date,
        createdAt: data.createdAt || data.date,
        metrics: {
          summary: data.summary || '',
          recommendations: data.recommendations || [],
          ecoScore: 85 // Default
        },
        icon: 'chart-line',
        iconColor: 'blue'
      });
    }

    // Sort di client-side jika tidak menggunakan orderBy atau jika perlu
    if (!useOrderBy || reports.length > 0) {
      reports.sort((a, b) => {
        let timeA = 0;
        let timeB = 0;
        
        if (a.timestamp) {
          if (a.timestamp.toDate) {
            timeA = a.timestamp.toDate().getTime();
          } else if (a.timestamp instanceof Date) {
            timeA = a.timestamp.getTime();
          } else if (typeof a.timestamp === 'string') {
            timeA = new Date(a.timestamp).getTime();
          }
        } else if (a.createdAt) {
          if (a.createdAt.toDate) {
            timeA = a.createdAt.toDate().getTime();
          } else if (a.createdAt instanceof Date) {
            timeA = a.createdAt.getTime();
          } else if (typeof a.createdAt === 'string') {
            timeA = new Date(a.createdAt).getTime();
          }
        }
        
        if (b.timestamp) {
          if (b.timestamp.toDate) {
            timeB = b.timestamp.toDate().getTime();
          } else if (b.timestamp instanceof Date) {
            timeB = b.timestamp.getTime();
          } else if (typeof b.timestamp === 'string') {
            timeB = new Date(b.timestamp).getTime();
          }
        } else if (b.createdAt) {
          if (b.createdAt.toDate) {
            timeB = b.createdAt.toDate().getTime();
          } else if (b.createdAt instanceof Date) {
            timeB = b.createdAt.getTime();
          } else if (typeof b.createdAt === 'string') {
            timeB = new Date(b.createdAt).getTime();
          }
        }
        
        return timeB - timeA; // Descending (terbaru dulu)
      });
    }

    console.log(`✅ Loaded ${reports.length} summary reports`);
    return reports;
  } catch (err) {
    console.error('❌ Error loading summary reports:', err);
    // Jika error, return empty array (jangan crash aplikasi)
    return [];
  }
}

/**
 * Hitung nilai ekonomi dari data agregat
 */
function calculateEconomicValue(data) {
  // Estimasi sederhana: Rp 10,000 per tanaman aktif
  const activePlants = data.activePlants || 0;
  const estimatedValue = activePlants * 10000;
  
  if (estimatedValue >= 1000000) {
    return `Rp ${(estimatedValue / 1000000).toFixed(1)}M`;
  } else if (estimatedValue >= 1000) {
    return `Rp ${(estimatedValue / 1000).toFixed(0)}K`;
  }
  return `Rp ${estimatedValue}`;
}

/**
 * Hitung eco score dari data
 */
function calculateEcoScore(data) {
  // Score berdasarkan kondisi tanaman dan data sensor
  let score = 70; // Base score
  
  // Bonus untuk tanaman aktif
  if (data.activePlants > 0) {
    score += Math.min(data.activePlants / 10, 10);
  }
  
  // Bonus untuk kondisi optimal (jika ada data sensor)
  if (data.avgHumidity && data.avgHumidity >= 50 && data.avgHumidity <= 80) {
    score += 5;
  }
  
  if (data.avgLightLevel && data.avgLightLevel >= 500) {
    score += 5;
  }
  
  return Math.min(Math.round(score), 100);
}

/**
 * Format waktu relatif (2 hari lalu, dll)
 */
export function formatRelativeTime(timestamp) {
  if (!timestamp) return 'Tidak diketahui';
  
  let date;
  if (timestamp.toDate) {
    date = timestamp.toDate();
  } else if (timestamp instanceof Date) {
    date = timestamp;
  } else if (typeof timestamp === 'string') {
    date = new Date(timestamp);
  } else {
    return 'Tidak diketahui';
  }

  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Baru saja';
  if (diffMins < 60) return `${diffMins} menit lalu`;
  if (diffHours < 24) return `${diffHours} jam lalu`;
  if (diffDays === 1) return 'Kemarin';
  if (diffDays < 7) return `${diffDays} hari lalu`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} minggu lalu`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} bulan lalu`;
  return `${Math.floor(diffDays / 365)} tahun lalu`;
}

/**
 * Filter reports berdasarkan kategori
 */
export function filterReportsByCategory(reports, category) {
  if (category === 'Semua') return reports;
  
  const categoryMap = {
    'Tanaman': ['aggregate'],
    'Energi': ['energy'],
    'Karbon': ['carbon'],
    'Air': ['water'],
    'Sosial': ['social'],
    'Analisis': ['summary']
  };
  
  const allowedTypes = categoryMap[category] || [];
  return reports.filter(report => allowedTypes.includes(report.type));
}

/**
 * Search reports berdasarkan keyword
 */
export function searchReports(reports, keyword) {
  if (!keyword || keyword.trim() === '') return reports;
  
  const searchTerm = keyword.toLowerCase().trim();
  return reports.filter(report => {
    const title = (report.title || '').toLowerCase();
    const subtitle = (report.subtitle || '').toLowerCase();
    const greenhouseName = (report.greenhouseName || '').toLowerCase();
    
    return title.includes(searchTerm) || 
           subtitle.includes(searchTerm) || 
           greenhouseName.includes(searchTerm);
  });
}

