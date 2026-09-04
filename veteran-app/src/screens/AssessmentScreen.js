/**
 * Assessment Screen
 * 5-question wellness assessment based on Harvard Trauma Questionnaire
 * Styled with VALOR design system
 * 
 * Questions:
 * 1. Core PTSD: Intrusive Memories (1-4)
 * 2. Core PTSD: Hypervigilance (1-4)
 * 3. Core PTSD: Emotional Numbing (1-4)
 * 4. Core PTSD: Somatic/Sleep (1-4)
 * 5. Coping/Safety Baseline (1-4)
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../App';
import { storage } from '../services/storage';
import { theme } from '../constants/theme';
import { veteranAPI } from '../services/api';

const QUESTIONS = [
  {
    id: 1,
    domain: 'Intrusive Memories',
    question: 'Today, how much were you bothered by sudden, unwanted memories or reminders of past combat experiences?',
    options: [
      { value: 1, label: 'Not at all', emoji: '😌' },
      { value: 2, label: 'A little', emoji: '😐' },
      { value: 3, label: 'Moderately', emoji: '😟' },
      { value: 4, label: 'A lot', emoji: '😰' },
    ],
  },
  {
    id: 2,
    domain: 'Hypervigilance',
    question: 'How alert, jumpy, or "on guard" did you feel during your day-to-day activities today?',
    options: [
      { value: 1, label: 'Completely calm', emoji: '😌' },
      { value: 2, label: 'Slightly alert', emoji: '😐' },
      { value: 3, label: 'Quite alert', emoji: '😟' },
      { value: 4, label: 'Very on guard', emoji: '😰' },
    ],
  },
  {
    id: 3,
    domain: 'Emotional Connection',
    question: 'Did you feel emotionally connected to the people around you today, or did you feel somewhat distant/detached?',
    options: [
      { value: 1, label: 'Connected', emoji: '🤝' },
      { value: 2, label: 'Somewhat connected', emoji: '😐' },
      { value: 3, label: 'Somewhat detached', emoji: '😔' },
      { value: 4, label: 'Very detached', emoji: '😶' },
    ],
  },
  {
    id: 4,
    domain: 'Physical & Sleep',
    question: 'How much did physical tension, racing thoughts, or sleep issues impact your energy levels today?',
    options: [
      { value: 1, label: 'Not at all', emoji: '💪' },
      { value: 2, label: 'A little', emoji: '😐' },
      { value: 3, label: 'Quite a bit', emoji: '😫' },
      { value: 4, label: 'A lot', emoji: '😴' },
    ],
  },
  {
    id: 5,
    domain: 'Coping & Safety',
    question: 'Right now, how grounded and in control of your stress levels do you feel?',
    options: [
      { value: 1, label: 'Fully in control', emoji: '🧘' },
      { value: 2, label: 'Mostly in control', emoji: '😐' },
      { value: 3, label: 'Struggling', emoji: '😟' },
      { value: 4, label: 'Overwhelmed', emoji: '😰' },
    ],
  },
];

const AssessmentScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [selectedOption, setSelectedOption] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleAnswer = (value) => {
    setSelectedOption(value);
  };

  const handleNext = () => {
    if (selectedOption === null) {
      Alert.alert('Please select an option', 'Choose one of the response options below.');
      return;
    }

    const newAnswers = [...answers, { question_id: QUESTIONS[currentQuestion].id, value: selectedOption }];
    setAnswers(newAnswers);
    setSelectedOption(null);

    if (currentQuestion < QUESTIONS.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      submitAssessment(newAnswers);
    }
  };

  const handleBack = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
      setSelectedOption(answers[currentQuestion - 1]?.value || null);
    }
  };

  const submitAssessment = async (finalAnswers) => {
    setSubmitting(true);
    const totalScore = finalAnswers.reduce((sum, a) => sum + a.value, 0);

    // Save locally
    try {
      await storage.saveAssessment(finalAnswers);
    } catch (e) {
      console.warn('Storage save failed:', e);
    }

    // Attempt live API submission
    let liveResult = null;
    if (user?.id) {
      try {
        liveResult = await veteranAPI.submitAssessment(user.id, finalAnswers);
      } catch (apiErr) {
        console.warn('API assessment submit failed, using fallback:', apiErr.message);
      }
    }

    setSubmitting(false);

    let message;
    if (totalScore <= 8) {
      message = "Your wellness scores look steady today. Solid discipline! 💪 (+20 Valor Points)";
    } else if (totalScore <= 12) {
      message = "Some areas could use grounding today. Adaptive support tasks queued. 🌱 (+20 Valor Points)";
    } else if (totalScore <= 16) {
      message = "We noticed elevated tension today. We are right here beside you. 🤝 (+20 Valor Points)";
    } else {
      message = "High stress detected. Confidential clinical support is ready if you need it. 💙 (+20 Valor Points)";
    }

    Alert.alert(
      'Assessment Complete',
      `Score: ${totalScore}/20\n\n${message}`,
      [
        {
          text: 'View My Tasks',
          onPress: () => navigation.navigate('MainTabs'),
        },
      ]
    );
  };

  const question = QUESTIONS[currentQuestion];
  const progress = ((currentQuestion + 1) / QUESTIONS.length) * 100;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerOverline}>VALOR PROTOCOL</Text>
          <Text style={styles.headerTitle}>Daily Wellness Check-In</Text>
          <Text style={styles.headerSubtitle}>
            Question {currentQuestion + 1} of {QUESTIONS.length}
          </Text>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
          <Text style={styles.progressText}>{Math.round(progress)}%</Text>
        </View>

        {/* Question Card */}
        <View style={styles.questionCard}>
          <View style={styles.domainBadge}>
            <Text style={styles.domainText}>{question.domain}</Text>
          </View>
          
          <Text style={styles.questionText}>{question.question}</Text>

          {/* Options */}
          <View style={styles.optionsContainer}>
            {question.options.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.optionButton,
                  selectedOption === option.value && styles.optionButtonSelected,
                ]}
                onPress={() => handleAnswer(option.value)}
              >
                <Text style={styles.optionEmoji}>{option.emoji}</Text>
                <Text
                  style={[
                    styles.optionText,
                    selectedOption === option.value && styles.optionTextSelected,
                  ]}
                >
                  {option.label}
                </Text>
                {selectedOption === option.value && (
                  <Ionicons name="checkmark-circle" size={20} color={theme.colors.rust[500]} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Navigation Buttons */}
        <View style={styles.navContainer}>
          {currentQuestion > 0 ? (
            <TouchableOpacity style={styles.backButton} onPress={handleBack} disabled={submitting}>
              <Ionicons name="arrow-back" size={18} color={theme.colors.espresso[700]} />
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>
          ) : <View style={{ width: 80 }} />}
          
          <TouchableOpacity
            style={[styles.nextButton, selectedOption === null && styles.nextButtonDisabled]}
            onPress={handleNext}
            disabled={selectedOption === null || submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Text style={styles.nextButtonText}>
                  {currentQuestion === QUESTIONS.length - 1 ? 'Submit Check-In' : 'Next'}
                </Text>
                <Ionicons
                  name={currentQuestion === QUESTIONS.length - 1 ? 'checkmark' : 'arrow-forward'}
                  size={18}
                  color="#fff"
                />
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Encouragement Note */}
        <View style={styles.encouragementContainer}>
          <Text style={styles.encouragementText}>
            {currentQuestion === 0 && "Take your time. There are no right or wrong answers. 🌟"}
            {currentQuestion === 1 && "Your honesty helps personalize your recovery journey. 🛡️"}
            {currentQuestion === 2 && "You are doing great work showing up today. 💪"}
            {currentQuestion === 3 && "Thank you for reflecting. Every step counts toward recovery. 🤝"}
            {currentQuestion === 4 && "Final question! Submitting adds +20 Valor Points. 🎯"}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.cream[200],
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 18,
    marginTop: 10,
  },
  headerOverline: {
    fontSize: 10,
    fontWeight: '800',
    color: theme.colors.rust[500],
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: theme.colors.espresso[900],
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    color: theme.colors.espresso[400],
    marginTop: 2,
    fontWeight: '600',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: theme.colors.cream[400],
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.colors.rust[500],
    borderRadius: 4,
  },
  progressText: {
    marginLeft: 10,
    fontSize: 13,
    color: theme.colors.espresso[700],
    fontWeight: '700',
  },
  questionCard: {
    backgroundColor: theme.colors.cream[50],
    borderRadius: 18,
    padding: 22,
    borderWidth: 1,
    borderColor: theme.colors.cream[400],
    ...theme.shadows.warmMd,
    marginBottom: 20,
  },
  domainBadge: {
    backgroundColor: theme.colors.peach[200],
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    alignSelf: 'flex-start',
    marginBottom: 14,
  },
  domainText: {
    fontSize: 11,
    fontWeight: '800',
    color: theme.colors.peach[800],
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  questionText: {
    fontSize: 17,
    fontWeight: '700',
    color: theme.colors.espresso[900],
    lineHeight: 24,
    marginBottom: 20,
  },
  optionsContainer: {
    gap: 10,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.cream[100],
    borderWidth: 1.5,
    borderColor: theme.colors.cream[400],
    borderRadius: 14,
    padding: 14,
  },
  optionButtonSelected: {
    backgroundColor: theme.colors.peach[100],
    borderColor: theme.colors.rust[500],
  },
  optionEmoji: {
    fontSize: 22,
    marginRight: 12,
  },
  optionText: {
    fontSize: 15,
    color: theme.colors.espresso[800],
    fontWeight: '600',
    flex: 1,
  },
  optionTextSelected: {
    color: theme.colors.rust[700],
    fontWeight: '800',
  },
  navContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.cream[50],
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.cream[400],
  },
  backButtonText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.espresso[700],
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.rust[500],
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    ...theme.shadows.warm,
  },
  nextButtonDisabled: {
    opacity: 0.5,
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
    marginRight: 8,
  },
  encouragementContainer: {
    backgroundColor: theme.colors.peach[100],
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.peach[200],
  },
  encouragementText: {
    fontSize: 13,
    color: theme.colors.espresso[700],
    textAlign: 'center',
    lineHeight: 18,
    fontWeight: '600',
  },
});

export default AssessmentScreen;
