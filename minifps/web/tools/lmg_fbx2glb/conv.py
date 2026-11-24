import sys,base64
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/opt/pw-browsers/chromium',args=['--use-gl=swiftshader','--enable-unsafe-swiftshader']); pg=b.new_page(); pg.on('console',lambda m: print('LOG',m.text[:150]) if 'Vertex' not in m.text else None)
    pg.goto('http://127.0.0.1:8790/conv.html'); d=base64.b64decode(pg.evaluate('go()')); open(sys.argv[1],'wb').write(d); print(len(d)); b.close()
