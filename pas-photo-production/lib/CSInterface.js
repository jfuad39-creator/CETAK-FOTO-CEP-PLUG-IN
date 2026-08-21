/* =====================================================================
 * CSInterface (kompak, fungsional) untuk CEP 10 - Pas Foto Print
 * ---------------------------------------------------------------------
 * Implementasi ringkas namun lengkap untuk kebutuhan panel: evalScript,
 * host environment, system path, theme color, event listener, buka URL,
 * dan fallback aman bila HTML dijalankan di browser biasa (untuk testing).
 * ===================================================================== */
function SystemPath() {}
SystemPath.USER_DATA = "userData";
SystemPath.COMMON_FILES = "commonFiles";
SystemPath.MY_DOCUMENTS = "myDocuments";
SystemPath.APPLICATION = "application";
SystemPath.EXTENSION = "extension";
SystemPath.HOST_APPLICATION = "hostApplication";

function CSEvent(type, scope, appId, extensionId) {
  this.type = type;
  this.scope = scope || "APPLICATION";
  this.appId = appId;
  this.extensionId = extensionId;
  this.data = "";
}

function ColorType() {}
ColorType.RGB = "rgb";
ColorType.NONE = "none";

function CSInterface() {
  this.hostEnvironment = this.getHostEnvironment();
}

CSInterface.THEME_COLOR_CHANGED_EVENT = "com.adobe.csxs.events.ThemeColorChanged";

CSInterface.prototype.isCEP = function () {
  return (typeof window !== "undefined") && !!window.__adobe_cep__;
};

CSInterface.prototype.getHostEnvironment = function () {
  if (!this.isCEP()) {
    return { appName: "BROWSER", appVersion: "0", appLocale: "en_US", appUILocale: "en_US", isBrowser: true };
  }
  try { return JSON.parse(window.__adobe_cep__.getHostEnvironment()); }
  catch (e) { return { appName: "ILST", appVersion: "0" }; }
};

CSInterface.prototype.getApplicationID = function () {
  var env = this.getHostEnvironment();
  return env ? env.appName : "ILST";
};

CSInterface.prototype.getExtensionID = function () {
  if (!this.isCEP()) return "browser";
  return window.__adobe_cep__.getExtensionId();
};

CSInterface.prototype.getSystemPath = function (pathType) {
  if (!this.isCEP()) return "";
  var path = decodeURI(window.__adobe_cep__.getSystemPath(pathType));
  var prefix = "file://";
  if (path.indexOf(prefix) === 0) {
    path = path.substr(prefix.length);
    if (/^\/[a-zA-Z]:/.test(path)) path = path.substr(1);
  }
  return path;
};

CSInterface.prototype.evalScript = function (script, callback) {
  if (!this.isCEP()) {
    if (callback) callback(JSON.stringify({ ok: false, message: "Panel tidak berjalan di dalam Illustrator (mode browser)." }));
    return;
  }
  if (callback === null || callback === undefined) callback = function () {};
  window.__adobe_cep__.evalScript(script, callback);
};

CSInterface.prototype.addEventListener = function (type, listener, obj) {
  if (!this.isCEP()) return;
  window.__adobe_cep__.addEventListener(type, listener, obj);
};

CSInterface.prototype.removeEventListener = function (type, listener, obj) {
  if (!this.isCEP()) return;
  window.__adobe_cep__.removeEventListener(type, listener, obj);
};

CSInterface.prototype.dispatchEvent = function (event) {
  if (!this.isCEP()) return;
  if (typeof event.data === "object") event.data = JSON.stringify(event.data);
  window.__adobe_cep__.dispatchEvent(event);
};

CSInterface.prototype.requestOpenExtension = function (extensionId, params) {
  if (!this.isCEP()) return;
  window.__adobe_cep__.requestOpenExtension(extensionId, params);
};

CSInterface.prototype.closeExtension = function () {
  if (!this.isCEP()) return;
  window.__adobe_cep__.closeExtension();
};

CSInterface.prototype.openURLInDefaultBrowser = function (url) {
  if (!this.isCEP()) { window.open(url, "_blank"); return; }
  if (typeof cep !== "undefined" && cep.util) return cep.util.openURLInDefaultBrowser(url);
  window.open(url, "_blank");
};

CSInterface.prototype.getHostCapabilities = function () {
  if (!this.isCEP()) return {};
  try { return JSON.parse(window.__adobe_cep__.getHostCapabilities()); } catch (e) { return {}; }
};

CSInterface.prototype.getExtensions = function (ids) {
  if (!this.isCEP()) return [];
  try { return JSON.parse(window.__adobe_cep__.getExtensions(ids ? JSON.stringify(ids) : undefined)); }
  catch (e) { return []; }
};

CSInterface.prototype.getNetworkPreferences = function () {
  if (!this.isCEP()) return {};
  try { return JSON.parse(window.__adobe_cep__.getNetworkPreferences()); } catch (e) { return {}; }
};

CSInterface.prototype.initResourceBundle = function () {
  if (!this.isCEP()) return {};
  try { return JSON.parse(window.__adobe_cep__.initResourceBundle()); } catch (e) { return {}; }
};

CSInterface.prototype.getHostAppUIColorInfo = function () {
  if (!this.isCEP()) return null;
  try { return JSON.parse(window.__adobe_cep__.getHostEnvironment()).appSkinInfo; } catch (e) { return null; }
};

CSInterface.prototype.getOSInformation = function () {
  if (typeof navigator === "undefined") return "Unknown";
  var ua = navigator.userAgent;
  if (ua.indexOf("Windows") >= 0) return "Windows";
  if (ua.indexOf("Mac") >= 0) return "Mac OS X";
  return "Unknown";
};

CSInterface.prototype.setWindowTitle = function (title) {
  if (!this.isCEP()) { document.title = title; return; }
  try { window.__adobe_cep__.invokeSync("setWindowTitle", title); } catch (e) {}
};

CSInterface.prototype.resizeContent = function (width, height) {
  if (!this.isCEP()) return;
  try { window.__adobe_cep__.resizeContent(width, height); } catch (e) {}
};
