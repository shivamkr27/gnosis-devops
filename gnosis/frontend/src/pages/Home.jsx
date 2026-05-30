import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import api from "../lib/api";
import { useAuthStore } from "../lib/store";
import { motion } from "framer-motion";
import { Trophy, Bell, Lock, Check, BookOpen, ChevronRight } from "lucide-react";

export default function Home() {
  const { user } = useAuthStore();
  const [subjects, setSubjects] = useState([]);
  const [totalXp, setTotalXp] = useState(user?.total_xp || 0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        const [progRes, contentRes, xpRes] = await Promise.all([
          api.get(`/progress/${user.id}`),
          api.get("/content/subjects"),
          api.get(`/xp/user/${user.id}/total`),
        ]);

        const contentSubjects = contentRes.data;
        const userProgress = progRes.data.subjects || [];

        const merged = contentSubjects.map((cs) => {
          const uProg = userProgress.find((s) => s.subject_id === cs.id);
          const completedLevels = uProg ? uProg.levels.filter((l) => l.status === "complete").length : 0;
          const totalLevels = 4;
          const progressPercentage = (completedLevels / totalLevels) * 100;

          const isComplete = completedLevels === totalLevels;
          const isUnlocked = uProg && uProg.levels.some((l) => l.status === "unlocked" || l.status === "complete");

          return {
            ...cs,
            status: isComplete ? "complete" : isUnlocked ? "unlocked" : "locked",
            progressPercentage,
            completedLevels,
            totalLevels
          };
        }).sort((a, b) => a.order_index - b.order_index);

        setSubjects(merged);
        setTotalXp(xpRes.data.totalXp);
      } catch (err) {
        console.error("Failed to fetch data", err);
        setError("Failed to load your learning path. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-screen bg-[#FAF7F2]">
          <div className="w-8 h-8 border-4 border-[#8B2500] border-t-transparent rounded-full animate-spin"></div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="flex flex-col justify-center items-center h-screen bg-[#FAF7F2]">
          <p className="text-[#8B2500] font-bold mb-4">{error}</p>
          <button onClick={() => window.location.reload()} className="px-6 py-2 bg-[#8B2500] text-white rounded-lg font-bold">Retry</button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* Main Content */}
      <div className="pb-20 px-4 flex flex-col items-center bg-[#FAF7F2] min-h-screen">
        <div className="text-center mt-12 mb-16">
          <h2 className="text-4xl font-extrabold text-[#1a1a1a] mb-2 tracking-tight">Your Learning Path</h2>
          <p className="text-[#6b6b6b] text-lg font-medium">Master subjects to conquer the Arena.</p>
        </div>

        {/* Path Container */}
        <div className="relative w-full max-w-lg flex flex-col items-center">
          {/* Vertical Dotted Connecting Line */}
          <div className="absolute top-0 bottom-0 left-[31px] md:left-1/2 w-0 border-l-[3px] border-dashed border-[#E8DFD1] -ml-[1.5px] z-0"></div>
          
          {subjects.map((subject, index) => {
            const isComplete = subject.status === "complete";
            const isUnlocked = subject.status === "unlocked";
            const isLocked = subject.status === "locked";

            let iconBg = "bg-white border-[#E8DFD1]";
            let iconColor = "text-[#c2c2c2]";
            let IconComponent = Lock;
            let titleColor = "text-[#1a1a1a]";

            if (isComplete) {
              iconBg = "bg-[#4CAF50] border-[#4CAF50]";
              iconColor = "text-white";
              IconComponent = Check;
            } else if (isUnlocked) {
              iconBg = "bg-[#D4641A] border-[#D4641A] ring-4 ring-[#D4641A]/20";
              iconColor = "text-white";
              IconComponent = BookOpen;
            } else {
              titleColor = "text-[#a0a0a0]";
            }

            return (
              <motion.div
                key={subject.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                className={`relative z-10 flex items-center w-full mb-12 group ${isLocked ? "opacity-70 cursor-not-allowed" : "cursor-pointer"}`}
                onClick={() => {
                  if (!isLocked) navigate(`/subject/${subject.id}`);
                }}
              >
                {/* Desktop: Alternate sides. Mobile: All on right of line */}
<div className={`hidden md:flex w-1/2 justify-end pr-8 ${index % 2 !== 0 ? "md:hidden" : ""}`}>                  {/* Left Side Content (Desktop only) */}
                  <div className="bg-white p-5 rounded-2xl shadow-sm border border-[#E8DFD1] w-full max-w-sm text-right hover:shadow-md transition-shadow relative">
                     {/* Triangle pointer */}
                     <div className="absolute right-[-8px] top-8 w-4 h-4 bg-white border-t border-r border-[#E8DFD1] rotate-45"></div>
                     <h3 className={`font-bold text-xl mb-1 ${titleColor}`}>{subject.name}</h3>
                     <p className="text-sm text-[#6b6b6b] mb-3 line-clamp-2">{subject.description}</p>

                     <div className="w-full bg-[#FAF7F2] rounded-full h-2.5 flex justify-end overflow-hidden">
                        <div className="bg-[#D4641A] h-2.5 rounded-full" style={{ width: `${subject.progressPercentage}%` }}></div>
                     </div>
                     <div className="flex justify-between items-center mt-2">
                       {isUnlocked && (
                         <button className="text-sm font-bold text-[#8B2500] hover:text-[#D4641A] flex items-center gap-1">
                           Continue Learning <ChevronRight size={14}/>
                         </button>
                       )}
                       <span className="text-xs font-bold text-[#8a8a8a] w-full text-left">{subject.progressPercentage}%</span>
                     </div>
                  </div>
                </div>

                {/* Central Node */}
                <div className="relative flex justify-center w-24 md:w-auto md:px-0 z-20">
                   {isLocked && (
                      <div className="absolute -top-10 whitespace-nowrap bg-[#1a1a1a] text-white text-xs font-bold px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-30">
                        Complete previous to unlock
                      </div>
                   )}
                   <div className={`w-16 h-16 rounded-full border-4 flex items-center justify-center transition-transform group-hover:scale-105 shadow-md ${iconBg}`}>
                     <IconComponent className={`w-6 h-6 ${iconColor}`} strokeWidth={2.5} />
                   </div>
                </div>

                {/* Mobile: Content always on right. Desktop: Right side content */}
                
                <div className={`flex-1 pl-4 md:pl-8 md:w-1/2 ${index % 2 === 0 ? " md:hidden" : "md:flex"}`}>
                  <div className="bg-white p-5 rounded-2xl shadow-sm border border-[#E8DFD1] w-full max-w-sm hover:shadow-md transition-shadow relative">
                     {/* Triangle pointer (Desktop only for right side) */}
                     <div className="hidden md:block absolute left-[-8px] top-8 w-4 h-4 bg-white border-b border-l border-[#E8DFD1] rotate-45"></div>

                     <h3 className={`font-bold text-xl mb-1 ${titleColor}`}>{subject.name}</h3>
                     <p className="text-sm text-[#6b6b6b] mb-3 line-clamp-2">{subject.description}</p>

                     <div className="w-full bg-[#FAF7F2] rounded-full h-2.5 overflow-hidden">
                        <div className="bg-[#D4641A] h-2.5 rounded-full transition-all duration-1000" style={{ width: `${subject.progressPercentage}%` }}></div>
                     </div>
                     <div className="flex justify-between items-center mt-2">
                       <span className="text-xs font-bold text-[#8a8a8a]">{subject.progressPercentage}%</span>
                       {isUnlocked && (
                         <button className="text-sm font-bold text-[#8B2500] hover:text-[#D4641A] flex items-center gap-1">
                           Continue <ChevronRight size={14}/>
                         </button>
                       )}
                     </div>
                  </div>
                </div>

              </motion.div>
            );
          })}
        </div>
      </div>
    </Layout>
  );
}
