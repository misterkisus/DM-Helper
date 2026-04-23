import { getCurrentEncounter } from "@/lib/encounter";
import { formatCondition, CONDITION_BY_SLUG } from "@/lib/conditions";
import LiveRefresher from "./LiveRefresher";

export const dynamic = "force-dynamic";

type Combatant = Awaited<ReturnType<typeof getCurrentEncounter>>["combatants"][number];

function initials(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "?"
  );
}

function Portrait(props: { src?: string | null; name: string; className?: string }) {
  return (
    <span
      className={[
        "relative block overflow-hidden bg-gradient-to-br from-amber-300/15 to-rose-500/10 flex items-center justify-center font-serif font-bold text-amber-100/80",
        props.className ?? "w-full h-full",
      ].join(" ")}
    >
      {props.src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={props.src} alt={props.name} className="w-full h-full object-cover" />
      ) : (
        <span className="text-[clamp(1.5rem,4vw,3.5rem)] font-serif">{initials(props.name)}</span>
      )}
    </span>
  );
}

function queueFromActive(items: Combatant[], activeId: string | null) {
  const idx = activeId ? items.findIndex((c) => c.id === activeId) : -1;
  if (idx < 0) return items;
  return [...items.slice(idx), ...items.slice(0, idx)];
}

export default async function DisplayPage() {
  const enc = await getCurrentEncounter();
  const mode = enc.displayMode === "exploration" ? "exploration" : "scene";

  if (mode === "exploration") {
    return <ExplorationView image={enc.activeImage} />;
  }

  const queue = queueFromActive(enc.combatants, enc.activeId);
  const active = enc.activeId ? queue[0] ?? null : null;
  const rest = active ? queue.slice(1) : queue;
  const cycleStart = active ?? queue[0] ?? null;

  return (
    <div className="min-h-screen w-full flex flex-col text-zinc-100 px-4 sm:px-8 lg:px-12 py-4 sm:py-6">
      <LiveRefresher />

      <header className="anim-fade-up flex items-end justify-between gap-4 flex-wrap">
        <div className="flex-1 min-w-0">
          <div className="text-[10px] sm:text-xs uppercase tracking-[0.3em] text-zinc-500">Инициатива</div>
          <h1
            className="font-serif mt-1 gold-text font-semibold leading-none truncate"
            style={{ fontSize: "clamp(1.6rem, 3.5vw, 3rem)" }}
          >
            {enc.name}
          </h1>
        </div>
        <div className="flex items-center gap-6 sm:gap-10">
          <div className="text-right">
            <div className="text-[10px] sm:text-xs uppercase tracking-[0.3em] text-zinc-500">Раунд</div>
            <div
              className="font-serif font-bold tabular-nums leading-none gold-text"
              style={{ fontSize: "clamp(2rem, 5vw, 3.6rem)" }}
            >
              {enc.round}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] sm:text-xs uppercase tracking-[0.3em] text-zinc-500">В очереди</div>
            <div
              className="font-serif font-bold tabular-nums leading-none text-zinc-200"
              style={{ fontSize: "clamp(2rem, 5vw, 3.6rem)" }}
            >
              {enc.combatants.length}
            </div>
          </div>
        </div>
      </header>

      <div className="ornate-divider mt-4 sm:mt-6" />

      {enc.combatants.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center anim-fade-in">
            <div
              className="font-serif text-zinc-500 italic"
              style={{ fontSize: "clamp(1.4rem, 3vw, 2.2rem)" }}
            >
              Бой ещё не начался
            </div>
            <div className="mt-3 text-base text-zinc-600">Мастер готовит порядок ходов...</div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center py-6">
          <ul className="flex flex-wrap items-start justify-center gap-4 sm:gap-6 w-full max-w-[100rem]">
            {active && <QueueToken c={active} isActive size="big" label="Ходит" />}
            {rest.map((c) => (
              <QueueToken key={c.id} c={c} isActive={false} />
            ))}
            {cycleStart && enc.combatants.length > 0 && (
              <>
                <li
                  className="shrink-0 self-center flex flex-col items-center gap-2 px-2"
                  aria-hidden="true"
                >
                  <span className="text-amber-200/80 text-5xl sm:text-6xl leading-none">↻</span>
                  <span className="text-[10px] sm:text-xs uppercase tracking-widest text-zinc-500 whitespace-nowrap">
                    следующий круг
                  </span>
                </li>
                <QueueToken c={cycleStart} isActive={false} isWrapPreview />
              </>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

function QueueToken(props: {
  c: Combatant;
  isActive: boolean;
  isWrapPreview?: boolean;
  label?: string;
  size?: "big" | "normal";
}) {
  const big = props.size === "big";
  const visibleConditions = props.c.conditions.slice(0, 4);
  const hiddenConditions = props.c.conditions.length - visibleConditions.length;
  const allConditions = props.c.conditions;

  return (
    <li
      aria-current={props.isActive ? "step" : undefined}
      className={[
        "relative shrink-0 rounded-2xl overflow-hidden border transition",
        "bg-gradient-to-b from-black/60 to-black/30",
        big
          ? "w-[13rem] sm:w-[16rem] lg:w-[19rem] h-[18rem] sm:h-[22rem] lg:h-[26rem] battle-card border-amber-200/70 ring-4 ring-amber-300/40 shadow-[0_0_80px_-10px_rgba(251,191,36,0.55)]"
          : [
              "w-[8rem] sm:w-[10rem] lg:w-[12rem] h-[11.5rem] sm:h-[14rem] lg:h-[16.5rem]",
              props.c.isPlayer ? "border-emerald-400/40" : "border-rose-400/40",
            ].join(" "),
        props.isWrapPreview ? "opacity-35" : "",
      ].join(" ")}
    >
      <div
        className={[
          "absolute inset-x-0 top-0 h-1.5",
          props.isActive ? "bg-gradient-to-r from-amber-200 via-amber-400 to-amber-600" : props.c.isPlayer ? "bg-emerald-400/70" : "bg-rose-400/70",
        ].join(" ")}
      />

      <div className="absolute left-2 top-3 z-10 px-2 py-1 rounded-md bg-black/80 border border-white/10 text-sm sm:text-base font-serif tabular-nums text-amber-100 shadow-lg">
        {props.c.initiative}
      </div>

      {props.isActive && (
        <div className="absolute right-2 top-3 z-10 w-3.5 h-3.5 rounded-full bg-amber-300 shadow-[0_0_24px_rgba(251,191,36,0.95)] animate-pulse" />
      )}

      <Portrait
        src={props.c.portraitPath}
        name={props.c.displayName}
        className={[
          "absolute inset-x-0",
          big ? "top-0 bottom-[5.5rem] sm:bottom-[6.5rem]" : "top-0 bottom-[3.5rem] sm:bottom-[4rem]",
        ].join(" ")}
      />

      <div className="absolute inset-x-0 bottom-0 z-10 px-3 py-2 bg-gradient-to-t from-black/95 via-black/80 to-transparent">
        <div
          className={[
            "font-serif leading-tight text-center",
            big ? "text-base sm:text-lg lg:text-xl text-amber-50 font-bold" : "text-sm sm:text-base text-zinc-100 font-semibold",
            "truncate",
          ].join(" ")}
        >
          {props.c.displayName}
        </div>

        {big ? (
          <div className="mt-2 flex items-center justify-center gap-1.5 flex-wrap min-h-[1.25rem]">
            {allConditions.slice(0, 5).map((cond) => {
              const def = CONDITION_BY_SLUG[cond.slug];
              return (
                <span
                  key={cond.id}
                  title={def?.desc ?? ""}
                  className="text-[10px] sm:text-xs px-2 py-0.5 rounded-full bg-amber-400/15 border border-amber-300/30 text-amber-100 truncate max-w-[7rem]"
                >
                  {formatCondition(cond.slug, cond.value)}
                </span>
              );
            })}
            {allConditions.length > 5 && (
              <span className="text-[10px] sm:text-xs text-amber-200/70">+{allConditions.length - 5}</span>
            )}
          </div>
        ) : (
          <div className="mt-1.5 flex items-center justify-center gap-1.5">
            {visibleConditions.map((cond) => (
              <span
                key={cond.id}
                title={CONDITION_BY_SLUG[cond.slug]?.ru ?? cond.slug}
                className="w-2 h-2 rounded-full bg-amber-300/80"
              />
            ))}
            {hiddenConditions > 0 && (
              <span className="text-[10px] text-zinc-400">+{hiddenConditions}</span>
            )}
          </div>
        )}
      </div>

      {props.label && big && (
        <div className="absolute left-1/2 -translate-x-1/2 -top-4 z-20 px-4 py-1 rounded-full bg-amber-400 text-[11px] sm:text-xs uppercase tracking-widest text-zinc-900 font-bold whitespace-nowrap shadow-[0_4px_16px_rgba(251,191,36,0.7)]">
          {props.label}
        </div>
      )}

      {props.isWrapPreview && (
        <div className="absolute left-1/2 -translate-x-1/2 -top-3 z-20 px-2.5 py-0.5 rounded-full bg-zinc-800 border border-amber-300/30 text-[10px] uppercase tracking-widest text-amber-200/70 whitespace-nowrap">
          круг
        </div>
      )}
    </li>
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
          <div
            className="font-serif text-zinc-500 italic"
            style={{ fontSize: "clamp(1.3rem, 3vw, 2rem)" }}
          >
            Мастер готовит сцену...
          </div>
          <div className="mt-2 text-sm text-zinc-600">Режим исследования</div>
        </div>
      )}
    </div>
  );
}
