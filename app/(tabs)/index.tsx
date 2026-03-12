import React, { useRef, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  Image,
} from 'react-native';
import * as Location from 'expo-location';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';

export default function App() {
  // Estados GPS
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState('Esperando configuración...');

  // Estados Cámara
  const [cameraVisible, setCameraVisible] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [facing, setFacing] = useState<CameraType>('back');

  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView | null>(null);

  const API_URL = `http://192.168.0.187:3000/api/enviar-datos`;

  const ejecutarModuloUbicacion = async () => {
    setLoading(true);
    setStatusMsg('Configurando módulo GPS...');

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert(
          'Error de Configuración',
          'El usuario no otorgó permisos para usar el hardware GPS.'
        );
        setLoading(false);
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      setLocation(currentLocation);
      setStatusMsg('Dato GPS obtenido. Enviando a Base de Datos...');

      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          modulo: 'GPS_INTEGRADO',
          latitud: currentLocation.coords.latitude,
          longitud: currentLocation.coords.longitude,
        }),
      });

      const resultado = await response.json();
      console.log('Respuesta backend:', resultado);

      if (response.ok) {
        Alert.alert(
          'Proceso Completo',
          'Módulo GPS configurado, datos leídos y guardados en BD.'
        );
        setStatusMsg('Sincronización GPS exitosa.');
      } else {
        Alert.alert('Error', 'El servidor respondió con error.');
        setStatusMsg('Error al guardar en BD.');
      }
    } catch (error) {
      console.error(error);
      Alert.alert(
        'Error de Red',
        'No se pudo conectar con el servidor. Revisa la IP.'
      );
      setStatusMsg('Error en el flujo de datos.');
    } finally {
      setLoading(false);
    }
  };

  const abrirCamara = async () => {
    try {
      if (!cameraPermission) {
        Alert.alert('Cámara', 'Cargando permisos de cámara...');
        return;
      }

      if (!cameraPermission.granted) {
        const permiso = await requestCameraPermission();

        if (!permiso.granted) {
          Alert.alert(
            'Permiso denegado',
            'No se otorgó permiso para usar la cámara.'
          );
          return;
        }
      }

      setCameraVisible(true);
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'No se pudo abrir la cámara.');
    }
  };

  const tomarFoto = async () => {
    try {
      const photo = await cameraRef.current?.takePictureAsync({
        quality: 0.7,
      });

      if (photo?.uri) {
        setPhotoUri(photo.uri);
        setCameraVisible(false);
        Alert.alert('Éxito', 'Foto capturada correctamente.');
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'No se pudo tomar la foto.');
    }
  };

  const cambiarCamara = () => {
    setFacing((current) => (current === 'back' ? 'front' : 'back'));
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.header}>Configurador de Módulos</Text>

      <View style={styles.infoBox}>
        <Text style={styles.infoTitle}>Módulos Identificados:</Text>
        <Text style={styles.bullet}>• GPS (Hardware de geolocalización)</Text>
        <Text style={styles.bullet}>• Cámara (Captura de imagen)</Text>
        <Text style={styles.bullet}>• Red (Conectividad HTTP/API)</Text>
        <Text style={styles.bullet}>• Almacenamiento (SQLite Backend)</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Estado del Módulo GPS</Text>

        {loading ? (
          <ActivityIndicator size="large" color="#007AFF" />
        ) : (
          <View style={styles.dataArea}>
            <Text style={styles.statusText}>{statusMsg}</Text>

            {location && (
              <View style={styles.resultBox}>
                <Text style={styles.coord}>
                  Lat: {location.coords.latitude.toFixed(6)}
                </Text>
                <Text style={styles.coord}>
                  Lon: {location.coords.longitude.toFixed(6)}
                </Text>
              </View>
            )}
          </View>
        )}
      </View>

      <TouchableOpacity style={styles.button} onPress={ejecutarModuloUbicacion}>
        <Text style={styles.buttonText}>IDENTIFICAR Y CONFIGURAR GPS</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.buttonSecondary} onPress={abrirCamara}>
        <Text style={styles.buttonText}>ABRIR CÁMARA</Text>
      </TouchableOpacity>

      {cameraVisible && (
        <View style={styles.cameraBox}>
          <Text style={styles.cardTitle}>Módulo Cámara</Text>

          <View style={styles.cameraContainer}>
            <CameraView ref={cameraRef} style={styles.camera} facing={facing} />
          </View>

          <View style={styles.cameraButtonsRow}>
            <TouchableOpacity style={styles.smallButton} onPress={cambiarCamara}>
              <Text style={styles.buttonText}>CAMBIAR</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.smallButton} onPress={tomarFoto}>
              <Text style={styles.buttonText}>TOMAR FOTO</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {photoUri && (
        <View style={styles.previewBox}>
          <Text style={styles.cardTitle}>Foto Capturada</Text>
          <Image source={{ uri: photoUri }} style={styles.previewImage} />
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#f0f2f5',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
  },
  header: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 20,
  },
  infoBox: {
    width: '100%',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    borderLeftWidth: 5,
    borderLeftColor: '#007AFF',
  },
  infoTitle: {
    fontWeight: 'bold',
    marginBottom: 5,
  },
  bullet: {
    color: '#555',
    fontSize: 14,
  },
  card: {
    backgroundColor: '#fff',
    width: '100%',
    padding: 20,
    borderRadius: 15,
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
    color: '#333',
  },
  dataArea: {
    alignItems: 'center',
    minHeight: 80,
    justifyContent: 'center',
    width: '100%',
  },
  statusText: {
    color: '#666',
    fontStyle: 'italic',
    marginBottom: 10,
    textAlign: 'center',
  },
  resultBox: {
    backgroundColor: '#eef6ff',
    padding: 10,
    borderRadius: 8,
    width: '100%',
  },
  coord: {
    fontSize: 16,
    fontFamily: 'monospace',
    color: '#004a99',
    textAlign: 'center',
  },
  button: {
    marginTop: 30,
    backgroundColor: '#007AFF',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 10,
    width: '100%',
  },
  buttonSecondary: {
    marginTop: 15,
    backgroundColor: '#34A853',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 10,
    width: '100%',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    textAlign: 'center',
    fontSize: 16,
  },
  cameraBox: {
    marginTop: 25,
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 15,
  },
  cameraContainer: {
    width: '100%',
    height: 350,
    overflow: 'hidden',
    borderRadius: 12,
  },
  camera: {
    flex: 1,
  },
  cameraButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 15,
    justifyContent: 'space-between',
  },
  smallButton: {
    flex: 1,
    backgroundColor: '#FF9500',
    paddingVertical: 12,
    borderRadius: 10,
  },
  previewBox: {
    marginTop: 25,
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 15,
    alignItems: 'center',
  },
  previewImage: {
    width: '100%',
    height: 300,
    borderRadius: 12,
    resizeMode: 'cover',
  },
});