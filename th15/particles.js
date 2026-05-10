// ═══════════════════════════════════════════════
//  particles.js — Système de particules
// ═══════════════════════════════════════════════

const ParticleSystem = (() => {
  const pool = [];

  function spawn(opts) {
    pool.push({
      x:      opts.x,
      y:      opts.y,
      vx:     opts.vx     ?? (Math.random() - 0.5) * 4,
      vy:     opts.vy     ?? (Math.random() - 0.5) * 4,
      life:   opts.life   ?? 40,
      maxLife:opts.life   ?? 40,
      r:      opts.r      ?? 3,
      color:  opts.color  ?? '#ffffff',
      type:   opts.type   ?? 'circle',   // 'circle' | 'spark' | 'ring'
      gravity:opts.gravity?? 0,
      drag:   opts.drag   ?? 0.96,
    });
  }

  // Explosion générale
  function explosion(x, y, color = '#ff8844', count = 18, r = 3) {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 / count) * i + Math.random() * 0.3;
      const speed = 1.5 + Math.random() * 3;
      spawn({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        r: r * (0.5 + Math.random() * 0.8),
        color,
        life: 30 + Math.random() * 30,
        type: 'circle',
        drag: 0.93,
      });
    }
    // Anneau flash
    spawn({ x, y, r: 1, color, life: 12, type: 'ring', vx: 0, vy: 0 });
  }

  // Mort du joueur — grand éclair bleu
  function playerDeath(x, y) {
    for (let i = 0; i < 60; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 6;
      spawn({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        r: 2 + Math.random() * 3,
        color: i % 3 === 0 ? '#ffffff' : (i % 3 === 1 ? '#88ddff' : '#4499ff'),
        life: 40 + Math.random() * 40,
        type: i < 20 ? 'spark' : 'circle',
        drag: 0.94,
      });
    }
    spawn({ x, y, r: 1, color: '#ffffff', life: 20, type: 'ring', vx: 0, vy: 0 });
    spawn({ x, y, r: 1, color: '#88ddff', life: 30, type: 'ring', vx: 0, vy: 0 });
  }

  // Bombe — onde de choc
  function bombEffect(x, y) {
    for (let i = 0; i < 80; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 8;
      spawn({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        r: 1 + Math.random() * 4,
        color: ['#ffffff', '#aaffff', '#44ffff', '#ff44ff', '#ffaaff'][Math.floor(Math.random() * 5)],
        life: 50 + Math.random() * 50,
        type: 'circle',
        drag: 0.92,
      });
    }
    for (let i = 0; i < 5; i++) {
      spawn({ x, y, r: 1, color: '#ffffff', life: 8 + i * 5, type: 'ring', vx: 0, vy: 0 });
    }
  }

  // Graze — étincelles légères
  function graze(x, y) {
    for (let i = 0; i < 4; i++) {
      spawn({
        x: x + (Math.random() - 0.5) * 10,
        y: y + (Math.random() - 0.5) * 10,
        vx: (Math.random() - 0.5) * 3,
        vy: -Math.random() * 2,
        r: 1 + Math.random(),
        color: '#ffdd44',
        life: 15 + Math.random() * 10,
        type: 'spark',
        drag: 0.9,
        gravity: 0.05,
      });
    }
  }

  // Mort d'un ennemi basique
  function enemyDeath(x, y) {
    explosion(x, y, '#ff5533', 14, 2.5);
    for (let i = 0; i < 6; i++) {
      spawn({
        x, y,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2,
        r: 1,
        color: '#ffaa66',
        life: 50 + Math.random() * 30,
        type: 'spark',
        drag: 0.98,
        gravity: 0.02,
      });
    }
  }

  // Phase transition boss
  function bossPhaseTransition(x, y) {
    for (let i = 0; i < 100; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 9;
      const colors = ['#ff44ff', '#ff88ff', '#ffaaff', '#ffffff', '#ffdd44'];
      spawn({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        r: 2 + Math.random() * 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        life: 60 + Math.random() * 60,
        type: 'circle',
        drag: 0.91,
      });
    }
    for (let i = 0; i < 8; i++) {
      spawn({ x, y, r: 1, color: '#ff44ff', life: 6 + i * 8, type: 'ring', vx: 0, vy: 0 });
    }
  }

  function update(ctx, W, H) {
    for (let i = pool.length - 1; i >= 0; i--) {
      const p = pool[i];
      p.life--;
      if (p.life <= 0) { pool.splice(i, 1); continue; }

      p.vx *= p.drag;
      p.vy *= p.drag;
      p.vy += p.gravity;
      p.x  += p.vx;
      p.y  += p.vy;

      const t = p.life / p.maxLife; // 1→0
      const alpha = t < 0.3 ? t / 0.3 : 1;

      ctx.save();
      ctx.globalAlpha = alpha;

      if (p.type === 'ring') {
        const progress = 1 - t;
        const ringR = p.r + progress * 40;
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 2 * t;
        ctx.beginPath();
        ctx.arc(p.x, p.y, ringR, 0, Math.PI * 2);
        ctx.stroke();

      } else if (p.type === 'spark') {
        const len = (p.vx * p.vx + p.vy * p.vy) * 1.5 + 3;
        ctx.strokeStyle = p.color;
        ctx.lineWidth = p.r;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - p.vx * len * 0.5, p.y - p.vy * len * 0.5);
        ctx.stroke();

      } else {
        ctx.shadowBlur = 8;
        ctx.shadowColor = p.color;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * t, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
  }

  function clear() { pool.length = 0; }

  return { spawn, explosion, playerDeath, enemyDeath, bombEffect, graze, bossPhaseTransition, update, clear };
})();

// Régénération de vie — éclat vert/doré
ParticleSystem.lifeRestore = function(x, y) {
  for (let i = 0; i < 50; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 1 + Math.random() * 5;
    this.spawn({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      r: 2 + Math.random() * 3,
      color: i % 2 === 0 ? '#88ff88' : '#ffff44',
      life: 50 + Math.random() * 40,
      type: i < 20 ? 'spark' : 'circle',
      drag: 0.93,
    });
  }
  this.spawn({ x, y, r: 1, color: '#88ff88', life: 18, type: 'ring', vx: 0, vy: 0 });
  this.spawn({ x, y, r: 1, color: '#ffffff', life: 28, type: 'ring', vx: 0, vy: 0 });
};

// Surcharge enemyDeath pour accepter une couleur perso
const _origEnemyDeath = ParticleSystem.enemyDeath.bind(ParticleSystem);
ParticleSystem.enemyDeath = function(x, y, color, count) {
  if (color || count) {
    const c = color || '#ff5533';
    const n = count || 14;
    for (let i = 0; i < n; i++) {
      const angle = (Math.PI * 2 / n) * i + Math.random() * 0.3;
      const speed = 1.5 + Math.random() * 3;
      this.spawn({ x, y, vx: Math.cos(angle)*speed, vy: Math.sin(angle)*speed, r: 2.5*(0.5+Math.random()*0.8), color: c, life: 30+Math.random()*30, type: 'circle', drag: 0.93 });
    }
    this.spawn({ x, y, r: 1, color: c, life: 12, type: 'ring', vx: 0, vy: 0 });
  } else {
    _origEnemyDeath(x, y);
  }
};