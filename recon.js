/* PS5 Recon 13.60 - telemetria passiva (ES5, compatível com WebKit do PS5) */
(function () {
  "use strict";
  var BEACON = "https://webhook.site/3a552f92-c843-4779-9581-41052641915a";
  var BEACON_INTERVAL = 10000; // ms

  function $(id) { return document.getElementById(id); }
  function set(id, html) { var el = $(id); if (el) el.innerHTML = html; }
  function log(msg) {
    var el = $("log");
    if (el) el.textContent = (new Date().toISOString()) + " " + msg + "\n" + el.textContent.slice(0, 4000);
  }

  function safe(obj) {
    try {
      return JSON.stringify(obj, function (k, v) {
        if (typeof v === "function") return undefined;
        if (typeof v === "bigint") return v.toString();
        return v;
      });
    } catch (e) { return "{\"error\":\"" + String(e) + "\"}"; }
  }

  function probe(fn) {
    try { return !!fn(); } catch (e) { return false; }
  }

  function getUA() { return navigator.userAgent || ""; }
  function fwFromUA(ua) {
    var m = /PlayStation 5\/([\d.]+)/.exec(ua);
    return m ? m[1] : "";
  }

  /* ---- fingerprint leve (canvas) ---- */
  function canvasFP() {
    try {
      var c = document.createElement("canvas");
      c.width = 220; c.height = 40;
      var ctx = c.getContext("2d");
      ctx.textBaseline = "top";
      ctx.font = "14px Arial";
      ctx.fillStyle = "#f60";
      ctx.fillRect(0, 0, 220, 40);
      ctx.fillStyle = "#069";
      ctx.fillText("PS5\xe2\x80\xa2recon\xe2\x80\xa21360\xe2\x80\xa2abcdef", 4, 8);
      var d = ctx.getImageData(0, 0, 220, 40).data;
      var h = 5381;
      for (var i = 0; i < d.length; i += 16) { h = ((h << 5) + h + d[i]) >>> 0; }
      c.width = c.height = 0;
      return "0x" + h.toString(16);
    } catch (e) { return "n/a"; }
  }

  function webglInfo() {
    var info = { renderer: "n/a", vendor: "n/a", version: "n/a" };
    try {
      var canvas = document.createElement("canvas");
      var gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
      if (gl) {
        var dbg = gl.getExtension("WEBGL_debug_renderer_info");
        if (dbg) {
          info.renderer = String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL));
          info.vendor = String(gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL));
        }
        info.version = String(gl.getParameter(gl.VERSION));
        info.shading = String(gl.getParameter(gl.SHADING_LANGUAGE_VERSION));
      }
    } catch (e) { info.error = String(e); }
    return info;
  }

  /* ---- benchmark JS leve ---- */
  function bench() {
    var t0 = performance.now(), x = 0;
    for (var i = 0; i < 2000000; i++) { x += (i % 7) * 3.14159; }
    var t1 = performance.now();
    var t2 = performance.now(), y = 0;
    for (var j = 0; j < 500000; j++) { y = y + Math.sqrt(j) * 0.5; }
    var t3 = performance.now();
    return { loop2m_ms: Math.round(t1 - t0), sqrt500k_ms: Math.round(t3 - t2), checksum: x + y };
  }

  function collect() {
    var ua = getUA();
    var data = {
      t: Date.now(),
      kind: "recon",
      session: sessionId(),
      ua: ua,
      fw: fwFromUA(ua),
      referrer: document.referrer || "",
      url: location.href,
      lang: navigator.language || "",
      platform: navigator.platform || "",
      vendor: navigator.vendor || "",
      productSub: navigator.productSub || "",
      appVersion: navigator.appVersion || "",
      cores: (navigator.hardwareConcurrency || "n/a"),
      mem: (navigator.deviceMemory || "n/a"),
      screen: screen.width + "x" + screen.height + "@dpr" + (window.devicePixelRatio || 1),
      colorDepth: screen.colorDepth || "n/a",
      online: navigator.onLine,
      plugins: (function () { try { return navigator.plugins.length; } catch (e) { return -1; } })(),
      caps: {
        worker: probe(function () { return typeof Worker !== "undefined"; }),
        sharedArrayBuffer: probe(function () { return typeof SharedArrayBuffer !== "undefined"; }),
        wasm: probe(function () { return typeof WebAssembly !== "undefined"; }),
        fetch: probe(function () { return typeof fetch !== "undefined"; }),
        sendBeacon: probe(function () { return typeof navigator.sendBeacon !== "undefined"; }),
        audio: probe(function () { return typeof (window.AudioContext || window.webkitAudioContext) !== "undefined"; }),
        oac: probe(function () { return typeof OfflineAudioContext !== "undefined"; }),
        indexedDB: probe(function () { return typeof indexedDB !== "undefined"; }),
        serviceWorker: probe(function () { return typeof navigator.serviceWorker !== "undefined"; }),
        localStore: probe(function () { window.localStorage.setItem("__t", "1"); return true; }),
        bigInt: probe(function () { return typeof BigInt !== "undefined"; }),
        shadowDom: probe(function () { return typeof Element.prototype.attachShadow !== "undefined"; })
      },
      fp: canvasFP(),
      gl: webglInfo(),
      bench: bench()
    };
    return data;
  }

  var _sid = null;
  function sessionId() {
    if (_sid) return _sid;
    try {
      _sid = localStorage.getItem("ps5recon_sid");
      if (!_sid) {
        _sid = "S-" + Date.now().toString(36) + "-" + Math.floor(Math.random() * 1e9).toString(36);
        localStorage.setItem("ps5recon_sid", _sid);
      }
    } catch (e) { _sid = "S-" + Date.now().toString(36); }
    return _sid;
  }

  /* ---- envio com fallbacks ---- */
  function send(data) {
    var body = safe(data);
    var ok = false;
    function done(mode) {
      if (!ok) { ok = true; log("sent via " + mode); }
      setStatus(true);
    }
    function fail(mode) { log("fail " + mode); setStatus(false); }

    try {
      if (typeof navigator.sendBeacon === "function") {
        var b = new Blob([body], { type: "text/plain" });
        if (navigator.sendBeacon(BEACON, b)) { done("sendBeacon"); return; }
      }
    } catch (e) {}
    try {
      if (typeof fetch === "function") {
        fetch(BEACON, { method: "POST", mode: "no-cors", cache: "no-store", body: body }).then(
          function () { done("fetch"); },
          function () { fail("fetch"); }
        );
        return;
      }
    } catch (e) {}
    try {
      var x = new XMLHttpRequest();
      x.open("POST", BEACON, true);
      x.setRequestHeader("Content-Type", "text/plain");
      x.onreadystatechange = function () {
        if (x.readyState === 4) { if (x.status >= 200 && x.status < 300) done("xhr"); else fail("xhr"); }
      };
      x.send(body);
      return;
    } catch (e) {}
    /* último recurso: image beacon */
    try {
      var im = new Image();
      im.src = BEACON + "?d=" + encodeURIComponent(body.slice(0, 1800));
      done("img");
    } catch (e) { fail("img"); }
  }

  function setStatus(on) {
    var s = $("status");
    if (s) { s.className = on ? "on" : "off"; s.textContent = on ? "\u25cf online - dados enviados" : "\u25cf offline - tentando novamente"; }
  }

  function render(data) {
    set("session", "<b>" + escapeHtml(data.session) + "</b><br><span class='dim'>in\u00edcio: " + new Date(data.t).toLocaleString() + "</span>");
    set("fw", "<b class='ok'>FW " + escapeHtml(data.fw || "?") + "</b><br><span class='dim'>UA:</span> " + escapeHtml(data.ua) + "<br><span class='dim'>platform:</span> " + escapeHtml(data.platform) + " \u00b7 <span class='dim'>vendor:</span> " + escapeHtml(data.vendor) + " \u00b7 <span class='dim'>lang:</span> " + escapeHtml(data.lang));
    set("hw", escapeHtml(data.screen) + "<br><span class='dim'>renderer:</span> " + escapeHtml(data.gl.renderer) + "<br><span class='dim'>vendor:</span> " + escapeHtml(data.gl.vendor) + "<br><span class='dim'>GL:</span> " + escapeHtml(data.gl.version) + " \u00b7 " + escapeHtml(data.gl.shading) + "<br><span class='dim'>cores:</span> " + data.cores + " \u00b7 <span class='dim'>mem:</span> " + data.mem + " \u00b7 <span class='dim'>prof:</span> " + data.colorDepth);
    var caps = [];
    for (var k in data.caps) { caps.push("<span class='badge " + (data.caps[k] ? "ok" : "warn") + "'>" + k + "=" + (data.caps[k] ? "1" : "0") + "</span>"); }
    set("caps", caps.join(""));
    set("fp", "canvas: <b>" + escapeHtml(data.fp) + "</b><br>bench: loop2m=" + data.bench.loop2m_ms + "ms \u00b7 sqrt500k=" + data.bench.sqrt500k_ms + "ms");
  }

  function escapeHtml(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function tick() {
    var data = collect();
    render(data);
    send(data);
  }

  /* primeira execução imediata + repetidor */
  try { tick(); } catch (e) { log("tick error: " + e); }
  setInterval(tick, BEACON_INTERVAL);
  log("recon.js iniciado \u00b7 beacon: " + BEACON);
})();
