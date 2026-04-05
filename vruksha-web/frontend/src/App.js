import React, { useState, useEffect } from 'react';
import Chat from './Chat';
import CustomGraph from './CustomGraphEnhanced'; // adjust if your graph component is named differently
import './App.css';
import aboutImage from './assets/plant.png';          // about section image
import heroImage from './assets/hero.png';     // hero background image

const API_BASE = process.env.REACT_APP_API_URL || '';

function App() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      {/* Navbar */}
      <nav className={`navbar ${scrolled ? 'scrolled' : ''}`}>
        <a href="/" className="logo">Vrikshayurveda</a>
        <div className="nav-links">
          <a href="#home" className="nav-link active">Home</a>
          <a href="#about" className="nav-link">About</a>
          <a href="#graph" className="nav-link">Graph</a>
          <a href="#assistant" className="nav-link">Assistant</a>
        </div>
      </nav>

      {/* Hero Section with  hero.png as background */}
      <section 
        id="home" 
        className="hero" 
        style={{ 
          backgroundImage: `url(${heroImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >
        <div className="hero-content">
          <div className="glass-panel fade-up">
            <h1 className="hero-title">VRIKSHAYURVEDA</h1>
            <p className="hero-subtitle" style={{ fontSize: '1.1rem' }}>
              (Ancient Indian Plant Science)
            </p>
            <p className="hero-subtitle" style={{ marginTop: '1rem', fontSize: '1rem' }}>
              Ontology Based Framework for Knowledge Representation, Semantic Reasoning, and Intelligent Information Access in Vrikshayurveda
            </p>
            <a href="#graph" className="btn-primary">Explore Ontology</a>
          </div>
        </div>
      </section>

      {/* About Section with resized image */}
      <section id="about" style={{ padding: '4rem 2rem', maxWidth: '1200px', margin: '0 auto' }}>
        <h2 className="section-title">About the Project</h2>
        <div className="about-grid">
          <div className="about-image">
            <img 
              src={aboutImage} 
              alt="Ancient plant illustration" 
              style={{ 
                width: '100%', 
                maxHeight: '300px',    // limits the height
                objectFit: 'cover',     // ensures image covers the area without distortion
                borderRadius: '20px' 
              }} 
            />
          </div>
          <div className="about-text">
            <p>
              Vrikshayurveda is an ancient Indian science of plant life, documented in the 55th chapter of Varāhamihira's Bṛhat Saṃhitā. This digital knowledge system transforms that wisdom into a structured ontology, connecting plants, soils, seasons, diseases, and treatments.
            </p>
            <p>
              With an interactive graph and AI-powered assistant, you can explore relationships and discover traditional knowledge in a modern, accessible way.
            </p>
          </div>
        </div>
      </section>

      {/* Graph Section */}
      <section id="graph" style={{ padding: '4rem 2rem', maxWidth: '1200px', margin: '0 auto' }}>
        <h2 className="section-title">Ontology Graph</h2>
        <p style={{ marginBottom: '2rem', color: '#3a4b4c' }}>
          Explore the connections between plants, soils, diseases, and treatments. Zoom, pan, and click nodes to expand.
        </p>
        <div className="graph-wrapper">
          <CustomGraph endpoint={`${API_BASE}/api/sparql`} />
        </div>
      </section>

      {/* AI Assistant Section */}
      <section id="assistant" style={{ padding: '4rem 2rem', maxWidth: '800px', margin: '0 auto' }}>
        <h2 className="section-title">AI Assistant</h2>
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <Chat />
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-content">
          <div>
            <h4 style={{ color: '#48BB78', marginBottom: '1rem' }}>Vrikshayurveda</h4>
            <p style={{ color: '#a3b8b8' }}>An intelligent ontology-based botanical knowledge system.</p>
          </div>
          <div className="footer-links">
            <h4 style={{ color: '#48BB78', marginBottom: '1rem' }}>Quick Links</h4>
            <a href="#home">Home</a>
            <a href="#about">About</a>
            <a href="#graph">Graph</a>
            <a href="#assistant">Assistant</a>
          </div>
        </div>
        <div className="footer-bottom">
          © 2026 Vrikshayurveda Knowledge Explorer. All rights reserved.
        </div>
      </footer>
    </>
  );
}

export default App;