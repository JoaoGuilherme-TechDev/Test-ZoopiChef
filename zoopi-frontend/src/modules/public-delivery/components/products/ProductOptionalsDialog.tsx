import React, { useState, useMemo, useEffect } from 'react';
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useCart } from '../../contexts/CartContext';

// Novos Sub-componentes
import { OptionalsHeader } from './optionals/OptionalsHeader';
import { OptionalsList } from './optionals/OptionalsList';
import { OptionalsFooter } from './optionals/OptionalsFooter';

export function ProductOptionalsDialog({ isOpen, onOpenChange, product }: any) {
  const { addItem } = useCart();
  const [currentStep, setCurrentStep] = useState(0);
  const [selections, setSelections] = useState<Record<string, Record<string, number>>>({});

  const groups = useMemo(() => product.optionsGroups || [], [product]);
  const totalSteps = groups.length;
  const activeGroup = groups[currentStep]?.group;

  // Resetar estado ao abrir
  useEffect(() => {
    if (isOpen) {
      setSelections({});
      setCurrentStep(0);
    }
  }, [isOpen]);

  // Preço Base do Produto
  const basePrice = Number(
    product.is_on_sale && product.sale_price 
      ? product.sale_price 
      : (product.prices?.[0]?.price || 0)
  );

  // Cálculos de Totais e Subtotais
  const { totalPrice, currentGroupTotal } = useMemo(() => {
    let extra = 0;
    let stepTotal = 0;

    groups.forEach((og: any, index: number) => {
      const groupId = og.group.id;
      const groupSelections = selections[groupId] || {};
      
      og.group.items?.forEach((item: any) => {
        const qty = groupSelections[item.id] || 0;
        extra += Number(item.price) * qty;
        if (index === currentStep) stepTotal += qty;
      });
    });

    return { totalPrice: basePrice + extra, currentGroupTotal: stepTotal };
  }, [selections, basePrice, groups, currentStep]);

  // Lógica de Seleção Simples (Click no Card)
  const handleItemAction = (item: any) => {
    const groupId = activeGroup.id;
    const max = activeGroup.max_qty;

    setSelections(prev => {
      const groupData = { ...(prev[groupId] || {}) };
      const isAlreadySelected = (groupData[item.id] || 0) > 0;

      if (isAlreadySelected) {
        delete groupData[item.id];
      } else {
        if (max === 1) {
          // Se for seleção única, substitui o anterior
          return { ...prev, [groupId]: { [item.id]: 1 } };
        } else if (currentGroupTotal < max) {
          groupData[item.id] = 1;
        }
      }
      return { ...prev, [groupId]: groupData };
    });
  };

  // Lógica de Quantidade (+/-)
  const handleUpdateQty = (e: React.MouseEvent, item: any, delta: number) => {
    e.stopPropagation();
    const groupId = activeGroup.id;
    const currentQty = selections[groupId]?.[item.id] || 0;

    if (delta > 0 && currentGroupTotal >= activeGroup.max_qty) return;

    setSelections(prev => {
      const groupData = { ...(prev[groupId] || {}) };
      const newQty = Math.max(0, currentQty + delta);
      if (newQty === 0) delete groupData[item.id];
      else groupData[item.id] = newQty;
      return { ...prev, [groupId]: groupData };
    });
  };

  const isStepValid = currentGroupTotal >= (activeGroup?.min_qty || 0);

  const handleConfirm = () => {
    if (!isStepValid) return;
    const finalOptions: any[] = [];
    
    groups.forEach((og: any) => {
      og.group.items?.forEach((item: any) => {
        const qty = selections[og.group.id]?.[item.id] || 0;
        for (let i = 0; i < qty; i++) {
          finalOptions.push({ ...item, groupName: og.group.name });
        }
      });
    });

    addItem(product, finalOptions);
    onOpenChange(false);
  };

  if (!activeGroup) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="w-full sm:max-w-[400px] p-0 flex flex-col rounded-t-3xl sm:rounded-3xl min-h-[90vh] sm:min-h-[700px] overflow-hidden bg-[#050214] border-white/5">
        
        <OptionalsHeader 
          productName={product.name}
          totalSteps={totalSteps}
          currentStep={currentStep}
        />

        <OptionalsList 
          group={activeGroup}
          selections={selections[activeGroup.id] || {}}
          currentGroupTotal={currentGroupTotal}
          onItemAction={handleItemAction}
          onUpdateQty={handleUpdateQty}
        />

        <OptionalsFooter 
          totalPrice={totalPrice}
          isStepValid={isStepValid}
          currentStep={currentStep}
          totalSteps={totalSteps}
          onPrev={() => setCurrentStep(prev => prev - 1)}
          onNext={() => setCurrentStep(prev => prev + 1)}
          onConfirm={handleConfirm}
        />
       
      </DialogContent>
    </Dialog>
  );
}