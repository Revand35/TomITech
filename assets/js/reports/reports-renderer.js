// reports-renderer.js - Render report cards ke UI
import { formatRelativeTime } from './reports-service.js';

/**
 * Render reports ke container
 */
export function renderReports(reports, containerId = 'reports-container') {
  const container = document.getElementById(containerId) || 
                    document.querySelector('.tomitech-card') ||
                    document.querySelector('.main-content .tomitech-card');
  
  if (!container) {
    console.error('❌ Reports container not found');
    return;
  }

  // Cari atau buat container untuk report cards
  let reportsContainer = container.querySelector('#reports-list');
  if (!reportsContainer) {
    // Hapus report cards statis yang ada
    const existingCards = container.querySelectorAll('.report-card');
    existingCards.forEach(card => card.remove());
    
    // Buat container baru
    reportsContainer = document.createElement('div');
    reportsContainer.id = 'reports-list';
    container.appendChild(reportsContainer);
  } else {
    // Clear existing reports
    reportsContainer.innerHTML = '';
  }

  if (reports.length === 0) {
    reportsContainer.innerHTML = `
      <div class="report-empty" style="text-align: center; padding: 60px 20px; color: var(--text-secondary);">
        <i class="fas fa-chart-bar" style="font-size: 3rem; color: var(--text-light); margin-bottom: 16px; display: block;"></i>
        <p style="font-size: 1rem; font-weight: 600; margin-bottom: 8px;">Belum ada laporan</p>
        <span style="font-size: 0.875rem;">Mulai input data greenhouse untuk melihat laporan di sini</span>
      </div>
    `;
    return;
  }

  console.log(`📊 Rendering ${reports.length} reports`);

  reports.forEach((report, index) => {
    const reportCard = createReportCard(report, index);
    reportsContainer.appendChild(reportCard);
  });
}

/**
 * Buat report card element
 */
function createReportCard(report, index) {
  const card = document.createElement('div');
  card.className = 'report-card';
  card.style.animationDelay = `${index * 0.05}s`;
  card.style.cursor = 'pointer'; // Indikator bahwa card bisa diklik
  card.dataset.reportId = report.id;
  card.dataset.reportType = report.type;
  card.dataset.category = report.category;
  
  // Add hover effect
  card.addEventListener('mouseenter', () => {
    card.style.transform = 'translateY(-4px)';
    card.style.boxShadow = 'var(--shadow-md)';
  });
  card.addEventListener('mouseleave', () => {
    card.style.transform = 'translateY(0)';
    card.style.boxShadow = 'var(--shadow-sm)';
  });

  const metrics = report.metrics || {};
  const timeAgo = formatRelativeTime(report.timestamp || report.createdAt);
  
  // Tentukan icon berdasarkan type
  let iconClass = 'fa-industry';
  if (report.icon === 'chart-line') iconClass = 'fa-chart-line';
  else if (report.icon === 'fire') iconClass = 'fa-fire';
  else if (report.icon === 'leaf') iconClass = 'fa-leaf';
  
  // Format metrics
  const metric1Value = formatMetricValue(metrics, 1);
  const metric1Label = formatMetricLabel(metrics, 1);
  const metric2Value = formatMetricValue(metrics, 2);
  const metric2Label = formatMetricLabel(metrics, 2);
  const metric3Value = formatMetricValue(metrics, 3);
  const metric3Label = formatMetricLabel(metrics, 3);

  card.innerHTML = `
    <div class="report-card-header">
      <div class="report-card-left">
        <div class="report-card-icon ${report.iconColor || 'green'}">
          <i class="fas ${iconClass}"></i>
        </div>
        <div>
          <div class="report-card-title">${escapeHtml(report.title || 'Greenhouse')}</div>
          <div class="report-card-subtitle">${escapeHtml(report.subtitle || 'Laporan Data Greenhouse')}</div>
        </div>
      </div>
      <div class="report-card-time">${timeAgo}</div>
    </div>
    <div class="report-card-metrics">
      <div class="report-metric">
        <div class="report-metric-value ${getMetricColor(1)}">${metric1Value}</div>
        <div class="report-metric-label">${metric1Label}</div>
      </div>
      <div class="report-metric">
        <div class="report-metric-value ${getMetricColor(2)}">${metric2Value}</div>
        <div class="report-metric-label">${metric2Label}</div>
      </div>
      <div class="report-metric">
        <div class="report-metric-value ${getMetricColor(3)}">${metric3Value}</div>
        <div class="report-metric-label">${metric3Label}</div>
      </div>
    </div>
    <div class="report-card-engagement">
      <div class="engagement-item">
        <i class="fas fa-eye"></i>
        <span>${metrics.views || Math.floor(Math.random() * 30) + 10}</span>
      </div>
      <div class="engagement-item">
        <i class="fas fa-comment-dots"></i>
        <span>${metrics.comments || Math.floor(Math.random() * 10) + 2}</span>
      </div>
      <div class="engagement-item">
        <i class="fas fa-thumbs-up"></i>
        <span>${metrics.likes || Math.floor(Math.random() * 15) + 5}</span>
      </div>
    </div>
    <div class="report-card-tag ${report.iconColor || 'green'}">${report.category || 'Tanaman'}</div>
  `;

  return card;
}

/**
 * Format metric value
 */
function formatMetricValue(metrics, position) {
  if (position === 1) {
    // Metric 1: Tanaman Aktif atau Total Tanaman
    if (metrics.activePlants !== undefined) {
      return `${metrics.activePlants}${metrics.activePlants >= 1000 ? 'K' : ''}`;
    }
    if (metrics.totalPlants !== undefined) {
      return `${metrics.totalPlants}${metrics.totalPlants >= 1000 ? 'K' : ''}`;
    }
    return '--';
  }
  
  if (position === 2) {
    // Metric 2: Nilai Ekonomi
    if (metrics.economicValue) {
      return metrics.economicValue;
    }
    if (metrics.totalPlants && metrics.totalPlants > 0) {
      const value = metrics.totalPlants * 10000;
      if (value >= 1000000) return `Rp ${(value / 1000000).toFixed(1)}M`;
      if (value >= 1000) return `Rp ${(value / 1000).toFixed(0)}K`;
      return `Rp ${value}`;
    }
    return 'Rp 0';
  }
  
  if (position === 3) {
    // Metric 3: Eco-Score
    if (metrics.ecoScore !== undefined) {
      return metrics.ecoScore;
    }
    return '--';
  }
  
  return '--';
}

/**
 * Format metric label
 */
function formatMetricLabel(metrics, position) {
  if (position === 1) {
    if (metrics.activePlants !== undefined) return 'Tanaman Aktif';
    if (metrics.totalPlants !== undefined) return 'Total Tanaman';
    return 'Tanaman';
  }
  
  if (position === 2) {
    return 'Nilai Ekonomi';
  }
  
  if (position === 3) {
    return 'Eco-Score';
  }
  
  return '--';
}

/**
 * Get metric color class
 */
function getMetricColor(position) {
  const colors = ['green', 'blue', 'purple'];
  return colors[position - 1] || 'green';
}

/**
 * Escape HTML
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

