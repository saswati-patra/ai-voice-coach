import { describe, expect, it } from "vitest";

import {
  loginProviderCopy,
  loginRedirectPath,
  protectedRouteRedirectPath,
  shouldShowWorkspaceNavigation,
  workspaceHeaderSubtitle,
} from "@/lib/auth-flow";

describe("auth flow", () => {
  it("keeps dev mode workspace routes open", () => {
    expect(
      protectedRouteRedirectPath({
        authReady: true,
        requiresFirebaseAuth: false,
        signedIn: false,
      })
    ).toBeNull();
    expect(
      shouldShowWorkspaceNavigation({
        requiresFirebaseAuth: false,
        signedIn: false,
      })
    ).toBe(true);
  });

  it("sends signed-out Firebase users to login", () => {
    expect(
      protectedRouteRedirectPath({
        authReady: true,
        requiresFirebaseAuth: true,
        signedIn: false,
      })
    ).toBe("/login");
    expect(
      shouldShowWorkspaceNavigation({
        requiresFirebaseAuth: true,
        signedIn: false,
      })
    ).toBe(false);
  });

  it("keeps signed-in Firebase users out of login", () => {
    expect(
      loginRedirectPath({
        requiresFirebaseAuth: true,
        signedIn: true,
      })
    ).toBe("/");
  });

  it("does not show signed-out profile text in the header", () => {
    expect(
      workspaceHeaderSubtitle({
        profile: "Signed out",
        requiresFirebaseAuth: true,
        signedIn: false,
      })
    ).toBe("Study workspace");
    expect(
      workspaceHeaderSubtitle({
        profile: "Local Dev User (dev-user)",
        requiresFirebaseAuth: true,
        signedIn: true,
      })
    ).toBe("Local Dev User (dev-user)");
  });

  it("uses Google account login copy", () => {
    expect(loginProviderCopy()).toEqual({
      actionLabel: "Continue with Google",
      description: "Use your Google account to continue.",
      title: "Login",
    });
  });
});
