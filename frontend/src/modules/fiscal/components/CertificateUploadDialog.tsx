import { useState, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Upload, ShieldCheck, AlertTriangle } from 'lucide-react';
import { useCompanyBranches } from '../hooks/useCompanyBranches';
import type { CompanyBranch } from '../types/company-branch';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface CertificateUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branch: CompanyBranch | null;
}

export function CertificateUploadDialog({ open, onOpenChange, branch }: CertificateUploadDialogProps) {
  const { uploadCertificate } = useCompanyBranches();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [password, setPassword] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.endsWith('.pfx') && !file.name.endsWith('.p12')) {
        setError('O arquivo deve ser um certificado A1 (.pfx ou .p12)');
        return;
      }
      setSelectedFile(file);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!branch || !selectedFile || !password || !validUntil) {
      setError('Preencha todos os campos obrigatórios');
      return;
    }

    try {
      // Convert file to base64
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = (reader.result as string).split(',')[1];
        
        await uploadCertificate.mutateAsync({
          branchId: branch.id,
          base64,
          password,
          validUntil,
        });

        // Reset and close
        setSelectedFile(null);
        setPassword('');
        setValidUntil('');
        setError(null);
        onOpenChange(false);
      };
      reader.readAsDataURL(selectedFile);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    setPassword('');
    setValidUntil('');
    setError(null);
    onOpenChange(false);
  };

  const isLoading = uploadCertificate.isPending;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5" />
            Certificado Digital A1
          </DialogTitle>
          <DialogDescription>
            Faça upload do certificado digital para a empresa{' '}
            <strong>{branch?.razao_social}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="w-4 h-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div
            className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
            {selectedFile ? (
              <p className="font-medium">{selectedFile.name}</p>
            ) : (
              <>
                <p className="font-medium">Clique para selecionar o certificado</p>
                <p className="text-sm text-muted-foreground">Arquivo .pfx ou .p12</p>
              </>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".pfx,.p12"
              className="hidden"
              onChange={handleFileSelect}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Senha do Certificado *</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Digite a senha do certificado"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="validUntil">Data de Validade *</Label>
            <Input
              id="validUntil"
              type="date"
              value={validUntil}
              onChange={(e) => setValidUntil(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button
              onClick={handleUpload}
              disabled={isLoading || !selectedFile || !password || !validUntil}
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar Certificado
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
