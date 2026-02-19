// ===== LISTA DE EMPLEADOS - Mini Abarrotes COLT'S =====
// VERSIÓN FINAL - Lista simple, detalles completos, edición funcional, QR imprimible/descargable
console.log('📋 Módulo de Lista de Empleados inicializando...');

// ===== CONFIGURACIÓN =====
let supabaseClient = null;
let empleadosData = [];
let filteredEmpleados = [];
let selectedEmpleados = new Set();
let currentPage = 1;
const itemsPerPage = 10;

// ===== INICIALIZACIÓN PRINCIPAL =====
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 Inicializando lista de empleados...');
    
    if (!protectPage()) {
        console.log('⛔ Página protegida - redirigiendo');
        return;
    }
    
    await initSupabase();
    loadUserData();
    await loadEmpleados();
    setupUIEvents();
    setupTableEvents();
    setupModalEvents();
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
        
        supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
            auth: { autoRefreshToken: false, persistSession: false }
        });
        
        console.log('✅ Supabase conectado');
        return true;
        
    } catch (error) {
        console.error('❌ Error:', error);
        showNotification('Error inicializando sistema', 'error');
        return false;
    }
}

// ===== CARGAR DATOS DEL USUARIO =====
function loadUserData() {
    try {
        const sessionData = localStorage.getItem('colts_session') || sessionStorage.getItem('colts_session');
        if (sessionData) {
            const session = JSON.parse(sessionData);
            document.getElementById('userName').textContent = 'Administrador';
            document.getElementById('userEmail').textContent = session.usuario || 'colts';
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

// ===== CARGAR EMPLEADOS =====
async function loadEmpleados() {
    console.log('📥 Cargando lista de empleados...');
    
    try {
        const { data, error } = await supabaseClient
            .from('empleados')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        empleadosData = data || [];
        filteredEmpleados = [...empleadosData];
        
        updateStats();
        renderTable();
        updateSidebarCount();
        
    } catch (error) {
        console.error('❌ Error:', error);
        showNotification('Error al cargar los empleados', 'error');
    }
}

// ===== ACTUALIZAR ESTADÍSTICAS =====
function updateStats() {
    const total = empleadosData.length;
    const activos = empleadosData.filter(e => e.activo === true).length;
    
    document.getElementById('totalEmpleados').textContent = total;
    document.getElementById('activosCount').textContent = activos;
    document.getElementById('empleadosCount').textContent = total;
}

// ===== ACTUALIZAR CONTADOR EN SIDEBAR =====
function updateSidebarCount() {
    const badge = document.querySelector('.sidebar-menu .badge');
    if (badge) badge.textContent = empleadosData.length;
}

// ===== RENDERIZAR TABLA (SOLO INFORMACIÓN BÁSICA) =====
function renderTable() {
    const tableBody = document.getElementById('empleadosTableBody');
    if (!tableBody) return;
    
    if (filteredEmpleados.length === 0) {
        tableBody.innerHTML = `
            <tr><td colspan="6" class="loading">
                <i class="fas fa-users-slash"></i> No hay empleados
            </td></tr>
        `;
        return;
    }
    
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedEmpleados = filteredEmpleados.slice(startIndex, endIndex);
    
    let html = '';
    
    paginatedEmpleados.forEach(empleado => {
        const isSelected = selectedEmpleados.has(empleado.id);
        
        html += `
            <tr class="${isSelected ? 'selected' : ''}" data-id="${empleado.id}">
                <td><input type="checkbox" class="empleado-checkbox" 
                           data-id="${empleado.id}" ${isSelected ? 'checked' : ''}></td>
                <td><strong>${empleado.nombre_completo || 'Sin nombre'}</strong></td>
                <td>${empleado.puesto || 'Sin especificar'}</td>
                <td>${empleado.telefono || 'No registrado'}</td>
                <td>
                    <span class="status-badge ${empleado.activo ? 'active' : 'inactive'}">
                        ${empleado.activo ? 'Activo' : 'Inactivo'}
                    </span>
                </td>
                <td>
                    <div class="action-buttons-cell">
                        <button class="btn-action btn-view" data-id="${empleado.id}" 
                                title="Ver detalles"><i class="fas fa-eye"></i></button>
                        <button class="btn-action btn-edit" data-id="${empleado.id}" 
                                title="Editar empleado"><i class="fas fa-edit"></i></button>
                        <button class="btn-action btn-qr" data-id="${empleado.id}" 
                                title="Ver QR"><i class="fas fa-qrcode"></i></button>
                        <button class="btn-action btn-delete" data-id="${empleado.id}" 
                                title="Eliminar empleado"><i class="fas fa-trash-alt"></i></button>
                    </div>
                </td>
            </tr>
        `;
    });
    
    tableBody.innerHTML = html;
    updateTableInfo();
    updatePagination();
}

// ===== MOSTRAR DETALLES COMPLETOS (CON EMERGENCIA Y SIN FOTO) =====
function showEmployeeDetails(empleado) {
    console.log('👁️ Mostrando detalles completos:', empleado.id);
    
    const modalBody = document.getElementById('detailModalBody');
    if (!modalBody) return;
    
    // Formatear fechas
    const fechaNacimiento = empleado.fecha_nacimiento ? 
        new Date(empleado.fecha_nacimiento).toLocaleDateString('es-MX', {
            day: '2-digit', month: '2-digit', year: 'numeric'
        }) : 'No registrada';
    
    const fechaRegistro = empleado.created_at ? 
        new Date(empleado.created_at).toLocaleDateString('es-MX', {
            day: '2-digit', month: '2-digit', year: 'numeric'
        }) : 'No registrada';
    
    const fechaActualizacion = empleado.updated_at ? 
        new Date(empleado.updated_at).toLocaleDateString('es-MX', {
            day: '2-digit', month: '2-digit', year: 'numeric'
        }) : 'No registrada';
    
    const nombreCompleto = `${empleado.nombre || ''} ${empleado.apellido_paterno || ''} ${empleado.apellido_materno || ''}`.replace(/\s+/g, ' ').trim();
    
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

            <!-- CÓDIGO QR -->
            <div style="margin-bottom: 1rem; background: var(--light-gray); padding: 1.5rem; border-radius: var(--radius-md);">
                <h3 style="color: var(--primary-blue); border-bottom: 2px solid var(--medium-gray); padding-bottom: 0.5rem; margin-bottom: 1rem;">
                    <i class="fas fa-qrcode"></i> Código QR
                </h3>
                <div style="text-align: center;">
                    <p style="font-family: monospace; background: white; padding: 0.5rem; border-radius: var(--radius-sm); margin-bottom: 1rem;">
                        ${empleado.codigo_qr || 'No asignado'}
                    </p>
                    <div style="display: flex; gap: 1rem; justify-content: center;">
                        <button class="btn-secondary" onclick="window.imprimirQR('${empleado.codigo_qr}', '${empleado.nombre_completo}')">
                            <i class="fas fa-print"></i> Imprimir QR
                        </button>
                        <button class="btn-secondary" onclick="window.descargarQR('${empleado.codigo_qr}', '${empleado.nombre_completo}')">
                            <i class="fas fa-download"></i> Descargar QR
                        </button>
                    </div>
                </div>
            </div>

            <!-- BOTONES DE ACCIÓN -->
            <div style="display: flex; gap: 1rem; justify-content: flex-end; margin-top: 2rem;">
                <button class="btn-primary" onclick="window.editarEmpleado(${empleado.id})">
                    <i class="fas fa-edit"></i> Editar Empleado
                </button>
                <button class="btn-danger" onclick="window.confirmarEliminar(${empleado.id}, '${empleado.nombre_completo}')">
                    <i class="fas fa-trash-alt"></i> Eliminar
                </button>
            </div>
        </div>
    `;
    
    modalBody.innerHTML = html;
    document.getElementById('detailModal').classList.add('show');
}

// ===== FUNCIÓN PARA EDITAR EMPLEADO (REDIRIGE AL FORMULARIO CON DATOS) =====
function editarEmpleado(id) {
    window.location.href = `registro.html?id=${id}`;
}

// ===== FUNCIONES PARA QR =====
function imprimirQR(codigo, nombre) {
    if (!codigo) {
        showNotification('No hay código QR disponible', 'error');
        return;
    }
    
    // Crear ventana de impresión
    const ventana = window.open('', '_blank');
    ventana.document.write(`
        <html>
            <head>
                <title>QR - ${nombre}</title>
                <style>
                    body { 
                        text-align: center; 
                        padding: 50px; 
                        font-family: 'Arial', sans-serif;
                        background: white;
                    }
                    h2 { color: #002DE6; margin-bottom: 30px; }
                    #qr { 
                        width: 300px; 
                        height: 300px; 
                        margin: 20px auto;
                        padding: 20px;
                        background: white;
                        border: 2px solid #E9ECEF;
                        border-radius: 12px;
                    }
                    .codigo { 
                        font-family: monospace; 
                        color: #495057;
                        font-size: 14px;
                        margin-top: 20px;
                    }
                    @media print {
                        body { padding: 20px; }
                        button { display: none; }
                    }
                </style>
                <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
            </head>
            <body>
                <h2>${nombre}</h2>
                <div id="qr"></div>
                <p class="codigo">${codigo}</p>
                <button onclick="window.print()" style="padding: 10px 20px; background: #002DE6; color: white; border: none; border-radius: 8px; cursor: pointer; margin-top: 20px;">
                    <i class="fas fa-print"></i> Imprimir
                </button>
                <script>
                    new QRCode(document.getElementById('qr'), {
                        text: '${codigo}',
                        width: 260,
                        height: 260,
                        colorDark: "#000000",
                        colorLight: "#FFFFFF"
                    });
                </script>
            </body>
        </html>
    `);
    ventana.document.close();
}

function descargarQR(codigo, nombre) {
    if (!codigo) {
        showNotification('No hay código QR disponible', 'error');
        return;
    }
    
    // Crear un div temporal para generar el QR
    const tempDiv = document.createElement('div');
    tempDiv.style.position = 'absolute';
    tempDiv.style.left = '-9999px';
    document.body.appendChild(tempDiv);
    
    try {
        if (typeof QRCode !== 'undefined') {
            new QRCode(tempDiv, {
                text: codigo,
                width: 300,
                height: 300,
                colorDark: "#000000",
                colorLight: "#FFFFFF"
            });
            
            // Esperar a que se genere el QR
            setTimeout(() => {
                const canvas = tempDiv.querySelector('canvas');
                if (canvas) {
                    // Crear un canvas más grande para mejor calidad
                    const finalCanvas = document.createElement('canvas');
                    finalCanvas.width = 300;
                    finalCanvas.height = 300;
                    const ctx = finalCanvas.getContext('2d');
                    
                    // Fondo blanco
                    ctx.fillStyle = '#FFFFFF';
                    ctx.fillRect(0, 0, 300, 300);
                    
                    // Dibujar el QR
                    ctx.drawImage(canvas, 0, 0, 300, 300);
                    
                    // Agregar texto pequeño
                    ctx.fillStyle = '#002DE6';
                    ctx.font = 'bold 12px Arial';
                    ctx.textAlign = 'center';
                    ctx.fillText('COLT\'S', 150, 290);
                    
                    // Descargar
                    const link = document.createElement('a');
                    link.download = `QR_${nombre.replace(/\s+/g, '_')}.png`;
                    link.href = finalCanvas.toDataURL('image/png');
                    link.click();
                    
                    showNotification('QR descargado', 'success');
                } else {
                    showNotification('Error al generar QR', 'error');
                }
                
                document.body.removeChild(tempDiv);
            }, 300);
        } else {
            showNotification('Librería QR no disponible', 'error');
            document.body.removeChild(tempDiv);
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('Error al generar QR', 'error');
        document.body.removeChild(tempDiv);
    }
}

// ===== MOSTRAR QR EN MODAL =====
function showQRModal(empleado) {
    const modalBody = document.getElementById('detailModalBody');
    if (!modalBody) return;
    
    const html = `
        <div style="text-align: center; padding: 2rem;">
            <h3 style="color: var(--primary-blue); margin-bottom: 1rem;">${empleado.nombre_completo}</h3>
            <div style="background: white; padding: 1.5rem; border-radius: var(--radius-md); box-shadow: var(--shadow-sm); display: inline-block;">
                <div id="qrLarge" style="width: 250px; height: 250px; margin: 0 auto;"></div>
            </div>
            <p style="font-family: monospace; background: var(--light-gray); padding: 0.5rem; border-radius: var(--radius-sm); margin: 1rem 0;">
                ${empleado.codigo_qr}
            </p>
            <div style="display: flex; gap: 1rem; justify-content: center;">
                <button class="btn-secondary" onclick="window.imprimirQR('${empleado.codigo_qr}', '${empleado.nombre_completo}')">
                    <i class="fas fa-print"></i> Imprimir
                </button>
                <button class="btn-secondary" onclick="window.descargarQR('${empleado.codigo_qr}', '${empleado.nombre_completo}')">
                    <i class="fas fa-download"></i> Descargar
                </button>
            </div>
            <button class="btn-primary" style="margin-top: 1.5rem;" onclick="document.getElementById('detailModal').classList.remove('show')">
                Cerrar
            </button>
        </div>
    `;
    
    modalBody.innerHTML = html;
    document.getElementById('detailModal').classList.add('show');
    
    setTimeout(() => {
        if (typeof QRCode !== 'undefined') {
            new QRCode(document.getElementById('qrLarge'), {
                text: empleado.codigo_qr,
                width: 250,
                height: 250,
                colorDark: "#000000",
                colorLight: "#FFFFFF"
            });
        }
    }, 200);
}

// ===== FUNCIONES CRUD =====
async function deleteEmployee(empleadoId) {
    try {
        const { error } = await supabaseClient
            .from('empleados')
            .delete()
            .eq('id', empleadoId);
        
        if (error) throw error;
        
        document.getElementById('deleteModal').classList.remove('show');
        await loadEmpleados();
        selectedEmpleados.delete(empleadoId);
        showNotification('Empleado eliminado', 'success');
        
    } catch (error) {
        console.error('Error:', error);
        showNotification('Error al eliminar', 'error');
    }
}

function confirmDeleteEmployee(empleado) {
    document.getElementById('deleteMessage').textContent = 
        `¿Estás seguro de que deseas eliminar a "${empleado.nombre_completo}"?`;
    document.getElementById('confirmDelete').dataset.empleadoId = empleado.id;
    document.getElementById('deleteModal').classList.add('show');
}

// ===== FUNCIONES AUXILIARES =====
function updateTableInfo() {
    const start = (currentPage - 1) * itemsPerPage + 1;
    const end = Math.min(start + itemsPerPage - 1, filteredEmpleados.length);
    document.getElementById('tableInfo').textContent = 
        `Mostrando ${start}-${end} de ${filteredEmpleados.length}`;
    document.getElementById('selectedCount').textContent = `${selectedEmpleados.size} seleccionados`;
}

function updatePagination() {
    const totalPages = Math.ceil(filteredEmpleados.length / itemsPerPage);
    document.getElementById('pageNumbers').textContent = `${currentPage} de ${totalPages}`;
    document.getElementById('firstPage').disabled = currentPage === 1;
    document.getElementById('prevPage').disabled = currentPage === 1;
    document.getElementById('nextPage').disabled = currentPage === totalPages || totalPages === 0;
    document.getElementById('lastPage').disabled = currentPage === totalPages || totalPages === 0;
    document.getElementById('paginationInfo').textContent = `Página ${currentPage} de ${totalPages}`;
}

// ===== CONFIGURAR EVENTOS UI =====
function setupUIEvents() {
    const menuToggle = document.getElementById('menuToggle');
    if (menuToggle) {
        menuToggle.addEventListener('click', () => {
            document.querySelector('.sidebar').classList.toggle('collapsed');
        });
    }
    
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', async () => {
            refreshBtn.classList.add('fa-spin');
            await loadEmpleados();
            setTimeout(() => refreshBtn.classList.remove('fa-spin'), 500);
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
            if (confirm('¿Estás seguro de que deseas cerrar sesión?')) {
                logout();
            }
        });
    }
    
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', applyFilters);
    }
    
    const clearSearch = document.getElementById('clearSearch');
    if (clearSearch) {
        clearSearch.addEventListener('click', () => {
            document.getElementById('searchInput').value = '';
            applyFilters();
        });
    }
    
    const filterStatus = document.getElementById('filterStatus');
    if (filterStatus) {
        filterStatus.addEventListener('change', applyFilters);
    }
    
    const filterPuesto = document.getElementById('filterPuesto');
    if (filterPuesto) {
        filterPuesto.addEventListener('change', applyFilters);
    }
    
    const exportBtn = document.getElementById('exportBtn');
    if (exportBtn) {
        exportBtn.addEventListener('click', exportToExcel);
    }
}

// ===== CONFIGURAR EVENTOS DE TABLA =====
function setupTableEvents() {
    const selectAllCheckbox = document.getElementById('selectAllCheckbox');
    if (selectAllCheckbox) {
        selectAllCheckbox.addEventListener('change', function() {
            const checkboxes = document.querySelectorAll('.empleado-checkbox');
            checkboxes.forEach(cb => {
                cb.checked = this.checked;
                const id = parseInt(cb.dataset.id);
                if (this.checked) {
                    selectedEmpleados.add(id);
                } else {
                    selectedEmpleados.delete(id);
                }
            });
            updateTableInfo();
        });
    }
    
    const selectAllBtn = document.getElementById('selectAllBtn');
    if (selectAllBtn) {
        selectAllBtn.addEventListener('click', () => {
            document.getElementById('selectAllCheckbox').checked = true;
            document.getElementById('selectAllCheckbox').dispatchEvent(new Event('change'));
        });
    }
    
    const deselectAllBtn = document.getElementById('deselectAllBtn');
    if (deselectAllBtn) {
        deselectAllBtn.addEventListener('click', () => {
            document.getElementById('selectAllCheckbox').checked = false;
            document.getElementById('selectAllCheckbox').dispatchEvent(new Event('change'));
        });
    }
    
    // Paginación
    document.getElementById('firstPage')?.addEventListener('click', () => {
        currentPage = 1;
        renderTable();
    });
    
    document.getElementById('prevPage')?.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            renderTable();
        }
    });
    
    document.getElementById('nextPage')?.addEventListener('click', () => {
        const totalPages = Math.ceil(filteredEmpleados.length / itemsPerPage);
        if (currentPage < totalPages) {
            currentPage++;
            renderTable();
        }
    });
    
    document.getElementById('lastPage')?.addEventListener('click', () => {
        currentPage = Math.ceil(filteredEmpleados.length / itemsPerPage);
        renderTable();
    });
    
    // Eventos de clic en checkboxes y botones
    document.addEventListener('click', (e) => {
        // Checkboxes
        if (e.target.classList.contains('empleado-checkbox')) {
            const id = parseInt(e.target.dataset.id);
            if (e.target.checked) {
                selectedEmpleados.add(id);
            } else {
                selectedEmpleados.delete(id);
            }
            document.getElementById('selectAllCheckbox').checked = false;
            updateTableInfo();
        }
        
        // Botones de acción
        const btn = e.target.closest('.btn-action');
        if (btn) {
            const id = parseInt(btn.dataset.id);
            const empleado = empleadosData.find(e => e.id === id);
            if (!empleado) return;
            
            if (btn.classList.contains('btn-view')) {
                showEmployeeDetails(empleado);
            }
            if (btn.classList.contains('btn-edit')) {
                editarEmpleado(id);
            }
            if (btn.classList.contains('btn-qr')) {
                showQRModal(empleado);
            }
            if (btn.classList.contains('btn-delete')) {
                confirmDeleteEmployee(empleado);
            }
        }
    });
    
    // Acciones en masa
    setupBulkActionsEvents();
}

// ===== CONFIGURAR ACCIONES EN MASA =====
function setupBulkActionsEvents() {
    const activateBtn = document.getElementById('activateSelected');
    if (activateBtn) {
        activateBtn.addEventListener('click', async () => {
            if (selectedEmpleados.size === 0) {
                showNotification('Selecciona al menos un empleado', 'warning');
                return;
            }
            if (confirm(`¿Activar ${selectedEmpleados.size} empleado(s)?`)) {
                await updateEmployeesStatus(Array.from(selectedEmpleados), true);
            }
        });
    }
    
    const deactivateBtn = document.getElementById('deactivateSelected');
    if (deactivateBtn) {
        deactivateBtn.addEventListener('click', async () => {
            if (selectedEmpleados.size === 0) {
                showNotification('Selecciona al menos un empleado', 'warning');
                return;
            }
            if (confirm(`¿Desactivar ${selectedEmpleados.size} empleado(s)?`)) {
                await updateEmployeesStatus(Array.from(selectedEmpleados), false);
            }
        });
    }
    
    const deleteBtn = document.getElementById('deleteSelected');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', async () => {
            if (selectedEmpleados.size === 0) {
                showNotification('Selecciona al menos un empleado', 'warning');
                return;
            }
            if (confirm(`¿Eliminar ${selectedEmpleados.size} empleado(s) permanentemente?`)) {
                await deleteEmployees(Array.from(selectedEmpleados));
            }
        });
    }
    
    const exportBtn = document.getElementById('exportSelected');
    if (exportBtn) {
        exportBtn.addEventListener('click', () => {
            if (selectedEmpleados.size === 0) {
                showNotification('Selecciona al menos un empleado', 'warning');
                return;
            }
            exportSelectedToExcel();
        });
    }
    
    const clearBtn = document.getElementById('clearSelection');
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            selectedEmpleados.clear();
            document.querySelectorAll('.empleado-checkbox').forEach(cb => cb.checked = false);
            document.getElementById('selectAllCheckbox').checked = false;
            updateTableInfo();
        });
    }
}

// ===== CONFIGURAR EVENTOS DE MODALES =====
function setupModalEvents() {
    const closeDetail = document.getElementById('closeDetailModal');
    if (closeDetail) {
        closeDetail.addEventListener('click', () => {
            document.getElementById('detailModal').classList.remove('show');
        });
    }
    
    const closeDelete = document.getElementById('closeDeleteModal');
    if (closeDelete) {
        closeDelete.addEventListener('click', () => {
            document.getElementById('deleteModal').classList.remove('show');
        });
    }
    
    const cancelDelete = document.getElementById('cancelDelete');
    if (cancelDelete) {
        cancelDelete.addEventListener('click', () => {
            document.getElementById('deleteModal').classList.remove('show');
        });
    }
    
    const confirmDelete = document.getElementById('confirmDelete');
    if (confirmDelete) {
        confirmDelete.addEventListener('click', async () => {
            const id = confirmDelete.dataset.empleadoId;
            if (id) await deleteEmployee(parseInt(id));
        });
    }
    
    // Cerrar modales al hacer clic fuera
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('show');
            }
        });
    });
}

// ===== ACTUALIZAR ESTADO DE EMPLEADOS =====
async function updateEmployeesStatus(ids, activo) {
    try {
        const { error } = await supabaseClient
            .from('empleados')
            .update({ activo, updated_at: new Date().toISOString() })
            .in('id', ids);
        
        if (error) throw error;
        
        await loadEmpleados();
        selectedEmpleados.clear();
        showNotification(`${ids.length} empleado(s) actualizado(s)`, 'success');
        
    } catch (error) {
        console.error('Error:', error);
        showNotification('Error al actualizar', 'error');
    }
}

// ===== ELIMINAR VARIOS EMPLEADOS =====
async function deleteEmployees(ids) {
    try {
        const { error } = await supabaseClient
            .from('empleados')
            .delete()
            .in('id', ids);
        
        if (error) throw error;
        
        await loadEmpleados();
        selectedEmpleados.clear();
        showNotification(`${ids.length} empleado(s) eliminado(s)`, 'success');
        
    } catch (error) {
        console.error('Error:', error);
        showNotification('Error al eliminar', 'error');
    }
}

// ===== APLICAR FILTROS =====
function applyFilters() {
    const search = document.getElementById('searchInput').value.toLowerCase();
    const status = document.getElementById('filterStatus').value;
    const puesto = document.getElementById('filterPuesto').value;
    
    filteredEmpleados = empleadosData.filter(e => {
        const matchSearch = !search || 
            e.nombre_completo?.toLowerCase().includes(search) ||
            e.telefono?.includes(search);
        
        const matchStatus = status === 'all' || 
            (status === 'active' && e.activo) || 
            (status === 'inactive' && !e.activo);
        
        const matchPuesto = puesto === 'all' || e.puesto === puesto;
        
        return matchSearch && matchStatus && matchPuesto;
    });
    
    currentPage = 1;
    renderTable();
}

// ===== EXPORTAR A EXCEL =====
function exportToExcel() {
    if (filteredEmpleados.length === 0) {
        showNotification('No hay datos para exportar', 'warning');
        return;
    }
    
    let csv = "Nombre Completo,Puesto,Teléfono,Estado\n";
    filteredEmpleados.forEach(e => {
        csv += `"${e.nombre_completo || ''}","${e.puesto || ''}",${e.telefono || ''},${e.activo ? 'Activo' : 'Inactivo'}\n`;
    });
    
    const link = document.createElement('a');
    link.href = 'data:text/csv;charset=utf-8,' + encodeURI(csv);
    link.download = `empleados_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    
    showNotification(`${filteredEmpleados.length} empleados exportados`, 'success');
}

function exportSelectedToExcel() {
    const selectedIds = Array.from(selectedEmpleados);
    const selectedData = empleadosData.filter(e => selectedIds.includes(e.id));
    
    if (selectedData.length === 0) {
        showNotification('No hay empleados seleccionados', 'warning');
        return;
    }
    
    let csv = "Nombre Completo,Puesto,Teléfono,Estado\n";
    selectedData.forEach(e => {
        csv += `"${e.nombre_completo || ''}","${e.puesto || ''}",${e.telefono || ''},${e.activo ? 'Activo' : 'Inactivo'}\n`;
    });
    
    const link = document.createElement('a');
    link.href = 'data:text/csv;charset=utf-8,' + encodeURI(csv);
    link.download = `seleccionados_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    
    showNotification(`${selectedData.length} empleados exportados`, 'success');
}

// ===== ACTUALIZAR FECHA Y HORA =====
function updateDateTime() {
    const now = new Date();
    const currentDate = document.getElementById('currentDate');
    const currentTime = document.getElementById('currentTime');
    
    if (currentDate) {
        currentDate.textContent = now.toLocaleDateString('es-MX', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        });
    }
    
    if (currentTime) {
        currentTime.textContent = now.toLocaleTimeString('es-MX', {
            hour: '2-digit', minute: '2-digit', second: '2-digit'
        });
    }
}

function startDateTimeUpdates() {
    setInterval(updateDateTime, 1000);
}

// ===== NOTIFICACIONES =====
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
        <div style="display: flex; align-items: center; gap: 10px;">
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

// ===== SEGURIDAD =====
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

function logout() {
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = '../index.html';
}

// Hacer funciones globales
window.editarEmpleado = editarEmpleado;
window.imprimirQR = imprimirQR;
window.descargarQR = descargarQR;
window.confirmarEliminar = function(id, nombre) {
    const empleado = empleadosData.find(e => e.id === id);
    if (empleado) confirmDeleteEmployee(empleado);
};

console.log('✅ lista-empleados.js cargado - Versión final con edición, QR y emergencia');