import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  useCommissionProfiles,
  useSaveCommissionProfile,
  useDeleteCommissionProfile,
  CommissionProfile,
} from '@/modules/reports/hooks/useReportsCommission';
import { Plus, Edit2, Trash2, Percent, Users } from 'lucide-react';

interface ProfileFormData {
  id?: string;
  name: string;
  description: string;
  commission_percent: number;
  is_active: boolean;
}

const defaultFormData: ProfileFormData = {
  name: '',
  description: '',
  commission_percent: 0,
  is_active: true,
};

export function CommissionProfilesManager() {
  const { data: profiles = [], isLoading } = useCommissionProfiles();
  const saveProfile = useSaveCommissionProfile();
  const deleteProfile = useDeleteCommissionProfile();

  const [formOpen, setFormOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<CommissionProfile | null>(null);
  const [formData, setFormData] = useState<ProfileFormData>(defaultFormData);

  const handleOpenForm = (profile?: CommissionProfile) => {
    if (profile) {
      setFormData({
        id: profile.id,
        name: profile.name,
        description: profile.description || '',
        commission_percent: Number(profile.commission_percent),
        is_active: profile.is_active,
      });
    } else {
      setFormData(defaultFormData);
    }
    setFormOpen(true);
  };

  const handleSave = async () => {
    await saveProfile.mutateAsync({
      id: formData.id,
      name: formData.name,
      description: formData.description || null,
      commission_percent: formData.commission_percent,
      is_active: formData.is_active,
    });
    setFormOpen(false);
    setFormData(defaultFormData);
  };

  const handleDeleteClick = (profile: CommissionProfile) => {
    setSelectedProfile(profile);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (selectedProfile) {
      await deleteProfile.mutateAsync(selectedProfile.id);
      setDeleteDialogOpen(false);
      setSelectedProfile(null);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Percent className="h-5 w-5" />
            Perfis de Comissão
          </CardTitle>
          <Button size="sm" onClick={() => handleOpenForm()}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Perfil
          </Button>
        </CardHeader>
        <CardContent>
          {profiles.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Percent className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum perfil de comissão cadastrado</p>
              <Button variant="outline" className="mt-4" onClick={() => handleOpenForm()}>
                Criar primeiro perfil
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {profiles.map((profile) => (
                <div
                  key={profile.id}
                  className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Percent className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{profile.name}</span>
                        <Badge variant={profile.is_active ? 'default' : 'secondary'}>
                          {profile.is_active ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </div>
                      {profile.description && (
                        <p className="text-sm text-muted-foreground">{profile.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <span className="text-2xl font-bold text-primary">
                        {Number(profile.commission_percent).toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenForm(profile)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteClick(profile)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Form Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {formData.id ? 'Editar Perfil' : 'Novo Perfil de Comissão'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome do Perfil</Label>
              <Input
                id="name"
                placeholder="Ex: Garçom, Caixa, Gerente..."
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Descrição (opcional)</Label>
              <Textarea
                id="description"
                placeholder="Descrição do perfil..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="commission">Taxa de Comissão (%)</Label>
              <div className="relative">
                <Input
                  id="commission"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={formData.commission_percent}
                  onChange={(e) =>
                    setFormData({ ...formData, commission_percent: parseFloat(e.target.value) || 0 })
                  }
                  className="pr-8"
                />
                <Percent className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="is_active">Perfil Ativo</Label>
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={!formData.name || saveProfile.isPending}>
              {saveProfile.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja realmente excluir o perfil "{selectedProfile?.name}"?
              Funcionários vinculados a este perfil ficarão sem perfil de comissão.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
