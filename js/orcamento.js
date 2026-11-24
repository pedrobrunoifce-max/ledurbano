// LED URBANO — orçamento online: cálculo, proposta na tela, PDF e envio pelo WhatsApp. Nada é gravado em servidor.
(function () {
  "use strict";
  var f = document.getElementById("orc"); if (!f) return;
  var WHATS = document.body.getAttribute("data-whatsapp") || "";
  // Tabela vigente (atualizar aqui quando os preços mudarem)
  var PLANOS = {
    mensal: { nome: "Mensal", mes: 280, meses: 1, obs: "Sem fidelidade" },
    trimestral: { nome: "Trimestral", mes: 230, meses: 3, obs: "3 meses · 18% de desconto" },
    anual: { nome: "Anual", mes: 190, meses: 12, obs: "12 meses · 32% de desconto" },
    fundador: { nome: "Anunciante Fundador (anual)", mes: 190, meses: 12, obs: "Anual · 8 vagas até 31/01/2027 · 1ª arte grátis" },
    avulsa15: { nome: "Campanha de 15 dias", mes: 220, meses: 0.5, obs: "Pacote para eventos e datas" },
  };
  var TABELA_MES = 280, EXIB = 216, ARTE = 80, FUNDADOR_ATE = "2027-01-31";
  var $ = function (id) { return document.getElementById(id); };
  var brl = function (n) { return (Number(n) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }); };
  var iso = function (d) { return d.toISOString().slice(0, 10); };
  var dbr = function (s) { return s ? s.split("-").reverse().join("/") : ""; };
  function addDias(s, n) { var d = new Date(s + "T12:00:00"); d.setDate(d.getDate() + n); return iso(d); }
  function addMeses(s, n) { var d = new Date(s + "T12:00:00"), dia = d.getDate(); d.setMonth(d.getMonth() + n); if (d.getDate() !== dia) d.setDate(0); return iso(d); }
  var hoje = iso(new Date()); var ini = $("o-inicio"); ini.min = hoje; ini.value = addDias(hoje, 7);
  if (hoje > FUNDADOR_ATE) { var of = f.querySelector("option[value=fundador]"); if (of) of.remove(); }

  function calcular() {
    var pz = $("o-plano").value, P = PLANOS[pz] || PLANOS.mensal, cotas = Math.max(1, Math.min(3, Number($("o-cotas").value) || 1));
    var inicio = ini.value && ini.value >= hoje ? ini.value : addDias(hoje, 7);
    var fim = pz === "avulsa15" ? addDias(inicio, 14) : addDias(addMeses(inicio, P.meses), -1);
    var mensal = P.mes * cotas, periodo = pz === "avulsa15" ? mensal : mensal * P.meses;
    var arte = $("o-arte").value === "sim" ? (pz === "fundador" ? 0 : ARTE) : 0;
    var economia = pz === "avulsa15" || pz === "mensal" ? 0 : (TABELA_MES - P.mes) * cotas * P.meses;
    return { pz: pz, P: P, cotas: cotas, inicio: inicio, fim: fim, mensal: mensal, periodo: periodo, arte: arte, arteSim: $("o-arte").value === "sim", total: periodo + arte, economia: economia, exib: EXIB * cotas };
  }
  function linhas(o) {
    var L = [["Plano", o.P.nome], ["Cotas", o.cotas + " (vídeo de até 15 s)"], ["Exibições por dia", "cerca de " + o.exib + " (ciclo planejado)"], ["Período", dbr(o.inicio) + " a " + dbr(o.fim)]];
    if (o.pz === "avulsa15") L.push(["Pacote 15 dias", brl(o.periodo)]);
    else { L.push(["Valor mensal", brl(o.mensal)]); L.push(["Total do período", brl(o.periodo)]); }
    if (o.economia > 0) L.push(["Economia em relação ao Mensal", brl(o.economia)]);
    if (o.arteSim) L.push(["Criação de arte", o.arte ? "a partir de " + brl(o.arte) : "grátis (Fundador)"]);
    L.push(["Total estimado", brl(o.total), "total"]);
    return L;
  }
  function kv(dl, L) { dl.textContent = ""; L.forEach(function (l) { var dt = document.createElement("dt"), dd = document.createElement("dd"); dt.textContent = l[0]; dd.textContent = l[1]; if (l[2]) dd.className = l[2]; dl.appendChild(dt); dl.appendChild(dd); }); }
  function atualizar() { var o = calcular(); $("r-valor").textContent = brl(o.mensal) + (o.pz === "avulsa15" ? "" : "/mês"); $("r-plano").textContent = o.P.nome + " · " + o.P.obs; kv($("r-kv"), linhas(o)); }
  f.addEventListener("input", atualizar); f.addEventListener("change", atualizar); atualizar();

  var prop = null;
  function codigo() { var d = new Date(), p = function (n) { return String(n).padStart(2, "0"); }; return "LU-" + d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + "-" + Math.random().toString(36).slice(2, 6).toUpperCase(); }
  function resumo(p) {
    return "Proposta " + p.codigo + " — LED URBANO\nEmpresa: " + p.empresa + " (" + p.contato + ", " + p.tel + ")\n" + linhas(p.o).map(function (l) { return l[0] + ": " + l[1]; }).join("\n") + "\nPainel: Av. Pref. Raimundo Benício, 5h às 23h\nVálida até " + dbr(p.validade);
  }
  f.addEventListener("submit", function (ev) {
    ev.preventDefault(); var err = $("o-erro"); err.hidden = true;
    if ($("o-site").value) return;
    var emp = $("o-empresa").value.trim(), con = $("o-contato").value.trim(), tel = $("o-tel").value.trim(), falta = [];
    if (!emp) falta.push("empresa"); if (!con) falta.push("seu nome"); if (tel.replace(/\D/g, "").length < 10) falta.push("WhatsApp com DDD"); if (!$("o-lgpd").checked) falta.push("concordância com o uso dos dados");
    if (falta.length) { err.textContent = "Para gerar a proposta, preencha: " + falta.join(", ") + "."; err.hidden = false; return; }
    prop = { codigo: codigo(), emitida: hoje, validade: addDias(hoje, 15), empresa: emp, contato: con, tel: tel, email: $("o-email").value.trim(), seg: $("o-seg").value, o: calcular() };
    $("p-cod").textContent = prop.codigo; $("p-data").textContent = "Emitida em " + dbr(hoje) + " · válida até " + dbr(prop.validade); $("p-cli").textContent = emp;
    kv($("p-kv"), linhas(prop.o));
    $("p-wa").href = "https://wa.me/" + WHATS + "?text=" + encodeURIComponent("Olá! Gerei a proposta " + prop.codigo + " no site e quero seguir com a contratação.\n\n" + resumo(prop));
    $("p-fechar").href = "https://wa.me/" + WHATS + "?text=" + encodeURIComponent("Olá! Quero FECHAR CONTRATO da proposta " + prop.codigo + " gerada no site.\n\n" + resumo(prop));
    var box = $("prop"); box.hidden = false; box.scrollIntoView({ behavior: "smooth", block: "start" });
  });
  function msg(t, ok) { var m = $("p-msg"); m.textContent = t; m.className = "msg " + (ok ? "ok" : "err"); m.style.display = "block"; }

  // Fechar contrato: abre o WhatsApp com a proposta e envia uma cópia por e-mail (FormSubmit)
  var EMAIL = "ledurbanoce@gmail.com";
  $("p-fechar").addEventListener("click", function (ev) {
    if (!prop) { ev.preventDefault(); return; } // o próprio link abre o WhatsApp
    if (prop.emailEnviado) return msg("WhatsApp aberto. A cópia por e-mail já tinha sido enviada.", true);
    var o = prop.o, dados = {
      _subject: "Fechar contrato — proposta " + prop.codigo + " — " + prop.empresa,
      _template: "table", _captcha: "false",
      Proposta: prop.codigo, Empresa: prop.empresa, Responsavel: prop.contato, WhatsApp: prop.tel, Email: prop.email || "-", Segmento: prop.seg || "-",
      Plano: o.P.nome, Cotas: o.cotas, Periodo: dbr(o.inicio) + " a " + dbr(o.fim), Valor_mensal: brl(o.mensal), Total_estimado: brl(o.total),
      Validade: dbr(prop.validade), Resumo: resumo(prop)
    };
    if (prop.email) dados._replyto = prop.email;
    msg("Abrindo o WhatsApp e enviando a proposta por e-mail…", true);
    fetch("https://formsubmit.co/ajax/" + EMAIL, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(dados), keepalive: true })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { if (!r.ok || String(j.success) === "false") throw j; }); })
      .then(function () { prop.emailEnviado = true; msg("Pronto! A proposta foi enviada por e-mail para a LED URBANO. Conclua a conversa no WhatsApp.", true); })
      .catch(function (e) { if (window.console) console.warn("FormSubmit:", e); msg("WhatsApp aberto. A cópia por e-mail não foi enviada agora — a proposta segue pelo WhatsApp normalmente.", false); });
  });
  $("p-copiar").addEventListener("click", function () {
    if (!prop) return; var t = resumo(prop);
    var fb = function () { var ta = document.createElement("textarea"); ta.value = t; document.body.appendChild(ta); ta.select(); try { document.execCommand("copy"); msg("Resumo copiado.", true); } catch (e) { msg("Selecione e copie o resumo.", false); } ta.remove(); };
    if (navigator.clipboard) navigator.clipboard.writeText(t).then(function () { msg("Resumo copiado.", true); }, fb); else fb();
  });
  $("p-pdf").addEventListener("click", function () {
    if (!prop || !window.jspdf) return msg("Não foi possível gerar o PDF. Use Copiar resumo.", false);
    var J = window.jspdf.jsPDF, doc = new J(), W = 595.28, M = 48, y, o = prop.o;
    doc.setFillColor(15, 20, 25); doc.rect(0, 0, W, 92, "F");
    doc.setFont("helvetica", "bold"); doc.setFontSize(24); doc.setTextColor(255, 90, 31); doc.text("LED", M, 52); doc.setTextColor(255, 255, 255); doc.text("URBANO", M + 58, 52);
    doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(174, 182, 191); doc.text("MÍDIA DIGITAL URBANA", M, 68);
    doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(255, 90, 31); doc.text("PROPOSTA COMERCIAL", W - M, 34, { align: "right" });
    doc.setFontSize(16); doc.setTextColor(255, 255, 255); doc.text(prop.codigo, W - M, 54, { align: "right" });
    doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(174, 182, 191); doc.text("Emitida em " + dbr(prop.emitida) + " · válida até " + dbr(prop.validade), W - M, 72, { align: "right" });
    y = 122;
    function sec(t) { doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(199, 64, 13); doc.text(t.toUpperCase(), M, y); y += 8; doc.setDrawColor(226, 220, 210); doc.line(M, y, W - M, y); y += 16; }
    function row(k, v, b) { doc.setFont("helvetica", "normal"); doc.setFontSize(9.5); doc.setTextColor(110, 119, 130); doc.text(k, M, y); doc.setFont("helvetica", b ? "bold" : "normal"); doc.setFontSize(10.5); doc.setTextColor(28, 33, 40); var ls = doc.splitTextToSize(String(v), W - 2 * M - 190); doc.text(ls, M + 190, y); y += 15 * ls.length + 4; }
    sec("Cliente"); row("Empresa", prop.empresa); row("Responsável", prop.contato); row("Contato", [prop.tel, prop.email].filter(Boolean).join(" · ")); if (prop.seg) row("Segmento", prop.seg);
    y += 6; sec("Campanha");
    row("Painel", "LED outdoor P5, 1 m × 2 m vertical · Av. Pref. Raimundo Benício"); row("Horário", "Todos os dias, das 5h às 23h · ciclo de 20 posições (5 min)");
    linhas(o).forEach(function (l) { row(l[0], l[1], l[2] === "total"); });
    y += 6; sec("Condições");
    ["Pagamento por Pix ou boleto, com vencimento mensal. A 1ª parcela é paga antes do início.", "Vídeo ou imagem vertical 1080 × 2160 px, até 15 s, sem áudio. 1 troca de arte por mês incluída; troca extra R$ 30.", "A veiculação começa até 2 dias úteis após a arte aprovada e o pagamento.", "Relatório mensal de veiculação. Exibições perdidas por falha técnica são compensadas.", "A LED URBANO não garante número de pessoas impactadas ou vendas: o serviço é a exibição das inserções. O contrato de veiculação prevalece sobre esta proposta."].forEach(function (t) {
      doc.setFont("helvetica", "normal"); doc.setFontSize(9.5); doc.setTextColor(58, 64, 72); var ls = doc.splitTextToSize("• " + t, W - 2 * M); doc.text(ls, M, y); y += 13 * ls.length + 3;
    });
    doc.setFillColor(15, 20, 25); doc.rect(0, 795.89, W, 46, "F"); doc.setFontSize(8); doc.setTextColor(174, 182, 191);
    doc.text("LED URBANO · CNPJ 69.570.740/0001-60", M, 814); doc.text("WhatsApp (77) 99106-3089 · (85) 98604-2993 · ledurbanoce@gmail.com", M, 826);
    var blob = doc.output("blob"), a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = prop.codigo + "_LED-URBANO.pdf"; document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 2000); msg("PDF baixado.", true);
  });
})();
