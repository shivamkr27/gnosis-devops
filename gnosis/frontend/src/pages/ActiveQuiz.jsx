import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../lib/api";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, X, CheckCircle, XCircle } from "lucide-react";
import { useAuthStore } from "../lib/store";

const optionMap = [
  ["A", "option_a"],
  ["B", "option_b"],
  ["C", "option_c"],
  ["D", "option_d"],
];

export default function ActiveQuiz() {
  const { levelId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [startTime, setStartTime] = useState(Date.now());
  const [timeLeft, setTimeLeft] = useState(20);
  const [selectedOptions, setSelectedOptions] = useState([]);
  const [result, setResult] = useState(null);

  // XP Tracking
  const [initialTotalXp, setInitialTotalXp] = useState(0);
  const [sessionXp, setSessionXp] = useState(0);

  const [correctCount, setCorrectCount] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [quizStartTime] = useState(Date.now());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);

  const optionAccentMap = {
    A: "#B0681B",
    B: "#D48C2B",
    C: "#8B5E34",
    D: "#C97A34",
  };

  const question = questions[currentIndex];
  const timerSeconds = question?.timer_seconds || 20;
  const isMultiCorrect = question?.question_type === "multi_correct";

  const options = useMemo(() => {
    if (!question) return [];
    return optionMap.map(([id, key]) => ({ id, text: question[key] }));
  }, [question]);

  // Fetch Questions and Initial XP
  useEffect(() => {
    const initQuiz = async () => {
      try {
        // Fetch current XP and questions in parallel
        const [userRes, qRes] = await Promise.all([
          api.get("/auth/me"),
          api.get(`/content/levels/${levelId}/questions`),
        ]);

        setInitialTotalXp(userRes.data.xp || 0);

        if (qRes.data.length === 0) {
          setError("No questions available for this level yet. Please check back later or try another level.");
          return;
        }

        setQuestions(qRes.data);
        setTimeLeft(qRes.data[0]?.timer_seconds || 20);
        setStartTime(Date.now());
      } catch (err) {
        setError(err.response?.data?.error || "Failed to load quiz.");
      } finally {
        setLoading(false);
      }
    };

    initQuiz();
  }, [levelId]);

  const handleNext = useCallback(() => {
    if (currentIndex >= questions.length - 1) {
      // End of quiz - transition to complete page
      navigate(`/lesson/${levelId}/complete`, {
        state: {
          totalXp: sessionXp,
          correctCount,
          totalQuestions: questions.length,
          answers,
          timeSpent: Math.floor((Date.now() - quizStartTime) / 1000),
        },
      });
      return;
    }

    const nextIndex = currentIndex + 1;
    const nextQuestion = questions[nextIndex];
    setCurrentIndex(nextIndex);
    setSelectedOptions([]);
    setResult(null);
    setTimeLeft(nextQuestion?.timer_seconds || 20);
    setStartTime(Date.now());
  }, [
    currentIndex,
    levelId,
    navigate,
    questions,
    sessionXp,
    correctCount,
    answers,
  ]);

  const submitAnswer = useCallback(
    async (finalSelectedOptions) => {
      if (!question || result || isSubmitting) return;
      setIsSubmitting(true);

      try {
        const res = await api.post(
          `/content/levels/${levelId}/answer`,
          {
            questionId: question.id,
            selectedOptions: finalSelectedOptions,
            servedToken: question.servedToken,
          },
        );

        const answerResult = res.data;
        setResult(answerResult);

        if (answerResult.correct) {
          setSessionXp((prev) => prev + (answerResult.xpEarned || 0));
          setCorrectCount((prev) => prev + 1);
        }

        setAnswers((prev) => [
          ...prev,
          {
            question,
            selectedOptions: finalSelectedOptions,
            ...answerResult,
          },
        ]);
      } catch (err) {
        console.error("Submit answer error:", err);
        // Even on error, we must move forward to prevent getting stuck
        setResult({
          correct: false,
          correctOptions: [],
          explanation: "Error validating answer.",
          xpEarned: 0,
        });
      } finally {
        setIsSubmitting(false);
      }
    },
    [levelId, question, result, startTime, timerSeconds, isSubmitting],
  );

  // Timer Effect
  useEffect(() => {
    if (!question || result || isSubmitting) return;
    if (timeLeft <= 0) {
      submitAnswer(selectedOptions); // Auto-submit on timeout
      return;
    }

    const timer = setTimeout(() => setTimeLeft((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [question, result, submitAnswer, timeLeft, selectedOptions, isSubmitting]);

  const toggleOption = (optId) => {
    if (result || isSubmitting) return;

    if (isMultiCorrect) {
      setSelectedOptions((prev) =>
        prev.includes(optId)
          ? prev.filter((id) => id !== optId)
          : [...prev, optId],
      );
    } else {
      setSelectedOptions([optId]);
      submitAnswer([optId]); // Instant submit for single choice
    }
  };

  const handleQuit = () => {
    setShowQuitConfirm(true);
  };

  const confirmQuit = () => {
    navigate(-1);
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#EFEEE8]">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#C1B29E] border-t-transparent" />
      </div>
    );
  }

  if (error || !question) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#EFEEE8] p-8">
        <div className="max-w-xl text-center font-bold text-red-500">
          {error || "No questions found for this level."}
          <button
            onClick={() => navigate(-1)}
            className="mt-4 block w-full rounded-2xl bg-[#B0681B] py-3 text-white"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const currentTotalXp = initialTotalXp + sessionXp;
  const progressPercentage = (currentIndex / questions.length) * 100;

  return (
    <div className="flex h-screen flex-col bg-[#EFEEE8] font-sans">
      {/* Header */}
      <header className="flex w-full items-center justify-between px-6 py-4">
        <button
          onClick={() => navigate(-1)}
          className="rounded-full p-2 text-gray-500 transition-colors hover:bg-gray-200"
        >
          <X className="h-6 w-6" />
        </button>

        <div className="flex flex-1 items-center px-8">
          <div className="mr-4 text-sm font-bold text-gray-500 whitespace-nowrap">
            Question {currentIndex + 1} of {questions.length}
          </div>
          <div className="relative flex-1 h-3 rounded-full bg-gray-300 overflow-hidden">
            <motion.div
              initial={{
                width: `${((currentIndex - 1) / questions.length) * 100}%`,
              }}
              animate={{ width: `${progressPercentage}%` }}
              className="absolute left-0 top-0 h-full bg-gradient-to-r from-[#A67B46] to-[#6A4E2B] rounded-full"
            />
          </div>
          <div className="ml-4 text-sm font-bold text-gray-500 whitespace-nowrap">
            {Math.round(progressPercentage)}% Complete
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 rounded-xl bg-[#E3D9CC] px-4 py-2 font-bold text-[#A67B46]">
            <Trophy className="h-5 w-5" /> {currentTotalXp}
          </div>
          <button
            onClick={handleQuit}
            className="font-bold text-gray-500 hover:text-gray-700 uppercase text-sm"
          >
            Quit
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative flex flex-1 px-4 md:px-8 pb-10 overflow-hidden">
        <div className="absolute top-[-12%] right-[-8%] h-[480px] w-[480px] rounded-full bg-[#E3D9CC] opacity-45 blur-3xl z-0 pointer-events-none" />

        <div className="z-10 w-full max-w-7xl mx-auto pt-4">
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_260px] gap-6 items-start">
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="relative bg-[#F9F8F4] border border-[#D9CEBE] rounded-3xl p-5 md:p-7 shadow-sm"
            >
              <div className="absolute right-5 top-5 h-16 w-16 rounded-full border-4 border-[#E7C067] bg-white text-[#7A5624] flex items-center justify-center font-extrabold text-2xl shadow-[0_0_24px_rgba(231,192,103,0.45)]">
                {timeLeft}s
              </div>

              <div className="pr-20">
                <p className="text-xs tracking-wider font-bold text-[#A67B46] uppercase mb-2">
                  Question {currentIndex + 1} of {questions.length}
                </p>
                <h2 className="text-3xl md:text-4xl font-extrabold text-[#2F2C28] leading-tight mb-6">
                  {question.question_text}
                </h2>
              </div>

              <div className="rounded-2xl border border-[#D9CEBE] bg-white p-4 md:p-6">
                <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2">
                  {options.map((opt) => {
                    const isSelected = selectedOptions.includes(opt.id);
                    const accentColor = optionAccentMap[opt.id] || "#B0681B";
                    let stateClass =
                      "border-[#CFC2AF] bg-[#FAFAF8] text-[#3D3A36] hover:bg-[#F0EBE1] hover:border-[#A67B46]";

                    if (isSelected) {
                      stateClass =
                        "border-[#B0681B] bg-[#F5EDDF] text-[#B0681B] ring-2 ring-[#B0681B]/20";
                    }

                    const isCorrect = Boolean(result?.correctOptions?.includes(opt.id));
                    const isWrongSelected = Boolean(result && selectedOptions.includes(opt.id) && !isCorrect);

                    return (
                      <button
                        key={opt.id}
                        disabled={Boolean(result) || isSubmitting}
                        onClick={() => toggleOption(opt.id)}
                        className={`relative flex min-h-[96px] items-center rounded-2xl border-2 p-5 transition-all duration-200 ${stateClass} ${
                          !result && !isSubmitting
                            ? "active:scale-[0.98] shadow-sm hover:shadow-md"
                            : "opacity-80 cursor-not-allowed"
                        }`}
                      >
                        <span
                          className="mr-4 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold"
                          style={{
                            backgroundColor: result
                              ? isCorrect
                                ? accentColor
                                : isWrongSelected
                                  ? "#C97A34"
                                  : "#F2E6D3"
                              : isSelected
                                ? accentColor
                                : "#F2E6D3",
                            color: result ? (isCorrect || isSelected ? "#fff" : accentColor) : isSelected ? "#fff" : accentColor,
                            boxShadow: result && isCorrect ? `0 0 0 4px ${accentColor}22` : undefined,
                          }}
                        >
                          {opt.id}
                        </span>
                        <span className="text-left text-lg font-bold leading-snug">
                          {opt.text}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {isMultiCorrect && !result && (
                  <motion.button
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    disabled={selectedOptions.length === 0 || isSubmitting}
                    onClick={() => submitAnswer(selectedOptions)}
                    className="mt-6 rounded-full bg-[#B0681B] px-10 py-3.5 font-bold text-white shadow-lg transition hover:bg-[#8e5212] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? "Checking..." : "Submit Answer"}
                  </motion.button>
                )}
              </div>
            </motion.div>

            <div className="space-y-4">
              <div className="bg-white border border-[#D9CEBE] rounded-3xl p-3 shadow-sm">
                <img
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuAIxuMyjeACwWBPWC2B9WRbwsFXVXV8eUCnPUdWgSwv6owm4CqI6okAMsQ8GolHxtUBFiTs0IcBJ2CNM4uNupJifH89SSY3PVKkRpNHYECq7Tw8Su5JqqvP2N4wtmHm4l52vQ8HTiDHBQuH9b-84lP8pBxShBXuZUgkirM2d8-lhV-b5KndUaxI-LzNQz7s-JY8RLcwfrAKOijz0KjYIR766ayZD53J74kNVOXcQhJO3TTn9uNcbXu_-SHxAybDJxIcuBU9vgjWKqd8"
                  alt="Quiz robot"
                  className="w-full h-44 object-cover rounded-2xl"
                />
              </div>

              <div className="bg-white border border-[#D9CEBE] rounded-3xl p-5 shadow-sm">
                <p className="text-xs font-bold tracking-wider text-[#A67B46] uppercase mb-2">Focus Boost</p>
                <p className="text-[#3D3A36] font-bold leading-relaxed">
                  "Stay sharp. One focused answer at a time. You are building momentum."
                </p>
                <div className="mt-4 h-2 w-full rounded-full bg-[#EDE5D9] overflow-hidden">
                  <motion.div
                    key={`focus-${currentIndex}`}
                    initial={{ width: "100%" }}
                    animate={{ width: `${Math.max(20, (timeLeft / timerSeconds) * 100)}%` }}
                      className="h-full bg-gradient-to-r from-[#D48C2B] to-[#B0681B] shadow-[0_0_18px_rgba(180,104,27,0.5)]"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {showQuitConfirm && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/35 backdrop-blur-sm px-4">
            <div className="w-full max-w-md rounded-[28px] border border-[#D9CEBE] bg-[#F9F8F4] p-6 shadow-2xl">
              <p className="text-xs font-bold uppercase tracking-widest text-[#A67B46] mb-2">Confirm Quit</p>
              <h3 className="text-2xl font-extrabold text-[#2F2C28] mb-3">Quit aur progress reset?</h3>
              <p className="text-sm leading-relaxed text-[#6B655B] mb-6">
                Quit karne se tumhara progress reset ho jayega. Kya tum sure ho ki exit karna chahte ho?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowQuitConfirm(false)}
                  className="flex-1 rounded-2xl border-2 border-[#D9CEBE] bg-white px-4 py-3 font-bold text-[#6B655B] hover:bg-[#FAF7F2]"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmQuit}
                  className="flex-1 rounded-2xl bg-[#B0681B] px-4 py-3 font-bold text-white shadow-lg hover:bg-[#8e5212]"
                >
                  Quit Anyway
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Result Modal Overlay */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="w-full max-w-lg rounded-[2rem] bg-white p-8 shadow-2xl relative overflow-hidden"
            >
              {/* Decorative background circle */}
              <div
                className={`absolute top-[-50px] right-[-50px] h-40 w-40 rounded-full blur-2xl opacity-20 pointer-events-none ${result.correct ? "bg-green-500" : "bg-red-500"}`}
              />

              <div className="flex flex-col items-center text-center">
                <div
                  className={`mb-6 flex h-20 w-20 items-center justify-center rounded-full ${result.correct ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"}`}
                >
                  {result.correct ? (
                    <CheckCircle className="h-10 w-10" />
                  ) : (
                    <XCircle className="h-10 w-10" />
                  )}
                </div>

                <h3 className="mb-2 text-2xl font-extrabold text-[#3D3A36]">
                  {result.correct ? "Excellent Work!" : "Not Quite Right"}
                </h3>

                <p className="mb-6 text-[#6B655B] text-lg">
                  {result.explanation ||
                    (result.correct
                      ? "Great job on getting that one right!"
                      : "Review the concepts and try again later.")}
                </p>

                {!result.correct && result.correctOptions && (
                  <div className="mb-6 w-full rounded-xl bg-gray-100 p-4">
                    <span className="text-sm font-bold text-gray-500 uppercase tracking-wider">
                      Correct Answer
                    </span>
                    <p className="mt-1 font-bold text-[#3D3A36]">
                      {result.correctOptions
                        .map(
                          (opt) =>
                            `${opt}: ${question[`option_${opt.toLowerCase()}`]}`,
                        )
                        .join(" | ")}
                    </p>
                  </div>
                )}

                {result.correct && (
                  <div className="mb-8 flex items-center justify-center gap-2 font-bold text-[#B0681B]">
                    You've earned{" "}
                    <span className="text-xl">+{result.xpEarned} XP</span>
                  </div>
                )}

                <button
                  onClick={handleNext}
                  className="w-full rounded-full bg-[#D48C2B] py-4 text-xl font-bold text-white shadow-lg transition-transform hover:scale-105 active:scale-95"
                >
                  Continue
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
