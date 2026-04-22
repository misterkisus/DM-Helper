import { getCurrentEncounter } from "@/lib/encounter";
import { formatCondition, CONDITION_BY_SLUG } from "@/lib/conditions";
import LiveRefresher from "./LiveRefresher";

export const dynamic = "force-dynamic";

export default async function DisplayPage() {
  const enc = await getCurrentEncounter();
  const active = enc.combatants.find((c) => c.id === enc.activeId);

  return (
    <div className="min-h-screen w-full bg-zinc-950 text-zinc-100 p-6 sm:p-10">
      <LiveRefresher />
      <header className="flex flex-wrap items-baseline justify-between gap-4 border-b border-zinc-800 pb-4">
        <h1 className="text-3xl sm:text-5xl font-bold tracking-tight">
          {enc.name}
        </h1>
        <div className="flex items-baseline gap-6">
          <div className="text-zinc-400 text-lg sm:text-xl">Раунд</div>
          <div className="text-4xl sm:text-6xl font-bold text-amber-300">
            {enc.round}
          </div>
        </div>
      </header>

      {enc.combatants.length === 0 ? (
        <div className="mt-32 text-center text-2xl text-zinc-500">
          Бой не начат
        </div>
      ) : (
        <ul className="mt-6 space-y-2">
          {enc.combatants.map((c, idx) => {
            const isActive = c.id === enc.activeId;
            const isFaded = !isActive && c.hasActed;
            return (
              <li
                key={c.id}
                className={[
                  "rounded-2xl border px-5 py-4 sm:py-5 transition",
                  isActive
                    ? "border-amber-300 bg-amber-300/10 shadow-[0_0_24px_-4px_rgba(252,211,77,0.6)]"
                    : "border-zinc-800 bg-zinc-900/40",
                  isFaded ? "opacity-40" : "",
                ].join(" ")}
              >
                <div className="flex items-center gap-4">
                  <div
                    className={[
                      "w-12 sm:w-16 text-center text-2xl sm:text-4xl font-bold tabular-nums",
                      isActive ? "text-amber-300" : "text-zinc-500",
                    ].join(" ")}
                  >
                    {c.initiative}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <span
                        className={[
                          "text-2xl sm:text-3xl font-semibold truncate",
                          isActive ? "text-amber-100" : "text-zinc-100",
                        ].join(" ")}
                      >
                        {c.displayName}
                      </span>
                      <span
                        className={[
                          "text-xs uppercase tracking-wider px-2 py-0.5 rounded-full",
                          c.isPlayer
                            ? "bg-emerald-900/60 text-emerald-200"
                            : "bg-rose-900/60 text-rose-200",
                        ].join(" ")}
                      >
                        {c.isPlayer ? "Игрок" : "Монстр"}
                      </span>
                    </div>
                    {c.conditions.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {c.conditions.map((cond) => {
                          const def = CONDITION_BY_SLUG[cond.slug];
                          return (
                            <span
                              key={cond.id}
                              title={def?.desc ?? ""}
                              className="text-sm sm:text-base px-2 py-0.5 rounded-md bg-zinc-800 border border-zinc-700 text-zinc-200"
                            >
                              {formatCondition(cond.slug, cond.value)}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  <div className="text-right text-zinc-500 text-xs sm:text-sm tabular-nums">
                    #{idx + 1}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {active && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 px-6 py-2 rounded-full bg-amber-300 text-zinc-900 text-sm sm:text-base font-semibold shadow-lg">
          Ходит: {active.displayName}
        </div>
      )}
    </div>
  );
}
