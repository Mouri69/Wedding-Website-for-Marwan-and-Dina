/* ═══════════════════════════════════════════════════════
   app.js  —  Marwan & Dina Wedding Invitation
═══════════════════════════════════════════════════════ */

/* ──────────────────────────────────────────
   API HELPERS
────────────────────────────────────────── */
async function api(method, path, body) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' }
  };
  if (body) opts.body = JSON.stringify(body);
  const res  = await fetch(path, opts);
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Request failed');
  return json;
}

const GET   = (path)    => api('GET',  path);
const POST  = (path, b) => api('POST', path, b);
const PVOTE = (id)      => api('POST', `/api/drawings/${id}/vote`);

/* ──────────────────────────────────────────
   LANGUAGE TOGGLE
────────────────────────────────────────── */
function setLang(lang) {
  const ar = lang === 'ar';
  document.body.classList.toggle('arabic', ar);
  document.documentElement.lang = lang;
  document.documentElement.dir  = ar ? 'rtl' : 'ltr';
  document.getElementById('btnEn').classList.toggle('active', !ar);
  document.getElementById('btnAr').classList.toggle('active',  ar);
  renderMessages(_cachedMessages);
  renderGallery(_cachedDrawings);
}

/* ──────────────────────────────────────────
   FLOATING PETALS
────────────────────────────────────────── */
const PETAL_COLORS = ['#f9d0da','#f2d4da','#fce8ee','#f5c6d0','#e8a0b0'];

(function spawnPetals() {
  const bg = document.getElementById('petalBg');
  for (let i = 0; i < 22; i++) {
    const p = document.createElement('div');
    p.className = 'petal';
    p.style.cssText = `
      left: ${Math.random() * 100}%;
      background: ${PETAL_COLORS[i % PETAL_COLORS.length]};
      width: ${8 + Math.random() * 9}px;
      height: ${12 + Math.random() * 10}px;
      animation-duration: ${9 + Math.random() * 12}s;
      animation-delay: ${Math.random() * 14}s;
      transform: rotate(${Math.random() * 360}deg);
    `;
    bg.appendChild(p);
  }
})();

/* ──────────────────────────────────────────
   ENVELOPE OPEN
────────────────────────────────────────── */
function openEnvelope() {
  const overlay = document.getElementById('opening-overlay');
  overlay.classList.add('active');

  const ring = document.getElementById('burstRing');
  for (let i = 0; i < 30; i++) {
    const angle = (i / 30) * 360;
    const dist  = 160 + Math.random() * 200;
    const rad   = angle * Math.PI / 180;
    const p     = document.createElement('div');
    p.className = 'burst-petal';
    p.style.cssText = `
      --a: ${angle}deg;
      --dx: ${(Math.cos(rad) * dist).toFixed(1)}px;
      --dy: ${(Math.sin(rad) * dist).toFixed(1)}px;
      background: ${PETAL_COLORS[i % PETAL_COLORS.length]};
      width: ${10 + Math.random() * 8}px;
      height: ${16 + Math.random() * 10}px;
      animation-delay: ${(Math.random() * 0.35).toFixed(2)}s;
    `;
    ring.appendChild(p);
  }

  setTimeout(() => {
    overlay.classList.remove('active');
    document.getElementById('envelope-scene').style.display = 'none';
    const inv = document.getElementById('invitation');
    inv.classList.add('active');
    startCountdown();
    initCanvas();
    loadMessages();
    loadGallery();
  }, 2600);
}

/* ──────────────────────────────────────────
   COUNTDOWN
────────────────────────────────────────── */
function startCountdown() {
  const target = new Date('2027-03-17T18:00:00');

  function tick() {
    const diff = target - Date.now();
    if (diff <= 0) {
      ['d','h','m','s'].forEach(id => {
        document.getElementById('cd-' + id).textContent = '0';
      });
      return;
    }
    document.getElementById('cd-d').textContent = Math.floor(diff / 86400000);
    document.getElementById('cd-h').textContent = String(Math.floor((diff % 86400000) / 3600000)).padStart(2, '0');
    document.getElementById('cd-m').textContent = String(Math.floor((diff % 3600000)  / 60000 )).padStart(2, '0');
    document.getElementById('cd-s').textContent = String(Math.floor((diff % 60000)    / 1000  )).padStart(2, '0');
  }

  tick();
  setInterval(tick, 1000);
}

/* ──────────────────────────────────────────
   RSVP
────────────────────────────────────────── */
async function submitRsvp(answer, btn) {
  const name = document.getElementById('rsvpName').value.trim();
  const fb   = document.getElementById('rsvpFeedback');
  const ar   = document.body.classList.contains('arabic');

  if (!name) {
    fb.textContent = ar
      ? 'رجاءً أدخل اسمك أولاً'
      : 'Please enter your name first';
    return;
  }

  document.querySelectorAll('.rsvp-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');

  try {
    await POST('/api/rsvps', { name, answer });

    const msgs = {
      yes:   { en: "🎉 We can't wait to celebrate with you!", ar: "🎉 لا يسعنا الانتظار للاحتفال معك!" },
      maybe: { en: "🤞 We hope to see you there!",            ar: "🤞 نأمل أن نراك هناك!" },
      no:    { en: "💔 You'll be missed dearly.",             ar: "💔 ستشتاق إليك قلوبنا." }
    };
    fb.textContent = msgs[answer][ar ? 'ar' : 'en'];

  } catch(e) {
    fb.textContent = ar
      ? 'حدث خطأ، حاول مرة أخرى'
      : 'Something went wrong, please try again';
  }
}

/* ──────────────────────────────────────────
   MESSAGES
────────────────────────────────────────── */
let _cachedMessages = [];

async function loadMessages() {
  try {
    _cachedMessages = await GET('/api/messages');
    renderMessages(_cachedMessages);
  } catch(e) {
    console.error('loadMessages:', e);
  }
}

function renderMessages(msgs) {
  const wall  = document.getElementById('messagesWall');
  const empty = document.getElementById('msgEmpty');

  if (!msgs || msgs.length === 0) {
    wall.innerHTML = '';
    wall.appendChild(empty);
    empty.style.display = 'block';
    return;
  }

  empty.style.display = 'none';
  wall.innerHTML = '';
  msgs.forEach(m => {
    const div = document.createElement('div');
    div.className = 'msg-bubble';
    div.innerHTML = `
      <div class="msg-author">${esc(m.name)}</div>
      <div class="msg-text">${esc(m.message)}</div>
    `;
    wall.appendChild(div);
  });
}

async function submitMessage() {
  const name = document.getElementById('msgName').value.trim();
  const text = document.getElementById('msgText').value.trim();
  const btn  = document.getElementById('msgBtn');
  const ok   = document.getElementById('msgOk');

  if (!name || !text) return;

  setLoading(btn, true);
  try {
    await POST('/api/messages', { name, message: text });
    document.getElementById('msgText').value = '';
    ok.style.display = 'inline';
    setTimeout(() => { ok.style.display = 'none'; }, 3500);
    await loadMessages();
  } catch(e) {
    alert('Could not send message. Please try again.');
  } finally {
    setLoading(btn, false);
  }
}

/* ──────────────────────────────────────────
   DRAWING CANVAS
────────────────────────────────────────── */
let _ctx, _drawColor = '#c97b8c', _isEraser = false, _isDrawing = false;

function initCanvas() {
  const canvas = document.getElementById('drawCanvas');
  _ctx = canvas.getContext('2d');
  _ctx.fillStyle = '#ffffff';
  _ctx.fillRect(0, 0, canvas.width, canvas.height);
  _ctx.lineCap  = 'round';
  _ctx.lineJoin = 'round';

  function pos(e) {
    const r  = canvas.getBoundingClientRect();
    const sx = canvas.width  / r.width;
    const sy = canvas.height / r.height;
    const src = e.touches ? e.touches[0] : e;
    return {
      x: (src.clientX - r.left) * sx,
      y: (src.clientY - r.top)  * sy
    };
  }

  function startDraw(e) {
    _isDrawing = true;
    const p = pos(e);
    _ctx.beginPath();
    _ctx.moveTo(p.x, p.y);
  }

  function draw(e) {
    if (!_isDrawing) return;
    e.preventDefault();
    const p = pos(e);
    _ctx.strokeStyle = _isEraser ? '#ffffff' : _drawColor;
    _ctx.lineWidth   = document.getElementById('brushSize').value;
    _ctx.lineTo(p.x, p.y);
    _ctx.stroke();
  }

  function stopDraw() { _isDrawing = false; }

  canvas.addEventListener('mousedown',  startDraw);
  canvas.addEventListener('mousemove',  draw);
  canvas.addEventListener('mouseup',    stopDraw);
  canvas.addEventListener('mouseleave', stopDraw);
  canvas.addEventListener('touchstart', startDraw, { passive: false });
  canvas.addEventListener('touchmove',  draw,      { passive: false });
  canvas.addEventListener('touchend',   stopDraw);
}

function setColor(c, el) {
  _drawColor = c;
  _isEraser  = false;
  document.getElementById('eraserBtn').classList.remove('eraser-on');
  document.querySelectorAll('.color-dot').forEach(d => d.classList.remove('active'));
  el.classList.add('active');
}

function toggleEraser() {
  _isEraser = !_isEraser;
  document.getElementById('eraserBtn').classList.toggle('eraser-on', _isEraser);
}

function clearCanvas() {
  if (!_ctx) return;
  const c = document.getElementById('drawCanvas');
  _ctx.fillStyle = '#ffffff';
  _ctx.fillRect(0, 0, c.width, c.height);
}

async function submitDrawing() {
  const name = document.getElementById('drawName').value.trim();
  const btn  = document.getElementById('drawBtn');
  const ok   = document.getElementById('drawOk');

  if (!name) {
    alert(document.body.classList.contains('arabic')
      ? 'رجاءً أدخل اسمك'
      : 'Please enter your name first');
    return;
  }

  const canvas     = document.getElementById('drawCanvas');
  const image_data = canvas.toDataURL('image/png');

  setLoading(btn, true);
  try {
    await POST('/api/drawings', { name, image_data });
    clearCanvas();
    ok.style.display = 'inline';
    setTimeout(() => { ok.style.display = 'none'; }, 3500);
    await loadGallery();
  } catch(e) {
    alert('Could not save drawing. Please try again.');
  } finally {
    setLoading(btn, false);
  }
}

/* ──────────────────────────────────────────
   GALLERY
────────────────────────────────────────── */
let _galleryTab     = 'top';
let _cachedDrawings = [];
const _votedIds     = new Set(
  JSON.parse(localStorage.getItem('weddingVotedDrawings') || '[]')
);

async function loadGallery() {
  try {
    _cachedDrawings = await GET('/api/drawings');
    renderGallery(_cachedDrawings);
  } catch(e) {
    console.error('loadGallery:', e);
  }
}

function switchTab(tab) {
  _galleryTab = tab;
  document.getElementById('tabTop').classList.toggle('active', tab === 'top');
  document.getElementById('tabAll').classList.toggle('active', tab === 'all');
  renderGallery(_cachedDrawings);
}

function renderGallery(drawings) {
  const grid   = document.getElementById('galleryGrid');
  const ar     = document.body.classList.contains('arabic');
  const sorted = [...(drawings || [])].sort((a, b) => (b.votes || 0) - (a.votes || 0));
  const items  = _galleryTab === 'top' ? sorted.slice(0, 5) : sorted;

  if (!items.length) {
    grid.innerHTML = `<div class="gallery-empty">
      ${ar ? 'لا رسومات بعد — كن أول فنان!' : 'No drawings yet — be the first artist!'}
    </div>`;
    return;
  }

  grid.innerHTML = '';
  items.forEach((d, idx) => {
    const voted = _votedIds.has(String(d.id));
    const rank  = _galleryTab === 'top'
      ? `<div class="gallery-rank">${idx + 1}</div>`
      : '';

    const item = document.createElement('div');
    item.className = 'gallery-item';
    item.innerHTML = `
      ${rank}
      <img
        src="${d.image_data}"
        alt="${esc(d.name)}"
        onclick="openDrawModal('${encodeURIComponent(d.image_data)}','${esc(d.name)}')"
      />
      <div class="gallery-meta">
        <span class="gallery-author">${esc(d.name)}</span>
        <button
          class="vote-btn ${voted ? 'voted' : ''}"
          onclick="voteDrawing('${d.id}', this)">
          ♥ ${d.votes || 0}
        </button>
      </div>
    `;
    grid.appendChild(item);
  });
}

async function voteDrawing(id, btn) {
  if (_votedIds.has(String(id))) return;

  _votedIds.add(String(id));
  localStorage.setItem('weddingVotedDrawings', JSON.stringify([..._votedIds]));
  btn.classList.add('voted');

  try {
    await PVOTE(id);
    await loadGallery();
  } catch(e) {
    console.error('vote failed:', e);
  }
}

/* ──────────────────────────────────────────
   MODAL
────────────────────────────────────────── */
function openDrawModal(encodedSrc, author) {
  document.getElementById('modalImg').src          = decodeURIComponent(encodedSrc);
  document.getElementById('modalAuthor').textContent = author;
  document.getElementById('drawModal').classList.add('open');
}

function closeDrawModal() {
  document.getElementById('drawModal').classList.remove('open');
}

function closeModalBg(e) {
  if (e.target.id === 'drawModal') closeDrawModal();
}

/* ──────────────────────────────────────────
   UTILS
────────────────────────────────────────── */
function esc(s) {
  return String(s)
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;');
}

function setLoading(btn, loading) {
  btn.disabled = loading;
  if (loading) {
    btn._originalHTML = btn.innerHTML;
    btn.innerHTML = '<span class="spinner"></span>';
  } else {
    btn.innerHTML = btn._originalHTML || btn.innerHTML;
  }
}