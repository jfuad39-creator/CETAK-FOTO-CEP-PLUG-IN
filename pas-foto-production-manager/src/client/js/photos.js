/* Photo source management and drag/drop UI. */
(function (window) {
  "use strict";
  var A = window.PFApp;
  var S = A.S, B = A.B;
  /* ---------------- photo source ---------------- */
  A.renderPhotos = function renderPhotos() {
    var grid = A.$("#photoGrid");
    var st = S.get();
    grid.innerHTML = "";
    A.$("#photoHint").style.display = st.photos.length ? "none" : "block";

    st.photos.forEach(function (p) {
      var card = A.el("div", "photo-card");
      var media = A.isRenderable(p.path)
        ? '<img class="thumb" src="' + A.esc(p.thumb || A.fileUrl(p.path)) + '" alt="" onerror="this.outerHTML=\'<div class=&quot;ph&quot;>TIFF</div>\'" />'
        : '<div class="ph">\ud83d\uddbc</div>';
      card.innerHTML =
        media +
        '<button class="del" title="Hapus">\u00d7</button>' +
        '<div class="meta"><span class="dot" style="background:' + A.esc(p.color) + '"></span>' +
        '<input class="nm" value="' + A.esc(p.name) + '" title="' + A.esc(p.path) + '" /></div>';

      card.querySelector(".del").onclick = function () {
        S.removePhoto(p.id); A.renderPhotos(); A.renderOrder(); A.preview();
      };
      card.querySelector(".nm").onchange = function (e) {
        p.name = e.target.value; S.save(); A.renderOrder();
      };
      grid.appendChild(card);
    });
  }

  A.addPhotoPaths = function addPhotoPaths(files) {
    if (!files || !files.length) return;
    files.forEach(function (f) { S.addPhoto(f.name, f.path, f.thumb || ""); });
    var st = S.get();
    st.items.forEach(function (it) {
      if (!it.sourceId && st.photos.length) it.sourceId = st.photos[0].id;
    });
    S.save();
    A.renderPhotos(); A.renderOrder(); A.preview();
    A.toast(files.length + " foto ditambahkan.", "ok");
  }

  A.$("#btnAddPhoto").onclick = function () {
    if (!B.isCEP) { A.toast("Fitur ini hanya aktif di dalam Illustrator.", "err"); return; }
    B.call("pickFiles", {}, function (res) {
      if (!res.ok) return A.toast(res.message, "err");
      addPhotoPaths((res.data && res.data.files) || []);
    });
  };

  A.$("#btnFromSelection").onclick = function () {
    if (!B.isCEP) { A.toast("Fitur ini hanya aktif di dalam Illustrator.", "err"); return; }
    B.call("fromSelection", {}, function (res) {
      if (!res.ok) return A.toast(res.message, "err");
      addPhotoPaths((res.data && res.data.files) || []);
    });
  };

  var dz = A.$("#dropZone");
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
    if (!out.length) return A.toast("Hanya JPG / PNG / TIFF yang didukung.", "err");
    addPhotoPaths(out);
  });

})(window);
