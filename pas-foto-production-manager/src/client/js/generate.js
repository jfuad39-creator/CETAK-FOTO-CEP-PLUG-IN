/* Illustrator generation and document actions. */
(function (window) {
  "use strict";
  var A = window.PFApp;
  var B = A.B, S = A.S;
  /* ---------------- generate ---------------- */
  A.$("#btnGenerate").onclick = function () {
    if (!A.lastLayout) A.preview();
    if (!A.lastLayout) return A.toast("Layout belum siap.", "err");
    if (!B.isCEP) return A.toast("Buka panel di dalam Illustrator untuk generate.", "err");

    var st = S.get();
    var btn = A.$("#btnGenerate");
    btn.disabled = true;
    btn.textContent = "\u23f3 Generating\u2026";

    B.call("generate", {
      layout: A.lastLayout,
      grouping: st.options.grouping,
      artboards: st.options.artboards !== false
    }, function (res) {
      btn.disabled = false;
      btn.textContent = "\u26a1 Generate ke Illustrator";
      A.toast(res.message, res.ok ? "ok" : "err");
    });
  };

  A.$("#btnUngroup").onclick = function () {
    if (!B.isCEP) return A.toast("Hanya tersedia di dalam Illustrator.", "err");
    B.call("ungroupAll", {}, function (res) { A.toast(res.message, res.ok ? "ok" : "err"); });
  };

  A.$("#btnUndo").onclick = function () {
    B.call("undo", {}, function (res) { A.toast(res.message, res.ok ? "ok" : "err"); });
  };

  A.$("#btnCreateDoc").onclick = function () {
    if (!B.isCEP) return A.toast("Hanya tersedia di dalam Illustrator.", "err");
    var btn = A.$("#btnCreateDoc");
    if (btn.disabled) return;
    var st = S.get();
    var label = btn.querySelector("span");
    var labelText = label ? label.textContent : "";
    btn.disabled = true;
    if (label) label.textContent = "\u2026";
    B.call("createDocument", { media: st.media }, function (res) {
      btn.disabled = false;
      if (label) label.textContent = labelText;
      A.toast(res.message, res.ok ? "ok" : "err");
    });
  };

})(window);
