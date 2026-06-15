import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import { useAuthStore, useAppStore, useSocketStore } from "../lib/store";
import api from "../lib/api";
import {
  Users, Play, Search, UserPlus, Inbox, RefreshCw,
  Swords, Trophy, History, Zap, Shield, Crown,
  ChevronRight, ArrowRight, UserCircle2, BookOpen
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function BattleLobby() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { imageMap } = useAppStore();
  const { socket, notifications } = useSocketStore();
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [roomCode, setRoomCode] = useState("");

  // Friend Management State
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [pending, setPending] = useState([]);
  const [message, setMessage] = useState("");

  // Subject Selection Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [loadingLevels, setLoadingLevels] = useState(false);

  const [history, setHistory] = useState([]);
  const [userRank, setUserRank] = useState(null);
  const [battleStats, setBattleStats] = useState({ wins: 0, losses: 0 });

  useEffect(() => {
    fetchFriends();
    fetchPendingRequests();
    fetchSubjects();
    fetchHistory();
    fetchUserRank();
    fetchBattleStats();
  }, [user.id, user.username]);

  // Poll online status + friends list every 30s
  useEffect(() => {
    const interval = setInterval(fetchFriends, 30000);
    return () => clearInterval(interval);
  }, []);

  // Refresh friends when a notification arrives (e.g. friend request accepted)
  useEffect(() => {
    if (notifications.length > 0) {
      fetchFriends();
      fetchPendingRequests();
    }
  }, [notifications.length]);

  const fetchHistory = async () => {
    try {
      const res = await api.get(`/battle/history/${user.id}`);
      setHistory(res.data || []);
    } catch (err) {
      console.error("Failed to fetch history", err);
    }
  };

  const fetchUserRank = async () => {
    try {
      const res = await api.get(`/xp/leaderboard/global?currentUserId=${user.id}`);
      if (res.data.currentUserRank) {
        setUserRank(res.data.currentUserRank);
      }
    } catch (err) {
      console.error("Failed to fetch rank", err);
    }
  };

  const fetchBattleStats = async () => {
    try {
      const res = await api.get(`/auth/me`);
      setBattleStats({
        wins: res.data.battle_wins || 0,
        losses: res.data.battle_losses || 0
      });
    } catch (err) {
      console.error("Failed to fetch battle stats", err);
    }
  };

  const fetchFriends = async () => {
    setLoading(true);
    try {
      const res = await api.get("/auth/friends");
      const friendsData = res.data;

      if (friendsData.length > 0) {
        try {
          const userIds = friendsData.map(f => f.id);
          const onlineRes = await api.post('/notifications/online/batch', { userIds });
          const onlineStatusMap = onlineRes.data;

          const friendsWithStatus = friendsData.map(f => ({
            ...f,
            online: !!onlineStatusMap[f.id]
          }));
          setFriends(friendsWithStatus);
        } catch (statusErr) {
          console.error("Failed to fetch online status", statusErr);
          setFriends(friendsData.map(f => ({ ...f, online: false })));
        }
      } else {
        setFriends([]);
      }
    } catch (err) {
      console.error("Failed to fetch friends", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingRequests = async () => {
    try {
      const res = await api.get("/auth/friend-requests/pending");
      setPending(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchSubjects = async () => {
    try {
      const res = await api.get("/content/subjects");
      setSubjects(Array.isArray(res.data) ? res.data : res.data.subjects);
    } catch(err) {
      console.error(err);
    }
  };

  const handleSearch = async () => {
    if (!query) return;
    try {
      const res = await api.get(`/auth/users/search?q=${query}`);
      setSearchResults(res.data);
      setMessage("");
    } catch (err) {
      console.error(err);
      setMessage("Search failed");
    }
  };

  const sendRequest = async (id, username) => {
    try {
      await api.post("/auth/friend-request", { receiverId: id });
      setMessage("Request sent!");
      setSearchResults([]);
      setQuery("");
      // Real-time bell notification to receiver
      socket?.emit('notification:relay', {
        toUserId: id,
        type: 'friend_request',
        fromUserId: user?.id,
        message: `${user?.username} sent you a friend request!`
      });
    } catch (err) {
      setMessage(err.response?.data?.error || "Failed to send");
    }
  };

  const respondRequest = async (id, action) => {
    try {
      await api.post("/auth/friend-request/respond", {
        requesterId: id,
        action,
      });
      fetchPendingRequests();
      if (action === "accept") fetchFriends();
    } catch (err) {
      console.error(err);
    }
  };

  const handleChallengeClick = (friend) => {
    setSelectedFriend(friend);
    setIsModalOpen(true);
  };

  const confirmChallenge = async () => {
    if (!selectedSubjectId || !selectedFriend || loadingLevels) return;

    setLoadingLevels(true);
    try {
        const subject = subjects.find(s => s.id === selectedSubjectId);
        const subDetailRes = await api.get(`/content/subjects/${selectedSubjectId}`);
        const levels = subDetailRes.data.levels;
        
        if (!levels || levels.length === 0) {
            setMessage("No levels found for this subject.");
            return;
        }

        const level1 = levels.find(l => l.level_number === 1) || levels[0];
        navigate(`/battle/waiting/${selectedFriend.id}?subjectId=${selectedSubjectId}&subjectName=${encodeURIComponent(subject.name)}&levelId=${level1.id}&levelNumber=${level1.level_number}`);
    } catch (err) {
        console.error("Failed to fetch subject levels:", err);
    } finally {
        setLoadingLevels(false);
    }
  };

  const handleCreateGroup = () => navigate("/battle/host");
  const handleJoinGroup = () => {
    if (roomCode.length === 6) navigate(`/battle/lobby/${roomCode}`);
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 py-12 pb-24">
        {/* Banner Section */}
        <div className="relative mb-12 overflow-hidden rounded-[40px] bg-gradient-to-br from-[#8B2500] to-[#5C1800] p-12 text-white shadow-2xl">
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="text-center md:text-left">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md mb-4 border border-white/20">
                <Swords className="w-4 h-4 text-[#FFD700]" />
                <span className="text-xs font-black uppercase tracking-[0.2em]">Grand Arena</span>
              </div>
              <h1 className="text-5xl md:text-6xl font-black mb-4 tracking-tight leading-tight">Prove Your <span className="text-[#FFD700]">Wisdom.</span></h1>
              <p className="text-white/70 font-medium text-lg max-w-lg mb-8 italic">"In the arena of knowledge, only the curious emerge as victors." — Gnosis Sage</p>
              
              <div className="flex flex-wrap gap-4 justify-center md:justify-start">
                <button
                  onClick={handleCreateGroup}
                  className="px-8 py-4 bg-[#FFD700] text-[#8B2500] rounded-2xl font-black text-sm uppercase tracking-wider hover:scale-105 transition-transform shadow-xl flex items-center gap-3"
                >
                  <Crown className="w-5 h-5" /> Host Battle
                </button>
                <div className="flex bg-white/10 backdrop-blur-md rounded-2xl p-1 border border-white/20">
                  <input
                    type="text"
                    placeholder="Enter Code..."
                    value={roomCode}
                    onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                    maxLength={6}
                    className="bg-transparent border-none outline-none px-4 py-2 text-white font-black placeholder:text-white/40 w-32 tracking-[0.2em]"
                  />
                  <button
                    onClick={handleJoinGroup}
                    className="px-6 py-2 bg-white text-[#8B2500] rounded-xl font-black text-sm hover:scale-105 transition-transform"
                  >
                    Join
                  </button>
                </div>
              </div>
            </div>
            
            <div className="hidden lg:block relative">
               <div className="w-64 h-64 bg-white/10 rounded-full flex items-center justify-center animate-pulse">
                  <Swords className="w-32 h-32 text-white/20" />
               </div>
               <div className="absolute -top-4 -right-4 bg-white rounded-3xl p-6 shadow-2xl rotate-12">
                  <Trophy className="w-12 h-12 text-[#FFD700]" />
               </div>
            </div>
          </div>
          
          {/* Decorative shapes */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-black/10 rounded-full translate-y-1/2 -translate-x-1/2 blur-3xl"></div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Left Column: Friends & Social */}
          <div className="lg:col-span-1 space-y-8">
            {/* Quick 1v1 Action */}
            <div className="bg-[#8B2500] rounded-[32px] p-1 shadow-lg overflow-hidden group">
               <button 
                  onClick={() => friends.length > 0 ? handleChallengeClick(friends[0]) : setMessage("Add scholars to challenge!")}
                  className="w-full bg-white rounded-[28px] p-6 flex items-center justify-between hover:bg-[#8B2500] hover:text-white transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-[#FFE4CC] group-hover:bg-white/20 flex items-center justify-center">
                      <Swords className="w-6 h-6 text-[#8B2500] group-hover:text-white" />
                    </div>
                    <div className="text-left">
                       <h4 className="font-black text-sm uppercase tracking-wider">Ancient Duel</h4>
                       <p className="text-[10px] font-bold opacity-60">1-on-1 Battle for glory</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 opacity-40 group-hover:opacity-100" />
               </button>
            </div>

            <div className="bg-white rounded-[32px] border border-[#E8DFD1] shadow-xl overflow-hidden p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-black text-[#1a1a1a] text-lg flex items-center gap-2">
                  <Users className="w-5 h-5 text-[#8B2500]" /> Scholars
                </h3>
                <button 
                  onClick={fetchFriends}
                  className="p-2 hover:bg-[#FAF7F2] rounded-xl transition-colors text-[#8a8a8a]"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {/* Add Scholar Search */}
              <div className="relative mb-6">
                <input
                  type="text"
                  placeholder="Invite more scholars..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="w-full bg-[#FAF7F2] border-2 border-transparent focus:border-[#8B2500] rounded-2xl py-4 pl-12 pr-4 text-sm font-bold text-[#1a1a1a] outline-none transition-all"
                />
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8a8a8a] w-5 h-5" />
              </div>

              {/* Search Results */}
              <AnimatePresence>
                {searchResults.length > 0 && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="mb-6 space-y-2"
                  >
                    {searchResults.map((res) => (
                      <div key={res.id} className="flex items-center gap-3 p-3 bg-[#FFF4E5] rounded-2xl border border-[#FFE4CC]">
                        <div className="w-10 h-10 rounded-xl overflow-hidden bg-white">
                          <img src={imageMap?.avatars?.[res.id] || `https://api.dicebear.com/7.x/avataaars/svg?seed=${res.username}`} alt="" />
                        </div>
                        <div className="flex-1">
                          <p className="font-bold text-xs text-[#1a1a1a]">{res.username}</p>
                          <p className="text-[10px] font-black text-[#D4641A] uppercase">{res.total_xp} XP</p>
                        </div>
                        <button 
                          onClick={() => sendRequest(res.id, res.username)}
                          className="bg-[#1a1a1a] text-white p-2 rounded-lg hover:scale-105 transition-transform"
                        >
                          <UserPlus className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Pending Invites */}
              {pending.length > 0 && (
                <div className="mb-6 p-4 bg-[#8B2500]/5 rounded-2xl border border-[#8B2500]/10">
                  <p className="text-[10px] font-black text-[#8B2500] uppercase tracking-widest mb-3 flex items-center gap-2">
                    <Inbox className="w-3 h-3" /> Challenges Sent to You
                  </p>
                  <div className="space-y-2">
                    {pending.map((req) => (
                      <div key={req.id} className="flex items-center justify-between">
                        <span className="font-bold text-sm text-[#1a1a1a] truncate max-w-[120px]">{req.requester.username}</span>
                        <div className="flex gap-1">
                          <button onClick={() => respondRequest(req.requester.id, "accept")} className="text-[9px] font-black bg-[#8B2500] text-white px-3 py-1.5 rounded-lg">ACCEPT</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Scholar List */}
              <div className="space-y-2 overflow-y-auto max-h-[400px] pr-2 custom-scrollbar">
                {friends.length > 0 ? (
                  friends.map((friend) => (
                    <motion.div
                      layout
                      key={friend.id}
                      className="group flex items-center gap-4 p-4 rounded-3xl hover:bg-[#FAF7F2] border-2 border-transparent hover:border-[#E8DFD1] transition-all cursor-pointer"
                      onClick={() => handleChallengeClick(friend)}
                    >
                      <div className="relative">
                        <div className="w-14 h-14 rounded-2xl overflow-hidden border-2 border-white shadow-md bg-[#F0E6D2]">
                          <img src={imageMap?.avatars?.[friend.id] || `https://api.dicebear.com/7.x/avataaars/svg?seed=${friend.username}`} alt="" />
                        </div>
                        <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white transition-colors ${friend.online ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-[#1a1a1a] group-hover:text-[#8B2500] transition-colors">{friend.username}</p>
                        <p className="text-[10px] font-black text-[#8a8a8a] uppercase tracking-wider">{friend.online ? 'Ready for Duel' : 'Ancient Slumber'}</p>
                      </div>
                      <div className="w-10 h-10 rounded-xl bg-white border border-[#E8DFD1] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Swords className="w-5 h-5 text-[#8B2500]" />
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="py-12 text-center">
                    <div className="w-16 h-16 bg-[#FAF7F2] rounded-full flex items-center justify-center mx-auto mb-4">
                      <Users className="w-8 h-8 text-[#E8DFD1]" />
                    </div>
                    <p className="text-[#8a8a8a] font-bold">No scholars in your circle yet.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Status & History */}
          <div className="lg:col-span-2 space-y-12">
            {/* Arena Status */}
            <div>
              <h3 className="font-black text-[#1a1a1a] text-xl uppercase tracking-tighter mb-6 italic flex items-center gap-3">
                <Shield className="w-6 h-6 text-[#D4641A]" /> Arena Status
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-[32px] p-6 border border-[#E8DFD1] shadow-lg hover:shadow-xl transition-shadow group">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-[#FFF4E5] flex items-center justify-center">
                      <Zap className="w-6 h-6 text-[#D4641A]" />
                    </div>
                    <div>
                      <h4 className="font-black text-[#1a1a1a] text-sm">Winning Streak</h4>
                      <p className="text-[10px] font-black text-[#8a8a8a] uppercase tracking-widest leading-none mt-1">Consistency is key</p>
                    </div>
                  </div>
                  <div className="flex items-end gap-2">
                    <span className="text-4xl font-black text-[#1a1a1a]">{user.streak_count || 0}</span>
                    <span className="text-xs font-bold text-[#8a8a8a] mb-1.5 uppercase">Arena Victories</span>
                  </div>
                  <div className="mt-4 h-2 bg-[#FAF7F2] rounded-full overflow-hidden">
                    <div className="h-full bg-[#D4641A] rounded-full" style={{ width: `${Math.min((user.streak_count || 0) * 10, 100)}%` }}></div>
                  </div>
                </div>

                <div className="bg-white rounded-[32px] p-6 border border-[#E8DFD1] shadow-lg hover:shadow-xl transition-shadow">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-[#8B2500]/10 flex items-center justify-center">
                      <Crown className="w-6 h-6 text-[#8B2500]" />
                    </div>
                    <div>
                      <h4 className="font-black text-[#1a1a1a] text-sm">Current Prestige</h4>
                      <p className="text-[10px] font-black text-[#8a8a8a] uppercase tracking-widest leading-none mt-1">Tier: Master Scholar</p>
                    </div>
                  </div>
                  <div className="flex items-end gap-2">
                    <span className="text-4xl font-black text-[#1a1a1a]">#{userRank || '??'}</span>
                    <span className="text-xs font-bold text-[#8a8a8a] mb-1.5 uppercase">Local Rank</span>
                  </div>
                  <div className="mt-4 flex gap-1">
                    {[1,2,3,4,5].map(i => <div key={i} className={`h-1.5 flex-1 rounded-full ${userRank && userRank <= (6-i)*10 ? 'bg-[#8B2500]' : 'bg-[#FAF7F2]'}`}></div>)}
                  </div>

                  <div className="mt-5 flex gap-3">
                    <div className="flex-1 bg-green-50 rounded-2xl p-3 text-center border border-green-100">
                      <p className="text-xl font-black text-green-700">{battleStats.wins}</p>
                      <p className="text-[10px] font-black uppercase text-green-600 tracking-widest">Wins</p>
                    </div>
                    <div className="flex-1 bg-red-50 rounded-2xl p-3 text-center border border-red-100">
                      <p className="text-xl font-black text-red-700">{battleStats.losses}</p>
                      <p className="text-[10px] font-black uppercase text-red-500 tracking-widest">Losses</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Battle History */}
            <div>
              <div className="flex items-center justify-between mb-6">
                 <h3 className="font-black text-[#1a1a1a] text-xl uppercase tracking-tighter italic flex items-center gap-3">
                   <History className="w-6 h-6 text-[#8a8a8a]" /> Battle History
                 </h3>
                 <button className="text-xs font-black text-[#8B2500] hover:underline uppercase tracking-widest">View All</button>
              </div>
              
              <div className="bg-white rounded-[40px] border border-[#E8DFD1] shadow-xl overflow-hidden">
                <div className="divide-y divide-[#FAF7F2]">
                   {history.length > 0 ? history.map((b, i) => {
                     const is1v1 = b.type === '1v1';
                     const results = b.results || [];
                     
                     // For 1v1: determine winner/loser/draw
                     const isDraw    = is1v1 && (b.winner_id === null || b.winner_id === undefined);
                     const isWinner  = is1v1 && !isDraw && String(b.winner_id) === String(user.id);
                     const isLoser   = is1v1 && !isDraw && !isWinner;
                     
                     // For group: find user's rank
                     const userRank = is1v1 ? null : results.findIndex(p => String(p.userId) === String(user.id)) + 1;
                     
                     // Get opponent for 1v1, or generic text for group
                     const other     = is1v1 ? b.participants.find(p => String(p.userId) !== String(user.id)) : null;

                     // Display logic
                     let iconBg, labelText, labelColor, xpText, resultVerb;
                     
                     if (is1v1) {
                       iconBg    = isDraw ? 'bg-yellow-50' : isWinner ? 'bg-green-50' : 'bg-red-50';
                       labelText = isDraw ? 'Draw'         : isWinner ? 'Victory'     : 'Defeat';
                       labelColor = isDraw ? 'text-yellow-600' : isWinner ? 'text-green-600' : 'text-red-500';
                       xpText    = isDraw ? '±XP'          : isWinner ? '+XP'         : '-';
                       resultVerb = isDraw ? 'Drew with'   : isWinner ? 'Defeated'    : 'Lost to';
                     } else {
                       // Group quiz: rank-based display
                       const rankOrdinal = ['', 'st', 'nd', 'rd'][userRank] || 'th';
                       iconBg = 'bg-blue-50';
                       labelText = `Ranked ${userRank}${rankOrdinal}`;
                       labelColor = 'text-blue-600';
                       xpText = '+XP';
                       resultVerb = `Competed in`;
                     }

                     return (
                       <div key={b.id} className="flex items-center gap-6 p-6 hover:bg-[#FAF7F2] transition-colors group">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs ${iconBg}`}>
                            {is1v1 ? (isDraw ? '=' : isWinner ? <Zap className="w-5 h-5 text-[#FFD700]" /> : <Swords className="w-5 h-5 text-red-400" />) : <Trophy className="w-5 h-5 text-blue-500" />}
                          </div>
                          <div className="flex-1">
                            <p className="font-bold text-[#1a1a1a]">
                              {is1v1 ? `${resultVerb} "${other?.username || 'Opponent'}"` : `${resultVerb} ${b.subject_name || 'Quiz'}`}
                            </p>
                            <p className="text-[10px] font-black text-[#8a8a8a] uppercase tracking-widest">
                              {new Date(b.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                              {b.subject_name ? ` • ${b.subject_name}` : ''}
                              {' • '}{is1v1 ? '1v1 Duel' : `Group · ${b.participants?.length || 0} Players`}
                            </p>
                          </div>
                          <div className="text-right">
                             <p className={`${is1v1 ? (isDraw ? 'text-yellow-600' : isWinner ? 'text-green-600' : 'text-red-600') : 'text-blue-600'} font-black italic`}>
                               {xpText}
                             </p>
                             <p className={`text-[10px] font-bold uppercase ${labelColor}`}>
                               {labelText}
                             </p>
                          </div>
                          {is1v1 && (
                            <button
                              onClick={(e) => { e.stopPropagation(); navigate(`/battle/review/${b.id}`); }}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-[#E8DFD1] text-[#8B2500] text-[10px] font-black uppercase tracking-wider hover:bg-[#FFF4E5] transition-colors opacity-0 group-hover:opacity-100"
                              title="Review answers"
                            >
                              <BookOpen className="w-3 h-3" /> Review
                            </button>
                          )}
                          <ChevronRight className="w-5 h-5 text-[#E8DFD1] group-hover:text-[#8B2500] transition-colors" />
                       </div>
                     );
                   }) : (
                    <div className="py-12 text-center text-[#8a8a8a] font-bold">No battles fought yet.</div>
                   )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Challenge Modal */}
        <AnimatePresence>
          {isModalOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsModalOpen(false)}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              />
              <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="relative w-full max-w-xl bg-white rounded-[40px] shadow-2xl overflow-hidden"
              >
                <div className="p-8 border-b border-[#FAF7F2] bg-gradient-to-r from-[#8B2500] to-[#5C1800] text-white">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-white/20">
                      <img src={imageMap?.avatars?.[selectedFriend?.id] || `https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedFriend?.username}`} alt="" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-black">Challenge {selectedFriend?.username}</h3>
                      <p className="text-white/60 font-bold text-sm">Choose the field of battle</p>
                    </div>
                  </div>
                </div>

                <div className="p-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
                  <div className="grid grid-cols-2 gap-4 mb-8">
                    {subjects.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => setSelectedSubjectId(s.id)}
                        className={`flex flex-col items-center p-4 rounded-3xl border-2 transition-all ${
                          selectedSubjectId === s.id 
                            ? 'bg-[#FFF4E5] border-[#8B2500] shadow-md scale-105' 
                            : 'bg-white border-[#E8DFD1] hover:border-[#8B2500]/30'
                        }`}
                      >
                        <div className="w-12 h-12 rounded-2xl bg-[#F0E6D2] mb-3 flex items-center justify-center">
                           <Shield className={`w-6 h-6 ${selectedSubjectId === s.id ? 'text-[#8B2500]' : 'text-[#8a8a8a]'}`} />
                        </div>
                        <span className="font-bold text-xs text-[#1a1a1a] text-center">{s.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-8 border-t border-[#FAF7F2]">
                  <div className="flex gap-4">
                    <button
                      disabled={!selectedSubjectId || loadingLevels}
                      onClick={confirmChallenge}
                      className="flex-1 bg-[#8B2500] text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] transition-transform flex items-center justify-center gap-2"
                    >
                      {loadingLevels ? 'PREPARING...' : 'SEND CHALLENGE'} <ArrowRight className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setIsModalOpen(false)}
                      className="px-8 bg-[#FAF7F2] text-[#8a8a8a] py-4 rounded-2xl font-black text-sm uppercase tracking-widest hover:text-[#1a1a1a] transition-colors"
                    >
                      WAIT
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </Layout>
  );
}
