import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useTVScreens } from '@/hooks/useTVScreens';
import { useProfile } from '@/hooks/useProfile';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Plus, Tv, Copy, ExternalLink, Trash2, Loader2, RefreshCw } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';

export default function TVScreens() {
  const { data: profile } = useProfile();
  const { tvScreens, isLoading, createTVScreen, updateTVScreen, deleteTVScreen, regenerateToken } = useTVScreens();
  const [newTVName, setNewTVName] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);

  const baseUrl = window.location.origin;

  const handleCreate = async () => {
    if (!newTVName.trim()) {
      toast.error('Digite um nome para a TV');
      return;
    }

    if (!profile?.company_id) {
      toast.error('Empresa não encontrada');
      return;
    }

    setIsCreating(true);
    try {
      await createTVScreen.mutateAsync({
        name: newTVName.trim(),
        company_id: profile.company_id,
      });
      toast.success('TV criada com sucesso!');
      setNewTVName('');
      setIsDialogOpen(false);
    } catch (error) {
      toast.error('Erro ao criar TV');
    } finally {
      setIsCreating(false);
    }
  };

  const handleToggleActive = async (id: string, active: boolean) => {
    try {
      await updateTVScreen.mutateAsync({ id, active });
      toast.success(active ? 'TV ativada' : 'TV desativada');
    } catch (error) {
      toast.error('Erro ao atualizar TV');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteTVScreen.mutateAsync(id);
      toast.success('TV excluída com sucesso');
    } catch (error) {
      toast.error('Erro ao excluir TV');
    }
  };

  const copyLink = (token: string) => {
    const url = `${baseUrl}/tv/${token}`;
    navigator.clipboard.writeText(url);
    toast.success('Link copiado!');
  };

  const openLink = (token: string) => {
    window.open(`${baseUrl}/tv/${token}`, '_blank');
  };

  const handleRegenerateToken = async (tvId: string) => {
    if (!profile?.company_id) return;
    
    setRegeneratingId(tvId);
    try {
      await regenerateToken.mutateAsync({
        tvScreenId: tvId,
        companyId: profile.company_id,
      });
      toast.success('Token regenerado com sucesso!');
    } catch (error) {
      toast.error('Erro ao regenerar token');
    } finally {
      setRegeneratingId(null);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">TVs</h1>
            <p className="text-muted-foreground">
              Gerencie as telas de TV da sua empresa
            </p>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Nova TV
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Adicionar Nova TV</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="tv-name">Nome da TV</Label>
                  <Input
                    id="tv-name"
                    placeholder="Ex: TV Salão Principal"
                    value={newTVName}
                    onChange={(e) => setNewTVName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                  />
                </div>
                <Button 
                  onClick={handleCreate} 
                  className="w-full"
                  disabled={isCreating}
                >
                  {isCreating ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4 mr-2" />
                  )}
                  Criar TV
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : tvScreens.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Tv className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Nenhuma TV cadastrada</h3>
              <p className="text-muted-foreground text-center mb-4">
                Adicione telas de TV para exibir seu cardápio
              </p>
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Adicionar TV
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {tvScreens.map((tv) => (
              <Card key={tv.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Tv className="w-5 h-5 text-primary" />
                      </div>
                      <CardTitle className="text-lg">{tv.name}</CardTitle>
                    </div>
                    <Switch
                      checked={tv.active}
                      onCheckedChange={(checked) => handleToggleActive(tv.id, checked)}
                    />
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 p-2 rounded-md bg-muted text-sm font-mono truncate">
                    <span className="truncate">/tv/{tv.token}</span>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => copyLink(tv.token)}
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      Copiar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => openLink(tv.token)}
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Abrir
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm"
                          disabled={regeneratingId === tv.id}
                        >
                          {regeneratingId === tv.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <RefreshCw className="w-4 h-4" />
                          )}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Regenerar Token?</AlertDialogTitle>
                          <AlertDialogDescription>
                            O link atual da TV "{tv.name}" deixará de funcionar. 
                            Um novo token será gerado e você precisará atualizar o link na TV.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleRegenerateToken(tv.id)}>
                            Regenerar
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Excluir TV?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta ação não pode ser desfeita. A TV "{tv.name}" será removida permanentemente.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(tv.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Excluir
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
