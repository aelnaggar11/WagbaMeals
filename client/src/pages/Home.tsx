
import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Button as MovingBorderButton } from "@/components/ui/moving-border";
import PreOnboardingModal from "@/components/PreOnboardingModal";
import { useQuery } from "@tanstack/react-query";
import { Week } from "@shared/schema";
import logoImage from "@assets/Logo tm.png";
import headerPatternImage from "@assets/Header BG Pattern_1753742643683.png";
import loginCircleImage from "@assets/Login Circle_1756808325537.png";
import quoteBgPatternImage from "@assets/Quote BG Pattern_1753819991596.png";
import wiwIcon1 from "@assets/WIW Icon 1_1756464641444.png";
import wiwIcon2 from "@assets/WIW Icon 2_1756464653354.png";
import wiwIcon3 from "@assets/WIW Icon 3_1756464677092.png";

const Home = () => {
  const [, navigate] = useLocation();
  const [showPreOnboardingModal, setShowPreOnboardingModal] = useState(false);
  const [expandedFaqs, setExpandedFaqs] = useState<number[]>([]);
  
  // Get current available week for the menu link
  const { data: weeksData } = useQuery<{ weeks: Week[] }>({
    queryKey: ['/api/weeks'],
  });
  
  // Fetch landing page content
  const { data: heroData } = useQuery<any>({
    queryKey: ['/api/landing/hero'],
  });
  
  const { data: carouselMeals = [] } = useQuery<any[]>({
    queryKey: ['/api/landing/carousel-meals'],
  });
  
  const { data: faqs = [] } = useQuery<any[]>({
    queryKey: ['/api/landing/faqs'],
  });
  
  const currentWeekId = weeksData?.weeks.find(week => week.isSelectable)?.id || "current";

  const handleGetStarted = () => {
    setShowPreOnboardingModal(true);
  };

  const handlePreOnboardingSuccess = (email: string) => {
    // Navigate to meal plans page
    navigate('/meal-plans');
  };
  
  const toggleFaq = (faqId: number) => {
    setExpandedFaqs(prev => 
      prev.includes(faqId) 
        ? prev.filter(id => id !== faqId)
        : [...prev, faqId]
    );
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
              onClick={() => navigate('/auth?tab=login&skip_progress=true')}
            >
              <img 
                src={loginCircleImage}
                alt="Login Circle"
                className="absolute inset-0 w-full h-full"
                style={{ 
                  imageRendering: 'crisp-edges',
                  filter: 'none',
                  objectFit: 'contain',
                  width: '100%',
                  height: '100%',
                  maxWidth: '80px',
                  maxHeight: '80px'
                }}
              />
              <span className="relative z-10 text-red-700 font-bold text-sm">
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
                src={heroData?.backgroundImageUrl || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c"}
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
          <div className="rounded-2xl p-6 mb-8 text-white" style={{ backgroundColor: '#A80906' }}>
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
                  <h3 className="text-xl font-bold mb-2">Select your favorites</h3>
                  <p className="text-red-100">
                    Choose meals that match your <em>mood</em> or <em>diet</em>.
                  </p>
                </div>
              </div>
              
              <div className="flex gap-4">
                <div className="text-5xl font-bold opacity-90">02</div>
                <div>
                  <h3 className="text-xl font-bold mb-2">We get cookin'</h3>
                  <p className="text-red-100">
                    Our kitchen prepares everything fresh, <em>just for you</em>.
                  </p>
                </div>
              </div>
              
              <div className="flex gap-4">
                <div className="text-5xl font-bold opacity-90">03</div>
                <div>
                  <h3 className="text-xl font-bold mb-2">Delivered fresh</h3>
                  <p className="text-red-100">
                    Your meals arrive fresh and chilled — ready to heat and eat.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Quote Section */}
          <div 
            className="rounded-2xl p-8 mb-8 relative overflow-hidden"
            style={{
              backgroundImage: `url(${quoteBgPatternImage})`,
              backgroundSize: 'cover',
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'center',
              minHeight: '200px'
            }}
          >
            <div className="relative z-10 flex flex-col justify-center h-full">
              <h2 className="text-2xl md:text-3xl font-bold text-red-800 mb-6 leading-tight">
                Make it look simple-<br/>the very complicated thing.
              </h2>
              <p className="text-red-700 font-bold text-right text-lg">
                MASSIMO BOTTURA
              </p>
            </div>
          </div>

          {/* Menu Section */}
          <div className="mb-8">
            <div className="text-center mb-6">
              <h2 className="text-2xl md:text-3xl font-bold flex items-center justify-center gap-2" style={{ color: '#A80906' }}>
                <span className="text-yellow-300">✦</span>
                THE MENU
                <span className="text-yellow-300">✦</span>
              </h2>
            </div>
            
            {/* Carousel Container */}
            <div className="relative overflow-hidden">
              <div className="flex gap-4 animate-scroll">
                {/* Display meals from database */}
                {carouselMeals.filter(meal => meal.isActive).map((meal, index) => (
                  <div key={meal.id} className="bg-white rounded-lg overflow-hidden shadow-sm flex-shrink-0 w-64">
                    <img 
                      src={meal.imageUrl}
                      alt={meal.name}
                      className="w-full h-32 object-cover"
                    />
                    <div className="p-3">
                      <h3 className="font-bold text-sm mb-1">{meal.name}</h3>
                      <p className="text-xs text-gray-600">{meal.description}</p>
                    </div>
                  </div>
                ))}
                {/* Duplicate items for seamless loop */}
                {carouselMeals.filter(meal => meal.isActive).slice(0, 3).map((meal, index) => (
                  <div key={`duplicate-${meal.id}`} className="bg-white rounded-lg overflow-hidden shadow-sm flex-shrink-0 w-64">
                    <img 
                      src={meal.imageUrl}
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
          </div>

          {/* Why It Works Section */}
          <div className="rounded-2xl p-6 mb-8 text-white" style={{ backgroundColor: '#A80906' }}>
            <div className="text-center mb-6">
              <h2 className="text-2xl md:text-3xl font-bold flex items-center justify-center gap-2">
                <span className="text-yellow-300">✦</span>
                Why It Works
                <span className="text-yellow-300">✦</span>
              </h2>
            </div>
            
            <div className="space-y-6">
              <div className="flex gap-4 items-start">
                <div className="w-12 h-12 flex items-center justify-center flex-shrink-0">
                  <img src={wiwIcon1} alt="Premium culinary experience" className="w-10 h-10 object-contain" />
                </div>
                <div>
                  <h3 className="text-lg font-bold mb-2">Premium culinary experience:</h3>
                  <p className="text-red-100">
                    Crafted under <em>Michelin-trained</em> leadership.
                  </p>
                </div>
              </div>
              
              <div className="flex gap-4 items-start">
                <div className="w-12 h-12 flex items-center justify-center flex-shrink-0">
                  <img src={wiwIcon2} alt="Health conscious" className="w-10 h-10 object-contain" />
                </div>
                <div>
                  <h3 className="text-lg font-bold mb-2">Health conscious:</h3>
                  <p className="text-red-100">
                    Nutrient-dense, high-protein, <em>fresh ingredients</em>.
                  </p>
                </div>
              </div>
              
              <div className="flex gap-4 items-start">
                <div className="w-12 h-12 flex items-center justify-center flex-shrink-0">
                  <img src={wiwIcon3} alt="Flexible no-stress plans" className="w-10 h-10 object-contain" />
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

          

          {/* FAQ Section */}
          <div className="mb-8">
            <div className="text-center mb-6">
              <h2 className="text-2xl md:text-3xl font-bold flex items-center justify-center gap-2" style={{ color: '#A80906' }}>
                <span className="text-yellow-300">✦</span>
                FAQ
                <span className="text-yellow-300">✦</span>
              </h2>
            </div>
            
            <div className="bg-red-50 rounded-2xl p-6">
              <div className="text-center mb-4">
                <h3 className="text-lg font-bold text-gray-800 mb-2">Meal delivery, made easy</h3>
                <p className="text-sm text-gray-600">Quick answers about our weekly meals, plans, and delivery.</p>
              </div>
              
              <div className="space-y-3">
                {faqs.filter(faq => faq.isActive).sort((a, b) => a.displayOrder - b.displayOrder).map((faq) => {
                  const isExpanded = expandedFaqs.includes(faq.id);
                  return (
                    <div key={faq.id} className="bg-white rounded-lg overflow-hidden">
                      <div 
                        className="p-4 flex justify-between items-center cursor-pointer hover:bg-gray-50"
                        onClick={() => toggleFaq(faq.id)}
                      >
                        <span className="text-sm text-gray-700">{faq.question}</span>
                        <svg 
                          className={`w-4 h-4 text-gray-400 transform transition-transform ${
                            isExpanded ? 'rotate-180' : ''
                          }`} 
                          fill="none" 
                          stroke="currentColor" 
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                      {isExpanded && (
                        <div className="px-4 pb-4 border-t border-gray-100">
                          <p className="text-sm text-gray-600 pt-3">{faq.answer}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          
        </div>
      </section>

      {/* Floating Get Started Button */}
      <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
        <MovingBorderButton
          borderRadius="1.75rem"
          onClick={handleGetStarted}
          className="bg-yellow-300 dark:bg-yellow-300 text-black border-yellow-400 dark:border-yellow-400 px-8 py-2 text-lg font-semibold whitespace-nowrap"
          containerClassName="h-16 min-w-48 p-[3px]"
          borderClassName="bg-[radial-gradient(#0ea5e9_40%,#3b82f6_60%,transparent_80%)] h-32 w-32"
        >
          {heroData?.ctaText || "Get Started"}
        </MovingBorderButton>
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
