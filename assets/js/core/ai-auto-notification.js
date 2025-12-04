// ai-auto-notification.js
// Sistem notifikasi otomatis AI setelah input data aktivitas lingkungan

import { getChatResponse } from './gemini-service.js';
import { getUserActivities } from './environmental-activity-service.js';

/**
 * Service untuk menangani notifikasi otomatis AI
 * Ketika user menginput data aktivitas, AI akan otomatis menganalisis dan memberikan saran
 */
class AIAutoNotificationService {
    constructor() {
        this.isEnabled = true;
        this.notificationQueue = [];
        this.isProcessing = false;
    }

    /**
     * Trigger notifikasi AI setelah data aktivitas disimpan
     * @param {Object} activityData - Data aktivitas yang baru disimpan
     */
    async triggerAutoNotification(activityData) {
        if (!this.isEnabled) {
            console.log('🔕 Auto notification disabled');
            return;
        }

        console.log('🤖 Triggering auto AI notification for:', activityData);

        try {
            // Generate analisis otomatis berdasarkan data aktivitas
            const analysis = await this.generateAutoAnalysis(activityData);
            
            // Simpan notifikasi untuk ditampilkan di chat
            this.saveAutoNotification(analysis);
            
            // Trigger event untuk UI
            this.dispatchNotificationEvent(analysis);

        } catch (error) {
            console.error('❌ Error in auto notification:', error);
        }
    }

    /**
     * Generate analisis otomatis berdasarkan data aktivitas terbaru
     * @param {Object} activityData - Data aktivitas
     * @returns {Promise<Object>} - Analisis dan saran AI
     */
    async generateAutoAnalysis(activityData) {
        try {
            console.log('🧠 Generating auto analysis for activity:', activityData);

            // Format data aktivitas untuk AI
            const formattedData = this.formatActivityForAI(activityData);
            
            // Ambil konteks tambahan dari aktivitas sebelumnya
            const contextData = await this.getAdditionalContext();
            
            // Buat prompt untuk AI
            const prompt = this.createAnalysisPrompt(formattedData, contextData);
            
            // Dapatkan response dari AI
            const aiResponse = await getChatResponse(prompt);
            
            return {
                activityData: formattedData,
                analysis: aiResponse,
                timestamp: new Date().toISOString(),
                type: 'auto_analysis'
            };

        } catch (error) {
            console.error('❌ Error generating auto analysis:', error);
            return {
                activityData: activityData,
                analysis: 'Maaf, terjadi kesalahan dalam menganalisis data aktivitas Anda. Silakan coba lagi.',
                timestamp: new Date().toISOString(),
                type: 'error'
            };
        }
    }

    /**
     * Format data aktivitas untuk AI dengan bahasa yang mudah dipahami
     * @param {Object} activityData - Data aktivitas mentah
     * @returns {Object} - Data yang sudah diformat
     */
    formatActivityForAI(activityData) {
        // Mapping untuk jenis aktivitas
        const activityTypeMap = {
            'waste': 'Pengelolaan Limbah',
            'energy': 'Penggunaan Energi', 
            'water': 'Penggunaan Air',
            'carbon': 'Emisi Karbon',
            'recycling': 'Daur Ulang'
        };

        // Mapping untuk jenis material
        const materialTypeMap = {
            'plastic': 'Plastik',
            'paper': 'Kertas',
            'metal': 'Logam',
            'organic': 'Organik',
            'electricity': 'Listrik',
            'water': 'Air'
        };

        // Mapping untuk aksi
        const actionMap = {
            'recycled': 'Didaur Ulang',
            'reduced': 'Dikurangi',
            'reused': 'Digunakan Ulang',
            'disposed': 'Dibuang',
            'conserved': 'Dihasilkan/Dihasilkan'
        };

        return {
            jenisAktivitas: activityTypeMap[activityData.activityType] || activityData.activityType,
            material: materialTypeMap[activityData.materialType] || activityData.materialType,
            jumlah: `${activityData.amount} ${activityData.unit}`,
            aksi: actionMap[activityData.action] || activityData.action,
            biaya: activityData.cost ? `Rp ${parseInt(activityData.cost).toLocaleString()}` : 'Tidak ada biaya',
            nilaiEkonomi: activityData.economicValue ? `Rp ${activityData.economicValue.toLocaleString()}` : 'Belum dihitung',
            ecoScore: activityData.ecoScore || 'Belum dihitung',
            catatan: activityData.notes || 'Tidak ada catatan'
        };
    }

    /**
     * Ambil konteks tambahan dari aktivitas sebelumnya
     * @returns {Promise<Object>} - Konteks tambahan
     */
    async getAdditionalContext() {
        try {
            // Ambil 5 aktivitas terbaru untuk konteks
            const recentActivities = await getUserActivities(5);
            
            if (recentActivities.length === 0) {
                return { message: 'Ini adalah aktivitas pertama Anda' };
            }

            // Analisis pola aktivitas
            const activityTypes = recentActivities.map(a => a.activityType);
            const materialTypes = recentActivities.map(a => a.materialType);
            const totalEconomicValue = recentActivities.reduce((sum, a) => sum + (a.economicValue || 0), 0);
            const averageEcoScore = recentActivities.reduce((sum, a) => sum + (a.ecoScore || 0), 0) / recentActivities.length;

            return {
                totalActivities: recentActivities.length,
                recentActivityTypes: [...new Set(activityTypes)],
                recentMaterialTypes: [...new Set(materialTypes)],
                totalEconomicValue: `Rp ${totalEconomicValue.toLocaleString()}`,
                averageEcoScore: Math.round(averageEcoScore),
                message: `Anda sudah melakukan ${recentActivities.length} aktivitas sebelumnya`
            };

        } catch (error) {
            console.error('❌ Error getting additional context:', error);
            return { message: 'Tidak dapat mengambil konteks aktivitas sebelumnya' };
        }
    }

    /**
     * Buat prompt khusus untuk analisis otomatis
     * @param {Object} formattedData - Data aktivitas yang sudah diformat
     * @param {Object} contextData - Konteks tambahan
     * @returns {string} - Prompt untuk AI
     */
    createAnalysisPrompt(formattedData, contextData) {
        return `Anda adalah AI asisten AgriHouse yang ahli dalam analisis aktivitas lingkungan dan green accounting. 

**DATA AKTIVITAS TERBARU USER:**
- Jenis Aktivitas: ${formattedData.jenisAktivitas}
- Material: ${formattedData.material}
- Jumlah: ${formattedData.jumlah}
- Aksi: ${formattedData.aksi}
- Biaya: ${formattedData.biaya}
- Nilai Ekonomi: ${formattedData.nilaiEkonomi}
- Eco-Score: ${formattedData.ecoScore}
- Catatan: ${formattedData.catatan}

**KONTEKS AKTIVITAS SEBELUMNYA:**
${contextData.message}
${contextData.totalActivities ? `- Total aktivitas: ${contextData.totalActivities}` : ''}
${contextData.totalEconomicValue ? `- Total nilai ekonomi: ${contextData.totalEconomicValue}` : ''}
${contextData.averageEcoScore ? `- Rata-rata eco-score: ${contextData.averageEcoScore}/10` : ''}

**TUGAS ANDA:**
Beri analisis dan saran yang relevan berdasarkan data aktivitas di atas. Fokus pada:

1. **Analisis Material**: Apa potensi ekonomi dari ${formattedData.material} ini?
2. **Saran Pengolahan**: Bagaimana cara mengoptimalkan ${formattedData.aksi} untuk ${formattedData.material}?
3. **Nilai Ekonomi**: Apakah nilai ekonomi Rp ${formattedData.nilaiEkonomi.replace('Rp ', '').replace('.', '')} sudah optimal?
4. **Saran Produk**: Produk apa yang bisa dibuat dari ${formattedData.material} ini?
5. **Tips Green Accounting**: Bagaimana cara mencatat aktivitas ini untuk UMKM?

**FORMAT RESPONSE:**
- Gunakan bahasa Indonesia yang mudah dipahami
- Berikan saran praktis dan konkret
- Sertakan contoh produk atau ide bisnis
- Maksimal 300 kata
- Gunakan emoji untuk membuat lebih menarik

**CONTOH RESPONSE:**
"**Analisis Aktivitas Anda**

Material \${formattedData.material} dengan jumlah \${formattedData.jumlah} yang \${formattedData.aksi} memiliki potensi ekonomi yang baik! 

**💡 Saran Pengolahan:**
- [Saran spesifik berdasarkan material]
- [Ide produk yang bisa dibuat]

**💰 Optimasi Nilai Ekonomi:**
- [Tips meningkatkan nilai ekonomi]

**📊 Green Accounting:**
- [Saran pencatatan untuk UMKM]"
`;
    }

    /**
     * Simpan notifikasi otomatis untuk ditampilkan di chat
     * @param {Object} analysis - Hasil analisis AI
     */
    saveAutoNotification(analysis) {
        try {
            // Simpan ke sessionStorage untuk akses cepat
            const notification = {
                id: `auto_${Date.now()}`,
                type: 'ai_auto_analysis',
                title: '🤖 Analisis Otomatis AI',
                message: analysis.analysis,
                activityData: analysis.activityData,
                timestamp: analysis.timestamp,
                isRead: false
            };

            // Ambil notifikasi yang sudah ada
            const existingNotifications = JSON.parse(sessionStorage.getItem('aiNotifications') || '[]');
            
            // Tambahkan notifikasi baru di awal array
            existingNotifications.unshift(notification);
            
            // Simpan maksimal 10 notifikasi
            if (existingNotifications.length > 10) {
                existingNotifications.splice(10);
            }
            
            sessionStorage.setItem('aiNotifications', JSON.stringify(existingNotifications));
            
            console.log('✅ Auto notification saved:', notification);

        } catch (error) {
            console.error('❌ Error saving auto notification:', error);
        }
    }

    /**
     * Dispatch event untuk UI agar bisa menampilkan notifikasi
     * @param {Object} analysis - Hasil analisis
     */
    dispatchNotificationEvent(analysis) {
        try {
            const event = new CustomEvent('aiAutoNotification', {
                detail: {
                    analysis: analysis.analysis,
                    activityData: analysis.activityData,
                    timestamp: analysis.timestamp
                }
            });
            
            document.dispatchEvent(event);
            console.log('📢 AI auto notification event dispatched');

        } catch (error) {
            console.error('❌ Error dispatching notification event:', error);
        }
    }

    /**
     * Ambil notifikasi AI yang tersimpan
     * @returns {Array} - Array notifikasi
     */
    getStoredNotifications() {
        try {
            return JSON.parse(sessionStorage.getItem('aiNotifications') || '[]');
        } catch (error) {
            console.error('❌ Error getting stored notifications:', error);
            return [];
        }
    }

    /**
     * Tandai notifikasi sebagai sudah dibaca
     * @param {string} notificationId - ID notifikasi
     */
    markNotificationAsRead(notificationId) {
        try {
            const notifications = this.getStoredNotifications();
            const notification = notifications.find(n => n.id === notificationId);
            
            if (notification) {
                notification.isRead = true;
                sessionStorage.setItem('aiNotifications', JSON.stringify(notifications));
            }

        } catch (error) {
            console.error('❌ Error marking notification as read:', error);
        }
    }

    /**
     * Hapus notifikasi lama
     * @param {number} daysOld - Berapa hari notifikasi dianggap lama
     */
    cleanupOldNotifications(daysOld = 7) {
        try {
            const notifications = this.getStoredNotifications();
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - daysOld);
            
            const filteredNotifications = notifications.filter(notification => {
                const notificationDate = new Date(notification.timestamp);
                return notificationDate > cutoffDate;
            });
            
            sessionStorage.setItem('aiNotifications', JSON.stringify(filteredNotifications));
            console.log(`🧹 Cleaned up old notifications, kept ${filteredNotifications.length} notifications`);

        } catch (error) {
            console.error('❌ Error cleaning up notifications:', error);
        }
    }

    /**
     * Enable/disable auto notification
     * @param {boolean} enabled - Status enable/disable
     */
    setEnabled(enabled) {
        this.isEnabled = enabled;
        localStorage.setItem('aiAutoNotificationEnabled', enabled.toString());
        console.log(`🔔 Auto notification ${enabled ? 'enabled' : 'disabled'}`);
    }

    /**
     * Load settings dari localStorage
     */
    loadSettings() {
        try {
            const enabled = localStorage.getItem('aiAutoNotificationEnabled');
            this.isEnabled = enabled !== null ? enabled === 'true' : true;
            
            // Cleanup notifikasi lama saat load
            this.cleanupOldNotifications();
            
            console.log('⚙️ AI Auto Notification settings loaded');

        } catch (error) {
            console.error('❌ Error loading settings:', error);
        }
    }

    /**
     * Get status notifikasi untuk debugging
     * @returns {Object} - Status dan statistik
     */
    getStatus() {
        const notifications = this.getStoredNotifications();
        const unreadCount = notifications.filter(n => !n.isRead).length;
        
        return {
            isEnabled: this.isEnabled,
            totalNotifications: notifications.length,
            unreadNotifications: unreadCount,
            lastNotification: notifications[0]?.timestamp || null
        };
    }
}

// Buat instance global
const aiAutoNotificationService = new AIAutoNotificationService();

// Load settings saat module dimuat
aiAutoNotificationService.loadSettings();

// Export service
export default aiAutoNotificationService;

// Export untuk backward compatibility
export { aiAutoNotificationService };
