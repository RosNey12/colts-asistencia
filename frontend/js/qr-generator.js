// ===== EMPLEADOS MANAGER - Mini Abarrotes COLT'S =====
console.log('👥 Empleados Manager inicializando...');

// ===== CONFIGURACIÓN SUPABASE =====
const SUPABASE_URL = 'https://iokkxkpfncbumnjamquh.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlva2t4a3BmbmNidW1uamFtcXVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA0MzE3MzgsImV4cCI6MjA4NjAwNzczOH0.7eKVc1I0v5n5zaB4rUEASizm05cFWTieOgtgMmZku6w';

class EmpleadosManager {
    constructor() {
        this.supabaseClient = null;
        this.initSupabase();
    }
    
    // Inicializar Supabase
    async initSupabase() {
        try {
            if (window.supabase && window.supabase.createClient) {
                this.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
                console.log('✅ Supabase inicializado para empleados');
            } else {
                console.error('❌ Supabase CDN no disponible');
            }
        } catch (error) {
            console.error('Error inicializando Supabase:', error);
        }
    }
    
    // Validar datos del empleado
    validateEmpleado(data) {
        const errors = [];
        
        // Nombre
        if (!data.nombre || data.nombre.trim().length < 2) {
            errors.push('El nombre debe tener al menos 2 caracteres');
        }
        
        // Primer apellido
        if (!data.primer_apellido || data.primer_apellido.trim().length < 2) {
            errors.push('El primer apellido debe tener al menos 2 caracteres');
        }
        
        // Edad
        if (!data.edad || data.edad < 18 || data.edad > 99) {
            errors.push('La edad debe estar entre 18 y 99 años');
        }
        
        // Teléfono
        if (!data.telefono || data.telefono.length !== 10) {
            errors.push('El teléfono debe tener exactamente 10 dígitos');
        }
        
        // Fecha de nacimiento
        if (!data.fecha_nacimiento) {
            errors.push('La fecha de nacimiento es requerida');
        } else {
            const birthDate = new Date(data.fecha_nacimiento);
            const today = new Date();
            const age = today.getFullYear() - birthDate.getFullYear();
            if (age < 18) {
                errors.push('El empleado debe ser mayor de 18 años');
            }
        }
        
        // Puesto
        if (!data.puesto) {
            errors.push('El puesto es requerido');
        }
        
        return {
            valid: errors.length === 0,
            errors: errors
        };
    }
    
    // Guardar empleado
    async saveEmpleado(data) {
        console.log('💾 Guardando empleado...', data);
        
        try {
            // Validar datos
            const validation = this.validateEmpleado(data);
            if (!validation.valid) {
                throw new Error(validation.errors.join(', '));
            }
            
            // Generar ID único
            const empleadoId = `emp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            
            // Preparar datos para guardar
            const empleadoData = {
                id: empleadoId,
                nombre: data.nombre.trim(),
                primer_apellido: data.primer_apellido.trim(),
                segundo_apellido: data.segundo_apellido ? data.segundo_apellido.trim() : null,
                edad: parseInt(data.edad),
                telefono: data.telefono,
                fecha_nacimiento: data.fecha_nacimiento,
                puesto: data.puesto,
                activo: true,
                fecha_registro: new Date().toISOString(),
                created_at: new Date().toISOString()
            };
            
            console.log('📤 Datos preparados:', empleadoData);
            
            // Intentar guardar en Supabase
            if (this.supabaseClient) {
                const { data: insertedData, error } = await this.supabaseClient
                    .from('empleados')
                    .insert([empleadoData])
                    .select()
                    .single();
                
                if (error) {
                    console.error('❌ Error Supabase:', error);
                    throw new Error('Error guardando en la base de datos: ' + error.message);
                }
                
                console.log('✅ Empleado guardado en Supabase:', insertedData);
                
                // 🔥 GENERAR QR AUTOMÁTICAMENTE
                // En qr-generator.js, asegúrate que tenga:
window.qrGenerator = {
    generateForEmpleado: async function(empleado) {
        console.log('🔗 Generando QR para:', empleado);
        
        try {
            const qrContainer = document.getElementById('qrCode');
            if (!qrContainer) {
                console.error('No se encontró el contenedor del QR');
                return;
            }
            
            // Limpiar contenedor
            qrContainer.innerHTML = '';
            
            // Datos para el QR (formato JSON)
            const qrData = JSON.stringify({
                id: empleado.id,
                nombre_completo: `${empleado.nombre} ${empleado.primer_apellido}`,
                tipo: 'empleado_colts',
                timestamp: Date.now()
            });
            
            // Verificar que la librería QRCode esté cargada
            if (typeof QRCode === 'undefined') {
                console.error('QRCode library not loaded');
                qrContainer.innerHTML = `
                    <div style="text-align: center; color: red; padding: 20px;">
                        Error: Librería QRCode no cargada
                    </div>
                `;
                return;
            }
            
            // Generar QR
            // Configuración MEJORADA para QR
const qrConfig = {
    text: qrData,
    width: 250,  // Más grande
    height: 250, // Más grande
    colorDark: "#000000",    // NEGRO en lugar de azul
    colorLight: "#ff6427ff",   // Blanco
    correctLevel: QRCode.CorrectLevel.H, // Nivel alto de corrección
    // Agregar margen
    margin: 4,
    // QR más denso
    dotScale: 1
};
            
            console.log('✅ QR generado exitosamente');
            
        } catch (error) {
            console.error('Error generando QR:', error);
        }
    }
};
            }
            
        } catch (error) {
            console.error('❌ Error completo guardando empleado:', error);
            return {
                success: false,
                message: error.message || 'Error desconocido al guardar empleado',
                error: error
            };
        }
    }
    
    // Obtener todos los empleados
    async getEmpleados(filters = {}) {
        try {
            if (!this.supabaseClient) {
                throw new Error('Supabase no está inicializado');
            }
            
            let query = this.supabaseClient
                .from('empleados')
                .select('*')
                .eq('activo', true)
                .order('created_at', { ascending: false });
            
            // Aplicar filtros
            if (filters.puesto) {
                query = query.eq('puesto', filters.puesto);
            }
            
            if (filters.search) {
                query = query.or(`nombre.ilike.%${filters.search}%,primer_apellido.ilike.%${filters.search}%`);
            }
            
            const { data, error } = await query;
            
            if (error) {
                throw new Error(error.message);
            }
            
            return {
                success: true,
                data: data || [],
                count: data ? data.length : 0
            };
            
        } catch (error) {
            console.error('Error obteniendo empleados:', error);
            return {
                success: false,
                message: error.message,
                data: [],
                count: 0
            };
        }
    }
    
    // Obtener empleado por ID
    async getEmpleadoById(id) {
        try {
            if (!this.supabaseClient) {
                throw new Error('Supabase no está inicializado');
            }
            
            const { data, error } = await this.supabaseClient
                .from('empleados')
                .select('*')
                .eq('id', id)
                .single();
            
            if (error) {
                throw new Error(error.message);
            }
            
            return {
                success: true,
                data: data
            };
            
        } catch (error) {
            console.error('Error obteniendo empleado:', error);
            return {
                success: false,
                message: error.message,
                data: null
            };
        }
    }
    
    // Actualizar empleado
    async updateEmpleado(id, data) {
        try {
            if (!this.supabaseClient) {
                throw new Error('Supabase no está inicializado');
            }
            
            const { data: updatedData, error } = await this.supabaseClient
                .from('empleados')
                .update(data)
                .eq('id', id)
                .select()
                .single();
            
            if (error) {
                throw new Error(error.message);
            }
            
            return {
                success: true,
                message: 'Empleado actualizado correctamente',
                data: updatedData
            };
            
        } catch (error) {
            console.error('Error actualizando empleado:', error);
            return {
                success: false,
                message: error.message
            };
        }
    }
    
    // Desactivar empleado (soft delete)
    async deleteEmpleado(id) {
        try {
            if (!this.supabaseClient) {
                throw new Error('Supabase no está inicializado');
            }
            
            const { data, error } = await this.supabaseClient
                .from('empleados')
                .update({ activo: false })
                .eq('id', id)
                .select()
                .single();
            
            if (error) {
                throw new Error(error.message);
            }
            
            return {
                success: true,
                message: 'Empleado desactivado correctamente',
                data: data
            };
            
        } catch (error) {
            console.error('Error desactivando empleado:', error);
            return {
                success: false,
                message: error.message
            };
        }
    }
    
    // Regenerar QR para un empleado
    async regenerateQR(empleadoId) {
        try {
            const result = await this.getEmpleadoById(empleadoId);
            
            if (!result.success) {
                throw new Error('No se pudo obtener el empleado');
            }
            
            if (window.qrGenerator) {
                await window.qrGenerator.generateForEmpleado(result.data);
                return {
                    success: true,
                    message: 'QR regenerado correctamente'
                };
            } else {
                throw new Error('QR Generator no disponible');
            }
            
        } catch (error) {
            console.error('Error regenerando QR:', error);
            return {
                success: false,
                message: error.message
            };
        }
    }
}

// ===== INSTANCIA GLOBAL =====
window.empleadosManager = new EmpleadosManager();

console.log('✅ Empleados Manager cargado');