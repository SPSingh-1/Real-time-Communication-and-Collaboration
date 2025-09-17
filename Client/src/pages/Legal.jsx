// src/pages/Legal.jsx
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FaFacebookF } from "react-icons/fa";
import { FaSquareXTwitter } from "react-icons/fa6";
import { FaInstagramSquare } from "react-icons/fa";
import { CiLinkedin } from "react-icons/ci";
import { FaGithub } from "react-icons/fa";
// eslint-disable-next-line no-unused-vars
import { motion } from "framer-motion";
import { Menu } from "lucide-react";

const Legal = () => {

  const [isVisible, setIsVisible] = useState({});
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
      useEffect(() => {
          const observer = new IntersectionObserver(
            (entries) => {
              entries.forEach((entry) => {
                if (entry.isIntersecting) {
                  setIsVisible(prev => ({
                    ...prev,
                    [entry.target.id]: true
                  }));
                }
              });
            },
            { threshold: 0.1 }
          );
      
          const sections = document.querySelectorAll('.observe-section');
          sections.forEach((section) => observer.observe(section));
      
          return () => observer.disconnect();
        }, []);

        const navItems = [
    { href: "#legal&policies", label: "Legal&Policies" },
    { href: "#terms-of-service", label: "Terms-of-Service" },
    { href: "#footer", label: "Contact" }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800 text-white p-12 flex flex-col items-start px-4 sm:px-6 lg:px-8">

      {/* Header */}
       <header style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        background: 'linear-gradient(45deg, #667eea, #764ba2)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        padding: '1rem 2rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        transition: 'all 0.3s ease'
      }}>
        {/* Logo */}
        <div style={{
          fontSize: 'clamp(1.2rem, 4vw, 1.4rem)',
          fontWeight: 800,
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          //background: 'linear-gradient(45deg, #667eea, #764ba2)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'white',
          backgroundClip: 'text',
          color: 'white',
          cursor: 'pointer',
          userSelect: 'none',
        }}>
          <img 
            src="/logo.png" 
            alt="Logo" 
            style={{ 
              height: 'clamp(30px, 8vw, 50px)', 
              verticalAlign: 'middle',
              borderRadius: '30px' 
            }} 
          />
          Milapp
        </div>
        
        {/* Desktop Navigation */}
        <nav style={{ 
          display: 'flex', 
          gap: '2rem',
          '@media (maxWidth: 768px)': {
            display: 'none'
          }
        }} className="desktop-nav">
          {navItems.map((item, index) => (
            <a 
              key={index}
              href={item.href} 
              style={{
                color: 'white',
                textDecoration: 'none',
                fontWeight: 500,
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              {item.label}
            </a>
          ))}
        </nav>
        
        {/* Desktop Auth Buttons */}
        <div style={{ display: 'flex', gap: '1rem' }} className="desktop-auth">
          <button style={{
            padding: 'clamp(0.5rem, 2vw, 0.75rem) clamp(1rem, 3vw, 1.5rem)',
            borderRadius: '50px',
            fontWeight: 600,
            border: '2px solid white',
            color: 'white',
            background: 'transparent',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            fontSize: 'clamp(0.8rem, 2vw, 1rem)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'white';
            e.currentTarget.style.color = '#667eea';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = 'white';
          }}
          >
            <Link to="/register" style={{ textDecoration: 'none', color: 'inherit' }}>
              Sign up
            </Link>
          </button>
          <button style={{
            padding: 'clamp(0.5rem, 2vw, 0.75rem) clamp(1rem, 3vw, 1.5rem)',
            borderRadius: '50px',
            fontWeight: 600,
            background: 'linear-gradient(45deg, #667eea, #764ba2)',
            color: 'white',
            border: 'none',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            fontSize: 'clamp(0.8rem, 2vw, 1rem)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 10px 25px rgba(102, 126, 234, 0.3)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = 'none';
          }}
          >
            <Link to="/login" style={{ textDecoration: 'none', color: 'inherit' }}>
              Log In
            </Link>
          </button>
        </div>

        {/* Mobile Menu Button */}
        <button 
          className="mobile-menu-btn"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          style={{
            display: 'none',
            background: 'none',
            border: 'none',
            color: 'white',
            fontSize: '1.5rem',
            cursor: 'pointer',
            padding: '0.5rem',
            borderRadius: '8px',
            transition: 'all 0.3s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'none';
          }}
        >
          {isMobileMenuOpen ? <X /> : <Menu />}
        </button>

        {/* Mobile Menu Overlay */}
        {isMobileMenuOpen && (
          <div 
            className="mobile-menu"
            style={{
              position: 'fixed',
              top: '80px',
              left: 0,
              right: 0,
              background: 'rgba(102, 126, 234, 0.95)',
              backdropFilter: 'blur(20px)',
              padding: '2rem',
              zIndex: 999,
              animation: 'slideDown 0.3s ease-out'
            }}
          >
            <nav style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '2rem' }}>
              {navItems.map((item, index) => (
                <a 
                  key={index}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  style={{
                    color: 'white',
                    textDecoration: 'none',
                    fontWeight: 500,
                    padding: '1rem',
                    borderRadius: '12px',
                    transition: 'all 0.3s ease',
                    textAlign: 'center',
                    fontSize: '1.1rem'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  {item.label}
                </a>
              ))}
            </nav>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <button style={{
                padding: '1rem 2rem',
                borderRadius: '50px',
                fontWeight: 600,
                border: '2px solid white',
                color: 'white',
                background: 'transparent',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                fontSize: '1rem'
              }}>
                <Link to="/register" style={{ textDecoration: 'none', color: 'inherit' }}>
                  Sign up
                </Link>
              </button>
              <button style={{
                padding: '1rem 2rem',
                borderRadius: '50px',
                fontWeight: 600,
                background: 'white',
                color: '#667eea',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                fontSize: '1rem'
              }}>
                <Link to="/login" style={{ textDecoration: 'none', color: 'inherit' }}>
                  Log In
                </Link>
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Title */}
      <motion.h1
        className="text-5xl font-extrabold mb-12 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500"
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 1 }}
        id="legal&policies"
      >
        Legal & Policies
      </motion.h1>

      {/* Container */}
      <div className="grid gap-12 w-full max-w-8xl">
        {/* Privacy Policy */}
        <motion.div
          className="p-8 rounded-2xl shadow-2xl bg-gradient-to-r from-blue-500/20 to-cyan-400/10 backdrop-blur-lg border border-blue-400/20"
          initial={{ rotateY: -90, opacity: 0 }}
          whileInView={{ rotateY: 0, opacity: 1 }}
          transition={{ duration: 1 }}
          viewport={{ once: true }}
        >
          <h2 className="text-3xl font-semibold mb-4 text-cyan-300">
            Privacy Policy
          </h2>
          <p className="text-gray-300 leading-relaxed">
            We take your privacy seriously. Authentication is performed using
            secure <span className="text-cyan-400">JWT tokens</span>. Once a
            user logs in successfully, a token is generated and stored securely.
            This token is required to access protected routes like{" "}
            <span className="font-semibold">Dashboard</span>, Calendar, Chat,
            and File Manager.
          </p>
          <ul className="list-disc list-inside mt-4 text-gray-400">
            <li>Login requires valid credentials</li>
            <li>Dashboard access only with active tokens</li>
            <li>Tokens expire automatically after session timeout</li>
          </ul>
        </motion.div>

        {/* Terms of Service */}
        <motion.div
          className="p-8 rounded-2xl shadow-2xl bg-gradient-to-r from-purple-500/20 to-pink-400/10 backdrop-blur-lg border border-purple-400/20"
          initial={{ rotateX: -90, opacity: 0 }}
          whileInView={{ rotateX: 0, opacity: 1 }}
          transition={{ duration: 1 }}
          viewport={{ once: true }}
          id="terms-of-service"
        >
          <h2 className="text-3xl font-semibold mb-4 text-pink-300">
            Terms of Service
          </h2>
          <div className="space-y-4 text-gray-300">
            <section>
              <h3 className="font-semibold text-lg text-pink-400">
                1. Acceptance of Terms
              </h3>
              <p>
                By using this platform, you agree to our services including
                collaboration tools, messaging, and video conferencing.
              </p>
            </section>
            <section>
              <h3 className="font-semibold text-lg text-pink-400">
                2. User Responsibilities
              </h3>
              <p>
                You are responsible for maintaining the confidentiality of your
                account and ensuring lawful use of the platform.
              </p>
            </section>
            <section>
              <h3 className="font-semibold text-lg text-pink-400">
                3. Limitations of Liability
              </h3>
              <p>
                We are not liable for any misuse, downtime, or third-party
                damages arising from usage of the platform.
              </p>
            </section>
          </div>
        </motion.div>

       {/* Footer */}
      <footer
        id="footer"
        className="observe-section"
        style={{
          padding: '4rem 2rem 2rem',
          background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
          color: 'white',
          transform: isVisible.footer ? 'translateY(0)' : 'translateY(50px)',
          opacity: isVisible.footer ? 1 : 0,
          transition: 'all 0.8s cubic-bezier(0.23, 1, 0.32, 1)'
        }}
      >
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '3rem',
          maxWidth: '1200px',
          margin: '0 auto 3rem'
        }}>
          <div>
            <div style={{
              fontSize: '1.8rem',
              fontWeight: 800,
              background: 'linear-gradient(45deg, #667eea, #764ba2)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              marginBottom: '1.5rem'
            }}>
              Milapp
            </div>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              {[
                { icon: <FaFacebookF/>, label: 'Facebook', url: 'https://www.facebook.com/' },
                { icon: <FaSquareXTwitter/>, label: 'Twitter', url: 'https://x.com/Sp_rajjput' },
                { icon: <FaInstagramSquare/>, label: 'Instagram', url: 'https://www.instagram.com/sp_singh.1' },
                { icon: <CiLinkedin/>, label: 'LinkedIn', url: 'https://www.linkedin.com/in/' },
                { icon: <FaGithub/>, label: 'GitHub', url: 'https://github.com/SPSingh-1' }
              ].map((social, index) => (
                <Link
                  key={index}
                  to={social.url} // Use the specific URL here
                  style={{
                    width: '40px',
                    height: '40px',
                    background: 'rgba(255, 255, 255, 0.1)',
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.3s ease',
                    textDecoration: 'none',
                    fontSize: '1.2rem'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  {social.icon}
                </Link>
              ))}
            </div>
          </div>
          
          <div>
            <h4 style={{
              fontSize: '1.2rem',
              fontWeight: 700,
              marginBottom: '1.5rem',
              color: 'white'
            }}>
              Product
            </h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {['Home', 'Features', 'Join'].map((item, index) => (
                <li key={index} style={{ marginBottom: '0.75rem' }}>
                  <Link
                    to="/"
                    style={{
                      color: 'rgba(255, 255, 255, 0.7)',
                      textDecoration: 'none',
                      transition: 'color 0.3s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = 'white';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)';
                    }}
                  >
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          
          <div>
            <h4 style={{
              fontSize: '1.2rem',
              fontWeight: 700,
              marginBottom: '1.5rem',
              color: 'white'
            }}>
              Company
            </h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {['About Us', 'Careers', 'Blog'].map((item, index) => (
                <li key={index} style={{ marginBottom: '0.75rem' }}>
                  <Link
                    to="/company"
                    style={{
                      color: 'rgba(255, 255, 255, 0.7)',
                      textDecoration: 'none',
                      transition: 'color 0.3s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = 'white';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)';
                    }}
                  >
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          
          <div>
            <h4 style={{
              fontSize: '1.2rem',
              fontWeight: 700,
              marginBottom: '1.5rem',
              color: 'white'
            }}>
              Legal
            </h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {['Privacy Policy', 'Terms of Service'].map((item, index) => (
                <li key={index} style={{ marginBottom: '0.75rem' }}>
                  <Link
                    to="/legal"
                    style={{
                      color: 'rgba(255, 255, 255, 0.7)',
                      textDecoration: 'none',
                      transition: 'color 0.3s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = 'white';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)';
                    }}
                  >
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
        
        <div style={{
          textAlign: 'center',
          paddingTop: '2rem',
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          color: 'rgba(255, 255, 255, 0.7)'
        }}>
          <p style={{ margin: 0 }}>
            &copy; 2024 ConnectWise. All rights reserved.
          </p>
        </div>
      </footer>
      </div>
    </div>
  );
};

export default Legal;
