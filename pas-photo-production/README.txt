PAS FOTO PRODUCTION MANAGER — v2.4.0
=====================================
Plugin CEP untuk Adobe Illustrator (2021+) — auto-layout pas foto ke dalam
lembar cetak (A4/A5/dst), lengkap dengan slot editor.

APA YANG BARU DI REVISI INI
---------------------------
1. Tombol "Doc" (Create New Document) sekarang memakai
   app.documents.addDocument(preset, DocumentPreset, false) yaitu jalur
   internal yang SAMA dengan menu File > New bawaan Illustrator. Tampilan
   artboard tidak lagi melompat / scroll ke pasteboard — Illustrator
   yang menangani pemusatan viewport secara native.

2. Tombol "Generate ke Illustrator" tetap memakai koordinat artboard
   aktif sebagai anchor dan mengembalikan indeks artboard aktif setelah
   selesai. Perbaikan ini dari revisi sebelumnya dipertahankan penuh.

3. Ikon panel diganti dengan desain grid 2x2 sesuai desain yang
   diberikan (kotak membulat berisi empat sel). File PNG standar
   Adobe CEP ada di:
     - CSXS/panel-icon.png       (23x23 px, Normal)
     - CSXS/panel-icon@2x.png    (46x46 px, High-DPI, opsional)

   File SVG referensi tersedia di CSXS/panel-icon-normal.svg,
   panel-icon-dark.svg, panel-icon-rollover.svg untuk memodifikasi
   desain sesuai kebutuhan Anda.

REGENERATE IKON (OPSIONAL)
--------------------------
Jika Anda ingin memperbarui ikon PNG dari SVG referensi (atau setelah
Anda mengedit SVG-nya), jalankan sekali dari root project:

    npm install
    node scripts/build-icons.mjs

Script tersebut akan menghasilkan:
  - CSXS/panel-icon.png           (23x23 normal, light UI)
  - CSXS/panel-icon@2x.png        (46x46 normal, light UI)
  - CSXS/panel-icon-D.png / @2x   (23/46 normal, dark UI)
  - CSXS/panel-icon-R.png / @2x   (rollover, light UI)
  - CSXS/panel-icon-DR.png / @2x  (rollover, dark UI)

Setelah itu, sunting CSXS/manifest.xml untuk menunjuk ke variant
D/R/DR jika ingin mengaktifkan tema gelap dan rollover terpisah.

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
   Window > Extensions > Pas Foto Production Manager

STRUKTUR FILE
-------------
pas-photo-production/
 |- CSXS/manifest.xml           (deklarasi extension CEP)
 |- CSXS/panel-icon.png         (ikon panel standar Adobe CEP)
 |- CSXS/panel-icon-*.svg       (SVG referensi untuk regenerate)
 |- host/main.jsx               (ExtendScript, jalan di dalam Illustrator)
 |- lib/CSInterface.js          (library standar Adobe CEP)
 |- client/index.html           (UI panel)
 |- client/css/theme.css        (tema panel)
 |- client/js/state.js          (state + localStorage)
 |- client/js/bridge.js         (jembatan panel <-> ExtendScript)
 |- client/js/layout-engine.js  (mesin penyusun layout)
 |- client/js/app.js            (controller UI panel)
 |- client/icons/               (ikon panel legacy)

CATATAN
-------
Panel juga bisa dibuka langsung di browser (client/index.html) untuk
melihat mode preview saja, karena bridge.js mendeteksi otomatis apakah
berjalan di dalam host CEP atau tidak.
