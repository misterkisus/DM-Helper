import { getCurrentEncounter } from "@/lib/encounter";
import { formatCondition, CONDITION_BY_SLUG } from "@/lib/conditions";
import LiveRefresher from "./LiveRefresher";

export const dynamic = "force-dynamic";

export default async function DisplayPage() {
  const enc = await getCurrentEncounter();
  const mode = enc.displayMode === "exploration" ? "exploration" : "scene";

  if (mode === "exploration") {
    return <ExplorationView image={enc.activeImage} />;
  }

  const active = enc.combatants.find((c) => c.id === enc.activeId);
  const activeIdx = active ? enc.combatants.findIndex((c) => c.id === active.id) : -1;
  const next =
    activeIdx >= 0 && enc.combatants.length > 1
      ? enc.combatants[(activeIdx + 1) % enc.combatants.length]
      : null;

  return (
    <div className="min-h-screen w-full flex flex-col text-zinc-100 px-3 sm:px-5 lg:px-8 py-3 sm:py-5 lg:py-7">
      <LiveRefresher />

      <header className="anim-fade-up">
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div className="flex-1 min-w-0">
            <div className="text-[10px] sm:text-xs uppercase tracking-[0.3em] text-zinc-500">
              Инициатива
            </div>
            <h1 className="font-serif mt-1 gold-text font-semibold leading-none truncate"
                style={{ fontSize: "clamp(1.45rem, 4vw, 3rem)" }}>
              {enc.name}
            </h1>
          </div>
          <div className="flex items-center gap-3 sm:gap-5">
            <div className="text-right">
              <div className="text-[10px] sm:text-xs uppercase tracking-[0.3em] text-zinc-500">
                Раунд
              </div>
              <div className="font-serif font-bold tabular-nums leading-none gold-text"
                   style={{ fontSize: "clamp(1.8rem, 5vw, 3.6rem)" }}>
                {enc.round}
              </div>
            </div>
          </div>
        </div>
        <div className="ornate-divider mt-3 sm:mt-4" />
      </header>

      {active && (
        <section className="mt-3 sm:mt-4 grid gap-2 sm:gap-3 min-[560px]:grid-cols-[minmax(0,1fr)_auto] anim-fade-up">
          <div className="battle-card glass-strong rounded-2xl p-3 sm:p-4">
            <div className="text-[9px] sm:text-[10px] uppercase tracking-[0.3em] text-amber-200/70">
              Сейчас ходит
            </div>
            <div className="mt-1.5 flex items-center gap-3 flex-wrap">
              <h2
                className="font-serif gold-text font-bold leading-none"
                style={{ fontSize: "clamp(1.45rem, 4.4vw, 3.4rem)" }}
              >
                {active.displayName}
              </h2>
              <span
                className={[
                  "text-[9px] sm:text-[10px] uppercase tracking-widest px-2.5 py-0.5 rounded-full border",
                  active.isPlayer
                    ? "bg-emerald-500/10 border-emerald-400/30 text-emerald-100"
                    : "bg-rose-500/10 border-rose-400/30 text-rose-100",
                ].join(" ")}
              >
                {active.isPlayer ? "Игрок" : "Монстр"}
              </span>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <span className="glass rounded-full px-3 py-1 text-xs sm:text-sm text-zinc-300">
                Инициатива <span className="text-amber-200 font-semibold tabular-nums">{active.initiative}</span>
              </span>
              <span className="glass rounded-full px-3 py-1 text-xs sm:text-sm text-zinc-300">
                Состояний <span className="text-amber-200 font-semibold tabular-nums">{active.conditions.length}</span>
              </span>
            </div>
          </div>

          <aside className="glass rounded-2xl p-3 sm:p-4 flex min-[560px]:flex-col items-center min-[560px]:items-start justify-between gap-4 min-[560px]:min-w-48">
            <div>
              <div className="text-[9px] sm:text-[10px] uppercase tracking-[0.25em] text-zinc-500">Очередь</div>
              <div className="mt-1 font-serif text-2xl sm:text-3xl font-bold gold-text tabular-nums">
                {String(activeIdx + 1).padStart(2, "0")}
                <span className="text-zinc-600">/{String(enc.combatants.length).padStart(2, "0")}</span>
              </div>
            </div>
            <div className="min-w-0 text-right min-[560px]:text-left">
              <div className="text-[9px] sm:text-[10px] uppercase tracking-[0.25em] text-zinc-500">Следующий</div>
              <div className="mt-1 font-serif text-lg sm:text-xl text-zinc-100 truncate">
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
        <ul className="mt-3 sm:mt-4 grid grid-cols-2 min-[640px]:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-3">
          {enc.combatants.map((c, idx) => {
            const isActive = c.id === enc.activeId;
            const isPast = !isActive && activeIdx >= 0 && idx < activeIdx;
            const isFaded = isPast || (activeIdx < 0 && c.hasActed);
            const visibleConditions = c.conditions.slice(0, 2);
            const hiddenConditions = c.conditions.length - visibleConditions.length;

            return (
              <li
                key={c.id}
                className={[
                  "anim-fade-up",
                  "min-w-0",
                  isActive ? "" : "transition-opacity",
                  isFaded ? "opacity-45" : "",
                ].join(" ")}
                style={{ animationDelay: `${Math.min(idx * 55, 600)}ms` }}
              >
                <div
                  aria-current={isActive ? "step" : undefined}
                  className={[
                    "group relative h-full min-h-[7.25rem] sm:min-h-[8rem] rounded-xl sm:rounded-2xl overflow-hidden p-2.5 sm:p-3 flex flex-col gap-2",
                    isActive ? "battle-card glass-strong anim-pulse-glow" : "glass",
                  ].join(" ")}
                >
                  <div
                    className={[
                      "absolute inset-x-0 top-0 h-1",
                      isActive
                        ? "bg-gradient-to-r from-amber-200 via-amber-400 to-amber-600"
                        : c.isPlayer
                          ? "bg-gradient-to-r from-emerald-300/60 to-emerald-700/60"
                          : "bg-gradient-to-r from-rose-400/60 to-rose-800/60",
                    ].join(" ")}
                  />

                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="font-serif text-xs sm:text-sm text-zinc-500 tabular-nums">
                        {String(idx + 1).padStart(2, "0")}
                      </span>
                      {isActive && (
                        <span className="text-[8px] sm:text-[9px] uppercase tracking-widest px-1.5 py-0.5 rounded-full bg-amber-400/20 border border-amber-300/50 text-amber-100">
                          Ходит
                        </span>
                      )}
                    </div>
                    <div
                      className={[
                        "font-serif font-bold tabular-nums leading-none",
                        isActive ? "gold-text" : "text-zinc-400",
                      ].join(" ")}
                      style={{ fontSize: "clamp(1.35rem, 4vw, 2.25rem)" }}
                    >
                      {c.initiative}
                    </div>
                  </div>

                  <div className="min-w-0 flex-1">
                    <h2
                      className={[
                        "font-serif font-semibold leading-tight line-clamp-2",
                        isActive ? "text-amber-50" : "text-zinc-100",
                      ].join(" ")}
                      style={{ fontSize: "clamp(1rem, 2.6vw, 1.35rem)" }}
                    >
                      {c.displayName}
                    </h2>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span
                      className={[
                        "text-[8px] sm:text-[9px] uppercase tracking-widest px-1.5 sm:px-2 py-0.5 rounded-full border",
                        c.isPlayer
                          ? "bg-emerald-500/10 border-emerald-400/30 text-emerald-200"
                          : "bg-rose-500/10 border-rose-400/30 text-rose-200",
                      ].join(" ")}
                    >
                      {c.isPlayer ? "Игрок" : "Монстр"}
                    </span>
                    {visibleConditions.map((cond) => {
                      const def = CONDITION_BY_SLUG[cond.slug];
                      return (
                        <span
                          key={cond.id}
                          title={def?.desc ?? ""}
                          className="anim-pop-in min-w-0 max-w-full truncate text-[10px] sm:text-[11px] px-1.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-zinc-200"
                        >
                          {formatCondition(cond.slug, cond.value)}
                        </span>
                      );
                    })}
                    {hiddenConditions > 0 && (
                      <span className="text-[10px] sm:text-[11px] px-1.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-zinc-400">
                        +{hiddenConditions}
                      </span>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

    </div>
  );
}

function ExplorationView(props: { image: { name: string; path: string } | null }) {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-black text-zinc-100 relative">
      <LiveRefresher />
      {props.image ? (
        <figure className="anim-fade-in w-full h-screen flex items-center justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={props.image.path}
            src={props.image.path}
            alt={props.image.name}
            className="max-w-full max-h-full object-contain"
          />
          <figcaption className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full glass text-sm text-amber-100 font-serif">
            {props.image.name}
          </figcaption>
        </figure>
      ) : (
        <div className="text-center anim-fade-in px-6">
          <div className="font-serif text-zinc-500 italic" style={{ fontSize: "clamp(1.3rem, 3vw, 2rem)" }}>
            Мастер готовит сцену...
          </div>
          <div className="mt-2 text-sm text-zinc-600">Режим исследования</div>
        </div>
      )}
    </div>
  );
}
