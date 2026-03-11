/* eslint-disable @typescript-eslint/no-explicit-any */
import { motion, useMotionValue, useTransform } from "framer-motion";
import {
  ChefHat, Smartphone, BarChart3, ShieldCheck, Globe,
  ArrowUpRight, Lock, Clock, TrendingUp, Wifi,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { MouseEvent } from "react";

function KDSVisual() {
  const orders = [
    { item: "Margherita", time: "2:14", status: "cooking", progress: 65 },
    { item: "Smash Burger x2", time: "4:30", status: "ready", progress: 100 },
    { item: "Combo Família", time: "1:05", status: "cooking", progress: 30 },
  ];
  return (
    <div className="space-y-1 w-full">
      {orders.map((o, i) => (
        <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-black/40 border border-white/5">
          <div className={cn("h-1.5 w-1.5 rounded-full shrink-0",
            o.status === "ready" ? "bg-emerald-400" :
            o.status === "cooking" ? "bg-yellow-400 animate-pulse" : "bg-white/20"
          )} />
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-center mb-0.5">
              <span className="text-[9px] font-bold text-white truncate">{o.item}</span>
              <span className="text-[8px] text-muted-foreground ml-1 shrink-0">{o.time}</span>
            </div>
            <div className="h-0.5 w-full bg-white/5 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                whileInView={{ width: `${o.progress}%` }}
                transition={{ delay: 0.3 + i * 0.1, duration: 0.6 }}
                viewport={{ once: true }}
                className={cn("h-full rounded-full",
                  o.status === "ready" ? "bg-emerald-400" :
                  o.status === "cooking" ? "bg-yellow-400" : "bg-white/10"
                )}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function FinanceVisual() {
  const bars = [30, 55, 40, 70, 50, 85, 60, 78, 45, 92, 68, 88];
  return (
    <div className="w-full space-y-1.5">
      <div className="grid grid-cols-2 gap-1">
        {[
          { label: "Receita", value: "R$ 42.1k", color: "text-emerald-400" },
          { label: "CMV", value: "28.4%", color: "text-yellow-400" },
        ].map((m, i) => (
          <div key={i} className="p-2 rounded-lg bg-black/40 border border-white/5">
            <p className="text-[7px] text-muted-foreground uppercase tracking-wider">{m.label}</p>
            <p className={`text-xs font-black ${m.color}`}>{m.value}</p>
          </div>
        ))}
      </div>
      <div className="flex items-end gap-0.5 h-8 px-1.5 py-1 rounded-lg bg-black/40 border border-white/5">
        {bars.map((h, i) => (
          <motion.div key={i}
            initial={{ scaleY: 0 }}
            whileInView={{ scaleY: 1 }}
            transition={{ delay: 0.2 + i * 0.03, duration: 0.35 }}
            viewport={{ once: true }}
            style={{ height: `${h}%`, originY: 1 }}
            className={cn("flex-1 rounded-sm", i === 11 ? "bg-primary" : "bg-primary/25")}
          />
        ))}
      </div>
    </div>
  );
}

function SecurityVisual() {
  return (
    <div className="fixed inset-0 z-0 overflow-hidden bg-background">
      <div className="relative shrink-0">
        <svg width="64" height="64" viewBox="0 0 120 120">
          <motion.circle cx="60" cy="60" r="52" fill="none" stroke="rgba(99,102,241,0.2)"
            strokeWidth="1" strokeDasharray="8 4"
            animate={{ rotate: 360 }} transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            style={{ transformOrigin: "60px 60px" }} />
          <polygon points="60,20 93,40 93,80 60,100 27,80 27,40"
            fill="rgba(99,102,241,0.06)" stroke="rgba(99,102,241,0.3)" strokeWidth="1" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-7 w-7 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center">
            <Lock className="h-3.5 w-3.5 text-primary" />
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-1">
        {["AES-256", "SSL/TLS", "2FA"].map((label) => (
          <span key={label} className="text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-primary w-fit">
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}

function PWAVisual() {
  return (
    <div className="flex items-center gap-3 w-full">
      <div className="relative w-14 h-24 rounded-xl border border-white/10 bg-black/60 overflow-hidden shrink-0">
        <div className="h-1.5 w-4 rounded-full bg-white/10 mx-auto mt-1 mb-1" />
        <div className="space-y-1 px-1">
          {["Mesa 3", "Mesa 7", "Delivery"].map((t, i) => (
            <div key={i} className="flex items-center gap-1 p-1 rounded bg-white/[0.04] border border-white/5">
              <div className="h-1 w-1 rounded-full bg-primary" />
              <span className="text-[6px] font-bold text-white/70">{t}</span>
            </div>
          ))}
        </div>
        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex items-center gap-0.5">
          <Wifi className="h-1.5 w-1.5 text-emerald-400" />
          <span className="text-[5px] text-emerald-400 font-bold">Sync</span>
        </div>
      </div>
      <div className="space-y-1 flex-1">
        {[
          { label: "Tempo médio", value: "3s", color: "text-primary" },
          { label: "Precisão", value: "99.8%", color: "text-emerald-400" },
          { label: "Offline", value: "✓ Sim", color: "text-yellow-400" },
        ].map((s, i) => (
          <div key={i} className="flex items-center justify-between px-2 py-1 rounded-lg bg-black/40 border border-white/5">
            <p className="text-[7px] text-muted-foreground uppercase">{s.label}</p>
            <p className={`text-[10px] font-black ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function MultiStoreVisual() {
  const nodes = [
    { x: 50, y: 15, label: "HQ" },
    { x: 15, y: 65, label: "L1" },
    { x: 50, y: 85, label: "L2" },
    { x: 85, y: 65, label: "L3" },
  ];
  const lines = [[0,1],[0,2],[0,3],[1,2],[2,3]];
  return (
    <div className="w-full flex items-center justify-center">
      <div className="relative w-36 h-20">
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          {lines.map(([a, b], i) => (
            <motion.line key={i}
              x1={`${nodes[a].x}%`} y1={`${nodes[a].y}%`}
              x2={`${nodes[b].x}%`} y2={`${nodes[b].y}%`}
              stroke="rgba(99,102,241,0.3)" strokeWidth="1"
              initial={{ opacity: 0 }} whileInView={{ opacity: 1 }}
              transition={{ delay: 0.1 + i * 0.07 }} viewport={{ once: true }}
            />
          ))}
        </svg>
        {nodes.map((node, i) => (
          <div key={i}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${node.x}%`, top: `${node.y}%` }}
          >
            <div className={cn(
              "flex items-center justify-center rounded-md border font-black text-[7px]",
              i === 0
                ? "h-6 w-6 bg-primary/20 border-primary/40 text-primary"
                : "h-5 w-5 bg-white/5 border-white/10 text-white/40"
            )}>
              {node.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const BentoCard = ({ title, description, icon: Icon, className, badge, delay = 0, visual }: {
  title: string; description: string; icon: any;
  className?: string; badge?: string; delay?: number; visual?: React.ReactNode;
}) => {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  function handleMouseMove({ currentTarget, clientX, clientY }: MouseEvent) {
    const { left, top } = currentTarget.getBoundingClientRect();
    mouseX.set(clientX - left); mouseY.set(clientY - top);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] }}
      viewport={{ once: true }}
      onMouseMove={handleMouseMove}
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-white/8 bg-card/60 backdrop-blur-md transition-all duration-500 hover:border-primary/40 shadow-lg",
        className
      )}
    >
      <motion.div
        className="pointer-events-none absolute -inset-px z-10 opacity-0 transition-opacity duration-500 group-hover:opacity-100 rounded-2xl"
        style={{
          background: useTransform([mouseX, mouseY],
            ([x, y]) => `radial-gradient(280px circle at ${x}px ${y}px, rgba(99,102,241,0.07), transparent 80%)`)
        }}
      />

      <div className="relative z-20 flex h-full flex-col p-5 gap-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-black/40 border border-white/10 text-primary group-hover:border-primary/40 transition-all duration-500">
            <Icon size={18} strokeWidth={1.5} />
          </div>
          {badge && (
            <span className="text-[7px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 group-hover:bg-primary group-hover:text-white transition-all duration-500">
              {badge}
            </span>
          )}
        </div>

        {/* Texto */}
        <div>
          <h3 className="text-sm font-black uppercase tracking-tight text-white group-hover:text-primary transition-colors duration-300 mb-0.5">
            {title}
          </h3>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            {description}
          </p>
        </div>

        {/* Visual */}
        {visual && <div className="mt-auto">{visual}</div>}
      </div>

      <div className="absolute bottom-0 left-0 h-[1px] w-full bg-gradient-to-r from-transparent via-primary/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
    </motion.div>
  );
};

export function AuthBentoGridV2() {
  return (
    <section id="ecossistema" className="py-14 px-6 relative bg-transparent">
      <div className="max-w-7xl mx-auto">

        <div className="text-center mb-10">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="space-y-2"
          >
            
            <h2 className="text-2xl md:text-4xl font-black uppercase tracking-tighter text-white">
              POTÊNCIA <span className="text-primary">TOTAL.</span>
            </h2>
            <p className="text-muted-foreground max-w-lg mx-auto text-xs opacity-70">
              Cada módulo projetado para extrair o máximo de lucro da sua operação.
            </p>
          </motion.div>
        </div>

        {/* Grid compacto — altura automática */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
          
          <BentoCard className="md:col-span-2" icon={BarChart3} badge="Realtime"
            title="BI & DRE Real"
            description="Visão executiva do lucro líquido e CMV sem planilhas."
            visual={<FinanceVisual />} delay={0.1} />
          
          <BentoCard className="md:col-span-2" icon={Smartphone} badge="Mobile"
            title="PWA Garçom"
            description="Pedidos em 3 segundos da mesa. Funciona offline."
            visual={<PWAVisual />} delay={0.3} />
          <BentoCard className="md:col-span-2" icon={Globe} badge="Multi-loja"
            title="Multi-Tenant"
            description="1 ou 100 unidades com visão consolidada da rede."
            visual={<MultiStoreVisual />} delay={0.4} />
        </div>
      </div>
    </section>
  );
}