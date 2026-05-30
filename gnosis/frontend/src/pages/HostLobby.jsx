import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import { useAuthStore, useSocketStore } from "../lib/store";

export default function HostLobby() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { socket } = useSocketStore();
  const [questions, setQuestions] = useState([]);
  const [quizName, setQuizName] = useState("Group Quiz");
  const [error, setError] = useState("");
  const [currentQ, setCurrentQ] = useState({
    text: "",
    a: "",
    b: "",
    c: "",
    d: "",
    correct: "A",
  });
  const [editingIndex, setEditingIndex] = useState(null);

  useEffect(() => {
    if (!socket || !user?.id) return undefined;

    socket.on("group:created", ({ roomCode }) => {
      navigate(`/battle/lobby/${roomCode}?host=1`);
    });

    socket.on("battle:error", ({ message }) => setError(message));

    return () => {
      socket.off("group:created");
      socket.off("battle:error");
    };
  }, [navigate, socket, user?.id]);

  const resetQuestionForm = () => {
    setCurrentQ({ text: "", a: "", b: "", c: "", d: "", correct: "A" });
    setEditingIndex(null);
  };

  const handleAdd = () => {
    if (currentQ.text && currentQ.a && currentQ.b && currentQ.c && currentQ.d) {
      const nextQuestion = {
        question_text: currentQ.text,
        option_a: currentQ.a,
        option_b: currentQ.b,
        option_c: currentQ.c,
        option_d: currentQ.d,
        correct_options: [currentQ.correct],
        question_type: "easy",
        timer_seconds: 20,
        explanation: "",
      };

      if (editingIndex !== null) {
        setQuestions(
          questions.map((question, index) =>
            index === editingIndex ? nextQuestion : question,
          ),
        );
      } else {
        setQuestions([...questions, nextQuestion]);
      }

      resetQuestionForm();
      setError("");
    }
  };

  const handleEdit = (index) => {
    const question = questions[index];
    if (!question) return;

    setCurrentQ({
      text: question.question_text,
      a: question.option_a,
      b: question.option_b,
      c: question.option_c,
      d: question.option_d,
      correct: question.correct_options?.[0] || "A",
    });
    setEditingIndex(index);
    setError("");
  };

  const handleDelete = (index) => {
    setQuestions(questions.filter((_, questionIndex) => questionIndex !== index));
    if (editingIndex === index) {
      resetQuestionForm();
    } else if (editingIndex !== null && editingIndex > index) {
      setEditingIndex(editingIndex - 1);
    }
  };

  const handleCancelEdit = () => {
    resetQuestionForm();
  };

  const handleCreate = () => {
    if (!socket || questions.length === 0) return;
    socket.emit("group:create", {
      hostId: user.id,
      hostUsername: user.username,
      quizName,
      questions,
    });
  };

  return (
    <Layout>
      <div className="mx-auto max-w-4xl p-4 md:p-8">
        <h1 className="mb-8 text-3xl font-bold text-inverse-surface">
          Host Setup
        </h1>

        <div className="mb-6 rounded-2xl border border-surface-variant bg-white p-4">
          <input
            value={quizName}
            onChange={(e) => setQuizName(e.target.value)}
            placeholder="Quiz name"
            className="w-full rounded-xl border-2 border-surface-variant p-3 font-bold outline-none focus:border-primary"
          />
        </div>

        <div className="grid gap-8 md:grid-cols-2">
          <div className="rounded-3xl border border-surface-variant bg-white p-6 shadow-soft">
            <h2 className="mb-4 text-xl font-bold text-inverse-surface">
              {editingIndex !== null ? "Edit Question" : "Add Question"}
            </h2>
            {editingIndex !== null && (
              <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900">
                Editing question {editingIndex + 1}
              </div>
            )}
            <div className="space-y-4">
              <input
                value={currentQ.text}
                onChange={(e) =>
                  setCurrentQ({ ...currentQ, text: e.target.value })
                }
                placeholder="Question Text"
                className="w-full rounded-xl border-2 border-surface-variant p-3"
              />
              <div className="grid grid-cols-2 gap-2">
                {["a", "b", "c", "d"].map((key) => (
                  <input
                    key={key}
                    value={currentQ[key]}
                    onChange={(e) =>
                      setCurrentQ({ ...currentQ, [key]: e.target.value })
                    }
                    placeholder={`Option ${key.toUpperCase()}`}
                    className="rounded-xl border-2 border-surface-variant p-3"
                  />
                ))}
              </div>
              <select
                value={currentQ.correct}
                onChange={(e) =>
                  setCurrentQ({ ...currentQ, correct: e.target.value })
                }
                className="w-full rounded-xl border-2 border-surface-variant p-3 font-bold"
              >
                <option value="A">Correct: A</option>
                <option value="B">Correct: B</option>
                <option value="C">Correct: C</option>
                <option value="D">Correct: D</option>
              </select>
              <button
                onClick={handleAdd}
                className="w-full rounded-xl bg-surface-variant py-3 font-bold text-inverse-surface hover:bg-surface-dim"
              >
                {editingIndex !== null ? "Save Changes" : "Add to Quiz"}
              </button>
              {editingIndex !== null && (
                <button
                  onClick={handleCancelEdit}
                  type="button"
                  className="w-full rounded-xl border border-surface-variant py-3 font-bold text-on-surface-variant hover:bg-surface"
                >
                  Cancel Edit
                </button>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-surface-variant bg-white p-6 shadow-soft">
            <h2 className="mb-4 text-xl font-bold text-inverse-surface">
              Quiz Summary
            </h2>
            <div className="min-h-64 space-y-2">
              {questions.map((q, i) => (
                <div
                  key={`${q.question_text}-${i}`}
                  className="rounded-xl border border-surface-variant bg-surface p-3 text-sm font-medium"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-inverse-surface">
                        {i + 1}. {q.question_text}
                      </div>
                      <div className="mt-1 text-xs text-on-surface-variant">
                        Correct: {q.correct_options?.[0] || "A"}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleEdit(i)}
                        className="rounded-lg border border-surface-variant px-3 py-1 text-xs font-bold text-inverse-surface hover:bg-white"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(i)}
                        className="rounded-lg border border-red-200 px-3 py-1 text-xs font-bold text-red-600 hover:bg-red-50"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {questions.length === 0 && (
                <p className="text-sm text-on-surface-variant">
                  No questions added yet.
                </p>
              )}
            </div>
            {error && <p className="mt-3 font-semibold text-error">{error}</p>}
            <button
              onClick={handleCreate}
              disabled={questions.length === 0}
              className="mt-4 w-full rounded-xl bg-primary py-4 font-bold text-white disabled:opacity-50"
            >
              Generate Room Code
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
