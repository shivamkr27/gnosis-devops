import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../lib/store";
import api from "../lib/api";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, Mail, Lock, ArrowRight, HelpCircle } from "lucide-react";

export default function AuthPage() {
  const [view, setView] = useState("login"); // 'login', 'signup', 'forgot-step1', 'forgot-step2'
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    securityQuestion: "",
    securityAnswer: "",
    newPassword: "",
  });
  const [fetchedQuestion, setFetchedQuestion] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const submittingRef = useRef(false);
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);

  const predefinedQuestions = [
    "What is your mother's maiden name?",
    "What was the name of your first pet?",
    "What city were you born in?",
    "What is your favorite book?",
    "What is your secret pin code?",
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Prevent double submission
    if (submittingRef.current || loading) return;
    submittingRef.current = true;
    
    setError("");
    setLoading(true);

    try {
      if (view === "login") {
        const res = await api.post("/auth/login", {
          email: formData.email,
          password: formData.password,
        });
        login(res.data.user, res.data.token);
        try {
  await api.post(`/progress/initialize/${res.data.user.id}`);
} catch(e) {
  console.log("Progress already initialized or error:", e.message);
}
        navigate("/home");
      } else if (view === "signup") {
        await api.post("/auth/register", {
          username: formData.username,
          email: formData.email,
          password: formData.password,
          securityQuestion: formData.securityQuestion,
          securityAnswer: formData.securityAnswer,
        });
        const res = await api.post("/auth/login", {
          email: formData.email,
          password: formData.password,
        });
        login(res.data.user, res.data.token);
        navigate("/home");
      } else if (view === "forgot-step1") {
        const res = await api.post("/auth/forgot-password-step1", {
          email: formData.email,
        });
        setFetchedQuestion(res.data.securityQuestion);
        setView("forgot-step2");
      } else if (view === "forgot-step2") {
        await api.post("/auth/forgot-password-step2", {
          email: formData.email,
          securityAnswer: formData.securityAnswer,
          newPassword: formData.newPassword,
        });
        alert("Password reset successfully! Please log in.");
        setView("login");
        setFormData({ ...formData, password: "", securityAnswer: "", newPassword: "" });
      }
    } catch (err) {
      setError(
        err.response?.data?.error || "An error occurred. Please try again."
      );
      submittingRef.current = false;
    } finally {
      setLoading(false);
    }
  };

  const MascotSection = () => (
    <div className="hidden lg:flex w-[40%] flex-col justify-center items-center bg-transparent p-12 text-[#5B1D00]">
      <div className="flex items-center gap-3 mb-8 w-full max-w-[300px]">
        <div className="bg-[#8B2500] p-2.5 rounded-xl text-white">
          <BookOpen size={32} strokeWidth={2.5} />
        </div>
        <h1 className="text-5xl font-extrabold text-[#8B2500]">Gnosis</h1>
      </div>

      <div className="relative mb-6">
        <div className="bg-white px-6 py-5 rounded-2xl rounded-bl-none shadow-sm border border-[#E8DFD1] max-w-[320px] relative z-10">
          <p className="text-lg font-bold text-[#1a1a1a] leading-tight">
            Namaste! I am your guide to ancient wisdom. Let's continue your quest for knowledge.
          </p>
          <div className="absolute -bottom-4 left-0 w-0 h-0 border-t-[16px] border-t-white border-r-[16px] border-r-transparent"></div>
          {/* Outer shadow/border matching tail */}
          <div className="absolute -bottom-[17px] left-[-1px] w-0 h-0 border-t-[17px] border-t-[#E8DFD1] border-r-[17px] border-r-transparent -z-10"></div>
        </div>
      </div>

      <div className="w-[300px] h-[300px] bg-black rounded-xl overflow-hidden shadow-2xl mt-4">
        <img
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuBxU3mYfGuaq9yMjCHXFKy64CvBrhtVAh4aCrF6euu8Zr8lmPAzBMIyA44F43x1Jtvvj-vTBMJ3bE_X-l64EpLOe9SzE17rjsMnsn0LAMIhR04R4JGVMEVeEpaTO7uURPOmLnJSSyeiPNdX4J7qF_q1jnoTJPLMIPc1qkH6mnQ81Ar5s06BmSJk4gf3nd5MhGdovFvIEyl718AQCybQ4thtUeIej9Tg61_sXX6srG_J_sZs6IlBsMD0z7tW6GXd-6M_zqPRxHedJalA"
          alt="Gnosis Robot Mascot"
          className="w-full h-full object-cover"
        />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#FAF7F2] flex justify-center items-center p-4 md:p-8 font-sans overflow-hidden relative">
      {/* Decorative gradient blur in background */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#D4641A] rounded-full blur-[150px] opacity-10 pointer-events-none"></div>

      <div className="max-w-5xl w-full flex bg-transparent">
        <MascotSection />

        <div className="w-full lg:w-[60%] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-[440px] bg-white rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-[#E8DFD1] overflow-hidden p-8 relative"
          >
            {/* Background decorative diamond */}
            <div className="absolute top-0 right-0 w-32 h-32 border-[16px] border-[#FAF7F2] rotate-45 translate-x-12 -translate-y-12 opacity-80 pointer-events-none"></div>

            {(view === "login" || view === "signup") && (
              <div className="flex bg-[#FAF7F2] rounded-xl p-1 mb-10 relative z-10 border border-[#E8DFD1]">
                <div
                  className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-white rounded-lg shadow-sm transition-all duration-300 ${view === "login" ? "left-1" : "left-[calc(50%+2px)]"}`}
                />
                <button
                  className={`flex-1 py-2.5 text-sm font-bold relative z-10 transition-colors ${view === "login" ? "text-[#8B2500]" : "text-[#8a8a8a]"}`}
                  onClick={() => {
                    setView("login");
                    setError("");
                  }}
                >
                  Log In
                </button>
                <button
                  className={`flex-1 py-2.5 text-sm font-bold relative z-10 transition-colors ${view === "signup" ? "text-[#8B2500]" : "text-[#8a8a8a]"}`}
                  onClick={() => {
                    setView("signup");
                    setError("");
                  }}
                >
                  Sign Up
                </button>
              </div>
            )}

            <div className="relative z-10">
              <AnimatePresence mode="wait">
                <motion.div
                  key={view}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  {view === "login" && (
                    <div className="mb-8">
                      <h2 className="text-3xl font-extrabold text-[#1a1a1a] mb-2">Welcome Back</h2>
                      <p className="text-[#6b6b6b] text-base">Access your learning path and battle arena.</p>
                    </div>
                  )}
                  {view === "signup" && (
                    <div className="mb-8">
                      <h2 className="text-3xl font-extrabold text-[#1a1a1a] mb-2">Create Account</h2>
                      <p className="text-[#6b6b6b] text-base">Begin your journey to mastery.</p>
                    </div>
                  )}
                  {view === "forgot-step1" && (
                    <div className="mb-8">
                      <h2 className="text-3xl font-extrabold text-[#1a1a1a] mb-2">Recover Access</h2>
                      <p className="text-[#6b6b6b] text-base">Enter your email to retrieve your security question.</p>
                    </div>
                  )}
                  {view === "forgot-step2" && (
                    <div className="mb-8">
                      <h2 className="text-3xl font-extrabold text-[#1a1a1a] mb-2">Security Check</h2>
                      <p className="text-[#6b6b6b] text-base">Answer your security question to reset your password.</p>
                    </div>
                  )}

                  {error && (
                    <div className="bg-[#FFF4F2] border border-[#FFD2CC] text-[#D83A27] p-3.5 rounded-xl text-sm font-bold mb-6 flex items-center gap-2">
                      <HelpCircle size={18} className="shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-5">
                    {/* SIGNUP FIELDS */}
                    {view === "signup" && (
                      <div>
                        <label className="block text-sm font-bold text-[#1a1a1a] mb-2">
                          Username
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            required
                            value={formData.username}
                            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                            className="w-full pl-4 pr-4 py-3.5 bg-[#FAF7F2] border border-[#E8DFD1] rounded-xl focus:outline-none focus:border-[#D4641A] focus:bg-white transition-colors text-[#1a1a1a] font-medium"
                            placeholder="CodeNinja"
                          />
                        </div>
                      </div>
                    )}

                    {/* EMAIL FIELD (Used in Login, Signup, Forgot1) */}
                    {(view === "login" || view === "signup" || view === "forgot-step1") && (
                      <div>
                        <label className="block text-sm font-bold text-[#1a1a1a] mb-2">
                          Email Address
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#8a8a8a]">
                            <Mail size={20} />
                          </div>
                          <input
                            type="email"
                            required
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            className="w-full pl-11 pr-4 py-3.5 bg-[#FAF7F2] border border-[#E8DFD1] rounded-xl focus:outline-none focus:border-[#D4641A] focus:bg-white transition-colors text-[#1a1a1a] font-medium placeholder:font-normal"
                            placeholder="arjun@sage.edu"
                          />
                        </div>
                      </div>
                    )}

                    {/* SECURITY QUESTION SELECTION (Signup) */}
                    {view === "signup" && (
                      <div>
                        <label className="block text-sm font-bold text-[#1a1a1a] mb-2">
                          Security Question (For Recovery)
                        </label>
                        <div className="relative">
                          <select
                            required
                            value={formData.securityQuestion}
                            onChange={(e) => setFormData({ ...formData, securityQuestion: e.target.value })}
                            className="w-full px-4 py-3.5 bg-[#FAF7F2] border border-[#E8DFD1] rounded-xl focus:outline-none focus:border-[#D4641A] focus:bg-white transition-colors text-[#1a1a1a] font-medium appearance-none"
                          >
                            <option value="" disabled>Select a question...</option>
                            {predefinedQuestions.map((q, i) => (
                              <option key={i} value={q}>{q}</option>
                            ))}
                          </select>
                          <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-[#8a8a8a]">
                            <svg width="12" height="8" viewBox="0 0 12 8" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1 1.5L6 6.5L11 1.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* SECURITY ANSWER INPUT (Signup, Forgot2) */}
                    {(view === "signup" || view === "forgot-step2") && (
                      <div>
                        <label className="block text-sm font-bold text-[#1a1a1a] mb-2">
                          {view === "signup" ? "Security Answer" : `Q: ${fetchedQuestion}`}
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.securityAnswer}
                          onChange={(e) => setFormData({ ...formData, securityAnswer: e.target.value })}
                          className="w-full px-4 py-3.5 bg-[#FAF7F2] border border-[#E8DFD1] rounded-xl focus:outline-none focus:border-[#D4641A] focus:bg-white transition-colors text-[#1a1a1a] font-medium"
                          placeholder="Your answer..."
                        />
                      </div>
                    )}

                    {/* NEW PASSWORD FIELD (Forgot2) */}
                    {view === "forgot-step2" && (
                      <div>
                        <label className="block text-sm font-bold text-[#1a1a1a] mb-2">
                          New Password
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#8a8a8a]">
                            <Lock size={20} />
                          </div>
                          <input
                            type="password"
                            required
                            value={formData.newPassword}
                            onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                            className="w-full pl-11 pr-4 py-3.5 bg-[#FAF7F2] border border-[#E8DFD1] rounded-xl focus:outline-none focus:border-[#D4641A] focus:bg-white transition-colors text-[#1a1a1a] font-medium tracking-widest placeholder:tracking-normal placeholder:font-normal"
                            placeholder="••••••••"
                          />
                        </div>
                      </div>
                    )}

                    {/* PASSWORD FIELD (Login, Signup) */}
                    {(view === "login" || view === "signup") && (
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <label className="block text-sm font-bold text-[#1a1a1a]">
                            Password
                          </label>
                          {view === "login" && (
                            <button
                              type="button"
                              onClick={() => {
                                setView("forgot-step1");
                                setError("");
                              }}
                              className="text-sm font-bold text-[#8B2500] hover:text-[#D4641A] transition-colors"
                            >
                              Forgot?
                            </button>
                          )}
                        </div>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#8a8a8a]">
                            <Lock size={20} />
                          </div>
                          <input
                            type="password"
                            required
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            className="w-full pl-11 pr-4 py-3.5 bg-[#FAF7F2] border border-[#E8DFD1] rounded-xl focus:outline-none focus:border-[#D4641A] focus:bg-white transition-colors text-[#1a1a1a] font-medium tracking-widest placeholder:tracking-normal placeholder:font-normal"
                            placeholder="••••••••"
                          />
                        </div>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-4 bg-[#8B2500] text-white rounded-xl font-bold text-lg hover:bg-[#6A1C00] transition-all hover:shadow-lg disabled:opacity-70 disabled:hover:shadow-none flex justify-center items-center h-[56px] mt-2 group"
                    >
                      {loading ? (
                        <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <div className="flex items-center gap-2">
                          {view === "login" ? "Continue to Gnosis" :
                           view === "signup" ? "Create Account" :
                           view === "forgot-step1" ? "Fetch Security Question" :
                           "Reset Password"}
                          <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                        </div>
                      )}
                    </button>
                  </form>

                  {/* Back links for forgot flows */}
                  {(view === "forgot-step1" || view === "forgot-step2") && (
                    <div className="mt-6 text-center">
                      <button
                        onClick={() => {
                          setView("login");
                          setError("");
                        }}
                        className="text-sm font-bold text-[#6b6b6b] hover:text-[#1a1a1a] transition-colors"
                      >
                        Back to Log In
                      </button>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Terms Footer */}
            <div className="mt-8 text-center relative z-10">
              <p className="text-sm font-medium text-[#6b6b6b]">
                By continuing, you agree to our <a href="#" className="text-[#8B2500] font-bold underline decoration-[#8B2500]/30 underline-offset-2 hover:decoration-[#8B2500]">Terms of Service</a>
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
