/*
  Chez Bobette — le film du premier écran.
  Le défilement de la page fait avancer une suite d'images (comme une vidéo) dessinée dans un seul <canvas>.

  Déroulement :
    1. Le premier écran (lettres, néon, papiers) sert d'écran de chargement : les images de la première séquence
       chargées 1 sur 4 avant de laisser défiler (« Chargement 42 % » sur l'étiquette rouge, puis « Défilez ») ; le reste suit.
       Réseau lent : on libère quand même au bout de 5 s, l'image la plus proche déjà chargée remplace celles qui manquent.
    2. Dès qu'on défile, un hublot s'ouvre dans le papier peint et s'agrandit jusqu'à découvrir toute la vidéo.
    3. Les séquences suivantes se chargent pendant qu'on regarde la première, d'abord 1 image sur 8, puis 4, 2, et toutes.
  Si ce script plante ou si le visiteur a demandé moins de mouvement, la page reste en version fixe.
*/
(function () {
  "use strict";
  window.BobetteFilm = true; // repère pour js/avant.js : le script du film a bien démarré
  const doc = document.documentElement, SEQ = window.BOBETTE_SEQ, api = window.Bobette;
  const parcours = document.getElementById("parcours"), scene = document.getElementById("scene"), toile = document.getElementById("film");
  const versionFixe = () => doc.classList.remove("film", "attente");
  if (!SEQ || !parcours || !scene || !toile || !toile.getContext || window.matchMedia("(prefers-reduced-motion: reduce)").matches) { versionFixe(); return; }

  try {
    const NOMS = ["piece", "t1", "laveuse", "t2", "secheuse"].filter(n => SEQ[n] > 0);
    const images = [], debut = {};
    NOMS.forEach(n => {
      debut[n] = images.length;
      for (let i = 1; i <= SEQ[n]; i++) images.push({ src: "assets/" + n + "/" + String(i).padStart(3, "0") + ".webp", img: null, ok: false });
    });
    const N = images.length;
    if (!N) { versionFixe(); return; }

    const ctx = toile.getContext("2d"), lcd = document.getElementById("v-lcd"), jauge = document.getElementById("v-jauge");
    const rideau = scene.querySelector(".hero"), ecran = document.getElementById("ecran"), invite = document.getElementById("invite");
    const etapes = Array.from(document.querySelectorAll("#etapes .etape")), indice = document.getElementById("v-defile");
    const seuils = [
      (debut.t1 || 0) + Math.round((SEQ.t1 || 0) * 0.4),
      debut.t2 !== undefined ? debut.t2 : N,
      debut.secheuse !== undefined ? debut.secheuse : N
    ];
    const pieceEntree = Math.round((SEQ.piece || 0) * 0.72);
    const MOTS = {
      fr: ["Insérez vos 25 ¢", "Merci · départ", "Lavage", "Essorage", "Séchage", "Terminé", "Chargement", "Défilez"],
      en: ["Insert your quarters", "Thanks · starting", "Wash", "Spin", "Dry", "Done", "Loading", "Scroll"]
    };
    let pret = false, charge = 0, suite = false, dessinee = -1, courant = 0, cible = 0, anim = 0, etapeVue = -1, texteVu = "", inviteVu = "";
    let rayon = 1, ouvert = -1;

    doc.classList.add("film");
    if (!window.location.hash) doc.classList.add("attente"); // pas de blocage si on arrive par un lien vers une section

    const mots = () => MOTS[api && api.langue === "en" ? "en" : "fr"];
    function taille() {
      const r = toile.getBoundingClientRect(), d = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.round(r.width * d), h = Math.round(r.height * d);
      if (w && h && (toile.width !== w || toile.height !== h)) { toile.width = w; toile.height = h; dessinee = -1; }
      const s = scene.getBoundingClientRect(), e = ecran.getBoundingClientRect();
      const cx = e.left - s.left + e.width / 2, cy = e.top - s.top + e.height / 2;
      rayon = Math.hypot(Math.max(cx, s.width - cx), Math.max(cy, s.height - cy)) + 4;
      rideau.style.setProperty("--cx", cx.toFixed(0) + "px"); rideau.style.setProperty("--cy", cy.toFixed(0) + "px");
      ouvert = -1;
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
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(im, (W - w) / 2, (H - h) / 2, w, h);
      dessinee = j;
    }
    function afficher(k) {
      const M = mots();
      const e = k < seuils[0] ? 0 : k < seuils[1] ? 1 : k < seuils[2] ? 2 : 3;
      const de = e === 0 ? 0 : seuils[e - 1], a = e === 3 ? N - 1 : seuils[e];
      const part = Math.min(1, Math.max(0, (k - de) / Math.max(1, a - de)));
      const texte = (e + 1) + "/4 · " + (k >= N - 2 ? M[5] : e === 0 ? (k < pieceEntree ? M[0] : M[1]) : M[e + 1]);
      if (e !== etapeVue) { etapes.forEach((li, i) => li.classList.toggle("on", i === e)); etapeVue = e; }
      if (texte !== texteVu) { lcd.textContent = texte; texteVu = texte; }
      jauge.style.transform = "scaleX(" + part.toFixed(3) + ")";
      const i = pret ? M[7] + " ↓" : M[6] + " " + Math.round(charge * 100) + " %";
      if (invite && i !== inviteVu) { invite.textContent = i; inviteVu = i; }
    }
    function mesure() {
      const r = parcours.getBoundingClientRect(), haut = scene.offsetHeight, y = Math.max(0, parseFloat(getComputedStyle(scene).top) - r.top);
      const course = Math.max(1, r.height - haut), entree = Math.min(haut * 1.2, course * 0.14); // le hublot s'ouvre sur plus d'un écran : on a le temps de regarder l'enseigne
      return { y, course, entree };
    }
    function tic() {
      anim = 0;
      const m = mesure();
      const o = Math.min(1, m.y / m.entree);
      if (o !== ouvert) {
        const doux = 1 - (1 - o) * (1 - o); // rapide au début, doux à la fin
        rideau.style.setProperty("--trou", (doux * rayon).toFixed(1) + "px");
        rideau.style.setProperty("--sortie", Math.min(1, m.y / (m.entree * 0.55)).toFixed(3));
        rideau.style.visibility = o >= 1 ? "hidden" : "";
        ouvert = o;
      }
      const depart = m.entree * 0.45;
      cible = Math.min(1, Math.max(0, (m.y - depart) / (m.course - depart))) * (N - 1);
      courant += (cible - courant) * 0.25;
      if (Math.abs(cible - courant) < 0.3) courant = cible;
      const k = Math.round(courant);
      dessiner(k);
      afficher(k);
      if (k > 6) indice.classList.add("vu");
      if (pret && !suite && m.y > 4 && m.y < m.course) { suite = true; chargerSuite(); }
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
    async function chargerDebut() {
      await charger(0);
      taille(); dessiner(0);
      const n0 = SEQ[NOMS[0]];
      let faites = 1;
      const garde = setTimeout(liberer, 5000); // réseau lent : on ne bloque jamais plus de 5 s
      // d'abord 1 image sur 4 (le mouvement est déjà lisible), puis le reste
      const ordre = [];
      for (let i = 1; i < n0; i++) if (i % 4 === 0) ordre.push(i);
      for (let i = 1; i < n0; i++) if (i % 4 !== 0) ordre.push(i);
      // on laisse défiler dès que 1 image sur 4 est là ; le reste arrive pendant qu'on regarde
      const quart = ordre.filter(i => i % 4 === 0).length;
      const total = quart + 1;
      const lots = ordre.map(i => charger(i).then(() => { faites++; charge = Math.min(1, faites / total); if (!pret) afficher(0); }));
      await Promise.all(lots.slice(0, quart));
      clearTimeout(garde);
      liberer();
      await Promise.all(lots);
    }
    async function chargerSuite() {
      for (let s = 1; s < NOMS.length; s++) {
        const d = debut[NOMS[s]], n = SEQ[NOMS[s]];
        for (const pas of [8, 4, 2, 1]) {
          const lot = [];
          for (let i = 0; i < n; i += pas) lot.push(charger(d + i));
          await Promise.all(lot);
        }
      }
    }

    // un clic vers une section (barre du bas, « Réserver ») ne doit jamais être retenu par le chargement
    document.addEventListener("click", e => { if (e.target.closest && e.target.closest('a[href^="#"]')) doc.classList.remove("attente"); }, true);
    window.addEventListener("scroll", demander, { passive: true });
    window.addEventListener("resize", () => { taille(); demander(); });
    if (api && api.apres) api.apres(() => { texteVu = ""; inviteVu = ""; afficher(Math.round(courant)); });
    taille();
    afficher(0);
    demander();
    // les images du film attendent que le premier écran (papier peint, lettres, polices) soit chargé : pas de bousculade
    if (document.readyState === "complete") chargerDebut().catch(liberer);
    else window.addEventListener("load", () => chargerDebut().catch(liberer), { once: true });
  } catch (e) {
    versionFixe();
  }
})();
