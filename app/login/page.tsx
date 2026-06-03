import type { Metadata } from "next";
import LoginClient from "./client";

export const metadata: Metadata = {
  title: "Login - AI Chat Pribadi",
  description: "Sign in to AI Chat Pribadi",
};

export default function LoginPage(): React.ReactElement {
  return <LoginClient />;
}
