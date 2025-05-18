import { Link } from "wouter";
import Logo from "@/components/Logo";
import { 
  Facebook, 
  Instagram, 
  Twitter, 
  MapPin, 
  Phone, 
  Mail 
} from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-gray-800 text-white pt-16 pb-8">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          <div>
            <Logo color="light" className="mb-4" />
            <p className="text-gray-400 mb-4">
              Healthy, chef-prepared meals delivered weekly to your door in Cairo.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="text-gray-400 hover:text-white transition duration-300">
                <Facebook size={18} />
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition duration-300">
                <Instagram size={18} />
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition duration-300">
                <Twitter size={18} />
              </a>
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-bold mb-4">Site Links</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/">
                  <a className="text-gray-400 hover:text-white transition duration-300">Home</a>
                </Link>
              </li>
              <li>
                <Link href="/#how-it-works">
                  <a className="text-gray-400 hover:text-white transition duration-300">How It Works</a>
                </Link>
              </li>
              <li>
                <Link href="/menu/current">
                  <a className="text-gray-400 hover:text-white transition duration-300">Menu</a>
                </Link>
              </li>
              <li>
                <Link href="/meal-plans">
                  <a className="text-gray-400 hover:text-white transition duration-300">Pricing</a>
                </Link>
              </li>
              <li>
                <Link href="/about">
                  <a className="text-gray-400 hover:text-white transition duration-300">About Us</a>
                </Link>
              </li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-lg font-bold mb-4">Support</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/faq">
                  <a className="text-gray-400 hover:text-white transition duration-300">FAQ</a>
                </Link>
              </li>
              <li>
                <Link href="/contact">
                  <a className="text-gray-400 hover:text-white transition duration-300">Contact Us</a>
                </Link>
              </li>
              <li>
                <Link href="/terms">
                  <a className="text-gray-400 hover:text-white transition duration-300">Terms of Service</a>
                </Link>
              </li>
              <li>
                <Link href="/privacy">
                  <a className="text-gray-400 hover:text-white transition duration-300">Privacy Policy</a>
                </Link>
              </li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-lg font-bold mb-4">Contact</h3>
            <ul className="space-y-2">
              <li className="flex items-start">
                <MapPin className="mt-1 mr-2 text-gray-400" size={16} />
                <span className="text-gray-400">123 Tahrir Square, Cairo, Egypt</span>
              </li>
              <li className="flex items-start">
                <Phone className="mt-1 mr-2 text-gray-400" size={16} />
                <span className="text-gray-400">+20 123 456 7890</span>
              </li>
              <li className="flex items-start">
                <Mail className="mt-1 mr-2 text-gray-400" size={16} />
                <span className="text-gray-400">info@wagba.com</span>
              </li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-gray-700 pt-8 mt-8 text-center">
          <p className="text-gray-400 text-sm">&copy; {new Date().getFullYear()} Wagba. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
