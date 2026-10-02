import React from 'react';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { Button } from '../ui/Button';
import { cn } from '../../utils/cn';

export interface TasteNavigationProps {
  onBack: () => void;
  onNext: () => void;
  onSkip?: () => void;
  nextText?: string;
  isLastStep?: boolean;
  selectedCount?: number;
  className?: string;
}

export const TasteNavigation: React.FC<TasteNavigationProps> = ({
  onBack,
  onNext,
  onSkip,
  nextText = 'Continue',
  isLastStep = false,
  selectedCount,
  className,
}) => {
  return (
    <div
      className={cn(
        'w-full flex items-center justify-between pt-6 sm:pt-8 mt-8 sm:mt-10 border-t border-white/10 max-w-4xl mx-auto',
        className
      )}
    >
      {/* Back Action */}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        leftIcon={<ArrowLeft className="w-4 h-4" />}
        onClick={onBack}
        aria-label="Go to previous step"
        className="text-slate-400 hover:text-white"
      >
        Back
      </Button>

      {/* Middle Feedback / Count */}
      <div className="flex items-center gap-3">
        {selectedCount !== undefined && selectedCount > 0 ? (
          <span className="text-xs text-luminous-cyan font-sans font-medium flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-luminous-cyan animate-pulse" />
            {selectedCount} {selectedCount === 1 ? 'selected' : 'selected'}
          </span>
        ) : onSkip ? (
          <button
            type="button"
            onClick={onSkip}
            className="text-xs text-slate-400 hover:text-white transition-colors underline-offset-4 hover:underline font-sans"
          >
            Skip this step
          </button>
        ) : null}
      </div>

      {/* Continue Action */}
      <Button
        type="button"
        variant="primary"
        size="sm"
        rightIcon={isLastStep ? <Check className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
        onClick={onNext}
        aria-label={nextText}
        className="font-semibold shadow-cyan-glow"
      >
        {nextText}
      </Button>
    </div>
  );
};

export default TasteNavigation;
