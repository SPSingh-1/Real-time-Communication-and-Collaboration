import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FaFacebookF } from "react-icons/fa";
import { FaSquareXTwitter } from "react-icons/fa6";
import { FaInstagramSquare } from "react-icons/fa";
import { CiLinkedin } from "react-icons/ci";
import { FaGithub } from "react-icons/fa";
import { Menu, X } from "lucide-react";

const LandingPage = () => {
  const [isVisible, setIsVisible] = useState({});
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Features data
  const features = [
    {
      title: "Intuitive Dashboard",
      description: "Get a complete overview of your workspace with customizable widgets, notifications, and quick access to all features.",
      icon: "📊",
    },
    {
      title: "Group Chat",
      description: "Create channels for teams, projects, or topics with rich text formatting, file sharing, and thread replies.",
      icon: "💬",
    },
    {
      title: "File Management",
      description: "Store, organize, and collaborate on files with version history, comments, and powerful search capabilities.",
      icon: "📁",
    },
    {
      title: "Task Management",
      description: "Track projects with customizable boards, lists, and cards. Set deadlines, assign tasks, and monitor progress.",
      icon: "✅",
    },
    {
      title: "Figma Integration",
      description: "Seamlessly integrate with Figma to collaborate on designs directly within your workspace.",
      icon: "🎨",
    },
    {
      title: "Video Conferencing",
      description: "Host HD video meetings with screen sharing, recording, and interactive whiteboard capabilities.",
      icon: "🎥",
    },
  ];

  // Intersection Observer for animations
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

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) {
        setIsMobileMenuOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Dashboard mockup component
  const DashboardMockup = () => (
    <div className="dashboard-mockup">
      <div className="mockup-header">
        <div className="header-item"></div>
        <div className="header-item"></div>
        <div className="header-item"></div>
      </div>
      <div className="mockup-content">
        <div className="sidebar">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="sidebar-item"></div>
          ))}
        </div>
        <div className="main-content">
          <div className="chart-area">
            {[...Array(8)].map((_, i) => (
              <div 
                key={i} 
                className="chart-bar" 
                style={{ height: `${20 + Math.random() * 60}%` }}
              ></div>
            ))}
          </div>
          <div className="content-cards">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="content-card"></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const navItems = [
    { href: "#hero", label: "Home" },
    { href: "#features", label: "Features" },
    { href: "#join", label: "Join" },
    { href: "#footer", label: "Contact" }
  ];

  return (
    <div style={{
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      margin: 0,
      padding: 0,
      overflow: 'hidden',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      minHeight: '100vh'
    }}>
      
      {/* Header */}
      <header style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        background: 'rgba(255, 255, 255, 0.1)',
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
          fontSize: 'clamp(1.2rem, 4vw, 1.8rem)',
          fontWeight: 800,
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          background: 'linear-gradient(45deg, #ffffff, #f0f9ff)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text'
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

      {/* Hero Section */}
      <section 
        id="hero"
        className="observe-section"
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: 'clamp(1rem, 4vw, 2rem)',
          paddingTop: 'clamp(6rem, 15vw, 8rem)',
          position: 'relative',
          background: 'radial-gradient(ellipse at center, rgba(255,255,255,0.1) 0%, transparent 70%)',
          transform: isVisible.hero ? 'translateY(0) scale(1)' : 'translateY(50px) scale(0.95)',
          opacity: isVisible.hero ? 1 : 0,
          transition: 'all 0.8s cubic-bezier(0.23, 1, 0.32, 1)'
        }}
      >
        <div style={{ maxWidth: '800px', zIndex: 2 }}>
          <h1 style={{
            fontSize: 'clamp(2rem, 8vw, 6rem)',
            fontWeight: 800,
            color: 'white',
            marginBottom: '1.5rem',
            background: 'linear-gradient(45deg, #ffffff, #f0f9ff)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            lineHeight: 1.1
          }}>
            Real-time Collaboration Made Simple
          </h1>
          
          <p style={{
            fontSize: 'clamp(1rem, 3vw, 1.4rem)',
            color: 'rgba(255, 255, 255, 0.9)',
            marginBottom: '3rem',
            lineHeight: 1.6,
            maxWidth: '600px',
            margin: '0 auto 3rem'
          }}>
            Connect, communicate, and collaborate with your team in one powerful platform
          </p>
          
          <button style={{
            fontSize: 'clamp(1rem, 2.5vw, 1.2rem)',
            padding: 'clamp(1rem, 3vw, 1.2rem) clamp(2rem, 6vw, 3rem)',
            background: 'linear-gradient(45deg, #667eea, #764ba2)',
            color: 'white',
            border: 'none',
            borderRadius: '50px',
            cursor: 'pointer',
            transition: 'all 0.4s cubic-bezier(0.23, 1, 0.32, 1)',
            boxShadow: '0 10px 30px rgba(102, 126, 234, 0.3)',
            position: 'relative',
            overflow: 'hidden'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-3px) scale(1.05)';
            e.currentTarget.style.boxShadow = '0 15px 40px rgba(102, 126, 234, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0) scale(1)';
            e.currentTarget.style.boxShadow = '0 10px 30px rgba(102, 126, 234, 0.3)';
          }}
          >
            Get Started Free
          </button>
        </div>
        
        {/* 3D Mockup - Responsive */}
        <div style={{
          marginTop: 'clamp(2rem, 8vw, 4rem)',
          perspective: '1500px',
          transformStyle: 'preserve-3d',
          width: '100%',
          display: 'flex',
          justifyContent: 'center'
        }}>
          <div style={{
            width: 'clamp(300px, 90vw, 1000px)',
            height: 'clamp(300px, 60vw, 600px)',
            background: 'linear-gradient(145deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05))',
            borderRadius: 'clamp(10px, 3vw, 20px)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 30px 80px rgba(0,0,0,0.3)',
            transformStyle: 'preserve-3d',
            transition: 'all 0.6s cubic-bezier(0.23, 1, 0.32, 1)',
            position: 'relative',
            overflow: 'hidden',
            transform: 'rotateY(5deg) rotateX(2deg)',
            cursor: 'pointer'
          }}
          onMouseEnter={(e) => {
            if (window.innerWidth > 768) {
              e.currentTarget.style.transform = 'rotateY(10deg) rotateX(5deg) translateZ(50px)';
            }
          }}
          onMouseLeave={(e) => {
            if (window.innerWidth > 768) {
              e.currentTarget.style.transform = 'rotateY(5deg) rotateX(2deg)';
            }
          }}>
            <div style={{ padding: 'clamp(1rem, 3vw, 2rem)', height: '100%' }}>
              <DashboardMockup />
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section
        id="features"
        className="observe-section"
        style={{
          padding: 'clamp(4rem, 8vw, 8rem) clamp(1rem, 4vw, 2rem)',
          background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
          position: 'relative',
          transform: isVisible.features ? 'translateY(0)' : 'translateY(50px)',
          opacity: isVisible.features ? 1 : 0,
          transition: 'all 0.8s cubic-bezier(0.23, 1, 0.32, 1) 0.2s'
        }}
      >
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 'clamp(100px, 20vw, 200px)',
          background: 'linear-gradient(180deg, #764ba2, transparent)'
        }}></div>
        
        <h2 style={{
          fontSize: 'clamp(2rem, 6vw, 3.5rem)',
          fontWeight: 800,
          textAlign: 'center',
          marginBottom: 'clamp(2rem, 6vw, 4rem)',
          background: 'linear-gradient(45deg, #334155, #475569)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          position: 'relative',
          zIndex: 2
        }}>
          Powerful Features
        </h2>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))',
          gap: 'clamp(1rem, 3vw, 2rem)',
          maxWidth: '1400px',
          margin: '0 auto',
          position: 'relative',
          zIndex: 2
        }}>
          {features.map((feature, index) => (
            <div
              key={index}
              style={{
                background: 'rgba(255, 255, 255, 0.9)',
                backdropFilter: 'blur(20px)',
                borderRadius: 'clamp(12px, 3vw, 20px)',
                padding: 'clamp(1.5rem, 4vw, 2.5rem)',
                boxShadow: '0 20px 50px rgba(0,0,0,0.1)',
                border: '1px solid rgba(255,255,255,0.2)',
                transformStyle: 'preserve-3d',
                transition: 'all 0.5s cubic-bezier(0.23, 1, 0.32, 1)',
                position: 'relative',
                overflow: 'hidden',
                cursor: 'pointer',
                transform: isVisible.features ? 'translateY(0)' : 'translateY(30px)',
                opacity: isVisible.features ? 1 : 0,
                transitionDelay: `${index * 0.1}s`
              }}
              onMouseEnter={(e) => {
                if (window.innerWidth > 768) {
                  e.currentTarget.style.transform = 'translateY(-10px) rotateY(5deg) rotateX(5deg)';
                  e.currentTarget.style.boxShadow = '0 30px 70px rgba(0,0,0,0.2)';
                }
              }}
              onMouseLeave={(e) => {
                if (window.innerWidth > 768) {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 20px 50px rgba(0,0,0,0.1)';
                }
              }}
            >
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '4px',
                background: 'linear-gradient(45deg, #667eea, #764ba2)'
              }}></div>
              
              <div style={{
                width: 'clamp(60px, 15vw, 80px)',
                height: 'clamp(60px, 15vw, 80px)',
                marginBottom: '1.5rem',
                background: 'linear-gradient(45deg, #667eea, #764ba2)',
                borderRadius: 'clamp(12px, 3vw, 20px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 10px 30px rgba(102, 126, 234, 0.3)',
                fontSize: 'clamp(1.5rem, 4vw, 2rem)'
              }}>
                {feature.icon}
              </div>
              
              <h3 style={{
                fontSize: 'clamp(1.2rem, 3vw, 1.5rem)',
                fontWeight: 700,
                marginBottom: '1rem',
                color: '#1e293b'
              }}>
                {feature.title}
              </h3>
              
              <p style={{
                color: '#64748b',
                lineHeight: 1.6,
                fontSize: 'clamp(0.9rem, 2.5vw, 1rem)',
                margin: 0
              }}>
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Join Section */}
      <section
        id="join"
        className="observe-section"
        style={{
          padding: 'clamp(4rem, 8vw, 8rem) clamp(1rem, 4vw, 2rem)',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          textAlign: 'center',
          color: 'white',
          position: 'relative',
          overflow: 'hidden',
          transform: isVisible.join ? 'translateY(0)' : 'translateY(50px)',
          opacity: isVisible.join ? 1 : 0,
          transition: 'all 0.8s cubic-bezier(0.23, 1, 0.32, 1)'
        }}
      >
        <div style={{ maxWidth: '800px', margin: '0 auto', position: 'relative', zIndex: 2 }}>
          <h2 style={{
            fontSize: 'clamp(2rem, 6vw, 3.5rem)',
            fontWeight: 800,
            marginBottom: '1.5rem'
          }}>
            Join Thousands of Teams
          </h2>
          
          <p style={{
            fontSize: 'clamp(1rem, 3vw, 1.3rem)',
            marginBottom: '3rem',
            opacity: 0.9,
            maxWidth: '600px',
            margin: '0 auto 3rem'
          }}>
            Sign up for free and start collaborating with your team today. No credit card required.
          </p>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))',
            gap: 'clamp(1rem, 3vw, 2rem)',
            margin: '3rem 0'
          }}>
            {[
              { number: '100k+', label: 'Active Users' },
              { number: '50+', label: 'Integrations' },
              { number: '99.9%', label: 'Uptime' }
            ].map((stat, index) => (
              <div
                key={index}
                style={{
                  textAlign: 'center',
                  padding: 'clamp(1.5rem, 4vw, 2rem)',
                  background: 'rgba(255, 255, 255, 0.1)',
                  backdropFilter: 'blur(20px)',
                  borderRadius: 'clamp(12px, 3vw, 20px)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  transition: 'all 0.3s ease',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-5px)';
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                }}
              >
                <h3 style={{
                  fontSize: 'clamp(1.8rem, 5vw, 2.5rem)',
                  fontWeight: 800,
                  marginBottom: '0.5rem',
                  margin: 0
                }}>
                  {stat.number}
                </h3>
                <p style={{ 
                  opacity: 0.8, 
                  margin: 0,
                  fontSize: 'clamp(0.9rem, 2.5vw, 1rem)'
                }}>
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
          
          <button style={{
            fontSize: 'clamp(1rem, 2.5vw, 1.2rem)',
            padding: 'clamp(1rem, 3vw, 1.2rem) clamp(2rem, 6vw, 3rem)',
            background: 'rgba(255, 255, 255, 0.2)',
            color: 'white',
            border: '2px solid white',
            borderRadius: '50px',
            cursor: 'pointer',
            transition: 'all 0.4s cubic-bezier(0.23, 1, 0.32, 1)',
            backdropFilter: 'blur(20px)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'white';
            e.currentTarget.style.color = '#667eea';
            e.currentTarget.style.transform = 'translateY(-3px) scale(1.05)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
            e.currentTarget.style.color = 'white';
            e.currentTarget.style.transform = 'translateY(0) scale(1)';
          }}
          >
            <Link to="/register" style={{ textDecoration: 'none', color: 'inherit' }}>
              Sign Up Now
            </Link>
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer
        id="footer"
        className="observe-section"
        style={{
          padding: 'clamp(2rem, 6vw, 4rem) clamp(1rem, 4vw, 2rem) clamp(1rem, 3vw, 2rem)',
          background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
          color: 'white',
          transform: isVisible.footer ? 'translateY(0)' : 'translateY(50px)',
          opacity: isVisible.footer ? 1 : 0,
          transition: 'all 0.8s cubic-bezier(0.23, 1, 0.32, 1)'
        }}
      >
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 250px), 1fr))',
          gap: 'clamp(2rem, 5vw, 3rem)',
          maxWidth: '1200px',
          margin: '0 auto 3rem'
        }}>
          <div>
            <div style={{
              fontSize: 'clamp(1.4rem, 4vw, 1.8rem)',
              fontWeight: 800,
              background: 'linear-gradient(45deg, #667eea, #764ba2)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              marginBottom: '1.5rem'
            }}>
              ConnectWise
            </div>
            <div style={{ 
              display: 'flex', 
              gap: '1rem', 
              marginTop: '1rem',
              flexWrap: 'wrap',
              justifyContent: 'flex-start'
            }}>
              {[
                { icon: <FaFacebookF/>, label: 'Facebook', url: 'https://www.facebook.com/' },
                { icon: <FaSquareXTwitter/>, label: 'Twitter', url: 'https://x.com/Sp_rajjput' },
                { icon: <FaInstagramSquare/>, label: 'Instagram', url: 'https://www.instagram.com/sp_singh.1' },
                { icon: <CiLinkedin/>, label: 'LinkedIn', url: 'https://www.linkedin.com/in/' },
                { icon: <FaGithub/>, label: 'GitHub', url: 'https://github.com/SPSingh-1' }
              ].map((social, index) => (
                <Link
                  key={index}
                  to={social.url}
                  style={{
                    width: 'clamp(35px, 8vw, 40px)',
                    height: 'clamp(35px, 8vw, 40px)',
                    background: 'rgba(255, 255, 255, 0.1)',
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.3s ease',
                    textDecoration: 'none',
                    fontSize: 'clamp(1rem, 2.5vw, 1.2rem)',
                    color: 'white'
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
              fontSize: 'clamp(1rem, 2.5vw, 1.2rem)',
              fontWeight: 700,
              marginBottom: '1.5rem',
              color: 'white'
            }}>
              Product
            </h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {['Home', 'Features', 'Join'].map((item, index) => (
                <li key={index} style={{ marginBottom: '0.75rem' }}>
                  <a
                    href="#hero"
                    style={{
                      color: 'rgba(255, 255, 255, 0.7)',
                      textDecoration: 'none',
                      transition: 'color 0.3s ease',
                      fontSize: 'clamp(0.9rem, 2vw, 1rem)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = 'white';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)';
                    }}
                  >
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          
          <div>
            <h4 style={{
              fontSize: 'clamp(1rem, 2.5vw, 1.2rem)',
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
                      transition: 'color 0.3s ease',
                      fontSize: 'clamp(0.9rem, 2vw, 1rem)'
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
              fontSize: 'clamp(1rem, 2.5vw, 1.2rem)',
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
                      transition: 'color 0.3s ease',
                      fontSize: 'clamp(0.9rem, 2vw, 1rem)'
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
          <p style={{ 
            margin: 0,
            fontSize: 'clamp(0.8rem, 2vw, 1rem)'
          }}>
            &copy; 2024 ConnectWise. All rights reserved.
          </p>
        </div>
      </footer>

      {/* CSS for Dashboard Mockup and Responsive Design */}
      <style>{`
        /* Mobile Menu Styles */
        @media (max-width: 768px) {
          .desktop-nav,
          .desktop-auth {
            display: none !important;
          }
          
          .mobile-menu-btn {
            display: block !important;
          }
        }

        @media (min-width: 769px) {
          .mobile-menu-btn {
            display: none !important;
          }
        }

        /* Animation for mobile menu */
        @keyframes slideDown {
          0% {
            opacity: 0;
            transform: translateY(-20px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* Dashboard Mockup Styles */
        .dashboard-mockup {
          width: 100%;
          height: 100%;
          background: linear-gradient(145deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05));
          border-radius: 15px;
          padding: clamp(1rem, 3vw, 1.5rem);
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .mockup-header {
          display: flex;
          gap: 1rem;
          margin-bottom: 1rem;
        }

        .header-item {
          height: clamp(25px, 6vw, 40px);
          background: rgba(255,255,255,0.2);
          border-radius: 8px;
          flex: 1;
          position: relative;
          overflow: hidden;
        }

        .header-item::after {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
          animation: shimmer 2s infinite;
        }

        @keyframes shimmer {
          0% { left: -100%; }
          100% { left: 100%; }
        }

        .mockup-content {
          display: flex;
          gap: 1.5rem;
          flex: 1;
        }

        .sidebar {
          width: clamp(120px, 25%, 200px);
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .sidebar-item {
          height: clamp(30px, 8vw, 50px);
          background: rgba(255,255,255,0.15);
          border-radius: 8px;
          position: relative;
          overflow: hidden;
        }

        .sidebar-item:nth-child(1) { background: rgba(102, 126, 234, 0.3); }
        .sidebar-item:nth-child(2) { background: rgba(16, 185, 129, 0.3); }
        .sidebar-item:nth-child(3) { background: rgba(245, 158, 11, 0.3); }

        .main-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .chart-area {
          height: clamp(120px, 30vw, 200px);
          background: rgba(255,255,255,0.1);
          border-radius: 12px;
          padding: 1rem;
          display: flex;
          align-items: flex-end;
          gap: 0.5rem;
        }

        .chart-bar {
          flex: 1;
          background: linear-gradient(45deg, #667eea, #764ba2);
          border-radius: 4px 4px 0 0;
          min-height: 20%;
          animation: growBar 2s ease-out;
          box-shadow: 0 0 10px rgba(102, 126, 234, 0.3);
        }

        @keyframes growBar {
          0% { height: 0; }
          100% { height: var(--final-height, 50%); }
        }

        .content-cards {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1rem;
          flex: 1;
        }

        .content-card {
          background: rgba(255,255,255,0.1);
          border-radius: 10px;
          position: relative;
          overflow: hidden;
          min-height: clamp(40px, 10vw, 60px);
        }

        .content-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 4px;
          background: linear-gradient(45deg, #667eea, #764ba2);
        }

        /* Responsive Dashboard Adjustments */
        @media (max-width: 768px) {
          .mockup-content {
            flex-direction: column;
          }
          
          .sidebar {
            width: 100%;
            flex-direction: row;
            overflow-x: auto;
            gap: 0.5rem;
          }
          
          .sidebar-item {
            min-width: 60px;
            height: 40px;
          }
          
          .content-cards {
            grid-template-columns: 1fr;
          }

          .chart-area {
            height: 150px;
          }
        }

        @media (max-width: 480px) {
          .chart-area {
            height: 120px;
            padding: 0.5rem;
          }
          
          .dashboard-mockup {
            padding: 0.75rem;
          }
          
          .content-card {
            min-height: 50px;
          }
        }

        /* Additional responsive utilities */
        .observe-section {
          scroll-margin-top: 80px;
        }

        /* Smooth scrolling for anchor links */
        html {
          scroll-behavior: smooth;
        }

        /* Prevent horizontal overflow */
        * {
          box-sizing: border-box;
        }

        body {
          overflow-x: hidden;
        }

        /* Fix for mobile menu overlay */
        @media (max-width: 768px) {
          .mobile-menu {
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
          }
        }

        /* Improve touch targets for mobile */
        @media (max-width: 768px) {
          button, a {
            min-height: 44px;
            min-width: 44px;
          }
        }
      `}</style>
    </div>
  );
};

export default LandingPage;