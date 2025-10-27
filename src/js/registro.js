//Obtener usuario actual
const currentUser = JSON.parse(localStorage.getItem("currentUser"));
if (!currentUser) {
    window.location.href = "./index.html";
}

document.addEventListener("DOMContentLoaded", () => {
    const formIngreso = document.getElementById("formIngreso");
    const formGasto = document.getElementById("formGasto");
    const formEditar = document.getElementById("formEditar");
    const tablaHistorial = document.getElementById("tablaHistorial");
    const filtroTipo = document.getElementById("filtroTipo");
    const filtroMes = document.getElementById("filtroMes");
    const filtroCategoria = document.getElementById("filtroCategoria");
    const saldoTotal = document.getElementById("saldoTotal");

    const hoy = new Date().toISOString().split("T")[0];
    document.getElementById("fechaIngreso").value = hoy;
    document.getElementById("fechaGasto").value = hoy;
    document.getElementById("periodoIngreso").value = "Mensual";
    document.getElementById("periodoGasto").value = "Mensual";

    let registros = JSON.parse(localStorage.getItem(`registros_${currentUser.email}`)) || [];

    const guardarLocal = () => localStorage.setItem(`registros_${currentUser.email}`, JSON.stringify(registros));


    const calcularSaldo = () => {
        const total = registros.reduce((acc, r) => r.tipo === "Ingreso" ? acc + r.monto : acc - r.monto, 0);
        saldoTotal.textContent = `$${total.toFixed(2)}`;
    };

    const mostrarHistorial = () => {
        const tipo = filtroTipo.value;
        const mes = filtroMes.value;
        const cat = filtroCategoria.value;
        tablaHistorial.innerHTML = "";

        let filtrados = registros;
        if (tipo !== "todos") filtrados = filtrados.filter(r => r.tipo === tipo);
        if (mes) filtrados = filtrados.filter(r => r.fecha.startsWith(mes));
        if (cat !== "todas") filtrados = filtrados.filter(r => r.categoria === cat);

        filtrados.forEach((r, i) => {
            const fila = document.createElement("tr");
            fila.innerHTML = `
        <td class="${r.tipo === "Ingreso" ? "text-success fw-bold" : "text-danger fw-bold"}">${r.tipo}</td>
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

    const agregarRegistro = (registro) => {
        registros.push(registro);
        guardarLocal();
        mostrarHistorial();
    };

    // Registrar Ingreso
    formIngreso.addEventListener("submit", e => {
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
    formGasto.addEventListener("submit", e => {
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
    tablaHistorial.addEventListener("click", e => {
        const btn = e.target.closest("button");
        if (!btn) return;
        const id = btn.dataset.id;
        const r = registros[id];

        // Editar
        if (btn.classList.contains("editar")) {
            document.getElementById("editarId").value = id;
            document.getElementById("editarMonto").value = r.monto;
            document.getElementById("editarPeriodo").value = r.periodo;
            document.getElementById("editarCategoria").value = r.categoria || "";
            document.getElementById("editarDescripcion").value = r.descripcion || "";
            document.getElementById("editarFecha").value = r.fecha;
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
                cancelButtonText: "Cancelar"
            }).then(result => {
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
    formEditar.addEventListener("submit", e => {
        e.preventDefault();
        const id = document.getElementById("editarId").value;
        registros[id].monto = parseFloat(document.getElementById("editarMonto").value);
        registros[id].descripcion = document.getElementById("editarDescripcion").value;
        registros[id].categoria = document.getElementById("editarCategoria").value;
        registros[id].fecha = document.getElementById("editarFecha").value;
        guardarLocal();
        mostrarHistorial();
        bootstrap.Modal.getInstance(document.getElementById("modalEditar")).hide();

        Swal.fire({
            icon: 'success',
            title: '¡Guardado!',
            text: 'Los cambios se han guardado correctamente.',
            timer: 1500,
            showConfirmButton: false
        });
    });

    filtroTipo.addEventListener("change", mostrarHistorial);
    filtroMes.addEventListener("change", mostrarHistorial);
    filtroCategoria.addEventListener("change", mostrarHistorial);

    mostrarHistorial();
});
