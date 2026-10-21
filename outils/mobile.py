"""Copie outils/mobile.html (la version téléphone) dans index.html, entre <!--MOBILE--> et <!--/MOBILE-->."""
import re, pathlib
R = pathlib.Path(__file__).resolve().parent.parent
bloc = (R / 'outils/mobile.html').read_text().strip()
p = R / 'index.html'
s = re.sub(r'<!--MOBILE-->.*?<!--/MOBILE-->', lambda m: bloc, p.read_text(), flags=re.S)
p.write_text(s)
print('index.html mis à jour')
