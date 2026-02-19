// ===== LOGIN MINI ABARROTES COLT'S - CORREGIDO =====
console.log('🔧 Sistema de Login COLT\'S inicializando...');

// ===== CONFIGURACIÓN =====
const SUPABASE_URL = 'https://iokkxkpfncbumnjamquh.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlva2t4a3BmbmNidW1uamFtcXVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA0MzE3MzgsImV4cCI6MjA4NjAwNzczOH0.7eKVc1I0v5n5zaB4rUEASizm05cFWTieOgtgMmZku6w';

// ===== VARIABLES GLOBALES =====
let supabaseClient = null;
let isRedirecting = false;

// ===== ELEMENTOS DOM =====
const DOM = {
    loginForm: document.getElementById('loginForm'),
    usuarioInput: document.getElementById('usuario'),
    passwordInput: document.getElementById('contraseña'),
    togglePasswordBtn: document.getElementById('togglePassword'),
    rememberCheckbox: document.getElementById('remember'),
    loginButton: document.querySelector('.login-button'),
    notifications: document.getElementById('notifications')
};

// ===== FUNCIÓN DE NOTIFICACIONES (MANTENER IGUAL) =====
function showNotification(message, type = 'info', duration = 3000) {
    console.log(`[${type.toUpperCase()}] ${message}`);
    
    let container = DOM.notifications;
    if (!container) {
        container = document.createElement('div');
        container.id = 'notifications';
        container.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 9999;
        `;
        document.body.appendChild(container);
    }
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.style.cssText = `
        background: ${type === 'success' ? '#2ED573' : type === 'error' ? '#FF4757' : '#002DE6'};
        color: white;
        padding: 12px 20px;
        margin-bottom: 10px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        animation: slideIn 0.3s ease;
        font-family: 'Montserrat', sans-serif;
        max-width: 350px;
    `;
    
    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    if (type === 'error') icon = '❌';
    if (type === 'warning') icon = '⚠️';
    
    notification.innerHTML = `${icon} ${message}`;
    container.appendChild(notification);
    
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateX(100%)';
        notification.style.transition = 'all 0.3s ease';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, duration);
    
    notification.addEventListener('click', () => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    });
}

if (!document.querySelector('#notification-anim')) {
    const style = document.createElement('style');
    style.id = 'notification-anim';
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
    `;
    document.head.appendChild(style);
}

// ===== INICIALIZAR SUPABASE =====
function initSupabase() {
    try {
        if (window.supabase && window.supabase.createClient) {
            supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
            console.log('✅ Supabase inicializado');
            return true;
        } else {
            console.error('❌ Supabase CDN no cargado');
            return false;
        }
    } catch (error) {
        console.error('Error inicializando Supabase:', error);
        return false;
    }
}

// ===== FUNCIÓN DE LOGIN CORREGIDA =====
async function loginWithSupabase(usuario, contraseña) {
    console.log('🔐 Verificando credenciales...');
    
    try {
        if (!supabaseClient) {
            const initialized = initSupabase();
            if (!initialized) {
                throw new Error('Error de conexión con el servidor');
            }
        }
        
        console.log('📡 Buscando usuario:', usuario);
        
        // 1. Obtener el hash bcrypt del administrador
        const { data: admin, error: adminError } = await supabaseClient
            .from('administradores')
            .select('id, usuario, password, nombre_completo')
            .eq('usuario', usuario)
            .single();
        
        if (adminError) {
            console.error('Error Supabase:', adminError);
            if (adminError.code === 'PGRST116') {
                throw new Error('Usuario no encontrado');
            }
            throw new Error('Error de conexión con la base de datos');
        }
        
        if (!admin) {
            throw new Error('Usuario no encontrado');
        }
        
        console.log('✅ Usuario encontrado:', admin.usuario);
        console.log('🔑 Hash bcrypt obtenido (primeros 20 chars):', admin.password.substring(0, 20) + '...');
        
        // 2. Usar la función verify_password de Supabase (bcrypt)
        const { data: isValid, error: verifyError } = await supabaseClient
            .rpc('verify_password', {
                password_hash: admin.password,  // ← ¡CORREGIDO! Usar 'password' no 'contraseña_hash'
                password_input: contraseña
            });
        
        if (verifyError) {
            console.error('Error verificando contraseña:', verifyError);
            throw new Error('Error verificando credenciales');
        }
        
        console.log('🔐 Resultado verificación:', isValid);
        
        if (!isValid) {
            throw new Error('Contraseña incorrecta');
        }
        
        console.log('🎉 Credenciales correctas!');
        
        return {
            success: true,
            user: {
                id: admin.id,
                usuario: admin.usuario,
                nombre: admin.nombre_completo || 'Administrador'
            }
        };
        
    } catch (error) {
        console.error('Error en login:', error);
        throw error;
    }
}

// ===== MANEJAR ENVÍO DE FORMULARIO =====
async function handleLoginSubmit(event) {
    event.preventDefault();
    
    if (isRedirecting) {
        console.log('⚠️ Ya estamos redirigiendo, ignorando...');
        return;
    }
    
    const usuario = DOM.usuarioInput.value.trim();
    const contraseña = DOM.passwordInput.value;
    const remember = DOM.rememberCheckbox?.checked || false;
    
    if (!usuario || !contraseña) {
        showNotification('Por favor, completa todos los campos', 'error');
        return;
    }
    
    if (DOM.loginButton) {
        DOM.loginButton.disabled = true;
        DOM.loginButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verificando...';
    }
    
    try {
        const result = await loginWithSupabase(usuario, contraseña);
        
        if (result.success) {
            isRedirecting = true;
            
            const sessionData = {
                id: result.user.id,
                usuario: result.user.usuario,
                nombre: result.user.nombre,
                timestamp: Date.now()
            };
            
            if (remember) {
                localStorage.setItem('colts_session', JSON.stringify(sessionData));
                localStorage.setItem('colts_token', 'authenticated');
                console.log('💾 Sesión guardada en localStorage');
            } else {
                sessionStorage.setItem('colts_session', JSON.stringify(sessionData));
                sessionStorage.setItem('colts_token', 'authenticated');
                console.log('💾 Sesión guardada en sessionStorage');
            }
            
            showNotification(`¡Bienvenido ${result.user.nombre}!`, 'success');
            
            setTimeout(() => {
                console.log('🔄 Redirigiendo a dashboard...');
                window.location.href = 'dashboard.html';
            }, 1000);
        }
        
    } catch (error) {
        console.error('Error completo en login:', error);
        
        let errorMessage = 'Error desconocido';
        if (error.message.includes('contraseña') || error.message.includes('incorrecta')) {
            errorMessage = 'Contraseña incorrecta';
        } else if (error.message.includes('no encontrado')) {
            errorMessage = 'Usuario no encontrado';
        } else if (error.message.includes('conexión') || error.message.includes('conect')) {
            errorMessage = 'Error de conexión. Intenta de nuevo.';
        } else {
            errorMessage = error.message;
        }
        
        showNotification(errorMessage, 'error');
        
        if (DOM.loginButton) {
            DOM.loginButton.disabled = false;
            DOM.loginButton.innerHTML = '<i class="fas fa-sign-in-alt"></i> Iniciar Sesión';
        }
    }
}

// ===== TOGGLE VISIBILIDAD DE CONTRASEÑA =====
function setupPasswordToggle() {
    if (DOM.togglePasswordBtn && DOM.passwordInput) {
        DOM.togglePasswordBtn.addEventListener('click', function() {
            const type = DOM.passwordInput.type === 'password' ? 'text' : 'password';
            DOM.passwordInput.type = type;
            this.innerHTML = type === 'password' ? 
                '<i class="fas fa-eye"></i>' : 
                '<i class="fas fa-eye-slash"></i>';
        });
    }
}

// ===== VERIFICAR SESIÓN EXISTENTE =====
function checkExistingSession() {
    try {
        const session = localStorage.getItem('colts_session') || 
                       sessionStorage.getItem('colts_session');
        const token = localStorage.getItem('colts_token') || 
                     sessionStorage.getItem('colts_token');
        
        if (session && token === 'authenticated') {
            const sessionData = JSON.parse(session);
            const sessionAge = Date.now() - sessionData.timestamp;
            const maxAge = 8 * 60 * 60 * 1000; // 8 horas
            
            if (sessionAge < maxAge) {
                console.log('✅ Sesión válida encontrada');
                return sessionData;
            } else {
                console.log('⏰ Sesión expirada');
                localStorage.removeItem('colts_session');
                localStorage.removeItem('colts_token');
                sessionStorage.removeItem('colts_session');
                sessionStorage.removeItem('colts_token');
            }
        }
    } catch (error) {
        console.error('Error verificando sesión:', error);
    }
    return null;
}
///
// ===== INICIALIZACIÓN DE LA PÁGINA =====
function initLoginPage() {
    console.log('🚀 Inicializando página de login...');
    
    const isLoginPage = window.location.pathname.endsWith('index.html') || 
                        window.location.pathname === '/' ||
                        window.location.pathname.endsWith('/');
    
    if (isLoginPage) {
        const existingSession = checkExistingSession();
        if (existingSession && !isRedirecting) {
            console.log('🔄 Sesión detectada, redirigiendo...');
            isRedirecting = true;
            showNotification('Sesión activa detectada', 'info', 1500);
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 800);
            return;
        }
    }
    
    if (DOM.loginForm) {
        DOM.loginForm.addEventListener('submit', handleLoginSubmit);
        console.log('✅ Formulario configurado');
    }
    
    setupPasswordToggle();
    
    if (DOM.usuarioInput) {
        DOM.usuarioInput.focus();
    }
    
    initSupabase();
    
    console.log('✅ Login page completamente inicializado');
}
///
// ===== CUANDO EL DOCUMENTO ESTÉ LISTO =====
document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 Documento cargado, inicializando...');
    initLoginPage();
});
//////
// ===== EXPORTAR FUNCIONES (para otras páginas) =====
window.showNotification = showNotification;
window.checkExistingSession = checkExistingSession;
window.logout = function() {
    localStorage.removeItem('colts_session');
    localStorage.removeItem('colts_token');
    sessionStorage.removeItem('colts_session');
    sessionStorage.removeItem('colts_token');
    window.location.href = 'index.html';
};
// ===== FUNCIÓN PARA OTRAS PÁGINAS =====
function requireAuth() {
    try {
        const session = localStorage.getItem('colts_session') || 
                       sessionStorage.getItem('colts_session');
        const token = localStorage.getItem('colts_token') || 
                     sessionStorage.getItem('colts_token');
        
        if (!session || token !== 'authenticated') {
            console.error('❌ No autenticado - redirigiendo a login');
            
            // Mostrar notificación
            showNotification('Debes iniciar sesión primero', 'error', 2000);
            
            // Redirigir después de 1.5 segundos
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1500);
            
            return false;
        }
        
        // Verificar si la sesión ha expirado (8 horas máximo)
        try {
            const sessionData = JSON.parse(session);
            const sessionAge = Date.now() - sessionData.timestamp;
            const maxAge = 8 * 60 * 60 * 1000; // 8 horas
            
            if (sessionAge > maxAge) {
                console.log('⏰ Sesión expirada');
                
                // Limpiar
                localStorage.removeItem('colts_session');
                localStorage.removeItem('colts_token');
                sessionStorage.removeItem('colts_session');
                sessionStorage.removeItem('colts_token');
                
                showNotification('Sesión expirada. Inicia sesión nuevamente.', 'error', 2000);
                
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 1500);
                
                return false;
            }
        } catch (parseError) {
            console.error('Error parseando sesión:', parseError);
            // Si hay error al parsear, considerar como no autenticado
        }
        
        console.log('✅ Sesión válida');
        return true;
        
    } catch (error) {
        console.error('Error en requireAuth:', error);
        return false;
    }
}

// Asegurar que esté disponible globalmente
window.requireAuth = requireAuth;
console.log('🔥 auth.js cargado completamente');