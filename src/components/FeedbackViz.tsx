import { useEffect, useRef } from 'react';

export function FeedbackViz() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext('2d');
    if (!context) return;

    const ctx = context;
    let width = canvas.offsetWidth;
    let height = canvas.offsetHeight;
    let dpr = window.devicePixelRatio || 1;

    // Set canvas size with high DPI support
    const resize = () => {
      if (!canvas) return;
      dpr = window.devicePixelRatio || 1;
      width = canvas.offsetWidth * dpr;
      height = canvas.offsetHeight * dpr;
      canvas.width = width;
      canvas.height = height;
      canvas.style.width = `${canvas.offsetWidth}px`;
      canvas.style.height = `${canvas.offsetHeight}px`;
      ctx.scale(dpr, dpr);
    };
    resize();

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);

    // Initialize particles with more coverage
    const colors = ['#FF501C', '#FF8C42', '#FFB980'];
    const particles = Array.from({ length: 100 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      baseVx: (Math.random() - 0.5) * 0.4,
      baseVy: (Math.random() - 0.5) * 0.4,
      size: Math.random() * 3 + 2,
      color: colors[Math.floor(Math.random() * colors.length)]
    }));

    let lastTime = 0;

    // Animation loop
    function animate(currentTime: number) {
      ctx.clearRect(0, 0, width, height);

      // Calculate wave factor for smooth velocity variation
      const waveFactor = Math.sin(currentTime * 0.001) * 0.3 + 0.7;

      particles.forEach(particle => {
        // Apply wave motion to velocity
        particle.vx = particle.baseVx * waveFactor;
        particle.vy = particle.baseVy * waveFactor;

        // Update position
        particle.x += particle.vx;
        particle.y += particle.vy;

        // Wrap around edges with padding
        if (particle.x < -50) particle.x = width + 50;
        if (particle.x > width + 50) particle.x = -50;
        if (particle.y < -50) particle.y = height + 50;
        if (particle.y > height + 50) particle.y = -50;

        // Draw particle with glow
        ctx.save();
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fillStyle = particle.color;
        ctx.shadowColor = particle.color;
        ctx.shadowBlur = 15;
        ctx.globalAlpha = 0.7;
        ctx.fill();
        ctx.restore();

        // Draw connections
        particles.forEach(other => {
          const dx = other.x - particle.x;
          const dy = other.y - particle.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < 150) {
            ctx.beginPath();
            ctx.moveTo(particle.x, particle.y);
            ctx.lineTo(other.x, other.y);
            const alpha = Math.max(0, (150 - distance) / 150 * 0.2);
            ctx.strokeStyle = `rgba(255, 80, 28, ${alpha})`;
            ctx.lineWidth = 1.5;
            ctx.stroke();
          }
        });
      });

      lastTime = currentTime;
      requestAnimationFrame(animate);
    }

    animate(0);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  return (
    <div className="absolute inset-0">
      <canvas 
        ref={canvasRef}
        className="w-full h-full"
        style={{ 
          background: 'transparent',
          display: 'block'
        }}
      />
    </div>
  );
} 