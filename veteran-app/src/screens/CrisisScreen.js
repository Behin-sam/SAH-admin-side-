/**
 * Crisis Screen
 * Emergency contacts, crisis hotlines, and immediate support resources
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

const CRISIS_RESOURCES = [
  {
    id: 'vcl',
    name: 'Veterans Crisis Line',
    phone: '988',
    subtitle: 'Press 1 after calling',
    description: 'Free, confidential support 24/7 for veterans and their families',
    color: '#ef4444',
    icon: 'call',
  },
  {
    id: 'va',
    name: 'VA Health Crisis Line',
    phone: '1-800-273-8255',
    subtitle: 'Press 1 for Veterans',
    description: 'National Suicide Prevention Lifeline',
    color: '#2563eb',
    icon: 'medical',
  },
  {
    id: 'text',
    name: 'Crisis Text Line',
    phone: null,
    text: 'Text HOME to 741741',
    description: 'Free 24/7 text-based crisis support',
    color: '#8b5cf6',
    icon: 'chatbubbles',
  },
  {
    id: 'tdd',
    name: 'TTY (Deaf/Hard of Hearing)',
    phone: '1-800-799-4889',
    subtitle: 'TTY available',
    description: 'Veterans Crisis Line for deaf or hard of hearing',
    color: '#059669',
    icon: 'accessibility',
  },
];

const QUICK_ACTIONS = [
  {
    id: 'call',
    title: '📞 Call 988 Now',
    description: 'Immediate phone support',
    phone: '988',
    color: '#ef4444',
  },
  {
    id: 'text',
    title: '💬 Text for Help',
    description: 'Text HOME to 741741',
    action: 'text',
    color: '#8b5cf6',
  },
  {
    id: 'chat',
    title: '💻 Chat Online',
    description: 'veteranscrisisline.net',
    url: 'https://www.veteranscrisisline.net/get-help-now/chat',
    color: '#2563eb',
  },
  {
    id: 'nearest',
    title: '📍 Nearest VA',
    description: 'Find your nearest VA facility',
    url: 'https://www.va.gov/find-locations/',
    color: '#10b981',
  },
];

const SAFETY_PLAN = [
  'Recognize your warning signs',
  'Use your coping strategies',
  'Contact your support network',
  'Call your counselor or therapist',
  'Call the Veterans Crisis Line (988)',
  'Go to your nearest VA or ER',
];

const CrisisScreen = ({ navigation }) => {
  const handleCall = (phone) => {
    Linking.openURL(`tel:${phone}`).catch(() => {
      Alert.alert('Error', 'Could not open phone dialer');
    });
  };

  const handleText = () => {
    Alert.alert(
      '📱 Send Text',
      'This will open your messaging app to text HOME to 741741',
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
      Alert.alert('Error', 'Could not open URL');
    });
  };

  return (
    <ScrollView style={styles.container}>
      {/* Emergency Header */}
      <View style={styles.emergencyHeader}>
        <Ionicons name="warning" size={40} color="#fff" />
        <Text style={styles.emergencyTitle}>Crisis Support</Text>
        <Text style={styles.emergencySubtitle}>
          You are not alone. Help is available 24/7.
        </Text>
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Get Help Now</Text>
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
            <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
          </TouchableOpacity>
        ))}
      </View>

      {/* Crisis Hotlines */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Crisis Hotlines</Text>
        {CRISIS_RESOURCES.map((resource) => (
          <View key={resource.id} style={styles.resourceCard}>
            <View style={[styles.resourceIcon, { backgroundColor: resource.color + '20' }]}>
              <Ionicons name={resource.icon} size={24} color={resource.color} />
            </View>
            <View style={styles.resourceInfo}>
              <Text style={styles.resourceName}>{resource.name}</Text>
              <Text style={styles.resourceDesc}>{resource.description}</Text>
              {resource.phone ? (
                <TouchableOpacity onPress={() => handleCall(resource.phone)}>
                  <Text style={[styles.resourcePhone, { color: resource.color }]}>
                    📞 {resource.phone} {resource.subtitle ? `(${resource.subtitle})` : ''}
                  </Text>
                </TouchableOpacity>
              ) : (
                <Text style={[styles.resourcePhone, { color: resource.color }]}>
                  {resource.text}
                </Text>
              )}
            </View>
          </View>
        ))}
      </View>

      {/* My Safety Plan */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>My Safety Plan</Text>
        <Text style={styles.safetyPlanIntro}>
          When I'm in crisis, I will:
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

      {/* Comfort Message */}
      <View style={styles.comfortContainer}>
        <Text style={styles.comfortEmoji}>💙</Text>
        <Text style={styles.comfortText}>
          "Your life matters. Your service matters. You matter."
        </Text>
        <Text style={styles.comfortSubtext}>
          Reach out anytime. There is always someone who wants to help.
        </Text>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  emergencyHeader: {
    backgroundColor: '#ef4444',
    padding: 30,
    paddingTop: 50,
    alignItems: 'center',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  emergencyTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 12,
  },
  emergencySubtitle: {
    fontSize: 16,
    color: '#fecaca',
    marginTop: 8,
    textAlign: 'center',
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 12,
  },
  quickAction: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  quickActionContent: {
    flex: 1,
  },
  quickActionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  quickActionDesc: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  resourceCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  resourceIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  resourceInfo: {
    flex: 1,
  },
  resourceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  resourceDesc: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  resourcePhone: {
    fontSize: 15,
    fontWeight: '600',
    marginTop: 6,
  },
  safetyPlanIntro: {
    fontSize: 15,
    color: '#4b5563',
    marginBottom: 12,
    fontStyle: 'italic',
  },
  safetyStep: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stepNumberText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
  },
  stepText: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  comfortContainer: {
    margin: 16,
    backgroundColor: '#eff6ff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  comfortEmoji: {
    fontSize: 40,
    marginBottom: 12,
  },
  comfortText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e3a5f',
    textAlign: 'center',
    lineHeight: 24,
  },
  comfortSubtext: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 8,
  },
});

export default CrisisScreen;
