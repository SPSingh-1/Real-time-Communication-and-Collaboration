import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FaFacebookF } from "react-icons/fa";
import { FaSquareXTwitter } from "react-icons/fa6";
import { FaInstagramSquare } from "react-icons/fa";
import { CiLinkedin } from "react-icons/ci";
import { FaGithub } from "react-icons/fa";
// eslint-disable-next-line no-unused-vars
import { motion } from "framer-motion";

const About = () => {
    const [isVisible, setIsVisible] = useState({});

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
  return (
    <div className="bg-gradient-to-br from-indigo-50 via-white to-blue-100">
          {/* Header */}
      <header style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        background: 'rgba(0, 0, 0, 0.1)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(0, 0, 0, 0.1)',
        padding: '1rem 2rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        transition: 'all 0.3s ease'
      }}>
        <div style={{
          fontSize: '1.8rem',
          fontWeight: 800,
          background: 'linear-gradient(45deg, #ffffff, #f0f9ff)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text'
        }}>
          ConnectWise
        </div>
        
        <nav style={{ display: 'flex', gap: '2rem' }}>
          <a href="#About" style={{
            color: 'white',
            textDecoration: 'none',
            fontWeight: 500,
            padding: '0.5rem 1rem',
            borderRadius: '8px',
            transition: 'all 0.3s ease'
          }}>About</a>
          <a href="#Careers" style={{
            color: 'white',
            textDecoration: 'none',
            fontWeight: 500,
            padding: '0.5rem 1rem',
            borderRadius: '8px',
            transition: 'all 0.3s ease'
          }}>Careers</a>
          <a href="#Blog" style={{
            color: 'white',
            textDecoration: 'none',
            fontWeight: 500,
            padding: '0.5rem 1rem',
            borderRadius: '8px',
            transition: 'all 0.3s ease'
          }}>Blog</a>
          <a href="#Contact" style={{
            color: 'white',
            textDecoration: 'none',
            fontWeight: 500,
            padding: '0.5rem 1rem',
            borderRadius: '8px',
            transition: 'all 0.3s ease'
          }}>Contact</a>
        </nav>
        
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button style={{
            padding: '0.75rem 1.5rem',
            borderRadius: '50px',
            fontWeight: 600,
            border: '2px solid white',
            color: 'white',
            background: 'transparent',
            cursor: 'pointer',
            transition: 'all 0.3s ease'
          }}><Link to="/register">Sign up</Link></button>
          <button style={{
            padding: '0.75rem 1.5rem',
            borderRadius: '50px',
            fontWeight: 600,
            background: 'linear-gradient(45deg, #667eea, #764ba2)',
            color: 'white',
            border: 'none',
            cursor: 'pointer',
            transition: 'all 0.3s ease'
          }}><Link to="/login">Log In</Link></button>
        </div>
      </header>
      {/* Hero / About Section */}
      <section ID="About" className="min-h-screen flex flex-col items-center justify-center text-center px-6 py-20">
        <motion.h1
          className="text-5xl md:text-6xl font-bold text-gray-800 mb-6"
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          About Our Project
        </motion.h1>
        <p className="max-w-3xl text-lg md:text-xl text-gray-600 mb-12">
          Our platform provides everything your team needs: Dashboard, Chat,
          Task Manager, File Manager, Calendar, and Video Conferencing – all in
          one place.
        </p>
        <motion.div
          className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={{
            hidden: { opacity: 0, y: 50 },
            visible: {
              opacity: 1,
              y: 0,
              transition: { staggerChildren: 0.2 },
            },
          }}
        >
          {[
            "Dashboard",
            "Chat Page",
            "Task Manager",
            "File Manager",
            "Calendar",
            "Video Conferencing",
          ].map((feature, i) => (
            <motion.div
              key={i}
              className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all"
              whileHover={{ scale: 1.05 }}
            >
              <h3 className="text-2xl font-semibold text-indigo-600 mb-4">
                {feature}
              </h3>
              <p className="text-gray-600">
                A seamless {feature.toLowerCase()} experience designed for
                collaboration and productivity.
              </p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Careers Section */}
      <section Id="Careers" className="min-h-screen bg-white py-20 px-6">
        <motion.h2
          className="text-4xl md:text-5xl font-bold text-center text-gray-800 mb-12"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          Careers & Opportunities
        </motion.h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {[
            {
              title: "Free & User Friendly",
              desc: "Our platform is easy to use and accessible for all.",
            },
            {
              title: "Team Collaboration",
              desc: "Work together with real-time updates and integrations.",
            },
            {
              title: "File Sharing",
              desc: "Upload, share, and manage files securely in one place.",
            },
            {
              title: "Video Conferencing",
              desc: "Communicate instantly with high-quality video calls.",
            },
            {
              title: "Guidance & Growth",
              desc: "Grow with us and get continuous career mentorship.",
            },
            {
              title: "Innovation",
              desc: "Be part of a team that builds next-gen solutions.",
            },
          ].map((career, i) => (
            <motion.div
              key={i}
              className="bg-gradient-to-br from-indigo-100 to-blue-50 rounded-2xl p-8 shadow-lg hover:shadow-2xl"
              whileHover={{ scale: 1.05 }}
            >
              <h3 className="text-2xl font-semibold text-indigo-700 mb-4">
                {career.title}
              </h3>
              <p className="text-gray-600">{career.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Blog Section */}
      <section Id="Blog" className="min-h-screen py-20 px-6">
        <motion.h2
          className="text-4xl md:text-5xl font-bold text-center text-gray-800 mb-12"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          Blogs & Insights
        </motion.h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {[
            {
              title: "Dashboard Overview",
              desc: "How our dashboard centralizes everything for your team.",
            },
            {
              title: "Seamless Chat",
              desc: "Real-time messaging with emoji reactions and file sharing.",
            },
            {
              title: "Managing Tasks",
              desc: "Stay organized with deadlines and progress tracking.",
            },
            {
              title: "File Management",
              desc: "A better way to upload, share, and manage files.",
            },
            {
              title: "Calendar & Events",
              desc: "Schedule and manage events with integrated notes.",
            },
            {
              title: "Future of Remote Work",
              desc: "How video conferencing powers collaboration anywhere.",
            },
          ].map((blog, i) => (
            <motion.div
              key={i}
              className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl"
              whileHover={{ scale: 1.05 }}
            >
              <h3 className="text-xl font-semibold text-indigo-600 mb-3">
                {blog.title}
              </h3>
              <p className="text-gray-600">{blog.desc}</p>
              <button className="mt-4 text-indigo-500 font-medium hover:underline">
                Read More →
              </button>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Contact Section */}
      <section Id="Contact" className="min-h-screen bg-gradient-to-r from-indigo-600 to-blue-500 flex flex-col items-center justify-center py-20 px-6 text-white relative overflow-hidden">
        <motion.h2
          className="text-5xl font-bold mb-6"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          Contact Us
        </motion.h2>
        <p className="text-lg mb-12 max-w-xl text-center">
          Have questions or want to collaborate? Reach out to our team and let’s
          build the future together.
        </p>
        <motion.form
          className="bg-white text-gray-800 rounded-2xl shadow-lg p-8 max-w-lg w-full"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <input
            type="text"
            placeholder="Your Name"
            className="w-full p-4 mb-4 border rounded-xl focus:ring-2 focus:ring-indigo-400"
          />
          <input
            type="email"
            placeholder="Your Email"
            className="w-full p-4 mb-4 border rounded-xl focus:ring-2 focus:ring-indigo-400"
          />
          <textarea
            placeholder="Your Message"
            rows="5"
            className="w-full p-4 mb-4 border rounded-xl focus:ring-2 focus:ring-indigo-400"
          ></textarea>
          <button className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold transition-all">
            Send Message
          </button>
        </motion.form>
      </section>

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
              ConnectWise
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
                  <a
                    href="#hero"
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
                  </a>
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
  );
};

export default About;
