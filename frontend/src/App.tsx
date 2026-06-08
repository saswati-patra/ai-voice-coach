import { Navigate, Route, Routes } from "react-router-dom";
import type { ReactNode } from "react";

import { AuthRequired } from "@/components/auth-required";
import { AppShell } from "@/components/app-shell";
import { useVoiceCoachWorkspace } from "@/hooks/use-voice-coach-workspace";
import { CloudPage } from "@/pages/cloud-page";
import { DashboardPage } from "@/pages/dashboard-page";
import { LandingPage } from "@/pages/landing-page";
import { ReviewPage } from "@/pages/review-page";
import { StudyPage } from "@/pages/study-page";
import { VoicePage } from "@/pages/voice-page";
import { LoginPage } from "@/pages/login-page";
import { legacyWorkspaceRedirectPath } from "@/lib/auth-flow";

export function App() {
  const workspace = useVoiceCoachWorkspace();

  return (
    <Routes>
      <Route path="/" element={<LandingPage workspace={workspace} />} />
      <Route path="/login" element={<LoginPage workspace={workspace} />} />
      <Route
        path="/app"
        element={
          <WorkspacePage workspace={workspace}>
            <DashboardPage workspace={workspace} />
          </WorkspacePage>
        }
      />
      <Route
        path="/app/study"
        element={
          <WorkspacePage workspace={workspace}>
            <StudyPage workspace={workspace} />
          </WorkspacePage>
        }
      />
      <Route
        path="/app/review"
        element={
          <WorkspacePage workspace={workspace}>
            <ReviewPage workspace={workspace} />
          </WorkspacePage>
        }
      />
      <Route
        path="/app/voice"
        element={
          <WorkspacePage workspace={workspace}>
            <VoicePage workspace={workspace} />
          </WorkspacePage>
        }
      />
      <Route
        path="/app/cloud"
        element={
          <WorkspacePage workspace={workspace}>
            <CloudPage workspace={workspace} />
          </WorkspacePage>
        }
      />
      {["/study", "/review", "/voice", "/cloud"].map((path) => (
        <Route
          key={path}
          path={path}
          element={<Navigate to={legacyWorkspaceRedirectPath(path) || "/app"} replace />}
        />
      ))}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

type WorkspacePageProps = {
  children: ReactNode;
  workspace: ReturnType<typeof useVoiceCoachWorkspace>;
};

function WorkspacePage({ children, workspace }: WorkspacePageProps) {
  return (
    <AppShell workspace={workspace}>
      <AuthRequired workspace={workspace}>{children}</AuthRequired>
    </AppShell>
  );
}
