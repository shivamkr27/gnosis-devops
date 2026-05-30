import React from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuthStore } from "../lib/store";
import { motion } from "framer-motion";
import { Zap, Bell, User, Map, Swords, Trophy, Star } from "lucide-react";

export default function LandingPage() {
  const { token } = useAuthStore();

  if (token) {
    return <Navigate to="/home" />;
  }

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.2 }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { type: "spring", stiffness: 100 }
    }
  };

  return (
    <div className="min-h-screen bg-brand-bg font-sans overflow-x-hidden flex flex-col">
      {/* Navbar */}
      <nav className="flex justify-between items-center py-6 px-8 max-w-7xl mx-auto w-full relative z-10 shrink-0">
        <div className="flex items-center gap-12">
          <span className="text-xl font-extrabold text-brand-primary tracking-widest uppercase">
            Gnosis
          </span>
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
             <div className="w-10 h-10 rounded-full bg-brand-primary/20 flex items-center justify-center text-brand-primary cursor-pointer hover:bg-brand-primary/30 transition-colors border-2 border-brand-primary/30 overflow-hidden">
               <User className="w-5 h-5" />
             </div>
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-8 pt-12 pb-24 relative z-10 shrink-0">
        <div className="grid lg:grid-cols-2 gap-16 items-center">

          {/* Left Column - Copy */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={containerVariants}
            className="flex flex-col items-start"
          >
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
              <Link
                to="/auth"
                className="px-8 py-3.5 rounded-md font-bold bg-brand-accent text-white hover:bg-[#b55213] transition-colors shadow-sm"
              >
                Start Learning Free
              </Link>
              <Link
                to="/auth"
                className="px-8 py-3.5 rounded-md font-bold border-2 border-brand-primary text-brand-primary hover:bg-brand-primary/5 transition-colors"
              >
                Log In
              </Link>
            </motion.div>

            <motion.div variants={itemVariants} className="flex items-center gap-4">
              <div className="flex -space-x-3">
                <div className="w-10 h-10 rounded-full bg-gray-200 border-2 border-brand-bg"></div>
                <div className="w-10 h-10 rounded-full bg-gray-300 border-2 border-brand-bg"></div>
                <div className="w-10 h-10 rounded-full bg-brand-primary/20 border-2 border-brand-bg flex items-center justify-center text-xs font-bold text-brand-primary">+</div>
              </div>
              <p className="text-sm font-medium text-brand-muted">
                Join 45,000+ commanders worldwide
              </p>
            </motion.div>
          </motion.div>

          {/* Right Column - Illustration */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="relative flex justify-center lg:justify-end"
          >
             {/* Circular Background */}
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-white rounded-full shadow-sm"></div>

             {/* Mascot Image */}
             <img
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuAM7GOawTVMkkB-wztpXBJP5Rfz5TZHlyX8EFeTMLSniouALaSQ_4B2ayHEq78UEPBhhBLMBipPamETUxoB_Si_jkIi_TR--jjA-go_mB4q3yGLWXrJuezshIm52Uh2qdBknGvIPWqKhhbDE6bQnQBXHv2epya8a-Aag5nPRhG-5tfDfe1efu0s0MAYyy50czFBRz6xwOTxF-8_V2e0oiBuUa8KKGTyj8I9b--zMqdmXqCXZjB3Fr1qj5-81RA_vkiC80dvbrSoe3kO"
                alt="AI Robot Mascot"
                className="relative z-10 w-[350px] object-contain drop-shadow-xl"
             />

             {/* Speech Bubble */}
             <motion.div
               initial={{ opacity: 0, y: 10 }}
               animate={{ opacity: 1, y: 0 }}
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

      {/* Engineered for Enlightenment Label */}
      <div className="text-center mt-8 mb-16 relative z-10 shrink-0">
        <p className="text-brand-text font-medium text-sm tracking-wide">
          Engineered for Enlightenment
        </p>
        <div className="w-16 h-0.5 bg-brand-accent mx-auto mt-2"></div>
      </div>

      {/* Features Section */}
      <section className="max-w-7xl mx-auto px-8 pb-24 relative z-10 shrink-0">
        <motion.div
          initial="visible"
          animate="visible"
          variants={containerVariants}
          className="grid md:grid-cols-3 gap-6"
        >
          {[
            {
              icon: <Map className="w-6 h-6 text-brand-primary" />,
              bg: "bg-brand-primary/10",
              title: "Gamified Learning Path",
              desc: "Navigate through a meticulously crafted curriculum designed as a legendary world map. Unlock regions as you master complex concepts.",
            },
            {
              icon: <Swords className="w-6 h-6 text-brand-accent" />,
              bg: "bg-brand-accent/10",
              title: "Real-time Multiplayer Battles",
              desc: "Test your knowledge against peers in high-stakes arena challenges. Real-time coding duels and logic puzzles await the brave.",
            },
            {
              icon: <Trophy className="w-6 h-6 text-[#575980]" />,
              bg: "bg-[#575980]/10",
              title: "Global Leaderboard",
              desc: "Ascend the ranks from Apprentice to Guru. Earn exclusive medals and showcase your expertise to a global community of elite learners.",
            },
          ].map((feature, idx) => (
            <motion.div
              key={idx}
              variants={itemVariants}
              className="bg-white p-8 rounded-2xl shadow-sm hover:shadow-md transition-shadow border border-gray-100"
            >
              <div className={`w-12 h-12 rounded-xl ${feature.bg} flex items-center justify-center mb-6`}>
                {feature.icon}
              </div>
              <h3 className="text-lg font-bold text-brand-text mb-3">
                {feature.title}
              </h3>
              <p className="text-brand-muted text-sm leading-relaxed">
                {feature.desc}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Stats Section */}
      <section className="max-w-7xl mx-auto px-8 pb-24 relative z-10 shrink-0">
        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="text-3xl font-bold text-brand-text mb-12 text-center"
        >
          Proven by the Numbers
        </motion.h2>
        <motion.div
          initial="visible"
          animate="visible"
          variants={containerVariants}
          className="grid md:grid-cols-4 gap-6"
        >
          {[
            {
              icon: <Zap className="w-6 h-6 text-brand-accent" />,
              value: "2.5M+",
              label: "Total XP Earned"
            },
            {
              icon: <Trophy className="w-6 h-6 text-brand-primary" />,
              value: "45K+",
              label: "Active Learners"
            },
            {
              icon: <Star className="w-6 h-6 text-brand-accent" />,
              value: "250+",
              label: "Subjects Mastered"
            },
            {
              icon: <Map className="w-6 h-6 text-brand-primary" />,
              value: "10K+",
              label: "Daily Battles"
            },
          ].map((stat, idx) => (
            <motion.div
              key={idx}
              variants={itemVariants}
              className="bg-white p-6 md:p-8 rounded-xl shadow-sm hover:shadow-md transition-shadow border border-gray-100 text-center"
            >
              <div className="flex justify-center mb-4">
                {stat.icon}
              </div>
              <h3 className="text-3xl md:text-4xl font-bold text-brand-primary mb-2">
                {stat.value}
              </h3>
              <p className="text-brand-muted text-sm">
                {stat.label}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Reviews/Testimonials Section */}
      <section className="max-w-4xl mx-auto px-8 pb-24 text-center relative z-10 shrink-0">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="bg-white p-10 md:p-14 rounded-[2rem] shadow-sm border border-gray-100"
        >
           <div className="flex justify-center gap-1 mb-6">
             {[1,2,3,4,5].map(star => (
               <Star key={star} className="w-6 h-6 text-brand-accent fill-brand-accent" />
             ))}
           </div>
           <h2 className="text-2xl md:text-3xl font-bold text-brand-text mb-6 italic leading-relaxed">
             "GNOSIS turned my exam prep from a chore into a lifestyle. I actually look forward to outperforming my friends in Data Structures battles!"
           </h2>
           <div className="flex items-center justify-center gap-4">
             <div className="w-12 h-12 bg-brand-accent/20 rounded-full flex items-center justify-center text-brand-accent font-bold text-xl">
               A
             </div>
             <div className="text-left">
               <p className="font-bold text-brand-text">Arjun K.</p>
               <p className="text-sm text-brand-muted">CS Undergraduate, IIT Bombay</p>
             </div>
           </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-8 relative z-10 mt-auto shrink-0 bg-brand-bg">
        <div className="max-w-7xl mx-auto px-8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm font-medium text-brand-muted">
          <div className="flex items-center gap-2 text-brand-text font-bold">
             <span>GNOSIS</span>
          </div>
          <p className="font-normal text-gray-500 text-xs">
            © 2024 GNOSIS Learning. All rights reserved.
          </p>
          <div className="flex gap-6">
            <Link to="#" className="hover:text-brand-text transition-colors">About Us</Link>
            <Link to="#" className="hover:text-brand-text transition-colors">Curriculum</Link>
            <Link to="#" className="hover:text-brand-text transition-colors">Privacy Policy</Link>
          </div>
        </div>
      </footer>

      {/* Background Dots Pattern Overlay */}
      <div
        className="fixed inset-0 z-0 pointer-events-none opacity-30 h-full"
        style={{
          backgroundImage: 'radial-gradient(#1A1A1A 1px, transparent 1px)',
          backgroundSize: '30px 30px'
        }}
      ></div>
    </div>
  );
}
