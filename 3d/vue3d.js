/* BlackPhantom : le flacon en vraie 3D dans la fiche.
   Le volume vient de la silhouette de la photo HD (demi-largeur ligne par ligne) : rond pour les flacons
   cylindriques, carré arrondi pour les flacons plats. La photo est projetée de face sur ce volume, ce qui
   donne de face exactement la photo, puis on peut tourner autour du flacon. Reflets : environnement studio.
   three.js (MIT) : https://threejs.org */
import * as THREE from './three.module.min.js';
import { RoomEnvironment } from './RoomEnvironment.js';

/* forme de la coupe : [exposant, profondeur / largeur]. 2 = rond ; plus grand = plus carré. */
const ROND = [2, 1];
/* cote : sur les faces de côté des flacons plats, colonne de la photo lue (fraction de la demi-largeur),
   prise entre le bord du verre et l'étiquette pour ne pas étirer de texte */
const FORMES = {
  'grand-soir': { corps: [7, .6], bouchon: [6, 1], cote: .8 },
  'ani-x': { corps: [9, .72], bouchon: [6, .9], cote: .95 },
  'miel-d-arabie': { corps: [4.2, .56], bouchon: ROND, cote: .86 },
  'rose-seljuke': { corps: [4.2, .56], bouchon: ROND, cote: .86 },
  'sucre-noir': { corps: [9, .42], bouchon: [6, .85], cote: .9 },
  'angels-share': { corps: [2, .62], bouchon: [2, .62] }
};
let profils = null;
const COMP = .24;
const lisse = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

function geometrie(pf, forme) {
  const N = pf.w.length - 1, S = 120;
  const L = pf.W / pf.H;
  const wmax = Math.max(...pf.w);
  let iCorps = pf.w.findIndex(w => w > .8 * wmax);
  if (iCorps < 0) iCorps = 0;
  const pos = [], uv = [], col = [], idx = [], flou = [];
  const ligne = i => {
    const t = i / N, yImg = pf.haut + (pf.bas - pf.haut) * t;
    const w = Math.max(pf.w[i], .0015);
    const k = lisse(iCorps - 4, iCorps + 2, i);
    const n = forme.bouchon[0] + (forme.corps[0] - forme.bouchon[0]) * k;
    const p = forme.bouchon[1] + (forme.corps[1] - forme.bouchon[1]) * k;
    return { yImg, w, n, p };
  };
  for (let i = 0; i <= N; i++) {
    const { yImg, w, n, p } = ligne(i);
    for (let j = 0; j <= S; j++) {
      const a = j / S * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
      let cote = 1;
      const x = w * Math.sign(c) * Math.pow(Math.abs(c), 2 / n);
      const z = w * p * Math.sign(s) * Math.pow(Math.abs(s), 2 / n);
      pos.push(x, -yImg, z);
      /* sur les côtés, on lit la photo un peu vers l'intérieur : le parfum et l'étiquette continuent
         au lieu d'étirer le liseré du bord */
      let xt;
      if (n > 2.6 && forme.cote) {
        /* flacon plat : face avant exacte, faces de côté lues sur une colonne sans texte */
        const b = lisse(.5, .86, Math.abs(s));
        xt = b * x + (1 - b) * Math.sign(c) * w * forme.cote;
        cote = .6 + .4 * b;
      } else xt = x * (1 - COMP * Math.pow(1 - Math.abs(s), 1.4));
      uv.push((pf.cx + xt) / L, 1 - yImg);
      const f = (.5 + .5 * lisse(-.45, .55, s)) * cote;   /* le dos et les côtés un peu plus sombres */
      col.push(f, f, f);
      flou.push((1 - cote) / .4);                        /* côtés : photo floutée, sans rayures */
    }
  }
  for (let i = 0; i < N; i++) for (let j = 0; j < S; j++) {
    const a = i * (S + 1) + j, b = a + S + 1;
    idx.push(a, b, a + 1, b, b + 1, a + 1);
  }
  /* fermeture du haut et du bas */
  const fermer = (i, haut) => {
    const { yImg } = ligne(i);
    const c0 = pos.length / 3;
    pos.push(0, -yImg, 0); uv.push(pf.cx / L, 1 - yImg); col.push(1, 1, 1); flou.push(0);
    for (let j = 0; j < S; j++) {
      const a = i * (S + 1) + j;
      haut ? idx.push(c0, a + 1, a) : idx.push(c0, a, a + 1);
    }
  };
  fermer(0, true); fermer(N, false);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setAttribute('aFlou', new THREE.Float32BufferAttribute(flou, 1));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

function ombre() {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const x = c.getContext('2d'), gr = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, 'rgba(0,0,0,.78)'); gr.addColorStop(.55, 'rgba(0,0,0,.32)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = gr; x.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/* el : la zone de la photo (sa taille fixe le cadrage) ; renvoie { detruire } ou null */
export async function monter(el, { id, base, gyro, pret }) {
  if (!profils) profils = await (await fetch(base + 'profils.json')).json();
  const pf = profils[id];
  if (!pf) return null;
  const forme = FORMES[id] || { corps: ROND, bouchon: ROND };
  const canvas = document.createElement('canvas');
  canvas.className = 'r-3d';
  canvas.setAttribute('aria-hidden', 'true');
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' }); }
  catch (e) { return null; }
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(new RoomEnvironment(), .03).texture;
  scene.environment = env;

  const tex = await new THREE.TextureLoader().loadAsync(base + 'flacon-' + id + '.jpg');
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const geo = geometrie(pf, forme);
  const mat = new THREE.MeshPhysicalMaterial({
    map: tex, vertexColors: true, roughness: .26, metalness: 0, clearcoat: 1, clearcoatRoughness: .06,
    envMapIntensity: .55, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: .42
  });
  let texFlou = null;
  if (forme.cote) {
    texFlou = await new THREE.TextureLoader().loadAsync(base + 'flacon-' + id + '-flou.jpg').catch(() => null);
    if (texFlou) texFlou.colorSpace = THREE.SRGBColorSpace;
  }
  mat.onBeforeCompile = sh => {
    if (texFlou) {
      sh.uniforms.mapFlou = { value: texFlou };
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float aFlou;\nvarying float vFlou;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvFlou = aFlou;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform sampler2D mapFlou;\nvarying float vFlou;')
        .replace('#include <map_fragment>', 'vec4 sampledDiffuseColor = mix(texture2D(map, vMapUv), texture2D(mapFlou, vMapUv), vFlou);\ndiffuseColor *= sampledDiffuseColor;')
        .replace('#include <emissivemap_fragment>', 'totalEmissiveRadiance *= mix(texture2D(emissiveMap, vEmissiveMapUv), texture2D(mapFlou, vEmissiveMapUv), vFlou).rgb;\ntotalEmissiveRadiance *= vColor.rgb;');
    } else {
      sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance *= vColor.rgb;');
    }
  };
  const flacon = new THREE.Mesh(geo, mat);

  /* reflet sur le sol : le flacon renversé, qui s'efface en s'éloignant de la base */
  const matR = new THREE.MeshBasicMaterial({ map: tex, vertexColors: true, transparent: true, opacity: .26, depthWrite: false });
  matR.onBeforeCompile = sh => {
    sh.uniforms.uBas = { value: -pf.bas };
    sh.uniforms.uLong = { value: (pf.bas - pf.haut) * .42 };
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying float vY;')
      .replace('#include <project_vertex>', '#include <project_vertex>\nvY = (modelMatrix * vec4(position, 1.0)).y;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vY;\nuniform float uBas;\nuniform float uLong;')
      .replace('#include <dithering_fragment>', '#include <dithering_fragment>\ngl_FragColor.a *= pow(clamp(1.0 - (uBas - vY) / uLong, 0.0, 1.0), 1.6);');
  };
  const reflet = new THREE.Mesh(geo, matR);
  reflet.scale.y = -1; reflet.position.y = -2 * pf.bas;

  const largeur = Math.max(...pf.w);
  const sol = new THREE.Mesh(new THREE.PlaneGeometry(largeur * 3.4, largeur * 1.5), new THREE.MeshBasicMaterial({ map: ombre(), transparent: true, depthWrite: false }));
  sol.rotation.x = -Math.PI / 2; sol.position.y = -pf.bas - .001;

  const tour = new THREE.Group();
  tour.add(flacon, reflet);
  const pied = new THREE.Group();
  pied.position.x = pf.cx - pf.W / pf.H / 2;
  pied.add(tour, sol);
  scene.add(pied);

  const camera = new THREE.PerspectiveCamera(16, 1, .05, 50);
  const cadrer = () => {
    const r = el.getBoundingClientRect();
    const w = Math.max(1, r.width), h = Math.max(1, r.height), A = w / h, L = pf.W / pf.H;
    renderer.setSize(w, h, false);
    camera.aspect = A;
    /* même cadrage que la photo : « cover », 50 % / 42 % */
    let vh, yc;
    if (A >= L) { vh = L / A; yc = (1 - vh) * .42 + vh / 2; }
    else { vh = 1; yc = .5; }
    const d = (vh / 2) / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    camera.position.set(0, -yc, d);
    camera.lookAt(0, -yc, 0);
    camera.updateProjectionMatrix();
  };
  cadrer();
  el.appendChild(canvas);

  /* mouvement : le flacon tourne tout seul, doucement ; le doigt le fait tourner, avec de l'élan */
  let angle = 0, vitesse = 0, incl = 0, inclCible = 0, tenu = false, dernierX = 0, dernierY = 0, dernierT = 0;
  let depart = performance.now(), auto = 0, raf = 0, vivant = true, premier = true;
  const AUTO = .32;
  const bas = e => { tenu = true; dernierX = e.clientX; dernierY = e.clientY; dernierT = performance.now(); vitesse = 0; el.classList.add('tenu-3d'); };
  const bouge = e => {
    if (!tenu) return;
    const t = performance.now(), dt = Math.max(8, t - dernierT) / 1000;
    const dx = e.clientX - dernierX, dy = e.clientY - dernierY;
    const r = el.getBoundingClientRect();
    const da = dx / r.width * Math.PI * 1.6;
    angle += da; vitesse = da / dt;
    inclCible = Math.max(-.32, Math.min(.32, inclCible + dy / r.height * .9));
    dernierX = e.clientX; dernierY = e.clientY; dernierT = t;
  };
  const haut = () => { tenu = false; inclCible = 0; el.classList.remove('tenu-3d'); };
  el.addEventListener('pointerdown', bas);
  addEventListener('pointermove', bouge, { passive: true });
  addEventListener('pointerup', haut); addEventListener('pointercancel', haut);
  const ro = 'ResizeObserver' in window ? new ResizeObserver(cadrer) : null;
  if (ro) ro.observe(el);

  /* rien ne se calcule quand la photo est hors de l'écran ou que l'onglet est caché */
  let visible = true;
  const relancer = () => { if (vivant && visible && !document.hidden && !raf) { avant = performance.now(); raf = requestAnimationFrame(image); } };
  const io = 'IntersectionObserver' in window ? new IntersectionObserver(es => { visible = es.some(e => e.isIntersecting); relancer(); }) : null;
  if (io) io.observe(el);
  document.addEventListener('visibilitychange', relancer);
  let avant = performance.now();
  const image = t => {
    raf = 0;
    if (!vivant) return;
    if (!visible || document.hidden) return;
    raf = requestAnimationFrame(image);
    const dt = Math.min(.05, (t - avant) / 1000); avant = t;
    if (!el.isConnected) { detruire(); return; }
    if (!tenu) {
      /* après 1,4 s de face (comme la photo), il se met à tourner */
      auto += ((t - depart > 1400 ? AUTO : 0) - auto) * Math.min(1, dt * 1.6);
      vitesse *= Math.pow(.06, dt);
      angle += (vitesse + auto) * dt;
    }
    const g = gyro && gyro();
    const inclG = g ? g[1] * .22 : 0, dec = g ? g[0] * .25 : 0;
    incl += (inclCible + inclG - incl) * Math.min(1, dt * 6);
    tour.rotation.y = angle + dec;
    pied.rotation.x = incl * .5;
    renderer.render(scene, camera);
    if (premier) { premier = false; if (pret) pret(); }
  };
  raf = requestAnimationFrame(image);

  function detruire() {
    if (!vivant) return;
    vivant = false;
    cancelAnimationFrame(raf);
    el.removeEventListener('pointerdown', bas);
    removeEventListener('pointermove', bouge); removeEventListener('pointerup', haut); removeEventListener('pointercancel', haut);
    if (ro) ro.disconnect();
    if (io) io.disconnect();
    document.removeEventListener('visibilitychange', relancer);
    geo.dispose(); mat.dispose(); matR.dispose(); tex.dispose(); if (texFlou) texFlou.dispose(); env.dispose(); pmrem.dispose();
    sol.geometry.dispose(); sol.material.map.dispose(); sol.material.dispose();
    renderer.dispose();
    try { renderer.forceContextLoss(); } catch (e) {}
    canvas.remove();
  }
  return { detruire };
}
