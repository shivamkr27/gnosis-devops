import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import Layout from "../components/Layout";
import { useAuthStore, useAppStore, useSocketStore } from "../lib/store";
import {
  Users, Copy, Trophy, CheckCircle2, Home, RotateCcw,
  Settings, HelpCircle, Mic, Zap, Award, MessageSquare, BookOpen
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const optionMap = [
  ["A", "option_a"],
  ["B", "option_b"],
  ["C", "option_c"],
  ["D", "option_d"],
];

export default function ParticipantLobby() {
  const { code } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { imageMap } = useAppStore();
  const { socket } = useSocketStore();
  
  const queryParams = new URLSearchParams(location.search);
  const isHost = queryParams.get("host") === "1";
  const initialType = queryParams.get("type") || "";
  
  const [players, setPlayers] = useState([]);
  const [quizName, setQuizName] = useState("");
  const [roomType, setRoomType] = useState(initialType);
  const [error, setError] = useState("");
  const [starting, setStarting] = useState(false);
  const [questionPayload, setQuestionPayload] = useState(null);
  const [selected, setSelected] = useState(null);
  const [answerResult, setAnswerResult] = useState(null);
  const [results, setResults] = useState(null);
  const [timeLeft, setTimeLeft] = useState(-1);
  const [waitingForOpponent, setWaitingForOpponent] = useState(false);
  const [opponentTimeLeft, setOpponentTimeLeft] = useState(0);
  const [opponentName, setOpponentName] = useState("");
  const [codeCopied, setCodeCopied] = useState(false);
  const opponentTimerRef = useRef(null);

  // Answer tracking for post-battle review
  const questionsMapRef = useRef({});
  const pendingAnswerOptionsRef = useRef({});
  const battleAnswersRef = useRef([]);

  const copyRoomCode = () => {
    const text = code;
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(() => { setCodeCopied(true); setTimeout(() => setCodeCopied(false), 2000); });
    } else {
      // HTTP fallback
      const el = document.createElement('textarea');
      el.value = text;
      el.style.position = 'fixed';
      el.style.opacity = '0';
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    }
  };

  const question = questionPayload?.question;
  const options = useMemo(() => {
    if (!question) return [];
    return optionMap.map(([id, key]) => ({ id, text: question[key] }));
  }, [question]);

  // Countdown timer logic
  useEffect(() => {
    if (!question || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [question, timeLeft]);

  // Auto-submit empty answer when timer hits 0 without a selection
  useEffect(() => {
    if (timeLeft !== 0 || !question || selected !== null) return;
    setSelected("__timeout__");
    pendingAnswerOptionsRef.current[question.id] = [];
    socket?.emit("quiz:answer", {
      roomCode: code,
      questionId: question.id,
      selectedOptions: [],
    });
  }, [timeLeft, question, selected, socket, code]);

  useEffect(() => {
    if (!socket || !user?.id) return undefined;

    const emitJoin = () => {
      socket.emit(isHost ? "room:host_join" : "room:join", {
        roomCode: code,
        userId: user.id,
        username: user.username,
      });
    };

    if (socket.connected) {
      emitJoin();
    } else {
      socket.on("connect", emitJoin);
    }

    socket.on("room:joined", (payload) => {
      setQuizName(payload.quizName || "");
      setRoomType(payload.type || "");
      setPlayers(payload.players || []);
      setError("");
    });
    socket.on("room:players", ({ players: nextPlayers }) => setPlayers(nextPlayers || []));
    socket.on("room:player_joined", ({ players: nextPlayers }) => setPlayers(nextPlayers || []));
    socket.on("room:error", ({ message }) => setError(message));
    socket.on("room:cancelled", ({ message }) => {
      navigate("/battle", { replace: true, state: { cancelledMessage: message } });
    });
    socket.on("quiz:error", ({ message }) => setError(message));
    socket.on("quiz:starting", () => {
      setStarting(true);
      setError("");
    });
    socket.on("quiz:question", (payload) => {
      if (opponentTimerRef.current) {
        clearInterval(opponentTimerRef.current);
        opponentTimerRef.current = null;
      }
      setWaitingForOpponent(false);
      setOpponentTimeLeft(0);
      setOpponentName("");
      setQuestionPayload(payload);
      setTimeLeft(payload.timerSeconds || 15);
      setSelected(null);
      setAnswerResult(null);
      setStarting(false);
      // Store question for review
      if (payload.question?.id) {
        questionsMapRef.current[payload.question.id] = payload.question;
      }
    });
    socket.on("quiz:answer_result", (payload) => {
      setAnswerResult(payload);
      // Build answer record for review
      const q = questionsMapRef.current[payload.questionId];
      if (q) {
        battleAnswersRef.current.push({
          question: q,
          selectedOptions: (pendingAnswerOptionsRef.current[payload.questionId] || []).map(s => String(s).toUpperCase()),
          correct: payload.correct,
          correctOptions: (payload.correctOptions || []).map(s => String(s).toUpperCase()),
          explanation: payload.explanation || ''
        });
      }
    });
    socket.on("quiz:answer_rejected", ({ reason }) => {
      setAnswerResult({ correct: false, xpEarned: 0, explanation: reason });
    });
    socket.on("quiz:opponent_finishing", ({ opponentName: nextOpponentName, secondsRemaining }) => {
      if (opponentTimerRef.current) {
        clearInterval(opponentTimerRef.current);
        opponentTimerRef.current = null;
      }

      setWaitingForOpponent(true);
      setOpponentName(nextOpponentName || "Opponent");
      setOpponentTimeLeft(Math.max(0, secondsRemaining || 0));

      opponentTimerRef.current = setInterval(() => {
        setOpponentTimeLeft((prev) => {
          if (prev <= 1) {
            if (opponentTimerRef.current) {
              clearInterval(opponentTimerRef.current);
              opponentTimerRef.current = null;
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    });
    socket.on("quiz:results", (payload) => {
        if (opponentTimerRef.current) {
          clearInterval(opponentTimerRef.current);
          opponentTimerRef.current = null;
        }
        setWaitingForOpponent(false);
        setOpponentTimeLeft(0);
        setOpponentName("");
        setResults(payload);
    });

    return () => {
      if (opponentTimerRef.current) {
        clearInterval(opponentTimerRef.current);
        opponentTimerRef.current = null;
      }
      socket.off("connect", emitJoin);
      socket.off("room:joined");
      socket.off("room:players");
      socket.off("room:player_joined");
      socket.off("room:error");
      socket.off("room:cancelled");
      socket.off("quiz:error");
      socket.off("quiz:starting");
      socket.off("quiz:question");
      socket.off("quiz:answer_result");
      socket.off("quiz:answer_rejected");
      socket.off("quiz:opponent_finishing");
      socket.off("quiz:results");
    };
  }, [code, isHost, user, navigate, socket]);

  const startQuiz = () => {
    socket?.emit("host:start_quiz", { roomCode: code });
  };

  const cancelRoom = () => {
    // Direct cancel — no native dialog
    socket?.emit("host:cancel", { roomCode: code });
  };

  const leaveRoom = () => {
    socket?.emit("room:leave", { roomCode: code });
    navigate("/battle");
  };

  const submitAnswer = (optionId) => {
    if (!question || selected || timeLeft <= 0) return;
    setSelected(optionId);
    const selectedOptions = [optionId];
    pendingAnswerOptionsRef.current[question.id] = selectedOptions;
    socket?.emit("quiz:answer", {
      roomCode: code,
      questionId: question.id,
      selectedOptions,
    });
  };

  if (results) {
    // Use winnerId from server — only reliable source
    // Draw is true only if:
    // 1. It's a 1v1 battle
    // 2. Winner ID is null (both players have equal scores)
    // 3. Both players actually answered (not both zero from inactivity)
    const is1v1 = roomType === '1v1';
    const hasWinner = results.winnerId !== null && results.winnerId !== undefined;
    const isDraw = is1v1 && !hasWinner && results.top3 && results.top3.length === 2 && 
                   results.top3[0] && results.top3[1] && 
                   results.top3[0].score > 0 && results.top3[0].score === results.top3[1].score;
    
    const isWinner = !isDraw && is1v1 && hasWinner && results.winnerId === user?.id;
    const opponent = players.find(p => p.userId !== user?.id);

    const accentColor = isDraw ? 'bg-yellow-400' : isWinner ? 'bg-green-500' : 'bg-red-500';
    const trophyColor = isDraw ? 'text-yellow-500' : isWinner ? 'text-[#D4641A]' : 'text-[#8a8a8a]';
    const trophyBg    = isDraw ? 'bg-yellow-50'   : isWinner ? 'bg-[#FFF4E5]'  : 'bg-[#F5F5F5]';

    let headline = 'Battle Results';
    if (is1v1) {
      if (isDraw)        headline = 'HONOURABLE DRAW';
      else if (isWinner) headline = 'COLOSSAL VICTORY!';
      else               headline = 'VALIANT DEFEAT';
    }

    return (
      <Layout>
        <div className="mx-auto flex min-h-[80vh] max-w-2xl flex-col justify-center p-4 md:p-8">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="rounded-[2.5rem] border-2 border-[#E8DFD1] bg-white p-10 text-center shadow-xl relative overflow-hidden"
          >
            {/* Background Accent */}
            <div className={`absolute top-0 left-0 right-0 h-2 ${accentColor}`}></div>

            <div className="mb-8 relative inline-block">
               <div className={`w-32 h-32 rounded-full flex items-center justify-center mx-auto mb-4 ${trophyBg}`}>
                  <Trophy className={`w-16 h-16 ${trophyColor}`} />
               </div>
               {isWinner && (
                 <motion.div 
                   animate={{ rotate: 360 }}
                   transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                   className="absolute inset-0 -m-4 border-2 border-dashed border-[#D4641A]/20 rounded-full"
                 />
               )}
            </div>

            <h1 className="mb-2 text-4xl font-black text-[#1a1a1a]">
              {headline}
            </h1>
            
            <p className="text-[#6b6b6b] mb-10 font-bold uppercase tracking-widest text-xs">
              {roomType === '1v1' 
                ? `Ancient Duel with ${opponent?.username || 'Opponent'}` 
                : "Top performance in the Arena"}
            </p>

            <div className="space-y-4 mb-10">
              {(results.top3 || []).map((player, index) => {
                const isMe = player.userId === user?.id;
                return (
                  <div key={player.userId} className={`flex items-center justify-between rounded-2xl p-6 border-2 transition-all ${isMe ? "border-[#D4641A] bg-[#FFF8F0] scale-[1.02] shadow-md" : "border-[#F0EDE8] bg-[#FAF7F2]"}`}>
                    <div className="flex items-center gap-4">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black ${index === 0 ? 'bg-[#D4641A] text-white' : 'bg-[#E8DFD1] text-[#6E675F]'}`}>
                        {index + 1}
                      </div>
                      <span className="font-bold text-[#1a1a1a] text-lg">{player.username}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-black text-2xl text-[#8B2500] block">{player.score}</span>
                      <span className="text-[10px] font-black uppercase text-[#D4641A]">XP Earned</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <button
                onClick={() => navigate("/battle")}
                className="rounded-2xl border-2 border-[#E8DFD1] py-4 font-black text-[#6E675F] hover:bg-[#FAF7F2] transition-colors"
              >
                RETURN TO ARENA
              </button>
              <button
                onClick={() => navigate("/home")}
                className="rounded-2xl bg-[#8B2500] py-4 font-black text-white shadow-lg shadow-[#8B2500]/20 hover:scale-[1.02] transition-all"
              >
                CONTINUE JOURNEY
              </button>
            </div>
            <button
              onClick={() => navigate('/battle/review/live', {
                state: { answers: battleAnswersRef.current, subjectName: quizName }
              })}
              className="w-full rounded-2xl border-2 border-[#8B2500]/30 py-3 font-black text-sm text-[#8B2500] hover:bg-[#FFF4E5] transition-colors flex items-center justify-center gap-2"
            >
              <BookOpen className="w-4 h-4" /> REVIEW MY ANSWERS
            </button>
          </motion.div>
        </div>
      </Layout>
    );
  }

  if (waitingForOpponent) {
    return (
      <Layout>
        <div className="mx-auto flex min-h-[80vh] max-w-2xl flex-col justify-center p-4 md:p-8">
          <div className="rounded-[2.5rem] border-2 border-[#E8DFD1] bg-white p-10 text-center shadow-xl relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-2 bg-[#D4641A]"></div>

            <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-[#FFF4E5] text-[#D4641A] shadow-sm">
              <Users className="h-12 w-12" />
            </div>

            <h1 className="mb-3 text-4xl font-black text-[#1a1a1a]">You&apos;re done for now</h1>
            <p className="mb-2 text-sm font-black uppercase tracking-[0.3em] text-[#8B2500]">
              {opponentName || "Opponent"} is still completing the quiz
            </p>
            <p className="mb-8 text-[#6b6b6b] font-bold">
              Results will appear automatically once everyone finishes.
            </p>

            <div className="mx-auto mb-8 flex max-w-xs items-center justify-center rounded-3xl border-2 border-[#F0C090] bg-[#FFF8F0] px-6 py-5">
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.3em] text-[#8a8a8a]">Estimated wait</div>
                <div className="text-4xl font-black text-[#8B2500]">{opponentTimeLeft}s</div>
              </div>
            </div>

            <div className="flex items-center justify-center gap-3 text-sm font-bold text-[#6E675F]">
              <div className="h-3 w-3 animate-pulse rounded-full bg-[#D4641A]"></div>
              Waiting for the final answer stream
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (question) {
    // ... existing question logic
    return (
      <Layout>
        <div className="mx-auto max-w-4xl px-4 py-8 md:px-8">
          <div className="mb-8 flex items-center justify-between rounded-3xl border border-[#E8DFD1] bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
               <div className="w-10 h-10 bg-[#FFF4E5] rounded-xl flex items-center justify-center text-[#D4641A] font-bold">{questionPayload.qIndex}</div>
               <div>
                  <p className="text-[10px] font-bold text-[#8a8a8a] uppercase tracking-wider">Question</p>
                  <p className="text-sm font-bold text-[#1a1a1a]">{questionPayload.qIndex} of {questionPayload.total}</p>
               </div>
            </div>
            <div className="w-12 h-12 rounded-full border-4 border-[#F0C090] flex items-center justify-center text-lg font-black text-[#8B2500] shadow-sm bg-white">{timeLeft}</div>
          </div>
          <motion.h1 key={question.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-10 text-center text-3xl md:text-4xl font-extrabold text-[#1a1a1a]">{question.question_text}</motion.h1>
          <div className="relative">
            <div className="grid gap-4 sm:grid-cols-2">
              {options.map((option) => (
                <button 
                  key={option.id} 
                  disabled={!!selected}
                  onClick={() => submitAnswer(option.id)} 
                  className={`rounded-3xl border-2 p-6 text-left transition-all ${
                    selected === option.id 
                      ? "border-[#8B2500] bg-[#FFF4E5] scale-[1.02] shadow-md" 
                      : selected 
                        ? "opacity-50 grayscale-0 border-[#E8DFD1] bg-white"
                        : "border-[#E8DFD1] bg-white hover:border-[#8B2500]/30 hover:bg-[#FAF7F2]"
                  }`}
                >
                  <span className={`text-lg font-bold ${selected === option.id ? "text-[#8B2500]" : "text-[#1a1a1a]"}`}>{option.text}</span>
                </button>
              ))}
            </div>

            <AnimatePresence>
                {selected && !answerResult && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="absolute inset-0 bg-white/40 backdrop-blur-[1px] rounded-[2rem] flex flex-col items-center justify-center z-10"
                    >
                        <div className="bg-white px-8 py-4 rounded-2xl shadow-2xl border-2 border-[#8B2500]/10 flex flex-col items-center gap-3">
                            <div className="w-8 h-8 border-4 border-[#8B2500] border-t-transparent rounded-full animate-spin"></div>
                            <p className="font-black text-[#8B2500] uppercase tracking-widest text-xs">Waiting for Opponent...</p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
          </div>

          <div className="mt-12 flex justify-center">
             <button 
                onClick={isHost ? cancelRoom : leaveRoom}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold bg-red-50 text-red-600 border border-red-100 hover:bg-red-100 transition-colors text-xs uppercase tracking-widest"
             >
                <RotateCcw className="w-4 h-4" /> {isHost ? "Cancel Session" : "Leave Battle"}
             </button>
          </div>
        </div>
      </Layout>
    );
  }

  const hostPlayer = players.find(p => p.isHost) || players[0];
  const otherPlayers = players.filter(p => !p.isHost && p.userId !== hostPlayer?.userId);
  const classReadiness = Math.min(Math.floor((players.length / 5) * 100), 100);

  return (
    <div className="min-h-screen bg-[#FAF9F6] font-sans flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-8 py-4 border-b border-[#E6D8C4] bg-white">
        <h1 className="text-2xl font-black text-[#A34714] tracking-tight">Gnosis</h1>
        <div className="flex items-center gap-6">
          <Zap size={20} className="text-[#6E675F] cursor-pointer" />
          <Award size={20} className="text-[#6E675F] cursor-pointer" />
          <div className="relative">
            <MessageSquare size={20} className="text-[#6E675F] cursor-pointer" />
            <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></div>
          </div>
          <div className="w-10 h-10 rounded-2xl overflow-hidden border-2 border-white shadow-md">
            <img src={imageMap?.avatars?.[user?.id] || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.username}`} alt="My Avatar" />
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Main Center Area */}
        <div className="flex-1 overflow-y-auto p-8 flex flex-col items-center">
            <div className="flex-1 flex flex-col items-center justify-center max-w-2xl w-full">
                {/* Sage Avatar Center */}
                <div className="relative mb-12">
                    <div className="w-48 h-48 rounded-[3rem] overflow-hidden border-8 border-white shadow-2xl skew-y-1 rotate-2">
                        <img 
                            src={imageMap?.tutor_avatar || "https://api.dicebear.com/7.x/bottts/svg?seed=Gnosis"} 
                            alt="Sage" 
                            className="w-full h-full object-cover bg-gradient-to-br from-[#FFF4E5] to-[#F0C090]" 
                        />
                    </div>
                    <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-[#A34714] text-white px-6 py-2 rounded-2xl font-black text-sm shadow-xl whitespace-nowrap border-4 border-white">
                        Level 12 Sage
                    </div>
                </div>

                {/* Question Info Box */}
                <motion.div 
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="bg-white rounded-[2.5rem] p-10 shadow-sm border border-[#E6D8C4] relative mb-12 text-center"
                >
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white px-4">
                        <div className="w-2 h-2 rounded-full bg-orange-200"></div>
                    </div>
                    <h3 className="text-[#A34714] font-black text-xl mb-4">Did you know?</h3>
                    <p className="text-[#6E675F] font-bold text-lg leading-relaxed">
                        "The word 'Gnosis' comes from the Greek word for knowledge, but in our journey, it represents the bridge between ancient wisdom and modern innovation."
                    </p>
                </motion.div>

                {/* Waiting State */}
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-[#A34714] border-t-transparent rounded-full animate-spin"></div>
                    <div className="text-center">
                        <h2 className="text-2xl font-black text-[#2F2C28] mb-1">
                          {roomType === '1v1' ? "Initiating Ancient Duel..." : "Waiting for Host to start..."}
                        </h2>
                        <p className="text-[#6E675F] font-bold tracking-tight">
                          {roomType === '1v1' ? "The scrolls of destiny are being unrolled." : "The session will begin as soon as the host is ready."}
                        </p>
                    </div>
                </div>
            </div>

            {/* Footer Buttons */}
            <div className="w-full flex justify-end gap-3 mt-auto pt-8">
                <div className="bg-white p-3 rounded-2xl border border-[#E6D8C4] shadow-sm cursor-pointer hover:bg-[#FAF7F2] transition-colors">
                    <HelpCircle className="text-[#6E675F]" size={24} />
                </div>
                <div className="bg-white p-3 rounded-2xl border border-[#E6D8C4] shadow-sm cursor-pointer hover:bg-[#FAF7F2] transition-colors">
                    <Settings className="text-[#6E675F]" size={24} />
                </div>
            </div>
        </div>

        {/* Right Sidebar - Participants */}
        <div className="w-96 bg-[#FAF9F6] border-l border-[#E6D8C4] p-8 flex flex-col gap-8">
            <div className="flex items-center justify-between">
                <h3 className="text-xl font-black text-[#2F2C28]">Participants</h3>
                <span className="bg-[#FFF4E5] text-[#A34714] px-3 py-1 rounded-full text-xs font-black">
                    {players.length} Online
                </span>
            </div>

            <div className="space-y-4">
                {roomType === '1v1' ? (
                  players.map((player) => (
                    <div key={player.userId} className="bg-white rounded-[1.5rem] p-4 border border-[#E6D8C4] shadow-sm flex items-center justify-between group">
                        <div className="flex items-center gap-4 overflow-hidden">
                            <div className="w-12 h-12 rounded-2xl overflow-hidden border-2 border-white shadow-sm flex-shrink-0">
                                <img src={imageMap?.avatars?.[player.userId] || `https://api.dicebear.com/7.x/avataaars/svg?seed=${player.username}`} alt="" />
                            </div>
                            <div className="min-w-0">
                                <h4 className="font-bold text-[#2F2C28] truncate">{player.username}</h4>
                                <p className="text-[10px] font-bold text-[#6E675F] truncate">Ready to Duel</p>
                            </div>
                        </div>
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                    </div>
                  ))
                ) : (
                  <>
                    {/* Host Card */}
                    {hostPlayer && (
                        <div className="bg-white rounded-[1.5rem] p-4 border-2 border-[#A34714]/10 shadow-sm relative">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl overflow-hidden border-2 border-white shadow-md">
                                    <img src={imageMap?.avatars?.[hostPlayer.userId] || `https://api.dicebear.com/7.x/avataaars/svg?seed=${hostPlayer.username}`} alt="" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <h4 className="font-black text-[#2F2C28] truncate">{hostPlayer.username}</h4>
                                        <span className="bg-[#A34714] text-[8px] text-white px-2 py-0.5 rounded-lg font-black uppercase">Host</span>
                                    </div>
                                    <p className="text-[10px] font-bold text-[#6E675F] truncate">Mastering {quizName || 'Knowledge'}</p>
                                </div>
                                <Mic size={16} className="text-[#6E675F]" />
                            </div>
                        </div>
                    )}

                    {/* Other Players */}
                    {players.filter(p => p.userId !== hostPlayer?.userId).map(player => (
                        <div key={player.userId} className="bg-white rounded-[1.5rem] p-4 border border-[#E6D8C4] shadow-sm flex items-center justify-between group">
                            <div className="flex items-center gap-4 overflow-hidden">
                                <div className="w-12 h-12 rounded-2xl overflow-hidden grayscale group-hover:grayscale-0 transition-all border-2 border-white shadow-sm flex-shrink-0">
                                    <img src={imageMap?.avatars?.[player.userId] || `https://api.dicebear.com/7.x/avataaars/svg?seed=${player.username}`} alt="" />
                                </div>
                                <div className="min-w-0">
                                    <h4 className="font-bold text-[#2F2C28] truncate">{player.username}</h4>
                                    <p className="text-[10px] font-bold text-[#6E675F] truncate">Checking connections...</p>
                                </div>
                            </div>
                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                        </div>
                    ))}

                    <div className="bg-[#FAF9F6] rounded-[1.5rem] p-4 border-2 border-dashed border-[#E6D8C4] flex items-center gap-4 opacity-50">
                        <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-[#6E675F]">
                            <Users size={20} />
                        </div>
                        <h4 className="font-bold text-[#6E675F]">Waiting for more...</h4>
                    </div>
                  </>
                )}
            </div>

            {/* Room Code Info */}
            <div className="mt-auto bg-[#E6D8C4]/20 rounded-[2rem] p-6 border border-[#E6D8C4]/30">
                {roomType !== '1v1' && (
                  <div className="text-center mb-6">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#A34714] mb-2">Room Entry Code</p>
                      <div className="bg-white rounded-2xl p-4 border-2 border-[#A34714]/20 shadow-inner group">
                          <div className="flex items-center justify-center gap-4">
                              <span className="text-4xl font-black text-[#A34714] tracking-widest">{code}</span>
                              <button
                                  onClick={copyRoomCode}
                                  className="p-2 hover:bg-[#FAF7F2] rounded-xl transition-colors text-[#A34714]/40 hover:text-[#A34714]"
                                  title={codeCopied ? "Copied!" : "Copy code"}
                              >
                                  {codeCopied ? <CheckCircle2 size={20} className="text-green-600" /> : <Copy size={20} />}
                              </button>
                          </div>
                      </div>
                  </div>
                )}

                <div className="flex justify-between items-center mb-4">
                    <span className="text-[10px] font-black uppercase tracking-widest text-[#A34714]">Class Readiness</span>
                    <span className="text-sm font-black text-[#A34714]">{classReadiness}%</span>
                </div>
                <div className="h-3 bg-white rounded-full overflow-hidden mb-4 p-0.5 border border-[#E6D8C4]/50">
                    <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${classReadiness}%` }}
                        className="h-full bg-[#A34714] rounded-full"
                    />
                </div>
                
                {isHost && roomType !== '1v1' ? (
                    <div className="grid grid-cols-5 gap-3 mt-6">
                        <button 
                            onClick={startQuiz}
                            className="col-span-4 bg-[#A34714] text-white py-4 rounded-2xl font-black text-sm shadow-xl active:scale-95 transition-all"
                        >
                            UNLEASH NOW
                        </button>
                        <button 
                            onClick={cancelRoom}
                            className="bg-red-50 text-red-600 border-2 border-red-100 flex items-center justify-center rounded-2xl hover:bg-red-100 transition-colors"
                        >
                            <RotateCcw size={20} />
                        </button>
                    </div>
                ) : (
                    <button 
                        onClick={roomType === '1v1' ? cancelRoom : leaveRoom}
                        className="w-full mt-6 bg-white border-2 border-[#E6D8C4] text-[#6E675F] py-4 rounded-2xl font-black text-sm hover:bg-[#FAF7F2] transition-colors"
                    >
                        {roomType === '1v1' ? "ABANDON BATTLE" : "LEAVE ARENA"}
                    </button>
                )}
            </div>
        </div>
      </div>
    </div>
  );
}
