import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import ImperfectCircle from "@/components/ImperfectCircle";
import PreOnboardingModal from "@/components/PreOnboardingModal";
import { useQuery } from "@tanstack/react-query";
import { Week } from "@shared/schema";

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
      <section className="bg-secondary relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute -right-24 -top-24">
          <ImperfectCircle size="xl" opacity={0.1} />
        </div>
        <div className="absolute -left-16 top-32">
          <ImperfectCircle size="lg" opacity={0.1} />
        </div>
        
        <div className="container mx-auto px-4 py-12 md:py-20 relative z-10">
          <div className="flex flex-col md:flex-row items-center">
            <div className="md:w-1/2 mb-8 md:mb-0">
              <span className="inline-block bg-accent-foreground text-white px-3 py-1 rounded-full text-sm font-medium mb-4">Weekly Meal Delivery</span>
              <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-4 font-poppins">Healthy Meals Delivered Weekly</h1>
              <p className="text-lg md:text-xl text-gray-600 mb-6">Chef-prepared meals that save you time and keep you healthy. One delivery, one week of delicious food.</p>
              
              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <Button 
                  size="lg" 
                  onClick={handleGetStarted}
                  className="bg-primary hover:bg-primary/90 text-white"
                >
                  Get Started
                </Button>
                <Link href="#how-it-works">
                  <Button size="lg" variant="outline" className="border-accent-foreground text-accent-foreground hover:bg-accent-foreground hover:text-white">
                    Learn More
                  </Button>
                </Link>
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="flex -space-x-2">
                  {/* Testimonial Avatars */}
                  <div className="w-8 h-8 rounded-full border-2 border-white bg-gray-200"></div>
                  <div className="w-8 h-8 rounded-full border-2 border-white bg-gray-300"></div>
                  <div className="w-8 h-8 rounded-full border-2 border-white bg-gray-400"></div>
                </div>
                <p className="text-sm text-gray-600">
                  <span className="text-accent-foreground font-medium">4.9★</span> from over 2,000 happy customers
                </p>
              </div>
            </div>
            
            <div className="md:w-1/2 relative">
              <img 
                src="https://images.unsplash.com/photo-1546069901-ba9599a7e63c" 
                alt="Healthy prepared meal" 
                className="rounded-xl shadow-xl object-cover w-full h-auto"
              />
              <div className="absolute -bottom-4 -right-4 md:bottom-4 md:right-4 bg-white rounded-lg shadow-lg p-4 max-w-xs">
                <div className="flex items-center space-x-3 mb-2">
                  <div className="bg-accent rounded-full p-2">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p className="font-medium text-gray-800">Weekly Delivery</p>
                </div>
                <p className="text-sm text-gray-600">One delivery day, less hassle, fresh meals for your entire week.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <span className="inline-block bg-accent-secondary bg-opacity-20 text-accent-secondary px-3 py-1 rounded-full text-sm font-medium mb-4">Simple Process</span>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4 font-poppins">How Wagba Works</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">Get healthy chef-prepared meals delivered weekly in just a few simple steps.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="bg-secondary rounded-xl p-6 relative">
              <div className="w-12 h-12 bg-primary text-white rounded-full flex items-center justify-center text-xl font-bold mb-4">1</div>
              <h3 className="text-xl font-bold mb-3 font-poppins">Choose Your Plan</h3>
              <p className="text-gray-600 mb-4">Select how many meals you want each week and your preferred portion size.</p>
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex items-center">
                  <svg className="w-4 h-4 text-accent-foreground mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                  <p className="text-sm text-gray-600">More meals = lower price per meal</p>
                </div>
              </div>
            </div>
            
            {/* Step 2 */}
            <div className="bg-secondary rounded-xl p-6 relative">
              <div className="w-12 h-12 bg-primary text-white rounded-full flex items-center justify-center text-xl font-bold mb-4">2</div>
              <h3 className="text-xl font-bold mb-3 font-poppins">Select Your Meals</h3>
              <p className="text-gray-600 mb-4">Browse our weekly menu and pick the meals that appeal to you most.</p>
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex items-center">
                  <svg className="w-4 h-4 text-accent-foreground mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="text-sm text-gray-600">Order by weekly deadline (Wednesday)</p>
                </div>
              </div>
            </div>
            
            {/* Step 3 */}
            <div className="bg-secondary rounded-xl p-6 relative">
              <div className="w-12 h-12 bg-primary text-white rounded-full flex items-center justify-center text-xl font-bold mb-4">3</div>
              <h3 className="text-xl font-bold mb-3 font-poppins">Enjoy Your Delivery</h3>
              <p className="text-gray-600 mb-4">We deliver all your meals for the week in one go. Store, heat, and enjoy!</p>
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex items-center">
                  <svg className="w-4 h-4 text-accent-foreground mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
                  </svg>
                  <p className="text-sm text-gray-600">One weekly delivery = convenience</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <span className="inline-block bg-accent bg-opacity-20 text-accent-foreground px-3 py-1 rounded-full text-sm font-medium mb-4">Why Choose Wagba</span>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4 font-poppins">Meal Delivery, Simplified</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">Our service is designed to make healthy eating convenient, affordable, and delicious.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-300">
              <div className="w-12 h-12 bg-primary bg-opacity-10 rounded-full flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3 font-poppins">Weekly Convenience</h3>
              <p className="text-gray-600">One delivery contains all your meals for the week. Store them properly and enjoy throughout the week.</p>
            </div>
            
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-300">
              <div className="w-12 h-12 bg-accent bg-opacity-10 rounded-full flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-accent-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3 font-poppins">Nutritionally Balanced</h3>
              <p className="text-gray-600">Each meal is crafted by chefs and nutritionists to provide optimal nutrition and delicious taste.</p>
            </div>
            
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-300">
              <div className="w-12 h-12 bg-accent-secondary bg-opacity-10 rounded-full flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-accent-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3 font-poppins">Volume Discounts</h3>
              <p className="text-gray-600">The more meals you order, the lower the price per meal. Save money by ordering in bulk.</p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <span className="inline-block bg-accent-secondary bg-opacity-20 text-accent-secondary px-3 py-1 rounded-full text-sm font-medium mb-4">Questions Answered</span>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4 font-poppins">Frequently Asked Questions</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">Everything you need to know about our meal delivery service.</p>
          </div>
          
          <div className="max-w-3xl mx-auto">
            <div className="space-y-4">
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <button className="w-full flex justify-between items-center p-4 bg-white text-left">
                  <span className="font-medium">How do I store my meals for the week?</span>
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <div className="p-4 bg-gray-50 border-t border-gray-200">
                  <p className="text-gray-600">Store your meals in the refrigerator as soon as they arrive. They're designed to stay fresh for the entire week. For the best quality, we recommend consuming seafood dishes within the first 2-3 days.</p>
                </div>
              </div>
              
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <button className="w-full flex justify-between items-center p-4 bg-white text-left">
                  <span className="font-medium">What happens if I miss the ordering deadline?</span>
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <div className="p-4 bg-gray-50 border-t border-gray-200 hidden">
                  <p className="text-gray-600">If you miss the weekly deadline, our system will automatically select meals for you based on your past preferences or our chef's recommendations for that week.</p>
                </div>
              </div>
              
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <button className="w-full flex justify-between items-center p-4 bg-white text-left">
                  <span className="font-medium">Can I skip a week or pause my subscription?</span>
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <div className="p-4 bg-gray-50 border-t border-gray-200 hidden">
                  <p className="text-gray-600">Yes, you can easily skip a week or pause your subscription through your account. Just make sure to do so before the weekly ordering deadline.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* CTA Section */}
      <section className="py-20 bg-primary text-white relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute right-0 top-0 transform translate-x-1/3 -translate-y-1/2">
          <ImperfectCircle size="xl" color="#FFFFFF" opacity={0.05} />
        </div>
        <div className="absolute left-0 bottom-0 transform -translate-x-1/3 translate-y-1/3">
          <ImperfectCircle size="lg" color="#FFFFFF" opacity={0.05} />
        </div>
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-6 font-poppins">Start Your Healthy Meal Journey Today</h2>
            <p className="text-xl opacity-90 mb-8">Join thousands of Cairo residents enjoying chef-prepared meals delivered weekly to their door.</p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/meal-plans">
                <Button size="lg" className="bg-white text-primary hover:bg-gray-100 min-w-[160px]">
                  Get Started
                </Button>
              </Link>
              <Link href={`/menu/${currentWeekId}`}>
                <Button size="lg" variant="outline" className="bg-transparent border-2 border-white text-white hover:bg-white hover:text-primary min-w-[160px]">
                  Browse Menu
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default Home;
