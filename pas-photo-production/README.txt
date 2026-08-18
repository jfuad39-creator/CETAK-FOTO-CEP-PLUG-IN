PAS FOTO PRODUCTION MANAGER — v2.4.0
=====================================
Plugin CEP untuk Adobe Illustrator (2021+) — auto-layout pas foto ke dalam
lembar cetak (A4/A5/dst), lengkap dengan slot editor.

APA YANG BARU DI VERSI INI
---------------------------
- Tambahan opsi "Tanpa Border" pada card "Media & Layout" (langsung di
  bawah field "Offset Border (mm)").
  * Saat dicentang: field "Offset Border (mm)" otomatis dinonaktifkan
    (dipaksa 0) dan TIDAK ADA garis border/potong yang digambar sama
    sekali — baik di panel preview maupun saat "Generate ke Illustrator".
  * Ukuran clipping mask / foto aktual (4x6, 3x4, 2x3, dll) TIDAK berubah,
    hanya garis border 0.3pt di sekelilingnya yang dihilangkan.
  * Saat dicentang ulang (dimatikan), nilai Offset Border kembali bisa
    diisi manual seperti biasa.
  Tidak ada perubahan lain pada fitur/tampilan di luar hal ini.

CARA INSTALASI (mode developer / unsigned extension)
-----------------------------------------------------
1. Salin folder "pas-photo-production" ini ke folder ekstensi CEP, contoh:
   Windows : %APPDATA%\Adobe\CEP\extensions\pas-photo-production
   macOS   : ~/Library/Application Support/Adobe/CEP/extensions/pas-photo-production

2. Aktifkan mode "PlayerDebugMode" (karena extension ini belum ditandatangani):
   Windows (Registry):
     HKEY_CURRENT_USER\Software\Adobe\CSXS.11  -> PlayerDebugMode = "1" (String)
     (sesuaikan angka CSXS.xx dengan versi CEP runtime Illustrator Anda,
      misalnya CSXS.9, CSXS.10, CSXS.11)
   macOS (Terminal):
     defaults write com.adobe.CSXS.11 PlayerDebugMode 1

3. Buka/restart Adobe Illustrator, lalu buka panel lewat:
   Window > Extensions > Pas Foto Production Manager

STRUKTUR FILE
-------------
pas-photo-production/
 |- CSXS/manifest.xml           (deklarasi extension CEP)
 |- host/main.jsx               (ExtendScript, jalan di dalam Illustrator)
 |- lib/CSInterface.js          (library standar Adobe CEP)
 |- client/index.html           (UI panel)
 |- client/css/theme.css        (tema panel)
 |- client/js/state.js          (state + localStorage)
 |- client/js/bridge.js         (jembatan panel <-> ExtendScript)
 |- client/js/layout-engine.js  (mesin penyusun layout)
 |- client/js/app.js            (controller UI panel)
 |- client/icons/               (ikon panel)

CATATAN
-------
Panel juga bisa dibuka langsung di browser (client/index.html) untuk
melihat mode preview saja (tanpa fitur generate ke Illustrator), karena
bridge.js mendeteksi otomatis apakah berjalan di dalam host CEP atau tidak.
