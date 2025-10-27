//Obtener usuario actual
const currentUser = JSON.parse(localStorage.getItem("currentUser"));
if (!currentUser) {
  window.location.href = "./index.html";
}

document.addEventListener("DOMContentLoaded", () => {
  //Referencias a los elementos
  const formIngreso = document.getElementById("formIngreso");
  const formGasto = document.getElementById("formGasto");
  const formEditar = document.getElementById("formEditar");
  const tablaHistorial = document.getElementById("tablaHistorial");
  const filtroTipo = document.getElementById("filtroTipo");
  const filtroMes = document.getElementById("filtroMes");
  const filtroCategoria = document.getElementById("filtroCategoria");
  const saldoTotal = document.getElementById("saldoTotal");

  //Inicialización fecha y periodo
  const hoy = new Date().toISOString().split("T")[0];
  document.getElementById("fechaIngreso").value = hoy;
  document.getElementById("fechaGasto").value = hoy;
  document.getElementById("periodoIngreso").value = "Mensual";
  document.getElementById("periodoGasto").value = "Mensual";

  //Recupera registros desde local
  let registros =
    JSON.parse(localStorage.getItem(`registros_${currentUser.email}`)) || [];

  //Guarda en local
  const guardarLocal = () =>
    localStorage.setItem(
      `registros_${currentUser.email}`,
      JSON.stringify(registros)
    );

  //Recorre los registros y calcula el saldo total
  const calcularSaldo = () => {
    const total = registros.reduce(
      (acc, r) => (r.tipo === "Ingreso" ? acc + r.monto : acc - r.monto),
      0
    );
    saldoTotal.textContent = `$${total.toFixed(2)}`;
  };

  const mostrarHistorial = () => {
    const tipo = filtroTipo.value;
    const mes = filtroMes.value;
    const cat = filtroCategoria.value;
    tablaHistorial.innerHTML = "";

    //Filtra registros
    let filtrados = registros;
    if (tipo !== "todos") filtrados = filtrados.filter((r) => r.tipo === tipo);
    if (mes) filtrados = filtrados.filter((r) => r.fecha.startsWith(mes));
    if (cat !== "todas")
      filtrados = filtrados.filter((r) => r.categoria === cat);

    //Agrega filas a la tabla según registros filtrados
    //Muestra botones de acciones
    filtrados.forEach((r, i) => {
      const fila = document.createElement("tr");
      fila.innerHTML = `
        <td class="${r.tipo === "Ingreso" ? "text-success fw-bold" : "text-danger fw-bold"
        }">${r.tipo}</td>
        <td>$${r.monto}</td>
        <td>${r.categoria || r.descripcion}</td>
        <td>${r.fecha}</td>
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
  };

  //Inserta registros, guarda en local y actualiza tabla 
  const agregarRegistro = (registro) => {
    registros.push(registro);
    guardarLocal();
    mostrarHistorial();
  };

  // Categorías por tipo
  const categoriasIngreso = ["Salario", "Comisiones", "Venta", "Pago", "Otro"];
  const categoriasGasto = ["Ahorro", "Provisiones", "Gastos Fijos", "Gastos Variables", "Deudas"];

  //Muestra filtro categoría según tipo
  const actualizarCategorias = () => {
    const tipo = filtroTipo.value;
    filtroCategoria.innerHTML = "";

    if (tipo === "Ingreso") {
      filtroCategoria.innerHTML = `<option value="todas">Todas</option>` +
        categoriasIngreso.map(c => `<option value="${c}">${c}</option>`).join("");
    } else if (tipo === "Gasto") {
      filtroCategoria.innerHTML = `<option value="todas">Todas</option>` +
        categoriasGasto.map(c => `<option value="${c}">${c}</option>`).join("");
    } else {
      filtroCategoria.innerHTML = `<option value="todas">Todas</option>` +
        [...categoriasIngreso, ...categoriasGasto].map(c => `<option value="${c}">${c}</option>`).join("");
    }
  };

  // Registrar Ingreso
  formIngreso.addEventListener("submit", (e) => {
    e.preventDefault();
    const ingreso = {
      tipo: "Ingreso",
      monto: parseFloat(document.getElementById("montoIngreso").value),
      periodo: "Mensual",
      categoria: document.getElementById("categoriaIngreso").value,
      descripcion: document.getElementById("descripcionIngreso").value,
      fecha: document.getElementById("fechaIngreso").value,
    };
    agregarRegistro(ingreso);
    formIngreso.reset();
    document.getElementById("fechaIngreso").value = hoy;
    document.getElementById("periodoIngreso").value = "Mensual";
  });

  // Registrar Gasto
  formGasto.addEventListener("submit", (e) => {
    e.preventDefault();
    const Gasto = {
      tipo: "Gasto",
      monto: parseFloat(document.getElementById("montoGasto").value),
      periodo: "Mensual",
      categoria: document.getElementById("categoriaGasto").value,
      descripcion: document.getElementById("descripcionGasto").value,
      fecha: document.getElementById("fechaGasto").value,
    };
    agregarRegistro(Gasto);
    formGasto.reset();
    document.getElementById("fechaGasto").value = hoy;
    document.getElementById("periodoGasto").value = "Mensual";
  });

  // Editar y Eliminar
  tablaHistorial.addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;
    const id = btn.dataset.id;
    const r = registros[id];

    // Editar
    if (btn.classList.contains("editar")) {
      document.getElementById("editarId").value = id;
      document.getElementById("editarMonto").value = r.monto;
      document.getElementById("editarPeriodo").value = r.periodo;
      document.getElementById("editarDescripcion").value = r.descripcion || "";
      document.getElementById("editarFecha").value = r.fecha;

      const selectCategoria = document.getElementById("editarCategoria");

      selectCategoria.innerHTML = "";

      //Muestra categorías según tipo de registro
      if (r.tipo === "Ingreso") {
        selectCategoria.innerHTML = `
      <option value="">Seleccionar Categoría</option>
      <option value="Salario">Salario</option>
      <option value="Comisiones">Comisiones</option>
      <option value="Venta">Venta</option>
      <option value="Pago">Pago</option>
      <option value="Otro">Otro</option>`;
      } else if (r.tipo === "Gasto") {
        selectCategoria.innerHTML = `
      <option value="">Seleccionar Categoría</option>
      <option value="Ahorro">Ahorro</option>
      <option value="Provisiones">Provisiones</option>
      <option value="Gastos Fijos">Gastos Fijos</option>
      <option value="Gastos Variables">Gastos Variables</option>
      <option value="Deudas">Deudas</option>`;
      }

      selectCategoria.value = r.categoria || "";

      new bootstrap.Modal(document.getElementById("modalEditar")).show();
    }

    // Eliminar
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

  // Guardar cambios desde modal
  formEditar.addEventListener("submit", (e) => {
    e.preventDefault();
    const id = document.getElementById("editarId").value;
    registros[id].monto = parseFloat(
      document.getElementById("editarMonto").value
    );
    registros[id].descripcion =
      document.getElementById("editarDescripcion").value;
    registros[id].categoria = document.getElementById("editarCategoria").value;
    registros[id].fecha = document.getElementById("editarFecha").value;
    guardarLocal();
    mostrarHistorial();
    bootstrap.Modal.getInstance(document.getElementById("modalEditar")).hide();

    Swal.fire({
      icon: "success",
      title: "¡Guardado!",
      text: "Los cambios se han guardado correctamente.",
      timer: 1500,
      showConfirmButton: false,
    });
  });

  // Actualizar categorías y mostrar historial al cambiar filtros
  filtroTipo.addEventListener("change", () => {
    actualizarCategorias();
    mostrarHistorial();
  });
  filtroMes.addEventListener("change", mostrarHistorial);
  filtroCategoria.addEventListener("change", mostrarHistorial);

  // Inicializar categorías y mostrar historial
  actualizarCategorias();
  mostrarHistorial();
});
