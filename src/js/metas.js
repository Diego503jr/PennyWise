const currentUser = JSON.parse(localStorage.getItem('currentUser'));
if (!currentUser) window.location.href = "./index.html";
const USER_KEY = (currentUser.username || currentUser.email || currentUser.id || 'guest').toString();
const metasStorageKey = () => `metas_${USER_KEY}`;
const provisionesStorageKey = () => `provisiones_${USER_KEY}`;
const getRegistros = () => { try { const raw = localStorage.getItem(`registros_${currentUser.email}`); return raw ? JSON.parse(raw) : []; } catch (e) { return []; } };
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const getMetas = () => { const raw = localStorage.getItem(metasStorageKey()); return raw ? JSON.parse(raw) : []; };
const saveMetas = metas => localStorage.setItem(metasStorageKey(), JSON.stringify(metas));


// --- Helpers asíncronos (simulan llamadas de red)
const simulateNetwork = (v, d = 220) => new Promise(r => setTimeout(() => r(v), d));
const getMetasAsync = async () => simulateNetwork(JSON.parse(localStorage.getItem(metasStorageKey()) || '[]'));
const saveMetasAsync = async m => { localStorage.setItem(metasStorageKey(), JSON.stringify(m)); return simulateNetwork(true, 120) };
const getRegistrosAsync = async () => simulateNetwork(JSON.parse(localStorage.getItem(`registros_${currentUser.email}`) || '[]'), 140);

// Crear nueva meta y registrar evento de creación en su historial
async function crearMeta(nombre, objetivo) {
    const metas = await getMetasAsync();
    const nueva = {
        id: uid(),
        nombre: nombre,
        objetivo: Number(objetivo),
        tipo: document.getElementById('metaTipo') ? document.getElementById('metaTipo').value : 'tiempo',
        periodos: document.getElementById('metaPeriodos') ? Number(document.getElementById('metaPeriodos').value) || 0 : 0,
        contribucion: document.getElementById('metaContribucion') ? document.getElementById('metaContribucion').value : 'voluntaria',
        // Si el campo de próxima contribución está vacío (porque el input es disabled y reset() lo limpió),
        // usamos la fecha de hoy como valor por defecto para asegurar que la nueva meta tenga fecha.
        nextContribution: (function () {
            const el = document.getElementById('metaProxima');
            const hoy = new Date().toISOString().split('T')[0];
            return el && el.value ? el.value : hoy;
        })(),
        actual: 0,
        creada: new Date().toISOString(),
        history: [{ action: 'creada', amount: 0, date: new Date().toISOString() }],
        montoMensual: 0
    };
    // calcular monto mensual si hay periodos
    nueva.montoMensual = nueva.periodos && nueva.periodos > 0 ? Math.round(nueva.objetivo / nueva.periodos) : 0;
    metas.push(nueva);
    await saveMetasAsync(metas);
    await renderMetas();
    renderHistorialMetas();
    return nueva.id;
}

async function eliminarMeta(id) {
    let metas = await getMetasAsync();
    metas = metas.filter(m => m.id !== id);
    await saveMetasAsync(metas);
    await renderMetas();
    renderHistorialMetas();
}

async function editarMeta(id, nombre, objetivo) {
    const metas = await getMetasAsync();
    const m = metas.find(x => x.id === id);
    if (!m) return false;
    m.nombre = nombre;
    m.objetivo = Number(objetivo);
    const tipoEl = document.getElementById('editarMetaTipo');
    const periodosEl = document.getElementById('editarMetaPeriodos');
    const contribEl = document.getElementById('editarMetaContribucion');
    const proximaEl = document.getElementById('editarMetaProxima');
    if (tipoEl) m.tipo = tipoEl.value;
    if (periodosEl) m.periodos = Number(periodosEl.value) || 0;
    if (contribEl) m.contribucion = contribEl.value;
    if (proximaEl) m.nextContribution = proximaEl.value || '';
    if (m.actual > m.objetivo) m.actual = m.objetivo;
    // recalcular monto mensual
    m.montoMensual = m.periodos && m.periodos > 0 ? Math.round(m.objetivo / m.periodos) : 0;
    await saveMetasAsync(metas);
    await renderMetas();
    renderHistorialMetas();
    return true;
}

// Helper de registros: obtener el total de provisiones desde 'registros_<email>'
function getSaldoFromRegistros() {
    // suma de montos de registros cuya categoría indica provisión o gasto fijo
    const registros = getRegistros();
    const pattern = /provisi(?:o|ó)nes?|gasto\s*fijo|gasto_fijo/i;
    const base = registros.reduce((acc, r) => {
        if (!r || !r.categoria) return acc;
        if (pattern.test(String(r.categoria))) return acc + Number(r.monto || 0);
        return acc;
    }, 0);
    // Restar las contribuciones realizadas desde las Metas (persistidas en metas_<user>)
    let aportes = 0;
    try {
        const metas = getMetas();
        if (Array.isArray(metas)) {
            metas.forEach(m => {
                if (!Array.isArray(m.history)) return;
                m.history.forEach(h => { if (h && h.action === 'aporte') aportes += Number(h.amount || 0); });
            });
        }
    } catch (e) { aportes = 0; }
    const total = Math.max(0, base - aportes);
    // guardar en cache local para uso por Metas
    try { localStorage.setItem(provisionesStorageKey(), JSON.stringify({ total, updatedAt: new Date().toISOString() })); } catch (e) { }
    return total;
}

async function getSaldoFromRegistrosAsync() {
    const registros = await getRegistrosAsync();
    const pattern = /provisi(?:o|ó)nes?|gasto\s*fijo|gasto_fijo/i;
    const base = registros.reduce((acc, r) => {
        if (!r || !r.categoria) return acc;
        if (pattern.test(String(r.categoria))) return acc + Number(r.monto || 0);
        return acc;
    }, 0);
    // restar aportes desde metas persistidas
    let aportes = 0;
    try {
        const metas = await getMetasAsync();
        if (Array.isArray(metas)) {
            metas.forEach(m => {
                if (!Array.isArray(m.history)) return;
                m.history.forEach(h => { if (h && h.action === 'aporte') aportes += Number(h.amount || 0); });
            });
        }
    } catch (e) { aportes = 0; }
    const total = Math.max(0, base - aportes);
    try {
        localStorage.setItem(provisionesStorageKey(), JSON.stringify({ total, updatedAt: new Date().toISOString() }));
    } catch (e) { }
    return await simulateNetwork(total, 120);
}

// Devuelve saldo disponible en el mes actual (ingresos - gastos del mes)

function getProvisionesCached() {
    try {
        const raw = localStorage.getItem(provisionesStorageKey());
        const p = raw ? JSON.parse(raw) : null;
        return p && typeof p.total !== 'undefined' ? Number(p.total) : getSaldoFromRegistros();
    } catch (e) { return 0; }
}

async function getProvisionesCachedAsync() {
    try {
        const raw = localStorage.getItem(provisionesStorageKey());
        const p = raw ? JSON.parse(raw) : null;
        const total = p && typeof p.total !== 'undefined' ? Number(p.total) : await getSaldoFromRegistrosAsync();
        return await simulateNetwork(total, 80);
    } catch (e) { return 0; }
}

const _regKey = `registros_${currentUser.email}`;
let _lastRegRaw = localStorage.getItem(_regKey) || '';

async function updateProvisionesDisplayAsync() {
    const el = document.getElementById('saldoProvisionesDisplay');
    if (!el) return;
    try {
        const total = await getProvisionesCachedAsync();
        el.textContent = `$${numberWithCommas(Math.round(total || 0))}`;
    } catch (e) { el.textContent = '$0'; }
}


async function aportarMeta(id, monto) {
    const metas = await getMetasAsync();
    const m = metas.find(x => x.id === id);
    if (!m) return false;

    // Calcular el monto real que se puede aportar
    const restante = Math.max(0, m.objetivo - m.actual);
    const montoReal = Math.min(Number(monto), restante);

    m.actual = Number(m.actual) + montoReal;
    if (m.actual > m.objetivo) m.actual = m.objetivo;

    // registrar en el historial con el monto REAL aportado
    if (!Array.isArray(m.history)) m.history = [];
    m.history.push({ action: 'aporte', amount: montoReal, date: new Date().toISOString() });
    await saveMetasAsync(metas);

    // Reducir provisiones solo con el monto REAL aportado
    try {
        const key = provisionesStorageKey();
        const raw = localStorage.getItem(key);
        const parsed = raw ? JSON.parse(raw) : { total: getSaldoFromRegistros() };
        const current = Number(parsed.total || 0);
        const nuevo = Math.max(0, current - montoReal);  // ⚠️ Usar montoReal en vez de monto
        parsed.total = nuevo;
        parsed.updatedAt = new Date().toISOString();
        localStorage.setItem(key, JSON.stringify(parsed));
    } catch (e) {
        // error handling
    }

    await renderMetas();
    renderHistorialMetas();
    await updateProvisionesDisplayAsync();
    return true;
}

function updateProvisionesDisplay() {
    const el = document.getElementById('saldoProvisionesDisplay');
    if (!el) return;
    try {
        const raw = localStorage.getItem(provisionesStorageKey());
        const parsed = raw ? JSON.parse(raw) : null;
        let total = parsed && typeof parsed.total !== 'undefined' ? Number(parsed.total) : getSaldoFromRegistros();
        if (isNaN(total)) total = 0;
        el.textContent = `$${numberWithCommas(Math.round(total))}`;
    } catch (e) {
        el.textContent = '$0';
    }
}

const renderHistorialMetas = () => {
    const tb = document.getElementById('tablaHistorialMetas'); if (!tb) return;
    const filas = []; getMetas().forEach(m => { if (!Array.isArray(m.history)) return; m.history.slice().reverse().forEach(h => { const acc = escapeHtml(h.action || '-'); const mon = h.amount ? `$${numberWithCommas(h.amount)}` : '-'; const tipo = `${escapeHtml(m.tipo || '-')} / ${mon}`; const fecha = h.date ? escapeHtml((new Date(h.date)).toLocaleString()) : '-'; filas.push(`<tr><td>${escapeHtml(m.nombre)}</td><td>${tipo}</td><td>${acc}</td><td>${fecha}</td></tr>`); }); }); tb.innerHTML = filas.join('\n') || '<tr><td colspan="4">Sin historial</td></tr>'
};
// renderMetas: dibuja la tabla de metas en #tablaMetas y enlaza eventos
async function renderMetas() {
    const tbody = document.getElementById('tablaMetas');
    const emptyEl = document.getElementById('listaMetasEmpty');
    const metas = await getMetasAsync();
    if (!tbody) {
        console.warn('tablaMetas no encontrada, renderizado omitido');
        return;
    }
    if (!metas || metas.length === 0) {
        tbody.innerHTML = '';
        if (emptyEl) emptyEl.classList.remove('d-none');
        return;
    }
    if (emptyEl) emptyEl.classList.add('d-none');

    const rows = metas.map(meta => {
        const porcentaje = Math.round((meta.actual / meta.objetivo) * 100) || 0;
        const aportePorPeriodo = (meta.tipo === 'tiempo' && meta.periodos && meta.periodos > 0) ? Math.round(meta.objetivo / meta.periodos) : 0;

        // (se consulta en bloque posterior para evitar await en map)
        const aporteLabel = aportePorPeriodo > 0 ? `$${numberWithCommas(Math.round(aportePorPeriodo))}` : '-';
        const proxima = meta.nextContribution ? escapeHtml(meta.nextContribution) : '-';
        // Usar el mismo diseño que Presupuesto: barra más alta y mostrar % solo si es >10
        const progresoBar = `<div class="progress" style="height:25px"><div class="progress-bar bg-success" role="progressbar" style="width: ${Math.min(porcentaje, 100)}%" aria-valuenow="${porcentaje}" aria-valuemin="0" aria-valuemax="100">${porcentaje > 10 ? porcentaje + '%' : ''}</div></div>`;
        const metaCompletada = meta.actual >= meta.objetivo;

        const acciones = [];
        acciones.push(`<button class="btn btn-sm btn-outline-secondary btn-editar" data-id="${meta.id}" title="Editar"><i class="bi bi-pencil"></i><span class="d-none d-sm-inline ms-1">Editar</span></button>`);
        acciones.push(`<button class="btn btn-sm btn-outline-danger btn-eliminar" data-id="${meta.id}" title="Eliminar"><i class="bi bi-trash"></i><span class="d-none d-sm-inline ms-1">Eliminar</span></button>`);

        // Si la meta está completada, mostrar botón "Completado" deshabilitado
        if (metaCompletada) {
            acciones.push(`<button class="btn btn-sm btn-success" disabled title="Meta completada"><i class="bi bi-check-circle-fill"></i><span class="d-none d-sm-inline ms-1">Completado</span></button>`);
        } else {
            // Si NO está completada, mostrar botones de contribución normales
            if (meta.contribucion === 'automatica' && aportePorPeriodo > 0) {
                acciones.push(`<button class="btn btn-sm btn-auto" data-id="${meta.id}" title="Aportar automático"><i class="bi bi-arrow-repeat"></i><span class="d-none d-sm-inline ms-1">Aportar ${numberWithCommas(Math.round(aportePorPeriodo))}</span></button>`);
            } else {
                acciones.push(`<button class="btn btn-sm btn-gold btn-contribuir" data-id="${meta.id}" title="Contribuir"><i class="bi bi-plus-lg"></i><span class="d-none d-sm-inline ms-1">Contribuir</span></button>`);
            }
        }
        return `
            <tr>
                <td>${escapeHtml(meta.nombre)}</td>
                <td>$${numberWithCommas(meta.objetivo)}</td>
                <td>${meta.tipo === 'tiempo' ? (meta.periodos || '-') : '-'}</td>
                <td>${aporteLabel}</td>
                <td>${proxima}</td>
                <td>$${numberWithCommas(meta.actual)}</td>
                <td>${progresoBar}</td>
                <td class="tabla-acciones d-flex gap-2">${acciones.join(' ')}</td>
            </tr>
        `;
    }).join('\n');

    tbody.innerHTML = rows;

    // enlazar eventos
    document.querySelectorAll('.btn-eliminar').forEach(b => b.addEventListener('click', async e => {
        const id = e.currentTarget.getAttribute('data-id');
        if (!id) return;
        const metasAll = await getMetasAsync();
        const m = metasAll.find(x => x.id === id);
        const res = await Swal.fire({
            title: '¿Eliminar esta meta?',
            text: `Esta acción no se puede deshacer.\n\n¿Eliminar la meta "${m ? m.nombre : ''}"?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#999',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar'
        });
        if (res.isConfirmed) {
            await eliminarMeta(id);
            Swal.fire('Eliminado', 'La meta ha sido eliminada.', 'success');
        }
    }));
    document.querySelectorAll('.btn-editar').forEach(b => b.addEventListener('click', async e => {
        const id = e.currentTarget.getAttribute('data-id');
        if (!id) return;
        const metasAll = await getMetasAsync();
        const m = metasAll.find(x => x.id === id);
        if (!m) return;
        (document.getElementById('editarMetaId')).value = m.id;
        (document.getElementById('editarMetaNombre')).value = m.nombre;
        (document.getElementById('editarMetaObjetivo')).value = m.objetivo;
        const tipoEl = document.getElementById('editarMetaTipo');
        const periodosEl = document.getElementById('editarMetaPeriodos');
        const contribEl = document.getElementById('editarMetaContribucion');
        const proximaEl = document.getElementById('editarMetaProxima');
        if (tipoEl) tipoEl.value = m.tipo || 'tiempo';
        if (periodosEl) periodosEl.value = m.periodos || '';
        if (contribEl) contribEl.value = m.contribucion || 'voluntaria';
        if (proximaEl) proximaEl.value = m.nextContribution || '';
        new bootstrap.Modal(document.getElementById('modalEditarMeta')).show();
    }));

    document.querySelectorAll('.btn-contribuir').forEach(b => b.addEventListener('click', e => {
        const id = e.currentTarget.getAttribute('data-id');
        if (!id) return;
        (document.getElementById('contribuirId')).value = id;
        const input = document.getElementById('contribuirMonto');
        if (input) input.value = '';
        new bootstrap.Modal(document.getElementById('modalContribuir')).show();
    }));

    document.querySelectorAll('.btn-auto').forEach(b => b.addEventListener('click', async e => {
        const id = e.currentTarget.getAttribute('data-id');
        if (!id) return;
        const metasAll = await getMetasAsync();
        const m = metasAll.find(x => x.id === id);
        if (!m) return;
        const fijo = (m.tipo === 'tiempo' && m.periodos && m.periodos > 0) ? Math.round(m.objetivo / m.periodos) : 0;
        if (fijo <= 0) { Swal.fire('Sin aporte', 'No hay aporte definido para esta meta.', 'info'); return; }
        const restante = Math.max(0, m.objetivo - m.actual);
        const aporte = Math.min(fijo, restante);
        const provisiones = await getProvisionesCachedAsync();
        if (provisiones < aporte) { Swal.fire('Saldo insuficiente', 'Provisiones insuficientes para esta contribución automática.', 'error'); return; }
        const result = await Swal.fire({
            title: '¿Confirmar aporte automático?',
            html: `¿Confirmar aporte automático de <strong>$${numberWithCommas(aporte)}</strong> a '<strong>${escapeHtml(m.nombre)}</strong>'?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#999',
            confirmButtonText: 'Sí, aportar',
            cancelButtonText: 'Cancelar'
        });
        if (result.isConfirmed) {
            await aportarMeta(id, aporte);
            const metasNow = await getMetasAsync();
            const metaIdx = metasNow.findIndex(x => x.id === id);
            if (metaIdx !== -1 && metasNow[metaIdx].nextContribution) {
                const cur = new Date(metasNow[metaIdx].nextContribution);
                if (!isNaN(cur)) {
                    cur.setMonth(cur.getMonth() + 1);
                    metasNow[metaIdx].nextContribution = cur.toISOString().split('T')[0];
                    await saveMetasAsync(metasNow);
                }
            }
            Swal.fire({ icon: 'success', title: 'Aportado', text: 'La contribución se registró correctamente.', timer: 1400, showConfirmButton: false });
        }
    }));

    // Escuchar cambios en registros en otras pestañas para refrescar provisiones
    window.addEventListener('storage', async (ev) => {
        if (!ev.key) return;
        if (ev.key === `registros_${currentUser.email}`) {
            await getSaldoFromRegistrosAsync();
            await updateProvisionesDisplayAsync();
            await renderMetas();
            renderHistorialMetas();
        }
    });
}

// Utilidades
const numberWithCommas = x => x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
const escapeHtml = s => String(s).replace(/&|<|>|\"|'/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": "&#039;" }[c]));

// Eventos DOM
window.addEventListener('DOMContentLoaded', async () => {
    // recalcular provisiones y fijar fecha por defecto
    await getSaldoFromRegistrosAsync();
    const hoy = new Date().toISOString().split('T')[0];
    const metaProx = document.getElementById('metaProxima');
    if (metaProx) metaProx.value = hoy;
    await renderMetas();
    await updateProvisionesDisplayAsync();
    renderHistorialMetas();

    // polling: detecta cambios en registros_<email> en la MISMA pestaña
    setInterval(async () => {
        try {
            const raw = localStorage.getItem(_regKey) || '';
            if (raw !== _lastRegRaw) {
                _lastRegRaw = raw;
                // recalc and cache provisiones
                await getSaldoFromRegistrosAsync();
                await updateProvisionesDisplayAsync();
                await renderMetas();
                renderHistorialMetas();
            }
        } catch (e) { }
    }, 900);

    const formMeta = document.getElementById('formMeta');
    formMeta && formMeta.addEventListener('submit', async e => {
        e.preventDefault();
        const nombre = document.getElementById('metaNombre').value.trim();
        const objetivo = Number(document.getElementById('metaObjetivo').value);
        const tipo = document.getElementById('metaTipo') ? document.getElementById('metaTipo').value : 'tiempo';
        const periodos = document.getElementById('metaPeriodos') ? Number(document.getElementById('metaPeriodos').value) || 0 : 0;

        if (!nombre || !objetivo) return;

        // Calcular montoMensual antes de crear la meta
        const montoMensual = (tipo === 'tiempo' && periodos > 0) ? Math.round(objetivo / periodos) : 0;

        // Validar si hay suficientes provisiones
        if (montoMensual > 0) {
            const provisionesDisponibles = await getProvisionesCachedAsync();

            if (montoMensual > provisionesDisponibles) {
                await Swal.fire({
                    icon: 'error',
                    title: 'Provisiones insuficientes',
                    html: `<p>No puedes crear esta meta porque el aporte mensual requerido es <strong>${numberWithCommas(montoMensual)}</strong></p>
                       <p>Tus provisiones disponibles son: <strong>${numberWithCommas(Math.round(provisionesDisponibles))}</strong></p>
                       <p class="text-muted mt-2">Reduce el objetivo o aumenta los períodos para crear la meta.</p>`,
                    confirmButtonText: 'Entendido'
                });
                return; // No crear la meta
            }
        }

        // Si pasa la validación, crear la meta normalmente
        await crearMeta(nombre, objetivo);
        formMeta.reset();
        const hoy = new Date().toISOString().split('T')[0];
        const metaProx = document.getElementById('metaProxima');
        if (metaProx) metaProx.value = hoy;
    });

    const tipoNuevo = document.getElementById('metaTipo');
    const wrapperNuevo = document.getElementById('metaPeriodosWrapper');
    const contribNuevo = document.getElementById('metaContribucion');
    const contribNuevoWrap = document.getElementById('metaContribucionWrapper');
    if (wrapperNuevo) wrapperNuevo.style.display = '';
    if (contribNuevoWrap) contribNuevoWrap.style.display = '';

    // mostrar/ocultar periodos en editar
    const tipoEditar = document.getElementById('editarMetaTipo');
    const wrapperEditar = document.getElementById('editarMetaPeriodosWrapper');

    const contribEditar = document.getElementById('editarMetaContribucion');
    const contribEditarWrap = document.getElementById('editarMetaContribucionWrapper');
    if (wrapperEditar) wrapperEditar.style.display = '';
    if (contribEditarWrap) contribEditarWrap.style.display = '';

    const formContribuir = document.getElementById('formContribuir');
    formContribuir && formContribuir.addEventListener('submit', async e => {
        e.preventDefault();
        const id = document.getElementById('contribuirId').value;
        const monto = Number(document.getElementById('contribuirMonto').value);
        if (!id || !monto) return;
        const provisiones = await getProvisionesCachedAsync();
        if (provisiones < monto) { Swal.fire('Saldo insuficiente', 'Provisiones insuficientes para realizar la contribución.', 'error'); return; }
        const ok = await aportarMeta(id, monto);
        if (ok) {
            const modalEl = document.getElementById('modalContribuir');
            const modal = bootstrap.Modal.getInstance(modalEl);
            modal && modal.hide();
        }
        formContribuir.reset();
    });

    const formEditar = document.getElementById('formEditarMeta');
    formEditar && formEditar.addEventListener('submit', async e => {
        e.preventDefault();
        const id = document.getElementById('editarMetaId').value;
        const nombre = document.getElementById('editarMetaNombre').value.trim();
        const objetivo = document.getElementById('editarMetaObjetivo').value;
        if (!id || !nombre || !objetivo) return;
        await editarMeta(id, nombre, objetivo);
        const modalEl = document.getElementById('modalEditarMeta');
        const modal = bootstrap.Modal.getInstance(modalEl);
        modal && modal.hide();
    });

});
