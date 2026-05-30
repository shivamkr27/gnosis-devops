import React from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import { useSocketStore } from "../lib/store";
import { ArrowLeft, Bell } from "lucide-react";

export default function Notifications() {
  const navigate = useNavigate();
  const { notifications } = useSocketStore();

  return (
    <Layout>
      <div className="max-w-3xl mx-auto p-4 md:p-8">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-[#8a8a8a] hover:text-[#8B2500] transition-colors font-bold mb-5"
        >
          <ArrowLeft className="w-5 h-5" /> Back
        </button>

        <div className="bg-white rounded-2xl border border-[#E8DFD1] shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-[#E8DFD1] bg-[#FAF7F2] flex items-center gap-2">
            <Bell className="w-5 h-5 text-[#8B2500]" />
            <h1 className="text-lg font-extrabold text-[#1a1a1a]">Notifications</h1>
          </div>

          <div className="p-3">
            {notifications.length === 0 ? (
              <p className="text-sm text-[#8a8a8a] px-2 py-6 text-center">No notifications yet.</p>
            ) : (
              <div className="space-y-2">
                {notifications.map((notif) => (
                  <div
                    key={notif.id}
                    className={`rounded-xl border px-4 py-3 ${
                      notif.read
                        ? "bg-white border-[#E8DFD1]"
                        : "bg-[#FFF4E5] border-[#F0C090]"
                    }`}
                  >
                    <p className="text-sm text-[#1a1a1a]">{notif.message}</p>
                    <p className="text-xs text-[#8a8a8a] mt-1">
                      {notif.created_at ? new Date(notif.created_at).toLocaleString() : "Just now"}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
