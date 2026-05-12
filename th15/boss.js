// ═══════════════════════════════════════════════
//  boss.js — Multi-boss + sprite sheet
// ═══════════════════════════════════════════════

const Boss = (() => {

  // ── Sprite sheet ────────────────────────────
  const sheet = new Image();
  sheet.src = 'sprites/boss_sheet.jpg'; // ← CORRIGÉ : .jpg pas .png
  let sheetReady = false;
  sheet.onload  = () => { sheetReady = true; };
  sheet.onerror = () => { sheetReady = false; };

  const ZONES = {
    pose1:     { sx: 0,   sy: 0,   sw: 430, sh: 620 },
    pose2:     { sx: 430, sy: 0,   sw: 490, sh: 620 },
    portrait:  { sx: 920, sy: 0,   sw: 310, sh: 320 },
    portAngry: { sx: 920, sy: 320, sw: 310, sh: 300 },
    buste: [
      { sx: 0,    sy: 620, sw: 310, sh: 404 },
      { sx: 310,  sy: 620, sw: 310, sh: 404 },
      { sx: 620,  sy: 620, sw: 310, sh: 404 },
      { sx: 930,  sy: 620, sw: 310, sh: 404 },
      { sx: 1240, sy: 620, sw: 296, sh: 404 },
    ],
  };

  // ════════════════════════════════════════════
  //  DÉFINITION DES BOSS (étages)
  // ════════════════════════════════════════════

  const BOSS_ROSTER = [
    {
      id: 'frost',
      name: '氷の番人',
      nameRom: 'Gardienne des Glaces',
      triggerWave: 5,
      color: '#88ccff',
      glowColor: '#4499ff',
      useSprite: true,
      // ← Dialogues d'intro et de victoire
      introDialogue: 'Tu oses défier la Gardienne des Glaces ? Prépare-toi à geler pour l\'éternité !',
      deathDialogue: 'Im... impossible... Ma glace éternelle... brisée...',
      phases: [
        { name: '「氷結の序曲」', nameRom: 'Ouverture Glaciale', hp: 350, color: '#88ccff', glowColor: '#4499ff', isSpellCard: false, pattern: 'frost1',    fireRate: 90, busteIdx: 0,
          phaseDialogue: null },
        { name: '「霜の踊り子」', nameRom: 'Danseuse de Givre',  hp: 300, color: '#aaddff', glowColor: '#66aaff', isSpellCard: true,  pattern: 'frostSC',   fireRate: 1,  busteIdx: 1,
          phaseDialogue: 'Voici ma vraie puissance... Danse avec les cristaux de givre !' },
        { name: '「永久凍土」',   nameRom: 'Permafrost Éternel', hp: 380, color: '#ffffff', glowColor: '#aaccff', isSpellCard: true,  pattern: 'frostFinal',fireRate: 1,  busteIdx: 2,
          phaseDialogue: 'Je vais t\'engloutir dans un froid sans fin !' },
      ],
    },
    {
      id: 'lunar',
      name: '月の亡霊',
      nameRom: 'Spectre Lunaire',
      triggerWave: 11,
      color: '#cc88ff',
      glowColor: '#9933ff',
      useSprite: false,
      introDialogue: 'Ah... un visiteur sous la lune. Je vais t\'offrir un rêve dont tu ne te réveilleras jamais.',
      deathDialogue: 'La lune... elle se détourne de moi...',
      phases: [
        { name: '「月光の幻影」', nameRom: 'Illusion Lunaire',   hp: 500, color: '#cc88ff', glowColor: '#9933ff', isSpellCard: false, pattern: 'lunar1',    fireRate: 75, busteIdx: 3,
          phaseDialogue: null },
        { name: '「幻想の渦」',   nameRom: 'Vortex Fantôme',     hp: 450, color: '#ff88ff', glowColor: '#cc00ff', isSpellCard: true,  pattern: 'lunarSC',   fireRate: 1,  busteIdx: 4,
          phaseDialogue: 'Mes illusions vont t\'engloutir !' },
        { name: '「月蝕の境界」', nameRom: 'Frontière Éclipsée', hp: 520, color: '#ffaaff', glowColor: '#ff44ff', isSpellCard: true,  pattern: 'lunarFinal',fireRate: 1,  busteIdx: 0,
          phaseDialogue: 'La frontière entre rêve et réalité... disparaît !' },
      ],
    },
    {
      id: 'queen',
      name: '永遠雪姫',
      nameRom: 'Reine des Neiges Éternelles',
      triggerWave: 18,
      color: '#44eeff',
      glowColor: '#00ccff',
      useSprite: true,
      introDialogue: 'Petite créature... tu as survécu jusqu\'ici. C\'est admirable. Mais ton voyage s\'arrête là.',
      deathDialogue: 'Tu es... vraiment fort. Peut-être que ce monde a encore besoin de toi...',
      phases: [
        { name: '「紅の序章」',   nameRom: 'Prélude Écarlate',     hp: 500, color: '#88ccff', glowColor: '#4499ff', isSpellCard: false, pattern: 'phase1',     fireRate: 80, busteIdx: 0,
          phaseDialogue: null },
        { name: '「螺旋の夢」',   nameRom: 'Rêve Spiral',           hp: 420, color: '#ff44ff', glowColor: '#cc00ff', isSpellCard: true,  pattern: 'spellcard1', fireRate: 1,  busteIdx: 1,
          phaseDialogue: 'Laisse-toi emporter par la spirale du rêve éternel !' },
        { name: '「蒼天の怒り」', nameRom: 'Courroux du Ciel Azur', hp: 580, color: '#4488ff', glowColor: '#0044ff', isSpellCard: false, pattern: 'phase2',     fireRate: 65, busteIdx: 2,
          phaseDialogue: 'Le ciel lui-même va te punir de ton audace !' },
        { name: '「永遠と瞬間」', nameRom: 'Éternité et Instant',   hp: 650, color: '#ffdd44', glowColor: '#ffaa00', isSpellCard: true,  pattern: 'spellcard2', fireRate: 1,  busteIdx: 3,
          phaseDialogue: 'Le temps s\'arrête... et toi avec lui !' },
        { name: '「最後の境界」', nameRom: 'Dernière Frontière',    hp: 400, color: '#ffffff', glowColor: '#aaaaff', isSpellCard: true,  pattern: 'final',      fireRate: 1,  busteIdx: 4,
          phaseDialogue: 'Ma dernière carte... Le destin lui-même combat à mes côtés !' },
      ],
    },
    {
      id: 'extra',
      name: '混沌の女神',
      nameRom: 'Déesse du Chaos',
      triggerWave: 9999,
      color: '#ff44ff',
      glowColor: '#cc00aa',
      useSprite: false,
      isExtra: true,
      introDialogue: 'Tu as vaincu mes servantes... Impressionnant. Mais moi, je suis le chaos lui-même.',
      deathDialogue: '...Le chaos ne peut être vaincu. Il reviendra. Toujours.',
      phases: [
        { name: '「虚無の扉」',   nameRom: 'Portail du Néant',            hp: 700, color: '#aa44ff', glowColor: '#7700cc', isSpellCard: false, pattern: 'extra1',     fireRate: 60, busteIdx: 0,
          phaseDialogue: null },
        { name: '「混沌の螺旋」', nameRom: 'Spirale du Chaos',            hp: 650, color: '#ff00ff', glowColor: '#cc00aa', isSpellCard: true,  pattern: 'extraSC1',   fireRate: 1,  busteIdx: 2,
          phaseDialogue: 'La spirale du chaos va tout dévorer !' },
        { name: '「無限の壁」',   nameRom: "Mur de l'Infini",             hp: 800, color: '#00ffff', glowColor: '#0099cc', isSpellCard: false, pattern: 'extra2',     fireRate: 50, busteIdx: 1,
          phaseDialogue: 'Tu ne peux pas franchir l\'infini !' },
        { name: '「破滅の閃光」', nameRom: 'Éclair de Destruction',       hp: 700, color: '#ffff00', glowColor: '#ffaa00', isSpellCard: true,  pattern: 'extraSC2',   fireRate: 1,  busteIdx: 3,
          phaseDialogue: 'La lumière de la destruction efface tout !' },
        { name: '「神命・終焉」', nameRom: 'Décret Divin · Fin du Monde', hp: 900, color: '#ff4400', glowColor: '#ff0000', isSpellCard: true,  pattern: 'extraFinal', fireRate: 1,  busteIdx: 4,
          phaseDialogue: 'C\'est la fin de tout. Le décret divin est prononcé !' },
      ],
    },
  ];

  let state        = null;
  let defeatedList = [];

  // ── Dialogue d'intro/phase/mort ─────────────
  // Retourne { text, bossName, color, busteIdx, onDone }
  // onDone est appelé quand le dialogue se termine
  let pendingDialogue = null; // { text, color, busteIdx, bossName, nameRom, timer, onDone }

  function triggerDialogue(text, color, busteIdx, bossName, nameRom, duration, onDone) {
    pendingDialogue = { text, color, busteIdx, bossName, nameRom, timer: duration, onDone };
  }

  function hasDialogue()  { return !!pendingDialogue; }
  function getDialogue()  { return pendingDialogue; }

  function tickDialogue() {
    if (!pendingDialogue) return;
    pendingDialogue.timer--;
    if (pendingDialogue.timer <= 0) {
      const cb = pendingDialogue.onDone;
      pendingDialogue = null;
      if (cb) cb();
    }
  }

  function skipDialogue() {
    if (!pendingDialogue) return;
    const cb = pendingDialogue.onDone;
    pendingDialogue = null;
    if (cb) cb();
  }

  function nextBossTriggerWave() {
    for (const b of BOSS_ROSTER.filter(b => !b.isExtra))
      if (!defeatedList.includes(b.id)) return b.triggerWave;
    return 9999;
  }

  function spawnNext(W, forceExtra = false) {
    const def = forceExtra
      ? BOSS_ROSTER.find(b => b.isExtra)
      : BOSS_ROSTER.filter(b => !b.isExtra).find(b => !defeatedList.includes(b.id));
    if (!def) return null;
    const diff   = Difficulty.get();
    const hpMult = def.isExtra ? diff.bossHpMult * 1.3 : diff.bossHpMult;
    const phases = def.phases.map(p => ({ ...p, hp: Math.round(p.hp*hpMult), maxHp: Math.round(p.hp*hpMult) }));
    state = {
      x: W/2, y: 130, w: 72, h: 72,
      targetX: W/2, targetY: 130,
      moveTimer: 0, moveInterval: 120,
      phase: 0, phases,
      frameCounter: 0, spiralAngle: 0,
      alive: true, W,
      auraAngle: 0, shieldPulse: 0,
      isExtra: !!def.isExtra,
      hitFlash: 0, ringAngle: 0,
      poseTimer: 0, currentPose: 'pose1', poseFlip: false,
      defColor: def.color, defGlow: def.glowColor,
      useSprite: def.useSprite,
      bossId: def.id, bossName: def.name, bossNameRom: def.nameRom,
      introDef: def, // pour les dialogues
    };
    return state;
  }

  function spawn(W, isExtra = false) { return spawnNext(W, isExtra); }

  // Déclenche le dialogue d'intro (appelé depuis game.js après bossEntry)
  function triggerIntroDialogue(onDone) {
    if (!state) { if (onDone) onDone(); return; }
    const def = state.introDef;
    const ph  = state.phases[0];
    triggerDialogue(
      def.introDialogue || '...Je vais te montrer ma puissance !',
      def.color, ph.busteIdx,
      def.name, def.nameRom,
      220, onDone
    );
  }

  function currentPhase()      { return state ? state.phases[state.phase] : null; }
  function isActive()          { return !!state && state.alive; }
  function getState()          { return state; }
  function reset()             { state = null; defeatedList = []; pendingDialogue = null; }
  function isDead()            { return !state || !state.alive; }
  function allNormalDefeated() { return BOSS_ROSTER.filter(b=>!b.isExtra).every(b=>defeatedList.includes(b.id)); }

  function updateMovement() {
    if (!state || !state.alive) return;
    const ph = currentPhase();
    state.moveTimer++;
    if (state.moveTimer >= (ph.isSpellCard ? state.moveInterval*.6 : state.moveInterval)) {
      state.targetX      = 55 + Math.random()*(state.W-110);
      state.targetY      = 55 + Math.random()*(ph.isSpellCard ? 160 : 130);
      state.moveTimer    = 0;
      state.moveInterval = (ph.isSpellCard?70:100)+Math.random()*60;
      state.poseFlip     = state.targetX < state.x;
    }
    const spd = (ph.isSpellCard?2.8:1.8)*(state.isExtra?1.3:1);
    state.x += (state.targetX-state.x)*.03*spd;
    state.y += (state.targetY-state.y)*.03*spd;
    state.auraAngle   += state.isExtra?.035:.02;
    state.shieldPulse += .05;
    state.ringAngle   += .015;
    if (state.hitFlash>0) state.hitFlash--;
    state.poseTimer++;
    state.currentPose = (ph.isSpellCard && Math.floor(state.poseTimer/30)%2===1) ? 'pose2' : 'pose1';
  }

  // ── Helpers patterns ────────────────────────
  const mkB = (x,y,vx,vy,r,color,glow) => ({x,y,vx,vy,r,color,glow,active:true});

  function fireRosePattern(eb,x,y,petals,speed,r,color,glow,ao) {
    for(let i=0;i<petals*12;i++){const t=i/(petals*12)*Math.PI*2,rho=Math.cos(petals*t);if(rho<0)continue;eb.push(mkB(x,y,Math.cos(t+ao)*rho*speed,Math.sin(t+ao)*rho*speed,r,color,glow));}
  }
  function firePentagram(eb,x,y,speed,r,color,glow,offset){
    for(let i=0;i<5;i++){const a1=(Math.PI*2/5)*i+offset,a2=(Math.PI*2/5)*((i+2)%5)+offset;for(let s=0;s<=8;s++){const t=s/8,cx2=Math.cos(a1)*30*(1-t)+Math.cos(a2)*30*t,cy2=Math.sin(a1)*30*(1-t)+Math.sin(a2)*30*t,d=Math.sqrt(cx2*cx2+cy2*cy2)||1;eb.push(mkB(x+cx2*.3,y+cy2*.3,cx2/d*speed,cy2/d*speed,r,color,glow));}}
  }
  function fireButterfly(eb,x,y,angle,speed,r,color,glow){
    for(let i=0;i<20;i++){const t=i/20*Math.PI*2+angle,rho=Math.exp(Math.sin(t))-2*Math.cos(4*t)+Math.pow(Math.sin((2*t-Math.PI)/24),5),c=Math.min(Math.abs(rho)*.4,2.5);eb.push(mkB(x,y,Math.cos(t)*c*speed,Math.sin(t)*c*speed,r,color,glow));}
  }
  function fireGalaxy(eb,x,y,arms,speed,r,color,glow,angle){
    for(let a=0;a<arms;a++){const ao=(Math.PI*2/arms)*a+angle;for(let s=1;s<=6;s++){const theta=ao+s*.35;eb.push(mkB(x+Math.cos(theta)*s*.8,y+Math.sin(theta)*s*.8,Math.cos(theta)*speed*(.5+s*.08),Math.sin(theta)*speed*(.5+s*.08),r,color,glow));}}
  }
  function fireLace(eb,x,y,speed,r,color,glow,offset){
    for(let ring=0;ring<3;ring++){const rs=speed*(.7+ring*.2),off=offset+ring*(Math.PI/10);for(let i=0;i<10;i++){const a=(Math.PI*2/10)*i+off;eb.push(mkB(x,y,Math.cos(a)*rs,Math.sin(a)*rs,r-ring*.5,color,glow));}}
  }

  // ── Fire ────────────────────────────────────
  function fire(eb, playerX, playerY) {
    if (!state||!state.alive) return;
    const ph=currentPhase(), diff=Difficulty.get();
    state.frameCounter++;
    const fc=state.frameCounter, bx=state.x, by=state.y, opts={playerX,playerY};
    const spd=s=>s*diff.bulletSpeed, cnt=n=>Difficulty.scaledBulletCount(n), rate=r=>Math.max(1,Math.round(r*diff.enemyFireRate));
    const aimVec=s=>{const dx=playerX-bx,dy=playerY-by,d=Math.sqrt(dx*dx+dy*dy)||1;return{vx:dx/d*s,vy:dy/d*s};};

    switch(ph.pattern){
      case 'frost1':
        if(fc%rate(ph.fireRate)===0) Patterns.fan(eb,bx,by,{...opts,count:cnt(5),speed:spd(2.0),spread:1.0,r:5,color:'#88ccff',glow:'#4499ff'});
        if(fc%rate(ph.fireRate*2)===0) Patterns.circle(eb,bx,by,{count:cnt(10),speed:spd(1.5),r:4,color:'#aaddff',glow:'#6699ff'});
        break;
      case 'frostSC':
        state.spiralAngle+=.07;
        if(fc%Math.max(1,Math.round(3/diff.bulletCount))===0) Patterns.dualSpiral(eb,bx,by,{speed:spd(2.4),r:4.5,angle:state.spiralAngle,color:'#cceeff',glow:'#88aaff'});
        if(fc%90===0) fireRosePattern(eb,bx,by,4,spd(1.8),4,'#aaddff','#4488ff',state.spiralAngle);
        break;
      case 'frostFinal':
        state.spiralAngle+=.05;
        if(fc%Math.max(1,Math.round(2/diff.bulletCount))===0) Patterns.spiral(eb,bx,by,{speed:spd(2.2),r:3.5,color:'#ffffff',glow:'#aaccff',angle:state.spiralAngle,arms:cnt(5)});
        if(fc%35===0) Patterns.fan(eb,bx,by,{...opts,count:cnt(6),speed:spd(2.8),spread:.6,color:'#cceeff',glow:'#4488ff',r:4});
        if(fc%80===0) Patterns.circle(eb,bx,by,{count:cnt(20),speed:spd(1.6),color:'#eef8ff',glow:'#88bbff',r:3.5});
        break;
      case 'lunar1':
        state.spiralAngle+=.04;
        if(fc%rate(ph.fireRate)===0) fireGalaxy(eb,bx,by,cnt(4),spd(2.6),4.5,'#cc88ff','#9933ff',state.spiralAngle);
        if(fc%rate(ph.fireRate+30)===0) Patterns.wave(eb,bx,by,{...opts,count:cnt(6),speed:spd(2.3),color:'#dd88ff',glow:'#aa44ff'});
        if(fc%110===0) Patterns.ring(eb,bx,by,{count:cnt(14),speed:spd(1.8),gap:2,offset:state.spiralAngle,color:'#ffaaff',glow:'#cc44ff'});
        break;
      case 'lunarSC':
        state.spiralAngle+=.09;
        if(fc%Math.max(1,Math.round(3/diff.bulletCount))===0){Patterns.spiral(eb,bx,by,{speed:spd(2.6),r:4,color:'#ff88ff',glow:'#cc00ff',angle:state.spiralAngle,arms:cnt(4)});Patterns.spiral(eb,bx,by,{speed:spd(1.8),r:3,color:'#ffffff',glow:'#ffaaff',angle:-state.spiralAngle*.7,arms:cnt(3)});}
        if(fc%65===0) fireLace(eb,bx,by,spd(2.0),4,'#ff44ff','#cc00ff',state.spiralAngle);
        break;
      case 'lunarFinal':
        state.spiralAngle+=.06;
        if(fc%Math.max(1,Math.round(2/diff.bulletCount))===0) Patterns.spiral(eb,bx,by,{speed:spd(2.5),r:3.5,color:'#ffccff',glow:'#ff88ff',angle:state.spiralAngle,arms:cnt(6)});
        if(fc%30===0) fireButterfly(eb,bx,by,state.spiralAngle,spd(2.2),4,'#ffaaff','#ff44ff');
        if(fc%22===0) Patterns.fan(eb,bx,by,{...opts,count:cnt(7),speed:spd(3.0),spread:.7,color:'#ffccff',glow:'#cc44ff',r:4});
        if(fc%75===0) firePentagram(eb,bx,by,spd(2.0),4,'#ffffff','#ffaaff',state.spiralAngle);
        break;
      case 'phase1':
        if(fc%rate(ph.fireRate)===0) Patterns.fan(eb,bx,by,{...opts,count:cnt(6),speed:spd(2.2),spread:1.1,r:5,color:'#88ccff',glow:'#4499ff'});
        if(fc%rate(ph.fireRate*1.5)===0) for(let k=0;k<2;k++) setTimeout(()=>{if(state&&state.alive)Patterns.circle(eb,bx,by,{count:cnt(10),speed:spd(1.6+k*.3),r:4.5,color:'#aaddff',glow:'#4488ff',offset:k*(Math.PI/10)});},k*200);
        if(fc%rate(ph.fireRate*3)===0){const{vx,vy}=aimVec(spd(5));for(let i=0;i<12;i++)setTimeout(()=>{if(state&&state.alive)eb.push(mkB(bx,by,vx+(Math.random()-.5)*.3,vy+(Math.random()-.5)*.3,3.5,'#cceeff','#4488ff'));},i*30);}
        break;
      case 'spellcard1':
        state.spiralAngle+=.08;
        if(fc%Math.max(1,Math.round(3/diff.bulletCount))===0) Patterns.dualSpiral(eb,bx,by,{speed:spd(2.6),r:4.5,angle:state.spiralAngle,color:'#88aaff',glow:'#4466ff'});
        if(fc%80===0) fireRosePattern(eb,bx,by,4,spd(2.0),4,'#aaccff','#4488ff',state.spiralAngle);
        if(fc%150===0) Patterns.circle(eb,bx,by,{count:cnt(20),speed:spd(2.0),r:3.5,color:'#cceeff',glow:'#6699ff',offset:state.spiralAngle});
        break;
      case 'phase2':
        state.spiralAngle+=.04;
        if(fc%rate(ph.fireRate)===0) fireGalaxy(eb,bx,by,cnt(4),spd(2.8),4.5,'#44aaff','#0066ff',state.spiralAngle);
        if(fc%rate(ph.fireRate+25)===0) Patterns.wave(eb,bx,by,{...opts,count:cnt(7),speed:spd(2.5),color:'#66ccff',glow:'#0099ff'});
        if(fc%100===0){Patterns.ring(eb,bx,by,{count:cnt(16),speed:spd(2.0),gap:2,offset:state.spiralAngle,color:'#aaddff',glow:'#4499ff'});state.spiralAngle+=.5;}
        break;
      case 'spellcard2':
        state.spiralAngle+=.09;
        if(fc%Math.max(1,Math.round(4/diff.bulletCount))===0) Patterns.spiral(eb,bx,by,{speed:spd(2.8),r:4,color:'#88ccff',glow:'#4488ff',angle:state.spiralAngle,arms:cnt(4)});
        if(fc%70===0) firePentagram(eb,bx,by,spd(2.2),4,'#aaddff','#6699ff',state.spiralAngle);
        if(fc%120===0) fireLace(eb,bx,by,spd(2.0),4,'#cceeff','#4488ff',state.spiralAngle);
        if(fc%90===0){const{vx,vy}=aimVec(spd(5));for(let i=0;i<15;i++)setTimeout(()=>{if(state&&state.alive)eb.push(mkB(bx,by,vx,vy,3.5,'#ffffff','#aaccff'));},i*25);}
        break;
      case 'final':
        state.spiralAngle+=.06;
        if(fc%Math.max(1,Math.round(2/diff.bulletCount))===0) Patterns.spiral(eb,bx,by,{speed:spd(2.3),r:3.5,color:'#ffffff',glow:'#aaccff',angle:state.spiralAngle,arms:cnt(5)});
        if(fc%40===0) fireButterfly(eb,bx,by,state.spiralAngle,spd(2.0),4,'#cceeff','#88aaff');
        if(fc%25===0) Patterns.fan(eb,bx,by,{...opts,count:cnt(7),speed:spd(3.0),spread:.65,color:'#aaddff',glow:'#4488ff',r:4});
        if(fc%70===0) Patterns.circle(eb,bx,by,{count:cnt(24),speed:spd(1.8),color:'#eef8ff',glow:'#88bbff',r:3.5});
        break;
      case 'extra1':
        state.spiralAngle+=.05;
        if(fc%rate(ph.fireRate)===0){fireGalaxy(eb,bx,by,cnt(6),spd(3.0),5,'#aa44ff','#7700cc',state.spiralAngle);Patterns.fan(eb,bx,by,{...opts,count:cnt(8),speed:spd(3.2),spread:1.0,color:'#dd88ff',glow:'#aa00ff',r:4});}
        if(fc%35===0) fireRosePattern(eb,bx,by,3,spd(2.5),4.5,'#cc66ff','#9900ff',state.spiralAngle*2);
        break;
      case 'extraSC1':
        state.spiralAngle+=.13;
        if(fc%Math.max(1,Math.round(2/diff.bulletCount))===0){Patterns.spiral(eb,bx,by,{speed:spd(3.2),r:4,color:'#ff00ff',glow:'#cc00aa',angle:state.spiralAngle,arms:cnt(6)});Patterns.spiral(eb,bx,by,{speed:spd(2.2),r:3,color:'#ffffff',glow:'#ffaaff',angle:-state.spiralAngle*.8,arms:cnt(4)});}
        if(fc%55===0) fireLace(eb,bx,by,spd(2.2),4,'#ff44ff','#ff00ff',state.spiralAngle);
        if(fc%90===0) Patterns.circle(eb,bx,by,{count:cnt(28),speed:spd(1.8),color:'#ff44ff',glow:'#ff00ff',r:3.5});
        break;
      case 'extra2':
        state.spiralAngle+=.06;
        if(fc%rate(ph.fireRate)===0){Patterns.wave(eb,bx,by,{...opts,count:cnt(9),speed:spd(3.5),color:'#00ffff',glow:'#0099cc'});fireGalaxy(eb,bx,by,cnt(5),spd(2.8),5,'#44ddff','#0099ff',state.spiralAngle);}
        if(fc%rate(60)===0){Patterns.laser(eb,bx,by,{...opts,color:'#00ffff',glow:'#00aaff',r:5,count:22,speed:spd(6.5)});state.spiralAngle+=.4;}
        if(fc%120===0) firePentagram(eb,bx,by,spd(2.5),4.5,'#aaffff','#00ddff',state.spiralAngle);
        break;
      case 'extraSC2':
        state.spiralAngle+=.09;
        if(fc%Math.max(1,Math.round(3/diff.bulletCount))===0) Patterns.spiral(eb,bx,by,{speed:spd(3.8),r:4.5,color:'#ffff00',glow:'#ffaa00',angle:state.spiralAngle,arms:cnt(8)});
        if(fc%40===0) fireButterfly(eb,bx,by,state.spiralAngle,spd(3.0),4.5,'#ffee44','#ffaa00');
        if(fc%50===0) Patterns.fan(eb,bx,by,{...opts,count:cnt(11),speed:spd(4.0),spread:2.2,color:'#ffee44',glow:'#ffaa00',r:4});
        if(fc%100===0) fireLace(eb,bx,by,spd(2.5),4,'#ffff88','#ffdd00',state.spiralAngle);
        break;
      case 'extraFinal':
        state.spiralAngle+=.07;
        if(fc%Math.max(1,Math.round(1/diff.bulletCount))===0) Patterns.spiral(eb,bx,by,{speed:spd(3.2),r:4,color:'#ff4400',glow:'#ff0000',angle:state.spiralAngle,arms:cnt(8)});
        if(fc%20===0) Patterns.fan(eb,bx,by,{...opts,count:cnt(10),speed:spd(4.0),spread:.75,color:'#ff8844',glow:'#ff3300',r:4});
        if(fc%45===0) fireRosePattern(eb,bx,by,5,spd(2.5),4,'#ff4444','#cc0000',state.spiralAngle);
        if(fc%60===0) firePentagram(eb,bx,by,spd(2.8),4.5,'#ff8866','#ff2200',state.spiralAngle*1.5);
        if(fc%80===0) Patterns.laser(eb,bx,by,{...opts,color:'#ffffff',glow:'#ff8800',r:5,count:25,speed:spd(7.5)});
        if(fc%40===0) Patterns.circle(eb,bx,by,{count:cnt(30),speed:spd(2.2),color:'#ffaaaa',glow:'#ff4400',r:3.5});
        break;
    }
  }

  function hit(damage, eb, onPhaseChange, onDeath) {
    if (!state||!state.alive) return;
    const ph=currentPhase();
    ph.hp-=damage; state.hitFlash=8;
    if (ph.hp<=0) {
      if (state.phase<state.phases.length-1) {
        ParticleSystem.bossPhaseTransition(state.x,state.y);
        eb.length=0;
        const nextPhaseIdx = state.phase + 1;
        const nextPh = state.phases[nextPhaseIdx];
        const dlgText = nextPh.phaseDialogue || '...';

        // ← On déclenche le dialogue de phase, qui lance le vrai changement de phase quand il se termine
        triggerDialogue(
          dlgText,
          nextPh.color, nextPh.busteIdx,
          state.bossName, state.bossNameRom,
          200,
          () => {
            // Changement de phase APRÈS le dialogue
            state.phase = nextPhaseIdx;
            state.frameCounter = 0;
            state.spiralAngle = 0;
            if(onPhaseChange) onPhaseChange(state.phase, currentPhase());
          }
        );
      } else {
        defeatedList.push(state.bossId);
        state.alive = false;
        ParticleSystem.bossPhaseTransition(state.x, state.y);
        eb.length = 0;
        const def = state.introDef;
        // ← Dialogue de mort avant d'appeler onDeath
        triggerDialogue(
          def.deathDialogue || '...Je suis vaincue...',
          def.color, state.phases[state.phase].busteIdx,
          state.bossName, state.bossNameRom,
          220,
          () => { if(onDeath) onDeath({bossId:state.bossId,isExtra:state.isExtra,allDefeated:allNormalDefeated()}); }
        );
      }
    }
  }

  // ── Draw ─────────────────────────────────────
  function draw(ctx) {
    if (!state||!state.alive) return;
    const ph=currentPhase();
    const {x,y,w,auraAngle,shieldPulse,isExtra,hitFlash,ringAngle}=state;
    ctx.save();

    // Flash dégât (← sans shadowBlur pour perf)
    if(hitFlash>0){ctx.globalAlpha=(hitFlash/8)*.4;ctx.fillStyle='#ffffff';ctx.beginPath();ctx.arc(x,y,w*1.8,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;}

    // Aura
    const auraR=w*(isExtra?2.0:1.7)+Math.sin(shieldPulse)*5;
    const grad=ctx.createRadialGradient(x,y,w*.3,x,y,auraR);
    grad.addColorStop(0,ph.glowColor+'55'); grad.addColorStop(.5,ph.glowColor+'18'); grad.addColorStop(1,ph.glowColor+'00');
    ctx.fillStyle=grad; ctx.beginPath(); ctx.arc(x,y,auraR,0,Math.PI*2); ctx.fill();

    // Anneaux (← shadowBlur réduit)
    for(let ring=0;ring<(isExtra?3:2);ring++){
      const rr=w*(1.3+ring*.3),segs=isExtra?12:8;
      ctx.strokeStyle=ph.color+(ring===0?'88':ring===1?'44':'22'); ctx.lineWidth=ring===0?1.5:1;
      ctx.shadowBlur=4; ctx.shadowColor=ph.glowColor; ctx.beginPath();
      for(let i=0;i<segs;i++){const a1=(Math.PI*2/segs)*i+ringAngle*(ring%2===0?1:-1.5),a2=(Math.PI*2/segs)*i+Math.PI/segs+ringAngle*(ring%2===0?1:-1.5);ctx.moveTo(x+Math.cos(a1)*rr,y+Math.sin(a1)*rr);ctx.lineTo(x+Math.cos(a2)*rr,y+Math.sin(a2)*rr);}
      ctx.stroke();
    }
    ctx.shadowBlur = 0; // ← reset immédiat

    // Sprite ou fallback
    if (state.useSprite && sheetReady) {
      const zone=ZONES[state.currentPose];
      const drawH=w*2.4, drawW=drawH*(zone.sw/zone.sh);
      const drawX=x-drawW/2, drawY=y-drawH*.38;
      ctx.save();
      if(state.poseFlip){ctx.translate(x*2,0);ctx.scale(-1,1);}
      ctx.drawImage(sheet,zone.sx,zone.sy,zone.sw,zone.sh,drawX,drawY,drawW,drawH);
      if(ph.isSpellCard){ctx.globalAlpha=.15;ctx.fillStyle=ph.color;ctx.fillRect(drawX,drawY,drawW,drawH);ctx.globalAlpha=1;}
      ctx.restore();
    } else {
      // Fallback polygone animé
      const sides=isExtra?14:8;
      ctx.fillStyle=ph.isSpellCard?ph.color+'cc':(isExtra?'#080012':'#100018');
      ctx.beginPath();
      for(let i=0;i<sides;i++){const a=(Math.PI*2/sides)*i+auraAngle*(isExtra?.5:.3),r2=w*(.88+Math.sin(shieldPulse+i*.7)*.05);i===0?ctx.moveTo(x+Math.cos(a)*r2,y+Math.sin(a)*r2):ctx.lineTo(x+Math.cos(a)*r2,y+Math.sin(a)*r2);}
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle=ph.color; ctx.lineWidth=isExtra?2.5:2;
      ctx.shadowBlur=10; ctx.shadowColor=ph.glowColor; ctx.stroke(); ctx.shadowBlur=0;
      // Oeil
      const eyeR=w*(isExtra?.3:.26);
      ctx.fillStyle=ph.isSpellCard?'#ffffff':ph.color;
      ctx.beginPath(); ctx.arc(x,y,eyeR,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='#000022'; ctx.beginPath(); ctx.arc(x+Math.cos(auraAngle*2.5)*eyeR*.35,y+Math.sin(auraAngle*2.5)*eyeR*.35,eyeR*.42,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='rgba(255,255,255,0.7)'; ctx.beginPath(); ctx.arc(x+Math.cos(auraAngle*2.5)*eyeR*.35-eyeR*.12,y+Math.sin(auraAngle*2.5)*eyeR*.35-eyeR*.12,eyeR*.12,0,Math.PI*2); ctx.fill();
    }

    // Orbes orbitaux
    const orbCount=isExtra?6:4;
    ctx.shadowBlur=6;
    for(let i=0;i<orbCount;i++){const a=auraAngle*(i%2===0?1:-.7)+(Math.PI*2/orbCount)*i,or=w*.45+Math.sin(shieldPulse+i)*2;ctx.shadowColor=ph.color;ctx.fillStyle=ph.color;ctx.beginPath();ctx.arc(x+Math.cos(a)*or,y+Math.sin(a)*or,3.5,0,Math.PI*2);ctx.fill();}
    ctx.shadowBlur=0;

    // Barre HP
    const barW=isExtra?240:200,barH=isExtra?9:7,barX=x-barW/2,barY=y+w+14,hpR=Math.max(0,ph.hp/ph.maxHp);
    ctx.fillStyle='rgba(0,0,0,0.7)'; ctx.fillRect(barX-1,barY-1,barW+2,barH+2);
    ctx.fillStyle='#111'; ctx.fillRect(barX,barY,barW,barH);
    const barColor=ph.isSpellCard?`hsl(${200+hpR*60},90%,65%)`:`hsl(${200+hpR*30},100%,55%)`;
    ctx.shadowBlur=6; ctx.shadowColor=barColor;
    const bg=ctx.createLinearGradient(barX,0,barX+barW,0); bg.addColorStop(0,barColor); bg.addColorStop(1,'#ffffff44');
    ctx.fillStyle=bg; ctx.fillRect(barX,barY,barW*hpR,barH);
    ctx.shadowBlur=0;
    for(let i=1;i<state.phases.length;i++){ctx.fillStyle='rgba(0,0,0,0.8)';ctx.fillRect(barX+barW*(i/state.phases.length)-1,barY,2,barH);}
    ctx.fillStyle=ph.color;
    ctx.font=ph.isSpellCard?'bold 11px "Noto Serif JP",serif':'11px "Share Tech Mono",monospace';
    ctx.textAlign='center'; ctx.fillText(ph.name+(isExtra?' ✦':''),x,barY-6);
    ctx.font='bold 10px "Share Tech Mono",monospace'; ctx.fillStyle=state.defColor||ph.color;
    ctx.fillText(state.bossNameRom,x,barY-18);
    if(isExtra){ctx.font='bold 10px "Share Tech Mono",monospace';ctx.fillStyle='#cc44ff';ctx.fillText('⚠ EXTRA BOSS',x,barY-30);}

    ctx.restore();

    // Dialogue de phase/mort (dessiné séparément, toujours visible)
    if (pendingDialogue) drawDialoguePanel(ctx, pendingDialogue);
  }

  // ── Dialogue panel ────────────────────────────
  function drawDialoguePanel(ctx, dlg) {
    if (!dlg) return;
    const alpha = Math.min(1, dlg.timer / 30) * Math.min(1, dlg.timer / 15);
    const W2 = state ? state.W : 400;
    const panelX=8, panelY=410, panelW=W2-16, panelH=90;
    ctx.save(); ctx.globalAlpha = alpha;
    ctx.fillStyle='rgba(0,5,20,0.92)';
    ctx.strokeStyle=dlg.color; ctx.lineWidth=1.5;
    roundRect(ctx,panelX,panelY,panelW,panelH,6); ctx.fill(); ctx.stroke();

    let textX = panelX + 14;
    if (state && state.useSprite && sheetReady) {
      const bz = ZONES.buste[dlg.busteIdx] || ZONES.buste[0];
      const bh=78, bw=bh*(bz.sw/bz.sh);
      ctx.drawImage(sheet,bz.sx,bz.sy,bz.sw,bz.sh,panelX+6,panelY+6,bw,bh);
      textX = panelX + bw + 14;
    }

    ctx.fillStyle=dlg.color; ctx.font='bold 10px "Noto Serif JP",serif'; ctx.textAlign='left';
    ctx.fillText(dlg.bossName||'???', textX, panelY+18);
    ctx.fillStyle='#ddeeff'; ctx.font='11px "Noto Serif JP",serif';
    wrapText(ctx, dlg.text, textX, panelY+36, panelW-textX+panelX-12, 15);

    // Indicateur "appuie sur Z pour passer"
    ctx.fillStyle='rgba(150,150,200,0.6)'; ctx.font='9px "Share Tech Mono",monospace';
    ctx.textAlign='right';
    ctx.fillText('Z — passer', panelX+panelW-8, panelY+panelH-6);
    ctx.restore();
  }

  function drawIntroDialogue(ctx) {
    if (!pendingDialogue) return;
    drawDialoguePanel(ctx, pendingDialogue);
  }

  function roundRect(ctx,x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.arcTo(x+w,y,x+w,y+r,r);ctx.lineTo(x+w,y+h-r);ctx.arcTo(x+w,y+h,x+w-r,y+h,r);ctx.lineTo(x+r,y+h);ctx.arcTo(x,y+h,x,y+h-r,r);ctx.lineTo(x,y+r);ctx.arcTo(x,y,x+r,y,r);ctx.closePath();}
  function wrapText(ctx,text,x,y,maxW,lineH){let line='',cy=y;for(const ch of text.split('')){const test=line+ch;if(ctx.measureText(test).width>maxW&&line!==''){ctx.fillText(line,x,cy);line=ch;cy+=lineH;}else line=test;}if(line)ctx.fillText(line,x,cy);}

  return {
    spawn, spawnNext, fire, hit, draw, isDead, isActive, currentPhase,
    updateMovement, getState, reset, nextBossTriggerWave, allNormalDefeated, BOSS_ROSTER,
    // Dialogue API
    hasDialogue, getDialogue, tickDialogue, skipDialogue,
    triggerIntroDialogue, drawIntroDialogue,
  };
})();