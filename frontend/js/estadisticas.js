// ===== ESTADÍSTICAS - Mini Abarrotes COLT'S =====
console.log('📊 Módulo de Estadísticas inicializando...');

let supabaseClient = null;
let charts = {};
let periodoActual = 'semana';

document.addEventListener('DOMContentLoaded', async function() {
    if (typeof protectPage === 'function' && !protectPage()) return;
    
    await initSupabase();
    updateDateTime();
    startDateTimeUpdates();
    loadUserData();
    setupEvents();

    // ✅ MENÚ HAMBURGUESA — dentro del DOMContentLoaded
    if (typeof setupMobileMenu === 'function') {
        setupMobileMenu();
    } else {
        initMobileMenuFallback();
    }

    await loadEstadisticas();
});

// ===== FALLBACK MENÚ HAMBURGUESA =====
// Se usa si common.js no carga setupMobileMenu a tiempo
function initMobileMenuFallback() {
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.querySelector('.sidebar');
    if (!menuToggle || !sidebar) return;

    let overlay = document.querySelector('.sidebar-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.className = 'sidebar-overlay';
        overlay.style.cssText = `
            display: none; position: fixed;
            top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.5); z-index: 999;
            opacity: 0; transition: opacity 0.3s ease;
        `;
        document.body.appendChild(overlay);
    }

    function openMenu() {
        sidebar.classList.add('mobile-active');
        overlay.style.display = 'block';
        setTimeout(() => { overlay.style.opacity = '1'; }, 10);
        document.body.style.overflow = 'hidden';
    }

    function closeMenu() {
        sidebar.classList.remove('mobile-active');
        overlay.style.opacity = '0';
        setTimeout(() => { overlay.style.display = 'none'; }, 300);
        document.body.style.overflow = '';
    }

    // Clonar para eliminar listeners viejos
    const newToggle = menuToggle.cloneNode(true);
    menuToggle.parentNode.replaceChild(newToggle, menuToggle);

    newToggle.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        sidebar.classList.contains('mobile-active') ? closeMenu() : openMenu();
    });

    overlay.addEventListener('click', closeMenu);

    sidebar.querySelectorAll('.sidebar-menu a, .logout-btn').forEach(link => {
        link.addEventListener('click', () => {
            if (overlay.style.display === 'block') closeMenu();
        });
    });

    window.addEventListener('resize', () => {
        if (window.innerWidth > 992) {
            sidebar.classList.remove('mobile-active');
            overlay.style.opacity = '0';
            overlay.style.display = 'none';
            document.body.style.overflow = '';
        }
    });

    console.log('✅ Menú hamburguesa (fallback) listo');
}

async function initSupabase() {
    supabaseClient = supabase.createClient(
        window.supabaseConfig.SUPABASE_URL,
        window.supabaseConfig.SUPABASE_KEY
    );
}

function updateDateTime() {
    const now = new Date();
    const dateEl = document.getElementById('currentDate');
    const timeEl = document.getElementById('currentTime');
    if (dateEl) dateEl.textContent = now.toLocaleDateString('es-MX', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
        timeZone: 'America/Mexico_City'
    });
    if (timeEl) timeEl.textContent = now.toLocaleTimeString('es-MX', {
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        hour12: true, timeZone: 'America/Mexico_City'
    });
}

function startDateTimeUpdates() {
    setInterval(updateDateTime, 1000);
}

function loadUserData() {
    const session = JSON.parse(
        localStorage.getItem('colts_session') ||
        sessionStorage.getItem('colts_session') || '{}'
    );
    const userNameEl = document.getElementById('userName');
    const userEmailEl = document.getElementById('userEmail');
    if (userNameEl) userNameEl.textContent = 'Administrador';
    if (userEmailEl) userEmailEl.textContent = session.usuario || 'colts';
}

function setupEvents() {
    // ⚠️ NO ponemos el menuToggle aquí — lo maneja setupMobileMenu/fallback
    // Solo eventos de la página de estadísticas

    document.querySelectorAll('.periodo-btn').forEach(btn => {
        btn.addEventListener('click', async function() {
            document.querySelectorAll('.periodo-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            periodoActual = this.dataset.periodo;
            await loadEstadisticas();
        });
    });

    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', async () => {
            refreshBtn.classList.add('fa-spin');
            await loadEstadisticas();
            setTimeout(() => refreshBtn.classList.remove('fa-spin'), 500);
        });
    }

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (confirm('¿Cerrar sesión?') && typeof logout === 'function') logout();
        });
    }

    const backBtn = document.getElementById('backToDashboard');
    if (backBtn) {
        backBtn.addEventListener('click', (e) => {
            e.preventDefault();
            window.location.href = '../dashboard.html';
        });
    }
}

// ===== CARGA PRINCIPAL =====
async function loadEstadisticas() {
    try {
        const { inicio, fin } = getFechasPeriodo();

        const fechaInicioEl = document.getElementById('fechaInicio');
        const fechaFinEl = document.getElementById('fechaFin');
        if (fechaInicioEl) fechaInicioEl.textContent = formatDate(inicio);
        if (fechaFinEl) fechaFinEl.textContent = formatDate(fin);

        const [asistencia, empleados] = await Promise.all([
            loadAsistenciaPeriodo(inicio, fin),
            loadEmpleados()
        ]);

        calcularMetricas(asistencia, empleados);

        Object.values(charts).forEach(chart => chart?.destroy());
        charts = {};

        // Limpiar tabla anterior
        const oldTable = document.querySelector('.asistencia-tabla');
        if (oldTable) oldTable.remove();
        const canvasAsist = document.getElementById('chartAsistencia');
        if (canvasAsist) canvasAsist.style.display = '';

        crearGraficas(asistencia, empleados);

    } catch (error) {
        console.error('Error cargando estadísticas:', error);
        if (typeof showNotification === 'function') {
            showNotification('Error al cargar estadísticas', 'error');
        }
    }
}

function getFechasPeriodo() {
    const hoy = new Date();
    let inicio = new Date(hoy);
    switch (periodoActual) {
        case 'semana':    inicio.setDate(hoy.getDate() - 7); break;
        case 'mes':       inicio.setMonth(hoy.getMonth() - 1); break;
        case 'trimestre': inicio.setMonth(hoy.getMonth() - 3); break;
        case 'año':       inicio.setFullYear(hoy.getFullYear() - 1); break;
    }
    return {
        inicio: inicio.toISOString().split('T')[0],
        fin: hoy.toISOString().split('T')[0]
    };
}

function formatDate(dateStr) {
    return new Date(dateStr + 'T12:00:00').toLocaleDateString('es-MX', {
        day: '2-digit', month: '2-digit', year: 'numeric'
    });
}

async function loadAsistenciaPeriodo(inicio, fin) {
    const { data } = await supabaseClient
        .from('asistencia')
        .select('*, empleados(nombre_completo, puesto)')
        .gte('fecha', inicio)
        .lte('fecha', fin)
        .order('fecha');
    return data || [];
}

async function loadEmpleados() {
    const { data } = await supabaseClient.from('empleados').select('*');
    return data || [];
}

// ===== MÉTRICAS =====
function calcularMetricas(asistencia, empleados) {
    const totalHoras = asistencia.reduce((sum, reg) => sum + (parseFloat(reg.horas_trabajadas) || 0), 0);
    const diasUnicos = new Set(asistencia.map(a => a.fecha)).size;
    const horasPorDia = {};
    asistencia.forEach(reg => {
        horasPorDia[reg.fecha] = (horasPorDia[reg.fecha] || 0) + (parseFloat(reg.horas_trabajadas) || 0);
    });
    const maxHorasDia = Math.max(...Object.values(horasPorDia), 0);
    const empleadosActivos = empleados.filter(e => e.activo).length;
    const registrosEsperados = empleadosActivos * diasUnicos;
    const asistenciaPct = registrosEsperados > 0
        ? ((asistencia.length / registrosEsperados) * 100).toFixed(1) : 0;

    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    set('totalHorasPeriodo', totalHoras.toFixed(1));
    set('horasPromedio', (totalHoras / (diasUnicos || 1)).toFixed(1));
    set('horasMaximas', maxHorasDia.toFixed(1));
    set('asistenciaPromedio', asistenciaPct + '%');
    set('diasTrabajados', diasUnicos);
    set('totalRegistros', asistencia.length);
    set('totalEmpleados', empleados.length);
    set('empleadosActivos', empleadosActivos);
    set('empleadosInactivos', empleados.length - empleadosActivos);
}

// ===== GRÁFICAS =====
function crearGraficas(asistencia, empleados) {
    const fechas = [...new Set(asistencia.map(a => a.fecha))].sort();
    const fechasLabel = fechas.map(f =>
        new Date(f + 'T12:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit' })
    );
    const asistenciasPorDia = fechas.map(f =>
        asistencia.filter(a => a.fecha === f && a.hora_entrada).length
    );
    const horasPorDiaArr = fechas.map(f =>
        asistencia.filter(a => a.fecha === f)
            .reduce((sum, a) => sum + (parseFloat(a.horas_trabajadas) || 0), 0)
    );

    // ===== 1. TABLA DE ASISTENCIA DIARIA =====
    const chartAsistenciaEl = document.getElementById('chartAsistencia');
    if (chartAsistenciaEl) {
        const container = chartAsistenciaEl.parentElement;
        chartAsistenciaEl.style.display = 'none';

        const tableWrapper = document.createElement('div');
        tableWrapper.className = 'asistencia-tabla';
        tableWrapper.style.cssText = `max-height:260px;overflow-y:auto;border-radius:8px;border:1px solid #E9ECEF;`;

        const empleadosActivos = empleados.filter(e => e.activo).length;

        if (fechas.length === 0) {
            tableWrapper.innerHTML = `<div style="padding:2rem;text-align:center;color:#6c757d;">Sin datos en este período</div>`;
        } else {
            let rows = '';
            fechas.forEach((f, i) => {
                const presentes = asistenciasPorDia[i];
                const pct = empleadosActivos > 0 ? Math.round((presentes / empleadosActivos) * 100) : 0;
                const color = pct >= 80 ? '#2ED573' : pct >= 50 ? '#FFA502' : '#FF4757';
                const fechaLabel = new Date(f + 'T12:00:00').toLocaleDateString('es-MX', {
                    weekday: 'short', day: '2-digit', month: '2-digit'
                });
                rows += `
                    <tr style="border-bottom:1px solid #F1F3F4;">
                        <td style="padding:8px 12px;font-size:0.85rem;color:#495057;text-transform:capitalize;">${fechaLabel}</td>
                        <td style="padding:8px 12px;text-align:center;">
                            <span style="font-weight:700;color:#002DE6;">${presentes}</span>
                            <span style="color:#ADB5BD;font-size:0.8rem;"> / ${empleadosActivos}</span>
                        </td>
                        <td style="padding:8px 12px;min-width:100px;">
                            <div style="background:#F1F3F4;border-radius:20px;height:8px;overflow:hidden;">
                                <div style="width:${pct}%;height:100%;background:${color};border-radius:20px;"></div>
                            </div>
                        </td>
                        <td style="padding:8px 12px;text-align:right;">
                            <span style="font-weight:600;color:${color};font-size:0.85rem;">${pct}%</span>
                        </td>
                    </tr>`;
            });
            tableWrapper.innerHTML = `
                <table style="width:100%;border-collapse:collapse;">
                    <thead>
                        <tr style="background:#F8F9FA;border-bottom:2px solid #E9ECEF;position:sticky;top:0;z-index:1;">
                            <th style="padding:10px 12px;text-align:left;font-size:0.78rem;color:#6C757D;font-weight:600;">FECHA</th>
                            <th style="padding:10px 12px;text-align:center;font-size:0.78rem;color:#6C757D;font-weight:600;">PRESENTES</th>
                            <th style="padding:10px 12px;font-size:0.78rem;color:#6C757D;font-weight:600;">ASISTENCIA</th>
                            <th style="padding:10px 12px;text-align:right;font-size:0.78rem;color:#6C757D;font-weight:600;">%</th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>`;
        }
        container.appendChild(tableWrapper);
    }

    // ===== 2. HORAS TRABAJADAS → BARRAS HORIZONTALES =====
    const chartHorasEl = document.getElementById('chartHoras');
    if (chartHorasEl) {
        charts.horas = new Chart(chartHorasEl, {
            type: 'bar',
            data: {
                labels: fechasLabel,
                datasets: [{
                    label: 'Horas trabajadas',
                    data: horasPorDiaArr,
                    backgroundColor: horasPorDiaArr.map(h => h > 0 ? '#358FE6' : '#E9ECEF'),
                    borderRadius: 6,
                    borderSkipped: false
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: { callbacks: { label: ctx => ` ${ctx.raw.toFixed(1)} horas` } }
                },
                scales: {
                    x: {
                        beginAtZero: true,
                        grid: { color: 'rgba(0,0,0,0.05)' },
                        ticks: { callback: val => val + 'h', font: { size: 11 } }
                    },
                    y: { grid: { display: false }, ticks: { font: { size: 11 } } }
                }
            }
        });
    }

    // ===== 3. TOP 5 EMPLEADOS =====
    const horasPorEmpleado = {};
    asistencia.forEach(reg => {
        const nombre = reg.empleados?.nombre_completo || 'Desconocido';
        horasPorEmpleado[nombre] = (horasPorEmpleado[nombre] || 0) + (parseFloat(reg.horas_trabajadas) || 0);
    });
    const topEmpleados = Object.entries(horasPorEmpleado).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const topEl = document.getElementById('topEmpleados');
    if (topEl) {
        topEl.innerHTML = topEmpleados.length
            ? topEmpleados.map(([nombre, horas], i) => `
                <div class="top-empleado-item">
                    <div class="top-empleado-pos">${i + 1}</div>
                    <div class="top-empleado-info">
                        <div class="top-empleado-nombre">${nombre}</div>
                    </div>
                    <div class="top-empleado-hours">${horas.toFixed(1)}h</div>
                </div>`).join('')
            : '<div class="loading">Sin datos suficientes</div>';
    }

    // ===== 4. DISTRIBUCIÓN POR PUESTO (donut) =====
    const puestos = {};
    empleados.forEach(emp => {
        const p = emp.puesto || 'Sin puesto';
        puestos[p] = (puestos[p] || 0) + 1;
    });
    const chartPuestosEl = document.getElementById('chartPuestos');
    if (chartPuestosEl) {
        charts.puestos = new Chart(chartPuestosEl, {
            type: 'doughnut',
            data: {
                labels: Object.keys(puestos),
                datasets: [{
                    data: Object.values(puestos),
                    backgroundColor: ['#002DE6', '#358FE6', '#6F0EE5', '#00C2EB', '#2ED573'],
                    borderWidth: 2,
                    borderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'bottom', labels: { font: { size: 12 }, padding: 12 } } }
            }
        });
    }

    // ===== 5. ACTIVIDAD POR DÍA DE SEMANA — BARRAS + LÍNEA PROMEDIO =====
    const diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const actividadDias = Array(7).fill(0);
    const conteoDias = Array(7).fill(0);

    asistencia.forEach(reg => {
        const dia = new Date(reg.fecha + 'T12:00:00').getDay();
        actividadDias[dia] += parseFloat(reg.horas_trabajadas) || 0;
        conteoDias[dia]++;
    });

    const promedioHorasPorDia = actividadDias.map((horas, index) =>
        conteoDias[index] > 0 ? horas / conteoDias[index] : 0
    );

    const chartDiasEl = document.getElementById('chartDiasSemana');
    if (chartDiasEl) {
        charts.diasSemana = new Chart(chartDiasEl, {
            type: 'bar',
            data: {
                labels: diasSemana,
                datasets: [
                    {
                        label: 'Horas trabajadas',
                        data: actividadDias,
                        backgroundColor: '#358FE6',
                        borderRadius: 6,
                        barPercentage: 0.7,
                        yAxisID: 'y',
                        order: 1
                    },
                    {
                        label: 'Promedio por día',
                        data: promedioHorasPorDia,
                        type: 'line',
                        borderColor: '#002DE6',
                        backgroundColor: 'transparent',
                        borderWidth: 3,
                        pointBackgroundColor: '#002DE6',
                        pointBorderColor: '#fff',
                        pointBorderWidth: 2,
                        pointRadius: 5,
                        pointHoverRadius: 7,
                        yAxisID: 'y1',
                        order: 0,
                        tension: 0.3
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                        labels: { usePointStyle: true, boxWidth: 8, font: { size: 11 } }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                if (context.dataset.label === 'Horas trabajadas') {
                                    return ` Total: ${context.raw.toFixed(1)} horas`;
                                }
                                return ` Promedio: ${context.raw.toFixed(1)} h/día`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        beginAtZero: true,
                        title: { display: true, text: 'Horas totales', font: { size: 11 } },
                        grid: { color: 'rgba(0,0,0,0.05)' },
                        ticks: { callback: val => val + 'h' }
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        beginAtZero: true,
                        title: { display: true, text: 'Horas promedio', font: { size: 11 } },
                        grid: { drawOnChartArea: false },
                        ticks: { callback: val => val + 'h' }
                    },
                    x: {
                        grid: { display: false },
                        ticks: { font: { size: 12 } }
                    }
                }
            }
        });
    }
}

function showNotification(message, type) {
    if (window.showNotification) window.showNotification(message, type);
}

console.log('✅ estadisticas.js v2.0 cargado');