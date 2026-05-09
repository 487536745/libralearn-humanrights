import React, { Suspense, useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Canvas } from '@react-three/fiber';
import { Environment } from '@react-three/drei';
import HeroAvatar from './HeroAvatar';

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  
  @keyframes fadeOut {
    from { opacity: 1; }
    to { opacity: 0; }
  }
  
  @keyframes slideIn {
    from { width: 0; }
    to { width: 100%; }
  }
  
  @keyframes slideOut {
    from { width: 100%; }
    to { width: 0; }
  }
  
  @keyframes fadeInUp {
    from { 
      opacity: 0;
      transform: translateY(30px);
    }
    to { 
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  @keyframes fadeOutUp {
    from { 
      opacity: 1;
      transform: translateY(0);
    }
    to { 
      opacity: 0;
      transform: translateY(-20px);
    }
  }
  
  @keyframes float {
    0%, 100% { transform: translateY(0px) rotateY(0deg); }
    25% { transform: translateY(-10px) rotateY(5deg); }
    50% { transform: translateY(0px) rotateY(0deg); }
    75% { transform: translateY(-10px) rotateY(-5deg); }
  }
  
  @keyframes pulse {
    0%, 100% { opacity: 0.3; }
    50% { opacity: 0.5; }
  }
  
  @keyframes particleFloat {
    0% { 
      transform: translate(0px, 0px) scale(0);
      opacity: 0;
    }
    25% { 
      transform: translate(calc(var(--x) * 1.2), calc(var(--y) * 1.2)) scale(1);
      opacity: 0.6;
    }
    50% { 
      transform: translate(calc(var(--x) * 1.5), calc(var(--y) * 1.5)) scale(1);
      opacity: 0.6;
    }
    75% { 
      transform: translate(calc(var(--x) * 1.2), calc(var(--y) * 1.2)) scale(0.5);
      opacity: 0.3;
    }
    100% { 
      transform: translate(0px, 0px) scale(0);
      opacity: 0;
    }
  }
  
  @keyframes geometricFloat {
    0%, 100% { 
      transform: translate(0px, 0px) rotate(0deg) scale(1);
      opacity: 0.3;
    }
    25% { 
      transform: translate(30px, -20px) rotate(90deg) scale(1.1);
      opacity: 0.5;
    }
    50% { 
      transform: translate(-20px, 30px) rotate(180deg) scale(0.9);
      opacity: 0.7;
    }
    75% { 
      transform: translate(20px, 20px) rotate(270deg) scale(1.05);
      opacity: 0.5;
    }
  }
  
  @keyframes gradientShift {
    0%, 100% { 
      background-position: 0% 50%;
      background-size: 200% 200%;
    }
    50% { 
      background-position: 100% 50%;
      background-size: 200% 200%;
    }
  }
  
  .animate-fadeIn {
    animation: fadeIn 0.8s ease-out;
  }
  
  .animate-fadeOut {
    animation: fadeOut 0.8s ease-in;
  }
  
  .animate-slideIn {
    animation: slideIn 2s ease-out;
  }
  
  .animate-slideOut {
    animation: slideOut 2s ease-in;
  }
  
  .animate-fadeInUp {
    animation: fadeInUp 0.8s ease-out;
  }
  
  .animate-fadeOutUp {
    animation: fadeOutUp 0.5s ease-in;
  }
  
  .animate-float {
    animation: float 6s ease-in-out infinite;
  }
  
  .animate-pulse {
    animation: pulse 4s ease-in-out infinite;
  }
  
  .animate-gradientShift {
    animation: gradientShift 8s ease-in-out infinite;
  }
  
  .animate-particle {
    animation: particleFloat var(--duration) linear infinite;
    --duration: 15s;
    width: var(--size);
    height: var(--size);
    background-color: var(--color);
    box-shadow: 0 0 var(--shadow-size) var(--color)40;
    border-radius: 50%;
    position: absolute;
    left: calc(50% + var(--x));
    top: calc(50% + var(--y));
  }
  
  .animate-geometric {
    animation: geometricFloat 20s ease-in-out infinite;
    position: absolute;
    border-radius: 50%;
    opacity: 0.6;
  }
  
  .animate-stagger-1 { animation-delay: 0.1s; }
  .animate-stagger-2 { animation-delay: 0.2s; }
  .animate-stagger-3 { animation-delay: 0.3s; }
  .animate-stagger-4 { animation-delay: 0.4s; }
`;
if (!document.head.querySelector('style[data-landing-animations]')) {
  style.setAttribute('data-landing-animations', 'true');
  document.head.appendChild(style);
}

const LandingPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [avatarKey, setAvatarKey] = useState(0);
  const [showWelcome, setShowWelcome] = useState(true);
  const [mouseTrail, setMouseTrail] = useState([]);
  const canvasRef = React.useRef(null);
  const animationRef = React.useRef(null);
  const lastMousePos = React.useRef({ x: 0, y: 0 });

  // Reset avatar when navigating back to landing page
  useEffect(() => {
    setAvatarKey(prev => prev + 1);
  }, [location.pathname]);

  // Hide welcome overlay after 5 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowWelcome(false);
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  // Mouse trail effect
  useEffect(() => {
    if (showWelcome) return; // Don't show trail during welcome screen
    
    // Disable trail on mobile devices for performance
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (isMobile) return;

    const handleMouseMove = (e) => {
      const currentX = e.clientX;
      const currentY = e.clientY;
      
      // Only add trail if mouse moved significantly
      const dx = currentX - lastMousePos.current.x;
      const dy = currentY - lastMousePos.current.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance > 5) {
        const colors = ['#3b82f6', '#8b5cf6', '#06b6d4', '#ec4899'];
        const randomColor = colors[Math.floor(Math.random() * colors.length)];
        
        // Dynamic particle size based on movement speed
        const speed = Math.min(distance / 10, 5);
        const baseSize = 2;
        const sizeVariation = speed * 1.5;
        
        const newParticle = {
          x: currentX,
          y: currentY,
          color: randomColor,
          size: baseSize + sizeVariation,
          opacity: 1,
          life: 1,
          vx: (Math.random() - 0.5) * 2,
          vy: (Math.random() - 0.5) * 2,
          speed: speed
        };
        
        setMouseTrail(prev => [...prev.slice(-30), newParticle]);
        lastMousePos.current = { x: currentX, y: currentY };
      }
    };

    const handleTouchMove = (e) => {
      if (e.touches.length > 0) {
        const touch = e.touches[0];
        handleMouseMove({ clientX: touch.clientX, clientY: touch.clientY });
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('touchmove', handleTouchMove);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchmove', handleTouchMove);
    };
  }, [showWelcome]);

  // Animate trail particles
  useEffect(() => {
    if (showWelcome || mouseTrail.length === 0) return;

    const animate = () => {
      setMouseTrail(prev => 
        prev.map(particle => ({
          ...particle,
          x: particle.x + particle.vx,
          y: particle.y + particle.vy,
          opacity: particle.opacity * 0.95,
          life: particle.life - 0.02,
          vx: particle.vx * 0.98,
          vy: particle.vy * 0.98
        })).filter(particle => particle.life > 0 && particle.opacity > 0.01)
      );
    };

    animationRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [showWelcome, mouseTrail.length]);

  // Canvas rendering for mouse trail
  useEffect(() => {
    if (showWelcome || !canvasRef.current || mouseTrail.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Set canvas size
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw particles and connections with enhanced effects
    mouseTrail.forEach((particle, index) => {
      ctx.save();
      
      // Rainbow color transition effect
      const hue = (Date.now() / 50 + index * 30) % 360;
      const rainbowColor = `hsl(${hue}, 100%, 50%)`;
      
      // Create stronger gradient for better visibility
      const gradient = ctx.createRadialGradient(
        particle.x, particle.y, 0,
        particle.x, particle.y, particle.size
      );
      gradient.addColorStop(0, particle.color + 'ff');
      gradient.addColorStop(0.2, particle.color + 'dd');
      gradient.addColorStop(0.4, rainbowColor);
      gradient.addColorStop(0.7, particle.color + '88');
      gradient.addColorStop(1, particle.color + '00');
      
      // Draw main glowing particle
      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      ctx.fill();
      
      // Add stronger glow effect with rainbow tint
      ctx.shadowBlur = 25;
      ctx.shadowColor = particle.color;
      ctx.globalAlpha = particle.opacity * 0.9;
      ctx.fillStyle = particle.color;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size * 1.3, 0, Math.PI * 2);
      ctx.fill();
      
      // Add inner bright core with rainbow glow
      ctx.shadowBlur = 0;
      ctx.globalAlpha = particle.opacity;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size * 0.4, 0, Math.PI * 2);
      ctx.fill();
      
      // Draw enhanced connection lines to nearby particles
      for (let j = index + 1; j < mouseTrail.length; j++) {
        const otherParticle = mouseTrail[j];
        const distance = Math.sqrt(
          Math.pow(particle.x - otherParticle.x, 2) + 
          Math.pow(particle.y - otherParticle.y, 2)
        );
        
        if (distance < 120 && distance > 0) {
          const connectionOpacity = (1 - distance / 120) * particle.opacity * otherParticle.opacity * 0.4;
          const lineGradient = ctx.createLinearGradient(
            particle.x, particle.y,
            otherParticle.x, otherParticle.y
          );
          lineGradient.addColorStop(0, particle.color + '80');
          lineGradient.addColorStop(0.5, rainbowColor);
          lineGradient.addColorStop(1, otherParticle.color + '80');
          
          ctx.strokeStyle = lineGradient;
          ctx.lineWidth = Math.max(1, 3 - distance / 40);
          ctx.globalAlpha = connectionOpacity;
          ctx.beginPath();
          ctx.moveTo(particle.x, particle.y);
          ctx.lineTo(otherParticle.x, otherParticle.y);
          ctx.stroke();
          
          // Add small glow dots along the line
          const midX = (particle.x + otherParticle.x) / 2;
          const midY = (particle.y + otherParticle.y) / 2;
          ctx.fillStyle = rainbowColor;
          ctx.globalAlpha = connectionOpacity * 0.6;
          ctx.beginPath();
          ctx.arc(midX, midY, 1, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      
      ctx.restore();
    });
  }, [mouseTrail, showWelcome]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current) {
        canvasRef.current.width = window.innerWidth;
        canvasRef.current.height = window.innerHeight;
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Floating particles for background
  const particles = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    x: Math.random() * 100 - 50,
    y: Math.random() * 100 - 50,
    size: Math.random() * 4 + 2,
    duration: Math.random() * 20 + 10,
    delay: Math.random() * 5,
    color: ['#3b82f6', '#8b5cf6', '#06b6d4', '#10b981'][Math.floor(Math.random() * 4)]
  }));

  const handleGetStarted = () => {
    navigate('/avatar');
  };

  const handleLogin = () => {
    navigate('/login');
  };

  const handleSignup = () => {
    navigate('/signup');
  };

  return (
    <div className="min-h-screen bg-white relative overflow-hidden">
      {/* Enhanced Background Layers */}
      <div className="fixed inset-0 pointer-events-none">
        {/* Animated Gradient Background */}
        <div className="absolute inset-0 animate-gradientShift bg-gradient-to-br from-blue-100/20 via-purple-100/30 to-cyan-100/20" />
        <div className="absolute inset-0 bg-gradient-to-tr from-indigo-100/10 via-pink-100/20 to-yellow-100/10 animate-gradientShift" style={{ animationDelay: '2s' }} />
        <div className="absolute inset-0 bg-gradient-to-bl from-cyan-100/10 via-green-100/20 to-blue-100/10 animate-gradientShift" style={{ animationDelay: '4s' }} />
        
        {/* Animated Geometric Shapes */}
        <div className="absolute top-20 left-10 w-32 h-32 bg-gradient-to-r from-blue-400/20 to-purple-400/20 rounded-full animate-geometric blur-xl" style={{ animationDelay: '0s' }} />
        <div className="absolute top-40 right-20 w-24 h-24 bg-gradient-to-r from-purple-400/20 to-pink-400/20 rounded-lg animate-geometric blur-xl" style={{ animationDelay: '3s' }} />
        <div className="absolute bottom-40 left-32 w-40 h-40 bg-gradient-to-r from-cyan-400/20 to-blue-400/20 rounded-full animate-geometric blur-xl" style={{ animationDelay: '6s' }} />
        <div className="absolute top-60 right-40 w-28 h-28 bg-gradient-to-r from-pink-400/20 to-purple-400/20 rounded-lg animate-geometric blur-xl" style={{ animationDelay: '9s' }} />
        <div className="absolute bottom-60 right-20 w-36 h-36 bg-gradient-to-r from-indigo-400/20 to-cyan-400/20 rounded-full animate-geometric blur-xl" style={{ animationDelay: '12s' }} />
      </div>

      {/* Mouse Trail Canvas */}
      {!showWelcome && (
        <canvas
          ref={canvasRef}
          className="fixed inset-0 pointer-events-none z-30"
          style={{ mixBlendMode: 'screen' }}
        />
      )}
      
      {/* Welcome Overlay */}
      {showWelcome && (
        <div 
          className={`fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-blue-900/95 via-purple-900/95 to-indigo-900/95 backdrop-blur-sm ${
            !showWelcome ? 'animate-fadeOut' : 'animate-fadeIn'
          }`}
        >
          <div className="text-center">
            <div className={`transform transition-all duration-1200 ease-out ${
              !showWelcome ? 'scale-50 opacity-0' : 'scale-100 opacity-100'
            }`}
              style={{ transitionDelay: '300ms' }}
            >
              <h1 className="text-6xl md:text-7xl lg:text-8xl font-bold text-white mb-4 tracking-wide">
                Welcome to LibraLearn
              </h1>
              <p className="text-xl md:text-2xl text-blue-200 max-w-2xl mx-auto overflow-hidden">
                <span className={`inline-block ${
                  !showWelcome ? 'animate-slideOut' : 'animate-slideIn'
                }`}
                  style={{ animationDelay: '800ms' }}
                >
                  {"AI-Powered Human Rights Education".split('').map((char, i) => (
                    <span 
                      key={i}
                      className={`inline-block ${
                        !showWelcome ? 'animate-fadeOutUp' : 'animate-fadeInUp'
                      }`}
                      style={{ 
                        animationDelay: `${800 + i * 100}ms`,
                        animationFillMode: 'both'
                      }}
                    >
                      {char === ' ' ? '\u00A0' : char}
                    </span>
                  ))}
                </span>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Animated Background Particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {particles.map((particle) => (
          <div
            key={particle.id}
            className="absolute rounded-full blur-sm animate-particle"
            style={{
              '--x': `${particle.x}px`,
              '--y': `${particle.y}px`,
              '--duration': `${particle.duration}s`,
              '--delay': `${particle.delay}s`,
              '--color': particle.color,
              '--size': `${particle.size}px`,
              '--shadow-size': `${particle.size * 2}px`,
            }}
          />
        ))}
      </div>

      {/* Navigation */}
      <nav 
        className={`fixed top-0 w-full bg-white/80 backdrop-blur-md shadow-sm z-40 transition-all duration-800 ${
          !showWelcome ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className={`flex items-center transition-all duration-600 ${
              !showWelcome ? 'translate-x-0 opacity-100' : '-translate-x-8 opacity-0'
            }`}
              style={{ transitionDelay: showWelcome ? '3.5s' : '0s' }}
            >
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                LibraLearn
              </h1>
            </div>
            <div className={`hidden md:flex items-center space-x-6 transition-all duration-600 ${
              !showWelcome ? 'translate-x-0 opacity-100' : 'translate-x-8 opacity-0'
            }`}
              style={{ transitionDelay: showWelcome ? '4.2s' : '0s' }}
            >
              <a href="#features" className="text-gray-700 hover:text-blue-600 transition-colors">Features</a>
              <a href="#how-it-works" className="text-gray-700 hover:text-blue-600 transition-colors">How It Works</a>
              <a href="#audience" className="text-gray-700 hover:text-blue-600 transition-colors">Audience</a>
              <button 
                onClick={handleLogin}
                className="text-gray-700 hover:text-blue-600 transition-colors font-medium"
              >
                Login
              </button>
              <button 
                onClick={handleSignup}
                className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-2 rounded-lg hover:shadow-lg transition-all"
              >
                Sign Up
              </button>
            </div>
            <div className={`md:hidden transition-all duration-600 ${
              !showWelcome ? 'opacity-100' : 'opacity-0'
            }`}
              style={{ transitionDelay: showWelcome ? '4.4s' : '0s' }}
            >
              <button 
                onClick={handleLogin}
                className="text-gray-700 hover:text-blue-600 transition-colors mr-4"
              >
                Login
              </button>
              <button 
                onClick={handleSignup}
                className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 rounded-lg hover:shadow-lg transition-all text-sm"
              >
                Sign Up
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
        {/* Enhanced Background Integration */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-400/15 via-purple-500/25 to-cyan-400/15 animate-pulse" />
          <div className="absolute inset-0 bg-gradient-to-tr from-indigo-400/10 via-pink-500/15 to-yellow-400/10 animate-pulse" style={{ animationDelay: '2s' }} />
          <div className="absolute inset-0 bg-gradient-to-bl from-cyan-400/10 via-green-500/15 to-blue-400/10 animate-pulse" style={{ animationDelay: '4s' }} />
        </div>

        <div className="relative max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-12">
            {/* Left Side - 3D Avatar with Floating Animation */}
            <div 
              className={`w-full lg:w-1/2 flex justify-center lg:justify-start order-2 lg:order-1 transition-all duration-1000 ${
                !showWelcome ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'
              }`}
              style={{ transitionDelay: showWelcome ? '4.5s' : '0s' }}
            >
              <div className="w-full max-w-lg h-80 md:h-96 lg:h-[500px] animate-float">
                <Canvas
                  key={avatarKey}
                  camera={{ position: [0.8, 1.7, 2.8], fov: 40 }}
                  gl={{ antialias: true, alpha: true }}
                >
                  <Suspense fallback={null}>
                    <ambientLight intensity={0.8} />
                    <directionalLight position={[3, 5, 4]} intensity={1.8} />
                    <directionalLight position={[-2, 4, 3]} intensity={1.0} />
                    <pointLight position={[0, 2.5, 0]} intensity={0.6} />
                    <HeroAvatar key={avatarKey} />
                    <Environment preset="sunset" />
                  </Suspense>
                </Canvas>
              </div>
            </div>

            {/* Right Side - Text Content with Fade-up Animation */}
            <div 
              className={`w-full lg:w-1/2 text-center lg:text-left order-1 lg:order-2 transition-all duration-1000 ${
                !showWelcome ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'
              }`}
              style={{ transitionDelay: showWelcome ? '4.8s' : '0s' }}
            >
              <h1 className={`text-5xl md:text-6xl lg:text-7xl font-bold mb-6 transition-all duration-800 ${
                !showWelcome ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              }`}
                style={{ transitionDelay: showWelcome ? '5s' : '0s' }}
              >
                <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 bg-clip-text text-transparent">
                  LibraLearn
                </span>
              </h1>
              <p className={`text-2xl md:text-3xl font-semibold text-gray-800 mb-4 transition-all duration-800 ${
                !showWelcome ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
              }`}
                style={{ transitionDelay: showWelcome ? '5.2s' : '0s' }}
              >
                Learn Human Rights Through AI-Powered Virtual Educators
              </p>
              <p className={`text-lg md:text-xl text-gray-600 mb-10 transition-all duration-800 ${
                !showWelcome ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              }`}
                style={{ transitionDelay: showWelcome ? '5.4s' : '0s' }}
              >
                Experience interactive human rights education like never before. Our conversational 3D avatar makes 
                learning about your fundamental rights engaging, accessible, and available in both English and Urdu.
              </p>
              
              <div className={`flex flex-col sm:flex-row gap-4 justify-center lg:justify-start transition-all duration-800 ${
                !showWelcome ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              }`}
                style={{ transitionDelay: showWelcome ? '5.6s' : '0s' }}
              >
                <button
                  onClick={handleGetStarted}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:shadow-xl hover:scale-105 transition-all relative overflow-hidden group"
                >
                  <span className="relative z-10">Get Started</span>
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 opacity-0 group-hover:opacity-20 transition-opacity duration-300 blur-sm" />
                </button>
                <button
                  onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
                  className="bg-white text-blue-600 border-2 border-blue-600 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-50 hover:shadow-lg transition-all"
                >
                  Learn More
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section 
        className={`py-20 px-4 sm:px-6 lg:px-8 bg-white transition-all duration-800 ${
          !showWelcome ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'
        }`}
        style={{ transitionDelay: showWelcome ? '6s' : '0s' }}
      >
        <div className="max-w-7xl mx-auto">
          <div className={`text-center mb-16 transition-all duration-800 ${
            !showWelcome ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
            style={{ transitionDelay: showWelcome ? '6.2s' : '0s' }}
          >
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Powerful Features
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Everything you need to learn human rights in an engaging way
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Feature 1 */}
            <div className={`bg-gradient-to-br from-blue-50 to-purple-50 p-8 rounded-2xl hover:shadow-xl transition-all hover:-translate-y-2 transition-all duration-600 ${
              !showWelcome ? 'opacity-100 scale-100' : 'opacity-0 scale-80'
            }`}
              style={{ transitionDelay: showWelcome ? '6.4s' : '0s' }}
            >
              <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center mb-6">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">AI Human Rights Educator Avatar</h3>
              <p className="text-gray-600">
                Interact with an intelligent 3D avatar that guides you through human rights concepts with clarity and empathy.
              </p>
            </div>

            {/* Feature 2 */}
            <div className={`bg-gradient-to-br from-purple-50 to-blue-50 p-8 rounded-2xl hover:shadow-xl transition-all hover:-translate-y-2 transition-all duration-600 ${
              !showWelcome ? 'opacity-100 scale-100' : 'opacity-0 scale-80'
            }`}
              style={{ transitionDelay: showWelcome ? '6.5s' : '0s' }}
            >
              <div className="w-16 h-16 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl flex items-center justify-center mb-6">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Interactive Question & Answer Learning</h3>
              <p className="text-gray-600">
                Ask questions and receive comprehensive answers. Learn at your own pace through engaging conversations.
              </p>
            </div>

            {/* Feature 3 */}
            <div className={`bg-gradient-to-br from-blue-50 to-purple-50 p-8 rounded-2xl hover:shadow-xl transition-all hover:-translate-y-2 transition-all duration-600 ${
              !showWelcome ? 'opacity-100 scale-100' : 'opacity-0 scale-80'
            }`}
              style={{ transitionDelay: showWelcome ? '6.6s' : '0s' }}
            >
              <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center mb-6">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">English and Urdu Support</h3>
              <p className="text-gray-600">
                Access human rights education in both English and Urdu, making knowledge accessible to a wider audience.
              </p>
            </div>

            {/* Feature 4 */}
            <div className={`bg-gradient-to-br from-blue-50 to-purple-50 p-8 rounded-2xl hover:shadow-xl transition-all hover:-translate-y-2 transition-all duration-600 ${
              !showWelcome ? 'opacity-100 scale-100' : 'opacity-0 scale-80'
            }`}
              style={{ transitionDelay: showWelcome ? '6.7s' : '0s' }}
            >
              <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center mb-6">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Simple, Easy-to-Understand Legal Knowledge</h3>
              <p className="text-gray-600">
                Complex legal concepts explained in simple language, making Human rights education accessible to everyone.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section 
        id="how-it-works"
        className={`py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-purple-50 via-white to-blue-50 transition-all duration-800 ${
          !showWelcome ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'
        }`}
        style={{ transitionDelay: showWelcome ? '7s' : '0s' }}
      >
        <div className="max-w-7xl mx-auto">
          <div className={`text-center mb-16 transition-all duration-800 ${
            !showWelcome ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
            style={{ transitionDelay: showWelcome ? '7.2s' : '0s' }}
          >
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              How It Works
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Get started with LibraLearn in three simple steps
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className={`relative transition-all duration-600 ${
              !showWelcome ? 'opacity-100 scale-100' : 'opacity-0 scale-90'
            }`}
              style={{ transitionDelay: showWelcome ? '7.4s' : '0s' }}
            >
              <div className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all">
                <div className={`absolute -top-6 -left-6 w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-xl transition-all duration-400 ${
                  !showWelcome ? 'scale-100' : 'scale-80'
                }`}
                  style={{ transitionDelay: showWelcome ? '7.6s' : '0s' }}
                >
                  1
                </div>
                <div className="mt-4">
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">Sign up / Login</h3>
                  <p className="text-gray-600">
                    Create your account or log in to access the platform. It's quick, easy, and free to get started.
                  </p>
                </div>
              </div>
            </div>

            {/* Step 2 */}
            <div className={`relative transition-all duration-600 ${
              !showWelcome ? 'opacity-100 scale-100' : 'opacity-0 scale-90'
            }`}
              style={{ transitionDelay: showWelcome ? '7.5s' : '0s' }}
            >
              <div className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all">
                <div className={`absolute -top-6 -left-6 w-12 h-12 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-xl transition-all duration-400 ${
                  !showWelcome ? 'scale-100' : 'scale-80'
                }`}
                  style={{ transitionDelay: showWelcome ? '7.7s' : '0s' }}
                >
                  2
                </div>
                <div className="mt-4">
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">Ask questions from AI avatar</h3>
                  <p className="text-gray-600">
                    Start a conversation with our AI-powered 3D avatar. Ask any question about human rights and get instant, clear answers.
                  </p>
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div className={`relative transition-all duration-600 ${
              !showWelcome ? 'opacity-100 scale-100' : 'opacity-0 scale-90'
            }`}
              style={{ transitionDelay: showWelcome ? '7.6s' : '0s' }}
            >
              <div className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all">
                <div className={`absolute -top-6 -left-6 w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-xl transition-all duration-400 ${
                  !showWelcome ? 'scale-100' : 'scale-80'
                }`}
                  style={{ transitionDelay: showWelcome ? '7.8s' : '0s' }}
                >
                  3
                </div>
                <div className="mt-4">
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">Learn human rights with examples</h3>
                  <p className="text-gray-600">
                    Understand complex concepts through real-world examples and interactive explanations tailored to your learning style.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Audience Section */}
      <section id="audience" className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Who Can Benefit
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              LibraLearn is designed for everyone who wants to understand human rights
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Students */}
            <div className="bg-gradient-to-br from-blue-50 to-purple-50 p-8 rounded-2xl text-center hover:shadow-xl transition-all hover:-translate-y-2">
              <div className="w-20 h-20 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Students</h3>
              <p className="text-gray-600">
                Perfect for students studying law, social sciences, or anyone interested in understanding their fundamental rights.
              </p>
            </div>

            {/* General Public */}
            <div className="bg-gradient-to-br from-purple-50 to-blue-50 p-8 rounded-2xl text-center hover:shadow-xl transition-all hover:-translate-y-2">
              <div className="w-20 h-20 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">General Public</h3>
              <p className="text-gray-600">
                Accessible to everyone, regardless of educational background. Learn about your rights in a simple, engaging way.
              </p>
            </div>

            {/* Youth & Awareness Programs */}
            <div className="bg-gradient-to-br from-blue-50 to-purple-50 p-8 rounded-2xl text-center hover:shadow-xl transition-all hover:-translate-y-2">
              <div className="w-20 h-20 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Youth & Awareness Programs</h3>
              <p className="text-gray-600">
                Ideal for educational institutions, NGOs, and organizations running human rights awareness and education programs.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Call To Action Section */}
      <section 
        className={`py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 transition-all duration-800 ${
          !showWelcome ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'
        }`}
        style={{ transitionDelay: showWelcome ? '8s' : '0s' }}
      >
        <div className="max-w-4xl mx-auto text-center">
          <h2 className={`text-4xl md:text-5xl font-bold text-white mb-6 transition-all duration-800 ${
            !showWelcome ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
            style={{ transitionDelay: showWelcome ? '8.2s' : '0s' }}
          >
            Ready to Start Learning?
          </h2>
          <p className={`text-xl text-blue-100 mb-10 max-w-2xl mx-auto transition-all duration-800 ${
            !showWelcome ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
            style={{ transitionDelay: showWelcome ? '8.4s' : '0s' }}
          >
            Join thousands of learners who are discovering their fundamental rights through interactive AI-powered education.
          </p>
          <button
            onClick={handleGetStarted}
            className={`bg-white text-blue-600 px-10 py-5 rounded-lg text-xl font-bold hover:shadow-2xl hover:scale-105 transition-all relative overflow-hidden group transition-all duration-600 ${
              !showWelcome ? 'opacity-100 scale-100' : 'opacity-0 scale-80'
            }`}
            style={{ transitionDelay: showWelcome ? '8.6s' : '0s' }}
          >
            <span className="relative z-10">Start Learning Now</span>
            <div className="absolute inset-0 bg-gradient-to-r from-white to-gray-100 opacity-0 group-hover:opacity-20 transition-opacity duration-300 blur-sm" />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <h3 className="text-2xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              LibraLearn
            </h3>
            <p className="text-gray-400 mb-2">
              University Final Year Project
            </p>
            <p className="text-gray-500 text-sm">
              AI-Powered Human Rights Education Platform
            </p>
            <div className="mt-8 pt-8 border-t border-gray-800">
              <p className="text-gray-500 text-sm">
                © {new Date().getFullYear()} LibraLearn. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;






