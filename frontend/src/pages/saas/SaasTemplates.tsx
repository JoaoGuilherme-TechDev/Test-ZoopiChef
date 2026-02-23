import { useState } from 'react';
import { SaasLayout } from '@/components/saas/SaasLayout';
import { useSaasCompanies, useTemplateCompanies, useCloneCompanyMenu } from '@/hooks/useSaasAdmin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Copy, Loader2, ArrowRight } from 'lucide-react';

interface CloneItems {
  categories: boolean;
  subcategories: boolean;
  products: boolean;
  banners: boolean;
  prizes: boolean;
}

export default function SaasTemplates() {
  const { data: companies = [] } = useSaasCompanies();
  const { data: templates = [], isLoading } = useTemplateCompanies();
  const cloneMenu = useCloneCompanyMenu();

  const [sourceId, setSourceId] = useState('');
  const [targetId, setTargetId] = useState('');
  const [items, setItems] = useState<CloneItems>({
    categories: true,
    subcategories: true,
    products: true,
    banners: false,
    prizes: false,
  });

  const handleClone = () => {
    if (sourceId && targetId && sourceId !== targetId) {
      cloneMenu.mutate({
        sourceCompanyId: sourceId,
        targetCompanyId: targetId,
        items,
      });
    }
  };

  const availableSources = [...templates, ...companies.filter(c => !c.is_template)];
  const availableTargets = companies.filter(c => c.id !== sourceId);

  return (
    <SaasLayout title="Templates & Clone">
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Templates List */}
        <Card className="bg-slate-900/50 border-slate-700/50">
          <CardHeader>
            <CardTitle className="text-white">Templates Disponíveis</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
              </div>
            ) : templates.length > 0 ? (
              <div className="space-y-3">
                {templates.map((template) => (
                  <div
                    key={template.id}
                    className="flex items-center justify-between p-4 rounded-lg bg-slate-800/50 border border-slate-700/50"
                  >
                    <div>
                      <p className="font-medium text-white">{template.name}</p>
                      <p className="text-xs text-slate-400">{template.slug}</p>
                    </div>
                    <Badge variant="outline" className="border-purple-500/50 text-purple-400">
                      Template
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center py-8 text-slate-500">
                Nenhum template configurado. Marque empresas como template na página de Empresas.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Clone Tool */}
        <Card className="bg-slate-900/50 border-slate-700/50">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Copy className="w-5 h-5" />
              Clonar Cardápio
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-slate-300">Empresa Origem</Label>
                <Select value={sourceId} onValueChange={setSourceId}>
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                    <SelectValue placeholder="Selecione a origem" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    {availableSources.map((c) => (
                      <SelectItem key={c.id} value={c.id} className="text-white">
                        {c.name} {c.is_template && '(Template)'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-center">
                <ArrowRight className="w-5 h-5 text-slate-500" />
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300">Empresa Destino</Label>
                <Select value={targetId} onValueChange={setTargetId} disabled={!sourceId}>
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                    <SelectValue placeholder="Selecione o destino" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    {availableTargets.map((c) => (
                      <SelectItem key={c.id} value={c.id} className="text-white">
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-slate-300">Itens para copiar</Label>
              <div className="grid grid-cols-2 gap-3">
                {Object.entries({
                  categories: 'Categorias',
                  subcategories: 'Subcategorias',
                  products: 'Produtos',
                  banners: 'Banners',
                  prizes: 'Prêmios',
                }).map(([key, label]) => (
                  <div key={key} className="flex items-center space-x-2">
                    <Checkbox
                      id={key}
                      checked={items[key as keyof CloneItems]}
                      onCheckedChange={(checked) =>
                        setItems({ ...items, [key]: checked === true })
                      }
                      className="border-slate-600 data-[state=checked]:bg-purple-600"
                    />
                    <Label htmlFor={key} className="text-sm text-slate-300 cursor-pointer">
                      {label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <Button
              onClick={handleClone}
              disabled={!sourceId || !targetId || sourceId === targetId || cloneMenu.isPending}
              className="w-full bg-purple-600 hover:bg-purple-700"
            >
              {cloneMenu.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Clonando...
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 mr-2" />
                  Clonar Cardápio
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </SaasLayout>
  );
}
