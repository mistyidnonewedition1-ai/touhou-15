// ═══════════════════════════════════════════════
//  boss.js — Boss normal + Extra Boss
// ═══════════════════════════════════════════════

const Boss = (() => {

  const NORMAL_PHASES = [
    { name: '「紅の序章」', nameRom: 'Prélude Écarlate',      hp: 600,  color: '#ff4466', glowColor: '#ff0033', isSpellCard: false, pattern: 'phase1',     fireRate: 70 },
    { name: '「螺旋の夢」', nameRom: 'Rêve Spiral',            hp: 500,  color: '#ff44ff', glowColor: '#cc00ff', isSpellCard: true,  pattern: 'spellcard1', fireRate: 1  },
    { name: '「蒼天の怒り」',nameRom: 'Courroux du Ciel Azur', hp: 700,  color: '#4488ff', glowColor: '#0044ff', isSpellCard: false, pattern: 'phase2',     fireRate: 55 },
    { name: '「永遠と瞬間」',nameRom: 'Éternité et Instant',   hp: 800,  color: '#ffdd44', glowColor: '#ffaa00', isSpellCard: true,  pattern: 'spellcard2', fireRate: 1  },
    { name: '「最後の境界」',nameRom: 'Dernière Frontière',    hp: 500,  color: '#ffffff', glowColor: '#aaaaff', isSpellCard: true,  pattern: 'final',      fireRate: 1  },
  ];

  const EXTRA_PHASES = [
    { name: '「虚無の扉」',  nameRom: 'Portail du Néant',          hp: 900,  color: '#aa44ff', glowColor: '#7700cc', isSpellCard: false, pattern: 'extra1',     fireRate: 50 },
    { name: '「混沌の螺旋」',nameRom: 'Spirale du Chaos',           hp: 800,  color: '#ff00ff', glowColor: '#cc00aa', isSpellCard: true,  pattern: 'extraSC1',   fireRate: 1  },
    { name: '「無限の壁」',  nameRom: "Mur de l'Infini",           hp: 1000, color: '#00ffff', glowColor: '#0099cc', isSpellCard: false, pattern: 'extra2',     fireRate: 40 },
    { name: '「破滅の閃光」',nameRom: 'Éclair de Destruction',     hp: 900,  color: '#ffff00', glowColor: '#ffaa00', isSpellCard: true,  pattern: 'extraSC2',   fireRate: 1  },
    { name: '「神命・終焉」',nameRom: 'Décret Divin · Fin du Monde',hp:1100, color: '#ff4400', glowColor: '#ff0000', isSpellCard: true,  pattern: 'extraFinal', fireRate: 1  },
  ];

  let state = null;

  function spawn(W, isExtra = false) {
    const diff   = Difficulty.get();
    const src    = isExtra ? EXTRA_PHASES : NORMAL_PHASES;
    const phases = src.map(p => ({ ...p, hp: Math.round(p.hp * diff.bossHpMult), maxHp: Math.round(p.hp * diff.bossHpMult) }));
    state = {
      x: W / 2, y: 100, w: isExtra ? 56 : 48, h: isExtra ? 56 : 48,
      targetX: W / 2, targetY: 100,
      moveTimer: 0, moveInterval: 120,
      phase: 0, phases, frameCounter: 0, spiralAngle: 0,
      alive: true, W, auraAngle: 0, shieldPulse: 0, isExtra, hitFlash: 0,
    };
    return state;
  }

  function currentPhase() { return state ? state.phases[state.phase] : null; }
  function isDead()       { return !state || !state.alive; }
  function isActive()     { return !!state && state.alive; }

  function updateMovement() {
    const ph = currentPhase();
    state.moveTimer++;
    const interval = ph.isSpellCard ? state.moveInterval * 0.6 : state.moveInterval;
    if (state.moveTimer >= interval) {
      state.targetX    = 50 + Math.random() * (state.W - 100);
      state.targetY    = 55 + Math.random() * (state.isExtra ? 150 : 120);
      state.moveTimer  = 0;
      state.moveInterval = (ph.isSpellCard ? 70 : 100) + Math.random() * 60;
    }
    const spd = (ph.isSpellCard ? 2.8 : 1.8) * (state.isExtra ? 1.3 : 1);
    state.x += (state.targetX - state.x) * 0.03 * spd;
    state.y += (state.targetY - state.y) * 0.03 * spd;
    state.auraAngle  += state.isExtra ? 0.035 : 0.02;
    state.shieldPulse += 0.05;
    if (state.hitFlash > 0) state.hitFlash--;
  }

  function fire(eb, playerX, playerY) {
    if (!state || !state.alive) return;
    const ph   = currentPhase();
    const diff = Difficulty.get();
    state.frameCounter++;
    const fc   = state.frameCounter;
    const bx   = state.x, by = state.y;
    const opts = { playerX, playerY };

    const spd  = (s) => s * diff.bulletSpeed;
    const cnt  = (n) => Difficulty.scaledBulletCount(n);
    const rate = (r) => Math.max(1, Math.round(r * diff.enemyFireRate));

    switch (ph.pattern) {
      case 'phase1':
        if (fc % rate(ph.fireRate) === 0) {
          Patterns.fan(eb, bx, by, { ...opts, count: cnt(7), speed: spd(2.5), spread: 0.9 });
        }
        if (fc % rate(ph.fireRate * 2) === 0) {
          Patterns.circle(eb, bx, by, { count: cnt(8), speed: spd(1.8), color: '#ff6644', glow: '#ff3300', r: 5 });
        }
        break;

      case 'spellcard1':
        state.spiralAngle += 0.07;
        if (fc % Math.max(1, Math.round(3 / diff.bulletCount)) === 0)
          Patterns.dualSpiral(eb, bx, by, { speed: spd(2.8), r: 4.5, angle: state.spiralAngle });
        if (fc % 90 === 0)
          Patterns.circle(eb, bx, by, { count: cnt(24), speed: spd(2.2), color: '#ff44ff', glow: '#cc00ff', r: 4 });
        break;

      case 'phase2':
        if (fc % rate(ph.fireRate) === 0) {
          Patterns.wave(eb, bx, by, { ...opts, count: cnt(7), speed: spd(3), color: '#44aaff', glow: '#0066ff' });
          Patterns.fan(eb, bx, by, { ...opts, count: cnt(5), speed: spd(2), spread: 1.2, color: '#66ccff', glow: '#0099ff' });
        }
        if (fc % rate(ph.fireRate + 20) === 0) {
          Patterns.ring(eb, bx, by, { count: cnt(18), speed: spd(2.2), gap: 2, offset: state.spiralAngle, color: '#aaddff', glow: '#4499ff' });
          state.spiralAngle += 0.4;
        }
        break;

      case 'spellcard2':
        state.spiralAngle += 0.1;
        if (fc % Math.max(1, Math.round(4 / diff.bulletCount)) === 0)
          Patterns.spiral(eb, bx, by, { speed: spd(3), r: 4, color: '#ffdd44', glow: '#ffaa00', angle: state.spiralAngle, arms: cnt(4) });
        if (fc % 80 === 0)
          Patterns.laser(eb, bx, by, { ...opts, color: '#ffffff', glow: '#ffffaa', r: 4 });
        if (fc % 120 === 0)
          for (let k = 0; k < 3; k++)
            setTimeout(() => { if (state && state.alive) Patterns.circle(eb, bx, by, { count: cnt(20), speed: spd(1.5 + k * 0.4), color: '#ffee66', glow: '#ffaa00', r: 4, offset: k * 0.3 }); }, k * 120);
        break;

      case 'final':
        state.spiralAngle += 0.05;
        if (fc % Math.max(1, Math.round(2 / diff.bulletCount)) === 0)
          Patterns.spiral(eb, bx, by, { speed: spd(2.5), r: 3.5, color: '#ffffff', glow: '#aaaaff', angle: state.spiralAngle, arms: cnt(5) });
        if (fc % 30 === 0) {
          Patterns.fan(eb, bx, by, { ...opts, count: cnt(9), speed: spd(3.5), spread: 0.7, color: '#ffaaff', glow: '#ff44ff', r: 4 });
          Patterns.fan(eb, bx, by, { ...opts, count: cnt(5), speed: spd(2.5), spread: 1.5, color: '#aaaaff', glow: '#8888ff', r: 3 });
        }
        if (fc % 80 === 0)
          Patterns.circle(eb, bx, by, { count: cnt(30), speed: spd(2), color: '#ffffaa', glow: '#ffdd00', r: 3.5 });
        break;

      case 'extra1':
        if (fc % rate(ph.fireRate) === 0) {
          Patterns.circle(eb, bx, by, { count: cnt(12), speed: spd(3.2), color: '#aa44ff', glow: '#7700cc', r: 5 });
          Patterns.fan(eb, bx, by, { ...opts, count: cnt(9), speed: spd(3.5), spread: 1.1, color: '#dd88ff', glow: '#aa00ff', r: 4 });
        }
        if (fc % rate(30) === 0) {
          Patterns.ring(eb, bx, by, { count: cnt(20), speed: spd(2.8), gap: 3, offset: state.spiralAngle, color: '#cc66ff', glow: '#9900ff' });
          state.spiralAngle += 0.25;
        }
        break;

      case 'extraSC1':
        state.spiralAngle += 0.12;
        if (fc % Math.max(1, Math.round(2 / diff.bulletCount)) === 0) {
          Patterns.spiral(eb, bx, by, { speed: spd(3.5), r: 4, color: '#ff00ff', glow: '#cc00aa', angle: state.spiralAngle, arms: cnt(6) });
          Patterns.spiral(eb, bx, by, { speed: spd(2.5), r: 3, color: '#ffffff', glow: '#ffaaff', angle: -state.spiralAngle * 0.8, arms: cnt(4) });
        }
        if (fc % 60 === 0)
          Patterns.circle(eb, bx, by, { count: cnt(36), speed: spd(2), color: '#ff44ff', glow: '#ff00ff', r: 4 });
        break;

      case 'extra2':
        if (fc % rate(ph.fireRate) === 0) {
          Patterns.wave(eb, bx, by, { ...opts, count: cnt(9), speed: spd(3.8), color: '#00ffff', glow: '#0099cc' });
          Patterns.circle(eb, bx, by, { count: cnt(10), speed: spd(3), color: '#44ddff', glow: '#0099ff', r: 5, offset: state.spiralAngle });
          state.spiralAngle += 0.3;
        }
        if (fc % rate(55) === 0)
          Patterns.laser(eb, bx, by, { ...opts, color: '#00ffff', glow: '#00aaff', r: 5, count: 25, speed: spd(7) });
        break;

      case 'extraSC2':
        state.spiralAngle += 0.08;
        if (fc % Math.max(1, Math.round(3 / diff.bulletCount)) === 0)
          Patterns.spiral(eb, bx, by, { speed: spd(4), r: 4.5, color: '#ffff00', glow: '#ffaa00', angle: state.spiralAngle, arms: cnt(8) });
        if (fc % 45 === 0)
          Patterns.fan(eb, bx, by, { ...opts, count: cnt(13), speed: spd(4.5), spread: 2.5, color: '#ffee44', glow: '#ffaa00', r: 4 });
        if (fc % 100 === 0)
          for (let k = 0; k < 4; k++)
            setTimeout(() => { if (state && state.alive) Patterns.circle(eb, bx, by, { count: cnt(24), speed: spd(2 + k * 0.5), color: '#ffff88', glow: '#ffdd00', r: 4, offset: k * 0.4 }); }, k * 100);
        break;

      case 'extraFinal':
        state.spiralAngle += 0.06;
        if (fc % Math.max(1, Math.round(1 / diff.bulletCount)) === 0)
          Patterns.spiral(eb, bx, by, { speed: spd(3.5), r: 4, color: '#ff4400', glow: '#ff0000', angle: state.spiralAngle, arms: cnt(8) });
        if (fc % 20 === 0)
          Patterns.fan(eb, bx, by, { ...opts, count: cnt(11), speed: spd(4.5), spread: 0.8, color: '#ff8844', glow: '#ff3300', r: 4 });
        if (fc % 50 === 0)
          Patterns.circle(eb, bx, by, { count: cnt(40), speed: spd(2.5), color: '#ffaaaa', glow: '#ff4400', r: 3.5 });
        if (fc % 80 === 0)
          Patterns.laser(eb, bx, by, { ...opts, color: '#ffffff', glow: '#ff8800', r: 5, count: 30, speed: spd(8) });
        break;
    }
  }

  function hit(damage, eb, onPhaseChange, onDeath) {
    if (!state || !state.alive) return;
    const ph = currentPhase();
    ph.hp -= damage;
    state.hitFlash = 8;
    if (ph.hp <= 0) {
      if (state.phase < state.phases.length - 1) {
        ParticleSystem.bossPhaseTransition(state.x, state.y);
        eb.length = 0;
        state.phase++;
        state.frameCounter = 0;
        state.spiralAngle  = 0;
        if (onPhaseChange) onPhaseChange(state.phase, currentPhase());
      } else {
        state.alive = false;
        ParticleSystem.bossPhaseTransition(state.x, state.y);
        eb.length = 0;
        if (onDeath) onDeath(state.isExtra);
      }
    }
  }

  function draw(ctx) {
    if (!state || !state.alive) return;
    const ph = currentPhase();
    const { x, y, w, auraAngle, shieldPulse, isExtra, hitFlash } = state;

    ctx.save();

    if (hitFlash > 0) {
      ctx.globalAlpha = (hitFlash / 8) * 0.5;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(x, y, w * 1.5, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    }

    // Aura
    const auraR = w * (isExtra ? 2.2 : 1.8) + Math.sin(shieldPulse) * 6;
    const grad = ctx.createRadialGradient(x, y, w * 0.4, x, y, auraR);
    grad.addColorStop(0, ph.glowColor + '55');
    grad.addColorStop(1, ph.glowColor + '00');
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(x, y, auraR, 0, Math.PI * 2); ctx.fill();

    // Orbites
    const orbCount = isExtra ? 6 : 4;
    for (let i = 0; i < orbCount; i++) {
      const a  = auraAngle + (Math.PI * 2 / orbCount) * i;
      const or = w * (isExtra ? 1.1 : 0.85);
      ctx.shadowBlur = 12; ctx.shadowColor = ph.color; ctx.fillStyle = ph.color;
      ctx.beginPath(); ctx.arc(x + Math.cos(a) * or, y + Math.sin(a) * or, isExtra ? 5 : 4, 0, Math.PI * 2); ctx.fill();
      if (isExtra) {
        const a2 = -auraAngle * 1.5 + (Math.PI * 2 / orbCount) * i;
        ctx.beginPath(); ctx.arc(x + Math.cos(a2) * or * 0.6, y + Math.sin(a2) * or * 0.6, 3, 0, Math.PI * 2); ctx.fill();
      }
    }

    // Corps
    const sides = isExtra ? 12 : 8;
    ctx.shadowBlur = 20; ctx.shadowColor = ph.glowColor;
    ctx.fillStyle = ph.isSpellCard ? ph.color + 'cc' : (isExtra ? '#0a0015' : '#1a0022');
    ctx.beginPath();
    for (let i = 0; i < sides; i++) {
      const a  = (Math.PI * 2 / sides) * i + auraAngle * (isExtra ? 0.5 : 0.3);
      const r2 = w * (0.92 + Math.sin(shieldPulse + i * 0.8) * 0.05);
      if (i === 0) ctx.moveTo(x + Math.cos(a) * r2, y + Math.sin(a) * r2);
      else         ctx.lineTo(x + Math.cos(a) * r2, y + Math.sin(a) * r2);
    }
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = ph.color; ctx.lineWidth = isExtra ? 2.5 : 2; ctx.shadowBlur = 15; ctx.stroke();

    if (isExtra) {
      ctx.strokeStyle = ph.glowColor + '88'; ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i < sides; i++) {
        const a = (Math.PI * 2 / sides) * i - auraAngle * 0.7;
        const r2 = w * 0.55;
        if (i === 0) ctx.moveTo(x + Math.cos(a) * r2, y + Math.sin(a) * r2);
        else         ctx.lineTo(x + Math.cos(a) * r2, y + Math.sin(a) * r2);
      }
      ctx.closePath(); ctx.stroke();
    }

    // Œil
    const eyeR = w * (isExtra ? 0.32 : 0.28);
    ctx.shadowBlur = 20; ctx.shadowColor = ph.isSpellCard ? '#ffffff' : ph.glowColor;
    ctx.fillStyle = ph.isSpellCard ? '#ffffff' : ph.color;
    ctx.beginPath(); ctx.arc(x, y, eyeR, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.arc(x + Math.cos(auraAngle * 2) * eyeR * 0.4, y + Math.sin(auraAngle * 2) * eyeR * 0.4, eyeR * 0.45, 0, Math.PI * 2); ctx.fill();

    // Barre HP
    const barW = isExtra ? 240 : 200, barH = isExtra ? 10 : 8;
    const barX = x - barW / 2, barY = y + w + 10;
    const hpRatio = Math.max(0, ph.hp / ph.maxHp);

    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);
    ctx.fillStyle = '#111'; ctx.fillRect(barX, barY, barW, barH);

    const barColor = ph.isSpellCard ? `hsl(${280 + hpRatio * 60},100%,65%)` : `hsl(${hpRatio * 120},100%,55%)`;
    ctx.shadowBlur = 6; ctx.shadowColor = barColor; ctx.fillStyle = barColor;
    ctx.fillRect(barX, barY, barW * hpRatio, barH);

    ctx.shadowBlur = 0;
    for (let i = 1; i < state.phases.length; i++) {
      ctx.fillStyle = 'rgba(0,0,0,0.8)';
      ctx.fillRect(barX + barW * (i / state.phases.length) - 1, barY, 2, barH);
    }

    ctx.shadowBlur = isExtra ? 15 : 6; ctx.shadowColor = ph.color; ctx.fillStyle = ph.color;
    ctx.font = ph.isSpellCard ? 'bold 11px "Noto Serif JP",serif' : '11px "Share Tech Mono",monospace';
    ctx.textAlign = 'center';
    ctx.fillText(ph.name + (isExtra ? ' ✦' : ''), x, barY - 6);
    if (isExtra) {
      ctx.font = 'bold 10px "Share Tech Mono",monospace'; ctx.fillStyle = '#cc44ff';
      ctx.fillText('⚠ EXTRA BOSS', x, barY - 20);
    }

    ctx.restore();
  }

  function getState() { return state; }
  function reset()    { state = null; }

  return { spawn, fire, hit, draw, isDead, isActive, currentPhase, updateMovement, getState, reset };
})();