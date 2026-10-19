/*
  Chez Bobette — deux mouvements liés au défilement, après le film.
  1. « Pour venir » : la scène reste à l'écran et on suit le trajet à pied sur le plan agrandi, comme une caméra
     qui accompagne le marcheur : du métro Mont-Royal vers le sud, puis vers l'est sur Duluth jusqu'à la buanderie.
     À la fin, le plan recule pour montrer tout le quartier. Sans script ou en « mouvement réduit » :
     le plan entier se fait défiler au doigt et les quatre étapes sont toutes visibles.
  2. La pellicule du lieu de tournage glisse de côté pendant qu'on descend (sauf sur écran tactile : au doigt).
*/
(function () {
  "use strict";
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const doc = document.documentElement;
  const trajet = document.getElementById("trajet"), carte = document.getElementById("carte"), chemin = document.getElementById("chemin");
  const etapes = Array.from(document.querySelectorAll("#tr-etapes li"));
  const pellicule = document.querySelector(".pellicule"), bande = document.querySelector(".bande");
  const tactile = window.matchMedia("(hover: none)").matches;
  const W = 1800, H = 720;
  let long = 0, anim = 0, vue = -1;
  const borne = x => Math.min(1, Math.max(0, x));
  const doux = x => x * x * (3 - 2 * x);

  if (trajet && carte && chemin) {
    doc.classList.add("trajet-anime");
    long = chemin.getTotalLength();
    carte.setAttribute("width", W); carte.setAttribute("height", H);
  }
  // des pointillés (2 px tracés, 20 px vides) jusqu'à « fait », puis plus rien
  function pointilles(fait) {
    const d = [];
    for (let i = 0, n = Math.floor(fait / 22); i < n; i++) d.push(2, 20);
    d.push(0, long + 40);
    return d.join(" ");
  }
  function tic() {
    anim = 0;
    const h = window.innerHeight;
    if (trajet && carte && chemin) {
      const r = trajet.getBoundingClientRect(), p = borne(-r.top / Math.max(1, r.height - h));
      const cadre = carte.parentElement, cw = cadre.clientWidth, ch = cadre.clientHeight;
      if (cw && ch) {
        const marche = borne(p / 0.82);                       // la marche, puis on recule
        const fait = long * marche, tete = chemin.getPointAtLength(fait);
        const plein = Math.max(cw / W, ch / H);               // tout le plan
        const proche = ch > cw ? plein * 1.12 : Math.min(plein * 2.2, Math.max(plein * 1.3, ch * 1.45 / H)); // plan agrandi autour du marcheur (écran debout : le plan est déjà grand)
        const recul = doux(borne((p - 0.82) / 0.16));
        const s = proche + (plein - proche) * recul;
        const cx = (cw / 2 - tete.x * s) * (1 - recul) + (cw - W * s) / 2 * recul;
        const cy = (ch / 2 - tete.y * s) * (1 - recul) + (ch - H * s) / 2 * recul;
        const x = Math.min(0, Math.max(cw - W * s, cx)), y = Math.min(0, Math.max(ch - H * s, cy));
        carte.style.transform = "translate(" + x.toFixed(1) + "px," + y.toFixed(1) + "px) scale(" + s.toFixed(4) + ")";
        chemin.style.strokeDasharray = pointilles(fait);
      }
      const e = p < 0.18 ? 0 : p < 0.42 ? 1 : p < 0.78 ? 2 : 3;
      if (e !== vue) { etapes.forEach((li, i) => li.classList.toggle("on", i === e)); vue = e; }
    }
    if (bande && pellicule && !tactile) {
      const r = bande.getBoundingClientRect(), p = borne((h - r.top) / (h + r.height));
      pellicule.style.setProperty("--x", (-Math.max(0, pellicule.scrollWidth - bande.clientWidth) * p).toFixed(1) + "px");
    }
  }
  function demander() { if (!anim) anim = requestAnimationFrame(tic); }
  window.addEventListener("scroll", demander, { passive: true });
  window.addEventListener("resize", demander);
  if (tactile && pellicule) pellicule.style.transform = "none";
  demander();
})();
