import { describe, expect, it, vi } from "vitest";
import { createAuthService } from "../../services/supabase/authService";
import type { CornerSupabaseClient } from "../../services/supabase/client";

describe("createAuthService", () => {
  it("passes a confirmation redirect URL through password sign-up", async () => {
    const signUp = vi.fn(async () => ({ data: { session: null, user: null }, error: null }));
    const auth = createAuthService({ auth: { signUp } } as unknown as CornerSupabaseClient);

    await auth.signUpWithPassword("boxer@example.com", "password", "corneriq://auth/confirm");

    expect(signUp).toHaveBeenCalledWith({
      email: "boxer@example.com",
      password: "password",
      options: { emailRedirectTo: "corneriq://auth/confirm" }
    });
  });

  it("leaves sign-up redirect unset when no callback is provided", async () => {
    const signUp = vi.fn(async () => ({ data: { session: null, user: null }, error: null }));
    const auth = createAuthService({ auth: { signUp } } as unknown as CornerSupabaseClient);

    await auth.signUpWithPassword("boxer@example.com", "password");

    expect(signUp).toHaveBeenCalledWith({
      email: "boxer@example.com",
      password: "password"
    });
  });
});
