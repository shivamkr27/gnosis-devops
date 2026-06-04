import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore, useSocketStore } from '../lib/store';
import { motion, AnimatePresence } from 'framer-motion';
import { Swords, X, Check } from 'lucide-react';

const TIMEOUT_SECONDS = 10;

const ChallengeManager = () => {
    const { user } = useAuthStore();
    const { socket } = useSocketStore();
    const [challenge, setChallenge] = useState(null);
    const [countdown, setCountdown] = useState(TIMEOUT_SECONDS);
    const timerRef = useRef(null);
    const countdownRef = useRef(null);
    const navigate = useNavigate();

    const clearTimers = () => {
        if (timerRef.current) clearTimeout(timerRef.current);
        if (countdownRef.current) clearInterval(countdownRef.current);
    };

    useEffect(() => {
        if (!socket) return;

        const handleChallenge = (data) => {
            clearTimers();
            setChallenge(data);
            setCountdown(TIMEOUT_SECONDS);

            // Countdown tick
            countdownRef.current = setInterval(() => {
                setCountdown(prev => {
                    if (prev <= 1) {
                        clearInterval(countdownRef.current);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);

            // Auto-dismiss after 10s
            timerRef.current = setTimeout(() => {
                setChallenge(null);
                setCountdown(TIMEOUT_SECONDS);
            }, TIMEOUT_SECONDS * 1000);
        };

        const handleAccepted = ({ roomCode }) => {
            clearTimers();
            setChallenge(null);
            navigate(`/battle/lobby/${roomCode}?type=1v1`);
        };

        const handleRejected = () => {
            clearTimers();
            setChallenge(null);
        };

        socket.on('challenge:received', handleChallenge);
        socket.on('challenge:accepted', handleAccepted);
        socket.on('challenge:rejected', handleRejected);

        return () => {
            clearTimers();
            socket.off('challenge:received', handleChallenge);
            socket.off('challenge:accepted', handleAccepted);
            socket.off('challenge:rejected', handleRejected);
        };
    }, [socket, navigate]);

    const handleAccept = () => {
        if (!challenge || !socket) return;
        clearTimers();
        socket.emit('challenge:respond', {
            accepted: true,
            fromUserId: challenge.fromUserId,
            subjectId: challenge.subjectId,
            levelId: challenge.levelId,
            subjectName: challenge.subjectName,
            levelNumber: challenge.levelNumber
        });
        setChallenge(null);
    };

    const handleDecline = () => {
        if (!challenge || !socket) return;
        clearTimers();
        socket.emit('challenge:respond', {
            accepted: false,
            fromUserId: challenge.fromUserId
        });
        setChallenge(null);
    };

    if (!challenge) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ y: -100, opacity: 0 }}
                animate={{ y: 20, opacity: 1 }}
                exit={{ y: -100, opacity: 0 }}
                className="fixed top-0 left-0 right-0 z-[9999] flex justify-center px-4"
            >
                <div className="w-full max-w-md bg-white rounded-2xl border-2 border-[#D4641A] p-4 shadow-2xl flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="relative w-12 h-12 bg-[#FFF4E5] rounded-full flex items-center justify-center text-[#D4641A]">
                            <Swords className="w-6 h-6" />
                            {/* Countdown ring */}
                            <svg className="absolute inset-0 w-12 h-12 -rotate-90">
                                <circle cx="24" cy="24" r="22" fill="none" stroke="#D4641A" strokeWidth="2"
                                    strokeDasharray={`${2 * Math.PI * 22}`}
                                    strokeDashoffset={`${2 * Math.PI * 22 * (1 - countdown / TIMEOUT_SECONDS)}`}
                                    className="transition-all duration-1000"
                                />
                            </svg>
                        </div>
                        <div>
                            <p className="text-sm font-bold text-[#1a1a1a]">
                                <span className="text-[#8B2500]">{challenge.fromUsername}</span> challenged you!
                            </p>
                            <p className="text-[10px] text-[#6b6b6b] uppercase font-bold tracking-wider">
                                {challenge.subjectName} • Level {challenge.levelNumber} • {countdown}s
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={handleDecline}
                            className="p-2 bg-[#F5F5F5] text-[#6b6b6b] rounded-xl hover:bg-[#E8E8E8] transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                        <button
                            onClick={handleAccept}
                            className="p-2 bg-gradient-to-r from-[#D4641A] to-[#8B2500] text-white rounded-xl shadow-md hover:scale-105 transition-transform"
                        >
                            <Check className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
};

export default ChallengeManager;
