// Reduce the Resoforge yard for phones: drop normals/UVs, weld, simplify (gently for containers and cars), shrink the
// oversized cars (each pile of touching cars about its own footing, so stacks stay stacked), merge duplicates.
const {NodeIO}=require('@gltf-transform/core');const F=require('@gltf-transform/functions');const {MeshoptSimplifier}=require('meshoptimizer');
const CAR=+process.argv[3]||0.63;
(async()=>{await MeshoptSimplifier.ready;const io=new NodeIO();const doc=await io.read(process.argv[2]);
const root=doc.getRoot();
for(const m of root.listMeshes())for(const p of m.listPrimitives()){for(const s of p.listSemantics())if(s!=='POSITION')p.setAttribute(s,null);}
for(const s of root.listSkins())s.dispose();
// world boxes of the car nodes
function mul(m,v){return [m[0]*v[0]+m[4]*v[1]+m[8]*v[2]+m[12],m[1]*v[0]+m[5]*v[1]+m[9]*v[2]+m[13],m[2]*v[0]+m[6]*v[1]+m[10]*v[2]+m[14]];}
const cars=root.listNodes().filter(n=>/^CAR/.test(n.getName())&&n.getMesh());
const box=cars.map(n=>{const M=n.getWorldMatrix();const b=[1e9,1e9,1e9,-1e9,-1e9,-1e9];for(const p of n.getMesh().listPrimitives()){const a=p.getAttribute('POSITION'),v=[0,0,0];for(let i=0;i<a.getCount();i++){a.getElement(i,v);const w=mul(M,v);for(let k=0;k<3;k++){b[k]=Math.min(b[k],w[k]);b[k+3]=Math.max(b[k+3],w[k]);}}}return b;});
const par=cars.map((_,i)=>i);const f=i=>par[i]===i?i:(par[i]=f(par[i]));
for(let i=0;i<cars.length;i++)for(let j=i+1;j<cars.length;j++){const a=box[i],b=box[j],e=.05;if(a[0]<b[3]+e&&b[0]<a[3]+e&&a[1]<b[4]+e&&b[1]<a[4]+e&&a[2]<b[5]+e&&b[2]<a[5]+e)par[f(i)]=f(j);}
const cl={};cars.forEach((n,i)=>{(cl[f(i)]=cl[f(i)]||[]).push(i);});
let piles=0;for(const k in cl){piles++;const ids=cl[k];const b=[1e9,1e9,1e9,-1e9,-1e9,-1e9];ids.forEach(i=>{for(let q=0;q<3;q++){b[q]=Math.min(b[q],box[i][q]);b[q+3]=Math.max(b[q+3],box[i][q+3]);}});
  const p=[(b[0]+b[3])/2,b[1],(b[2]+b[5])/2];
  ids.forEach(i=>{const n=cars[i];if(n.getParentNode()&&n.getParentNode().getMatrix().some((v,q)=>Math.abs(v-[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1][q])>1e-6))throw new Error('car under a moved parent');
    const t=n.getTranslation(),s=n.getScale();n.setTranslation([p[0]+CAR*(t[0]-p[0]),p[1]+CAR*(t[1]-p[1]),p[2]+CAR*(t[2]-p[2])]);n.setScale([s[0]*CAR,s[1]*CAR,s[2]*CAR]);});}
const gentle=new Set();for(const n of root.listNodes())if(/Container|^CAR/i.test(n.getName())&&n.getMesh())gentle.add(n.getMesh());
await doc.transform(F.weld({tolerance:0.0001}));
for(const m of root.listMeshes())for(const p of m.listPrimitives())F.simplifyPrimitive(p,{simplifier:MeshoptSimplifier,ratio:0,error:gentle.has(m)?0.0005:0.01});
await doc.transform(F.dedup(),F.prune());
await io.write(process.argv[4],doc);console.log('cars',cars.length,'piles',piles);})();
