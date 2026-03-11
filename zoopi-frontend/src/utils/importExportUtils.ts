/**
 * Utility functions for importing and exporting data via Excel/CSV files
 */

export interface ImportResult<T> {
  success: T[];
  errors: ImportError[];
  totalRows: number;
  inserted?: number;
}

export interface ImportError {
  row: number;
  field: string;
  value: string;
  message: string;
}

export interface ColumnMapping {
  header: string;
  field: string;
  required: boolean;
  transform?: (value: string) => any;
  validate?: (value: string) => string | null; // Returns error message or null
}

/**
 * Parse CSV/Excel content to rows
 */
export function parseCSVContent(content: string): string[][] {
  const lines = content.split(/\r?\n/).filter(line => line.trim());
  return lines.map(line => {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];
      
      if (char === '"' && !inQuotes) {
        inQuotes = true;
      } else if (char === '"' && inQuotes) {
        if (nextChar === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else if ((char === ',' || char === ';' || char === '\t') && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());
    return values;
  });
}

/**
 * Validate and transform imported data
 */
export function processImportData<T>(
  rows: string[][],
  mappings: ColumnMapping[],
  startRow = 1 // Skip header row by default
): ImportResult<T> {
  const result: ImportResult<T> = {
    success: [],
    errors: [],
    totalRows: rows.length - startRow,
  };

  if (rows.length === 0) return result;

  // Get header row for column mapping
  const headers = rows[0].map(h => h.toLowerCase().trim());
  
  // Map headers to column indices
  const columnIndices: Map<string, number> = new Map();
  mappings.forEach(mapping => {
    const headerVariants = [
      mapping.header.toLowerCase(),
      mapping.header.toLowerCase().replace(/\s+/g, ''),
      mapping.header.toLowerCase().replace(/[_-]/g, ' '),
    ];
    
    const index = headers.findIndex(h => 
      headerVariants.some(variant => 
        h.includes(variant) || variant.includes(h)
      )
    );
    
    if (index >= 0) {
      columnIndices.set(mapping.field, index);
    }
  });

  // Check required columns
  const missingRequired = mappings
    .filter(m => m.required && !columnIndices.has(m.field))
    .map(m => m.header);

  if (missingRequired.length > 0) {
    result.errors.push({
      row: 0,
      field: 'headers',
      value: '',
      message: `Colunas obrigatórias não encontradas: ${missingRequired.join(', ')}`,
    });
    return result;
  }

  // Process data rows
  for (let i = startRow; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 1;
    const item: Record<string, any> = {};
    let hasErrors = false;

    mappings.forEach(mapping => {
      const colIndex = columnIndices.get(mapping.field);
      const rawValue = colIndex !== undefined ? (row[colIndex] || '').trim() : '';

      // Check required
      if (mapping.required && !rawValue) {
        result.errors.push({
          row: rowNum,
          field: mapping.header,
          value: rawValue,
          message: `Campo obrigatório "${mapping.header}" está vazio`,
        });
        hasErrors = true;
        return;
      }

      // Validate
      if (rawValue && mapping.validate) {
        const error = mapping.validate(rawValue);
        if (error) {
          result.errors.push({
            row: rowNum,
            field: mapping.header,
            value: rawValue,
            message: error,
          });
          hasErrors = true;
          return;
        }
      }

      // Transform
      try {
        item[mapping.field] = mapping.transform 
          ? mapping.transform(rawValue) 
          : rawValue;
      } catch (e) {
        result.errors.push({
          row: rowNum,
          field: mapping.header,
          value: rawValue,
          message: `Erro ao processar valor: ${(e as Error).message}`,
        });
        hasErrors = true;
      }
    });

    if (!hasErrors) {
      result.success.push(item as T);
    }
  }

  return result;
}

/**
 * Read file content as text
 */
export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
    reader.readAsText(file);
  });
}

/**
 * Download template CSV
 */
export function downloadTemplate(filename: string, headers: string[]): void {
  const BOM = '\uFEFF';
  const content = BOM + headers.join(';') + '\n';
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Transform helpers
 */
export const transforms = {
  toNumber: (value: string): number | null => {
    if (!value) return null;
    const cleaned = value.replace(/[R$\s.]/g, '').replace(',', '.');
    const num = parseFloat(cleaned);
    return isNaN(num) ? null : num;
  },
  
  toBoolean: (value: string): boolean => {
    const lower = value.toLowerCase().trim();
    return ['sim', 'yes', 'true', '1', 's', 'x'].includes(lower);
  },
  
  toString: (value: string): string => value.trim(),
  
  toStringOrNull: (value: string): string | null => {
    const trimmed = value.trim();
    return trimmed || null;
  },
};

/**
 * Validation helpers
 */
export const validators = {
  required: (value: string): string | null => 
    value ? null : 'Campo obrigatório',
  
  number: (value: string): string | null => {
    if (!value) return null;
    const cleaned = value.replace(/[R$\s.]/g, '').replace(',', '.');
    return isNaN(parseFloat(cleaned)) ? 'Valor numérico inválido' : null;
  },
  
  positiveNumber: (value: string): string | null => {
    if (!value) return null;
    const cleaned = value.replace(/[R$\s.]/g, '').replace(',', '.');
    const num = parseFloat(cleaned);
    if (isNaN(num)) return 'Valor numérico inválido';
    return num < 0 ? 'Valor deve ser positivo' : null;
  },
};

/**
 * Export data to CSV with proper encoding
 */
export function exportDataToCSV(
  data: Record<string, any>[],
  columns: { key: string; header: string; format?: (value: any) => string }[],
  filename: string
): void {
  const BOM = '\uFEFF';
  const separator = ';';
  
  const headers = columns.map(c => c.header).join(separator);
  
  const rows = data.map(item => 
    columns.map(col => {
      const value = item[col.key];
      const formatted = col.format ? col.format(value) : (value ?? '');
      // Escape special characters
      const escaped = String(formatted).replace(/"/g, '""');
      return escaped.includes(separator) || escaped.includes('\n') 
        ? `"${escaped}"` 
        : escaped;
    }).join(separator)
  );
  
  const content = BOM + [headers, ...rows].join('\n');
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
