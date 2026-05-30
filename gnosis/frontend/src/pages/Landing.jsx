import React from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Zap,
  Award,
  BookOpen,
  Swords,
  Trophy,
  Users,
  Star,
  Globe,
  Share2,
} from "lucide-react";

const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gnosis-bg text-gnosis-text font-sans selection:bg-gnosis-primary selection:text-white">
      {/* Navbar */}
      <nav className="flex justify-between items-center px-8 py-4 border-b border-gnosis-border bg-white">
        <div className="flex items-center gap-8">
          <div className="text-gnosis-red font-bold text-xl tracking-wider">
            GNOSIS
          </div>
          <div className="hidden md:flex gap-6 text-sm font-medium">
            <span className="text-gnosis-red border-b-2 border-gnosis-red pb-1 cursor-pointer">
              Home
            </span>
            <span className="text-gnosis-muted hover:text-gnosis-text cursor-pointer transition-colors">
              Learning Path
            </span>
            <span className="text-gnosis-muted hover:text-gnosis-text cursor-pointer transition-colors">
              Arena
            </span>
            <span className="text-gnosis-muted hover:text-gnosis-text cursor-pointer transition-colors">
              Community
            </span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Zap size={20} className="text-gnosis-primary cursor-pointer" />
          <Award size={20} className="text-gnosis-text cursor-pointer" />
          <div className="w-8 h-8 rounded-full bg-gray-300 overflow-hidden cursor-pointer">
            {/* Placeholder for user avatar */}
            <img src="https://i.pravatar.cc/150?img=11" alt="User" />
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-8 py-20 flex flex-col md:flex-row items-center justify-between gap-12 relative">
        <div className="w-full md:w-1/2 relative z-10">
          <h1 className="text-4xl md:text-5xl font-semibold leading-tight mb-6 text-gnosis-text">
            Mastering Subjects and{" "}
            <span className="text-gnosis-red">Defeating Friends</span>
          </h1>
          <p className="text-gnosis-muted mb-8 text-lg">
            Experience the next evolution of education. GNOSIS combines deep
            computer science theory with competitive arena battles to make every
            lesson an epic quest for mastery.
          </p>
          <div className="flex gap-4 mb-8">
            <button
              onClick={() => navigate("/auth")}
              className="bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-600 hover:to-orange-700 text-white px-8 py-3 rounded-md font-semibold transition-all shadow-md"
            >
              Start Learning Free
            </button>
            <button
              onClick={() => navigate("/auth")}
              className="bg-white border-2 border-gnosis-red text-gnosis-red hover:bg-red-50 px-8 py-3 rounded-md font-semibold transition-all"
            >
              Log In
            </button>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex -space-x-3">
              <div className="w-8 h-8 rounded-full bg-gray-200 border-2 border-white"></div>
              <div className="w-8 h-8 rounded-full bg-gray-300 border-2 border-white"></div>
              <div className="w-8 h-8 rounded-full bg-orange-200 border-2 border-white"></div>
            </div>
            <span className="text-sm text-gnosis-muted">
              Join 45,000+ commanders worldwide
            </span>
          </div>
        </div>

        <div className="w-full md:w-1/2 flex justify-center relative">
          <div className="absolute top-0 right-10 bg-white p-4 rounded-xl rounded-bl-none shadow-lg max-w-xs z-20">
            <p className="text-sm italic font-medium">
              "Welcome, Commander! Let's master computer science together."
            </p>
          </div>
          <div className="w-80 h-80 bg-gnosis-bg-alt rounded-full absolute -z-10 blur-xl opacity-50"></div>
          {/* Placeholder for the 3D robot image, using a placeholder styling */}
          <div className="w-80 h-80 rounded-full bg-gnosis-bg-alt flex items-center justify-center relative shadow-inner overflow-hidden">
            {/* Replace with actual robot image if available in assets, else abstract representation */}
            <div className="text-6xl text-gnosis-muted">🤖</div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-7xl mx-auto px-8 py-20 text-center">
        <h2 className="text-lg font-medium mb-12">
          Engineered for Enlightenment
          <div className="h-1 w-16 bg-gnosis-primary mx-auto mt-2"></div>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white p-8 rounded-2xl shadow-sm text-left hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center text-red-500 mb-6">
              <BookOpen size={24} />
            </div>
            <h3 className="text-xl font-semibold mb-3">
              Gamified Learning Path
            </h3>
            <p className="text-gnosis-muted">
              Navigate through a meticulously crafted curriculum designed as a
              legendary world map. Unlock regions as you master complex
              concepts.
            </p>
          </div>
          <div className="bg-white p-8 rounded-2xl shadow-sm text-left hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center text-orange-500 mb-6">
              <Swords size={24} />
            </div>
            <h3 className="text-xl font-semibold mb-3">
              Real-time Multiplayer Battles
            </h3>
            <p className="text-gnosis-muted">
              Test your knowledge against peers in high-stakes arena challenges.
              Real-time coding duels and logic puzzles await the brave.
            </p>
          </div>
          <div className="bg-white p-8 rounded-2xl shadow-sm text-left hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center text-purple-500 mb-6">
              <Trophy size={24} />
            </div>
            <h3 className="text-xl font-semibold mb-3">Global Leaderboard</h3>
            <p className="text-gnosis-muted">
              Ascend the ranks from Apprentice to Guru. Earn exclusive medals
              and showcase your expertise to a global community of elite
              learners.
            </p>
          </div>
        </div>
      </div>

      {/* Community/Challenge Section */}
      <div className="max-w-7xl mx-auto px-8 py-20 grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left Orange Card */}
        <div className="bg-gradient-to-br from-orange-600 to-orange-700 rounded-3xl p-10 text-white relative overflow-hidden flex flex-col justify-between min-h-[400px]">
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white to-transparent mix-blend-overlay"></div>
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 bg-white/20 px-4 py-1.5 rounded-full text-sm font-medium mb-6">
              <Zap size={16} />
              Daily Challenge Live
            </div>
            <h3 className="text-2xl font-bold mb-4">
              The Paradox of Recursion
            </h3>
            <p className="text-orange-100 mb-8 max-w-md">
              Solve today's algorithmic puzzle and earn double XP plus a rare
              'Infinite Mind' badge. 14,203 commanders already solved it.
            </p>
          </div>
          <div className="relative z-10">
            <button className="bg-white text-orange-700 font-semibold px-6 py-3 rounded-md hover:bg-orange-50 transition-colors">
              Enter the Arena
            </button>
          </div>
          <div className="absolute bottom-10 right-10 flex text-white/30">
            <div className="text-8xl font-light">&lt;&gt;</div>
          </div>
        </div>

        {/* Right Cards */}
        <div className="flex flex-col gap-8">
          <div className="bg-[#f0ece3] p-8 rounded-3xl">
            <div className="flex gap-1 text-orange-500 mb-4">
              <Star size={20} fill="currentColor" />
              <Star size={20} fill="currentColor" />
              <Star size={20} fill="currentColor" />
              <Star size={20} fill="currentColor" />
              <Star size={20} fill="currentColor" />
            </div>
            <p className="italic text-gnosis-text mb-6">
              "GNOSIS turned my exam prep from a chore into a lifestyle. I
              actually look forward to outperforming my friends in Data
              Structures battles!"
            </p>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-orange-200 rounded-full"></div>
              <div>
                <div className="font-semibold text-gnosis-text">Arjun K.</div>
                <div className="text-sm text-gnosis-muted">
                  CS Undergraduate, IIT Bombay
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white p-8 rounded-3xl shadow-sm flex items-center gap-6">
            <div className="w-16 h-16 bg-gnosis-bg rounded-2xl flex items-center justify-center text-red-700">
              <Users size={32} />
            </div>
            <div>
              <h4 className="font-semibold text-lg mb-1">Study Guilds</h4>
              <p className="text-gnosis-muted text-sm">
                Join exclusive guilds to collaborate on complex projects and
                share resources.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer CTA */}
      <div className="max-w-4xl mx-auto px-8 py-20 text-center">
        <div className="bg-white p-12 rounded-3xl shadow-sm border border-gnosis-border">
          <h2 className="text-2xl font-semibold mb-4">Ready to Ascend?</h2>
          <p className="text-gnosis-muted mb-8">
            Start your journey today and see why GNOSIS is the preferred
            training ground for the next generation of engineers.
          </p>
          <button
            onClick={() => navigate("/auth")}
            className="bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-600 hover:to-orange-700 text-white px-8 py-3 rounded-md font-semibold transition-all shadow-md"
          >
            Create Your Commander Profile
          </button>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gnosis-bg-alt py-8 px-8 border-t border-gnosis-border">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <div className="font-bold text-lg mb-1">GNOSIS</div>
            <div className="text-sm text-gnosis-muted">
              © 2024 GNOSIS Learning. All rights reserved.
            </div>
          </div>
          <div className="flex gap-6 text-sm font-medium text-gnosis-text">
            <span className="cursor-pointer hover:text-gnosis-primary">
              About Us
            </span>
            <span className="cursor-pointer hover:text-gnosis-primary">
              Curriculum
            </span>
            <span className="cursor-pointer hover:text-gnosis-primary">
              Privacy Policy
            </span>
            <span className="cursor-pointer hover:text-gnosis-primary">
              Terms of Service
            </span>
          </div>
          <div className="flex gap-4 text-gnosis-text">
            <Share2
              size={20}
              className="cursor-pointer hover:text-gnosis-primary"
            />
            <Globe
              size={20}
              className="cursor-pointer hover:text-gnosis-primary"
            />
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
