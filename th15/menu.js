// ═══════════════════════════════════════════════
//  menu.js — Système de menu interactif
// ═══════════════════════════════════════════════

const Menu = (() => {

  // ── État sauvegardé ─────────────────────────
  const save = {
    hiScore:      { easy: 0, normal: 0, hard: 0, lunatic: 0, extra: 0 },
    cleared:      { easy: false, normal: false, hard: false, lunatic: false },
    extraUnlocked: false,
    options: {
      hitboxVisible: false,
      screenShake:   true,
      grazeEffect:   true,
    },
  };

  // ── State du menu ───────────────────────────
  let state = {
    screen: 'main',       // 'main' | 'difficulty' | 'options' | 'bgm'
    mainCursor:  0,
    diffCursor:  1,        // default Normal
    optCursor:   0,
    bgmCursor:   0,
    anim:        0,
    transition:  0,        // 0→1 fondu entrée, -1→0 fondu sortie
    transDir:    1,
    onStart:     null,     // callback(difficulty, isExtra)
  };

  const MAIN_ITEMS = [
    { id: 'start',      label: 'START GAME',  icon: '▶' },
    { id: 'replay',     label: 'REPLAY',      icon: '↺' },
    { id: 'extra',      label: 'EXTRA BOSS',  icon: '✦' },
    { id: 'bgm',        label: 'BGM ROOM',    icon: '♪' },
    { id: 'options',    label: 'OPTIONS',     icon: '⚙' },
  ];

  const DIFF_ITEMS = [
    { id: 'easy',    label: 'EASY',    color: '#88ff88', desc: 'Moins de balles, tir rapide.', stars: 1 },
    { id: 'normal',  label: 'NORMAL',  color: '#ffee44', desc: 'L\'expérience classique.', stars: 2 },
    { id: 'hard',    label: 'HARD',    color: '#ff8844', desc: 'Patterns denses, ennemis rapides.', stars: 3 },
    { id: 'lunatic', label: 'LUNATIC', color: '#ff4466', desc: 'Chaos total. Bonne chance.', stars: 4 },
    { id: 'extra',   label: 'EXTRA',   color: '#cc44ff', desc: 'Mode secret. Finir le jeu d\'abord.', stars: 5 },
  ];

  const OPT_ITEMS = [
    { id: 'hitboxVisible', label: 'Hitbox toujours visible', type: 'bool' },
    { id: 'screenShake',   label: 'Screen shake',            type: 'bool' },
    { id: 'grazeEffect',   label: 'Effets de graze',         type: 'bool' },
  ];

  // ── Helpers dessin ──────────────────────────

  function hexToRgb(hex) {
    const r = parseInt(hex.slice(1,3),16);
    const g = parseInt(hex.slice(3,5),16);
    const b = parseInt(hex.slice(5,7),16);
    return `${r},${g},${b}`;
  }

  function drawPanel(ctx, x, y, w, h, color = '#220033', border = '#7733aa') {
    ctx.save();
    ctx.fillStyle = color;
    ctx.strokeStyle = border;
    ctx.lineWidth = 1.5;
    ctx.shadowBlur = 20;
    ctx.shadowColor = border;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 8);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  function drawText(ctx, text, x, y, opts = {}) {
    ctx.save();
    ctx.font        = opts.font    || '13px "Share Tech Mono", monospace';
    ctx.fillStyle   = opts.color   || '#ffffff';
    ctx.textAlign   = opts.align   || 'left';
    ctx.shadowBlur  = opts.glow    || 0;
    ctx.shadowColor = opts.glowCol || opts.color || '#ffffff';
    ctx.fillText(text, x, y);
    ctx.restore();
  }

  // Curseur animé
  function drawCursor(ctx, x, y, anim) {
    const pulse = 0.7 + Math.sin(anim * 0.1) * 0.3;
    ctx.save();
    ctx.fillStyle = `rgba(200,100,255,${pulse})`;
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#cc44ff';
    ctx.font = '14px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('▶', x, y);
    ctx.restore();
  }

  // ── Écrans ──────────────────────────────────

  function drawMain(ctx, W, H) {
    const cx = W / 2;

    // Titre
    ctx.save();
    const titleY = 90 + Math.sin(state.anim * 0.025) * 4;
    ctx.font = 'bold 26px "Noto Serif JP", serif';
    ctx.textAlign = 'center';
    ctx.shadowBlur = 40;
    ctx.shadowColor = '#aa44ff';
    ctx.fillStyle = '#ddaaff';
    ctx.fillText('東方幻想郷', cx, titleY);
    ctx.shadowBlur = 10;
    ctx.fillStyle = '#ffffff';
    ctx.font = '15px "Share Tech Mono", monospace';
    ctx.fillText('◈  BULLET HELL  ◈', cx, titleY + 28);
    ctx.restore();

    // Panel menu
    const panelW = 220, panelH = MAIN_ITEMS.length * 46 + 24;
    const panelX = cx - panelW / 2, panelY = 148;
    drawPanel(ctx, panelX, panelY, panelW, panelH, 'rgba(10,0,20,0.85)', '#5522aa');

    MAIN_ITEMS.forEach((item, i) => {
      const iy = panelY + 32 + i * 46;
      const selected = i === state.mainCursor;

      if (selected) {
        // Highlight row
        ctx.save();
        ctx.fillStyle = 'rgba(180,80,255,0.15)';
        ctx.fillRect(panelX + 4, iy - 18, panelW - 8, 34);
        ctx.restore();
        drawCursor(ctx, panelX + 12, iy, state.anim);
      }

      const locked = item.id === 'extra' && !save.extraUnlocked;
      const col = selected ? '#ffffff' : (locked ? '#554466' : '#bb99dd');

      ctx.save();
      ctx.font = selected ? 'bold 15px "Share Tech Mono",monospace' : '14px "Share Tech Mono",monospace';
      ctx.fillStyle = col;
      ctx.textAlign = 'left';
      ctx.shadowBlur = selected ? 12 : 0;
      ctx.shadowColor = '#cc44ff';
      ctx.fillText(`${item.icon}  ${item.label}`, panelX + 30, iy);
      if (locked) {
        ctx.font = '10px "Share Tech Mono",monospace';
        ctx.fillStyle = '#664477';
        ctx.fillText('LOCKED', panelX + panelW - 60, iy);
      }
      ctx.restore();
    });

    // Hi-scores compact
    const hsY = panelY + panelH + 20;
    drawPanel(ctx, panelX, hsY, panelW, 88, 'rgba(10,0,20,0.7)', '#331155');
    drawText(ctx, 'HI-SCORE', cx, hsY + 18, { align: 'center', color: '#9966cc', font: '11px "Share Tech Mono",monospace', glow: 4, glowCol: '#7733aa' });
    const diffs = ['easy','normal','hard','lunatic'];
    diffs.forEach((d, i) => {
      const col = DIFF_ITEMS.find(x => x.id === d).color;
      const row = Math.floor(i / 2), col2 = i % 2;
      drawText(ctx, d.toUpperCase().slice(0,3), panelX + 18 + col2 * 106, hsY + 38 + row * 24, { color: col, font: '10px "Share Tech Mono",monospace' });
      drawText(ctx, save.hiScore[d].toLocaleString(), panelX + 44 + col2 * 106, hsY + 38 + row * 24, { color: '#ffffff', font: '10px "Share Tech Mono",monospace' });
    });

    // Cleared badges
    diffs.forEach((d, i) => {
      if (save.cleared[d]) {
        const col = DIFF_ITEMS.find(x => x.id === d).color;
        const row = Math.floor(i / 2), col2 = i % 2;
        drawText(ctx, '✓', panelX + 95 + col2 * 106, hsY + 38 + row * 24, { color: col, font: '11px monospace' });
      }
    });

    // Footer
    drawText(ctx, 'Z/ENTER Sélectionner   ↑↓ Naviguer', cx, H - 18, { align: 'center', color: '#554466', font: '10px "Share Tech Mono",monospace' });
  }

  function drawDifficulty(ctx, W, H) {
    const cx = W / 2;

    drawText(ctx, '◀ BACK', 24, 30, { color: '#7744aa', font: '11px "Share Tech Mono",monospace' });
    drawText(ctx, 'SELECT DIFFICULTY', cx, 70, { align: 'center', color: '#ddaaff', font: 'bold 16px "Share Tech Mono",monospace', glow: 10, glowCol: '#aa44ff' });

    const panelW = 280, itemH = 74;
    const panelH = DIFF_ITEMS.length * itemH + 16;
    const panelX = cx - panelW / 2, panelY = 90;
    drawPanel(ctx, panelX, panelY, panelW, panelH, 'rgba(10,0,20,0.9)', '#5522aa');

    DIFF_ITEMS.forEach((diff, i) => {
      const iy    = panelY + 14 + i * itemH;
      const sel   = i === state.diffCursor;
      const locked = diff.id === 'extra' && !save.extraUnlocked;

      if (sel && !locked) {
        ctx.save();
        ctx.fillStyle = `rgba(${hexToRgb(diff.color)},0.12)`;
        ctx.fillRect(panelX + 4, iy, panelW - 8, itemH - 4);
        ctx.restore();
        drawCursor(ctx, panelX + 10, iy + 26, state.anim);
      }

      const alpha = locked ? 0.35 : 1;
      ctx.save();
      ctx.globalAlpha = alpha;

      // Label
      ctx.font = sel ? `bold 16px "Share Tech Mono",monospace` : `14px "Share Tech Mono",monospace`;
      ctx.fillStyle = diff.color;
      ctx.textAlign = 'left';
      ctx.shadowBlur = sel ? 14 : 0;
      ctx.shadowColor = diff.color;
      ctx.fillText(`${diff.label}`, panelX + 30, iy + 26);

      // Étoiles
      const stars = '★'.repeat(diff.stars) + '☆'.repeat(5 - diff.stars);
      ctx.font = '11px monospace';
      ctx.fillStyle = diff.color;
      ctx.shadowBlur = 0;
      ctx.fillText(stars, panelX + 130, iy + 26);

      // Description
      ctx.font = '10px "Share Tech Mono",monospace';
      ctx.fillStyle = sel ? '#ccaaee' : '#665577';
      ctx.shadowBlur = 0;
      ctx.fillText(locked ? '⚿  Terminer le jeu pour débloquer' : diff.desc, panelX + 30, iy + 46);

      // Hi-score de ce mode
      if (!locked && save.hiScore[diff.id] > 0) {
        ctx.font = '10px "Share Tech Mono",monospace';
        ctx.fillStyle = '#887799';
        ctx.textAlign = 'right';
        ctx.fillText('BEST ' + save.hiScore[diff.id].toLocaleString(), panelX + panelW - 12, iy + 26);
      }

      // Badge cleared
      if (save.cleared[diff.id]) {
        ctx.font = '12px monospace';
        ctx.fillStyle = diff.color;
        ctx.textAlign = 'right';
        ctx.shadowBlur = 6;
        ctx.shadowColor = diff.color;
        ctx.fillText('CLEARED ✓', panelX + panelW - 12, iy + 46);
      }

      ctx.restore();
    });

    drawText(ctx, 'Z/ENTER pour lancer   ESC/X pour retour', cx, H - 18, { align: 'center', color: '#554466', font: '10px "Share Tech Mono",monospace' });
  }

  function drawOptions(ctx, W, H) {
    const cx = W / 2;
    drawText(ctx, '◀ BACK', 24, 30, { color: '#7744aa', font: '11px "Share Tech Mono",monospace' });
    drawText(ctx, 'OPTIONS', cx, 70, { align: 'center', color: '#ddaaff', font: 'bold 16px "Share Tech Mono",monospace', glow: 10, glowCol: '#aa44ff' });

    const panelW = 280, panelH = OPT_ITEMS.length * 60 + 30;
    const panelX = cx - panelW / 2, panelY = 90;
    drawPanel(ctx, panelX, panelY, panelW, panelH, 'rgba(10,0,20,0.9)', '#5522aa');

    OPT_ITEMS.forEach((opt, i) => {
      const iy  = panelY + 30 + i * 60;
      const sel = i === state.optCursor;
      const val = save.options[opt.id];

      if (sel) {
        ctx.save();
        ctx.fillStyle = 'rgba(180,80,255,0.12)';
        ctx.fillRect(panelX + 4, iy - 18, panelW - 8, 48);
        ctx.restore();
        drawCursor(ctx, panelX + 10, iy, state.anim);
      }

      drawText(ctx, opt.label, panelX + 30, iy, { color: sel ? '#ffffff' : '#bb99dd', font: sel ? 'bold 13px "Share Tech Mono",monospace' : '13px "Share Tech Mono",monospace' });

      // Toggle visuel
      const tv = panelX + panelW - 80;
      ctx.save();
      ctx.fillStyle = val ? '#22cc44' : '#441122';
      ctx.strokeStyle = val ? '#44ff66' : '#882244';
      ctx.lineWidth = 1.5;
      ctx.shadowBlur = val ? 8 : 0;
      ctx.shadowColor = '#44ff66';
      ctx.beginPath();
      ctx.roundRect(tv, iy - 14, 60, 22, 11);
      ctx.fill();
      ctx.stroke();

      // Knob
      ctx.fillStyle = '#ffffff';
      ctx.shadowBlur = 4;
      ctx.shadowColor = '#ffffff';
      ctx.beginPath();
      ctx.arc(val ? tv + 49 : tv + 11, iy - 3, 9, 0, Math.PI * 2);
      ctx.fill();

      ctx.font = 'bold 10px "Share Tech Mono",monospace';
      ctx.fillStyle = val ? '#ffffff' : '#664455';
      ctx.textAlign = 'center';
      ctx.shadowBlur = 0;
      ctx.fillText(val ? 'ON' : 'OFF', tv + 30, iy + 2);
      ctx.restore();
    });

    drawText(ctx, 'Z/ENTER Toggle   ESC/X Retour', cx, H - 18, { align: 'center', color: '#554466', font: '10px "Share Tech Mono",monospace' });
  }

  function drawBgm(ctx, W, H) {
    const cx = W / 2;
    drawText(ctx, '◀ BACK', 24, 30, { color: '#7744aa', font: '11px "Share Tech Mono",monospace' });
    drawText(ctx, 'BGM ROOM', cx, 70, { align: 'center', color: '#ddaaff', font: 'bold 16px "Share Tech Mono",monospace', glow: 10, glowCol: '#aa44ff' });

    const tracks = [
      { title: 'Scarlet Rhapsody',    stage: 'Stage 1',       status: 'No audio' },
      { title: 'Phantom Spiral',      stage: 'Boss Phase 1',  status: 'No audio' },
      { title: 'Azure Dream',         stage: 'Stage 2',       status: 'No audio' },
      { title: 'Eternal Boundary',    stage: 'Boss Phase 2',  status: 'No audio' },
      { title: 'Final Countdown',     stage: 'Boss Final',    status: 'No audio' },
      { title: 'Extra Dimension',     stage: 'Extra Boss',    status: 'No audio' },
    ];

    const panelW = 300, panelH = tracks.length * 54 + 30;
    const panelX = cx - panelW / 2, panelY = 90;
    drawPanel(ctx, panelX, panelY, panelW, panelH, 'rgba(10,0,20,0.9)', '#5522aa');

    tracks.forEach((t, i) => {
      const iy  = panelY + 30 + i * 54;
      const sel = i === state.bgmCursor;

      if (sel) {
        ctx.save();
        ctx.fillStyle = 'rgba(180,80,255,0.12)';
        ctx.fillRect(panelX + 4, iy - 18, panelW - 8, 46);
        ctx.restore();
        drawCursor(ctx, panelX + 10, iy, state.anim);
      }

      drawText(ctx, `${String(i+1).padStart(2,'0')}. ${t.title}`, panelX + 30, iy, { color: sel ? '#ffffff' : '#bb99dd', font: sel ? 'bold 12px "Share Tech Mono",monospace' : '12px "Share Tech Mono",monospace' });
      drawText(ctx, t.stage, panelX + 30, iy + 18, { color: '#665577', font: '10px "Share Tech Mono",monospace' });
      drawText(ctx, '[ ' + t.status + ' ]', panelX + panelW - 16, iy + 8, { color: '#443355', font: '10px "Share Tech Mono",monospace', align: 'right' });
    });

    drawText(ctx, 'Ajoutez des fichiers audio dans /bgm/', cx, H - 36, { align: 'center', color: '#443355', font: '10px "Share Tech Mono",monospace' });
    drawText(ctx, 'ESC/X Retour', cx, H - 18, { align: 'center', color: '#554466', font: '10px "Share Tech Mono",monospace' });
  }

  function drawReplay(ctx, W, H) {
    const cx = W / 2;
    drawText(ctx, '◀ BACK', 24, 30, { color: '#7744aa', font: '11px "Share Tech Mono",monospace' });
    drawText(ctx, 'REPLAY', cx, 70, { align: 'center', color: '#ddaaff', font: 'bold 16px "Share Tech Mono",monospace', glow: 10, glowCol: '#aa44ff' });

    const panelW = 300, panelH = 200;
    const panelX = cx - panelW / 2, panelY = 100;
    drawPanel(ctx, panelX, panelY, panelW, panelH, 'rgba(10,0,20,0.9)', '#5522aa');

    drawText(ctx, '♺  Aucun replay enregistré', cx, panelY + 80, { align: 'center', color: '#554466', font: '13px "Share Tech Mono",monospace' });
    drawText(ctx, 'Les replays seront sauvegardés', cx, panelY + 106, { align: 'center', color: '#443355', font: '10px "Share Tech Mono",monospace' });
    drawText(ctx, 'après chaque partie terminée.', cx, panelY + 122, { align: 'center', color: '#443355', font: '10px "Share Tech Mono",monospace' });

    drawText(ctx, 'ESC/X Retour', cx, H - 18, { align: 'center', color: '#554466', font: '10px "Share Tech Mono",monospace' });
  }

  // ── Background animé du menu ─────────────────

  const menuStars = [];
  for (let i = 0; i < 100; i++) {
    menuStars.push({ x: Math.random()*400, y: Math.random()*600, s: Math.random()*1.6+0.2, sp: Math.random()*0.4+0.1, b: Math.random() });
  }

  // Particules flottantes décoratives
  const floatParts = [];
  for (let i = 0; i < 16; i++) {
    floatParts.push({ x: Math.random()*400, y: Math.random()*600, vx: (Math.random()-0.5)*0.4, vy: -Math.random()*0.5-0.1, r: Math.random()*3+1, hue: Math.random()*60+260, life: Math.random()*200 });
  }

  function drawBackground(ctx, W, H) {
    ctx.fillStyle = '#04000e';
    ctx.fillRect(0, 0, W, H);

    // Étoiles
    for (const s of menuStars) {
      s.y += s.sp;
      if (s.y > H) { s.y = 0; s.x = Math.random() * W; }
      const a = 0.2 + s.b * 0.8;
      ctx.fillStyle = `rgba(200,180,255,${a})`;
      ctx.fillRect(s.x, s.y, s.s, s.s);
    }

    // Particules magiques
    for (const p of floatParts) {
      p.x += p.vx; p.y += p.vy; p.life++;
      if (p.y < -10 || p.life > 300) {
        p.x = Math.random() * W; p.y = H + 10; p.life = 0;
      }
      const alpha = Math.sin(p.life / 300 * Math.PI) * 0.6;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.shadowBlur = 8;
      ctx.shadowColor = `hsl(${p.hue},100%,70%)`;
      ctx.fillStyle   = `hsl(${p.hue},100%,75%)`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Vignette
    const vig = ctx.createRadialGradient(W/2, H/2, H*0.3, W/2, H/2, H*0.85);
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(1, 'rgba(0,0,10,0.7)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, W, H);
  }

  // ── Entrées clavier ─────────────────────────

  function onKey(code, gameKeys) {
    const up    = code === 'ArrowUp'    || code === 'KeyW';
    const down  = code === 'ArrowDown'  || code === 'KeyS';
    const left  = code === 'ArrowLeft'  || code === 'KeyA';
    const right = code === 'ArrowRight' || code === 'KeyD';
    const ok    = code === 'KeyZ'       || code === 'Enter';
    const back  = code === 'Escape'     || code === 'KeyX';

    if (state.screen === 'main') {
      if (up)   state.mainCursor = (state.mainCursor - 1 + MAIN_ITEMS.length) % MAIN_ITEMS.length;
      if (down) state.mainCursor = (state.mainCursor + 1) % MAIN_ITEMS.length;
      if (ok) selectMain();
    }
    else if (state.screen === 'difficulty') {
      if (up)   state.diffCursor = (state.diffCursor - 1 + DIFF_ITEMS.length) % DIFF_ITEMS.length;
      if (down) state.diffCursor = (state.diffCursor + 1) % DIFF_ITEMS.length;
      if (ok)   selectDiff();
      if (back) state.screen = 'main';
    }
    else if (state.screen === 'options') {
      if (up)    state.optCursor = (state.optCursor - 1 + OPT_ITEMS.length) % OPT_ITEMS.length;
      if (down)  state.optCursor = (state.optCursor + 1) % OPT_ITEMS.length;
      if (ok || left || right) {
        const key = OPT_ITEMS[state.optCursor].id;
        save.options[key] = !save.options[key];
      }
      if (back) state.screen = 'main';
    }
    else if (state.screen === 'bgm') {
      const tracks = 6;
      if (up)   state.bgmCursor = (state.bgmCursor - 1 + tracks) % tracks;
      if (down) state.bgmCursor = (state.bgmCursor + 1) % tracks;
      if (back) state.screen = 'main';
    }
    else if (state.screen === 'replay') {
      if (back) state.screen = 'main';
    }
  }

  function selectMain() {
    const item = MAIN_ITEMS[state.mainCursor];
    if (item.id === 'start')   { state.screen = 'difficulty'; }
    if (item.id === 'replay')  { state.screen = 'replay'; }
    if (item.id === 'extra' && save.extraUnlocked) {
      if (state.onStart) state.onStart('extra', true);
    }
    if (item.id === 'bgm')     { state.screen = 'bgm'; }
    if (item.id === 'options') { state.screen = 'options'; }
  }

  function selectDiff() {
    const diff = DIFF_ITEMS[state.diffCursor];
    if (diff.id === 'extra' && !save.extraUnlocked) return;
    if (state.onStart) state.onStart(diff.id, diff.id === 'extra');
  }

  // ── Dessin principal ─────────────────────────

  function draw(ctx, W, H) {
    state.anim++;
    drawBackground(ctx, W, H);

    if      (state.screen === 'main')       drawMain(ctx, W, H);
    else if (state.screen === 'difficulty') drawDifficulty(ctx, W, H);
    else if (state.screen === 'options')    drawOptions(ctx, W, H);
    else if (state.screen === 'bgm')        drawBgm(ctx, W, H);
    else if (state.screen === 'replay')     drawReplay(ctx, W, H);
  }

  // ── API publique ─────────────────────────────

  function init(onStart) {
    state.screen = 'main';
    state.onStart = onStart;
  }

  function unlockExtra()      { save.extraUnlocked = true; }
  function markCleared(diff)  { save.cleared[diff] = true; }
  function setHiScore(diff, s){ if (s > save.hiScore[diff]) save.hiScore[diff] = s; }
  function getOptions()       { return save.options; }
  function getHiScore(diff)   { return save.hiScore[diff]; }
  function goMain()           { state.screen = 'main'; }

  return { init, draw, onKey, unlockExtra, markCleared, setHiScore, getHiScore, getOptions, goMain };
})();