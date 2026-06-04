import React, { useEffect, useState, useRef } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { BookOpen, Trophy, Swords, User, Bell, X, Check, ArrowRight, UserPlus } from "lucide-react";
import api from "../lib/api";
import { useSocketStore, useAppStore } from "../lib/store";
import { useAuthStore } from "../lib/store";

export default function Layout({ children }) {
  const { user } = useAuthStore();
  const { imageMap } = useAppStore();
  const navigate = useNavigate();

  const {
    notifications,
    unreadCount,
    setNotifications,
    markAsRead,
    removeNotification,
  } = useSocketStore();

  const [showNotifications, setShowNotifications] = useState(false);
  const [toastNotification, setToastNotification] = useState(null);

  const toastTimerRef = useRef(null);
  const lastNotificationIdRef = useRef(null);

  useEffect(() => {
    if (notifications.length === 0) return;
    const latestNotification = notifications[0];
    if (!latestNotification || latestNotification.id === lastNotificationIdRef.current) return;
    lastNotificationIdRef.current = latestNotification.id;
    setToastNotification(latestNotification);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToastNotification(null), 3500);
    return () => { if (toastTimerRef.current) clearTimeout(toastTimerRef.current); };
  }, [notifications]);

  const handleNotificationClick = async (notif) => {
    if (!notif.read) markAsRead(notif.id);
    if (notif.type === "friend_request") navigate("/friends");
    setShowNotifications(false);
  };

  const handleDeleteNotification = async (e, notif) => {
    e.stopPropagation();
    try {
      if (notif?.source === "local") {
        removeNotification(notif.id);
        return;
      }
      await api.delete(`/notifications/${notif.id}`);
      removeNotification(notif.id);
    } catch (err) { console.error("Failed to delete", err); }
  };

  const navItems = [
    { to: "/home", icon: <BookOpen className="w-6 h-6" />, label: "Learn" },
    { to: "/battle", icon: <Swords className="w-6 h-6" />, label: "Arena" },
    { to: "/leaderboard", icon: <Trophy className="w-6 h-6" />, label: "Rank" },
    { to: `/profile/${user?.id}`, icon: <User className="w-6 h-6" />, label: "Profile" },
  ];

  return (
    <div className="min-h-screen bg-[#FAF7F2] font-sans">
      {/* Top Header */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-[#FAF7F2]/90 backdrop-blur-md z-[60] border-b border-[#E8DFD1] px-4 md:px-8 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/home')}>
            <div className="w-8 h-8 bg-[#8B2500] rounded-lg flex items-center justify-center text-white font-bold shadow-sm">
              G
            </div>
            <span className="font-black text-xl text-[#8B2500] tracking-tighter">
              GNOSIS
            </span>
          </div>
          {/* Logo Robot Part */}
          <div className="w-9 h-9 overflow-hidden rounded-lg bg-white border border-[#E8DFD1] flex items-center justify-center shadow-sm hover:scale-105 transition-transform">
            <img 
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuAM7GOawTVMkkB-wztpXBJP5Rfz5TZHlyX8EFeTMLSniouALaSQ_4B2ayHEq78UEPBhhBLMBipPamETUxoB_Si_jkIi_TR--jjA-go_mB4q3yGLWXrJuezshIm52Uh2qdBknGvIPWqKhhbDE6bQnQBXHv2epya8a-Aag5nPRhG-5tfDfe1efu0s0MAYyy50czFBRz6xwOTxF-8_V2e0oiBuUa8KKGTyj8I9b--zMqdmXqCXZjB3Fr1qj5-81RA_vkiC80dvbrSoe3kO" 
              alt="Mascot" 
              className="w-full h-full object-contain p-1"
            />
          </div>
        </div>

        {/* Global Toolbar */}
        <div className="flex items-center gap-2 md:gap-4">
          <div className="hidden sm:flex items-center gap-1.5 text-[#D4641A] font-bold bg-white border border-[#E8DFD1] px-4 py-1.5 rounded-full shadow-sm">
            <Trophy className="w-4 h-4" />
            <span>{user?.total_xp || 0} XP</span>
          </div>

          <button 
            onClick={() => {
              navigate('/battle');
              // Focus the search input if we are on the battle page
              setTimeout(() => {
                const searchInput = document.querySelector('input[placeholder="Invite more scholars..."]');
                if (searchInput) searchInput.focus();
              }, 100);
            }}
            className="p-2.5 rounded-full text-[#8a8a8a] border border-transparent hover:bg-white hover:border-[#E8DFD1] transition-all group relative"
            title="Add Friend"
          >
            <UserPlus className="w-5 h-5 text-[#8B2500]" />
            <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-[#1a1a1a] text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">Invite Scholar</span>
          </button>
          
          <div className="relative">
            <button 
              className={`p-2.5 rounded-full transition-all border ${showNotifications ? 'bg-white border-[#E8DFD1] text-[#8B2500]' : 'text-[#8a8a8a] border-transparent hover:bg-white hover:border-[#E8DFD1]'}`}
              onClick={() => setShowNotifications(!showNotifications)}
            >
              <Bell className={`w-5 h-5 ${unreadCount > 0 ? 'animate-bounce' : ''}`} />
              {unreadCount > 0 && (
                <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-[#D4641A] rounded-full border-2 border-[#FAF7F2] animate-ping"></span>
              )}
            </button>

            {/* Notifications Dropdown */}
            {showNotifications && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowNotifications(false)}></div>
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-[#E8DFD1] overflow-hidden z-20 flex flex-col max-h-[480px]">
                  <div className="p-4 border-b border-[#E8DFD1] bg-[#FAF7F2] flex justify-between items-center">
                    <h3 className="font-bold text-[#1a1a1a]">Notifications</h3>
                    <span className="text-xs font-bold text-[#D4641A] bg-[#FFF4E5] px-2 py-1 rounded-md">{unreadCount} New</span>
                  </div>
                  <div className="flex-1 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-8 text-center">
                        <Bell className="w-10 h-10 text-[#E8DFD1] mx-auto mb-2 opacity-50" />
                        <p className="text-[#8a8a8a] text-sm font-medium">All caught up!</p>
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <div key={n.id} onClick={() => handleNotificationClick(n)} className={`p-4 border-b border-[#FAF7F2] cursor-pointer hover:bg-[#FAF7F2] transition-colors relative ${!n.read ? 'bg-[#FFF4E5]/30' : ''}`}>
                          <p className="text-sm text-[#1a1a1a] font-medium leading-tight pr-6">{n.message}</p>
                          <span className="text-[10px] text-[#8a8a8a] mt-1 block">Just now</span>
                          <button onClick={(e) => handleDeleteNotification(e, n)} className="absolute top-4 right-4 p-1 rounded-full text-[#E8DFD1] hover:text-red-500 transition-colors">
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          <div 
            onClick={() => navigate(`/profile/${user?.id}`)}
            className="w-10 h-10 bg-[#FAF7F2] rounded-full flex items-center justify-center text-[#8B2500] font-bold uppercase cursor-pointer shadow-sm ring-2 ring-white hover:ring-[#8B2500]/20 transition-all overflow-hidden border border-[#E8DFD1]"
          >
            <img 
              src={imageMap?.avatars?.[user?.id] || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.username}`} 
              alt="Avatar" 
              className="w-full h-full object-cover" 
            />
          </div>
        </div>
      </header>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col items-center fixed left-0 top-16 bottom-0 w-24 bg-[#FAF7F2] border-r border-[#E8DFD1] z-50 py-8 space-y-8">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 group transition-all w-full ${
                isActive ? "text-[#8B2500]" : "text-[#8a8a8a] hover:text-[#8B2500]"
              }`
            }
          >
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center hover:bg-white hover:shadow-sm">
               {item.icon}
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest">{item.label}</span>
          </NavLink>
        ))}
      </aside>

      {/* Main Content Area */}
      <main className="pt-16 md:pl-24 pb-20 md:pb-0 min-h-screen">
        {children}
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[#FAF7F2]/95 backdrop-blur-md border-t border-[#E8DFD1] flex justify-around items-center h-16 z-[60] px-2 shadow-[0_-4px_10px_rgba(0,0,0,0.02)]">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center w-16 h-12 rounded-xl transition-all ${
                isActive ? "text-[#8B2500] bg-white shadow-sm border border-[#E8DFD1]" : "text-[#8a8a8a]"
              }`
            }
          >
            {item.icon}
            <span className="text-[9px] font-bold mt-0.5">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Global Toast */}
      {toastNotification && (
        <div className="fixed top-20 right-4 z-[90] w-[min(92vw,24rem)] rounded-2xl border border-[#E8DFD1] bg-white shadow-xl px-4 py-3 flex items-start gap-3 animate-in slide-in-from-right fade-in">
          <div className="w-10 h-10 rounded-full bg-[#FFF4E5] flex items-center justify-center text-[#D4641A] flex-shrink-0">
            <Bell className="w-5 h-5" />
          </div>
          <div className="flex-1 pt-1">
            <p className="text-sm font-bold text-[#1a1a1a] leading-tight">{toastNotification.message}</p>
            <button onClick={() => navigate('/notifications')} className="text-xs font-bold text-[#8B2500] mt-1 flex items-center gap-1 hover:underline">
              View All <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <button onClick={() => setToastNotification(null)} className="text-[#8a8a8a] p-1">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
