"""
Prepara um Pokémon novo para o jogo 3D em um comando:
  1. baixa o modelo .glb do projeto Pokemon-3D (GitHub)
  2. otimiza (texturas 512px em WebP + malha comprimida com meshopt -> ~4x menor)
  3. converte para modelos/<id>-<nome>.js (o jogo abre via file:// sem servidor)

Uso (dentro da pasta jogo-3d):   python ferramentas/preparar_modelo.py 130 gyarados
Precisa de: Python 3 e Node.js (para o "npx @gltf-transform/cli"). Sem Node, o modelo
é usado sem otimizar (funciona, só fica maior).

Depois:  - adicione no index.html:  <script src="modelos/130-gyarados.js"></script>
         - crie a entrada em js/dados.js (lista POKEMON) — veja o LEIA-ME.md
"""
import base64, os, shutil, subprocess, sys, tempfile, urllib.request

if len(sys.argv) < 3:
    print(__doc__); sys.exit(1)
pid, nome = sys.argv[1], sys.argv[2].lower()
raiz = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
url = f'https://raw.githubusercontent.com/Sudhanshu-Ambastha/Pokemon-3D/main/models/glb/regular/{pid}.glb'
tmp = tempfile.mkdtemp()
bruto, a, b, final = (os.path.join(tmp, n) for n in ('bruto.glb', 'a.glb', 'b.glb', 'final.glb'))

print('Baixando', url)
urllib.request.urlretrieve(url, bruto)
print(f'  {os.path.getsize(bruto)//1024} KB')

npx = shutil.which('npx')
try:
    if not npx: raise RuntimeError('Node.js (npx) não encontrado')
    cli = [npx, '-y', '@gltf-transform/cli@4']
    subprocess.run(cli + ['resize', bruto, a, '--width', '512', '--height', '512'], check=True, capture_output=True)
    subprocess.run(cli + ['webp', a, b], check=True, capture_output=True)
    subprocess.run(cli + ['meshopt', b, final], check=True, capture_output=True)
    print(f'Otimizado: {os.path.getsize(final)//1024} KB')
except Exception as e:
    print('Aviso: não deu para otimizar (' + str(e) + '). Usando o modelo original.')
    final = bruto

destino_glb = os.path.join(raiz, '..', 'assets-originais', 'glb', f'{pid}-{nome}.glb')
os.makedirs(os.path.dirname(destino_glb), exist_ok=True)
shutil.copy(final, destino_glb)
destino_js = os.path.join(raiz, 'modelos', f'{pid}-{nome}.js')
with open(destino_js, 'w') as f:
    f.write(f'// Modelo 3D de {nome} (gerado por ferramentas/preparar_modelo.py)\n')
    f.write(f'MODELOS_EMBUTIDOS[{pid}] = "{base64.b64encode(open(final, "rb").read()).decode()}";\n')
shutil.rmtree(tmp, ignore_errors=True)
print('Pronto:', os.path.normpath(destino_js))
print(f'Agora adicione no index.html:  <script src="modelos/{pid}-{nome}.js"></script>')
