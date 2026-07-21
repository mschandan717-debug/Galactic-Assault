/**
 * Main Game Engine for Galactic Assault
 */
class Game {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');

    this.starfield = new Starfield(this.canvas);
    this.particleEngine = new ParticleEngine();

    this.state = 'MENU'; // 'MENU', 'PLAYING', 'PAUSED', 'GAMEOVER'
    this.lastTime = 0;

    this.score = 0;
    this.highScore = parseInt(localStorage.getItem('galactic_assault_highscore')) || 0;
    this.wave = 1;
    this.waveState = 'ACTIVE'; // 'ACTIVE', 'CLEAR', 'BOSS'
    this.enemiesToSpawn = 0;
    this.spawnTimer = 0;
    this.waveTimer = 0;

    this.comboCount = 0;
    this.comboTimer = 0;
    this.comboMultiplier = 1;

    this.screenShakeTime = 0;
    this.screenShakeIntensity = 0;

    this.keys = {};
    this.mousePos = { x: null, y: null };
    this.isMouseDown = false;

    this.player = null;
    this.enemies = [];
    this.boss = null;
    this.playerLasers = [];
    this.enemyLasers = [];
    this.powerUps = [];

    this.initUI();
    this.initEvents();
    this.resizeCanvas();
  }

  initUI() {
    document.getElementById('high-score-val').innerText = this.highScore.toLocaleString();
    this.updateHUD();
  }

  initEvents() {
    window.addEventListener('resize', () => this.resizeCanvas());

    window.addEventListener('keydown', (e) => {
      // Prevent spacebar/arrows from triggering default button click or page scrolling
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(e.code)) {
        e.preventDefault();
      }

      this.keys[e.code] = true;

      // Enable Web Audio API on first user key press
      audio.init();

      if (e.code === 'KeyP' || e.code === 'Escape') {
        this.togglePause();
      }

      if (e.code === 'KeyB' && this.state === 'PLAYING') {
        this.useBomb();
      }
    });

    window.addEventListener('keyup', (e) => {
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(e.code)) {
        e.preventDefault();
      }
      this.keys[e.code] = false;
    });

    // Mouse Movement & Firing Listeners
    window.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.mousePos.x = e.clientX - rect.left;
      this.mousePos.y = e.clientY - rect.top;
    });

    window.addEventListener('mousedown', (e) => {
      if (e.button === 0) { // Left click
        this.isMouseDown = true;
        audio.init();
      }
    });

    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) {
        this.isMouseDown = false;
      }
    });

    window.addEventListener('mouseleave', () => {
      this.isMouseDown = false;
      this.mousePos.x = null;
      this.mousePos.y = null;
    });

    // Touch controls fallback for mobile / tablet tap to play
    window.addEventListener('touchstart', () => audio.init(), { once: true });
  }

  resizeCanvas() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.canvas.width = w;
    this.canvas.height = h;
    this.starfield.resize(w, h);
  }

  startNewGame() {
    // Unfocus any active button element to prevent spacebar re-triggering button clicks
    if (document.activeElement && document.activeElement.blur) {
      document.activeElement.blur();
    }

    audio.init();
    audio.startBgm();

    this.score = 0; // Initialized strictly on new game/restart
    this.wave = 1;
    this.comboCount = 0;
    this.comboMultiplier = 1;

    this.player = new Player(this.canvas.width / 2, this.canvas.height - 120);
    this.enemies = [];
    this.boss = null;
    this.playerLasers = [];
    this.enemyLasers = [];
    this.powerUps = [];
    this.particleEngine.clear();

    this.startWave(1);
    this.setState('PLAYING');
  }

  startWave(waveNum) {
    this.wave = waveNum;
    this.waveState = 'ACTIVE';

    if (waveNum % 5 === 0) {
      // Boss Wave
      this.waveState = 'BOSS';
      this.boss = new Boss(this.canvas.width);
      this.enemiesToSpawn = 0;
      this.particleEngine.addFloatingText(`BOSS DREADNOUGHT APPROACHING!`, this.canvas.width / 2, this.canvas.height / 3, '#ff0055', 22);
      audio.playExplosion(true);
    } else {
      // Standard Wave Ramping
      this.enemiesToSpawn = 8 + waveNum * 4;
      this.spawnTimer = 0.5;
      this.particleEngine.addFloatingText(`WAVE ${waveNum}`, this.canvas.width / 2, this.canvas.height / 3, '#00f0ff', 24);
      this.starfield.setWarp(2.5);
      setTimeout(() => this.starfield.setWarp(1.0), 1200);
    }

    this.updateHUD();
  }

  setState(newState) {
    this.state = newState;
    
    document.getElementById('start-screen').classList.remove('active');
    document.getElementById('pause-screen').classList.remove('active');
    document.getElementById('game-over-screen').classList.remove('active');

    if (newState === 'MENU') {
      document.getElementById('start-screen').classList.add('active');
    } else if (newState === 'PAUSED') {
      document.getElementById('pause-screen').classList.add('active');
    } else if (newState === 'GAMEOVER') {
      document.getElementById('game-over-screen').classList.add('active');
      this.handleGameOver();
    }
  }

  togglePause() {
    if (this.state === 'PLAYING') {
      this.setState('PAUSED');
    } else if (this.state === 'PAUSED') {
      this.setState('PLAYING');
    }
  }

  useBomb() {
    if (!this.player || this.player.bombs <= 0 || this.player.isDead) return;

    this.player.bombs--;
    audio.playBomb();
    this.triggerScreenShake(0.8, 25);

    // Destroy all active enemy lasers
    this.enemyLasers = [];

    // Deal massive damage to all enemies on screen
    for (let enemy of this.enemies) {
      enemy.hp -= 300;
      this.particleEngine.createExplosion(enemy.x, enemy.y, '#ffea00', 30, 1.5);
      if (enemy.hp <= 0) {
        enemy.active = false;
        this.addScore(enemy.scoreValue, enemy.x, enemy.y);
      }
    }

    // Damage boss if active
    if (this.boss) {
      this.boss.hp -= 250;
      this.particleEngine.createExplosion(this.boss.x, this.boss.y, '#ffea00', 40, 2.0);
    }

    this.updateHUD();
  }

  triggerScreenShake(duration = 0.3, intensity = 12) {
    this.screenShakeTime = duration;
    this.screenShakeIntensity = intensity;
  }

  addScore(amount, x, y) {
    this.comboCount++;
    this.comboTimer = 2.5;
    this.comboMultiplier = 1 + Math.floor(this.comboCount / 5) * 0.5;

    const gained = Math.floor(amount * this.comboMultiplier);
    this.score += gained;

    if (x && y) {
      this.particleEngine.addFloatingText(`+${gained}`, x, y, '#ffea00', 14);
    }

    if (this.score > this.highScore) {
      this.highScore = this.score;
      localStorage.setItem('galactic_assault_highscore', this.highScore);
    }

    this.updateHUD();
  }

  updateHUD() {
    if (this.player) {
      const healthPct = Math.max(0, (this.player.health / this.player.maxHealth) * 100);
      const shieldPct = Math.max(0, (this.player.shield / this.player.maxShield) * 100);

      document.getElementById('health-bar-fill').style.width = `${healthPct}%`;
      document.getElementById('shield-bar-fill').style.width = `${shieldPct}%`;
      document.getElementById('bomb-count').innerText = this.player.bombs;
      document.getElementById('weapon-lvl-text').innerText = `LVL ${this.player.weaponLevel}`;
    }

    document.getElementById('score-val').innerText = this.score.toLocaleString();
    document.getElementById('high-score-val').innerText = this.highScore.toLocaleString();
    document.getElementById('wave-num').innerText = this.wave;

    const comboEl = document.getElementById('combo-display');
    if (this.comboCount >= 3) {
      comboEl.classList.add('active');
      document.getElementById('combo-count').innerText = `${this.comboMultiplier.toFixed(1)}x COMBO!`;
    } else {
      comboEl.classList.remove('active');
    }

    // Boss Health Bar HUD update
    const bossHud = document.getElementById('boss-hud-bar');
    const bossFill = document.getElementById('boss-bar-fill');
    if (this.boss && this.boss.active) {
      bossHud.style.display = 'block';
      const bossHpPct = Math.max(0, (this.boss.hp / this.boss.maxHp) * 100);
      bossFill.style.width = `${bossHpPct}%`;
    } else {
      bossHud.style.display = 'none';
    }
  }

  spawnEnemies(dt) {
    if (this.waveState !== 'ACTIVE' || this.enemiesToSpawn <= 0) return;

    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this.spawnTimer = Math.max(0.4, 1.5 - this.wave * 0.1);

      const spawnX = Math.random() * (this.canvas.width - 120) + 60;

      // Enemy type spawning distribution:
      // Wave 1: Fighter (50%), Scout (50%)
      // Wave 2+: Fighter (40%), Kamikaze (35%), Scout (25%)
      // Wave 3+: Fighter (35%), Battleship (20%), Kamikaze (25%), Scout (20%)
      const rand = Math.random();
      let type = 'fighter';

      if (this.wave === 1) {
        type = rand < 0.5 ? 'fighter' : 'scout';
      } else if (this.wave === 2) {
        if (rand < 0.45) type = 'fighter';
        else if (rand < 0.8) type = 'kamikaze';
        else type = 'scout';
      } else {
        if (rand < 0.35) type = 'fighter';
        else if (rand < 0.60) type = 'kamikaze';
        else if (rand < 0.85) type = 'battleship';
        else type = 'scout';
      }

      this.enemies.push(new Enemy(spawnX, -30, type));
      this.enemiesToSpawn--;
    }
  }

  checkCollisions() {
    if (!this.player || this.player.isDead) return;

    // 1. Player Lasers vs Enemies
    for (let laser of this.playerLasers) {
      if (!laser.active) continue;

      for (let enemy of this.enemies) {
        if (!enemy.active) continue;
        const dist = Math.hypot(laser.x - enemy.x, laser.y - enemy.y);
        if (dist < laser.radius + enemy.radius) {
          laser.active = false;
          enemy.hp -= 35;
          this.particleEngine.createLaserSparks(laser.x, laser.y, laser.color);
          audio.playHit();

          if (enemy.hp <= 0) {
            enemy.active = false;
            audio.playExplosion();
            this.particleEngine.createExplosion(enemy.x, enemy.y, enemy.color, 20);
            this.addScore(enemy.scoreValue, enemy.x, enemy.y);

            // Chance to drop powerup
            if (Math.random() < 0.25) {
              this.powerUps.push(new PowerUp(enemy.x, enemy.y));
            }
          }
          break;
        }
      }

      // Player Lasers vs Boss
      if (this.boss && this.boss.active && laser.active) {
        const dist = Math.hypot(laser.x - this.boss.x, laser.y - this.boss.y);
        if (dist < laser.radius + this.boss.radius) {
          laser.active = false;
          this.boss.hp -= 30;
          this.particleEngine.createLaserSparks(laser.x, laser.y, '#ffea00');
          audio.playHit();

          if (this.boss.hp <= 0) {
            this.boss.active = false;
            audio.playExplosion(true);
            this.triggerScreenShake(1.2, 30);
            this.particleEngine.createExplosion(this.boss.x, this.boss.y, '#ff0055', 80, 2.5);
            this.addScore(this.boss.scoreValue, this.boss.x, this.boss.y);
            this.powerUps.push(new PowerUp(this.boss.x, this.boss.y, 'WEAPON'));
            this.powerUps.push(new PowerUp(this.boss.x + 30, this.boss.y, 'HEALTH'));
          }
        }
      }
    }

    // 2. Enemy Lasers vs Player
    for (let laser of this.enemyLasers) {
      if (!laser.active) continue;
      const dist = Math.hypot(laser.x - this.player.x, laser.y - this.player.y);
      if (dist < laser.radius + this.player.radius) {
        laser.active = false;
        if (this.player.takeDamage(20)) {
          audio.playShieldHit();
          this.triggerScreenShake(0.3, 10);
          this.particleEngine.createLaserSparks(this.player.x, this.player.y, '#ff0055');
          this.comboCount = 0; // Reset combo on damage
          this.updateHUD();
        }
      }
    }

    // 3. Enemies Colliding directly with Player
    for (let enemy of this.enemies) {
      if (!enemy.active) continue;
      const dist = Math.hypot(enemy.x - this.player.x, enemy.y - this.player.y);
      if (dist < enemy.radius + this.player.radius) {
        enemy.active = false;
        this.particleEngine.createExplosion(enemy.x, enemy.y, enemy.color, 25);
        if (this.player.takeDamage(35)) {
          audio.playExplosion();
          this.triggerScreenShake(0.4, 15);
          this.comboCount = 0;
          this.updateHUD();
        }
      }
    }

    // 4. Player vs PowerUps
    for (let pu of this.powerUps) {
      if (!pu.active) continue;
      const dist = Math.hypot(pu.x - this.player.x, pu.y - this.player.y);
      if (dist < pu.radius + this.player.radius) {
        pu.active = false;
        audio.playPowerup();

        if (pu.type === 'HEALTH') {
          this.player.health = Math.min(this.player.maxHealth, this.player.health + 35);
          this.particleEngine.addFloatingText('HEALTH +35', this.player.x, this.player.y, '#00ff66', 15);
        } else if (pu.type === 'SHIELD') {
          this.player.activateShield(8.0);
          this.particleEngine.addFloatingText('SHIELD OVERCHARGE!', this.player.x, this.player.y, '#00f0ff', 15);
        } else if (pu.type === 'WEAPON') {
          this.player.weaponLevel = Math.min(4, this.player.weaponLevel + 1);
          this.particleEngine.addFloatingText(`WEAPON UPGRADED!`, this.player.x, this.player.y, '#ffb700', 16);
        } else if (pu.type === 'BOMB') {
          this.player.bombs++;
          this.particleEngine.addFloatingText('+1 EMP BOMB', this.player.x, this.player.y, '#ff0055', 15);
        } else if (pu.type === 'SCORE') {
          this.addScore(500, this.player.x, this.player.y);
        }

        this.updateHUD();
      }
    }
  }

  update(dt) {
    // Starfield & Particle animation always run
    this.starfield.update(dt);
    this.particleEngine.update(dt);

    if (this.state !== 'PLAYING') return;

    // Screen Shake decay
    if (this.screenShakeTime > 0) {
      this.screenShakeTime -= dt;
    }

    // Combo Timer Decay
    if (this.comboCount > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) {
        this.comboCount = 0;
        this.updateHUD();
      }
    }

    // Update Player
    if (this.player) {
      this.player.update(dt, this.keys, this.mousePos, this.canvas, this.particleEngine);

      // Shooting Input (Spacebar or Left Mouse Button)
      if ((this.keys['Space'] || this.isMouseDown) && this.player.canShoot()) {
        const newLasers = this.player.shoot();
        this.playerLasers.push(...newLasers);
        audio.playLaser();
      }

      if (this.player.isDead) {
        audio.playExplosion(true);
        this.particleEngine.createExplosion(this.player.x, this.player.y, '#00f0ff', 60, 2.0);
        this.setState('GAMEOVER');
      }
    }

    // Spawn Waves
    this.spawnEnemies(dt);

    // Update Player Lasers
    for (let i = this.playerLasers.length - 1; i >= 0; i--) {
      const l = this.playerLasers[i];
      l.update(dt);
      if (l.y < -30 || l.x < -30 || l.x > this.canvas.width + 30 || !l.active) {
        this.playerLasers.splice(i, 1);
      }
    }

    // Update Enemies & Shoot
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      enemy.update(dt, this.player);

      if (enemy.canShoot()) {
        const eLasers = enemy.shoot();
        this.enemyLasers.push(...eLasers);
        audio.playEnemyLaser();
      }

      if (enemy.y > this.canvas.height + 40 || !enemy.active) {
        this.enemies.splice(i, 1);
      }
    }

    // Update Boss
    if (this.boss) {
      this.boss.update(dt, this.player);
      if (this.boss.canShoot()) {
        const bLasers = this.boss.shoot();
        this.enemyLasers.push(...bLasers);
        audio.playEnemyLaser();
      }
      if (!this.boss.active) {
        this.boss = null;
      }
    }

    // Update Enemy Lasers
    for (let i = this.enemyLasers.length - 1; i >= 0; i--) {
      const el = this.enemyLasers[i];
      el.update(dt);
      if (el.y > this.canvas.height + 30 || el.y < -30 || !el.active) {
        this.enemyLasers.splice(i, 1);
      }
    }

    // Update Powerups
    for (let i = this.powerUps.length - 1; i >= 0; i--) {
      const pu = this.powerUps[i];
      pu.update(dt);
      if (pu.y > this.canvas.height + 30 || !pu.active) {
        this.powerUps.splice(i, 1);
      }
    }

    // Collisions
    this.checkCollisions();

    // Check Wave Completion
    if (this.waveState === 'ACTIVE' && this.enemiesToSpawn <= 0 && this.enemies.length === 0) {
      this.startWave(this.wave + 1);
    } else if (this.waveState === 'BOSS' && !this.boss && this.enemies.length === 0) {
      this.startWave(this.wave + 1);
    }
  }

  draw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Apply Screen Shake transform if active
    this.ctx.save();
    if (this.screenShakeTime > 0) {
      const offsetX = (Math.random() - 0.5) * this.screenShakeIntensity;
      const offsetY = (Math.random() - 0.5) * this.screenShakeIntensity;
      this.ctx.translate(offsetX, offsetY);
    }

    // Render Starfield Background
    this.starfield.draw();

    // Render Game Entities
    for (let pu of this.powerUps) pu.draw(this.ctx);
    for (let l of this.playerLasers) l.draw(this.ctx);
    for (let el of this.enemyLasers) el.draw(this.ctx);
    for (let enemy of this.enemies) enemy.draw(this.ctx);
    if (this.boss) this.boss.draw(this.ctx);
    if (this.player) this.player.draw(this.ctx);

    // Render Particle Effects
    this.particleEngine.draw(this.ctx);

    this.ctx.restore();
  }

  handleGameOver() {
    audio.stopBgm();
    document.getElementById('final-score-val').innerText = this.score.toLocaleString();
    document.getElementById('final-wave-val').innerText = this.wave;

    const newHighEl = document.getElementById('new-high-score-tag');
    if (this.score >= this.highScore && this.score > 0) {
      newHighEl.style.display = 'block';
    } else {
      newHighEl.style.display = 'none';
    }
  }

  run(time = 0) {
    const dt = Math.min(0.1, (time - this.lastTime) / 1000);
    this.lastTime = time;

    this.update(dt);
    this.draw();

    requestAnimationFrame((t) => this.run(t));
  }
}

// Global Launch Handler
window.addEventListener('DOMContentLoaded', () => {
  const game = new Game();
  game.run();

  // Attach DOM Button Listeners
  document.getElementById('btn-start').addEventListener('click', (e) => {
    e.target.blur();
    game.startNewGame();
  });
  document.getElementById('btn-restart').addEventListener('click', (e) => {
    e.target.blur();
    game.startNewGame();
  });
  document.getElementById('btn-resume').addEventListener('click', (e) => {
    e.target.blur();
    game.togglePause();
  });

  document.getElementById('audio-toggle').addEventListener('click', (e) => {
    e.target.blur();
    const active = audio.toggleSound();
    document.getElementById('audio-status').innerText = active ? 'ON' : 'MUTED';
  });
});
