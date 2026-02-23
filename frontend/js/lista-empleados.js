// ===== LISTA DE EMPLEADOS - Mini Abarrotes COLT'S =====
// VERSIÓN FINAL - CON HORA MÉXICO (12 HORAS AM/PM)
console.log('📋 Módulo de Lista de Empleados inicializando...');

// ===== CONFIGURACIÓN =====
let supabaseClient = null;
let empleadosData = [];
let filteredEmpleados = [];
let selectedEmpleados = new Set();
let currentPage = 1;
const itemsPerPage = 10;

// ===== FUNCIÓN HELPER PARA FECHAS LOCALES (MÉXICO) =====
function formatMexicoTime(dateString) {
    if (!dateString) return '--:--';
    
    const date = new Date(dateString);
    return date.toLocaleTimeString('es-MX', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZone: 'America/Mexico_City'
    });
}

function formatMexicoDate(dateString) {
    if (!dateString) return 'No registrada';
    
    const date = new Date(dateString);
    return date.toLocaleDateString('es-MX', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        timeZone: 'America/Mexico_City'
    });
}

function getLocalISOString() {
    const now = new Date();
    const mexicoTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Mexico_City' }));
    return mexicoTime.toISOString();
}

// ===== DIAGNÓSTICO DE LIBRERÍAS =====
function checkLibraries() {
    console.log('🔍 Verificando librerías cargadas:');
    console.log('- Supabase:', typeof supabase !== 'undefined' ? '✅' : '❌');
    console.log('- QRCode:', typeof QRCode !== 'undefined' ? '✅' : '❌');
    
    if (typeof QRCode === 'undefined') {
        console.warn('⚠️ QRCode no está disponible. Intentando cargar desde respaldo...');
        
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js';
        script.onload = () => {
            console.log('✅ QRCode cargado desde CDNJS');
            regenerateTableQRs();
        };
        script.onerror = () => {
            console.error('❌ No se pudo cargar QRCode desde ningún CDN');
            showNotification('Usando QR de respaldo (simulado)', 'warning');
        };
        document.head.appendChild(script);
    }
}

// ===== REGENERAR QRs DE LA TABLA =====
function regenerateTableQRs() {
    const currentEmpleados = filteredEmpleados.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );
    
    currentEmpleados.forEach(empleado => {
        const containerId = `qr-${empleado.id}`;
        generateTableQR(empleado, containerId);
    });
}

// ===== INICIALIZACIÓN PRINCIPAL =====
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 Inicializando lista de empleados...');
    
    // 1. Verificar autenticación
    if (!protectPage()) {
        console.log('⛔ Página protegida - redirigiendo');
        return;
    }
    
    console.log('✅ Usuario autenticado');
    
    // 2. Inicializar Supabase
    await initSupabase();
    
    // 3. Cargar datos del usuario
    loadUserData();
    
    // 4. Verificar librerías
    checkLibraries();
    
    // 5. Cargar empleados
    await loadEmpleados();
    
    // 6. Configurar eventos
    setupUIEvents();
    setupTableEvents();
    setupModalEvents();
    setupMobileMenu();
    
    // 7. Inicializar fecha/hora
    updateDateTime();
    startDateTimeUpdates();
    
    console.log('✅ Lista de empleados lista');
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
        
        console.log('✅ Supabase conectado para lista de empleados');
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
async function loadEmpleados() {
    console.log('📥 Cargando lista de empleados...');
    
    try {
        const { data, error, count } = await supabaseClient
            .from('empleados')
            .select('*', { count: 'exact' })
            .order('created_at', { ascending: false });
        
        if (error) {
            console.error('❌ Error cargando empleados:', error);
            showNotification('Error cargando lista de empleados', 'error');
            return;
        }
        
        empleadosData = data || [];
        filteredEmpleados = [...empleadosData];
        
        console.log(`✅ ${empleadosData.length} empleados cargados`);
        
        updateStats();
        renderTable();
        updateSidebarCount();
        
    } catch (error) {
        console.error('❌ Error en loadEmpleados:', error);
        showNotification('Error al cargar los empleados', 'error');
    }
}

// ===== ACTUALIZAR ESTADÍSTICAS =====
function updateStats() {
    const total = empleadosData.length;
    const activos = empleadosData.filter(e => e.activo === true).length;
    const conQR = empleadosData.filter(e => e.codigo_qr).length;
    
    document.getElementById('totalEmpleados').textContent = total;
    document.getElementById('activosCount').textContent = activos;
    document.getElementById('empleadosCount').textContent = total;
    document.getElementById('conQRCount').textContent = conQR;
    document.getElementById('presentesHoy').textContent = '0';
}

// ===== ACTUALIZAR CONTADOR EN SIDEBAR =====
function updateSidebarCount() {
    const badge = document.querySelector('.sidebar-menu .badge');
    if (badge) {
        badge.textContent = empleadosData.length;
    }
}

// ===== RENDERIZAR TABLA =====
function renderTable() {
    console.log('🎨 Renderizando tabla...');
    
    const tableBody = document.getElementById('empleadosTableBody');
    const emptyState = document.getElementById('emptyState');
    
    if (!tableBody) return;
    
    if (filteredEmpleados.length === 0) {
        tableBody.innerHTML = `
            <tr class="empty-row">
                <td colspan="9">
                    <div class="empty-content">
                        <i class="fas fa-users-slash"></i>
                        <span>No se encontraron empleados</span>
                    </div>
                </td>
            </tr>
        `;
        
        if (emptyState) emptyState.style.display = 'block';
        
        updateTableInfo();
        updatePagination();
        return;
    }
    
    if (emptyState) emptyState.style.display = 'none';
    
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedEmpleados = filteredEmpleados.slice(startIndex, endIndex);
    
    let rowsHTML = '';
    
    paginatedEmpleados.forEach(empleado => {
        const isSelected = selectedEmpleados.has(empleado.id);
        const rowClass = isSelected ? 'selected' : '';
        
        const fechaRegistro = empleado.created_at ? 
            formatMexicoDate(empleado.created_at) : 'No registrada';
        
        // Generar HTML para la foto con manejo de errores
        const fotoHTML = empleado.foto_url ? 
            `<img src="${empleado.foto_url}" alt="${empleado.nombre_completo}" 
                  class="employee-photo" 
                  onerror="this.onerror=null; this.src=''; this.parentElement.innerHTML='<i class=\\'fas fa-user-circle\\'></i>';">` :
            `<i class="fas fa-user-circle"></i>`;
        
        rowsHTML += `
            <tr class="${rowClass}" data-id="${empleado.id}">
                <td>
                    <input type="checkbox" class="empleado-checkbox" 
                           data-id="${empleado.id}" ${isSelected ? 'checked' : ''}>
                </td>
                <td>
                    <div class="employee-photo">
                        ${fotoHTML}
                    </div>
                </td>
                <td>
                    <strong>${empleado.nombre_completo || 'Sin nombre'}</strong>
                    ${empleado.edad ? `<br><small>${empleado.edad} años</small>` : ''}
                </td>
                <td>${empleado.puesto || 'Sin especificar'}</td>
                <td>${empleado.telefono || 'No registrado'}</td>
                <td>
                    <div class="qr-container-small" data-qr="${empleado.codigo_qr || ''}" 
                         id="qr-${empleado.id}" style="width: 60px; height: 60px; margin: 0 auto;">
                    </div>
                </td>
                <td>
                    <span class="status-badge ${empleado.activo ? 'active' : 'inactive'}">
                        ${empleado.activo ? 'Activo' : 'Inactivo'}
                    </span>
                </td>
                <td>${fechaRegistro}</td>
                <td>
                    <div class="action-buttons-cell">
                        <button class="btn-action btn-view" data-id="${empleado.id}" 
                                title="Ver detalles">
                            <i class="fas fa-eye"></i>
                        </button>
                        
                        <button class="btn-action btn-qr" data-id="${empleado.id}" 
                                title="Ver QR">
                            <i class="fas fa-qrcode"></i>
                        </button>
                        <button class="btn-action btn-delete" data-id="${empleado.id}" 
                                title="Eliminar empleado">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });
    
    tableBody.innerHTML = rowsHTML;

    setTimeout(() => {
        paginatedEmpleados.forEach(empleado => {
            const containerId = `qr-${empleado.id}`;
            generateTableQR(empleado, containerId);
        });
    }, 500);
    
    updateTableInfo();
    updatePagination();
    
    console.log(`✅ Tabla renderizada con ${paginatedEmpleados.length} empleados`);
}

// ===== GENERAR QR PARA TABLA =====
function generateTableQR(empleado, containerId) {
    try {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        const qrData = empleado.codigo_qr || `COLTS-${empleado.id}`;
        
        if (typeof QRCode === 'undefined') {
            container.innerHTML = `
                <div style="text-align: center; color: #666; font-size: 10px; padding: 5px;">
                    <i class="fas fa-qrcode"></i><br>
                    ${qrData.substring(0, 6)}...
                </div>
            `;
            return;
        }
        
        container.innerHTML = '';
        
        const qrElement = document.createElement('div');
        qrElement.style.cssText = `
            width: 60px;
            height: 60px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #FFFFFF;
            border-radius: 6px;
            padding: 4px;
            cursor: pointer;
            transition: transform 0.3s ease;
        `;
        
        qrElement.title = `Código: ${qrData}\nClick para ampliar`;
        qrElement.onclick = () => showLargeQR(empleado);
        qrElement.onmouseover = () => qrElement.style.transform = 'scale(1.1)';
        qrElement.onmouseout = () => qrElement.style.transform = 'scale(1)';
        
        const qrInner = document.createElement('div');
        qrInner.id = `qr-inner-${empleado.id}`;
        qrInner.style.cssText = `
            width: 52px;
            height: 52px;
            display: flex;
            align-items: center;
            justify-content: center;
        `;
        
        qrElement.appendChild(qrInner);
        container.appendChild(qrElement);
        
        setTimeout(() => {
            try {
                new QRCode(qrInner, {
                    text: qrData,
                    width: 50,
                    height: 50,
                    colorDark: "#000000",
                    colorLight: "#FFFFFF",
                    correctLevel: QRCode.CorrectLevel.H,
                    margin: 1,
                    version: 4
                });
                
                setTimeout(() => {
                    const canvas = qrInner.querySelector('canvas');
                    if (canvas) {
                        canvas.style.borderRadius = '4px';
                        canvas.style.border = '1px solid #E9ECEF';
                    }
                }, 100);
                
            } catch (error) {
                console.error('Error generando QR:', error);
                qrInner.innerHTML = `
                    <div style="color: #666; font-size: 9px; text-align: center;">
                        <i class="fas fa-exclamation-triangle"></i><br>
                        QR Error
                    </div>
                `;
            }
        }, 100);
        
    } catch (error) {
        console.error('Error en generateTableQR:', error);
    }
}

// ===== MOSTRAR QR GRANDE =====
function showLargeQR(empleado) {
    console.log('🔍 Mostrando QR grande para:', empleado.nombre_completo);
    
    const modalBody = document.getElementById('detailModalBody');
    if (!modalBody) return;
    
    const qrData = empleado.codigo_qr || `COLTS-${empleado.id}`;
    
    const html = `
        <div style="text-align: center; padding: 2rem;">
            <h4 style="margin-bottom: 1.5rem; color: #002DE6;">
                <i class="fas fa-qrcode"></i> Código QR de ${empleado.nombre_completo}
            </h4>
            
            <div style="margin: 2rem auto; width: 300px; height: 300px; 
                        border: 2px solid #E9ECEF; border-radius: 12px;
                        padding: 1rem; background: white;">
                <div id="qrLargeContainer" style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;">
                    <div class="qr-loading" style="text-align: center; color: #666;">
                        <i class="fas fa-spinner fa-spin"></i>
                        <p>Generando QR...</p>
                    </div>
                </div>
            </div>
            
            <div style="margin-top: 2rem; color: #495057; font-size: 0.9rem;">
                <p><i class="fas fa-info-circle"></i> Código único: <strong>${qrData}</strong></p>
                <p><i class="fas fa-print"></i> Puedes imprimirlo para uso diario</p>
            </div>
            
            <div style="margin-top: 2rem; display: flex; gap: 1rem; justify-content: center;">
                <button class="btn-primary" onclick="window.printQR('${qrData}', '${empleado.nombre_completo}')">
                    <i class="fas fa-print"></i> Imprimir QR
                </button>
                <button class="btn-secondary" onclick="window.downloadQR('${qrData}', '${empleado.nombre_completo}')">
                    <i class="fas fa-download"></i> Descargar
                </button>
            </div>
        </div>
    `;
    
    modalBody.innerHTML = html;
    document.getElementById('detailModal').classList.add('show');
    
    setTimeout(() => {
        generateQRWithMultipleCDNs(qrData);
    }, 300);
}

// ===== GENERAR QR CON MÚLTIPLES CDNs =====
function generateQRWithMultipleCDNs(qrData) {
    const container = document.getElementById('qrLargeContainer');
    if (!container) return;
    
    if (typeof QRCode !== 'undefined') {
        console.log('✅ Usando QRCode del CDN actual');
        generateQRInContainer(container, qrData);
        return;
    }
    
    console.log('🔄 Intentando cargar QRCode desde CDNJS...');
    container.innerHTML = `
        <div style="text-align: center;">
            <i class="fas fa-spinner fa-spin"></i>
            <p>Cargando librería QR...</p>
        </div>
    `;
    
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js';
    script.onload = () => {
        console.log('✅ QRCode cargado desde CDNJS');
        setTimeout(() => generateQRInContainer(container, qrData), 100);
    };
    script.onerror = () => {
        console.log('🔄 CDNJS falló, intentando con jsDelivr...');
        const script2 = document.createElement('script');
        script2.src = 'https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js';
        script2.onload = () => {
            console.log('✅ QRCode cargado desde jsDelivr');
            setTimeout(() => generateQRInContainer(container, qrData), 100);
        };
        script2.onerror = () => {
            console.log('⚠️ Todos los CDNs fallaron, usando canvas manual');
            generateManualQR(container, qrData);
        };
        document.head.appendChild(script2);
    };
    document.head.appendChild(script);
}

// ===== GENERAR QR EN CONTENEDOR =====
function generateQRInContainer(container, qrData) {
    if (typeof QRCode === 'undefined') {
        generateManualQR(container, qrData);
        return;
    }
    
    try {
        container.innerHTML = '';
        new QRCode(container, {
            text: qrData,
            width: 250,
            height: 250,
            colorDark: "#000000",
            colorLight: "#FFFFFF",
            correctLevel: QRCode.CorrectLevel.H
        });
        console.log('✅ QR generado exitosamente');
    } catch (error) {
        console.error('Error generando QR:', error);
        generateManualQR(container, qrData);
    }
}

// ===== GENERAR QR MANUAL CON CANVAS =====
function generateManualQR(container, qrData) {
    container.innerHTML = '';
    
    const canvas = document.createElement('canvas');
    canvas.width = 250;
    canvas.height = 250;
    
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = '#002DE6';
    
    const cellSize = 20;
    for (let i = 0; i < 10; i++) {
        for (let j = 0; j < 10; j++) {
            if ((i * j) % 3 === 0 || (i + j) % 4 === 0) {
                ctx.fillRect(25 + i * cellSize, 25 + j * cellSize, cellSize - 2, cellSize - 2);
            }
        }
    }
    
    ctx.fillStyle = '#002DE6';
    ctx.font = 'bold 14px Montserrat';
    ctx.textAlign = 'center';
    ctx.fillText('COLTS', canvas.width/2, canvas.height - 40);
    
    ctx.fillStyle = '#495057';
    ctx.font = '10px Open Sans';
    ctx.fillText(qrData.substring(0, 15) + '...', canvas.width/2, canvas.height - 20);
    
    container.appendChild(canvas);
    
    const note = document.createElement('p');
    note.style.cssText = 'font-size: 11px; color: #FF4757; margin-top: 5px;';
    note.innerHTML = '<i class="fas fa-info-circle"></i> QR simulado (librería no disponible)';
    container.appendChild(note);
    
    console.log('⚠️ Usando QR manual de respaldo');
}

// ===== DESCARGAR QR =====
function downloadQR(codigoQR, nombre) {
    try {
        if (typeof QRCode === 'undefined' && typeof window.QRCode === 'undefined') {
            showNotification('Librería QR no disponible', 'error');
            return;
        }

        const tempDiv = document.createElement('div');
        tempDiv.style.display = 'none';
        document.body.appendChild(tempDiv);
        
        const qr = new QRCode(tempDiv, {
            text: codigoQR,
            width: 512,
            height: 512,
            colorDark: "#000000",
            colorLight: "#FFFFFF",
            correctLevel: QRCode.CorrectLevel.H
        });
        
        setTimeout(() => {
            const qrCanvas = tempDiv.querySelector('canvas');
            if (qrCanvas) {
                qrCanvas.toBlob(function(blob) {
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = `QR_${nombre.replace(/\s+/g, '_')}_${codigoQR}.png`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    URL.revokeObjectURL(url);
                    
                    showNotification('QR descargado exitosamente', 'success');
                });
            } else {
                showNotification('Error al generar QR', 'error');
            }
            
            document.body.removeChild(tempDiv);
        }, 500);
        
    } catch (error) {
        console.error('Error al descargar QR:', error);
        showNotification('Error al descargar el código QR', 'error');
    }
}

// ===== IMPRIMIR QR =====
function printQR(codigoQR, nombre) {
    try {
        if (typeof QRCode === 'undefined' && typeof window.QRCode === 'undefined') {
            showNotification('Librería QR no disponible', 'error');
            return;
        }

        const tempDiv = document.createElement('div');
        tempDiv.style.display = 'none';
        document.body.appendChild(tempDiv);
        
        const qr = new QRCode(tempDiv, {
            text: codigoQR,
            width: 400,
            height: 400,
            colorDark: "#000000",
            colorLight: "#FFFFFF",
            correctLevel: QRCode.CorrectLevel.H
        });
        
        setTimeout(() => {
            const qrCanvas = tempDiv.querySelector('canvas');
            
            if (qrCanvas) {
                const imageUrl = qrCanvas.toDataURL('image/png');
                
                const printWindow = window.open('', '_blank', 'width=800,height=600');
                
                printWindow.document.write(`
                    <!DOCTYPE html>
                    <html lang="es">
                    <head>
                        <meta charset="UTF-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        <title>Imprimir QR - ${nombre}</title>
                        <style>
                            * { margin: 0; padding: 0; box-sizing: border-box; }
                            body {
                                font-family: 'Open Sans', Arial, sans-serif;
                                display: flex;
                                flex-direction: column;
                                align-items: center;
                                justify-content: center;
                                min-height: 100vh;
                                padding: 20px;
                                background: #ffffff;
                            }
                            .print-container { text-align: center; max-width: 600px; width: 100%; }
                            .header { margin-bottom: 30px; }
                            .logo { font-size: 24px; font-weight: bold; color: #2563eb; margin-bottom: 10px; }
                            h1 { font-size: 28px; color: #1e293b; margin-bottom: 10px; }
                            .empleado-info {
                                background: #f8fafc;
                                padding: 20px;
                                border-radius: 8px;
                                margin-bottom: 30px;
                                border: 2px solid #e2e8f0;
                            }
                            .info-row {
                                display: flex;
                                justify-content: space-between;
                                padding: 8px 0;
                                border-bottom: 1px solid #e2e8f0;
                            }
                            .info-row:last-child { border-bottom: none; }
                            .info-label { font-weight: 600; color: #64748b; }
                            .info-value { font-weight: 500; color: #1e293b; }
                            .qr-container {
                                background: #ffffff;
                                padding: 30px;
                                border-radius: 12px;
                                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                                margin-bottom: 20px;
                            }
                            .qr-image { max-width: 400px; width: 100%; height: auto; display: block; margin: 0 auto; }
                            .codigo {
                                font-size: 18px;
                                font-weight: 600;
                                color: #475569;
                                margin-top: 15px;
                                letter-spacing: 2px;
                            }
                            .footer {
                                margin-top: 30px;
                                padding-top: 20px;
                                border-top: 2px solid #e2e8f0;
                                color: #64748b;
                                font-size: 14px;
                            }
                            .fecha-impresion {
                                color: #475569;
                                font-size: 14px;
                                margin-top: 10px;
                            }
                            @media print {
                                body { padding: 0; }
                                @page { margin: 1cm; }
                            }
                        </style>
                    </head>
                    <body>
                        <div class="print-container">
                            <div class="header">
                                <div class="logo">🏪 MINI ABARROTES COLT'S</div>
                                <h1>Código QR de Empleado</h1>
                            </div>
                            
                            <div class="empleado-info">
                                <div class="info-row">
                                    <span class="info-label">Nombre:</span>
                                    <span class="info-value">${nombre}</span>
                                </div>
                                <div class="info-row">
                                    <span class="info-label">Código:</span>
                                    <span class="info-value">${codigoQR}</span>
                                </div>
                                <div class="info-row">
                                    <span class="info-label">Fecha de Impresión:</span>
                                    <span class="info-value">${new Date().toLocaleDateString('es-MX', { 
                                        day: '2-digit', 
                                        month: 'long', 
                                        year: 'numeric',
                                        timeZone: 'America/Mexico_City'
                                    })} a las ${new Date().toLocaleTimeString('es-MX', {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                        hour12: true,
                                        timeZone: 'America/Mexico_City'
                                    })}</span>
                                </div>
                            </div>
                            
                            <div class="qr-container">
                                <img src="${imageUrl}" alt="Código QR" class="qr-image">
                                <div class="codigo">${codigoQR}</div>
                            </div>
                            
                            <div class="footer">
                                <p>Sistema de Control de Asistencia</p>
                                <p>© 2024 Mini Abarrotes COLT'S</p>
                            </div>
                        </div>
                    </body>
                    </html>
                `);
                
                printWindow.document.close();
                
                printWindow.onload = function() {
                    setTimeout(() => {
                        printWindow.print();
                        printWindow.onafterprint = function() {
                            printWindow.close();
                        };
                    }, 250);
                };
                
                showNotification('Abriendo ventana de impresión...', 'info');
            } else {
                showNotification('Error al generar QR para impresión', 'error');
            }
            
            document.body.removeChild(tempDiv);
            
        }, 500);
        
    } catch (error) {
        console.error('Error al imprimir QR:', error);
        showNotification('Error al imprimir el código QR', 'error');
    }
}

// ===== MOSTRAR DETALLES DEL EMPLEADO (CON EMERGENCIA Y HORA MÉXICO) =====
// ===== MOSTRAR DETALLES DEL EMPLEADO (CON FECHA CORREGIDA) =====
function showEmployeeDetails(empleado) {
    console.log('👁️ Mostrando detalles completos:', empleado.id);
    
    const modalBody = document.getElementById('detailModalBody');
    if (!modalBody) return;
    
    // 🟢 CORREGIDO: Usar formato UTC para fechas
    const fechaNacimiento = empleado.fecha_nacimiento ? 
        formatearFechaUTC(empleado.fecha_nacimiento) : 'No registrada';
    
    const fechaRegistro = empleado.created_at ? 
        formatearFechaUTC(empleado.created_at) : 'No registrada';
    
    const fechaActualizacion = empleado.updated_at ? 
        formatearFechaUTC(empleado.updated_at) : 'No registrada';
    
    const nombreCompleto = `${empleado.nombre || ''} ${empleado.apellido_paterno || ''} ${empleado.apellido_materno || ''}`.replace(/\s+/g, ' ').trim();
    function formatearFechaUTC(fechaISO) {
    if (!fechaISO) return 'No registrada';
    
    const fecha = new Date(fechaISO);
    
    const year = fecha.getUTCFullYear();
    const month = String(fecha.getUTCMonth() + 1).padStart(2, '0');
    const day = String(fecha.getUTCDate()).padStart(2, '0');
    
    return `${day}/${month}/${year}`;
}
    const html = `
        <div style="padding: 1rem;">
            <!-- INFORMACIÓN PERSONAL -->
            <div style="margin-bottom: 2rem; background: var(--light-gray); padding: 1.5rem; border-radius: var(--radius-md);">
                <h3 style="color: var(--primary-blue); border-bottom: 2px solid var(--medium-gray); padding-bottom: 0.5rem; margin-bottom: 1rem;">
                    <i class="fas fa-id-card"></i> Información Personal
                </h3>
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem;">
                    <div><strong>Nombre completo:</strong><br><span style="font-size: 1.1rem;">${nombreCompleto || empleado.nombre_completo || 'No registrado'}</span></div>
                    <div><strong>Edad:</strong><br><span>${empleado.edad ? empleado.edad + ' años' : 'No registrada'}</span></div>
                    <div><strong>Fecha de nacimiento:</strong><br><span>${fechaNacimiento}</span></div>
                    <div><strong>Teléfono personal:</strong><br><span>${empleado.telefono || 'No registrado'}</span></div>
                </div>
            </div>

            <!-- CONTACTO DE EMERGENCIA -->
            <div style="margin-bottom: 2rem; background: var(--light-gray); padding: 1.5rem; border-radius: var(--radius-md);">
                <h3 style="color: var(--primary-blue); border-bottom: 2px solid var(--medium-gray); padding-bottom: 0.5rem; margin-bottom: 1rem;">
                    <i class="fas fa-phone-alt"></i> Contacto de Emergencia
                </h3>
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem;">
                    <div><strong>Teléfono de emergencia:</strong><br><span>${empleado.emergencia_telefono || 'No registrado'}</span></div>
                    <div><strong>Parentesco:</strong><br><span>${empleado.emergencia_parentesco || 'No especificado'}</span></div>
                </div>
            </div>

            <!-- INFORMACIÓN LABORAL -->
            <div style="margin-bottom: 2rem; background: var(--light-gray); padding: 1.5rem; border-radius: var(--radius-md);">
                <h3 style="color: var(--primary-blue); border-bottom: 2px solid var(--medium-gray); padding-bottom: 0.5rem; margin-bottom: 1rem;">
                    <i class="fas fa-briefcase"></i> Información Laboral
                </h3>
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem;">
                    <div><strong>Puesto:</strong><br><span>${empleado.puesto || 'No especificado'}</span></div>
                    <div><strong>Estado:</strong><br>
                        <span class="status-badge ${empleado.activo ? 'active' : 'inactive'}" style="display: inline-block; padding: 0.25rem 0.75rem; border-radius: 20px;">
                            ${empleado.activo ? '✅ Activo' : '❌ Inactivo'}
                        </span>
                    </div>
                </div>
            </div>

            <!-- FECHAS DEL SISTEMA -->
            <div style="margin-bottom: 2rem; background: var(--light-gray); padding: 1.5rem; border-radius: var(--radius-md);">
                <h3 style="color: var(--primary-blue); border-bottom: 2px solid var(--medium-gray); padding-bottom: 0.5rem; margin-bottom: 1rem;">
                    <i class="fas fa-calendar-alt"></i> Fechas del Sistema
                </h3>
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem;">
                    <div><strong>Fecha de registro:</strong><br><span>${fechaRegistro}</span></div>
                    <div><strong>Última actualización:</strong><br><span>${fechaActualizacion}</span></div>
                </div>
            </div>
        </div>
    `;
    
    modalBody.innerHTML = html;
    document.getElementById('detailModal').classList.add('show');
}

// ===== ACTUALIZAR INFORMACIÓN DE TABLA =====
function updateTableInfo() {
    const startIndex = (currentPage - 1) * itemsPerPage + 1;
    const endIndex = Math.min(startIndex + itemsPerPage - 1, filteredEmpleados.length);
    const total = filteredEmpleados.length;
    
    document.getElementById('tableInfo').textContent = 
        `Mostrando ${startIndex}-${endIndex} de ${total} empleados`;
    
    document.getElementById('selectedCount').textContent = 
        `${selectedEmpleados.size} seleccionados`;
    
    updateBulkActions();
}

// ===== ACTUALIZAR PAGINACIÓN =====
function updatePagination() {
    const totalPages = Math.ceil(filteredEmpleados.length / itemsPerPage);
    
    document.getElementById('pageNumbers').textContent = 
        `${currentPage} de ${totalPages}`;
    
    document.getElementById('firstPage').disabled = currentPage === 1;
    document.getElementById('prevPage').disabled = currentPage === 1;
    document.getElementById('nextPage').disabled = currentPage === totalPages || totalPages === 0;
    document.getElementById('lastPage').disabled = currentPage === totalPages || totalPages === 0;
    
    document.getElementById('paginationInfo').textContent = 
        `Página ${currentPage} de ${totalPages}`;
}

// ===== ACTUALIZAR ACCIONES EN MASA =====
function updateBulkActions() {
    const bulkActions = document.getElementById('bulkActions');
    const bulkSelectedCount = document.getElementById('bulkSelectedCount');
    
    if (selectedEmpleados.size > 0) {
        bulkActions.classList.add('show');
        bulkSelectedCount.textContent = `${selectedEmpleados.size} empleados seleccionados`;
    } else {
        bulkActions.classList.remove('show');
    }
}

// ===== CONFIGURAR EVENTOS DE UI =====
function setupUIEvents() {
    console.log('🎮 Configurando eventos UI...');
    
    const menuToggle = document.getElementById('menuToggle');
    const refreshBtn = document.getElementById('refreshBtn');
    const backToDashboard = document.getElementById('backToDashboard');
    const logoutBtn = document.getElementById('logoutBtn');
    const searchInput = document.getElementById('searchInput');
    const clearSearch = document.getElementById('clearSearch');
    const filterStatus = document.getElementById('filterStatus');
    const filterPuesto = document.getElementById('filterPuesto');
    const exportBtn = document.getElementById('exportBtn');
    const printBtn = document.getElementById('printBtn');
    
    if (menuToggle) {
        const sidebar = document.querySelector('.sidebar');
        menuToggle.addEventListener('click', () => {
            sidebar.classList.toggle('collapsed');
        });
    }
    
    if (refreshBtn) {
        refreshBtn.addEventListener('click', async () => {
            refreshBtn.classList.add('fa-spin');
            await loadEmpleados();
            setTimeout(() => {
                refreshBtn.classList.remove('fa-spin');
                showNotification('Lista actualizada', 'success');
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
                logout();
            }
        });
    }
    
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            applyFilters();
        });
    }
    
    if (clearSearch) {
        clearSearch.addEventListener('click', () => {
            searchInput.value = '';
            applyFilters();
        });
    }
    
    if (filterStatus) {
        filterStatus.addEventListener('change', applyFilters);
    }
    
    if (filterPuesto) {
        filterPuesto.addEventListener('change', applyFilters);
    }
    
    if (exportBtn) {
        exportBtn.addEventListener('click', exportToExcel);
    }
    
    if (printBtn) {
        printBtn.addEventListener('click', () => {
            window.print();
        });
    }
    
    console.log('✅ Eventos UI configurados');
}

// ===== APLICAR FILTROS =====
function applyFilters() {
    console.log('🔍 Aplicando filtros...');
    
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const statusFilter = document.getElementById('filterStatus').value;
    const puestoFilter = document.getElementById('filterPuesto').value;
    
    filteredEmpleados = empleadosData.filter(empleado => {
        const matchesSearch = !searchTerm || 
            empleado.nombre_completo?.toLowerCase().includes(searchTerm) ||
            empleado.telefono?.includes(searchTerm) ||
            empleado.codigo_qr?.toLowerCase().includes(searchTerm) ||
            empleado.puesto?.toLowerCase().includes(searchTerm);
        
        const matchesStatus = statusFilter === 'all' ||
            (statusFilter === 'active' && empleado.activo === true) ||
            (statusFilter === 'inactive' && empleado.activo !== true);
        
        const matchesPuesto = puestoFilter === 'all' ||
            empleado.puesto === puestoFilter;
        
        return matchesSearch && matchesStatus && matchesPuesto;
    });
    
    currentPage = 1;
    renderTable();
    
    console.log(`✅ Filtros aplicados: ${filteredEmpleados.length} empleados`);
}

// ===== CONFIGURAR EVENTOS DE TABLA =====
function setupTableEvents() {
    console.log('🎮 Configurando eventos de tabla...');
    
    const selectAllCheckbox = document.getElementById('selectAllCheckbox');
    const selectAllBtn = document.getElementById('selectAllBtn');
    const deselectAllBtn = document.getElementById('deselectAllBtn');
    const firstPageBtn = document.getElementById('firstPage');
    const prevPageBtn = document.getElementById('prevPage');
    const nextPageBtn = document.getElementById('nextPage');
    const lastPageBtn = document.getElementById('lastPage');
    
    if (selectAllCheckbox) {
        selectAllCheckbox.addEventListener('change', function() {
            const checkboxes = document.querySelectorAll('.empleado-checkbox');
            const isChecked = this.checked;
            
            checkboxes.forEach(checkbox => {
                checkbox.checked = isChecked;
                const empleadoId = parseInt(checkbox.dataset.id);
                
                if (isChecked) {
                    selectedEmpleados.add(empleadoId);
                } else {
                    selectedEmpleados.delete(empleadoId);
                }
            });
            
            updateTableInfo();
        });
    }
    
    if (selectAllBtn) {
        selectAllBtn.addEventListener('click', () => {
            selectAllCheckbox.checked = true;
            selectAllCheckbox.dispatchEvent(new Event('change'));
        });
    }
    
    if (deselectAllBtn) {
        deselectAllBtn.addEventListener('click', () => {
            selectAllCheckbox.checked = false;
            selectAllCheckbox.dispatchEvent(new Event('change'));
        });
    }
    
    if (firstPageBtn) {
        firstPageBtn.addEventListener('click', () => {
            currentPage = 1;
            renderTable();
        });
    }
    
    if (prevPageBtn) {
        prevPageBtn.addEventListener('click', () => {
            if (currentPage > 1) {
                currentPage--;
                renderTable();
            }
        });
    }
    
    if (nextPageBtn) {
        nextPageBtn.addEventListener('click', () => {
            const totalPages = Math.ceil(filteredEmpleados.length / itemsPerPage);
            if (currentPage < totalPages) {
                currentPage++;
                renderTable();
            }
        });
    }
    
    if (lastPageBtn) {
        lastPageBtn.addEventListener('click', () => {
            currentPage = Math.ceil(filteredEmpleados.length / itemsPerPage);
            renderTable();
        });
    }
    
    document.addEventListener('click', async (event) => {
        const target = event.target;
        
        if (target.classList.contains('empleado-checkbox')) {
            const empleadoId = parseInt(target.dataset.id);
            
            if (target.checked) {
                selectedEmpleados.add(empleadoId);
            } else {
                selectedEmpleados.delete(empleadoId);
                selectAllCheckbox.checked = false;
            }
            
            updateTableInfo();
        }
        
        const button = target.closest('.btn-action');
        if (button) {
            const empleadoId = parseInt(button.dataset.id);
            const empleado = empleadosData.find(e => e.id === empleadoId);
            
            if (!empleado) return;
            
            if (button.classList.contains('btn-view')) {
                showEmployeeDetails(empleado);
            } else if (button.classList.contains('btn-edit')) {
                editEmployee(empleado);
            } else if (button.classList.contains('btn-qr')) {
                showLargeQR(empleado);
            } else if (button.classList.contains('btn-delete')) {
                confirmDeleteEmployee(empleado);
            }
        }
    });
    
    setupBulkActionsEvents();
    
    console.log('✅ Eventos de tabla configurados');
}

// ===== CONFIGURAR EVENTOS DE ACCIONES EN MASA =====
function setupBulkActionsEvents() {
    const activateSelectedBtn = document.getElementById('activateSelected');
    const deactivateSelectedBtn = document.getElementById('deactivateSelected');
    const deleteSelectedBtn = document.getElementById('deleteSelected');
    const exportSelectedBtn = document.getElementById('exportSelected');
    const clearSelectionBtn = document.getElementById('clearSelection');
    
    if (activateSelectedBtn) {
        activateSelectedBtn.addEventListener('click', async () => {
            if (selectedEmpleados.size === 0) {
                showNotification('Selecciona al menos un empleado', 'warning');
                return;
            }
            
            if (confirm(`¿Activar ${selectedEmpleados.size} empleado(s)?`)) {
                await updateEmployeesStatus(Array.from(selectedEmpleados), true);
            }
        });
    }
    
    if (deactivateSelectedBtn) {
        deactivateSelectedBtn.addEventListener('click', async () => {
            if (selectedEmpleados.size === 0) {
                showNotification('Selecciona al menos un empleado', 'warning');
                return;
            }
            
            if (confirm(`¿Desactivar ${selectedEmpleados.size} empleado(s)?`)) {
                await updateEmployeesStatus(Array.from(selectedEmpleados), false);
            }
        });
    }
    
    if (deleteSelectedBtn) {
        deleteSelectedBtn.addEventListener('click', async () => {
            if (selectedEmpleados.size === 0) {
                showNotification('Selecciona al menos un empleado', 'warning');
                return;
            }
            
            if (confirm(`¿Eliminar ${selectedEmpleados.size} empleado(s) permanentemente? Esta acción no se puede deshacer.`)) {
                await deleteEmployees(Array.from(selectedEmpleados));
            }
        });
    }
    
    if (exportSelectedBtn) {
        exportSelectedBtn.addEventListener('click', () => {
            if (selectedEmpleados.size === 0) {
                showNotification('Selecciona al menos un empleado', 'warning');
                return;
            }
            
            exportSelectedToExcel();
        });
    }
    
    if (clearSelectionBtn) {
        clearSelectionBtn.addEventListener('click', () => {
            selectedEmpleados.clear();
            const checkboxes = document.querySelectorAll('.empleado-checkbox');
            checkboxes.forEach(cb => cb.checked = false);
            document.getElementById('selectAllCheckbox').checked = false;
            updateTableInfo();
        });
    }
}

// ===== CONFIGURAR EVENTOS DE MODALES =====
function setupModalEvents() {
    console.log('🎮 Configurando eventos de modales...');
    
    const closeDetailModal = document.getElementById('closeDetailModal');
    const closeDeleteModal = document.getElementById('closeDeleteModal');
    const cancelDelete = document.getElementById('cancelDelete');
    const confirmDelete = document.getElementById('confirmDelete');
    
    if (closeDetailModal) {
        closeDetailModal.addEventListener('click', () => {
            document.getElementById('detailModal').classList.remove('show');
        });
    }
    
    if (closeDeleteModal) {
        closeDeleteModal.addEventListener('click', () => {
            document.getElementById('deleteModal').classList.remove('show');
        });
    }
    
    if (cancelDelete) {
        cancelDelete.addEventListener('click', () => {
            document.getElementById('deleteModal').classList.remove('show');
        });
    }
    
    if (confirmDelete) {
        confirmDelete.addEventListener('click', async () => {
            const empleadoId = confirmDelete.dataset.empleadoId;
            if (empleadoId) {
                await deleteEmployee(parseInt(empleadoId));
            }
        });
    }
    
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('show');
            }
        });
    });
    
    console.log('✅ Eventos de modales configurados');
}

// ===== EDITAR EMPLEADO =====
function editEmployee(empleado) {
    console.log('✏️ Editando empleado:', empleado.id);
    showNotification('Función de edición disponible próximamente', 'info');
}

function editEmployeeById(id) {
    const empleado = empleadosData.find(e => e.id === id);
    if (empleado) editEmployee(empleado);
}

// ===== CONFIRMAR ELIMINACIÓN DE EMPLEADO =====
function confirmDeleteEmployee(empleado) {
    console.log('🗑️ Confirmando eliminación de empleado:', empleado.id);
    
    document.getElementById('deleteMessage').textContent = 
        `¿Estás seguro de que deseas eliminar a "${empleado.nombre_completo}"?`;
    
    document.getElementById('confirmDelete').dataset.empleadoId = empleado.id;
    document.getElementById('deleteModal').classList.add('show');
}

function confirmDeleteEmployeeById(id) {
    const empleado = empleadosData.find(e => e.id === id);
    if (empleado) confirmDeleteEmployee(empleado);
}

// ===== ELIMINAR EMPLEADO =====
async function deleteEmployee(empleadoId) {
    console.log('🗑️ Eliminando empleado:', empleadoId);
    
    try {
        const { error } = await supabaseClient
            .from('empleados')
            .delete()
            .eq('id', empleadoId);
        
        if (error) {
            console.error('❌ Error eliminando empleado:', error);
            showNotification('Error al eliminar el empleado', 'error');
            return;
        }
        
        document.getElementById('deleteModal').classList.remove('show');
        
        await loadEmpleados();
        
        selectedEmpleados.delete(empleadoId);
        
        showNotification('Empleado eliminado exitosamente', 'success');
        
    } catch (error) {
        console.error('❌ Error en deleteEmployee:', error);
        showNotification('Error al eliminar el empleado', 'error');
    }
}

// ===== ACTUALIZAR ESTADO DE EMPLEADOS =====
async function updateEmployeesStatus(empleadoIds, activo) {
    console.log(`🔄 Actualizando estado de ${empleadoIds.length} empleados a ${activo ? 'activo' : 'inactivo'}`);
    
    try {
        const { error } = await supabaseClient
            .from('empleados')
            .update({ activo: activo, updated_at: getLocalISOString() })
            .in('id', empleadoIds);
        
        if (error) {
            console.error('❌ Error actualizando estados:', error);
            showNotification('Error al actualizar los empleados', 'error');
            return;
        }
        
        await loadEmpleados();
        selectedEmpleados.clear();
        
        showNotification(`${empleadoIds.length} empleado(s) actualizado(s) exitosamente`, 'success');
        
    } catch (error) {
        console.error('❌ Error en updateEmployeesStatus:', error);
        showNotification('Error al actualizar los empleados', 'error');
    }
}

// ===== ELIMINAR VARIOS EMPLEADOS =====
async function deleteEmployees(empleadoIds) {
    console.log(`🗑️ Eliminando ${empleadoIds.length} empleados`);
    
    try {
        const { error } = await supabaseClient
            .from('empleados')
            .delete()
            .in('id', empleadoIds);
        
        if (error) {
            console.error('❌ Error eliminando empleados:', error);
            showNotification('Error al eliminar los empleados', 'error');
            return;
        }
        
        await loadEmpleados();
        selectedEmpleados.clear();
        
        showNotification(`${empleadoIds.length} empleado(s) eliminado(s) exitosamente`, 'success');
        
    } catch (error) {
        console.error('❌ Error en deleteEmployees:', error);
        showNotification('Error al eliminar los empleados', 'error');
    }
}

// ===== EXPORTAR A EXCEL =====
function exportToExcel() {
    console.log('📊 Exportando a Excel...');
    
    if (filteredEmpleados.length === 0) {
        showNotification('No hay datos para exportar', 'warning');
        return;
    }
    
    let csvContent = "data:text/csv;charset=utf-8,";
    
    const headers = [
        'ID', 'Nombre Completo', 'Edad', 'Teléfono', 'Fecha Nacimiento',
        'Puesto', 'Código QR', 'Estado', 'Fecha Registro'
    ];
    csvContent += headers.join(',') + "\n";
    
    filteredEmpleados.forEach(empleado => {
        const row = [
            empleado.id,
            `"${empleado.nombre_completo || ''}"`,
            empleado.edad || '',
            empleado.telefono || '',
            empleado.fecha_nacimiento ? formatMexicoDate(empleado.fecha_nacimiento) : '',
            `"${empleado.puesto || ''}"`,
            empleado.codigo_qr || '',
            empleado.activo ? 'Activo' : 'Inactivo',
            empleado.created_at ? formatMexicoDate(empleado.created_at) : ''
        ];
        csvContent += row.join(',') + "\n";
    });
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `empleados_colts_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    
    link.click();
    document.body.removeChild(link);
    
    showNotification(`${filteredEmpleados.length} empleados exportados exitosamente`, 'success');
}

// ===== EXPORTAR SELECCIONADOS A EXCEL =====
function exportSelectedToExcel() {
    console.log('📊 Exportando seleccionados a Excel...');
    
    const selectedIds = Array.from(selectedEmpleados);
    const selectedEmpleadosData = empleadosData.filter(e => selectedIds.includes(e.id));
    
    if (selectedEmpleadosData.length === 0) {
        showNotification('No hay empleados seleccionados para exportar', 'warning');
        return;
    }
    
    let csvContent = "data:text/csv;charset=utf-8,";
    
    const headers = [
        'ID', 'Nombre Completo', 'Edad', 'Teléfono', 'Fecha Nacimiento',
        'Puesto', 'Código QR', 'Estado', 'Fecha Registro'
    ];
    csvContent += headers.join(',') + "\n";
    
    selectedEmpleadosData.forEach(empleado => {
        const row = [
            empleado.id,
            `"${empleado.nombre_completo || ''}"`,
            empleado.edad || '',
            empleado.telefono || '',
            empleado.fecha_nacimiento ? formatMexicoDate(empleado.fecha_nacimiento) : '',
            `"${empleado.puesto || ''}"`,
            empleado.codigo_qr || '',
            empleado.activo ? 'Activo' : 'Inactivo',
            empleado.created_at ? formatMexicoDate(empleado.created_at) : ''
        ];
        csvContent += row.join(',') + "\n";
    });
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `empleados_seleccionados_colts_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    
    link.click();
    document.body.removeChild(link);
    
    showNotification(`${selectedEmpleadosData.length} empleados exportados exitosamente`, 'success');
}

// ===== ACTUALIZAR FECHA Y HORA =====
function updateDateTime() {
    const now = new Date();
    
    const currentDate = document.getElementById('currentDate');
    const currentTime = document.getElementById('currentTime');
    
    if (currentDate) {
        const options = { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            timeZone: 'America/Mexico_City'
        };
        currentDate.textContent = now.toLocaleDateString('es-MX', options);
    }
    
    if (currentTime) {
        const options = {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true,
            timeZone: 'America/Mexico_City'
        };
        currentTime.textContent = now.toLocaleTimeString('es-MX', options);
    }
}

function startDateTimeUpdates() {
    setInterval(updateDateTime, 1000);
}

// ===== MOSTRAR NOTIFICACIÓN =====
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
    }, duration);
}

// ===== PROTEGER PÁGINA =====
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

// ===== LOGOUT =====
function logout() {
    localStorage.removeItem('colts_session');
    localStorage.removeItem('colts_token');
    sessionStorage.removeItem('colts_session');
    sessionStorage.removeItem('colts_token');
    window.location.href = '../index.html';
}

// Hacer funciones disponibles globalmente
window.printQR = printQR;
window.downloadQR = downloadQR;
window.editEmployeeById = editEmployeeById;
window.confirmDeleteEmployeeById = confirmDeleteEmployeeById;
window.showNotification = showNotification;

console.log('🔥 lista-empleados.js cargado completamente - Versión con hora México (12h AM/PM)');