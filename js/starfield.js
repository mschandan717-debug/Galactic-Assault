/**
 * Parallax Starfield & Cosmic Nebula Engine for Galactic Assault
 */
class Starfield {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.stars = [];
    this.nebulae = [];
    this.shootingStars = [];
    this.warpFactor = 1.0;
    this.targetWarpFactor = 1.0;
    this.initStars();
    this.initNebulae();
  }

  initStars() {
    this.stars = [];
    const count = 180;
    for (let i = 0; i < count; i++) {
      this.stars.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        size: Math.random() < 0.7 ? Math.random() * 1.5 + 0.5 : Math.random() * 2.5 + 1.2,
        layer: Math.random() < 0.5 ? 1 : Math.random() < 0.8 ? 2 : 3, // Layer 1 (slow/far), Layer 3 (fast/close)
        alpha: Math.random() * 0.6 + 0.4,
        twinkleSpeed: Math.random() * 0.03 + 0.01,
        color: this.getRandomStarColor()
      });
    }
  }

  initNebulae() {
    this.nebulae = [
      {
        x: this.canvas.width * 0.2,
        y: this.canvas.height * 0.3,
        radius: 350,
        colorStart: 'rgba(157, 0, 255, 0.12)',
        colorEnd: 'rgba(3, 5, 15, 0)'
      },
      {
        x: this.canvas.width * 0.8,
        y: this.canvas.height * 0.7,
        radius: 400,
        colorStart: 'rgba(0, 240, 255, 0.10)',
        colorEnd: 'rgba(3, 5, 15, 0)'
      },
      {
        x: this.canvas.width * 0.5,
        y: this.canvas.height * 0.1,
        radius: 300,
        colorStart: 'rgba(255, 0, 119, 0.08)',
        colorEnd: 'rgba(3, 5, 15, 0)'
      }
    ];
  }

  getRandomStarColor() {
    const colors = [
      '#ffffff', '#ffffff', '#ffffff', 
      '#a0e0ff', '#ffe0b0', '#ffb0d0', '#c0b0ff'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  resize(width, height) {
    this.canvas.width = width;
    this.canvas.height = height;
    this.initStars();
    this.initNebulae();
  }

  setWarp(target, duration = 1.0) {
    this.targetWarpFactor = target;
  }

  spawnShootingStar() {
    if (Math.random() < 0.015 && this.shootingStars.length < 3) {
      this.shootingStars.push({
        x: Math.random() * this.canvas.width,
        y: -20,
        length: Math.random() * 60 + 40,
        speed: Math.random() * 12 + 10,
        angle: (Math.PI / 4) + (Math.random() * 0.2 - 0.1),
        alpha: 1.0,
        color: Math.random() < 0.5 ? '#00f0ff' : '#ff0077'
      });
    }
  }

  update(dt) {
    // Smooth warp factor transition
    this.warpFactor += (this.targetWarpFactor - this.warpFactor) * 0.05;

    // Update stars
    for (let star of this.stars) {
      const speed = star.layer * 20 * this.warpFactor;
      star.y += speed * dt;
      if (star.y > this.canvas.height) {
        star.y = 0;
        star.x = Math.random() * this.canvas.width;
      }

      // Twinkle effect
      star.alpha += Math.sin(Date.now() * star.twinkleSpeed * 0.1) * 0.015;
      star.alpha = Math.max(0.2, Math.min(1.0, star.alpha));
    }

    // Update shooting stars
    this.spawnShootingStar();
    for (let i = this.shootingStars.length - 1; i >= 0; i--) {
      const ss = this.shootingStars[i];
      ss.x += Math.cos(ss.angle) * ss.speed;
      ss.y += Math.sin(ss.angle) * ss.speed;
      ss.alpha -= 0.015;

      if (ss.alpha <= 0 || ss.x > this.canvas.width || ss.y > this.canvas.height) {
        this.shootingStars.splice(i, 1);
      }
    }
  }

  draw() {
    // Draw Nebulae
    for (let neb of this.nebulae) {
      const grad = this.ctx.createRadialGradient(
        neb.x, neb.y, 10,
        neb.x, neb.y, neb.radius
      );
      grad.addColorStop(0, neb.colorStart);
      grad.addColorStop(1, neb.colorEnd);

      this.ctx.fillStyle = grad;
      this.ctx.beginPath();
      this.ctx.arc(neb.x, neb.y, neb.radius, 0, Math.PI * 2);
      this.ctx.fill();
    }

    // Draw Stars
    for (let star of this.stars) {
      this.ctx.fillStyle = star.color;
      this.ctx.globalAlpha = star.alpha;

      if (this.warpFactor > 1.5) {
        // Warp streak effect
        const streakLen = Math.min(40, star.layer * 4 * this.warpFactor);
        this.ctx.strokeStyle = star.color;
        this.ctx.lineWidth = star.size;
        this.ctx.beginPath();
        this.ctx.moveTo(star.x, star.y);
        this.ctx.lineTo(star.x, star.y - streakLen);
        this.ctx.stroke();
      } else {
        this.ctx.beginPath();
        this.ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        this.ctx.fill();
      }
    }

    // Draw Shooting Stars
    this.ctx.globalAlpha = 1.0;
    for (let ss of this.shootingStars) {
      const grad = this.ctx.createLinearGradient(
        ss.x, ss.y,
        ss.x - Math.cos(ss.angle) * ss.length,
        ss.y - Math.sin(ss.angle) * ss.length
      );
      grad.addColorStop(0, ss.color);
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

      this.ctx.strokeStyle = grad;
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.moveTo(ss.x, ss.y);
      this.ctx.lineTo(
        ss.x - Math.cos(ss.angle) * ss.length,
        ss.y - Math.sin(ss.angle) * ss.length
      );
      this.ctx.stroke();
    }
  }
}
