/* Tiruan layanan Google Apps Script untuk uji lokal. Tidak diunggah ke Apps Script.
   gas/Kode.gs yang asli dijalankan di browser, datanya disimpan di localStorage. */
(function () {
  const KEY = 'gasmock_v1';
  const muat = () => {
    try {
      return JSON.parse(localStorage.getItem(KEY) || 'null', (k, v) => (v && v.__d ? new Date(v.__d) : v)) || { sheets: {}, props: {} };
    } catch (e) { return { sheets: {}, props: {} }; }
  };
  const db = muat();
  const simpan = () => localStorage.setItem(KEY, JSON.stringify(db, function (k, v) {
    return this[k] instanceof Date ? { __d: this[k].getTime() } : v;
  }));
  const masuk = v => (typeof v === 'string' && v.charAt(0) === "'" ? v.slice(1) : v);

  function Range(sh, r, c, nr, nc) {
    const rows = () => db.sheets[sh];
    const obj = {
      getValues() {
        const out = [];
        for (let i = 0; i < nr; i++) {
          const row = [];
          for (let j = 0; j < nc; j++) { const v = (rows()[r - 1 + i] || [])[c - 1 + j]; row.push(v === undefined ? '' : v); }
          out.push(row);
        }
        return out;
      },
      setValues(vals) {
        vals.forEach((row, i) => row.forEach((v, j) => {
          while (rows().length < r + i) rows().push([]);
          rows()[r - 1 + i][c - 1 + j] = masuk(v);
        }));
        simpan();
        return obj;
      },
      setValue(v) { return obj.setValues([[v]]); },
      setFontWeight() { return obj; }, setBackground() { return obj; }, setFontColor() { return obj; }
    };
    return obj;
  }
  function Sheet(nama) {
    return {
      getName: () => nama,
      getLastRow: () => db.sheets[nama].length,
      getLastColumn: () => Math.max(0, ...db.sheets[nama].map(r => r.length)),
      getRange: (r, c, nr, nc) => Range(nama, r, c, nr || 1, nc || 1),
      getDataRange() { return Range(nama, 1, 1, Math.max(1, this.getLastRow()), Math.max(1, this.getLastColumn())); },
      deleteRow(r) { db.sheets[nama].splice(r - 1, 1); simpan(); },
      setFrozenRows() {}
    };
  }
  const SS = {
    getId: () => 'ss-dev', getUrl: () => 'https://docs.google.com/spreadsheets/d/ss-dev',
    getSheetByName: n => (db.sheets[n] ? Sheet(n) : null),
    insertSheet(n) { db.sheets[n] = db.sheets[n] || []; simpan(); return Sheet(n); },
    getSheets: () => Object.keys(db.sheets).map(Sheet),
    deleteSheet() {}
  };
  const enk = new TextEncoder(), dek = new TextDecoder();
  const keByte = s => (typeof s === 'string' ? Array.from(enk.encode(s)) : Array.from(s));
  const b64 = a => btoa(String.fromCharCode(...a.map(x => x & 255)));
  const hashSemu = str => {
    // Bukan kriptografi: cukup untuk menguji alur token di lokal.
    let h = 2166136261; const out = [];
    for (let k = 0; k < 32; k++) { for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } h ^= k; out.push(h & 255); }
    return out;
  };
  window.SpreadsheetApp = { create: () => SS, open: () => SS, openById: () => SS };
  window.PropertiesService = { getScriptProperties: () => ({
    getProperties: () => Object.assign({}, db.props),
    setProperty(k, v) { db.props[k] = String(v); simpan(); },
    setProperties(o) { Object.keys(o).forEach(k => { db.props[k] = String(o[k]); }); simpan(); },
    deleteProperty(k) { delete db.props[k]; simpan(); }
  }) };
  const memori = new Map();
  window.CacheService = { getScriptCache: () => ({
    get: k => (memori.has(k) ? memori.get(k) : null), put: (k, v) => memori.set(k, String(v)), remove: k => memori.delete(k)
  }) };
  window.LockService = { getScriptLock: () => ({ tryLock: () => true, releaseLock() {} }) };
  window.Utilities = {
    DigestAlgorithm: { SHA_256: 1, MD5: 2 },
    getUuid: () => crypto.randomUUID(),
    computeDigest: (a, s) => hashSemu(String(s)),
    computeHmacSha256Signature: (s, k) => hashSemu(k + '|' + s),
    base64Encode: a => b64(keByte(a)),
    base64EncodeWebSafe: a => b64(keByte(a)).replace(/\+/g, '-').replace(/\//g, '_'),
    base64DecodeWebSafe: s => Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0)),
    base64Decode: s => Array.from(atob(s), c => c.charCodeAt(0)),
    newBlob: (a) => ({ getDataAsString: () => dek.decode(new Uint8Array(a)) }),
    sleep() {}
  };
  window.Session = { getActiveUser: () => ({ getEmail: () => 'dev@lokal' }), getEffectiveUser: () => ({ getEmail: () => 'dev@lokal' }) };
  const folder = { getId: () => 'f-dev', getUrl: () => '#', getFoldersByName: () => ({ hasNext: () => false }), getFilesByName: () => ({ hasNext: () => false }), createFolder: () => folder,
    createFile: () => ({ getId: () => 'berkas-dev', setSharing() {} }) };
  window.DriveApp = { getFoldersByName: () => ({ hasNext: () => false }), createFolder: () => folder, getFolderById: () => folder, getFileById: () => ({ moveTo() {} }), Access: {}, Permission: {} };
  window.Logger = { log: m => console.log('[Logger]', m) };
  window.HtmlService = {};
  window.gasMockHapus = () => { localStorage.removeItem(KEY); location.reload(); };
  window.gasMockDb = db;

  // Tiruan google.script.run: satu antrean, ada jeda agar indikator memuat ikut teruji.
  window.google = { script: { get run() {
    let ok, no;
    const p = {
      withSuccessHandler(f) { ok = f; return p; },
      withFailureHandler(f) { no = f; return p; },
      api(...arg) {
        setTimeout(() => {
          if (window.gasMockPutus) return no(new Error('jaringan putus'));
          try { ok(window.api(...arg)); } catch (e) { no(e); }
        }, 120);
      }
    };
    return p;
  } } };
})();
