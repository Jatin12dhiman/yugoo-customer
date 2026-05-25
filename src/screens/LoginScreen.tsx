import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  Image,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAuth } from '../context/AuthContext';
import { RootStackParamList } from '../navigation/RootNavigator';

type LoginScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Login'>;

interface Props {
  navigation: LoginScreenNavigationProp;
}

const LoginScreen: React.FC<Props> = ({ navigation }) => {
  const { sendOtp } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [phone, setPhone] = useState('');

  const handlePhoneSubmit = async () => {
    if (!phone || phone.length !== 10) {
      Alert.alert('Invalid Phone', 'Please enter a valid 10-digit mobile number.');
      return;
    }

    setIsLoading(true);
    try {
      const formattedPhone = `+91${phone}`;
      const devOtp = await sendOtp(formattedPhone);
      setIsLoading(false);
      
      // In dev mode, let the user know what the OTP is
      if (devOtp) {
        Alert.alert(
          'OTP Sent (Dev Mode)',
          `Use OTP code: ${devOtp} to verify.`,
          [{ text: 'OK', onPress: () => navigation.navigate('OTP', { phone: formattedPhone }) }]
        );
      } else {
        navigation.navigate('OTP', { phone: formattedPhone });
      }
    } catch (error: any) {
      setIsLoading(false);
      Alert.alert('Error', error.response?.data?.error || 'Failed to send OTP. Please try again.');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        {/* Header Branding */}
        <View style={styles.header}>
          <Image source={require('../assets/yugoLogo.jpeg')} style={styles.logoImage} resizeMode="contain" />
          <Text style={styles.taglineText}>Hyperlocal Logistics, Reimagined</Text>
        </View>

        {/* Card Component */}
        <View style={styles.card}>
          <Text style={styles.titleText}>Enter Mobile Number</Text>
          <Text style={styles.subtitleText}>
            We will send a 6-digit OTP to verify your device.
          </Text>

          {/* Form Fields */}
          <View style={styles.inputContainer}>
            <View style={styles.phoneInputRow}>
              <Text style={styles.phonePrefix}>+91</Text>
              <TextInput
                style={styles.phoneInput}
                placeholder="98765 43210"
                placeholderTextColor="#94A3B8"
                keyboardType="number-pad"
                maxLength={10}
                value={phone}
                onChangeText={setPhone}
              />
            </View>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handlePhoneSubmit}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryButtonText}>Send Verification Code</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F2EB', // warm beige
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoImage: {
    width: 180,
    height: 70,
    marginBottom: 8,
  },
  logoText: {
    fontSize: 48,
    fontWeight: '900',
    color: '#C17750', // terracotta brand color
    letterSpacing: -1.5,
  },
  taglineText: {
    fontSize: 14,
    color: '#8F8A80', // warm neutral grey
    marginTop: 4,
    fontWeight: '500',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#1F1E1C',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 30,
    elevation: 8,
  },
  titleText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2B2A27', // charcoal
    textAlign: 'center',
  },
  subtitleText: {
    fontSize: 14,
    color: '#8F8A80',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
    lineHeight: 20,
  },
  inputContainer: {
    marginBottom: 20,
  },
  phoneInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E4DFD5', // beige border
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 56,
    backgroundColor: '#FBF9F6', // off-white input bg
  },
  phonePrefix: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2B2A27',
    marginRight: 10,
  },
  phoneInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#2B2A27',
  },
  primaryButton: {
    backgroundColor: '#1F1E1C', // charcoal black primary
    borderRadius: 16,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#1F1E1C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

export default LoginScreen;
