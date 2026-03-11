import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Info } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { DeliveryCompany } from '../../types';

interface DeliveryHeaderProps {
  company: DeliveryCompany;
  isSearchOpen: boolean;
  setIsSearchOpen: (open: boolean) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export function DeliveryHeader({
  company,
  isSearchOpen,
  setIsSearchOpen,
  searchQuery,
  setSearchQuery,
}: DeliveryHeaderProps) {
  return (
    <header className="sticky top-0 z-50 bg-[#050214]/90 backdrop-blur-md border-b border-white/5 h-16">
      <div className="max-w-7xl mx-auto px-4 h-full flex items-center justify-between">
        <AnimatePresence mode="wait">
          {!isSearchOpen ? (
            <motion.div 
              key="logo" 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="flex items-center gap-3"
            >
              <div className="h-8 w-8 rounded-full border border-white/10 overflow-hidden bg-white/5">
                {company.logo_url && (
                  <img 
                    src={company.logo_url} 
                    className="w-full h-full object-cover" 
                    alt={company.name} 
                  />
                )}
              </div>
              <div>
                <h1 className="text-[13px] font-black uppercase tracking-tight leading-none">
                  {company.name}
                </h1>
                <p className="text-[9px] text-[#2563eb] font-bold uppercase mt-1">
                  Delivery Online
                </p>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="search" 
              initial={{ width: 0, opacity: 0 }} 
              animate={{ width: "100%", opacity: 1 }} 
              className="flex-1 flex items-center gap-2"
            >
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                <Input 
                  autoFocus 
                  placeholder="O que você quer pedir?" 
                  className="bg-white/5 border-white/10 pl-10 h-10 rounded-xl focus:ring-purple-500/20" 
                  value={searchQuery} 
                  onChange={(e) => setSearchQuery(e.target.value)} 
                />
              </div>
              <button 
                onClick={() => { setIsSearchOpen(false); setSearchQuery(""); }} 
                className="p-2 text-white/60 hover:text-white"
              >
                <X className="h-5 w-5"/>
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {!isSearchOpen && (
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setIsSearchOpen(true)} 
              className="p-2 text-white/40 hover:text-white transition-colors"
            >
              <Search className="h-5 w-5"/>
            </button>
            <div className="h-6 w-6 bg-[#eab308] rounded flex items-center justify-center text-[10px] shadow-lg shadow-yellow-900/20">
              👑
            </div>
            <button className="p-2 text-white/40 hover:text-white transition-colors">
              <Info className="h-5 w-5"/>
            </button>
          </div>
        )}
      </div>
    </header>
  );
}