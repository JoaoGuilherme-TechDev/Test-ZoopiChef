import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Download, FileText, FileSpreadsheet, Loader2 } from 'lucide-react';
import { exportToCSV, exportToExcel, exportToPDF, ExportColumn } from '@/utils/exportUtils';
import { toast } from 'sonner';

interface ExportDropdownProps {
  data: Record<string, unknown>[];
  columns: ExportColumn[];
  filename: string;
  title?: string;
  disabled?: boolean;
}

export function ExportDropdown({ 
  data, 
  columns, 
  filename, 
  title,
  disabled = false 
}: ExportDropdownProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async (format: 'csv' | 'excel' | 'pdf') => {
    if (data.length === 0) {
      toast.error('Nenhum dado para exportar');
      return;
    }

    setIsExporting(true);
    try {
      const options = { data, columns, filename, title };
      
      switch (format) {
        case 'csv':
          exportToCSV(options);
          toast.success('CSV exportado com sucesso!');
          break;
        case 'excel':
          exportToExcel(options);
          toast.success('Excel exportado com sucesso!');
          break;
        case 'pdf':
          exportToPDF(options);
          toast.success('PDF aberto para impressão!');
          break;
      }
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Erro ao exportar dados');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={disabled || isExporting}>
          {isExporting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Download className="mr-2 h-4 w-4" />
          )}
          Exportar
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-popover z-50">
        <DropdownMenuItem onClick={() => handleExport('csv')}>
          <FileText className="mr-2 h-4 w-4" />
          Exportar CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport('excel')}>
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          Exportar Excel
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport('pdf')}>
          <FileText className="mr-2 h-4 w-4" />
          Exportar PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
