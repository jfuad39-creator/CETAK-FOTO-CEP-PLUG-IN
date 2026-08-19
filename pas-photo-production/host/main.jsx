/* =====================================================================
 * Pas Foto Production Manager v2.4.1 - host/main.jsx
 * (FIXED: setBackgroundBySize now properly iterates through all layers)
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

  function response(ok, message, data) { var r = { ok: ok, message: message }; if (data !== undefined && data !== null) r.data = data; return JSON.stringify(r); }
  function payload(raw) { try { return JSON.parse(decodeURIComponent(raw || "%7B%7D")); } catch (e) { return {}; } }
  function safeName(v) { return String(v === undefined || v === null ? "ITEM" : v).replace(/[\\\/:*?"<>|\r\n]/g, "-"); }
  function pad2(n) { return (n < 10 ? "0" : "") + n; }
  function rgb(r, g, b) { var c = new RGBColor(); c.red = r; c.green = g; c.blue = b; return c; }
  function num(v, d) { v = Number(v); return isFinite(v) ? v : d; }
  function hexToRgb(hex) {
    if (!hex || typeof hex !== "string") return null;
    var m = hex.replace(/^#/, "").match(/^([0-9a-fA-F]{6})$/);
    if (!m) return null;
    var n = parseInt(m[1], 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }
  function activeDoc() { if (app.documents.length === 0) throw new Error("Tidak ada dokumen Illustrator yang terbuka."); return app.activeDocument; }

  function getMeta(item) { if (!item) return null; var note = ""; try { note = item.note; } catch (e) { return null; } if (!note) return null; try { var m = JSON.parse(note); return (m && m.pfpm) ? m : null; } catch (e) { return null; } }
  function getBorderMeta(item) { if (!item) return null; try { var note = item.note; if (!note) return null; var m = JSON.parse(note); return (m && m.pfpmBorder) ? m : null; } catch (e) { return null; } }
  function setMeta(item, meta) { meta.pfpm = true; item.note = JSON.stringify(meta); }

  function resolveSlot(item) { var cur = item, guard = 0; while (cur && guard++ < 40) { if (getMeta(cur)) return cur; try { cur = cur.parent; } catch (e) { return null; } if (!cur || cur.typename === "Layer" || cur.typename === "Document") return null; } return null; }
  function findSlotById(doc, slotId) { for (var i = 0; i < doc.pageItems.length; i++) { var m = getMeta(doc.pageItems[i]); if (m && m.slotId === slotId) return doc.pageItems[i]; } return null; }
  function borderItemsForSlot(doc, slotId) { var out = []; for (var i = 0; i < doc.pageItems.length; i++) { var bm = getBorderMeta(doc.pageItems[i]); if (bm && bm.slotId === slotId) out.push(doc.pageItems[i]); } return out; }

  function selectedSlots() { var doc = activeDoc(); var sel = doc.selection; var out = [], seen = {}; if (!sel || !sel.length) return out; for (var i = 0; i < sel.length; i++) { var s = resolveSlot(sel[i]); if (!s) { var bm = getBorderMeta(sel[i]); if (bm && bm.slotId) s = findSlotById(doc, bm.slotId); } if (!s) continue; var m = getMeta(s); var key = m.slotId + "|" + s.left + "|" + s.top; if (seen[key]) continue; seen[key] = true; out.push(s); } return out; }

  function findClipPath(item) { if (!item) return null; if (item.typename === "PathItem" && item.clipping) return item; if (item.typename === "GroupItem") { for (var i = 0; i < item.pageItems.length; i++) { var f = findClipPath(item.pageItems[i]); if (f) return f; } } return null; }
  function findPlaced(item) { if (!item) return null; if (item.typename === "PlacedItem" || item.typename === "RasterItem") return item; if (item.typename === "GroupItem") { for (var i = 0; i < item.pageItems.length; i++) { var f = findPlaced(item.pageItems[i]); if (f) return f; } } return null; }

  function getLayer(doc, name) { var lyr = null; for (var i = 0; i < doc.layers.length; i++) { if (doc.layers[i].name === name) { lyr = doc.layers[i]; break; } } if (!lyr) { lyr = doc.layers.add(); lyr.name = name; } lyr.locked = false; lyr.visible = true; return lyr; }
  function nextJobId(doc) { var used = {}, i, m; for (i = 0; i < doc.layers.length; i++) { m = doc.layers[i].name.match(/^PF-(\d+)\b/); if (m) used[parseInt(m[1], 10)] = true; } for (i = 0; i < doc.groupItems.length; i++) { m = doc.groupItems[i].name.match(/PF-(\d+)/); if (m) used[parseInt(m[1], 10)] = true; } var n = 1; while (used[n]) n++; return "PF-" + (n < 10 ? "00" : n < 100 ? "0" : "") + n; }

  var GENERATED_LAYER_RE = /^PF-\d+\s+(Sheet|Cut Guide)\s+\d+/;
  function clearGenerated(doc) {
    var removed = 0;
    for (var i = doc.layers.length - 1; i >= 0; i--) {
      var lyr = doc.layers[i];
      if (GENERATED_LAYER_RE.test(lyr.name)) {
        try { lyr.locked = false; lyr.remove(); removed++; } catch (e) {}
      }
    }
    return removed;
  }

  function fitPlaced(placed, frame, meta) { var crop = meta.crop || { x: 0, y: 0, scale: 100 }; if (meta.rotation) placed.rotate(meta.rotation, true, true, true, true, Transformation.CENTER); var pw = placed.width || 1; var ph = placed.height || 1; var ratio = (meta.fitMode === "fit") ? Math.min(frame.w / pw, frame.h / ph) : Math.max(frame.w / pw, frame.h / ph); if (!isFinite(ratio) || ratio <= 0) ratio = 1; placed.resize(ratio * 100, ratio * 100, true, true, true, true, ratio * 100, Transformation.CENTER); var sc = num(crop.scale, 100); if (sc && sc !== 100) { placed.resize(sc, sc, true, true, true, true, sc, Transformation.CENTER); } if (meta.flipH || meta.flipV) { placed.resize(meta.flipH ? -100 : 100, meta.flipV ? -100 : 100, true, true, true, true, 0, Transformation.CENTER); } placed.left = frame.left + (frame.w - placed.width) / 2 + num(crop.x, 0) * MM; placed.top = frame.top - (frame.h - placed.height) / 2 - num(crop.y, 0) * MM; }

  function markBorder(item, slotId) { item.note = JSON.stringify({ pfpmBorder: true, slotId: slotId }); }
  function drawOffsetBorder(parent, top, left, fw, fh, offsetBorder, baseName, slotId) { var black = rgb(0, 0, 0); var o = Math.max(0, offsetBorder); var stroke = parent.pathItems.rectangle(top + o, left - o, fw + (2 * o), fh + (2 * o)); stroke.name = baseName + " (OFFSET BORDER " + Math.round((o / MM) * 100) / 100 + "mm / 0.3PT)"; stroke.filled = false; stroke.stroked = true; stroke.strokeColor = black; stroke.strokeWidth = 0.3; markBorder(stroke, slotId); try { stroke.move(parent, ElementPlacement.PLACEATBEGINNING); } catch (e) {} }
  function bringBordersToFront(parent) { var borders = [], i; for (i = 0; i < parent.pageItems.length; i++) { if (getBorderMeta(parent.pageItems[i])) borders.push(parent.pageItems[i]); } for (i = 0; i < borders.length; i++) { try { borders[i].zOrder(ZOrderMethod.BRINGTOFRONT); } catch (e) {} } }

  function addBackgroundRect(clipGroup, top, left, fw, fh, hex, baseName) {
    var c = hexToRgb(hex);
    if (!c) return null;
    var bg = clipGroup.pathItems.rectangle(top, left, fw, fh);
    bg.name = baseName + " (BG " + hex + ")";
    bg.filled = true;
    bg.fillColor = rgb(c.r, c.g, c.b);
    bg.stroked = false;
    return bg;
  }

  function findBgRect(clipGroup) {
    if (!clipGroup || clipGroup.typename !== "GroupItem") return null;
    for (var i = 0; i < clipGroup.pageItems.length; i++) {
      var it = clipGroup.pageItems[i];
      if (it.typename === "PathItem" && !it.clipping) return it;
    }
    return null;
  }

  function setSlotBackground(doc, slotItem, meta, hex) {
    if (!slotItem || slotItem.typename !== "GroupItem") return null;
    var bg = findBgRect(slotItem);
    var c = hexToRgb(hex);
    if (!c) {
      if (bg) { try { bg.remove(); } catch (e) {} }
      meta.backgroundColor = "";
    } else {
      if (!bg) {
        var clip = findClipPath(slotItem);
        if (clip) {
          bg = slotItem.pathItems.rectangle(clip.top, clip.left, clip.width, clip.height);
          bg.stroked = false;
          try { bg.move(slotItem, ElementPlacement.PLACEATEND); } catch (e) {}
        }
      }
      if (bg) {
        bg.filled = true;
        bg.fillColor = rgb(c.r, c.g, c.b);
        bg.stroked = false;
        bg.name = slotItem.name + " (BG " + hex + ")";
      }
      meta.backgroundColor = hex;
    }
    setMeta(slotItem, meta);
    return slotItem;
  }

  /* =========================================================================
   * FIX: Fungsi untuk mengumpulkan semua slot dari seluruh layer dokumen.
   * doc.pageItems hanya mengembalikan item di top-level, sedangkan slot
   * yang di-generate berada di dalam layer (dan mungkin group).
   * ========================================================================= */
  function collectAllSlots(doc) {
    var slots = [];
    
    function walkItems(container) {
      if (!container) return;
      var items;
      
      // Cek tipe container
      if (container.typename === "Document") {
        // Untuk Document, iterasi melalui semua layers
        for (var i = 0; i < container.layers.length; i++) {
          walkItems(container.layers[i]);
        }
        return;
      }
      
      // Untuk Layer atau GroupItem
      try {
        items = container.pageItems;
      } catch (e) {
        return;
      }
      
      if (!items) return;
      
      for (var j = 0; j < items.length; j++) {
        var item = items[j];
        var m = getMeta(item);
        if (m) {
          slots.push({ item: item, meta: m });
        }
        // Jika item adalah GroupItem, cek juga isinya (untuk mode grouped)
        if (item.typename === "GroupItem" && !m) {
          walkItems(item);
        }
      }
    }
    
    walkItems(doc);
    return slots;
  }

  /* Mengumpulkan daftar sizeId unik dari semua slot yang ada di dokumen */
  function collectUniqueSizes(doc) {
    var allSlots = collectAllSlots(doc);
    var seen = {};
    var sizes = [];
    for (var i = 0; i < allSlots.length; i++) {
      var m = allSlots[i].meta;
      if (m.sizeId && !seen[m.sizeId]) {
        seen[m.sizeId] = true;
        sizes.push({
          sizeId: m.sizeId,
          label: m.label || m.sizeId,
          physicalWidth: m.physicalWidth,
          physicalHeight: m.physicalHeight
        });
      }
    }
    return sizes;
  }

  function createSlot(doc, parent, slot, origin, mode, noBorder, fitMode) { var left = origin.left + num(slot.x, 0) * MM; var top = origin.top - num(slot.y, 0) * MM; var fw = num(slot.width, 10) * MM; var fh = num(slot.height, 10) * MM; var offsetBorder = Math.max(0, num(slot.offsetBorder !== undefined ? slot.offsetBorder : slot.borderWidth, 1.5)) * MM; var file = new File(slot.sourcePath); if (!file.exists) throw new Error("File foto tidak ditemukan: " + slot.sourcePath); var baseName = "PF " + safeName(slot.label || slot.sizeId) + " #" + safeName(slot.slotId); var bgHex = (typeof slot.backgroundColor === "string") ? slot.backgroundColor : ""; var meta = { pfpm: true, version: 2, jobId: origin.jobId, sheet: origin.sheetIndex, slotId: slot.slotId, sizeId: slot.sizeId, label: slot.label, sourceId: slot.sourceId, sourcePath: slot.sourcePath, crop: slot.crop || { x: 0, y: 0, scale: 100 }, rotation: num(slot.rotation, 0), flipH: false, flipV: false, physicalWidth: slot.physicalWidth, physicalHeight: slot.physicalHeight, offsetBorder: num(slot.offsetBorder !== undefined ? slot.offsetBorder : slot.borderWidth, 1.5), mode: mode, fitMode: (fitMode === "fit") ? "fit" : "fill", backgroundColor: bgHex, frame: { left: left, top: top, w: fw, h: fh } }; meta.frame = { left: left, top: top, w: fw, h: fh }; var clipGroup = parent.groupItems.add(); clipGroup.name = baseName; var clip = clipGroup.pathItems.rectangle(top, left, fw, fh); clip.name = "FRAME " + slot.physicalWidth + "x" + slot.physicalHeight + "mm"; clip.stroked = false; clip.filled = false; var bgRect = addBackgroundRect(clipGroup, top, left, fw, fh, bgHex, baseName); var placed = doc.placedItems.add(); placed.file = file; placed.name = "PHOTO " + safeName(slot.sourceId); placed.move(clipGroup, ElementPlacement.PLACEATEND); fitPlaced(placed, meta.frame, meta); if (bgRect) { try { bgRect.move(clipGroup, ElementPlacement.PLACEATEND); } catch (e) {} } clip.move(clipGroup, ElementPlacement.PLACEATBEGINNING); clip.clipping = true; clipGroup.clipped = true; setMeta(clipGroup, meta); if (!noBorder) drawOffsetBorder(parent, top, left, fw, fh, offsetBorder, baseName, slot.slotId); return clipGroup; }

  function drawCutGuide(doc, layer, sheet, origin) { var lines = {}, i, s; function key(v) { return String(Math.round(v * 100) / 100); } for (i = 0; i < sheet.slots.length; i++) { s = sheet.slots[i]; lines["v" + key(s.x)] = s.x; lines["v" + key(s.x + s.width)] = s.x + s.width; lines["h" + key(s.y)] = s.y; lines["h" + key(s.y + s.height)] = s.y + s.height; } var col = rgb(255, 0, 255); for (var k in lines) { if (!lines.hasOwnProperty(k)) continue; var val = lines[k]; var p = layer.pathItems.add(); p.filled = false; p.stroked = true; p.strokeColor = col; p.strokeWidth = 0.25; p.name = "CUT " + k; if (k.charAt(0) === "v") { var x = origin.left + val * MM; p.setEntirePath([[x, origin.top], [x, origin.top - sheet.height * MM]]); } else { var y = origin.top - val * MM; p.setEntirePath([[origin.left, y], [origin.left + sheet.width * MM, y]]); } } }

  function ensureArtboard(doc, index, sheet, origin) { var rect = [origin.left, origin.top, origin.left + sheet.width * MM, origin.top - sheet.height * MM]; var ab; if (index === 0 && doc.artboards.length >= 1) { ab = doc.artboards[0]; ab.artboardRect = rect; } else if (index < doc.artboards.length) { ab = doc.artboards[index]; ab.artboardRect = rect; } else { ab = doc.artboards.add(rect); } ab.name = "Sheet " + pad2(sheet.index || 1); return ab; }
  function mediaSize(media) {
    var type = (media && media.type) || "A4";
    if (type === "CUSTOM") {
      var cw = num(media.customWidth, 210), ch = num(media.customHeight, 297);
      if (cw <= 0) cw = 210;
      if (ch <= 0) ch = 297;
      return [cw, ch];
    }
    var m = { A3: [297, 420], A4: [210, 297], A5: [148, 210], A6: [105, 148], LETTER: [216, 279], "4R": [102, 152], "10R": [254, 305], "10x15": [100, 150], "20x30": [200, 300] };
    return m[type] || m.A4;
  }

  function pickStartupPreset() {
    var wanted = ["Print", "[Default] Print", "Basic RGB", "Web", "[Default] Web"];
    var list = [];
    try { list = app.startupPresetsList || []; } catch (e) { list = []; }
    var i, j;
    for (i = 0; i < wanted.length; i++) {
      for (j = 0; j < list.length; j++) {
        if (String(list[j]) === wanted[i]) return list[j];
      }
    }
    if (list.length) return list[0];
    return "Print";
  }

  api.createDocument = function (raw) {
    var prevLevel = null;
    try {
      var data = payload(raw);
      var media = data.media || {};
      var size = mediaSize(media);
      var w = size[0], h = size[1];
      if (media.orientation === "landscape") {
        var tmp = w;
        w = h;
        h = tmp;
      }

      try {
        prevLevel = app.userInteractionLevel;
        app.userInteractionLevel = UserInteractionLevel.DONTDISPLAYALERTS;
      } catch (e) { prevLevel = null; }

      var doc = null;
      var presetName = pickStartupPreset();

      try {
        if (typeof DocumentPreset !== "undefined" && app.documents.addDocument) {
          var dp = new DocumentPreset();
          var mediaLabel = (media.type === "CUSTOM") ? (Math.round(w) + "x" + Math.round(h) + "mm") : (media.type || "A4");
          dp.title          = "Pas Foto " + mediaLabel;
          dp.width          = w * MM;
          dp.height         = h * MM;
          dp.units          = RulerUnits.Millimeters;
          dp.colorMode      = DocumentColorSpace.RGB;
          dp.numArtboards   = 1;
          try { dp.previewMode  = DocumentPreviewMode.DefaultPreview; } catch (e) {}
          try { dp.rasterResolution = DocumentRasterResolution.ScreenResolution; } catch (e) {}
          try { dp.transparencyGrid = DocumentTransparencyGrid.TransparencyGridNone; } catch (e) {}
          doc = app.documents.addDocument(presetName, dp, false);
        }
      } catch (e) { doc = null; }

      if (!doc) {
        doc = app.documents.add(DocumentColorSpace.RGB, w * MM, h * MM);
      }

      try { doc.artboards[0].name = ((media.type === "CUSTOM") ? (Math.round(w) + "x" + Math.round(h) + "mm") : (media.type || "A4")) + " " + (media.orientation || "portrait"); } catch (e) {}
      try { doc.artboards.setActiveArtboardIndex(0); } catch (e) {}
      try { doc.rulerUnits = RulerUnits.Millimeters; } catch (e) {}
      try { doc.activate(); } catch (e) {}
      try { app.redraw(); } catch (e) {}

      if (prevLevel !== null) {
        try { app.userInteractionLevel = prevLevel; } catch (e) {}
      }
      return response(true,
        "Dokumen baru dibuat: " + (media.type || "A4") + " " + Math.round(w) + "x" + Math.round(h) + "mm.",
        { width: w, height: h });
    } catch (e) {
      if (prevLevel !== null) {
        try { app.userInteractionLevel = prevLevel; } catch (e) {}
      }
      return response(false, "Create document gagal: " + e.message);
    }
  };

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
      var replacePrev = data.replace !== false;
      var clearedCount = replacePrev ? clearGenerated(doc) : 0;
      var jobId = data.jobId || nextJobId(doc);
      var useArtboards = data.artboards !== false;
      var totalSlots = 0;
      var i, j;

      var firstArtboardIndex = 0;
      try { firstArtboardIndex = doc.artboards.getActiveArtboardIndex(); } catch (e) {}
      var anchorRect = doc.artboards[firstArtboardIndex].artboardRect;
      var anchorLeft = anchorRect[0];
      var anchorTop = anchorRect[1];

      for (i = 0; i < layout.sheets.length; i++) {
        var sheet = layout.sheets[i];
        var origin = { left: anchorLeft + i * (sheet.width + SHEET_GAP_MM) * MM, top: anchorTop, jobId: jobId, sheetIndex: i + 1 };
        if (useArtboards) ensureArtboard(doc, firstArtboardIndex + i, sheet, origin);
        var photoLayer = getLayer(doc, jobId + " Sheet " + pad2(i + 1));
        created.push(photoLayer);
        var parent = photoLayer;
        if (mode === "grouped") {
          var g = photoLayer.groupItems.add();
          g.name = "PAS FOTO JOB - " + jobId + " / SHEET " + pad2(i + 1);
          parent = g;
        }
        for (j = 0; j < sheet.slots.length; j++) {
          createSlot(doc, parent, sheet.slots[j], origin, mode, !!opts.noBorder, opts.fitMode);
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
      if (useArtboards) {
        try { doc.artboards.setActiveArtboardIndex(firstArtboardIndex); } catch (e) {}
      }
      app.redraw();
      var doneMsg = "Berhasil: " + totalSlots + " foto pada " + layout.sheets.length + " lembar (" + (mode === "flat" ? "ungrouped / clipping mask" : "grouped") + ")." + (clearedCount > 0 ? " Hasil generate sebelumnya (" + clearedCount + " layer) dihapus otomatis." : "");
      return response(true, doneMsg, { jobId: jobId, slots: totalSlots, sheets: layout.sheets.length, mode: mode, cleared: clearedCount });
    } catch (e) {
      try { for (var c = created.length - 1; c >= 0; c--) { try { created[c].locked = false; created[c].remove(); } catch (e2) {} } } catch (e3) {}
      return response(false, "Generate gagal: " + e.message);
    }
  };

  api.ungroupAll = function () { try { var doc = activeDoc(); var moved = 0; function isSlotGroup(g) { return !!getMeta(g); } function flatten(container, targetLayer, depth) { if (depth > 12) return; var groups = []; var i; for (i = 0; i < container.groupItems.length; i++) groups.push(container.groupItems[i]); for (i = 0; i < groups.length; i++) { var g = groups[i]; if (!g || !g.parent) continue; if (g.clipped || isSlotGroup(g)) { try { g.move(targetLayer, ElementPlacement.PLACEATEND); moved++; } catch (e) {} continue; } flatten(g, targetLayer, depth + 1); var kids = []; for (var k = 0; k < g.pageItems.length; k++) kids.push(g.pageItems[k]); for (var n = 0; n < kids.length; n++) { try { kids[n].move(targetLayer, ElementPlacement.PLACEATEND); moved++; } catch (e) {} } try { g.remove(); } catch (e) {} } } for (var L = 0; L < doc.layers.length; L++) { var lyr = doc.layers[L]; if (lyr.locked) continue; flatten(lyr, lyr, 0); } app.redraw(); return response(true, "Ungroup selesai. " + moved + " objek dilepas dari group.", { moved: moved }); } catch (e) { return response(false, "Ungroup gagal: " + e.message); } };

  api.selectionInfo = function () { try { var slots = selectedSlots(); if (!slots.length) return response(true, "Tidak ada slot terpilih.", { count: 0 }); var m = getMeta(slots[0]); return response(true, slots.length + " slot terpilih.", { count: slots.length, slotId: m.slotId, sizeId: m.sizeId, label: m.label, sourceId: m.sourceId, sourcePath: m.sourcePath, rotation: m.rotation, crop: m.crop, mode: m.mode, backgroundColor: m.backgroundColor || "", size: m.physicalWidth + "x" + m.physicalHeight + "mm" }); } catch (e) { return response(false, e.message); } };

  /* API baru: mendapatkan daftar ukuran unik dari slot yang sudah di-generate */
  api.getGeneratedSizes = function () {
    try {
      var doc = activeDoc();
      var sizes = collectUniqueSizes(doc);
      if (!sizes.length) {
        return response(true, "Tidak ada slot yang di-generate.", { sizes: [] });
      }
      return response(true, sizes.length + " ukuran ditemukan.", { sizes: sizes });
    } catch (e) {
      return response(false, e.message);
    }
  };

  function rebuildPhoto(doc, slotItem, meta) { if (meta.mode === "none" || slotItem.typename === "PlacedItem") { var file = new File(meta.sourcePath); if (!file.exists) throw new Error("Foto sumber tidak ditemukan: " + meta.sourcePath); var parent = slotItem.parent; var np = doc.placedItems.add(); np.file = file; np.move(parent, ElementPlacement.PLACEATBEGINNING); np.name = slotItem.name; fitPlaced(np, meta.frame, meta); setMeta(np, meta); try { slotItem.remove(); } catch (e) {} return np; } var clip = findClipPath(slotItem); if (!clip) throw new Error("Clipping frame tidak ditemukan pada slot ini."); var frame = { left: clip.left, top: clip.top, w: clip.width, h: clip.height }; meta.frame = frame; var old = findPlaced(slotItem); var container = old ? old.parent : slotItem; var f2 = new File(meta.sourcePath); if (!f2.exists) throw new Error("Foto sumber tidak ditemukan: " + meta.sourcePath); if (old) { try { old.remove(); } catch (e) {} } var placed = doc.placedItems.add(); placed.file = f2; placed.name = "PHOTO " + safeName(meta.sourceId); placed.move(container, ElementPlacement.PLACEATEND); fitPlaced(placed, frame, meta); setMeta(slotItem, meta); return slotItem; }

  function applyToSelection(fn, okMsg) { try { var doc = activeDoc(); var slots = selectedSlots(); if (!slots.length) return response(false, "Pilih minimal satu slot foto di artboard."); var reselect = []; for (var i = 0; i < slots.length; i++) { var r = fn(doc, slots[i], getMeta(slots[i])); if (r) reselect.push(r); } if (reselect.length) { try { doc.selection = reselect; } catch (e) {} } app.redraw(); return response(true, okMsg.replace("{n}", slots.length), { count: slots.length }); } catch (e) { return response(false, e.message); } }

  api.nudge = function (raw) { var d = payload(raw); var dx = num(d.dx, 0) * MM, dy = num(d.dy, 0) * MM; return applyToSelection(function (doc, item, meta) { item.left += dx; item.top -= dy; var borders = borderItemsForSlot(doc, meta.slotId); for (var b = 0; b < borders.length; b++) { borders[b].left += dx; borders[b].top -= dy; } if (meta) { meta.frame.left += dx; meta.frame.top -= dy; setMeta(item, meta); } }, "{n} slot digeser."); };
  api.crop = function (raw) { var d = payload(raw); return applyToSelection(function (doc, item, meta) { meta.crop = meta.crop || { x: 0, y: 0, scale: 100 }; if (d.reset) meta.crop = { x: 0, y: 0, scale: 100 }; else { meta.crop.x = num(meta.crop.x, 0) + num(d.dx, 0); meta.crop.y = num(meta.crop.y, 0) + num(d.dy, 0); if (d.scale) meta.crop.scale = Math.max(20, Math.min(600, num(meta.crop.scale, 100) + num(d.scale, 0))); } return rebuildPhoto(doc, item, meta); }, "Crop diterapkan pada {n} slot."); };
  api.flip = function (raw) { var d = payload(raw); return applyToSelection(function (doc, item, meta) { if (d.horizontal) meta.flipH = !meta.flipH; if (d.vertical) meta.flipV = !meta.flipV; return rebuildPhoto(doc, item, meta); }, "Flip diterapkan pada {n} slot."); };
  api.rotate90 = function () { return applyToSelection(function (doc, item, meta) { item.rotate(90, true, true, true, true, Transformation.CENTER); var borders = borderItemsForSlot(doc, meta.slotId); for (var b = 0; b < borders.length; b++) borders[b].rotate(90, true, true, true, true, Transformation.CENTER); meta.rotation = (num(meta.rotation, 0) + 90) % 360; meta.frame = { left: item.left, top: item.top, w: item.width, h: item.height }; setMeta(item, meta); }, "{n} slot diputar 90\u00b0."); };
  api.replacePhoto = function (raw) { var d = payload(raw); if (!d.path) return response(false, "Path foto baru tidak diberikan."); return applyToSelection(function (doc, item, meta) { meta.sourcePath = d.path; meta.sourceId = d.sourceId || meta.sourceId; meta.crop = { x: 0, y: 0, scale: 100 }; return rebuildPhoto(doc, item, meta); }, "Foto pada {n} slot diganti."); };

  api.setBackground = function (raw) { var d = payload(raw); var hex = (typeof d.hex === "string") ? d.hex : ""; return applyToSelection(function (doc, item, meta) { return setSlotBackground(doc, item, meta, hex); }, hex ? "Background diterapkan pada {n} slot." : "Background dihapus pada {n} slot."); };

  /* =========================================================================
   * FIX: setBackgroundBySize sekarang menggunakan collectAllSlots untuk
   * mengiterasi semua slot di seluruh layer, bukan hanya doc.pageItems.
   * ========================================================================= */
  api.setBackgroundBySize = function (raw) {
    try {
      var d = payload(raw);
      if (!d.sizeId) return response(false, "Ukuran tidak diberikan.");
      var hex = (typeof d.hex === "string") ? d.hex : "";
      var doc = activeDoc();
      var allSlots = collectAllSlots(doc);
      var count = 0;
      
      for (var i = 0; i < allSlots.length; i++) {
        var slot = allSlots[i];
        if (slot.meta && slot.meta.sizeId === d.sizeId) {
          setSlotBackground(doc, slot.item, slot.meta, hex);
          count++;
        }
      }
      
      app.redraw();
      if (!count) return response(false, "Tidak ada slot ukuran " + d.sizeId + " di dokumen ini.");
      return response(true, (hex ? "Background diterapkan" : "Background dihapus") + " pada " + count + " slot ukuran " + d.sizeId + ".", { count: count });
    } catch (e) { return response(false, e.message); }
  };

  api.resetArtboard = function () {
    try {
      var doc = activeDoc();
      var removed = clearGenerated(doc);
      doc.selection = null;
      app.redraw();
      if (!removed) return response(true, "Tidak ada hasil generate PFPM untuk dihapus.", { removed: 0 });
      return response(true, "Hasil generate PFPM sebelumnya dihapus (" + removed + " layer).", { removed: removed });
    } catch (e) { return response(false, "Reset gagal: " + e.message); }
  };

  api.duplicateSlot = function (raw) { var d = payload(raw); var dir = (d.dir === "left" || d.dir === "up" || d.dir === "down") ? d.dir : "right"; var horizontal = (dir === "left" || dir === "right"); return applyToSelection(function (doc, item, meta) { var borders = borderItemsForSlot(doc, meta.slotId); var shiftAmt = borders.length ? (horizontal ? borders[0].width : borders[0].height) : (horizontal ? item.width : item.height); var dx = 0, dy = 0; if (dir === "right") dx = shiftAmt; else if (dir === "left") dx = -shiftAmt; else if (dir === "up") dy = shiftAmt; else if (dir === "down") dy = -shiftAmt; var dup = item.duplicate(item.parent, ElementPlacement.PLACEATEND); dup.left = item.left + dx; dup.top = item.top + dy; var m2 = getMeta(dup) || meta; m2.slotId = meta.slotId + "-copy"; m2.frame = { left: m2.frame.left + dx, top: m2.frame.top + dy, w: m2.frame.w, h: m2.frame.h }; setMeta(dup, m2); for (var b = 0; b < borders.length; b++) { var bd = borders[b].duplicate(borders[b].parent, ElementPlacement.PLACEATEND); bd.left = borders[b].left + dx; bd.top = borders[b].top + dy; markBorder(bd, m2.slotId); } return dup; }, "{n} slot diduplikasi."); };

  api.deleteSlot = function () { return applyToSelection(function (doc, item, meta) { var borders = borderItemsForSlot(doc, meta.slotId); for (var b = borders.length - 1; b >= 0; b--) { try { borders[b].remove(); } catch (e) {} } try { item.remove(); } catch (e) {} }, "{n} slot dihapus."); };
  api.undo = function () { try { app.undo(); app.redraw(); return response(true, "Undo."); } catch (e) { try { app.executeMenuCommand("undo"); return response(true, "Undo."); } catch (e2) { return response(false, "Undo gagal: " + e2.message); } } };

  api.pickFiles = function () { try { var files = File.openDialog("Pilih foto (JPG / PNG / TIFF)", "*.jpg;*.jpeg;*.png;*.tif;*.tiff", true); if (!files) return response(true, "Dibatalkan.", { files: [] }); if (!(files instanceof Array)) files = [files]; var out = []; for (var i = 0; i < files.length; i++) { out.push({ path: files[i].fsName, name: decodeURI(files[i].name) }); } return response(true, out.length + " file dipilih.", { files: out }); } catch (e) { return response(false, e.message); } };
  api.fromSelection = function () { try { var doc = activeDoc(); var sel = doc.selection; if (!sel || !sel.length) return response(false, "Tidak ada objek terpilih di Illustrator."); var out = []; function walk(it) { if (!it) return; if (it.typename === "PlacedItem" || it.typename === "RasterItem") { try { var f = it.file; if (f) out.push({ path: f.fsName, name: decodeURI(f.name) }); } catch (e) {} return; } if (it.typename === "GroupItem") { for (var i = 0; i < it.pageItems.length; i++) walk(it.pageItems[i]); } } for (var i = 0; i < sel.length; i++) walk(sel[i]); if (!out.length) return response(false, "Objek terpilih bukan foto linked (PlacedItem)."); return response(true, out.length + " foto diambil dari seleksi.", { files: out }); } catch (e) { return response(false, e.message); } };
  api.docInfo = function () { try { var doc = activeDoc(); return response(true, "OK", { name: doc.name, artboards: doc.artboards.length, version: app.version }); } catch (e) { return response(false, e.message); } };
  api.ping = function () { return response(true, "PFPM host v2.4.1 siap.", { version: "2.4.1" }); };

})(PFPM);
