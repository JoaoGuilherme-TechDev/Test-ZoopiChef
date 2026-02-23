import JSZip from 'jszip';

export interface ExportColumn {
  key: string;
  label: string;
  format?: (value: unknown) => string;
}

export interface ExportOptions {
  filename: string;
  columns: ExportColumn[];
  data: Record<string, unknown>[];
  title?: string;
}

/**
 * Formats a value for CSV export (handles commas, quotes, newlines)
 */
function formatCSVValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  // Escape quotes and wrap in quotes if contains comma, quote, or newline
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Exports data to CSV format and triggers download
 */
export function exportToCSV(options: ExportOptions): void {
  const { filename, columns, data, title } = options;

  // Build CSV content
  const lines: string[] = [];

  // Add title row if provided
  if (title) {
    lines.push(title);
    lines.push(''); // Empty line after title
  }

  // Header row
  lines.push(columns.map(col => formatCSVValue(col.label)).join(','));

  // Data rows
  data.forEach(row => {
    const values = columns.map(col => {
      const rawValue = row[col.key];
      const formattedValue = col.format ? col.format(rawValue) : rawValue;
      return formatCSVValue(formattedValue);
    });
    lines.push(values.join(','));
  });

  const csvContent = lines.join('\n');
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  
  downloadBlob(blob, `${filename}.csv`);
}

/**
 * Exports data to Excel-compatible format (actually CSV with .xls extension for compatibility)
 * For a true .xlsx, you'd need a library like SheetJS
 */
export function exportToExcel(options: ExportOptions): void {
  const { filename, columns, data, title } = options;

  // Build tab-separated content (Excel-friendly)
  const lines: string[] = [];

  // Add title if provided
  if (title) {
    lines.push(title);
    lines.push('');
  }

  // Header
  lines.push(columns.map(col => col.label).join('\t'));

  // Data
  data.forEach(row => {
    const values = columns.map(col => {
      const rawValue = row[col.key];
      const formattedValue = col.format ? col.format(rawValue) : rawValue;
      return String(formattedValue ?? '').replace(/\t/g, ' ');
    });
    lines.push(values.join('\t'));
  });

  const content = lines.join('\n');
  const blob = new Blob(['\ufeff' + content], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  
  downloadBlob(blob, `${filename}.xls`);
}

/**
 * Generates a simple PDF-like document using HTML that can be printed
 */
export function exportToPDF(options: ExportOptions): void {
  const { filename, columns, data, title } = options;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${title || filename}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        .header { display: flex; align-items: center; gap: 16px; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 2px solid #3b82f6; }
        .logo { height: 50px; width: auto; }
        .header-title { font-size: 18px; font-weight: bold; color: #1e3a8a; }
        h1 { font-size: 16px; margin-bottom: 15px; color: #333; }
        table { width: 100%; border-collapse: collapse; font-size: 12px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #3b82f6; color: white; font-weight: bold; }
        tr:nth-child(even) { background-color: #f0f7ff; }
        .footer { margin-top: 20px; padding-top: 15px; border-top: 1px solid #ddd; font-size: 10px; color: #666; display: flex; justify-content: space-between; align-items: center; }
        .footer-logo { height: 30px; opacity: 0.7; }
        .footer-text { text-align: right; }
        @media print {
          body { padding: 0; }
          @page { margin: 1cm; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <img src="/zoopi-logo.png" alt="Zoopi" class="logo" onerror="this.style.display='none'" />
        <div class="header-title">Zoopi Tecnologia - Soluções Inteligentes</div>
      </div>
      <h1>${title || filename}</h1>
      <table>
        <thead>
          <tr>
            ${columns.map(col => `<th>${col.label}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${data.map(row => `
            <tr>
              ${columns.map(col => {
                const rawValue = row[col.key];
                const formattedValue = col.format ? col.format(rawValue) : rawValue;
                return `<td>${formattedValue ?? ''}</td>`;
              }).join('')}
            </tr>
          `).join('')}
        </tbody>
      </table>
      <div class="footer">
        <img src="/zoopi-logo.png" alt="Zoopi" class="footer-logo" onerror="this.style.display='none'" />
        <div class="footer-text">
          <div>Gerado em ${new Date().toLocaleString('pt-BR')}</div>
          <div>www.zoopi.app.br | (16) 98258.6199</div>
        </div>
      </div>
    </body>
    </html>
  `;

  // Open in new window for printing
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
    };
  }
}

/**
 * Helper to trigger file download
 */
function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Format currency for export
 */
export function formatCurrencyExport(value: unknown): string {
  const num = typeof value === 'number' ? value : parseFloat(String(value)) || 0;
  return `R$ ${num.toFixed(2).replace('.', ',')}`;
}

/**
 * Format date for export
 */
export function formatDateExport(value: unknown): string {
  if (!value) return '';
  const date = new Date(String(value));
  return date.toLocaleDateString('pt-BR');
}

/**
 * Format datetime for export
 */
export function formatDateTimeExport(value: unknown): string {
  if (!value) return '';
  const date = new Date(String(value));
  return date.toLocaleString('pt-BR');
}
