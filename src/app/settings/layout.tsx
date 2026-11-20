import { redirect } from "next/navigation";

import { currentSession } from "@/server/session";
import { visibleSettingsSections } from "@/ui/nav";
import { SettingsNav } from "@/ui/settings-nav";

/**
 * A-15 shell: section list beside the content at 1024 and up, single column below. A guest
 * opening an app URL goes to PU-3 (FR-002).
 */
export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const session = await currentSession();
  if (session === null) redirect("/login?notice=expired");

  return (
    <div className="lg:flex lg:gap-10">
      <div className="lg:w-[220px] lg:shrink-0">
        <SettingsNav sections={visibleSettingsSections()} />
      </div>
      <div className="mt-8 min-w-0 flex-1 lg:mt-0 lg:max-w-[720px]">{children}</div>
    </div>
  );
}