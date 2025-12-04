// reports-utils.js - Utility functions untuk reports page
import { db, auth } from '../../../config/firebase-init.js';
import { doc, deleteDoc, getDoc } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { formatRelativeTime } from './reports-service.js';

/**
 * Tampilkan detail report dalam modal
 */
export function showReportDetail(report) {
  // Buat modal element
  const modal = document.createElement('div');
  modal.id = 'report-detail-modal';
  modal.className = 'report-modal';
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: var(--spacing-md);
    animation: fadeIn 0.2s ease;
  `;

  const metrics = report.metrics || {};
  const timeAgo = formatRelativeTime(report.timestamp || report.createdAt);
  
  // Format timestamp untuk display
  let formattedDate = 'Tidak diketahui';
  try {
    const timestamp = report.timestamp || report.createdAt;
    if (timestamp) {
      let date;
      if (timestamp.toDate) {
        date = timestamp.toDate();
      } else if (timestamp instanceof Date) {
        date = timestamp;
      } else if (typeof timestamp === 'string') {
        date = new Date(timestamp);
      }
      if (date) {
        formattedDate = date.toLocaleDateString('id-ID', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      }
    }
  } catch (err) {
    console.warn('Error formatting date:', err);
  }

  modal.innerHTML = `
    <div class="report-modal-content" style="
      background: var(--bg-card);
      border-radius: var(--radius-lg);
      max-width: 600px;
      width: 100%;
      max-height: 90vh;
      overflow-y: auto;
      padding: var(--spacing-lg);
      box-shadow: var(--shadow-xl);
      animation: slideUp 0.3s ease;
    ">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--spacing-lg);">
        <h2 style="font-size: 1.5rem; font-weight: 700; color: var(--text-primary); font-family: 'Poppins', sans-serif;">
          Detail Laporan
        </h2>
        <button id="close-report-modal" style="
          background: none;
          border: none;
          font-size: 1.5rem;
          color: var(--text-secondary);
          cursor: pointer;
          padding: 4px 8px;
          border-radius: var(--radius-sm);
          transition: all 0.2s;
        " onmouseover="this.style.background='var(--bg-hover)'; this.style.color='var(--text-primary)'"
           onmouseout="this.style.background='none'; this.style.color='var(--text-secondary)'">
          <i class="fas fa-times"></i>
        </button>
      </div>

      <div class="report-detail-section" style="margin-bottom: var(--spacing-lg);">
        <div style="display: flex; align-items: center; gap: var(--spacing-md); margin-bottom: var(--spacing-md);">
          <div class="report-card-icon ${report.iconColor || 'green'}" style="width: 56px; height: 56px;">
            <i class="fas ${report.icon === 'chart-line' ? 'fa-chart-line' : 'fa-industry'}"></i>
          </div>
          <div>
            <h3 style="font-size: 1.25rem; font-weight: 600; color: var(--text-primary); margin-bottom: 4px;">
              ${escapeHtml(report.title || 'Greenhouse')}
            </h3>
            <p style="font-size: 0.875rem; color: var(--text-secondary);">
              ${escapeHtml(report.subtitle || 'Laporan Data Greenhouse')}
            </p>
          </div>
        </div>

        <div style="display: flex; gap: var(--spacing-md); flex-wrap: wrap; margin-bottom: var(--spacing-md);">
          <div style="
            padding: var(--spacing-xs) var(--spacing-md);
            background: var(--tomitech-green-muted);
            border-radius: var(--radius-full);
            font-size: 0.75rem;
            font-weight: 500;
            color: var(--tomitech-green-accent);
          ">
            ${report.category || 'Tanaman'}
          </div>
          <div style="
            padding: var(--spacing-xs) var(--spacing-md);
            background: var(--bg-hover);
            border-radius: var(--radius-full);
            font-size: 0.75rem;
            color: var(--text-secondary);
          ">
            <i class="fas fa-clock"></i> ${timeAgo}
          </div>
        </div>

        <div style="
          padding: var(--spacing-md);
          background: var(--bg-hover);
          border-radius: var(--radius-md);
          margin-bottom: var(--spacing-md);
        ">
          <p style="font-size: 0.875rem; color: var(--text-secondary); margin-bottom: 4px;">Tanggal Laporan</p>
          <p style="font-size: 1rem; font-weight: 500; color: var(--text-primary);">${formattedDate}</p>
        </div>
      </div>

      <div class="report-detail-metrics" style="margin-bottom: var(--spacing-lg);">
        <h4 style="font-size: 1rem; font-weight: 600; color: var(--text-primary); margin-bottom: var(--spacing-md);">
          Metrik Utama
        </h4>
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--spacing-md);">
          ${createMetricCard('Tanaman Aktif', metrics.activePlants || metrics.totalPlants || '--', 'green')}
          ${createMetricCard('Nilai Ekonomi', metrics.economicValue || 'Rp 0', 'blue')}
          ${createMetricCard('Eco-Score', metrics.ecoScore || '--', 'purple')}
        </div>
      </div>

      ${report.type === 'summary' && metrics.summary ? `
        <div class="report-detail-summary" style="margin-bottom: var(--spacing-lg);">
          <h4 style="font-size: 1rem; font-weight: 600; color: var(--text-primary); margin-bottom: var(--spacing-md);">
            Ringkasan Analisis
          </h4>
          <div style="
            padding: var(--spacing-md);
            background: var(--bg-hover);
            border-radius: var(--radius-md);
            border-left: 4px solid var(--tomitech-green-accent);
          ">
            <p style="font-size: 0.875rem; color: var(--text-primary); line-height: 1.6; white-space: pre-wrap;">
              ${escapeHtml(metrics.summary)}
            </p>
          </div>
        </div>
      ` : ''}

      ${report.type === 'summary' && metrics.recommendations && metrics.recommendations.length > 0 ? `
        <div class="report-detail-recommendations" style="margin-bottom: var(--spacing-lg);">
          <h4 style="font-size: 1rem; font-weight: 600; color: var(--text-primary); margin-bottom: var(--spacing-md);">
            Rekomendasi
          </h4>
          <ul style="list-style: none; padding: 0;">
            ${metrics.recommendations.map((rec, idx) => `
              <li style="
                padding: var(--spacing-sm) var(--spacing-md);
                margin-bottom: var(--spacing-xs);
                background: var(--bg-hover);
                border-radius: var(--radius-md);
                border-left: 4px solid var(--tomitech-green-accent);
                font-size: 0.875rem;
                color: var(--text-primary);
              ">
                <i class="fas fa-check-circle" style="color: var(--tomitech-green-accent); margin-right: 8px;"></i>
                ${escapeHtml(rec)}
              </li>
            `).join('')}
          </ul>
        </div>
      ` : ''}

      <div class="report-detail-actions" style="
        display: flex;
        gap: var(--spacing-md);
        padding-top: var(--spacing-md);
        border-top: 1px solid var(--tomitech-green-muted);
      ">
        <button id="export-pdf-btn" data-report-id="${report.id}" data-report-type="${report.type}" style="
          flex: 1;
          padding: var(--spacing-sm) var(--spacing-md);
          background: var(--tomitech-green-accent);
          color: white;
          border: none;
          border-radius: var(--radius-md);
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        " onmouseover="this.style.opacity='0.9'; this.style.transform='translateY(-2px)'"
           onmouseout="this.style.opacity='1'; this.style.transform='translateY(0)'">
          <i class="fas fa-download"></i> Export PDF
        </button>
        <button id="share-report-btn" data-report-id="${report.id}" data-report-type="${report.type}" style="
          flex: 1;
          padding: var(--spacing-sm) var(--spacing-md);
          background: var(--bg-hover);
          color: var(--text-primary);
          border: 1px solid var(--tomitech-green-muted);
          border-radius: var(--radius-md);
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        " onmouseover="this.style.background='var(--tomitech-green-muted)'"
           onmouseout="this.style.background='var(--bg-hover)'">
          <i class="fas fa-share-alt"></i> Share
        </button>
      </div>
    </div>
  `;

  // Add styles
  if (!document.getElementById('report-modal-styles')) {
    const style = document.createElement('style');
    style.id = 'report-modal-styles';
    style.textContent = `
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes slideUp {
        from { transform: translateY(20px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }
    `;
    document.head.appendChild(style);
  }

  document.body.appendChild(modal);

  // Close button handler
  const closeBtn = document.getElementById('close-report-modal');
  closeBtn.addEventListener('click', () => {
    modal.remove();
  });

  // Close on backdrop click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  });

  // Close on ESC key
  const escHandler = (e) => {
    if (e.key === 'Escape') {
      modal.remove();
      document.removeEventListener('keydown', escHandler);
    }
  };
  document.addEventListener('keydown', escHandler);

  // Setup button handlers dengan report data
  const exportBtn = document.getElementById('export-pdf-btn');
  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      exportReportToPDF(report);
    });
  }

  const shareBtn = document.getElementById('share-report-btn');
  if (shareBtn) {
    shareBtn.addEventListener('click', () => {
      shareReport(report);
    });
  }
}

/**
 * Buat metric card untuk detail modal
 */
function createMetricCard(label, value, color) {
  const colorMap = {
    green: 'var(--tomitech-green-accent)',
    blue: 'var(--blue)',
    purple: 'var(--purple)'
  };
  
  return `
    <div style="
      padding: var(--spacing-md);
      background: var(--bg-hover);
      border-radius: var(--radius-md);
      text-align: center;
      border-top: 3px solid ${colorMap[color] || colorMap.green};
    ">
      <div style="
        font-size: 1.5rem;
        font-weight: 700;
        color: ${colorMap[color] || colorMap.green};
        margin-bottom: 4px;
      ">${value}</div>
      <div style="
        font-size: 0.75rem;
        color: var(--text-secondary);
      ">${label}</div>
    </div>
  `;
}

/**
 * Export report ke PDF
 */
export async function exportReportToPDF(report) {
  try {
    // Check if jsPDF is available
    if (!window.jspdf) {
      // Load jsPDF dynamically
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
      document.head.appendChild(script);
      
      await new Promise((resolve, reject) => {
        script.onload = resolve;
        script.onerror = reject;
        setTimeout(reject, 10000); // Timeout after 10s
      });
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    const metrics = report.metrics || {};
    const timeAgo = formatRelativeTime(report.timestamp || report.createdAt);
    
    // Format date
    let formattedDate = 'Tidak diketahui';
    try {
      const timestamp = report.timestamp || report.createdAt;
      if (timestamp) {
        let date;
        if (timestamp.toDate) {
          date = timestamp.toDate();
        } else if (timestamp instanceof Date) {
          date = timestamp;
        } else if (typeof timestamp === 'string') {
          date = new Date(timestamp);
        }
        if (date) {
          formattedDate = date.toLocaleDateString('id-ID', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          });
        }
      }
    } catch (err) {
      console.warn('Error formatting date:', err);
    }

    // Header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(44, 77, 50); // TOMITECH green
    doc.text('Laporan Greenhouse', 105, 20, { align: 'center' });

    // Report Info
    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text(`Nama Greenhouse: ${report.title || 'Greenhouse'}`, 20, 35);
    doc.text(`Kategori: ${report.category || 'Tanaman'}`, 20, 42);
    doc.text(`Tanggal: ${formattedDate}`, 20, 49);
    doc.text(`Waktu: ${timeAgo}`, 20, 56);

    // Metrics
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text('Metrik Utama', 20, 70);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    let yPos = 80;
    doc.text(`Tanaman Aktif: ${metrics.activePlants || metrics.totalPlants || '--'}`, 20, yPos);
    yPos += 8;
    doc.text(`Nilai Ekonomi: ${metrics.economicValue || 'Rp 0'}`, 20, yPos);
    yPos += 8;
    doc.text(`Eco-Score: ${metrics.ecoScore || '--'}`, 20, yPos);

    // Summary (if available)
    if (report.type === 'summary' && metrics.summary) {
      yPos += 15;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text('Ringkasan Analisis', 20, yPos);
      
      yPos += 10;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      const summaryLines = doc.splitTextToSize(metrics.summary, 170);
      doc.text(summaryLines, 20, yPos);
      yPos += summaryLines.length * 6;
    }

    // Recommendations (if available)
    if (report.type === 'summary' && metrics.recommendations && metrics.recommendations.length > 0) {
      yPos += 10;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text('Rekomendasi', 20, yPos);
      
      yPos += 10;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      metrics.recommendations.forEach((rec, idx) => {
        if (yPos > 270) {
          doc.addPage();
          yPos = 20;
        }
        doc.text(`${idx + 1}. ${rec}`, 20, yPos);
        yPos += 8;
      });
    }

    // Footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text(
        `Halaman ${i} dari ${pageCount} | Generated by AgriHouse`,
        105,
        290,
        { align: 'center' }
      );
    }

    // Save PDF
    const fileName = `Laporan_${(report.title || 'Greenhouse').replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.pdf`;
    doc.save(fileName);

    console.log('✅ Report exported to PDF');
  } catch (error) {
    console.error('❌ Error exporting report to PDF:', error);
    alert('Gagal membuat PDF. Pastikan koneksi internet stabil untuk memuat library PDF.');
  }
}

/**
 * Share report
 */
export async function shareReport(report) {
  try {
    const shareData = {
      title: `Laporan Greenhouse: ${report.title || 'Greenhouse'}`,
      text: `${report.subtitle || 'Laporan Data Greenhouse'}\n\nKategori: ${report.category || 'Tanaman'}\nWaktu: ${formatRelativeTime(report.timestamp || report.createdAt)}`,
      url: window.location.href
    };

    if (navigator.share) {
      await navigator.share(shareData);
      console.log('✅ Report shared successfully');
    } else {
      // Fallback: copy to clipboard
      const textToCopy = `${shareData.title}\n${shareData.text}\n${shareData.url}`;
      await navigator.clipboard.writeText(textToCopy);
      alert('Link laporan telah disalin ke clipboard!');
    }
  } catch (error) {
    if (error.name !== 'AbortError') {
      console.error('❌ Error sharing report:', error);
      // Fallback: copy to clipboard
      try {
        const textToCopy = `Laporan Greenhouse: ${report.title || 'Greenhouse'}\n${report.subtitle || 'Laporan Data Greenhouse'}\n${window.location.href}`;
        await navigator.clipboard.writeText(textToCopy);
        alert('Link laporan telah disalin ke clipboard!');
      } catch (clipboardError) {
        alert('Gagal membagikan laporan. Silakan salin link secara manual.');
      }
    }
  }
}

/**
 * Delete report
 */
export async function deleteReport(reportId, reportType) {
  if (!confirm('Apakah Anda yakin ingin menghapus laporan ini?')) {
    return false;
  }

  try {
    const user = auth.currentUser;
    if (!user) {
      alert('Anda harus login untuk menghapus laporan');
      return false;
    }

    // Determine collection based on report type
    const collectionName = reportType === 'aggregate' ? 'aggregate_data' : 'ai_summaries';
    
    // Delete from Firestore
    await deleteDoc(doc(db, collectionName, reportId));
    
    console.log('✅ Report deleted successfully');
    return true;
  } catch (error) {
    console.error('❌ Error deleting report:', error);
    alert('Gagal menghapus laporan: ' + error.message);
    return false;
  }
}

/**
 * Sort reports
 */
export function sortReports(reports, sortBy = 'date', order = 'desc') {
  const sorted = [...reports];
  
  sorted.sort((a, b) => {
    let valueA, valueB;
    
    if (sortBy === 'date') {
      const getTime = (report) => {
        const timestamp = report.timestamp || report.createdAt;
        if (!timestamp) return 0;
        if (timestamp.toDate) return timestamp.toDate().getTime();
        if (timestamp instanceof Date) return timestamp.getTime();
        if (typeof timestamp === 'string') return new Date(timestamp).getTime();
        return 0;
      };
      valueA = getTime(a);
      valueB = getTime(b);
    } else if (sortBy === 'title') {
      valueA = (a.title || '').toLowerCase();
      valueB = (b.title || '').toLowerCase();
    } else if (sortBy === 'category') {
      valueA = (a.category || '').toLowerCase();
      valueB = (b.category || '').toLowerCase();
    } else {
      return 0;
    }
    
    if (order === 'asc') {
      return valueA > valueB ? 1 : valueA < valueB ? -1 : 0;
    } else {
      return valueA < valueB ? 1 : valueA > valueB ? -1 : 0;
    }
  });
  
  return sorted;
}

/**
 * Escape HTML untuk prevent XSS
 */
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Export functions to window untuk akses global
// Note: Fungsi-fungsi ini akan digunakan melalui event listeners, bukan inline onclick
if (typeof window !== 'undefined') {
  window.exportReportToPDF = exportReportToPDF;
  window.shareReport = shareReport;
  window.deleteReport = deleteReport;
  window.showReportDetail = showReportDetail;
}

