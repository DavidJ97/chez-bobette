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

  /* ---------- 2. les languettes ---------- */
  const languettes = document.getElementById("languettes");
  if (languettes) {
    languettes.addEventListener("click", e => {
      const l = e.target.closest(".languette");
      if (!l || l.classList.contains("arrachee")) return;
      l.classList.add("arrachee");
      const lien = document.querySelector(".gros-tel a");
      setTimeout(() => { if (lien) window.location.href = lien.getAttribute("href"); }, calme ? 0 : 520);
    });
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
