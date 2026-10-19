/*
  Chez Bobette — le code commun du site.
  1. Fabrique, à partir de infos.js, le HTML des blocs marqués data-bloc="…".
  2. Calcule « Ouvert / Fermé » à l'heure de Montréal.
  3. Gère la bascule français / anglais et les mentions « exemple ».
  Le même fichier sert à outils/figer_infos.js, qui écrit ces blocs en dur dans le HTML :
  si ce script ne se charge pas, la page garde donc ses heures, ses prix et son téléphone.
*/
(function (racine) {
  "use strict";

  const JOURS = {
    fr: ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"],
    en: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
  };
  const MOTS = {
    fr: { exemple: "exemple", ouvert: "Ouvert", ferme: "Fermé", jusqua: "jusqu'à ", fermeDans: "ferme dans ", demain: "demain ", tousLesJours: "tous les jours", aConfirmer: "à confirmer avec le propriétaire",
          dejaTourne: "Déjà tourné ici", pieces: "pièces de 25 ¢", provisoire: "Images provisoires, en attendant le tournage sur place.",
          demo: "Version de démonstration, non publiée. Les mentions <span class=\"ex\">exemple</span> sont à confirmer par le propriétaire." },
    en: { exemple: "example", ouvert: "Open", ferme: "Closed", jusqua: "until ", fermeDans: "closes in ", demain: "tomorrow ", tousLesJours: "every day", aConfirmer: "to be confirmed with the owner",
          dejaTourne: "Filmed here", pieces: "quarters only", provisoire: "Placeholder footage until we film on site.",
          demo: "Demo version, not published. Items marked <span class=\"ex\">example</span> are to be confirmed by the owner." }
  };

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  }
  // valeur dans la bonne langue : champ « x_en » s'il existe, sinon « x »
  function v(o, cle, lg) {
    return esc(lg === "en" && o[cle + "_en"] ? o[cle + "_en"] : o[cle]);
  }
  function ex(o, lg) {
    return o && o.exemple ? ' <span class="ex">' + MOTS[lg].exemple + "</span>" : "";
  }
  function insecable(t) { return String(t).replace(/ /g, "\u00a0").replace(/-/g, "\u2011"); }
  function minutes(hhmm) {
    const p = String(hhmm).split(":");
    return (+p[0]) * 60 + (+p[1] || 0);
  }
  // "08:00" → « 8 h » ou « 8 a.m. »
  function heure(hhmm, lg) {
    const m = minutes(hhmm), h = Math.floor(m / 60) % 24, mn = m % 60;
    if (lg === "en") {
      if (mn === 0 && h === 12) return "noon";
      if (mn === 0 && h === 0) return "midnight";
      return ((h + 11) % 12 + 1) + (mn ? ":" + String(mn).padStart(2, "0") : "") + (h < 12 ? " a.m." : " p.m.");
    }
    if (mn === 0 && h === 0) return "minuit";
    return h + " h" + (mn ? " " + String(mn).padStart(2, "0") : "");
  }
  function plage(r, lg) {
    return heure(r.ouvre, lg) + " – " + heure(r.ferme, lg);
  }
  function pratique(B, id) {
    return (B.pratique || []).filter(p => p.id === id)[0] || { texte: "" };
  }

  // Jour (0 = dimanche) et minute de la journée, à l'heure de Montréal.
  function maintenantMontreal(date) {
    const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/Toronto", weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(date);
    const o = {};
    parts.forEach(p => { o[p.type] = p.value; });
    return { jour: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(o.weekday), minute: (+o.hour % 24) * 60 + (+o.minute) };
  }
  // État d'ouverture : { ouvert, ligne (horaire utilisé), dans (minutes avant la fermeture), jours (0 = aujourd'hui, 1 = demain…) }
  function etat(B, date) {
    const n = maintenantMontreal(date || new Date());
    const duJour = j => (B.heures || []).filter(r => r.j.indexOf(j) >= 0)[0];
    const auj = duJour(n.jour);
    if (auj && n.minute >= minutes(auj.ouvre) && n.minute < minutes(auj.ferme)) {
      return { ouvert: true, ligne: auj, dans: minutes(auj.ferme) - n.minute };
    }
    if (auj && n.minute < minutes(auj.ouvre)) return { ouvert: false, ligne: auj, jours: 0, jour: n.jour };
    for (let d = 1; d <= 7; d++) {
      const r = duJour((n.jour + d) % 7);
      if (r) return { ouvert: false, ligne: r, jours: d, jour: (n.jour + d) % 7 };
    }
    return { ouvert: false, ligne: null };
  }


  // Les photos des post-it « Bon à savoir » et des cartes de prix : de vraies images de la buanderie (assets/img/icones).
  const img = (nom, alt) => '<img src="assets/img/icones/' + nom + '.webp" width="320" height="320" loading="lazy" decoding="async" alt="' + (alt || "") + '">';
  const ICONES = { paiement: img("paiement"), monnayeur: img("monnayeur"), wifi: img("wifi"), geante: img("geante"), express: img("express") };
  // Les cartes de prix : 0 laveuse, 1 sécheuse, 2 service tout inclus, 3 manteau d'hiver.
  const MACHINES = [
    { cls: "m-laveuse", dessin: img("laveuse") }, { cls: "m-secheuse", dessin: img("secheuse") },
    { cls: "m-service", dessin: img("service") }, { cls: "m-manteau", dessin: img("manteau") }
  ];

  /* ---------- les blocs ---------- */
  const BLOCS = {
    // Le néon du premier écran : un mot (« Ouvert » / « Fermé ») et sa suite (« jusqu'à 23 h »).
    // Les versions « Fige » sont celles écrites en dur dans le HTML : sans script, on ne peut pas savoir l'heure.
    statutMotFige: (B, lg) => MOTS[lg].ouvert,
    statutSuiteFige: (B, lg) => MOTS[lg].tousLesJours,
    statutMot: (B, lg, date) => { const e = etat(B, date); return e.ouvert ? MOTS[lg].ouvert : MOTS[lg].ferme; },
    statutSuite: (B, lg, date) => {
      const e = etat(B, date), M = MOTS[lg];
      if (!e.ligne) return "";
      if (e.ouvert) return (e.dans <= 60 ? M.fermeDans + e.dans + " min" : M.jusqua + heure(e.ligne.ferme, lg)) + ex(e.ligne, lg);
      const quand = e.jours === 0 ? "" : e.jours === 1 ? M.demain : JOURS[lg][e.jour] + " ";
      return (lg === "en" ? "opens " + quand + "at " : "ouvre " + quand + "à ") + heure(e.ligne.ouvre, lg) + ex(e.ligne, lg);
    },
    heuresCourt: (B, lg) => B.heures.map(r =>
      "<span>" + v(r, "court", lg) + " <b>" + plage(r, lg) + "</b>" + ex(r, lg) + "</span>").join(""),
    prixHero: (B, lg) => {
      const t = B.tarifs[0];
      return '<span class="pp-nom">' + v(t, "nom", lg) + "</span><b>" + v(t, "prix", lg) + "</b>" + ex(t, lg) + '<span class="pp-mon">' + MOTS[lg].pieces + "</span>";
    },
    heures: (B, lg) => B.heures.map(r =>
      '<tr><th scope="row">' + v(r, "jours", lg) + "</th><td>" + plage(r, lg) + ex(r, lg) + "</td></tr>").join(""),
    achalandage: (B, lg) => v(B.achalandage, "texte", lg) + ex(B.achalandage, lg),
    tarifs: (B, lg) => B.tarifs.map(t =>
      "<li><span class=\"t-nom\">" + v(t, "nom", lg) + (t.note ? " <small>" + v(t, "note", lg) + "</small>" : "") +
      "</span><span class=\"t-prix\">" + v(t, "prix", lg) + ex(t, lg) + "</span></li>").join(""),
    pratique: (B, lg) => B.pratique.map(p =>
      '<li data-id="' + esc(p.id) + '">' + (ICONES[p.id] ? '<span class="pi-dessin">' + ICONES[p.id] + "</span>" : "") +
      "<h3>" + v(p, "titre", lg) + "</h3><p>" + v(p, "texte", lg) + ex(p, lg) + "</p></li>").join(""),
    // les prix, une carte dessinée par machine ou par service
    machines: (B, lg) => B.tarifs.map((t, i) => {
      const m = MACHINES[i] || MACHINES[2];
      return '<li class="machine ' + m.cls + '"><span class="m-dessin">' + m.dessin + '</span><span class="m-panneau"><span class="m-nom">' + v(t, "nom", lg) + "</span>" +
        (t.note ? '<span class="m-note">' + v(t, "note", lg) + "</span>" : "") + '<span class="m-prix">' + v(t, "prix", lg) + "</span>" + ex(t, lg) + "</span></li>";
    }).join(""),
    lieu: (B, lg) => B.lieu.map(l => {
      const val = v(l, "valeur", lg);
      return "<div><dt>" + v(l, "nom", lg) + "</dt>" + (val ? "<dd>" + val + "</dd>" : '<dd class="a-conf">' + MOTS[lg].aConfirmer + "</dd>") + "</div>";
    }).join(""),
    tournages: (B, lg) => !(B.tournages && B.tournages.length) ? "" :
      "<h4>" + MOTS[lg].dejaTourne + "</h4><ul>" + B.tournages.map(t =>
        "<li><b>" + esc(t.titre) + "</b> " + [v(t, "type", lg), esc(t.diffuseur), esc(t.annee)].filter(Boolean).join(" · ") + "</li>").join("") + "</ul>",
    // numéro affiché : espace et trait d'union insécables, pour qu'il ne se coupe jamais en fin de ligne
    tel: (B, lg) => esc(insecable(B.telephone.valeur)) + ex(B.telephone, lg),
    telNu: B => esc(insecable(B.telephone.valeur)),
    courriel: (B, lg) => esc(B.courriel.valeur) + ex(B.courriel, lg),
    adresse: (B, lg) => v(B, "adresse", lg),
    demo: (B, lg) => MOTS[lg].demo,
    provisoire: (B, lg) => B.visiteProvisoire ? MOTS[lg].provisoire : "",
    provisoireCourt: (B, lg) => B.visiteProvisoire ? (lg === "en" ? "Placeholder footage" : "Images provisoires") : "",
    // textes de la visite animée
    v1: (B, lg) => {
      const t = B.tarifs[0], m = pratique(B, "monnayeur");
      return (lg === "en" ? "Slide your quarters into the machine. " : "Glissez vos pièces de 25 ¢ dans la machine. ") +
        v(t, "nom", lg) + (lg === "en" ? ": " : " : ") + "<b>" + v(t, "prix", lg) + "</b>" + ex(t, lg) + ". " + v(m, "texte", lg) + ex(m, lg);
    },
    v2: (B, lg) => {
      const w = pratique(B, "wifi"), t = B.tarifs[2];
      return (lg === "en" ? "While it spins, grab a seat at the long counter by the window. " : "Pendant que ça tourne, installez-vous au long comptoir, côté vitrine. ") +
        v(w, "texte", lg) + ex(w, lg) + " " + (lg === "en" ? "No time? " : "Pas le temps ? ") + v(t, "nom", lg) + (lg === "en" ? ": " : " : ") + "<b>" + v(t, "prix", lg) + "</b>" + ex(t, lg) + ".";
    },
    v3: (B, lg) => {
      const g = pratique(B, "geante"), t = B.tarifs[3];
      return v(g, "titre", lg) + (lg === "en" ? ": " : " : ") + v(g, "texte", lg).replace(/^./, c => c.toLowerCase()) + ex(g, lg) + " " +
        v(t, "nom", lg) + (lg === "en" ? ": " : " : ") + "<b>" + v(t, "prix", lg) + "</b>" + ex(t, lg) + ".";
    },
    v4: (B, lg) => {
      const t = B.tarifs[1], x = pratique(B, "express");
      return v(t, "nom", lg) + (lg === "en" ? ": " : " : ") + "<b>" + v(t, "prix", lg) + "</b>" + ex(t, lg) + ". " +
        v(x, "titre", lg) + (lg === "en" ? ": " : " : ") + v(x, "texte", lg).replace(/^./, c => c.toLowerCase()) + ex(x, lg);
    }
  };

  // Liens calculés (data-lien="tel", "carte")
  const LIENS = {
    tel: B => "tel:+1" + String(B.telephone.valeur).replace(/\D/g, ""),
    carte: B => "https://www.google.com/maps/dir/?api=1&destination=" + encodeURIComponent(B.adresse + ", Montréal, QC")
  };

  const api = { BLOCS, LIENS, etat, heure, esc, MOTS };

  /* ---------- Node (outils/figer_infos.js, tests) : on s'arrête ici ---------- */
  if (typeof module !== "undefined" && module.exports) { module.exports = api; return; }

  /* ---------- navigateur ---------- */
  const B = racine.BOBETTE, doc = document.documentElement;
  racine.Bobette = api;
  if (!B) return; // infos.js absent : la page garde son contenu figé

  api.langue = "fr";
  try { if (localStorage.getItem("bobette-langue") === "en") api.langue = "en"; } catch (e) { /* stockage bloqué : français */ }
  const suivis = []; // fonctions rappelées après chaque rendu (accueil.js, visite.js)
  api.apres = f => { suivis.push(f); };

  api.rendre = function () {
    const lg = api.langue;
    doc.lang = lg === "en" ? "en-CA" : "fr-CA";
    doc.classList.toggle("sans-exemples", !B.mentionsExemple);
    // textes fixes : data-en porte l'anglais, le français d'origine est gardé de côté
    document.querySelectorAll("[data-en]").forEach(el => {
      if (el.dataset.fr === undefined) el.dataset.fr = el.innerHTML;
      const h = lg === "en" ? el.dataset.en : el.dataset.fr;
      if (el.innerHTML !== h) el.innerHTML = h; // on ne touche pas à ce qui est déjà juste : pas de recalcul de mise en page
    });
    [["aria-label", "enAria"], ["placeholder", "enPh"], ["alt", "enAlt"]].forEach(a => {
      document.querySelectorAll("[data-" + a[1].replace(/[A-Z]/g, c => "-" + c.toLowerCase()) + "]").forEach(el => {
        const garde = "fr" + a[1].slice(2);
        if (el.dataset[garde] === undefined) el.dataset[garde] = el.getAttribute(a[0]) || "";
        el.setAttribute(a[0], lg === "en" ? el.dataset[a[1]] : el.dataset[garde]);
      });
    });
    document.querySelectorAll("[data-bloc]").forEach(el => {
      const f = BLOCS[el.dataset.bloc];
      if (!f) return;
      const html = f(B, lg);
      if (el.innerHTML !== html) el.innerHTML = html;
      if (el.hasAttribute("data-vide")) el.hidden = !html;
    });
    document.querySelectorAll("[data-lien]").forEach(el => {
      const f = LIENS[el.dataset.lien];
      if (f) el.setAttribute("href", f(B));
    });
    const e = etat(B);
    document.querySelectorAll("[data-etat]").forEach(el => { el.dataset.etat = e.ouvert ? "ouvert" : "ferme"; });
    document.querySelectorAll(".langue").forEach(b => {
      b.textContent = lg === "en" ? "FR" : "EN";
      // le nom lu commence par le mot affiché (EN / FR), pour la commande vocale
      b.setAttribute("aria-label", lg === "en" ? "FR, passer au français" : "EN, switch to English");
      b.setAttribute("lang", lg === "en" ? "fr" : "en");
    });
    suivis.forEach(f => f(lg));
    fiche();
  };

  // La fiche d'entreprise lue par Google (schema.org) : téléphone, heures et image, seulement s'ils sont confirmés.
  function fiche() {
    const el = document.getElementById("fiche");
    if (!el) return;
    const J = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const f = { "@context": "https://schema.org", "@type": "DryCleaningOrLaundry", name: "Chez Bobette",
      url: location.origin + "/", image: new URL("assets/img/og.jpg", location.href).href,
      address: { "@type": "PostalAddress", streetAddress: B.adresse, addressLocality: "Montréal", addressRegion: "QC", addressCountry: "CA" },
      openingHoursSpecification: (B.heures || []).filter(r => !r.exemple).map(r => ({ "@type": "OpeningHoursSpecification", dayOfWeek: r.j.map(j => J[j]), opens: r.ouvre, closes: r.ferme })) };
    if (!B.telephone.exemple) f.telephone = "+1-" + String(B.telephone.valeur).replace(/\D/g, "").replace(/(\d{3})(\d{3})(\d{4})/, "$1-$2-$3");
    el.textContent = JSON.stringify(f);
  }

  function demarrer() {
    document.querySelectorAll(".langue").forEach(b => b.addEventListener("click", () => {
      api.langue = api.langue === "en" ? "fr" : "en";
      try { localStorage.setItem("bobette-langue", api.langue); } catch (e) { /* tant pis */ }
      api.rendre();
    }));
    api.rendre();
    // l'afficheur « Ouvert / Fermé » reste à l'heure
    setInterval(() => {
      const e = etat(B);
      document.querySelectorAll('[data-bloc^="statut"]').forEach(el => { const h = BLOCS[el.dataset.bloc](B, api.langue); if (el.innerHTML !== h) el.innerHTML = h; });
      document.querySelectorAll("[data-etat]").forEach(el => { el.dataset.etat = e.ouvert ? "ouvert" : "ferme"; });
    }, 30000);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", demarrer);
  else demarrer();
})(typeof window !== "undefined" ? window : globalThis);
