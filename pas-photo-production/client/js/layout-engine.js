/* =====================================================================
 * Pas Foto Production Manager v2.3.0
 * client/js/layout-engine.js
 * ---------------------------------------------------------------------
 * REFERENCE PAS-FOTO LAYOUT ENGINE (ES5 - aman untuk CEP/Chromium lama).
 * ===================================================================== */
(function (root) {
  "use strict";

  var MEDIA_SIZES = {
    A3: [297, 420],
    A4: [210, 297],
    A5: [148, 210],
    A6: [105, 148],
    LETTER: [216, 279],
    "4R": [102, 152],
    "10R": [254, 305],
    "10x15": [100, 150],
    "20x30": [200, 300]
  };

  var EPS = 0.001;
  var MIN_DIM = 8;

  function r2(v) { return Math.round(v * 100) / 100; }
  function clampNum(v, d) { v = Number(v); return isFinite(v) ? v : d; }

  function borderPitchGap(gap, offsetBorder) {
    var g = clampNum(gap, 0);
    var o = clampNum(offsetBorder, 0);
    if (g < 0) g = 0;
    if (o < 0) o = 0;
    return r2(g + 2 * o);
  }

  function sameSize(item, w, h) {
    return Math.abs(item.w - w) < 0.01 && Math.abs(item.h - h) < 0.01;
  }

  function findSize(pool, w, h) {
    for (var i = 0; i < pool.length; i++) {
      if (sameSize(pool[i], w, h)) return pool[i];
    }
    return null;
  }

  function onlyPassportSizes(pool) {
    if (!pool.length) return false;
    for (var i = 0; i < pool.length; i++) {
      if (!sameSize(pool[i], 40, 60) && !sameSize(pool[i], 30, 40) && !sameSize(pool[i], 20, 30)) return false;
    }
    return !!(findSize(pool, 40, 60) || findSize(pool, 30, 40) || findSize(pool, 20, 30));
  }

  function addSlot(slots, it, x, y, w, h, rot, offsetBorder) {
    if (!it || it.qty <= 0) return false;
    slots.push({
      slotId: it.id + "-" + (it.seq++),
      sizeId: it.id,
      label: it.label,
      sourceId: it.srcId,
      sourcePath: it.srcPath || "",
      x: r2(x),
      y: r2(y),
      width: r2(w),
      height: r2(h),
      physicalWidth: it.w,
      physicalHeight: it.h,
      rotation: rot,
      crop: { x: 0, y: 0, scale: 100 },
      offsetBorder: offsetBorder,
      backgroundColor: it.bg || ""
    });
    it.qty--;
    return true;
  }

  function templateFits(area, w, h) {
    return area.w + EPS >= w && area.h + EPS >= h;
  }

  function hasRemaining(pool) {
    for (var i = 0; i < pool.length; i++) if (pool[i].qty > 0) return true;
    return false;
  }

  function packReferenceA4(pool, area, offsetBorder, rotateMode) {
    var d = borderPitchGap(0, offsetBorder);
    var blockW = 200 + 5 * d;
    var blockH = 90 + 2 * d;
    if (!templateFits(area, blockW, blockH)) return [];
    var p46 = findSize(pool, 40, 60), p34 = findSize(pool, 30, 40), p23 = findSize(pool, 20, 30);
    var slots = [], x0 = area.x, y0 = area.y;
    var stride = blockH + d;
    var maxBlocks = Math.floor((area.h + d + EPS) / stride), b = 0;
    for (; b < maxBlocks && p46 && p34 && p23 && p46.qty >= 4 && p34.qty >= 4 && p23.qty >= 6; b++) {
      var y = y0 + b * stride;
      for (var i = 0; i < 4; i++) addSlot(slots, p46, x0 + i * (40 + d), y, 40, 60, 0, offsetBorder);
      for (var j = 0; j < 4; j++) addSlot(slots, p34, x0 + j * (40 + d), y + 60 + d, 40, 30, 90, offsetBorder);
      var cx = x0 + 4 * (40 + d);
      for (var r = 0; r < 3; r++) {
        for (var c = 0; c < 2; c++) addSlot(slots, p23, cx + c * (20 + d), y + r * (30 + d), 20, 30, 0, offsetBorder);
      }
    }
    if (hasRemaining(pool) && b * stride < area.h - EPS) {
      var more = packHorizontalShelf(pool, { x: area.x, y: area.y + b * stride, w: area.w, h: area.h - b * stride }, 0, rotateMode, offsetBorder);
      for (var m = 0; m < more.length; m++) slots.push(more[m]);
    }
    return slots;
  }

  function packReferenceA5(pool, area, offsetBorder, rotateMode) {
    var d = borderPitchGap(0, offsetBorder);
    var blockW = 120 + 5 * d;
    var blockH = 150 + 3 * d;
    if (!templateFits(area, blockW, blockH)) return [];
    var p46 = findSize(pool, 40, 60), p34 = findSize(pool, 30, 40), p23 = findSize(pool, 20, 30);
    var slots = [], x0 = area.x + r2((area.w - blockW) / 2), y0 = area.y;
    var stride = blockH + d;
    var maxBlocks = Math.floor((area.h + d + EPS) / stride), b = 0;
    for (; b < maxBlocks && p46 && p34 && p23 && p46.qty >= 4 && p34.qty >= 4 && p23.qty >= 6; b++) {
      var y = y0 + b * stride;
      for (var rr = 0; rr < 2; rr++) {
        for (var cc = 0; cc < 2; cc++) addSlot(slots, p46, x0 + cc * (60 + d), y + rr * (40 + d), 60, 40, 90, offsetBorder);
      }
      var y34 = y + 2 * (40 + d);
      for (var i = 0; i < 4; i++) addSlot(slots, p34, x0 + i * (30 + d), y34, 30, 40, 0, offsetBorder);
      var y23 = y34 + 40 + d;
      for (var j = 0; j < 6; j++) addSlot(slots, p23, x0 + j * (20 + d), y23, 20, 30, 0, offsetBorder);
    }
    if (hasRemaining(pool) && b * stride < area.h - EPS) {
      var more = packHorizontalShelf(pool, { x: area.x, y: area.y + b * stride, w: area.w, h: area.h - b * stride }, 0, rotateMode, offsetBorder);
      for (var m = 0; m < more.length; m++) slots.push(more[m]);
    }
    return slots;
  }

  function evaluateBlock(fr, item, w, h, rot, gap) {
    if (w > fr.w + EPS || h > fr.h + EPS) return null;
    var cols = Math.floor((fr.w + gap + EPS) / (w + gap));
    var rows = Math.floor((fr.h + gap + EPS) / (h + gap));
    if (cols < 1 || rows < 1) return null;
    var capacity = cols * rows;
    var n = Math.min(item.qty, capacity);
    if (n < 1) return null;
    var useRows = Math.ceil(n / cols);
    var useCols = useRows === 1 ? n : cols;
    var blockW = useCols * w + (useCols - 1) * gap;
    var blockH = useRows * h + (useRows - 1) * gap;
    return { item: item, w: w, h: h, rot: rot, cols: useCols, rows: useRows, count: n, blockW: blockW, blockH: blockH, usedArea: n * w * h, leftoverW: fr.w - blockW, leftoverH: fr.h - blockH };
  }

  function betterBlock(a, b) {
    if (!b) return true;
    if (a.usedArea > b.usedArea + EPS) return true;
    if (a.usedArea < b.usedArea - EPS) return false;
    if (a.rows < b.rows) return true;
    if (a.rows > b.rows) return false;
    var ua = a.w * a.h, ub = b.w * b.h;
    if (ua > ub + EPS) return true;
    if (ua < ub - EPS) return false;
    if (a.leftoverW < b.leftoverW - EPS) return true;
    if (a.leftoverW > b.leftoverW + EPS) return false;
    return a.blockH < b.blockH - EPS;
  }

  function orientationsFor(item, rotateMode) {
    var list = [];
    var square = Math.abs(item.w - item.h) < EPS;
    if (rotateMode === "force" && !square) { list.push({ w: item.h, h: item.w, rot: 90 }); return list; }
    list.push({ w: item.w, h: item.h, rot: 0 });
    if (rotateMode !== "off" && !square) list.push({ w: item.h, h: item.w, rot: 90 });
    return list;
  }

  function chooseBlock(fr, pool, gap, rotateMode) {
    var best = null;
    for (var i = 0; i < pool.length; i++) {
      var item = pool[i];
      if (item.qty <= 0) continue;
      var ors = orientationsFor(item, rotateMode);
      for (var o = 0; o < ors.length; o++) {
        var cand = evaluateBlock(fr, item, ors[o].w, ors[o].h, ors[o].rot, gap);
        if (cand && betterBlock(cand, best)) best = cand;
      }
    }
    return best;
  }

  function splitRect(fr, blockW, blockH, gap) {
    var out = [];
    var leftoverW = fr.w - blockW - gap;
    var leftoverH = fr.h - blockH - gap;
    var horizontal = leftoverW < leftoverH;
    var rightRect, bottomRect;
    if (horizontal) {
      rightRect = { x: fr.x + blockW + gap, y: fr.y, w: leftoverW, h: blockH };
      bottomRect = { x: fr.x, y: fr.y + blockH + gap, w: fr.w, h: leftoverH };
    } else {
      rightRect = { x: fr.x + blockW + gap, y: fr.y, w: leftoverW, h: fr.h };
      bottomRect = { x: fr.x, y: fr.y + blockH + gap, w: blockW, h: leftoverH };
    }
    if (rightRect.w >= MIN_DIM && rightRect.h >= MIN_DIM) out.push(rightRect);
    if (bottomRect.w >= MIN_DIM && bottomRect.h >= MIN_DIM) out.push(bottomRect);
    return out;
  }

  function uniqueBandHeights(pool, remH, rotateMode) {
    var map = {}, out = [];
    for (var i = 0; i < pool.length; i++) {
      var item = pool[i];
      if (item.qty <= 0) continue;
      var ors = orientationsFor(item, rotateMode);
      for (var o = 0; o < ors.length; o++) {
        var h = r2(ors[o].h);
        if (h <= remH + EPS && !map[h]) { map[h] = true; out.push(h); }
      }
    }
    out.sort(function(a,b){ return b-a; });
    return out;
  }

  function simulateBand(pool, areaW, bandH, gap, rotateMode) {
    var qty = [], placements = [], x = 0, used = 0, guard = 0;
    for (var i = 0; i < pool.length; i++) qty[i] = pool[i].qty;
    while (x < areaW - EPS && guard++ < 2000) {
      var best = null, bestIndex = -1;
      for (var p = 0; p < pool.length; p++) {
        if (qty[p] <= 0) continue;
        var item = pool[p];
        var ors = orientationsFor(item, rotateMode);
        for (var o = 0; o < ors.length; o++) {
          var w = ors[o].w, h = r2(ors[o].h), remW = areaW - x;
          if (Math.abs(h - bandH) > 0.01 || w > remW + EPS) continue;
          var cand = { index: p, item: item, w: w, h: h, rot: ors[o].rot, area: w * h };
          if (!best || cand.area > best.area + EPS || (Math.abs(cand.area - best.area) < EPS && cand.w > best.w)) { best = cand; bestIndex = p; }
        }
      }
      if (!best) break;
      placements.push(best);
      qty[bestIndex]--;
      used += best.w * best.h;
      x += best.w + gap;
    }
    return { placements: placements, used: used, efficiency: bandH > 0 ? used / (areaW * bandH) : 0, leftover: areaW - (placements.length ? (x - gap) : 0), bandH: bandH };
  }

  function chooseBand(pool, areaW, remH, gap, rotateMode) {
    var heights = uniqueBandHeights(pool, remH, rotateMode);
    var best = null;
    for (var i = 0; i < heights.length; i++) {
      var sim = simulateBand(pool, areaW, heights[i], gap, rotateMode);
      if (!sim.placements.length) continue;
      if (!best || sim.efficiency > best.efficiency + EPS ||
        (Math.abs(sim.efficiency - best.efficiency) < EPS && sim.used > best.used + EPS) ||
        (Math.abs(sim.efficiency - best.efficiency) < EPS && Math.abs(sim.used - best.used) < EPS && sim.leftover < best.leftover - EPS)) {
        best = sim;
      }
    }
    return best;
  }

  function packHorizontalShelf(pool, area, gap, rotateMode, offsetBorder) {
    var d = borderPitchGap(gap, offsetBorder);
    var slots = [];
    var y = area.y, maxY = area.y + area.h, guard = 0;
    while (y < maxY - EPS && hasRemaining(pool) && guard++ < 4000) {
      var band = chooseBand(pool, area.w, maxY - y, d, rotateMode);
      if (!band) break;
      var x = area.x;
      for (var i = 0; i < band.placements.length; i++) {
        var cand = band.placements[i];
        addSlot(slots, cand.item, x, y, cand.w, cand.h, cand.rot, offsetBorder);
        x += cand.w + d;
      }
      y += band.bandH + d;
    }
    return slots;
  }

  function packSheet(pool, area, gap, rotateMode, offsetBorder) {
    var free = [{ x: area.x, y: area.y, w: area.w, h: area.h }];
    var slots = [];
    var guard = 0;
    while (free.length > 0 && guard++ < 4000) {
      free.sort(function (a, b) {
        if (Math.abs(a.y - b.y) > EPS) return a.y - b.y;
        if (Math.abs(a.x - b.x) > EPS) return a.x - b.x;
        return (b.w * b.h) - (a.w * a.h);
      });
      var placedIndex = -1;
      var block = null;
      for (var i = 0; i < free.length; i++) {
        block = chooseBlock(free[i], pool, gap, rotateMode);
        if (block) { placedIndex = i; break; }
      }
      if (placedIndex < 0) break;
      var fr = free[placedIndex];
      var placedCount = 0;
      for (var r = 0; r < block.rows && placedCount < block.count; r++) {
        for (var c = 0; c < block.cols && placedCount < block.count; c++) {
          var it = block.item;
          if (addSlot(slots, it, fr.x + c * (block.w + gap), fr.y + r * (block.h + gap), block.w, block.h, block.rot, offsetBorder)) placedCount++;
        }
      }
      var pieces = splitRect(fr, block.blockW, block.blockH, gap);
      free.splice(placedIndex, 1);
      for (var p = 0; p < pieces.length; p++) free.push(pieces[p]);
    }
    return slots;
  }

  function build(job, landscape) {
    var base;
    if (job.media.type === "CUSTOM") {
      var cw = clampNum(job.media.customWidth, 210);
      var ch = clampNum(job.media.customHeight, 297);
      if (cw <= 0 || ch <= 0) throw new Error("Ukuran custom tidak valid.");
      base = [cw, ch];
    } else {
      base = MEDIA_SIZES[job.media.type] || MEDIA_SIZES.A4;
    }
    var pw = landscape ? base[1] : base[0];
    var ph = landscape ? base[0] : base[1];
    var margin = Math.max(0, clampNum(job.media.margin, 5));
    var gap = Math.max(0, clampNum(job.media.gap, 0));
    var rotateMode = (job.options && job.options.rotateMode) || "auto";
    var noBorder = !!(job.options && job.options.noBorder);
    var offsetBorder = noBorder ? 0 : Math.max(0, clampNum(job.options && (job.options.offsetBorder !== undefined ? job.options.offsetBorder : job.options.borderWidth), 1.5));
    var area = { x: margin, y: margin, w: r2(pw - margin * 2), h: r2(ph - margin * 2) };
    if (area.w <= 0 || area.h <= 0) throw new Error("Margin terlalu besar untuk media " + job.media.type + ".");
    var items = [];
    for (var i = 0; i < (job.items || []).length; i++) {
      var it = job.items[i];
      var qty = Math.max(0, parseInt(it.quantity, 10) || 0);
      if (qty <= 0) continue;
      var w = clampNum(it.width, 0), h = clampNum(it.height, 0);
      if (w <= 0 || h <= 0) continue;
      var fitsNormal = (w <= area.w + EPS && h <= area.h + EPS);
      var fitsRotated = (h <= area.w + EPS && w <= area.h + EPS);
      if (!fitsNormal && !fitsRotated) throw new Error("Ukuran " + (it.label || it.id) + " (" + w + "x" + h + "mm) lebih besar dari area cetak.");
      items.push({ id: it.id, label: it.label || it.id, w: w, h: h, qty: qty, srcId: it.sourceId, srcPath: it.sourcePath || "", bg: it.backgroundColor || "", seq: 1 });
    }
    if (!items.length) throw new Error("Tidak ada item dengan quantity > 0.");
    items.sort(function (a, b) { var A = a.w * a.h, B = b.w * b.h; return A === B ? (b.h - a.h) : (B - A); });
    var totalRequested = 0;
    for (var t = 0; t < items.length; t++) totalRequested += items[t].qty;
    var sheets = [];
    var usableArea = area.w * area.h;
    var guard = 0;
    while (guard++ < 200) {
      var remaining = 0;
      for (var q = 0; q < items.length; q++) remaining += items[q].qty;
      if (remaining <= 0) break;
      var slots;
      if (!landscape && gap === 0 && onlyPassportSizes(items) && job.media.type === "A4") slots = packReferenceA4(items, area, offsetBorder, rotateMode);
      else if (!landscape && gap === 0 && onlyPassportSizes(items) && job.media.type === "A5") slots = packReferenceA5(items, area, offsetBorder, rotateMode);
      else slots = packHorizontalShelf(items, area, gap, rotateMode, offsetBorder);
      if (!slots.length) slots = packHorizontalShelf(items, area, gap, rotateMode, offsetBorder);
      if (!slots.length) break;
      var used = 0;
      for (var s = 0; s < slots.length; s++) used += slots[s].width * slots[s].height;
      sheets.push({ index: sheets.length + 1, width: pw, height: ph, margin: margin, gap: gap, slots: slots, usedArea: r2(used), efficiency: r2((used / usableArea) * 100) });
    }
    var placed = 0, totalUsed = 0;
    for (var k = 0; k < sheets.length; k++) { placed += sheets[k].slots.length; totalUsed += sheets[k].usedArea; }
    var efficiency = sheets.length ? r2((totalUsed / (usableArea * sheets.length)) * 100) : 0;
    return { media: { type: job.media.type, width: pw, height: ph, margin: margin, gap: gap, landscape: !!landscape }, sheets: sheets, totalSlots: totalRequested, placed: placed, unplaced: totalRequested - placed, efficiency: efficiency, options: { offsetBorder: offsetBorder, noBorder: noBorder, rotateMode: rotateMode, cutGuide: !!(job.options && job.options.cutGuide), grouping: (job.options && job.options.grouping) || "flat", fitMode: (job.options && job.options.fitMode === "fit") ? "fit" : "fill" } };
  }

  function scoreResult(res) { return (-res.sheets.length * 1000) + res.efficiency; }

  function generate(job) {
    if (!job || !job.media) throw new Error("Job tidak valid.");
    var mode = job.media.orientation || "auto";
    if (mode === "portrait") return build(job, false);
    if (mode === "landscape") return build(job, true);
    if ((job.media.type === "A4" || job.media.type === "A5") && (job.media.gap === 0 || job.media.gap === "0" || job.media.gap === undefined)) return build(job, false);
    var p = build(job, false);
    var l = build(job, true);
    return scoreResult(l) > scoreResult(p) ? l : p;
  }

  root.PFLayout = {
    generate: generate,
    mediaSizes: MEDIA_SIZES,
    _internal: { packSheet: packSheet, splitRect: splitRect, chooseBlock: chooseBlock }
  };
})(typeof window !== "undefined" ? window : this);
