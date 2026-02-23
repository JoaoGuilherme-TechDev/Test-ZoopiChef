/**
 * Create Company Dialog - SaaS Admin
 * 
 * Form to create a new company with:
 * - Company name, CNPJ, Razão Social
 * - Auto-generated slug (editable)
 * - Admin username/password
 */

import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, Building2, User, Lock, CheckCircle2, XCircle, Eye, EyeOff } from 'lucide-react';
import {
  useCreateCompanyWithAdmin,
  useCheckSlugAvailability,
  useGenerateSlug,
  useValidateCNPJ,
} from '@/hooks/useSaasCompanyOnboarding';

// CNPJ mask helper
function maskCNPJ(value: string): string {
  return value
    .replace(/\D/g, '')
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
    .slice(0, 18);
}

const formSchema = z.object({
  companyName: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').max(100),
  cnpj: z.string().min(14, 'CNPJ inválido'),
  razaoSocial: z.string().min(2, 'Razão social deve ter pelo menos 2 caracteres').max(200),
  slug: z.string().min(2, 'Slug deve ter pelo menos 2 caracteres').regex(/^[a-z0-9-]+$/, 'Slug deve conter apenas letras minúsculas, números e hífens'),
  adminEmail: z.string().email('Email inválido'),
  adminPassword: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
  adminName: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface CreateCompanyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (companyId: string) => void;
}

export function CreateCompanyDialog({ open, onOpenChange, onSuccess }: CreateCompanyDialogProps) {
  const [slugStatus, setSlugStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  const [cnpjStatus, setCnpjStatus] = useState<'idle' | 'checking' | 'valid' | 'invalid'>('idle');
  const [showPassword, setShowPassword] = useState(false);

  const createCompany = useCreateCompanyWithAdmin();
  const checkSlug = useCheckSlugAvailability();
  const generateSlug = useGenerateSlug();
  const validateCNPJ = useValidateCNPJ();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      companyName: '',
      cnpj: '',
      razaoSocial: '',
      slug: '',
      adminEmail: '',
      adminPassword: '',
      adminName: '',
    },
  });

  const watchCompanyName = form.watch('companyName');
  const watchSlug = form.watch('slug');
  const watchCNPJ = form.watch('cnpj');

  // Generate slug when company name changes
  useEffect(() => {
    if (watchCompanyName && watchCompanyName.length >= 2) {
      const timeoutId = setTimeout(async () => {
        try {
          const slug = await generateSlug.mutateAsync(watchCompanyName);
          form.setValue('slug', slug);
        } catch (err) {
          console.error('Error generating slug:', err);
        }
      }, 500);

      return () => clearTimeout(timeoutId);
    }
  }, [watchCompanyName]);

  // Check slug availability when it changes
  useEffect(() => {
    if (watchSlug && watchSlug.length >= 2) {
      setSlugStatus('checking');
      const timeoutId = setTimeout(async () => {
        try {
          const available = await checkSlug.mutateAsync(watchSlug);
          setSlugStatus(available ? 'available' : 'taken');
        } catch (err) {
          setSlugStatus('idle');
        }
      }, 300);

      return () => clearTimeout(timeoutId);
    } else {
      setSlugStatus('idle');
    }
  }, [watchSlug]);

  // Validate CNPJ when it changes
  useEffect(() => {
    const cleanCNPJ = watchCNPJ.replace(/\D/g, '');
    if (cleanCNPJ.length === 14) {
      setCnpjStatus('checking');
      const timeoutId = setTimeout(async () => {
        try {
          const valid = await validateCNPJ.mutateAsync(cleanCNPJ);
          setCnpjStatus(valid ? 'valid' : 'invalid');
        } catch (err) {
          setCnpjStatus('idle');
        }
      }, 300);

      return () => clearTimeout(timeoutId);
    } else {
      setCnpjStatus('idle');
    }
  }, [watchCNPJ]);

  const handleCNPJChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const masked = maskCNPJ(e.target.value);
    form.setValue('cnpj', masked);
  };

  const onSubmit = async (data: FormData) => {
    if (slugStatus === 'taken') {
      form.setError('slug', { message: 'Este slug já está em uso' });
      return;
    }

    if (cnpjStatus === 'invalid') {
      form.setError('cnpj', { message: 'CNPJ inválido' });
      return;
    }

    try {
      console.log('[CreateCompanyDialog] Submitting:', data.companyName);
      
      const result = await createCompany.mutateAsync({
        companyName: data.companyName,
        razaoSocial: data.razaoSocial,
        slug: data.slug,
        adminEmail: data.adminEmail,
        adminPassword: data.adminPassword,
        adminName: data.adminName,
        cnpj: data.cnpj.replace(/\D/g, ''),
      });

      console.log('[CreateCompanyDialog] Result:', result);

      if (result?.company_id) {
        onSuccess?.(result.company_id);
        onOpenChange(false);
        form.reset();
        setSlugStatus('idle');
        setCnpjStatus('idle');
      }
    } catch (err: any) {
      console.error('[CreateCompanyDialog] Error:', err);
      // Error is already handled by the mutation's onError callback
      // Just reset form states if needed
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-slate-900 border-slate-700">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Criar Nova Empresa
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Preencha os dados da empresa e do usuário administrador. A empresa será criada com status "Aguardando Pagamento".
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Company Info */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-slate-300 flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Dados da Empresa
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="companyName" className="text-slate-300">Nome Fantasia</Label>
                <Input
                  id="companyName"
                  placeholder="Nome da empresa"
                  {...form.register('companyName')}
                  className="bg-slate-800 border-slate-700 text-white"
                />
                {form.formState.errors.companyName && (
                  <p className="text-xs text-red-400">{form.formState.errors.companyName.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="cnpj" className="text-slate-300">CNPJ</Label>
                <div className="relative">
                  <Input
                    id="cnpj"
                    placeholder="00.000.000/0000-00"
                    value={watchCNPJ}
                    onChange={handleCNPJChange}
                    className="bg-slate-800 border-slate-700 text-white pr-10"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {cnpjStatus === 'checking' && <Loader2 className="w-4 h-4 animate-spin text-slate-400" />}
                    {cnpjStatus === 'valid' && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                    {cnpjStatus === 'invalid' && <XCircle className="w-4 h-4 text-red-500" />}
                  </div>
                </div>
                {form.formState.errors.cnpj && (
                  <p className="text-xs text-red-400">{form.formState.errors.cnpj.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="razaoSocial" className="text-slate-300">Razão Social</Label>
              <Input
                id="razaoSocial"
                placeholder="Razão social completa"
                {...form.register('razaoSocial')}
                className="bg-slate-800 border-slate-700 text-white"
              />
              {form.formState.errors.razaoSocial && (
                <p className="text-xs text-red-400">{form.formState.errors.razaoSocial.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug" className="text-slate-300">Slug (URL)</Label>
              <div className="relative">
                <Input
                  id="slug"
                  placeholder="nome-da-empresa"
                  {...form.register('slug')}
                  className="bg-slate-800 border-slate-700 text-white pr-24"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {slugStatus === 'checking' && <Loader2 className="w-4 h-4 animate-spin text-slate-400" />}
                  {slugStatus === 'available' && (
                    <Badge className="bg-green-500/20 text-green-400 border-green-500/50">Disponível</Badge>
                  )}
                  {slugStatus === 'taken' && (
                    <Badge className="bg-red-500/20 text-red-400 border-red-500/50">Em uso</Badge>
                  )}
                </div>
              </div>
              {form.formState.errors.slug && (
                <p className="text-xs text-red-400">{form.formState.errors.slug.message}</p>
              )}
            </div>
          </div>

          {/* Admin User Info */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-slate-300 flex items-center gap-2">
              <User className="w-4 h-4" />
              Usuário Administrador
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="adminName" className="text-slate-300">Nome do Admin (opcional)</Label>
                <Input
                  id="adminName"
                  placeholder="Nome completo"
                  {...form.register('adminName')}
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="adminEmail" className="text-slate-300">Email</Label>
                <Input
                  id="adminEmail"
                  type="email"
                  placeholder="admin@empresa.com"
                  {...form.register('adminEmail')}
                  className="bg-slate-800 border-slate-700 text-white"
                />
                {form.formState.errors.adminEmail && (
                  <p className="text-xs text-red-400">{form.formState.errors.adminEmail.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="adminPassword" className="text-slate-300">Senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <Input
                  id="adminPassword"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  {...form.register('adminPassword')}
                  className="bg-slate-800 border-slate-700 text-white pl-10 pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 text-slate-400 hover:text-white"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
              {form.formState.errors.adminPassword && (
                <p className="text-xs text-red-400">{form.formState.errors.adminPassword.message}</p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="text-slate-400 hover:text-white"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={createCompany.isPending || slugStatus === 'taken' || cnpjStatus === 'invalid'}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {createCompany.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Criando...
                </>
              ) : (
                'Criar Empresa'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
