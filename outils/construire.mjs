/*
  Chez Bobette — assemble et allège les feuilles de style et les scripts.
    styles/*.css  →  styles/site.min.css   (une seule feuille, minifiée)
    js/*.js       →  js/site.min.js        (un seul script, minifié ; chaque fichier reste isolé :
                                            une erreur dans l'un n'empêche pas les autres de tourner)
  infos.js n'est PAS inclus : il reste lisible et modifiable à la main.
  À relancer après chaque modification d'un fichier de styles/ ou de js/ :  npm run build
*/
import { readFileSync, writeFileSync } from "node:fs";
import { transform } from "esbuild";

const CSS = ["commun", "accueil", "film", "themes"].map(n => `styles/${n}.css`);
const JS = ["commun", "accueil", "mur", "sequences", "trajet", "film"].map(n => `js/${n}.js`);

const css = await transform(CSS.map(f => readFileSync(f, "utf8")).join("\n"), { loader: "css", minify: true, target: ["chrome100", "safari15", "firefox100"] });
writeFileSync("styles/site.min.css", "/* Généré par outils/construire.mjs à partir de styles/*.css — ne pas modifier à la main. */\n" + css.code);

const morceaux = JS.map(f => `try{\n${readFileSync(f, "utf8")}\n}catch(e){console.error(${JSON.stringify(f)},e)}`).join("\n");
const js = await transform(morceaux, { loader: "js", minify: true, target: ["chrome100", "safari15", "firefox100"] });
writeFileSync("js/site.min.js", "/* Généré par outils/construire.mjs à partir de js/*.js — ne pas modifier à la main. */\n" + js.code);

const ko = s => (Buffer.byteLength(s) / 1024).toFixed(1) + " Ko";
console.log("styles/site.min.css", ko(css.code), "· js/site.min.js", ko(js.code));
