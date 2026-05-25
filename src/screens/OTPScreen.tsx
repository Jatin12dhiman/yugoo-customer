import React, { useState, useRef, useEffect } from 'react';
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
  Keyboard,
  Image,
} from 'react-native';
import { RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAuth } from '../context/AuthContext';
import { RootStackParamList } from '../navigation/RootNavigator';

type OTPScreenRouteProp = RouteProp<RootStackParamList, 'OTP'>;
type OTPScreenNavigationProp = StackNavigationProp<RootStackParamList, 'OTP'>;

interface Props {
  route: OTPScreenRouteProp;
  navigation: OTPScreenNavigationProp;
}

const OTPScreen: React.FC<Props> = ({ route, navigation }) => {
  const { phone } = route.params;
  const { verifyOtp, sendOtp } = useAuth();
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(30);
  const [isResending, setIsResending] = useState(false);

  // Hidden text input ref for focus control
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    // Start countdown timer
    let interval: ReturnType<typeof setInterval>;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  useEffect(() => {
    // Focus the input on mount
    setTimeout(() => {
      inputRef.current?.focus();
    }, 300);
  }, []);

  const handleVerify = async (codeToVerify?: string) => {
    const activeOtp = typeof codeToVerify === 'string' ? codeToVerify : otp;
    if (activeOtp.length !== 6) {
      Alert.alert('Incomplete Code', 'Please enter all 6 digits of the OTP.');
      return;
    }

    Keyboard.dismiss();
    setIsLoading(true);
    try {
      const { isNewUser } = await verifyOtp(phone, activeOtp);
      setIsLoading(false);
      
      if (isNewUser) {
        // Redirect to register details capture
        navigation.navigate('Register', { phone });
      }
      // If not a new user, AuthContext will set accessToken and RootNavigator handles transition
    } catch (error: any) {
      setIsLoading(false);
      Alert.alert(
        'Verification Failed',
        error.response?.data?.message || 'The OTP entered is incorrect. Please try again.'
      );
    }
  };

  const handleResend = async () => {
    if (resendTimer > 0) return;
    setIsResending(true);
    try {
      const devOtp = await sendOtp(phone);
      setIsResending(false);
      setResendTimer(30);
      
      if (devOtp) {
        Alert.alert(
          'OTP Re-sent (Dev Mode)',
          `Use OTP code: ${devOtp} to verify.`
        );
      } else {
        Alert.alert('OTP Sent', 'A new verification code has been sent to your mobile number.');
      }
    } catch (error: any) {
      setIsResending(false);
      Alert.alert('Error', error.response?.data?.error || 'Failed to resend OTP. Please try again.');
    }
  };

  // Helper to render OTP boxes
  const renderOtpBoxes = () => {
    const boxes = [];
    for (let i = 0; i < 6; i++) {
      const digit = otp[i] || '';
      const isFocused = otp.length === i;
      boxes.push(
        <View
          key={i}
          style={[
            styles.otpBox,
            isFocused && styles.otpBoxFocused,
            digit !== '' && styles.otpBoxFilled,
          ]}
        >
          <Text style={styles.otpText}>{digit}</Text>
        </View>
      );
    }
    return boxes;
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        {/* Header branding */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Text style={styles.backButtonText}>← Back to Login</Text>
          </TouchableOpacity>
          <Image source={require('../assets/yugoLogo.jpeg')} style={styles.logoImage} resizeMode="contain" />
        </View>

        {/* Verification Card */}
        <View style={styles.card}>
          <Text style={styles.titleText}>Verify Your Number</Text>
          <Text style={styles.subtitleText}>
            We've sent a 6-digit confirmation code to{' '}
            <Text style={styles.phoneNumberHighlight}>{phone}</Text>
          </Text>

          {/* OTP Code Entry Boxes */}
          <TouchableOpacity
            activeOpacity={1}
            style={styles.otpGrid}
            onPress={() => inputRef.current?.focus()}
          >
            {renderOtpBoxes()}
          </TouchableOpacity>

          <TextInput
            ref={inputRef}
            style={styles.hiddenInput}
            keyboardType="number-pad"
            maxLength={6}
            value={otp}
            onChangeText={(text) => {
              const cleanText = text.replace(/[^0-9]/g, '');
              setOtp(cleanText);
              // Trigger verify automatically when 6 digits are typed
              if (cleanText.length === 6) {
                // Perform quick verify trigger after short layout rendering tick
                setTimeout(() => {
                  handleVerify(cleanText);
                }, 100);
              }
            }}
            caretHidden
          />

          {/* Verify Button */}
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => handleVerify()}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryButtonText}>Verify & Proceed</Text>
            )}
          </TouchableOpacity>

          {/* Resend Controls */}
          <View style={styles.resendContainer}>
            {resendTimer > 0 ? (
              <Text style={styles.timerText}>Resend code in {resendTimer}s</Text>
            ) : (
              <TouchableOpacity onPress={handleResend} disabled={isResending}>
                {isResending ? (
                  <ActivityIndicator size="small" color="#C17750" />
                ) : (
                  <Text style={styles.resendButtonText}>Resend OTP Code</Text>
                )}
              </TouchableOpacity>
            )}
          </View>
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
    marginBottom: 40,
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: 20,
  },
  backButtonText: {
    fontSize: 14,
    color: '#C17750', // terracotta back link
    fontWeight: '600',
  },
  logoImage: {
    width: 140,
    height: 55,
    alignSelf: 'center',
  },
  logoText: {
    fontSize: 36,
    fontWeight: '900',
    color: '#C17750', // terracotta brand logo
    textAlign: 'center',
    letterSpacing: -1,
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
    fontSize: 22,
    fontWeight: '700',
    color: '#2B2A27', // charcoal
    textAlign: 'center',
  },
  subtitleText: {
    fontSize: 14,
    color: '#8F8A80',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 32,
    lineHeight: 20,
  },
  phoneNumberHighlight: {
    color: '#2B2A27',
    fontWeight: '600',
  },
  otpGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  otpBox: {
    width: 44,
    height: 52,
    borderWidth: 1.5,
    borderColor: '#E4DFD5', // beige border
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FBF9F6', // off-white
  },
  otpBoxFocused: {
    borderColor: '#C17750', // terracotta focus border
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
  },
  otpBoxFilled: {
    borderColor: '#2B2A27', // charcoal filled border
  },
  otpText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2B2A27',
  },
  hiddenInput: {
    position: 'absolute',
    width: 0,
    height: 0,
    opacity: 0,
  },
  primaryButton: {
    backgroundColor: '#1F1E1C', // charcoal button
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
  resendContainer: {
    marginTop: 24,
    alignItems: 'center',
  },
  timerText: {
    fontSize: 13,
    color: '#8F8A80',
    fontWeight: '500',
  },
  resendButtonText: {
    fontSize: 14,
    color: '#C17750', // terracotta resend text
    fontWeight: '600',
  },
});

export default OTPScreen;
