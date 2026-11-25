# Molvex

Molvex is the platform. Molvex Draw is the 2D drawing tool and Molvex RapidDock is the docking tool.

Browser-based chemistry tools. Static files only: no build step, no server code, nothing leaves the browser. Dark by default with an orange accent; every page has a light/dark switch that is remembered (`localStorage`, key `cp-theme`).

| Tool | Folder | What it does |
|---|---|---|
| Home | `index.html` | Landing page with a card for each tool |
| Molvex Draw | `molvex/` | 2D chemical structure editor: offline IUPAC names, SMILES in and out, 3D view |
| Molvex RapidDock | `rapiddock/` | Draw → 3D → minimise → define pocket → dock; kcal/mol or kJ/mol, pose images, drug-likeness |
| Changelog | `changelog/` | What changed in each tool; add an entry here with every release |
| Shared | `shared/` | `theme.js`, `nav.js`, `versions.js` and one copy of three.js r128 |

## Run locally

```
npm run serve        # or: python3 -m http.server 8000
```

Open http://localhost:8000. Pages must be served over http: opening files from disk will not work, because RapidDock loads Molvex and its examples with `fetch`.

## Publish with GitHub Pages

See `PUBLISHING.md`. In short: upload the files through the GitHub website, then Settings → Pages → "Deploy from a branch" → `main` → `/ (root)`. `.nojekyll` is included. Links are relative, so it also works under `https://<user>.github.io/<repo>/`.

## Version numbers

All version numbers live in `shared/versions.js` (all 0.4.0 for now): one per tool plus `site` for the home page. Add a matching entry to `changelog/index.html` with every release. Bump the number when you change that tool. Each tool page shows its number beside the theme button, and the home page shows its own number next to the title and each tool's number on its card.

## Adding a tool

1. Put it in its own folder with an `index.html`.
2. In `<head>` add `<script src="../shared/theme.js"></script>`; before `</body>` add `<script src="../shared/nav.js"></script>` (adds a "Home" link and, if the page has no theme button of its own, a theme switch).
3. Define colours as CSS variables with the dark values on `:root` and the light values on `:root[data-theme="light"]`.
4. Add an entry to `TOOLS` in the root `index.html`, and a version for it in `shared/versions.js` (the key is the folder name).

## Notes per tool

**Molvex** has offline IUPAC naming (`molvex/iupac.js` is the source, inlined into `index.html`; rebuild the inlined copy if you edit it; tests in `molvex/test/`), SMILES in and out (`molvex/smilesin.js`, also inlined) and a 3D view (`molvex/mol3d.js`, inlined, using three.js and `rapiddock/chem.js` for the 3D model). It is your single-file editor, with three small edits: the theme is dark by default and shared (`cp-theme` instead of its own key), it repaints when another page changes the theme, and the palette is the shared one. If you replace `molvex/index.html` with a newer version, re-apply those edits. Dock only needs the editor to keep exposing `molfile()`.

**Molvex RapidDock** loads `../molvex/index.html` into an iframe and reads the drawing through `molfile()`. Files: `chem.js` (molfile parsing, 3D build, UFF-style minimisation, conformer search), `dock.js` (Vina-style scoring, grid maps, Monte Carlo + BFGS, pocket detection), `viewer.js` (three.js viewer), `props.js` (drug-likeness: Lipinski, Veber, Egan, TPSA, MLOGP, ESOL, SwissADME-style radar; estimates only), `app.js` (interface, console, AutoDock-GPU job sheet), `data/` (1IEP example). Units are Å and kcal/mol (kJ/mol on request). The scoring terms and weights are AutoDock Vina's (unchanged since 1.0; 1.2.7 is the current release). Grid maps are used for the search, then every kept pose is re-optimised and scored with exact pair sums, because trilinear maps under-resolve the sharp gauss1 term and read about 7 % too weak. Checked against Vina 1.2.7 on 1IEP/imatinib: crystal pose -12.53 vs -12.51 kcal/mol, redock top -13.3 vs -13.26 kcal/mol (`rapiddock/test/vina.test.js`). Scores are still estimates: receptor/ligand preparation and search differ from Vina's. Use it for exploration and ranking. Run `npm test` for the chemistry and docking tests.

## Third-party code

- three.js r128 (MIT), `shared/vendor/three.min.js`.
- Fonts (IBM Plex) load from Google Fonts.

## Licence

MIT for the code written for this repo, copyright Caleb Kam (see `LICENSE`). Third-party code keeps its own licence.

Saved drawings keep their old browser storage keys (`bondline.*`), so drawings made before the rename are still there.

## Renaming

Every product name is set in `shared/brand.js`. Change `platform` there to rename the whole platform (tool names follow, for example "NewName Draw"); change a word under `tools` to rename a tool. Pages, tab titles, the home cards, the changelog and the docking job sheet pick it up. Folder names (`molvex/`, `rapiddock/`), URLs and the keys in `shared/versions.js` stay as they are, so links do not break. The README, PUBLISHING.md and the old changelog entries are plain text and are not renamed automatically.
