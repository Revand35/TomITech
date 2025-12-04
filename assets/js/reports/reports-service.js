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
  getDoc,
  onSnapshot,
  setDoc,
  addDoc,
  serverTimestamp
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
        category: data.category || 'Tanaman',
        greenhouseId: data.greenhouseId,
        greenhouseName: greenhouseName,
        title: data.title || greenhouseName,
        subtitle: data.isManual ? 'Laporan Manual' : 'Laporan Data Agregat Greenhouse',
        timestamp: data.timestamp,
        createdAt: data.createdAt || data.timestamp,
        metrics: {
          totalPlants: data.totalPlants || 0,
          activePlants: data.activePlants || 0,
          economicValue: data.economicValue ? formatEconomicValue(data.economicValue) : calculateEconomicValue(data),
          ecoScore: data.ecoScore || calculateEcoScore(data)
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
        category: data.category || 'Analisis',
        greenhouseId: data.greenhouseId,
        greenhouseName: greenhouseName,
        title: data.title || greenhouseName,
        subtitle: data.isManual ? 'Laporan Manual' : 'Kesimpulan Analisis AI',
        timestamp: data.date,
        createdAt: data.createdAt || data.date,
        metrics: {
          summary: data.summary || '',
          recommendations: data.recommendations || [],
          ecoScore: data.ecoScore || 85
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
 * Format nilai ekonomi
 */
function formatEconomicValue(value) {
  if (value >= 1000000) {
    return `Rp ${(value / 1000000).toFixed(1)}M`;
  } else if (value >= 1000) {
    return `Rp ${(value / 1000).toFixed(0)}K`;
  }
  return `Rp ${value}`;
}

/**
 * Hitung nilai ekonomi dari data agregat
 */
function calculateEconomicValue(data) {
  // Jika sudah ada economicValue, gunakan itu
  if (data.economicValue) {
    return formatEconomicValue(data.economicValue);
  }
  
  // Estimasi sederhana: Rp 10,000 per tanaman aktif
  const activePlants = data.activePlants || 0;
  const estimatedValue = activePlants * 10000;
  
  return formatEconomicValue(estimatedValue);
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

/**
 * Setup real-time listener untuk reports
 * @param {Function} callback - Function yang dipanggil saat data berubah
 * @returns {Function} Unsubscribe function
 */
export function setupRealtimeReportsListener(userId, callback) {
  if (!userId) {
    console.warn('⚠️ No user ID provided for real-time listener');
    return () => {}; // Return empty unsubscribe function
  }

  console.log('📡 Setting up real-time reports listener for user:', userId);

  let unsubscribeFunctions = [];

  // Listener untuk aggregate_data
  try {
    const aggregateQuery = query(
      collection(db, 'aggregate_data'),
      where('userId', '==', userId),
      orderBy('timestamp', 'desc'),
      limit(20)
    );

    const unsubscribeAggregate = onSnapshot(
      aggregateQuery,
      (snapshot) => {
        console.log('📊 Real-time update: aggregate_data changed', snapshot.size, 'docs');
        // Trigger callback untuk reload reports
        if (callback) callback();
      },
      (error) => {
        console.error('❌ Error in aggregate_data listener:', error);
        // Fallback: try without orderBy
        if (error.code === 'failed-precondition') {
          console.warn('⚠️ Index missing, using fallback query');
          const fallbackQuery = query(
            collection(db, 'aggregate_data'),
            where('userId', '==', userId)
          );
          onSnapshot(fallbackQuery, () => {
            if (callback) callback();
          });
        }
      }
    );
    unsubscribeFunctions.push(unsubscribeAggregate);
  } catch (error) {
    console.warn('⚠️ Could not setup aggregate_data listener:', error);
  }

  // Listener untuk ai_summaries
  try {
    const summaryQuery = query(
      collection(db, 'ai_summaries'),
      where('userId', '==', userId),
      orderBy('date', 'desc'),
      limit(20)
    );

    const unsubscribeSummary = onSnapshot(
      summaryQuery,
      (snapshot) => {
        console.log('📊 Real-time update: ai_summaries changed', snapshot.size, 'docs');
        // Trigger callback untuk reload reports
        if (callback) callback();
      },
      (error) => {
        console.error('❌ Error in ai_summaries listener:', error);
        // Fallback: try without orderBy
        if (error.code === 'failed-precondition') {
          console.warn('⚠️ Index missing, using fallback query');
          const fallbackQuery = query(
            collection(db, 'ai_summaries'),
            where('userId', '==', userId)
          );
          onSnapshot(fallbackQuery, () => {
            if (callback) callback();
          });
        }
      }
    );
    unsubscribeFunctions.push(unsubscribeSummary);
  } catch (error) {
    console.warn('⚠️ Could not setup ai_summaries listener:', error);
  }

  // Return unsubscribe function
  return () => {
    console.log('🔌 Unsubscribing from real-time reports listeners');
    unsubscribeFunctions.forEach(unsub => {
      try {
        unsub();
      } catch (err) {
        console.warn('⚠️ Error unsubscribing:', err);
      }
    });
  };
}

/**
 * Simpan user preferences ke Firestore
 */
export async function saveUserPreferences(preferences) {
  try {
    const user = auth.currentUser;
    if (!user) {
      console.warn('⚠️ No user logged in, saving to localStorage instead');
      localStorage.setItem('reports_preferences', JSON.stringify(preferences));
      return;
    }

    const userPrefsRef = doc(db, 'user_preferences', user.uid);
    await setDoc(userPrefsRef, {
      reports: preferences,
      updatedAt: Timestamp.now()
    }, { merge: true });

    console.log('✅ User preferences saved to Firestore');
  } catch (error) {
    console.error('❌ Error saving user preferences:', error);
    // Fallback to localStorage
    localStorage.setItem('reports_preferences', JSON.stringify(preferences));
  }
}

/**
 * Load user preferences dari Firestore atau localStorage
 */
export async function loadUserPreferences() {
  try {
    const user = auth.currentUser;
    
    // Try Firestore first
    if (user) {
      try {
        const userPrefsRef = doc(db, 'user_preferences', user.uid);
        const userPrefsSnap = await getDoc(userPrefsRef);
        
        if (userPrefsSnap.exists()) {
          const data = userPrefsSnap.data();
          if (data.reports) {
            console.log('✅ Loaded user preferences from Firestore');
            return data.reports;
          }
        }
      } catch (error) {
        console.warn('⚠️ Could not load from Firestore, trying localStorage:', error);
      }
    }

    // Fallback to localStorage
    const localPrefs = localStorage.getItem('reports_preferences');
    if (localPrefs) {
      try {
        const parsed = JSON.parse(localPrefs);
        console.log('✅ Loaded user preferences from localStorage');
        return parsed;
      } catch (error) {
        console.warn('⚠️ Error parsing localStorage preferences:', error);
      }
    }

    // Return default preferences
    return {
      category: 'Semua',
      sortBy: 'date',
      sortOrder: 'desc',
      searchTerm: ''
    };
  } catch (error) {
    console.error('❌ Error loading user preferences:', error);
    return {
      category: 'Semua',
      sortBy: 'date',
      sortOrder: 'desc',
      searchTerm: ''
    };
  }
}

/**
 * Track report view untuk analytics
 */
export async function trackReportView(reportId, reportType) {
  try {
    const user = auth.currentUser;
    if (!user) return;

    const viewData = {
      userId: user.uid,
      reportId: reportId,
      reportType: reportType,
      viewedAt: Timestamp.now(),
      userAgent: navigator.userAgent,
      platform: navigator.platform
    };

    // Save to Firestore (collection: report_views)
    const viewRef = doc(collection(db, 'report_views'));
    await setDoc(viewRef, viewData);

    console.log('✅ Report view tracked');
  } catch (error) {
    console.warn('⚠️ Error tracking report view:', error);
    // Non-blocking error
  }
}

/**
 * Create new report (manual report creation)
 * @param {Object} reportData - Data report yang akan dibuat
 * @returns {Promise<string>} - Report ID jika berhasil
 */
export async function createReport(reportData) {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User harus login untuk membuat report');
    }

    // Validate required fields
    if (!reportData.title || !reportData.category) {
      throw new Error('Judul dan Kategori wajib diisi');
    }

    // Determine report type based on category
    const isSummaryType = reportData.category === 'Analisis' || 
                         (reportData.summary && reportData.summary.trim() !== '');

    // Prepare data based on type
    let firestoreData;

    if (isSummaryType) {
      // Save as AI Summary type
      firestoreData = {
        userId: user.uid,
        greenhouseName: reportData.greenhouseName || 'Greenhouse',
        summary: reportData.summary || '',
        recommendations: reportData.recommendations || [],
        date: Timestamp.now(),
        createdAt: serverTimestamp(),
        // Custom fields
        title: reportData.title,
        category: reportData.category,
        isManual: true // Flag untuk manual report
      };
      
      const docRef = await addDoc(collection(db, 'ai_summaries'), firestoreData);
      console.log('✅ Report created as AI Summary:', docRef.id);
      return docRef.id;
    } else {
      // Save as Aggregate Data type
      firestoreData = {
        userId: user.uid,
        greenhouseName: reportData.greenhouseName || 'Greenhouse',
        totalPlants: reportData.totalPlants || 0,
        activePlants: reportData.activePlants || 0,
        timestamp: Timestamp.now(),
        createdAt: serverTimestamp(),
        // Custom fields
        title: reportData.title,
        category: reportData.category,
        economicValue: reportData.economicValue || 0,
        ecoScore: reportData.ecoScore || 0,
        isManual: true // Flag untuk manual report
      };
      
      const docRef = await addDoc(collection(db, 'aggregate_data'), firestoreData);
      console.log('✅ Report created as Aggregate Data:', docRef.id);
      return docRef.id;
    }
  } catch (error) {
    console.error('❌ Error creating report:', error);
    throw error;
  }
}

/**
 * Cache reports ke localStorage untuk offline support
 */
export function cacheReportsToLocalStorage(reports) {
  try {
    const cacheData = {
      reports: reports,
      cachedAt: new Date().toISOString(),
      version: '1.0'
    };
    localStorage.setItem('reports_cache', JSON.stringify(cacheData));
    console.log('✅ Reports cached to localStorage');
  } catch (error) {
    console.warn('⚠️ Error caching reports:', error);
    // Handle quota exceeded error
    if (error.name === 'QuotaExceededError') {
      console.warn('⚠️ localStorage quota exceeded, clearing old cache');
      try {
        localStorage.removeItem('reports_cache');
        localStorage.setItem('reports_cache', JSON.stringify({
          reports: reports.slice(0, 10), // Cache only first 10
          cachedAt: new Date().toISOString(),
          version: '1.0'
        }));
      } catch (e) {
        console.error('❌ Could not cache reports:', e);
      }
    }
  }
}

/**
 * Load cached reports dari localStorage
 */
export function loadCachedReports() {
  try {
    const cached = localStorage.getItem('reports_cache');
    if (!cached) return null;

    const cacheData = JSON.parse(cached);
    const cachedAt = new Date(cacheData.cachedAt);
    const now = new Date();
    const diffMs = now - cachedAt;
    const diffHours = diffMs / (1000 * 60 * 60);

    // Cache valid untuk 1 jam
    if (diffHours > 1) {
      console.log('⚠️ Cache expired, clearing');
      localStorage.removeItem('reports_cache');
      return null;
    }

    console.log('✅ Loaded cached reports from localStorage');
    return cacheData.reports || null;
  } catch (error) {
    console.warn('⚠️ Error loading cached reports:', error);
    return null;
  }
}

