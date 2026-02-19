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
    await loadEstadisticas();
});

async function initSupabase() {
    supabaseClient = supabase.createClient(
        window.supabaseConfig.SUPABASE_URL,
        window.supabaseConfig.SUPABASE_KEY
    );
}

function updateDateTime() {
    const now = new Date();
    document.getElementById('currentDate').textContent = 
        now.toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    document.getElementById('currentTime').textContent = 
        now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function startDateTimeUpdates() {
    setInterval(updateDateTime, 1000);
}

function loadUserData() {
    const session = JSON.parse(localStorage.getItem('colts_session') || sessionStorage.getItem('colts_session') || '{}');
    document.getElementById('userName').textContent = 'Administrador';
    document.getElementById('userEmail').textContent = session.usuario || 'colts';
}

function setupEvents() {
    // Menu toggle
    document.getElementById('menuToggle').addEventListener('click', () => {
        document.querySelector('.sidebar').classList.toggle('collapsed');
    });

    // Botones de período
    document.querySelectorAll('.periodo-btn').forEach(btn => {
        btn.addEventListener('click', async function() {
            document.querySelectorAll('.periodo-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            periodoActual = this.dataset.periodo;
            await loadEstadisticas();
        });
    });

    // Refresh
    document.getElementById('refreshBtn').addEventListener('click', async () => {
        document.getElementById('refreshBtn').classList.add('fa-spin');
        await loadEstadisticas();
        setTimeout(() => document.getElementById('refreshBtn').classList.remove('fa-spin'), 500);
    });

    // Logout
    document.getElementById('logoutBtn').addEventListener('click', (e) => {
        e.preventDefault();
        if (confirm('¿Cerrar sesión?')) logout();
    });

    // Back to dashboard
    document.getElementById('backToDashboard').addEventListener('click', (e) => {
        e.preventDefault();
        window.location.href = '../dashboard.html';
    });
}

async function loadEstadisticas() {
    try {
        const { inicio, fin } = getFechasPeriodo();
        document.getElementById('fechaInicio').textContent = formatDate(inicio);
        document.getElementById('fechaFin').textContent = formatDate(fin);

        // Cargar datos
        const [asistencia, empleados] = await Promise.all([
            loadAsistenciaPeriodo(inicio, fin),
            loadEmpleados()
        ]);

        // Calcular métricas
        calcularMetricas(asistencia, empleados);
        
        // Destruir gráficas anteriores
        Object.values(charts).forEach(chart => chart?.destroy());
        
        // Crear nuevas gráficas
        crearGraficas(asistencia, empleados);
        
    } catch (error) {
        console.error('Error cargando estadísticas:', error);
        showNotification('Error al cargar estadísticas', 'error');
    }
}

function getFechasPeriodo() {
    const hoy = new Date();
    let inicio = new Date(hoy);
    
    switch(periodoActual) {
        case 'semana':
            inicio.setDate(hoy.getDate() - 7);
            break;
        case 'mes':
            inicio.setMonth(hoy.getMonth() - 1);
            break;
        case 'trimestre':
            inicio.setMonth(hoy.getMonth() - 3);
            break;
        case 'año':
            inicio.setFullYear(hoy.getFullYear() - 1);
            break;
    }
    
    return {
        inicio: inicio.toISOString().split('T')[0],
        fin: hoy.toISOString().split('T')[0]
    };
}

function formatDate(dateStr) {
    return new Date(dateStr).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' });
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
    const { data } = await supabaseClient
        .from('empleados')
        .select('*');
    
    return data || [];
}

function calcularMetricas(asistencia, empleados) {
    // Horas totales
    const totalHoras = asistencia.reduce((sum, reg) => sum + (parseFloat(reg.horas_trabajadas) || 0), 0);
    document.getElementById('totalHorasPeriodo').textContent = totalHoras.toFixed(1);

    // Promedio diario
    const diasUnicos = new Set(asistencia.map(a => a.fecha)).size;
    document.getElementById('horasPromedio').textContent = (totalHoras / (diasUnicos || 1)).toFixed(1);

    // Máximo de horas en un día
    const horasPorDia = {};
    asistencia.forEach(reg => {
        horasPorDia[reg.fecha] = (horasPorDia[reg.fecha] || 0) + (parseFloat(reg.horas_trabajadas) || 0);
    });
    const maxHorasDia = Math.max(...Object.values(horasPorDia), 0);
    document.getElementById('horasMaximas').textContent = maxHorasDia.toFixed(1);

    // Asistencia
    const empleadosActivos = empleados.filter(e => e.activo).length;
    const diasLaborales = diasUnicos;
    const registrosEsperados = empleadosActivos * diasLaborales;
    const asistenciaPorcentaje = registrosEsperados > 0 
        ? ((asistencia.length / registrosEsperados) * 100).toFixed(1)
        : 0;
    document.getElementById('asistenciaPromedio').textContent = asistenciaPorcentaje + '%';
    document.getElementById('diasTrabajados').textContent = diasLaborales;
    document.getElementById('totalRegistros').textContent = asistencia.length;

    // Empleados
    document.getElementById('totalEmpleados').textContent = empleados.length;
    document.getElementById('empleadosActivos').textContent = empleadosActivos;
    document.getElementById('empleadosInactivos').textContent = empleados.length - empleadosActivos;
}

function crearGraficas(asistencia, empleados) {
    // Preparar datos
    const fechas = [...new Set(asistencia.map(a => a.fecha))].sort();
    const asistenciasPorDia = fechas.map(f => 
        asistencia.filter(a => a.fecha === f && a.hora_entrada).length
    );
    const horasPorDia = fechas.map(f => 
        asistencia.filter(a => a.fecha === f)
            .reduce((sum, a) => sum + (parseFloat(a.horas_trabajadas) || 0), 0)
    );

    // Gráfica de Asistencia Diaria
    charts.asistencia = new Chart(document.getElementById('chartAsistencia'), {
        type: 'line',
        data: {
            labels: fechas.map(f => new Date(f).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit' })),
            datasets: [{
                label: 'Empleados presentes',
                data: asistenciasPorDia,
                borderColor: '#002DE6',
                backgroundColor: 'rgba(0, 45, 230, 0.1)',
                tension: 0.3,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            }
        }
    });

    // Gráfica de Horas por Día
    charts.horas = new Chart(document.getElementById('chartHoras'), {
        type: 'bar',
        data: {
            labels: fechas.map(f => new Date(f).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit' })),
            datasets: [{
                label: 'Horas trabajadas',
                data: horasPorDia,
                backgroundColor: '#358FE6',
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            }
        }
    });

    // Top 5 empleados
    const horasPorEmpleado = {};
    asistencia.forEach(reg => {
        const nombre = reg.empleados?.nombre_completo || 'Desconocido';
        horasPorEmpleado[nombre] = (horasPorEmpleado[nombre] || 0) + (parseFloat(reg.horas_trabajadas) || 0);
    });

    const topEmpleados = Object.entries(horasPorEmpleado)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

    document.getElementById('topEmpleados').innerHTML = topEmpleados.length 
        ? topEmpleados.map(([nombre, horas], i) => `
            <div class="top-empleado-item">
                <div class="top-empleado-pos">${i + 1}</div>
                <div class="top-empleado-info">
                    <div class="top-empleado-nombre">${nombre}</div>
                </div>
                <div class="top-empleado-hours">${horas.toFixed(1)}h</div>
            </div>
        `).join('')
        : '<div class="loading">Sin datos suficientes</div>';

    // Distribución por puesto
    const puestos = {};
    empleados.forEach(emp => {
        puestos[emp.puesto] = (puestos[emp.puesto] || 0) + 1;
    });

    charts.puestos = new Chart(document.getElementById('chartPuestos'), {
        type: 'doughnut',
        data: {
            labels: Object.keys(puestos),
            datasets: [{
                data: Object.values(puestos),
                backgroundColor: ['#002DE6', '#358FE6', '#6F0EE5', '#00C2EB', '#2ED573']
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom' }
            }
        }
    });

    // Actividad por día de semana
    const diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const actividadDias = Array(7).fill(0);
    const countDias = Array(7).fill(0);

    asistencia.forEach(reg => {
        const dia = new Date(reg.fecha).getDay();
        actividadDias[dia] += parseFloat(reg.horas_trabajadas) || 0;
        countDias[dia]++;
    });

    charts.diasSemana = new Chart(document.getElementById('chartDiasSemana'), {
        type: 'radar',
        data: {
            labels: diasSemana,
            datasets: [{
                label: 'Horas trabajadas',
                data: actividadDias,
                backgroundColor: 'rgba(0, 45, 230, 0.2)',
                borderColor: '#002DE6',
                pointBackgroundColor: '#002DE6'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false
        }
    });
}

function showNotification(message, type) {
    // Usar la misma función de common.js
    if (window.showNotification) {
        window.showNotification(message, type);
    }
}

console.log('✅ estadisticas.js cargado');