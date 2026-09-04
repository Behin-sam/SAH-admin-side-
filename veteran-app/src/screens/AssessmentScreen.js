/**
 * Assessment Screen
 * 5-question wellness assessment based on Harvard Trauma Questionnaire
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
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { storage } from '../services/storage';

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
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [selectedOption, setSelectedOption] = useState(null);

  const handleAnswer = (value) => {
    setSelectedOption(value);
  };

  const handleNext = () => {
    if (selectedOption === null) {
      Alert.alert('Please select an answer', 'Choose one of the options below');
      return;
    }

    const newAnswers = [...answers, { question_id: QUESTIONS[currentQuestion].id, value: selectedOption }];
    setAnswers(newAnswers);
    setSelectedOption(null);

    if (currentQuestion < QUESTIONS.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      // All questions answered - submit assessment
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
    const totalScore = finalAnswers.reduce((sum, a) => sum + a.value, 0);
    
    // Save locally
    await storage.saveAssessment(finalAnswers);

    // Determine risk level and message
    let riskLevel, message;
    if (totalScore <= 8) {
      riskLevel = 'low';
      message = "Your wellness scores look good today. Keep up the great work! 💪";
    } else if (totalScore <= 12) {
      riskLevel = 'moderate';
      message = "Some areas could use attention today. We've added some supportive tasks. 🌱";
    } else if (totalScore <= 16) {
      riskLevel = 'elevated';
      message = "We noticed you might be having a tough day. We're here for you. 💙";
    } else {
      riskLevel = 'high';
      message = "Please reach out if you need support. You're not alone. 🤝";
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
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Navigation Buttons */}
        <View style={styles.navContainer}>
          {currentQuestion > 0 && (
            <TouchableOpacity style={styles.backButton} onPress={handleBack}>
              <Ionicons name="arrow-back" size={20} color="#6b7280" />
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity
            style={[styles.nextButton, selectedOption === null && styles.nextButtonDisabled]}
            onPress={handleNext}
            disabled={selectedOption === null}
          >
            <Text style={styles.nextButtonText}>
              {currentQuestion === QUESTIONS.length - 1 ? 'Submit' : 'Next'}
            </Text>
            <Ionicons
              name={currentQuestion === QUESTIONS.length - 1 ? 'checkmark' : 'arrow-forward'}
              size={20}
              color="#fff"
            />
          </TouchableOpacity>
        </View>

        {/* Encouragement */}
        <View style={styles.encouragementContainer}>
          <Text style={styles.encouragementText}>
            {currentQuestion === 0 && "Take your time. There are no wrong answers. 🌟"}
            {currentQuestion === 1 && "Your honesty helps us support you better. 💙"}
            {currentQuestion === 2 && "You're doing great. Almost there! 💪"}
            {currentQuestion === 3 && "Thank you for sharing. Your feelings are valid. 🤝"}
            {currentQuestion === 4 && "Last one! You've got this. 🎯"}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContent: {
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e3a5f',
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#2563eb',
    borderRadius: 4,
  },
  progressText: {
    marginLeft: 10,
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  questionCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 20,
  },
  domainBadge: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  domainText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2563eb',
    textTransform: 'uppercase',
  },
  questionText: {
    fontSize: 18,
    color: '#1f2937',
    lineHeight: 26,
    marginBottom: 24,
  },
  optionsContainer: {
    gap: 12,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 16,
  },
  optionButtonSelected: {
    backgroundColor: '#eff6ff',
    borderColor: '#2563eb',
  },
  optionEmoji: {
    fontSize: 24,
    marginRight: 12,
  },
  optionText: {
    fontSize: 16,
    color: '#374151',
    flex: 1,
  },
  optionTextSelected: {
    color: '#2563eb',
    fontWeight: '600',
  },
  navContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  backButtonText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#6b7280',
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563eb',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  nextButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  encouragementContainer: {
    alignItems: 'center',
    padding: 16,
  },
  encouragementText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default AssessmentScreen;
