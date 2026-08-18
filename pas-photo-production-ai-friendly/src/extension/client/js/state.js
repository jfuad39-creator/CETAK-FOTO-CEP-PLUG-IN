/* =====================================================================
 * client/js/state.js — state panel + persistensi localStorage.
 * ===================================================================== */
(function (root) {
  "use strict";

  var KEY = "pfpm.state.v22";

  var DEFAULT_SIZES = [
    { id: "4x6", label: "4x6", width: 40, height: 60 },
    { id: "3x4", label: "3x4", width: 30, height: 40 },
    { id: "2x3", label: "2x3", width: 20, height: 30 },
    { id: "2R", label: "2R", width: 60, height: 90 },
    { id: "3R", label: "3R", width: 89, height: 127 },
    { id: "4R", label: "4R", width: 102, height: 152 },
    { id: "5R", label: "5R", width: 127, height: 178 },
    { id: "6R", label: "6R", width: 152, height: 203 },
    { id: "8R", label: "8R", width: 203, height: 254 }
  ];

  var defaults = {
    photos: [],           // {id, name, path, thumb, color}
    items: [],            // {id, label, width, height, quantity, sourceId}
    media: { type: "A4", orientation: "portrait", margin: 5, gap: 0 },
    options: {
      offsetBorder: 1.5,
      rotateMode: "auto",
      cutGuide: false,
      grouping: "flat",
      artboards: true
    }
  };

  var COLORS = ["#ef4444", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316"];

  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  var state = clone(defaults);

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return;
      var parsed = JSON.parse(raw);
      state.photos = parsed.photos || [];
      state.items = parsed.items || [];
      state.media = parsed.media || clone(defaults.media);
      state.options = parsed.options || clone(defaults.options);
      if (typeof state.options.offsetBorder !== "number") state.options.offsetBorder = Number(state.options.borderWidth || 1.5);
      delete state.options.borderWidth;
      if (state.options.grouping === "none" || typeof state.options.grouping !== "string") state.options.grouping = "flat";
    } catch (e) { /* abaikan state rusak */ }
  }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
  }

  function uid(prefix) {
    return (prefix || "id") + "-" + Math.random().toString(36).substr(2, 7);
  }

  function nextColor() {
    return COLORS[state.photos.length % COLORS.length];
  }

  function addPhoto(name, path, thumb) {
    var p = { id: uid("photo"), name: name, path: path, thumb: thumb || "", color: nextColor() };
    state.photos.push(p);
    save();
    return p;
  }

  function removePhoto(id) {
    state.photos = state.photos.filter(function (p) { return p.id !== id; });
    state.items.forEach(function (it) { if (it.sourceId === id) it.sourceId = ""; });
    save();
  }

  function addItem(sizeId) {
    var preset = DEFAULT_SIZES.filter(function (s) { return s.id === sizeId; })[0] || DEFAULT_SIZES[0];
    var item = {
      id: uid("item"),
      sizeId: preset.id,
      label: preset.label,
      width: preset.width,
      height: preset.height,
      quantity: preset.id === "2x3" ? 6 : 4,
      sourceId: state.photos.length ? state.photos[0].id : ""
    };
    state.items.push(item);
    save();
    return item;
  }

  function removeItem(id) {
    state.items = state.items.filter(function (i) { return i.id !== id; });
    save();
  }

  function photoById(id) {
    return state.photos.filter(function (p) { return p.id === id; })[0] || null;
  }

  function reset() {
    state = clone(defaults);
    save();
  }

  /** Membangun job object untuk PFLayout.generate() */
  function buildJob() {
    var items = state.items.map(function (it) {
      var src = photoById(it.sourceId);
      return {
        id: it.sizeId + "|" + it.id.substr(-4),
        label: it.label,
        width: Number(it.width),
        height: Number(it.height),
        quantity: Number(it.quantity),
        sourceId: it.sourceId,
        sourcePath: src ? src.path : ""
      };
    });
    return { items: items, media: clone(state.media), options: clone(state.options) };
  }

  load();

  root.PFState = {
    get: function () { return state; },
    save: save,
    reset: reset,
    uid: uid,
    sizes: DEFAULT_SIZES,
    colors: COLORS,
    addPhoto: addPhoto,
    removePhoto: removePhoto,
    addItem: addItem,
    removeItem: removeItem,
    photoById: photoById,
    buildJob: buildJob
  };
})(window);
