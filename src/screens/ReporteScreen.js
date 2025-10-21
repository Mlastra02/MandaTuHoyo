import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, ScrollView, ActivityIndicator, Image } from 'react-native';
import * as Location from 'expo-location'; 
import * as ImagePicker from 'expo-image-picker'; 
import { SafeAreaView } from 'react-native-safe-area-context'; 

// Importación del servicio de persistencia (Controlador de Persistencia)
import FirestoreService from '../services/FirestoreService'; 

// El Patrón Controlador de Interfaz: Llama al Servicio (Controlador de Persistencia)
const ReporteScreen = () => {
    // Atributos del ReporteHoyos capturados en el frontend
    const [description, setDescription] = useState('');
    const [photoUri, setPhotoUri] = useState(null);
    const [location, setLocation] = useState(null);
    const [loading, setLoading] = useState(false);
    
    // Lógica para obtener ubicación GPS
    const handleGetLocation = async () => {
        setLoading(true);
        try {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') { Alert.alert('Permiso Denegado', 'Necesitamos permiso de ubicación para reportar el hoyo.'); return; }
            let loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Highest });
            setLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
        } catch (error) {
            Alert.alert('Error GPS', 'No se pudo obtener la ubicación. Asegúrate de tener el GPS encendido.');
        } finally {
            setLoading(false);
        }
    };

    // Lógica para capturar foto (usando la cámara)
    const handleCapturePhoto = async () => {
        let { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') { Alert.alert('Permiso Denegado', 'Necesitamos acceso a la cámara para adjuntar la foto.'); return; }
        let result = await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [4, 3], quality: 0.5 });
        if (!result.canceled) { setPhotoUri(result.assets[0].uri); }
    };
    
    // Patrón Controlador: Recibe el evento de la interfaz y delega la persistencia
    const handleSubmit = async () => {
        const nuevoReporteData = { description, location, photoUri };
        
        setLoading(true);
        try {
            // DELEGACIÓN AL SERVICIO DE FIRESTORE (Controlador delegando al Creador de Documentos)
            await FirestoreService.crearReporte(nuevoReporteData);

            // Limpieza de formulario después de éxito
            Alert.alert("Éxito", "¡Hoyo reportado! Se ha guardado en la base de datos.");
            setDescription('');
            setPhotoUri(null);
            setLocation(null);
        } catch (error) {
            Alert.alert("Error al Enviar", error.message || "Ocurrió un error desconocido al guardar el reporte.");
        } finally {
            setLoading(false);
        }
    };

    const isComplete = description && location && photoUri;

    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView contentContainerStyle={styles.container}>
                <Text style={styles.title}>Reporte Ciudadano de Hoyo</Text>
                <Text style={styles.subtitle}>¡Tu reporte se guardará en Firestore!</Text>

                <Text style={styles.label}>1. Ubicación GPS:</Text>
                <Text style={styles.statusText}>
                    {location ? `Lat: ${location.latitude.toFixed(6)}, Lon: ${location.longitude.toFixed(6)}` : 'Coordenadas pendientes...'}
                </Text>
                <Button 
                    title={"Capturar Ubicación Actual"} 
                    onPress={handleGetLocation} 
                    disabled={loading} 
                    color="#007AFF"
                />
                
                <Text style={styles.label}>2. Fotografías:</Text>
                {photoUri && <Image source={{ uri: photoUri }} style={styles.imagePreview} />}
                <Button 
                    title={photoUri ? "Re-Capturar Foto ✅" : "Abrir Cámara y Adjuntar Foto"} 
                    onPress={handleCapturePhoto} 
                    color={photoUri ? "#28a745" : "#6c757d"}
                />
                
                <Text style={styles.label}>3. Descripción del Daño:</Text>
                <TextInput
                    style={styles.input}
                    multiline
                    numberOfLines={4}
                    maxLength={250}
                    value={description}
                    onChangeText={setDescription}
                    placeholder="Detalla la severidad y peligrosidad del daño vial..."
                />

                {loading && <ActivityIndicator size="large" color="#007AFF" style={{marginVertical: 10}} />}

                <Button 
                    title="Enviar Reporte" 
                    onPress={handleSubmit} 
                    disabled={!isComplete || loading} 
                    color="#dc3545" 
                />
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#f9f9f9' },
    container: { padding: 20 },
    title: { fontSize: 26, fontWeight: '800', color: '#333', marginBottom: 5, textAlign: 'center' },
    subtitle: { fontSize: 14, color: '#666', marginBottom: 20, textAlign: 'center' },
    label: { fontSize: 16, marginTop: 15, marginBottom: 5, fontWeight: '700', color: '#333' },
    statusText: { marginBottom: 10, color: '#333', fontStyle: 'italic', paddingHorizontal: 5 },
    imagePreview: { width: '100%', height: 200, marginBottom: 10, borderRadius: 8, resizeMode: 'cover', borderWidth: 1, borderColor: '#ccc' },
    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        padding: 12,
        marginBottom: 20,
        borderRadius: 8,
        minHeight: 100,
        textAlignVertical: 'top',
        backgroundColor: '#fff',
    },
});

export default ReporteScreen;