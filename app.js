/* BTX Docs Saúde — Agenda + Documentos (Offline-first)
   - Login simples: btx007
   - LocalStorage como base (leve, estável)
   - PDFs por janela de impressão (funciona sem biblioteca)
   - Backup/restore JSON
*/

(function(){
  "use strict";

  // ====== CONSTANTES / CHAVES ======
  const REQUIRED_KEY = "btx007";
  const LS = {
    authed: "btx_authed_v1",
    prof: "btx_prof_v1",
    appts: "btx_appts_v1",
    ficha: "btx_ficha_v1",
    rx: "btx_rx_v1",
    atestado: "btx_atestado_v1",
    orc: "btx_orc_v1"
  };

  // ====== HELPERS ======
  const $ = (id)=>document.getElementById(id);
  const now = ()=>new Date();
  const pad2 = (n)=>String(n).padStart(2,"0");
  const toISODate = (d)=>`${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
  const toISOTime = (d)=>`${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  const fmtDateBR = (iso)=>{
    if(!iso) return "";
    const [y,m,dd]=iso.split("-");
    return `${dd}/${m}/${y}`;
  };
  const safeJSON = (s, fallback)=>{ try{ return JSON.parse(s); }catch{ return fallback; } };
  const save = (k,v)=>localStorage.setItem(k, JSON.stringify(v));
  const load = (k, fallback)=>{
    const raw = localStorage.getItem(k);
    if(!raw) return fallback;
    return safeJSON(raw, fallback);
  };
  const setMsg = (el, text, type)=>{
    el.classList.remove("bad","good");
    if(type) el.classList.add(type);
    el.textContent = text || "";
  };

  // ====== ELEMENTOS ======
  const loginView = $("loginView");
  const appView = $("appView");
  const loginKey = $("loginKey");
  const btnLogin = $("btnLogin");
  const btnHelpLogin = $("btnHelpLogin");
  const loginMsg = $("loginMsg");

  const netPill = $("netPill");
  const btnLogout = $("btnLogout");

  const navButtons = Array.from(document.querySelectorAll(".navBtn"));
  const tabs = {
    agenda: $("tab-agenda"),
    ficha: $("tab-ficha"),
    receita: $("tab-receita"),
    atestado: $("tab-atestado"),
    orcamento: $("tab-orcamento"),
    config: $("tab-config"),
  };

  const modal = $("modal");
  const modalTitle = $("modalTitle");
  const modalBody = $("modalBody");
  const modalOk = $("modalOk");

  // Agenda fields
  const apptDate = $("apptDate");
  const apptTime = $("apptTime");
  const apptPatient = $("apptPatient");
  const apptPhone = $("apptPhone");
  const apptType = $("apptType");
  const apptStatus = $("apptStatus");
  const apptNotes = $("apptNotes");
  const btnAddAppt = $("btnAddAppt");
  const btnClearAppt = $("btnClearAppt");
  const apptTbody = $("apptTbody");
  const apptEmpty = $("apptEmpty");
  const agendaRangePill = $("agendaRangePill");
  const searchAppt = $("searchAppt");

  const btnToday = $("btnToday");
  const btnWeek = $("btnWeek");
  const btnDayPdf = $("btnDayPdf");
  const btnWeekPdf = $("btnWeekPdf");
  const btnMonthPdf = $("btnMonthPdf");

  // Config / Prof
  const profNome = $("profNome");
  const profReg = $("profReg");
  const profFone = $("profFone");
  const profEmail = $("profEmail");
  const profEndereco = $("profEndereco");
  const profObs = $("profObs");
  const btnSaveProf = $("btnSaveProf");
  const btnResetAll = $("btnResetAll");
  const cfgMsg = $("cfgMsg");

  const footLine = $("footLine");
  const clock = $("clock");

  // Docs: Ficha
  const fichaPaciente = $("fichaPaciente");
  const fichaData = $("fichaData");
  const fichaIdade = $("fichaIdade");
  const fichaTelefone = $("fichaTelefone");
  const fichaQueixa = $("fichaQueixa");
  const fichaHDA = $("fichaHDA");
  const fichaAntecedentes = $("fichaAntecedentes");
  const fichaExame = $("fichaExame");
  const fichaDx = $("fichaDx");
  const fichaPlano = $("fichaPlano");
  const btnFichaPdf = $("btnFichaPdf");
  const btnFichaClear = $("btnFichaClear");

  // Docs: Receita
  const rxPaciente = $("rxPaciente");
  const rxData = $("rxData");
  const rxTexto = $("rxTexto");
  const btnReceitaPdf = $("btnReceitaPdf");
  const btnReceitaClear = $("btnReceitaClear");

  // Docs: Atestado
  const atPaciente = $("atPaciente");
  const atData = $("atData");
  const atDias = $("atDias");
  const atCID = $("atCID");
  const atTexto = $("atTexto");
  const btnAtestadoPdf = $("btnAtestadoPdf");
  const btnAtestadoClear = $("btnAtestadoClear");

  // Docs: Orçamento
  const orcPaciente = $("orcPaciente");
  const orcData = $("orcData");
  const orcTexto = $("orcTexto");
  const btnOrcPdf = $("btnOrcPdf");
  const btnOrcClear = $("btnOrcClear");

  // Extras
  const btnBackup = $("btnBackup");
  const btnRestore = $("btnRestore");
  const btnInstallHint = $("btnInstallHint");
  const btnTestPdf = $("btnTestPdf");

  // Sidebar toggle (mobile)
  const btnToggleSidebar = $("btnToggleSidebar");
  const sidebar = $("sidebar");

  // ====== ESTADO ======
  let state = {
    viewMode: "day", // day|week
    rangeStart: null,
    rangeEnd: null,
    search: ""
  };

  // ====== MODAL ======
  function showModal(title, body){
    modalTitle.textContent = title || "Aviso";
    modalBody.textContent = body || "";
    modal.classList.remove("hidden");
  }
  function hideModal(){ modal.classList.add("hidden"); }

  modalOk.addEventListener("click", hideModal);

  // ====== NETWORK PILL ======
  function refreshNet(){
    const online = navigator.onLine;
    netPill.textContent = online ? "Online" : "Offline";
    netPill.style.borderColor = online ? "rgba(25,226,140,.45)" : "rgba(255,77,77,.5)";
    netPill.style.color = online ? "var(--muted)" : "#ffd6d6";
  }
  window.addEventListener("online", refreshNet);
  window.addEventListener("offline", refreshNet);

  // ====== CLOCK ======
  function tick(){
    const d = now();
    clock.textContent = `${pad2(d.getHours())}:${pad2(d.getMinutes())} • ${fmtDateBR(toISODate(d))}`;
  }

  // ====== AUTH ======
  function isAuthed(){
    return localStorage.getItem(LS.authed) === "1";
  }
  function setAuthed(v){
    localStorage.setItem(LS.authed, v ? "1" : "0");
  }
  function goApp(){
    loginView.classList.add("hidden");
    appView.classList.remove("hidden");
    refreshNet();
    tick();
    hydrateAll();
    renderAgenda();
  }
  function goLogin(){
    appView.classList.add("hidden");
    loginView.classList.remove("hidden");
    loginKey.value = "";
    setMsg(loginMsg, "", "");
  }

  btnLogin.addEventListener("click", ()=>{
    const key = (loginKey.value || "").trim().toLowerCase();
    if(key === REQUIRED_KEY){
      setAuthed(true);
      setMsg(loginMsg, "Acesso liberado.", "good");
      goApp();
    }else{
      setAuthed(false);
      setMsg(loginMsg, "Chave inválida. Use: btx007", "bad");
    }
  });

  btnHelpLogin.addEventListener("click", ()=>{
    showModal("Login", "Digite a chave: btx007 (tudo minúsculo, sem traço). Se você quiser trocar depois, a gente ajusta no código.");
  });

  btnLogout.addEventListener("click", ()=>{
    setAuthed(false);
    goLogin();
  });

  // ====== NAV / TABS ======
  function setTab(name){
    navButtons.forEach(b=>b.classList.toggle("active", b.dataset.tab===name));
    Object.keys(tabs).forEach(k=>tabs[k].classList.toggle("active", k===name));
  }
  navButtons.forEach(btn=>{
    btn.addEventListener("click", ()=>{
      setTab(btn.dataset.tab);
      if(window.innerWidth < 900){
        // no mobile, dá uma “recolhida” visual
        sidebar.scrollIntoView({behavior:"smooth", block:"start"});
      }
    });
  });

  btnToggleSidebar.addEventListener("click", ()=>{
    // Alterna uma sensação de “colapso” simples
    sidebar.classList.toggle("collapsed");
    if(sidebar.classList.contains("collapsed")){
      sidebar.style.maxHeight = "72px";
      sidebar.style.overflow = "hidden";
    }else{
      sidebar.style.maxHeight = "";
      sidebar.style.overflow = "";
    }
  });

  // ====== DATA DEFAULTS ======
  function setDefaults(){
    const d = now();
    apptDate.value = toISODate(d);
    apptTime.value = toISOTime(d);
    fichaData.value = toISODate(d);
    rxData.value = toISODate(d);
    atData.value = toISODate(d);
    orcData.value = toISODate(d);
  }

  // ====== PROF ======
  function getProf(){
    return load(LS.prof, {
      nome: "",
      reg: "",
      fone: "",
      email: "",
      endereco: "",
      obs: ""
    });
  }
  function setProf(p){
    save(LS.prof, p);
    refreshFooter();
  }
  function refreshFooter(){
    const p = getProf();
    const addr = p.endereco ? `• ${p.endereco}` : "";
    footLine.textContent = `Documentos Clínicos${addr}`;
  }
  function hydrateProf(){
    const p = getProf();
    profNome.value = p.nome || "";
    profReg.value = p.reg || "";
    profFone.value = p.fone || "";
    profEmail.value = p.email || "";
    profEndereco.value = p.endereco || "";
    profObs.value = p.obs || "";
    refreshFooter();
  }
  btnSaveProf.addEventListener("click", ()=>{
    const p = {
      nome: (profNome.value||"").trim(),
      reg: (profReg.value||"").trim(),
      fone: (profFone.value||"").trim(),
      email: (profEmail.value||"").trim(),
      endereco: (profEndereco.value||"").trim(),
      obs: (profObs.value||"").trim(),
    };
    setProf(p);
    setMsg(cfgMsg, "Configurações salvas.", "good");
    setTimeout(()=>setMsg(cfgMsg,"",""), 1400);
  });

  // ====== RESET ======
  btnResetAll.addEventListener("click", ()=>{
    if(!confirm("Isso apaga agenda e documentos deste aparelho. Continuar?")) return;
    Object.values(LS).forEach(k=>localStorage.removeItem(k));
    setAuthed(true); // mantém dentro pra não irritar
    hydrateAll();
    renderAgenda();
    showModal("Zerado", "Tudo foi apagado neste aparelho.");
  });

  // ====== AGENDA (CRUD) ======
  function getAppts(){
    return load(LS.appts, []);
  }
  function setAppts(list){
    save(LS.appts, list);
  }
  function clearApptForm(){
    apptPatient.value = "";
    apptPhone.value = "";
    apptType.value = "";
    apptStatus.value = "confirmado";
    apptNotes.value = "";
    apptTime.value = toISOTime(now());
  }
  btnClearAppt.addEventListener("click", clearApptForm);

  function normalizeAppt(a){
    return {
      id: a.id || cryptoRandom(),
      date: a.date || toISODate(now()),
      time: a.time || "08:00",
      patient: (a.patient||"").trim(),
      phone: (a.phone||"").trim(),
      type: (a.type||"").trim(),
      status: a.status || "confirmado",
      notes: (a.notes||"").trim(),
      createdAt: a.createdAt || Date.now()
    };
  }

  function cryptoRandom(){
    // id simples e confiável
    return "A" + Math.random().toString(16).slice(2) + Date.now().toString(16);
  }

  btnAddAppt.addEventListener("click", ()=>{
    const a = normalizeAppt({
      date: apptDate.value,
      time: apptTime.value,
      patient: apptPatient.value,
      phone: apptPhone.value,
      type: apptType.value,
      status: apptStatus.value,
      notes: apptNotes.value
    });

    if(!a.patient){
      showModal("Faltou paciente", "Coloca pelo menos o nome do paciente pra salvar o agendamento.");
      return;
    }

    const list = getAppts();
    list.push(a);
    setAppts(list);
    clearApptForm();
    renderAgenda();
  });

  function deleteAppt(id){
    const list = getAppts().filter(x=>x.id!==id);
    setAppts(list);
    renderAgenda();
  }

  function updateAppt(id, patch){
    const list = getAppts();
    const idx = list.findIndex(x=>x.id===id);
    if(idx<0) return;
    list[idx] = normalizeAppt({...list[idx], ...patch});
    setAppts(list);
    renderAgenda();
  }

  function getRangeForMode(){
    const base = apptDate.value ? new Date(apptDate.value+"T00:00:00") : new Date();
    if(state.viewMode === "week"){
      const day = base.getDay(); // 0 dom
      const diffToMon = (day===0 ? -6 : 1-day);
      const mon = new Date(base);
      mon.setDate(base.getDate()+diffToMon);
      const sun = new Date(mon);
      sun.setDate(mon.getDate()+6);
      return { start: toISODate(mon), end: toISODate(sun) };
    }
    const iso = toISODate(base);
    return { start: iso, end: iso };
  }

  function setAgendaMode(mode){
    state.viewMode = mode;
    const {start,end} = getRangeForMode();
    state.rangeStart = start;
    state.rangeEnd = end;
    agendaRangePill.textContent = mode==="week"
      ? `Semana: ${fmtDateBR(start)} — ${fmtDateBR(end)}`
      : `Dia: ${fmtDateBR(start)}`;
  }

  btnToday.addEventListener("click", ()=>{
    state.viewMode = "day";
    apptDate.value = toISODate(now());
    setAgendaMode("day");
    renderAgenda();
  });
  btnWeek.addEventListener("click", ()=>{
    state.viewMode = "week";
    setAgendaMode("week");
    renderAgenda();
  });

  apptDate.addEventListener("change", ()=>{
    setAgendaMode(state.viewMode);
    renderAgenda();
  });

  searchAppt.addEventListener("input", ()=>{
    state.search = (searchAppt.value||"").trim().toLowerCase();
    renderAgenda();
  });

  function filterAppts(list){
    const { start, end } = getRangeForMode();
    const s = state.search;

    return list
      .filter(a=>a.date>=start && a.date<=end)
      .filter(a=>{
        if(!s) return true;
        const blob = `${a.patient} ${a.type} ${a.status} ${a.notes} ${a.phone}`.toLowerCase();
        return blob.includes(s);
      })
      .sort((a,b)=>{
        if(a.date!==b.date) return a.date.localeCompare(b.date);
        return (a.time||"").localeCompare(b.time||"");
      });
  }

  function waLink(phone, msg){
    const clean = (phone||"").replace(/\D/g,"");
    if(!clean) return "";
    const text = encodeURIComponent(msg||"Olá! Confirmando seu horário.");
    return `https://wa.me/${clean}?text=${text}`;
  }

  function renderAgenda(){
    setAgendaMode(state.viewMode);
    const list = filterAppts(getAppts());
    apptTbody.innerHTML = "";

    if(list.length===0){
      apptEmpty.classList.remove("hidden");
    }else{
      apptEmpty.classList.add("hidden");
    }

    for(const a of list){
      const tr = document.createElement("tr");

      const tdDate = document.createElement("td"); tdDate.textContent = fmtDateBR(a.date);
      const tdTime = document.createElement("td"); tdTime.textContent = a.time || "";
      const tdPat = document.createElement("td"); tdPat.textContent = a.patient;
      const tdType = document.createElement("td"); tdType.textContent = a.type || "";
      const tdStatus = document.createElement("td");

      const sel = document.createElement("select");
      ["confirmado","pendente","faltou","remarcado","cancelado"].forEach(v=>{
        const o = document.createElement("option");
        o.value=v; o.textContent=v;
        if(v===a.status) o.selected=true;
        sel.appendChild(o);
      });
      sel.addEventListener("change", ()=>updateAppt(a.id, {status: sel.value}));
      tdStatus.appendChild(sel);

      const tdPhone = document.createElement("td");
      if(a.phone){
        const link = document.createElement("a");
        link.href = waLink(a.phone, `Olá ${a.patient}! Confirmando seu horário em ${fmtDateBR(a.date)} às ${a.time}.`);
        link.target = "_blank";
        link.rel = "noopener";
        link.textContent = "WhatsApp";
        tdPhone.appendChild(link);
      }else{
        tdPhone.textContent = "-";
      }

      const tdAct = document.createElement("td");
      const btnDel = document.createElement("button");
      btnDel.className = "btn tiny";
      btnDel.textContent = "Excluir";
      btnDel.addEventListener("click", ()=>{
        if(confirm("Excluir este agendamento?")) deleteAppt(a.id);
      });

      const btnEdit = document.createElement("button");
      btnEdit.className = "btn tiny ghost";
      btnEdit.textContent = "Carregar";
      btnEdit.addEventListener("click", ()=>{
        apptDate.value = a.date;
        apptTime.value = a.time;
        apptPatient.value = a.patient;
        apptPhone.value = a.phone || "";
        apptType.value = a.type || "";
        apptStatus.value = a.status || "confirmado";
        apptNotes.value = a.notes || "";
        showModal("Carregado", "Campos carregados. Se quiser, ajuste e salve como novo agendamento.");
      });

      tdAct.appendChild(btnEdit);
      tdAct.appendChild(btnDel);

      tr.appendChild(tdDate);
      tr.appendChild(tdTime);
      tr.appendChild(tdPat);
      tr.appendChild(tdType);
      tr.appendChild(tdStatus);
      tr.appendChild(tdPhone);
      tr.appendChild(tdAct);

      apptTbody.appendChild(tr);
    }
  }

  // ====== DOCS — AUTO SAVE ======
  function bindAutoSave(){
    // ficha
    const fichaInputs = [fichaPaciente,fichaData,fichaIdade,fichaTelefone,fichaQueixa,fichaHDA,fichaAntecedentes,fichaExame,fichaDx,fichaPlano];
    fichaInputs.forEach(el=>{
      el.addEventListener("input", ()=>save(LS.ficha, getFichaData()));
      el.addEventListener("change", ()=>save(LS.ficha, getFichaData()));
    });

    // rx
    [rxPaciente,rxData,rxTexto].forEach(el=>{
      el.addEventListener("input", ()=>save(LS.rx, getRxData()));
      el.addEventListener("change", ()=>save(LS.rx, getRxData()));
    });

    // atestado
    [atPaciente,atData,atDias,atCID,atTexto].forEach(el=>{
      el.addEventListener("input", ()=>save(LS.atestado, getAtestadoData()));
      el.addEventListener("change", ()=>save(LS.atestado, getAtestadoData()));
    });

    // orc
    [orcPaciente,orcData,orcTexto].forEach(el=>{
      el.addEventListener("input", ()=>save(LS.orc, getOrcData()));
      el.addEventListener("change", ()=>save(LS.orc, getOrcData()));
    });
  }

  // ====== DOCS — GET/SET ======
  function getFichaData(){
    return {
      paciente: fichaPaciente.value||"",
      data: fichaData.value||"",
      idade: fichaIdade.value||"",
      telefone: fichaTelefone.value||"",
      queixa: fichaQueixa.value||"",
      hda: fichaHDA.value||"",
      antecedentes: fichaAntecedentes.value||"",
      exame: fichaExame.value||"",
      dx: fichaDx.value||"",
      plano: fichaPlano.value||"",
    };
  }
  function setFichaData(d){
    fichaPaciente.value = d.paciente||"";
    fichaData.value = d.data||toISODate(now());
    fichaIdade.value = d.idade||"";
    fichaTelefone.value = d.telefone||"";
    fichaQueixa.value = d.queixa||"";
    fichaHDA.value = d.hda||"";
    fichaAntecedentes.value = d.antecedentes||"";
    fichaExame.value = d.exame||"";
    fichaDx.value = d.dx||"";
    fichaPlano.value = d.plano||"";
  }

  function getRxData(){
    return { paciente: rxPaciente.value||"", data: rxData.value||"", texto: rxTexto.value||"" };
  }
  function setRxData(d){
    rxPaciente.value = d.paciente||"";
    rxData.value = d.data||toISODate(now());
    rxTexto.value = d.texto||"";
  }

  function getAtestadoData(){
    return {
      paciente: atPaciente.value||"",
      data: atData.value||"",
      dias: atDias.value||"",
      cid: atCID.value||"",
      texto: atTexto.value||"",
    };
  }
  function setAtestadoData(d){
    atPaciente.value = d.paciente||"";
    atData.value = d.data||toISODate(now());
    atDias.value = d.dias||"";
    atCID.value = d.cid||"";
    atTexto.value = d.texto||"";
  }

  function getOrcData(){
    return { paciente: orcPaciente.value||"", data: orcData.value||"", texto: orcTexto.value||"" };
  }
  function setOrcData(d){
    orcPaciente.value = d.paciente||"";
    orcData.value = d.data||toISODate(now());
    orcTexto.value = d.texto||"";
  }

  // ====== RECEITA — PRESETS (inclui antibiótico) ======
  const RX_PRESETS = {
    analgesico:
`1) Dipirona 500 mg — 1 comprimido a cada 6/6h se dor, por até 3 dias.
2) Paracetamol 750 mg — 1 comprimido a cada 8/8h se dor (alternativa).`,
    antiinflamatorio:
`1) Ibuprofeno 600 mg — 1 comprimido a cada 8/8h por 3 dias, após alimentação.
2) Nimesulida 100 mg — 1 comprimido a cada 12/12h por 3 dias (alternativa).`,
    antibiotico:
`1) Amoxicilina 500 mg — 1 cápsula a cada 8/8h por 7 dias.
2) Amoxicilina + Clavulanato 875/125 mg — 1 comprimido a cada 12/12h por 7 dias (se indicado).
3) Clindamicina 300 mg — 1 cápsula a cada 6/6h por 7 dias (alérgicos a penicilina, se indicado).`,
    antifungico:
`1) Nistatina suspensão — 5 mL 4x/dia por 7–14 dias (conforme avaliação).
2) Fluconazol 150 mg — dose única (quando indicado).`
  };

  document.querySelectorAll("[data-rx]").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const k = btn.getAttribute("data-rx");
      const add = RX_PRESETS[k] || "";
      const cur = rxTexto.value ? rxTexto.value.trim()+"\n\n" : "";
      rxTexto.value = cur + add;
      save(LS.rx, getRxData());
    });
  });

  // ====== CLEAR DOCS ======
  btnFichaClear.addEventListener("click", ()=>{
    if(!confirm("Limpar ficha clínica?")) return;
    setFichaData({});
    save(LS.ficha, getFichaData());
  });
  btnReceitaClear.addEventListener("click", ()=>{
    if(!confirm("Limpar receituário?")) return;
    setRxData({});
    save(LS.rx, getRxData());
  });
  btnAtestadoClear.addEventListener("click", ()=>{
    if(!confirm("Limpar atestado?")) return;
    setAtestadoData({});
    save(LS.atestado, getAtestadoData());
  });
  btnOrcClear.addEventListener("click", ()=>{
    if(!confirm("Limpar orçamento?")) return;
    setOrcData({});
    save(LS.orc, getOrcData());
  });

  // ====== PDF ENGINE (print) ======
  function openPrintWindow(title, html){
    const w = window.open("", "_blank");
    if(!w){
      showModal("Bloqueado", "Seu navegador bloqueou a janela do PDF. Libera pop-up pra este app.");
      return;
    }

    const p = getProf();
    const footer = `
      <div class="pdfFooter">
        <div><b>${escapeHtml(p.nome||"")}</b> ${escapeHtml(p.reg||"")}</div>
        <div>${escapeHtml(p.fone||"")} ${p.email ? "• "+escapeHtml(p.email) : ""}</div>
        <div>${escapeHtml(p.endereco||"")}</div>
        ${p.obs ? `<div class="muted">${escapeHtml(p.obs)}</div>` : ""}
      </div>
    `;

    w.document.open();
    w.document.write(`<!doctype html>
<html><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${escapeHtml(title)}</title>
<style>
  :root{ --text:#111; --muted:#444; --accent:#0fbf74; }
  body{ font-family: Arial, sans-serif; margin:24px; color:var(--text); }
  .head{ display:flex; justify-content:space-between; align-items:flex-start; gap:14px; border-bottom:2px solid #0fbf74; padding-bottom:10px; margin-bottom:14px; }
  .brand{ font-weight:900; font-size:18px; }
  .sub{ color:var(--muted); font-size:12px; margin-top:2px; }
  .docTitle{ font-size:18px; font-weight:900; }
  .box{ border:1px solid #ddd; border-radius:10px; padding:12px; margin:10px 0; }
  .grid2{ display:grid; grid-template-columns:1fr 1fr; gap:10px; }
  .line{ margin:6px 0; }
  .muted{ color:var(--muted); font-size:12px; }
  .pdfFooter{ margin-top:18px; border-top:1px solid #ddd; padding-top:10px; font-size:12px; color:#111; }
  .table{ width:100%; border-collapse:collapse; margin-top:10px; }
  .table th,.table td{ border-bottom:1px solid #eee; padding:8px 6px; font-size:12px; text-align:left; }
  @media print{
    button{ display:none; }
    body{ margin:18px; }
  }
</style>
</head><body>
<div class="head">
  <div>
    <div class="brand">BTX Docs Saúde</div>
    <div class="sub">Documentos Clínicos</div>
  </div>
  <div class="docTitle">${escapeHtml(title)}</div>
</div>

${html}

${footer}

<script>
  window.onload = ()=>{ window.print(); };
</script>
</body></html>`);
    w.document.close();
  }

  function escapeHtml(s){
    return String(s||"")
      .replaceAll("&","&amp;")
      .replaceAll("<","&lt;")
      .replaceAll(">","&gt;")
      .replaceAll('"',"&quot;")
      .replaceAll("'","&#039;");
  }

  // PDFs — Agenda
  function buildAgendaTable(list){
    if(!list.length) return `<div class="box">Nenhum agendamento encontrado.</div>`;
    const rows = list.map(a=>{
      return `<tr>
        <td>${escapeHtml(fmtDateBR(a.date))}</td>
        <td>${escapeHtml(a.time||"")}</td>
        <td>${escapeHtml(a.patient||"")}</td>
        <td>${escapeHtml(a.type||"")}</td>
        <td>${escapeHtml(a.status||"")}</td>
      </tr>`;
    }).join("");
    return `
      <div class="box">
        <table class="table">
          <thead><tr><th>Data</th><th>Hora</th><th>Paciente</th><th>Tipo</th><th>Status</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `;
  }

  btnDayPdf.addEventListener("click", ()=>{
    state.viewMode="day";
    const list = filterAppts(getAppts());
    const title = `Agenda do Dia (${fmtDateBR(getRangeForMode().start)})`;
    openPrintWindow(title, buildAgendaTable(list));
  });

  btnWeekPdf.addEventListener("click", ()=>{
    state.viewMode="week";
    const {start,end} = getRangeForMode();
    const list = filterAppts(getAppts());
    const title = `Agenda da Semana (${fmtDateBR(start)} — ${fmtDateBR(end)})`;
    openPrintWindow(title, buildAgendaTable(list));
  });

  btnMonthPdf.addEventListener("click", ()=>{
    const base = apptDate.value ? new Date(apptDate.value+"T00:00:00") : new Date();
    const y = base.getFullYear();
    const m = base.getMonth()+1;
    const start = `${y}-${pad2(m)}-01`;
    const endDate = new Date(y, m, 0).getDate();
    const end = `${y}-${pad2(m)}-${pad2(endDate)}`;

    const list = getAppts()
      .filter(a=>a.date>=start && a.date<=end)
      .sort((a,b)=>(a.date!==b.date? a.date.localeCompare(b.date) : (a.time||"").localeCompare(b.time||"")));

    const title = `Agenda do Mês (${pad2(m)}/${y})`;
    openPrintWindow(title, buildAgendaTable(list));
  });

  // PDFs — Docs
  btnFichaPdf.addEventListener("click", ()=>{
    const d = getFichaData();
    const html = `
      <div class="box">
        <div class="grid2">
          <div class="line"><b>Paciente:</b> ${escapeHtml(d.paciente)}</div>
          <div class="line"><b>Data:</b> ${escapeHtml(fmtDateBR(d.data))}</div>
          <div class="line"><b>Idade:</b> ${escapeHtml(d.idade)}</div>
          <div class="line"><b>Telefone:</b> ${escapeHtml(d.telefone)}</div>
        </div>
      </div>
      <div class="box"><b>Queixa principal</b><div class="line">${escapeHtml(d.queixa).replaceAll("\n","<br>")}</div></div>
      <div class="box"><b>História da doença atual</b><div class="line">${escapeHtml(d.hda).replaceAll("\n","<br>")}</div></div>
      <div class="box"><b>Antecedentes / Medicações</b><div class="line">${escapeHtml(d.antecedentes).replaceAll("\n","<br>")}</div></div>
      <div class="box"><b>Exame</b><div class="line">${escapeHtml(d.exame).replaceAll("\n","<br>")}</div></div>
      <div class="box"><b>Hipóteses / Diagnóstico</b><div class="line">${escapeHtml(d.dx).replaceAll("\n","<br>")}</div></div>
      <div class="box"><b>Conduta / Plano</b><div class="line">${escapeHtml(d.plano).replaceAll("\n","<br>")}</div></div>
    `;
    openPrintWindow("Ficha Clínica", html);
  });

  btnReceitaPdf.addEventListener("click", ()=>{
    const d = getRxData();
    const html = `
      <div class="box">
        <div class="grid2">
          <div class="line"><b>Paciente:</b> ${escapeHtml(d.paciente)}</div>
          <div class="line"><b>Data:</b> ${escapeHtml(fmtDateBR(d.data))}</div>
        </div>
      </div>
      <div class="box">
        <b>Prescrição</b>
        <div class="line">${escapeHtml(d.texto).replaceAll("\n","<br>")}</div>
      </div>
    `;
    openPrintWindow("Receituário", html);
  });

  btnAtestadoPdf.addEventListener("click", ()=>{
    const d = getAtestadoData();
    const dias = d.dias ? `${escapeHtml(d.dias)} dia(s)` : "";
    const baseText = d.texto && d.texto.trim()
      ? d.texto.trim()
      : `Atesto para os devidos fins que ${d.paciente||"o(a) paciente"} esteve em atendimento nesta data, necessitando afastamento por ${d.dias||"__"} dia(s).`;

    const html = `
      <div class="box">
        <div class="grid2">
          <div class="line"><b>Paciente:</b> ${escapeHtml(d.paciente)}</div>
          <div class="line"><b>Data:</b> ${escapeHtml(fmtDateBR(d.data))}</div>
          <div class="line"><b>Afastamento:</b> ${dias}</div>
          <div class="line"><b>CID:</b> ${escapeHtml(d.cid||"")}</div>
        </div>
      </div>
      <div class="box">
        <b>Texto</b>
        <div class="line">${escapeHtml(baseText).replaceAll("\n","<br>")}</div>
      </div>
    `;
    openPrintWindow("Atestado", html);
  });

  btnOrcPdf.addEventListener("click", ()=>{
    const d = getOrcData();
    const html = `
      <div class="box">
        <div class="grid2">
          <div class="line"><b>Paciente:</b> ${escapeHtml(d.paciente)}</div>
          <div class="line"><b>Data:</b> ${escapeHtml(fmtDateBR(d.data))}</div>
        </div>
      </div>
      <div class="box">
        <b>Itens / Valores</b>
        <div class="line">${escapeHtml(d.texto).replaceAll("\n","<br>")}</div>
      </div>
    `;
    openPrintWindow("Orçamento", html);
  });

  // ====== BACKUP / RESTORE ======
  function buildBackup(){
    return {
      version: 1,
      createdAt: new Date().toISOString(),
      prof: getProf(),
      appts: getAppts(),
      ficha: load(LS.ficha, {}),
      rx: load(LS.rx, {}),
      atestado: load(LS.atestado, {}),
      orc: load(LS.orc, {})
    };
  }

  btnBackup.addEventListener("click", ()=>{
    const data = buildBackup();
    const blob = new Blob([JSON.stringify(data, null, 2)], {type:"application/json"});
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `BTX_Backup_${toISODate(now())}.json`;
    a.click();

    setTimeout(()=>URL.revokeObjectURL(url), 1500);
  });

  btnRestore.addEventListener("click", ()=>{
    const inp = document.createElement("input");
    inp.type = "file";
    inp.accept = "application/json";
    inp.addEventListener("change", ()=>{
      const file = inp.files && inp.files[0];
      if(!file) return;
      const reader = new FileReader();
      reader.onload = ()=>{
        const obj = safeJSON(reader.result, null);
        if(!obj || typeof obj !== "object"){
          showModal("Falhou", "Arquivo inválido.");
          return;
        }
        if(!confirm("Restaurar este backup? Isso substitui dados atuais.")) return;

        if(obj.prof) save(LS.prof, obj.prof);
        if(Array.isArray(obj.appts)) save(LS.appts, obj.appts);
        if(obj.ficha) save(LS.ficha, obj.ficha);
        if(obj.rx) save(LS.rx, obj.rx);
        if(obj.atestado) save(LS.atestado, obj.atestado);
        if(obj.orc) save(LS.orc, obj.orc);

        hydrateAll();
        renderAgenda();
        showModal("Restaurado", "Backup restaurado com sucesso.");
      };
      reader.readAsText(file);
    });
    inp.click();
  });

  // ====== INSTALL HINT ======
  btnInstallHint.addEventListener("click", ()=>{
    showModal(
      "Instalar no celular",
      "No Android: abra no Chrome → menu ⋮ → 'Instalar app' ou 'Adicionar à tela inicial'. Depois ele roda offline."
    );
  });

  btnTestPdf.addEventListener("click", ()=>{
    openPrintWindow("Teste PDF", `<div class="box">Se isso abriu e imprimiu/salvou em PDF, tá tudo certo ✅</div>`);
  });

  // ====== HYDRATE ======
  function hydrateDocs(){
    setFichaData(load(LS.ficha, {}));
    setRxData(load(LS.rx, {}));
    setAtestadoData(load(LS.atestado, {}));
    setOrcData(load(LS.orc, {}));
  }

  function hydrateAll(){
    setDefaults();
    hydrateProf();
    hydrateDocs();
  }

  // ====== PWA REGISTER ======
  async function registerSW(){
    if(!("serviceWorker" in navigator)) return;
    try{
      await navigator.serviceWorker.register("./sw.js");
    }catch(err){
      // não trava o app por causa disso
      console.warn("SW error:", err);
    }
  }

  // ====== INIT ======
  function init(){
    refreshNet();
    setDefaults();
    bindAutoSave();
    setAgendaMode("day");
    refreshFooter();

    // auto auth
    if(isAuthed()){
      goApp();
    }else{
      goLogin();
    }

    // Relógio
    tick();
    setInterval(tick, 10000);

    registerSW();
  }

  // auto preencher texto do atestado quando muda paciente/dias
  function autoAtestadoText(){
    const p = (atPaciente.value||"").trim();
    const d = (atDias.value||"").trim();
    if(!atTexto.value.trim()){
      atTexto.value = `Atesto para os devidos fins que ${p || "o(a) paciente"} esteve em atendimento nesta data, necessitando afastamento por ${d || "__"} dia(s).`;
      save(LS.atestado, getAtestadoData());
    }
  }
  atPaciente.addEventListener("input", autoAtestadoText);
  atDias.addEventListener("input", autoAtestadoText);

  init();

})();
