/*
  Chez Bobette — ce qui bouge sur le mur de la page d'accueil.
    1. Les lettres ballons de l'enseigne se balancent comme des pendules : au défilement, au passage de la souris,
       quand on les touche et, sur téléphone, quand on penche l'appareil.
    2. Les languettes du numéro de téléphone s'arrachent, puis l'appel se lance.
    3. À la souris, on peut déplacer les post-it et les photos.
  Tout est facultatif : sans ce fichier, les lettres se balancent doucement en CSS et le reste est immobile.
*/
(function () {
  "use strict";
  const calme = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- 1. les lettres ---------- */
  const guirlande = document.getElementById("guirlande");
  if (guirlande && !calme) {
    const L = Array.from(guirlande.querySelectorAll(".lettre")).map((el, i) => {
      el.style.animation = "none";
      return { el, a: 0, v: (i % 2 ? 1 : -1) * 30, gain: 0.7 + ((i * 37) % 10) / 16, phase: i * 1.7, vitesse: 0.5 + ((i * 53) % 10) / 22, dessine: 99 };
    });
    let visible = true, penche = 0, dernierY = window.scrollY, dernier = 0, boucle = 0;
    function tic(t) {
      boucle = 0;
      const dt = Math.min(0.033, (t - dernier) / 1000 || 0.016); dernier = t;
      const y = window.scrollY, pousse = Math.max(-60, Math.min(60, y - dernierY)); dernierY = y;
      for (const l of L) {
        l.v += pousse * 3.2 * l.gain;                                             // le défilement donne un coup
        const brise = Math.sin(t / 1000 * l.vitesse + l.phase) * 10;              // un courant d'air
        l.v += (-(l.a - penche) * 38 - l.v * 2.2 + brise) * dt;                    // ressort amorti : un pendule
        l.a = Math.max(-26, Math.min(26, l.a + l.v * dt));
        if (Math.abs(l.a - l.dessine) > 0.02) { l.el.style.transform = "rotate(" + l.a.toFixed(2) + "deg)"; l.dessine = l.a; }
      }
      if (visible && !document.hidden) boucle = requestAnimationFrame(tic);
    }
    const lancer = () => { if (!boucle && visible) { dernier = performance.now(); boucle = requestAnimationFrame(tic); } };
    new IntersectionObserver(e => { visible = e[0].isIntersecting; lancer(); }).observe(guirlande);
    document.addEventListener("visibilitychange", lancer);
    // la souris bouscule les lettres qu'elle frôle ; un toucher donne une pichenette
    guirlande.parentNode.addEventListener("pointermove", e => {
      if (e.pointerType !== "mouse") return;
      for (const l of L) {
        const r = l.el.getBoundingClientRect();
        if (e.clientX > r.left - 20 && e.clientX < r.right + 20 && e.clientY > r.top && e.clientY < r.bottom + 30) l.v += e.movementX * 2.4;
      }
    });
    L.forEach(l => l.el.addEventListener("pointerdown", e => {
      const r = l.el.getBoundingClientRect();
      l.v += (e.clientX < r.left + r.width / 2 ? 1 : -1) * 170;
    }));
    // téléphone penché : les lettres pendent vers le bas (Android ; iOS demande une permission, on s'en passe)
    if (window.DeviceOrientationEvent && typeof DeviceOrientationEvent.requestPermission !== "function") {
      window.addEventListener("deviceorientation", e => { if (e.gamma != null) penche = Math.max(-20, Math.min(20, -e.gamma * 0.6)); });
    }
    lancer();
  }

  /* ---------- 2. les languettes ----------
     On tire une languette vers le bas : elle s'étire, résiste, puis se déchire le long des perforations
     et tombe en tournoyant, avec un petit bruit de papier. Un simple toucher l'arrache aussi.
     Ensuite, l'appel se lance. Tant que personne n'y a touché, une languette se balance de temps en temps. */
  const languettes = document.getElementById("languettes");
  if (languettes) {
    const lien = () => document.querySelector(".gros-tel a");
    const appeler = () => { const l = lien(); if (l) window.location.href = l.getAttribute("href"); };
    let touche = false, tenue = null;

    // le bruit d'une déchirure : un souffle filtré, haché en petits craquements
    function bruit() {
      try {
        const C = window.AudioContext || window.webkitAudioContext; if (!C) return;
        const ac = bruit.ac || (bruit.ac = new C()), n = Math.floor(ac.sampleRate * 0.32), buf = ac.createBuffer(1, n, ac.sampleRate), d = buf.getChannelData(0);
        for (let i = 0; i < n; i++) { const t = i / n; d[i] = (Math.random() * 2 - 1) * (Math.random() < 0.35 ? 1 : 0.25) * Math.pow(1 - t, 1.6); }
        const src = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
        f.type = "bandpass"; f.frequency.value = 2600; f.Q.value = 0.7; g.gain.value = 0.35;
        src.buffer = buf; src.connect(f); f.connect(g); g.connect(ac.destination); src.start();
      } catch (e) { /* pas de son, tant pis */ }
    }
    // la languette part : une copie tombe par-dessus la page, l'originale devient un bout déchiré
    function arracher(l, vx, vy) {
      touche = true;
      if (calme) { l.classList.add("partie"); appeler(); return; }
      const r = l.getBoundingClientRect(), c = l.cloneNode(true);
      c.classList.remove("tire", "invite"); c.classList.add("volante");
      Object.assign(c.style, { left: r.left + "px", top: r.top + "px", width: r.width + "px", height: r.height + "px", transform: "none" });
      document.body.appendChild(c);
      l.style.cssText = ""; l.classList.remove("tire"); l.classList.add("partie"); l.blur();
      bruit();
      if (navigator.vibrate) navigator.vibrate(18);
      let x = 0, y = 0, a = 0, va = (vx >= 0 ? 1 : -1) * (140 + Math.random() * 160), t0 = performance.now(), avant = t0;
      vx = vx || (Math.random() - 0.5) * 120; vy = Math.max(vy || 0, 60);
      (function chute(t) {
        const dt = Math.min(0.033, (t - avant) / 1000); avant = t;
        vy += 2200 * dt; vx *= 0.985; va *= 0.99;
        x += vx * dt + Math.sin((t - t0) / 140) * 0.9; y += vy * dt; a += va * dt;
        const age = (t - t0) / 1000;
        c.style.transform = "translate(" + x.toFixed(1) + "px," + y.toFixed(1) + "px) rotate(" + a.toFixed(1) + "deg)";
        c.style.opacity = String(Math.max(0, 1 - Math.max(0, age - 0.7) * 2.5));
        if (age < 1.2 && r.top + y < window.innerHeight + 200) requestAnimationFrame(chute); else c.remove();
      })(t0);
      setTimeout(appeler, 650);
    }
    // tirer avec le doigt ou la souris
    languettes.addEventListener("pointerdown", e => {
      const l = e.target.closest(".languette");
      if (!l || l.classList.contains("partie")) return;
      e.preventDefault();
      l.setPointerCapture(e.pointerId);
      tenue = { l, x0: e.clientX, y0: e.clientY, dy: 0, dx: 0, vy: 0, t: performance.now(), y: e.clientY, bouge: false };
      l.classList.add("tire"); l.classList.remove("invite");
    });
    languettes.addEventListener("pointermove", e => {
      if (!tenue) return;
      const h = tenue, now = performance.now();
      h.vy = (e.clientY - h.y) / Math.max(1, now - h.t) * 1000; h.t = now; h.y = e.clientY;
      h.dy = Math.max(0, e.clientY - h.y0); h.dx = e.clientX - h.x0;
      if (h.dy > 4 || Math.abs(h.dx) > 4) h.bouge = true;
      // le papier résiste : il s'étire de moins en moins, se soulève et suit un peu le doigt de côté
      const tir = 22 * Math.log1p(h.dy / 22);
      h.l.style.setProperty("--ty", tir.toFixed(1) + "px");
      h.l.style.setProperty("--sy", (1 + tir / 900).toFixed(3));
      h.l.style.setProperty("--rx", (-Math.min(28, tir * 0.8)).toFixed(1) + "deg");
      h.l.style.setProperty("--rz", Math.max(-10, Math.min(10, h.dx * 0.12)).toFixed(1) + "deg");
      if (h.dy > 70) { tenue = null; arracher(h.l, h.dx * 4, Math.max(h.vy, 300)); }
    });
    const lacher = e => {
      if (!tenue) return;
      const h = tenue; tenue = null;
      if (!h.bouge) { arracher(h.l, 0, 120); return; }
      // pas assez tiré : la languette revient en place
      h.l.classList.remove("tire"); ["--ty", "--sy", "--rx", "--rz"].forEach(v => h.l.style.removeProperty(v));
    };
    languettes.addEventListener("pointerup", lacher);
    languettes.addEventListener("pointercancel", lacher);
    // une languette se balance de temps en temps, tant qu'on n'y a pas touché
    if (!calme) setInterval(() => {
      if (touche || document.hidden) return;
      const r = languettes.getBoundingClientRect(); if (r.bottom < 0 || r.top > innerHeight) return;
      const libres = Array.from(languettes.querySelectorAll(".languette:not(.partie)"));
      const l = libres[Math.floor(Math.random() * libres.length)]; if (!l) return;
      l.classList.remove("invite"); void l.offsetWidth; l.classList.add("invite");
    }, 3200);
  }

  /* ---------- 3. déplacer les papiers, à la souris seulement ---------- */
  // Écoute au niveau du document : les post-it sont réécrits quand on change de langue.
  if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
    const etats = new WeakMap();
    let el = null, e0 = null, bouge = false;
    const poser = () => { el.style.transform = "translate(" + e0.x + "px," + e0.y + "px) rotate(" + e0.angle + "deg)"; };
    document.addEventListener("pointerdown", e => {
      const cible = e.target.closest && e.target.closest(".postits li, .polaroid");
      if (!cible || e.pointerType !== "mouse" || e.button !== 0) return;
      el = cible; e0 = etats.get(el);
      if (!e0) { const m = new DOMMatrixReadOnly(getComputedStyle(el).transform); e0 = { x: 0, y: 0, angle: Math.atan2(m.b, m.a) * 180 / Math.PI }; etats.set(el, e0); }
      e0.dx = e.clientX - e0.x; e0.dy = e.clientY - e0.y; bouge = false;
      el.classList.add("tenu"); e.preventDefault();
    });
    document.addEventListener("pointermove", e => {
      if (!el) return;
      e0.x = e.clientX - e0.dx; e0.y = e.clientY - e0.dy;
      if (Math.abs(e.movementX) + Math.abs(e.movementY) > 2) bouge = true;
      poser();
    });
    const lacher = () => {
      if (!el) return;
      el.classList.remove("tenu");
      if (bouge) { e0.angle += (Math.random() - 0.5) * 5; poser(); }
      el = null;
    };
    document.addEventListener("pointerup", lacher);
    document.addEventListener("pointercancel", lacher);
    document.addEventListener("click", e => { if (bouge && e.target.closest(".polaroid")) { e.preventDefault(); e.stopPropagation(); } bouge = false; }, true);
    document.addEventListener("dragstart", e => { if (e.target.closest && e.target.closest(".polaroid")) e.preventDefault(); });
  }
})();
