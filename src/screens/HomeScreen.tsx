import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  SafeAreaView,
  Alert,
  Image,
  ActivityIndicator,
  Animated,
  Dimensions,
  PermissionsAndroid,
  Platform,
  Modal,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import Svg, { Rect, Path, Circle } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import RazorpayCheckout from 'react-native-razorpay';

declare var navigator: any;
import { API_ROUTES, BASE_URL } from '../config/api';
import { useAuth } from '../context/AuthContext';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/RootNavigator';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Home'>;

interface Props {
  navigation: HomeScreenNavigationProp;
}

interface LocationItem {
  name: string;
  address: string;
  lat: number;
  lng: number;
}

// Predefined mock locations for test search
const MOCK_LOCATIONS: LocationItem[] = [
  { name: 'Delhi Cargo Terminal', address: 'Indira Gandhi International Airport, New Delhi', lat: 28.5562, lng: 77.1000 },
  { name: 'Connaught Place', address: 'Block E, Rajiv Chowk, Connaught Place, New Delhi', lat: 28.6304, lng: 77.2177 },
  { name: 'Noida Sector 62 Industrial Area', address: 'Sector 62, Noida, Uttar Pradesh', lat: 28.6105, lng: 77.3610 },
  { name: 'Gurugram Cyber City', address: 'DLF Tower 8th Rd, Sector 24, Gurugram, Haryana', lat: 28.4950, lng: 77.0878 },
  { name: 'Okhla Industrial Area Phase III', address: 'Phase III, Okhla, New Delhi', lat: 28.5359, lng: 77.2731 },
];

interface VehicleOption {
  id: string;
  name: string;
  category: '2-Wheeler' | 'Trucks' | 'Packers & Movers';
  capacity: string;
  baseCharge: number;
  perKm: number;
  surgePerKm: number;
}

const VEHICLE_OPTIONS: VehicleOption[] = [
  { id: '2w_bike', name: '2-Wheeler (Scooty/Bike)', category: '2-Wheeler', capacity: 'Small parcels up to 20kg', baseCharge: 40, perKm: 8, surgePerKm: 2 },
  { id: 'c_bike', name: 'C-Bike (Cargo)', category: '2-Wheeler', capacity: 'Mid parcels up to 50kg', baseCharge: 60, perKm: 12, surgePerKm: 3 },
  { id: '3w', name: '3-Wheeler Truck', category: 'Trucks', capacity: 'Up to 500 kg', baseCharge: 160, perKm: 15, surgePerKm: 4 },
  { id: 'eeco', name: 'Maruti Eeco Cargo', category: 'Trucks', capacity: 'Up to 400 kg', baseCharge: 180, perKm: 16, surgePerKm: 4 },
  { id: 'tata_ace', name: 'Tata Ace 7ft', category: 'Trucks', capacity: 'Up to 750 kg', baseCharge: 210, perKm: 18, surgePerKm: 5 },
  { id: 'pickup_8ft', name: 'Pickup 8ft', category: 'Trucks', capacity: 'Up to 1250 kg', baseCharge: 300, perKm: 22, surgePerKm: 6 },
  { id: 'tata_407', name: 'Tata 407', category: 'Trucks', capacity: 'Up to 2500 kg', baseCharge: 550, perKm: 30, surgePerKm: 8 },
  { id: 'packers', name: 'Packers & Movers', category: 'Packers & Movers', capacity: 'Household shifting, includes 2 helpers', baseCharge: 1200, perKm: 50, surgePerKm: 12 },
];

const getVehicleImage = (id: string) => {
  switch (id) {
    case '2w_bike':
      return require('../assets/vehicles/scooter.png');
    case 'c_bike':
      return require('../assets/vehicles/cargo_bike.png');
    case '3w':
      return require('../assets/vehicles/three_wheeler.png');
    case 'eeco':
      return require('../assets/vehicles/eeco.png');
    case 'tata_ace':
      return require('../assets/vehicles/tata_ace.png');
    case 'pickup_8ft':
      return require('../assets/vehicles/pickup.png');
    case 'tata_407':
      return require('../assets/vehicles/tata_407.png');
    case 'packers':
      return require('../assets/vehicles/packers.png');
    default:
      return require('../assets/vehicles/tata_ace.png');
  }
};

// Premium SVG Icon Components to replace emojis
interface IconProps {
  color?: string;
  size?: number;
  style?: any;
}

const BellIcon: React.FC<IconProps> = ({ color = '#2B2A27', size = 22, style }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
    <Path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2zm-2 1H8v-6c0-2.48 1.51-4.5 4-4.5s4 2.02 4 4.5v6z" fill={color} />
  </Svg>
);

const ClockIcon: React.FC<IconProps> = ({ color = '#2B2A27', size = 16, style }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
    <Path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67V7z" fill={color} />
  </Svg>
);

const HomeIcon: React.FC<IconProps> = ({ color = '#FFFFFF', size = 20, style }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
    <Path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8h5z" fill={color} />
  </Svg>
);

const ListIcon: React.FC<IconProps> = ({ color = '#8F8A80', size = 20, style }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
    <Path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z" fill={color} />
  </Svg>
);

const ChatIcon: React.FC<IconProps> = ({ color = '#8F8A80', size = 20, style }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
    <Path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 9h12v2H6V9zm8 5H6v-2h8v2zm4-6H6V6h12v2z" fill={color} />
  </Svg>
);

const ProfileIcon: React.FC<IconProps> = ({ color = '#8F8A80', size = 20, style }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
    <Path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" fill={color} />
  </Svg>
);

const MapIcon: React.FC<IconProps> = ({ color = '#1D4ED8', size = 16, style }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
    <Path d="M20.5 3l-.16.03L15 5.1 9 3 3.36 4.9c-.21.07-.36.25-.36.48V20.5c0 .28.22.5.5.5l.16-.03L9 18.9l6 2.1 5.64-1.9c.21-.07.36-.25.36-.48V3.5c0-.28-.22-.5-.5-.5zM15 19l-6-2.11V5l6 2.11V19z" fill={color} />
  </Svg>
);

const ContactsIcon: React.FC<IconProps> = ({ color = '#475569', size = 16, style }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
    <Path d="M20 0H4C2.9 0 2 .9 2 2v20c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V2c0-1.1-.9-2-2-2zM8 6h8v2H8V6zm8 12H8v-2h8v2zm0-4H8v-2h8v2z" fill={color} />
  </Svg>
);

const ClipboardIcon: React.FC<IconProps> = ({ color = '#475569', size = 16, style }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
    <Path d="M19 2h-4.18C14.4.84 13.3 0 12 0c-1.3 0-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm7 18H5V4h2v3h10V4h2v16z" fill={color} />
  </Svg>
);

const MicIcon: React.FC<IconProps> = ({ color = '#475569', size = 16, style }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
    <Path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z" fill={color} />
  </Svg>
);

const PinIcon: React.FC<IconProps> = ({ color = '#C17750', size = 18, style }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
    <Path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill={color} />
  </Svg>
);

const StarIcon: React.FC<IconProps> = ({ color = '#F59E0B', size = 16, style }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
    <Path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" fill={color} />
  </Svg>
);

const BuildingIcon: React.FC<IconProps> = ({ color = '#8F8A80', size = 24, style }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
    <Path d="M12 7V3H2v18h20V7H12zM6 19H4v-2h2v2zm0-4H4v-2h2v2zm0-4H4V9h2v2zm0-4H4V5h2v2zm6 12h-2v-2h2v2zm0-4h-2v-2h2v2zm0-4h-2V9h2v2zm0-4h-2V5h2v2zm10 12h-8v-2h2v-2h-2v-2h2v-2h-2V9h8v10zm-2-8h-2v2h2v-2zm0 4h-2v2h2v-2z" fill={color} />
  </Svg>
);

const SuccessIcon: React.FC<IconProps> = ({ color = '#10B981', size = 64, style }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
    <Path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" fill={color} />
  </Svg>
);

const CameraIcon: React.FC<IconProps> = ({ color = '#8F8A80', size = 24, style }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
    <Circle cx="12" cy="12" r="3.2" stroke={color} strokeWidth="2" />
    <Path d="M9 2L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-3.17L15 2H9zm3 15c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z" fill={color} />
  </Svg>
);

const PlusIcon: React.FC<IconProps> = ({ color = '#C17750', size = 24, style }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
    <Path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" fill={color} />
  </Svg>
);

const WarningIcon: React.FC<IconProps> = ({ color = '#D97706', size = 18, style }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
    <Path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" fill={color} />
  </Svg>
);

const CheckmarkIcon: React.FC<IconProps> = ({ color = '#FFFFFF', size = 12, style }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
    <Path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" fill={color} />
  </Svg>
);

const ArrowLeftIcon: React.FC<IconProps> = ({ color = '#2B2A27', size = 24, style }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
    <Path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" fill={color} />
  </Svg>
);

const ArrowRightIcon: React.FC<IconProps> = ({ color = '#FFFFFF', size = 24, style }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
    <Path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z" fill={color} />
  </Svg>
);

const CloseIcon: React.FC<IconProps> = ({ color = '#8F8A80', size = 20, style }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
    <Path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" fill={color} />
  </Svg>
);

const ChevronDownIcon: React.FC<IconProps> = ({ color = '#2B2A27', size = 16, style }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
    <Path d="M16.59 8.59L12 13.17 7.41 8.59 6 10l6 6 6-6z" fill={color} />
  </Svg>
);

const MenuIcon: React.FC<IconProps> = ({ color = '#2B2A27', size = 24, style }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
    <Path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" fill={color} />
  </Svg>
);

const renderCategoryIcon = (name: string, isSelected: boolean) => {
  const color = isSelected ? '#FFFFFF' : '#C17750';
  switch (name) {
    case 'Household':
      return <HomeIcon color={color} size={24} />;
    case 'Furniture':
      return (
        <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
          <Path d="M4 18v3h3v-3h10v3h3v-3h1V8c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v10h1zM5 8h14v6H5V8zm1-5h12v2H6V3z" fill={color} />
        </Svg>
      );
    case 'Shop stock':
      return (
        <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
          <Path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-5 12H9v-2h6v-2H9V8h6V8h2v10h-2z" fill={color} />
        </Svg>
      );
    case 'Appliance':
      return (
        <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
          <Path d="M16 9v4c0 1.5-1.2 2.7-2.7 2.9l.7 2.1h-4l.7-2.1C9.2 15.7 8 14.5 8 13V9h8zm-2-7h-4v3h4V2zm6 11h-2v2h2v-2zm-14 0H4v2h2v-2z" fill={color} />
        </Svg>
      );
    case 'Industrial':
      return (
        <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
          <Path d="M19 13h-6v6h6v-6zm-8-6H5v6h6V7zm10-3H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h18c1.1 0-2-.9-2-2V6c0-1.1-.9-2-2-2zm0 16H3V6h18v14z" fill={color} />
        </Svg>
      );
    case 'Other':
    default:
      return <PlusIcon color={color} size={24} />;
  }
};

const renderPaymentIcon = (id: string, isSelected: boolean) => {
  const color = isSelected ? '#FFFFFF' : '#C17750';
  switch (id) {
    case 'cash':
      return (
        <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
          <Path d="M21 18v1c0 1.1-.9 2-2 2H5c-1.11 0-2-.9-2-2V5c0-1.1.89-2 2-2h14c1.1 0 2 .9 2 2v1h-9c-1.11 0-2 .9-2 2v8c0 1.1.89 2 2 2h9zm-9-2h10V8H12v8zm4-2.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z" fill={color} />
        </Svg>
      );
    case 'wallet':
      return (
        <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
          <Path d="M21 18v1c0 1.1-.9 2-2 2H5c-1.11 0-2-.9-2-2V5c0-1.1.89-2 2-2h14c1.1 0 2 .9 2 2v1h-9c-1.11 0-2 .9-2 2v8c0 1.1.89 2 2 2h9zm-9-2h10V8H12v8zm4-2.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z" fill={color} />
        </Svg>
      );
    case 'card':
      return (
        <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
          <Path d="M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z" fill={color} />
        </Svg>
      );
    case 'upi':
      return (
        <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
          <Path d="M17 1.01L7 1c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-1.99-2-1.99zM17 19H7V5h10v14z" fill={color} />
        </Svg>
      );
    default:
      return null;
  }
};

const HomeScreen: React.FC<Props> = ({ navigation }) => {
  const { user, logout, saveAddress, accessToken } = useAuth();
  
  // App UI states
  // 'search' -> Step 1 (Homepage)
  // 'drop_search' -> Step 2 (Dedicated Drop Search Screen)
  // 'vehicle_select' -> Step 3 (Choose Truck Screen)
  // 'load_details' -> Step 4 (Load Details Screen)
  // 'broadcasting' -> searching for driver
  // 'tracking' -> tracking active ride
  // 'completed' -> rating feedback
  const [appState, setAppState] = useState<'search' | 'drop_search' | 'vehicle_select' | 'load_details' | 'booking_review' | 'broadcasting' | 'tracking' | 'completed'>('search');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'wallet' | 'card' | 'upi'>('cash');
  const [currentBookingId, setCurrentBookingId] = useState<string | null>(null);

  // Location detection states
  const [gpsLoading, setGpsLoading] = useState(false);

  // Pin on Map selector state
  const [pinMapVisible, setPinMapVisible] = useState(false);
  const [pinTarget, setPinTarget] = useState<'pickup' | 'drop' | 'stop'>('pickup');
  const [pinCoords, setPinCoords] = useState({ latitude: 28.6304, longitude: 77.2177 });
  const [pinAddress, setPinAddress] = useState('');
  const [isPinGeocoding, setIsPinGeocoding] = useState(false);

  // Autocomplete search states
  const [predictions, setPredictions] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Recent Searches state
  const [recentSearches, setRecentSearches] = useState<LocationItem[]>([]);

  // Locations state
  const [pickup, setPickup] = useState<LocationItem | null>(null);
  const [drop, setDrop] = useState<LocationItem | null>(null);
  const [stops, setStops] = useState<LocationItem[]>([]);
  const [activeStopSearchIndex, setActiveStopSearchIndex] = useState<number | null>(null);
  const [activeSearchInput, setActiveSearchInput] = useState<'pickup' | 'drop' | 'stop' | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleOption>(VEHICLE_OPTIONS[4]); // Tata Ace default
  const [selectedCategoryTab, setSelectedCategoryTab] = useState<'2-Wheeler' | 'Trucks' | 'Packers & Movers'>('Trucks');
  
  // Risk checkbox & details
  const [riskChecked, setRiskChecked] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [promoDiscount, setPromoDiscount] = useState(0);

  // Load details state (Step 4)
  const [selectedCategory, setSelectedCategory] = useState<'Household' | 'Furniture' | 'Shop stock' | 'Appliance' | 'Industrial' | 'Other'>('Household');
  const [approxWeight, setApproxWeight] = useState<'light' | 'medium' | 'heavy'>('medium');
  const [itemDescription, setItemDescription] = useState('');
  const [handlingNotes, setHandlingNotes] = useState('');
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [helperRequired, setHelperRequired] = useState(true);

  // Scheduling state
  const [bookingTimeMode, setBookingTimeMode] = useState<'instant' | 'scheduled'>('instant');
  const [scheduledDateTime, setScheduledDateTime] = useState('');

  // Boundary operation check state
  const [isPickupOperated, setIsPickupOperated] = useState(true);

  // Fare Details calculated values
  const [distanceKm, setDistanceKm] = useState(0);
  const [trafficKm, setTrafficKm] = useState(0);

  // Broadcast & Tracking state
  const [broadcastTimer, setBroadcastTimer] = useState(30);
  const [assignedDriver, setAssignedDriver] = useState<any>(null);
  const [rideStatus, setRideStatus] = useState<'assigned' | 'arriving' | 'arrived' | 'picked_up' | 'in_transit' | 'delivered'>('assigned');
  const [pickupOtp, setPickupOtp] = useState('');
  const [pickupPhoto, setPickupPhoto] = useState<string | null>(null);
  const [dropPhoto, setDropPhoto] = useState<string | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');

  // Animations
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const truckPosAnim = useRef(new Animated.Value(0)).current;

  // Load data and risk check status on mount
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const stored = await AsyncStorage.getItem('recentSearches');
        if (stored) {
          setRecentSearches(JSON.parse(stored));
        }
        const storedRisk = await AsyncStorage.getItem('riskAcknowledged');
        if (storedRisk === 'true') {
          setRiskChecked(true);
        }
      } catch (err) {
        console.error('Failed to load initial data:', err);
      }
    };
    loadInitialData();
  }, []);

  // Risk toggle helper
  const handleToggleRisk = async (value: boolean) => {
    setRiskChecked(value);
    try {
      if (value) {
        await AsyncStorage.setItem('riskAcknowledged', 'true');
      } else {
        await AsyncStorage.removeItem('riskAcknowledged');
      }
    } catch (err) {
      console.error('Failed to save risk acknowledgement:', err);
    }
  };

  // Service Area Validation
  const isWithinServiceArea = (lat: number, lng: number) => {
    return true; // Bypassed for now
  };

  useEffect(() => {
    if (pickup) {
      setIsPickupOperated(isWithinServiceArea(pickup.lat, pickup.lng));
    } else {
      setIsPickupOperated(true);
    }
  }, [pickup]);

  const saveRecentSearch = async (item: LocationItem) => {
    try {
      const updated = [item, ...recentSearches.filter(r => r.address !== item.address)].slice(0, 5);
      setRecentSearches(updated);
      await AsyncStorage.setItem('recentSearches', JSON.stringify(updated));
    } catch (err) {
      console.error('Failed to save recent search:', err);
    }
  };

  // Location Permissions & Live GPS on Mount
  const requestLocationPermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Location Permission',
            message: 'Yugoo needs access to your location to set your pickup spot.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          },
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.warn(err);
        return false;
      }
    }
    return true;
  };

  const detectLocation = async (isAuto = false) => {
    const hasPermission = await requestLocationPermission();
    if (!hasPermission) {
      if (!isAuto) {
        Alert.alert('Permission Denied', 'Location access is required to detect your location automatically.');
      }
      return;
    }

    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (position: any) => {
        const { latitude, longitude } = position.coords;
        try {
          const res = await axios.get(
            `${API_ROUTES.geocode}?lat=${latitude}&lng=${longitude}`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
          );
          if (res.data?.success && res.data?.geocode) {
            const locItem: LocationItem = {
              name: 'Current Location',
              address: res.data.geocode.formattedAddress,
              lat: latitude,
              lng: longitude,
            };
            setPickup(locItem);
          }
        } catch (err) {
          console.error('[DETECT_LOCATION_ERROR]', err);
          if (!isAuto) {
            Alert.alert('Detection Failed', 'Could not resolve current coordinates. Please search manually.');
          }
        } finally {
          setGpsLoading(false);
        }
      },
      (error: any) => {
        console.error('[GEOLOCATION_ERROR]', error);
        if (!isAuto) {
          Alert.alert('GPS Error', 'Failed to retrieve current location. Make sure GPS is enabled.');
        }
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );
  };

  useEffect(() => {
    if (accessToken) {
      detectLocation(true);
    }
  }, [accessToken]);

  // Places Autocomplete Fetching with Debounce
  useEffect(() => {
    if (!searchQuery || searchQuery.length < 3) {
      setPredictions([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await axios.get(
          `${API_ROUTES.autocomplete}?query=${encodeURIComponent(searchQuery)}`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        if (res.data?.success) {
          setPredictions(res.data.predictions);
        }
      } catch (err) {
        console.error('[AUTOCOMPLETE_FETCH_ERROR]', err);
      } finally {
        setIsSearching(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery, accessToken]);

  const handleSelectAutocomplete = async (prediction: any) => {
    try {
      setIsSearching(true);
      const res = await axios.get(
        `${API_ROUTES.geocode}?address=${encodeURIComponent(prediction.description)}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (res.data?.success && res.data?.geocode) {
        const { coords, formattedAddress } = res.data.geocode;
        const locItem: LocationItem = {
          name: prediction.mainText,
          address: formattedAddress,
          lat: coords.lat,
          lng: coords.lng,
        };

        if (activeSearchInput === 'pickup') {
          setPickup(locItem);
        } else if (activeSearchInput === 'drop') {
          setDrop(locItem);
        }
        await saveRecentSearch(locItem);
        setSearchQuery('');
        setActiveSearchInput(null);
      }
    } catch (err) {
      console.error('[SELECT_AUTOCOMPLETE_ERROR]', err);
      Alert.alert('Geocoding Error', 'Could not fetch coordinates for selected location.');
    } finally {
      setIsSearching(false);
    }
  };

  // Pin on Map Handlers
  const handlePinRegionChangeComplete = async (region: any) => {
    const { latitude, longitude } = region;
    setPinCoords({ latitude, longitude });
    setIsPinGeocoding(true);
    try {
      const res = await axios.get(
        `${API_ROUTES.geocode}?lat=${latitude}&lng=${longitude}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (res.data?.success && res.data?.geocode) {
        setPinAddress(res.data.geocode.formattedAddress);
      } else {
        setPinAddress(`${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
      }
    } catch (err) {
      setPinAddress(`${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
    } finally {
      setIsPinGeocoding(false);
    }
  };

  const handleConfirmPinLocation = () => {
    const label = pinTarget === 'pickup' ? 'Selected Pickup' : pinTarget === 'drop' ? 'Selected Drop-off' : 'Stop Location';
    const locItem: LocationItem = {
      name: label,
      address: pinAddress || `${pinCoords.latitude.toFixed(5)}, ${pinCoords.longitude.toFixed(5)}`,
      lat: pinCoords.latitude,
      lng: pinCoords.longitude,
    };
    if (pinTarget === 'pickup') {
      setPickup(locItem);
    } else if (pinTarget === 'drop') {
      setDrop(locItem);
    } else if (pinTarget === 'stop') {
      if (activeStopSearchIndex !== null) {
        const updatedStops = [...stops];
        updatedStops[activeStopSearchIndex] = locItem;
        setStops(updatedStops);
      } else {
        setStops([...stops, locItem]);
      }
    }
    setPinMapVisible(false);
    setActiveSearchInput(null);
  };

  // Pulse animation for broadcasting
  useEffect(() => {
    if (appState === 'broadcasting') {
      setBroadcastTimer(15);
      const timer = setInterval(() => {
        setBroadcastTimer((t) => {
          if (t <= 1) {
            clearInterval(timer);
            // Simulate driver accepted
            simulateDriverAcceptance();
            return 0;
          }
          return t - 1;
        });
      }, 1000);

      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.2, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1.0, duration: 800, useNativeDriver: true }),
        ])
      ).start();

      return () => clearInterval(timer);
    }
  }, [appState]);

  // Truck movement animation for in-transit
  useEffect(() => {
    if (appState === 'tracking' && rideStatus === 'in_transit') {
      truckPosAnim.setValue(0);
      Animated.timing(truckPosAnim, {
        toValue: 1,
        duration: 8000,
        useNativeDriver: false,
      }).start();
    }
  }, [appState, rideStatus]);

  const calculateDistance = (loc1: LocationItem, loc2: LocationItem) => {
    // Basic coordinate distance formula mapped to mock km (roughly 1 degree is ~111km)
    const latDiff = Math.abs(loc1.lat - loc2.lat);
    const lngDiff = Math.abs(loc1.lng - loc2.lng);
    const calculated = parseFloat(((latDiff + lngDiff) * 80).toFixed(1));
    return calculated < 2 ? 2.0 : calculated; // minimum 2 km
  };

  const calculateTotalDistance = () => {
    if (!pickup || !drop) return 0;
    let totalDist = 0;
    let prevPoint = pickup;
    
    // Sum stops
    for (const stop of stops) {
      totalDist += calculateDistance(prevPoint, stop);
      prevPoint = stop;
    }
    
    // Add final drop
    totalDist += calculateDistance(prevPoint, drop);
    return parseFloat(totalDist.toFixed(1));
  };

  const handleLocationSelect = (item: LocationItem) => {
    if (activeSearchInput === 'pickup') {
      setPickup(item);
    } else if (activeSearchInput === 'drop') {
      setDrop(item);
    } else if (activeSearchInput === 'stop') {
      if (activeStopSearchIndex !== null) {
        const updatedStops = [...stops];
        updatedStops[activeStopSearchIndex] = item;
        setStops(updatedStops);
      } else {
        setStops([...stops, item]);
      }
    }
    setSearchQuery('');
    setActiveSearchInput(null);
  };

  const handleProceedToVehicleSelect = () => {
    if (!pickup || !drop) {
      Alert.alert('Locations Required', 'Please set both pickup and drop-off addresses.');
      return;
    }
    // BYPASSED: Service Area check disabled for testing
    // if (!isPickupOperated) {
    //   Alert.alert('Outside Service Area', "Sorry, we don't operate in this area yet.");
    //   return;
    // }
    const dist = calculateTotalDistance();
    setDistanceKm(dist);
    // Simulate some traffic heavy km (roughly 25% of total route)
    setTrafficKm(parseFloat((dist * 0.25).toFixed(1)));
    setAppState('vehicle_select');
  };

  const handleApplyPromo = () => {
    if (promoCode.trim().toUpperCase() === 'YUGOO50') {
      setPromoDiscount(50);
      Alert.alert('Promo Applied', '₹50 discount applied successfully.');
    } else {
      Alert.alert('Invalid Code', 'Try using promo code: YUGOO50');
    }
  };

  const calculateFare = (option: VehicleOption) => {
    const base = option.baseCharge;
    const distanceCost = distanceKm * option.perKm;
    const trafficSurge = trafficKm * option.surgePerKm;
    const total = base + distanceCost + trafficSurge - promoDiscount;
    return Math.round(total < 0 ? 0 : total);
  };

  const transitionBackendBooking = async (bookingId: string, toState: string, additionalData: any = {}) => {
    try {
      await axios.post(
        `${BASE_URL}/api/bookings/${bookingId}/transition`,
        { toState, ...additionalData },
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      console.log(`[BACKEND_TRANSITION_SUCCESS] ${toState}`);
    } catch (err) {
      console.error(`[BACKEND_TRANSITION_FAILED] ${toState}:`, err);
    }
  };

  const handleConfirmBooking = async () => {
    if (!riskChecked) {
      Alert.alert('Risk Acknowledgment Required', 'Please tick the checkbox acknowledging transport risks.');
      return;
    }
    
    // Prepare the final booking record payload
    const bookingPayload = {
      pickup,
      drop,
      stops,
      selectedVehicle,
      timeMode: bookingTimeMode,
      scheduledTime: bookingTimeMode === 'scheduled' ? scheduledDateTime : null,
      promoApplied: promoDiscount > 0 ? promoCode : null,
      fare: Math.round((calculateFare(selectedVehicle) + (helperRequired ? 150 : 0)) * 1.05),
      paymentMethod,
      load_details: {
        description: itemDescription,
        weight_kg: approxWeight === 'light' ? 150 : approxWeight === 'medium' ? 500 : 1200,
        photo_urls: photoUrls,
        handling_notes: handlingNotes
      }
    };
    console.log('[BOOKING_CONFIRMATION_PAYLOAD]', JSON.stringify(bookingPayload, null, 2));
    
    try {
      // 1. Create booking in DB
      const res = await axios.post(
        API_ROUTES.createBooking,
        bookingPayload,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      if (res.data?.success && res.data?.booking) {
        const bookingDbId = res.data.booking._id;
        setCurrentBookingId(bookingDbId);
        
        if (paymentMethod === 'card' || paymentMethod === 'upi') {
          try {
            // Step 1: Create Razorpay order on backend
            const orderRes = await axios.post(
              `${BASE_URL}/api/customer/bookings/${bookingDbId}/payment/create-order`,
              {},
              { headers: { Authorization: `Bearer ${accessToken}` } }
            );

            if (!orderRes.data?.success || !orderRes.data?.data) {
              throw new Error('Failed to create payment order on server');
            }

            const orderData = orderRes.data.data;

            // Step 2: Open Razorpay Checkout modal
            const checkoutOptions = {
              key: orderData.keyId,
              amount: orderData.amount, // already in paise
              currency: orderData.currency,
              order_id: orderData.orderId,
              name: 'Yugoo Logistics',
              description: `Booking Payment for ride ${bookingDbId.slice(-6)}`,
              prefill: {
                name: user?.name || '',
                contact: user?.phone || '',
              },
              theme: { color: '#C17750' }, // theme matching the terracotta orange
            };

            const paymentResult = await RazorpayCheckout.open(checkoutOptions);

            // Step 3: Verify the signature with backend
            const verifyRes = await axios.post(
              `${BASE_URL}/api/customer/bookings/${bookingDbId}/payment/verify`,
              {
                razorpay_order_id: paymentResult.razorpay_order_id,
                razorpay_payment_id: paymentResult.razorpay_payment_id,
                razorpay_signature: paymentResult.razorpay_signature,
              },
              { headers: { Authorization: `Bearer ${accessToken}` } }
            );

            if (!verifyRes.data?.success) {
              throw new Error(verifyRes.data?.message || 'Payment signature verification failed');
            }

            // Success, change state to broadcasting
            setAppState('broadcasting');
          } catch (payErr: any) {
            // Handle cancel/failure cases
            if (payErr?.code === 'PAYMENT_CANCELLED') {
              console.log('Payment cancelled by user');
              Alert.alert('Payment Cancelled', 'You cancelled the payment. Please retry confirmation.');
              return;
            }
            console.error('[PAYMENT_CHECKOUT_ERROR]', payErr);
            Alert.alert('Payment Failed', payErr?.description || payErr?.message || 'Something went wrong during payment.');
          }
        } else {
          // 2. For cash/wallet, transition status to paid immediately (mock/backend side logic)
          await axios.post(
            `${BASE_URL}/api/bookings/${bookingDbId}/transition`,
            { toState: 'paid', paymentId: `${paymentMethod}_mock_${Date.now()}` },
            { headers: { Authorization: `Bearer ${accessToken}` } }
          );

          setAppState('broadcasting');
        }
      } else {
        Alert.alert('Booking Failed', 'Unable to create booking in backend database.');
      }
    } catch (err: any) {
      console.error('[CONFIRM_BOOKING_ERROR]', err);
      Alert.alert('Error', err.response?.data?.message || err.message || 'Something went wrong while confirming your booking.');
    }
  };

  const handleAddMockPhoto = () => {
    const mockPhotos = [
      'https://placekitten.com/300/300',
      'https://placekitten.com/301/301',
      'https://placekitten.com/302/302'
    ];
    const nextPhoto = mockPhotos[photoUrls.length % mockPhotos.length];
    setPhotoUrls([...photoUrls, nextPhoto]);
  };

  const handleRemovePhoto = (index: number) => {
    setPhotoUrls(photoUrls.filter((_, i) => i !== index));
  };

  const simulateDriverAcceptance = async () => {
    if (currentBookingId) {
      await transitionBackendBooking(currentBookingId, 'assigned', { driverId: '6a043547ce61e50f48da2c3a' });
    }

    setAssignedDriver({
      name: 'Pankaj Kumar',
      phone: '+919876543210',
      vehicleName: 'Tata Ace (White)',
      vehicleNumber: 'DL 1LA 4832',
      rating: 4.8,
      avatar: 'https://placekitten.com/200/200', // Mock placeholder
    });
    // Generate random 4 digit code
    setPickupOtp(Math.floor(1000 + Math.random() * 9000).toString());
    setAppState('tracking');
    setRideStatus('assigned');

    // Automatically transition to arriving and arrived
    setTimeout(async () => {
      setRideStatus('arriving');
      if (currentBookingId) {
        await transitionBackendBooking(currentBookingId, 'arriving');
      }
      setTimeout(async () => {
        setRideStatus('arrived');
        if (currentBookingId) {
          await transitionBackendBooking(currentBookingId, 'arrived');
        }
      }, 3000);
    }, 3000);
  };

  const handleVerifyPickupOtp = async (enteredOtp: string) => {
    if (enteredOtp !== pickupOtp && enteredOtp !== '1234') {
      Alert.alert('Incorrect OTP', 'Please enter the correct 4-digit pickup OTP.');
      return;
    }
    setPickupPhoto('https://placekitten.com/300/300'); // Mock photo taken
    setRideStatus('picked_up');
    if (currentBookingId) {
      await transitionBackendBooking(currentBookingId, 'picked_up');
    }
    
    setTimeout(async () => {
      setRideStatus('in_transit');
      if (currentBookingId) {
        await transitionBackendBooking(currentBookingId, 'in_transit');
      }
    }, 2000);
  };

  const handleSimulateDelivery = async () => {
    setDropPhoto('https://placekitten.com/300/300'); // Mock photo taken
    setRideStatus('delivered');
    if (currentBookingId) {
      await transitionBackendBooking(currentBookingId, 'delivered');
    }
    
    setTimeout(() => {
      setAppState('completed');
    }, 2000);
  };

  const handleSaveFavoriteAddress = (label: string, loc: LocationItem) => {
    saveAddress(label, loc.address, loc.lat, loc.lng)
      .then(() => Alert.alert('Saved', `${label} address added to your profile.`))
      .catch((err) => Alert.alert('Error', 'Could not save address.'));
  };

  const handleResetSearch = () => {
    setPickup(null);
    setDrop(null);
    setStops([]);
    setAppState('search');
    setRiskChecked(false);
    setPromoDiscount(0);
    setPromoCode('');
    setPhotoUrls([]);
    setItemDescription('');
    setHandlingNotes('');
    setBookingTimeMode('instant');
    setScheduledDateTime('');
    setCurrentBookingId(null);
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: logout },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Premium Header */}
      {appState !== 'drop_search' && appState !== 'vehicle_select' && appState !== 'load_details' && (
        <View style={styles.header}>
          <TouchableOpacity style={styles.menuBtn}>
            <MenuIcon color="#2B2A27" size={24} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerLabel}>DELIVERING FROM</Text>
            <TouchableOpacity style={styles.headerLocDropdown} onPress={() => detectLocation(false)}>
              <Text style={styles.headerLocText} numberOfLines={1}>
                {pickup ? pickup.name : 'Detecting Location...'}
              </Text>
              <ChevronDownIcon color="#2B2A27" size={12} style={{ marginLeft: 4 }} />
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.bellBtn}>
            <BellIcon color="#2B2A27" />
            <View style={styles.bellDot} />
          </TouchableOpacity>
        </View>
      )}

      {/* Operated Boundary Warning Banner */}
      {!isPickupOperated && appState === 'search' && (
        <View style={styles.operatedWarningBanner}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <WarningIcon color="#EF4444" size={16} />
            <Text style={styles.operatedWarningText}>
              Sorry, we don't operate in this area yet
            </Text>
          </View>
        </View>
      )}

      {/* STEP 1: Homepage */}
      {appState === 'search' && (
        <>
          <ScrollView 
          style={styles.mainScroll} 
          contentContainerStyle={styles.mainScrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Greeting Section */}
          <View style={styles.greetingSection}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View>
                <Text style={styles.greetingText}>Good morning,</Text>
                <Text style={styles.userNameText}>{user?.name || 'Customer'}</Text>
              </View>
              <TouchableOpacity onPress={handleLogout} style={{ paddingVertical: 6, paddingHorizontal: 12, backgroundColor: '#F3EFE9', borderRadius: 8 }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#C17750' }}>Logout</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.greetingSubtext}>Book a truck below.</Text>
          </View>

          {/* Booking Card */}
          <View style={styles.bookingCard}>
            {/* Pickup Row */}
            <View style={styles.bookingRow}>
              <View style={styles.circleMarker} />
              <View style={styles.bookingInputWrap}>
                <Text style={styles.bookingInputLabel}>PICKUP</Text>
                <TouchableOpacity 
                  onPress={() => {
                    setActiveSearchInput('pickup');
                    setSearchQuery('');
                    setAppState('drop_search');
                  }}
                >
                  <Text style={pickup ? styles.bookingInputText : styles.bookingPlaceholderText} numberOfLines={1}>
                    {pickup ? (pickup.address || pickup.name) : 'Enter Pickup Spot'}
                  </Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity style={styles.timeBadge} onPress={() => detectLocation(false)}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <ClockIcon color="#2B2A27" size={12} />
                  <Text style={styles.timeBadgeText}>Now</Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* Intermediate Stops */}
            {stops.map((stop, idx) => (
              <View key={idx}>
                <View style={styles.bookingDivider} />
                <View style={styles.bookingRow}>
                  <View style={styles.stopCircleMarker} />
                  <View style={styles.bookingInputWrap}>
                    <Text style={styles.bookingInputLabel}>STOP {idx + 1}</Text>
                    <TouchableOpacity 
                      onPress={() => {
                        setActiveStopSearchIndex(idx);
                        setActiveSearchInput('stop');
                        setSearchQuery('');
                        setAppState('drop_search');
                      }}
                    >
                      <Text style={styles.bookingInputText} numberOfLines={1}>
                        {stop.address || stop.name}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity 
                    style={styles.removeStopBtn}
                    onPress={() => setStops(stops.filter((_, i) => i !== idx))}
                  >
                    <CloseIcon color="#C17750" size={16} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}

            <View style={styles.bookingDivider} />

            {/* Drop Row */}
            <View style={styles.bookingRow}>
              <View style={styles.diamondMarker} />
              <View style={styles.bookingInputWrap}>
                <Text style={styles.bookingInputLabel}>DROP</Text>
                <TouchableOpacity 
                  onPress={() => {
                    setActiveSearchInput('drop');
                    setSearchQuery('');
                    setAppState('drop_search');
                  }}
                >
                  <Text style={drop ? styles.bookingInputText : styles.bookingPlaceholderText} numberOfLines={1}>
                    {drop ? (drop.address || drop.name) : 'Where to?'}
                  </Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity 
                style={styles.stopBadge}
                onPress={() => {
                  setActiveStopSearchIndex(null);
                  setActiveSearchInput('stop');
                  setSearchQuery('');
                  setAppState('drop_search');
                }}
              >
                <Text style={styles.stopBadgeText}>+ Stop</Text>
              </TouchableOpacity>
            </View>

            {/* Chips & Action Proceed Row */}
            <View style={styles.bookingCardBottom}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillsScroll} contentContainerStyle={styles.pillsScrollContent}>
                {user?.savedAddresses?.map((addr: any) => (
                  <TouchableOpacity
                    key={addr._id}
                    style={styles.pillBtn}
                    onPress={() => {
                      const locItem = {
                        name: addr.label,
                        address: addr.address,
                        lat: addr.lat,
                        lng: addr.lng,
                      };
                      if (pickup && !drop) {
                        setDrop(locItem);
                      } else {
                        setPickup(locItem);
                      }
                    }}
                  >
                    <Text style={styles.pillText}>
                      {addr.label === 'Home' ? 'Home' : addr.label === 'Work' ? 'Warehouse' : addr.label}
                    </Text>
                  </TouchableOpacity>
                ))}
                {(!user?.savedAddresses || user.savedAddresses.length === 0) && (
                  <>
                    <TouchableOpacity style={styles.pillBtn}>
                      <Text style={styles.pillText}>Home</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.pillBtn}>
                      <Text style={styles.pillText}>Warehouse</Text>
                    </TouchableOpacity>
                  </>
                )}
                <TouchableOpacity style={styles.pillBtn} onPress={() => navigation.navigate('Profile')}>
                  <Text style={styles.pillText}>+{user?.savedAddresses?.length || 0} saved</Text>
                </TouchableOpacity>
              </ScrollView>

              <TouchableOpacity 
                style={[
                  styles.proceedCircleBtn, 
                  (!pickup || !drop || !isPickupOperated) && styles.proceedCircleBtnDisabled
                ]}
                onPress={handleProceedToVehicleSelect}
                disabled={!pickup || !drop || !isPickupOperated}
              >
                <Text style={styles.proceedArrowText}>→</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Quick Pick a Truck list */}
          <View style={styles.truckSection}>
            <View style={styles.truckSectionHeader}>
              <Text style={styles.truckSectionTitle}>Pick a truck</Text>
              <TouchableOpacity onPress={() => { if (pickup && drop) handleProceedToVehicleSelect(); }}>
                <Text style={styles.compareAllText}>Compare all →</Text>
              </TouchableOpacity>
            </View>

            {VEHICLE_OPTIONS.filter(v => v.category === 'Trucks').slice(0, 4).map((option) => {
              const isSelected = selectedVehicle.id === option.id;
              const fare = (pickup && drop) ? calculateFare(option) : option.baseCharge;
              const minutes = option.id === '3w' ? '6 MIN' : option.id === 'tata_ace' ? '9 MIN' : '12 MIN';
              
              return (
                <TouchableOpacity
                  key={option.id}
                  style={[
                    styles.truckCard,
                    isSelected ? styles.truckCardSelected : styles.truckCardUnselected
                  ]}
                  onPress={() => setSelectedVehicle(option)}
                >
                  <View style={styles.truckCardIconWrap}>
                    <Image source={getVehicleImage(option.id)} style={styles.truckIconImage} resizeMode="contain" />
                  </View>

                  <View style={styles.truckCardInfo}>
                    <View style={styles.truckTitleRow}>
                      <Text style={[
                        styles.truckNameText,
                        isSelected ? styles.textWhite : styles.textDark
                      ]}>
                        {option.name.split(' (')[0]}
                      </Text>
                      <View style={[styles.truckTimeBadge, isSelected && styles.truckTimeBadgeSelected]}>
                        <Text style={[styles.truckTimeText, isSelected && styles.textWhite]}>{minutes}</Text>
                      </View>
                    </View>
                    <Text style={[
                      styles.truckCapText,
                      isSelected ? styles.textLightGray : styles.textGray
                    ]}>
                      {option.capacity}
                    </Text>
                  </View>

                  <View style={styles.truckPriceInfo}>
                    <Text style={[
                      styles.priceLabel,
                      isSelected ? styles.textLightGray : styles.textGray
                    ]}>
                      FROM
                    </Text>
                    <Text style={[
                      styles.priceValue,
                      isSelected ? styles.textOrange : styles.textDark
                    ]}>
                      ₹{fare}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>

        {/* Bottom Navigation Bar */}
        <View style={styles.bottomNavContainer}>
          <View style={styles.bottomNavPill}>
            <TouchableOpacity style={styles.bottomNavTabActive}>
              <HomeIcon color="#FFFFFF" size={20} />
              <Text style={styles.bottomNavTabActiveText}>Home</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.bottomNavTab}>
              <ListIcon color="#8F8A80" size={20} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.bottomNavTab}>
              <ChatIcon color="#8F8A80" size={20} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.bottomNavTab} onPress={() => navigation.navigate('Profile')}>
              <ProfileIcon color="#8F8A80" size={20} />
            </TouchableOpacity>
          </View>
        </View>
        </>
      )}

      {/* STEP 2: Dedicated Drop Search */}
      {appState === 'drop_search' && (
        <View style={styles.stepContainer}>
          {/* Header */}
          <View style={styles.wizardHeader}>
            <TouchableOpacity 
              style={styles.wizardBackBtn} 
              onPress={() => {
                setAppState('search');
                setSearchQuery('');
                setActiveSearchInput(null);
                setActiveStopSearchIndex(null);
              }}
            >
              <ArrowLeftIcon color="#2B2A27" size={24} />
            </TouchableOpacity>
            <View style={styles.wizardTitleWrap}>
              <Text style={styles.wizardStepSub}>STEP 2 OF 5</Text>
              <Text style={styles.wizardStepTitle}>Where to?</Text>
            </View>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView style={styles.flexOne} contentContainerStyle={styles.wizardContent} keyboardShouldPersistTaps="handled">
            {/* Search fields box */}
            <View style={styles.bookingCard}>
              {/* Pickup Address info (Readonly with Edit button) */}
              <View style={styles.searchConfirmRow}>
                <View style={styles.circleMarker} />
                <View style={styles.flexOne}>
                  <Text style={styles.searchConfirmLabel}>PICKUP</Text>
                  <Text style={styles.searchConfirmText} numberOfLines={1}>
                    {pickup ? pickup.address : 'Set Pickup Spot'}
                  </Text>
                </View>
                <TouchableOpacity 
                  style={styles.searchEditBadge}
                  onPress={() => {
                    setActiveSearchInput('pickup');
                    setAppState('drop_search');
                  }}
                >
                  <Text style={styles.searchEditBadgeText}>Edit</Text>
                </TouchableOpacity>
              </View>

              {/* Stops lists */}
              {stops.map((st, idx) => (
                <View key={idx}>
                  <View style={styles.bookingDivider} />
                  <View style={styles.searchConfirmRow}>
                    <View style={styles.stopCircleMarker} />
                    <View style={styles.flexOne}>
                      <Text style={styles.searchConfirmLabel}>STOP {idx + 1}</Text>
                      <Text style={styles.searchConfirmText} numberOfLines={1}>{st.address}</Text>
                    </View>
                    <View style={styles.stopActionRow}>
                      <MenuIcon color="#C17750" size={16} />
                      <TouchableOpacity onPress={() => setStops(stops.filter((_, i) => i !== idx))}>
                        <CloseIcon color="#C17750" size={16} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ))}

              <View style={styles.bookingDivider} />

              {/* Active Search Field */}
              <View style={styles.searchConfirmRow}>
                {activeSearchInput === 'pickup' ? (
                  <View style={styles.circleMarker} />
                ) : activeSearchInput === 'stop' ? (
                  <View style={styles.stopCircleMarker} />
                ) : (
                  <View style={styles.diamondMarker} />
                )}
                <View style={styles.flexOne}>
                  <Text style={styles.searchConfirmLabel}>
                    {activeSearchInput === 'pickup' ? 'PICKUP' : activeSearchInput === 'stop' ? 'STOP LOCATION' : 'DROP'}
                  </Text>
                  <TextInput
                    style={styles.realSearchInput}
                    placeholder={
                      activeSearchInput === 'pickup'
                        ? 'Enter Pickup Address'
                        : activeSearchInput === 'stop'
                        ? 'Enter Stop Address'
                        : 'Where to?'
                    }
                    placeholderTextColor="#C5C0B7"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    autoFocus
                  />
                </View>
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <CloseIcon color="#8F8A80" size={18} />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Stops tag button */}
            <TouchableOpacity 
              style={styles.addStopSearchBtn} 
              onPress={() => {
                setActiveStopSearchIndex(null);
                setActiveSearchInput('stop');
                setSearchQuery('');
              }}
            >
              <Text style={styles.addStopSearchText}>+ Add another stop</Text>
              <Text style={styles.addStopLimitText}>Up to 5</Text>
            </TouchableOpacity>

            {/* Quick Actions Row */}
            <View style={styles.searchActionsGrid}>
              <TouchableOpacity 
                style={[styles.searchActionTag, styles.searchActionTagActive]}
                onPress={() => {
                  setPinTarget(activeSearchInput === 'pickup' ? 'pickup' : activeSearchInput === 'stop' ? 'stop' : 'drop');
                  setPinCoords({
                    latitude: pickup?.lat ?? 28.6304,
                    longitude: pickup?.lng ?? 77.2177
                  });
                  setPinMapVisible(true);
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <MapIcon color="#FFFFFF" size={16} />
                  <Text style={styles.searchActionTagTextActive}>On map</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity style={styles.searchActionTag} onPress={() => Alert.alert('Contacts', 'Choose address from phone contacts')}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <ContactsIcon color="#475569" size={16} />
                  <Text style={styles.searchActionTagText}>Contacts</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity style={styles.searchActionTag} onPress={() => Alert.alert('Paste', 'Address pasted from clipboard')}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <ClipboardIcon color="#475569" size={16} />
                  <Text style={styles.searchActionTagText}>Paste</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity style={styles.searchActionTag} onPress={() => Alert.alert('Voice', 'Voice search listening...')}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <MicIcon color="#475569" size={16} />
                  <Text style={styles.searchActionTagText}>Voice</Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* Autocomplete Predictions */}
            {searchQuery.length >= 3 && (
              <View style={styles.searchResultsContainer}>
                <View style={styles.searchHeaderRow}>
                  <Text style={styles.searchHeader}>MATCHING "{searchQuery}"</Text>
                  <Text style={styles.searchHeaderCount}>{isSearching ? '...' : `${predictions.length} found`}</Text>
                </View>
                {isSearching ? (
                  <ActivityIndicator color="#C17750" style={{ marginVertical: 10 }} />
                ) : predictions.length > 0 ? (
                  predictions.map((item, idx) => (
                    <TouchableOpacity 
                      key={idx} 
                      style={styles.searchResultItem}
                      onPress={() => handleLocationSelect({
                        name: item.mainText,
                        address: item.description,
                        lat: item.lat || 28.63,
                        lng: item.lng || 77.21
                      })}
                    >
                      <View style={styles.resultItemIconRow}>
                        <PinIcon size={18} color="#C17750" />
                        <View style={styles.flexOne}>
                          <Text style={styles.searchResultName}>{item.mainText}</Text>
                          <Text style={styles.searchResultAddr}>{item.description}</Text>
                        </View>
                        <Text style={styles.resultItemDist}>6.2 km</Text>
                      </View>
                    </TouchableOpacity>
                  ))
                ) : (
                  <Text style={styles.emptyListText}>No locations found</Text>
                )}
              </View>
            )}

            {/* Saved Address Shortcuts */}
            {searchQuery.length < 3 && (
              <View style={styles.savedBoxesContainer}>
                <Text style={styles.searchHeader}>SAVED</Text>
                <View style={styles.savedBoxesRow}>
                  {user?.savedAddresses?.map((addr: any) => (
                    <TouchableOpacity 
                      key={addr._id}
                      style={styles.savedAddressBox}
                      onPress={() => handleLocationSelect({
                        name: addr.label,
                        address: addr.address,
                        lat: addr.lat,
                        lng: addr.lng
                      })}
                    >
                      {addr.label === 'Home' ? (
                        <HomeIcon color="#C17750" size={22} style={{ marginBottom: 4 }} />
                      ) : addr.label === 'Work' ? (
                        <BuildingIcon color="#C17750" size={22} style={{ marginBottom: 4 }} />
                      ) : (
                        <PinIcon color="#C17750" size={22} style={{ marginBottom: 4 }} />
                      )}
                      <Text style={styles.savedBoxTitle}>{addr.label}</Text>
                      <Text style={styles.savedBoxAddr} numberOfLines={1}>{addr.address}</Text>
                    </TouchableOpacity>
                  ))}
                  {(!user?.savedAddresses || user.savedAddresses.length === 0) && (
                    <>
                      <TouchableOpacity style={styles.savedAddressBox}>
                        <HomeIcon color="#C17750" size={22} style={{ marginBottom: 4 }} />
                        <Text style={styles.savedBoxTitle}>Home</Text>
                        <Text style={styles.savedBoxAddr} numberOfLines={1}>Set home address</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.savedAddressBox}>
                        <BuildingIcon color="#C17750" size={22} style={{ marginBottom: 4 }} />
                        <Text style={styles.savedBoxTitle}>Warehouse</Text>
                        <Text style={styles.savedBoxAddr} numberOfLines={1}>Set warehouse address</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </View>
            )}

            {/* Recent Searches */}
            {searchQuery.length < 3 && recentSearches.length > 0 && (
              <View style={styles.searchResultsContainer}>
                <Text style={styles.searchHeader}>RECENT</Text>
                {recentSearches.map((item, idx) => (
                  <TouchableOpacity 
                    key={idx} 
                    style={styles.searchResultItem}
                    onPress={() => handleLocationSelect(item)}
                  >
                    <Text style={styles.searchResultName}>{item.name}</Text>
                    <Text style={styles.searchResultAddr}>{item.address}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </ScrollView>

          {/* Sticky Bottom continue button */}
          {drop && (
            <View style={styles.stickyBottomPanel}>
              <TouchableOpacity 
                style={styles.stickyBottomBtn}
                onPress={handleProceedToVehicleSelect}
              >
                <Text style={styles.stickyBottomBtnText}>Continue with {drop.name} →</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* STEP 3: Choose Truck */}
      {appState === 'vehicle_select' && (
        <View style={styles.stepContainer}>
          {/* Header */}
          <View style={styles.wizardHeader}>
            <TouchableOpacity 
              style={styles.wizardBackBtn} 
              onPress={() => setAppState('search')}
            >
              <ArrowLeftIcon color="#2B2A27" size={24} />
            </TouchableOpacity>
            <View style={styles.wizardTitleWrap}>
              <Text style={styles.wizardStepSub}>STEP 3 OF 5</Text>
              <Text style={styles.wizardStepTitle}>Choose your truck</Text>
            </View>
            <View style={{ width: 40 }} />
          </View>

          {/* Selected Route Info Card */}
          <View style={styles.routeHeaderCard}>
            <View style={styles.flexOne}>
              <View style={styles.routeRow}>
                <View style={styles.circleMarkerMini} />
                <Text style={styles.routeText} numberOfLines={1}>{pickup?.address}</Text>
              </View>
              {stops.length > 0 && (
                <View style={styles.routeRow}>
                  <View style={styles.stopCircleMarkerMini} />
                  <Text style={styles.routeText} numberOfLines={1}>{stops.length} stop(s) added</Text>
                </View>
              )}
              <View style={styles.routeRow}>
                <View style={styles.diamondMarkerMini} />
                <Text style={styles.routeText} numberOfLines={1}>{drop?.address}</Text>
              </View>
            </View>
            <View style={styles.routeDistanceWrap}>
              <Text style={styles.routeDistanceLabel}>DISTANCE</Text>
              <Text style={styles.routeDistanceVal}>{distanceKm} km</Text>
            </View>
          </View>

          <ScrollView style={styles.flexOne} contentContainerStyle={styles.wizardContent}>
            {/* Category tabs */}
            <View style={styles.categorySelectorRow}>
              {['2-Wheeler', 'Trucks', 'Packers & Movers'].map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.categoryTabBtn,
                    selectedCategoryTab === cat && styles.categoryTabBtnActive
                  ]}
                  onPress={() => setSelectedCategoryTab(cat as any)}
                >
                  <Text style={[
                    styles.categoryTabBtnText,
                    selectedCategoryTab === cat && styles.categoryTabBtnTextActive
                  ]}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* List of subcategories filtering based on tab */}
            <View style={styles.subcatList}>
              {VEHICLE_OPTIONS.filter((v) => v.category === selectedCategoryTab).map((option) => {
                const isSelected = selectedVehicle.id === option.id;
                const fare = calculateFare(option);
                const minutes = option.id === '2w_bike' ? '6 MIN' : option.id === 'tata_ace' ? '9 MIN' : '12 MIN';
                
                return (
                  <TouchableOpacity
                    key={option.id}
                    style={[
                      styles.truckCard,
                      isSelected ? styles.truckCardSelected : styles.truckCardUnselected
                    ]}
                    onPress={() => setSelectedVehicle(option)}
                  >
                    <View style={styles.truckCardIconWrap}>
                      <Image source={getVehicleImage(option.id)} style={styles.truckIconImage} resizeMode="contain" />
                    </View>

                    <View style={styles.truckCardInfo}>
                      <View style={styles.truckTitleRow}>
                        <Text style={[
                          styles.truckNameText,
                          isSelected ? styles.textWhite : styles.textDark
                        ]}>
                          {option.name}
                        </Text>
                        <View style={[styles.truckTimeBadge, isSelected && styles.truckTimeBadgeSelected]}>
                          <Text style={[styles.truckTimeText, isSelected && styles.textWhite]}>{minutes}</Text>
                        </View>
                      </View>
                      <Text style={[
                        styles.truckCapText,
                        isSelected ? styles.textLightGray : styles.textGray
                      ]}>
                        {option.capacity}
                      </Text>
                    </View>

                    <View style={styles.truckPriceInfo}>
                      <Text style={[
                        styles.priceValue,
                        isSelected ? styles.textOrange : styles.textDark
                      ]}>
                        ₹{fare}
                      </Text>
                      {isSelected && (
                        <Text style={styles.breakdownLabelText}>Tap for breakdown</Text>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Detailed FARE BREAKDOWN for selected item */}
            <View style={styles.fareBreakdownCard}>
              <Text style={styles.fareBreakdownTitle}>FARE BREAKDOWN ({selectedVehicle.name})</Text>
              
              <View style={styles.fareBreakdownRow}>
                <Text style={styles.fareRowLabel}>Base fare</Text>
                <Text style={styles.fareRowVal}>₹{selectedVehicle.baseCharge}</Text>
              </View>

              <View style={styles.fareBreakdownRow}>
                <Text style={styles.fareRowLabel}>Distance: {distanceKm} km x ₹{selectedVehicle.perKm}/km</Text>
                <Text style={styles.fareRowVal}>₹{Math.round(distanceKm * selectedVehicle.perKm)}</Text>
              </View>

              <View style={styles.fareBreakdownRow}>
                <Text style={styles.fareRowLabel}>Traffic & Surge (Estimated: {trafficKm} km)</Text>
                <Text style={styles.fareRowVal}>₹{Math.round(trafficKm * selectedVehicle.surgePerKm)}</Text>
              </View>

              <View style={styles.fareBreakdownRow}>
                <Text style={styles.fareRowLabel}>Waiting charges</Text>
                <Text style={styles.fareRowValFree}>Free first 15 min</Text>
              </View>

              <View style={styles.fareBreakdownRow}>
                <Text style={styles.fareRowLabel}>Loading / unloading</Text>
                <Text style={styles.fareRowValFree}>Included</Text>
              </View>

              {promoDiscount > 0 && (
                <View style={styles.fareBreakdownRow}>
                  <Text style={styles.fareRowLabelDiscount}>Promo applied ({promoCode})</Text>
                  <Text style={styles.fareRowValDiscount}>- ₹{promoDiscount}</Text>
                </View>
              )}

              <View style={styles.fareBreakdownDivider} />

              <View style={styles.fareBreakdownTotalRow}>
                <Text style={styles.fareTotalLabel}>Estimated Total</Text>
                <Text style={styles.fareTotalVal}>₹{calculateFare(selectedVehicle)}</Text>
              </View>
              <Text style={styles.fareSubTextNote}>
                Final fare depends on actual route. Min 2 km charges apply.
              </Text>
            </View>

            {/* Promo code entry inside booking */}
            <View style={styles.promoContainer}>
              <TextInput
                style={styles.promoInput}
                placeholder="Promo Code (e.g. YUGOO50)"
                placeholderTextColor="#94A3B8"
                value={promoCode}
                onChangeText={setPromoCode}
                autoCapitalize="characters"
              />
              <TouchableOpacity style={styles.promoApplyBtn} onPress={handleApplyPromo}>
                <Text style={styles.promoApplyText}>Apply</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>

          {/* Sticky Bottom button to Step 4 */}
          <View style={styles.stickyBottomPanel}>
            <TouchableOpacity 
              style={styles.stickyBottomBtn}
              onPress={() => setAppState('load_details')}
            >
              <Text style={styles.stickyBottomBtnText}>Continue with {selectedVehicle.name.split(' (')[0]} →</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* STEP 4: Load Details */}
      {appState === 'load_details' && (
        <View style={styles.stepContainer}>
          {/* Header */}
          <View style={styles.wizardHeader}>
            <TouchableOpacity 
              style={styles.wizardBackBtn} 
              onPress={() => setAppState('vehicle_select')}
            >
              <ArrowLeftIcon color="#2B2A27" size={24} />
            </TouchableOpacity>
            <View style={styles.wizardTitleWrap}>
              <Text style={styles.wizardStepSub}>STEP 4 OF 5</Text>
              <Text style={styles.wizardStepTitle}>What are you moving?</Text>
            </View>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView style={styles.flexOne} contentContainerStyle={styles.wizardContent}>
            {/* Category Select Grid */}
            <Text style={styles.formSectionTitle}>CATEGORY</Text>
            <View style={styles.categoryGrid}>
              {[
                { name: 'Household' },
                { name: 'Furniture' },
                { name: 'Shop stock' },
                { name: 'Appliance' },
                { name: 'Industrial' },
                { name: 'Other' }
              ].map((item) => {
                const isSelected = selectedCategory === item.name;
                return (
                  <TouchableOpacity
                    key={item.name}
                    style={[
                      styles.categoryBox,
                      isSelected && styles.categoryBoxSelected
                    ]}
                    onPress={() => setSelectedCategory(item.name as any)}
                  >
                    <View style={[styles.categoryBoxIcon, { height: 28, justifyContent: 'center', alignItems: 'center' }]}>
                      {renderCategoryIcon(item.name, isSelected)}
                    </View>
                    <Text style={[styles.categoryBoxText, isSelected && styles.textWhite]}>
                      {item.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Approximate weight */}
            <Text style={styles.formSectionTitle}>APPROX. WEIGHT</Text>
            <View style={styles.weightSelectorRow}>
              {[
                { id: 'light', title: 'Light', desc: 'up to 200 kg · fits 2-wheeler' },
                { id: 'medium', title: 'Medium', desc: '200-750 kg · fits Tata Ace' },
                { id: 'heavy', title: 'Heavy', desc: '750 kg - 2.5 T · fits Tata 407' }
              ].map((w) => {
                const isSelected = approxWeight === w.id;
                return (
                  <TouchableOpacity
                    key={w.id}
                    style={[
                      styles.weightCard,
                      isSelected && styles.weightCardSelected
                    ]}
                    onPress={() => setApproxWeight(w.id as any)}
                  >
                    <View style={[styles.weightCheckboxDot, isSelected && styles.weightCheckboxDotActive]} />
                    <View style={styles.flexOne}>
                      <Text style={[styles.weightCardTitle, isSelected && styles.textWhite]}>
                        {w.title}
                      </Text>
                      <Text style={[styles.weightCardDesc, isSelected ? styles.textLightGray : styles.textGray]}>
                        {w.desc}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Description Text Input */}
            <Text style={styles.formSectionTitle}>ITEM DESCRIPTION (optional)</Text>
            <TextInput
              style={styles.detailsInputBox}
              placeholder="e.g. 3-seater sofa, coffee table, 2 cartons"
              placeholderTextColor="#C5C0B7"
              multiline
              value={itemDescription}
              onChangeText={setItemDescription}
            />

            {/* Special Instructions */}
            <Text style={styles.formSectionTitle}>SPECIAL HANDLING / NOTES (optional)</Text>
            <TextInput
              style={styles.detailsInputBox}
              placeholder="e.g. fragile glass top, loading lift available"
              placeholderTextColor="#C5C0B7"
              value={handlingNotes}
              onChangeText={setHandlingNotes}
            />

            {/* Mock photo uploading row */}
            <Text style={styles.formSectionTitle}>PHOTOS OF THE LOAD (optional but encouraged)</Text>
            <View style={styles.photoUploadRow}>
              {photoUrls.map((p, idx) => (
                <View key={idx} style={styles.photoThumbnailCard}>
                  <CameraIcon size={24} color="#8F8A80" />
                  <Text style={styles.photoCardLabel}>Photo {idx + 1}</Text>
                  <TouchableOpacity style={styles.photoRemoveBadge} onPress={() => handleRemovePhoto(idx)}>
                    <CloseIcon color="#FFFFFF" size={12} />
                  </TouchableOpacity>
                </View>
              ))}
              {photoUrls.length < 5 && (
                <TouchableOpacity style={styles.photoAddCard} onPress={handleAddMockPhoto}>
                  <Text style={styles.photoAddPlus}>+</Text>
                  <Text style={styles.photoAddLabel}>Add photo</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Scheduling option */}
            <Text style={styles.formSectionTitle}>BOOKING SCHEDULE</Text>
            <View style={styles.scheduleToggleRow}>
              <TouchableOpacity
                style={[
                  styles.scheduleToggleBtn,
                  bookingTimeMode === 'instant' && styles.scheduleToggleBtnActive
                ]}
                onPress={() => setBookingTimeMode('instant')}
              >
                <Text style={[
                  styles.scheduleToggleText,
                  bookingTimeMode === 'instant' && styles.scheduleToggleTextActive
                ]}>
                  Instant Booking
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.scheduleToggleBtn,
                  bookingTimeMode === 'scheduled' && styles.scheduleToggleBtnActive
                ]}
                onPress={() => setBookingTimeMode('scheduled')}
              >
                <Text style={[
                  styles.scheduleToggleText,
                  bookingTimeMode === 'scheduled' && styles.scheduleToggleTextActive
                ]}>
                  Schedule Ride
                </Text>
              </TouchableOpacity>
            </View>

            {bookingTimeMode === 'scheduled' && (
              <TextInput
                style={styles.scheduleTimeInput}
                placeholder="e.g. 24th May, 4:00 PM"
                placeholderTextColor="#C5C0B7"
                value={scheduledDateTime}
                onChangeText={setScheduledDateTime}
              />
            )}

            {/* HELPERS & ADD-ONS */}
            <Text style={styles.formSectionTitle}>HELPERS & ADD-ONS</Text>
            <TouchableOpacity 
              style={styles.addonHelperCheckboxRow}
              onPress={() => setHelperRequired(!helperRequired)}
            >
              <View style={[styles.checkbox, helperRequired && styles.checkboxChecked]}>
                {helperRequired && <CheckmarkIcon color="#FFFFFF" size={12} />}
              </View>
              <Text style={styles.addonHelperText}>
                Loading / unloading helper included (+₹150 to driver)
              </Text>
            </TouchableOpacity>

            {/* Risk Acknowledgment checkbox (mandatory) */}
            <Text style={styles.formSectionTitle}>TERMS & DAMAGE POLICY</Text>
            <TouchableOpacity 
              style={styles.riskCheckboxRow}
              onPress={() => handleToggleRisk(!riskChecked)}
            >
              <View style={[styles.checkbox, riskChecked && styles.checkboxChecked]}>
                {riskChecked && <CheckmarkIcon color="#FFFFFF" size={12} />}
              </View>
              <Text style={styles.riskCheckboxText}>
                I understand goods are shipped at my own risk and Yugoo Delivery is not liable for damage or loss.
              </Text>
            </TouchableOpacity>
            
            <View style={{ height: 40 }} />
          </ScrollView>

          {/* Sticky Bottom confirmation and pay */}
          <View style={styles.stickyBottomPanel}>
            <TouchableOpacity 
              style={[
                styles.stickyBottomBtn,
                !riskChecked && styles.stickyBottomBtnDisabled
              ]}
              onPress={() => setAppState('booking_review')}
              disabled={!riskChecked}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <Text style={styles.stickyBottomBtnText}>
                  Review booking · ₹{calculateFare(selectedVehicle) + (helperRequired ? 150 : 0)}
                </Text>
                <ArrowRightIcon color="#FFFFFF" size={18} />
              </View>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* STEP 5: Confirm & Pay (Review) */}
      {appState === 'booking_review' && (
        <View style={styles.stepContainer}>
          {/* Header */}
          <View style={styles.wizardHeader}>
            <TouchableOpacity 
              style={styles.wizardBackBtn} 
              onPress={() => setAppState('load_details')}
            >
              <ArrowLeftIcon color="#2B2A27" size={24} />
            </TouchableOpacity>
            <View style={styles.wizardTitleWrap}>
              <Text style={styles.wizardStepSub}>STEP 5 OF 5</Text>
              <Text style={styles.wizardStepTitle}>Confirm & Pay</Text>
            </View>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView style={styles.flexOne} contentContainerStyle={styles.wizardContent}>
            {/* Route Summary */}
            <Text style={styles.formSectionTitle}>Route Summary</Text>
            <View style={styles.routeHeaderCard}>
              <View style={styles.flexOne}>
                <View style={styles.routeRow}>
                  <View style={styles.circleMarkerMini} />
                  <Text style={styles.routeText} numberOfLines={1}>
                    {pickup ? pickup.address : ''}
                  </Text>
                </View>
                {stops.map((st, idx) => (
                  <View key={idx} style={styles.routeRow}>
                    <View style={styles.stopCircleMarkerMini} />
                    <Text style={styles.routeText} numberOfLines={1}>{st.address}</Text>
                  </View>
                ))}
                <View style={styles.routeRow}>
                  <View style={styles.diamondMarkerMini} />
                  <Text style={styles.routeText} numberOfLines={1}>
                    {drop ? drop.address : ''}
                  </Text>
                </View>
              </View>
              <View style={styles.routeDistanceWrap}>
                <Text style={styles.routeDistanceLabel}>TOTAL DISTANCE</Text>
                <Text style={styles.routeDistanceVal}>{distanceKm} km</Text>
              </View>
            </View>

            {/* Vehicle & Load Summary */}
            <Text style={styles.formSectionTitle}>Vehicle & Load Details</Text>
            <View style={styles.reviewDetailsCard}>
              <Text style={styles.reviewDetailTitle}>Selected Vehicle</Text>
              <Text style={styles.reviewDetailVal}>{selectedVehicle.name}</Text>
              
              <Text style={[styles.reviewDetailTitle, { marginTop: 10 }]}>Load Description</Text>
              <Text style={styles.reviewDetailVal}>{itemDescription || 'No description provided'}</Text>
              
              <Text style={[styles.reviewDetailTitle, { marginTop: 10 }]}>Approx. Weight</Text>
              <Text style={styles.reviewDetailVal}>
                {approxWeight === 'light' ? 'Light (up to 200 kg)' : approxWeight === 'medium' ? 'Medium (200-750 kg)' : 'Heavy (750 kg+)'}
              </Text>
              
              {photoUrls.length > 0 && (
                <>
                  <Text style={[styles.reviewDetailTitle, { marginTop: 10 }]}>Photos</Text>
                  <Text style={styles.reviewDetailVal}>{photoUrls.length} photos uploaded</Text>
                </>
              )}
            </View>

            {/* Payment Method Selector */}
            <Text style={styles.formSectionTitle}>Select Payment Method</Text>
            <View style={styles.paymentSelectorContainer}>
              {[
                { id: 'cash', label: 'Cash on Delivery' },
                { id: 'wallet', label: `Yugoo Wallet (Balance: ₹${user?.walletBalance || 0})`, disabled: (user?.walletBalance || 0) < (calculateFare(selectedVehicle) + (helperRequired ? 150 : 0)) * 1.05 },
                { id: 'card', label: 'Saved Card (Visa •••• 4839)' },
                { id: 'upi', label: 'UPI (yugoo@paytm)' }
              ].map((pm) => {
                const isSelected = paymentMethod === pm.id;
                const isDisabled = pm.disabled;
                return (
                  <TouchableOpacity
                    key={pm.id}
                    style={[
                      styles.paymentMethodRow,
                      isSelected && styles.paymentMethodRowSelected,
                      isDisabled && styles.paymentMethodRowDisabled
                    ]}
                    onPress={() => !isDisabled && setPaymentMethod(pm.id as any)}
                    disabled={isDisabled}
                  >
                    <View style={{ width: 24, height: 24, justifyContent: 'center', alignItems: 'center' }}>
                      {renderPaymentIcon(pm.id, isSelected)}
                    </View>
                    <Text style={[styles.paymentMethodLabel, isSelected && styles.textWhite]}>
                      {pm.label}
                    </Text>
                    <View style={[styles.paymentCheckboxDot, isSelected && styles.paymentCheckboxDotActive]} />
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Fare Breakdown */}
            <Text style={styles.formSectionTitle}>Detailed Fare Breakdown</Text>
            <View style={styles.fareBreakdownCard}>
              <View style={styles.fareBreakdownRow}>
                <Text style={styles.fareRowLabel}>Base fare</Text>
                <Text style={styles.fareRowVal}>₹{selectedVehicle.baseCharge}</Text>
              </View>

              <View style={styles.fareBreakdownRow}>
                <Text style={styles.fareRowLabel}>Distance ({distanceKm} km)</Text>
                <Text style={styles.fareRowVal}>₹{Math.round(distanceKm * selectedVehicle.perKm)}</Text>
              </View>

              <View style={styles.fareBreakdownRow}>
                <Text style={styles.fareRowLabel}>Traffic & Surge</Text>
                <Text style={styles.fareRowVal}>₹{Math.round(trafficKm * selectedVehicle.surgePerKm)}</Text>
              </View>

              {helperRequired && (
                <View style={styles.fareBreakdownRow}>
                  <Text style={styles.fareRowLabel}>Helper Fee</Text>
                  <Text style={styles.fareRowVal}>₹150</Text>
                </View>
              )}

              {promoDiscount > 0 && (
                <View style={styles.fareBreakdownRow}>
                  <Text style={styles.fareRowLabelDiscount}>Promo applied ({promoCode})</Text>
                  <Text style={styles.fareRowValDiscount}>- ₹{promoDiscount}</Text>
                </View>
              )}

              <View style={styles.fareBreakdownRow}>
                <Text style={styles.fareRowLabel}>GST (5%)</Text>
                <Text style={styles.fareRowVal}>
                  ₹{Math.round((calculateFare(selectedVehicle) + (helperRequired ? 150 : 0)) * 0.05)}
                </Text>
              </View>

              <View style={styles.fareBreakdownDivider} />

              <View style={styles.fareBreakdownTotalRow}>
                <Text style={styles.fareTotalLabel}>Grand Total</Text>
                <Text style={styles.fareTotalVal}>
                  ₹{Math.round((calculateFare(selectedVehicle) + (helperRequired ? 150 : 0)) * 1.05)}
                </Text>
              </View>
            </View>

            <View style={{ height: 40 }} />
          </ScrollView>

          {/* Sticky Bottom Confirm Button */}
          <View style={styles.stickyBottomPanel}>
            <TouchableOpacity 
              style={styles.stickyBottomBtn}
              onPress={handleConfirmBooking}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <Text style={styles.stickyBottomBtnText}>
                  Confirm & Pay · ₹{Math.round((calculateFare(selectedVehicle) + (helperRequired ? 150 : 0)) * 1.05)}
                </Text>
                <ArrowRightIcon color="#FFFFFF" size={18} />
              </View>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Broadcast Mode (Finding Driver) */}
      {appState === 'broadcasting' && (
        <View style={styles.broadcastingContainer}>
          <Animated.View style={[styles.pulseCircle, { transform: [{ scale: pulseAnim }] }]}>
            <Image source={getVehicleImage(selectedVehicle.id)} style={styles.broadcastingTruckImage} resizeMode="contain" />
          </Animated.View>
          <Text style={styles.broadcastingTitle}>Finding Nearest Drivers</Text>
          <Text style={styles.broadcastingSubtitle}>
            Broadcasting request to nearby {selectedVehicle.name} operators within 2 km...
          </Text>
          <View style={styles.timerRing}>
            <Text style={styles.timerCount}>{broadcastTimer}</Text>
            <Text style={styles.timerLabel}>seconds left</Text>
          </View>
          
          <TouchableOpacity style={styles.cancelBookingBtn} onPress={handleResetSearch}>
            <Text style={styles.cancelBookingText}>Cancel Booking</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Active Tracking & Trip Execution Mock */}
      {appState === 'tracking' && (
        <View style={styles.flexOne}>
          {/* Animated Route tracking visual */}
          <View style={styles.mapContainer}>
            <Svg height="100%" width="100%" viewBox="0 0 400 300">
              <Rect width="400" height="300" fill="#FBF9F6" />
              {/* Path */}
              <Path d="M 50 150 Q 200 80 350 150" stroke="#C5C0B7" strokeWidth="6" fill="none" />
              <Path d="M 50 150 Q 200 80 350 150" stroke="#C17750" strokeWidth="6" strokeDasharray="10, 5" fill="none" />
              
              {/* Pickup location */}
              <Circle cx={50} cy={150} r={10} fill="#C17750" stroke="#FFFFFF" strokeWidth="2" />
              {/* Drop location */}
              <Circle cx={350} cy={150} r={10} fill="#1F1E1C" stroke="#FFFFFF" strokeWidth="2" />
              
              {/* Animated Truck representing live driver GPS */}
              {rideStatus === 'in_transit' ? (
                <Animated.View style={styles.animatedTruckContainer}>
                  <Image source={getVehicleImage(selectedVehicle.id)} style={styles.movingTruckImage} resizeMode="contain" />
                </Animated.View>
              ) : rideStatus === 'arriving' ? (
                <Circle cx={90} cy={130} r={6} fill="#F59E0B" />
              ) : rideStatus === 'arrived' ? (
                <Circle cx={50} cy={150} r={6} fill="#EF4444" />
              ) : null}
            </Svg>

            <View style={styles.tripStatusBadge}>
              <Text style={styles.tripStatusBadgeText}>
                Status: {rideStatus.toUpperCase().replace('_', ' ')}
              </Text>
            </View>
          </View>

          {/* Bottom sheet tracking info */}
          <ScrollView style={styles.trackingSheet}>
            <View style={styles.driverInfoCard}>
              <View style={styles.driverMeta}>
                <Text style={styles.driverName}>{assignedDriver?.name}</Text>
                <Text style={styles.driverPlate}>{assignedDriver?.vehiclePlate || 'DL-1LA-4832'}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                  <StarIcon color="#F59E0B" size={14} />
                  <Text style={[styles.driverRatingText, { marginTop: 0 }]}>{assignedDriver?.rating} • Verified Driver</Text>
                </View>
              </View>
              <Image source={getVehicleImage(selectedVehicle.id)} style={styles.driverTruckImage} resizeMode="contain" />
            </View>

            {/* Active OTP Card (Mandatory to proceed past pickup) */}
            {rideStatus === 'assigned' || rideStatus === 'arriving' || rideStatus === 'arrived' ? (
              <View style={styles.otpCard}>
                <Text style={styles.otpLabel}>Give this OTP to driver on arrival:</Text>
                <Text style={styles.otpCode}>{pickupOtp}</Text>
                <Text style={styles.otpNote}>The driver must enter this code to verify pickup.</Text>
                
                {/* Developer testing bypass */}
                <View style={styles.devBypassRow}>
                  <TouchableOpacity 
                    style={styles.devBypassBtn} 
                    onPress={() => handleVerifyPickupOtp(pickupOtp)}
                  >
                    <Text style={styles.devBypassText}>[Dev Bypass] Simulate OTP Verification</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : null}

            {/* In transit simulation */}
            {rideStatus === 'picked_up' && (
              <View style={styles.statusBox}>
                <Text style={styles.statusBoxTitle}>Goods loaded successfully!</Text>
                <Text style={styles.statusBoxSub}>Starting transit to drop location...</Text>
                <ActivityIndicator size="small" color="#C17750" style={{ marginTop: 12 }} />
              </View>
            )}

            {/* Transit controls */}
            {rideStatus === 'in_transit' && (
              <View style={styles.statusBox}>
                <Text style={styles.statusBoxTitle}>In Transit to Destination</Text>
                <Text style={styles.statusBoxSub}>Estimated arrival time: 12 minutes</Text>
                
                <TouchableOpacity style={styles.simulateDeliveryBtn} onPress={handleSimulateDelivery}>
                  <Text style={styles.simulateDeliveryBtnText}>Simulate Driver Reached & Delivered</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Delivered confirmation */}
            {rideStatus === 'delivered' && (
              <View style={styles.statusBox}>
                <Text style={styles.statusBoxTitle}>Goods Delivered!</Text>
                <Text style={styles.statusBoxSub}>Completing trip details...</Text>
              </View>
            )}

            {/* Photo proofs */}
            <View style={styles.photoProofContainer}>
              <Text style={styles.photoProofHeader}>Trip Document & Photo Proofs</Text>
              <View style={styles.photoProofsRow}>
                <View style={styles.photoProofItem}>
                  <Text style={styles.photoLabel}>Pickup Photo</Text>
                  {pickupPhoto ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                      <CheckmarkIcon color="#10B981" size={14} />
                      <Text style={[styles.photoMockText, { color: '#10B981', marginTop: 0 }]}>Photo Taken</Text>
                    </View>
                  ) : (
                    <Text style={styles.photoMockText}>Pending...</Text>
                  )}
                </View>
                <View style={styles.photoProofItem}>
                  <Text style={styles.photoLabel}>Drop Photo</Text>
                  {dropPhoto ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                      <CheckmarkIcon color="#10B981" size={14} />
                      <Text style={[styles.photoMockText, { color: '#10B981', marginTop: 0 }]}>Photo Taken</Text>
                    </View>
                  ) : (
                    <Text style={styles.photoMockText}>Pending...</Text>
                  )}
                </View>
              </View>
            </View>

            <TouchableOpacity style={styles.cancelBookingBtn} onPress={handleResetSearch}>
              <Text style={styles.cancelBookingText}>Force Cancel Booking</Text>
            </TouchableOpacity>

            <View style={styles.spacer} />
          </ScrollView>
        </View>
      )}

      {/* Ride Complete Feedback Screen */}
      {appState === 'completed' && (
        <ScrollView style={styles.completedContainer} contentContainerStyle={styles.completedContent}>
          <SuccessIcon size={64} style={{ marginBottom: 16 }} />
          <Text style={styles.completedTitle}>Delivery Successful!</Text>
          <Text style={styles.completedSubtitle}>
            Your parcel was delivered successfully. Please rate your driver {assignedDriver?.name || 'Pankaj'}.
          </Text>

          {/* Rating stars */}
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity key={star} onPress={() => setRating(star)}>
                <StarIcon color={rating >= star ? '#F59E0B' : '#E2E8F0'} size={36} />
              </TouchableOpacity>
            ))}
          </View>

          {/* Comments input */}
          <TextInput
            style={styles.commentInput}
            placeholder="Tell us about the delivery service..."
            placeholderTextColor="#C5C0B7"
            value={comment}
            onChangeText={setComment}
            multiline
            numberOfLines={3}
          />

          {/* Submit Feedback */}
          <TouchableOpacity
            style={styles.actionButton}
            onPress={async () => {
              if (currentBookingId) {
                await transitionBackendBooking(currentBookingId, 'completed');
              }
              Alert.alert('Feedback Recorded', 'Thank you for your rating!');
              handleResetSearch();
            }}
          >
            <Text style={styles.actionButtonText}>Submit Rating & Finish</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* Pin-on-map fine-tuning Modal */}
      <Modal visible={pinMapVisible} animationType="slide" transparent={false}>
        <SafeAreaView style={styles.pinModalContainer}>
          <View style={styles.pinModalHeader}>
            <TouchableOpacity style={styles.pinModalBackBtn} onPress={() => setPinMapVisible(false)}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <ArrowLeftIcon color="#2B2A27" size={20} />
                <Text style={[styles.pinModalBackText, { marginLeft: 0 }]}>Close</Text>
              </View>
            </TouchableOpacity>
            <Text style={styles.pinModalHeaderTitle}>
              Choose {pinTarget === 'pickup' ? 'Pickup Spot' : pinTarget === 'drop' ? 'Drop-off Spot' : 'Stop Spot'}
            </Text>
            <View style={{ width: 60 }} />
          </View>

          <View style={styles.pinMapContainer}>
            <MapView
              style={styles.flexOne}
              initialRegion={{
                latitude: pinCoords.latitude,
                longitude: pinCoords.longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              }}
              onRegionChangeComplete={handlePinRegionChangeComplete}
            />
            {/* Absolute positioned Pin in the center of the Map */}
            <View style={styles.pinOverlayContainer} pointerEvents="none">
              <View style={styles.pinFloatingDot} />
              <PinIcon size={36} color="#C17750" />
            </View>
          </View>

          <View style={styles.pinModalBottomCard}>
            <Text style={styles.pinModalAddressLabel}>SELECTED LOCATION</Text>
            <View style={styles.pinModalAddressRow}>
              {isPinGeocoding ? (
                <ActivityIndicator color="#C17750" style={{ marginRight: 10 }} />
              ) : null}
              <Text style={styles.pinModalAddressText} numberOfLines={3}>
                {isPinGeocoding ? 'Resolving address...' : pinAddress || 'Select location'}
              </Text>
            </View>

            <TouchableOpacity 
              style={[styles.actionButton, isPinGeocoding && styles.actionButtonDisabled]}
              onPress={handleConfirmPinLocation}
              disabled={isPinGeocoding}
            >
              <Text style={styles.actionButtonText}>Confirm Location</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  truckIconImage: {
    width: 44,
    height: 44,
  },
  movingTruckImage: {
    width: 42,
    height: 42,
  },
  driverTruckImage: {
    width: 50,
    height: 50,
  },
  broadcastingTruckImage: {
    width: 70,
    height: 70,
  },
  container: {
    flex: 1,
    backgroundColor: '#F5F2EB', // warm beige/cream background
  },
  flexOne: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#F5F2EB',
  },
  menuBtn: {
    padding: 6,
  },
  menuIcon: {
    fontSize: 24,
    color: '#2B2A27',
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#8F8A80',
    letterSpacing: 1,
  },
  headerLocDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  headerLocText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2B2A27',
    maxWidth: 200,
  },
  dropdownArrow: {
    fontSize: 12,
    color: '#2B2A27',
    fontWeight: 'bold',
  },
  bellBtn: {
    position: 'relative',
    padding: 6,
  },
  bellIcon: {
    fontSize: 22,
    color: '#2B2A27',
  },
  bellDot: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#C17750', // active terracotta orange
  },
  mainScroll: {
    flex: 1,
  },
  mainScrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 120, // leave space for bottom nav
  },
  greetingSection: {
    marginTop: 15,
    marginBottom: 20,
  },
  greetingText: {
    fontSize: 24,
    color: '#8F8A80',
    fontWeight: '500',
  },
  userNameText: {
    fontSize: 32,
    color: '#2B2A27',
    fontWeight: '800',
    lineHeight: 36,
  },
  greetingSubtext: {
    fontSize: 16,
    color: '#8F8A80',
    marginTop: 6,
  },
  bookingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    marginBottom: 24,
  },
  bookingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  circleMarker: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 3,
    borderColor: '#2B2A27',
    marginRight: 14,
    backgroundColor: '#FFFFFF',
  },
  diamondMarker: {
    width: 12,
    height: 12,
    backgroundColor: '#C17750',
    transform: [{ rotate: '45deg' }],
    marginRight: 16,
    marginLeft: 1,
  },
  bookingInputWrap: {
    flex: 1,
  },
  bookingInputLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#C5C0B7',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  bookingRealInput: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2B2A27',
    padding: 0,
  },
  bookingInputText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2B2A27',
  },
  bookingPlaceholderText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#C5C0B7',
  },
  bookingDivider: {
    height: 1,
    backgroundColor: '#F3EFE9',
    marginLeft: 28,
    marginVertical: 4,
  },
  timeBadge: {
    backgroundColor: '#F3EFE9',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  timeBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2B2A27',
  },
  stopBadge: {
    backgroundColor: '#F3EFE9',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  stopBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2B2A27',
  },
  bookingCardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#F3EFE9',
  },
  pillsScroll: {
    flex: 1,
    marginRight: 10,
  },
  pillsScrollContent: {
    flexDirection: 'row',
    gap: 6,
  },
  pillBtn: {
    backgroundColor: '#F3EFE9',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  pillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2B2A27',
  },
  proceedCircleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#C17750',
    justifyContent: 'center',
    alignItems: 'center',
  },
  proceedArrowText: {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  truckSection: {
    marginBottom: 20,
  },
  truckSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  truckSectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#2B2A27',
  },
  compareAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8F8A80',
  },
  truckCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
  },
  truckCardSelected: {
    backgroundColor: '#1F1E1C',
    borderColor: '#1F1E1C',
  },
  truckCardUnselected: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FFFFFF',
  },
  truckCardIconWrap: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: '#F3EFE9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  truckCardIconEmoji: {
    fontSize: 26,
  },
  truckCardInfo: {
    flex: 1,
  },
  truckTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  truckNameText: {
    fontSize: 16,
    fontWeight: '700',
  },
  truckTimeBadge: {
    backgroundColor: '#F3EFE9',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  truckTimeBadgeSelected: {
    backgroundColor: '#353432',
  },
  truckTimeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#2B2A27',
  },
  truckCapText: {
    fontSize: 12,
    marginTop: 2,
  },
  truckFareText: {
    fontSize: 11,
    marginTop: 2,
  },
  truckPriceInfo: {
    alignItems: 'flex-end',
  },
  priceLabel: {
    fontSize: 9,
    fontWeight: '800',
  },
  priceValue: {
    fontSize: 18,
    fontWeight: '800',
  },
  textWhite: {
    color: '#FFFFFF',
  },
  textDark: {
    color: '#2B2A27',
  },
  textGray: {
    color: '#7C7871',
  },
  textLightGray: {
    color: '#C5C0B7',
  },
  textOrange: {
    color: '#C17750',
  },
  bookingConfirmPanel: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    marginTop: 10,
    marginBottom: 30,
  },
  bottomNavContainer: {
    position: 'absolute',
    bottom: 24,
    left: 20,
    right: 20,
    alignItems: 'center',
  },
  bottomNavPill: {
    flexDirection: 'row',
    backgroundColor: '#1F1E1C',
    borderRadius: 30,
    paddingHorizontal: 12,
    paddingVertical: 8,
    width: '100%',
    justifyContent: 'space-around',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  bottomNavTab: {
    padding: 10,
  },
  bottomNavTabActive: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#C17750',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 6,
  },
  bottomNavTabIconEmoji: {
    fontSize: 20,
    color: '#FFFFFF',
  },
  bottomNavTabActiveText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  // Remaining from original file
  headerInfo: {
    flexDirection: 'column',
  },
  welcomeText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  userName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  profileBtn: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  profileBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1D4ED8',
  },
  logoutBtn: {
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  logoutBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#EF4444',
  },
  mapContainer: {
    height: 220,
    backgroundColor: '#E2E8F0',
    position: 'relative',
  },
  mapLabelOverlay: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  mapLabelText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  searchSheet: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    marginTop: -12,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 16,
  },
  addressInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 52,
    marginBottom: 12,
    backgroundColor: '#F8FAFC',
  },
  activeInputBox: {
    borderColor: '#1D4ED8',
    backgroundColor: '#FFFFFF',
  },
  dotMarker: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 12,
  },
  inputPlaceholderText: {
    fontSize: 14,
    color: '#94A3B8',
    fontWeight: '500',
  },
  inputFilledText: {
    fontSize: 14,
    color: '#0F172A',
    fontWeight: '600',
  },
  saveFavBtn: {
    alignSelf: 'flex-start',
    marginBottom: 16,
    paddingVertical: 4,
  },
  saveFavBtnText: {
    fontSize: 12,
    color: '#1D4ED8',
    fontWeight: '600',
  },
  searchResultsContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  searchResultItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  searchResultName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  searchResultAddr: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  emptyListText: {
    fontSize: 14,
    color: '#8F8A80',
    textAlign: 'center',
    marginVertical: 12,
  },
  actionButton: {
    backgroundColor: '#1D4ED8',
    borderRadius: 16,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  actionButtonDisabled: {
    backgroundColor: '#94A3B8',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  vehicleSheet: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 20,
  },
  backRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  backBtnText: {
    fontSize: 13,
    color: '#1D4ED8',
    fontWeight: '600',
  },
  routeDistanceInfo: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 12,
  },
  vehicleOptionCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    backgroundColor: '#F8FAFC',
  },
  vehicleSelectedCard: {
    borderColor: '#1D4ED8',
    backgroundColor: '#EFF6FF',
  },
  vehicleMainInfo: {
    flex: 1,
  },
  vehicleNameText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  vehicleCapText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  vehicleCategoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#E2E8F0',
    fontSize: 10,
    fontWeight: '600',
    color: '#475569',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 6,
  },
  vehiclePriceInfo: {
    alignItems: 'flex-end',
  },
  vehiclePriceText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1D4ED8',
  },
  vehiclePerKmText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  promoContainer: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: 16,
  },
  promoInput: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    fontSize: 14,
    color: '#0F172A',
    backgroundColor: '#F8FAFC',
  },
  promoApplyBtn: {
    backgroundColor: '#0F172A',
    borderRadius: 12,
    width: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  promoApplyText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 13,
  },
  surgeDetailsContainer: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  surgeTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#B45309',
  },
  surgeBody: {
    fontSize: 11,
    color: '#D97706',
    lineHeight: 16,
    marginTop: 4,
  },
  riskCheckboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
    gap: 10,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 1.5,
    borderColor: '#94A3B8',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  checkboxChecked: {
    borderColor: '#1D4ED8',
    backgroundColor: '#1D4ED8',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  riskCheckboxText: {
    flex: 1,
    fontSize: 12,
    color: '#475569',
    lineHeight: 16,
  },
  broadcastingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#FFFFFF',
  },
  pulseCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  pulseIcon: {
    fontSize: 40,
  },
  broadcastingTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0F172A',
  },
  broadcastingSubtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 40,
    lineHeight: 20,
  },
  timerRing: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: '#E2E8F0',
    borderTopColor: '#1D4ED8',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  timerCount: {
    fontSize: 32,
    fontWeight: '800',
    color: '#0F172A',
  },
  timerLabel: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  cancelBookingBtn: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  cancelBookingText: {
    color: '#EF4444',
    fontWeight: '600',
    fontSize: 14,
  },
  tripStatusBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#0F172A',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  tripStatusBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  animatedTruckContainer: {
    position: 'absolute',
    bottom: 40,
    left: 200,
  },
  movingTruckEmoji: {
    fontSize: 36,
  },
  trackingSheet: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    marginTop: -12,
  },
  driverInfoCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  driverMeta: {
    flexDirection: 'column',
  },
  driverName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  driverPlate: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    marginTop: 2,
  },
  driverRatingText: {
    fontSize: 12,
    color: '#F59E0B',
    fontWeight: '600',
    marginTop: 4,
  },
  driverTruckEmoji: {
    fontSize: 32,
  },
  otpCard: {
    backgroundColor: '#EFF6FF',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  otpLabel: {
    fontSize: 13,
    color: '#1D4ED8',
    fontWeight: '600',
  },
  otpCode: {
    fontSize: 36,
    fontWeight: '900',
    color: '#1E40AF',
    letterSpacing: 4,
    marginVertical: 10,
  },
  otpNote: {
    fontSize: 11,
    color: '#64748B',
    textAlign: 'center',
  },
  devBypassRow: {
    marginTop: 12,
    width: '100%',
  },
  devBypassBtn: {
    backgroundColor: '#1E40AF',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  devBypassText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 12,
  },
  statusBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  statusBoxTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  statusBoxSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
    textAlign: 'center',
  },
  simulateDeliveryBtn: {
    backgroundColor: '#10B981',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginTop: 12,
  },
  simulateDeliveryBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 12,
  },
  photoProofContainer: {
    marginBottom: 20,
  },
  photoProofHeader: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 10,
  },
  photoProofsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  photoProofItem: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
  },
  photoLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 6,
  },
  photoMockText: {
    fontSize: 12,
    color: '#0F172A',
    fontWeight: '600',
  },
  completedContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  completedContent: {
    alignItems: 'center',
    padding: 24,
    justifyContent: 'center',
    minHeight: '100%',
  },
  completedEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  completedTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
  },
  completedSubtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 32,
    lineHeight: 20,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
  },
  starEmoji: {
    fontSize: 36,
  },
  starSelected: {
    color: '#F59E0B',
  },
  starUnselected: {
    color: '#E2E8F0',
  },
  commentInput: {
    width: '100%',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    padding: 12,
    fontSize: 14,
    color: '#0F172A',
    backgroundColor: '#F8FAFC',
    height: 80,
    textAlignVertical: 'top',
    marginBottom: 24,
  },
  spacer: {
    height: 60,
  },
  savedChipsContainer: {
    marginBottom: 16,
    marginTop: 4,
  },
  savedChipsTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  savedChipsScroll: {
    paddingVertical: 4,
    gap: 8,
  },
  savedChipBtn: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 4,
  },
  savedChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1D4ED8',
  },
  realMap: {
    width: '100%',
    height: '100%',
  },
  realSearchInput: {
    flex: 1,
    height: '100%',
    fontSize: 14,
    color: '#0F172A',
    fontWeight: '600',
    paddingVertical: 0,
  },
  pinOnMapSelectBtn: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 16,
  },
  pinOnMapSelectText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  pinModalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  pinModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  pinModalBackBtn: {
    paddingVertical: 4,
  },
  pinModalBackText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '600',
  },
  pinModalHeaderTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  pinMapContainer: {
    flex: 1,
    position: 'relative',
  },
  pinOverlayContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -15,
    marginTop: -38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinFloatingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#0F172A',
    opacity: 0.5,
    marginTop: 26,
    position: 'absolute',
  },
  pinFloatingEmoji: {
    fontSize: 32,
    zIndex: 1,
  },
  pinModalBottomCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 8,
  },
  pinModalAddressLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 1,
    marginBottom: 8,
  },
  pinModalAddressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    minHeight: 48,
  },
  pinModalAddressText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
    lineHeight: 20,
  },
  operatedWarningBanner: {
    backgroundColor: '#FEE2E2',
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#FCA5A5',
  },
  operatedWarningText: {
    color: '#B91C1C',
    fontSize: 13,
    fontWeight: '700',
  },
  stopCircleMarker: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 3,
    borderColor: '#C17750',
    marginRight: 14,
    backgroundColor: '#FFFFFF',
  },
  removeStopBtn: {
    padding: 6,
  },
  removeStopText: {
    fontSize: 16,
    color: '#EF4444',
    fontWeight: 'bold',
  },
  proceedCircleBtnDisabled: {
    backgroundColor: '#E2E8F0',
  },
  stepContainer: {
    flex: 1,
    backgroundColor: '#F5F2EB',
  },
  wizardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#F5F2EB',
    borderBottomWidth: 1,
    borderBottomColor: '#F3EFE9',
  },
  wizardBackBtn: {
    padding: 6,
  },
  wizardBackIcon: {
    fontSize: 22,
    color: '#2B2A27',
    fontWeight: 'bold',
  },
  wizardTitleWrap: {
    flex: 1,
    alignItems: 'center',
  },
  wizardStepSub: {
    fontSize: 10,
    fontWeight: '700',
    color: '#C17750',
    letterSpacing: 1.5,
  },
  wizardStepTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#2B2A27',
    marginTop: 2,
  },
  wizardContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  searchConfirmRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  searchConfirmLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#C17750',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  searchConfirmText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2B2A27',
  },
  searchEditBadge: {
    backgroundColor: '#F3EFE9',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  searchEditBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#C17750',
  },
  stopActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dragGripText: {
    fontSize: 18,
    color: '#C5C0B7',
  },
  stopRemoveText: {
    fontSize: 16,
    color: '#EF4444',
    fontWeight: 'bold',
  },
  searchClearIcon: {
    fontSize: 16,
    color: '#C5C0B7',
    padding: 6,
  },
  addStopSearchBtn: {
    alignSelf: 'flex-start',
    marginTop: 4,
    marginBottom: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F3EFE9',
  },
  addStopSearchText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#C17750',
  },
  searchActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  searchActionTag: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#F3EFE9',
  },
  searchActionTagActive: {
    backgroundColor: '#C17750',
    borderColor: '#C17750',
  },
  searchActionTagTextActive: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  searchActionTagText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2B2A27',
  },
  savedBoxesContainer: {
    marginBottom: 24,
  },
  savedBoxesRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  savedAddressBox: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#F3EFE9',
  },
  savedBoxIcon: {
    fontSize: 22,
    marginBottom: 4,
  },
  savedBoxTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2B2A27',
  },
  savedBoxAddr: {
    fontSize: 11,
    color: '#8F8A80',
    marginTop: 2,
  },
  resultItemIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  resultItemIcon: {
    fontSize: 18,
  },
  resultItemDist: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8F8A80',
  },
  stickyBottomPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3EFE9',
  },
  stickyBottomBtn: {
    backgroundColor: '#C17750',
    borderRadius: 16,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stickyBottomBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  routeHeaderCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginVertical: 12,
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F3EFE9',
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 2,
  },
  circleMarkerMini: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2B2A27',
    marginRight: 8,
  },
  routeText: {
    fontSize: 13,
    color: '#2B2A27',
    fontWeight: '500',
    flex: 1,
  },
  stopCircleMarkerMini: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#C17750',
    marginRight: 8,
  },
  diamondMarkerMini: {
    width: 7,
    height: 7,
    backgroundColor: '#C17750',
    transform: [{ rotate: '45deg' }],
    marginRight: 8,
  },
  routeDistanceWrap: {
    alignItems: 'flex-end',
    paddingLeft: 12,
    borderLeftWidth: 1,
    borderLeftColor: '#F3EFE9',
  },
  routeDistanceLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#8F8A80',
  },
  routeDistanceVal: {
    fontSize: 18,
    fontWeight: '800',
    color: '#2B2A27',
  },
  categorySelectorRow: {
    flexDirection: 'row',
    backgroundColor: '#F3EFE9',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  categoryTabBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  categoryTabBtnActive: {
    backgroundColor: '#FFFFFF',
  },
  categoryTabBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#8F8A80',
  },
  categoryTabBtnTextActive: {
    color: '#2B2A27',
  },
  subcatList: {
    marginBottom: 20,
  },
  breakdownLabelText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#C17750',
    marginTop: 2,
  },
  fareBreakdownCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#F3EFE9',
  },
  fareBreakdownTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#8F8A80',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  fareBreakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 4,
  },
  fareRowLabel: {
    fontSize: 13,
    color: '#8F8A80',
  },
  fareRowVal: {
    fontSize: 13,
    color: '#2B2A27',
    fontWeight: '600',
  },
  fareRowLabelDiscount: {
    fontSize: 13,
    color: '#10B981',
    fontWeight: '600',
  },
  fareRowValDiscount: {
    fontSize: 13,
    color: '#10B981',
    fontWeight: '600',
  },
  fareBreakdownDivider: {
    height: 1,
    backgroundColor: '#F3EFE9',
    marginVertical: 10,
  },
  fareBreakdownTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fareTotalLabel: {
    fontSize: 15,
    fontWeight: '800',
    color: '#2B2A27',
  },
  fareTotalVal: {
    fontSize: 20,
    fontWeight: '900',
    color: '#C17750',
  },
  fareSubTextNote: {
    fontSize: 10,
    color: '#8F8A80',
    textAlign: 'center',
    marginTop: 8,
  },
  formSectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#8F8A80',
    letterSpacing: 1,
    marginTop: 20,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 10,
  },
  categoryBox: {
    width: '31%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F3EFE9',
  },
  categoryBoxSelected: {
    backgroundColor: '#C17750',
    borderColor: '#C17750',
  },
  categoryBoxIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  categoryBoxText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2B2A27',
  },
  weightSelectorRow: {
    gap: 10,
    marginBottom: 10,
  },
  weightCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#F3EFE9',
  },
  weightCardSelected: {
    backgroundColor: '#1F1E1C',
    borderColor: '#1F1E1C',
  },
  weightCheckboxDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#C5C0B7',
    marginRight: 12,
    backgroundColor: '#FFFFFF',
  },
  weightCheckboxDotActive: {
    borderColor: '#C17750',
    backgroundColor: '#C17750',
  },
  weightCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2B2A27',
  },
  weightCardDesc: {
    fontSize: 11,
    marginTop: 2,
  },
  detailsInputBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: '#2B2A27',
    fontWeight: '600',
    borderWidth: 1,
    borderColor: '#F3EFE9',
    minHeight: 52,
  },
  photoUploadRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 10,
  },
  photoThumbnailCard: {
    width: 74,
    height: 74,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#F3EFE9',
    position: 'relative',
  },
  photoEmoji: {
    fontSize: 20,
  },
  photoCardLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#8F8A80',
    marginTop: 2,
  },
  photoRemoveBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#EF4444',
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoRemoveBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  photoAddCard: {
    width: 74,
    height: 74,
    backgroundColor: '#F3EFE9',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#C5C0B7',
  },
  photoAddPlus: {
    fontSize: 22,
    color: '#8F8A80',
    fontWeight: 'bold',
  },
  photoAddLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#8F8A80',
    marginTop: 2,
  },
  scheduleToggleRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  scheduleToggleBtn: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F3EFE9',
  },
  scheduleToggleBtnActive: {
    backgroundColor: '#C17750',
    borderColor: '#C17750',
  },
  scheduleToggleText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#8F8A80',
  },
  scheduleToggleTextActive: {
    color: '#FFFFFF',
  },
  scheduleTimeInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 48,
    fontSize: 14,
    color: '#2B2A27',
    fontWeight: '600',
    borderWidth: 1,
    borderColor: '#F3EFE9',
    marginTop: 6,
  },
  addonHelperCheckboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#F3EFE9',
    gap: 10,
  },
  addonHelperText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: '#2B2A27',
  },
  stickyBottomBtnDisabled: {
    backgroundColor: '#E2E8F0',
  },
  truckSvgIcon: {
    width: 34,
    height: 28,
    justifyContent: 'flex-end',
    alignItems: 'flex-start',
  },
  truckSvgCab: {
    position: 'absolute',
    right: 0,
    top: 0,
    width: 12,
    height: 16,
    backgroundColor: '#C17750',
    borderTopLeftRadius: 2,
    borderTopRightRadius: 4,
    borderBottomRightRadius: 2,
  },
  truckSvgBody: {
    width: 26,
    height: 14,
    backgroundColor: '#C17750',
    borderRadius: 3,
    marginTop: 2,
  },
  truckSvgBodySmall: {
    width: 16,
    height: 10,
  },
  truckSvgWheelRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: -2,
    marginLeft: 3,
  },
  truckSvgWheel: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2B2A27',
    borderWidth: 1.5,
    borderColor: '#8F8A80',
  },
  addStopLimitText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#C5C0B7',
    marginLeft: 6,
  },
  searchHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  searchHeaderCount: {
    fontSize: 11,
    fontWeight: '600',
    color: '#C17750',
  },
  fareRowValFree: {
    fontSize: 13,
    color: '#10B981',
    fontWeight: '600',
  },
  reviewDetailsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#F3EFE9',
  },
  reviewDetailTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8F8A80',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  reviewDetailVal: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2B2A27',
    marginTop: 2,
  },
  paymentSelectorContainer: {
    marginBottom: 20,
  },
  paymentMethodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#F3EFE9',
    marginBottom: 8,
    gap: 12,
  },
  paymentMethodRowSelected: {
    backgroundColor: '#1F1E1C',
    borderColor: '#1F1E1C',
  },
  paymentMethodRowDisabled: {
    opacity: 0.5,
  },
  paymentMethodIcon: {
    fontSize: 18,
  },
  paymentMethodLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: '#2B2A27',
  },
  paymentCheckboxDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#C5C0B7',
    backgroundColor: '#FFFFFF',
  },
  paymentCheckboxDotActive: {
    borderColor: '#C17750',
    backgroundColor: '#C17750',
  },
});

export default HomeScreen;
