import { TenantProvider, useTenant } from '@/contexts/TenantContext';
import PrizeWheel from '@/pages/PrizeWheel';

function RoletaContent() {
  const { company } = useTenant();
  return <PrizeWheel />;
}

export default function TenantRoleta() {
  return (
    <TenantProvider>
      <RoletaContent />
    </TenantProvider>
  );
}
