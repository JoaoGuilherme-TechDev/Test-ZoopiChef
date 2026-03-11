/* eslint-disable @typescript-eslint/no-explicit-any */
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef, useEffect } from "react";
import { TrendingUp, Target, Zap, Activity } from "lucide-react";

// ── PULSO NATIVO (sem Framer Motion) ─────────────────────────────────────────

function PulseCircle({ fromX, fromY, toX, toY, delay }: {
  fromX: number; fromY: number;
  toX: number; toY: number;
  delay: number;
}) {
  const circleRef = useRef<SVGCircleElement>(null);

  useEffect(() => {
    const circle = circleRef.current;
    if (!circle) return;

    let start: number | null = null;
    let raf: number;
    const duration = 1500;
    const delayMs = delay * 1000;

    function animate(ts: number) {
      if (start === null) start = ts;
      const elapsed = ts - start - delayMs;

      if (elapsed >= 0) {
        const t = (elapsed % duration) / duration;
        const cx = fromX + (toX - fromX) * t;
        const cy = fromY + (toY - fromY) * t;
        circle!.setAttribute("cx", String(cx));
        circle!.setAttribute("cy", String(cy));
        circle!.setAttribute("r", "0.8");
      }

      raf = requestAnimationFrame(animate);
    }

    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [fromX, fromY, toX, toY, delay]);

  return (
    <circle
      ref={circleRef}
      fill="rgba(139,92,246,0.9)"
      filter="url(#glow)"
    />
  );
}

// ── REDE NEURAL ANIMADA ───────────────────────────────────────────────────────

function NeuralNetworkVisual() {
  const nodes = [
    { id: 0, x: 15, y: 20 }, { id: 1, x: 15, y: 40 },
    { id: 2, x: 15, y: 60 }, { id: 3, x: 15, y: 80 },
    { id: 4, x: 38, y: 15 }, { id: 5, x: 38, y: 35 },
    { id: 6, x: 38, y: 55 }, { id: 7, x: 38, y: 75 }, { id: 8, x: 38, y: 90 },
    { id: 9, x: 62, y: 25 }, { id: 10, x: 62, y: 50 }, { id: 11, x: 62, y: 75 },
    { id: 12, x: 85, y: 30 }, { id: 13, x: 85, y: 55 }, { id: 14, x: 85, y: 75 },
  ];

  const edges = [
    [0,4],[0,5],[0,6],[1,4],[1,5],[1,6],[1,7],[2,5],[2,6],[2,7],[2,8],[3,6],[3,7],[3,8],
    [4,9],[4,10],[5,9],[5,10],[5,11],[6,9],[6,10],[6,11],[7,10],[7,11],[8,10],[8,11],
    [9,12],[9,13],[10,12],[10,13],[10,14],[11,13],[11,14],
  ];

  const pulseEdges = [
    [0,4],[1,6],[2,7],[3,8],
    [5,10],[6,9],[7,11],
    [9,12],[10,14],[11,13],
  ];

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <div className="absolute inset-0 bg-primary/8 blur-[80px] rounded-full" />

      <svg
        viewBox="0 0 100 100"
        className="w-full h-full max-w-[420px] max-h-[420px]"
        style={{ filter: "drop-shadow(0 0 8px rgba(99,102,241,0.3))" }}
      >
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="1.5" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Conexões estáticas */}
        {edges.map(([a, b], i) => {
          const from = nodes[a];
          const to = nodes[b];
          const isPulse = pulseEdges.some(([pa, pb]) => pa === a && pb === b);
          return (
            <motion.line
              key={`edge-${i}`}
              x1={`${from.x}%`} y1={`${from.y}%`}
              x2={`${to.x}%`} y2={`${to.y}%`}
              stroke={isPulse ? "rgba(99,102,241,0.4)" : "rgba(99,102,241,0.12)"}
              strokeWidth={isPulse ? "0.6" : "0.3"}
              initial={{ opacity: 0, pathLength: 0 }}
              whileInView={{ opacity: 1, pathLength: 1 }}
              transition={{ delay: 0.1 + i * 0.015, duration: 0.6 }}
              viewport={{ once: true }}
            />
          );
        })}

        {/* Pulsos nativos — sem Framer Motion */}
        {pulseEdges.map(([a, b], i) => (
          <PulseCircle
            key={`pulse-${i}`}
            fromX={nodes[a].x}
            fromY={nodes[a].y}
            toX={nodes[b].x}
            toY={nodes[b].y}
            delay={i * 0.3}
          />
        ))}

        {/* Nós */}
        {nodes.map((node, i) => {
          const isOutput = node.x > 80;
          const isInput = node.x < 20;
          return (
            <motion.g key={`node-${i}`}>
              {isOutput && (
                <motion.circle
                  cx={`${node.x}%`} cy={`${node.y}%`}
                  fill="none"
                  stroke="rgba(99,102,241,0.4)"
                  strokeWidth="0.4"
                  animate={{ opacity: [0.4, 0, 0.4] }}
                  transition={{ duration: 2.5, repeat: Infinity, delay: i * 0.2 }}
                  r={2.5}
                />
              )}
              <motion.circle
                cx={`${node.x}%`} cy={`${node.y}%`}
                r={isInput || isOutput ? "2" : "1.5"}
                fill={isOutput ? "rgba(99,102,241,0.9)" : isInput ? "rgba(139,92,246,0.7)" : "rgba(99,102,241,0.5)"}
                filter={isOutput ? "url(#glow)" : undefined}
                initial={{ scale: 0, opacity: 0 }}
                whileInView={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.3 + i * 0.04, duration: 0.4 }}
                viewport={{ once: true }}
              />
            </motion.g>
          );
        })}
      </svg>

      <div className="absolute bottom-0 left-0 right-0 flex justify-between px-4 pb-1">
        {["Input", "Hidden", "Hidden", "Output"].map((label, i) => (
          <span key={i} className="text-[8px] font-bold text-muted-foreground/40 uppercase tracking-wider">
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── MÉTRICAS FLUTUANTES ───────────────────────────────────────────────────────

function FloatingMetric({ label, value, color, delay }: {
  label: string;
  value: string;
  color: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      whileInView={{ opacity: 1, scale: 1 }}
      transition={{ delay, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      viewport={{ once: true }}
      className="p-3 rounded-2xl bg-black/60 backdrop-blur-xl border border-white/10 shadow-xl"
    >
      <p className="text-[9px] text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-base font-black ${color}`}>{value}</p>
    </motion.div>
  );
}

// ── SEÇÃO PRINCIPAL ───────────────────────────────────────────────────────────

export function AuthAISectionV2() {
  const containerRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"],
  });

  const opacity = useTransform(scrollYProgress, [0, 0.15, 0.85, 1], [0, 1, 1, 0]);
  const y = useTransform(scrollYProgress, [0, 0.15], [40, 0]);

  return (
    <section
      ref={containerRef}
      id="inteligência"
      className="py-09 relative overflow-hidden bg-transparent"
    >
      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(circle, #4f46e5 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">

          {/* ── LADO ESQUERDO ── */}
          <motion.div style={{ opacity, y }} className="space-y-8">
            <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter leading-[0.9] text-white">
              A INTELIGÊNCIA QUE <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">
                ANTECIPA O CAOS.
              </span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { icon: TrendingUp, title: "Predição de Vendas", desc: "IA que projeta seu faturamento com precisão cirúrgica." },
                { icon: Target, title: "Análise de Churn", desc: "Identifique e recupere clientes antes que eles te esqueçam." },
                { icon: Zap, title: "Alertas Proativos", desc: "Notificações inteligentes de estoque crítico e gargalos." },
                { icon: Activity, title: "Monitoramento Real", desc: "Dashboard vivo com indicadores atualizados a cada segundo." },
              ].map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + i * 0.08, duration: 0.5 }}
                  viewport={{ once: true }}
                  className="p-3 rounded-[1.5rem] bg-white/[0.02] border border-white/5 hover:border-primary/30 transition-all group"
                >
                  <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:bg-primary/20 transition-all">
                    <item.icon className="h-5 w-5 text-primary" />
                  </div>
                  <h4 className="text-sm font-bold uppercase text-white mb-1 tracking-tight">{item.title}</h4>
                  <p className="text-xs text-muted-foreground leading-snug">{item.desc}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* ── LADO DIREITO ── */}
          <div className="relative flex items-center justify-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
              viewport={{ once: true }}
              className="relative w-72 h-72 md:w-[440px] md:h-[440px]"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 rounded-full border border-dashed border-primary/10"
              />
              <motion.div
                animate={{ rotate: -360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="absolute inset-8 rounded-full border border-primary/8"
              />
              <div className="absolute inset-10">
                <NeuralNetworkVisual />
              </div>
            </motion.div>

            
            
          </div>

        </div>
      </div>
    </section>
  );
}