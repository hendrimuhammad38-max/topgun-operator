'use strict';
/* ============================================================
   TOPGUN OPERATOR — Frontend SPA
   ============================================================ */

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
const esc = v => String(v === null || v === undefined ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const app = $('#app');

const IK = {
  home: '<path d="M4 11l8-7 8 7v8a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M3 20c0-3.5 2.7-6 6-6s6 2.5 6 6"/><path d="M16 5a3.5 3.5 0 0 1 0 6.5M18 14.5c1.9.8 3 2.8 3 5.5"/>',
  doc: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 12h6M9 16h6"/>',
  chart: '<circle cx="12" cy="12" r="9"/><path d="M12 3v9l6.5 6"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 3l1.5 2.6 3-.4.6 3 2.6 1.5-1.4 2.3 1.4 2.3-2.6 1.5-.6 3-3-.4L12 21l-1.5-2.6-3 .4-.6-3-2.6-1.5 1.4-2.3-1.4-2.3 2.6-1.5.6-3 3 .4z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  edit: '<path d="M4 20l1-4L16 5l3 3L8 19z"/>',
  trash: '<path d="M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13"/>',
  eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  out: '<path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10"/>',
  moon: '<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5z"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  grid: '<path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z"/>',
  flag: '<path d="M6 21V4h11l-2 4 2 4H6"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7"/>',
  left: '<path d="M15 5l-7 7 7 7"/>',
  right: '<path d="M9 5l7 7-7 7"/>',
  sheet: '<path d="M4 4h16v16H4zM4 10h16M4 15h16M10 4v16"/>',
  image: '<path d="M4 5h16v14H4z"/><circle cx="9" cy="10" r="1.6"/><path d="M4 17l5-4 3 2 4-4 4 4"/>'
};
const ik = n => `<svg class="ik" viewBox="0 0 24 24" aria-hidden="true">${IK[n]}</svg>`;

/* Lambang bawaan bila admin belum mengisi logo: dua chevron pangkat. */
const LOGO_BAWAAN = `<svg class="logo-svg" viewBox="0 0 48 48" aria-hidden="true"><path d="M6 24 24 8l18 16-7 6-11-10-11 10z" fill="currentColor"/><path d="M13 35l11-10 11 10-6 5-5-4.5-5 4.5z" fill="#1CAEE8"/></svg>`;

const ALAT_BAWAAN = `<svg viewBox="0 0 320 180" aria-hidden="true"><g fill="currentColor"><rect x="24" y="136" width="176" height="30" rx="15"/><rect x="48" y="84" width="118" height="46" rx="8"/><path d="M62 38h52a6 6 0 0 1 6 6v40H56V44a6 6 0 0 1 6-6z"/><path d="M150 96 208 26a10 10 0 0 1 15-1l60 54-12 13-52-47-52 62z"/><path d="M262 92l24-13 6 42c1 8-4 16-12 18l-36 8-4-14 26-8z"/></g></svg>`;

/* ── Pemanggil server ── */
let jumlahMuat = 0;
function tandaMuat(d) { jumlahMuat += d; $('#memuat').hidden = jumlahMuat <= 0; }
const GAS_URL = (window.APP_CONFIG || {}).GAS_URL || '';
function galatJaringan(pesan) { const g = new Error(pesan); g.jaringan = true; return g; }
async function panggil(aksi, data = {}, { senyap = false } = {}) {
  if (!/^https:\/\/script\.google\.com\/.+\/exec$/.test(GAS_URL) || /GANTI|XXXX/.test(GAS_URL)) {
    throw new Error('Alamat server belum diisi. Isi GAS_URL di js/config.js dengan alamat /exec dari Apps Script.');
  }
  if (!senyap) tandaMuat(1);
  const batas = new AbortController();
  const jam = setTimeout(() => batas.abort(), aksi === 'gambar.unggah' ? 180000 : 60000);
  let r;
  try {
    // text/plain mencegah CORS preflight yang ditolak Apps Script.
    const res = await fetch(GAS_URL, {
      method: 'POST', redirect: 'follow', signal: batas.signal,
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ aksi, token: S.token, data })
    });
    const teks = await res.text();
    try { r = JSON.parse(teks); } catch (e) {
      throw galatJaringan('Server tidak mengirim data yang benar. Pastikan akses Web App diatur ke Anyone.');
    }
  } catch (e) {
    if (e.jaringan) throw e;
    throw galatJaringan('Tidak tersambung ke server. Periksa jaringan lalu coba lagi.');
  } finally {
    clearTimeout(jam);
    if (!senyap) tandaMuat(-1);
  }
  if (r.success) return r.data;
  const g = new Error(r.message); g.kode = r.code;
  if (r.code === 'SESI') { hapusSesi(); keluarKeMasuk(r.message); }
  throw g;
}
function toast(pesan, bahaya) {
  const t = $('#toast');
  t.textContent = pesan; t.classList.toggle('bahaya', !!bahaya); t.classList.add('tampil');
  clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('tampil'), bahaya ? 5200 : 2800);
}
const galat = e => toast(e.message || 'Terjadi kesalahan.', true);

/* ── Status ── */
const S = { token: '', peran: '', awal: null, peserta: null, info: null, tabMasuk: 'peserta', alatPilih: '' };
const SIMPAN_KEY = 'topgun_sesi';
function simpanSesi() { sessionStorage.setItem(SIMPAN_KEY, JSON.stringify({ token: S.token, peran: S.peran, peserta: S.peserta, info: S.info })); }
function hapusSesi() { sessionStorage.removeItem(SIMPAN_KEY); S.token = ''; S.peran = ''; S.peserta = null; S.info = null; }

/* ── Tema ── */
function pasangTema(t) { document.documentElement.setAttribute('data-theme', t); try { localStorage.setItem('topgun_tema', t); } catch (e) { /* tanpa penyimpanan */ } }
function gantiTema() { pasangTema(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'); }
try { pasangTema(localStorage.getItem('topgun_tema') || 'light'); } catch (e) { pasangTema('light'); }

/* ── Modal ── */
function bukaModal(html, { lebar = false, kelas = '', tetap = false } = {}) {
  tutupModal();
  const akar = $('#modal-akar');
  S.fokusAsal = document.activeElement;
  akar.innerHTML = `<div class="modal-latar" data-latar="${tetap ? '' : '1'}"><div class="modal ${lebar ? 'lebar' : ''} ${kelas}" role="dialog" aria-modal="true" tabindex="-1">${html}</div></div>`;
  const m = $('.modal', akar);
  const f = $('input:not([type=file]):not([type=hidden]), select, textarea, button.tbl-utama', m);
  (f || m).focus();
  S.modalTetap = tetap;
  return m;
}
function tutupModal() {
  $('#modal-akar').innerHTML = '';
  S.modalTetap = false;
  if (S.fokusAsal && document.contains(S.fokusAsal)) S.fokusAsal.focus();
  S.fokusAsal = null;
}
function kepalaModal(judul) { return `<div class="modal-kepala"><h2>${esc(judul)}</h2><button class="tbl bulat" data-a="tutup-modal" aria-label="Tutup">${ik('x')}</button></div>`; }
function konfirmasi({ judul, isi, ya, bahaya }) {
  return new Promise(hasil => {
    bukaModal(`<h2>${esc(judul)}</h2><p class="redup" style="margin-top:.6rem">${esc(isi)}</p>
      <div class="modal-kaki"><button class="tbl" data-k="0">Batal</button><button class="tbl ${bahaya ? 'tbl-bahaya' : 'tbl-utama'}" data-k="1">${esc(ya)}</button></div>`);
    $$('[data-k]', $('#modal-akar')).forEach(b => b.onclick = () => { const v = b.dataset.k === '1'; tutupModal(); hasil(v); });
  });
}
function lihatGambar(url, { unduh = false } = {}) {
  bukaModal(`${kepalaModal('Pratinjau gambar')}<img class="pratinjau" src="${esc(url)}" alt="Pratinjau gambar">
    <div class="modal-kaki">${unduh ? `<a class="tbl" href="${esc(url)}" download target="_blank" rel="noopener">Unduh</a>` : ''}<button class="tbl tbl-utama" data-a="tutup-modal">Tutup</button></div>`, { lebar: true });
}

/* ── Halaman masuk ── */
function logoHtml() { return S.awal && S.awal.logo ? `<img class="logo" src="${esc(S.awal.logo)}" alt="Logo ${esc(S.awal.app)}">` : LOGO_BAWAAN; }
function gambarAlat() {
  const a = (S.awal.alat || []).find(x => x.nama === S.alatPilih) || (S.awal.alat || []).find(x => x.gambar);
  return a && a.gambar ? `<img src="${esc(a.gambar)}" alt="Gambar ${esc(a.nama)}">` : ALAT_BAWAAN;
}
function keluarKeMasuk(pesan) {
  berhentiUjian();
  berhentiPantau();
  tutupModal();
  muatMasuk().then(() => { if (pesan) toast(pesan, true); });
}
async function muatMasuk() {
  try {
    S.awal = await panggil('publik.awal');
    tampilMasuk();
  } catch (e) {
    app.innerHTML = `<div class="masuk-latar"><section class="lempeng tengah"><h2>Aplikasi belum bisa dibuka</h2><p class="redup" style="margin:.6rem 0 1.2rem">${esc(e.message)}</p><button class="tbl tbl-utama" data-a="muat-ulang">Coba lagi</button></section></div>`;
  }
}
function tampilMasuk() {
  const a = S.awal;
  document.title = a.app;
  if (!S.alatPilih && a.alat.length) S.alatPilih = a.alat[0].nama;
  app.innerHTML = `<div class="masuk-latar"><section class="lempeng masuk">
    <div class="pamer">
      <div class="masuk-atas">${logoHtml()}<button class="tbl bulat" data-a="tema" aria-label="Ganti tema terang atau gelap">${ik('moon')}</button></div>
      <h1>${esc(a.app)}</h1>
      <div class="sumur bengkel" id="bengkel">${gambarAlat()}</div>
      <p class="pamer-info">${a.jumlahPG} pilihan ganda dan ${a.jumlahEssai} essai, ${a.durasi} menit.</p>
    </div>
    <div class="form-sisi">
      <div class="tab-baris" role="tablist">
        <button class="tab" role="tab" data-a="tab-masuk" data-t="peserta" aria-selected="${S.tabMasuk === 'peserta'}">Peserta</button>
        <button class="tab" role="tab" data-a="tab-masuk" data-t="admin" aria-selected="${S.tabMasuk === 'admin'}">Admin</button>
      </div>
      <div class="tab-isi" id="form-masuk">${S.tabMasuk === 'admin' ? formAdmin() : formPeserta()}</div>
    </div>
  </section></div>`;
}
function formPeserta() {
  const a = S.awal;
  const dept = a.departemen.map(d => `<option value="${esc(d)}">${esc(d)}</option>`).join('');
  const alat = a.alat.map(x => `<option value="${esc(x.nama)}" ${x.nama === S.alatPilih ? 'selected' : ''}>${esc(x.nama)}</option>`).join('');
  return `${a.buka ? '' : `<div class="spanduk bahaya">${esc(a.pesanBuka)}${a.mulaiPada ? ' Dibuka ' + esc(fmtWaktu(a.mulaiPada)) + '.' : ''}</div>`}
  <form id="f-peserta" novalidate>
    <label class="isian"><span>Nomor ID</span><input type="text" name="id" id="p-id" maxlength="40" autocomplete="off" required></label>
    <div id="p-tanda" class="spanduk oke kecil" hidden></div>
    <label class="isian"><span>Nama</span><input type="text" name="nama" id="p-nama" maxlength="80" autocomplete="off" required></label>
    <label class="isian"><span>Departemen</span>
      <select name="deptPilih" id="p-dept" ${a.departemen.length ? '' : 'hidden'}><option value="">Pilih departemen</option>${dept}<option value="__ketik">Ketik manual</option></select>
    </label>
    <label class="isian" id="p-dept-ketik" ${a.departemen.length ? 'hidden' : ''}><span>Nama departemen</span><input type="text" name="deptKetik" maxlength="80" autocomplete="off"></label>
    <div class="isian"><span class="label" id="lbl-crew">Crew</span><div class="segmen" role="radiogroup" aria-labelledby="lbl-crew">
      ${a.crew.map(c => `<label><input type="radio" name="crew" value="${esc(c)}"><span>${esc(c)}</span></label>`).join('')}
    </div></div>
    <label class="isian"><span>Alat berat yang diujikan</span><select name="alat" id="p-alat" required>${alat || '<option value="">Belum ada alat berat</option>'}</select></label>
    ${a.butuhKode ? '<label class="isian"><span>Kode ujian dari pengawas</span><input type="text" name="kode" maxlength="40" autocomplete="off" required></label>' : ''}
    <button class="tbl tbl-utama tbl-penuh" type="submit" ${a.buka ? '' : 'disabled'}>Masuk</button>
  </form>`;
}
function formAdmin() {
  return `<form id="f-admin" novalidate>
    <label class="isian"><span>Nama pengguna</span><input type="text" name="username" autocomplete="username" required></label>
    <label class="isian"><span>Kata sandi</span><input type="password" name="password" autocomplete="current-password" required></label>
    <button class="tbl tbl-utama tbl-penuh" type="submit">Masuk sebagai admin</button>
  </form>`;
}
let terkunciData = false;
async function cekId(id) {
  const tanda = $('#p-tanda');
  if (!id || !tanda) return;
  try {
    const r = await panggil('peserta.cek', { id }, { senyap: true });
    if ($('#p-id')?.value.trim() !== id) return;
    terkunciData = !!(r.ada && r.terkunci);
    const nama = $('#p-nama'), dept = $('#p-dept'), ketik = $('#p-dept-ketik');
    if (r.ada) {
      nama.value = r.nama;
      const pilihan = $$('option', dept).some(o => o.value === r.departemen);
      dept.value = pilihan ? r.departemen : '__ketik';
      ketik.hidden = pilihan;
      if (!pilihan) ketik.querySelector('input').value = r.departemen;
      const c = $(`input[name=crew][value="${CSS.escape(r.crew)}"]`); if (c) c.checked = true;
    }
    nama.readOnly = terkunciData;
    dept.disabled = terkunciData;
    ketik.querySelector('input').readOnly = terkunciData;
    $$('input[name=crew]').forEach(x => x.disabled = terkunciData);
    tanda.hidden = !terkunciData;
    tanda.textContent = terkunciData ? 'Data Anda sudah diisi admin.' : '';
  } catch (e) { /* peserta tetap bisa mengetik manual */ }
}
async function kirimPeserta(f) {
  const d = Object.fromEntries(new FormData(f));
  d.id = (d.id || '').trim();
  const dp = $('#p-dept');
  const pilih = dp.hidden ? '__ketik' : dp.value;
  d.departemen = pilih === '__ketik' ? (d.deptKetik || '') : pilih;
  d.crew = ($('input[name=crew]:checked', f) || {}).value || '';
  if (!d.id) return toast('Isi nomor ID Anda.', true);
  if (!terkunciData) {
    if (!(d.nama || '').trim()) return toast('Isi nama Anda.', true);
    if (!d.departemen.trim()) return toast('Pilih atau ketik departemen Anda.', true);
    if (!d.crew) return toast('Pilih crew A, B, C, atau STD.', true);
  }
  const b = $('button[type=submit]', f); b.disabled = true;
  try {
    const r = await panggil('peserta.masuk', d);
    S.token = r.token; S.peran = 'peserta'; S.peserta = r.peserta; S.info = r;
    simpanSesi();
    tampilAturan();
  } catch (e) { galat(e); b.disabled = false; }
}
async function kirimAdmin(f) {
  const d = Object.fromEntries(new FormData(f));
  const b = $('button[type=submit]', f); b.disabled = true;
  try {
    const r = await panggil('admin.masuk', d);
    S.token = r.token; S.peran = 'admin'; simpanSesi();
    tampilAdmin('ringkas');
    if (r.wajibGanti) formSandi(true);
  } catch (e) { galat(e); b.disabled = false; }
}

/* ── Tata tertib ── */
function tampilAturan() {
  const i = S.info, p = S.peserta;
  const totalSoal = i.jumlahPG + i.jumlahEssai;
  const aturan = [
    i.lanjut ? 'Waktu ujian terus berjalan sejak pertama dimulai.' : `Waktu ${i.durasi} menit mulai berjalan saat Anda menekan Mulai ujian dan tidak bisa dijeda.`,
    i.layarPenuh ? 'Ujian berjalan di layar penuh. Keluar dari layar penuh dicatat sebagai pelanggaran.' : 'Tetap di halaman ini selama ujian.',
    'Berpindah tab, aplikasi, atau jendela dicatat sebagai pelanggaran.',
    i.batas > 0 ? `Pada pelanggaran ke-${i.batas}, jawaban dikumpulkan otomatis.` : 'Semua pelanggaran dilaporkan kepada admin.',
    'Salin, tempel, klik kanan, dan cetak layar diblokir dan dilaporkan.',
    'Jawaban tersimpan otomatis. Bila jaringan putus, masuk lagi dengan ID yang sama.'
  ];
  app.innerHTML = `<div class="masuk-latar"><section class="lempeng tengah">
    <h2>${i.lanjut ? 'Lanjutkan ujian' : 'Sebelum mulai'}</h2>
    <dl class="sumur kartu-data">
      <dt>Nomor ID</dt><dd>${esc(p.id)}</dd><dt>Nama</dt><dd>${esc(p.nama)}</dd>
      <dt>Departemen</dt><dd>${esc(p.departemen)}</dd><dt>Crew</dt><dd>${esc(p.crew)}</dd>
      <dt>Alat berat</dt><dd>${esc(p.alat)}</dd><dt>Soal</dt><dd>${totalSoal} soal (${i.jumlahPG} pilihan ganda, ${i.jumlahEssai} essai)</dd>
    </dl>
    <ul class="tata">${aturan.map(t => `<li>${ik('check')}<span>${esc(t)}</span></li>`).join('')}</ul>
    <div class="soal-kaki"><button class="tbl" data-a="keluar">Bukan saya, keluar</button><button class="tbl tbl-utama" data-a="mulai-ujian">${i.lanjut ? 'Lanjutkan ujian' : 'Mulai ujian'}</button></div>
  </section></div>`;
}

/* ── Ujian ── */
const U = { aktif: false, soal: [], jawab: {}, ragu: {}, idx: 0, id: '', perangkat: '', akhir: 0, durasiMs: 0, pelanggaran: 0, batas: 0, layarPenuh: false, kotor: false, jalanSimpan: false, antrean: [] };
const kunciLokal = () => 'topgun_jwb_' + U.id;
const kunciPerangkat = () => 'topgun_prk_' + S.peserta.id + '_' + S.peserta.alat;

async function mulaiUjian(b) {
  b.disabled = true;
  let minta = null;
  const bisaPenuh = document.documentElement.requestFullscreen && document.fullscreenEnabled !== false;
  if (S.info.layarPenuh && bisaPenuh) minta = document.documentElement.requestFullscreen().catch(() => null); // harus dari klik pengguna
  try {
    const r = await panggil('ujian.mulai', { perangkat: sessionStorage.getItem(kunciPerangkat()) || '' });
    await minta;
    Object.assign(U, { aktif: true, soal: r.soal, id: r.ujianId, perangkat: r.perangkat, durasiMs: r.durasiMs, pelanggaran: r.pelanggaran, batas: r.batas, layarPenuh: r.layarPenuh && bisaPenuh, idx: 0, ragu: {}, kotor: false, antrean: [], maksEssai: r.maksEssai });
    U.akhir = performance.now() + r.sisaMs;
    sessionStorage.setItem(kunciPerangkat(), r.perangkat);
    let lokal = {}, ragu = {};
    try { lokal = JSON.parse(localStorage.getItem(kunciLokal()) || '{}'); ragu = JSON.parse(localStorage.getItem(kunciLokal() + '_r') || '{}'); } catch (e) { /* abaikan */ }
    U.jawab = Object.assign({}, r.draft, lokal); U.ragu = ragu;
    if (r.dilanjutkan) { const k = U.soal.findIndex(s => !(U.jawab[s.id] || '').trim()); U.idx = k < 0 ? 0 : k; }
    tampilUjian();
    AC.pasang();
    U.denyut = setInterval(() => simpanJawaban(), 30000);
    U.detak = setInterval(detak, 1000);
    detak();
    window.addEventListener('beforeunload', cegahTutup);
  } catch (e) {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => null);
    if (e.kode === 'SELESAI') return tampilSelesai(e.message);
    galat(e); b.disabled = false;
  }
}
function cegahTutup(e) { if (U.aktif) { e.preventDefault(); e.returnValue = ''; } }
function berhentiUjian() {
  U.aktif = false;
  clearInterval(U.denyut); clearInterval(U.detak); clearTimeout(U.tundaSimpan);
  AC.lepas();
  window.removeEventListener('beforeunload', cegahTutup);
  if (document.fullscreenElement) document.exitFullscreen().catch(() => null);
  document.body.classList.remove('tersembunyi');
}
function tandaAirUrl() {
  const teks = `${S.peserta.id} ${S.peserta.nama}`.replace(/[<&>"']/g, '');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="340" height="190"><text x="20" y="110" transform="rotate(-20 170 95)" font-family="sans-serif" font-size="15" fill="#000">${teks}</text></svg>`;
  return `url('data:image/svg+xml,${encodeURIComponent(svg)}')`;
}
const TAKIK = Array.from({ length: 41 }, (_, i) => {
  const sudut = (135 + i * 270 / 40) * Math.PI / 180, r1 = 92, r2 = i % 10 === 0 ? 85 : 89;
  return `<line class="takik" x1="${(100 + r1 * Math.cos(sudut)).toFixed(1)}" y1="${(100 + r1 * Math.sin(sudut)).toFixed(1)}" x2="${(100 + r2 * Math.cos(sudut)).toFixed(1)}" y2="${(100 + r2 * Math.sin(sudut)).toFixed(1)}"/>`;
}).join('');
const BUSUR = 'M 43.4 156.6 A 80 80 0 1 1 156.6 156.6';
function tampilUjian() {
  const lampu = lampuHtml();
  app.innerHTML = `<div class="ujian">
    <div class="tanda-air" style="background-image:${tandaAirUrl()}"></div>
    <div class="ujian-rangka">
      <div>
        <div class="kepala-hp" style="margin-bottom:1rem">
          <span class="waktu" data-sisa role="timer">00:00</span>
          <span class="kecil redup" data-info-no></span>
          <div class="lampu-baris" data-lampu aria-label="Lampu pelanggaran">${lampu}</div>
        </div>
        <section class="lempeng pelat" id="pelat" aria-live="polite"></section>
      </div>
      <aside class="lempeng konsol" id="konsol" aria-label="Panel ujian">
        <div class="laci-tutup"><h3>Daftar soal</h3><button class="tbl bulat" data-a="laci" aria-label="Tutup daftar soal">${ik('x')}</button></div>
        <div class="gauge" id="gauge"><div class="gauge-dalam"><svg viewBox="0 0 200 200" aria-hidden="true">${TAKIK}
          <path class="jalur" d="${BUSUR}"/><path class="arus" id="arus" d="${BUSUR}" pathLength="100" stroke-dasharray="100 100"/></svg>
          <div class="gauge-baca"><strong data-sisa role="timer">00:00</strong><span>sisa waktu</span></div></div></div>
        <div class="lampu-panel"><span id="lampu-teks"></span><div class="lampu-baris" data-lampu aria-hidden="true">${lampu}</div></div>
        <div id="papan-wadah"></div>
        <button class="tbl tbl-utama tbl-penuh" data-a="kumpul">Kumpulkan jawaban</button>
        <p class="simpan-status" id="simpan-status" aria-live="polite">Jawaban tersimpan otomatis.</p>
      </aside>
    </div>
    <nav class="bilah-hp" aria-label="Navigasi soal">
      <button class="tbl" data-a="soal-geser" data-d="-1">${ik('left')}Sebelumnya</button>
      <button class="tbl" data-a="laci" style="flex:0 0 52px" aria-label="Buka daftar soal">${ik('grid')}</button>
      <button class="tbl" data-a="soal-geser" data-d="1">Berikutnya${ik('right')}</button>
    </nav>
  </div>`;
  tampilSoal(); tampilPapan(); perbaruiLampu();
}
function lampuHtml() {
  const n = U.batas > 0 ? U.batas : Math.max(3, U.pelanggaran);
  return Array.from({ length: Math.min(n, 12) }, (_, i) => `<i class="lampu ${i < U.pelanggaran ? 'nyala' : ''}"></i>`).join('');
}
function perbaruiLampu() {
  $$('[data-lampu]').forEach(el => el.innerHTML = lampuHtml());
  const t = $('#lampu-teks');
  if (t) t.textContent = U.batas > 0 ? `Pelanggaran ${U.pelanggaran} dari ${U.batas}` : `Pelanggaran ${U.pelanggaran}`;
}
function tampilSoal() {
  const s = U.soal[U.idx], pelat = $('#pelat');
  if (!s) return;
  const huruf = 'ABCD', isi = U.jawab[s.id] || '';
  pelat.innerHTML = `
    <div class="soal-kepala"><div class="soal-no">Soal ${s.no} <small>dari ${U.soal.length}</small></div><span class="kecil redup">${s.tipe === 'PG' ? 'Pilihan ganda' : 'Essai'}</span></div>
    ${s.gambar ? `<button class="sumur soal-gambar" data-a="soal-gambar" aria-label="Perbesar gambar soal"><img src="${esc(s.gambar)}" alt="Gambar untuk soal ${s.no}"></button>` : ''}
    <p class="soal-teks">${esc(s.teks)}</p>
    ${s.tipe === 'PG'
      ? `<div role="radiogroup" aria-label="Pilihan jawaban">${s.opsi.map((o, i) => `<button class="opsi" role="radio" aria-checked="${isi === o.k}" data-a="pilih" data-k="${esc(o.k)}"><b>${huruf[i]}</b><span>${esc(o.t)}</span></button>`).join('')}</div>`
      : `<label class="isian"><span>Jawaban Anda</span><textarea id="esai" rows="9" maxlength="${U.maksEssai}" spellcheck="false" autocomplete="off" autocorrect="off">${esc(isi)}</textarea><small id="esai-hitung">${isi.length} dari ${U.maksEssai} karakter</small></label>`}
    <div class="soal-kaki">
      <button class="tbl" data-a="ragu" aria-pressed="${!!U.ragu[s.id]}">${ik('flag')}Tandai ragu</button>
      <div class="kiri">
        <button class="tbl" data-a="soal-geser" data-d="-1" ${U.idx === 0 ? 'disabled' : ''}>${ik('left')}Sebelumnya</button>
        <button class="tbl" data-a="soal-geser" data-d="1" ${U.idx === U.soal.length - 1 ? 'disabled' : ''}>Berikutnya${ik('right')}</button>
      </div>
    </div>`;
  $$('[data-info-no]').forEach(el => el.textContent = `Soal ${s.no} dari ${U.soal.length}`);
}
function tampilPapan() {
  const w = $('#papan-wadah'); if (!w) return;
  const kunci = (s, i) => `<button class="kunci ${(U.jawab[s.id] || '').trim() ? 'terisi' : ''} ${U.ragu[s.id] ? 'ragu' : ''} ${i === U.idx ? 'kini' : ''}" data-a="soal-ke" data-i="${i}" aria-label="Soal ${s.no}${(U.jawab[s.id] || '').trim() ? ', terjawab' : ', belum dijawab'}${U.ragu[s.id] ? ', ditandai ragu' : ''}"${i === U.idx ? ' aria-current="true"' : ''}>${s.no}</button>`;
  const baris = U.soal.map((s, i) => ({ s, i }));
  const pg = baris.filter(x => x.s.tipe === 'PG'), es = baris.filter(x => x.s.tipe !== 'PG');
  w.innerHTML = `${pg.length ? `<p class="papan-judul">Pilihan ganda</p><div class="papan">${pg.map(x => kunci(x.s, x.i)).join('')}</div>` : ''}
    ${es.length ? `<p class="papan-judul">Essai</p><div class="papan">${es.map(x => kunci(x.s, x.i)).join('')}</div>` : ''}
    <p class="keterangan"><span><i class="ket-isi"></i>Terjawab</span><span><i class="ket-ragu"></i>Ragu</span></p>`;
}
function keSoal(i) {
  if (i < 0 || i >= U.soal.length) return;
  U.idx = i; tampilSoal(); tampilPapan();
  $('#konsol').classList.remove('buka');
  if (window.innerWidth < 920) window.scrollTo(0, 0);
}
function ubahJawaban(id, nilai) {
  U.jawab[id] = nilai; U.kotor = true;
  try { localStorage.setItem(kunciLokal(), JSON.stringify(U.jawab)); } catch (e) { /* tetap dikirim ke server */ }
  clearTimeout(U.tundaSimpan);
  U.tundaSimpan = setTimeout(simpanJawaban, 3000);
}
function statusSimpan(t, bahaya) { const el = $('#simpan-status'); if (el) { el.textContent = t; el.classList.toggle('bahaya', !!bahaya); } }
async function simpanJawaban() {
  if (!U.aktif || U.jalanSimpan) return;
  U.jalanSimpan = true;
  try {
    kirimAntrean();
    U.kotor = false;
    const r = await panggil('ujian.simpan', { ujianId: U.id, perangkat: U.perangkat, jawaban: U.jawab }, { senyap: true });
    U.akhir = performance.now() + r.sisaMs;
    if (r.pelanggaran > U.pelanggaran) { U.pelanggaran = r.pelanggaran; perbaruiLampu(); }
    statusSimpan('Tersimpan ' + new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }));
  } catch (e) { tanganiGagalUjian(e); } finally { U.jalanSimpan = false; }
}
function tanganiGagalUjian(e) {
  if (e.kode === 'SELESAI') { hapusLokal(); berhentiUjian(); return tampilSelesai(e.message); }
  if (e.kode === 'PINDAH') { berhentiUjian(); return tampilPindah(e.message); }
  if (e.kode === 'SESI') return;
  U.kotor = true;
  statusSimpan('Belum tersimpan ke server, mencoba lagi. Jangan tutup halaman ini.', true);
}
function hapusLokal() { try { localStorage.removeItem(kunciLokal()); localStorage.removeItem(kunciLokal() + '_r'); } catch (e) { /* abaikan */ } }
function fmtSisa(ms) {
  const d = Math.max(0, Math.ceil(ms / 1000)), j = Math.floor(d / 3600), m = Math.floor(d % 3600 / 60), s = d % 60;
  const p = n => String(n).padStart(2, '0');
  return j ? `${j}:${p(m)}:${p(s)}` : `${p(m)}:${p(s)}`;
}
function detak() {
  if (!U.aktif) return;
  const sisa = U.akhir - performance.now();
  const teks = fmtSisa(sisa);
  $$('[data-sisa]').forEach(el => el.textContent = teks);
  const arus = $('#arus'), g = $('#gauge');
  if (arus) arus.setAttribute('stroke-dasharray', `${Math.max(0, Math.min(100, sisa / U.durasiMs * 100)).toFixed(2)} 100`);
  const kritis = sisa <= 5 * 60000;
  if (g) g.classList.toggle('kritis', kritis);
  if (kritis && !U.ingat5 && sisa > 0) { U.ingat5 = true; toast('Sisa waktu 5 menit.', true); }
  if (sisa <= 0) kumpulkan(true);
}
function ringkasKumpul() {
  const belum = U.soal.filter(s => !(U.jawab[s.id] || '').trim()).length;
  const ragu = U.soal.filter(s => U.ragu[s.id]).length;
  let t = belum ? `${belum} soal belum dijawab.` : 'Semua soal sudah dijawab.';
  if (ragu) t += ` ${ragu} soal ditandai ragu.`;
  return t + ' Setelah dikumpulkan, jawaban tidak bisa diubah.';
}
async function kumpulkan(otomatis) {
  if (U.mengumpul) return;
  if (!otomatis) {
    const ya = await konfirmasi({ judul: 'Kumpulkan jawaban?', isi: ringkasKumpul(), ya: 'Kumpulkan jawaban' });
    if (!ya || !U.aktif) return;
  }
  U.mengumpul = true;
  clearInterval(U.detak);
  try {
    await panggil('ujian.kumpul', { ujianId: U.id, perangkat: U.perangkat, jawaban: U.jawab, otomatis: !!otomatis });
    hapusLokal(); berhentiUjian();
    tampilSelesai(otomatis ? 'Waktu habis. Jawaban Anda sudah dikumpulkan.' : 'Jawaban Anda sudah dikumpulkan.');
  } catch (e) {
    if (e.kode === 'SELESAI' || e.kode === 'PINDAH') { tanganiGagalUjian(e); }
    else {
      toast(e.message, true);
      if (otomatis) setTimeout(() => { U.mengumpul = false; if (U.aktif) kumpulkan(true); }, 5000);
      else { U.detak = setInterval(detak, 1000); }
    }
  } finally { if (!otomatis) U.mengumpul = false; }
}
function tampilSelesai(pesan) {
  U.mengumpul = false;
  tutupModal();
  const p = S.peserta || {};
  app.innerHTML = `<div class="masuk-latar"><section class="lempeng tengah">
    <h2>Ujian selesai</h2><p style="margin:.6rem 0 0">${esc(pesan)}</p>
    <dl class="sumur kartu-data"><dt>Nomor ID</dt><dd>${esc(p.id)}</dd><dt>Nama</dt><dd>${esc(p.nama)}</dd><dt>Alat berat</dt><dd>${esc(p.alat)}</dd></dl>
    <p class="redup" style="margin:1rem 0 1.3rem">Nilai diumumkan admin setelah essai dikoreksi.</p>
    <button class="tbl tbl-utama" data-a="keluar">Kembali ke halaman masuk</button>
  </section></div>`;
}
function tampilPindah(pesan) {
  tutupModal();
  app.innerHTML = `<div class="masuk-latar"><section class="lempeng tengah"><h2>Halaman ini dihentikan</h2>
    <p style="margin:.6rem 0 1.3rem">${esc(pesan)} Lanjutkan ujian di perangkat yang terakhir dibuka, atau masuk lagi di sini.</p>
    <button class="tbl tbl-utama" data-a="keluar">Kembali ke halaman masuk</button></section></div>`;
}

/* ── Anti cheat di browser ──
   Ini penghalang dan pencatat, bukan jaminan mutlak. Penilaian, kunci jawaban,
   batas waktu, dan hitungan pelanggaran tetap ditentukan server. */
const AC = {
  aktif: false, terakhir: 0, logTerakhir: {}, mulai: 0,
  pasang() {
    this.aktif = true; this.mulai = Date.now(); this.terakhir = 0;
    document.addEventListener('visibilitychange', this.tab);
    window.addEventListener('blur', this.blur);
    window.addEventListener('focus', this.pulih);
    document.addEventListener('fullscreenchange', this.layar);
    ['copy', 'cut'].forEach(n => document.addEventListener(n, this.salin));
    document.addEventListener('paste', this.tempel);
    document.addEventListener('contextmenu', this.menu);
    document.addEventListener('dragstart', this.cegah);
    document.addEventListener('keydown', this.tombol, true);
    document.addEventListener('keyup', this.tombolLepas, true);
  },
  lepas() {
    this.aktif = false;
    document.removeEventListener('visibilitychange', this.tab);
    window.removeEventListener('blur', this.blur);
    window.removeEventListener('focus', this.pulih);
    document.removeEventListener('fullscreenchange', this.layar);
    ['copy', 'cut'].forEach(n => document.removeEventListener(n, this.salin));
    document.removeEventListener('paste', this.tempel);
    document.removeEventListener('contextmenu', this.menu);
    document.removeEventListener('dragstart', this.cegah);
    document.removeEventListener('keydown', this.tombol, true);
    document.removeEventListener('keyup', this.tombolLepas, true);
  },
  cegah(e) { e.preventDefault(); },
  tab() {
    if (document.hidden) { document.body.classList.add('tersembunyi'); AC.lapor('TAB'); }
    else AC.pulih();
  },
  blur() {
    // Jeda singkat agar kehilangan fokus sesaat tidak langsung dihukum.
    document.body.classList.add('tersembunyi');
    setTimeout(() => {
      if (!AC.aktif) return;
      if (document.hasFocus()) { if (!S.peringatan) document.body.classList.remove('tersembunyi'); return; }
      AC.lapor('BLUR');
    }, 1500);
  },
  layar() {
    if (!AC.aktif || !U.layarPenuh || document.fullscreenElement) return;
    document.body.classList.add('tersembunyi');
    AC.lapor('LAYAR_PENUH');
  },
  salin(e) { e.preventDefault(); AC.catat('SALIN'); },
  tempel(e) { e.preventDefault(); AC.catat('TEMPEL'); toast('Tempel teks tidak diizinkan selama ujian.', true); },
  menu(e) { e.preventDefault(); AC.catat('MENU'); },
  tombol(e) {
    const k = (e.key || '').toLowerCase(), mod = e.ctrlKey || e.metaKey;
    const diDalamEsai = e.target && e.target.id === 'esai';
    const blok = k === 'f12' || k === 'printscreen' || (mod && e.shiftKey && ['i', 'j', 'c', 's'].includes(k)) ||
      (mod && ['c', 'x', 'v', 'p', 's', 'u', 'f', 'g'].includes(k)) || (mod && k === 'a' && !diDalamEsai);
    if (blok) { e.preventDefault(); e.stopPropagation(); if (k !== 'printscreen') AC.catat('PINTASAN'); }
  },
  tombolLepas(e) { if ((e.key || '').toLowerCase() === 'printscreen') AC.lapor('CETAK_LAYAR'); },
  /* Dicatat saja, tidak menambah lampu. */
  catat(jenis) {
    const now = Date.now();
    if (now - (this.logTerakhir[jenis] || 0) < 8000) return;
    this.logTerakhir[jenis] = now;
    this.kirim(jenis);
  },
  /* Dihitung sebagai pelanggaran. Satu Alt+Tab bisa memicu beberapa kejadian: disatukan. */
  lapor(jenis) {
    const now = Date.now();
    if (!this.aktif || now - this.mulai < 2500 || now - this.terakhir < 4000) { this.pulih(); return; }
    this.terakhir = now;
    U.pelanggaran += 1;
    perbaruiLampu();
    this.peringatan(jenis);
    this.kirim(jenis);
  },
  pulih() { if (!document.hidden && document.hasFocus() && !$('.lampu-modal') && (!U.layarPenuh || document.fullscreenElement)) document.body.classList.remove('tersembunyi'); },
  async kirim(jenis) {
    try {
      const r = await panggil('ujian.langgar', { ujianId: U.id, perangkat: U.perangkat, jenis, jawaban: U.jawab }, { senyap: true });
      if (r.pelanggaran !== U.pelanggaran && JENIS_DIHITUNG[jenis]) { U.pelanggaran = Math.max(U.pelanggaran, r.pelanggaran); perbaruiLampu(); }
      if (r.selesai) {
        hapusLokal(); berhentiUjian();
        tampilSelesai(`Jawaban dikumpulkan otomatis karena pelanggaran mencapai ${r.batas} kali.`);
      }
    } catch (e) {
      if (e.jaringan) { U.antrean.push(jenis); statusSimpan('Tidak tersambung ke server, mencoba lagi.', true); }
      else tanganiGagalUjian(e);
    }
  },
  peringatan(jenis) {
    const pesan = { TAB: 'Anda meninggalkan halaman ujian.', BLUR: 'Anda berpindah ke jendela lain.', LAYAR_PENUH: 'Anda keluar dari layar penuh.', CETAK_LAYAR: 'Tombol cetak layar terdeteksi.' }[jenis];
    const lanjut = U.batas > 0 ? `Pada pelanggaran ke-${U.batas}, jawaban dikumpulkan otomatis.` : 'Kejadian ini dilaporkan kepada admin.';
    S.peringatan = true;
    bukaModal(`<h2>Pelanggaran ${U.pelanggaran}${U.batas > 0 ? ' dari ' + U.batas : ''} tercatat</h2>
      <p style="margin:.6rem 0 .3rem">${esc(pesan)}</p><p class="redup">${esc(lanjut)}</p>
      <div class="modal-kaki"><button class="tbl tbl-utama" data-a="kembali-ujian">Kembali ke soal</button></div>`, { kelas: 'lampu-modal', tetap: true });
  }
};
const JENIS_DIHITUNG = { TAB: 1, BLUR: 1, LAYAR_PENUH: 1, CETAK_LAYAR: 1 };
function kirimAntrean() { const a = U.antrean.splice(0); a.forEach(j => AC.kirim(j)); }

/* ── Admin ── */
const A = { hal: 'ringkas', sub: {}, data: {}, halaman: {}, cari: {}, pantau: null };
const MENU = [
  { id: 'ringkas', ik: 'home', label: 'Ringkasan' },
  { id: 'peserta', ik: 'users', label: 'Peserta' },
  { id: 'soal', ik: 'doc', label: 'Soal' },
  { id: 'hasil', ik: 'chart', label: 'Hasil' },
  { id: 'setelan', ik: 'gear', label: 'Pengaturan' }
];
function tampilAdmin(hal) {
  berhentiPantau();
  A.hal = hal;
  const nama = S.awal ? S.awal.app : 'TOPGUN OPERATOR';
  app.innerHTML = `<div class="admin">
    <header class="admin-atas">${logoHtml()}<h1>${esc(nama)}</h1><span class="spasi"></span>
      <button class="tbl bulat" data-a="tema" aria-label="Ganti tema terang atau gelap">${ik('moon')}</button>
      <button class="tbl bulat" data-a="keluar" aria-label="Keluar">${ik('out')}</button></header>
    <div id="admin-isi"></div>
    <nav class="dok" aria-label="Menu admin">${MENU.map(m => `<button data-a="menu" data-h="${m.id}" aria-label="${m.label}" title="${m.label}" ${m.id === hal ? 'aria-current="page"' : ''}>${ik(m.ik)}</button>`).join('')}</nav>
  </div>`;
  ({ ringkas: vRingkas, peserta: vPeserta, soal: vSoal, hasil: vHasil, setelan: vSetelan })[hal]();
  window.scrollTo(0, 0);
}
const isi = () => $('#admin-isi');
function judulHal(t, tombol = '') { return `<div class="judul-baris"><h2>${esc(t)}</h2>${tombol}</div>`; }
function tabBaris(hal, daftar) {
  const kini = A.sub[hal] || daftar[0][0];
  return `<div class="tab-baris" role="tablist">${daftar.map(([id, t]) => `<button class="tab" role="tab" data-a="sub" data-h="${hal}" data-s="${id}" aria-selected="${id === kini}">${t}</button>`).join('')}</div>`;
}
const kosong = (teks, aksi = '') => `<div class="kosong"><p>${esc(teks)}</p>${aksi}</div>`;
const UK_HAL = 20;
function potong(list, kunci) {
  const n = Math.max(1, Math.ceil(list.length / UK_HAL));
  const h = Math.min(A.halaman[kunci] || 0, n - 1);
  A.halaman[kunci] = h;
  return { baris: list.slice(h * UK_HAL, (h + 1) * UK_HAL), titik: n <= 1 ? '' : titikHal(kunci, h, n) };
}
function titikHal(kunci, h, n) {
  let awal = Math.max(0, Math.min(h - 3, n - 7)), akhir = Math.min(n, awal + 7), out = '';
  for (let i = awal; i < akhir; i++) out += `<button class="titik" data-a="halaman" data-k="${kunci}" data-i="${i}" aria-label="Halaman ${i + 1}" ${i === h ? 'aria-current="page"' : ''}><i></i></button>`;
  return `<div class="titik-baris">${out}<span class="titik-info">Halaman ${h + 1} dari ${n}</span></div>`;
}
function fmtWaktu(v) { if (!v) return ''; const d = new Date(v); return isNaN(d) ? '' : d.toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }); }
function kerangkaMuat(t) { return `${judulHal(t)}<p class="redup">Memuat data</p>`; }
function gagalMuat(e, ulang) { isi().innerHTML = kosong(e.message, `<button class="tbl" data-a="menu" data-h="${ulang}">Muat ulang</button>`); }

/* Ringkasan */
async function vRingkas() {
  isi().innerHTML = kerangkaMuat('Ringkasan');
  try {
    const r = await panggil('admin.ringkas');
    if (A.hal !== 'ringkas') return;
    const puncak = Math.max(1, ...r.kelompok.map(k => k.jumlah));
    const batang = r.kelompok.map(k => `<div title="Nilai ${k.label}: ${k.jumlah} peserta"><b>${k.jumlah || ''}</b><i style="height:${k.jumlah ? Math.max(4, k.jumlah / puncak * 74) : 1}%"></i><span>${k.label}</span></div>`).join('');
    const crew = r.perCrew.map(c => `<span>Crew ${esc(c.crew)}</span><div class="jalur-b" title="${c.jumlah} peserta"><i style="width:${c.rata || 0}%"></i></div><span class="angka">${c.rata === null ? '–' : c.rata}</span>`).join('');
    const persen = r.selesai ? Math.round(r.lulus / r.selesai * 100) : 0;
    const catatan = [];
    if (r.koreksi) catatan.push(`${r.koreksi} ujian menunggu koreksi essai, jadi belum masuk hitungan nilai.`);
    if (r.selesai) {
      catatan.push(`${persen}% peserta yang sudah dinilai mencapai nilai lulus ${r.kkm}.`);
      const ada = r.perCrew.filter(c => c.rata !== null).sort((a, b) => b.rata - a.rata);
      if (ada.length > 1) catatan.push(`Rata-rata tertinggi di crew ${ada[0].crew} (${ada[0].rata}), terendah di crew ${ada[ada.length - 1].crew} (${ada[ada.length - 1].rata}).`);
    }
    if (r.bermasalah) catatan.push(`${r.bermasalah} peserta punya catatan pelanggaran. Periksa lembar jawabannya di menu Hasil.`);
    if (!r.bukaStatus.buka) catatan.push(r.bukaStatus.pesan + ' Buka di menu Pengaturan.');
    isi().innerHTML = `${judulHal('Ringkasan')}
      <div class="kpi">
        <div class="lempeng"><strong>${r.berlangsung}</strong><span>Sedang ujian</span></div>
        <div class="lempeng"><strong>${r.koreksi}</strong><span>Menunggu koreksi</span></div>
        <div class="lempeng"><strong>${r.rata === null ? '–' : r.rata}</strong><span>Rata-rata nilai</span></div>
        <div class="lempeng"><strong>${r.lulus}<small class="redup" style="font-size:1rem;font-weight:400"> / ${r.selesai}</small></strong><span>Lulus dari yang dinilai</span></div>
        <div class="lempeng"><strong>${r.bermasalah}</strong><span>Ada pelanggaran</span></div>
      </div>
      <div class="dua-kolom">
        <section class="lempeng panel"><h3>Sebaran nilai (jumlah peserta)</h3>${r.selesai ? `<div class="batang-v">${batang}</div>` : kosong('Belum ada ujian yang selesai dinilai.')}</section>
        <section class="lempeng panel"><h3>Rata-rata nilai per crew</h3><div class="batang-h">${crew}</div></section>
      </div>
      <section class="lempeng panel catatan" style="margin-top:1.2rem"><h3>Catatan dari data</h3>${catatan.length ? catatan.map(t => `<p>${esc(t)}</p>`).join('') : '<p class="redup">Mulai dengan melengkapi soal di menu Soal, lalu bagikan alamat aplikasi kepada peserta.</p>'}</section>`;
  } catch (e) { gagalMuat(e, 'ringkas'); }
}

/* Peserta dan departemen */
async function vPeserta() {
  const sub = A.sub.peserta || 'daftar';
  isi().innerHTML = kerangkaMuat('Peserta');
  try {
    const [peserta, dept] = await Promise.all([panggil('pesertaAdm.list'), panggil('dept.list')]);
    if (A.hal !== 'peserta') return;
    A.data.peserta = peserta; A.data.dept = dept;
    const tombol = `<button class="fab" data-a="${sub === 'daftar' ? 'tambah-peserta' : 'tambah-dept'}" aria-label="${sub === 'daftar' ? 'Tambah peserta' : 'Tambah departemen'}">${ik('plus')}</button>`;
    isi().innerHTML = `${judulHal('Peserta', tombol)}${tabBaris('peserta', [['daftar', 'Daftar peserta'], ['dept', 'Departemen']])}<div class="tab-isi" id="tab-konten"></div>`;
    sub === 'daftar' ? isiPeserta() : isiDept();
  } catch (e) { gagalMuat(e, 'peserta'); }
}
function isiPeserta() {
  const q = (A.cari.peserta || '').toLowerCase();
  const list = A.data.peserta.filter(p => !q || `${p.id} ${p.nama} ${p.departemen} ${p.crew}`.toLowerCase().includes(q));
  const { baris, titik } = potong(list, 'peserta');
  $('#tab-konten').innerHTML = `<div class="saring"><input type="search" data-cari="peserta" placeholder="Cari ID, nama, departemen, atau crew" aria-label="Cari peserta" value="${esc(A.cari.peserta || '')}"></div>
    ${!list.length ? kosong(q ? 'Tidak ada peserta yang cocok.' : 'Belum ada peserta. Tambahkan di sini, atau biarkan peserta mengetik datanya sendiri saat masuk.') : `<div class="tabel-gulir"><table>
      <thead><tr><th>Nomor ID</th><th>Nama</th><th>Departemen</th><th>Crew</th><th class="hp-sembunyi">Diisi oleh</th><th></th></tr></thead>
      <tbody>${baris.map(p => `<tr><td class="angka">${esc(p.id)}</td><td>${esc(p.nama)}</td><td>${esc(p.departemen)}</td><td>${esc(p.crew)}</td>
        <td class="hp-sembunyi redup">${p.sumber === 'Ketik sendiri' ? 'Peserta' : 'Admin'}</td>
        <td class="aksi"><button class="ikon-tbl" data-a="ubah-peserta" data-id="${esc(p.id)}" aria-label="Ubah ${esc(p.nama)}">${ik('edit')}</button><button class="ikon-tbl bahaya" data-a="hapus-peserta" data-id="${esc(p.id)}" aria-label="Hapus ${esc(p.nama)}">${ik('trash')}</button></td></tr>`).join('')}</tbody></table></div>${titik}`}`;
}
function isiDept() {
  $('#tab-konten').innerHTML = !A.data.dept.length ? kosong('Belum ada departemen. Peserta akan mengetik departemennya sendiri.') : `<table><tbody>${A.data.dept.map(d => `<tr><td>${esc(d.nama)}</td>
    <td class="aksi"><button class="ikon-tbl" data-a="ubah-dept" data-id="${esc(d.id)}" aria-label="Ubah ${esc(d.nama)}">${ik('edit')}</button><button class="ikon-tbl bahaya" data-a="hapus-dept" data-id="${esc(d.id)}" aria-label="Hapus ${esc(d.nama)}">${ik('trash')}</button></td></tr>`).join('')}</tbody></table>`;
}
function formPesertaAdmin(p) {
  const opsi = A.data.dept.map(d => `<option value="${esc(d.nama)}" ${p && p.departemen === d.nama ? 'selected' : ''}>${esc(d.nama)}</option>`).join('');
  const lain = p && p.departemen && !A.data.dept.some(d => d.nama === p.departemen);
  bukaModal(`${kepalaModal(p ? 'Ubah peserta' : 'Tambah peserta')}<form id="f-peserta-adm" novalidate>
    <input type="hidden" name="idLama" value="${esc(p ? p.id : '')}">
    <label class="isian"><span>Nomor ID</span><input type="text" name="id" maxlength="40" value="${esc(p ? p.id : '')}" required></label>
    <label class="isian"><span>Nama</span><input type="text" name="nama" maxlength="80" value="${esc(p ? p.nama : '')}" required></label>
    <label class="isian"><span>Departemen</span><select name="deptPilih" data-dept-pilih><option value="">Pilih departemen</option>${opsi}<option value="__ketik" ${lain ? 'selected' : ''}>Ketik manual</option></select></label>
    <label class="isian" data-dept-ketik ${lain ? '' : 'hidden'}><span>Nama departemen</span><input type="text" name="deptKetik" maxlength="80" value="${lain ? esc(p.departemen) : ''}"></label>
    <div class="isian"><span class="label">Crew</span><div class="segmen">${['A', 'B', 'C', 'STD'].map(c => `<label><input type="radio" name="crew" value="${c}" ${p && p.crew === c ? 'checked' : ''}><span>${c}</span></label>`).join('')}</div></div>
    <div class="modal-kaki"><button type="button" class="tbl" data-a="tutup-modal">Batal</button><button class="tbl tbl-utama">Simpan peserta</button></div></form>`);
}
function formDept(d) {
  bukaModal(`${kepalaModal(d ? 'Ubah departemen' : 'Tambah departemen')}<form id="f-dept" novalidate><input type="hidden" name="id" value="${esc(d ? d.id : '')}">
    <label class="isian"><span>Nama departemen</span><input type="text" name="nama" maxlength="80" value="${esc(d ? d.nama : '')}" required></label>
    <div class="modal-kaki"><button type="button" class="tbl" data-a="tutup-modal">Batal</button><button class="tbl tbl-utama">Simpan departemen</button></div></form>`);
}

/* Soal dan alat berat */
async function vSoal() {
  const sub = A.sub.soal || 'bank';
  isi().innerHTML = kerangkaMuat('Soal');
  try {
    const [soal, alat] = await Promise.all([panggil('soal.list'), panggil('alat.list')]);
    if (A.hal !== 'soal') return;
    A.data.soal = soal; A.data.alat = alat;
    if (!A.filterAlat && alat.length) A.filterAlat = alat[0].nama;
    const tombol = `<button class="fab" data-a="${sub === 'bank' ? 'tambah-soal' : 'tambah-alat'}" aria-label="${sub === 'bank' ? 'Tambah soal' : 'Tambah alat berat'}">${ik('plus')}</button>`;
    isi().innerHTML = `${judulHal('Soal', tombol)}${tabBaris('soal', [['bank', 'Bank soal'], ['alat', 'Alat berat']])}<div class="tab-isi" id="tab-konten"></div>`;
    sub === 'bank' ? isiBank() : isiAlat();
  } catch (e) { gagalMuat(e, 'soal'); }
}
function isiBank() {
  const q = (A.cari.soal || '').toLowerCase(), tipe = A.filterTipe || '';
  const alat = A.data.alat.find(a => a.nama === A.filterAlat);
  const list = A.data.soal.filter(s => s.alat === A.filterAlat && (!tipe || s.tipe === tipe) && (!q || s.teks.toLowerCase().includes(q)));
  const { baris, titik } = potong(list, 'soal');
  const tandai = (n, perlu) => n >= perlu ? 'st-hijau' : 'st-magenta';
  $('#tab-konten').innerHTML = `<div class="saring">
      <select data-filter="alat" aria-label="Pilih alat berat">${A.data.alat.map(a => `<option ${a.nama === A.filterAlat ? 'selected' : ''}>${esc(a.nama)}</option>`).join('')}</select>
      <select data-filter="tipe" aria-label="Pilih jenis soal"><option value="">Semua jenis</option><option value="PG" ${tipe === 'PG' ? 'selected' : ''}>Pilihan ganda</option><option value="ESAI" ${tipe === 'ESAI' ? 'selected' : ''}>Essai</option></select>
      <input type="search" data-cari="soal" placeholder="Cari pertanyaan" aria-label="Cari pertanyaan" value="${esc(A.cari.soal || '')}">
    </div>
    ${alat ? `<p class="kesiapan" style="margin-bottom:.6rem">Terisi <span class="${tandai(alat.pg, alat.perluPG)}">${alat.pg} dari ${alat.perluPG} pilihan ganda</span> dan <span class="${tandai(alat.essai, alat.perluEssai)}">${alat.essai} dari ${alat.perluEssai} essai</span>. Soal lebih banyak dari itu akan diacak untuk tiap peserta.</p>` : ''}
    ${!A.data.alat.length ? kosong('Tambahkan alat berat dulu sebelum menulis soal.') : !list.length ? kosong(q || tipe ? 'Tidak ada soal yang cocok.' : `Belum ada soal untuk ${A.filterAlat}. Tekan tombol tambah untuk menulis soal pertama.`) : `<div class="tabel-gulir"><table>
      <thead><tr><th>Pertanyaan</th><th>Jenis</th><th class="hp-sembunyi">Kunci</th><th class="hp-sembunyi">Status</th><th></th></tr></thead>
      <tbody>${baris.map(s => `<tr><td><span class="ringkas">${esc(s.teks)}</span></td><td class="kecil">${s.tipe === 'PG' ? 'Pilihan ganda' : 'Essai'}</td>
        <td class="hp-sembunyi">${s.tipe === 'PG' ? esc(s.kunci) : '<span class="redup kecil">Pedoman</span>'}</td>
        <td class="hp-sembunyi ${s.aktif ? 'st-hijau' : 'st-magenta'}">${s.aktif ? 'Aktif' : 'Nonaktif'}</td>
        <td class="aksi"><button class="ikon-tbl" data-a="ubah-soal" data-id="${esc(s.id)}" aria-label="Ubah soal">${ik('edit')}</button><button class="ikon-tbl bahaya" data-a="hapus-soal" data-id="${esc(s.id)}" aria-label="Hapus soal">${ik('trash')}</button></td></tr>`).join('')}</tbody></table></div>${titik}`}`;
}
function isiAlat() {
  $('#tab-konten').innerHTML = !A.data.alat.length ? kosong('Belum ada alat berat. Tekan tombol tambah untuk mendaftarkan unit pertama.') : `<div class="grid-kartu">${A.data.alat.map(a => `
    <article class="kartu-alat">
      <div class="sumur bengkel">${a.gambar ? `<img src="${esc(a.gambar)}" alt="Gambar ${esc(a.nama)}">` : ALAT_BAWAAN}</div>
      <div class="baris"><h3>${esc(a.nama)}</h3><span>
        <button class="ikon-tbl" data-a="ubah-alat" data-id="${esc(a.id)}" aria-label="Ubah ${esc(a.nama)}">${ik('edit')}</button><button class="ikon-tbl bahaya" data-a="hapus-alat" data-id="${esc(a.id)}" aria-label="Hapus ${esc(a.nama)}">${ik('trash')}</button></span></div>
      <p class="kesiapan">${a.pg} dari ${a.perluPG} pilihan ganda, ${a.essai} dari ${a.perluEssai} essai.
        ${!a.aktif ? '<span class="st-magenta">Nonaktif.</span>' : a.pg >= a.perluPG && a.essai >= a.perluEssai ? '<span class="st-hijau">Siap diujikan.</span>' : '<span class="st-magenta">Soal belum lengkap.</span>'}</p>
    </article>`).join('')}</div>`;
}
function ambilGambarHtml(nama, url, label) {
  return `<div class="isian"><span class="label">${esc(label)}</span>
    <div class="ambil-gambar"><div class="sumur" data-pratinjau>${url ? `<img src="${esc(url)}" alt="">` : ik('image')}</div>
      <label class="tbl"><input type="file" accept="image/png,image/jpeg,image/webp,image/gif" data-unggah="${esc(nama)}" aria-label="${esc(label)}">Unggah gambar</label></div>
    <input type="url" name="${esc(nama)}" value="${esc(url || '')}" placeholder="Atau tempel alamat https://" aria-label="Alamat gambar" data-url-gambar>
    <small>PNG, JPG, WEBP, atau GIF, maksimal 5 MB. Tautan Google Drive juga bisa.</small></div>`;
}
function formAlat(a) {
  bukaModal(`${kepalaModal(a ? 'Ubah alat berat' : 'Tambah alat berat')}<form id="f-alat" novalidate><input type="hidden" name="id" value="${esc(a ? a.id : '')}">
    <label class="isian"><span>Nama alat berat</span><input type="text" name="nama" maxlength="80" placeholder="Contoh: Wheel loader" value="${esc(a ? a.nama : '')}" required></label>
    ${ambilGambarHtml('gambar', a ? a.gambar : '', 'Gambar alat berat')}
    <label class="sakelar"><span>Tampilkan di pilihan peserta</span><input type="checkbox" name="aktif" ${!a || a.aktif ? 'checked' : ''}><i></i></label>
    <div class="modal-kaki"><button type="button" class="tbl" data-a="tutup-modal">Batal</button><button class="tbl tbl-utama">Simpan alat berat</button></div></form>`);
}
function formSoal(s) {
  const t = s ? s.tipe : (A.filterTipe || 'PG');
  bukaModal(`${kepalaModal(s ? 'Ubah soal' : 'Tambah soal')}<form id="f-soal" novalidate><input type="hidden" name="id" value="${esc(s ? s.id : '')}">
    <div class="dua">
      <label class="isian"><span>Alat berat</span><select name="alat">${A.data.alat.map(a => `<option ${(s ? s.alat : A.filterAlat) === a.nama ? 'selected' : ''}>${esc(a.nama)}</option>`).join('')}</select></label>
      <label class="isian"><span>Jenis soal</span><select name="tipe" data-tipe-soal><option value="PG" ${t === 'PG' ? 'selected' : ''}>Pilihan ganda</option><option value="ESAI" ${t === 'ESAI' ? 'selected' : ''}>Essai</option></select></label>
    </div>
    <label class="isian"><span>Pertanyaan</span><textarea name="teks" rows="4" maxlength="2000" required>${esc(s ? s.teks : '')}</textarea></label>
    ${ambilGambarHtml('gambar', s ? s.gambar : '', 'Gambar soal (boleh dikosongkan)')}
    <div data-bagian="PG" ${t === 'PG' ? '' : 'hidden'}>
      ${['A', 'B', 'C', 'D'].map(k => `<label class="isian"><span>Pilihan ${k}</span><input type="text" name="${k}" maxlength="500" value="${esc(s ? s[k] : '')}"></label>`).join('')}
      <div class="isian"><span class="label">Kunci jawaban</span><div class="segmen">${['A', 'B', 'C', 'D'].map(k => `<label><input type="radio" name="kunciPG" value="${k}" ${s && s.tipe === 'PG' && s.kunci === k ? 'checked' : ''}><span>${k}</span></label>`).join('')}</div></div>
    </div>
    <label class="isian" data-bagian="ESAI" ${t === 'ESAI' ? '' : 'hidden'}><span>Pedoman koreksi (boleh dikosongkan)</span><textarea name="kunciEs" rows="3" maxlength="2000">${esc(s && s.tipe === 'ESAI' ? s.kunci : '')}</textarea><small>Hanya terlihat oleh admin saat mengoreksi.</small></label>
    <label class="sakelar"><span>Soal aktif</span><input type="checkbox" name="aktif" ${!s || s.aktif ? 'checked' : ''}><i></i></label>
    <div class="modal-kaki"><button type="button" class="tbl" data-a="tutup-modal">Batal</button><button class="tbl tbl-utama">Simpan soal</button></div></form>`, { lebar: true });
}

/* Hasil dan pantau */
async function vHasil() {
  const sub = A.sub.hasil || 'nilai';
  isi().innerHTML = kerangkaMuat('Hasil');
  try {
    A.data.hasil = await panggil('hasil.list');
    if (A.hal !== 'hasil') return;
    isi().innerHTML = `${judulHal('Hasil')}${tabBaris('hasil', [['nilai', 'Nilai'], ['pantau', 'Pantau ujian']])}<div class="tab-isi" id="tab-konten"></div>`;
    if (sub === 'nilai') isiNilai();
    else { isiPantau(); A.pantau = setInterval(segarkanPantau, 20000); }
  } catch (e) { gagalMuat(e, 'hasil'); }
}
function berhentiPantau() { clearInterval(A.pantau); A.pantau = null; }
async function segarkanPantau() {
  try {
    A.data.hasil = await panggil('hasil.list', {}, { senyap: true });
    if (A.hal === 'hasil' && A.sub.hasil === 'pantau' && $('#tab-konten')) isiPantau();
  } catch (e) { /* dicoba lagi pada putaran berikutnya */ }
}
function teksStatus(u) {
  if (u.status === 'Selesai') return u.hasil === 'Lulus' ? '<span class="st-hijau">Lulus</span>' : '<span class="st-magenta">Tidak lulus</span>';
  if (u.status === 'Menunggu koreksi') return '<span class="st-cyan">Menunggu koreksi</span>';
  return `<span class="redup">${esc(u.status)}</span>`;
}
function isiNilai() {
  const data = A.data.hasil.filter(u => u.status !== 'Berlangsung');
  const q = (A.cari.hasil || '').toLowerCase(), crew = A.filterCrew || '', alat = A.filterAlatH || '';
  const list = data.filter(u => (!crew || u.crew === crew) && (!alat || u.alat === alat) && (!q || `${u.idPeserta} ${u.nama} ${u.departemen}`.toLowerCase().includes(q)));
  const daftarAlat = [...new Set(data.map(u => u.alat))];
  const { baris, titik } = potong(list, 'hasil');
  $('#tab-konten').innerHTML = `<div class="saring">
      <input type="search" data-cari="hasil" placeholder="Cari ID, nama, atau departemen" aria-label="Cari peserta" value="${esc(A.cari.hasil || '')}">
      <select data-filter="crew" aria-label="Saring crew"><option value="">Semua crew</option>${['A', 'B', 'C', 'STD'].map(c => `<option ${c === crew ? 'selected' : ''}>${c}</option>`).join('')}</select>
      <select data-filter="alatH" aria-label="Saring alat berat"><option value="">Semua alat berat</option>${daftarAlat.map(a => `<option ${a === alat ? 'selected' : ''}>${esc(a)}</option>`).join('')}</select>
    </div>
    ${!list.length ? kosong(data.length ? 'Tidak ada hasil yang cocok.' : 'Belum ada ujian yang dikumpulkan.') : `<div class="tabel-gulir"><table>
      <thead><tr><th>ID</th><th>Nama</th><th class="hp-sembunyi">Departemen</th><th>Crew</th><th class="hp-sembunyi">Alat berat</th><th>Nilai</th><th>Status</th><th class="hp-sembunyi">Pelanggaran</th><th></th></tr></thead>
      <tbody>${baris.map(u => `<tr><td class="angka">${esc(u.idPeserta)}</td><td>${esc(u.nama)}</td><td class="hp-sembunyi">${esc(u.departemen)}</td><td>${esc(u.crew)}</td><td class="hp-sembunyi">${esc(u.alat)}</td>
        <td class="angka">${u.nilai === '' ? '<span class="redup">–</span>' : esc(u.nilai)}</td><td class="kecil">${teksStatus(u)}</td>
        <td class="angka hp-sembunyi ${u.pelanggaran ? 'st-magenta' : 'redup'}">${u.pelanggaran}</td>
        <td class="aksi"><button class="ikon-tbl" data-a="lihat-hasil" data-id="${esc(u.id)}" aria-label="Buka lembar jawaban ${esc(u.nama)}">${ik('eye')}</button></td></tr>`).join('')}</tbody></table></div>${titik}`}`;
}
function isiPantau() {
  const list = A.data.hasil.filter(u => u.status === 'Berlangsung'), now = Date.now();
  $('#tab-konten').innerHTML = !list.length ? kosong('Tidak ada peserta yang sedang ujian. Halaman ini diperbarui otomatis.') : `<p class="kesiapan" style="margin-bottom:.6rem">Diperbarui otomatis tiap 20 detik.</p><div class="tabel-gulir"><table>
    <thead><tr><th>ID</th><th>Nama</th><th>Crew</th><th class="hp-sembunyi">Alat berat</th><th>Sisa waktu</th><th>Koneksi</th><th>Pelanggaran</th><th></th></tr></thead>
    <tbody>${list.map(u => {
      const putus = now - new Date(u.aktif).getTime() > 150000;
      return `<tr><td class="angka">${esc(u.idPeserta)}</td><td>${esc(u.nama)}</td><td>${esc(u.crew)}</td><td class="hp-sembunyi">${esc(u.alat)}</td>
      <td class="angka">${fmtSisa(new Date(u.batas).getTime() - now)}</td><td class="kecil ${putus ? 'st-magenta' : 'st-hijau'}">${putus ? 'Tidak terhubung' : 'Terhubung'}</td>
      <td class="angka ${u.pelanggaran ? 'st-magenta' : 'redup'}">${u.pelanggaran}</td>
      <td class="aksi"><button class="ikon-tbl" data-a="lihat-hasil" data-id="${esc(u.id)}" aria-label="Buka catatan ${esc(u.nama)}">${ik('eye')}</button></td></tr>`;
    }).join('')}</tbody></table></div>`;
}
async function bukaHasil(id) {
  try {
    const r = await panggil('hasil.detail', { id });
    const u = r.ujian;
    const pg = r.jawaban.filter(j => j.tipe === 'PG'), es = r.jawaban.filter(j => j.tipe !== 'PG');
    const lembarEs = es.map(j => `<div class="jwb"><p><b>Soal ${esc(j.no)}.</b> ${esc(j.teks)}</p>
      <p class="sumur jwb-teks">${j.jawaban ? esc(j.jawaban) : '<span class="redup">Tidak dijawab</span>'}</p>
      ${j.kunci ? `<p class="kecil redup">Pedoman: ${esc(j.kunci)}</p>` : ''}
      <label class="jwb-skor">Skor <input type="number" min="0" max="${esc(j.maks)}" step="0.5" name="${esc(j.no)}" value="${esc(j.skor)}" aria-label="Skor soal ${esc(j.no)}"> dari ${esc(j.maks)}</label></div>`).join('');
    const lembarPg = pg.map(j => `<div class="jwb kecil"><p><b>Soal ${esc(j.no)}.</b> ${esc(j.teks)}</p>
      <p>Jawaban: ${j.jawaban ? esc(j.jawaban) : '<span class="redup">tidak dijawab</span>'} ${j.benar === 'YA' ? '<span class="st-hijau">Benar</span>' : '<span class="st-magenta">Salah</span>'}</p>${j.benar === 'YA' ? '' : `<p class="redup">Kunci: ${esc(j.kunci)}</p>`}</div>`).join('');
    bukaModal(`${kepalaModal(`${u.nama} (${u.idPeserta})`)}
      <dl class="sumur kartu-data" style="margin-top:0">
        <dt>Departemen</dt><dd>${esc(u.departemen)}, crew ${esc(u.crew)}</dd><dt>Alat berat</dt><dd>${esc(u.alat)}</dd>
        <dt>Mulai</dt><dd>${esc(fmtWaktu(u.mulai))}</dd><dt>Selesai</dt><dd>${esc(fmtWaktu(u.selesai)) || 'Belum'}${u.cara ? ` (${esc(u.cara)})` : ''}</dd>
        ${u.status === 'Berlangsung' ? '' : `<dt>Pilihan ganda</dt><dd>${esc(u.benar)} benar, skor ${esc(u.skorPG)}</dd><dt>Nilai</dt><dd>${u.nilai === '' ? 'Menunggu koreksi essai' : `${esc(u.nilai)}, ${esc(u.hasil)}`}</dd>`}
      </dl>
      <h3 style="margin:1.2rem 0 .4rem">Catatan pelanggaran (${r.pelanggaran.length})</h3>
      ${r.pelanggaran.length ? `<ul class="kecil" style="padding-left:1.1rem;margin:0">${r.pelanggaran.map(p => `<li>${esc(fmtWaktu(p.waktu))}: ${esc(p.jenis)}${p.dihitung ? ' <span class="st-magenta">(dihitung)</span>' : ''}</li>`).join('')}</ul>` : '<p class="redup kecil">Tidak ada.</p>'}
      ${es.length ? `<form id="f-koreksi" data-id="${esc(u.id)}"><h3 style="margin:1.2rem 0 0">Koreksi essai</h3>${lembarEs}
        <div class="modal-kaki"><button class="tbl tbl-utama">Simpan nilai essai</button></div></form>` : ''}
      ${pg.length ? `<details style="margin-top:1rem"><summary style="cursor:pointer;font-weight:500">Lihat jawaban pilihan ganda (${pg.length})</summary>${lembarPg}</details>` : ''}
      <div class="modal-kaki" style="justify-content:space-between"><button class="tbl tbl-bahaya" data-a="batal-ujian" data-id="${esc(u.id)}" data-nama="${esc(u.nama)}">Batalkan agar bisa mengulang</button><button class="tbl" data-a="tutup-modal">Tutup</button></div>`, { lebar: true });
  } catch (e) { galat(e); }
}

/* Pengaturan */
function keLokal(ms) { if (!ms) return ''; const d = new Date(ms), p = n => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`; }
async function vSetelan() {
  isi().innerHTML = kerangkaMuat('Pengaturan');
  try {
    const s = await panggil('setelan.ambil');
    if (A.hal !== 'setelan') return;
    const angka = (n, l, min, max, k) => `<label class="isian"><span>${l}</span><input type="number" name="${n}" min="${min}" max="${max}" value="${esc(s[n])}" required>${k ? `<small>${k}</small>` : ''}</label>`;
    isi().innerHTML = `${judulHal('Pengaturan')}<form id="f-setelan" class="setelan" novalidate>
      <section class="lempeng panel"><h3>Waktu ujian</h3>
        <label class="sakelar"><span>Ujian dibuka untuk peserta</span><input type="checkbox" name="ujianDibuka" ${s.ujianDibuka === 'YA' ? 'checked' : ''}><i></i></label>
        ${angka('durasiMenit', 'Lama ujian (menit)', 1, 600)}
        <label class="isian"><span>Dibuka pada (boleh dikosongkan)</span><input type="datetime-local" name="jadwalMulai" value="${keLokal(s.jadwalMulai)}"></label>
        <label class="isian"><span>Ditutup pada (boleh dikosongkan)</span><input type="datetime-local" name="jadwalSelesai" value="${keLokal(s.jadwalSelesai)}"><small>Peserta yang sedang ujian otomatis berakhir pada waktu ini.</small></label>
      </section>
      <section class="lempeng panel"><h3>Identitas</h3>
        <label class="isian"><span>Nama aplikasi</span><input type="text" name="namaAplikasi" maxlength="80" value="${esc(s.namaAplikasi)}"></label>
        ${ambilGambarHtml('logoUrl', s.logoUrl, 'Logo')}
      </section>
      <section class="lempeng panel"><h3>Susunan soal dan nilai</h3>
        <div class="dua">${angka('jumlahPG', 'Jumlah pilihan ganda', 0, 200)}${angka('jumlahEssai', 'Jumlah essai', 0, 50)}${angka('bobotPG', 'Poin tiap pilihan ganda', 0, 100)}${angka('bobotEssai', 'Poin maksimal tiap essai', 0, 100)}</div>
        ${angka('kkm', 'Nilai minimal lulus (0 sampai 100)', 0, 100)}
        <p class="kesiapan">Nilai akhir dihitung dari total poin dibanding poin maksimal, lalu diubah ke skala 100.</p>
      </section>
      <section class="lempeng panel"><h3>Pengawasan</h3>
        ${angka('batasPelanggaran', 'Kumpulkan otomatis setelah pelanggaran ke-', 0, 50, 'Isi 0 bila jawaban tidak pernah dikumpulkan otomatis.')}
        <label class="sakelar"><span>Wajib layar penuh</span><input type="checkbox" name="wajibLayarPenuh" ${s.wajibLayarPenuh === 'YA' ? 'checked' : ''}><i></i></label>
        <label class="isian"><span>Kode ujian (boleh dikosongkan)</span><input type="text" name="kodeUjian" maxlength="40" autocomplete="off" value="${esc(s.kodeUjian)}"><small>Bila diisi, peserta harus memasukkan kode ini. Sebutkan saat ujian dimulai.</small></label>
      </section>
      <section class="lempeng panel"><h3>Akun dan database</h3>
        <div style="display:flex;flex-wrap:wrap;gap:.7rem"><button type="button" class="tbl" data-a="form-sandi">Ganti kata sandi</button>
        <a class="tbl" href="${esc(s.spreadsheetUrl)}" target="_blank" rel="noopener">${ik('sheet')}Buka spreadsheet</a></div>
      </section>
      <div style="grid-column:1/-1;display:flex;justify-content:flex-end"><button class="tbl tbl-utama">Simpan pengaturan</button></div>
    </form>`;
  } catch (e) { gagalMuat(e, 'setelan'); }
}
function formSandi(wajib) {
  bukaModal(`<h2>${wajib ? 'Buat kata sandi baru' : 'Ganti kata sandi'}</h2>
    ${wajib ? '<p class="redup" style="margin:.5rem 0 1rem">Kata sandi awal harus diganti sebelum memakai aplikasi.</p>' : '<div style="height:1rem"></div>'}
    <form id="f-sandi" novalidate>
      <label class="isian"><span>Kata sandi saat ini</span><input type="password" name="lama" autocomplete="current-password" required></label>
      <label class="isian"><span>Kata sandi baru</span><input type="password" name="baru" autocomplete="new-password" required><small>Minimal 10 karakter, berisi huruf dan angka.</small></label>
      <div class="modal-kaki">${wajib ? '' : '<button type="button" class="tbl" data-a="tutup-modal">Batal</button>'}<button class="tbl tbl-utama">Simpan kata sandi</button></div>
    </form>`, { tetap: wajib });
}

/* ── Unggah gambar ── */
function bacaBerkas(file) {
  return new Promise((ok, no) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = () => no(new Error('Berkas tidak bisa dibaca.')); r.readAsDataURL(file); });
}
function perkecil(dataUrl) {
  return new Promise((ok, no) => {
    const g = new Image();
    g.onload = () => {
      const skala = Math.min(1, 1600 / Math.max(g.width, g.height));
      const c = document.createElement('canvas');
      c.width = Math.round(g.width * skala); c.height = Math.round(g.height * skala);
      c.getContext('2d').drawImage(g, 0, 0, c.width, c.height);
      ok(c.toDataURL('image/jpeg', .85));
    };
    g.onerror = () => no(new Error('Berkas ini bukan gambar yang bisa dibaca.'));
    g.src = dataUrl;
  });
}
async function unggahGambar(input) {
  const file = input.files[0];
  if (!file) return;
  const wadah = input.closest('.isian');
  const url = $('[data-url-gambar]', wadah), pra = $('[data-pratinjau]', wadah), lbl = input.closest('.tbl');
  lbl.setAttribute('aria-busy', 'true');
  try {
    let d = await bacaBerkas(file);
    if (file.size > 2 * 1024 * 1024) d = await perkecil(d);
    const r = await panggil('gambar.unggah', { dataUrl: d, nama: file.name });
    url.value = r.url;
    pra.innerHTML = `<img src="${esc(r.url)}" alt="">`;
    toast('Gambar diunggah.');
  } catch (e) { galat(e); } finally { lbl.removeAttribute('aria-busy'); input.value = ''; }
}

/* ── Simpan formulir admin ── */
async function kirimForm(f, aksi, data, pesan, ulang) {
  const b = $('button.tbl-utama', f); if (b) b.disabled = true;
  try {
    await panggil(aksi, data);
    tutupModal();
    toast(pesan);
    if (ulang) ulang();
  } catch (e) { galat(e); if (b) b.disabled = false; }
}
const FORM = {
  'f-peserta': f => kirimPeserta(f),
  'f-admin': f => kirimAdmin(f),
  'f-peserta-adm': f => {
    const d = Object.fromEntries(new FormData(f));
    d.departemen = d.deptPilih === '__ketik' ? d.deptKetik : d.deptPilih;
    d.crew = ($('input[name=crew]:checked', f) || {}).value || '';
    kirimForm(f, 'pesertaAdm.simpan', d, 'Peserta tersimpan.', vPeserta);
  },
  'f-dept': f => kirimForm(f, 'dept.simpan', Object.fromEntries(new FormData(f)), 'Departemen tersimpan.', vPeserta),
  'f-alat': f => { const d = Object.fromEntries(new FormData(f)); d.aktif = !!f.elements.aktif.checked; kirimForm(f, 'alat.simpan', d, 'Alat berat tersimpan.', vSoal); },
  'f-soal': f => {
    const d = Object.fromEntries(new FormData(f));
    d.aktif = !!f.elements.aktif.checked;
    d.kunci = d.tipe === 'PG' ? (d.kunciPG || '') : d.kunciEs;
    kirimForm(f, 'soal.simpan', d, 'Soal tersimpan.', vSoal);
  },
  'f-setelan': async f => {
    const d = Object.fromEntries(new FormData(f));
    d.ujianDibuka = f.elements.ujianDibuka.checked ? 'YA' : 'TIDAK';
    d.wajibLayarPenuh = f.elements.wajibLayarPenuh.checked ? 'YA' : 'TIDAK';
    d.jadwalMulai = d.jadwalMulai ? String(new Date(d.jadwalMulai).getTime()) : '';
    d.jadwalSelesai = d.jadwalSelesai ? String(new Date(d.jadwalSelesai).getTime()) : '';
    const b = $('button.tbl-utama', f); b.disabled = true;
    try {
      await panggil('setelan.simpan', d);
      toast('Pengaturan tersimpan.');
      S.awal = await panggil('publik.awal');
      tampilAdmin('setelan');
    } catch (e) { galat(e); b.disabled = false; }
  },
  'f-sandi': async f => {
    const b = $('button.tbl-utama', f); b.disabled = true;
    try {
      const r = await panggil('admin.sandi', Object.fromEntries(new FormData(f)));
      S.token = r.token; simpanSesi(); tutupModal(); toast('Kata sandi tersimpan.');
    } catch (e) { galat(e); b.disabled = false; }
  },
  'f-koreksi': async f => {
    const skor = {};
    $$('input[type=number]', f).forEach(i => { skor[i.name] = i.value; });
    const b = $('button.tbl-utama', f); b.disabled = true;
    try {
      const r = await panggil('hasil.nilai', { id: f.dataset.id, skor });
      toast(r.lengkap ? `Nilai essai tersimpan. Nilai akhir ${r.nilai}.` : 'Nilai tersimpan. Masih ada essai yang belum diberi skor.');
      tutupModal();
      A.data.hasil = await panggil('hasil.list');
      if ($('#tab-konten')) isiNilai();
    } catch (e) { galat(e); b.disabled = false; }
  }
};

/* ── Hapus dengan konfirmasi ── */
async function hapus(judul, isiTeks, aksi, data, pesan, ulang) {
  if (!await konfirmasi({ judul, isi: isiTeks, ya: 'Hapus', bahaya: true })) return;
  try { await panggil(aksi, data); toast(pesan); ulang(); } catch (e) { galat(e); }
}

/* ── Aksi tombol (delegasi) ── */
const AKSI = {
  'tema': () => gantiTema(),
  'muat-ulang': () => muatMasuk(),
  'tab-masuk': b => { S.tabMasuk = b.dataset.t; tampilMasuk(); },
  'tutup-modal': () => tutupModal(),
  'keluar': () => { hapusSesi(); keluarKeMasuk(); },
  'mulai-ujian': b => mulaiUjian(b),
  'pilih': b => {
    const s = U.soal[U.idx], k = b.dataset.k;
    ubahJawaban(s.id, k);
    $$('.opsi', $('#pelat')).forEach(x => x.setAttribute('aria-checked', String(x.dataset.k === k)));
    tampilPapan();
  },
  'soal-geser': b => keSoal(U.idx + Number(b.dataset.d)),
  'soal-ke': b => keSoal(Number(b.dataset.i)),
  'soal-gambar': () => { const s = U.soal[U.idx]; if (s.gambar) lihatGambar(s.gambar); },
  'ragu': b => {
    const s = U.soal[U.idx];
    U.ragu[s.id] = !U.ragu[s.id];
    b.setAttribute('aria-pressed', String(U.ragu[s.id]));
    try { localStorage.setItem(kunciLokal() + '_r', JSON.stringify(U.ragu)); } catch (e) { /* abaikan */ }
    tampilPapan();
  },
  'laci': () => $('#konsol').classList.toggle('buka'),
  'kumpul': () => { $('#konsol').classList.remove('buka'); kumpulkan(false); },
  'kembali-ujian': async () => {
    S.peringatan = false;
    tutupModal();
    if (U.layarPenuh && !document.fullscreenElement) { await document.documentElement.requestFullscreen().catch(() => null); AC.terakhir = Date.now(); }
    document.body.classList.remove('tersembunyi');
  },
  'menu': b => tampilAdmin(b.dataset.h),
  'sub': b => { A.sub[b.dataset.h] = b.dataset.s; tampilAdmin(b.dataset.h); },
  'halaman': b => {
    A.halaman[b.dataset.k] = Number(b.dataset.i);
    ({ peserta: isiPeserta, soal: isiBank, hasil: isiNilai })[b.dataset.k]();
  },
  'tambah-peserta': () => formPesertaAdmin(null),
  'ubah-peserta': b => formPesertaAdmin(A.data.peserta.find(p => p.id === b.dataset.id)),
  'hapus-peserta': b => hapus('Hapus peserta ini?', `Nomor ID ${b.dataset.id} dihapus dari daftar. Hasil ujiannya tetap tersimpan.`, 'pesertaAdm.hapus', { id: b.dataset.id }, 'Peserta dihapus.', vPeserta),
  'tambah-dept': () => formDept(null),
  'ubah-dept': b => formDept(A.data.dept.find(d => d.id === b.dataset.id)),
  'hapus-dept': b => hapus('Hapus departemen ini?', 'Departemen hilang dari pilihan saat peserta masuk. Data peserta lama tidak berubah.', 'dept.hapus', { id: b.dataset.id }, 'Departemen dihapus.', vPeserta),
  'tambah-alat': () => formAlat(null),
  'ubah-alat': b => formAlat(A.data.alat.find(a => a.id === b.dataset.id)),
  'hapus-alat': b => hapus('Hapus alat berat ini?', 'Alat berat hanya bisa dihapus bila belum punya soal.', 'alat.hapus', { id: b.dataset.id }, 'Alat berat dihapus.', vSoal),
  'tambah-soal': () => { if (!A.data.alat.length) return toast('Tambahkan alat berat dulu di tab Alat berat.', true); formSoal(null); },
  'ubah-soal': b => formSoal(A.data.soal.find(s => s.id === b.dataset.id)),
  'hapus-soal': b => hapus('Hapus soal ini?', 'Soal hilang dari bank soal. Lembar jawaban yang sudah dikumpulkan tetap menyimpan salinannya.', 'soal.hapus', { id: b.dataset.id }, 'Soal dihapus.', vSoal),
  'lihat-hasil': b => bukaHasil(b.dataset.id),
  'batal-ujian': async b => {
    const { id, nama } = b.dataset;
    if (!await konfirmasi({ judul: `Batalkan ujian ${nama}?`, isi: 'Ujian ini tidak lagi dihitung dan peserta bisa mengulang. Bila peserta sedang mengerjakan, ujiannya langsung berhenti. Catatannya tetap ada di spreadsheet.', ya: 'Batalkan ujian', bahaya: true })) return;
    try {
      await panggil('hasil.batal', { id });
      toast('Ujian dibatalkan.');
      vHasil();
    } catch (e) { galat(e); }
  },
  'form-sandi': () => formSandi(false)
};
document.addEventListener('click', e => {
  const b = e.target.closest('[data-a]');
  if (b && !b.disabled) { const fn = AKSI[b.dataset.a]; if (fn) { e.preventDefault(); fn(b); return; } }
  if (e.target.classList.contains('modal-latar') && e.target.dataset.latar === '1') tutupModal();
  if (e.target.classList.contains('minia')) lihatGambar(e.target.src, { unduh: true });
});
document.addEventListener('submit', e => {
  // getAttribute: form.id tertimpa oleh <input name="id"> di dalam form.
  const fn = FORM[e.target.getAttribute('id')];
  e.preventDefault();
  if (fn) fn(e.target);
});
document.addEventListener('input', e => {
  const t = e.target;
  if (t.id === 'esai') {
    const s = U.soal[U.idx];
    ubahJawaban(s.id, t.value);
    const h = $('#esai-hitung'); if (h) h.textContent = `${t.value.length} dari ${U.maksEssai} karakter`;
    tampilPapan();
  }
  if (t.dataset.cari) {
    const k = t.dataset.cari;
    A.cari[k] = t.value; A.halaman[k] = 0;
    const pos = t.selectionStart;
    ({ peserta: isiPeserta, soal: isiBank, hasil: isiNilai })[k]();
    const baru = $(`[data-cari="${k}"]`); if (baru) { baru.focus(); baru.setSelectionRange(pos, pos); }
  }
});
document.addEventListener('change', e => {
  const t = e.target;
  if (t.id === 'p-id') { terkunciData = false; cekId(t.value.trim()); }
  if (t.id === 'p-dept') $('#p-dept-ketik').hidden = t.value !== '__ketik';
  if (t.id === 'p-alat') { S.alatPilih = t.value; $('#bengkel').innerHTML = gambarAlat(); }
  if (t.dataset.deptPilih !== undefined) $('[data-dept-ketik]').hidden = t.value !== '__ketik';
  if (t.dataset.tipeSoal !== undefined) $$('[data-bagian]').forEach(el => el.hidden = el.dataset.bagian !== t.value);
  if (t.dataset.unggah) unggahGambar(t);
  if (t.dataset.urlGambar !== undefined) { const p = $('[data-pratinjau]', t.closest('.isian')); p.innerHTML = t.value ? `<img src="${esc(t.value)}" alt="">` : ik('image'); }
  if (t.dataset.filter) {
    if (t.dataset.filter === 'alat') { A.filterAlat = t.value; A.halaman.soal = 0; isiBank(); }
    if (t.dataset.filter === 'tipe') { A.filterTipe = t.value; A.halaman.soal = 0; isiBank(); }
    if (t.dataset.filter === 'crew') { A.filterCrew = t.value; A.halaman.hasil = 0; isiNilai(); }
    if (t.dataset.filter === 'alatH') { A.filterAlatH = t.value; A.halaman.hasil = 0; isiNilai(); }
  }
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && $('.modal') && !S.modalTetap) tutupModal();
  if (e.key === 'Tab' && $('.modal')) {
    const fokus = $$('a[href], button:not([disabled]), input:not([type=hidden]):not([disabled]), select:not([disabled]), textarea:not([disabled])', $('.modal')).filter(x => x.offsetParent !== null);
    if (!fokus.length) return;
    const awal = fokus[0], akhir = fokus[fokus.length - 1];
    if (e.shiftKey && document.activeElement === awal) { e.preventDefault(); akhir.focus(); }
    else if (!e.shiftKey && document.activeElement === akhir) { e.preventDefault(); awal.focus(); }
  }
});

/* ── Mulai aplikasi ── */
(async function mulai() {
  await muatMasuk();
  try {
    const lama = JSON.parse(sessionStorage.getItem(SIMPAN_KEY) || 'null');
    if (lama && lama.token && S.awal) {
      Object.assign(S, lama);
      if (S.peran === 'admin') tampilAdmin('ringkas');
      else if (S.peran === 'peserta') { S.info.lanjut = true; tampilAturan(); }
    }
  } catch (e) { hapusSesi(); }
})();
