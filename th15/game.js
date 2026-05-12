// ═══════════════════════════════════════════════
//  game.js — Boucle principale
// ═══════════════════════════════════════════════

const canvas = document.getElementById('gameCanvas');
const ctx    = canvas.getContext('2d');
const W = 400, H = 600;

// ── UI externe ──────────────────────────────────
const scoreDisplay   = document.getElementById('scoreDisplay');
const hiScoreDisplay = document.getElementById('hiScoreDisplay');
const livesDisplay   = document.getElementById('livesDisplay');
const bombsDisplay   = document.getElementById('bombsDisplay');
const grazeCounter   = document.getElementById('graze-counter');
const phaseDisplay   = document.getElementById('phaseDisplay');
const shieldDisplay  = document.getElementById('shieldDisplay');

// ── Constantes ──────────────────────────────────
const MAX_LIVES  = 3;
const MAX_BOMBS  = 3;
const BOMB_INVINCIBLE = 180;
const GRAZE_DIST = 18;
const SHIELD_MAX = 15; // ennemis à tuer pour regagner 1 vie

// ── État jeu ────────────────────────────────────
let score    = 0;
let hiScore  = 0;
let lives    = MAX_LIVES;
let bombs    = MAX_BOMBS;
let graze    = 0;
let shieldKills = 0; // compteur bouclier
let gameState = 'menu';

// ── Joueur ──────────────────────────────────────
const player = {
  x: W / 2, y: H - 80,
  w: 20, h: 20,
  speed: 4, focusSpeed: 2,
  shootCooldown: 0,
  invincible: 0,
  hitRadius: 4,
  focus: false,
  shootLevel: 1,
};

// ── Listes objets ───────────────────────────────
const bullets  = [];
const eBullets = [];
const enemies  = [];
const items    = [];

// ── Ennemis ─────────────────────────────────────
let spawnTimer    = 0;
let waveCount     = 0;
let bossTriggered = false;
let BOSS_WAVE     = 5; // mis à jour dynamiquement

// ── Étoiles ─────────────────────────────────────
const stars = [];
for (let i = 0; i < 120; i++) {
  stars.push({
    x: Math.random() * W,
    y: Math.random() * H,
    speed: 0.3 + Math.random() * 1.8,
    size: Math.random() * 1.8 + 0.3,
    brightness: Math.random(),
  });
}

// ── Clavier ─────────────────────────────────────
const keys = {};
document.addEventListener('keydown', e => {
  keys[e.code] = true;
  if (gameState === 'menu') {
    Menu.onKey(e.code, keys);
    return;
  }
  if (e.code === 'KeyX') useBomb();
  if (e.code === 'Escape' && (gameState === 'playing' || gameState === 'bossEntry' || gameState === 'bossBattle')) {
    gameState = 'menu';
    Menu.goMain();
  }
  if ((e.code === 'KeyZ' || e.code === 'Space') && gameState === 'title') startGame();
  if ((e.code === 'KeyZ' || e.code === 'Space') && (gameState === 'gameover' || gameState === 'victory')) {
    gameState = 'menu';
    Menu.goMain();
  }
});
document.addEventListener('keyup', e => keys[e.code] = false);

// ══════════════════════════════════════════════
//  INIT / RESET
// ══════════════════════════════════════════════

function startGame() {
  const diff  = Difficulty.get();
  BOSS_WAVE   = diff.bossWave;
  score       = 0;
  lives       = diff.playerLives;
  bombs       = diff.playerBombs;
  graze       = 0;
  shieldKills = 0;
  waveCount   = 0;
  bossTriggered = false;
  spawnTimer  = 0;
  bullets.length = 0;
  eBullets.length = 0;
  enemies.length  = 0;
  items.length    = 0;
  ParticleSystem.clear();
  Boss.reset();
  BOSS_WAVE = Boss.nextBossTriggerWave();
  player.x = W / 2;
  player.y = H - 80;
  player.invincible = 0;
  player.shootCooldown = 0;
  player.shootLevel = 1;
  gameState = 'playing';
  updateSidebar();
}

// ══════════════════════════════════════════════
//  GAMEPLAY
// ══════════════════════════════════════════════

function shoot() {
  const cx = player.x + player.w / 2;
  const cy = player.y;
  const lvl = player.shootLevel;

  bullets.push({ x: cx, y: cy, w: 4, h: 14, speed: 11 });

  if (lvl >= 2) {
    bullets.push({ x: cx - 10, y: cy + 6, w: 3, h: 10, speed: 10 });
    bullets.push({ x: cx + 10, y: cy + 6, w: 3, h: 10, speed: 10 });
  }

  if (lvl >= 3) {
    bullets.push({ x: cx - 18, y: cy + 14, w: 3, h: 8, speed: 9, angle: -0.12 });
    bullets.push({ x: cx + 18, y: cy + 14, w: 3, h: 8, speed: 9, angle:  0.12 });
  }
}

function useBomb() {
  if (bombs <= 0 || (gameState !== 'playing' && gameState !== 'bossBattle')) return;
  if (player.invincible > BOMB_INVINCIBLE - 10) return;
  bombs--;
  player.invincible = BOMB_INVINCIBLE;
  ParticleSystem.bombEffect(player.x + player.w / 2, player.y + player.h / 2);

  for (const b of eBullets) b.active = false;
  eBullets.length = 0;

  if (Boss.isActive()) {
    Boss.hit(120, eBullets, onPhaseChange, onBossDeath);
  }

  updateSidebar();
}

// ── Types d'ennemis ──────────────────────────────
// normal   : ennemi basique, tire vers le joueur
// heavy    : résistant, tire en éventail
// zigzag   : se déplace en zigzag, tire rarement
// bomber   : lent, explose en cercle à la mort
// sniper   : tire une balle rapide très précise

function spawnEnemy() {
  const diff = Difficulty.get();
  const roll = Math.random();

  // Probabilités selon la vague (nouveaux types apparaissent progressivement)
  let type;
  if (waveCount < 2) {
    type = 'normal';
  } else if (waveCount < 4) {
    type = roll < 0.7 ? 'normal' : 'heavy';
  } else if (waveCount < 6) {
    type = roll < 0.5 ? 'normal' : roll < 0.75 ? 'heavy' : 'zigzag';
  } else {
    if      (roll < 0.35) type = 'normal';
    else if (roll < 0.55) type = 'heavy';
    else if (roll < 0.70) type = 'zigzag';
    else if (roll < 0.85) type = 'bomber';
    else                  type = 'sniper';
  }

  const baseX = 20 + Math.random() * (W - 40);
  const baseSpeed = (0.9 + Math.random() * 0.8) * diff.enemySpeed; // UN PEU MOINS VITE qu'avant

  const configs = {
    normal:  { hp: 1, w: 22, h: 22, speed: baseSpeed,        shootInterval: Math.round(100 * diff.enemyFireRate), score: 100 },
    heavy:   { hp: 4, w: 28, h: 28, speed: baseSpeed * 0.7,  shootInterval: Math.round(60  * diff.enemyFireRate), score: 300 },
    zigzag:  { hp: 2, w: 20, h: 20, speed: baseSpeed * 1.2,  shootInterval: Math.round(120 * diff.enemyFireRate), score: 150 },
    bomber:  { hp: 3, w: 30, h: 30, speed: baseSpeed * 0.5,  shootInterval: Math.round(80  * diff.enemyFireRate), score: 250 },
    sniper:  { hp: 2, w: 18, h: 18, speed: baseSpeed * 0.8,  shootInterval: Math.round(90  * diff.enemyFireRate), score: 200 },
  };

  const cfg = configs[type];
  enemies.push({
    x: baseX,
    y: -30,
    w: cfg.w, h: cfg.h,
    speed: cfg.speed,
    hp: cfg.hp,
    maxHp: cfg.hp,
    shootTimer: Math.floor(Math.random() * 60),
    shootInterval: cfg.shootInterval,
    type,
    score: cfg.score,
    // zigzag state
    zigPhase: Math.random() * Math.PI * 2,
    zigAmp: 1.5 + Math.random() * 1.5,
  });
}

function spawnWave() {
  const count = 2 + Math.floor(waveCount / 2); // MOINS d'ennemis par vague
  for (let i = 0; i < count; i++) {
    setTimeout(() => {
      if (gameState === 'playing') spawnEnemy();
    }, i * 250);
  }
  waveCount++;

  if (waveCount === 3) { player.shootLevel = 2; }
  if (waveCount === 5) { player.shootLevel = 3; }
}

function spawnItem(x, y, type = 'score') {
  items.push({ x, y, type, vy: 1.5, life: 300 });
}

// ── Bouclier / régénération de vie ───────────────
function addShieldKill() {
  shieldKills++;
  if (shieldKills >= SHIELD_MAX) {
    shieldKills = 0;
    const maxL = Difficulty.get().playerLives;
    if (lives < maxL) {
      lives++;
      ParticleSystem.lifeRestore(player.x + player.w / 2, player.y + player.h / 2);
      updateSidebar();
    } else {
      // Si vies pleines : bombe bonus à la place
      const maxB = Difficulty.get().playerBombs;
      if (bombs < maxB) {
        bombs++;
        ParticleSystem.bombEffect(player.x + player.w / 2, player.y + 10);
        updateSidebar();
      }
    }
  }
  updateShieldDisplay();
}

function updateShieldDisplay() {
  if (!shieldDisplay) return;
  const pct = shieldKills / SHIELD_MAX;
  const segments = 15;
  let html = '';
  for (let i = 0; i < segments; i++) {
    const filled = i < shieldKills;
    html += `<span style="color:${filled ? '#44ffdd' : '#223333'};text-shadow:${filled ? '0 0 6px #00ffcc' : 'none'}">◆</span>`;
  }
  shieldDisplay.innerHTML = html;
}

// ══════════════════════════════════════════════
//  UPDATE
// ══════════════════════════════════════════════

function updatePlayer() {
  player.focus = keys['ShiftLeft'] || keys['ShiftRight'];
  const spd = player.focus ? player.focusSpeed : player.speed;

  if (keys['ArrowLeft']  || keys['KeyA']) player.x -= spd;
  if (keys['ArrowRight'] || keys['KeyD']) player.x += spd;
  if (keys['ArrowUp']    || keys['KeyW']) player.y -= spd;
  if (keys['ArrowDown']  || keys['KeyS']) player.y += spd;

  player.x = Math.max(0, Math.min(W - player.w, player.x));
  player.y = Math.max(0, Math.min(H - player.h, player.y));

  if (player.shootCooldown > 0) player.shootCooldown--;
  if ((keys['KeyZ'] || keys['Space']) && player.shootCooldown === 0) {
    shoot();
    player.shootCooldown = 7;
  }

  if (player.invincible > 0) player.invincible--;
}

function updateBullets() {
  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    b.y -= b.speed;
    if (b.angle) b.x += Math.sin(b.angle) * b.speed;
    if (b.y < -20) bullets.splice(i, 1);
  }
}

function updateEnemies() {
  spawnTimer++;
  const diff = Difficulty.get();
  if (spawnTimer >= Math.max(40, diff.spawnInterval - waveCount * 5)) {
    spawnTimer = 0;
    spawnWave();
  }

  const px = player.x + player.w / 2, py = player.y + player.h / 2;

  for (let i = enemies.length - 1; i >= 0; i--) {
    const e = enemies[i];

    // Mouvement selon le type
    if (e.type === 'zigzag') {
      e.zigPhase += 0.08;
      e.x += Math.sin(e.zigPhase) * e.zigAmp;
      e.y += e.speed;
      e.x = Math.max(10, Math.min(W - 10, e.x));
    } else {
      e.y += e.speed;
    }

    e.shootTimer++;

    if (e.shootTimer >= e.shootInterval) {
      e.shootTimer = 0;
      const opts = { playerX: px, playerY: py };

      switch (e.type) {
        case 'heavy':
          Patterns.fan(eBullets, e.x + e.w / 2, e.y + e.h / 2, { ...opts, count: 5, speed: 2.2, r: 5, color: '#ff5522', glow: '#ff3300' });
          break;
        case 'bomber':
          // Tire un cercle lent
          Patterns.circle(eBullets, e.x + e.w / 2, e.y + e.h / 2, { count: 8, speed: 1.5, r: 5, color: '#ffaa00', glow: '#ff7700' });
          break;
        case 'sniper': {
          // Balle unique ultra rapide et précise
          const dx = px - (e.x + e.w / 2), dy = py - (e.y + e.h / 2);
          const d = Math.sqrt(dx * dx + dy * dy) || 1;
          eBullets.push({ x: e.x + e.w / 2, y: e.y + e.h / 2, vx: dx / d * 5.5, vy: dy / d * 5.5, r: 3.5, color: '#ff44ff', glow: '#ff00aa', active: true });
          break;
        }
        case 'zigzag':
          // Tire en diagonales
          eBullets.push({ x: e.x + e.w / 2, y: e.y + e.h / 2, vx: -1.5, vy: 2.5, r: 4, color: '#ffdd33', glow: '#ffaa00', active: true });
          eBullets.push({ x: e.x + e.w / 2, y: e.y + e.h / 2, vx:  1.5, vy: 2.5, r: 4, color: '#ffdd33', glow: '#ffaa00', active: true });
          break;
        default: {
          // Normal : balle aimée simple
          const dx = px - (e.x + e.w / 2), dy = py - (e.y + e.h / 2);
          const d = Math.sqrt(dx * dx + dy * dy) || 1;
          eBullets.push({ x: e.x + e.w / 2, y: e.y + e.h / 2, vx: dx / d * 2.2, vy: dy / d * 2.2, r: 4.5, color: '#ffaa33', glow: '#ff8800', active: true });
        }
      }
    }

    if (e.y > H + 40) { enemies.splice(i, 1); continue; }

    // Collision balles joueur
    let hit = false;
    for (let j = bullets.length - 1; j >= 0; j--) {
      const b = bullets[j];
      if (b.x > e.x && b.x < e.x + e.w && b.y > e.y && b.y < e.y + e.h) {
        e.hp--;
        bullets.splice(j, 1);
        ParticleSystem.spawn({ x: b.x, y: b.y, color: '#ffffff', r: 2, life: 8, vx: 0, vy: -1 });

        if (e.hp <= 0) {
          // Explosion spéciale pour bomber
          if (e.type === 'bomber') {
            Patterns.circle(eBullets, e.x + e.w / 2, e.y + e.h / 2, { count: 12, speed: 2.0, r: 5, color: '#ffaa00', glow: '#ff6600' });
            ParticleSystem.enemyDeath(e.x + e.w / 2, e.y + e.h / 2, '#ff8833', 24);
          } else {
            ParticleSystem.enemyDeath(e.x + e.w / 2, e.y + e.h / 2);
          }

          if (Math.random() < 0.35) spawnItem(e.x + e.w / 2, e.y + e.h / 2, 'score');
          if (Math.random() < 0.06) spawnItem(e.x + e.w / 2, e.y + e.h / 2, 'bomb');

          score += e.score;
          addShieldKill(); // +1 vers le bouclier
          enemies.splice(i, 1);
          hit = true;
          break;
        }
      }
    }
    if (hit) continue;
  }
}

function updateBoss() {
  if (!Boss.isActive()) return;
  const px = player.x + player.w / 2, py = player.y + player.h / 2;

  Boss.updateMovement();
  Boss.fire(eBullets, px, py);

  const bs = Boss.getState();
  for (let j = bullets.length - 1; j >= 0; j--) {
    const b = bullets[j];
    const dx = b.x - bs.x, dy = b.y - bs.y;
    if (Math.sqrt(dx * dx + dy * dy) < bs.w * 0.85) {
      bullets.splice(j, 1);
      Boss.hit(5, eBullets, onPhaseChange, onBossDeath);
      score += 10;
    }
  }
}

function updateEnemyBullets() {
  Patterns.updateBullets(eBullets, W, H);

  if (player.invincible > 0) return;
  const cx = player.x + player.w / 2, cy = player.y + player.h / 2;

  for (let i = eBullets.length - 1; i >= 0; i--) {
    const b = eBullets[i];
    const dx = b.x - cx, dy = b.y - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < b.r + GRAZE_DIST && dist >= b.r + player.hitRadius) {
      graze++;
      score += 5;
      ParticleSystem.graze(b.x, b.y);
    }

    if (dist < b.r + player.hitRadius) {
      eBullets.splice(i, 1);
      takeDamage(cx, cy);
      return;
    }
  }
}

function updateItems() {
  const cx = player.x + player.w / 2, cy = player.y + player.h / 2;

  for (let i = items.length - 1; i >= 0; i--) {
    const it = items[i];
    it.y += it.vy;
    it.life--;

    const dx = cx - it.x, dy = cy - it.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 60) {
      it.x += dx * 0.15;
      it.y += dy * 0.15;
    }

    if (dist < 14) {
      if (it.type === 'score') { score += 200; ParticleSystem.spawn({ x: it.x, y: it.y, color: '#88ff88', r: 4, life: 20 }); }
      if (it.type === 'bomb' && bombs < Difficulty.get().playerBombs) { bombs++; ParticleSystem.spawn({ x: it.x, y: it.y, color: '#44ffff', r: 5, life: 25 }); updateSidebar(); }
      items.splice(i, 1);
      continue;
    }

    if (it.y > H + 20 || it.life <= 0) items.splice(i, 1);
  }
}

function takeDamage(cx, cy) {
  lives--;
  shieldKills = Math.max(0, shieldKills - 3); // pénalité bouclier
  player.invincible = 150;
  ParticleSystem.playerDeath(cx, cy);
  updateSidebar();
  updateShieldDisplay();

  if (lives <= 0) {
    gameState = 'gameover';
    if (score > hiScore) hiScore = score;
    hiScoreDisplay.textContent = hiScore;
  }
}

// ── Callbacks boss ───────────────────────────────

function onPhaseChange(phaseIdx, ph) {
  phaseDisplay.innerHTML = `<span style="color:${ph.color}">${ph.name}</span><br>${ph.nameRom}`;
}

function onBossDeath(info) {
  score += 5000;
  if (score > hiScore) hiScore = score;
  hiScoreDisplay.textContent = hiScore;

  if (info && info.isExtra) {
    // Extra boss vaincu = vraie victoire finale
    gameState = 'victory';
    const diff = Difficulty.get();
    Menu.setHiScore(diff.label.toLowerCase(), score);
    Menu.markCleared(diff.label.toLowerCase());
    updateSidebar();
    return;
  }

  if (info && info.allDefeated) {
    // Tous les boss normaux battus
    gameState = 'victory';
    const diff = Difficulty.get();
    Menu.setHiScore(diff.label.toLowerCase(), score);
    Menu.markCleared(diff.label.toLowerCase());
    Menu.unlockExtra();
    updateSidebar();
    return;
  }

  // Il reste des boss → reprendre les vagues
  bossTriggered = false;
  BOSS_WAVE = Boss.nextBossTriggerWave();
  gameState = 'playing';
  eBullets.length = 0;

  // Message interlude
  showInterlude('Boss vaincu !', '+5000 pts — Les ennemis reviennent...', 180);
  updateSidebar();
}

// ── Spawn boss ───────────────────────────────────

function triggerBoss() {
  bossTriggered = true;
  gameState = 'bossEntry';
  enemies.length = 0;
  eBullets.length = 0;
  Boss.spawn(W);
  const ph = Boss.currentPhase();
  phaseDisplay.innerHTML = `<span style="color:${ph.color}">${ph.name}</span><br>${ph.nameRom}`;
  setTimeout(() => { if (gameState === 'bossEntry') gameState = 'bossBattle'; }, 2500);
}

// Interlude entre boss
let interludeTimer = 0, interludeTitle = '', interludeSub = '';
function showInterlude(title, sub, duration) {
  interludeTitle = title; interludeSub = sub; interludeTimer = duration;
}

// ══════════════════════════════════════════════
//  DRAW
// ══════════════════════════════════════════════

function drawStars() {
  for (const s of stars) {
    s.y += s.speed;
    if (s.y > H) { s.y = 0; s.x = Math.random() * W; }
    const alpha = 0.2 + s.brightness * 0.8;
    ctx.fillStyle = `rgba(200,180,255,${alpha})`;
    ctx.fillRect(s.x, s.y, s.size, s.size);
  }
}

function drawPlayer() {
  if (player.invincible > 0 && Math.floor(player.invincible / 5) % 2 === 0) return;

  const x = player.x + player.w / 2, y = player.y + player.h / 2;
  ctx.save();
  ctx.translate(x, y);

  // Aura bouclier si bien chargé
  const shieldPct = shieldKills / SHIELD_MAX;
  if (shieldPct > 0.2) {
    ctx.globalAlpha = shieldPct * 0.5;
    ctx.strokeStyle = '#44ffdd';
    ctx.lineWidth = 2;
    ctx.shadowBlur = 14;
    ctx.shadowColor = '#00ffcc';
    ctx.beginPath();
    ctx.arc(0, 0, 20 + shieldPct * 8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  const trail = ctx.createRadialGradient(0, 10, 0, 0, 10, 12);
  trail.addColorStop(0, 'rgba(100,200,255,0.6)');
  trail.addColorStop(1, 'rgba(50,100,255,0)');
  ctx.fillStyle = trail;
  ctx.beginPath();
  ctx.ellipse(0, 14, 6, 12, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowBlur = 8;
  ctx.shadowColor = '#4499ff';
  ctx.fillStyle = '#1a66bb';
  ctx.beginPath();
  ctx.moveTo(0, -12); ctx.lineTo(-20, 10); ctx.lineTo(-8, 5); ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(0, -12); ctx.lineTo(20, 10); ctx.lineTo(8, 5); ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#55aaff';
  ctx.shadowColor = '#88ddff';
  ctx.beginPath();
  ctx.moveTo(0, -16); ctx.lineTo(-7, 9); ctx.lineTo(0, 5); ctx.lineTo(7, 9); ctx.closePath();
  ctx.fill();

  ctx.shadowBlur = 12;
  ctx.shadowColor = '#ffffff';
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(0, -5, 3.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowColor = '#88eeff';
  ctx.fillStyle = '#aaffff';
  ctx.beginPath();
  ctx.arc(0, 9, 4.5, 0, Math.PI * 2);
  ctx.fill();

  if (player.focus) {
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, 0, 16, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.shadowBlur = 8;
    ctx.shadowColor = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 0, player.hitRadius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 0, 2, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function drawPlayerBullets() {
  for (const b of bullets) {
    ctx.save();
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#88ffff';
    ctx.fillStyle = '#ccffff';
    ctx.fillRect(b.x - (b.w / 2), b.y, b.w, b.h);
    ctx.restore();
  }
}

function drawEnemy(e) {
  const cx = e.x + e.w / 2, cy = e.y + e.h / 2;
  ctx.save();
  ctx.translate(cx, cy);

  // Barre de vie pour les ennemis costauds
  if (e.maxHp > 1) {
    const bw = e.w + 4;
    ctx.fillStyle = '#220000';
    ctx.fillRect(-bw / 2, -e.h / 2 - 6, bw, 3);
    ctx.fillStyle = `hsl(${(e.hp / e.maxHp) * 120}, 100%, 55%)`;
    ctx.fillRect(-bw / 2, -e.h / 2 - 6, bw * (e.hp / e.maxHp), 3);
  }

  switch (e.type) {
    case 'heavy': {
      ctx.shadowBlur = 12; ctx.shadowColor = '#ff4400';
      ctx.fillStyle = '#aa2200';
      ctx.beginPath(); ctx.arc(0, 0, 14, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ff5533';
      ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffaaaa';
      ctx.beginPath(); ctx.arc(0, 0, 3, 0, Math.PI * 2); ctx.fill();
      // Spikes
      ctx.strokeStyle = '#ff3300'; ctx.lineWidth = 2; ctx.shadowBlur = 8;
      for (let k = 0; k < 6; k++) {
        const a = (Math.PI * 2 / 6) * k;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * 10, Math.sin(a) * 10);
        ctx.lineTo(Math.cos(a) * 16, Math.sin(a) * 16);
        ctx.stroke();
      }
      break;
    }
    case 'zigzag': {
      ctx.shadowBlur = 10; ctx.shadowColor = '#ffcc00';
      ctx.fillStyle = '#ccaa00';
      // Losange
      ctx.beginPath();
      ctx.moveTo(0, -11); ctx.lineTo(11, 0); ctx.lineTo(0, 11); ctx.lineTo(-11, 0); ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#ffee44';
      ctx.beginPath();
      ctx.moveTo(0, -6); ctx.lineTo(6, 0); ctx.lineTo(0, 6); ctx.lineTo(-6, 0); ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(0, 0, 2.5, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case 'bomber': {
      ctx.shadowBlur = 15; ctx.shadowColor = '#ff8800';
      ctx.fillStyle = '#882200';
      ctx.beginPath(); ctx.arc(0, 0, 15, 0, Math.PI * 2); ctx.fill();
      // Cercles concentriques
      ctx.strokeStyle = '#ff6600'; ctx.lineWidth = 1.5;
      for (let k = 0; k < 3; k++) {
        ctx.globalAlpha = 0.4 + k * 0.2;
        ctx.beginPath(); ctx.arc(0, 0, 6 + k * 3, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#ff9933';
      ctx.beginPath(); ctx.arc(0, 0, 6, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffcc66';
      ctx.beginPath(); ctx.arc(-2, -2, 3, 0, Math.PI * 2); ctx.fill();
      // Mèche
      ctx.strokeStyle = '#ffcc00'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(0, -15); ctx.lineTo(4, -20); ctx.stroke();
      ctx.fillStyle = '#ffff44';
      ctx.beginPath(); ctx.arc(4, -20, 3, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case 'sniper': {
      ctx.shadowBlur = 10; ctx.shadowColor = '#ff00cc';
      // Triangle fin et élancé
      ctx.fillStyle = '#660066';
      ctx.beginPath();
      ctx.moveTo(0, -14); ctx.lineTo(-7, 8); ctx.lineTo(7, 8); ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#ff44ee';
      ctx.beginPath();
      ctx.moveTo(0, -10); ctx.lineTo(-4, 6); ctx.lineTo(4, 6); ctx.closePath();
      ctx.fill();
      // Viseur
      ctx.strokeStyle = '#ff88ff'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-7, 0); ctx.lineTo(7, 0); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, -7); ctx.lineTo(0, 7); ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(0, 0, 1.5, 0, Math.PI * 2); ctx.fill();
      break;
    }
    default: { // normal
      ctx.shadowBlur = 8; ctx.shadowColor = '#ff3300';
      ctx.fillStyle = '#cc3333';
      ctx.beginPath();
      ctx.moveTo(0, 12); ctx.lineTo(-10, -8); ctx.lineTo(0, -4); ctx.lineTo(10, -8); ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#ff5555';
      ctx.beginPath();
      ctx.moveTo(-10, -8); ctx.lineTo(-18, 2); ctx.lineTo(-6, 0); ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(10, -8); ctx.lineTo(18, 2); ctx.lineTo(6, 0); ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#ffaaaa';
      ctx.beginPath(); ctx.arc(0, 0, 3, 0, Math.PI * 2); ctx.fill();
    }
  }

  ctx.restore();
}

function drawItems() {
  for (const it of items) {
    ctx.save();
    ctx.shadowBlur = 10;
    if (it.type === 'score') {
      ctx.shadowColor = '#44ff88';
      ctx.fillStyle = '#88ffaa';
      ctx.beginPath();
      ctx.arc(it.x, it.y, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(it.x - 1.5, it.y - 1.5, 2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.shadowColor = '#44ffff';
      ctx.fillStyle = '#88ffff';
      ctx.beginPath();
      ctx.moveTo(it.x, it.y - 7);
      ctx.lineTo(it.x + 6, it.y + 5);
      ctx.lineTo(it.x - 6, it.y + 5);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }
}

function drawShieldBar() {
  // Barre bouclier dessinée sur le canvas (en bas)
  const bw = 140, bh = 6;
  const bx = W / 2 - bw / 2, by = H - 12;
  const pct = shieldKills / SHIELD_MAX;

  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(bx - 1, by - 1, bw + 2, bh + 2);

  if (pct > 0) {
    const grad = ctx.createLinearGradient(bx, 0, bx + bw, 0);
    grad.addColorStop(0, '#00aacc');
    grad.addColorStop(1, '#00ffcc');
    ctx.shadowBlur = 8;
    ctx.shadowColor = '#00ffcc';
    ctx.fillStyle = grad;
    ctx.fillRect(bx, by, bw * pct, bh);
  }

  ctx.shadowBlur = 0;
  ctx.strokeStyle = '#224444';
  ctx.lineWidth = 1;
  ctx.strokeRect(bx - 1, by - 1, bw + 2, bh + 2);

  ctx.font = '8px "Share Tech Mono", monospace';
  ctx.fillStyle = pct > 0.5 ? '#44ffdd' : '#336655';
  ctx.textAlign = 'center';
  ctx.fillText('SHIELD', W / 2, by - 2);
  ctx.restore();
}

function drawBossEntry() {
  const bs = Boss.getState();
  if (!bs) return;
  ctx.save();
  ctx.fillStyle = 'rgba(255,50,200,0.08)';
  ctx.fillRect(0, 0, W, H);
  ctx.font = 'bold 18px "Noto Serif JP", serif';
  ctx.fillStyle = '#ff88ff';
  ctx.shadowBlur = 20;
  ctx.shadowColor = '#ff00ff';
  ctx.textAlign = 'center';
  ctx.fillText('⚠ BOSS APPROACH ⚠', W / 2, H / 2 - 20);
  const ph = Boss.currentPhase();
  ctx.font = '13px "Share Tech Mono", monospace';
  ctx.fillStyle = ph.color;
  ctx.fillText(ph.name, W / 2, H / 2 + 10);
  ctx.restore();
}

function drawOverlay(title, sub, color = '#ffffff') {
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.65)';
  ctx.fillRect(0, 0, W, H);

  ctx.shadowBlur = 30;
  ctx.shadowColor = color;
  ctx.fillStyle = color;
  ctx.font = 'bold 36px "Noto Serif JP", serif';
  ctx.textAlign = 'center';
  ctx.fillText(title, W / 2, H / 2 - 30);

  ctx.shadowBlur = 0;
  ctx.fillStyle = '#aaaacc';
  ctx.font = '14px "Share Tech Mono", monospace';
  ctx.fillText(sub, W / 2, H / 2 + 10);

  ctx.fillStyle = '#666688';
  ctx.font = '11px "Share Tech Mono", monospace';
  ctx.fillText('Z / SPACE pour recommencer', W / 2, H / 2 + 40);
  ctx.restore();
}

function drawTitle() {
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(0, 0, W, H);

  ctx.shadowBlur = 40;
  ctx.shadowColor = '#aa44ff';
  ctx.fillStyle = '#cc88ff';
  ctx.font = 'bold 28px "Noto Serif JP", serif';
  ctx.textAlign = 'center';
  ctx.fillText('東方幻想郷', W / 2, H / 2 - 60);

  ctx.shadowBlur = 10;
  ctx.fillStyle = '#ffffff';
  ctx.font = '20px "Share Tech Mono", monospace';
  ctx.fillText('BULLET HELL', W / 2, H / 2 - 25);

  ctx.shadowBlur = 0;
  ctx.fillStyle = '#8877aa';
  ctx.font = '11px "Share Tech Mono", monospace';
  ctx.fillText('Z / ESPACE pour commencer', W / 2, H / 2 + 20);
  ctx.fillText('SHIFT = focus   X = bombe', W / 2, H / 2 + 40);

  ctx.restore();
}

// ══════════════════════════════════════════════
//  SIDEBAR
// ══════════════════════════════════════════════

function updateSidebar() {
  scoreDisplay.textContent = score.toLocaleString();
  livesDisplay.innerHTML  = '♥'.repeat(Math.max(0, lives));
  bombsDisplay.innerHTML  = '◈'.repeat(Math.max(0, bombs));
  grazeCounter.textContent = graze;
}

// ══════════════════════════════════════════════
//  MAIN LOOP
// ══════════════════════════════════════════════

function update() {
  if (gameState === 'menu') return;
  if (gameState === 'playing') {
    updatePlayer();
    updateBullets();
    updateEnemies();
    updateEnemyBullets();
    updateItems();

    if (!bossTriggered && waveCount >= BOSS_WAVE && enemies.length === 0) {
      triggerBoss();
    }
  } else if (gameState === 'bossBattle') {
    updatePlayer();
    updateBullets();
    updateBoss();
    updateEnemyBullets();
    updateItems();
  } else if (gameState === 'bossEntry') {
    updatePlayer();
    Boss.updateMovement();
  }

  if (gameState === 'playing' || gameState === 'bossBattle') {
    scoreDisplay.textContent = score.toLocaleString();
    grazeCounter.textContent = graze;
  }
}

function draw() {
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#05000f';
  ctx.fillRect(0, 0, W, H);

  drawStars();

  if (gameState === 'menu') {
    Menu.draw(ctx, W, H);
    return;
  }

  if (gameState === 'title') {
    drawTitle();
    return;
  }

  drawItems();
  drawPlayerBullets();
  for (const e of enemies) drawEnemy(e);
  Patterns.drawBullets(ctx, eBullets);
  Boss.draw(ctx);
  ParticleSystem.update(ctx, W, H);
  drawPlayer();
  drawShieldBar();

  if (gameState === 'bossEntry') drawBossEntry();
  // Interlude entre boss
  if (interludeTimer > 0) {
    interludeTimer--;
    const a = Math.min(1, interludeTimer/20) * Math.min(1, (interludeTimer)/15);
    ctx.save(); ctx.globalAlpha = a * 0.85;
    ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(0, H/2-50, W, 100);
    ctx.globalAlpha = a;
    ctx.shadowBlur = 20; ctx.shadowColor = '#44ffaa'; ctx.fillStyle = '#88ffcc';
    ctx.font = 'bold 22px "Noto Serif JP",serif'; ctx.textAlign = 'center';
    ctx.fillText(interludeTitle, W/2, H/2 - 10);
    ctx.shadowBlur = 0; ctx.fillStyle = '#aaccaa'; ctx.font = '11px "Share Tech Mono",monospace';
    ctx.fillText(interludeSub, W/2, H/2 + 16);
    ctx.restore();
  }

  if (gameState === 'gameover') drawOverlay('GAME OVER', `SCORE: ${score.toLocaleString()}`, '#ff4466');
  if (gameState === 'victory')  drawOverlay('CLEARED!', `SCORE: ${score.toLocaleString()}`, '#ffdd44');
}

function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

Menu.init(function(diffId, isExtra) {
  Difficulty.set(isExtra ? 'extra' : diffId);
  startGame();
});

updateSidebar();
updateShieldDisplay();
loop();