type ProtectedRouteState = {
  authReady: boolean;
  requiresFirebaseAuth: boolean;
  signedIn: boolean;
};

type AuthModeState = {
  requiresFirebaseAuth: boolean;
  signedIn: boolean;
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
