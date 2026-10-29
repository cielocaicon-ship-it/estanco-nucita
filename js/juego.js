/* Estanco Nucita — lógica del juego (canvas + JavaScript, sin librerías) */
/* =========================================================
   VARIABLES DE COLOR (juego)
   ========================================================= */
const C = {
  piso:['#ecdcbc','#e2cfa9'], junta:'#b9a07a',
  pared:'#bfe3cf', zocalo:'#2f7a5a', letrero:'#1f5c43', letreroBorde:'#ffd54a', letreroTexto:'#fff4c2',
  mesa:'#d8342f', mesaClara:'#ff7a68', mesaOscura:'#9c1f1c',
  silla:'#f3f2ee', sillaOscura:'#c7c5bc',
  pamPelo:'#f1c94a', pamPeloLuz:'#ffe88f', pamPeloSombra:'#c99a22', pamPiel:'#f2cba8', pamPielSombra:'#dcae88',
  pamMejilla:'rgba(240,120,130,.55)', pamLabios:'#e0566e', pamBlusa:'#1fa89a', pamBlusaLuz:'#4fd0c1', pamJean:'#3c5a9c', pamTenis:'#ffffff',
  balde:'#b9c2ca', baldeLuz:'#e3e8ec', botella:'#9a5a12', tapa:'#f2c14e', dorado:'#ffd54a',
  maxiPelo:'#f4d3a6', maxiLuz:'#fdebd0', maxiSombra:'#d9a874', maxiOreja:'#e2a368', maxiOrejaSombra:'#c4834d',
  maxiOjo:'#5b2c12', maxiPupila:'#2a1206', maxiNariz:'#2a1a16', maxiLengua:'#f37c8e', maxiBoca:'#5a1e22', maxiCollar:'#1db7b3',
  globo:'#ffffff', globoBorde:'#3d1f08', pacBien:'#3ec46d', pacMedio:'#f2c230', pacMal:'#e84040'
};
const MESA_NORMAL = {mesa:C.mesa, mesaClara:C.mesaClara, mesaOscura:C.mesaOscura, silla:C.silla, sillaOscura:C.sillaOscura};
const MESA_ELITE  = {mesa:'#1a1a22', mesaClara:'#4a4a5c', mesaOscura:'#c9a227', silla:'#8a1c3c', sillaOscura:'#5e1028'};
const FONT = '"Press Start 2P", ui-monospace, monospace';
const EMOJI = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';

/* =========================================================
   DATOS: productos, clientes, mesas
   ========================================================= */
const PRODUCTS = [
  {e:'🍺', n:'Rubia',     p:4000,  c:2200},   // p = precio de venta, c = lo que cuesta en la distribuidora
  {e:'🍻', n:'Michelada', p:7000,  c:3500},
  {e:'🍋', n:'Limón',     p:1000,  c:400},
  {e:'🥜', n:'Maní',      p:2000,  c:1000},
  {e:'🍟', n:'Papitas',   p:3000,  c:1600},
  {e:'📦', n:'Six-pack',  p:20000, c:12000}
];

/* =========================================================
   MERCANCÍA, PLATA, DÍAS Y META (se guardan en el navegador)
   ========================================================= */
const STOCK_INICIAL = [6, 6, 6, 6, 6, 6];                 // día 1: 6 de cada cosa
const PLATA_INICIAL = 15000;
const ARRIENDO = 8000;                                    // arriendo del local por día
const metaDia = () => Math.min(24, 8 + 2*(dia - 1));      // pedidos a vender cada día
const bonoMeta = () => 10000 + 3000*dia;
const SAVE_KEY = 'estanco-nucita-progreso';
/* =========================================================
   MESERO CONTRATADO (Juancho): atiende solo las mesas normales, despacio
   ========================================================= */
const MESERO_DIA = 5;                                        // desde qué día se puede contratar
const MESERO_CONTRATO = 40000;                               // lo que cuesta contratarlo
const sueldoMesero = n => 10000 + 4000*(n - 1);              // sueldo diario según su nivel
const capacitarCosto = n => 25000*n;                         // subir de nivel n a n+1
const capacitarDia = n => MESERO_DIA + 2*n;                  // día mínimo para subir al nivel n+1
const mesero = {contratado:false, nivel:1, x:700, y:320, path:[], job:null, serveT:0, facing:-1, moving:false, walkT:0, at:null};
let stock = STOCK_INICIAL.slice(), plata = PLATA_INICIAL, dia = 1, endReason = '', cart = [0,0,0,0,0,0];
const totalStock = () => stock.reduce((a,b) => a+b, 0);
const minCost = Math.min(...PRODUCTS.map(p => p.c));
/* =========================================================
   JUGADORES: cada persona tiene su propia partida guardada
   ========================================================= */
const PERFILES_KEY = 'estanco-jugadores';
let perfiles = {activo:null, lista:[]};
function savePerfiles(){ try { localStorage.setItem(PERFILES_KEY, JSON.stringify(perfiles)); } catch(e){} }
function loadPerfiles(){
  try { const d = JSON.parse(localStorage.getItem(PERFILES_KEY)); if (d && Array.isArray(d.lista)) perfiles = d; } catch(e){}
  if (!perfiles.lista.length){   // pasar la partida vieja (de antes de los jugadores) a "Jugador 1"
    try { const old = localStorage.getItem(SAVE_KEY); if (old){ perfiles = {activo:'j1', lista:[{id:'j1', nombre:'Jugador 1'}]}; localStorage.setItem(SAVE_KEY + ':j1', old); savePerfiles(); } } catch(e){}
  }
  if (!perfiles.lista.some(j => j.id === perfiles.activo)) perfiles.activo = perfiles.lista.length ? perfiles.lista[0].id : null;
}
const jugadorActual = () => perfiles.lista.find(j => j.id === perfiles.activo) || null;
const saveKey = () => SAVE_KEY + ':' + perfiles.activo;
/* =========================================================
   HISTORIAL: cuándo y cuánto juega cada jugador (se guarda en este navegador)
   ========================================================= */
const histKey = id => SAVE_KEY + ':' + id + ':hist';
function leerHist(id){
  try { const h = JSON.parse(localStorage.getItem(histKey(id))); if (h && Array.isArray(h.dias)) return h; } catch(e){}
  return {sesiones:0, tiempo:0, primera:null, ultima:null, dias:[]};
}
function guardarHist(id, h){ try { localStorage.setItem(histKey(id), JSON.stringify(h)); } catch(e){} }
let tJuego = 0, tDia = 0, elitesDia = 0;           // segundos jugados sin guardar aún y duración del día actual
function sumarTiempo(){
  if (!perfiles.activo || tJuego < 1) return;
  const h = leerHist(perfiles.activo); h.tiempo += Math.round(tJuego); h.ultima = Date.now(); tJuego = 0; guardarHist(perfiles.activo, h);
}
function marcarSesion(){
  if (!perfiles.activo) return;
  const h = leerHist(perfiles.activo); h.sesiones++; h.ultima = Date.now(); if (!h.primera) h.primera = h.ultima; guardarHist(perfiles.activo, h);
}
function registrarDia(d){
  if (!perfiles.activo) return;
  sumarTiempo();
  const h = leerHist(perfiles.activo); h.dias.unshift(d); h.dias = h.dias.slice(0, 60); h.ultima = Date.now(); guardarHist(perfiles.activo, h);
}
const fechaCorta = ms => new Date(ms).toLocaleString('es-CO', {weekday:'short', day:'numeric', month:'short', hour:'numeric', minute:'2-digit'});
function duracion(seg){
  seg = Math.round(seg); const h = Math.floor(seg/3600), m = Math.floor(seg%3600/60), s2 = seg%60;
  return h ? h + ' h ' + m + ' min' : m ? m + ' min ' + s2 + ' s' : s2 + ' s';
}
function hace(ms){
  const m = Math.round((Date.now() - ms)/60000);
  if (m < 1) return 'hace un momento'; if (m < 60) return 'hace ' + m + ' min';
  const h = Math.round(m/60); if (h < 24) return 'hace ' + h + ' h';
  const d = Math.round(h/24); return d === 1 ? 'ayer' : 'hace ' + d + ' días';
}
function openHist(){
  const j = jugadorActual(); if (!j) return;
  sumarTiempo();
  const h = leerHist(j.id), dias = h.dias;
  const mejor = dias.reduce((a,d) => d.vendido > (a ? a.vendido : -1) ? d : a, null);
  const totalVendido = dias.reduce((a,d) => a + d.vendido, 0), totalPedidos = dias.reduce((a,d) => a + d.pedidos, 0);
  const metas = dias.filter(d => d.cumplio).length;
  $('t-hist').textContent = '📊 Historial de ' + j.nombre;
  let html = '<div class="hist-res">' +
    '<div>Veces que jugó<b>' + h.sesiones + '</b></div>' +
    '<div>Tiempo jugando<b>' + duracion(h.tiempo) + '</b></div>' +
    '<div>Días cerrados<b>' + dias.length + '</b></div>' +
    '<div>Metas cumplidas<b>' + metas + '</b></div>' +
    '<div>Total vendido<b>' + fmt(totalVendido) + '</b></div>' +
    '<div>Pedidos atendidos<b>' + totalPedidos + '</b></div>' +
    '<div>Mejor día<b>' + (mejor ? 'Día ' + mejor.dia + ' · ' + fmt(mejor.vendido) : '—') + '</b></div>' +
    '<div>Última vez<b>' + (h.ultima ? hace(h.ultima) : '—') + '</b></div>' +
    '</div>';
  if (h.primera) html += '<p class="sub">Empezó a jugar el ' + fechaCorta(h.primera) + '</p>';
  if (!dias.length) html += '<p class="hist-vacio">Todavía no ha cerrado ningún día. Cuando termine uno, aparece aquí.</p>';
  else html += '<table class="hist-tabla"><thead><tr><th>Cuándo</th><th>Día</th><th>Vendió</th><th>Pedidos</th><th>Duró</th><th>⭐</th></tr></thead><tbody>' +
    dias.slice(0, 15).map(d => '<tr><td>' + fechaCorta(d.fecha) + '</td><td>' + d.dia + (d.evento ? ' ' + d.evento : '') + '</td><td>' + fmt(d.vendido) +
      '</td><td>' + d.pedidos + '/' + d.meta + (d.cumplio ? ' 🎯' : '') + '</td><td>' + duracion(d.duracion) + '</td><td>' + (d.estrellas || '—') + '</td></tr>').join('') + '</tbody></table>';
  $('hist-cont').innerHTML = html;
  $('inicio').hidden = true; $('hist').hidden = false; $('btn-cerrar-hist').focus();
}
function closeHist(){ $('hist').hidden = true; $('inicio').hidden = false; $('btn-hist').focus(); }

/* =========================================================
   ESTRELLAS DEL ESTANCO (reputación de 0 a 100 → 1 a 5 estrellas)
   ========================================================= */
const REP_INICIAL = 30;
let rep = REP_INICIAL, repDia = REP_INICIAL;
const estrellasDe = r => Math.max(1, Math.min(5, 1 + Math.floor(r / 20)));
const estrellas = () => estrellasDe(rep);
const textoEstrellas = n => '⭐'.repeat(n) + '☆'.repeat(5 - n);
const llegadaPorEstrellas = () => [1.3, 1.12, 1, .88, .76][estrellas() - 1];   // menos tiempo = llega más gente
const pagoPorEstrellas = () => 1 + .05*(estrellas() - 3);
function cambiarRep(d, x, y){
  const antes = estrellas();
  rep = Math.max(0, Math.min(100, rep + d));
  const ahora = estrellas();
  if (ahora !== antes){
    if (ahora > antes){ SFX.meta(); addFloat('⭐ ¡El estanco subió a ' + ahora + ' estrellas!', W/2, H/2-100, '#ffe066', true); }
    else { SFX.mal(); addFloat('El estanco bajó a ' + ahora + ' estrella' + (ahora === 1 ? '' : 's'), W/2, H/2-100, '#ffb3b3', true); }
    announce('El estanco ahora tiene ' + ahora + ' estrellas');
  } else if (x !== undefined && d){
    addFloat((d > 0 ? '+' : '') + '⭐', x, y, d > 0 ? '#ffe066' : '#ff9a9a');
  }
  updateHUD();
}
function drawEstrellasLetrero(){
  if (elite.bar) return;
  const n = estrellas(); ctx.font = '13px ' + EMOJI; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  fillRR(300, 52, 120, 18, 9, 'rgba(31,92,67,.95)');
  for (let i=0;i<5;i++){ ctx.globalAlpha = i < n ? 1 : .3; ctx.fillText('⭐', 324 + i*18, 61.5); }
  ctx.globalAlpha = 1; ctx.textBaseline = 'alphabetic';
}

function leerPartida(id){ try { return JSON.parse(localStorage.getItem(SAVE_KEY + ':' + id)) || {}; } catch(e){ return {}; } }
function loadSave(){
  stock = STOCK_INICIAL.slice(); plata = PLATA_INICIAL; dia = 1; rep = REP_INICIAL; mesero.contratado = false; mesero.nivel = 1;
  if (!perfiles.activo) return;
  try {
    const d = JSON.parse(localStorage.getItem(saveKey()));
    if (d && Array.isArray(d.stock) && d.stock.length === 6){ stock = d.stock.map(n => Math.max(0, n|0)); plata = d.plata|0; dia = Math.max(1, d.dia|0);
      rep = typeof d.rep === 'number' ? Math.max(0, Math.min(100, d.rep)) : REP_INICIAL;
      mesero.contratado = !!(d.mesero && d.mesero.contratado); mesero.nivel = d.mesero ? Math.min(5, Math.max(1, d.mesero.nivel|0)) : 1; }
  } catch(e){}
}
function save(){ if (!perfiles.activo) return; try { localStorage.setItem(saveKey(), JSON.stringify({plata, stock, dia, rep, mesero:{contratado:mesero.contratado, nivel:mesero.nivel}})); } catch(e){} }
function resetAll(){ stock = STOCK_INICIAL.slice(); plata = PLATA_INICIAL; dia = 1; rep = REP_INICIAL; mesero.contratado = false; mesero.nivel = 1; save(); }
loadPerfiles(); loadSave();

/* =========================================================
   MODO ÉLITE: ingredientes y cocteles (se ponen EN ORDEN)
   ========================================================= */
const INGREDIENTES = [
  {e:'🧊', n:'Hielo'}, {e:'🍋', n:'Limón'}, {e:'🌿', n:'Hierbabuena'},
  {e:'🍍', n:'Piña'},  {e:'🥃', n:'Licor'}, {e:'🍒', n:'Cereza'}
];
const COCTELES = [
  {n:'Mojito',       e:'🍹', r:[2,1,4,0],  p:22000},
  {n:'Margarita',    e:'🍸', r:[1,4,0],    p:18000},
  {n:'Piña colada',  e:'🍹', r:[3,4,0,5],  p:24000},
  {n:'Cosmopolitan', e:'🍸', r:[5,1,4,0],  p:24000},
  {n:'Daiquiri',     e:'🍸', r:[1,4,0,5],  p:22000},
  {n:'Nucita Sour',  e:'🥂', r:[1,5,4,2,0],p:30000}
];
const PIELES  = ['#f6d6c0','#ecbd95','#d29a6c','#b07a4f','#8a5a37','#5e3a22'];
const CAMISAS = ['#4a7bd9','#f08a3c','#9b59d0','#26a69a','#ef5f8f','#f2c230','#5c6bc0','#e0e0e0','#2f2f3a'];
const PELOS   = ['#1d120c','#3b2416','#6b4226','#a5662f','#e0b25c','#262626'];

const W = 720, H = 580;        // tamaño lógico del canvas
const HY = 320;                 // pasillo horizontal (entre las dos filas)
const COLS = [170, 380, 590];   // centro de cada columna de mesas
const ROWS = [215, 475];        // centro de cada fila de mesas
const AISLE = [65, 275, 485];   // pasillo vertical a la izquierda de cada columna
const TECLAS = ['q','w','e','a','s','d'];

/* =========================================================
   QUEJAS DE LOS CLIENTES (sin groserías)
   ========================================================= */
const IMPACIENTE = ['¿Pa\' hoy o pa\' mañana?', 'Ay no, qué demora…', '¿Y mi cerveza qué, pues?', 'Hágale, que tengo sed',
  'Nahh, esto se demora mucho', '¿Será que me atienden?', 'Uy, ¿se le olvidó mi mesa?'];
const BRAVO = ['Nahh, ese estanco muy mala atención', 'Me voy pa\' la tienda de enseguida', 'Qué servicio tan lento, me fui',
  'Nunca más vuelvo, muy regular', 'Ahí le dejo, se demoró mucho', 'Nahh, qué pereza este estanco'];
const EQUIVOCADO = ['Eso no fue lo que pedí', 'Nahh, eso no es', 'Ush, ¿sí me escuchó?', 'Mona, eso no lo pedí'];
const BRAVO_ELITE = ['Nahh, qué atención tan regular para un VIP', 'Esperaba más de este lounge', 'Me voy pa\' otro bar'];
function say(s, list){ s.say = {txt: pick(list), t: 2.4}; SFX.queja(); announce(s.say.txt); }

const tables = [];
ROWS.forEach((cy, r) => COLS.forEach((cx, c) => {
  const i = r*3 + c;
  tables.push({id:i, key:TECLAS[i], cx, cy, spotX:AISLE[c], spotY:cy, student:null, cooldown:0});
}));

/* =========================================================
   ESTADO
   ========================================================= */
const cv = document.getElementById('game');
const ctx = cv.getContext('2d');
let scale = 1, state = 'start', time = 0;
let money = 0, orders = 0, level = 1, hearts = 5, spawnTimer = 1, overT = -1;
let floats = [];
const pamela = {x:360, y:HY, path:[], target:null, at:null, facing:1, moving:false, walkT:0, trail:[], slipT:0, immuneT:0};
const maxi = {x:316, y:HY, facing:1, moving:false, walkT:0, petT:0, barkT:0};
const FOLLOW = 44;
let spills = [], spillTimer = 8;
const HOME = {x:690, y:HY};
const tono = {x:HOME.x, y:HOME.y, path:[], queue:[], job:null, cleanT:0, facing:-1, moving:false, walkT:0};

/* =========================================================
   UTILIDADES
   ========================================================= */
const rand = (a,b) => a + Math.random()*(b-a);
const randInt = (a,b) => Math.floor(rand(a, b+1));
const pick = arr => arr[Math.floor(Math.random()*arr.length)];
const shuffle = arr => { for (let i=arr.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [arr[i],arr[j]]=[arr[j],arr[i]]; } return arr; };
const fmt = n => (n < 0 ? '-$' : '$') + Math.abs(Math.round(n)).toLocaleString('es-CO');

function rr(x,y,w,h,r, g=ctx){ r=Math.min(r,w/2,h/2); g.beginPath(); g.moveTo(x+r,y); g.arcTo(x+w,y,x+w,y+h,r); g.arcTo(x+w,y+h,x,y+h,r); g.arcTo(x,y+h,x,y,r); g.arcTo(x,y,x+w,y,r); g.closePath(); }
function circ(x,y,r,fill){ ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fillStyle=fill; ctx.fill(); }
function ell(x,y,rx,ry,fill,rot=0){ ctx.beginPath(); ctx.ellipse(x,y,rx,ry,rot,0,Math.PI*2); ctx.fillStyle=fill; ctx.fill(); }
function fillRR(x,y,w,h,r,fill){ rr(x,y,w,h,r); ctx.fillStyle=fill; ctx.fill(); }

/* =========================================================
   SONIDO (WebAudio)
   ========================================================= */
let actx = null, muted = false;
function audio(){
  if (!actx){ const A = window.AudioContext || window.webkitAudioContext; if (A) actx = new A(); }
  if (actx && actx.state === 'suspended') actx.resume();
  return actx;
}
function tone(f, d, type='square', v=0.07, delay=0, slide=0){
  if (muted) return; const a = audio(); if (!a) return;
  const t = a.currentTime + delay, o = a.createOscillator(), g = a.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, f+slide), t+d);
  g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t+d);
  o.connect(g).connect(a.destination); o.start(t); o.stop(t+d+0.03);
}
const SFX = {
  ok:    () => { tone(660,.07); tone(990,.09,'square',.06,.06); },
  mal:   () => tone(170,.25,'sawtooth',.08,0,-70),
  nada:  () => tone(240,.09,'square',.04),
  plata: () => [784,988,1175,1568].forEach((f,i)=>tone(f,.09,'square',.055,i*.06)),
  bravo: () => { tone(320,.4,'sawtooth',.08,0,-200); tone(200,.3,'square',.05,.15,-80); },
  guau:  () => { tone(560,.07,'square',.08,0,-240); tone(500,.09,'square',.08,.12,-260); },
  mimo:  () => { tone(880,.12,'sine',.08); tone(1320,.16,'sine',.06,.1); },
  llama: () => tone(1046,.12,'triangle',.06),
  nivel: () => [523,659,784,1046,1318].forEach((f,i)=>tone(f,.12,'square',.055,i*.08)),
  resbalon: () => tone(520,.35,'sine',.08,0,-380),
  regar: () => { tone(320,.12,'triangle',.05,0,-150); tone(260,.12,'triangle',.04,.08,-120); },
  yavoy: () => tone(700,.08,'triangle',.06),
  limpio: () => [1200,1600,2100].forEach((f,i)=>tone(f,.07,'sine',.05,i*.05)),
  queja: () => { tone(150,.18,'sawtooth',.05,0,-40); tone(120,.2,'sawtooth',.05,.16,-30); },
  vip:   () => [523,659,784,1046,1318,1568].forEach((f,i)=>tone(f,.18,'sine',.06,i*.07)),
  meta:  () => [659,784,988,1318].forEach((f,i)=>tone(f,.14,'triangle',.07,i*.1)),
  gol:   () => [392,523,659,784,1046].forEach((f,i)=>tone(f,.16,'square',.06,i*.08)),
  apagon:() => { tone(300,.5,'sawtooth',.06,0,-260); },
  agita: () => { tone(900+Math.random()*300,.05,'square',.03); tone(200,.06,'triangle',.04); },
  fin:   () => [523,440,349,262].forEach((f,i)=>tone(f,.28,'triangle',.08,i*.2))
};

/* =========================================================
   FONDO (se pinta una vez): baldosas, pared y letrero
   ========================================================= */
const bg = document.createElement('canvas'); bg.width = W*2; bg.height = H*2;
function buildBg(){
  const g = bg.getContext('2d'); g.setTransform(2,0,0,2,0,0);
  // baldosa cuadrada de estanco
  g.fillStyle = C.junta; g.fillRect(0,0,W,H);
  const T = 40;
  for (let y=66; y<H; y+=T){ for (let x=0; x<W; x+=T){
    g.fillStyle = C.piso[((x/T|0)+(y/T|0))%2]; g.fillRect(x+1.5,y+1.5,T-3,T-3);
    g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(x+4,y+4,T-14,4);
  }}
  const lg = g.createLinearGradient(0,70,0,H); lg.addColorStop(0,'rgba(0,0,0,.16)'); lg.addColorStop(.4,'rgba(255,255,255,.03)'); lg.addColorStop(1,'rgba(0,0,0,.1)');
  g.fillStyle = lg; g.fillRect(0,70,W,H-70);
  // pared
  g.fillStyle = C.pared; g.fillRect(0,0,W,66);
  g.fillStyle = C.zocalo; g.fillRect(0,64,W,7);
  const sh = g.createLinearGradient(0,71,0,90); sh.addColorStop(0,'rgba(0,0,0,.25)'); sh.addColorStop(1,'rgba(0,0,0,0)');
  g.fillStyle = sh; g.fillRect(0,71,W,19);
  // bombillitos
  for (let x=14; x<W; x+=26){ g.fillStyle = ['#ff8fb1','#ffd166','#8fe3cf','#b8a1ff'][(x/26|0)%4]; g.beginPath(); g.arc(x,8+Math.sin(x)*2,3.5,0,Math.PI*2); g.fill(); }
  // nevera con botellas
  g.fillStyle='#e9eef2'; rr(22,10,120,56,6,g); g.fill();
  g.fillStyle='#9fd6ee'; rr(28,15,108,44,4,g); g.fill();
  for (let r=0;r<2;r++){ g.fillStyle='rgba(255,255,255,.6)'; g.fillRect(28,36+r*22-1,108,2);
    for (let i=0;i<9;i++){ const bx=33+i*11.5, by=19+r*22; g.fillStyle=C.botella; rr(bx,by+5,7,12,2,g); g.fill(); g.fillRect(bx+2,by,3,6); g.fillStyle=C.tapa; g.fillRect(bx+2,by-1,3,2); g.fillStyle='#fff4c2'; g.fillRect(bx+1,by+9,5,4); } }
  g.fillStyle='rgba(255,255,255,.35)'; g.beginPath(); g.moveTo(34,15); g.lineTo(52,15); g.lineTo(38,59); g.lineTo(28,59); g.closePath(); g.fill();
  // tablero de precios
  g.fillStyle='#2a2a2a'; rr(552,14,92,44,6,g); g.fill();
  g.fillStyle='#fff4c2'; g.font='7px '+FONT; g.textAlign='left';
  ['Fría','Michelada','Mecato'].forEach((t,i)=>g.fillText(t,560,28+i*11));
  // aviso +18
  g.fillStyle='#fff'; g.beginPath(); g.arc(676,36,19,0,Math.PI*2); g.fill();
  g.strokeStyle='#d8342f'; g.lineWidth=4; g.stroke();
  g.fillStyle='#d8342f'; g.font='10px '+FONT; g.textAlign='center'; g.textBaseline='middle'; g.fillText('+18',677,37);
  // canasta de envases
  g.fillStyle='rgba(0,0,0,.2)'; g.beginPath(); g.ellipse(150,572,34,6,0,0,Math.PI*2); g.fill();
  g.fillStyle='#f2b705'; rr(118,532,64,38,4,g); g.fill();
  g.fillStyle='#c48f00'; for(let i=0;i<4;i++) g.fillRect(122+i*15,546,10,18);
  for(let i=0;i<4;i++){ g.fillStyle=C.botella; g.fillRect(124+i*15,520,6,16); g.fillRect(125.5+i*15,514,3,7); g.fillStyle=C.tapa; g.fillRect(125.5+i*15,513,3,2); }
  // nevera de icopor
  g.fillStyle='rgba(0,0,0,.2)'; g.beginPath(); g.ellipse(330,574,32,6,0,0,Math.PI*2); g.fill();
  g.fillStyle='#f4f4f0'; rr(300,540,60,32,5,g); g.fill();
  g.fillStyle='#2f7ad8'; rr(297,534,66,10,4,g); g.fill();
  g.fillStyle='#d8e6f5'; g.fillRect(306,552,48,3); g.fillRect(306,560,48,3);
  // botellas y tapas regadas
  g.fillStyle=C.tapa; [[230,560],[248,548],[452,566],[520,552]].forEach(([x,y])=>{g.beginPath();g.arc(x,y,2.6,0,Math.PI*2);g.fill();});
  // letrero
  g.fillStyle = C.letreroBorde; rr(196,10,328,46,10,g); g.fill();
  g.fillStyle = C.letrero; rr(200,14,320,38,8,g); g.fill();
  g.fillStyle = C.letreroTexto; g.font = '14px '+FONT; g.textAlign='center'; g.textBaseline='middle';
  g.fillText('Estanco Nucita', 360, 34);
  g.textBaseline = 'alphabetic';
}
buildBg();
/* fondo del lounge élite */
const bgElite = document.createElement('canvas'); bgElite.width = W*2; bgElite.height = H*2;
function buildBgElite(){
  const g = bgElite.getContext('2d'); g.setTransform(2,0,0,2,0,0);
  const T = 40;
  for (let y=66; y<H; y+=T){ for (let x=0; x<W; x+=T){
    g.fillStyle = ((x/T|0)+(y/T|0))%2 ? '#24112f' : '#170a20'; g.fillRect(x,y,T,T);
  }}
  g.strokeStyle = 'rgba(212,167,44,.35)'; g.lineWidth = 1;
  for (let y=66; y<H; y+=T){ g.beginPath(); g.moveTo(0,y); g.lineTo(W,y); g.stroke(); }
  for (let x=0; x<W; x+=T){ g.beginPath(); g.moveTo(x,66); g.lineTo(x,H); g.stroke(); }
  // alfombra roja por el pasillo
  g.fillStyle = '#8a1c3c'; g.fillRect(0, HY-16, W, 32);
  g.fillStyle = '#d4a72c'; g.fillRect(0, HY-17, W, 2); g.fillRect(0, HY+15, W, 2);
  // pared oscura con dorados
  g.fillStyle = '#0f0616'; g.fillRect(0,0,W,66);
  g.fillStyle = '#d4a72c'; g.fillRect(0,62,W,4);
  for (let x=20; x<W; x+=60){ g.fillStyle='rgba(212,167,44,.25)'; g.fillRect(x,8,2,50); }
  // lámparas de araña
  [[110,0],[610,0]].forEach(([x])=>{
    g.strokeStyle='#d4a72c'; g.lineWidth=1.5; g.beginPath(); g.moveTo(x,0); g.lineTo(x,14); g.stroke();
    g.fillStyle='#d4a72c'; g.beginPath(); g.ellipse(x,20,20,6,0,0,Math.PI*2); g.fill();
    for (let i=-2;i<=2;i++){ g.fillStyle='#fff3c4'; g.beginPath(); g.arc(x+i*9,30+Math.abs(i)*-2,3,0,Math.PI*2); g.fill(); }
    const gl = g.createRadialGradient(x,30,2,x,30,60); gl.addColorStop(0,'rgba(255,230,150,.35)'); gl.addColorStop(1,'rgba(255,230,150,0)');
    g.fillStyle = gl; g.fillRect(x-60,0,120,90);
  });
  // letrero
  g.fillStyle = '#d4a72c'; rr(196,10,328,46,10,g); g.fill();
  g.fillStyle = '#1a0a24'; rr(200,14,320,38,8,g); g.fill();
  g.fillStyle = '#ffe9a8'; g.font = '13px '+FONT; g.textAlign='center'; g.textBaseline='middle';
  g.fillText('✦ Nucita Lounge VIP ✦', 360, 34); g.textBaseline='alphabetic';
}
buildBgElite();
if (document.fonts && document.fonts.load){ document.fonts.load('14px "Press Start 2P"').then(() => { buildBg(); buildBgElite(); buildBgBar(); }).catch(()=>{}); }

/* =========================================================
   DIBUJO: sillas, mesas y clientes
   ========================================================= */
function drawSideChair(x,y){
  ell(x+2,y+14,16,5,'rgba(0,0,0,.2)');
  fillRR(x-13,y-12,26,24,5,C.silla);
  fillRR(x+10,y-22,8,36,3,C.sillaOscura);
  fillRR(x-10,y-9,20,6,3,'rgba(255,255,255,.18)');
}
function drawBackChair(cx,cy){
  fillRR(cx-22,cy-88,44,26,7,C.sillaOscura);
  fillRR(cx-18,cy-84,36,6,3,'rgba(255,255,255,.15)');
  fillRR(cx-19,cy-64,38,18,5,C.silla);
}
function drawTable(t){
  const {cx,cy} = t;
  drawSideChair(cx+62, cy-4);
  ell(cx,cy+16,48,15,'rgba(0,0,0,.22)');
  ell(cx,cy+8,44,27,C.mesaOscura);
  const gr = ctx.createRadialGradient(cx-14,cy-12,4,cx,cy,46);
  gr.addColorStop(0,C.mesaClara); gr.addColorStop(1,C.mesa);
  ell(cx,cy,44,27,gr);
  ctx.strokeStyle='rgba(255,255,255,.4)'; ctx.lineWidth=2;
  ctx.beginPath(); ctx.ellipse(cx,cy,35,20,0,Math.PI*1.1,Math.PI*1.55); ctx.stroke();
  // botella sobre la mesa (o coctel si es élite)
  if (t.student && t.student.elite){ ctx.font='18px '+EMOJI; ctx.textAlign='center'; ctx.fillText(t.student.coctel ? t.student.coctel.e : '🍸', cx+20, cy-2); }
  else if (t.student && t.student.state==='sit'){ fillRR(cx+14,cy-14,9,16,3,C.botella); ctx.fillStyle=C.botella; ctx.fillRect(cx+16.5,cy-20,4,7); ctx.fillStyle=C.tapa; ctx.fillRect(cx+16.5,cy-21,4,2); ctx.fillStyle='#fff4c2'; ctx.fillRect(cx+15,cy-9,7,5); }
  // letra de teclado
  ctx.fillStyle='rgba(60,0,0,.45)'; ctx.font='9px '+FONT; ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillText(t.key.toUpperCase(), cx-12, cy+6); ctx.textBaseline='alphabetic';
  // aro de la mesa que se está atendiendo
  if (pamela.at===t || pamela.target===t){
    ctx.save(); ctx.setLineDash([7,5]); ctx.lineDashOffset = -time*30;
    ctx.strokeStyle = C.dorado; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.ellipse(cx,cy+2,52,33,0,0,Math.PI*2); ctx.stroke(); ctx.restore();
  }
}
function drawStudent(t, sinSilla){
  const {cx,cy} = t, s = t.student;
  if (!sinSilla) drawBackChair(cx,cy);
  if (!s) return;
  const pop = Math.min(1, s.age*5);
  let ox = 0, oy = 0;
  if (s.state==='sit' && s.patience < .25) ox += Math.sin(time*45)*1.4;
  if (s.shake > 0) ox += Math.sin(time*70)*3;
  if (s.state==='happy') oy = -Math.sin(Math.min(1,s.t*2.5)*Math.PI)*8;
  ctx.save();
  if (s.state!=='sit') ctx.globalAlpha = Math.max(0, 1 - Math.max(0, s.t - (s.state==='angry' ? 1.4 : 0.5))*2);
  ctx.translate(cx+ox, cy-40+oy); ctx.scale(pop,pop);
  // torso
  fillRR(-17,-12,34,36,11,s.shirt);
  fillRR(-17,-12,34,8,6,'rgba(255,255,255,.12)');
  // mano levantada para llamar a Pamela
  if (s.state==='sit' && pamela.at!==t && !(s.elite && elite.bar)){
    const w = Math.sin(time*9 + t.id)*0.35;
    ctx.save(); ctx.translate(14,-6); ctx.rotate(0.35+w);
    fillRR(-4,-26,8,28,4,s.shirt); circ(0,-29,5.5,s.skin); ctx.restore();
  }
  const hy = -30, st = s.style;
  if (st===1){ ell(0,hy+4,17,19,s.hair); }
  if (st===2){ circ(0,hy-3,20,s.hair); }
  circ(0,hy,14,s.skin);
  // cabello
  ctx.fillStyle = s.hair;
  if (st===0 || st===1){ ctx.beginPath(); ctx.arc(0,hy-1,14.5,Math.PI*1.02,Math.PI*1.98); ctx.fill(); }
  if (st===2){ [-10,-4,4,10].forEach(dx=>circ(dx,hy-12,5,s.hair)); }
  if (st===3){ ctx.beginPath(); ctx.arc(0,hy-1,14.5,Math.PI,0); ctx.fill(); circ(0,hy-17,7,s.hair); }
  if (st===4){ ctx.fillStyle = s.cap; ctx.beginPath(); ctx.arc(0,hy-2,15,Math.PI,0); ctx.fill(); fillRR(-2,hy-6,18,5,2,s.cap); }
  // cliente élite: gafas oscuras, cadena dorada y anillo de diamante
  if (s.elite){
    ctx.strokeStyle = '#d4a72c'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0,-12,10,Math.PI*.15,Math.PI*.85); ctx.stroke();
    circ(0,-2,2.5,'#d4a72c');
    fillRR(-11,hy-3,22,6,2,'#111'); ctx.fillStyle='rgba(255,255,255,.4)'; ctx.fillRect(-9,hy-2,4,1.5); ctx.fillRect(3,hy-2,4,1.5);
    ctx.font='12px '+EMOJI; ctx.textAlign='center'; ctx.fillText('👑', 0, hy-15);
  }
  // cara según la paciencia
  const mood = s.state==='angry' ? 2 : s.state==='happy' ? 0 : (s.patience>.6 ? 0 : s.patience>.3 ? 1 : 2);
  if (mood===2){ circ(0,hy,14,'rgba(230,40,40,.28)'); }
  if (!s.elite){ circ(-5,hy+1,2,'#1a1010'); circ(5,hy+1,2,'#1a1010'); }
  ctx.strokeStyle='#1a1010'; ctx.lineWidth=2; ctx.lineCap='round';
  if (mood===2){
    ctx.beginPath(); ctx.moveTo(-9,hy-6); ctx.lineTo(-3,hy-3); ctx.moveTo(9,hy-6); ctx.lineTo(3,hy-3); ctx.stroke();
    ctx.beginPath(); ctx.arc(0,hy+11,4.5,Math.PI*1.15,Math.PI*1.85); ctx.stroke();
  } else if (mood===1){
    ctx.beginPath(); ctx.moveTo(-8,hy-5); ctx.lineTo(-3,hy-5); ctx.moveTo(8,hy-5); ctx.lineTo(3,hy-5); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-3.5,hy+7); ctx.lineTo(3.5,hy+7); ctx.stroke();
  } else {
    circ(-8,hy+5,2.6,'rgba(240,110,140,.5)'); circ(8,hy+5,2.6,'rgba(240,110,140,.5)');
    ctx.beginPath(); ctx.arc(0,hy+4,4.5,Math.PI*.15,Math.PI*.85); ctx.stroke();
  }
  ctx.restore();
  if (s.state==='angry' && s.t<1){ ctx.font='16px '+EMOJI; ctx.textAlign='center'; ctx.fillText('💢', cx+16, cy-80); }
}

/* =========================================================
   DIBUJO: Pamela (muchacha peli amarilla con su balde de cervezas)
   ========================================================= */
function drawPamela(){
  const mv = pamela.moving, ph = pamela.walkT*12;
  const bob = mv ? Math.abs(Math.sin(ph))*2.2 : Math.sin(time*2.2)*0.6;
  ell(pamela.x, pamela.y, 17, 5, 'rgba(0,0,0,.25)');
  ctx.save(); ctx.translate(pamela.x, pamela.y - bob); if (pamela.slipT > 0) ctx.rotate(Math.sin(time*30)*0.3); ctx.scale(pamela.facing, 1);
  const P = C.pamPelo;
  // pelo largo (parte de atrás)
  fillRR(-15,-70,30,42,13,C.pamPeloSombra);
  fillRR(-13,-70,26,40,12,P);
  // jean y tenis
  const a = mv ? Math.max(0, Math.sin(ph))*3 : 0, b = mv ? Math.max(0, -Math.sin(ph))*3 : 0;
  ctx.fillStyle = C.pamJean; ctx.fillRect(-8,-24,7,22-a); ctx.fillRect(1,-24,7,22-b);
  fillRR(-9,-25,18,7,3,C.pamJean);
  ell(-4.5,-2-a,4.6,2.8,C.pamTenis); ell(4.5,-2-b,4.6,2.8,C.pamTenis);
  // brazo de atrás
  fillRR(-14,-41,5,18,3,C.pamPielSombra);
  // blusa
  const bg2 = ctx.createLinearGradient(-11,-45,11,-20); bg2.addColorStop(0,C.pamBlusaLuz); bg2.addColorStop(1,C.pamBlusa);
  rr(-10,-45,20,23,6); ctx.fillStyle = bg2; ctx.fill();
  ctx.beginPath(); ctx.moveTo(-4,-45); ctx.lineTo(0,-40); ctx.lineTo(4,-45); ctx.closePath(); ctx.fillStyle=C.pamPiel; ctx.fill();
  // mechones sobre los hombros
  fillRR(-14,-50,7,22,4,P); fillRR(7,-50,7,20,4,P);
  // brazo de adelante con el balde de cervezas
  const sw = mv ? Math.sin(ph)*0.12 : 0;
  ctx.save(); ctx.translate(11,-40); ctx.rotate(sw);
  fillRR(-2,0,5,18,3,C.pamPiel); circ(0.5,19,3,C.pamPiel);
  ctx.strokeStyle = '#7d8790'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(1.5,24,8,Math.PI*1.05,Math.PI*1.95); ctx.stroke();
  [[-4],[1],[6]].forEach(([bx],i)=>{ ctx.fillStyle=C.botella; ctx.fillRect(bx,15-(i%2)*2,3,9); ctx.fillStyle=C.tapa; ctx.fillRect(bx,14-(i%2)*2,3,2); });
  ctx.beginPath(); ctx.moveTo(-8,22); ctx.lineTo(11,22); ctx.lineTo(9,35); ctx.lineTo(-6,35); ctx.closePath();
  const mg = ctx.createLinearGradient(-8,0,11,0); mg.addColorStop(0,C.baldeLuz); mg.addColorStop(1,C.balde); ctx.fillStyle = mg; ctx.fill();
  ctx.fillStyle='rgba(255,255,255,.8)'; ctx.fillRect(-6,21,3,3); ctx.fillRect(4,20.5,3,3);
  ctx.strokeStyle='rgba(0,0,0,.15)'; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(-7,27); ctx.lineTo(10,27); ctx.stroke();
  ctx.restore();
  // cuello y cara
  ctx.fillStyle = C.pamPielSombra; ctx.fillRect(-2.5,-48,5,5);
  ell(0,-55,11.5,12.5,C.pamPiel);
  ell(4,-53,7,9,'rgba(0,0,0,.04)');
  // capul de lado
  ctx.beginPath(); ctx.moveTo(-12.5,-56); ctx.quadraticCurveTo(-13,-70,0,-70); ctx.quadraticCurveTo(13,-70,12.5,-56);
  ctx.quadraticCurveTo(6,-63,-2,-60); ctx.quadraticCurveTo(-8,-58,-12.5,-56); ctx.closePath(); ctx.fillStyle=P; ctx.fill();
  ctx.strokeStyle=C.pamPeloLuz; ctx.lineWidth=1.6; ctx.lineCap='round';
  ctx.beginPath(); ctx.moveTo(-6,-67); ctx.quadraticCurveTo(0,-68,6,-65); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-11,-40); ctx.lineTo(-11,-47); ctx.moveTo(10,-40); ctx.lineTo(10,-46); ctx.stroke();
  // ojos y pestañas
  const blink = (time % 3.7) < 0.12;
  ctx.strokeStyle = '#2a1a0e'; ctx.lineWidth = 1.3;
  [-4.5,4.5].forEach(ex=>{
    if (blink){ ctx.beginPath(); ctx.moveTo(ex-2.5,-54); ctx.lineTo(ex+2.5,-54); ctx.stroke(); }
    else {
      ell(ex,-54,2.2,2.9,'#3b2614'); circ(ex-0.7,-55,0.9,'#fff');
      const sd = ex<0 ? -1 : 1;
      ctx.beginPath();
      ctx.moveTo(ex+sd*1.2,-56.6); ctx.lineTo(ex+sd*3.6,-58.4);
      ctx.moveTo(ex+sd*2.1,-55.8); ctx.lineTo(ex+sd*4.4,-57);
      ctx.stroke();
    }
  });
  circ(-7.5,-50,2.7,C.pamMejilla); circ(7.5,-50,2.7,C.pamMejilla);
  ctx.strokeStyle=C.pamLabios; ctx.lineWidth=1.6; ctx.beginPath(); ctx.arc(0,-49.5,2.6,Math.PI*.15,Math.PI*.85); ctx.stroke();
  ctx.restore();
}

/* =========================================================
   DIBUJO: Nucita, el perrito (cachorro crema/durazno de la foto)
   ========================================================= */
function drawMaxi(){
  const m = maxi, mv = m.moving, ph = m.walkT*15;
  const hop = m.petT > 0 ? Math.abs(Math.sin(m.petT*12))*4 : 0;
  const bob = (mv ? Math.abs(Math.sin(ph))*1.6 : 0) + hop;
  ell(m.x, m.y, 18, 5, 'rgba(0,0,0,.22)');
  ctx.save(); ctx.translate(m.x, m.y - bob); ctx.scale(m.facing*1.08, 1.08);
  const wag = Math.sin(time*(m.petT>0 ? 30 : 13))*0.35;
  // cola corta levantada
  ctx.save(); ctx.translate(-16,-21); ctx.rotate(-0.35+wag);
  circ(0,-3,5.2,C.maxiSombra); circ(-1,-9,5,C.maxiPelo); circ(0.5,-14,4.4,C.maxiPelo); circ(-0.5,-12,2,C.maxiLuz);
  ctx.restore();
  // patas de atrás
  const a = mv ? Math.sin(ph)*2.5 : 0;
  ell(-13,-6-Math.max(0,a),5,6.5,C.maxiSombra); ell(-4,-6-Math.max(0,-a),5,6.5,C.maxiSombra);
  // cuerpo esponjoso
  const bgr = ctx.createRadialGradient(-10,-22,2,-6,-15,19);
  bgr.addColorStop(0,C.maxiLuz); bgr.addColorStop(.6,C.maxiPelo); bgr.addColorStop(1,C.maxiSombra);
  ell(-6,-15,17,12.5,bgr);
  ctx.strokeStyle='rgba(185,130,80,.55)'; ctx.lineWidth=1.1;
  [[-14,-17],[-8,-11],[-2,-19],[-12,-8],[-4,-24]].forEach(([x,y])=>{ ctx.beginPath(); ctx.arc(x,y,2.6,Math.PI*.2,Math.PI*1.3); ctx.stroke(); });
  // patas de adelante claritas
  const fa = mv ? Math.max(0, Math.sin(ph))*3 : 0, fb = mv ? Math.max(0, -Math.sin(ph))*3 : 0;
  fillRR(1,-17,8.5,16-fa,4,C.maxiLuz); fillRR(10,-17,8.5,16-fb,4,C.maxiLuz);
  ell(5.2,-2-fa,5,3.4,C.maxiLuz); ell(14.2,-2-fb,5,3.4,C.maxiLuz);
  ctx.strokeStyle='rgba(185,130,80,.6)'; ctx.lineWidth=0.9;
  [3.6,6.8,12.6,15.8].forEach((x,i)=>{ const yy = -1.5-(i<2?fa:fb); ctx.beginPath(); ctx.moveTo(x,yy-2); ctx.lineTo(x,yy+0.8); ctx.stroke(); });
  // pechito
  ell(9,-19,8,6,C.maxiLuz);
  // cabeza redonda
  const hx = 8, hy = -35;
  const hg = ctx.createRadialGradient(hx-5,hy-7,2,hx,hy,17);
  hg.addColorStop(0,C.maxiLuz); hg.addColorStop(.55,C.maxiPelo); hg.addColorStop(1,C.maxiSombra);
  circ(hx,hy,15.5,hg);
  // copete rizado
  [[-7,-13,5],[0,-15.5,5.5],[7,-13,5],[-11,-7,3.5],[11,-7,3.5]].forEach(([dx,dy,r])=>circ(hx+dx,hy+dy,r,C.maxiPelo));
  [[-6,-14.5,2],[1,-17,2.2],[7,-14,1.8]].forEach(([dx,dy,r])=>circ(hx+dx,hy+dy,r,C.maxiLuz));
  // collar turquesa fino
  ctx.strokeStyle = C.maxiCollar; ctx.lineWidth = 2.6;
  ctx.beginPath(); ctx.arc(hx,hy+4,12,Math.PI*.22,Math.PI*.78); ctx.stroke();
  // orejas grandes, caídas y onduladas (durazno)
  [-1,1].forEach(sd=>{
    const ex = hx + sd*13.5, ey = hy + 3;
    const og = ctx.createLinearGradient(ex, ey-12, ex, ey+16);
    og.addColorStop(0,C.maxiOreja); og.addColorStop(1,C.maxiOrejaSombra);
    ell(ex+sd*1.5, ey+2, 6.5, 13, og, sd*-0.28);
    circ(ex+sd*4.5, ey+8, 4.2, C.maxiOreja); circ(ex+sd*3.5, ey+13, 3.8, C.maxiOrejaSombra);
    circ(ex+sd*0.5, ey+15, 3.6, C.maxiOreja); circ(ex+sd*5, ey+2, 3.6, C.maxiOreja);
    ctx.strokeStyle='rgba(150,90,45,.45)'; ctx.lineWidth=1;
    ctx.beginPath(); ctx.arc(ex+sd*2, ey+5, 3, Math.PI*.1, Math.PI*.9); ctx.stroke();
  });
  // hocico clarito
  ell(hx, hy+6.5, 8, 6, C.maxiLuz);
  // ojos grandes, brillantes
  [-5.6,5.6].forEach(dx=>{
    const ex = hx+dx, ey = hy-1.5;
    circ(ex, ey, 4.4, C.maxiOjo); circ(ex+0.3, ey+0.4, 2.7, C.maxiPupila);
    circ(ex-1.4, ey-1.6, 1.6, '#fff'); circ(ex+1.5, ey+1.4, 0.75, '#fff');
  });
  // nariz oscura y brillante
  ell(hx, hy+3.6, 2.9, 2.1, C.maxiNariz); circ(hx-0.9, hy+2.9, 0.8, 'rgba(255,255,255,.85)');
  // boquita abierta con la lengüita afuera
  ctx.strokeStyle = C.maxiBoca; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(hx,hy+5.6); ctx.lineTo(hx,hy+7); ctx.stroke();
  ell(hx, hy+8.6, 3.4, 2.4, C.maxiBoca);
  ell(hx+0.4, hy+10.2, 2.3, 3, C.maxiLengua);
  ctx.strokeStyle='rgba(180,60,80,.6)'; ctx.beginPath(); ctx.moveTo(hx+0.4,hy+8.8); ctx.lineTo(hx+0.4,hy+11.5); ctx.stroke();
  ctx.restore();
}

/* =========================================================
   DIBUJO: globos de pedido, paciencia y textos flotantes
   ========================================================= */
function drawBubble(t){
  const s = t.student; if (!s || s.state!=='sit') return;
  if (s.elite){ drawEliteBubble(t, s); return; }
  const n = s.order.length, bw = Math.max(44, n*30+14), bh = 34;
  const sx = s.shake>0 ? Math.sin(time*70)*3 : 0;
  const bx = t.cx - bw/2 + sx, by = t.cy - 120;
  // barra de paciencia
  const p = Math.max(0, s.patience);
  fillRR(bx, by-12, bw, 8, 4, 'rgba(40,10,20,.65)');
  fillRR(bx+1, by-11, Math.max(2,(bw-2)*p), 6, 3, p>.6 ? C.pacBien : p>.3 ? C.pacMedio : C.pacMal);
  if (s.petted){ ctx.font='10px '+EMOJI; ctx.textAlign='left'; ctx.fillText('🐾', bx+bw+3, by-4); }
  // globo
  rr(bx, by, bw, bh, 10); ctx.fillStyle = C.globo; ctx.fill();
  ctx.lineWidth = 2.5; ctx.strokeStyle = C.globoBorde; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(t.cx-6, by+bh); ctx.lineTo(t.cx, by+bh+8); ctx.lineTo(t.cx+6, by+bh);
  ctx.fillStyle = C.globo; ctx.fill(); ctx.stroke();
  ctx.fillRect(t.cx-5, by+bh-2.5, 10, 3.5);
  ctx.font = '20px '+EMOJI; ctx.textAlign='center'; ctx.textBaseline='middle';
  s.order.forEach((i,k)=>ctx.fillText(PRODUCTS[i].e, bx+7+15+k*30, by+bh/2+1));
  ctx.textBaseline='alphabetic';
}
function drawEliteBubble(t, s){
  const bw = 64, bh = 34, sx = s.shake>0 ? Math.sin(time*70)*3 : 0;
  const bx = t.cx - bw/2 + sx, by = t.cy - 120, p = Math.max(0, s.patience);
  fillRR(bx, by-12, bw, 8, 4, 'rgba(40,10,20,.65)');
  fillRR(bx+1, by-11, Math.max(2,(bw-2)*p), 6, 3, p>.6 ? C.pacBien : p>.3 ? C.pacMedio : C.pacMal);
  rr(bx, by, bw, bh, 10); ctx.fillStyle = '#2a1238'; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = '#d4a72c'; ctx.stroke();
  ctx.font = '18px '+EMOJI; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('💎🍸', t.cx + sx, by + bh/2 + 1); ctx.textBaseline = 'alphabetic';
}
function drawSay(t){
  const s = t.student; if (!s || !s.say) return;
  ctx.font = '8px ' + FONT;
  const tw = ctx.measureText(s.say.txt).width, bw = tw + 16, bh = 22;
  let bx = t.cx - bw/2; bx = Math.max(4, Math.min(W - bw - 4, bx));
  const by = t.cy - 168 + (s.state !== 'sit' ? 30 : 0);
  const shake = Math.sin(time*50)*1.2;
  ctx.globalAlpha = Math.min(1, s.say.t*3);
  rr(bx+shake, by, bw, bh, 7); ctx.fillStyle = '#1b1b1b'; ctx.fill();
  ctx.lineWidth = 2; ctx.strokeStyle = '#ff4d4d'; ctx.stroke();
  ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(s.say.txt, bx + bw/2 + shake, by + bh/2 + 1); ctx.textBaseline = 'alphabetic';
  ctx.globalAlpha = 1;
}
/* =========================================================
   DIBUJO: bafle, notas musicales y luces de fiesta
   ========================================================= */
let beat = 0, notes = [];
function drawBafle(){
  const x = 650, y = 488, w = 58, h = 84, p = 1 + beat*0.12;
  ell(x+w/2, y+h, 34, 6, 'rgba(0,0,0,.25)');
  fillRR(x, y, w, h, 7, '#1d1d22'); fillRR(x+3, y+3, w-6, 6, 3, 'rgba(255,255,255,.08)');
  [[x+w/2, y+24, 13],[x+w/2, y+60, 18]].forEach(([cx,cy,r])=>{
    circ(cx, cy, r+3, '#33333b'); circ(cx, cy, r*p, '#0e0e12');
    circ(cx, cy, r*0.45*p, '#4a4a55'); circ(cx-r*0.15, cy-r*0.15, r*0.15, 'rgba(255,255,255,.25)');
  });
  const hue = (time*120) % 360;
  ctx.fillStyle = 'hsl(' + hue + ',90%,60%)'; ctx.globalAlpha = .5 + beat*.5;
  ctx.fillRect(x+6, y+h-8, w-12, 3); ctx.globalAlpha = 1;
}
function drawLuces(){
  ctx.save(); ctx.globalAlpha = state==='play' ? .14 : .08;
  for (let i=0;i<5;i++){
    const x = W/2 + Math.sin(time*0.6 + i*1.7)*300, y = 320 + Math.cos(time*0.45 + i*2.3)*210;
    ell(x, y, 46, 28, elite.fade > .5 ? (i%2 ? '#d4a72c' : '#b04cff') : 'hsl(' + (i*72 + time*40)%360 + ',95%,60%)');
  }
  ctx.restore();
}
function drawNotes(){
  ctx.font = '14px ' + FONT; ctx.textAlign = 'center';
  notes.forEach(n => { ctx.globalAlpha = Math.max(0, n.life); ctx.fillStyle = n.c; ctx.fillText(n.ch, n.x, n.y); });
  ctx.globalAlpha = 1;
}
function addFloat(txt, x, y, color='#fff', big=false){ floats.push({txt, x, y, color, big, life:1.3}); }
function drawFloats(){
  ctx.textAlign='center'; ctx.lineJoin='round';
  floats.forEach(f=>{
    ctx.globalAlpha = Math.min(1, f.life*1.6);
    ctx.font = (f.big ? '20px ' : '12px ') + FONT;
    ctx.lineWidth = f.big ? 6 : 4; ctx.strokeStyle = '#3a0c1a';
    ctx.strokeText(f.txt, f.x, f.y); ctx.fillStyle = f.color; ctx.fillText(f.txt, f.x, f.y);
  });
  ctx.globalAlpha = 1;
}
function drawMaxiHearts(){
  if (maxi.petT <= 0) return;
  ctx.font = '14px '+EMOJI; ctx.textAlign='center';
  for (let i=0;i<3;i++){
    const k = (1 - maxi.petT) + i*0.25;
    ctx.globalAlpha = Math.max(0, 1-k);
    ctx.fillText('💖', maxi.x + (i-1)*12, maxi.y - 52 - k*26);
  }
  ctx.globalAlpha = 1;
}

/* =========================================================
   MOVIMIENTO POR PASILLOS (sin pisar mesas ni sillas)
   ========================================================= */
function routeFrom(x, y, tx, ty){
  const pts = [];
  if (Math.abs(x - tx) < 1 || (Math.abs(y - HY) < 1 && Math.abs(ty - HY) < 1)) pts.push({x:tx, y:ty});
  else {
    if (Math.abs(y - HY) > 1) pts.push({x, y:HY});
    pts.push({x:tx, y:HY});
    if (Math.abs(ty - HY) > 1) pts.push({x:tx, y:ty});
  }
  return pts;
}
function route(t){ return routeFrom(pamela.x, pamela.y, t.spotX, t.spotY); }

/* =========================================================
   REGUEROS: se riegan cosas y Toño las limpia
   ========================================================= */
function spillSpot(){
  if (Math.random() < .45) return {x:rand(40,700), y:HY};
  return {x:pick(AISLE), y: Math.random() < .5 ? rand(200,295) : rand(345,490)};
}
function addSpill(at){
  let p = at, tries = 0;
  while (!p || spills.some(o => Math.hypot(o.x-p.x, o.y-p.y) < 40)){ if (tries++ > 12) return; p = spillSpot(); }
  spills.push({x:p.x, y:p.y, type:pick(['cerveza','cerveza','papitas','vidrio']), age:0, clean:0, seed:Math.random()*10});
  SFX.regar();
}
function callTono(sp){
  audio();
  if (!sp){ addFloat('Todo limpio ✨', tono.x, tono.y-70, '#bff3ff'); SFX.nada(); return; }
  if (tono.job === sp || tono.queue.includes(sp)) return;
  tono.queue.push(sp); SFX.yavoy();
  addFloat('¡Ya voy!', tono.x, tono.y-70, '#bff3ff');
}
function callNearest(){
  if (state !== 'play') return;
  pressFx('tono');
  const free = spills.filter(sp => sp !== tono.job && !tono.queue.includes(sp));
  free.sort((a,b) => Math.hypot(a.x-tono.x,a.y-tono.y) - Math.hypot(b.x-tono.x,b.y-tono.y));
  callTono(free[0]);
}
function updateTono(dt){
  if (tono.cleanT > 0){
    tono.cleanT -= dt; tono.moving = false; tono.walkT += dt;
    if (tono.job) tono.job.clean = 1 - tono.cleanT/1.3;
    if (tono.cleanT <= 0){
      spills = spills.filter(sp => sp !== tono.job);
      addFloat('✨ Limpio', tono.job.x, tono.job.y-50, '#bff3ff'); SFX.limpio();
      tono.job = null;
    }
    return;
  }
  if (!tono.job && tono.queue.length){
    while (tono.queue.length){ const sp = tono.queue.shift(); if (spills.includes(sp)){ tono.job = sp; break; } }
    if (tono.job) tono.path = routeFrom(tono.x, tono.y, tono.job.x, tono.job.y);
  }
  if (tono.job && !tono.path.length){ tono.cleanT = 1.3; tono.facing = 1; return; }
  if (!tono.job && !tono.path.length && Math.hypot(tono.x-HOME.x, tono.y-HOME.y) > 1) tono.path = routeFrom(tono.x, tono.y, HOME.x, HOME.y);
  if (tono.path.length){
    let move = 330*dt; const ox = tono.x;
    while (move > 0 && tono.path.length){
      const p = tono.path[0], d = Math.hypot(p.x-tono.x, p.y-tono.y);
      if (d <= move){ tono.x = p.x; tono.y = p.y; move -= d; tono.path.shift(); }
      else { tono.x += (p.x-tono.x)/d*move; tono.y += (p.y-tono.y)/d*move; move = 0; }
    }
    tono.moving = true; tono.walkT += dt;
    if (Math.abs(tono.x-ox) > 0.05) tono.facing = Math.sign(tono.x-ox);
  } else { tono.moving = false; if (!tono.job) tono.facing = -1; }
}
function drawSpills(){
  spills.forEach(sp => {
    const a = Math.min(1, sp.age*4), k = 1 - sp.clean;
    ctx.save(); ctx.globalAlpha = k; ctx.translate(sp.x, sp.y); ctx.scale(a, a);
    if (sp.type === 'papitas'){
      ell(0,2,22,9,'rgba(120,70,20,.18)');
      for (let i=0;i<8;i++){ const ang = sp.seed + i*0.8, r = 6 + (i*7.3 % 12);
        ell(Math.cos(ang)*r*1.4, Math.sin(ang)*r*0.6, 4, 2.6, i%2 ? '#f6c945' : '#e8a92a', ang); }
    } else {
      ell(0,0,24,10,'rgba(200,135,20,.72)'); ell(-12,4,10,6,'rgba(200,135,20,.72)'); ell(13,-3,9,5,'rgba(200,135,20,.72)');
      ell(-4,-3,9,3,'rgba(255,240,190,.55)');
      circ(8,2,1.6,'rgba(255,255,255,.8)'); circ(-14,3,1.3,'rgba(255,255,255,.8)');
      if (sp.type === 'vidrio'){
        ctx.fillStyle = C.botella;
        [[-6,-1,0.4],[5,3,-0.7],[12,-5,1.2]].forEach(([x,y,r]) => { ctx.save(); ctx.translate(x,y); ctx.rotate(r);
          ctx.beginPath(); ctx.moveTo(-4,0); ctx.lineTo(0,-5); ctx.lineTo(4,1); ctx.closePath(); ctx.fill(); ctx.restore(); });
        circ(-14,-4,2.6,C.tapa);
      }
    }
    ctx.restore();
    if (sp === tono.job && tono.cleanT > 0){ ctx.font = '12px ' + EMOJI; ctx.textAlign = 'center'; ctx.fillText('🫧', sp.x + Math.sin(time*9)*14, sp.y - 6 - (time*30 % 20)); }
  });
}

/* =========================================================
   DIBUJO: Toño, el que limpia
   ========================================================= */
function drawTono(){
  const mv = tono.moving, ph = tono.walkT*12, cleaning = tono.cleanT > 0;
  const bob = mv ? Math.abs(Math.sin(ph))*2 : 0;
  ell(tono.x, tono.y, 16, 5, 'rgba(0,0,0,.25)');
  ctx.save(); ctx.translate(tono.x, tono.y - bob); ctx.scale(tono.facing, 1);
  const a = mv ? Math.max(0, Math.sin(ph))*3 : 0, b = mv ? Math.max(0, -Math.sin(ph))*3 : 0;
  // pantalón y botas
  ctx.fillStyle = '#3f4a57'; ctx.fillRect(-8,-24,7,22-a); ctx.fillRect(1,-24,7,22-b);
  ell(-4.5,-2-a,4.8,2.8,'#2a2a2a'); ell(4.5,-2-b,4.8,2.8,'#2a2a2a');
  // trapero
  const sw = cleaning ? Math.sin(time*14)*0.45 : (mv ? Math.sin(ph)*0.08 : 0);
  ctx.save(); ctx.translate(12,-34); ctx.rotate(0.35 + sw);
  ctx.fillStyle = '#c49a5a'; ctx.fillRect(-1.5,0,3,36);
  ctx.fillStyle = '#d9d9d2'; for (let i=-3;i<=3;i++) fillRR(i*2.6-1.5,34,3,10,1.5,'#d9d9d2');
  ctx.restore();
  // brazo de atrás
  fillRR(-14,-41,5,18,3,'#8a5a3a');
  // camisa y overol
  fillRR(-11,-45,22,23,6,'#f08c2b');
  fillRR(-8,-38,16,16,3,'#2f6fb8'); ctx.fillStyle = '#2f6fb8'; ctx.fillRect(-8,-45,3,8); ctx.fillRect(5,-45,3,8);
  circ(-6.5,-38,1.3,'#ffd54a'); circ(6.5,-38,1.3,'#ffd54a');
  // brazo de adelante agarrando el trapero
  fillRR(9,-41,5,14,3,'#9b6845'); circ(12,-28,3,'#9b6845');
  // cabeza con gorra
  ctx.fillStyle = '#8a5a3a'; ctx.fillRect(-2.5,-48,5,5);
  ell(0,-55,11,12,'#9b6845');
  ctx.fillStyle = '#d23a3a'; ctx.beginPath(); ctx.arc(0,-58,11.5,Math.PI,0); ctx.fill();
  fillRR(2,-61,15,4,2,'#a92a2a');
  // cara
  circ(-4,-54,1.8,'#1a1010'); circ(4,-54,1.8,'#1a1010');
  ctx.strokeStyle = '#1a1010'; ctx.lineWidth = 1.5; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-5,-48.5); ctx.quadraticCurveTo(0,-46.5,5,-48.5); ctx.stroke();
  ctx.fillStyle = '#2a1a10'; ctx.fillRect(-5,-50.5,10,1.6);
  ctx.restore();
}
function goTo(t){
  audio();
  if (pamela.at === t) return;
  pamela.target = t; pamela.at = null; pamela.path = route(t);
  const last = pamela.trail[pamela.trail.length-1];
  if (!last || Math.hypot(last.x-pamela.x, last.y-pamela.y) > 1) pamela.trail.push({x:pamela.x, y:pamela.y});
  setStatus('Pamela va a la mesa ' + t.key.toUpperCase() + '…');
  syncButtons();
}
function updateNucita(dt){
  pamela.immuneT = Math.max(0, pamela.immuneT - dt);
  if (pamela.slipT > 0){ pamela.slipT -= dt; pamela.moving = false; return; }
  if (pamela.path.length && pamela.immuneT <= 0){
    const sp = spills.find(o => o.clean < .5 && Math.hypot(o.x-pamela.x, o.y-pamela.y) < 16);
    if (sp){ pamela.slipT = .9; pamela.immuneT = 1.8; SFX.resbalon(); addFloat('¡Uy, se resbaló!', pamela.x, pamela.y-80, '#fff4c2'); return; }
  }
  if (pamela.path.length){
    let move = 400*dt; const ox = pamela.x;
    while (move > 0 && pamela.path.length){
      const p = pamela.path[0], d = Math.hypot(p.x-pamela.x, p.y-pamela.y);
      if (d <= move){ pamela.x = p.x; pamela.y = p.y; move -= d; pamela.path.shift(); }
      else { pamela.x += (p.x-pamela.x)/d*move; pamela.y += (p.y-pamela.y)/d*move; move = 0; }
    }
    pamela.moving = true; pamela.walkT += dt;
    if (Math.abs(pamela.x-ox) > 0.05) pamela.facing = Math.sign(pamela.x-ox);
    const last = pamela.trail[pamela.trail.length-1];
    if (!last || Math.hypot(last.x-pamela.x, last.y-pamela.y) > 3) pamela.trail.push({x:pamela.x, y:pamela.y});
    if (!pamela.path.length && pamela.target){ pamela.at = pamela.target; pamela.moving = false; pamela.facing = 1; onArrive(); }
  } else pamela.moving = false;
}
function updateMaxi(dt){
  const m = maxi, tr = pamela.trail;
  // distancia por el camino que hizo Pamela
  let len = 0, px = m.x, py = m.y;
  for (const p of tr){ len += Math.hypot(p.x-px, p.y-py); px = p.x; py = p.y; }
  len += Math.hypot(pamela.x-px, pamela.y-py);
  let move = Math.min(len - FOLLOW, 440*dt);
  const ox = m.x; m.moving = move > 0.3;
  while (move > 0 && tr.length){
    const p = tr[0], d = Math.hypot(p.x-m.x, p.y-m.y);
    if (d <= move){ m.x = p.x; m.y = p.y; move -= d; tr.shift(); }
    else { m.x += (p.x-m.x)/d*move; m.y += (p.y-m.y)/d*move; move = 0; }
  }
  if (move > 0 && !tr.length){
    const d = Math.hypot(pamela.x-m.x, pamela.y-m.y);
    if (d > 0){ m.x += (pamela.x-m.x)/d*move; m.y += (pamela.y-m.y)/d*move; }
  }
  if (m.moving){ m.walkT += dt; if (Math.abs(m.x-ox) > 0.05) m.facing = Math.sign(m.x-ox); }
  else m.facing = Math.abs(pamela.x-m.x) < 4 ? 1 : (pamela.x > m.x ? 1 : -1);
  m.petT = Math.max(0, m.petT - dt); m.barkT = Math.max(0, m.barkT - dt);
}
function bark(){ maxi.barkT = .4; addFloat('¡Guau!', maxi.x, maxi.y-58, '#fff1c9'); SFX.guau(); }
function onArrive(){
  if (Math.random() < .35) bark();
  refreshStatus(); syncButtons();
}

/* =========================================================
   REGLAS: niveles, llegada de clientes, entregas
   ========================================================= */
function cfg(){
  const L = level;
  return {
    interval: Math.max(1.3, 5 - L*0.5),
    patience: Math.max(10, 28 - L*2.5),
    minItems: L >= 6 ? 3 : L >= 3 ? 2 : 1,
    maxItems: Math.min(4, 1 + L)
  };
}
/* =========================================================
   EVENTOS: noche de partido, lluvia y apagón
   ========================================================= */
const evento = {tipo:null, dayT:0, apagonAt:-1, apagonT:0, golT:0, rayo:0};
const EVENTOS = {
  partido: {n:'⚽ Noche de partido', txt:'¡Noche de partido! Llega mucha gente', mult:.6, pac:.9},
  lluvia:  {n:'🌧️ Está lloviendo', txt:'Está lloviendo: llega menos gente pero más tranquila', mult:1.5, pac:1.3}
};
function pickEvento(){
  evento.tipo = dia >= 2 && Math.random() < .45 ? pick(['partido','lluvia']) : null;
  evento.dayT = 0; evento.apagonT = 0; evento.golT = rand(18, 30); evento.rayo = 0;
  evento.apagonAt = dia >= 3 && Math.random() < .4 ? rand(35, 75) : -1;
}
const evMult = () => evento.tipo ? EVENTOS[evento.tipo].mult : 1;
const evPac  = () => evento.tipo ? EVENTOS[evento.tipo].pac : 1;
function updateEvento(dt){
  if (state !== 'play' || overT > 0 || elite.bar) return;
  evento.dayT += dt;
  evento.rayo = Math.max(0, evento.rayo - dt*3);
  if (evento.tipo === 'lluvia' && Math.random() < dt*0.04){ evento.rayo = 1; tone(60,.8,'sawtooth',.06,0,-20); }
  if (evento.tipo === 'partido'){
    evento.golT -= dt;
    if (evento.golT <= 0){
      evento.golT = rand(22, 38); SFX.gol();
      addFloat('⚽ ¡GOOOOL!', W/2, H/2-20, '#ffe066', true);
      tables.forEach(t => { const st = t.student; if (st && st.state === 'sit' && !st.elite) st.patience = Math.min(1, st.patience + .15); });
      announce('¡Gol! Los clientes se alegran');
    }
  }
  if (evento.apagonAt > 0 && evento.dayT >= evento.apagonAt){
    evento.apagonAt = -1; evento.apagonT = 15; SFX.apagon();
    addFloat('💡 ¡Se fue la luz!', W/2, H/2-40, '#fff4c2', true); announce('Se fue la luz. Solo ves lo que alumbra la linterna de Pamela');
  } else if (evento.apagonT > 0){
    evento.apagonT -= dt;
    if (evento.apagonT <= 0){ addFloat('💡 ¡Volvió la luz!', W/2, H/2-40, '#fff4c2', true); announce('Volvió la luz'); }
  }
}
function drawEventoFondo(){
  if (state !== 'play' && state !== 'pause') return;
  if (evento.tipo === 'lluvia'){
    ctx.save(); ctx.strokeStyle = 'rgba(170,200,255,.45)'; ctx.lineWidth = 1.5;
    for (let i=0;i<70;i++){
      const x = (i*97 + time*60) % (W+40) - 20, y = (i*53 + time*520) % (H+40) - 20;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x-5, y+14); ctx.stroke();
    }
    ctx.fillStyle = 'rgba(40,60,110,.12)'; ctx.fillRect(0,0,W,H);
    if (evento.rayo > 0){ ctx.fillStyle = 'rgba(255,255,255,' + (evento.rayo*.5).toFixed(2) + ')'; ctx.fillRect(0,0,W,H); }
    ctx.restore();
  }
  if (evento.apagonT > 0){
    const r = 125, x = pamela.x, y = pamela.y - 30;
    ctx.save(); ctx.beginPath(); ctx.rect(0,0,W,H); ctx.arc(x, y, r, 0, Math.PI*2);
    ctx.fillStyle = 'rgba(2,2,10,.96)'; ctx.fill('evenodd');
    const g = ctx.createRadialGradient(x, y, r*.6, x, y, r); g.addColorStop(0,'rgba(4,4,16,0)'); g.addColorStop(1,'rgba(2,2,10,.96)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI*2); ctx.fill();
    ctx.restore();
  }
  if (evento.tipo){
    const txt = EVENTOS[evento.tipo].n; ctx.font = '8px '+FONT;
    const w = ctx.measureText(txt).width + 16;
    fillRR(8, 78, w, 20, 10, 'rgba(0,0,0,.55)'); ctx.fillStyle = '#fff'; ctx.textAlign = 'left'; ctx.fillText(txt, 16, 92);
  }
}

function spawn(){
  if (elite.bar) return;
  const free = tables.filter(t => !t.student && t.cooldown <= 0);
  if (!free.length) return;
  const t = pick(free), c = cfg(), n = randInt(c.minItems, c.maxItems);
  // casi siempre piden lo que hay; a veces piden algo agotado
  const avail = shuffle([0,1,2,3,4,5].filter(i => stock[i] > 0)), all = shuffle([0,1,2,3,4,5]), order = [];
  while (order.length < n){
    const src = (Math.random() < .85 && avail.some(i => !order.includes(i))) ? avail : all;
    order.push(src.find(i => !order.includes(i)));
  }
  t.student = {order, orig:order.slice(), patience:1, maxTime:(c.patience + n*2.5)*evPac(), petted:false,
    state:'sit', t:0, age:0, say:null, quejo:false, shake:0, skin:pick(PIELES), shirt: evento.tipo === 'partido' && Math.random() < .65 ? '#f7d117' : pick(CAMISAS), hair:pick(PELOS), cap:pick(CAMISAS), style:randInt(0,4)};
  SFX.llama();
  if (pamela.at === t) refreshStatus();
}
/* =========================================================
   MODO ÉLITE: llega un cliente VIP, el estanco se vuelve lounge
   ========================================================= */
const elite = {on:false, bar:false, fade:0, timer:40};
const ING_COLOR = ['#d8f3ff','#e9f25a','#4caf50','#ffcc33','#c47a2c','#d6204a'];
const ING_PASO = ['Agrega hielo', 'Exprime el limón', 'Machaca la hierbabuena', 'Echa el jugo de piña', 'Sirve el licor', 'Pon la cereza'];
const JARS = INGREDIENTES.map((it,i) => ({x: 250 + i*76, y: 470}));
const BAR_FX = {x: 380, y: 200};
function setMode(m){
  document.body.classList.toggle('elite', m === 'elite');
  PRODUCTS.forEach((p,i) => {
    const b = $('p'+i), it = m === 'elite' ? INGREDIENTES[i] : p;
    b.querySelector('.emo').textContent = it.e; b.querySelector('.nom').textContent = it.n;
    b.classList.toggle('coctel', m === 'elite');
  });
  updateStockUI();
}
function newCoctel(s){ s.coctel = pick(COCTELES); s.prog = 0; s.order = s.coctel.r.slice(); s.added = []; }
function spawnElite(){
  elitesDia++;
  const free = tables.filter(t => !t.student && t.cooldown <= 0 && t !== pamela.at && t !== pamela.target);
  if (!free.length){ elite.timer = 3; return; }
  const t = pick(free);
  const s = {elite:true, order:[], added:[], patience:1, maxTime: Math.max(24, 34 - level), petted:false, drinks: 2 + (level >= 3 ? 1 : 0),
    state:'sit', t:0, age:0, say:null, quejo:false, shake:0, skin:pick(PIELES), shirt:'#1b1b24', hair:pick(PELOS), cap:'#000', style:0};
  newCoctel(s); t.student = s; elite.on = true;
  SFX.vip(); addFloat('💎 ¡Cliente élite en la mesa ' + t.key.toUpperCase() + '!', W/2, H/2-40, '#ffe9a8', true);
  announce('Llegó un cliente élite a la mesa ' + t.key.toUpperCase() + '. Ve a atenderlo para prepararle cocteles');
}
function enterBar(s){
  elite.bar = true; s.patience = 1; s.maxTime = Math.max(40, 66 - level*2); s.say = null; s.quejo = true;
  setMode('elite'); SFX.vip();
  setTimeout(() => addFloat('Quiero un ' + s.coctel.n + ' ' + s.coctel.e, BAR_FX.x, BAR_FX.y, '#ffe9a8', true), 350);
  announce('Barra de cocteles. El cliente quiere un ' + s.coctel.n + '. Toca Ver receta para saber cómo se prepara');
  refreshStatus(); syncButtons();
  let visto = false; try { visto = localStorage.getItem('estanco-barra-vista') === '1'; localStorage.setItem('estanco-barra-vista', '1'); } catch(e){}
  if (!visto) setTimeout(() => { if (elite.bar && state === 'play') openRecipe(); }, 900);
}
function exitBar(){
  elite.bar = false; setMode('normal'); $('receta-dlg').hidden = true; document.body.classList.remove('agitando');
  addFloat('De vuelta al estanco 🍺', W/2, H/2-40, '#fff4c2', true);
  refreshStatus(); syncButtons();
}
function endElite(){
  if (elite.bar) exitBar();
  elite.on = false; elite.timer = rand(55, 85) * (1.3 - .1*estrellas()); spawnTimer = Math.min(spawnTimer, 1.2);
}
function openRecipe(){
  const s = servingStudent(); if (!elite.bar || !s || !s.elite) return;
  pressFx('receta');
  $('t-receta').textContent = '📖 ' + s.coctel.n + ' ' + s.coctel.e;
  $('receta-pasos').innerHTML = s.coctel.r.map((i,k) =>
    '<li class="' + (k < s.prog ? 'hecho' : k === s.prog ? 'ahora' : '') + '">' + ING_PASO[i] + ' ' + INGREDIENTES[i].e + ' <small>(botón ' + (i+1) + ')</small></li>').join('') +
    '<li class="' + (s.shaking ? 'ahora' : '') + '">Agita la coctelera 🍸 <small>(botón ¡Agitar! o Espacio, varias veces)</small></li>';
  $('receta-dlg').hidden = false; $('btn-cerrar-receta').focus();
}
function closeRecipe(){ $('receta-dlg').hidden = true; }
function deliverElite(i, t, s){
  t = BAR_FX;
  if (i === s.order[0]){
    s.order.shift(); s.prog++; s.added.push(i); SFX.ok();
    addFloat(INGREDIENTES[i].e + '✔', 390, 220, '#7dffa8');
    if (!s.order.length){
      s.shaking = true; s.shakes = 0; s.need = 6 + Math.min(4, level - 1);
      document.body.classList.add('agitando'); SFX.vip();
      addFloat('¡Ahora agita! 🍸', 390, 190, '#ffe9a8', true);
      announce('Ahora agita la coctelera: toca Agitar varias veces o la barra espaciadora');
      refreshStatus();
    } else refreshStatus();
  } else {
    s.patience -= .12; s.shake = .35; SFX.mal();
    s.order = s.coctel.r.slice(); s.prog = 0; s.added = [];
    addFloat('✖ ¡Se dañó el coctel!', 390, 220, '#ff8080');
    announce('Ingrediente equivocado: el ' + s.coctel.n + ' empieza otra vez');
    refreshStatus();
  }
}
const agitar = {wob:0};
function shake(){
  if (state !== 'play' || !elite.bar) return;
  const s = servingStudent(); if (!s || !s.elite || !s.shaking) return;
  audio(); pressFx('agitar'); SFX.agita(); agitar.wob = 1;
  s.shakes++;
  if (s.shakes >= s.need){ s.shaking = false; document.body.classList.remove('agitando'); finishCoctel(s); }
  else refreshStatus();
}
function finishCoctel(s){
  const t = BAR_FX;
  {
    {
      const pay = Math.round(s.coctel.p*(0.7 + 0.6*Math.max(0,s.patience))/100)*100;
      money += pay; orders++; s.drinks--; SFX.plata();
      addFloat(s.coctel.e + ' ' + s.coctel.n + ' +' + fmt(pay), t.x, t.y, '#ffe066');
      announce(s.coctel.n + ' listo. Ganaste ' + fmt(pay));
      if (s.drinks > 0){ newCoctel(s); s.patience = 1; afterOrder(); setTimeout(() => addFloat('Ahora un ' + s.coctel.n + ' ' + s.coctel.e, t.x, t.y+40, '#ffe9a8', true), 700); }
      else {
        const propina = Math.round(15000*(.6 + .2*estrellas())/1000)*1000; money += propina;
        cambiarRep(6, t.x, t.y + 30);
        addFloat('💎 Propina +' + fmt(propina), t.x, t.y-30, '#ffe9a8');
        s.state = 'happy'; s.t = 0; afterOrder();
      }
    }
  }
}
function afterOrder(){
  if (orders === metaDia()){ setTimeout(SFX.meta, 300); addFloat('🎯 ¡Meta cumplida!', W/2, H/2-70, '#b8ffcf', true); announce('¡Cumpliste la meta del día!'); }
  if (orders % 5 === 0){
    level++; setTimeout(SFX.nivel, 350);
    addFloat('¡Nivel ' + level + '!', W/2, H/2, '#ffd1e0', true);
    announce('Subiste al nivel ' + level);
  }
  updateHUD(); refreshStatus(); syncButtons();
}

function servingStudent(){
  const s = pamela.at && pamela.at.student;
  return s && s.state === 'sit' ? s : null;
}
function deliver(i){
  if (state !== 'play' || overT > 0) return;
  audio(); pressFx('p'+i);
  if (elite.bar){
    if (!$('receta-dlg').hidden){ SFX.nada(); return; }
    const s = servingStudent();
    if (s && s.elite && s.shaking){ SFX.nada(); addFloat('¡Agita la coctelera! 🍸', 390, 190, '#ffe9a8'); return; }
    if (s && s.elite) deliverElite(i, null, s);
    return;
  }
  const s = servingStudent();
  if (!pamela.at){ SFX.nada(); addFloat(pamela.target ? 'Ya va…' : '¡Toca una mesa!', pamela.x, pamela.y-80, '#fff1c9'); return; }
  if (!s){ SFX.nada(); addFloat('Mesa vacía', pamela.x, pamela.y-80, '#fff1c9'); return; }
  const t = pamela.at, k = s.order.indexOf(i);
  if (s.elite){ deliverElite(i, t, s); return; }
  if (stock[i] <= 0){ SFX.nada(); addFloat('¡No hay ' + PRODUCTS[i].n + '!', t.cx, t.cy-130, '#ffd1e0'); announce('Se acabó ' + PRODUCTS[i].n); return; }
  if (k >= 0){
    s.order.splice(k, 1); SFX.ok(); stock[i]--; updateStockUI();
    addFloat('✔', t.cx, t.cy-130, '#7dffa8');
    if (!s.order.length) complete(t, s); else refreshStatus();
    if (totalStock() === 0 && overT <= 0){ endReason = 'stock'; overT = 1.6; addFloat('¡Se vendió todo!', W/2, H/2-30, '#ffe066', true); }
  } else {
    s.patience -= .15; s.shake = .35; SFX.mal(); if (Math.random() < .6) setTimeout(() => s.state==='sit' && say(s, EQUIVOCADO), 200);
    addFloat('✖ ' + PRODUCTS[i].e, t.cx, t.cy-130, '#ff8080');
    announce('Eso no lo pidió');
  }
}
function complete(t, s){
  const base = s.orig.reduce((a,i)=>a+PRODUCTS[i].p, 0);
  const pay = Math.round(base*(0.6 + 0.9*Math.max(0,s.patience))*pagoPorEstrellas()/100)*100;
  money += pay; orders++;
  s.state = 'happy'; s.t = 0;
  cambiarRep(s.patience > .6 ? 2.5 : s.patience > .3 ? 1.5 : .5, t.cx + 30, t.cy - 110);
  SFX.plata(); addFloat('+' + fmt(pay), t.cx, t.cy-150, '#ffe066');
  announce('¡Pedido listo! Ganaste ' + fmt(pay));
  afterOrder();
}
function meseroBusy(t){ return mesero.contratado && (mesero.job === t); }
function updateMesero(dt){
  const m = mesero;
  if (!m.contratado || state !== 'play' || elite.bar) { m.moving = false; return; }
  const lvl = m.nivel;
  // si Pamela llega a esa mesa, Juancho la suelta
  if (m.job && (pamela.target === m.job || pamela.at === m.job || !m.job.student || m.job.student.state !== 'sit' || m.job.student.elite)){
    m.job = null; m.at = null; m.serveT = 0; m.path = [];
  }
  if (!m.job){
    const libres = tables.filter(t => t.student && t.student.state === 'sit' && !t.student.elite && t !== pamela.at && t !== pamela.target
      && t.student.order.every(i => stock[i] > 0));
    if (libres.length){
      libres.sort((a,b) => a.student.patience - b.student.patience);
      m.job = libres[0]; m.at = null; m.serveT = 0;
      m.path = routeFrom(m.x, m.y, m.job.spotX + 24, m.job.spotY);
    } else if (!m.path.length && Math.hypot(m.x-700, m.y-HY) > 1) m.path = routeFrom(m.x, m.y, 700, HY);
  }
  if (m.path.length){
    let move = (80 + 20*lvl)*dt; const ox = m.x;
    while (move > 0 && m.path.length){
      const p = m.path[0], d = Math.hypot(p.x-m.x, p.y-m.y);
      if (d <= move){ m.x = p.x; m.y = p.y; move -= d; m.path.shift(); }
      else { m.x += (p.x-m.x)/d*move; m.y += (p.y-m.y)/d*move; move = 0; }
    }
    m.moving = true; m.walkT += dt; if (Math.abs(m.x-ox) > .05) m.facing = Math.sign(m.x-ox);
    if (!m.path.length && m.job) m.at = m.job;
    return;
  }
  m.moving = false;
  if (m.job && m.at === m.job){
    const t = m.job, s = t.student;
    m.facing = 1;
    m.serveT += dt;
    const porItem = Math.max(1.4, 4.2 - .55*lvl);           // segundos por producto
    if (m.serveT >= porItem){
      m.serveT = 0;
      const i = s.order[0];
      if (stock[i] <= 0){ m.job = null; m.at = null; return; }
      s.order.shift(); stock[i]--; updateStockUI(); SFX.ok();
      addFloat('✔', t.cx, t.cy-130, '#7dffa8');
      if (!s.order.length){
        complete(t, s); addFloat('Juancho 👍', t.cx, t.cy-170, '#bff3ff');
        m.job = null; m.at = null;
        if (totalStock() === 0 && overT <= 0){ endReason = 'stock'; overT = 1.6; addFloat('¡Se vendió todo!', W/2, H/2-30, '#ffe066', true); }
      }
    }
  }
}
function drawMesero(){
  const m = mesero; if (!m.contratado) return;
  const ph = m.walkT*11, bob = m.moving ? Math.abs(Math.sin(ph))*2 : 0;
  ell(m.x, m.y, 15, 5, 'rgba(0,0,0,.25)');
  ctx.save(); ctx.translate(m.x, m.y - bob); ctx.scale(m.facing, 1);
  const a = m.moving ? Math.max(0, Math.sin(ph))*3 : 0, b = m.moving ? Math.max(0, -Math.sin(ph))*3 : 0;
  ctx.fillStyle = '#22222a'; ctx.fillRect(-7,-24,6,22-a); ctx.fillRect(1,-24,6,22-b);
  ell(-4,-2-a,4.5,2.6,'#111'); ell(4,-2-b,4.5,2.6,'#111');
  fillRR(-10,-44,20,22,6,'#ffffff');
  fillRR(-8,-34,16,16,3,'#2f6f4f');                          // delantal verde
  ctx.fillStyle = '#7a1230'; ctx.beginPath(); ctx.moveTo(-4,-44); ctx.lineTo(0,-40); ctx.lineTo(4,-44); ctx.closePath(); ctx.fill();   // corbatín
  // brazo con bandeja
  fillRR(8,-42,5,14,3,'#c98e62');
  ctx.fillStyle = '#c9ced4'; ctx.beginPath(); ctx.ellipse(16,-44,11,3,0,0,Math.PI*2); ctx.fill();
  ctx.fillStyle = C.botella; ctx.fillRect(12,-58,5,12); ctx.fillStyle = C.tapa; ctx.fillRect(12,-59,5,2);
  // cabeza
  ctx.fillStyle = '#b07b52'; ctx.fillRect(-2.5,-48,5,5);
  ell(0,-55,10.5,11.5,'#c98e62');
  ctx.fillStyle = '#1d120c'; ctx.beginPath(); ctx.arc(0,-57,11,Math.PI,0); ctx.fill(); fillRR(-11,-60,6,8,3,'#1d120c');
  circ(-3.5,-54,1.6,'#1a1010'); circ(3.5,-54,1.6,'#1a1010');
  ctx.strokeStyle = '#1a1010'; ctx.lineWidth = 1.4; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(0,-50,3,Math.PI*.15,Math.PI*.85); ctx.stroke();
  ctx.restore();
  // nombre y nivel
  ctx.font = '7px '+FONT; ctx.textAlign = 'center'; ctx.lineWidth = 3; ctx.strokeStyle = '#3d1f08';
  const tag = 'Juancho Nv' + m.nivel; ctx.strokeText(tag, m.x, m.y-76); ctx.fillStyle = '#bff3ff'; ctx.fillText(tag, m.x, m.y-76);
  // progreso mientras atiende
  if (m.at && m.job){
    const porItem = Math.max(1.4, 4.2 - .55*m.nivel), p = Math.min(1, m.serveT/porItem);
    ctx.strokeStyle = 'rgba(0,0,0,.3)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(m.x+18, m.y-66, 7, 0, Math.PI*2); ctx.stroke();
    ctx.strokeStyle = '#7de3ff'; ctx.beginPath(); ctx.arc(m.x+18, m.y-66, 7, -Math.PI/2, -Math.PI/2 + p*Math.PI*2); ctx.stroke();
  }
}
function pet(){
  if (state !== 'play' || overT > 0) return;
  audio(); pressFx('pet');
  const s = servingStudent();
  if (!s){ SFX.nada(); addFloat(pamela.at ? 'Mesa vacía' : '¡Toca una mesa!', pamela.x, pamela.y-80, '#fff1c9'); bark(); return; }
  if (s.petted){ SFX.nada(); addFloat('Ya lo acariciaste', pamela.at.cx, pamela.at.cy-130, '#fff1c9'); return; }
  s.petted = true; s.patience = Math.min(1, s.patience + .25);
  maxi.petT = 1; SFX.mimo(); setTimeout(bark, 250);
  addFloat('💖', pamela.at.cx, pamela.at.cy-130, '#ffb3cf');
  syncButtons();
}
let musicT = 0, step = 0;
/* =========================================================
   TUS CANCIONES
   Pon los MP3 en una carpeta "musica" junto a index.html y escríbelos aquí, por ejemplo:
   const CANCIONES = ['musica/cancion1.mp3', 'musica/cancion2.mp3'];
   Si la lista está vacía suena la base del bafle. También se pueden escoger desde el botón 🎵.
   ========================================================= */
const CANCIONES = [];
let playlist = CANCIONES.slice(), songIdx = 0;
const player = new Audio(); player.volume = .55;
player.addEventListener('ended', () => nextSong());
function playSong(){
  if (!playlist.length || state !== 'play') return;
  player.src = playlist[songIdx % playlist.length]; player.muted = muted;
  player.play().catch(() => {});
}
function nextSong(){ if (!playlist.length) return; songIdx = (songIdx + 1) % playlist.length; playSong(); }
function songsOn(){ return playlist.length > 0 && !player.paused; }
const BAJO = [55, 55, 65.4, 73.4, 55, 55, 82.4, 73.4];
function music(dt){
  beat = Math.max(0, beat - dt*4);
  notes.forEach(n => { n.life -= dt*0.7; n.y -= 30*dt; n.x += Math.sin(n.life*6)*0.4; });
  notes = notes.filter(n => n.life > 0);
  if (state !== 'play') return;
  musicT -= dt;
  if (musicT > 0) return;
  if (evento.apagonT > 0 && !elite.bar){ musicT += .3; return; }
  if (songsOn()){
    musicT += .47; beat = 1;
    notes.push({ch: pick(['♪','♫','♬']), x: 672 + rand(-14,14), y: 486, life: 1, c: pick(['#ffd54a','#ff7ab6','#7de3ff','#b8ff7d'])});
    return;
  }
  if (elite.bar){
    musicT += .34; const k = step % 8, ch = [[220,277,330],[196,247,294],[175,220,262],[196,247,311]][(step/8|0)%4];
    if (k === 0){ ch.forEach(f => tone(f, 1.1, 'sine', .03)); beat = 1; }
    if (k % 2 === 0) tone(ch[0]/2, .3, 'triangle', .05);
    if (k === 3 || k === 6) tone(ch[2]*2, .18, 'sine', .025);
    if (k % 4 === 0) notes.push({ch: pick(['♪','♫']), x: 672 + rand(-14,14), y: 486, life: 1, c: pick(['#ffe9a8','#d4a72c','#c9a0ff'])});
    step++; return;
  }
  musicT += Math.max(.19, .26 - level*.008);
  const k = step % 8;
  if (k % 4 === 0){ tone(110,.13,'sine',.11,0,-70); beat = 1; }
  if (k % 4 === 2) tone(1800,.03,'square',.012);
  if (k % 2 === 0) tone(BAJO[(step/2|0) % 8], .2, 'triangle', .05);
  if (k === 6 && Math.random() < .5) tone(BAJO[(step/2|0)%8]*4, .1, 'square', .02);
  if (k % 4 === 0) notes.push({ch: pick(['♪','♫','♬']), x: 672 + rand(-14,14), y: 486, life: 1, c: pick(['#ffd54a','#ff7ab6','#7de3ff','#b8ff7d'])});
  step++;
}
function update(dt){
  time += dt;
  music(dt);
  if (state === 'play'){
    tJuego += dt; tDia += dt;
    if (tJuego > 15) sumarTiempo();
    if (overT > 0){ overT -= dt; if (overT <= 0) gameOver(); }
    else {
      const busy = tables.filter(t => t.student).length;
      if (busy === 0) spawnTimer = Math.min(spawnTimer, .6);
      spawnTimer -= dt;
      if (spawnTimer <= 0){ spawn(); spawnTimer = cfg().interval * rand(.7, 1.3) * evMult() * llegadaPorEstrellas(); }
      if (!elite.bar){
        spillTimer -= dt;
        if (spillTimer <= 0){ if (spills.length < 6) addSpill(); spillTimer = rand(7, 12) * Math.max(.5, 1 - level*.06); }
        if (!elite.on){ elite.timer -= dt; if (elite.timer <= 0) spawnElite(); }
        const a = pamela.at && pamela.at.student;
        if (a && a.elite && a.state === 'sit') enterBar(a);
      }
    }
    for (const t of tables){
      if (elite.bar && !(t.student && t.student.elite)) continue;   // afuera el tiempo se congela mientras estás en la barra
      t.cooldown -= dt;
      const s = t.student; if (!s) continue;
      s.age += dt; s.shake = Math.max(0, s.shake - dt);
      if (s.say){ s.say.t -= dt; if (s.say.t <= 0) s.say = null; }
      if (s.state === 'sit' && !s.quejo && s.patience < .38){ s.quejo = true; say(s, IMPACIENTE); }
      if (s.state === 'sit'){
        if (overT <= 0) s.patience -= dt / s.maxTime * (elite.bar ? 1 : 1 + spills.length*0.08);
        if (s.patience <= 0){
          s.patience = 0; s.state = 'angry'; s.t = 0; hearts--; cambiarRep(s.elite ? -9 : -5, t.cx + 30, t.cy - 110); s.say = {txt: pick(s.elite ? BRAVO_ELITE : BRAVO), t: 2.4}; announce(s.say.txt); if (!s.elite && Math.random() < .5) addSpill({x:t.spotX, y:t.cy + (t.cy < HY ? 32 : -32)});
          SFX.bravo(); if (elite.bar && s.elite){ addFloat('😡 ' + s.say.txt, BAR_FX.x, BAR_FX.y, '#ff8080'); } else addFloat('😡', t.cx, t.cy-130, '#ff8080');
          updateHUD(); announce('Un cliente se puso bravo. Quedan ' + hearts + ' intentos');
          if (pamela.at === t) refreshStatus();
          if (hearts <= 0 && overT <= 0){ endReason = 'hearts'; overT = 1.5; }
        }
      } else {
        s.t += dt;
        if (s.t > (s.state==='angry' ? 2 : 1.1)){ t.student = null; t.cooldown = rand(1.2, 2.6); if (s.elite) endElite(); if (pamela.at === t){ refreshStatus(); syncButtons(); } }
      }
    }
  }
  elite.fade += ((elite.bar ? 1 : 0) - elite.fade) * Math.min(1, dt*3);
  updateNucita(dt); updateMaxi(dt); updateTono(dt); updateMesero(dt); updateEvento(dt);
  agitar.wob = Math.max(0, agitar.wob - dt*3);
  spills.forEach(sp => sp.age += dt);
  floats.forEach(f => { f.life -= dt; f.y -= (f.big ? 18 : 34)*dt; });
  floats = floats.filter(f => f.life > 0);
}

/* =========================================================
   DIBUJO: la barra de cocteles (cuando atiendes al cliente élite)
   ========================================================= */
const bgBar = document.createElement('canvas'); bgBar.width = W*2; bgBar.height = H*2;
function buildBgBar(){
  const g = bgBar.getContext('2d'); g.setTransform(2,0,0,2,0,0);
  const wg = g.createLinearGradient(0,0,0,340); wg.addColorStop(0,'#1a0a24'); wg.addColorStop(1,'#3a1c48');
  g.fillStyle = wg; g.fillRect(0,0,W,340);
  // estanterías con botellas
  const cols = ['#c47a2c','#2e8b57','#d6204a','#e9e2c0','#3e7fd0','#f2b33d','#8a4bd1'];
  [110,190].forEach((y,r) => {
    g.fillStyle = '#d4a72c'; g.fillRect(60,y,600,6);
    for (let i=0;i<16;i++){ const x = 76 + i*36, h = 34 + ((i*7+r*3)%3)*8, c = cols[(i+r*2)%cols.length];
      g.fillStyle = c; rr(x, y-h, 18, h, 4, g); g.fill(); g.fillRect(x+6, y-h-10, 6, 12);
      g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(x+3, y-h+4, 3, h-10);
      g.fillStyle = '#fff3c4'; g.fillRect(x+3, y-h/2, 12, 8); }
  });
  // espejo dorado y letrero
  g.fillStyle = '#d4a72c'; rr(196,10,328,46,10,g); g.fill();
  g.fillStyle = '#12061a'; rr(200,14,320,38,8,g); g.fill();
  g.fillStyle = '#ffe9a8'; g.font = '12px '+FONT; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('✦ Barra de Cocteles ✦', 360, 34); g.textBaseline = 'alphabetic';
  // piso
  g.fillStyle = '#20101e'; g.fillRect(0,340,W,H-340);
  for (let x=0; x<W; x+=40){ g.fillStyle = (x/40)%2 ? '#2a1428' : '#1c0c1a'; g.fillRect(x,340,40,H-340); }
}
buildBgBar();
function drawBar(){
  ctx.drawImage(bgBar, 0, 0, W, H);
  const s = servingStudent(), el = s && s.elite ? s : (pamela.at && pamela.at.student && pamela.at.student.elite ? pamela.at.student : null);
  // Pamela grande detrás de la barra
  const sv = {x:pamela.x, y:pamela.y, facing:pamela.facing, moving:pamela.moving, slipT:pamela.slipT};
  ctx.save(); ctx.translate(560, 410); ctx.scale(1.9, 1.9);
  Object.assign(pamela, {x:0, y:0, facing:-1, moving:false, slipT:0}); drawPamela(); Object.assign(pamela, sv);
  ctx.restore();
  // mesón
  fillRR(170, 396, 560, 26, 8, '#8a5a32'); fillRR(170, 396, 560, 7, 4, 'rgba(255,255,255,.16)');
  fillRR(180, 422, 540, 160, 0, '#5a3218');
  ctx.fillStyle = '#d4a72c'; ctx.fillRect(180, 422, 540, 4);
  for (let x = 220; x < 720; x += 70){ ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.fillRect(x, 432, 3, 150); }
  // vaso grande con capas de colores (se esconde mientras agitas)
  const gx = 390, gy = 398, gw = 84, gh = 150, lh = 26;
  if (!(el && el.shaking)){
  ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.fillRect(gx-gw/2, gy-gh, gw, gh);
  if (el) el.added.forEach((i,k) => {
    ctx.fillStyle = ING_COLOR[i]; ctx.fillRect(gx-gw/2+3, gy-3-(k+1)*lh, gw-6, lh);
    ctx.font = '16px '+EMOJI; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(INGREDIENTES[i].e, gx, gy-3-(k+.5)*lh); ctx.textBaseline = 'alphabetic';
  });
  ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 3.5;
  ctx.beginPath(); ctx.moveTo(gx-gw/2, gy-gh); ctx.lineTo(gx-gw/2, gy); ctx.lineTo(gx+gw/2, gy); ctx.lineTo(gx+gw/2, gy-gh); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.3)'; ctx.fillRect(gx-gw/2+7, gy-gh+8, 6, gh-20);
  // pajita y rodaja
  ctx.strokeStyle = '#ff6fa8'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(gx+18, gy-40); ctx.lineTo(gx+34, gy-gh-26); ctx.stroke();
  }
  if (el && el.shaking){
    const rot = Math.sin(time*38) * (.08 + .3*agitar.wob), dy = -Math.abs(Math.sin(time*38))*12*agitar.wob;
    ctx.save(); ctx.translate(gx, gy - 20 + dy); ctx.rotate(rot);
    const sg = ctx.createLinearGradient(-36,0,36,0); sg.addColorStop(0,'#8c99a6'); sg.addColorStop(.4,'#eef3f7'); sg.addColorStop(1,'#7d8994');
    ctx.fillStyle = sg; ctx.beginPath(); ctx.moveTo(-34,0); ctx.lineTo(34,0); ctx.lineTo(26,-120); ctx.lineTo(-26,-120); ctx.closePath(); ctx.fill();
    fillRR(-28,-136,56,18,6,'#b9c4ce'); fillRR(-12,-156,24,22,8,'#a6b2bc'); circ(0,-160,6,'#d4a72c');
    ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fillRect(-22,-112,6,100);
    ctx.restore();
    const p = el.shakes / el.need;
    fillRR(gx-70, 470, 140, 14, 7, 'rgba(255,255,255,.2)'); fillRR(gx-70, 470, Math.max(4, 140*p), 14, 7, '#7dffa8');
    ctx.font = '10px '+FONT; ctx.fillStyle = '#ffe9a8'; ctx.textAlign = 'center'; ctx.fillText('¡Agita! ' + el.shakes + '/' + el.need, gx, 500);
  }
  if (el){
    ctx.font = '11px '+FONT; ctx.fillStyle = '#ffe9a8'; ctx.textAlign = 'center';
    ctx.fillText(el.coctel.e + ' ' + el.coctel.n + ' · paso ' + Math.min(el.prog+1, el.coctel.r.length) + ' de ' + el.coctel.r.length, gx, 456);
  }
  // cliente élite grande en su butaca
  if (el){
    ctx.save(); ctx.translate(100, 586); ctx.scale(1.6, 1.6);
    fillRR(-20, -6, 40, 10, 4, '#d4a72c');
    drawStudent({id:9, cx:0, cy:0, key:'', student:el}, true);
    ctx.restore();
    const txt = el.state === 'sit' ? 'Quiero un ' + el.coctel.n + ' ' + el.coctel.e : el.state === 'happy' ? '¡Delicioso! 💎' : 'Nahh, me voy…';
    ctx.font = '10px '+FONT; const bw = Math.max(170, ctx.measureText(txt).width + 30), bx = 12, by = 300;
    rr(bx, by, bw, 50, 12); ctx.fillStyle = '#fff'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#d4a72c'; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(bx+60, by+50); ctx.lineTo(bx+72, by+64); ctx.lineTo(bx+84, by+50); ctx.fillStyle = '#fff'; ctx.fill(); ctx.stroke();
    ctx.fillRect(bx+58, by+46, 28, 5);
    ctx.fillStyle = '#2a1238'; ctx.textAlign = 'left'; ctx.fillText(txt, bx+14, by+22);
    if (el.state === 'sit'){
      const p = Math.max(0, el.patience);
      fillRR(bx+14, by+32, bw-28, 8, 4, 'rgba(40,10,20,.25)');
      fillRR(bx+14, by+32, Math.max(2,(bw-28)*p), 8, 4, p>.6 ? C.pacBien : p>.3 ? C.pacMedio : C.pacMal);
      if (el.drinks > 1){ ctx.font = '8px '+FONT; ctx.fillStyle = '#ffe9a8'; ctx.fillText('Cocteles que faltan: ' + el.drinks, bx+2, by-10); }
    }
  }
  // Nucita acompañando
  const mv = {x:maxi.x, y:maxi.y, facing:maxi.facing, moving:maxi.moving};
  ctx.save(); ctx.translate(672, 574); ctx.scale(1.4, 1.4);
  Object.assign(maxi, {x:0, y:0, facing:-1, moving:false}); drawMaxi(); Object.assign(maxi, mv);
  ctx.restore();
  // aviso de la receta
  if (el && el.state === 'sit' && !el.shaking && $('receta-dlg').hidden){
    ctx.font = '9px '+FONT; ctx.textAlign = 'center'; ctx.globalAlpha = .6 + Math.sin(time*5)*.4;
    ctx.fillStyle = '#ffe9a8'; ctx.fillText('📖 Mira la receta (R) y usa los botones de abajo', 420, 520); ctx.globalAlpha = 1;
  }
}

/* =========================================================
   RENDER
   ========================================================= */
function render(){
  ctx.setTransform(scale,0,0,scale,0,0);
  ctx.drawImage(bg, 0, 0, W, H);
  drawEstrellasLetrero();
  drawLuces();
  drawSpills();
  const list = [];
  tables.forEach(t => { list.push({y:t.cy-40, f:()=>drawStudent(t)}); list.push({y:t.cy, f:()=>drawTable(t)}); });
  list.push({y:pamela.y+0.5, f:drawPamela});
  list.push({y:maxi.y+0.4, f:drawMaxi});
  list.push({y:570, f:drawBafle});
  list.push({y:tono.y+0.3, f:drawTono});
  list.push({y:mesero.y+0.2, f:drawMesero});
  list.sort((a,b) => a.y - b.y).forEach(o => o.f());
  drawEventoFondo();
  tables.forEach(drawBubble);
  tables.forEach(drawSay);
  drawNotes();
  drawMaxiHearts();
  if (elite.fade >= .5) drawBar();
  const dark = 1 - Math.abs(elite.fade - .5)*2;
  if (dark > .02){ ctx.fillStyle = 'rgba(10,4,16,' + dark.toFixed(3) + ')'; ctx.fillRect(0,0,W,H); }
  drawFloats();
}
let last = performance.now();
function loop(now){
  const dt = Math.min(.05, (now - last)/1000); last = now;
  if (state !== 'pause') update(dt);
  render();
  requestAnimationFrame(loop);
}

/* =========================================================
   INTERFAZ: HUD, botones, estado, pantallas
   ========================================================= */
const $ = id => document.getElementById(id);
const prodBox = $('productos');
PRODUCTS.forEach((p,i) => {
  const b = document.createElement('button');
  b.className = 'prod idle'; b.id = 'p'+i;
  b.setAttribute('aria-label', 'Entregar ' + p.n + ', tecla ' + (i+1));
  b.innerHTML = '<kbd>'+(i+1)+'</kbd><span class="stock" id="st'+i+'">x0</span><span class="emo" aria-hidden="true">'+p.e+'</span><span class="nom">'+p.n+'</span>';
  b.addEventListener('click', () => deliver(i));
  prodBox.appendChild(b);
});
$('pet').addEventListener('click', pet);
function updateStockUI(){
  const modoElite = document.body.classList.contains('elite');
  PRODUCTS.forEach((p,i) => {
    const b = $('p'+i), n = stock[i];
    $('st'+i).textContent = n > 0 ? 'x' + n : 'Agotado';
    b.classList.toggle('agotado', !modoElite && n <= 0); b.classList.toggle('poco', !modoElite && n > 0 && n <= 2);
    b.setAttribute('aria-label', modoElite ? 'Poner ' + INGREDIENTES[i].n + ', tecla ' + (i+1) : 'Entregar ' + p.n + ', tecla ' + (i+1) + ', quedan ' + n);
  });
}

function updateHUD(){
  $('money').textContent = fmt(money);
  $('level').textContent = 'D' + dia + ' · Nv' + level;
  $('meta').textContent = '🎯 ' + orders + '/' + metaDia();
  $('meta').setAttribute('aria-label', 'Meta del día: ' + orders + ' de ' + metaDia() + ' pedidos');
  const h = Math.max(0, hearts);
  $('hearts').textContent = '❤️'.repeat(h) + '🤍'.repeat(5-h);
  $('estrellas').textContent = textoEstrellas(estrellas());
  $('estrellas').setAttribute('aria-label', 'Estrellas del estanco: ' + estrellas() + ' de 5');
  $('hearts').setAttribute('aria-label', 'Intentos que quedan: ' + h);
}
let lastStatus = '';
function setStatus(txt){ if (txt !== lastStatus){ lastStatus = txt; $('status').textContent = txt; } }
function refreshStatus(){
  if (!pamela.at){ if (!pamela.target) setStatus('Toca una mesa para atender'); return; }
  const s = servingStudent(), K = pamela.at.key.toUpperCase();
  if (s && s.elite && s.shaking){ setStatus('🍸 ¡Agita! ' + s.shakes + ' de ' + s.need + ' · toca ¡Agitar! o Espacio'); return; }
  if (s && s.elite){ setStatus(elite.bar ? '💎 Prepara un ' + s.coctel.n + ' · paso ' + (s.prog+1) + ' de ' + s.coctel.r.length + ' · 📖 Ver receta (R)' : '💎 Cliente élite: espera que Pamela llegue'); return; }
  if (!s) setStatus('Mesa ' + K + ' vacía. Busca otra mano levantada');
  else setStatus('Mesa ' + K + ' pide: ' + s.order.map(i => PRODUCTS[i].n).join(', '));
}
function syncButtons(){
  const s = servingStudent();
  document.querySelectorAll('.prod').forEach(b => b.classList.toggle('idle', !s));
  $('pet').classList.toggle('usado', !s || s.petted);
}
function pressFx(id){ const b = $(id); if (!b) return; b.classList.add('press'); setTimeout(() => b.classList.remove('press'), 110); }
function announce(txt){ $('sr').textContent = ''; setTimeout(() => $('sr').textContent = txt, 30); }

function toggleMute(){
  muted = !muted;
  $('mute').textContent = muted ? '🔇' : '🔊';
  $('mute').setAttribute('aria-pressed', String(muted));
  $('mute').setAttribute('aria-label', muted ? 'Activar sonido' : 'Silenciar sonido');
  player.muted = muted;
}
$('mute').addEventListener('click', toggleMute);
$('musica').addEventListener('click', () => $('archivos').click());
$('archivos').addEventListener('change', e => {
  const files = [...e.target.files].filter(f => f.type.startsWith('audio'));
  if (!files.length) return;
  playlist = files.map(f => URL.createObjectURL(f)); songIdx = 0;
  announce('Se cargaron ' + files.length + ' canciones');
  if (state === 'play') playSong();
});

function reset(){
  money = 0; orders = 0; level = 1; hearts = 5; spawnTimer = .8; overT = -1; floats = []; endReason = '';
  pickEvento(); document.body.classList.remove('agitando'); tDia = 0; elitesDia = 0;
  Object.assign(elite, {on:false, bar:false, fade:0, timer:rand(30, 45) * (1.3 - .1*estrellas())}); setMode('normal'); repDia = rep; $('receta-dlg').hidden = true;
  tables.forEach(t => { t.student = null; t.cooldown = 0; });
  Object.assign(pamela, {x:360, y:HY, path:[], target:null, at:null, facing:1, moving:false, trail:[]});
  Object.assign(maxi, {x:316, y:HY, facing:1, moving:false, petT:0});
  Object.assign(pamela, {slipT:0, immuneT:0});
  Object.assign(tono, {x:HOME.x, y:HOME.y, path:[], queue:[], job:null, cleanT:0, facing:-1});
  Object.assign(mesero, {x:700, y:HY+30, path:[], job:null, at:null, serveT:0, facing:-1, moving:false});
  spills = []; spillTimer = 8;
  updateHUD(); setStatus('Toca una mesa para atender'); syncButtons();
}
function startGame(){
  if (totalStock() === 0){ openShop(); return; }
  audio(); reset(); state = 'play'; adminOn = false;
  const jug = jugadorActual(); $('marca').textContent = jug ? '👤 ' + jug.nombre : 'Estanco Nucita';
  if (evento.tipo) setTimeout(() => { addFloat(EVENTOS[evento.tipo].n, W/2, H/2-40, '#ffe9a8', true); announce(EVENTOS[evento.tipo].txt); }, 600);
  ['inicio','final','tienda','ayuda','salir'].forEach(id => $(id).hidden = true);
  playSong();
  cv.focus?.();
}
function endMessage(m){
  if (m < 40000)  return 'Noche flojita, pero el viernes se llena. ¡Ánimo, Pamela!';
  if (m < 120000) return '¡Nada mal, parce! La nevera quedó medio vacía.';
  if (m < 300000) return '¡Uy, qué berraquera! Se vendió hasta el último six-pack.';
  return '¡Pamela es la reina del barrio! Nucita se ganó su galletica.';
}
function gameOver(){
  state = 'over'; SFX.fin(); player.pause();
  const meta = metaDia(), cumplio = orders >= meta, bono = cumplio ? bonoMeta() : 0;
  const sueldo = mesero.contratado ? sueldoMesero(mesero.nivel) : 0;
  registrarDia({fecha:Date.now(), dia, vendido:money, pedidos:orders, meta, cumplio, duracion:Math.round(tDia), elites:elitesDia,
    evento: evento.tipo === 'partido' ? '⚽' : evento.tipo === 'lluvia' ? '🌧️' : '', razon:endReason, estrellas:estrellas()});
  plata += money + bono - ARRIENDO - sueldo; dia++; save();
  $('razon').textContent = endReason === 'stock' ? '¡Se vendió toda la mercancía!' : 'Cinco clientes se fueron bravos.';
  $('plata').textContent = 'Hoy vendiste ' + fmt(money) + ' en ' + orders + ' pedido' + (orders === 1 ? '' : 's');
  $('meta-res').textContent = '🎯 Meta ' + orders + '/' + meta + (cumplio ? ' ✔ Bono +' + fmt(bono) : ' ✖ Sin bono');
  const ea = estrellasDe(repDia), en = estrellas();
  $('estrellas-res').textContent = 'Estanco: ' + textoEstrellas(en) + (en > ea ? ' ¡subió!' : en < ea ? ' bajó' : '');
  $('cuentas').textContent = 'Arriendo del local -' + fmt(ARRIENDO) + (sueldo ? ' · Sueldo de Juancho -' + fmt(sueldo) : '') + ' · Plata total: ' + fmt(plata);
  $('ahorro').textContent = 'Quedan ' + totalStock() + ' productos en la nevera';
  const broke = totalStock() === 0 && plata < minCost;
  $('mensaje').textContent = broke ? 'Te quedaste sin mercancía y sin plata para surtir. Toca empezar de cero.' : endMessage(money);
  $('btn-tienda').hidden = broke; $('btn-otra').hidden = broke || totalStock() === 0; $('btn-cero2').hidden = !broke;
  $('final').hidden = false;
  (broke ? $('btn-cero2') : $('btn-tienda')).focus();
}

/* =========================================================
   PARTIDA GUARDADA: continuar o empezar una nueva
   ========================================================= */
const hayPartida = () => !!jugadorActual();
const esc = t => String(t).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function showNuevo(on){
  $('nuevo-jugador').hidden = !on;
  $('btn-cancelar-nuevo').hidden = !perfiles.lista.length;
  if (on){ $('nombre-jugador').value = ''; setTimeout(() => $('nombre-jugador').focus(), 30); }
}
function showProgress(){
  const L = $('jugadores'); L.innerHTML = '';
  perfiles.lista.forEach(j => {
    const d = leerPartida(j.id), b = document.createElement('button');
    b.className = 'jug'; b.setAttribute('role', 'radio'); b.dataset.id = j.id;
    b.setAttribute('aria-checked', String(j.id === perfiles.activo));
    const hj = leerHist(j.id);
    b.innerHTML = '<span>👤 ' + esc(j.nombre) + '</span><span class="ji">' + ((d.dia|0) > 1 ? 'Día ' + d.dia + ' · ' + fmt(d.plata|0) : 'Sin empezar') + '</span>' + ((d.dia|0) > 1 ? '<span class="ji">' + textoEstrellas(estrellasDe(typeof d.rep === 'number' ? d.rep : REP_INICIAL)) + '</span>' : '') + (hj.ultima ? '<span class="ji">Jugó ' + hace(hj.ultima) + '</span>' : '');
    L.appendChild(b);
  });
  const j = jugadorActual();
  $('acciones-jugador').hidden = !j; $('btn-borrar').hidden = !j || !puedeBorrar(); $('btn-hist').hidden = !j;
  $('btn-admin').textContent = adminOn ? '🔓 Administradora (activa)' : '🔐 Administradora';
  $('admin-estado').textContent = !hayClave() ? 'Crea tu clave de administradora para que solo tú puedas borrar.' : adminOn ? 'Modo administradora activo' : '';
  $('btn-agregar').hidden = !j || perfiles.lista.length >= 6;
  if (!j) showNuevo(true); else $('nuevo-jugador').hidden = true;
  if (j){
    $('btn-continuar').textContent = (dia > 1 ? '▶ Continuar como ' : '▶ Jugar como ') + j.nombre;
    $('btn-nueva').hidden = dia <= 1 || !puedeBorrar();
    $('btn-nueva').textContent = '✨ Reiniciar partida';
    $('btn-borrar').textContent = '🗑 Borrar a ' + j.nombre;
  }
  delete $('btn-nueva').dataset.ok; delete $('btn-borrar').dataset.ok; $('aviso-nueva').textContent = '';
}
/* =========================================================
   MODO ADMINISTRADORA: solo quien tiene la clave puede borrar jugadores o reiniciar partidas
   ========================================================= */
const ADMIN_KEY = 'estanco-admin';
let adminOn = false, adminModo = 'entrar';
const hashPin = pin => { let h = 5381; for (const c of 'nucita:' + pin) h = ((h << 5) + h + c.charCodeAt(0)) >>> 0; return h.toString(36); };
const adminHash = () => { try { return localStorage.getItem(ADMIN_KEY); } catch(e){ return null; } };
const hayClave = () => !!adminHash();
const puedeBorrar = () => !hayClave() || adminOn;
function openAdmin(){
  $('admin-pin').value = ''; $('admin-pin2').value = ''; $('admin-aviso').textContent = '';
  $('btn-admin-cambiar').hidden = true; $('admin-campos').hidden = false; $('btn-admin-ok').hidden = false;
  if (adminOn){
    adminModo = 'activo';
    $('admin-texto').textContent = 'Modo administradora activo. Puedes borrar jugadores y reiniciar partidas.';
    $('admin-campos').hidden = true; $('btn-admin-ok').textContent = '🔒 Cerrar modo administradora';
    $('btn-admin-cambiar').hidden = false;
  } else if (!hayClave()){
    adminModo = 'crear';
    $('admin-texto').textContent = 'Crea una clave de 4 números. Con ella, solo tú podrás borrar jugadores o reiniciar partidas.';
    $('admin-pin').placeholder = 'Clave'; $('admin-pin2').hidden = false; $('btn-admin-ok').textContent = 'Guardar clave';
  } else {
    adminModo = 'entrar';
    $('admin-texto').textContent = 'Escribe tu clave para borrar jugadores o reiniciar partidas.';
    $('admin-pin').placeholder = 'Clave'; $('admin-pin2').hidden = true; $('btn-admin-ok').textContent = 'Entrar';
  }
  $('inicio').hidden = true; $('admin').hidden = false;
  (adminModo === 'activo' ? $('btn-admin-ok') : $('admin-pin')).focus();
}
function closeAdmin(){ $('admin').hidden = true; $('inicio').hidden = false; showProgress(); $('btn-admin').focus(); }
function adminOk(){
  const a = $('admin-pin').value.trim(), b = $('admin-pin2').value.trim();
  if (adminModo === 'activo'){ adminOn = false; SFX.nada(); closeAdmin(); return; }
  if (!/^\d{4}$/.test(a)){ $('admin-aviso').textContent = 'La clave tiene que ser de 4 números.'; SFX.mal(); return; }
  if (adminModo === 'crear' || adminModo === 'cambiar'){
    if (a !== b){ $('admin-aviso').textContent = 'Las dos claves no coinciden.'; SFX.mal(); return; }
    try { localStorage.setItem(ADMIN_KEY, hashPin(a)); } catch(e){}
    adminOn = true; SFX.plata(); closeAdmin(); return;
  }
  if (hashPin(a) === adminHash()){ adminOn = true; SFX.ok(); closeAdmin(); }
  else { $('admin-aviso').textContent = 'Clave incorrecta.'; SFX.mal(); $('admin-pin').value = ''; $('admin-pin').focus(); }
}
$('btn-admin').addEventListener('click', openAdmin);
$('btn-admin-ok').addEventListener('click', adminOk);
$('btn-admin-cerrar').addEventListener('click', closeAdmin);
$('btn-admin-cambiar').addEventListener('click', () => {
  adminModo = 'cambiar'; $('admin-campos').hidden = false; $('admin-pin2').hidden = false; $('btn-admin-cambiar').hidden = true;
  $('admin-texto').textContent = 'Escribe tu clave nueva dos veces.'; $('btn-admin-ok').textContent = 'Guardar clave nueva';
  $('admin-pin').value = ''; $('admin-pin2').value = ''; $('admin-pin').focus();
});
['admin-pin','admin-pin2'].forEach(id => $(id).addEventListener('keydown', e => { if (e.key === 'Enter'){ e.preventDefault(); adminOk(); } }));
$('admin').addEventListener('keydown', e => { if (e.key === 'Escape') closeAdmin(); });

function focusInicio(){ (jugadorActual() ? $('btn-continuar') : $('nombre-jugador')).focus(); }
$('jugadores').addEventListener('click', e => {
  const b = e.target.closest('.jug'); if (!b) return;
  audio(); SFX.ok(); perfiles.activo = b.dataset.id; savePerfiles();
  loadSave(); updateStockUI(); updateHUD(); showProgress();
});
$('btn-agregar').addEventListener('click', () => { showNuevo(true); $('acciones-jugador').hidden = true; });
$('btn-cancelar-nuevo').addEventListener('click', () => { showProgress(); focusInicio(); });
function crearJugador(){
    const nombre = $('nombre-jugador').value.trim().slice(0, 14) || ('Jugador ' + (perfiles.lista.length + 1));
  const id = 'j' + Date.now().toString(36);
  perfiles.lista.push({id, nombre}); perfiles.activo = id; savePerfiles();
  loadSave(); save(); updateStockUI(); updateHUD(); showProgress();
  marcarSesion();
  openHelp(startGame);
}
$('btn-crear').addEventListener('click', crearJugador);
$('nombre-jugador').addEventListener('keydown', e => { if (e.key === 'Enter'){ e.preventDefault(); crearJugador(); } });
addEventListener('pagehide', sumarTiempo);
document.addEventListener('visibilitychange', () => { if (document.hidden) sumarTiempo(); });
$('btn-hist').addEventListener('click', openHist);
$('btn-cerrar-hist').addEventListener('click', closeHist);
$('hist').addEventListener('keydown', e => { if (e.key === 'Escape') closeHist(); });
$('btn-borrar').addEventListener('click', e => {
  if (!puedeBorrar()){ openAdmin(); return; }
  const b = e.currentTarget, j = jugadorActual(); if (!j) return;
  if (!b.dataset.ok){ b.dataset.ok = '1'; b.textContent = '¿Seguro? Se borra la partida de ' + j.nombre + '. Toca otra vez'; return; }
  try { localStorage.removeItem(saveKey()); localStorage.removeItem(histKey(j.id)); } catch(err){}
  perfiles.lista = perfiles.lista.filter(x => x.id !== j.id);
  perfiles.activo = perfiles.lista.length ? perfiles.lista[0].id : null; savePerfiles();
  loadSave(); updateStockUI(); updateHUD(); showProgress(); focusInicio();
});
$('btn-continuar').addEventListener('click', () => { marcarSesion(); (ayudaVista() && dia > 1) ? startGame() : openHelp(startGame); });
$('btn-nueva').addEventListener('click', e => {
  if (!puedeBorrar()){ openAdmin(); return; }
  const b = e.currentTarget, j = jugadorActual();
  if (!b.dataset.ok){
    b.dataset.ok = '1'; b.textContent = '¿Seguro? Toca otra vez';
    $('aviso-nueva').textContent = 'Se borra la partida de ' + j.nombre + ' (Día ' + dia + ') y empieza desde el Día 1.';
    return;
  }
  openHelp(() => { resetAll(); updateStockUI(); updateHUD(); startGame(); });
});
$('btn-otra').addEventListener('click', startGame);
$('btn-cero2').addEventListener('click', () => { resetAll(); startGame(); });
/* Instrucciones: se muestran sí o sí antes de una partida nueva y la primera vez que juegas */
let helpThen = null;
const ayudaVista = () => { try { return localStorage.getItem('estanco-ayuda-vista') === '1'; } catch(e){ return false; } };
function openHelp(then){
  helpThen = typeof then === 'function' ? then : null;
  $('btn-volver').textContent = helpThen ? '¡Entendido, a jugar!' : '¡Entendido!';
  $('inicio').hidden = true; $('ayuda').hidden = false; $('ayuda').querySelector('.tarjeta').scrollTop = 0; $('btn-volver').focus();
}
function closeHelp(){
  try { localStorage.setItem('estanco-ayuda-vista', '1'); } catch(e){}
  $('ayuda').hidden = true;
  if (helpThen){ const f = helpThen; helpThen = null; f(); }
  else { $('inicio').hidden = false; $('btn-ayuda').focus(); }
}
function cancelHelp(){ helpThen = null; $('ayuda').hidden = true; $('inicio').hidden = false; showProgress(); focusInicio(); }
$('btn-ayuda').addEventListener('click', () => openHelp());
$('btn-volver').addEventListener('click', closeHelp);
$('ayuda').addEventListener('keydown', e => { if (e.key === 'Escape') cancelHelp(); });

/* =========================================================
   DISTRIBUIDORA LA FRÍA: comprar mercancía
   ========================================================= */
const cartTotal = () => cart.reduce((a,q,i) => a + q*PRODUCTS[i].c, 0);
function aviso(t){ $('t-aviso').textContent = t; }
(function buildShop(){
  const L = $('t-lista');
  PRODUCTS.forEach((p,i) => {
    const row = document.createElement('div'); row.className = 't-fila';
    row.innerHTML = '<span class="emo" aria-hidden="true">'+p.e+'</span>' +
      '<div><div class="nom">'+p.n+'</div><div class="info">Tienes <b id="t-tiene'+i+'">0</b> · cuesta '+fmt(p.c)+' · lo vendes a '+fmt(p.p)+'</div></div>' +
      '<div class="t-cant"><button data-i="'+i+'" data-d="-1" aria-label="Quitar un '+p.n+'">−</button>' +
      '<output id="t-q'+i+'">0</output>' +
      '<button data-i="'+i+'" data-d="1" aria-label="Agregar un '+p.n+'">+</button>' +
      '<button data-i="'+i+'" data-d="5" aria-label="Agregar cinco '+p.n+'">+5</button></div>';
    L.appendChild(row);
  });
  L.addEventListener('click', e => { const b = e.target.closest('button'); if (b) changeCart(+b.dataset.i, +b.dataset.d); });
})();
function changeCart(i, d){
  audio();
  if (d < 0){ cart[i] = Math.max(0, cart[i] + d); SFX.nada(); aviso(''); }
  else {
    let added = 0;
    for (let k = 0; k < d; k++){ if (cartTotal() + PRODUCTS[i].c <= plata){ cart[i]++; added++; } }
    if (!added){ SFX.mal(); aviso('No te alcanza la plata'); }
    else { SFX.ok(); aviso(added < d ? 'Solo te alcanzó para ' + added : ''); }
  }
  renderShop();
}
function renderMesero(){
  const box = $('t-mesero'), m = mesero, tot = cartTotal(), libre = plata - tot;
  if (!m.contratado){
    const puede = dia >= MESERO_DIA;
    box.innerHTML = '<b>🧑‍🍳 Contratar a Juancho, el mesero</b><br>' +
      (puede ? 'Atiende solo las mesas normales (despacito). Contrato ' + fmt(MESERO_CONTRATO) + ' + sueldo ' + fmt(sueldoMesero(1)) + ' por día.'
             : '🔒 Se desbloquea en el Día ' + MESERO_DIA + '. Vas en el Día ' + dia + '.') +
      (puede ? '<div class="t-botones"><button class="si" id="m-contratar"' + (libre >= MESERO_CONTRATO ? '' : ' disabled') + '>Contratar ' + fmt(MESERO_CONTRATO) + '</button></div>' : '');
  } else {
    const n = m.nivel, max = n >= 5, costo = capacitarCosto(n), diaOk = dia >= capacitarDia(n);
    box.innerHTML = '<b>🧑‍🍳 Juancho · Nivel ' + n + (max ? ' (máximo)' : '') + '</b><br>' +
      'Sueldo: ' + fmt(sueldoMesero(n)) + ' por día · tarda ' + Math.max(1.4, 4.2 - .55*n).toFixed(1) + ' s por producto.' +
      (max ? '' : '<br>Capacitarlo a Nivel ' + (n+1) + ': ' + fmt(costo) + ' (sueldo pasa a ' + fmt(sueldoMesero(n+1)) + ')' + (diaOk ? '' : ' · 🔒 desde el Día ' + capacitarDia(n))) +
      '<div class="t-botones">' + (max ? '' : '<button class="si" id="m-capacitar"' + (diaOk && libre >= costo ? '' : ' disabled') + '>Capacitar ' + fmt(costo) + '</button>') +
      '<button id="m-despedir">Despedir</button></div>';
  }
}
$('t-mesero').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b || b.disabled) return; audio();
  if (b.id === 'm-contratar'){ plata -= MESERO_CONTRATO; mesero.contratado = true; mesero.nivel = 1; SFX.plata(); aviso('¡Juancho empieza a trabajar desde mañana!'); }
  if (b.id === 'm-capacitar'){ plata -= capacitarCosto(mesero.nivel); mesero.nivel++; SFX.nivel(); aviso('¡Juancho subió a Nivel ' + mesero.nivel + '!'); }
  if (b.id === 'm-despedir'){
    if (!b.dataset.ok){ b.dataset.ok = '1'; b.textContent = '¿Seguro? Toca otra vez'; return; }
    mesero.contratado = false; mesero.nivel = 1; SFX.nada(); aviso('Juancho ya no trabaja en el estanco.');
  }
  save(); renderShop();
});
function renderShop(){
  const tot = cartTotal();
  renderMesero();
  $('t-plata').textContent = 'Tienes ' + fmt(plata);
  PRODUCTS.forEach((p,i) => { $('t-tiene'+i).textContent = stock[i]; $('t-q'+i).textContent = cart[i]; });
  $('t-total').textContent = 'Total: ' + fmt(tot) + ' · te quedan ' + fmt(plata - tot);
  $('t-pagar').disabled = tot === 0;
  $('t-abrir').textContent = tot ? 'Pagar y abrir otro día' : 'Abrir otro día';
  $('t-abrir').disabled = totalStock() === 0 && tot === 0;
}
function pay(){
  const tot = cartTotal(); if (!tot) return;
  plata -= tot; cart.forEach((q,i) => stock[i] += q); cart = [0,0,0,0,0,0];
  save(); SFX.plata(); aviso('¡Listo! La nevera quedó surtida.');
  renderShop(); updateStockUI();
}
function openShop(){
  cart = [0,0,0,0,0,0]; aviso(totalStock() === 0 ? 'No tienes mercancía: compra algo para poder vender.' : '');
  ['inicio','final','ayuda'].forEach(id => $(id).hidden = true); $('tienda').hidden = false;
  renderShop(); $('t-lista').querySelector('button[data-d="1"]').focus();
}
$('t-pagar').addEventListener('click', pay);
$('t-abrir').addEventListener('click', () => { pay(); if (totalStock() > 0) startGame(); });
$('btn-tienda').addEventListener('click', openShop);

/* =========================================================
   SALIR AL MENÚ (con pausa)
   ========================================================= */
let pausedFrom = null;
function askMenu(){
  closeRecipe();
  if (state === 'play'){ pausedFrom = 'play'; state = 'pause'; player.pause(); $('salir').hidden = false; $('btn-seguir').focus(); }
  else if (state === 'over') goMenu();
}
function resumeGame(){ $('salir').hidden = true; if (pausedFrom === 'play'){ state = 'play'; playSong(); } pausedFrom = null; last = performance.now(); }
function goMenu(){
  adminOn = false;
  sumarTiempo();
  state = 'start'; pausedFrom = null; player.pause();
  loadSave();   // lo vendido hoy no cuenta: vuelve a como estaba al empezar el día
  reset();
  ['salir','final','tienda','ayuda'].forEach(id => $(id).hidden = true);
  showProgress(); updateStockUI();
  $('inicio').hidden = false;
  focusInicio();
}
$('menu').addEventListener('click', askMenu);
$('btn-seguir').addEventListener('click', resumeGame);
$('btn-salir').addEventListener('click', goMenu);
$('btn-menu-final').addEventListener('click', goMenu);
$('t-menu').addEventListener('click', goMenu);

/* =========================================================
   ENTRADA: toques en el canvas y teclado
   ========================================================= */
cv.addEventListener('pointerdown', e => {
  if (state !== 'play') return;
  const r = cv.getBoundingClientRect();
  const x = (e.clientX - r.left - 4)/(r.width - 8)*W, y = (e.clientY - r.top - 4)/(r.height - 8)*H;
  if (elite.bar){ shake(); return; }
  const sp = spills.find(o => Math.hypot(o.x-x, o.y-y) < 30);
  if (sp){ callTono(sp); return; }
  let best = null, bd = 1e9;
  for (const t of tables){
    if (x > t.cx-85 && x < t.cx+95 && y > t.cy-150 && y < t.cy+50){
      const d = Math.hypot(x-t.cx, y-(t.cy-40)); if (d < bd){ bd = d; best = t; }
    }
  }
  if (best) goTo(best);
});
$('tono').addEventListener('click', callNearest);
$('receta').addEventListener('click', openRecipe);
$('agitar').addEventListener('click', shake);
$('btn-cerrar-receta').addEventListener('click', closeRecipe);
$('receta-dlg').addEventListener('keydown', e => { if (e.key === 'Escape' || e.key.toLowerCase() === 'r'){ e.stopPropagation(); closeRecipe(); } });
addEventListener('keydown', e => {
  const k = e.key.toLowerCase();
  if (k === 'escape'){
    if (!$('receta-dlg').hidden){ closeRecipe(); return; }
    if (state === 'pause'){ resumeGame(); return; }
    if (state === 'play'){ askMenu(); return; }
  }
  if (k === 'm'){ toggleMute(); return; }
  if (k === 'n'){ nextSong(); return; }
  if (state !== 'play' || e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
  if (k >= '1' && k <= '6'){ e.preventDefault(); deliver(+k - 1); }
  else if (k === 'p'){ e.preventDefault(); pet(); }
  else if (k === 'l'){ e.preventDefault(); callNearest(); }
  else if (k === ' '){ e.preventDefault(); shake(); }
  else if (k === 'r'){ e.preventDefault(); $('receta-dlg').hidden ? openRecipe() : closeRecipe(); }
  else if (!elite.bar){ const i = TECLAS.indexOf(k); if (i >= 0){ e.preventDefault(); goTo(tables[i]); } }
});

/* =========================================================
   TAMAÑO: el canvas se ajusta sin desplazarse
   ========================================================= */
function resize(){
  const r = $('stage').getBoundingClientRect();
  const s = Math.max(.2, Math.min((r.width-14)/W, (r.height-14)/H));
  const cw = Math.floor(W*s), ch = Math.floor(H*s);
  cv.style.width = cw + 'px'; cv.style.height = ch + 'px';
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  cv.width = Math.round(cw*dpr); cv.height = Math.round(ch*dpr);
  scale = cv.width / W;
}
addEventListener('resize', resize);
if (window.ResizeObserver) new ResizeObserver(resize).observe($('stage'));
resize(); updateHUD(); updateStockUI(); showProgress();
requestAnimationFrame(loop);
focusInicio();
