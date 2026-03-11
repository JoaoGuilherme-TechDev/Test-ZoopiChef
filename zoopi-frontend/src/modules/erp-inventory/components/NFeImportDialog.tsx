import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  Upload, FileText, CheckCircle, AlertCircle, Link2, Plus, 
  Loader2, Sparkles, History, HelpCircle, Package
} from 'lucide-react';
import { useNFeImport } from '../hooks/useNFeImport';
import { useERPItems } from '../hooks/useERPItems';
import { useERPUnits } from '../hooks/useERPUnits';
import type { NFeParseResult, NFeParsedItem } from '../types/nfe';
import { ITEM_TYPE_LABELS } from '../types';

interface NFeImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete?: () => void;
}

type Step = 'upload' | 'review' | 'confirm';

export function NFeImportDialog({ open, onOpenChange, onImportComplete }: NFeImportDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>('upload');
  const [parseResult, setParseResult] = useState<NFeParseResult | null>(null);
  const [editingItem, setEditingItem] = useState<number | null>(null);
  const [newItemData, setNewItemData] = useState<{ itemType: string; unitId?: string } | null>(null);

  const { parseXML, isProcessing, updateItemLink, createItemFromNFe, confirmImport } = useNFeImport();
  const { items: erpItems } = useERPItems();
  const { units } = useERPUnits();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const content = await file.text();
      const result = await parseXML(content);
      setParseResult(result);
      setStep('review');
    } catch (error) {
      console.error('Error parsing XML:', error);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file || !file.name.toLowerCase().endsWith('.xml')) return;

    try {
      const content = await file.text();
      const result = await parseXML(content);
      setParseResult(result);
      setStep('review');
    } catch (error) {
      console.error('Error parsing XML:', error);
    }
  };

  const handleLinkItem = async (itemIndex: number, erpItemId: string) => {
    if (!parseResult) return;

    const erpItem = erpItems.find(i => i.id === erpItemId);
    if (!erpItem) return;

    await updateItemLink.mutateAsync({
      importId: parseResult.import_id,
      itemIndex,
      erpItemId,
      erpItemName: erpItem.name,
    });

    // Update local state
    const updatedItems = [...parseResult.items];
    updatedItems[itemIndex] = {
      ...updatedItems[itemIndex],
      linked_erp_item_id: erpItemId,
      linked_erp_item_name: erpItem.name,
      link_source: 'manual',
    };

    setParseResult({
      ...parseResult,
      items: updatedItems,
      summary: {
        ...parseResult.summary,
        needs_linking: updatedItems.filter(i => !i.linked_erp_item_id).length,
      },
    });

    setEditingItem(null);
  };

  const handleCreateItem = async (itemIndex: number) => {
    if (!parseResult || !newItemData) return;

    const nfeItem = parseResult.items[itemIndex];

    await createItemFromNFe.mutateAsync({
      importId: parseResult.import_id,
      itemIndex,
      nfeItem,
      itemType: newItemData.itemType,
      baseUnitId: newItemData.unitId,
    });

    // Refresh parse result
    setNewItemData(null);
    setEditingItem(null);
  };

  const handleConfirmImport = async () => {
    if (!parseResult) return;

    await confirmImport.mutateAsync(parseResult.import_id);
    onImportComplete?.();
    handleClose();
  };

  const handleClose = () => {
    setStep('upload');
    setParseResult(null);
    setEditingItem(null);
    setNewItemData(null);
    onOpenChange(false);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const getLinkBadge = (item: NFeParsedItem) => {
    if (!item.linked_erp_item_id) {
      return <Badge variant="destructive">Não vinculado</Badge>;
    }

    switch (item.link_source) {
      case 'history':
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Badge variant="default" className="bg-green-600">
                  <History className="w-3 h-3 mr-1" />
                  Histórico
                </Badge>
              </TooltipTrigger>
              <TooltipContent>Vinculado automaticamente pelo histórico de importações</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      case 'ai':
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Badge variant="secondary" className="bg-purple-100 text-purple-700">
                  <Sparkles className="w-3 h-3 mr-1" />
                  IA {item.ai_confidence}%
                </Badge>
              </TooltipTrigger>
              <TooltipContent>{item.ai_suggestion_reason || 'Sugerido por IA'}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      case 'manual':
        return (
          <Badge variant="outline">
            <Link2 className="w-3 h-3 mr-1" />
            Manual
          </Badge>
        );
      default:
        return <Badge variant="secondary">Vinculado</Badge>;
    }
  };

  const allItemsLinked = parseResult?.items.every(i => i.linked_erp_item_id);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Importar NF-e
          </DialogTitle>
          <DialogDescription>
            {step === 'upload' && 'Faça upload do arquivo XML da nota fiscal'}
            {step === 'review' && 'Revise e vincule os itens com seu estoque'}
            {step === 'confirm' && 'Confirme a importação'}
          </DialogDescription>
        </DialogHeader>

        {/* Step: Upload */}
        {step === 'upload' && (
          <div
            className="border-2 border-dashed rounded-lg p-12 text-center cursor-pointer hover:border-primary transition-colors"
            onDrop={handleDrop}
            onDragOver={e => e.preventDefault()}
            onClick={() => fileInputRef.current?.click()}
          >
            {isProcessing ? (
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="w-12 h-12 animate-spin text-primary" />
                <p>Processando XML com IA...</p>
                <p className="text-sm text-muted-foreground">Identificando itens e buscando vínculos</p>
              </div>
            ) : (
              <>
                <Upload className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-lg font-medium mb-2">Arraste o arquivo XML aqui</p>
                <p className="text-muted-foreground mb-4">ou clique para selecionar</p>
                <Button variant="outline">
                  <FileText className="w-4 h-4 mr-2" />
                  Selecionar Arquivo XML
                </Button>
              </>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".xml"
              className="hidden"
              onChange={handleFileSelect}
            />
          </div>
        )}

        {/* Step: Review */}
        {step === 'review' && parseResult && (
          <div className="flex-1 overflow-hidden flex flex-col gap-4">
            {/* Summary Cards */}
            <div className="grid grid-cols-4 gap-3">
              <Card className="p-3">
                <p className="text-xs text-muted-foreground">Fornecedor</p>
                <p className="font-medium truncate">{parseResult.supplier.name}</p>
                <p className="text-xs text-muted-foreground">{parseResult.supplier.cnpj}</p>
              </Card>
              <Card className="p-3">
                <p className="text-xs text-muted-foreground">Nota</p>
                <p className="font-medium">Nº {parseResult.invoice.number}</p>
                <p className="text-xs text-muted-foreground">{parseResult.invoice.date}</p>
              </Card>
              <Card className="p-3">
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="font-medium text-lg">{formatCurrency(parseResult.totals.total)}</p>
              </Card>
              <Card className="p-3">
                <p className="text-xs text-muted-foreground">Itens</p>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{parseResult.summary.total_items}</span>
                  {parseResult.summary.needs_linking === 0 ? (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  ) : (
                    <Badge variant="destructive" className="text-xs">
                      {parseResult.summary.needs_linking} pendente(s)
                    </Badge>
                  )}
                </div>
              </Card>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 text-xs">
              <span className="text-muted-foreground">Legenda:</span>
              <div className="flex items-center gap-1">
                <History className="w-3 h-3 text-green-600" />
                <span>Histórico</span>
              </div>
              <div className="flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-purple-600" />
                <span>Sugestão IA</span>
              </div>
              <div className="flex items-center gap-1">
                <Link2 className="w-3 h-3" />
                <span>Manual</span>
              </div>
            </div>

            {/* Items Table */}
            <ScrollArea className="flex-1">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Produto NF-e</TableHead>
                    <TableHead className="w-20 text-center">Qtd</TableHead>
                    <TableHead className="w-24 text-right">Unitário</TableHead>
                    <TableHead className="w-24 text-right">Total</TableHead>
                    <TableHead>Vinculado a</TableHead>
                    <TableHead className="w-32">Status</TableHead>
                    <TableHead className="w-24">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parseResult.items.map((item, index) => (
                    <TableRow key={index} className={!item.linked_erp_item_id ? 'bg-destructive/5' : ''}>
                      <TableCell className="font-mono text-xs">{item.nItem}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{item.xProd}</p>
                          <p className="text-xs text-muted-foreground">
                            Cód: {item.cProd} | Un: {item.uCom}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">{item.qCom}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.vUnCom)}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(item.vProd)}</TableCell>
                      <TableCell>
                        {editingItem === index ? (
                          <div className="space-y-2">
                            <Select onValueChange={(val) => handleLinkItem(index, val)}>
                              <SelectTrigger className="h-8">
                                <SelectValue placeholder="Selecione item ERP" />
                              </SelectTrigger>
                              <SelectContent>
                                {erpItems.map(erp => (
                                  <SelectItem key={erp.id} value={erp.id}>
                                    {erp.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {/* Create new item option */}
                            {newItemData ? (
                              <div className="space-y-1">
                                <Select 
                                  value={newItemData.itemType}
                                  onValueChange={(val) => setNewItemData({ ...newItemData, itemType: val })}
                                >
                                  <SelectTrigger className="h-8">
                                    <SelectValue placeholder="Tipo" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {Object.entries(ITEM_TYPE_LABELS).map(([key, label]) => (
                                      <SelectItem key={key} value={key}>{label}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <div className="flex gap-1">
                                  <Button 
                                    size="sm" 
                                    className="h-7 text-xs flex-1"
                                    onClick={() => handleCreateItem(index)}
                                    disabled={createItemFromNFe.isPending}
                                  >
                                    {createItemFromNFe.isPending ? (
                                      <Loader2 className="w-3 h-3 animate-spin" />
                                    ) : (
                                      'Criar'
                                    )}
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    variant="ghost"
                                    className="h-7 text-xs"
                                    onClick={() => setNewItemData(null)}
                                  >
                                    Cancelar
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                className="w-full h-7 text-xs"
                                onClick={() => setNewItemData({ itemType: 'raw' })}
                              >
                                <Plus className="w-3 h-3 mr-1" />
                                Criar Novo
                              </Button>
                            )}
                          </div>
                        ) : (
                          <span className={item.linked_erp_item_id ? 'text-sm' : 'text-muted-foreground text-sm'}>
                            {item.linked_erp_item_name || '-'}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>{getLinkBadge(item)}</TableCell>
                      <TableCell>
                        {editingItem !== index && (
                          <Button
                            size="sm"
                            variant={item.linked_erp_item_id ? 'ghost' : 'outline'}
                            className="h-7"
                            onClick={() => setEditingItem(index)}
                          >
                            {item.linked_erp_item_id ? 'Alterar' : 'Vincular'}
                          </Button>
                        )}
                        {editingItem === index && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7"
                            onClick={() => {
                              setEditingItem(null);
                              setNewItemData(null);
                            }}
                          >
                            Fechar
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>

            {/* Actions */}
            <div className="flex justify-between items-center pt-4 border-t">
              <Button variant="ghost" onClick={() => setStep('upload')}>
                Voltar
              </Button>
              <div className="flex items-center gap-2">
                {!allItemsLinked && (
                  <p className="text-sm text-muted-foreground mr-2">
                    <AlertCircle className="w-4 h-4 inline mr-1" />
                    Vincule todos os itens para continuar
                  </p>
                )}
                <Button 
                  onClick={handleConfirmImport}
                  disabled={!allItemsLinked || confirmImport.isPending}
                >
                  {confirmImport.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle className="w-4 h-4 mr-2" />
                  )}
                  Confirmar Importação
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
