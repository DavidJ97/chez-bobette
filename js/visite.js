/*
  Chez Bobette — la visite animée.
  Le défilement de la page fait avancer une suite d'images (comme une vidéo) dessinée dans un seul <canvas>.

  Chargement :
    1. toutes les images de la première séquence sont chargées AVANT de laisser défiler (afficheur « Chargement 42 % ») ;
    2. les séquences suivantes arrivent ensuite, une à la fois, d'abord 1 image sur 8, puis 4, 2, et toutes.
  Si une image manque encore, on dessine la plus proche déjà chargée : jamais d'écran noir.
  Si ce script plante ou si le visiteur a demandé moins de mouvement, la page reste en version fixe.
*/
(function () {
  "use strict";
  const doc = document.documentElement, SEQ = window.BOBETTE_SEQ, api = window.Bobette;
  const parcours = document.getElementById("parcours"), toile = document.getElementById("film");
  const versionFixe = () => doc.classList.remove("film", "attente");
  if (!SEQ || !parcours || !toile || !toile.getContext || window.matchMedia("(prefers-reduced-motion: reduce)").matches) { versionFixe(); return; }

  try {
    const NOMS = ["piece", "t1", "laveuse", "t2", "secheuse"].filter(n => SEQ[n] > 0);
    // téléphone debout : images 4:3 allégées ; sinon images 16:9
    const base = window.matchMedia("(max-aspect-ratio: 1/1)").matches ? "assets/m/" : "assets/";
    const images = [], debut = {};
    NOMS.forEach(n => {
      debut[n] = images.length;
      for (let i = 1; i <= SEQ[n]; i++) images.push({ src: window.__IMG[n][i - 1], img: null, ok: false });
    });
    const N = images.length;
    if (!N) { versionFixe(); return; }

    const ctx = toile.getContext("2d"), lcd = document.getElementById("v-lcd"), jauge = document.getElementById("v-jauge");
    const etapes = Array.from(document.querySelectorAll("#etapes .etape")), indice = document.getElementById("v-defile");
    // où commence chaque étape, en numéro d'image : payer, laver, essorer, sécher
    const seuils = [
      (debut.t1 || 0) + Math.round((SEQ.t1 || 0) * 0.4),
      debut.t2 !== undefined ? debut.t2 : N,
      debut.secheuse !== undefined ? debut.secheuse : N
    ];
    const pieceEntree = Math.round((SEQ.piece || 0) * 0.72);
    const MOTS = {
      fr: ["Insérez vos 25 ¢", "Merci · départ", "Lavage", "Essorage", "Séchage", "Terminé", "Chargement"],
      en: ["Insert your quarters", "Thanks · starting", "Wash", "Spin", "Dry", "Done", "Loading"]
    };
    let pret = false, charge = 0, dessinee = -1, courant = 0, cible = 0, anim = 0, etapeVue = -1, texteVu = "";

    doc.classList.add("film", "attente");

    function taille() {
      const r = toile.getBoundingClientRect(), d = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.round(r.width * d), h = Math.round(r.height * d);
      if (w && h && (toile.width !== w || toile.height !== h)) { toile.width = w; toile.height = h; dessinee = -1; }
    }
    function proche(k) {
      if (images[k].ok) return k;
      for (let d = 1; d < N; d++) {
        if (k - d >= 0 && images[k - d].ok) return k - d;
        if (k + d < N && images[k + d].ok) return k + d;
      }
      return -1;
    }
    function dessiner(k) {
      const j = proche(k);
      if (j < 0 || j === dessinee || !toile.width) return;
      const im = images[j].img, W = toile.width, H = toile.height;
      const e = Math.max(W / im.naturalWidth, H / im.naturalHeight), w = im.naturalWidth * e, h = im.naturalHeight * e;
      ctx.drawImage(im, (W - w) / 2, (H - h) / 2, w, h);
      dessinee = j;
    }
    function afficher(k) {
      const lg = api && api.langue === "en" ? "en" : "fr", M = MOTS[lg];
      let texte, part;
      if (!pret) { texte = M[6] + " " + Math.round(charge * 100) + " %"; part = charge; }
      else {
        const e = k < seuils[0] ? 0 : k < seuils[1] ? 1 : k < seuils[2] ? 2 : 3;
        const de = e === 0 ? 0 : seuils[e - 1], a = e === 3 ? N - 1 : seuils[e];
        part = Math.min(1, Math.max(0, (k - de) / Math.max(1, a - de)));
        texte = k >= N - 2 ? M[5] : e === 0 ? (k < pieceEntree ? M[0] : M[1]) : M[e + 1];
        texte = (e + 1) + "/4 · " + texte;
        if (e !== etapeVue) { etapes.forEach((li, i) => li.classList.toggle("on", i === e)); etapeVue = e; }
      }
      if (texte !== texteVu) { lcd.textContent = texte; texteVu = texte; }
      jauge.style.transform = "scaleX(" + part.toFixed(3) + ")";
    }
    function progression() {
      const r = parcours.getBoundingClientRect(), course = r.height - window.innerHeight;
      return course > 0 ? Math.min(1, Math.max(0, -r.top / course)) : 0;
    }
    function tic() {
      anim = 0;
      cible = progression() * (N - 1);
      courant += (cible - courant) * 0.25;
      if (Math.abs(cible - courant) < 0.3) courant = cible;
      const k = Math.round(courant);
      dessiner(k);
      afficher(k);
      if (pret && k > 6) indice.classList.add("vu");
      if (courant !== cible) demander();
    }
    function demander() { if (!anim) anim = requestAnimationFrame(tic); }

    function charger(k) {
      return new Promise(fin => {
        const f = images[k];
        if (f.img) { fin(); return; }
        const im = new Image();
        f.img = im;
        im.decoding = "async";
        im.onload = () => { f.ok = true; if (Math.abs(k - cible) <= Math.abs(dessinee - cible)) demander(); fin(); };
        im.onerror = fin;
        im.src = f.src;
      });
    }
    function liberer() {
      if (pret) return;
      pret = true;
      doc.classList.remove("attente");
      doc.dataset.film = "pret"; // repère pour les tests
      demander();
    }
    async function toutCharger() {
      await charger(0);
      taille(); dessiner(0);
      // 1. la première séquence en entier, avec l'avancement à l'afficheur
      const n0 = SEQ[NOMS[0]];
      let faites = 1;
      const garde = setTimeout(liberer, 12000); // réseau très lent : on ne bloque pas plus de 12 s
      await Promise.all(Array.from({ length: n0 - 1 }, (_, i) => charger(i + 1).then(() => { charge = ++faites / n0; if (!pret) afficher(0); })));
      clearTimeout(garde);
      liberer();
      // 2. les suivantes, du plus grossier au plus fin
      for (let s = 1; s < NOMS.length; s++) {
        const d = debut[NOMS[s]], n = SEQ[NOMS[s]];
        for (const pas of [8, 4, 2, 1]) {
          const lot = [];
          for (let i = 0; i < n; i += pas) lot.push(charger(d + i));
          await Promise.all(lot);
        }
      }
    }

    window.addEventListener("scroll", demander, { passive: true });
    window.addEventListener("resize", () => { taille(); demander(); });
    if (api && api.apres) api.apres(() => { texteVu = ""; afficher(Math.round(courant)); });
    taille();
    afficher(0);
    toutCharger().catch(liberer);
  } catch (e) {
    versionFixe();
  }
})();
