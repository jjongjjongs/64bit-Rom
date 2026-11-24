# The bomb model: Sketchfab "C4 Explosive Device & Detonator Pack" (Fevzi_Beydili, CC BY 4.0), uploaded as USDZ, to art/c4.glb.
# usage: python3 -I c4_usd2glb.py <unzipped>/scene.usdc ../art/c4.glb Cs_go 1024   (needs usd-core and Pillow)
# Keeps the three-charge pack only, lays it flat (keypad up, wires away from the reader), scales it to M112 size, splits off
# the display, the lamp button and a short cuttable piece of each of the three wires (by connected parts), shrinks textures.
import sys, json, struct, io, os
from pxr import Usd, UsdGeom, UsdShade, Gf
from PIL import Image
src, outp, keep = sys.argv[1], sys.argv[2], sys.argv[3].split(',')
BASE = int(sys.argv[4]) if len(sys.argv) > 4 else 1024
st = Usd.Stage.Open(src); tdir = os.path.dirname(src)
xc = UsdGeom.XformCache()
mpu = UsdGeom.GetStageMetersPerUnit(st)
bins = bytearray(); bviews = []; accs = []; imgs = []; texs = []; mats = []; matidx = {}; meshes = []; nodes = []
def addview(b, target=None):
    while len(bins) % 4: bins.append(0)
    o = len(bins); bins.extend(b); v = {'buffer': 0, 'byteOffset': o, 'byteLength': len(b)}
    if target: v['target'] = target
    bviews.append(v); return len(bviews) - 1
def addacc(arr, comp, typ, target, minmax=False):
    n = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3}[typ]; fmt = {5126: 'f', 5125: 'I'}[comp]
    flat = [x for a in arr for x in (a if n > 1 else [a])]
    b = struct.pack('<%d%s' % (len(flat), fmt), *flat)
    a = {'bufferView': addview(b, target), 'componentType': comp, 'count': len(arr), 'type': typ}
    if minmax: a['min'] = [min(p[i] for p in arr) for i in range(n)]; a['max'] = [max(p[i] for p in arr) for i in range(n)]
    accs.append(a); return len(accs) - 1
imgcache = {}
def addimg(key, im, q=85):
    if key in imgcache: return imgcache[key]
    bio = io.BytesIO(); im.save(bio, 'JPEG', quality=q); v = addview(bio.getvalue())
    imgs.append({'bufferView': v, 'mimeType': 'image/jpeg'}); texs.append({'source': len(imgs) - 1, 'sampler': 0})
    imgcache[key] = len(texs) - 1; return len(texs) - 1
def load(p, size, mode='RGB'):
    im = Image.open(os.path.join(tdir, p)).convert(mode)
    if max(im.size) > size: im = im.resize((size, size), Image.LANCZOS)
    return im
def texof(inp):
    if not inp or not inp.HasConnectedSource(): return None
    s = UsdShade.Shader(inp.GetConnectedSources()[0][0].source.GetPrim())
    f = s.GetInput('file'); return f.Get().path if f else None
def material(m):
    path = str(m.GetPath())
    if path in matidx: return matidx[path]
    sh = None
    for c in m.GetPrim().GetChildren():
        s = UsdShade.Shader(c)
        if s and s.GetIdAttr().Get() == 'UsdPreviewSurface': sh = s
    name = m.GetPrim().GetName(); pbr = {'metallicFactor': 0.0, 'roughnessFactor': 0.6}; mat = {'name': name, 'pbrMetallicRoughness': pbr, 'doubleSided': True}
    g = lambda k: sh.GetInput(k)
    bc = texof(g('diffuseColor'))
    if bc: pbr['baseColorTexture'] = {'index': addimg(bc, load(bc, BASE))}
    else:
        v = g('diffuseColor').Get() if g('diffuseColor') else None
        if v is not None: pbr['baseColorFactor'] = [v[0], v[1], v[2], 1]
    rt, mt = texof(g('roughness')), texof(g('metallic'))
    if rt or mt:
        sz = BASE // 2
        r = load(rt, sz, 'L') if rt else Image.new('L', (sz, sz), 150)
        mm = load(mt, sz, 'L') if mt else Image.new('L', (sz, sz), 0)
        if r.size != mm.size: mm = mm.resize(r.size)
        pbr['metallicRoughnessTexture'] = {'index': addimg((rt, mt), Image.merge('RGB', (Image.new('L', r.size, 255), r, mm)))}
        pbr['metallicFactor'] = 1.0; pbr['roughnessFactor'] = 1.0
    else:
        for k, kk in (('roughness', 'roughnessFactor'), ('metallic', 'metallicFactor')):
            if g(k) and g(k).Get() is not None: pbr[kk] = float(g(k).Get())
    nt = texof(g('normal'))
    if nt: mat['normalTexture'] = {'index': addimg(nt, load(nt, BASE // 2))}
    mats.append(mat); matidx[path] = len(mats) - 1; return len(mats) - 1
K = 0.28 / 1.032   # each charge as long as an M112 block (28 cm)
CX, CY, Z0 = -0.5275, 0.6765, -0.139   # native metres: middle of the pack across and along, back face
def X(q): return [(q[0] * mpu - CX) * K, (q[2] * mpu - Z0) * K, -(q[1] * mpu - CY) * K]   # lay it flat: front up, top (wires) away from the reader
def XN(n): return [n[0], n[2], -n[1]]
prims = {}
for p in st.Traverse():
    if not p.IsA(UsdGeom.Mesh) or '/Cs_go' not in str(p.GetPath()): continue
    m = UsdGeom.Mesh(p); M = xc.GetLocalToWorldTransform(p); N3 = M.ExtractRotationMatrix(); nm = p.GetName()
    pts = [M.Transform(Gf.Vec3d(*q)) for q in m.GetPointsAttr().Get()]; idx = list(m.GetFaceVertexIndicesAttr().Get())
    nr = m.GetNormalsAttr().Get(); assert m.GetNormalsInterpolation() == 'vertex'
    stp = UsdGeom.PrimvarsAPI(p).GetPrimvar('st0'); uv = stp.Get(); assert stp.GetInterpolation() == 'vertex' and not stp.IsIndexed()
    par = list(range(len(pts))); rep = {}
    def f(a):
        while par[a] != a: par[a] = par[par[a]]; a = par[a]
        return a
    for i, q in enumerate(pts):
        k = (round(q[0], 3), round(q[1], 3), round(q[2], 3))
        if k in rep: par[f(i)] = f(rep[k])
        else: rep[k] = i
    for t in range(0, len(idx), 3):
        a0 = f(idx[t]); par[f(idx[t + 1])] = a0; par[f(idx[t + 2])] = f(a0)
    comp = {}
    for t in range(0, len(idx), 3): comp.setdefault(f(idx[t]), []).append(t)
    tag = {}
    for r, ts in comp.items():
        vs = [pts[idx[t + j]] for t in ts for j in range(3)]; lo = [min(v[i] for v in vs) for i in range(3)]; hi = [max(v[i] for v in vs) for i in range(3)]
        tg = 'body'
        if 'Screen' in nm: tg = 'screen'
        elif len(ts) == 576 and hi[1] > 125 and any(c in nm for c in ('Red', 'blue', 'black')):
            w = {'Red': 0, 'blue': 1, 'black': 2}[[c for c in ('Red', 'blue', 'black') if c in nm][0]]
            top = max(vs, key=lambda v: v[2])   # cut where the wire arches highest over the pack (native +Z is up once laid flat)
            for t in ts:
                c = [(pts[idx[t]][i] + pts[idx[t + 1]][i] + pts[idx[t + 2]][i]) / 3 for i in range(3)]
                tag[t] = 'wire%d%s' % (w, '_cut' if sum((c[i] - top[i]) ** 2 for i in range(3)) < 5.0 ** 2 else '')
            continue
        elif 'Red' in nm and len(ts) == 286: tg = 'led'
        for t in ts: tag[t] = tg
    mat = material(UsdShade.MaterialBindingAPI(p).ComputeBoundMaterial()[0])
    for t in range(0, len(idx), 3): prims.setdefault((tag[t], mat), []).extend(idx[t:t + 3])
    for key in [k for k in prims if k[1] == mat and not isinstance(prims[k], tuple)]:
        ix = prims[key]; used = sorted(set(ix)); remap = {v: i for i, v in enumerate(used)}
        pos = [X(pts[v]) for v in used]; nor = []
        for v in used:
            q = Gf.Vec3d(*nr[v]) * N3; l = q.GetLength() or 1; nor.append(XN([q[0] / l, q[1] / l, q[2] / l]))
        uvs = [[uv[v][0], 1 - uv[v][1]] for v in used]
        prim = {'attributes': {'POSITION': addacc(pos, 5126, 'VEC3', 34962, True), 'NORMAL': addacc(nor, 5126, 'VEC3', 34962), 'TEXCOORD_0': addacc(uvs, 5126, 'VEC2', 34962)},
                'indices': addacc([remap[v] for v in ix], 5125, 'SCALAR', 34963), 'material': mat}
        prims[key] = ('done', prim)
bytag = {}
for (tg, mat), (_, prim) in prims.items(): bytag.setdefault(tg, []).append(prim)
groups = {'c4': []}
for tg, pl in sorted(bytag.items()):
    meshes.append({'name': tg, 'primitives': pl}); nodes.append({'name': tg, 'mesh': len(meshes) - 1}); groups['c4'].append(len(nodes) - 1)
    print(tg, len(pl))
roots = []
for k, ch in groups.items(): nodes.append({'name': k, 'children': ch}); roots.append(len(nodes) - 1)
gl = {'asset': {'version': '2.0', 'generator': 'minifps usd2glb', 'copyright': 'C4 Explosive Device & Detonator Pack by Fevzi_Beydili (Sketchfab), CC BY 4.0'},
      'scene': 0, 'scenes': [{'nodes': roots}], 'nodes': nodes, 'meshes': meshes, 'materials': mats, 'accessors': accs, 'bufferViews': bviews,
      'samplers': [{'magFilter': 9729, 'minFilter': 9987, 'wrapS': 10497, 'wrapT': 10497}], 'images': imgs, 'textures': texs, 'buffers': [{'byteLength': len(bins)}]}
while len(bins) % 4: bins.append(0)
gl['buffers'][0]['byteLength'] = len(bins)
j = json.dumps(gl, separators=(',', ':')).encode()
while len(j) % 4: j += b' '
with open(outp, 'wb') as f:
    f.write(struct.pack('<III', 0x46546C67, 2, 12 + 8 + len(j) + 8 + len(bins)))
    f.write(struct.pack('<II', len(j), 0x4E4F534A)); f.write(j)
    f.write(struct.pack('<II', len(bins), 0x004E4942)); f.write(bins)
print('ok', outp, len(bins), {k: len(v) for k, v in groups.items()})
