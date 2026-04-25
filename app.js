const API_KEY = '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';
const GEMINI_KEY = 'AIzaSyDrJoBhDvUBVFFMqGq3yXAbm7AO_fodS10';
const SERP_KEY = '';
const SPOTIFY_CLIENT_ID = 'c2a50a27968a4e7d812839db2139d543';
const SPOTIFY_REDIRECT = 'https://amezcuaoscar17-ui.github.io/mi-jarvis/callback';
const ELEVEN_KEY = 'sk_89821206c178d4a023fac1197ff72136e505220480cf55c0';
const ELEVEN_VOICE_ID = 'pNInz6obpgDQGcFmaJgB';

// ── Historial de conversaciones ───────────────────────
function cargarHistorial() {
  const h = localStorage.getItem('jarvis-historial');
  return h ? JSON.parse(h) : [];
}

function guardarEnHistorial(usuario, jarvis) {
  const historial = cargarHistorial();
  historial.unshift({
    fecha: new Date().toLocaleString('es-MX'),
    usuario: usuario,
    jarvis: jarvis
  });
  if (historial.length > 200) historial.pop();
  localStorage.setItem('jarvis-historial', JSON.stringify(historial));
}

function mostrarHistorial(filtro = '') {
  const historial = cargarHistorial();
  const lista = document.getElementById('historial-lista');
  lista.innerHTML = '';

  const filtrado = filtro
    ? historial.filter(h =>
        h.usuario.toLowerCase().includes(filtro.toLowerCase()) ||
        h.jarvis.toLowerCase().includes(filtro.toLowerCase()))
    : historial;

  if (filtrado.length === 0) {
    lista.innerHTML = '<div class="historial-vacio">No hay conversaciones guardadas</div>';
    return;
  }

  filtrado.forEach(h => {
    const div = document.createElement('div');
    div.classList.add('historial-item');
    div.innerHTML = `
      <div class="historial-fecha">${h.fecha}</div>
      <div class="historial-preview">Tú: ${h.usuario}</div>
      <div class="historial-preview" style="color:#a0e0a0;">Jarvis: ${h.jarvis}</div>
    `;
    div.addEventListener('click', () => {
      agregarMensaje(h.usuario, 'usuario');
      agregarMensaje('Jarvis: ' + h.jarvis, 'jarvis');
      document.getElementById('panel-historial').style.display = 'none';
    });
    lista.appendChild(div);
  });
}

// ── Generación de imágenes con Pollinations ───────────
async function generarImagen(descripcion) {
  if (statusEl) statusEl.textContent = 'Generando imagen...';
  if (ring) ring.classList.add('active');

  const prompt = encodeURIComponent(descripcion);
  const seed = Math.floor(Math.random() * 99999);

  const fuentes = [
    `https://source.unsplash.com/512x512/?${prompt}&sig=${seed}`,
    `https://loremflickr.com/512/512/${prompt}?random=${seed}`,
    `https://picsum.photos/seed/${seed}/512/512`,
  ];

  const msgJarvis = `Generando imagen de: "${descripcion}" — puede tardar unos segundos...`;
  agregarMensaje('Jarvis: ' + msgJarvis, 'jarvis');
  await speak(`Generando imagen de ${descripcion}`);

  const div = document.createElement('div');
  div.classList.add('msg', 'jarvis');

  const loading = document.createElement('div');
  loading.textContent = '⏳ Cargando imagen...';
  loading.style.cssText = 'font-size:12px; color:#7090cc; padding:4px 0;';
  div.appendChild(loading);
  chatMensajes.appendChild(div);
  chatMensajes.scrollTop = chatMensajes.scrollHeight;

  const img = new Image();
  img.classList.add('img-generada');
  img.alt = descripcion;

  img.onload = () => {
    loading.remove();
    div.appendChild(img);
    chatMensajes.scrollTop = chatMensajes.scrollHeight;
    if (statusEl) statusEl.textContent = 'Listo';
    if (ring) ring.classList.remove('active');
  };

  let intentoActual = 0;

  const intentarSiguiente = () => {
    if (intentoActual >= fuentes.length) {
      loading.textContent = '❌ No se pudo generar la imagen. Intenta de nuevo.';
      if (statusEl) statusEl.textContent = 'Error de imagen';
      if (ring) ring.classList.remove('active');
      return;
    }
    img.src = fuentes[intentoActual];
    intentoActual++;
  };

  img.onerror = () => {
    intentarSiguiente();
  };

  intentarSiguiente();

  guardarEnHistorial('Genera imagen: ' + descripcion, msgJarvis);
  responseEl.textContent = msgJarvis;
}


// ── Configuración ─────────────────────────────────────
function cargarConfig() {
  const cfg = localStorage.getItem('jarvis-config');
  return cfg ? JSON.parse(cfg) : {
    nombreAsistente: 'Jarvis',
    colorPrincipal: '#3a7fff',
    velocidadVoz: 1.0
  };
}

function aplicarConfig(cfg) {
  document.documentElement.style.setProperty('--c', cfg.colorPrincipal);
  const letra = cfg.nombreAsistente.charAt(0).toUpperCase();
  const letterEl = document.getElementById('status-letter') || document.getElementById('avatar-letter');
  if (letterEl) letterEl.textContent = letra;
  const logoIcon = document.getElementById('sidebar-logo-icon');
  if (logoIcon) logoIcon.textContent = letra;
  document.title = cfg.nombreAsistente;
}

let config = cargarConfig();
aplicarConfig(config);

// ── Memoria ───────────────────────────────────────────
function cargarMemoria() {
  const mem = localStorage.getItem('jarvis-memoria');
  return mem ? JSON.parse(mem) : { nombre: null, preferencias: [], hechos: [] };
}

function guardarMemoria(memoria) {
  localStorage.setItem('jarvis-memoria', JSON.stringify(memoria));
}

function construirContextoMemoria(memoria) {
  let contexto = '';
  if (memoria.nombre) contexto += `El nombre del usuario es ${memoria.nombre}. `;
  if (memoria.preferencias.length > 0) contexto += `Sus preferencias: ${memoria.preferencias.join(', ')}. `;
  if (memoria.hechos.length > 0) contexto += `Cosas importantes: ${memoria.hechos.join(', ')}. `;
  return contexto;
}

let memoria = cargarMemoria();

// ── Notas ─────────────────────────────────────────────
function cargarNotas() {
  const n = localStorage.getItem('jarvis-notas');
  return n ? JSON.parse(n) : [];
}

function guardarNota(texto) {
  const notas = cargarNotas();
  notas.push({ texto, fecha: new Date().toLocaleString('es-MX') });
  localStorage.setItem('jarvis-notas', JSON.stringify(notas));
}

function leerNotas() {
  const notas = cargarNotas();
  if (notas.length === 0) return 'No tiene notas guardadas.';
  return notas.map((n, i) => `${i + 1}. ${n.texto} (${n.fecha})`).join('\n');
}

// ── Notificaciones ────────────────────────────────────
async function pedirPermisoNotificaciones() {
  if ('Notification' in window && Notification.permission === 'default') {
    await Notification.requestPermission();
  }
}

function enviarNotificacion(titulo, mensaje) {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(titulo, {
      body: mensaje,
      icon: 'icon.png'
    });
  }
}

// ── Alarmas ───────────────────────────────────────────
let alarmas = [];

function programarAlarma(minutos, mensaje) {
  const tiempo = minutos * 60 * 1000;
  const aviso = mensaje || `Han pasado ${minutos} minutos, señor.`;
  const id = setTimeout(async () => {
    agregarMensaje('Jarvis: ' + aviso, 'jarvis');
    responseEl.textContent = aviso;
    enviarNotificacion('Jarvis', aviso);
    await speak(aviso);
  }, tiempo);
  alarmas.push({ id, minutos, mensaje });
  return minutos;
}

// ── Clima con Open-Meteo ──────────────────────────────
async function obtenerClima(ciudad) {
  try {
    if (statusEl) statusEl.textContent = 'Obteniendo clima...';

    const geoRes = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(ciudad)}&count=1&language=es`
    );
    const geoData = await geoRes.json();

    if (!geoData.results || geoData.results.length === 0) {
      return `No encontré la ciudad "${ciudad}". Intente con otra ciudad.`;
    }

    const { latitude, longitude, name, country } = geoData.results[0];

    const climaRes = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&timezone=auto&language=es`
    );
    const climaData = await climaRes.json();
    const c = climaData.current;

    const condicion = interpretarClima(c.weather_code);
    return `En ${name}, ${country} el clima es ${condicion}. Temperatura: ${Math.round(c.temperature_2m)}°C, humedad: ${c.relative_humidity_2m}%, viento: ${Math.round(c.wind_speed_10m)} km/h.`;

  } catch (err) {
    return 'No pude obtener el clima en este momento.';
  }
}

function interpretarClima(code) {
  if (code === 0) return 'despejado ☀️';
  if (code <= 2) return 'parcialmente nublado ⛅';
  if (code === 3) return 'nublado ☁️';
  if (code <= 49) return 'con niebla 🌫️';
  if (code <= 59) return 'con llovizna 🌦️';
  if (code <= 69) return 'lluvioso 🌧️';
  if (code <= 79) return 'con nieve ❄️';
  if (code <= 84) return 'con lluvia moderada 🌧️';
  if (code <= 99) return 'con tormenta ⛈️';
  return 'variable';
}

// ── Búsqueda web gratuita ─────────────────────────────
async function buscarEnWikipedia(query) {
  try {
    if (statusEl) statusEl.textContent = 'Buscando...';

    const limpiar = (q) => q
      .replace(/^(el|la|los|las|un|una|unos|unas)\s+/i, '')
      .replace(/^(sobre|acerca de|información de|información sobre)\s+/i, '')
      .trim();

    const queryLimpia = limpiar(query);

    const intentar = async (q) => {
      const res = await fetch(
        `https://es.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(q)}`
      );
      const data = await res.json();
      if (data.extract && data.type !== 'disambiguation') {
        return data.extract.split('. ').slice(0, 3).join('. ') + '.';
      }
      return null;
    };

    let resultado = await intentar(queryLimpia);
    if (resultado) return `Según Wikipedia: ${resultado}`;

    const busquedaRes = await fetch(
      `https://es.wikipedia.org/w/api.php?action=search&list=search&srsearch=${encodeURIComponent(queryLimpia)}&format=json&origin=*&srlimit=1`
    );
    const busquedaData = await busquedaRes.json();

    if (busquedaData.query?.search?.length > 0) {
      const primerTitulo = busquedaData.query.search[0].title;
      resultado = await intentar(primerTitulo);
      if (resultado) return `Según Wikipedia: ${resultado}`;
    }

    return null;
  } catch (err) {
    return null;
  }
}

async function buscarEnGoogle(query) {
  try {
    if (statusEl) statusEl.textContent = 'Buscando en Google...';
    const res = await fetch(
      `https://serpapi.com/search.json?q=${encodeURIComponent(query)}&hl=es&gl=mx&api_key=${SERP_KEY}`
    );
    const data = await res.json();

    let resultados = [];

    if (data.answer_box) {
      if (data.answer_box.answer) return data.answer_box.answer;
      if (data.answer_box.snippet) return data.answer_box.snippet;
      if (data.answer_box.result) return data.answer_box.result;
    }

    if (data.knowledge_graph) {
      const kg = data.knowledge_graph;
      let info = '';
      if (kg.description) info += kg.description + ' ';
      if (kg.address) info += `Dirección: ${kg.address}. `;
      if (kg.phone) info += `Teléfono: ${kg.phone}. `;
      if (kg.hours) info += `Horario: ${kg.hours}. `;
      if (info) return info.trim();
    }

    if (data.organic_results && data.organic_results.length > 0) {
      resultados = data.organic_results
        .slice(0, 3)
        .filter(r => r.snippet)
        .map(r => r.snippet);
      if (resultados.length > 0) return resultados[0];
    }

    return null;
  } catch (err) {
    console.error('SerpAPI error:', err);
    return null;
  }
}

async function buscarEnInternet(query) {
  const googleResult = await buscarEnGoogle(query);
  if (googleResult) return googleResult;

  try {
    const res = await fetch(
      `https://en.wikipedia.org/w/api.php?action=search&list=search&srsearch=${encodeURIComponent(query)}&format=json&origin=*&srlimit=3`
    );
    const data = await res.json();

    if (data.query?.search?.length > 0) {
      const titulo = data.query.search[0].title;
      const resWiki = await fetch(
        `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(titulo)}`
      );
      const dataWiki = await resWiki.json();
      if (dataWiki.extract) {
        return dataWiki.extract.split('. ').slice(0, 3).join('. ') + '.';
      }
    }
    return null;
  } catch (err) {
    return null;
  }
}

async function buscarInformacion(query) {
  if (statusEl) statusEl.textContent = 'Buscando...';

  const resultado1 = await buscarEnWikipedia(query);
  if (resultado1) return resultado1;

  const resultado2 = await buscarEnInternet(query);
  if (resultado2) return `Según Wikipedia: ${resultado2}`;

  return null;
}

// ── Traducción instantánea ────────────────────────────
async function traducirTexto(texto, idiomaDestino) {
  try {
    if (statusEl) statusEl.textContent = 'Traduciendo...';
    const res = await fetch(
      `https://api.mymemory.translated.net/get?q=${encodeURIComponent(texto)}&langpair=es|${idiomaDestino}`
    );
    const data = await res.json();
    if (data.responseStatus === 200) {
      return data.responseData.translatedText;
    }
    return null;
  } catch (err) {
    return null;
  }
}

const idiomasMap = {
  'inglés': 'en', 'ingles': 'en',
  'francés': 'fr', 'frances': 'fr',
  'alemán': 'de', 'aleman': 'de',
  'italiano': 'it',
  'portugués': 'pt', 'portugues': 'pt',
  'japonés': 'ja', 'japones': 'ja',
  'chino': 'zh',
  'coreano': 'ko',
  'ruso': 'ru',
  'árabe': 'ar', 'arabe': 'ar',
  'hindi': 'hi'
};

// ── Spotify ───────────────────────────────────────────
function obtenerTokenSpotify() {
  const token = localStorage.getItem('spotify-token');
  const tiempo = localStorage.getItem('spotify-token-time');
  if (!token || !tiempo) return null;
  const minutos = (Date.now() - parseInt(tiempo)) / 60000;
  if (minutos > 55) {
    localStorage.removeItem('spotify-token');
    localStorage.removeItem('spotify-token-time');
    return null;
  }
  return token;
}

async function intercambiarCodigoSpotify() {
  const code = localStorage.getItem('spotify-code');
  const verifier = localStorage.getItem('spotify_verifier');

  if (!code || !verifier) {
    console.error('Faltan code o verifier:', { code: !!code, verifier: !!verifier });
    return null;
  }

  try {
    const res = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: SPOTIFY_REDIRECT,
        client_id: SPOTIFY_CLIENT_ID,
        code_verifier: verifier
      })
    });

    const data = await res.json();
    console.log('Spotify token response:', data);

    if (data.access_token) {
      localStorage.setItem('spotify-token', data.access_token); actualizarStatusSpotify(); actualizarStatusElevenLabs();
      localStorage.setItem('spotify-token-time', Date.now());
      localStorage.removeItem('spotify-code');
      localStorage.removeItem('spotify_verifier');
      return data.access_token;
    }
    return null;
  } catch (err) {
    console.error('Error intercambiando código:', err);
    return null;
  }
}

async function getSpotifyToken() {
  const token = obtenerTokenSpotify();
  if (token) return token;

  const code = localStorage.getItem('spotify-code');
  if (code) {
    const newToken = await intercambiarCodigoSpotify();
    return newToken;
  }
  return null;
}

async function generarCodeVerifier() {
  const array = new Uint32Array(56);
  crypto.getRandomValues(array);
  const verifier = btoa(String.fromCharCode(...new Uint8Array(array.buffer)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  localStorage.setItem('spotify-verifier', verifier);
  return verifier;
}

async function generarCodeChallenge(verifier) {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

async function conectarSpotify() {
  const verifier = generateRandomString(64);
  localStorage.setItem('spotify_verifier', verifier);

  const challenge = await generateChallenge(verifier);

  const scopes = [
    'user-read-email',
    'user-read-private',
    'user-modify-playback-state',
    'user-read-playback-state',
    'user-read-currently-playing',
    'streaming'
  ].join(' ');

  const params = new URLSearchParams({
    client_id: SPOTIFY_CLIENT_ID,
    response_type: 'code',
    redirect_uri: SPOTIFY_REDIRECT,
    scope: scopes,
    code_challenge_method: 'S256',
    code_challenge: challenge,
    show_dialog: 'true'
  });

  window.location.href = 'https://accounts.spotify.com/authorize?' + params.toString();
}

function generateRandomString(length) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array).map(x => chars[x % chars.length]).join('');
}

async function generateChallenge(verifier) {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

async function buscarCancionSpotify(query, token) {
  try {
    const res = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=1`,
      { headers: { 'Authorization': 'Bearer ' + token } }
    );
    const data = await res.json();
    if (data.tracks?.items?.length > 0) {
      return data.tracks.items[0].uri;
    }
    return null;
  } catch (err) {
    return null;
  }
}

async function reproducirEnSpotify(uri, token) {
  try {
    const devRes = await fetch('https://api.spotify.com/v1/me/player/devices', {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    const devData = await devRes.json();
    if (!devData.devices || devData.devices.length === 0) return false;
    const deviceId = devData.devices[0].id;
    await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
      method: 'PUT',
      headers: {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ uris: [uri] })
    });
    return true;
  } catch (err) {
    return false;
  }
}

// ── Control de música ─────────────────────────────────
async function abrirMusica(query) {
  const token = await getSpotifyToken();
  if (token) {
    if (statusEl) statusEl.textContent = 'Buscando en Spotify...';
    const uri = await buscarCancionSpotify(query, token);
    if (uri) {
      const reproducido = await reproducirEnSpotify(uri, token);
      if (reproducido) return `Reproduciendo "${query}" en Spotify.`;
    }
    window.open(`https://open.spotify.com/search/${encodeURIComponent(query)}`, '_blank');
    return `Abriendo "${query}" en Spotify.`;
  } else {
    window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`, '_blank');
    return `Abriendo "${query}" en YouTube. Di "conectar Spotify" para usar Spotify.`;
  }
}
 
async function reproducirEnYoutube(query) {
  try {
    if (statusEl) statusEl.textContent = 'Buscando canción...';

    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
    window.open(searchUrl, '_blank');
    return `Abriendo "${query}" en YouTube.`;
  } catch (err) {
    return 'No pude abrir YouTube.';
  }
}

// ── Modos de personalidad ─────────────────────────────
const modos = {
  trabajo: {
    nombre: 'Trabajo',
    prompt: 'Eres Jarvis en modo trabajo. Eres muy formal, directo y eficiente. Vas al grano sin rodeos. Solo información relevante y precisa.'
  },
  relajado: {
    nombre: 'Relajado',
    prompt: 'Eres Jarvis en modo relajado. Eres amigable, casual y usas un tono conversacional. Puedes hacer bromas ocasionales.'
  },
  coach: {
    nombre: 'Coach',
    prompt: 'Eres Jarvis en modo coach. Eres motivador, positivo y alentador. Ayudas al usuario a alcanzar sus metas con consejos prácticos.'
  },
  tecnico: {
    nombre: 'Técnico',
    prompt: 'Eres Jarvis en modo técnico. Eres muy preciso, usas terminología especializada y das explicaciones detalladas cuando se requiere.'
  },
  normal: {
    nombre: 'Normal',
    prompt: 'Eres Jarvis, el asistente personal de inteligencia artificial del usuario. Eres conciso, inteligente y ligeramente formal pero amigable.'
  }
};

let modoActual = 'normal';

function cambiarModo(modo) {
  if (modos[modo]) {
    modoActual = modo;
    localStorage.setItem('jarvis-modo', modo);
    return `Modo ${modos[modo].nombre} activado.`;
  }
  return null;
}

// ── Tema automático día/noche ─────────────────────────
function aplicarTemaSegunHora() {
  const hora = new Date().getHours();
  const esDeDia = hora >= 7 && hora < 19;

  if (esDeDia) {
    document.body.classList.remove('tema-noche');
    document.body.classList.add('tema-dia');
  } else {
    document.body.classList.remove('tema-dia');
    document.body.classList.add('tema-noche');
  }
}

setInterval(aplicarTemaSegunHora, 60000);
aplicarTemaSegunHora();

// ── Detectar comandos especiales ──────────────────────
async function detectarComando(texto) {
  const t = texto.toLowerCase();

  // Hora
  if (t.includes('qué hora') || t.includes('que hora') || t.includes('dime la hora')) {
    const hora = new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
    return `Son las ${hora}, señor.`;
  }

  // Fecha
  if (t.includes('qué día') || t.includes('que dia') || t.includes('qué fecha') || t.includes('que fecha')) {
    const fecha = new Date().toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    return `Hoy es ${fecha}.`;
  }

  // Clima
  const climaMatch = t.match(/clima (?:en|de) ([a-záéíóúñ\s]+)/i) ||
                     t.match(/(?:cómo|como) está el clima en ([a-záéíóúñ\s]+)/i) ||
                     t.match(/(?:cómo|como) está el tiempo en ([a-záéíóúñ\s]+)/i);
  if (climaMatch) {
    return await obtenerClima(climaMatch[1].trim());
  }

  if (t.includes('clima') || t.includes('temperatura') || t.includes('tiempo')) {
    return await obtenerClima('Ciudad de México');
  }

  // Notas — guardar
  const notaMatch = t.match(/(?:guarda|anota|recuerda) (?:que |esto: |que )?(.+)/i) ||
                    t.match(/nota: (.+)/i);
  if (notaMatch) {
    const nota = notaMatch[1].trim();
    guardarNota(nota);
    return `Nota guardada: "${nota}".`;
  }

  // Notas — leer
  if (t.includes('mis notas') || t.includes('qué notas') || t.includes('lee mis notas') || t.includes('notas guardadas')) {
    return 'Sus notas:\n' + leerNotas();
  }

  // Alarma en minutos
  const alarmaMatch = t.match(/(?:alarma|avísame|recuérdame|avisa) (?:en |dentro de )?(\d+) minutos?/i) ||
                      t.match(/(\d+) minutos? (?:para|después)/i);
  if (alarmaMatch) {
    const mins = parseInt(alarmaMatch[1]);
    programarAlarma(mins, null);
    return `Alarma programada para ${mins} minuto${mins > 1 ? 's' : ''}.`;
  }

  // Recordatorio con hora específica
  const recordatorioMatch = t.match(/recuérdame (.+) a las (\d+):?(\d*)/i) ||
                             t.match(/recuérdame a las (\d+):?(\d*) (.+)/i);
  if (recordatorioMatch) {
    const ahora = new Date();
    let hora, mins2, mensaje2;

    if (recordatorioMatch[1] && isNaN(recordatorioMatch[1])) {
      mensaje2 = recordatorioMatch[1];
      hora = parseInt(recordatorioMatch[2]);
      mins2 = parseInt(recordatorioMatch[3]) || 0;
    } else {
      hora = parseInt(recordatorioMatch[1]);
      mins2 = parseInt(recordatorioMatch[2]) || 0;
      mensaje2 = recordatorioMatch[3];
    }

    const objetivo = new Date();
    objetivo.setHours(hora, mins2, 0, 0);
    if (objetivo <= ahora) objetivo.setDate(objetivo.getDate() + 1);

    const diferencia = Math.round((objetivo - ahora) / 60000);
    programarAlarma(diferencia, `Recordatorio: ${mensaje2}`);
    return `Recordatorio programado para las ${hora}:${String(mins2).padStart(2, '0')}. Faltan ${diferencia} minutos.`;
  }

  // Búsqueda web
  if (t.includes('busca') || t.includes('buscar') || t.includes('qué es') ||
      t.includes('que es') || t.includes('quién es') || t.includes('quien es') ||
      t.includes('cuándo') || t.includes('cuando') || t.includes('dónde está') ||
      t.includes('donde esta') || t.includes('cuál es') || t.includes('cual es') ||
      t.includes('dónde queda') || t.includes('donde queda') ||
      t.includes('dónde se encuentra') || t.includes('donde se encuentra') ||
      t.includes('cómo llego') || t.includes('como llego') ||
      t.includes('cuánto cuesta') || t.includes('cuanto cuesta') ||
      t.includes('qué significa') || t.includes('que significa')) {
    const query = texto
      .replace(/busca|buscar|qué es|que es|quién es|quien es|dónde está|donde esta|cuál es|cual es|cuándo|cuando|dónde queda|donde queda|dónde se encuentra|donde se encuentra|cómo llego|como llego|cuánto cuesta|cuanto cuesta|qué significa|que significa/gi, '')
      .trim();
    const resultado = await buscarInformacion(query || texto);
    if (resultado) return resultado;
    return null;
  }

  // Traducción
  const traduccionMatch =
    t.match(/traduce? ["']?(.+?)["']? al? (\w+)/i) ||
    t.match(/cómo se dice ["']?(.+?)["']? en (\w+)/i) ||
    t.match(/como se dice ["']?(.+?)["']? en (\w+)/i);
  if (traduccionMatch) {
    const textoATraducir = traduccionMatch[1].trim();
    const idiomaNombre = traduccionMatch[2].toLowerCase().trim();
    const codigoIdioma = idiomasMap[idiomaNombre];
    if (codigoIdioma) {
      const traduccion = await traducirTexto(textoATraducir, codigoIdioma);
      if (traduccion) return `"${textoATraducir}" en ${idiomaNombre} es: "${traduccion}"`;
    }
    return `No reconocí el idioma "${idiomaNombre}". Prueba con inglés, francés, japonés, etc.`;
  }

  // Conectar Spotify
  if (t.includes('conectar spotify') || t.includes('conecta spotify') || t.includes('login spotify')) {
    await conectarSpotify();
    return 'Abriendo ventana de Spotify. Inicia sesión y cierra la ventana cuando termine.';
  }

  // Desconectar Spotify
  if (t.includes('desconectar spotify') || t.includes('salir de spotify')) {
    localStorage.removeItem('spotify-token');
    localStorage.removeItem('spotify-token-time');
    localStorage.removeItem('spotify-code');
    return 'Spotify desconectado.';
  }

  // Pausar música
  if (t.includes('pausa') || t.includes('parar música') || t.includes('detén la música') || t.includes('stop música')) {
    const token = await getSpotifyToken();
    if (token) {
      fetch('https://api.spotify.com/v1/me/player/pause', {
        method: 'PUT',
        headers: { 'Authorization': 'Bearer ' + token }
      });
      return 'Música pausada.';
    }
    return 'Spotify no está conectado. Di "conectar Spotify" primero.';
  }

  // Siguiente canción
  if (t.includes('siguiente canción') || t.includes('siguiente') || t.includes('skip') || t.includes('la que sigue')) {
    const token = await getSpotifyToken();
    if (token) {
      fetch('https://api.spotify.com/v1/me/player/next', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + token }
      });
      return 'Siguiente canción.';
    }
    return 'Spotify no está conectado.';
  }

  // Reanudar música
  if (t.includes('reanuda') || t.includes('continúa la música') || t.includes('sigue la música')) {
    const token = await getSpotifyToken();
    if (token) {
      fetch('https://api.spotify.com/v1/me/player/play', {
        method: 'PUT',
        headers: { 'Authorization': 'Bearer ' + token }
      });
      return 'Música reanudada.';
    }
    return 'Spotify no está conectado.';
  }

  // Música
  const esMusicaComando =
    t.includes('pon ') || t.includes('reproduce ') ||
    t.includes('quiero escuchar') || t.includes('ponme ') ||
    t.includes('toca ') || t.includes('escuchar ') ||
    t.includes('play ') || t.includes('música de') ||
    t.includes('canción de') || t.includes('canciones de');

  const musicaMatch =
    t.match(/(?:ponme|pon|reproduce|toca|escuchar|play) (?:la canción |una canción de |canciones de |música de |música )?(.+)/i) ||
    t.match(/quiero escuchar (?:a |la canción de )?(.+)/i) ||
    t.match(/(?:busca|abre) (?:en spotify |en youtube )?(?:la canción |música de )?(.+)/i);

  if (esMusicaComando && musicaMatch) {
    const query = musicaMatch[1]
      .replace(/en spotify|en youtube|por favor|porfavor/gi, '')
      .trim();
    return await abrirMusica(query);
  }

  // Modos de personalidad
  if (t.includes('modo trabajo') || t.includes('modo profesional')) return cambiarModo('trabajo');
  if (t.includes('modo relajado') || t.includes('modo casual')) return cambiarModo('relajado');
  if (t.includes('modo coach') || t.includes('modo motivador')) return cambiarModo('coach');
  if (t.includes('modo técnico') || t.includes('modo tecnico')) return cambiarModo('tecnico');
  if (t.includes('modo normal') || t.includes('modo estándar')) return cambiarModo('normal');
  if (t.includes('qué modo') || t.includes('que modo') || t.includes('modo actual')) {
    return `Estoy en modo ${modos[modoActual].nombre}.`;
  }

  // Tema
  if (t.includes('modo oscuro') || t.includes('tema oscuro')) {
    document.body.classList.remove('tema-dia');
    document.body.classList.add('tema-noche');
    return 'Tema oscuro activado.';
  }
  if (t.includes('modo claro') || t.includes('modo día') || t.includes('modo dia') || t.includes('tema claro')) {
    document.body.classList.remove('tema-noche');
    document.body.classList.add('tema-dia');
    return 'Tema claro activado.';
  }

  // Generar imagen
  const imagenMatch = t.match(/(?:genera|crea|dibuja|hazme|muéstrame) (?:una |un )?imagen (?:de |del |de la )?(.+)/i) ||
                      t.match(/(?:genera|crea|dibuja) (.+)/i);
  if (imagenMatch) {
    const descripcion = imagenMatch[1].trim();
    await generarImagen(descripcion);
    return 'IMAGEN_GENERADA';
  }

  // Calculadora
  const calcMatch = t.match(/cuánto es (.+)/i) || t.match(/calcula (.+)/i);
  if (calcMatch) {
    try {
      const expresion = calcMatch[1]
        .replace(/por/g, '*')
        .replace(/entre/g, '/')
        .replace(/más/g, '+')
        .replace(/menos/g, '-')
        .replace(/x/g, '*');
      const resultado = Function('"use strict"; return (' + expresion + ')')();
      return `El resultado es ${resultado}.`;
    } catch {
      return null;
    }
  }

  return null;
}

// ── Boot sequence ─────────────────────────────────────
const bootLines = [
  'LOADING NEURAL NETWORK...',
  'CONNECTING TO GROQ API...',
  'INITIALIZING SPEECH RECOGNITION...',
  'LOADING MEMORY BANKS...',
  'CALIBRATING VOICE SYNTHESIS...',
  'CONNECTING TO GEMINI VISION...',
  'LOADING SPOTIFY MODULE...',
  'SYSTEM CHECK COMPLETE...',
  'ALL SYSTEMS NOMINAL...',
  'JARVIS ONLINE.'
];

async function runBootSequence() {
  const bootScreen = document.getElementById('boot-screen');
  const bootLinesEl = document.getElementById('boot-lines');
  const bootBar = document.getElementById('boot-bar');
  const bootStatus = document.getElementById('boot-status');

  if (!bootScreen) return;

  for (let i = 0; i < bootLines.length; i++) {
    const line = document.createElement('div');
    line.textContent = '> ' + bootLines[i];
    line.style.color = i === bootLines.length - 1 ? '#00d4ff' : '#00d4ff66';
    bootLinesEl.appendChild(line);
    bootLinesEl.scrollTop = bootLinesEl.scrollHeight;
    bootBar.style.width = ((i + 1) / bootLines.length * 100) + '%';
    bootStatus.textContent = bootLines[i];
    await new Promise(r => setTimeout(r, 180));
  }

  await new Promise(r => setTimeout(r, 500));

  bootScreen.style.transition = 'opacity 0.8s';
  bootScreen.style.opacity = '0';
  await new Promise(r => setTimeout(r, 800));
  bootScreen.style.display = 'none';
}

// ── Onda de audio ─────────────────────────────────────
let audioContext = null;
let analyser = null;
let waveAnimFrame = null;
const waveCanvas = document.getElementById('wave-canvas');
const waveCtx = waveCanvas ? waveCanvas.getContext('2d') : null;

function initAudioVisualizer() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
  }
}

function drawWave(color = '#00d4ff') {
  if (!waveCtx || !analyser) return;

  const W = waveCanvas.width = window.innerWidth;
  const H = waveCanvas.height = 80;
  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);

  function draw() {
    waveAnimFrame = requestAnimationFrame(draw);
    analyser.getByteTimeDomainData(dataArray);
    waveCtx.clearRect(0, 0, W, H);
    waveCtx.lineWidth = 1.5;
    waveCtx.strokeStyle = color + 'aa';
    waveCtx.beginPath();
    const sliceWidth = W / bufferLength;
    let x = 0;
    for (let i = 0; i < bufferLength; i++) {
      const v = dataArray[i] / 128.0;
      const y = v * H / 2;
      if (i === 0) waveCtx.moveTo(x, y);
      else waveCtx.lineTo(x, y);
      x += sliceWidth;
    }
    waveCtx.lineTo(W, H / 2);
    waveCtx.stroke();
  }
  draw();
}

function stopWave() {
  if (waveAnimFrame) {
    cancelAnimationFrame(waveAnimFrame);
    waveAnimFrame = null;
  }
  if (waveCtx && waveCanvas) {
    waveCtx.clearRect(0, 0, waveCanvas.width, waveCanvas.height);
  }
  if (waveCanvas) waveCanvas.classList.remove('visible');
}

async function speakWithWave(text) {
  if (waveCanvas) waveCanvas.classList.add('visible');

  try {
    initAudioVisualizer();
    const res = await fetch('https://api.elevenlabs.io/v1/text-to-speech/' + ELEVEN_VOICE_ID, {
      method: 'POST',
      headers: { 'xi-api-key': ELEVEN_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0.0, use_speaker_boost: true }
      })
    });

    if (!res.ok) throw new Error('ElevenLabs error');

    const arrayBuffer = await res.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(analyser);
    analyser.connect(audioContext.destination);
    drawWave();
    source.start(0);
    source.onended = () => stopWave();

  } catch (err) {
    stopWave();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'es-MX';
    utterance.rate = 1.0;
    utterance.pitch = 0.9;
    window.speechSynthesis.speak(utterance);
  }
}

// ── Modo manos libres ─────────────────────────────────
let modoManoLibres = false;
let reconocimientoFondo = null;

function iniciarModoManoLibres() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  reconocimientoFondo = new SR();
  reconocimientoFondo.lang = 'es-MX';
  reconocimientoFondo.continuous = true;
  reconocimientoFondo.interimResults = false;

  reconocimientoFondo.onresult = async (event) => {
    const texto = event.results[event.results.length - 1][0].transcript.toLowerCase();

    if (texto.includes('jarvis') && !isListening) {
      const textoLimpio = texto
        .replace(/jarvis[,.]?/gi, '')
        .trim();

      if (textoLimpio.length > 2) {
        transcriptEl.textContent = '« ' + textoLimpio + ' »';
        agregarMensaje(textoLimpio, 'usuario');
        if (ring) ring.classList.add('active');

        if (textoLimpio.toLowerCase().includes('qué ves') || textoLimpio.toLowerCase().includes('que ves')) {
          if (cameraOn) await capturarYAnalizar();
          else await sendToJarvis(textoLimpio);
        } else {
          await procesarMensaje(textoLimpio);
        }
      } else {
        recognition.start();
        isListening = true;
        btnMic.classList.add('active');
        if (statusEl) statusEl.textContent = 'Escuchando...';
      }
    }
  };

  reconocimientoFondo.onend = () => {
    if (modoManoLibres) {
      setTimeout(() => {
        try { reconocimientoFondo.start(); } catch(e) {}
      }, 300);
    }
  };

  reconocimientoFondo.onerror = () => {
    if (modoManoLibres) {
      setTimeout(() => {
        try { reconocimientoFondo.start(); } catch(e) {}
      }, 1000);
    }
  };

  try {
    reconocimientoFondo.start();
    if (statusEl) statusEl.textContent = 'Manos libres activo';
  } catch(e) {}
}

function detenerModoManoLibres() {
  modoManoLibres = false;
  if (reconocimientoFondo) {
    try { reconocimientoFondo.stop(); } catch(e) {}
    reconocimientoFondo = null;
  }
  if (statusEl) statusEl.textContent = 'Listo';
}

// ── Estado ────────────────────────────────────────────
let isListening = false;
let cameraOn = false;
let stream = null;
let conversationHistory = [];
let adjuntoActual = null;

const btnMic = document.getElementById('btn-mic');
const btnCam = document.getElementById('btn-cam');
const btnCapture = document.getElementById('btn-capture');
const btnSend = document.getElementById('btn-send');
const btnSendChat = document.getElementById('btn-send-chat');
const btnQuitarAdjunto = document.getElementById('btn-quitar-adjunto');
const chatInput = document.getElementById('chat-input');
const chatInputChat = document.getElementById('chat-input-chat');
const chatMensajes = document.getElementById('chat-mensajes');
const fileInput = document.getElementById('file-input');
const fileInputChat = document.getElementById('file-input-chat');
const previewAdjunto = document.getElementById('preview-adjunto');
const previewContenido = document.getElementById('preview-contenido');
const statusEl = document.getElementById('status-text') || document.getElementById('status');
const transcriptEl = document.getElementById('transcript');
const responseEl = document.getElementById('response');
const ring = document.getElementById('status-ring') || document.getElementById('ring');
const camPreview = document.getElementById('cam-preview');

const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = SpeechRecognitionAPI ? new SpeechRecognitionAPI() : null;
if (recognition) {
  recognition.lang = 'es-MX';
  recognition.continuous = false;
  recognition.interimResults = false;
}

if (recognition) recognition.onstart = () => {
  if (statusEl) statusEl.textContent = 'Escuchando...';
  if (ring) ring.classList.add('active');
};

if (recognition) recognition.onerror = (e) => {
  if (statusEl) statusEl.textContent = 'Error: ' + e.error;
  if (ring) ring.classList.remove('active');
  btnMic.classList.remove('active');
  isListening = false;
};

if (recognition) recognition.onend = () => {
  isListening = false;
  if (btnMic) btnMic.classList.remove('active');
  if (ring) ring.classList.remove('active');
};

if (recognition) recognition.onresult = async (event) => {
  const texto = event.results[0][0].transcript;
  transcriptEl.textContent = '« ' + texto + ' »';
  agregarMensaje(texto, 'usuario');

  if (cameraOn && (texto.toLowerCase().includes('qué ves') || texto.toLowerCase().includes('que ves') || texto.toLowerCase().includes('describe'))) {
    await capturarYAnalizar();
  } else {
    await procesarMensaje(texto);
  }
};

function agregarMensaje(texto, quien, esImagen = false) {
  const div = document.createElement('div');
  div.classList.add('msg', quien);
  if (esImagen) {
    const img = document.createElement('img');
    img.src = texto;
    div.appendChild(img);
  } else {
    div.textContent = texto;
  }
  chatMensajes.appendChild(div);
  chatMensajes.scrollTop = chatMensajes.scrollHeight;
}

if (fileInput) fileInput.addEventListener('change', async (e) => {
  const archivo = e.target.files[0];
  if (!archivo) return;
  const tipo = archivo.type;
  previewAdjunto.style.display = 'flex';

  if (tipo.startsWith('image/')) {
    const base64 = await fileToBase64(archivo);
    adjuntoActual = { tipo: 'imagen', data: base64.split(',')[1], mimeType: tipo, nombre: archivo.name };
    const img = document.createElement('img');
    img.src = base64;
    previewContenido.innerHTML = '';
    previewContenido.appendChild(img);
    const span = document.createElement('span');
    span.textContent = archivo.name;
    previewContenido.appendChild(span);
  } else if (tipo === 'application/pdf') {
    if (statusEl) statusEl.textContent = 'Leyendo PDF...';
    const texto = await leerPDF(archivo);
    adjuntoActual = { tipo: 'texto', data: texto, nombre: archivo.name };
    previewContenido.innerHTML = '📄 ' + archivo.name;
    if (statusEl) statusEl.textContent = 'Listo';
  } else if (tipo.includes('word') || archivo.name.endsWith('.docx') || archivo.name.endsWith('.doc')) {
    previewContenido.innerHTML = '📝 ' + archivo.name;
    adjuntoActual = { tipo: 'word', nombre: archivo.name };
  } else if (tipo.startsWith('video/')) {
    adjuntoActual = { tipo: 'video', nombre: archivo.name };
    previewContenido.innerHTML = '🎥 ' + archivo.name;
  }
  if (fileInput) fileInput.value = '';
});

if (btnQuitarAdjunto) btnQuitarAdjunto.addEventListener('click', () => {
  adjuntoActual = null;
  previewAdjunto.style.display = 'none';
  previewContenido.innerHTML = '';
});

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function leerPDF(archivo) {
  const arrayBuffer = await archivo.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let textoCompleto = '';
  for (let i = 1; i <= Math.min(pdf.numPages, 10); i++) {
    const pagina = await pdf.getPage(i);
    const contenido = await pagina.getTextContent();
    textoCompleto += contenido.items.map(item => item.str).join(' ') + '\n';
  }
  return textoCompleto;
}

async function procesarMensaje(texto) {
  const t = texto.toLowerCase();

  if (t.includes('conectar spotify') || t.includes('conecta spotify') || t.includes('login spotify')) {
    conectarSpotify();
    const msg = 'Abriendo ventana de Spotify. Inicia sesión y cierra la ventana cuando termine.';
    agregarMensaje('Jarvis: ' + msg, 'jarvis');
    responseEl.textContent = msg;
    await speak(msg);
    if (statusEl) statusEl.textContent = 'Listo';
    return;
  }

  const respuestaComando = await detectarComando(texto);
  if (respuestaComando && respuestaComando !== 'IMAGEN_GENERADA') {
    agregarMensaje('Jarvis: ' + respuestaComando, 'jarvis');
    responseEl.textContent = respuestaComando;
    await speak(respuestaComando);
    guardarEnHistorial(texto, respuestaComando);
    if (statusEl) statusEl.textContent = 'Listo';
  } else if (!respuestaComando) {
    const t = texto.toLowerCase();
    const esPreguntaInfo = t.includes('dónde') || t.includes('donde') ||
      t.includes('qué es') || t.includes('que es') ||
      t.includes('quién es') || t.includes('quien es') ||
      t.includes('cómo') || t.includes('como') ||
      t.includes('cuándo') || t.includes('cuando') ||
      t.includes('cuánto') || t.includes('cuanto') ||
      t.includes('cuál') || t.includes('cual');

    if (esPreguntaInfo) {
      await sendToJarvisConBusqueda(texto);
    } else {
      await sendToJarvis(texto);
    }
  }
}

async function sendToJarvisConBusqueda(texto) {
  if (statusEl) statusEl.textContent = 'Buscando...';
  if (ring) ring.classList.add('active');

  const resultadoWiki = await buscarInformacion(texto);

  const mensajeEnriquecido = resultadoWiki
    ? `El usuario pregunta: "${texto}"\n\nInformación encontrada: ${resultadoWiki}\n\nResponde de forma natural y concisa en español mexicano usando esta información.`
    : `El usuario pregunta: "${texto}"\n\nNo encontré información en Wikipedia. Responde con tu conocimiento de forma concisa en español mexicano. Si no sabes con certeza, dilo claramente.`;

  await sendToJarvis(mensajeEnriquecido);
}

async function enviarMensaje() {
  const texto = chatInput.value.trim();
  if (!texto && !adjuntoActual) return;
  chatInput.value = '';

  const t = texto.toLowerCase();
  if (cameraOn && (t.includes('qué ves') || t.includes('que ves') || t.includes('describe'))) {
    agregarMensaje(texto, 'usuario');
    await capturarYAnalizar();
    return;
  }

  if (adjuntoActual) {
    if (adjuntoActual.tipo === 'imagen') {
      agregarMensaje('data:' + adjuntoActual.mimeType + ';base64,' + adjuntoActual.data, 'usuario', true);
      if (texto) agregarMensaje(texto, 'usuario');
      await sendVisionToGemini(adjuntoActual.data, adjuntoActual.mimeType, texto || '¿Qué ves en esta imagen?');
    } else if (adjuntoActual.tipo === 'texto') {
      agregarMensaje('📄 ' + adjuntoActual.nombre, 'usuario');
      if (texto) agregarMensaje(texto, 'usuario');
      await sendToJarvis((texto || 'Resume este documento brevemente.') + '\n\nContenido:\n' + adjuntoActual.data.substring(0, 3000));
    } else {
      agregarMensaje((adjuntoActual.tipo === 'video' ? '🎥 ' : '📝 ') + adjuntoActual.nombre, 'usuario');
      if (texto) agregarMensaje(texto, 'usuario');
      await sendToJarvis(texto || 'El usuario adjuntó: ' + adjuntoActual.nombre);
    }
    adjuntoActual = null;
    previewAdjunto.style.display = 'none';
    previewContenido.innerHTML = '';
  } else {
    agregarMensaje(texto, 'usuario');
    await procesarMensaje(texto);
  }
}

async function capturarYAnalizar() {
  if (statusEl) statusEl.textContent = 'Enfocando...';
  await new Promise(resolve => setTimeout(resolve, 1500));
  const imagen = captureFrame();
  await sendVisionToGemini(imagen, 'image/jpeg', '¿Qué ves en esta imagen? Descríbela brevemente.');
}

function actualizarMemoria(userText) {
  const textoLower = userText.toLowerCase();
  const nombreMatch = textoLower.match(/me llamo ([a-záéíóúñ]+)/i) || textoLower.match(/mi nombre es ([a-záéíóúñ]+)/i);
  if (nombreMatch) memoria.nombre = nombreMatch[1].charAt(0).toUpperCase() + nombreMatch[1].slice(1);
  const gustoMatch = textoLower.match(/me gusta(?:n)? (.+)/i) || textoLower.match(/me encanta(?:n)? (.+)/i);
  if (gustoMatch && memoria.preferencias.length < 10 && !memoria.preferencias.includes(gustoMatch[1].trim())) memoria.preferencias.push(gustoMatch[1].trim());
  const hechoMatch = textoLower.match(/trabajo (?:en|como) (.+)/i) || textoLower.match(/vivo en (.+)/i);
  if (hechoMatch && memoria.hechos.length < 10 && !memoria.hechos.includes(userText.trim())) memoria.hechos.push(userText.trim());
  guardarMemoria(memoria);
}

async function sendToJarvis(userText) {
  if (!API_KEY || API_KEY === 'undefined' || API_KEY.length < 20) {
    agregarMensaje('Jarvis: ❌ API Key de Groq no configurada. Revisa tu config.js.', 'jarvis');
    if (statusEl) statusEl.textContent = 'Error: sin API key';
    return;
  }
  if (statusEl) statusEl.textContent = 'Pensando...';
  if (ring) ring.classList.add('active');
  conversationHistory.push({ role: 'user', content: userText });
  const contextoMemoria = construirContextoMemoria(memoria);

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: `${modos[modoActual].prompt}
Responde siempre en español mexicano.
Tus respuestas son cortas, máximo 2 o 3 oraciones, a menos que te pidan algo que requiera más detalle.
${contextoMemoria ? 'Lo que sabes del usuario: ' + contextoMemoria : ''}
Si el usuario te dice su nombre, úsalo naturalmente en la conversación.`
          },
          ...conversationHistory
        ],
        max_tokens: 300,
        temperature: 0.7
      })
    });

    if (res.status === 401) {
      const msg = '❌ API Key de Groq inválida. Genera una nueva en console.groq.com y actualiza config.js.';
      agregarMensaje('Jarvis: ' + msg, 'jarvis');
      if (statusEl) statusEl.textContent = 'Error: API Key inválida';
      if (ring) ring.classList.remove('active');
      return;
    }

    const data = await res.json();
    if (data.error) {
      if (statusEl) statusEl.textContent = 'Error: ' + data.error.message;
      agregarMensaje('Jarvis: Error — ' + data.error.message, 'jarvis');
      if (ring) ring.classList.remove('active');
      return;
    }

    const respuesta = data.choices[0].message.content;
    conversationHistory.push({ role: 'assistant', content: respuesta });
    actualizarMemoria(userText);
    guardarEnHistorial(userText, respuesta);
    agregarMensaje('Jarvis: ' + respuesta, 'jarvis');
    if (responseEl) responseEl.textContent = respuesta;
    agregarActividad('◈', userText.substring(0, 40));
    usoMensajes++;
    localStorage.setItem('uso-mensajes-hoy', usoMensajes);
    actualizarUso();
    await speak(respuesta);
    if (statusEl) statusEl.textContent = 'En línea';
    if (ring) ring.classList.remove('active');

  } catch (err) {
    if (statusEl) statusEl.textContent = 'Error de conexión';
    if (ring) ring.classList.remove('active');
    console.error(err);
  }
}

async function sendVisionToGemini(imageBase64, mimeType, pregunta) {
  if (statusEl) statusEl.textContent = 'Analizando imagen...';
  if (ring) ring.classList.add('active');

  try {
    const res = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + GEMINI_KEY,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ inlineData: { mimeType, data: imageBase64 } }, { text: pregunta + ' Responde en español mexicano.' }] }]
        })
      }
    );
    const data = await res.json();
    if (data.error) { if (statusEl) statusEl.textContent = 'Error de visión: ' + data.error.message; if (ring) ring.classList.remove('active'); return; }
    const descripcion = data.candidates[0].content.parts[0].text;
    conversationHistory.push({ role: 'user', content: '[El usuario compartió una imagen]' });
    conversationHistory.push({ role: 'assistant', content: descripcion });
    agregarMensaje('Jarvis: ' + descripcion, 'jarvis');
    responseEl.textContent = descripcion;
    await speak(descripcion);
    if (statusEl) statusEl.textContent = 'Listo';
    if (ring) ring.classList.remove('active');
  } catch (err) {
    if (statusEl) statusEl.textContent = 'Error de visión';
    if (ring) ring.classList.remove('active');
    console.error(err);
  }
}

async function speak(text) {
  await speakWithWave(text);
}

if (btnMic) btnMic.addEventListener('click', () => {
  if (!recognition) return;
  if (isListening) { recognition.stop(); isListening = false; btnMic.classList.remove('active'); if (statusEl) statusEl.textContent = 'Listo'; }
  else { recognition.start(); isListening = true; btnMic.classList.add('active'); }
});

if (btnSend) btnSend.addEventListener('click', enviarMensaje);
if (chatInput) chatInput.addEventListener('keydown', async (e) => { if (e.key === 'Enter') await enviarMensaje(); });

if (btnCam) btnCam.addEventListener('click', async () => {
  if (cameraOn) {
    stream.getTracks().forEach(t => t.stop());
    if (camPreview) { camPreview.classList.remove('visible'); camPreview.style.display = 'none'; }
    btnCam.classList.remove('active');
    if (btnCapture) btnCapture.style.display = 'none';
    cameraOn = false;
    if (statusEl) statusEl.textContent = 'Listo';
  } else {
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (camPreview) camPreview.srcObject = stream;
      await new Promise(resolve => setTimeout(resolve, 1500));
      if (camPreview) { camPreview.classList.add('visible'); camPreview.style.display = 'block'; }
      btnCam.classList.add('active');
      if (btnCapture) btnCapture.style.display = 'inline-block';
      cameraOn = true;
      if (statusEl) statusEl.textContent = 'Cámara activa — di "qué ves" o presiona Capturar';
    } catch (e) { if (statusEl) statusEl.textContent = 'No se pudo acceder a la cámara'; }
  }
});

if (btnCapture) btnCapture.addEventListener('click', async () => { await capturarYAnalizar(); });

function captureFrame() {
  const canvas = document.createElement('canvas');
  canvas.width = camPreview.videoWidth;
  canvas.height = camPreview.videoHeight;
  canvas.getContext('2d').drawImage(camPreview, 0, 0);
  return canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
}

// ── Panel de configuración → redirige a sección Ajustes ──
const btnConfig = document.getElementById('btn-config');
if (btnConfig) btnConfig.addEventListener('click', () => cambiarSeccion('ajustes'));

// Ajustes section wiring
const cfgGuardar = document.getElementById('cfg-guardar');
const cfgNombreAsistente = document.getElementById('cfg-nombre-asistente');
const cfgNombreUsuario = document.getElementById('cfg-nombre-usuario');
const cfgVelocidad = document.getElementById('cfg-velocidad');
const cfgVelocidadVal = document.getElementById('cfg-velocidad-val');
const cfgBorrarMemoria = document.getElementById('cfg-borrar-memoria');
const colorOpciones = document.querySelectorAll('.color-opcion');

if (cfgVelocidad) {
  cfgVelocidad.addEventListener('input', () => {
    if (cfgVelocidadVal) cfgVelocidadVal.textContent = parseFloat(cfgVelocidad.value).toFixed(1);
  });
}

colorOpciones.forEach(c => {
  c.addEventListener('click', () => {
    colorOpciones.forEach(x => x.classList.remove('seleccionado'));
    c.classList.add('seleccionado');
  });
});

if (cfgGuardar) {
  cfgGuardar.addEventListener('click', async () => {
    const colorSel = document.querySelector('.color-opcion.seleccionado');
    const nuevaConfig = {
      nombreAsistente: cfgNombreAsistente?.value.trim() || 'Jarvis',
      colorPrincipal: colorSel ? colorSel.dataset.color : '#00d4ff',
      velocidadVoz: parseFloat(cfgVelocidad?.value || 1.0)
    };
    localStorage.setItem('jarvis-config', JSON.stringify(nuevaConfig));
    aplicarConfig(nuevaConfig);
    config = nuevaConfig;
    if (cfgNombreUsuario?.value.trim()) {
      memoria.nombre = cfgNombreUsuario.value.trim();
      guardarMemoria(memoria);
      const nameEl = document.getElementById('greeting-name');
      const sidebarName = document.getElementById('sidebar-user-name');
      const avatarEl = document.getElementById('sidebar-user-avatar');
      if (nameEl) nameEl.textContent = memoria.nombre;
      if (sidebarName) sidebarName.textContent = memoria.nombre;
      if (avatarEl) avatarEl.textContent = memoria.nombre.charAt(0).toUpperCase();
    }
    const msg = `Configuración guardada. ${nuevaConfig.nombreAsistente} listo.`;
    agregarMensaje('Jarvis: ' + msg, 'jarvis');
    await speak(msg);
    cambiarSeccion('chat');
  });
}

if (cfgBorrarMemoria) {
  cfgBorrarMemoria.addEventListener('click', () => {
    if (confirm('¿Seguro que deseas borrar toda la memoria?')) {
      localStorage.removeItem('jarvis-memoria');
      memoria = cargarMemoria();
      agregarMensaje('Jarvis: Memoria borrada.', 'jarvis');
    }
  });
}

// Botón manos libres
const btnManosLibres = document.getElementById('btn-manos-libres');
if (btnManosLibres) {
  btnManosLibres.addEventListener('click', () => {
    if (modoManoLibres) {
      detenerModoManoLibres();
      btnManosLibres.classList.remove('active');
      btnManosLibres.textContent = '[ LIVE ]';
    } else {
      modoManoLibres = true;
      iniciarModoManoLibres();
      btnManosLibres.classList.add('active');
      btnManosLibres.textContent = '[ 🔴 LIVE ]';
    }
  });
}

// Panel historial
const btnHistorial = document.getElementById('btn-historial');
const panelHistorial = document.getElementById('panel-historial');
const btnCerrarHistorial = document.getElementById('btn-cerrar-historial');
const historialInput = document.getElementById('historial-input');
const btnBorrarHistorial = document.getElementById('btn-borrar-historial');

if (btnHistorial) {
  btnHistorial.addEventListener('click', () => {
    mostrarHistorial();
    if (panelHistorial) panelHistorial.style.display = 'flex';
  });
}

// ── Navegación sidebar ────────────────────────────────
function cambiarSeccion(nombre) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  const sec = document.getElementById('sec-' + nombre);
  if (sec) sec.classList.add('active');

  const nav = document.querySelector(`.nav-item[data-section="${nombre}"]`);
  if (nav) nav.classList.add('active');

  if (nombre === 'memoria') mostrarMemoria();
  if (nombre === 'ajustes') {
    const cfg = cargarConfig();
    const mem = cargarMemoria();
    if (cfgNombreAsistente) cfgNombreAsistente.value = cfg.nombreAsistente || 'Jarvis';
    if (cfgNombreUsuario) cfgNombreUsuario.value = mem.nombre || '';
    if (cfgVelocidad) { cfgVelocidad.value = cfg.velocidadVoz || 1.0; if (cfgVelocidadVal) cfgVelocidadVal.textContent = (cfg.velocidadVoz || 1.0).toFixed(1); }
    colorOpciones.forEach(c => c.classList.toggle('seleccionado', c.dataset.color === cfg.colorPrincipal));
  }
}

document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', () => {
    cambiarSeccion(item.dataset.section);
  });
});

// ── Sección Memoria ───────────────────────────────────
function mostrarMemoria() {
  const mem = cargarMemoria();
  const cont = document.getElementById('memoria-contenido');
  if (!cont) return;
  cont.innerHTML = '';

  const cards = [
    { titulo: 'NOMBRE', contenido: mem.nombre || 'No registrado' },
    { titulo: 'PREFERENCIAS', contenido: mem.preferencias.length > 0 ? mem.preferencias.join(', ') : 'Ninguna registrada' },
    { titulo: 'DATOS PERSONALES', contenido: mem.hechos.length > 0 ? mem.hechos.join('\n') : 'Ninguno registrado' }
  ];

  cards.forEach(card => {
    const div = document.createElement('div');
    div.classList.add('memoria-card');
    div.innerHTML = `<div class="memoria-card-title">${card.titulo}</div><div class="memoria-card-content">${card.contenido}</div>`;
    cont.appendChild(div);
  });
}

// ── Sección Tareas ────────────────────────────────────
let tareas = JSON.parse(localStorage.getItem('jarvis-tareas') || '[]');

function guardarTareas() {
  localStorage.setItem('jarvis-tareas', JSON.stringify(tareas));
}

function renderizarTareas() {
  const lista = document.getElementById('tareas-lista');
  if (!lista) return;
  lista.innerHTML = '';
  tareas.forEach((tarea, i) => {
    const div = document.createElement('div');
    div.classList.add('tarea-item');
    div.innerHTML = `
      <div class="tarea-check ${tarea.done ? 'done' : ''}" onclick="toggleTarea(${i})">${tarea.done ? '✓' : ''}</div>
      <div class="tarea-texto ${tarea.done ? 'done' : ''}">${tarea.texto}</div>
      <button class="tarea-del" onclick="eliminarTarea(${i})">[ X ]</button>
    `;
    lista.appendChild(div);
  });
}

window.toggleTarea = (i) => {
  tareas[i].done = !tareas[i].done;
  guardarTareas();
  renderizarTareas();
};

window.eliminarTarea = (i) => {
  tareas.splice(i, 1);
  guardarTareas();
  renderizarTareas();
};

const tareaAgregar = document.getElementById('tarea-agregar');
const tareaNueva = document.getElementById('tarea-nueva');

if (tareaAgregar) {
  tareaAgregar.addEventListener('click', () => {
    const texto = tareaNueva.value.trim();
    if (!texto) return;
    tareas.unshift({ texto, done: false, fecha: new Date().toLocaleString('es-MX') });
    guardarTareas();
    renderizarTareas();
    tareaNueva.value = '';
  });
}

if (tareaNueva) {
  tareaNueva.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') tareaAgregar?.click();
  });
}

// ── Sección Documentos ────────────────────────────────
const docFileInput = document.getElementById('doc-file-input');
const docQuestionArea = document.getElementById('doc-question-area');
const docAsk = document.getElementById('doc-ask');
const docQuestion = document.getElementById('doc-question');
const docResponse = document.getElementById('doc-response');
const docPreview = document.getElementById('doc-preview');

let docTexto = null;

if (docFileInput) {
  docFileInput.addEventListener('change', async (e) => {
    const archivo = e.target.files[0];
    if (!archivo) return;
    if (archivo.type === 'application/pdf') {
      docTexto = await leerPDF(archivo);
      docPreview.textContent = '📄 ' + archivo.name + ' — listo para analizar';
      docQuestionArea.style.display = 'flex';
    } else {
      docTexto = 'Archivo: ' + archivo.name;
      docPreview.textContent = '📝 ' + archivo.name;
      docQuestionArea.style.display = 'flex';
    }
  });
}

if (docAsk) {
  docAsk.addEventListener('click', async () => {
    const pregunta = docQuestion.value.trim();
    if (!pregunta || !docTexto) return;
    docResponse.textContent = 'Analizando...';
    await sendToJarvis(pregunta + '\n\nContenido del documento:\n' + docTexto.substring(0, 3000));
    docResponse.textContent = responseEl.textContent;
  });
}

// ── Sección Imágenes ──────────────────────────────────
const imgPrompt = document.getElementById('img-prompt');
const imgGenerar = document.getElementById('img-generar');
const imgGallery = document.getElementById('img-gallery');

if (imgGenerar) {
  imgGenerar.addEventListener('click', async () => {
    const desc = imgPrompt.value.trim();
    if (!desc) return;
    await generarImagenEnGaleria(desc);
    imgPrompt.value = '';
  });
}

if (imgPrompt) {
  imgPrompt.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') imgGenerar?.click();
  });
}

async function generarImagenEnGaleria(descripcion) {
  const prompt = encodeURIComponent(descripcion);
  const seed = Math.floor(Math.random() * 99999);
  const fuentes = [
    `https://source.unsplash.com/512x512/?${prompt}&sig=${seed}`,
    `https://loremflickr.com/512/512/${prompt}?random=${seed}`,
    `https://picsum.photos/seed/${seed}/512/512`,
  ];

  const wrapper = document.createElement('div');
  wrapper.style.cssText = 'position:relative;';
  const loading = document.createElement('div');
  loading.textContent = '⏳ Generando...';
  loading.style.cssText = 'padding:2rem;text-align:center;font-size:12px;color:#00d4ff66;border:1px solid #00d4ff22;border-radius:4px;';
  wrapper.appendChild(loading);
  imgGallery?.prepend(wrapper);

  const img = new Image();
  img.classList.add('img-generada');
  img.alt = descripcion;

  let intentoActual = 0;
  img.onerror = () => {
    intentoActual++;
    if (intentoActual < fuentes.length) img.src = fuentes[intentoActual];
    else { loading.textContent = '❌ No se pudo generar'; }
  };

  img.onload = () => {
    loading.remove();
    wrapper.appendChild(img);
  };

  img.src = fuentes[0];
  agregarActividad('◻', 'Imagen generada: ' + descripcion);
}

// ── Sección Música ────────────────────────────────────
const musicaQuery = document.getElementById('musica-query');
const musicaPlay = document.getElementById('musica-play');
const musicaPause = document.getElementById('musica-pause');
const musicaNext = document.getElementById('musica-next');
const musicaResume = document.getElementById('musica-resume');
const btnSpotifyConnect = document.getElementById('btn-spotify-connect');
const musicaStatus = document.getElementById('musica-status');

if (musicaPlay) {
  musicaPlay.addEventListener('click', async () => {
    const query = musicaQuery.value.trim();
    if (!query) return;
    const resultado = await abrirMusica(query);
    if (musicaStatus) musicaStatus.textContent = resultado;
    agregarActividad('♪', resultado);
  });
}

if (musicaPause) {
  musicaPause.addEventListener('click', async () => {
    const token = await getSpotifyToken();
    if (token) {
      fetch('https://api.spotify.com/v1/me/player/pause', { method: 'PUT', headers: { 'Authorization': 'Bearer ' + token } });
      if (musicaStatus) musicaStatus.textContent = 'Música pausada.';
    }
  });
}

if (musicaNext) {
  musicaNext.addEventListener('click', async () => {
    const token = await getSpotifyToken();
    if (token) {
      fetch('https://api.spotify.com/v1/me/player/next', { method: 'POST', headers: { 'Authorization': 'Bearer ' + token } });
      if (musicaStatus) musicaStatus.textContent = 'Siguiente canción.';
    }
  });
}

if (musicaResume) {
  musicaResume.addEventListener('click', async () => {
    const token = await getSpotifyToken();
    if (token) {
      fetch('https://api.spotify.com/v1/me/player/play', { method: 'PUT', headers: { 'Authorization': 'Bearer ' + token } });
      if (musicaStatus) musicaStatus.textContent = 'Música reanudada.';
    }
  });
}

if (btnSpotifyConnect) {
  btnSpotifyConnect.addEventListener('click', async () => {
    await conectarSpotify();
    if (musicaStatus) musicaStatus.textContent = 'Conectando Spotify...';
  });
}

// ── Actividad reciente ────────────────────────────────
function agregarActividad(icono, texto) {
  const lista = document.getElementById('actividad-lista');
  if (!lista) return;
  const div = document.createElement('div');
  div.classList.add('actividad-item');
  div.innerHTML = `
    <div class="actividad-icon">${icono}</div>
    <div class="actividad-info">
      <div class="actividad-texto">${texto}</div>
      <div class="actividad-tiempo">Hace un momento</div>
    </div>
  `;
  lista.prepend(div);
  if (lista.children.length > 5) lista.lastChild.remove();
}

// ── Contadores de uso ─────────────────────────────────
let usoMensajes = parseInt(localStorage.getItem('uso-mensajes-hoy') || '0');
let usoImagenes = parseInt(localStorage.getItem('uso-imagenes-hoy') || '0');
let usoBusquedas = parseInt(localStorage.getItem('uso-busquedas-hoy') || '0');

function actualizarStatusElevenLabs() {
  const el = document.getElementById('status-eleven');
  if (!el) return;
  el.textContent = '● Conectado';
  el.className = 'integracion-status connected';
}

function actualizarStatusSpotify() {
  const el = document.getElementById('status-spotify');
  if (!el) return;
  const token = localStorage.getItem('spotify-token');
  const tiempo = localStorage.getItem('spotify-token-time');
  const valido = token && tiempo && (Date.now() - parseInt(tiempo)) < 3600000;
  el.textContent = valido ? '● Conectado' : '○ Desconectado';
  el.className = 'integracion-status' + (valido ? ' connected' : '');
}

function actualizarUso() {
  const mEl = document.getElementById('uso-mensajes-num');
  const iEl = document.getElementById('uso-imagenes-num');
  const bEl = document.getElementById('uso-busquedas-num');
  const mBar = document.getElementById('uso-mensajes-bar');
  const iBar = document.getElementById('uso-imagenes-bar');
  const bBar = document.getElementById('uso-busquedas-bar');

  if (mEl) mEl.textContent = usoMensajes + ' / ∞';
  if (iEl) iEl.textContent = usoImagenes + ' / 50';
  if (bEl) bEl.textContent = usoBusquedas + ' / 100';
  if (mBar) mBar.style.width = Math.min(usoMensajes / 3, 100) + '%';
  if (iBar) iBar.style.width = Math.min(usoImagenes / 50 * 100, 100) + '%';
  if (bBar) bBar.style.width = Math.min(usoBusquedas / 100 * 100, 100) + '%';
}

// ── Chat desde inicio ─────────────────────────────────

// ── Chat section inputs ───────────────────────────────
if (btnSendChat) {
  btnSendChat.addEventListener('click', async () => {
    const texto = chatInputChat?.value.trim();
    if (!texto && !adjuntoActual) return;
    if (chatInputChat) chatInputChat.value = '';
    await enviarMensajeChat(texto);
  });
}

if (chatInputChat) {
  chatInputChat.addEventListener('keydown', async (e) => {
    if (e.key === 'Enter') {
      const texto = chatInputChat.value.trim();
      if (!texto && !adjuntoActual) return;
      chatInputChat.value = '';
      await enviarMensajeChat(texto);
    }
  });
}

if (fileInputChat) {
  fileInputChat.addEventListener('change', async (e) => {
    if (fileInput) {
      fileInput.files = e.target.files;
      fileInput.dispatchEvent(new Event('change'));
    }
  });
}

async function enviarMensajeChat(texto) {
  if (adjuntoActual) {
    if (adjuntoActual.tipo === 'imagen') {
      agregarMensaje('data:' + adjuntoActual.mimeType + ';base64,' + adjuntoActual.data, 'usuario', true);
      if (texto) agregarMensaje(texto, 'usuario');
      await sendVisionToGemini(adjuntoActual.data, adjuntoActual.mimeType, texto || '¿Qué ves en esta imagen?');
    } else if (adjuntoActual.tipo === 'texto') {
      agregarMensaje('📄 ' + adjuntoActual.nombre, 'usuario');
      if (texto) agregarMensaje(texto, 'usuario');
      await sendToJarvis((texto || 'Resume este documento.') + '\n\nContenido:\n' + adjuntoActual.data.substring(0, 3000));
    } else {
      agregarMensaje((adjuntoActual.tipo === 'video' ? '🎥 ' : '📝 ') + adjuntoActual.nombre, 'usuario');
      if (texto) agregarMensaje(texto, 'usuario');
      await sendToJarvis(texto || 'El usuario adjuntó: ' + adjuntoActual.nombre);
    }
    adjuntoActual = null;
    previewAdjunto.style.display = 'none';
    previewContenido.innerHTML = '';
  } else if (texto) {
    agregarMensaje(texto, 'usuario');
    await procesarMensaje(texto);
  }
}


// ── Historial panel event listeners ──────────────────
if (btnCerrarHistorial) {
  btnCerrarHistorial.addEventListener('click', () => {
    panelHistorial.style.display = 'none';
  });
}

if (panelHistorial) {
  panelHistorial.addEventListener('click', (e) => {
    if (e.target === panelHistorial) panelHistorial.style.display = 'none';
  });
}

if (historialInput) {
  historialInput.addEventListener('input', () => mostrarHistorial(historialInput.value));
}

if (btnBorrarHistorial) {
  btnBorrarHistorial.addEventListener('click', () => {
    if (confirm('¿Borrar todo el historial?')) {
      localStorage.removeItem('jarvis-historial');
      mostrarHistorial();
    }
  });
}

window.addEventListener('load', async () => {
  await runBootSequence();
  await pedirPermisoNotificaciones();
  const mem = cargarMemoria();
  const saludo = mem.nombre
    ? `Bienvenido de vuelta, ${mem.nombre}. ¿En qué le puedo ayudar?`
    : 'Jarvis en línea. ¿En qué le puedo ayudar?';

  agregarMensaje('Jarvis: ' + saludo, 'jarvis');
  if (responseEl) responseEl.textContent = saludo;

  const nameEl = document.getElementById('greeting-name');
  const sidebarName = document.getElementById('sidebar-user-name');
  const avatarEl = document.getElementById('sidebar-user-avatar');
  if (mem.nombre) {
    if (nameEl) nameEl.textContent = mem.nombre;
    if (sidebarName) sidebarName.textContent = mem.nombre;
    if (avatarEl) avatarEl.textContent = mem.nombre.charAt(0).toUpperCase();
  }

  renderizarTareas();
  actualizarUso();
  actualizarStatusSpotify(); actualizarStatusElevenLabs();
  await speak(saludo);
});