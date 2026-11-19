import { config } from "@/kernel/config";

export function defaultFocusMinutes(): number {
  return config.timer.focusMinutes;
}