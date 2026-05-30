import React, { useEffect, useRef, useState } from "react";
import {
  useLocation,
  useNavigate,
  useParams,
  NavLink,
} from "react-router-dom";

import api from "../lib/api";
import { useAuthStore } from "../lib/store";

import {
  ArrowRight,
  Flame,
  Trophy,
  Award,
  RotateCcw,
  User,
  Bell,
} from "lucide-react";

import { motion } from "framer-motion";

export default function LessonComplete() {
  const { levelId } = useParams();

  const location = useLocation();
  const { state } = location;

  const navigate = useNavigate();

  const { user, setUser } = useAuthStore();

  const [streak, setStreak] = useState(null);
  const [status, setStatus] = useState(
    "Saving progress..."
  );

  const [levelInfo, setLevelInfo] =
    useState(null);

  const savedRef = useRef(false);

  const totalXp = Number(
    state?.totalXp || 0
  );

  const correctCount = Number(
    state?.correctCount || 0
  );

  const totalQuestions = Number(
    state?.totalQuestions || 10
  );

  const hasAnswers =
    Array.isArray(state?.answers) &&
    state.answers.length > 0;

  useEffect(() => {
    if (state?.saved) {
      setStatus("Progress saved");
      return;
    }

    if (
      !user ||
      !levelId ||
      savedRef.current
    )
      return;

    savedRef.current = true;

    const saveCompletion = async () => {
      try {
        const levelRes = await api.get(
          `/content/levels/${levelId}`
        );

        const subjectId =
          levelRes.data.subject_id;

        setLevelInfo(levelRes.data);

        await api.post("/xp/award", {
          userId: user.id,
          username: user.username,
          amount: totalXp,
          source: "lesson",
          scope: "global",
        });

      await api.post(
  "/progress/complete-level",
  {
    userId: user.id,
    levelId,
    subjectId,
    xpEarned: totalXp,
    answers: state?.answers || []
  }
);

        const [streakRes, meRes] =
          await Promise.all([
            api.get(
              `/progress/${user.id}/streak`
            ),
            api.get("/auth/me"),
          ]);

        setStreak(streakRes.data);

        setUser(meRes.data);

        setStatus("Progress saved");

        navigate(
          `/lesson/${levelId}/complete`,
          {
            replace: true,
            state: {
              ...state,
              saved: true,
              levelName:
                levelRes.data.topic,
            },
          }
        );
      } catch (err) {
        setStatus(
          err.response?.data?.error ||
            "Could not save progress"
        );
      }
    };

    saveCompletion();
  }, [
    levelId,
    navigate,
    setUser,
    state,
    totalXp,
    user,
  ]);

  const displayLevelName =
    state?.levelName ||
    levelInfo?.topic ||
    "Ancient Scripts";

  const streakCount =
    streak?.streakCount ??
    user?.streak_count ??
    0;

  const totalXpEarned =
    totalXp || 107;

  // Dynamic Level Computation
  const currentGlobalXp =
    user?.total_xp || 0;

  const globalLevelNumber =
    user?.level ||
    Math.floor(currentGlobalXp / 100) +
      1;

  const xpInCurrentLevel =
    currentGlobalXp % 100;

  const xpNeededForNext =
    100 - xpInCurrentLevel;

  const levelProgressPercent =
    Math.min(
      100,
      Math.round(
        (xpInCurrentLevel / 100) * 100
      )
    );

  // Level titles based on XP thresholds
  const getLevelTitle = (xp) => {
    if (xp < 500) return "Novice";
    if (xp < 1000) return "Apprentice";
    if (xp < 2000) return "Scholar";
    if (xp < 3500) return "Sage";
    if (xp < 5000) return "Master";
    return "Grandmaster";
  };

  const levelTitle = getLevelTitle(currentGlobalXp);

  return (
    <div className="min-h-screen bg-[#FAF6EE] text-[#5A5349] overflow-hidden">
      <header className="sticky top-0 z-40 bg-[#FBF7F0]/95 backdrop-blur border-b border-[#E6D8C4]">
        <div className="max-w-[1240px] mx-auto h-16 px-4 md:px-6 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button
              onClick={() =>
                navigate("/home")
              }
              className="text-2xl font-extrabold text-[#9A4315] tracking-tight"
            >
              Gnosis
            </button>

            <nav className="hidden md:flex items-center gap-6 text-sm font-bold">
              <NavLink
                to="/home"
                className={({
                  isActive,
                }) =>
                  isActive
                    ? "text-[#9A4315] border-b-2 border-[#D57B1E] pb-1"
                    : "text-[#6E675F] hover:text-[#2F2C28]"
                }
              >
                Learning Path
              </NavLink>

              <NavLink
                to="/battle"
                className={({
                  isActive,
                }) =>
                  isActive
                    ? "text-[#9A4315] border-b-2 border-[#D57B1E] pb-1"
                    : "text-[#6E675F] hover:text-[#2F2C28]"
                }
              >
                Battle Arena
              </NavLink>

              <NavLink
                to="/leaderboard"
                className={({
                  isActive,
                }) =>
                  isActive
                    ? "text-[#9A4315] border-b-2 border-[#D57B1E] pb-1"
                    : "text-[#6E675F] hover:text-[#2F2C28]"
                }
              >
                Leaderboard
              </NavLink>
            </nav>
          </div>

          <div className="flex items-center gap-2 text-[#9A4315]">
            <button
              onClick={() =>
                navigate("/notifications")
              }
              className="w-9 h-9 rounded-full hover:bg-white border border-transparent hover:border-[#E6D8C4] flex items-center justify-center"
              aria-label="Notifications"
            >
              <Bell className="w-4 h-4" />
            </button>

            <button
              onClick={() =>
                navigate(
                  `/profile/${
                    user?.id || ""
                  }`
                )
              }
              className="w-9 h-9 rounded-full bg-white border border-[#E6D8C4] flex items-center justify-center overflow-hidden"
              aria-label="Open profile"
            >
              {user?.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="relative">
        <div
          className="absolute inset-0 opacity-70 pointer-events-none"
          style={{
            backgroundImage:
              "repeating-linear-gradient(45deg, rgba(205, 182, 153, 0.18) 0, rgba(205, 182, 153, 0.18) 18px, transparent 18px, transparent 36px), repeating-linear-gradient(-45deg, rgba(205, 182, 153, 0.18) 0, rgba(205, 182, 153, 0.18) 18px, transparent 18px, transparent 36px)",

            backgroundColor:
              "#FAF6EE",
          }}
        />

        <div className="relative z-10 max-w-[1240px] mx-auto px-4 md:px-6 py-8 md:py-10">
          <div className="text-center pt-4 md:pt-8">
            <motion.div
              initial={{
                opacity: 0,
                y: -20,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              transition={{
                delay: 0.15,
                duration: 0.5,
              }}
              className="inline-block relative mb-6"
            >
              <img
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuCr5NiPoMbGkbfY4O-Tr1FmHhz5sI08O6UTpZxGLzpy0D0CC7eLQagaui-dlcoRkILNnT21_DignHB3QayKcPUBQLRGL3KNC8eE9dQ6Vi7VlhFB4DJfmre480CzYLM0e1Sid4vZ6HeoELXgOs79ucVq0rg9Z7qtsXZBTmjM6YWmSR-pgWz760zlL_VLAxOFclWoPInAqed6gykXjXkwsT7OGd3E_HjZNLeF4YNgiUE1t69DDmJVc1d_qjBt7618MjQCzBeiN4YS_2hc"
                alt="Victory robot"
                className="w-32 h-32 md:w-40 md:h-40 object-cover rounded-[24px] shadow-lg border-4 border-[#FFF4E5] mx-auto"
              />

              <div className="absolute -top-4 -right-3 bg-[#F5BE47] text-[#7A4611] px-4 py-2 rounded-full font-extrabold text-sm shadow-lg rotate-12">
                EXCELLENT!
              </div>
            </motion.div>

            <motion.h1
              initial={{
                opacity: 0,
              }}
              animate={{
                opacity: 1,
              }}
              transition={{
                delay: 0.3,
              }}
              className="text-5xl md:text-6xl font-extrabold text-[#A34714] mb-3 leading-none"
            >
              Victory!
            </motion.h1>

            <motion.p
              initial={{
                opacity: 0,
              }}
              animate={{
                opacity: 1,
              }}
              transition={{
                delay: 0.4,
              }}
              className="text-lg md:text-xl text-[#7A7268] mb-8"
            >
              You&apos;ve unlocked the
              mysteries of the{" "}
              {displayLevelName} module.
            </motion.p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.28fr)] gap-5 md:gap-6 items-start">
            <motion.div
              initial={{
                x: -20,
                opacity: 0,
              }}
              animate={{
                x: 0,
                opacity: 1,
              }}
              transition={{
                delay: 0.5,
              }}
              className="bg-white rounded-[28px] p-6 md:p-8 shadow-sm border border-[#E8D8C2]"
            >
              <h2 className="text-2xl font-extrabold text-[#2F2C28] mb-6 flex items-center gap-3">
                <Award className="w-6 h-6 text-[#A65A16]" />
                XP Breakdown
              </h2>

              <div className="space-y-0">
                <div className="flex items-center justify-between py-4 border-b border-[#EFE3D5]">
                  <span className="text-[#6E675F] font-medium">
                    Base Experience ({correctCount}/{totalQuestions})
                  </span>

                  <span className="text-2xl font-extrabold text-[#A34714]">
                    +{Math.round((correctCount / totalQuestions) * 25)} XP
                  </span>
                </div>

                <div className="flex items-center justify-between py-4 border-b border-[#EFE3D5]">
                  <span className="text-[#6E675F] font-medium">
                    Speed Bonus
                  </span>

                  <span className="text-2xl font-extrabold text-[#D57B1E]">
                    +{streakCount > 0 ? 10 : 0} XP
                  </span>
                </div>

                <div className="flex items-center justify-between py-4 border-b border-[#EFE3D5]">
                  <span className="text-[#6E675F] font-medium">
                    Streak Bonus (×{streakCount})
                  </span>

                  <span className="text-2xl font-extrabold text-[#6C7BAA]">
                    +{streakCount * 5} XP
                  </span>
                </div>
              </div>

              <div className="mt-8 rounded-2xl bg-[#FBF7F0] p-5 text-center">
                <p className="text-[#6E675F] text-sm font-medium mb-1">
                  Total Earned
                </p>

                <p className="text-4xl md:text-5xl font-extrabold text-[#A34714]">
                  {totalXpEarned} XP
                </p>
              </div>
            </motion.div>

            <motion.div
              initial={{
                x: 20,
                opacity: 0,
              }}
              animate={{
                x: 0,
                opacity: 1,
              }}
              transition={{
                delay: 0.6,
              }}
              className="space-y-5"
            >
              <div className="rounded-[28px] border-2 border-[#D57B1E] bg-[#FFF4E5] p-6 md:p-8 shadow-sm">
                <h3 className="text-2xl font-extrabold text-[#A34714] mb-3 flex items-center gap-3">
                  <Flame className="w-7 h-7" />
                  {streakCount} Day Streak!
                </h3>

                <p className="text-[#6E675F] font-medium mb-6">
                  You&apos;re on fire,
                  Sage! Keep the flame
                  alive tomorrow.
                </p>

                <div className="flex justify-between items-center gap-3">
                  {[
                    "M",
                    "T",
                    "W",
                    "T",
                    "F",
                    "S",
                    "S",
                  ].map((day, i) => {
                    const todayDayIndex =
                      new Date().getDay();

                    const currentDayMapped =
                      todayDayIndex === 0
                        ? 6
                        : todayDayIndex - 1;

                    const daysAgo =
                      (currentDayMapped -
                        i +
                        7) %
                      7;

                    const isActive =
                      daysAgo <
                      streakCount;

                    const isToday =
                      i ===
                      currentDayMapped;

                    return (
                      <div
                        key={i}
                        className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm border ${
                          isActive
                            ? "bg-[#9A4315] text-white border-[#9A4315]"
                            : isToday
                            ? "bg-white text-[#9A4315] border-[#9A4315]"
                            : "bg-white text-[#9A4315] border-[#E8D8C2]"
                        }`}
                      >
                        {day}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-[28px] bg-white p-6 md:p-7 border border-[#E8D8C2] shadow-sm">
                <h3 className="text-2xl font-extrabold text-[#2F2C28] mb-5 flex items-center gap-3">
                  <Trophy className="w-6 h-6 text-[#D57B1E]" />
                  Current Level
                </h3>

                <div className="flex items-center gap-5">
                  <div className="h-16 w-16 rounded-full border-[6px] border-[#F1D39D] flex items-center justify-center text-[#A34714] font-extrabold text-xl bg-[#FFF9EF] shrink-0">
                    {levelProgressPercent}%
                  </div>

                  <div className="flex-1">
                    <p className="text-[#D57B1E] font-bold text-base mb-2 text-center md:text-left">
                      Level{" "}
                      {globalLevelNumber}{" "}
                      {levelTitle}
                    </p>

                    <div className="w-full bg-[#FAF1E5] rounded-full h-3 mb-3 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-[#D57B1E] to-[#A34714] rounded-full"
                        style={{
                          width: `${levelProgressPercent}%`,
                        }}
                      />
                    </div>

                    <p className="text-[#6E675F] text-sm text-center md:text-left">
                      {xpNeededForNext} XP
                      to Level{" "}
                      {globalLevelNumber +
                        1}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          <motion.div
            initial={{
              y: 20,
              opacity: 0,
            }}
            animate={{
              y: 0,
              opacity: 1,
            }}
            transition={{
              delay: 0.7,
            }}
            className="mt-6 md:mt-8 grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6"
          >
            <button
              onClick={() =>
                navigate("/home")
              }
              className="bg-[#A34714] text-white font-bold py-4 px-8 rounded-2xl hover:bg-[#8b3c10] transition-all hover:shadow-lg flex items-center justify-center gap-2"
            >
              Continue Path

              <ArrowRight className="w-5 h-5" />
            </button>

            {hasAnswers && (
              <button
                onClick={() =>
                  navigate(
                    `/lesson/${levelId}/review`,
                    { 
                      state: {
                        ...state,
                        timeSpent: state?.timeSpent
                      }
                    }
                  )
                }
                className="bg-white text-[#A34714] font-bold py-4 px-8 rounded-2xl border-2 border-[#D57B1E] hover:bg-[#FBF7F0] transition-all flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-5 h-5" />
                Review Answers
              </button>
            )}
          </motion.div>
        </div>

        <div className="fixed bottom-4 left-4 right-4 md:hidden text-center text-xs text-[#6E675F]">
          {status}
        </div>
      </main>
    </div>
  );
}