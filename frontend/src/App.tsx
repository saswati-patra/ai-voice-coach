import { Navigate, Route, Routes } from "react-router-dom";

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
        <Route path="/" element={<DashboardPage workspace={workspace} />} />
        <Route path="/study" element={<StudyPage workspace={workspace} />} />
        <Route path="/review" element={<ReviewPage workspace={workspace} />} />
        <Route path="/voice" element={<VoicePage workspace={workspace} />} />
        <Route path="/cloud" element={<CloudPage workspace={workspace} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  );
}
