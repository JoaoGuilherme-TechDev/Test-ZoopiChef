import { useState, useMemo } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  useCompanyProfiles, 
  useCreateCompanyProfile, 
  useUpdateCompanyProfile, 
  useDeleteCompanyProfile,
  PERMISSION_GROUPS,
  PERMISSION_TYPES,
  PERMISSION_TYPE_LABELS,
  getAllPermissionKeysOfType,
  countPermissionsByType,
  CompanyProfile,
  PermissionType
} from '@/hooks/useCompanyProfiles';
import { Loader2, Plus, Pencil, Trash2, Shield, Users, Eye, Edit, Trash, CheckSquare } from 'lucide-react';

const PROFILE_TYPE_LABELS: Record<string, string> = {
  admin: 'Administrador',
  gerente: 'Gerente',
  caixa: 'Caixa',
  atendente: 'Atendente',
  entregador: 'Entregador',
};

const PROFILE_TYPE_COLORS: Record<string, string> = {
  admin: 'bg-destructive/10 text-destructive',
  gerente: 'bg-primary/10 text-primary',
  caixa: 'bg-success/10 text-success',
  atendente: 'bg-info/10 text-info',
  entregador: 'bg-warning/10 text-warning',
};

interface ProfileFormData {
  name: string;
  profile_type: CompanyProfile['profile_type'];
  description: string;
  permissions: Record<string, boolean>;
}

const defaultFormData: ProfileFormData = {
  name: '',
  profile_type: 'atendente',
  description: '',
  permissions: {},
};

export default function Profiles() {
  const { data: profiles, isLoading } = useCompanyProfiles();
  const createProfile = useCreateCompanyProfile();
  const updateProfile = useUpdateCompanyProfile();
  const deleteProfile = useDeleteCompanyProfile();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<CompanyProfile | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [formData, setFormData] = useState<ProfileFormData>(defaultFormData);

  const handleOpenCreate = () => {
    setEditingProfile(null);
    setFormData(defaultFormData);
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (profile: CompanyProfile) => {
    setEditingProfile(profile);
    setFormData({
      name: profile.name,
      profile_type: profile.profile_type,
      description: profile.description || '',
      permissions: profile.permissions || {},
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (editingProfile) {
      await updateProfile.mutateAsync({
        id: editingProfile.id,
        ...formData,
      });
    } else {
      await createProfile.mutateAsync(formData);
    }
    setIsDialogOpen(false);
    setFormData(defaultFormData);
    setEditingProfile(null);
  };

  const handleDelete = async (id: string) => {
    await deleteProfile.mutateAsync(id);
    setDeleteConfirm(null);
  };

  const togglePermission = (key: string, type: PermissionType) => {
    const permKey = `${key}_${type}`;
    setFormData(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [permKey]: !prev.permissions[permKey],
      },
    }));
  };

  const toggleAllOfType = (type: PermissionType) => {
    const allKeysOfType = getAllPermissionKeysOfType(type);
    const allEnabled = allKeysOfType.every(key => formData.permissions[key]);
    
    const newPerms = { ...formData.permissions };
    allKeysOfType.forEach(key => {
      newPerms[key] = !allEnabled;
    });
    setFormData(prev => ({ ...prev, permissions: newPerms }));
  };

  const toggleAllForGroup = (groupItems: { key: string }[], type: PermissionType) => {
    const groupKeys = groupItems.map(item => `${item.key}_${type}`);
    const allEnabled = groupKeys.every(key => formData.permissions[key]);
    
    const newPerms = { ...formData.permissions };
    groupKeys.forEach(key => {
      newPerms[key] = !allEnabled;
    });
    setFormData(prev => ({ ...prev, permissions: newPerms }));
  };

  const toggleAllForItem = (itemKey: string) => {
    const itemKeys = PERMISSION_TYPES.map(type => `${itemKey}_${type}`);
    const allEnabled = itemKeys.every(key => formData.permissions[key]);
    
    const newPerms = { ...formData.permissions };
    itemKeys.forEach(key => {
      newPerms[key] = !allEnabled;
    });
    setFormData(prev => ({ ...prev, permissions: newPerms }));
  };

  // Count permissions by type for summary
  const permissionCounts = useMemo(() => {
    return countPermissionsByType(formData.permissions);
  }, [formData.permissions]);

  if (isLoading) {
    return (
      <DashboardLayout title="Perfis de Acesso">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Perfis de Acesso">
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <Card className="border-border/50 shadow-soft bg-gradient-to-br from-primary/5 to-transparent">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 gradient-primary rounded-xl flex items-center justify-center shadow-glow">
                  <Shield className="w-6 h-6 text-primary-foreground" />
                </div>
                <div>
                  <CardTitle className="font-display">Perfis de Acesso</CardTitle>
                  <CardDescription>
                    Crie perfis personalizados com permissões específicas para cada função
                  </CardDescription>
                </div>
              </div>
              <Button onClick={handleOpenCreate}>
                <Plus className="w-4 h-4 mr-2" />
                Novo Perfil
              </Button>
            </div>
          </CardHeader>
        </Card>

        {/* Lista de Perfis */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {profiles?.map((profile) => {
            const counts = countPermissionsByType(profile.permissions || {});
            return (
              <Card key={profile.id} className="border-border/50 shadow-soft hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-lg">{profile.name}</CardTitle>
                      <Badge className={PROFILE_TYPE_COLORS[profile.profile_type]}>
                        {PROFILE_TYPE_LABELS[profile.profile_type]}
                      </Badge>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(profile)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="text-destructive hover:text-destructive"
                        onClick={() => setDeleteConfirm(profile.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {profile.description && (
                    <p className="text-sm text-muted-foreground mb-3">{profile.description}</p>
                  )}
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">Permissões:</p>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline" className="text-xs flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        Ver: {counts.view}
                      </Badge>
                      <Badge variant="outline" className="text-xs flex items-center gap-1">
                        <Edit className="w-3 h-3" />
                        Alterar: {counts.edit}
                      </Badge>
                      <Badge variant="outline" className="text-xs flex items-center gap-1">
                        <Trash className="w-3 h-3" />
                        Excluir: {counts.delete}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {profiles?.length === 0 && (
            <Card className="col-span-full border-dashed">
              <CardContent className="py-12 text-center">
                <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold mb-2">Nenhum perfil criado</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Crie perfis para definir permissões específicas para cada função na sua empresa
                </p>
                <Button onClick={handleOpenCreate}>
                  <Plus className="w-4 h-4 mr-2" />
                  Criar Primeiro Perfil
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Dialog de Criação/Edição */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>{editingProfile ? 'Editar Perfil' : 'Novo Perfil'}</DialogTitle>
            <DialogDescription>
              {editingProfile 
                ? 'Atualize as informações e permissões deste perfil'
                : 'Crie um novo perfil de acesso com permissões personalizadas'}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-hidden flex flex-col space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Nome do Perfil</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Ex: Gerente de Loja"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Tipo de Perfil</Label>
                <Select
                  value={formData.profile_type}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, profile_type: v as any }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PROFILE_TYPE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição (opcional)</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Descreva as responsabilidades deste perfil..."
                rows={2}
              />
            </div>

            {/* Global "Select All" buttons */}
            <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
              <span className="text-sm font-medium mr-2">Marcar Todos:</span>
              {PERMISSION_TYPES.map(type => {
                const allKeysOfType = getAllPermissionKeysOfType(type);
                const allEnabled = allKeysOfType.every(key => formData.permissions[key]);
                return (
                  <Button
                    key={type}
                    type="button"
                    variant={allEnabled ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleAllOfType(type)}
                    className="flex items-center gap-1"
                  >
                    {type === 'view' && <Eye className="w-3 h-3" />}
                    {type === 'edit' && <Edit className="w-3 h-3" />}
                    {type === 'delete' && <Trash className="w-3 h-3" />}
                    {PERMISSION_TYPE_LABELS[type]}
                    {allEnabled && <CheckSquare className="w-3 h-3 ml-1" />}
                  </Button>
                );
              })}
              <div className="ml-auto text-xs text-muted-foreground">
                Ver: {permissionCounts.view} | Alterar: {permissionCounts.edit} | Excluir: {permissionCounts.delete}
              </div>
            </div>

            {/* Permissions Grid */}
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-6">
                {PERMISSION_GROUPS.map((group) => (
                  <div key={group.group} className="space-y-3">
                    <div className="flex items-center justify-between sticky top-0 bg-background py-2">
                      <h4 className="font-semibold text-sm text-foreground">{group.group}</h4>
                      <div className="flex gap-1">
                        {PERMISSION_TYPES.map(type => {
                          const groupKeys = group.items.map(item => `${item.key}_${type}`);
                          const allEnabled = groupKeys.every(key => formData.permissions[key]);
                          return (
                            <Button
                              key={type}
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleAllForGroup(group.items, type)}
                              className={`text-xs px-2 ${allEnabled ? 'bg-primary/10 text-primary' : ''}`}
                            >
                              {type === 'view' && <Eye className="w-3 h-3 mr-1" />}
                              {type === 'edit' && <Edit className="w-3 h-3 mr-1" />}
                              {type === 'delete' && <Trash className="w-3 h-3 mr-1" />}
                              {allEnabled ? '✓' : ''}
                            </Button>
                          );
                        })}
                      </div>
                    </div>
                    
                    {/* Table-like grid for permissions */}
                    <div className="border rounded-lg overflow-hidden">
                      {/* Header */}
                      <div className="grid grid-cols-[1fr,80px,80px,80px,60px] gap-2 p-2 bg-muted/50 text-xs font-medium">
                        <div>Menu</div>
                        <div className="text-center">Ver</div>
                        <div className="text-center">Alterar</div>
                        <div className="text-center">Excluir</div>
                        <div className="text-center">Todos</div>
                      </div>
                      
                      {/* Rows */}
                      {group.items.map((item) => {
                        const allEnabled = PERMISSION_TYPES.every(
                          type => formData.permissions[`${item.key}_${type}`]
                        );
                        return (
                          <div 
                            key={item.key}
                            className="grid grid-cols-[1fr,80px,80px,80px,60px] gap-2 p-2 border-t items-center hover:bg-muted/30"
                          >
                            <div className="text-sm">{item.label}</div>
                            {PERMISSION_TYPES.map(type => (
                              <div key={type} className="flex justify-center">
                                <Checkbox
                                  checked={formData.permissions[`${item.key}_${type}`] || false}
                                  onCheckedChange={() => togglePermission(item.key, type)}
                                />
                              </div>
                            ))}
                            <div className="flex justify-center">
                              <Checkbox
                                checked={allEnabled}
                                onCheckedChange={() => toggleAllForItem(item.key)}
                                className={allEnabled ? 'bg-primary border-primary' : ''}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <Separator />
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={!formData.name || createProfile.isPending || updateProfile.isPending}
            >
              {(createProfile.isPending || updateProfile.isPending) && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              {editingProfile ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmação de Exclusão */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Perfil?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Usuários vinculados a este perfil perderão suas permissões.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteProfile.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
