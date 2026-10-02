import React from 'react';
import { Check } from 'lucide-react';
import { cn } from '../../utils/cn';

export interface StepInfo {
  number: number;
  label: string;
}

export interface TasteProgressProps {
  currentStep: number;
  totalSteps: number;
  steps: StepInfo[];
  className?: string;
}

export const TasteProgress: React.FC<TasteProgressProps> = ({
  currentStep,
  totalSteps,
  steps,
  className,
}) => {
  const currentStepInfo = steps.find((s) => s.number === currentStep) || steps[0];

  return (
    <div
      role="progressbar"
      aria-label="Taste Discovery progress"
      aria-valuenow={currentStep}
      aria-valuemin={1}
      aria-valuemax={totalSteps}
      aria-valuetext={`Step ${currentStep} of ${totalSteps}: ${currentStepInfo?.label || ''}`}
      className={cn('w-full flex flex-col items-center mb-8 sm:mb-10', className)}
    >
      {/* Step Context Readout */}
      <div className="flex items-center justify-between w-full max-w-xl text-xs font-sans text-slate-400 mb-3 px-1">
        <span className="text-telemetry text-luminous-cyan font-semibold tracking-wider uppercase">
          Step {currentStep} of {totalSteps} • {currentStepInfo?.label}
        </span>
        <span className="text-[11px] text-slate-400 opacity-80">
          Personal Resonance Elicitation
        </span>
      </div>

      {/* Five-node Constellation Progress Spine */}
      <div className="relative flex items-center justify-between w-full max-w-xl px-4 py-2">
        {/* Background track line */}
        <div className="absolute left-6 right-6 top-1/2 -translate-y-1/2 h-0.5 bg-white/10 -z-0" />

        {/* Filled progress line */}
        <div
          className="absolute left-6 top-1/2 -translate-y-1/2 h-0.5 bg-gradient-to-r from-luminous-cyan to-secondary transition-all duration-500 -z-0"
          style={{
            width: `${Math.max(0, Math.min(100, ((currentStep - 1) / (totalSteps - 1)) * 100))}%`,
          }}
        />

        {/* Interactive Step Nodes */}
        {steps.map((step) => {
          const isCompleted = step.number < currentStep;
          const isCurrent = step.number === currentStep;

          return (
            <div
              key={step.number}
              className="relative z-10 flex flex-col items-center group select-none"
            >
              <div
                className={cn(
                  'w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-all duration-300 border',
                  isCompleted && 'bg-luminous-cyan/20 border-luminous-cyan text-luminous-cyan shadow-cyan-glow',
                  isCurrent && 'bg-luminous-cyan text-obsidian-void border-luminous-cyan ring-4 ring-luminous-cyan/25 shadow-cyan-glow scale-110 font-bold',
                  !isCompleted && !isCurrent && 'bg-obsidian-plate border-white/10 text-slate-400'
                )}
                aria-current={isCurrent ? 'step' : undefined}
              >
                {isCompleted ? <Check className="w-3.5 h-3.5 stroke-[2.5]" /> : step.number}
              </div>
              <span
                className={cn(
                  'hidden sm:block absolute -bottom-5 text-[10px] whitespace-nowrap font-medium transition-colors',
                  isCurrent ? 'text-white' : isCompleted ? 'text-slate-300' : 'text-slate-400'
                )}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TasteProgress;
