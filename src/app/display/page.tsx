import { getCurrentEncounter } from "@/lib/encounter";
import { formatCondition, CONDITION_BY_SLUG } from "@/lib/conditions";
import LiveRefresher from "./LiveRefresher";

export const dynamic = "force-dynamic";

export default async function DisplayPage() {
  const enc = await getCurrentEncounter();
  const active = enc.combatants.find((c) => c.id === enc.activeId);
  const activeIdx = active ? enc.combatants.findIndex((c) => c.id === active.id) : -1;
  const next =
    activeIdx >= 0 && enc.combatants.length > 1
      ? enc.combatants[(activeIdx + 1) % enc.combatants.length]
      : null;

  return (
    <div className="min-h-screen w-full flex flex-col text-zinc-100 px-3 sm:px-8 md:px-12 py-4 sm:py-10">
      <LiveRefresher />

      <header className="anim-fade-up">
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div className="flex-1 min-w-0">
            <div className="text-[10px] sm:text-xs uppercase tracking-[0.3em] text-zinc-500">
              Инициатива
            </div>
            <h1 className="font-serif mt-1 gold-text font-semibold leading-none truncate"
                style={{ fontSize: "clamp(1.8rem, 5vw, 3.8rem)" }}>
              {enc.name}
            </h1>
          </div>
          <div className="flex items-center gap-3 sm:gap-5">
            <div className="text-right">
              <div className="text-[10px] sm:text-xs uppercase tracking-[0.3em] text-zinc-500">
                Раунд
              </div>
              <div className="font-serif font-bold tabular-nums leading-none gold-text"
                   style={{ fontSize: "clamp(2.2rem, 6vw, 4.6rem)" }}>
                {enc.round}
              </div>
            </div>
          </div>
        </div>
        <div className="ornate-divider mt-4 sm:mt-6" />
      </header>

      {active && (
        <section className="mt-5 sm:mt-8 grid gap-3 lg:grid-cols-[minmax(0,1.8fr)_minmax(280px,0.8fr)] anim-fade-up">
          <div className="battle-card glass-strong rounded-[1.75rem] p-4 sm:p-7">
            <div className="text-[10px] sm:text-xs uppercase tracking-[0.35em] text-amber-200/70">
              Сейчас ходит
            </div>
            <div className="mt-2 flex items-end gap-4 flex-wrap">
              <h2
                className="font-serif gold-text font-bold leading-none"
                style={{ fontSize: "clamp(2.1rem, 6vw, 5.6rem)" }}
              >
                {active.displayName}
              </h2>
              <span
                className={[
                  "mb-1 text-[10px] sm:text-xs uppercase tracking-widest px-3 py-1 rounded-full border",
                  active.isPlayer
                    ? "bg-emerald-500/10 border-emerald-400/30 text-emerald-100"
                    : "bg-rose-500/10 border-rose-400/30 text-rose-100",
                ].join(" ")}
              >
                {active.isPlayer ? "Игрок" : "Монстр"}
              </span>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="glass rounded-full px-3 py-1 text-xs sm:text-sm text-zinc-300">
                Инициатива <span className="text-amber-200 font-semibold tabular-nums">{active.initiative}</span>
              </span>
              <span className="glass rounded-full px-3 py-1 text-xs sm:text-sm text-zinc-300">
                Состояний <span className="text-amber-200 font-semibold tabular-nums">{active.conditions.length}</span>
              </span>
            </div>
          </div>

          <aside className="glass rounded-[1.75rem] p-4 sm:p-6 flex sm:flex-col justify-between gap-5">
            <div>
              <div className="text-[10px] uppercase tracking-[0.3em] text-zinc-500">Очередь</div>
              <div className="mt-2 font-serif text-3xl sm:text-4xl font-bold gold-text tabular-nums">
                {String(activeIdx + 1).padStart(2, "0")}
                <span className="text-zinc-600">/{String(enc.combatants.length).padStart(2, "0")}</span>
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-[0.3em] text-zinc-500">Следующий</div>
              <div className="mt-1 font-serif text-xl text-zinc-100 truncate">
                {next?.displayName ?? "конец круга"}
              </div>
            </div>
          </aside>
        </section>
      )}

      {enc.combatants.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center anim-fade-in">
            <div className="font-serif text-zinc-500 italic" style={{ fontSize: "clamp(1.3rem, 3vw, 2rem)" }}>
              Бой ещё не начался
            </div>
            <div className="mt-2 text-sm text-zinc-600">
              Мастер готовит порядок ходов...
            </div>
          </div>
        </div>
      ) : (
        <ul className="mt-5 sm:mt-8 space-y-2.5 sm:space-y-3">
          {enc.combatants.map((c, idx) => {
            const isActive = c.id === enc.activeId;
            const isPast = !isActive && activeIdx >= 0 && idx < activeIdx;
            const isFaded = isPast || (activeIdx < 0 && c.hasActed);
            const isQueue = !isActive && !isFaded;

            return (
              <li
                key={c.id}
                className={[
                  "anim-fade-up",
                  isActive ? "" : "transition-opacity",
                  isFaded ? "opacity-45" : "",
                ].join(" ")}
                style={{ animationDelay: `${Math.min(idx * 55, 600)}ms` }}
              >
                <div
                  className={[
                    "group relative flex items-stretch rounded-2xl overflow-hidden",
                    isActive ? "glass-strong anim-pulse-glow" : "glass",
                  ].join(" ")}
                >
                  {/* accent bar */}
                  <div
                    className={[
                      "w-1.5 sm:w-2 shrink-0",
                      isActive
                        ? "bg-gradient-to-b from-amber-200 via-amber-400 to-amber-600"
                        : c.isPlayer
                          ? "bg-gradient-to-b from-emerald-300/60 to-emerald-700/60"
                          : "bg-gradient-to-b from-rose-400/60 to-rose-800/60",
                    ].join(" ")}
                  />

                  {/* initiative shield */}
                  <div className="flex items-center justify-center shrink-0 w-14 sm:w-24 md:w-28 border-r border-white/5">
                    <div
                      className={[
                        "font-serif font-bold tabular-nums leading-none",
                        isActive ? "gold-text" : "text-zinc-400",
                      ].join(" ")}
                      style={{ fontSize: "clamp(1.6rem, 4.5vw, 3.2rem)" }}
                    >
                      {c.initiative}
                    </div>
                  </div>

                  {/* content */}
                  <div className="flex-1 min-w-0 py-3 sm:py-4 md:py-5 px-3 sm:px-6">
                    <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                      <h2
                        className={[
                          "font-serif font-semibold min-w-0 max-w-full truncate",
                          isActive ? "text-amber-50" : "text-zinc-100",
                        ].join(" ")}
                        style={{ fontSize: "clamp(1.1rem, 2.8vw, 2rem)" }}
                      >
                        {c.displayName}
                      </h2>
                      <span
                        className={[
                          "text-[9px] sm:text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full border",
                          c.isPlayer
                            ? "bg-emerald-500/10 border-emerald-400/30 text-emerald-200"
                            : "bg-rose-500/10 border-rose-400/30 text-rose-200",
                        ].join(" ")}
                      >
                        {c.isPlayer ? "Игрок" : "Монстр"}
                      </span>
                      {isActive && (
                        <span className="anim-fade-in text-[9px] sm:text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full bg-amber-400/20 border border-amber-300/50 text-amber-100">
                          Ходит
                        </span>
                      )}
                    </div>

                    {c.conditions.length > 0 && (
                      <div className="mt-2 sm:mt-3 flex flex-wrap gap-1.5">
                        {c.conditions.map((cond) => {
                          const def = CONDITION_BY_SLUG[cond.slug];
                          return (
                            <span
                              key={cond.id}
                              title={def?.desc ?? ""}
                              className="anim-pop-in inline-flex items-center gap-1.5 text-xs sm:text-sm px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-zinc-200"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-300/80" />
                              {formatCondition(cond.slug, cond.value)}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* position */}
                  <div className="hidden min-[420px]:flex items-center pr-3 sm:pr-5 text-zinc-600 text-xs sm:text-sm tabular-nums font-serif">
                    {String(idx + 1).padStart(2, "0")}
                  </div>

                  {isQueue && (
                    <div className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition" />
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {active && (
        <div className="sticky bottom-2 sm:bottom-4 mt-6 flex justify-center anim-fade-up" style={{ animationDelay: "200ms" }}>
          <div className="glass-strong rounded-full px-5 sm:px-8 py-2.5 sm:py-3 flex items-center gap-3 shadow-[0_10px_40px_-10px_rgba(232,193,112,0.4)]">
            <span className="text-[10px] sm:text-xs uppercase tracking-[0.3em] text-amber-200/80">
              Сейчас ходит
            </span>
            <span className="font-serif font-semibold gold-text"
                  style={{ fontSize: "clamp(1rem, 2.4vw, 1.6rem)" }}>
              {active.displayName}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
