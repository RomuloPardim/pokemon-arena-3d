"""
Junta o jogo 2D (index.html + css/ + js/) num ÚNICO arquivo .html,
fácil de mandar para o celular ou para um amigo.

Uso (dentro da pasta jogo-2d):   python ferramentas/montar.py
Gera:                            ../jogo-2d-arquivo-unico/pokemon-arena.html
"""
import os, re
raiz = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
html = open(os.path.join(raiz, 'index.html'), encoding='utf-8').read()

def css(m):
    return '<style>\n' + open(os.path.join(raiz, m.group(1)), encoding='utf-8').read() + '</style>'
html = re.sub(r'<link rel="stylesheet" href="([^"]+)">', css, html)

scripts = re.findall(r'<script src="([^"]+)"></script>\n', html)
codigo = ''.join(open(os.path.join(raiz, s), encoding='utf-8').read() for s in scripts)
primeiro = True
def js(m):
    global primeiro
    if primeiro:
        primeiro = False
        return '<script>\n' + codigo + '</script>\n'
    return ''
html = re.sub(r'<script src="([^"]+)"></script>\n', js, html)

destino = os.path.join(raiz, '..', 'jogo-2d-arquivo-unico', 'pokemon-arena.html')
os.makedirs(os.path.dirname(destino), exist_ok=True)
open(destino, 'w', encoding='utf-8').write(html)
print('ok ->', os.path.normpath(destino), f'({len(html)//1024} KB, {len(scripts)} arquivos JS)')
