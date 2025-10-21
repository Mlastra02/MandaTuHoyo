import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, ScrollView, ActivityIndicator, Image, TouchableOpacity } from 'react-native';
import * as Location from 'expo-location'; 
import * as ImagePicker from 'expo-image-picker'; 
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons'; 

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

    // Lógica para capturar foto (usando la cámara) y obtener ubicación automáticamente
    const handleCapturePhoto = async () => {
        let { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') { Alert.alert('Permiso Denegado', 'Necesitamos acceso a la cámara.'); return; }

        let result = await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [4, 3], quality: 0.5 });
        if (!result.canceled) { 
            setPhotoUri(result.assets[0].uri);
            // Obtener ubicación automáticamente después de tomar la foto
            handleGetLocation();
        }
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
                <Text style={styles.subtitle}>Reportes Registrados: {totalReports}</Text>

                {!photoUri ? (
                    // Vista inicial: Solo ícono de cámara en el centro
                    <View style={styles.cameraContainer}>
                        <TouchableOpacity 
                            style={styles.cameraButton} 
                            onPress={handleCapturePhoto}
                            disabled={loading}
                        >
                            <Ionicons name="camera" size={80} color="#fff" />
                            <Text style={styles.cameraButtonText}>Capturar Foto</Text>
                        </TouchableOpacity>
                        {loading && <ActivityIndicator size="large" color="#007AFF" style={styles.loader} />}
                    </View>
                ) : (
                    // Vista después de capturar: Foto, ubicación, descripción y botón enviar
                    <View style={styles.formContainer}>
                        {/* Foto capturada */}
                        <View style={styles.photoContainer}>
                            <Image source={{ uri: photoUri }} style={styles.imagePreview} />
                            <TouchableOpacity 
                                style={styles.retakeButton} 
                                onPress={handleCapturePhoto}
                            >
                                <Ionicons name="camera-reverse" size={24} color="#fff" />
                                <Text style={styles.retakeButtonText}>Retomar Foto</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Ubicación */}
                        <View style={styles.locationContainer}>
                            <View style={styles.locationHeader}>
                                <Ionicons name="location-sharp" size={24} color="#007AFF" />
                                <Text style={styles.locationTitle}>Ubicación</Text>
                            </View>
                            {location ? (
                                <Text style={styles.locationText}>
                                    Lat: {location.latitude.toFixed(6)}, Lon: {location.longitude.toFixed(6)}
                                </Text>
                            ) : (
                                <View>
                                    <Text style={styles.locationPending}>Obteniendo ubicación...</Text>
                                    {loading && <ActivityIndicator size="small" color="#007AFF" />}
                                </View>
                            )}
                        </View>

                        {/* Descripción */}
                        <View style={styles.descriptionContainer}>
                            <Text style={styles.label}>Descripción del Daño</Text>
                            <TextInput
                                style={styles.input}
                                multiline
                                numberOfLines={4}
                                maxLength={250}
                                value={description}
                                onChangeText={setDescription}
                                placeholder="Detalla la severidad y peligrosidad del daño vial..."
                                placeholderTextColor="#999"
                            />
                            <Text style={styles.charCounter}>{description.length}/250</Text>
                        </View>

                        {/* Botón de enviar */}
                        <TouchableOpacity
                            style={[styles.submitButton, (!isComplete || loading) && styles.submitButtonDisabled]}
                            onPress={handleSubmit}
                            disabled={!isComplete || loading}
                        >
                            {loading ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <>
                                    <Ionicons name="send" size={24} color="#fff" />
                                    <Text style={styles.submitButtonText}>Enviar Reporte</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: { 
        flex: 1, 
        backgroundColor: '#f9f9f9' 
    },
    container: { 
        padding: 20,
        flexGrow: 1
    },
    title: { 
        fontSize: 26, 
        fontWeight: '800', 
        color: '#333', 
        marginBottom: 5, 
        textAlign: 'center' 
    },
    subtitle: { 
        fontSize: 14, 
        color: '#666', 
        marginBottom: 20, 
        textAlign: 'center' 
    },
    
    // Estilos para la vista inicial (sin foto)
    cameraContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: 400,
        marginTop: 50
    },
    cameraButton: {
        width: 180,
        height: 180,
        borderRadius: 90,
        backgroundColor: '#007AFF',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    cameraButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
        marginTop: 10
    },
    loader: {
        marginTop: 20
    },

    // Estilos para la vista después de capturar (con foto)
    formContainer: {
        flex: 1,
        marginTop: 10
    },
    photoContainer: {
        marginBottom: 20,
        borderRadius: 12,
        overflow: 'hidden',
        backgroundColor: '#fff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    imagePreview: { 
        width: '100%', 
        height: 250, 
        resizeMode: 'cover',
    },
    retakeButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#007AFF',
        padding: 12,
        gap: 8
    },
    retakeButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 8
    },

    // Ubicación
    locationContainer: {
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 12,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    locationHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
        gap: 8
    },
    locationTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#333',
        marginLeft: 8
    },
    locationText: {
        fontSize: 14,
        color: '#555',
        fontFamily: 'monospace'
    },
    locationPending: {
        fontSize: 14,
        color: '#999',
        fontStyle: 'italic'
    },

    // Descripción
    descriptionContainer: {
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 12,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    label: { 
        fontSize: 16, 
        marginBottom: 10, 
        fontWeight: '700', 
        color: '#333' 
    },
    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        padding: 12,
        borderRadius: 8,
        minHeight: 100,
        textAlignVertical: 'top',
        backgroundColor: '#fafafa',
        fontSize: 15,
        color: '#333'
    },
    charCounter: {
        fontSize: 12,
        color: '#999',
        textAlign: 'right',
        marginTop: 5
    },

    // Botón de enviar
    submitButton: {
        flexDirection: 'row',
        backgroundColor: '#dc3545',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
        marginBottom: 20,
        gap: 10
    },
    submitButtonDisabled: {
        backgroundColor: '#ccc',
        opacity: 0.6
    },
    submitButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '700',
        marginLeft: 10
    }
});

export default ReporteScreen;