/* ── Bird Ambience (Web Audio API) ────────────────────────── */
const Birds = (() => {
  let ctx = null, masterGain = null, active = false, timer = null;

  function ensureCtx() {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      masterGain = ctx.createGain();
      masterGain.gain.value = 0.55;
      masterGain.connect(ctx.destination);
    }
  }

  function chirp(delay = 0) {
    const t = ctx.currentTime + delay;
    // Two-tone chirp for a realistic bird sound
    [0, 0.07].forEach(offset => {
      const osc  = ctx.createOscillator();
      const env  = ctx.createGain();
      const freq = 2200 + Math.random() * 1800;
      const dur  = 0.05 + Math.random() * 0.1;

      osc.connect(env); env.connect(masterGain);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t + offset);
      osc.frequency.exponentialRampToValueAtTime(freq * (1.4 + Math.random() * 0.4), t + offset + dur * 0.5);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.92, t + offset + dur);

      env.gain.setValueAtTime(0, t + offset);
      env.gain.linearRampToValueAtTime(0.25 + Math.random() * 0.15, t + offset + dur * 0.25);
      env.gain.exponentialRampToValueAtTime(0.001, t + offset + dur);

      osc.start(t + offset);
      osc.stop(t + offset + dur + 0.02);
    });
  }

  function schedule() {
    if (!active) return;
    chirp(0);
    const burst = Math.floor(Math.random() * 5);
    for (let i = 1; i <= burst; i++) chirp(i * (0.08 + Math.random() * 0.12));
    timer = setTimeout(schedule, 1200 + Math.random() * 4000);
  }

  return {
    start() {
      ensureCtx();
      ctx.resume();
      active = true;
      schedule();
    },
    stop() {
      active = false;
      clearTimeout(timer);
      ctx?.suspend();
    },
    setVolume(v) {
      if (masterGain) masterGain.gain.value = parseFloat(v) * 0.7;
    },
    isActive() { return active; },
  };
})();

/* ── City Ambience (Web Audio API) ─────────────────────────── */
const CityAmbience = (() => {
  let ctx = null, masterGain = null, active = false;
  const layers = [];
  const timers = [];

  function ensureCtx() {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      masterGain = ctx.createGain();
      masterGain.gain.value = 0.5;
      masterGain.connect(ctx.destination);
    }
  }

  function makeNoiseBuf(seconds) {
    const len = ctx.sampleRate * seconds;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  /* ─ Layer 1: городской фон — тихий гул дороги ─────────────── */
  function startTrafficBed() {
    const src = ctx.createBufferSource();
    src.buffer = makeNoiseBuf(4);
    src.loop = true;

    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 320; lp.Q.value = 0.5;

    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass'; hp.frequency.value = 40;

    const g = ctx.createGain();
    g.gain.value = 0.14;

    src.connect(lp); lp.connect(hp); hp.connect(g); g.connect(masterGain);
    src.start();
    layers.push(src);
  }

  /* ─ Layer 2: низкочастотный рокот города ─────────────────── */
  function startCityRumble() {
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.value = 48 + Math.random() * 15;

    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.15 + Math.random() * 0.1;

    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 8;

    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);

    const g = ctx.createGain();
    g.gain.value = 0.06;

    osc.connect(g); g.connect(masterGain);
    osc.start(); lfo.start();
    layers.push(osc, lfo);
  }

  /* ─ Layer 3: ветер / воздух ──────────────────────────────── */
  function startWind() {
    const src = ctx.createBufferSource();
    src.buffer = makeNoiseBuf(3);
    src.loop = true;

    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass'; bp.frequency.value = 800; bp.Q.value = 0.3;

    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.08;
    const lfoG = ctx.createGain();
    lfoG.gain.value = 400;
    lfo.connect(lfoG); lfoG.connect(bp.frequency);

    const g = ctx.createGain();
    g.gain.value = 0.04;

    src.connect(bp); bp.connect(g); g.connect(masterGain);
    src.start(); lfo.start();
    layers.push(src, lfo);
  }

  /* ─ Event: проезжающая машина ────────────────────────────── */
  function carPass() {
    if (!active) return;
    const t = ctx.currentTime;
    const dur = 2 + Math.random() * 3;
    const panDir = Math.random() < 0.5 ? -1 : 1;

    const src = ctx.createBufferSource();
    src.buffer = makeNoiseBuf(Math.ceil(dur) + 1);

    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(120, t);
    bp.frequency.linearRampToValueAtTime(350 + Math.random() * 200, t + dur * 0.45);
    bp.frequency.linearRampToValueAtTime(100, t + dur);
    bp.Q.value = 1.2;

    const pan = ctx.createStereoPanner();
    pan.pan.setValueAtTime(panDir * 0.8, t);
    pan.pan.linearRampToValueAtTime(panDir * -0.8, t + dur);

    const env = ctx.createGain();
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(0.08 + Math.random() * 0.05, t + dur * 0.4);
    env.gain.linearRampToValueAtTime(0, t + dur);

    src.connect(bp); bp.connect(pan); pan.connect(env); env.connect(masterGain);
    src.start(t); src.stop(t + dur + 0.2);
  }

  /* ─ Event: автобус / тяжёлый транспорт ──────────────────── */
  function busPass() {
    if (!active) return;
    const t = ctx.currentTime;
    const dur = 4 + Math.random() * 4;

    const src = ctx.createBufferSource();
    src.buffer = makeNoiseBuf(Math.ceil(dur) + 1);

    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 180 + Math.random() * 60; lp.Q.value = 0.8;

    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = 35 + Math.random() * 15;

    const oscG = ctx.createGain();
    oscG.gain.value = 0.025;

    const pan = ctx.createStereoPanner();
    const side = Math.random() < 0.5 ? -1 : 1;
    pan.pan.setValueAtTime(side * 0.6, t);
    pan.pan.linearRampToValueAtTime(side * -0.6, t + dur);

    const env = ctx.createGain();
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(0.07, t + dur * 0.3);
    env.gain.setValueAtTime(0.07, t + dur * 0.7);
    env.gain.linearRampToValueAtTime(0, t + dur);

    src.connect(lp); lp.connect(env);
    osc.connect(oscG); oscG.connect(env);
    env.connect(pan); pan.connect(masterGain);

    src.start(t); src.stop(t + dur + 0.2);
    osc.start(t); osc.stop(t + dur + 0.2);
  }

  /* ─ Event: автомобильный сигнал ─────────────────────────── */
  function horn() {
    if (!active) return;
    const t = ctx.currentTime;
    const freq = 380 + Math.random() * 220;
    const dur = 0.25 + Math.random() * 0.5;
    const isDouble = Math.random() < 0.3;

    function singleHorn(start) {
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, start);
      osc.frequency.linearRampToValueAtTime(freq * 0.97, start + dur);

      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass'; lp.frequency.value = 1200;

      const env = ctx.createGain();
      env.gain.setValueAtTime(0, start);
      env.gain.linearRampToValueAtTime(0.025, start + 0.03);
      env.gain.setValueAtTime(0.025, start + dur - 0.05);
      env.gain.linearRampToValueAtTime(0, start + dur);

      osc.connect(lp); lp.connect(env); env.connect(masterGain);
      osc.start(start); osc.stop(start + dur + 0.05);
    }

    singleHorn(t);
    if (isDouble) singleHorn(t + dur + 0.12);
  }

  /* ─ Event: пение птицы ──────────────────────────────────── */
  function birdChirp() {
    if (!active) return;
    const t = ctx.currentTime;
    const songCount = 2 + Math.floor(Math.random() * 5);

    for (let n = 0; n < songCount; n++) {
      const offset = n * (0.08 + Math.random() * 0.14);
      const freq = 2800 + Math.random() * 2200;
      const dur = 0.04 + Math.random() * 0.09;

      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t + offset);
      osc.frequency.exponentialRampToValueAtTime(
        freq * (0.7 + Math.random() * 0.8), t + offset + dur
      );

      const env = ctx.createGain();
      env.gain.setValueAtTime(0, t + offset);
      env.gain.linearRampToValueAtTime(0.04 + Math.random() * 0.03, t + offset + dur * 0.2);
      env.gain.exponentialRampToValueAtTime(0.001, t + offset + dur);

      const pan = ctx.createStereoPanner();
      pan.pan.value = (Math.random() - 0.5) * 1.6;

      osc.connect(env); env.connect(pan); pan.connect(masterGain);
      osc.start(t + offset);
      osc.stop(t + offset + dur + 0.02);
    }
  }

  /* ─ Event: второй вид птицы (длинная трель) ─────────────── */
  function birdTrill() {
    if (!active) return;
    const t = ctx.currentTime;
    const baseFreq = 3200 + Math.random() * 1500;
    const notes = 5 + Math.floor(Math.random() * 8);
    const pan = ctx.createStereoPanner();
    pan.pan.value = (Math.random() - 0.5) * 1.4;
    pan.connect(masterGain);

    for (let i = 0; i < notes; i++) {
      const offset = i * (0.06 + Math.random() * 0.04);
      const up = i % 2 === 0;
      const f = baseFreq * (up ? 1 : 0.82);
      const dur = 0.03 + Math.random() * 0.04;

      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, t + offset);
      osc.frequency.exponentialRampToValueAtTime(f * (up ? 1.25 : 0.75), t + offset + dur);

      const env = ctx.createGain();
      env.gain.setValueAtTime(0, t + offset);
      env.gain.linearRampToValueAtTime(0.035, t + offset + dur * 0.15);
      env.gain.exponentialRampToValueAtTime(0.001, t + offset + dur);

      osc.connect(env); env.connect(pan);
      osc.start(t + offset);
      osc.stop(t + offset + dur + 0.02);
    }
  }

  /* ─ Event: голоса / разговор ─────────────────────────────── */
  function voices() {
    if (!active) return;
    const t = ctx.currentTime;
    const dur = 1.5 + Math.random() * 3;
    const isGroup = Math.random() < 0.4;
    const count = isGroup ? 2 + Math.floor(Math.random() * 2) : 1;

    for (let v = 0; v < count; v++) {
      const isMale = Math.random() < 0.5;
      const formantBase = isMale ? 120 + Math.random() * 60 : 200 + Math.random() * 80;

      const src = ctx.createBufferSource();
      src.buffer = makeNoiseBuf(Math.ceil(dur) + 1);

      // Формантный фильтр — имитация речевого спектра
      const f1 = ctx.createBiquadFilter();
      f1.type = 'bandpass';
      f1.frequency.value = formantBase * 2.5;
      f1.Q.value = 5;

      const f2 = ctx.createBiquadFilter();
      f2.type = 'bandpass';
      f2.frequency.value = formantBase * 6;
      f2.Q.value = 4;

      // Ритм речи — модулятор амплитуды (syllable rate ~4-6 Hz)
      const modOsc = ctx.createOscillator();
      modOsc.type = 'sine';
      modOsc.frequency.value = 3.5 + Math.random() * 3;

      const modG = ctx.createGain();
      modG.gain.value = 0.5;

      const modOffset = ctx.createConstantSource();
      modOffset.offset.value = 0.5;

      const modMixer = ctx.createGain();
      modMixer.gain.value = 1;

      modOsc.connect(modG); modG.connect(modMixer.gain);
      modOffset.connect(modMixer);

      const env = ctx.createGain();
      env.gain.setValueAtTime(0, t);
      env.gain.linearRampToValueAtTime(0.025 + Math.random() * 0.015, t + 0.3);
      env.gain.setValueAtTime(0.025, t + dur - 0.4);
      env.gain.linearRampToValueAtTime(0, t + dur);

      const pan = ctx.createStereoPanner();
      pan.pan.value = (Math.random() - 0.5) * 1.2;

      const merge = ctx.createGain();
      merge.gain.value = 0.5;

      src.connect(f1); src.connect(f2);
      f1.connect(merge); f2.connect(merge);
      merge.connect(modMixer);
      modMixer.connect(env);
      env.connect(pan); pan.connect(masterGain);

      src.start(t + v * 0.2); src.stop(t + dur + 0.3);
      modOsc.start(t); modOsc.stop(t + dur + 0.3);
      modOffset.start(t); modOffset.stop(t + dur + 0.3);
    }
  }

  /* ─ Event: шаги ─────────────────────────────────────────── */
  function footsteps() {
    if (!active) return;
    const t = ctx.currentTime;
    const steps = 4 + Math.floor(Math.random() * 8);
    const pace = 0.4 + Math.random() * 0.2;
    const panPos = (Math.random() - 0.5) * 1.4;

    const pan = ctx.createStereoPanner();
    pan.pan.value = panPos;
    pan.connect(masterGain);

    for (let i = 0; i < steps; i++) {
      const st = t + i * pace;
      const src = ctx.createBufferSource();
      src.buffer = makeNoiseBuf(1);

      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass'; hp.frequency.value = 800;

      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass'; lp.frequency.value = 3000;

      const env = ctx.createGain();
      env.gain.setValueAtTime(0, st);
      env.gain.linearRampToValueAtTime(0.03 + Math.random() * 0.01, st + 0.01);
      env.gain.exponentialRampToValueAtTime(0.001, st + 0.08);

      src.connect(hp); hp.connect(lp); lp.connect(env); env.connect(pan);
      src.start(st); src.stop(st + 0.12);
    }
  }

  /* ─ Планировщик событий ─────────────────────────────────── */
  function scheduleTraffic() {
    if (!active) return;
    const r = Math.random();
    if (r < 0.5) carPass();
    else if (r < 0.7) busPass();
    else if (r < 0.82) horn();
    timers.push(setTimeout(scheduleTraffic, 1500 + Math.random() * 4000));
  }

  function scheduleBirds() {
    if (!active) return;
    if (Math.random() < 0.6) birdChirp();
    else birdTrill();
    timers.push(setTimeout(scheduleBirds, 2000 + Math.random() * 6000));
  }

  function schedulePeople() {
    if (!active) return;
    if (Math.random() < 0.6) voices();
    else footsteps();
    timers.push(setTimeout(schedulePeople, 3000 + Math.random() * 7000));
  }

  return {
    start() {
      ensureCtx();
      ctx.resume();
      active = true;
      startTrafficBed();
      startCityRumble();
      startWind();
      setTimeout(() => { if (active) scheduleBirds(); }, 500);
      setTimeout(() => { if (active) scheduleTraffic(); }, 1000);
      setTimeout(() => { if (active) schedulePeople(); }, 2000);
    },
    stop() {
      active = false;
      timers.forEach(t => clearTimeout(t));
      timers.length = 0;
      layers.forEach(n => { try { n.stop(); } catch {} });
      layers.length = 0;
      ctx?.suspend();
    },
    setVolume(v) {
      if (masterGain) masterGain.gain.value = parseFloat(v) * 0.6;
    },
    isActive() { return active; },
  };
})();

/* ── State ─────────────────────────────────────────────────── */
const S = {
  episode:       null,
  playing:       false,
  distOpen:      false,
  hintDismissed: localStorage.getItem('hintDone') === '1',
  minutes:       parseInt(localStorage.getItem('minutes') || '186'),
  simProgress:   0,
  simTimer:      null,
  selectedLayer: null,
};

/* ── Map (no tiles — чистый чёрный фон) ─────────────────── */
const map = L.map('map', {
  center: [55.7558, 37.6173],
  zoom: 13,
  zoomControl: false,
  attributionControl: false,
  preferCanvas: false,
});

// Чёрный фон принудительно через JS
map.getContainer().style.background = '#000000';

const GEO_CACHE = 'moscow_geo_v7';   // v7 — принудительный сброс кэша

/* osmToGeoJSON = библиотека osmtogeojson (osmtogeojson.js, локальный файл) */

/* ── Загрузка районов Москвы ─────────────────────────────── */
function splashDone() {
  setSplashProgress(100);
  setTimeout(() => {
    document.getElementById('splash').classList.add('hidden');
    document.body.classList.remove('app-loading');
    setTimeout(() => map.invalidateSize(), 100);
  }, 400);
}

function setSplashProgress(pct) {
  const bar = document.getElementById('splash-bar');
  if (bar) bar.style.width = Math.min(100, pct) + '%';
}

async function loadMoscowDistricts() {
  setSplashProgress(5);

  // 0. Локальный bundled GeoJSON (работает без интернета)
  try {
    const r = await fetch('vendor/moscow.geojson');
    if (r.ok) {
      setSplashProgress(80);
      const gj = await r.json();
      if (gj?.features?.length > 50) {
        setSplashProgress(95);
        renderDistricts(gj);
        return;
      }
    }
  } catch (e) {
    console.warn('[map] local geojson failed', e);
  }

  // 1. localStorage-кэш
  try {
    const raw = localStorage.getItem(GEO_CACHE);
    if (raw) {
      setSplashProgress(60);
      const gj = JSON.parse(raw);
      if (gj?.features?.length > 50) {
        setSplashProgress(90);
        try { renderDistricts(gj); return; } catch (e) {
          console.warn('[map] cached data failed to render, clearing cache', e);
          localStorage.removeItem(GEO_CACHE);
        }
      } else {
        localStorage.removeItem(GEO_CACHE);
      }
    }
  } catch { localStorage.removeItem(GEO_CACHE); }

  setSplashProgress(10);

  const QUERIES = [
    `[out:json][timeout:60];area["ISO3166-2"="RU-MOW"]->.a;(relation["boundary"="administrative"]["admin_level"="8"](area.a););out geom;`,
    `[out:json][timeout:60];area["ISO3166-2"="RU-MOW"]->.a;(relation["boundary"="administrative"]["admin_level"="9"](area.a););out geom;`,
    `[out:json][timeout:60];area["ISO3166-2"="RU-MOW"]->.a;(relation["boundary"="administrative"]["admin_level"~"^(8|9)$"](area.a););out geom;`,
  ];

  const MIRRORS = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
    'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
  ];

  let attempt = 0;
  const totalAttempts = QUERIES.length * MIRRORS.length;

  for (const query of QUERIES) {
    for (const url of MIRRORS) {
      attempt++;
      const pct = 10 + Math.round((attempt / totalAttempts) * 60);
      setSplashProgress(pct);
      setSplashText('загрузка карты…');

      try {
        const ctrl = new AbortController();
        const tmr = setTimeout(() => ctrl.abort(), 15000);
        const r = await fetch(url, {
          method:  'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body:    'data=' + encodeURIComponent(query),
          signal:  ctrl.signal,
        });
        clearTimeout(tmr);
        if (!r.ok) continue;

        setSplashProgress(pct + 10);
        setSplashText('обработка данных…');
        const osm = await r.json();
        console.log(`[map] ${url} → ${osm.elements?.length ?? 0} elements`);
        if (!osm.elements?.length) continue;

        setSplashProgress(85);
        const gj = osmtogeojson(osm);
        console.log(`[map] osmtogeojson → ${gj.features?.length ?? 0} features`);

        if (gj.features?.length > 50) {
          setSplashProgress(95);
          try { localStorage.setItem(GEO_CACHE, JSON.stringify(gj)); } catch { /* quota */ }
          renderDistricts(gj);
          return;
        }
      } catch (e) {
        console.warn('[map]', url, e.message);
      }
    }
  }

  setSplashProgress(90);
  setSplashText('загрузка контура Москвы…');
  try {
    const ctrl2 = new AbortController();
    const tmr2 = setTimeout(() => ctrl2.abort(), 10000);
    const r = await fetch(
      'https://nominatim.openstreetmap.org/search.php?q=Moscow&format=geojson&polygon_geojson=1&limit=1&countrycodes=ru',
      { signal: ctrl2.signal }
    );
    clearTimeout(tmr2);
    const gj = await r.json();
    if (gj.features?.length) { renderDistricts(gj); return; }
  } catch { /* silent */ }

  setSplashText('⚠ нет соединения');
  const splashEl = document.getElementById('splash');
  if (splashEl && !splashEl.querySelector('.splash-retry')) {
    const btn = document.createElement('button');
    btn.className = 'splash-retry';
    btn.textContent = 'повторить';
    btn.style.cssText = 'margin-top:16px;padding:8px 24px;border-radius:8px;border:1px solid rgba(255,255,255,0.3);background:transparent;color:#fff;font-size:14px;cursor:pointer;font-family:inherit;';
    btn.onclick = () => {
      btn.remove();
      loadMoscowDistricts();
    };
    splashEl.appendChild(btn);
  }
}

function setSplashText(t) {
  const el = document.querySelector('.splash-label');
  if (el) el.textContent = t;
}

let fillLayer   = null;   // нижний: чёрные заливки — кликабельный
let strokeLayer = null;   // верхний: белые границы — некликабельный

/* ── Стили ───────────────────────────────────────────────── */
const S_FILL_DEFAULT = { stroke: false, fillColor: '#000000', fillOpacity: 1 };
const S_FILL_HOVER   = { stroke: false, fillColor: '#ffffff', fillOpacity: 0.18 };
const S_FILL_SEL     = { stroke: false, fillColor: '#ffffff', fillOpacity: 1 };
const S_STROKE       = { fill: false,   color: '#ffffff',     weight: 1.2, opacity: 0.85 };

/* ── Рендер двумя слоями ─────────────────────────────────── */
function renderDistricts(geojson) {
  splashDone();

  if (fillLayer)   { map.removeLayer(fillLayer);   fillLayer   = null; }
  if (strokeLayer) { map.removeLayer(strokeLayer); strokeLayer = null; }

  const isPolygon = f => {
    const t = f.geometry?.type;
    return t === 'Polygon' || t === 'MultiPolygon';
  };

  /* Слой 1 — заливки (чёрные). Он же принимает клики. */
  fillLayer = L.geoJSON(geojson, {
    filter: isPolygon,
    style: () => ({ ...S_FILL_DEFAULT }),
    onEachFeature(feat, layer) {
      layer.on('click', e => {
        L.DomEvent.stopPropagation(e);
        selectDistrict(feat.properties, layer);
      });
      layer.on('mouseover', () => {
        if (S.selectedLayer !== layer) layer.setStyle(S_FILL_HOVER);
      });
      layer.on('mouseout', () => {
        if (S.selectedLayer !== layer) layer.setStyle(S_FILL_DEFAULT);
      });
    },
  }).addTo(map);

  /* Слой 2 — только белые линии границ, сверху, без кликов. */
  strokeLayer = L.geoJSON(geojson, {
    filter: isPolygon,
    style: () => ({ ...S_STROKE }),
    interactive: false,
  }).addTo(map);

  /* Центрируем на Москве */
  try {
    const bounds = fillLayer.getBounds();
    if (bounds.isValid()) map.fitBounds(bounds, { padding: [40, 40], animate: false });
  } catch (e) { console.warn('[map] fitBounds error:', e.message); }
}

/* ── Клик по конкретному району ─────────────────────────── */
function selectDistrict(props, layer) {
  if (S.selectedLayer && S.selectedLayer !== layer)
    S.selectedLayer.setStyle(S_FILL_DEFAULT);

  layer.setStyle(S_FILL_SEL);
  S.selectedLayer = layer;

  // Реальное название района из OSM данных
  const realName = props.name || props['name:ru'] || props.NAME || 'Район';
  showDistrict(realName);
}

/* ── Гербы районов Москвы (Wikimedia Commons) ────────────── */
const WMC = 'https://upload.wikimedia.org/wikipedia/commons/';
const DISTRICT_COATS = {
  'арбат':            WMC+'2/2b/Coat_of_Arms_of_Arbat_%28municipality_in_Moscow%29.png',
  'тверской':         WMC+'f/f6/Coat_of_Arms_of_Tverskoy_%28municipality_in_Moscow%29.png',
  'замоскворечье':    WMC+'1/11/Coat_of_Arms_of_Zamoskvorechye_%28municipality_in_Moscow%29.png',
  'якиманка':         WMC+'8/81/Coat_of_Arms_of_Yakimanka_%28municipality_in_Moscow%29.png',
  'хамовники':        WMC+'0/06/Coat_of_Arms_of_Khamovniki_%28municipality_in_Moscow%29.png',
  'басманный':        WMC+'e/e8/Coat_of_Arms_of_Basmannoe_%28municipality_in_Moscow%29.png',
  'пресненский':      WMC+'e/ec/Coat_of_Arms_of_Presnensky_%28municipality_in_Moscow%29.png',
  'таганский':        WMC+'5/5d/Coat_of_Arms_of_Taganskoe_%28municipality_in_Moscow%29.png',
  'мещанский':        WMC+'b/b2/Coat_of_Arms_of_Meshchansky_%28municipality_in_Moscow%29.png',
  'красносельский':   WMC+'d/de/Coat_of_Arms_of_Krasnoselsky_%28municipality_in_Moscow%29.png',
  'сокольники':       WMC+'c/c9/Coat_of_Arms_of_Sokolniki_%28municipality_in_Moscow%29.png',
  'преображенское':   WMC+'f/fb/Coat_of_Arms_of_Preobrazhenskoye_%28municipality_in_Moscow%29.png',
  'дорогомилово':     WMC+'4/42/Coat_of_Arms_of_Dorogomilovo_%28municipality_in_Moscow%29.png',
  'черёмушки':        WMC+'b/b7/Coat_of_Arms_of_Cheryomushki_%28municipality_in_Moscow%29.png',
  'ясенево':          WMC+'9/91/Coat_of_Arms_of_Yasenevo_%28municipality_in_Moscow%29.png',
  'даниловский':      WMC+'0/0e/Coat_of_Arms_of_Danilovsky_%28municipality_in_Moscow%29.png',
  'царицыно':         WMC+'e/ec/Coat_of_Arms_of_Tsaritsino_%28municipality_in_Moscow%29.png',
  'кунцево':          WMC+'d/d4/Coat_of_Arms_of_Kuntsevo_%28municipality_in_Moscow%29.png',
  'измайлово':        WMC+'6/6f/Coat_of_Arms_of_Izmaylovo_%28municipality_in_Moscow%29.png',
  'перово':           WMC+'e/e3/Coat_of_Arms_of_Perovo_%28municipality_in_Moscow%29.png',
  'гагаринский':      WMC+'1/1c/Coat_of_Arms_of_Gagarinsky_%28municipality_in_Moscow%29.png',
  'коньково':         WMC+'2/28/Coat_of_Arms_of_Konkovo_%28municipality_in_Moscow%29.png',
  'зюзино':           WMC+'1/1a/Coat_of_Arms_of_Zyuzino_%28municipality_in_Moscow%29.png',
  'обручевский':      WMC+'0/0b/Coat_of_Arms_of_Obruchevskoe_%28municipality_in_Moscow%29.png',
  'строгино':         WMC+'e/e1/Coat_of_Arms_of_Strogino_%28municipality_in_Moscow%29.png',
  'аэропорт':         WMC+'c/c6/Coat_of_Arms_of_Aeroport_%28municipality_in_Moscow%29.png',
  'беговой':          WMC+'1/1c/Coat_of_Arms_of_Begovoy_%28municipality_in_Moscow%29.png',
  'войковский':       WMC+'c/ca/Coat_of_Arms_of_Voikovsky_%28municipality_in_Moscow%29.png',
  'головинский':      WMC+'6/62/Coat_of_Arms_of_Golovinskoe_%28municipality_in_Moscow%29.png',
  'сокол':            WMC+'c/c4/Coat_of_Arms_of_Sokol_%28municipality_in_Moscow%29.png',
  'тимирязевский':    WMC+'7/72/Coat_of_Arms_of_Timiryazevsky_%28municipality_in_Moscow%29.png',
  'ховрино':          WMC+'b/b0/Coat_of_Arms_of_Khovrino_%28municipality_in_Moscow%29.png',
  'богородское':      WMC+'8/8c/Coat_of_Arms_of_Bogorodskoye_%28municipality_in_Moscow%29.png',
  'вешняки':          WMC+'9/93/Coat_of_Arms_of_Veshnyaki_%28municipality_in_Moscow%29.png',
  'ивановское':       WMC+'e/e9/Coat_of_Arms_of_Ivanovskoye_%28municipality_in_Moscow%29.png',
  'фили-давыдково':   WMC+'c/c0/Coat_of_Arms_of_Fili-Davydkovo_%28municipality_in_Moscow%29.png',
  'раменки':          WMC+'8/83/Coat_of_Arms_of_Ramenki_%28municipality_in_Moscow%29.png',
  'лефортово':        WMC+'5/52/Coat_of_Arms_of_Lefortovo_%28municipality_in_Moscow%29.png',
  'нижегородский':    WMC+'1/1f/Coat_of_Arms_of_Nizhegorodskoe_%28municipality_in_Moscow%29.png',
  'люблино':          WMC+'f/f4/Coat_of_Arms_of_Lyublino_%28municipality_in_Moscow%29.png',
  'марьино':          WMC+'e/e2/Coat_of_Arms_of_Marino_%28municipality_in_Moscow%29.png',
  'капотня':          WMC+'8/83/Coat_of_Arms_of_Kapotnya_%28municipality_in_Moscow%29.png',
  'текстильщики':     WMC+'4/4f/Coat_of_Arms_of_Tekstilshchiki_%28municipality_in_Moscow%29.png',
  'кузьминки':        WMC+'5/57/Coat_of_Arms_of_Kuzminki_%28municipality_in_Moscow%29.png',
  'выхино-жулебино':  WMC+'3/30/Coat_of_Arms_of_Vykhino-Zhulebino_%28municipality_in_Moscow%29.png',
  'рязанский':        WMC+'8/83/Coat_of_Arms_of_Ryazanskoe_%28municipality_in_Moscow%29.png',
  'южнопортовый':     WMC+'e/ed/Coat_of_Arms_of_Yuzhnoportovoe_%28municipality_in_Moscow%29.png',
  'печатники':        WMC+'4/4a/Coat_of_Arms_of_Pechatniki_%28municipality_in_Moscow%29.png',
  'крылатское':       WMC+'1/19/Coat_of_Arms_of_Krylatskoye_%28municipality_in_Moscow%29.png',
  'солнцево':         WMC+'e/eb/Coat_of_Arms_of_Solntsevo_%28municipality_in_Moscow%29.png',
  'внуково':          WMC+'1/1d/Coat_of_Arms_of_Vnukovo_%28municipality_in_Moscow%29.png',
  'восточное измайлово': WMC+'4/4e/Coat_of_Arms_of_Vostochnoye_Izmailovo_%28municipality_in_Moscow%29.png',
  'соколиная гора':   WMC+'c/c5/Coat_of_Arms_of_Sokolinaya_Gora_%28municipality_in_Moscow%29.png',
  'новогиреево':      WMC+'5/51/Coat_of_Arms_of_Novogireevo_%28municipality_in_Moscow%29.png',
  'косино-ухтомский': WMC+'f/fc/Coat_of_Arms_of_Kosino-Ukhtomsky_%28municipality_in_Moscow%29.png',
  'новокосино':       WMC+'4/45/Coat_of_Arms_of_Novokosino_%28municipality_in_Moscow%29.png',
  'метрогородок':     WMC+'c/c1/Coat_of_Arms_of_Metrogorodok_%28municipality_in_Moscow%29.png',
  'северное измайлово': WMC+'6/6e/Coat_of_Arms_of_North_Izmailovo_%28municipality_in_Moscow%29.png',
  'алтуфьевский':     WMC+'f/f4/Coat_of_Arms_of_Altufievsky_%28municipality_in_Moscow%29.png',
  'бутырский':        WMC+'0/01/Coat_of_Arms_of_Butyrsky_%28municipality_in_Moscow%2C_2019%29.png',
  'западное дегунино': WMC+'5/59/Coat_of_Arms_of_Zapadnoye_Degunino_%28municipality_in_Moscow%29.png',
  'восточное дегунино': WMC+'5/53/Coat_of_Arms_of_Vostochnoye_Degunino_%28municipality_in_Moscow%29.png',
  'коптево':          WMC+'f/f7/Coat_of_Arms_of_Koptevo_%28municipality_in_Moscow%29.png',
  'марфино':          WMC+'c/cd/Coat_of_Arms_of_Marfino_%28municipality_in_Moscow%29.png',
  'ростокино':        WMC+'d/df/Coat_of_Arms_of_Rostokino_%28municipality_in_Moscow%29.png',
  'савёловский':      WMC+'3/31/Coat_of_Arms_of_Savelovsky_%28municipality_in_Moscow%29.png',
  'свиблово':         WMC+'b/bc/Coat_of_Arms_of_Sviblovo_%28municipality_in_Moscow%29.png',
  'северное медведково': WMC+'6/63/Coat_of_Arms_of_North_Medvedkovo_%28municipality_in_Moscow%29_%282004%29.png',
  'южное медведково':  WMC+'3/38/Coat_of_Arms_of_South_Medvedkovo_%28municipality_in_Moscow%29.png',
  'останкинский':     WMC+'0/02/Coat_of_Arms_of_Ostankinsky_%28municipality_in_Moscow%2C_2018%29.png',
  'щукино':           WMC+'e/e7/Coat_of_Arms_of_Schukino_%28municipality_in_Moscow%29_proposal_%282003%29.png',
  'покровское-стрешнево': WMC+'1/10/Coat_of_Arms_of_Pokrovskoye-Streshnevo_%28municipality_in_Moscow%29.png',
  'южное тушино':     WMC+'c/cf/Coat_of_Arms_of_South_Tushino_%28municipality_in_Moscow%29.png',
  'северное тушино':  WMC+'8/89/Coat_of_Arms_of_North_Tushino_%28municipality_in_Moscow%29_%281997%29.png',
  'митино':           WMC+'1/17/Coat_of_Arms_of_Mitino_%28municipality_in_Moscow%29.png',
  'куркино':          WMC+'1/14/Coat_of_Arms_of_Kurkino_%28municipality_in_Moscow%29.png',
  'можайский':        WMC+'2/27/Coat_of_Arms_of_Mozhaiskoe_%28municipality_in_Moscow%29%2C_Higher_Quality.png',
  'очаково-матвеевское': WMC+'7/78/Coat_of_Arms_of_Ochakovo-Matveevskoye_%28municipality_in_Moscow%29.png',
  'тропарёво-никулино': WMC+'2/27/Coat_of_Arms_of_Troparevo-Nikulino_%28municipality_in_Moscow%29.svg',
  'проспект вернадского': WMC+'3/32/Coat_of_Arms_of_Prospekt_Vernadskogo_%28municipality_in_Moscow%29.png',
  'академический':    WMC+'9/9a/Coat_of_Arms_of_Akademichesky_%28municipality_in_Moscow%29.png',
  'котловка':         WMC+'c/ca/Coat_of_Arms_of_Kotlovka_%28municipality_in_Moscow%29.png',
  'северное бутово':  WMC+'f/f1/Coat_of_Arms_of_Butovo_North_%28municipality_in_Moscow%29.png',
  'южное бутово':     WMC+'e/ec/Coat_of_Arms_of_Butovo_South_%28municipality_in_Moscow%29.png',
  'чертаново центральное': WMC+'f/ff/Coat_of_Arms_of_Chertanovo_Center_%28municipality_in_Moscow%29.png',
  'чертаново южное':  WMC+'d/d5/Coat_of_Arms_of_Chertanovo_South_%28municipality_in_Moscow%29.png',
  'нагатино-садовники': WMC+'3/36/Coat_of_Arms_of_Nagatino-Sadovniki_%28municipality_in_Moscow%29.png',
  'нагатинский затон': WMC+'0/0f/Coat_of_Arms_of_Nagatinsky_Zaton_%28municipality_in_Moscow%29.png',
  'донской':          WMC+'b/b0/Coat_of_Arms_of_Donskoy_%28municipality_in_Moscow%29.svg',
  'орехово-борисово северное': WMC+'4/42/Coat_of_Arms_of_Northern_Orekhovo-Borisovo_%28municipality_in_Moscow%29.png',
  'орехово-борисово южное': WMC+'5/50/Coat_of_Arms_of_South_Orekhovo-Borisovo_%28municipality_in_Moscow%29.png',
  'бирюлёво восточное': WMC+'f/f3/Coat_of_Arms_of_Biryulyovo_Vostochnoye_%28municipality_in_Moscow%29.png',
  'бирюлёво западное': WMC+'8/8b/Coat_of_Arms_of_Biryulyovo_Zapadnoye_%28municipality_in_Moscow%29.png',
  'братеево':         WMC+'8/89/Coat_of_Arms_of_Brateyevo_%28municipality_in_Moscow%2C_2021%29.png',
  'зябликово':        WMC+'5/58/Coat_of_Arms_of_Zyablikovo_%28municipality_in_Moscow%2C_2018%29.png',
  'москворечье-сабурово': WMC+'8/80/Coat_of_Arms_of_Moskvorechye-Saburovo_%28municipality_in_Moscow%29.png',
  'хорошёво-мнёвники': WMC+'d/dc/Coat_of_Arms_of_Khoroshevo-Mnevniki_%28municipality_in_Moscow%29.png',
  'отрадное':         WMC+'2/2d/Coat_of_Arms_of_Otradnoye_%28municipality_in_Moscow%29.svg',
  'марьина роща':     WMC+'0/00/Coat_of_Arms_of_Maryina_Roshcha_%28municipality_in_Moscow%29.svg',
  'лианозово':        WMC+'2/22/Coat_of_Arms_of_Lianozovo_%28municipality_in_Moscow%29.svg',
  'бибирево':         WMC+'b/b7/Coat_of_Arms_of_Bibirevo_%28municipality_in_Moscow%29.svg',
  'тёплый стан':      WMC+'4/46/Coat_of_Arms_of_Tyoply_Stan_%28municipality_in_Moscow%29.png',
  'чертаново северное': WMC+'a/a3/Coat_of_Arms_of_Chertanovo_North_%28municipality_in_Moscow%29.png',
  'гольяново':        WMC+'6/67/Coat_of_Arms_of_Goliyanovo_%28municipality_in_Moscow%29.png',
  'филёвский парк':   WMC+'5/5c/Coat_of_Arms_of_Filyovsky_park_%28municipality_in_Moscow%29.png',
  'ново-переделкино': WMC+'4/4a/Coat_of_Arms_of_Novo-Peredelkino_%28municipality_in_Moscow%29.png',
  'некрасовка':       WMC+'e/e9/Coat_of_Arms_of_Nekrasovka_%28municipality_in_Moscow%29.png',
  'ярославский':      WMC+'b/bd/Coat_of_Arms_of_Yaroslavsky_%28municipality_in_Moscow%29.png',
  'бабушкинский':     WMC+'d/dd/Coat_of_Arms_of_Babushkinskoe_%28municipality_in_Moscow%29.png',
  'нагорный':         WMC+'c/ca/Coat_of_Arms_of_Nagornoe_%28municipality_in_Moscow%29.png',
  'бескудниковский':  WMC+'b/b2/Coat_of_Arms_of_Beskudnikovskoe_%28municipality_in_Moscow%29.png',
  'щербинка':         WMC+'5/5d/Coat_of_Arms_of_Shcherbinka_%28Moscow%29.png',
  'троицк':           WMC+'2/22/Coat_of_Arms_of_Troitsk_%28Moscow_oblast%29.png',
  'дмитровский':      WMC+'5/53/Coat_of_Arms_of_Dmitrovskoye_municipality_%28Moscow%29_proposal.png',
  'северный':         WMC+'9/97/Coat_of_Arms_of_Severny_District_%28Moscow%29.svg',
  'алексеевский':     WMC+'d/d1/Coat_of_Arms_of_Alekseevskoe_%28municipality_in_Moscow%29.png',
  'лосиноостровский': WMC+'f/fa/Coat_of_Arms_of_Losinoostrovsky_District_%28Moscow%29.svg',
};
const MOSCOW_COAT = WMC+'1/17/Coat_of_arms_of_Moscow.svg';

function findDistrictPhoto(name) {
  const lower = name.toLowerCase();
  if (DISTRICT_COATS[lower]) return DISTRICT_COATS[lower];
  for (const [key, url] of Object.entries(DISTRICT_COATS)) {
    if (lower.includes(key) || key.includes(lower)) return url;
  }
  return MOSCOW_COAT;
}


/* ── Показать район в плеере ─────────────────────────────── */
function showDistrict(districtName) {
  const lower = districtName.toLowerCase();
  const ep = EPISODES.find(e => lower.includes(e.district.toLowerCase()))
          || EPISODES[Math.floor(Math.random() * EPISODES.length)];

  loadEpisode(ep.id, districtName);
}

/* ── Подсветить район по имени (для списка) ──────────────── */
function highlightDistrictByName(name) {
  if (!fillLayer) return;
  const lower = name.toLowerCase();
  let found = false;

  fillLayer.eachLayer(layer => {
    if (found) return;
    const props = layer.feature?.properties || {};
    const layerName = (props.name || props['name:ru'] || '').toLowerCase();
    if (layerName.includes(lower) || lower.includes(layerName)) {
      found = true;
      selectDistrict(props, layer);
      try {
        if (layer.getBounds) {
          const b = layer.getBounds();
          if (b.isValid()) map.fitBounds(b, { padding: [80, 80], maxZoom: 13, animate: true });
        }
      } catch (e) { console.warn('[map] fitBounds error:', e.message); }
    }
  });

  // Если не нашли на карте — просто показываем в плеере
  if (!found) showDistrict(name);
}

loadMoscowDistricts();

/* ── DOM refs ──────────────────────────────────────────────── */
const audioEl     = document.getElementById('audio-el');
const progressBar = document.getElementById('progress-bar');
const wfpFill     = document.getElementById('wfp-fill');
const timeCur     = document.getElementById('ctrl-time-cur');
const timeTot     = document.getElementById('ctrl-time-tot');
const playIcon    = document.getElementById('ctrl-play-icon');
const playerCard  = document.getElementById('player-card');
const ctrlsBar    = document.getElementById('player-controls-bar');

/* ── Mobile player refs ──────────────────────────────────────── */
const playerOverlay     = document.getElementById('player-expanded-overlay');
const playerMiniBar     = document.getElementById('player-mini-bar');
const miniBarTitle      = document.getElementById('mini-bar-title');
const miniBarPlayIcon   = document.getElementById('mini-bar-play-icon');
const miniBarWaveform   = document.getElementById('mini-bar-waveform');

function setPlayIcons(playing) {
  [playIcon, miniBarPlayIcon].forEach(wrap => {
    if (!wrap) return;
    wrap.querySelector('.icon-play')?.classList.toggle('hidden', playing);
    wrap.querySelector('.icon-pause')?.classList.toggle('hidden', !playing);
  });
}

function isMobile() {
  return window.matchMedia('(max-width: 480px)').matches;
}

/* ── Mini bar waveform ──────────────────────────────────────── */
function buildMiniBarWaveform() {
  if (!miniBarWaveform) return;
  miniBarWaveform.innerHTML = '';
  const N = 32;
  for (let i = 0; i < N; i++) {
    const b = document.createElement('div');
    b.className = 'mini-bar-wf-bar';
    b.style.height = EQ_HEIGHTS[i % EQ_HEIGHTS.length] * 0.5 + 'px';
    b.style.animationDelay = (i * 0.02).toFixed(3) + 's';
    b.style.animationDuration = (0.4 + (i % 7) * 0.06).toFixed(2) + 's';
    miniBarWaveform.appendChild(b);
  }
}

function updateMiniBarWaveform(pct) {
  const bars = miniBarWaveform?.querySelectorAll('.mini-bar-wf-bar');
  if (!bars) return;
  const cutoff = Math.floor(bars.length * pct / 100);
  bars.forEach((b, i) => b.classList.toggle('played', i < cutoff));
}

function updateMiniBarState() {
  if (!playerMiniBar) return;
  if (S.playing) {
    playerMiniBar.classList.add('playing');
  } else {
    playerMiniBar.classList.remove('playing');
  }
  setPlayIcons(S.playing);
}

/* ── Expand / Collapse mobile player (Spotify-style) ─────────── */
function expandMobilePlayer() {
  if (!isMobile()) return;
  playerOverlay.classList.add('open');
  document.body.classList.add('player-mobile-open');
}

function collapseMobilePlayer() {
  playerOverlay.classList.remove('open');
  document.body.classList.remove('player-mobile-open');
}

/* Tap overlay background to collapse */
if (playerOverlay) {
  playerOverlay.addEventListener('click', e => {
    if (e.target === playerOverlay) collapseMobilePlayer();
  });
}

/* Swipe down to collapse */
(function initSwipeCollapse() {
  let startY = 0, startTime = 0;
  const el = document.getElementById('player-expanded-content');
  if (!el) return;

  el.addEventListener('touchstart', e => {
    startY = e.touches[0].clientY;
    startTime = Date.now();
  }, { passive: true });

  el.addEventListener('touchend', e => {
    const dy = e.changedTouches[0].clientY - startY;
    const dt = Date.now() - startTime;
    if (dy > 80 && dt < 400) {
      collapseMobilePlayer();
    }
  }, { passive: true });
})();

/* ── Waveform bars ─────────────────────────────────────────── */
// Набор "естественных" высот волны — воспроизводятся по кругу
const EQ_HEIGHTS = [3,5,8,12,16,20,24,20,14,18,26,22,16,10,14,20,28,24,18,12,
                    8,12,18,26,30,28,22,16,20,28,32,26,20,14,18,24,20,14,10,14,
                    20,16,12,8,6,10,14,18,12,8,5,3];

function buildWaveformProgress() {
  const barsEl = document.getElementById('wfp-bars');
  barsEl.innerHTML = '';
  const N = 52;
  for (let i = 0; i < N; i++) {
    const b = document.createElement('div');
    b.className = 'wfp-bar';
    b.style.height = EQ_HEIGHTS[i % EQ_HEIGHTS.length] + 'px';
    // Каждый бар получает свой сдвиг анимации — EQ выглядит живым
    b.style.animationDelay = (i * 0.018).toFixed(3) + 's';
    b.style.animationDuration = (0.4 + (i % 7) * 0.06).toFixed(2) + 's';
    barsEl.appendChild(b);
  }
}

function updateWaveformFill(pct) {
  const bars = document.querySelectorAll('.wfp-bar');
  const cutoff = Math.floor(bars.length * pct / 100);
  bars.forEach((b, i) => b.classList.toggle('played', i < cutoff));
  updateMiniBarWaveform(pct);
}

/* ── Episode load ─────────────────────────────────────────── */
function loadEpisode(id, realDistrictName) {
  const ep = EPISODES.find(e => e.id === id);
  if (!ep) return;

  // Stop current
  audioEl.pause();
  S.playing = false;
  clearSimTimer();

  S.episode = ep;
  S.simProgress = 0;

  const img = document.getElementById('player-photo-img');
  const fallback = document.getElementById('player-photo-fallback');
  fallback.textContent = ep.emoji;
  const photoUrl = findDistrictPhoto(realDistrictName || ep.district);

  const isMoscowFallback = photoUrl === MOSCOW_COAT;
  if (isMoscowFallback) {
    img.onload = () => { img.style.display = 'block'; fallback.style.display = 'none'; };
    img.onerror = () => { img.style.display = 'none'; fallback.style.display = 'flex'; };
    img.src = photoUrl;
  } else {
    const tmp = new Image();
    tmp.crossOrigin = 'anonymous';
    tmp.onload = () => {
      const c = document.createElement('canvas');
      c.width = tmp.naturalWidth;
      c.height = tmp.naturalHeight;
      const ctx = c.getContext('2d');
      ctx.drawImage(tmp, 0, 0);
      const id = ctx.getImageData(0, 0, c.width, c.height);
      const d = id.data;
      for (let i = 0; i < d.length; i += 4) {
        const r = d[i], g = d[i+1], b = d[i+2];
        if (r > 230 && g > 230 && b > 230) d[i+3] = 0;
      }
      ctx.putImageData(id, 0, 0);
      img.src = c.toDataURL('image/png');
      img.style.display = 'block';
      fallback.style.display = 'none';
    };
    tmp.onerror = () => { img.style.display = 'none'; fallback.style.display = 'flex'; };
    tmp.src = photoUrl;
  }

  // Card text — используем реальное название района из OSM
  const displayName = realDistrictName || ep.district;
  document.getElementById('player-card-title').textContent =
    displayName.toUpperCase();
  document.getElementById('player-card-date').textContent = ep.date;

  // Controls reset
  setPlayIcons(false);
  progressBar.value = 0;
  timeCur.textContent = '0:00';
  timeTot.textContent = '—:——';
  updateWaveformFill(0);
  playerCard.classList.remove('playing');

  // Show player UI
  playerCard.classList.add('visible');
  ctrlsBar.classList.add('visible');

  // Update mobile mini bar
  if (miniBarTitle) miniBarTitle.textContent = displayName.toUpperCase();
  if (playerMiniBar) {
    playerMiniBar.classList.add('visible');
    document.body.classList.add('has-mini-player');
  }
  updateMiniBarState();
  updateMiniBarWaveform(0);

  // Load audio
  Birds.stop();
  CityAmbience.stop();
  if (ep.audio === 'birds') {
    audioEl.src = '';
    timeTot.textContent = '∞';
  } else if (ep.audio) {
    audioEl.src = ep.audio;
    audioEl.volume = 0.8;
    audioEl.load();
  } else {
    audioEl.src = '';
    timeTot.textContent = '—:——';
  }

  // Map pan — only if coordinates are defined
  if (ep.lat != null && ep.lng != null) {
    map.panTo([ep.lat, ep.lng], { animate: true, duration: 0.5 });
  }

  // Stats
  S.minutes += 2;
  localStorage.setItem('minutes', S.minutes);
  document.getElementById('minutes-val').textContent = S.minutes;

  // Hint
  if (!S.hintDismissed) {
    document.getElementById('hint-pill').classList.remove('hidden');
  }
}

/* ── Audio element events ─────────────────────────────────── */
audioEl.addEventListener('loadedmetadata', () => {
  timeTot.textContent = fmt(audioEl.duration);
});

audioEl.addEventListener('timeupdate', () => {
  if (!audioEl.duration) return;
  const pct = (audioEl.currentTime / audioEl.duration) * 100;
  progressBar.value = pct;
  updateWaveformFill(pct);
  timeCur.textContent = fmt(audioEl.currentTime);
});

audioEl.addEventListener('ended', () => {
  S.playing = false;
  setPlayIcons(false);
  playerCard.classList.remove('playing');
  progressBar.value = 0;
  updateWaveformFill(0);
  timeCur.textContent = '0:00';
  updateMiniBarState();
});

audioEl.addEventListener('play',  () => {
  S.playing = true;
  setPlayIcons(true);
  playerCard.classList.add('playing');
  ctrlsBar.classList.add('playing');
  updateMiniBarState();
});

audioEl.addEventListener('pause', () => {
  S.playing = false;
  setPlayIcons(false);
  playerCard.classList.remove('playing');
  ctrlsBar.classList.remove('playing');
  updateMiniBarState();
});

/* ── Playback toggle ──────────────────────────────────────── */
function togglePlay() {
  if (!S.episode) return;

  if (S.episode.audio === 'birds') {
    if (Birds.isActive()) {
      Birds.stop();
      S.playing = false;
      setPlayIcons(false);
      playerCard.classList.remove('playing');
      ctrlsBar.classList.remove('playing');
    } else {
      Birds.setVolume(0.8);
      Birds.start();
      S.playing = true;
      setPlayIcons(true);
      playerCard.classList.add('playing');
      ctrlsBar.classList.add('playing');
      clearSimTimer();
      S.simProgress = 0;
      S.simTimer = setInterval(() => {
        S.simProgress = (S.simProgress + 0.05) % 100;
        progressBar.value = S.simProgress;
        updateWaveformFill(S.simProgress);
        timeCur.textContent = fmt(S.simProgress / 100 * 600);
      }, 300);
    }
    updateMiniBarState();
  } else if (S.episode.audio) {
    if (audioEl.paused) {
      audioEl.play().catch(() => runSim());
    } else {
      audioEl.pause();
    }
  } else {
    if (S.playing) {
      S.playing = false;
      clearSimTimer();
      CityAmbience.stop();
      setPlayIcons(false);
      playerCard.classList.remove('playing');
      ctrlsBar.classList.remove('playing');
    } else {
      S.playing = true;
      setPlayIcons(true);
      playerCard.classList.add('playing');
      ctrlsBar.classList.add('playing');
      CityAmbience.setVolume(0.8);
      CityAmbience.start();
      runSim();
    }
    updateMiniBarState();
  }
}

function runSim() {
  clearSimTimer();
  S.simTimer = setInterval(() => {
    if (!S.playing) return;
    S.simProgress = Math.min(S.simProgress + 100 / 250, 100);
    progressBar.value = S.simProgress;
    updateWaveformFill(S.simProgress);
    timeCur.textContent = fmt(250 * S.simProgress / 100);
    if (S.simProgress >= 100) {
      clearSimTimer();
      CityAmbience.stop();
      S.playing = false;
      setPlayIcons(false);
      playerCard.classList.remove('playing');
      ctrlsBar.classList.remove('playing');
      updateMiniBarState();
    }
  }, 1000);
}

function clearSimTimer() {
  if (S.simTimer) { clearInterval(S.simTimer); S.simTimer = null; }
}

/* ── Seek ─────────────────────────────────────────────────── */
progressBar.addEventListener('input', e => {
  const pct = parseFloat(e.target.value);
  if (audioEl.src && audioEl.duration) {
    audioEl.currentTime = audioEl.duration * pct / 100;
  } else {
    S.simProgress = pct;
    timeCur.textContent = fmt(250 * pct / 100);
  }
  updateWaveformFill(pct);
});

function seekRel(sec) {
  if (audioEl.src && audioEl.duration) {
    audioEl.currentTime = Math.max(0, Math.min(audioEl.duration, audioEl.currentTime + sec));
  } else {
    S.simProgress = Math.max(0, Math.min(100, S.simProgress + sec / 2.5));
    progressBar.value = S.simProgress;
    updateWaveformFill(S.simProgress);
    timeCur.textContent = fmt(250 * S.simProgress / 100);
  }
}

function setVolume(v) {
  audioEl.volume = parseFloat(v);
  if (Birds.isActive()) Birds.setVolume(v);
  if (CityAmbience.isActive()) CityAmbience.setVolume(v);
}

function fmt(sec) {
  sec = Math.floor(sec);
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
}

/* ── Panels (profile / settings) ─────────────────────────── */
function togglePanel(name) {
  const panel = document.getElementById('panel-' + name);
  const btn   = document.getElementById('btn-' + name);
  const other = name === 'profile' ? 'settings' : 'profile';
  const otherPanel = document.getElementById('panel-' + other);
  const otherBtn   = document.getElementById('btn-' + other);

  const isOpen = panel.classList.contains('open');
  // Close both first
  otherPanel.classList.remove('open');
  otherBtn.classList.remove('active');

  if (isOpen) {
    panel.classList.remove('open');
    btn.classList.remove('active');
  } else {
    panel.classList.add('open');
    btn.classList.add('active');
    closeDistricts();
  }
}

/* ── Districts dropdown ───────────────────────────────────── */
function toggleDistricts() {
  S.distOpen = !S.distOpen;
  const pill     = document.getElementById('districts-pill');
  const dropdown = document.getElementById('districts-dropdown');
  pill.classList.toggle('open', S.distOpen);
  dropdown.classList.toggle('open', S.distOpen);
  if (S.distOpen) {
    // Close panels
    document.getElementById('panel-profile').classList.remove('open');
    document.getElementById('panel-settings').classList.remove('open');
    document.getElementById('btn-profile').classList.remove('active');
    document.getElementById('btn-settings').classList.remove('active');
  }
}

function closeDistricts() {
  S.distOpen = false;
  document.getElementById('districts-pill').classList.remove('open');
  document.getElementById('districts-dropdown').classList.remove('open');
}

function buildDistrictsList() {
  const container = document.getElementById('districts-list-inner');
  container.innerHTML = '';
  DISTRICTS.forEach(group => {
    const header = document.createElement('p');
    header.className = 'okrug-header';
    header.textContent = `${group.okrugFull} (${group.okrug}):`;
    container.appendChild(header);

    group.districts.forEach(name => {
      const div = document.createElement('div');
      div.className = 'rayon-item';
      div.textContent = name;
      div.addEventListener('click', () => {
        closeDistricts();
        highlightDistrictByName(name);
      });
      container.appendChild(div);
    });
  });
}

/* ── Hint ─────────────────────────────────────────────────── */
function dismissHint() {
  document.getElementById('hint-pill').classList.add('hidden');
  S.hintDismissed = true;
  localStorage.setItem('hintDone', '1');
}

// Show hint by default if not dismissed
if (S.hintDismissed) {
  document.getElementById('hint-pill').classList.add('hidden');
}
if (isMobile()) {
  const hintSpan = document.querySelector('#hint-pill span');
  if (hintSpan) hintSpan.textContent = 'перемещайте карту и нажмите на нужный район, либо выберите через список';
}

/* ── Settings ─────────────────────────────────────────────── */
function openFeedback() {
  window.open('mailto:hello@gorodgovorit.ru?subject=Обратная+связь', '_blank');
}
function uploadAudio() { alert('Функция загрузки звуков появится в следующей версии.'); }
function uploadConvo() { alert('Функция загрузки разговора появится в следующей версии.'); }

/* ── Settings waveform ─────────────────────────────────────── */
// Натуральные высоты баров (огибающая по синусу)
const WAVE_HEIGHTS = Array.from({ length: 36 }, (_, i) => {
  const pos = i / 35;
  const env = Math.sin(pos * Math.PI) * 0.65 + 0.35;
  return Math.max(4, Math.round(env * (0.3 + Math.random() * 0.7) * 100));
});

function buildWave() {
  const bars = document.getElementById('wave-bars');
  if (!bars) return;
  bars.innerHTML = '';
  WAVE_HEIGHTS.forEach((h, i) => {
    const b = document.createElement('div');
    b.className = 'wave-bar';
    b.style.setProperty('--base-h', h + '%');
    b.style.setProperty('--dur', (0.35 + Math.random() * 0.7) + 's');
    b.style.animationDelay = (Math.random() * 0.4) + 's';
    bars.appendChild(b);
  });
  // Init: применяем текущее значение слайдера
  const slider = document.getElementById('wave-slider');
  if (slider) {
    const val = parseFloat(slider.value);
    applyWaveVolume(val);
    setVolume(val / 100);
  }
}

function applyWaveVolume(val) {
  // val: 0–100
  const amp = val / 100; // 0..1
  document.querySelectorAll('.wave-bar').forEach((b, i) => {
    if (amp < 0.01) {
      // Flat line
      b.style.height = '2px';
      b.style.animationPlayState = 'paused';
    } else {
      const base = WAVE_HEIGHTS[i] || 50;
      const h = Math.max(2, base * amp);
      b.style.height = h + '%';
      b.style.animationPlayState = 'running';
      // Speed up at high values
      const speed = 0.3 + amp * 0.7;
      b.style.animationDuration = ((0.35 + (1 - amp) * 0.65)) + 's';
    }
  });
}

// Слайдер в настройках: управляет и визуальной волной, и громкостью плеера
document.getElementById('wave-slider')?.addEventListener('input', e => {
  const val = parseFloat(e.target.value);
  applyWaveVolume(val);
  // Конвертируем 0-100 → 0.0-1.0 для аудио
  setVolume(val / 100);
});

/* ── Close panels on map click ───────────────────────────── */
document.getElementById('map').addEventListener('click', () => {
  document.getElementById('panel-profile').classList.remove('open');
  document.getElementById('panel-settings').classList.remove('open');
  document.getElementById('btn-profile').classList.remove('active');
  document.getElementById('btn-settings').classList.remove('active');
  closeDistricts();
  if (isMobile()) collapseMobilePlayer();
});

/* ── Init ─────────────────────────────────────────────────── */
document.getElementById('minutes-val').textContent = S.minutes;
buildDistrictsList();
buildWave();
buildWaveformProgress();
buildMiniBarWaveform();

window.addEventListener('load', () => {
  setTimeout(() => map.invalidateSize(), 200);
});
window.addEventListener('resize', () => map.invalidateSize());
