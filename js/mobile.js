/* Chez Bobette — version téléphone : intro unique, néon à l'heure, film au défilement, photos, formulaire. */
(() => {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const mq = matchMedia("(max-width: 760px)");
  const reduit = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const B = window.BOBETTE || {};
  const SEQ = window.BOBETTE_SEQ || {};
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lire = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const ecrire = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };

  /* ---------- Intro : une seule fois, 2,5 s au plus ---------- */
  const intro = $("#m-intro");
  if (intro && mq.matches && !reduit && !lire("bobette-intro")) {
    intro.hidden = false;
    document.body.style.overflow = "hidden";
    const jauge = $("#m-intro-jauge");
    const debut = performance.now();
    let fini = false;
    const fermer = () => {
      if (fini) return; fini = true;
      ecrire("bobette-intro", "1");
      jauge.style.width = "100%";
      intro.classList.add("fini");
      document.body.style.overflow = "";
      setTimeout(() => (intro.hidden = true), 500);
    };
    (function avance(t) {
      if (fini) return;
      const p = clamp((t - debut) / 2200, 0, 1);
      jauge.style.width = p * 100 + "%";
      if (p >= 1) fermer(); else requestAnimationFrame(avance);
    })(debut);
    $("#m-intro-passer").addEventListener("click", fermer);
  }

  /* ---------- Néon : ouvert ou fermé selon l'heure réelle ---------- */
  const neon = $(".m-neon");
  function statut() {
    if (!neon) return;
    const now = new Date(), j = now.getDay(), min = now.getHours() * 60 + now.getMinutes();
    const h = (B.heures || []).find((l) => l.j.includes(j));
    let ouvert = false, suite = "";
    if (h) {
      const [oh, om] = h.ouvre.split(":").map(Number), [fh, fm] = h.ferme.split(":").map(Number);
      ouvert = min >= oh * 60 + om && min < fh * 60 + fm;
      suite = ouvert ? "jusqu'à " + fh + " h" : min < oh * 60 + om ? "ouvre à " + oh + " h" : "à demain";
    }
    $("span", neon).textContent = ouvert ? "Ouvert" : "Fermé";
    $("small", neon).textContent = suite;
    neon.classList.toggle("ferme", !ouvert);
  }
  statut(); setInterval(statut, 60000);

  /* ---------- Le film, piloté par le défilement ---------- */
  const sec = $("#m-film"), cv = $("#m-canvas");
  const film = (() => {
    if (!sec || !cv) return { maj() {} };
    const ctx = cv.getContext("2d");
    const NOMS = ["piece", "t1", "laveuse", "t2", "secheuse"].filter((n) => SEQ[n] > 0);
    const liste = [], debut = {};
    NOMS.forEach((n) => { debut[n] = liste.length; for (let i = 1; i <= SEQ[n]; i++) liste.push("assets/" + n + "/" + String(i).padStart(3, "0") + ".webp"); });
    const N = liste.length;
    const bornes = [0, (debut.t1 || 0) + Math.round((SEQ.t1 || 0) * 0.4), debut.t2 ?? N, debut.secheuse ?? N];
    const MOTS = ["Paiement", "Lavage", "Essorage", "Séchage"];
    const NUM = [161, 368, 573, 776];                      // centre des numéros 01 à 04
    const MOT = [[123, 202], [331, 406], [522, 634], [731, 825]]; // largeur des mots
    const imgs = new Array(N);
    const lcd = $("#m-lcd"), jauge = $("#m-jauge"), marque = $("#m-marque"), trait = $("#m-trait");
    let voulue = 0, dessinee = -1, etape = -1;
    const charge = (i) => {
      if (imgs[i]) return imgs[i];
      const im = new Image(); im.decoding = "async"; im.src = liste[i]; imgs[i] = im;
      im.onload = () => { if (i === voulue) dessine(i); };
      return im;
    };
    function dessine(i) {
      let k = i;
      while (k >= 0 && !(imgs[k] && imgs[k].complete && imgs[k].naturalWidth)) k--;
      if (k < 0 || k === dessinee) return;
      const im = imgs[k], s = Math.max(cv.width / im.naturalWidth, cv.height / im.naturalHeight) * 1.02;
      const w = im.naturalWidth * s, h = im.naturalHeight * s;
      ctx.drawImage(im, (cv.width - w) / 2, (cv.height - h) / 2, w, h);
      dessinee = k; cv.classList.add("pret");
    }
    function etiquette() {
      let e = 0; for (let b = 0; b < 4; b++) if (voulue >= bornes[b]) e = b;
      if (e !== etape) {
        etape = e;
        lcd.textContent = e + 1 + "/4 · " + MOTS[e];
        marque.style.setProperty("--x", NUM[e] - 34);
        trait.style.setProperty("--x", MOT[e][0]);
        trait.style.setProperty("--l", MOT[e][1] - MOT[e][0]);
        $$(".m-etape", sec).forEach((b, i) => b.setAttribute("aria-current", i === e ? "step" : "false"));
      }
      const fin = e < 3 ? bornes[e + 1] : N;
      jauge.style.width = (100 * (voulue - bornes[e])) / Math.max(1, fin - bornes[e]) + "%";
    }
    function progres() {
      const r = sec.getBoundingClientRect(), course = sec.offsetHeight - innerHeight;
      return course > 0 ? clamp(-r.top / course, 0, 1) : 0;
    }
    function maj() {
      if (!mq.matches) return;
      const r = sec.getBoundingClientRect();
      if (r.bottom < -innerHeight || r.top > innerHeight * 2) return;
      voulue = Math.min(N - 1, Math.floor(progres() * N));
      charge(voulue); for (let k = 1; k < 8; k++) if (voulue + k < N) charge(voulue + k);
      dessine(voulue); etiquette();
    }
    $$(".m-etape", sec).forEach((b) => b.addEventListener("click", () => {
      const n = +b.dataset.etape, course = sec.offsetHeight - innerHeight;
      scrollTo({ top: sec.offsetTop + (course * (bornes[n] + 1)) / N, behavior: reduit ? "auto" : "smooth" });
    }));
    // lecture automatique : la page défile doucement jusqu'à la fin du film
    const btn = $("#m-lecture"); let lecture = false, dernier = 0;
    const arrete = () => { lecture = false; btn.setAttribute("aria-pressed", "false"); document.documentElement.style.scrollBehavior = ""; };
    function joue(ts) {
      if (!lecture) return;
      const fin = sec.offsetTop + sec.offsetHeight - innerHeight;
      if (dernier) scrollBy(0, ((sec.offsetHeight - innerHeight) / 14000) * (ts - dernier));
      dernier = ts;
      if (scrollY >= fin - 1) return arrete();
      requestAnimationFrame(joue);
    }
    btn.addEventListener("click", () => {
      lecture = !lecture; btn.setAttribute("aria-pressed", String(lecture)); dernier = 0;
      if (!lecture) return arrete();
      const p = progres();
      if (p <= 0 || p >= 1) scrollTo({ top: sec.offsetTop + 2, behavior: "auto" });
      document.documentElement.style.scrollBehavior = "auto";
      requestAnimationFrame(joue);
    });
    addEventListener("touchstart", (e) => { if (lecture && e.target !== btn) arrete(); }, { passive: true });
    etiquette();
    return { maj, charge };
  })();

  /* ---------- Barre du bas : la section en cours est soulignée ---------- */
  const liens = $$(".m-barre a[href^='#']");
  const cibles = { "#m-horaires": ["m-horaires", "m-savoir", "m-film"], "#m-trajet": ["m-trajet"], "#m-tournage": ["m-tournage", "m-fiche", "m-demande"] };
  function barre() {
    const y = innerHeight * 0.4;
    const ici = $$(".mob > section").find((s) => { const r = s.getBoundingClientRect(); return r.top <= y && r.bottom > y; });
    liens.forEach((a) => a.classList.toggle("ici", !!ici && (cibles[a.getAttribute("href")] || []).includes(ici.id)));
  }

  let attente = false;
  addEventListener("scroll", () => {
    if (attente) return; attente = true;
    requestAnimationFrame(() => { attente = false; film.maj(); barre(); });
  }, { passive: true });
  addEventListener("resize", () => { film.maj(); barre(); });
  film.maj(); barre();

  /* ---------- Lieu de tournage : intérieur, façade, ruelle ---------- */
  const photos = $$(".m-photos img"), compteur = $("#m-compteur"), onglets = $$(".m-onglet");
  let photo = 1;
  function montre(i) {
    photo = (i + photos.length) % photos.length;
    photos.forEach((p, k) => (p.hidden = k !== photo));
    onglets.forEach((o, k) => o.setAttribute("aria-pressed", String(k === photo)));
    if (compteur) compteur.textContent = "0" + (photo + 1) + " / 0" + photos.length;
  }
  $$("[data-photo]").forEach((b) => b.addEventListener("click", () => {
    const v = b.dataset.photo;
    montre(v === "+1" ? photo + 1 : v === "-1" ? photo - 1 : +v);
  }));
  let x0 = null;
  const cadre = $(".m-photos");
  if (cadre) {
    cadre.addEventListener("touchstart", (e) => (x0 = e.touches[0].clientX), { passive: true });
    cadre.addEventListener("touchend", (e) => {
      if (x0 === null) return;
      const dx = e.changedTouches[0].clientX - x0; x0 = null;
      if (Math.abs(dx) > 40) montre(photo + (dx < 0 ? 1 : -1));
    });
  }

  /* ---------- Formulaire ---------- */
  const form = $("#m-form"), res = $("#m-resultat");
  if (form) form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!form.checkValidity()) { form.reportValidity(); return; }
    const data = new FormData(form);
    const netlify = /netlify\.app$/.test(location.hostname) || (!/github\.io$|githack\.com$|localhost|127\.0\.0\.1/.test(location.hostname) && location.protocol === "https:");
    const dire = (t) => { res.textContent = t; res.hidden = false; setTimeout(() => (res.hidden = true), 6000); };
    if (netlify) {
      try {
        const r = await fetch("/", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams(data).toString() });
        if (!r.ok) throw 0;
        dire("Merci ! Votre demande est envoyée au propriétaire.");
        form.reset(); return;
      } catch (err) { /* repli courriel */ }
    }
    const lignes = {};
    for (const [k, v] of data.entries()) if (!["form-name", "adresse-web"].includes(k)) lignes[k] = lignes[k] ? lignes[k] + ", " + v : v;
    const corps = Object.entries(lignes).map(([k, v]) => k + " : " + v).join("\n");
    location.href = "mailto:" + ((B.courriel && B.courriel.valeur) || "") + "?subject=" + encodeURIComponent("Demande de tournage — Chez Bobette") + "&body=" + encodeURIComponent(corps);
    dire("Votre courriel s'ouvre avec la demande prête à envoyer.");
  });

  /* ---------- Téléphone : une seule source (infos.js) ---------- */
  const tel = (B.telephone && B.telephone.valeur) || "514 522-2612";
  $$(".mob [data-tel-href]").forEach((a) => (a.href = "tel:+1" + tel.replace(/\D/g, "")));
})();
