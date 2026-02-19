// ===== REGISTRO DE EMPLEADOS - Mini Abarrotes COLT'S =====
// VERSIÓN FINAL CORREGIDA - SIN ERRORES DE AUTENTICACIÓN

// ===== FUNCIÓN HELPER PARA FECHAS LOCALES =====
function getLocalISOString() {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000; // offset en milisegundos
    const localTime = new Date(now - offset);
    return localTime.toISOString().slice(0, -1); // Remover la 'Z' del final
}
console.log('👥 Módulo de Empleados inicializando...');

let supabaseClient = null;
let isSubmitting = false;

document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 Inicializando formulario de empleados...');
    
    // Pequeño retraso para asegurar que todo cargue
    await new Promise(resolve => setTimeout(resolve, 100));
    
    if (!protectPage()) {
        console.log('⛔ Página protegida - redirigiendo');
        return;
    }
    
    const initialized = await initSupabase();
    if (!initialized) {
        showNotification('Error de conexión con la base de datos', 'error');
        return;
    }
    
    loadUserData();
    setupFormEvents();
    setupUIEvents();
    updateDateTime();
    startDateTimeUpdates();
    
    console.log('✅ Formulario de empleados listo');
});

async function initSupabase() {
    try {
        if (typeof supabase === 'undefined') {
            console.error('❌ Supabase no está disponible');
            return false;
        }
        
        const SUPABASE_URL = 'https://iokkxkpfncbumnjamquh.supabase.co';
        const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlva2t4a3BmbmNidW1uamFtcXVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA0MzE3MzgsImV4cCI6MjA4NjAwNzczOH0.7eKVc1I0v5n5zaB4rUEASizm05cFWTieOgtgMmZku6w';
        
        supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
                detectSessionInUrl: false
            }
        });
        
        // Probar conexión simple
        const { error } = await supabaseClient
            .from('empleados')
            .select('count', { count: 'exact', head: true });
        
        if (error && error.code !== 'PGRST116') {
            console.error('Error de conexión:', error);
            return false;
        }
        
        console.log('✅ Supabase conectado');
        return true;
        
    } catch (error) {
        console.error('❌ Error:', error);
        return false;
    }
}

function loadUserData() {
    try {
        const sessionData = localStorage.getItem('colts_session') || sessionStorage.getItem('colts_session');
        if (sessionData) {
            const session = JSON.parse(sessionData);
            const userName = document.getElementById('userName');
            const userEmail = document.getElementById('userEmail');
            if (userName) userName.textContent = 'Administrador';
            if (userEmail) userEmail.textContent = session.usuario || 'colts';
        }
    } catch (error) {
        console.error('Error cargando datos:', error);
    }
}

function setupFormEvents() {
    const fechaNacimiento = document.getElementById('fecha_nacimiento');
    const puestoSelect = document.getElementById('puesto');
    const otroPuestoContainer = document.getElementById('otroPuestoContainer');
    const otroPuestoInput = document.getElementById('otro_puesto');
    const parentescoSelect = document.getElementById('emergencia_parentesco');
    const otroParentescoContainer = document.getElementById('otroParentescoContainer');
    const cancelBtn = document.getElementById('cancelBtn');
    const empleadoForm = document.getElementById('empleadoForm');
    
    if (fechaNacimiento) {
        fechaNacimiento.addEventListener('change', calcularEdad);
    }
    
    if (puestoSelect) {
        puestoSelect.addEventListener('change', function() {
            if (this.value === 'otro') {
                otroPuestoContainer.style.display = 'block';
                otroPuestoInput.required = true;
            } else {
                otroPuestoContainer.style.display = 'none';
                otroPuestoInput.required = false;
                otroPuestoInput.value = '';
            }
        });
    }
    
    if (parentescoSelect) {
        parentescoSelect.addEventListener('change', function() {
            if (this.value === 'otro') {
                otroParentescoContainer.style.display = 'block';
                document.getElementById('emergencia_otro_parentesco').required = true;
            } else {
                otroParentescoContainer.style.display = 'none';
                document.getElementById('emergencia_otro_parentesco').required = false;
                document.getElementById('emergencia_otro_parentesco').value = '';
            }
        });
    }
    
    if (empleadoForm) {
        empleadoForm.addEventListener('submit', handleFormSubmit);
    }
    
    if (cancelBtn) {
        cancelBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (confirm('¿Cancelar? Se perderán los datos.')) {
                window.location.href = 'lista.html';
            }
        });
    }
}

function calcularEdad() {
    const fechaNacimiento = document.getElementById('fecha_nacimiento').value;
    const edadInput = document.getElementById('edad');
    
    if (!fechaNacimiento) {
        edadInput.value = '';
        return;
    }
    
    const hoy = new Date();
    const nacimiento = new Date(fechaNacimiento);
    
    if (nacimiento > hoy) {
        showNotification('La fecha no puede ser futura', 'error');
        document.getElementById('fecha_nacimiento').value = '';
        edadInput.value = '';
        return;
    }
    
    let edad = hoy.getFullYear() - nacimiento.getFullYear();
    const mes = hoy.getMonth() - nacimiento.getMonth();
    
    if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) {
        edad--;
    }
    
    if (edad < 18) {
        showNotification('Debe ser mayor de 18 años', 'error');
        document.getElementById('fecha_nacimiento').value = '';
        edadInput.value = '';
    } else if (edad > 70) {
        showNotification('Edad máxima 70 años', 'error');
        document.getElementById('fecha_nacimiento').value = '';
        edadInput.value = '';
    } else {
        edadInput.value = edad;
    }
}

function validateForm() {
    let isValid = true;
    
    const nombre = document.getElementById('nombre');
    if (!nombre.value.trim()) {
        markInvalid(nombre, 'El nombre es obligatorio');
        isValid = false;
    } else {
        markValid(nombre);
    }
    
    const apellidoPaterno = document.getElementById('apellido_paterno');
    if (!apellidoPaterno.value.trim()) {
        markInvalid(apellidoPaterno, 'El apellido paterno es obligatorio');
        isValid = false;
    } else {
        markValid(apellidoPaterno);
    }
    
    const fechaNacimiento = document.getElementById('fecha_nacimiento');
    if (!fechaNacimiento.value) {
        markInvalid(fechaNacimiento, 'La fecha de nacimiento es obligatoria');
        isValid = false;
    } else {
        markValid(fechaNacimiento);
    }
    
    const telefono = document.getElementById('telefono');
    const telefonoValue = telefono.value.replace(/\D/g, '');
    if (telefonoValue.length !== 10) {
        markInvalid(telefono, 'El teléfono debe tener 10 dígitos');
        isValid = false;
    } else {
        markValid(telefono);
        telefono.value = telefonoValue;
    }
    
    const emergenciaTel = document.getElementById('emergencia_telefono');
    const emergenciaValue = emergenciaTel.value.replace(/\D/g, '');
    if (emergenciaValue.length !== 10) {
        markInvalid(emergenciaTel, 'El teléfono de emergencia debe tener 10 dígitos');
        isValid = false;
    } else {
        markValid(emergenciaTel);
        emergenciaTel.value = emergenciaValue;
    }
    
    const parentesco = document.getElementById('emergencia_parentesco');
    if (!parentesco.value) {
        markInvalid(parentesco, 'Selecciona un parentesco');
        isValid = false;
    } else if (parentesco.value === 'otro') {
        const otroParentesco = document.getElementById('emergencia_otro_parentesco');
        if (!otroParentesco.value.trim()) {
            markInvalid(otroParentesco, 'Especifica el parentesco');
            isValid = false;
        } else {
            markValid(otroParentesco);
        }
    } else {
        markValid(parentesco);
    }
    
    const puesto = document.getElementById('puesto');
    if (!puesto.value) {
        markInvalid(puesto, 'Selecciona un puesto');
        isValid = false;
    } else if (puesto.value === 'otro') {
        const otroPuesto = document.getElementById('otro_puesto');
        if (!otroPuesto.value.trim()) {
            markInvalid(otroPuesto, 'Especifica el puesto');
            isValid = false;
        } else {
            markValid(otroPuesto);
        }
    } else {
        markValid(puesto);
    }
    
    return isValid;
}

function getFormData() {
    const nombre = document.getElementById('nombre').value.trim();
    const apellidoPaterno = document.getElementById('apellido_paterno').value.trim();
    const apellidoMaterno = document.getElementById('apellido_materno').value.trim();
    const nombreCompleto = `${nombre} ${apellidoPaterno} ${apellidoMaterno}`.replace(/\s+/g, ' ').trim();
    
    const edad = document.getElementById('edad').value || null;
    const telefono = document.getElementById('telefono').value.replace(/\D/g, '');
    const fechaNacimiento = document.getElementById('fecha_nacimiento').value || null;
    
    const emergenciaTelefono = document.getElementById('emergencia_telefono').value.replace(/\D/g, '');
    let emergenciaParentesco = document.getElementById('emergencia_parentesco').value;
    
    if (emergenciaParentesco === 'otro') {
        emergenciaParentesco = document.getElementById('emergencia_otro_parentesco').value.trim() || 'Otro';
    }
    
    let puesto = document.getElementById('puesto').value;
    if (puesto === 'otro') {
        puesto = document.getElementById('otro_puesto').value.trim() || 'Sin especificar';
    }
    
    const codigoQr = generateQRCode();
    const ahora = getLocalISOString(); // ← AGREGAR ESTA LÍNEA
    
    return {
        nombre_completo: nombreCompleto,
        nombre: nombre,
        apellido_paterno: apellidoPaterno,
        apellido_materno: apellidoMaterno || null,
        edad: edad,
        telefono: telefono,
        fecha_nacimiento: fechaNacimiento,
        emergencia_telefono: emergenciaTelefono,
        emergencia_parentesco: emergenciaParentesco,
        puesto: puesto,
        codigo_qr: codigoQr,
        activo: true,
        created_at: ahora,    // ← AGREGAR ESTA LÍNEA
        updated_at: ahora     // ← AGREGAR ESTA LÍNEA
    };
}

function generateQRCode() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 10);
    return `COLTS-${timestamp.toString(36)}-${random}`.toUpperCase();
}

async function handleFormSubmit(event) {
    event.preventDefault();
    
    if (isSubmitting) return;
    
    if (!validateForm()) {
        showNotification('Corrige los errores en el formulario', 'error');
        return;
    }
    
    isSubmitting = true;
    
    const submitBtn = document.getElementById('submitBtn');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
    
    try {
        const data = getFormData();
        
        // Verificar conexión antes de guardar
        if (!supabaseClient) {
            throw new Error('Error de conexión con la base de datos');
        }
        
        const { error } = await supabaseClient
            .from('empleados')
            .insert([data]);
        
        if (error) {
            console.error('Error Supabase:', error);
            throw new Error(error.message);
        }
        
        showNotification('¡Empleado registrado exitosamente!', 'success');
        showQRCode(data.codigo_qr, data.nombre_completo);
        
        // Deshabilitar formulario
        document.getElementById('empleadoForm').querySelectorAll('input, select, button')
            .forEach(el => el.disabled = true);
        
        submitBtn.innerHTML = '<i class="fas fa-check"></i> Guardado';
        
        setTimeout(() => window.location.href = 'lista.html', 3000);
        
    } catch (error) {
        console.error('Error:', error);
        showNotification('Error al guardar: ' + error.message, 'error');
        
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-save"></i> Guardar Empleado';
        isSubmitting = false;
    }
}

function showQRCode(codigoQr, nombre) {
    const qrPreview = document.getElementById('qrPreview');
    if (!qrPreview) return;
    
    qrPreview.innerHTML = '';
    
    const container = document.createElement('div');
    container.style.cssText = 'width:200px; height:200px; margin:0 auto; background:white; padding:10px; border-radius:8px;';
    qrPreview.appendChild(container);
    
    if (typeof QRCode !== 'undefined') {
        try {
            new QRCode(container, {
                text: codigoQr,
                width: 180,
                height: 180,
                colorDark: "#000000",
                colorLight: "#FFFFFF"
            });
        } catch (e) {
            container.innerHTML = `<div style="text-align:center; padding:20px;">${codigoQr}</div>`;
        }
    } else {
        container.innerHTML = `<div style="text-align:center; padding:20px;">${codigoQr}</div>`;
    }
    
    const info = document.createElement('p');
    info.style.cssText = 'margin-top:10px; font-size:12px; text-align:center;';
    info.innerHTML = `<strong>Código:</strong> ${codigoQr}`;
    qrPreview.appendChild(info);
}

function markInvalid(element, message) {
    const group = element.closest('.form-group');
    if (!group) return;
    
    group.classList.add('error');
    
    const existing = group.querySelector('.error-message');
    if (existing) existing.remove();
    
    const error = document.createElement('div');
    error.className = 'error-message';
    error.textContent = message;
    error.style.cssText = 'color:#FF4757; font-size:0.85rem; margin-top:0.25rem;';
    group.appendChild(error);
}

function markValid(element) {
    const group = element.closest('.form-group');
    if (!group) return;
    
    group.classList.remove('error');
    const existing = group.querySelector('.error-message');
    if (existing) existing.remove();
}

function updateDateTime() {
    const now = new Date();
    const currentDate = document.getElementById('currentDate');
    const currentTime = document.getElementById('currentTime');
    
    if (currentDate) {
        currentDate.textContent = now.toLocaleDateString('es-MX', {
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric'
        });
    }
    
    if (currentTime) {
        currentTime.textContent = now.toLocaleTimeString('es-MX', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    }
}

function startDateTimeUpdates() {
    setInterval(updateDateTime, 1000);
}

function showNotification(message, type = 'info', duration = 3000) {
    console.log(`📢 [${type}] ${message}`);
    
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
        <div style="display:flex; align-items:center; gap:10px;">
            <i class="fas fa-${icon}"></i>
            <span>${message}</span>
        </div>
    `;
    
    container.appendChild(notification);
    setTimeout(() => notification.classList.add('show'), 10);
    
    setTimeout(() => {
        if (notification.parentNode) {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }
    }, duration);
}

function protectPage() {
    try {
        const session = localStorage.getItem('colts_session') || sessionStorage.getItem('colts_session');
        const token = localStorage.getItem('colts_token') || sessionStorage.getItem('colts_token');
        
        if (!session || token !== 'authenticated') {
            setTimeout(() => window.location.href = '../index.html', 1500);
            return false;
        }
        return true;
    } catch (error) {
        return false;
    }
}

function setupUIEvents() {
    const menuToggle = document.getElementById('menuToggle');
    if (menuToggle) {
        menuToggle.addEventListener('click', () => {
            document.querySelector('.sidebar').classList.toggle('collapsed');
        });
    }
    
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            refreshBtn.classList.add('fa-spin');
            updateDateTime();
            setTimeout(() => refreshBtn.classList.remove('fa-spin'), 500);
            showNotification('Página actualizada', 'info');
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
            if (confirm('¿Cerrar sesión?')) {
                localStorage.clear();
                sessionStorage.clear();
                window.location.href = '../index.html';
            }
        });
    }
}

console.log('✅ empleados.js cargado - Versión final corregida');