import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Sparkles, Sliders, X, RefreshCw, Volume2, VolumeX, Eye, EyeOff } from 'lucide-react';

export type BubbleTheme = 'rainbow' | 'ocean' | 'sunset' | 'cosmic' | 'emerald';

interface Bubble {
  id: number;
  x: number;
  y: number;
  radius: number;
  baseRadius: number;
  vy: number;
  vx: number;
  wobbleSpeed: number;
  wobbleAmp: number;
  wobblePhase: number;
  alpha: number;
  hue1: number;
  hue2: number;
  saturation: number;
  lightness: number;
  popping: boolean;
  popProgress: number; // 0 to 1
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
}

export const FloatingBubbles: React.FC<{
  settings?: {
    enabled: boolean;
    theme: string;
    density: 'low' | 'medium' | 'high';
  };
  onUpdateSettings?: (settings: any) => void;
}> = ({ settings, onUpdateSettings }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Use props if available, otherwise local state (fallback)
  const [localEnabled, setLocalEnabled] = useState(true);
  const [localTheme, setLocalTheme] = useState<BubbleTheme>('rainbow');
  const [localDensity, setLocalDensity] = useState<'low' | 'medium' | 'high'>('medium');

  const isEnabled = settings?.enabled ?? localEnabled;
  const theme = (settings?.theme as BubbleTheme) ?? localTheme;
  const density = settings?.density ?? localDensity;

  const setIsEnabled = (val: boolean) => {
    if (onUpdateSettings) onUpdateSettings({ ...settings, enabled: val });
    else setLocalEnabled(val);
  };
  const setTheme = (val: BubbleTheme) => {
    if (onUpdateSettings) onUpdateSettings({ ...settings, theme: val });
    else setLocalTheme(val);
  };
  const setDensity = (val: 'low' | 'medium' | 'high') => {
    if (onUpdateSettings) onUpdateSettings({ ...settings, density: val });
    else setLocalDensity(val);
  };

  const [interactivePop, setInteractivePop] = useState<boolean>(true);
  const [showControls, setShowControls] = useState<boolean>(false);

  // Color generator based on theme
  const getThemeHues = useCallback((th: BubbleTheme): [number, number, number, number] => {
    switch (th) {
      case 'ocean': // Cyan, Azure, Mint
        return [
          170 + Math.random() * 45, // Cyan to sky blue
          200 + Math.random() * 30,
          85 + Math.random() * 15,
          65 + Math.random() * 20
        ];
      case 'sunset': // Coral, Amber, Rose, Gold
        return [
          340 + Math.random() * 50, // Rose to golden amber
          30 + Math.random() * 30,
          90 + Math.random() * 10,
          65 + Math.random() * 15
        ];
      case 'cosmic': // Magenta, Purple, Electric Blue
        return [
          260 + Math.random() * 60, // Purple to magenta
          300 + Math.random() * 40,
          90 + Math.random() * 10,
          70 + Math.random() * 15
        ];
      case 'emerald': // Mint, Emerald, Jade, Teal
        return [
          140 + Math.random() * 40, // Emerald to teal
          160 + Math.random() * 30,
          80 + Math.random() * 15,
          60 + Math.random() * 20
        ];
      case 'rainbow':
      default: {
        const h1 = Math.random() * 360;
        return [
          h1,
          (h1 + 35 + Math.random() * 40) % 360,
          85 + Math.random() * 15,
          65 + Math.random() * 15
        ];
      }
    }
  }, []);

  const bubblesRef = useRef<Bubble[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const animFrameRef = useRef<number | null>(null);
  const mousePosRef = useRef<{ x: number; y: number }>({ x: -1000, y: -1000 });

  // Initialize bubbles
  const targetCount = density === 'low' ? 16 : density === 'medium' ? 28 : 46;

  const createBubble = useCallback((width: number, height: number, startAtBottom = false): Bubble => {
    const [hue1, hue2, saturation, lightness] = getThemeHues(theme);
    const radius = 12 + Math.random() * 38; // 12px to 50px
    return {
      id: Math.random() * 1000000,
      x: Math.random() * width,
      y: startAtBottom ? height + radius + Math.random() * 40 : Math.random() * height,
      radius,
      baseRadius: radius,
      vy: 0.35 + Math.random() * 0.75, // Upward floating speed
      vx: (Math.random() - 0.5) * 0.3,
      wobbleSpeed: 0.015 + Math.random() * 0.025,
      wobbleAmp: 1.2 + Math.random() * 2.5,
      wobblePhase: Math.random() * Math.PI * 2,
      alpha: 0.55 + Math.random() * 0.35,
      hue1,
      hue2,
      saturation,
      lightness,
      popping: false,
      popProgress: 0
    };
  }, [theme, getThemeHues]);

  // Burst effect for popping a bubble
  const popBubble = useCallback((bubble: Bubble) => {
    bubble.popping = true;
    const numParticles = 8 + Math.floor(bubble.radius * 0.4);
    for (let i = 0; i < numParticles; i++) {
      const angle = (Math.PI * 2 * i) / numParticles + (Math.random() - 0.5) * 0.4;
      const speed = 1.5 + Math.random() * 3.5;
      particlesRef.current.push({
        x: bubble.x,
        y: bubble.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 0.8,
        radius: 1.5 + Math.random() * 2.5,
        color: `hsla(${bubble.hue1}, ${bubble.saturation}%, ${bubble.lightness}%, 0.85)`,
        alpha: 1,
        life: 0,
        maxLife: 20 + Math.random() * 15
      });
    }
  }, []);

  // Spawn additional fountain of bubbles
  const spawnFountain = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const count = 12;
    for (let i = 0; i < count; i++) {
      const b = createBubble(canvas.width, canvas.height, true);
      b.x = canvas.width * 0.5 + (Math.random() - 0.5) * (canvas.width * 0.4);
      b.vy *= 1.8;
      bubblesRef.current.push(b);
    }
  };

  // Main canvas animation loop
  useEffect(() => {
    if (!isEnabled) {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    // Initial populate
    bubblesRef.current = [];
    for (let i = 0; i < targetCount; i++) {
      bubblesRef.current.push(createBubble(width, height, false));
    }

    let time = 0;

    const render = () => {
      time += 1;
      ctx.clearRect(0, 0, width, height);

      // Maintain target bubble population
      while (bubblesRef.current.length < targetCount) {
        bubblesRef.current.push(createBubble(width, height, true));
      }

      // Update & Draw Bubbles
      for (let i = bubblesRef.current.length - 1; i >= 0; i--) {
        const b = bubblesRef.current[i];

        if (b.popping) {
          b.popProgress += 0.12;
          if (b.popProgress >= 1) {
            bubblesRef.current.splice(i, 1);
            continue;
          }
        } else {
          // Floating motion
          b.y -= b.vy;
          b.wobblePhase += b.wobbleSpeed;
          b.x += Math.sin(b.wobblePhase) * (b.wobbleAmp * 0.5) + b.vx;

          // Gentle cursor proximity sway
          const dx = b.x - mousePosRef.current.x;
          const dy = b.y - mousePosRef.current.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 100 && dist > 0) {
            const force = (100 - dist) / 100;
            b.x += (dx / dist) * force * 1.5;
            b.y += (dy / dist) * force * 1.5;
          }

          // Reset bubble if floated out the top
          if (b.y < -b.radius * 2) {
            bubblesRef.current[i] = createBubble(width, height, true);
            continue;
          }
        }

        // Draw iridescent 3D bubble
        ctx.save();
        ctx.translate(b.x, b.y);

        const currentRadius = b.popping
          ? b.baseRadius * (1 + b.popProgress * 0.4)
          : b.radius + Math.sin(b.wobblePhase * 2) * 1.2;
        const currentAlpha = b.popping ? b.alpha * (1 - b.popProgress) : b.alpha;

        if (currentRadius > 0) {
          // 1. Outer iridescent gradient sphere
          const gradient = ctx.createRadialGradient(
            -currentRadius * 0.3,
            -currentRadius * 0.35,
            currentRadius * 0.1,
            0,
            0,
            currentRadius
          );

          gradient.addColorStop(0, `hsla(${b.hue1}, ${b.saturation}%, ${b.lightness}%, ${currentAlpha * 0.2})`);
          gradient.addColorStop(0.5, `hsla(${b.hue2}, ${b.saturation}%, ${b.lightness}%, ${currentAlpha * 0.15})`);
          gradient.addColorStop(0.85, `hsla(${b.hue1}, ${b.saturation + 10}%, ${b.lightness + 5}%, ${currentAlpha * 0.45})`);
          gradient.addColorStop(1, `hsla(${b.hue2}, ${b.saturation}%, ${b.lightness + 10}%, ${currentAlpha * 0.75})`);

          ctx.beginPath();
          ctx.arc(0, 0, currentRadius, 0, Math.PI * 2);
          ctx.fillStyle = gradient;
          ctx.fill();

          // 2. Glowing rim border
          ctx.lineWidth = Math.max(1, currentRadius * 0.05);
          ctx.strokeStyle = `hsla(${b.hue2}, ${b.saturation}%, 85%, ${currentAlpha * 0.8})`;
          ctx.stroke();

          // 3. Curved specular highlight (top-left glint)
          ctx.beginPath();
          ctx.ellipse(
            -currentRadius * 0.38,
            -currentRadius * 0.42,
            currentRadius * 0.28,
            currentRadius * 0.14,
            -Math.PI / 4,
            0,
            Math.PI * 2
          );
          ctx.fillStyle = `rgba(255, 255, 255, ${currentAlpha * 0.85})`;
          ctx.fill();

          // 4. Secondary micro glint (bottom-right reflection)
          ctx.beginPath();
          ctx.arc(
            currentRadius * 0.42,
            currentRadius * 0.42,
            currentRadius * 0.08,
            0,
            Math.PI * 2
          );
          ctx.fillStyle = `rgba(255, 255, 255, ${currentAlpha * 0.45})`;
          ctx.fill();
        }

        ctx.restore();
      }

      // Update & Draw Particles (pop sparkles)
      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const p = particlesRef.current[i];
        p.life += 1;
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.08; // subtle gravity on sparkles
        p.alpha = 1 - p.life / p.maxLife;

        if (p.life >= p.maxLife || p.alpha <= 0) {
          particlesRef.current.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * p.alpha, 0, Math.PI * 2);
        ctx.fillStyle = p.color.replace('0.85', String(p.alpha * 0.85));
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 6;
        ctx.fill();
        ctx.restore();
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    // Mouse movement tracker
    const handleMouseMove = (e: MouseEvent) => {
      mousePosRef.current = { x: e.clientX, y: e.clientY };
    };

    // Click to pop nearest bubble
    const handleClick = (e: MouseEvent) => {
      if (!interactivePop) return;
      const clickX = e.clientX;
      const clickY = e.clientY;

      for (let i = 0; i < bubblesRef.current.length; i++) {
        const b = bubblesRef.current[i];
        if (b.popping) continue;
        const dx = b.x - clickX;
        const dy = b.y - clickY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist <= b.radius + 15) {
          popBubble(b);
          break; // pop one at a time for satisfying feel
        }
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('click', handleClick);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('click', handleClick);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isEnabled, targetCount, theme, interactivePop, createBubble, popBubble]);

  return (
    <>
      {/* Ambient Canvas Layer - zero blocking pointer events */}
      {isEnabled && (
        <canvas
          ref={canvasRef}
          className="fixed inset-0 pointer-events-none z-20 overflow-hidden"
          style={{ width: '100vw', height: '100vh' }}
        />
      )}

      {/* Floating Bubbles Interactive Widget Controls */}
      <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end">
        {showControls && (
          <div className="mb-3 w-72 bg-white/95 backdrop-blur-md border border-slate-200 shadow-xl rounded-2xl p-4 text-xs space-y-3.5 animate-in fade-in slide-in-from-bottom-3 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-1.5 font-black text-slate-800">
                <span className="text-base">🫧</span>
                <span>Ambient Floating Bubbles</span>
              </div>
              <button
                type="button"
                onClick={() => setShowControls(false)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Toggle On/Off */}
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-700">Display Floating Bubbles</span>
              <button
                type="button"
                onClick={() => setIsEnabled(!isEnabled)}
                className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors cursor-pointer ${
                  isEnabled ? 'bg-indigo-600' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                    isEnabled ? 'translate-x-5' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {isEnabled && (
              <>
                {/* Theme Palette */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                    Vibrant Color Palette
                  </span>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      { id: 'rainbow', label: '🌈 Rainbow' },
                      { id: 'ocean', label: '🌊 Ocean Blue' },
                      { id: 'sunset', label: '🌅 Sunset Gold' },
                      { id: 'cosmic', label: '🔮 Cosmic Pink' },
                      { id: 'emerald', label: '🌿 Mint Emerald' }
                    ].map(t => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setTheme(t.id as BubbleTheme)}
                        className={`px-2.5 py-1.5 rounded-lg border text-left font-bold text-[11px] transition-all cursor-pointer ${
                          theme === t.id
                            ? 'bg-blue-50 border-blue-500 text-blue-800 shadow-2xs'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Density */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                    Bubble Density
                  </span>
                  <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                    {(['low', 'medium', 'high'] as const).map(d => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setDensity(d)}
                        className={`flex-1 py-1 rounded-md text-[11px] font-bold capitalize transition-all cursor-pointer ${
                          density === d
                            ? 'bg-white text-blue-700 shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {d === 'low' ? 'Calm' : d === 'medium' ? 'Normal' : 'Party'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Pop interaction */}
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] font-semibold text-slate-600">Click to Pop Bubbles</span>
                  <button
                    type="button"
                    onClick={() => setInteractivePop(!interactivePop)}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                      interactivePop
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : 'bg-slate-100 text-slate-500 border border-slate-200'
                    }`}
                  >
                    {interactivePop ? 'Active 💥' : 'Off'}
                  </button>
                </div>

                {/* Spawn Action */}
                <button
                  type="button"
                  onClick={spawnFountain}
                  className="w-full py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-bold text-xs shadow-xs hover:from-blue-700 hover:to-indigo-700 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>Release 12 Fresh Bubbles 🫧</span>
                </button>
              </>
            )}
          </div>
        )}

        {/* Floating Bubble Quick Toggle Button */}
        <button
          type="button"
          onClick={() => setShowControls(!showControls)}
          className={`p-2.5 rounded-full shadow-lg border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            isEnabled
              ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white border-white/40 hover:scale-105 shadow-blue-500/25'
              : 'bg-white text-slate-500 border-slate-300 hover:text-slate-800 hover:bg-slate-50'
          }`}
          title="Toggle or customize ambient floating bubbles"
        >
          <span className="text-lg leading-none">🫧</span>
          {showControls && (
            <span className="text-xs font-bold pr-1">Bubbles</span>
          )}
        </button>
      </div>
    </>
  );
};
