import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Alert,
  TouchableOpacity,
  TextInput,
  StatusBar,
  SafeAreaView,
  Animated,
  ActivityIndicator,
} from 'react-native';
import MapView, { Marker, MapPressEvent, Region } from 'react-native-maps';
import * as Location from 'expo-location';
import axios from 'axios';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/types';

type SelectLocationRouteProp = RouteProp<RootStackParamList, 'SelectLocation'>;

const { width, height } = Dimensions.get('window');

const SelectLocationScreen = () => {
  const route = useRoute<SelectLocationRouteProp>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const mapRef = useRef<MapView>(null);

  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [region, setRegion] = useState<Region | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [searchText, setSearchText] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  
  const slideAnim = useRef(new Animated.Value(height)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    initializeLocation();
    animateIn();
  }, []);

  const animateIn = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const initializeLocation = async () => {
    try {
      setLoading(true);
      
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Lỗi', 'Không có quyền truy cập vị trí');
        // Set default location (Hanoi) if permission denied
        const defaultCoords = {
          latitude: 21.0285,
          longitude: 105.8542,
        };
        setLocation(defaultCoords);
        setRegion({
          latitude: defaultCoords.latitude,
          longitude: defaultCoords.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        });
        setAddress('Hà Nội, Việt Nam');
        setLoading(false);
        return;
      }

      const current = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      
      const coords = {
        latitude: current.coords.latitude,
        longitude: current.coords.longitude,
      };
      
      setLocation(coords);
      setRegion({
        latitude: coords.latitude,
        longitude: coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
      
      await fetchAddress(coords);
      setLoading(false);
    } catch (error) {
      console.error('Error getting location:', error);
      // Fallback to default location
      const defaultCoords = {
        latitude: 21.0285,
        longitude: 105.8542,
      };
      setLocation(defaultCoords);
      setRegion({
        latitude: defaultCoords.latitude,
        longitude: defaultCoords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
      setAddress('Hà Nội, Việt Nam');
      setLoading(false);
    }
  };

  const fetchAddress = async (coords: { latitude: number; longitude: number }) => {
    try {
      const response = await axios.get(
        `https://nominatim.openstreetmap.org/reverse?lat=${coords.latitude}&lon=${coords.longitude}&format=json`,
        {
          headers: {
            'User-Agent': 'MyExpenseApp/1.0 (cakho2910@gmail.com)',
            'Accept-Language': 'vi',
          },
        }
      );

      const { address } = response.data;
      const fullAddress = [
        address?.road,
        address?.suburb,
        address?.city || address?.town || address?.village,
        address?.state,
        address?.country,
      ]
        .filter(Boolean)
        .join(', ');

      setAddress(fullAddress || 'Không xác định được địa chỉ');
    } catch (e) {
      console.error('Lỗi khi lấy địa chỉ từ Nominatim:', e);
      setAddress('Không xác định được địa chỉ');
    }
  };

  const searchLocation = async () => {
    if (!searchText.trim()) return;

    setSearching(true);
    try {
      const response = await axios.get(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchText)}&format=json&limit=1`,
        {
          headers: {
            'User-Agent': 'MyExpenseApp/1.0 (cakho2910@gmail.com)',
            'Accept-Language': 'vi',
          },
        }
      );

      const result = response.data[0];
      if (result) {
        const coords = {
          latitude: parseFloat(result.lat),
          longitude: parseFloat(result.lon),
        };
        const newRegion = {
          latitude: coords.latitude,
          longitude: coords.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        };
        
        setLocation(coords);
        setRegion(newRegion);
        
        // Animate map to new location
        if (mapRef.current) {
          mapRef.current.animateToRegion(newRegion, 1000);
        }
        
        await fetchAddress(coords);
      } else {
        Alert.alert('Không tìm thấy địa điểm', 'Vui lòng thử từ khóa khác');
      }
    } catch (e) {
      console.error('Lỗi khi tìm địa điểm:', e);
      Alert.alert('Lỗi', 'Không thể tìm địa điểm');
    }
    setSearching(false);
  };

  const handleMapPress = async (event: MapPressEvent) => {
    const coords = event.nativeEvent.coordinate;
    setLocation(coords);
    
    const newRegion = {
      latitude: coords.latitude,
      longitude: coords.longitude,
      latitudeDelta: region?.latitudeDelta || 0.01,
      longitudeDelta: region?.longitudeDelta || 0.01,
    };
    setRegion(newRegion);
    
    await fetchAddress(coords);
  };

  const handleConfirm = () => {
    if (location && address) {
      route.params?.onLocationSelected?.(
        address,
        `${location.latitude},${location.longitude}`
      );
      navigation.goBack();
    }
  };

  const handleGoBack = () => {
    navigation.goBack();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#667eea" />
        <Text style={styles.loadingText}>Đang tải bản đồ...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#667eea" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chọn vị trí</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Map */}
      <Animated.View style={[styles.mapContainer, { opacity: fadeAnim }]}>
        {region && (
          <MapView
            ref={mapRef}
            style={styles.map}
            initialRegion={region}
            region={region}
            onPress={handleMapPress}
            onRegionChangeComplete={setRegion}
            showsUserLocation={true}
            showsMyLocationButton={false}
            showsCompass={false}
            toolbarEnabled={false}
            loadingEnabled={true}
            loadingBackgroundColor="#f8f9fa"
          >
            {location && (
              <Marker coordinate={location} draggable onDragEnd={handleMapPress}>
                <View style={styles.customMarker}>
                  <View style={styles.markerInner} />
                </View>
              </Marker>
            )}
          </MapView>
        )}
        
        {/* Current Location Button */}
        <TouchableOpacity
          style={styles.currentLocationButton}
          onPress={initializeLocation}
        >
          <Text style={styles.locationIcon}>📍</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Bottom Panel */}
      <Animated.View 
        style={[
          styles.bottomPanel,
          { transform: [{ translateY: slideAnim }] }
        ]}
      >
        <View style={styles.dragIndicator} />
        
        {/* Search Section */}
        <View style={styles.searchSection}>
          <View style={styles.searchContainer}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Tìm kiếm địa điểm..."
              placeholderTextColor="#999"
              value={searchText}
              onChangeText={setSearchText}
              onSubmitEditing={searchLocation}
              returnKeyType="search"
            />
            {searching && (
              <ActivityIndicator size="small" color="#667eea" style={styles.searchLoader} />
            )}
          </View>
          
          <TouchableOpacity
            style={styles.searchButton}
            onPress={searchLocation}
            disabled={searching}
          >
            <Text style={styles.searchButtonText}>Tìm</Text>
          </TouchableOpacity>
        </View>

        {/* Address Display */}
        <View style={styles.addressSection}>
          <View style={styles.addressHeader}>
            <Text style={styles.locationIcon}>📍</Text>
            <Text style={styles.addressLabel}>Địa chỉ được chọn</Text>
          </View>
          <Text style={styles.addressText}>
            {address || 'Chạm vào bản đồ để chọn vị trí'}
          </Text>
        </View>

        {/* Confirm Button */}
        <TouchableOpacity
          style={[
            styles.confirmButton,
            { backgroundColor: address ? '#667eea' : '#ccc' }
          ]}
          onPress={handleConfirm}
          disabled={!address}
        >
          <Text style={styles.confirmButtonText}>
            ✓ Xác nhận vị trí
          </Text>
        </TouchableOpacity>
      </Animated.View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#667eea',
    fontWeight: '500',
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#667eea',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },

  backButton: {
    padding: 8,
  },

  backIcon: {
    fontSize: 24,
    color: 'white',
    fontWeight: 'bold',
  },

  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: 'white',
  },

  placeholder: {
    width: 40,
  },

  mapContainer: {
    flex: 1,
    position: 'relative',
  },

  map: {
    width: '100%',
    height: '100%',
  },

  customMarker: {
    backgroundColor: '#667eea',
    borderRadius: 20,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'white',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },

  markerInner: {
    backgroundColor: 'white',
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  currentLocationButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    backgroundColor: 'white',
    borderRadius: 25,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },

  locationIcon: {
    fontSize: 20,
  },

  bottomPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 12,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    maxHeight: height * 0.4,
  },

  dragIndicator: {
    width: 40,
    height: 4,
    backgroundColor: '#e0e0e0',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },

  searchSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },

  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginRight: 12,
    height: 48,
  },

  searchIcon: {
    fontSize: 16,
    marginRight: 12,
  },

  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },

  searchLoader: {
    marginLeft: 8,
  },

  searchButton: {
    backgroundColor: '#667eea',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    height: 48,
    justifyContent: 'center',
  },

  searchButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },

  addressSection: {
    marginBottom: 24,
  },

  addressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },

  addressLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
    color: '#333',
  },

  addressText: {
    fontSize: 15,
    color: '#666',
    lineHeight: 22,
    marginLeft: 28,
  },

  confirmButton: {
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },

  confirmButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
});
export default SelectLocationScreen;
