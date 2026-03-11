/* eslint-disable @typescript-eslint/no-explicit-any */
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef } from "react";

const PARTICLE_COLORS = ["#a78bfa69", "#818df867", "#c3b5fd85"];

function MatrixCityBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mouse     = useRef({ x: 0, y: 0 });
  const tMouse    = useRef({ x: 0, y: 0 });
  const buildings = useRef<any[]>([]);
  const particles = useRef<any[]>([]);
  const raf       = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
    if (!ctx) return;

    const DPR = window.devicePixelRatio || 1;
    let W = 0, H = 0;

    const resize = () => {
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width  = W * DPR;
      canvas.height = H * DPR;
      ctx.scale(DPR, DPR);
    };
    resize();

    const SCALE   = 50;
    const ISO_COS = Math.cos(Math.PI / 6) * SCALE;
    const ISO_SIN = Math.sin(Math.PI / 6) * SCALE;
    const TW      = 0.88;

    function project(gx: number, gy: number, gz: number) {
      return {
        sx: (gx - gy) * ISO_COS,
        sy: (gx + gy) * ISO_SIN - gz,
      };
    }

    function buildCity() {
      const arr: any[] = [];
      const GRID = 7;

      for (let gx = -GRID; gx <= GRID; gx++) {
        for (let gy = -GRID; gy <= GRID; gy++) {
          const dist    = Math.sqrt(gx * gx + gy * gy);
          const density = dist < 3 ? 0.50 : dist < 5 ? 0.28 : 0.12;
          if (Math.random() > density) continue;

          const isTall = dist < 4 && Math.random() > 0.50;
          const maxH   = isTall ? 130 + Math.random() * 160 : 18 + Math.random() * 60;

          arr.push({
            gx, gy,
            h: 0,
            maxH,
            phase:        "waiting",
            spawnDelay:   dist * 60 + Math.random() * 200,
            spawnStart:   -1,
            GROW_MS:      900 + Math.random() * 500,
            // FIX: amplitude e velocidade do breathing aumentadas para ficar visível e contínuo
            breathOffset: Math.random() * Math.PI * 2,
            breathSpeed:  0.00080 + Math.random() * 0.00060,  // ~3x mais rápido
            breathAmp:    0.04 + Math.random() * 0.06,        // amplitude consistente
            isTall,
            pulseOffset:  Math.random() * Math.PI * 2,
            pulseSpeed:   0.0016 + Math.random() * 0.0014,
          });
        }
      }

      arr.sort((a, b) => (a.gx + a.gy) - (b.gx + b.gy));
      buildings.current = arr;
    }

    buildCity();

    function spawnParticle(sx: number, sy: number) {
      particles.current.push({
        x: sx, y: sy,
        vx: (Math.random() - 0.5) * 1.0,
        vy: -0.4 - Math.random() * 0.8,
        life: 1,
        size: 1.0 + Math.random() * 1.4,
        color: PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)],
      });
    }

    function drawParticles() {
      particles.current = particles.current.filter(p => p.life > 0);
      for (const p of particles.current) {
        p.x  += p.vx;
        p.y  += p.vy;
        p.vy -= 0.008;
        p.life -= 0.014;
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.life * 0.9);
        ctx.shadowColor = p.color;
        ctx.shadowBlur  = 10;
        ctx.fillStyle   = p.color;
        ctx.beginPath();
        
        
        ctx.arc(p.x, p.y, Math.max(0, p.size * p.life), 0, Math.PI * 2);
        
        ctx.fill();
        ctx.restore();
      }
    }

    function drawGround(cx: number, cy: number) {
      const GRID = 7;
      ctx.save();
      ctx.strokeStyle = "rgba(99,102,241,0.06)";
      ctx.lineWidth   = 0.5;
      for (let gx = -GRID; gx <= GRID; gx++) {
        const a = project(gx, -GRID, 0);
        const b = project(gx,  GRID, 0);
        ctx.beginPath();
        ctx.moveTo(cx + a.sx, cy + a.sy);
        ctx.lineTo(cx + b.sx, cy + b.sy);
        ctx.stroke();
      }
      for (let gy = -GRID; gy <= GRID; gy++) {
        const a = project(-GRID, gy, 0);
        const b = project( GRID, gy, 0);
        ctx.beginPath();
        ctx.moveTo(cx + a.sx, cy + a.sy);
        ctx.lineTo(cx + b.sx, cy + b.sy);
        ctx.stroke();
      }
      ctx.restore();
    }

    function drawBuilding(b: any, cx: number, cy: number, pulse: number) {
      const h = b.h;
      if (h <= 1) return;

      const glow = b.isTall ? pulse : pulse * 0.45;

      const bl = project(b.gx,      b.gy,      0);
      const br = project(b.gx + TW, b.gy,      0);
      const bf = project(b.gx,      b.gy + TW, 0);
      const bc = project(b.gx + TW, b.gy + TW, 0);
      const tl = project(b.gx,      b.gy,      h);
      const tr = project(b.gx + TW, b.gy,      h);
      const tf = project(b.gx,      b.gy + TW, h);
      const tc = project(b.gx + TW, b.gy + TW, h);

      // Face FRENTE
      ctx.beginPath();
      ctx.moveTo(cx + tl.sx, cy + tl.sy);
      ctx.lineTo(cx + tr.sx, cy + tr.sy);
      ctx.lineTo(cx + br.sx, cy + br.sy);
      ctx.lineTo(cx + bl.sx, cy + bl.sy);
      ctx.closePath();
      ctx.fillStyle   = `rgba(45,38,140,${0.60 + glow * 0.25})`;
      ctx.strokeStyle = `rgba(99,102,241,${0.12 + glow * 0.48})`;
      ctx.lineWidth   = 0.8;
      ctx.fill();
      ctx.stroke();

      // Face LADO
      ctx.beginPath();
      ctx.moveTo(cx + tl.sx, cy + tl.sy);
      ctx.lineTo(cx + tf.sx, cy + tf.sy);
      ctx.lineTo(cx + bf.sx, cy + bf.sy);
      ctx.lineTo(cx + bl.sx, cy + bl.sy);
      ctx.closePath();
      ctx.fillStyle   = `rgba(67,56,202,${0.50 + glow * 0.25})`;
      ctx.strokeStyle = `rgba(129,140,248,${0.10 + glow * 0.48})`;
      ctx.lineWidth   = 0.8;
      ctx.fill();
      ctx.stroke();

      // Face TOPO
      ctx.beginPath();
      ctx.moveTo(cx + tl.sx, cy + tl.sy);
      ctx.lineTo(cx + tr.sx, cy + tr.sy);
      ctx.lineTo(cx + tc.sx, cy + tc.sy);
      ctx.lineTo(cx + tf.sx, cy + tf.sy);
      ctx.closePath();
      ctx.fillStyle   = `rgba(124,58,237,${0.35 + glow * 0.55})`;
      ctx.strokeStyle = `rgba(196,181,253,${0.18 + glow * 0.70})`;
      ctx.lineWidth   = 0.9;
      ctx.fill();
      ctx.stroke();

      // Janelas
      const floors = Math.floor(h / 22);
      if (floors > 1) {
        ctx.save();
        ctx.globalAlpha = 0.10 + glow * 0.22;
        ctx.strokeStyle = "#818cf8";
        ctx.lineWidth   = 0.4;
        for (let f = 1; f < floors; f++) {
          const fh = (h / floors) * f;
          const a = project(b.gx,      b.gy,      fh);
          const c = project(b.gx + TW, b.gy,      fh);
          ctx.beginPath();
          ctx.moveTo(cx + a.sx, cy + a.sy);
          ctx.lineTo(cx + c.sx, cy + c.sy);
          ctx.stroke();
          const d = project(b.gx, b.gy,      fh);
          const e = project(b.gx, b.gy + TW, fh);
          ctx.beginPath();
          ctx.moveTo(cx + d.sx, cy + d.sy);
          ctx.lineTo(cx + e.sx, cy + e.sy);
          ctx.stroke();
        }
        ctx.restore();
      }

      // Beacon
      if (b.isTall && pulse > 0.50) {
        const intensity = (pulse - 0.50) / 0.50;
        ctx.save();
        ctx.globalAlpha = 0.5 + intensity * 0.5;
        ctx.shadowColor = "#a78bfa";
        ctx.shadowBlur  = 14 + intensity * 24;
        ctx.fillStyle   = "#ddd6fe";
        ctx.beginPath();
        ctx.arc(cx + tl.sx, cy + tl.sy, 2.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        if (Math.random() < 0.028 * intensity) spawnParticle(cx + tl.sx, cy + tl.sy);
      }
    }

    function drawConnections(elapsed: number, cx: number, cy: number) {
      const tall = buildings.current.filter(b => b.isTall && b.phase === "alive");
      for (let i = 0; i + 1 < tall.length; i += 2) {
        const a = tall[i], b = tall[i + 1];
        const pa = project(a.gx, a.gy, a.h);
        const pb = project(b.gx, b.gy, b.h);
        const alpha = 0.04 + 0.10 * Math.abs(Math.sin(elapsed * 0.0012 + i));
        ctx.beginPath();
        ctx.strokeStyle = `rgba(99,102,241,${alpha})`;
        ctx.lineWidth   = 0.5;
        ctx.moveTo(cx + pa.sx, cy + pa.sy);
        ctx.lineTo(cx + pb.sx, cy + pb.sy);
        ctx.stroke();
      }
    }

    const startTime = performance.now();

    function animate(now: number) {
      const elapsed = now - startTime;
      ctx.clearRect(0, 0, W, H);

      mouse.current.x += (tMouse.current.x - mouse.current.x) * 0.035;
      mouse.current.y += (tMouse.current.y - mouse.current.y) * 0.035;

      const offsetX = (mouse.current.x - W / 2) * 0.014;
      const offsetY = (mouse.current.y - H / 2) * 0.009;
      const cx = W * 0.65 + offsetX;
      const cy = H * 0.68 + offsetY;

      ctx.save();
      drawGround(cx, cy);
      drawConnections(elapsed, cx, cy);

      for (const b of buildings.current) {

        if (b.phase === "waiting") {
          if (elapsed >= b.spawnDelay) {
            b.phase      = "growing";
            b.spawnStart = elapsed;
          }
          continue;
        }

        if (b.phase === "growing") {
          const t    = Math.min(1, (elapsed - b.spawnStart) / b.GROW_MS);
          const ease = 1 - Math.pow(1 - t, 3);
          b.h = b.maxH * ease;
          if (t >= 1) {
            b.h     = b.maxH;
            b.phase = "alive";
          }
          const pulse = 0.5 + 0.5 * Math.sin(elapsed * b.pulseSpeed + b.pulseOffset);
          drawBuilding(b, cx, cy, pulse);
          continue;
        }

        // FIX: mantém o argumento do sin pequeno para evitar perda de precisão
        // de float com elapsed muito grande (ex: após vários minutos)
        const TWO_PI = Math.PI * 2;
        const breathArg = ((elapsed * b.breathSpeed + b.breathOffset) % TWO_PI);
        const breath = Math.sin(breathArg);
        b.h = b.maxH * (1 + breath * b.breathAmp);

        const pulse = 0.5 + 0.5 * Math.sin(elapsed * b.pulseSpeed + b.pulseOffset);
        drawBuilding(b, cx, cy, pulse);
      }

      drawParticles();
      ctx.restore();
      raf.current = requestAnimationFrame(animate);
    }

    raf.current = requestAnimationFrame(animate);

    const onResize = () => resize();
    const onMouse  = (e: MouseEvent) => {
      tMouse.current.x = e.clientX;
      tMouse.current.y = e.clientY;
    };
    window.addEventListener("resize",    onResize);
    window.addEventListener("mousemove", onMouse);
    return () => {
      cancelAnimationFrame(raf.current);
      window.removeEventListener("resize",    onResize);
      window.removeEventListener("mousemove", onMouse);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
      style={{
        opacity: 0.82,
        maskImage:        "linear-gradient(to top, transparent 0%, black 25%, black 100%)",
        WebkitMaskImage:  "linear-gradient(to top, transparent 0%, black 25%, black 100%)",
      }}
    />
  );
}

function ScrollIndicator() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY <= 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          onClick={() => document.getElementById("login")?.scrollIntoView({ behavior: "smooth" })}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -18 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-3 bg-transparent border-none cursor-pointer"
          aria-label="Rolar para baixo"
          style={{ outline: "none" }}
        >
          <div className="flex flex-col items-center gap-4 select-none">
  <span
    className="text-[11px] font-semibold uppercase"
    style={{
      color: "rgba(255, 255, 255, 0.85)",
      letterSpacing: "0.25em",
      textShadow:
        "0 0 15px rgba(0, 0, 0, 0.9), 0 0 18px rgba(18, 15, 29, 0.6)"
    }}
  >
    explorar
  </span>

  <div className="relative flex items-center justify-center h-[70px] w-[40px]">
    
    {/* Trilho */}
    <div
      style={{
        position: "absolute",
        width: 2,
        height: 55,
        borderRadius: 2,
        background:
          "linear-gradient(to bottom, transparent, rgba(167,139,250,0.5), transparent)",
        boxShadow: "0 0 10px rgba(167,139,250,0.4)"
      }}
    />

    {/* Dedo animado */}
    <motion.div
      animate={{
        y: [20, -5, 20],
        scaleY: [1, 0.85, 1],
        opacity: [0.4, 1, 0.4]
      }}
      transition={{
        duration: 2,
        repeat: Infinity,
        ease: "easeInOut"
      }}
      style={{
        position: "absolute",
        width: 10,
        height: 20,
        borderRadius: 10,
        background: "linear-gradient(to bottom, #aa44c4, #818cf8)",
        boxShadow: "0 0 12px rgba(102, 15, 143, 0.7)"
      }}
    />

    
  </div>
</div>
        </motion.button>
      )}
    </AnimatePresence>
  );
}

export function AuthHeroV2() {
  const [textIndex, setTextIndex] = useState(0);
  const texts = ["Mesa e Comanda", "KDS e Cozinha", "Estoque Preditivo", "Financeiro Real"];

  useEffect(() => {
    const t = setInterval(() => setTextIndex(p => (p + 1) % texts.length), 3000);
    return () => clearInterval(t);
  }, []);

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden bg-transparent">
      <MatrixCityBackground />

      {/* scanline overlay */}
      <div
        className="absolute inset-0 pointer-events-none z-0"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(99,102,241,0.010) 3px, rgba(99,102,241,0.010) 4px)",
        }}
      />

      {/* Conteúdo — canto esquerdo, ocupa ~45% da largura */}
      <div className="relative z-10 w-full max-w-xl px-10 md:px-16 ml-0">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.0, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col items-start"
        >
          {/* Título */}
          <h1 className="text-4xl md:text-6xl font-black tracking-tighter leading-[0.88] text-white mb-6">
            DOMINE SUA <br />
            <motion.span
              className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-accent to-primary bg-[length:200%_auto] inline-block"
              animate={{ backgroundPosition: ["0% 50%", "200% 50%"] }}
              transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
            >
              OPERAÇÃO.
            </motion.span>
          </h1>

          {/* Subtítulo */}
          <div className="mb-12">
            <p className="text-base md:text-lg text-muted-foreground font-medium">
              Tecnologia de ponta para{" "}
              <AnimatePresence mode="wait">
                <motion.span
                  key={textIndex}
                  initial={{ opacity: 0, filter: "blur(10px)", y: 8 }}
                  animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
                  exit={{ opacity: 0, filter: "blur(10px)", y: -8 }}
                  transition={{ duration: 0.40, ease: [0.16, 1, 0.3, 1] }}
                  className="text-white font-black border-b border-primary inline"
                  style={{ display: "inline-block", minWidth: "11ch" }}
                >
                  {texts[textIndex]}
                </motion.span>
              </AnimatePresence>
            </p>
          </div>
        </motion.div>
      </div>

      {/* Scroll indicator — linha fina pulsando, some ao scrollar */}
      <ScrollIndicator />
    </section>
  );
}