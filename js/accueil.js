/*
  Chez Bobette — page d'accueil : le formulaire de demande de tournage.
  Tout le reste de la page (heures, prix, liens) fonctionne sans ce fichier.

  Envoi : chez Netlify, la demande part par Netlify Forms. Partout ailleurs (ordinateur, autre hébergeur),
  la demande est préparée à l'écran, prête à ouvrir dans le courriel du visiteur ou à copier.
*/
(function () {
  "use strict";
  const form = document.getElementById("form"), B = window.BOBETTE, api = window.Bobette;
  if (!form || !B || !api) return;
  const $ = id => document.getElementById(id);
  const en = () => api.langue === "en";
  const arrivee = Date.now();

  const MSG = {
    nom: ["Écrivez votre nom.", "Please enter your name."],
    mail: ["Écrivez un courriel valide, par exemple vous@production.ca.", "Enter a valid email, for example you@production.ca."],
    msg: ["Décrivez votre projet en quelques mots.", "Describe your project in a few words."],
    ok: ["Cochez la case pour envoyer la demande.", "Check the box to send the request."],
    envoye: ["Demande envoyée. Merci !", "Request sent. Thank you!"],
    pret: ["Votre demande est prête. Envoyez-la de votre courriel, ou copiez-la.", "Your request is ready. Send it from your email, or copy it."],
    copie: ["Copié", "Copied"], copier: ["Copier la demande", "Copy the request"]
  };
  const t = cle => MSG[cle][en() ? 1 : 0];
  const val = id => $(id).value.trim();

  function erreur(champ, cle) {
    const el = $("f-" + champ), err = $("e-" + champ);
    err.textContent = cle ? t(cle) : "";
    if (cle) el.setAttribute("aria-invalid", "true"); else el.removeAttribute("aria-invalid");
    return !cle;
  }
  function valider() {
    const res = [
      erreur("nom", val("f-nom") ? null : "nom"),
      erreur("mail", /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(val("f-mail")) ? null : "mail"),
      erreur("msg", val("f-msg") ? null : "msg"),
      erreur("ok", $("f-ok").checked ? null : "ok")
    ];
    if (res.indexOf(false) >= 0) form.querySelector("[aria-invalid=true]").focus();
    return res.indexOf(false) < 0;
  }
  function texteDemande() {
    const d = new FormData(form), L = en()
      ? ["Name", "Company", "Email", "Phone", "Project type", "Spaces", "Dates", "Project"]
      : ["Nom", "Maison de production", "Courriel", "Téléphone", "Type de projet", "Espaces", "Dates visées", "Projet"];
    const lignes = [
      [L[0], d.get("nom")], [L[1], d.get("production")], [L[2], d.get("courriel")], [L[3], d.get("telephone")],
      [L[4], d.get("type")], [L[5], d.getAll("espace").join(", ")], [L[6], d.get("dates")]
    ].filter(l => l[1]).map(l => l[0] + " : " + l[1]);
    return lignes.join("\n") + "\n\n" + L[7] + " :\n" + d.get("message");
  }
  function montrer(titre, repli) {
    $("r-titre").textContent = titre;
    $("repli").hidden = !repli;
    $("resultat").hidden = false;
    $("resultat").focus();
  }
  function preparer() {
    const texte = texteDemande();
    $("r-texte").textContent = texte;
    $("r-courriel").href = "mailto:" + B.courriel.valeur + "?subject=" +
      encodeURIComponent("Tournage chez Bobette · " + (val("f-prod") || val("f-nom"))) + "&body=" + encodeURIComponent(texte);
    montrer(t("pret"), true);
  }

  form.addEventListener("submit", async ev => {
    ev.preventDefault();
    if (!valider()) return;
    // pourriel : champ piège rempli, ou formulaire envoyé en moins de 3 secondes
    if (form.elements["adresse-web"].value || Date.now() - arrivee < 3000) { preparer(); return; }
    const bouton = $("envoyer");
    bouton.disabled = true;
    try {
      const ctl = new AbortController(), minuterie = setTimeout(() => ctl.abort(), 6000);
      const r = await fetch("/", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams(new FormData(form)).toString(), signal: ctl.signal });
      clearTimeout(minuterie);
      // Netlify répond 200 ; un serveur sans formulaire répond 404, 405 ou 501
      if (!r.ok || !/netlify/i.test(r.headers.get("server") || "")) throw new Error("pas de service de formulaire");
      form.reset();
      montrer(t("envoye"), false);
    } catch (e) {
      preparer();
    }
    bouton.disabled = false;
  });

  $("r-copier").addEventListener("click", async () => {
    const b = $("r-copier");
    try { await navigator.clipboard.writeText($("r-texte").textContent); }
    catch (e) { const s = getSelection(), r = document.createRange(); r.selectNodeContents($("r-texte")); s.removeAllRanges(); s.addRange(r); }
    b.textContent = t("copie");
    setTimeout(() => { b.textContent = t("copier"); }, 1800);
  });
  ["nom", "mail", "msg"].forEach(c => $("f-" + c).addEventListener("input", () => erreur(c, null)));
  $("f-ok").addEventListener("change", () => erreur("ok", null));
})();
