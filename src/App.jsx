import { Navigate, Route, Routes } from "react-router-dom";
import { AdminRoute } from "./components/AdminRoute";
import { AppShell } from "./components/AppShell";
import { AdminDashboardPage } from "./pages/AdminDashboardPage";
import { AdminPlayersPage } from "./pages/AdminPlayersPage";
import { AdminTournamentPage } from "./pages/AdminTournamentPage";
import { HomePage } from "./pages/HomePage";
import { JoinPage } from "./pages/JoinPage";
import { PlayerProfilePage } from "./pages/PlayerProfilePage";
import { SeasonPage } from "./pages/SeasonPage";
import { TournamentPage } from "./pages/TournamentPage";
import { LiveNightPage } from "./pages/LiveNightPage";

export default function App() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<HomeEntry />} />
        <Route path="/tournament/:id" element={<TournamentPage />} />
        <Route path="/screen/:id" element={<LiveNightPage />} />
        <Route path="/tv/:tournamentId" element={<LiveNightPage />} />
        <Route path="/bracket/:id" element={<NavigateToTournament />} />
        <Route path="/season/:year" element={<SeasonPage />} />
        <Route path="/join/:tournamentId/:playerId" element={<JoinPage />} />
        <Route path="/player/:playerId" element={<PlayerProfilePage />} />
        <Route path="/admin" element={<AdminRoute><AdminDashboardPage /></AdminRoute>} />
        <Route path="/admin/players" element={<AdminRoute><AdminPlayersPage /></AdminRoute>} />
        <Route path="/admin/tournament/:id" element={<AdminRoute><AdminTournamentPage /></AdminRoute>} />
        <Route path="/admin/tournaments/:id" element={<AdminRoute><AdminTournamentPage /></AdminRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  );
}

function HomeEntry() {
  const lastPlayerId = localStorage.getItem('fvc_last_player_id') || '';
  const hasToken = lastPlayerId ? Boolean(localStorage.getItem(`fvc_magic_${lastPlayerId}`)) : false;
  if (lastPlayerId && hasToken) return <Navigate to={`/player/${lastPlayerId}`} replace />;
  return <HomePage />;
}

function NavigateToTournament() {
  return <Navigate to={location.pathname.replace("/bracket/", "/tournament/")} replace />;
}
