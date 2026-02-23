/**
 * CartScreen - Cart review before checkout
 * 
 * Shows cart items, quantities, totals.
 * Allows editing quantities and proceeding to checkout.
 */

import { useKioskState, kioskActions, useKioskCartTotal } from '@/stores/kioskStore';
import { Button } from '@/components/ui/button';
import { Trash2, Plus, Minus, ArrowLeft, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export function CartScreen() {
  const cart = useKioskState(s => s.cart);
  const device = useKioskState(s => s.device);
  const cartTotal = useKioskCartTotal();

  const formatCurrency = (cents: number) => {
    return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const handleProceed = () => {
    // SEMPRE ir para DINE_MODE ou direto para PAYMENT
    // Cliente já foi identificado no início do fluxo (IdentifyScreen)
    // NÃO pedir dados novamente em CustomerInfoScreen
    if (device?.require_dine_mode) {
      kioskActions.setState('DINE_MODE');
    } else {
      kioskActions.setState('PAYMENT');
    }
  };

  if (cart.length === 0) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center bg-gray-900 p-8">
        <div className="text-8xl mb-8">🛒</div>
        <h1 className="text-3xl font-bold text-white mb-4">Carrinho vazio</h1>
        <p className="text-xl text-gray-400 mb-8">Adicione produtos para continuar</p>
        <Button
          size="lg"
          className="h-16 px-12 text-xl"
          onClick={() => kioskActions.setState('MENU')}
        >
          <ArrowLeft className="w-6 h-6 mr-3" />
          Voltar ao cardápio
        </Button>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col bg-gray-900">
      {/* Header */}
      <div className="p-6 bg-gray-800 shrink-0">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            className="w-14 h-14"
            onClick={() => kioskActions.setState('MENU')}
          >
            <ArrowLeft className="w-8 h-8" />
          </Button>
          <h1 className="text-3xl font-bold text-white">Seu Pedido</h1>
        </div>
      </div>

      {/* Cart items */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="space-y-4">
          {cart.map((item) => (
            <div
              key={item.id}
              className="bg-gray-800 rounded-xl p-4 flex items-center gap-4"
            >
              {/* Product image */}
              {item.image_url ? (
                <img
                  src={item.image_url}
                  alt={item.product_name}
                  className="w-24 h-24 rounded-lg object-cover shrink-0"
                />
              ) : (
                <div className="w-24 h-24 rounded-lg bg-gray-700 flex items-center justify-center shrink-0">
                  <span className="text-4xl">🍽️</span>
                </div>
              )}

              {/* Product info */}
              <div className="flex-1 min-w-0">
                <h3 className="text-xl font-bold text-white truncate">{item.product_name}</h3>
                <p className="text-lg text-orange-500 font-bold">
                  {formatCurrency(item.unit_price_cents)}
                </p>
                {item.notes && (
                  <p className="text-sm text-gray-400 truncate">{item.notes}</p>
                )}
              </div>

              {/* Quantity controls */}
              <div className="flex items-center gap-3 shrink-0">
                <Button
                  variant="outline"
                  size="icon"
                  className="w-12 h-12 rounded-full"
                  onClick={() => kioskActions.updateCartItem(item.id, item.quantity - 1)}
                >
                  {item.quantity === 1 ? (
                    <Trash2 className="w-5 h-5 text-red-500" />
                  ) : (
                    <Minus className="w-5 h-5" />
                  )}
                </Button>
                <span className="text-2xl font-bold text-white w-10 text-center">
                  {item.quantity}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  className="w-12 h-12 rounded-full"
                  onClick={() => kioskActions.updateCartItem(item.id, item.quantity + 1)}
                >
                  <Plus className="w-5 h-5" />
                </Button>
              </div>

              {/* Item total */}
              <div className="text-xl font-bold text-white shrink-0 w-28 text-right">
                {formatCurrency(item.total_cents)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer with total and proceed button */}
      <div className="p-6 bg-gray-800 shrink-0">
        <div className="flex items-center justify-between mb-4">
          <span className="text-2xl text-gray-300">Total</span>
          <span className="text-4xl font-bold text-orange-500">{formatCurrency(cartTotal)}</span>
        </div>
        <Button
          size="lg"
          className="w-full h-20 text-2xl bg-orange-600 hover:bg-orange-700"
          onClick={handleProceed}
        >
          Finalizar Pedido
          <ArrowRight className="w-8 h-8 ml-4" />
        </Button>
      </div>
    </div>
  );
}
