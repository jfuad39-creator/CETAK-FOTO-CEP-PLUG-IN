/* =====================================================================
 * client/js/bridge.js — jembatan panel <-> ExtendScript.
 * Semua pemanggilan host lewat sini, dengan parsing response yang aman.
 * ===================================================================== */
(function (root) {
  "use strict";

  var cs = new CSInterface();

  function encode(obj) {
    return encodeURIComponent(JSON.stringify(obj || {}));
  }

  function parse(raw) {
    if (raw === undefined || raw === null || raw === "") {
      return { ok: false, message: "Host tidak merespons (kosong)." };
    }
    if (typeof raw === "string" && raw.indexOf("EvalScript error") === 0) {
      return { ok: false, message: "ExtendScript error. Cek host/main.jsx." };
    }
    try {
      var r = JSON.parse(raw);
      if (typeof r.ok === "undefined") return { ok: true, message: "OK", data: r };
      return r;
    } catch (e) {
      return { ok: false, message: String(raw) };
    }
  }

  /**
   * call("generate", {...}) -> Promise-like via callback
   */
  function call(fn, args, cb) {
    var script = "PFPM." + fn + "(" + (args === undefined ? "" : '"' + encode(args) + '"') + ")";
    cs.evalScript(script, function (raw) {
      var res = parse(raw);
      if (cb) cb(res);
    });
  }

  function callPromise(fn, args) {
    return new Promise(function (resolve) { call(fn, args, resolve); });
  }

  root.PFBridge = {
    cs: cs,
    call: call,
    async: callPromise,
    isCEP: cs.isCEP(),
    host: cs.getHostEnvironment(),
    extensionRoot: cs.getSystemPath(SystemPath.EXTENSION)
  };
})(window);
