/* =====================================================================
 * client/js/bg-swap.js - Ganti warna latar foto (chroma-key otomatis).
 * ---------------------------------------------------------------------
 * Illustrator ExtendScript TIDAK punya akses pixel-level ke gambar raster,
 * jadi proses ini dilakukan di panel (Chromium/Canvas), bukan di host/main.jsx.
 *
 * Cara kerja:
 *  1. Foto sumber dimuat ke <canvas>.
 *  2. Warna backdrop dideteksi otomatis dari pita tepi foto (asumsi studio
 *     memotret di depan latar polos - kain/dinding satu warna).
 *  3. Setiap pixel yang jaraknya dekat dengan warna backdrop diganti warna
 *     target secara solid/flat (sesuai standar pas foto resmi: latar harus
 *     rata, bukan gradasi). Pixel di tepi subjek di-blend tipis (feather)
 *     supaya tidak terlihat seperti hasil potong paksa.
 *  4. Hasil disimpan sebagai file PNG baru (lewat Node fs, tersedia karena
 *     CEFCommandLine --enable-nodejs / --mixed-context di manifest.xml).
 *     File asli TIDAK disentuh - ini non-destructive.
 *
 * Catatan: ini teknik chroma-key berbasis warna, BUKAN segmentasi AI.
 * Paling akurat untuk foto dengan latar polos/rata. Untuk latar yang tidak
 * rata (bayangan kuat, tekstur), gunakan slider "Sensitivitas" di header
 * kartu Sumber Foto lalu terapkan ulang.
 * ===================================================================== */
(function (root) {
  "use strict";

  var MAX_PIXELS = 30 * 1000000; /* cap ~30MP: cukup untuk cetak 8R 300dpi, jaga performa canvas */

  var nodeFs = null, nodePath = null, nodeOs = null;
  try {
    if (typeof require === "function") {
      nodeFs = require("fs");
      nodePath = require("path");
      nodeOs = require("os");
    }
  } catch (e) { nodeFs = null; }

  var PRESETS = {
    red: [211, 47, 47],
    blue: [21, 101, 192],
    white: [255, 255, 255]
  };

  function fileUrl(p) {
    if (!p) return "";
    var s = String(p).replace(/\\/g, "/");
    return "file:///" + encodeURI(s.replace(/^\/+/, ""));
  }

  function hexToRgb(hex) {
    var m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || "");
    return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : [255, 0, 0];
  }
  function rgbToHex(rgb) {
    function h(v) { v = Math.max(0, Math.min(255, Math.round(v))); var s = v.toString(16); return s.length < 2 ? "0" + s : s; }
    return "#" + h(rgb[0]) + h(rgb[1]) + h(rgb[2]);
  }

  /** Deteksi warna backdrop dari pita tepi foto (mode/rata-rata cluster terbanyak). */
  function detectBackdropColor(ctx, w, h) {
    var band = Math.max(4, Math.round(Math.min(w, h) * 0.035));
    var data = ctx.getImageData(0, 0, w, h).data;
    var buckets = {};
    function sample(x, y) {
      var idx = (y * w + x) * 4;
      var r = data[idx], g = data[idx + 1], b = data[idx + 2];
      var key = (r >> 3) + "_" + (g >> 3) + "_" + (b >> 3); /* kuantisasi 8 level -> tahan noise */
      var bkt = buckets[key];
      if (!bkt) bkt = buckets[key] = { r: 0, g: 0, b: 0, n: 0 };
      bkt.r += r; bkt.g += g; bkt.b += b; bkt.n++;
    }
    var x, y;
    for (x = 0; x < w; x += 2) {
      for (y = 0; y < band; y++) sample(x, y);
      for (y = Math.max(band, h - band); y < h; y++) sample(x, y);
    }
    for (y = 0; y < h; y += 2) {
      for (x = 0; x < band; x++) sample(x, y);
      for (x = Math.max(band, w - band); x < w; x++) sample(x, y);
    }
    var best = null;
    for (var k in buckets) {
      if (!buckets.hasOwnProperty(k)) continue;
      if (!best || buckets[k].n > best.n) best = buckets[k];
    }
    if (!best) return [255, 255, 255];
    return [Math.round(best.r / best.n), Math.round(best.g / best.n), Math.round(best.b / best.n)];
  }

  /** Ganti pixel dekat warna backdrop -> warna target (solid), dengan feather tipis di tepi subjek. */
  function applyChromaKey(ctx, w, h, backdrop, target, tolerance) {
    var imgData = ctx.getImageData(0, 0, w, h);
    var d = imgData.data;
    var br = backdrop[0], bgc = backdrop[1], bb = backdrop[2];
    var tr = target[0], tg = target[1], tb = target[2];
    var lowT = tolerance, highT = tolerance + 42, span = highT - lowT;
    for (var i = 0; i < d.length; i += 4) {
      var r = d[i], g = d[i + 1], b = d[i + 2];
      var dr = r - br, dg = g - bgc, db = b - bb;
      var dist = Math.sqrt(dr * dr + dg * dg + db * db);
      var alpha;
      if (dist <= lowT) alpha = 0;
      else if (dist >= highT) alpha = 1;
      else alpha = (dist - lowT) / span;
      if (alpha < 1) {
        d[i] = (tr * (1 - alpha) + r * alpha) | 0;
        d[i + 1] = (tg * (1 - alpha) + g * alpha) | 0;
        d[i + 2] = (tb * (1 - alpha) + b * alpha) | 0;
      }
    }
    ctx.putImageData(imgData, 0, 0);
  }

  function ensureCacheDir() {
    if (!nodeFs || !nodeOs || !nodePath) return null;
    var dir = nodePath.join(nodeOs.tmpdir(), "pfpm-bg-cache");
    try { if (!nodeFs.existsSync(dir)) nodeFs.mkdirSync(dir); } catch (e) {}
    return dir;
  }

  function saveDataUrlToFile(dataUrl, destPath) {
    if (!nodeFs || typeof Buffer === "undefined") return false;
    var b64 = dataUrl.replace(/^data:image\/png;base64,/, "");
    var buf = Buffer.from(b64, "base64");
    nodeFs.writeFileSync(destPath, buf);
    return true;
  }

  function deleteFileSafe(p) {
    if (!nodeFs || !p) return;
    try { if (nodeFs.existsSync(p)) nodeFs.unlinkSync(p); } catch (e) {}
  }

  /**
   * process(photo, opts, cb)
   * opts: { color: 'red'|'blue'|'white'|'#rrggbb', tolerance: number }
   * cb(err, result) - result: { path, dataUrl, backdrop }
   *   path kosong ("") berarti tidak bisa disimpan ke file (mis. Node tidak
   *   tersedia) - dataUrl tetap bisa dipakai untuk preview di panel.
   */
  function process(photo, opts, cb) {
    if (!photo || !photo.path) { cb(new Error("Foto sumber tidak valid.")); return; }
    var target = PRESETS[opts.color] || hexToRgb(opts.color);
    var tolerance = Math.max(5, Math.min(120, Number(opts.tolerance) || 40));

    var img = new Image();
    img.onerror = function () { cb(new Error("Gagal memuat foto sumber.")); };
    img.onload = function () {
      try {
        var nw = img.naturalWidth || img.width;
        var nh = img.naturalHeight || img.height;
        var scale = (nw * nh > MAX_PIXELS) ? Math.sqrt(MAX_PIXELS / (nw * nh)) : 1;
        var w = Math.max(1, Math.round(nw * scale));
        var h = Math.max(1, Math.round(nh * scale));

        var canvas = document.createElement("canvas");
        canvas.width = w; canvas.height = h;
        var ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, w, h);

        var backdrop = detectBackdropColor(ctx, w, h);
        applyChromaKey(ctx, w, h, backdrop, target, tolerance);

        var dataUrl = canvas.toDataURL("image/png");
        var savedPath = "";
        var dir = ensureCacheDir();
        if (dir) {
          var fname = "bg-" + (photo.id || "photo") + "-" + Date.now() + ".png";
          savedPath = nodePath.join(dir, fname);
          try { if (!saveDataUrlToFile(dataUrl, savedPath)) savedPath = ""; }
          catch (eSave) { savedPath = ""; }
        }
        cb(null, { path: savedPath, dataUrl: dataUrl, backdrop: rgbToHex(backdrop) });
      } catch (e) {
        cb(e);
      }
    };
    img.src = fileUrl(photo.path);
  }

  root.PFBg = {
    isNodeAvailable: !!nodeFs,
    presets: PRESETS,
    process: process,
    deleteFile: deleteFileSafe,
    hexToRgb: hexToRgb,
    rgbToHex: rgbToHex
  };
})(window);
