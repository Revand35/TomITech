/**
 * Relay Control Service
 * Service untuk komunikasi dengan ESP32 API untuk kontrol relay
 * 
 * Endpoint yang digunakan:
 * - POST /api/mode - Set mode (auto/manual)
 * - GET /api/mode - Get current mode
 * - POST /api/relay - Control relay (hanya di mode manual)
 * - GET /api/relay/status - Get relay status
 */

/**
 * Get ESP32 base URL
 * Menggunakan konfigurasi yang sama dengan sensor monitoring
 */
function getEsp32BaseUrl() {
  // Gunakan konfigurasi yang sama dengan monitoring.html
  // Prioritas: mDNS hostname (greenhouse.local) sebagai default
  const ESP32_MDNS_HOST = 'greenhouse.local';
  const ESP32_IP_ADDRESS = null; // Set ke IP address jika mDNS gagal, contoh: '192.168.1.4'
  
  const baseUrl = ESP32_IP_ADDRESS 
    ? `http://${ESP32_IP_ADDRESS}`
    : `http://${ESP32_MDNS_HOST}`;
  
  return baseUrl;
}

/**
 * Set mode ESP32 (auto/manual)
 * @param {string} mode - "auto" atau "manual"
 * @returns {Promise<Object>} Response dari ESP32
 */
export async function setEsp32Mode(mode) {
  try {
    if (mode !== 'auto' && mode !== 'manual') {
      throw new Error('Invalid mode. Must be "auto" or "manual"');
    }

    const baseUrl = getEsp32BaseUrl();
    const url = `${baseUrl}/api/mode`;
    
    console.log(`🔄 Setting ESP32 mode to: ${mode}`);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ mode }),
      cache: 'no-store'
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    console.log(`✅ ESP32 mode set to: ${data.mode}`);
    
    return {
      success: true,
      mode: data.mode,
      previousMode: data.previousMode || null
    };
  } catch (error) {
    console.error('❌ Error setting ESP32 mode:', error);
    throw error;
  }
}

/**
 * Get current mode ESP32
 * @returns {Promise<Object>} Current mode dari ESP32
 */
export async function getEsp32Mode() {
  try {
    const baseUrl = getEsp32BaseUrl();
    const url = `${baseUrl}/api/mode`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      },
      cache: 'no-store'
    });

    if (!response.ok) {
      // Jika endpoint belum tersedia, return default "auto"
      if (response.status === 404) {
        console.warn('⚠️ Mode endpoint not found, defaulting to "auto"');
        return { mode: 'auto' };
      }
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    return {
      mode: data.mode || 'auto',
      timestamp: data.timestamp || null
    };
  } catch (error) {
    console.warn('⚠️ Error getting ESP32 mode:', error);
    // Return default "auto" jika error
    return { mode: 'auto' };
  }
}

/**
 * Control relay individual atau multiple
 * @param {Object} relayConfig - Konfigurasi relay { fan1: true, fan2: false, ... }
 * @returns {Promise<Object>} Response dari ESP32
 */
export async function controlRelay(relayConfig) {
  try {
    // Validasi relay config
    const validRelays = ['fan1', 'fan2', 'exhaust1', 'exhaust2', 'pump', 'valveA', 'valveB'];
    const relays = {};
    
    for (const [key, value] of Object.entries(relayConfig)) {
      if (validRelays.includes(key)) {
        relays[key] = Boolean(value);
      }
    }

    if (Object.keys(relays).length === 0) {
      throw new Error('No valid relay configuration provided');
    }

    const baseUrl = getEsp32BaseUrl();
    const url = `${baseUrl}/api/relay`;
    
    console.log('🔌 Controlling relays:', relays);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ relays }),
      cache: 'no-store'
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ Relays updated:', data.relays);
    
    return {
      success: true,
      relays: data.relays || relays
    };
  } catch (error) {
    console.error('❌ Error controlling relay:', error);
    throw error;
  }
}

/**
 * Get relay status dari ESP32
 * @returns {Promise<Object>} Status semua relay
 */
export async function getRelayStatus() {
  try {
    const baseUrl = getEsp32BaseUrl();
    const url = `${baseUrl}/api/relay/status`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      },
      cache: 'no-store'
    });

    if (!response.ok) {
      // Jika endpoint belum tersedia, return default status
      if (response.status === 404) {
        console.warn('⚠️ Relay status endpoint not found');
        return {
          relays: {
            fan1: false,
            fan2: false,
            exhaust1: false,
            exhaust2: false,
            pump: false,
            valveA: false,
            valveB: false
          },
          mode: 'auto'
        };
      }
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    return {
      relays: data.relays || {},
      mode: data.mode || 'auto',
      timestamp: data.timestamp || null
    };
  } catch (error) {
    console.warn('⚠️ Error getting relay status:', error);
    // Return default status jika error
    return {
      relays: {
        fan1: false,
        fan2: false,
        exhaust1: false,
        exhaust2: false,
        pump: false,
        valveA: false,
        valveB: false
      },
      mode: 'auto'
    };
  }
}

/**
 * Control sistem irigasi (3 relay sekaligus: pump + valveA + valveB)
 * @param {boolean} on - true untuk menyala, false untuk mati
 * @returns {Promise<Object>} Response dari ESP32
 */
export async function controlIrrigationSystem(on) {
  try {
    const relayConfig = {
      pump: Boolean(on),
      valveA: Boolean(on),
      valveB: Boolean(on)
    };
    
    console.log(`💧 ${on ? 'Starting' : 'Stopping'} irrigation system`);
    
    return await controlRelay(relayConfig);
  } catch (error) {
    console.error('❌ Error controlling irrigation system:', error);
    throw error;
  }
}

/**
 * Toggle relay state
 * @param {string} relayName - Nama relay (fan1, fan2, exhaust1, exhaust2, pump, valveA, valveB)
 * @param {Object} currentStatus - Status relay saat ini
 * @returns {Promise<Object>} Response dari ESP32
 */
export async function toggleRelay(relayName, currentStatus) {
  try {
    const validRelays = ['fan1', 'fan2', 'exhaust1', 'exhaust2', 'pump', 'valveA', 'valveB'];
    
    if (!validRelays.includes(relayName)) {
      throw new Error(`Invalid relay name: ${relayName}`);
    }

    const currentState = currentStatus?.relays?.[relayName] || false;
    const newState = !currentState;
    
    const relayConfig = {
      [relayName]: newState
    };
    
    console.log(`🔄 Toggling ${relayName}: ${currentState} → ${newState}`);
    
    return await controlRelay(relayConfig);
  } catch (error) {
    console.error(`❌ Error toggling relay ${relayName}:`, error);
    throw error;
  }
}

