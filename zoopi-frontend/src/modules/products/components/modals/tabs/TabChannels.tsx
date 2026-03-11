import { 
  Globe, 
  Smartphone, 
  Tablet, 
  Monitor, 
  Tv, 
  Receipt, 
  UtensilsCrossed, 
  Store,
  Star,
  ArrowUpDown,
  CheckCircle2
} from "lucide-react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ProductFormData } from "../../../types";

interface TabChannelsProps {
  formData: ProductFormData;
  setFormData: (data: ProductFormData) => void;
}

export function TabChannels({ formData, setFormData }: TabChannelsProps) {
  // Mapping of channels for the grid
  const channels = [
    { id: 'aparece_delivery', label: 'Delivery App', icon: Globe },
    { id: 'aparece_garcom', label: 'App Garçom', icon: Smartphone },
    { id: 'aparece_tablet', label: 'Tablet Mesa', icon: Tablet },
    { id: 'aparece_totem', label: 'Autoatendimento', icon: Monitor },
    { id: 'aparece_tv', label: 'Menu Digital TV', icon: Tv },
    { id: 'aparece_comanda', label: 'Comanda Mobile', icon: Receipt },
    { id: 'aparece_mesa', label: 'Menu Mesa (QR)', icon: UtensilsCrossed },
    { id: 'aparece_self_service', label: 'Self Service', icon: Store },
  ];

  return (
    <div className="space-y-6">
      {/* Sales Channels Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {channels.map((channel) => (
          <div 
            key={channel.id} 
            className="flex items-center justify-between p-4 bg-muted/20 rounded-2xl border border-transparent hover:border-primary/20 transition-all"
          >
            <div className="flex items-center gap-3">
              <channel.icon className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor={channel.id} className="text-xs font-bold uppercase cursor-pointer">
                {channel.label}
              </Label>
            </div>
            <Switch 
              id={channel.id}
              checked={(formData as any)[channel.id]}
              onCheckedChange={(checked) => setFormData({...formData, [channel.id]: checked})}
            />
          </div>
        ))}
      </div>

      {/* Global Status Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-4 border-t border-primary/20">
        {/* Featured Flag */}
        <div className="flex flex-col gap-3 p-4 bg-primary/5 rounded-2xl">
          <div className="flex items-center gap-2">
            <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
            <span className="text-[10px] font-black uppercase">Destaque</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[9px] text-muted-foreground uppercase font-bold">Topo do menu</span>
            <Switch 
              checked={formData.featured}
              onCheckedChange={(checked) => setFormData({...formData, featured: checked})}
            />
          </div>
        </div>

        {/* Commission Flag */}
        <div className="flex flex-col gap-3 p-4 bg-primary/5 rounded-2xl">
          <div className="flex items-center gap-2">
            <ArrowUpDown className="h-4 w-4 text-primary" />
            <span className="text-[10px] font-black uppercase">Comissão</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[9px] text-muted-foreground uppercase font-bold">Gera comissão</span>
            <Switch 
              checked={formData.commission}
              onCheckedChange={(checked) => setFormData({...formData, commission: checked})}
            />
          </div>
        </div>

        {/* Active Flag */}
        <div className="flex flex-col gap-3 p-4 bg-primary/5 rounded-2xl">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            <span className="text-[10px] font-black uppercase">Ativo</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[9px] text-muted-foreground uppercase font-bold">Disponível</span>
            <Switch 
              checked={formData.active}
              onCheckedChange={(checked) => setFormData({...formData, active: checked})}
            />
          </div>
        </div>
      </div>
    </div>
  );
}