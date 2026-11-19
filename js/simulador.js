// LED URBANO — simulador: mostra o vídeo ou a imagem do cliente na tela do painel real (foto noturna).
// O arquivo é aberto só no navegador da pessoa; nada é enviado para servidor.
(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  var stage = $("sim-stage"), foto = $("sim-foto"), tela = $("sim-tela"), input = $("sim-arquivo");
  if (!stage || !foto || !tela) return;
  var MAX_S = 15;
  // Cantos da tela do painel na foto original (832 × 1248 px): sup. esq., sup. dir., inf. dir., inf. esq.
  var QUAD = [[266, 236], [557, 264], [572, 762], [264, 762]];
  var W0 = 1080, H0 = 2160; // tela desenhada em 1:2 e projetada sobre a foto
  var midia = null, url = null, modo = "preencher", leds = false;

  // ---------- Projeção em perspectiva (retângulo → quadrilátero) ----------
  function resolve(A, b) { // eliminação de Gauss 8×8
    var n = b.length, M = A.map(function (r, i) { return r.concat([b[i]]); });
    for (var c = 0; c < n; c++) {
      var p = c; for (var r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
      var t = M[c]; M[c] = M[p]; M[p] = t;
      for (var r2 = 0; r2 < n; r2++) if (r2 !== c) { var f = M[r2][c] / M[c][c]; for (var k = c; k <= n; k++) M[r2][k] -= f * M[c][k]; }
    }
    return M.map(function (r, i) { return r[n] / r[i]; });
  }
  function matriz(de, para) {
    var A = [], b = [];
    for (var i = 0; i < 4; i++) {
      var x = de[i][0], y = de[i][1], X = para[i][0], Y = para[i][1];
      A.push([x, y, 1, 0, 0, 0, -x * X, -y * X]); b.push(X);
      A.push([0, 0, 0, x, y, 1, -x * Y, -y * Y]); b.push(Y);
    }
    var h = resolve(A, b);
    return [h[0], h[3], 0, h[6], h[1], h[4], 0, h[7], 0, 0, 1, 0, h[2], h[5], 0, 1];
  }
  function posicionar() {
    var k = foto.clientWidth / (foto.naturalWidth || 832);
    var dest = QUAD.map(function (p) { return [p[0] * k, p[1] * k]; });
    var m = matriz([[0, 0], [W0, 0], [W0, H0], [0, H0]], dest);
    tela.style.width = W0 + "px"; tela.style.height = H0 + "px";
    tela.style.transform = "matrix3d(" + m.map(function (v) { return v.toFixed(10); }).join(",") + ")";
  }
  if (foto.complete) posicionar(); else foto.addEventListener("load", posicionar);
  window.addEventListener("resize", posicionar);

  // ---------- Mídia do cliente ----------
  function limpar() {
    if (midia) { if (midia.pause) midia.pause(); midia.remove(); midia = null; }
    if (url) { URL.revokeObjectURL(url); url = null; }
    pararExemplo();
  }
  function aplicarModo() {
    tela.classList.toggle("contain", modo === "ajustar");
    tela.classList.toggle("leds", leds);
  }
  function avisos(lista, tipo) {
    var ul = $("sim-avisos"); ul.textContent = "";
    lista.forEach(function (a) { var li = document.createElement("li"); li.textContent = a[0]; li.className = a[1]; ul.appendChild(li); });
    $("sim-analise").hidden = false;
  }
  function analisar(w, h, dur, nome, bytes, video) {
    var L = [], r = w / h;
    $("sim-info").textContent = nome + " · " + w + " × " + h + " px" + (video ? " · " + dur.toFixed(1).replace(".", ",") + " s" : " · imagem") + " · " + (bytes / 1048576).toFixed(1).replace(".", ",") + " MB";
    if (Math.abs(r - 0.5) <= 0.03) L.push(["Proporção vertical 1:2: ideal para o painel.", "ok"]);
    else if (r > 0.5) L.push(["Arquivo mais largo que o painel (" + w + " × " + h + "). No modo Preencher as laterais são cortadas; no modo Ajustar aparecem faixas em cima e embaixo. O ideal é 1080 × 2160 px.", "warn"]);
    else L.push(["Arquivo mais estreito que o painel. No modo Ajustar aparecem faixas nas laterais. O ideal é 1080 × 2160 px.", "warn"]);
    if (h < 1000 && w < 600) L.push(["Resolução baixa: textos pequenos podem perder nitidez.", "warn"]);
    if (video) {
      if (dur > MAX_S + 0.3) L.push(["O vídeo tem " + dur.toFixed(1).replace(".", ",") + " s. No painel entram só os primeiros 15 segundos (a simulação já mostra assim).", "warn"]);
      else L.push(["Duração dentro do limite de 15 segundos.", "ok"]);
      L.push(["O painel não tem som: o áudio do vídeo não é usado.", "info"]);
    } else L.push(["Imagem estática: fica 15 segundos na tela a cada exibição.", "ok"]);
    L.push(["Dica: até 7 palavras, letras grandes e alto contraste. Visto da rua, o painel fica a vários metros de distância.", "info"]);
    avisos(L);
  }
  function abrir(file) {
    if (!file) return;
    var erro = $("sim-erro"); erro.hidden = true;
    var tipo = file.type || "";
    if (!/^video\/|^image\//.test(tipo)) { erro.textContent = "Envie um vídeo (MP4, MOV, WEBM) ou uma imagem (JPG, PNG)."; erro.hidden = false; return; }
    limpar(); url = URL.createObjectURL(file);
    if (tipo.indexOf("video/") === 0) {
      var v = document.createElement("video");
      v.muted = true; v.playsInline = true; v.autoplay = true; v.setAttribute("playsinline", ""); v.setAttribute("muted", "");
      v.addEventListener("loadedmetadata", function () { analisar(v.videoWidth, v.videoHeight, v.duration || 0, file.name, file.size, true); v.play().catch(function () {}); });
      v.addEventListener("timeupdate", function () {
        var t = v.currentTime, lim = Math.min(MAX_S, v.duration || MAX_S);
        if (t >= lim - 0.05) { v.currentTime = 0; v.play().catch(function () {}); }
        $("sim-barra").style.width = Math.min(100, (t / MAX_S) * 100) + "%"; $("sim-tempo").textContent = t.toFixed(1).replace(".", ",") + " s / 15 s";
      });
      v.addEventListener("ended", function () { v.currentTime = 0; v.play().catch(function () {}); });
      v.addEventListener("error", function () { erro.textContent = "Seu navegador não conseguiu abrir este vídeo. Tente em MP4 (H.264), o formato aceito pelo painel."; erro.hidden = false; limpar(); });
      v.src = url; midia = v;
    } else {
      var im = document.createElement("img"); im.alt = "Sua arte no painel";
      im.onload = function () { analisar(im.naturalWidth, im.naturalHeight, 0, file.name, file.size, false); $("sim-barra").style.width = "100%"; $("sim-tempo").textContent = "Imagem: 15 s na tela"; };
      im.onerror = function () { erro.textContent = "Não foi possível abrir esta imagem. Use JPG ou PNG."; erro.hidden = false; limpar(); };
      im.src = url; midia = im;
    }
    tela.appendChild(midia); tela.classList.add("on"); $("sim-ctrl").hidden = false; aplicarModo();
    $("sim-estado").textContent = "Simulando: " + file.name;
  }
  input.addEventListener("change", function () { abrir(input.files && input.files[0]); });
  var drop = $("sim-drop");
  ["dragenter", "dragover"].forEach(function (e) { drop.addEventListener(e, function (ev) { ev.preventDefault(); drop.classList.add("over"); }); });
  ["dragleave", "drop"].forEach(function (e) { drop.addEventListener(e, function (ev) { ev.preventDefault(); drop.classList.remove("over"); }); });
  drop.addEventListener("drop", function (ev) { var f = ev.dataTransfer && ev.dataTransfer.files[0]; if (f) abrir(f); });

  // ---------- Controles ----------
  Array.prototype.forEach.call(document.querySelectorAll("input[name=sim-modo]"), function (r) { r.addEventListener("change", function () { modo = r.value; aplicarModo(); }); });
  $("sim-leds").addEventListener("change", function (e) { leds = e.target.checked; aplicarModo(); });
  $("sim-play").addEventListener("click", function () { if (midia && midia.tagName === "VIDEO") { if (midia.paused) { midia.play(); this.textContent = "Pausar"; } else { midia.pause(); this.textContent = "Continuar"; } } });
  $("sim-limpar").addEventListener("click", function () { limpar(); tela.classList.remove("on"); $("sim-ctrl").hidden = true; $("sim-analise").hidden = true; input.value = ""; $("sim-estado").textContent = "Mostrando a foto real do painel"; });

  // ---------- Exemplo animado (marca fictícia, desenhado no navegador) ----------
  var raf = null;
  function pararExemplo() { if (raf) cancelAnimationFrame(raf); raf = null; }
  $("sim-exemplo").addEventListener("click", function () {
    limpar(); var c = document.createElement("canvas"); c.width = 540; c.height = 1080; var g = c.getContext("2d"); midia = c;
    tela.appendChild(c); tela.classList.add("on"); $("sim-ctrl").hidden = false; aplicarModo();
    var t0 = performance.now();
    function quadro(t) {
      var s = ((t - t0) / 1000) % MAX_S;
      g.fillStyle = "#C8102E"; g.fillRect(0, 0, 540, 1080);
      g.fillStyle = "#FFD23F"; g.fillRect(0, 0, 540, 640);
      g.fillStyle = "#C8102E"; g.textAlign = "center"; g.font = "bold 74px Poppins, Arial, sans-serif";
      g.fillText("OFERTAS", 270, 170); g.fillText("DE SEXTA", 270, 255);
      var esc = 1 + 0.06 * Math.sin(s * 3);
      g.save(); g.translate(270, 450); g.scale(esc, esc); g.fillStyle = "#fff"; g.beginPath(); g.arc(0, 0, 150, 0, Math.PI * 2); g.fill();
      g.fillStyle = "#C8102E"; g.font = "bold 50px Poppins, Arial, sans-serif"; g.fillText("ATÉ", 0, -30); g.font = "bold 110px Poppins, Arial, sans-serif"; g.fillText("30%", 0, 80); g.restore();
      g.fillStyle = "#fff"; g.font = "bold 54px Poppins, Arial, sans-serif"; g.fillText("MERCADO", 270, 790); g.fillText("EXEMPLO", 270, 860);
      g.font = "600 34px Inter, Arial, sans-serif"; g.fillText("Marca fictícia", 270, 1000);
      $("sim-barra").style.width = (s / MAX_S * 100) + "%"; $("sim-tempo").textContent = s.toFixed(1).replace(".", ",") + " s / 15 s";
      raf = requestAnimationFrame(quadro);
    }
    raf = requestAnimationFrame(quadro);
    avisos([["Exemplo com marca fictícia. Envie seu vídeo ou imagem para ver a sua campanha no painel.", "info"]]);
    $("sim-info").textContent = "Exemplo animado de 15 s";
    $("sim-estado").textContent = "Simulando: exemplo";
  });
})();
