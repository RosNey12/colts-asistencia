// ===== ASISTENCIA DEL DÍA - Mini Abarrotes COLT'S =====
console.log('📅 Módulo de Asistencia del Día inicializando...');

// ===== CONFIGURACIÓN =====
let supabaseClient = null;

// ===== INICIALIZACIÓN PRINCIPAL =====
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 Inicializando asistencia del día...');
    
    // 1. Verificar autenticación
    if (typeof protectPage === 'function' && !protectPage()) {
        console.log('⛔ Página protegida - redirigiendo');
        return;
    }
    
    console.log('✅ Usuario autenticado');
    
    // 2. Inicializar Supabase
    await initSupabase();
    
    // 3. Inicializar fecha/hora (¡ESTA PARTE FALTABA!)
    updateDateTime();
    startDateTimeUpdates();
    
    // 4. Cargar datos del usuario
    loadUserData();
    
    // 5. Cargar asistencia del día
    await loadTodayAttendance();
    
    // 6. Configurar eventos
    setupEvents();
    
    console.log('✅ Asistencia del día lista');
});

// ===== INICIALIZAR SUPABASE =====
async function initSupabase() {
    try {
        if (typeof supabase === 'undefined') {
            console.error('❌ Supabase no está disponible');
            showNotification('Error: Supabase no cargado', 'error');
            return false;
        }
        
        const SUPABASE_URL = window.supabaseConfig?.SUPABASE_URL || 'https://iokkxkpfncbumnjamquh.supabase.co';
        const SUPABASE_KEY = window.supabaseConfig?.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlva2t4a3BmbmNidW1uamFtcXVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA0MzE3MzgsImV4cCI6MjA4NjAwNzczOH0.7eKVc1I0v5n5zaB4rUEASizm05cFWTieOgtgMmZku6w';
        
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
        const sessionData = localStorage.getItem('colts_session') || 
                           sessionStorage.getItem('colts_session');
        
        if (sessionData) {
            const session = JSON.parse(sessionData);
            
            const userName = document.getElementById('userName');
            const userEmail = document.getElementById('userEmail');
            
            if (userName) userName.textContent = 'Administrador';
            if (userEmail) userEmail.textContent = session.usuario || 'colts';
            
            // Actualizar badge de empleados
            updateEmployeeCount();
        }
    } catch (error) {
        console.error('Error cargando datos usuario:', error);
    }
}

// ===== ACTUALIZAR CONTADOR DE EMPLEADOS =====
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

// ===== ACTUALIZAR FECHA Y HORA (¡FUNCIÓN NUEVA!) =====
function updateDateTime() {
    try {
        const now = new Date();
        
        // Formatear fecha
        const optionsDate = { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        };
        const dateStr = now.toLocaleDateString('es-MX', optionsDate);
        
        // Formatear hora
        const timeStr = now.toLocaleTimeString('es-MX', { 
            hour: '2-digit', 
            minute: '2-digit', 
            second: '2-digit',
            hour12: true
        });
        
        // Actualizar elementos
        const currentDateElem = document.getElementById('currentDate');
        const currentTimeElem = document.getElementById('currentTime');
        
        if (currentDateElem) {
            currentDateElem.textContent = dateStr;
        }
        if (currentTimeElem) {
            currentTimeElem.textContent = timeStr;
        }
        
    } catch (error) {
        console.error('❌ Error actualizando fecha/hora:', error);
    }
}

// ===== INICIAR ACTUALIZACIONES DE FECHA/HORA =====
function startDateTimeUpdates() {
    // Actualizar cada segundo
    setInterval(updateDateTime, 1000);
}

// ===== CARGAR ASISTENCIA DEL DÍA =====
async function loadTodayAttendance() {
    console.log('📥 Cargando asistencia del día...');
    
    try {
        const today = new Date().toISOString().split('T')[0];
        
        // Obtener todos los empleados activos
        const { data: empleados, error: empError } = await supabaseClient
            .from('empleados')
            .select('id, nombre_completo, puesto')
            .eq('activo', true)
            .order('nombre_completo');
        
        if (empError) throw empError;
        
        // Obtener asistencia de hoy
        const { data: asistencia, error: asisError } = await supabaseClient
            .from('asistencia')
            .select('*')
            .eq('fecha', today);
        
        if (asisError) throw asisError;
        
        // Crear mapa de asistencia
        const asistenciaMap = {};
        asistencia?.forEach(a => {
            asistenciaMap[a.empleado_id] = a;
        });
        
        // Actualizar contador de asistencia en sidebar
        const badge = document.getElementById('asistenciaHoy');
        if (badge) badge.textContent = asistencia?.length || 0;
        
        // Calcular estadísticas
        const presentes = asistencia?.filter(a => a.hora_entrada !== null).length || 0;
        const pendientes = asistencia?.filter(a => a.hora_entrada !== null && a.hora_salida === null).length || 0;
        const ausentes = (empleados?.length || 0) - presentes;
        
        // Actualizar stats
        document.getElementById('presentesCount').textContent = presentes;
        document.getElementById('pendientesCount').textContent = pendientes;
        document.getElementById('ausentesCount').textContent = ausentes;
        document.getElementById('todayDate').textContent = 
            new Date().toLocaleDateString('es-MX', { 
                day: '2-digit', 
                month: '2-digit', 
                year: 'numeric' 
            });
        
        // Renderizar tabla
        renderAttendanceTable(empleados || [], asistenciaMap);
        
    } catch (error) {
        console.error('❌ Error cargando asistencia:', error);
        showNotification('Error al cargar la asistencia', 'error');
        
        document.getElementById('attendanceBody').innerHTML = `
            <tr>
                <td colspan="6" class="loading">
                    <i class="fas fa-exclamation-triangle"></i>
                    <div>Error al cargar datos</div>
                </td>
            </tr>
        `;
    }
}

// ===== RENDERIZAR TABLA DE ASISTENCIA =====
function renderAttendanceTable(empleados, asistenciaMap) {
    let html = '';
    let presentes = 0;
    let pendientes = 0;
    let ausentes = 0;
    
    empleados.forEach(emp => {
        const registro = asistenciaMap[emp.id];
        const tieneEntrada = registro?.hora_entrada;
        const tieneSalida = registro?.hora_salida;
        
        if (tieneEntrada) presentes++;
        if (tieneEntrada && !tieneSalida) pendientes++;
        if (!tieneEntrada) ausentes++;
        
        const estado = !tieneEntrada ? 'ausente' : 
                      !tieneSalida ? 'pendiente' : 'completo';
        
        const entradaTime = registro?.hora_entrada ? 
            formatTime(registro.hora_entrada) : '--:--';
        const salidaTime = registro?.hora_salida ? 
            formatTime(registro.hora_salida) : '--:--';
        
        html += `
            <tr class="estado-${estado}">
                <td><strong>${emp.nombre_completo}</strong></td>
                <td>${emp.puesto || 'Sin puesto'}</td>
                <td>${entradaTime}</td>
                <td>${salidaTime}</td>
                <td>${registro?.horas_trabajadas ? registro.horas_trabajadas.toFixed(2) : '0.00'}</td>
                <td>
                    <span class="badge-${estado}">
                        ${estado === 'completo' ? '✅ Completo' : 
                          estado === 'pendiente' ? '⏳ Pendiente' : '❌ Ausente'}
                    </span>
                </td>
            </tr>
        `;
    });
    
    // Si no hay empleados
    if (empleados.length === 0) {
        html = `
            <tr>
                <td colspan="6" class="loading">
                    <i class="fas fa-users-slash"></i>
                    <div>No hay empleados registrados</div>
                </td>
            </tr>
        `;
    }
    
    document.getElementById('attendanceBody').innerHTML = html;
}

// ===== FORMATEAR HORA (con zona horaria correcta) =====
function formatTime(timestamp) {
    if (!timestamp) return '--:--';
    
    const date = new Date(timestamp);
    const options = {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZone: 'America/Mexico_City'
    };
    
    return date.toLocaleTimeString('es-MX', options);
}

// ===== CONFIGURAR EVENTOS =====
function setupEvents() {
    console.log('🎮 Configurando eventos...');
    
    // Menu toggle
    const menuToggle = document.getElementById('menuToggle');
    if (menuToggle) {
        const sidebar = document.querySelector('.sidebar');
        menuToggle.addEventListener('click', () => {
            sidebar.classList.toggle('collapsed');
        });
    }
    
    // Botón de refresh
    const refreshBtn = document.getElementById('refreshBtn');
    const refreshDataBtn = document.getElementById('refreshDataBtn');
    
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            refreshBtn.classList.add('fa-spin');
            loadTodayAttendance().finally(() => {
                setTimeout(() => refreshBtn.classList.remove('fa-spin'), 500);
            });
            showNotification('Datos actualizados', 'success');
        });
    }
    
    if (refreshDataBtn) {
        refreshDataBtn.addEventListener('click', () => {
            refreshDataBtn.classList.add('fa-spin');
            loadTodayAttendance().finally(() => {
                setTimeout(() => refreshDataBtn.classList.remove('fa-spin'), 500);
            });
        });
    }
    
    // Botón de exportar
    const exportBtn = document.getElementById('exportDayBtn');
    if (exportBtn) {
        exportBtn.addEventListener('click', exportToExcel);
    }
    
    // Volver al dashboard
    const backBtn = document.getElementById('backToDashboard');
    if (backBtn) {
        backBtn.addEventListener('click', (e) => {
            e.preventDefault();
            window.location.href = '../dashboard.html';
        });
    }
    
    // Logout
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

// ===== EXPORTAR A EXCEL (pendiente) =====
function exportToExcel() {
    showNotification('Función de exportación disponible próximamente', 'info');
}

// ===== MOSTRAR NOTIFICACIÓN =====
function showNotification(message, type = 'info') {
    console.log(`📢 [${type}] ${message}`);
    
    const container = document.getElementById('notifications');
    if (!container) return;
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    
    let icon = 'info-circle';
    if (type === 'success') icon = 'check-circle';
    if (type === 'error') icon = 'exclamation-circle';
    if (type === 'warning') icon = 'exclamation-triangle';
    
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas fa-${icon}"></i>
            <span>${message}</span>
        </div>
        <button class="notification-close">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    container.appendChild(notification);
    
    setTimeout(() => notification.classList.add('show'), 10);
    
    const closeBtn = notification.querySelector('.notification-close');
    closeBtn.addEventListener('click', () => {
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