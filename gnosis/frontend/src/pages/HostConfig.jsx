import React from "react";
import { useNavigate } from "react-router-dom";

const HostConfig = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#fbf8f1] flex items-center justify-center p-8 font-sans">
      <div className="max-w-xl w-full bg-white rounded-3xl shadow-lg border border-[#e5dfd3] p-10">
        <h1 className="text-3xl font-bold text-[#1f2937] mb-2 text-center">
          Configure Room
        </h1>
        <p className="text-[#6b7280] text-center mb-8">
          Set up your group battle parameters.
        </p>

        <div className="flex flex-col gap-6">
          <div>
            <label className="block text-sm font-bold text-[#1f2937] mb-3">
              Select Subject Module
            </label>
            <select className="w-full bg-[#fbf8f1] border border-[#e5dfd3] rounded-xl px-4 py-3 focus:outline-none focus:border-orange-400 font-medium">
              <option>Data Structures</option>
              <option>Algorithms</option>
              <option>Operating Systems</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold text-[#1f2937] mb-3">
              Difficulty Level
            </label>
            <div className="flex gap-4">
              <label className="flex-1 cursor-pointer">
                <input
                  type="radio"
                  name="diff"
                  className="peer sr-only"
                  defaultChecked
                />
                <div className="text-center p-3 rounded-xl border-2 border-[#e5dfd3] peer-checked:border-orange-500 peer-checked:bg-orange-50 font-bold text-[#6b7280] peer-checked:text-orange-700 transition-all">
                  Standard
                </div>
              </label>
              <label className="flex-1 cursor-pointer">
                <input type="radio" name="diff" className="peer sr-only" />
                <div className="text-center p-3 rounded-xl border-2 border-[#e5dfd3] peer-checked:border-orange-500 peer-checked:bg-orange-50 font-bold text-[#6b7280] peer-checked:text-orange-700 transition-all">
                  Advanced
                </div>
              </label>
            </div>
          </div>

          {/* Note: Specific removals mentioned "Modify Session Rules" and "Power-ups", which are absent here. */}

          <div className="pt-4 flex gap-4">
            <button
              onClick={() => navigate("/battle")}
              className="flex-1 bg-white border-2 border-[#e5dfd3] text-[#1f2937] py-4 rounded-xl font-bold text-lg hover:bg-[#fbf8f1] transition-all"
            >
              Cancel
            </button>
            <button
              onClick={() => navigate("/host-lobby")}
              className="flex-1 bg-gradient-to-r from-orange-500 to-amber-500 text-white py-4 rounded-xl font-bold text-lg hover:from-orange-600 hover:to-amber-600 transition-all shadow-md"
            >
              Create Room
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HostConfig;
