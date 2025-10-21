// Metas - Guardar en localStorage, renderizar y acciones

const STORAGE_KEY = 'pennywise_metas_v1';

function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function getMetas() {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
}

function saveMetas(metas) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(metas));
}

// Registros helper: obtener saldo disponible desde localStorage 'registros'
function getSaldoFromRegistros() {
    const raw = localStorage.getItem('registros');
    const registros = raw ? JSON.parse(raw) : [];
    const total = registros.reduce((acc, r) => r.tipo === 'Ingreso' ? acc + Number(r.monto) : acc - Number(r.monto), 0);
    return total;
}

// Devuelve saldo disponible en el mes actual (ingresos - gastos del mes)
function getSaldoMensual(yearMonth) {
    const raw = localStorage.getItem('registros');
    const registros = raw ? JSON.parse(raw) : [];
    const now = new Date();
    const ym = yearMonth || `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
    const total = registros.reduce((acc, r) => {
        if (!r.fecha) return acc;
        if (!r.fecha.startsWith(ym)) return acc;
        return r.tipo === 'Ingreso' ? acc + Number(r.monto) : acc - Number(r.monto);
    }, 0);
    return total;
}

function crearGastoRegistro(monto, metaNombre) {
    const raw = localStorage.getItem('registros');
    const registros = raw ? JSON.parse(raw) : [];
    const hoy = new Date().toISOString().split('T')[0];
    const gasto = {
        tipo: 'Gasto',
        monto: Number(monto),
        periodo: 'Mensual',
        categoria: `Contribución: ${metaNombre}`,
        descripcion: `Aporte a meta ${metaNombre}`,
        fecha: hoy
    };
    registros.push(gasto);
    localStorage.setItem('registros', JSON.stringify(registros));
}

// crear registro de ahorro (no gasto) para historial
function crearAhorroRegistro(monto, metaNombre, fecha) {
    const raw = localStorage.getItem('registros');
    const registros = raw ? JSON.parse(raw) : [];
    const dia = fecha ? fecha : new Date().toISOString().split('T')[0];
    const ahorro = {
        tipo: 'Ahorro',
        monto: Number(monto),
        periodo: 'Mensual',
        categoria: `Ahorro: ${metaNombre}`,
        descripcion: `Ahorro a meta ${metaNombre}`,
        fecha: dia
    };
    registros.push(ahorro);
    localStorage.setItem('registros', JSON.stringify(registros));
}

function crearMeta(nombre, objetivo) {
    const metas = getMetas();
    const nueva = {
        id: uid(),
        nombre: nombre,
        objetivo: Number(objetivo),
        tipo: document.getElementById('metaTipo') ? document.getElementById('metaTipo').value : 'general',
        periodos: document.getElementById('metaPeriodos') ? Number(document.getElementById('metaPeriodos').value) || 0 : 0,
        contribucion: document.getElementById('metaContribucion') ? document.getElementById('metaContribucion').value : 'voluntaria',
        nextContribution: document.getElementById('metaProxima') ? document.getElementById('metaProxima').value || '' : '',
        actual: 0,
        creada: new Date().toISOString()
    };
    metas.push(nueva);
    saveMetas(metas);
    renderMetas();
}

function eliminarMeta(id) {
    let metas = getMetas();
    metas = metas.filter(m => m.id !== id);
    saveMetas(metas);
    renderMetas();
}

let metaToDeleteId = null;

function editarMeta(id, nombre, objetivo) {
    const metas = getMetas();
    const m = metas.find(x => x.id === id);
    if (!m) return;
    m.nombre = nombre;
    m.objetivo = Number(objetivo);
    // mantener tipo/periodos/contribucion si existen en los inputs de editar
    const tipoEl = document.getElementById('editarMetaTipo');
    const periodosEl = document.getElementById('editarMetaPeriodos');
    const contribEl = document.getElementById('editarMetaContribucion');
    if (tipoEl) m.tipo = tipoEl.value;
    if (periodosEl) m.periodos = Number(periodosEl.value) || 0;
    if (contribEl) m.contribucion = contribEl.value;
    const proximaEl = document.getElementById('editarMetaProxima');
    if (proximaEl) m.nextContribution = proximaEl.value || '';
    if (m.actual > m.objetivo) m.actual = m.objetivo; // limitar
    saveMetas(metas);
    renderMetas();
}

function aportarMeta(id, monto) {
    const metas = getMetas();
    const m = metas.find(x => x.id === id);
    if (!m) return false;
    m.actual = Number(m.actual) + Number(monto);
    if (m.actual > m.objetivo) m.actual = m.objetivo;
    saveMetas(metas);
    renderMetas();
    return true;
}

function renderMetas() {
    const cont = document.getElementById('listaMetas');
    if (!cont) return;
    const metas = getMetas();
    cont.innerHTML = '';
    if (metas.length === 0) {
        cont.innerHTML = `
            <div class="col-12">
                <div class="mi-tarjeta p-4 text-center">No hay metas registradas. Cree una nueva meta usando el formulario.</div>
            </div>
        `;
        return;
    }

    metas.forEach(meta => {
        const porcentaje = Math.round((meta.actual / meta.objetivo) * 100) || 0;
    // aporte fijo por periodo: objetivo / periodos (redondeado)
    const aportePorPeriodo = (meta.tipo === 'tiempo' && meta.periodos && meta.periodos > 0) ? Math.round(meta.objetivo / meta.periodos) : 0;
    const saldoMensual = getSaldoMensual();
    const aporteAsequible = aportePorPeriodo > 0 ? (saldoMensual >= aportePorPeriodo) : false;
        const col = document.createElement('div');
        col.className = 'col-12 col-md-6 col-lg-4 d-flex';
        col.innerHTML = `
            <div class="meta-card w-100">
                <div class="meta-header">
                    <div>
                        <div class="meta-title">${escapeHtml(meta.nombre)}</div>
                        <div class="small text-muted">Objetivo: $${numberWithCommas(meta.objetivo)}</div>
                        ${meta.tipo === 'tiempo' ? `<div class="small text-muted">Periodos: ${meta.periodos} • Aporte/periodo: $${numberWithCommas(Math.round(aportePorPeriodo))} (fijo) ${meta.contribucion === 'automatica' ? (aporteAsequible ? `<span class="text-success">• Asequible este mes</span>` : `<span class="text-danger">• Saldo insuficiente</span>`) : ''}${meta.nextContribution ? ` <div class="small text-muted">Próxima: ${escapeHtml(meta.nextContribution)}</div>` : ''}</div>` : ''}
                    </div>
                    <div class="text-end">
                        <div class="meta-amount">$${numberWithCommas(meta.actual)}</div>
                        <div class="small text-muted">${porcentaje}%</div>
                    </div>
                </div>
                <div>
                    <div class="meta-progress my-3">
                        <div class="fill" style="width: ${Math.min(porcentaje,100)}%"></div>
                    </div>
                    <div class="d-flex justify-content-between align-items-center">
                        <div class="meta-actions">
                            <button class="btn btn-sm btn-outline-secondary btn-editar" data-id="${meta.id}">Editar</button>
                            <button class="btn btn-sm btn-outline-danger btn-eliminar" data-id="${meta.id}">Eliminar</button>
                        </div>
                        <div>
                            ${meta.contribucion === 'automatica' && aportePorPeriodo > 0 ? `<button class="btn btn-sm btn-success btn-auto" data-id="${meta.id}" title="Aportar automático">Aportar $${numberWithCommas(Math.round(aportePorPeriodo))}</button>` : `<button class="btn btn-sm btn-gold btn-contribuir" data-id="${meta.id}">Contribuir</button>`}
                        </div>
                    </div>
                </div>
            </div>
        `;
        cont.appendChild(col);
    });

    // enlazar eventos
    document.querySelectorAll('.btn-eliminar').forEach(b => b.addEventListener('click', e => {
        const id = e.currentTarget.getAttribute('data-id');
        if (!id) return;
        const m = getMetas().find(x => x.id === id);
        // Use SweetAlert2 to confirm deletion (same style as registro.js)
        Swal.fire({
            title: '¿Eliminar esta meta?',
            text: `Esta acción no se puede deshacer.\n\n¿Eliminar la meta "${m ? m.nombre : ''}"?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#999',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar'
        }).then(result => {
            if (result.isConfirmed) {
                eliminarMeta(id);
                Swal.fire('Eliminado', 'La meta ha sido eliminada.', 'success');
            }
        });
    }));

    document.querySelectorAll('.btn-aportar').forEach(b => b.addEventListener('click', e => {
        const id = e.currentTarget.getAttribute('data-id');
        if (!id) return;
        const m = getMetas().find(x => x.id === id);
        Swal.fire({
            title: '¿Eliminar esta meta?',
            text: `Esta acción no se puede deshacer.\n\n¿Eliminar la meta "${m ? m.nombre : ''}"?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#999',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar'
        }).then(result => {
            if (result.isConfirmed) {
                eliminarMeta(id);
                Swal.fire('Eliminado', 'La meta ha sido eliminada.', 'success');
            }
        });
    }));

    document.querySelectorAll('.btn-editar').forEach(b => b.addEventListener('click', e => {
        const id = e.currentTarget.getAttribute('data-id');
        if (!id) return;
        const metas = getMetas();
        const m = metas.find(x => x.id === id);
        if (!m) return;
        (document.getElementById('editarMetaId')).value = m.id;
        (document.getElementById('editarMetaNombre')).value = m.nombre;
        (document.getElementById('editarMetaObjetivo')).value = m.objetivo;
        // rellenar tipo/periodos/contribucion
        const tipoEl = document.getElementById('editarMetaTipo');
        const periodosEl = document.getElementById('editarMetaPeriodos');
        const contribEl = document.getElementById('editarMetaContribucion');
        if (tipoEl) tipoEl.value = m.tipo || 'general';
        if (periodosEl) periodosEl.value = m.periodos || '';
        if (contribEl) contribEl.value = m.contribucion || 'voluntaria';
        // mostrar/ocultar wrapper
        const perWrap = document.getElementById('editarMetaPeriodosWrapper');
        if (perWrap) perWrap.style.display = (m.tipo === 'tiempo') ? 'block' : 'none';
        const modal = new bootstrap.Modal(document.getElementById('modalEditarMeta'));
        modal.show();
    }));

    document.querySelectorAll('.btn-contribuir').forEach(b => b.addEventListener('click', e => {
        const id = e.currentTarget.getAttribute('data-id');
        if (!id) return;
        (document.getElementById('contribuirId')).value = id;
        (document.getElementById('contribuirMonto')).value = '';
        const modal = new bootstrap.Modal(document.getElementById('modalContribuir'));
        modal.show();
    }));

    // (eliminación ahora usa SweetAlert2; el modal Bootstrap `modalEliminarMeta` ya no se usa)

    // auto contribute buttons
    document.querySelectorAll('.btn-auto').forEach(b => b.addEventListener('click', e => {
        const id = e.currentTarget.getAttribute('data-id');
        if (!id) return;
        const metas = getMetas();
        const m = metas.find(x => x.id === id);
        if (!m) return;
        // pago fijo por periodo (no disminuye): objetivo / periodos redondeado
        const fijo = (m.tipo === 'tiempo' && m.periodos && m.periodos > 0) ? Math.round(m.objetivo / m.periodos) : 0;
    if (fijo <= 0) { Swal.fire('Sin aporte', 'No hay aporte definido para esta meta.', 'info'); return; }
        // si lo que queda es menor que el fijo, aportamos solo lo que falta
        const restante = Math.max(0, m.objetivo - m.actual);
        const aporte = Math.min(fijo, restante);
        const saldoMensualActual = getSaldoMensual();
    if (saldoMensualActual < aporte) { Swal.fire('Saldo insuficiente', 'Saldo mensual insuficiente para esta contribución automática.', 'error'); return; }
        Swal.fire({
            title: '¿Confirmar aporte automático?',
            html: `¿Confirmar aporte automático de <strong>$${numberWithCommas(aporte)}</strong> a '<strong>${escapeHtml(m.nombre)}</strong>'?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#999',
            confirmButtonText: 'Sí, aportar',
            cancelButtonText: 'Cancelar'
        }).then(result => {
            if (result.isConfirmed) {
                // crear registro de ahorro y aplicar aporte
                crearAhorroRegistro(aporte, m.nombre);
                aportarMeta(id, aporte);
                // avanzar próxima contribución si existe
                const metasAll = getMetas();
                const metaIdx = metasAll.findIndex(x => x.id === id);
                if (metaIdx !== -1 && metasAll[metaIdx].nextContribution) {
                    const cur = new Date(metasAll[metaIdx].nextContribution);
                    if (!isNaN(cur)) {
                        cur.setMonth(cur.getMonth() + 1);
                        metasAll[metaIdx].nextContribution = cur.toISOString().split('T')[0];
                        saveMetas(metasAll);
                    }
                }
                Swal.fire({
                    icon: 'success',
                    title: 'Aportado',
                    text: 'La contribución se registró correctamente.',
                    timer: 1400,
                    showConfirmButton: false
                });
            }
        });
    }));
}

// helpers
function numberWithCommas(x) {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function escapeHtml(unsafe) {
    return String(unsafe)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Eventos DOM
window.addEventListener('DOMContentLoaded', () => {
    renderMetas();

    const formMeta = document.getElementById('formMeta');
    formMeta && formMeta.addEventListener('submit', e => {
        e.preventDefault();
        const nombre = document.getElementById('metaNombre').value.trim();
        const objetivo = document.getElementById('metaObjetivo').value;
        if (!nombre || !objetivo) return;
        crearMeta(nombre, objetivo);
        formMeta.reset();
    });

    // mostrar/ocultar periodos en nuevo
    const tipoNuevo = document.getElementById('metaTipo');
    const wrapperNuevo = document.getElementById('metaPeriodosWrapper');
    if (tipoNuevo && wrapperNuevo) {
        tipoNuevo.addEventListener('change', () => {
            wrapperNuevo.style.display = (tipoNuevo.value === 'tiempo') ? 'block' : 'none';
        });
    }

    // toggle contribucion wrapper for nuevo
    const contribNuevo = document.getElementById('metaContribucion');
    const contribNuevoWrap = document.getElementById('metaContribucionWrapper');
    function actualizarContribucionNuevo() {
        if (!contribNuevo || !contribNuevoWrap) return;
        if (tipoNuevo.value === 'general') {
            contribNuevoWrap.style.display = 'none';
            contribNuevo.value = 'voluntaria';
        } else {
            contribNuevoWrap.style.display = '';
        }
    }
    if (tipoNuevo) tipoNuevo.addEventListener('change', actualizarContribucionNuevo);
    actualizarContribucionNuevo();

    // mostrar/ocultar periodos en editar
    const tipoEditar = document.getElementById('editarMetaTipo');
    const wrapperEditar = document.getElementById('editarMetaPeriodosWrapper');
    if (tipoEditar && wrapperEditar) {
        tipoEditar.addEventListener('change', () => {
            wrapperEditar.style.display = (tipoEditar.value === 'tiempo') ? 'block' : 'none';
        });
    }

        /* Calculadora: Normal y Avanzada */
        const calcModoNormal = document.getElementById('calcModoNormal');
        const calcModoAvanzada = document.getElementById('calcModoAvanzada');
        const calcNormalCont = document.getElementById('calcNormal');
        const calcAvanzadaCont = document.getElementById('calcAvanzada');
        if (calcModoNormal && calcModoAvanzada && calcNormalCont && calcAvanzadaCont) {
            calcModoNormal.addEventListener('click', () => {
                calcModoNormal.classList.add('active');
                calcModoAvanzada.classList.remove('active');
                calcNormalCont.style.display = '';
                calcAvanzadaCont.style.display = 'none';
                // also update styling for btn-login variants
                calcModoNormal.classList.add('active');
                calcModoAvanzada.classList.remove('active');
            });
            calcModoAvanzada.addEventListener('click', () => {
                calcModoAvanzada.classList.add('active');
                calcModoNormal.classList.remove('active');
                calcNormalCont.style.display = 'none';
                calcAvanzadaCont.style.display = '';
                // also update styling for btn-login variants
                calcModoAvanzada.classList.add('active');
                calcModoNormal.classList.remove('active');
            });
        }

        // Normal calculator logic
        const calcPantalla = document.getElementById('calcPantalla');
        if (calcPantalla) {
            let expr = '';
            function actualizarPantalla() { calcPantalla.value = expr || '0'; }
            document.querySelectorAll('.calculadora-normal .calc-btn:not(#calcEquals)').forEach(b => b.addEventListener('click', e => {
                expr += e.currentTarget.textContent.trim();
                actualizarPantalla();
            }));
            document.querySelectorAll('.calculadora-normal .calc-op').forEach(b => b.addEventListener('click', e => {
                const op = e.currentTarget.textContent.trim();
                if (!expr) return;
                const last = expr.slice(-1);
                if ('+-*/'.includes(last)) expr = expr.slice(0, -1) + op; else expr += op;
                actualizarPantalla();
            }));
            const calcClear = document.getElementById('calcClear');
            calcClear && calcClear.addEventListener('click', () => { expr = ''; actualizarPantalla(); });
            const calcEquals = document.getElementById('calcEquals');
            calcEquals && calcEquals.addEventListener('click', () => {
                try {
                    // Use safe eval via Function
                    const res = Function(`"use strict";return (${expr || '0'})`)();
                    expr = String(res);
                    actualizarPantalla();
                } catch (err) {
                    calcPantalla.value = 'Error';
                    expr = '';
                }
            });
        }

        // Advanced calculator: monthly payment
        const avCalcular = document.getElementById('avCalcular');
        if (avCalcular) {
            avCalcular.addEventListener('click', () => {
                const monto = Number(document.getElementById('avMonto').value) || 0;
                const interes = Number(document.getElementById('avInteres').value) || 0;
                const meses = Number(document.getElementById('avMeses').value) || 0;
                const resultadoEl = document.getElementById('avResultado');
                if (!monto || meses <= 0) { resultadoEl.textContent = 'Resultado: complete monto y meses válidos.'; return; }
                const i = interes / 100; // monthly interest decimal
                let pago = 0;
                if (i === 0) {
                    pago = monto / meses;
                } else {
                    // fórmula de cuota: P * (i*(1+i)^n) / ((1+i)^n -1)
                    const factor = Math.pow(1 + i, meses);
                    pago = monto * (i * factor) / (factor - 1);
                }
                resultadoEl.textContent = `Resultado: Pago mensual aproximado $${numberWithCommas(pago.toFixed(2))}`;
                // add highlight effect briefly
                resultadoEl.classList.add('highlight');
                setTimeout(() => resultadoEl.classList.remove('highlight'), 1400);
            });
        }

    // toggle contribucion wrapper for editar
    const contribEditar = document.getElementById('editarMetaContribucion');
    const contribEditarWrap = document.getElementById('editarMetaContribucionWrapper');
    function actualizarContribucionEditar() {
        if (!contribEditar || !contribEditarWrap || !tipoEditar) return;
        if (tipoEditar.value === 'general') {
            contribEditarWrap.style.display = 'none';
            contribEditar.value = 'voluntaria';
        } else {
            contribEditarWrap.style.display = '';
        }
    }
    if (tipoEditar) tipoEditar.addEventListener('change', actualizarContribucionEditar);
    actualizarContribucionEditar();

    const formContribuir = document.getElementById('formContribuir');
    formContribuir && formContribuir.addEventListener('submit', e => {
        e.preventDefault();
        const id = document.getElementById('contribuirId').value;
        const monto = Number(document.getElementById('contribuirMonto').value);
        if (!id || !monto) return;
    const saldo = getSaldoFromRegistros();
    if (saldo < monto) { Swal.fire('Saldo insuficiente', 'Saldo insuficiente en registros para realizar la contribución.', 'error'); return; }
        // crear registro de gasto antes de aportar
        const metas = getMetas();
        const m = metas.find(x => x.id === id);
    crearAhorroRegistro(monto, m ? m.nombre : 'Meta');
        const ok = aportarMeta(id, monto);
        if (ok) {
            const modalEl = document.getElementById('modalContribuir');
            const modal = bootstrap.Modal.getInstance(modalEl);
            modal && modal.hide();
        }
        formContribuir.reset();
    });

    const formEditar = document.getElementById('formEditarMeta');
    formEditar && formEditar.addEventListener('submit', e => {
        e.preventDefault();
        const id = document.getElementById('editarMetaId').value;
        const nombre = document.getElementById('editarMetaNombre').value.trim();
        const objetivo = document.getElementById('editarMetaObjetivo').value;
        if (!id || !nombre || !objetivo) return;
        editarMeta(id, nombre, objetivo);
        const modalEl = document.getElementById('modalEditarMeta');
        const modal = bootstrap.Modal.getInstance(modalEl);
        modal && modal.hide();
    });

    const btnNueva = document.getElementById('btnNuevaMeta');
    btnNueva && btnNueva.addEventListener('click', () => {
        // abrir modal de contribucion si hay metas, sino enfocar crear
        const metas = getMetas();
        if (metas.length === 0) {
            document.getElementById('metaNombre').focus();
            window.scrollTo({ top: document.getElementById('formMeta').offsetTop - 60, behavior: 'smooth' });
            return;
        }
        // si hay metas, abrir modal para seleccionar meta via prompt simple
        const opciones = metas.map((m, i) => `${i + 1}. ${m.nombre} ($${numberWithCommas(m.actual)}/${numberWithCommas(m.objetivo)})`).join('\n');
        const sel = prompt('Seleccione la meta por número para contribuir:\n\n' + opciones);
        if (!sel) return;
        const idx = parseInt(sel, 10) - 1;
    if (isNaN(idx) || idx < 0 || idx >= metas.length) { Swal.fire('Selección inválida', 'Por favor seleccione un número válido de la lista.', 'error'); return; }
        const monto = prompt('Monto a aportar ($):');
    if (!monto) return;
    if (isNaN(Number(monto)) || Number(monto) <= 0) { Swal.fire('Monto inválido', 'Introduce un monto válido mayor que 0.', 'error'); return; }
        const montoNum = Number(monto);
        const saldo = getSaldoFromRegistros();
    if (saldo < montoNum) { Swal.fire('Saldo insuficiente', 'Saldo insuficiente en registros para realizar la contribución.', 'error'); return; }
        // crear registro de gasto y aportar
    crearAhorroRegistro(montoNum, metas[idx].nombre);
        aportarMeta(metas[idx].id, montoNum);
    });
});
