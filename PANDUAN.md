# TOPGUN OPERATOR: panduan pemasangan dan pemakaian

Yang diunggah ke Google hanya isi folder `gas/`. Folder `dev/` khusus uji lokal.

## 1. Pasang di Google Apps Script

1. Buka https://script.google.com, lalu pilih **Proyek baru**. Beri nama `TOPGUN OPERATOR`.
2. Ganti isi `Code.gs` dengan isi `gas/Kode.gs`.
3. Pilih **File > HTML** untuk membuat tiga berkas, lalu tempel isinya. Nama harus persis, tanpa `.html`:
   - `Index` dari `gas/Index.html`
   - `Stylesheet` dari `gas/Stylesheet.html`
   - `JavaScript` dari `gas/JavaScript.html`
4. Di kotak fungsi, pilih `setupAppEnvironment`, lalu tekan **Run** dan berikan izin.
5. Buka **Execution log**. Catat kata sandi admin, karena hanya tampil sekali. Log ini juga berisi alamat spreadsheet dan folder Drive.
6. Pilih **Deploy > New deployment > Web app**:
   - Execute as: **Me**
   - Who has access: **Anyone**
7. Salin alamat web app dan bagikan kepada peserta.

Setiap kali kode diubah, pilih **Deploy > Manage deployments > Edit > New version** agar alamatnya tetap sama.

Zona waktu proyek bisa diatur di **Project Settings**, atau lewat `gas/appsscript.json` bila manifest ditampilkan. Bawaannya `Asia/Makassar` (WITA). Sesuaikan dengan lokasi Anda.

## 2. Siapkan ujian sebagai admin

1. Buka alamat web app, pilih tab **Admin**, lalu masuk dengan nama pengguna `admin` dan kata sandi dari log. Anda akan diminta membuat kata sandi baru.
2. **Pengaturan**: isi logo, lama ujian, jadwal (boleh kosong), nilai lulus, batas pelanggaran, dan kode ujian (boleh kosong).
3. **Soal > Alat berat**: daftarkan tiap unit beserta gambarnya.
4. **Soal > Bank soal**: tulis minimal 25 pilihan ganda dan 5 essai untuk tiap alat berat. Hapus dua soal contoh dari setup. Bila soalnya lebih banyak, tiap peserta mendapat pilihan acak.
5. **Peserta** (boleh dilewati): daftarkan ID, nama, departemen, dan crew. Departemen dikelola di tab **Departemen**.

Soal juga bisa ditulis langsung di sheet `Soal`. Isi `Alat` harus sama persis dengan nama alat berat, `Tipe` berisi `PG` atau `ESAI`, dan `Kunci` berisi `A` sampai `D`. Kolom `ID` boleh kosong, karena terisi otomatis saat menu Soal dibuka.

## 3. Alur peserta

1. Isi nomor ID. Bila terdaftar, nama, departemen, dan crew terisi otomatis dan terkunci.
2. Bila tidak terdaftar, peserta mengetik sendiri. Departemen dipilih dari daftar, atau pilih **Ketik manual**.
3. Pilih alat berat, baca tata tertib, lalu mulai ujian.
4. Satu ID hanya bisa mengerjakan satu kali per alat berat. Untuk mengulang, admin membuka lembar jawabannya di **Hasil**, lalu memilih **Batalkan agar bisa mengulang**.

## 4. Nilai

- Nilai akhir = total poin / poin maksimal x 100. Bawaannya 25 x 2 poin + 5 x 10 poin = 100.
- Pilihan ganda dinilai otomatis di server. Essai dikoreksi admin di menu **Hasil**.
- Nilai akhir dan status lulus baru muncul setelah semua essai diberi skor.

## 5. Fitur anti cheat dan batasannya

| Ditangani server (tidak bisa diakali dari browser) | Ditangani browser (penghalang dan pencatat) |
|---|---|
| Kunci jawaban tidak pernah dikirim ke peserta | Deteksi pindah tab, aplikasi, dan jendela |
| Penilaian dan batas waktu | Layar penuh wajib, keluar dihitung pelanggaran |
| Soal dan urutan pilihan diacak per peserta | Blokir salin, tempel, klik kanan, dan pintasan |
| Satu ID satu kali per alat berat | Tanda air ID dan nama di layar |
| Ujian yang dibuka di perangkat lain menghentikan yang lama dan dicatat | Soal diburamkan saat peserta keluar halaman |

Aplikasi web tidak bisa mendeteksi HP kedua, foto layar dari kamera lain, atau mesin virtual. Peserta yang paham teknis juga bisa mematikan pemeriksaan di browser, tetapi kunci jawaban tetap aman. Pengawas di ruangan tetap diperlukan. iPhone tidak mendukung layar penuh untuk halaman web, jadi di sana aturan layar penuh dilewati dan deteksi pindah aplikasi tetap aktif.

## 6. Keamanan

- Hash kata sandi admin, kunci sesi, dan kode ujian disimpan di **Script Properties**, bukan di spreadsheet.
- Jangan membagikan spreadsheet atau proyek Apps Script kepada peserta, karena di sana ada kunci jawaban.
- Lupa kata sandi admin: jalankan `resetSandiAdmin` dari editor, lalu baca sandi baru di Execution log.
- Gambar yang diunggah disimpan di folder Drive `TOPGUN_OPERATOR/Gambar` dan bisa dilihat siapa pun yang punya tautannya. Akun Google Workspace yang melarang berbagi publik membuat gambar gagal tampil. Bila itu terjadi, tempel alamat gambar `https://` dari tempat lain.

## 7. Kapasitas

Apps Script membatasi sekitar 30 proses bersamaan per pengguna skrip. Autosave dirancang hemat, tetapi lakukan uji coba dengan jumlah peserta sungguhan sebelum ujian besar. Bila peserta sangat banyak, bagi menjadi beberapa gelombang.

## 8. Uji lokal (opsional)

`dev/index.html` menjalankan `Kode.gs` asli di browser dengan tiruan layanan Google, dan datanya tersimpan di browser saja. Jalankan `dev/serve.ps1`, lalu buka `http://localhost:8130/dev/index.html`. Akun admin uji lokal ada di `dev/index.html`.
