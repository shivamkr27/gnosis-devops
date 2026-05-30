import React from "react";
import { Outlet } from "react-router-dom";
import { Navbar } from "./Navbar";
import { BottomNav } from "./BottomNav";

export function AppLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-gnosis-bg text-gnosis-text font-sans">
      <Navbar />

      {/* Main Content Area - Add padding for Navbar and BottomNav (on mobile) */}
      <main className="flex-1 w-full max-w-7xl mx-auto md:pt-16 pb-16 md:pb-0 overflow-x-hidden">
        <Outlet />
      </main>

      <BottomNav />
    </div>
  );
}
