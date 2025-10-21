import { initializeApp } from 'firebase/app';
// Importaciones específicas para la autenticación en React Native
import { initializeAuth, getReactNativePersistence, signInAnonymously } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getFirestore, collection, addDoc, Timestamp, setLogLevel } from 'firebase/firestore';
// Importaciones para Firebase Storage
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import ReporteHoyos from '../models/ReporteHoyos'; 

// === CONFIGURACIÓN DE TU PROYECTO REAL "MandaTuHoyo" ===
// 🛑 Asegúrate que el valor de 'storageBucket' refleje el nombre de tu nuevo bucket.
const FALLBACK_FIREBASE_CONFIG = {
    apiKey: "AIzaSyDOhz_XRnfrglvO_K7zWuCMjLpCDTlv6tk", 
    authDomain: "mandatuhoyo-523f0.firebaseapp.com",
    projectId: "mandatuhoyo-523f0",
    storageBucket: "mandatuhoyo-523f0.appspot.com", // <-- **VALOR ACTUALIZADO** (Generalmente es el project ID + .appspot.com)
    appId: "1:597556767433:web:cf0f80d984ea75fd927b18",
};
// =======================================================

let db, auth, storage;

const initializeFirebase = async () => {
    try {
        const firebaseConfig = FALLBACK_FIREBASE_CONFIG;
        if (!firebaseConfig.projectId) {
             throw new Error("Proyecto Firebase no configurado.");
        }
        
        setLogLevel('debug'); 

        const app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        
        // Inicialización de Firebase Storage
        storage = getStorage(app); // <--- Obtener la instancia de Storage

        // 🛑 Solución al ERROR (auth/configuration-not-found) y WARNING (AsyncStorage)
        auth = initializeAuth(app, {
            persistence: getReactNativePersistence(AsyncStorage)
        });

        await signInAnonymously(auth); 
        console.log("✅ Firebase inicializado y usuario anónimo autenticado.");

    } catch (error) {
        console.error(`🛑 ERROR al inicializar Firebase: ${error.message || error}`);
        throw new Error("Error de conexión a Firebase. Por favor, revisa tu configuración."); 
    }
};

initializeFirebase();

/**
 * Gestor de Persistencia: Asume el rol de Patrón Creador de documentos en Firestore.
 */
class FirestoreService {
    COLLECTION_NAME = 'reportes'; 
    APP_ID_CANVAS = 'MandaTuHoyoApp-Dev'; 

    // Nuevo método para subir imágenes a Cloud Storage
    async uploadImageToStorage(uri, userId) {
        if (!storage) {
            throw new Error("Firebase Storage no está inicializado.");
        }

        // Obtener los datos binarios de la imagen desde la URI local
        const response = await fetch(uri);
        const blob = await response.blob(); // Convertir la imagen a un Blob

        // Crear una referencia única para la imagen en Storage
        const imageRef = ref(storage, `reportes_hoyos/${userId}/${Date.now()}_${Math.random().toString(36).substring(2, 9)}.jpg`);

        // Subir la imagen
        await uploadBytes(imageRef, blob);

        // Obtener la URL pública de la imagen
        const downloadURL = await getDownloadURL(imageRef);
        return downloadURL; // Esta es la URL que guardaremos en Firestore
    }

    async crearReporte(reporteData) {
        if (!db || !auth || !auth.currentUser) {
             throw new Error("El sistema no está conectado a la base de datos.");
        }

        const userId = auth.currentUser.uid;
        
        const nuevoReporte = new ReporteHoyos(
            reporteData.description,
            reporteData.location,
            reporteData.photoUri 
        );
        
        const error = nuevoReporte.validarDatos();
        if (error) {
            throw new Error(`Validación Fallida: ${error}`);
        }
        
        let imageUrl = null;
        if (nuevoReporte.photoUri) {
            try {
                // Subir la imagen y obtener su URL pública
                imageUrl = await this.uploadImageToStorage(nuevoReporte.photoUri, userId);
                console.log("✅ Imagen subida a Cloud Storage. URL:", imageUrl);
            } catch (imageUploadError) {
                console.error("Error al subir la imagen:", imageUploadError);
                throw new Error("Error al subir la imagen del reporte. Por favor, inténtalo de nuevo.");
            }
        }

        const documento = {
            description: nuevoReporte.description,
            location: {
                latitude: nuevoReporte.location.latitude,
                longitude: nuevoReporte.location.longitude,
            },
            photoUrl: imageUrl, // <-- Guardamos la URL pública
            status: nuevoReporte.status,
            timestamp: Timestamp.now(), 
            userId: userId,
            appId: this.APP_ID_CANVAS, 
        };

        try {
            // Colección pública para entornos Canvas
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
