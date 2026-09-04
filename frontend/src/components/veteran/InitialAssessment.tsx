import React, { useState } from 'react';
import { ClipboardList, ArrowRight, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const InitialAssessment: React.FC = () => {
  const { setActiveScreen } = useApp();
  const [currentStep, setCurrentStep] = useState(0);

  const [formData, setFormData] = useState({
    wellBeing: 'Moderate',
    sleepQuality: 'Interrupted',
    stressLevel: 'Moderate',
    mood: 'Okay',
    socialConnectedness: 'Low',
    routineStability: 'Low',
    physicalActivity: 'Moderate',
    outdoorComfort: 'High',
    taskAbility: 'Moderate',
  });

  const questions = [
    {
      key: 'wellBeing',
      title: 'General Well-being',
      subtitle: 'How would you describe your overall physical and mental state over the past two weeks?',
      options: ['High / Energetic', 'Moderate / Steady', 'Low / Depleted', 'Variable']
    },
    {
      key: 'sleepQuality',
      title: 'Sleep Consistency & Quality',
      subtitle: 'How consistently are you able to fall and stay asleep at night?',
      options: ['Restful (7+ hrs)', 'Interrupted / Night Waking', 'Difficulty Falling Asleep', 'Severe Insomnia']
    },
    {
      key: 'stressLevel',
      title: 'Current Stress Index',
      subtitle: 'How frequently do you feel overwhelmed or tense during daily tasks?',
      options: ['Low / Manageable', 'Moderate / Intermittent', 'High / Frequent', 'Severe / Overwhelming']
    },
    {
      key: 'mood',
      title: 'Emotional Baseline',
      subtitle: 'Which option best reflects your predominant emotional state recently?',
      options: ['Positive & Calm', 'Okay / Neutral', 'Somewhat Low or Anxious', 'Very Difficult']
    },
    {
      key: 'socialConnectedness',
      title: 'Social Interaction Comfort',
      subtitle: 'How connected do you feel to family, friends, or fellow service members?',
      options: ['Very Connected', 'Moderately Connected', 'Low / Prefer Solitude', 'Feeling Isolated']
    },
    {
      key: 'routineStability',
      title: 'Daily Routine Structure',
      subtitle: 'Do you maintain fixed meal, wake-up, and daily activity times?',
      options: ['Very Structured', 'Moderately Consistent', 'Low / Irregular Times', 'Unstructured']
    },
    {
      key: 'physicalActivity',
      title: 'Physical Movement Level',
      subtitle: 'What level of physical stretching, walking, or exercise feels comfortable right now?',
      options: ['Light Stretching Only', 'Moderate Walking (15-30 mins)', 'Vigorous Exercise', 'Minimal Movement']
    },
    {
      key: 'outdoorComfort',
      title: 'Comfort with Nature & Outdoor Spaces',
      subtitle: 'How comfortable do you feel spending quiet time in outdoor gardens or parks?',
      options: ['High / Very Restorative', 'Moderate / Safe Quiet Places', 'Low / Prefer Indoors', 'Unsure']
    },
    {
      key: 'taskAbility',
      title: 'Daily Task Execution',
      subtitle: 'How achievable do routine daily responsibilities feel right now?',
      options: ['Easily Achievable', 'Achievable with Pacing', 'Challenging', 'Overwhelming']
    }
  ];

  const handleOptionSelect = (key: string, val: string) => {
    setFormData(prev => ({ ...prev, [key]: val }));
  };

  const handleNext = () => {
    if (currentStep < questions.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      setActiveScreen('profile-view');
    }
  };

  const currentQ = questions[currentStep];

  return (
    <div className="max-w-3xl mx-auto space-y-6 py-4 animate-fadeIn">
      {/* Header Banner */}
      <div className="p-6 rounded-2xl glass-panel border border-[#E8DCCE] flex items-center justify-between gap-4 shadow-warm">
        <div>
          <span className="label-overline text-[10px] text-[#8C4A1E]">
            SETUP SURVEY • {currentStep + 1} / {questions.length}
          </span>
          <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-[#1C1917] mt-1">
            Finish your baseline setup.
          </h1>
          <p className="text-xs text-[#786F68] mt-1">
            A few answers help keep each day personal, practical, and tailored to your pace.
          </p>
        </div>
        <div className="text-right font-mono font-bold text-xl text-[#D96B27]">
          {currentStep + 1} / {questions.length}
        </div>
      </div>

      {/* Segmented Progress Bar */}
      <div className="flex items-center gap-1.5 px-1">
        {questions.map((_, idx) => (
          <div
            key={idx}
            className={`h-2 flex-1 rounded-full transition-all duration-300 ${
              idx <= currentStep ? 'bg-[#D96B27]' : 'bg-[#E8DCCE]'
            }`}
          />
        ))}
      </div>

      {/* Question Card */}
      <div className="p-8 rounded-2xl glass-panel border border-[#E8DCCE] space-y-6 shadow-warm">
        <div>
          <span className="label-overline text-[#8C4A1E]">
            QUESTION {currentStep + 1} OF {questions.length}
          </span>
          <h2 className="font-heading text-2xl font-bold text-[#1C1917] mt-1">{currentQ.title}</h2>
          <p className="text-xs text-[#786F68] mt-1 leading-relaxed">{currentQ.subtitle}</p>
        </div>

        {/* Options */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          {currentQ.options.map(option => {
            const isSelected = (formData as any)[currentQ.key] === option;
            return (
              <button
                key={option}
                onClick={() => handleOptionSelect(currentQ.key, option)}
                className={`p-4 rounded-xl text-left border text-xs font-bold transition-all flex items-center justify-between ${
                  isSelected
                    ? 'bg-[#F7DFCC] border-[#D96B27] text-[#8C4A1E] shadow-sm'
                    : 'bg-white border-[#E8DCCE] text-[#1C1917] hover:border-[#D96B27]'
                }`}
              >
                <span>{option}</span>
                {isSelected && <CheckCircle2 className="w-4 h-4 text-[#D96B27] shrink-0" />}
              </button>
            );
          })}
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-between pt-4 border-t border-[#E8DCCE]">
          <button
            onClick={() => setCurrentStep(prev => Math.max(0, prev - 1))}
            disabled={currentStep === 0}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors ${
              currentStep === 0
                ? 'text-[#E8DCCE] cursor-not-allowed'
                : 'text-[#786F68] hover:bg-white'
            }`}
          >
            <ArrowLeft className="w-4 h-4" /> Previous
          </button>

          <button
            onClick={handleNext}
            className="px-6 py-2.5 rounded-xl bg-[#D96B27] hover:bg-[#C55A1A] text-white font-extrabold text-xs shadow-rust flex items-center gap-2 transition-all font-heading tracking-wider"
          >
            <span>{currentStep === questions.length - 1 ? 'Generate Recovery Profile' : 'Next Question'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
