
import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import PreOnboardingModal from "@/components/PreOnboardingModal";
import { useQuery } from "@tanstack/react-query";
import { Week } from "@shared/schema";
import logoImage from "@assets/Logo tm.png";
import headerPatternImage from "@assets/Header BG Pattern_1753742643683.png";
import loginCircleImage from "@assets/Login Circle_1753742724844.png";

const Home = () => {
  const [, navigate] = useLocation();
  const [showPreOnboardingModal, setShowPreOnboardingModal] = useState(false);
  
  // Get current available week for the menu link
  const { data: weeksData } = useQuery<{ weeks: Week[] }>({
    queryKey: ['/api/weeks'],
  });
  
  const currentWeekId = weeksData?.weeks.find(week => week.isSelectable)?.id || "current";

  const handleGetStarted = () => {
    setShowPreOnboardingModal(true);
  };

  const handlePreOnboardingSuccess = (email: string) => {
    // Navigate to meal plans page
    navigate('/meal-plans');
  };

  return (
    <>
      {/* Hero Section */}
      <section className="bg-white relative overflow-hidden min-h-screen">
        {/* Header with Logo and Login */}
        <div 
          className="relative overflow-hidden h-24 flex items-center justify-between px-8"
          style={{ 
            backgroundColor: '#A80906',
            backgroundImage: `url(${headerPatternImage})`,
            backgroundRepeat: 'repeat-x',
            backgroundSize: 'auto 96px',
            backgroundPosition: 'center'
          }}
        >
          {/* Logo */}
          <div className="relative z-10 h-14">
            <img 
              src={logoImage} 
              alt="Wagba Logo" 
              className="h-full w-auto brightness-0 invert"
            />
          </div>
          
          {/* Login Button with Circle Background - positioned to align with pattern circle */}
          <div className="relative z-10" style={{ marginRight: '10px' }}>
            <div 
              className="w-20 h-20 flex items-center justify-center cursor-pointer hover:opacity-90 transition-opacity relative"
              style={{
                backgroundImage: `url(${loginCircleImage})`,
                backgroundSize: 'cover',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'center'
              }}
              onClick={() => navigate('/auth')}
            >
              <span className="text-red-700 font-bold text-sm">
                Login
              </span>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8">
          {/* Hero Image and Text */}
          <div className="mb-8">
            <div className="relative bg-gray-100 rounded-2xl overflow-hidden mb-6" style={{ aspectRatio: '16/9' }}>
              <img 
                src="https://images.unsplash.com/photo-1546069901-ba9599a7e63c" 
                alt="Healthy prepared meal" 
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black bg-opacity-40 flex flex-col justify-center px-6">
                <h1 className="text-white text-3xl md:text-4xl lg:text-5xl font-bold leading-tight mb-2">
                  Refined recipes.
                </h1>
                <h1 className="text-white text-3xl md:text-4xl lg:text-5xl font-bold leading-tight mb-2">
                  Real ingredients.
                </h1>
                <h1 className="text-white text-3xl md:text-4xl lg:text-5xl font-bold leading-tight">
                  Ready in minutes.
                </h1>
              </div>
            </div>
          </div>

          {/* How It Works Section */}
          <div className="bg-red-600 rounded-2xl p-6 mb-8 text-white">
            <div className="text-center mb-6">
              <h2 className="text-2xl md:text-3xl font-bold flex items-center justify-center gap-2">
                <span className="text-yellow-300">✦</span>
                How It Works
                <span className="text-yellow-300">✦</span>
              </h2>
            </div>
            
            <div className="space-y-6">
              <div className="flex gap-4">
                <div className="text-5xl font-bold opacity-90">01</div>
                <div>
                  <h3 className="text-xl font-bold mb-2">Select your favorites.</h3>
                  <p className="text-red-100">
                    Choose meals that match your <em>mood</em> or <em>diet</em>.
                  </p>
                </div>
              </div>
              
              <div className="flex gap-4">
                <div className="text-5xl font-bold opacity-90">02</div>
                <div>
                  <h3 className="text-xl font-bold mb-2">We get cookin'.</h3>
                  <p className="text-red-100">
                    Our kitchen prepares everything fresh, <em>just for you</em>.
                  </p>
                </div>
              </div>
              
              <div className="flex gap-4">
                <div className="text-5xl font-bold opacity-90">03</div>
                <div>
                  <h3 className="text-xl font-bold mb-2">Delivered fresh.</h3>
                  <p className="text-red-100">
                    Your meals arrive fresh and chilled — ready to heat and eat.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Quote Section */}
          <div className="bg-red-50 rounded-2xl p-6 mb-8 relative overflow-hidden">
            {/* Decorative circles pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="grid grid-cols-6 gap-4 h-full">
                {[...Array(30)].map((_, i) => (
                  <div key={i} className="w-8 h-8 bg-red-200 rounded-full"></div>
                ))}
              </div>
            </div>
            <div className="relative z-10">
              <h2 className="text-2xl md:text-3xl font-bold text-red-800 mb-4 leading-tight">
                Make it look simple- the very complicated thing.
              </h2>
              <p className="text-red-600 font-medium text-right">
                MASSIMO BOTTURA
              </p>
            </div>
          </div>

          {/* Menu Section */}
          <div className="mb-8">
            <div className="text-center mb-6">
              <h2 className="text-2xl md:text-3xl font-bold text-red-600 flex items-center justify-center gap-2">
                <span className="text-red-500">♦</span>
                THE MENU
                <span className="text-red-500">♦</span>
              </h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                {
                  name: "Tarsh bel Tarsh",
                  description: "Drizzled with tarsh bel matroosh saleh"
                },
                {
                  name: "Tarsh a la Tarsh", 
                  description: "Steamed with torshi metmatrash saleh"
                },
                {
                  name: "Torsheeni Scalop bel Boloneezi",
                  description: "Tale3 tarsheen ommo"
                }
              ].map((meal, index) => (
                <div key={index} className="bg-white rounded-lg overflow-hidden shadow-sm">
                  <img 
                    src="https://images.unsplash.com/photo-1546069901-ba9599a7e63c" 
                    alt={meal.name}
                    className="w-full h-32 object-cover"
                  />
                  <div className="p-3">
                    <h3 className="font-bold text-sm mb-1">{meal.name}</h3>
                    <p className="text-xs text-gray-600">{meal.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Why It Works Section */}
          <div className="bg-red-600 rounded-2xl p-6 mb-8 text-white">
            <div className="text-center mb-6">
              <h2 className="text-2xl md:text-3xl font-bold flex items-center justify-center gap-2">
                <span className="text-yellow-300">✦</span>
                Why It Works
                <span className="text-yellow-300">✦</span>
              </h2>
            </div>
            
            <div className="space-y-6">
              <div className="flex gap-4 items-start">
                <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9V7L15 6.5V7.5C15 8.3 14.3 9 13.5 9S12 8.3 12 7.5V6.5L9 7V9C9 10.1 8.1 11 7 11S5 10.1 5 9V7L3 7.5V9C3 11.8 4.7 14.2 7.2 15.2C7.7 17.2 9.2 18.8 11.2 19.5L12 21.5L12.8 19.5C14.8 18.8 16.3 17.2 16.8 15.2C19.3 14.2 21 11.8 21 9Z"/>
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold mb-2">Premium culinary experience:</h3>
                  <p className="text-red-100">
                    Crafted under <em>Michelin-trained</em> leadership.
                  </p>
                </div>
              </div>
              
              <div className="flex gap-4 items-start">
                <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12,2A3,3 0 0,1 15,5V11A3,3 0 0,1 12,14A3,3 0 0,1 9,11V5A3,3 0 0,1 12,2M19,11C19,14.53 16.39,17.44 13,17.93V21H11V17.93C7.61,17.44 5,14.53 5,11H7A5,5 0 0,0 12,16A5,5 0 0,0 17,11H19Z"/>
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold mb-2">Health conscious:</h3>
                  <p className="text-red-100">
                    Nutrient-dense, high-protein, <em>fresh ingredients</em>.
                  </p>
                </div>
              </div>
              
              <div className="flex gap-4 items-start">
                <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M7,2V4H8V18A4,4 0 0,0 12,22A4,4 0 0,0 16,18V4H17V2H7M11,16C10.4,16 10,15.6 10,15C10,14.4 10.4,14 11,14C11.6,14 12,14.4 12,15C12,15.6 11.6,16 11,16M13,12C12.4,12 12,11.6 12,11C12,10.4 12.4,10 13,10C13.6,10 14,10.4 14,11C14,11.6 13.6,12 13,12M14,7H10V5H14V7Z"/>
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold mb-2">Flexible 'no-stress' plans:</h3>
                  <p className="text-red-100">
                    Pause or cancel at <em>any time</em>.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* CTA Button */}
          <div className="text-center mb-8">
            <Button 
              size="lg" 
              onClick={handleGetStarted}
              className="bg-red-600 hover:bg-red-700 text-white px-8 py-3 text-lg rounded-full"
            >
              Start Your Plan
            </Button>
          </div>

          {/* FAQ Section */}
          <div className="mb-8">
            <div className="text-center mb-6">
              <h2 className="text-2xl md:text-3xl font-bold text-red-600 flex items-center justify-center gap-2">
                <span className="text-red-500">♦</span>
                FAQ
                <span className="text-red-500">♦</span>
              </h2>
            </div>
            
            <div className="bg-red-50 rounded-2xl p-6">
              <div className="text-center mb-4">
                <h3 className="text-lg font-bold text-gray-800 mb-2">Meal delivery, made easy</h3>
                <p className="text-sm text-gray-600">Quick answers about our weekly meals, plans, and delivery.</p>
              </div>
              
              <div className="space-y-3">
                {[
                  "How does weekly delivery work?",
                  "Can I skip or change a week?", 
                  "What meals are on the menu?",
                  "Do you use eco-friendly packaging?"
                ].map((question, index) => (
                  <div key={index} className="bg-white rounded-lg p-4 flex justify-between items-center cursor-pointer hover:bg-gray-50">
                    <span className="text-sm text-gray-700">{question}</span>
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                ))}
              </div>
            </div>
          </div>

          
        </div>
      </section>

      {/* Floating Get Started Button */}
      <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
        <Button 
          size="lg" 
          onClick={handleGetStarted}
          className="bg-red-600 hover:bg-red-700 text-white px-8 py-4 text-lg rounded-full shadow-lg hover:shadow-xl transition-all duration-300 animate-pulse"
        >
          Get Started
        </Button>
      </div>

      {/* Pre-onboarding Modal */}
      <PreOnboardingModal
        isOpen={showPreOnboardingModal}
        onClose={() => setShowPreOnboardingModal(false)}
        onSuccess={handlePreOnboardingSuccess}
      />
    </>
  );
};

export default Home;
