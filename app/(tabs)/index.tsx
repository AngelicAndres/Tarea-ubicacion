import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from 'react-native';
import * as Location from 'expo-location';

export default function App() {
  // Estados para la lógica de la aplicación
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState('Esperando configuración...');

  // IMPORTANTE: Pon tu IP aquí (Sácala con ipconfig en el CMD)
  const IP_SERVIDOR = '192.168.1.XX'; 
  const API_URL = `http://192.168.0.187:3000/api/enviar-datos`;

  // Función para identificar, configurar y utilizar el módulo GPS
  const ejecutarModuloUbicacion = async () => {
    setLoading(true);
    setStatusMsg('Configurando módulo...');

    try {
      // 1. CONFIGURACIÓN: Solicitar permisos de hardware al sistema
      let { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Error de Configuración', 'El usuario no otorgó permisos para usar el hardware GPS.');
        setLoading(false);
        return;
      }

      // 2. UTILIZACIÓN: Lectura del sensor (Optimizado para Android)
      // Usamos Accuracy.Balanced para que sea rápido y no tarde minutos
      let currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      setLocation(currentLocation);
      setStatusMsg('Dato obtenido. Enviando a Base de Datos...');

      // 3. ENVÍO DE DATOS: Flujo de información hacia el servidor (Hardware -> DB)
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          modulo: 'GPS_INTEGRADO',
          latitud: currentLocation.coords.latitude,
          longitud: currentLocation.coords.longitude
        })
      });

      const resultado = await response.json();

      if (response.ok) {
        Alert.alert('Proceso Completo', 'Módulo configurado, datos leídos y guardados en BD.');
        setStatusMsg('Sincronización exitosa.');
      }

    } catch (error) {
      console.error(error);
      Alert.alert('Error de Red', 'No se pudo conectar con el servidor. Revisa la IP.');
      setStatusMsg('Error en el flujo de datos.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.header}>Configurador de Módulos</Text>
      
      <View style={styles.infoBox}>
        <Text style={styles.infoTitle}>Módulos Identificados:</Text>
        <Text style={styles.bullet}>• GPS (Hardware de geolocalización)</Text>
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
                <Text style={styles.coord}>Lat: {location.coords.latitude.toFixed(6)}</Text>
                <Text style={styles.coord}>Lon: {location.coords.longitude.toFixed(6)}</Text>
              </View>
            )}
          </View>
        )}
      </View>

      <TouchableOpacity style={styles.button} onPress={ejecutarModuloUbicacion}>
        <Text style={styles.buttonText}>IDENTIFICAR Y CONFIGURAR</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: '#f0f2f5', alignItems: 'center', padding: 20, paddingTop: 60 },
  header: { fontSize: 26, fontWeight: 'bold', color: '#1a1a1a', marginBottom: 20 },
  infoBox: { width: '100%', backgroundColor: '#fff', padding: 15, borderRadius: 10, marginBottom: 20, borderLeftWidth: 5, borderLeftColor: '#007AFF' },
  infoTitle: { fontWeight: 'bold', marginBottom: 5 },
  bullet: { color: '#555', fontSize: 14 },
  card: { backgroundColor: '#fff', width: '100%', padding: 20, borderRadius: 15, alignItems: 'center', elevation: 4, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10 },
  cardTitle: { fontSize: 18, fontWeight: '600', marginBottom: 15, color: '#333' },
  dataArea: { alignItems: 'center', minHeight: 80, justifyContent: 'center' },
  statusText: { color: '#666', fontStyle: 'italic', marginBottom: 10 },
  resultBox: { backgroundColor: '#eef6ff', padding: 10, borderRadius: 8, width: '100%' },
  coord: { fontSize: 16, fontFamily: 'monospace', color: '#004a99', textAlign: 'center' },
  button: { marginTop: 30, backgroundColor: '#007AFF', paddingVertical: 15, paddingHorizontal: 30, borderRadius: 10, width: '100%' },
  buttonText: { color: '#fff', fontWeight: 'bold', textAlign: 'center', fontSize: 16 }
});