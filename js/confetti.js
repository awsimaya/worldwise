// ─── Simple Confetti Effect ───
const Confetti = (() => {
  let canvas, ctx, particles = [], running = false;

  const COLORS = ['#4F8EF7','#22C55E','#F59E0B','#F87171','#C084FC','#FB923C','#60A5FA','#34D399'];

  function init() {
    canvas = document.getElementById('confetti-canvas');
    ctx = canvas.getContext('2d');
  }

  function createParticle() {
    return {
      x: Math.random() * canvas.width,
      y: -10,
      w: Math.random() * 10 + 5,
      h: Math.random() * 6 + 3,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      angle: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 0.2,
      vx: (Math.random() - 0.5) * 4,
      vy: Math.random() * 4 + 2,
      alpha: 1
    };
  }

  function animate() {
    if (!running) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.angle += p.spin;
      p.vy += 0.05; // gravity
      if (p.y > canvas.height * 0.7) p.alpha -= 0.02;

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);
      ctx.globalAlpha = Math.max(0, p.alpha);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    });

    particles = particles.filter(p => p.alpha > 0 && p.y < canvas.height + 20);

    if (particles.length === 0) {
      running = false;
      canvas.style.display = 'none';
    } else {
      requestAnimationFrame(animate);
    }
  }

  return {
    burst(count = 80) {
      if (!canvas) init();
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      canvas.style.display = 'block';
      for (let i = 0; i < count; i++) {
        particles.push(createParticle());
      }
      if (!running) {
        running = true;
        animate();
      }
    }
  };
})();
