import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_ROUTES } from '../config/api';

interface SavedAddress {
  _id?: string;
  label: string;
  address: string;
  street?: string;
  area?: string;
  city?: string;
  pincode?: string;
  flatLandmark?: string;
  lat: number;
  lng: number;
}

interface SavedPaymentMethod {
  id: string;
  methodType: 'card' | 'upi';
  cardDetails?: { brand: string; last4: string; expiry: string };
  upiDetails?: { vpa: string };
}

interface User {
  id: string;
  phone: string;
  name?: string;
  email?: string;
  avatar?: string;
  isVerified: boolean;
  walletBalance?: number;
  savedAddresses?: SavedAddress[];
  savedPaymentMethods?: SavedPaymentMethod[];
}

interface AuthContextType {
  user: User | null;
  accessToken: string | null;
  isLoading: boolean;
  tempSignupToken: string | null;
  tempSignupPhone: string | null;
  sendOtp: (phone: string) => Promise<string | null>; // Returns otp in dev mode
  verifyOtp: (phone: string, otp: string) => Promise<{ isNewUser: boolean }>;
  completeOtpSignup: (name: string, email?: string) => Promise<void>;
  loginWithCredentials: (email: string, password: string) => Promise<void>;
  signupWithCredentials: (name: string, email: string, phone: string, password: string) => Promise<void>;
  socialLogin: (provider: 'google' | 'apple', id: string, email: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (name: string, email: string, avatar?: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
  saveAddress: (
    label: string,
    addressOrStreet: string,
    latOrArea?: number | string,
    lngOrCity?: number | string,
    pincode?: string,
    flatLandmark?: string,
    lat?: number,
    lng?: number
  ) => Promise<void>;
  editAddress: (
    addressId: string,
    label: string,
    street: string,
    area: string,
    city: string,
    pincode: string,
    flatLandmark: string,
    lat?: number,
    lng?: number
  ) => Promise<void>;
  deleteAddress: (id: string) => Promise<void>;
  savePaymentMethod: (methodType: 'card' | 'upi', cardDetails?: any, upiDetails?: any, razorpayTokenId?: string) => Promise<void>;
  deletePaymentMethod: (id: string) => Promise<void>;
  changePhoneSendOtp: (newPhone: string) => Promise<string | null>; // Returns otp in dev mode
  changePhoneVerifyOtp: (newPhone: string, otp: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [tempSignupToken, setTempSignupToken] = useState<string | null>(null);
  const [tempSignupPhone, setTempSignupPhone] = useState<string | null>(null);

  // Load token and profile on startup
  useEffect(() => {
    const bootstrapAsync = async () => {
      try {
        const token = await AsyncStorage.getItem('accessToken');
        if (token) {
          // Fetch profile using token
          const res = await axios.get(API_ROUTES.profile, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.data?.success && res.data?.profile) {
            setAccessToken(token);
            setUser(res.data.profile);
          } else {
            // Token might be invalid
            await AsyncStorage.removeItem('accessToken');
            setAccessToken(null);
            setUser(null);
          }
        }
      } catch (e) {
        console.error('[AUTH_BOOTSTRAP_ERROR]', e);
        try {
          await AsyncStorage.removeItem('accessToken');
        } catch (_) {}
        setAccessToken(null);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    bootstrapAsync();
  }, []);

  // Set up auth token interceptor for general requests
  const getAuthHeaders = () => {
    return { Authorization: `Bearer ${accessToken}` };
  };

  const sendOtp = async (phone: string): Promise<string | null> => {
    const res = await axios.post(API_ROUTES.sendOtp, { phone });
    // Returns otp in dev response
    return res.data?.otp || null;
  };

  const verifyOtp = async (phone: string, otp: string): Promise<{ isNewUser: boolean }> => {
    const res = await axios.post(API_ROUTES.verifyOtp, { phone, otp, role: 'customer' });
    const { isNewUser } = res.data;

    if (isNewUser) {
      setTempSignupToken(res.data.signupToken);
      setTempSignupPhone(res.data.phone);
      return { isNewUser: true };
    } else {
      const { accessToken: token, user: userData } = res.data;
      await AsyncStorage.setItem('accessToken', token);
      setAccessToken(token);
      
      // Fetch full profile (as verifyOtp only returns partial user info)
      const profileRes = await axios.get(API_ROUTES.profile, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (profileRes.data?.success && profileRes.data?.profile) {
        setUser(profileRes.data.profile);
      } else {
        setUser(userData);
      }
      return { isNewUser: false };
    }
  };

  const completeOtpSignup = async (name: string, email?: string): Promise<void> => {
    if (!tempSignupToken) throw new Error('No active verification session');
    const res = await axios.post(API_ROUTES.completeOtpSignup, {
      signupToken: tempSignupToken,
      name,
      email,
    });
    const { accessToken: token, user: userData } = res.data;
    await AsyncStorage.setItem('accessToken', token);
    setAccessToken(token);
    setUser(userData);
    
    // Clear temp states
    setTempSignupToken(null);
    setTempSignupPhone(null);
  };

  const loginWithCredentials = async (email: string, password: string): Promise<void> => {
    const res = await axios.post(API_ROUTES.login, { email, password });
    const { accessToken: token } = res.data;
    await AsyncStorage.setItem('accessToken', token);
    setAccessToken(token);

    // Fetch full profile
    const profileRes = await axios.get(API_ROUTES.profile, {
      headers: { Authorization: `Bearer ${token}` },
    });
    setUser(profileRes.data.profile);
  };

  const signupWithCredentials = async (name: string, email: string, phone: string, password: string): Promise<void> => {
    const res = await axios.post(API_ROUTES.signup, { name, email, phone, password });
    const { accessToken: token, user: userData } = res.data;
    await AsyncStorage.setItem('accessToken', token);
    setAccessToken(token);
    setUser(userData);
  };

  const socialLogin = async (provider: 'google' | 'apple', id: string, email: string, name: string): Promise<void> => {
    const res = await axios.post(API_ROUTES.socialLogin, { provider, id, email, name });
    const { accessToken: token } = res.data;
    await AsyncStorage.setItem('accessToken', token);
    setAccessToken(token);

    // Fetch full profile
    const profileRes = await axios.get(API_ROUTES.profile, {
      headers: { Authorization: `Bearer ${token}` },
    });
    setUser(profileRes.data.profile);
  };

  const logout = async (): Promise<void> => {
    await AsyncStorage.removeItem('accessToken');
    setAccessToken(null);
    setUser(null);
  };

  const updateProfile = async (name: string, email: string, avatar?: string): Promise<void> => {
    const res = await axios.put(
      API_ROUTES.profile,
      { name, email, avatar },
      { headers: getAuthHeaders() }
    );
    if (res.data?.success && res.data?.profile) {
      setUser(res.data.profile);
    }
  };

  const refreshProfile = async (): Promise<void> => {
    if (!accessToken) return;
    const res = await axios.get(API_ROUTES.profile, { headers: getAuthHeaders() });
    if (res.data?.success && res.data?.profile) {
      setUser(res.data.profile);
    }
  };

  const saveAddress = async (
    label: string,
    addressOrStreet: string,
    latOrArea?: number | string,
    lngOrCity?: number | string,
    pincode?: string,
    flatLandmark?: string,
    lat?: number,
    lng?: number
  ): Promise<void> => {
    let payload: any = {};
    if (typeof latOrArea === 'string') {
      payload = {
        label,
        street: addressOrStreet,
        area: latOrArea,
        city: lngOrCity,
        pincode,
        flatLandmark,
        lat,
        lng,
      };
    } else {
      payload = {
        label,
        address: addressOrStreet,
        lat: latOrArea,
        lng: lngOrCity,
      };
    }

    const res = await axios.post(API_ROUTES.addresses, payload, {
      headers: getAuthHeaders(),
    });
    if (res.data?.success) {
      setUser(prev => prev ? { ...prev, savedAddresses: res.data.savedAddresses } : null);
    }
  };

  const editAddress = async (
    addressId: string,
    label: string,
    street: string,
    area: string,
    city: string,
    pincode: string,
    flatLandmark: string,
    lat?: number,
    lng?: number
  ): Promise<void> => {
    const res = await axios.put(
      API_ROUTES.addresses,
      { addressId, label, street, area, city, pincode, flatLandmark, lat, lng },
      { headers: getAuthHeaders() }
    );
    if (res.data?.success) {
      setUser(prev => prev ? { ...prev, savedAddresses: res.data.savedAddresses } : null);
    }
  };

  const deleteAddress = async (id: string): Promise<void> => {
    const res = await axios.delete(`${API_ROUTES.addresses}?id=${id}`, {
      headers: getAuthHeaders(),
    });
    if (res.data?.success) {
      setUser(prev => prev ? { ...prev, savedAddresses: res.data.savedAddresses } : null);
    }
  };

  const savePaymentMethod = async (methodType: 'card' | 'upi', cardDetails?: any, upiDetails?: any, razorpayTokenId?: string): Promise<void> => {
    const res = await axios.post(
      API_ROUTES.paymentMethods,
      { methodType, cardDetails, upiDetails, razorpayTokenId },
      { headers: getAuthHeaders() }
    );
    if (res.data?.success) {
      setUser(prev => prev ? { ...prev, savedPaymentMethods: res.data.savedPaymentMethods } : null);
    }
  };

  const deletePaymentMethod = async (id: string): Promise<void> => {
    const res = await axios.delete(`${API_ROUTES.paymentMethods}?id=${id}`, {
      headers: getAuthHeaders(),
    });
    if (res.data?.success) {
      setUser(prev => prev ? { ...prev, savedPaymentMethods: res.data.savedPaymentMethods } : null);
    }
  };

  const changePhoneSendOtp = async (newPhone: string): Promise<string | null> => {
    const res = await axios.post(
      API_ROUTES.phoneChangeSendOtp,
      { newPhone },
      { headers: getAuthHeaders() }
    );
    return res.data?.otp || null;
  };

  const changePhoneVerifyOtp = async (newPhone: string, otp: string): Promise<void> => {
    const res = await axios.post(
      API_ROUTES.phoneChangeVerifyOtp,
      { newPhone, otp },
      { headers: getAuthHeaders() }
    );
    if (res.data?.success) {
      setUser(prev => prev ? { ...prev, phone: res.data.phone } : null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        isLoading,
        tempSignupToken,
        tempSignupPhone,
        sendOtp,
        verifyOtp,
        completeOtpSignup,
        loginWithCredentials,
        signupWithCredentials,
        socialLogin,
        logout,
        updateProfile,
        refreshProfile,
        saveAddress,
        editAddress,
        deleteAddress,
        savePaymentMethod,
        deletePaymentMethod,
        changePhoneSendOtp,
        changePhoneVerifyOtp,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
