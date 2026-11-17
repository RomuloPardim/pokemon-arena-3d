"""Junta as imagens de efeitos-originais/*.png em js/sprites-efeitos.js (base64).
Uso (dentro de jogo-3d):  python ferramentas/sprites_para_js.py
Depois, para usar uma imagem nova, adicione o nome dela em LISTA_ATLAS (js/efeitos.js)."""
import base64, os, glob
raiz = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
out = '"use strict";\n// Sprites de efeito em base64 — gerado por ferramentas/sprites_para_js.py\nconst SPRITES_EFEITOS = {\n'
for f in sorted(glob.glob(os.path.join(raiz, 'efeitos-originais', '*.png'))):
    nome = os.path.splitext(os.path.basename(f))[0].replace('-', '_')
    out += f'  {nome}: "data:image/png;base64,{base64.b64encode(open(f, "rb").read()).decode()}",\n'
out += '};\n'
open(os.path.join(raiz, 'js', 'sprites-efeitos.js'), 'w').write(out)
print('ok', len(out)//1024, 'KB')
