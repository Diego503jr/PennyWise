document.addEventListener('DOMContentLoaded', function() {

 
    const ingresosFijos = [
        { descripcion: "Salario Quincena 1", monto: 750, periodo: "Quincenal" },
        { descripcion: "Salario Quincena 2", monto: 750, periodo: "Quincenal" }
    ];

    const gastosFijos = [
      
        { descripcion: "Renta / Hipoteca", monto: 500, categoria: "Gastos Fijos", periodo: "Mensual" },
        { descripcion: "Pago Préstamo Auto", monto: 180, categoria: "Deudas", periodo: "Mensual" },
        { descripcion: "Meta Ahorro Viaje", monto: 150, categoria: "Ahorros", periodo: "Mensual" }
    ];

    let limitesPresupuesto = [
        { categoria: "Gastos Variables - Comida", limite: 400 },
        { categoria: "Gastos Variables - Ocio", limite: 150 },
        { categoria: "Gastos Variables - Transporte", limite: 80 }
    ];

    const transaccionesReales = [
        { descripcion: "Supermercado", monto: 90, categoria: "Gastos Variables - Comida" },
        { descripcion: "Cena con amigos", monto: 45, categoria: "Gastos Variables - Ocio" },
        { descripcion: "Gasolina", monto: 40, categoria: "Gastos Variables - Transporte" },
        { descripcion: "Restaurante", monto: 30, categoria: "Gastos Variables - Comida" },
        { descripcion: "Cine", monto: 20, categoria: "Gastos Variables - Ocio" },
        { descripcion: "Supermercado", monto: 120, categoria: "Gastos Variables - Comida" },
        { descripcion: "Gasolina", monto: 45, categoria: "Gastos Variables - Transporte" } // ¡Se pasó!
    ];

    const listaIngresosUI = document.getElementById('listaIngresosFijos');
    const listaGastosFijosUI = document.getElementById('listaGastosFijos'); 
    const listaMonitoreoUI = document.getElementById('listaMonitoreoPresupuestos');
    const balanceUI = document.getElementById('balanceTotal');
    const totalIngresosUI = document.getElementById('totalIngresos');
    const totalGastosFijosUI = document.getElementById('totalGastosFijos'); 
    const formLimites = document.getElementById('formEstablecerLimites');

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
        listaIngresosUI.innerHTML = ''; // Limpiar "Cargando..."
        ingresosFijos.forEach(ingreso => {
            const li = document.createElement('li');
            li.className = 'list-group-item d-flex justify-content-between align-items-center';
            li.innerHTML = `
                <div>
                    <strong>${ingreso.descripcion}</strong>
                    <small class="d-block text-muted">${ingreso.periodo}</small>
                </div>
                <span class="badge bg-success-subtle text-success-emphasis rounded-pill fs-6">${formatCurrency(ingreso.monto)}</span>
            `;
            listaIngresosUI.appendChild(li);
        });
        totalIngresosUI.textContent = formatCurrency(totalIngresos);

        listaGastosFijosUI.innerHTML = ''; // Limpiar "Cargando..."
        gastosFijos.forEach(gasto => {
            const li = document.createElement('li');
            li.className = 'list-group-item d-flex justify-content-between align-items-center';
            li.innerHTML = `
                <div>
                    <strong>${gasto.descripcion}</strong>
                    <small class="d-block text-muted">${gasto.categoria} (${gasto.periodo})</small>
                </div>
                <span class="badge bg-danger-subtle text-danger-emphasis rounded-pill fs-6">${formatCurrency(gasto.monto)}</span>
            `;
            listaGastosFijosUI.appendChild(li);
        });
        totalGastosFijosUI.textContent = formatCurrency(totalGastosFijos);
    }

    
    function renderizarMonitoreo(gastosRealesPorCategoria) {
        listaMonitoreoUI.innerHTML = ''; // Limpiar el "Cargando..."

        limitesPresupuesto.forEach(presupuesto => {
            const categoria = presupuesto.categoria;
            const limite = presupuesto.limite;
            const gastado = gastosRealesPorCategoria[categoria] || 0; // Si no hay gastos, es 0

            const porcentaje = (gastado / limite) * 100;
            let barraColor = 'bg-success'; 
            if (porcentaje > 100) {
                barraColor = 'bg-danger'; // Rojo si se pasa
            } else if (porcentaje > 85) {
                barraColor = 'bg-warning'; // Amarillo si está cerca
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
        // Destruir gráficos anteriores si existen (importante para actualizar)
        if (chartBarra) chartBarra.destroy();
        if (chartDona) chartDona.destroy();

        const totalGastosVariablesReales = Object.values(gastosRealesPorCategoria).reduce((s, a) => s + a, 0);

        // Gráfico 1: Ingresos vs. Gastos (Barra)
        const ctxBarra = document.getElementById('graficoIngresosVsGastos').getContext('2d');
        chartBarra = new Chart(ctxBarra, {
            type: 'bar',
            data: {
                labels: ['Ingresos', 'Gastos Fijos', 'Gastos Variables (Reales)'],
                datasets: [{
                    label: 'Monto',
                    data: [totalIngresos, totalGastosFijos, totalGastosVariablesReales],
                    backgroundColor: [
                        'rgba(75, 192, 192, 0.6)', // Verde (Ingreso)
                        'rgba(255, 159, 64, 0.6)', // Naranja (Fijos)
                        'rgba(255, 99, 132, 0.6)'  // Rojo (Variables)
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


        const desgloseTotal = { ...gastosRealesPorCategoria }; // Copia de gastos variables
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
                        'rgba(75, 192, 192, 0.8)',   // Variables - Comida
                        'rgba(153, 102, 255, 0.8)', // Variables - Ocio
                        'rgba(255, 159, 64, 0.8)',  // Variables - Transporte
                        'rgba(255, 99, 132, 0.8)',   // Gastos Fijos
                        'rgba(54, 162, 235, 0.8)',  // Deudas
                        'rgba(255, 206, 86, 0.8)'   // Ahorros
                    ]
                }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }

 
    formLimites.addEventListener('submit', function(e) {
        e.preventDefault(); // Evita que la página se recargue

        const nuevoLimiteComida = parseFloat(document.getElementById('limiteComida').value);
        const nuevoLimiteOcio = parseFloat(document.getElementById('limiteOcio').value);
        const nuevoLimiteTransporte = parseFloat(document.getElementById('limiteTransporte').value);

        limitesPresupuesto = [
            { categoria: "Gastos Variables - Comida", limite: nuevoLimiteComida },
            { categoria: "Gastos Variables - Ocio", limite: nuevoLimiteOcio },
            { categoria: "Gastos Variables - Transporte", limite: nuevoLimiteTransporte }
        ];
        
        console.log("Nuevos límites guardados:", limitesPresupuesto);

        // 3. Re-renderizar todo el dashboard con los nuevos límites
        actualizarDashboard();

        // 4. Ocultar el modal (usando la API de Bootstrap)
        const modal = bootstrap.Modal.getInstance(document.getElementById('modalEstablecerLimites'));
        modal.hide();
    });

    // --- 5. INICIALIZACIÓN ---
    // Llamada inicial al cargar la página para que todo aparezca
    actualizarDashboard(); 
});