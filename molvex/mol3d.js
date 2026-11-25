/* ============================ mol3d.js ============================
   Small three.js viewer for one molecule (ball-and-stick or sticks), plus geometry analysis from 3D coordinates.
   Mol3D.create(host, THREE) -> { load(mol), setH(bool), setStyle('ball'|'stick'), setSpin(bool), reset(), pick(fn), dispose() }
   mol = { atoms:[{el,x,y,z,q,h}], bonds:[{a,b,o}] }.  Mol3D.describe(mol, i) -> { name, hyb, mean, angles, lengths }. */
(function (root) {
'use strict';
const COL = { H: 0xf2f2f2, C: 0x8a8f94, N: 0x3050f8, O: 0xff2a1a, F: 0x7fd34a, Cl: 0x1fc01f, Br: 0xa62929, I: 0x940094, S: 0xe6c200, P: 0xff8000, B: 0xffb5b5, Si: 0xf0c8a0, Se: 0xffa100, Na: 0xab5cf2, Li: 0xcc80ff, K: 0x8f40d4, Mg: 0x8aff00 };
const RAD = { H: 0.24, C: 0.4, N: 0.38, O: 0.37, F: 0.33, Cl: 0.5, Br: 0.56, I: 0.64, S: 0.5, P: 0.5, B: 0.4, Si: 0.52, Se: 0.56 };
const DEG = 180 / Math.PI;
function describe(mol, i) {
  const a = mol.atoms[i], nb = []; for (const b of mol.bonds) { if (b.a === i) nb.push([b.b, b.o]); else if (b.b === i) nb.push([b.a, b.o]); }
  const v = j => { const t = mol.atoms[j]; return [t.x - a.x, t.y - a.y, t.z - a.z]; }, len = u => Math.hypot(u[0], u[1], u[2]);
  const lengths = nb.map(([j, o]) => ({ j, el: mol.atoms[j].el, o, d: len(v(j)) })), angles = [];
  for (let p = 0; p < nb.length; p++) for (let q = p + 1; q < nb.length; q++) { const u = v(nb[p][0]), w = v(nb[q][0]); const c = (u[0]*w[0] + u[1]*w[1] + u[2]*w[2]) / (len(u) * len(w) || 1); angles.push({ i: nb[p][0], k: nb[q][0], deg: Math.acos(Math.max(-1, Math.min(1, c))) * DEG }); }
  const n = nb.length, mean = angles.length ? angles.reduce((s, x) => s + x.deg, 0) / angles.length : 0, pi = nb.reduce((s, x) => s + (x[1] - 1), 0);
  let name, hyb;
  if (n === 0) { name = 'isolated atom'; hyb = ''; }
  else if (n === 1) { name = 'terminal atom (one bond)'; hyb = pi === 2 ? 'sp' : pi === 1 ? 'sp2' : ''; }
  else if (n === 2) { name = mean >= 165 ? 'linear' : 'bent'; hyb = mean >= 165 ? 'sp' : (pi || mean >= 113 ? 'sp2' : 'sp3'); }
  else if (n === 3) { const sum = angles.reduce((s, x) => s + x.deg, 0); name = sum >= 354 ? 'trigonal planar' : 'trigonal pyramidal'; hyb = sum >= 354 ? 'sp2' : 'sp3'; }
  else if (n === 4) { name = mean > 100 && mean < 120 ? 'tetrahedral' : 'distorted tetrahedral'; hyb = 'sp3'; }
  else if (n === 5) { name = 'trigonal bipyramidal'; hyb = 'sp3d'; } else { name = n === 6 ? 'octahedral' : n + '-coordinate'; hyb = n === 6 ? 'sp3d2' : ''; }
  return { name, hyb, mean, angles, lengths, n };
}
function create(host, THREE) {
  const W = () => host.clientWidth || 600, Ht = () => host.clientHeight || 400;
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1)); renderer.setSize(W(), Ht()); host.appendChild(renderer.domElement);
  renderer.domElement.style.cssText = 'display:block;width:100%;height:100%;touch-action:none;cursor:grab';
  const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(35, W() / Ht(), 0.1, 400), grp = new THREE.Group(); scene.add(grp);
  scene.add(new THREE.AmbientLight(0xffffff, 0.62)); const dl = new THREE.DirectionalLight(0xffffff, 0.75); dl.position.set(3, 5, 8); scene.add(dl);
  const dl2 = new THREE.DirectionalLight(0xffffff, 0.25); dl2.position.set(-6, -3, 2); scene.add(dl2);
  let mol = null, showH = true, style = 'ball', spin = false, dist = 12, atomMeshes = [], sel = -1, onPick = null, raf = 0, disposed = false, fitR = 4;
  const geo = { s: new THREE.SphereGeometry(1, 26, 18), c: new THREE.CylinderGeometry(1, 1, 1, 14, 1, true) }, mats = {};
  const mat = c => mats[c] || (mats[c] = new THREE.MeshPhongMaterial({ color: c, shininess: 55, specular: 0x333333 }));
  const up = new THREE.Vector3(0, 1, 0);
  function cyl(p, q, r, c) { const d = new THREE.Vector3().subVectors(q, p), m = new THREE.Mesh(geo.c, mat(c)); m.scale.set(r, d.length(), r); m.position.copy(p).addScaledVector(d, 0.5); m.quaternion.setFromUnitVectors(up, d.clone().normalize()); return m; }
  function build() {
    while (grp.children.length) { grp.remove(grp.children[0]); } atomMeshes = [];
    if (!mol) return; const A = mol.atoms, vis = A.map(a => showH || a.el !== 'H'), P = A.map(a => new THREE.Vector3(a.x, a.y, a.z));
    const cen = new THREE.Vector3(), nv = vis.filter(Boolean).length || 1; A.forEach((a, i) => { if (vis[i]) cen.add(P[i]); }); cen.divideScalar(nv); P.forEach(p => p.sub(cen));
    let R = 1; A.forEach((a, i) => { if (vis[i]) R = Math.max(R, P[i].length() + 1.2); }); fitR = R;
    const nbr = A.map(() => []); mol.bonds.forEach(b => { nbr[b.a].push(b.b); nbr[b.b].push(b.a); });
    const stickR = 0.11, bondR = style === 'ball' ? 0.1 : 0.14;
    A.forEach((a, i) => { if (!vis[i]) return; const r = style === 'ball' ? (RAD[a.el] || 0.45) : bondR * 1.05, m = new THREE.Mesh(geo.s, mat(COL[a.el] || 0xff66cc)); m.scale.setScalar(r); m.position.copy(P[i]); m.userData.i = i; grp.add(m); atomMeshes.push(m); });
    for (const b of mol.bonds) { if (!vis[b.a] || !vis[b.b]) continue; const p = P[b.a], q = P[b.b], axis = new THREE.Vector3().subVectors(q, p).normalize();
      let side = new THREE.Vector3(); const other = nbr[b.a].concat(nbr[b.b]).filter(k => k !== b.a && k !== b.b);
      if (other.length) { const w = new THREE.Vector3().subVectors(P[other[0]], p); side.crossVectors(axis, w); } if (side.lengthSq() < 1e-6) side.crossVectors(axis, Math.abs(axis.y) < 0.9 ? up : new THREE.Vector3(1, 0, 0)); side.normalize();
      const offs = b.o === 2 ? [-0.5, 0.5] : b.o === 3 ? [-1, 0, 1] : [0], gap = b.o === 1 ? 0 : 0.17, rr = b.o === 1 ? bondR : bondR * 0.72, mid = new THREE.Vector3().addVectors(p, q).multiplyScalar(0.5);
      for (const o of offs) { const s = side.clone().multiplyScalar(o * gap * (b.o === 2 ? 1.5 : 1)), p1 = p.clone().add(s), q1 = q.clone().add(s), m1 = mid.clone().add(s);
        grp.add(cyl(p1, m1, rr, COL[A[b.a].el] || 0xff66cc)); grp.add(cyl(m1, q1, rr, COL[A[b.b].el] || 0xff66cc)); } }
    if (sel >= 0 && atomMeshes.find(m => m.userData.i === sel)) mark(sel); fit(); draw();
  }
  function fit() { dist = Math.max(6, fitR / Math.tan(cam.fov * Math.PI / 360) * 1.05); cam.position.set(0, 0, dist); cam.lookAt(0, 0, 0); }
  function mark(i) { sel = i; for (const m of atomMeshes) { const on = m.userData.i === i; m.material = on ? new THREE.MeshPhongMaterial({ color: COL[mol.atoms[i].el] || 0xff66cc, emissive: 0xd97757, emissiveIntensity: 0.55, shininess: 55 }) : mat(COL[mol.atoms[m.userData.i].el] || 0xff66cc); m.scale.setScalar((style === 'ball' ? (RAD[mol.atoms[m.userData.i].el] || 0.45) : 0.15) * (on ? 1.18 : 1)); } }
  function draw() { if (!disposed) renderer.render(scene, cam); }
  function loop() { raf = 0; if (disposed) return; if (spin && !drag) grp.rotation.y += 0.008; draw(); if (spin) raf = requestAnimationFrame(loop); }
  function kick() { if (!raf && !disposed) raf = requestAnimationFrame(loop); }
  /* pointer: drag turns the molecule, wheel or pinch zooms, a click without movement picks an atom */
  const el = renderer.domElement, pts = new Map(); let drag = false, moved = 0, last = null, pinch = 0;
  const rot = (dx, dy) => { const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(dy * 0.008, dx * 0.008, 0, 'XYZ')); grp.quaternion.premultiply(q); };
  el.addEventListener('pointerdown', e => { el.setPointerCapture(e.pointerId); pts.set(e.pointerId, [e.clientX, e.clientY]); drag = true; moved = 0; last = [e.clientX, e.clientY]; pinch = 0; el.style.cursor = 'grabbing'; });
  el.addEventListener('pointermove', e => { if (!pts.has(e.pointerId)) return; const o = pts.get(e.pointerId); pts.set(e.pointerId, [e.clientX, e.clientY]);
    if (pts.size === 2) { const [a, b] = [...pts.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]); if (pinch) { dist = Math.max(3, Math.min(120, dist * pinch / d)); cam.position.z = dist; } pinch = d; moved = 99; draw(); return; }
    const dx = e.clientX - o[0], dy = e.clientY - o[1]; moved += Math.abs(dx) + Math.abs(dy); rot(dx, dy); draw(); });
  const up_ = e => { pts.delete(e.pointerId); if (!pts.size) { drag = false; el.style.cursor = 'grab'; if (moved < 5 && last) pickAt(e); kick(); } };
  el.addEventListener('pointerup', up_); el.addEventListener('pointercancel', up_);
  el.addEventListener('wheel', e => { e.preventDefault(); dist = Math.max(3, Math.min(120, dist * Math.exp(e.deltaY * 0.0012))); cam.position.z = dist; draw(); }, { passive: false });
  el.addEventListener('dblclick', () => reset());
  const ray = new THREE.Raycaster(), mv = new THREE.Vector2();
  function pickAt(e) { const r = el.getBoundingClientRect(); mv.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(mv, cam);
    const hit = ray.intersectObjects(atomMeshes, false)[0]; if (hit) { mark(hit.object.userData.i); if (onPick) onPick(hit.object.userData.i); } else { mark(-1); if (onPick) onPick(-1); } draw(); }
  const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => { renderer.setSize(W(), Ht()); cam.aspect = W() / Ht(); cam.updateProjectionMatrix(); draw(); }) : null; if (ro) ro.observe(host);
  function reset() { grp.quaternion.identity(); grp.rotation.set(0, 0, 0); fit(); draw(); }
  return {
    load(m) { mol = m; sel = -1; grp.quaternion.identity(); grp.rotation.set(0, 0, 0); build(); }, setH(v) { showH = v; build(); }, setStyle(s) { style = s; build(); }, setSpin(v) { spin = v; kick(); },
    reset, pick(fn) { onPick = fn; }, select(i) { if (mol) { mark(i); draw(); } }, png() { draw(); return renderer.domElement.toDataURL('image/png'); },
    dispose() { disposed = true; if (raf) cancelAnimationFrame(raf); if (ro) ro.disconnect(); renderer.dispose(); if (el.parentNode) el.parentNode.removeChild(el); }
  };
}
const API = { create, describe, COL, RAD };
if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.Mol3D = API;
})(typeof window !== 'undefined' ? window : globalThis);
