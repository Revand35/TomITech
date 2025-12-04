// chat-logic.js - FINAL
import { getChatResponse, getResponseWithContext, analyzeGreenhouseData, analyzeGreenhouseCondition } from '../core/gemini-service.js';
import {
  saveChatToFirestore,
  getChatHistoryFromFirestore,
  deleteChatHistoryItem
} from './chat-firestore-service.js';
import { auth } from '../../../config/firebase-init.js';
import { getActivitiesFromLocalStorage, getInputHistory } from '../core/local-storage-service.js';
// import { getTestingAccountWithData } from '../core/testing-account-service.js';

// =============================
// State
// =============================
let fileContext = null;
let chatHistory = [];
let isProcessing = false;

// =============================
// API Key Error Banner
// =============================
function showApiKeyErrorBanner() {
  // Remove existing banner if any
  const existingBanner = document.getElementById('api-key-error-banner');
  if (existingBanner) {
    existingBanner.remove();
  }

  const banner = document.createElement('div');
  banner.id = 'api-key-error-banner';
  banner.style.cssText = `
    position: fixed;
    top: 80px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 10000;
    background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
    color: white;
    padding: 16px 24px;
    border-radius: 12px;
    box-shadow: 0 8px 24px rgba(239, 68, 68, 0.4);
    max-width: 90%;
    width: 600px;
    animation: slideDown 0.3s ease-out;
  `;
  
  banner.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: space-between; gap: 16px;">
      <div style="flex: 1;">
        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
          <i class="fas fa-exclamation-triangle" style="font-size: 1.5rem;"></i>
          <strong style="font-size: 1.1rem;">API Key Expired</strong>
        </div>
        <p style="margin: 0; font-size: 0.9rem; opacity: 0.95; line-height: 1.5;">
          Gemini API key Anda sudah expired. Silakan update API key baru di <code style="background: rgba(255,255,255,0.2); padding: 2px 6px; border-radius: 4px;">config/config.js</code>
        </p>
        <div style="margin-top: 12px; display: flex; gap: 8px; flex-wrap: wrap;">
          <a href="https://aistudio.google.com/app/apikey" target="_blank" style="background: white; color: #ef4444; padding: 8px 16px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 0.875rem; display: inline-flex; align-items: center; gap: 6px;">
            <i class="fas fa-key"></i> Buat API Key Baru
          </a>
          <button onclick="document.getElementById('api-key-error-banner').remove()" style="background: rgba(255,255,255,0.2); color: white; border: 1px solid rgba(255,255,255,0.3); padding: 8px 16px; border-radius: 8px; cursor: pointer; font-weight: 500; font-size: 0.875rem;">
            Tutup
          </button>
        </div>
      </div>
    </div>
  `;

  // Add animation
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideDown {
      from {
        opacity: 0;
        transform: translateX(-50%) translateY(-20px);
      }
      to {
        opacity: 1;
        transform: translateX(-50%) translateY(0);
      }
    }
  `;
  if (!document.getElementById('api-key-error-banner-style')) {
    style.id = 'api-key-error-banner-style';
    document.head.appendChild(style);
  }

  document.body.appendChild(banner);

  // Auto remove after 30 seconds
  setTimeout(() => {
    if (banner.parentElement) {
      banner.style.animation = 'slideDown 0.3s ease-out reverse';
      setTimeout(() => banner.remove(), 300);
    }
  }, 30000);
}

// =============================
// Helpers: waktu & format
// =============================
function _timeValue(item) {
  if (!item) return 0;
  if (item.createdAt && typeof item.createdAt.toDate === 'function') {
    return item.createdAt.toDate().getTime();
  }
  if (item.createdAt instanceof Date) return item.createdAt.getTime();
  if (typeof item.createdAt === 'number') return item.createdAt;
  if (item.timestamp) {
    const t = Date.parse(item.timestamp);
    if (!isNaN(t)) return t;
  }
  return 0;
}
function _formatTimestampForBubble(item) {
  let ts = null;
  if (item?.createdAt?.toDate) ts = item.createdAt.toDate();
  else if (item?.timestamp) ts = new Date(item.timestamp);
  else if (item?.createdAt instanceof Date) ts = item.createdAt;
  else if (typeof item === 'number') ts = new Date(item);
  else ts = new Date();
  return ts.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// =============================
// Load history (Firestore / Local)
// =============================
export async function loadChatHistoryOnStartup() {
  const chatContainer = document.getElementById('chat-messages');
  if (!chatContainer) return;

  let chats = [];
  try {
    if (auth?.currentUser) {
      chats = await getChatHistoryFromFirestore(200);
    } else {
      chats = JSON.parse(localStorage.getItem('chatHistory') || '[]');
    }
  } catch (err) {
    console.error('❌ Gagal ambil history chat:', err);
  }

  if (!Array.isArray(chats) || chats.length === 0) {
    console.log('ℹ️ Tidak ada riwayat chat.');
    return;
  }

  chats.sort((a, b) => _timeValue(a) - _timeValue(b));

  chatHistory = chats.map(c => ({
    role: c.role === 'user' ? 'user' : 'model',
    parts: [{ text: c.message }]
  }));
  

  chats.forEach((c) => {
    const role = (c.role === 'user') ? 'user' : 'ai';
    const text = c.message ?? (c.parts ? c.parts.map(p => p.text).join(' ') : '');
    addMessageToChat(text, role, false, _formatTimestampForBubble(c));
  });

  scrollToBottom();
}

// =============================
// Setup listeners
// =============================
export function setupChatListeners() {
  const sendButton = document.getElementById('send-chat-btn');
  const chatInput = document.getElementById('chat-input');

  // Setup scroll detection untuk auto scroll yang lebih pintar
  setupScrollDetection();

  if (sendButton) sendButton.addEventListener('click', handleSendClick);

  if (chatInput) {
    chatInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSendClick();
      }
    });
    chatInput.addEventListener('input', () => {
      chatInput.style.height = 'auto';
      chatInput.style.height = `${Math.min(chatInput.scrollHeight, 120)}px`;
    });
  }

  const fileUploadButton = document.getElementById('file-upload-button');
  const fileInput = document.getElementById('file-input');
  if (fileUploadButton) fileUploadButton.addEventListener('click', () => fileInput.click());
  if (fileInput) fileInput.addEventListener('change', handleFileUpload);

  // refresh chat
  document.getElementById('refresh-chat-btn')?.addEventListener('click', async () => {
    const chatContainer = document.getElementById('chat-messages');
    if (!chatContainer) return;

    chatContainer.innerHTML = '';
    chatHistory = []; // Clear in-memory history
    localStorage.removeItem('chatHistory');

    if (auth?.currentUser) {
      try {
        const items = await getChatHistoryFromFirestore(500);
        for (const it of items) {
          if (it.id) await deleteChatHistoryItem(it.id);
        }
        console.log('✅ Chat history berhasil dihapus dari Firestore');
      } catch (err) {
        console.error('❌ Gagal hapus history Firestore:', err);
      }
    }

    addMessageToChat('Riwayat chat telah dihapus. Mulai percakapan baru!', 'ai');
  });

  // Listen for visibility change - reload chat when tab becomes visible
  // Hanya reload jika sudah ada pesan di chat (tidak reload saat pertama kali masuk)
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      const chatContainer = document.getElementById('chat-messages');
      // Only reload if chat container exists, is visible, and already has messages
      if (chatContainer && document.body.classList.contains('chat-mode')) {
        const hasMessages = chatContainer.children.length > 1; // > 1 karena ada welcome message
        if (hasMessages) {
        reloadChatHistory();
        }
      }
    }
  });

  // Listen for page focus - reload chat when window regains focus
  // Hanya reload jika sudah ada pesan di chat (tidak reload saat pertama kali masuk)
  window.addEventListener('focus', () => {
    const chatContainer = document.getElementById('chat-messages');
    if (chatContainer && document.body.classList.contains('chat-mode')) {
      const hasMessages = chatContainer.children.length > 1; // > 1 karena ada welcome message
      if (hasMessages) {
      reloadChatHistory();
      }
    }
  });

  // Jangan load history otomatis saat pertama kali masuk
  // History akan dimuat melalui tombol history panel jika user membutuhkan
  // loadChatHistoryOnStartup();
}

// =============================
// Reload chat history
// =============================
async function reloadChatHistory() {
  const chatContainer = document.getElementById('chat-messages');
  if (!chatContainer) return;

  // Get current messages count (exclude welcome message and data summary)
  const welcomeMessage = chatContainer.querySelector('.chat-message:not(.user) .message-content')?.textContent?.includes('Halo! Saya AI Assistant');
  const currentMessagesCount = Array.from(chatContainer.children).filter(child => {
    const messageContent = child.querySelector('.message-content')?.textContent || '';
    // Exclude welcome message and data summary
    return !messageContent.includes('Halo! Saya AI Assistant') && 
           !messageContent.includes('Ringkasan Data Aktivitas');
  }).length;

  let chats = [];
  try {
    if (auth?.currentUser) {
      chats = await getChatHistoryFromFirestore(200);
    } else {
      chats = JSON.parse(localStorage.getItem('chatHistory') || '[]');
    }
  } catch (err) {
    console.error('❌ Gagal reload chat:', err);
    return;
  }

  // Only reload if there are new messages or messages are missing
  // Dan hanya jika sudah ada pesan sebelumnya (bukan pertama kali masuk)
  // currentMessagesCount > 0 berarti sudah ada pesan user sebelumnya (selain welcome message)
  if (chats.length > 0 && currentMessagesCount > 0 && chats.length !== currentMessagesCount) {
    console.log('🔄 Reloading chat history...');

    // Sort by time
    chats.sort((a, b) => _timeValue(a) - _timeValue(b));

    // Rebuild chatHistory for AI context (hanya untuk konteks, tidak untuk ditampilkan)
    chatHistory = chats.map(c => ({
      role: c.role === 'user' ? 'user' : 'model',
      parts: [{ text: c.message }]
    }));

    // Jangan clear dan re-render semua messages
    // Hanya update chatHistory untuk konteks AI
    // Messages akan tetap seperti yang sudah ada di UI
    console.log(`✅ Updated chatHistory context with ${chatHistory.length} messages (not displayed)`);
  } else if (chats.length === 0 && currentMessagesCount === 0) {
    // First time chat - tidak ada history, tidak perlu reload
    console.log('ℹ️ First time chat, no history to reload');
  }
}

// =============================
// Tambah pesan ke UI
// =============================
export function addMessageToChat(message, sender = "ai", isLoading = false, fixedTime = null) {
  const chatContainer = document.getElementById("chat-messages");
  if (!chatContainer) return null;

  const messageId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const timestamp = fixedTime || new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  let messageHTML = "";

  if (sender === "user") {
    messageHTML = `
      <div class="chat-message user">
        <div class="avatar">
          <i class="fas fa-user"></i>
        </div>
        <div class="message-bubble">
          <div class="message-content">${escapeHtml(message)}</div>
          <span class="timestamp">${timestamp}</span>
        </div>
      </div>`;
  } else {
    messageHTML = `
      <div id="${messageId}" class="chat-message">
        <div class="avatar">
          <i class="fas fa-robot"></i>
        </div>
        <div class="message-bubble">
          <div class="message-content">
            ${isLoading ? '<div class="typing-indicator"><div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div></div>' : formatAIMessage(message)}
          </div>
          <span class="timestamp">${timestamp}</span>
        </div>
      </div>`;
  }

  chatContainer.insertAdjacentHTML("beforeend", messageHTML);
  
  // Auto scroll to bottom dengan smooth animation
  scrollToBottom();

  return messageId;
}

function updateMessage(messageId, newText) {
  if (!messageId) {
    console.error('❌ updateMessage: messageId is required');
    return;
  }
  
  const messageElement = document.getElementById(messageId);
  if (!messageElement) {
    console.error('❌ updateMessage: Message element not found with ID:', messageId);
    // Try to find the last loading message as fallback
    const lastLoadingMessage = document.querySelector('.chat-message:not(.user) .message-content:has(.typing-indicator)');
    if (lastLoadingMessage) {
      console.log('✅ Found fallback loading message');
      lastLoadingMessage.innerHTML = formatAIMessage(newText);
      return;
    }
    return;
  }
  
  const textElement = messageElement.querySelector('.message-content');
  if (!textElement) {
    console.error('❌ updateMessage: .message-content not found in message element');
    return;
  }
  
  try {
    textElement.innerHTML = formatAIMessage(newText);
    console.log('✅ Message updated successfully');
    
    // Auto scroll ketika pesan diupdate (untuk streaming response)
    scrollToBottom();
  } catch (err) {
    console.error('❌ Error updating message:', err);
  }
}

// =============================
// Send & interaction
// =============================
async function handleSendClick() {
  if (isProcessing) return;
  await sendMessage();
}

async function sendMessage() {
  if (isProcessing) {
    console.log('⚠️ Already processing, ignoring send request');
    return;
  }
  
  const input = document.getElementById('chat-input');
  if (!input) {
    console.error('❌ Chat input not found');
    return;
  }

  const message = input.value.trim();
  if (message === '' && !fileContext) {
    console.log('⚠️ Empty message, ignoring');
    return;
  }

  // Clear input immediately for better UX
  input.value = '';
  input.style.height = '48px';

  try {
    if (fileContext) {
      const prompt = message || 'Tolong analisis dokumen ini.';
      await handleChatInteraction(prompt, fileContext);
      clearFileContext();
    } else {
      await handleChatInteraction(message);
    }
  } catch (err) {
    console.error('❌ Error in sendMessage:', err);
    // isProcessing will be reset in handleChatInteraction's finally block
  }
}

// =============================
// Waste Analysis Functions
// =============================

/**
 * Deteksi apakah pesan mengandung request analisis limbah
 * @param {string} message - Pesan user
 * @returns {boolean} - True jika mengandung request analisis limbah
 */
function isWasteAnalysisRequest(message) {
  const wasteKeywords = [
    'analisis limbah', 'hitung limbah', 'nilai ekonomi limbah',
    'olah limbah', 'daur ulang', 'recycle', 'upcycle',
    'profit dari limbah', 'produk dari limbah', 'circular economy',
    'waste management', 'green accounting', 'sustainability',
    'histori data', 'data input', 'aktivitas terbaru', 'data sebelumnya'
  ];
  
  const lowerMessage = message.toLowerCase();
  return wasteKeywords.some(keyword => lowerMessage.includes(keyword));
}

/**
 * Ambil data aktivitas terbaru dari Local Storage
 * @returns {Promise<Array>} - Array aktivitas terbaru
 */
async function getRecentWasteData() {
  try {
    const activities = await getActivitiesFromLocalStorage(10);
    return activities.filter(activity => 
      ['waste', 'energy', 'water', 'carbon', 'recycling'].includes(activity.activityType)
    );
  } catch (error) {
    console.error('Error getting recent waste data:', error);
    return [];
  }
}

/**
 * Ambil histori data input untuk konsultasi AI
 * @returns {Promise<Array>} - Array histori data input
 */
async function getInputHistoryData() {
  try {
    const history = await getInputHistory(20);
    return history;
  } catch (error) {
    console.error('Error fetching input history:', error);
    return [];
  }
}

/**
 * Format waktu relatif (time ago)
 * @param {Date} date - Tanggal
 * @returns {string} - Format waktu relatif
 */
function getTimeAgo(date) {
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);
  
  if (diffInSeconds < 60) return 'Baru saja';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} menit lalu`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} jam lalu`;
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} hari lalu`;
  return `${Math.floor(diffInSeconds / 2592000)} bulan lalu`;
}

/**
 * Generate waste analysis response
 * @param {string} message - Pesan user
 * @returns {Promise<string>} - Response dengan analisis limbah
 */
async function generateWasteAnalysisResponse(message) {
  try {
    // Ambil data aktivitas terbaru dan histori input
    const recentActivities = await getRecentWasteData();
    const inputHistory = await getInputHistoryData();
    
    if (recentActivities.length === 0 && inputHistory.length === 0) {
      return `Saya tidak menemukan data aktivitas limbah terbaru. Silakan input data aktivitas lingkungan terlebih dahulu di halaman "Input Data" untuk mendapatkan analisis yang lebih akurat.

**Untuk mendapatkan analisis limbah yang komprehensif:**
1. Buka halaman "Input Data" 
2. Input aktivitas limbah Anda (plastik, kertas, organik, dll.)
3. Kembali ke sini untuk konsultasi analisis

**Saya tetap bisa membantu dengan:**
- Saran umum pengolahan limbah
- Strategi circular economy
- Tips green accounting untuk UMKM
- Analisis profit dari berbagai jenis limbah`;
    }

    // Analisis data terbaru
    const latestActivity = recentActivities[0];
    const economicValue = calculateWasteEconomicValue(latestActivity);
    const productSuggestions = generateProductSuggestions(latestActivity);
    
    let response = `## 📊 **Analisis Limbah Terbaru Anda**

**Data Terbaru:**
- **Jenis**: ${latestActivity.materialType} (${latestActivity.amount} ${latestActivity.unit})
- **Aksi**: ${latestActivity.action}
- **Nilai Ekonomi Saat Ini**: Rp ${economicValue.currentValue.toLocaleString()}
- **Potensi Nilai**: Rp ${economicValue.potentialValue.toLocaleString()}
- **Potensi Penghematan**: Rp ${economicValue.savings.toLocaleString()}

## 💡 **Saran Produk dari Limbah Anda**

`;

    // Tambahkan histori data input jika ada
    if (inputHistory.length > 0) {
      response += `## 📋 **Histori Data Input Anda**

**Data Input Terbaru (${inputHistory.length} item):**
`;
      
      inputHistory.slice(0, 5).forEach((item, index) => {
        const timeAgo = getTimeAgo(item.timestamp);
        response += `${index + 1}. **${item.summary}** (${timeAgo})\n`;
      });
      
      if (inputHistory.length > 5) {
        response += `... dan ${inputHistory.length - 5} data lainnya\n`;
      }
      
      response += `\n**💡 Tips**: Anda bisa bertanya tentang data spesifik dari histori di atas, misalnya "analisis data plastik 50 kg" atau "saran produk dari data kertas terbaru".\n\n`;
    }

    // Tambahkan saran produk
    productSuggestions.forEach((suggestion, index) => {
      response += `**${index + 1}. ${suggestion.product}**
- **Deskripsi**: ${suggestion.description}
- **Harga Pasar**: Rp ${suggestion.marketPrice.toLocaleString()}
- **Biaya Produksi**: Rp ${suggestion.productionCost.toLocaleString()}
- **Margin Profit**: ${suggestion.profitMargin}%
- **Bahan**: ${suggestion.materials}

`;
    });

    // Tambahkan rekomendasi umum
    response += `## 🎯 **Rekomendasi Strategis**

1. **Implementasi Circular Economy**: Fokus pada pengolahan limbah menjadi produk bernilai tinggi
2. **Partnership dengan Pengolah**: Cari mitra yang bisa mengolah limbah Anda
3. **Diversifikasi Produk**: Kembangkan berbagai produk dari satu jenis limbah
4. **Market Research**: Analisis permintaan pasar untuk produk daur ulang

## 📈 **Potensi ROI**

Dengan mengolah ${latestActivity.amount} ${latestActivity.unit} ${latestActivity.materialType}, Anda berpotensi mendapatkan:
- **ROI**: ${Math.round((economicValue.savings / economicValue.currentValue) * 100)}%
- **Payback Period**: 3-6 bulan (tergantung investasi)
- **Annual Profit**: Rp ${(economicValue.savings * 12).toLocaleString()}

Apakah Anda ingin analisis lebih detail untuk jenis limbah tertentu?`;

    return response;

  } catch (error) {
    console.error('Error generating waste analysis:', error);
    return `Maaf, terjadi error dalam menganalisis data limbah. Silakan coba lagi atau input data aktivitas terlebih dahulu.`;
  }
}

async function handleChatInteraction(prompt, context = null) {
  if (isProcessing) {
    console.warn('⚠️ Already processing a message, ignoring new request');
    return;
  }
  
  if (!prompt || !prompt.trim()) {
    console.warn('⚠️ Empty prompt, ignoring');
    return;
  }

  console.log('🚀 Starting chat interaction:', { prompt: prompt.substring(0, 50) + '...', hasContext: !!context });
  
  isProcessing = true;

  try {
  addMessageToChat(prompt, 'user');
  persistMessage(prompt, 'user');

    // Pastikan chatHistory sudah ada (untuk melanjutkan chat dari history)
    // Hanya load history jika user sudah pernah chat sebelumnya (ada di Firestore)
    // Jangan load semua history otomatis saat pertama kali chat
    if (chatHistory.length === 0) {
      console.log('⚠️ chatHistory is empty, loading recent history...');
      // Hanya load history terbaru (5 pesan terakhir) untuk konteks, bukan semua
      try {
        if (auth?.currentUser) {
          const recentChats = await getChatHistoryFromFirestore(5);
          if (recentChats.length > 0) {
            chatHistory = recentChats.map(c => ({
              role: c.role === 'user' ? 'user' : 'model',
              parts: [{ text: c.message }]
            }));
            console.log(`✅ Loaded ${chatHistory.length} recent messages for context`);
          }
        }
      } catch (err) {
        console.error('❌ Error loading recent history:', err);
      }
    }

    console.log(`💬 Sending message with ${chatHistory.length} previous messages in context`);

  const loadingId = addMessageToChat('Sedang berpikir...', 'ai', true);

  try {
    let responseText = '';
    
    // Cek apakah ini request analisis limbah
    if (isWasteAnalysisRequest(prompt)) {
        console.log('📊 Detected waste analysis request');
      responseText = await generateWasteAnalysisResponse(prompt);
    } else if (context) {
        console.log('📄 Using file context');
      responseText = await getResponseWithContext(context, prompt, chatHistory);
    } else {
        console.log('💬 Sending to Gemini API');
      responseText = await getChatResponse(prompt, chatHistory);
    }
    
      if (!responseText) {
        console.warn('⚠️ Empty response from API');
        responseText = 'Maaf, saya tidak dapat memberikan respons saat ini.';
      }

      // Check if response contains API key error message
      if (responseText.includes('API Key Expired') || responseText.includes('API key expired') || responseText.includes('API_KEY_INVALID')) {
        showApiKeyErrorBanner();
      }

      console.log('✅ Received response, length:', responseText.length);
    updateMessage(loadingId, responseText);
    persistMessage(responseText, 'ai');

      // Update chatHistory untuk konteks berikutnya
    chatHistory.push({ role: 'user', parts: [{ text: prompt }] });
    chatHistory.push({ role: 'model', parts: [{ text: responseText }] });
      
      console.log(`✅ Updated chatHistory: ${chatHistory.length} messages`);
      
      // Pastikan scroll ke bottom setelah response selesai
      scrollToBottom(true); // Force scroll setelah response selesai
  } catch (err) {
      console.error('❌ Error in handleChatInteraction:', err);
      console.error('Error details:', err.message, err.stack);
      
      // Check if it's an API key error
      if (err.message && (err.message.includes('API_KEY') || err.message.includes('API key expired') || err.message.includes('API_KEY_INVALID'))) {
        showApiKeyErrorBanner();
      }
      
      // Try to update loading message with error
      const loadingMessages = document.querySelectorAll('.chat-message:not(.user) .message-bubble');
      if (loadingMessages.length > 0) {
        const lastLoading = loadingMessages[loadingMessages.length - 1];
        if (lastLoading && lastLoading.textContent.includes('Sedang berpikir')) {
          updateMessage(lastLoading.id || `msg-${Date.now()}`, `Maaf, terjadi kesalahan: ${err.message}`);
        }
      }
    }
  } catch (err) {
    console.error('❌ Critical error in handleChatInteraction:', err);
  } finally {
    isProcessing = false;
    console.log('✅ Chat interaction completed, isProcessing reset');
  }
}

// =============================
// Persistence
// =============================
function persistMessage(msg, role) {
  // Only save to Firestore if user is logged in
  if (auth?.currentUser) {
    try {
      if (typeof saveChatToFirestore === 'function') {
        const p = saveChatToFirestore(msg, role);
        if (p?.catch) p.catch(err => console.error('saveChatToFirestore failed', err));
      }
    } catch (e) {
      console.warn('firestore save error', e);
    }
  } else {
    // Only save to localStorage if user is NOT logged in
    try {
      const local = JSON.parse(localStorage.getItem('chatHistory') || '[]');
      local.push({ message: msg, role, timestamp: new Date().toISOString() });
      localStorage.setItem('chatHistory', JSON.stringify(local));
    } catch (e) {
      console.warn('local save failed', e);
    }
  }
}

// =============================
// File Upload (PDF)
// =============================
async function handleFileUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  if (file.type !== 'application/pdf') {
    addMessageToChat('Maaf, hanya PDF yang didukung.', 'ai');
    return;
  }
  addMessageToChat(`📄 Menganalisis file: ${file.name}...`, 'ai');

  try {
    if (!window.pdfjsLib) await loadPDFLibrary();
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const typedarray = new Uint8Array(e.target.result);
        const pdf = await window.pdfjsLib.getDocument(typedarray).promise;
        let textContent = '';
        for (let i = 1; i <= Math.min(pdf.numPages, 10); i++) {
          const page = await pdf.getPage(i);
          const text = await page.getTextContent();
          textContent += text.items.map(s => s.str).join(' ') + '\n';
        }
        fileContext = textContent;
        addMessageToChat(`✅ File "${file.name}" berhasil dimuat.`, 'ai');
      } catch (err) {
        console.error('PDF error:', err);
        addMessageToChat('❌ Gagal membaca PDF.', 'ai');
        clearFileContext();
      }
    };
    reader.readAsArrayBuffer(file);
  } catch (err) {
    console.error('Error PDF:', err);
    addMessageToChat('❌ Gagal memproses file PDF.', 'ai');
    clearFileContext();
  }
  event.target.value = '';
}
async function loadPDFLibrary() {
  return new Promise((resolve, reject) => {
    if (window.pdfjsLib) return resolve();
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.10.377/pdf.min.js';
    script.onload = () => {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc =
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.10.377/pdf.worker.min.js';
      resolve();
    };
    script.onerror = reject;
    document.head.appendChild(script);
  });
}
function clearFileContext() {
  fileContext = null;
  const fileInput = document.getElementById('file-input');
  if (fileInput) fileInput.value = '';
}

// =============================
// Utils
// =============================
/**
 * Format AI message dengan support untuk markdown table
 * @param {string} msg - Pesan dari AI
 * @returns {string} - HTML formatted message
 */
function formatAIMessage(msg) {
  // Check if message contains markdown table
  if (msg.includes('|') && msg.match(/\|.*\|.*\|/)) {
    return formatMarkdownTable(msg);
  }
  
  // Regular formatting for non-table messages
  return msg
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/\n/g, '<br>');
}

/**
 * Format markdown table ke HTML table yang rapi
 * @param {string} text - Text dengan markdown table
 * @returns {string} - HTML formatted text dengan table
 */
function formatMarkdownTable(text) {
  const lines = text.split('\n');
  let html = '';
  let inTable = false;
  let tableRows = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Detect table line (contains pipes)
    if (line.includes('|')) {
      // Skip separator line (contains dashes and colons)
      if (line.match(/^\|[\s:-]+\|/)) {
        continue;
      }
      
      if (!inTable) {
        inTable = true;
        tableRows = [];
      }
      
      // Parse table row
      const cells = line
        .split('|')
        .map(cell => cell.trim())
        .filter(cell => cell.length > 0);
      
      tableRows.push(cells);
    } else {
      // End of table or non-table line
      if (inTable) {
        // Render accumulated table
        html += renderHTMLTable(tableRows);
        tableRows = [];
        inTable = false;
      }
      
      // Add non-table line with regular formatting
      if (line.length > 0) {
        html += line
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          .replace(/\*(.*?)\*/g, '<em>$1</em>') + '<br>';
      } else {
        html += '<br>';
      }
    }
  }
  
  // Handle table at end of message
  if (inTable && tableRows.length > 0) {
    html += renderHTMLTable(tableRows);
  }
  
  return html;
}

/**
 * Render HTML table dari array of rows
 * @param {Array<Array<string>>} rows - Array of table rows
 * @returns {string} - HTML table
 */
function renderHTMLTable(rows) {
  if (rows.length === 0) return '';
  
  let html = '<div class="overflow-x-auto my-4">';
  html += '<table class="min-w-full border-collapse border border-gray-300 shadow-sm">';
  
  // Header row (first row)
  html += '<thead class="bg-gradient-to-r from-green-50 to-emerald-50">';
  html += '<tr>';
  rows[0].forEach(cell => {
    html += `<th class="border border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-700">${escapeHtml(cell)}</th>`;
  });
  html += '</tr>';
  html += '</thead>';
  
  // Body rows
  html += '<tbody>';
  for (let i = 1; i < rows.length; i++) {
    html += '<tr class="hover:bg-gray-50 transition-colors">';
    rows[i].forEach(cell => {
      html += `<td class="border border-gray-300 px-4 py-2 text-sm text-gray-800">${escapeHtml(cell)}</td>`;
    });
    html += '</tr>';
  }
  html += '</tbody>';
  
  html += '</table>';
  html += '</div>';
  
  return html;
}
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
// Track apakah user sedang scroll manual (untuk mencegah auto scroll yang mengganggu)
let isUserScrolling = false;
let scrollTimeout = null;

// Deteksi user scroll manual
function setupScrollDetection() {
  const chatContainer = document.getElementById('chat-messages');
  if (!chatContainer) return;
  
  chatContainer.addEventListener('scroll', () => {
    // Reset flag setelah user berhenti scroll
    isUserScrolling = true;
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
      isUserScrolling = false;
    }, 1000);
  });
}

// Cek apakah user sudah scroll ke bawah (dalam 100px dari bottom)
function isNearBottom(container) {
  const threshold = 100; // pixel dari bottom
  return container.scrollHeight - container.scrollTop - container.clientHeight < threshold;
}

function scrollToBottom(force = false) {
  const chatContainer = document.getElementById('chat-messages');
  if (!chatContainer) return;
  
  // Jika user sedang scroll manual dan tidak force, cek apakah sudah di bottom
  if (!force && isUserScrolling) {
    // Hanya auto scroll jika user sudah dekat dengan bottom
    if (!isNearBottom(chatContainer)) {
      return; // Jangan scroll jika user sedang melihat pesan lama
    }
  }
  
  // Scroll dengan smooth animation
  setTimeout(() => {
    chatContainer.scrollTo({ 
      top: chatContainer.scrollHeight, 
      behavior: 'smooth' 
    });
  }, 50);
  
  // Fallback untuk browser yang tidak support smooth scroll
  setTimeout(() => {
    chatContainer.scrollTop = chatContainer.scrollHeight;
  }, 300);
}

// =============================
// Reload on mode switch (exposed for test-logic.js)
// =============================
window.reloadChatHistoryOnSwitch = async function() {
  await reloadChatHistory();
};

// =============================
// Load chat from specific date (for history panel)
// =============================
export async function loadChatFromDate(dateString) {
  const chatContainer = document.getElementById('chat-messages');
  if (!chatContainer) {
    console.error('❌ Chat container not found');
    return false;
  }

  try {
    console.log(`📅 Loading chat from date: ${dateString}`);
    
    const { getChatHistoryByDate } = await import('./chat-firestore-service.js');
    const chats = await getChatHistoryByDate(dateString);
    
    if (chats.length === 0) {
      console.log('ℹ️ Tidak ada chat pada tanggal ini');
      if (window.showQuickNotification) {
        window.showQuickNotification('Tidak ada chat pada tanggal ini', 'info');
      }
      return false;
    }

    console.log(`📊 Loaded ${chats.length} chats from date ${dateString}`);

    // Clear container
    chatContainer.innerHTML = '';

    // Clear and rebuild chatHistory
    chatHistory = [];

    // Sort by time (terlama → terbaru) untuk memastikan urutan timeline benar
    chats.sort((a, b) => {
      const timeA = _timeValue(a);
      const timeB = _timeValue(b);
      return timeA - timeB; // Ascending (terlama dulu)
    });

    console.log('✅ Sorted chats by time (oldest first)');

    // Rebuild chatHistory untuk AI context (format Gemini API)
    // Format: { role: 'user'|'model', parts: [{ text: '...' }] }
    chatHistory = chats.map(c => {
      const message = c.message || '';
      return {
        role: c.role === 'user' ? 'user' : 'model',
        parts: [{ text: message }]
      };
    });

    console.log(`✅ Rebuilt chatHistory with ${chatHistory.length} messages for AI context`);

    // Render all messages ke UI dengan urutan yang benar
    chats.forEach((c) => {
      const role = (c.role === 'user') ? 'user' : 'ai';
      const text = c.message || '';
      const timestamp = _formatTimestampForBubble(c);
      addMessageToChat(text, role, false, timestamp);
    });

    scrollToBottom();
    
    console.log(`✅ Successfully loaded and rendered ${chats.length} messages from ${dateString}`);
    
    return true;
  } catch (err) {
    console.error('❌ Gagal load chat dari tanggal:', err);
    console.error('Error details:', err.message, err.stack);
    if (window.showQuickNotification) {
      window.showQuickNotification('Gagal memuat chat dari tanggal ini', 'error');
    }
    return false;
  }
}

// =============================
// Expose ke window
// =============================
window.setupChatListeners = setupChatListeners;
window.addMessageToChat = addMessageToChat;
window.handleChatInteraction = handleChatInteraction;
window.handleSendClick = handleSendClick;
window.loadChatFromDate = loadChatFromDate;
