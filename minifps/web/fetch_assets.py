#!/usr/bin/env python3
"""실사 텍스처와 스캔 모델을 minifps/web/assets/ 로 내려받는다(저장소에는 넣지 않는다. CI 가 빌드 때 받는다).

 - 텍스처·소품: Poly Haven (https://polyhaven.com, CC0). 1k JPG: 색(diff), 법선(nor_gl), AO·거칠기·금속(arm).
 - 병사: three.js 예제의 Soldier.glb (뼈대와 걷기·달리기 동작 포함).
 - GLTFLoader, SkeletonUtils: three.js r128 예제 스크립트.

이미 받은 파일은 건너뛴다. 사용법: python3 minifps/web/fetch_assets.py
"""
import json, pathlib, sys, time, urllib.request

here = pathlib.Path(__file__).resolve().parent
out = here / 'assets'
# 게임 안 표면 이름 -> Poly Haven 텍스처
TEXTURES = {'conc': 'concrete_pavement', 'floor': 'garage_floor', 'block': 'concrete_block_wall', 'corr': 'corrugated_iron_02', 'panel': 'box_profile_metal_sheet',
            'metal': 'metal_plate', 'crate': 'brown_planks_05', 'paint': 'painted_metal_shutter', 'canvas': 'denim_fabric', 'asphalt': 'asphalt_02', 'plaster': 'plastered_wall_02', 'roof': 'clay_roof_tiles'}
MODELS = ['Barrel_01', 'barrel_03', 'concrete_road_barrier', 'old_military_crate', 'wooden_military_crate', 'wooden_crate_02', 'ammo_box', 'metal_jerrycan_green', 'old_tyre', 'street_lamp_01',
          'cement_bag', 'portable_generator', 'old_military_compressor', 'tool_cart', 'covered_car', 'metal_toolbox', 'hand_truck', 'utility_box_01',
          'service_pistol', 'bolt_action_rifle_7_62', 'stick_grenade', 'steel_frame_shelves_01', 'metal_tool_chest', 'exterior_aircon_unit', 'flood_lights', 'propane_tank',
          'fire_hydrant', 'metal_trash_can', 'metal_office_desk', 'overhead_crane', 'security_light']
# 맵마다 쓰는 하늘 사진(HDRI). 눈에 보이는 야외 하늘은 2k, 반사에만 쓰는 실내는 1k
HDRIS = {'night': 'qwantani_night_puresky', 'dusk': 'qwantani_dusk_2_puresky', 'day': 'kloofendal_43d_clear_puresky', 'indoor': 'empty_warehouse_01'}
THREE = 'https://raw.githubusercontent.com/mrdoob/three.js/r128/examples/'
EXTRA = {'soldier.glb': THREE + 'models/gltf/Soldier.glb', 'GLTFLoader.js': THREE + 'js/loaders/GLTFLoader.js', 'SkeletonUtils.js': THREE + 'js/utils/SkeletonUtils.js', 'RGBELoader.js': THREE + 'js/loaders/RGBELoader.js'}


def get(url, dest):
    if dest.exists() and dest.stat().st_size > 0:
        return
    dest.parent.mkdir(parents=True, exist_ok=True)
    for attempt in range(4):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'mini-fps-asset-fetch'})
            with urllib.request.urlopen(req, timeout=120) as r:
                data = r.read()
            dest.write_bytes(data)
            print('got', dest.relative_to(out), len(data))
            return
        except Exception as e:  # noqa: BLE001 - 네트워크 오류는 종류를 가리지 않고 다시 시도한다
            print('retry', url, e, file=sys.stderr)
            time.sleep(2 + attempt * 3)
    raise SystemExit('failed: ' + url)


def api(path):
    req = urllib.request.Request('https://api.polyhaven.com/' + path, headers={'User-Agent': 'mini-fps-asset-fetch'})
    with urllib.request.urlopen(req, timeout=120) as r:
        return json.load(r)


manifest = {'tex': {}, 'model': {}, 'hdr': {}}
for key, pid in TEXTURES.items():
    f = api('files/' + pid)
    maps = {}
    for want, names in (('diff', ('Diffuse', 'diff')), ('nor', ('nor_gl',)), ('arm', ('arm',))):
        for n in names:
            if n in f and '1k' in f[n] and 'jpg' in f[n]['1k']:
                dest = out / 't' / (key + '_' + want + '.jpg')
                get(f[n]['1k']['jpg']['url'], dest)
                maps[want] = 't/' + dest.name
                break
    manifest['tex'][key] = maps
for pid in MODELS:
    f = api('files/' + pid)
    g = f['gltf']['1k']['gltf']
    get(g['url'], out / 'm' / pid / (pid + '.gltf'))
    for rel, inc in g.get('include', {}).items():
        get(inc['url'], out / 'm' / pid / rel)
    manifest['model'][pid] = 'm/%s/%s.gltf' % (pid, pid)
for key, pid in HDRIS.items():
    f = api('files/' + pid)
    get(f['hdri']['1k' if key == 'indoor' else '2k']['hdr']['url'], out / 'h' / (key + '.hdr'))
    manifest['hdr'][key] = 'h/%s.hdr' % key
for name, url in EXTRA.items():
    get(url, out / name)
(out / 'manifest.json').write_text(json.dumps(manifest, indent=1), encoding='utf-8')
print('assets:', sum(p.stat().st_size for p in out.rglob('*') if p.is_file()) // 1024, 'KB')
