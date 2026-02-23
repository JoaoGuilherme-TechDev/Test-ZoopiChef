import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowDownLeft, ArrowUpRight, MapPin, Globe, Check, ChevronRight } from 'lucide-react';
import { useCFOPCodes } from '../hooks/useFiscalReferences';

interface CFOPCodeManagerProps {
  onSelect?: (cfop: { code: string; description: string }) => void;
  selectedCode?: string;
}

const SCOPE_CONFIG = {
  estadual: { label: 'Estadual', icon: MapPin, range: '1xxx/5xxx' },
  interestadual: { label: 'Interestadual', icon: MapPin, range: '2xxx/6xxx' },
  exterior: { label: 'Exterior', icon: Globe, range: '3xxx/7xxx' },
};

export function CFOPCodeManager({ onSelect, selectedCode }: CFOPCodeManagerProps) {
  const [operationType, setOperationType] = useState<'entrada' | 'saida'>('saida');
  const [scope, setScope] = useState<'estadual' | 'interestadual' | 'exterior'>('estadual');
  
  const { data: cfopCodes, isLoading } = useCFOPCodes(operationType, scope);

  const groupedCodes = cfopCodes?.reduce((acc, cfop) => {
    const group = cfop.code.substring(0, 2) + '00';
    if (!acc[group]) {
      acc[group] = [];
    }
    acc[group].push(cfop);
    return acc;
  }, {} as Record<string, typeof cfopCodes>);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Códigos CFOP</CardTitle>
        <CardDescription>
          Código Fiscal de Operações e Prestações
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Operation Type Tabs */}
        <Tabs value={operationType} onValueChange={(v) => setOperationType(v as 'entrada' | 'saida')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="entrada" className="flex items-center gap-2">
              <ArrowDownLeft className="h-4 w-4" />
              Entrada
            </TabsTrigger>
            <TabsTrigger value="saida" className="flex items-center gap-2">
              <ArrowUpRight className="h-4 w-4" />
              Saída
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Scope Tabs */}
        <div className="flex gap-2">
          {Object.entries(SCOPE_CONFIG).map(([key, config]) => {
            const Icon = config.icon;
            return (
              <button
                key={key}
                onClick={() => setScope(key as typeof scope)}
                className={`flex-1 p-3 rounded-lg border transition-colors ${
                  scope === key
                    ? 'bg-primary/10 border-primary'
                    : 'hover:bg-muted border-transparent'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <Icon className="h-4 w-4" />
                  <span className="text-sm font-medium">{config.label}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{config.range}</p>
              </button>
            );
          })}
        </div>

        {/* CFOP List */}
        <ScrollArea className="h-[350px] rounded-md border">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="p-2">
              {groupedCodes && Object.entries(groupedCodes).map(([group, codes]) => (
                <div key={group} className="mb-4">
                  <div className="sticky top-0 bg-background px-2 py-1 mb-1">
                    <Badge variant="outline" className="text-xs">
                      Grupo {group}
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    {codes.map((cfop) => (
                      <button
                        key={cfop.id}
                        onClick={() => onSelect?.({ code: cfop.code, description: cfop.description })}
                        className={`w-full text-left p-3 rounded-lg transition-colors flex items-center justify-between group ${
                          selectedCode === cfop.code
                            ? 'bg-primary/10 border border-primary'
                            : 'hover:bg-muted'
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <code className="font-mono text-sm font-semibold">
                            {cfop.code}
                          </code>
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {cfop.description}
                          </p>
                        </div>
                        {selectedCode === cfop.code ? (
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
      </CardContent>
    </Card>
  );
}
