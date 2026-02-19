// ===== PERFIL DE EMPLEADO =====
let supabaseClient = null;
let empleadoId = null;
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();

document.addEventListener('DOMContentLoaded', async function() {
    if (!protectPage()) return;
    
    // Obtener ID de la URL
    const urlParams = new URLSearchParams(window.location.search);
    empleadoId = urlParams.get('id');
    
    if (!empleadoId) {
        window.location.href = 'lista.html';
        return;
    }
    
    await initSupabase();
    await loadEmpleado();
    await loadCalendar();
    setupEvents();
});

async function initSupabase() {
    supabaseClient = supabase.createClient(
        window.supabaseConfig.SUPABASE_URL,
        window.supabaseConfig.SUPABASE_KEY
    );
}

async function loadEmpleado() {
    const { data } = await supabaseClient
        .from('empleados')
        .select('*')
        .eq('id', empleadoId)
        .single();
    
    if (data) {
        document.getElementById('nombreEmpleado').textContent = data.nombre_completo;
        document.getElementById('puestoEmpleado').textContent = data.puesto;
        document.getElementById('telefonoEmpleado').textContent = data.telefono || 'No registrado';
        document.getElementById('edadEmpleado').textContent = data.edad ? `${data.edad} años` : 'No registrada';
        
        // Mostrar foto
        if (data.foto_url) {
            document.getElementById('fotoEmpleado').innerHTML = 
                `<img src="${data.foto_url}" alt="Foto">`;
        }
        
        // Generar QR
        new QRCode(document.getElementById('qrEmpleado'), {
            text: data.codigo_qr,
            width: 150,
            height: 150
        });
    }
}

async function loadCalendar() {
    const primerDia = new Date(currentYear, currentMonth, 1);
    const ultimoDia = new Date(currentYear, currentMonth + 1, 0);
    
    const { data } = await supabaseClient
        .from('asistencia')
        .select('fecha, hora_entrada')
        .eq('empleado_id', empleadoId)
        .gte('fecha', primerDia.toISOString().split('T')[0])
        .lte('fecha', ultimoDia.toISOString().split('T')[0]);
    
    // Crear mapa de días trabajados
    const diasTrabajados = {};
    data?.forEach(reg => {
        diasTrabajados[reg.fecha] = true;
    });
    
    // Generar grid del calendario
    const grid = document.getElementById('calendarGrid');
    grid.innerHTML = '';
    
    // Días de la semana
    ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].forEach(dia => {
        grid.innerHTML += `<div class="calendar-header-cell">${dia}</div>`;
    });
    
    // Espacios vacíos antes del primer día
    for (let i = 0; i < primerDia.getDay(); i++) {
        grid.innerHTML += '<div class="calendar-cell empty"></div>';
    }
    
    let trabajados = 0;
    let faltados = 0;
    
    // Días del mes
    for (let dia = 1; dia <= ultimoDia.getDate(); dia++) {
        const fecha = `${currentYear}-${String(currentMonth+1).padStart(2,'0')}-${String(dia).padStart(2,'0')}`;
        const trabajo = diasTrabajados[fecha];
        
        if (trabajo) trabajados++;
        else if (new Date(fecha) <= new Date()) faltados++; // Solo contar días pasados
        
        const clase = trabajo ? 'trabajado' : 
                     (new Date(fecha) <= new Date() ? 'faltado' : 'futuro');
        
        grid.innerHTML += `<div class="calendar-cell ${clase}">${dia}</div>`;
    }
    
    document.getElementById('currentMonthYear').textContent = 
        primerDia.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });
    document.getElementById('diasTrabajados').textContent = trabajados;
    document.getElementById('diasFaltados').textcontent = faltados;
}

function setupEvents() {
    document.getElementById('prevMonth').addEventListener('click', () => {
        currentMonth--;
        if (currentMonth < 0) {
            currentMonth = 11;
            currentYear--;
        }
        loadCalendar();
    });
    
    document.getElementById('nextMonth').addEventListener('click', () => {
        currentMonth++;
        if (currentMonth > 11) {
            currentMonth = 0;
            currentYear++;
        }
        loadCalendar();
    });
}