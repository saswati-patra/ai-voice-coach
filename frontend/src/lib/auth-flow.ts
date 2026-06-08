type ProtectedRouteState = {
  authReady: boolean;
  requiresFirebaseAuth: boolean;
  signedIn: boolean;
};

type AuthModeState = {
  requiresFirebaseAuth: boolean;
  signedIn: boolean;
};

type HeaderSubtitleState = AuthModeState & {
  profile: string;
};

type LoginProviderCopy = {
  actionLabel: string;
  description: string;
  title: string;
};

type LandingPrimaryCta = {
  href: string;
  label: string;
};

const legacyWorkspaceRoutes = new Map([
  ["/study", "/app/study"],
  ["/review", "/app/review"],
  ["/voice", "/app/voice"],
  ["/cloud", "/app/cloud"],
]);

export function protectedRouteRedirectPath({
  authReady,
  requiresFirebaseAuth,
  signedIn,
}: ProtectedRouteState): string | null {
  if (!requiresFirebaseAuth || !authReady || signedIn) {
    return null;
  }

  return "/login";
}

export function loginRedirectPath({
  requiresFirebaseAuth,
  signedIn,
}: AuthModeState): string | null {
  if (signedIn) {
    return "/app";
  }

  if (!requiresFirebaseAuth) {
    return "/";
  }

  return null;
}

export function shouldShowWorkspaceNavigation({
  requiresFirebaseAuth,
  signedIn,
}: AuthModeState): boolean {
  return !requiresFirebaseAuth || signedIn;
}

export function workspaceHeaderSubtitle({
  profile,
  requiresFirebaseAuth,
  signedIn,
}: HeaderSubtitleState): string {
  if (requiresFirebaseAuth && !signedIn) {
    return "Study workspace";
  }

  return profile || "Local study workspace";
}

export function loginProviderCopy(): LoginProviderCopy {
  return {
    actionLabel: "Continue with Google",
    description: "Use your Google account to continue.",
    title: "Login",
  };
}

export function landingPrimaryCta({ signedIn }: { signedIn: boolean }): LandingPrimaryCta {
  return signedIn
    ? { href: "/app", label: "Open workspace" }
    : { href: "/login", label: "Start studying" };
}

export function legacyWorkspaceRedirectPath(pathname: string): string | null {
  return legacyWorkspaceRoutes.get(pathname) || null;
}
