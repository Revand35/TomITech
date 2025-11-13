// greenhouse-map-manager.js
// Manager untuk OpenStreetMap (Leaflet) dengan markers untuk greenhouse
// ===========================================================

/**
 * Class untuk mengelola OpenStreetMap dengan markers untuk greenhouse
 */
export class GreenhouseMapManager {
    /**
     * @param {string} mapElementId
     * @param {Object|string|null} options - Optional configuration or legacy apiKey string
     */
    constructor(mapElementId, options = null) {
        this.mapElementId = mapElementId;

        // Backwards compatibility: second argument as string treated as apiKey (unused for Leaflet)
        if (typeof options === 'string') {
            options = { apiKey: options };
        }

        this.options = options || {};
        this.apiKey = this.options.apiKey || null;

        this.map = null;
        this.markers = {};
        this.popups = {};
        this.isInitialized = false;

        // Area drawing related state
        this.drawnItems = null;
        this.drawControl = null;
        this.areaListElement = null;
    }

    /**
     * Initialize OpenStreetMap (Leaflet)
     * @param {number} centerLat - Latitude center
     * @param {number} centerLng - Longitude center
     * @param {number} zoom - Zoom level (default: 12)
     */
    async initMap(centerLat = -7.534693, centerLng = 110.770551, zoom = 12) {
        if (this.isInitialized) {
            console.warn('⚠️ Map already initialized');
            return;
        }

        // Check if Leaflet is loaded
        if (typeof L === 'undefined') {
            console.error('❌ Leaflet library is not loaded');
            return;
        }

        const mapElement = document.getElementById(this.mapElementId);
        if (!mapElement) {
            console.error(`❌ Map element with ID "${this.mapElementId}" not found`);
            return;
        }

        // Initialize map
        this.map = L.map(mapElement, {
            center: [centerLat, centerLng],
            zoom: zoom,
            scrollWheelZoom: false,
            zoomControl: true,
            attributionControl: true
        });

        // Add OpenStreetMap tile layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 19
        }).addTo(this.map);

        this.isInitialized = true;
        console.log('✅ OpenStreetMap (Leaflet) initialized');

        // Setup area drawing tools jika tersedia
        this._setupAreaDrawing();
    }

    /**
     * Create custom icon untuk greenhouse marker
     * @private
     */
    _createGreenhouseIcon() {
        return L.divIcon({
            className: 'greenhouse-marker',
            html: `
                <div style="
                    width: 40px;
                    height: 40px;
                    background: #4CAF50;
                    border: 3px solid #ffffff;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                    position: relative;
                ">
                    <i class="fas fa-seedling" style="color: #ffffff; font-size: 18px;"></i>
                </div>
            `,
            iconSize: [40, 40],
            iconAnchor: [20, 20],
            popupAnchor: [0, -20]
        });
    }

    /**
     * Add greenhouse marker ke map
     * @param {Object} greenhouse - Greenhouse data dengan id, name, latitude, longitude
     * @param {Object} sensorData - Latest sensor data (optional)
     * @param {Function} onClickCallback - Callback saat marker diklik
     */
    addGreenhouseMarker(greenhouse, sensorData = null, onClickCallback = null) {
        if (!this.map) {
            console.error('❌ Map not initialized');
            return;
        }

        if (!greenhouse.latitude || !greenhouse.longitude) {
            console.warn(`⚠️ Greenhouse ${greenhouse.id} missing coordinates`);
            return;
        }

        const position = [greenhouse.latitude, greenhouse.longitude];

        // Create marker dengan custom icon
        const marker = L.marker(position, {
            icon: this._createGreenhouseIcon(),
            title: greenhouse.name || 'Greenhouse'
        }).addTo(this.map);

        // Create popup content
        const popupContent = this._createPopupContent(greenhouse, sensorData);
        const popup = marker.bindPopup(popupContent, {
            className: 'greenhouse-popup',
            maxWidth: 300,
            closeButton: true
        });

        // Store marker and popup
        this.markers[greenhouse.id] = marker;
        this.popups[greenhouse.id] = popup;

        // Click handler
        marker.on('click', () => {
            // Open popup
            marker.openPopup();

            // Call callback if provided
            if (onClickCallback) {
                onClickCallback(greenhouse.id);
            }
        });

        console.log(`✅ Added marker for greenhouse: ${greenhouse.name}`);
    }

    /**
     * Setup Leaflet draw controls untuk menandai area
     * @private
     */
    _setupAreaDrawing() {
        if (!this.map) return;
        if (typeof L === 'undefined' || !L.Control || !L.Control.Draw) {
            console.warn('⚠️ Leaflet Draw plugin not available.');
            return;
        }

        // Feature group untuk menyimpan area yang ditandai
        this.drawnItems = new L.FeatureGroup();
        this.map.addLayer(this.drawnItems);

        this.areaListElement = this._resolveElement(this.options.areaListElementId);

        // Control untuk gambar dan edit
        this.drawControl = new L.Control.Draw({
            position: 'topleft',
            draw: {
                polygon: {
                    allowIntersection: false,
                    showArea: true,
                    shapeOptions: {
                        color: '#2E8540',
                        weight: 2,
                        fillColor: '#2E8540',
                        fillOpacity: 0.25
                    }
                },
                rectangle: {
                    shapeOptions: {
                        color: '#2E8540',
                        weight: 2,
                        fillColor: '#2E8540',
                        fillOpacity: 0.25
                    }
                },
                polyline: false,
                circle: false,
                circlemarker: false,
                marker: false
            },
            edit: {
                featureGroup: this.drawnItems,
                remove: true
            }
        });

        this.map.addControl(this.drawControl);

        // Event listeners
        this.map.on(L.Draw.Event.CREATED, (event) => {
            const { layerType, layer } = event;

            // Apply consistent styles
            if (layer.setStyle && (layerType === 'polygon' || layerType === 'rectangle')) {
                layer.setStyle({
                    color: '#2E8540',
                    weight: 2,
                    fillColor: '#2E8540',
                    fillOpacity: 0.25
                });
            }

            const areaName = this._promptAreaName();
            layer.areaName = areaName;

            const infoHtml = this._buildAreaPopupContent(layer, areaName);
            if (layer.bindPopup && infoHtml) {
                layer.bindPopup(infoHtml);
                layer.openPopup();
            }

            this.drawnItems.addLayer(layer);
            this._updateAreaList();
        });

        this.map.on(L.Draw.Event.EDITED, (event) => {
            event.layers.eachLayer((layer) => {
                const infoHtml = this._buildAreaPopupContent(layer, layer.areaName);
                const popup = layer.getPopup ? layer.getPopup() : null;
                if (popup && infoHtml) {
                    popup.setContent(infoHtml);
                } else if (layer.bindPopup && infoHtml) {
                    layer.bindPopup(infoHtml);
                }
            });
            this._updateAreaList();
        });

        this.map.on(L.Draw.Event.DELETED, () => {
            this._updateAreaList();
        });
    }

    /**
     * Prompt user untuk nama area (dengan fallback)
     * @private
     */
    _promptAreaName() {
        const defaultName = `Area ${this.drawnItems ? this.drawnItems.getLayers().length + 1 : 1}`;
        let areaName = '';
        try {
            areaName = window.prompt('Masukkan nama area yang ditandai:', defaultName) || defaultName;
        } catch (err) {
            areaName = defaultName;
        }
        return areaName.trim();
    }

    /**
     * Build popup content untuk area
     * @param {L.Layer} layer
     * @param {string} areaName
     * @private
     */
    _buildAreaPopupContent(layer, areaName = 'Area') {
        if (!layer) return '';

        const areaSize = this._formatAreaSize(layer);
        const center = this._getLayerCenter(layer);

        return `
            <div style="min-width: 180px;">
                <strong style="color:#2e7d32;">${areaName}</strong><br>
                <span style="font-size:12px;color:#4b5563;">Luas: ${areaSize}</span><br>
                <span style="font-size:12px;color:#4b5563;">Pusat: ${center.lat}, ${center.lng}</span>
            </div>
        `;
    }

    /**
     * Update daftar area di panel
     * @private
     */
    _updateAreaList() {
        if (!this.areaListElement) return;

        const layers = this.drawnItems ? this.drawnItems.getLayers() : [];

        this.areaListElement.innerHTML = '';

        if (!layers.length) {
            const emptyItem = document.createElement('li');
            emptyItem.className = 'empty';
            emptyItem.textContent = 'Belum ada area yang ditandai.';
            this.areaListElement.appendChild(emptyItem);
            return;
        }

        layers.forEach((layer, index) => {
            const areaName = layer.areaName || `Area ${index + 1}`;
            const areaSize = this._formatAreaSize(layer);
            const center = this._getLayerCenter(layer);

            const listItem = document.createElement('li');
            listItem.className = 'area-item';
            listItem.innerHTML = `
                <div class="area-item-main">
                    <span class="area-item-name">${areaName}</span>
                    <span class="area-item-size">${areaSize}</span>
                </div>
                <div class="area-item-meta">
                    <span>Lat: ${center.lat}</span>
                    <span>Lng: ${center.lng}</span>
                </div>
            `;

            listItem.addEventListener('click', () => {
                if (!this.map) return;
                const bounds = this._getLayerBounds(layer);
                if (bounds) {
                    this.map.fitBounds(bounds, { padding: [30, 30] });
                } else if (center) {
                    this.map.setView([center.lat, center.lng], Math.max(this.map.getZoom(), 16));
                }
                if (layer.openPopup) {
                    layer.openPopup();
                }
            });

            this.areaListElement.appendChild(listItem);
        });
    }

    /**
     * Format luas area dalam meter persegi & hektar
     * @param {L.Layer} layer
     * @returns {string}
     * @private
     */
    _formatAreaSize(layer) {
        let areaInSquareMeters = 0;
        try {
            if (layer.getLatLngs) {
                const latLngs = layer.getLatLngs();
                if (latLngs && latLngs.length > 0) {
                    const polygon = Array.isArray(latLngs[0]) ? latLngs[0] : latLngs;
                    if (L.GeometryUtil && typeof L.GeometryUtil.geodesicArea === 'function') {
                        areaInSquareMeters = L.GeometryUtil.geodesicArea(polygon);
                    }
                }
            } else if (layer.getBounds) {
                const bounds = layer.getBounds();
                const sw = bounds.getSouthWest();
                const ne = bounds.getNorthEast();
                const distanceNorthSouth = L.latLng(sw.lat, sw.lng).distanceTo(L.latLng(ne.lat, sw.lng));
                const distanceEastWest = L.latLng(sw.lat, sw.lng).distanceTo(L.latLng(sw.lat, ne.lng));
                areaInSquareMeters = distanceNorthSouth * distanceEastWest;
            }
        } catch (err) {
            console.warn('⚠️ Gagal menghitung luas area:', err);
        }

        if (!areaInSquareMeters || Number.isNaN(areaInSquareMeters)) {
            return 'N/A';
        }

        if (areaInSquareMeters >= 1_000_000) {
            const squareKm = areaInSquareMeters / 1_000_000;
            return `${squareKm.toFixed(2)} km²`;
        }

        if (areaInSquareMeters >= 10_000) {
            const hectares = areaInSquareMeters / 10_000;
            return `${hectares.toFixed(2)} ha`;
        }

        return `${areaInSquareMeters.toFixed(0)} m²`;
    }

    /**
     * Get layer center coordinate
     * @param {L.Layer} layer
     * @returns {{lat: string, lng: string}}
     * @private
     */
    _getLayerCenter(layer) {
        let lat = 0;
        let lng = 0;

        try {
            if (layer.getBounds) {
                const center = layer.getBounds().getCenter();
                lat = center.lat;
                lng = center.lng;
            } else if (layer.getLatLng) {
                const center = layer.getLatLng();
                lat = center.lat;
                lng = center.lng;
            }
        } catch (err) {
            console.warn('⚠️ Gagal mendapatkan pusat area:', err);
        }

        return {
            lat: lat ? lat.toFixed(5) : '0.00000',
            lng: lng ? lng.toFixed(5) : '0.00000'
        };
    }

    /**
     * Get bounds of layer if available
     * @param {L.Layer} layer
     * @private
     */
    _getLayerBounds(layer) {
        try {
            if (layer.getBounds) {
                return layer.getBounds();
            }
            if (layer.getLatLngs) {
                return L.latLngBounds(layer.getLatLngs());
            }
        } catch (err) {
            console.warn('⚠️ Tidak dapat mendapatkan bounds layer:', err);
        }
        return null;
    }

    /**
     * Utility untuk resolve element dari ID / element
     * @param {string|HTMLElement|null} target
     * @private
     */
    _resolveElement(target) {
        if (!target) return null;
        if (typeof target === 'string') {
            return document.getElementById(target);
        }
        if (target instanceof HTMLElement) {
            return target;
        }
        return null;
    }

    /**
     * Hapus semua area yang ditandai
     */
    clearMarkedAreas() {
        if (this.drawnItems) {
            this.drawnItems.clearLayers();
        }
        this._updateAreaList();
    }

    /**
     * Create popup content HTML
     * @private
     */
    _createPopupContent(greenhouse, sensorData) {
        let content = `
            <div style="padding: 12px; min-width: 200px; font-family: 'Inter', sans-serif;">
                <h3 style="margin: 0 0 8px 0; color: #2e7d32; font-size: 16px; font-weight: 600;">
                    ${greenhouse.name || 'Greenhouse'}
                </h3>
                <p style="margin: 0 0 8px 0; color: #666; font-size: 12px;">
                    ${greenhouse.location || 'No location specified'}
                </p>
        `;

        if (sensorData) {
            content += `
                <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #e0e0e0;">
                    <p style="margin: 4px 0; font-size: 11px; color: #333;">
                        <strong>Temperature:</strong> ${sensorData.temperature?.toFixed(1) || 'N/A'} °C
                    </p>
                    <p style="margin: 4px 0; font-size: 11px; color: #333;">
                        <strong>Humidity:</strong> ${sensorData.humidity?.toFixed(1) || 'N/A'} %
                    </p>
                    <p style="margin: 4px 0; font-size: 11px; color: #333;">
                        <strong>Light:</strong> ${sensorData.lightLevel?.toFixed(0) || 'N/A'} lux
                    </p>
                    <p style="margin: 4px 0; font-size: 11px; color: #333;">
                        <strong>Soil:</strong> ${sensorData.soilMoisture?.toFixed(1) || 'N/A'} %
                    </p>
                </div>
            `;
        }

        content += `</div>`;
        return content;
    }

    /**
     * Update marker popup dengan sensor data terbaru
     * @param {string} greenhouseId - Greenhouse ID
     * @param {Object} sensorData - Latest sensor data
     */
    updateMarkerInfo(greenhouseId, sensorData) {
        if (!this.markers[greenhouseId] || !this.popups[greenhouseId]) {
            return;
        }

        const marker = this.markers[greenhouseId];
        const greenhouse = {
            id: greenhouseId,
            name: marker.options.title || 'Greenhouse',
            location: '' // Could be stored separately
        };

        const popupContent = this._createPopupContent(greenhouse, sensorData);
        
        // Update popup content
        if (marker.isPopupOpen()) {
            marker.setPopupContent(popupContent);
        } else {
            marker.bindPopup(popupContent, {
                className: 'greenhouse-popup',
                maxWidth: 300,
                closeButton: true
            });
        }
    }

    /**
     * Update marker position
     * @param {string} greenhouseId - Greenhouse ID
     * @param {number} lat - New latitude
     * @param {number} lng - New longitude
     */
    updateMarkerPosition(greenhouseId, lat, lng) {
        if (!this.markers[greenhouseId]) {
            return;
        }

        this.markers[greenhouseId].setLatLng([lat, lng]);
    }

    /**
     * Show popup untuk greenhouse tertentu
     * @param {string} greenhouseId - Greenhouse ID
     */
    showInfoWindow(greenhouseId) {
        if (!this.markers[greenhouseId]) {
            return;
        }

        // Close all other popups
        Object.values(this.markers).forEach(marker => {
            if (marker.isPopupOpen()) {
                marker.closePopup();
            }
        });

        // Open this popup
        this.markers[greenhouseId].openPopup();
    }

    /**
     * Fit bounds untuk menampilkan semua markers
     */
    fitBounds() {
        if (!this.map || Object.keys(this.markers).length === 0) {
            return;
        }

        const bounds = L.latLngBounds(
            Object.values(this.markers).map(marker => marker.getLatLng())
        );

        this.map.fitBounds(bounds, {
            padding: [50, 50],
            maxZoom: 15
        });
    }

    /**
     * Remove marker
     * @param {string} greenhouseId - Greenhouse ID
     */
    removeMarker(greenhouseId) {
        if (this.markers[greenhouseId]) {
            this.map.removeLayer(this.markers[greenhouseId]);
            delete this.markers[greenhouseId];
        }
        if (this.popups[greenhouseId]) {
            delete this.popups[greenhouseId];
        }
    }

    /**
     * Clear all markers
     */
    clearMarkers() {
        Object.keys(this.markers).forEach(id => {
            this.removeMarker(id);
        });
    }

    /**
     * Set map center
     * @param {number} lat - Latitude
     * @param {number} lng - Longitude
     */
    setCenter(lat, lng) {
        if (this.map) {
            this.map.setView([lat, lng], this.map.getZoom());
        }
    }
}
