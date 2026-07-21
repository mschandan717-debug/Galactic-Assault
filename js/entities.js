/**
 * Game Entities for Galactic Assault
 */

// Player Spaceship Entity
class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.radius = 22;
    this.speed = 450;
    this.friction = 0.88;

    this.maxHealth = 100;
    this.health = 100;
    this.maxShield = 100;
    this.shield = 100;
    this.shieldActive = false;
    this.shieldTimer = 0;

    this.weaponLevel = 1; // 1: Single, 2: Twin, 3: Triple Spread, 4: Quad Plasma
    this.fireCooldown = 0;
    this.fireRate = 0.14; // seconds between shots

    this.bombs = 2;
    this.invulnerableTimer = 0;
    this.isDead = false;
  }

  update(dt, keys, mousePos, bounds, particleEngine) {
    if (this.isDead) return;

    // Movement vector from keyboard input
    let moveX = 0;
    let moveY = 0;

    if (keys['KeyA'] || keys['ArrowLeft']) moveX -= 1;
    if (keys['KeyD'] || keys['ArrowRight']) moveX += 1;
    if (keys['KeyW'] || keys['ArrowUp']) moveY -= 1;
    if (keys['KeyS'] || keys['ArrowDown']) moveY += 1;

    // Normalize diagonal velocity
    if (moveX !== 0 && moveY !== 0) {
      moveX *= 0.7071;
      moveY *= 0.7071;
    }

    if (moveX !== 0 || moveY !== 0) {
      // Keyboard Movement takes active priority
      this.vx += moveX * this.speed * dt;
      this.vy += moveY * this.speed * dt;
      this.x += this.vx;
      this.y += this.vy;
      this.vx *= this.friction;
      this.vy *= this.friction;
    } else if (mousePos && mousePos.x !== null && mousePos.y !== null) {
      // Smoothly follow mouse cursor
      const dx = mousePos.x - this.x;
      const dy = mousePos.y - this.y;
      
      this.vx = dx * 0.18;
      this.vy = dy * 0.18;
      this.x += this.vx;
      this.y += this.vy;
    } else {
      // Apply existing velocity and friction
      this.x += this.vx;
      this.y += this.vy;
      this.vx *= this.friction;
      this.vy *= this.friction;
    }

    // Clamp inside viewport screen bounds
    this.x = Math.max(this.radius, Math.min(bounds.width - this.radius, this.x));
    this.y = Math.max(this.radius + 40, Math.min(bounds.height - this.radius - 20, this.y));

    // Spawn thruster sparks
    if (moveY < 0 || Math.abs(this.vx) > 0.5 || Math.abs(this.vy) > 0.5) {
      particleEngine.createThrusterSpark(this.x - 8, this.y + 20, this.vx * 0.2, this.vy * 0.2, '#00f0ff');
      particleEngine.createThrusterSpark(this.x + 8, this.y + 20, this.vx * 0.2, this.vy * 0.2, '#00f0ff');
    } else {
      particleEngine.createThrusterSpark(this.x, this.y + 22, 0, 1, '#00aaff');
    }

    // Timers
    if (this.fireCooldown > 0) this.fireCooldown -= dt;
    if (this.invulnerableTimer > 0) this.invulnerableTimer -= dt;

    if (this.shieldActive) {
      this.shieldTimer -= dt;
      if (this.shieldTimer <= 0) {
        this.shieldActive = false;
      }
    }

    // Slowly recharge shield over time if not damaged recently
    if (!this.shieldActive && this.shield < this.maxShield) {
      this.shield = Math.min(this.maxShield, this.shield + 6 * dt);
    }
  }

  canShoot() {
    return this.fireCooldown <= 0 && !this.isDead;
  }

  shoot() {
    this.fireCooldown = this.fireRate;
    const lasers = [];

    if (this.weaponLevel === 1) {
      lasers.push(new Laser(this.x, this.y - 20, 0, -850, true));
    } else if (this.weaponLevel === 2) {
      lasers.push(new Laser(this.x - 12, this.y - 15, 0, -850, true));
      lasers.push(new Laser(this.x + 12, this.y - 15, 0, -850, true));
    } else if (this.weaponLevel === 3) {
      lasers.push(new Laser(this.x, this.y - 20, 0, -850, true));
      lasers.push(new Laser(this.x - 14, this.y - 10, -120, -830, true));
      lasers.push(new Laser(this.x + 14, this.y - 10, 120, -830, true));
    } else {
      // Quad spread plasma
      lasers.push(new Laser(this.x - 8, this.y - 20, -60, -880, true, '#ff0077'));
      lasers.push(new Laser(this.x + 8, this.y - 20, 60, -880, true, '#ff0077'));
      lasers.push(new Laser(this.x - 18, this.y - 10, -200, -800, true, '#00f0ff'));
      lasers.push(new Laser(this.x + 18, this.y - 10, 200, -800, true, '#00f0ff'));
    }

    return lasers;
  }

  takeDamage(amount) {
    if (this.invulnerableTimer > 0 || this.isDead) return false;

    if (this.shieldActive || this.shield > 0) {
      if (this.shield >= amount) {
        this.shield -= amount;
      } else {
        const remaining = amount - this.shield;
        this.shield = 0;
        this.health -= remaining;
      }
    } else {
      this.health -= amount;
    }

    this.invulnerableTimer = 0.4;

    if (this.health <= 0) {
      this.health = 0;
      this.isDead = true;
    }
    return true;
  }

  activateShield(duration = 6.0) {
    this.shieldActive = true;
    this.shieldTimer = duration;
    this.shield = this.maxShield;
  }

  draw(ctx) {
    if (this.isDead) return;

    // Blink if invulnerable
    if (this.invulnerableTimer > 0 && Math.floor(Date.now() / 60) % 2 === 0) {
      return;
    }

    ctx.save();
    ctx.translate(this.x, this.y);

    // Tilt effect when moving left/right
    const tilt = this.vx * 0.03;
    ctx.rotate(tilt);

    // Hull glow
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 15;

    // Draw Main Ship Body (Futuristic Vector Fighter)
    ctx.fillStyle = '#0a1936';
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(0, -24);          // Nose tip
    ctx.lineTo(14, 10);          // Right wing tip
    ctx.lineTo(22, 18);          // Right outer tip
    ctx.lineTo(8, 16);           // Right engine alcove
    ctx.lineTo(0, 22);           // Rear exhaust center
    ctx.lineTo(-8, 16);          // Left engine alcove
    ctx.lineTo(-22, 18);         // Left outer tip
    ctx.lineTo(-14, 10);         // Left wing tip
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Secondary Accent Lines
    ctx.strokeStyle = '#ff0077';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-10, 5);
    ctx.lineTo(0, -12);
    ctx.lineTo(10, 5);
    ctx.stroke();

    // Cockpit Canopy Glow
    const canopyGrad = ctx.createLinearGradient(0, -18, 0, 2);
    canopyGrad.addColorStop(0, '#ffffff');
    canopyGrad.addColorStop(1, '#00f0ff');

    ctx.fillStyle = canopyGrad;
    ctx.beginPath();
    ctx.ellipse(0, -6, 5, 10, 0, 0, Math.PI * 2);
    ctx.fill();

    // Shield Aura Sphere
    if (this.shieldActive || this.shield > 20) {
      const shieldAlpha = this.shieldActive ? 0.7 : (this.shield / this.maxShield) * 0.35;
      ctx.strokeStyle = '#00f0ff';
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 20;
      ctx.lineWidth = 2.5;
      ctx.globalAlpha = shieldAlpha + Math.sin(Date.now() * 0.01) * 0.15;

      ctx.beginPath();
      ctx.arc(0, 0, 32, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  }
}

// Projectile Class
class Laser {
  constructor(x, y, vx, vy, isPlayer = true, color = null) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.isPlayer = isPlayer;
    this.color = color || (isPlayer ? '#00f0ff' : '#ff0055');
    this.radius = isPlayer ? 4 : 5;
    this.active = true;
  }

  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
  }

  draw(ctx) {
    ctx.save();
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 12;

    if (this.isPlayer) {
      // Laser streak line
      ctx.strokeStyle = this.color;
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(this.x - this.vx * 0.02, this.y - this.vy * 0.02);
      ctx.lineTo(this.x, this.y);
      ctx.stroke();

      // Bright core
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(this.x - this.vx * 0.01, this.y - this.vy * 0.01);
      ctx.lineTo(this.x, this.y);
      ctx.stroke();
    } else {
      // Enemy plasma sphere
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}

// Enemy Base & Types (Scout, Fighter, Battleship, Kamikaze)
class Enemy {
  constructor(x, y, type = 'fighter') {
    this.x = x;
    this.y = y;
    this.type = type;
    this.active = true;
    this.shootTimer = Math.random() * 1.5;
    this.strafeTimer = 0;
    this.strafeDirection = Math.random() < 0.5 ? 1 : -1;

    if (this.type === 'scout') {
      this.radius = 16;
      this.hp = 25;
      this.maxHp = 25;
      this.speed = 180;
      this.scoreValue = 100;
      this.color = '#ff0055';
      this.sineOffset = Math.random() * Math.PI * 2;
    } else if (this.type === 'fighter') {
      this.radius = 20;
      this.hp = 45;
      this.maxHp = 45;
      this.speed = 200;
      this.scoreValue = 200;
      this.color = '#ff6600';
    } else if (this.type === 'battleship') {
      this.radius = 36;
      this.hp = 350;
      this.maxHp = 350;
      this.speed = 75;
      this.scoreValue = 750;
      this.color = '#aa00ff';
      this.hoverOffset = Math.random() * Math.PI * 2;
    } else if (this.type === 'kamikaze') {
      this.radius = 14;
      this.hp = 30;
      this.maxHp = 30;
      this.speed = 290;
      this.scoreValue = 180;
      this.color = '#ff0033';
    }
  }

  update(dt, playerPos) {
    if (this.type === 'scout') {
      this.y += this.speed * dt;
      this.sineOffset += dt * 4;
      this.x += Math.sin(this.sineOffset) * 120 * dt;
    } else if (this.type === 'fighter') {
      // Fighter movement: tactical forward dive with lateral strafing
      this.y += this.speed * dt;
      this.strafeTimer += dt;
      if (this.strafeTimer > 1.2) {
        this.strafeDirection *= -1;
        this.strafeTimer = 0;
      }
      this.x += this.strafeDirection * 80 * dt;
    } else if (this.type === 'battleship') {
      // Battleship movement: heavy slow descent with broadside hover oscillation
      this.y += this.speed * dt;
      this.hoverOffset += dt * 1.5;
      this.x += Math.sin(this.hoverOffset) * 50 * dt;
    } else if (this.type === 'kamikaze') {
      // Kamikaze movement: aggressive direct homing charge towards player coordinates
      const dx = playerPos ? playerPos.x - this.x : 0;
      const dy = playerPos ? playerPos.y - this.y : 1;
      const dist = Math.hypot(dx, dy) || 1;
      this.x += (dx / dist) * this.speed * dt;
      this.y += (dy / dist) * this.speed * dt;
    }

    // Shooting logic
    this.shootTimer -= dt;
  }

  canShoot() {
    if (this.shootTimer <= 0) {
      if (this.type === 'fighter') {
        this.shootTimer = 1.6 + Math.random() * 0.8;
        return true;
      } else if (this.type === 'battleship') {
        this.shootTimer = 1.2 + Math.random() * 0.6;
        return true;
      }
    }
    return false;
  }

  shoot() {
    const lasers = [];
    if (this.type === 'fighter') {
      lasers.push(new Laser(this.x - 10, this.y + 12, 0, 460, false, '#ff6600'));
      lasers.push(new Laser(this.x + 10, this.y + 12, 0, 460, false, '#ff6600'));
    } else if (this.type === 'battleship') {
      // 3-way broadside spread
      lasers.push(new Laser(this.x - 22, this.y + 20, -70, 420, false, '#aa00ff'));
      lasers.push(new Laser(this.x, this.y + 25, 0, 460, false, '#ff00ff'));
      lasers.push(new Laser(this.x + 22, this.y + 20, 70, 420, false, '#aa00ff'));
    }
    return lasers;
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 14;

    if (this.type === 'scout') {
      ctx.fillStyle = '#220011';
      ctx.strokeStyle = this.color;
      ctx.lineWidth = 2;

      ctx.beginPath();
      ctx.moveTo(0, 16);
      ctx.lineTo(-14, -14);
      ctx.lineTo(0, -6);
      ctx.lineTo(14, -14);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (this.type === 'fighter') {
      // Sleek Fighter Jet Wings
      ctx.fillStyle = '#261200';
      ctx.strokeStyle = this.color;
      ctx.lineWidth = 2.2;

      ctx.beginPath();
      ctx.moveTo(0, 20);           // Nose
      ctx.lineTo(-16, -2);
      ctx.lineTo(-22, -14);
      ctx.lineTo(-8, -12);
      ctx.lineTo(0, -18);          // Tail
      ctx.lineTo(8, -12);
      ctx.lineTo(22, -14);
      ctx.lineTo(16, -2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (this.type === 'battleship') {
      // Heavy Armored Battleship Hull
      ctx.fillStyle = '#160028';
      ctx.strokeStyle = this.color;
      ctx.lineWidth = 3.0;

      ctx.beginPath();
      ctx.moveTo(-32, -24);
      ctx.lineTo(32, -24);
      ctx.lineTo(38, -4);
      ctx.lineTo(20, 28);
      ctx.lineTo(-20, 28);
      ctx.lineTo(-38, -4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Reactor Core Glow
      ctx.fillStyle = '#ff00ff';
      ctx.beginPath();
      ctx.arc(0, 0, 10, 0, Math.PI * 2);
      ctx.fill();

      // HP Bar overhead
      if (this.hp < this.maxHp) {
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(-24, -36, 48, 6);
        ctx.fillStyle = '#aa00ff';
        ctx.fillRect(-24, -36, (this.hp / this.maxHp) * 48, 6);
      }
    } else if (this.type === 'kamikaze') {
      // Pulsing Warhead Drone
      const pulse = Math.sin(Date.now() * 0.02) * 2;
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.arc(0, 0, 10 + pulse, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, 14);
      ctx.lineTo(-10, -10);
      ctx.lineTo(10, -10);
      ctx.closePath();
      ctx.stroke();
    }

    ctx.restore();
  }
}

// Stage Boss Class (Cyber Dreadnought)
class Boss {
  constructor(canvasWidth) {
    this.x = canvasWidth / 2;
    this.y = -120;
    this.targetY = 120;
    this.radius = 70;
    this.maxHp = 1500;
    this.hp = 1500;
    this.active = true;
    this.scoreValue = 5000;
    this.color = '#ff0055';
    this.shootTimer = 0;
    this.phase = 1;
    this.sineAngle = 0;
  }

  update(dt, playerPos) {
    // Intro entrance movement
    if (this.y < this.targetY) {
      this.y += 60 * dt;
    } else {
      // Hover back and forth
      this.sineAngle += dt * 0.8;
      this.x += Math.sin(this.sineAngle) * 90 * dt;
    }

    // Phase transition based on HP
    if (this.hp < this.maxHp * 0.4) {
      this.phase = 2;
    }

    this.shootTimer -= dt;
  }

  canShoot() {
    if (this.shootTimer <= 0) {
      this.shootTimer = this.phase === 1 ? 0.9 : 0.55;
      return true;
    }
    return false;
  }

  shoot() {
    const lasers = [];
    if (this.phase === 1) {
      // Twin plasma bursts + center beam
      lasers.push(new Laser(this.x - 45, this.y + 40, -80, 450, false, '#ff0055'));
      lasers.push(new Laser(this.x + 45, this.y + 40, 80, 450, false, '#ff0055'));
      lasers.push(new Laser(this.x, this.y + 60, 0, 500, false, '#ffea00'));
    } else {
      // Phase 2: Rapid 5-way spiral barrage
      for (let i = -2; i <= 2; i++) {
        lasers.push(new Laser(this.x + i * 20, this.y + 50, i * 110, 440, false, '#ff0077'));
      }
    }
    return lasers;
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.shadowColor = this.phase === 1 ? '#ff0055' : '#ff00ff';
    ctx.shadowBlur = 25;

    // Outer Fortress Wings
    ctx.fillStyle = '#10051a';
    ctx.strokeStyle = this.phase === 1 ? '#ff0055' : '#ff00ff';
    ctx.lineWidth = 3;

    ctx.beginPath();
    ctx.moveTo(0, 60);
    ctx.lineTo(60, 20);
    ctx.lineTo(85, -30);
    ctx.lineTo(40, -60);
    ctx.lineTo(-40, -60);
    ctx.lineTo(-85, -30);
    ctx.lineTo(-60, 20);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Glowing Core Reactor
    const coreGrad = ctx.createRadialGradient(0, 0, 5, 0, 0, 28);
    coreGrad.addColorStop(0, '#ffffff');
    coreGrad.addColorStop(0.5, this.phase === 1 ? '#ff0055' : '#ff00ff');
    coreGrad.addColorStop(1, 'transparent');

    ctx.fillStyle = coreGrad;
    ctx.beginPath();
    ctx.arc(0, 0, 28, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

// PowerUp Item
class PowerUp {
  constructor(x, y, type = null) {
    this.x = x;
    this.y = y;
    this.radius = 14;
    this.speed = 110;
    this.active = true;

    const types = ['HEALTH', 'SHIELD', 'WEAPON', 'BOMB', 'SCORE'];
    this.type = type || types[Math.floor(Math.random() * types.length)];
  }

  update(dt) {
    this.y += this.speed * dt;
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);

    let color = '#00ff66';
    let label = '+';

    if (this.type === 'SHIELD') { color = '#00f0ff'; label = 'S'; }
    if (this.type === 'WEAPON') { color = '#ffb700'; label = 'W'; }
    if (this.type === 'BOMB') { color = '#ff0055'; label = 'B'; }
    if (this.type === 'SCORE') { color = '#9d00ff'; label = '2X'; }

    ctx.shadowColor = color;
    ctx.shadowBlur = 15;

    // Glowing Orb
    ctx.fillStyle = 'rgba(5, 10, 25, 0.9)';
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Icon Label
    ctx.fillStyle = color;
    ctx.font = '700 11px Orbitron';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, 0, 1);

    ctx.restore();
  }
}
