/**
 * Crisis Screen
 * Emergency contacts, crisis hotlines, and immediate support resources
 * Styled with VALOR trauma-informed design system
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../constants/theme';

const CRISIS_RESOURCES = [
  {
    id: 'vcl',
    name: 'Veterans Crisis Line',
    phone: '988',
    subtitle: 'Press 1 after calling',
    description: 'Free, confidential support 24/7 for veterans and their families.',
    color: '#DC2626',
    icon: 'call',
  },
  {
    id: 'va',
    name: 'VA Health Crisis Line',
    phone: '1-800-273-8255',
    subtitle: 'Press 1 for Veterans',
    description: 'National Suicide Prevention Lifeline with veteran-specialized responders.',
    color: '#2563eb',
    icon: 'medical',
  },
  {
    id: 'text',
    name: 'Crisis Text Line',
    phone: null,
    text: 'Text HOME to 741741',
    description: 'Free 24/7 text-based crisis intervention and grounding.',
    color: '#7C3AED',
    icon: 'chatbubbles',
  },
  {
    id: 'tdd',
    name: 'TTY Support (Deaf/Hard of Hearing)',
    phone: '1-800-799-4889',
    subtitle: 'TTY available 24/7',
    description: 'Accessible crisis helpline for deaf or hard of hearing service members.',
    color: '#059669',
    icon: 'accessibility',
  },
];

const QUICK_ACTIONS = [
  {
    id: 'call',
    title: '📞 Call 988 (Press 1)',
    description: 'Immediate 24/7 phone support with veteran responder',
    phone: '988',
    color: '#DC2626',
  },
  {
    id: 'text',
    title: '💬 Text HOME to 741741',
    description: 'Direct quiet text support',
    action: 'text',
    color: '#7C3AED',
  },
  {
    id: 'chat',
    title: '💻 Online Confidential Chat',
    description: 'veteranscrisisline.net/chat',
    url: 'https://www.veteranscrisisline.net/get-help-now/chat',
    color: '#D96B27',
  },
  {
    id: 'nearest',
    title: '📍 Nearest VA Hospital / Clinic',
    description: 'Find physical walk-in emergency care facility',
    url: 'https://www.va.gov/find-locations/',
    color: '#059669',
  },
];

const SAFETY_PLAN = [
  'Recognize your personal warning signs (agitation, sensory overload, isolation).',
  'Engage 5-4-3-2-1 sensory grounding or 4-7-8 box breathing.',
  'Reach out to your trusted battle buddy or family member.',
  'Contact your primary clinical counselor Dr. Ananya Nair.',
  'Call the Veterans Crisis Line (Dial 988, then press 1).',
  'Proceed safely to your nearest VA Medical Center or Emergency Department.',
];

const CrisisScreen = ({ navigation }) => {
  const handleCall = (phone) => {
    Linking.openURL(`tel:${phone}`).catch(() => {
      Alert.alert('Phone Call', `Please dial ${phone} directly from your phone app.`);
    });
  };

  const handleText = () => {
    Alert.alert(
      'Send Text to 741741',
      'This will open your messaging app to text "HOME" to 741741.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Open Messages',
          onPress: () => Linking.openURL('sms:741741?body=HOME').catch(() => {}),
        },
      ]
    );
  };

  const handleURL = (url) => {
    Linking.openURL(url).catch(() => {
      Alert.alert('Open Browser', `Please visit: ${url}`);
    });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* Emergency SOS Header */}
      <View style={styles.emergencyHeader}>
        <View style={styles.headerIconCircle}>
          <Ionicons name="shield-alert" size={32} color="#fff" />
        </View>
        <Text style={styles.emergencyTitle}>Immediate Crisis Support</Text>
        <Text style={styles.emergencySubtitle}>
          You are never alone. Confidential, free support is available 24/7.
        </Text>
      </View>

      {/* Primary Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Urgent Actions</Text>
        {QUICK_ACTIONS.map((action) => (
          <TouchableOpacity
            key={action.id}
            style={[styles.quickAction, { borderLeftColor: action.color }]}
            onPress={() => {
              if (action.phone) handleCall(action.phone);
              else if (action.action === 'text') handleText();
              else if (action.url) handleURL(action.url);
            }}
          >
            <View style={styles.quickActionContent}>
              <Text style={styles.quickActionTitle}>{action.title}</Text>
              <Text style={styles.quickActionDesc}>{action.description}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.espresso[400]} />
          </TouchableOpacity>
        ))}
      </View>

      {/* Crisis Hotlines */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Emergency Helplines</Text>
        {CRISIS_RESOURCES.map((resource) => (
          <View key={resource.id} style={styles.resourceCard}>
            <View style={[styles.resourceIcon, { backgroundColor: resource.color + '15' }]}>
              <Ionicons name={resource.icon} size={22} color={resource.color} />
            </View>
            <View style={styles.resourceInfo}>
              <Text style={styles.resourceName}>{resource.name}</Text>
              <Text style={styles.resourceDesc}>{resource.description}</Text>
              {resource.phone ? (
                <TouchableOpacity onPress={() => handleCall(resource.phone)} style={styles.dialButton}>
                  <Ionicons name="call" size={14} color="#fff" style={{ marginRight: 6 }} />
                  <Text style={styles.dialButtonText}>
                    Dial {resource.phone} {resource.subtitle ? `(${resource.subtitle})` : ''}
                  </Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity onPress={() => handleText()} style={[styles.dialButton, { backgroundColor: resource.color }]}>
                  <Ionicons name="chatbubble-ellipses" size={14} color="#fff" style={{ marginRight: 6 }} />
                  <Text style={styles.dialButtonText}>{resource.text}</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        ))}
      </View>

      {/* Safety Protocol Plan */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Your Step-by-Step Safety Plan</Text>
        <Text style={styles.safetyPlanIntro}>
          If feelings of distress, panic, or thoughts of harm occur, follow these 6 steps in sequence:
        </Text>
        {SAFETY_PLAN.map((step, index) => (
          <View key={index} style={styles.safetyStep}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>{index + 1}</Text>
            </View>
            <Text style={styles.stepText}>{step}</Text>
          </View>
        ))}
      </View>

      {/* Compassionate Message Box */}
      <View style={styles.comfortContainer}>
        <Ionicons name="heart" size={32} color={theme.colors.rust[500]} style={{ marginBottom: 8 }} />
        <Text style={styles.comfortText}>
          "Your service was profound. Your survival matters. There is always hope and another dawn."
        </Text>
        <Text style={styles.comfortSubtext}>
          Dr. Ananya Nair & The SAH Clinical Team
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.cream[200],
  },
  scrollContent: {
    paddingBottom: 110,
  },
  emergencyHeader: {
    backgroundColor: theme.colors.status.urgent,
    padding: 24,
    paddingTop: 32,
    alignItems: 'center',
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    ...theme.shadows.warmMd,
  },
  headerIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  emergencyTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: -0.5,
  },
  emergencySubtitle: {
    fontSize: 14,
    color: '#FEE2E2',
    marginTop: 6,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 16,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.espresso[900],
    marginBottom: 12,
    letterSpacing: -0.3,
  },
  quickAction: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.cream[50],
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderLeftWidth: 5,
    borderWidth: 1,
    borderColor: theme.colors.cream[400],
    ...theme.shadows.warm,
  },
  quickActionContent: {
    flex: 1,
  },
  quickActionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: theme.colors.espresso[900],
    marginBottom: 4,
  },
  quickActionDesc: {
    fontSize: 13,
    color: theme.colors.espresso[400],
  },
  resourceCard: {
    flexDirection: 'row',
    backgroundColor: theme.colors.cream[50],
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.cream[400],
    padding: 16,
    marginBottom: 12,
    ...theme.shadows.warm,
  },
  resourceIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  resourceInfo: {
    flex: 1,
  },
  resourceName: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.colors.espresso[900],
    marginBottom: 4,
  },
  resourceDesc: {
    fontSize: 13,
    color: theme.colors.espresso[400],
    lineHeight: 18,
    marginBottom: 10,
  },
  dialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.status.urgent,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  dialButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
  },
  safetyPlanIntro: {
    fontSize: 14,
    color: theme.colors.espresso[700],
    marginBottom: 12,
    lineHeight: 20,
  },
  safetyStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: theme.colors.cream[50],
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.cream[400],
    padding: 14,
    marginBottom: 8,
    ...theme.shadows.warm,
  },
  stepNumber: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: theme.colors.rust[500],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 1,
  },
  stepNumberText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
  },
  stepText: {
    flex: 1,
    fontSize: 13,
    color: theme.colors.espresso[900],
    lineHeight: 19,
    fontWeight: '500',
  },
  comfortContainer: {
    margin: 16,
    backgroundColor: theme.colors.peach[100],
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.peach[300],
    padding: 20,
    alignItems: 'center',
    ...theme.shadows.warm,
  },
  comfortText: {
    fontSize: 15,
    fontStyle: 'italic',
    fontWeight: '700',
    color: theme.colors.espresso[900],
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 6,
  },
  comfortSubtext: {
    fontSize: 12,
    color: theme.colors.rust[700],
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
});

export default CrisisScreen;
