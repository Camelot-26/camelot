import { toNextJsHandler } from "better-auth/next-js";
import { getAuth } from "@/lib/auth";

function handle(method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE") {
  return (request: Request) => toNextJsHandler(getAuth())[method](request);
}

export const GET = handle("GET");
export const POST = handle("POST");
export const PATCH = handle("PATCH");
export const PUT = handle("PUT");
export const DELETE = handle("DELETE");
