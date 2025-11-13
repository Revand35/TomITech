// chat-history-panel.js - UI untuk menampilkan dan mengakses chat history
import { 
  getAllChatHistoryFromFirestore, 
  groupChatHistoryByDate
} from './chat-firestore-service.js';
import { loadChatFromDate as loadChatFromDateLogic } from './chat-logic.js';

let isHistoryPanelOpen = false;
let groupedHistory = {};

// Inisialisasi history panel
export function initChatHistoryPanel() {
  const historyBtn = document.getElementById('chat-history-btn');
  const historyPanel = document.getElementById('chat-history-panel');
  const historyCloseBtn = document.getElementById('chat-history-close');
  const historyOverlay = document.getElementById('chat-history-overlay');
  
  if (historyBtn) {
    historyBtn.addEventListener('click', toggleHistoryPanel);
  }
  
  if (historyCloseBtn) {
    historyCloseBtn.addEventListener('click', closeHistoryPanel);
  }
  
  if (historyOverlay) {
    historyOverlay.addEventListener('click', closeHistoryPanel);
  }
  
  // Load history saat pertama kali dibuka
  if (historyPanel) {
    historyPanel.addEventListener('click', (e) => {
      // Handle click pada date group
      if (e.target.classList.contains('history-date-group')) {
        const dateKey = e.target.dataset.dateKey;
        if (dateKey) {
          loadChatFromDate(dateKey);
        }
      }
    });
  }
}

// Toggle history panel
export async function toggleHistoryPanel() {
  if (isHistoryPanelOpen) {
    closeHistoryPanel();
  } else {
    await openHistoryPanel();
  }
}

// Buka history panel
async function openHistoryPanel() {
  const panel = document.getElementById('chat-history-panel');
  const overlay = document.getElementById('chat-history-overlay');
  
  if (!panel || !overlay) return;
  
  isHistoryPanelOpen = true;
  panel.classList.add('active');
  overlay.classList.add('active');
  
  // Load history
  await loadChatHistory();
}

// Tutup history panel
function closeHistoryPanel() {
  const panel = document.getElementById('chat-history-panel');
  const overlay = document.getElementById('chat-history-overlay');
  
  if (!panel || !overlay) return;
  
  isHistoryPanelOpen = false;
  panel.classList.remove('active');
  overlay.classList.remove('active');
}

// Load dan tampilkan chat history
async function loadChatHistory() {
  const historyContent = document.getElementById('chat-history-content');
  if (!historyContent) {
    console.error('❌ History content element not found');
    return;
  }
  
  console.log('📖 Loading chat history...');
  
  // Show loading
  historyContent.innerHTML = '<div class="history-loading"><i class="fas fa-spinner fa-spin"></i> Memuat history...</div>';
  
  try {
    console.log('📡 Fetching chat history from Firestore...');
    const allChats = await getAllChatHistoryFromFirestore();
    console.log('📊 Received chats:', allChats.length);
    
    if (allChats.length === 0) {
      console.log('ℹ️ No chat history found');
      historyContent.innerHTML = `
        <div class="history-empty">
          <i class="fas fa-comments"></i>
          <p>Belum ada riwayat chat</p>
          <span>Mulai percakapan dengan AI untuk melihat history di sini</span>
        </div>
      `;
      return;
    }
    
    // Group by date
    console.log('📅 Grouping chats by date...');
    groupedHistory = groupChatHistoryByDate(allChats);
    console.log('✅ Grouped into', Object.keys(groupedHistory).length, 'date groups');
    
    // Render history
    renderHistoryList(groupedHistory);
    console.log('✅ Chat history rendered');
    
  } catch (error) {
    console.error('❌ Error loading chat history:', error);
    console.error('Error details:', error.message, error.stack);
    historyContent.innerHTML = `
      <div class="history-error">
        <i class="fas fa-exclamation-triangle"></i>
        <p>Gagal memuat history</p>
        <p style="font-size: 0.75rem; color: #6b7280; margin-top: 8px;">${error.message || 'Unknown error'}</p>
        <button onclick="location.reload()" class="retry-btn">Coba Lagi</button>
      </div>
    `;
  }
}

// Render history list
function renderHistoryList(grouped) {
  const historyContent = document.getElementById('chat-history-content');
  if (!historyContent) return;
  
  const dateKeys = Object.keys(grouped).sort((a, b) => b.localeCompare(a)); // Terbaru dulu
  
  if (dateKeys.length === 0) {
    historyContent.innerHTML = `
      <div class="history-empty">
        <i class="fas fa-comments"></i>
        <p>Belum ada riwayat chat</p>
        <span>Mulai percakapan dengan AI untuk melihat history di sini</span>
      </div>
    `;
    return;
  }
  
  // Hitung total chats
  const totalChats = dateKeys.reduce((sum, key) => sum + grouped[key].chats.length, 0);
  console.log(`📊 Rendering ${dateKeys.length} date groups with ${totalChats} total chats`);
  
  let html = '<div class="history-list">';
  
  dateKeys.forEach((dateKey, index) => {
    const group = grouped[dateKey];
    const chatCount = group.chats.length;
    const preview = getChatPreview(group.chats);
    
    // Hitung jumlah user messages dan AI messages
    const userMessages = group.chats.filter(c => c.role === 'user').length;
    const aiMessages = group.chats.filter(c => c.role === 'ai').length;
    
    html += `
      <div class="history-date-group" data-date-key="${dateKey}" style="animation-delay: ${index * 0.05}s;">
        <div class="history-date-header">
          <div class="history-date-title">
            <i class="fas fa-calendar-day"></i>
            <span>${group.displayDate}</span>
          </div>
          <div class="history-date-count">${chatCount} pesan</div>
        </div>
        <div class="history-date-preview">
          ${preview}
        </div>
        <div class="history-date-stats" style="font-size: 0.75rem; color: #6b7280; margin-top: 8px; display: flex; gap: 12px;">
          <span><i class="fas fa-user"></i> ${userMessages} dari Anda</span>
          <span><i class="fas fa-robot"></i> ${aiMessages} dari AI</span>
        </div>
        <div class="history-date-action">
          <i class="fas fa-arrow-right"></i>
          <span>Lihat & Lanjutkan Chat</span>
        </div>
      </div>
    `;
  });
  
  html += '</div>';
  historyContent.innerHTML = html;
  
  // Add click handlers untuk setiap date group
  const dateGroups = historyContent.querySelectorAll('.history-date-group');
  dateGroups.forEach(group => {
    group.addEventListener('click', (e) => {
      // Prevent multiple clicks
      if (group.classList.contains('loading')) return;
      
      const dateKey = group.dataset.dateKey;
      if (dateKey) {
        group.classList.add('loading');
        loadChatFromDate(dateKey);
      }
    });
  });
  
  console.log(`✅ Rendered ${dateKeys.length} date groups`);
}

// Get preview dari chat (first user message dan first AI response)
function getChatPreview(chats) {
  if (chats.length === 0) return '';
  
  const userChat = chats.find(c => c.role === 'user');
  const aiChat = chats.find(c => c.role === 'ai');
  
  let preview = '';
  
  if (userChat) {
    const userText = userChat.message || '';
    const truncated = userText.length > 60 ? userText.substring(0, 60) + '...' : userText;
    preview += `<div class="preview-user"><strong>Anda:</strong> ${escapeHtml(truncated)}</div>`;
  }
  
  if (aiChat) {
    const aiText = aiChat.message || '';
    const truncated = aiText.length > 80 ? aiText.substring(0, 80) + '...' : aiText;
    preview += `<div class="preview-ai"><strong>AI:</strong> ${escapeHtml(truncated)}</div>`;
  }
  
  return preview || '<div class="preview-empty">Tidak ada preview</div>';
}

// Load chat dari tanggal tertentu
async function loadChatFromDate(dateKey) {
  try {
    console.log(`🔄 Loading chat from date: ${dateKey}`);
    
    // Show loading state
    const dateGroup = document.querySelector(`[data-date-key="${dateKey}"]`);
    if (dateGroup) {
      dateGroup.classList.add('loading');
      const actionText = dateGroup.querySelector('.history-date-action span');
      if (actionText) {
        actionText.textContent = 'Memuat...';
      }
    }
    
    const success = await loadChatFromDateLogic(dateKey);
    
    // Remove loading state
    if (dateGroup) {
      dateGroup.classList.remove('loading');
      const actionText = dateGroup.querySelector('.history-date-action span');
      if (actionText) {
        actionText.textContent = 'Lihat & Lanjutkan Chat';
      }
    }
    
    if (!success) {
      if (window.showQuickNotification) {
        window.showQuickNotification('Tidak ada chat pada tanggal ini', 'info');
      }
      return;
    }
    
    // Close history panel
    closeHistoryPanel();
    
    // Show notification
    const displayDate = groupedHistory[dateKey]?.displayDate || dateKey;
    if (window.showQuickNotification) {
      window.showQuickNotification(`Chat dari ${displayDate} dimuat. Anda bisa melanjutkan percakapan!`, 'success');
    }
    
    console.log(`✅ Successfully loaded chat from ${dateKey}`);
    
  } catch (error) {
    console.error('❌ Error loading chat from date:', error);
    console.error('Error details:', error.message, error.stack);
    
    // Remove loading state
    const dateGroup = document.querySelector(`[data-date-key="${dateKey}"]`);
    if (dateGroup) {
      dateGroup.classList.remove('loading');
      const actionText = dateGroup.querySelector('.history-date-action span');
      if (actionText) {
        actionText.textContent = 'Lihat & Lanjutkan Chat';
      }
    }
    
    if (window.showQuickNotification) {
      window.showQuickNotification('Gagal memuat chat dari tanggal ini', 'error');
    }
  }
}

// Escape HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Export untuk global access
window.toggleChatHistoryPanel = toggleHistoryPanel;
window.loadChatFromDate = loadChatFromDate;

