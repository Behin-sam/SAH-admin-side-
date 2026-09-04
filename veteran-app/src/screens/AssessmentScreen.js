/**
 * Assessment Screen
 * 5-Question Daily Wellness Check-In based on Harvard Trauma Protocol
 * Standardized across Mobile and Web applications
 * Styled with VALOR Design System
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Platform,
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
    category: 'Core PTSD',
    question: 'Today, how much were you bothered by sudden, unwanted memories or reminders of past combat experiences?',
    subtitle: 'Flashbacks, sudden distress, or uninvited military recollections.',
    options: [
      { value: 1, label: 'Not at all', emoji: '😌', desc: 'Completely steady and undisturbed' },
      { value: 2, label: 'A little', emoji: '😐', desc: 'Brief memory, easily dismissed' },
      { value: 3, label: 'Moderately', emoji: '😟', desc: 'Distracting thoughts, required effort to ground' },
      { value: 4, label: 'A lot', emoji: '😰', desc: 'Intense distress or persistent intrusive images' },
    ],
  },
  {
    id: 2,
    domain: 'Hypervigilance',
    category: 'Core PTSD',
    question: 'How alert, jumpy, or "on guard" did you feel during your day-to-day activities today?',
    subtitle: 'Checking exits, heightened startle reflex, difficulty relaxing in public.',
    options: [
      { value: 1, label: 'Completely calm', emoji: '😌', desc: 'Relaxed and safe in surroundings' },
      { value: 2, label: 'Slightly alert', emoji: '😐', desc: 'Mild situational awareness, no distress' },
      { value: 3, label: 'Quite alert', emoji: '😟', desc: 'Scanning surroundings, tense in crowds' },
      { value: 4, label: 'Very on guard', emoji: '😰', desc: 'Constantly scanning, hyper-reactive' },
    ],
  },
  {
    id: 3,
    domain: 'Emotional Connection',
    category: 'Core PTSD',
    question: 'Did you feel emotionally connected to the people around you today, or did you feel somewhat distant/detached?',
    subtitle: 'Sharing feelings with family, friends, comrades, or feeling closed off.',
    options: [
      { value: 1, label: 'Connected', emoji: '🤝', desc: 'Warm and engaged with others' },
      { value: 2, label: 'Somewhat connected', emoji: '😐', desc: 'Pleasant, moderate openness' },
      { value: 3, label: 'Somewhat detached', emoji: '😔', desc: 'Withdrawn, preferring quiet solitude' },
      { value: 4, label: 'Very detached', emoji: '😶', desc: 'Completely emotionally numb or isolated' },
    ],
  },
  {
    id: 4,
    domain: 'Physical & Sleep',
    category: 'Somatic Health',
    question: 'How much did physical tension, racing thoughts, or sleep issues impact your energy levels today?',
    subtitle: 'Restless sleep, muscle tightness, fatigue, or racing thoughts.',
    options: [
      { value: 1, label: 'Not at all', emoji: '💪', desc: 'Full energy, restful recovery' },
      { value: 2, label: 'A little', emoji: '😐', desc: 'Minor stiffness or brief fatigue' },
      { value: 3, label: 'Quite a bit', emoji: '😫', desc: 'Noticeable exhaustion or muscle tension' },
      { value: 4, label: 'A lot', emoji: '😴', desc: 'Severely depleted, insomnia or bodily pain' },
    ],
  },
  {
    id: 5,
    domain: 'Coping & Safety',
    category: 'Recovery Baseline',
    question: 'Right now, how grounded and in control of your stress levels do you feel?',
    subtitle: 'Ability to use breathing, pause before reacting, and maintain emotional control.',
    options: [
      { value: 1, label: 'Fully in control', emoji: '🧘', desc: 'Centered, calm, and resilient' },
      { value: 2, label: 'Mostly in control', emoji: '😐', desc: 'Managing day-to-day challenges adequately' },
      { value: 3, label: 'Struggling', emoji: '😟', desc: 'Finding it hard to stay centered' },
      { value: 4, label: 'Overwhelmed', emoji: '😰', desc: 'Urgent need for calm, counselor support advised' },
    ],
  },
];

const AssessmentScreen = ({ navigation }) => {
  const { user, updatePoints } = useAuth();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({
    0: 1,
    1: 1,
    2: 1,
    3: 1,
    4: 1,
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [totalScore, setTotalScore] = useState(5);

  const question = QUESTIONS[currentQuestion];
  const selectedOption = answers[currentQuestion] ?? 1;

  const handleAnswer = (value) => {
    setAnswers((prev) => ({ ...prev, [currentQuestion]: value }));
  };

  const handleNext = () => {
    if (currentQuestion < QUESTIONS.length - 1) {
      setCurrentQuestion((prev) => prev + 1);
    } else {
      submitAssessment();
    }
  };

  const handleBack = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion((prev) => prev - 1);
    }
  };

  const submitAssessment = async () => {
    setSubmitting(true);
    const score = [0, 1, 2, 3, 4].reduce((sum, i) => sum + (answers[i] || 1), 0);
    setTotalScore(score);

    // 1. Award +20 Valor Points immediately
    if (updatePoints) {
      updatePoints(20);
    }

    // 2. Format exactly 5 items for backend validation
    const formattedAnswers = QUESTIONS.map((q, idx) => ({
      question_id: q.id,
      value: answers[idx] || 1,
    }));

    // 3. Save locally
    try {
      await storage.saveAssessment(formattedAnswers);
    } catch (e) {
      console.warn('Storage save assessment failed:', e);
    }

    // 4. Attempt live API submission
    if (user?.id) {
      try {
        await veteranAPI.submitAssessment(user.id, formattedAnswers);
      } catch (apiErr) {
        console.warn('API assessment submit fallback:', apiErr?.message);
      }
    }

    setSubmitting(false);
    setSubmitted(true);
  };

  const getClinicalFeedback = (score) => {
    if (score <= 8) {
      return {
        trajectory: 'Steady Recovery Trajectory',
        badgeColor: '#ECFDF5',
        badgeBorder: '#A7F3D0',
        badgeText: '#065F46',
        message: 'Your wellness scores indicate solid grounding and strong self-regulation today. Keep maintaining your daily rituals and comradeship! 💪',
      };
    } else if (score <= 12) {
      return {
        trajectory: 'Mild to Moderate Tension',
        badgeColor: '#FEF3C7',
        badgeBorder: '#FCD34D',
        badgeText: '#92400E',
        message: 'Some elevated stress detected today. We recommend gentle pacing, taking an outdoor grounding walk, and connecting with a squad member. 🌱',
      };
    } else if (score <= 16) {
      return {
        trajectory: 'Elevated Alert Status',
        badgeColor: '#FFEDD5',
        badgeBorder: '#FDBA74',
        badgeText: '#9A3412',
        message: 'Noticeable hypervigilance or physical tension observed today. Take a pause, hydrate, and consider sending a check-in dispatch to your counselor. 🤝',
      };
    } else {
      return {
        trajectory: 'High Distress Threshold',
        badgeColor: '#FFE4E6',
        badgeBorder: '#FDA4AF',
        badgeText: '#9F1239',
        message: 'Your responses indicate high combat recall or sensory overload right now. Confidential clinical counseling and 24/7 hotline support are ready for you. 💙',
      };
    }
  };

  // ─── RENDER: COMPLETION VIEW ───────────────────────────────────────────────
  if (submitted) {
    const feedback = getClinicalFeedback(totalScore);

    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.completionCard}>
            <View style={styles.completionIconCircle}>
              <Ionicons name="checkmark-circle" size={48} color={theme.colors.rust[500]} />
            </View>

            <View style={[styles.trajectoryBadge, { backgroundColor: feedback.badgeColor, borderColor: feedback.badgeBorder }]}>
              <Ionicons name="shield-checkmark" size={14} color={feedback.badgeText} />
              <Text style={[styles.trajectoryBadgeText, { color: feedback.badgeText }]}>
                {feedback.trajectory}
              </Text>
            </View>

            <Text style={styles.completionTitle}>Assessment Calibrated</Text>
            <Text style={styles.completionSubtitle}>
              Harvard Trauma Protocol 5-question baseline recorded. Your recovery trajectory has been calibrated.
            </Text>

            {/* Score Display Card */}
            <View style={styles.scoreBox}>
              <View style={styles.scoreBoxHeader}>
                <Text style={styles.scoreBoxLabel}>TRAUMA INDEX SCORE</Text>
                <Text style={styles.scoreBoxValue}>{totalScore} / 20</Text>
              </View>
              <Text style={styles.scoreBoxMessage}>{feedback.message}</Text>
            </View>

            {/* Domain Breakdown Grid */}
            <View style={styles.domainBreakdownRow}>
              {QUESTIONS.map((q, idx) => {
                const val = answers[idx] || 1;
                return (
                  <View key={q.id} style={styles.domainMiniBox}>
                    <Text style={styles.domainMiniTitle} numberOfLines={1}>
                      {q.domain}
                    </Text>
                    <Text style={styles.domainMiniScore}>{val}/4</Text>
                  </View>
                );
              })}
            </View>

            {/* Points Award Badge */}
            <View style={styles.pointsAwardBadge}>
              <Ionicons name="trophy" size={16} color={theme.colors.rust[600]} />
              <Text style={styles.pointsAwardText}>+20 Valor Points Credited to Account</Text>
            </View>

            {/* Return Button */}
            <TouchableOpacity
              style={styles.returnBtn}
              onPress={() => navigation.navigate('MainTabs')}
              activeOpacity={0.8}
            >
              <Text style={styles.returnBtnText}>Return to Dashboard & Missions</Text>
              <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ─── RENDER: QUESTION STEPPER ──────────────────────────────────────────────
  const progress = ((currentQuestion + 1) / QUESTIONS.length) * 100;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.protocolBadge}>
            <Ionicons name="shield" size={12} color={theme.colors.rust[600]} />
            <Text style={styles.protocolBadgeText}>HARVARD TRAUMA PROTOCOL</Text>
          </View>
          <Text style={styles.headerTitle}>Daily Wellness Check-In</Text>
          <Text style={styles.headerSubtitle}>
            Question {currentQuestion + 1} of {QUESTIONS.length} • Standardized Clinical Assessment
          </Text>
        </View>

        {/* Progress Bar & Dots */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
          <Text style={styles.progressText}>{Math.round(progress)}%</Text>
        </View>

        {/* Step Indicator Tabs */}
        <View style={styles.stepperDotsRow}>
          {QUESTIONS.map((q, idx) => (
            <TouchableOpacity
              key={q.id}
              onPress={() => setCurrentQuestion(idx)}
              style={[
                styles.stepperDotItem,
                idx === currentQuestion && styles.stepperDotItemActive,
              ]}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.stepperDotText,
                  idx === currentQuestion && styles.stepperDotTextActive,
                  idx < currentQuestion && styles.stepperDotTextCompleted,
                ]}
              >
                {idx + 1}. {q.domain}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Question Card */}
        <View style={styles.questionCard}>
          <View style={styles.cardTagRow}>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryBadgeText}>{question.category}</Text>
            </View>
            <View style={styles.domainBadge}>
              <Text style={styles.domainText}>{question.domain}</Text>
            </View>
          </View>

          <Text style={styles.questionText}>{question.question}</Text>
          <Text style={styles.questionSubtitle}>{question.subtitle}</Text>

          {/* Options */}
          <View style={styles.optionsContainer}>
            {question.options.map((option) => {
              const isSelected = selectedOption === option.value;
              return (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.optionButton,
                    isSelected && styles.optionButtonSelected,
                  ]}
                  onPress={() => handleAnswer(option.value)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.optionEmoji}>{option.emoji}</Text>
                  <View style={styles.optionContent}>
                    <View style={styles.optionTopRow}>
                      <Text
                        style={[
                          styles.optionLabel,
                          isSelected && styles.optionLabelSelected,
                        ]}
                      >
                        {option.label}
                      </Text>
                      {isSelected && (
                        <Ionicons
                          name="checkmark-circle"
                          size={18}
                          color={theme.colors.rust[500]}
                        />
                      )}
                    </View>
                    <Text style={styles.optionDesc}>{option.desc}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Navigation Buttons */}
        <View style={styles.navContainer}>
          {currentQuestion > 0 ? (
            <TouchableOpacity
              style={styles.backButton}
              onPress={handleBack}
              disabled={submitting}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={16} color={theme.colors.espresso[700]} />
              <Text style={styles.backButtonText}>Previous</Text>
            </TouchableOpacity>
          ) : (
            <View style={{ width: 80 }} />
          )}

          <TouchableOpacity
            style={styles.nextButton}
            onPress={handleNext}
            disabled={submitting}
            activeOpacity={0.8}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Text style={styles.nextButtonText}>
                  {currentQuestion === QUESTIONS.length - 1
                    ? 'Submit Check-In (+20 XP)'
                    : 'Next Question'}
                </Text>
                <Ionicons
                  name={currentQuestion === QUESTIONS.length - 1 ? 'checkmark' : 'arrow-forward'}
                  size={16}
                  color="#fff"
                />
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Encouragement Note */}
        <View style={styles.encouragementContainer}>
          <Text style={styles.encouragementText}>
            {currentQuestion === 0 && 'Take your time. Honest self-reflection guides your recovery trajectory. 🌟'}
            {currentQuestion === 1 && 'Scanning and vigilance are natural soldier reflexes. Your answers help us pace your drills. 🛡️'}
            {currentQuestion === 2 && 'Fellowship and brotherhood heal combat isolation. You are never alone. 🤝'}
            {currentQuestion === 3 && 'Rest and somatic recovery are critical mission components. 💪'}
            {currentQuestion === 4 && 'Final question! Submitting calibrates your care and awards +20 Valor Points. 🎯'}
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
    padding: 16,
    paddingBottom: 40,
  },

  // Header
  header: {
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 6,
  },
  protocolBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.peach[200],
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    marginBottom: 8,
  },
  protocolBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: theme.colors.peach[800],
    letterSpacing: 0.8,
    marginLeft: 4,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: theme.colors.espresso[900],
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 12,
    color: theme.colors.espresso[400],
    marginTop: 3,
  },

  // Progress Bar
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: theme.colors.cream[400],
    borderRadius: 4,
    overflow: 'hidden',
    marginRight: 10,
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.colors.rust[500],
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '800',
    color: theme.colors.rust[500],
    width: 38,
    textAlign: 'right',
  },

  // Stepper dots
  stepperDotsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  stepperDotItem: {
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  stepperDotItemActive: {
    borderBottomWidth: 2,
    borderBottomColor: theme.colors.rust[500],
  },
  stepperDotText: {
    fontSize: 10,
    fontWeight: '600',
    color: theme.colors.espresso[400],
  },
  stepperDotTextActive: {
    color: theme.colors.rust[500],
    fontWeight: '800',
  },
  stepperDotTextCompleted: {
    color: theme.colors.status.stable,
  },

  // Question Card
  questionCard: {
    backgroundColor: theme.colors.cream[50],
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: theme.colors.cream[400],
    ...theme.shadows.warm,
    marginBottom: 16,
  },
  cardTagRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 10,
  },
  categoryBadge: {
    backgroundColor: theme.colors.cream[300],
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  categoryBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.espresso[700],
    textTransform: 'uppercase',
  },
  domainBadge: {
    backgroundColor: theme.colors.rust[50],
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: theme.colors.rust[200],
  },
  domainText: {
    fontSize: 10,
    fontWeight: '800',
    color: theme.colors.rust[600],
    textTransform: 'uppercase',
  },
  questionText: {
    fontSize: 17,
    fontWeight: '800',
    color: theme.colors.espresso[900],
    lineHeight: 24,
    marginBottom: 4,
  },
  questionSubtitle: {
    fontSize: 12,
    color: theme.colors.espresso[400],
    lineHeight: 17,
    marginBottom: 16,
  },

  // Options
  optionsContainer: {
    gap: 10,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: theme.colors.cream[100],
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.5,
    borderColor: theme.colors.cream[400],
  },
  optionButtonSelected: {
    backgroundColor: theme.colors.peach[100],
    borderColor: theme.colors.rust[500],
  },
  optionEmoji: {
    fontSize: 22,
    marginRight: 12,
    marginTop: 2,
  },
  optionContent: {
    flex: 1,
  },
  optionTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  optionLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.espresso[900],
  },
  optionLabelSelected: {
    color: theme.colors.rust[700],
  },
  optionDesc: {
    fontSize: 12,
    color: theme.colors.espresso[400],
    marginTop: 2,
    lineHeight: 16,
  },

  // Navigation Buttons
  navContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: theme.colors.cream[50],
    borderWidth: 1,
    borderColor: theme.colors.cream[400],
  },
  backButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.espresso[700],
    marginLeft: 6,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.rust[500],
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    ...theme.shadows.warm,
  },
  nextButtonText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#fff',
    marginRight: 6,
  },

  // Encouragement
  encouragementContainer: {
    backgroundColor: theme.colors.cream[100],
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.colors.cream[300],
  },
  encouragementText: {
    fontSize: 12,
    color: theme.colors.espresso[700],
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 18,
  },

  // Completion Screen
  completionCard: {
    backgroundColor: theme.colors.cream[50],
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: theme.colors.cream[400],
    alignItems: 'center',
    ...theme.shadows.warmMd,
    marginTop: 10,
  },
  completionIconCircle: {
    marginBottom: 12,
  },
  trajectoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 10,
  },
  trajectoryBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    marginLeft: 5,
    textTransform: 'uppercase',
  },
  completionTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: theme.colors.espresso[900],
    textAlign: 'center',
    marginBottom: 6,
  },
  completionSubtitle: {
    fontSize: 13,
    color: theme.colors.espresso[400],
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  scoreBox: {
    backgroundColor: theme.colors.cream[100],
    borderRadius: 16,
    padding: 16,
    width: '100%',
    borderWidth: 1,
    borderColor: theme.colors.cream[300],
    marginBottom: 16,
  },
  scoreBoxHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.cream[400],
    paddingBottom: 8,
    marginBottom: 8,
  },
  scoreBoxLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: theme.colors.espresso[400],
    letterSpacing: 0.8,
  },
  scoreBoxValue: {
    fontSize: 20,
    fontWeight: '900',
    color: theme.colors.rust[500],
  },
  scoreBoxMessage: {
    fontSize: 12,
    color: theme.colors.espresso[800],
    lineHeight: 18,
  },
  domainBreakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: 6,
    marginBottom: 16,
  },
  domainMiniBox: {
    flex: 1,
    backgroundColor: theme.colors.cream[100],
    borderRadius: 8,
    padding: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.cream[300],
  },
  domainMiniTitle: {
    fontSize: 8,
    fontWeight: '700',
    color: theme.colors.espresso[400],
  },
  domainMiniScore: {
    fontSize: 12,
    fontWeight: '900',
    color: theme.colors.espresso[900],
    marginTop: 2,
  },
  pointsAwardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.peach[200],
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    marginBottom: 20,
  },
  pointsAwardText: {
    marginLeft: 6,
    fontSize: 12,
    fontWeight: '800',
    color: theme.colors.peach[800],
  },
  returnBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.rust[500],
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 14,
    width: '100%',
  },
  returnBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
    marginRight: 8,
  },
});

export default AssessmentScreen;
