import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Button as MovingBorderButton } from "@/components/ui/moving-border";
import PreOnboardingModal from "@/components/PreOnboardingModal";
import { useQuery } from "@tanstack/react-query";
import { Week } from "@shared/schema";
import logoImage from "@assets/Logo tm.png";
import loginButtonImage from "@assets/login button_1764013193537.png";
import quoteBgPatternImage from "@assets/Quote BG Pattern_1753819991596.png";
import wiwIcon1 from "@assets/WIW Icon 1_1756464641444.png";
import wiwIcon2 from "@assets/WIW Icon 2_1756464653354.png";
import wiwIcon3 from "@assets/WIW Icon 3_1756464677092.png";
import heroImage from "@assets/Hero wagba 1_1764100012422.png";

const Home = () => {
  const [, navigate] = useLocation();
  const [showPreOnboardingModal, setShowPreOnboardingModal] = useState(false);
  const [expandedFaqs, setExpandedFaqs] = useState<number[]>([]);
  const [displayedText, setDisplayedText] = useState("");
  const carouselRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  
  const words = ["Hassle", "Shopping", "Cooking", "Cleaning", "Mess"];
  
  useEffect(() => {
    let currentWordIndex = 0;
    let currentCharIndex = 0;
    let isTyping = true;
    let timeoutId: NodeJS.Timeout;
    
    const updateText = () => {
      const currentWord = words[currentWordIndex];
      
      if (isTyping) {
        // Typing phase
        if (currentCharIndex < currentWord.length) {
          setDisplayedText(currentWord.slice(0, currentCharIndex + 1));
          currentCharIndex++;
          timeoutId = setTimeout(updateText, 80); // Type speed
        } else {
          // Pause before deleting
          isTyping = false;
          currentCharIndex = currentWord.length;
          timeoutId = setTimeout(updateText, 500); // Pause time
        }
      } else {
        // Deleting phase
        if (currentCharIndex > 0) {
          currentCharIndex--;
          setDisplayedText(currentWord.slice(0, currentCharIndex));
          timeoutId = setTimeout(updateText, 80); // Delete speed
        } else {
          // Move to next word
          currentWordIndex = (currentWordIndex + 1) % words.length;
          isTyping = true;
          currentCharIndex = 0;
          timeoutId = setTimeout(updateText, 300); // Pause between words
        }
      }
    };
    
    timeoutId = setTimeout(updateText, 0);
    
    return () => clearTimeout(timeoutId);
  }, []);

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

  // Carousel drag handlers
  const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    if (!carouselRef.current) return;
    
    setIsDragging(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    setDragStart(clientX - carouselRef.current.offsetLeft);
    setScrollLeft(carouselRef.current.scrollLeft);
  };

  const handleDragMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging || !carouselRef.current) return;
    
    e.preventDefault();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const walk = (clientX - carouselRef.current.offsetLeft) - dragStart;
    carouselRef.current.scrollLeft = scrollLeft - walk;
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  return (
    <>
      {/* Hero Section */}
      <section className="bg-white relative overflow-hidden min-h-screen">
        {/* Header with Logo and Login */}
        <div 
          className="relative overflow-hidden flex items-center justify-between px-3 sm:px-4 md:px-6 lg:px-8 py-3 sm:py-4 md:py-6 lg:py-6"
          style={{ 
            backgroundColor: '#a80906'
          }}
        >
          {/* Logo */}
          <div className="relative z-10 h-10 sm:h-12 md:h-14">
            <img 
              src={logoImage} 
              alt="Wagba Logo" 
              className="h-full w-auto brightness-0 invert"
            />
          </div>

          {/* Login Button */}
          <div className="relative z-10">
            <img 
              src={loginButtonImage}
              alt="Login"
              className="cursor-pointer hover:opacity-80 transition-opacity w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 lg:w-24 lg:h-24 object-contain"
              onClick={() => navigate('/auth?tab=login&skip_progress=true')}
            />
          </div>
        </div>

        <div className="container mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
          {/* Hero Image and Text */}
          <div className="mb-6 sm:mb-7 md:mb-8 lg:mb-10">
            <div className="relative bg-gray-100 rounded-xl sm:rounded-2xl overflow-hidden" style={{ aspectRatio: '16/9' }}>
              <img 
                src={heroData?.backgroundImageUrl || heroImage}
                alt="Healthy prepared meal" 
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black bg-opacity-40 flex flex-col justify-center px-3 sm:px-4 md:px-6 lg:px-8">
                <h1 className="text-white text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold leading-tight mb-1 sm:mb-2">Chef-Crafted Meals</h1>
                <h1 className="text-white text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold leading-tight">Without the <span className="inline-block min-w-[120px] sm:min-w-[150px] md:min-w-[200px] lg:min-w-[220px] text-left">{displayedText}</span></h1>
              </div>
            </div>
          </div>

          {/* How It Works Section */}
          <div className="rounded-xl sm:rounded-2xl p-4 sm:p-5 md:p-6 lg:p-8 mb-6 sm:mb-8 text-white" style={{ backgroundColor: '#A80906' }}>
            <div className="text-center mb-4 sm:mb-6">
              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold flex items-center justify-center gap-2">
                <span className="text-yellow-300">✦</span>
                How It Works
                <span className="text-yellow-300">✦</span>
              </h2>
            </div>

            <div className="space-y-4 sm:space-y-5 md:space-y-6 md:max-w-lg md:mx-auto">
              <div className="flex gap-3 sm:gap-4">
                <div className="text-4xl sm:text-5xl font-bold opacity-90 flex-shrink-0">01</div>
                <div className="min-w-0">
                  <h3 className="text-base sm:text-lg md:text-xl font-bold mb-1 sm:mb-2">Select your favorites</h3>
                  <p className="text-xs sm:text-sm md:text-base text-red-100">
                    Choose meals that match your <em>mood</em> or <em>diet</em>.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 sm:gap-4">
                <div className="text-4xl sm:text-5xl font-bold opacity-90 flex-shrink-0">02</div>
                <div className="min-w-0">
                  <h3 className="text-base sm:text-lg md:text-xl font-bold mb-1 sm:mb-2">We get cookin'</h3>
                  <p className="text-xs sm:text-sm md:text-base text-red-100">
                    Our kitchen prepares everything fresh, <em>just for you</em>.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 sm:gap-4">
                <div className="text-4xl sm:text-5xl font-bold opacity-90 flex-shrink-0">03</div>
                <div className="min-w-0">
                  <h3 className="text-base sm:text-lg md:text-xl font-bold mb-1 sm:mb-2">Delivered fresh</h3>
                  <p className="text-xs sm:text-sm md:text-base text-red-100">
                    Your meals arrive fresh and chilled — ready to heat and eat.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Quote Section */}
          <div 
            className="rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8 lg:p-10 mb-6 sm:mb-8 relative overflow-hidden"
            style={{
              backgroundImage: `url(${quoteBgPatternImage})`,
              backgroundSize: 'cover',
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'center',
              minHeight: '180px'
            }}
          >
            <div className="relative z-10 flex flex-col justify-center h-full">
              <h2 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-red-800 mb-4 sm:mb-6 leading-tight">
                Make it look simple-<br/>the very complicated thing.
              </h2>
              <p className="text-red-700 font-bold text-right text-sm sm:text-base md:text-lg">
                MASSIMO BOTTURA
              </p>
            </div>
          </div>

          {/* Menu Section */}
          <div className="mb-6 sm:mb-8">
            <div className="text-center mb-4 sm:mb-6">
              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold flex items-center justify-center gap-2" style={{ color: '#A80906' }}>
                <span className="text-yellow-300">✦</span>
                THE MENU
                <span className="text-yellow-300">✦</span>
              </h2>
            </div>

            {/* Carousel Container with Drag Support */}
            <div 
              ref={carouselRef}
              className="relative overflow-x-auto overflow-y-hidden cursor-grab active:cursor-grabbing"
              onMouseDown={(e) => handleDragStart(e)}
              onMouseMove={(e) => handleDragMove(e)}
              onMouseUp={() => handleDragEnd()}
              onMouseLeave={() => handleDragEnd()}
              onTouchStart={(e) => handleDragStart(e)}
              onTouchMove={(e) => handleDragMove(e)}
              onTouchEnd={() => handleDragEnd()}
              style={{
                scrollBehavior: isDragging ? 'auto' : 'smooth',
                msOverflowStyle: 'none',
                scrollbarWidth: 'none'
              }}
            >
              <div className="flex gap-2 sm:gap-3 md:gap-4" style={{
                transform: isDragging ? 'none' : undefined,
                transition: isDragging ? 'none' : 'transform 0.3s ease-out'
              }}>
                {/* Display meals from database */}
                {carouselMeals.filter(meal => meal.isActive).map((meal, index) => (
                  <div 
                    key={meal.id} 
                    className="bg-white rounded-lg overflow-hidden shadow-sm flex-shrink-0 w-40 sm:w-48 md:w-56 lg:w-64"
                    style={{ aspectRatio: '1/1.15' }}
                  >
                    <div className="w-full h-40 sm:h-48 md:h-56 lg:h-64">
                      <img 
                        src={meal.imageUrl}
                        alt={meal.name}
                        className="w-full h-full object-cover"
                        draggable={false}
                      />
                    </div>
                    <div className="p-2 sm:p-3">
                      <h3 className="font-bold text-xs sm:text-sm line-clamp-1">{meal.name}</h3>
                    </div>
                  </div>
                ))}
                {/* Duplicate items for seamless loop */}
                {carouselMeals.filter(meal => meal.isActive).slice(0, 3).map((meal, index) => (
                  <div 
                    key={`duplicate-${meal.id}`} 
                    className="bg-white rounded-lg overflow-hidden shadow-sm flex-shrink-0 w-40 sm:w-48 md:w-56 lg:w-64"
                    style={{ aspectRatio: '1/1.15' }}
                  >
                    <div className="w-full h-40 sm:h-48 md:h-56 lg:h-64">
                      <img 
                        src={meal.imageUrl}
                        alt={meal.name}
                        className="w-full h-full object-cover"
                        draggable={false}
                      />
                    </div>
                    <div className="p-2 sm:p-3">
                      <h3 className="font-bold text-xs sm:text-sm line-clamp-1">{meal.name}</h3>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Why It Works Section */}
          <div className="rounded-xl sm:rounded-2xl p-4 sm:p-5 md:p-6 lg:p-8 mb-6 sm:mb-8 text-white" style={{ backgroundColor: '#A80906' }}>
            <div className="text-center mb-4 sm:mb-6">
              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold flex items-center justify-center gap-2">
                <span className="text-yellow-300">✦</span>
                Why It Works
                <span className="text-yellow-300">✦</span>
              </h2>
            </div>

            <div className="space-y-4 sm:space-y-5 md:space-y-6 md:max-w-lg md:mx-auto">
              <div className="flex gap-3 sm:gap-4 items-start">
                <div className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center flex-shrink-0">
                  <img src={wiwIcon1} alt="Premium culinary experience" className="w-8 h-8 sm:w-10 sm:h-10 object-contain" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm sm:text-base md:text-lg font-bold mb-1 sm:mb-2">Premium culinary experience:</h3>
                  <p className="text-xs sm:text-sm md:text-base text-red-100">
                    Crafted under <em>Michelin-trained</em> leadership.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 sm:gap-4 items-start">
                <div className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center flex-shrink-0">
                  <img src={wiwIcon2} alt="Health conscious" className="w-8 h-8 sm:w-10 sm:h-10 object-contain" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm sm:text-base md:text-lg font-bold mb-1 sm:mb-2">Health conscious:</h3>
                  <p className="text-xs sm:text-sm md:text-base text-red-100">
                    Nutrient-dense, high-protein, <em>fresh ingredients</em>.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 sm:gap-4 items-start">
                <div className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center flex-shrink-0">
                  <img src={wiwIcon3} alt="Flexible no-stress plans" className="w-8 h-8 sm:w-10 sm:h-10 object-contain" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm sm:text-base md:text-lg font-bold mb-1 sm:mb-2">Flexible 'no-stress' plans:</h3>
                  <p className="text-xs sm:text-sm md:text-base text-red-100">
                    Pause or cancel at <em>any time</em>.
                  </p>
                </div>
              </div>
            </div>
          </div>



          {/* FAQ Section */}
          <div className="mb-8 sm:mb-10 md:mb-12">
            <div className="text-center mb-4 sm:mb-6">
              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold flex items-center justify-center gap-2" style={{ color: '#A80906' }}>
                <span className="text-yellow-300">✦</span>
                FAQ
                <span className="text-yellow-300">✦</span>
              </h2>
            </div>

            <div className="rounded-xl sm:rounded-2xl p-4 sm:p-5 md:p-6 lg:p-8" style={{ backgroundColor: '#FCEEF3' }}>
              <div className="text-center mb-3 sm:mb-4">
                <h3 className="text-base sm:text-lg font-bold text-gray-800 mb-1 sm:mb-2">Meal delivery, made easy</h3>
                <p className="text-xs sm:text-sm text-gray-600">Quick answers about our weekly meals, plans, and delivery.</p>
              </div>

              <div className="space-y-2 sm:space-y-3">
                {faqs.filter(faq => faq.isActive).sort((a, b) => a.displayOrder - b.displayOrder).map((faq) => {
                  const isExpanded = expandedFaqs.includes(faq.id);
                  return (
                    <div key={faq.id} className="bg-white rounded-lg overflow-hidden">
                      <div 
                        className="p-3 sm:p-4 flex justify-between items-start sm:items-center cursor-pointer hover:bg-gray-50 gap-2"
                        onClick={() => toggleFaq(faq.id)}
                      >
                        <span className="text-xs sm:text-sm text-gray-700 font-bold line-clamp-2">{faq.question}</span>
                        <svg 
                          className={`w-4 h-4 text-gray-400 transform transition-transform flex-shrink-0 mt-1 sm:mt-0 ${
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
                        <div className="px-3 sm:px-4 pb-3 sm:pb-4 border-t border-gray-100">
                          <p className="text-xs sm:text-sm text-gray-600 pt-2 sm:pt-3 italic">{faq.answer}</p>
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
      <div className="fixed bottom-4 sm:bottom-5 md:bottom-6 left-1/2 transform -translate-x-1/2 z-50 px-2 max-w-full">
        <MovingBorderButton
          borderRadius="1.75rem"
          onClick={handleGetStarted}
          className="bg-yellow-300 dark:bg-yellow-300 text-black border-yellow-400 dark:border-yellow-400 px-4 sm:px-6 md:px-8 py-2 text-xs sm:text-sm md:text-lg font-semibold whitespace-nowrap"
          containerClassName="h-12 sm:h-14 md:h-16 min-w-40 sm:min-w-44 md:min-w-48 p-[3px]"
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