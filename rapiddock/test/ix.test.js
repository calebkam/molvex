const fs=require('fs'),R=__dirname+'/../',D=require(R+'dock.js'),C=require(R+'chem.js');let bad=0;const ok=(c,m)=>{console.log((c?'ok   ':'FAIL ')+m);if(!c)bad++};
const rec=D.prepareReceptor(D.parsePDB(fs.readFileSync(R+'data/1iep.pdb','utf8')),{});
const rr=D.recRings(rec);console.log('receptor rings',rr.length);
const q=rr[0];const c=q.geom.c,n=q.geom.n;
// ring in-plane basis
const u=[...Array(3)].map((_,i)=>rec.X[3*q.idx[0]+i]-c[i]);const un=Math.hypot(...u);const e1=u.map(v=>v/un);
const e2=[n[1]*e1[2]-n[2]*e1[1],n[2]*e1[0]-n[0]*e1[2],n[0]*e1[1]-n[1]*e1[0]];
function mk(off,tilt){const pos=new Float64Array(18);for(let k=0;k<6;k++){const a=k*Math.PI/3,x=1.4*Math.cos(a),y=1.4*Math.sin(a);
 // tilt about e1 axis
 const yy=y*Math.cos(tilt),zz=y*Math.sin(tilt);
 for(let i=0;i<3;i++)pos[3*k+i]=c[i]+off*n[i]+x*e1[i]+yy*e2[i]+zz*n[i];}return pos}
const atoms=[...Array(6)].map(()=>({el:'C',arom:true,q:0}));
const lig={heavy:[0,1,2,3,4,5],T:[...Array(6)].map(()=>({hyd:true,don:false,acc:false})),mol:{atoms,rings:[[0,1,2,3,4,5]],nb:[],bonds:[]}};
for(const [off,t] of [[3.5,0],[3.9,0],[3.5,0.8],[3.5,1.5]]){const it=D.interactions(lig,rec,mk(off,t));console.log('off',off,'tilt',(t*57.3).toFixed(0),'pipi',it.pipi,it.list.filter(x=>x.type==='pipi').map(x=>x.res+x.resi+' '+x.d.toFixed(2)+' '+x.angle.toFixed(0)).join(';'))}

ok(D.PIPI_CUT===3.8,'pi-pi centroid threshold is 3.8 A');
{const it3=D.interactions(lig,rec,mk(3.5,0)),it4=D.interactions(lig,rec,mk(3.9,0));ok(it3.pipi===1,'stacked ring at 3.5 A is found');ok(it4.pipi===0,'ring at 3.9 A is not');ok(D.interactions(lig,rec,mk(3.5,1.5)).pipi===0,'edge-on ring is not stacking')}
{const mol=C.prepare(C.parseMol(fs.readFileSync(R+'data/imatinib.sdf','utf8')));mol.T=C.buildTopology(mol);const L=D.prepareLigand(mol),ref=mol.atoms.map(a=>[a.x,a.y,a.z]),pos=Float64Array.from(C.coords(mol));
 ok(D.symRmsd(L,pos,ref)<1e-9,'self RMSD is 0');ok(D.automorphisms(L).length>1,'imatinib has symmetry-equivalent mappings');
 // flip the p-phenylene ring by 180 degrees about its axis: plain RMSD > 0, symmetric RMSD = 0
 const ring=mol.rings.find(r=>r.every(i=>mol.atoms[i].arom&&mol.atoms[i].el==='C')&&r.every(i=>mol.nb[i].filter(k=>mol.atoms[k.j].el!=='H').length>=2)&&r.filter(i=>mol.nb[i].filter(k=>mol.atoms[k.j].el!=='H').length===3).length===2);
 if(ring){const sub=ring.filter(i=>mol.nb[i].filter(k=>mol.atoms[k.j].el!=='H').length===3);const a=pos.slice(3*sub[0],3*sub[0]+3),b=pos.slice(3*sub[1],3*sub[1]+3);const ax=[b[0]-a[0],b[1]-a[1],b[2]-a[2]],L2=Math.hypot(...ax),u=ax.map(v=>v/L2);
  for(const i of ring){for(const k of mol.nb[i]){const j=k.j;if(ring.includes(j)||sub.includes(i)&&mol.atoms[j].el!=='H')continue;}}
  const mv=new Set(ring.filter(i=>!sub.includes(i)));ring.forEach(i=>mol.nb[i].forEach(k=>{if(mol.atoms[k.j].el==='H'&&!ring.includes(k.j))mv.add(k.j)}));
  for(const i of mv){const p=[pos[3*i]-a[0],pos[3*i+1]-a[1],pos[3*i+2]-a[2]],d=p[0]*u[0]+p[1]*u[1]+p[2]*u[2],cr=[u[1]*p[2]-u[2]*p[1],u[2]*p[0]-u[0]*p[2],u[0]*p[1]-u[1]*p[0]];for(let q=0;q<3;q++)pos[3*i+q]=a[q]+p[q]*-1+2*u[q]*d;}
  let plain=0;for(const i of L.heavy)plain+=(pos[3*i]-ref[i][0])**2+(pos[3*i+1]-ref[i][1])**2+(pos[3*i+2]-ref[i][2])**2;plain=Math.sqrt(plain/L.heavy.length);
  ok(plain>0.3&&D.symRmsd(L,pos,ref)<0.05,'ring flip: plain RMSD '+plain.toFixed(2)+' A, symmetry-aware RMSD '+D.symRmsd(L,pos,ref).toFixed(3)+' A')}
 else console.log('(no p-phenylene ring found)')}
console.log(bad?'FAILED':'ALL PASSED');process.exit(bad?1:0);

/* fromHet: bond orders from PDB het geometry */
{
  const fs = require('fs'), path = require('path'), Chem = require('../chem.js');
  const sdf = Chem.prepare(Chem.parseMol(fs.readFileSync(path.join(__dirname, '../data/imatinib.sdf'), 'utf8')));
  const rnd = Chem.mulberry(7), g = s => { let u = 0; for (let i = 0; i < 6; i++) u += rnd(); return (u - 3) * 1.4142 * s; };
  const het = sdf.atoms.filter(a => a.el !== 'H').map(a => ({ el: a.el, x: a.x + g(0.005), y: a.y + g(0.005), z: a.z + g(0.005) }));
  const m = Chem.prepare(Chem.fromHet(het));
  const ok = m.atoms.filter(a => a.arom).length === sdf.atoms.filter(a => a.arom).length;
  console.log(ok ? 'ok   fromHet finds all ' + sdf.atoms.filter(a => a.arom).length + ' aromatic atoms of imatinib' : 'FAIL fromHet aromatic atoms ' + m.atoms.filter(a => a.arom).length);
  if (!ok) process.exitCode = 1;
}
