#!/usr/bin/env python3
"""
Chez Bobette v2 — fabrique les « planches » du site à partir des maquettes (outils/maquettes/*.png).

Chaque écran du site EST la maquette : le fond est l'image d'origine (1536 × 1024), au pixel près.
Ce script prépare :
  - assets/v2/p/<écran>.webp      le fond, prolongé sur les côtés (reflet) pour les écrans plus larges que 3:2
  - assets/v2/p/<écran>-net.webp  le même fond sans textes (pour la version anglaise et les états qui changent)
  - assets/v2/p/*.webp            quelques pièces détachées (boutons du hublot, vitre du hublot d'accueil)
  - le HTML de chaque planche (zones cliquables, textes anglais, pastilles des points rouges), injecté
    dans index.html entre les marqueurs <!--PLANCHE:nom--> … <!--/PLANCHE:nom-->.

Relancer après avoir changé une maquette ou une zone :  python3 outils/planches.py
"""
import json, re, html
from pathlib import Path
import numpy as np
import cv2
from PIL import Image

RACINE = Path(__file__).resolve().parent.parent
SRC = RACINE / "outils" / "maquettes"
OUT = RACINE / "assets" / "v2" / "p"
OUT.mkdir(parents=True, exist_ok=True)
PAD_X, PAD_Y = 320, 200          # prolongement du fond (reflet) autour de la maquette

# ---------------------------------------------------------------------------
# Barre du bas : zones cliquables (y0, y1) et libellés anglais par écran
# ---------------------------------------------------------------------------
NAV_LIENS = [("#infos", "Infos", "Infos"), ("#itineraire", "Itinéraire", "Directions"),
             ("tel", "Appeler", "Call"), ("#tournages", "Tournages", "Filming")]

def nav(y0, y1, x0=0, x1=1536, libelles=None):
    """libelles : 4 boîtes (x0,y0,x1,y1) des mots, pour la version anglaise (None = pas de traduction)."""
    w = (x1 - x0) / 4
    z = []
    for i, (href, fr, en) in enumerate(NAV_LIENS):
        z.append({"type": "lien", "box": (x0 + i * w, y0, x0 + (i + 1) * w, y1), "href": href, "label": fr, "label_en": en})
    t = []
    if libelles:
        for (href, fr, en), b in zip(NAV_LIENS, libelles):
            if fr.upper() != en.upper():
                t.append({"box": b, "en": en.upper(), "mode": "sombre", "police": "nav"})
    return z, t

ENTETE = [
    {"type": "menu", "box": (1356, 0, 1494, 142), "label": "Menu", "label_en": "Menu"},
    {"type": "langue", "lg": "fr", "box": (1236, 30, 1272, 70), "label": "Français"},
    {"type": "langue", "lg": "en", "box": (1278, 30, 1322, 70), "label": "English"},
]
LOGO = {"type": "lien", "box": (40, 22, 560, 100), "href": "#accueil", "label": "Chez Bobette, accueil", "label_en": "Chez Bobette, home"}
FR_EN = {"box": (1236, 32, 1322, 70), "en": "FR / EN", "police": "langue", "mode": "sombre"}

# ---------------------------------------------------------------------------
# Les écrans
#   textes : zones de texte de la maquette. « en » = texte anglais posé sur le fond nettoyé.
#            mode : sombre (texte foncé), clair (texte pâle), couleur (différent du fond), plein (toute la zone)
#   zones  : zones cliquables
# ---------------------------------------------------------------------------
E = {}

E["accueil"] = {
    "src": "accueil.png", "couleur": "#f6d22c",
    "textes": [
        {"box": (50, 30, 262, 57), "en": "850 Duluth Avenue East", "police": "sans"},
        {"box": (45, 118, 857, 442), "en": "THE PLATEAU'S|LAUNDROMAT.", "police": "titre"},
        {"box": (400, 450, 750, 483), "en": "Your load. Your neighbourhood.", "police": "sans"},
        {"box": (445, 524, 697, 570), "en": "HOURS & PRICES ↗", "police": "etiquette"},
        {"id": "neon", "box": (518, 586, 762, 682), "mode": "couleur", "seuil": 60, "police": "neon", "en": "Open"},
        {"box": (610, 680, 775, 714), "en": "COME SEE US", "police": "etiquette", "souligne": True},
        {"box": (70, 730, 308, 792), "en": "Our place, on Duluth", "police": "main", "rot": -6},
        {"box": (1322, 578, 1462, 642), "en": "DISCOVER ↗", "police": "etiquette", "rot": -12},
        {"box": (50, 850, 396, 879), "en": "LAUNDROMAT · STOREFRONT · LANE", "police": "surtitre"},
        {"box": (46, 880, 836, 998), "en": "A FILMING LOCATION", "police": "titre"},
        {"box": (898, 884, 1312, 998), "en": "The laundromat, its storefront and the lane next door|are available for films, series, commercials,|music videos and photo shoots.|Your request goes straight to the owner.", "police": "sans-l"},
        FR_EN,
    ],
    "zones": ENTETE + [
        {"type": "lien", "box": (418, 498, 724, 596), "href": "#infos", "label": "Horaires et prix", "label_en": "Hours and prices"},
        {"type": "lien", "box": (608, 678, 778, 716), "href": "#itineraire", "label": "Venir nous voir", "label_en": "Come see us"},
        {"type": "lien", "box": (1300, 524, 1472, 694), "href": "#film", "label": "Découvrir la buanderie", "label_en": "Discover the laundromat", "rond": True},
        {"type": "lien", "box": (1330, 808, 1536, 1024), "href": "#tournages", "label": "Lieu de tournage", "label_en": "Filming location"},
    ],
}

nz, nt = nav(962, 1024, libelles=[(262, 984, 322, 1006), (564, 984, 666, 1006), (912, 984, 992, 1006), (1226, 984, 1328, 1006)])
E["film"] = {
    "src": "film.png", "couleur": "#4cbff0",
    "textes": [
        {"box": (698, 38, 838, 76), "en": "THE LAUNDROMAT", "police": "surtitre", "souligne": True},
        {"box": (50, 140, 230, 163), "en": "THE LAUNDROMAT", "police": "surtitre"},
        {"box": (44, 170, 668, 464), "en": "IT SPINS.|YOU BREATHE.", "police": "titre"},
        {"box": (48, 468, 624, 544), "en": "While your load runs, take your time.|A moment for you, in the heart of the Plateau.", "police": "sans"},
        {"id": "lcd", "box": (44, 546, 659, 602), "mode": "plein"},
        {"box": (102, 782, 288, 834), "en": "Nice in here.", "police": "main", "rot": -6},
        {"box": (402, 644, 642, 692), "en": "SKIP THE FILM ↗", "police": "etiquette", "rot": -2},
        {"box": (204, 858, 314, 908), "en": "PAY", "police": "etiquette"},
        {"box": (592, 858, 697, 908), "en": "WASH", "police": "etiquette"},
        {"box": (938, 858, 1074, 908), "en": "SPIN", "police": "etiquette"},
        {"box": (1314, 856, 1430, 908), "en": "DRY", "police": "etiquette"},
        {"id": "pastille", "box": (514, 849, 581, 916), "mode": "plein"},
        {"id": "trait", "box": (600, 913, 722, 934), "mode": "sombre"},
        FR_EN,
    ] + nt,
    "zones": [LOGO] + ENTETE + [
        {"type": "lien", "box": (368, 622, 668, 718), "href": "#infos", "label": "Passer le film", "label_en": "Skip the film", "id": "f-passer"},
        {"type": "etape", "n": 0, "box": (48, 838, 418, 940), "label": "Étape 1 : payer", "label_en": "Step 1: pay"},
        {"type": "etape", "n": 1, "box": (418, 838, 782, 940), "label": "Étape 2 : laver", "label_en": "Step 2: wash"},
        {"type": "etape", "n": 2, "box": (782, 838, 1150, 940), "label": "Étape 3 : essorer", "label_en": "Step 3: spin"},
        {"type": "etape", "n": 3, "box": (1150, 838, 1490, 940), "label": "Étape 4 : sécher", "label_en": "Step 4: dry"},
    ] + nz,
}

nz, nt = nav(935, 1000, 45, 1492, libelles=[(234, 956, 292, 978), (562, 956, 668, 978), (938, 956, 1020, 978), (1286, 956, 1394, 978)])
E["savoir"] = {
    "src": "savoir.png", "couleur": "#efe7d6",
    "textes": [
        {"box": (46, 84, 932, 264), "en": "GOOD TO KNOW.", "police": "titre"},
        {"box": (114, 246, 396, 284), "en": "Everything for your load.", "police": "sans", "rot": -2},
        {"box": (300, 330, 476, 384), "en": "COINS", "police": "etiquette"},
        {"box": (300, 398, 496, 506), "en": "The machines|take|quarters.", "police": "main"},
        {"box": (795, 334, 987, 394), "en": "CHANGE", "police": "etiquette"},
        {"box": (794, 412, 990, 488), "en": "Break your bills|on site.", "police": "main", "rot": -3},
        {"box": (1308, 368, 1480, 486), "en": "Free Wi-Fi|while your|load runs.", "police": "main", "rot": -3},
        {"box": (518, 612, 764, 674), "en": "GIANT WASHER", "police": "etiquette"},
        {"box": (534, 698, 778, 772), "en": "For rugs|and comforters.", "police": "main"},
        {"box": (1204, 648, 1442, 724), "en": "Pickup and delivery|by phone.", "police": "main"},
        {"box": (1268, 744, 1418, 792), "en": "CALL ↗", "police": "etiquette", "rot": -3},
        {"box": (1322, 826, 1490, 872), "en": "Services to be confirmed.", "police": "main", "rot": -5},
        FR_EN,
    ] + nt,
    "zones": [LOGO] + ENTETE + [
        {"type": "lien", "box": (1210, 722, 1460, 810), "href": "tel", "label": "Appeler Bobette express", "label_en": "Call Bobette express"},
    ] + nz,
}

nz, nt = nav(915, 1024, libelles=[(550, 952, 684, 980), (936, 952, 1038, 980), (1278, 952, 1416, 980)][:0] or [(208, 952, 276, 980), (550, 952, 684, 980), (936, 952, 1038, 980), (1278, 952, 1416, 980)])
E["trajet1"] = {
    "src": "trajet1.png", "couleur": "#4cbff0", "points": True,
    "textes": [
        {"box": (44, 124, 897, 286), "en": "GETTING HERE.", "police": "titre"},
        {"box": (68, 298, 746, 338), "en": "850 Duluth Avenue East · Plateau-Mont-Royal", "police": "sans"},
        {"box": (60, 612, 270, 668), "en": "Our place, on Duluth", "police": "main", "rot": -6},
        {"box": (528, 608, 792, 642), "en": "DULUTH AVENUE", "police": "rue"},
        {"box": (1395, 316, 1536, 402), "en": "TO|BOBETTE'S", "police": "etiquette"},
        {"id": "num", "box": (78, 728, 104, 758), "mode": "clair", "seuil": 170},
        {"id": "phrase", "box": (130, 708, 498, 762), "en": "Get off at Mont-Royal metro.", "police": "main", "rot": -2},
        {"id": "continuez", "box": (234, 762, 388, 796), "en": "KEEP GOING →", "police": "etiquette", "souligne": True},
        {"box": (110, 846, 244, 878), "en": "DIRECTIONS ↗", "police": "bouton", "mode": "clair"},
        {"box": (372, 846, 470, 878), "en": "CALL", "police": "bouton"},
        {"id": "compteur", "box": (672, 840, 1090, 878), "mode": "plein"},
        FR_EN,
    ] + nt,
    "zones": [LOGO] + ENTETE + [
        {"type": "lien", "box": (46, 826, 294, 895), "href": "carte", "label": "Itinéraire", "label_en": "Directions"},
        {"type": "lien", "box": (301, 826, 504, 895), "href": "tel", "label": "Appeler", "label_en": "Call"},
        {"type": "suivant", "box": (232, 760, 390, 798), "label": "Continuez", "label_en": "Keep going"},
        {"type": "suivant", "box": (1352, 245, 1536, 860), "label": "Vers Bobette", "label_en": "To Bobette's"},
    ] + nz,
}

nz, nt = nav(915, 1024, libelles=[(208, 952, 276, 980), (550, 952, 684, 980), (936, 952, 1038, 980), (1278, 952, 1416, 980)])
E["trajet3"] = {
    "src": "trajet3.png", "couleur": "#f6d22c", "points": True,
    "textes": [
        {"box": (78, 138, 742, 342), "en": "MEET US AT|BOBETTE'S.", "police": "titre"},
        {"box": (80, 344, 354, 374), "en": "850 Duluth Avenue East", "police": "sans"},
        {"box": (258, 606, 542, 637), "en": "DULUTH AVENUE EAST", "police": "rue"},
        {"box": (618, 408, 650, 612), "en": "SAINT-HUBERT ST.", "police": "rue", "rot": -90},
        {"box": (932, 590, 1168, 668), "en": "You're here!", "police": "main", "rot": -6},
        {"box": (1342, 262, 1532, 432), "en": "IT'S|ROLLING.", "police": "titre", "mode": "couleur", "couleur": "#f6d22c"},
        {"box": (1362, 442, 1522, 522), "en": "FILMING|LOCATION →", "police": "etiquette", "mode": "clair", "couleur": "#f4eedd"},
        {"box": (186, 748, 658, 800), "en": "Keep going on Duluth toward Bobette's.", "police": "main"},
        {"box": (906, 796, 1060, 830), "en": "DIRECTIONS ↗", "police": "bouton", "mode": "clair"},
        {"box": (1172, 796, 1278, 830), "en": "CALL", "police": "bouton"},
        FR_EN,
    ] + nt,
    "zones": [LOGO] + ENTETE + [
        {"type": "lien", "box": (846, 776, 1080, 847), "href": "carte", "label": "Itinéraire", "label_en": "Directions"},
        {"type": "lien", "box": (1091, 776, 1312, 847), "href": "tel", "label": "Appeler", "label_en": "Call"},
        {"type": "lien", "box": (1330, 140, 1536, 912), "href": "#tournages", "label": "Lieu de tournage", "label_en": "Filming location"},
    ] + nz,
}

nz, nt = nav(922, 1024, libelles=[(176, 956, 244, 986), (518, 956, 648, 986), (908, 956, 1010, 986), (1302, 956, 1438, 986)])
E["trajet4"] = {
    "src": "trajet4.png", "couleur": "#f6d22c", "points": True,
    "textes": [
        {"box": (44, 112, 708, 292), "en": "YOU'RE HERE.", "police": "titre"},
        {"box": (48, 278, 344, 324), "en": "850 Duluth Avenue East", "police": "sans", "rot": -3},
        {"box": (372, 458, 548, 502), "en": "DULUTH AVENUE EAST", "police": "rue", "rot": -10},
        {"box": (272, 372, 302, 592), "en": "SAINT-HUBERT ST.", "police": "rue", "rot": -90},
        {"box": (1358, 326, 1532, 414), "en": "FILMING|LOCATION →", "police": "etiquette", "mode": "clair", "couleur": "#f4eedd"},
        {"box": (530, 696, 922, 784), "en": "Look for the balloon letters!|You're at Bobette's.", "police": "main"},
        {"box": (994, 772, 1122, 802), "en": "DIRECTIONS ↗", "police": "bouton", "mode": "clair"},
        {"box": (1202, 772, 1292, 804), "en": "CALL", "police": "bouton"},
        FR_EN,
    ] + nt,
    "zones": [LOGO] + ENTETE + [
        {"type": "lien", "box": (950, 752, 1136, 822), "href": "carte", "label": "Itinéraire", "label_en": "Directions"},
        {"type": "lien", "box": (1140, 752, 1308, 822), "href": "tel", "label": "Appeler", "label_en": "Call"},
        {"type": "lien", "box": (1324, 162, 1536, 842), "href": "#tournages", "label": "Lieu de tournage", "label_en": "Filming location"},
    ] + nz,
}

# ---------------------------------------------------------------------------
def charge(nom):
    return cv2.cvtColor(np.array(Image.open(SRC / nom).convert("RGB")), cv2.COLOR_RGB2BGR)

def masque(img, t):
    x0, y0, x1, y1 = map(int, t["box"])
    zone = img[y0:y1, x0:x1]
    m = np.zeros(img.shape[:2], np.uint8)
    mode = t.get("mode", "sombre")
    if mode == "plein":
        sub = np.full(zone.shape[:2], 255, np.uint8)
    elif mode == "sombre":
        L = cv2.cvtColor(zone, cv2.COLOR_BGR2GRAY)
        sub = (L < t.get("seuil", 110)).astype(np.uint8) * 255
    elif mode == "clair":
        L = cv2.cvtColor(zone, cv2.COLOR_BGR2GRAY)
        sub = (L > t.get("seuil", 185)).astype(np.uint8) * 255
    elif mode == "jaune":
        hsv = cv2.cvtColor(zone, cv2.COLOR_BGR2HSV)
        sub = ((hsv[..., 0] > 18) & (hsv[..., 0] < 35) & (hsv[..., 1] > 120)).astype(np.uint8) * 255
    else:  # couleur : tout ce qui s'écarte de la couleur du bord de la zone
        bord = np.concatenate([zone[0], zone[-1], zone[:, 0], zone[:, -1]])
        ref = np.median(bord, axis=0)
        d = np.linalg.norm(zone.astype(float) - ref, axis=2)
        sub = (d > t.get("seuil", 45)).astype(np.uint8) * 255
    sub = cv2.dilate(sub, np.ones((5, 5), np.uint8), iterations=1)
    m[y0:y1, x0:x1] = sub
    return m

def boite_serree(m, box):
    x0, y0, x1, y1 = map(int, box)
    ys, xs = np.nonzero(m[y0:y1, x0:x1])
    if len(xs) == 0:
        return box
    return (x0 + xs.min(), y0 + ys.min(), x0 + xs.max() + 1, y0 + ys.max() + 1)

def points_rouges(img):
    b, g, r = [img[..., i].astype(int) for i in range(3)]
    m = ((r > 170) & (g < 95) & (b < 95)).astype(np.uint8)
    n, lab, st, cen = cv2.connectedComponentsWithStats(m)
    garde = np.zeros_like(m)
    pts = []
    for i in range(1, n):
        a = st[i, cv2.CC_STAT_AREA]
        w, h = st[i, cv2.CC_STAT_WIDTH], st[i, cv2.CC_STAT_HEIGHT]
        if 60 < a < 900 and 0.6 < w / h < 1.6:
            garde[lab == i] = 1
            pts.append({"x": round(float(cen[i][0]), 1), "y": round(float(cen[i][1]), 1), "r": round(float(np.sqrt(a / np.pi)) + 0.6, 1)})
    return pts, garde

def ordre_trajet(pts):
    """Du métro vers Bobette : d'abord la descente verticale (même x), puis vers la droite."""
    if not pts:
        return pts
    xs = np.array([p["x"] for p in pts])
    x_vert = np.median(xs[xs < np.percentile(xs, 40)]) if len(xs) > 4 else xs.min()
    vert = [p for p in pts if abs(p["x"] - x_vert) < 14]
    y_coude = max(p["y"] for p in vert) if vert else 0
    vert = [p for p in vert if p["y"] < y_coude + 1]
    reste = [p for p in pts if p not in vert]
    return sorted(vert, key=lambda p: p["y"]) + sorted(reste, key=lambda p: (p["x"], p["y"]))

def prolonge(img):
    """Prolonge la maquette sur les côtés pour les écrans plus larges que 3:2 :
    la dernière colonne est étirée puis adoucie, avec le grain du papier par-dessus."""
    big = cv2.copyMakeBorder(img, PAD_Y, PAD_Y, PAD_X, PAD_X, cv2.BORDER_REPLICATE).astype(np.float32)
    flou = cv2.GaussianBlur(big, (0, 0), 18)
    H, W = big.shape[:2]
    m = np.zeros((H, W), np.float32)
    m[PAD_Y:H - PAD_Y, PAD_X:W - PAD_X] = 1
    m = cv2.GaussianBlur(m, (0, 0), 3)
    out = big * m[..., None] + flou * (1 - m[..., None])
    rng = np.random.default_rng(3)
    grain = cv2.GaussianBlur(rng.normal(0, 7, (H, W)).astype(np.float32), (0, 0), 0.8)
    out += (grain * (1 - m))[..., None]
    return np.clip(out, 0, 255).astype(np.uint8)

def enregistre(img_bgr, chemin, q=86):
    Image.fromarray(cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)).save(chemin, quality=q, method=6)

def px(v):
    return f"{v:.0f}"

def boite_style(b):
    x0, y0, x1, y1 = b
    return f"left:{px(x0)}px;top:{px(y0)}px;width:{px(x1 - x0)}px;height:{px(y1 - y0)}px"

def html_planche(nom, e, serrees, pts):
    out = []
    # textes anglais / états dynamiques : pastille de fond nettoyé + texte
    for t, b in zip(e["textes"], serrees):
        if "special" in t:
            continue
        x0, y0, x1, y1 = b
        m = 5
        pb = (x0 - m, y0 - m, x1 + m, y1 + m)
        style = boite_style(pb) + f";background-position:-{px(pb[0])}px -{px(pb[1])}px"
        if "en" in t:
            lignes = "<br>".join(html.escape(l) for l in t["en"].split("|"))
            rot = f";--rot:{t['rot']}deg" if t.get("rot") else ""
            coul = f";color:{t['couleur']}" if t.get("couleur") else (";color:#f4eedd" if t.get("mode") == "clair" else "")
            cls = "en" + (" souligne" if t.get("souligne") else "")
            ident = f' data-id="{t["id"]}"' if t.get("id") else ""
            out.append(f'<div class="pastille {cls} p-{t["police"]}"{ident} style="{style}"><span class="fit" style="{rot}{coul}">{lignes}</span></div>')
        elif t.get("id"):
            out.append(f'<div class="pastille etat" data-id="{t["id"]}" style="{style}"></div>')
    # points rouges (dessinés en direct pour avancer au défilement)
    if pts:
        cercles = "".join(f'<circle cx="{p["x"]}" cy="{p["y"]}" r="{p["r"]}"/>' for p in pts)
        out.append(f'<svg class="points" viewBox="0 0 1536 1024" aria-hidden="true">{cercles}</svg>')
    # zones cliquables
    for z in e["zones"]:
        b = z["box"]
        st = boite_style(b)
        lab, lab_en = z.get("label", ""), z.get("label_en", z.get("label", ""))
        rond = " rond" if z.get("rond") else ""
        ident = f' id="{z["id"]}"' if z.get("id") else ""
        aria = f'aria-label="{html.escape(lab)}" data-en-aria="{html.escape(lab_en)}"'
        if z["type"] == "lien":
            href = z["href"]
            extra = ""
            if href == "tel":
                href, extra = "tel:+15145222612", " data-tel-href"
            elif href == "carte":
                href, extra = "https://www.google.com/maps/dir/?api=1&amp;destination=850%2C%20avenue%20Duluth%20Est%2C%20Montr%C3%A9al%2C%20QC&amp;travelmode=walking", ' target="_blank" rel="noopener"'
            out.append(f'<a class="zone{rond}"{ident} href="{href}"{extra} {aria} style="{st}"></a>')
        elif z["type"] == "menu":
            out.append(f'<button class="zone ouvre-menu" type="button" aria-controls="menu" aria-expanded="false" {aria} style="{st}"></button>')
        elif z["type"] == "langue":
            out.append(f'<button class="zone lg" type="button" data-lg="{z["lg"]}" aria-label="{z["label"]}" style="{st}"></button>')
        elif z["type"] == "etape":
            out.append(f'<button class="zone etape" type="button" data-etape="{z["n"]}" {aria} style="{st}"></button>')
        elif z["type"] == "suivant":
            out.append(f'<button class="zone suivant" type="button" {aria} style="{st}"></button>')
    return "\n".join(out)

def main():
    infos = {}
    fragments = {}
    for nom, e in E.items():
        img = charge(e["src"])
        net = img.copy()
        mtot = np.zeros(img.shape[:2], np.uint8)
        serrees = []
        for t in e["textes"]:
            m = masque(img, t)
            serrees.append(boite_serree(m, t["box"]))
            mtot |= m
        fr = img.copy()
        pts = []
        if e.get("points"):
            pts, mr = points_rouges(img)
            pts = ordre_trajet(pts)
            mr = cv2.dilate(mr, np.ones((7, 7), np.uint8), iterations=1)
            fr = cv2.inpaint(img, mr, 5, cv2.INPAINT_TELEA)
            mtot |= mr
        net = cv2.inpaint(img, mtot, 6, cv2.INPAINT_TELEA)
        enregistre(prolonge(fr), OUT / f"{nom}.webp")
        enregistre(net, OUT / f"{nom}-net.webp", 80)
        fragments[nom] = html_planche(nom, e, serrees, pts)
        infos[nom] = {"points": len(pts), "textes": [list(map(int, b)) for b in serrees]}
        print(nom, "points:", len(pts))

    # pièces détachées
    film = charge("film.png")
    for nom, (cx, cy, r) in {"pause": (1195, 628, 43), "muet": (1296, 637, 32)}.items():
        x0, y0 = cx - r - 2, cy - r - 2
        crop = film[y0:cy + r + 3, x0:cx + r + 3]
        a = np.zeros(crop.shape[:2], np.uint8)
        cv2.circle(a, (r + 2, r + 2), r, 255, -1, cv2.LINE_AA)
        rgba = np.dstack([cv2.cvtColor(crop, cv2.COLOR_BGR2RGB), a])
        Image.fromarray(rgba).save(OUT / f"{nom}.webp", quality=90, method=6)
    acc = charge("accueil.png")
    cx, cy, r = 1386, 608, 87
    crop = acc[cy - r:cy + r, cx - r:cx + r]
    a = np.zeros(crop.shape[:2], np.uint8)
    cv2.circle(a, (r, r), r - 1, 255, -1, cv2.LINE_AA)
    Image.fromarray(np.dstack([cv2.cvtColor(crop, cv2.COLOR_BGR2RGB), a])).save(OUT / "badge.webp", quality=90, method=6)
    cx, cy, r = 1152, 452, 206
    crop = acc[cy - r:cy + r, cx - r:cx + r]
    a = np.zeros(crop.shape[:2], np.uint8)
    cv2.circle(a, (r, r), r - 1, 255, -1, cv2.LINE_AA)
    a = cv2.GaussianBlur(a, (9, 9), 0)
    Image.fromarray(np.dstack([cv2.cvtColor(crop, cv2.COLOR_BGR2RGB), a])).save(OUT / "vitre-accueil.webp", quality=88, method=6)

    # injection dans index.html
    idx = RACINE / "index.html"
    h = idx.read_text()
    for nom, frag in fragments.items():
        h = re.sub(rf"(<!--PLANCHE:{nom}-->).*?(<!--/PLANCHE:{nom}-->)", lambda mm: mm.group(1) + "\n" + frag + "\n" + mm.group(2), h, flags=re.S)
    idx.write_text(h)
    (RACINE / "outils" / "planches.json").write_text(json.dumps(infos, indent=1))

if __name__ == "__main__":
    main()
