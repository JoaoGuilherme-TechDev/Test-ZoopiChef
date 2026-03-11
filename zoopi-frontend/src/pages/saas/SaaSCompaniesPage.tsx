/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { useCompanyContext } from "@/contexts/CompanyContext";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { 
  Building2, 
  Plus, 
  Search, 
  ExternalLink, 
  MoreVertical, 
  ShieldAlert, 
  CheckCircle2,
  Globe,
  Loader2,
  Trash2,
  Pencil
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function SaaSCompaniesPage() {
  const queryClient = useQueryClient();
  const { switchCompany } = useCompanyContext();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Estado para nova empresa
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    cnpj: "",
    is_active: true
  });

  // 1. Busca todas as empresas do sistema
  const { data: companies = [], isLoading } = useQuery({
    queryKey: ["admin-all-companies"],
    queryFn: async () => {
      const res = await api.get("/companies");
      return res.data;
    }
  });

  // 2. Mutação para criar nova empresa
  const createCompany = useMutation({
    mutationFn: (data: typeof formData) => api.post("/companies", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-all-companies"] });
      toast.success("Empresa cadastrada com sucesso!");
      setIsModalOpen(false);
      setFormData({ name: "", slug: "", cnpj: "", is_active: true });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Erro ao cadastrar empresa.");
    }
  });

  // Lógica de filtro
  const filteredCompanies = companies.filter((c: any) => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.slug.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Auto-gera o slug baseado no nome
  const handleNameChange = (name: string) => {
    const slug = name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    setFormData({ ...formData, name, slug });
  };

  return (
    <DashboardLayout title="Gestão de Empresas">
      <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in duration-500">
        
        {/* Cabeçalho */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tighter">Unidades Cadastradas</h1>
            <p className="text-sm text-muted-foreground">Gerencie os tenants e o acesso dos clientes.</p>
          </div>
          <Button onClick={() => setIsModalOpen(true)} className="btn-neon gap-2 h-11 px-6">
            <Plus className="w-4 h-4" /> Nova Empresa
          </Button>
        </div>

        {/* KPIs Rápidos */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="glass-card border-none bg-card/50">
            <CardContent className="p-6">
              <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-1">Total de Unidades</p>
              <p className="text-3xl font-black">{companies.length}</p>
            </CardContent>
          </Card>
          <Card className="glass-card border-none bg-card/50">
            <CardContent className="p-6">
              <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-1">Ativas</p>
              <p className="text-3xl font-black text-emerald-500">
                {companies.filter((c: any) => c.is_active).length}
              </p>
            </CardContent>
          </Card>
          <Card className="glass-card border-none bg-card/50">
            <CardContent className="p-6">
              <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-1">Bloqueadas</p>
              <p className="text-3xl font-black text-red-500">
                {companies.filter((c: any) => !c.is_active).length}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Busca */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Filtrar por nome ou slug..." 
            className="pl-11 h-12 bg-card border-white/5 rounded-2xl focus:border-primary/50"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Tabela de Empresas */}
        <Card className="panel border-none">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-xs font-bold uppercase tracking-widest opacity-50">Buscando Empresas...</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-white/5 border-b border-white/5">
                    <tr>
                      <th className="p-4 text-[10px] font-black uppercase tracking-widest opacity-50">Empresa</th>
                      <th className="p-4 text-[10px] font-black uppercase tracking-widest opacity-50">Slug / URL</th>
                      <th className="p-4 text-[10px] font-black uppercase tracking-widest opacity-50 text-center">Status</th>
                      <th className="p-4 text-[10px] font-black uppercase tracking-widest opacity-50 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredCompanies.map((c: any) => (
                      <tr key={c.id} className="group hover:bg-white/[0.02] transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center border border-white/10 overflow-hidden">
                              {c.logo_url ? (
                                <img src={c.logo_url} alt={c.name} className="h-full w-full object-cover" />
                              ) : (
                                <Building2 className="h-5 w-5 text-muted-foreground" />
                              )}
                            </div>
                            <div className="flex flex-col">
                              <span className="text-sm font-bold">{c.name}</span>
                              <span className="text-[10px] text-muted-foreground uppercase font-medium">{c.cnpj || "Sem CNPJ"}</span>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-1.5">
                            <Globe className="w-3 h-3 text-primary/60" />
                            <code className="text-xs text-primary font-mono font-bold">/{c.slug}</code>
                          </div>
                        </td>
                        <td className="p-4 text-center">
                          <Badge variant={c.is_active ? "default" : "destructive"} className="text-[9px] uppercase">
                            {c.is_active ? "Ativa" : "Bloqueada"}
                          </Badge>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-xs font-bold gap-2 text-primary hover:bg-primary/10"
                              onClick={() => {
                                switchCompany(c.slug);
                                toast.info(`Acessando contexto: ${c.name}`);
                              }}
                            >
                              <ExternalLink className="w-3.5 h-3.5" /> Acessar
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg opacity-50 hover:opacity-100">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Modal de Criação */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="max-w-md bg-card border-white/10 rounded-3xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-black uppercase tracking-tight">Nova Unidade</DialogTitle>
              <DialogDescription className="text-xs uppercase font-bold tracking-widest opacity-60">
                Cadastre um novo cliente no ecossistema Zoopi.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest">Nome do Estabelecimento *</Label>
                <Input 
                  placeholder="Ex: Pizzaria Napolitana" 
                  value={formData.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest">URL Personalizada (Slug) *</Label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input 
                    placeholder="pizzaria-napolitana" 
                    className="pl-9 font-mono text-sm"
                    value={formData.slug}
                    onChange={(e) => setFormData({...formData, slug: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest">CNPJ (Opcional)</Label>
                <Input 
                  placeholder="00.000.000/0000-00" 
                  value={formData.cnpj}
                  onChange={(e) => setFormData({...formData, cnpj: e.target.value})}
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black uppercase tracking-widest">Ativar Imediatamente</span>
                  <span className="text-[9px] text-muted-foreground uppercase">Acesso liberado após criação</span>
                </div>
                <Switch 
                  checked={formData.is_active}
                  onCheckedChange={(v) => setFormData({...formData, is_active: v})}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="ghost" onClick={() => setIsModalOpen(false)} className="uppercase text-[10px] font-black tracking-widest">Cancelar</Button>
              <Button 
                onClick={() => createCompany.mutate(formData)} 
                disabled={createCompany.isPending || !formData.name || !formData.slug}
                className="btn-neon px-8"
              >
                {createCompany.isPending ? <Loader2 className="animate-spin h-4 w-4" /> : "Cadastrar Empresa"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}