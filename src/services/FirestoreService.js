import { initializeApp } from 'firebase/app';
// Importaciones específicas para la autenticación en React Native
import { initializeAuth, getReactNativePersistence, signInAnonymously } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getFirestore, collection, addDoc, Timestamp, setLogLevel } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import ReporteHoyos from '../models/ReporteHoyos'; 

// === CONFIGURACIÓN DE TU PROYECTO REAL "MandaTuHoyo" ===
// Esta configuración reemplaza el problema del "projectId not provided"
const FALLBACK_FIREBASE_CONFIG = {
    apiKey: "AIzaSyDOhz_XRnfrglvO_K7zWuCMjLpCDTlv6tk", 
    authDomain: "mandatuhoyo-523f0.firebaseapp.com",
    projectId: "mandatuhoyo-523f0", // ¡CRÍTICO! Conexión a tu proyecto
    storageBucket: "mandatuhoyo-523f0.firebasestorage.app",
    appId: "1:597556767433:web:cf0f80d984ea75fd927b18",
};
// =======================================================

let db, auth, storage;

// 1. Inicialización de Firebase
const initializeFirebase = async () => {
    try {
        // En un entorno de desarrollo, usamos nuestra configuración de fallback
        const firebaseConfig = FALLBACK_FIREBASE_CONFIG;
        
        if (!firebaseConfig.projectId) {
             throw new Error("Proyecto Firebase no configurado.");
        }
        
        setLogLevel('debug'); // Muestra logs de Firebase en la consola

        const app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        storage = getStorage(app);
        
        // 🛑 Solución al ERROR (auth/configuration-not-found) y WARNING (AsyncStorage)
        // Usar initializeAuth con getReactNativePersistence para manejar sesiones en móvil
        auth = initializeAuth(app, {
            persistence: getReactNativePersistence(AsyncStorage)
        });

        // 2. Autenticación Anónima (Necesaria para escribir en Firestore)
        await signInAnonymously(auth); 
        console.log("✅ Firebase inicializado y usuario anónimo autenticado.");

    } catch (error) {
        // El log en consola ahora muestra el error de Firebase si falla
        console.error(`🛑 ERROR al inicializar Firebase: ${error.message || error}`);
        // Si la conexión falla, se lanza una excepción para que el controlador la capture
        throw new Error("Error de conexión a Firebase. Por favor, revisa tu configuración."); 
    }
};

initializeFirebase();

/**
 * Gestor de Persistencia: Asume el rol de Patrón Creador de documentos en Firestore.
 */
class FirestoreService {
    // La colección se almacenará en la ruta pública (requerida por el entorno Canvas)
    COLLECTION_NAME = 'reportes'; 
    APP_ID_CANVAS = 'MandaTuHoyoApp-Dev'; // ID ficticio para la ruta pública

    /**
     * Sube una imagen al bucket de Firebase Storage y retorna la URL pública
     * @param {string} photoUri - URI local de la foto del dispositivo
     * @param {string} userId - ID del usuario para organizar las fotos
     * @returns {Promise<string>} - URL pública de descarga de la imagen
     */
    async subirImagenAStorage(photoUri, userId) {
        if (!storage) {
            throw new Error("Firebase Storage no está inicializado.");
        }

        try {
            // Convertir URI local a Blob para React Native
            const response = await fetch(photoUri);
            const blob = await response.blob();

            // Crear referencia única en Storage: reportes/{userId}/{timestamp}.jpg
            const timestamp = Date.now();
            const filename = `${timestamp}.jpg`;
            const storageRef = ref(storage, `reportes/${userId}/${filename}`);

            // Subir imagen al bucket
            console.log("📤 Subiendo imagen a Firebase Storage...");
            await uploadBytes(storageRef, blob);

            // Obtener URL pública de descarga
            const downloadURL = await getDownloadURL(storageRef);
            console.log("✅ Imagen subida exitosamente:", downloadURL);

            return downloadURL;

        } catch (error) {
            console.error("Error al subir imagen a Storage:", error);
            throw new Error("No se pudo subir la imagen al servidor.");
        }
    }

    // Patrón CREADOR: Crea una nueva instancia de Reporte en la DB
    async crearReporte(reporteData) {
        if (!db || !auth || !auth.currentUser) {
             throw new Error("El sistema no está conectado a la base de datos.");
        }

        // Asumimos que el userId será el UID anónimo del usuario actual
        const userId = auth.currentUser.uid;
        
        // Patrón Creador: Instancia la clase Experto para validar
        const nuevoReporte = new ReporteHoyos(
            reporteData.description,
            reporteData.location,
            reporteData.photoUri
        );
        
        // Patrón Experto: Validar los datos antes de guardar
        const error = nuevoReporte.validarDatos();
        if (error) {
            throw new Error(`Validación Fallida: ${error}`);
        }
        
        // === SUBIR IMAGEN A FIREBASE STORAGE ===
        let photoURL;
        try {
            photoURL = await this.subirImagenAStorage(nuevoReporte.photoUri, userId);
        } catch (error) {
            throw new Error(`Error al subir la imagen: ${error.message}`);
        }
        
        // === PREPARACIÓN FINAL DEL DOCUMENTO ===
        const documento = {
            description: nuevoReporte.description,
            location: {
                latitude: nuevoReporte.location.latitude,
                longitude: nuevoReporte.location.longitude,
            },
            photoURL: photoURL, // URL pública de Storage en lugar de URI local
            status: nuevoReporte.status,
            timestamp: Timestamp.now(), // Firestore Timestamp
            userId: userId,
            appId: this.APP_ID_CANVAS, 
        };

        try {
            // Referencia a la colección pública
            const colRef = collection(db, 'artifacts', this.APP_ID_CANVAS, 'public', 'data', this.COLLECTION_NAME);
            await addDoc(colRef, documento);
            console.log("✅ Documento guardado exitosamente en Firestore.");
            return true;

        } catch (error) {
            console.error("Error al guardar en Firestore:", error);
            throw new Error("Error de conexión con la base de datos de Firestore.");
        }
    }
}

export default new FirestoreService();
