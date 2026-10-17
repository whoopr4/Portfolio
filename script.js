// Renders the portfolio from content.json.
// Each work/ai item: { title, description, tag, loop, poster, full, image, tool }
//   loop  – short muted MP4 shown in the window (assets/loops/...)
//   full  – optional link to the full video (opens in the viewer if it's an .mp4 or a YouTube link)
//   image – for still graphics instead of a loop

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function mediaHTML(item) {
  if (item.loop) {
    return `<video src="${esc(item.loop)}" ${item.poster ? `poster="${esc(item.poster)}"` : ''} muted loop playsinline preload="none" data-autoplay></video>`;
  }
  if (item.image) return `<img src="${esc(item.image)}" alt="" loading="lazy">`;
  return `<div class="ph mono">[ CLIP ]</div>`;
}

function card(item, i, dark) {
  const label = dark ? `<div class="mono tool">${esc(item.tool || item.tag || '')}</div>` : '';
  const mediaClass = ['media', item.shape === 'tall' ? 'tall' : '', item.fit === 'contain' ? 'contain' : ''].join(' ');
  return `<button class="win" data-i="${i}" data-set="${dark ? 'ai' : 'work'}">
    ${dark ? '' : `<div class="bar"><span class="dot"></span><span class="dot"></span><span class="dot on"></span><span class="mono tag">${esc((item.tag || '').toUpperCase())}</span></div>`}
    <div class="${mediaClass}">${mediaHTML(item)}</div>
    <div class="win-text">${label}<h3>${esc(item.title)}</h3>${dark ? '' : `<p>${esc(item.description)}</p>`}</div>
  </button>`;
}

let data = { work: [], ai: [] };
let filter = 'All';

function renderWork() {
  const items = data.work.map((w, i) => [w, i]).filter(([w]) => filter === 'All' || w.tag === filter);
  $('workGrid').innerHTML = items.length
    ? items.map(([w, i]) => card(w, i, false)).join('')
    : `<p class="muted">New work coming soon.</p>`;
  watchVideos();
}

function renderFilters() {
  const tags = ['All', ...new Set(data.work.map((w) => w.tag).filter(Boolean))];
  if (tags.length < 3) { $('filters').hidden = true; return; }
  $('filters').innerHTML = tags.map((t) => `<button type="button" aria-pressed="${t === filter}">${esc(t)}</button>`).join('');
  $('filters').querySelectorAll('button').forEach((b) => b.addEventListener('click', () => {
    filter = b.textContent; renderFilters(); renderWork();
  }));
}

// Only play loops that are on screen, to save data and battery.
let observer;
function watchVideos() {
  observer?.disconnect();
  observer = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      const v = e.target;
      if (e.isIntersecting) { if (v.preload === 'none') v.preload = 'auto'; v.play().catch(() => {}); }
      else v.pause();
    });
  }, { threshold: 0.25 });
  document.querySelectorAll('video[data-autoplay]').forEach((v) => observer.observe(v));
}

function youTubeId(url) {
  const m = String(url).match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([\w-]{11})/);
  return m && m[1];
}

function driveId(url) {
  const m = String(url).match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?.*id=)([\w-]{20,})/);
  return m && m[1];
}

function openViewer(item) {
  const box = $('viewerMedia');
  const yt = item.full && youTubeId(item.full);
  const gd = item.full && driveId(item.full);
  if (gd) box.innerHTML = `<iframe src="https://drive.google.com/file/d/${gd}/preview" allow="autoplay; fullscreen" allowfullscreen title="${esc(item.title)}"></iframe>`;
  else if (yt) box.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${yt}?autoplay=1&rel=0" allow="autoplay; fullscreen" allowfullscreen title="${esc(item.title)}"></iframe>`;
  else if (item.full && /\.(mp4|webm)(\?|$)/i.test(item.full)) box.innerHTML = `<video src="${esc(item.full)}" controls autoplay playsinline></video>`;
  else if (item.loop) box.innerHTML = `<video src="${esc(item.loop)}" autoplay muted loop playsinline></video>`;
  else if (item.image) box.innerHTML = `<img src="${esc(item.image)}" alt="${esc(item.title)}">`;
  else box.innerHTML = '';
  $('viewerTitle').textContent = item.title || '';
  $('viewerDesc').textContent = item.description || '';
  $('viewer').showModal();
}

function closeViewer() { $('viewer').close(); }
$('closeViewer').addEventListener('click', closeViewer);
$('viewer').addEventListener('close', () => { $('viewerMedia').innerHTML = ''; });
$('viewer').addEventListener('click', (e) => { if (e.target === $('viewer')) closeViewer(); });

document.addEventListener('click', (e) => {
  const w = e.target.closest('.win');
  if (!w) return;
  openViewer(data[w.dataset.set][+w.dataset.i]);
});

$('year').textContent = new Date().getFullYear();

fetch('content.json', { cache: 'no-cache' })
  .then((r) => r.json())
  .then((json) => {
    data = { work: [], ai: [], ...json };
    $('skills').innerHTML = (data.skills || []).map((s) => `<span>${esc(s)}</span>`).join('');
    $('aiTools').innerHTML = (data.aiTools || []).map((s) => `<span>${esc(s)}</span>`).join('');
    if (data.heroPoster) $('heroVideo').poster = data.heroPoster;
    if (data.heroLoop) $('heroVideo').src = data.heroLoop;
    if (data.linkedin) $('linkedinLink').href = data.linkedin; else $('linkedinLink').hidden = true;
    renderFilters();
    renderWork();
    $('aiGrid').innerHTML = data.ai.length
      ? data.ai.map((a, i) => card(a, i, true)).join('')
      : `<p style="color:rgba(245,243,238,.6)">AI experiments coming soon.</p>`;
    watchVideos();
  })
  .catch(() => { $('workGrid').innerHTML = '<p class="muted">Work is loading – please refresh.</p>'; });
