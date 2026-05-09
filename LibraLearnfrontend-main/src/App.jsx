import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import LandingPage from "./components/LandingPage";
import AvatarPage from "./components/AvatarPage";
import LoginPage from "./components/LoginPage";
import SignupPage from "./components/SignupPage";
import ResetPasswordPage from "./components/ResetPasswordPage";
import HumanRightsReading from "./components/HumanRightsReading";
import QuizGamePage from "./components/QuizGamePage";
import HistoryPage from "./components/HistoryPage";
import ProfileSettings from "./components/ProfileSettings";
import CertificatePage from "./components/CertificatePage";
import { UserProvider } from "./contexts/UserContext";

function App() {
  return (
    <UserProvider>
      <Router>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/avatar" element={<AvatarPage />} />
          <Route path="/profile-settings" element={<ProfileSettings />} />
          <Route path="/certificate" element={<CertificatePage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/human-rights-reading" element={<HumanRightsReading />} />
          <Route path="/quiz-game" element={<QuizGamePage />} />
        </Routes>
      </Router>
    </UserProvider>
  );
}

export default App;
