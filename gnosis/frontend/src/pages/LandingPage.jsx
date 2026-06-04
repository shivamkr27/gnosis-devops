import React, { useState, useEffect, useCallback } from "react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import { useAuthStore } from "../lib/store";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, Bell, User, Map, Swords, Trophy, Star, X, ChevronRight } from "lucide-react";

// ── ReviewCard component ─────────────────────────────────────────────
function ReviewCard({ review, size = "normal" }) {
  const stars = review?.rating ?? 5;
  const name  = review?.reviewer_name ?? "Anonymous";
  const text  = review?.review_text ?? "";

  return (
    <div
      className={`bg-white rounded-2xl shadow-md border border-gray-100 flex flex-col gap-3
        ${size === "large" ? "p-8 md:p-10" : "p-6"}`}
    >
      <div className="flex gap-1">
        {[1,2,3,4,5].map(s => (
          <Star
            key={s}
            className={`w-4 h-4 ${s <= stars ? "text-brand-accent fill-brand-accent" : "text-gray-200 fill-gray-200"}`}
          />
        ))}
      </div>
      <p className={`italic text-brand-text leading-relaxed font-medium
        ${size === "large" ? "text-lg md:text-xl" : "text-sm"}`}>
        "{text}"
      </p>
      <div className="flex items-center gap-3 mt-auto">
        <div className="w-9 h-9 rounded-full bg-brand-accent/20 flex items-center justify-center
                        text-brand-accent font-bold text-sm shrink-0">
          {name.charAt(0).toUpperCase()}
        </div>
        <p className="font-bold text-brand-text text-sm">{name}</p>
      </div>
    </div>
  );
}

// ── ReviewForm modal ─────────────────────────────────────────────────
function ReviewFormModal({ onClose }) {
  const { token, user } = useAuthStore();
  const [name, setName]     = useState(user?.username || "");
  const [text, setText]     = useState("");
  const [rating, setRating] = useState(5);
  const [hover, setHover]   = useState(0);
  const [loading, setLoading] = useState(false);
  const [done, setDone]     = useState(false);
  const [error, setError]   = useState("");

  // Not logged in — show gate
  if (!token) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4"
        onClick={e => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 20 }}
          className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-8 relative text-center"
        >
          <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
          <div className="w-16 h-16 bg-brand-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Star className="w-8 h-8 text-brand-accent" />
          </div>
          <h3 className="text-xl font-bold text-brand-text mb-2">Login First</h3>
          <p className="text-brand-muted text-sm mb-6">
            Use Gnosis, experience it, then share your review. Only our learners can review!
          </p>
          <Link
            to="/auth"
            onClick={onClose}
            className="block w-full py-3 rounded-lg bg-brand-accent text-white font-bold text-sm hover:opacity-90 transition-opacity"
          >
            Login / Sign Up
          </Link>
        </motion.div>
      </div>
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim() || !text.trim()) {
      setError("Please fill in all fields.");
      return;
    }
    if (text.trim().length < 10) {
      setError("Review must be at least 10 characters.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/content/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewer_name: name.trim(), review_text: text.trim(), rating }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit");
      setDone(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 20 }}
        className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8 relative"
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
          <X className="w-5 h-5" />
        </button>

        {done ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Star className="w-8 h-8 text-green-600 fill-green-600" />
            </div>
            <h3 className="text-xl font-bold text-brand-text mb-2">Thank you!</h3>
            <p className="text-brand-muted text-sm">Your review has been submitted and will appear after approval.</p>
            <button
              onClick={onClose}
              className="mt-6 px-6 py-2.5 rounded-lg bg-brand-primary text-white font-semibold text-sm hover:opacity-90 transition-opacity"
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div>
              <h3 className="text-xl font-bold text-brand-text">Share Your Experience</h3>
              <p className="text-brand-muted text-sm mt-1">Tell others how GNOSIS helped you learn.</p>
            </div>

            {/* Star rating */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-brand-text">Rating</label>
              <div className="flex gap-1">
                {[1,2,3,4,5].map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setRating(s)}
                    onMouseEnter={() => setHover(s)}
                    onMouseLeave={() => setHover(0)}
                    className="focus:outline-none"
                  >
                    <Star
                      className={`w-7 h-7 transition-colors ${
                        s <= (hover || rating) ? "text-brand-accent fill-brand-accent" : "text-gray-200 fill-gray-200"
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Name — pre-filled + locked when logged in */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-brand-text">
                Your Name {user?.username && <span className="text-xs font-normal text-gray-400">(from your account)</span>}
              </label>
              <input
                type="text"
                value={name}
                onChange={e => !user?.username && setName(e.target.value)}
                readOnly={!!user?.username}
                placeholder="e.g. Rahul S."
                maxLength={60}
                className={`border rounded-lg px-4 py-2.5 text-sm text-brand-text placeholder-gray-400
                           focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary
                           ${user?.username ? 'bg-gray-50 border-gray-100 cursor-default' : 'border-gray-200'}`}
              />
            </div>

            {/* Review text */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-brand-text">Your Review</label>
              <textarea
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder="What did you love about GNOSIS? How did it help you?"
                rows={4}
                maxLength={400}
                className="border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-brand-text placeholder-gray-400
                           focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary resize-none"
              />
              <p className="text-xs text-gray-400 text-right">{text.length}/400</p>
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="py-3 rounded-lg bg-brand-accent text-white font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-60"
            >
              {loading ? "Submitting…" : "Submit Review"}
            </button>
          </form>
        )}
      </motion.div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────
export default function LandingPage() {
  const { token } = useAuthStore();
  const [searchParams] = useSearchParams();
  const reviewMode = searchParams.get("review") === "1";

  const [reviews, setReviews]   = useState([]);
  const [current, setCurrent]   = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [direction, setDirection] = useState(1);

  // Logged-in user visiting normally → redirect to home
  // But if ?review=1 → stay here and auto-open review form
  if (token && !reviewMode) return <Navigate to="/home" />;

  // Auto-open form when ?review=1
  useEffect(() => {
    if (reviewMode) setShowForm(true);
  }, [reviewMode]);

  // Fetch approved reviews
  useEffect(() => {
    fetch("/api/content/reviews/approved")
      .then(r => r.json())
      .then(data => Array.isArray(data) && setReviews(data))
      .catch(() => {});
  }, []);

  // Auto-rotate
  useEffect(() => {
    if (reviews.length <= 1) return;
    const id = setInterval(() => {
      setDirection(1);
      setCurrent(c => (c + 1) % reviews.length);
    }, 5000);
    return () => clearInterval(id);
  }, [reviews]);

  const featuredReview = reviews[current];
  const leftReview     = reviews[(current + 1) % reviews.length];
  const rightReview    = reviews[(current + 2) % reviews.length];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.2 } }
  };
  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 100 } }
  };

  return (
    <div className="min-h-screen bg-brand-bg font-sans overflow-x-hidden flex flex-col">

      {/* Navbar */}
      <nav className="flex justify-between items-center py-6 px-8 max-w-7xl mx-auto w-full relative z-10 shrink-0">
        <div className="flex items-center gap-12">
          <span className="text-xl font-extrabold text-brand-primary tracking-widest uppercase">Gnosis</span>
          <div className="hidden md:flex gap-8 font-semibold text-brand-muted text-sm">
            <Link to="/auth" className="hover:text-brand-text transition-colors pb-1 border-b-2 border-brand-primary text-brand-text">Home</Link>
            <Link to="/auth" className="hover:text-brand-text transition-colors pb-1 border-b-2 border-transparent hover:border-brand-primary/50">Learning Path</Link>
            <Link to="/auth" className="hover:text-brand-text transition-colors pb-1 border-b-2 border-transparent hover:border-brand-primary/50">Arena</Link>
            <Link to="/auth" className="hover:text-brand-text transition-colors pb-1 border-b-2 border-transparent hover:border-brand-primary/50">Leaderboard</Link>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="hidden sm:flex items-center gap-4 text-brand-primary">
            <Zap className="w-5 h-5 cursor-pointer hover:text-brand-accent transition-colors" />
            <div className="relative">
              <Bell className="w-5 h-5 cursor-pointer hover:text-brand-accent transition-colors" />
              <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-brand-accent rounded-full border-2 border-brand-bg"></div>
            </div>
          </div>
          <Link to="/auth">
            <div className="w-10 h-10 rounded-full bg-brand-primary/20 flex items-center justify-center text-brand-primary cursor-pointer hover:bg-brand-primary/30 transition-colors border-2 border-brand-primary/30">
              <User className="w-5 h-5" />
            </div>
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-8 pt-12 pb-24 relative z-10 shrink-0">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <motion.div initial="hidden" animate="visible" variants={containerVariants} className="flex flex-col items-start">
            <motion.p variants={itemVariants} className="text-brand-text font-medium mb-4 flex items-center gap-2">
              Mastering Subjects and <span className="text-brand-primary">Defeating Friends</span>
            </motion.p>
            <motion.h1 variants={itemVariants} className="text-5xl md:text-6xl font-bold text-brand-text leading-[1.1] mb-6 tracking-tight">
              Experience the next evolution of education.
            </motion.h1>
            <motion.p variants={itemVariants} className="text-brand-muted text-lg mb-10 max-w-lg leading-relaxed">
              GNOSIS combines deep computer science theory with competitive arena battles to make every lesson an epic quest for mastery.
            </motion.p>
            <motion.div variants={itemVariants} className="flex flex-wrap gap-4 mb-12">
              <Link to="/auth" className="px-8 py-3.5 rounded-md font-bold bg-brand-accent text-white hover:bg-[#b55213] transition-colors shadow-sm">
                Start Learning Free
              </Link>
              <Link to="/auth" className="px-8 py-3.5 rounded-md font-bold border-2 border-brand-primary text-brand-primary hover:bg-brand-primary/5 transition-colors">
                Log In
              </Link>
            </motion.div>
            <motion.div variants={itemVariants} className="flex items-center gap-4">
              <div className="flex -space-x-3">
                <div className="w-10 h-10 rounded-full bg-gray-200 border-2 border-brand-bg"></div>
                <div className="w-10 h-10 rounded-full bg-gray-300 border-2 border-brand-bg"></div>
                <div className="w-10 h-10 rounded-full bg-brand-primary/20 border-2 border-brand-bg flex items-center justify-center text-xs font-bold text-brand-primary">+</div>
              </div>
              <p className="text-sm font-medium text-brand-muted">Join 45,000+ commanders worldwide</p>
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="relative flex justify-center lg:justify-end"
          >
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-white rounded-full shadow-sm"></div>
            <img
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuAM7GOawTVMkkB-wztpXBJP5Rfz5TZHlyX8EFeTMLSniouALaSQ_4B2ayHEq78UEPBhhBLMBipPamETUxoB_Si_jkIi_TR--jjA-go_mB4q3yGLWXrJuezshIm52Uh2qdBknGvIPWqKhhbDE6bQnQBXHv2epya8a-Aag5nPRhG-5tfDfe1efu0s0MAYyy50czFBRz6xwOTxF-8_V2e0oiBuUa8KKGTyj8I9b--zMqdmXqCXZjB3Fr1qj5-81RA_vkiC80dvbrSoe3kO"
              alt="AI Robot Mascot" className="relative z-10 w-[350px] object-contain drop-shadow-xl"
            />
            <motion.div
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, type: "spring" }}
              className="absolute top-0 left-0 lg:-left-12 bg-white p-5 rounded-2xl rounded-bl-none shadow-lg z-20 max-w-[250px]"
            >
              <p className="text-sm font-bold italic text-brand-text">
                "Welcome, Commander! Let's master computer science together."
              </p>
            </motion.div>
          </motion.div>
        </div>
      </main>

      {/* Engineered label */}
      <div className="text-center mt-8 mb-16 relative z-10 shrink-0">
        <p className="text-brand-text font-medium text-sm tracking-wide">Engineered for Enlightenment</p>
        <div className="w-16 h-0.5 bg-brand-accent mx-auto mt-2"></div>
      </div>

      {/* Features Section */}
      <section className="max-w-7xl mx-auto px-8 pb-24 relative z-10 shrink-0">
        <motion.div initial="visible" animate="visible" variants={containerVariants} className="grid md:grid-cols-3 gap-6">
          {[
            { icon: <Map className="w-6 h-6 text-brand-primary" />, bg: "bg-brand-primary/10", title: "Gamified Learning Path", desc: "Navigate through a meticulously crafted curriculum designed as a legendary world map. Unlock regions as you master complex concepts." },
            { icon: <Swords className="w-6 h-6 text-brand-accent" />, bg: "bg-brand-accent/10", title: "Real-time Multiplayer Battles", desc: "Test your knowledge against peers in high-stakes arena challenges. Real-time coding duels and logic puzzles await the brave." },
            { icon: <Trophy className="w-6 h-6 text-[#575980]" />, bg: "bg-[#575980]/10", title: "Global Leaderboard", desc: "Ascend the ranks from Apprentice to Guru. Earn exclusive medals and showcase your expertise to a global community of elite learners." },
          ].map((f, i) => (
            <motion.div key={i} variants={itemVariants} className="bg-white p-8 rounded-2xl shadow-sm hover:shadow-md transition-shadow border border-gray-100">
              <div className={`w-12 h-12 rounded-xl ${f.bg} flex items-center justify-center mb-6`}>{f.icon}</div>
              <h3 className="text-lg font-bold text-brand-text mb-3">{f.title}</h3>
              <p className="text-brand-muted text-sm leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Stats Section */}
      <section className="max-w-7xl mx-auto px-8 pb-24 relative z-10 shrink-0">
        <motion.h2 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }}
          className="text-3xl font-bold text-brand-text mb-12 text-center">
          Proven by the Numbers
        </motion.h2>
        <motion.div initial="visible" animate="visible" variants={containerVariants} className="grid md:grid-cols-4 gap-6">
          {[
            { icon: <Zap className="w-6 h-6 text-brand-accent" />, value: "2.5M+", label: "Total XP Earned" },
            { icon: <Trophy className="w-6 h-6 text-brand-primary" />, value: "45K+", label: "Active Learners" },
            { icon: <Star className="w-6 h-6 text-brand-accent" />, value: "250+", label: "Subjects Mastered" },
            { icon: <Map className="w-6 h-6 text-brand-primary" />, value: "10K+", label: "Daily Battles" },
          ].map((s, i) => (
            <motion.div key={i} variants={itemVariants} className="bg-white p-6 md:p-8 rounded-xl shadow-sm hover:shadow-md transition-shadow border border-gray-100 text-center">
              <div className="flex justify-center mb-4">{s.icon}</div>
              <h3 className="text-3xl md:text-4xl font-bold text-brand-primary mb-2">{s.value}</h3>
              <p className="text-brand-muted text-sm">{s.label}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ── Reviews Section ─────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-8 pb-28 relative z-10 shrink-0 w-full">
        <div className="text-center mb-10">
          <motion.h2 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="text-3xl font-bold text-brand-text">
            What Learners Are Saying
          </motion.h2>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
            className="text-brand-muted text-sm mt-2">
            Real reviews from the GNOSIS community
          </motion.p>
        </div>

        {reviews.length === 0 ? (
          /* No reviews yet — show placeholder + CTA */
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl border border-dashed border-gray-200 p-14 text-center">
            <div className="flex justify-center gap-1 mb-4">
              {[1,2,3,4,5].map(s => <Star key={s} className="w-5 h-5 text-gray-200 fill-gray-200" />)}
            </div>
            <p className="text-brand-muted mb-6">Be the first to share your experience with GNOSIS!</p>
            <button onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-brand-accent text-white font-bold text-sm hover:opacity-90 transition-opacity">
              Write a Review <ChevronRight className="w-4 h-4" />
            </button>
          </motion.div>
        ) : (
          <div className="relative">
            {/* ── Featured (top center) card — overlaps the two below ── */}
            <div className="relative z-20 max-w-2xl mx-auto -mb-6">
              <AnimatePresence mode="wait" custom={direction}>
                <motion.div
                  key={current}
                  custom={direction}
                  initial={{ opacity: 0, y: -30 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 30 }}
                  transition={{ duration: 0.45, ease: "easeInOut" }}
                >
                  <ReviewCard review={featuredReview} size="large" />
                </motion.div>
              </AnimatePresence>
            </div>

            {/* ── Bottom two cards (left & right) ── */}
            {reviews.length >= 2 && (
              <div className="grid grid-cols-2 gap-4 pt-2 z-10 relative">
                <AnimatePresence mode="wait">
                  <motion.div key={`left-${current}`}
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    transition={{ duration: 0.4, delay: 0.1 }}>
                    <ReviewCard review={leftReview} size="normal" />
                  </motion.div>
                </AnimatePresence>
                <AnimatePresence mode="wait">
                  <motion.div key={`right-${current}`}
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    transition={{ duration: 0.4, delay: 0.15 }}>
                    <ReviewCard review={rightReview} size="normal" />
                  </motion.div>
                </AnimatePresence>
              </div>
            )}

            {/* Dots indicator */}
            {reviews.length > 1 && (
              <div className="flex justify-center gap-2 mt-6">
                {reviews.map((_, i) => (
                  <button key={i} onClick={() => { setDirection(i > current ? 1 : -1); setCurrent(i); }}
                    className={`w-2 h-2 rounded-full transition-all ${i === current ? "bg-brand-accent w-5" : "bg-gray-300"}`}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Submit review CTA */}
        <div className="text-center mt-10">
          <button onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 text-sm font-semibold text-brand-primary hover:text-brand-accent transition-colors">
            Share your experience <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-8 relative z-10 mt-auto shrink-0 bg-brand-bg">
        <div className="max-w-7xl mx-auto px-8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm font-medium text-brand-muted">
          <div className="flex items-center gap-2 text-brand-text font-bold">
            <span>GNOSIS</span>
          </div>
          <p className="font-normal text-gray-500 text-xs">© 2024 GNOSIS Learning. All rights reserved.</p>
          <div className="flex gap-6">
            <span className="cursor-default text-gray-400">About Us</span>
            <span className="cursor-default text-gray-400">Curriculum</span>
            <span className="cursor-default text-gray-400">Privacy Policy</span>
          </div>
        </div>
      </footer>

      {/* Dots Pattern */}
      <div className="fixed inset-0 z-0 pointer-events-none opacity-30 h-full"
        style={{ backgroundImage: "radial-gradient(#1A1A1A 1px, transparent 1px)", backgroundSize: "30px 30px" }}
      />

      {/* Review Form Modal */}
      <AnimatePresence>
        {showForm && <ReviewFormModal onClose={() => setShowForm(false)} />}
      </AnimatePresence>
    </div>
  );
}
