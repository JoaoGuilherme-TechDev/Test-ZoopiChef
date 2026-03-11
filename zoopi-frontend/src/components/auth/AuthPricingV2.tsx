import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Zap, Star, Building2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const plans = [
  {
    name: "Essential",
    icon: Zap,
    description: "Ideal para operações iniciantes focadas em Delivery.",
    monthlyPrice: 149,
    annualPrice: 119,
    features: [
      "Até 500 pedidos/mês",
      "Cardápio Digital QR",
      "Gestão de Entregadores",
      "Suporte via Chat",
    ],
    color: "primary",
    popular: false,
  },
  {
    name: "Professional",
    icon: Star,
    description: "Controle total para restaurantes com salão e mesas.",
    monthlyPrice: 299,
    annualPrice: 239,
    features: [
      "Pedidos ilimitados",
      "KDS Cozinha ilimitado",
      "Gestão de Mesas e Comandas",
      "IA Operacional Base",
      "Suporte Prioritário",
    ],
    color: "accent",
    popular: true,
  },
  {
    name: "Enterprise",
    icon: Building2,
    description: "Solução robusta para redes e franquias multi-unidades.",
    monthlyPrice: 599,
    annualPrice: 479,
    features: [
      "Gestão Multi-lojas",
      "BI Avançado & Dashboards",
      "IA Preditiva Completa",
      "API de Integração",
      "Gerente de Conta",
    ],
    color: "primary",
    popular: false,
  },
];

function Badge({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium", className)}>
      {children}
    </span>
  );
}

export function AuthPricingV2() {
  const [isAnnual, setIsAnnual] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(
    plans.find((p) => p.popular)?.name ?? null
  );

  // ✅ CORRIGIDO: rola suavemente para o form de login
  const handleSelectPlan = (planName: string) => {
    setSelectedPlan(planName);
    setTimeout(() => {
      document.getElementById("login")?.scrollIntoView({ behavior: "smooth" });
    }, 200);
  };

  return (
    <section id="planos" className="py-32 px-6 relative overflow-hidden">
      {/* Background decor */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-7xl mx-auto relative z-10">

        {/* Header */}
        <div className="text-center mb-6 space-y-4">
          
          <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tighter text-white">
            INVISTA NO SEU <span className="text-primary">CRESCIMENTO.</span>
          </h2>
          

          {/* Toggle mensal/anual */}
          <div className="flex items-center justify-center gap-4 pt-4">
            <span className={cn(
              "text-[10px] font-black uppercase tracking-widest transition-colors",
              !isAnnual ? "text-white" : "text-muted-foreground"
            )}>
              Mensal
            </span>
            <button
              onClick={() => setIsAnnual(!isAnnual)}
              className="relative w-14 h-7 rounded-full bg-white/5 border border-white/10 p-1"
              aria-label="Alternar entre mensal e anual"
            >
              <motion.div
                animate={{ x: isAnnual ? 28 : 0 }}
                transition={{ type: "spring", stiffness: 500, damping: 35 }}
                className="w-5 h-5 rounded-full bg-primary shadow-[0_0_15px_rgba(99,102,241,0.6)]"
              />
            </button>
            <div className="flex items-center gap-2">
              <span className={cn(
                "text-[10px] font-black uppercase tracking-widest transition-colors",
                isAnnual ? "text-white" : "text-muted-foreground"
              )}>
                Anual
              </span>
              <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[9px] font-black uppercase">
                20% OFF
              </Badge>
            </div>
          </div>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan, i) => {
            const isSelected = selectedPlan === plan.name;
            return (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                viewport={{ once: true }}
                whileHover={{ y: -8 }}
                onClick={() => setSelectedPlan(plan.name)}
                className={cn(
                  "relative group p-6 rounded-[2rem] border transition-all duration-500 cursor-pointer",
                  isSelected
                    ? "bg-black border-primary/50 shadow-[0_0_60px_rgba(99,102,241,0.12)]"
                    : "bg-white/[0.02] border-white/10 hover:border-white/20"
                )}
              >
                {/* Borda neon animada no plano selecionado */}
                {isSelected && (
                  <div className="absolute inset-0 rounded-[2.5rem] overflow-hidden pointer-events-none">
                    <div className="absolute inset-0 border border-primary/20 rounded-[2.5rem]" />
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
                      className="absolute -inset-[100%] bg-[conic-gradient(from_0deg,transparent_0deg,transparent_300deg,rgba(99,102,241,0.6)_360deg)]"
                    />
                    <div className="absolute inset-[1px] bg-black rounded-[2.45rem]" />
                  </div>
                )}

                <div className="relative z-10 h-full flex flex-col">

                  {/* Header do card */}
                  <div className="flex items-center justify-between mb-5">
                    <div className={cn(
                      "h-12 w-12 rounded-2xl flex items-center justify-center border transition-colors",
                      isSelected
                        ? "bg-primary/20 border-primary/40 text-primary"
                        : "bg-white/5 border-white/10 text-muted-foreground group-hover:border-white/20"
                    )}>
                      <plan.icon size={22} />
                    </div>
                    {plan.popular && (
                      <Badge className="bg-primary text-white font-black uppercase text-[8px] tracking-widest px-3 py-1 border-0">
                        Mais Escolhido
                      </Badge>
                    )}
                  </div>

                  <h3 className="text-2xl font-black uppercase tracking-tighter text-white mb-1">
                    {plan.name}
                  </h3>
                  <p className="text-sm text-muted-foreground font-medium mb-3 leading-relaxed">
                    {plan.description}
                  </p>

                  {/* Preço */}
                  <div className="mb-7">
                    <div className="flex items-baseline gap-1">
                      <span className="text-sm font-bold text-muted-foreground">R$</span>
                      <AnimatePresence mode="wait">
                        <motion.span
                          key={isAnnual ? "annual" : "monthly"}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -8 }}
                          transition={{ duration: 0.2 }}
                          className="text-5xl font-black tracking-tighter text-white"
                        >
                          {isAnnual ? plan.annualPrice : plan.monthlyPrice}
                        </motion.span>
                      </AnimatePresence>
                      <span className="text-sm font-bold text-muted-foreground">/mês</span>
                    </div>
                    {isAnnual && (
                      <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest mt-1.5">
                        Cobrado anualmente
                      </p>
                    )}
                  </div>

                  {/* Features */}
                  <div className="space-y-3 mb-6 flex-1">
                    {plan.features.map((feature) => (
                      <div key={feature} className="flex items-center gap-3">
                        <div className="h-5 w-5 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 shrink-0">
                          <Check className="h-3 w-3 text-emerald-400" />
                        </div>
                        <span className="text-xs font-medium text-white/75 leading-snug">{feature}</span>
                      </div>
                    ))}
                  </div>

                  {/* CTA */}
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectPlan(plan.name);
                    }}
                    className={cn(
                      "w-full h-13 rounded-2xl font-black uppercase tracking-widest text-[10px] group/btn transition-all",
                      isSelected
                        ? "bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20"
                        : "bg-white/5 hover:bg-white/10 text-white border border-white/10"
                    )}
                  >
                    Começar com {plan.name}
                    <ArrowRight className="ml-2 h-4 w-4 group-hover/btn:translate-x-1 transition-transform" />
                  </Button>
                </div>
              </motion.div>
            );
          })}
        </div>

        
      </div>
    </section>
  );
}