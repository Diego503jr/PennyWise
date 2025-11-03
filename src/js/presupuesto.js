document.addEventListener('DOMContentLoaded', function () {

  const currentUser = JSON.parse(localStorage.getItem("currentUser"));
  if (!currentUser) {
    alert("No se ha detectado un usuario. Redirigiendo al inicio.");
    window.location.href = "./index.html";
    return;
  }

  const registrosKey = `registros_${currentUser.email}`;
  const limitesKey = `limitesDePresupuesto_${currentUser.email}`;
  const todosLosRegistros = JSON.parse(localStorage.getItem(registrosKey)) || [];

  const ingresosFijos = todosLosRegistros.filter(r => r.tipo === 'Ingreso');
  const todosLosGastos = todosLosRegistros.filter(r => r.tipo === 'Gasto');


  const VALORES_DEFECTO_LIMITES = [
    { categoria: "Ahorro", limite: 0 },
    { categoria: "Provisiones", limite: 0 },
    { categoria: "Gastos Fijos", limite: 0 },
    { categoria: "Gastos Variables", limite: 0 },
    { categoria: "Deudas", limite: 0 }
  ];

  let limitesPresupuesto = JSON.parse(localStorage.getItem(limitesKey)) || [];

  const balanceTotalSpan = document.getElementById('balanceTotalSpan');
  const balanceHeader = document.getElementById('balanceHeader');

  const gastosAccordionContainer = document.getElementById('gastosAccordionContainer');
  const totalGastosRealesSpan = document.getElementById('totalGastosRealesSpan');

  const listaMonitoreoUI = document.getElementById('listaMonitoreoPresupuestos');
  const formLimites = document.getElementById('formEstablecerLimites');
  const modalLimites = document.getElementById('modalEstablecerLimites');

  const formatCurrency = (monto) => {
    return (monto ?? 0).toLocaleString('es-SV', { style: 'currency', currency: 'USD' });
  };

  const formatearFecha = (fechaISO) => {
    if (!fechaISO) return 'Sin fecha';
    const [anio, mes, dia] = fechaISO.split("-");
    return `${dia}/${mes}/${anio}`;
  };

  function actualizarDashboard() {
    const totalIngresos = ingresosFijos.reduce((sum, item) => sum + item.monto, 0);

    const totalGastosReales = todosLosGastos.reduce((sum, item) => sum + item.monto, 0);

    const limiteProvisiones = limitesPresupuesto.find(l => l.categoria === "Provisiones")?.limite || 0;
    const balance = totalIngresos - totalGastosReales - limiteProvisiones;
    if (balanceTotalSpan) {
      balanceTotalSpan.textContent = formatCurrency(balance);
      if (balance >= 0) {
        balanceHeader.classList.remove('bg-danger-subtle');
        balanceHeader.classList.add('bg-success-subtle');
      } else {
        balanceHeader.classList.remove('bg-success-subtle');
        balanceHeader.classList.add('bg-danger-subtle');
      }
    }


    renderizarAcordeonGastos(todosLosGastos, totalGastosReales);

    const gastosSumadosPorCategoria = todosLosGastos.reduce((acc, trans) => {
      if (!acc[trans.categoria]) {
        acc[trans.categoria] = 0;
      }
      acc[trans.categoria] += trans.monto;
      return acc;
    }, {});

    // Sumar aportes de metas a la categoría "Provisiones"
    // Solo contar aportes que se hicieron CON límite activo (conLimite: true)
    // Los aportes hechos SIN límite no deben contarse en el uso de provisiones
    const USER_KEY = (currentUser.username || currentUser.email || currentUser.id || 'guest').toString();
    const metasKey = `metas_${USER_KEY}`;
    const metas = JSON.parse(localStorage.getItem(metasKey) || '[]');
    const totalAportesMetas = metas.reduce((total, m) => {
      if (!m.history) return total;
      return total + m.history.reduce((sum, h) => {
        // Solo contar aportes que tengan la marca de que se hicieron con límite
        if (h.action === 'aporte' && h.conLimite === true) {
          return sum + Number(h.amount || 0);
        }
        return sum;
      }, 0);
    }, 0);

    // Agregar aportes de metas al gastado de Provisiones (solo los que tienen conLimite: true)
    if (totalAportesMetas > 0) {
      if (!gastosSumadosPorCategoria["Provisiones"]) {
        gastosSumadosPorCategoria["Provisiones"] = 0;
      }
      gastosSumadosPorCategoria["Provisiones"] += totalAportesMetas;
    }

    renderizarMonitoreo(gastosSumadosPorCategoria);
  }


  function renderizarAcordeonGastos(gastos, total) {
    totalGastosRealesSpan.textContent = formatCurrency(total);

    const gastosAgrupados = gastos.reduce((acc, gasto) => {
      const cat = gasto.categoria || 'Sin Categoría';
      if (!acc[cat]) {
        acc[cat] = { total: 0, items: [] };
      }
      acc[cat].total += gasto.monto;
      acc[cat].items.push(gasto);
      return acc;
    }, {});

    if (Object.keys(gastosAgrupados).length === 0) {
      gastosAccordionContainer.innerHTML = '<div class="card-body text-muted">Aún no hay gastos registrados.</div>';
      return;
    }

    let accordionHTML = '<div class="accordion accordion-flush" id="accordionGastos">';

    const categoriasOrdenadas = Object.keys(gastosAgrupados).sort();

    categoriasOrdenadas.forEach((categoria, index) => {
      const grupo = gastosAgrupados[categoria];
      const collapseId = `collapse-${index}`;

      const itemsHTML = grupo.items.map(gasto => `
            <li class="list-group-item d-flex justify-content-between align-items-center">
                <div>
                    <strong>${gasto.descripcion}</strong>
                    <small class="d-block text-muted">${formatearFecha(gasto.fecha)} (${gasto.periodo || 'N/A'})</small>
                </div>
                <span class="badge bg-danger-subtle text-danger-emphasis rounded-pill fs-6">${formatCurrency(gasto.monto)}</span>
            </li>
        `).join('');


      accordionHTML += `
            <div class="accordion-item">
                <h2 class="accordion-header" id="heading-${index}">
                    <button class="accordion-button accordion-button-custom collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#${collapseId}">
                        
                        <div class="d-flex justify-content-between w-100 me-3">
                            <strong class="text-dark">${categoria}</strong>
                            
                            <span class_ ="text-danger fw-bold">${formatCurrency(grupo.total)}</span>
                        </div>

                    </button>
                </h2>
                <div id="${collapseId}" class="accordion-collapse collapse" data-bs-parent="#accordionGastos">
                    <div class="accordion-body accordion-body-condensed">
                        <ul class="list-group list-group-flush">
                            ${itemsHTML}
                        </ul>
                    </div>
                </div>
            </div>
        `;
    });

    accordionHTML += '</div>';

    gastosAccordionContainer.innerHTML = accordionHTML;
  }

  function renderizarMonitoreo(gastosSumadosPorCategoria) {
    listaMonitoreoUI.innerHTML = '';
    limitesPresupuesto.forEach(presupuesto => {
      const categoria = presupuesto.categoria;
      const limite = presupuesto.limite;
      const gastado = gastosSumadosPorCategoria[categoria] || 0;
      const porcentaje = (limite > 0) ? (gastado / limite) * 100 : 0;
      let barraColor = 'bg-success';
      if (porcentaje > 100) {
        barraColor = 'bg-danger';
      } else if (porcentaje > 85) {
        barraColor = 'bg-warning';
      }
      const div = document.createElement('div');
      div.className = 'mb-4';

      let tituloCategoria = `<strong>${categoria}</strong>`;

      if (categoria === "Provisiones") {
        tituloCategoria = `
            <a href="./metas.html" class="monitoreo-link">
                <strong>${categoria}</strong>
                <i class="bi bi-box-arrow-up-right ms-2 small"></i>
            </a>
        `;
      }

      div.innerHTML = `
        <div class="d-flex justify-content-between">
          ${tituloCategoria}
          <span class="fw-bold ${porcentaje > 100 ? 'text-danger' : ''}">
            ${formatCurrency(gastado)} / ${formatCurrency(limite)}
          </span>
        </div>
        <div class="progress" role="progressbar" style="height: 25px;">
          <div class="progress-bar ${barraColor}" style="width: ${Math.min(porcentaje, 100)}%">
            ${porcentaje > 10 ? porcentaje.toFixed(0) + '%' : ''}
          </div>
        </div>
      `;
      listaMonitoreoUI.appendChild(div);
    });
  }

  modalLimites.addEventListener('show.bs.modal', function () {
    document.getElementById('limiteAhorro').value =
      limitesPresupuesto.find(l => l.categoria === "Ahorro")?.limite || 0;
    document.getElementById('limiteProvisiones').value =
      limitesPresupuesto.find(l => l.categoria === "Provisiones")?.limite || 0;
    document.getElementById('limiteGastosFijos').value =
      limitesPresupuesto.find(l => l.categoria === "Gastos Fijos")?.limite || 0;
    document.getElementById('limiteGastosVariables').value =
      limitesPresupuesto.find(l => l.categoria === "Gastos Variables")?.limite || 0;
    document.getElementById('limiteDeudas').value =
      limitesPresupuesto.find(l => l.categoria === "Deudas")?.limite || 0;
  });
  formLimites.addEventListener('submit', function (e) {
    e.preventDefault();
    const nuevoLimiteAhorro = parseFloat(document.getElementById('limiteAhorro').value);
    const nuevoLimiteProvisiones = parseFloat(document.getElementById('limiteProvisiones').value);
    const nuevoLimiteGastosFijos = parseFloat(document.getElementById('limiteGastosFijos').value);
    const nuevoLimiteGastosVariables = parseFloat(document.getElementById('limiteGastosVariables').value);
    const nuevoLimiteDeudas = parseFloat(document.getElementById('limiteDeudas').value);


    const totalIngresos = ingresosFijos.reduce((sum, item) => sum + item.monto, 0);
    const totalGastosReales = todosLosGastos.reduce((sum, item) => sum + item.monto, 0);
    const saldoActual = totalIngresos - totalGastosReales;

    // Validación de provisiones
    if (nuevoLimiteProvisiones > saldoActual) {
      Swal.fire({
        icon: "error",
        title: "Límite inválido",
        text: `El límite de provisiones no puede ser mayor al saldo actual (${formatCurrency(saldoActual)}).`,
      });
      return;
    }

    limitesPresupuesto = [
      { categoria: "Ahorro", limite: nuevoLimiteAhorro },
      { categoria: "Provisiones", limite: nuevoLimiteProvisiones },
      { categoria: "Gastos Fijos", limite: nuevoLimiteGastosFijos },
      { categoria: "Gastos Variables", limite: nuevoLimiteGastosVariables },
      { categoria: "Deudas", limite: nuevoLimiteDeudas }
    ];
    localStorage.setItem(limitesKey, JSON.stringify(limitesPresupuesto));
    console.log(`Nuevos límites guardados en ${limitesKey}:`, limitesPresupuesto);

    actualizarDashboard();
    const modal = bootstrap.Modal.getInstance(modalLimites);
    modal.hide();
  });

  actualizarDashboard();
});