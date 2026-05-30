import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Flame, Zap } from "lucide-react";
import { motion } from "framer-motion";

export function Navbar() {
  const location = useLocation();

  if (["/"].includes(location.pathname)) {
    return (
      <nav className="fixed top-0 left-0 right-0 z-50 bg-gnosis-bg/80 backdrop-blur-md border-b border-gnosis-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link
            to="/"
            className="text-2xl font-black text-gnosis-text tracking-tighter"
          >
            GNOSIS<span className="text-gnosis-purple">.</span>
          </Link>
          <div className="flex gap-4">
            <Link
              to="/auth"
              className="text-sm font-bold text-gnosis-text hover:text-gnosis-purple-light transition-colors py-2 px-4"
            >
              Log In
            </Link>
            <Link
              to="/auth"
              className="text-sm font-bold bg-gradient-to-r from-gnosis-purple to-gnosis-purple-light hover:shadow-[0_0_15px_rgba(124,58,237,0.5)] text-white py-2 px-6 rounded-full transition-all"
            >
              Start Free
            </Link>
          </div>
        </div>
      </nav>
    );
  }

  if (["/auth"].includes(location.pathname)) {
    return null;
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-gnosis-card/95 backdrop-blur-sm border-b border-gnosis-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Left: Logo */}
        <Link
          to="/home"
          className="text-xl font-black tracking-tighter text-gnosis-text"
        >
          GNOSIS<span className="text-gnosis-purple">.</span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex space-x-8">
          <Link
            to="/home"
            className="text-sm font-bold text-gnosis-muted hover:text-gnosis-text transition-colors"
          >
            Path
          </Link>
          <Link
            to="/battle"
            className="text-sm font-bold text-gnosis-muted hover:text-gnosis-text transition-colors"
          >
            Battle
          </Link>
          <Link
            to="/leaderboard"
            className="text-sm font-bold text-gnosis-muted hover:text-gnosis-text transition-colors"
          >
            Leaderboard
          </Link>
        </div>

        {/* Right: User Stats & Profile */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-3 bg-gnosis-bg px-4 py-1.5 rounded-full border border-gnosis-border shadow-inner">
            <div className="flex items-center space-x-1.5 text-orange-500">
              <Flame size={16} className="fill-orange-500 animate-pulse" />
              <span className="text-sm font-black">15</span>
            </div>
            <div className="w-px h-4 bg-gnosis-border"></div>
            <div className="flex items-center space-x-1.5 text-gnosis-purple-light">
              <Zap size={16} className="fill-gnosis-purple-light" />
              <span className="text-sm font-black">1,250</span>
            </div>
          </div>

          <Link
            to="/profile/me"
            className="w-9 h-9 rounded-full bg-gradient-to-br from-gnosis-purple to-gnosis-purple-light flex items-center justify-center text-white font-black hover:ring-2 hover:ring-white transition-all shadow-lg"
          >
            U
          </Link>
        </div>
      </div>
    </nav>
  );
}
