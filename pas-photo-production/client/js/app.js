/* =====================================================================
 * client/js/app.js — controller panel Pas Foto Production Manager v2.3.0
 *
 * FIX v2.5.2:
 *  - Preview scale calculation: mengurangi extra margin agar sheet
 *    tidak terpotong saat container sempit.
 *  - renderSizePresets() selalu dipanggil saat init agar preset 2R-8R
 *    selalu tersedia.
 * ===================================================================== */
(function () {
  "use strict";

  var S = window.PFState;
  var B = window.PFBridge;
  var L = window.PFLayout;
  var lastLayout = null;

  /* ---------------- helpers ---------------- */
  function $(sel) { return document.querySelector(sel); }
  function $$(sel) { return Array.prototype.slice.call(document.querySelectorAll(sel)); }
  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html !== undefined) n.innerHTML = html;
    return n;
  }
  function esc(s) {
    return String(s === undefined || s === null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function fileUrl(p) {
    if (!p) return "";
    var s = String(p).replace(/\\/g, "/");
    return "file:///" + encodeURI(s.replace(/^\/+/, ""));
  }
  function isRenderable(p) { return /\.(jpe?g|png|gif|bmp|webp)$/i.test(String(p || "")); }

  /* wraps a <input type=number> with a small stacked up/down spinner UI */
  function attachSpinner(input) {
    if (!input || (input.parentElement && input.parentElement.classList.contains("numfield"))) return;
    var wrap = el("span", "numfield");
    input.parentNode.insertBefore(wrap, input);
    wrap.appendChild(input);
    var spin = el("span", "spin",
      '<button type="button" tabindex="-1">\u25b2</button><button type="button" tabindex="-1">\u25bc</button>');
    wrap.appendChild(spin);
    var btns = spin.querySelectorAll("button");
    function step(dir) {
      var stepVal = parseFloat(input.step) || 1;
      var val = (parseFloat(input.value) || 0) + dir * stepVal;
      var min = input.min !== "" ? parseFloat(input.min) : null;
      var max = input.max !== "" ? parseFloat(input.max) : null;
      if (min !== null && val < min) val = min;
      if (max !== null && val > max) val = max;
      input.value = (Math.round(val * 100) / 100);
      input.dispatchEvent(new Event("change", { bubbles: true }));
    }
    btns[0].onclick = function (e) { e.preventDefault(); step(1); };
    btns[1].onclick = function (e) { e.preventDefault(); step(-1); };
  }

  var toastTimer = null;
  function toast(msg, kind) {
    var t = $("#toast");
    t.textContent = msg;
    t.className = "toast show " + (kind || "");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.className = "toast " + (kind || ""); }, 2600);
  }

  /* ---------------- photo source ---------------- */
  function renderPhotos() {
    var grid = $("#photoGrid");
    var st = S.get();
    grid.innerHTML = "";
    $("#photoHint").style.display = st.photos.length ? "none" : "block";

    st.photos.forEach(function (p) {
      var card = el("div", "photo-card");
      var media = isRenderable(p.path)
        ? '<img class="thumb" src="' + esc(p.thumb || fileUrl(p.path)) + '" alt="" onerror="this.outerHTML=\'<div class=&quot;ph&quot;>TIFF</div>\'" />'
        : '<div class="ph">\ud83d\uddbc</div>';
      card.innerHTML =
        media +
        '<button class="del" title="Hapus">\u00d7</button>' +
        '<div class="meta"><span class="dot" style="background:' + esc(p.color) + '"></span>' +
        '<input class="nm" value="' + esc(p.name) + '" title="' + esc(p.path) + '" /></div>';

      card.querySelector(".del").onclick = function () {
        S.removePhoto(p.id); renderPhotos(); renderOrder(); preview();
      };
      card.querySelector(".nm").onchange = function (e) {
        p.name = e.target.value; S.save(); renderOrder();
      };
      grid.appendChild(card);
    });
  }

  function addPhotoPaths(files) {
    if (!files || !files.length) return;
    files.forEach(function (f) { S.addPhoto(f.name, f.path, f.thumb || ""); });
    var st = S.get();
    st.items.forEach(function (it) {
      if (!it.sourceId && st.photos.length) it.sourceId = st.photos[0].id;
    });
    S.save();
    renderPhotos(); renderOrder(); preview();
    toast(files.length + " foto ditambahkan.", "ok");
  }

  $("#btnAddPhoto").onclick = function () {
    if (!B.isCEP) { toast("Fitur ini hanya aktif di dalam Illustrator.", "err"); return; }
    B.call("pickFiles", {}, function (res) {
      if (!res.ok) return toast(res.message, "err");
      addPhotoPaths((res.data && res.data.files) || []);
    });
  };

  $("#btnFromSelection").onclick = function () {
    if (!B.isCEP) { toast("Fitur ini hanya aktif di dalam Illustrator.", "err"); return; }
    B.call("fromSelection", {}, function (res) {
      if (!res.ok) return toast(res.message, "err");
      addPhotoPaths((res.data && res.data.files) || []);
    });
  };

  var dz = $("#dropZone");
  ["dragenter", "dragover"].forEach(function (ev) {
    dz.addEventListener(ev, function (e) { e.preventDefault(); dz.classList.add("over"); });
  });
  ["dragleave", "drop"].forEach(function (ev) {
    dz.addEventListener(ev, function (e) { e.preventDefault(); dz.classList.remove("over"); });
  });
  dz.addEventListener("drop", function (e) {
    var list = e.dataTransfer && e.dataTransfer.files;
    if (!list || !list.length) return;
    var out = [];
    for (var i = 0; i < list.length; i++) {
      var f = list[i];
      var p = f.path || f.name;
      if (!/\.(jpe?g|png|tiff?)$/i.test(p)) continue;
      out.push({ name: f.name, path: p });
    }
    if (!out.length) return toast("Hanya JPG / PNG / TIFF yang didukung.", "err");
    addPhotoPaths(out);
  });

  /* ---------------- order ---------------- */
  function renderSizePresets() {
    var sel = $("#sizePreset");
    sel.innerHTML = "";
    S.sizes.forEach(function (s) {
      var o = el("option");
      o.value = s.id;
      o.textContent = s.label + " (" + s.width + "\u00d7" + s.height + ")";
      sel.appendChild(o);
    });
  }

  function renderOrder() {
    var wrap = $("#orderList");
    var st = S.get();
    wrap.innerHTML = "";
    $("#orderHint").style.display = st.items.length ? "none" : "block";

    var showSrc = st.photos.length > 1;

    st.items.forEach(function (it) {
      var row = el("div", "order-row" + (showSrc ? " has-src" : ""));
      var opts = st.photos.map(function (p) {
        return '<option value="' + esc(p.id) + '"' + (p.id === it.sourceId ? " selected" : "") + '>' + esc(p.name) + "</option>";
      }).join("");
      row.innerHTML =
        '<span class="tag">' + esc(it.label) + "</span>" +
        '<input class="input w" type="number" step="1" min="5" value="' + it.width + '" title="Lebar (mm)" />' +
        '<input class="input h" type="number" step="1" min="5" value="' + it.height + '" title="Tinggi (mm)" />' +
        '<input class="input q" type="number" step="1" min="1" value="' + it.quantity + '" title="Quantity" />' +
        (showSrc ? '<select class="input src">' + (opts || '<option value="">\u2014 pilih foto \u2014</option>') + "</select>" : "") +
        '<button class="x" title="Hapus baris">\u00d7</button>';

      row.querySelector(".w").onchange = function (e) { it.width = Number(e.target.value) || 10; S.save(); preview(); };
      row.querySelector(".h").onchange = function (e) { it.height = Number(e.target.value) || 10; S.save(); preview(); };
      row.querySelector(".q").onchange = function (e) { it.quantity = Math.max(0, parseInt(e.target.value, 10) || 0); S.save(); preview(); };
      if (showSrc) row.querySelector(".src").onchange = function (e) { it.sourceId = e.target.value; S.save(); preview(); };
      row.querySelector(".x").onclick = function () { S.removeItem(it.id); renderOrder(); preview(); };
      attachSpinner(row.querySelector(".w"));
      attachSpinner(row.querySelector(".h"));
      attachSpinner(row.querySelector(".q"));
      wrap.appendChild(row);
    });
  }

  $("#btnAddItem").onclick = function () {
    S.addItem($("#sizePreset").value);
    renderOrder(); preview();
  };

  /* paket cetak foto: isi cepat qty default 4x6=4, 3x4=4, 2x3=6 */
  var PRINT_PACKAGE = [
    { sizeId: "4x6", quantity: 4 },
    { sizeId: "3x4", quantity: 4 },
    { sizeId: "2x3", quantity: 6 }
  ];
  $("#btnPrintPackage").onclick = function () {
    var st = S.get();
    PRINT_PACKAGE.forEach(function (p) {
      var existing = st.items.filter(function (it) { return it.sizeId === p.sizeId; })[0];
      if (existing) existing.quantity = p.quantity;
      else S.addItem(p.sizeId);
    });
    S.save();
    renderOrder(); preview();
    toast("Paket cetak foto diterapkan.", "ok");
  };

  /* ---------------- options ---------------- */
  function bindOptions() {
    var st = S.get();
    $("#mediaType").value = st.media.type;
    $("#orientation").value = st.media.orientation;
    $("#margin").value = st.media.margin;
    $("#gap").value = st.media.gap;
    $("#offsetBorder").value = st.options.offsetBorder;
    $("#noBorder").checked = !!st.options.noBorder;
    $("#offsetBorder").disabled = !!st.options.noBorder;
    $("#rotateMode").value = st.options.rotateMode;
    $("#cutGuide").checked = !!st.options.cutGuide;
    $("#artboards").checked = st.options.artboards !== false;
    $$('input[name="grouping"]').forEach(function (r) { r.checked = (r.value === st.options.grouping); });

    function on(id, fn) { $(id).onchange = function (e) { fn(e.target); S.save(); preview(); }; }
    on("#mediaType", function (t) { st.media.type = t.value; });
    on("#orientation", function (t) { st.media.orientation = t.value; });
    on("#margin", function (t) { st.media.margin = Number(t.value) || 0; });
    on("#gap", function (t) { st.media.gap = Number(t.value) || 0; });
    on("#offsetBorder", function (t) { st.options.offsetBorder = Number(t.value) || 0; });
    on("#noBorder", function (t) { st.options.noBorder = t.checked; $("#offsetBorder").disabled = t.checked; });
    on("#rotateMode", function (t) { st.options.rotateMode = t.value; });
    on("#cutGuide", function (t) { st.options.cutGuide = t.checked; });
    on("#artboards", function (t) { st.options.artboards = t.checked; });
    $$('input[name="grouping"]').forEach(function (r) {
      r.onchange = function () { if (r.checked) { st.options.grouping = r.value; S.save(); } };
    });

    attachSpinner($("#margin"));
    attachSpinner($("#gap"));
    attachSpinner($("#offsetBorder"));
  }

  /* ---------------- preview ---------------- */
  function preview() {
    var box = $("#preview");
    var msg = $("#previewMsg");
    box.innerHTML = "";
    msg.textContent = "";
    msg.className = "msg";
    lastLayout = null;

    var st = S.get();
    if (!st.items.length) { msg.textContent = "Tambahkan minimal satu ukuran."; return; }

    var missing = st.items.filter(function (i) { return i.quantity > 0 && !i.sourceId; });
    if (missing.length) {
      msg.className = "msg err";
      msg.textContent = "Ada baris tanpa foto sumber. Pilih foto pada setiap ukuran.";
      return;
    }

    var layout;
    try { layout = L.generate(S.buildJob()); }
    catch (e) { msg.className = "msg err"; msg.textContent = e.message; return; }

    lastLayout = layout;
    $("#statSheets").textContent = layout.sheets.length;
    $("#statSlots").textContent = layout.placed;
    $("#statEff").textContent = layout.efficiency.toFixed(1) + "%";
    $("#statWaste").textContent = (100 - layout.efficiency).toFixed(1) + "%";

    /* FIX: Hitung lebar tersedia lebih aman.
       Sebelumnya memakai box.clientWidth - padding - 6, yang terlalu
       mepet sehingga sheet bisa terpotong. Sekarang kurangi extra
       margin 24px (2×10px padding + 4px buffer) untuk memastikan sheet
       selalu muat termasuk border dan scrollbar. */
    var RV_W = 30;
    var rawW = box.clientWidth || 320;
    var availW = Math.max(120, rawW - RV_W - 24);

    layout.sheets.forEach(function (sheet) {
      var scale = Math.min(availW / sheet.width, 3.2);
      var wPx = Math.round(sheet.width * scale);
      var hPx = Math.round(sheet.height * scale);

      var blockEl = el("div", "sheet-block");
      blockEl.appendChild(el("div", "sheet-caption",
        "Sheet " + sheet.index + " \u00b7 " + sheet.slots.length + " foto \u00b7 " + sheet.efficiency.toFixed(1) + "%"));

      var stage = el("div", "sheet-stage");

      var hRuler = el("div", "ruler-h");
      hRuler.style.width = wPx + "px";
      hRuler.style.marginLeft = RV_W + "px";
      hRuler.innerHTML = '<span class="ruler-arrow">\u25c0</span><span class="ruler-line"></span><span class="ruler-arrow">\u25b6</span>';
      stage.appendChild(hRuler);

      var row = el("div", "stage-row");

      var vRuler = el("div", "ruler-v");
      vRuler.style.height = hPx + "px";
      vRuler.style.width = RV_W + "px";
      vRuler.innerHTML =
        '<span class="rv-label">' + sheet.height + " mm</span>" +
        '<span class="rv-arrows"><span class="ruler-arrow">\u25b2</span><span class="rv-line"></span><span class="ruler-arrow">\u25bc</span></span>';
      row.appendChild(vRuler);

      var page = el("div", "sheet");
      page.style.width = wPx + "px";
      page.style.height = hPx + "px";

      var m = Math.round((sheet.margin || 0) * scale);
      if (m > 0) {
        var guide = el("div", "sheet-guide");
        guide.style.left = m + "px"; guide.style.top = m + "px";
        guide.style.right = m + "px"; guide.style.bottom = m + "px";
        page.appendChild(guide);
      }

      sheet.slots.forEach(function (s) {
        var d = el("div", "slot" + (s.rotation ? " rot" : ""));
        d.style.left = (s.x * scale) + "px";
        d.style.top = (s.y * scale) + "px";
        d.style.width = (s.width * scale) + "px";
        d.style.height = (s.height * scale) + "px";

        var photo = S.get().photos.filter(function (p) { return p.path === s.sourcePath; })[0];

        var rot = ((Number(s.rotation) || 0) % 360 + 360) % 360;
        var swapped = (rot % 180) !== 0;
        var pw = swapped ? s.height : s.width;
        var ph = swapped ? s.width : s.height;

        var photoEl = el("div", "slot-photo");
        photoEl.style.width = (pw * scale) + "px";
        photoEl.style.height = (ph * scale) + "px";
        photoEl.style.transform = "translate(-50%,-50%)" + (rot ? " rotate(" + rot + "deg)" : "");
        if (photo && isRenderable(photo.path)) {
          photoEl.style.backgroundImage = "url('" + (photo.thumb || fileUrl(photo.path)) + "')";
        } else {
          photoEl.style.background = (photo && photo.color) || "#8aa";
        }
        d.appendChild(photoEl);

        d.title = s.label + " " + s.physicalWidth + "\u00d7" + s.physicalHeight + "mm" + (s.rotation ? " (rotasi 90\u00b0)" : "");
        page.appendChild(d);
      });

      if (!(layout.options && layout.options.noBorder)) {
        sheet.slots.forEach(function (s) {
          var ob = Math.max(0, Number(s.offsetBorder) || 0);
          var bd = el("div", "slot-border");
          bd.style.left = ((s.x - ob) * scale) + "px";
          bd.style.top = ((s.y - ob) * scale) + "px";
          bd.style.width = ((s.width + 2 * ob) * scale) + "px";
          bd.style.height = ((s.height + 2 * ob) * scale) + "px";
          page.appendChild(bd);
        });
      }

      row.appendChild(page);
      stage.appendChild(row);
      blockEl.appendChild(stage);
      box.appendChild(blockEl);
    });

    msg.className = "msg ok";
    msg.textContent = "Efisiensi " + layout.efficiency.toFixed(1) + "% \u00b7 " +
      layout.placed + "/" + layout.totalSlots + " foto tersusun pada " + layout.sheets.length + " lembar.";
    if (layout.unplaced > 0) {
      msg.className = "msg err";
      msg.textContent += " (" + layout.unplaced + " foto tidak muat!)";
    }
  }

  $("#btnPreview").onclick = preview;

  /* ---------------- generate ---------------- */
  $("#btnGenerate").onclick = function () {
    if (!lastLayout) preview();
    if (!lastLayout) return toast("Layout belum siap.", "err");
    if (!B.isCEP) return toast("Buka panel di dalam Illustrator untuk generate.", "err");

    var st = S.get();
    var btn = $("#btnGenerate");
    btn.disabled = true;
    btn.textContent = "\u23f3 Generating\u2026";

    B.call("generate", {
      layout: lastLayout,
      grouping: st.options.grouping,
      artboards: st.options.artboards !== false
    }, function (res) {
      btn.disabled = false;
      btn.textContent = "\u26a1 Generate ke Illustrator";
      toast(res.message, res.ok ? "ok" : "err");
    });
  };

  $("#btnUngroup").onclick = function () {
    if (!B.isCEP) return toast("Hanya tersedia di dalam Illustrator.", "err");
    B.call("ungroupAll", {}, function (res) { toast(res.message, res.ok ? "ok" : "err"); });
  };

  $("#btnUndo").onclick = function () {
    B.call("undo", {}, function (res) { toast(res.message, res.ok ? "ok" : "err"); });
  };

  $("#btnCreateDoc").onclick = function () {
    if (!B.isCEP) return toast("Hanya tersedia di dalam Illustrator.", "err");
    var btn = $("#btnCreateDoc");
    if (btn.disabled) return;
    var st = S.get();
    var label = btn.querySelector("span");
    var labelText = label ? label.textContent : "";
    btn.disabled = true;
    if (label) label.textContent = "\u2026";
    B.call("createDocument", { media: st.media }, function (res) {
      btn.disabled = false;
      if (label) label.textContent = labelText;
      toast(res.message, res.ok ? "ok" : "err");
    });
  };

  /* ---------------- reset ---------------- */
  $("#btnReset").onclick = function () {
    S.reset();
    renderSizePresets();
    renderPhotos();
    renderOrder();
    bindOptions();
    preview();
    toast("Semua parameter direset ke default.", "ok");
  };

  /* ---------------- editor ---------------- */
  function setEditorEnabled(on) {
    $("#editorBody").className = "editor" + (on ? "" : " disabled");
  }

  function refreshSelection(silent) {
    if (!B.isCEP) { setEditorEnabled(false); return; }
    B.call("selectionInfo", {}, function (res) {
      var info = $("#selInfo");
      if (!res.ok || !res.data || !res.data.count) {
        info.className = "sel-info empty";
        info.textContent = "Tidak ada slot terpilih di Illustrator.";
        setEditorEnabled(false);
        if (!silent && res.message) toast(res.message);
        return;
      }
      var d = res.data;
      info.className = "sel-info";
      info.innerHTML = d.count > 1
        ? "<b>" + d.count + " slot terpilih</b> \u2014 mode batch, semua aksi diterapkan sekaligus."
        : "<b>" + esc(d.label || d.slotId) + "</b> \u00b7 " + esc(d.size) +
          " \u00b7 rot " + (d.rotation || 0) + "\u00b0 \u00b7 zoom " + ((d.crop && d.crop.scale) || 100) + "%" +
          "<br><small style='color:#9a9a9a'>" + esc(d.sourcePath || "") + "</small>";
      setEditorEnabled(true);
    });
  }

  $("#btnRefreshSel").onclick = function () { refreshSelection(false); };

  $$("[data-nudge]").forEach(function (b) {
    b.onclick = function () {
      var v = b.getAttribute("data-nudge").split(",");
      B.call("nudge", { dx: Number(v[0]), dy: Number(v[1]) }, function (r) { toast(r.message, r.ok ? "ok" : "err"); });
    };
  });
  $$("[data-crop]").forEach(function (b) {
    b.onclick = function () {
      var v = b.getAttribute("data-crop").split(",");
      B.call("crop", { dx: Number(v[0]), dy: Number(v[1]) }, function (r) { toast(r.message, r.ok ? "ok" : "err"); });
    };
  });
  $$("[data-zoom]").forEach(function (b) {
    b.onclick = function () {
      B.call("crop", { scale: Number(b.getAttribute("data-zoom")) }, function (r) { toast(r.message, r.ok ? "ok" : "err"); });
    };
  });
  $$("[data-dup]").forEach(function (b) {
    b.onclick = function () {
      B.call("duplicateSlot", { dir: b.getAttribute("data-dup") }, function (r) { toast(r.message, r.ok ? "ok" : "err"); });
    };
  });

  $("#btnResetCrop").onclick = function () { B.call("crop", { reset: true }, function (r) { toast(r.message, r.ok ? "ok" : "err"); }); };
  $("#btnFlipH").onclick = function () { B.call("flip", { horizontal: true }, function (r) { toast(r.message, r.ok ? "ok" : "err"); }); };
  $("#btnFlipV").onclick = function () { B.call("flip", { vertical: true }, function (r) { toast(r.message, r.ok ? "ok" : "err"); }); };
  $("#btnRotate").onclick = function () { B.call("rotate90", {}, function (r) { toast(r.message, r.ok ? "ok" : "err"); }); };
  $("#btnDelete").onclick = function () {
    B.call("deleteSlot", {}, function (r) { toast(r.message, r.ok ? "ok" : "err"); refreshSelection(true); });
  };
  $("#btnReplace").onclick = function () {
    B.call("pickFiles", {}, function (res) {
      if (!res.ok || !res.data || !res.data.files.length) return;
      var f = res.data.files[0];
      B.call("replacePhoto", { path: f.path, sourceId: f.name }, function (r) { toast(r.message, r.ok ? "ok" : "err"); });
    });
  };

  document.addEventListener("keydown", function (e) {
    if (!e.altKey) return;
    var map = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] };
    var d = map[e.key];
    if (!d) return;
    e.preventDefault();
    B.call("nudge", { dx: d[0], dy: d[1] }, function () {});
  });

  /* ---------------- init ---------------- */
  function init() {
    /* FIX 3: Selalu render preset ukuran dari S.sizes (termasuk 2R-8R)
       SEBELUM cek items, supaya dropdown selalu lengkap. */
    renderSizePresets();
    renderPhotos();
    if (!S.get().items.length) { S.addItem("4x6"); S.addItem("3x4"); S.addItem("2x3"); }
    renderOrder();
    bindOptions();
    preview();

    var info = $("#hostInfo");
    var connected = !!B.isCEP;
    info.textContent = connected ? "Illustrator ready" : "Mode browser";
    info.title = connected
      ? "Terhubung ke " + (B.host.appName || "Illustrator") + " " + (B.host.appVersion || "") + " \u00b7 v2.4.0"
      : "Mode browser (preview saja) \u2014 buka di dalam Illustrator untuk fitur penuh. v2.4.0";
    $$(".logo-dot, .status-dot").forEach(function (d) { d.classList.toggle("off", !connected); });

    if (B.isCEP) {
      B.call("ping", {}, function () {});
      setInterval(function () { refreshSelection(true); }, 1400);
    } else {
      setEditorEnabled(false);
    }
    window.addEventListener("resize", preview);
  }

  init();
})();
