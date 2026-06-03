import type { Metadata } from "next";
import RegisterClient from "./client";

export const metadata: Metadata = {
  title: "Register - AI Chat Pribadi",
  description: "Create a new account for AI Chat Pribadi",
};

export default function RegisterPage(): React.ReactElement {
  return <RegisterClient />;
}
