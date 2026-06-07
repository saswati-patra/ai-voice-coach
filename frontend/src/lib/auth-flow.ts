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

export function loginRedirectPath({ requiresFirebaseAuth, signedIn }: AuthModeState): string | null {
  if (!requiresFirebaseAuth || signedIn) {
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
