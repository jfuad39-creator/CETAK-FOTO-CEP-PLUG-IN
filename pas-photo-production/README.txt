PAS FOTO PRODUCTION MANAGER — v2.4.0 (build perbaikan: Ganti Background)
=========================================================================
Plugin CEP untuk Adobe Illustrator (2021+) — auto-layout pas foto ke dalam
lembar cetak (A4/A5/dst), lengkap dengan slot editor.

=========================================================================
CATATAN PERBAIKAN PADA PAKET INI (baca dulu)
=========================================================================
Perbaikan SATU-SATUNYA pada paket ini (sesuai permintaan): fitur
"Ganti Background" pada slot yang SUDAH di-generate ke artboard Illustrator
(bukan hanya saat import foto).

Gejala sebelumnya:
  - Tombol "Terapkan ke Slot Terpilih" & terutama tombol "Terapkan ke
    Ukuran Ini" (menerapkan background ke SEMUA slot berukuran sama
    sekaligus, tanpa perlu select satu-satu) tidak bekerja / selalu
    gagal dengan pesan "Tidak ada slot ukuran ... di dokumen ini.".

Akar masalah:
  - client/js/state.js (buildJob()) membentuk id unik PER BARIS order
    dengan menggabungkan sizeId + suffix acak, mis. "4x6|ab12", lalu
    layout-engine.js memakai id gabungan ini sebagai sizeId tiap slot
    hasil generate. Akibatnya, dua baris order dengan ukuran fisik yang
    sama (mis. dua baris "4x6" dgn foto sumber berbeda) menghasilkan
    sizeId yang BERBEDA pada slot yang tersimpan di Illustrator.
  - Sementara dropdown "Terapkan ke Ukuran Ini" (#bgSizeTarget) pada
    panel mengirim sizeId MENTAH (mis. "4x6") ke host/main.jsx
    (api.setBackgroundBySize). sizeId ini tidak pernah cocok dengan
    sizeId slot yang tersimpan ("4x6|ab12"), sehingga pencarian slot
    selalu menghasilkan 0 hasil.

Perbaikan (hanya 2 file, murni menambah field, TIDAK mengubah algoritma
penyusunan layout / packing):
  1. client/js/state.js -> buildJob() sekarang mengirim field `sizeId`
     terpisah (mentah, mis. "4x6") selain field `id` (identitas unik per
     baris yang tetap dipakai untuk membentuk slotId).
  2. client/js/layout-engine.js -> build()/addSlot() sekarang menyimpan
     `sizeId` dari field baru tsb (fallback ke id lama bila tidak ada),
     dan menuliskannya ke slot.sizeId, bukan lagi id gabungan per baris.

Dengan ini:
  - "Ganti Background -> Terapkan ke Slot Terpilih" bekerja pada slot
    yang sedang dipilih di kanvas Illustrator (boleh multi-select).
  - "Ganti Background -> Terapkan ke Ukuran Ini" bekerja ke SEMUA slot
    berukuran sama di seluruh dokumen sekaligus, tanpa perlu select
    satu-satu.

Tidak ada perubahan lain di luar dua file tersebut (host/main.jsx,
bridge.js, app.js, layout-engine.js selain field sizeId, theme.css, dan
struktur panel TIDAK diubah perilakunya).

CATATAN TAMBAHAN SOAL IKON PANEL (CSXS/panel-icon*.png)
--------------------------------------------------------
File ikon biner (CSXS/panel-icon.png, panel-icon-R.png, panel-icon-D.png,
panel-icon-DR.png, serta varian @2x dan client/icons/*.png) TIDAK
disertakan dalam paket ini apa adanya karena keterbatasan alat pembuatan
paket (tidak bisa menyalin berkas biner tanpa risiko korup). Ini TIDAK
mempengaruhi fitur yang diperbaiki maupun fungsi generate/edit foto -
Illustrator tetap memuat & menjalankan panel dengan normal, hanya ikon
panel di menu Window > Extensions yang mungkin tampil generik.

Jika Anda ingin ikon panel identik dengan repo asli, salin ulang berkas
PNG tersebut dari repo sumber:
  https://github.com/jfuad39-creator/CETAK-FOTO-CEP-PLUG-IN/tree/main/pas-photo-production/CSXS
  https://github.com/jfuad39-creator/CETAK-FOTO-CEP-PLUG-IN/tree/main/pas-photo-production/client/icons
ke folder CSXS/ dan client/icons/ pada paket ini (nama file harus persis
sama). File SVG referensi (panel-icon-normal.svg, panel-icon-dark.svg,
panel-icon-rollover.svg) SUDAH disertakan dan bisa dipakai sebagai basis
untuk regenerasi PNG lewat scripts/build-icons.mjs bila Anda punya
Node.js (lihat bagian "REGENERATE IKON" di bawah — skrip tsb opsional,
tidak wajib untuk plugin berfungsi).

=========================================================================
APA YANG BARU DI REVISI SEBELUMNYA (dipertahankan penuh)
=========================================================================
1. Tombol "Doc" (Create New Document) memakai
   app.documents.addDocument(preset, DocumentPreset, false) yaitu jalur
   internal yang SAMA dengan menu File > New bawaan Illustrator. Tampilan
   artboard tidak lagi melompat / scroll ke pasteboard — Illustrator
   yang menangani pemusatan viewport secara native.

2. Tombol "Generate ke Illustrator" memakai koordinat artboard aktif
   sebagai anchor dan mengembalikan indeks artboard aktif setelah selesai.

3. Ikon panel didesain grid 2x2 / kamera sederhana. File SVG referensi
   tersedia di CSXS/panel-icon-normal.svg, panel-icon-dark.svg,
   panel-icon-rollover.svg untuk memodifikasi desain sesuai kebutuhan.

REGENERATE IKON (OPSIONAL)
--------------------------
Jika Anda ingin membuat ikon PNG dari SVG referensi, siapkan skrip Node
sederhana (mis. dengan paket "sharp" atau "svg2png") yang merender:
  - CSXS/panel-icon.png           (23x23 normal, light UI)
  - CSXS/panel-icon@2x.png        (46x46 normal, light UI)
  - CSXS/panel-icon-D.png / @2x   (23/46 normal, dark UI)
  - CSXS/panel-icon-R.png / @2x   (rollover, light UI)
  - CSXS/panel-icon-DR.png / @2x  (rollover, dark UI)
lalu sunting CSXS/manifest.xml bila ingin menunjuk ke variant D/R/DR.

CARA INSTALASI (mode developer / unsigned extension)
-----------------------------------------------------
1. Salin folder "pas-photo-production" ini ke folder ekstensi CEP:
   Windows : %APPDATA%\Adobe\CEP\extensions\pas-photo-production
   macOS   : ~/Library/Application Support/Adobe/CEP/extensions/pas-photo-production

2. Aktifkan mode "PlayerDebugMode" (karena extension belum ditandatangani):
   Windows (Registry):
     HKEY_CURRENT_USER\Software\Adobe\CSXS.11  -> PlayerDebugMode = "1" (String)
   macOS (Terminal):
     defaults write com.adobe.CSXS.11 PlayerDebugMode 1

3. Buka/restart Adobe Illustrator, lalu buka panel via:
   Window > Extensions > Pas Foto Print

STRUKTUR FILE
-------------
pas-photo-production/
 |- CSXS/manifest.xml           (deklarasi extension CEP)
 |- CSXS/panel-icon-*.svg       (SVG referensi ikon panel)
 |- host/main.jsx               (ExtendScript, jalan di dalam Illustrator)
 |- lib/CSInterface.js          (library standar Adobe CEP)
 |- client/index.html           (UI panel)
 |- client/css/theme.css        (tema panel)
 |- client/js/state.js          (state + persistensi localStorage - FIXED)
 |- client/js/bridge.js         (jembatan panel <-> ExtendScript)
 |- client/js/layout-engine.js  (mesin penyusun layout - FIXED)
 |- client/js/app.js            (controller UI panel)

CATATAN
-------
Panel juga bisa dibuka langsung di browser (client/index.html) untuk
melihat mode preview saja, karena bridge.js mendeteksi otomatis apakah
berjalan di dalam host CEP atau tidak.
