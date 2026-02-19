// ===== FUNCIONES COMUNES PARA TODAS LAS PÁGINAS =====

// Configuración de Supabase (solo una vez)
if (typeof window.supabaseConfig === 'undefined') {
    window.supabaseConfig = {
        SUPABASE_URL: 'https://iokkxkpfncbumnjamquh.supabase.co',
        SUPABASE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlva2t4a3BmbmNidW1uamFtcXVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA0MzE3MzgsImV4cCI6MjA4NjAwNzczOH0.7eKVc1I0v5n5zaB4rUEASizm05cFWTieOgtgMmZku6w'
    };
}

// Función de notificaciones común
if (typeof window.showNotification === 'undefined') {
    window.showNotification = function(message, type = 'info', duration = 3000) {
        console.log(`[${type.toUpperCase()}] ${message}`);
        
        let container = document.getElementById('notifications');
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
    };
}

// Función para verificar sesión
if (typeof window.protectPage === 'undefined') {
    window.protectPage = function() {
        try {
            const session = localStorage.getItem('colts_session') || 
                           sessionStorage.getItem('colts_session');
            const token = localStorage.getItem('colts_token') || 
                         sessionStorage.getItem('colts_token');
            
            if (!session || token !== 'authenticated') {
                console.error('❌ No autenticado - redirigiendo a login');
                
                showNotification('Debes iniciar sesión primero', 'error', 2000);
                
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 1500);
                
                return false;
            }
            
            console.log('✅ Sesión válida');
            return true;
            
        } catch (error) {
            console.error('Error en protectPage:', error);
            return false;
        }
    };
}

// Función logout común
if (typeof window.logout === 'undefined') {
    window.logout = function() {
        localStorage.removeItem('colts_session');
        localStorage.removeItem('colts_token');
        sessionStorage.removeItem('colts_session');
        sessionStorage.removeItem('colts_token');
        window.location.href = 'index.html';
    };
}

console.log('✅ common.js cargado');