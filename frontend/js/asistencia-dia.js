// ===== ASISTENCIA DEL DÍA - Mini Abarrotes COLT'S =====
console.log('📅 Módulo de Asistencia del Día inicializando...');

let supabaseClient = null;

document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 Inicializando asistencia del día...');
    
    if (typeof protectPage === 'function' && !protectPage()) return;
    
    await initSupabase();
    updateDateTime();
    startDateTimeUpdates();
    loadUserData();
    await loadTodayAttendance();
    setupEvents();

    // ✅ MENÚ HAMBURGUESA
    if (typeof setupMobileMenu === 'function') {
        setupMobileMenu();
    } else {
        initMobileMenuFallback();
    }

    console.log('✅ Asistencia del día lista');
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
}

// ===== INICIALIZAR SUPABASE =====
async function initSupabase() {
    try {
        if (typeof supabase === 'undefined') {
            showNotification('Error: Supabase no cargado', 'error');
            return false;
        }
        const SUPABASE_URL = window.supabaseConfig?.SUPABASE_URL || 'https://iokkxkpfncbumnjamquh.supabase.co';
        const SUPABASE_KEY = window.supabaseConfig?.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlva2t4a3BmbmNidW1uamFtcXVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA0MzE3MzgsImV4cCI6MjA4NjAwNzczOH0.7eKVc1I0v5n5zaB4rUEASizm05cFWTieOgtgMmZku6w';
        supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
        console.log('✅ Supabase conectado');
        return true;
    } catch (error) {
        showNotification('Error inicializando sistema', 'error');
        return false;
    }
}

// ===== USUARIO =====
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

// ===== CARGAR ASISTENCIA DEL DÍA =====
async function loadTodayAttendance() {
    console.log('📥 Cargando asistencia del día...');
    try {
        const today = new Date().toISOString().split('T')[0];

        const { data: empleados, error: empError } = await supabaseClient
            .from('empleados')
            .select('id, nombre_completo, puesto')
            .eq('activo', true)
            .order('nombre_completo');
        if (empError) throw empError;

        const { data: asistencia, error: asisError } = await supabaseClient
            .from('asistencia')
            .select('*')
            .eq('fecha', today);
        if (asisError) throw asisError;

        const asistenciaMap = {};
        asistencia?.forEach(a => { asistenciaMap[a.empleado_id] = a; });

        const badge = document.getElementById('asistenciaHoy');
        if (badge) badge.textContent = asistencia?.length || 0;

        const presentes = asistencia?.filter(a => a.hora_entrada !== null).length || 0;
        const pendientes = asistencia?.filter(a => a.hora_entrada !== null && a.hora_salida === null).length || 0;
        const ausentes = (empleados?.length || 0) - presentes;

        document.getElementById('presentesCount').textContent = presentes;
        document.getElementById('pendientesCount').textContent = pendientes;
        document.getElementById('ausentesCount').textContent = ausentes;
        document.getElementById('todayDate').textContent = new Date().toLocaleDateString('es-MX', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            timeZone: 'America/Mexico_City'
        });

        renderAttendanceTable(empleados || [], asistenciaMap);

    } catch (error) {
        console.error('❌ Error cargando asistencia:', error);
        showNotification('Error al cargar la asistencia', 'error');
        document.getElementById('attendanceBody').innerHTML = `
            <tr><td colspan="6" class="loading">
                <i class="fas fa-exclamation-triangle"></i>
                <div>Error al cargar datos</div>
            </td></tr>`;
    }
}

// ===== RENDERIZAR TABLA =====
function renderAttendanceTable(empleados, asistenciaMap) {
    if (empleados.length === 0) {
        document.getElementById('attendanceBody').innerHTML = `
            <tr><td colspan="6" class="loading">
                <i class="fas fa-users-slash"></i>
                <div>No hay empleados registrados</div>
            </td></tr>`;
        return;
    }

    let html = '';
    empleados.forEach(emp => {
        const registro = asistenciaMap[emp.id];
        const tieneEntrada = registro?.hora_entrada;
        const tieneSalida = registro?.hora_salida;

        const estado = !tieneEntrada ? 'ausente' : !tieneSalida ? 'pendiente' : 'completo';
        const entradaTime = tieneEntrada ? formatTime(registro.hora_entrada) : '--:--';
        const salidaTime = tieneSalida ? formatTime(registro.hora_salida) : '--:--';

        html += `
            <tr class="estado-${estado}">
                <td><strong>${emp.nombre_completo}</strong></td>
                <td>${emp.puesto || 'Sin puesto'}</td>
                <td>${entradaTime}</td>
                <td>${salidaTime}</td>
                <td>${registro?.horas_trabajadas ? parseFloat(registro.horas_trabajadas).toFixed(2) : '0.00'}</td>
                <td>
                    <span class="badge-${estado}">
                        ${estado === 'completo' ? '✅ Completo' : estado === 'pendiente' ? '⏳ Pendiente' : '❌ Ausente'}
                    </span>
                </td>
            </tr>`;
    });

    document.getElementById('attendanceBody').innerHTML = html;
}

// ===== FORMATEAR HORA =====
function formatTime(timestamp) {
    if (!timestamp) return '--:--';
    return new Date(timestamp).toLocaleTimeString('es-MX', {
        hour: '2-digit', minute: '2-digit',
        hour12: true, timeZone: 'America/Mexico_City'
    });
}

// ===== EVENTOS =====
function setupEvents() {
    // ⚠️ NO manejamos menuToggle aquí — lo hace setupMobileMenu/fallback

    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            refreshBtn.classList.add('fa-spin');
            loadTodayAttendance().finally(() => {
                setTimeout(() => refreshBtn.classList.remove('fa-spin'), 500);
            });
            showNotification('Datos actualizados', 'success');
        });
    }

    const refreshDataBtn = document.getElementById('refreshDataBtn');
    if (refreshDataBtn) {
        refreshDataBtn.addEventListener('click', () => {
            refreshDataBtn.classList.add('fa-spin');
            loadTodayAttendance().finally(() => {
                setTimeout(() => refreshDataBtn.classList.remove('fa-spin'), 500);
            });
        });
    }

    const exportBtn = document.getElementById('exportDayBtn');
    if (exportBtn) {
        exportBtn.addEventListener('click', exportToExcel);
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
                if (typeof logout === 'function') logout();
                else {
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

function exportToExcel() {
    showNotification('Función de exportación disponible próximamente', 'info');
}

// ===== NOTIFICACIONES =====
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
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas fa-${icons[type] || 'info-circle'}"></i>
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

console.log('✅ asistencia-dia.js cargado completamente');