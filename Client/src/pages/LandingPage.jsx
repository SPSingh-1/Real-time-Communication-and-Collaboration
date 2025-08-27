import React, { useEffect } from "react";
import "./LandingPage.css";
import { Link } from "react-router-dom";

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
  {
    title: "Calendar & Events",
    description: "Sync your calendars, schedule meetings, and set reminders to stay organized and on track.",
    icon: "📅",
  },
];

const LandingPage = () => {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 }
    );

    document.querySelectorAll("section").forEach((section) => {
      observer.observe(section);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <div className="landing-page">
      {/* Header */}
      <header className="header">
        <div className="logo">ConnectWise</div>
        <nav>
          <a href="#">Product</a>
          <a href="#">Pricing</a>
          <a href="#">Contact</a>
        </nav>
        <div className="flex gap-2">
            <button className="login-btn"><Link to="/register">Sign up</Link></button>
            <button className="login-btn"><Link to="/login">Log In</Link></button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="hero">
        <h1 className="animate-in">Real-time Collaboration Made Simple</h1>
        <p className="animate-in delay-1">
          Connect, communicate, and collaborate with your team in one powerful platform
        </p>
        <button className="get-started animate-in delay-2">Get Started Free</button>
        <div className="mockup-container">
          <div className="mockup-card-3d">
            <div className="mockup-inner-content">
              <h2>Real-time Collaboration</h2>
              <p>Communicate and collaborate with your team in real-time.</p>
              <img src="/mockup-content.png" alt="Dashboard Mockup" className="mockup-image" />
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <h2 className="animate-in">Powerful Features</h2>
        <div className="features-grid">
          {features.map((feature, index) => (
            <div className="feature-card animate-in" key={index} style={{ transitionDelay: `${index * 0.1}s` }}>
              <div className="feature-icon">{feature.icon}</div>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Dashboard Showcase Section */}
      <section className="dashboard-showcase">
        <div className="dashboard-grid">
          <div className="showcase-card">
            <h3>Dashboard</h3>
            <img src="/dashboard.png" alt="Dashboard" />
          </div>
          <div className="showcase-card">
            <h3>Group Chat</h3>
            <img src="/group-chat.png" alt="Group Chat" />
          </div>
          <div className="showcase-card">
            <h3>File Management</h3>
            <img src="/file-management.png" alt="File Management" />
          </div>
          <div className="showcase-card">
            <h3>Task Management</h3>
            <img src="/task-management.png" alt="Task Management" />
          </div>
          <div className="showcase-card">
            <h3>Figma Integration</h3>
            <img src="/figma-integration.png" alt="Figma Integration" />
          </div>
          <div className="showcase-card">
            <h3>Video Conferencing</h3>
            <img src="/video-conferencing.png" alt="Video Conferencing" />
          </div>
        </div>
      </section>

      {/* Join Section */}
      <section className="join-section">
        <div className="join-content">
          <h2 className="animate-in">Join Thousands of Teams</h2>
          <p className="animate-in delay-1">
            Sign up for free and start collaborating with your team today. No credit card required.
          </p>
          <div className="join-stats animate-in delay-2">
            <div>
              <h3>100k+</h3>
              <p>Active Users</p>
            </div>
            <div>
              <h3>50+</h3>
              <p>Integrations</p>
            </div>
            <div>
              <h3>99.9%</h3>
              <p>Uptime</p>
            </div>
          </div>
        </div>
        <Link to="/register" className="signup-button animate-in delay-3">Sign Up Now</Link>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-columns">
          <div className="footer-col">
            <div className="logo">ConnectWise</div>
            <div className="social-media">
              <a href="#">
                <i className="fab fa-facebook-f"></i>
              </a>
              <a href="#">
                <i className="fab fa-twitter"></i>
              </a>
              <a href="#">
                <i className="fab fa-instagram"></i>
              </a>
              <a href="#">
                <i className="fab fa-linkedin-in"></i>
              </a>
            </div>
          </div>
          <div className="footer-col">
            <h4>Product</h4>
            <ul>
              <li>
                <a href="#">Features</a>
              </li>
              <li>
                <a href="#">Pricing</a>
              </li>
              <li>
                <a href="#">Integrations</a>
              </li>
            </ul>
          </div>
          <div className="footer-col">
            <h4>Company</h4>
            <ul>
              <li>
                <a href="#">About Us</a>
              </li>
              <li>
                <a href="#">Careers</a>
              </li>
              <li>
                <a href="#">Blog</a>
              </li>
            </ul>
          </div>
          <div className="footer-col">
            <h4>Legal</h4>
            <ul>
              <li>
                <a href="#">Privacy Policy</a>
              </li>
              <li>
                <a href="#">Terms of Service</a>
              </li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; 2024 ConnectWise. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;