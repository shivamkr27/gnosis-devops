import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore, useSocketStore } from '../lib/store';
import { motion, AnimatePresence } from 'framer-motion';
import { Swords, X, Check } from 'lucide-react';

const ChallengeManager = () => {
    const { user } = useAuthStore();
    const { socket } = useSocketStore();
    const [challenge, setChallenge] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        if (!socket) return;
        
        const handleChallenge = (data) => {
            console.log("Challenge received:", data);
            setChallenge(data);
            
            // Auto-dismiss after 60 seconds
            setTimeout(() => {
                setChallenge(prev => prev?.fromUserId === data.fromUserId ? null : prev);
            }, 60000);
        };

        const handleAccepted = ({ roomCode }) => {
            setChallenge(null);
            navigate(`/battle/lobby/${roomCode}?type=1v1`);
        };

        const handleRejected = () => {
             // Optional: show a small toast that they rejected
        };

        socket.on('challenge:received', handleChallenge);
        socket.on('challenge:accepted', handleAccepted);
        socket.on('challenge:rejected', handleRejected);

        return () => {
            socket.off('challenge:received', handleChallenge);
            socket.off('challenge:accepted', handleAccepted);
            socket.off('challenge:rejected', handleRejected);
        };
    }, [socket, navigate]);

    const handleAccept = () => {
        if (!challenge || !socket) return;
        
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
                        <div className="w-12 h-12 bg-[#FFF4E5] rounded-full flex items-center justify-center text-[#D4641A]">
                            <Swords className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-[#1a1a1a]">
                                <span className="text-[#8B2500]">{challenge.fromUsername}</span> challenged you!
                            </p>
                            <p className="text-[10px] text-[#6b6b6b] uppercase font-bold tracking-wider">
                                {challenge.subjectName} • Level {challenge.levelNumber}
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
