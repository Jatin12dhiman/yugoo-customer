/**
 * API configuration for the Yugoo Customer App.
 *
 * IMPORTANT FOR PHYSICAL DEVICE DEVELOPMENT:
 * Since you are running the app on a physical phone, you CANNOT use 'localhost' or '127.0.0.1'.
 * You must use your computer's local IP address (e.g. 192.168.1.XX).
 * Make sure your phone and computer are on the same Wi-Fi network.
 *
 * To find your IP on Windows:
 * 1. Open PowerShell or Command Prompt.
 * 2. Type 'ipconfig' and press Enter.
 * 3. Look for 'IPv4 Address' under your active Wi-Fi or Ethernet adapter.
 */
export const LOCAL_COMPUTER_IP = '192.168.1.7'; // <-- CHANGE THIS to your PC's IP address

export const BASE_URL = `http://${LOCAL_COMPUTER_IP}:3000`;

export const API_ROUTES = {
  // Mobile OTP Auth
  sendOtp: `${BASE_URL}/api/auth/mobile/send-otp`,
  verifyOtp: `${BASE_URL}/api/auth/mobile/verify-otp`,
  completeOtpSignup: `${BASE_URL}/api/auth/customer/complete-otp-signup`,

  // Credential Auth
  signup: `${BASE_URL}/api/auth/customer/signup`,
  login: `${BASE_URL}/api/auth/customer/login`,
  socialLogin: `${BASE_URL}/api/auth/customer/social`,

  // Customer resource profile routes
  profile: `${BASE_URL}/api/customer/profile`,
  phoneChangeSendOtp: `${BASE_URL}/api/customer/profile/phone/send-otp`,
  phoneChangeVerifyOtp: `${BASE_URL}/api/customer/profile/phone/verify-otp`,
  addresses: `${BASE_URL}/api/customer/addresses`,
  paymentMethods: `${BASE_URL}/api/customer/payment-methods`,
  geocode: `${BASE_URL}/api/customer/geocode`,
  autocomplete: `${BASE_URL}/api/customer/places/autocomplete`,
  createBooking: `${BASE_URL}/api/customer/bookings`,
};
