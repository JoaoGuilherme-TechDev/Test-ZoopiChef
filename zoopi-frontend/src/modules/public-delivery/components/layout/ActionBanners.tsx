import { Gift, CalendarDays, Utensils, Sparkles, ChevronRight, Search } from 'lucide-react';

export function ActionBanners() {
  return (
    <div className="space-y-3 px-4 md:px-0">
      {/* Banner de Texto */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-[#2e1065] to-[#050214] border border-purple-500/30 flex items-center gap-3">
        <Sparkles className="h-5 w-5 text-yellow-400" />
        <p className="text-[11px] md:text-xs font-black text-white uppercase tracking-tight">
          ✨ Promoção de Festas de Fim de Ano, aproveite nossas ofertas de fim de ano, e reserve sua mesa e ganhe uma espumante
        </p>
      </div>

      {/* Roleta */}
      <button className="w-full p-4 rounded-xl bg-[#1a1307] border border-yellow-600/30 flex items-center justify-between group transition-all hover:bg-[#2a1d0a]">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 rounded-lg bg-[#f97316] flex items-center justify-center shadow-lg shadow-orange-900/40">
            <Gift className="h-6 w-6 text-white" />
          </div>
          <div className="text-left">
            <h4 className="text-xs md:text-sm font-black text-[#eab308] uppercase italic leading-none">Gire a Roleta da Sorte e ganhe prêmios exclusivos!</h4>
            <p className="text-[9px] font-bold text-yellow-600 uppercase mt-1">★ Disponível para clientes VIP com 2+ pedidos ★</p>
          </div>
        </div>
        <ChevronRight className="h-5 w-5 text-yellow-600 group-hover:translate-x-1 transition-transform" />
      </button>

      {/* Reserva */}
      <button className="w-full p-4 rounded-xl bg-[#0f0a1d] border border-purple-600/30 flex items-center justify-between group transition-all hover:bg-[#1a133a]">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 rounded-lg bg-[#7c3aed] flex items-center justify-center">
            <CalendarDays className="h-5 w-5 text-white" />
          </div>
          <div className="text-left">
            <h4 className="text-xs md:text-sm font-black text-white uppercase leading-none">Deseja fazer uma reserva de mesa?</h4>
            <p className="text-[9px] font-bold text-purple-400 uppercase mt-1">Reserve agora e garanta seu lugar especial</p>
          </div>
        </div>
        <ChevronRight className="h-5 w-5 text-purple-400 group-hover:translate-x-1 transition-transform" />
      </button>

      {/* Menu do Dia */}
      <div className="w-full p-4 rounded-xl bg-[#05110e] border border-emerald-600/30 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 rounded-lg bg-[#10b981] flex items-center justify-center">
            <Utensils className="h-5 w-5 text-white" />
          </div>
          <h4 className="text-[13px] font-black text-white uppercase">📋 Menu do Dia</h4>
        </div>
        <div className="h-8 w-8 rounded-full bg-white/5 flex items-center justify-center">
          <Search className="h-4 w-4 text-emerald-400" />
        </div>
      </div>
    </div>
  );
}