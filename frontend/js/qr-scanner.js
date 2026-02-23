// ===== QR SCANNER - Mini Abarrotes COLT'S =====
console.log('📱 Módulo de Escáner QR inicializando...');

// ===== CONFIGURACIÓN =====
let supabaseClient = null;
let html5QrCode = null;
let currentCameraId = null;
let isScannerActive = false;
let selectedEmployeeId = null;
let soundEnabled = true;
let scanType = 'entrada'; // 'entrada' o 'salida'

// ===== AUDIO =====
let audioContext = null;

// ===== FUNCIÓN PARA OBTENER HORA ACTUAL EN MÉXICO =====
function getMexicoDateTime() {
    const now = new Date();
    
    // Obtener componentes de fecha en zona horaria de México
    const mexicoDate = new Date(now.toLocaleString('en-US', { 
        timeZone: 'America/Mexico_City' 
    }));
    
    // Formatear como ISO string pero con hora de México
    const year = mexicoDate.getFullYear();
    const month = String(mexicoDate.getMonth() + 1).padStart(2, '0');
    const day = String(mexicoDate.getDate()).padStart(2, '0');
    const hour = String(mexicoDate.getHours()).padStart(2, '0');
    const minute = String(mexicoDate.getMinutes()).padStart(2, '0');
    const second = String(mexicoDate.getSeconds()).padStart(2, '0');
    
    return `${year}-${month}-${day}T${hour}:${minute}:${second}`;
}

// ===== FUNCIÓN PARA FORMATEAR FECHA CORRECTAMENTE =====
function formatTimeForDisplay(dateString) {
    if (!dateString) return '--:--';
    
    const date = new Date(dateString);
    
    const options = {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZone: 'America/Mexico_City'
    };
    
    return date.toLocaleTimeString('es-MX', options);
}

// ===== FUNCIÓN PARA FORMATEAR HORAS TRABAJADAS =====
function formatHorasTrabajadas(horasDecimal) {
    if (!horasDecimal || horasDecimal === 0) return '0 horas 0 minutos';
    
    const horas = Math.floor(horasDecimal);
    const minutos = Math.round((horasDecimal - horas) * 60);
    
    if (horas === 0 && minutos === 0) return '0 horas 0 minutos';
    
    let resultado = '';
    
    if (horas === 1) {
        resultado += '1 hora';
    } else if (horas > 1) {
        resultado += `${horas} horas`;
    }
    
    if (horas > 0 && minutos > 0) {
        resultado += ' ';
    }
    
    if (minutos === 1) {
        resultado += '1 minuto';
    } else if (minutos > 1) {
        resultado += `${minutos} minutos`;
    }
    
    return resultado.trim() || '0 minutos';
}

// ===== ACTUALIZAR FECHA Y HORA (MÉXICO) =====
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
        
        const optionsTime = { 
            hour: '2-digit', 
            minute: '2-digit', 
            second: '2-digit',
            hour12: true,
            timeZone: 'America/Mexico_City'
        };
        const timeStr = now.toLocaleTimeString('es-MX', optionsTime);
        
        const currentDateElem = document.getElementById('currentDate');
        const currentTimeElem = document.getElementById('currentTime');
        
        if (currentDateElem) {
            currentDateElem.textContent = dateStr;
        }
        if (currentTimeElem) {
            currentTimeElem.textContent = timeStr;
        }
        
        // Actualizar hora actual en quick stats si existe
        const currentHourElem = document.getElementById('currentHour');
        if (currentHourElem) {
            currentHourElem.textContent = now.toLocaleTimeString('es-MX', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true,
                timeZone: 'America/Mexico_City'
            });
        }
        
    } catch (error) {
        console.error('❌ Error actualizando fecha/hora:', error);
    }
}

// ===== INICIAR ACTUALIZACIONES DE FECHA/HORA =====
function startDateTimeUpdates() {
    setInterval(updateDateTime, 1000);
}

// ===== INICIALIZACIÓN PRINCIPAL =====
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 Inicializando escáner QR...');
    
    scanType = window.location.pathname.includes('salida.html') ? 'salida' : 'entrada';
    console.log(`📊 Modo de escaneo: ${scanType}`);
    
    if (typeof protectPage === 'function' && !protectPage()) {
        console.log('⛔ Página protegida - redirigiendo');
        return;
    }
    
    console.log('✅ Usuario autenticado');
    
    await initSupabase();
    loadUserData();
    await loadEmployees();
    await loadStats();
    
    setupUIEvents();
    setupScannerEvents();
    setupModalEvents();
    setupMobileMenu();
    
    // INICIAR ACTUALIZACIÓN DE HORA
    updateDateTime();
    startDateTimeUpdates();
    
    setupSound();
    loadSettings();
    
    console.log('✅ Escáner QR listo');
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
        
        console.log('✅ Supabase conectado para escáner QR');
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
        }
    } catch (error) {
        console.error('Error cargando datos usuario:', error);
    }
}

// ===== CARGAR EMPLEADOS =====
async function loadEmployees() {
    console.log('📥 Cargando lista de empleados...');
    
    try {
        const { data, error } = await supabaseClient
            .from('empleados')
            .select('*')
            .eq('activo', true)
            .order('nombre_completo', { ascending: true });
        
        if (error) {
            console.error('❌ Error cargando empleados:', error);
            showNotification('Error cargando lista de empleados', 'error');
            return;
        }
        
        console.log(`✅ ${data?.length || 0} empleados cargados`);
        
        renderEmployeeList(data || []);
        updateQRCount(data?.length || 0);
        
    } catch (error) {
        console.error('❌ Error en loadEmployees:', error);
        showNotification('Error al cargar los empleados', 'error');
    }
}

// ===== CARGAR ESTADÍSTICAS =====
async function loadStats() {
    console.log('📊 Cargando estadísticas...');
    
    try {
        const today = new Date().toISOString().split('T')[0];
        
        const { data: asistencia, error } = await supabaseClient
            .from('asistencia')
            .select('*')
            .eq('fecha', today);
        
        if (error) {
            console.error('❌ Error cargando asistencia:', error);
            return;
        }
        
        const { data: empleados, error: empError } = await supabaseClient
            .from('empleados')
            .select('id, nombre_completo, puesto')
            .eq('activo', true);
        
        if (empError) {
            console.error('❌ Error cargando empleados:', empError);
            return;
        }
        
        const totalEmpleados = empleados?.length || 0;
        const presentes = asistencia?.filter(a => a.hora_entrada !== null).length || 0;
        const conSalida = asistencia?.filter(a => a.hora_salida !== null).length || 0;
        const pendientes = asistencia?.filter(a => a.hora_entrada !== null && a.hora_salida === null).length || 0;
        const sinEntrada = totalEmpleados - presentes;
        
        if (scanType === 'entrada') {
            safeSetText('presentesCount', presentes);
            safeSetText('porLlegarCount', Math.max(0, totalEmpleados - presentes));
            safeSetText('scanCount', presentes);
        } else {
            safeSetText('salidasCount', conSalida);
            safeSetText('pendientesCount', pendientes);
            safeSetText('sinEntradaCount', Math.max(0, sinEntrada));
            safeSetText('scanCount', conSalida);
        }
        
        safeSetText('totalQRCount', totalEmpleados);
        
        const todayDate = new Date().toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit' });
        safeSetText('todayDate', todayDate);
        
        const now = new Date();
        const options = {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
            timeZone: 'America/Mexico_City'
        };
        const currentHour = now.toLocaleTimeString('es-MX', options);
        safeSetText('currentHour', currentHour);
        
        loadRecentEntries(asistencia || [], empleados || []);
        
        if (scanType === 'salida') {
            loadPendingDepartures(asistencia || [], empleados || []);
            loadCompletedDepartures(asistencia || [], empleados || []);
        }
        
    } catch (error) {
        console.error('❌ Error en loadStats:', error);
    }
}

// ===== FUNCIÓN AUXILIAR PARA ACTUALIZAR TEXTOS SEGURA =====
function safeSetText(elementId, value) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = value;
    }
}

// ===== ACTUALIZAR CONTADOR DE QR =====
function updateQRCount(count) {
    safeSetText('totalQRCount', count);
}

// ===== RENDERIZAR LISTA DE EMPLEADOS =====
function renderEmployeeList(empleados) {
    console.log('📋 Renderizando lista de empleados:', empleados.length);
    
    const employeeList = document.getElementById('employeeList');
    if (!employeeList) {
        console.error('❌ No se encontró employeeList');
        return;
    }
    
    if (!empleados || empleados.length === 0) {
        employeeList.innerHTML = `
            <div class="empty-employees">
                <i class="fas fa-users-slash"></i>
                <span>No hay empleados activos</span>
            </div>
        `;
        return;
    }
    
    let html = '';
    
    empleados.forEach(empleado => {
        html += `
            <div class="employee-item" data-id="${empleado.id}" style="cursor: pointer; padding: 10px; border-bottom: 1px solid #eee; display: flex; align-items: center; gap: 10px;">
                <div class="employee-photo-small" style="width: 40px; height: 40px; border-radius: 50%; overflow: hidden; background: #f0f0f0; display: flex; align-items: center; justify-content: center;">
                    ${empleado.foto_url ? 
                        `<img src="${empleado.foto_url}" alt="${empleado.nombre_completo}" 
                              style="width: 100%; height: 100%; object-fit: cover;" 
                              onerror="this.onerror=null; this.parentElement.innerHTML='<i class=\\'fas fa-user-circle\\'></i>';">` :
                        `<i class="fas fa-user-circle" style="font-size: 30px; color: #999;"></i>`
                    }
                </div>
                <div class="employee-info-small" style="flex: 1;">
                    <h4 style="margin: 0; font-size: 14px; font-weight: 600;">${empleado.nombre_completo || 'Sin nombre'}</h4>
                    <p style="margin: 0; font-size: 12px; color: #666;">${empleado.puesto || 'Sin puesto'}</p>
                </div>
                <div class="employee-status" style="padding: 4px 8px; border-radius: 4px; font-size: 11px; background: #e8f5e9; color: #2e7d32;">
                    Activo
                </div>
            </div>
        `;
    });
    
    employeeList.innerHTML = html;
    
    console.log('✅ Lista renderizada, configurando eventos...');
    
    setTimeout(() => {
        setupEmployeeSelection();
    }, 100);
}

// ===== CONFIGURAR SELECCIÓN DE EMPLEADOS =====
function setupEmployeeSelection() {
    console.log('🎯 Configurando selección de empleados...');
    
    const employeeItems = document.querySelectorAll('.employee-item');
    const manualRegisterBtn = document.getElementById('manualRegisterBtn');
    const searchInput = document.getElementById('searchEmployee');
    
    console.log('📊 Elementos encontrados:');
    console.log('  - Empleados:', employeeItems.length);
    console.log('  - Botón manual:', manualRegisterBtn ? '✅' : '❌');
    console.log('  - Input búsqueda:', searchInput ? '✅' : '❌');
    
    if (!employeeItems.length) {
        console.warn('⚠️ No se encontraron employee-item');
        return;
    }
    
    employeeItems.forEach((item) => {
        item.addEventListener('click', function(e) {
            console.log('🖱️ Click en empleado:', this.dataset.id);
            
            employeeItems.forEach(i => {
                i.classList.remove('selected');
                i.style.background = 'transparent';
            });
            
            this.classList.add('selected');
            this.style.background = '#e3f2fd';
            
            selectedEmployeeId = this.dataset.id;
            
            console.log('✅ Empleado seleccionado:', selectedEmployeeId);
            
            if (manualRegisterBtn) {
                manualRegisterBtn.disabled = false;
                manualRegisterBtn.style.opacity = '1';
                manualRegisterBtn.style.cursor = 'pointer';
                console.log('✅ Botón manual habilitado');
            }
        });
        
        item.addEventListener('mouseenter', function() {
            if (!this.classList.contains('selected')) {
                this.style.background = '#f5f5f5';
            }
        });
        
        item.addEventListener('mouseleave', function() {
            if (!this.classList.contains('selected')) {
                this.style.background = 'transparent';
            }
        });
    });
    
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase();
            console.log('🔍 Buscando:', searchTerm);
            
            let visibleCount = 0;
            
            employeeItems.forEach(item => {
                const name = item.querySelector('h4').textContent.toLowerCase();
                const puesto = item.querySelector('p').textContent.toLowerCase();
                
                if (name.includes(searchTerm) || puesto.includes(searchTerm)) {
                    item.style.display = 'flex';
                    visibleCount++;
                } else {
                    item.style.display = 'none';
                    if (item.classList.contains('selected')) {
                        item.classList.remove('selected');
                        item.style.background = 'transparent';
                    }
                }
            });
            
            console.log(`📊 Empleados visibles: ${visibleCount}`);
            
            if (!searchTerm) {
                employeeItems.forEach(i => {
                    i.classList.remove('selected');
                    i.style.background = 'transparent';
                });
                selectedEmployeeId = null;
                if (manualRegisterBtn) {
                    manualRegisterBtn.disabled = true;
                    manualRegisterBtn.style.opacity = '0.5';
                    manualRegisterBtn.style.cursor = 'not-allowed';
                }
            }
        });
    }
    
    console.log('✅ Selección de empleados configurada');
}

// ===== CARGAR REGISTROS RECIENTES =====
async function loadRecentEntries(asistenciaHoy, empleados) {
    const recentEntries = document.getElementById('recentEntries');
    if (!recentEntries) return;
    
    try {
        const empleadosMap = {};
        empleados.forEach(emp => {
            empleadosMap[emp.id] = emp;
        });
        
        const registros = asistenciaHoy.filter(a => 
            scanType === 'entrada' ? a.hora_entrada !== null : a.hora_salida !== null
        );
        
        if (registros.length === 0) {
            recentEntries.innerHTML = `
                <div class="empty-entries">
                    <i class="fas fa-clock"></i>
                    <span>No hay registros recientes</span>
                </div>
            `;
            return;
        }
        
        registros.sort((a, b) => {
            const timeA = scanType === 'entrada' ? a.hora_entrada : a.hora_salida;
            const timeB = scanType === 'entrada' ? b.hora_entrada : b.hora_salida;
            return new Date(timeB) - new Date(timeA);
        });
        
        const recent = registros.slice(0, 5);
        let html = '';
        
        recent.forEach(registro => {
            const empleado = empleadosMap[registro.empleado_id];
            if (!empleado) return;
            
            const time = scanType === 'entrada' ? registro.hora_entrada : registro.hora_salida;
            const timeFormatted = formatTimeForDisplay(time);
            
            html += `
                <div class="entry-item">
                    <div class="entry-time">${timeFormatted}</div>
                    <div class="entry-info">
                        <h5>${empleado.nombre_completo}</h5>
                        <p>${empleado.puesto || 'Sin puesto'}</p>
                    </div>
                </div>
            `;
        });
        
        recentEntries.innerHTML = html;
        
    } catch (error) {
        console.error('Error en loadRecentEntries:', error);
        recentEntries.innerHTML = `
            <div class="empty-entries">
                <i class="fas fa-exclamation-triangle"></i>
                <span>Error al cargar registros</span>
            </div>
        `;
    }
}

// ===== CARGAR PENDIENTES DE SALIDA =====
async function loadPendingDepartures(asistenciaHoy, empleados) {
    const pendingDepartures = document.getElementById('pendingDepartures');
    if (!pendingDepartures || scanType !== 'salida') return;
    
    try {
        const empleadosMap = {};
        empleados.forEach(emp => {
            empleadosMap[emp.id] = emp;
        });
        
        const pendientes = asistenciaHoy.filter(a => 
            a.hora_entrada !== null && a.hora_salida === null
        );
        
        if (pendientes.length === 0) {
            pendingDepartures.innerHTML = `
                <div class="empty-entries">
                    <i class="fas fa-check-circle"></i>
                    <span>Todos han registrado salida</span>
                </div>
            `;
            return;
        }
        
        pendientes.sort((a, b) => new Date(a.hora_entrada) - new Date(b.hora_entrada));
        
        let html = '';
        
        pendientes.forEach(registro => {
            const empleado = empleadosMap[registro.empleado_id];
            if (!empleado) return;
            
            const entradaTime = formatTimeForDisplay(registro.hora_entrada);
            
            html += `
                <div class="entry-item">
                    <div class="entry-time">${entradaTime}</div>
                    <div class="entry-info">
                        <h5>${empleado.nombre_completo}</h5>
                        <p>${empleado.puesto || 'Sin puesto'}</p>
                    </div>
                    <div class="entry-status warning">
                        <i class="fas fa-clock"></i>
                    </div>
                </div>
            `;
        });
        
        pendingDepartures.innerHTML = html;
        
    } catch (error) {
        console.error('Error en loadPendingDepartures:', error);
    }
}

// ===== CARGAR SALIDAS COMPLETADAS =====
async function loadCompletedDepartures(asistenciaHoy, empleados) {
    const completedDepartures = document.getElementById('completedDepartures');
    if (!completedDepartures || scanType !== 'salida') return;
    
    try {
        const empleadosMap = {};
        empleados.forEach(emp => {
            empleadosMap[emp.id] = emp;
        });
        
        const completados = asistenciaHoy.filter(a => a.hora_salida !== null);
        
        if (completados.length === 0) {
            completedDepartures.innerHTML = `
                <div class="empty-entries">
                    <i class="fas fa-clock"></i>
                    <span>No hay salidas registradas</span>
                </div>
            `;
            return;
        }
        
        completados.sort((a, b) => new Date(b.hora_salida) - new Date(a.hora_salida));
        
        let html = '';
        
        completados.slice(0, 5).forEach(registro => {
            const empleado = empleadosMap[registro.empleado_id];
            if (!empleado) return;
            
            const salidaTime = formatTimeForDisplay(registro.hora_salida);
            
            html += `
                <div class="entry-item">
                    <div class="entry-time">${salidaTime}</div>
                    <div class="entry-info">
                        <h5>${empleado.nombre_completo}</h5>
                        <p>${empleado.puesto || 'Sin puesto'}</p>
                    </div>
                    <div class="entry-status success">
                        <i class="fas fa-check-circle"></i>
                    </div>
                </div>
            `;
        });
        
        completedDepartures.innerHTML = html;
        
    } catch (error) {
        console.error('Error en loadCompletedDepartures:', error);
    }
}

// ===== CONFIGURAR EVENTOS DE UI =====
function setupUIEvents() {
    console.log('🎮 Configurando eventos UI...');
    
    const menuToggle = document.getElementById('menuToggle');
    const refreshBtn = document.getElementById('refreshBtn');
    const backToDashboard = document.getElementById('backToDashboard');
    const logoutBtn = document.getElementById('logoutBtn');
    const manualRegisterBtn = document.getElementById('manualRegisterBtn');
    const viewAllEntries = document.getElementById('viewAllEntries');
    const toggleBeep = document.getElementById('toggleBeep');
    const testScanner = document.getElementById('testScanner');
    const autoExitBtn = document.getElementById('autoExitBtn');
    
    if (menuToggle) {
        const sidebar = document.querySelector('.sidebar');
        menuToggle.addEventListener('click', () => {
            sidebar.classList.toggle('collapsed');
        });
    }
    
    if (refreshBtn) {
        refreshBtn.addEventListener('click', async () => {
            refreshBtn.classList.add('fa-spin');
            await Promise.all([loadEmployees(), loadStats()]);
            setTimeout(() => {
                refreshBtn.classList.remove('fa-spin');
                showNotification('Datos actualizados', 'success');
            }, 500);
        });
    }
    
    if (backToDashboard) {
        backToDashboard.addEventListener('click', (e) => {
            e.preventDefault();
            window.location.href = '../dashboard.html';
        });
    }
    
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (confirm('¿Estás seguro de que deseas cerrar sesión?')) {
                if (typeof logout === 'function') {
                    logout();
                } else {
                    localStorage.clear();
                    sessionStorage.clear();
                    window.location.href = '../index.html';
                }
            }
        });
    }
    
    if (manualRegisterBtn) {
        manualRegisterBtn.addEventListener('click', () => {
            if (selectedEmployeeId) {
                showManualRegisterModal(selectedEmployeeId);
            } else {
                showNotification('Selecciona un empleado de la lista', 'warning');
            }
        });
    }
    
    if (viewAllEntries) {
        viewAllEntries.addEventListener('click', () => {
            window.location.href = 'dia.html';
        });
    }
    
    if (toggleBeep) {
        toggleBeep.addEventListener('click', () => {
            soundEnabled = !soundEnabled;
            toggleBeep.innerHTML = soundEnabled ? 
                '<i class="fas fa-volume-up"></i> Sonido' : 
                '<i class="fas fa-volume-mute"></i> Silencio';
            toggleBeep.classList.toggle('secondary', !soundEnabled);
            showNotification(soundEnabled ? 'Sonido activado' : 'Sonido desactivado', 'info');
            saveSettings();
        });
    }
    
    if (testScanner) {
        testScanner.addEventListener('click', testScannerFunction);
    }
    
    if (autoExitBtn) {
        autoExitBtn.addEventListener('click', () => {
            showNotification('La auto-salida se ejecuta automáticamente a las 10:00 PM', 'info');
        });
    }
    
    console.log('✅ Eventos UI configurados');
}

// ===== CONFIGURAR EVENTOS DEL ESCÁNER =====
function setupScannerEvents() {
    console.log('🎮 Configurando eventos del escáner...');
    
    const startScanner = document.getElementById('startScanner');
    const stopScanner = document.getElementById('stopScanner');
    const toggleCamera = document.getElementById('toggleCamera');
    const cameraSelect = document.getElementById('cameraSelect');
    
    if (startScanner) {
        startScanner.addEventListener('click', startQRScanner);
    }
    
    if (stopScanner) {
        stopScanner.addEventListener('click', stopQRScanner);
    }
    
    if (toggleCamera) {
        toggleCamera.addEventListener('click', switchCamera);
    }
    
    if (cameraSelect) {
        cameraSelect.addEventListener('change', function() {
            if (this.value && isScannerActive) {
                switchToCamera(this.value);
            }
        });
    }
    
    initCameraList();
    
    console.log('✅ Eventos del escáner configurados');
}

// ===== INICIALIZAR LISTA DE CÁMARAS =====
async function initCameraList() {
    console.log('📷 Inicializando lista de cámaras...');
    
    try {
        if (typeof Html5Qrcode === 'undefined') {
            console.error('❌ Html5Qrcode no está disponible');
            return;
        }
        
        const devices = await Html5Qrcode.getCameras();
        
        const cameraSelect = document.getElementById('cameraSelect');
        if (!cameraSelect) return;
        
        cameraSelect.innerHTML = '<option value="">Seleccionar cámara...</option>';
        
        if (devices && devices.length > 0) {
            devices.forEach((device, index) => {
                const option = document.createElement('option');
                option.value = device.id;
                option.text = device.label || `Cámara ${index + 1}`;
                cameraSelect.appendChild(option);
            });
            
            const backCamera = devices.find(d => 
                d.label?.toLowerCase().includes('back') || 
                d.label?.toLowerCase().includes('rear') ||
                d.label?.toLowerCase().includes('trasera')
            );
            
            if (backCamera) {
                cameraSelect.value = backCamera.id;
                currentCameraId = backCamera.id;
            } else if (devices[0]) {
                cameraSelect.value = devices[0].id;
                currentCameraId = devices[0].id;
            }
            
            console.log(`✅ ${devices.length} cámaras detectadas`);
            
        } else {
            cameraSelect.innerHTML = '<option value="">No se detectaron cámaras</option>';
            console.warn('⚠️ No se detectaron cámaras');
            showNotification('No se detectaron cámaras en el dispositivo', 'warning');
        }
        
    } catch (error) {
        console.error('❌ Error obteniendo cámaras:', error);
        showNotification('Error al acceder a las cámaras', 'error');
    }
}

// ===== INICIAR ESCÁNER QR =====
async function startQRScanner() {
    console.log('▶️ Iniciando escáner QR...');
    
    const startBtn = document.getElementById('startScanner');
    const stopBtn = document.getElementById('stopScanner');
    const toggleTorch = document.getElementById('toggleTorch');
    const cameraStatus = document.getElementById('cameraStatus');
    const cameraSelect = document.getElementById('cameraSelect');
    
    if (isScannerActive) {
        console.log('⚠️ El escáner ya está activo');
        return;
    }
    
    try {
        if (typeof Html5Qrcode === 'undefined') {
            showNotification('Error: Librería de escáner no cargada', 'error');
            return;
        }
        
        if (!currentCameraId && cameraSelect) {
            currentCameraId = cameraSelect.value;
        }
        
        if (!currentCameraId) {
            showNotification('Selecciona una cámara primero', 'warning');
            return;
        }
        
        html5QrCode = new Html5Qrcode("qrReader");
        
        const config = {
            fps: 10,
            qrbox: { 
                width: 450,
                height: 450
            },
            aspectRatio: 1.0,
            experimentalFeatures: {
                useBarCodeDetectorIfSupported: true
            },
            supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA]
        };
        
        await html5QrCode.start(
            currentCameraId,
            config,
            onScanSuccess,
            onScanError
        );
        
        isScannerActive = true;
        
        if (startBtn) startBtn.disabled = true;
        if (stopBtn) stopBtn.disabled = false;
        if (toggleTorch) toggleTorch.disabled = false;
        
        if (cameraStatus) {
            cameraStatus.innerHTML = '<i class="fas fa-circle"></i><span>Escaneando activamente</span>';
            cameraStatus.classList.add('active');
        }
        
        showNotification('Escáner iniciado correctamente', 'success');
        console.log('✅ Escáner QR iniciado');
        
    } catch (error) {
        console.error('❌ Error iniciando escáner:', error);
        
        let errorMessage = 'Error al iniciar el escáner';
        if (error.message?.includes('Permission')) {
            errorMessage = 'Permiso de cámara denegado. Asegúrate de permitir el acceso a la cámara.';
        } else if (error.message?.includes('NotFoundError')) {
            errorMessage = 'No se encontró la cámara seleccionada.';
        } else if (error.message?.includes('NotAllowedError')) {
            errorMessage = 'Acceso a la cámara no permitido.';
        } else if (error.message?.includes('NotReadableError')) {
            errorMessage = 'La cámara está siendo usada por otra aplicación.';
        }
        
        showNotification(errorMessage, 'error');
        
        isScannerActive = false;
        if (startBtn) startBtn.disabled = false;
        if (stopBtn) stopBtn.disabled = true;
        if (toggleTorch) toggleTorch.disabled = true;
        
        if (cameraStatus) {
            cameraStatus.innerHTML = '<i class="fas fa-circle"></i><span>Error de cámara</span>';
            cameraStatus.classList.remove('active');
        }
    }
}

// ===== DETENER ESCÁNER QR =====
async function stopQRScanner() {
    console.log('⏹️ Deteniendo escáner QR...');
    
    const startBtn = document.getElementById('startScanner');
    const stopBtn = document.getElementById('stopScanner');
    const toggleTorch = document.getElementById('toggleTorch');
    const cameraStatus = document.getElementById('cameraStatus');
    
    if (!isScannerActive || !html5QrCode) {
        console.log('⚠️ El escáner no está activo');
        return;
    }
    
    try {
        await html5QrCode.stop();
        html5QrCode.clear();
        html5QrCode = null;
        
        isScannerActive = false;
        
        if (startBtn) startBtn.disabled = false;
        if (stopBtn) stopBtn.disabled = true;
        if (toggleTorch) toggleTorch.disabled = true;
        
        if (cameraStatus) {
            cameraStatus.innerHTML = '<i class="fas fa-circle"></i><span>Escáner detenido</span>';
            cameraStatus.classList.remove('active');
        }
        
        showNotification('Escáner detenido', 'info');
        console.log('✅ Escáner QR detenido');
        
    } catch (error) {
        console.error('❌ Error deteniendo escáner:', error);
        showNotification('Error al detener el escáner', 'error');
    }
}

// ===== MANEJAR ESCANEO EXITOSO =====
async function onScanSuccess(decodedText, decodedResult) {
    console.log('✅ QR escaneado:', decodedText);
    
    if (soundEnabled) {
        playBeepSound();
    }
    
    if (html5QrCode && isScannerActive) {
        try {
            await html5QrCode.pause();
        } catch (error) {
            console.error('Error pausando escáner:', error);
        }
    }
    
    try {
        await processQRCode(decodedText);
    } catch (error) {
        console.error('Error procesando QR:', error);
        showNotification('Error al procesar el código QR', 'error');
    }
    
    setTimeout(async () => {
        if (html5QrCode && isScannerActive) {
            try {
                await html5QrCode.resume();
            } catch (error) {
                console.error('Error reanudando escáner:', error);
            }
        }
    }, 2000);
}

// ===== REPRODUCIR SONIDO =====
function playBeepSound() {
    try {
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 800;
        oscillator.type = 'sine';
        gainNode.gain.value = 0.1;
        
        oscillator.start();
        setTimeout(() => {
            oscillator.stop();
            oscillator.disconnect();
        }, 100);
        
    } catch (error) {
        console.log('No se pudo reproducir sonido:', error);
    }
}

// ===== MANEJAR ERROR DE ESCANEO =====
function onScanError(error) {
    if (error && !error.includes('NotFoundException')) {
        console.log('⚠️ Error de escaneo:', error);
    }
}

// ===== PROCESAR CÓDIGO QR =====
async function processQRCode(qrCode) {
    console.log(`🔍 Procesando código QR: ${qrCode}`);
    
    try {
        const { data: empleado, error } = await supabaseClient
            .from('empleados')
            .select('*')
            .eq('codigo_qr', qrCode)
            .eq('activo', true)
            .single();
        
        if (error || !empleado) {
            console.error('❌ Empleado no encontrado o inactivo:', error);
            showNotification('Código QR no válido o empleado inactivo', 'error');
            return;
        }
        
        console.log('👤 Empleado encontrado:', empleado.nombre_completo);
        
        if (scanType === 'entrada') {
            await registrarEntrada(empleado);
        } else {
            await registrarSalida(empleado);
        }
        
    } catch (error) {
        console.error('❌ Error procesando QR:', error);
        showNotification('Error al procesar el código QR', 'error');
    }
}

// ===== REGISTRAR ENTRADA =====
async function registrarEntrada(empleado) {
    console.log(`⏰ Registrando entrada para: ${empleado.nombre_completo}`);
    
    const today = new Date().toISOString().split('T')[0];
    const now = getMexicoDateTime();
    
    console.log('📅 Hora de México:', now);
    
    try {
        const { data: existing, error: checkError } = await supabaseClient
            .from('asistencia')
            .select('*')
            .eq('empleado_id', empleado.id)
            .eq('fecha', today)
            .single();
        
        if (checkError && checkError.code !== 'PGRST116') {
            console.error('❌ Error verificando entrada:', checkError);
            showNotification('Error al verificar registro previo', 'error');
            return;
        }
        
        if (existing) {
            const entradaTime = formatTimeForDisplay(existing.hora_entrada);
            showNotification(`${empleado.nombre_completo} ya registró entrada a las ${entradaTime}`, 'warning');
            return;
        }
        
        const { data, error } = await supabaseClient
            .from('asistencia')
            .insert([{
                empleado_id: empleado.id,
                fecha: today,
                hora_entrada: now,
                auto_salida: false
            }])
            .select()
            .single();
        
        if (error) {
            console.error('❌ Error registrando entrada:', error);
            showNotification('Error al registrar la entrada', 'error');
            return;
        }
        
        console.log('✅ Entrada registrada:', data);
        
        showResultModal(empleado, now, null, 'Entrada registrada exitosamente');
        await loadStats();
        
    } catch (error) {
        console.error('❌ Error en registrarEntrada:', error);
        showNotification('Error al registrar entrada', 'error');
    }
}

// ===== REGISTRAR SALIDA =====
async function registrarSalida(empleado) {
    console.log(`⏰ Registrando salida para: ${empleado.nombre_completo}`);
    
    const today = new Date().toISOString().split('T')[0];
    const now = getMexicoDateTime();
    
    console.log('📅 Hora de México:', now);
    
    try {
        const { data: existing, error: checkError } = await supabaseClient
            .from('asistencia')
            .select('*')
            .eq('empleado_id', empleado.id)
            .eq('fecha', today)
            .single();
        
        if (checkError || !existing) {
            showNotification(`${empleado.nombre_completo} no registró entrada hoy`, 'warning');
            return;
        }
        
        if (existing.hora_salida !== null) {
            const salidaTime = formatTimeForDisplay(existing.hora_salida);
            showNotification(`${empleado.nombre_completo} ya registró salida a las ${salidaTime}`, 'warning');
            return;
        }
        
        const entradaTime = new Date(existing.hora_entrada);
        const salidaTime = new Date(now);
        
        const diffMs = salidaTime - entradaTime;
        const horasTrabajadas = Math.max(0, (diffMs / (1000 * 60 * 60))).toFixed(2);
        
        console.log(`⏱️ Entrada: ${formatTimeForDisplay(existing.hora_entrada)}, Salida: ${formatTimeForDisplay(now)}, Horas: ${horasTrabajadas}`);
        
        const { data, error } = await supabaseClient
            .from('asistencia')
            .update({
                hora_salida: now,
                horas_trabajadas: parseFloat(horasTrabajadas),
                auto_salida: false
            })
            .eq('id', existing.id)
            .select()
            .single();
        
        if (error) {
            console.error('❌ Error registrando salida:', error);
            showNotification('Error al registrar la salida', 'error');
            return;
        }
        
        console.log('✅ Salida registrada:', data);
        
        showResultModal(empleado, existing.hora_entrada, now, 'Salida registrada exitosamente', horasTrabajadas);
        await loadStats();
        
    } catch (error) {
        console.error('❌ Error en registrarSalida:', error);
        showNotification('Error al registrar salida', 'error');
    }
}

// ===== CAMBIAR DE CÁMARA =====
async function switchCamera() {
    console.log('🔄 Cambiando de cámara...');
    
    if (!isScannerActive || !html5QrCode) {
        showNotification('Inicia el escáner primero', 'warning');
        return;
    }
    
    const cameraSelect = document.getElementById('cameraSelect');
    if (!cameraSelect || cameraSelect.value === currentCameraId) {
        return;
    }
    
    try {
        const newCameraId = cameraSelect.value;
        if (!newCameraId) {
            showNotification('Selecciona una cámara válida', 'warning');
            return;
        }
        
        await switchToCamera(newCameraId);
        
    } catch (error) {
        console.error('❌ Error cambiando cámara:', error);
        showNotification('Error al cambiar de cámara', 'error');
    }
}

// ===== CAMBIAR A CÁMARA ESPECÍFICA =====
async function switchToCamera(cameraId) {
    console.log(`📷 Cambiando a cámara: ${cameraId}`);
    
    if (!html5QrCode) return;
    
    try {
        await html5QrCode.stop();
        
        const config = {
            fps: 10,
            qrbox: { width: 450, height: 450 },
            aspectRatio: 1.0
        };
        
        await html5QrCode.start(
            cameraId,
            config,
            onScanSuccess,
            onScanError
        );
        
        currentCameraId = cameraId;
        
        showNotification('Cámara cambiada exitosamente', 'success');
        console.log('✅ Cámara cambiada exitosamente');
        
    } catch (error) {
        console.error('❌ Error en switchToCamera:', error);
        showNotification('Error al cambiar de cámara', 'error');
        
        if (currentCameraId) {
            try {
                const config = {
                    fps: 10,
                    qrbox: { width: 450, height: 450 },
                    aspectRatio: 1.0
                };
                await html5QrCode.start(
                    currentCameraId,
                    config,
                    onScanSuccess,
                    onScanError
                );
            } catch (retryError) {
                console.error('❌ Error volviendo a cámara anterior:', retryError);
            }
        }
    }
}

// ===== PROBAR ESCÁNER =====
function testScannerFunction() {
    console.log('🧪 Probando escáner...');
    
    const testQR = 'COLTS-TEST-123456';
    
    if (soundEnabled) {
        playBeepSound();
    }
    
    showNotification('Escáner funcionando correctamente', 'success');
    
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        setTimeout(() => {
            processQRCode(testQR).catch(console.error);
        }, 500);
    }
}

// ===== MOSTRAR MODAL DE REGISTRO MANUAL =====
async function showManualRegisterModal(empleadoId) {
    console.log(`👤 Mostrando modal de registro manual para empleado: ${empleadoId}`);
    
    try {
        const { data: empleado, error } = await supabaseClient
            .from('empleados')
            .select('*')
            .eq('id', empleadoId)
            .single();
        
        if (error || !empleado) {
            console.error('❌ Error obteniendo empleado:', error);
            showNotification('Error al obtener datos del empleado', 'error');
            return;
        }
        
        const previewName = document.getElementById('previewName');
        const previewPuesto = document.getElementById('previewPuesto');
        
        if (previewName) previewName.textContent = empleado.nombre_completo;
        if (previewPuesto) previewPuesto.textContent = empleado.puesto || 'Sin puesto';
        
        const currentTime = formatTimeForDisplay(getMexicoDateTime());
        
        const previewTime = document.getElementById('previewTime');
        if (previewTime) previewTime.textContent = `Hora actual: ${currentTime}`;
        
        if (scanType === 'salida') {
            const today = new Date().toISOString().split('T')[0];
            const { data: registro } = await supabaseClient
                .from('asistencia')
                .select('hora_entrada')
                .eq('empleado_id', empleadoId)
                .eq('fecha', today)
                .single();
            
            const entradaTime = registro?.hora_entrada ? 
                formatTimeForDisplay(registro.hora_entrada) : 'No registrada';
            
            const previewEntrada = document.getElementById('previewEntrada');
            const previewSalida = document.getElementById('previewSalida');
            
            if (previewEntrada) previewEntrada.textContent = entradaTime;
            if (previewSalida) previewSalida.textContent = currentTime;
        }
        
        const confirmBtn = document.getElementById('confirmRegister');
        if (confirmBtn) {
            confirmBtn.dataset.empleadoId = empleadoId;
        }
        
        const modal = document.getElementById('confirmModal');
        if (modal) modal.classList.add('show');
        
    } catch (error) {
        console.error('❌ Error en showManualRegisterModal:', error);
        showNotification('Error al mostrar modal de registro', 'error');
    }
}

// ===== PROCESAR REGISTRO MANUAL =====
async function processManualRegister(empleadoId) {
    console.log(`👤 Procesando registro manual para empleado: ${empleadoId}`);
    
    try {
        const { data: empleado, error: empleadoError } = await supabaseClient
            .from('empleados')
            .select('*')
            .eq('id', empleadoId)
            .single();
        
        if (empleadoError || !empleado) {
            console.error('❌ Error obteniendo empleado:', empleadoError);
            showNotification('Error al obtener datos del empleado', 'error');
            return;
        }
        
        if (scanType === 'entrada') {
            await registrarEntrada(empleado);
        } else {
            await registrarSalida(empleado);
        }
        
        const modal = document.getElementById('confirmModal');
        if (modal) modal.classList.remove('show');
        
    } catch (error) {
        console.error('❌ Error en processManualRegister:', error);
        showNotification('Error en registro manual', 'error');
    }
}

// ===== MOSTRAR MODAL DE RESULTADO =====
function showResultModal(empleado, horaEntrada, horaSalida, mensaje, horasTrabajadas = null) {
    console.log('📋 Mostrando resultado del registro');
    
    const resultEmployeeName = document.getElementById('resultEmployeeName');
    const resultMessage = document.getElementById('resultMessage');
    
    if (resultEmployeeName) resultEmployeeName.textContent = empleado.nombre_completo;
    if (resultMessage) resultMessage.textContent = mensaje;
    
    if (scanType === 'entrada') {
        const entradaTime = formatTimeForDisplay(horaEntrada);
        
        const resultTime = document.getElementById('resultTime');
        if (resultTime) {
            resultTime.textContent = `Hora: ${entradaTime}`;
            resultTime.style.display = 'block';
        }
        
        const entradaRow = document.getElementById('resultEntrada')?.parentElement;
        const salidaRow = document.getElementById('resultSalida')?.parentElement;
        const hoursRow = document.getElementById('resultHours')?.parentElement;
        
        if (entradaRow) entradaRow.style.display = 'none';
        if (salidaRow) salidaRow.style.display = 'none';
        if (hoursRow) hoursRow.style.display = 'none';
        
    } else {
        const entradaTime = formatTimeForDisplay(horaEntrada);
        const salidaTime = formatTimeForDisplay(horaSalida);
        
        const resultEntrada = document.getElementById('resultEntrada');
        const resultSalida = document.getElementById('resultSalida');
        const resultHours = document.getElementById('resultHours');
        
        if (resultEntrada) {
            resultEntrada.textContent = entradaTime;
            resultEntrada.parentElement.style.display = 'block';
        }
        if (resultSalida) {
            resultSalida.textContent = salidaTime;
            resultSalida.parentElement.style.display = 'block';
        }
        if (resultHours) {
            const horasFormateadas = formatHorasTrabajadas(parseFloat(horasTrabajadas));
            resultHours.textContent = horasFormateadas;
            resultHours.parentElement.style.display = 'block';
        }
        
        const resultTime = document.getElementById('resultTime');
        if (resultTime) resultTime.style.display = 'none';
    }
    
    const modal = document.getElementById('resultModal');
    if (modal) {
        modal.classList.add('show');
    }
}

// ===== CONFIGURAR EVENTOS DE MODALES =====
function setupModalEvents() {
    console.log('🎮 Configurando eventos de modales...');
    
    const closeConfirmModal = document.getElementById('closeConfirmModal');
    const cancelRegister = document.getElementById('cancelRegister');
    const confirmRegister = document.getElementById('confirmRegister');
    
    if (closeConfirmModal) {
        closeConfirmModal.addEventListener('click', function() {
            const modal = document.getElementById('confirmModal');
            if (modal) modal.classList.remove('show');
        });
    }
    
    if (cancelRegister) {
        cancelRegister.addEventListener('click', function() {
            const modal = document.getElementById('confirmModal');
            if (modal) modal.classList.remove('show');
        });
    }
    
    if (confirmRegister) {
        confirmRegister.addEventListener('click', async function() {
            const empleadoId = this.dataset.empleadoId;
            if (empleadoId) {
                await processManualRegister(empleadoId);
            }
        });
    }
    
    const closeResultModal = document.getElementById('closeResultModal');
    const scanAgain = document.getElementById('scanAgain');
    const goToDashboard = document.getElementById('goToDashboard');
    
    if (closeResultModal) {
        closeResultModal.addEventListener('click', function() {
            const modal = document.getElementById('resultModal');
            if (modal) modal.classList.remove('show');
        });
    }
    
    if (scanAgain) {
        scanAgain.addEventListener('click', function() {
            const modal = document.getElementById('resultModal');
            if (modal) modal.classList.remove('show');
        });
    }
    
    if (goToDashboard) {
        goToDashboard.addEventListener('click', function() {
            window.location.href = '../dashboard.html';
        });
    }
    
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                this.classList.remove('show');
            }
        });
    });
    
    console.log('✅ Eventos de modales configurados');
}

// ===== CONFIGURAR SONIDO =====
function setupSound() {
    console.log('🔊 Configurando sonido...');
    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        console.log('✅ AudioContext inicializado');
    } catch (error) {
        console.warn('⚠️ No se pudo inicializar audio:', error);
    }
}

// ===== CARGAR CONFIGURACIÓN =====
function loadSettings() {
    try {
        const settings = localStorage.getItem('colts_scanner_settings');
        if (settings) {
            const parsed = JSON.parse(settings);
            soundEnabled = parsed.soundEnabled !== false;
            
            const toggleBeep = document.getElementById('toggleBeep');
            if (toggleBeep) {
                toggleBeep.innerHTML = soundEnabled ? 
                    '<i class="fas fa-volume-up"></i> Sonido' : 
                    '<i class="fas fa-volume-mute"></i> Silencio';
                toggleBeep.classList.toggle('secondary', !soundEnabled);
            }
        }
    } catch (error) {
        console.error('Error cargando configuración:', error);
    }
}


// ===== GUARDAR CONFIGURACIÓN =====
function saveSettings() {
    try {
        const settings = {
            soundEnabled,
            lastCameraId: currentCameraId,
            timestamp: new Date().toISOString()
        };
        localStorage.setItem('colts_scanner_settings', JSON.stringify(settings));
    } catch (error) {
        console.error('Error guardando configuración:', error);
    }
}
// ===== EJECUTAR AUTO-SALIDA (NUEVO) =====
async function executeAutoSalida() {
    console.log('🤖 Ejecutando auto-salida para empleados pendientes...');
    
    try {
        const today = new Date().toISOString().split('T')[0];
        const now = new Date();
        
        // Establecer hora de salida a las 10:00 PM
        const salidaAuto = new Date(now);
        salidaAuto.setHours(22, 0, 0, 0); // 10:00 PM
        
        // Buscar empleados con entrada hoy pero sin salida
        const { data: pendientes, error } = await supabaseClient
            .from('asistencia')
            .select('*, empleados(nombre_completo)')
            .eq('fecha', today)
            .is('hora_salida', null)
            .not('hora_entrada', 'is', null);
        
        if (error) {
            console.error('Error buscando pendientes:', error);
            return;
        }
        
        if (pendientes && pendientes.length > 0) {
            console.log(`📋 ${pendientes.length} empleados para auto-salida`);
            
            // Registrar salida automática para cada uno
            for (const registro of pendientes) {
                // Calcular horas trabajadas hasta las 10:00 PM
                const entradaTime = new Date(registro.hora_entrada);
                const horasTrabajadas = ((salidaAuto - entradaTime) / (1000 * 60 * 60)).toFixed(2);
                
                await supabaseClient
                    .from('asistencia')
                    .update({
                        hora_salida: salidaAuto.toISOString(),
                        horas_trabajadas: parseFloat(horasTrabajadas),
                        auto_salida: true
                    })
                    .eq('id', registro.id);
                
                console.log(`✅ Auto-salida para: ${registro.empleados?.nombre_completo}`);
            }
            
            showNotification(`Auto-salida registrada para ${pendientes.length} empleados`, 'info');
            
            // Actualizar estadísticas si estamos en la página de salida
            if (scanType === 'salida') {
                await loadStats();
            }
        } else {
            console.log('✅ No hay empleados pendientes de salida');
        }
        
    } catch (error) {
        console.error('❌ Error en auto-salida:', error);
    }
}

// ===== CONFIGURAR VERIFICADOR DE AUTO-SALIDA (NUEVO) =====
function setupAutoSalidaChecker() {
    // Solo configurar si estamos en la página de salida
    if (scanType !== 'salida') return;
    
    console.log('⏰ Configurando verificador de auto-salida (10:00 PM)');
    
    // Verificar cada minuto
    setInterval(() => {
        const now = new Date();
        const hour = now.getHours();
        const minute = now.getMinutes();
        
        // Solo ejecutar a las 22:00 (10:00 PM) exactas
        if (hour === 22 && minute === 0) {
            console.log('🕙 Es la 10:00 PM, ejecutando auto-salida...');
            executeAutoSalida();
        }
    }, 60000); // Cada minuto
}
// ===== MOSTRAR NOTIFICACIÓN =====
function showNotification(message, type = 'info') {
    console.log(`📢 Notificación [${type}]: ${message}`);
    
    try {
        const notificationsContainer = document.getElementById('notifications');
        if (!notificationsContainer) return;
        
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
        
        notificationsContainer.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);
        
        const closeBtn = notification.querySelector('.notification-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                closeNotification(notification);
            });
        }
        
        setTimeout(() => {
            if (notification.parentNode) {
                closeNotification(notification);
            }
        }, 5000);
        
    } catch (error) {
        console.error('❌ Error mostrando notificación:', error);
    }
}

// ===== CERRAR NOTIFICACIÓN =====
function closeNotification(notification) {
    notification.classList.remove('show');
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 300);
}

// ===== PROTEGER PÁGINA =====
function protectPage() {
    try {
        const sessionData = localStorage.getItem('colts_session') || 
                           sessionStorage.getItem('colts_session');
        const token = localStorage.getItem('colts_token') || 
                     sessionStorage.getItem('colts_token');
        
        if (!sessionData || token !== 'authenticated') {
            window.location.href = '../index.html';
            return false;
        }
        
        return true;
        
    } catch (error) {
        console.error('❌ Error verificando sesión:', error);
        window.location.href = '../index.html';
        return false;
    }
}

console.log('✅ Módulo QR Scanner completamente cargado');