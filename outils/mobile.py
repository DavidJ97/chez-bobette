"""Génère la version téléphone (index.html, entre <!--MOBILE--> et <!--/MOBILE-->).
Chaque écran est l'image de la maquette corrigée (assets/m/) ; on pose par-dessus des zones cliquables,
les champs du formulaire et ce qui bouge. Coordonnées en pixels de l'image, converties en %."""
import re, pathlib
R = pathlib.Path(__file__).resolve().parent.parent
TEL = 'tel:+15145222612'
MAPS = 'https://www.google.com/maps/dir/?api=1&amp;destination=850%2C%20avenue%20Duluth%20Est%2C%20Montr%C3%A9al%2C%20QC&amp;travelmode=walking'

def box(x, y, w, h):
    return f'style="--x:{x};--y:{y};--l:{w};--t:{h}"'

def ecran(id_, nom, W, H, alt, corps, cls=''):
    return (f'<section class="m-ecran {cls}" id="{id_}" aria-label="{nom}">\n'
            f'  <div class="m-planche" style="--w:{W};--h:{H}">\n'
            f'    <img src="assets/m/{id_[2:]}.webp" width="{W}" height="{H}" alt="{alt}" {"loading=\"lazy\" " if id_ != "m-accueil" else "fetchpriority=\"high\" "}decoding="async">\n'
            + corps +
            '  </div>\n</section>\n')

def zone(x, y, w, h, href, label, extra=''):
    tgt = ' target="_blank" rel="noopener"' if href.startswith('http') else ''
    return f'    <a class="m-zone" href="{href}"{tgt} aria-label="{label}" {box(x,y,w,h)}{extra}></a>\n'

out = []
# INTRO : seulement à la première visite, jamais plus de 2,5 s, « Passer l'intro » ferme tout de suite
out.append(
'<div class="m-intro" id="m-intro" hidden>\n'
'  <div class="m-planche" style="--w:853;--h:1844">\n'
'    <img src="assets/m/intro.webp" width="853" height="1844" alt="Ça va tourner. Une petite pièce. Une grande visite.">\n'
f'    <span class="m-intro-jauge" {box(95,1515,661,14)}><i id="m-intro-jauge"></i></span>\n'
f'    <button class="m-zone" type="button" id="m-intro-passer" aria-label="Passer l\'intro" {box(127,1580,591,110)}></button>\n'
'  </div>\n</div>\n')
# ACCUEIL
out.append(ecran('m-accueil', 'Accueil', 853, 1713,
  "Chez Bobette, la buanderie du Plateau. 850, avenue Duluth Est, Montréal. Votre brassée, votre quartier.",
  f'    <p class="m-neon" {box(28,1222,262,112)}><span data-statut>Ouvert</span><small data-statut-suite></small></p>\n'
  + zone(156,1369,538,112,'#m-horaires','Horaires et prix')
  + zone(322,1488,206,40,'#m-trajet','Venir nous voir')
  + zone(612,1144,200,200,'#m-film','Découvrir la buanderie',' data-rond')
  + zone(0,1600,853,113,'#m-tournage','Un lieu de tournage')))
# HORAIRES & PRIX
out.append(ecran('m-horaires', 'Horaires et prix', 830, 1755,
  "Horaires et petits prix. Heures d'ouverture : lundi au vendredi, 8 h à 23 h ; samedi et dimanche, 9 h à 21 h. "
  "Laveuse 3,50 $. Sécheuse 0,25 $ par tranche. Service tout inclus 8,25 $. Manteau d'hiver 12 $, 2 pour 20 $. "
  "Les machines prennent les pièces de 25 ¢. Horaires et tarifs à confirmer.",
  zone(215,1640,400,62,'#m-trajet','Nous retrouver')))
# LE FILM
out.append(
'<section class="m-film" id="m-film" aria-label="La buanderie, le film">\n'
'  <div class="m-collant">\n'
'  <div class="m-planche" style="--w:933;--h:1541">\n'
'    <img src="assets/m/essorage.webp" width="933" height="1541" alt="On monte d\'un tour. La brassée poursuit son cycle : payer, laver, essorer, sécher." loading="lazy" decoding="async">\n'
f'    <canvas class="m-canvas" id="m-canvas" width="600" height="600" {box(240,667,450,452)} role="img" aria-label="Le film de la brassée : la pièce, le lavage, l\'essorage, le séchage"></canvas>\n'
f'    <span class="m-vitre" aria-hidden="true" {box(240,667,450,452)}></span>\n'
f'    <button class="m-lecture" id="m-lecture" type="button" aria-pressed="false" aria-label="Lecture automatique du film" {box(428,1040,78,78)}><span></span></button>\n'
f'    <p class="m-lcd" aria-live="polite" {box(62,1178,840,60)}><b id="m-lcd">1/4 · Paiement</b><span class="m-jauge" {box(278,14,504,19)}><i id="m-jauge"></i></span></p>\n'
f'    <span class="m-marque" id="m-marque" aria-hidden="true" {box(127,1251,68,68)}></span>\n'
f'    <span class="m-trait" id="m-trait" aria-hidden="true" {box(123,1350,79,5)}></span>\n'
+ ''.join(f'    <button class="m-zone m-etape" type="button" data-etape="{i}" aria-label="Étape {i+1} : {n}" {box(x,1250,w,125)}></button>\n'
          for i,(n,x,w) in enumerate([('payer',54,210),('laver',264,206),('essorer',470,206),('sécher',676,214)]))
+ zone(164,1393,606,107,'#m-savoir','Passer le film') +
'  </div>\n  </div>\n</section>\n')
# BON À SAVOIR
out.append(ecran('m-savoir', 'Bon à savoir', 853, 1712,
  "Bon à savoir, tout pour votre brassée. Monnaie : les machines prennent les pièces de 25 ¢. Monnayeur : changez vos billets sur place. "
  "Wi-Fi gratuit pendant la brassée. Laveuse géante pour les tapis et les douillettes. Bobette Express : cueillette et livraison sur appel. Services à confirmer.",
  zone(507,1517,282,84,TEL,'Appeler Bobette Express',' data-tel-href')))
# POUR VENIR
out.append(ecran('m-trajet', 'Pour venir', 934, 1393,
  "On se retrouve ? 850, avenue Duluth Est. Sortez au métro Mont-Royal, puis suivez l'avenue Duluth Est jusqu'à la buanderie.",
  zone(156,1182,319,87,MAPS,'Itinéraire (ouvre Google Maps)')
  + zone(491,1182,287,87,TEL,'Appeler',' data-tel-href')
  + zone(20,90,820,880,MAPS,'Ouvrir le plan dans Google Maps',' tabindex="-1"')))
# LIEU DE TOURNAGE
photos = [('4c503a9045','Intérieur : la rangée de laveuses'),('fb5654e97e','Façade : les lettres ballons au coin de la rue'),('299747941c','Ruelle voisine')]
out.append(ecran('m-tournage', 'Lieu de tournage', 853, 1711,
  "Ça tourne chez Bobette. Un lieu, trois décors : la buanderie, sa façade et la ruelle. Films, séries, publicités, vidéoclips, photo. Votre demande arrive directement au propriétaire.",
  f'    <div class="m-photos" {box(18,585,817,491)}>'
  + ''.join(f'<img src="assets/img/{f}.webp" width="720" height="540" alt="{a}" loading="lazy" decoding="async"{" hidden" if i!=1 else ""}>' for i,(f,a) in enumerate(photos))
  + '</div>\n'
  + f'    <p class="m-compteur" id="m-compteur" {box(372,1081,110,30)}>02 / 03</p>\n'
  + f'    <button class="m-zone" type="button" data-photo="-1" aria-label="Photo précédente" {box(36,1068,90,52)}></button>\n'
  + f'    <button class="m-zone" type="button" data-photo="+1" aria-label="Photo suivante" {box(728,1068,90,52)}></button>\n'
  + ''.join(f'    <button class="m-zone m-onglet" type="button" data-photo="{i}" aria-label="{n}" aria-pressed="{str(i==1).lower()}" {box(x,1133,w,84)}></button>\n'
            for i,(n,x,w) in enumerate([('Intérieur',50,240),('Façade',308,238),('Ruelle',563,240)]))
  + zone(192,1472,470,56,'#m-demande','Parlons tournage')))
# PAR TÉLÉPHONE
out.append(ecran('m-fiche', 'Préparons votre tournage', 853, 1130,
  "Préparons votre tournage. Par téléphone : 514 522-2612, pour la buanderie comme pour un tournage.",
  zone(110,545,470,80,TEL,'Appeler le 514 522-2612',' data-tel-href')
  + zone(70,712,720,240,TEL,'Appeler le 514 522-2612',' data-tel-href tabindex="-1"')
  + zone(135,1008,585,84,'#m-demande','Décrire mon projet')))
# DEMANDE
champ = lambda tag, name, x, y, w, h, attrs='': (
  f'    <label class="m-champ" {box(x,y,w,h)}><span class="sr">{attrs.split("|")[0]}</span>'
  + (f'<textarea name="{name}" {attrs.split("|")[1]}></textarea>' if tag=='textarea' else f'<input name="{name}" {attrs.split("|")[1]}>')
  + '</label>\n')
puce = lambda typ, name, val, x, y, w, h: (
  f'    <label class="m-puce" {box(x,y,w,h)}><input type="{typ}" name="{name}" value="{val}"><span class="sr">{val}</span><i aria-hidden="true"></i></label>\n')
form = (
'<section class="m-ecran" id="m-demande" aria-label="Votre demande de tournage">\n'
'  <form class="m-planche" style="--w:753;--h:1953" name="tournage-mobile" method="POST" data-netlify="true" netlify-honeypot="adresse-web" novalidate id="m-form">\n'
'    <img src="assets/m/demande.webp" width="753" height="1953" alt="Parlons tournage. Décrivez votre production. Les champs marqués d\'un astérisque sont obligatoires." loading="lazy" decoding="async">\n'
'    <input type="hidden" name="form-name" value="tournage-mobile">\n'
'    <p class="piege"><label>Ne pas remplir <input type="text" name="adresse-web" tabindex="-1" autocomplete="off"></label></p>\n'
+ champ('input','nom',97,684,605,54,'Nom (obligatoire)|type="text" autocomplete="name" required')
+ champ('input','production',97,782,605,54,'Maison de production|type="text" autocomplete="organization"')
+ champ('input','courriel',97,882,605,54,'Courriel (obligatoire)|type="email" autocomplete="email" required')
+ champ('input','telephone',97,981,605,54,'Téléphone|type="tel" autocomplete="tel"')
+ f'    <p class="m-aide" {box(250,1046,440,32)}>· un seul choix</p>\n'
+ '    <fieldset class="m-groupe"><legend class="sr">Type de projet (un seul choix)</legend>\n'
+ ''.join(puce('radio','type',v,x,y,w,h) for v,x,y,w,h in [('Long métrage',97,1081,201,52),('Série',314,1082,184,51),('Publicité',515,1082,187,51),('Vidéoclip',97,1146,201,52),('Photo',314,1146,172,52)])
+ '    </fieldset>\n'
+ f'    <p class="m-aide" {box(190,1212,440,32)}>· plusieurs choix possibles</p>\n'
+ '    <fieldset class="m-groupe"><legend class="sr">Espaces (plusieurs choix possibles)</legend>\n'
+ ''.join(puce('checkbox','espaces',v,x,y,w,h) for v,x,y,w,h in [('Intérieur',97,1250,186,53),('Façade',300,1250,192,53),('Ruelle',509,1250,193,53)])
+ '    </fieldset>\n'
+ champ('input','dates',97,1355,605,54,'Dates visées|type="text" placeholder="Dates et horaires souhaités"')
+ champ('textarea','message',97,1460,605,123,'Votre projet (obligatoire)|required')
+ f'    <label class="m-accord" {box(92,1643,520,85)}><input type="checkbox" name="consentement" value="oui" required><span class="sr">J\'accepte que mes renseignements servent uniquement à répondre à cette demande.</span><i aria-hidden="true"></i></label>\n'
+ f'    <a class="m-zone" href="confidentialite.html" aria-label="Politique de confidentialité" {box(94,1724,248,34)}></a>\n'
+ f'    <button class="m-zone m-envoyer" type="submit" aria-label="Envoyer la demande" {box(97,1782,605,72)}></button>\n'
+ '  </form>\n'
+ '  <p class="m-resultat" id="m-resultat" role="status" hidden></p>\n'
+ '</section>\n')
out.append(form)
out.append(
'<footer class="m-pied">\n'
'  <p>Chez Bobette · 850, avenue Duluth Est · Montréal · <a href="tel:+15145222612" data-tel>514 522-2612</a></p>\n'
'  <p><a href="confidentialite.html">Politique de confidentialité</a> · <span data-provisoire>Version de démonstration</span></p>\n'
'</footer>\n'
'<nav class="m-barre" aria-label="Raccourcis">\n'
'  <img src="assets/m/barre.webp" width="853" height="130" alt="">\n'
'  <a href="#m-horaires" style="--i:0">Infos</a><a href="#m-trajet" style="--i:1">Itinéraire</a><a href="tel:+15145222612" data-tel-href style="--i:2">Appeler</a><a href="#m-tournage" style="--i:3">Tournages</a>\n'
'</nav>\n')
bloc = '<!--MOBILE-->\n<div class="mob" id="mob">\n' + ''.join(out) + '</div>\n<!--/MOBILE-->'
p = R / 'index.html'
s = p.read_text()
if '<!--MOBILE-->' in s:
    s = re.sub(r'<!--MOBILE-->.*?<!--/MOBILE-->', lambda m: bloc, s, flags=re.S)
else:
    s = s.replace('<main id="main">\n', '<main id="main">\n' + bloc + '\n', 1)
p.write_text(s)
print('ok', len(bloc))
