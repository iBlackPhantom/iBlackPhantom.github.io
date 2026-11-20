/* Lecture du listing PDF du fournisseur, directement dans le navigateur (pdf.js).
   Le PDF est un tableau : section (HOMME, NICHE, FEMME) > maison > lignes
   « nom | prix (vide ou non) | photo ». La couleur de fond d'une ligne donne son état :
   jaune = nouveauté, rouge = rupture, vert pâle = testeur / sans boîte.
   Rien n'est envoyé nulle part ici : on rend juste les données et les photos. */

const SECTION_MOTS = /\b(HOMMES?|FEMMES?|MIXTES?|NICHE|MAQUILLAGE|SOINS?|CAPILLAIRES?|ENFANTS?|UNISEXE|COFFRETS|BEAUT[EÉ]|AUTRES MAISONS)\b/;
const SECTIONS = {
  'HOMME': 'Homme',
  'FEMME': 'Femme',
  'MIXTE': 'Mixte',
  'MAQUILLAGE – SOINS DU VISAGE – PRODUITS CAPILLAIRES': 'Beauté & soins',
  'MAQUILLAGE - SOINS DU VISAGE - PRODUITS CAPILLAIRES': 'Beauté & soins',
  'AUTRES MAISONS': 'Autres maisons',
  'PARFUM DE NICHE MIXTE ET COLLECTION PRIVEE': 'Niche & collection privée',
  'PARFUM DE NICHE MIXTE ET COLLECTION PRIVÉE': 'Niche & collection privée',
};

/* noms de maisons tels qu'on les écrit (le reste : majuscule à chaque mot) */
const MAISONS = {
  'BOSS': 'Boss', 'HUGO BOSS': 'Hugo Boss', 'YSL': 'Yves Saint Laurent', 'YVES SAINT LAURENT': 'Yves Saint Laurent',
  'DOLCE & GABBANA': 'Dolce & Gabbana', 'DOLCE GABBANA': 'Dolce & Gabbana', 'CALVIN KLEIN': 'Calvin Klein',
  'JEAN PAUL GAULTIER': 'Jean Paul Gaultier', 'PACO RABANNE': 'Paco Rabanne', 'RABANNE': 'Rabanne',
  'MFK': 'Maison Francis Kurkdjian', 'MAISON FRANCIS KURKDJIAN': 'Maison Francis Kurkdjian',
  'PDM': 'Parfums de Marly', 'PARFUMS DE MARLY': 'Parfums de Marly', 'BDK': 'BDK Parfums', 'BDK PARFUMS': 'BDK Parfums',
  'DKNY': 'DKNY', 'KILIAN': 'Kilian', 'BY KILIAN': 'Kilian', 'TOM FORD': 'Tom Ford', 'XERJOFF': 'Xerjoff',
  'GIVENCHY': 'Givenchy', 'GUERLAIN': 'Guerlain', 'LANCOME': 'Lancôme', 'LANCÔME': 'Lancôme',
  'HERMES': 'Hermès', 'HERMÈS': 'Hermès', 'CHLOE': 'Chloé', 'CHLOÉ': 'Chloé', 'JEAN-PAUL GAULTIER': 'Jean Paul Gaultier',
  'NARCISO ROGRIGUEZ': 'Narciso Rodriguez', 'NARCISO RODRIGUEZ': 'Narciso Rodriguez',
  'MAISON FRANCIS KURKDIJAN': 'Maison Francis Kurkdjian', 'MAISON FRANCIS KURDIJAN': 'Maison Francis Kurkdjian',
  'VICTOR & ROLPH': 'Viktor & Rolf', 'VIKTOR & ROLF': 'Viktor & Rolf', 'ZADIG&VOLTAIRE': 'Zadig & Voltaire', 'ZADIG & VOLTAIRE': 'Zadig & Voltaire',
  'ROGER ET GALLET': 'Roger & Gallet', 'STÉPHANIE DE BRUIJN': 'Stéphanie de Bruijn', 'STEPHANIE DE BRUIJN': 'Stéphanie de Bruijn',
  'EX NIHILO': 'Ex Nihilo', 'MAÏSSA FLACON 100ML': 'Maïssa', 'MAISSA FLACON 100ML': 'Maïssa',
  'DÉCANTAGE PARFUM DIVERS MARQUES': 'Décants divers', 'DECANTAGE PARFUM DIVERS MARQUES': 'Décants divers',
  'THIERRY MUGLER': 'Mugler', 'MUGLER': 'Mugler', 'SIGNATURE BY SILLAGE D’ORIENT': "Signature by Sillage d'Orient",
  'LES PRINCES DU GOLFE': 'Les Princes du Golfe', 'DUCCI GIARDINI DI TOSCANA': 'Ducci Giardini di Toscana',
  'ATELIER DES ORS': 'Atelier des Ors', 'PARADIS DES SENS': 'Paradis des Sens', 'PARFUMS DE RUE': 'Parfums de Rue',
  'AL-JAZEERA PARIS': 'Al-Jazeera Paris', 'YARA LATTAFA': 'Lattafa',
};

const MAJ = new Set(['CK', 'VIP', 'II', 'III', 'IV', 'VI', 'VII', 'XS', 'NYC', 'YSL', 'DKNY', 'BDK', 'MFK', 'PDM', 'EDP', 'EDT', 'EDC', 'L.12.12', 'XJ', 'USA', 'UK', 'CH', 'JPG', 'LV', 'UV', 'XL', 'XXL', 'N°5', 'MDCI', 'LX', 'SPF', 'FSK', 'BR', 'XERJ']);
const PETITS = new Set(['de', 'du', 'des', 'et', 'à', 'au', 'aux', 'en', 'sur', 'la', 'le', 'les', 'of', 'the', 'by', 'with', 'for', 'and', 'in', 'on']);

export function casse(t, garderPetits) {
  const mots = String(t).trim().toLowerCase().split(/(\s+)/);
  let i = 0;
  return mots.map(m => {
    if (/^\s+$/.test(m) || !m) return m;
    const premier = i++ === 0;
    if (MAJ.has(m.toUpperCase())) return m.toUpperCase();
    if (/^[ivx]+$/.test(m) && m.length <= 4 && !premier) return m.toUpperCase();
    if (!premier && !garderPetits && PETITS.has(m)) return m;
    /* majuscule après début, tiret, point, apostrophe (d'Arabie, L'Homme) */
    return m.replace(/(^|[-.(\/])([a-zà-ÿœæ])/g, (x, a, b) => a + b.toUpperCase()).replace(/^([dl])([’'])(\p{L})/ui, (x, a, ap, c) => (a.toLowerCase() === 'd' && !premier ? 'd' : a.toUpperCase()) + ap + c.toUpperCase());
  }).join('');
}

export function nomMaison(t) {
  const k = String(t).replace(/\s+/g, ' ').trim().toUpperCase();
  return MAISONS[k] || casse(k.replace(/\s*&\s*/g, ' & '), false);
}

export function slug(t) {
  return String(t).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/&/g, ' et ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 90);
}

const CONCENTRATIONS = [
  [/\bEXTRAIT (?:DE )?PARFUM\b/, 'Extrait de parfum'],
  [/\bEXTRAIT\b/, 'Extrait'],
  [/\bEAU DE PARFUM\b|\bEDP\b/, 'Eau de parfum'],
  [/\bEAU DE TOILETTE\b|\bEDT\b/, 'Eau de toilette'],
  [/\bEAU DE COLOGNE\b|\bEDC\b/, 'Eau de cologne'],
  [/\bLE PARFUM\b/, 'Le Parfum'],
  [/\bPARFUM\b/, 'Parfum'],
  [/\bCOLOGNE\b/, 'Cologne'],
];

/* « AZZARO WANTED 100ML EDP TESTEUR » → nom, taille, concentration, testeur, coffret… */
export function decouper(libelle, maison) {
  let t = ' ' + String(libelle).replace(/\s+/g, ' ').trim().toUpperCase() + ' ';
  const r = { testeur: false, sansBoite: false, coffret: false };
  if (/\bTESTEURS?\b|\bTESTER\b/.test(t)) { r.testeur = true; t = t.replace(/\bTESTEURS?\b|\bTESTER\b/g, ' '); }
  r.etat = [];
  t = t.replace(/\(?\b(SANS|SOUS) (BO[IÎ]TE|BOUCHON|BLISTER|CAPOT|CELLOPHANE)\)?/g, (x, a, b) => {
    r.etat.push((a === 'SANS' ? 'Sans ' : 'Sous ') + b.toLowerCase().replace('boite', 'boîte'));
    if (/BO[IÎ]TE/.test(b)) r.sansBoite = true;
    return ' ';
  });
  if (/\bCOFFRET\b/.test(t)) { r.coffret = true; t = t.replace(/\bCOFFRET\b/g, ' '); }
  /* un coffret : « 100ML EDP + VAPO 10ML + GEL DOUCHE 100ML » */
  const plus = t.search(/\s?\+\s?(?=[A-Z0-9ÀÂÉÈÊÎÔÛ])/);
  if (plus > 0) {
    r.coffret = true;
    const avant = t.slice(0, plus), apres = t.slice(plus);
    const m = avant.match(/(\d+(?:[.,]\d+)?)\s?ML\b[^+]*$/);
    const debut = m ? avant.slice(0, m.index) : avant;
    r.contenu = (m ? m[0] : '').concat(apres).replace(/\s+/g, ' ').trim()
      .replace(/(\d)\s?ML\b/g, '$1 ml').replace(/\bEDP\b/g, 'EDP').toLowerCase().replace(/\b(edp|edt|edc)\b/g, x => x.toUpperCase());
    t = ' ' + debut + ' ' + (m ? m[0] : '') + ' ';
    r.contenu = r.contenu.replace(/\+(?=\S)/g, '+ ').replace(/(\S)\+/g, '$1 +');
  }
  const ml = t.match(/(\d+(?:[.,]\d+)?)\s?ML\b/);
  if (ml) { r.ml = Number(ml[1].replace(',', '.')); t = t.replace(ml[0], ' '); }
  let conc = '';
  for (const [re, nom] of CONCENTRATIONS) {
    const m = t.match(re);
    /* « PARFUM » au milieu d'un nom (ex. « PARFUM DE NICHE ») ne compte que s'il est à la fin */
    if (m && (nom !== 'Parfum' || /\bPARFUM\s*$/.test(t))) { conc = nom; t = t.replace(m[0], ' '); break; }
  }
  r.concentration = conc;
  /* retire la maison en tête du nom (ou un bout reconnaissable) */
  const mU = String(maison || '').toUpperCase().replace(/[-\s]+/g, ' ').trim();
  t = t.replace(/\s+/g, ' ').trim();
  const tN = t.replace(/-/g, ' ');
  if (tN !== t && mU && (tN + ' ').startsWith(mU + ' ')) t = tN;
  const sansAcc = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const essais = [mU, mU.replace(/^(PARFUMS?|MAISON|LES PARFUMS DE)\s+/, ''), mU.split(' ')[0]];
  let ote = false;
  /* maison mal orthographiée dans la ligne (« MAISON FRANCIS KURDIJAN ») : mêmes premiers mots */
  const mm = mU.split(' '), tm = t.split(' ');
  if (mm.length >= 3 && tm.length > mm.length && mm.slice(0, -1).every((w, i) => sansAcc(w) === sansAcc(tm[i]))) { t = tm.slice(mm.length).join(' '); ote = true; }
  for (const e of ote ? [] : essais) {
    if (e && e.length > 1 && sansAcc(t + ' ').startsWith(sansAcc(e) + ' ') && t.length > e.length + 1) { t = t.slice(e.length).trim(); ote = true; break; }
  }

  t = t.replace(/^[-–/\s]+|[-–/\s]+$/g, '');
  r.nom = casse(t || libelle);
  return r;
}

/* ------- géométrie ------- */
const mul = (m, n) => [
  m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1],
  m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3],
  m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5],
];
const appl = (m, x, y) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];

function boites(ops, OPS) {
  const res = [];
  let ctm = [1, 0, 0, 1, 0, 0];
  const pile = [];
  const unite = (m) => {
    const p = [[0, 0], [1, 0], [0, 1], [1, 1]].map(([x, y]) => appl(m, x, y));
    const xs = p.map(q => q[0]), ys = p.map(q => q[1]);
    res.push({ x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) });
  };
  for (let i = 0; i < ops.fnArray.length; i++) {
    const f = ops.fnArray[i], a = ops.argsArray[i];
    if (f === OPS.save) pile.push(ctm);
    else if (f === OPS.restore) ctm = pile.pop() || ctm;
    else if (f === OPS.transform) ctm = mul(ctm, a);
    else if (f === OPS.paintFormXObjectBegin) { pile.push(ctm); if (a && Array.isArray(a[0]) && a[0].length === 6) ctm = mul(ctm, a[0]); else if (a && a[0] && a[0].length === 6) ctm = mul(ctm, Array.from(a[0])); }
    else if (f === OPS.paintFormXObjectEnd) ctm = pile.pop() || ctm;
    else if (f === OPS.paintImageXObject || f === OPS.paintInlineImageXObject) unite(ctm);
    else if (f === OPS.paintImageXObjectRepeat) {
      const [, sx, sy, pos] = a;
      for (let k = 0; k + 1 < (pos || []).length; k += 2) unite(mul(ctm, [sx, 0, 0, sy, pos[k], pos[k + 1]]));
    }
  }
  return res;
}

function etatCouleur(r, g, b) {
  if (r > 245 && g > 245 && b > 245) return 'blanc';
  if (r > 200 && g > 200 && b < 120) return 'nouveau';
  if (r > 190 && g < 120 && b < 120) return 'rupture';
  if (g > 215 && r > 180 && b > 170 && g >= r + 6 && g >= b + 8) return 'testeur';
  if (r < 90 && g < 90 && b < 90) return 'noir';
  return 'autre';
}

const PRIX = /(\d{1,4}(?:[ .]\d{3})*(?:[.,]\d{1,2})?)\s*(?:€|EUR|E)?/i;

/* ------- lecture ------- */
export async function lireListing(pdfjs, octets, opts = {}) {
  const progres = opts.progres || (() => {});
  const photos = opts.photos !== false;
  const echelle = opts.echelle || 2.4;
  const tailleMax = opts.tailleMax || 360;
  const qualite = opts.qualite || 0.84;
  const tache = pdfjs.getDocument({ data: octets, isEvalSupported: false });
  const doc = await tache.promise;
  const n = doc.numPages;
  const refs = [];
  const avertissements = [];
  let section = '', maison = '', maj = '', secPos = null, maisonPos = null;
  const notes = new Map();
  const notesBrutes = [];
  const vus = new Map();

  for (let p = 1; p <= n; p++) {
    if (opts.annule && opts.annule()) throw new Error('annulé');
    const page = await doc.getPage(p);
    const debutPage = refs.length;
    const vp1 = page.getViewport({ scale: 1 });
    const W = vp1.width, H = vp1.height;
    const tc = await page.getTextContent();
    const items = [];
    for (const it of tc.items) {
      if (!it.str || !it.str.trim()) continue;
      const t = it.transform;
      const h = Math.hypot(t[2], t[3]) || Math.abs(t[3]);
      const [x, y] = vp1.convertToViewportPoint(t[4], t[5]);
      items.push({ s: it.str, x, y, h, w: it.width || 0 });
    }
    const tout = items.map(i => i.s).join(' ');
    const mMaj = tout.match(/MISE\s+[AÀ]\s+JOUR\s*:?\s*(\d{1,2}\/\d{1,2}\/\d{2,4})/i);
    if (mMaj && !maj) maj = mMaj[1];
    if (/L[EÉ]GENDES?/i.test(tout) && p <= 2) { page.cleanup(); progres(p, n); continue; }

    /* lignes : mêmes y (à 40 % de la hauteur près) et même type */
    const genre = it => it.h >= 34 ? 'section' : it.h >= 19 ? 'maison'
      : (it.x < W * 0.47 ? 'nom' : (it.x < W * 0.62 ? 'prix' : 'autre'));
    items.sort((a, b) => a.y - b.y || a.x - b.x);
    const lignes = [];
    for (const it of items) {
      const g = genre(it);
      if (g === 'autre') continue;
      const l = lignes.find(l => l.g === g && Math.abs(l.y - it.y) < Math.max(2, it.h * 0.4));
      if (l) l.items.push(it); else lignes.push({ g, y: it.y, h: it.h, items: [it] });
    }
    for (const l of lignes) {
      l.items.sort((a, b) => a.x - b.x);
      let s = '', fin = null;
      for (const it of l.items) {
        if (fin !== null && it.x - fin > l.h * 0.15 && !s.endsWith(' ')) s += ' ';
        s += it.s; fin = it.x + it.w;
      }
      l.t = s.replace(/\s+/g, ' ').trim();
      l.x0 = l.items[0].x;
    }
    lignes.sort((a, b) => a.y - b.y);

    /* blocs : lignes de nom qui se suivent de près = une référence */
    const blocs = [];
    const prixL = [];
    let cour = null;
    for (const l of lignes) {
      if (l.g === 'section' && secPos && secPos.p === p && l.y - secPos.y < l.h * 1.6) {
        /* titre sur plusieurs lignes (« PARFUM DE NICHE MIXTE ET / COLLECTION PRIVEE ») : on recolle */
        section += ' ' + l.t.toUpperCase(); secPos = { p, y: l.y }; continue;
      }
      if (l.g === 'section' && !SECTION_MOTS.test(l.t.toUpperCase())) {
        /* grand texte qui n'est pas une section (« Mauboussin dès l'achat de 12 pièces ») : une condition */
        cour = null;
        const d = notesBrutes[notesBrutes.length - 1];
        if (d && d.p === p && l.y - d.y < l.h * 1.6) { d.t += ' ' + l.t; d.y = l.y; }
        else notesBrutes.push({ p, y: l.y, t: l.t, section, maison });
        continue;
      }
      if (l.g === 'section') {
        cour = null;
        section = l.t.toUpperCase();
        secPos = { p, y: l.y };
        maison = '';
        continue;
      }
      if (l.g === 'maison') {
        cour = null;
        /* après la partie beauté (sans maisons), le listing repart sur d'autres maisons de parfum */
        if (/MAQUILLAGE|SOINS|CAPILLAIRE/.test(section)) { section = 'AUTRES MAISONS'; secPos = null; }
        if (maisonPos && maisonPos.p === p && l.y - maisonPos.y < l.h * 1.6) maison += ' ' + l.t; else maison = l.t;
        maisonPos = { p, y: l.y };
        continue;
      }
      if (l.g === 'prix') { prixL.push(l); continue; }
      if (cour && l.y - cour.yFin < l.h * 1.7) { cour.lignes.push(l.t); cour.yFin = l.y; continue; }
      cour = { lignes: [l.t], yDeb: l.y, yFin: l.y, h: l.h, section, maison };
      blocs.push(cour);
    }
    for (const b of blocs) b.cy = (b.yDeb - b.h * 0.72 + b.yFin + b.h * 0.1) / 2;
    for (const l of prixL) {
      const m = l.t.replace(/\s/g, ' ').match(PRIX);
      if (!m) continue;
      let best = null, d = 1e9;
      for (const b of blocs) { const e = Math.abs(b.cy - (l.y - l.h * 0.3)); if (e < d) { d = e; best = b; } }
      if (best && d < 70) best.achat = Number(m[1].replace(/[ .](?=\d{3})/g, '').replace(',', '.'));
    }

    /* photos et couleurs : on dessine la partie droite de la page (prix + photo) */
    let cadres = [];
    if (blocs.length) {
      const ops = await page.getOperatorList();
      cadres = boites(ops, pdfjs.OPS).map(c => {
        const a = vp1.convertToViewportPoint(c.x0, c.y0), b = vp1.convertToViewportPoint(c.x1, c.y1);
        return { x0: Math.min(a[0], b[0]), x1: Math.max(a[0], b[0]), y0: Math.min(a[1], b[1]), y1: Math.max(a[1], b[1]) };
      }).filter(c => (c.x0 + c.x1) / 2 > W * 0.55 && c.x1 - c.x0 > 20 && c.y1 - c.y0 > 20);
      /* une photo par référence : la plus proche verticalement */
      for (const c of cadres) {
        const cy = (c.y0 + c.y1) / 2;
        let best = null, d = 1e9;
        for (const b of blocs) { const e = Math.abs(b.cy - cy); if (e < d) { d = e; best = b; } }
        if (best && d < 75 && (!best.cadre || d < best.dCadre)) { best.cadre = c; best.dCadre = d; }
      }
      const X0 = W * 0.44;
      const vp = page.getViewport({ scale: echelle, offsetX: -X0 * echelle });
      const cv = document.createElement('canvas');
      cv.width = Math.ceil((W - X0) * echelle); cv.height = Math.ceil(H * echelle);
      const ctx = cv.getContext('2d', { willReadFrequently: true });
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, cv.width, cv.height);
      await page.render({ canvasContext: ctx, viewport: vp, canvas: cv }).promise;
      const px = (x, y) => {
        const X = Math.round((x - X0) * echelle), Y = Math.round(y * echelle);
        if (X < 0 || Y < 0 || X >= cv.width || Y >= cv.height) return [255, 255, 255];
        const d = ctx.getImageData(X, Y, 1, 1).data; return [d[0], d[1], d[2]];
      };
      for (const b of blocs) {
        const votes = {};
        for (const fx of [0.475, 0.5, 0.53, 0.56, 0.59]) for (const dy of [-10, 0, 10]) {
          const e = etatCouleur(...px(W * fx, b.cy + dy));
          votes[e] = (votes[e] || 0) + 1;
        }
        b.couleur = ['nouveau', 'rupture', 'testeur'].find(e => (votes[e] || 0) >= 5) || '';
        if (photos && b.cadre) {
          const c = b.cadre, i = 1.2;
          const sx = (c.x0 - X0) * echelle + i, sy = c.y0 * echelle + i;
          const sw = (c.x1 - c.x0) * echelle - 2 * i, sh = (c.y1 - c.y0) * echelle - 2 * i;
          const k = Math.min(1, tailleMax / Math.max(sw, sh));
          const out = document.createElement('canvas');
          out.width = Math.max(1, Math.round(sw * k)); out.height = Math.max(1, Math.round(sh * k));
          const o = out.getContext('2d');
          o.fillStyle = '#fff'; o.fillRect(0, 0, out.width, out.height);
          o.imageSmoothingQuality = 'high';
          o.drawImage(cv, sx, sy, sw, sh, 0, 0, out.width, out.height);
          b.photo = await new Promise(res => out.toBlob(res, 'image/jpeg', qualite));
          out.width = out.height = 0;
        }
      }
      cv.width = cv.height = 0;
    }
    page.cleanup();

    /* « par 100 pièces », « Vente par 25 pièces » : conditions de la maison, pas des références */
    for (let i = blocs.length - 1; i >= 0; i--) {
      const b = blocs[i], txt = b.lignes.join(' ');
      if (/pi[eè]ces?\b/i.test(txt) && !/\d\s?ML\b/i.test(txt) && !b.cadre) {
        const cle = b.section + '|' + b.maison;
        notes.set(cle, (notes.get(cle) ? notes.get(cle) + ' · ' : '') + txt.replace(/\s+/g, ' ').trim());
        blocs.splice(i, 1);
      }
    }
    /* morceaux d'une même case séparés par une ligne plus petite : on recolle au voisin qui a la photo */
    for (let i = blocs.length - 1; i >= 0; i--) {
      const b = blocs[i];
      if (b.cadre || /\d\s?ML\b/i.test(b.lignes.join(' '))) continue;
      let best = null, d = 1e9;
      for (const o of blocs) if (o !== b && o.maison === b.maison) { const e = Math.abs(o.cy - b.cy); if (e < d) { d = e; best = o; } }
      if (best && d < (b.lignes.join(' ').split(' ').length < 4 ? 95 : 70)) {
        if (b.cy < best.cy) best.lignes.unshift(...b.lignes); else best.lignes.push(...b.lignes);
        blocs.splice(i, 1);
      }
    }

    for (const b of blocs) {
      const libelle = b.lignes.join(' ').replace(/\s+/g, ' ').trim();
      const sec = SECTIONS[b.section.replace(/\s+/g, ' ').trim()] || casse(b.section.replace(/\s+/g, ' ').trim(), false);
      const d = decouper(libelle, b.maison);
      let id = slug(sec + '-' + (b.maison || '') + '-' + libelle.replace(/\bTESTEURS?\b/gi, 'testeur'));
      if (vus.has(id)) { const k = vus.get(id) + 1; vus.set(id, k); id += '-' + k; } else vus.set(id, 1);
      const ref = {
        id, libelle, section: sec, maison: b.maison ? nomMaison(b.maison) : '', nom: d.nom,
        ml: d.ml || null, concentration: d.concentration || '', contenu: d.contenu || '',
        testeur: d.testeur || b.couleur === 'testeur', sansBoite: d.sansBoite, etat: d.etat, coffret: d.coffret,
        nouveau: b.couleur === 'nouveau', rupture: b.couleur === 'rupture', page: p,
        __cle: b.section + '|' + b.maison,
      };
      if (b.achat != null) ref.achat = b.achat;
      if (b.photo) ref.photo = b.photo;
      if (!b.cadre) avertissements.push(`Page ${p} : pas de photo pour « ${libelle} »`);
      refs.push(ref);
    }
    progres(p, n, refs.length, refs.slice(debutPage));
  }
  try { await tache.destroy(); } catch (e) {}
  /* une condition qui nomme une maison va à cette maison (dans la même section si possible) */
  const cleMaison = m => slug(m).replace(/-/g, '');
  for (const n of notesBrutes) {
    const premier = cleMaison(n.t.split(/\s+/)[0] || '');
    const cible = premier.length > 2 && refs.find(r => r.section === (SECTIONS[n.section] || casse(n.section)) && cleMaison(r.maison).startsWith(premier))
      || (premier.length > 2 && refs.find(r => cleMaison(r.maison).startsWith(premier)));
    const cle = cible ? cible.__cle : n.section + '|' + n.maison;
    const txt = n.t.replace(/\s+/g, ' ').trim();
    notes.set(cle, (notes.get(cle) ? notes.get(cle) + ' · ' : '') + txt);
  }
  for (const r of refs) {
    const k = r.__cle; delete r.__cle;
    if (notes.has(k)) r.note = notes.get(k);
  }
  return { maj, pages: n, refs, avertissements };
}
