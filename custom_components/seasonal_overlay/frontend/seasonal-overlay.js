/*
 * Seasonal Overlay Card for Home Assistant
 * Draws seasonal and holiday decorations over a dashboard: a border/frame
 * (snowdrifts, string lights, leaf piles, cobwebs...) and/or falling or
 * floating particles (snow, leaves, petals, fireflies, fireworks...).
 *
 * One transparent canvas sits on top of the dashboard with
 * pointer-events: none, so every tap still reaches your cards.
 */
(() => {
  const VERSION = "1.0.0";
  if (window.__seasonalOverlayLoaded) return; // loaded twice (resource + module): run once
  window.__seasonalOverlayLoaded = VERSION;
  const TAU = Math.PI * 2;
  const R = Math.random;
  const pick = (arr, r = R) => arr[Math.floor(r() * arr.length)];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* ------------------------------------------------------------------ */
  /* Palettes                                                            */
  /* ------------------------------------------------------------------ */
  const LEAF = ["#D85A30", "#E8892B", "#C9A227", "#A32D2D", "#B5541C", "#8C3B12"];
  const PETAL = ["#F7C6D9", "#F2A0BD", "#FFE4EE", "#E87FA6"];
  const FLOWER = ["#F2A0BD", "#FFFFFF", "#FFD45E", "#B9A3F0", "#FF8A80"];
  const BUTTERFLY = ["#FFB347", "#7EC8F2", "#F7A8D0", "#FFE066"];
  const BULB = ["#FF4D4D", "#FFD23F", "#3FA9FF", "#5BD66B", "#FF7AD9"];
  const HEART = ["#FF4F7B", "#E8174A", "#FF8FAB", "#FFC2D1", "#D6336C"];
  const FIREWORK_USA = ["#FF3B3B", "#FFFFFF", "#4D8BFF", "#FF6B6B", "#9EC2FF"];
  const FIREWORK_NY = ["#FFD700", "#FFF1A8", "#C0C0C0", "#FF9EE5", "#8FE3FF"];
  const CONFETTI = ["#FFD700", "#E8E8E8", "#FF6FB5", "#5CC8FF", "#B48CFF", "#F5B942"];

  /* ------------------------------------------------------------------ */
  /* Drawing helpers                                                     */
  /* ------------------------------------------------------------------ */
  function flake(c, x, y, r, rot) {
    c.save(); c.translate(x, y); c.rotate(rot);
    c.strokeStyle = "#fff"; c.lineWidth = Math.max(1, r * 0.12); c.lineCap = "round";
    c.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i * TAU) / 6, ca = Math.cos(a), sa = Math.sin(a);
      c.moveTo(0, 0); c.lineTo(ca * r, sa * r);
      const bx = ca * r * 0.55, by = sa * r * 0.55;
      for (const s of [-1, 1]) {
        const b = a + s * 0.7;
        c.moveTo(bx, by); c.lineTo(bx + Math.cos(b) * r * 0.3, by + Math.sin(b) * r * 0.3);
      }
    }
    c.stroke(); c.restore();
  }

  const MAPLE = [[0, -1], [0.14, -0.62], [0.4, -0.78], [0.3, -0.38], [0.92, -0.58], [0.68, -0.16], [0.88, 0.04],
    [0.46, 0.14], [0.52, 0.46], [0.14, 0.3], [0.05, 0.5], [-0.05, 0.5], [-0.14, 0.3], [-0.52, 0.46], [-0.46, 0.14],
    [-0.88, 0.04], [-0.68, -0.16], [-0.92, -0.58], [-0.3, -0.38], [-0.4, -0.78], [-0.14, -0.62]];
  function leafPath(c, s, maple) {
    c.beginPath();
    if (maple) {
      MAPLE.forEach(([x, y], i) => (i ? c.lineTo(x * s, y * s) : c.moveTo(x * s, y * s)));
      c.closePath();
    } else {
      c.moveTo(-s, 0);
      c.quadraticCurveTo(0, -s * 0.75, s, 0);
      c.quadraticCurveTo(0, s * 0.75, -s, 0);
    }
  }

  function leaf(c, x, y, s, rot, color, maple, flip = 1, alpha = 1) {
    c.save(); c.translate(x, y); c.rotate(rot); c.scale(1, flip);
    c.globalAlpha = alpha; c.fillStyle = color;
    leafPath(c, s, maple); c.fill();
    c.strokeStyle = "rgba(60,20,5,0.45)"; c.lineWidth = Math.max(0.8, s * 0.08);
    c.beginPath();
    if (maple) {
      c.moveTo(0, s * 1.05); c.lineTo(0, -s * 0.7);
      c.moveTo(0, s * 0.15); c.lineTo(s * 0.62, -s * 0.38); c.moveTo(0, s * 0.15); c.lineTo(-s * 0.62, -s * 0.38);
    }
    else { c.moveTo(-s, 0); c.lineTo(s * 0.9, 0); }
    c.stroke(); c.restore();
  }

  function heartPath(c, s) {
    c.beginPath();
    c.moveTo(0, -s * 0.25);
    c.bezierCurveTo(-s * 0.1, -s * 0.62, -s * 0.62, -s * 0.52, -s * 0.56, -s * 0.08);
    c.bezierCurveTo(-s * 0.5, s * 0.22, -s * 0.15, s * 0.38, 0, s * 0.6);
    c.bezierCurveTo(s * 0.15, s * 0.38, s * 0.5, s * 0.22, s * 0.56, -s * 0.08);
    c.bezierCurveTo(s * 0.62, -s * 0.52, s * 0.1, -s * 0.62, 0, -s * 0.25);
    c.closePath();
  }

  function heart(c, x, y, s, color, rot = 0, alpha = 1) {
    c.save(); c.translate(x, y); c.rotate(rot); c.globalAlpha = alpha;
    heartPath(c, s); c.fillStyle = color; c.fill();
    c.fillStyle = "rgba(255,255,255,0.35)";
    c.beginPath(); c.ellipse(-s * 0.28, -s * 0.22, s * 0.1, s * 0.06, -0.6, 0, TAU); c.fill();
    c.restore();
  }

  function star(c, x, y, r, color, rot = 0) {
    c.save(); c.translate(x, y); c.rotate(rot); c.fillStyle = color; c.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r * 0.45 : r;
      i ? c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : c.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    c.closePath(); c.fill(); c.restore();
  }

  function sparkle(c, x, y, r, alpha, color = "#fff") {
    c.save(); c.globalAlpha = alpha; c.fillStyle = color; c.translate(x, y); c.beginPath();
    c.moveTo(0, -r); c.quadraticCurveTo(0, 0, r, 0); c.quadraticCurveTo(0, 0, 0, r);
    c.quadraticCurveTo(0, 0, -r, 0); c.quadraticCurveTo(0, 0, 0, -r); c.fill(); c.restore();
  }

  function glow(c, x, y, r, color, alpha) {
    const g = c.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, color); g.addColorStop(1, "rgba(0,0,0,0)");
    c.save(); c.globalAlpha = alpha; c.fillStyle = g;
    c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); c.restore();
  }

  function bat(c, x, y, s, flap, dir) {
    c.save(); c.translate(x, y); c.scale(dir, 1);
    c.fillStyle = "#1E1428"; c.strokeStyle = "rgba(255,160,70,0.55)"; c.lineWidth = Math.max(1, s * 0.05);
    for (const side of [1, -1]) {
      c.save(); c.scale(side, 1); c.beginPath();
      c.moveTo(0, -s * 0.1);
      c.quadraticCurveTo(s * 0.6, -s * (0.25 + 0.7 * flap), s * 1.3, -s * (0.1 + 0.45 * flap));
      c.quadraticCurveTo(s * 1.05, s * 0.12, s * 0.9, s * 0.28);
      c.quadraticCurveTo(s * 0.72, s * 0.08, s * 0.5, s * 0.28);
      c.quadraticCurveTo(s * 0.3, s * 0.08, 0, s * 0.22);
      c.closePath(); c.fill(); c.stroke(); c.restore();
    }
    c.beginPath(); c.ellipse(0, s * 0.05, s * 0.17, s * 0.3, 0, 0, TAU); c.fill(); c.stroke();
    c.beginPath(); c.moveTo(-s * 0.12, -s * 0.18); c.lineTo(-s * 0.08, -s * 0.38); c.lineTo(-s * 0.02, -s * 0.2);
    c.moveTo(s * 0.12, -s * 0.18); c.lineTo(s * 0.08, -s * 0.38); c.lineTo(s * 0.02, -s * 0.2); c.fill();
    c.fillStyle = "#FFB347";
    c.beginPath(); c.arc(-s * 0.06, -s * 0.08, s * 0.03, 0, TAU); c.arc(s * 0.06, -s * 0.08, s * 0.03, 0, TAU); c.fill();
    c.restore();
  }

  function butterfly(c, x, y, s, flap, color, rot) {
    c.save(); c.translate(x, y); c.rotate(rot);
    const w = 0.15 + 0.85 * Math.abs(flap);
    c.fillStyle = color; c.strokeStyle = "rgba(40,20,10,0.6)"; c.lineWidth = Math.max(0.8, s * 0.06);
    for (const side of [1, -1]) {
      c.save(); c.scale(side * w, 1);
      c.beginPath(); c.ellipse(s * 0.45, -s * 0.3, s * 0.5, s * 0.38, -0.4, 0, TAU); c.fill(); c.stroke();
      c.beginPath(); c.ellipse(s * 0.35, s * 0.3, s * 0.32, s * 0.26, 0.5, 0, TAU); c.fill(); c.stroke();
      c.restore();
    }
    c.fillStyle = "#3A2A1A"; c.beginPath(); c.ellipse(0, 0, s * 0.07, s * 0.45, 0, 0, TAU); c.fill();
    c.restore();
  }

  function flower(c, x, y, r, color, sway) {
    c.save(); c.translate(x, y); c.rotate(sway);
    c.fillStyle = color;
    for (let i = 0; i < 5; i++) {
      const a = (i * TAU) / 5;
      c.beginPath(); c.ellipse(Math.cos(a) * r * 0.7, Math.sin(a) * r * 0.7, r * 0.55, r * 0.38, a, 0, TAU); c.fill();
    }
    c.fillStyle = "#FFC93C"; c.beginPath(); c.arc(0, 0, r * 0.38, 0, TAU); c.fill();
    c.restore();
  }

  function pumpkin(c, x, y, s, flicker) {
    c.save(); c.translate(x, y);
    glow(c, 0, -s * 0.2, s * 1.6, "rgba(255,150,40,0.9)", 0.18 + 0.1 * flicker);
    const lobes = [[-0.42, 0.62], [0.42, 0.62], [-0.2, 0.78], [0.2, 0.78], [0, 0.82]];
    for (const [ox, w] of lobes) {
      c.fillStyle = ox === 0 ? "#F28C28" : "#E07012";
      c.beginPath(); c.ellipse(ox * s, -s * 0.45, w * s * 0.55, s * 0.47, 0, 0, TAU); c.fill();
    }
    c.fillStyle = "#4E7A27"; c.beginPath();
    c.moveTo(-s * 0.06, -s * 0.88); c.quadraticCurveTo(s * 0.02, -s * 1.15, s * 0.16, -s * 1.12);
    c.lineTo(s * 0.08, -s * 0.86); c.closePath(); c.fill();
    const face = `rgba(255,${200 + Math.round(40 * flicker)},80,${0.75 + 0.25 * flicker})`;
    c.fillStyle = face;
    c.beginPath();
    c.moveTo(-s * 0.32, -s * 0.55); c.lineTo(-s * 0.16, -s * 0.55); c.lineTo(-s * 0.24, -s * 0.7); c.closePath();
    c.moveTo(s * 0.32, -s * 0.55); c.lineTo(s * 0.16, -s * 0.55); c.lineTo(s * 0.24, -s * 0.7); c.closePath();
    c.moveTo(-s * 0.36, -s * 0.36);
    for (let i = 0; i <= 6; i++) c.lineTo(-s * 0.36 + (i * s * 0.72) / 6, -s * 0.36 + (i % 2 ? -s * 0.08 : 0));
    c.quadraticCurveTo(0, -s * 0.12, -s * 0.36, -s * 0.36);
    c.fill();
    c.restore();
  }

  function web(c, cx, cy, size, quadrant) {
    // quadrant: angle where the web opens (0 = toward bottom-right for top-left corner)
    c.save(); c.translate(cx, cy);
    c.strokeStyle = "rgba(235,235,245,0.42)"; c.lineWidth = 1.1;
    const spokes = 7, a0 = quadrant, a1 = quadrant + Math.PI / 2;
    const angs = [];
    for (let i = 0; i < spokes; i++) angs.push(a0 + ((a1 - a0) * i) / (spokes - 1));
    c.beginPath();
    for (const a of angs) { c.moveTo(0, 0); c.lineTo(Math.cos(a) * size, Math.sin(a) * size); }
    c.stroke();
    for (let ring = 1; ring <= 6; ring++) {
      const rr = (size * ring) / 6.3;
      c.beginPath();
      for (let i = 0; i < angs.length; i++) {
        const x = Math.cos(angs[i]) * rr, y = Math.sin(angs[i]) * rr;
        if (!i) { c.moveTo(x, y); continue; }
        const am = (angs[i] + angs[i - 1]) / 2, sag = rr * 0.86;
        c.quadraticCurveTo(Math.cos(am) * sag, Math.sin(am) * sag, x, y);
      }
      c.stroke();
    }
    c.restore();
  }

  function spider(c, x, y, s, t) {
    c.save(); c.translate(x, y);
    c.strokeStyle = "#1A1220"; c.lineWidth = Math.max(1, s * 0.12); c.lineCap = "round";
    for (let i = 0; i < 4; i++) {
      const wig = Math.sin(t * 4 + i) * 0.12;
      for (const side of [-1, 1]) {
        c.beginPath(); c.moveTo(0, 0);
        c.quadraticCurveTo(side * s * 0.9, -s * 0.4 + i * s * 0.3, side * s * 1.3, s * (0.1 + i * 0.35 + wig));
        c.stroke();
      }
    }
    c.fillStyle = "#1A1220";
    c.beginPath(); c.ellipse(0, s * 0.15, s * 0.5, s * 0.6, 0, 0, TAU); c.fill();
    c.beginPath(); c.arc(0, -s * 0.45, s * 0.3, 0, TAU); c.fill();
    c.fillStyle = "#FF5A5A";
    c.beginPath(); c.arc(-s * 0.1, -s * 0.5, s * 0.07, 0, TAU); c.arc(s * 0.1, -s * 0.5, s * 0.07, 0, TAU); c.fill();
    c.restore();
  }

  function snowdrift(c, S, d) {
    const { W, H, u } = S;
    const yAt = (x) => H - (14 + 7 * Math.sin(x * 0.012 + d.p1) + 5 * Math.sin(x * 0.031 + d.p2) + 3 * Math.sin(x * 0.07 + d.p3)) * u - 6 * u;
    c.save();
    c.fillStyle = "rgba(190,215,245,0.9)";
    c.beginPath(); c.moveTo(0, H);
    for (let x = 0; x <= W + 8; x += 8) c.lineTo(x, yAt(x) + 3 * u);
    c.lineTo(W, H); c.closePath(); c.fill();
    c.fillStyle = "rgba(255,255,255,0.97)";
    c.beginPath(); c.moveTo(0, H);
    for (let x = 0; x <= W + 8; x += 8) c.lineTo(x, yAt(x) + 6 * u);
    c.lineTo(W, H); c.closePath(); c.fill();
    for (const g of d.glints) sparkle(c, g.x, yAt(g.x) + 10 * u, 3 * u, 0.25 + 0.75 * Math.max(0, Math.sin(S.t * 2 + g.p)));
    c.restore();
  }

  function swag(x0, x1, y, sag, u) {
    // returns point function along a hanging string
    return (k) => {
      const x = x0 + (x1 - x0) * k;
      return [x, y + 4 * k * (1 - k) * sag * u];
    };
  }

  /* ------------------------------------------------------------------ */
  /* Particle kinds                                                      */
  /* ------------------------------------------------------------------ */
  const KINDS = {
    snow: {
      spawn(p, S, init) { p.size = (1.1 + p.s * 2.7) * S.u; p.vy = (22 + p.s * 55) * S.u; p.x = R() * S.W; p.y = init ? R() * S.H : -12; },
      step(p, S, dt) { p.y += p.vy * dt; p.x += Math.sin(S.t * 0.8 + p.ph) * 14 * dt * S.u; return p.y < S.H + 12; },
      draw(c, p, S) {
        c.globalAlpha = 0.55 + 0.45 * p.s;
        if (p.s > 0.82) flake(c, p.x, p.y, p.size * 2.2, S.t * 0.4 + p.ph);
        else { c.fillStyle = "#fff"; c.beginPath(); c.arc(p.x, p.y, p.size, 0, TAU); c.fill(); }
        c.globalAlpha = 1;
      },
    },
    leaf: {
      spawn(p, S, init) {
        p.size = (8 + p.s * 9) * S.u; p.vy = (28 + p.s * 30) * S.u; p.x = R() * S.W; p.y = init ? R() * S.H : -25;
        p.c = pick(LEAF); p.maple = R() < 0.45; p.spin = (R() - 0.5) * 2.4; p.rot = R() * TAU;
      },
      step(p, S, dt) {
        p.y += p.vy * dt; p.x += (Math.sin(S.t * 1.1 + p.ph) * 45 + 12) * dt * S.u; p.rot += p.spin * dt;
        return p.y < S.H + 30 && p.x < S.W + 40;
      },
      draw(c, p, S) { leaf(c, p.x, p.y, p.size, p.rot, p.c, p.maple, Math.cos(S.t * 2.2 + p.ph), 0.95); },
    },
    petal: {
      spawn(p, S, init) {
        p.size = (4 + p.s * 4) * S.u; p.vy = (20 + p.s * 25) * S.u; p.x = R() * S.W; p.y = init ? R() * S.H : -12;
        p.c = pick(PETAL); p.rot = R() * TAU; p.spin = (R() - 0.5) * 3;
      },
      step(p, S, dt) { p.y += p.vy * dt; p.x += (Math.sin(S.t * 1.3 + p.ph) * 38 + 18) * dt * S.u; p.rot += p.spin * dt; return p.y < S.H + 15 && p.x < S.W + 20; },
      draw(c, p, S) {
        c.save(); c.translate(p.x, p.y); c.rotate(p.rot); c.scale(1, 0.35 + 0.65 * Math.abs(Math.sin(S.t * 2.5 + p.ph)));
        c.fillStyle = p.c; c.globalAlpha = 0.92; c.beginPath();
        c.moveTo(0, -p.size); c.quadraticCurveTo(p.size, -p.size * 0.2, 0, p.size); c.quadraticCurveTo(-p.size, -p.size * 0.2, 0, -p.size); c.fill();
        c.restore();
      },
    },
    butterfly: {
      spawn(p, S, init) {
        p.dir = R() < 0.5 ? 1 : -1; p.x = init ? R() * S.W : p.dir > 0 ? -30 : S.W + 30; p.y = S.H * (0.2 + R() * 0.6);
        p.vx = p.dir * (35 + R() * 35) * S.u; p.size = (14 + p.s * 9) * S.u; p.c = pick(BUTTERFLY);
      },
      step(p, S, dt) { p.x += p.vx * dt; p.y += Math.sin(S.t * 1.7 + p.ph) * 40 * dt * S.u; return p.x > -50 && p.x < S.W + 50; },
      draw(c, p, S) { butterfly(c, p.x, p.y, p.size, Math.sin(S.t * 14 + p.ph), p.c, p.dir * 0.25 + Math.sin(S.t * 2 + p.ph) * 0.15); },
    },
    firefly: {
      spawn(p, S) { p.x = R() * S.W; p.y = S.H * (0.3 + R() * 0.68); p.life = 7 + R() * 7; p.age = 0; p.size = (2 + p.s * 2) * S.u; },
      step(p, S, dt) {
        p.age += dt; p.x += Math.cos(S.t * 0.6 + p.ph) * 18 * dt * S.u; p.y += Math.sin(S.t * 0.8 + p.ph * 2) * 12 * dt * S.u;
        return p.age < p.life;
      },
      draw(c, p, S) {
        const fade = Math.min(1, p.age, p.life - p.age);
        const a = fade * Math.max(0, Math.sin(S.t * 2.2 + p.ph * 3)) ** 2;
        c.save(); c.globalCompositeOperation = "lighter";
        glow(c, p.x, p.y, p.size * 12, "rgba(200,255,90,1)", a * 0.7);
        c.globalAlpha = a; c.fillStyle = "#F6FFB0"; c.beginPath(); c.arc(p.x, p.y, p.size * 1.3, 0, TAU); c.fill(); c.restore();
      },
    },
    mote: {
      spawn(p, S, init) { p.x = R() * S.W; p.y = init ? R() * S.H : S.H + 8; p.vy = -(10 + p.s * 18) * S.u; p.size = (1.2 + p.s * 2) * S.u; },
      step(p, S, dt) { p.y += p.vy * dt; p.x += Math.sin(S.t * 0.7 + p.ph) * 10 * dt * S.u; return p.y > -10; },
      draw(c, p, S) {
        const a = 0.55 + 0.45 * Math.sin(S.t * 3 + p.ph);
        c.save(); c.globalCompositeOperation = "lighter"; glow(c, p.x, p.y, p.size * 6, "rgba(255,225,140,1)", a * 0.6); c.restore();
        sparkle(c, p.x, p.y, p.size * 2.2, a * 0.9, "#FFF6D8");
      },
    },
    bat: {
      spawn(p, S, init) {
        p.dir = R() < 0.5 ? 1 : -1; p.x = init ? R() * S.W : p.dir > 0 ? -60 : S.W + 60; p.y = S.H * (0.08 + R() * 0.5);
        p.vx = p.dir * (90 + R() * 70) * S.u; p.size = (16 + p.s * 14) * S.u; p.wait = init ? R() * 2 : 0.5 + R() * 4;
      },
      step(p, S, dt) { p.x += p.vx * dt; p.y += Math.sin(S.t * 2.2 + p.ph) * 45 * dt * S.u; return p.x > -80 && p.x < S.W + 80; },
      draw(c, p, S) { bat(c, p.x, p.y, p.size, Math.sin(S.t * 13 + p.ph), p.dir); },
    },
    heart: {
      spawn(p, S, init) {
        p.x = R() * S.W; p.y = init ? S.H * (0.3 + R() * 0.7) : S.H + 20; p.vy = -(30 + p.s * 35) * S.u;
        p.size = (12 + p.s * 16) * S.u; p.c = pick(HEART);
      },
      step(p, S, dt) { p.y += p.vy * dt; p.x += Math.sin(S.t * 1.2 + p.ph) * 22 * dt * S.u; return p.y > -30; },
      draw(c, p, S) { heart(c, p.x, p.y, p.size, p.c, Math.sin(S.t * 1.5 + p.ph) * 0.25, clamp(p.y / (S.H * 0.35), 0, 0.95)); },
    },
    confetti: {
      spawn(p, S, init) {
        p.x = R() * S.W; p.y = init ? R() * S.H : -12; p.vy = (55 + p.s * 70) * S.u; p.c = pick(CONFETTI);
        p.w = (4 + R() * 3) * S.u; p.h = (8 + R() * 5) * S.u; p.rot = R() * TAU; p.spin = (R() - 0.5) * 6;
      },
      step(p, S, dt) { p.y += p.vy * dt; p.x += Math.sin(S.t * 2 + p.ph) * 30 * dt * S.u; p.rot += p.spin * dt; return p.y < S.H + 15; },
      draw(c, p, S) {
        c.save(); c.translate(p.x, p.y); c.rotate(p.rot); c.scale(1, Math.cos(S.t * 5 + p.ph));
        c.fillStyle = p.c; c.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); c.restore();
      },
    },
    shell: {
      spawn(p, S, init) {
        p.x = S.W * (0.12 + R() * 0.76); p.y = S.H + 6; p.g = S.H * 0.55;
        const h = S.H * (0.5 + R() * 0.32); p.vy = -Math.sqrt(2 * p.g * h); p.vx = (R() - 0.5) * 40 * S.u;
        p.wait = init ? R() * 1.5 : 0.4 + R() * 2.5;
      },
      step(p, S, dt) {
        p.vy += p.g * dt; p.y += p.vy * dt; p.x += p.vx * dt;
        if (p.vy >= -20) { burst(S, p.x, p.y); return false; }
        return true;
      },
      draw(c, p, S) {
        c.strokeStyle = "rgba(255,230,180,0.6)"; c.lineWidth = 2 * S.u;
        c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(p.x - p.vx * 0.05, p.y - p.vy * 0.05); c.stroke();
        c.fillStyle = "#FFF4D6"; c.beginPath(); c.arc(p.x, p.y, 2.2 * S.u, 0, TAU); c.fill();
      },
    },
    rain: {
      spawn(p, S, init) {
        p.x = R() * (S.W + 100); p.y = init ? R() * S.H : -30; p.vy = (650 + R() * 350) * S.u; p.vx = -90 * S.u;
        p.len = (14 + p.s * 16) * S.u;
      },
      step(p, S, dt) {
        p.y += p.vy * dt; p.x += p.vx * dt;
        if (p.y > S.H - 4) { if (R() < 0.35) S.fx.push({ k: "ripple", x: p.x, y: S.H - R() * 18 * S.u, r: 0, life: 0.8 }); return false; }
        return true;
      },
      draw(c, p, S) {
        c.strokeStyle = `rgba(200,220,255,${0.25 + 0.3 * p.s})`; c.lineWidth = (1 + p.s) * S.u;
        c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(p.x - p.vx * (p.len / p.vy), p.y - p.len); c.stroke();
      },
    },
  };

  const FX = {
    spark: {
      step(f, S, dt) {
        const drag = Math.pow(0.35, dt); f.vx *= drag; f.vy *= drag; f.vy += 55 * S.u * dt;
        f.px = f.x; f.py = f.y; f.x += f.vx * dt; f.y += f.vy * dt; f.life -= dt; return f.life > 0;
      },
      draw(c, f, S) {
        const a = clamp(f.life / f.max, 0, 1);
        const tw = f.life < 0.5 ? 0.5 + 0.5 * Math.sin(f.life * 40 + f.ph) : 1;
        c.save(); c.globalCompositeOperation = "lighter";
        c.globalAlpha = a * tw; c.strokeStyle = f.c; c.lineWidth = 2.4 * S.u; c.lineCap = "round";
        c.beginPath(); c.moveTo(f.x - f.vx * 0.09, f.y - f.vy * 0.09); c.lineTo(f.x, f.y); c.stroke();
        c.fillStyle = "#fff"; c.beginPath(); c.arc(f.x, f.y, 1.4 * S.u, 0, TAU); c.fill();
        c.restore();
      },
    },
    flash: {
      step(f, S, dt) { f.life -= dt; return f.life > 0; },
      draw(c, f, S) { c.save(); c.globalCompositeOperation = "lighter"; glow(c, f.x, f.y, 150 * S.u, f.c, (f.life / f.max) * 0.45); c.restore(); },
    },
    ripple: {
      step(f, S, dt) { f.r += 26 * S.u * dt; f.life -= dt; return f.life > 0; },
      draw(c, f, S) {
        c.strokeStyle = `rgba(200,220,255,${f.life * 0.45})`; c.lineWidth = 1.2 * S.u;
        c.beginPath(); c.ellipse(f.x, f.y, f.r * 1.8 + 2, f.r * 0.5 + 1, 0, 0, TAU); c.stroke();
      },
    },
  };

  function burst(S, x, y) {
    const pal = S.palette || FIREWORK_USA;
    const c1 = pick(pal), c2 = pick(pal);
    const n = 70 + Math.floor(R() * 40), speed = (170 + R() * 110) * S.u;
    S.fx.push({ k: "flash", x, y, c: c1, life: 0.9, max: 0.9 });
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + R() * 0.05, sp = speed * (0.75 + R() * 0.3);
      const life = 1.3 + R() * 0.8;
      S.fx.push({ k: "spark", x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life, max: life, c: i % 3 ? c1 : c2, ph: R() * 10 });
    }
  }

  /* ------------------------------------------------------------------ */
  /* Borders (static decor is precomputed with a seeded RNG)             */
  /* ------------------------------------------------------------------ */
  const BORDERS = {
    winter: {
      decor(S, r) {
        const ice = [];
        for (let x = 4 * S.u; x < S.W; x += (10 + r() * 14) * S.u) ice.push({ x, w: (6 + r() * 8) * S.u, l: (8 + r() * r() * 46) * S.u });
        const glints = Array.from({ length: Math.round(S.W / (60 * S.u)) }, () => ({ x: r() * S.W, p: r() * 10 }));
        const flakes = [];
        for (const [cx, cy] of [[0, 0], [S.W, 0], [0, S.H], [S.W, S.H]])
          for (let i = 0; i < 5; i++) flakes.push({ x: cx + (cx ? -1 : 1) * (18 + r() * 90) * S.u, y: cy + (cy ? -1 : 1) * (30 + r() * 80) * S.u, r: (6 + r() * 10) * S.u, rot: r() * TAU });
        return { ice, glints, flakes, p1: r() * 9, p2: r() * 9, p3: r() * 9 };
      },
      draw(c, S, d) {
        const { W, u } = S;
        for (const f of d.flakes) { c.globalAlpha = 0.55; flake(c, f.x, f.y, f.r, f.rot + S.t * 0.05); }
        c.globalAlpha = 1;
        for (const i of d.ice) {
          const g = c.createLinearGradient(0, 0, 0, i.l + 10 * u);
          g.addColorStop(0, "rgba(255,255,255,0.95)"); g.addColorStop(1, "rgba(180,215,255,0.35)");
          c.fillStyle = g; c.beginPath(); c.moveTo(i.x - i.w / 2, 6 * u);
          c.quadraticCurveTo(i.x - i.w * 0.15, i.l * 0.6, i.x, i.l + 10 * u);
          c.quadraticCurveTo(i.x + i.w * 0.15, i.l * 0.6, i.x + i.w / 2, 6 * u); c.fill();
          if (i.l > 30 * u) { // drip
            const k = (S.t * 0.6 + i.x) % 3;
            if (k < 1) { c.fillStyle = "rgba(220,240,255,0.8)"; c.beginPath(); c.arc(i.x, i.l + 10 * u + k * k * 60 * u, 1.8 * u, 0, TAU); c.fill(); }
          }
        }
        c.fillStyle = "rgba(255,255,255,0.97)"; c.beginPath(); c.moveTo(0, 0); c.lineTo(0, 8 * u);
        for (let x = 0; x <= W + 10; x += 10) c.lineTo(x, (8 + 4 * Math.sin(x * 0.05 + d.p1) + 2 * Math.sin(x * 0.13)) * u);
        c.lineTo(W, 0); c.closePath(); c.fill();
        snowdrift(c, S, d);
      },
    },
    holiday: {
      decor(S, r) {
        const base = BORDERS.winter.decor(S, r);
        const swags = [], seg = 150 * S.u;
        const n = Math.max(2, Math.round(S.W / seg)), w = S.W / n;
        for (let i = 0; i < n; i++) swags.push({ x0: i * w, x1: (i + 1) * w, sag: 26 + r() * 10 });
        const sideN = Math.max(2, Math.round(S.H / seg)), sh = S.H / sideN;
        return { ...base, swags, sideN, sh };
      },
      draw(c, S, d) {
        const { u, H, W } = S;
        snowdrift(c, S, d);
        let bi = 0;
        const bulbAt = (x, y, ang) => {
          const color = BULB[bi % BULB.length];
          const on = 0.45 + 0.55 * Math.max(0, Math.sin(S.t * 1.6 + bi * 2.1));
          bi++;
          glow(c, x, y + 9 * u, 22 * u, color, on * 0.55);
          c.save(); c.translate(x, y); c.rotate(ang);
          c.fillStyle = "#3B3B3B"; c.fillRect(-2.5 * u, 0, 5 * u, 4 * u);
          c.globalAlpha = 0.55 + 0.45 * on; c.fillStyle = color;
          c.beginPath(); c.ellipse(0, 10 * u, 4.5 * u, 7 * u, 0, 0, TAU); c.fill();
          c.globalAlpha = 0.8 * on; c.fillStyle = "#fff"; c.beginPath(); c.ellipse(-1.4 * u, 7 * u, 1.2 * u, 2.4 * u, 0, 0, TAU); c.fill();
          c.restore(); c.globalAlpha = 1;
        };
        c.strokeStyle = "#1F4D1A"; c.lineWidth = 2.2 * u;
        for (const s of d.swags) {
          const pt = swag(s.x0, s.x1, 3 * u, s.sag, u);
          c.beginPath(); for (let k = 0; k <= 20; k++) { const [x, y] = pt(k / 20); k ? c.lineTo(x, y) : c.moveTo(x, y); } c.stroke();
          for (let k = 1; k < 6; k++) { const [x, y] = pt(k / 6); bulbAt(x, y, (k / 6 - 0.5) * -0.4); }
        }
        // sides
        for (const side of [0, 1]) {
          const x = side ? W - 3 * u : 3 * u;
          c.strokeStyle = "#1F4D1A"; c.beginPath();
          for (let i = 0; i <= 40; i++) { const y = 20 * u + (i / 40) * (H - 80 * u); const xx = x + (side ? -1 : 1) * Math.abs(Math.sin(i / 40 * d.sideN * Math.PI)) * 14 * u; i ? c.lineTo(xx, y) : c.moveTo(xx, y); }
          c.stroke();
          for (let i = 1; i < d.sideN * 3; i++) {
            const k = i / (d.sideN * 3), y = 20 * u + k * (H - 80 * u);
            const xx = x + (side ? -1 : 1) * Math.abs(Math.sin(k * d.sideN * Math.PI)) * 14 * u;
            bulbAt(xx, y, side ? 1.3 : -1.3);
          }
        }
      },
    },
    fall: {
      decor(S, r) {
        const leaves = [];
        const add = (x, y, sc = 1) => leaves.push({ x, y, s: (9 + r() * 10) * S.u * sc, rot: r() * TAU, c: pick(LEAF, r), m: r() < 0.5, p: r() * 9 });
        for (const [cx, cy] of [[0, 0], [S.W, 0], [0, S.H], [S.W, S.H]]) {
          const n = cy ? 34 : 24, rad = (cy ? 150 : 120) * S.u;
          for (let i = 0; i < n; i++) {
            const a = r() * Math.PI / 2, d = rad * Math.sqrt(r()) * (0.25 + 0.75 * r());
            add(cx + (cx ? -1 : 1) * Math.cos(a) * d, cy + (cy ? -1 : 1) * Math.sin(a) * d, 1.15 - d / rad * 0.4);
          }
        }
        for (let x = 0; x < S.W; x += (16 + r() * 22) * S.u) add(x, S.H - r() * r() * 26 * S.u, 0.85);
        leaves.sort((a, b) => a.y - b.y);
        return { leaves };
      },
      draw(c, S, d) { for (const l of d.leaves) leaf(c, l.x, l.y, l.s, l.rot + Math.sin(S.t * 0.9 + l.p) * 0.05, l.c, l.m, 1, 0.97); },
    },
    halloween: {
      decor(S, r) {
        const pumpkins = [
          { x: 70 * S.u, s: 46 * S.u }, { x: 150 * S.u, s: 32 * S.u }, { x: S.W - 80 * S.u, s: 52 * S.u },
          { x: S.W - 165 * S.u, s: 30 * S.u },
        ].map((p) => ({ ...p, f: r() * 10 }));
        const fog = Array.from({ length: 9 }, () => ({ x: r() * S.W, w: (160 + r() * 220) * S.u, h: (30 + r() * 40) * S.u, v: (6 + r() * 10) * S.u, y: S.H - r() * 40 * S.u }));
        return { pumpkins, fog };
      },
      draw(c, S, d) {
        const { W, H, u, t } = S;
        // moon
        const mx = W - 60 * u, my = 58 * u;
        glow(c, mx, my, 110 * u, "rgba(255,210,140,1)", 0.35);
        c.fillStyle = "#FBE7B5"; c.beginPath(); c.arc(mx, my, 36 * u, 0, TAU); c.fill();
        c.fillStyle = "rgba(220,190,130,0.45)";
        for (const [ox, oy, rr] of [[-10, -8, 7], [9, 6, 9], [-4, 15, 4.5], [13, -13, 4]]) { c.beginPath(); c.arc(mx + ox * u, my + oy * u, rr * u, 0, TAU); c.fill(); }
        web(c, 0, 0, 175 * u, 0);
        const sx = 92 * u, sy = 128 * u + Math.sin(t * 0.9) * 22 * u;
        c.strokeStyle = "rgba(235,235,245,0.6)"; c.lineWidth = 1; c.beginPath(); c.moveTo(sx, 48 * u); c.lineTo(sx, sy); c.stroke();
        spider(c, sx, sy + 6 * u, 9 * u, t);
        for (const f of d.fog) {
          const x = ((f.x + t * f.v) % (W + f.w * 2)) - f.w;
          const g = c.createRadialGradient(x, f.y, 0, x, f.y, f.w);
          g.addColorStop(0, "rgba(200,190,230,0.22)"); g.addColorStop(1, "rgba(200,190,230,0)");
          c.save(); c.fillStyle = g; c.translate(x, f.y); c.scale(1, f.h / f.w); c.translate(-x, -f.y);
          c.beginPath(); c.arc(x, f.y, f.w, 0, TAU); c.fill(); c.restore();
        }
        for (const p of d.pumpkins) pumpkin(c, p.x, H - 4 * u, p.s, 0.5 + 0.5 * Math.sin(t * 7 + p.f) * Math.sin(t * 3.3 + p.f * 2));
      },
    },
    valentine: {
      decor(S, r) {
        const hangs = [];
        for (let x = 40 * S.u; x < S.W - 20 * S.u; x += (60 + r() * 30) * S.u) hangs.push({ x, len: (18 + r() * 45) * S.u, s: (16 + r() * 14) * S.u, c: pick(HEART, r), p: r() * 9 });
        const corners = [];
        for (const cx of [0, S.W]) for (let i = 0; i < 9; i++) {
          const a = r() * Math.PI / 2, d = (20 + r() * 110) * S.u;
          corners.push({ x: cx + (cx ? -1 : 1) * Math.cos(a) * d, y: S.H - Math.sin(a) * d, s: (14 + r() * 20) * S.u, c: pick(HEART, r), rot: (r() - 0.5) * 0.8 });
        }
        return { hangs, corners };
      },
      draw(c, S, d) {
        const { W, u, t } = S;
        c.strokeStyle = "rgba(255,190,210,0.7)"; c.lineWidth = 1.6 * u; c.beginPath();
        for (let x = 0; x <= W; x += 8) { const y = 6 * u + Math.abs(Math.sin(x / W * 4 * Math.PI)) * 18 * u; x ? c.lineTo(x, y) : c.moveTo(x, y); }
        c.stroke();
        for (const h of d.hangs) {
          const y0 = 6 * u + Math.abs(Math.sin(h.x / W * 4 * Math.PI)) * 18 * u, sw = Math.sin(t * 1.4 + h.p) * 0.12;
          const ex = h.x + Math.sin(sw) * h.len, ey = y0 + Math.cos(sw) * h.len;
          c.strokeStyle = "rgba(255,220,230,0.6)"; c.lineWidth = 1; c.beginPath(); c.moveTo(h.x, y0); c.lineTo(ex, ey); c.stroke();
          heart(c, ex, ey + h.s * 0.3, h.s, h.c, -sw);
        }
        for (const h of d.corners) heart(c, h.x, h.y, h.s, h.c, h.rot, 0.95);
      },
    },
    spring: {
      decor(S, r) {
        const grass = [];
        for (let x = 0; x < S.W; x += 4 * S.u) grass.push({ x, h: (10 + r() * 24) * S.u, lean: (r() - 0.5) * 10 * S.u, c: pick(["#4E9A2A", "#6BBF3A", "#3B7D1E", "#82CC4B"], r), p: r() * 9 });
        const flowers = [];
        for (let x = 20 * S.u; x < S.W; x += (34 + r() * 50) * S.u) flowers.push({ x, h: (28 + r() * 40) * S.u, r: (6 + r() * 5) * S.u, c: pick(FLOWER, r), p: r() * 9 });
        const blossoms = [];
        for (let i = 0; i < 26; i++) { const k = r(); blossoms.push({ k, off: (r() - 0.5) * 34 * S.u, r: (5 + r() * 5) * S.u, c: pick(PETAL, r) }); }
        return { grass, flowers, blossoms };
      },
      draw(c, S, d) {
        const { H, u, t } = S;
        // cherry branch, top-left
        const bx = (k) => [k * 330 * u, (70 - 60 * k + 18 * Math.sin(k * 5)) * u];
        c.strokeStyle = "#5A3A22"; c.lineCap = "round";
        c.lineWidth = 9 * u; c.beginPath(); for (let i = 0; i <= 20; i++) { const [x, y] = bx(i / 20); c.lineWidth = (9 - i * 0.35) * u; i ? c.lineTo(x, y) : c.moveTo(x, y); } c.stroke();
        c.lineWidth = 3 * u; c.beginPath();
        for (const k of [0.25, 0.5, 0.72]) { const [x, y] = bx(k); c.moveTo(x, y); c.quadraticCurveTo(x + 20 * u, y + 30 * u, x + 45 * u, y + 40 * u); }
        c.stroke();
        for (const b of d.blossoms) { const [x, y] = bx(b.k); flower(c, x + b.off * 0.8, y + b.off, b.r, b.c, Math.sin(t + b.k * 9) * 0.1); }
        // grass + flowers
        for (const g of d.grass) {
          const sw = Math.sin(t * 1.2 + g.p) * 3 * u;
          c.strokeStyle = g.c; c.lineWidth = 2.2 * u; c.beginPath(); c.moveTo(g.x, H);
          c.quadraticCurveTo(g.x + g.lean * 0.3, H - g.h * 0.6, g.x + g.lean + sw, H - g.h); c.stroke();
        }
        for (const f of d.flowers) {
          const sw = Math.sin(t * 1.1 + f.p) * 4 * u;
          c.strokeStyle = "#3E8A20"; c.lineWidth = 2 * u; c.beginPath(); c.moveTo(f.x, H); c.quadraticCurveTo(f.x, H - f.h * 0.5, f.x + sw, H - f.h); c.stroke();
          flower(c, f.x + sw, H - f.h, f.r, f.c, sw * 0.02);
        }
      },
    },
    summer_day: {
      decor(S, r) { return { p: r() * 9 }; },
      draw(c, S, d) {
        const { W, H, u, t } = S;
        const cx = W - 40 * u, cy = 40 * u;
        c.save(); c.globalCompositeOperation = "lighter";
        glow(c, cx, cy, 380 * u, "rgba(255,190,80,1)", 0.38);
        glow(c, cx, cy, 170 * u, "rgba(255,230,150,1)", 0.5);
        c.restore();
        c.save(); c.translate(cx, cy); c.rotate(t * 0.05);
        for (let i = 0; i < 16; i++) {
          const a = (i * TAU) / 16, l = (i % 2 ? 100 : 135) * u;
          c.fillStyle = i % 2 ? "rgba(255,200,80,0.6)" : "rgba(255,220,110,0.75)"; c.beginPath();
          c.moveTo(Math.cos(a - 0.09) * 70 * u, Math.sin(a - 0.09) * 70 * u); c.lineTo(Math.cos(a) * l, Math.sin(a) * l);
          c.lineTo(Math.cos(a + 0.09) * 70 * u, Math.sin(a + 0.09) * 70 * u); c.fill();
        }
        c.restore();
        c.fillStyle = "#FFC94A"; c.beginPath(); c.arc(cx, cy, 64 * u, 0, TAU); c.fill();
        c.fillStyle = "#FFE07A"; c.beginPath(); c.arc(cx - 6 * u, cy + 6 * u, 50 * u, 0, TAU); c.fill();
        // ocean waves along the bottom
        const waves = [["rgba(30,140,190,0.55)", 30, 0.9, 0], ["rgba(40,170,210,0.65)", 22, 1.3, 2], ["rgba(90,205,230,0.75)", 13, 1.8, 4]];
        for (const [col, hgt, sp, ph] of waves) {
          const yAt = (x) => H - hgt * u - Math.sin(x * 0.012 + t * sp + ph + d.p) * 6 * u - Math.sin(x * 0.03 - t * sp * 0.7) * 3 * u;
          c.fillStyle = col; c.beginPath(); c.moveTo(0, H);
          for (let x = 0; x <= W + 10; x += 10) c.lineTo(x, yAt(x));
          c.lineTo(W, H); c.closePath(); c.fill();
          c.strokeStyle = "rgba(255,255,255,0.55)"; c.lineWidth = 2 * u; c.beginPath();
          for (let x = 0; x <= W + 10; x += 10) x ? c.lineTo(x, yAt(x)) : c.moveTo(x, yAt(x));
          c.stroke();
        }
      },
    },
    summer_night: {
      decor(S, r) {
        const stars = Array.from({ length: Math.round(70 * S.W / 1280) }, () => {
          const y = r() * r() * S.H * 0.45, x = r() * S.W;
          return { x, y, r: (0.8 + r() * 1.8) * S.u, p: r() * 10 };
        });
        return { stars };
      },
      draw(c, S, d) {
        const { W, u, t } = S;
        for (const s of d.stars) { const a = 0.35 + 0.65 * Math.max(0, Math.sin(t * 1.3 + s.p)); s.r > 2 * u ? sparkle(c, s.x, s.y, s.r * 2.2, a) : (c.globalAlpha = a, c.fillStyle = "#fff", c.beginPath(), c.arc(s.x, s.y, s.r, 0, TAU), c.fill()); }
        c.globalAlpha = 1;
        const mx = W - 110 * u, my = 95 * u, mr = 46 * u;
        glow(c, mx, my, 150 * u, "rgba(200,220,255,1)", 0.3);
        c.save(); c.beginPath(); c.rect(0, 0, W, S.H); c.arc(mx + mr * 0.45, my - mr * 0.25, mr * 0.95, 0, TAU, true); c.clip("evenodd");
        c.fillStyle = "#F4F1DE"; c.beginPath(); c.arc(mx, my, mr, 0, TAU); c.fill(); c.restore();
      },
    },
    july4: {
      decor(S, r) {
        const swags = [], n = Math.max(2, Math.round(S.W / (210 * S.u))), w = S.W / n;
        for (let i = 0; i < n; i++) swags.push({ x0: i * w, x1: (i + 1) * w, sag: 30 });
        const stars = Array.from({ length: 16 }, () => { const side = r() < 0.5; return { x: side ? r() * 120 * S.u : S.W - r() * 120 * S.u, y: S.H - r() * 120 * S.u, r: (5 + r() * 9) * S.u, p: r() * 9, c: pick(["#FFFFFF", "#FF4A4A", "#5C8DFF"], r) }; });
        return { swags, stars };
      },
      draw(c, S, d) { pennants(c, S, d.swags, ["#D7263D", "#F5F5F5", "#1E4FBF"], true); for (const s of d.stars) star(c, s.x, s.y, s.r, s.c, Math.sin(S.t + s.p) * 0.3); },
    },
    newyear: {
      decor(S, r) {
        const swags = [], n = Math.max(2, Math.round(S.W / (210 * S.u))), w = S.W / n;
        for (let i = 0; i < n; i++) swags.push({ x0: i * w, x1: (i + 1) * w, sag: 30 });
        const pile = [];
        for (let i = 0; i < Math.round(S.W / 4); i++) pile.push({ x: r() * S.W, y: S.H - r() * r() * 22 * S.u, w: (4 + r() * 3) * S.u, h: (6 + r() * 4) * S.u, rot: r() * TAU, c: pick(CONFETTI, r) });
        const hang = [];
        for (let x = 70 * S.u; x < S.W; x += (110 + r() * 80) * S.u) hang.push({ x, len: (50 + r() * 70) * S.u, s: (9 + r() * 7) * S.u, p: r() * 9 });
        return { swags, pile, hang };
      },
      draw(c, S, d) {
        const { u, t } = S;
        for (const h of d.hang) {
          c.strokeStyle = "rgba(255,230,150,0.5)"; c.lineWidth = 1; c.beginPath(); c.moveTo(h.x, 0); c.lineTo(h.x, h.len); c.stroke();
          star(c, h.x, h.len + h.s, h.s, "#FFD700", Math.sin(t * 1.2 + h.p) * 0.6);
          sparkle(c, h.x + h.s, h.len, 4 * u, Math.max(0, Math.sin(t * 3 + h.p)));
        }
        pennants(c, S, d.swags, ["#FFD700", "#C9C9C9", "#1A1A1A", "#F1D88A"], false);
        for (const p of d.pile) { c.save(); c.translate(p.x, p.y); c.rotate(p.rot); c.fillStyle = p.c; c.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); c.restore(); }
      },
    },
    rain: {
      decor(S, r) {
        const drops = [];
        const n = Math.round(150 * (S.W * S.H) / (1280 * 800));
        for (let i = 0; i < n; i++) {
          let x = r() * S.W, y = r() * S.H;
          if (r() < 0.6) { const e = r(); if (e < 0.25) x = r() * 80 * S.u; else if (e < 0.5) x = S.W - r() * 80 * S.u; else if (e < 0.75) y = r() * 70 * S.u; else y = S.H - r() * 70 * S.u; }
          drops.push({ x, y, r: (1.5 + r() * r() * 6) * S.u, p: r() * 9 });
        }
        return { drops };
      },
      draw(c, S, d) {
        for (const dr of d.drops) {
          c.fillStyle = "rgba(220,235,255,0.10)"; c.strokeStyle = "rgba(220,235,255,0.35)"; c.lineWidth = 1;
          c.beginPath(); c.ellipse(dr.x, dr.y, dr.r, dr.r * 1.15, 0, 0, TAU); c.fill(); c.stroke();
          c.fillStyle = `rgba(255,255,255,${0.45 + 0.35 * Math.sin(S.t * 0.8 + dr.p)})`;
          c.beginPath(); c.arc(dr.x - dr.r * 0.35, dr.y - dr.r * 0.4, Math.max(0.6, dr.r * 0.25), 0, TAU); c.fill();
        }
      },
    },
  };

  function pennants(c, S, swags, colors, stars) {
    const { u } = S;
    let i = 0;
    for (const s of swags) {
      const pt = swag(s.x0, s.x1, 4 * u, s.sag, u);
      c.strokeStyle = "rgba(240,240,240,0.8)"; c.lineWidth = 1.5 * u;
      c.beginPath(); for (let k = 0; k <= 20; k++) { const [x, y] = pt(k / 20); k ? c.lineTo(x, y) : c.moveTo(x, y); } c.stroke();
      const n = 7;
      for (let k = 0; k < n; k++) {
        const [x0, y0] = pt((k + 0.1) / n), [x1, y1] = pt((k + 0.9) / n);
        const mx = (x0 + x1) / 2, my = (y0 + y1) / 2, len = 34 * u;
        const sw = Math.sin(S.t * 1.5 + i) * 2 * u;
        const col = colors[i % colors.length];
        c.fillStyle = col; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.lineTo(mx + sw, my + len); c.closePath(); c.fill();
        c.fillStyle = "rgba(0,0,0,0.12)"; c.beginPath(); c.moveTo(mx, my); c.lineTo(x1, y1); c.lineTo(mx + sw, my + len); c.closePath(); c.fill();
        if (stars && col === colors[2]) star(c, mx + sw * 0.3, my + len * 0.35, 6 * u, "#fff");
        i++;
      }
    }
  }

  /* ------------------------------------------------------------------ */
  /* Themes                                                              */
  /* ------------------------------------------------------------------ */
  const THEMES = {
    winter: { label: "Winter", tint: "rgba(120,170,255,0.07)", layers: [["snow", 14]], border: "winter" },
    holiday: { label: "Holiday lights", tint: "rgba(255,90,90,0.05)", layers: [["snow", 9]], border: "holiday" },
    fall: { label: "Fall", tint: "rgba(255,140,40,0.07)", layers: [["leaf", 1.3]], border: "fall" },
    halloween: { label: "Halloween", tint: "rgba(255,110,0,0.08)", layers: [["bat", 0.3], ["leaf", 0.5]], border: "halloween" },
    valentine: { label: "Valentine's Day", tint: "rgba(255,80,140,0.07)", layers: [["heart", 1.4]], border: "valentine" },
    spring: { label: "Spring", tint: "rgba(140,230,170,0.05)", layers: [["petal", 2.6], ["butterfly", 0.18]], border: "spring" },
    summer_day: { label: "Summer", tint: "rgba(255,210,100,0.07)", layers: [["mote", 3], ["butterfly", 0.15]], border: "summer_day" },
    summer_night: { label: "Summer night", tint: "rgba(40,60,160,0.10)", layers: [["firefly", 3.2]], border: "summer_night" },
    july4: { label: "Fourth of July", tint: "rgba(80,120,255,0.05)", layers: [["shell", 0.35]], border: "july4", palette: FIREWORK_USA },
    newyear: { label: "New Year's", tint: "rgba(255,215,0,0.05)", layers: [["confetti", 5], ["shell", 0.3]], border: "newyear", palette: FIREWORK_NY },
    rain: { label: "Rainy day", tint: "rgba(90,120,150,0.12)", layers: [["rain", 16]], border: "rain" },
  };

  const HOLIDAY_THEMES = new Set(["holiday", "halloween", "valentine", "july4", "newyear"]);

  // Checked top to bottom; first match wins. "from"/"to" are MM-DD and may wrap the year.
  const DEFAULT_SCHEDULE = [
    { from: "12-31", to: "01-01", theme: "newyear" },
    { from: "02-07", to: "02-14", theme: "valentine" },
    { from: "07-01", to: "07-05", theme: "july4" },
    { from: "10-15", to: "10-31", theme: "halloween" },
    { from: "12-01", to: "12-30", theme: "holiday" },
    { from: "01-02", to: "03-15", theme: "winter" },
    { from: "03-16", to: "05-31", theme: "spring" },
    { from: "06-01", to: "09-15", theme: "summer" },
    { from: "09-16", to: "11-30", theme: "fall" },
  ];

  const ALIASES = {
    auto: "auto", off: "off", none: "off", disabled: "off",
    winter: "winter", snow: "winter", snowy: "winter",
    holiday: "holiday", holidays: "holiday", holidaylights: "holiday", christmas: "holiday", xmas: "holiday", lights: "holiday",
    fall: "fall", autumn: "fall", thanksgiving: "fall", leaves: "fall",
    halloween: "halloween", spooky: "halloween",
    valentine: "valentine", valentines: "valentine", valentinesday: "valentine",
    spring: "spring", easter: "spring",
    summer: "summer", summerday: "summer_day", summernight: "summer_night",
    july4: "july4", july4th: "july4", fourthofjuly: "july4", "4thofjuly": "july4", independenceday: "july4",
    newyear: "newyear", newyears: "newyear", newyearseve: "newyear", newyearsday: "newyear",
    rain: "rain", rainy: "rain", rainyday: "rain",
  };
  const normalizeTheme = (v) => (v == null ? null : ALIASES[String(v).toLowerCase().replace(/[^a-z0-9]/g, "")] || null);
  const normalizeMode = (v) => {
    const s = String(v || "").toLowerCase();
    if (s.startsWith("border")) return "border";
    if (s.startsWith("fall") || s.startsWith("particle") || s.startsWith("scene") || s.startsWith("ambient")) return "falling";
    if (s.startsWith("both") || s.startsWith("all")) return "both";
    return null;
  };

  function themeForDate(date, custom, replaceDefault) {
    const md = (date.getMonth() + 1) * 100 + date.getDate();
    const toNum = (s) => { const [m, d] = String(s).split("-").map(Number); return m * 100 + d; };
    const list = [...(custom || []), ...(replaceDefault ? [] : DEFAULT_SCHEDULE)];
    for (const e of list) {
      const f = toNum(e.from), t = toNum(e.to);
      const hit = f <= t ? md >= f && md <= t : md >= f || md <= t;
      if (hit) return normalizeTheme(e.theme) || e.theme;
    }
    return "off";
  }

  /* ------------------------------------------------------------------ */
  /* Engine: a single full-screen canvas shared by every card instance   */
  /* ------------------------------------------------------------------ */
  class OverlayEngine {
    constructor() {
      this.canvas = document.createElement("canvas");
      this.canvas.setAttribute("aria-hidden", "true");
      this.canvas.className = "seasonal-overlay-canvas";
      Object.assign(this.canvas.style, { position: "fixed", left: "0", top: "0", width: "100vw", height: "100vh", pointerEvents: "none", zIndex: "3" });
      this.ctx = this.canvas.getContext("2d");
      this.S = { W: 0, H: 0, u: 1, t: 0, fx: [], palette: null };
      this.parts = []; this.theme = "off"; this.mode = "both"; this.density = 5;
      this.topInset = 0; this.maxFps = 30; this.tint = true; this.opacity = 1; this.decor = null; this.border = null;
      this.owners = new Set(); this._raf = 0; this._last = 0; this._acc = 0;
      this._onResize = () => this.resize();
      this._onVis = () => { if (!document.hidden) this._last = performance.now(); };
      this._frame = (now) => this.frame(now);
      this.reduced = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : { matches: false };
      this.respectReduced = true;
    }
    active() {
      let best = null;
      for (const o of this.owners) if (!best || o.priority >= best.priority) best = o;
      return best;
    }
    acquire(owner) {
      this.owners.delete(owner); this.owners.add(owner);
      if (!this.canvas.isConnected) {
        document.body.appendChild(this.canvas);
        window.addEventListener("resize", this._onResize);
        document.addEventListener("visibilitychange", this._onVis);
        this.resize();
        this._last = performance.now();
        this._raf = requestAnimationFrame(this._frame);
      }
      this.active()?.apply(true);
    }
    release(owner) {
      this.owners.delete(owner);
      if (this.owners.size === 0 && this.canvas.isConnected) {
        cancelAnimationFrame(this._raf);
        window.removeEventListener("resize", this._onResize);
        document.removeEventListener("visibilitychange", this._onVis);
        this.canvas.remove();
        this.theme = "off";
      } else this.active()?.apply(true);
    }
    configure(o) {
      const themeChanged = o.theme !== this.theme;
      Object.assign(this, {
        mode: o.mode, density: clamp(Number(o.density) || 5, 0, 10), maxFps: clamp(Number(o.maxFps) || 30, 5, 60),
        tint: o.tint !== false, opacity: clamp(o.opacity ?? 1, 0, 1), respectReduced: o.respectReduced !== false,
      });
      this.canvas.style.zIndex = String(o.zIndex ?? 3);
      const inset = Math.max(0, Number(o.topInset) || 0);
      if (inset !== this.topInset) {
        this.topInset = inset;
        Object.assign(this.canvas.style, { top: inset + "px", height: `calc(100vh - ${inset}px)` });
        if (this.canvas.isConnected) this.resize();
      }
      this.canvas.style.opacity = String(this.opacity);
      if (themeChanged) { this.theme = o.theme; this.reset(); }
    }
    get motionReduced() { return this.respectReduced && this.reduced.matches; }
    resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const W = window.innerWidth, H = Math.max(100, window.innerHeight - this.topInset);
      this.canvas.width = Math.round(W * dpr); this.canvas.height = Math.round(H * dpr);
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      Object.assign(this.S, { W, H, u: clamp(Math.min(W, H) / 800, 0.55, 1.6) });
      this.buildDecor();
    }
    buildDecor() {
      const th = THEMES[this.theme];
      this.border = th ? BORDERS[th.border] : null;
      this.decor = this.border ? this.border.decor(this.S, mulberry32(1234 + this.theme.length * 97)) : null;
    }
    reset() {
      this.parts = []; this.S.fx = [];
      const th = THEMES[this.theme];
      this.S.palette = th?.palette || null;
      this.buildDecor();
      if (!th) { this.ctx.clearRect(0, 0, this.S.W, this.S.H); return; }
      for (const [kind, n] of th.layers) for (let i = 0; i < this.target(n); i++) this.parts.push(this.make(kind, true));
    }
    target(n) { return Math.round(n * this.density); }
    make(kind, init) {
      const p = { kind, s: R(), ph: R() * TAU, wait: 0 };
      KINDS[kind].spawn(p, this.S, init);
      return p;
    }
    frame(now) {
      this._raf = requestAnimationFrame(this._frame);
      if (document.hidden) return;
      const reduced = this.motionReduced;
      const fps = reduced ? 1 : this.maxFps;
      const elapsed = now - this._last;
      if (elapsed < 1000 / fps - 1) return;
      this._last = now;
      const dt = Math.min(elapsed / 1000, 0.1);
      this.step(reduced ? 0 : dt, reduced);
    }
    step(dt, reduced) {
      const { ctx: c, S } = this;
      S.t += dt;
      if (!THEMES[this.theme]) { // idle: clear once, then do nothing
        if (!this._blank) { c.clearRect(0, 0, S.W, S.H); this._blank = true; }
        return;
      }
      c.clearRect(0, 0, S.W, S.H);
      const th = THEMES[this.theme];
      if (!th) return;
      this._blank = false;
      if (this.tint) { c.fillStyle = th.tint; c.fillRect(0, 0, S.W, S.H); }
      const particles = this.mode !== "border" && !reduced;
      if (particles) {
        const counts = {};
        for (const p of this.parts) counts[p.kind] = (counts[p.kind] || 0) + 1;
        for (const [kind, n] of th.layers) {
          const tg = this.target(n);
          if ((counts[kind] || 0) < tg && R() < 0.2) { const p = this.make(kind, false); this.parts.push(p); counts[kind] = (counts[kind] || 0) + 1; }
        }
        for (let i = this.parts.length - 1; i >= 0; i--) {
          const p = this.parts[i], K = KINDS[p.kind];
          if (p.wait > 0) { p.wait -= dt; continue; }
          if (!K.step(p, S, dt)) {
            const layer = th.layers.find((l) => l[0] === p.kind);
            if (!layer || counts[p.kind] > this.target(layer[1])) { this.parts.splice(i, 1); counts[p.kind]--; }
            else this.parts[i] = this.make(p.kind, false);
            continue;
          }
        }
        for (let i = S.fx.length - 1; i >= 0; i--) if (!FX[S.fx[i].k].step(S.fx[i], S, dt)) S.fx.splice(i, 1);
        for (const f of S.fx) FX[f.k].draw(c, f, S);
        for (const p of this.parts) if (p.wait <= 0) KINDS[p.kind].draw(c, p, S);
        c.globalAlpha = 1;
      }
      if (this.mode !== "falling" && this.border) { this.border.draw(c, S, this.decor); c.globalAlpha = 1; }
    }
  }

  const engine = (window.__seasonalOverlayEngine ||= new OverlayEngine());

  /* ------------------------------------------------------------------ */
  /* Controller: config + Home Assistant state -> engine settings.       */
  /* Shared by the Lovelace card, the frontend-module mode and the       */
  /* plain JavaScript API, so all three behave the same way.             */
  /* ------------------------------------------------------------------ */
  const DEFAULTS = {
    theme: "auto",
    mode: "both",
    density: 5,
    opacity: 1,
    tint: true,
    max_fps: 30,
    z_index: 3,
    top_inset: 0,
    respect_reduced_motion: true,
    weather_override: false,
    sun_entity: "sun.sun",
    show_badge: false,
  };
  const PRIORITY = { card: 3, api: 2, module: 1 };

  function validate(config) {
    if (!config || typeof config !== "object") throw new Error("Invalid configuration");
    if (config.theme && !normalizeTheme(config.theme)) throw new Error(`Unknown theme "${config.theme}". Try one of: auto, ${Object.keys(THEMES).join(", ")}, summer, off`);
    if (config.mode && !normalizeMode(config.mode)) throw new Error('mode must be "border", "falling" or "both"');
    if (config.schedule && !Array.isArray(config.schedule)) throw new Error("schedule must be a list of { from, to, theme }");
  }

  class Controller {
    constructor(config, getHass, kind, onChange) {
      this.kind = kind; this.priority = PRIORITY[kind] || 1;
      this.getHass = getHass || (() => null); this.onChange = onChange || (() => {});
      this.setConfig(config);
    }
    setConfig(config) { validate(config); this.config = { ...DEFAULTS, ...config }; this.lastKey = null; this.apply(); }
    state(id) {
      const h = this.getHass();
      return id && h?.states?.[id]?.state;
    }
    resolve() {
      const c = this.config;
      if (c.enabled_entity && this.state(c.enabled_entity) === "off") return { theme: "off", mode: "both", density: c.density };

      let theme = normalizeTheme(this.state(c.theme_entity)) || normalizeTheme(c.theme) || "auto";
      if (theme === "auto") theme = themeForDate(new Date(), c.schedule, c.replace_default_schedule);

      if (c.weather_entity && c.weather_override) {
        const w = this.state(c.weather_entity) || "";
        if (c.weather_override === "always" || !HOLIDAY_THEMES.has(theme)) {
          if (/rain|pour|lightning/.test(w)) theme = "rain";
          else if (/snow|hail/.test(w)) theme = "winter";
        }
      }
      if (theme === "summer") {
        const sun = this.state(c.sun_entity), h = new Date().getHours();
        theme = (sun ? sun === "below_horizon" : h < 7 || h >= 20) ? "summer_night" : "summer_day";
      }
      const mode = normalizeMode(this.state(c.mode_entity)) || normalizeMode(c.mode) || "both";
      const d = Number(this.state(c.density_entity));
      const density = c.density_entity && Number.isFinite(d) ? d : c.density;
      return { theme: THEMES[theme] ? theme : "off", mode, density };
    }
    apply(force) {
      if (!this.started || engine.active() !== this) return;
      const r = this.resolve(), c = this.config, key = JSON.stringify(r);
      if (!force && key === this.lastKey) return;
      this.lastKey = key; this.current = r;
      engine.configure({
        theme: r.theme, mode: r.mode, density: r.density, opacity: c.opacity, tint: c.tint,
        maxFps: c.max_fps, zIndex: c.z_index, topInset: c.top_inset, respectReduced: c.respect_reduced_motion,
      });
      this.onChange(r);
    }
    start() {
      if (this.started) return this;
      this.started = true;
      this.timer = setInterval(() => this.apply(), 60 * 1000); // date and sun changes
      engine.acquire(this);
      return this;
    }
    stop() {
      if (!this.started) return;
      this.started = false; clearInterval(this.timer); engine.release(this);
    }
  }

  /* ------------------------------------------------------------------ */
  /* Way 1: the Lovelace card (per dashboard / per view)                 */
  /* ------------------------------------------------------------------ */
  class SeasonalOverlayCard extends HTMLElement {
    static getStubConfig() { return { theme: "auto", mode: "both", density: 5 }; }

    setConfig(config) {
      validate(config);
      if (!this.shadowRoot) this.attachShadow({ mode: "open" });
      if (!this._ctl) this._ctl = new Controller(config, () => this._hass, "card", () => this._render());
      else this._ctl.setConfig(config);
      if (this.isConnected) this._ctl.start();
      this._render();
    }
    set hass(hass) { this._hass = hass; this._ctl?.apply(); }
    set editMode(v) { this._edit = !!v; this._render(); }
    set preview(v) { this._edit = !!v; this._render(); }
    connectedCallback() { this._ctl?.start(); }
    disconnectedCallback() { this._ctl?.stop(); }
    getCardSize() { return this._ctl?.config.show_badge || this._edit ? 1 : 0; }

    _render() {
      if (!this.shadowRoot || !this._ctl) return;
      const show = this._ctl.config.show_badge || this._edit;
      const r = this._ctl.current || this._ctl.resolve();
      const modeText = { both: "border and falling", border: "border only", falling: "falling only" }[r.mode];
      const label = THEMES[r.theme] ? `${THEMES[r.theme].label} · ${modeText}` : "Off";
      this.shadowRoot.innerHTML = show
        ? `<style>
             :host{display:block}
             .b{display:flex;align-items:center;gap:8px;padding:10px 14px;border-radius:var(--ha-card-border-radius,12px);
                background:var(--ha-card-background,var(--card-background-color,#fff));color:var(--primary-text-color);
                font-size:14px;border:1px solid var(--divider-color,rgba(0,0,0,.12))}
             .d{width:10px;height:10px;border-radius:50%;background:var(--accent-color,#03a9f4)}
           </style><div class="b"><span class="d"></span>Seasonal overlay: ${label}</div>`
        : `<style>:host{display:none}</style>`;
    }
  }

  if (!customElements.get("seasonal-overlay-card")) customElements.define("seasonal-overlay-card", SeasonalOverlayCard);
  window.customCards = window.customCards || [];
  if (!window.customCards.some((c) => c.type === "seasonal-overlay-card")) {
    window.customCards.push({
      type: "seasonal-overlay-card",
      name: "Seasonal Overlay",
      description: "Holiday and seasonal borders plus falling snow, leaves, petals, fireworks and more, drawn over your dashboard.",
      preview: false,
    });
  }

  /* ------------------------------------------------------------------ */
  /* Way 2: on every dashboard, no card. The Seasonal Overlay integration  */
  /* loads this file and creates the controls (switch, theme, mode,       */
  /* density...). Without the integration, the same works with helpers    */
  /* named input_boolean.seasonal_overlay and so on (see the README).     */
  /* Per device: open any HA page with ?seasonal_overlay=off (or =on).   */
  /* ------------------------------------------------------------------ */
  const HELPER_ENTITIES = {
    enabled: "input_boolean.seasonal_overlay",
    theme: "input_select.seasonal_overlay_theme",
    mode: "input_select.seasonal_overlay_mode",
    density: "input_number.seasonal_overlay_density",
    top_inset: "input_number.seasonal_overlay_top_inset",
    weather: "input_boolean.seasonal_overlay_weather",
  };
  const DEVICE_KEY = "seasonal-overlay-device";

  function deviceAllowed() {
    try {
      const q = new URLSearchParams(location.search).get("seasonal_overlay");
      if (q === "off" || q === "on") localStorage.setItem(DEVICE_KEY, q);
      return localStorage.getItem(DEVICE_KEY) !== "off";
    } catch (e) { return true; }
  }

  // The integration's controls each carry an "overlay_role" attribute, so they
  // are found even if their entity IDs were renamed.
  function findIntegrationEntities(states) {
    const ids = {};
    for (const id in states) {
      const role = states[id].attributes?.overlay_role;
      if (role && !ids[role]) ids[role] = id;
    }
    return ids.enabled ? ids : null;
  }

  function moduleConfig(h, cache) {
    if (!cache.ids || !h.states[cache.ids.enabled] || Date.now() - cache.at > 30000) {
      cache.ids = findIntegrationEntities(h.states); cache.at = Date.now();
    }
    const ids = cache.ids || HELPER_ENTITIES;
    const main = h.states[ids.enabled];
    if (!main) return null;
    const inset = Number(h.states[ids.top_inset]?.state);
    return {
      on: main.state !== "off",
      config: {
        enabled_entity: ids.enabled, theme_entity: ids.theme, mode_entity: ids.mode, density_entity: ids.density,
        weather_entity: main.attributes?.weather_entity || "weather.home",
        weather_override: h.states[ids.weather]?.state === "on",
        top_inset: Number.isFinite(inset) ? inset : 56,
      },
    };
  }

  function startModuleWatcher() {
    const root = () => document.querySelector("home-assistant");
    if (!root()) return; // not inside the Home Assistant frontend
    let hass = null, ctl = null;
    const cache = {};
    setInterval(() => {
      const h = root()?.hass;
      if (!h || h === hass) return;
      hass = h;
      const m = moduleConfig(h, cache);
      if (!m || !m.on || !deviceAllowed()) { ctl?.stop(); return; }
      if (!ctl) ctl = new Controller(m.config, () => hass, "module");
      else Object.assign(ctl.config, m.config);
      ctl.start(); ctl.apply();
    }, 1000);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", startModuleWatcher);
  else startModuleWatcher();

  /* ------------------------------------------------------------------ */
  /* Way 3: plain JavaScript on any page (no Home Assistant frontend).    */
  /*   SeasonalOverlay.start({ theme: "auto", density: 5 })               */
  /*   SeasonalOverlay.start({ theme_entity: "input_select.x" }, () => hassLike) */
  /*   SeasonalOverlay.set({ theme: "winter" });  SeasonalOverlay.stop()  */
  /* ------------------------------------------------------------------ */
  let apiCtl = null;
  window.SeasonalOverlay = {
    VERSION,
    THEMES: [...Object.keys(THEMES), "summer", "auto", "off"],
    themeForDate,
    start(config = {}, getHass) {
      const g = typeof getHass === "function" ? getHass : getHass ? () => getHass : null;
      if (apiCtl) { apiCtl.getHass = g || apiCtl.getHass; apiCtl.setConfig(config); }
      else apiCtl = new Controller(config, g, "api");
      return apiCtl.start();
    },
    set(partial) { if (apiCtl) apiCtl.setConfig({ ...apiCtl.config, ...partial }); },
    refresh() { apiCtl?.apply(); },
    stop() { apiCtl?.stop(); },
    engine,
  };

  console.info(`%c SEASONAL-OVERLAY %c v${VERSION} `, "color:#fff;background:#D85A30;font-weight:600", "color:#D85A30;background:#fff");
})();
