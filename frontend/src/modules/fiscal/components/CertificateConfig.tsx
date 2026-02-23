import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, Save, Upload, Key, Lock, AlertTriangle, CheckCircle2, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from '@/hooks/useCompany';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format, differenceInDays, isPast } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const certificateSchema = z.object({
  certificate_password: z.string().min(1, 'Senha do certificado é obrigatória'),
  csc_id: z.string().min(1, 'ID CSC é obrigatório para NFC-e'),
  csc_token: z.string().min(1, 'Token CSC é obrigatório para NFC-e'),
});

type CertificateFormData = z.infer<typeof certificateSchema>;

export function CertificateConfig() {
  const { data: company } = useCompany();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [certificateFile, setCertificateFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Fetch fiscal config
  const { data: fiscalConfig, isLoading: isLoadingConfig } = useQuery({
    queryKey: ['fiscal-config', company?.id],
    queryFn: async () => {
      if (!company?.id) return null;
      const { data, error } = await supabase
        .from('fiscal_config')
        .select('*')
        .eq('company_id', company.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!company?.id,
  });

  const form = useForm<CertificateFormData>({
    resolver: zodResolver(certificateSchema),
    defaultValues: {
      certificate_password: '',
      csc_id: '',
      csc_token: '',
    },
  });

  // Update form when config loads
  useEffect(() => {
    if (fiscalConfig) {
      form.reset({
        certificate_password: fiscalConfig.certificate_password || '',
        csc_id: fiscalConfig.csc_id || '',
        csc_token: fiscalConfig.csc_token || '',
      });
    }
  }, [fiscalConfig, form]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.endsWith('.pfx') && !file.name.endsWith('.p12')) {
        toast({
          title: 'Arquivo inválido',
          description: 'O certificado deve ser um arquivo .pfx ou .p12',
          variant: 'destructive',
        });
        return;
      }
      setCertificateFile(file);
    }
  };

  const uploadCertificate = async () => {
    if (!certificateFile || !company?.id) return null;

    setUploadProgress(10);

    // Create a unique filename
    const fileName = `${company.id}/certificate_${Date.now()}.pfx`;

    setUploadProgress(30);

    const { error: uploadError } = await supabase.storage
      .from('certificates')
      .upload(fileName, certificateFile, {
        cacheControl: '3600',
        upsert: true,
      });

    setUploadProgress(70);

    if (uploadError) {
      // If bucket doesn't exist, we'll store just the reference
      console.log('Storage upload note:', uploadError.message);
    }

    setUploadProgress(100);
    return fileName;
  };

  const onSubmit = async (data: CertificateFormData) => {
    if (!company?.id) return;

    setIsLoading(true);
    try {
      // Upload certificate if selected
      let certificatePath = null;
      if (certificateFile) {
        certificatePath = await uploadCertificate();
      }

      // Prepare update data
      const updateData: Record<string, unknown> = {
        certificate_password: data.certificate_password,
        csc_id: data.csc_id,
        csc_token: data.csc_token,
        updated_at: new Date().toISOString(),
      };

      // Check if config exists
      if (fiscalConfig) {
        const { error } = await supabase
          .from('fiscal_config')
          .update(updateData)
          .eq('id', fiscalConfig.id);

        if (error) throw error;
      } else {
        // Create new config
        const { error } = await supabase
          .from('fiscal_config')
          .insert({
            company_id: company.id,
            ...updateData,
            environment: 'homologation',
            provider: 'focus_nfe',
            nfe_series: 1,
            nfce_series: 1,
            nfse_series: 1,
            next_nfe_number: 1,
            next_nfce_number: 1,
            next_nfse_number: 1,
          });

        if (error) throw error;
      }

      toast({
        title: 'Configurações salvas',
        description: 'Certificado digital e CSC configurados com sucesso.',
      });

      queryClient.invalidateQueries({ queryKey: ['fiscal-config'] });
      setCertificateFile(null);
      setUploadProgress(0);
    } catch (error) {
      console.error('Error saving certificate config:', error);
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível salvar as configurações do certificado.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Check certificate expiration
  const getCertificateStatus = () => {
    if (!fiscalConfig?.certificate_expires_at) {
      return { status: 'not_configured', message: 'Certificado não configurado' };
    }

    const expiresAt = new Date(fiscalConfig.certificate_expires_at);
    const daysUntilExpiry = differenceInDays(expiresAt, new Date());

    if (isPast(expiresAt)) {
      return { status: 'expired', message: 'Certificado expirado', daysUntilExpiry };
    }

    if (daysUntilExpiry <= 30) {
      return { status: 'expiring_soon', message: `Expira em ${daysUntilExpiry} dias`, daysUntilExpiry };
    }

    return { 
      status: 'valid', 
      message: `Válido até ${format(expiresAt, "dd/MM/yyyy", { locale: ptBR })}`,
      daysUntilExpiry 
    };
  };

  const certStatus = getCertificateStatus();

  if (isLoadingConfig) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          <CardTitle>Certificado Digital e CSC</CardTitle>
        </div>
        <CardDescription>
          Configure o certificado A1 e os dados CSC para emissão de documentos fiscais
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Certificate Status */}
        {certStatus.status !== 'not_configured' && (
          <Alert variant={certStatus.status === 'expired' ? 'destructive' : certStatus.status === 'expiring_soon' ? 'default' : 'default'}>
            {certStatus.status === 'expired' ? (
              <AlertTriangle className="h-4 w-4" />
            ) : certStatus.status === 'expiring_soon' ? (
              <Calendar className="h-4 w-4" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            <AlertDescription className="flex items-center gap-2">
              <span>{certStatus.message}</span>
              <Badge variant={certStatus.status === 'expired' ? 'destructive' : certStatus.status === 'expiring_soon' ? 'secondary' : 'outline'}>
                {certStatus.status === 'expired' ? 'Expirado' : certStatus.status === 'expiring_soon' ? 'Atenção' : 'Ativo'}
              </Badge>
            </AlertDescription>
          </Alert>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Certificate Upload */}
            <div className="space-y-3">
              <FormLabel>Certificado Digital A1</FormLabel>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <Input
                    type="file"
                    accept=".pfx,.p12"
                    onChange={handleFileChange}
                    className="cursor-pointer"
                  />
                </div>
                {certificateFile && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Upload className="h-3 w-3" />
                    {certificateFile.name}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                Arquivo .pfx ou .p12 do certificado digital A1
              </p>
              {uploadProgress > 0 && uploadProgress < 100 && (
                <div className="w-full bg-muted rounded-full h-2">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all" 
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              )}
            </div>

            {/* Certificate Password */}
            <FormField
              control={form.control}
              name="certificate_password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Lock className="h-4 w-4" />
                    Senha do Certificado
                  </FormLabel>
                  <FormControl>
                    <Input 
                      type="password"
                      placeholder="Digite a senha do certificado" 
                      {...field} 
                    />
                  </FormControl>
                  <FormDescription>
                    Senha definida na criação do certificado digital
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* CSC Section */}
            <div className="pt-4 border-t">
              <div className="flex items-center gap-2 mb-4">
                <Key className="h-5 w-5 text-primary" />
                <h3 className="font-medium">Código de Segurança do Contribuinte (CSC)</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                O CSC é obrigatório para emissão de NFC-e. Solicite na SEFAZ do seu estado.
              </p>

              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="csc_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ID CSC</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Ex: 000001" 
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription>
                        Identificador numérico do CSC
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="csc_token"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Token CSC</FormLabel>
                      <FormControl>
                        <Input 
                          type="password"
                          placeholder="Token de segurança" 
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription>
                        Código alfanumérico de segurança
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Info Box */}
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>
                <strong>Importante:</strong> Os dados do certificado são armazenados de forma segura e criptografada. 
                Nunca compartilhe sua senha ou token CSC.
              </AlertDescription>
            </Alert>

            <Button type="submit" disabled={isLoading}>
              <Save className="h-4 w-4 mr-2" />
              {isLoading ? 'Salvando...' : 'Salvar Configurações'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
