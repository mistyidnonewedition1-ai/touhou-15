// ═══════════════════════════════════════════════
//  patterns.js — Bibliothèque de patterns danmaku
// ═══════════════════════════════════════════════
//
//  Chaque fonction reçoit (eBullets, x, y, opts)
//  et pousse des balles dans le tableau eBullets.
//  opts peut contenir : playerX, playerY, angle, etc.

const Patterns = (() => {

  // ── helpers ──────────────────────────────────

  function mkBullet(x, y, vx, vy, opts = {}) {
    return {
      x, y, vx, vy,
      r:      opts.r      ?? 5,
      color:  opts.color  ?? '#ffaa33',
      glow:   opts.glow   ?? '#ff8800',
      active: true,
    };
  }

  function aimAt(ex, ey, px, py, speed) {
    const dx = px - ex, dy = py - ey;
    const d  = Math.sqrt(dx * dx + dy * dy) || 1;
    return { vx: dx / d * speed, vy: dy / d * speed };
  }

  // ── patterns ─────────────────────────────────

  // Cercle uniforme
  function circle(eb, x, y, { count = 12, speed = 2.5, r = 5, color = '#ffaa33', glow = '#ff8800', offset = 0 } = {}) {
    for (let i = 0; i < count; i++) {
      const a = (Math.PI * 2 / count) * i + offset;
      eb.push(mkBullet(x, y, Math.cos(a) * speed, Math.sin(a) * speed, { r, color, glow }));
    }
  }

  // Cercle qui tourne (appelé chaque frame, tire 1 balle)
  function spiral(eb, x, y, { speed = 2.5, r = 4, color = '#ff44aa', glow = '#ff0088', angle = 0, arms = 1, armOffset = 0 } = {}) {
    for (let a = 0; a < arms; a++) {
      const theta = angle + (Math.PI * 2 / arms) * a + armOffset;
      eb.push(mkBullet(x, y, Math.cos(theta) * speed, Math.sin(theta) * speed, { r, color, glow }));
    }
  }

  // Eventail dirigé vers le joueur
  function fan(eb, x, y, { playerX = 200, playerY = 500, spread = 0.8, count = 7, speed = 3, r = 5, color = '#ff5522', glow = '#ff3300' } = {}) {
    const { vx: bvx, vy: bvy } = aimAt(x, y, playerX, playerY, 1);
    const baseAngle = Math.atan2(bvy, bvx);
    for (let i = 0; i < count; i++) {
      const a = baseAngle - spread / 2 + (count > 1 ? (spread / (count - 1)) * i : 0);
      eb.push(mkBullet(x, y, Math.cos(a) * speed, Math.sin(a) * speed, { r, color, glow }));
    }
  }

  // Vague sinusoïdale (modifie vx en vol → appelé avant push)
  function wave(eb, x, y, { playerX = 200, playerY = 500, speed = 2.8, r = 4, color = '#44aaff', glow = '#0088ff', count = 5, spread = 0.6 } = {}) {
    const { vx: bvx, vy: bvy } = aimAt(x, y, playerX, playerY, 1);
    const baseAngle = Math.atan2(bvy, bvx);
    for (let i = 0; i < count; i++) {
      const a = baseAngle - spread / 2 + (count > 1 ? (spread / (count - 1)) * i : 0);
      const b = mkBullet(x, y, Math.cos(a) * speed, Math.sin(a) * speed, { r, color, glow });
      b.wave = true;
      b.wavePhase = i * 0.5;
      b.waveAmp = 0.8;
      b.waveFreq = 0.08;
      b.age = 0;
      eb.push(b);
    }
  }

  // Anneau avec trou
  function ring(eb, x, y, { count = 16, speed = 2, r = 5, color = '#aa44ff', glow = '#8800ff', gap = 3, offset = 0 } = {}) {
    for (let i = 0; i < count; i++) {
      if (i >= Math.floor(count / 2) - gap && i <= Math.floor(count / 2) + gap) continue; // trou
      const a = (Math.PI * 2 / count) * i + offset;
      eb.push(mkBullet(x, y, Math.cos(a) * speed, Math.sin(a) * speed, { r, color, glow }));
    }
  }

  // Tir droit vers le bas (boss phase 1)
  function burst(eb, x, y, { speed = 3.5, count = 5, spread = 0.3, color = '#ffdd00', glow = '#ffaa00', r = 5 } = {}) {
    for (let i = 0; i < count; i++) {
      const a = Math.PI / 2 + (Math.random() - 0.5) * spread;
      eb.push(mkBullet(x, y, Math.cos(a) * speed, Math.sin(a) * speed, { r, color, glow }));
    }
  }

  // Laser simulé (ligne dense de balles)
  function laser(eb, x, y, { playerX = 200, playerY = 500, r = 3, color = '#ffffff', glow = '#aaffff', count = 20, speed = 6 } = {}) {
    const { vx: bvx, vy: bvy } = aimAt(x, y, playerX, playerY, speed);
    for (let i = 0; i < count; i++) {
      const b = mkBullet(x + bvx * i * 0.7, y + bvy * i * 0.7, bvx, bvy, { r, color, glow });
      b.laser = true;
      eb.push(b);
    }
  }

  // Doubles spirales entrelacées
  function dualSpiral(eb, x, y, { speed = 2.5, r = 4, angle = 0 } = {}) {
    spiral(eb, x, y, { speed, r, color: '#ff44aa', glow: '#ff0088', angle, arms: 2 });
    spiral(eb, x, y, { speed: speed * 0.8, r: r * 0.7, color: '#44aaff', glow: '#0066ff', angle: angle + 0.3, arms: 3 });
  }

  // ── update des balles avec effets spéciaux ──

  function updateBullets(eb, W, H) {
    for (let i = eb.length - 1; i >= 0; i--) {
      const b = eb[i];
      if (!b.active) { eb.splice(i, 1); continue; }

      if (b.wave) {
        b.age = (b.age || 0) + 1;
        const perp = { x: -b.vy / (Math.sqrt(b.vx * b.vx + b.vy * b.vy) || 1),
                       y:  b.vx / (Math.sqrt(b.vx * b.vx + b.vy * b.vy) || 1) };
        b.x += b.vx + perp.x * Math.sin(b.age * b.waveFreq + b.wavePhase) * b.waveAmp;
        b.y += b.vy + perp.y * Math.sin(b.age * b.waveFreq + b.wavePhase) * b.waveAmp;
      } else {
        b.x += b.vx;
        b.y += b.vy;
      }

      if (b.x < -40 || b.x > W + 40 || b.y < -40 || b.y > H + 40) {
        eb.splice(i, 1);
      }
    }
  }

  function drawBullets(ctx, eb) {
    for (const b of eb) {
      ctx.save();
      ctx.shadowBlur = 12;
      ctx.shadowColor = b.glow;

      // Core
      ctx.fillStyle = b.color;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fill();

      // Inner highlight
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.beginPath();
      ctx.arc(b.x - b.r * 0.3, b.y - b.r * 0.3, b.r * 0.35, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }

  return { circle, spiral, dualSpiral, fan, wave, ring, burst, laser, updateBullets, drawBullets };
})();