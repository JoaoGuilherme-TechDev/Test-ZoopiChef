import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Package, Check, ChevronRight } from 'lucide-react';
import { useNCMCodes } from '../hooks/useFiscalReferences';

interface NCMCodeSearchProps {
  onSelect?: (ncm: { code: string; description: string }) => void;
  selectedCode?: string;
}

export function NCMCodeSearch({ onSelect, selectedCode }: NCMCodeSearchProps) {
  const [search, setSearch] = useState('');
  const { data: ncmCodes, isLoading } = useNCMCodes(search);

  const groupedCodes = useMemo(() => {
    if (!ncmCodes) return {};
    
    return ncmCodes.reduce((acc, ncm) => {
      const chapter = ncm.code.substring(0, 2);
      if (!acc[chapter]) {
        acc[chapter] = [];
      }
      acc[chapter].push(ncm);
      return acc;
    }, {} as Record<string, typeof ncmCodes>);
  }, [ncmCodes]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Package className="h-5 w-5 text-primary" />
          <CardTitle>Códigos NCM</CardTitle>
        </div>
        <CardDescription>
          Nomenclatura Comum do Mercosul - Classificação fiscal de mercadorias
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por código ou descrição..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        <ScrollArea className="h-[400px] rounded-md border">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
          ) : ncmCodes?.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
              <Package className="h-8 w-8 mb-2 opacity-50" />
              <p>Nenhum código encontrado</p>
            </div>
          ) : (
            <div className="p-2">
              {Object.entries(groupedCodes).map(([chapter, codes]) => (
                <div key={chapter} className="mb-4">
                  <div className="sticky top-0 bg-background px-2 py-1 mb-1">
                    <Badge variant="outline" className="text-xs">
                      Capítulo {chapter}
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    {codes.map((ncm) => (
                      <button
                        key={ncm.id}
                        onClick={() => onSelect?.({ code: ncm.code, description: ncm.description })}
                        className={`w-full text-left p-3 rounded-lg transition-colors flex items-center justify-between group ${
                          selectedCode === ncm.code
                            ? 'bg-primary/10 border border-primary'
                            : 'hover:bg-muted'
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <code className="font-mono text-sm font-semibold">
                              {ncm.code}
                            </code>
                            {ncm.ipi_rate && (
                              <Badge variant="secondary" className="text-xs">
                                IPI {ncm.ipi_rate}%
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground truncate mt-1">
                            {ncm.description}
                          </p>
                        </div>
                        {selectedCode === ncm.code ? (
                          <Check className="h-4 w-4 text-primary flex-shrink-0" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {selectedCode && (
          <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
            <p className="text-sm font-medium">NCM Selecionado</p>
            <code className="font-mono text-lg">{selectedCode}</code>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
