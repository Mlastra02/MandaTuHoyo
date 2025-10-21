import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, ScrollView, ActivityIndicator, Image } from 'react-native';
import * as Location from 'expo-location'; 
import * as ImagePicker from 'expo-image-picker'; 
import { SafeAreaView } from 'react-native-safe-area-context'; 

// Importación de las Clases AOO/DOO
import LocalDataService from '../services/LocalDataService'; // Controlador de Persistencia (Patrón Creador)

// Función de Interacción (Patrón Controlador de Interfaz)
const ReporteScreen = () => {
    const [description, setDescription] = useState('');
    const [photoUri, setPhotoUri] = useState(null);
    const [location, setLocation] = useState(null);
    const [loading, setLoading] = useState(false);
    const [totalReports, setTotalReports] = useState(0); 

    // Carga inicial del total de reportes desde el mock
    useEffect(() => {
        setTotalReports(LocalDataService.obtenerTodosLosReportes().length);
    }, []);

    // Lógica para obtener ubicación GPS
    const handleGetLocation = async () => {
        setLoading(true);
        try {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') { Alert.alert('Permiso Denegado', 'Necesitamos permiso de ubicación.'); return; }
            let loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
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
        if (status !== 'granted') { Alert.alert('Permiso Denegado', 'Necesitamos acceso a la cámara.'); return; }

        let result = await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [4, 3], quality: 0.5 });
        if (!result.canceled) { setPhotoUri(result.assets[0].uri); }
    };

    // Patrón Controlador: Recibe el evento y delega la persistencia
    const handleSubmit = async () => {
        const nuevoReporteData = { description, location, photoUri };
        
        setLoading(true);
        try {
            // DELEGACIÓN AL SERVICIO LOCAL (Patrón Controlador delegando al Creador)
            const success = await LocalDataService.crearReporte(nuevoReporteData);

            if (success) {
                // Notifica y limpia el formulario
                setTotalReports(LocalDataService.obtenerTodosLosReportes().length);
                Alert.alert("Reporte Exitoso", `¡Gracias! El hoyo ha sido registrado. Total: ${LocalDataService.obtenerTodosLosReportes().length}`);
                setDescription('');
                setPhotoUri(null);
                setLocation(null);
            }
        } catch (error) {
            Alert.alert("Error al Enviar", error.message); // Muestra el error de validación del Experto
        } finally {
            setLoading(false);
        }
    };

    const isComplete = description && location && photoUri;

    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView contentContainerStyle={styles.container}>
                <Text style={styles.title}>Reporte Ciudadano de Hoyo</Text>
                <Text style={styles.subtitle}>Reportes Registrados (Mock DB): {totalReports}</Text>

                <Text style={styles.label}>1. Ubicación GPS:</Text>
                <Text style={styles.statusText}>
                    {location ? `Lat: ${location.latitude.toFixed(6)}, Lon: ${location.longitude.toFixed(6)}` : 'Coordenadas pendientes...'}
                </Text>
                <Button 
                    title={loading && !location ? "OBTENIENDO GPS..." : "Capturar Ubicación Actual"} 
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