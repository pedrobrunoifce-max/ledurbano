// LED URBANO — interações do site (sem bibliotecas, sem cookies)
(function () {
  var btn = document.querySelector(".menu-btn"), nav = document.getElementById("nav");
  if (btn && nav) btn.addEventListener("click", function () {
    var open = nav.classList.toggle("open"); btn.setAttribute("aria-expanded", open ? "true" : "false");
  });

  var form = document.getElementById("form-anunciante");
  if (!form) return;
  var started = Date.now();
  var msg = document.getElementById("form-msg");
  function show(ok, text) { msg.className = "msg " + (ok ? "ok" : "err"); msg.textContent = text; msg.focus(); }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    // Proteção anti-spam: campo isca preenchido ou envio rápido demais (robôs)
    if (form.website.value !== "" || Date.now() - started < 4000) { show(true, "Recebemos sua mensagem. Obrigado!"); return; }
    if (!form.checkValidity()) { form.reportValidity(); return; }
    var data = new FormData(form); data.delete("website");
    var endpoint = form.getAttribute("data-endpoint") || "";
    var wa = document.body.getAttribute("data-whatsapp") || "";
    var resumo = "Olá! Quero anunciar no painel da LED URBANO.%0A" +
      ["empresa", "responsavel", "telefone", "email", "segmento", "objetivo", "plano"].map(function (k) {
        return k.charAt(0).toUpperCase() + k.slice(1) + ": " + encodeURIComponent(data.get(k) || "-");
      }).join("%0A");

    if (endpoint && endpoint.indexOf("SEU_") === -1) {
      fetch(endpoint, { method: "POST", body: data, headers: { Accept: "application/json" } })
        .then(function (r) { if (!r.ok) throw new Error(); form.reset(); show(true, "Mensagem enviada! Responderemos em até 1 dia útil."); })
        .catch(function () { show(false, "Não foi possível enviar agora. Tente pelo WhatsApp."); });
    } else if (wa && wa.indexOf("SEU_") === -1) {
      window.open("https://wa.me/" + wa + "?text=" + resumo, "_blank", "noopener");
      show(true, "Abrimos o WhatsApp com seus dados. É só enviar a mensagem.");
    } else {
      show(false, "Formulário ainda não configurado (veja o README do site).");
    }
  });
})();
