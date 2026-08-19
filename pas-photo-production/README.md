# PAS FOTO PRODUCTION MANAGER — v2.4.1

Plugin CEP untuk Adobe Illustrator (2021+) — auto-layout pas foto ke dalam
lembar cetak (A4/A5/dst), lengkap dengan slot editor.

## PERBAIKAN v2.4.1

### Fix: Ganti Background pada Slot yang Sudah Di-generate

Fitur "Ganti Background Foto" di Slot Editor sekarang bekerja dengan benar:

1. **Terapkan ke Slot Terpilih** — Pilih satu atau lebih slot di Illustrator, pilih warna background, klik tombol ini untuk menerapkan background ke slot yang dipilih.

2. **Terapkan ke Ukuran Ini** — Pilih ukuran dari dropdown (misal "3x4"), pilih warna, klik tombol ini untuk menerapkan background ke SEMUA slot dengan ukuran tersebut sekaligus, tanpa perlu memilih satu per satu.

### Perubahan Teknis

- **host/main.jsx**: 
  - Menambahkan fungsi `collectAllSlots()` untuk mengiterasi semua slot di seluruh layer dokumen (bukan hanya `doc.pageItems` yang hanya mengembalikan item top-level).
  - Menambahkan API `getGeneratedSizes` untuk mendapatkan daftar ukuran unik dari slot yang sudah di-generate.
  - Memperbaiki `setBackgroundBySize` untuk menggunakan `collectAllSlots()`.

- **client/js/app.js**:
  - Menambahkan fungsi `refreshBgSizeTarget()` untuk mengisi dropdown ukuran dari slot yang ada di dokumen Illustrator.
  - Dropdown ukuran sekarang di-refresh setelah generate, delete slot, dan reset artboard.

## CARA INSTALASI (mode developer / unsigned extension)

1. Salin folder "pas-photo-production" ini ke folder ekstensi CEP:
   - **Windows**: `%APPDATA%\Adobe\CEP\extensions\pas-photo-production`
   - **macOS**: `~/Library/Application Support/Adobe/CEP/extensions/pas-photo-production`

2. Aktifkan mode "PlayerDebugMode" (karena extension belum ditandatangani):
   - **Windows (Registry)**:
     ```
     HKEY_CURRENT_USER\Software\Adobe\CSXS.11  -> PlayerDebugMode = "1" (String)
     ```
   - **macOS (Terminal)**:
     ```
     defaults write com.adobe.CSXS.11 PlayerDebugMode 1
     ```

3. Buka/restart Adobe Illustrator, lalu buka panel via:
   `Window > Extensions > Pas Foto Production Manager`

## STRUKTUR FILE

```
pas-photo-production/
 ├── CSXS/manifest.xml           (deklarasi extension CEP)
 ├── host/main.jsx               (ExtendScript, jalan di dalam Illustrator)
 ├── lib/CSInterface.js          (library standar Adobe CEP)
 ├── client/index.html           (UI panel)
 ├── client/css/theme.css        (tema panel)
 ├── client/js/state.js          (state + localStorage)
 ├── client/js/bridge.js         (jembatan panel <-> ExtendScript)
 ├── client/js/layout-engine.js  (mesin penyusun layout)
 └── client/js/app.js            (controller UI panel)
```

## CATATAN

Panel juga bisa dibuka langsung di browser (client/index.html) untuk
melihat mode preview saja, karena bridge.js mendeteksi otomatis apakah
berjalan di dalam host CEP atau tidak.
