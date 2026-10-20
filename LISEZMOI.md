# Chez Bobette — site web

> **Branche `v2`** : refonte d'après les maquettes (jaune, bleu, papier, papier peint). Fichiers : `index.html`,
> `styles/v2.css`, `js/v2.js`, `assets/v2/`. Aucun assemblage nécessaire. Les infos viennent toujours de `infos.js`.

Buanderie de quartier au 850, avenue Duluth Est (Plateau-Mont-Royal, Montréal), qui se loue aussi pour des tournages.
Site statique : aucun serveur, aucune base de données, aucun pistage.

## Le site

- `index.html` : tout le site. L'enseigne en lettres ballons sert d'écran de chargement ; en défilant, un hublot s'ouvre
  dans le papier peint et le film avance (la pièce, le lavage, l'essorage, le séchage). Ensuite : heures et prix,
  lieu de tournage, formulaire de demande.
- `confidentialite.html` (Loi 25), `404.html`.
- `infos.js` : **toutes les informations modifiables** (heures, prix, téléphone, courriel, fiche technique, tournages passés).
- `js/film.js`, `styles/film.css` : le film.
- `styles/themes.css` : les vrais post-it, le geste de défilement (main sur téléphone, souris sur ordinateur) et le
  design de chaque thème : vitrine (heures), tableau à lettres (prix), mur de post-it, trajet horizontal sur le plan,
  clap, pellicule et scénario (tournage), ticket (demande). `js/trajet.js` : le trajet et la pellicule au défilement. `js/commun.js`, `js/accueil.js`, `js/mur.js`, `styles/commun.css`, `styles/accueil.css` : le reste.
- `assets/<séquence>/NNN.webp` : les images du film. `js/sequences.js` : le nombre d'images par séquence.

## Avant la mise en ligne finale (avec le propriétaire)

1. Dans `infos.js`, corriger chaque ligne marquée `exemple: true` puis l'effacer : téléphone, courriel,
   heures du week-end, prix de la laveuse et de la sécheuse, monnayeur, Wi-Fi, achalandage.
2. Quand tout est confirmé : `mentionsExemple: false`. Les étiquettes « exemple » et la mention
   « Version de démonstration » disparaissent partout.
3. Remplir la fiche technique (`lieu`) et, avec l'accord des productions, la liste `tournages`.
4. Après de vraies vidéos : `visiteProvisoire: false` retire l'étiquette « Images provisoires ».

## Mise en ligne

En ligne sur **https://chez-bobette.netlify.app** (Netlify, relié à ce dépôt : chaque commit sur `main` met le site à jour,
formulaires activés). Avec un nom de domaine, remplacer cette adresse dans index.html, confidentialite.html,
robots.txt et sitemap.xml.


- **Netlify (recommandé pour le client)** : relier ce dépôt GitHub, rien à construire (`netlify.toml` est prêt).
  Le formulaire de tournage fonctionne alors tout seul et les demandes arrivent par courriel.
- **GitHub Pages (aperçu)** : le site fonctionne, mais le formulaire prépare la demande dans le courriel du visiteur
  au lieu de l'envoyer directement. GitHub interdit l'usage commercial durable de Pages.

## Après une modification des styles ou des scripts

La page charge deux fichiers assemblés : `styles/site.min.css` et `js/site.min.js`. Après avoir modifié un fichier de
`styles/` ou de `js/`, relancer `npm install` (la première fois) puis `npm run build`. `infos.js` n'est pas concerné :
il se modifie directement. Sur Netlify, l'assemblage se fait tout seul à chaque mise en ligne.

## Tester en local

```
python3 -m http.server 8000
```
puis ouvrir http://localhost:8000.
