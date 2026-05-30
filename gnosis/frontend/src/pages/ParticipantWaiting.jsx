import React from "react";
import { useNavigate } from "react-router-dom";

const ParticipantWaiting = () => {
  const navigate = useNavigate();
  const roomCode = "GNOSIS-7X9P";

  const participants = [
    { id: 1, name: "Alice (Host)" },
    { id: 2, name: "You" },
    { id: 3, name: "Charlie" },
    { id: 4, name: "Dave" },
  ];

  return (
    <div className="min-h-screen bg-[#fbf8f1] flex flex-col items-center justify-center p-8 font-sans">
      <div className="max-w-2xl w-full bg-white rounded-3xl shadow-lg border border-[#e5dfd3] p-10 text-center relative overflow-hidden">
        {/* Animated Background rings for waiting state */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-orange-50 rounded-full blur-3xl opacity-50 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-64 h-64 bg-blue-50 rounded-full blur-3xl opacity-50 pointer-events-none"></div>

        <div className="relative z-10">
          <h2 className="text-[#6b7280] font-bold uppercase tracking-widest text-sm mb-2">
            Room Code
          </h2>
          <div className="text-4xl font-black text-[#1f2937] tracking-widest mb-10 bg-[#fbf8f1] inline-block px-6 py-2 rounded-xl border border-[#e5dfd3]">
            {roomCode}
          </div>

          <div className="mb-12">
            <h1 className="text-3xl font-bold text-[#1f2937] mb-4">
              Waiting for Host to Start...
            </h1>
            <div className="flex justify-center gap-2 mb-2">
              <div
                className="w-3 h-3 bg-orange-400 rounded-full animate-bounce"
                style={{ animationDelay: "0ms" }}
              ></div>
              <div
                className="w-3 h-3 bg-orange-400 rounded-full animate-bounce"
                style={{ animationDelay: "150ms" }}
              ></div>
              <div
                className="w-3 h-3 bg-orange-400 rounded-full animate-bounce"
                style={{ animationDelay: "300ms" }}
              ></div>
            </div>
            <p className="text-[#6b7280]">
              Grab a coffee, the battle begins shortly.
            </p>
          </div>

          {/* Participants List */}
          <div className="bg-[#fbf8f1] rounded-2xl p-6 border border-[#e5dfd3] text-left">
            <h3 className="font-bold text-[#1f2937] mb-4 flex justify-between">
              <span>Participants</span>
              <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full text-sm">
                {participants.length} Joined
              </span>
            </h3>
            <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
              {participants.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-3 bg-white p-3 rounded-xl border border-[#e5dfd3]"
                >
                  <div className="relative">
                    <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center font-bold text-gray-500">
                      {p.name.charAt(0)}
                    </div>
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                  </div>
                  <span
                    className={`font-medium ${p.name === "You" ? "text-orange-600 font-bold" : "text-[#1f2937]"}`}
                  >
                    {p.name}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={() => navigate("/battle")}
            className="mt-8 text-[#6b7280] hover:text-red-500 font-medium transition-colors"
          >
            Leave Room
          </button>
        </div>
      </div>
    </div>
  );
};

export default ParticipantWaiting;
