/* Chez Bobette — v2. Les écrans sont les maquettes ; ce script les met à l'échelle et anime ce qui bouge. */
(() => {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const B = window.BOBETTE || {};
  const SEQ = window.BOBETTE_SEQ || {};
  const reduit = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lisse = (v) => v * v * (3 - 2 * v);
  let LG = "fr";
  try { LG = localStorage.getItem("bobette-lg") === "en" ? "en" : "fr"; } catch (e) {}
  const t = (fr, en) => (LG === "en" ? en : fr);

  /* ---------- Échelle des planches (1536 × 1024) ---------- */
  function echelle() {
    const u = Math.min(innerWidth / 1536, innerHeight / 1024);
    document.documentElement.style.setProperty("--u", u.toFixed(5));
  }
  echelle();

  /* ---------- Téléphone : chaque planche est montrée en « fenêtres » empilées ---------- */
  const FENETRES = {
    accueil: [[0, 0, 840, 830], [790, 40, 1536, 830], [0, 835, 870, 1024], [870, 800, 1536, 1024]],
    film: [[30, 120, 680, 620], [680, 40, 1480, 840], [40, 830, 1500, 950]],
    savoir: [[0, 0, 1000, 290], [40, 280, 520, 560], [520, 250, 1010, 560], [1010, 200, 1510, 560], [40, 550, 790, 850], [800, 530, 1500, 880]],
    trajet1: [[0, 100, 820, 900], [700, 230, 1536, 900]],
    trajet3: [[0, 100, 800, 860], [780, 140, 1536, 860]],
    trajet4: [[0, 100, 940, 820], [690, 100, 1536, 860]]
  };
  const modeTel = () => innerWidth < 900 && innerHeight > innerWidth * 0.9;
  const TEL = modeTel();
  if (TEL) {
    document.documentElement.classList.add("fenetres");
    $$(".ecran").forEach((ec) => {
      const f = FENETRES[ec.dataset.p], pl = $(".planche", ec);
      if (!f) return;
      f.forEach(([x0, y0, x1, y1], i) => {
        const k = innerWidth / (x1 - x0);
        const fen = document.createElement("div");
        fen.className = "fenetre";
        fen.style.height = (y1 - y0) * k + "px";
        let copie = pl;
        if (i > 0) {
          copie = pl.cloneNode(true);
          $$("[id]", copie).forEach((el) => el.removeAttribute("id"));
          copie.setAttribute("aria-hidden", "true");
          $$("a, button", copie).forEach((el) => el.setAttribute("tabindex", "-1"));
        }
        copie.style.transform = "translate(" + -x0 * k + "px," + -y0 * k + "px) scale(" + k + ")";
        fen.appendChild(copie);
        ec.appendChild(fen);
      });
    });
    let large = innerWidth;
    addEventListener("resize", () => { if (modeTel() !== TEL || (TEL && Math.abs(innerWidth - large) > 40)) location.reload(); });
  }

  function progres(sec) {
    const r = sec.getBoundingClientRect();
    const course = sec.offsetHeight - innerHeight;
    return course > 0 ? clamp(-r.top / course, 0, 1) : 0;
  }
  const pastille = (planche, id) => $$(`.ecran[data-p="${planche}"] .pastille[data-id="${id}"]`);

  /* ---------- Ajuster le texte d'une pastille à sa place ---------- */
  function ajuste(p) {
    const s = $(".fit", p);
    if (!s || !p.offsetParent) return;
    const rot = Math.abs(parseFloat(getComputedStyle(s).getPropertyValue("--rot")) || 0);
    let w = p.offsetWidth - 10, h = p.offsetHeight - 8;
    if (rot > 45) [w, h] = [h, w];
    s.style.fontSize = "";
    const base = parseFloat(getComputedStyle(s).fontSize);
    const k = Math.min(w / s.offsetWidth, h / s.offsetHeight);
    s.style.fontSize = base * k + "px";
  }
  const ajusteTout = () => $$(".pastille").forEach(ajuste);

  /* ============================================================
     INFOS (infos.js)
     ============================================================ */
  const ex = (o) => (B.mentionsExemple && o && o.exemple ? ' <span class="ex">' + t("exemple", "example") + "</span>" : "");
  const hFmt = (h) => { const [H, M] = h.split(":"); return LG === "en" ? (+H % 12 || 12) + (M !== "00" ? ":" + M : "") + (+H < 12 ? " a.m." : " p.m.") : +H + " h" + (M !== "00" ? " " + M : ""); };
  function remplir() {
    const tel = (B.telephone && B.telephone.valeur) || "514 522-2612";
    const telHref = "tel:+1" + tel.replace(/\D/g, "");
    $$("[data-tel-href]").forEach((a) => (a.href = telHref));
    $$("[data-tel]").forEach((a) => { a.href = telHref; a.textContent = tel; });
    const now = new Date(), j = now.getDay(), min = now.getHours() * 60 + now.getMinutes();
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
    // le néon de l'accueil est celui de la maquette ; on le remplace seulement s'il faut dire autre chose
    pastille("accueil", "neon").forEach((n) => {
      $(".fit", n).textContent = ouvert ? t("Ouvert", "Open") : t("Fermé", "Closed");
      n.classList.toggle("ferme", !ouvert);
      n.classList.toggle("on", !ouvert);
      ajuste(n);
    });
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
  const ATTRS = [["data-en", null], ["data-en-aria", "aria-label"], ["data-en-alt", "alt"]];
  function langue(lg) {
    LG = lg;
    document.documentElement.lang = lg === "en" ? "en-CA" : "fr-CA";
    ATTRS.forEach(([a, cible]) => $$("[" + a + "]").forEach((el) => {
      if (cible) {
        if (el.dataset.fr === undefined) el.dataset.fr = el.getAttribute(cible) || "";
        el.setAttribute(cible, lg === "en" ? el.getAttribute(a) : el.dataset.fr);
      } else {
        if (el.dataset.frHtml === undefined) el.dataset.frHtml = el.innerHTML;
        el.innerHTML = lg === "en" ? el.getAttribute(a) : el.dataset.frHtml;
      }
    }));
    $$(".zone.lg").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.lg === lg)));
    try { localStorage.setItem("bobette-lg", lg); } catch (e) {}
    remplir(); film.etiquette(true); trajet.etat(true);
    ajusteTout();
  }
  // « FR / EN » de la maquette, version anglaise : souligné sous EN
  $$('.pastille.p-langue .fit').forEach((s) => (s.innerHTML = 'FR / <span class="ul">EN</span>'));
  document.addEventListener("click", (e) => { const b = e.target.closest(".zone.lg"); if (b) langue(b.dataset.lg); });

  /* ============================================================
     MENU
     ============================================================ */
  const menu = $("#menu"); let ouvreur = null;
  function ouvrirMenu(o, btn) {
    if (o) { menu.hidden = false; ouvreur = btn || null; }
    requestAnimationFrame(() => menu.classList.toggle("ouvert", o));
    $$(".ouvre-menu, .tirette").forEach((b) => b.setAttribute("aria-expanded", String(o)));
    document.body.style.overflow = o ? "hidden" : "";
    if (o) setTimeout(() => { const a = $("a", menu); a && a.focus({ preventScroll: true }); }, 400);
    else { setTimeout(() => { if (!menu.classList.contains("ouvert")) menu.hidden = true; }, 700); ouvreur && ouvreur.focus({ preventScroll: true }); }
  }
  document.addEventListener("click", (e) => { const b = e.target.closest(".ouvre-menu, .tirette"); if (b) ouvrirMenu(true, b); });
  $("#m-fermer").addEventListener("click", () => ouvrirMenu(false));
  $$("a", menu).forEach((a) => a.addEventListener("click", () => ouvrirMenu(false)));
  addEventListener("keydown", (e) => { if (e.key === "Escape" && menu.classList.contains("ouvert")) ouvrirMenu(false); });

  /* ============================================================
     LE FILM dans le hublot
     ============================================================ */
  const film = (() => {
    const sec = $("#film"), cvs = $$(".f-canvas"), ctxs = cvs.map((c) => c.getContext("2d")), cv = cvs[0];
    const NOMS = ["piece", "t1", "laveuse", "t2", "secheuse"].filter((n) => SEQ[n] > 0);
    const liste = [], debut = {};
    NOMS.forEach((n) => { debut[n] = liste.length; for (let i = 1; i <= SEQ[n]; i++) liste.push("assets/" + n + "/" + String(i).padStart(3, "0") + ".webp"); });
    const N = liste.length;
    const bornes = [0, (debut.t1 || 0) + Math.round((SEQ.t1 || 0) * 0.4), debut.t2 ?? N, debut.secheuse ?? N];
    const MOTS = [["Paiement", "Payment"], ["Lavage", "Wash"], ["Essorage", "Spin"], ["Séchage", "Dry"]];
    const NUM_X = [162, 548, 892, 1262];
    const MOT = [[204, 314], [592, 697], [938, 1074], [1314, 1430]];
    const imgs = new Array(N);
    let dessinee = -1, etape = -1, voulue = 0;
    const lcd = $$(".f-lcd b"), jauge = $$(".f-jauge i"), marque = $$(".f-marque"), marqueNo = $$(".f-marque b"), trait = $$(".f-trait");
    const pPast = pastille("film", "pastille"), pTrait = pastille("film", "trait");
    pastille("film", "lcd").forEach((p) => p.classList.add("on"));
    pPast.forEach((p) => (p.innerHTML = "<b>02</b>"));

    function charge(i) {
      if (imgs[i]) return imgs[i];
      const im = new Image(); im.decoding = "async"; im.src = liste[i]; imgs[i] = im;
      im.onload = () => { if (i === voulue) dessine(i); };
      return im;
    }
    function dessine(i) {
      let k = i;
      while (k >= 0 && !(imgs[k] && imgs[k].complete && imgs[k].naturalWidth)) k--;
      if (k < 0 || k === dessinee) return;
      // l'image 4:3 remplit le cercle (comme « cover »)
      const im = imgs[k], s = Math.max(cv.width / im.naturalWidth, cv.height / im.naturalHeight) * 1.02;
      const w = im.naturalWidth * s, h = im.naturalHeight * s;
      ctxs.forEach((ctx) => ctx.drawImage(im, (cv.width - w) / 2, (cv.height - h) / 2, w, h)); dessinee = k;
      cvs.forEach((c) => c.classList.toggle("pret", voulue > 0 || dessinee > 0 || progres(sec) > 0.002));
    }
    function etiquette(force) {
      const i = voulue;
      let e = 0; for (let b = 0; b < 4; b++) if (i >= bornes[b]) e = b;
      if (e !== etape || force) {
        etape = e;
        lcd.forEach((l) => (l.textContent = e + 1 + "/4 · " + t(MOTS[e][0], MOTS[e][1])));
        marque.forEach((m) => { m.style.left = NUM_X[e] + "px"; m.style.top = "882px"; });
        marqueNo.forEach((m) => (m.textContent = "0" + (e + 1)));
        trait.forEach((tr) => { tr.style.left = MOT[e][0] + 8 + "px"; tr.style.top = "919px"; tr.style.width = MOT[e][1] - MOT[e][0] + 12 + "px"; });
        pPast.forEach((p) => p.classList.toggle("on", e !== 1));
        pTrait.forEach((p) => p.classList.add("on"));
      }
      const fin = e < 3 ? bornes[e + 1] : N;
      jauge.forEach((j) => (j.style.width = (100 * (i - bornes[e])) / Math.max(1, fin - bornes[e]) + "%"));
    }
    function maj() {
      const p = progres(sec);
      voulue = Math.min(N - 1, Math.floor(p * N));
      charge(voulue); for (let k = 1; k < 8; k++) if (voulue + k < N) charge(voulue + k);
      dessine(voulue); etiquette(false);
    }
    $$('.ecran[data-p="film"] .zone.etape').forEach((b) => b.addEventListener("click", () => {
      const n = +b.dataset.etape, course = sec.offsetHeight - innerHeight;
      scrollTo({ top: sec.offsetTop + (course * (bornes[n] + 1)) / N, behavior: reduit ? "auto" : "smooth" });
    }));
    // lecture automatique : la page défile doucement jusqu'à la fin du film
    const btn = $("#f-lecture"); let lecture = false, dernier = 0;
    function joue(ts) {
      if (!lecture) return;
      const fin = sec.offsetTop + sec.offsetHeight - innerHeight;
      if (dernier) scrollBy(0, ((sec.offsetHeight - innerHeight) / 16000) * (ts - dernier));
      dernier = ts;
      if (scrollY >= fin - 1) return arrete();
      requestAnimationFrame(joue);
    }
    function arrete() { lecture = false; btn.setAttribute("aria-pressed", "false"); }
    btn.addEventListener("click", () => {
      lecture = !lecture; btn.setAttribute("aria-pressed", String(lecture)); dernier = 0;
      if (lecture) {
        const p = progres(sec);
        if (p <= 0 || p >= 1) scrollTo({ top: sec.offsetTop + 2, behavior: "auto" });
        document.documentElement.style.scrollBehavior = "auto";
        requestAnimationFrame(joue);
      } else document.documentElement.style.scrollBehavior = "";
    });
    ["wheel", "touchstart"].forEach((ev) => addEventListener(ev, () => { if (lecture) arrete(); }, { passive: true }));
    const passer = $("#f-passer"); if (passer) passer.addEventListener("click", arrete);
    const premieres = () => Array.from({ length: Math.min(N, 16) }, (_, i) => charge(i));
    return { maj, etiquette, premieres };
  })();

  /* ============================================================
     LE TRAJET : métro (vers le bas) puis Duluth (vers la droite)
     ============================================================ */
  const trajet = (() => {
    const sec = $("#itineraire"), piste = $("#piste");
    const pts = ["trajet1", "trajet3", "trajet4"].map((n) => $$(`.ecran[data-p="${n}"] .points`).map((s) => $$("circle", s)));
    // phases : [début, fin] de chaque planche ; entre deux, la piste glisse vers la gauche
    const PH = [[0, .27], [.41, .62], [.76, 1]];
    const GL = [[.27, .41], [.62, .76]];
    let etapeCourante = -1;
    const num = pastille("trajet1", "num"), phrase = pastille("trajet1", "phrase"), compteur = pastille("trajet1", "compteur");
    compteur.forEach((c) => (c.innerHTML = '<div class="compteur"><span class="c-txt"></span><span class="c-ligne"></span><span class="c-pt" style="left:128px"></span><span class="c-pt" style="left:228px"></span><span class="c-pt" style="left:321px"></span><span class="c-pt" style="left:408px"></span></div>'));
    const PHR = [["Sortez au métro Mont-Royal.", "Get off at Mont-Royal metro."], ["Descendez jusqu'à l'avenue Duluth.", "Walk down to Duluth Avenue."]];

    function etat(force, e) {
      if (e === undefined) e = etapeCourante; else if (e === etapeCourante && !force) return;
      etapeCourante = e;
      const deux = e === 1;
      // étape 1 : la maquette telle quelle ; étape 2 : on réécrit la carte et le compteur
      num.forEach((n) => { n.classList.toggle("on", deux); n.innerHTML = '<span class="num-blanc">2</span>'; });
      phrase.forEach((ph) => {
        const s = $(".fit", ph); s.textContent = t(PHR[deux ? 1 : 0][0], PHR[deux ? 1 : 0][1]);
        ph.classList.toggle("on", deux); ajuste(ph);
      });
      compteur.forEach((c) => {
        c.classList.toggle("on", deux);
        $(".c-txt", c).textContent = "02 / 04";
        $$(".c-pt", c).forEach((p, i) => { p.className = "c-pt" + (i < 1 ? " fait" : i === 1 ? " ici" : ""); });
      });
    }
    function revele(liste, q) {
      const k = Math.round(q * liste.length);
      liste.forEach((c, i) => c.classList.toggle("vu", i < k));
    }
    function maj() {
      const p = progres(sec);
      let x = 0;
      if (p >= GL[0][0]) x = lisse(clamp((p - GL[0][0]) / (GL[0][1] - GL[0][0]), 0, 1));
      if (p >= GL[1][0]) x = 1 + lisse(clamp((p - GL[1][0]) / (GL[1][1] - GL[1][0]), 0, 1));
      piste.style.transform = "translate3d(" + -x * innerWidth + "px,0,0)";
      PH.forEach(([a, b], i) => pts[i].forEach((l) => revele(l, clamp((p - a) / ((b - a) * 0.8), 0, 1))));
      const q1 = clamp(p / (PH[0][1] * 0.8), 0, 1);
      etat(false, p < PH[0][1] ? (q1 > 0.45 ? 1 : 0) : 2);
    }
    function vers(i) {
      const course = sec.offsetHeight - innerHeight;
      const cible = [0.14, PH[1][0] + 0.02, PH[2][0] + 0.02][i];
      scrollTo({ top: sec.offsetTop + course * cible, behavior: reduit ? "auto" : "smooth" });
    }
    $$('.ecran[data-p="trajet1"] .zone.suivant').forEach((b) => b.addEventListener("click", () => vers(etapeCourante < 1 ? 0 : 1)));
    return { maj, etat };
  })();

  /* ============================================================
     DÉFILEMENT
     ============================================================ */
  const horsPlanche = $$("#infos, #tournages");
  let attente = false;
  function surDefilement() {
    if (attente) return; attente = true;
    requestAnimationFrame(() => {
      attente = false;
      film.maj(); trajet.maj();
      const y = innerHeight * 0.3;
      document.body.classList.toggle("hors-planche", horsPlanche.some((s) => { const r = s.getBoundingClientRect(); return r.top < y && r.bottom > y; }));
    });
  }
  addEventListener("scroll", surDefilement, { passive: true });
  addEventListener("resize", () => { echelle(); surDefilement(); });

  /* ============================================================
     FORMULAIRE DE TOURNAGE
     ============================================================ */
  const form = $("#form"), res = $("#f-resultat");
  if (form) form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!form.checkValidity()) { form.reportValidity(); return; }
    const data = new FormData(form);
    const netlify = /netlify\.app$/.test(location.hostname) || (!/github\.io$|githack\.com$|localhost|127\.0\.0\.1/.test(location.hostname) && location.protocol === "https:");
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
     CHARGEMENT
     ============================================================ */
  if (LG === "en") langue("en"); else { remplir(); film.etiquette(true); trajet.etat(true, 0); }
  const pct = $("#ch-pct");
  const fond = new Image(); fond.src = "assets/v2/p/accueil.webp";
  const attendre = [fond, ...film.premieres(), $(".ch-enseigne")];
  let fini = false;
  const termine = () => {
    if (fini) return; fini = true; pct.textContent = "100";
    setTimeout(() => { document.body.classList.remove("charge"); ajusteTout(); }, 250);
    surDefilement();
  };
  const compte = () => {
    const ok = attendre.filter((im) => im.complete).length;
    pct.textContent = Math.round((100 * ok) / attendre.length);
    if (ok === attendre.length) termine();
  };
  attendre.forEach((im) => { if (!im.complete) { im.addEventListener("load", compte); im.addEventListener("error", compte); } });
  compte();
  setTimeout(termine, 5000);
  if (document.fonts) document.fonts.ready.then(ajusteTout);
  surDefilement();
  setInterval(remplir, 60000);
})();
