import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  ChevronDown, ChevronRight, Package, AlertTriangle, 
  Sparkles, History, Link2, Plus, Edit2, Check, X,
  Barcode, Tag, ArrowRightLeft
} from 'lucide-react';
import type { NFeWizardData, NFeWizardItem } from '../../types/nfe-wizard';
import { MARGIN_LEVEL_CONFIG, calculateMarginLevel, calculateMarginPercent } from '../../types/nfe-wizard';
import { useERPItems } from '../../hooks/useERPItems';
import { useCategories } from '@/hooks/useCategories';
import { useSubcategories } from '@/hooks/useSubcategories';
import { ITEM_TYPE_LABELS } from '../../types';

interface NFeWizardItemsStepProps {
  data: NFeWizardData;
  onUpdateItem: (index: number, updates: Partial<NFeWizardItem>) => void;
  onApplyDefaultCFOP: (cfop: string) => void;
  onNext: () => void;
  onPrev: () => void;
}

export function NFeWizardItemsStep({ data, onUpdateItem, onApplyDefaultCFOP, onNext, onPrev }: NFeWizardItemsStepProps) {
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());
  const [editingItem, setEditingItem] = useState<number | null>(null);
  const [defaultCfop, setDefaultCfop] = useState(data.default_cfop_entry || '');

  const { items: erpItems } = useERPItems();
  const { data: categories } = useCategories();
  const { data: subcategories } = useSubcategories();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const toggleExpanded = (index: number) => {
    const newSet = new Set(expandedItems);
    if (newSet.has(index)) {
      newSet.delete(index);
    } else {
      newSet.add(index);
    }
    setExpandedItems(newSet);
  };

  const getMarginBadge = (item: NFeWizardItem) => {
    if (!item.sale_price || item.sale_price <= 0) {
      return <Badge variant="outline" className="text-muted-foreground">Sem preço</Badge>;
    }

    const level = calculateMarginLevel(item.vUnCom, item.sale_price);
    const percent = calculateMarginPercent(item.vUnCom, item.sale_price);
    const config = MARGIN_LEVEL_CONFIG[level];

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>
            <Badge className={`${config.bgColor} ${config.color} border`}>
              {percent.toFixed(1)}%
            </Badge>
          </TooltipTrigger>
          <TooltipContent>{config.label}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  const getLinkBadge = (item: NFeWizardItem) => {
    if (!item.linked_erp_item_id) {
      return (
        <Badge variant="destructive" className="gap-1">
          <Plus className="w-3 h-3" />
          Novo
        </Badge>
      );
    }

    switch (item.link_source) {
      case 'history':
        return (
          <Badge variant="default" className="bg-green-600 gap-1">
            <History className="w-3 h-3" />
            Histórico
          </Badge>
        );
      case 'ai':
        return (
          <Badge className="bg-purple-100 text-purple-700 gap-1">
            <Sparkles className="w-3 h-3" />
            IA {item.ai_confidence}%
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="gap-1">
            <Link2 className="w-3 h-3" />
            Vinculado
          </Badge>
        );
    }
  };

  const handleApplyDefaultCfop = () => {
    if (defaultCfop) {
      onApplyDefaultCFOP(defaultCfop);
    }
  };

  const allItemsReady = data.items.every(item => 
    item.linked_erp_item_id || item.needs_creation
  );

  return (
    <div className="space-y-4">
      {/* Default CFOP */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Tag className="w-4 h-4" />
            CFOP de Entrada Padrão
          </CardTitle>
        </CardHeader>
        <CardContent className="py-2">
          <div className="flex gap-2">
            <Input
              placeholder="Ex: 1102, 2102..."
              value={defaultCfop}
              onChange={(e) => setDefaultCfop(e.target.value)}
              className="w-40"
            />
            <Button variant="outline" size="sm" onClick={handleApplyDefaultCfop}>
              Aplicar a todos
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Items Table */}
      <Card className="flex-1">
        <CardHeader className="py-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="w-4 h-4" />
              Itens da Nota ({data.items.length})
            </CardTitle>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-muted-foreground">Legenda:</span>
              <Badge className="bg-blue-50 text-blue-700 border-blue-200">Ótima</Badge>
              <Badge className="bg-green-50 text-green-700 border-green-200">Boa</Badge>
              <Badge className="bg-yellow-50 text-yellow-700 border-yellow-200">Baixa</Badge>
              <Badge className="bg-red-50 text-red-700 border-red-200">Crítica</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8"></TableHead>
                  <TableHead>Produto NF-e</TableHead>
                  <TableHead className="w-20 text-center">Qtd</TableHead>
                  <TableHead className="w-24 text-right">Custo</TableHead>
                  <TableHead className="w-24 text-right">Venda</TableHead>
                  <TableHead className="w-20 text-center">Margem</TableHead>
                  <TableHead className="w-28">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((item, index) => (
                  <Collapsible key={index} open={expandedItems.has(index)}>
                    <TableRow 
                      className={`cursor-pointer hover:bg-muted/50 ${
                        !item.linked_erp_item_id && !item.needs_creation ? 'bg-destructive/5' : ''
                      }`}
                      onClick={() => toggleExpanded(index)}
                    >
                      <TableCell>
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                            {expandedItems.has(index) ? (
                              <ChevronDown className="w-4 h-4" />
                            ) : (
                              <ChevronRight className="w-4 h-4" />
                            )}
                          </Button>
                        </CollapsibleTrigger>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{item.product_name_override || item.xProd}</p>
                          <p className="text-xs text-muted-foreground">
                            Cód: {item.cProd} | Un: {item.uCom}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">{item.qCom}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.vUnCom)}</TableCell>
                      <TableCell className="text-right">
                        {item.sale_price ? formatCurrency(item.sale_price) : '-'}
                      </TableCell>
                      <TableCell className="text-center">{getMarginBadge(item)}</TableCell>
                      <TableCell>{getLinkBadge(item)}</TableCell>
                    </TableRow>

                    <CollapsibleContent asChild>
                      <TableRow className="bg-muted/30">
                        <TableCell colSpan={7} className="p-4">
                          <ItemDetailEditor
                            item={item}
                            index={index}
                            erpItems={erpItems}
                            categories={categories || []}
                            subcategories={subcategories || []}
                            onUpdate={(updates) => onUpdateItem(index, updates)}
                          />
                        </TableCell>
                      </TableRow>
                    </CollapsibleContent>
                  </Collapsible>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onPrev}>
          Voltar
        </Button>
        <Button onClick={onNext} disabled={!allItemsReady}>
          Próximo: Financeiro
        </Button>
      </div>

      {!allItemsReady && (
        <p className="text-sm text-destructive text-center flex items-center justify-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          Vincule ou cadastre todos os itens antes de continuar
        </p>
      )}
    </div>
  );
}

interface ItemDetailEditorProps {
  item: NFeWizardItem;
  index: number;
  erpItems: any[];
  categories: any[];
  subcategories: any[];
  onUpdate: (updates: Partial<NFeWizardItem>) => void;
}

function ItemDetailEditor({ item, index, erpItems, categories, subcategories, onUpdate }: ItemDetailEditorProps) {
  const [localName, setLocalName] = useState(item.product_name_override || item.xProd);
  const [localSalePrice, setLocalSalePrice] = useState(item.sale_price?.toString() || '');
  const [localEan, setLocalEan] = useState(item.ean_code || item.cEAN || '');
  const [localConversionFactor, setLocalConversionFactor] = useState(item.conversion_factor?.toString() || '1');
  const [localCfop, setLocalCfop] = useState(item.cfop_entry || '');

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const handleLinkToErp = (erpItemId: string) => {
    const erpItem = erpItems.find(e => e.id === erpItemId);
    if (erpItem) {
      onUpdate({
        linked_erp_item_id: erpItemId,
        linked_erp_item_name: erpItem.name,
        link_source: 'manual',
        needs_creation: false,
        sale_price: erpItem.sale_price || undefined,
      });
    }
  };

  const handleMarkAsNew = () => {
    onUpdate({
      linked_erp_item_id: undefined,
      linked_erp_item_name: undefined,
      needs_creation: true,
    });
  };

  const applyChanges = () => {
    onUpdate({
      product_name_override: localName !== item.xProd ? localName : undefined,
      sale_price: localSalePrice ? parseFloat(localSalePrice) : undefined,
      ean_code: localEan || undefined,
      conversion_factor: localConversionFactor ? parseFloat(localConversionFactor) : 1,
      cfop_entry: localCfop || undefined,
    });
  };

  const marginLevel = localSalePrice && parseFloat(localSalePrice) > 0
    ? calculateMarginLevel(item.vUnCom, parseFloat(localSalePrice))
    : null;

  const marginConfig = marginLevel ? MARGIN_LEVEL_CONFIG[marginLevel] : null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4" onClick={(e) => e.stopPropagation()}>
      {/* Left Column - Linking */}
      <div className="space-y-3">
        <div>
          <Label className="text-xs">Vincular ao Item ERP</Label>
          <Select
            value={item.linked_erp_item_id || ''}
            onValueChange={handleLinkToErp}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione um item existente" />
            </SelectTrigger>
            <SelectContent>
              {erpItems.map(erp => (
                <SelectItem key={erp.id} value={erp.id}>
                  {erp.name} ({ITEM_TYPE_LABELS[erp.item_type as keyof typeof ITEM_TYPE_LABELS] || erp.item_type})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {!item.linked_erp_item_id && (
            <Button
              variant="outline"
              size="sm"
              className="mt-2 w-full"
              onClick={handleMarkAsNew}
            >
              <Plus className="w-3 h-3 mr-1" />
              Cadastrar como Novo Item
            </Button>
          )}
        </div>

        {item.needs_creation && (
          <>
            <div>
              <Label className="text-xs">Nome do Produto</Label>
              <Input
                value={localName}
                onChange={(e) => setLocalName(e.target.value)}
                placeholder="Nome do produto no sistema"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Categoria</Label>
                <Select
                  value={item.category_id || ''}
                  onValueChange={(val) => onUpdate({ category_id: val })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(cat => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Subcategoria</Label>
                <Select
                  value={item.subcategory_id || ''}
                  onValueChange={(val) => onUpdate({ subcategory_id: val })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Subcategoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {subcategories
                      .filter(sub => !item.category_id || sub.category_id === item.category_id)
                      .map(sub => (
                        <SelectItem key={sub.id} value={sub.id}>{sub.name}</SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="text-xs flex items-center gap-1">
                <Barcode className="w-3 h-3" />
                Código de Barras (EAN)
              </Label>
              <Input
                value={localEan}
                onChange={(e) => setLocalEan(e.target.value)}
                placeholder="Código de barras"
              />
            </div>
          </>
        )}
      </div>

      {/* Right Column - Pricing & Conversion */}
      <div className="space-y-3">
        <div className={`p-3 rounded-lg border ${marginConfig ? marginConfig.bgColor : 'bg-muted/50'}`}>
          <Label className="text-xs">Preço de Venda</Label>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-muted-foreground">R$</span>
            <Input
              type="number"
              step="0.01"
              value={localSalePrice}
              onChange={(e) => setLocalSalePrice(e.target.value)}
              placeholder="0,00"
              className="flex-1"
            />
          </div>
          {localSalePrice && parseFloat(localSalePrice) > 0 && (
            <div className="mt-2 text-xs flex items-center justify-between">
              <span>Custo: {formatCurrency(item.vUnCom)}</span>
              <span className={marginConfig?.color}>
                Margem: {calculateMarginPercent(item.vUnCom, parseFloat(localSalePrice)).toFixed(1)}%
              </span>
            </div>
          )}
        </div>

        <div>
          <Label className="text-xs flex items-center gap-1">
            <ArrowRightLeft className="w-3 h-3" />
            Fator de Conversão
          </Label>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-muted-foreground">1 {item.uCom} =</span>
            <Input
              type="number"
              step="0.01"
              value={localConversionFactor}
              onChange={(e) => setLocalConversionFactor(e.target.value)}
              className="w-20"
            />
            <span className="text-xs text-muted-foreground">un. estoque</span>
          </div>
        </div>

        <div>
          <Label className="text-xs">CFOP de Entrada</Label>
          <Input
            value={localCfop}
            onChange={(e) => setLocalCfop(e.target.value)}
            placeholder="Ex: 1102"
            className="w-32"
          />
        </div>

        <Button onClick={applyChanges} className="w-full" size="sm">
          <Check className="w-3 h-3 mr-1" />
          Aplicar Alterações
        </Button>
      </div>
    </div>
  );
}
