import React, { useState, useEffect } from "react";
import Layout from "../components/Layout";
import api from "../lib/api";
import { useAuthStore, useAppStore } from "../lib/store";
import { Trophy, Users, Globe, Search, ArrowUp, Medal, Crown } from "lucide-react";

export default function Leaderboard() {
  const { user } = useAuthStore();
  const { imageMap } = useAppStore();
  const [activeTab, setActiveTab] = useState("global"); 
  const [rankings, setRankings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUserRank, setCurrentUserRank] = useState(null);

  useEffect(() => {
    const fetchRankings = async () => {
      try {
        setLoading(true);
        let data = [];
        let myRank = null;

        if (activeTab === "global") {
          const res = await api.get(`/xp/leaderboard/global?currentUserId=${user.id}`);
          data = res.data.leaderboard || [];
          myRank = res.data.currentUserRank;
        } else {
          // Get friends first
          const friendsRes = await api.get("/auth/friends");
          const friendIds = friendsRes.data.map(f => f.id).join(",");
          
          if (friendIds) {
            const res = await api.get(`/xp/leaderboard/friends?userId=${user.id}&friendIds=${friendIds}`);
            data = res.data || [];
          } else {
            // Only user in friends list if no friends
            const res = await api.get(`/xp/leaderboard/friends?userId=${user.id}&friendIds=${user.id}`);
            data = res.data || [];
          }
        }
        
        setRankings(data);

        // Find current user's rank object from data if possible, or use myRank from global
        const myData = data.find((r) => r.user_id === user.id || r.userId === user.id);
        if (myData) {
          const idx = data.indexOf(myData);
          setCurrentUserRank({ ...myData, rank: myRank || (idx + 1) });
        } else if (myRank && activeTab === 'global') {
          // If activeTab is global and we have myRank but user not in top 20
          setCurrentUserRank({ username: user.username, rank: myRank, total_xp: user.total_xp });
        } else {
          setCurrentUserRank(null);
        }
      } catch (err) {
        console.error("Failed to fetch rankings", err);
      } finally {
        setLoading(false);
      }
    };

    fetchRankings();
  }, [activeTab, user.id]);

  const podium = rankings.slice(0, 3);
  const listItems = rankings.slice(3);

  return (
    <Layout>
      <div className="max-w-5xl mx-auto px-4 py-12 pb-24">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <h1 className="text-4xl font-black text-[#1a1a1a] tracking-tight mb-2">League of Scholars</h1>
            <p className="text-[#6b6b6b] font-medium text-lg">Ascend the ranks by mastering knowledge.</p>
          </div>

          <div className="flex bg-white p-1 rounded-2xl border border-[#E8DFD1] shadow-sm self-start">
            <button
              onClick={() => setActiveTab("global")}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all ${
                activeTab === "global" ? "bg-[#8B2500] text-white shadow-md shadow-[#8B2500]/20" : "text-[#8a8a8a] hover:text-[#1a1a1a]"
              }`}
            >
              <Globe className="w-4 h-4" /> Global
            </button>
            <button
              onClick={() => setActiveTab("friends")}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all ${
                activeTab === "friends" ? "bg-[#8B2500] text-white shadow-md shadow-[#8B2500]/20" : "text-[#8a8a8a] hover:text-[#1a1a1a]"
              }`}
            >
              <Users className="w-4 h-4" /> Friends
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="w-10 h-10 border-4 border-[#8B2500] border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="space-y-12">
            {/* Podium Section */}
            {podium.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-end max-w-4xl mx-auto pt-8">
                {/* 2nd Place */}
                <div className="order-2 md:order-1 flex flex-col items-center">
                  {podium[1] && (
                    <>
                      <div className="relative mb-4">
                        <div className="w-24 h-24 rounded-full border-4 border-[#C0C0C0] overflow-hidden shadow-lg bg-white p-1">
                          <img src={podium[1].profile_picture || imageMap?.avatars?.[podium[1].user_id || podium[1].userId] || `https://api.dicebear.com/7.x/avataaars/svg?seed=${podium[1].username}`} alt={podium[1].username} className="w-full h-full object-cover rounded-full" />
                        </div>
                        <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-[#C0C0C0] rounded-full flex items-center justify-center text-white font-bold text-xs ring-4 ring-[#FAF7F2]">2</div>
                      </div>
                      <p className="font-bold text-[#1a1a1a] mb-1">{podium[1].username}</p>
                      <p className="text-[#D4641A] font-black text-sm">{podium[1].total_xp || 0} XP</p>
                      <div className="w-full h-16 bg-white border-t-4 border-[#C0C0C0] rounded-t-3xl mt-4 shadow-sm flex flex-col items-center pt-4">
                        <Medal className="text-[#C0C0C0] w-6 h-6 opacity-30" />
                      </div>
                    </>
                  )}
                </div>

                {/* 1st Place */}
                <div className="order-1 md:order-2 flex flex-col items-center scale-110 relative z-10">
                  {podium[0] && (
                    <>
                      <Crown className="w-8 h-8 text-[#FFD700] mb-2 animate-bounce" />
                      <div className="relative mb-4">
                        <div className="w-32 h-32 rounded-full border-4 border-[#FFD700] overflow-hidden shadow-xl bg-white ring-4 ring-[#FFD700]/20 p-1">
                          <img src={podium[0].profile_picture || imageMap?.avatars?.[podium[0].user_id || podium[0].userId] || `https://api.dicebear.com/7.x/avataaars/svg?seed=${podium[0].username}`} alt={podium[0].username} className="w-full h-full object-cover rounded-full" />
                        </div>
                        <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-[#FFD700] rounded-full flex items-center justify-center text-white font-bold ring-4 ring-[#FAF7F2]">1</div>
                      </div>
                      <p className="font-black text-xl text-[#1a1a1a] mb-1">{podium[0].username}</p>
                      <p className="text-[#D4641A] font-black">{podium[0].total_xp || 0} XP</p>
                      <div className="w-full h-24 bg-white border-t-4 border-[#FFD700] rounded-t-3xl mt-4 shadow-md flex flex-col items-center pt-6">
                        <Trophy className="text-[#FFD700] w-8 h-8 opacity-40" />
                      </div>
                    </>
                  )}
                </div>

                {/* 3rd Place */}
                <div className="order-3 flex flex-col items-center">
                  {podium[2] && (
                    <>
                      <div className="relative mb-4">
                        <div className="w-20 h-20 rounded-full border-4 border-[#CD7F32] overflow-hidden shadow-lg bg-white p-1">
                          <img src={podium[2].profile_picture || imageMap?.avatars?.[podium[2].user_id || podium[2].userId] || `https://api.dicebear.com/7.x/avataaars/svg?seed=${podium[2].username}`} alt={podium[2].username} className="w-full h-full object-cover rounded-full" />
                        </div>
                        <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-[#CD7F32] rounded-full flex items-center justify-center text-white font-bold text-xs ring-4 ring-[#FAF7F2]">3</div>
                      </div>
                      <p className="font-bold text-[#1a1a1a] mb-1">{podium[2].username}</p>
                      <p className="text-[#D4641A] font-black text-sm">{podium[2].total_xp || 0} XP</p>
                      <div className="w-full h-12 bg-white border-t-4 border-[#CD7F32] rounded-t-3xl mt-4 shadow-sm flex flex-col items-center pt-4">
                        <Medal className="text-[#CD7F32] w-6 h-6 opacity-30" />
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* List Section */}
            <div className="bg-white rounded-[40px] border border-[#E8DFD1] shadow-xl overflow-hidden max-w-4xl mx-auto">
              {/* Table Header */}
              <div className="hidden md:grid grid-cols-12 gap-4 px-8 py-4 bg-[#FAF7F2]/80 border-b border-[#E8DFD1] text-[10px] font-black uppercase tracking-widest text-[#8a8a8a]">
                 <div className="col-span-1">Rank</div>
                 <div className="col-span-1">Avatar</div>
                 <div className="col-span-7">Scholar</div>
                 <div className="col-span-3 text-right">Master XP</div>
              </div>
              
              <div className="divide-y divide-[#FAF7F2]">
                {listItems.length > 0 ? (
                  listItems.map((item, index) => (
                    <div 
                      key={item.user_id || item.userId} 
                      className={`grid grid-cols-12 gap-4 items-center px-8 py-5 hover:bg-[#FAF7F2] transition-colors ${item.user_id === user.id || item.userId === user.id ? 'bg-[#FFF4E5]/50' : ''}`}
                    >
                      <div className="col-span-1 md:col-span-1">
                        <span className="font-black text-[#8a8a8a] italic">#{index + 4}</span>
                      </div>
                      <div className="col-span-2 md:col-span-1">
                        <div className="w-10 h-10 rounded-xl border-2 border-white overflow-hidden bg-[#FAF7F2] shadow-sm">
                          <img src={item.profile_picture || imageMap?.avatars?.[item.user_id || item.userId] || `https://api.dicebear.com/7.x/avataaars/svg?seed=${item.username}`} alt={item.username} className="w-full h-full object-cover" />
                        </div>
                      </div>
                      <div className="col-span-6 md:col-span-7 px-2">
                        <p className="font-bold text-[#1a1a1a] truncate">{item.username}</p>
                        {(item.user_id === user.id || item.userId === user.id) && <span className="inline-block px-1.5 py-0.5 bg-[#8B2500] text-white text-[8px] font-black rounded uppercase tracking-tighter mt-0.5">You</span>}
                      </div>
                      <div className="col-span-3 text-right">
                         <div className="flex flex-col items-end">
                            <span className="text-[#D4641A] font-black text-lg leading-none">{item.total_xp || 0}</span>
                            <span className="text-[8px] font-black uppercase text-[#8a8a8a] tracking-[0.2em]">Total</span>
                         </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-20 text-center text-[#8a8a8a] font-medium italic">
                    Keep learning to climb the ranks!
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Current User Fixed Rank */}
        {!loading && currentUserRank && currentUserRank.rank > 7 && (
          <div className="fixed bottom-24 md:bottom-12 left-1/2 -translate-x-1/2 w-[min(90vw,36rem)] bg-[#8B2500] text-white rounded-[24px] p-5 shadow-2xl flex items-center gap-5 border-4 border-white z-[70] animate-in slide-in-from-bottom duration-500">
            <span className="font-black text-2xl italic opacity-50 px-2">#{currentUserRank.rank}</span>
            <div className="w-12 h-12 rounded-2xl border-2 border-white/20 overflow-hidden bg-white flex-shrink-0">
              <img src={currentUserRank.profile_picture || imageMap?.avatars?.[user.id] || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUserRank.username}`} alt="You" className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-lg leading-tight truncate">You're catching up!</p>
              <p className="text-white/60 text-[10px] font-black uppercase tracking-widest mt-1">{activeTab === 'friends' ? 'Battle XP' : 'Global XP'}: {currentUserRank?.total_xp || 0}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                 <ArrowUp className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}