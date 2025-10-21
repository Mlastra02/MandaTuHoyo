class ReporteHoyos {
    constructor(description, location, photoUri) {
        this.id = Date.now(); 
        this.description = description; 
        this.location = location;       
        this.photoUri = photoUri;       
        this.status = 'Pendiente';      // Atributo clave del Experto
        this.timestamp = new Date();
    }

    // Patrón Experto: Valida sus propios atributos para asegurar la integridad de los datos
    validarDatos() {
        if (!this.description || this.description.length < 10) {
            return "La descripción debe tener al menos 10 caracteres.";
        }
        if (!this.location || !this.location.latitude) {
            return "La ubicación GPS es obligatoria.";
        }
        if (!this.photoUri) {
            return "Se requiere una fotografía del bache.";
        }
        return null; // Datos válidos
    }

    // Implementación mínima para la consola (ejemplo de Alta Cohesión)
    obtenerResumen() {
        return `Reporte ID: ${this.id}, Estado: ${this.status}, Desc: ${this.description.substring(0, 30)}...`;
    }
}

export default ReporteHoyos;