// ===== DASHBOARD MINI ABARROTES COLT'S - VERSIÓN FINAL CON DATOS REALES =====
console.log('📊 Dashboard COLT\'S inicializando...');

// ===== CONFIGURACIÓN =====
let supabaseClient = null;
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();

// ===== INICIALIZACIÓN PRINCIPAL =====
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 Iniciando dashboard...');
    
    // 1. Verificar autenticación
    if (!protectPage()) {
        console.log('⛔ Página protegida - redirigiendo');
        return;
    }
    
    console.log('✅ Usuario autenticado');
    
    // 2. Inicializar Supabase
    await initSupabase();
    
    // 3. Actualizar fecha/hora
    updateDateTime();
    startDateTimeUpdates();
    
    // 4. Cargar TODOS los datos desde Supabase
    await loadDashboardStats();     // Carga estadísticas reales
    await loadRecentActivity();     // Carga actividad real
    await loadSystemStatus();       // Carga estado real del sistema
    await updateCalendarGrid();     // Carga calendario con datos reales
    
    // 5. Inicializar calendario y consejos
    initCalendar();
    loadDailyTip();
    
    // 6. Configurar eventos UI
    setupUIEvents();
    // ===== CONFIGURAR MENÚ MÓVIL =====
function setupMobileMenu() {
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.querySelector('.sidebar');
    
    // Crear overlay si no existe
    let overlay = document.querySelector('.sidebar-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.className = 'sidebar-overlay';
        document.body.appendChild(overlay);
    }
    
    // Abrir menú
    menuToggle.addEventListener('click', () => {
        sidebar.classList.add('mobile-active');
        overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    });
    
    // Cerrar menú al hacer clic en overlay
    overlay.addEventListener('click', () => {
        sidebar.classList.remove('mobile-active');
        overlay.classList.remove('active');
        document.body.style.overflow = '';
    });
    
    // Cerrar menú al seleccionar una opción
    const menuLinks = document.querySelectorAll('.sidebar-menu a');
    menuLinks.forEach(link => {
        link.addEventListener('click', () => {
            sidebar.classList.remove('mobile-active');
            overlay.classList.remove('active');
            document.body.style.overflow = '';
        });
    });
    
    // Cerrar menú al hacer clic en logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            sidebar.classList.remove('mobile-active');
            overlay.classList.remove('active');
            document.body.style.overflow = '';
        });
    }
    
    // Manejar resize de ventana
    window.addEventListener('resize', () => {
        if (window.innerWidth > 992) {
            sidebar.classList.remove('mobile-active');
            overlay.classList.remove('active');
            document.body.style.overflow = '';
        }
    });
}

// Llama a esta función dentro de setupUIEvents()
// Al final de setupUIEvents(), agrega:
setupMobileMenu();
    // 7. Configurar eventos de los cards (navegación)
    setupCardEvents();
    
    // 8. Actualizar cada 30 segundos (opcional)
    setInterval(async () => {
        await loadDashboardStats();
        await loadRecentActivity();
    }, 30000);
    
    console.log('✅ Dashboard completamente inicializado');
});

// ===== INICIALIZAR SUPABASE =====
async function initSupabase() {
    try {
        const SUPABASE_URL = window.supabaseConfig?.SUPABASE_URL || 'https://iokkxkpfncbumnjamquh.supabase.co';
        const SUPABASE_KEY = window.supabaseConfig?.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlva2t4a3BmbmNidW1uamFtcXVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA0MzE3MzgsImV4cCI6MjA4NjAwNzczOH0.7eKVc1I0v5n5zaB4rUEASizm05cFWTieOgtgMmZku6w';
        
        supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
        console.log('✅ Supabase conectado');
        
        // Verificar conexión
        const { error } = await supabaseClient.from('empleados').select('count', { count: 'exact', head: true });
        if (error) throw error;
        
        return true;
    } catch (error) {
        console.error('❌ Error conectando a Supabase:', error);
        showNotification('Error de conexión con la base de datos', 'error');
        return false;
    }
}

// ===== PROTEGER PÁGINA =====
function protectPage() {
    try {
        const session = localStorage.getItem('colts_session') || sessionStorage.getItem('colts_session');
        const token = localStorage.getItem('colts_token') || sessionStorage.getItem('colts_token');
        
        if (!session || token !== 'authenticated') {
            setTimeout(() => window.location.href = 'index.html', 1500);
            return false;
        }
        return true;
    } catch (error) {
        return false;
    }
}

// ===== ACTUALIZAR FECHA Y HORA =====
function updateDateTime() {
    const now = new Date();
    
    const dateElement = document.getElementById('currentDate');
    const timeElement = document.getElementById('currentTime');
    
    if (dateElement) {
        dateElement.textContent = now.toLocaleDateString('es-MX', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        });
    }
    
    if (timeElement) {
        timeElement.textContent = now.toLocaleTimeString('es-MX', {
            hour: '2-digit', minute: '2-digit', second: '2-digit'
        });
    }
}

function startDateTimeUpdates() {
    setInterval(updateDateTime, 1000);
}

// ===== CONFIGURAR EVENTOS DE CARDS (NAVEGACIÓN) =====
function setupCardEvents() {
    // Card de Total Empleados -> Lista de empleados
    const totalEmpleadosCard = document.querySelector('.stat-card:first-child');
    if (totalEmpleadosCard) {
        totalEmpleadosCard.style.cursor = 'pointer';
        totalEmpleadosCard.addEventListener('click', () => {
            window.location.href = 'empleados/lista.html';
        });
    }
    
    // Card de Presentes Hoy -> Asistencia del día
    const presentesCard = document.querySelector('.stat-card:nth-child(2)');
    if (presentesCard) {
        presentesCard.style.cursor = 'pointer';
        presentesCard.addEventListener('click', () => {
            window.location.href = 'asistencia/dia.html';
        });
    }
    
    // Card de Pendientes Salida -> Asistencia del día (filtro pendientes)
    const pendientesCard = document.querySelector('.stat-card:nth-child(3)');
    if (pendientesCard) {
        pendientesCard.style.cursor = 'pointer';
        pendientesCard.addEventListener('click', () => {
            window.location.href = 'asistencia/dia.html?filter=pendientes';
        });
    }
    
    // Card de Faltas Hoy -> Asistencia del día (filtro ausentes)
    const faltasCard = document.querySelector('.stat-card:nth-child(4)');
    if (faltasCard) {
        faltasCard.style.cursor = 'pointer';
        faltasCard.addEventListener('click', () => {
            window.location.href = 'asistencia/dia.html?filter=ausentes';
        });
    }
}

// ===== CARGAR ESTADÍSTICAS REALES DESDE SUPABASE =====
async function loadDashboardStats() {
    console.log('📈 Cargando estadísticas desde Supabase...');
    
    try {
        const today = new Date().toISOString().split('T')[0];
        
        // 1. OBTENER TOTAL DE EMPLEADOS ACTIVOS (REAL)
        const { count: totalEmpleados, error: empError } = await supabaseClient
            .from('empleados')
            .select('*', { count: 'exact', head: true })
            .eq('activo', true);
        
        if (empError) throw empError;
        console.log(`📊 Total empleados activos: ${totalEmpleados}`);
        
        // 2. OBTENER ASISTENCIA DE HOY (REAL)
        const { data: asistencia, error: asisError } = await supabaseClient
            .from('asistencia')
            .select('*')
            .eq('fecha', today);
        
        if (asisError) throw asisError;
        console.log(`📊 Asistencia hoy: ${asistencia?.length || 0} registros`);
        
        // 3. CALCULAR ESTADÍSTICAS REALES
        const presentes = asistencia?.filter(a => a.hora_entrada !== null).length || 0;
        const conSalida = asistencia?.filter(a => a.hora_salida !== null).length || 0;
        const pendientes = presentes - conSalida;
        const faltas = (totalEmpleados || 0) - presentes;
        
        // 4. CALCULAR PORCENTAJES REALES
        const presentesPercent = totalEmpleados > 0 ? Math.round((presentes / totalEmpleados) * 100) : 0;
        const faltasPercent = totalEmpleados > 0 ? Math.round((faltas / totalEmpleados) * 100) : 0;
        
        // 5. ACTUALIZAR UI CON DATOS REALES
        document.getElementById('totalEmpleados').textContent = totalEmpleados || 0;
        document.getElementById('presentesHoy').textContent = presentes;
        document.getElementById('pendientesSalida').textContent = pendientes < 0 ? 0 : pendientes;
        document.getElementById('faltasHoy').textContent = faltas < 0 ? 0 : faltas;
        
        document.getElementById('presentesPercent').textContent = `${presentesPercent}%`;
        document.getElementById('faltasPercent').textContent = `${faltasPercent}%`;
        
        // 6. ACTUALIZAR BADGES DEL SIDEBAR
        document.getElementById('empleadosCount').textContent = totalEmpleados || 0;
        document.getElementById('asistenciaHoy').textContent = presentes;
        
        // 7. CALCULAR LA ENTRADA MÁS TEMPRANA (si existe)
        if (asistencia && asistencia.length > 0) {
            const entradas = asistencia
                .filter(a => a.hora_entrada)
                .map(a => new Date(a.hora_entrada));
            
            if (entradas.length > 0) {
                const masTemprana = new Date(Math.min(...entradas));
                document.getElementById('entradaMasTemprana').textContent = 
                    masTemprana.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
            } else {
                document.getElementById('entradaMasTemprana').textContent = '--:--';
            }
        } else {
            document.getElementById('entradaMasTemprana').textContent = '--:--';
        }
        
        // 8. ACTUALIZAR TEXTO DE CAMBIO
        document.getElementById('empleadosChange').innerHTML = 
            `<i class="fas fa-users"></i> ${totalEmpleados || 0} activos totales`;
        
        console.log('✅ Estadísticas actualizadas con datos reales');
        
    } catch (error) {
        console.error('❌ Error cargando estadísticas:', error);
        showNotification('Error al cargar estadísticas', 'error');
    }
}

// ===== CARGAR ESTADO REAL DEL SISTEMA =====
async function loadSystemStatus() {
    try {
        // Verificar conexión a Supabase
        const { error: dbError } = await supabaseClient
            .from('empleados')
            .select('count', { count: 'exact', head: true });
        
        const dbStatus = !dbError;
        
        // Verificar autenticación (si hay sesión)
        const session = localStorage.getItem('colts_session') || sessionStorage.getItem('colts_session');
        const authStatus = !!session;
        
        // Actualizar UI
        const dbElement = document.querySelector('.status-item.online:first-child span');
        const authElement = document.querySelector('.status-item.online:nth-child(2) span');
        
        if (dbElement) {
            dbElement.textContent = dbStatus ? 'Base de datos: Conectada' : 'Base de datos: Error';
            if (!dbStatus) dbElement.closest('.status-item').classList.remove('online');
        }
        
        if (authElement) {
            authElement.textContent = authStatus ? 'Autenticación: Activa' : 'Autenticación: Inactiva';
            if (!authStatus) authElement.closest('.status-item').classList.remove('online');
        }
        
        // Hora de auto-salida (fija)
        document.getElementById('autoExitTime').textContent = '22:00';
        
    } catch (error) {
        console.error('Error cargando estado del sistema:', error);
    }
}

// ===== CARGAR ACTIVIDAD RECIENTE REAL =====
async function loadRecentActivity() {
    const activityList = document.getElementById('activityList');
    if (!activityList) return;
    
    try {
        const today = new Date().toISOString().split('T')[0];
        
        const { data: asistencia, error } = await supabaseClient
            .from('asistencia')
            .select(`
                *,
                empleados (nombre_completo, puesto)
            `)
            .eq('fecha', today)
            .order('created_at', { ascending: false })
            .limit(10);
        
        if (error) throw error;
        
        if (!asistencia || asistencia.length === 0) {
            activityList.innerHTML = `
                <div class="activity-item">
                    <div class="activity-icon" style="background: var(--medium-gray); color: var(--dark-gray);">
                        <i class="fas fa-clock"></i>
                    </div>
                    <div class="activity-details">
                        <h4>Sin actividad hoy</h4>
                        <p>No hay registros de asistencia aún</p>
                    </div>
                </div>
            `;
            return;
        }
        
        let html = '';
        asistencia.forEach(reg => {
            const empleado = reg.empleados;
            const hora = reg.hora_entrada ? new Date(reg.hora_entrada) : null;
            const horaSalida = reg.hora_salida ? new Date(reg.hora_salida) : null;
            
            let icono = 'fa-sign-in-alt';
            let bgColor = 'var(--success-green)';
            let texto = 'Entrada registrada';
            
            if (horaSalida) {
                icono = 'fa-sign-out-alt';
                bgColor = 'var(--warning-orange)';
                texto = 'Salida registrada';
            }
            
            html += `
                <div class="activity-item">
                    <div class="activity-icon" style="background: ${bgColor};">
                        <i class="fas ${icono}"></i>
                    </div>
                    <div class="activity-details">
                        <h4>${empleado?.nombre_completo || 'Empleado'}</h4>
                        <p>${texto} - ${empleado?.puesto || 'Sin puesto'}</p>
                    </div>
                    <div class="activity-time">
                        ${hora ? hora.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                        ${horaSalida ? ` / ${horaSalida.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}` : ''}
                    </div>
                </div>
            `;
        });
        
        activityList.innerHTML = html;
        
    } catch (error) {
        console.error('Error cargando actividad:', error);
        activityList.innerHTML = `
            <div class="activity-item">
                <div class="activity-icon" style="background: var(--error-red);">
                    <i class="fas fa-exclamation-triangle"></i>
                </div>
                <div class="activity-details">
                    <h4>Error cargando actividad</h4>
                    <p>Intenta recargar la página</p>
                </div>
            </div>
        `;
    }
}

// ===== INICIALIZAR CALENDARIO =====
function initCalendar() {
    const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    
    // Actualizar título del mes
    updateCalendarTitle(monthNames);
    
    // Configurar navegación
    document.getElementById('prevMonth').addEventListener('click', async () => {
        currentMonth--;
        if (currentMonth < 0) {
            currentMonth = 11;
            currentYear--;
        }
        updateCalendarTitle(monthNames);
        await updateCalendarGrid();
    });
    
    document.getElementById('nextMonth').addEventListener('click', async () => {
        currentMonth++;
        if (currentMonth > 11) {
            currentMonth = 0;
            currentYear++;
        }
        updateCalendarTitle(monthNames);
        await updateCalendarGrid();
    });
}

function updateCalendarTitle(monthNames) {
    document.getElementById('currentMonth').textContent = 
        `${monthNames[currentMonth]} ${currentYear}`;
}

// ===== ACTUALIZAR CALENDARIO CON DATOS REALES =====
async function updateCalendarGrid() {
    const calendarGrid = document.getElementById('calendarGrid');
    if (!calendarGrid) return;
    
    calendarGrid.innerHTML = '';
    
    // Días de la semana
    ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].forEach(day => {
        const dayElement = document.createElement('div');
        dayElement.className = 'calendar-day header';
        dayElement.textContent = day;
        calendarGrid.appendChild(dayElement);
    });
    
    // Obtener datos de asistencia del mes desde Supabase
    const primerDia = new Date(currentYear, currentMonth, 1);
    const ultimoDia = new Date(currentYear, currentMonth + 1, 0);
    
    try {
        const { data: asistencia, error } = await supabaseClient
            .from('asistencia')
            .select('fecha')
            .gte('fecha', primerDia.toISOString().split('T')[0])
            .lte('fecha', ultimoDia.toISOString().split('T')[0]);
        
        if (error) throw error;
        
        // Crear mapa de días con asistencia
        const diasConAsistencia = new Set();
        asistencia?.forEach(reg => {
            diasConAsistencia.add(reg.fecha);
        });
        
        // Obtener primer día del mes
        const firstDay = primerDia.getDay();
        const daysInMonth = ultimoDia.getDate();
        const today = new Date();
        
        // Agregar días vacíos al inicio
        for (let i = 0; i < firstDay; i++) {
            const emptyDay = document.createElement('div');
            emptyDay.className = 'calendar-day empty';
            calendarGrid.appendChild(emptyDay);
        }
        
        // Agregar días del mes
        for (let day = 1; day <= daysInMonth; day++) {
            const dayElement = document.createElement('div');
            dayElement.className = 'calendar-day';
            dayElement.textContent = day;
            
            const fechaStr = `${currentYear}-${String(currentMonth+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
            
            // Verificar si es hoy
            if (currentYear === today.getFullYear() && 
                currentMonth === today.getMonth() && 
                day === today.getDate()) {
                dayElement.classList.add('today');
                dayElement.title = 'Hoy';
            }
            
            // Verificar si hubo asistencia (de la BD real)
            if (diasConAsistencia.has(fechaStr)) {
                dayElement.classList.add('present');
                dayElement.title = 'Hubo asistencia este día';
            } else if (new Date(fechaStr) < today) {
                // Días pasados sin asistencia
                dayElement.classList.add('absent');
                dayElement.title = 'No hubo asistencia';
            }
            
            calendarGrid.appendChild(dayElement);
        }
        
        console.log(`✅ Calendario actualizado con ${diasConAsistencia.size} días con asistencia`);
        
    } catch (error) {
        console.error('Error cargando calendario:', error);
    }
}

// ===== CARGAR CONSEJO DEL DÍA =====
function loadDailyTip() {
    const tips = [
        "📱 Usa el escáner QR para registrar entrada/salida rápidamente.",
        "👤 Si un empleado olvida su QR, usa el botón 'Registro Manual'.",
        "📊 Revisa los reportes Excel para llevar control de nómina.",
        "⏰ La auto-salida se activa a las 22:00 si no registraron salida.",
        "🆕 Agrega foto a los empleados para identificarlos mejor.",
        "📈 Las estadísticas muestran el rendimiento de la tienda.",
        "🔄 Actualiza la página si los datos no se reflejan.",
        "📅 Revisa el calendario para ver días con más asistencia.",
        "⚡ Las acciones rápidas te llevan a las funciones principales.",
        "📞 Contacta a soporte si tienes algún problema."
    ];
    
    const tipElement = document.getElementById('dailyTip');
    if (tipElement) {
        const today = new Date().getDate();
        const tipIndex = (today - 1) % tips.length;
        tipElement.textContent = tips[tipIndex];
    }
    
    // Configurar botón "siguiente consejo"
    const nextTipBtn = document.getElementById('nextTip');
    if (nextTipBtn) {
        let currentTipIndex = new Date().getDate() % tips.length;
        nextTipBtn.addEventListener('click', (e) => {
            e.preventDefault();
            currentTipIndex = (currentTipIndex + 1) % tips.length;
            if (tipElement) {
                tipElement.textContent = tips[currentTipIndex];
            }
            showNotification('Consejo actualizado', 'info', 1500);
        });
    }
}

// ===== CONFIGURAR EVENTOS UI =====
function setupUIEvents() {
    // Menu toggle
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.querySelector('.sidebar');
    if (menuToggle && sidebar) {
        menuToggle.addEventListener('click', () => {
            sidebar.classList.toggle('collapsed');
        });
    }
    
    // Refresh manual
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', async () => {
            refreshBtn.classList.add('fa-spin');
            await Promise.all([
                loadDashboardStats(),
                loadRecentActivity(),
                loadSystemStatus(),
                updateCalendarGrid()
            ]);
            setTimeout(() => refreshBtn.classList.remove('fa-spin'), 500);
            showNotification('Datos actualizados desde Supabase', 'success');
        });
    }
    
    // Quick actions
    document.getElementById('quickScanBtn')?.addEventListener('click', () => {
        window.location.href = 'asistencia/entrada.html';
    });
    
    document.getElementById('quickReportBtn')?.addEventListener('click', () => {
        window.location.href = 'reportes/index.html';
    });
    
    // Notificaciones
    document.getElementById('notificationBtn')?.addEventListener('click', () => {
        showNotification('No hay notificaciones nuevas', 'info');
    });
    
    // Ver toda la actividad
    document.getElementById('viewAllActivity')?.addEventListener('click', (e) => {
        e.preventDefault();
        window.location.href = 'asistencia/dia.html';
    });
    
   
    
    // Ayuda
    document.getElementById('helpBtn')?.addEventListener('click', (e) => {
        e.preventDefault();
        showNotification('Contacta a ney.almazanreyes123@gmail.com para ayuda', 'info');
    });
    
    // Logout
    document.getElementById('logoutBtn')?.addEventListener('click', (e) => {
        e.preventDefault();
        if (confirm('¿Cerrar sesión?')) {
            if (typeof logout === 'function') {
                logout();
            } else {
                localStorage.clear();
                sessionStorage.clear();
                window.location.href = 'index.html';
            }
        }
    });
}

// ===== MOSTRAR NOTIFICACIÓN =====
function showNotification(message, type = 'info', duration = 3000) {
    const container = document.getElementById('notifications');
    if (!container) return;
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    
    const icon = {
        success: 'check-circle',
        error: 'exclamation-circle',
        warning: 'exclamation-triangle',
        info: 'info-circle'
    }[type] || 'info-circle';
    
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas fa-${icon}"></i>
            <span>${message}</span>
        </div>
        <button class="notification-close"><i class="fas fa-times"></i></button>
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
    }, duration);
}

// ===== FUNCIÓN DE LOGOUT =====
function logout() {
    localStorage.removeItem('colts_session');
    localStorage.removeItem('colts_token');
    sessionStorage.removeItem('colts_session');
    sessionStorage.removeItem('colts_token');
    window.location.href = 'index.html';
}

console.log('🔥 dashboard.js cargado correctamente - Cards interactivos');