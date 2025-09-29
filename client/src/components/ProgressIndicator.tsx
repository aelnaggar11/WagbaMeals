import React from 'react';
import Logo from '@/components/Logo';

export interface Step {
  id: number;
  label: string;
}

interface ProgressIndicatorProps {
  steps: Step[];
  currentStep: number;
}

const ProgressIndicator = ({ steps, currentStep }: ProgressIndicatorProps) => {
  return (
    <div className="w-full max-w-3xl mx-auto mb-10">
      <div className="flex items-center justify-center mb-8">
        <Logo className="h-16" />
      </div>

      <div className="flex items-center justify-center">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-center">
            {/* Step Circle */}
            <div 
              className={`flex items-center justify-center w-10 h-10 rounded-full font-bold text-sm ${
                step.id <= currentStep
                  ? 'bg-primary text-white'
                  : 'bg-gray-200 text-gray-500'
              }`}
            >
              {step.id}
            </div>

            {/* Connector Line */}
            {index < steps.length - 1 && (
              <div 
                className={`h-px w-16 mx-2 ${
                  step.id < currentStep ? 'bg-primary' : 'bg-gray-200'
                }`}
              />
            )}
          </div>
        ))}
      </div>

      <div className="mt-6 text-center">
        <h1 className="text-3xl font-bold text-primary">{steps.find(step => step.id === currentStep)?.label}</h1>
        {currentStep === 1 && (
          <p className="text-gray-600 mt-2">Choose your meal plan and customize your weekly deliveries</p>
        )}
        {currentStep === 2 && (
          <p className="text-gray-600 mt-2">Select your meals for the week</p>
        )}
        {currentStep === 3 && (
          <p className="text-gray-600 mt-2">Finalise your account to start your meal subscription</p>
        )}
        {currentStep === 4 && (
          <p className="text-gray-600 mt-2">Review your order and complete payment</p>
        )}
      </div>
    </div>
  );
};

export default ProgressIndicator;