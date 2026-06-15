import React, { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import Layout from "../components/Layout";
import api from "../lib/api";
import { useAuthStore } from "../lib/store";
import { ArrowLeft, CheckCircle2, XCircle, Trophy, Swords } from "lucide-react";

const OPTION_LABELS = { A: "option_a", B: "option_b", C: "option_c", D: "option_d" };

export default function BattleReview() {
  const { battleId } = useParams();
  const { state } = useLocation();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [answers, setAnswers] = useState(state?.answers || []);
  const [meta, setMeta] = useState({
    subjectName: state?.subjectName || "Arena Battle",
    createdAt: null,
  });
  const [loading, setLoading] = useState(
    (!state?.answers || state.answers.length === 0) && battleId !== "live"
  );

  useEffect(() => {
    if (state?.answers && state.answers.length > 0) return;
    if (!battleId || battleId === "live") {
      setLoading(false);
      return;
    }
    api
      .get(`/battle/history/review/${battleId}?userId=${user?.id}`)
      .then((res) => {
        setAnswers(res.data.answers || []);
        setMeta({
          subjectName: res.data.subjectName || "Arena Battle",
          createdAt: res.data.createdAt,
        });
      })
      .catch((err) => console.error("Failed to load battle review:", err))
      .finally(() => setLoading(false));
  }, [battleId, user?.id]);

  // Normalise – handles both flat (from DB) and nested question objects (from live state)
  const normalizedAnswers = answers.map((ans) => ({
    correct: ans.correct,
    selectedOptions: (ans.selectedOptions || []).map((s) => String(s).toUpperCase()),
    correctOptions: (ans.correctOptions || []).map((s) => String(s).toUpperCase()),
    explanation: ans.explanation || "",
    question: ans.question || {
      question_text: ans.question_text,
      option_a: ans.option_a,
      option_b: ans.option_b,
      option_c: ans.option_c,
      option_d: ans.option_d,
    },
  }));

  const correctCount = normalizedAnswers.filter((a) => a.correct).length;
  const total = normalizedAnswers.length;
  const performancePercent = total ? Math.round((correctCount / total) * 100) : 0;

  if (loading) {
    return (
      <Layout>
        <div className="flex h-screen items-center justify-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#8B2500] border-t-transparent" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="mx-auto max-w-5xl px-4 py-4 md:px-6 md:py-6">
        {/* Header */}
        <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Swords className="w-5 h-5 text-[#8B2500]" />
              <h1 className="text-3xl md:text-4xl font-extrabold text-[#2F2C28]">Battle Review</h1>
            </div>
            <p className="text-sm font-semibold text-[#7a6d60]">
              {meta.subjectName}
              {meta.createdAt
                ? ` — ${new Date(meta.createdAt).toLocaleDateString([], { dateStyle: "medium" })}`
                : ""}
            </p>
          </div>
          <button
            onClick={() => navigate("/battle")}
            className="flex items-center gap-2 px-6 py-2.5 rounded-2xl border-2 border-[#A34714] text-[#A34714] font-bold text-sm hover:bg-[#FFF4E5] transition-colors self-start md:self-auto"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Arena
          </button>
        </div>

        {/* Summary */}
        <div className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
          <div className="rounded-3xl border border-[#E6D8C4] bg-white p-5 md:p-6 shadow-sm flex items-center justify-between gap-4">
            <div>
              <p className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-[#7a6d60]">
                YOUR SCORE
              </p>
              <p className="text-5xl md:text-6xl font-extrabold text-[#A34714] leading-none mt-2">
                {performancePercent}%
              </p>
            </div>
            <div className="relative h-28 w-28 flex-shrink-0">
              <svg className="h-28 w-28 transform -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="42" fill="none" stroke="#F2E6D3" strokeWidth="10" />
                <circle
                  cx="50" cy="50" r="42" fill="none" stroke="#A34714" strokeWidth="10"
                  strokeDasharray={`${performancePercent * 2.639} 263.9`} strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <Trophy className="h-10 w-10 text-[#A34714]" />
              </div>
            </div>
          </div>
          <div className="rounded-3xl border border-[#A64B29] bg-[#A64B29] p-5 md:p-6 text-white shadow-sm flex flex-col justify-center">
            <p className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-[#E6D8C4]">
              CORRECT
            </p>
            <p className="mt-2 text-4xl md:text-5xl font-extrabold leading-none">
              {correctCount}/{total}
            </p>
          </div>
        </div>

        {/* Questions */}
        {normalizedAnswers.length === 0 ? (
          <div className="rounded-3xl border border-[#E6D8C4] bg-white p-8 text-center shadow-sm">
            <Swords className="w-12 h-12 text-[#E8DFD1] mx-auto mb-3" />
            <p className="font-bold text-[#7a6d60]">No review data available for this battle.</p>
            <p className="mt-2 text-sm text-[#8a8a8a]">
              Answer review is only available for battles played after this feature was added.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {normalizedAnswers.map((answer, index) => {
              const selected = answer.selectedOptions;
              const correct = answer.correctOptions;
              return (
                <div
                  key={index}
                  className={`rounded-[28px] border bg-white p-4 md:p-5 shadow-sm ${
                    answer.correct ? "border-[#2E9E57]" : "border-[#E0B8B8]"
                  }`}
                >
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      {answer.correct ? (
                        <CheckCircle2 className="mt-1 h-5 w-5 flex-shrink-0 text-[#2E9E57]" />
                      ) : (
                        <XCircle className="mt-1 h-5 w-5 flex-shrink-0 text-[#C95A4B]" />
                      )}
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-[#9A8C7C]">
                          Question {index + 1}
                        </p>
                        <h2 className="text-xl md:text-2xl font-extrabold text-[#2F2C28] leading-snug">
                          {answer.question?.question_text}
                        </h2>
                      </div>
                    </div>
                    <span
                      className={`text-xs font-bold uppercase tracking-wider shrink-0 ${
                        answer.correct ? "text-[#2E9E57]" : "text-[#C95A4B]"
                      }`}
                    >
                      {answer.correct ? "Correct" : "Wrong"}
                    </span>
                  </div>

                  <div className="mb-4 grid gap-3 sm:grid-cols-2">
                    {Object.entries(OPTION_LABELS).map(([label, key]) => {
                      const isSelected = selected.includes(label);
                      const isCorrect = correct.includes(label);
                      const stateClass = isCorrect
                        ? "border-[#2E9E57] bg-[#EAF7EE] text-[#1F4E30]"
                        : isSelected
                        ? "border-[#D9B08C] bg-[#FBF0E3] text-[#8B4B12]"
                        : "border-[#E5DED3] bg-[#FBFAF8] text-[#6e675f]";
                      return (
                        <div
                          key={label}
                          className={`rounded-2xl border-2 p-3 md:p-4 font-semibold ${stateClass}`}
                        >
                          <span
                            className={`mr-3 inline-flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold ${
                              isCorrect
                                ? "bg-[#2E9E57] text-white"
                                : isSelected
                                ? "bg-[#D58E3D] text-white"
                                : "bg-white text-[#7a6d60]"
                            }`}
                          >
                            {label}
                          </span>
                          {answer.question?.[key]}
                        </div>
                      );
                    })}
                  </div>

                  <div className="rounded-2xl border border-[#E8DFD1] bg-[#FBF7F0] p-4 font-semibold text-[#5a5349]">
                    <p>
                      Your answer:{" "}
                      {selected.length ? selected.join(", ") : "No answer (timed out)"}
                    </p>
                    <p>Correct answer: {correct.join(", ")}</p>
                    {answer.explanation && (
                      <p className="mt-2 text-[#2F2C28]">{answer.explanation}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}
