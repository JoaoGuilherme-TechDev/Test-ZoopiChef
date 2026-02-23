import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Building2, Plus, Edit, Trash2, CheckCircle, XCircle, ShieldCheck, Upload } from 'lucide-react';
import { useCompanyBranches } from '../hooks/useCompanyBranches';
import { CompanyBranchDialog } from './CompanyBranchDialog';
import { CertificateUploadDialog } from './CertificateUploadDialog';
import type { CompanyBranch } from '../types/company-branch';
import { REGIME_TRIBUTARIO_LABELS } from '../types/company-branch';
import { formatCNPJ } from '@/lib/formatters';
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

export function CompanyBranchManager() {
  const { branches, isLoading, deleteBranch, toggleBranchActive } = useCompanyBranches();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [certificateDialogOpen, setCertificateDialogOpen] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<CompanyBranch | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [branchToDelete, setBranchToDelete] = useState<CompanyBranch | null>(null);

  const handleEdit = (branch: CompanyBranch) => {
    setSelectedBranch(branch);
    setDialogOpen(true);
  };

  const handleCertificate = (branch: CompanyBranch) => {
    setSelectedBranch(branch);
    setCertificateDialogOpen(true);
  };

  const handleDelete = (branch: CompanyBranch) => {
    setBranchToDelete(branch);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (branchToDelete) {
      deleteBranch.mutate(branchToDelete.id);
    }
    setDeleteDialogOpen(false);
    setBranchToDelete(null);
  };

  const handleToggleActive = (branch: CompanyBranch) => {
    toggleBranchActive.mutate({ branchId: branch.id, isActive: !branch.is_active });
  };

  const isCertificateValid = (branch: CompanyBranch) => {
    if (!branch.certificado_base64 || !branch.certificado_validade) return false;
    return new Date(branch.certificado_validade) > new Date();
  };

  const isCertificateExpiringSoon = (branch: CompanyBranch) => {
    if (!branch.certificado_validade) return false;
    const expiryDate = new Date(branch.certificado_validade);
    const daysUntilExpiry = Math.ceil((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry > 0 && daysUntilExpiry <= 30;
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Building2 className="w-6 h-6" />
            Empresas Fiscais (Multi-CNPJ)
          </h2>
          <p className="text-muted-foreground">
            Gerencie os CNPJs vinculados para emissão fiscal isolada por PDV
          </p>
        </div>
        <Button onClick={() => { setSelectedBranch(null); setDialogOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" />
          Nova Empresa
        </Button>
      </div>

      {branches.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">Nenhuma empresa fiscal cadastrada</p>
            <p className="text-muted-foreground mb-4">
              Cadastre seu primeiro CNPJ para habilitar a emissão de NF-e e NFC-e
            </p>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Cadastrar Empresa
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {branches.map((branch) => (
            <Card key={branch.id} className={!branch.is_active ? 'opacity-60' : ''}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg flex items-center gap-2">
                      {branch.razao_social}
                      {branch.is_active ? (
                        <Badge variant="default" className="ml-2">Ativa</Badge>
                      ) : (
                        <Badge variant="secondary" className="ml-2">Inativa</Badge>
                      )}
                    </CardTitle>
                    <CardDescription>
                      {branch.nome_fantasia && <span>{branch.nome_fantasia} • </span>}
                      CNPJ: {formatCNPJ(branch.cnpj)}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">IE:</span>{' '}
                    {branch.inscricao_estadual || 'Não informada'}
                  </div>
                  <div>
                    <span className="text-muted-foreground">IM:</span>{' '}
                    {branch.inscricao_municipal || 'Não informada'}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Regime:</span>{' '}
                    {REGIME_TRIBUTARIO_LABELS[branch.regime_tributario as keyof typeof REGIME_TRIBUTARIO_LABELS] || branch.regime_tributario}
                  </div>
                  <div>
                    <span className="text-muted-foreground">CRT:</span>{' '}
                    {branch.crt}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">NFE:</span>{' '}
                    Série {branch.nfe_serie} / Próxima: {branch.nfe_proximo_numero}
                  </div>
                  <div>
                    <span className="text-muted-foreground">NFCE:</span>{' '}
                    Série {branch.nfce_serie} / Próxima: {branch.nfce_proximo_numero}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Certificado:</span>
                  {isCertificateValid(branch) ? (
                    <Badge variant="default" className="gap-1">
                      <CheckCircle className="w-3 h-3" />
                      Válido
                      {isCertificateExpiringSoon(branch) && ' (expirando em breve)'}
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="gap-1">
                      <XCircle className="w-3 h-3" />
                      {branch.certificado_base64 ? 'Expirado' : 'Não configurado'}
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">CSC:</span>
                  {branch.csc_id && branch.csc_token ? (
                    <Badge variant="default" className="gap-1">
                      <ShieldCheck className="w-3 h-3" />
                      Configurado
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="gap-1">
                      <XCircle className="w-3 h-3" />
                      Não configurado
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-2 border-t">
                  <Button variant="outline" size="sm" onClick={() => handleEdit(branch)}>
                    <Edit className="w-4 h-4 mr-1" />
                    Editar
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleCertificate(branch)}>
                    <Upload className="w-4 h-4 mr-1" />
                    Certificado
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleToggleActive(branch)}
                  >
                    {branch.is_active ? 'Desativar' : 'Ativar'}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleDelete(branch)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <CompanyBranchDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        branch={selectedBranch}
      />

      <CertificateUploadDialog
        open={certificateDialogOpen}
        onOpenChange={setCertificateDialogOpen}
        branch={selectedBranch}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir empresa fiscal?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Certifique-se de que não existem documentos fiscais emitidos por esta empresa.
              <br /><br />
              <strong>{branchToDelete?.razao_social}</strong>
              <br />
              CNPJ: {branchToDelete?.cnpj}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
