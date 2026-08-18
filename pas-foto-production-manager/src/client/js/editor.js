/* Illustrator selection editor controls. */
(function (window) {
  "use strict";
  var A = window.PFApp;
  var B = A.B;
  /* ---------------- editor ---------------- */
  A.setEditorEnabled = function setEditorEnabled(on) {
    A.$("#editorBody").className = "editor" + (on ? "" : " disabled");
  }

  A.refreshSelection = function refreshSelection(silent) {
    if (!B.isCEP) { A.setEditorEnabled(false); return; }
    B.call("selectionInfo", {}, function (res) {
      var info = A.$("#selInfo");
      if (!res.ok || !res.data || !res.data.count) {
        info.className = "sel-info empty";
        info.textContent = "Tidak ada slot terpilih di Illustrator.";
        A.setEditorEnabled(false);
        if (!silent && res.message) A.toast(res.message);
        return;
      }
      var d = res.data;
      info.className = "sel-info";
      info.innerHTML = d.count > 1
        ? "<b>" + d.count + " slot terpilih</b> \u2014 mode batch, semua aksi diterapkan sekaligus."
        : "<b>" + A.esc(d.label || d.slotId) + "</b> \u00b7 " + A.esc(d.size) +
          " \u00b7 rot " + (d.rotation || 0) + "\u00b0 \u00b7 zoom " + ((d.crop && d.crop.scale) || 100) + "%" +
          "<br><small style='color:#9a9a9a'>" + A.esc(d.sourcePath || "") + "</small>";
      A.setEditorEnabled(true);
    });
  }

  A.$("#btnRefreshSel").onclick = function () { A.refreshSelection(false); };

  $A.$("[data-nudge]").forEach(function (b) {
    b.onclick = function () {
      var v = b.getAttribute("data-nudge").split(",");
      B.call("nudge", { dx: Number(v[0]), dy: Number(v[1]) }, function (r) { A.toast(r.message, r.ok ? "ok" : "err"); });
    };
  });
  $A.$("[data-crop]").forEach(function (b) {
    b.onclick = function () {
      var v = b.getAttribute("data-crop").split(",");
      B.call("crop", { dx: Number(v[0]), dy: Number(v[1]) }, function (r) { A.toast(r.message, r.ok ? "ok" : "err"); });
    };
  });
  $A.$("[data-zoom]").forEach(function (b) {
    b.onclick = function () {
      B.call("crop", { scale: Number(b.getAttribute("data-zoom")) }, function (r) { A.toast(r.message, r.ok ? "ok" : "err"); });
    };
  });
  $A.$("[data-dup]").forEach(function (b) {
    b.onclick = function () {
      B.call("duplicateSlot", { dir: b.getAttribute("data-dup") }, function (r) { A.toast(r.message, r.ok ? "ok" : "err"); });
    };
  });

  A.$("#btnResetCrop").onclick = function () { B.call("crop", { reset: true }, function (r) { A.toast(r.message, r.ok ? "ok" : "err"); }); };
  A.$("#btnFlipH").onclick = function () { B.call("flip", { horizontal: true }, function (r) { A.toast(r.message, r.ok ? "ok" : "err"); }); };
  A.$("#btnFlipV").onclick = function () { B.call("flip", { vertical: true }, function (r) { A.toast(r.message, r.ok ? "ok" : "err"); }); };
  A.$("#btnRotate").onclick = function () { B.call("rotate90", {}, function (r) { A.toast(r.message, r.ok ? "ok" : "err"); }); };
  A.$("#btnDelete").onclick = function () {
    B.call("deleteSlot", {}, function (r) { A.toast(r.message, r.ok ? "ok" : "err"); A.refreshSelection(true); });
  };
  A.$("#btnReplace").onclick = function () {
    B.call("pickFiles", {}, function (res) {
      if (!res.ok || !res.data || !res.data.files.length) return;
      var f = res.data.files[0];
      B.call("replacePhoto", { path: f.path, sourceId: f.name }, function (r) { A.toast(r.message, r.ok ? "ok" : "err"); });
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


})(window);
