import { defaultFocusMinutes } from "@/modules/sessions/public";

export function startTimer(): number {
  return defaultFocusMinutes();
}