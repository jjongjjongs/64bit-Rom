#!/usr/bin/env python3
"""Mini-FPS 웹 소스를 APK 에 넣을 한 장짜리 페이지로 묶는다.

게임은 minifps/web/src 의 HTML 한 조각과 자바스크립트 다섯 파일이다. 앱은 WebView 로
assets/index.html 을 연다. 네트워크 권한이 없으므로 three.js 도 같이 넣고, 웹 글꼴은 쓰지 않는다
(글꼴 스택의 기기 글꼴로 내려간다).

사용법: python3 minifps/web/build.py            -> minifps/src/main/assets/
        python3 minifps/web/build.py --artifact  -> minifps/web/out/mini-fps.html (브라우저 미리보기용, CDN 사용)
"""
import pathlib, shutil, sys

here = pathlib.Path(__file__).resolve().parent
src = lambda n: (here / 'src' / n).read_text(encoding='utf-8')
SCRIPTS = ['cfg.js', 'assets.js', 'models.js', 'maps.js', 'game.js', 'ui.js']
ASSETS = here / 'assets'   # fetch_assets.py 가 받아 둔다. 없으면 그린 텍스처와 조립한 모양으로 돈다.
FONTS = ('<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Big+Shoulders+Display:wght@700;900'
         '&family=IBM+Plex+Mono:wght@400;500&family=Noto+Sans+KR:wght@400;500;700;900&display=swap">')


def page(three, fonts):
    head = src('head.html').replace('<!--FONTS-->', fonts)
    extra = ''.join('<script src="a/%s"></script>\n' % n for n in ('GLTFLoader.js', 'SkeletonUtils.js')) if (ASSETS / 'GLTFLoader.js').exists() and three == 'three.min.js' else ''
    return head + '\n<script src="%s"></script>\n' % three + extra + ''.join('<script>\n%s</script>\n' % src(n) for n in SCRIPTS)


if '--artifact' in sys.argv:
    out = here / 'out'
    out.mkdir(exist_ok=True)
    (out / 'mini-fps.html').write_text(page('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js', FONTS), encoding='utf-8')
    print('wrote', out / 'mini-fps.html')
else:
    assets = here.parent / 'src' / 'main' / 'assets'
    assets.mkdir(parents=True, exist_ok=True)
    shell = ('<!doctype html><html lang="ko"><head><meta charset="utf-8">'
             '<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover">'
             '<style>body{margin:0;font:14px system-ui,sans-serif}img{max-width:100%}[hidden]{display:none!important}</style></head><body>')
    (assets / 'index.html').write_text(shell + page('three.min.js', '') + '</body></html>', encoding='utf-8')
    shutil.copyfile(here / 'vendor' / 'three.min.js', assets / 'three.min.js')
    if ASSETS.exists():
        shutil.rmtree(assets / 'a', ignore_errors=True)
        shutil.copytree(ASSETS, assets / 'a')
        print('assets', sum(p.stat().st_size for p in (assets / 'a').rglob('*') if p.is_file()) // 1024, 'KB')
    print('wrote', assets / 'index.html', (assets / 'index.html').stat().st_size, 'bytes')
