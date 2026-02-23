import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { AIProductImporter } from '@/modules/products/components';
import { useNavigate } from 'react-router-dom';

export default function AIProductImport() {
  const navigate = useNavigate();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Importar Produtos com IA</h1>
          <p className="text-muted-foreground">
            Envie imagens, PDFs, Excel ou Word para extrair automaticamente os produtos do seu cardápio
          </p>
        </div>
        
        <AIProductImporter onComplete={() => navigate('/products')} />
      </div>
    </DashboardLayout>
  );
}
