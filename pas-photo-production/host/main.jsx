/* =====================================================================
 * Pas Foto Production Manager v2.3.0  —  host/main.jsx
 * ---------------------------------------------------------------------
 * ExtendScript (Adobe Illustrator 2021+ / ES3 engine).
 *
 * PERUBAHAN BESAR v2.3.0
 *  - OUTPUT TIDAK LAGI TER-GROUP.
 *    Tidak ada lagi group bertingkat "PAS FOTO JOB > SHEET > PHOTOS > 4x6 > Slot".
 *    Setiap foto ditaruh LANGSUNG di layer sebagai objek mandiri, sehingga
 *    bisa diklik, digeser, dihapus, dan diedit satu-satu tanpa perlu
 *    masuk isolation mode / ungroup manual.
 *  - 2 mode output (options.grouping):
 *      "flat"    -> DEFAULT. Setiap foto adalah satu clipping mask mandiri
 *                   ukuran aktual, tapi TIDAK dibungkus group induk.
 *      "grouped" -> perilaku lama (kompatibilitas).
 *  - Struktur memakai LAYER, bukan GROUP:
 *      "PF-001 Sheet 01"  (isi foto, ungrouped)
 *      "PF-001 Cut Guide" (garis potong, terkunci)
 *  - Offset border 1.5mm default digambar sebagai stroke hitam 0.3pt
 *    keluar dari clipping mask. Tidak ada shape putih. Offset border TIDAK
 *    mengurangi ukuran aktual foto/clip (4x6 tetap 40x60mm, dst).
 *  - Metadata slot disimpan di .note tiap objek -> editor tetap jalan.
 *  - Tambahan perintah: ungroupAll() untuk membongkar hasil generate lama.
 * ===================================================================== */

#target illustrator

/* ---------- JSON polyfill (ES3 Illustrator) ---------- */
if (typeof JSON !== "object") { JSON = {}; }
if (!JSON.stringify) {
  JSON.stringify = function (obj) {
    var t = typeof obj;
    if (t !== "object" || obj === null) {
      if (t === "string") {
        return '"' + obj.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
          .replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t') + '"';
      }
      if (t === "number" && !isFinite(obj)) return "null";
      return String(obj);
    }
    var json = [], arr = (obj && obj.constructor === Array);
    for (var k in obj) {
      if (!obj.hasOwnProperty(k)) continue;
      var v = obj[k], vt = typeof v;
      if (vt === "function" || vt === "undefined") continue;
      json.push((arr ? "" : '"' + k + '":') + JSON.stringify(v));
    }
    return (arr ? "[" : "{") + json.join(",") + (arr ? "]" : "}");
  };
}
if (!JSON.parse) {
  JSON.parse = function (str) { try { return eval("(" + str + ")"); } catch (e) { return {}; } };
}

var PFPM = PFPM || {};

(function (api) {
  var MM = 72 / 25.4;
  var SHEET_GAP_MM = 15;

  /* =============== utilitas =============== */
  function response(ok, message, data) {
    var r = { ok: ok, message: message };
    if (data !== undefined && data !== null) r.data = data;
    return JSON.stringify(r);
  }
  function payload(raw) {
    try { return JSON.parse(decodeURIComponent(raw || "%7B%7D")); }
    catch (e) { return {}; }
  }
  function safeName(v) { return String(v === undefined || v === null ? "ITEM" : v).replace(/[\\\/:*?"<>|\r\n]/g, "-"); }
  function pad2(n) { return (n < 10 ? "0" : "") + n; }
  function rgb(r, g, b) { var c = new RGBColor(); c.red = r; c.green = g; c.blue = b; return c; }
  function num(v, d) { v = Number(v); return isFinite(v) ? v : d; }

  function activeDoc() {
    if (app.documents.length === 0) throw new Error("Tidak ada dokumen Illustrator yang terbuka.");
    return app.activeDocument;
  }

  function getMeta(item) {
    if (!item) return null;
    var note = "";
    try { note = item.note; } catch (e) { return null; }
    if (!note) return null;
    try {
      var m = JSON.parse(note);
      return (m && m.pfpm) ? m : null;
    } catch (e) { return null; }
  }

  function getBorderMeta(item) {
    if (!item) return null;
    try {
      var note = item.note;
      if (!note) return null;
      var m = JSON.parse(note);
      return (m && m.pfpmBorder) ? m : null;
    } catch (e) { return null; }
  }
  function setMeta(item, meta) {
    meta.pfpm = true;
    item.note = JSON.stringify(meta);
  }

  /* Cari objek slot dari apapun yang diklik user (naik ke atas parent). */
  function resolveSlot(item) {
    var cur = item, guard = 0;
    while (cur && guard++ < 40) {
      if (getMeta(cur)) return cur;
      try { cur = cur.parent; } catch (e) { return null; }
      if (!cur || cur.typename === "Layer" || cur.typename === "Document") return null;
    }
    return null;
  }

  function findSlotById(doc, slotId) {
    for (var i = 0; i < doc.pageItems.length; i++) {
      var m = getMeta(doc.pageItems[i]);
      if (m && m.slotId === slotId) return doc.pageItems[i];
    }
    return null;
  }

  function borderItemsForSlot(doc, slotId) {
    var out = [];
    for (var i = 0; i < doc.pageItems.length; i++) {
      var bm = getBorderMeta(doc.pageItems[i]);
      if (bm && bm.slotId === slotId) out.push(doc.pageItems[i]);
    }
    return out;
  }

  function selectedSlots() {
    var doc = activeDoc();
    var sel = doc.selection;
    var out = [], seen = {};
    if (!sel || !sel.length) return out;
    for (var i = 0; i < sel.length; i++) {
      var s = resolveSlot(sel[i]);
      if (!s) {
        var bm = getBorderMeta(sel[i]);
        if (bm && bm.slotId) s = findSlotById(doc, bm.slotId);
      }
      if (!s) continue;
      var m = getMeta(s);
      var key = m.slotId + "|" + s.left + "|" + s.top;
      if (seen[key]) continue;
      seen[key] = true;
      out.push(s);
    }
    return out;
  }

  function findClipPath(item) {
    if (!item) return null;
    if (item.typename === "PathItem" && item.clipping) return item;
    if (item.typename === "GroupItem") {
      for (var i = 0; i < item.pageItems.length; i++) {
        var f = findClipPath(item.pageItems[i]);
        if (f) return f;
      }
    }
    return null;
  }
  function findPlaced(item) {
    if (!item) return null;
    if (item.typename === "PlacedItem" || item.typename === "RasterItem") return item;
    if (item.typename === "GroupItem") {
      for (var i = 0; i < item.pageItems.length; i++) {
        var f = findPlaced(item.pageItems[i]);
        if (f) return f;
      }
    }
    return null;
  }

  /* =============== layer helper =============== */
  function getLayer(doc, name, locked) {
    var lyr = null;
    for (var i = 0; i < doc.layers.length; i++) {
      if (doc.layers[i].name === name) { lyr = doc.layers[i]; break; }
    }
    if (!lyr) {
      lyr = doc.layers.add();
      lyr.name = name;
    }
    lyr.locked = false;
    lyr.visible = true;
    if (locked) lyr.locked = false; // dikunci belakangan setelah diisi
    return lyr;
  }

  function nextJobId(doc) {
    var used = {}, i, m;
    for (i = 0; i < doc.layers.length; i++) {
      m = doc.layers[i].name.match(/^PF-(\d+)\b/);
      if (m) used[parseInt(m[1], 10)] = true;
    }
    for (i = 0; i < doc.groupItems.length; i++) {
      m = doc.groupItems[i].name.match(/PF-(\d+)/);
      if (m) used[parseInt(m[1], 10)] = true;
    }
    var n = 1; while (used[n]) n++;
    return "PF-" + (n < 10 ? "00" : n < 100 ? "0" : "") + n;
  }

  /* =============== penempatan foto =============== */
  function fitPlaced(placed, frame, meta) {
    var crop = meta.crop || { x: 0, y: 0, scale: 100 };

    if (meta.rotation) placed.rotate(meta.rotation, true, true, true, true, Transformation.CENTER);

    var pw = placed.width || 1;
    var ph = placed.height || 1;
    var ratio = (meta.fitMode === "fit")
      ? Math.min(frame.w / pw, frame.h / ph)
      : Math.max(frame.w / pw, frame.h / ph);
    if (!isFinite(ratio) || ratio <= 0) ratio = 1;
    placed.resize(ratio * 100, ratio * 100, true, true, true, true, ratio * 100, Transformation.CENTER);

    var sc = num(crop.scale, 100);
    if (sc && sc !== 100) {
      placed.resize(sc, sc, true, true, true, true, sc, Transformation.CENTER);
    }
    if (meta.flipH || meta.flipV) {
      placed.resize(meta.flipH ? -100 : 100, meta.flipV ? -100 : 100,
        true, true, true, true, 0, Transformation.CENTER);
    }

    placed.left = frame.left + (frame.w - placed.width) / 2 + num(crop.x, 0) * MM;
    placed.top = frame.top - (frame.h - placed.height) / 2 - num(crop.y, 0) * MM;
  }

  function markBorder(item, slotId) {
    item.note = JSON.stringify({ pfpmBorder: true, slotId: slotId });
  }

  function drawOffsetBorder(parent, top, left, fw, fh, offsetBorder, baseName, slotId) {
    var black = rgb(0, 0, 0);
    var o = Math.max(0, offsetBorder);
    var stroke = parent.pathItems.rectangle(top + o, left - o, fw + (2 * o), fh + (2 * o));
    stroke.name = baseName + " (OFFSET BORDER " + Math.round((o / MM) * 100) / 100 + "mm / 0.3PT)";
    stroke.filled = false;
    stroke.stroked = true;
    stroke.strokeColor = black;
    stroke.strokeWidth = 0.3;
    markBorder(stroke, slotId);
    try { stroke.move(parent, ElementPlacement.PLACEATBEGINNING); } catch (e) {}
  }

  function bringBordersToFront(parent) {
    var borders = [], i;
    for (i = 0; i < parent.pageItems.length; i++) {
      if (getBorderMeta(parent.pageItems[i])) borders.push(parent.pageItems[i]);
    }
    for (i = 0; i < borders.length; i++) {
      try { borders[i].zOrder(ZOrderMethod.BRINGTOFRONT); } catch (e) {}
    }
  }

  function createSlot(doc, parent, slot, origin, mode, noBorder) {
    var left = origin.left + num(slot.x, 0) * MM;
    var top = origin.top - num(slot.y, 0) * MM;
    var fw = num(slot.width, 10) * MM;
    var fh = num(slot.height, 10) * MM;
    var offsetBorder = Math.max(0, num(slot.offsetBorder !== undefined ? slot.offsetBorder : slot.borderWidth, 1.5)) * MM;

    var file = new File(slot.sourcePath);
    if (!file.exists) throw new Error("File foto tidak ditemukan: " + slot.sourcePath);

    var baseName = "PF " + safeName(slot.label || slot.sizeId) + " #" + safeName(slot.slotId);

    var meta = {
      pfpm: true,
      version: 2,
      jobId: origin.jobId,
      sheet: origin.sheetIndex,
      slotId: slot.slotId,
      sizeId: slot.sizeId,
      label: slot.label,
      sourceId: slot.sourceId,
      sourcePath: slot.sourcePath,
      crop: slot.crop || { x: 0, y: 0, scale: 100 },
      rotation: num(slot.rotation, 0),
      flipH: false,
      flipV: false,
      physicalWidth: slot.physicalWidth,
      physicalHeight: slot.physicalHeight,
      offsetBorder: num(slot.offsetBorder !== undefined ? slot.offsetBorder : slot.borderWidth, 1.5),
      mode: mode,
      fitMode: "fill",
      frame: { left: left, top: top, w: fw, h: fh }
    };

    meta.frame = { left: left, top: top, w: fw, h: fh };

    var clipGroup = parent.groupItems.add();
    clipGroup.name = baseName;

    var clip = clipGroup.pathItems.rectangle(top, left, fw, fh);
    clip.name = "FRAME " + slot.physicalWidth + "x" + slot.physicalHeight + "mm";
    clip.stroked = false;
    clip.filled = false;

    var placed = doc.placedItems.add();
    placed.file = file;
    placed.name = "PHOTO " + safeName(slot.sourceId);
    placed.move(clipGroup, ElementPlacement.PLACEATEND);

    fitPlaced(placed, meta.frame, meta);

    clip.move(clipGroup, ElementPlacement.PLACEATBEGINNING);
    clip.clipping = true;
    clipGroup.clipped = true;

    setMeta(clipGroup, meta);
    if (!noBorder) drawOffsetBorder(parent, top, left, fw, fh, offsetBorder, baseName, slot.slotId);
    return clipGroup;
  }

  /* =============== cutting guide =============== */
  function drawCutGuide(doc, layer, sheet, origin) {
    var lines = {}, i, s;
    function key(v) { return String(Math.round(v * 100) / 100); }

    for (i = 0; i < sheet.slots.length; i++) {
      s = sheet.slots[i];
      lines["v" + key(s.x)] = s.x;
      lines["v" + key(s.x + s.width)] = s.x + s.width;
      lines["h" + key(s.y)] = s.y;
      lines["h" + key(s.y + s.height)] = s.y + s.height;
    }

    var col = rgb(255, 0, 255);
    for (var k in lines) {
      if (!lines.hasOwnProperty(k)) continue;
      var val = lines[k];
      var p = layer.pathItems.add();
      p.filled = false;
      p.stroked = true;
      p.strokeColor = col;
      p.strokeWidth = 0.25;
      p.name = "CUT " + k;
      if (k.charAt(0) === "v") {
        var x = origin.left + val * MM;
        p.setEntirePath([[x, origin.top], [x, origin.top - sheet.height * MM]]);
      } else {
        var y = origin.top - val * MM;
        p.setEntirePath([[origin.left, y], [origin.left + sheet.width * MM, y]]);
      }
    }
  }

  /* =============== artboard =============== */
  function ensureArtboard(doc, index, sheet, origin) {
    var rect = [origin.left, origin.top, origin.left + sheet.width * MM, origin.top - sheet.height * MM];
    var ab;
    if (index === 0 && doc.artboards.length >= 1) {
      ab = doc.artboards[0];
      ab.artboardRect = rect;
    } else if (index < doc.artboards.length) {
      ab = doc.artboards[index];
      ab.artboardRect = rect;
    } else {
      ab = doc.artboards.add(rect);
    }
    ab.name = "Sheet " + pad2(index + 1);
    return ab;
  }

  function mediaSize(type) {
    var m = {
      A3: [297, 420], A4: [210, 297], A5: [148, 210], A6: [105, 148],
      LETTER: [216, 279], "4R": [102, 152], "10x15": [100, 150], "20x30": [200, 300]
    };
    return m[type] || m.A4;
  }

  /* =====================================================================
   * COMMAND: createDocument
   * ===================================================================== */
  api.createDocument = function (raw) {
    var prevLevel = null;
    try {
      var data = payload(raw);
      var media = data.media || {};
      var size = mediaSize(media.type || "A4");
      var w = size[0], h = size[1];
      if (media.orientation === "landscape") { var tmp = w; w = h; h = tmp; }

      // Redam alert/dialog interupsi (mis. profile mismatch) selama proses
      // pembuatan dokumen supaya alurnya tidak terhenti menunggu klik user.
      try {
        prevLevel = app.userInteractionLevel;
        app.userInteractionLevel = UserInteractionLevel.DONTDISPLAYALERTS;
      } catch (eLvl) { prevLevel = null; }

      // documents.add(colorSpace, width, height) sudah langsung membuat artboard
      // tunggal berukuran & berposisi [0,0,w,-h] -- TIDAK di-assign ulang ke
      // artboardRect di sini lagi, karena assign ulang ke nilai yang sudah sama
      // itulah yang memicu Illustrator melakukan re-layout/repaint tambahan
      // (terlihat sebagai "loncatan" kasar di workspace).
      var doc = app.documents.add(DocumentColorSpace.RGB, w * MM, h * MM);
      doc.artboards[0].name = (media.type || "A4") + " " + (media.orientation || "portrait");

      // Samakan satuan ruler dokumen baru dengan satuan kerja tool ini (mm)
      // supaya tidak ada "loncatan" satuan saat lanjut ke Generate.
      try { doc.rulerUnits = RulerUnits.Millimeters; } catch (eRuler) {}

      // Tidak lagi memanggil app.redraw() secara terpisah sebelum fitall --
      // redraw manual di sini yang menyebabkan dokumen sempat tergambar pada
      // posisi/zoom default sesaat sebelum "melompat" ke tampilan fit-all.
      // Cukup satu kali repaint akhir lewat fitall supaya dokumen langsung
      // muncul dalam kondisi final (smooth, tanpa gerakan kasar).
      try { app.executeMenuCommand("fitall"); } catch (e2) {}

      if (prevLevel !== null) { try { app.userInteractionLevel = prevLevel; } catch (eLvl2) {} }

      return response(true, "Dokumen baru dibuat: " + (media.type || "A4") + " " + Math.round(w) + "x" + Math.round(h) + "mm.", { width: w, height: h });
    } catch (e) {
      if (prevLevel !== null) { try { app.userInteractionLevel = prevLevel; } catch (eLvl3) {} }
      return response(false, "Create document gagal: " + e.message);
    }
  };

  /* =====================================================================
   * COMMAND: generate
   * ===================================================================== */
  api.generate = function (raw) {
    var created = [];
    var doc;
    try {
      doc = activeDoc();
      var data = payload(raw);
      var layout = data.layout;
      if (!layout || !layout.sheets || !layout.sheets.length) {
        return response(false, "Layout kosong. Jalankan Preview terlebih dahulu.");
      }

      var opts = layout.options || {};
      var mode = data.grouping || opts.grouping || "flat";
      if (mode !== "flat" && mode !== "grouped") mode = "flat";

      var jobId = data.jobId || nextJobId(doc);
      var useArtboards = data.artboards !== false;

      var totalSlots = 0;
      var i, j;

      for (i = 0; i < layout.sheets.length; i++) {
        var sheet = layout.sheets[i];
        var origin = {
          left: i * (sheet.width + SHEET_GAP_MM) * MM,
          top: 0,
          jobId: jobId,
          sheetIndex: i + 1
        };

        if (useArtboards) ensureArtboard(doc, i, sheet, origin);

        var photoLayer = getLayer(doc, jobId + " Sheet " + pad2(i + 1));
        created.push(photoLayer);

        var parent = photoLayer;
        if (mode === "grouped") {
          var g = photoLayer.groupItems.add();
          g.name = "PAS FOTO JOB - " + jobId + " / SHEET " + pad2(i + 1);
          parent = g;
        }

        for (j = 0; j < sheet.slots.length; j++) {
          createSlot(doc, parent, sheet.slots[j], origin, mode, !!opts.noBorder);
          totalSlots++;
        }
        bringBordersToFront(parent);

        if (opts.cutGuide) {
          var guideLayer = getLayer(doc, jobId + " Cut Guide " + pad2(i + 1));
          created.push(guideLayer);
          drawCutGuide(doc, guideLayer, sheet, origin);
          guideLayer.locked = true;
        }
      }

      doc.selection = null;
      app.redraw();

      return response(true,
        "Berhasil: " + totalSlots + " foto pada " + layout.sheets.length + " lembar (" +
        (mode === "flat" ? "ungrouped / clipping mask" : "grouped") + ").",
        { jobId: jobId, slots: totalSlots, sheets: layout.sheets.length, mode: mode });

    } catch (e) {
      try {
        for (var c = created.length - 1; c >= 0; c--) {
          try { created[c].locked = false; created[c].remove(); } catch (e2) {}
        }
      } catch (e3) {}
      return response(false, "Generate gagal: " + e.message);
    }
  };

  /* =====================================================================
   * COMMAND: ungroupAll
   * ===================================================================== */
  api.ungroupAll = function () {
    try {
      var doc = activeDoc();
      var moved = 0;

      function isSlotGroup(g) {
        var m = getMeta(g);
        return !!m;
      }

      function flatten(container, targetLayer, depth) {
        if (depth > 12) return;
        var groups = [];
        var i;
        for (i = 0; i < container.groupItems.length; i++) groups.push(container.groupItems[i]);
        for (i = 0; i < groups.length; i++) {
          var g = groups[i];
          if (!g || !g.parent) continue;
          if (g.clipped || isSlotGroup(g)) {
            try { g.move(targetLayer, ElementPlacement.PLACEATEND); moved++; } catch (e) {}
            continue;
          }
          flatten(g, targetLayer, depth + 1);
          var kids = [];
          for (var k = 0; k < g.pageItems.length; k++) kids.push(g.pageItems[k]);
          for (var n = 0; n < kids.length; n++) {
            try { kids[n].move(targetLayer, ElementPlacement.PLACEATEND); moved++; } catch (e) {}
          }
          try { g.remove(); } catch (e) {}
        }
      }

      for (var L = 0; L < doc.layers.length; L++) {
        var lyr = doc.layers[L];
        if (lyr.locked) continue;
        flatten(lyr, lyr, 0);
      }

      app.redraw();
      return response(true, "Ungroup selesai. " + moved + " objek dilepas dari group.", { moved: moved });
    } catch (e) {
      return response(false, "Ungroup gagal: " + e.message);
    }
  };

  /* =====================================================================
   * EDITOR
   * ===================================================================== */
  api.selectionInfo = function () {
    try {
      var slots = selectedSlots();
      if (!slots.length) return response(true, "Tidak ada slot terpilih.", { count: 0 });
      var m = getMeta(slots[0]);
      return response(true, slots.length + " slot terpilih.", {
        count: slots.length,
        slotId: m.slotId,
        label: m.label,
        sourceId: m.sourceId,
        sourcePath: m.sourcePath,
        rotation: m.rotation,
        crop: m.crop,
        mode: m.mode,
        size: m.physicalWidth + "x" + m.physicalHeight + "mm"
      });
    } catch (e) { return response(false, e.message); }
  };

  function rebuildPhoto(doc, slotItem, meta) {
    if (meta.mode === "none" || slotItem.typename === "PlacedItem") {
      var file = new File(meta.sourcePath);
      if (!file.exists) throw new Error("Foto sumber tidak ditemukan: " + meta.sourcePath);
      var parent = slotItem.parent;
      var np = doc.placedItems.add();
      np.file = file;
      np.move(parent, ElementPlacement.PLACEATBEGINNING);
      np.name = slotItem.name;
      fitPlaced(np, meta.frame, meta);
      setMeta(np, meta);
      try { slotItem.remove(); } catch (e) {}
      return np;
    }

    var clip = findClipPath(slotItem);
    if (!clip) throw new Error("Clipping frame tidak ditemukan pada slot ini.");
    var frame = { left: clip.left, top: clip.top, w: clip.width, h: clip.height };
    meta.frame = frame;

    var old = findPlaced(slotItem);
    var container = old ? old.parent : slotItem;
    var f2 = new File(meta.sourcePath);
    if (!f2.exists) throw new Error("Foto sumber tidak ditemukan: " + meta.sourcePath);
    if (old) { try { old.remove(); } catch (e) {} }

    var placed = doc.placedItems.add();
    placed.file = f2;
    placed.name = "PHOTO " + safeName(meta.sourceId);
    placed.move(container, ElementPlacement.PLACEATEND);
    fitPlaced(placed, frame, meta);

    setMeta(slotItem, meta);
    return slotItem;
  }

  function applyToSelection(fn, okMsg) {
    try {
      var doc = activeDoc();
      var slots = selectedSlots();
      if (!slots.length) return response(false, "Pilih minimal satu slot foto di artboard.");
      var reselect = [];
      for (var i = 0; i < slots.length; i++) {
        var r = fn(doc, slots[i], getMeta(slots[i]));
        if (r) reselect.push(r);
      }
      // beberapa aksi (crop/flip/replace/duplicate) membuat page item baru di Illustrator,
      // yang otomatis mereset doc.selection hanya ke item terakhir yang dibuat.
      // Kembalikan seleksi ke seluruh slot yang baru diproses agar mode batch tetap
      // aktif untuk aksi berikutnya (mis. klik tombol zoom berkali-kali).
      if (reselect.length) { try { doc.selection = reselect; } catch (eSel) {} }
      app.redraw();
      return response(true, okMsg.replace("{n}", slots.length), { count: slots.length });
    } catch (e) { return response(false, e.message); }
  }

  api.nudge = function (raw) {
    var d = payload(raw);
    var dx = num(d.dx, 0) * MM, dy = num(d.dy, 0) * MM;
    return applyToSelection(function (doc, item, meta) {
      item.left += dx;
      item.top -= dy;
      var borders = borderItemsForSlot(doc, meta.slotId);
      for (var b = 0; b < borders.length; b++) { borders[b].left += dx; borders[b].top -= dy; }
      if (meta) {
        meta.frame.left += dx;
        meta.frame.top -= dy;
        setMeta(item, meta);
      }
    }, "{n} slot digeser.");
  };

  api.crop = function (raw) {
    var d = payload(raw);
    return applyToSelection(function (doc, item, meta) {
      meta.crop = meta.crop || { x: 0, y: 0, scale: 100 };
      if (d.reset) meta.crop = { x: 0, y: 0, scale: 100 };
      else {
        meta.crop.x = num(meta.crop.x, 0) + num(d.dx, 0);
        meta.crop.y = num(meta.crop.y, 0) + num(d.dy, 0);
        if (d.scale) meta.crop.scale = Math.max(20, Math.min(600, num(meta.crop.scale, 100) + num(d.scale, 0)));
      }
      return rebuildPhoto(doc, item, meta);
    }, "Crop diterapkan pada {n} slot.");
  };

  api.flip = function (raw) {
    var d = payload(raw);
    return applyToSelection(function (doc, item, meta) {
      if (d.horizontal) meta.flipH = !meta.flipH;
      if (d.vertical) meta.flipV = !meta.flipV;
      return rebuildPhoto(doc, item, meta);
    }, "Flip diterapkan pada {n} slot.");
  };

  api.rotate90 = function () {
    return applyToSelection(function (doc, item, meta) {
      item.rotate(90, true, true, true, true, Transformation.CENTER);
      var borders = borderItemsForSlot(doc, meta.slotId);
      for (var b = 0; b < borders.length; b++) borders[b].rotate(90, true, true, true, true, Transformation.CENTER);
      meta.rotation = (num(meta.rotation, 0) + 90) % 360;
      meta.frame = { left: item.left, top: item.top, w: item.width, h: item.height };
      setMeta(item, meta);
    }, "{n} slot diputar 90\u00b0.");
  };

  api.replacePhoto = function (raw) {
    var d = payload(raw);
    if (!d.path) return response(false, "Path foto baru tidak diberikan.");
    return applyToSelection(function (doc, item, meta) {
      meta.sourcePath = d.path;
      meta.sourceId = d.sourceId || meta.sourceId;
      meta.crop = { x: 0, y: 0, scale: 100 };
      return rebuildPhoto(doc, item, meta);
    }, "Foto pada {n} slot diganti.");
  };

  api.duplicateSlot = function (raw) {
    var d = payload(raw);
    // Arah duplikat: "right" (default, perilaku lama), "left", "up", "down".
    var dir = (d.dir === "left" || d.dir === "up" || d.dir === "down") ? d.dir : "right";
    var horizontal = (dir === "left" || dir === "right");

    return applyToSelection(function (doc, item, meta) {
      var borders = borderItemsForSlot(doc, meta.slotId);
      // Geser sejauh lebar/tinggi border stroke ASLI (bukan lebar clip foto + gap
      // tetap 4pt) supaya tepi luar border stroke slot duplikat menempel
      // berdempetan pas dengan tepi luar border stroke slot original,
      // tanpa celah maupun tumpang tindih. Arah kiri/kanan pakai lebar border,
      // arah atas/bawah pakai tinggi border.
      var shiftAmt = borders.length
        ? (horizontal ? borders[0].width : borders[0].height)
        : (horizontal ? item.width : item.height);

      var dx = 0, dy = 0;
      if (dir === "right") dx = shiftAmt;
      else if (dir === "left") dx = -shiftAmt;
      else if (dir === "up") dy = shiftAmt;
      else if (dir === "down") dy = -shiftAmt;

      var dup = item.duplicate(item.parent, ElementPlacement.PLACEATEND);
      dup.left = item.left + dx;
      dup.top = item.top + dy;
      var m2 = getMeta(dup) || meta;
      m2.slotId = meta.slotId + "-copy";
      m2.frame = { left: m2.frame.left + dx, top: m2.frame.top + dy, w: m2.frame.w, h: m2.frame.h };
      setMeta(dup, m2);
      for (var b = 0; b < borders.length; b++) {
        var bd = borders[b].duplicate(borders[b].parent, ElementPlacement.PLACEATEND);
        bd.left = borders[b].left + dx;
        bd.top = borders[b].top + dy;
        markBorder(bd, m2.slotId);
      }
      return dup;
    }, "{n} slot diduplikasi.");
  };

  api.deleteSlot = function () {
    return applyToSelection(function (doc, item, meta) {
      var borders = borderItemsForSlot(doc, meta.slotId);
      for (var b = borders.length - 1; b >= 0; b--) { try { borders[b].remove(); } catch (e) {} }
      try { item.remove(); } catch (e) {}
    }, "{n} slot dihapus.");
  };

  api.undo = function () {
    try { app.undo(); app.redraw(); return response(true, "Undo."); }
    catch (e) {
      try { app.executeMenuCommand("undo"); return response(true, "Undo."); }
      catch (e2) { return response(false, "Undo gagal: " + e2.message); }
    }
  };

  /* =====================================================================
   * SOURCE HELPERS
   * ===================================================================== */
  api.pickFiles = function () {
    try {
      var files = File.openDialog("Pilih foto (JPG / PNG / TIFF)", "*.jpg;*.jpeg;*.png;*.tif;*.tiff", true);
      if (!files) return response(true, "Dibatalkan.", { files: [] });
      if (!(files instanceof Array)) files = [files];
      var out = [];
      for (var i = 0; i < files.length; i++) {
        out.push({ path: files[i].fsName, name: decodeURI(files[i].name) });
      }
      return response(true, out.length + " file dipilih.", { files: out });
    } catch (e) { return response(false, e.message); }
  };

  api.fromSelection = function () {
    try {
      var doc = activeDoc();
      var sel = doc.selection;
      if (!sel || !sel.length) return response(false, "Tidak ada objek terpilih di Illustrator.");
      var out = [];
      function walk(it) {
        if (!it) return;
        if (it.typename === "PlacedItem" || it.typename === "RasterItem") {
          try {
            var f = it.file;
            if (f) out.push({ path: f.fsName, name: decodeURI(f.name) });
          } catch (e) {}
          return;
        }
        if (it.typename === "GroupItem") {
          for (var i = 0; i < it.pageItems.length; i++) walk(it.pageItems[i]);
        }
      }
      for (var i = 0; i < sel.length; i++) walk(sel[i]);
      if (!out.length) return response(false, "Objek terpilih bukan foto linked (PlacedItem).");
      return response(true, out.length + " foto diambil dari seleksi.", { files: out });
    } catch (e) { return response(false, e.message); }
  };

  api.docInfo = function () {
    try {
      var doc = activeDoc();
      return response(true, "OK", {
        name: doc.name,
        artboards: doc.artboards.length,
        version: app.version
      });
    } catch (e) { return response(false, e.message); }
  };

  api.ping = function () { return response(true, "PFPM host v2.3.0 siap.", { version: "2.3.0" }); };

})(PFPM);
