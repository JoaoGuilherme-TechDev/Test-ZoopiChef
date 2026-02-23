import { useParams } from 'react-router-dom';
import { TenantProvider, useTenant } from '@/contexts/TenantContext';
import TVMenuPublic from '@/pages/TVMenuPublic';

function TVContent() {
  const { company } = useTenant();
  // TVMenuPublic usa slug do params, então funciona diretamente
  return <TVMenuPublic />;
}

export default function TenantTV() {
  return (
    <TenantProvider>
      <TVContent />
    </TenantProvider>
  );
}
