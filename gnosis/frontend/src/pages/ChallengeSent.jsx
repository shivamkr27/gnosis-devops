import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import Layout from "../components/Layout";
import api from "../lib/api";
import { useAuthStore, useAppStore, useSocketStore } from "../lib/store";
import { motion, AnimatePresence } from "framer-motion";
import { X, Trophy, History, Zap, Lightbulb, Brain, Swords } from "lucide-react";

export default function ChallengeSent() {
  const { friendId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { imageMap } = useAppStore();
    const { socket } = useSocketStore();
    const challengeEmitKeyRef = useRef("");

  const [error, setError] = useState(null);
  const [rejected, setRejected] = useState(false);
  const [friendInfo, setFriendInfo] = useState(null);
  const [winCount, setWinCount] = useState(0);

  const searchParams = new URLSearchParams(location.search);
  const subjectId = searchParams.get("subjectId");
  const subjectName = searchParams.get("subjectName");
  const levelId = searchParams.get("levelId");
  const levelNumber = searchParams.get("levelNumber");
  const toUsername = searchParams.get("toUsername") || "Opponent";

  useEffect(() => {
    if (!user?.id) return;

    const fetchData = async () => {
        try {
            // Fetch battle history to count wins
            const histRes = await api.get(`/battle/history/${user.id}`);
            const winsAgainstFriend = histRes.data.filter(battle => {
                const results = battle.results || {};
                const friendResult = results[friendId];
                const myResult = results[user.id];
                return friendResult !== undefined && myResult > friendResult;
            }).length;
            setWinCount(winsAgainstFriend);
        } catch (err) {
            console.error("Failed to fetch history", err);
        }
    };
    fetchData();

        if (!socket) return undefined;

        const handleChallengeError = (data) => setError(data.message);
        const handleChallengeRejected = () => setRejected(true);
        const handleChallengeAccepted = (payload) => {
            if (payload.roomCode) {
                navigate(`/battle/lobby/${payload.roomCode}?host=1&type=1v1`);
            }
        };

        socket.on("challenge:error", handleChallengeError);
        socket.on("challenge:rejected", handleChallengeRejected);
        socket.on("challenge:accepted", handleChallengeAccepted);

        const emitKey = `${friendId}:${subjectId}:${levelId}:${levelNumber}:${user.id}`;
        if (challengeEmitKeyRef.current !== emitKey) {
            challengeEmitKeyRef.current = emitKey;
            socket.emit("challenge:send", {
                toUserId: friendId,
                toUsername: toUsername,
                subjectId,
                subjectName,
                levelId: levelId || "dummy-level-id",
                levelNumber: parseInt(levelNumber || "1")
            });
        }

        return () => {
            socket.off("challenge:error", handleChallengeError);
            socket.off("challenge:rejected", handleChallengeRejected);
            socket.off("challenge:accepted", handleChallengeAccepted);
        };
    }, [user, friendId, subjectId, subjectName, levelId, levelNumber, toUsername, navigate, socket]);

  return (
    <Layout>
      <div className="min-h-[85vh] flex flex-col items-center justify-center p-4 relative overflow-hidden jaali-bg">
        {/* Floating background icons */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.03]">
            <div className="absolute top-20 left-[15%] rotate-12"><Brain size={120} /></div>
            <div className="absolute bottom-20 right-[15%] -rotate-12"><Lightbulb size={120} /></div>
            <div className="absolute top-1/2 right-[10%] rotate-45"><Zap size={80} /></div>
        </div>

        {error || rejected ? (
            <motion.div 
                initial={{ opacity: 0, scale: 0.9 }} 
                animate={{ opacity: 1, scale: 1 }}
                className="max-w-md w-full bg-white rounded-[2.5rem] p-10 border-2 border-[#E8DFD1] shadow-xl text-center z-10"
            >
                <div className={`w-20 h-20 rounded-full mx-auto flex items-center justify-center mb-6 ${rejected ? 'bg-orange-100 text-orange-600' : 'bg-red-100 text-red-600'}`}>
                    {rejected ? <Swords size={40} /> : <X size={40} />}
                </div>
                <h2 className="text-3xl font-black text-[#2F2C28] mb-4">
                    {rejected ? "Challenge Declined" : "Error Occurred"}
                </h2>
                <p className="text-[#6E675F] font-medium mb-8">
                    {rejected ? `${toUsername} is not ready for a duel right now. Try again later!` : error}
                </p>
                <button
                    onClick={() => navigate("/battle")}
                    className="w-full py-4 bg-[#A34714] text-white font-bold rounded-2xl shadow-lg hover:shadow-xl transition-all active:scale-95"
                >
                    Back to Arena
                </button>
            </motion.div>
        ) : (
            <div className="w-full max-w-4xl flex flex-col items-center z-10">
                {/* Header Section */}
                <motion.span 
                    initial={{ opacity: 0, y: -20 }} 
                    animate={{ opacity: 1, y: 0 }}
                    className="px-4 py-1.5 bg-[#FFF4E5] text-[#D57B1E] text-[10px] font-black uppercase tracking-[0.2em] rounded-full border border-[#F0C090] mb-6 shadow-sm"
                >
                    Challenge Mode
                </motion.span>
                
                <motion.h1 
                    initial={{ opacity: 0, y: -10 }} 
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="text-4xl md:text-5xl font-black text-[#2F2C28] mb-2 text-center"
                >
                    Challenge Sent!
                </motion.h1>
                
                <motion.p 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="text-[#6E675F] font-bold text-lg mb-12"
                >
                    Waiting for <span className="text-[#A34714]">{toUsername}...</span>
                </motion.p>

                {/* Radar/Central Visual */}
                <div className="relative mb-20">
                    {/* Animated Rings */}
                    <motion.div 
                        animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.1, 0.3] }}
                        transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                        className="absolute inset-0 -m-20 border border-[#E6D8C4] rounded-full"
                    />
                    <motion.div 
                        animate={{ scale: [1, 1.4, 1], opacity: [0.2, 0.05, 0.2] }}
                        transition={{ repeat: Infinity, duration: 4, ease: "easeInOut", delay: 1 }}
                        className="absolute inset-0 -m-32 border border-[#E6D8C4] rounded-full"
                    />
                    <motion.div 
                        animate={{ scale: [1, 1.6, 1], opacity: [0.1, 0.02, 0.1] }}
                        transition={{ repeat: Infinity, duration: 4, ease: "easeInOut", delay: 2 }}
                        className="absolute inset-0 -m-44 border border-[#E6D8C4] rounded-full"
                    />

                    {/* Outer floating icons */}
                    <div className="absolute -top-32 right-12 text-[#D57B1E]/40"><Lightbulb size={24} className="animate-pulse" /></div>
                    <div className="absolute -bottom-12 -left-32 text-[#A34714]/40"><Brain size={32} className="rotate-12 animate-bounce" /></div>

                    {/* Center piece */}
                    <div className="relative">
                        {/* Battle Icon Tag */}
                        <motion.div 
                            initial={{ scale: 0 }} 
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", delay: 0.5 }}
                            className="absolute -top-12 left-1/2 -translate-x-1/2 z-20 w-16 h-16 bg-white rounded-3xl shadow-2xl border-2 border-[#E6D8C4] flex items-center justify-center text-[#2F2C28]"
                        >
                            <Swords size={32} />
                        </motion.div>

                        {/* Profile Image with Ring */}
                        <div className="w-40 h-40 md:w-48 md:h-48 rounded-[3rem] bg-white p-3 shadow-2xl border-2 border-[#E6D8C4] relative z-10 overflow-hidden transform rotate-3">
                            <img 
                                src={imageMap?.avatars?.[friendId] || "https://api.dicebear.com/7.x/avataaars/svg?seed=" + toUsername} 
                                alt={toUsername}
                                className="w-full h-full object-cover rounded-[2.5rem]"
                            />
                        </div>
                    </div>
                </div>

                {/* Info Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full mb-12">
                    <motion.div 
                        initial={{ opacity: 0, x: -20 }} 
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 }}
                        className="bg-white rounded-3xl p-6 border-2 border-[#E6D8C4] shadow-sm flex items-center gap-5 group hover:border-[#F0C090] transition-all"
                    >
                        <div className="w-14 h-14 rounded-2xl bg-[#FFF4E5] flex items-center justify-center text-[#D57B1E] group-hover:scale-110 transition-transform">
                            <History size={28} />
                        </div>
                        <div>
                            <h3 className="text-xs font-black uppercase tracking-wider text-[#6E675F]">Matchmaking History</h3>
                            <p className="text-lg font-black text-[#2F2C28]">{winCount} Wins vs {toUsername.split('_')[0]}</p>
                        </div>
                    </motion.div>

                    <motion.div 
                        initial={{ opacity: 0, x: 20 }} 
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.4 }}
                        className="bg-white rounded-3xl p-6 border-2 border-[#E6D8C4] shadow-sm flex items-center gap-5 group hover:border-[#F0C090] transition-all"
                    >
                        <div className="w-14 h-14 rounded-2xl bg-[#F0FDF4] flex items-center justify-center text-green-600 group-hover:scale-110 transition-transform">
                            <Zap size={28} />
                        </div>
                        <div>
                            <h3 className="text-xs font-black uppercase tracking-wider text-[#6E675F]">Upcoming Duel</h3>
                            <p className="text-lg font-black text-[#2F2C28]">+250 XP if you win</p>
                        </div>
                    </motion.div>
                </div>

                {/* Cancel Button */}
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileActive={{ scale: 0.95 }}
                    onClick={() => navigate("/battle")}
                    className="flex items-center gap-3 px-10 py-4 bg-white border-2 border-red-500/30 text-red-600 font-black rounded-2xl hover:bg-red-50 transition-all shadow-sm hover:shadow-md mb-8 group"
                >
                    <X size={20} className="group-hover:rotate-90 transition-transform" />
                    Cancel Challenge
                </motion.button>

                {/* Footer Quote */}
                <p className="text-center italic font-bold text-[#6E675F]/60 max-w-md">
                    "Patience is the companion of wisdom." — <span className="text-[#A34714]">Sage Gnosis</span>
                </p>
            </div>
        )}
      </div>
    </Layout>
  );
}
