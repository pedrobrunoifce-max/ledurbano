/* LED URBANO — gerador de PDF mínimo no navegador (sem bibliotecas externas).
   Implementa só o necessário para a proposta, com a mesma interface usada do jsPDF:
   setFillColor, setDrawColor, setTextColor, setFont, setFontSize, rect, line, text, splitTextToSize, addImage (JPEG), output("blob"). */
(function () {
  "use strict";
  if (window.jspdf && window.jspdf.jsPDF) return;
  // Larguras Helvetica / Helvetica-Bold (1/1000 em), ASCII 32–126
  var WR = [278,278,355,556,556,889,667,191,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,278,278,584,584,584,556,1015,667,667,722,722,667,611,778,722,278,500,667,556,833,722,778,667,778,722,667,611,722,667,944,667,667,611,278,278,278,469,556,333,556,556,500,556,556,278,556,556,222,222,500,222,833,556,556,556,556,333,500,278,556,500,722,500,500,500,334,260,334,584];
  var WB = [278,333,474,556,556,889,722,238,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,333,333,584,584,584,611,975,722,722,722,722,667,611,778,722,278,556,722,611,833,722,778,667,778,722,667,611,722,667,944,667,667,611,333,278,333,584,556,333,556,611,556,611,556,333,611,611,278,278,556,278,889,611,611,611,611,389,556,333,611,556,778,556,556,500,389,280,389,584];
  var CP = { "–": 0x96, "—": 0x97, "•": 0x95, "‘": 0x91, "’": 0x92, "“": 0x93, "”": 0x94, "…": 0x85, "−": 0x2d, "≈": 0x7e, "€": 0x80 };
  function bytesTexto(s) { var o = []; for (var i = 0; i < s.length; i++) { var ch = s[i], c = ch.charCodeAt(0); o.push(CP[ch] !== undefined ? CP[ch] : c < 256 ? c : 0x3f); } return o; }
  function base(ch) { var b = ch.normalize ? ch.normalize("NFD").replace(/[̀-ͯ]/g, "") : ch; return (b || ch).charCodeAt(0); }
  function larg(s, size, bold) { var t = bold ? WB : WR, w = 0; for (var i = 0; i < s.length; i++) { var c = base(s[i]); w += c >= 32 && c <= 126 ? t[c - 32] : 556; } return w * size / 1000; }
  function cor(r, g, b) { return [r, g, b].map(function (v) { return (v / 255).toFixed(3); }).join(" "); }
  function esc(bs) { var s = ""; bs.forEach(function (b) { var c = String.fromCharCode(b); s += (c === "(" || c === ")" || c === "\\") ? "\\" + c : c; }); return s; }
  function jpegInfo(u8) { var i = 2; while (i < u8.length) { if (u8[i] !== 0xff) { i++; continue; } var m = u8[i + 1], len = (u8[i + 2] << 8) | u8[i + 3]; if (m >= 0xc0 && m <= 0xc3) return { h: (u8[i + 5] << 8) | u8[i + 6], w: (u8[i + 7] << 8) | u8[i + 8], c: u8[i + 9] }; i += 2 + len; } throw new Error("JPEG inválido"); }
  function dataUriBytes(uri) { var b64 = uri.split(",")[1], bin = atob(b64), u = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u; }

  function MiniPDF() { this.W = 595.28; this.H = 841.89; this.ops = []; this.imgs = []; this.fill = "0 0 0"; this.stroke = "0 0 0"; this.tcol = "0 0 0"; this.bold = false; this.size = 10; }
  var P = MiniPDF.prototype;
  P.setFillColor = function (r, g, b) { this.fill = cor(r, g, b); };
  P.setDrawColor = function (r, g, b) { this.stroke = cor(r, g, b); };
  P.setTextColor = function (r, g, b) { this.tcol = cor(r, g, b); };
  P.setFont = function (_n, style) { this.bold = style === "bold"; };
  P.setFontSize = function (s) { this.size = s; };
  P.rect = function (x, y, w, h) { this.ops.push(this.fill + " rg " + x.toFixed(2) + " " + (this.H - y - h).toFixed(2) + " " + w.toFixed(2) + " " + h.toFixed(2) + " re f"); };
  P.line = function (x1, y1, x2, y2) { this.ops.push(this.stroke + " RG 0.75 w " + x1 + " " + (this.H - y1) + " m " + x2 + " " + (this.H - y2) + " l S"); };
  P.text = function (t, x, y, opt) {
    var self = this, linhas = Array.isArray(t) ? t : [String(t)], lh = this.size * 1.3;
    linhas.forEach(function (l, i) {
      var xx = x, w = larg(l, self.size, self.bold);
      if (opt && opt.align === "right") xx = x - w; else if (opt && opt.align === "center") xx = x - w / 2;
      self.ops.push("BT /" + (self.bold ? "F2" : "F1") + " " + self.size + " Tf " + self.tcol + " rg " + xx.toFixed(2) + " " + (self.H - y - i * lh).toFixed(2) + " Td (" + esc(bytesTexto(l)) + ") Tj ET");
    });
  };
  P.splitTextToSize = function (t, maxW) {
    var self = this, out = [];
    String(t).split("\n").forEach(function (par) {
      var l = ""; par.split(/\s+/).forEach(function (w) { var c = l ? l + " " + w : w; if (larg(c, self.size, self.bold) > maxW && l) { out.push(l); l = w; } else l = c; }); out.push(l);
    });
    return out;
  };
  P.addImage = function (uri, _fmt, x, y, w, h) { var u8 = dataUriBytes(uri), inf = jpegInfo(u8); var n = this.imgs.push({ u8: u8, w: inf.w, h: inf.h, c: inf.c }); this.ops.push("q " + w + " 0 0 " + h + " " + x + " " + (this.H - y - h) + " cm /Im" + n + " Do Q"); };
  P.output = function () {
    var partes = [], offs = [], pos = 0, objs = [];
    function enc(s) { var u = new Uint8Array(s.length); for (var i = 0; i < s.length; i++) u[i] = s.charCodeAt(i) & 255; return u; }
    function add(chunks) { objs.push(chunks); return objs.length; }
    add(null); add(null);
    var f1 = add([enc("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>")]);
    var f2 = add([enc("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>")]);
    var xo = this.imgs.map(function (im, i) {
      var id = add([enc("<< /Type /XObject /Subtype /Image /Width " + im.w + " /Height " + im.h + " /ColorSpace /" + (im.c === 1 ? "DeviceGray" : "DeviceRGB") + " /BitsPerComponent 8 /Filter /DCTDecode /Length " + im.u8.length + " >>\nstream\n"), im.u8, enc("\nendstream")]);
      return "/Im" + (i + 1) + " " + id + " 0 R";
    }).join(" ");
    var conteudo = enc(this.ops.join("\n"));
    var cid = add([enc("<< /Length " + conteudo.length + " >>\nstream\n"), conteudo, enc("\nendstream")]);
    var pid = add([enc("<< /Type /Page /Parent 2 0 R /MediaBox [0 0 " + this.W + " " + this.H + "] /Resources << /Font << /F1 " + f1 + " 0 R /F2 " + f2 + " 0 R >> /XObject << " + xo + " >> >> /Contents " + cid + " 0 R >>")]);
    objs[0] = [enc("<< /Type /Catalog /Pages 2 0 R >>")];
    objs[1] = [enc("<< /Type /Pages /Kids [" + pid + " 0 R] /Count 1 >>")];
    var head = enc("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n"); partes.push(head); pos = head.length;
    objs.forEach(function (ch, i) { offs.push(pos); var a = enc((i + 1) + " 0 obj\n"); partes.push(a); pos += a.length; ch.forEach(function (c) { partes.push(c); pos += c.length; }); var z = enc("\nendobj\n"); partes.push(z); pos += z.length; });
    var x = "xref\n0 " + (objs.length + 1) + "\n0000000000 65535 f \n" + offs.map(function (o) { return ("0000000000" + o).slice(-10) + " 00000 n \n"; }).join("") + "trailer\n<< /Size " + (objs.length + 1) + " /Root 1 0 R >>\nstartxref\n" + pos + "\n%%EOF\n";
    partes.push(enc(x));
    return new Blob(partes, { type: "application/pdf" });
  };
  window.jspdf = { jsPDF: MiniPDF };
})();
