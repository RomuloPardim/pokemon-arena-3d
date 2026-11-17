"""
Converte um modelo .glb em um arquivo .js que o jogo carrega mesmo abrindo
o index.html direto (file://), sem servidor.

Uso:  python glb_para_js.py caminho/do/modelo.glb ID nome
Ex.:  python glb_para_js.py ../../assets-originais/glb/6.glb 6 charizard
Gera: ../modelos/6-charizard.js   (depois adicione a <script> no index.html)
"""
import base64, sys, os
glb, pid, nome = sys.argv[1], sys.argv[2], sys.argv[3]
b64 = base64.b64encode(open(glb, 'rb').read()).decode()
destino = os.path.join(os.path.dirname(__file__), '..', 'modelos', f'{pid}-{nome}.js')
with open(destino, 'w') as f:
    f.write(f'// Modelo 3D de {nome} (gerado por ferramentas/glb_para_js.py a partir de {os.path.basename(glb)})\n')
    f.write(f'MODELOS_EMBUTIDOS[{pid}] = "{b64}";\n')
print('ok ->', destino, len(b64)//1024, 'KB')
