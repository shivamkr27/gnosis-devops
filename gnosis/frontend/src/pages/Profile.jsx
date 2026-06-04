import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import api from "../lib/api";
import { useAuthStore, useAppStore } from "../lib/store";
import { 
    Trophy, Flame, BookOpen, Star, LogOut, Settings, 
    ChevronRight, Zap, Target, Award, Swords, MessageSquare 
} from "lucide-react";
import { motion } from "framer-motion";

export default function Profile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { imageMap } = useAppStore();
  const [profile, setProfile] = useState(null);
  const [progress, setProgress] = useState([]);
  const [globalRank, setGlobalRank] = useState(null);
  const [nearestCompetitor, setNearestCompetitor] = useState(null);
  const [showAllMomentum, setShowAllMomentum] = useState(false);
  const [totalSubjects, setTotalSubjects] = useState(0);
  const [loading, setLoading] = useState(true);
  const [eventXp, setEventXp] = useState(0);

  useEffect(() => {
    const fetchProfile = async () => {
      const targetId = id || user?.id;
      if (!targetId) return;
      
      try {
        const [progRes, contentRes, rankRes] = await Promise.all([
          api.get(`/progress/${targetId}`),
          api.get("/content/subjects"),
          api.get(`/xp/leaderboard/global?currentUserId=${targetId}`),
        ]);

        // Event XP — separate call so profile doesn't crash if xp-service not restarted yet
        try {
          const eventXpRes = await api.get(`/xp/user/${targetId}/event-total`);
          setEventXp(eventXpRes.data.eventXp || 0);
        } catch {
          setEventXp(0);
        }

        const merged = contentRes.data
          .map((cs) => {
            const userProg = progRes.data.subjects?.find(
              (s) => s.subject_id === cs.id,
            );
            const levels = userProg ? userProg.levels : [];
            const completedCount = levels.filter((l) => l.status === "complete").length;
            const progressPercent = (completedCount / 4) * 100; // Assume 4 levels per subject
            
            return {
              ...cs,
              completedCount,
              progressPercent,
              lastAccessed: userProg?.last_accessed
            };
          })
          .filter((s) => s.completedCount > 0)
          .sort((a, b) => new Date(b.lastAccessed) - new Date(a.lastAccessed));

        const leaderboard = rankRes.data.leaderboard || [];
        const currentIndex = leaderboard.findIndex(l => l.userId === targetId);
        if (currentIndex > 0) {
          setNearestCompetitor(leaderboard[currentIndex - 1]);
        }

        setProfile(id === user?.id || !id ? user : { 
          ...user, 
          username: (leaderboard.find(l => l.userId === id)?.username || "User"),
          total_xp: leaderboard.find(l => l.userId === id)?.totalXp || 0
        });
        setProgress(merged);
        setTotalSubjects(contentRes.data.length);
        setGlobalRank(rankRes.data.currentUserRank || null);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [id, user]);

  if (loading || !profile)
    return (
      <Layout>
        <div className="flex justify-center items-center h-[80vh]">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-[#A34714] border-t-transparent rounded-full animate-spin"></div>
            <p className="text-[#A34714] font-black animate-pulse uppercase tracking-widest">Opening Scroll...</p>
          </div>
        </div>
      </Layout>
    );

  const stats = [
    { 
      label: "Total XP", 
      value: profile.total_xp?.toLocaleString() || "0", 
      icon: <Zap className="text-yellow-500" />, 
      sub: globalRank < 10 ? "Server Legend" : "Rising Star", 
      color: "text-[#D57B1E]" 
    },
    { label: "Streak", value: `${profile.streak_count || 0} Days`, icon: <Flame className="text-[#FF5252]" />, sub: "Keep it up!", color: "text-[#FF5252]" },
    { label: "Subjects", value: String(progress.length).padStart(2, '0'), icon: <BookOpen className="text-blue-500" />, sub: "Knowledge Base", color: "text-blue-600" },
    { label: "Global Rank", value: globalRank ? `#${globalRank}` : "—", icon: <Trophy className="text-[#D57B1E]" />, sub: "World Standing", color: "text-[#D57B1E]" },
    { label: "Arena XP", value: eventXp.toLocaleString(), icon: <Swords className="text-purple-500" />, sub: "Group Quiz Glory", color: "text-purple-600" },
  ];

  const userLevel = Math.floor((profile.total_xp || 0) / 1000) + 1;
  const rankCategory = (rank) => {
    if (rank <= 1) return "Grandmaster";
    if (rank <= 10) return "Master";
    if (rank <= 50) return "Expert";
    return "Apprentice";
  };

  return (
    <Layout>
      <div className="p-4 md:p-8 max-w-7xl mx-auto pb-24 min-h-screen">
        {/* Header Navigation */}
        <div className="flex items-center justify-between mb-8">
            <h1 className="text-2xl font-black text-[#2F2C28] capitalize">My Profile</h1>
            {(!id || id === user?.id) && (
              <button
                onClick={() => { logout(); navigate("/"); }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-red-500 border border-red-100 hover:bg-red-50 transition-colors"
              >
                <LogOut size={16} /> Logout
              </button>
            )}
        </div>

        {/* Main Content Area */}
        <div className="space-y-8">
            {/* Hero Profile Card */}
            <div className="grid grid-cols-1 md:grid-cols-[1fr_360px] gap-6 items-start">
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-[2.5rem] p-8 md:p-10 shadow-sm border border-[#E6D8C4] flex flex-col md:flex-row items-center gap-8 relative overflow-hidden h-full"
                >
                    <div className="relative group">
                        <div className="w-32 h-32 rounded-[2.5rem] overflow-hidden border-4 border-white shadow-xl rotate-3 transform group-hover:rotate-0 transition-transform">
                            <img src={imageMap?.avatars?.[profile.id] || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.username}`} alt="" className="w-full h-full object-cover" />
                        </div>
                        <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-[#A34714] rounded-2xl flex items-center justify-center text-white border-4 border-white shadow-lg">
                            <Settings size={18} className="cursor-pointer" />
                        </div>
                    </div>

                    <div className="flex-1 text-center md:text-left">
                        <h2 className="text-3xl font-black text-[#2F2C28] mb-1">{profile.username}</h2>
                        <p className="text-[#6E675F] font-bold text-sm mb-6 max-w-sm italic">
                          "Success is the sum of small efforts, repeated day in and day out. Keep going, {profile.username.split('_')[0]}!"
                        </p>
                        <div className="flex flex-wrap justify-center md:justify-start gap-3">
                            <span className="px-4 py-1.5 bg-[#FFF4E5] text-[#D57B1E] text-xs font-black rounded-full border border-[#F0C090]">
                                Level {userLevel} {rankCategory(globalRank)}
                            </span>
                            <span className="px-4 py-1.5 bg-[#F0FDF4] text-green-700 text-xs font-black rounded-full border border-green-200">
                                {globalRank ? `Ranked #${globalRank}` : "Unranked"}
                            </span>
                        </div>
                    </div>
                </motion.div>

                {/* Tutor Message Card */}
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-[#FAF7F2] rounded-[2.5rem] p-6 border border-[#E6D8C4] relative shadow-sm flex items-center"
                >
                    <div className="flex items-start gap-4">
                        <div className="w-14 h-14 shrink-0 rounded-2xl bg-white p-2 border border-[#E6D8C4] shadow-sm flex items-center justify-center">
                            <img src={imageMap?.tutor_avatar || "https://api.dicebear.com/7.x/bottts/svg?seed=Gnosis"} alt="Tutor" className="w-full h-full object-contain" />
                        </div>
                        <div>
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-[#A34714]">Tutor Gnosis says:</h4>
                            <p className="text-xs font-bold text-[#2F2C28] leading-tight italic mt-1.5">
                                {nearestCompetitor ? (
                                  <>You're only <span className="text-[#D57B1E] font-black">{(nearestCompetitor.totalXp - profile.total_xp) || 50} XP</span> behind <span className="font-black">@{nearestCompetitor.username}</span>! Complete more modules to overtake them.</>
                                ) : (
                                  <>You're at the top! Complete more modules to maintain your lead and stay legendary.</>
                                )}
                            </p>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Statistics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {stats.map((stat, idx) => (
                    <motion.div
                        key={stat.label}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.2 + (idx * 0.05) }}
                        className="bg-white rounded-3xl p-6 border border-[#E6D8C4] shadow-sm hover:shadow-md transition-shadow group overflow-hidden relative"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-10 h-10 rounded-2xl bg-[#FAF7F2] flex items-center justify-center group-hover:bg-[#FFF4E5] transition-colors">{stat.icon}</div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-[#6E675F] group-hover:text-[#A34714] transition-colors">{stat.label}</span>
                        </div>
                        <div className="space-y-1">
                            <h3 className={`text-3xl font-black ${stat.color} tracking-tight`}>{stat.value}</h3>
                            <p className="text-[10px] font-bold text-[#A34714]/60 uppercase tracking-wider">{stat.sub}</p>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Learning Momentum */}
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-[2.5rem] p-8 border border-[#E6D8C4] shadow-sm max-w-2xl"
            >
                <div className="flex items-center justify-between mb-8">
                    <h3 className="text-xl font-black text-[#2F2C28]">Learning Momentum</h3>
                    <button 
                      onClick={() => setShowAllMomentum(!showAllMomentum)}
                      className="text-[#A34714] text-xs font-black uppercase tracking-widest flex items-center gap-1 hover:gap-2 transition-all"
                    >
                        {showAllMomentum ? "Show Less" : "View Details"} <ChevronRight size={14} className={showAllMomentum ? "rotate-90" : ""} />
                    </button>
                </div>
                
                <div className="space-y-6">
                    {progress.length > 0 ? (showAllMomentum ? progress : progress.slice(0, 3)).map(sub => (
                        <div key={sub.id} className="space-y-2">
                            <div className="flex justify-between text-sm font-black">
                                <span className="text-[#2F2C28]">{sub.name}</span>
                                <span className="text-[#A34714]">{Math.round(sub.progressPercent)}%</span>
                            </div>
                            <div className="h-2.5 bg-[#FAF7F2] rounded-full overflow-hidden border border-[#E6D8C4]/50">
                                <motion.div 
                                    initial={{ width: 0 }}
                                    animate={{ width: `${sub.progressPercent}%` }}
                                    className="h-full bg-gradient-to-r from-[#D57B1E] to-[#A34714] rounded-full shadow-[0_0_8px_rgba(213,123,30,0.3)]"
                                />
                            </div>
                        </div>
                    )) : (
                        <p className="text-[#6E675F] font-bold text-center py-10 italic">Start a lesson to see your momentum grow!</p>
                    )}
                </div>
            </motion.div>
        </div>
      </div>
    </Layout>
  );
}

