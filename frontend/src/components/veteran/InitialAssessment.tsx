import React, { useState } from 'react';
import {
  ClipboardList,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Shield,
  Activity,
  Heart,
  Award,
  Sparkles,
  HelpCircle
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { apiService } from '../../services/api';

interface Question {
  id: number;
  domain: string;
  category: string;
  question: string;
  subtitle: string;
  options: {
    value: number;
    label: string;
    emoji: string;
    desc: string;
  }[];
}

const QUESTIONS: Question[] = [
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

export const InitialAssessment: React.FC = () => {
  const { setActiveScreen, completeTask, tasks, activeVeteranId, awardXP } = useApp();

  const [currentStep, setCurrentStep] = useState<number>(0);
  const [answers, setAnswers] = useState<Record<number, number>>({
    0: 1,
    1: 1,
    2: 1,
    3: 1,
    4: 1,
  });
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [totalScore, setTotalScore] = useState<number>(5);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const currentQ = QUESTIONS[currentStep];
  const selectedValue = answers[currentStep] ?? 1;

  const handleSelectOption = (val: number) => {
    setAnswers((prev) => ({ ...prev, [currentStep]: val }));
  };

  const handleNext = async () => {
    if (currentStep < QUESTIONS.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      // Final step: calculate and submit
      setSubmitting(true);
      const computedScore = Object.values(answers).reduce((sum, v) => sum + v, 0);
      setTotalScore(computedScore);

      // 1. Award +20 XP
      awardXP(20, 'Completed Harvard Trauma Clinical Assessment');

      // 2. Complete starter task if pending
      const starterTask = tasks.find(
        (t) =>
          t.id === 'starter-assessment' ||
          t.title.toLowerCase().includes('assessment') ||
          t.title.toLowerCase().includes('clinical intake')
      );
      if (starterTask && starterTask.status !== 'completed') {
        completeTask(starterTask.id, 2, 'Grounded', `Completed 5-question clinical intake (Score: ${computedScore}/20)`);
      }

      // 3. Submit to backend API
      try {
        const formattedAnswers = QUESTIONS.map((q, idx) => ({
          question_id: q.id,
          value: answers[idx] ?? 1,
        }));
        await apiService.submitAssessment(activeVeteranId, formattedAnswers);
      } catch (err) {
        console.warn('API assessment submit fallback:', err);
      }

      setSubmitting(false);
      setSubmitted(true);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const getClinicalFeedback = (score: number) => {
    if (score <= 8) {
      return {
        trajectory: 'Steady Recovery Trajectory',
        badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
        textColor: 'text-emerald-700',
        message: 'Your wellness scores indicate stable grounding and strong self-regulation today. Keep maintaining your daily routines and comradeship! 💪',
      };
    } else if (score <= 12) {
      return {
        trajectory: 'Mild to Moderate Tension',
        badgeColor: 'bg-amber-100 text-amber-800 border-amber-300',
        textColor: 'text-amber-700',
        message: 'Some elevated stress detected today. We recommend pacing yourself, taking a grounding nature walk, and connecting with a squad member. 🌱',
      };
    } else if (score <= 16) {
      return {
        trajectory: 'Elevated Alert Status',
        badgeColor: 'bg-orange-100 text-orange-800 border-orange-300',
        textColor: 'text-orange-700',
        message: 'Noticeable hypervigilance or physical tension observed today. Take a pause, hydrate, and consider sending a check-in dispatch to your counselor. 🤝',
      };
    } else {
      return {
        trajectory: 'High Distress Threshold',
        badgeColor: 'bg-rose-100 text-rose-800 border-rose-300',
        textColor: 'text-rose-700',
        message: 'Your responses indicate high combat recall or sensory overload right now. Confidential clinical counseling and 24/7 hotline support are ready for you. 💙',
      };
    }
  };

  // ─── RENDER: COMPLETION VIEW ───────────────────────────────────────────────
  if (submitted) {
    const feedback = getClinicalFeedback(totalScore);

    return (
      <div className="max-w-2xl mx-auto space-y-6 py-6 animate-fadeIn">
        <div className="bg-white border border-[#E8DCCE] rounded-3xl p-8 shadow-md text-center space-y-6">
          <div className="w-20 h-20 rounded-full bg-[#D96B27] text-white flex items-center justify-center mx-auto shadow-rust">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div>
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border uppercase tracking-wider ${feedback.badgeColor}`}>
              <Shield className="w-3.5 h-3.5" />
              {feedback.trajectory}
            </span>
            <h1 className="text-3xl font-extrabold text-[#1C1917] tracking-tight mt-3">
              Assessment Calibrated
            </h1>
            <p className="text-sm text-[#786F68] mt-1 max-w-md mx-auto">
              Harvard Trauma Protocol 5-question baseline recorded. Your recovery profile has been updated.
            </p>
          </div>

          {/* Score Display Card */}
          <div className="bg-[#FDF6EE] border border-[#E8DCCE] rounded-2xl p-6 max-w-md mx-auto">
            <div className="flex items-center justify-between border-b border-[#E8DCCE] pb-3 mb-3">
              <span className="text-xs font-bold text-[#786F68] uppercase tracking-wider">Trauma Index Score</span>
              <span className="text-2xl font-mono font-black text-[#D96B27]">{totalScore} / 20</span>
            </div>
            <p className="text-xs text-[#1C1917] leading-relaxed text-left">
              {feedback.message}
            </p>
          </div>

          {/* Domain Breakdown Grid */}
          <div className="grid grid-cols-5 gap-2 max-w-md mx-auto text-center">
            {QUESTIONS.map((q, idx) => {
              const val = answers[idx] ?? 1;
              return (
                <div key={q.id} className="bg-white border border-[#E8DCCE] rounded-xl p-2">
                  <span className="block text-[10px] font-bold text-[#786F68] truncate">{q.domain}</span>
                  <span className="block text-sm font-black text-[#1C1917] mt-0.5">{val}/4</span>
                </div>
              );
            })}
          </div>

          {/* Reward Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#FDF2E9] border border-[#EEBD9B] text-[#8C4A1E] text-xs font-extrabold">
            <Award className="w-4 h-4 text-[#D96B27]" />
            +20 Valor Points Credited to Profile
          </div>

          {/* Action Button */}
          <div className="pt-2">
            <button
              onClick={() => setActiveScreen('home')}
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-[#D96B27] hover:bg-[#C55A1A] text-white font-extrabold text-sm shadow-rust inline-flex items-center justify-center gap-2 transition-all transform active:scale-95"
            >
              <span>Return to Today's Journey</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── RENDER: QUESTION STEPPER ──────────────────────────────────────────────
  const progressPercent = Math.round(((currentStep + 1) / QUESTIONS.length) * 100);

  return (
    <div className="max-w-2xl mx-auto space-y-6 py-4 animate-fadeIn">
      {/* Top Banner Card */}
      <div className="bg-white border border-[#E8DCCE] rounded-2xl p-6 shadow-sm flex items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#FDF2E9] text-[#D96B27] text-xs font-bold uppercase tracking-wider mb-2">
            <Shield className="w-3.5 h-3.5" />
            Harvard Trauma Clinical Protocol
          </div>
          <h1 className="text-2xl font-extrabold text-[#1C1917] tracking-tight">
            5-Question Wellness Check-In
          </h1>
          <p className="text-xs text-[#786F68] mt-1">
            Question {currentStep + 1} of {QUESTIONS.length} • Standardized military recovery questionnaire
          </p>
        </div>

        <div className="hidden sm:flex flex-col items-end">
          <span className="text-xs font-bold text-[#786F68]">Completion</span>
          <span className="text-xl font-black text-[#D96B27] font-mono">{progressPercent}%</span>
        </div>
      </div>

      {/* Progress Bar & Dots */}
      <div className="space-y-2">
        <div className="h-2 bg-[#E8DCCE] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#D96B27] transition-all duration-300 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="flex justify-between items-center px-1 text-[11px] font-bold text-[#786F68]">
          {QUESTIONS.map((q, idx) => (
            <button
              key={q.id}
              onClick={() => setCurrentStep(idx)}
              className={`flex items-center gap-1 transition-colors ${
                idx === currentStep ? 'text-[#D96B27] font-black' : idx < currentStep ? 'text-emerald-700' : 'text-[#786F68]'
              }`}
            >
              <span>{idx + 1}. {q.domain}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Question Card */}
      <div className="bg-white border border-[#E8DCCE] rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2 py-0.5 rounded bg-[#F5EBE0] text-[#786F68] text-[10px] font-bold uppercase tracking-wider">
              {currentQ.category}
            </span>
            <span className="px-2 py-0.5 rounded bg-[#FDF2E9] text-[#D96B27] text-[10px] font-bold uppercase tracking-wider">
              {currentQ.domain}
            </span>
          </div>
          <h2 className="text-lg sm:text-xl font-extrabold text-[#1C1917] leading-snug">
            {currentQ.question}
          </h2>
          <p className="text-xs text-[#786F68] mt-1.5">
            {currentQ.subtitle}
          </p>
        </div>

        {/* 4 Response Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          {currentQ.options.map((opt) => {
            const isSelected = selectedValue === opt.value;

            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleSelectOption(opt.value)}
                className={`p-4 rounded-2xl border text-left transition-all flex items-start gap-3.5 transform active:scale-98 ${
                  isSelected
                    ? 'bg-[#FDF2E9] border-[#D96B27] shadow-sm ring-2 ring-[#D96B27]/30'
                    : 'bg-white border-[#E8DCCE] hover:bg-[#FDF6EE]/60'
                }`}
              >
                <span className="text-2xl pt-0.5 shrink-0">{opt.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className={`text-sm font-bold ${isSelected ? 'text-[#8C4A1E]' : 'text-[#1C1917]'}`}>
                      {opt.label}
                    </span>
                    {isSelected && (
                      <CheckCircle2 className="w-4 h-4 text-[#D96B27] shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-[#786F68] mt-0.5 leading-relaxed">
                    {opt.desc}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Navigation Buttons */}
        <div className="pt-4 border-t border-[#E8DCCE] flex items-center justify-between gap-3">
          {currentStep > 0 ? (
            <button
              type="button"
              onClick={handleBack}
              className="px-4 py-2.5 rounded-xl border border-[#E8DCCE] bg-white hover:bg-[#F5EBE0] text-xs font-bold text-[#1C1917] flex items-center gap-1.5 transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              Previous
            </button>
          ) : (
            <div />
          )}

          <button
            type="button"
            onClick={handleNext}
            disabled={submitting}
            className="px-6 py-2.5 rounded-xl bg-[#D96B27] hover:bg-[#C55A1A] text-white text-xs font-bold flex items-center gap-2 shadow-rust transition-all"
          >
            <span>
              {submitting
                ? 'Calibrating...'
                : currentStep === QUESTIONS.length - 1
                ? 'Submit & Calibrate Recovery (+20 XP)'
                : 'Next Question'}
            </span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
