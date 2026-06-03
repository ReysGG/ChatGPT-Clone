import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/better-auth";

export const dynamic = "force-dynamic";

export const { GET, POST, PUT, PATCH, DELETE } = toNextJsHandler(auth);
