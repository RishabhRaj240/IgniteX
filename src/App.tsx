import React, { useState, useEffect, useRef } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase, signInWithGoogle, signOutUser } from "./supabase";
import imgAeroplane from "./assets/Aeroplane.png";
import imgCarepulse from "./assets/Carepulse.png";
import imgOmnifoodHero from "./assets/Omnifood-hero.png";
import imgOmnifood from "./assets/Omnifood.png";
import imgRedefineGaming from "./assets/Redefine-gaming.png";
import imgGym from "./assets/Gym.png";
import imgKishan from "./assets/Kishan.jpeg";
import imgRishab from "./assets/Rishab.png";
import { 
  ArrowRight, 
  Eye, 
  EyeOff, 
  X, 
  Check, 
  Code, 
  Laptop, 
  ShoppingBag, 
  Smartphone, 
  Zap, 
  Palette,
  ChevronDown
} from "lucide-react";

// --- HOOKS & CONTROLLERS ---

// Interactive Scrolling Stats Counter with Intersection Observer
interface CounterProps {
  target: number;
  suffix?: string;
  label: string;
}

const Counter: React.FC<CounterProps> = ({ target, suffix = "", label }) => {
  const [count, setCount] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const isAnimated = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isAnimated.current) {
          isAnimated.current = true;
          let startTime: number | null = null;
          const duration = 1500; // 1.5 seconds

          const animate = (timestamp: number) => {
            if (!startTime) startTime = timestamp;
            const elapsed = timestamp - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Ease-out quadratic function
            const ease = progress * (2 - progress);
            const currentCount = Math.floor(ease * target);
            setCount(currentCount);

            if (progress < 1) {
              requestAnimationFrame(animate);
            } else {
              setCount(target);
            }
          };

          requestAnimationFrame(animate);
        }
      },
      { threshold: 0.5 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [target]);

  return (
    <div ref={containerRef} className="stat-item">
      <span className="stat-number">
        {count}
        {suffix}
      </span>
      <span className="stat-label">{label}</span>
    </div>
  );
};

// --- AUTH MODALS OVERLAY ---
interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: "login" | "signup";
  onModeChange: (mode: "login" | "signup") => void;
}

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, mode, onModeChange }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const modalRef = useRef<HTMLDivElement>(null);

  // Tab Trap & Keyboard ESC Binding
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }

      if (e.key === "Tab" && modalRef.current) {
        const focusable = modalRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            last.focus();
            e.preventDefault();
          }
        } else {
          if (document.activeElement === last) {
            first.focus();
            e.preventDefault();
          }
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    
    // Auto-focus first input
    const firstInput = modalRef.current?.querySelector("input");
    if (firstInput) {
      setTimeout(() => firstInput.focus(), 150);
    }

    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setErrorMsg("");
      await signInWithGoogle();
    } catch (err: unknown) {
      console.error("Google OAuth error:", err);
      setErrorMsg(
        err instanceof Error
          ? err.message
          : "Failed to connect to Google OAuth. Please try again."
      );
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert(`${mode === "login" ? "Logged in" : "Signed up"} successfully with: ${email}`);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div 
      className={`auth-modal-backdrop ${isOpen ? "active" : ""}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div ref={modalRef} className="auth-modal-card" role="dialog" aria-modal="true">
        {/* Close Button */}
        <button 
          onClick={onClose} 
          className="auth-close-btn" 
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Title */}
        <h2 className="auth-header">
          {mode === "login" ? "Welcome to IgniteX" : "Create Account"}
        </h2>

        {/* Error message */}
        {errorMsg && <div className="auth-error-msg">{errorMsg}</div>}

        {/* Google OAuth */}
        <button 
          type="button" 
          className="auth-google-btn" 
          onClick={handleGoogleSignIn}
          disabled={loading}
        >
          {loading ? (
            <div className="auth-loading-spinner"></div>
          ) : (
            <svg className="w-5 h-5" viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
            </svg>
          )}
          <span>{loading ? "Connecting..." : "Continue with Google"}</span>
        </button>

        <div className="auth-divider">or</div>

        {/* Credentials Form */}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input 
              type="email" 
              required 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="hello@company.com" 
              className="form-input" 
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div className="password-input-wrapper">
              <input 
                type={showPassword ? "text" : "password"} 
                required 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••" 
                className="form-input" 
              />
              <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)}
                className="password-toggle-btn"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {mode === "signup" && (
            <>
              <div className="form-group">
                <label className="form-label">Confirm Password</label>
                <input 
                  type="password" 
                  required 
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••" 
                  className="form-input" 
                />
              </div>

              <div className="form-group form-group-last">
                <label className="checkbox-label">
                  <input 
                    type="checkbox" 
                    required 
                    checked={agreeTerms}
                    onChange={(e) => setAgreeTerms(e.target.checked)}
                    className="checkbox-input" 
                  />
                  <span>I agree to the Terms of Service & Privacy Policy</span>
                </label>
              </div>
            </>
          )}

          <button type="submit" className="contact-submit-btn" style={{ marginTop: mode === "login" ? "12px" : "0" }}>
            {mode === "login" ? "Sign In" : "Register Now"}
          </button>
        </form>

        {/* Auth Mode Toggle Link */}
        <div className="auth-footer-link">
          {mode === "login" ? (
            <>
              Don't have an account?{" "}
              <button onClick={() => onModeChange("signup")}>Sign Up</button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button onClick={() => onModeChange("login")}>Sign In</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// --- MAIN LAYOUT COMPONENT ---

export default function App() {
  // Video Refs & Controllers
  const videoRef = useRef<HTMLVideoElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const fadingOutRef = useRef<boolean>(false);
  const opacityRef = useRef<number>(0);

  const animateFade = (targetOpacity: number, duration: number, callback?: () => void) => {
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    const startOpacity = opacityRef.current;
    const opacityDiff = targetOpacity - startOpacity;
    if (opacityDiff === 0) {
      if (callback) callback();
      return;
    }

    let startTime: number | null = null;

    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      const currentOpacity = startOpacity + opacityDiff * progress;
      opacityRef.current = currentOpacity;
      
      if (videoRef.current) {
        videoRef.current.style.opacity = currentOpacity.toString();
      }

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(step);
      } else {
        animationFrameRef.current = null;
        if (callback) callback();
      }
    };

    animationFrameRef.current = requestAnimationFrame(step);
  };

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;

    const duration = video.duration;
    if (!duration || isNaN(duration)) return;

    const timeRemaining = duration - video.currentTime;

    if (timeRemaining <= 0.55 && !fadingOutRef.current) {
      fadingOutRef.current = true;
      animateFade(0, 500);
    }
  };

  const handleEnded = () => {
    const video = videoRef.current;
    if (!video) return;

    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    opacityRef.current = 0;
    video.style.opacity = "0";

    setTimeout(() => {
      video.currentTime = 0;
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            fadingOutRef.current = false;
            animateFade(1, 500);
          })
          .catch((error) => {
            console.error("Video loop play failed:", error);
          });
      } else {
        fadingOutRef.current = false;
        animateFade(1, 500);
      }
    }, 100);
  };

  // Background Video initial play and fade-in setup
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.style.opacity = "0";
    opacityRef.current = 0;
    fadingOutRef.current = false;

    const playPromise = video.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          animateFade(1, 500);
        })
        .catch((error) => {
          console.warn("Autoplay blocked, will fade in on first play/interaction", error);
        });
    } else {
      animateFade(1, 500);
    }

    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Mobile Nav states
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Auth Modal states
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");

  // Supabase Auth state
  const [user, setUser] = useState<User | null>(null);

  // Listen to auth events
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        setAuthOpen(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Contact Form states
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    service: "Web Development",
    budget: "$5k–$15k",
    message: ""
  });

  const [formErrors, setFormErrors] = useState({
    name: "",
    email: "",
    message: ""
  });

  const [formSuccess, setFormSuccess] = useState(false);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formSubmitError, setFormSubmitError] = useState("");

  // Newsletter states
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [newsletterLoading, setNewsletterLoading] = useState(false);
  const [newsletterSuccess, setNewsletterSuccess] = useState(false);
  const [newsletterError, setNewsletterError] = useState("");

  // Trigger modal helper
  const openAuth = (mode: "login" | "signup") => {
    setAuthMode(mode);
    setAuthOpen(true);
    setIsDrawerOpen(false);
  };

  // Staggered Fade Up Observer & Timeline Active Line Observer
  useEffect(() => {
    const fadeObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("active");
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -50px 0px" }
    );

    const fadeElements = document.querySelectorAll(".fade-up");
    fadeElements.forEach((el) => fadeObserver.observe(el));

    // Observe timeline steps
    const stepObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("active");
          }
        });
      },
      { threshold: 0.5 }
    );

    const steps = document.querySelectorAll(".process-step");
    steps.forEach((el) => stepObserver.observe(el));

    // Paint process line on scroll
    const lineObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const fill = document.querySelector(".process-line-fill") as HTMLElement;
            if (fill) fill.style.width = "100%";
          }
        });
      },
      { threshold: 0.2 }
    );

    const processWrapper = document.querySelector(".process-wrapper");
    if (processWrapper) lineObserver.observe(processWrapper);

    return () => {
      fadeObserver.disconnect();
      stepObserver.disconnect();
      lineObserver.disconnect();
    };
  }, []);

  // Form Field Validation
  const validateField = (name: string, value: string) => {
    let error = "";
    if (name === "name") {
      if (!value.trim()) error = "Name is required";
    } else if (name === "email") {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!value.trim()) {
        error = "Email is required";
      } else if (!emailRegex.test(value)) {
        error = "Please enter a valid email address";
      }
    } else if (name === "message") {
      if (!value.trim()) {
        error = "Message is required";
      } else if (value.trim().length < 10) {
        error = "Message must be at least 10 characters";
      }
    }
    setFormErrors((prev) => ({ ...prev, [name]: error }));
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (formErrors[name as keyof typeof formErrors]) {
      validateField(name, value);
    }
  };

  const handleFormBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    validateField(name, value);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Final validation check
    validateField("name", formData.name);
    validateField("email", formData.email);
    validateField("message", formData.message);

    if (formData.name && formData.email && formData.message && !formErrors.name && !formErrors.email && !formErrors.message) {
      setFormSubmitting(true);
      setFormSubmitError("");
      // Insert into Supabase — budget_range matches the DB schema column name
      const { error } = await supabase.from('contact_submissions').insert({
        name: formData.name,
        email: formData.email,
        service: formData.service,
        budget_range: formData.budget,
        message: formData.message,
        user_agent: navigator.userAgent,
      });
      setFormSubmitting(false);
      if (error) {
        console.error('Contact submission error:', error);
        setFormSubmitError('Failed to send your message. Please try again.');
      } else {
        setFormSuccess(true);
      }
    }
  };

  // Newsletter subscription — insert into newsletter_subscribers table
  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsletterEmail) return;

    setNewsletterLoading(true);
    setNewsletterError("");

    const { error } = await supabase.from('newsletter_subscribers').insert(
      { email: newsletterEmail, source: 'footer' },
    );

    setNewsletterLoading(false);

    if (error) {
      // If the email already exists (unique constraint), show a friendly message
      if (error.code === '23505') {
        setNewsletterSuccess(true);
        setNewsletterEmail("");
      } else {
        console.error('Newsletter subscription error:', error);
        setNewsletterError('Failed to subscribe. Please try again.');
      }
    } else {
      setNewsletterSuccess(true);
      setNewsletterEmail("");
    }
  };

  return (
    <div className="app-root">
      
      {/* 500ms Delayed Staggered Load Header Nav */}
      <header className="header-nav fade-up active">
        <div className="container nav-container">
          {/* Logo Brand */}
          <a href="#" className="logo-link">
            <img src="/ignitex-logo.png" alt="IgniteX" className="header-logo-img" />
          </a>

          {/* Links Desktop */}
          <nav className="nav-links-desktop">
            <a href="#services" className="nav-link-item">Services</a>
            <a href="#process" className="nav-link-item">Process</a>
            <a href="#work" className="nav-link-item">Work</a>
            <a href="#about" className="nav-link-item">About</a>
            <a href="#pricing" className="nav-link-item">Pricing</a>
            <a href="#testimonials" className="nav-link-item">Reviews</a>
            <a href="#contact" className="nav-link-item">Contact</a>
          </nav>

          {/* Actions Desktop */}
          <div className="nav-actions">
            {user ? (
              <div className="user-profile-menu">
                {user.user_metadata?.avatar_url ? (
                  <img 
                    src={user.user_metadata.avatar_url} 
                    alt={user.user_metadata.full_name || "User Avatar"} 
                    className="user-avatar"
                  />
                ) : (
                  <div className="user-avatar-placeholder">
                    {user.email?.charAt(0).toUpperCase() || "U"}
                  </div>
                )}
                <span className="user-name">
                  {user.user_metadata?.full_name || user.email?.split("@")[0]}
                </span>
                <button onClick={async () => { await signOutUser(); }} className="logout-glass-btn">
                  Log Out
                </button>
              </div>
            ) : (
              <>
                <button onClick={() => openAuth("signup")} className="signup-text-btn">
                  Sign Up
                </button>
                <button onClick={() => openAuth("login")} className="login-glass-btn">
                  Login
                </button>
              </>
            )}
          </div>

          {/* Hamburger Drawer Activator */}
          <button 
            onClick={() => setIsDrawerOpen(!isDrawerOpen)} 
            className={`hamburger-btn ${isDrawerOpen ? "open" : ""}`}
            aria-label="Toggle Navigation Menu"
          >
            <span></span>
            <span></span>
            <span></span>
          </button>
        </div>
      </header>

      {/* MOBILE DRAWER NAV */}
      <div 
        className={`mobile-drawer-overlay ${isDrawerOpen ? "active" : ""}`}
        onClick={() => setIsDrawerOpen(false)}
      />
      <aside className={`mobile-drawer ${isDrawerOpen ? "open" : ""}`}>
        <button 
          onClick={() => setIsDrawerOpen(false)} 
          className="mobile-drawer-close-btn"
          aria-label="Close Navigation Menu"
        >
          <X className="w-5 h-5" />
        </button>
        <nav className="mobile-nav-links">
          <a href="#services" onClick={() => setIsDrawerOpen(false)} className="mobile-nav-link">Services</a>
          <a href="#process" onClick={() => setIsDrawerOpen(false)} className="mobile-nav-link">Process</a>
          <a href="#work" onClick={() => setIsDrawerOpen(false)} className="mobile-nav-link">Work</a>
          <a href="#about" onClick={() => setIsDrawerOpen(false)} className="mobile-nav-link">About</a>
          <a href="#pricing" onClick={() => setIsDrawerOpen(false)} className="mobile-nav-link">Pricing</a>
          <a href="#testimonials" onClick={() => setIsDrawerOpen(false)} className="mobile-nav-link">Reviews</a>
          <a href="#contact" onClick={() => setIsDrawerOpen(false)} className="mobile-nav-link">Contact</a>
        </nav>
        
        <div className="mobile-actions">
          {user ? (
            <div className="mobile-user-profile">
              <div className="mobile-user-info">
                {user.user_metadata?.avatar_url ? (
                  <img 
                    src={user.user_metadata.avatar_url} 
                    alt={user.user_metadata.full_name || "User Avatar"} 
                    className="user-avatar"
                  />
                ) : (
                  <div className="user-avatar-placeholder">
                    {user.email?.charAt(0).toUpperCase() || "U"}
                  </div>
                )}
                <span className="user-name">
                  {user.user_metadata?.full_name || user.email}
                </span>
              </div>
              <button 
                onClick={async () => { 
                  await signOutUser(); 
                  setIsDrawerOpen(false); 
                }} 
                className="logout-glass-btn"
                style={{ width: "100%", marginTop: "12px" }}
              >
                Log Out
              </button>
            </div>
          ) : (
            <>
              <button onClick={() => openAuth("signup")} className="signup-text-btn" style={{ textAlign: "center" }}>
                Sign Up
              </button>
              <button onClick={() => openAuth("login")} className="login-glass-btn" style={{ width: "100%" }}>
                Login
              </button>
            </>
          )}
        </div>
      </aside>

      {/* DETAILED CINEMATIC HERO SECTION */}
      <section className="hero-section">
        <video
          ref={videoRef}
          className="hero-video translate-y-[17%]"
          src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260328_115001_bcdaa3b4-03de-47e7-ad63-ae3e392c32d4.mp4"
          muted
          playsInline
          autoPlay
          style={{ opacity: 0 }}
          onTimeUpdate={handleTimeUpdate}
          onEnded={handleEnded}
        />
        <div className="hero-video-overlay" />
        <div className="hero-glow-overlay" />
        <div className="container">
          <span className="eyebrow fade-up active" style={{ animationDelay: "150ms" }}>
            CRAFTING DIGITAL ADVANTAGES
          </span>
          <h1 className="hero-title fade-up active">
            Igniting premium web experiences
          </h1>
          <p className="hero-subtitle fade-up active">
            We forge fast, responsive, custom-coded digital masterpieces with pixel-perfect cinematic craftsmanship and modern technology architectures.
          </p>
          <div className="hero-buttons fade-up active">
            <a href="#services" className="cta-btn-solid" style={{ color: "#000" }}>
              Explore Services
            </a>
            <a href="#contact" className="cta-btn-outline" style={{ display: "inline-flex", alignItems: "center", gap: "10px" }}>
              <span>Build With Us</span>
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>
          
          <div className="scroll-indicator fade-up active">
            <span>Scroll Down</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M19 12l-7 7-7-7"/>
            </svg>
          </div>
        </div>
      </section>

      {/* SECTION 1 — SERVICES */}
      <section id="services" className="section-padding" style={{ borderTop: "1px solid var(--border-standard)" }}>
        <div className="container">
          <span className="eyebrow fade-up">WHAT WE BUILD</span>
          <h2 className="section-heading fade-up">End-to-end digital craftsmanship</h2>

          <div className="services-grid">
            {/* Card 1 */}
            <div className="service-card fade-up delay-100">
              <div className="service-icon-box">
                <Palette />
              </div>
              <h3 className="service-title">Web Design</h3>
              <p className="service-description">
                Pixel-perfect, custom fluid layouts tailored precisely to represent your premium brand.
              </p>
              <div className="service-arrow-box">
                <ArrowRight className="w-5 h-5" />
              </div>
            </div>

            {/* Card 2 */}
            <div className="service-card fade-up delay-200">
              <div className="service-icon-box">
                <Code />
              </div>
              <h3 className="service-title">Web Development</h3>
              <p className="service-description">
                Scalable, lightning-fast, and secure engineering. High-integrity code matching top modern architectures.
              </p>
              <div className="service-arrow-box">
                <ArrowRight className="w-5 h-5" />
              </div>
            </div>

            {/* Card 3 */}
            <div className="service-card fade-up delay-300">
              <div className="service-icon-box">
                <ShoppingBag />
              </div>
              <h3 className="service-title">E-Commerce</h3>
              <p className="service-description">
                High-converting digital storefronts. Custom cart dynamics and secure payment portal integrations.
              </p>
              <div className="service-arrow-box">
                <ArrowRight className="w-5 h-5" />
              </div>
            </div>

            {/* Card 4 */}
            <div className="service-card fade-up delay-100">
              <div className="service-icon-box">
                <Smartphone />
              </div>
              <h3 className="service-title">Mobile Apps</h3>
              <p className="service-description">
                Immersive native iOS and Android apps designed for speed, beauty, and smooth operation.
              </p>
              <div className="service-arrow-box">
                <ArrowRight className="w-5 h-5" />
              </div>
            </div>

            {/* Card 5 */}
            <div className="service-card fade-up delay-200">
              <div className="service-icon-box">
                <Zap />
              </div>
              <h3 className="service-title">SEO & Performance</h3>
              <p className="service-description">
                Blazing fast page load scores and semantic tag engineering for dominant organic engine visibility.
              </p>
              <div className="service-arrow-box">
                <ArrowRight className="w-5 h-5" />
              </div>
            </div>

            {/* Card 6 */}
            <div className="service-card fade-up delay-300">
              <div className="service-icon-box">
                <Laptop />
              </div>
              <h3 className="service-title">Brand Identity</h3>
              <p className="service-description">
                Stunning vector logos, premium typography guides, and complete unified brand guidelines.
              </p>
              <div className="service-arrow-box">
                <ArrowRight className="w-5 h-5" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2 — PROCESS */}
      <section id="process" className="section-padding" style={{ backgroundColor: "#0b0b0b", borderTop: "1px solid var(--border-standard)" }}>
        <div className="container">
          <span className="eyebrow fade-up">HOW WE WORK</span>
          <h2 className="section-heading fade-up">From brief to brilliant</h2>

          <div className="process-wrapper fade-up">
            {/* Timeline connection line */}
            <div className="process-line">
              <div className="process-line-fill"></div>
            </div>

            <div className="process-steps">
              {/* Step 1 */}
              <div className="process-step">
                <div className="process-dot"></div>
                <span className="process-number">01</span>
                <h3 className="process-step-title">Discovery</h3>
                <p className="process-step-desc">
                  We deep dive into your goals, landscape, and specifications to align on the project compass.
                </p>
              </div>

              {/* Step 2 */}
              <div className="process-step">
                <div className="process-dot"></div>
                <span className="process-number">02</span>
                <h3 className="process-step-title">Strategy</h3>
                <p className="process-step-desc">
                  Defining a structured architecture wireframe, technology stacks, and immersive branding directions.
                </p>
              </div>

              {/* Step 3 */}
              <div className="process-step">
                <div className="process-dot"></div>
                <span className="process-number">03</span>
                <h3 className="process-step-title">Build</h3>
                <p className="process-step-desc">
                  Pixel-perfect high-fidelity frontend styling combined with responsive React engineering.
                </p>
              </div>

              {/* Step 4 */}
              <div className="process-step">
                <div className="process-dot"></div>
                <span className="process-number">04</span>
                <h3 className="process-step-title">Launch</h3>
                <p className="process-step-desc">
                  Comprehensive performance auditing, testing, and secure live web deployment.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 3 — SELECTED WORK */}
      <section id="work" className="section-padding" style={{ borderTop: "1px solid var(--border-standard)" }}>
        <div className="container">
          <span className="eyebrow fade-up">SELECTED WORK</span>
          <h2 className="section-heading fade-up">Projects that speak louder than words</h2>

          <div className="portfolio-grid">
            {/* Project 1 */}
            <div className="portfolio-card large fade-up delay-100">
              <div className="portfolio-bg-gradient"></div>
              <div 
                className="portfolio-image-placeholder" 
                style={{ backgroundImage: `url(${imgAeroplane})` }}
              ></div>
              <span className="portfolio-tag">TRAVEL & BOOKING</span>
              <div className="portfolio-content">
                <h3 className="portfolio-name">Aeroplane</h3>
              </div>
              <div className="portfolio-hover-overlay">
                <span className="portfolio-hover-text">
                  <span>View Project</span>
                  <ArrowRight className="w-4 h-4" />
                </span>
              </div>
            </div>

            {/* Project 2 */}
            <div className="portfolio-card large fade-up delay-100">
              <div className="portfolio-bg-gradient"></div>
              <div 
                className="portfolio-image-placeholder" 
                style={{ backgroundImage: `url(${imgCarepulse})` }}
              ></div>
              <span className="portfolio-tag">HEALTHCARE</span>
              <div className="portfolio-content">
                <h3 className="portfolio-name">CarePulse</h3>
              </div>
              <div className="portfolio-hover-overlay">
                <span className="portfolio-hover-text">
                  <span>View Project</span>
                  <ArrowRight className="w-4 h-4" />
                </span>
              </div>
            </div>

            {/* Project 3 */}
            <div className="portfolio-card large fade-up delay-100">
              <div className="portfolio-bg-gradient"></div>
              <div 
                className="portfolio-image-placeholder" 
                style={{ backgroundImage: `url(${imgOmnifoodHero})` }}
              ></div>
              <span className="portfolio-tag">FOOD DELIVERY</span>
              <div className="portfolio-content">
                <h3 className="portfolio-name">Omnifood Hero</h3>
              </div>
              <div className="portfolio-hover-overlay">
                <span className="portfolio-hover-text">
                  <span>View Project</span>
                  <ArrowRight className="w-4 h-4" />
                </span>
              </div>
            </div>

            {/* Project 4 */}
            <div className="portfolio-card large fade-up delay-100">
              <div className="portfolio-bg-gradient"></div>
              <div 
                className="portfolio-image-placeholder" 
                style={{ backgroundImage: `url(${imgOmnifood})` }}
              ></div>
              <span className="portfolio-tag">E-COMMERCE</span>
              <div className="portfolio-content">
                <h3 className="portfolio-name">Omnifood</h3>
              </div>
              <div className="portfolio-hover-overlay">
                <span className="portfolio-hover-text">
                  <span>View Project</span>
                  <ArrowRight className="w-4 h-4" />
                </span>
              </div>
            </div>

            {/* Project 5 */}
            <div className="portfolio-card large fade-up delay-100">
              <div className="portfolio-bg-gradient"></div>
              <div 
                className="portfolio-image-placeholder" 
                style={{ backgroundImage: `url(${imgRedefineGaming})` }}
              ></div>
              <span className="portfolio-tag">GAMING & ESPORTS</span>
              <div className="portfolio-content">
                <h3 className="portfolio-name">Redefine Gaming</h3>
              </div>
              <div className="portfolio-hover-overlay">
                <span className="portfolio-hover-text">
                  <span>View Project</span>
                  <ArrowRight className="w-4 h-4" />
                </span>
              </div>
            </div>

            {/* Project 6 */}
            <div className="portfolio-card large fade-up delay-100">
              <div className="portfolio-bg-gradient"></div>
              <div 
                className="portfolio-image-placeholder" 
                style={{ backgroundImage: `url(${imgGym})` }}
              ></div>
              <span className="portfolio-tag">FITNESS &amp; WELLNESS</span>
              <div className="portfolio-content">
                <h3 className="portfolio-name">Gym</h3>
              </div>
              <div className="portfolio-hover-overlay">
                <span className="portfolio-hover-text">
                  <span>View Project</span>
                  <ArrowRight className="w-4 h-4" />
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 4 — STATS & MANIFESTO */}
      <section id="about" className="section-padding stats-section-box" style={{ borderTop: "1px solid var(--border-standard)" }}>
        <div className="stats-radial-glow"></div>
        <div className="container">
          
          {/* Animated Intersection Counters Row */}
          <div className="stats-row fade-up">
            <Counter target={50} suffix="+" label="Projects Delivered" />
            <Counter target={30} suffix="%" label="Client Satisfaction" />
            <Counter target={5} suffix="+" label="Years of Experience" />
            <Counter target={7} suffix="" label="Agency Artisans" />
          </div>

          {/* Manifesto Split Container */}
          <div className="stats-manifesto-split fade-up">
            <blockquote className="pull-quote">
              "We don't just build websites. We build competitive advantages."
            </blockquote>
            <p className="manifesto-para">
              IgniteX exists at the convergence of high engineering capabilities and pristine editorial design. 
              We reject off-the-shelf templates and lazy framework structures, opting instead to write custom 
              lightweight codebases that load instantly, secure your digital assets, and deliver spectacular brand presence.
            </p>
          </div>
        </div>
      </section>

      {/* SECTION — MEET OUR TEAM */}
      <section id="team" className="team-section">
        <div className="container">
          {/* Section Header */}
          <div className="team-header fade-up">
            <h2 className="section-heading fade-up">MEET OUR TEAM</h2>
            <hr className="team-divider" />
          </div>

          {/* Cards Grid */}
          <div className="team-grid">

            {/* Card 1 — Kishan Sahu */}
            <div className="team-card fade-up delay-100">
              <div
                className="team-card-photo"
                style={{ backgroundImage: `url(${imgKishan})` }}
              >
              </div>
              <div className="team-card-banner">
                <p className="eyebrow fade-up">Kishan Sahu</p>
                <p className="eyebrow fade-up">Creative Director</p>
              </div>
            </div>

            {/* Card 2 — Rishab Raj */}
            <div className="team-card fade-up delay-200">
              <div
                className="team-card-photo"
                style={{ backgroundImage: `url(${imgRishab})` }}
              >
              </div>
              <div className="team-card-banner">
                <p className="eyebrow fade-up">Rishab Raj</p>
                <p className="eyebrow fade-up">Web Designer</p>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* SECTION 5 — PRICING */}
      <section id="pricing" className="section-padding" style={{ borderTop: "1px solid var(--border-standard)" }}>
        <div className="container">
          <span className="eyebrow fade-up">TRANSPARENT PRICING</span>
          <h2 className="section-heading fade-up">Invest in results</h2>

          <div className="pricing-grid">
            
            {/* Card 1: Starter */}
            <div className="pricing-card fade-up delay-100">
              <span className="plan-name">Starter</span>
              <div className="plan-price-box">
                <span className="plan-price">₹5,000</span>
              </div>
              <span className="plan-billing-note">One-time investment · Fixed scope</span>
              <div className="pricing-divider"></div>
              
              <ul className="feature-list">
                <li className="feature-item">
                  <Check className="w-4 h-4" />
                  <span>Custom 5-Page Responsive Web</span>
                </li>
                <li className="feature-item">
                  <Check className="w-4 h-4" />
                  <span>DM Sans Typography Architecture</span>
                </li>
                <li className="feature-item">
                  <Check className="w-4 h-4" />
                  <span>Custom Contact Forms & Map Integrations</span>
                </li>
                <li className="feature-item">
                  <Check className="w-4 h-4" />
                  <span>Blazing Fast Page Load Optimization</span>
                </li>
                <li className="feature-item disabled">
                  <Check className="w-4 h-4" />
                  <span>Scalable Custom CMS Custom Panels</span>
                </li>
                <li className="feature-item disabled">
                  <Check className="w-4 h-4" />
                  <span>Dedicated Content Management Strategy</span>
                </li>
                <li className="feature-item disabled">
                  <Check className="w-4 h-4" />
                  <span>Monthly Analytical SEO Tracking Reports</span>
                </li>
              </ul>
              
              <a href="#contact" className="pricing-cta-btn outline">
                Get Started
              </a>
            </div>

            {/* Card 2: Growth [Highlight Recommended] */}
            <div className="pricing-card recommended fade-up delay-200">
              <div className="popular-badge">Most Popular</div>
              <span className="plan-name">Growth</span>
              <div className="plan-price-box">
                <span className="plan-price">₹7,500</span>
              </div>
              <span className="plan-billing-note">One-time investment · Highly recommended</span>
              <div className="pricing-divider"></div>
              
              <ul className="feature-list">
                <li className="feature-item">
                  <Check className="w-4 h-4" />
                  <span>Custom Multi-Page Design & Development</span>
                </li>
                <li className="feature-item">
                  <Check className="w-4 h-4" />
                  <span>Full Playfair Display Typography Style</span>
                </li>
                <li className="feature-item">
                  <Check className="w-4 h-4" />
                  <span>Bento Layout Portfolio Integrations</span>
                </li>
                <li className="feature-item">
                  <Check className="w-4 h-4" />
                  <span>Scalable Custom CMS Architecture Panel</span>
                </li>
                <li className="feature-item">
                  <Check className="w-4 h-4" />
                  <span>Advanced Performance & Speed Audits</span>
                </li>
                <li className="feature-item">
                  <Check className="w-4 h-4" />
                  <span>Complete Mobile Application Consulting</span>
                </li>
                <li className="feature-item disabled">
                  <Check className="w-4 h-4" />
                  <span>24/7 Dedicated Server Support & DevOps</span>
                </li>
              </ul>
              
              <a href="#contact" className="pricing-cta-btn solid">
                Hire IgniteX
              </a>
            </div>

            {/* Card 3: Enterprise */}
            <div className="pricing-card fade-up delay-300">
              <span className="plan-name">Enterprise</span>
              <div className="plan-price-box">
                <span className="plan-price">₹10,000</span>
              </div>
              <span className="plan-billing-note">Custom configurations · Tailored scope</span>
              <div className="pricing-divider"></div>
              
              <ul className="feature-list">
                <li className="feature-item">
                  <Check className="w-4 h-4" />
                  <span>Full Scale Agency Platform Design & Dev</span>
                </li>
                <li className="feature-item">
                  <Check className="w-4 h-4" />
                  <span>Unlimited Custom Pages & Responsive Modules</span>
                </li>
                <li className="feature-item">
                  <Check className="w-4 h-4" />
                  <span>Integrated E-Commerce Cart & Custom Portals</span>
                </li>
                <li className="feature-item">
                  <Check className="w-4 h-4" />
                  <span>Native App Integration Consulting</span>
                </li>
                <li className="feature-item">
                  <Check className="w-4 h-4" />
                  <span>Dedicated Content Management Strategy</span>
                </li>
                <li className="feature-item">
                  <Check className="w-4 h-4" />
                  <span>Monthly Analytical SEO Tracking Reports</span>
                </li>
                <li className="feature-item">
                  <Check className="w-4 h-4" />
                  <span>24/7 Dedicated Server Support & DevOps</span>
                </li>
              </ul>
              
              <a href="#contact" className="pricing-cta-btn outline">
                Contact Enterprise
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 6 — TESTIMONIALS */}
      <section id="testimonials" className="section-padding" style={{ backgroundColor: "#0b0b0b", borderTop: "1px solid var(--border-standard)" }}>
        <div className="container">
          <span className="eyebrow fade-up">CLIENT VOICES</span>
          <h2 className="section-heading fade-up">Results they didn't expect</h2>

          <div className="testimonials-grid">
            
            {/* Testimonial 1 */}
            <div className="testimonial-card fade-up delay-100">
              <div className="testimonial-quote-box">
                <span className="testimonial-quote-mark">“</span>
                <blockquote className="testimonial-quote">
                  Our web traffic grew by 140% in two months after launch. The speed optimizations IgniteX engineered on our platform made a tremendous commercial difference.
                </blockquote>
              </div>
              <div className="testimonial-divider"></div>
              <div className="testimonial-client-box">
                <div className="client-avatar">SW</div>
                <div className="client-info">
                  <span className="client-name">Sarah Wilson</span>
                  <span className="client-company">VP of Product · Vertex Cloud</span>
                </div>
              </div>
            </div>

            {/* Testimonial 2 */}
            <div className="testimonial-card fade-up delay-200">
              <div className="testimonial-quote-box">
                <span className="testimonial-quote-mark">“</span>
                <blockquote className="testimonial-quote">
                  A level of digital craftsmanship we didn't think existed. Their customized bento grid portfolio module makes our capital assets shine.
                </blockquote>
              </div>
              <div className="testimonial-divider"></div>
              <div className="testimonial-client-box">
                <div className="client-avatar">MC</div>
                <div className="client-info">
                  <span className="client-name">Marcus Chen</span>
                  <span className="client-company">Managing Director · Apex Capital</span>
                </div>
              </div>
            </div>

            {/* Testimonial 3 */}
            <div className="testimonial-card fade-up delay-300">
              <div className="testimonial-quote-box">
                <span className="testimonial-quote-mark">“</span>
                <blockquote className="testimonial-quote">
                  Our custom storefront loads immediately and our checkout conversions increased by 22%. They built us a massive digital advantage.
                </blockquote>
              </div>
              <div className="testimonial-divider"></div>
              <div className="testimonial-client-box">
                <div className="client-avatar">EL</div>
                <div className="client-info">
                  <span className="client-name">Elena Rostova</span>
                  <span className="client-company">Founder · Mono Apparel</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 7 — CTA BANNER */}
      <section id="cta" className="section-padding cta-section-box" style={{ borderTop: "1px solid var(--border-standard)" }}>
        <div className="cta-radial-glow"></div>
        <div className="container cta-container-inner">
          <h2 className="cta-heading fade-up">
            Ready to ignite your digital presence?
          </h2>
          <p className="cta-subtext fade-up">
            Let's build something extraordinary together.
          </p>
          <div className="cta-buttons fade-up">
            <a href="#contact" className="cta-btn-solid" style={{ color: "#000" }}>
              Start a Project
            </a>
            <a href="#work" className="cta-btn-outline">
              See Our Work
            </a>
          </div>
        </div>
      </section>

      {/* SECTION 8 — CONTACT SECTION & PAGE */}
      <section id="contact" className="section-padding" style={{ borderTop: "1px solid var(--border-standard)" }}>
        <div className="container">
          <span className="eyebrow fade-up">GET IN TOUCH</span>
          <h2 className="section-heading fade-up">Tell us what you're building</h2>

          <div className="contact-grid">
            
            {/* Info Column */}
            <div className="contact-info-column fade-up">
              <p className="contact-intro-text">
                Have a project concept or want to upgrade your current website architecture? 
                Drop us a message. We answer every inquiry within 24 hours.
              </p>

              <div className="contact-details-box">
                {/* Email Row */}
                <div className="contact-detail-row">
                  <span className="detail-label">Email</span>
                  <a href="mailto:ignitex1996@gmail.com" className="detail-value">
                    ignitex1996@gmail.com
                  </a>
                </div>

                {/* Phone Row */}
                <div className="contact-detail-row">
                  <span className="detail-label">Phone</span>
                  <a href="tel:+917828720729" className="detail-value">
                    +91 7828720729
                  </a>
                </div>

                {/* Location Row */}
                <div className="contact-detail-row">
                  <span className="detail-label">Location</span>
                  <span className="detail-value">Remote · Worldwide</span>
                </div>
              </div>

              {/* Social Links Row */}
              <div className="contact-social-row">
                <a href="#" className="contact-social-item">
                  <span>LinkedIn</span>
                </a>
                <a href="#" className="contact-social-item">
                  <span>Twitter</span>
                </a>
                <a href="#" className="contact-social-item">
                  <span>GitHub</span>
                </a>
              </div>
            </div>

            {/* Form Column */}
            <div className="contact-form-card fade-up">
              {formSuccess ? (
                /* Success Message Redirection Box */
                <div className="form-success-box">
                  <div className="success-icon-ring">
                    <Check className="w-8 h-8" />
                  </div>
                  <h3 className="success-title">Message Received</h3>
                  <p className="success-desc">
                    We'll be in touch within 24 hours. Let's create something remarkable.
                  </p>
                  <button 
                    onClick={() => {
                      setFormData({ name: "", email: "", service: "Web Development", budget: "$5k–$15k", message: "" });
                      setFormSuccess(false);
                    }}
                    className="login-glass-btn"
                    style={{ marginTop: "24px" }}
                  >
                    Send Another Message
                  </button>
                </div>
              ) : (
                /* Active Contact Form */
                <form onSubmit={handleFormSubmit} noValidate>
                  
                  {/* Name & Email split row */}
                  <div className="form-split-row">
                    <div className="form-group">
                      <label className="form-label" htmlFor="contact-name">Full Name</label>
                      <input 
                        id="contact-name"
                        type="text" 
                        name="name"
                        value={formData.name}
                        onChange={handleFormChange}
                        onBlur={handleFormBlur}
                        placeholder="John Doe" 
                        className={`form-input ${formErrors.name ? "invalid" : ""}`}
                        required
                      />
                      {formErrors.name && (
                        <span className="form-error-msg">{formErrors.name}</span>
                      )}
                    </div>

                    <div className="form-group">
                      <label className="form-label" htmlFor="contact-email">Email Address</label>
                      <input 
                        id="contact-email"
                        type="email" 
                        name="email"
                        value={formData.email}
                        onChange={handleFormChange}
                        onBlur={handleFormBlur}
                        placeholder="john@company.com" 
                        className={`form-input ${formErrors.email ? "invalid" : ""}`}
                        required
                      />
                      {formErrors.email && (
                        <span className="form-error-msg">{formErrors.email}</span>
                      )}
                    </div>
                  </div>

                  {/* Service & Budget Split Row */}
                  <div className="form-split-row">
                    <div className="form-group">
                      <label className="form-label" htmlFor="contact-service">Service of Interest</label>
                      <div style={{ position: "relative" }}>
                        <select 
                          id="contact-service"
                          name="service"
                          value={formData.service}
                          onChange={handleFormChange}
                          className="form-select"
                        >
                          <option value="Web Design">Web Design</option>
                          <option value="Web Development">Web Development</option>
                          <option value="E-Commerce">E-Commerce</option>
                          <option value="Mobile Apps">Mobile Apps</option>
                          <option value="SEO & Performance">SEO & Performance</option>
                          <option value="Other">Other</option>
                        </select>
                        <ChevronDown 
                          className="w-4 h-4 text-secondary" 
                          style={{ position: "absolute", right: "18px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} 
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label" htmlFor="contact-budget">Estimated Budget</label>
                      <div style={{ position: "relative" }}>
                        <select 
                          id="contact-budget"
                          name="budget"
                          value={formData.budget}
                          onChange={handleFormChange}
                          className="form-select"
                        >
                          <option value="<$5k">&lt;$5k</option>
                          <option value="$5k–$15k">$5k–$15k</option>
                          <option value="$15k–$50k">$15k–$50k</option>
                          <option value="$50k+">$50k+</option>
                        </select>
                        <ChevronDown 
                          className="w-4 h-4 text-secondary" 
                          style={{ position: "absolute", right: "18px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} 
                        />
                      </div>
                    </div>
                  </div>

                  {/* Message Form Group */}
                  <div className="form-group form-group-last">
                    <label className="form-label" htmlFor="contact-message">Project Description</label>
                    <textarea 
                      id="contact-message"
                      name="message"
                      rows={4}
                      value={formData.message}
                      onChange={handleFormChange}
                      onBlur={handleFormBlur}
                      placeholder="Tell us what you're building..." 
                      className={`form-textarea ${formErrors.message ? "invalid" : ""}`}
                      required
                    />
                    {formErrors.message && (
                      <span className="form-error-msg">{formErrors.message}</span>
                    )}
                  </div>

                  {formSubmitError && (
                    <p style={{ color: 'var(--accent-warning, #f59e0b)', fontSize: '0.85rem', marginTop: '8px', textAlign: 'center' }}>
                      {formSubmitError}
                    </p>
                  )}

                  <button type="submit" className="contact-submit-btn" disabled={formSubmitting}>
                    {formSubmitting ? 'Sending...' : 'Submit Proposal'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* COMPACT GLOBAL FOOTER */}
      <footer className="site-footer">
        <div className="container">
          
          <div className="footer-grid">
            {/* Column 1: Brand Info */}
            <div className="footer-column">
              <span className="footer-brand-title">
                <img src="/ignitex-logo.png" alt="IgniteX" className="footer-logo-img" />
              </span>
              <p className="footer-tagline">
                Forging premium responsive digital competitive advantages through high engineering and pristine design.
              </p>
              
              <div className="footer-social-row">
                <a href="#" className="footer-social-icon" aria-label="LinkedIn">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6zM2 9h4v12H2z" />
                    <circle cx="4" cy="4" r="2" />
                  </svg>
                </a>
                <a href="#" className="footer-social-icon" aria-label="Twitter">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" />
                  </svg>
                </a>
                <a href="#" className="footer-social-icon" aria-label="GitHub">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
                  </svg>
                </a>
              </div>
            </div>

            {/* Column 2: Services directories */}
            <div className="footer-column">
              <h4 className="footer-heading">Services</h4>
              <ul className="footer-links-list">
                <li className="footer-link-item"><a href="#services">Web Design</a></li>
                <li className="footer-link-item"><a href="#services">Web Development</a></li>
                <li className="footer-link-item"><a href="#services">E-Commerce Platforms</a></li>
                <li className="footer-link-item"><a href="#services">Mobile Applications</a></li>
                <li className="footer-link-item"><a href="#services">SEO Optimization</a></li>
                <li className="footer-link-item"><a href="#services">Brand Identity Systems</a></li>
              </ul>
            </div>

            {/* Column 3: Company directories */}
            <div className="footer-column">
              <h4 className="footer-heading">Company</h4>
              <ul className="footer-links-list">
                <li className="footer-link-item"><a href="#about">About IgniteX</a></li>
                <li className="footer-link-item"><a href="#work">Selected Work</a></li>
                <li className="footer-link-item"><a href="#pricing">Plan Pricing</a></li>
                <li className="footer-link-item"><a href="#contact">Contact Careers</a></li>
                <li className="footer-link-item"><a href="#contact">Blog Insights</a></li>
              </ul>
            </div>

            {/* Column 4: Stay Updated Input bar */}
            <div className="footer-column">
              <h4 className="footer-heading">Stay Updated</h4>
              <p className="footer-desc-short">
                Subscribe to receive our latest insights and design releases.
              </p>
              
              {newsletterSuccess ? (
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '10px',
                  padding: '12px 16px',
                  background: 'rgba(16, 185, 129, 0.1)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  borderRadius: '10px',
                  marginTop: '12px'
                }}>
                  <Check className="w-4 h-4" style={{ color: '#10b981', flexShrink: 0 }} />
                  <span style={{ fontSize: '0.85rem', color: '#10b981' }}>You're subscribed! Welcome aboard.</span>
                </div>
              ) : (
                <>
                  <form onSubmit={handleNewsletterSubmit} className="footer-subscribe-bar">
                    <input 
                      type="email" 
                      placeholder="Enter your email" 
                      required
                      value={newsletterEmail}
                      onChange={(e) => setNewsletterEmail(e.target.value)}
                      className="footer-subscribe-input"
                      aria-label="Newsletter email subscription"
                    />
                    <button 
                      type="submit" 
                      className="footer-subscribe-btn" 
                      aria-label="Subscribe"
                      disabled={newsletterLoading}
                    >
                      {newsletterLoading ? (
                        <div style={{ width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                      ) : (
                        <ArrowRight className="w-4 h-4" />
                      )}
                    </button>
                  </form>
                  {newsletterError && (
                    <p style={{ color: '#f87171', fontSize: '0.78rem', marginTop: '6px' }}>{newsletterError}</p>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Footer Bottom Bar */}
          <div className="footer-bottom-bar">
            <span className="footer-copyright">
              © 2026 IgniteX · Crafted with Cinematic Digital Passion.
            </span>
            <div className="footer-bottom-links">
              <a href="#">Privacy Policy</a>
              <a href="#">Terms of Service</a>
              <a href="#">Sitemap</a>
            </div>
          </div>

        </div>
      </footer>

      {/* OVERLAID AUTHENTICATION CARD SYSTEM */}
      <AuthModal 
        isOpen={authOpen} 
        onClose={() => setAuthOpen(false)} 
        mode={authMode}
        onModeChange={setAuthMode}
      />

    </div>
  );
}
