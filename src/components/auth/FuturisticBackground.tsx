import { useEffect, useState } from 'react';

export function FuturisticBackground() {
  const [mousePosition, setMousePosition] = useState({ x: 50, y: 50 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth) * 100;
      const y = (e.clientY / window.innerHeight) * 100;
      setMousePosition({ x, y });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      {/* Base gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-primary/5" />
      
      {/* Grid pattern */}
      <div 
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(hsl(var(--primary)) 1px, transparent 1px),
            linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px',
        }}
      />

      {/* Floating orbs */}
      <div 
        className="absolute w-[600px] h-[600px] rounded-full animate-float opacity-30 blur-3xl"
        style={{
          background: 'radial-gradient(circle, hsl(var(--primary) / 0.4), transparent 70%)',
          left: '-200px',
          top: '-200px',
        }}
      />
      <div 
        className="absolute w-[500px] h-[500px] rounded-full animate-float-delayed opacity-20 blur-3xl"
        style={{
          background: 'radial-gradient(circle, hsl(270 60% 55% / 0.4), transparent 70%)',
          right: '-150px',
          bottom: '-150px',
        }}
      />
      <div 
        className="absolute w-[400px] h-[400px] rounded-full animate-pulse-glow opacity-20 blur-2xl"
        style={{
          background: 'radial-gradient(circle, hsl(190 80% 50% / 0.3), transparent 70%)',
          right: '20%',
          top: '10%',
        }}
      />

      {/* Mouse-following light */}
      <div 
        className="absolute w-[800px] h-[800px] rounded-full transition-all duration-1000 ease-out opacity-10 blur-3xl"
        style={{
          background: 'radial-gradient(circle, hsl(var(--primary) / 0.5), transparent 60%)',
          left: `${mousePosition.x}%`,
          top: `${mousePosition.y}%`,
          transform: 'translate(-50%, -50%)',
        }}
      />

      {/* Light beams */}
      <div 
        className="absolute w-1 h-[200vh] light-beam opacity-20 -rotate-45"
        style={{ left: '20%', top: '-50%' }}
      />
      <div 
        className="absolute w-1 h-[200vh] light-beam opacity-15 -rotate-45"
        style={{ left: '70%', top: '-50%' }}
      />

      {/* Orbiting particles */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="animate-orbit">
          <div className="w-2 h-2 rounded-full bg-primary/50 blur-sm" />
        </div>
      </div>
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="animate-orbit-reverse">
          <div className="w-3 h-3 rounded-full bg-purple-500/40 blur-sm" />
        </div>
      </div>

      {/* Glowing dots */}
      {[...Array(20)].map((_, i) => (
        <div
          key={i}
          className="absolute w-1 h-1 rounded-full bg-primary/40 animate-pulse"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 4}s`,
            animationDuration: `${2 + Math.random() * 3}s`,
          }}
        />
      ))}
    </div>
  );
}
