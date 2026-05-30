import React, { useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { useAuthStore, useAppStore, useSocketStore } from "./lib/store";
import api from "./lib/api";
import { createSocket } from "./lib/socket";

import LandingPage from "./pages/LandingPage";
import AuthPage from "./pages/AuthPage";
import Home from "./pages/Home";
import SubjectDetail from "./pages/SubjectDetail";
import Profile from "./pages/Profile";
import Leaderboard from "./pages/Leaderboard";
import Notifications from "./pages/Notifications";

import BattleLobby from "./pages/BattleLobby";
import HostLobby from "./pages/HostLobby";
import ParticipantLobby from "./pages/ParticipantLobby";
import ActiveQuiz from "./pages/ActiveQuiz";
import BattleResults from "./pages/BattleResults";
import ChallengeSent from "./pages/ChallengeSent";
import LessonComplete from "./pages/LessonComplete";
import QuizReview from "./pages/QuizReview";
import ChallengeManager from "./components/ChallengeManager";

function ProtectedRoute({ children }) {
  const { token, user, authStatus } = useAuthStore();

  if (!token) return <Navigate to="/auth" />;

  if (authStatus === "unauthenticated") {
    return <Navigate to="/auth" />;
  }

  if (authStatus === "checking" || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#8B2500] border-t-transparent"></div>
          <p className="font-bold text-[#8B2500] animate-pulse">Loading Gnosis...</p>
        </div>
      </div>
    );
  }

  return children;
}

function App() {
  const { user, token, setUser, logout, authStatus, setAuthStatus } = useAuthStore();
  const { setSocket } = useSocketStore();
  const { setImageMap } = useAppStore();
  const authRetryRef = React.useRef(null);

  useEffect(() => {
    fetch("/assets/image_map.json")
      .then((res) => res.json())
      .then((data) => setImageMap(data))
      .catch(() => console.log("No image map found"));
  }, [setImageMap]);

  // Check auth whenever token changes.
  // Avoid strict-mode fragile "already checked" guards that can freeze in checking state.
  useEffect(() => {
    if (!token) return;
    setAuthStatus("checking");

    if (authRetryRef.current) {
      clearTimeout(authRetryRef.current);
      authRetryRef.current = null;
    }

    let disposed = false;

    const runAuthCheck = async (attempt = 1) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      try {
        const res = await api.get("/auth/me", { signal: controller.signal });
        if (disposed) return;
        setUser(res.data);
        setAuthStatus("authenticated");
      } catch (err) {
        if (disposed) return;

        if (err.response?.status === 401) {
          console.error("Session expired", err);
          logout();
          return;
        }

        if (attempt < 2 && !authRetryRef.current) {
          authRetryRef.current = setTimeout(() => {
            authRetryRef.current = null;
            runAuthCheck(attempt + 1);
          }, 3000);
          return;
        }

        // Any non-401 error after retry resolves auth deterministically.
        setUser(null);
        setAuthStatus("unauthenticated");
      } finally {
        clearTimeout(timeoutId);
      }
    };

    runAuthCheck(1);

    return () => {
      disposed = true;
      if (authRetryRef.current) {
        clearTimeout(authRetryRef.current);
        authRetryRef.current = null;
      }
    };
  }, [token, setUser, logout, setAuthStatus]);

  // Socket connection - only after user is loaded
  // DISABLED temporarily to debug 429 errors - socket.io might be causing cascading requests
 useEffect(() => {
  if (!token || !user?.id) return undefined;
  const socket = createSocket(user);
  setSocket(socket);
  return () => {
    socket.disconnect();
    setSocket(null);
  };
}, [token, user?.id, user?.username, setSocket]);

  return (
    <Router>
      <div className="min-h-screen bg-background jaali-bg text-on-surface">
        <ChallengeManager />
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/auth" element={<AuthPage />} />

          <Route
            path="/home"
            element={
              <ProtectedRoute>
                <Home />
              </ProtectedRoute>
            }
          />
          <Route
            path="/subject/:id"
            element={
              <ProtectedRoute>
                <SubjectDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile/:id?"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/leaderboard"
            element={
              <ProtectedRoute>
                <Leaderboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/notifications"
            element={
              <ProtectedRoute>
                <Notifications />
              </ProtectedRoute>
            }
          />

          <Route
            path="/battle"
            element={
              <ProtectedRoute>
                <BattleLobby />
              </ProtectedRoute>
            }
          />
          <Route
            path="/battle/host"
            element={
              <ProtectedRoute>
                <HostLobby />
              </ProtectedRoute>
            }
          />
          <Route
            path="/battle/lobby/:code"
            element={
              <ProtectedRoute>
                <ParticipantLobby />
              </ProtectedRoute>
            }
          />
          <Route
            path="/battle/waiting/:friendId"
            element={
              <ProtectedRoute>
                <ChallengeSent />
              </ProtectedRoute>
            }
          />
          <Route
            path="/lesson/:levelId"
            element={
              <ProtectedRoute>
                <ActiveQuiz />
              </ProtectedRoute>
            }
          />
          <Route
            path="/lesson/:levelId/complete"
            element={
              <ProtectedRoute>
                <LessonComplete />
              </ProtectedRoute>
            }
          />
          <Route
            path="/lesson/:levelId/review"
            element={
              <ProtectedRoute>
                <QuizReview />
              </ProtectedRoute>
            }
          />
          <Route
            path="/battle/results/:id"
            element={
              <ProtectedRoute>
                <BattleResults />
              </ProtectedRoute>
            }
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
