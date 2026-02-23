import type { OrderReadyCall } from '@/hooks/useOrderReadyCalls';

interface OrderReadyHistoryProps {
  calls: OrderReadyCall[];
}

export function OrderReadyHistory({ calls }: OrderReadyHistoryProps) {
  if (calls.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-40 bg-black/80 backdrop-blur-sm rounded-xl p-4 min-w-[200px] max-w-[280px] border border-white/10">
      <h3 className="text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wider">
        Pedidos Prontos
      </h3>
      
      <div className="space-y-2">
        {calls.map((call, index) => (
          <div
            key={call.id}
            className={`flex items-center justify-between py-2 px-3 rounded-lg ${
              index === 0 
                ? 'bg-primary/20 border border-primary/30' 
                : 'bg-white/5'
            }`}
          >
            <div className="flex flex-col">
              {call.customer_name && (
                <span className="text-white font-medium text-sm truncate max-w-[120px]">
                  {call.customer_name}
                </span>
              )}
              <span className={`font-bold ${index === 0 ? 'text-primary' : 'text-gray-300'}`}>
                #{call.order_number}
              </span>
            </div>
            
            {index === 0 && (
              <span className="text-xs text-green-400 font-medium animate-pulse">
                NOVO
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
