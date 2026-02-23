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
// ===== FUNCIÓN UNIVERSAL PARA EL MENÚ HAMBURGUESA =====
if (typeof window.setupMobileMenu === 'undefined') {
    window.setupMobileMenu = function() {
        // Esperar a que el DOM esté listo
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initMenu);
        } else {
            initMenu();
        }

        function initMenu() {
            console.log('🍔 Inicializando menú hamburguesa...');
            
            const menuToggle = document.getElementById('menuToggle');
            const sidebar = document.querySelector('.sidebar');
            
            // Si no existe el botón o el sidebar, salir (ej: en login)
            if (!menuToggle || !sidebar) {
                console.log('⏭️ No hay menú en esta página.');
                return;
            }

            // Crear overlay si no existe
            let overlay = document.querySelector('.sidebar-overlay');
            if (!overlay) {
                overlay = document.createElement('div');
                overlay.className = 'sidebar-overlay';
                overlay.style.cssText = `
                    display: none;
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background-color: rgba(0, 0, 0, 0.5);
                    z-index: 999;
                    opacity: 0;
                    transition: opacity 0.3s ease;
                `;
                document.body.appendChild(overlay);
            }

            // --- FUNCIÓN PARA ABRIR EL MENÚ ---
            function openMenu() {
                console.log('✅ Abriendo menú');
                sidebar.classList.add('mobile-active');
                overlay.style.display = 'block';
                // Forzar un reflow para que la transición funcione
                setTimeout(() => {
                    overlay.style.opacity = '1';
                }, 10);
                document.body.style.overflow = 'hidden'; // Evita scroll detrás del menú
            }

            // --- FUNCIÓN PARA CERRAR EL MENÚ ---
            function closeMenu() {
                console.log('❌ Cerrando menú');
                sidebar.classList.remove('mobile-active');
                overlay.style.opacity = '0';
                setTimeout(() => {
                    overlay.style.display = 'none';
                }, 300); // Esperar a que termine la transición
                document.body.style.overflow = '';
            }

            // --- 1. Click en el botón hamburguesa ---
            // Eliminamos listeners anteriores clonando y reemplazando
            const newMenuToggle = menuToggle.cloneNode(true);
            menuToggle.parentNode.replaceChild(newMenuToggle, menuToggle);
            
            newMenuToggle.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                if (sidebar.classList.contains('mobile-active')) {
                    closeMenu();
                } else {
                    openMenu();
                }
            });

            // --- 2. Click en el overlay para cerrar ---
            overlay.addEventListener('click', closeMenu);

            // --- 3. Cerrar al hacer click en un enlace del menú (en móvil) ---
            const menuLinks = sidebar.querySelectorAll('.sidebar-menu a, .logout-btn');
            menuLinks.forEach(link => {
                link.addEventListener('click', function(e) {
                    // Solo cerramos si el overlay está visible (modo móvil)
                    if (overlay.style.display === 'block' && overlay.style.opacity === '1') {
                        closeMenu();
                    }
                });
            });

            // --- 4. Manejar el cambio de tamaño de ventana (responsive) ---
            window.addEventListener('resize', function() {
                if (window.innerWidth > 992) {
                    sidebar.classList.remove('mobile-active');
                    overlay.style.opacity = '0';
                    overlay.style.display = 'none';
                    document.body.style.overflow = '';
                }
            });

            console.log('✅ Menú hamburguesa configurado correctamente');
        }
    };
}
console.log('✅ common.js cargado');