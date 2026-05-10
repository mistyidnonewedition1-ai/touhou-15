// ═══════════════════════════════════════════════
//  difficulty.js — Paramètres par difficulté
// ═══════════════════════════════════════════════

const Difficulty = (() => {

  const SETTINGS = {
    easy: {
      label:          'EASY',
      color:          '#88ff88',
      enemySpeed:     0.7,
      enemyFireRate:  1.5,      // multiplicateur (plus haut = tir plus rare)
      bulletSpeed:    0.7,
      bulletCount:    0.6,      // multiplicateur du nombre de balles
      playerBombs:    5,
      playerLives:    5,
      bossHpMult:     0.6,
      spawnInterval:  200,
      bossWave:       6,
      scoreMultiplier:0.5,
      graze:          false,
    },
    normal: {
      label:          'NORMAL',
      color:          '#ffee44',
      enemySpeed:     1.0,
      enemyFireRate:  1.0,
      bulletSpeed:    1.0,
      bulletCount:    1.0,
      playerBombs:    3,
      playerLives:    3,
      bossHpMult:     1.0,
      spawnInterval:  140,
      bossWave:       8,
      scoreMultiplier:1.0,
      graze:          true,
    },
    hard: {
      label:          'HARD',
      color:          '#ff8844',
      enemySpeed:     1.4,
      enemyFireRate:  0.65,
      bulletSpeed:    1.35,
      bulletCount:    1.5,
      playerBombs:    3,
      playerLives:    3,
      bossHpMult:     1.3,
      spawnInterval:  110,
      bossWave:       10,
      scoreMultiplier:1.5,
      graze:          true,
    },
    lunatic: {
      label:          'LUNATIC',
      color:          '#ff4466',
      enemySpeed:     2.0,
      enemyFireRate:  0.4,
      bulletSpeed:    1.8,
      bulletCount:    2.2,
      playerBombs:    2,
      playerLives:    2,
      bossHpMult:     1.6,
      spawnInterval:  80,
      bossWave:       12,
      scoreMultiplier:3.0,
      graze:          true,
    },
    extra: {
      label:          'EXTRA',
      color:          '#cc44ff',
      enemySpeed:     2.5,
      enemyFireRate:  0.3,
      bulletSpeed:    2.2,
      bulletCount:    3.0,
      playerBombs:    1,
      playerLives:    2,
      bossHpMult:     2.5,
      spawnInterval:  60,
      bossWave:       6,
      scoreMultiplier:5.0,
      graze:          true,
    },
  };

  let current = SETTINGS.normal;

  function set(id) {
    current = SETTINGS[id] || SETTINGS.normal;
    return current;
  }

  function get() { return current; }

  function scaledBulletCount(base) {
    return Math.max(1, Math.round(base * current.bulletCount));
  }

  function scaledSpeed(base) {
    return base * current.bulletSpeed;
  }

  function scaledFireRate(base) {
    return Math.round(base * current.enemyFireRate);
  }

  return { set, get, scaledBulletCount, scaledSpeed, scaledFireRate, SETTINGS };
})();