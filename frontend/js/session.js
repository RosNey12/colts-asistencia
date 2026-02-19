// ===== MANEJO DE SESIÓN UNIFICADO =====

// Función para verificar sesión (para dashboard y otras páginas)
function verifySession() {
    try {
        const session = localStorage.getItem('colts_session') || 
                       sessionStorage.getItem('colts_session');
        const token = localStorage.getItem('colts_token') || 
                     sessionStorage.getItem('colts_token');
        
        if (!session || token !== 'authenticated') {
            return { valid: false, reason: 'No autenticado' };
        }
        
        // Verificar expiración (8 horas)
        const sessionData = JSON.parse(session);
        const sessionAge = Date.now() - sessionData.timestamp;
        const maxAge = 8 * 60 * 60 * 1000; // 8 horas
        
        if (sessionAge > maxAge) {
            localStorage.removeItem('colts_session');
            localStorage.removeItem('colts_token');
            sessionStorage.removeItem('colts_session');
            sessionStorage.removeItem('colts_token');
            return { valid: false, reason: 'Sesión expirada' };
        }
        
        return { 
            valid: true, 
            data: sessionData,
            remainingTime: maxAge - sessionAge
        };
        
    } catch (error) {
        console.error('Error verificando sesión:', error);
        return { valid: false, reason: 'Error del sistema' };
    }
}

// Función para proteger páginas (se llama al inicio de cada página)
function protectPage() {
    const sessionCheck = verifySession();
    
    if (!sessionCheck.valid) {
        // Si estamos en login, no redirigir
        const isLoginPage = window.location.pathname.includes('index.html') || 
                           window.location.pathname === '/' ||
                           window.location.pathname.endsWith('/');
        
        if (!isLoginPage) {
            if (typeof showNotification === 'function') {
                showNotification('Debes iniciar sesión', 'error');
            }
            
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1500);
            return false;
        }
    } else {
        // Si estamos en login pero ya tenemos sesión, redirigir a dashboard
        const isLoginPage = window.location.pathname.includes('index.html') || 
                           window.location.pathname === '/' ||
                           window.location.pathname.endsWith('/');
        
        if (isLoginPage) {
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 500);
            return false;
        }
    }
    
    return sessionCheck.valid;
}

// Función para obtener datos del usuario actual
function getCurrentUser() {
    try {
        const session = localStorage.getItem('colts_session') || 
                       sessionStorage.getItem('colts_session');
        
        if (session) {
            return JSON.parse(session);
        }
    } catch (error) {
        console.error('Error obteniendo usuario:', error);
    }
    return null;
}

// Función para actualizar tiempo de sesión (extender)
function refreshSession() {
    try {
        const session = localStorage.getItem('colts_session') || 
                       sessionStorage.getItem('colts_session');
        
        if (session) {
            const sessionData = JSON.parse(session);
            sessionData.timestamp = Date.now();
            
            if (localStorage.getItem('colts_session')) {
                localStorage.setItem('colts_session', JSON.stringify(sessionData));
            } else {
                sessionStorage.setItem('colts_session', JSON.stringify(sessionData));
            }
            
            return true;
        }
    } catch (error) {
        console.error('Error refrescando sesión:', error);
    }
    return false;
}

// Exportar funciones globalmente
window.verifySession = verifySession;
window.protectPage = protectPage;
window.getCurrentUser = getCurrentUser;
window.refreshSession = refreshSession;

console.log('✅ session.js cargado');