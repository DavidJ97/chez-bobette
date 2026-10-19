/* Chez Bobette — met la page en mode « film » avant le premier affichage (js/film.js la remet en version fixe s'il ne peut pas démarrer). */
if (!matchMedia("(prefers-reduced-motion: reduce)").matches) document.documentElement.classList.add("film");
// Filet de sécurité : si le script du film n'a pas démarré au bout de 15 s (fichier bloqué, réseau coupé), version fixe.
setTimeout(function () { if (!window.BobetteFilm) document.documentElement.classList.remove("film", "attente"); }, 15000);
