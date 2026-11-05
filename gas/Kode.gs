/**
 * ============================================================
 * TOPGUN OPERATOR — Backend (Kode.gs)
 * Ujian operator alat berat: 25 pilihan ganda + 5 essai.
 * Database: Google Spreadsheet. Rahasia: Script Properties.
 *
 * Catatan keamanan:
 * - Fungsi berakhiran "_" tidak bisa dipanggil dari browser.
 * - Satu-satunya pintu dari browser adalah api().
 * - Kunci jawaban tidak pernah dikirim ke browser peserta.
 * ============================================================
 */

const APP_NAME = 'TOPGUN OPERATOR';
const FOLDER_NAME = 'TOPGUN_OPERATOR';
const SS_NAME = 'DB_TOPGUN_OPERATOR';
const CREW_LIST = ['A', 'B', 'C', 'STD'];
const SESI_JAM = 12;
const MAKS_ESSAI = 2000;
const MAKS_GAMBAR = 5 * 1024 * 1024;
const JEDA_SIMPAN_MS = 60000;          // draft ditulis ke Sheet paling sering tiap 60 detik per peserta
const TOLERANSI_MS = 60000;            // kelonggaran jaringan setelah waktu habis

const TABEL = {
  Pengaturan: ['Kunci', 'Nilai', 'Keterangan'],
  Departemen: ['ID', 'Nama'],
  AlatBerat: ['ID', 'Nama', 'Gambar', 'Aktif'],
  Peserta: ['ID Peserta', 'Nama', 'Departemen', 'Crew', 'Sumber'],
  Soal: ['ID', 'Alat', 'Tipe', 'Pertanyaan', 'A', 'B', 'C', 'D', 'Kunci', 'Gambar', 'Aktif'],
  Ujian: ['ID', 'ID Peserta', 'Nama', 'Departemen', 'Crew', 'Alat', 'Mulai', 'Batas', 'Selesai', 'Status',
    'Cara Selesai', 'Pelanggaran', 'Benar PG', 'Skor PG', 'Skor Essai', 'Skor Maks', 'Nilai', 'Hasil',
    'Terakhir Aktif', 'Perangkat', 'Susunan', 'Draft'],
  Jawaban: ['Ujian ID', 'ID Peserta', 'No', 'Soal ID', 'Tipe', 'Pertanyaan', 'Jawaban', 'Kunci', 'Benar', 'Skor', 'Skor Maks'],
  Pelanggaran: ['Waktu', 'Ujian ID', 'ID Peserta', 'Nama', 'Jenis', 'Dihitung']
};

const STATUS = { JALAN: 'Berlangsung', KOREKSI: 'Menunggu koreksi', SELESAI: 'Selesai', BATAL: 'Dibatalkan' };

const SETELAN_AWAL = {
  namaAplikasi: [APP_NAME, 'Nama yang tampil di aplikasi'],
  logoUrl: ['', 'Alamat gambar logo'],
  ujianDibuka: ['YA', 'YA atau TIDAK'],
  durasiMenit: [90, 'Lama ujian dalam menit'],
  jadwalMulai: ['', 'Waktu ujian dibuka (milidetik), kosong berarti tanpa jadwal'],
  jadwalSelesai: ['', 'Waktu ujian ditutup (milidetik), kosong berarti tanpa jadwal'],
  jumlahPG: [25, 'Jumlah soal pilihan ganda per ujian'],
  jumlahEssai: [5, 'Jumlah soal essai per ujian'],
  bobotPG: [2, 'Poin tiap pilihan ganda benar'],
  bobotEssai: [10, 'Poin maksimal tiap essai'],
  kkm: [70, 'Nilai minimal lulus'],
  batasPelanggaran: [3, 'Jawaban dikumpulkan otomatis setelah pelanggaran sebanyak ini, 0 berarti tidak pernah'],
  wajibLayarPenuh: ['YA', 'YA atau TIDAK']
};

const JENIS_PELANGGARAN = {
  TAB: { teks: 'Meninggalkan halaman ujian', hitung: true },
  BLUR: { teks: 'Berpindah ke jendela lain', hitung: true },
  LAYAR_PENUH: { teks: 'Keluar dari layar penuh', hitung: true },
  CETAK_LAYAR: { teks: 'Menekan tombol cetak layar', hitung: true },
  SALIN: { teks: 'Mencoba menyalin teks', hitung: false },
  TEMPEL: { teks: 'Mencoba menempel teks', hitung: false },
  PINTASAN: { teks: 'Menekan pintasan yang diblokir', hitung: false },
  MENU: { teks: 'Membuka menu klik kanan', hitung: false }
};

// ── Script Properties: satu pintu ──
const PROPS = PropertiesService.getScriptProperties();
let _PROP_MEMO = null;
function prop_(key, def) {
  if (!_PROP_MEMO) _PROP_MEMO = PROPS.getProperties();
  const v = _PROP_MEMO[key];
  return v === undefined || v === null || v === '' ? (def === undefined ? '' : def) : v;
}
function setProp_(key, val) { PROPS.setProperty(key, String(val)); if (_PROP_MEMO) _PROP_MEMO[key] = String(val); }
function setProps_(obj) { PROPS.setProperties(obj); if (_PROP_MEMO) Object.keys(obj).forEach(function (k) { _PROP_MEMO[k] = String(obj[k]); }); }
function delProp_(key) { PROPS.deleteProperty(key); if (_PROP_MEMO) delete _PROP_MEMO[key]; }

// ── Acak, hash, token ──
function acak_(n, huruf) {
  huruf = huruf || 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let s = '';
  while (s.length < n) {
    Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, Utilities.getUuid())
      .forEach(function (b) { if (s.length < n) s += huruf[(b & 0xff) % huruf.length]; });
  }
  return s;
}
function sandiAcak_(n) { const s = acak_(n || 16); return /\d/.test(s) && /[A-Za-z]/.test(s) ? s : sandiAcak_(n); }
function hashPass_(pass, salt) {
  let h = String(pass);
  for (let i = 0; i < 300; i++) h = Utilities.base64Encode(Utilities.computeHmacSha256Signature(h + salt, salt));
  return h;
}
function samaAman_(a, b) {
  a = String(a); b = String(b);
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}
function secret_() {
  let s = prop_('SESSION_SECRET');
  if (!s) { s = acak_(64); setProp_('SESSION_SECRET', s); }
  return s;
}
function hmac_(s) { return Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(s, secret_())).replace(/=+$/, ''); }
function buatToken_(p) {
  const now = Date.now();
  p.i = now; p.x = now + SESI_JAM * 3600e3;
  const body = Utilities.base64EncodeWebSafe(JSON.stringify(p)).replace(/=+$/, '');
  return body + '.' + hmac_(body);
}
function bacaToken_(t) {
  try {
    const parts = String(t || '').split('.');
    if (parts.length !== 2 || !samaAman_(hmac_(parts[0]), parts[1])) return null;
    let b = parts[0];
    while (b.length % 4) b += '=';
    const p = JSON.parse(Utilities.newBlob(Utilities.base64DecodeWebSafe(b)).getDataAsString());
    if (!p.x || p.x < Date.now()) return null;
    if (p.r === 'admin' && p.i < Number(prop_('REV_ADMIN', 0))) return null;
    return p;
  } catch (e) { return null; }
}

/** Fungsi yang boleh dijalankan pemilik saja (dari editor Apps Script). */
function hanyaPemilik_() {
  const aktif = Session.getActiveUser().getEmail();
  if (!aktif || aktif !== Session.getEffectiveUser().getEmail()) throw new Error('Hanya pemilik proyek yang boleh menjalankan fungsi ini.');
}

// ── Web app ──
function include_(nama) { return HtmlService.createHtmlOutputFromFile(nama).getContent(); }
function doGet() {
  return HtmlService.createTemplateFromFile('Index').evaluate()
    .setTitle(APP_NAME)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// ── Setup ──
function setupAppEnvironment() {
  hanyaPemilik_();
  const folders = DriveApp.getFoldersByName(FOLDER_NAME);
  const root = folders.hasNext() ? folders.next() : DriveApp.createFolder(FOLDER_NAME);
  const subs = root.getFoldersByName('Gambar');
  const gambar = subs.hasNext() ? subs.next() : root.createFolder('Gambar');

  let ss;
  const files = root.getFilesByName(SS_NAME);
  if (files.hasNext()) ss = SpreadsheetApp.open(files.next());
  else {
    ss = SpreadsheetApp.create(SS_NAME);
    DriveApp.getFileById(ss.getId()).moveTo(root);
  }
  setProps_({ SPREADSHEET_ID: ss.getId(), DRIVE_ROOT_FOLDER_ID: root.getId(), FOLDER_GAMBAR: gambar.getId() });

  Object.keys(TABEL).forEach(function (nama) {
    let sh = ss.getSheetByName(nama);
    if (!sh) sh = ss.insertSheet(nama);
    if (sh.getLastRow() === 0) {
      sh.getRange(1, 1, 1, TABEL[nama].length).setValues([TABEL[nama]])
        .setFontWeight('bold').setBackground('#18A8E0').setFontColor('#06283A');
      sh.setFrozenRows(1);
    }
  });
  // Lembar kosong bawaan Google (namanya tergantung bahasa akun) tidak dipakai.
  ss.getSheets().forEach(function (x) {
    if (!TABEL[x.getName()] && x.getLastRow() === 0) ss.deleteSheet(x);
  });

  const adaSetelan = bacaTabel_('Pengaturan').map(function (r) { return r.Kunci; });
  const barisSetelan = Object.keys(SETELAN_AWAL)
    .filter(function (k) { return adaSetelan.indexOf(k) < 0; })
    .map(function (k) { return { Kunci: k, Nilai: SETELAN_AWAL[k][0], Keterangan: SETELAN_AWAL[k][1] }; });
  tambahBaris_('Pengaturan', barisSetelan);

  if (!bacaTabel_('Departemen').length) {
    tambahBaris_('Departemen', ['Produksi', 'Maintenance'].map(function (n) { return { ID: Utilities.getUuid(), Nama: n }; }));
  }
  if (!bacaTabel_('AlatBerat').length) {
    tambahBaris_('AlatBerat', [{ ID: Utilities.getUuid(), Nama: 'Excavator', Gambar: '', Aktif: 'YA' }]);
  }
  if (!bacaTabel_('Soal').length) {
    tambahBaris_('Soal', [
      { ID: Utilities.getUuid(), Alat: 'Excavator', Tipe: 'PG', Pertanyaan: 'Contoh soal, silakan ubah: pemeriksaan harian sebelum mesin dinyalakan disebut?',
        A: 'Walk around check', B: 'Overhaul', C: 'Top overhaul', D: 'Commissioning', Kunci: 'A', Gambar: '', Aktif: 'YA' },
      { ID: Utilities.getUuid(), Alat: 'Excavator', Tipe: 'ESAI', Pertanyaan: 'Contoh soal, silakan ubah: jelaskan langkah aman memarkir excavator di akhir shift.',
        A: '', B: '', C: '', D: '', Kunci: 'Permukaan rata, bucket di tanah, kunci kontrol, mesin idle sebelum dimatikan.', Gambar: '', Aktif: 'YA' }
    ]);
  }

  secret_();
  if (!prop_('ADMIN_PASS_HASH')) {
    const sandi = sandiAcak_(16), salt = Utilities.getUuid();
    setProps_({ ADMIN_USER: 'admin', ADMIN_SALT: salt, ADMIN_PASS_HASH: hashPass_(sandi, salt), ADMIN_WAJIB_GANTI: 'YA' });
    Logger.log('AKUN ADMIN (catat sekarang, hanya tampil sekali, wajib diganti saat masuk pertama)');
    Logger.log('Nama pengguna : admin');
    Logger.log('Kata sandi    : ' + sandi);
  }
  Logger.log('Spreadsheet: ' + ss.getUrl());
  Logger.log('Folder: ' + root.getUrl());
  Logger.log('Setup selesai. Lanjutkan dengan Deploy > New deployment > Web app.');
}

/** Jalankan dari editor bila sandi admin hilang. */
function resetSandiAdmin() {
  hanyaPemilik_();
  const p = sandiAcak_(16), salt = Utilities.getUuid();
  setProps_({ ADMIN_USER: 'admin', ADMIN_SALT: salt, ADMIN_PASS_HASH: hashPass_(p, salt), ADMIN_WAJIB_GANTI: 'YA', REV_ADMIN: Date.now() });
  delProp_('ADMIN_KUNCI_SAMPAI');
  Logger.log('Sandi admin baru: ' + p);
}

// ── Sheet helpers (baca dan tulis secara batch) ──
function ss_() {
  const id = prop_('SPREADSHEET_ID');
  if (!id) throw new Error('Aplikasi belum disiapkan. Jalankan setupAppEnvironment() dari editor Apps Script.');
  return SpreadsheetApp.openById(id);
}
function sh_(nama) {
  const sh = ss_().getSheetByName(nama);
  if (!sh) throw new Error('Sheet "' + nama + '" tidak ditemukan. Jalankan ulang setupAppEnvironment().');
  return sh;
}
/** Cegah injeksi rumus dan hilangnya nol di depan (ID 00123). */
function aman_(v) {
  if (typeof v !== 'string') return v;
  return /^[=+\-@\d\t\r]/.test(v) ? "'" + v : v;
}
function bacaTabel_(nama) {
  const nilai = sh_(nama).getDataRange().getValues();
  const kolom = TABEL[nama];
  const hasil = [];
  for (let i = 1; i < nilai.length; i++) {
    if (nilai[i].every(function (x) { return x === ''; })) continue;
    const o = { _baris: i + 1 };
    kolom.forEach(function (k, j) { o[k] = nilai[i][j] === undefined ? '' : nilai[i][j]; });
    hasil.push(o);
  }
  return hasil;
}
function tambahBaris_(nama, daftar) {
  if (!daftar.length) return;
  const sh = sh_(nama), kolom = TABEL[nama];
  const data = daftar.map(function (o) { return kolom.map(function (k) { return aman_(o[k] === undefined ? '' : o[k]); }); });
  sh.getRange(sh.getLastRow() + 1, 1, data.length, kolom.length).setValues(data);
}
function ubahBaris_(nama, baris, patch) {
  const sh = sh_(nama), kolom = TABEL[nama];
  const rng = sh.getRange(baris, 1, 1, kolom.length);
  const row = rng.getValues()[0];
  Object.keys(patch).forEach(function (k) {
    const j = kolom.indexOf(k);
    if (j >= 0) row[j] = aman_(patch[k]);
  });
  // Nilai lama yang tidak diubah tetap perlu dijaga agar teks berawalan angka tidak berubah tipe.
  rng.setValues([row.map(function (v) { return typeof v === 'string' && v.charAt(0) !== "'" ? aman_(v) : v; })]);
}
function kunci_(fn) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(25000)) throw new Error('Server sedang sibuk. Coba lagi beberapa detik lagi.');
  try { return fn(); } finally { lock.releaseLock(); }
}
function acakUrut_(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const b = Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, Utilities.getUuid());
    const j = ((b[0] & 0xff) * 256 + (b[1] & 0xff)) % (i + 1);
    const t = a[i]; a[i] = a[j]; a[j] = t;
  }
  return a;
}
function teks_(v, maks) { return String(v === null || v === undefined ? '' : v).trim().slice(0, maks || 200); }

// ── Pengaturan ──
function setelan_() {
  const c = CacheService.getScriptCache();
  const memo = c.get('setelan');
  if (memo) return JSON.parse(memo);
  const s = {};
  Object.keys(SETELAN_AWAL).forEach(function (k) { s[k] = SETELAN_AWAL[k][0]; });
  bacaTabel_('Pengaturan').forEach(function (r) { s[r.Kunci] = r.Nilai; });
  ['durasiMenit', 'jumlahPG', 'jumlahEssai', 'bobotPG', 'bobotEssai', 'kkm', 'batasPelanggaran'].forEach(function (k) { s[k] = Number(s[k]) || 0; });
  c.put('setelan', JSON.stringify(s), 300);
  return s;
}
function statusBuka_(s) {
  const now = Date.now();
  if (String(s.ujianDibuka) !== 'YA') return { buka: false, pesan: 'Ujian sedang ditutup oleh admin.' };
  const m = Number(s.jadwalMulai) || 0, a = Number(s.jadwalSelesai) || 0;
  if (m && now < m) return { buka: false, pesan: 'Ujian belum dibuka.', mulai: m };
  if (a && now > a) return { buka: false, pesan: 'Jadwal ujian sudah berakhir.' };
  return { buka: true, pesan: '' };
}

// ── Pintu tunggal dari browser ──
const RUTE = {
  'publik.awal': { peran: 'publik', fn: apiAwal_ },
  'peserta.cek': { peran: 'publik', fn: apiPesertaCek_ },
  'peserta.masuk': { peran: 'publik', fn: apiPesertaMasuk_ },
  'admin.masuk': { peran: 'publik', fn: apiAdminMasuk_ },

  'ujian.mulai': { peran: 'peserta', fn: apiUjianMulai_ },
  'ujian.simpan': { peran: 'peserta', fn: apiUjianSimpan_ },
  'ujian.langgar': { peran: 'peserta', fn: apiUjianLanggar_ },
  'ujian.kumpul': { peran: 'peserta', fn: apiUjianKumpul_ },

  'admin.sandi': { peran: 'admin', fn: apiAdminSandi_ },
  'admin.ringkas': { peran: 'admin', fn: apiRingkas_ },
  'setelan.ambil': { peran: 'admin', fn: apiSetelanAmbil_ },
  'setelan.simpan': { peran: 'admin', fn: apiSetelanSimpan_ },
  'gambar.unggah': { peran: 'admin', fn: apiGambarUnggah_ },
  'dept.list': { peran: 'admin', fn: apiDeptList_ },
  'dept.simpan': { peran: 'admin', fn: apiDeptSimpan_ },
  'dept.hapus': { peran: 'admin', fn: apiDeptHapus_ },
  'alat.list': { peran: 'admin', fn: apiAlatList_ },
  'alat.simpan': { peran: 'admin', fn: apiAlatSimpan_ },
  'alat.hapus': { peran: 'admin', fn: apiAlatHapus_ },
  'pesertaAdm.list': { peran: 'admin', fn: apiPesertaList_ },
  'pesertaAdm.simpan': { peran: 'admin', fn: apiPesertaSimpan_ },
  'pesertaAdm.hapus': { peran: 'admin', fn: apiPesertaHapus_ },
  'soal.list': { peran: 'admin', fn: apiSoalList_ },
  'soal.simpan': { peran: 'admin', fn: apiSoalSimpan_ },
  'soal.hapus': { peran: 'admin', fn: apiSoalHapus_ },
  'hasil.list': { peran: 'admin', fn: apiHasilList_ },
  'hasil.detail': { peran: 'admin', fn: apiHasilDetail_ },
  'hasil.nilai': { peran: 'admin', fn: apiHasilNilai_ },
  'hasil.batal': { peran: 'admin', fn: apiHasilBatal_ }
};

/** Hasil berupa string JSON agar Date aman dilewatkan google.script.run. */
function api(aksi, token, data) {
  let res;
  try {
    const r = RUTE[aksi];
    if (!r) throw new Error('Permintaan tidak dikenal.');
    let sesi = null;
    if (r.peran !== 'publik') {
      sesi = bacaToken_(token);
      if (!sesi || sesi.r !== r.peran) res = { success: false, code: 'SESI', message: 'Sesi berakhir. Silakan masuk lagi.' };
    }
    if (!res) res = { success: true, data: r.fn(data || {}, sesi), message: '' };
  } catch (e) {
    if (e && e.kode) res = { success: false, code: e.kode, message: e.message };
    else res = { success: false, message: e && e.message ? e.message : 'Terjadi kesalahan di server.' };
  }
  return JSON.stringify(res);
}
function galat_(pesan, kode) { const e = new Error(pesan); e.kode = kode || 'GAGAL'; return e; }

// ── Publik ──
function apiAwal_() {
  const s = setelan_();
  const b = statusBuka_(s);
  return {
    app: s.namaAplikasi || APP_NAME,
    logo: s.logoUrl || '',
    crew: CREW_LIST,
    departemen: bacaTabel_('Departemen').map(function (r) { return String(r.Nama); }),
    alat: bacaTabel_('AlatBerat').filter(function (r) { return r.Aktif !== 'TIDAK'; })
      .map(function (r) { return { nama: String(r.Nama), gambar: String(r.Gambar) }; }),
    butuhKode: !!prop_('KODE_UJIAN'),
    buka: b.buka, pesanBuka: b.pesan, mulaiPada: b.mulai || 0,
    durasi: s.durasiMenit, jumlahPG: s.jumlahPG, jumlahEssai: s.jumlahEssai
  };
}
function cariPeserta_(id) {
  id = teks_(id, 40);
  return bacaTabel_('Peserta').filter(function (r) { return String(r['ID Peserta']).trim() === id; })[0] || null;
}
function apiPesertaCek_(d) {
  const p = cariPeserta_(d.id);
  return p ? { ada: true, nama: String(p.Nama), departemen: String(p.Departemen), crew: String(p.Crew), terkunci: p.Sumber !== 'Ketik sendiri' } : { ada: false };
}
function soalAlat_(alat) {
  const c = CacheService.getScriptCache(), k = 'soal_' + Utilities.base64EncodeWebSafe(alat);
  const memo = c.get(k);
  if (memo) return JSON.parse(memo);
  const rows = bacaTabel_('Soal').filter(function (r) { return String(r.Alat) === alat && r.Aktif !== 'TIDAK' && r.Pertanyaan; });
  try { c.put(k, JSON.stringify(rows), 120); } catch (e) { /* terlalu besar untuk cache, tidak masalah */ }
  return rows;
}
function hapusCacheSoal_(alat) { CacheService.getScriptCache().remove('soal_' + Utilities.base64EncodeWebSafe(alat)); }

function apiPesertaMasuk_(d) {
  const s = setelan_();
  const b = statusBuka_(s);
  if (!b.buka) throw new Error(b.pesan);
  const kode = prop_('KODE_UJIAN');
  if (kode && !samaAman_(teks_(d.kode, 40).toUpperCase(), String(kode).toUpperCase())) throw new Error('Kode ujian salah. Minta kode yang benar ke pengawas.');

  const id = teks_(d.id, 40);
  if (!id) throw new Error('Isi nomor ID Anda.');
  const terdaftar = cariPeserta_(id);
  const pakaiData = terdaftar && terdaftar.Sumber !== 'Ketik sendiri';
  const nama = pakaiData ? String(terdaftar.Nama) : teks_(d.nama, 80);
  const dept = pakaiData ? String(terdaftar.Departemen) : teks_(d.departemen, 80);
  const crew = pakaiData ? String(terdaftar.Crew) : teks_(d.crew, 5);
  if (!nama) throw new Error('Isi nama Anda.');
  if (!dept) throw new Error('Pilih atau ketik departemen Anda.');
  if (CREW_LIST.indexOf(crew) < 0) throw new Error('Pilih crew A, B, C, atau STD.');

  const alat = teks_(d.alat, 80);
  const adaAlat = bacaTabel_('AlatBerat').some(function (r) { return String(r.Nama) === alat && r.Aktif !== 'TIDAK'; });
  if (!adaAlat) throw new Error('Pilih alat berat yang diujikan.');

  const lama = cariUjianPeserta_(id, alat);
  if (lama && lama.Status !== STATUS.JALAN) throw new Error('ID ' + id + ' sudah mengerjakan ujian ' + alat + '. Hubungi admin bila perlu mengulang.');
  if (!lama) cekBankSoal_(alat, s);

  return {
    token: buatToken_({ r: 'peserta', id: id, n: nama, dp: dept, cr: crew, al: alat }),
    peserta: { id: id, nama: nama, departemen: dept, crew: crew, alat: alat },
    lanjut: !!lama,
    durasi: s.durasiMenit, jumlahPG: s.jumlahPG, jumlahEssai: s.jumlahEssai,
    batas: s.batasPelanggaran, layarPenuh: String(s.wajibLayarPenuh) === 'YA'
  };
}
function cekBankSoal_(alat, s) {
  const rows = soalAlat_(alat);
  const pg = rows.filter(function (r) { return r.Tipe === 'PG'; }).length;
  const es = rows.filter(function (r) { return r.Tipe === 'ESAI'; }).length;
  if (pg < s.jumlahPG || es < s.jumlahEssai) {
    throw new Error('Soal ' + alat + ' belum lengkap (' + pg + ' dari ' + s.jumlahPG + ' pilihan ganda, ' + es + ' dari ' + s.jumlahEssai + ' essai). Hubungi admin.');
  }
  return rows;
}
function cariUjianPeserta_(id, alat) {
  const rows = bacaTabel_('Ujian').filter(function (r) {
    return String(r['ID Peserta']).trim() === id && String(r.Alat) === alat && r.Status !== STATUS.BATAL;
  });
  return rows.length ? rows[rows.length - 1] : null;
}

// ── Admin: masuk ──
function apiAdminMasuk_(d) {
  const c = CacheService.getScriptCache(), kunciSampai = Number(prop_('ADMIN_KUNCI_SAMPAI', 0));
  if (kunciSampai > Date.now()) throw new Error('Terlalu banyak percobaan. Coba lagi ' + Math.ceil((kunciSampai - Date.now()) / 60000) + ' menit lagi.');
  const user = prop_('ADMIN_USER'), hash = prop_('ADMIN_PASS_HASH'), salt = prop_('ADMIN_SALT');
  if (!user || !hash || !salt) throw new Error('Aplikasi belum disiapkan. Jalankan setupAppEnvironment() dari editor Apps Script.');
  const benar = samaAman_(teks_(d.username, 60), user) && samaAman_(hashPass_(String(d.password || ''), salt), hash);
  if (!benar) {
    const n = Number(c.get('admin_gagal') || 0) + 1;
    c.put('admin_gagal', String(n), 900);
    if (n >= 5) { setProp_('ADMIN_KUNCI_SAMPAI', String(Date.now() + 15 * 60000)); c.remove('admin_gagal'); }
    Utilities.sleep(500);
    throw new Error('Nama pengguna atau kata sandi salah.' + (n >= 3 && n < 5 ? ' Sisa percobaan: ' + (5 - n) + '.' : ''));
  }
  c.remove('admin_gagal');
  return { token: buatToken_({ r: 'admin', n: user }), wajibGanti: prop_('ADMIN_WAJIB_GANTI') === 'YA' };
}
function apiAdminSandi_(d) {
  const salt = prop_('ADMIN_SALT');
  if (!samaAman_(hashPass_(String(d.lama || ''), salt), prop_('ADMIN_PASS_HASH'))) throw new Error('Kata sandi lama salah.');
  const baru = String(d.baru || '');
  if (baru.length < 10 || !/[A-Za-z]/.test(baru) || !/\d/.test(baru)) throw new Error('Kata sandi baru minimal 10 karakter dan berisi huruf serta angka.');
  const garam = Utilities.getUuid();
  setProps_({ ADMIN_SALT: garam, ADMIN_PASS_HASH: hashPass_(baru, garam), ADMIN_WAJIB_GANTI: 'TIDAK', REV_ADMIN: Date.now() - 1000 });
  return { token: buatToken_({ r: 'admin', n: prop_('ADMIN_USER') }) };
}

// ── Ujian peserta ──
function ujianDariSesi_(sesi) {
  const u = cariUjianPeserta_(sesi.id, sesi.al);
  if (!u) throw galat_('Ujian tidak ditemukan. Silakan masuk lagi.', 'SESI');
  return u;
}
function ujianCepat_(sesi, ujianId) {
  // Cari baris lewat cache agar tidak membaca seluruh sheet tiap autosave.
  const c = CacheService.getScriptCache(), k = 'baris_' + ujianId;
  const baris = Number(c.get(k) || 0);
  if (baris) {
    const kolom = TABEL.Ujian;
    const row = sh_('Ujian').getRange(baris, 1, 1, kolom.length).getValues()[0];
    if (String(row[0]) === String(ujianId)) {
      const o = { _baris: baris };
      kolom.forEach(function (n, j) { o[n] = row[j]; });
      return o;
    }
  }
  const u = bacaTabel_('Ujian').filter(function (r) { return String(r.ID) === String(ujianId); })[0];
  if (!u || String(u['ID Peserta']).trim() !== sesi.id) throw galat_('Ujian tidak ditemukan. Silakan masuk lagi.', 'SESI');
  c.put(k, String(u._baris), 21600);
  return u;
}
function batasMs_(u) { return new Date(u.Batas).getTime(); }

function apiUjianMulai_(d, sesi) {
  const hasil = kunci_(function () {
    const s = setelan_();
    let u = cariUjianPeserta_(sesi.id, sesi.al);
    const perangkat = acak_(16);
    let dilanjutkan = false;

    if (u && u.Status !== STATUS.JALAN) throw galat_('Ujian ini sudah dikumpulkan.', 'SELESAI');
    if (u && Date.now() > batasMs_(u)) {
      selesaikan_(u, draftTerbaru_(u), 'Waktu habis');
      throw galat_('Waktu ujian sudah habis. Jawaban terakhir Anda sudah dikumpulkan.', 'SELESAI');
    }
    if (u) {
      dilanjutkan = true;
      if (String(u.Perangkat) && d.perangkat !== String(u.Perangkat)) catatPelanggaran_(u, 'Masuk dari perangkat atau tab lain', false);
      ubahBaris_('Ujian', u._baris, { Perangkat: perangkat, 'Terakhir Aktif': new Date() });
    } else {
      const b = statusBuka_(s);
      if (!b.buka) throw new Error(b.pesan);
      const rows = cekBankSoal_(sesi.al, s);
      const pg = acakUrut_(rows.filter(function (r) { return r.Tipe === 'PG'; })).slice(0, s.jumlahPG);
      const es = acakUrut_(rows.filter(function (r) { return r.Tipe === 'ESAI'; })).slice(0, s.jumlahEssai);
      const susunan = pg.concat(es).map(function (r) {
        return { id: r.ID, o: r.Tipe === 'PG' ? acakUrut_(['A', 'B', 'C', 'D'].filter(function (k) { return r[k] !== ''; })).join('') : '' };
      });
      const now = new Date();
      const akhir = Math.min(now.getTime() + s.durasiMenit * 60000, Number(s.jadwalSelesai) || Infinity);
      const baru = {
        ID: Utilities.getUuid(), 'ID Peserta': sesi.id, Nama: sesi.n, Departemen: sesi.dp, Crew: sesi.cr, Alat: sesi.al,
        Mulai: now, Batas: new Date(akhir), Status: STATUS.JALAN, Pelanggaran: 0,
        Susunan: JSON.stringify(susunan), Draft: '{}', 'Terakhir Aktif': now, Perangkat: perangkat
      };
      tambahBaris_('Ujian', [baru]);
      if (!cariPeserta_(sesi.id)) {
        tambahBaris_('Peserta', [{ 'ID Peserta': sesi.id, Nama: sesi.n, Departemen: sesi.dp, Crew: sesi.cr, Sumber: 'Ketik sendiri' }]);
      }
      u = bacaTabel_('Ujian').filter(function (r) { return r.ID === baru.ID; })[0];
    }
    return { u: u, perangkat: perangkat, dilanjutkan: dilanjutkan, s: s };
  });

  const u = hasil.u, peta = {};
  bacaSoalById_(JSON.parse(u.Susunan)).forEach(function (r) { peta[r.ID] = r; });
  const soal = [];
  JSON.parse(u.Susunan).forEach(function (x, i) {
    const r = peta[x.id];
    if (!r) return;
    soal.push({
      no: i + 1, id: x.id, tipe: r.Tipe, teks: String(r.Pertanyaan), gambar: String(r.Gambar),
      opsi: r.Tipe === 'PG' ? x.o.split('').map(function (k) { return { k: k, t: String(r[k]) }; }) : []
    });
  });
  return {
    ujianId: u.ID, perangkat: hasil.perangkat, dilanjutkan: hasil.dilanjutkan,
    sisaMs: batasMs_(u) - Date.now(),
    pelanggaran: Number(u.Pelanggaran) || 0, batas: hasil.s.batasPelanggaran,
    layarPenuh: String(hasil.s.wajibLayarPenuh) === 'YA',
    durasiMs: batasMs_(u) - new Date(u.Mulai).getTime(),
    soal: soal, draft: draftTerbaru_(u), maksEssai: MAKS_ESSAI
  };
}
function bacaSoalById_(susunan) {
  const ids = {};
  susunan.forEach(function (x) { ids[x.id] = 1; });
  return bacaTabel_('Soal').filter(function (r) { return ids[r.ID]; });
}
function draftTerbaru_(u) {
  const memo = CacheService.getScriptCache().get('draft_' + u.ID);
  try { return JSON.parse(memo || u.Draft || '{}'); } catch (e) { return {}; }
}
function bersihkanDraft_(u, jawaban) {
  const izin = {}, out = {};
  JSON.parse(u.Susunan).forEach(function (x) { izin[x.id] = 1; });
  Object.keys(jawaban || {}).forEach(function (k) { if (izin[k]) out[k] = String(jawaban[k]).slice(0, MAKS_ESSAI); });
  return out;
}
function cekPerangkat_(u, perangkat) {
  if (String(u.Perangkat) !== String(perangkat)) throw galat_('Ujian ini sedang dibuka di perangkat atau tab lain. Halaman ini dihentikan.', 'PINDAH');
}
function apiUjianSimpan_(d, sesi) {
  const u = ujianCepat_(sesi, d.ujianId);
  if (u.Status === STATUS.BATAL) throw galat_('Ujian Anda dibatalkan oleh admin. Hubungi pengawas.', 'SELESAI');
  if (u.Status !== STATUS.JALAN) throw galat_('Ujian ini sudah dikumpulkan.', 'SELESAI');
  cekPerangkat_(u, d.perangkat);

  const c = CacheService.getScriptCache();
  const now = Date.now(), lewat = now > batasMs_(u) + TOLERANSI_MS;
  // Jawaban yang tiba setelah batas waktu tidak diterima.
  const draft = lewat ? draftTerbaru_(u) : bersihkanDraft_(u, d.jawaban);
  if (lewat) {
    kunci_(function () { selesaikan_(u, draft, 'Waktu habis'); });
    throw galat_('Waktu ujian sudah habis. Jawaban terakhir Anda sudah dikumpulkan.', 'SELESAI');
  }
  const teksDraft = JSON.stringify(draft);
  c.put('draft_' + u.ID, teksDraft, 21600);
  if (now - new Date(u['Terakhir Aktif']).getTime() > JEDA_SIMPAN_MS) {
    const sh = sh_('Ujian'), kol = TABEL.Ujian;
    sh.getRange(u._baris, kol.indexOf('Terakhir Aktif') + 1).setValue(new Date());
    sh.getRange(u._baris, kol.indexOf('Draft') + 1).setValue(aman_(teksDraft));
  }
  return { sisaMs: batasMs_(u) - now, pelanggaran: Number(u.Pelanggaran) || 0 };
}
function catatPelanggaran_(u, teks, dihitung) {
  tambahBaris_('Pelanggaran', [{ Waktu: new Date(), 'Ujian ID': u.ID, 'ID Peserta': u['ID Peserta'], Nama: u.Nama, Jenis: teks, Dihitung: dihitung ? 'YA' : 'TIDAK' }]);
}
function apiUjianLanggar_(d, sesi) {
  const jenis = JENIS_PELANGGARAN[d.jenis];
  if (!jenis) throw new Error('Jenis pelanggaran tidak dikenal.');
  return kunci_(function () {
    const u = ujianCepat_(sesi, d.ujianId);
    if (u.Status !== STATUS.JALAN) throw galat_('Ujian ini sudah dikumpulkan.', 'SELESAI');
    cekPerangkat_(u, d.perangkat);
    const s = setelan_();
    catatPelanggaran_(u, jenis.teks, jenis.hitung);
    let n = Number(u.Pelanggaran) || 0;
    if (!jenis.hitung) return { pelanggaran: n, batas: s.batasPelanggaran, selesai: false };

    n += 1;
    ubahBaris_('Ujian', u._baris, { Pelanggaran: n });
    u.Pelanggaran = n;
    if (s.batasPelanggaran > 0 && n >= s.batasPelanggaran) {
      selesaikan_(u, Object.assign(draftTerbaru_(u), bersihkanDraft_(u, d.jawaban)), 'Melebihi batas pelanggaran');
      return { pelanggaran: n, batas: s.batasPelanggaran, selesai: true };
    }
    return { pelanggaran: n, batas: s.batasPelanggaran, selesai: false };
  });
}
function apiUjianKumpul_(d, sesi) {
  return kunci_(function () {
    const u = ujianCepat_(sesi, d.ujianId);
    if (u.Status === STATUS.BATAL) throw galat_('Ujian Anda dibatalkan oleh admin. Hubungi pengawas.', 'SELESAI');
    if (u.Status !== STATUS.JALAN) return { sudah: true };
    cekPerangkat_(u, d.perangkat);
    const lewat = Date.now() > batasMs_(u) + TOLERANSI_MS;
    const jawaban = lewat ? draftTerbaru_(u) : bersihkanDraft_(u, d.jawaban);
    selesaikan_(u, jawaban, lewat || d.otomatis ? 'Waktu habis' : 'Dikumpulkan peserta');
    const total = JSON.parse(u.Susunan).length;
    const terisi = Object.keys(jawaban).filter(function (k) { return String(jawaban[k]).trim(); }).length;
    return { total: total, terjawab: terisi };
  });
}
/** Harus dipanggil di dalam kunci_(). Menilai PG dan menulis baris Jawaban. */
function selesaikan_(u, jawaban, cara) {
  const s = setelan_();
  const susunan = JSON.parse(u.Susunan), peta = {};
  bacaSoalById_(susunan).forEach(function (r) { peta[r.ID] = r; });
  let benar = 0, nPG = 0, nE = 0;
  const baris = [];
  susunan.forEach(function (x, i) {
    const r = peta[x.id];
    const tipe = r ? r.Tipe : (x.o ? 'PG' : 'ESAI');
    const isi = String((jawaban || {})[x.id] || '').trim();
    if (tipe === 'PG') {
      nPG++;
      const ok = !!r && isi && isi === String(r.Kunci).trim();
      if (ok) benar++;
      baris.push({ 'Ujian ID': u.ID, 'ID Peserta': u['ID Peserta'], No: i + 1, 'Soal ID': x.id, Tipe: 'PG',
        Pertanyaan: r ? r.Pertanyaan : '(soal sudah dihapus)', Jawaban: isi && r ? isi + '. ' + r[isi] : '',
        Kunci: r ? r.Kunci + '. ' + r[r.Kunci] : '', Benar: ok ? 'YA' : 'TIDAK', Skor: ok ? s.bobotPG : 0, 'Skor Maks': s.bobotPG });
    } else {
      nE++;
      baris.push({ 'Ujian ID': u.ID, 'ID Peserta': u['ID Peserta'], No: i + 1, 'Soal ID': x.id, Tipe: 'ESAI',
        Pertanyaan: r ? r.Pertanyaan : '(soal sudah dihapus)', Jawaban: isi, Kunci: r ? r.Kunci : '', Benar: '', Skor: '', 'Skor Maks': s.bobotEssai });
    }
  });
  tambahBaris_('Jawaban', baris);
  const skorPG = benar * s.bobotPG, maks = nPG * s.bobotPG + nE * s.bobotEssai;
  const patch = {
    Selesai: new Date(), 'Cara Selesai': cara, 'Benar PG': benar, 'Skor PG': skorPG, 'Skor Essai': nE ? '' : 0,
    'Skor Maks': maks, Status: nE ? STATUS.KOREKSI : STATUS.SELESAI, Draft: ''
  };
  if (!nE) {
    patch.Nilai = maks ? Math.round(skorPG / maks * 1000) / 10 : 0;
    patch.Hasil = patch.Nilai >= s.kkm ? 'Lulus' : 'Tidak lulus';
  }
  ubahBaris_('Ujian', u._baris, patch);
  CacheService.getScriptCache().remove('draft_' + u.ID);
}
/** Ujian yang ditinggalkan sampai waktu habis dikumpulkan saat admin membuka hasil. */
function sapuKedaluwarsa_(rows) {
  const lewat = rows.filter(function (u) { return u.Status === STATUS.JALAN && Date.now() > batasMs_(u) + TOLERANSI_MS; });
  if (!lewat.length) return false;
  kunci_(function () { lewat.forEach(function (u) { selesaikan_(u, draftTerbaru_(u), 'Waktu habis'); }); });
  return true;
}

// ── Admin: pengaturan ──
function apiSetelanAmbil_() {
  const s = setelan_();
  s.kodeUjian = prop_('KODE_UJIAN');
  s.spreadsheetUrl = ss_().getUrl();
  s.jadwalMulai = Number(s.jadwalMulai) || 0;
  s.jadwalSelesai = Number(s.jadwalSelesai) || 0;
  return s;
}
function apiSetelanSimpan_(d) {
  return kunci_(function () {
    const angka = { durasiMenit: [1, 600], jumlahPG: [0, 200], jumlahEssai: [0, 50], bobotPG: [0, 100], bobotEssai: [0, 100], kkm: [0, 100], batasPelanggaran: [0, 50] };
    const bebas = ['namaAplikasi', 'logoUrl', 'ujianDibuka', 'wajibLayarPenuh', 'jadwalMulai', 'jadwalSelesai'];
    const v = {};
    Object.keys(angka).forEach(function (k) {
      if (d[k] === undefined) return;
      const n = Number(d[k]);
      if (isNaN(n) || n < angka[k][0] || n > angka[k][1]) throw new Error('Nilai ' + k + ' harus antara ' + angka[k][0] + ' dan ' + angka[k][1] + '.');
      v[k] = n;
    });
    if (d.jumlahPG !== undefined && Number(d.jumlahPG) + Number(d.jumlahEssai) < 1) throw new Error('Ujian harus punya minimal satu soal.');
    bebas.forEach(function (k) { if (d[k] !== undefined) v[k] = teks_(d[k], 500); });
    if (v.logoUrl) v.logoUrl = urlGambar_(v.logoUrl);
    if (v.jadwalMulai && v.jadwalSelesai && Number(v.jadwalMulai) >= Number(v.jadwalSelesai)) throw new Error('Jadwal selesai harus setelah jadwal mulai.');

    const rows = bacaTabel_('Pengaturan'), ada = {};
    rows.forEach(function (r) { ada[r.Kunci] = r._baris; });
    Object.keys(v).forEach(function (k) {
      if (ada[k]) ubahBaris_('Pengaturan', ada[k], { Nilai: v[k] });
      else tambahBaris_('Pengaturan', [{ Kunci: k, Nilai: v[k], Keterangan: SETELAN_AWAL[k] ? SETELAN_AWAL[k][1] : '' }]);
    });
    if (d.kodeUjian !== undefined) {
      const kode = teks_(d.kodeUjian, 40);
      if (kode) setProp_('KODE_UJIAN', kode); else delProp_('KODE_UJIAN');
    }
    CacheService.getScriptCache().remove('setelan');
    return { tersimpan: true };
  });
}
function urlGambar_(u) {
  u = teks_(u, 500);
  if (!u) return '';
  if (!/^https:\/\//i.test(u)) throw new Error('Alamat gambar harus diawali https://');
  const m = u.match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?(?:export=\w+&)?id=)([\w-]{10,})/);
  return m ? 'https://drive.google.com/thumbnail?id=' + m[1] + '&sz=w1200' : u;
}
function apiGambarUnggah_(d) {
  const m = String(d.dataUrl || '').match(/^data:(image\/(?:png|jpeg|webp|gif));base64,(.+)$/);
  if (!m) throw new Error('Pilih gambar berformat PNG, JPG, WEBP, atau GIF.');
  if (m[2].length * 0.75 > MAKS_GAMBAR) throw new Error('Ukuran gambar melebihi 5 MB.');
  const blob = Utilities.newBlob(Utilities.base64Decode(m[2]), m[1], teks_(d.nama, 80).replace(/[^\w.\- ]/g, '') || 'gambar');
  const f = DriveApp.getFolderById(prop_('FOLDER_GAMBAR')).createFile(blob);
  f.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return { url: 'https://drive.google.com/thumbnail?id=' + f.getId() + '&sz=w1200' };
}

// ── Admin: departemen ──
function apiDeptList_() { return bacaTabel_('Departemen').map(function (r) { return { id: r.ID, nama: String(r.Nama) }; }); }
function apiDeptSimpan_(d) {
  return kunci_(function () {
    const nama = teks_(d.nama, 80);
    if (!nama) throw new Error('Isi nama departemen.');
    const rows = bacaTabel_('Departemen');
    if (rows.some(function (r) { return String(r.Nama).toLowerCase() === nama.toLowerCase() && r.ID !== d.id; })) throw new Error('Departemen ' + nama + ' sudah ada.');
    const lama = rows.filter(function (r) { return r.ID === d.id; })[0];
    if (lama) ubahBaris_('Departemen', lama._baris, { Nama: nama });
    else tambahBaris_('Departemen', [{ ID: Utilities.getUuid(), Nama: nama }]);
    return { tersimpan: true };
  });
}
function hapusBaris_(tabel, kolomId, id) {
  const r = bacaTabel_(tabel).filter(function (x) { return String(x[kolomId]) === String(id); })[0];
  if (!r) throw new Error('Data tidak ditemukan. Muat ulang halaman.');
  sh_(tabel).deleteRow(r._baris);
  return r;
}
function apiDeptHapus_(d) { return kunci_(function () { hapusBaris_('Departemen', 'ID', d.id); return { terhapus: true }; }); }

// ── Admin: alat berat ──
function apiAlatList_() {
  const s = setelan_();
  const soal = bacaTabel_('Soal').filter(function (r) { return r.Aktif !== 'TIDAK'; });
  return bacaTabel_('AlatBerat').map(function (r) {
    const milik = soal.filter(function (x) { return String(x.Alat) === String(r.Nama); });
    return {
      id: r.ID, nama: String(r.Nama), gambar: String(r.Gambar), aktif: r.Aktif !== 'TIDAK',
      pg: milik.filter(function (x) { return x.Tipe === 'PG'; }).length,
      essai: milik.filter(function (x) { return x.Tipe === 'ESAI'; }).length,
      perluPG: s.jumlahPG, perluEssai: s.jumlahEssai
    };
  });
}
function apiAlatSimpan_(d) {
  return kunci_(function () {
    const nama = teks_(d.nama, 80);
    if (!nama) throw new Error('Isi nama alat berat.');
    const rows = bacaTabel_('AlatBerat');
    if (rows.some(function (r) { return String(r.Nama).toLowerCase() === nama.toLowerCase() && r.ID !== d.id; })) throw new Error('Alat berat ' + nama + ' sudah ada.');
    const lama = rows.filter(function (r) { return r.ID === d.id; })[0];
    const isi = { Nama: nama, Gambar: urlGambar_(d.gambar), Aktif: d.aktif === false ? 'TIDAK' : 'YA' };
    if (lama) {
      ubahBaris_('AlatBerat', lama._baris, isi);
      if (String(lama.Nama) !== nama) {
        bacaTabel_('Soal').filter(function (r) { return String(r.Alat) === String(lama.Nama); })
          .forEach(function (r) { ubahBaris_('Soal', r._baris, { Alat: nama }); });
        hapusCacheSoal_(String(lama.Nama));
      }
    } else tambahBaris_('AlatBerat', [Object.assign({ ID: Utilities.getUuid() }, isi)]);
    return { tersimpan: true };
  });
}
function apiAlatHapus_(d) {
  return kunci_(function () {
    const r = bacaTabel_('AlatBerat').filter(function (x) { return x.ID === d.id; })[0];
    if (!r) throw new Error('Data tidak ditemukan. Muat ulang halaman.');
    const n = bacaTabel_('Soal').filter(function (x) { return String(x.Alat) === String(r.Nama); }).length;
    if (n) throw new Error(r.Nama + ' masih punya ' + n + ' soal. Hapus soalnya dulu, atau nonaktifkan alat ini.');
    sh_('AlatBerat').deleteRow(r._baris);
    return { terhapus: true };
  });
}

// ── Admin: peserta ──
function apiPesertaList_() {
  return bacaTabel_('Peserta').map(function (r) {
    return { id: String(r['ID Peserta']), nama: String(r.Nama), departemen: String(r.Departemen), crew: String(r.Crew), sumber: String(r.Sumber) };
  });
}
function apiPesertaSimpan_(d) {
  return kunci_(function () {
    const id = teks_(d.id, 40), nama = teks_(d.nama, 80), dept = teks_(d.departemen, 80), crew = teks_(d.crew, 5);
    if (!id || !nama || !dept) throw new Error('Isi nomor ID, nama, dan departemen.');
    if (CREW_LIST.indexOf(crew) < 0) throw new Error('Pilih crew A, B, C, atau STD.');
    const rows = bacaTabel_('Peserta');
    const asal = teks_(d.idLama, 40);
    const lama = asal ? rows.filter(function (r) { return String(r['ID Peserta']).trim() === asal; })[0] : null;
    if (rows.some(function (r) { return String(r['ID Peserta']).trim() === id && r !== lama; })) throw new Error('Nomor ID ' + id + ' sudah terdaftar.');
    const isi = { 'ID Peserta': id, Nama: nama, Departemen: dept, Crew: crew, Sumber: 'Admin' };
    if (lama) ubahBaris_('Peserta', lama._baris, isi);
    else tambahBaris_('Peserta', [isi]);
    return { tersimpan: true };
  });
}
function apiPesertaHapus_(d) { return kunci_(function () { hapusBaris_('Peserta', 'ID Peserta', d.id); return { terhapus: true }; }); }

// ── Admin: bank soal ──
function apiSoalList_() {
  // Baris yang diisi langsung di spreadsheet belum punya ID: lengkapi otomatis.
  const rows = bacaTabel_('Soal');
  const kosong = rows.filter(function (r) { return r.Pertanyaan && !r.ID; });
  if (kosong.length) {
    kunci_(function () {
      kosong.forEach(function (r) { r.ID = Utilities.getUuid(); sh_('Soal').getRange(r._baris, 1).setValue(r.ID); });
    });
  }
  return rows.filter(function (r) { return r.Pertanyaan; }).map(function (r) {
    return {
      id: r.ID, alat: String(r.Alat), tipe: String(r.Tipe), teks: String(r.Pertanyaan),
      A: String(r.A), B: String(r.B), C: String(r.C), D: String(r.D), kunci: String(r.Kunci), gambar: String(r.Gambar), aktif: r.Aktif !== 'TIDAK'
    };
  });
}
function apiSoalSimpan_(d) {
  return kunci_(function () {
    const tipe = d.tipe === 'ESAI' ? 'ESAI' : 'PG';
    const alat = teks_(d.alat, 80), teks = teks_(d.teks, 2000);
    if (!alat) throw new Error('Pilih alat berat.');
    if (!teks) throw new Error('Isi pertanyaan.');
    const isi = { Alat: alat, Tipe: tipe, Pertanyaan: teks, Gambar: urlGambar_(d.gambar), Aktif: d.aktif === false ? 'TIDAK' : 'YA' };
    if (tipe === 'PG') {
      ['A', 'B', 'C', 'D'].forEach(function (k) {
        isi[k] = teks_(d[k], 500);
        if (!isi[k]) throw new Error('Isi pilihan ' + k + '.');
      });
      isi.Kunci = teks_(d.kunci, 1).toUpperCase();
      if (['A', 'B', 'C', 'D'].indexOf(isi.Kunci) < 0) throw new Error('Pilih kunci jawaban.');
    } else {
      ['A', 'B', 'C', 'D'].forEach(function (k) { isi[k] = ''; });
      isi.Kunci = teks_(d.kunci, 2000);
    }
    const lama = d.id ? bacaTabel_('Soal').filter(function (r) { return r.ID === d.id; })[0] : null;
    if (lama) { ubahBaris_('Soal', lama._baris, isi); hapusCacheSoal_(String(lama.Alat)); }
    else tambahBaris_('Soal', [Object.assign({ ID: Utilities.getUuid() }, isi)]);
    hapusCacheSoal_(alat);
    return { tersimpan: true };
  });
}
function apiSoalHapus_(d) {
  return kunci_(function () { const r = hapusBaris_('Soal', 'ID', d.id); hapusCacheSoal_(String(r.Alat)); return { terhapus: true }; });
}

// ── Admin: hasil ──
function ringkasUjian_(r) {
  return {
    id: r.ID, idPeserta: String(r['ID Peserta']), nama: String(r.Nama), departemen: String(r.Departemen), crew: String(r.Crew), alat: String(r.Alat),
    mulai: r.Mulai, batas: r.Batas, selesai: r.Selesai, status: String(r.Status), cara: String(r['Cara Selesai']),
    pelanggaran: Number(r.Pelanggaran) || 0, benar: r['Benar PG'], skorPG: r['Skor PG'], skorEssai: r['Skor Essai'], skorMaks: r['Skor Maks'],
    nilai: r.Nilai, hasil: String(r.Hasil), aktif: r['Terakhir Aktif']
  };
}
function apiHasilList_() {
  let rows = bacaTabel_('Ujian');
  if (sapuKedaluwarsa_(rows)) rows = bacaTabel_('Ujian');
  return rows.filter(function (r) { return r.Status !== STATUS.BATAL; }).map(ringkasUjian_).reverse();
}
function apiHasilDetail_(d) {
  const u = bacaTabel_('Ujian').filter(function (r) { return r.ID === d.id; })[0];
  if (!u) throw new Error('Data ujian tidak ditemukan.');
  const jawaban = bacaTabel_('Jawaban').filter(function (r) { return r['Ujian ID'] === d.id; }).map(function (r) {
    return { no: r.No, tipe: String(r.Tipe), teks: String(r.Pertanyaan), jawaban: String(r.Jawaban), kunci: String(r.Kunci), benar: String(r.Benar), skor: r.Skor, maks: r['Skor Maks'] };
  });
  const langgar = bacaTabel_('Pelanggaran').filter(function (r) { return r['Ujian ID'] === d.id; }).map(function (r) {
    return { waktu: r.Waktu, jenis: String(r.Jenis), dihitung: r.Dihitung === 'YA' };
  });
  return { ujian: ringkasUjian_(u), jawaban: jawaban, pelanggaran: langgar };
}
function apiHasilNilai_(d) {
  return kunci_(function () {
    const s = setelan_();
    const u = bacaTabel_('Ujian').filter(function (r) { return r.ID === d.id; })[0];
    if (!u) throw new Error('Data ujian tidak ditemukan.');
    if (u.Status === STATUS.JALAN) throw new Error('Peserta masih mengerjakan ujian ini.');
    const rows = bacaTabel_('Jawaban').filter(function (r) { return r['Ujian ID'] === d.id && r.Tipe === 'ESAI'; });
    let total = 0, lengkap = true;
    rows.forEach(function (r) {
      const v = d.skor ? d.skor[String(r.No)] : undefined;
      let skor = r.Skor;
      if (v !== undefined && v !== '') {
        const n = Number(v);
        if (isNaN(n) || n < 0 || n > Number(r['Skor Maks'])) throw new Error('Skor soal ' + r.No + ' harus antara 0 dan ' + r['Skor Maks'] + '.');
        skor = n;
        ubahBaris_('Jawaban', r._baris, { Skor: n });
      }
      if (skor === '') lengkap = false; else total += Number(skor);
    });
    const patch = { 'Skor Essai': lengkap ? total : '' };
    if (lengkap) {
      const maks = Number(u['Skor Maks']) || 0;
      patch.Nilai = maks ? Math.round((Number(u['Skor PG']) + total) / maks * 1000) / 10 : 0;
      patch.Hasil = patch.Nilai >= s.kkm ? 'Lulus' : 'Tidak lulus';
      patch.Status = STATUS.SELESAI;
    }
    ubahBaris_('Ujian', u._baris, patch);
    return { lengkap: lengkap, nilai: patch.Nilai };
  });
}
/** Tidak menghapus data: ujian ditandai Dibatalkan agar peserta bisa mengulang. */
function apiHasilBatal_(d) {
  return kunci_(function () {
    const u = bacaTabel_('Ujian').filter(function (r) { return r.ID === d.id; })[0];
    if (!u) throw new Error('Data ujian tidak ditemukan.');
    ubahBaris_('Ujian', u._baris, { Status: STATUS.BATAL, Draft: '' });
    CacheService.getScriptCache().remove('draft_' + u.ID);
    return { dibatalkan: true };
  });
}
function apiRingkas_() {
  const s = setelan_();
  let rows = bacaTabel_('Ujian');
  if (sapuKedaluwarsa_(rows)) rows = bacaTabel_('Ujian');
  rows = rows.filter(function (r) { return r.Status !== STATUS.BATAL; });
  const dinilai = rows.filter(function (r) { return r.Status === STATUS.SELESAI; });
  const nilai = dinilai.map(function (r) { return Number(r.Nilai) || 0; });
  const rata = function (a) { return a.length ? Math.round(a.reduce(function (x, y) { return x + y; }, 0) / a.length * 10) / 10 : null; };
  const kelompok = [[0, 49], [50, 59], [60, 69], [70, 79], [80, 89], [90, 100]].map(function (b) {
    return { label: b[0] + '–' + b[1], jumlah: nilai.filter(function (n) { const x = Math.floor(n); return x >= b[0] && x <= b[1]; }).length };
  });
  const perCrew = CREW_LIST.map(function (c) {
    const a = dinilai.filter(function (r) { return r.Crew === c; }).map(function (r) { return Number(r.Nilai) || 0; });
    return { crew: c, rata: rata(a), jumlah: a.length };
  });
  const alat = {};
  dinilai.forEach(function (r) { (alat[r.Alat] = alat[r.Alat] || []).push(Number(r.Nilai) || 0); });
  return {
    berlangsung: rows.filter(function (r) { return r.Status === STATUS.JALAN; }).length,
    koreksi: rows.filter(function (r) { return r.Status === STATUS.KOREKSI; }).length,
    selesai: dinilai.length,
    lulus: dinilai.filter(function (r) { return r.Hasil === 'Lulus'; }).length,
    rata: rata(nilai), kkm: s.kkm,
    bermasalah: rows.filter(function (r) { return Number(r.Pelanggaran) > 0; }).length,
    kelompok: kelompok, perCrew: perCrew,
    perAlat: Object.keys(alat).map(function (k) { return { alat: k, rata: rata(alat[k]), jumlah: alat[k].length }; }),
    bukaStatus: statusBuka_(s)
  };
}
