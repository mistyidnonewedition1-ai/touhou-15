// ═══════════════════════════════════════════════
//  boss.js — Boss avec sprite sheet réel
//  Sprite sheet : sprites/boss_sheet.png (1536x1024)
//  Layout :
//    Pose combat  sx=0,   sy=0,   sw=430, sh=620
//    Pose fuite   sx=430, sy=0,   sw=490, sh=620
//    Portrait N   sx=920, sy=0,   sw=310, sh=320
//    Portrait F   sx=920, sy=320, sw=310, sh=300
//    Buste[0..4]  sx=i*310, sy=620, sw=310, sh=404
// ═══════════════════════════════════════════════

const Boss = (() => {

  // ── Sprite sheet ────────────────────────────
  const sheet = new Image();
  sheet.src = 'sprites/boss_sheet.png';
  let sheetReady = false;
  sheet.onload = () => { sheetReady = true; };

  // Zones dans la sheet
  const ZONES = {
    pose1:    { sx: 0,   sy: 0,   sw: 430, sh: 620 }, // attaque
    pose2:    { sx: 430, sy: 0,   sw: 490, sh: 620 }, // dos/fuite
    portrait: { sx: 920, sy: 0,   sw: 310, sh: 320 }, // neutre
    portAngry:{ sx: 920, sy: 320, sw: 310, sh: 300 }, // fâché
    buste: [
      { sx: 0,    sy: 620, sw: 310, sh: 404 },
      { sx: 310,  sy: 620, sw: 310, sh: 404 },
      { sx: 620,  sy: 620, sw: 310, sh: 404 },
      { sx: 930,  sy: 620, sw: 310, sh: 404 },
      { sx: 1240, sy: 620, sw: 296, sh: 404 },
    ],
  };

  const NORMAL_PHASES = [
    { name: '「紅の序章」',   nameRom: 'Prélude Écarlate',     hp: 500, color: '#88ccff', glowColor: '#4499ff', isSpellCard: false, pattern: 'phase1',     fireRate: 80,  busteIdx: 0 },
    { name: '「螺旋の夢」',   nameRom: 'Rêve Spiral',           hp: 420, color: '#ff44ff', glowColor: '#cc00ff', isSpellCard: true,  pattern: 'spellcard1', fireRate: 1,   busteIdx: 1 },
    { name: '「蒼天の怒り」', nameRom: 'Courroux du Ciel Azur', hp: 580, color: '#4488ff', glowColor: '#0044ff', isSpellCard: false, pattern: 'phase2',     fireRate: 65,  busteIdx: 2 },
    { name: '「永遠と瞬間」', nameRom: 'Éternité et Instant',   hp: 650, color: '#ffdd44', glowColor: '#ffaa00', isSpellCard: true,  pattern: 'spellcard2', fireRate: 1,   busteIdx: 3 },
    { name: '「最後の境界」', nameRom: 'Dernière Frontière',    hp: 400, color: '#ffffff', glowColor: '#aaaaff', isSpellCard: true,  pattern: 'final',      fireRate: 1,   busteIdx: 4 },
  ];

  const EXTRA_PHASES = [
    { name: '「虚無の扉」',   nameRom: 'Portail du Néant',             hp: 700, color: '#aa44ff', glowColor: '#7700cc', isSpellCard: false, pattern: 'extra1',     fireRate: 60, busteIdx: 0 },
    { name: '「混沌の螺旋」', nameRom: 'Spirale du Chaos',             hp: 650, color: '#ff00ff', glowColor: '#cc00aa', isSpellCard: true,  pattern: 'extraSC1',   fireRate: 1,  busteIdx: 2 },
    { name: '「無限の壁」',   nameRom: "Mur de l'Infini",              hp: 800, color: '#00ffff', glowColor: '#0099cc', isSpellCard: false, pattern: 'extra2',     fireRate: 50, busteIdx: 1 },
    { name: '「破滅の閃光」', nameRom: 'Éclair de Destruction',        hp: 700, color: '#ffff00', glowColor: '#ffaa00', isSpellCard: true,  pattern: 'extraSC2',   fireRate: 1,  busteIdx: 3 },
    { name: '「神命・終焉」', nameRom: 'Décret Divin · Fin du Monde',  hp: 900, color: '#ff4400', glowColor: '#ff0000', isSpellCard: true,  pattern: 'extraFinal', fireRate: 1,  busteIdx: 4 },
  ];

  let state = null;

  function spawn(W, isExtra = false) {
    const diff   = Difficulty.get();
    const src    = isExtra ? EXTRA_PHASES : NORMAL_PHASES;
    const phases = src.map(p => ({ ...p, hp: Math.round(p.hp * diff.bossHpMult), maxHp: Math.round(p.hp * diff.bossHpMult) }));
    state = {
      x: W / 2, y: 110, w: 80, h: 80,
      targetX: W / 2, targetY: 110,
      moveTimer: 0, moveInterval: 120,
      phase: 0, phases, frameCounter: 0, spiralAngle: 0,
      alive: true, W, auraAngle: 0, shieldPulse: 0, isExtra, hitFlash: 0,
      ringAngle: 0,
      // sprite
      poseTimer: 0, currentPose: 'pose1', poseFlip: false,
      // dialogue
      showDialogue: false, dialogueTimer: 0, dialogueText: '',
    };
    return state;
  }

  function currentPhase() { return state ? state.phases[state.phase] : null; }
  function isActive()     { return !!state && state.alive; }
  function getState()     { return state; }
  function reset()        { state = null; }
  function isDead()       { return !state || !state.alive; }

  function updateMovement() {
    const ph = currentPhase();
    state.moveTimer++;
    const interval = ph.isSpellCard ? state.moveInterval * 0.6 : state.moveInterval;
    if (state.moveTimer >= interval) {
      state.targetX   = 60 + Math.random() * (state.W - 120);
      state.targetY   = 60 + Math.random() * (ph.isSpellCard ? 160 : 130);
      state.moveTimer = 0;
      state.moveInterval = (ph.isSpellCard ? 70 : 100) + Math.random() * 60;
      state.poseFlip = state.targetX < state.x;
    }
    const spd = (ph.isSpellCard ? 2.8 : 1.8) * (state.isExtra ? 1.3 : 1);
    state.x += (state.targetX - state.x) * 0.03 * spd;
    state.y += (state.targetY - state.y) * 0.03 * spd;
    state.auraAngle  += state.isExtra ? 0.035 : 0.02;
    state.shieldPulse += 0.05;
    state.ringAngle  += 0.015;
    if (state.hitFlash > 0) state.hitFlash--;
    state.poseTimer++;

    // Alterner entre pose1 et pose2 pendant spellcard
    if (ph.isSpellCard) {
      state.currentPose = Math.floor(state.poseTimer / 30) % 2 === 0 ? 'pose1' : 'pose2';
    } else {
      state.currentPose = 'pose1';
    }

    // Dialogue
    if (state.showDialogue) {
      state.dialogueTimer--;
      if (state.dialogueTimer <= 0) state.showDialogue = false;
    }
  }

  // ── Helpers patterns ────────────────────────
  function mkB(x, y, vx, vy, r, color, glow) {
    return { x, y, vx, vy, r, color, glow, active: true };
  }

  function fireRosePattern(eb, x, y, petals, speed, r, color, glow, angleOffset) {
    for (let i = 0; i < petals * 12; i++) {
      const t = (i / (petals * 12)) * Math.PI * 2;
      const rho = Math.cos(petals * t);
      if (rho < 0) continue;
      const vx = Math.cos(t + angleOffset) * rho * speed;
      const vy = Math.sin(t + angleOffset) * rho * speed;
      eb.push(mkB(x, y, vx, vy, r, color, glow));
    }
  }

  function firePentagram(eb, x, y, speed, r, color, glow, offset) {
    const pts = 5;
    for (let i = 0; i < pts; i++) {
      const a1 = (Math.PI * 2 / pts) * i + offset;
      const a2 = (Math.PI * 2 / pts) * ((i + 2) % pts) + offset;
      const steps = 8;
      for (let s = 0; s <= steps; s++) {
        const t = s / steps;
        const cx = Math.cos(a1) * 30 * (1-t) + Math.cos(a2) * 30 * t;
        const cy = Math.sin(a1) * 30 * (1-t) + Math.sin(a2) * 30 * t;
        const d  = Math.sqrt(cx*cx+cy*cy) || 1;
        eb.push(mkB(x + cx*0.3, y + cy*0.3, cx/d*speed, cy/d*speed, r, color, glow));
      }
    }
  }

  function fireButterfly(eb, x, y, angle, speed, r, color, glow) {
    const steps = 20;
    for (let i = 0; i < steps; i++) {
      const t   = (i / steps) * Math.PI * 2 + angle;
      const rho = Math.exp(Math.sin(t)) - 2*Math.cos(4*t) + Math.pow(Math.sin((2*t-Math.PI)/24), 5);
      const clamped = Math.min(Math.abs(rho)*0.4, 2.5);
      eb.push(mkB(x, y, Math.cos(t)*clamped*speed, Math.sin(t)*clamped*speed, r, color, glow));
    }
  }

  function fireGalaxy(eb, x, y, arms, speed, r, color, glow, angle) {
    const stepsPerArm = 6;
    for (let a = 0; a < arms; a++) {
      const armOff = (Math.PI*2/arms)*a + angle;
      for (let s = 1; s <= stepsPerArm; s++) {
        const theta = armOff + s*0.35;
        eb.push(mkB(x + Math.cos(theta)*s*0.8, y + Math.sin(theta)*s*0.8,
          Math.cos(theta)*speed*(0.5+s*0.08), Math.sin(theta)*speed*(0.5+s*0.08), r, color, glow));
      }
    }
  }

  function fireLace(eb, x, y, speed, r, color, glow, offset) {
    const rings = 3, perRing = 10;
    for (let ring = 0; ring < rings; ring++) {
      const rs = speed*(0.7+ring*0.2);
      const off = offset + ring*(Math.PI/perRing);
      for (let i = 0; i < perRing; i++) {
        const a = (Math.PI*2/perRing)*i + off;
        eb.push(mkB(x, y, Math.cos(a)*rs, Math.sin(a)*rs, r-ring*0.5, color, glow));
      }
    }
  }

  // ── Fire principal ───────────────────────────
  function fire(eb, playerX, playerY) {
    if (!state || !state.alive) return;
    const ph   = currentPhase();
    const diff = Difficulty.get();
    state.frameCounter++;
    const fc   = state.frameCounter;
    const bx   = state.x, by = state.y;
    const opts = { playerX, playerY };

    const spd  = s => s * diff.bulletSpeed;
    const cnt  = n => Difficulty.scaledBulletCount(n);
    const rate = r => Math.max(1, Math.round(r * diff.enemyFireRate));

    function aimVec(speed2) {
      const dx = playerX-bx, dy = playerY-by;
      const d = Math.sqrt(dx*dx+dy*dy)||1;
      return { vx: dx/d*speed2, vy: dy/d*speed2 };
    }

    switch (ph.pattern) {
      case 'phase1':
        if (fc % rate(ph.fireRate) === 0)
          Patterns.fan(eb, bx, by, { ...opts, count: cnt(6), speed: spd(2.2), spread: 1.1, r: 5, color: '#88ccff', glow: '#4499ff' });
        if (fc % rate(ph.fireRate*1.5) === 0) {
          for (let k = 0; k < 2; k++)
            setTimeout(() => { if(state&&state.alive) Patterns.circle(eb, bx, by, { count: cnt(10), speed: spd(1.6+k*0.3), r: 4.5, color: '#aaddff', glow: '#4488ff', offset: k*(Math.PI/10) }); }, k*200);
        }
        if (fc % rate(ph.fireRate*3) === 0) {
          const {vx,vy} = aimVec(spd(5));
          for (let i=0;i<12;i++) setTimeout(()=>{ if(state&&state.alive) eb.push(mkB(bx,by,vx+(Math.random()-.5)*.3,vy+(Math.random()-.5)*.3,3.5,'#cceeff','#4488ff')); }, i*30);
        }
        break;

      case 'spellcard1':
        state.spiralAngle += 0.08;
        if (fc % Math.max(1,Math.round(3/diff.bulletCount)) === 0)
          Patterns.dualSpiral(eb, bx, by, { speed: spd(2.6), r: 4.5, angle: state.spiralAngle, color: '#88aaff', glow: '#4466ff' });
        if (fc % 80 === 0)
          fireRosePattern(eb, bx, by, 4, spd(2.0), 4, '#aaccff', '#4488ff', state.spiralAngle);
        if (fc % 150 === 0)
          Patterns.circle(eb, bx, by, { count: cnt(20), speed: spd(2.0), r: 3.5, color: '#cceeff', glow: '#6699ff', offset: state.spiralAngle });
        break;

      case 'phase2':
        state.spiralAngle += 0.04;
        if (fc % rate(ph.fireRate) === 0)
          fireGalaxy(eb, bx, by, cnt(4), spd(2.8), 4.5, '#44aaff', '#0066ff', state.spiralAngle);
        if (fc % rate(ph.fireRate+25) === 0)
          Patterns.wave(eb, bx, by, { ...opts, count: cnt(7), speed: spd(2.5), color: '#66ccff', glow: '#0099ff' });
        if (fc % 100 === 0) {
          Patterns.ring(eb, bx, by, { count: cnt(16), speed: spd(2.0), gap: 2, offset: state.spiralAngle, color: '#aaddff', glow: '#4499ff' });
          state.spiralAngle += 0.5;
        }
        break;

      case 'spellcard2':
        state.spiralAngle += 0.09;
        if (fc % Math.max(1,Math.round(4/diff.bulletCount)) === 0)
          Patterns.spiral(eb, bx, by, { speed: spd(2.8), r: 4, color: '#88ccff', glow: '#4488ff', angle: state.spiralAngle, arms: cnt(4) });
        if (fc % 70 === 0)
          firePentagram(eb, bx, by, spd(2.2), 4, '#aaddff', '#6699ff', state.spiralAngle);
        if (fc % 120 === 0)
          fireLace(eb, bx, by, spd(2.0), 4, '#cceeff', '#4488ff', state.spiralAngle);
        if (fc % 90 === 0) {
          const {vx,vy} = aimVec(spd(5));
          for(let i=0;i<15;i++) setTimeout(()=>{ if(state&&state.alive) eb.push(mkB(bx,by,vx,vy,3.5,'#ffffff','#aaccff')); }, i*25);
        }
        break;

      case 'final':
        state.spiralAngle += 0.06;
        if (fc % Math.max(1,Math.round(2/diff.bulletCount)) === 0)
          Patterns.spiral(eb, bx, by, { speed: spd(2.3), r: 3.5, color: '#ffffff', glow: '#aaccff', angle: state.spiralAngle, arms: cnt(5) });
        if (fc % 40 === 0)
          fireButterfly(eb, bx, by, state.spiralAngle, spd(2.0), 4, '#cceeff', '#88aaff');
        if (fc % 25 === 0)
          Patterns.fan(eb, bx, by, { ...opts, count: cnt(7), speed: spd(3.0), spread: 0.65, color: '#aaddff', glow: '#4488ff', r: 4 });
        if (fc % 70 === 0)
          Patterns.circle(eb, bx, by, { count: cnt(24), speed: spd(1.8), color: '#eef8ff', glow: '#88bbff', r: 3.5 });
        break;

      case 'extra1':
        state.spiralAngle += 0.05;
        if (fc % rate(ph.fireRate) === 0) {
          fireGalaxy(eb, bx, by, cnt(6), spd(3.0), 5, '#aa44ff', '#7700cc', state.spiralAngle);
          Patterns.fan(eb, bx, by, { ...opts, count: cnt(8), speed: spd(3.2), spread: 1.0, color: '#dd88ff', glow: '#aa00ff', r: 4 });
        }
        if (fc % 35 === 0)
          fireRosePattern(eb, bx, by, 3, spd(2.5), 4.5, '#cc66ff', '#9900ff', state.spiralAngle*2);
        break;

      case 'extraSC1':
        state.spiralAngle += 0.13;
        if (fc % Math.max(1,Math.round(2/diff.bulletCount)) === 0) {
          Patterns.spiral(eb, bx, by, { speed: spd(3.2), r: 4, color: '#ff00ff', glow: '#cc00aa', angle: state.spiralAngle, arms: cnt(6) });
          Patterns.spiral(eb, bx, by, { speed: spd(2.2), r: 3, color: '#ffffff', glow: '#ffaaff', angle: -state.spiralAngle*0.8, arms: cnt(4) });
        }
        if (fc % 55 === 0) fireLace(eb, bx, by, spd(2.2), 4, '#ff44ff', '#ff00ff', state.spiralAngle);
        if (fc % 90 === 0) Patterns.circle(eb, bx, by, { count: cnt(28), speed: spd(1.8), color: '#ff44ff', glow: '#ff00ff', r: 3.5 });
        break;

      case 'extra2':
        state.spiralAngle += 0.06;
        if (fc % rate(ph.fireRate) === 0) {
          Patterns.wave(eb, bx, by, { ...opts, count: cnt(9), speed: spd(3.5), color: '#00ffff', glow: '#0099cc' });
          fireGalaxy(eb, bx, by, cnt(5), spd(2.8), 5, '#44ddff', '#0099ff', state.spiralAngle);
        }
        if (fc % rate(60) === 0) {
          Patterns.laser(eb, bx, by, { ...opts, color: '#00ffff', glow: '#00aaff', r: 5, count: 22, speed: spd(6.5) });
          state.spiralAngle += 0.4;
        }
        if (fc % 120 === 0) firePentagram(eb, bx, by, spd(2.5), 4.5, '#aaffff', '#00ddff', state.spiralAngle);
        break;

      case 'extraSC2':
        state.spiralAngle += 0.09;
        if (fc % Math.max(1,Math.round(3/diff.bulletCount)) === 0)
          Patterns.spiral(eb, bx, by, { speed: spd(3.8), r: 4.5, color: '#ffff00', glow: '#ffaa00', angle: state.spiralAngle, arms: cnt(8) });
        if (fc % 40 === 0) fireButterfly(eb, bx, by, state.spiralAngle, spd(3.0), 4.5, '#ffee44', '#ffaa00');
        if (fc % 50 === 0) Patterns.fan(eb, bx, by, { ...opts, count: cnt(11), speed: spd(4.0), spread: 2.2, color: '#ffee44', glow: '#ffaa00', r: 4 });
        if (fc % 100 === 0) fireLace(eb, bx, by, spd(2.5), 4, '#ffff88', '#ffdd00', state.spiralAngle);
        break;

      case 'extraFinal':
        state.spiralAngle += 0.07;
        if (fc % Math.max(1,Math.round(1/diff.bulletCount)) === 0)
          Patterns.spiral(eb, bx, by, { speed: spd(3.2), r: 4, color: '#ff4400', glow: '#ff0000', angle: state.spiralAngle, arms: cnt(8) });
        if (fc % 20 === 0) Patterns.fan(eb, bx, by, { ...opts, count: cnt(10), speed: spd(4.0), spread: 0.75, color: '#ff8844', glow: '#ff3300', r: 4 });
        if (fc % 45 === 0) fireRosePattern(eb, bx, by, 5, spd(2.5), 4, '#ff4444', '#cc0000', state.spiralAngle);
        if (fc % 60 === 0) firePentagram(eb, bx, by, spd(2.8), 4.5, '#ff8866', '#ff2200', state.spiralAngle*1.5);
        if (fc % 80 === 0) Patterns.laser(eb, bx, by, { ...opts, color: '#ffffff', glow: '#ff8800', r: 5, count: 25, speed: spd(7.5) });
        if (fc % 40 === 0) Patterns.circle(eb, bx, by, { count: cnt(30), speed: spd(2.2), color: '#ffaaaa', glow: '#ff4400', r: 3.5 });
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
        // Déclencher dialogue transition
        const dialogues = ['...', '私の力を見せてあげる！', 'まだまだ！', '本気を出す時が来た！', '最後の力よ...!'];
        state.showDialogue  = true;
        state.dialogueTimer = 180;
        state.dialogueText  = dialogues[state.phase] || '...';
        if (onPhaseChange) onPhaseChange(state.phase, currentPhase());
      } else {
        state.alive = false;
        ParticleSystem.bossPhaseTransition(state.x, state.y);
        eb.length = 0;
        if (onDeath) onDeath(state.isExtra);
      }
    }
  }

  // ── Draw ─────────────────────────────────────
  function draw(ctx) {
    if (!state || !state.alive) return;
    const ph = currentPhase();
    const { x, y, w, auraAngle, shieldPulse, isExtra, hitFlash, ringAngle } = state;

    ctx.save();

    // Flash de dégât
    if (hitFlash > 0) {
      ctx.globalAlpha = (hitFlash/8)*0.4;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(x, y, w*1.8, 0, Math.PI*2); ctx.fill();
      ctx.globalAlpha = 1;
    }

    // Aura de fond
    const auraR = w*(isExtra ? 2.0 : 1.6) + Math.sin(shieldPulse)*5;
    const grad = ctx.createRadialGradient(x, y, w*0.3, x, y, auraR);
    grad.addColorStop(0, ph.glowColor+'55');
    grad.addColorStop(0.5, ph.glowColor+'18');
    grad.addColorStop(1, ph.glowColor+'00');
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(x, y, auraR, 0, Math.PI*2); ctx.fill();

    // Anneaux décoratifs
    for (let ring = 0; ring < (isExtra ? 3 : 2); ring++) {
      const rr = w*(1.3+ring*0.3);
      const segs = isExtra ? 12 : 8;
      ctx.strokeStyle = ph.color + (ring===0?'88':ring===1?'44':'22');
      ctx.lineWidth = ring===0?1.5:1;
      ctx.shadowBlur = 6; ctx.shadowColor = ph.glowColor;
      ctx.beginPath();
      for (let i=0;i<segs;i++) {
        const a1 = (Math.PI*2/segs)*i + ringAngle*(ring%2===0?1:-1.5);
        const a2 = (Math.PI*2/segs)*i + Math.PI/segs + ringAngle*(ring%2===0?1:-1.5);
        ctx.moveTo(x+Math.cos(a1)*rr, y+Math.sin(a1)*rr);
        ctx.lineTo(x+Math.cos(a2)*rr, y+Math.sin(a2)*rr);
      }
      ctx.stroke();
    }

    // ── Sprite principal ─────────────────────
    if (sheetReady) {
      const zone = ZONES[state.currentPose];
      const drawH = w * 2.8;
      const drawW = drawH * (zone.sw / zone.sh);

      ctx.save();
      if (state.poseFlip) {
        ctx.scale(-1, 1);
        ctx.drawImage(sheet, zone.sx, zone.sy, zone.sw, zone.sh, -x - drawW/2, y - drawH*0.55, drawW, drawH);
      } else {
        ctx.drawImage(sheet, zone.sx, zone.sy, zone.sw, zone.sh, x - drawW/2, y - drawH*0.55, drawW, drawH);
      }

      // Overlay de couleur de phase sur le sprite (spellcard)
      if (ph.isSpellCard) {
        ctx.globalAlpha = 0.18;
        ctx.fillStyle = ph.color;
        if (state.poseFlip) {
          ctx.fillRect(-x - drawW/2, y - drawH*0.55, drawW, drawH);
        } else {
          ctx.fillRect(x - drawW/2, y - drawH*0.55, drawW, drawH);
        }
        ctx.globalAlpha = 1;
      }
      ctx.restore();

    } else {
      // Fallback si sprite pas chargé
      ctx.shadowBlur = 18; ctx.shadowColor = ph.glowColor;
      ctx.fillStyle = ph.color+'44';
      ctx.beginPath(); ctx.arc(x, y, w*0.9, 0, Math.PI*2); ctx.fill();
      ctx.strokeStyle = ph.color; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(x, y, w*0.9, 0, Math.PI*2); ctx.stroke();
    }

    // Hitbox du boss (orbes orbitaux)
    const orbCount = isExtra ? 6 : 4;
    for (let i=0;i<orbCount;i++) {
      const a = auraAngle*(i%2===0?1:-0.7) + (Math.PI*2/orbCount)*i;
      const or = w*0.5 + Math.sin(shieldPulse+i)*2;
      ctx.shadowBlur = 10; ctx.shadowColor = ph.color; ctx.fillStyle = ph.color;
      ctx.beginPath(); ctx.arc(x+Math.cos(a)*or, y+Math.sin(a)*or, 3.5, 0, Math.PI*2); ctx.fill();
    }

    // ── Barre HP ─────────────────────────────
    const barW = isExtra ? 240 : 200, barH = isExtra ? 9 : 7;
    const barX = x - barW/2, barY = y + w + 18;
    const hpR  = Math.max(0, ph.hp/ph.maxHp);

    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(barX-1, barY-1, barW+2, barH+2);
    ctx.fillStyle = '#111'; ctx.fillRect(barX, barY, barW, barH);

    const barColor = ph.isSpellCard ? `hsl(${200+hpR*60},90%,65%)` : `hsl(${200+hpR*30},100%,55%)`;
    ctx.shadowBlur = 8; ctx.shadowColor = barColor;
    const barGrad = ctx.createLinearGradient(barX, 0, barX+barW, 0);
    barGrad.addColorStop(0, barColor);
    barGrad.addColorStop(1, '#ffffff44');
    ctx.fillStyle = barGrad;
    ctx.fillRect(barX, barY, barW*hpR, barH);

    ctx.shadowBlur = 0;
    for (let i=1;i<state.phases.length;i++) {
      ctx.fillStyle='rgba(0,0,0,0.8)';
      ctx.fillRect(barX+barW*(i/state.phases.length)-1, barY, 2, barH);
    }

    ctx.shadowBlur = isExtra?12:5; ctx.shadowColor = ph.color; ctx.fillStyle = ph.color;
    ctx.font = ph.isSpellCard ? 'bold 11px "Noto Serif JP",serif' : '11px "Share Tech Mono",monospace';
    ctx.textAlign = 'center';
    ctx.fillText(ph.name+(isExtra?' ✦':''), x, barY-6);
    if (isExtra) {
      ctx.font='bold 10px "Share Tech Mono",monospace'; ctx.fillStyle='#cc44ff';
      ctx.fillText('⚠ EXTRA BOSS', x, barY-20);
    }

    // ── Portrait + dialogue ──────────────────
    if (state.showDialogue && sheetReady) {
      drawDialogue(ctx, ph);
    }

    ctx.restore();
  }

  function drawDialogue(ctx, ph) {
    const alpha = Math.min(1, state.dialogueTimer / 30) * Math.min(1, (state.dialogueTimer) / 20);
    const W = state.W;
    const panelX = 8, panelY = 420;
    const panelW = W - 16, panelH = 90;

    ctx.save();
    ctx.globalAlpha = alpha;

    // Fond panneau
    ctx.fillStyle = 'rgba(0,5,20,0.88)';
    ctx.strokeStyle = ph.color;
    ctx.lineWidth = 1.5;
    ctx.shadowBlur = 10; ctx.shadowColor = ph.color;
    roundRect(ctx, panelX, panelY, panelW, panelH, 6);
    ctx.fill(); ctx.stroke();

    // Portrait buste
    const busteZone = ZONES.buste[ph.busteIdx] || ZONES.buste[0];
    const bh = 78, bw = bh * (busteZone.sw / busteZone.sh);
    ctx.drawImage(sheet, busteZone.sx, busteZone.sy, busteZone.sw, busteZone.sh, panelX+6, panelY+6, bw, bh);

    // Texte
    ctx.shadowBlur = 0;
    ctx.fillStyle = ph.color;
    ctx.font = 'bold 10px "Noto Serif JP",serif';
    ctx.textAlign = 'left';
    ctx.fillText('永遠雪姫', panelX + bw + 14, panelY + 20);
    ctx.fillStyle = '#ddeeff';
    ctx.font = '11px "Noto Serif JP",serif';
    wrapText(ctx, state.dialogueText, panelX+bw+14, panelY+38, panelW-bw-22, 16);

    ctx.restore();
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x+r, y);
    ctx.lineTo(x+w-r, y); ctx.arcTo(x+w, y, x+w, y+r, r);
    ctx.lineTo(x+w, y+h-r); ctx.arcTo(x+w, y+h, x+w-r, y+h, r);
    ctx.lineTo(x+r, y+h); ctx.arcTo(x, y+h, x, y+h-r, r);
    ctx.lineTo(x, y+r); ctx.arcTo(x, y, x+r, y, r);
    ctx.closePath();
  }

  function wrapText(ctx, text, x, y, maxW, lineH) {
    const words = text.split('');
    let line = '';
    let cy = y;
    for (const ch of words) {
      const test = line + ch;
      if (ctx.measureText(test).width > maxW && line !== '') {
        ctx.fillText(line, x, cy);
        line = ch; cy += lineH;
      } else { line = test; }
    }
    if (line) ctx.fillText(line, x, cy);
  }

  return { spawn, fire, hit, draw, isDead, isActive, currentPhase, updateMovement, getState, reset };
})();