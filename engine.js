// Endless runner engine. Reads everything about looks and rules from window.THEME.
(function () {
  "use strict";
  const T = window.THEME;
  const C = T.colors;
  const $ = (id) => document.getElementById(id);
  const canvas = $("game");
  const ctx = canvas.getContext("2d");
  const fx = $("fx");          // separate layer on top, so confetti falls over the cards too
  const fctx = fx.getContext("2d");
  const FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const endless = T.winScore == null;

  // ---- apply theme to page ----
  document.title = T.pageTitle;
  const rs = document.documentElement.style;
  rs.setProperty("--accent", C.accent);
  rs.setProperty("--accent-dark", C.accentDark);
  rs.setProperty("--card-bg", C.cardBg);
  rs.setProperty("--card-ink", C.cardInk);
  rs.setProperty("--overlay", C.overlay);
  rs.setProperty("--text", C.text);
  rs.setProperty("--gold", C.gold);

  $("startEmoji").textContent = T.start.emoji;
  $("startTitle").textContent = T.start.title;
  $("startSub").textContent = T.start.sub;
  $("startBtn").textContent = T.start.button;
  T.start.legend.forEach((l) => {
    const s = document.createElement("span");
    const b = document.createElement("b");
    b.textContent = l.e;
    s.appendChild(b);
    s.appendChild(document.createTextNode(l.t));
    $("legend").appendChild(s);
  });
  $("meterTrack").hidden = endless;

  // ---- best score (endless mode) ----
  function loadBest() { try { return Number(localStorage.getItem(T.storageKey)) || 0; } catch (e) { return 0; } }
  function saveBest(v) { try { localStorage.setItem(T.storageKey, String(v)); } catch (e) { /* ignore */ } }

  // ---- geometry ----
  const Z_MAX = 70, ZK = 10;
  let W, H, DPR, horizon, playerY, laneW, base;
  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = W * DPR; canvas.height = H * DPR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    fx.width = W * DPR; fx.height = H * DPR;
    fctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    horizon = H * 0.30;
    playerY = H * 0.84;
    laneW = Math.min(W * 0.30, H * 0.22, 160);
    base = laneW * 0.7;
  }
  window.addEventListener("resize", resize);
  resize();

  // perspective: z is distance ahead of the runner, lx is lane position (-1, 0, 1)
  const scale = (z) => 1 / (1 + z / ZK);
  function P(lx, z) {
    const s = scale(z);
    return { x: W / 2 + lx * laneW * s, y: horizon + (playerY - horizon) * s, s: s };
  }

  // ---- game state ----
  let state = "idle";
  let ents = [], pops = [];
  let dist = 0, speed = T.speedStart, pts = 0, lives = T.lives;
  let spawnLeft = 0, patternCount = 0, invuln = 0, flash = 0, shake = 0, clock = 0, last = 0;
  let power = null, lastPowerId = null, sinceKiss = 0, shownSecs = -1, mi = 0;
  const player = { lane: 1, x: 0, h: 0, vy: 0, slide: 0 };
  const keys = {};

  function startGame() {
    ents = []; pops = [];
    dist = 0; speed = T.speedStart; pts = 0; lives = T.lives;
    spawnLeft = 22; patternCount = 0; invuln = 0; flash = 0; shake = 0;
    power = null; lastPowerId = null; sinceKiss = 0; shownSecs = -1; mi = 0; renderPower();
    player.lane = 1; player.x = 0; player.h = 0; player.vy = 0; player.slide = 0;
    state = "playing";
    $("startScreen").hidden = true; $("endScreen").hidden = true; $("hud").hidden = false;
    updateHud();
  }

  function score() { return pts * 10 + Math.floor(dist); }

  function updateHud() {
    if (endless) {
      $("scoreText").textContent = T.hudIcon + " " + score();
    } else {
      const shown = Math.min(pts, T.winScore);
      $("scoreText").textContent = T.hudIcon + " " + shown + " / " + T.winScore;
      $("meterFill").style.width = Math.min(100, (pts / T.winScore) * 100) + "%";
    }
    $("lives").textContent = T.lifeIcon.repeat(Math.max(0, lives)) + T.lostLifeIcon.repeat(Math.max(0, T.lives - lives));
  }

  // ---- spawning ----
  const rand = (n) => Math.floor(Math.random() * n);
  const pickFrom = (arr) => arr[rand(arr.length)];
  function pickCollectible() {
    const total = T.collectibles.reduce((a, c) => a + c.w, 0);
    let r = Math.random() * total;
    for (const c of T.collectibles) { if ((r -= c.w) <= 0) return c; }
    return T.collectibles[0];
  }
  function addCoin(lane, z, air) {
    const c = pickCollectible();
    ents.push({ kind: "coin", lane: lane, x: lane - 1, z: z, e: c.e, pts: c.pts, air: !!air });
  }
  function addObstacle(kind, lane, z) {
    ents.push({ kind: kind, lane: lane, x: lane - 1, z: z, e: pickFrom(T.obstacles[kind]) });
  }

  // each pattern returns how long (in road units) it occupies
  function spawnPattern() {
    const z0 = Z_MAX;
    const lane = rand(3);
    const early = patternCount < 2;
    const roll = early ? 0 : rand(10);
    patternCount++;

    if (roll < 3) { // line of collectibles
      for (let i = 0; i < 6; i++) addCoin(lane, z0 + i * 2);
      return 12;
    }
    if (roll < 5) { // single obstacle plus coins in another lane
      const kind = pickFrom(["jump", "slide", "block"]);
      addObstacle(kind, lane, z0);
      const other = (lane + 1 + rand(2)) % 3;
      for (let i = 0; i < 4; i++) addCoin(other, z0 - 2 + i * 2);
      return 6;
    }
    if (roll < 7) { // jump over it and grab the coins in the air
      addObstacle("jump", lane, z0);
      for (let i = -1; i <= 1; i++) addCoin(lane, z0 + i * 1.6, true);
      return 5;
    }
    if (roll < 9) { // two lanes blocked, one open with collectibles
      const open = rand(3);
      for (let l = 0; l < 3; l++) {
        if (l !== open) addObstacle("block", l, z0);
      }
      for (let i = 0; i < 4; i++) addCoin(open, z0 - 2 + i * 2);
      return 6;
    }
    // slide under it, collectibles on the ground behind
    addObstacle("slide", lane, z0);
    for (let i = 1; i <= 3; i++) addCoin(lane, z0 + i * 2);
    return 8;
  }

  // ---- kiss power-ups (rare) ----
  const PW = T.power || null;
  const isObstacle = (e) => e.kind === "jump" || e.kind === "slide" || e.kind === "block";

  function maybeSpawnKiss(len) {
    if (!PW) return;
    sinceKiss++;
    if (sinceKiss >= PW.minGapPatterns && Math.random() < PW.chance) {
      sinceKiss = 0;
      const lane = rand(3);
      // placed in the empty stretch after the pattern, so it never overlaps an obstacle
      ents.push({ kind: "power", lane: lane, x: lane - 1, z: Z_MAX + len + 6, e: PW.emoji });
    }
  }
  function convertToCollectible(e) {
    e.kind = "coin"; e.e = PW.convertEmoji; e.pts = 1; e.air = false; e.converted = true;
  }
  function renderPower() {
    const el = $("power");
    if (!power) { el.hidden = true; return; }
    el.hidden = false;
    el.textContent = power.icon + " " + power.label.replace(/!$/, "") + " " + Math.ceil(power.t) + "s";
  }
  function activatePower() {
    let choices = PW.types.filter((t) => t.id !== lastPowerId);
    if (!choices.length) choices = PW.types;
    const type = pickFrom(choices);
    lastPowerId = type.id;
    power = { id: type.id, t: type.secs, icon: type.icon, label: type.label };
    pops.push({ x: W / 2, y: H * 0.36, t: type.label, life: 1.5, big: true });
    if (type.id === "convert") ents.forEach((e) => { if (isObstacle(e)) convertToCollectible(e); });
    shownSecs = Math.ceil(power.t);
    renderPower();
  }

  // ---- milestones: confetti plus a banner at chosen scores ----
  function checkMilestones() {
    const list = T.milestones || [];
    while (mi < list.length && pts >= list[mi].at) {
      pops.push({ x: W / 2, y: H * 0.27, t: list[mi].text, life: 1.8, big: true });
      burstConfetti(60);
      mi++;
    }
  }

  // ---- end of game ----
  function endGame(won) {
    state = won ? "won" : "lost";
    $("hud").hidden = true;
    ents = []; power = null; renderPower();
    const card = $("endCard");
    card.innerHTML = "";
    const add = (tag, text, cls) => {
      const el = document.createElement(tag);
      el.textContent = text;
      if (cls) el.className = cls;
      card.appendChild(el);
      return el;
    };
    let btn;
    if (won && T.win) {
      add("div", T.win.emoji, "big-emoji");
      add("h2", T.win.title);
      T.win.message.forEach((m) => add("p", m));
      if (T.win.sign) add("p", T.win.sign, "sign");
      if (T.win.ps) add("p", T.win.ps, "ps");
      btn = add("button", T.win.button);
      confetti = [];
      burstConfetti(110);
    } else {
      add("div", T.lose.emoji, "big-emoji");
      add("h2", T.lose.title);
      add("p", T.lose.message);
      if (endless) {
        const s = score();
        const best = Math.max(loadBest(), s);
        if (s > loadBest()) saveBest(s);
        add("p", "Score: " + s + "   Best: " + best);
      }
      btn = add("button", T.lose.button);
    }
    btn.onclick = startGame;
    setTimeout(() => { $("endScreen").hidden = false; btn.focus(); }, won ? 700 : 500);
  }

  let confetti = [];
  function burstConfetti(count) {
    const pieces = (T.confetti && T.confetti.pieces) || [T.hudIcon, "🎉", "✨", "🎂"];
    for (let i = 0; i < (count || 90); i++) {
      confetti.push({
        x: Math.random() * W, y: -Math.random() * H * 0.8,
        vy: 80 + Math.random() * 160, vx: (Math.random() - 0.5) * 60,
        s: 20 + Math.random() * 22, e: pickFrom(pieces),
        rot: Math.random() * 6, spin: (Math.random() - 0.5) * 4
      });
    }
  }

  function hit(e) {
    ents.splice(ents.indexOf(e), 1);
    lives--;
    invuln = 1.3; flash = 0.35; shake = reduceMotion ? 0 : 0.3;
    pops.push({ x: W / 2 + player.x * laneW, y: playerY - base * 1.8, t: "Oops!", life: 0.8, bad: true });
    updateHud();
    if (lives <= 0) endGame(false);
  }

  // ---- input ----
  function changeLane(d) {
    if (state !== "playing") return;
    player.lane = Math.max(0, Math.min(2, player.lane + d));
  }
  function jump() {
    if (state !== "playing") return;
    if (player.h <= 0.001) { player.vy = 7.5; player.slide = 0; }
  }
  function slide() {
    if (state !== "playing") return;
    player.slide = 0.65;
    if (player.h > 0.001) player.vy = Math.min(player.vy, -14); // drop quickly when airborne
  }

  let swipe = null;
  canvas.addEventListener("pointerdown", (e) => {
    swipe = { x: e.clientX, y: e.clientY, used: false };
  });
  canvas.addEventListener("pointermove", (e) => {
    if (!swipe) return;
    const dx = e.clientX - swipe.x, dy = e.clientY - swipe.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 28) return;
    if (Math.abs(dx) > Math.abs(dy)) changeLane(dx > 0 ? 1 : -1);
    else if (dy < 0) jump(); else slide();
    swipe.x = e.clientX; swipe.y = e.clientY; swipe.used = true;
  });
  const endSwipe = () => {
    if (swipe && !swipe.used) jump(); // a quick tap jumps
    swipe = null;
  };
  canvas.addEventListener("pointerup", endSwipe);
  canvas.addEventListener("pointercancel", () => { swipe = null; });

  window.addEventListener("keydown", (e) => {
    if (e.repeat) return;
    const k = e.key;
    if (k === "ArrowLeft" || k === "a" || k === "A") changeLane(-1);
    else if (k === "ArrowRight" || k === "d" || k === "D") changeLane(1);
    else if (k === "ArrowUp" || k === "w" || k === "W" || k === " ") jump();
    else if (k === "ArrowDown" || k === "s" || k === "S") slide();
    else return;
    e.preventDefault();
  });
  $("startBtn").addEventListener("click", startGame);

  // ---- update ----
  function update(dt) {
    clock += dt;
    flash = Math.max(0, flash - dt);
    shake = Math.max(0, shake - dt);
    for (let i = pops.length - 1; i >= 0; i--) {
      pops[i].life -= dt; pops[i].y -= 50 * dt;
      if (pops[i].life <= 0) pops.splice(i, 1);
    }
    for (let i = confetti.length - 1; i >= 0; i--) {
      const c = confetti[i];
      c.y += c.vy * dt; c.x += c.vx * dt; c.rot += c.spin * dt;
      if (c.y > H + 40) {
        if (state === "won") { c.y = -30; c.x = Math.random() * W; } else confetti.splice(i, 1);
      }
    }
    if (state !== "playing") return;

    speed = Math.min(T.speedMax, T.speedStart + dist * T.speedAccel);
    dist += speed * dt;
    invuln = Math.max(0, invuln - dt);
    if (power) {
      power.t -= dt;
      if (power.t <= 0) { power = null; renderPower(); }
      else if (Math.ceil(power.t) !== shownSecs) { shownSecs = Math.ceil(power.t); renderPower(); }
    }

    // runner movement
    player.x += (player.lane - 1 - player.x) * Math.min(1, dt * 14);
    if (player.h > 0 || player.vy > 0) {
      player.vy -= 22 * dt;
      player.h += player.vy * dt;
      if (player.h <= 0) { player.h = 0; player.vy = 0; }
    }
    player.slide = Math.max(0, player.slide - dt);

    // spawn
    spawnLeft -= speed * dt;
    if (spawnLeft <= 0) {
      const len = spawnPattern();
      maybeSpawnKiss(len);
      spawnLeft = len + 14 + Math.random() * 6;
    }

    // move + collide
    const sliding = player.slide > 0 && player.h < 0.2;
    const magnet = power && power.id === "magnet";
    const convert = power && power.id === "convert";
    for (let i = ents.length - 1; i >= 0; i--) {
      const e = ents[i];
      e.z -= speed * dt;
      if (convert && isObstacle(e) && e.z < 45) convertToCollectible(e);
      if (magnet && e.kind === "coin" && e.z < 24) {
        e.x += (player.x - e.x) * Math.min(1, dt * 7);
        e.z -= 14 * dt;
        e.air = false;
      }
      if (e.z < -3) { ents.splice(i, 1); continue; }
      if (Math.abs(e.z) > 0.8) continue;
      if (Math.abs(player.x - e.x) > 0.55) continue;
      if (e.kind === "power") {
        ents.splice(i, 1);
        activatePower();
      } else if (e.kind === "coin") {
        if (e.air && player.h < 0.35) continue;
        ents.splice(i, 1);
        const gain = e.pts * (power && power.id === "double" ? 2 : 1);
        pts += gain;
        pops.push({ x: W / 2 + e.x * laneW, y: playerY - base * 1.8, t: "+" + gain, life: 0.7 });
        updateHud();
        checkMilestones();
        if (!endless && pts >= T.winScore) { endGame(true); return; }
      } else if (invuln <= 0) {
        if (e.kind === "jump" && player.h < 0.5) { hit(e); if (state !== "playing") return; }
        else if (e.kind === "slide" && !sliding) { hit(e); if (state !== "playing") return; }
        else if (e.kind === "block") { hit(e); if (state !== "playing") return; }
      }
    }
    if (endless) updateHud();
  }

  // ---- drawing ----
  function emo(e, x, y, size, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha == null ? 1 : alpha;
    ctx.font = size + "px " + FONT;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(e, x, y);
    ctx.restore();
  }
  function poly(pts, color) {
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  }
  const fade = (z) => Math.max(0, Math.min(1, (Z_MAX - z) / 10));

  function draw() {
    ctx.clearRect(0, 0, W, H);
    ctx.save();
    if (shake > 0) ctx.translate((Math.random() - 0.5) * 10, (Math.random() - 0.5) * 10);

    // sky + ground
    const g = ctx.createLinearGradient(0, 0, 0, horizon);
    g.addColorStop(0, C.skyTop); g.addColorStop(1, C.skyBottom);
    ctx.fillStyle = g; ctx.fillRect(-20, -20, W + 40, horizon + 20);
    if (T.skyEmoji) emo(T.skyEmoji, W * 0.74, horizon * 0.5, Math.min(70, W * 0.16), 0.9);
    ctx.fillStyle = C.ground; ctx.fillRect(-20, horizon, W + 40, H - horizon + 20);

    // road
    const FAR = 2000, NEAR = -3;
    poly([P(-1.5, FAR), P(1.5, FAR), P(1.5, NEAR), P(-1.5, NEAR)], C.road);
    poly([P(-1.58, FAR), P(-1.5, FAR), P(-1.5, NEAR), P(-1.58, NEAR)], C.roadEdge);
    poly([P(1.5, FAR), P(1.58, FAR), P(1.58, NEAR), P(1.5, NEAR)], C.roadEdge);
    const off = dist % 6;
    for (let z = -off; z < Z_MAX; z += 6) {
      const z0 = Math.max(NEAR, z), z1 = z + 2.5;
      if (z1 <= NEAR) continue;
      [-0.5, 0.5].forEach((lx) => {
        poly([P(lx - 0.03, z0), P(lx + 0.03, z0), P(lx + 0.03, z1), P(lx - 0.03, z1)], C.laneLine);
      });
    }

    // scenery on both sides, far to near
    const idx0 = Math.floor(dist / 8), off8 = dist % 8, n = T.scenery.length;
    for (let k = Math.ceil(Z_MAX / 8); k >= 0; k--) {
      const z = k * 8 - off8;
      if (z < -2) continue;
      const idx = idx0 + k;
      [-1, 1].forEach((side) => {
        const p = P(side * 2.8, z);
        const size = base * 1.3 * p.s;
        emo(T.scenery[(idx + (side > 0 ? 1 : 0)) % n], p.x, p.y - size * 0.35, size, fade(z));
      });
    }

    // things on the road plus the runner, drawn far to near
    const list = ents.slice().sort((a, b) => b.z - a.z);
    let playerDrawn = false;
    const drawPlayer = () => {
      playerDrawn = true;
      const px = W / 2 + player.x * laneW;
      const size = base * 1.25;
      const feetY = playerY - player.h * base * 1.1;
      // shadow stays on the ground
      ctx.save();
      ctx.globalAlpha = 0.28 / (1 + player.h);
      ctx.fillStyle = "#000";
      ctx.beginPath();
      ctx.ellipse(px, playerY + size * 0.12, size * 0.38, size * 0.1, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      const blink = invuln > 0 && Math.floor(clock * 12) % 2 === 0;
      ctx.save();
      ctx.globalAlpha = blink ? 0.35 : 1;
      ctx.translate(px, feetY);
      const sliding = player.slide > 0 && player.h < 0.2;
      if (sliding) ctx.scale(1.15, 0.55);
      ctx.font = size + "px " + FONT;
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(T.player, 0, -size * 0.45);
      ctx.restore();
    };
    for (const e of list) {
      if (!playerDrawn && e.z < 0) drawPlayer();
      const p = P(e.x, e.z);
      const mult = e.kind === "block" ? 1.5 : e.kind === "power" ? 1.2 : e.converted ? 0.95 : e.kind === "coin" ? 0.75 : 1.1;
      const size = base * p.s * mult;
      let y = p.y - size * 0.45;
      if (e.kind === "slide") y -= base * p.s * 0.95;
      if (e.air) y -= base * p.s * 1.1;
      if (e.kind === "power") emo("✨", p.x, y, size * (1.6 + 0.12 * Math.sin(clock * 8)), fade(e.z) * 0.85);
      emo(e.e, p.x, y, size, fade(e.z));
    }
    if (!playerDrawn && state !== "won" && state !== "lost") drawPlayer();

    const uiFont = getComputedStyle(document.body).fontFamily;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    for (const p of pops) {
      let fs = Math.max(20, base * (p.big ? 0.7 : 0.45));
      if (p.big) fs = Math.min(fs, (W * 0.9) / (p.t.length * 0.6));
      ctx.font = "700 " + fs + "px " + uiFont;
      ctx.globalAlpha = Math.max(0, Math.min(1, p.life * 1.5));
      ctx.fillStyle = p.bad ? "#ffb4b4" : C.gold;
      ctx.fillText(p.t, p.x, p.y);
    }
    ctx.globalAlpha = 1;
    ctx.restore();

    if (flash > 0) {
      ctx.fillStyle = "rgba(255, 60, 90, " + flash * 0.9 + ")";
      ctx.fillRect(0, 0, W, H);
    }
  }

  function drawFx() {
    fctx.clearRect(0, 0, W, H);
    for (const c of confetti) {
      fctx.save();
      fctx.translate(c.x, c.y); fctx.rotate(c.rot);
      fctx.font = c.s + "px " + FONT; fctx.textAlign = "center"; fctx.textBaseline = "middle";
      fctx.fillText(c.e, 0, 0);
      fctx.restore();
    }
  }

  function loop(ts) {
    const dt = Math.min(0.05, (ts - last) / 1000 || 0.016);
    last = ts;
    update(dt);
    draw();
    drawFx();
    requestAnimationFrame(loop);
  }
  if (T.confetti && T.confetti.onOpen) burstConfetti(80);   // the welcome shower
  requestAnimationFrame(loop);
})();
