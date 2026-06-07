import { describe, expect, it } from "vitest";

import {
  loginRedirectPath,
  protectedRouteRedirectPath,
  shouldShowWorkspaceNavigation,
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
});
