// ===== QR SCANNER - Mini Abarrotes COLT'S =====
console.log('📱 Módulo de Escáner QR inicializando...');

let supabaseClient = null;
let html5QrCode = null;
let currentCameraId = null;
let isScannerActive = false;
let selectedEmployeeId = null;
let soundEnabled = true;
let scanType = 'entrada';

let audioContext = null;

function getLocalDateString(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function getMexicoDateTime() {
    const now = new Date();
    const mexicoDate = new Date(now.toLocaleString('en-US', { timeZone: 'America/Mexico_City' }));
    const year = mexicoDate.getFullYear();
    const month = String(mexicoDate.getMonth() + 1).padStart(2, '0');
    const day = String(mexicoDate.getDate()).padStart(2, '0');
    const hour = String(mexicoDate.getHours()).padStart(2, '0');
    const minute = String(mexicoDate.getMinutes()).padStart(2, '0');
    const second = String(mexicoDate.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day}T${hour}:${minute}:${second}`;
}

function formatTimeForDisplay(dateString) {
    if (!dateString) return '--:--';
    return new Date(dateString).toLocaleTimeString('es-MX', {
        hour: '2-digit', minute: '2-digit',
        hour12: true, timeZone: 'America/Mexico_City'
    });
}

function formatHorasTrabajadas(horasDecimal) {
    if (!horasDecimal || horasDecimal === 0) return '0 horas 0 minutos';
    const horas = Math.floor(horasDecimal);
    const minutos = Math.round((horasDecimal - horas) * 60);
    let resultado = '';
    if (horas === 1) resultado += '1 hora';
    else if (horas > 1) resultado += `${horas} horas`;
    if (horas > 0 && minutos > 0) resultado += ' ';
    if (minutos === 1) resultado += '1 minuto';
    else if (minutos > 1) resultado += `${minutos} minutos`;
    return resultado.trim() || '0 minutos';
}

function updateDateTime() {
    try {
        const now = new Date();
        const cd = document.getElementById('currentDate');
        const ct = document.getElementById('currentTime');
        if (cd) cd.textContent = now.toLocaleDateString('es-MX', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
            timeZone: 'America/Mexico_City'
        });
        if (ct) ct.textContent = now.toLocaleTimeString('es-MX', {
            hour: '2-digit', minute: '2-digit', second: '2-digit',
            hour12: true, timeZone: 'America/Mexico_City'
        });
        const ch = document.getElementById('currentHour');
        if (ch) ch.textContent = now.toLocaleTimeString('es-MX', {
            hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'America/Mexico_City'
        });
    } catch (e) { console.error('Error actualizando fecha/hora:', e); }
}

function startDateTimeUpdates() { setInterval(updateDateTime, 1000); }

document.addEventListener('DOMContentLoaded', async function() {
    scanType = window.location.pathname.includes('salida.html') ? 'salida' : 'entrada';
    console.log(`📊 Modo: ${scanType}`);

    if (typeof protectPage === 'function' && !protectPage()) return;

    await initSupabase();
    loadUserData();
    await loadEmployees();
    await loadStats();
    setupUIEvents();
    setupScannerEvents();
    setupModalEvents();

    // ✅ MENÚ HAMBURGUESA
    setupMobileMenu();

    updateDateTime();
    startDateTimeUpdates();
    setupSound();
    loadSettings();
    setupAutoSalidaChecker();

    console.log('✅ Escáner QR listo');
});

async function initSupabase() {
    try {
        if (typeof supabase === 'undefined') { showNotification('Error: Supabase no cargado', 'error'); return false; }
        const SUPABASE_URL = window.supabaseConfig?.SUPABASE_URL || 'https://iokkxkpfncbumnjamquh.supabase.co';
        const SUPABASE_KEY = window.supabaseConfig?.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlva2t4a3BmbmNidW1uamFtcXVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA0MzE3MzgsImV4cCI6MjA4NjAwNzczOH0.7eKVc1I0v5n5zaB4rUEASizm05cFWTieOgtgMmZku6w';
        supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
        return true;
    } catch (e) { showNotification('Error inicializando sistema', 'error'); return false; }
}

function loadUserData() {
    try {
        const sessionData = localStorage.getItem('colts_session') || sessionStorage.getItem('colts_session');
        if (sessionData) {
            const session = JSON.parse(sessionData);
            const un = document.getElementById('userName');
            const ue = document.getElementById('userEmail');
            if (un) un.textContent = 'Administrador';
            if (ue) ue.textContent = session.usuario || 'colts';
        }
    } catch (e) {}
}

async function loadEmployees() {
    try {
        const { data, error } = await supabaseClient.from('empleados').select('*').eq('activo', true).order('nombre_completo', { ascending: true });
        if (error) { showNotification('Error cargando lista de empleados', 'error'); return; }
        renderEmployeeList(data || []);
        updateQRCount(data?.length || 0);
    } catch (e) { showNotification('Error al cargar los empleados', 'error'); }
}

async function loadStats() {
    try {
        const today = getLocalDateString();
        const { data: asistencia, error } = await supabaseClient.from('asistencia').select('*').eq('fecha', today);
        if (error) { console.error('Error cargando asistencia:', error); return; }
        const { data: empleados, error: empError } = await supabaseClient.from('empleados').select('id, nombre_completo, puesto').eq('activo', true);
        if (empError) return;

        const totalEmpleados = empleados?.length || 0;
        const presentes = asistencia?.filter(a => a.hora_entrada !== null).length || 0;
        const conSalida = asistencia?.filter(a => a.hora_salida !== null).length || 0;
        const pendientes = asistencia?.filter(a => a.hora_entrada !== null && a.hora_salida === null).length || 0;

        if (scanType === 'entrada') {
            safeSetText('presentesCount', presentes);
            safeSetText('porLlegarCount', Math.max(0, totalEmpleados - presentes));
            safeSetText('scanCount', presentes);
        } else {
            safeSetText('salidasCount', conSalida);
            safeSetText('pendientesCount', pendientes);
            safeSetText('sinEntradaCount', Math.max(0, totalEmpleados - presentes));
            safeSetText('scanCount', conSalida);
        }

        safeSetText('totalQRCount', totalEmpleados);
        safeSetText('todayDate', new Date().toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit' }));
        safeSetText('currentHour', new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'America/Mexico_City' }));

        loadRecentEntries(asistencia || [], empleados || []);
        if (scanType === 'salida') {
            loadPendingDepartures(asistencia || [], empleados || []);
            loadCompletedDepartures(asistencia || [], empleados || []);
        }
    } catch (e) { console.error('Error en loadStats:', e); }
}

function safeSetText(id, value) { const el = document.getElementById(id); if (el) el.textContent = value; }
function updateQRCount(count) { safeSetText('totalQRCount', count); }

function renderEmployeeList(empleados) {
    const employeeList = document.getElementById('employeeList');
    if (!employeeList) return;

    if (!empleados || empleados.length === 0) {
        employeeList.innerHTML = `<div class="empty-employees" style="padding:2rem;text-align:center;color:#666;"><i class="fas fa-users-slash"></i><span>No hay empleados activos</span></div>`;
        return;
    }

    let html = '';
    empleados.forEach(emp => {
        html += `
            <div class="employee-item" data-id="${emp.id}" style="cursor:pointer;padding:10px;border-bottom:1px solid #eee;display:flex;align-items:center;gap:10px;">
                <div style="width:40px;height:40px;border-radius:50%;overflow:hidden;background:#f0f0f0;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                    ${emp.foto_url ? `<img src="${emp.foto_url}" alt="${emp.nombre_completo}" style="width:100%;height:100%;object-fit:cover;" onerror="this.onerror=null;this.parentElement.innerHTML='<i class=\\'fas fa-user-circle\\'></i>';">` : `<i class="fas fa-user-circle" style="font-size:30px;color:#999;"></i>`}
                </div>
                <div style="flex:1;min-width:0;">
                    <h4 style="margin:0;font-size:14px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${emp.nombre_completo || 'Sin nombre'}</h4>
                    <p style="margin:0;font-size:12px;color:#666;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${emp.puesto || 'Sin puesto'}</p>
                </div>
                <div style="padding:4px 8px;border-radius:4px;font-size:11px;background:#e8f5e9;color:#2e7d32;flex-shrink:0;">Activo</div>
            </div>`;
    });

    employeeList.innerHTML = html;
    setTimeout(() => setupEmployeeSelection(), 100);
}

function setupEmployeeSelection() {
    const employeeItems = document.querySelectorAll('.employee-item');
    const manualRegisterBtn = document.getElementById('manualRegisterBtn');
    const searchInput = document.getElementById('searchEmployee');

    employeeItems.forEach(item => {
        item.addEventListener('click', function() {
            employeeItems.forEach(i => { i.classList.remove('selected'); i.style.background = 'transparent'; });
            this.classList.add('selected');
            this.style.background = '#e3f2fd';
            selectedEmployeeId = this.dataset.id;
            if (manualRegisterBtn) { manualRegisterBtn.disabled = false; manualRegisterBtn.style.opacity = '1'; }
        });
        item.addEventListener('mouseenter', function() { if (!this.classList.contains('selected')) this.style.background = '#f5f5f5'; });
        item.addEventListener('mouseleave', function() { if (!this.classList.contains('selected')) this.style.background = 'transparent'; });
    });

    if (searchInput) {
        searchInput.addEventListener('input', function() {
            const term = this.value.toLowerCase();
            employeeItems.forEach(item => {
                const name = item.querySelector('h4').textContent.toLowerCase();
                const puesto = item.querySelector('p').textContent.toLowerCase();
                item.style.display = (name.includes(term) || puesto.includes(term)) ? 'flex' : 'none';
            });
            if (!term) {
                employeeItems.forEach(i => { i.classList.remove('selected'); i.style.background = 'transparent'; });
                selectedEmployeeId = null;
                if (manualRegisterBtn) { manualRegisterBtn.disabled = true; manualRegisterBtn.style.opacity = '0.5'; }
            }
        });
    }
}

async function loadRecentEntries(asistenciaHoy, empleados) {
    const container = document.getElementById('recentEntries');
    if (!container) return;
    const empMap = {};
    empleados.forEach(e => empMap[e.id] = e);
    const registros = asistenciaHoy.filter(a => scanType === 'entrada' ? a.hora_entrada !== null : a.hora_salida !== null);
    if (registros.length === 0) { container.innerHTML = `<div class="empty-entries"><i class="fas fa-clock"></i><span>No hay registros recientes</span></div>`; return; }
    registros.sort((a, b) => new Date(b[scanType === 'entrada' ? 'hora_entrada' : 'hora_salida']) - new Date(a[scanType === 'entrada' ? 'hora_entrada' : 'hora_salida']));
    container.innerHTML = registros.slice(0, 5).map(r => {
        const emp = empMap[r.empleado_id];
        if (!emp) return '';
        return `<div class="entry-item"><div class="entry-time">${formatTimeForDisplay(scanType === 'entrada' ? r.hora_entrada : r.hora_salida)}</div><div class="entry-info"><h5>${emp.nombre_completo}</h5><p>${emp.puesto || 'Sin puesto'}</p></div></div>`;
    }).join('');
}

async function loadPendingDepartures(asistenciaHoy, empleados) {
    const container = document.getElementById('pendingDepartures');
    if (!container) return;
    const empMap = {};
    empleados.forEach(e => empMap[e.id] = e);
    const pendientes = asistenciaHoy.filter(a => a.hora_entrada !== null && a.hora_salida === null);
    if (pendientes.length === 0) { container.innerHTML = `<div class="empty-entries"><i class="fas fa-check-circle"></i><span>Todos han registrado salida</span></div>`; return; }
    pendientes.sort((a, b) => new Date(a.hora_entrada) - new Date(b.hora_entrada));
    container.innerHTML = pendientes.map(r => {
        const emp = empMap[r.empleado_id];
        if (!emp) return '';
        return `<div class="entry-item"><div class="entry-time">${formatTimeForDisplay(r.hora_entrada)}</div><div class="entry-info"><h5>${emp.nombre_completo}</h5><p>${emp.puesto || 'Sin puesto'}</p></div><div class="entry-status warning"><i class="fas fa-clock"></i></div></div>`;
    }).join('');
}

async function loadCompletedDepartures(asistenciaHoy, empleados) {
    const container = document.getElementById('completedDepartures');
    if (!container) return;
    const empMap = {};
    empleados.forEach(e => empMap[e.id] = e);
    const completados = asistenciaHoy.filter(a => a.hora_salida !== null);
    if (completados.length === 0) { container.innerHTML = `<div class="empty-entries"><i class="fas fa-clock"></i><span>No hay salidas registradas</span></div>`; return; }
    completados.sort((a, b) => new Date(b.hora_salida) - new Date(a.hora_salida));
    container.innerHTML = completados.slice(0, 5).map(r => {
        const emp = empMap[r.empleado_id];
        if (!emp) return '';
        return `<div class="entry-item"><div class="entry-time">${formatTimeForDisplay(r.hora_salida)}</div><div class="entry-info"><h5>${emp.nombre_completo}</h5><p>${emp.puesto || 'Sin puesto'}</p></div><div class="entry-status success"><i class="fas fa-check-circle"></i></div></div>`;
    }).join('');
}

// ===== EVENTOS UI =====
function setupUIEvents() {
    // ⚠️ menuToggle lo maneja setupMobileMenu() — NO repetir aquí

    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) refreshBtn.addEventListener('click', async () => {
        refreshBtn.classList.add('fa-spin');
        await Promise.all([loadEmployees(), loadStats()]);
        setTimeout(() => { refreshBtn.classList.remove('fa-spin'); showNotification('Datos actualizados', 'success'); }, 500);
    });

    const backToDashboard = document.getElementById('backToDashboard');
    if (backToDashboard) backToDashboard.addEventListener('click', e => { e.preventDefault(); window.location.href = '../dashboard.html'; });

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) logoutBtn.addEventListener('click', e => {
        e.preventDefault();
        if (confirm('¿Cerrar sesión?')) {
            if (typeof logout === 'function') logout();
            else { localStorage.clear(); sessionStorage.clear(); window.location.href = '../index.html'; }
        }
    });

    const manualRegisterBtn = document.getElementById('manualRegisterBtn');
    if (manualRegisterBtn) manualRegisterBtn.addEventListener('click', () => {
        if (selectedEmployeeId) showManualRegisterModal(selectedEmployeeId);
        else showNotification('Selecciona un empleado de la lista', 'warning');
    });

    const viewAllEntries = document.getElementById('viewAllEntries');
    if (viewAllEntries) viewAllEntries.addEventListener('click', () => { window.location.href = 'dia.html'; });

    const toggleBeep = document.getElementById('toggleBeep');
    if (toggleBeep) toggleBeep.addEventListener('click', () => {
        soundEnabled = !soundEnabled;
        toggleBeep.innerHTML = soundEnabled ? '<i class="fas fa-volume-up"></i> Sonido' : '<i class="fas fa-volume-mute"></i> Silencio';
        toggleBeep.classList.toggle('secondary', !soundEnabled);
        showNotification(soundEnabled ? 'Sonido activado' : 'Sonido desactivado', 'info');
        saveSettings();
    });

    const testScanner = document.getElementById('testScanner');
    if (testScanner) testScanner.addEventListener('click', testScannerFunction);
}

function setupScannerEvents() {
    const startScanner = document.getElementById('startScanner');
    const stopScanner = document.getElementById('stopScanner');
    const toggleCamera = document.getElementById('toggleCamera');
    const cameraSelect = document.getElementById('cameraSelect');

    if (startScanner) startScanner.addEventListener('click', startQRScanner);
    if (stopScanner) stopScanner.addEventListener('click', stopQRScanner);
    if (toggleCamera) toggleCamera.addEventListener('click', switchCamera);
    if (cameraSelect) cameraSelect.addEventListener('change', function() {
        if (this.value && isScannerActive) switchToCamera(this.value);
    });

    initCameraList();
}

async function initCameraList() {
    try {
        if (typeof Html5Qrcode === 'undefined') return;
        const devices = await Html5Qrcode.getCameras();
        const cameraSelect = document.getElementById('cameraSelect');
        if (!cameraSelect) return;
        cameraSelect.innerHTML = '<option value="">Seleccionar cámara...</option>';
        if (devices && devices.length > 0) {
            devices.forEach((device, i) => {
                const opt = document.createElement('option');
                opt.value = device.id;
                opt.text = device.label || `Cámara ${i + 1}`;
                cameraSelect.appendChild(opt);
            });
            const back = devices.find(d => d.label?.toLowerCase().match(/back|rear|trasera/));
            const selected = back || devices[0];
            if (selected) { cameraSelect.value = selected.id; currentCameraId = selected.id; }
        } else {
            cameraSelect.innerHTML = '<option value="">No se detectaron cámaras</option>';
            showNotification('No se detectaron cámaras en el dispositivo', 'warning');
        }
    } catch (e) { showNotification('Error al acceder a las cámaras', 'error'); }
}

async function startQRScanner() {
    const startBtn = document.getElementById('startScanner');
    const stopBtn = document.getElementById('stopScanner');
    const toggleTorch = document.getElementById('toggleTorch');
    const cameraStatus = document.getElementById('cameraStatus');
    const cameraSelect = document.getElementById('cameraSelect');

    if (isScannerActive) return;
    if (typeof Html5Qrcode === 'undefined') { showNotification('Error: Librería de escáner no cargada', 'error'); return; }
    if (!currentCameraId && cameraSelect) currentCameraId = cameraSelect.value;
    if (!currentCameraId) { showNotification('Selecciona una cámara primero', 'warning'); return; }

    try {
        html5QrCode = new Html5Qrcode("qrReader");
        await html5QrCode.start(currentCameraId, { fps: 10, qrbox: { width: 450, height: 450 }, aspectRatio: 1.0, experimentalFeatures: { useBarCodeDetectorIfSupported: true }, supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA] }, onScanSuccess, onScanError);

        isScannerActive = true;
        if (startBtn) startBtn.disabled = true;
        if (stopBtn) stopBtn.disabled = false;
        if (toggleTorch) toggleTorch.disabled = false;
        if (cameraStatus) { cameraStatus.innerHTML = '<i class="fas fa-circle"></i><span>Escaneando activamente</span>'; cameraStatus.classList.add('active'); }
        showNotification('Escáner iniciado correctamente', 'success');
    } catch (error) {
        let msg = 'Error al iniciar el escáner';
        if (error.message?.includes('Permission') || error.message?.includes('NotAllowed')) msg = 'Permiso de cámara denegado.';
        else if (error.message?.includes('NotFound')) msg = 'No se encontró la cámara seleccionada.';
        else if (error.message?.includes('NotReadable')) msg = 'La cámara está siendo usada por otra aplicación.';
        showNotification(msg, 'error');
        isScannerActive = false;
        if (startBtn) startBtn.disabled = false;
        if (stopBtn) stopBtn.disabled = true;
        if (toggleTorch) toggleTorch.disabled = true;
        if (cameraStatus) { cameraStatus.innerHTML = '<i class="fas fa-circle"></i><span>Error de cámara</span>'; cameraStatus.classList.remove('active'); }
    }
}

async function stopQRScanner() {
    const startBtn = document.getElementById('startScanner');
    const stopBtn = document.getElementById('stopScanner');
    const toggleTorch = document.getElementById('toggleTorch');
    const cameraStatus = document.getElementById('cameraStatus');
    if (!isScannerActive || !html5QrCode) return;
    try {
        await html5QrCode.stop();
        html5QrCode.clear();
        html5QrCode = null;
        isScannerActive = false;
        if (startBtn) startBtn.disabled = false;
        if (stopBtn) stopBtn.disabled = true;
        if (toggleTorch) toggleTorch.disabled = true;
        if (cameraStatus) { cameraStatus.innerHTML = '<i class="fas fa-circle"></i><span>Escáner detenido</span>'; cameraStatus.classList.remove('active'); }
        showNotification('Escáner detenido', 'info');
    } catch (e) { showNotification('Error al detener el escáner', 'error'); }
}

async function onScanSuccess(decodedText) {
    if (soundEnabled) playBeepSound();
    if (html5QrCode && isScannerActive) { try { await html5QrCode.pause(); } catch (e) {} }
    try { await processQRCode(decodedText); } catch (e) { showNotification('Error al procesar el código QR', 'error'); }
    setTimeout(async () => { if (html5QrCode && isScannerActive) { try { await html5QrCode.resume(); } catch (e) {} } }, 2000);
}

function playBeepSound() {
    try {
        if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        oscillator.connect(gainNode); gainNode.connect(audioContext.destination);
        oscillator.frequency.value = 800; oscillator.type = 'sine'; gainNode.gain.value = 0.1;
        oscillator.start();
        setTimeout(() => { oscillator.stop(); oscillator.disconnect(); }, 100);
    } catch (e) {}
}

function onScanError(error) {
    if (error && !error.includes('NotFoundException')) console.log('⚠️ Scan error:', error);
}

async function processQRCode(qrCode) {
    try {
        const { data: empleado, error } = await supabaseClient.from('empleados').select('*').eq('codigo_qr', qrCode).eq('activo', true).single();
        if (error || !empleado) { showNotification('Código QR no válido o empleado inactivo', 'error'); return; }
        scanType === 'entrada' ? await registrarEntrada(empleado) : await registrarSalida(empleado);
    } catch (e) { showNotification('Error al procesar el código QR', 'error'); }
}

async function registrarEntrada(empleado) {
    const today = getLocalDateString();
    const now = getMexicoDateTime();
    try {
        const { data: existing, error: checkError } = await supabaseClient.from('asistencia').select('*').eq('empleado_id', empleado.id).eq('fecha', today).single();
        if (checkError && checkError.code !== 'PGRST116') { showNotification('Error al verificar registro previo', 'error'); return; }
        if (existing) { showNotification(`${empleado.nombre_completo} ya registró entrada a las ${formatTimeForDisplay(existing.hora_entrada)}`, 'warning'); return; }
        const { error } = await supabaseClient.from('asistencia').insert([{ empleado_id: empleado.id, fecha: today, hora_entrada: now, auto_salida: false }]).select().single();
        if (error) { showNotification('Error al registrar la entrada', 'error'); return; }
        showResultModal(empleado, now, null, 'Entrada registrada exitosamente');
        await loadStats();
    } catch (e) { showNotification('Error al registrar entrada', 'error'); }
}

async function registrarSalida(empleado) {
    const today = getLocalDateString();
    const now = getMexicoDateTime();
    try {
        const { data: existing, error: checkError } = await supabaseClient.from('asistencia').select('*').eq('empleado_id', empleado.id).eq('fecha', today).single();
        if (checkError || !existing) { showNotification(`${empleado.nombre_completo} no registró entrada hoy`, 'warning'); return; }
        if (existing.hora_salida !== null) { showNotification(`${empleado.nombre_completo} ya registró salida a las ${formatTimeForDisplay(existing.hora_salida)}`, 'warning'); return; }
        const diffMs = new Date(now) - new Date(existing.hora_entrada);
        const horasTrabajadas = Math.max(0, (diffMs / (1000 * 60 * 60))).toFixed(2);
        const { error } = await supabaseClient.from('asistencia').update({ hora_salida: now, horas_trabajadas: parseFloat(horasTrabajadas), auto_salida: false }).eq('id', existing.id).select().single();
        if (error) { showNotification('Error al registrar la salida', 'error'); return; }
        showResultModal(empleado, existing.hora_entrada, now, 'Salida registrada exitosamente', horasTrabajadas);
        await loadStats();
    } catch (e) { showNotification('Error al registrar salida', 'error'); }
}

async function switchCamera() {
    if (!isScannerActive || !html5QrCode) { showNotification('Inicia el escáner primero', 'warning'); return; }
    const cameraSelect = document.getElementById('cameraSelect');
    if (!cameraSelect || cameraSelect.value === currentCameraId) return;
    if (cameraSelect.value) await switchToCamera(cameraSelect.value);
}

async function switchToCamera(cameraId) {
    if (!html5QrCode) return;
    try {
        await html5QrCode.stop();
        await html5QrCode.start(cameraId, { fps: 10, qrbox: { width: 450, height: 450 }, aspectRatio: 1.0 }, onScanSuccess, onScanError);
        currentCameraId = cameraId;
        showNotification('Cámara cambiada exitosamente', 'success');
    } catch (e) {
        showNotification('Error al cambiar de cámara', 'error');
        if (currentCameraId) { try { await html5QrCode.start(currentCameraId, { fps: 10, qrbox: { width: 450, height: 450 } }, onScanSuccess, onScanError); } catch (e2) {} }
    }
}

function testScannerFunction() {
    if (soundEnabled) playBeepSound();
    showNotification('Escáner funcionando correctamente', 'success');
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        setTimeout(() => processQRCode('COLTS-TEST-123456').catch(console.error), 500);
    }
}

async function showManualRegisterModal(empleadoId) {
    try {
        const { data: empleado, error } = await supabaseClient.from('empleados').select('*').eq('id', empleadoId).single();
        if (error || !empleado) { showNotification('Error al obtener datos del empleado', 'error'); return; }
        const pn = document.getElementById('previewName');
        const pp = document.getElementById('previewPuesto');
        if (pn) pn.textContent = empleado.nombre_completo;
        if (pp) pp.textContent = empleado.puesto || 'Sin puesto';
        const currentTime = formatTimeForDisplay(getMexicoDateTime());
        const pt = document.getElementById('previewTime');
        if (pt) pt.textContent = `Hora actual: ${currentTime}`;
        if (scanType === 'salida') {
            const today = getLocalDateString();
            const { data: registro } = await supabaseClient.from('asistencia').select('hora_entrada').eq('empleado_id', empleadoId).eq('fecha', today).single();
            const pe = document.getElementById('previewEntrada');
            const ps = document.getElementById('previewSalida');
            if (pe) pe.textContent = registro?.hora_entrada ? formatTimeForDisplay(registro.hora_entrada) : 'No registrada';
            if (ps) ps.textContent = currentTime;
        }
        const confirmBtn = document.getElementById('confirmRegister');
        if (confirmBtn) confirmBtn.dataset.empleadoId = empleadoId;
        document.getElementById('confirmModal')?.classList.add('show');
    } catch (e) { showNotification('Error al mostrar modal de registro', 'error'); }
}

async function processManualRegister(empleadoId) {
    try {
        const { data: empleado, error } = await supabaseClient.from('empleados').select('*').eq('id', empleadoId).single();
        if (error || !empleado) { showNotification('Error al obtener datos del empleado', 'error'); return; }
        scanType === 'entrada' ? await registrarEntrada(empleado) : await registrarSalida(empleado);
        document.getElementById('confirmModal')?.classList.remove('show');
    } catch (e) { showNotification('Error en registro manual', 'error'); }
}

function showResultModal(empleado, horaEntrada, horaSalida, mensaje, horasTrabajadas = null) {
    const rn = document.getElementById('resultEmployeeName');
    const rm = document.getElementById('resultMessage');
    if (rn) rn.textContent = empleado.nombre_completo;
    if (rm) rm.textContent = mensaje;

    if (scanType === 'entrada') {
        const rt = document.getElementById('resultTime');
        if (rt) { rt.textContent = `Hora: ${formatTimeForDisplay(horaEntrada)}`; rt.style.display = 'block'; }
        ['resultEntrada','resultSalida','resultHours'].forEach(id => {
            const el = document.getElementById(id)?.parentElement;
            if (el) el.style.display = 'none';
        });
    } else {
        const rt = document.getElementById('resultTime');
        if (rt) rt.style.display = 'none';
        const re = document.getElementById('resultEntrada');
        const rs = document.getElementById('resultSalida');
        const rh = document.getElementById('resultHours');
        if (re) { re.textContent = formatTimeForDisplay(horaEntrada); re.parentElement.style.display = 'block'; }
        if (rs) { rs.textContent = formatTimeForDisplay(horaSalida); rs.parentElement.style.display = 'block'; }
        if (rh) { rh.textContent = formatHorasTrabajadas(parseFloat(horasTrabajadas)); rh.parentElement.style.display = 'block'; }
    }

    document.getElementById('resultModal')?.classList.add('show');
}

function setupModalEvents() {
    ['closeConfirmModal','cancelRegister'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('click', () => document.getElementById('confirmModal')?.classList.remove('show'));
    });

    const confirmRegister = document.getElementById('confirmRegister');
    if (confirmRegister) confirmRegister.addEventListener('click', async function() {
        const id = this.dataset.empleadoId;
        if (id) await processManualRegister(id);
    });

    const closeResultModal = document.getElementById('closeResultModal');
    if (closeResultModal) closeResultModal.addEventListener('click', () => document.getElementById('resultModal')?.classList.remove('show'));

    const scanAgain = document.getElementById('scanAgain');
    if (scanAgain) scanAgain.addEventListener('click', () => document.getElementById('resultModal')?.classList.remove('show'));

    const goToDashboard = document.getElementById('goToDashboard');
    if (goToDashboard) goToDashboard.addEventListener('click', () => { window.location.href = '../dashboard.html'; });

    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', e => { if (e.target === modal) modal.classList.remove('show'); });
    });
}

// ===== MENÚ HAMBURGUESA — IMPLEMENTACIÓN COMPLETA =====
function setupMobileMenu() {
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.querySelector('.sidebar');
    if (!menuToggle || !sidebar) return;

    // Crear overlay si no existe
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

    // Clonar el toggle para eliminar cualquier listener previo
    const newToggle = menuToggle.cloneNode(true);
    menuToggle.parentNode.replaceChild(newToggle, menuToggle);

    newToggle.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        sidebar.classList.contains('mobile-active') ? closeMenu() : openMenu();
    });

    overlay.addEventListener('click', closeMenu);

    // Cerrar al navegar desde el menú (solo en móvil)
    sidebar.querySelectorAll('.sidebar-menu a, .logout-btn').forEach(link => {
        link.addEventListener('click', () => {
            if (window.innerWidth <= 992 && overlay.style.display === 'block') closeMenu();
        });
    });

    // Cerrar automáticamente al pasar a pantalla grande
    window.addEventListener('resize', () => {
        if (window.innerWidth > 992) {
            sidebar.classList.remove('mobile-active');
            overlay.style.opacity = '0';
            overlay.style.display = 'none';
            document.body.style.overflow = '';
        }
    });

    console.log('📱 Menú móvil configurado (qr-scanner)');
}

function setupSound() {
    try { audioContext = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {}
}

function loadSettings() {
    try {
        const settings = localStorage.getItem('colts_scanner_settings');
        if (settings) {
            const parsed = JSON.parse(settings);
            soundEnabled = parsed.soundEnabled !== false;
            const tb = document.getElementById('toggleBeep');
            if (tb) {
                tb.innerHTML = soundEnabled ? '<i class="fas fa-volume-up"></i> Sonido' : '<i class="fas fa-volume-mute"></i> Silencio';
                tb.classList.toggle('secondary', !soundEnabled);
            }
        }
    } catch (e) {}
}

function saveSettings() {
    try {
        localStorage.setItem('colts_scanner_settings', JSON.stringify({ soundEnabled, lastCameraId: currentCameraId, timestamp: new Date().toISOString() }));
    } catch (e) {}
}

async function executeAutoSalida() {
    try {
        const today = getLocalDateString();
        const now = new Date();
        const salidaAuto = new Date(now);
        salidaAuto.setHours(22, 0, 0, 0);
        const { data: pendientes, error } = await supabaseClient.from('asistencia').select('*, empleados(nombre_completo)').eq('fecha', today).is('hora_salida', null).not('hora_entrada', 'is', null);
        if (error || !pendientes?.length) return;
        for (const registro of pendientes) {
            const horasTrabajadas = ((salidaAuto - new Date(registro.hora_entrada)) / (1000 * 60 * 60)).toFixed(2);
            await supabaseClient.from('asistencia').update({ hora_salida: salidaAuto.toISOString(), horas_trabajadas: parseFloat(horasTrabajadas), auto_salida: true }).eq('id', registro.id);
        }
        showNotification(`Auto-salida registrada para ${pendientes.length} empleados`, 'info');
        if (scanType === 'salida') await loadStats();
    } catch (e) { console.error('Error en auto-salida:', e); }
}

function setupAutoSalidaChecker() {
    if (scanType !== 'salida') return;
    setInterval(() => {
        const now = new Date();
        if (now.getHours() === 22 && now.getMinutes() === 0) executeAutoSalida();
    }, 60000);
}

function showNotification(message, type = 'info') {
    const container = document.getElementById('notifications');
    if (!container) return;
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    const icons = { success:'check-circle', error:'exclamation-circle', warning:'exclamation-triangle', info:'info-circle' };
    notification.innerHTML = `
        <div class="notification-content"><i class="fas fa-${icons[type]||'info-circle'}"></i><span>${message}</span></div>
        <button class="notification-close"><i class="fas fa-times"></i></button>`;
    container.appendChild(notification);
    setTimeout(() => notification.classList.add('show'), 10);
    notification.querySelector('.notification-close').addEventListener('click', () => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    });
    setTimeout(() => { if (notification.parentNode) { notification.classList.remove('show'); setTimeout(() => notification.remove(), 300); } }, 5000);
}

function protectPage() {
    try {
        const session = localStorage.getItem('colts_session') || sessionStorage.getItem('colts_session');
        const token = localStorage.getItem('colts_token') || sessionStorage.getItem('colts_token');
        if (!session || token !== 'authenticated') { window.location.href = '../index.html'; return false; }
        return true;
    } catch (e) { window.location.href = '../index.html'; return false; }
}

console.log('✅ qr-scanner.js cargado — menú móvil funcional');