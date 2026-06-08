import { describe, expect, it } from "vitest";

import {
  landingPrimaryCta,
  loginProviderCopy,
  loginRedirectPath,
  legacyWorkspaceRedirectPath,
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

  it("sends signed-in Firebase users from login to the workspace", () => {
    expect(
      loginRedirectPath({
        requiresFirebaseAuth: true,
        signedIn: true,
      })
    ).toBe("/app");
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

  it("switches landing primary CTA by signed-in state", () => {
    expect(landingPrimaryCta({ signedIn: false })).toEqual({
      href: "/login",
      label: "Start studying",
    });
    expect(landingPrimaryCta({ signedIn: true })).toEqual({
      href: "/app",
      label: "Open workspace",
    });
  });

  it("redirects old workspace paths under /app", () => {
    expect(legacyWorkspaceRedirectPath("/study")).toBe("/app/study");
    expect(legacyWorkspaceRedirectPath("/review")).toBe("/app/review");
    expect(legacyWorkspaceRedirectPath("/voice")).toBe("/app/voice");
    expect(legacyWorkspaceRedirectPath("/cloud")).toBe("/app/cloud");
    expect(legacyWorkspaceRedirectPath("/app")).toBeNull();
  });
});
