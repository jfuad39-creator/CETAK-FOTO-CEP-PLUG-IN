# AI Context — Pas Foto Production Manager

> **Read this file before modifying code.**

## Mission

Plugin CEP internal untuk Adobe Illustrator yang membantu produksi pas foto: memasukkan foto, menentukan ukuran/jumlah, menghitung layout/nesting untuk media cetak, preview layout, generate ke Illustrator, lalu melakukan edit manual pada slot yang telah dibuat.

## Runtime constraints

- Host application: Adobe Illustrator
- Target validated baseline: Illustrator 2021 (25.4.1)
- CEP runtime: CSXS 10
- Panel code harus aman untuk Chromium/JS environment CEP lama; jangan mengasumsikan toolchain modern tanpa alasan.
- Host code adalah ExtendScript (`.jsx`), bukan Node.js module.
- `src/extension/CSXS/manifest.xml` adalah sumber kebenaran untuk entry point CEP.

## Runtime entry points

| Layer | Entry point | Tanggung jawab |
|---|---|---|
| CEP | `src/extension/CSXS/manifest.xml` | deklarasi extension, host, ukuran panel |
| Panel | `src/extension/client/index.html` | UI shell + load order script |
| Panel app | `src/extension/client/js/app.js` | UI event, render, orchestration |
| Panel state | `src/extension/client/js/state.js` | state + localStorage + job input |
| Layout | `src/extension/client/js/layout-engine.js` | kalkulasi nesting/layout |
| Bridge | `src/extension/client/js/bridge.js` | panel -> `PFPM.*` host calls |
| Illustrator host | `src/extension/host/main.jsx` | operasi Illustrator, generate, editor |
| CEP lib | `src/extension/lib/CSInterface.js` | wrapper CEP API |

## Global runtime APIs

The panel exposes: `PFState`, `PFBridge`, `PFLayout`.

The host exposes: `PFPM`.

Do not rename these global objects casually. They are integration boundaries.

## Important data flow

```text
User/UI
  -> PFState
  -> PFState.buildJob()
  -> PFLayout.generate(job)
  -> Preview
  -> PFBridge.call("generate", payload)
  -> PFPM.generate(raw)
  -> Illustrator document

Selection editor:
Illustrator selection
  -> PFBridge.call("selectionInfo")
  -> app editor state/UI
  -> PFBridge.call("nudge" | "crop" | "flip" | "rotate90" | "replacePhoto" | "duplicateSlot" | "deleteSlot" | "undo")
  -> PFPM.*
```

## Domain vocabulary

- **Photo**: sumber gambar input `{id,name,path,thumb,color}`.
- **Item**: permintaan ukuran + quantity sebelum nesting.
- **Job**: gabungan `items`, `media`, dan `options` yang dikirim ke layout engine.
- **Slot**: satu posisi foto hasil layout; memuat ukuran, posisi, rotation, crop, dan metadata source.
- **Sheet**: satu lembar hasil layout berisi banyak slot.
- **Layout result**: `{media,sheets,totalSlots,placed,unplaced,efficiency,options}`.

## Safe modification rules

### Safe-ish
- perubahan UI CSS/HTML yang tidak mengubah ID yang dipakai `app.js`
- perubahan copy/label UI
- penambahan dokumentasi
- penambahan validasi input yang tidak mengubah format payload existing

### High-risk
- mengubah `PFBridge.call()` atau format `PFPM.*`
- mengubah schema `PFState.buildJob()`
- mengubah format slot/layout result
- mengubah metadata Illustrator yang dipakai `main.jsx` untuk menemukan slot
- mengganti urutan script pada `index.html`
- memodernisasi ExtendScript menjadi syntax yang belum terbukti didukung target CEP/Illustrator

## Refactor protocol

1. Satu boundary per perubahan besar.
2. Dokumentasikan kontrak sebelum mengubah kontrak.
3. Build + validate sebelum install.
4. Uji minimal: ping, preview, generate A4, selection editor, nudge/crop/replace, undo.
5. Jangan edit `dist/extension` secara manual.

## Known design choice

`main.jsx` masih monolitik karena ia adalah host entry point ExtendScript. Pemecahan file host adalah pekerjaan fase berikutnya dan harus memakai mekanisme include/loader yang benar-benar kompatibel dengan ExtendScript sebelum diterapkan.
