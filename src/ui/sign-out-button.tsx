"use client";

import { useState } from "react";

import { apiRequest } from "./api-client";
import { Button } from "./control";

/**
 * FR-004 from the header. NAVIGATION-STRUCTURE section 3 puts sign-out in the sidebar user
 * menu; that sidebar arrives with the first MVP destinations, so M02 keeps the action in
 * the header rather than leaving sign-out unreachable.
 */
export function SignOutButton() {
  const [pending, setPending] = useState(false);

  const signOut = async () => {
    setPending(true);
    await apiRequest<unknown>("/api/app/auth/sign-out", { method: "POST" });
    window.location.assign("/login?notice=signedout");
  };

  return (
    <Button variant="secondary" pending={pending} onClick={() => void signOut()}>
      Sign out
    </Button>
  );
}