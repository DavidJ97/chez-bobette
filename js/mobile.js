/* Chez Bobette — version téléphone : intro unique, heures et prix depuis infos.js, film au défilement, photos, formulaire.
   Le néon, les numéros de téléphone et la langue sont gérés par js/v2.js (data-statut, data-tel, data-en). */
(() => {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const mq = matchMedia("(max-width: 760px)");
  const reduit = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const B = window.BOBETTE || {};
  const SEQ = window.BOBETTE_SEQ || {};
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const en = () => document.documentElement.lang.startsWith("en");
  const t = (fr, frEn) => (en() ? frEn : fr);
  const lire = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const ecrire = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };

  /* ---------- Intro : une seule fois, 2,5 s au plus ---------- */
  const intro = $("#m-intro");
  if (intro && mq.matches && !reduit && !lire("bobette-intro")) {
    intro.hidden = false;
    document.documentElement.style.overflow = "hidden";
    const jauge = $("#m-intro-jauge"), debut = performance.now();
    let fini = false;
    const fermer = () => {
      if (fini) return; fini = true;
      ecrire("bobette-intro", "1");
      jauge.style.width = "100%";
      intro.classList.add("fini");
      document.documentElement.style.overflow = "";
      setTimeout(() => (intro.hidden = true), 500);
    };
    (function avance(now) {
      if (fini) return;
      const p = clamp((now - debut) / 2300, 0, 1);
      jauge.style.width = p * 100 + "%";
      if (p >= 1) fermer(); else requestAnimationFrame(avance);
    })(debut);
    $("#m-intro-passer").addEventListener("click", fermer);
  }

  /* ---------- Grands titres : la ligne la plus longue prend la largeur de la maquette (data-l, en px de maquette) ---------- */
  function ajuste() {
    if (!mq.matches) return;
    $$(".mob [data-l]").forEach((h) => {
      const cible = parseFloat(h.dataset.l) * parseFloat(getComputedStyle(h).getPropertyValue("--p"));
      const morceaux = h.classList.contains("mf-titre") ? [...h.children] : [h];
      // une seule taille pour tous les morceaux (les 4 titres du film gardent la même taille)
      let k = Infinity;
      morceaux.forEach((m) => {
        m.style.fontSize = "100px";
        const avant = m.style.width; m.style.width = "max-content";
        const w = m.getBoundingClientRect().width;
        m.style.width = avant;
        if (w > 0) k = Math.min(k, cible / w);
      });
      if (isFinite(k) && k > 0) { h.style.fontSize = 100 * k + "px"; morceaux.forEach((m) => { if (m !== h) m.style.fontSize = ""; }); }
    });
  }
  ajuste();
  if (document.fonts) document.fonts.ready.then(ajuste);
  addEventListener("resize", ajuste);
  document.addEventListener("click", (e) => { if (e.target.closest(".lg")) setTimeout(ajuste, 0); });

  /* ---------- Heures, prix et fiche technique : tout vient d'infos.js ---------- */
  const heure = (h) => { const [H, M] = h.split(":"); return en() ? (+H % 12 || 12) + (M !== "00" ? ":" + M : "") + (+H < 12 ? " a.m." : " p.m.") : +H + " h" + (M !== "00" ? " " + M : ""); };
  function remplir() {
    const dl = $("#m-heures");
    if (dl) dl.innerHTML = (B.heures || []).map((h) =>
      "<div><dt>" + t(h.jours, h.court_en || h.jours_en) + "</dt><dd>" + heure(h.ouvre) + " – " + heure(h.ferme) + "</dd></div>").join("");
    const cartes = $$("#m-prix > li");
    (B.tarifs || []).slice(0, 4).forEach((p, i) => {
      const c = cartes[i]; if (!c) return;
      $(".mh-nom", c).textContent = t(p.court || p.nom, p.court_en || p.nom_en);
      // « 0,25 $ par tranche » : le prix en gros, la suite en petit
      const prix = t(p.prix, p.prix_en), m = prix.match(/^([\d.,\s$]+)(.*)$/);
      const gros = m ? m[1] : prix, petit = m ? m[2].trim() : "";
      const pr = $(".mh-prix", c);
      if (i === 3) {
        const [a, b] = prix.split("·").map((s) => s.trim());
        pr.innerHTML = a;
        let note = $(".mh-note", c);
        if (!note) { note = document.createElement("span"); note.className = "mh-note"; pr.after(note); }
        note.textContent = b || "";
      } else pr.innerHTML = gros.trim() + (petit ? "<small>" + petit + "</small>" : "");
    });
    // fiche technique : seulement les lignes remplies ; aucune ligne = pas de fiche du tout
    const lignes = (B.lieu || []).filter((l) => t(l.valeur, l.valeur_en));
    const carte = $("#m-fiche-carte"), lien = $("#m-lien-fiche");
    if (carte) {
      carte.hidden = lignes.length === 0;
      if (lien) lien.hidden = lignes.length === 0;
      $("#m-fiche-liste").innerHTML = lignes.map((l) => "<dt>" + t(l.nom, l.nom_en) + "</dt><dd>" + t(l.valeur, l.valeur_en) + "</dd>").join("");
    }
    $$(".mob [data-si-exemple]").forEach((e) => (e.hidden = !B.mentionsExemple));
  }
  remplir();
  // après un changement de langue (géré par v2.js), on réécrit ce qui vient d'infos.js
  document.addEventListener("click", (e) => { if (e.target.closest(".lg")) setTimeout(remplir, 0); });

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
    const MOTS = [["Paiement", "Payment"], ["Lavage", "Wash"], ["Essorage", "Spin"], ["Séchage", "Dry"]];
    const imgs = new Array(N);
    const lcd = $("#m-lcd"), jauge = $("#m-jauge"), boutons = $$(".mf-etapes button", sec);
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
    function etiquette(force) {
      let e = 0; for (let b = 0; b < 4; b++) if (voulue >= bornes[b]) e = b;
      if (e !== etape || force) {
        etape = e;
        sec.dataset.etape = e;
        lcd.textContent = e + 1 + "/4 · " + t(MOTS[e][0], MOTS[e][1]);
        boutons.forEach((b, i) => (i === e ? b.setAttribute("aria-current", "step") : b.removeAttribute("aria-current")));
      }
      const fin = e < 3 ? bornes[e + 1] : N;
      jauge.style.width = (100 * (voulue - bornes[e])) / Math.max(1, fin - bornes[e]) + "%";
    }
    const progres = () => { const course = sec.offsetHeight - innerHeight; return course > 0 ? clamp(-sec.getBoundingClientRect().top / course, 0, 1) : 0; };
    function maj() {
      if (!mq.matches) return;
      const r = sec.getBoundingClientRect();
      if (r.bottom < -innerHeight || r.top > innerHeight * 2) return;
      voulue = Math.min(N - 1, Math.floor(progres() * N));
      charge(voulue); for (let k = 1; k < 8; k++) if (voulue + k < N) charge(voulue + k);
      dessine(voulue); etiquette(false);
    }
    boutons.forEach((b) => b.addEventListener("click", () => {
      const n = +b.dataset.etape, course = sec.offsetHeight - innerHeight;
      scrollTo({ top: sec.offsetTop + (course * (bornes[n] + 1)) / N, behavior: reduit ? "auto" : "smooth" });
    }));
    // lecture automatique : la page défile doucement jusqu'à la fin du film
    const btn = $("#m-lecture"); let lecture = false, dernier = 0;
    const arrete = () => { lecture = false; btn.setAttribute("aria-pressed", "false"); document.documentElement.style.scrollBehavior = ""; };
    function joue(now) {
      if (!lecture) return;
      const fin = sec.offsetTop + sec.offsetHeight - innerHeight;
      if (dernier) scrollBy(0, ((sec.offsetHeight - innerHeight) / 14000) * (now - dernier));
      dernier = now;
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
    addEventListener("touchstart", (e) => { if (lecture && !btn.contains(e.target)) arrete(); }, { passive: true });
    document.addEventListener("click", (e) => { if (e.target.closest(".lg")) setTimeout(() => etiquette(true), 0); });
    etiquette(true);
    return { maj };
  })();

  /* ---------- Barre du bas : la section en cours est soulignée ---------- */
  const liens = $$(".m-barre a[href^='#']");
  const groupes = { "#m-horaires": ["m-horaires", "m-film", "m-savoir"], "#m-trajet": ["m-trajet"], "#m-tournage": ["m-tournage", "m-fiche", "m-demande"] };
  function barre() {
    const y = innerHeight * 0.4;
    const ici = $$(".mob > section").find((s) => { const r = s.getBoundingClientRect(); return r.top <= y && r.bottom > y; });
    liens.forEach((a) => a.classList.toggle("ici", !!ici && (groupes[a.getAttribute("href")] || []).includes(ici.id)));
  }

  let attente = false;
  addEventListener("scroll", () => {
    if (attente) return; attente = true;
    requestAnimationFrame(() => { attente = false; film.maj(); barre(); });
  }, { passive: true });
  addEventListener("resize", () => { film.maj(); barre(); });
  film.maj(); barre();

  /* ---------- Lieu de tournage : intérieur, façade, ruelle ---------- */
  const photos = $$("#m-photos img"), compteur = $("#m-compteur"), onglets = $$(".mn-onglets button");
  let photo = 1;
  function montre(i) {
    photo = (i + photos.length) % photos.length;
    photos.forEach((p, k) => (p.hidden = k !== photo));
    onglets.forEach((o, k) => o.setAttribute("aria-pressed", String(k === photo)));
    compteur.textContent = "0" + (photo + 1) + " / 0" + photos.length;
  }
  $$(".m-tournage [data-photo]").forEach((b) => b.addEventListener("click", () => {
    const v = b.dataset.photo;
    montre(v === "+1" ? photo + 1 : v === "-1" ? photo - 1 : +v);
  }));
  const cadre = $("#m-photos");
  let x0 = null;
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
    const dire = (msg) => { res.textContent = msg; res.hidden = false; };
    if (netlify) {
      try {
        const r = await fetch("/", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams(data).toString() });
        if (!r.ok) throw 0;
        dire(t("Merci ! Votre demande est envoyée au propriétaire.", "Thank you! Your request was sent to the owner."));
        form.reset(); return;
      } catch (err) { /* repli : courriel */ }
    }
    const champs = {};
    for (const [k, v] of data.entries()) if (!["form-name", "adresse-web"].includes(k)) champs[k] = champs[k] ? champs[k] + ", " + v : v;
    const corps = Object.entries(champs).map(([k, v]) => k + " : " + v).join("\n");
    location.href = "mailto:" + ((B.courriel && B.courriel.valeur) || "") + "?subject=" + encodeURIComponent("Demande de tournage — Chez Bobette") + "&body=" + encodeURIComponent(corps);
    dire(t("Votre courriel s'ouvre avec la demande prête à envoyer.", "Your email app opens with the request ready to send."));
  });
})();
