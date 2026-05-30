import React from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import Layout from "../components/Layout";
import { Trophy, Home, RotateCcw } from "lucide-react";
import { motion } from "framer-motion";
import { useAuthStore } from "../lib/store";

export default function BattleResults() {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const { user } = useAuthStore();
  
  const results = location.state?.results || null;
  
  if (!results) {
    return (
      <Layout>
        <div className="flex h-screen items-center justify-center">
            <p>No results found.</p>
        </div>
      </Layout>
    );
  }

  const sortedPlayers = [...results.top3].sort((a, b) => b.score - a.score);
  const me = sortedPlayers.find(p => p.userId === user?.id) || { score: 0, username: 'You' };
  const opponent = sortedPlayers.find(p => p.userId !== user?.id) || { score: 0, username: 'Opponent' };
  
  const isVictory = me.score > opponent.score;
  const isDraw = me.score === opponent.score && me.score > 0;
  const isDefeat = me.score < opponent.score;

  return (
    <Layout>
      <div className="p-4 md:p-8 max-w-2xl mx-auto h-[90vh] flex flex-col items-center justify-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center w-full"
        >
          <div className="mb-8 relative inline-block">
            <div className={`w-32 h-32 rounded-full flex items-center justify-center mx-auto mb-4 ${isVictory ? 'bg-[#FFF4E5]' : isDraw ? 'bg-blue-50' : 'bg-[#F5F5F5]'}`}>
              <Trophy className={`w-16 h-16 ${isVictory ? 'text-[#D4641A]' : isDraw ? 'text-blue-500' : 'text-[#8a8a8a]'}`} />
            </div>
            
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
              className={`absolute -bottom-4 left-1/2 -translate-x-1/2 text-white px-6 py-2 rounded-full font-bold text-lg whitespace-nowrap shadow-md ${
                isVictory ? 'bg-[#8B2500]' : isDraw ? 'bg-blue-600' : 'bg-red-600'
              }`}
            >
              {isVictory ? "VICTORY!" : isDraw ? "IT'S A DRAW!" : "DEFEAT"}
            </motion.div>
          </div>

          <div className="bg-white rounded-[2rem] p-8 shadow-soft border border-surface-variant mb-8 w-full">
            <div className="flex justify-between items-center mb-8 pb-8 border-b border-surface-variant">
              <div className="text-center w-1/3">
                <div className="text-sm font-bold text-[#6b6b6b] uppercase mb-2">
                  {me.username}
                </div>
                <div className="text-4xl font-bold text-[#D4641A]">{me.score}</div>
              </div>
              <div className="text-2xl font-bold text-[#6b6b6b]/30">
                VS
              </div>
              <div className="text-center w-1/3">
                <div className="text-sm font-bold text-[#6b6b6b] uppercase mb-2">
                  {opponent.username}
                </div>
                <div className="text-4xl font-bold text-[#1a1a1a]">
                  {opponent.score}
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center px-4">
              <span className="font-bold text-[#6b6b6b]">
                Battle XP Earned
              </span>
              <span className="font-bold text-[#8B2500] text-xl">+{me.score} XP</span>
            </div>
          </div>

          <div className="flex gap-4 w-full">
            <button
              onClick={() => navigate("/home")}
              className="flex-1 py-4 bg-white text-[#6b6b6b] border-2 border-[#E8DFD1] font-bold text-lg rounded-xl flex items-center justify-center gap-2 hover:bg-[#FAF7F2] transition-colors"
            >
              <Home className="w-5 h-5" /> Return Home
            </button>
            <button
              onClick={() => navigate("/battle")}
              className="flex-1 py-4 bg-gradient-to-r from-[#D4641A] to-[#8B2500] text-white font-bold text-lg rounded-xl flex items-center justify-center gap-2 hover:scale-[1.02] transition-all shadow-lg"
            >
              <RotateCcw className="w-5 h-5" /> Play Again
            </button>
          </div>
        </motion.div>
      </div>
    </Layout>
  );
}
