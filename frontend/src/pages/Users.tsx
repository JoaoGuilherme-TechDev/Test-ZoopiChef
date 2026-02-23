import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useCompanyUsers, useCompany } from '@/hooks/useCompany';
import { useUserRole, useSetUserRole } from '@/hooks/useProfile';
import { useCompanyProfiles, useAssignProfileToUser } from '@/hooks/useCompanyProfiles';
import { useUserRoles } from '@/hooks/useUserRoles';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { 
  Users as UsersIcon, 
  UserCog, 
  Building2, 
  Search,
  Shield,
  ShieldCheck,
  UserPlus,
  Mail,
  MoreVertical,
  XCircle,
  Info,
  Briefcase,
  AlertTriangle,
  KeyRound
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { CreateUserDialog } from '@/components/users/CreateUserDialog';
import { ResetPasswordDialog } from '@/components/users/ResetPasswordDialog';
import { useQueryClient } from '@tanstack/react-query';

export default function Users() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: company, isLoading: companyLoading } = useCompany();
  const { data: userRole, isLoading: roleLoading } = useUserRole();
  const { data: users, isLoading: usersLoading } = useCompanyUsers();
  const { data: companyProfiles } = useCompanyProfiles();
  const { isSuperAdmin, isLoading: rolesLoading } = useUserRoles();
  const setUserRole = useSetUserRole();
  const assignProfile = useAssignProfileToUser();
  
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [resetPasswordUser, setResetPasswordUser] = useState<{ id: string; full_name: string } | null>(null);

  const handleUserCreated = () => {
    queryClient.invalidateQueries({ queryKey: ['companyUsers'] });
  };

  // SUPER_ADMIN has full access, company admin also has access
  const isAdmin = isSuperAdmin || userRole?.role === 'admin';
  const isLoading = companyLoading || usersLoading || roleLoading || rolesLoading;

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleRoleChange = async (userId: string, newRole: 'admin' | 'employee') => {
    try {
      await setUserRole.mutateAsync({ userId, role: newRole });
      toast.success('Permissão atualizada com sucesso!');
    } catch (error) {
      toast.error('Erro ao atualizar permissão');
    }
  };

  const handleProfileChange = async (userId: string, profileId: string) => {
    try {
      await assignProfile.mutateAsync({ userId, profileId: profileId === 'none' ? null : profileId });
      toast.success('Perfil de acesso atualizado!');
    } catch (error) {
      toast.error('Erro ao atualizar perfil de acesso');
    }
  };

  const filteredUsers = users?.filter((u: any) => {
    const matchesSearch = 
      u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase());
    
    if (roleFilter === 'all') return matchesSearch;
    const role = u.user_roles?.[0]?.role || 'employee';
    return matchesSearch && role === roleFilter;
  }) || [];

  // Stats
  const stats = {
    total: users?.length || 0,
    admins: users?.filter((u: any) => u.user_roles?.[0]?.role === 'admin').length || 0,
    employees: users?.filter((u: any) => !u.user_roles?.[0]?.role || u.user_roles?.[0]?.role === 'employee').length || 0,
  };

  if (isLoading) {
    return (
      <DashboardLayout title="Usuários">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  // SUPER_ADMIN doesn't need a company to access users module
  if (!company && !isSuperAdmin) {
    return (
      <DashboardLayout title="Usuários">
        <Card className="max-w-lg mx-auto border-warning/30 bg-warning/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-display">
              <Building2 className="w-5 h-5 text-warning" />
              Empresa não configurada
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Configure sua empresa primeiro para gerenciar usuários.
            </p>
            <Button onClick={() => navigate('/company')}>
              Configurar empresa
            </Button>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  // While role is still loading, show loading state instead of "restricted access"
  if (roleLoading) {
    return (
      <DashboardLayout title="Usuários">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!isAdmin) {
    return (
      <DashboardLayout title="Usuários">
        <Card className="max-w-lg mx-auto border-destructive/30 bg-destructive/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-display">
              <Shield className="w-5 h-5 text-destructive" />
              Acesso restrito
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Apenas administradores podem gerenciar usuários.
            </p>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Usuários">
      <div className="space-y-6 animate-fade-in">
        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="border-border/50 shadow-soft">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <UsersIcon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-xs text-muted-foreground">Total</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-border/50 shadow-soft">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.admins}</p>
                  <p className="text-xs text-muted-foreground">Administradores</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-border/50 shadow-soft">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <UserCog className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.employees}</p>
                  <p className="text-xs text-muted-foreground">Funcionários</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Info Alert */}
        <Alert>
          <Info className="w-4 h-4" />
          <AlertDescription>
            <strong>Administradores</strong> têm acesso total ao sistema. <strong>Funcionários</strong> podem gerenciar pedidos e produtos, mas não configurações.
          </AlertDescription>
        </Alert>

        {/* Users Table */}
        <Card className="border-border/50 shadow-soft">
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-info/10 rounded-xl flex items-center justify-center">
                  <UsersIcon className="w-6 h-6 text-info" />
                </div>
                <div>
                  <CardTitle className="font-display">Usuários da Empresa</CardTitle>
                  <CardDescription>
                    Gerencie permissões e acessos
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Button onClick={() => setCreateDialogOpen(true)}>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Novo Usuário
                </Button>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Filtrar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="admin">Administradores</SelectItem>
                    <SelectItem value="employee">Funcionários</SelectItem>
                  </SelectContent>
                </Select>
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar usuário..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filteredUsers.length > 0 ? (
              <div className="space-y-3">
                {filteredUsers.map((userProfile: any) => {
                  const role = userProfile.user_roles?.[0]?.role || 'employee';
                  const userCompanyProfileId = userProfile.user_roles?.[0]?.company_profile_id;
                  const isCurrentUser = userProfile.id === user?.id;

                  return (
                    <div
                      key={userProfile.id}
                      className="flex items-center gap-4 p-4 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <Avatar className="h-12 w-12">
                        <AvatarFallback className="bg-primary/10 text-primary font-medium">
                          {getInitials(userProfile.full_name)}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium truncate">{userProfile.full_name}</p>
                          {isCurrentUser && (
                            <Badge variant="outline" className="text-xs">
                              Você
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Mail className="w-3 h-3" />
                          <p className="truncate">{userProfile.email}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Role Select */}
                        {isCurrentUser ? (
                          <Badge 
                            variant={role === 'admin' ? 'default' : 'secondary'}
                            className="min-w-[120px] justify-center"
                          >
                            {role === 'admin' ? (
                              <>
                                <ShieldCheck className="w-3 h-3 mr-1" />
                                Administrador
                              </>
                            ) : (
                              <>
                                <UserCog className="w-3 h-3 mr-1" />
                                Funcionário
                              </>
                            )}
                          </Badge>
                        ) : (
                          <Select
                            value={role}
                            onValueChange={(value: 'admin' | 'employee') => 
                              handleRoleChange(userProfile.id, value)
                            }
                            disabled={setUserRole.isPending}
                          >
                            <SelectTrigger className="w-[130px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="admin">
                                <div className="flex items-center gap-2">
                                  <ShieldCheck className="w-4 h-4 text-purple-600" />
                                  Administrador
                                </div>
                              </SelectItem>
                              <SelectItem value="employee">
                                <div className="flex items-center gap-2">
                                  <UserCog className="w-4 h-4 text-blue-600" />
                                  Funcionário
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        )}

                        {/* Company Profile Select */}
                        {!isCurrentUser && role !== 'admin' && companyProfiles && companyProfiles.length > 0 && (
                          <Select
                            value={userCompanyProfileId || 'none'}
                            onValueChange={(value) => handleProfileChange(userProfile.id, value)}
                            disabled={assignProfile.isPending}
                          >
                            <SelectTrigger className="w-[140px]">
                              <div className="flex items-center gap-2">
                                <Briefcase className="w-3 h-3" />
                                <SelectValue placeholder="Perfil" />
                              </div>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Sem perfil</SelectItem>
                              {companyProfiles.map((profile) => (
                                <SelectItem key={profile.id} value={profile.id}>
                                  {profile.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}

                        {!isCurrentUser && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem 
                                onClick={() => setResetPasswordUser({ 
                                  id: userProfile.id, 
                                  full_name: userProfile.full_name 
                                })}
                              >
                                <KeyRound className="w-4 h-4 mr-2" />
                                Redefinir Senha
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-muted-foreground">
                                <Mail className="w-4 h-4 mr-2" />
                                Enviar email
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-destructive">
                                <XCircle className="w-4 h-4 mr-2" />
                                Desativar usuário
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <UsersIcon className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                <p className="text-muted-foreground">
                  {search ? 'Nenhum usuário encontrado com esse filtro' : 'Nenhum usuário encontrado'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Create User Dialog */}
        <CreateUserDialog 
          open={createDialogOpen} 
          onOpenChange={setCreateDialogOpen}
          onSuccess={handleUserCreated}
        />

        {/* Reset Password Dialog */}
        <ResetPasswordDialog 
          open={!!resetPasswordUser} 
          onOpenChange={(open) => !open && setResetPasswordUser(null)}
          user={resetPasswordUser}
        />
      </div>
    </DashboardLayout>
  );
}
