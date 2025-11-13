// realtime-chart-manager.js
// Manager untuk Chart.js dengan streaming plugin untuk real-time charts
// ===========================================================

/**
 * Class untuk mengelola real-time charts menggunakan Chart.js dengan streaming plugin
 */
export class RealtimeChartManager {
    constructor() {
        this.charts = {};
        this.isInitialized = false;
    }

    /**
     * Initialize semua charts untuk monitoring
     * @param {Object} canvasElements - Object dengan canvas element IDs
     */
    initializeCharts(canvasElements) {
        if (this.isInitialized) {
            console.warn('⚠️ Charts already initialized');
            return;
        }

        // Check if Chart.js and streaming plugin are loaded
        if (typeof Chart === 'undefined') {
            console.error('❌ Chart.js is not loaded');
            return;
        }

        // Initialize Temperature Chart
        if (canvasElements.temperature) {
            this.charts.temperature = this._createChart(
                canvasElements.temperature,
                'Temperature',
                '°C',
                '#ef4444', // Red
                'rgba(239, 68, 68, 0.1)'
            );
        }

        // Initialize Humidity Chart
        if (canvasElements.humidity) {
            this.charts.humidity = this._createChart(
                canvasElements.humidity,
                'Humidity',
                '%',
                '#3b82f6', // Blue
                'rgba(59, 130, 246, 0.1)'
            );
        }

        // Initialize Light Level Chart
        if (canvasElements.lightLevel) {
            this.charts.lightLevel = this._createChart(
                canvasElements.lightLevel,
                'Light Level',
                'lux',
                '#f59e0b', // Amber
                'rgba(245, 158, 11, 0.1)'
            );
        }

        // Initialize Soil Moisture Chart
        if (canvasElements.soilMoisture) {
            this.charts.soilMoisture = this._createChart(
                canvasElements.soilMoisture,
                'Soil Moisture',
                '%',
                '#10b981', // Green
                'rgba(16, 185, 129, 0.1)'
            );
        }

        this.isInitialized = true;
        console.log('✅ All charts initialized');
    }

    /**
     * Create a real-time streaming chart
     * @private
     */
    _createChart(canvasElement, label, unit, borderColor, backgroundColor) {
        const ctx = canvasElement.getContext('2d');
        
        return new Chart(ctx, {
            type: 'line',
            data: {
                datasets: [{
                    label: label,
                    data: [],
                    borderColor: borderColor,
                    backgroundColor: backgroundColor,
                    borderWidth: 2,
                    pointRadius: 0,
                    pointHoverRadius: 4,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: {
                    duration: 0
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top'
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        callbacks: {
                            label: function(context) {
                                return `${label}: ${context.parsed.y.toFixed(2)} ${unit}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        type: 'realtime',
                        realtime: {
                            duration: 20000, // 20 detik window
                            delay: 2000,     // 2 detik delay
                            refresh: 1000,   // Refresh setiap 1 detik
                            onRefresh: (chart) => {
                                // Called every time the chart is refreshed
                            }
                        },
                        ticks: {
                            display: true,
                            maxRotation: 0,
                            minRotation: 0
                        }
                    },
                    y: {
                        beginAtZero: false,
                        ticks: {
                            callback: function(value) {
                                return value.toFixed(1) + ' ' + unit;
                            }
                        },
                        title: {
                            display: true,
                            text: unit
                        }
                    }
                },
                interaction: {
                    intersect: false,
                    mode: 'index'
                }
            }
        });
    }

    /**
     * Update chart dengan data baru
     * @param {string} chartType - 'temperature', 'humidity', 'lightLevel', 'soilMoisture'
     * @param {number} value - Nilai sensor
     */
    updateChart(chartType, value) {
        if (!this.charts[chartType]) {
            console.warn(`⚠️ Chart ${chartType} not found`);
            return;
        }

        const chart = this.charts[chartType];
        const now = Date.now();

        // Add new data point
        chart.data.datasets[0].data.push({
            x: now,
            y: value
        });

        // Update chart (streaming plugin akan handle scrolling)
        chart.update('none'); // 'none' untuk no animation
    }

    /**
     * Update semua charts dengan sensor data
     * @param {Object} sensorData - Object dengan temperature, humidity, lightLevel, soilMoisture
     */
    updateAllCharts(sensorData) {
        if (sensorData.temperature !== undefined) {
            this.updateChart('temperature', sensorData.temperature);
        }
        if (sensorData.humidity !== undefined) {
            this.updateChart('humidity', sensorData.humidity);
        }
        if (sensorData.lightLevel !== undefined) {
            this.updateChart('lightLevel', sensorData.lightLevel);
        }
        if (sensorData.soilMoisture !== undefined) {
            this.updateChart('soilMoisture', sensorData.soilMoisture);
        }
    }

    /**
     * Destroy semua charts
     */
    destroyCharts() {
        Object.keys(this.charts).forEach(key => {
            if (this.charts[key]) {
                this.charts[key].destroy();
            }
        });
        this.charts = {};
        this.isInitialized = false;
        console.log('🗑️ All charts destroyed');
    }

    /**
     * Reset chart data (clear all data points)
     */
    resetCharts() {
        Object.keys(this.charts).forEach(key => {
            if (this.charts[key]) {
                this.charts[key].data.datasets[0].data = [];
                this.charts[key].update('none');
            }
        });
        console.log('🔄 All charts reset');
    }
}

