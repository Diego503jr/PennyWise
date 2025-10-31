// Obtener usuario actual
const currentUser = JSON.parse(localStorage.getItem("currentUser"));
if (!currentUser) {
  window.location.href = "./index.html";
}

document.addEventListener("DOMContentLoaded", () => {
  // Referencias a los elementos
  const formRegistro = document.getElementById("formRegistro");
  const formEditar = document.getElementById("formEditar");
  const tablaHistorial = document.getElementById("tablaHistorial");
  const filtroTipo = document.getElementById("filtroTipo");
  const filtroMes = document.getElementById("filtroMes");
  const filtroCategoria = document.getElementById("filtroCategoria");
  const saldoTotal = document.getElementById("saldoTotal");

  // ---------- GRÁFICO DE LÍNEAS ----------
  const graficoCanvas = document.getElementById("graficoIngresos");
  graficoCanvas.id = "graficoIngresos";
  graficoCanvas.classList.add("my-4");
  const historialSection = document.querySelector("main .tarjeta:last-of-type");
  if (historialSection) historialSection.appendChild(graficoCanvas);

  let graficoIngresos = null; // referencia al gráfico

  // Inicialización fecha (zona local)
  const hoy = new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
    .toISOString()
    .split("T")[0];

  const fechaRegistro = document.getElementById("fechaRegistro");
  const periodoRegistro = document.getElementById("periodoRegistro");

  if (fechaRegistro) {
    fechaRegistro.value = hoy;
    fechaRegistro.max = hoy;
  }
  if (periodoRegistro) periodoRegistro.value = "Mensual";

  const registrosKey = `registros_${currentUser.email}`;
  const limitesKey = `limitesDePresupuesto_${currentUser.email}`;

  // Recupera registros desde localStorage
  let registros = JSON.parse(localStorage.getItem(registrosKey)) || [];

  // Guardar en localStorage
  const guardarLocal = () =>
    localStorage.setItem(registrosKey, JSON.stringify(registros));

  const formatCurrency = (n) =>
    n.toLocaleString("es-SV", { style: "currency", currency: "USD" });

  const calcularSaldo = () => {
    const total = registros.reduce(
      (acc, r) => (r.tipo === "Ingreso" ? acc + r.monto : acc - r.monto),
      0
    );
    if (saldoTotal) {
      saldoTotal.textContent = formatCurrency(total);
      saldoTotal.classList.toggle("text-success", total > 0);
      saldoTotal.classList.toggle("text-danger", total < 0);
    }
  };

  const formatearFecha = (fechaISO) => {
    if (!fechaISO) return "";
    const [anio, mes, dia] = fechaISO.split("-");
    return `${dia}/${mes}/${anio}`;
  };

  // ---------- HISTORIAL ----------
  const mostrarHistorial = () => {
    const tipo = filtroTipo ? filtroTipo.value : "todos";
    const mes = filtroMes ? filtroMes.value : "";
    const cat = filtroCategoria ? filtroCategoria.value : "todas";

    if (!tablaHistorial) return;
    tablaHistorial.innerHTML = "";

    let filtrados = registros.slice();
    if (tipo !== "todos") filtrados = filtrados.filter((r) => r.tipo === tipo);
    if (mes) filtrados = filtrados.filter((r) => r.fecha.startsWith(mes));
    if (cat !== "todas") filtrados = filtrados.filter((r) => r.categoria === cat);

    filtrados.forEach((r, i) => {
      const fila = document.createElement("tr");
      fila.innerHTML = `
        <td class="${r.tipo === "Ingreso" ? "text-success fw-bold" : "text-danger fw-bold"}">${r.tipo}</td>
        <td>${formatCurrency(r.monto)}</td>
        <td>${r.categoria || r.descripcion}</td>
        <td>${formatearFecha(r.fecha)}</td>
        <td>
          <button class="btn btn-sm btn-outline-primary me-1 editar" data-id="${i}" title="Editar">
            <i class="bi bi-pencil-square"></i>
          </button>
          <button class="btn btn-sm btn-outline-danger eliminar" data-id="${i}" title="Eliminar">
            <i class="bi bi-trash3"></i>
          </button>
        </td>
      `;
      tablaHistorial.appendChild(fila);
    });

    calcularSaldo();
    actualizarGraficoIngresos();
  };

  // ---------- CATEGORÍAS ----------
  const categoriasIngreso = ["Salario", "Comisiones", "Venta", "Pago", "Otro"];
  const categoriasGasto = ["Ahorro", "Gastos Fijos", "Gastos Variables", "Deudas"];

  const actualizarCategorias = () => {
    if (!filtroCategoria) return;
    const tipo = filtroTipo ? filtroTipo.value : "";
    filtroCategoria.innerHTML = `<option value="todas">Todas</option>`;

    let lista = [];
    if (tipo === "Ingreso") lista = categoriasIngreso;
    else if (tipo === "Gasto") lista = categoriasGasto;
    else lista = [...categoriasIngreso, ...categoriasGasto];

    lista.forEach((c) => {
      const opt = document.createElement("option");
      opt.value = c;
      opt.textContent = c;
      filtroCategoria.appendChild(opt);
    });
  };

  // ---------- FORMULARIO ----------
  const tipoRegistro = document.getElementById("tipoRegistro");
  const categoriaRegistro = document.getElementById("categoriaRegistro");

  // Deshabilitar select de categorías inicialmente
  if (categoriaRegistro) categoriaRegistro.disabled = true;

  if (tipoRegistro && categoriaRegistro) {
    tipoRegistro.addEventListener("change", () => {
      const tipo = tipoRegistro.value;

      categoriaRegistro.innerHTML = `<option value="">Seleccionar Categoría</option>`;

      if (!tipo) {
        categoriaRegistro.disabled = true;
        return;
      }

      categoriaRegistro.disabled = false;

      const categorias = tipo === "Ingreso" ? categoriasIngreso : tipo === "Gasto" ? categoriasGasto : [];
      categorias.forEach((c) => {
        const opt = document.createElement("option");
        opt.value = c;
        opt.textContent = c;
        categoriaRegistro.appendChild(opt);
      });
    });
  }


  // ---------- VALIDACIÓN DE LÍMITES ----------
  function leerLimites() {
    const raw = localStorage.getItem(limitesKey);
    try {
      const parsed = raw ? JSON.parse(raw) : [];
      return (parsed || []).map(p => ({
        categoria: (p.categoria ?? p.cat ?? "").toString().trim(),
        limite: Number(p.limite ?? p.monto ?? 0)
      })).filter(Boolean);
    } catch {
      return [];
    }
  }

  function obtenerLimiteParaCategoria(categoria) {
    const limites = leerLimites();
    return limites.find(l => l.categoria.toLowerCase().trim() === categoria.toLowerCase().trim());
  }

  function validaNoSuperaLimite(categoria, montoNuevo, idEditar = null) {
    const limiteObj = obtenerLimiteParaCategoria(categoria);
    if (!limiteObj) return { ok: true };

    const gastosActuales = registros
      .filter((r, i) => r.tipo === "Gasto" && r.categoria?.toLowerCase().trim() === categoria.toLowerCase().trim() && i !== idEditar)
      .reduce((acc, r) => acc + Number(r.monto || 0), 0);

    const totalConNuevo = gastosActuales + Number(montoNuevo || 0);
    const limite = Number(limiteObj.limite || 0);

    if (totalConNuevo > limite) {
      return {
        ok: false,
        detalle: { limite, gastosActuales, totalConNuevo, restante: limite - gastosActuales },
        categoria: limiteObj.categoria
      };
    }
    return { ok: true };
  }

  // ---------- AGREGAR REGISTRO ----------
  if (formRegistro) {
    formRegistro.addEventListener("submit", (e) => {
      e.preventDefault();

      const tipo = tipoRegistro?.value || "";
      const monto = parseFloat(document.getElementById("montoRegistro")?.value || "NaN");
      const categoria = categoriaRegistro?.value || "";
      const descripcion = document.getElementById("descripcionRegistro")?.value || "";
      const fecha = fechaRegistro?.value || hoy;

      if (!tipo || !categoria || isNaN(monto) || monto <= 0 || !fecha) {
        Swal.fire("Error", "Completa todos los campos correctamente.", "error");
        return;
      }

      if (tipo === "Gasto") {
        const resultado = validaNoSuperaLimite(categoria, monto);
        if (!resultado.ok) {
          const d = resultado.detalle;
          Swal.fire({
            icon: "error",
            title: "Límite de presupuesto excedido",
            html: `
        <strong>${resultado.categoria}</strong><br>
        Límite: ${formatCurrency(d.limite)}<br>
        Total después de agregar: ${formatCurrency(d.totalConNuevo)}
      `,
            showCancelButton: true,
            confirmButtonText: "Ir a Presupuestos",
            cancelButtonText: "Ok"
          }).then((res) => {
            if (res.isConfirmed) {
              window.location.href = "presupuestos.html";
            }
          });
          return;
        }
      }


      registros.push({ tipo, monto, periodo: "Mensual", categoria, descripcion, fecha });
      guardarLocal();
      mostrarHistorial();

      formRegistro.reset();
      fechaRegistro.value = hoy;
      periodoRegistro.value = "Mensual";
      categoriaRegistro.innerHTML = `<option value="">Seleccionar Categoría</option>`;

      Swal.fire({ icon: "success", title: "Guardado correctamente", showConfirmButton: false, timer: 1200 });
    });
  }

  // ---------- EDITAR / ELIMINAR ----------
  tablaHistorial.addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;
    const id = Number(btn.dataset.id);
    const r = registros[id];

    if (btn.classList.contains("editar")) {
      document.getElementById("editarId").value = id;
      document.getElementById("editarMonto").value = r.monto;
      document.getElementById("editarPeriodo").value = r.periodo || "Mensual";
      document.getElementById("editarDescripcion").value = r.descripcion || "";
      document.getElementById("editarFecha").value = r.fecha || hoy;

      const selectCategoria = document.getElementById("editarCategoria");
      selectCategoria.innerHTML = "";
      const categorias = r.tipo === "Ingreso" ? categoriasIngreso : categoriasGasto;
      categorias.forEach((c) => {
        const opt = document.createElement("option");
        opt.value = c;
        opt.textContent = c;
        selectCategoria.appendChild(opt);
      });

      selectCategoria.value = r.categoria || "";
      new bootstrap.Modal(document.getElementById("modalEditar")).show();
    }

    if (btn.classList.contains("eliminar")) {
      Swal.fire({
        title: "¿Eliminar registro?",
        text: "Esta acción no se puede deshacer.",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#d33",
        cancelButtonColor: "#999",
        confirmButtonText: "Sí, eliminar",
        cancelButtonText: "Cancelar",
      }).then((result) => {
        if (result.isConfirmed) {
          registros.splice(id, 1);
          guardarLocal();
          mostrarHistorial();
          Swal.fire("Eliminado", "El registro ha sido eliminado.", "success");
        }
      });
    }
  });

  // ---------- GUARDAR CAMBIOS EDITAR ----------
  if (formEditar) {
    formEditar.addEventListener("submit", (e) => {
      e.preventDefault();
      const id = parseInt(document.getElementById("editarId").value, 10);
      const nuevoMonto = parseFloat(document.getElementById("editarMonto").value);
      const nuevaCategoria = document.getElementById("editarCategoria").value;
      const nuevaDescripcion = document.getElementById("editarDescripcion").value;
      const nuevaFecha = document.getElementById("editarFecha").value;

      if (isNaN(nuevoMonto) || nuevoMonto <= 0 || !nuevaCategoria || !nuevaFecha) {
        Swal.fire("Error", "Completa todos los campos correctamente.", "error");
        return;
      }



      const esGasto = registros[id].tipo === "Gasto";
      if (esGasto) {
        const resultado = validaNoSuperaLimite(nuevaCategoria, nuevoMonto, id);
        if (!resultado.ok) {
          const d = resultado.detalle;
          Swal.fire({
            icon: "error",
            title: "Límite de presupuesto excedido",
            html: `
        <strong>${resultado.categoria}</strong><br>
        Límite: ${formatCurrency(d.limite)}<br>
        Total después de agregar: ${formatCurrency(d.totalConNuevo)}`,
            showCancelButton: true,
            confirmButtonText: "Ir a Presupuestos",
            cancelButtonText: "Ok"
          }).then((res) => {
            if (res.isConfirmed) {
              window.location.href = "presupuestos.html";
            } else {
              const modalEditar = bootstrap.Modal.getInstance(document.getElementById("modalEditar"));
              if (modalEditar) modalEditar.hide();
            }
          });

          return;
        }
      }

      registros[id].monto = nuevoMonto;
      registros[id].descripcion = nuevaDescripcion;
      registros[id].categoria = nuevaCategoria;
      registros[id].fecha = nuevaFecha;

      guardarLocal();
      mostrarHistorial();
      bootstrap.Modal.getInstance(document.getElementById("modalEditar")).hide();

      Swal.fire({ icon: "success", title: "¡Guardado!", timer: 1200, showConfirmButton: false });
    });
  }

  // ---------- GRÁFICO ----------
  function actualizarGraficoIngresos() {
    const meses = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    const ingresosPorMes = Array(12).fill(0);

    registros.forEach(r => {
      if (r.tipo === "Ingreso" && r.fecha) {
        const mes = parseInt(r.fecha.split("-")[1], 10) - 1;
        if (mes >= 0 && mes < 12) ingresosPorMes[mes] += r.monto;
      }
    });

    const data = {
      labels: meses,
      datasets: [{
        label: "Ingresos mensuales",
        data: ingresosPorMes,
        borderColor: "#455a64",
        // backgroundColor: "rgba(0, 123, 255, 0.1)",
        fill: false,
        tension: 0.3
      }]
    };

    if (graficoIngresos) graficoIngresos.destroy();
    graficoIngresos = new Chart(graficoCanvas, {
      type: "line",
      data,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: true },
          tooltip: { mode: "index", intersect: false }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { callback: value => "$" + value }
          }
        }
      }
    });
  }

  // ---------- FILTROS ----------
  if (filtroTipo) filtroTipo.addEventListener("change", () => { actualizarCategorias(); mostrarHistorial(); });
  if (filtroMes) filtroMes.addEventListener("change", mostrarHistorial);
  if (filtroCategoria) filtroCategoria.addEventListener("change", mostrarHistorial);

  actualizarCategorias();
  mostrarHistorial();

  const btnLimpiarForm = document.getElementById("btnLimpiarForm");
  if (btnLimpiarForm) {
    btnLimpiarForm.addEventListener("click", () => {
      formRegistro.reset();
      fechaRegistro.value = hoy;
      periodoRegistro.value = "Mensual";
      categoriaRegistro.innerHTML = `<option value="">Seleccionar Categoría</option>`;
    });
  }

  const btnLimpiarFiltros = document.getElementById("btnLimpiarFiltros");
  if (btnLimpiarFiltros) {
    btnLimpiarFiltros.addEventListener("click", () => {
      if (filtroTipo) filtroTipo.value = "todos";
      if (filtroMes) filtroMes.value = "";
      if (filtroCategoria) filtroCategoria.value = "todas";
      actualizarCategorias();
      mostrarHistorial();
    });
  }



});
