/* =====================================================================
 * Adobe CSInterface v7.0.0 Polyfill
 * ===================================================================== */
(function() {
  "use strict";

  function CSInterface() {
    this.hostEnvironment = null;
  }

  CSInterface.prototype.evalScript = function(script, callback) {
    if (window.__adobe_cep__) {
      window.__adobe_cep__.evalScript(script, callback || function() {});
    } else if (callback) {
      callback("undefined");
    }
  };

  CSInterface.prototype.getHostEnvironment = function() {
    if (!this.hostEnvironment && window.__adobe_cep__) {
      try {
        var jsonStr = window.__adobe_cep__.getHostEnvironment();
        this.hostEnvironment = JSON.parse(jsonStr);
      } catch(e) {}
    }
    return this.hostEnvironment || { appName: "ILST", appVersion: "28.0" };
  };

  CSInterface.prototype.closeExtension = function() {
    if (window.__adobe_cep__) {
      window.__adobe_cep__.closeExtension();
    }
  };

  CSInterface.prototype.addEventListener = function(type, listener, obj) {
    if (window.__adobe_cep__) {
      window.__adobe_cep__.addEventListener(type, listener, obj);
    }
  };

  CSInterface.prototype.removeEventListener = function(type, listener, obj) {
    if (window.__adobe_cep__) {
      window.__adobe_cep__.removeEventListener(type, listener, obj);
    }
  };

  window.CSInterface = CSInterface;
})();
