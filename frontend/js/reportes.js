// ===== REPORTES - Mini Abarrotes COLT'S =====
console.log('📊 Módulo de Reportes inicializando...');

// ===== CONFIGURACIÓN =====
let supabaseClient = null;
let currentData = [];

// ===== FUNCIÓN PARA OBTENER FECHA LOCAL EN FORMATO YYYY-MM-DD =====
function getLocalDateString(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// ===== INICIALIZACIÓN PRINCIPAL =====
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 Inicializando reportes...');
    
    // 1. Verificar autenticación
    if (typeof protectPage === 'function' && !protectPage()) {
        console.log('⛔ Página protegida - redirigiendo');
        return;
    }
    
    console.log('✅ Usuario autenticado');
    
    // 2. Inicializar Supabase
    await initSupabase();
    
    // 3. Inicializar fecha/hora
    updateDateTime();
    startDateTimeUpdates();
    
    // 4. Cargar datos del usuario
    loadUserData();
    
    // 5. Cargar empleados para el filtro
    await loadEmpleados();
    
    // 6. Configurar fecha por defecto (hoy)
    setDefaultDates();
    
    // 7. Configurar eventos
    setupEvents();
    
    // 8. Inicializar menú móvil
    setTimeout(function() {
        if (typeof window.setupMobileMenu === 'function') {
            window.setupMobileMenu();
        }
    }, 200);
    
    console.log('✅ Reportes listo');
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

// ===== ACTUALIZAR FECHA Y HORA =====
function updateDateTime() {
    try {
        const now = new Date();
        
        const optionsDate = { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            timeZone: 'America/Mexico_City'
        };
        const dateStr = now.toLocaleDateString('es-MX', optionsDate);
        
        const timeStr = now.toLocaleTimeString('es-MX', { 
            hour: '2-digit', 
            minute: '2-digit', 
            second: '2-digit',
            hour12: true,
            timeZone: 'America/Mexico_City'
        });
        
        const currentDateElem = document.getElementById('currentDate');
        const currentTimeElem = document.getElementById('currentTime');
        
        if (currentDateElem) currentDateElem.textContent = dateStr;
        if (currentTimeElem) currentTimeElem.textContent = timeStr;
        
    } catch (error) {
        console.error('❌ Error actualizando fecha/hora:', error);
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

// ===== CONFIGURAR FECHAS POR DEFECTO =====
function setDefaultDates() {
    const now = new Date();
    // ✅ CORREGIDO: Usar función local para evitar problemas de UTC
    const today = getLocalDateString(now);

    document.getElementById('fecha').value = today;
    
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    document.getElementById('fechaInicio').value = getLocalDateString(firstDay);
    document.getElementById('fechaFin').value = today;
    
    console.log('📅 Fechas configuradas:', { today, firstDay: getLocalDateString(firstDay) });
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
    
    // Tipo de reporte
    const tipoReporte = document.getElementById('tipoReporte');
    if (tipoReporte) {
        tipoReporte.addEventListener('change', toggleDateInputs);
    }
    
    // Botones
    const generarBtn = document.getElementById('generarReporte');
    if (generarBtn) {
        generarBtn.addEventListener('click', generarReporte);
    }
    
    const exportarBtn = document.getElementById('exportarExcel');
    if (exportarBtn) {
        exportarBtn.addEventListener('click', exportarExcel);
    }
    
    const limpiarBtn = document.getElementById('limpiarFiltros');
    if (limpiarBtn) {
        limpiarBtn.addEventListener('click', limpiarFiltros);
    }
    
    // Refresh
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
    
    // Volver al dashboard
    const backBtn = document.getElementById('backToDashboard');
    if (backBtn) {
        backBtn.addEventListener('click', (e) => {
            e.preventDefault();
            window.location.href = '../dashboard.html';
        });
    }
    
    // ===== LOGOUT - CORREGIDO =====
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('🚪 Cerrando sesión desde reportes');
            
            const confirmar = window.confirm('¿Estás seguro de que deseas cerrar sesión?');
            if (confirmar) {
                localStorage.clear();
                sessionStorage.clear();
                window.location.replace('../index.html');
            }
        });
    }
}

// ===== MOSTRAR/OCULTAR INPUTS DE FECHA =====
function toggleDateInputs() {
    const tipo = document.getElementById('tipoReporte').value;
    const fechaGroup = document.getElementById('fechaGroup');
    const rangoGroup = document.getElementById('rangoGroup');
    
    if (fechaGroup) fechaGroup.style.display = tipo === 'dia' ? 'block' : 'none';
    if (rangoGroup) rangoGroup.style.display = tipo === 'rango' ? 'block' : 'none';
}

// ===== FUNCIÓN PARA FORMATEAR HORAS TRABAJADAS =====
function formatHorasTrabajadas(horasDecimal) {
    if (!horasDecimal || horasDecimal === 0) return '0 minutos';
    
    const horas = Math.floor(horasDecimal);
    const minutos = Math.round((horasDecimal - horas) * 60);
    
    if (horas === 0 && minutos === 0) {
        return '0 minutos';
    } else if (horas === 0) {
        return `${minutos} minutos`;
    } else if (minutos === 0) {
        return `${horas} ${horas === 1 ? 'hora' : 'horas'}`;
    } else {
        return `${horas} ${horas === 1 ? 'hora' : 'horas'} ${minutos} minutos`;
    }
}

// ===== GENERAR REPORTE =====
async function generarReporte() {
    console.log('🔍 Generando reporte...');
    
    const btn = document.getElementById('generarReporte');
    const originalBtnHTML = btn ? btn.innerHTML : '';
    
    // Bloquear botón mientras carga
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Cargando...';
    }
    
    const tipo = document.getElementById('tipoReporte').value;
    const empleadoId = document.getElementById('empleadoFiltro').value;
    
    try {
        let query = supabaseClient
            .from('asistencia')
            .select('*, empleados(nombre_completo, puesto)')
            .order('fecha', { ascending: false });
        
        // ✅ CORREGIDO: Usar fechas locales
        if (tipo === 'dia') {
            const fecha = document.getElementById('fecha').value;
            if (!fecha) {
                showNotification('Selecciona una fecha', 'warning');
                return;
            }
            console.log('📅 Filtrando por día:', fecha);
            query = query.eq('fecha', fecha);
            
        } else if (tipo === 'semana') {
            const hoy = new Date();
            const inicio = new Date(hoy);
            inicio.setDate(hoy.getDate() - 7);
            
            const fechaInicio = getLocalDateString(inicio);
            const fechaFin = getLocalDateString(hoy);
            
            console.log('📅 Filtrando por semana:', fechaInicio, 'a', fechaFin);
            
            query = query
                .gte('fecha', fechaInicio)
                .lte('fecha', fechaFin);
            
        } else if (tipo === 'mes') {
            const hoy = new Date();
            const inicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
            
            const fechaInicio = getLocalDateString(inicio);
            const fechaFin = getLocalDateString(hoy);
            
            console.log('📅 Filtrando por mes:', fechaInicio, 'a', fechaFin);
            
            query = query
                .gte('fecha', fechaInicio)
                .lte('fecha', fechaFin);
            
        } else if (tipo === 'rango') {
            const inicio = document.getElementById('fechaInicio').value;
            const fin = document.getElementById('fechaFin').value;
            
            if (!inicio || !fin) {
                showNotification('Selecciona ambas fechas', 'warning');
                return;
            }
            
            if (inicio > fin) {
                showNotification('La fecha de inicio debe ser menor a la fecha fin', 'error');
                return;
            }
            
            console.log('📅 Filtrando por rango:', inicio, 'a', fin);
            
            query = query
                .gte('fecha', inicio)
                .lte('fecha', fin);
        }
        
        // Aplicar filtro de empleado
        if (empleadoId !== 'todos') {
            console.log('👤 Filtrando por empleado:', empleadoId);
            query = query.eq('empleado_id', empleadoId);
        }
        
        const { data, error } = await query;
        
        if (error) throw error;
        
        console.log('📊 Registros encontrados:', data?.length || 0);
        
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
        
    } finally {
        // SIEMPRE restaurar el botón
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = originalBtnHTML;
        }
    }
}

// ===== RENDERIZAR TABLA =====
function renderTabla() {
    let html = '';
    let totalHoras = 0;
    
    if (currentData.length === 0) {
        html = `
            <tr>
                <td colspan="6" class="loading" style="text-align: center; padding: 3rem;">
                    <i class="fas fa-chart-bar" style="font-size: 2rem; color: var(--primary-blue); margin-bottom: 1rem;"></i>
                    <div>No hay datos para mostrar</div>
                </td>
            </tr>
        `;
        
        const resumenTotales = document.getElementById('resumenTotales');
        if (resumenTotales) resumenTotales.style.display = 'none';
        
    } else {
        currentData.forEach(reg => {
            totalHoras += parseFloat(reg.horas_trabajadas) || 0;
            
            // Formatear horas trabajadas
            const horasFormateadas = formatHorasTrabajadas(reg.horas_trabajadas);
            
            // ✅ CORREGIDO: Mostrar fecha local correctamente
            const fechaLocal = new Date(reg.fecha + 'T00:00:00').toLocaleDateString('es-MX');
            
            html += `
                <tr>
                    <td>${fechaLocal}</td>
                    <td>${reg.empleados?.nombre_completo || 'N/A'}</td>
                    <td>${reg.empleados?.puesto || 'N/A'}</td>
                    <td>${formatTime(reg.hora_entrada)}</td>
                    <td>${formatTime(reg.hora_salida)}</td>
                    <td>${horasFormateadas}</td>
                </tr>
            `;
        });
        
        // Actualizar resumen
        const totalRegistros = document.getElementById('totalRegistros');
        const totalRegistrosNum = document.getElementById('totalRegistrosNum');
        const totalHorasElem = document.getElementById('totalHoras');
        const totalDiasElem = document.getElementById('totalDias');
        const resumenTotales = document.getElementById('resumenTotales');
        
        if (totalRegistros) totalRegistros.textContent = `${currentData.length} registros`;
        if (totalRegistrosNum) totalRegistrosNum.textContent = currentData.length;
        if (totalHorasElem) totalHorasElem.textContent = totalHoras.toFixed(2);
        
        // Calcular días únicos
        const diasUnicos = new Set(currentData.map(r => r.fecha)).size;
        if (totalDiasElem) totalDiasElem.textContent = diasUnicos;
        
        if (resumenTotales) resumenTotales.style.display = 'grid';
    }
    
    const reporteBody = document.getElementById('reporteBody');
    if (reporteBody) reporteBody.innerHTML = html;
}

// ===== FORMATEAR HORA =====
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

// ===== EXPORTAR A EXCEL =====
function exportarExcel() {
    if (currentData.length === 0) {
        showNotification('No hay datos para exportar', 'warning');
        return;
    }
    
    try {
        // Verificar que XLSX esté disponible
        if (typeof XLSX === 'undefined') {
            showNotification('Librería de Excel no disponible', 'error');
            return;
        }
        
        // Crear datos para Excel
        const excelData = [
            ['Fecha', 'Empleado', 'Puesto', 'Entrada', 'Salida', 'Horas Trabajadas (decimal)', 'Horas Trabajadas (texto)'],
            ...currentData.map(reg => {
                const fechaLocal = new Date(reg.fecha + 'T00:00:00').toLocaleDateString('es-MX');
                return [
                    fechaLocal,
                    reg.empleados?.nombre_completo || 'N/A',
                    reg.empleados?.puesto || 'N/A',
                    formatTime(reg.hora_entrada),
                    formatTime(reg.hora_salida),
                    reg.horas_trabajadas ? reg.horas_trabajadas.toFixed(2) : '0.00',
                    formatHorasTrabajadas(reg.horas_trabajadas)
                ];
            })
        ];
        
        // Crear libro de Excel
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet(excelData);
        
        // Ajustar ancho de columnas
        ws['!cols'] = [
            { wch: 12 }, // Fecha
            { wch: 30 }, // Empleado
            { wch: 20 }, // Puesto
            { wch: 10 }, // Entrada
            { wch: 10 }, // Salida
            { wch: 20 }, // Horas (decimal)
            { wch: 25 }  // Horas (texto)
        ];
        
        XLSX.utils.book_append_sheet(wb, ws, 'Asistencia');
        
        // Descargar archivo
        const fecha = getLocalDateString();
        XLSX.writeFile(wb, `reporte_colts_${fecha}.xlsx`);
        
        showNotification('Excel generado exitosamente', 'success');
        
    } catch (error) {
        console.error('Error exportando a Excel:', error);
        showNotification('Error al exportar a Excel', 'error');
    }
}

// ===== LIMPIAR FILTROS =====
function limpiarFiltros() {
    const tipoReporte = document.getElementById('tipoReporte');
    if (tipoReporte) tipoReporte.value = 'dia';
    
    setDefaultDates();
    toggleDateInputs();
    
    const empleadoFiltro = document.getElementById('empleadoFiltro');
    if (empleadoFiltro) empleadoFiltro.value = 'todos';
    
    // Limpiar tabla
    const reporteBody = document.getElementById('reporteBody');
    if (reporteBody) {
        reporteBody.innerHTML = `
            <tr>
                <td colspan="6" class="loading" style="text-align: center; padding: 3rem;">
                    <i class="fas fa-chart-bar" style="font-size: 2rem; color: var(--primary-blue); margin-bottom: 1rem;"></i>
                    <div>Selecciona filtros y genera un reporte</div>
                </td>
            </tr>
        `;
    }
    
    const resumenTotales = document.getElementById('resumenTotales');
    if (resumenTotales) resumenTotales.style.display = 'none';
    
    const totalRegistros = document.getElementById('totalRegistros');
    if (totalRegistros) totalRegistros.textContent = '0 registros';
    
    currentData = [];
    
    showNotification('Filtros limpiados', 'info');
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
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        });
    }
    
    setTimeout(() => {
        if (notification.parentNode) {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }
    }, 5000);
}

console.log('✅ reportes.js cargado completamente - BUGS DE FECHA UTC CORREGIDOS');