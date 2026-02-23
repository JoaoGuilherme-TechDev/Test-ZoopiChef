import { Badge } from '@/components/ui/badge';

const legendItems = [
  { color: 'bg-green-500', label: 'Livre', description: 'Disponível para uso' },
  { color: 'bg-blue-500', label: 'Em consumo', description: 'Comanda ativa com lançamentos' },
  { color: 'bg-yellow-500', label: 'Sem consumo', description: 'Sem atividade há muito tempo' },
  { color: 'bg-red-500', label: 'Pediu conta', description: 'Aguardando pagamento' },
  { color: 'bg-gray-500', label: 'Fechada', description: 'Comanda encerrada (histórico)' },
];

export function ComandaStatusLegend() {
  return (
    <div className="flex flex-wrap items-center gap-4 p-4 rounded-lg bg-muted/50 text-sm">
      <span className="font-medium text-muted-foreground">Legenda:</span>
      {legendItems.map((item) => (
        <div key={item.label} className="flex items-center gap-2">
          <div className={`h-3 w-3 rounded-full ${item.color}`} />
          <span>{item.label}</span>
        </div>
      ))}
    </div>
  );
}
