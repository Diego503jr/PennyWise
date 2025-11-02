//Obtener usuario actual
const currentUser = JSON.parse(localStorage.getItem("currentUser"));
if (!currentUser) {
  window.location.href = "index.html";
}

let colores = ["primary", "secondary", "info", "warning", "danger"];

window.limitePresupuestoGlobal = null;
window.registrosPresupuestoGlobal = null;

//#region RESUMEN
document.addEventListener("DOMContentLoaded", async (e) => {
  try {
    //#region Variables
    let limitesPresupuesto =
      (await JSON.parse(
        localStorage.getItem(`limitesDePresupuesto_${currentUser.email}`)
      )) || [];

    let ingresos = (
      (await JSON.parse(
        localStorage.getItem(`registros_${currentUser.email}`)
      )) || []
    )
      .filter((i) => i.tipo === "Ingreso")
      .reduce((prev, curr) => {
        if (!prev[curr.categoria]) {
          prev[curr.categoria] = 0;
        }

        prev[curr.categoria] += curr.monto;

        return prev;
      }, {});

    const tbodyAppend = document.getElementById("tbody-resume");

    tbodyAppend.innerHTML = "";
    //#endregion

    //#region Agregar Ingresos

    //  Agregamos los ingresos de manera global
    if (ingresos.length > 0 || ingresos) {
      const fila = document.createElement("tr");

      // Obtenemos el total de los ingresos
      const totIngreso = Object.values(ingresos).reduce(
        (sum, monto) => sum + monto,
        0
      );

      fila.classList.add("table-success");
      fila.innerHTML = `
        <td>Ingresos</td>
        <td>$ ${totIngreso}</td>
      `;

      tbodyAppend.appendChild(fila);
    }
    //#endregion

    //#region Agregar Gastos
    if (limitesPresupuesto.length > 0 || limitesPresupuesto) {
      limitesPresupuesto.forEach((e) => {
        const fila = document.createElement("tr");
        fila.classList.add(
          `table-${
            colores[
              e.categoria === "Deudas"
                ? 4
                : e.categoria === "Ahorro"
                ? 2
                : e.categoria === "Gastos Fijos"
                ? 1
                : e.categoria === "Gastos Variables"
                ? 3
                : 0
            ]
          }`
        );
        fila.innerHTML = `
        <td>${e.categoria}</td>
        <td>$ ${e.limite}</td>
      `;
        tbodyAppend.appendChild(fila);
      });
    }
    //#endregion

    //#region Validacion Agregar Resumen
    if (
      limitesPresupuesto === 0 ||
      ingresos === 0 ||
      !limitesPresupuesto ||
      !ingresos
    ) {
      const fila = document.createElement("tr");
      fila.innerHTML = `
        <td colspan="2" class="text-muted" >Sin Categorias</td>
      `;
      tbodyAppend.appendChild(fila);
    }
    //#endregion
  } catch (err) {
    console.error(err);
  }
});

//#endregion

//#region METAS
document.addEventListener("DOMContentLoaded", async (e) => {
  try {
    //#region Variables
    let metas =
      (await JSON.parse(localStorage.getItem(`metas_${currentUser.email}`))) ||
      [];

    const tbodyAppend = document.getElementById("tbody-metas");

    tbodyAppend.innerHTML = "";
    //#endregion

    //  Validamos si hay registros para mostrarlos o mostrar msj
    if (metas.length === 0 || !metas) {
      const fila = document.createElement("tr");
      fila.innerHTML = `
        <td colspan="2" class="text-muted" >Sin Metas</td>
      `;
      tbodyAppend.appendChild(fila);
    } else {
      metas.forEach((e) => {
        const fila = document.createElement("tr");
        fila.innerHTML = `
      <td>${e.nombre}</td>
      <td>$ ${getMonthPerMetas(e.objetivo, e.periodos)}</td>
    `;
        tbodyAppend.appendChild(fila);
      });
    }
  } catch (err) {
    console.error(err);
  }

  //  Hacemos un calculo para mostrar la mensualidad que debe de realizar mensualmente
  function getMonthPerMetas(obj, per) {
    //  Verificamos que no esten vacios los campos
    if (!obj && !per) {
      console.log("No se logro encontrar nada");
      return;
    }

    const result = obj / per;

    //  No validamos que el divisor sea 0 porque aqui se valida si es nan se muestra 0 sino se muestra el resultado
    return isNaN(result) ? 0 : result.toFixed(2);
  }
});

//#endregion

//#region ALERTAS
document.addEventListener("DOMContentLoaded", async (e) => {
  try {
    //#region Variables

    // LOCALSTORAGE Variables
    let limitesPresupuesto =
      (await JSON.parse(
        localStorage.getItem(`limitesDePresupuesto_${currentUser.email}`)
      )) || [];

    let registros =
      (await JSON.parse(
        localStorage.getItem(`registros_${currentUser.email}`)
      )) || [];

    let metas =
      (await JSON.parse(localStorage.getItem(`metas_${currentUser.email}`))) ||
      [];

    // DOM Variable
    const cardAlert = document.getElementById("cardAlert");
    const msgAlert = document.getElementById("msgAlert");

    // Normal Variable
    let sumGastosByCategory = {};

    //#endregion

    //#region Logica para obtener los gastos

    //  Verificamos que hayan registros
    if (registros || registros.length > 0) {
      // Filtramos por tipos de registros 'Gastos'
      let gastos = registros.filter((r) => r.tipo === "Gasto");

      //  Verificamos que hayan gastos
      if (gastos || gastos.length > 0) {
        sumGastosByCategory = gastos.reduce((acc, curr) => {
          //  Verificamos si no hay nada en la categoria le asignamos el valor de 0
          if (!acc[curr.categoria]) {
            acc[curr.categoria] = 0;
          }

          acc[curr.categoria] += curr.monto;
          return acc;
        }, {});

        //  Obtenemos los aportes hechos
        let provisiones = metas.reduce((total, m) => {
          if (!m.history) return total;
          return (
            total +
            m.history.reduce((sum, h) => {
              return h.action === "aporte" ? sum + Number(h.amount || 0) : sum;
            }, 0)
          );
        }, 0);

        //  Agregamos las provisiones a los gastos si hay
        if (provisiones > 0) {
          if (!sumGastosByCategory["Provisiones"]) {
            sumGastosByCategory["Provisiones"] = 0;
          }
          sumGastosByCategory["Provisiones"] += provisiones;
        }
      }
    }
    //#endregion

    function renderAlerts() {
      limitesPresupuesto.forEach((e) => {
        const categoria = e.categoria;
        const limite = e.limite;
        const gastado = sumGastosByCategory[categoria] || 0;
        const porcentaje = limite > 0 ? (gastado / limite) * 100 : 0;

        if (porcentaje > 75) {
          msgAlert.textContent = "";
          const alerta = document.createElement("div");

          alerta.className = "my-1 mx-md-5";

          alerta.innerHTML = `
          <div class="alert mx-md-5 alert-${
            colores[
              categoria === "Deudas"
                ? 4
                : categoria === "Ahorro"
                ? 2
                : categoria === "Gastos Fijos"
                ? 1
                : categoria === "Gastos Variables"
                ? 3
                : 0
            ]
          }" role="alert">
           <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" class="bi bi-exclamation-triangle-fill flex-shrink-0 me-2" viewBox="0 0 16 16">
            <path d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767L8.982 1.566zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5zm.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"/>
          </svg>
          <div class="flex-grow-1">
            ¡Cuidado! Te queda poco presupuesto en 
            <strong class="mb-1">${categoria}</strong>
            <div class="d-flex justify-content-between align-items-center">
              <span>Gastado: <strong>$${gastado.toFixed(
                2
              )}</strong> / $${limite.toFixed(2)}</span>
              <span class="badge bg-dark ms-2">${porcentaje.toFixed(1)}%</span>
            </div>
            <div class="progress mt-2" style="height: 6px;">
              <div class="progress-bar bg-danger" role="progressbar" style="width: ${porcentaje}%" aria-valuenow="${porcentaje}" aria-valuemin="0" aria-valuemax="100"></div>
            </div>
          </div>

          </div>
          `;
          cardAlert.appendChild(alerta);
        }
      });
    }

    // Renderizamos la alerta
    renderAlerts();

    window.limitePresupuestoGlobal = limitesPresupuesto;
    window.registrosPresupuestoGlobal = sumGastosByCategory;
  } catch (err) {
    console.error(err);
  }
});

//#endregion
