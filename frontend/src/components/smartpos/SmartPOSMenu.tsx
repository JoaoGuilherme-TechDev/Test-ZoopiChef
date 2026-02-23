import { 
  ShoppingCart, 
  ClipboardList, 
  UtensilsCrossed, 
  History, 
  Wallet, 
  UserPlus,
  Store,
  X,
  RotateCcw,
  Ban,
  Search,
  Trash2,
  Printer,
  FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export type SmartPOSMenuAction = 
  | 'quick_sale'
  | 'tables'
  | 'comandas'
  | 'history'
  | 'sales_search'
  | 'credit_receive'
  | 'credit_launch'
  | 'customer_register'
  | 'cancel_sale'
  | 'cancel_item'
  | 'reverse_sale'
  | 'reprint_sale'
  | 'reprint_fiscal';

interface SmartPOSMenuProps {
  onAction: (action: SmartPOSMenuAction) => void;
  openComandasCount?: number;
  openTablesCount?: number;
  pendingCreditCount?: number;
  hasPendingSale?: boolean;
}

export function SmartPOSMenu({
  onAction,
  openComandasCount = 0,
  openTablesCount = 0,
  pendingCreditCount = 0,
  hasPendingSale = false,
}: SmartPOSMenuProps) {
  const menuItems = [
    {
      action: 'quick_sale' as SmartPOSMenuAction,
      icon: ShoppingCart,
      label: 'Venda Rápida',
      description: 'Balcão',
      color: 'bg-green-500',
      textColor: 'text-green-500',
      bgColor: 'bg-green-500/10',
      borderColor: 'border-green-500/30',
    },
    {
      action: 'tables' as SmartPOSMenuAction,
      icon: UtensilsCrossed,
      label: 'Mesas',
      description: 'Gerenciar mesas',
      color: 'bg-blue-500',
      textColor: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/30',
      badge: openTablesCount > 0 ? openTablesCount : undefined,
    },
    {
      action: 'comandas' as SmartPOSMenuAction,
      icon: ClipboardList,
      label: 'Comandas',
      description: 'Gerenciar comandas',
      color: 'bg-purple-500',
      textColor: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
      borderColor: 'border-purple-500/30',
      badge: openComandasCount > 0 ? openComandasCount : undefined,
    },
    {
      action: 'history' as SmartPOSMenuAction,
      icon: History,
      label: 'Histórico',
      description: 'Vendas realizadas',
      color: 'bg-gray-500',
      textColor: 'text-gray-400',
      bgColor: 'bg-gray-500/10',
      borderColor: 'border-gray-500/30',
    },
    {
      action: 'sales_search' as SmartPOSMenuAction,
      icon: Search,
      label: 'Buscar Venda',
      description: 'Por número/data',
      color: 'bg-indigo-500',
      textColor: 'text-indigo-400',
      bgColor: 'bg-indigo-500/10',
      borderColor: 'border-indigo-500/30',
    },
  ];

  const creditItems = [
    {
      action: 'credit_receive' as SmartPOSMenuAction,
      icon: Wallet,
      label: 'Receber Fiado',
      description: 'Pagamentos pendentes',
      color: 'bg-orange-500',
      textColor: 'text-orange-500',
      bgColor: 'bg-orange-500/10',
      borderColor: 'border-orange-500/30',
      badge: pendingCreditCount > 0 ? pendingCreditCount : undefined,
    },
    {
      action: 'credit_launch' as SmartPOSMenuAction,
      icon: Store,
      label: 'Lançar Fiado',
      description: 'Novo débito',
      color: 'bg-amber-500',
      textColor: 'text-amber-500',
      bgColor: 'bg-amber-500/10',
      borderColor: 'border-amber-500/30',
    },
    {
      action: 'customer_register' as SmartPOSMenuAction,
      icon: UserPlus,
      label: 'Cadastrar Cliente',
      description: 'Novo cliente',
      color: 'bg-cyan-500',
      textColor: 'text-cyan-500',
      bgColor: 'bg-cyan-500/10',
      borderColor: 'border-cyan-500/30',
    },
  ];

  const saleActions = [
    {
      action: 'cancel_item' as SmartPOSMenuAction,
      icon: X,
      label: 'Cancelar Item',
      description: 'Remover último item',
      color: 'bg-orange-500',
      textColor: 'text-orange-500',
      bgColor: 'bg-orange-500/10',
      borderColor: 'border-orange-500/30',
    },
    {
      action: 'cancel_sale' as SmartPOSMenuAction,
      icon: Trash2,
      label: 'Cancelar Venda',
      description: 'Cancelar venda atual',
      color: 'bg-red-500',
      textColor: 'text-red-500',
      bgColor: 'bg-red-500/10',
      borderColor: 'border-red-500/30',
    },
    {
      action: 'reverse_sale' as SmartPOSMenuAction,
      icon: RotateCcw,
      label: 'Estornar Venda',
      description: 'Estornar venda fechada',
      color: 'bg-rose-500',
      textColor: 'text-rose-500',
      bgColor: 'bg-rose-500/10',
      borderColor: 'border-rose-500/30',
    },
    {
      action: 'reprint_sale' as SmartPOSMenuAction,
      icon: Printer,
      label: 'Reimprimir',
      description: 'Venda ou cupom fiscal',
      color: 'bg-blue-500',
      textColor: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/30',
    },
  ];

  return (
    <div className="space-y-4">
      {/* Main Actions */}
      <div className="grid grid-cols-2 gap-3">
        {menuItems.map((item) => (
          <Button
            key={item.action}
            variant="outline"
            className={`relative flex flex-col h-auto py-4 ${item.bgColor} ${item.borderColor} hover:${item.bgColor}`}
            onClick={() => onAction(item.action)}
          >
            <item.icon className={`h-6 w-6 ${item.textColor}`} />
            <span className={`text-sm font-medium mt-1 ${item.textColor}`}>{item.label}</span>
            <span className="text-xs text-gray-400">{item.description}</span>
            {item.badge && (
              <Badge className={`absolute -top-2 -right-2 ${item.color} text-white`}>
                {item.badge}
              </Badge>
            )}
          </Button>
        ))}
      </div>

      {/* Credit Actions */}
      <Card className="bg-gray-800/50 border-gray-700">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-gray-400">Fiado & Clientes</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-3 gap-2">
          {creditItems.map((item) => (
            <Button
              key={item.action}
              variant="outline"
              className={`relative flex flex-col h-auto py-3 ${item.bgColor} ${item.borderColor} hover:${item.bgColor}`}
              onClick={() => onAction(item.action)}
            >
              <item.icon className={`h-5 w-5 ${item.textColor}`} />
              <span className={`text-xs font-medium mt-1 ${item.textColor}`}>{item.label}</span>
              {item.badge && (
                <Badge className={`absolute -top-2 -right-2 ${item.color} text-white text-xs`}>
                  {item.badge}
                </Badge>
              )}
            </Button>
          ))}
        </CardContent>
      </Card>

      {/* Sale Actions */}
      {hasPendingSale && (
        <Card className="bg-red-900/20 border-red-700/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-red-400 flex items-center gap-2">
              <Ban className="w-4 h-4" />
              Ações da Venda
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2">
            {saleActions.map((item) => (
              <Button
                key={item.action}
                variant="outline"
                className={`flex flex-col h-auto py-3 ${item.bgColor} ${item.borderColor} hover:${item.bgColor}`}
                onClick={() => onAction(item.action)}
              >
                <item.icon className={`h-5 w-5 ${item.textColor}`} />
                <span className={`text-xs font-medium mt-1 ${item.textColor}`}>{item.label}</span>
              </Button>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
