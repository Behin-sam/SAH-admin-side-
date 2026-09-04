/**
 * Login Screen
 * Entry point for the veteran wellness app
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
  Image,
} from 'react-native';
import { useAuth } from '../../App';
import { theme } from '../constants/theme';

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }

    setLoading(true);
    const result = await login(email, password);
    setLoading(false);

    if (result.success) {
      // Navigate to assessment for first-time users
      navigation.navigate('Assessment');
    } else {
      Alert.alert('Error', result.error || 'Login failed');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.content}>
          {/* Logo/Icon */}
          <View style={styles.logoContainer}>
            <Text style={styles.logoIcon}>🎖️</Text>
            <Text style={styles.logoText}>SAH</Text>
            <Text style={styles.tagline}>Veteran Wellness</Text>
          </View>

          {/* Welcome Message */}
          <View style={styles.welcomeContainer}>
            <Text style={styles.welcomeTitle}>Welcome Back, Warrior</Text>
            <Text style={styles.welcomeSubtitle}>
              Your daily wellness journey continues
            </Text>
          </View>

          {/* Login Form */}
          <View style={styles.formContainer}>
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Email</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="Enter your email"
                placeholderTextColor="#9ca3af"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Password</Text>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="Enter your password"
                placeholderTextColor="#9ca3af"
                secureTextEntry
              />
            </View>

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={loading}
            >
              <Text style={styles.buttonText}>
                {loading ? 'Signing in...' : 'Sign In'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.forgotPassword}>
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            </TouchableOpacity>
          </View>

          {/* Quick Access */}
          <View style={styles.quickAccessContainer}>
            <Text style={styles.quickAccessTitle}>Quick Access</Text>
            <TouchableOpacity
              style={styles.adminButton}
              onPress={() => navigation.navigate('Admin')}
            >
              <Text style={styles.adminButtonText}>📋 Admin Dashboard</Text>
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Your data is encrypted and secure
            </Text>
            <Text style={styles.footerText}>
              You're not alone in this journey 💪
            </Text>
          </View>
        </View>
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
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoIcon: {
    fontSize: 60,
    marginBottom: 10,
  },
  logoText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: theme.colors.espresso[900],
    letterSpacing: 2,
  },
  tagline: {
    fontSize: 16,
    color: theme.colors.rust[500],
    fontWeight: '700',
    marginTop: 5,
  },
  welcomeContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.espresso[900],
    marginBottom: 8,
  },
  welcomeSubtitle: {
    fontSize: 14,
    color: theme.colors.espresso[400],
    textAlign: 'center',
  },
  formContainer: {
    marginBottom: 30,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    color: theme.colors.espresso[900],
    marginBottom: 8,
    fontWeight: '700',
  },
  input: {
    backgroundColor: theme.colors.cream[50],
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.cream[400],
    padding: 16,
    fontSize: 16,
    color: theme.colors.espresso[900],
  },
  button: {
    backgroundColor: theme.colors.rust[500],
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 10,
    ...theme.shadows.rustGlow,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  forgotPassword: {
    alignItems: 'center',
    marginTop: 15,
  },
  forgotPasswordText: {
    color: theme.colors.rust[500],
    fontSize: 14,
    fontWeight: '600',
  },
  quickAccessContainer: {
    marginBottom: 30,
  },
  quickAccessTitle: {
    fontSize: 14,
    color: theme.colors.espresso[400],
    textAlign: 'center',
    marginBottom: 10,
  },
  adminButton: {
    backgroundColor: theme.colors.espresso[900],
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  adminButtonText: {
    color: '#e5e7eb',
    fontSize: 14,
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
  },
  footerText: {
    color: theme.colors.espresso[400],
    fontSize: 12,
    marginBottom: 5,
  },
});

export default LoginScreen;
