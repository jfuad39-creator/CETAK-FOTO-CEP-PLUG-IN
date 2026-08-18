/* Application bootstrap. Load this last. */
(function (window) {
  "use strict";
  var A = window.PFApp;
  var S = A.S, B = A.B;

  function init() {
    A.renderSizePresets();
    A.renderPhotos();
    if (!S.get().items.length) { S.addItem("4x6"); S.addItem("3x4"); S.addItem("2x3"); }
    A.renderOrder();
    A.bindOptions();
    A.preview();

    var info = A.$("#hostInfo");
    var connected = !!B.isCEP;
    info.textContent = connected ? "Illustrator ready" : "Mode browser";
    info.title = connected
      ? "Terhubung ke " + (B.host.appName || "Illustrator") + " " + (B.host.appVersion || "") + " · v2.3.0"
      : "Mode browser (preview saja) — buka di dalam Illustrator untuk fitur penuh. v2.3.0";
    A.$$(".logo-dot, .status-dot").forEach(function (d) { d.classList.toggle("off", !connected); });

    if (B.isCEP) {
      B.call("ping", {}, function () {});
      setInterval(function () { A.refreshSelection(true); }, 1400);
    } else {
      A.setEditorEnabled(false);
    }
    window.addEventListener("resize", A.preview);
  }

  init();
})(window);
