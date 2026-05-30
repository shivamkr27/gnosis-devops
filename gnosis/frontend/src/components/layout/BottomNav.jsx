import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Home, Swords, Trophy, User } from "lucide-react";

export function BottomNav() {
  const location = useLocation();

  const navItems = [
    { name: "Home", path: "/home", icon: Home },
    { name: "Battle", path: "/battle", icon: Swords },
    { name: "Rank", path: "/leaderboard", icon: Trophy },
    { name: "Profile", path: "/profile/me", icon: User },
  ];

  // Do not show bottom nav on landing or auth pages
  if (["/", "/auth"].includes(location.pathname)) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-gnosis-card border-t border-gnosis-border md:hidden">
      <div className="flex justify-around items-center h-16">
        {navItems.map((item) => {
          const isActive = location.pathname.startsWith(item.path);
          return (
            <Link
              key={item.name}
              to={item.path}
              className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${
                isActive
                  ? "text-gnosis-purple-light"
                  : "text-gnosis-muted hover:text-gnosis-text"
              }`}
            >
              <item.icon className="w-6 h-6" />
              <span className="text-xs font-medium">{item.name}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
