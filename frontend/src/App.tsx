import { Navigate, Route, Routes } from "react-router-dom";

import { AuthRequired } from "@/components/auth-required";
import { AppShell } from "@/components/app-shell";
import { useVoiceCoachWorkspace } from "@/hooks/use-voice-coach-workspace";
import { CloudPage } from "@/pages/cloud-page";
import { DashboardPage } from "@/pages/dashboard-page";
import { ReviewPage } from "@/pages/review-page";
import { StudyPage } from "@/pages/study-page";
import { VoicePage } from "@/pages/voice-page";

export function App() {
  const workspace = useVoiceCoachWorkspace();

  return (
    <AppShell workspace={workspace}>
      <Routes>
        <Route
          path="/"
          element={
            <AuthRequired workspace={workspace}>
              <DashboardPage workspace={workspace} />
            </AuthRequired>
          }
        />
        <Route
          path="/study"
          element={
            <AuthRequired workspace={workspace}>
              <StudyPage workspace={workspace} />
            </AuthRequired>
          }
        />
        <Route
          path="/review"
          element={
            <AuthRequired workspace={workspace}>
              <ReviewPage workspace={workspace} />
            </AuthRequired>
          }
        />
        <Route
          path="/voice"
          element={
            <AuthRequired workspace={workspace}>
              <VoicePage workspace={workspace} />
            </AuthRequired>
          }
        />
        <Route path="/cloud" element={<CloudPage workspace={workspace} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  );
}
