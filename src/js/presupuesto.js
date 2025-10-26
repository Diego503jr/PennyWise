document.addEventListener('DOMContentLoaded', function () {


    const todosLosRegistros = JSON.parse(localStorage.getItem("registros")) || [];


    const ingresosFijos = todosLosRegistros.filter(r => r.tipo === 'Ingreso');

    const categoriasGastosFijos = ['Gastos Fijos', 'Deudas', 'Ahorro', 'Ahorros']; 
    const gastosFijos = todosLosRegistros.filter(r =>
        r.tipo === 'Gasto' && categoriasGastosFijos.includes(r.categoria)
    );

    const transaccionesReales = todosLosRegistros.filter(r =>
        r.tipo === 'Gasto' && !categoriasGastosFijos.includes(r.categoria)
    );

    const VALORES_DEFECTO_LIMITES = [
        { categoria: "Provisiones", limite: 400 },
        { categoria: "Gastos Variables", limite: 230 } 
    ];

    
    let limitesPresupuesto = JSON.parse(localStorage.getItem("limitesDePresupuesto")) || VALORES_DEFECTO_LIMITES;




    const listaIngresosUI = document.getElementById('listaIngresosFijos');
    const listaGastosFijosUI = document.getElementById('listaGastosFijos');
    const listaMonitoreoUI = document.getElementById('listaMonitoreoPresupuestos');
    const balanceUI = document.getElementById('balanceTotal');
    const totalIngresosUI = document.getElementById('totalIngresos');
    const totalGastosFijosUI = document.getElementById('totalGastosFijos');
    const formLimites = document.getElementById('formEstablecerLimites');


    const modalLimites = document.getElementById('modalEstablecerLimites');

    let chartBarra = null;
    let chartDona = null;

    const formatCurrency = (monto) => {
        return (monto ?? 0).toLocaleString('es-SV', { style: 'currency', currency: 'USD' });
    };

   
    function actualizarDashboard() {
        const totalIngresos = ingresosFijos.reduce((sum, item) => sum + item.monto, 0);
        const totalGastosFijos = gastosFijos.reduce((sum, item) => sum + item.monto, 0);

        renderizarListasFijas(totalIngresos, totalGastosFijos);

        const gastosRealesPorCategoria = transaccionesReales.reduce((acc, trans) => {
     
            if (!acc[trans.categoria]) {
                acc[trans.categoria] = 0;
            }
            acc[trans.categoria] += trans.monto;
            return acc;
        }, {});

        renderizarMonitoreo(gastosRealesPorCategoria);

        const totalGastosRealesVariables = Object.values(gastosRealesPorCategoria).reduce((sum, val) => sum + val, 0);
        const balance = totalIngresos - totalGastosFijos - totalGastosRealesVariables;
        balanceUI.textContent = formatCurrency(balance);
        balanceUI.className = balance >= 0 ? 'text-success fw-bold' : 'text-danger fw-bold';

        renderizarGraficos(totalIngresos, totalGastosFijos, gastosRealesPorCategoria);
    }

    function renderizarListasFijas(totalIngresos, totalGastosFijos) {
        listaIngresosUI.innerHTML = '';
        ingresosFijos.forEach(ingreso => {
            const li = document.createElement('li');
            li.className = 'list-group-item d-flex justify-content-between align-items-center';
            li.innerHTML = `
                <div>
                    <strong>${ingreso.descripcion}</strong>
                    <small class="d-block text-muted">${ingreso.periodo || 'N/A'}</small> 
                </div>
                <span class="badge bg-success-subtle text-success-emphasis rounded-pill fs-6">${formatCurrency(ingreso.monto)}</span>
            `;
            listaIngresosUI.appendChild(li);
        });
        totalIngresosUI.textContent = formatCurrency(totalIngresos);

        listaGastosFijosUI.innerHTML = '';
        gastosFijos.forEach(gasto => {
            const li = document.createElement('li');
            li.className = 'list-group-item d-flex justify-content-between align-items-center';
            li.innerHTML = `
                <div>
                    <strong>${gasto.descripcion}</strong>
                    <small class="d-block text-muted">${gasto.categoria} (${gasto.periodo || 'N/A'})</small>
                </div>
                <span class="badge bg-danger-subtle text-danger-emphasis rounded-pill fs-6">${formatCurrency(gasto.monto)}</span>
            `;
            listaGastosFijosUI.appendChild(li);
        });
        totalGastosFijosUI.textContent = formatCurrency(totalGastosFijos);
    }


    function renderizarMonitoreo(gastosRealesPorCategoria) {
        listaMonitoreoUI.innerHTML = '';

        limitesPresupuesto.forEach(presupuesto => {
            const categoria = presupuesto.categoria;
            const limite = presupuesto.limite;
            const gastado = gastosRealesPorCategoria[categoria] || 0;

            const porcentaje = (gastado / limite) * 100;
            let barraColor = 'bg-success';
            if (porcentaje > 100) {
                barraColor = 'bg-danger';
            } else if (porcentaje > 85) {
                barraColor = 'bg-warning';
            }

            const div = document.createElement('div');
            div.className = 'mb-4';
            div.innerHTML = `
                <div class="d-flex justify-content-between">
                    <strong>${categoria}</strong>
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


    function renderizarGraficos(totalIngresos, totalGastosFijos, gastosRealesPorCategoria) {
        if (chartBarra) chartBarra.destroy();
        if (chartDona) chartDona.destroy();

        const totalGastosVariablesReales = Object.values(gastosRealesPorCategoria).reduce((s, a) => s + a, 0);

        const ctxBarra = document.getElementById('graficoIngresosVsGastos').getContext('2d');
        chartBarra = new Chart(ctxBarra, {
            type: 'bar',
            data: {
                labels: ['Ingresos', 'Gastos Fijos', 'Gastos Variables (Reales)'],
                datasets: [{
                    label: 'Monto',
                    data: [totalIngresos, totalGastosFijos, totalGastosVariablesReales],
                    backgroundColor: [
                        'rgba(75, 192, 192, 0.6)',
                        'rgba(255, 159, 64, 0.6)',
                        'rgba(255, 99, 132, 0.6)'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: { y: { beginAtZero: true } },
                plugins: { legend: { display: false } }
            }
        });


        const desgloseTotal = { ...gastosRealesPorCategoria };
        gastosFijos.forEach(gasto => {
            if (!desgloseTotal[gasto.categoria]) {
                desgloseTotal[gasto.categoria] = 0;
            }
            desgloseTotal[gasto.categoria] += gasto.monto;
        });

        const ctxDona = document.getElementById('graficoDesgloseGastos').getContext('2d');
        chartDona = new Chart(ctxDona, {
            type: 'doughnut',
            data: {
                labels: Object.keys(desgloseTotal),
                datasets: [{
                    data: Object.values(desgloseTotal),
                    backgroundColor: [
                        'rgba(75, 192, 192, 0.8)',   
                        'rgba(153, 102, 255, 0.8)', 
                        'rgba(255, 159, 64, 0.8)',  
                        'rgba(255, 99, 132, 0.8)',  
                        'rgba(54, 162, 235, 0.8)',  
                        'rgba(255, 206, 86, 0.8)'   
                    ]
                }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }



    modalLimites.addEventListener('show.bs.modal', function () {
        const limiteProvisiones = limitesPresupuesto.find(l => l.categoria === "Provisiones")?.limite || 400;
        const limiteVariables = limitesPresupuesto.find(l => l.categoria === "Gastos Variables")?.limite || 230;

        document.getElementById('limiteProvisiones').value = limiteProvisiones;
        document.getElementById('limiteVariables').value = limiteVariables;
    });

    formLimites.addEventListener('submit', function (e) {
        e.preventDefault();

        const nuevoLimiteProvisiones = parseFloat(document.getElementById('limiteProvisiones').value);
        const nuevoLimiteVariables = parseFloat(document.getElementById('limiteVariables').value);

        limitesPresupuesto = [
            { categoria: "Provisiones", limite: nuevoLimiteProvisiones },
            { categoria: "Gastos Variables", limite: nuevoLimiteVariables }
        ];

 
        localStorage.setItem("limitesDePresupuesto", JSON.stringify(limitesPresupuesto));

        console.log("Nuevos límites guardados en localStorage:", limitesPresupuesto);

        actualizarDashboard(); 

        const modal = bootstrap.Modal.getInstance(modalLimites);
        modal.hide();
    });

  
    actualizarDashboard();
});