import React, { useEffect, useState } from "react";
import { NavLink, useNavigate, useParams } from "react-router-dom";
import api from "../lib/api";
import { useAuthStore, useAppStore, useSocketStore } from "../lib/store";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Bell,
  CheckCircle2,
  Flame,
  Lock,
  Play,
  Star,
  Trophy,
  User,
  Zap,
} from "lucide-react";

// Hardcoded skills based on subject
const subjectSkills = {
  "AWS Cloud Mastery": [
    "VPC Architecture",
    "IAM Policies",
    "Cloud Security",
    "EC2 & S3 Basics",
    "Serverless Compute",
  ],
  "CI/CD & GitOps": [
    "Pipelines",
    "Git Branching",
    "ArgoCD",
    "Automated Testing",
    "Deployment Strategies",
  ],
  COA: ["Digital Logic", "Memory Hierarchy", "CPU Architecture", "I/O Organization", "Pipelining"],
  "Cryptography (Ciphers & Numericals)": [
    "Encryption Algorithms",
    "Public Key Infrastructure",
    "Hashing",
    "Digital Signatures",
    "Cryptanalysis",
  ],
  "C Programming": ["Memory Management", "Pointers", "Data Types", "File I/O", "Structs & Unions"],
  "Algorithms (DAA)": ["Big O Analysis", "Dynamic Programming", "Graph Traversal", "Sorting Algorithms", "Greedy Methods"],
  DBMS: ["ER Modeling", "Normalization", "SQL Optimization", "Transactions (ACID)", "Indexing"],
  "Computer Networks (DCN)": ["OSI Model", "TCP/IP", "Routing Protocols", "Subnetting", "Network Security"],
  DevSecOps: ["Security Scanning", "Threat Modeling", "Compliance as Code", "Vulnerability Management", "Secret Management"],
  Microprocessors: ["8085 Architecture", "Assembly Language", "Addressing Modes", "Interrupt Handling", "Interfacing"],
  "Docker & Containers": ["Containerization", "Dockerfiles", "Volume Management", "Networking", "Image Optimization"],
  "Data Structures": ["Arrays & Linked Lists", "Trees & Graphs", "Hash Tables", "Stacks & Queues", "Heaps"],
  "Discrete Mathematics": ["Set Theory", "Combinatorics", "Graph Theory", "Logic & Proofs", "Relations & Functions"],
  "Java Development": ["JVM Architecture", "OOP Principles", "Collections Framework", "Multithreading", "Exception Handling"],
  "Kubernetes (K8s)": ["Pod Lifecycle", "Services & Ingress", "ConfigMaps & Secrets", "Deployments", "Cluster Management"],
  Linux: ["Shell Scripting", "File Permissions", "Process Management", "Text Processing (grep/awk)", "System Administration"],
  "Logical Reasoning": ["Pattern Recognition", "Deductive Logic", "Analytical Thinking", "Problem Solving", "Data Interpretation"],
  "Object Oriented Design (OOAD)": ["SOLID Principles", "Design Patterns", "UML Modeling", "Class Diagrams", "Code Refactoring"],
  "Operating Systems (OS)": ["Process Scheduling", "Memory Management", "File Systems", "Concurrency", "Deadlocks"],
  "Python Programming": ["Data Types", "Decorators", "Generators", "Object-Oriented Python", "Exception Handling"],
  "Quantitative Ability": ["Probability", "Statistics", "Algebra", "Geometry", "Number Theory"],
  "Software Engineering": ["SDLC Models", "Agile Methodologies", "Requirements Engineering", "Software Testing", "Version Control"],
  "System Design": ["Scalability", "Load Balancing", "Microservices", "Database Sharding", "Caching Strategies"],
  "Terraform (IaC)": ["Infrastructure as Code", "State Management", "Modules", "Providers", "Provisioners"],
  TOC: ["Finite Automata", "Regular Expressions", "Context-Free Grammars", "Turing Machines", "Computability Theory"],
};

const getSkillsForSubject = (subjectName) =>
  subjectSkills[subjectName] || ["Fundamentals", "Advanced Concepts", "Problem Solving", "Application", "Theory"];

const motivationalQuotes = [
  "Every expert was once a beginner. Keep pushing forward.",
  "The more you learn, the more you earn - in knowledge and career.",
  "Consistency beats talent. Show up every day.",
  "Master one module at a time. Rome was not built in a day.",
  "Your future self will thank you for starting today.",
];

export default function SubjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, setUser } = useAuthStore();
  const imageMap = useAppStore((state) => state.imageMap);
  const addNotification = useSocketStore((state) => state.addNotification);

  const [subject, setSubject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [retakingLevelId, setRetakingLevelId] = useState(null);
  const [quote] = useState(
    motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)],
  );

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        setLoading(true);

        const token = localStorage.getItem("gnosis_token");
        let currentUser = user;

        // Always refresh from /auth/me so streak_count is current
        try {
          const meRes = await api.get("/auth/me");
          if (meRes?.data) {
            setUser(meRes.data);
            currentUser = meRes.data;
          }
        } catch (meErr) {
          if (!currentUser) console.warn("/auth/me failed:", meErr);
        }

        const contentRes = await api.get(`/content/subjects/${id}`);

        if (!currentUser) {
          const lockedLevels = contentRes.data.levels.map((level) => ({
            ...level,
            status: "locked",
            xp_earned: 0,
          }));
          setSubject({ ...contentRes.data, levels: lockedLevels });
          return;
        }

        const progRes = await api.get(`/progress/${currentUser.id}/subject/${id}`);
        const mergedLevels = contentRes.data.levels.map((level) => {
          const progressLevel = progRes.data.levels.find((pl) => pl.level_id === level.id);
          return {
            ...level,
            status: progressLevel ? progressLevel.status : "locked",
            xp_earned: progressLevel ? progressLevel.xp_earned : 0,
          };
        });

        setSubject({ ...contentRes.data, levels: mergedLevels });
      } catch (err) {
        console.error("Failed to fetch subject details:", err);
        setFetchError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchDetail();
  }, [id, user?.id]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-[#FAF7F2]">
        <div className="w-8 h-8 border-4 border-[#8B2500] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (fetchError || !subject) {
    return (
      <div className="flex flex-col justify-center items-center h-screen bg-[#FAF7F2] gap-4">
        <p className="text-[#8B2500] font-bold text-lg">Failed to load subject.</p>
        <button
          className="px-4 py-2 bg-[#8B2500] text-white rounded-lg font-semibold"
          onClick={() => navigate(-1)}
        >
          Go Back
        </button>
      </div>
    );
  }

  const completedCount = subject.levels.filter((level) => level.status === "complete").length;
  const progressPercent = subject.levels.length > 0 ? (completedCount / subject.levels.length) * 100 : 0;

  const skills = getSkillsForSubject(subject.name);
  const fallbackMascotUrl = imageMap?.[subject.name] || `https://api.dicebear.com/7.x/bottts/svg?seed=${subject.name}`;
  const designRobotUrl =
    "https://lh3.googleusercontent.com/aida-public/AB6AXuAaHE29tLlJ7b6NWaE_4O3ZN7C-ftpoJN6sNkwj1j14hl-zgKH43h78yx9e7hrqZJ5mIvD3EGAJHJq2Egvx3U-JGW5J1c-npx1pL7eqRZqHk6GRCNNOgZ5LWnJotgJYh9JHsq5J_P9aO4Aot-q4IHVVb38bY0g2V0PwZuSZnFISJBe1TnCKmUJd7eq2Dm6Mlp6hw-DJtU-nhPtWu5p1oSwIi7Gy6MtRtA88lpM00p0vM9jQIdoQWgobqVabohKx61bagZfYyvY0AJYD";

  const handleRetakeLevel = async (level) => {
    if (!user) return;

    const shouldRetake = window.confirm(
      `Retake Level ${level.level_number}? This will reset this module and everything after it.`,
    );
    if (!shouldRetake) return;

    try {
      setRetakingLevelId(level.id);
      await api.post("/progress/reset-level", {
        userId: user.id,
        subjectId: subject.id,
        levelId: level.id,
      });
      navigate(`/lesson/${level.id}`);
    } catch (err) {
      console.error("Failed to reset progress:", err);
      const message = err.response?.data?.error || "Could not reset this module right now.";
      addNotification({
        id: `${Date.now()}-${level.id}`,
        type: "system",
        message,
        created_at: new Date().toISOString(),
        read: false,
        source: "local",
      });
    } finally {
      setRetakingLevelId(null);
    }
  };

  const handleReviewLevel = (event, level) => {
    event.stopPropagation();
    navigate(`/lesson/${level.id}/review`, {
      state: {
        levelId: level.id,
        subjectId: subject.id,
        subjectName: subject.name,
        moduleName: level.topic,
        levelNumber: level.level_number,
        reviewOnly: true,
      },
    });
  };

  return (
    <div className="min-h-screen bg-[#FAF7F2]">
      <header className="sticky top-0 z-40 bg-[#FAF7F2]/95 backdrop-blur border-b border-[#E8DFD1]">
        <div className="max-w-7xl mx-auto h-16 px-4 md:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <button
              onClick={() => navigate("/home")}
              className="text-2xl font-extrabold text-[#8B2500] tracking-tight"
            >
              Gnosis
            </button>

            <nav className="hidden md:flex items-center gap-6 text-sm font-bold">
              <NavLink
                to="/home"
                className={({ isActive }) =>
                  isActive
                    ? "text-[#8B2500] border-b-2 border-[#D4641A] pb-1"
                    : "text-[#6b6b6b] hover:text-[#1a1a1a]"
                }
              >
                Learning Path
              </NavLink>
              <NavLink
                to="/battle"
                className={({ isActive }) =>
                  isActive
                    ? "text-[#8B2500] border-b-2 border-[#D4641A] pb-1"
                    : "text-[#6b6b6b] hover:text-[#1a1a1a]"
                }
              >
                Battle Arena
              </NavLink>
              <NavLink
                to="/leaderboard"
                className={({ isActive }) =>
                  isActive
                    ? "text-[#8B2500] border-b-2 border-[#D4641A] pb-1"
                    : "text-[#6b6b6b] hover:text-[#1a1a1a]"
                }
              >
                Leaderboard
              </NavLink>
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate("/notifications")}
              className="w-9 h-9 rounded-full hover:bg-white border border-transparent hover:border-[#E8DFD1] flex items-center justify-center text-[#6b6b6b]"
              aria-label="Notifications"
            >
              <Bell className="w-4 h-4" />
            </button>
            <button
              onClick={() => navigate(`/profile/${user?.id || ""}`)}
              className="w-9 h-9 rounded-full bg-white border border-[#E8DFD1] flex items-center justify-center text-[#8B2500] overflow-hidden"
              aria-label="Open profile"
            >
              {user?.avatar_url ? (
                <img src={user.avatar_url} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <User className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </header>

      <div className="p-4 md:p-8 max-w-7xl mx-auto">
        <button
          onClick={() => navigate("/home")}
          className="flex items-center gap-2 text-[#8a8a8a] hover:text-[#8B2500] transition-colors font-bold mb-5"
        >
          <ArrowLeft className="w-5 h-5" /> Back to Map
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_280px] gap-6 items-start">
          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-5 md:p-7 shadow-sm border border-[#E8DFD1] flex flex-col md:flex-row gap-5 items-start justify-between">
              <div className="flex-1">
                <div className="inline-block px-3 py-1 bg-[#FAF7F2] text-[#8B2500] font-bold text-xs rounded-full mb-3 border border-[#E8DFD1] uppercase tracking-wide">
                  Technical Subject
                </div>
                <h1 className="text-2xl md:text-3xl font-extrabold text-[#1a1a1a] mb-2">{subject.name}</h1>
                <p className="text-[#6b6b6b] text-sm leading-relaxed mb-4 max-w-xl">{subject.description}</p>

                <div className="w-full max-w-md">
                  <div className="flex justify-between mb-1.5">
                    <span className="text-sm font-bold text-[#1a1a1a]">Course Progress</span>
                    <span className="font-bold text-[#8B2500]">{Math.round(progressPercent)}%</span>
                  </div>
                  <div className="w-full h-2.5 bg-[#FAF7F2] rounded-full overflow-hidden border border-[#E8DFD1]">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${progressPercent}%` }}
                      className="h-full bg-gradient-to-r from-[#D4641A] to-[#8B2500]"
                    />
                  </div>
                  <p className="text-xs text-[#8a8a8a] mt-1">
                    {completedCount} of {subject.levels.length} modules complete
                  </p>
                </div>
              </div>

              <div className="w-44 h-44 bg-white rounded-2xl shadow-md border-2 border-[#E8DFD1] overflow-hidden flex-shrink-0">
                <img
                  src={designRobotUrl}
                  alt={`${subject.name} Mascot`}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.src = fallbackMascotUrl;
                  }}
                />
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-[#E8DFD1] shadow-sm overflow-hidden">
              <div className="px-5 pt-5 pb-3">
                <h2 className="text-xl font-extrabold text-[#1a1a1a]">Learning Modules</h2>
              </div>
              <div className="divide-y divide-[#F5EFE8] max-h-[420px] overflow-y-auto">
                {subject.levels.map((level, idx) => {
                  const isLocked = level.status === "locked";
                  const isComplete = level.status === "complete";
                  const isCurrent = !isLocked && !isComplete;

                  return (
                    <motion.div
                      key={level.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.07 }}
                      onClick={() => {
                        if (isLocked) return;
                        if (isComplete) {
                          handleRetakeLevel(level);
                          return;
                        }
                        navigate(`/lesson/${level.id}`);
                      }}
                      className={`flex items-center gap-4 px-5 py-4 transition-all ${
                        isCurrent ? "bg-[#FFF8F0] cursor-pointer hover:bg-[#FFF0E0]" : ""
                      } ${isComplete ? "cursor-pointer hover:bg-[#FAF7F2]" : ""} ${
                        isLocked || retakingLevelId === level.id ? "opacity-55 cursor-not-allowed" : ""
                      }`}
                    >
                      <div
                        className={`w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 ${
                          isComplete ? "bg-[#EAF6EA] border-2 border-[#4CAF50]" : ""
                        } ${isCurrent ? "bg-[#FFF0E0] border-2 border-[#D4641A]" : ""} ${
                          isLocked ? "bg-[#F0EDE8] border-2 border-[#E8DFD1]" : ""
                        }`}
                      >
                        {isComplete && <CheckCircle2 className="w-5 h-5 text-[#4CAF50]" />}
                        {isCurrent && <Play className="w-5 h-5 text-[#D4641A] fill-[#D4641A]" />}
                        {isLocked && <Lock className="w-5 h-5 text-[#c2c2c2]" />}
                      </div>

                      <div className="flex-1 min-w-0">
                        {isCurrent && (
                          <span className="text-[10px] font-bold text-[#D4641A] uppercase tracking-wider">
                            Current Module
                          </span>
                        )}
                        <h3 className={`font-bold text-base truncate ${isLocked ? "text-[#a0a0a0]" : "text-[#1a1a1a]"}`}>
                          Level {idx + 1} - {level.topic}
                        </h3>
                        <p className={`text-xs mt-0.5 ${isLocked ? "text-[#c0c0c0]" : "text-[#6b6b6b]"}`}>
                          {isLocked
                            ? "Complete previous module to unlock"
                            : isComplete
                              ? `${level.xp_reward || 100} XP earned`
                              : `${level.xp_reward || 100} XP reward`}
                        </p>
                      </div>

                      <div className="flex-shrink-0">
                        {isComplete && (
                          <button
                            type="button"
                            onClick={(event) => handleReviewLevel(event, level)}
                            className="px-3 py-1 text-xs font-bold border border-[#E8DFD1] text-[#6b6b6b] rounded-lg hover:bg-[#FAF7F2]"
                          >
                            Review
                          </button>
                        )}
                        {isCurrent && (
                          <span className="px-4 py-1.5 text-sm font-bold bg-gradient-to-r from-[#D4641A] to-[#8B2500] text-white rounded-lg shadow-sm">
                            Continue
                          </span>
                        )}
                        {retakingLevelId === level.id && (
                          <span className="px-3 py-1 text-xs font-bold text-[#6b6b6b] rounded-lg border border-dashed border-[#E8DFD1]">
                            Resetting...
                          </span>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-1 gap-3">
              <div className="flex items-center gap-2 bg-[#FFF4E5] border border-[#F0C090] rounded-xl px-4 py-3">
                <Zap className="w-4 h-4 text-[#D4641A]" />
                <div>
                  <p className="text-xs text-[#8a8a8a]">Total XP</p>
                  <p className="font-bold text-[#8B2500] text-sm">
                    {subject.levels.reduce((acc, level) => acc + (level.xp_earned || 0), 0)} XP
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-[#FAF7F2] border border-[#E8DFD1] rounded-xl px-4 py-3">
                <Trophy className="w-4 h-4 text-[#8B2500]" />
                <div>
                  <p className="text-xs text-[#8a8a8a]">Levels</p>
                  <p className="font-bold text-[#1a1a1a] text-sm">
                    {completedCount}/{subject.levels.length}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-[#FAF7F2] rounded-2xl p-4 border border-[#E8DFD1] text-center">
              <Flame className="w-8 h-8 text-[#D4641A] mx-auto mb-2" />
              <h3 className="text-lg font-extrabold text-[#1a1a1a] mb-0.5">{user?.streak_count || 0} Day Streak</h3>
              <p className="text-[#6b6b6b] text-sm mb-2">Keep the flame alive!</p>
              <div className="flex justify-between items-center gap-1 px-1">
                {["M", "T", "W", "T", "F", "S", "S"].map((day, i) => (
                  <div
                    key={i}
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      i < Math.min(user?.streak_count || 0, 7)
                        ? "bg-[#8B2500] text-white"
                        : "bg-[#E8DFD1] text-[#8a8a8a]"
                    }`}
                  >
                    {day}
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-[#E8DFD1] shadow-sm text-left">
              <h3 className="text-base font-bold text-[#1a1a1a] mb-3">Skills You will Learn</h3>
              <div className="flex flex-wrap gap-2">
                {skills.map((skill, i) => (
                  <span
                    key={i}
                    className="px-3 py-1.5 bg-[#FAF7F2] border border-[#E8DFD1] rounded-full text-xs font-bold text-[#8B2500]"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>

            <div className="bg-[#8B2500] rounded-2xl p-4 shadow-md text-white">
              <Star className="w-5 h-5 text-[#FFF4E5] mb-2" />
              <p className="text-[#f0dac2] text-sm leading-relaxed italic">"{quote}"</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
