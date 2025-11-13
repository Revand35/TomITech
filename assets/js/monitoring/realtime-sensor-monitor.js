// realtime-sensor-monitor.js
// Real-time Firestore listener untuk sensor data monitoring
// ===========================================================

import { db } from '../../../config/firebase-init.js';
import { 
    collection, 
    query, 
    where, 
    orderBy, 
    limit,
    onSnapshot,
    Timestamp
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

/**
 * Class untuk monitoring sensor data secara real-time dari Firestore
 */
export class RealtimeSensorMonitor {
    constructor(greenhouseId) {
        this.greenhouseId = greenhouseId;
        this.unsubscribe = null;
        this.callbacks = {
            onDataUpdate: null,
            onError: null
        };
        this.isMonitoring = false;
    }

    /**
     * Start monitoring sensor data secara real-time
     * @param {Function} onDataUpdate - Callback saat data baru masuk
     * @param {Function} onError - Callback saat terjadi error
     */
    startMonitoring(onDataUpdate, onError) {
        if (this.isMonitoring) {
            console.warn('⚠️ Already monitoring, stopping previous listener...');
            this.stopMonitoring();
        }

        if (!this.greenhouseId) {
            console.error('❌ Greenhouse ID is required');
            if (onError) onError(new Error('Greenhouse ID is required'));
            return;
        }

        this.callbacks.onDataUpdate = onDataUpdate;
        this.callbacks.onError = onError;

        try {
            // Query untuk mendapatkan sensor data terbaru
            const q = query(
                collection(db, 'sensor_data'),
                where('greenhouseId', '==', this.greenhouseId),
                orderBy('timestamp', 'desc'),
                limit(1)
            );

            // Setup real-time listener
            this.unsubscribe = onSnapshot(
                q,
                (snapshot) => {
                    if (!snapshot.empty) {
                        const doc = snapshot.docs[0];
                        const sensorData = {
                            id: doc.id,
                            ...doc.data(),
                            // Convert Firestore Timestamp to Date jika perlu
                            timestamp: doc.data().timestamp?.toDate ? doc.data().timestamp.toDate() : doc.data().timestamp
                        };
                        
                        console.log('📊 New sensor data:', sensorData);
                        
                        if (this.callbacks.onDataUpdate) {
                            this.callbacks.onDataUpdate(sensorData);
                        }
                    } else {
                        console.log('ℹ️ No sensor data found for greenhouse:', this.greenhouseId);
                    }
                },
                (error) => {
                    console.error('❌ Error in real-time listener:', error);
                    if (this.callbacks.onError) {
                        this.callbacks.onError(error);
                    }
                }
            );

            this.isMonitoring = true;
            console.log('✅ Started real-time monitoring for greenhouse:', this.greenhouseId);
        } catch (error) {
            console.error('❌ Error setting up real-time listener:', error);
            if (this.callbacks.onError) {
                this.callbacks.onError(error);
            }
        }
    }

    /**
     * Stop monitoring dan cleanup listener
     */
    stopMonitoring() {
        if (this.unsubscribe) {
            this.unsubscribe();
            this.unsubscribe = null;
            console.log('🛑 Stopped real-time monitoring for greenhouse:', this.greenhouseId);
        }
        this.isMonitoring = false;
        this.callbacks.onDataUpdate = null;
        this.callbacks.onError = null;
    }

    /**
     * Update greenhouse ID dan restart monitoring
     * @param {string} newGreenhouseId - Greenhouse ID baru
     */
    updateGreenhouseId(newGreenhouseId) {
        if (this.greenhouseId === newGreenhouseId) {
            return; // No change needed
        }

        const wasMonitoring = this.isMonitoring;
        if (wasMonitoring) {
            this.stopMonitoring();
        }

        this.greenhouseId = newGreenhouseId;

        if (wasMonitoring && this.callbacks.onDataUpdate && this.callbacks.onError) {
            this.startMonitoring(this.callbacks.onDataUpdate, this.callbacks.onError);
        }
    }

    /**
     * Get current monitoring status
     */
    getStatus() {
        return {
            isMonitoring: this.isMonitoring,
            greenhouseId: this.greenhouseId
        };
    }
}

