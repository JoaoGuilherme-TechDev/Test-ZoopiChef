import { motion, useInView } from "framer-motion";
import { useRef, useEffect, useState } from "react";
import { TrendingUp, ShoppingBag, Store, Star } from "lucide-react";

function useCounter(target: number, duration: number = 2000, enabled: boolean = false) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    let startTime: number | null = null;
    const start = 0;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(start + (target - start) * eased));
      if (progress < 1) requestAnimationFrame(animate);
      else setCount(target);
    };

    requestAnimationFrame(animate);
  }, [target, duration, enabled]);

  return count;
}

interface StatProps {
  icon: React.ElementType;
  value: number;
  suffix: string;
  prefix?: string;
  label: string;
  description: string;
  color: string;
  bgColor: string;
  borderColor: string;
  delay: number;
  enabled: boolean;
}

function StatCard({
  icon: Icon,
  value,
  suffix,
  prefix = "",
  label,
  description,
  color,
  bgColor,
  borderColor,
  delay,
  enabled,
}: StatProps) {
  const count = useCounter(value, 2200, enabled);

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      viewport={{ once: true }}
      className={`relative p-6 rounded-[2rem] border ${borderColor} bg-card/40 backdrop-blur-md overflow-hidden group hover:scale-[1.02] transition-transform duration-300`}
    >
      {/* Brilho de fundo */}
      <div className={`absolute -top-8 -right-8 w-32 h-32 ${bgColor} blur-[50px] rounded-full opacity-30 group-hover:opacity-60 transition-opacity`} />

      <div className="relative z-10">
        <div className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl ${bgColor} border ${borderColor} mb-4`}>
          <Icon className={`h-5 w-5 ${color}`} />
        </div>

        <div className="flex items-baseline gap-1 mb-1">
          {prefix && <span className={`text-lg font-black ${color}`}>{prefix}</span>}
          <span className={`text-4xl font-black tracking-tighter ${color}`}>
            {count.toLocaleString("pt-BR")}
          </span>
          <span className={`text-xl font-black ${color}`}>{suffix}</span>
        </div>

        <p className="text-sm font-black text-white uppercase tracking-tight mb-1">{label}</p>
        <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
      </div>
    </motion.div>
  );
}

export function AuthSocialProof() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  const stats = [
    {
      icon: Store,
      value: 500,
      suffix: "+",
      label: "Restaurantes Ativos",
      description: "Operações rodando em tempo real com o Zoopi OS no Brasil.",
      color: "text-primary",
      bgColor: "bg-primary/10",
      borderColor: "border-primary/20",
      delay: 0,
    },
    {
      icon: ShoppingBag,
      value: 2,
      suffix: "M+",
      label: "Pedidos Processados",
      description: "Pedidos gerenciados com precisão desde o lançamento da plataforma.",
      color: "text-emerald-400",
      bgColor: "bg-emerald-500/10",
      borderColor: "border-emerald-500/20",
      delay: 0.1,
    },
    {
      icon: TrendingUp,
      value: 38,
      suffix: "%",
      label: "Aumento Médio de Receita",
      description: "Crescimento médio registrado pelos clientes no primeiro trimestre.",
      color: "text-yellow-400",
      bgColor: "bg-yellow-500/10",
      borderColor: "border-yellow-500/20",
      delay: 0.2,
    },
    {
      icon: Star,
      value: 98,
      suffix: "%",
      label: "Taxa de Satisfação",
      description: "Clientes que renovaram após o primeiro ano de uso da plataforma.",
      color: "text-accent",
      bgColor: "bg-accent/10",
      borderColor: "border-accent/20",
      delay: 0.3,
    },
  ];

  return (
      <section className="py-24 px-6 relative bg-transparent" ref={ref}>
      {/* Linha separadora topo */}
      <div className="max-w-7xl mx-auto">
        <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent mb-24" />

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-14"
        >
          
          <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter text-white mt-3">
            CONFIADO POR QUEM <span className="text-primary">OPERA DE VERDADE.</span>
          </h2>
          
        </motion.div>

        {/* Grid de stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {stats.map((stat) => (
            <StatCard key={stat.label} {...stat} enabled={isInView} />
          ))}
        </div>

        

          

        {/* Linha separadora base */}
        <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent mt-24" />
      </div>
    </section>
  );
}