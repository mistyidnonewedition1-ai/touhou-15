import re

with open('game.js', 'r', encoding='utf-8') as f:
    code = f.read()

# 1. Fix useBomb: autoriser seulement en playing ou bossBattle
old = "if (bombs <= 0 || gameState !== 'playing' && gameState !== 'bossBattle') return;"
new = "if (bombs <= 0 || (gameState !== 'playing' && gameState !== 'bossBattle')) return;"
code = code.replace(old, new)

# 2. Fix spawnWave: utiliser la difficulté pour la vitesse des ennemis
old = """function spawnEnemy() {
  const type = Math.random();
  enemies.push({
    x: 20 + Math.random() * (W - 40),
    y: -30,
    w: 24, h: 24,
    speed: 1.2 + Math.random() * 1.2,
    hp: type < 0.7 ? 1 : 3,
    shootTimer: Math.floor(Math.random() * 60),
    shootInterval: type < 0.7 ? 90 : 50,
    type: type < 0.7 ? 'normal' : 'heavy',
  });
}"""
new = """function spawnEnemy() {
  const type = Math.random();
  const diff = Difficulty.get();
  enemies.push({
    x: 20 + Math.random() * (W - 40),
    y: -30,
    w: 24, h: 24,
    speed: (1.2 + Math.random() * 1.2) * diff.enemySpeed,
    hp: type < 0.7 ? 1 : 3,
    shootTimer: Math.floor(Math.random() * 60),
    shootInterval: type < 0.7 ? Math.round(90 * diff.enemyFireRate) : Math.round(50 * diff.enemyFireRate),
    type: type < 0.7 ? 'normal' : 'heavy',
  });
}"""
code = code.replace(old, new)

# 3. Fix spawnTimer pour utiliser la difficulté
old = "  if (spawnTimer >= 140 - waveCount * 5) {"
new = "  const diff = Difficulty.get();\n  if (spawnTimer >= Math.max(40, diff.spawnInterval - waveCount * 5)) {"
code = code.replace(old, new)

# 4. Fix BOSS_WAVE: utiliser la difficulté
old = "const BOSS_WAVE   = 8; // boss après N vagues"
new = "let BOSS_WAVE   = 8; // boss après N vagues (mis à jour par la difficulté)"
code = code.replace(old, new)

# 5. startGame: appliquer la difficulté (vies, bombes, BOSS_WAVE)
old = """function startGame() {
  score       = 0;
  lives       = MAX_LIVES;
  bombs       = MAX_BOMBS;"""
new = """function startGame() {
  const diff  = Difficulty.get();
  BOSS_WAVE   = diff.bossWave;
  score       = 0;
  lives       = diff.playerLives;
  bombs       = diff.playerBombs;"""
code = code.replace(old, new)

# 6. Intégration du menu: remplacer l'état initial et la boucle
# gameState commence en 'menu' au lieu de 'title'
old = "let gameState = 'title'; // 'title' | 'playing' | 'bossEntry' | 'bossBattle' | 'victory' | 'gameover'"
new = "let gameState = 'menu'; // 'menu' | 'title' | 'playing' | 'bossEntry' | 'bossBattle' | 'victory' | 'gameover'"
code = code.replace(old, new)

# 7. Clavier: ajouter gestion menu
old = """document.addEventListener('keydown', e => {
  keys[e.code] = true;
  if (e.code === 'KeyX') useBomb();
  if ((e.code === 'KeyZ' || e.code === 'Space') && gameState === 'title') startGame();
  if ((e.code === 'KeyZ' || e.code === 'Space') && (gameState === 'gameover' || gameState === 'victory')) {
    setTimeout(startGame, 200);
  }
});"""
new = """document.addEventListener('keydown', e => {
  keys[e.code] = true;
  if (gameState === 'menu') {
    Menu.onKey(e.code, keys);
    return;
  }
  if (e.code === 'KeyX') useBomb();
  if ((e.code === 'Escape') && (gameState === 'playing' || gameState === 'bossEntry' || gameState === 'bossBattle')) {
    gameState = 'menu';
    Menu.goMain();
  }
  if ((e.code === 'KeyZ' || e.code === 'Space') && gameState === 'title') startGame();
  if ((e.code === 'KeyZ' || e.code === 'Space') && (gameState === 'gameover' || gameState === 'victory')) {
    gameState = 'menu';
    Menu.goMain();
  }
});"""
code = code.replace(old, new)

# 8. onBossDeath: marquer comme cleared + unlock extra
old = """function onBossDeath() {
  score += 5000;
  gameState = 'victory';
  if (score > hiScore) hiScore = score;
  hiScoreDisplay.textContent = hiScore;
  updateSidebar();
}"""
new = """function onBossDeath() {
  score += 5000;
  gameState = 'victory';
  const diff = Difficulty.get();
  if (score > hiScore) hiScore = score;
  hiScoreDisplay.textContent = hiScore;
  Menu.setHiScore(diff.label.toLowerCase(), score);
  Menu.markCleared(diff.label.toLowerCase());
  Menu.unlockExtra();
  updateSidebar();
}"""
code = code.replace(old, new)

# 9. draw(): ajouter gestion de l'état 'menu'
old = """  if (gameState === 'title') {
    drawTitle();
    return;
  }"""
new = """  if (gameState === 'menu') {
    Menu.draw(ctx, W, H);
    return;
  }

  if (gameState === 'title') {
    drawTitle();
    return;
  }"""
code = code.replace(old, new)

# 10. update(): ajouter gestion de l'état 'menu'
old = """function update() {
  if (gameState === 'playing') {"""
new = """function update() {
  if (gameState === 'menu') {
    // menu géré par Menu.draw dans draw()
    return;
  }
  if (gameState === 'playing') {"""
code = code.replace(old, new)

# 11. Init Menu au démarrage
old = "updateSidebar();\nloop();"
new = """Menu.init(function(diffId, isExtra) {
  Difficulty.set(isExtra ? 'extra' : diffId);
  startGame();
  if (isExtra) {
    Boss._forceExtra = true;
  }
});
updateSidebar();
loop();"""
code = code.replace(old, new)

with open('game.js', 'w', encoding='utf-8') as f:
    f.write(code)

print("Patched OK")
