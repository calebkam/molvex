const S = require('../smilesin.js'); let bad = 0;
const t = (smi, na, nb, dbl, extra) => { try { const r = S.parse(smi); const d = r.bonds.filter(b => b.o === 2).length, tr = r.bonds.filter(b => b.o === 3).length;
  const ok = r.atoms.length === na && r.bonds.length === nb && d === dbl && (!extra || extra(r)); if (!ok) { bad++; console.log('FAIL', smi, r.atoms.length, r.bonds.length, d, tr); } else console.log('ok  ', smi); } catch (e) { bad++; console.log('ERR ', smi, e.message); } };
t('CCO', 3, 2, 0); t('c1ccccc1', 6, 6, 3); t('C1=CC=CC=C1', 6, 6, 3); t('c1ccc2ccccc2c1', 10, 11, 5);
t('CC(=O)Oc1ccccc1C(=O)O', 13, 13, 5); t('CC(C)Cc1ccc(cc1)C(C)C(=O)O', 15, 15, 4); t('c1cc[nH]c1', 5, 5, 2); t('c1ccncc1', 6, 6, 3);
t('Cn1cnc2c1c(=O)n(C)c(=O)n2C', 14, 15, 4); t('C[N+](C)(C)C', 5, 4, 0, r => r.atoms[1].q === 1); t('[O-][N+](=O)c1ccccc1', 9, 9, 4);
t('C#N', 2, 1, 0, r => r.bonds[0].o === 3); t('[Na+].[Cl-]', 2, 0, 0); t('C%10CCCCC%10', 6, 6, 0); t('O=c1cccc[nH]1', 7, 7, 3);
t('c1ccc(cc1)-c1ccccc1', 12, 13, 6); t('F/C=C/F', 4, 3, 1); t('C[C@H](N)C(=O)O', 6, 5, 1); t('c1ccoc1', 5, 5, 2); t('c1ccsc1', 5, 5, 2);
t('CN1CCC[C@H]1c1cccnc1', 12, 13, 3); t('Clc1ccc(Br)cc1', 8, 8, 3); t('[nH]1cccc1', 5, 5, 2);
for (const s of ['C(', 'C1CC', 'c1cccc1', 'C=', 'C)', 'C*', 'C>>C']) { try { S.parse(s); bad++; console.log('should fail', s); } catch (e) { console.log('ok   rejects', s, '-', e.message.slice(0, 50)); } }
console.log(bad ? bad + ' FAILED' : 'ALL PASSED'); process.exit(bad ? 1 : 0);
