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
import { RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAuth } from '../context/AuthContext';
import { RootStackParamList } from '../navigation/RootNavigator';

type RegisterScreenRouteProp = RouteProp<RootStackParamList, 'Register'>;
type RegisterScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Register'>;

interface Props {
  route: RegisterScreenRouteProp;
  navigation: RegisterScreenNavigationProp;
}

const RegisterScreen: React.FC<Props> = ({ route, navigation }) => {
  const { phone } = route.params;
  const { completeOtpSignup } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleRegisterSubmit = async () => {
    if (!name || name.trim() === '') {
      Alert.alert('Required Field', 'Please enter your full name to register.');
      return;
    }

    setIsLoading(true);
    try {
      await completeOtpSignup(name.trim(), email.trim() || undefined);
      setIsLoading(false);
      // AuthContext will auto-transition to Home Screen on token update
    } catch (error: any) {
      setIsLoading(false);
      Alert.alert(
        'Registration Failed',
        error.response?.data?.message || 'Could not complete registration. Please try again.'
      );
    }
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
            <Text style={styles.backButtonText}>← Edit Number</Text>
          </TouchableOpacity>
          <Image source={require('../assets/yugoLogo.jpeg')} style={styles.logoImage} resizeMode="contain" />
        </View>

        {/* Profile Card */}
        <View style={styles.card}>
          <Text style={styles.titleText}>Complete Profile</Text>
          <Text style={styles.subtitleText}>
            You're verified at <Text style={styles.boldText}>{phone}</Text>. Tell us a bit about yourself to set up your account.
          </Text>

          {/* Form Fields */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Full Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Pankaj Kumar"
              placeholderTextColor="#94A3B8"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              autoComplete="name"
            />
            
            <Text style={styles.inputLabel}>Email Address (Optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. name@domain.com"
              placeholderTextColor="#94A3B8"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoComplete="email"
            />
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleRegisterSubmit}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryButtonText}>Complete & Start Booking</Text>
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
    marginBottom: 40,
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: 20,
  },
  backButtonText: {
    fontSize: 14,
    color: '#C17750', // terracotta back button
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
    color: '#C17750', // terracotta logo
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
    marginBottom: 24,
    lineHeight: 20,
  },
  boldText: {
    color: '#2B2A27',
    fontWeight: '600',
  },
  inputContainer: {
    marginBottom: 28,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2B2A27', // charcoal input label
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    borderWidth: 1.5,
    borderColor: '#E4DFD5', // beige border
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 52,
    fontSize: 15,
    color: '#2B2A27',
    backgroundColor: '#FBF9F6', // off-white input bg
  },
  infoText: {
    fontSize: 12,
    color: '#8F8A80',
    marginTop: 8,
    lineHeight: 16,
  },
  primaryButton: {
    backgroundColor: '#1F1E1C', // charcoal primary button
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

export default RegisterScreen;
