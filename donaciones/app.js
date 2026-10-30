// CumpleDeseos - Lógica Reactiva de Compras Colaborativas y Ranking de Donantes

const STORAGE_KEY = "cumpledeseos_data_v1";

// Datos iniciales de demostración
const DEFAULT_DATA = {
  wishes: [
    {
      id: "w-1",
      titulo: "Mochila escolar resistente y cartuchera para el primario",
      descripcion: "Para mi hermanita menor que arranca las clases y se le rompió la que tenía. La vi en oferta en el barrio.",
      postulador: "Sofi_22",
      categoria: "Estudio",
      monto: 14500,
      medioPago: "Alias: sofi.estudios.mp (Mercado Pago)",
      pin: "1234",
      estado: "DISPONIBLE", // DISPONIBLE, REPORTADO, PAGADO
      donanteReportado: null,
      mensajeDonante: "",
      donanteConfirmado: null,
      fechaCreacion: "2026-10-28T14:30:00Z",
      fechaPago: null
    },
    {
      id: "w-2",
      titulo: "Caja de Tiras Reactivas y Lancetas para Glucosa",
      descripcion: "Para el control diario de diabetes de mi abuelo. En la farmacia nos piden este importe exacto.",
      postulador: "Marcos_G",
      categoria: "Salud",
      monto: 28000,
      medioPago: "CVU: 0000003100084729103948 (Cuenta DNI)",
      pin: "4321",
      estado: "REPORTADO",
      donanteReportado: "Facundo M.",
      mensajeDonante: "¡Mucha fuerza para tu abuelo, Marcos!",
      donanteConfirmado: null,
      fechaCreacion: "2026-10-29T10:15:00Z",
      fechaPago: null
    },
    {
      id: "w-3",
      titulo: "Curso online de Python & Git en Udemy",
      descripcion: "Quiero prepararme para conseguir mi primer trabajo en sistemas y este curso me falta para completar la ruta.",
      postulador: "AgusDev",
      categoria: "Tecnología",
      monto: 9500,
      medioPago: "Alias: agus.python.uala (Ualá)",
      pin: "0000",
      estado: "PAGADO",
      donanteReportado: "Elena Solidaria",
      mensajeDonante: "¡Éxitos en tu carrera tech!",
      donanteConfirmado: "Elena Solidaria",
      fechaCreacion: "2026-10-25T11:00:00Z",
      fechaPago: "2026-10-26T15:20:00Z"
    },
    {
      id: "w-4",
      titulo: "Canasta de alimentos no perecederos para comedor barrial",
      descripcion: "Fideos, arroz, leche en polvo y puré de tomate para el merendero Los Bajitos.",
      postulador: "Comedor Los Bajitos",
      categoria: "Alimentación",
      monto: 35000,
      medioPago: "Alias: comedor.bajitos.caba",
      pin: "9999",
      estado: "DISPONIBLE",
      donanteReportado: null,
      mensajeDonante: "",
      donanteConfirmado: null,
      fechaCreacion: "2026-10-29T18:00:00Z",
      fechaPago: null
    }
  ],
  donantes: [
    {
      nombre: "Elena Solidaria",
      puntos: 45000,
      deseosPagados: 3,
      ultimoPago: "2026-10-26T15:20:00Z"
    },
    {
      nombre: "Martin_BA",
      puntos: 32000,
      deseosPagados: 2,
      ultimoPago: "2026-10-24T18:00:00Z"
    },
    {
      nombre: "Camila R.",
      puntos: 18500,
      deseosPagados: 2,
      ultimoPago: "2026-10-22T12:00:00Z"
    },
    {
      nombre: "Anónimo_Generoso",
      puntos: 12000,
      deseosPagados: 1,
      ultimoPago: "2026-10-20T09:30:00Z"
    }
  ]
};

// Estado en memoria
let appData = carregarDatos();
let categoriaActual = "all";

function carregarDatos() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error("Error al cargar localStorage:", e);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_DATA));
  return JSON.parse(JSON.stringify(DEFAULT_DATA));
}

function guardarDatos() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appData));
  } catch (e) {
    console.error("Error al guardar en localStorage:", e);
  }
  actualizarEstadisticas();
}

function formatearMoneda(val) {
  return "$" + Number(val).toLocaleString("es-AR");
}

// Cambiar pestañas (Feed, Ranking, Postular)
function switchTab(tabId) {
  const tabs = ["feed", "ranking", "postular"];
  tabs.forEach(t => {
    const el = document.getElementById(`tab-${t}`);
    const navBtn = document.getElementById(`nav-${t}`);
    if (el) el.classList.add("hidden");
    if (navBtn) {
      navBtn.classList.remove("bg-brand-600/20", "text-brand-400", "border-brand-500/30");
      navBtn.classList.add("text-slate-400");
    }
  });

  const activeEl = document.getElementById(`tab-${tabId}`);
  const activeNav = document.getElementById(`nav-${tabId}`);
  if (activeEl) activeEl.classList.remove("hidden");
  if (activeNav && tabId !== "postular") {
    activeNav.classList.remove("text-slate-400");
    activeNav.classList.add("bg-brand-600/20", "text-brand-400", "border-brand-500/30");
  }

  if (tabId === "feed") renderWishes();
  if (tabId === "ranking") renderRanking();
}

// Filtrado de categorías
function filterCategory(cat) {
  categoriaActual = cat;
  document.querySelectorAll(".cat-btn").forEach(btn => {
    if (btn.dataset.cat === cat) {
      btn.classList.add("bg-brand-600", "text-white");
      btn.classList.remove("bg-slate-800", "text-slate-300");
    } else {
      btn.classList.remove("bg-brand-600", "text-white");
      btn.classList.add("bg-slate-800", "text-slate-300");
    }
  });
  renderWishes();
}

// Renderizado del feed de deseos
function renderWishes() {
  const grid = document.getElementById("wishes-grid");
  const empty = document.getElementById("wishes-empty");
  if (!grid) return;

  grid.innerHTML = "";

  const filtrados = appData.wishes.filter(w => {
    if (categoriaActual !== "all" && w.categoria !== categoriaActual) return false;
    return true;
  });

  // Ordenar: primero los DISPONIBLES y REPORTADOS, luego los PAGADOS
  filtrados.sort((a, b) => {
    const order = { DISPONIBLE: 0, REPORTADO: 1, PAGADO: 2 };
    return (order[a.estado] || 0) - (order[b.estado] || 0);
  });

  if (filtrados.length === 0) {
    empty.classList.remove("hidden");
    return;
  }
  empty.classList.add("hidden");

  filtrados.forEach(wish => {
    const card = document.createElement("div");
    card.className = "glass-card rounded-3xl p-6 flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 relative overflow-hidden";

    // Badges según estado
    let estadoBadge = "";
    let actionBtn = "";

    if (wish.estado === "DISPONIBLE") {
      estadoBadge = `<span class="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center gap-1.5">
        <span class="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span> Esperando Padrino
      </span>`;
      actionBtn = `<button onclick="abrirModalPagar('${wish.id}')" class="w-full py-3 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-500 hover:from-brand-500 hover:to-indigo-400 text-white font-bold text-sm shadow-lg shadow-brand-500/20 transition-all flex items-center justify-center gap-2">
        <i class="fa-solid fa-gift"></i> Pagar este Deseo (+${Number(wish.monto).toLocaleString()} pts)
      </button>`;
    } else if (wish.estado === "REPORTADO") {
      estadoBadge = `<span class="px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1.5">
        <i class="fa-solid fa-hourglass-half text-indigo-400"></i> Pago Notificado
      </span>`;
      actionBtn = `
        <div class="space-y-2">
          <div class="p-2.5 rounded-xl bg-indigo-950/50 border border-indigo-500/30 text-xs text-indigo-200">
            <strong>${escapeHTML(wish.donanteReportado)}</strong> notificó que ya transfirió.
            ${wish.mensajeDonante ? `<p class="italic text-slate-300 mt-1">"${escapeHTML(wish.mensajeDonante)}"</p>` : ""}
          </div>
          <button onclick="abrirModalConfirmar('${wish.id}')" class="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold text-sm shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2">
            <i class="fa-solid fa-circle-check"></i> Soy el Postulador: Confirmar Cobro
          </button>
        </div>`;
    } else if (wish.estado === "PAGADO") {
      estadoBadge = `<span class="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
        <i class="fa-solid fa-check-double text-emerald-400"></i> Deseo Cumplido
      </span>`;
      actionBtn = `<div class="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/20 text-center">
        <p class="text-xs text-emerald-300 font-semibold flex items-center justify-center gap-1.5">
          <i class="fa-solid fa-medal text-amber-400"></i> Pagado por: <span class="font-bold text-white">${escapeHTML(wish.donanteConfirmado || "Donante Anónimo")}</span>
        </p>
        <p class="text-[11px] text-slate-400 mt-0.5">¡Ganó +${Number(wish.monto).toLocaleString()} puntos en el ranking!</p>
      </div>`;
    }

    card.innerHTML = `
      <div>
        <div class="flex items-center justify-between gap-2 mb-3">
          <span class="text-xs font-bold px-2.5 py-0.5 rounded-lg bg-slate-800 text-slate-400 border border-slate-700">
            ${escapeHTML(wish.categoria)}
          </span>
          ${estadoBadge}
        </div>

        <h3 class="font-display font-bold text-lg text-white mb-2 leading-snug">${escapeHTML(wish.titulo)}</h3>
        <p class="text-xs text-slate-400 line-clamp-3 mb-4 leading-relaxed">${escapeHTML(wish.descripcion)}</p>
      </div>

      <div class="pt-4 border-t border-slate-800/80 space-y-3">
        <div class="flex items-center justify-between">
          <div class="text-xs text-slate-400">
            <span>Postulado por:</span>
            <strong class="text-slate-200 block font-semibold">${escapeHTML(wish.postulador)}</strong>
          </div>
          <div class="text-right">
            <span class="text-[10px] uppercase font-bold text-slate-400">Monto Requerido</span>
            <div class="font-display font-extrabold text-2xl text-amber-400">${formatearMoneda(wish.monto)}</div>
          </div>
        </div>

        <!-- Medio de Pago -->
        <div class="p-3 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between gap-2 text-xs">
          <div class="truncate text-slate-300">
            <i class="fa-solid fa-wallet text-brand-400 mr-1.5"></i>
            <span class="font-mono text-[11px]">${escapeHTML(wish.medioPago)}</span>
          </div>
          <button onclick="copiarTexto('${escapeHTML(wish.medioPago)}', this)" class="flex-shrink-0 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-all">
            <i class="fa-regular fa-copy"></i> Copiar
          </button>
        </div>

        <div class="pt-1">
          ${actionBtn}
        </div>
      </div>
    `;

    grid.appendChild(card);
  });

  actualizarEstadisticas();
}

// Renderizado del Ranking
function renderRanking() {
  const podium = document.getElementById("podium-container");
  const tbody = document.getElementById("ranking-table-body");
  if (!podium || !tbody) return;

  // Ordenar donantes por puntos descendente
  const donantesOrdenados = [...appData.donantes].sort((a, b) => b.puntos - a.puntos);

  // Podio Top 3
  podium.innerHTML = "";
  const top3 = donantesOrdenados.slice(0, 3);
  
  // Reordenar visualmente para podio olímpico: 2do (izq), 1ero (centro), 3ro (der)
  const podioDisplay = [
    { pos: 2, item: top3[1], color: "from-slate-400 to-slate-200", border: "border-slate-400/40", height: "h-64", medal: "🥈", title: "Ángel de Plata" },
    { pos: 1, item: top3[0], color: "from-amber-400 to-yellow-200", border: "border-amber-400/50", height: "h-76", medal: "🥇", title: "Gran Ángel de Oro", king: true },
    { pos: 3, item: top3[2], color: "from-amber-700 to-amber-500", border: "border-amber-700/40", height: "h-56", medal: "🥉", title: "Ángel de Bronce" }
  ];

  podioDisplay.forEach(p => {
    if (!p.item) return;
    const col = document.createElement("div");
    col.className = `glass-card rounded-3xl p-6 border ${p.border} flex flex-col justify-between items-center text-center relative ${p.king ? "glow-gold shadow-2xl -translate-y-2" : ""}`;

    col.innerHTML = `
      ${p.king ? '<div class="absolute -top-5 w-10 h-10 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center font-black text-xl shadow-lg shadow-amber-500/40"><i class="fa-solid fa-crown"></i></div>' : ""}
      
      <div class="pt-2">
        <div class="text-4xl mb-2">${p.medal}</div>
        <span class="text-xs uppercase font-extrabold tracking-wider text-transparent bg-clip-text bg-gradient-to-r ${p.color}">
          ${p.title}
        </span>
        <h4 class="font-display font-extrabold text-xl text-white mt-1">${escapeHTML(p.item.nombre)}</h4>
      </div>

      <div class="my-4 py-3 px-5 rounded-2xl bg-slate-900/90 border border-slate-800 w-full">
        <span class="text-[10px] uppercase font-bold text-slate-400 block">Puntos Acumulados</span>
        <span class="font-display font-black text-2xl text-amber-400">${Number(p.item.puntos).toLocaleString()}</span>
        <span class="text-[11px] text-slate-400 block mt-0.5">${p.item.deseosPagados} deseos pagados</span>
      </div>

      <div class="text-xs font-semibold px-3 py-1 rounded-full bg-brand-500/10 text-brand-300 border border-brand-500/20">
        Puesto #${p.pos}
      </div>
    `;

    podium.appendChild(col);
  });

  // Tabla completa
  tbody.innerHTML = "";
  donantesOrdenados.forEach((d, idx) => {
    const tr = document.createElement("tr");
    tr.className = "hover:bg-slate-800/40 transition-colors";

    let medalIcon = "";
    if (idx === 0) medalIcon = "🥇 ";
    else if (idx === 1) medalIcon = "🥈 ";
    else if (idx === 2) medalIcon = "🥉 ";

    // Rango o insignia según puntos
    let badge = "";
    if (d.puntos >= 50000) badge = '<span class="ml-2 px-2 py-0.5 text-[10px] font-bold rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">Leyenda</span>';
    else if (d.puntos >= 20000) badge = '<span class="ml-2 px-2 py-0.5 text-[10px] font-bold rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">Héroe</span>';
    else if (d.puntos >= 5000) badge = '<span class="ml-2 px-2 py-0.5 text-[10px] font-bold rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">Padrino</span>';
    else badge = '<span class="ml-2 px-2 py-0.5 text-[10px] font-bold rounded bg-slate-700 text-slate-300">Solidario</span>';

    tr.innerHTML = `
      <td class="py-4 px-6 font-display font-bold text-slate-300">
        ${medalIcon}#${idx + 1}
      </td>
      <td class="py-4 px-6 font-semibold text-white flex items-center">
        <div class="w-8 h-8 rounded-full bg-brand-600/30 text-brand-300 flex items-center justify-center font-bold text-xs mr-3">
          ${escapeHTML(d.nombre.charAt(0).toUpperCase())}
        </div>
        <span>${escapeHTML(d.nombre)}</span>
        ${badge}
      </td>
      <td class="py-4 px-6 text-slate-400">
        ${d.deseosPagados} ${d.deseosPagados === 1 ? "deseo" : "deseos"}
      </td>
      <td class="py-4 px-6 text-right font-display font-extrabold text-amber-400 text-base">
        ${Number(d.puntos).toLocaleString()} pts
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// Estadísticas globales del banner
function actualizarEstadisticas() {
  const totalDonado = appData.wishes
    .filter(w => w.estado === "PAGADO")
    .reduce((sum, w) => sum + Number(w.monto || 0), 0);

  const cumplidos = appData.wishes.filter(w => w.estado === "PAGADO").length;
  const activos = appData.wishes.filter(w => w.estado !== "PAGADO").length;
  const donantesCount = appData.donantes.length;

  const statTotal = document.getElementById("stat-total-donado");
  const statCumplidos = document.getElementById("stat-cumplidos");
  const statDonantes = document.getElementById("stat-donantes");
  const badgeActivos = document.getElementById("badge-activos");

  if (statTotal) statTotal.textContent = formatearMoneda(totalDonado);
  if (statCumplidos) statCumplidos.textContent = cumplidos;
  if (statDonantes) statDonantes.textContent = donantesCount;
  if (badgeActivos) badgeActivos.textContent = activos;
}

// Crear nueva postulación
function handleCrearPostulacion(e) {
  e.preventDefault();
  const nombre = document.getElementById("postulador-nombre").value.trim();
  const categoria = document.getElementById("postulador-categoria").value;
  const titulo = document.getElementById("postulador-titulo").value.trim();
  const monto = Number(document.getElementById("postulador-monto").value);
  const medioPago = document.getElementById("postulador-medio-pago").value.trim();
  const descripcion = document.getElementById("postulador-descripcion").value.trim();
  const pin = document.getElementById("postulador-pin").value.trim();

  if (!nombre || !titulo || !monto || !medioPago || !pin) {
    mostrarToast("Por favor completa todos los campos requeridos", "error");
    return;
  }

  const nuevoDeseo = {
    id: "w-" + Date.now(),
    titulo,
    descripcion,
    postulador: nombre,
    categoria,
    monto,
    medioPago,
    pin,
    estado: "DISPONIBLE",
    donanteReportado: null,
    mensajeDonante: "",
    donanteConfirmado: null,
    fechaCreacion: new Date().toISOString(),
    fechaPago: null
  };

  appData.wishes.unshift(nuevoDeseo);
  guardarDatos();

  document.getElementById("form-postulacion").reset();
  mostrarToast("¡Tu deseo fue publicado exitosamente en el feed!", "success");
  switchTab("feed");
}

// Modal Pagar
function abrirModalPagar(wishId) {
  const wish = appData.wishes.find(w => w.id === wishId);
  if (!wish) return;

  document.getElementById("modal-wish-id").value = wish.id;
  const content = document.getElementById("modal-pagar-content");

  content.innerHTML = `
    <div class="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
      <h4 class="font-bold text-white text-base">${escapeHTML(wish.titulo)}</h4>
      <p class="text-xs text-slate-400">Postulado por: <strong class="text-slate-200">${escapeHTML(wish.postulador)}</strong></p>
      
      <div class="flex items-center justify-between pt-2 border-t border-slate-800">
        <span class="text-xs text-slate-400">Monto exacto a transferir:</span>
        <span class="font-display font-black text-xl text-amber-400">${formatearMoneda(wish.monto)}</span>
      </div>

      <div class="p-3 rounded-xl bg-slate-950 border border-slate-800 mt-2 flex items-center justify-between">
        <div>
          <span class="text-[10px] uppercase font-bold text-slate-500 block">Datos de cobro</span>
          <span class="font-mono text-xs text-indigo-300 font-semibold select-all">${escapeHTML(wish.medioPago)}</span>
        </div>
        <button type="button" onclick="copiarTexto('${escapeHTML(wish.medioPago)}', this)" class="px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold transition-all">
          <i class="fa-regular fa-copy"></i> Copiar
        </button>
      </div>
    </div>
  `;

  document.getElementById("modal-pagar").classList.remove("hidden");
}

// Reportar Pago realizado
function handleReportarPago(e) {
  e.preventDefault();
  const wishId = document.getElementById("modal-wish-id").value;
  const donanteNombre = document.getElementById("donante-nombre").value.trim();
  const mensaje = document.getElementById("donante-mensaje").value.trim();

  if (!donanteNombre) {
    mostrarToast("Ingresa tu nombre o alias de donante", "error");
    return;
  }

  const wish = appData.wishes.find(w => w.id === wishId);
  if (wish) {
    wish.estado = "REPORTADO";
    wish.donanteReportado = donanteNombre;
    wish.mensajeDonante = mensaje;
    guardarDatos();
    renderWishes();
    closeModal("modal-pagar");
    document.getElementById("form-reportar-pago").reset();
    mostrarToast("¡Transferencia notificada! El postulador confirmará el cobro.", "success");
  }
}

// Modal Confirmar (Postulador)
function abrirModalConfirmar(wishId) {
  const wish = appData.wishes.find(w => w.id === wishId);
  if (!wish) return;

  document.getElementById("confirmar-wish-id").value = wish.id;
  const content = document.getElementById("modal-confirmar-content");

  content.innerHTML = `
    <div class="font-bold text-white text-sm">${escapeHTML(wish.titulo)}</div>
    <div class="text-xs text-slate-400">Monto: <strong class="text-amber-400">${formatearMoneda(wish.monto)}</strong></div>
    <div class="text-xs text-slate-300">Donante que transfirió: <strong class="text-indigo-400">${escapeHTML(wish.donanteReportado)}</strong></div>
    ${wish.mensajeDonante ? `<div class="text-xs italic text-slate-400">"${escapeHTML(wish.mensajeDonante)}"</div>` : ""}
  `;

  document.getElementById("modal-confirmar").classList.remove("hidden");
}

// Confirmar Pago y Asignar Puntos al Donante
function handleConfirmarPago(e) {
  e.preventDefault();
  const wishId = document.getElementById("confirmar-wish-id").value;
  const pinIngresado = document.getElementById("confirmar-pin").value.trim();

  const wish = appData.wishes.find(w => w.id === wishId);
  if (!wish) return;

  if (wish.pin !== pinIngresado) {
    mostrarToast("El PIN de seguridad es incorrecto", "error");
    return;
  }

  const donanteNombre = wish.donanteReportado || "Donante Anónimo";
  const puntosGanados = Number(wish.monto);

  // Actualizar deseo
  wish.estado = "PAGADO";
  wish.donanteConfirmado = donanteNombre;
  wish.fechaPago = new Date().toISOString();

  // Actualizar o crear donante en Ranking
  let donante = appData.donantes.find(d => d.nombre.toLowerCase() === donanteNombre.toLowerCase());
  if (donante) {
    donante.puntos += puntosGanados;
    donante.deseosPagados += 1;
    donante.ultimoPago = new Date().toISOString();
  } else {
    appData.donantes.push({
      nombre: donanteNombre,
      puntos: puntosGanados,
      deseosPagados: 1,
      ultimoPago: new Date().toISOString()
    });
  }

  guardarDatos();
  renderWishes();
  closeModal("modal-confirmar");
  document.getElementById("form-confirmar-pago").reset();

  // Efecto de Confetti de Victoria
  if (window.confetti) {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });
  }

  mostrarToast(`¡Deseo cumplido! Se acreditaron +${puntosGanados.toLocaleString()} puntos a ${donanteNombre}`, "success");
}

function closeModal(modalId) {
  const el = document.getElementById(modalId);
  if (el) el.classList.add("hidden");
}

function copiarTexto(texto, btn) {
  navigator.clipboard.writeText(texto).then(() => {
    const original = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-check text-emerald-400"></i> ¡Copiado!';
    setTimeout(() => {
      btn.innerHTML = original;
    }, 2000);
  }).catch(() => {
    mostrarToast("No se pudo copiar automáticamente", "error");
  });
}

function mostrarToast(mensaje, tipo = "info") {
  const toast = document.getElementById("toast");
  if (!toast) return;

  toast.textContent = mensaje;
  toast.className = "fixed bottom-6 right-6 z-50 transform transition-all duration-300 px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 text-sm font-semibold ";

  if (tipo === "success") {
    toast.className += "bg-emerald-600 text-white shadow-emerald-600/30 translate-y-0 opacity-100";
  } else if (tipo === "error") {
    toast.className += "bg-rose-600 text-white shadow-rose-600/30 translate-y-0 opacity-100";
  } else {
    toast.className += "bg-indigo-600 text-white shadow-indigo-600/30 translate-y-0 opacity-100";
  }

  setTimeout(() => {
    toast.classList.add("translate-y-20", "opacity-0");
  }, 4000);
}

function resetearDatosDemo() {
  if (confirm("¿Quieres restaurar los datos iniciales de demostración?")) {
    localStorage.removeItem(STORAGE_KEY);
    appData = carregarDatos();
    renderWishes();
    renderRanking();
    mostrarToast("Datos de demostración restaurados", "info");
  }
}

function escapeHTML(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Inicialización al cargar la página
document.addEventListener("DOMContentLoaded", () => {
  renderWishes();
  actualizarEstadisticas();
});