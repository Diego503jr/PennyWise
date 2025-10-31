// Inicialización y utilidades
const currentUser = JSON.parse(localStorage.getItem('currentUser'));
if (!currentUser) window.location.href = "./index.html";

const USER_KEY = (currentUser.username || currentUser.email || currentUser.id || 'guest').toString();
const storageKey = (type) => `${type}_${USER_KEY}`;
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const numberWithCommas = x => x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
const escapeHtml = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#039;"}[c]));

// Acceso a datos
const getMetas = () => JSON.parse(localStorage.getItem(storageKey('metas')) || '[]');
const saveMetas = m => localStorage.setItem(storageKey('metas'), JSON.stringify(m));

// Cálculo de provisiones
const calcularProvisiones = () => {
    // Obtener el límite de Provisiones del presupuesto
    const limitesKey = `limitesDePresupuesto_${currentUser.email}`;
    const limitesPresupuesto = JSON.parse(localStorage.getItem(limitesKey) || '[]');
    const limiteProvisiones = limitesPresupuesto.find(l => l.categoria === "Provisiones")?.limite || 0;
    
    // Calcular los aportes ya realizados a metas
    const aportes = getMetas().reduce((acc, m) => 
        acc + (m.history?.reduce((sum, h) => h.action === 'aporte' ? sum + Number(h.amount || 0) : sum, 0) || 0), 0);
    
    // El saldo disponible es el límite menos los aportes ya realizados
    const total = Math.max(0, limiteProvisiones - aportes);
    localStorage.setItem(storageKey('provisiones'), JSON.stringify({total, updatedAt: new Date().toISOString()}));
    return total;
};

const getProvisiones = () => {
    try {
        const data = JSON.parse(localStorage.getItem(storageKey('provisiones')));
        return data?.total ?? calcularProvisiones();
    } catch { return 0; }
};

const actualizarDisplayProvisiones = () => {
    const el = document.getElementById('saldoProvisionesDisplay');
    if (el) el.textContent = `$${numberWithCommas(Math.round(getProvisiones()))}`;
};

// CRUD Metas
const crearMeta = (datos) => {
    const metas = getMetas();
    const tipo = datos.tipo || 'tiempo';
    const periodos = Number(datos.periodos) || 0;
    const objetivo = Number(datos.objetivo);
    
    metas.push({
        id: uid(),
        nombre: datos.nombre,
        objetivo,
        tipo,
        periodos,
        contribucion: datos.contribucion || 'voluntaria',
        nextContribution: datos.nextContribution || new Date().toISOString().split('T')[0],
        actual: 0,
        creada: new Date().toISOString(),
        history: [{action: 'creada', amount: 0, date: new Date().toISOString()}],
        montoMensual: tipo === 'tiempo' && periodos > 0 ? Math.round(objetivo / periodos) : 0
    });
    
    saveMetas(metas);
    renderMetas();
    renderHistorial();
};

const eliminarMeta = (id) => {
    let metas = getMetas();
    saveMetas(metas.filter(m => m.id !== id));
    
    // Recalcular provisiones
    calcularProvisiones();
    renderMetas();
    renderHistorial();
    actualizarDisplayProvisiones();
};

const editarMeta = (id, datos) => {
    const metas = getMetas();
    const meta = metas.find(m => m.id === id);
    if (!meta) return;
    
    meta.nombre = datos.nombre;
    meta.objetivo = Number(datos.objetivo);
    meta.tipo = datos.tipo || meta.tipo;
    meta.periodos = Number(datos.periodos) || 0;
    meta.contribucion = datos.contribucion || meta.contribucion;
    meta.nextContribution = datos.nextContribution || meta.nextContribution;
    meta.montoMensual = meta.tipo === 'tiempo' && meta.periodos > 0 ? Math.round(meta.objetivo / meta.periodos) : 0;
    
    if (meta.actual > meta.objetivo) meta.actual = meta.objetivo;
    
    saveMetas(metas);
    renderMetas();
    renderHistorial();
};

const aportarMeta = (id, monto) => {
    const metas = getMetas();
    const meta = metas.find(m => m.id === id);
    if (!meta) return false;
    
    // No permitir aportes si la meta ya está completada
    if (meta.actual >= meta.objetivo) {
        return false;
    }
    
    const restante = Math.max(0, meta.objetivo - meta.actual);
    const montoReal = Math.min(Number(monto), restante);
    
    meta.actual += montoReal;
    if (!meta.history) meta.history = [];
    meta.history.push({action: 'aporte', amount: montoReal, date: new Date().toISOString()});
    
    const provisiones = JSON.parse(localStorage.getItem(storageKey('provisiones')) || '{}');
    provisiones.total = Math.max(0, (Number(provisiones.total) || 0) - montoReal);
    provisiones.updatedAt = new Date().toISOString();
    localStorage.setItem(storageKey('provisiones'), JSON.stringify(provisiones));
    
    saveMetas(metas);
    renderMetas();
    renderHistorial();
    actualizarDisplayProvisiones();
    return true;
};


// Renderizado
const renderMetas = () => {
    const tbody = document.getElementById('tablaMetas');
    const empty = document.getElementById('listaMetasEmpty');
    if (!tbody) return;
    
    const metas = getMetas();
    
    if (!metas.length) {
        tbody.innerHTML = '';
        empty?.classList.remove('d-none');
        return;
    }
    
    empty?.classList.add('d-none');
    
    tbody.innerHTML = metas.map(m => {
        const porc = Math.round((m.actual / m.objetivo) * 100) || 0;
        const aporte = m.tipo === 'tiempo' && m.periodos > 0 ? Math.round(m.objetivo / m.periodos) : 0;
        const completada = m.actual >= m.objetivo;
        
        const botones = [
            `<button class="btn btn-sm btn-outline-secondary btn-editar" data-id="${m.id}"><i class="bi bi-pencil"></i><span class="d-none d-sm-inline ms-1">Editar</span></button>`,
            `<button class="btn btn-sm btn-outline-danger btn-eliminar" data-id="${m.id}"><i class="bi bi-trash"></i><span class="d-none d-sm-inline ms-1">Eliminar</span></button>`
        ];
        
        // Solo mostrar botones de aportar si NO está completada
        if (!completada) {
            if (m.contribucion === 'automatica' && aporte > 0) {
                botones.push(`<button class="btn btn-sm btn-auto" data-id="${m.id}"><i class="bi bi-arrow-repeat"></i><span class="d-none d-sm-inline ms-1">Aportar ${numberWithCommas(aporte)}</span></button>`);
            } else {
                botones.push(`<button class="btn btn-sm btn-gold btn-contribuir" data-id="${m.id}"><i class="bi bi-plus-lg"></i><span class="d-none d-sm-inline ms-1">Contribuir</span></button>`);
            }
        }
        
        // Indicador visual de completada
        const nombreMeta = completada ? `${escapeHtml(m.nombre)} <span class="badge bg-success ms-2">Completada ✓</span>` : escapeHtml(m.nombre);
        const barraColor = completada ? 'bg-success' : 'bg-success';
        
        return `<tr ${completada ? 'class="table-success"' : ''}>
            <td>${nombreMeta}</td>
            <td>$${numberWithCommas(m.objetivo)}</td>
            <td>${m.tipo === 'tiempo' ? (m.periodos || '-') : '-'}</td>
            <td>${aporte > 0 ? '$' + numberWithCommas(aporte) : '-'}</td>
            <td>${m.nextContribution || '-'}</td>
            <td>$${numberWithCommas(m.actual)}</td>
            <td><div class="progress" style="height:25px"><div class="progress-bar ${barraColor}" style="width:${Math.min(porc,100)}%">${porc > 10 ? porc + '%' : ''}</div></div></td>
            <td class="tabla-acciones d-flex gap-2">${botones.join(' ')}</td>
        </tr>`;
    }).join('');
    
    vincularEventos();
};

// Función para capitalizar texto
const capitalizar = (texto) => {
    if (!texto) return '-';
    return texto.charAt(0).toUpperCase() + texto.slice(1).toLowerCase();
};

// Función para formatear tipo de meta
const formatearTipo = (tipo) => {
    const tipos = {
        'tiempo': 'Por Tiempo',
        'monto': 'Por Monto'
    };
    return tipos[tipo] || capitalizar(tipo);
};

// Función para formatear acción
const formatearAccion = (accion) => {
    const acciones = {
        'creada': 'Creada',
        'aporte': 'Aporte',
        'editada': 'Editada',
        'archivada': 'Archivada'
    };
    return acciones[accion] || capitalizar(accion);
};

// Función para obtener badge de acción
const getBadgeAccion = (accion) => {
    const badges = {
        'creada': '<span class="badge bg-info text-white">Creada</span>',
        'aporte': '<span class="badge bg-success text-white">Aporte</span>',
        'editada': '<span class="badge bg-warning text-dark">Editada</span>',
        'archivada': '<span class="badge bg-secondary text-white">Archivada</span>'
    };
    return badges[accion] || `<span class="badge bg-light text-dark">${formatearAccion(accion)}</span>`;
};

const renderHistorial = () => {
    const tb = document.getElementById('tablaHistorialMetas');
    if (!tb) return;
    
    const filtroMeta = document.getElementById('filtroMetaHistorial')?.value || '';
    const filtroMes = document.getElementById('filtroMesHistorial')?.value || '';
    const metas = getMetas();
    
    // Actualizar select de metas
    const select = document.getElementById('filtroMetaHistorial');
    if (select) {
        const actual = select.value;
        select.innerHTML = '<option value="">Todas las metas</option>' + 
            metas.map(m => `<option value="${m.id}">${m.nombre}${m.actual >= m.objetivo ? ' (Completada)' : ''}</option>`).join('');
        select.value = actual;
    }
    
    const filas = [];
    metas.forEach(m => {
        if (!m.history) return;
        m.history.slice().reverse().forEach(h => {
            if (filtroMeta && m.id !== filtroMeta) return;
            if (filtroMes && h.date && !h.date.startsWith(filtroMes)) return;
            
            const estaCompletada = m.actual >= m.objetivo;
            const nombreMeta = escapeHtml(m.nombre);
            const tipoFormateado = formatearTipo(m.tipo || '-');
            const montoFormateado = h.amount ? `$${numberWithCommas(h.amount)}` : '-';
            const fechaFormateada = h.date ? new Date(h.date).toLocaleString('es-SV', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            }) : '-';
            
            filas.push(`<tr class="historial-row">
                <td class="align-middle">
                    <div class="d-flex align-items-center">
                        <strong class="me-2">${nombreMeta}</strong>
                        ${estaCompletada ? '<span class="badge bg-success ms-2"><i class="bi bi-check-circle"></i> Completada</span>' : ''}
                    </div>
                </td>
                <td class="align-middle">
                    <div>
                        <span class="text-muted small">${tipoFormateado}</span>
                        ${h.amount ? `<span class="badge bg-primary-subtle text-primary-emphasis ms-2">${montoFormateado}</span>` : `<span class="text-muted ms-2">-</span>`}
                    </div>
                </td>
                <td class="align-middle">
                    ${getBadgeAccion(h.action || '-')}
                </td>
                <td class="align-middle">
                    <small class="text-muted">${fechaFormateada}</small>
                </td>
            </tr>`);
        });
    });
    
    tb.innerHTML = filas.length ? filas.join('') : '<tr><td colspan="4" class="text-center text-muted py-4">No hay registros en el historial</td></tr>';
};

// Event handlers
const vincularEventos = () => {
    document.querySelectorAll('.btn-eliminar').forEach(btn => {
        btn.onclick = async (e) => {
            const id = e.currentTarget.dataset.id;
            const m = getMetas().find(x => x.id === id);
            const res = await Swal.fire({
                title: '¿Eliminar esta meta?',
                text: `¿Eliminar "${m?.nombre}"?`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#d33',
                confirmButtonText: 'Sí, eliminar'
            });
            if (res.isConfirmed) {
                eliminarMeta(id);
                Swal.fire('Eliminado', 'La meta ha sido eliminada.', 'success');
            }
        };
    });
    
    document.querySelectorAll('.btn-editar').forEach(btn => {
        btn.onclick = (e) => {
            const m = getMetas().find(x => x.id === e.currentTarget.dataset.id);
            if (!m) return;
            document.getElementById('editarMetaId').value = m.id;
            document.getElementById('editarMetaNombre').value = m.nombre;
            document.getElementById('editarMetaObjetivo').value = m.objetivo;
            document.getElementById('editarMetaTipo').value = m.tipo || 'tiempo';
            document.getElementById('editarMetaPeriodos').value = m.periodos || '';
            document.getElementById('editarMetaContribucion').value = m.contribucion || 'voluntaria';
            document.getElementById('editarMetaProxima').value = m.nextContribution || '';
            new bootstrap.Modal(document.getElementById('modalEditarMeta')).show();
        };
    });
    
    document.querySelectorAll('.btn-contribuir').forEach(btn => {
        btn.onclick = (e) => {
            document.getElementById('contribuirId').value = e.currentTarget.dataset.id;
            document.getElementById('contribuirMonto').value = '';
            new bootstrap.Modal(document.getElementById('modalContribuir')).show();
        };
    });
    
    document.querySelectorAll('.btn-auto').forEach(btn => {
        btn.onclick = async (e) => {
            const m = getMetas().find(x => x.id === e.currentTarget.dataset.id);
            if (!m) return;
            const aporte = Math.min(m.montoMensual, m.objetivo - m.actual);
            if (getProvisiones() < aporte) {
                Swal.fire('Saldo insuficiente', 'Provisiones insuficientes.', 'error');
                return;
            }
            const res = await Swal.fire({
                title: '¿Confirmar aporte?',
                html: `¿Aportar <strong>$${numberWithCommas(aporte)}</strong> a '<strong>${escapeHtml(m.nombre)}</strong>'?`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Sí, aportar'
            });
            if (res.isConfirmed) {
                aportarMeta(m.id, aporte);
                const metas = getMetas();
                const meta = metas.find(x => x.id === m.id);
                if (meta?.nextContribution) {
                    const fecha = new Date(meta.nextContribution);
                    fecha.setMonth(fecha.getMonth() + 1);
                    meta.nextContribution = fecha.toISOString().split('T')[0];
                    saveMetas(metas);
                }
                Swal.fire({icon: 'success', title: 'Aportado', timer: 1400, showConfirmButton: false});
            }
        };
    });
};

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    calcularProvisiones();
    const hoy = new Date().toISOString().split('T')[0];
    const metaProx = document.getElementById('metaProxima');
    if (metaProx) metaProx.value = hoy;
    
    renderMetas();
    actualizarDisplayProvisiones();
    renderHistorial();
    
    // Listeners de filtros
    ['filtroMetaHistorial', 'filtroMesHistorial'].forEach(id => {
        document.getElementById(id)?.addEventListener('change', renderHistorial);
    });
    
    document.getElementById('btnLimpiarFiltros')?.addEventListener('click', () => {
        document.getElementById('filtroMetaHistorial').value = '';
        document.getElementById('filtroMesHistorial').value = '';
        renderHistorial();
    });
    
    // Polling límites de presupuesto
    const limitesKey = `limitesDePresupuesto_${currentUser.email}`;
    let lastLimites = localStorage.getItem(limitesKey) || '';
    setInterval(() => {
        const currentLimites = localStorage.getItem(limitesKey) || '';
        
        if (currentLimites !== lastLimites) {
            lastLimites = currentLimites;
            calcularProvisiones();
            actualizarDisplayProvisiones();
            renderMetas();
            renderHistorial();
        }
    }, 900);
    
    // Forms
    document.getElementById('formMeta')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const nombre = document.getElementById('metaNombre').value.trim();
        const objetivo = Number(document.getElementById('metaObjetivo').value);
        const tipo = document.getElementById('metaTipo').value;
        const periodos = Number(document.getElementById('metaPeriodos').value) || 0;
        const montoMensual = tipo === 'tiempo' && periodos > 0 ? Math.round(objetivo / periodos) : 0;
        
        if (montoMensual > 0 && montoMensual > getProvisiones()) {
            await Swal.fire({
                icon: 'error',
                title: 'Provisiones insuficientes',
                html: `<p>Aporte mensual: <strong>$${numberWithCommas(montoMensual)}</strong></p>
                       <p>Provisiones: <strong>$${numberWithCommas(Math.round(getProvisiones()))}</strong></p>`
            });
            return;
        }
        
        crearMeta({
            nombre,
            objetivo,
            tipo,
            periodos,
            contribucion: document.getElementById('metaContribucion').value,
            nextContribution: document.getElementById('metaProxima').value
        });
        e.target.reset();
        if (metaProx) metaProx.value = hoy;
    });
    
    document.getElementById('formContribuir')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('contribuirId').value;
        const monto = Number(document.getElementById('contribuirMonto').value);
        
        if (getProvisiones() < monto) {
            Swal.fire('Saldo insuficiente', 'Provisiones insuficientes.', 'error');
            return;
        }
        
        if (aportarMeta(id, monto)) {
            bootstrap.Modal.getInstance(document.getElementById('modalContribuir')).hide();
        }
        e.target.reset();
    });
    
    document.getElementById('formEditarMeta')?.addEventListener('submit', (e) => {
        e.preventDefault();
        editarMeta(document.getElementById('editarMetaId').value, {
            nombre: document.getElementById('editarMetaNombre').value.trim(),
            objetivo: document.getElementById('editarMetaObjetivo').value,
            tipo: document.getElementById('editarMetaTipo').value,
            periodos: document.getElementById('editarMetaPeriodos').value,
            contribucion: document.getElementById('editarMetaContribucion').value,
            nextContribution: document.getElementById('editarMetaProxima').value
        });
        bootstrap.Modal.getInstance(document.getElementById('modalEditarMeta')).hide();
    });
    
});