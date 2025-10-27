//Obtener usuario actual
const currentUser = JSON.parse(localStorage.getItem("currentUser"));
if (!currentUser) {
  window.location.href = "index.html";
}

// Resumen mensual
document.addEventListener("DOMContentLoaded", (e) => {
  let registros =
    JSON.parse(localStorage.getItem(`registros_${currentUser.email}`)) || [];

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
        <td>$${e.monto}</td>
      `;
    tbodyAppend.appendChild(fila);
  });
});

//  METAS
document.addEventListener("DOMContentLoaded", (e) => {
  let metas = JSON.parse(localStorage.getItem(`pennywise_metas_v1`));
  // JSON.parse(localStorage.getItem(`metas_${currentUser.email}`)) || [];

  const tbodyAppend = document.getElementById("tbody-metas");

  tbodyAppend.innerHTML = "";

  metas.forEach((e) => {
    const fila = document.createElement("tr");
    fila.innerHTML = `
      <td>${e.nombre}</td>
      <td>$${e.actual}</td>
    `;

    tbodyAppend.appendChild(fila);
  });
});
