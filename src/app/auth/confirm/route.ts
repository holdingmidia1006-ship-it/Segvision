import { type EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const redirectTo = request.nextUrl.clone();
  redirectTo.pathname = "/dashboard";
  redirectTo.search = "";

  const supabase = await createServerSupabase();
  if (!supabase) {
    redirectTo.pathname = "/login";
    redirectTo.searchParams.set("confirmation", "unavailable");
    return NextResponse.redirect(redirectTo);
  }

  const code = request.nextUrl.searchParams.get("code");
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type") as EmailOtpType | null;

  const result = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : tokenHash && type
      ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
      : { error: new Error("Missing confirmation parameters") };

  if (!result.error) return NextResponse.redirect(redirectTo);

  redirectTo.pathname = "/login";
  redirectTo.searchParams.set("confirmation", "failed");
  return NextResponse.redirect(redirectTo);
}
