import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
  Modal,
  ActivityIndicator,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import Svg, { Path } from 'react-native-svg';
import axios from 'axios';
import { API_ROUTES } from '../config/api';
import { useAuth } from '../context/AuthContext';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/RootNavigator';

const SearchIcon: React.FC<{ color?: string; size?: number; style?: any }> = ({ color = '#C17750', size = 16, style }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
    <Path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" fill={color} />
  </Svg>
);

const LightbulbIcon: React.FC<{ color?: string; size?: number; style?: any }> = ({ color = '#F59E0B', size = 16, style }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
    <Path d="M9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1zm3-19C8.14 2 5 5.14 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7zm2.85 11.1l-.85.6V16h-4v-1.3l-.85-.6C8.57 13.05 8 11.9 8 9c0-2.2 1.8-4 4-4s4 1.8 4 4c0 2.9-1.57 4.05-2.15 5.1z" fill={color} />
  </Svg>
);

type ProfileScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Profile'>;

interface Props {
  navigation: ProfileScreenNavigationProp;
}

const ProfileScreen: React.FC<Props> = ({ navigation }) => {
  const {
    user,
    accessToken,
    updateProfile,
    changePhoneSendOtp,
    changePhoneVerifyOtp,
    saveAddress,
    editAddress,
    deleteAddress,
    savePaymentMethod,
    deletePaymentMethod,
  } = useAuth();

  // Edit Profile fields state
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState(user?.name || '');
  const [editEmail, setEditEmail] = useState(user?.email || '');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Phone update modal state
  const [phoneModalVisible, setPhoneModalVisible] = useState(false);
  const [newPhone, setNewPhone] = useState('');
  const [phoneOtp, setPhoneOtp] = useState('');
  const [phoneStep, setPhoneStep] = useState<'send' | 'verify'>('send');
  const [isLoadingPhone, setIsLoadingPhone] = useState(false);

  // Address modal state
  const [addressModalVisible, setAddressModalVisible] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [addressLabel, setAddressLabel] = useState('Home'); // Home, Work, Other
  const [customLabel, setCustomLabel] = useState('');
  const [street, setStreet] = useState('');
  const [area, setArea] = useState('');
  const [city, setCity] = useState('');
  const [pincode, setPincode] = useState('');
  const [flatLandmark, setFlatLandmark] = useState('');
  const [markerCoords, setMarkerCoords] = useState({ latitude: 28.6139, longitude: 77.2090 });
  const [isSavingAddress, setIsSavingAddress] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);

  // Payment modal state
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [paymentType, setPaymentType] = useState<'card' | 'upi'>('card');
  const [cardBrand, setCardBrand] = useState('Visa');
  const [cardLast4, setCardLast4] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [upiVpa, setUpiVpa] = useState('');
  const [isSavingPayment, setIsSavingPayment] = useState(false);

  const handleUpdateProfile = async () => {
    if (!editName.trim()) {
      Alert.alert('Required Field', 'Please enter your name.');
      return;
    }
    setIsSavingProfile(true);
    try {
      await updateProfile(editName.trim(), editEmail.trim());
      setIsEditingProfile(false);
      Alert.alert('Success', 'Profile details updated.');
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Could not update profile.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handlePhoneSendOtp = async () => {
    if (!/^\d{10}$/.test(newPhone)) {
      Alert.alert('Invalid Phone', 'Please enter a valid 10-digit mobile number.');
      return;
    }
    setIsLoadingPhone(true);
    try {
      const formattedPhone = `+91${newPhone}`;
      const devOtp = await changePhoneSendOtp(formattedPhone);
      setPhoneStep('verify');
      if (devOtp) {
        Alert.alert(
          'OTP Sent (Dev Mode)',
          `Use OTP code: ${devOtp} to verify change.`
        );
      } else {
        Alert.alert('OTP Sent', 'A verification code has been sent to the new number.');
      }
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || 'Could not send OTP to the new number.');
    } finally {
      setIsLoadingPhone(false);
    }
  };

  const handlePhoneVerifyOtp = async () => {
    if (phoneOtp.length !== 6) {
      Alert.alert('Invalid OTP', 'Please enter the 6-digit OTP code.');
      return;
    }
    setIsLoadingPhone(true);
    try {
      const formattedPhone = `+91${newPhone}`;
      await changePhoneVerifyOtp(formattedPhone, phoneOtp);
      setPhoneModalVisible(false);
      setNewPhone('');
      setPhoneOtp('');
      setPhoneStep('send');
      Alert.alert('Success', 'Phone number updated successfully.');
    } catch (err: any) {
      Alert.alert('Verification Failed', err.response?.data?.message || 'Incorrect OTP code.');
    } finally {
      setIsLoadingPhone(false);
    }
  };

  const handleLocateAddress = async () => {
    if (!street.trim() || !city.trim()) {
      Alert.alert('Details Required', 'Please enter at least Street and City to locate on the map.');
      return;
    }
    setIsGeocoding(true);
    try {
      const fullAddress = `${street.trim()}, ${area.trim()}, ${city.trim()} - ${pincode.trim()}`;
      const res = await axios.get(`${API_ROUTES.geocode}?address=${encodeURIComponent(fullAddress)}`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (res.data?.success && res.data?.geocode?.coords) {
        const { lat, lng } = res.data.geocode.coords;
        setMarkerCoords({ latitude: lat, longitude: lng });
      } else {
        Alert.alert('Location Not Found', 'Could not locate address on map. Please check spelling.');
      }
    } catch (err) {
      console.error('[GECODE_ERROR]', err);
      Alert.alert('Geocoding Error', 'Failed to resolve address coordinates. You can still drag the pin manually.');
    } finally {
      setIsGeocoding(false);
    }
  };

  const handleSaveAddress = async () => {
    if (!street.trim() || !area.trim() || !city.trim() || !pincode.trim()) {
      Alert.alert('Required Fields', 'Please fill in Street, Area, City, and Pincode.');
      return;
    }

    const finalLabel = addressLabel === 'Other' ? (customLabel.trim() || 'Other') : addressLabel;

    setIsSavingAddress(true);
    try {
      if (editingAddressId) {
        await editAddress(
          editingAddressId,
          finalLabel,
          street.trim(),
          area.trim(),
          city.trim(),
          pincode.trim(),
          flatLandmark.trim(),
          markerCoords.latitude,
          markerCoords.longitude
        );
        Alert.alert('Success', 'Address updated successfully.');
      } else {
        await saveAddress(
          finalLabel,
          street.trim(),
          area.trim(),
          city.trim(),
          pincode.trim(),
          flatLandmark.trim(),
          markerCoords.latitude,
          markerCoords.longitude
        );
        Alert.alert('Address Saved', 'Address added to your profile.');
      }

      setAddressModalVisible(false);
      setEditingAddressId(null);
      setCustomLabel('');
      setStreet('');
      setArea('');
      setCity('');
      setPincode('');
      setFlatLandmark('');
      setMarkerCoords({ latitude: 28.6139, longitude: 77.2090 });
    } catch (err) {
      console.error('[SAVE_ADDRESS_ERROR]', err);
      Alert.alert('Error', 'Could not save address. Please try again.');
    } finally {
      setIsSavingAddress(false);
    }
  };

  const handleDeleteAddress = (id: string) => {
    Alert.alert('Confirm Delete', 'Remove this saved address?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          deleteAddress(id).catch(() => Alert.alert('Error', 'Could not delete address.'));
        },
      },
    ]);
  };

  const handleSavePayment = async () => {
    setIsSavingPayment(true);
    try {
      let cardDetails = null;
      let upiDetails = null;
      let razorpayTokenId = undefined;

      if (paymentType === 'card') {
        if (!/^\d{4}$/.test(cardLast4)) {
          Alert.alert('Required Field', 'Please enter card last 4 digits.');
          setIsSavingPayment(false);
          return;
        }
        
        await new Promise<void>((resolve) => setTimeout(() => resolve(), 1500));
        razorpayTokenId = `tok_rzp_vault_${Math.random().toString(36).slice(2, 10)}`;
        cardDetails = { brand: cardBrand, last4: cardLast4, expiry: cardExpiry || '12/28' };
      } else {
        if (!upiVpa.includes('@')) {
          Alert.alert('Required Field', 'Please enter a valid UPI ID (VPA).');
          setIsSavingPayment(false);
          return;
        }
        upiDetails = { vpa: upiVpa.trim() };
      }

      await savePaymentMethod(paymentType, cardDetails, upiDetails, razorpayTokenId);
      setPaymentModalVisible(false);
      setCardLast4('');
      setUpiVpa('');
      Alert.alert('Payment Method Added', 'Payment method saved to profile.');
    } catch (err) {
      Alert.alert('Error', 'Could not save payment method.');
    } finally {
      setIsSavingPayment(false);
    }
  };

  const handleDeletePayment = (id: string) => {
    Alert.alert('Confirm Delete', 'Remove this payment method?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          deletePaymentMethod(id).catch(() => Alert.alert('Error', 'Could not remove payment method.'));
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header bar */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>← Back to Map</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Profile</Text>
        <View style={styles.emptyHeaderBlock} />
      </View>

      <ScrollView style={styles.content}>
        {/* Profile Info block */}
        <View style={styles.profileInfoCard}>
          <View style={styles.avatarRow}>
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>
                {user?.name ? user.name.charAt(0).toUpperCase() : 'C'}
              </Text>
            </View>
            <View style={styles.profileBrief}>
              <Text style={styles.userFullName}>{user?.name || 'Customer'}</Text>
              <Text style={styles.userPhoneText}>{user?.phone}</Text>
            </View>
          </View>

          {isEditingProfile ? (
            <View style={styles.editProfileForm}>
              <Text style={styles.inputLabel}>Full Name</Text>
              <TextInput
                style={styles.input}
                value={editName}
                onChangeText={setEditName}
                placeholder="Name"
                placeholderTextColor="#94A3B8"
              />
              <Text style={styles.inputLabel}>Email Address</Text>
              <TextInput
                style={styles.input}
                value={editEmail}
                onChangeText={setEditEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholder="Email (Optional)"
                placeholderTextColor="#94A3B8"
              />
              <View style={styles.editProfileActions}>
                <TouchableOpacity
                  style={[styles.smallBtn, styles.cancelBtn]}
                  onPress={() => setIsEditingProfile(false)}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.smallBtn, styles.saveBtn]}
                  onPress={handleUpdateProfile}
                  disabled={isSavingProfile}
                >
                  {isSavingProfile ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.saveBtnText}>Save</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.detailsRow}>
              <Text style={styles.detailText}>Email: {user?.email || 'Not configured'}</Text>
              <View style={styles.detailsButtonRow}>
                <TouchableOpacity
                  style={styles.detailsEditBtn}
                  onPress={() => {
                    setEditName(user?.name || '');
                    setEditEmail(user?.email || '');
                    setIsEditingProfile(true);
                  }}
                >
                  <Text style={styles.detailsEditBtnText}>Edit Profile Details</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.phoneChangeBtn}
                  onPress={() => setPhoneModalVisible(true)}
                >
                  <Text style={styles.phoneChangeBtnText}>Change Phone Number</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* Saved Addresses Section */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Saved Addresses</Text>
          <TouchableOpacity onPress={() => setAddressModalVisible(true)}>
            <Text style={styles.addSectionBtn}>+ Add Address</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.listCard}>
          {user?.savedAddresses && user.savedAddresses.length > 0 ? (
            user.savedAddresses.map((addr) => (
              <View key={addr._id} style={styles.listItem}>
                <View style={styles.listItemMeta}>
                  <Text style={styles.listItemTitle}>{addr.label}</Text>
                  <Text style={styles.listItemSubtitle}>{addr.address}</Text>
                  {addr.flatLandmark ? (
                    <Text style={styles.listItemLandmark}>Landmark: {addr.flatLandmark}</Text>
                  ) : null}
                </View>
                <View style={styles.listItemActions}>
                  <TouchableOpacity 
                    style={styles.editActionBtn} 
                    onPress={() => {
                      setEditingAddressId(addr._id || null);
                      const isPredefined = ['Home', 'Work'].includes(addr.label);
                      setAddressLabel(isPredefined ? addr.label : 'Other');
                      setCustomLabel(isPredefined ? '' : addr.label);
                      setStreet(addr.street || '');
                      setArea(addr.area || '');
                      setCity(addr.city || '');
                      setPincode(addr.pincode || '');
                      setFlatLandmark(addr.flatLandmark || '');
                      setMarkerCoords({
                        latitude: addr.lat || 28.6139,
                        longitude: addr.lng || 77.2090
                      });
                      setAddressModalVisible(true);
                    }}
                  >
                    <Text style={styles.editItemBtnText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDeleteAddress(addr._id!)}>
                    <Text style={styles.deleteItemBtnText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.emptyListText}>No saved addresses yet.</Text>
          )}
        </View>

        {/* Saved Payment Methods Section */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Saved Payments</Text>
          <TouchableOpacity onPress={() => setPaymentModalVisible(true)}>
            <Text style={styles.addSectionBtn}>+ Add Payment</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.listCard}>
          {user?.savedPaymentMethods && user.savedPaymentMethods.length > 0 ? (
            user.savedPaymentMethods.map((pm) => (
              <View key={pm.id} style={styles.listItem}>
                <View style={styles.listItemMeta}>
                  <Text style={styles.listItemTitle}>
                    {pm.methodType === 'card'
                      ? `${pm.cardDetails?.brand} Card (•••• ${pm.cardDetails?.last4})`
                      : `UPI VPA (${pm.upiDetails?.vpa})`}
                  </Text>
                  <Text style={styles.listItemSubtitle}>
                    {pm.methodType === 'card' ? `Expiry: ${pm.cardDetails?.expiry}` : 'Instant verification active'}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => handleDeletePayment(pm.id)}>
                  <Text style={styles.deleteItemBtnText}>Delete</Text>
                </TouchableOpacity>
              </View>
            ))
          ) : (
            <Text style={styles.emptyListText}>No saved cards or UPI accounts.</Text>
          )}
        </View>
        
        <View style={styles.spacer} />
      </ScrollView>

      {/* Phone change verification modal */}
      <Modal visible={phoneModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Change Phone Number</Text>
            {phoneStep === 'send' ? (
              <>
                <Text style={styles.modalSub}>
                  Enter your new mobile phone number. We will send a 6-digit verification code.
                </Text>
                <View style={styles.phoneInputRow}>
                  <Text style={styles.phonePrefix}>+91</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="98765 43210"
                    placeholderTextColor="#94A3B8"
                    keyboardType="number-pad"
                    maxLength={10}
                    value={newPhone}
                    onChangeText={setNewPhone}
                  />
                </View>
                <TouchableOpacity
                  style={styles.modalActionBtn}
                  onPress={handlePhoneSendOtp}
                  disabled={isLoadingPhone}
                >
                  {isLoadingPhone ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.modalActionBtnText}>Send verification code</Text>
                  )}
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.modalSub}>
                  Enter the 6-digit code sent to +91{newPhone} to authorize the change.
                </Text>
                <TextInput
                  style={[styles.centerText, styles.spacedLetter]}
                  placeholder="123456"
                  placeholderTextColor="#94A3B8"
                  keyboardType="number-pad"
                  maxLength={6}
                  value={phoneOtp}
                  onChangeText={setPhoneOtp}
                />
                <TouchableOpacity
                  style={styles.modalActionBtn}
                  onPress={handlePhoneVerifyOtp}
                  disabled={isLoadingPhone}
                >
                  {isLoadingPhone ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.modalActionBtnText}>Verify and Update</Text>
                  )}
                </TouchableOpacity>
              </>
            )}
            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => {
                setPhoneModalVisible(false);
                setNewPhone('');
                setPhoneOtp('');
                setPhoneStep('send');
              }}
            >
              <Text style={styles.modalCloseText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Add/Edit Address Modal */}
      <Modal visible={addressModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <ScrollView showsVerticalScrollIndicator={false} style={styles.modalScrollWrap} contentContainerStyle={styles.modalScrollContent}>
              <Text style={styles.modalTitle}>
                {editingAddressId ? 'Edit Saved Location' : 'Save New Location'}
              </Text>
              
              <View style={styles.labelSelectorRow}>
                {['Home', 'Work', 'Other'].map((lbl) => (
                  <TouchableOpacity
                    key={lbl}
                    style={[styles.labelBtn, addressLabel === lbl && styles.labelBtnActive]}
                    onPress={() => setAddressLabel(lbl)}
                  >
                    <Text style={[styles.labelBtnText, addressLabel === lbl && styles.labelBtnTextActive]}>
                      {lbl}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {addressLabel === 'Other' && (
                <>
                  <Text style={styles.inputLabel}>Custom Label (e.g. Gym, Friend's house)</Text>
                  <TextInput
                    style={styles.modalSingleInput}
                    placeholder="Friend's Place"
                    placeholderTextColor="#94A3B8"
                    value={customLabel}
                    onChangeText={setCustomLabel}
                  />
                </>
              )}

              <Text style={styles.inputLabel}>Street / Building / Flat No.</Text>
              <TextInput
                style={styles.modalSingleInput}
                placeholder="Flat 102, Building A, Cyber City"
                placeholderTextColor="#94A3B8"
                value={street}
                onChangeText={setStreet}
              />

              <Text style={styles.inputLabel}>Area / Locality</Text>
              <TextInput
                style={styles.modalSingleInput}
                placeholder="DLF Phase 3"
                placeholderTextColor="#94A3B8"
                value={area}
                onChangeText={setArea}
              />

              <View style={styles.inputRow}>
                <View style={styles.inputCol}>
                  <Text style={styles.inputLabel}>City</Text>
                  <TextInput
                    style={styles.modalSingleInput}
                    placeholder="Gurugram"
                    placeholderTextColor="#94A3B8"
                    value={city}
                    onChangeText={setCity}
                  />
                </View>
                <View style={styles.inputCol}>
                  <Text style={styles.inputLabel}>Pincode</Text>
                  <TextInput
                    style={styles.modalSingleInput}
                    placeholder="122002"
                    placeholderTextColor="#94A3B8"
                    keyboardType="number-pad"
                    value={pincode}
                    onChangeText={setPincode}
                  />
                </View>
              </View>

              <Text style={styles.inputLabel}>Flat / House / Landmark notes (Optional)</Text>
              <TextInput
                style={styles.modalSingleInput}
                placeholder="Opposite Cyber Hub main gate"
                placeholderTextColor="#94A3B8"
                value={flatLandmark}
                onChangeText={setFlatLandmark}
              />

              <TouchableOpacity
                style={styles.locateBtn}
                onPress={handleLocateAddress}
                disabled={isGeocoding}
              >
                {isGeocoding ? (
                  <ActivityIndicator color="#C17750" />
                ) : (
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    <SearchIcon color="#C17750" size={16} />
                    <Text style={styles.locateBtnText}>Locate on Map via Geocoding</Text>
                  </View>
                )}
              </TouchableOpacity>

              <View style={styles.mapContainerWrap}>
                <MapView
                  style={styles.miniMap}
                  region={{
                    latitude: markerCoords.latitude,
                    longitude: markerCoords.longitude,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                  }}
                >
                  <Marker
                    coordinate={markerCoords}
                    draggable
                    onDragEnd={(e) => setMarkerCoords(e.nativeEvent.coordinate)}
                  />
                </MapView>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#FBF9F6', paddingVertical: 6 }}>
                  <LightbulbIcon color="#F59E0B" size={14} />
                  <Text style={[styles.mapTipText, { backgroundColor: 'transparent', paddingVertical: 0 }]}>Drag pin on map for precise location</Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.modalActionBtn}
                onPress={handleSaveAddress}
                disabled={isSavingAddress}
              >
                {isSavingAddress ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalActionBtnText}>
                    {editingAddressId ? 'Update Address' : 'Add Address'}
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => {
                  setAddressModalVisible(false);
                  setEditingAddressId(null);
                  setCustomLabel('');
                  setStreet('');
                  setArea('');
                  setCity('');
                  setPincode('');
                  setFlatLandmark('');
                }}
              >
                <Text style={styles.modalCloseText}>Cancel</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Add Payment Method Modal */}
      <Modal visible={paymentModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Add Payment Method</Text>
            
            <View style={styles.labelSelectorRow}>
              <TouchableOpacity
                style={[styles.labelBtn, paymentType === 'card' && styles.labelBtnActive]}
                onPress={() => setPaymentType('card')}
              >
                <Text style={[styles.labelBtnText, paymentType === 'card' && styles.labelBtnTextActive]}>
                  Credit/Debit Card
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.labelBtn, paymentType === 'upi' && styles.labelBtnActive]}
                onPress={() => setPaymentType('upi')}
              >
                <Text style={[styles.labelBtnText, paymentType === 'upi' && styles.labelBtnTextActive]}>
                  UPI Account
                </Text>
              </TouchableOpacity>
            </View>

            {paymentType === 'card' ? (
              <View style={styles.modalForm}>
                <Text style={styles.inputLabel}>Card Brand</Text>
                <View style={styles.brandRow}>
                  {['Visa', 'Mastercard', 'Rupay'].map((b) => (
                    <TouchableOpacity
                      key={b}
                      style={[styles.brandBtn, cardBrand === b && styles.brandBtnActive]}
                      onPress={() => setCardBrand(b)}
                    >
                      <Text style={[styles.brandBtnText, cardBrand === b && styles.brandBtnTextActive]}>
                        {b}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.inputLabel}>Card Number (Last 4 Digits)</Text>
                <TextInput
                  style={styles.modalSingleInput}
                  placeholder="e.g. 4839"
                  placeholderTextColor="#94A3B8"
                  keyboardType="number-pad"
                  maxLength={4}
                  value={cardLast4}
                  onChangeText={setCardLast4}
                />
                
                <Text style={styles.inputLabel}>Expiry Date</Text>
                <TextInput
                  style={styles.modalSingleInput}
                  placeholder="MM/YY (e.g. 12/28)"
                  placeholderTextColor="#94A3B8"
                  value={cardExpiry}
                  onChangeText={setCardExpiry}
                />
              </View>
            ) : (
              <View style={styles.modalForm}>
                <Text style={styles.inputLabel}>UPI Address (VPA)</Text>
                <TextInput
                  style={styles.modalSingleInput}
                  placeholder="e.g. yugoo@paytm"
                  placeholderTextColor="#94A3B8"
                  autoCapitalize="none"
                  value={upiVpa}
                  onChangeText={setUpiVpa}
                />
              </View>
            )}

            <TouchableOpacity
              style={styles.modalActionBtn}
              onPress={handleSavePayment}
              disabled={isSavingPayment}
            >
              {isSavingPayment ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.modalActionBtnText}>Save Payment Details</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => {
                setPaymentModalVisible(false);
                setCardLast4('');
                setUpiVpa('');
              }}
            >
              <Text style={styles.modalCloseText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F2EB', // warm beige
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E4DFD5', // beige border
    backgroundColor: '#F5F2EB', // warm beige
  },
  backBtn: {
    paddingVertical: 4,
  },
  backBtnText: {
    fontSize: 14,
    color: '#C17750', // terracotta back button
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2B2A27', // charcoal
  },
  emptyHeaderBlock: {
    width: 60,
  },
  content: {
    padding: 16,
  },
  profileInfoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#1F1E1C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 15,
    elevation: 2,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F3EFE9', // light warm beige
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    borderWidth: 1,
    borderColor: '#E4DFD5',
  },
  avatarText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#C17750', // terracotta avatar letter
  },
  profileBrief: {
    flexDirection: 'column',
  },
  userFullName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2B2A27', // charcoal
  },
  userPhoneText: {
    fontSize: 13,
    color: '#8F8A80', // warm neutral grey
    marginTop: 2,
    fontWeight: '500',
  },
  detailText: {
    fontSize: 14,
    color: '#2B2A27', // charcoal text
    fontWeight: '500',
    marginBottom: 16,
  },
  detailsRow: {
    borderTopWidth: 1,
    borderTopColor: '#F3EFE9',
    paddingTop: 16,
  },
  detailsButtonRow: {
    flexDirection: 'column',
    gap: 8,
  },
  detailsEditBtn: {
    backgroundColor: '#F3EFE9', // light neutral bg
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  detailsEditBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#C17750', // terracotta button text
  },
  phoneChangeBtn: {
    backgroundColor: '#F3EFE9',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  phoneChangeBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2B2A27', // charcoal button text
  },
  editProfileForm: {
    borderTopWidth: 1,
    borderTopColor: '#F3EFE9',
    paddingTop: 16,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#2B2A27', // charcoal label
    marginBottom: 6,
  },
  input: {
    borderWidth: 1.5,
    borderColor: '#E4DFD5', // beige border
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    fontSize: 14,
    color: '#2B2A27',
    backgroundColor: '#FBF9F6', // off-white input bg
    marginBottom: 12,
  },
  editProfileActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 8,
  },
  smallBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtn: {
    backgroundColor: '#F3EFE9',
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8F8A80',
  },
  saveBtn: {
    backgroundColor: '#1F1E1C', // charcoal primary button
  },
  saveBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2B2A27', // charcoal
  },
  addSectionBtn: {
    fontSize: 13,
    color: '#C17750', // terracotta button
    fontWeight: '600',
  },
  listCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#1F1E1C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 15,
    elevation: 2,
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3EFE9',
  },
  listItemMeta: {
    flex: 1,
    paddingRight: 12,
  },
  listItemTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2B2A27',
  },
  listItemSubtitle: {
    fontSize: 12,
    color: '#8F8A80',
    marginTop: 2,
  },
  deleteItemBtnText: {
    fontSize: 12,
    color: '#EF4444',
    fontWeight: '600',
  },
  emptyListText: {
    fontSize: 13,
    color: '#8F8A80',
    textAlign: 'center',
    paddingVertical: 12,
  },
  spacer: {
    height: 40,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(31, 30, 28, 0.5)', // dark transparent overlay
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#1F1E1C',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2B2A27',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSub: {
    fontSize: 13,
    color: '#8F8A80',
    lineHeight: 18,
    marginBottom: 20,
    textAlign: 'center',
  },
  phoneInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E4DFD5',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
    backgroundColor: '#FBF9F6',
    marginBottom: 16,
  },
  phonePrefix: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2B2A27',
    marginRight: 8,
  },
  modalInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#2B2A27',
  },
  centerText: {
    textAlign: 'center',
    borderWidth: 1.5,
    borderColor: '#E4DFD5',
    borderRadius: 12,
    height: 48,
    backgroundColor: '#FBF9F6',
    marginBottom: 16,
    fontSize: 15,
    fontWeight: '600',
    color: '#2B2A27',
  },
  spacedLetter: {
    letterSpacing: 4,
    fontSize: 18,
  },
  modalSingleInput: {
    borderWidth: 1.5,
    borderColor: '#E4DFD5',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
    fontSize: 14,
    color: '#2B2A27',
    backgroundColor: '#FBF9F6',
    marginBottom: 16,
  },
  modalActionBtn: {
    backgroundColor: '#1F1E1C', // charcoal primary button
    borderRadius: 12,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  modalActionBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  modalCloseBtn: {
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 8,
  },
  modalCloseText: {
    color: '#8F8A80',
    fontWeight: '600',
    fontSize: 13,
  },
  labelSelectorRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  labelBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E4DFD5',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
    backgroundColor: '#FBF9F6',
  },
  labelBtnActive: {
    borderColor: '#C17750', // terracotta active border
    backgroundColor: '#F2EDE6', // subtle warm highlight
  },
  labelBtnText: {
    fontSize: 12,
    color: '#8F8A80',
    fontWeight: '600',
  },
  labelBtnTextActive: {
    color: '#C17750',
  },
  largeInput: {
    borderWidth: 1.5,
    borderColor: '#E4DFD5',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    height: 80,
    fontSize: 14,
    color: '#2B2A27',
    backgroundColor: '#FBF9F6',
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  modalForm: {
    marginVertical: 8,
  },
  brandRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  brandBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E4DFD5',
    borderRadius: 8,
    paddingVertical: 6,
    alignItems: 'center',
    backgroundColor: '#FBF9F6',
  },
  brandBtnActive: {
    borderColor: '#C17750',
    backgroundColor: '#F2EDE6',
  },
  brandBtnText: {
    fontSize: 12,
    color: '#8F8A80',
    fontWeight: '600',
  },
  brandBtnTextActive: {
    color: '#C17750',
  },
  listItemLandmark: {
    fontSize: 11,
    color: '#8F8A80',
    marginTop: 4,
    fontStyle: 'italic',
  },
  listItemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  editActionBtn: {
    paddingVertical: 4,
  },
  editItemBtnText: {
    fontSize: 12,
    color: '#C17750', // terracotta button
    fontWeight: '600',
  },
  modalScrollWrap: {
    width: '100%',
    maxHeight: 500,
  },
  modalScrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
  },
  inputCol: {
    flex: 1,
  },
  locateBtn: {
    backgroundColor: '#F3EFE9', // warm light bg
    borderWidth: 1,
    borderColor: '#E4DFD5',
    borderRadius: 12,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  locateBtnText: {
    color: '#C17750', // terracotta button text
    fontWeight: '600',
    fontSize: 12,
  },
  mapContainerWrap: {
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E4DFD5',
  },
  miniMap: {
    height: 140,
    width: '100%',
  },
  mapTipText: {
    fontSize: 11,
    color: '#8F8A80',
    textAlign: 'center',
    paddingVertical: 6,
    backgroundColor: '#FBF9F6',
    fontWeight: '500',
  },
});

export default ProfileScreen;
