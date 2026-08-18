/* PFPM UI Core — shared browser-side helpers and services. */
(function (window) {
  "use strict";
  var S = window.PFState;
  var B = window.PFBridge;
  var L = window.PFLayout;
  var A = window.PFApp = window.PFApp || {};
  A.S = S; A.B = B; A.L = L; A.lastLayout = null;

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

  A.$ = $; A.$$ = $$; A.el = el; A.esc = esc; A.fileUrl = fileUrl; A.isRenderable = isRenderable;

  /* Number input spinner used by all parameter fields. */
  A.attachSpinner = function (input) {
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
  };

  var toastTimer = null;
  A.toast = function (msg, kind) {
    var t = $("#toast");
    t.textContent = msg;
    t.className = "toast show " + (kind || "");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.className = "toast " + (kind || ""); }, 2600);
  };
})(window);
