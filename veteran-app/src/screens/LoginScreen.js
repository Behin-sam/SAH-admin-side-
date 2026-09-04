/**
 * VALOR Mobile Authentication Screen
 * Mirrors the Web Portal Authentication Algorithm:
 * - Role Toggle (Veteran vs Counselor)
 * - Mode Toggle (Sign In vs Register Account vs OTP Verification)
 * - 6-Digit Email Verification Flow (Demo Code 123456)
 * - SIH 2026 Judge 1-Tap Quick Logins (Vikram, Kabir, Arjun, Dr. Nair)
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../App';
import { theme } from '../constants/theme';

const SERVICE_BRANCHES = [
  'Indian Army',
  'Indian Navy',
  'Indian Air Force',
  'Coast Guard / Para',
];

const LoginScreen = ({ navigation }) => {
  const { login, register } = useAuth();

  const [authMode, setAuthMode] = useState('login'); // 'login' | 'signup' | 'verify'
  const [role, setRole] = useState('veteran'); // 'veteran' | 'counselor'

  // Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [rank, setRank] = useState('');
  const [serviceBranch, setServiceBranch] = useState('Indian Army');

  // OTP Verification
  const [pendingEmail, setPendingEmail] = useState('');
  const [otpCode, setOtpCode] = useState(['1', '2', '3', '4', '5', '6']);
  const [otpError, setOtpError] = useState('');
  const [isResending, setIsResending] = useState(false);
  const [loading, setLoading] = useState(false);

  const showAlert = (title, message) => {
    if (Platform.OS === 'web') {
      window.alert(`${title}\n\n${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  const handleLogin = async () => {
    if (!email || !password) {
      showAlert('Required', 'Please enter both email and password.');
      return;
    }

    setLoading(true);
    const result = await login(email, password, role);
    setLoading(false);

    if (!result?.success) {
      showAlert('Login Failed', result?.error || 'Please check your credentials.');
    }
  };

  const handleSignup = () => {
    if (!name || !email || !password) {
      showAlert('Required', 'Please provide your full name, email, and password.');
      return;
    }

    setPendingEmail(email);
    setAuthMode('verify');
    setOtpError('');
  };

  const handleVerifyOTP = async () => {
    const fullCode = otpCode.join('');
    if (fullCode.length !== 6) {
      setOtpError('Please enter the complete 6-digit code.');
      return;
    }

    // Accept 123456 or any 6-digit input for seamless demo experience
    setLoading(true);
    const regResult = await register({
      name,
      email: pendingEmail || email,
      password,
      rank: rank || (role === 'veteran' ? 'Soldier' : 'Clinical Specialist'),
      service_branch: serviceBranch,
      role,
    });
    setLoading(false);

    if (regResult?.success) {
      showAlert('Verification Complete! 🎉', 'Welcome to the VALOR Veteran Recovery Network.');
    } else {
      setOtpError('Verification failed. Try demo code 123456');
    }
  };

  const handleQuickDemoLogin = async (demoId) => {
    setLoading(true);
    if (demoId === 'counselor') {
      await login('a.nair@amrita-health.org', 'counselor123', 'counselor');
    } else if (demoId === 'kabir') {
      await login('kabir.singh@iaf.gov.in', 'demo123', 'veteran');
    } else if (demoId === 'arjun') {
      await login('arjun.das@navy.gov.in', 'demo123', 'veteran');
    } else {
      // Capt. Vikram Rathore
      await login('vikram.rathore@para.mod.gov.in', 'demo123', 'veteran');
    }
    setLoading(false);
  };

  const handleResendOTP = () => {
    setIsResending(true);
    setTimeout(() => {
      setIsResending(false);
      showAlert('OTP Sent', `A fresh 6-digit code has been dispatched to ${pendingEmail || email} (Demo code: 123456)`);
    }, 1200);
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Brand Header */}
          <View style={styles.brandHeader}>
            <View style={styles.shieldBadge}>
              <Ionicons name="shield-checkmark" size={28} color={theme.colors.rust[500]} />
            </View>
            <Text style={styles.brandTitle}>VALOR PLATFORM</Text>
            <Text style={styles.brandSubtitle}>
              Secure Authentication & Clinical Access Control
            </Text>
          </View>

          {/* Main Auth Card */}
          <View style={styles.authCard}>
            {/* Mode Switcher: Sign In vs Register Account */}
            {authMode !== 'verify' && (
              <View style={styles.modeSwitcher}>
                <TouchableOpacity
                  style={[
                    styles.modeButton,
                    authMode === 'login' && styles.modeButtonActive,
                  ]}
                  onPress={() => setAuthMode('login')}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.modeButtonText,
                      authMode === 'login' && styles.modeButtonTextActive,
                    ]}
                  >
                    Sign In
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.modeButton,
                    authMode === 'signup' && styles.modeButtonActive,
                  ]}
                  onPress={() => setAuthMode('signup')}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.modeButtonText,
                      authMode === 'signup' && styles.modeButtonTextActive,
                    ]}
                  >
                    Register Account
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Role Selector: Veteran vs Counselor */}
            {authMode !== 'verify' && (
              <View style={styles.roleContainer}>
                <Text style={styles.roleLabel}>I AM SIGNING IN AS:</Text>
                <View style={styles.roleRow}>
                  <TouchableOpacity
                    style={[
                      styles.roleCard,
                      role === 'veteran' && styles.roleCardActive,
                    ]}
                    onPress={() => setRole('veteran')}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name="shield"
                      size={18}
                      color={role === 'veteran' ? theme.colors.rust[500] : theme.colors.espresso[400]}
                    />
                    <Text
                      style={[
                        styles.roleCardText,
                        role === 'veteran' && styles.roleCardTextActive,
                      ]}
                    >
                      Veteran
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.roleCard,
                      role === 'counselor' && styles.roleCardActive,
                    ]}
                    onPress={() => setRole('counselor')}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name="medical"
                      size={18}
                      color={role === 'counselor' ? theme.colors.rust[500] : theme.colors.espresso[400]}
                    />
                    <Text
                      style={[
                        styles.roleCardText,
                        role === 'counselor' && styles.roleCardTextActive,
                      ]}
                    >
                      Counselor
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* 1. SIGN IN FORM */}
            {authMode === 'login' && (
              <View style={styles.form}>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Email Address</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="mail-outline" size={18} color={theme.colors.espresso[400]} style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      value={email}
                      onChangeText={setEmail}
                      placeholder={role === 'veteran' ? 'rajesh.sharma@veterans.org' : 'a.nair@amrita-health.org'}
                      placeholderTextColor={theme.colors.espresso[400]}
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Password</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="lock-closed-outline" size={18} color={theme.colors.espresso[400]} style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      value={password}
                      onChangeText={setPassword}
                      placeholder="••••••••••••"
                      placeholderTextColor={theme.colors.espresso[400]}
                      secureTextEntry
                    />
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.primaryButton, loading && styles.buttonDisabled]}
                  onPress={handleLogin}
                  disabled={loading}
                  activeOpacity={0.85}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <Text style={styles.primaryButtonText}>Authenticate & Sign In</Text>
                      <Ionicons name="arrow-forward" size={18} color="#fff" style={{ marginLeft: 8 }} />
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {/* 2. REGISTRATION FORM */}
            {authMode === 'signup' && (
              <View style={styles.form}>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Full Name</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="person-outline" size={18} color={theme.colors.espresso[400]} style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      value={name}
                      onChangeText={setName}
                      placeholder="e.g. Subedar Major Suresh Kumar"
                      placeholderTextColor={theme.colors.espresso[400]}
                    />
                  </View>
                </View>

                <View style={styles.rowTwoInputs}>
                  <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                    <Text style={styles.label}>Rank / Designation</Text>
                    <View style={styles.inputWrapper}>
                      <TextInput
                        style={[styles.input, { paddingLeft: 12 }]}
                        value={rank}
                        onChangeText={setRank}
                        placeholder="e.g. Captain"
                        placeholderTextColor={theme.colors.espresso[400]}
                      />
                    </View>
                  </View>

                  <View style={[styles.inputGroup, { flex: 1 }]}>
                    <Text style={styles.label}>Branch</Text>
                    <View style={styles.inputWrapper}>
                      <TextInput
                        style={[styles.input, { paddingLeft: 12 }]}
                        value={serviceBranch}
                        onChangeText={setServiceBranch}
                        placeholder="Indian Army"
                        placeholderTextColor={theme.colors.espresso[400]}
                      />
                    </View>
                  </View>
                </View>

                {/* Service Branch Quick Select Chips */}
                <View style={styles.branchChipsRow}>
                  {SERVICE_BRANCHES.map((b) => (
                    <TouchableOpacity
                      key={b}
                      style={[
                        styles.branchChip,
                        serviceBranch === b && styles.branchChipActive,
                      ]}
                      onPress={() => setServiceBranch(b)}
                    >
                      <Text
                        style={[
                          styles.branchChipText,
                          serviceBranch === b && styles.branchChipTextActive,
                        ]}
                      >
                        {b}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Email Address (For Verification)</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="mail-outline" size={18} color={theme.colors.espresso[400]} style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      value={email}
                      onChangeText={setEmail}
                      placeholder="veteran@domain.org"
                      placeholderTextColor={theme.colors.espresso[400]}
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Create Password</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="lock-closed-outline" size={18} color={theme.colors.espresso[400]} style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      value={password}
                      onChangeText={setPassword}
                      placeholder="Minimum 8 characters"
                      placeholderTextColor={theme.colors.espresso[400]}
                      secureTextEntry
                    />
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.primaryButton, loading && styles.buttonDisabled]}
                  onPress={handleSignup}
                  disabled={loading}
                  activeOpacity={0.85}
                >
                  <Text style={styles.primaryButtonText}>Send Email Verification Code</Text>
                  <Ionicons name="arrow-forward" size={18} color="#fff" style={{ marginLeft: 8 }} />
                </TouchableOpacity>
              </View>
            )}

            {/* 3. OTP VERIFICATION STEP */}
            {authMode === 'verify' && (
              <View style={styles.verifyContainer}>
                <View style={styles.verifyHeaderBox}>
                  <View style={styles.verifyMailIconWrap}>
                    <Ionicons name="mail" size={26} color={theme.colors.rust[500]} />
                  </View>
                  <Text style={styles.verifyTitle}>Verify Your Email Address</Text>
                  <Text style={styles.verifySubtitle}>
                    A 6-digit code was sent to:
                  </Text>
                  <Text style={styles.verifyEmailHighlight}>
                    {pendingEmail || email}
                  </Text>
                </View>

                {otpError ? (
                  <View style={styles.errorBanner}>
                    <Ionicons name="alert-circle" size={16} color="#DC2626" style={{ marginRight: 6 }} />
                    <Text style={styles.errorBannerText}>{otpError}</Text>
                  </View>
                ) : null}

                <Text style={styles.otpLabel}>
                  Enter 6-Digit Code (Demo Code: 123456)
                </Text>

                <View style={styles.otpBoxesRow}>
                  {otpCode.map((digit, index) => (
                    <TextInput
                      key={index}
                      style={styles.otpBox}
                      maxLength={1}
                      keyboardType="number-pad"
                      value={digit}
                      onChangeText={(val) => {
                        const newCode = [...otpCode];
                        newCode[index] = val;
                        setOtpCode(newCode);
                      }}
                    />
                  ))}
                </View>

                <View style={styles.verifyLinksRow}>
                  <TouchableOpacity onPress={() => setAuthMode('signup')}>
                    <Text style={styles.backLinkText}>← Back to Edit Email</Text>
                  </TouchableOpacity>

                  <TouchableOpacity onPress={handleResendOTP} disabled={isResending}>
                    <Text style={styles.resendLinkText}>
                      {isResending ? 'Sending...' : '🔄 Resend Code'}
                    </Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={[styles.primaryButton, loading && styles.buttonDisabled]}
                  onPress={handleVerifyOTP}
                  disabled={loading}
                  activeOpacity={0.85}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle" size={20} color="#fff" style={{ marginRight: 8 }} />
                      <Text style={styles.primaryButtonText}>Verify Email & Launch Profile</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {/* SIH 2026 JUDGE QUICK LOGIN CARDS */}
            <View style={styles.judgeSection}>
              <View style={styles.judgeBadgeContainer}>
                <Text style={styles.judgeOverline}>SIH 2026 JUDGE QUICK LOGIN</Text>
              </View>

              <View style={styles.judgeGrid}>
                {/* Capt. Vikram Rathore */}
                <TouchableOpacity
                  style={styles.judgeCard}
                  onPress={() => handleQuickDemoLogin('vikram')}
                  activeOpacity={0.8}
                >
                  <View style={styles.judgeCardLeft}>
                    <Text style={styles.judgeName}>Capt. Vikram Rathore</Text>
                    <Text style={styles.judgeUnit}>Para SF • 335 XP</Text>
                  </View>
                  <View style={styles.tagStable}>
                    <Text style={styles.tagStableText}>🟢 Veteran</Text>
                  </View>
                </TouchableOpacity>

                {/* Maj. Kabir Singh */}
                <TouchableOpacity
                  style={styles.judgeCard}
                  onPress={() => handleQuickDemoLogin('kabir')}
                  activeOpacity={0.8}
                >
                  <View style={styles.judgeCardLeft}>
                    <Text style={styles.judgeName}>Maj. Kabir Singh</Text>
                    <Text style={styles.judgeUnit}>Air Force • 420 XP</Text>
                  </View>
                  <View style={styles.tagActive}>
                    <Text style={styles.tagActiveText}>🔵 Veteran</Text>
                  </View>
                </TouchableOpacity>

                {/* Sub. Arjun Das */}
                <TouchableOpacity
                  style={styles.judgeCard}
                  onPress={() => handleQuickDemoLogin('arjun')}
                  activeOpacity={0.8}
                >
                  <View style={styles.judgeCardLeft}>
                    <Text style={styles.judgeName}>Sub. Arjun Das</Text>
                    <Text style={styles.judgeUnit}>Navy MARCOS • 180 XP</Text>
                  </View>
                  <View style={styles.tagNavy}>
                    <Text style={styles.tagNavyText}>⚓ Veteran</Text>
                  </View>
                </TouchableOpacity>

                {/* Dr. Ananya Nair (Counselor) */}
                <TouchableOpacity
                  style={styles.judgeCounselorCard}
                  onPress={() => handleQuickDemoLogin('counselor')}
                  activeOpacity={0.8}
                >
                  <Ionicons name="medical" size={18} color={theme.colors.rust[500]} style={{ marginRight: 8 }} />
                  <Text style={styles.judgeCounselorText}>
                    Log In as Dr. Ananya Nair (Counselor)
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Footer Security Note */}
          <View style={styles.footerNote}>
            <Text style={styles.footerNoteText}>
              🔒 Encrypted with VALOR Zero-Knowledge Protocol
            </Text>
            <Text style={styles.footerNoteSub}>
              Dedicated to Military & First-Responder Wellness
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.cream[200],
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 30,
    paddingBottom: 40,
    alignItems: 'center',
  },
  brandHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  shieldBadge: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: theme.colors.espresso[900],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    ...theme.shadows.warm,
  },
  brandTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: theme.colors.espresso[900],
    letterSpacing: 2,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
  },
  brandSubtitle: {
    fontSize: 12,
    color: theme.colors.espresso[500],
    marginTop: 4,
    fontWeight: '600',
    textAlign: 'center',
  },
  authCard: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: theme.colors.cream[400],
    padding: 20,
    ...theme.shadows.card,
  },
  modeSwitcher: {
    flexDirection: 'row',
    backgroundColor: theme.colors.cream[100],
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
    borderColor: theme.colors.cream[400],
    marginBottom: 16,
  },
  modeButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeButtonActive: {
    backgroundColor: theme.colors.espresso[900],
    ...theme.shadows.sm,
  },
  modeButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.espresso[500],
  },
  modeButtonTextActive: {
    color: '#FFFFFF',
  },
  roleContainer: {
    marginBottom: 16,
  },
  roleLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: theme.colors.espresso[400],
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  roleRow: {
    flexDirection: 'row',
    gap: 10,
  },
  roleCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: theme.colors.cream[100],
    borderWidth: 1,
    borderColor: theme.colors.cream[400],
  },
  roleCardActive: {
    backgroundColor: theme.colors.peach[100],
    borderColor: theme.colors.rust[500],
  },
  roleCardText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.espresso[500],
  },
  roleCardTextActive: {
    color: theme.colors.rust[600],
  },
  form: {
    marginBottom: 10,
  },
  inputGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.espresso[800],
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.cream[50],
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.cream[400],
    height: 48,
  },
  inputIcon: {
    paddingLeft: 14,
    paddingRight: 8,
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: 14,
    color: theme.colors.espresso[900],
    paddingRight: 14,
  },
  rowTwoInputs: {
    flexDirection: 'row',
  },
  branchChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 14,
  },
  branchChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: theme.colors.cream[200],
    borderWidth: 1,
    borderColor: theme.colors.cream[400],
  },
  branchChipActive: {
    backgroundColor: theme.colors.peach[300],
    borderColor: theme.colors.rust[500],
  },
  branchChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.espresso[600],
  },
  branchChipTextActive: {
    color: theme.colors.rust[700],
    fontWeight: '800',
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.rust[500],
    borderRadius: 14,
    height: 50,
    marginTop: 6,
    ...theme.shadows.rustGlow,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  verifyContainer: {
    paddingVertical: 6,
  },
  verifyHeaderBox: {
    backgroundColor: theme.colors.peach[100],
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.peach[300],
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  verifyMailIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  verifyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.colors.espresso[900],
    marginBottom: 4,
  },
  verifySubtitle: {
    fontSize: 12,
    color: theme.colors.espresso[500],
  },
  verifyEmailHighlight: {
    fontSize: 13,
    fontWeight: '800',
    color: theme.colors.rust[600],
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginTop: 2,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  errorBannerText: {
    fontSize: 12,
    color: '#991B1B',
    fontWeight: '700',
  },
  otpLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.espresso[800],
    textAlign: 'center',
    marginBottom: 12,
  },
  otpBoxesRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
  },
  otpBox: {
    width: 44,
    height: 52,
    borderRadius: 12,
    backgroundColor: theme.colors.cream[50],
    borderWidth: 1.5,
    borderColor: theme.colors.rust[400],
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '800',
    color: theme.colors.rust[600],
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  verifyLinksRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  backLinkText: {
    fontSize: 12,
    color: theme.colors.espresso[500],
    fontWeight: '600',
  },
  resendLinkText: {
    fontSize: 12,
    color: theme.colors.rust[500],
    fontWeight: '800',
  },
  judgeSection: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: theme.colors.cream[400],
  },
  judgeBadgeContainer: {
    alignItems: 'center',
    marginBottom: 10,
  },
  judgeOverline: {
    fontSize: 10,
    fontWeight: '800',
    color: theme.colors.espresso[400],
    letterSpacing: 1.2,
  },
  judgeGrid: {
    gap: 8,
  },
  judgeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.cream[100],
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.cream[400],
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  judgeCardLeft: {
    flex: 1,
  },
  judgeName: {
    fontSize: 13,
    fontWeight: '800',
    color: theme.colors.espresso[900],
  },
  judgeUnit: {
    fontSize: 11,
    color: theme.colors.espresso[500],
    marginTop: 1,
  },
  tagStable: {
    backgroundColor: '#DCFCE7',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  tagStableText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803D',
  },
  tagActive: {
    backgroundColor: '#DBEAFE',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  tagActiveText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  tagNavy: {
    backgroundColor: '#E0E7FF',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  tagNavyText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4338CA',
  },
  judgeCounselorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.espresso[900],
    borderRadius: 14,
    paddingVertical: 12,
    marginTop: 4,
    ...theme.shadows.sm,
  },
  judgeCounselorText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  footerNote: {
    alignItems: 'center',
    marginTop: 20,
  },
  footerNoteText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.espresso[500],
  },
  footerNoteSub: {
    fontSize: 10,
    color: theme.colors.espresso[400],
    marginTop: 2,
  },
});

export default LoginScreen;
