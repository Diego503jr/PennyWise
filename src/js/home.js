//Obtener usuario actual
const currentUser = JSON.parse(localStorage.getItem("currentUser"));
if (!currentUser) {
  window.location.href = "index.html";
}

// Resumen mensual
document.addEventListener("DOMContentLoaded", async (e) => {
  let registros =
    (await JSON.parse(
      localStorage.getItem(`registros_${currentUser.email}`)
    )) || [];

  let colores = [
    "success",
    "primary",
    "secondary",
    "info",
    "warning",
    "danger",
  ];

  const tbodyAppend = document.getElementById("tbody-resume");

  tbodyAppend.innerHTML = "";

  //  Validamos si hay registros para mostrarlos o mostrar msj
  if (registros.length === 0 || !registros) {
    const fila = document.createElement("tr");
    fila.innerHTML = `
        Sin categoria
      `;
    tbodyAppend.appendChild(fila);
  } else {
    registros.forEach((e) => {
      const fila = document.createElement("tr");
      fila.classList.add(
        `table-${
          colores[
            e.categoria === "Salario"
              ? 0
              : e.categoria === "Deudas"
              ? 5
              : e.categoria === "Ahorro"
              ? 3
              : e.categoria === "Gastos Fijos"
              ? 1
              : e.categoria === "Gastos Variables"
              ? 4
              : 2
          ]
        }`
      );
      fila.innerHTML = `
        <td>${e.categoria}</td>
        <td>$ ${e.monto}</td>
      `;
      tbodyAppend.appendChild(fila);
    });
  }
});

//  METAS
document.addEventListener("DOMContentLoaded", async (e) => {
  let metas =
    (await JSON.parse(localStorage.getItem(`metas_${currentUser.email}`))) ||
    [];

  const tbodyAppend = document.getElementById("tbody-metas");

  tbodyAppend.innerHTML = "";

  //  Validamos si hay registros para mostrarlos o mostrar msj
  if (metas.length === 0 || !metas) {
    const fila = document.createElement("tr");
    fila.innerHTML = `
        <td colspan="2">Sin Metas</td>
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
});

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
