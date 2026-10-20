/* Chez Bobette — v2. Aucune bibliothèque : défilement, film, trajet, langue, menu. */
(() => {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const B = window.BOBETTE || {};
  const SEQ = window.BOBETTE_SEQ || {};
  const reduit = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  let LG = "fr";
  try { LG = localStorage.getItem("bobette-lg") === "en" ? "en" : "fr"; } catch (e) {}

  /* ---------- Progression d'une section collante (0 → 1) ---------- */
  function progres(sec) {
    const r = sec.getBoundingClientRect();
    const course = sec.offsetHeight - innerHeight;
    return course > 0 ? clamp(-r.top / course, 0, 1) : 0;
  }
  const t = (fr, en) => (LG === "en" ? en : fr);

  /* ============================================================
     INFOS (infos.js) : statut, heures, prix, fiche, téléphone
     ============================================================ */
  const ex = (o) => (B.mentionsExemple && o && o.exemple ? ' <span class="ex">' + t("exemple", "example") + "</span>" : "");
  const hFmt = (h) => { const [H, M] = h.split(":"); return LG === "en" ? (+H % 12 || 12) + (M !== "00" ? ":" + M : "") + (+H < 12 ? " a.m." : " p.m.") : +H + " h" + (M !== "00" ? " " + M : ""); };

  function remplir() {
    const tel = (B.telephone && B.telephone.valeur) || "514 522-2612";
    const telHref = "tel:+1" + tel.replace(/\D/g, "");
    $$("[data-tel-href]").forEach((a) => (a.href = telHref));
    $$("[data-tel]").forEach((a) => { a.href = telHref; a.textContent = tel; });

    // Statut ouvert / fermé
    const now = new Date();
    const j = now.getDay(), min = now.getHours() * 60 + now.getMinutes();
    const ligne = (B.heures || []).find((h) => h.j.includes(j));
    let ouvert = false, suite = "";
    if (ligne) {
      const [oh, om] = ligne.ouvre.split(":").map(Number), [fh, fm] = ligne.ferme.split(":").map(Number);
      ouvert = min >= oh * 60 + om && min < fh * 60 + fm;
      suite = ouvert ? t("jusqu'à ", "until ") + hFmt(ligne.ferme) : min < oh * 60 + om ? t("ouvre à ", "opens at ") + hFmt(ligne.ouvre) : t("à demain", "see you tomorrow");
    }
    $$("[data-statut]").forEach((e) => (e.textContent = ouvert ? t("Ouvert", "Open") : t("Fermé", "Closed")));
    $$("[data-statut-suite]").forEach((e) => (e.textContent = suite));
    $$(".neon").forEach((n) => n.classList.toggle("ferme", !ouvert));

    const dl = $("#i-heures");
    if (dl) dl.innerHTML = (B.heures || []).map((h) => "<dt>" + t(h.jours, h.jours_en) + "</dt><dd>" + hFmt(h.ouvre) + " – " + hFmt(h.ferme) + ex(h) + "</dd>").join("");
    const ach = $("#i-acha");
    if (ach) ach.innerHTML = B.achalandage ? t(B.achalandage.texte, B.achalandage.texte_en) + ex(B.achalandage) : "";
    const pr = $("#i-prix");
    if (pr) pr.innerHTML = (B.tarifs || []).map((p) => '<li><span class="ap-nom">' + t(p.nom, p.nom_en) + '</span><span class="ap-prix">' + t(p.prix, p.prix_en) + ex(p) + "</span>" + (p.note ? '<span class="ap-note">' + t(p.note, p.note_en) + "</span>" : "") + "</li>").join("");
    const fi = $("#tn-fiche");
    if (fi) fi.innerHTML = (B.lieu || []).map((l) => "<dt>" + t(l.nom, l.nom_en) + "</dt><dd>" + (t(l.valeur, l.valeur_en) || t("À confirmer avec le propriétaire", "To be confirmed with the owner")) + "</dd>").join("");
    $$("[data-provisoire]").forEach((e) => (e.hidden = !B.mentionsExemple && !B.visiteProvisoire));
  }

  /* ============================================================
     LANGUE
     ============================================================ */
  const ATTRS = [["data-en", null], ["data-en-aria", "aria-label"], ["data-en-alt", "alt"], ["data-en-text", null]];
  function langue(lg) {
    LG = lg;
    document.documentElement.lang = lg === "en" ? "en-CA" : "fr-CA";
    ATTRS.forEach(([a, cible]) => $$("[" + a + "]").forEach((el) => {
      if (cible) {
        if (!el.dataset.fr) el.dataset.fr = el.getAttribute(cible) || "";
        el.setAttribute(cible, lg === "en" ? el.getAttribute(a) : el.dataset.fr);
      } else {
        if (el.dataset.frHtml === undefined) el.dataset.frHtml = el.innerHTML;
        el.innerHTML = lg === "en" ? el.getAttribute(a) : el.dataset.frHtml;
      }
    }));
    $$(".lg").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.lg === lg)));
    try { localStorage.setItem("bobette-lg", lg); } catch (e) {}
    remplir();
    film.etiquette(true);
    trajet.texte(true);
    sectionCourante(true);
  }
  $$(".lg").forEach((b) => b.addEventListener("click", () => langue(b.dataset.lg)));

  /* ============================================================
     MENU QU'ON TIRE
     ============================================================ */
  const tirette = $("#tirette"), menu = $("#menu");
  function ouvrirMenu(o) {
    if (o) menu.hidden = false;
    requestAnimationFrame(() => menu.classList.toggle("ouvert", o));
    tirette.setAttribute("aria-expanded", String(o));
    document.body.style.overflow = o ? "hidden" : "";
    if (o) setTimeout(() => { const a = $("a", menu); a && a.focus({ preventScroll: true }); }, 400);
    else setTimeout(() => { if (!menu.classList.contains("ouvert")) menu.hidden = true; }, 700);
  }
  let y0 = null, tire = 0, glisse = false;
  tirette.addEventListener("pointerdown", (e) => { y0 = e.clientY; tire = 0; glisse = false; tirette.setPointerCapture(e.pointerId); });
  tirette.addEventListener("pointermove", (e) => {
    if (y0 === null) return;
    tire = clamp(e.clientY - y0, 0, 120);
    if (tire > 4) { glisse = true; tirette.classList.add("tiree"); tirette.style.setProperty("--tire", tire + "px"); }
  });
  tirette.addEventListener("pointerup", () => {
    tirette.classList.remove("tiree"); tirette.style.removeProperty("--tire");
    if (!glisse || tire > 50) ouvrirMenu(true);
    y0 = null;
  });
  tirette.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); ouvrirMenu(true); } });
  $("#m-fermer").addEventListener("click", () => ouvrirMenu(false));
  $$("a", menu).forEach((a) => a.addEventListener("click", () => ouvrirMenu(false)));
  addEventListener("keydown", (e) => { if (e.key === "Escape" && menu.classList.contains("ouvert")) { ouvrirMenu(false); tirette.focus(); } });

  /* ============================================================
     LE FILM : images au défilement dans le hublot
     ============================================================ */
  const film = (() => {
    const sec = $("#film"), cv = $("#f-canvas"), ctx = cv.getContext("2d");
    const NOMS = ["piece", "t1", "laveuse", "t2", "secheuse"].filter((n) => SEQ[n] > 0);
    const liste = [], debut = {};
    NOMS.forEach((n) => { debut[n] = liste.length; for (let i = 1; i <= SEQ[n]; i++) liste.push("assets/" + n + "/" + String(i).padStart(3, "0") + ".webp"); });
    const N = liste.length;
    const bornes = [0, (debut.t1 || 0) + Math.round((SEQ.t1 || 0) * 0.4), debut.t2 ?? N, debut.secheuse ?? N];
    const MOTS = [["Paiement", "Payment"], ["Lavage", "Wash"], ["Essorage", "Spin"], ["Séchage", "Dry"]];
    const imgs = new Array(N);
    let dessinee = -1, etape = -1;
    const lcd = $("#f-lcd"), jauge = $("#f-jauge"), lis = $$("#f-etapes li");

    function charge(i) {
      if (imgs[i]) return imgs[i];
      const im = new Image(); im.decoding = "async"; im.src = liste[i]; imgs[i] = im;
      im.onload = () => { if (i === voulue) dessine(i); };
      return im;
    }
    let voulue = 0;
    function dessine(i) {
      let k = i;
      while (k >= 0 && !(imgs[k] && imgs[k].complete && imgs[k].naturalWidth)) k--;
      if (k < 0 || k === dessinee) return;
      ctx.drawImage(imgs[k], 0, 0, cv.width, cv.height); dessinee = k;
    }
    function etiquette(force) {
      const i = voulue;
      let e = 0; for (let b = 0; b < 4; b++) if (i >= bornes[b]) e = b;
      if (e !== etape || force) {
        etape = e;
        lcd.textContent = e + 1 + "/4 · " + t(MOTS[e][0], MOTS[e][1]);
        lis.forEach((li, n) => li.classList.toggle("actif", n === e));
      }
      const fin = e < 3 ? bornes[e + 1] : N;
      jauge.style.width = (100 * (i - bornes[e])) / Math.max(1, fin - bornes[e]) + "%";
    }
    function maj() {
      const p = progres(sec);
      voulue = Math.min(N - 1, Math.floor(p * N));
      charge(voulue); for (let k = 1; k < 8; k++) if (voulue + k < N) charge(voulue + k);
      dessine(voulue); etiquette(false);
    }
    // aller à une étape
    lis.forEach((li, n) => $("button", li).addEventListener("click", () => {
      const course = sec.offsetHeight - innerHeight;
      scrollTo({ top: sec.offsetTop + (course * (bornes[n] + 1)) / N, behavior: reduit ? "auto" : "smooth" });
    }));
    // lecture automatique : fait défiler la page doucement jusqu'à la fin du film
    const btn = $("#f-lecture"); let lecture = false, dernier = 0;
    function joue(ts) {
      if (!lecture) return;
      const fin = sec.offsetTop + sec.offsetHeight - innerHeight;
      if (dernier) scrollBy(0, ((sec.offsetHeight - innerHeight) / 14000) * (ts - dernier));
      dernier = ts;
      if (scrollY >= fin - 1) return arrete();
      requestAnimationFrame(joue);
    }
    function arrete() { lecture = false; btn.setAttribute("aria-pressed", "false"); }
    btn.addEventListener("click", () => {
      lecture = !lecture; btn.setAttribute("aria-pressed", String(lecture)); dernier = 0;
      if (lecture) {
        if (progres(sec) <= 0 || progres(sec) >= 1) scrollTo({ top: sec.offsetTop + 2, behavior: "auto" });
        requestAnimationFrame(joue);
      }
    });
    ["wheel", "touchstart", "keydown"].forEach((ev) => addEventListener(ev, (e) => { if (lecture && !(e.target === btn)) arrete(); }, { passive: true }));
    $("#f-passer").addEventListener("click", arrete);
    // premières images pour le chargement
    const premieres = () => Array.from({ length: Math.min(N, 24) }, (_, i) => charge(i));
    return { maj, etiquette, premieres, N };
  })();

  /* ============================================================
     LE TRAJET : métro (vertical) puis avenue Duluth (horizontal)
     ============================================================ */
  const trajet = (() => {
    const sec = $("#itineraire"), scene = $("#t-scene"), carte = $("#t-carte"), svg = $("#t-plan");
    const NS = "http://www.w3.org/2000/svg";
    const W = 4800, H = 1500;
    // îlots : entre les rues
    const vx = [[0, 70], [590, 660], [1160, 1210], [1745, 1815], [2340, 2390], [2960, 3010], [3560, 3610], [4160, 4210], [4800, 4800]];
    const hy = [[0, 0], [330, 390], [700, 740], [1048, 1140], [1440, 1500]];
    const g = $("#t-ilots");
    for (let a = 0; a < vx.length - 1; a++) for (let b = 0; b < hy.length - 1; b++) {
      const x = vx[a][1] + 22, y = hy[b][1] + 22, w = vx[a + 1][0] - vx[a][1] - 44, h = hy[b + 1][0] - hy[b][1] - 44;
      if (w < 40 || h < 40) continue;
      const r = document.createElementNS(NS, "rect");
      Object.entries({ x, y, width: w, height: h, rx: 6, class: "t-ilot" }).forEach(([k, v]) => r.setAttribute(k, v));
      g.appendChild(r);
    }
    // points rouges le long du trajet
    const P = [[625, 300], [625, 1116], [2800, 1116]];
    const pts = [];
    for (let s = 0; s < P.length - 1; s++) {
      const [x1, y1] = P[s], [x2, y2] = P[s + 1], L = Math.hypot(x2 - x1, y2 - y1), n = Math.round(L / 46);
      for (let i = 0; i < n; i++) pts.push([x1 + ((x2 - x1) * i) / n, y1 + ((y2 - y1) * i) / n]);
    }
    pts.push(P[P.length - 1]);
    const gp = $("#t-points");
    const cercles = pts.map(([x, y]) => { const c = document.createElementNS(NS, "circle"); c.setAttribute("cx", x); c.setAttribute("cy", y); c.setAttribute("r", 13); c.setAttribute("class", "t-point"); c.style.opacity = 0; gp.appendChild(c); return c; });

    const TXT = [
      ["Pour venir.", "Getting here.", "Sortez au métro Mont-Royal.", "Get off at Mont-Royal metro."],
      ["Direction Duluth.", "Head for Duluth.", "Descendez vers le sud jusqu'à l'avenue Duluth.", "Walk south to Duluth Avenue."],
      ["On se retrouve chez Bobette.", "Meet us at Bobette's.", "Continuez sur Duluth vers Bobette.", "Keep going on Duluth toward Bobette."],
      ["Vous y êtes.", "You're here.", "Cherchez les lettres ballons ! Vous êtes chez Bobette.", "Look for the balloon letters! You're at Bobette's."]
    ];
    const LEG = [["Chez nous, sur Duluth", "Our place, on Duluth"], ["Vous y êtes !", "You made it!"]];
    let etape = -1, montres = -1;
    const titre = $("#t-titre"), phrase = $("#t-phrase"), no = $("#t-no"), num = $("#t-num"), barre = $("#t-barre"), legende = $("#t-legende");
    const jalons = $$(".t-progres b");

    function texte(force) {
      const e = Math.max(0, etape);
      const ecrit = () => {
        titre.textContent = t(TXT[e][0], TXT[e][1]);
        titre.parentElement.classList.toggle("long", titre.textContent.length > 16);
        phrase.textContent = t(TXT[e][2], TXT[e][3]);
        legende.textContent = e >= 2 ? t(LEG[1][0], LEG[1][1]) : t(LEG[0][0], LEG[0][1]);
      };
      no.textContent = e + 1; num.textContent = "0" + (e + 1) + " / 04";
      jalons.forEach((b, i) => b.classList.toggle("courant", i === e));
      if (force || reduit) return ecrit();
      titre.classList.add("sort");
      setTimeout(() => { ecrit(); titre.classList.remove("sort"); }, 220);
    }
    function maj() {
      const p = progres(sec);
      const e = p < 0.2 ? 0 : p < 0.48 ? 1 : p < 0.8 ? 2 : 3;
      if (e !== etape) { etape = e; scene.dataset.etape = e; texte(false); }
      barre.style.width = (100 * e) / 3 + "%";
      // tête du trajet
      const q = clamp(p / 0.9, 0, 1), k = Math.round(q * (pts.length - 1));
      if (k !== montres) { cercles.forEach((c, i) => (c.style.opacity = i <= k ? 1 : 0)); montres = k; }
      // caméra : suit la tête, d'abord vers le bas (métro), puis vers la droite (Duluth)
      const cw = carte.clientWidth, ch = carte.clientHeight;
      const s = Math.max(ch / 1000, cw / W);
      svg.style.width = W * s + "px"; svg.style.height = H * s + "px";
      const [hx, hy2] = pts[k];
      const ax = etape >= 2 && cw > 700 ? 0.36 : 0.45;
      const cx = clamp(hx * s - cw * ax, 0, W * s - cw), cy = clamp(hy2 * s - ch * 0.55, 0, H * s - ch);
      svg.style.transform = "translate3d(" + -cx + "px," + -cy + "px,0)";
    }
    return { maj, texte };
  })();

  /* ============================================================
     DÉFILEMENT : en-tête, section courante, barre du bas
     ============================================================ */
  const sections = $$("main > section[id]");
  const accueil = $("#accueil");
  let nomCourant = null;
  function sectionCourante(force) {
    const y = innerHeight * 0.4;
    let cur = sections[0];
    sections.forEach((s) => { if (s.getBoundingClientRect().top <= y) cur = s; });
    if (cur.id !== nomCourant || force) {
      nomCourant = cur.id;
      $("#e-section").textContent = (LG === "en" ? cur.dataset.nomEn : cur.dataset.nom) || "";
      $$(".barre a[data-cible]").forEach((a) => a.classList.toggle("actif", a.dataset.cible === cur.id || (a.dataset.cible === "infos" && cur.id === "savoir")));
    }
  }
  let attente = false;
  function surDefilement() {
    if (attente) return; attente = true;
    requestAnimationFrame(() => {
      attente = false;
      document.body.classList.toggle("defile", scrollY > accueil.offsetHeight * 0.55);
      film.maj(); trajet.maj(); sectionCourante(false);
    });
  }
  addEventListener("scroll", surDefilement, { passive: true });
  addEventListener("resize", surDefilement);

  /* ============================================================
     FORMULAIRE DE TOURNAGE
     ============================================================ */
  const form = $("#form"), res = $("#f-resultat");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!form.checkValidity()) { form.reportValidity(); return; }
    const data = new FormData(form);
    const netlify = /netlify\.app$/.test(location.hostname) || (!/github\.io$|localhost|127\.0\.0\.1/.test(location.hostname) && location.protocol === "https:");
    res.hidden = false;
    if (netlify) {
      try {
        const r = await fetch("/", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams(data).toString() });
        if (!r.ok) throw 0;
        res.textContent = t("Merci ! Votre demande est envoyée au propriétaire.", "Thank you! Your request was sent to the owner.");
        form.reset(); return;
      } catch (err) { /* repli courriel */ }
    }
    const corps = [...data.entries()].filter(([k]) => !["form-name", "adresse-web"].includes(k)).map(([k, v]) => k + " : " + v).join("\n");
    location.href = "mailto:" + ((B.courriel && B.courriel.valeur) || "") + "?subject=" + encodeURIComponent("Demande de tournage — Chez Bobette") + "&body=" + encodeURIComponent(corps);
    res.textContent = t("Votre courriel s'ouvre avec la demande prête à envoyer.", "Your email app opens with the request ready to send.");
  });

  /* ============================================================
     CHARGEMENT : l'enseigne, puis la page
     ============================================================ */
  if (LG === "en") langue("en"); else { remplir(); film.etiquette(true); trajet.texte(true); }
  const pct = $("#ch-pct");
  const attendre = [...film.premieres(), $(".a-enseigne"), $(".ch-enseigne")];
  let fini = false;
  const termine = () => { if (fini) return; fini = true; pct.textContent = "100"; setTimeout(() => document.body.classList.remove("charge"), 250); surDefilement(); };
  const compte = () => {
    const ok = attendre.filter((im) => im.complete).length;
    pct.textContent = Math.round((100 * ok) / attendre.length);
    if (ok === attendre.length) termine();
  };
  attendre.forEach((im) => { if (!im.complete) { im.addEventListener("load", compte); im.addEventListener("error", compte); } });
  compte();
  setTimeout(termine, 4000);
  surDefilement();
  setInterval(remplir, 60000);
})();
