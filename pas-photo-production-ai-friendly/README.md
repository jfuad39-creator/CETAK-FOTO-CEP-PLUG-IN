# Pas Foto Production Manager

CEP panel untuk Adobe Illustrator, ditujukan untuk workflow produksi pas foto di gerai printing. Repository ini disusun sebagai **AI-friendly engineering repository**: struktur runtime tetap kompatibel dengan CEP, sementara konteks proyek, kontrak, entry point, dan ownership setiap modul dibuat eksplisit.

## Target runtime

- Adobe Illustrator 2021 / 25.4.1
- CEP / CSXS 10
- Host: ExtendScript (`host/main.jsx`)
- Panel: HTML/CSS/JavaScript ES5-compatible
- Extension ID: `com.internal.pasfoto.production.panel`

## Prinsip repository

1. `src/extension/` adalah **single source of truth** untuk extension yang sebenarnya dijalankan Illustrator.
2. `docs/` menjelaskan maksud modul dan alur data tanpa memaksa AI membaca seluruh codebase terlebih dahulu.
3. `contracts/` mendefinisikan bentuk data penting yang menyeberang antar-layer.
4. `project.manifest.json` menjadi indeks mesin: runtime, entry point, modul, dependensi, dan batasan kompatibilitas.
5. `dist/extension/` adalah output deployable dan **tidak diedit manual**.
6. Refactor perilaku harus dilakukan bertahap; jangan mengubah beberapa boundary sekaligus tanpa tes manual di Illustrator.

## Struktur

```text
pas-photo-production/
├─ AI_CONTEXT.md                 # konteks wajib dibaca AI/agent sebelum coding
├─ PROJECT_MAP.md                # peta file + ownership + dependensi
├─ ARCHITECTURE.md               # arsitektur runtime dan alur data
├─ DEVELOPMENT.md                # cara build, install, debug, dan aturan perubahan
├─ CHANGELOG.md                  # perubahan repository
├─ project.manifest.json         # indeks machine-readable
├─ package.json                  # command repository; tanpa dependency eksternal
├─ contracts/                    # kontrak data antar modul
├─ docs/                         # dokumentasi modul + keputusan arsitektur
├─ scripts/                      # build / validate repository
├─ src/
│  └─ extension/                 # CEP package canonical
│     ├─ CSXS/manifest.xml       # entry point CEP
│     ├─ client/                 # UI/panel layer
│     ├─ host/main.jsx           # Illustrator/ExtendScript layer
│     └─ lib/CSInterface.js      # CEP bridge library
└─ dist/extension/               # hasil build untuk instalasi
```

## Quick start

```text
1. Baca AI_CONTEXT.md
2. Baca PROJECT_MAP.md
3. Jalankan build repository
4. Install isi dist/extension sebagai CEP extension
5. Uji di Illustrator
```

Build tidak membutuhkan npm package tambahan.

## Status refactor

Struktur ini adalah **repository refactor, bukan behavioral rewrite**. Implementasi existing dipertahankan semaksimal mungkin; perubahan utama adalah organisasi repository, kontrak, dokumentasi, dan proses build/validate.
