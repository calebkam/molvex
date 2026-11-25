/* ============================ smilesin.js ============================
   SMILES text -> atoms and bonds with Kekule bond orders (no coordinates).
   parse(text, {known}) -> { atoms:[{el,q,h,arom}], bonds:[{a,b,o}], warn:[...] }; throws Error with a plain message.
   Reads: organic subset, aromatic atoms (b c n o p s), [bracket atoms] with isotope, H count, charge and map number,
   branches, ring closures (1-9 and %nn), disconnected parts ('.'), - = # : bond symbols.
   Ignored with a warning: stereo marks (@ @@ / \\). Not read: * wildcards, quadruple bonds, reaction arrows, CXSMILES. */
(function (root) {
'use strict';
const ORG = ['B', 'C', 'N', 'O', 'P', 'S', 'F', 'Cl', 'Br', 'I'], AROM = { b: 'B', c: 'C', n: 'N', o: 'O', p: 'P', s: 'S', se: 'Se', as: 'As' };
const TARGET = { B: 3, C: 4, N: 3, O: 2, P: 3, S: 2, Se: 2, As: 3 };
function target(el, q) { /* usual valence of an aromatic atom, shifted by charge */
  let v = TARGET[el] || 4;
  if (el === 'N' || el === 'P' || el === 'As') v += q; else if (el === 'C' || el === 'B') v += (el === 'C' ? -Math.abs(q) : -q); else v += q;
  return v;
}
function parse(text, opt = {}) {
  const src = String(text).trim().split(/\s+/)[0] || ''; if (!src) throw new Error('Nothing to read. Paste a SMILES string.');
  const known = opt.known, atoms = [], bonds = [], warn = new Set(), ring = {}, stack = []; let prev = -1, sym = '', i = 0;
  const err = m => { throw new Error(m + ' (at character ' + (i + 1) + ' of the SMILES).'); };
  const addAtom = (el, arom, q, h) => {
    if (known && !known(el)) err('Element ' + el + ' is not available in Molvex');
    atoms.push({ el, q: q || 0, h: h == null ? null : h, arom: !!arom }); const id = atoms.length - 1;
    if (prev >= 0) bond(prev, id, sym); sym = ''; prev = id; };
  const bond = (a, b, s) => { if (a === b) err('An atom cannot bond to itself'); if (bonds.some(x => (x.a === a && x.b === b) || (x.a === b && x.b === a))) err('Two bonds join the same pair of atoms');
    const ar = s === ':' || (s === '' && atoms[a].arom && atoms[b].arom); bonds.push({ a, b, o: s === '=' ? 2 : s === '#' ? 3 : 1, ar }); };
  while (i < src.length) {
    const c = src[i];
    if (c === '[') {
      const j = src.indexOf(']', i); if (j < 0) err('Missing ]'); const body = src.slice(i + 1, j); const m = /^(\d+)?([A-Z][a-z]?|se|as|[bcnops])(@{1,2}(?:TH|AL|SP|TB|OH)?\d*)?(H\d*)?((?:\+\d*|-\d*|\++|-+))?(?::\d+)?$/.exec(body);
      if (!m) err('Cannot read [' + body + ']');
      let el = m[2], ar = false; if (AROM[el] && el === el.toLowerCase()) { el = AROM[el]; ar = true; }
      else if (el.length === 2 && known && !known(el)) { /* e.g. [Cl] fine; [Nb] unknown -> error below */ }
      if (m[3]) warn.add('Stereo marks (@) were ignored.');
      const h = m[4] ? (m[4].length > 1 ? parseInt(m[4].slice(1)) : 1) : 0;
      let q = 0; if (m[5]) { const t = m[5]; if (/^[+-]\d+$/.test(t)) q = (t[0] === '+' ? 1 : -1) * parseInt(t.slice(1)); else q = (t[0] === '+' ? 1 : -1) * t.length; }
      i = j; addAtom(el, ar, q, h); i++; continue; }
    if (c === 'C' && src[i + 1] === 'l') { addAtom('Cl', false); i += 2; continue; }
    if (c === 'B' && src[i + 1] === 'r') { addAtom('Br', false); i += 2; continue; }
    if (ORG.includes(c)) { addAtom(c, false); i++; continue; }
    if (AROM[c] && c !== 'a') { addAtom(AROM[c], true); i++; continue; }
    if (c === '(') { if (prev < 0) err('A branch needs an atom before it'); stack.push(prev); i++; continue; }
    if (c === ')') { if (!stack.length) err('Unmatched )'); prev = stack.pop(); sym = ''; i++; continue; }
    if (c === '.') { prev = -1; sym = ''; i++; continue; }
    if (c === '-' || c === '=' || c === '#' || c === ':') { if (prev < 0 && !sym) err('A bond symbol needs an atom before it'); sym = c; i++; continue; }
    if (c === '/' || c === '\\') { warn.add('Stereo marks (/ \\) were ignored.'); sym = sym || ''; i++; continue; }
    if (c === '$') err('Quadruple bonds are not supported'); if (c === '*') err('Wildcard atoms (*) are not supported'); if (c === '>') err('Reactions are not supported. Paste one molecule at a time');
    if (/[0-9%]/.test(c)) {
      let n; if (c === '%') { n = parseInt(src.substr(i + 1, 2)); if (!(n >= 10)) err('Bad ring number after %'); i += 3; } else { n = parseInt(c); i++; }
      if (prev < 0) err('A ring number needs an atom before it');
      const o = ring[n]; if (o) { const s = o.sym || sym; if (o.atom === prev) err('A ring closure cannot join an atom to itself'); bond(o.atom, prev, s); delete ring[n]; } else ring[n] = { atom: prev, sym };
      sym = ''; continue; }
    err('Unexpected "' + c + '"');
  }
  if (stack.length) err('Missing )'); const open = Object.keys(ring); if (open.length) throw new Error('Ring closure ' + open[0] + ' is never closed.');
  if (sym) throw new Error('The SMILES ends with a bond symbol.'); if (!atoms.length) throw new Error('No atoms found.');
  kekulize(atoms, bonds); return { atoms, bonds: bonds.map(b => ({ a: b.a, b: b.b, o: b.o })), warn: [...warn] };
}
/* Give each aromatic atom that needs one a double bond, using a perfect matching on aromatic bonds. */
function kekulize(atoms, bonds) {
  const filled = atoms.map((a, i) => a.h || 0), nb = atoms.map(() => []);
  bonds.forEach((b, k) => { if (b.ar) { filled[b.a] += 1; filled[b.b] += 1; nb[b.a].push([b.b, k]); nb[b.b].push([b.a, k]); } else { filled[b.a] += b.o; filled[b.b] += b.o; } });
  const need = atoms.map((a, i) => a.arom && target(a.el, a.q) - filled[i] > 0);
  const mate = atoms.map(() => -1), via = atoms.map(() => -1); let steps = 0;
  const solve = () => {
    if (++steps > 200000) return false;
    let best = -1, opts = null;
    for (let i = 0; i < atoms.length; i++) if (need[i] && mate[i] < 0) { const o = nb[i].filter(([j]) => need[j] && mate[j] < 0); if (!o.length) return false; if (!opts || o.length < opts.length) { best = i; opts = o; if (o.length === 1) break; } }
    if (best < 0) return true;
    for (const [j, k] of opts) { mate[best] = j; mate[j] = best; via[best] = via[j] = k; if (solve()) return true; mate[best] = mate[j] = -1; via[best] = via[j] = -1; }
    return false; };
  if (!solve()) throw new Error('The aromatic ring system cannot be drawn with alternating single and double bonds. Check the lowercase atoms, or write the Kekule form.');
  for (let i = 0; i < atoms.length; i++) if (via[i] >= 0) bonds[via[i]].o = 2;
}
const API = { parse, kekulize };
if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.SMILESIN = API;
})(typeof window !== 'undefined' ? window : globalThis);
