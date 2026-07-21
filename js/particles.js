/**
 * High Performance Particle & FX Engine for Galactic Assault
 */
class ParticleEngine {
  constructor() {
    this.particles = [];
    this.floatingTexts = [];
    this.shockwaves = [];
  }

  createExplosion(x, y, color = '#ff3300', count = 25, speedScale = 1.0) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = (Math.random() * 5 + 2) * speedScale;
      this.particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: Math.random() * 4 + 2,
        color: i % 2 === 0 ? color : (i % 3 === 0 ? '#ffea00' : '#ffffff'),
        alpha: 1.0,
        decay: Math.random() * 0.02 + 0.015,
        friction: 0.96,
        type: 'spark'
      });
    }

    // Add shockwave ring
    this.shockwaves.push({
      x: x,
      y: y,
      radius: 5,
      maxRadius: 60 * speedScale,
      color: color,
      alpha: 0.9,
      lineWidth: 3
    });
  }

  createThrusterSpark(x, y, vx, vy, color = '#00f0ff') {
    this.particles.push({
      x: x + (Math.random() * 6 - 3),
      y: y,
      vx: vx + (Math.random() * 1 - 0.5),
      vy: vy + (Math.random() * 3 + 2),
      size: Math.random() * 3 + 1.5,
      color: color,
      alpha: 0.9,
      decay: Math.random() * 0.05 + 0.04,
      friction: 0.98,
      type: 'thruster'
    });
  }

  createLaserSparks(x, y, color = '#00f0ff') {
    for (let i = 0; i < 8; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 4 + 1;
      this.particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: Math.random() * 2 + 1,
        color: color,
        alpha: 1.0,
        decay: Math.random() * 0.06 + 0.04,
        friction: 0.92,
        type: 'spark'
      });
    }
  }

  addFloatingText(text, x, y, color = '#ffea00', fontSize = 16) {
    this.floatingTexts.push({
      text: text,
      x: x,
      y: y,
      vy: -1.8,
      color: color,
      fontSize: fontSize,
      alpha: 1.0,
      decay: 0.02
    });
  }

  update(dt) {
    // Update Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= p.friction;
      p.vy *= p.friction;
      p.alpha -= p.decay;

      if (p.alpha <= 0) {
        this.particles.splice(i, 1);
      }
    }

    // Update Floating Texts
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.y += ft.vy;
      ft.alpha -= ft.decay;

      if (ft.alpha <= 0) {
        this.floatingTexts.splice(i, 1);
      }
    }

    // Update Shockwaves
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const sw = this.shockwaves[i];
      sw.radius += (sw.maxRadius - sw.radius) * 0.15;
      sw.alpha -= 0.04;

      if (sw.alpha <= 0) {
        this.shockwaves.splice(i, 1);
      }
    }
  }

  draw(ctx) {
    // Draw Particles
    for (let p of this.particles) {
      ctx.fillStyle = p.color;
      ctx.globalAlpha = Math.max(0, p.alpha);
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw Shockwaves
    for (let sw of this.shockwaves) {
      ctx.strokeStyle = sw.color;
      ctx.lineWidth = sw.lineWidth;
      ctx.globalAlpha = Math.max(0, sw.alpha);
      ctx.beginPath();
      ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Draw Floating Texts
    ctx.font = '700 14px Orbitron';
    ctx.textAlign = 'center';
    for (let ft of this.floatingTexts) {
      ctx.font = `700 ${ft.fontSize}px Orbitron`;
      ctx.fillStyle = ft.color;
      ctx.globalAlpha = Math.max(0, ft.alpha);
      ctx.shadowColor = ft.color;
      ctx.shadowBlur = 8;
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.shadowBlur = 0;
    }

    ctx.globalAlpha = 1.0;
  }

  clear() {
    this.particles = [];
    this.floatingTexts = [];
    this.shockwaves = [];
  }
}
