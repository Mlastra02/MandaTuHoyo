import ReporteHoyos from '../models/ReporteHoyos';
import mockData from '../data/reportes.json'; // Importa la base de datos falsa

/**
 * Gestor de Persistencia Local: Actúa como el Patrón Creador y Controlador de la colección.
 * Simula la lectura y escritura de la "base de datos" JSON.
 */
class LocalDataService {
    constructor() {
        // Inicializa la colección de reportes en memoria usando los datos del mock
        this._reportes = this.cargarReportesIniciales();
    }

    // Carga los datos falsos del JSON e instancia la clase Experto
    cargarReportesIniciales() {
        console.log("[DEBUG] Cargando datos iniciales desde JSON...");
        
        // Mapea los datos planos del JSON a instancias de la clase ReporteHoyos
        return mockData.map(data => 
            new ReporteHoyos(data.description, data.location, data.photoUri, data.userId)
        );
    }

    // Patrón CREADOR: Crea la instancia del Experto y la registra en la colección
    async crearReporte(reporteData) {
        // Patrón Creador: Instancia la clase Experto
        const newReporte = new ReporteHoyos(
            reporteData.description,
            reporteData.location,
            reporteData.photoUri,
            'anon_user'
        );

        // Patrón Experto: Validar los datos antes de guardar
        const error = newReporte.validarDatos();
        if (error) {
            throw new Error(error);
        }

        // Simula la escritura de la Base de Datos (en memoria)
        this._reportes.push(newReporte);
        console.log(`[Gestor] Reporte ${newReporte.id} creado y registrado.`);
        return true;
    }

    // Método de consulta (para la vista de totales)
    obtenerTodosLosReportes() {
        return this._reportes;
    }
}

export default new LocalDataService();