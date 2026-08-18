/* Order/package/options UI. */
(function (window) {
  "use strict";
  var A = window.PFApp;
  var S = A.S;
  /* ---------------- order ---------------- */
  A.renderSizePresets = function renderSizePresets() {
    var sel = A.$("#sizePreset");
    sel.innerHTML = "";
    S.sizes.forEach(function (s) {
      var o = A.el("option");
      o.value = s.id;
      o.textContent = s.label + " (" + s.width + "\u00d7" + s.height + ")";
      sel.appendChild(o);
    });
  }

  A.renderOrder = function renderOrder() {
    var wrap = A.$("#orderList");
    var st = S.get();
    wrap.innerHTML = "";
    A.$("#orderHint").style.display = st.items.length ? "none" : "block";

    var showSrc = st.photos.length > 1;

    st.items.forEach(function (it) {
      var row = A.el("div", "order-row" + (showSrc ? " has-src" : ""));
      var opts = st.photos.map(function (p) {
        return '<option value="' + A.esc(p.id) + '"' + (p.id === it.sourceId ? " selected" : "") + '>' + A.esc(p.name) + "</option>";
      }).join("");
      row.innerHTML =
        '<span class="tag">' + A.esc(it.label) + "</span>" +
        '<input class="input w" type="number" step="1" min="5" value="' + it.width + '" title="Lebar (mm)" />' +
        '<input class="input h" type="number" step="1" min="5" value="' + it.height + '" title="Tinggi (mm)" />' +
        '<input class="input q" type="number" step="1" min="1" value="' + it.quantity + '" title="Quantity" />' +
        (showSrc ? '<select class="input src">' + (opts || '<option value="">\u2014 pilih foto \u2014</option>') + "</select>" : "") +
        '<button class="x" title="Hapus baris">\u00d7</button>';

      row.querySelector(".w").onchange = function (e) { it.width = Number(e.target.value) || 10; S.save(); A.preview(); };
      row.querySelector(".h").onchange = function (e) { it.height = Number(e.target.value) || 10; S.save(); A.preview(); };
      row.querySelector(".q").onchange = function (e) { it.quantity = Math.max(0, parseInt(e.target.value, 10) || 0); S.save(); A.preview(); };
      if (showSrc) row.querySelector(".src").onchange = function (e) { it.sourceId = e.target.value; S.save(); A.preview(); };
      row.querySelector(".x").onclick = function () { S.removeItem(it.id); A.renderOrder(); A.preview(); };
      attachSpinner(row.querySelector(".w"));
      attachSpinner(row.querySelector(".h"));
      attachSpinner(row.querySelector(".q"));
      wrap.appendChild(row);
    });
  }

  A.$("#btnAddItem").onclick = function () {
    S.addItem(A.$("#sizePreset").value);
    A.renderOrder(); A.preview();
  };

  /* paket cetak foto: isi cepat qty default 4x6=4, 3x4=4, 2x3=6 */
  var PRINT_PACKAGE = [
    { sizeId: "4x6", quantity: 4 },
    { sizeId: "3x4", quantity: 4 },
    { sizeId: "2x3", quantity: 6 }
  ];
  A.$("#btnPrintPackage").onclick = function () {
    var st = S.get();
    PRINT_PACKAGE.forEach(function (p) {
      var existing = st.items.filter(function (it) { return it.sizeId === p.sizeId; })[0];
      if (existing) existing.quantity = p.quantity;
      else S.addItem(p.sizeId);
    });
    S.save();
    A.renderOrder(); A.preview();
    A.toast("Paket cetak foto diterapkan.", "ok");
  };

  /* ---------------- options ---------------- */
  A.bindOptions = function bindOptions() {
    var st = S.get();
    A.$("#mediaType").value = st.media.type;
    A.$("#orientation").value = st.media.orientation;
    A.$("#margin").value = st.media.margin;
    A.$("#gap").value = st.media.gap;
    A.$("#offsetBorder").value = st.options.offsetBorder;
    A.$("#rotateMode").value = st.options.rotateMode;
    A.$("#cutGuide").checked = !!st.options.cutGuide;
    A.$("#artboards").checked = st.options.artboards !== false;
    $A.$('input[name="grouping"]').forEach(function (r) { r.checked = (r.value === st.options.grouping); });

    function on(id, fn) { A.$(id).onchange = function (e) { fn(e.target); S.save(); A.preview(); }; }
    on("#mediaType", function (t) { st.media.type = t.value; });
    on("#orientation", function (t) { st.media.orientation = t.value; });
    on("#margin", function (t) { st.media.margin = Number(t.value) || 0; });
    on("#gap", function (t) { st.media.gap = Number(t.value) || 0; });
    on("#offsetBorder", function (t) { st.options.offsetBorder = Number(t.value) || 0; });
    on("#rotateMode", function (t) { st.options.rotateMode = t.value; });
    on("#cutGuide", function (t) { st.options.cutGuide = t.checked; });
    on("#artboards", function (t) { st.options.artboards = t.checked; });
    $A.$('input[name="grouping"]').forEach(function (r) {
      r.onchange = function () { if (r.checked) { st.options.grouping = r.value; S.save(); } };
    });

    attachSpinner(A.$("#margin"));
    attachSpinner(A.$("#gap"));
    attachSpinner(A.$("#offsetBorder"));
  }

})(window);
