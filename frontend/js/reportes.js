// ===== REPORTES - Mini Abarrotes COLT'S =====
console.log('📊 Módulo de Reportes inicializando...');

let supabaseClient = null;
let currentData = [];

document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 Inicializando reportes...');
    
    if (typeof protectPage === 'function' && !protectPage()) return;
    
    await initSupabase();
    updateDateTime();
    startDateTimeUpdates();
    loadUserData();
    await loadEmpleados();
    setDefaultDates();
    setupEvents();

    // ✅ MENÚ HAMBURGUESA — igual que en estadisticas y lista-empleados
    if (typeof setupMobileMenu === 'function') {
        setupMobileMenu();
    } else {
        initMobileMenuFallback();
    }

    console.log('✅ Reportes listo');
});

// ===== FALLBACK MENÚ HAMBURGUESA =====
function initMobileMenuFallback() {
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.querySelector('.sidebar');
    if (!menuToggle || !sidebar) return;

    let overlay = document.querySelector('.sidebar-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.className = 'sidebar-overlay';
        overlay.style.cssText = `
            display:none; position:fixed; top:0; left:0;
            width:100%; height:100%; background:rgba(0,0,0,0.5);
            z-index:999; opacity:0; transition:opacity 0.3s ease;
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

    console.log('✅ Menú hamburguesa (fallback) listo en reportes');
}

// ===== INICIALIZAR SUPABASE =====
async function initSupabase() {
    try {
        if (typeof supabase === 'undefined') {
            showNotification('Error: Supabase no cargado', 'error');
            return false;
        }
        const SUPABASE_URL = window.supabaseConfig?.SUPABASE_URL || 'https://iokkxkpfncbumnjamquh.supabase.co';
        const SUPABASE_KEY = window.supabaseConfig?.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ0.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlva2t4a3BmbmNidW1uamFtcXVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA0MzE3MzgsImV4cCI6MjA4NjAwNzczOH0.7eKVc1I0v5n5zaB4rUEASizm05cFWTieOgtgMmZku6w';
        supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
        console.log('✅ Supabase conectado');
        return true;
    } catch (error) {
        console.error('❌ Error inicializando Supabase:', error);
        showNotification('Error inicializando sistema', 'error');
        return false;
    }
}

// ===== CARGAR DATOS DEL USUARIO =====
function loadUserData() {
    try {
        const sessionData = localStorage.getItem('colts_session') || sessionStorage.getItem('colts_session');
        if (sessionData) {
            const session = JSON.parse(sessionData);
            const userName = document.getElementById('userName');
            const userEmail = document.getElementById('userEmail');
            if (userName) userName.textContent = 'Administrador';
            if (userEmail) userEmail.textContent = session.usuario || 'colts';
            updateEmployeeCount();
        }
    } catch (error) {
        console.error('Error cargando datos usuario:', error);
    }
}

async function updateEmployeeCount() {
    try {
        const { count } = await supabaseClient
            .from('empleados')
            .select('*', { count: 'exact', head: true })
            .eq('activo', true);
        const badge = document.getElementById('empleadosCount');
        if (badge) badge.textContent = count || 0;
    } catch (error) {
        console.error('Error actualizando contador:', error);
    }
}

// ===== FECHA/HORA =====
function updateDateTime() {
    try {
        const now = new Date();
        const currentDateElem = document.getElementById('currentDate');
        const currentTimeElem = document.getElementById('currentTime');
        if (currentDateElem) currentDateElem.textContent = now.toLocaleDateString('es-MX', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
            timeZone: 'America/Mexico_City'
        });
        if (currentTimeElem) currentTimeElem.textContent = now.toLocaleTimeString('es-MX', {
            hour: '2-digit', minute: '2-digit', second: '2-digit',
            hour12: true, timeZone: 'America/Mexico_City'
        });
    } catch (error) {
        console.error('Error actualizando fecha/hora:', error);
    }
}

function startDateTimeUpdates() {
    setInterval(updateDateTime, 1000);
}

// ===== CARGAR EMPLEADOS PARA FILTRO =====
async function loadEmpleados() {
    try {
        const { data, error } = await supabaseClient
            .from('empleados')
            .select('id, nombre_completo')
            .eq('activo', true)
            .order('nombre_completo');
        if (error) throw error;
        const select = document.getElementById('empleadoFiltro');
        select.innerHTML = '<option value="todos">Todos los empleados</option>';
        data?.forEach(emp => {
            select.innerHTML += `<option value="${emp.id}">${emp.nombre_completo}</option>`;
        });
    } catch (error) {
        console.error('Error cargando empleados:', error);
    }
}

// ===== FECHAS POR DEFECTO =====
function setDefaultDates() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('fecha').value = today;
    const firstDay = new Date();
    firstDay.setDate(1);
    document.getElementById('fechaInicio').value = firstDay.toISOString().split('T')[0];
    document.getElementById('fechaFin').value = today;
}

// ===== CONFIGURAR EVENTOS =====
function setupEvents() {
    // ⚠️ NO manejamos menuToggle aquí — lo hace setupMobileMenu/fallback

    document.getElementById('tipoReporte').addEventListener('change', toggleDateInputs);
    document.getElementById('generarReporte').addEventListener('click', generarReporte);
    document.getElementById('exportarExcel').addEventListener('click', exportarExcel);
    document.getElementById('limpiarFiltros').addEventListener('click', limpiarFiltros);

    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            refreshBtn.classList.add('fa-spin');
            loadEmpleados();
            setDefaultDates();
            setTimeout(() => refreshBtn.classList.remove('fa-spin'), 500);
            showNotification('Datos actualizados', 'success');
        });
    }

    const backBtn = document.getElementById('backToDashboard');
    if (backBtn) {
        backBtn.addEventListener('click', (e) => {
            e.preventDefault();
            window.location.href = '../dashboard.html';
        });
    }

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (confirm('¿Estás seguro de que deseas cerrar sesión?')) {
                if (typeof logout === 'function') {
                    logout();
                } else {
                    localStorage.removeItem('colts_session');
                    localStorage.removeItem('colts_token');
                    sessionStorage.removeItem('colts_session');
                    sessionStorage.removeItem('colts_token');
                    window.location.href = '../index.html';
                }
            }
        });
    }
}

// ===== MOSTRAR/OCULTAR INPUTS DE FECHA =====
function toggleDateInputs() {
    const tipo = document.getElementById('tipoReporte').value;
    document.getElementById('fechaGroup').style.display = tipo === 'dia' ? 'block' : 'none';
    document.getElementById('rangoGroup').style.display = tipo === 'rango' ? 'block' : 'none';
}

// ===== GENERAR REPORTE =====
async function generarReporte() {
    console.log('🔍 Generando reporte...');
    const tipo = document.getElementById('tipoReporte').value;
    const empleadoId = document.getElementById('empleadoFiltro').value;

    try {
        let query = supabaseClient
            .from('asistencia')
            .select('*, empleados(nombre_completo, puesto)')
            .order('fecha', { ascending: false });

        if (tipo === 'dia') {
            const fecha = document.getElementById('fecha').value;
            if (!fecha) { showNotification('Selecciona una fecha', 'warning'); return; }
            query = query.eq('fecha', fecha);

        } else if (tipo === 'semana') {
            const hoy = new Date();
            const inicio = new Date(hoy);
            inicio.setDate(hoy.getDate() - 7);
            query = query.gte('fecha', inicio.toISOString().split('T')[0]).lte('fecha', hoy.toISOString().split('T')[0]);

        } else if (tipo === 'mes') {
            const hoy = new Date();
            const inicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
            query = query.gte('fecha', inicio.toISOString().split('T')[0]).lte('fecha', hoy.toISOString().split('T')[0]);

        } else if (tipo === 'rango') {
            const inicio = document.getElementById('fechaInicio').value;
            const fin = document.getElementById('fechaFin').value;
            if (!inicio || !fin) { showNotification('Selecciona ambas fechas', 'warning'); return; }
            if (inicio > fin) { showNotification('La fecha de inicio debe ser menor a la fecha fin', 'error'); return; }
            query = query.gte('fecha', inicio).lte('fecha', fin);
        }

        if (empleadoId !== 'todos') {
            query = query.eq('empleado_id', empleadoId);
        }

        const { data, error } = await query;
        if (error) throw error;

        currentData = data || [];
        renderTabla();

        if (currentData.length === 0) {
            showNotification('No hay datos para los filtros seleccionados', 'info');
        } else {
            showNotification(`Se encontraron ${currentData.length} registros`, 'success');
        }

    } catch (error) {
        console.error('Error generando reporte:', error);
        showNotification('Error al generar el reporte', 'error');
    }
}

// ===== RENDERIZAR TABLA =====
function renderTabla() {
    let html = '';
    let totalHoras = 0;

    if (currentData.length === 0) {
        html = `
            <tr>
                <td colspan="6" class="loading" style="text-align:center;padding:3rem;">
                    <i class="fas fa-chart-bar" style="font-size:2rem;color:var(--primary-blue);margin-bottom:1rem;"></i>
                    <div>No hay datos para mostrar</div>
                </td>
            </tr>`;
        document.getElementById('resumenTotales').style.display = 'none';
    } else {
        currentData.forEach(reg => {
            totalHoras += parseFloat(reg.horas_trabajadas) || 0;
            html += `
                <tr>
                    <td>${new Date(reg.fecha + 'T12:00:00').toLocaleDateString('es-MX')}</td>
                    <td>${reg.empleados?.nombre_completo || 'N/A'}</td>
                    <td>${reg.empleados?.puesto || 'N/A'}</td>
                    <td>${formatTime(reg.hora_entrada)}</td>
                    <td>${formatTime(reg.hora_salida)}</td>
                    <td>${reg.horas_trabajadas ? parseFloat(reg.horas_trabajadas).toFixed(2) : '0.00'}</td>
                </tr>`;
        });

        document.getElementById('totalRegistros').textContent = `${currentData.length} registros`;
        document.getElementById('totalRegistrosNum').textContent = currentData.length;
        document.getElementById('totalHoras').textContent = totalHoras.toFixed(2);
        const diasUnicos = new Set(currentData.map(r => r.fecha)).size;
        document.getElementById('totalDias').textContent = diasUnicos;
        document.getElementById('resumenTotales').style.display = 'grid';
    }

    document.getElementById('reporteBody').innerHTML = html;
}

// ===== FORMATEAR HORA =====
function formatTime(timestamp) {
    if (!timestamp) return '--:--';
    return new Date(timestamp).toLocaleTimeString('es-MX', {
        hour: '2-digit', minute: '2-digit',
        hour12: true, timeZone: 'America/Mexico_City'
    });
}

// ===== EXPORTAR A EXCEL =====
function exportarExcel() {
    if (currentData.length === 0) {
        showNotification('No hay datos para exportar', 'warning');
        return;
    }
    try {
        const excelData = [
            ['Fecha', 'Empleado', 'Puesto', 'Entrada', 'Salida', 'Horas Trabajadas'],
            ...currentData.map(reg => [
                new Date(reg.fecha + 'T12:00:00').toLocaleDateString('es-MX'),
                reg.empleados?.nombre_completo || 'N/A',
                reg.empleados?.puesto || 'N/A',
                formatTime(reg.hora_entrada),
                formatTime(reg.hora_salida),
                reg.horas_trabajadas ? parseFloat(reg.horas_trabajadas).toFixed(2) : '0.00'
            ])
        ];

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet(excelData);
        ws['!cols'] = [{ wch: 12 }, { wch: 30 }, { wch: 20 }, { wch: 10 }, { wch: 10 }, { wch: 15 }];
        XLSX.utils.book_append_sheet(wb, ws, 'Asistencia');

        const fecha = new Date().toISOString().split('T')[0];
        XLSX.writeFile(wb, `reporte_colts_${fecha}.xlsx`);
        showNotification('Excel generado exitosamente', 'success');

    } catch (error) {
        console.error('Error exportando a Excel:', error);
        showNotification('Error al exportar a Excel', 'error');
    }
}

// ===== LIMPIAR FILTROS =====
function limpiarFiltros() {
    document.getElementById('tipoReporte').value = 'dia';
    setDefaultDates();
    toggleDateInputs();
    document.getElementById('empleadoFiltro').value = 'todos';
    document.getElementById('reporteBody').innerHTML = `
        <tr>
            <td colspan="6" class="loading" style="text-align:center;padding:3rem;">
                <i class="fas fa-chart-bar" style="font-size:2rem;color:var(--primary-blue);margin-bottom:1rem;"></i>
                <div>Selecciona filtros y genera un reporte</div>
            </td>
        </tr>`;
    document.getElementById('resumenTotales').style.display = 'none';
    document.getElementById('totalRegistros').textContent = '0 registros';
    currentData = [];
    showNotification('Filtros limpiados', 'info');
}

// ===== MOSTRAR NOTIFICACIÓN =====
function showNotification(message, type = 'info') {
    if (window.showNotification && window.showNotification !== showNotification) {
        window.showNotification(message, type);
        return;
    }

    const container = document.getElementById('notifications');
    if (!container) return;

    const notification = document.createElement('div');
    notification.className = `notification ${type}`;

    const icons = { success: 'check-circle', error: 'exclamation-circle', warning: 'exclamation-triangle', info: 'info-circle' };
    const icon = icons[type] || 'info-circle';

    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas fa-${icon}"></i>
            <span>${message}</span>
        </div>
        <button class="notification-close"><i class="fas fa-times"></i></button>`;

    container.appendChild(notification);
    setTimeout(() => notification.classList.add('show'), 10);

    notification.querySelector('.notification-close').addEventListener('click', () => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    });

    setTimeout(() => {
        if (notification.parentNode) {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }
    }, 5000);
}

console.log('✅ reportes.js cargado completamente');