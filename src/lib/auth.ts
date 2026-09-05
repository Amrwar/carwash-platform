import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME, AUTH_TOKEN, isAuthenticatedValue } from "@/lib/auth-policy";

export async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  return isAuthenticatedValue(cookieStore.get(AUTH_COOKIE_NAME)?.value);
}

export async function setAuthCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE_NAME, AUTH_TOKEN, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    // No maxAge = session cookie (expires when browser closes)
  });
}

export async function clearAuthCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(AUTH_COOKIE_NAME);
}

export function verifyPassword(password: string): boolean {
  const correctPassword = process.env.ADMIN_PASSWORD;
  if (!correctPassword) {
    console.warn("ADMIN_PASSWORD not set in environment variables");
    return false;
  }
  return password === correctPassword;
}
