// Espera a que el DOM esté listo
document.addEventListener("DOMContentLoaded", function () {
  console.log(limitePresupuestoGlobal);
  console.log(registrosPresupuestoGlobal);

  // GRÁFICA DE BARRAS - Presupuesto vs Real
  const ctxBarra = document
    .getElementById("graficaPresuVSreal")
    .getContext("2d");
  const graficaBarra = new Chart(ctxBarra, {
    type: "bar",
    data: {
      labels: [
        "Gastos Fijos",
        "Gastos Variables",
        "Ahorro",
        "Deudas",
        "Provisiones",
      ],
      datasets: [
        {
          label: "Presupuestado",
          data: [1000, 500, 300, 200, 100], // Aquí van tus datos reales
          backgroundColor: "rgba(0, 255, 8, 0.6)",
          borderColor: "rgba(0, 255, 8, 0.6)",
          borderWidth: 1,
        },
        {
          label: "Real",
          data: [950, 600, 250, 200, 100], // Aquí van tus datos reales
          backgroundColor: "rgba(255, 0, 0, 0.6)",
          borderColor: "rgba(255, 0, 0, 0.6)",
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function (value) {
              return "$" + value;
            },
          },
        },
      },
      plugins: {
        legend: {
          display: true,
          position: "top",
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              return context.dataset.label + ": $" + context.parsed.y;
            },
          },
        },
      },
    },
  });

  // GRÁFICA DE PASTEL 1 - Distribución Presupuestada
  const ctxPastel1 = document
    .getElementById("graficaDistrDineroPres")
    .getContext("2d");
  const graficaPastel1 = new Chart(ctxPastel1, {
    type: "pie",
    data: {
      labels: [
        "Gastos Fijos",
        "Gastos Variables",
        "Ahorro",
        "Deudas",
        "Provisiones",
      ],
      datasets: [
        {
          data: [1000, 500, 300, 200, 100], // Tus datos presupuestados
          backgroundColor: [
            "rgba(255, 99, 132, 0.8)",
            "rgba(54, 162, 235, 0.8)",
            "rgba(255, 206, 86, 0.8)",
            "rgba(75, 192, 192, 0.8)",
          ],
          borderColor: [
            "rgba(255, 99, 132, 1)",
            "rgba(54, 162, 235, 1)",
            "rgba(255, 206, 86, 1)",
            "rgba(75, 192, 192, 1)",
          ],
          borderWidth: 2,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          display: true,
          position: "bottom",
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              const label = context.label || "";
              const value = context.parsed;
              const total = context.dataset.data.reduce((a, b) => a + b, 0);
              const percentage = ((value / total) * 100).toFixed(1);
              return label + ": $" + value + " (" + percentage + "%)";
            },
          },
        },
      },
    },
  });

  // GRÁFICA DE PASTEL 2 - Distribución Real
  const ctxPastel2 = document
    .getElementById("graficaDistrDinReal")
    .getContext("2d");
  const graficaPastel2 = new Chart(ctxPastel2, {
    type: "pie",
    data: {
      labels: [
        "Gastos Fijos",
        "Gastos Variables",
        "Ahorro",
        "Deudas",
        "Provisiones",
      ],
      datasets: [
        {
          data: [950, 600, 250, 200, 100], // Tus datos reales
          backgroundColor: [
            "rgba(255, 99, 132, 0.8)",
            "rgba(54, 162, 235, 0.8)",
            "rgba(255, 206, 86, 0.8)",
            "rgba(75, 192, 192, 0.8)",
          ],
          borderColor: [
            "rgba(255, 99, 132, 1)",
            "rgba(54, 162, 235, 1)",
            "rgba(255, 206, 86, 1)",
            "rgba(75, 192, 192, 1)",
          ],
          borderWidth: 2,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          display: true,
          position: "bottom",
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              const label = context.label || "";
              const value = context.parsed;
              const total = context.dataset.data.reduce((a, b) => a + b, 0);
              const percentage = ((value / total) * 100).toFixed(1);
              return label + ": $" + value + " (" + percentage + "%)";
            },
          },
        },
      },
    },
  });
});
