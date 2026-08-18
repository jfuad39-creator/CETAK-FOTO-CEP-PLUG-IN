/* Layout preview renderer. Keeps layout calculations separate from DOM rendering. */
(function (window) {
  "use strict";
  var A = window.PFApp;
  var S = A.S, L = A.L;
  /* ---------------- preview ---------------- */
  A.preview = function preview() {
    var box = A.$("#preview");
    var msg = A.$("#previewMsg");
    box.innerHTML = "";
    msg.textContent = "";
    msg.className = "msg";
    A.lastLayout = null;

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

    A.lastLayout = layout;
    A.$("#statSheets").textContent = layout.sheets.length;
    A.$("#statSlots").textContent = layout.placed;
    A.$("#statEff").textContent = layout.efficiency.toFixed(1) + "%";
    A.$("#statWaste").textContent = (100 - layout.efficiency).toFixed(1) + "%";

    var RV_W = 30;      // width of the left (vertical) ruler column, px
    var boxStyle = window.getComputedStyle(box);
    var boxPadX = (parseFloat(boxStyle.paddingLeft) || 0) + (parseFloat(boxStyle.paddingRight) || 0);
    var containerW = Math.max(220, (box.clientWidth || 320) - boxPadX);
    var availW = Math.max(120, containerW - RV_W - 6);

    layout.sheets.forEach(function (sheet) {
      var scale = Math.min(availW / sheet.width, 3.2);
      var wPx = Math.round(sheet.width * scale);
      var hPx = Math.round(sheet.height * scale);

      var blockEl = A.el("div", "sheet-block");
      blockEl.appendChild(A.el("div", "sheet-caption",
        "Sheet " + sheet.index + " \u00b7 " + sheet.slots.length + " foto \u00b7 " + sheet.efficiency.toFixed(1) + "%"));

      var stage = A.el("div", "sheet-stage");

      var hRuler = A.el("div", "ruler-h");
      hRuler.style.width = wPx + "px";
      hRuler.style.marginLeft = RV_W + "px";
      hRuler.innerHTML = '<span class="ruler-arrow">\u25c0</span><span class="ruler-line"></span><span class="ruler-arrow">\u25b6</span>';
      stage.appendChild(hRuler);

      var row = A.el("div", "stage-row");

      var vRuler = A.el("div", "ruler-v");
      vRuler.style.height = hPx + "px";
      vRuler.style.width = RV_W + "px";
      vRuler.innerHTML =
        '<span class="rv-label">' + sheet.height + " mm</span>" +
        '<span class="rv-arrows"><span class="ruler-arrow">\u25b2</span><span class="rv-line"></span><span class="ruler-arrow">\u25bc</span></span>';
      row.appendChild(vRuler);

      var page = A.el("div", "sheet");
      page.style.width = wPx + "px";
      page.style.height = hPx + "px";

      var m = Math.round((sheet.margin || 0) * scale);
      if (m > 0) {
        var guide = A.el("div", "sheet-guide");
        guide.style.left = m + "px"; guide.style.top = m + "px";
        guide.style.right = m + "px"; guide.style.bottom = m + "px";
        page.appendChild(guide);
      }

      sheet.slots.forEach(function (s) {
        var d = A.el("div", "slot" + (s.rotation ? " rot" : ""));
        d.style.left = (s.x * scale) + "px";
        d.style.top = (s.y * scale) + "px";
        d.style.width = (s.width * scale) + "px";
        d.style.height = (s.height * scale) + "px";

        var photo = S.get().photos.filter(function (p) { return p.path === s.sourcePath; })[0];

        // Kotak slot (border) sudah pakai dimensi hasil swap saat rotasi
        // 90/270\u00b0. Fotonya sendiri baru "kelihatan" terotasi kalau
        // digambar pada kotak dimensi ASLI (sebelum swap) lalu diputar
        // dengan CSS transform \u2014 sama seperti fitPlaced() di
        // host/main.jsx yang merotasi foto dulu baru di-fit ke frame.
        var rot = ((Number(s.rotation) || 0) % 360 + 360) % 360;
        var swapped = (rot % 180) !== 0;
        var pw = swapped ? s.height : s.width;
        var ph = swapped ? s.width : s.height;

        var photoEl = A.el("div", "slot-photo");
        photoEl.style.width = (pw * scale) + "px";
        photoEl.style.height = (ph * scale) + "px";
        photoEl.style.transform = "translate(-50%,-50%)" + (rot ? " rotate(" + rot + "deg)" : "");
        if (photo && A.isRenderable(photo.path)) {
          photoEl.style.backgroundImage = "url('" + (photo.thumb || A.fileUrl(photo.path)) + "')";
        } else {
          photoEl.style.background = (photo && photo.color) || "#8aa";
        }
        d.appendChild(photoEl);

        d.title = s.label + " " + s.physicalWidth + "\u00d7" + s.physicalHeight + "mm" + (s.rotation ? " (rotasi 90\u00b0)" : "");
        page.appendChild(d);
      });

      // Garis border/potong: digambar setelah semua foto (menumpuk di atas,
      // sama seperti bringBordersToFront() di host/main.jsx) dan memakai
      // ruang offset border di sekeliling tiap frame. Dengan ini, celah
      // kosong yang terlihat di preview sama persis dengan nilai "gap" \u2014
      // kalau gap = 0, border antar slot saling menempel tanpa celah,
      // bukan terlihat berjarak karena ruang offset border tersembunyi.
      sheet.slots.forEach(function (s) {
        var ob = Math.max(0, Number(s.offsetBorder) || 0);
        var bd = A.el("div", "slot-border");
        bd.style.left = ((s.x - ob) * scale) + "px";
        bd.style.top = ((s.y - ob) * scale) + "px";
        bd.style.width = ((s.width + 2 * ob) * scale) + "px";
        bd.style.height = ((s.height + 2 * ob) * scale) + "px";
        page.appendChild(bd);
      });

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

  A.$("#btnPreview").onclick = A.preview;

})(window);
