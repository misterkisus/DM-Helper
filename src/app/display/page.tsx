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
        "relative block overflow-hidden bg-gradient-to-br from-amber-300/20 to-rose-500/10 flex items-center justify-center font-serif font-bold text-amber-100/80",
        props.className ?? "w-full h-full",
      ].join(" ")}
    >
      {props.src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={props.src} alt={props.name} className="w-full h-full object-cover" />
      ) : (
        <span className="text-[clamp(0.9rem,2vw,1.5rem)]">{initials(props.name)}</span>
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
  const upcoming = active ? queue.slice(1) : queue;

  return (
    <div className="min-h-screen w-full flex flex-col text-zinc-100 px-3 sm:px-5 lg:px-8 py-3 sm:py-5 lg:py-7">
      <LiveRefresher />

      <header className="anim-fade-up flex items-end justify-between gap-4 flex-wrap">
        <div className="flex-1 min-w-0">
          <div className="text-[10px] sm:text-xs uppercase tracking-[0.3em] text-zinc-500">Инициатива</div>
          <h1
            className="font-serif mt-1 gold-text font-semibold leading-none truncate"
            style={{ fontSize: "clamp(1.3rem, 3.6vw, 2.6rem)" }}
          >
            {enc.name}
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-[10px] sm:text-xs uppercase tracking-[0.3em] text-zinc-500">Раунд</div>
            <div
              className="font-serif font-bold tabular-nums leading-none gold-text"
              style={{ fontSize: "clamp(1.6rem, 4.6vw, 3rem)" }}
            >
              {enc.round}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] sm:text-xs uppercase tracking-[0.3em] text-zinc-500">В очереди</div>
            <div
              className="font-serif font-bold tabular-nums leading-none text-zinc-200"
              style={{ fontSize: "clamp(1.6rem, 4.6vw, 3rem)" }}
            >
              {enc.combatants.length}
            </div>
          </div>
        </div>
      </header>

      <div className="ornate-divider mt-3 sm:mt-4" />

      {enc.combatants.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center anim-fade-in">
            <div
              className="font-serif text-zinc-500 italic"
              style={{ fontSize: "clamp(1.3rem, 3vw, 2rem)" }}
            >
              Бой ещё не начался
            </div>
            <div className="mt-2 text-sm text-zinc-600">Мастер готовит порядок ходов...</div>
          </div>
        </div>
      ) : (
        <>
          <section className="mt-4 sm:mt-6 overflow-x-auto">
            <ul className="flex items-end gap-2 sm:gap-3 min-w-max pb-1.5 pt-4">
              {active && <QueueToken c={active} isActive label="Ходит" size="big" />}
              {upcoming.map((c, idx) => (
                <QueueToken key={c.id} c={c} isActive={false} position={idx + 2} />
              ))}
              {/* визуальный индикатор зацикливания + начало круга снова */}
              {active && (
                <>
                  <div className="shrink-0 flex flex-col items-center justify-end pb-3 px-1">
                    <span className="text-amber-200/70 text-2xl leading-none" aria-hidden="true">
                      ↻
                    </span>
                    <span className="mt-1 text-[9px] uppercase tracking-widest text-zinc-500 whitespace-nowrap">
                      круг
                    </span>
                  </div>
                  <QueueToken c={active} isActive={false} isWrapPreview />
                </>
              )}
            </ul>
          </section>

          {active && (
            <section className="mt-4 sm:mt-6 flex-1 flex items-center justify-center anim-fade-up">
              <ActiveBanner c={active} />
            </section>
          )}
        </>
      )}
    </div>
  );
}

function QueueToken(props: {
  c: Combatant;
  isActive: boolean;
  isWrapPreview?: boolean;
  position?: number;
  label?: string;
  size?: "big" | "normal";
}) {
  const big = props.size === "big";
  const visibleConditions = props.c.conditions.slice(0, 3);
  const hiddenConditions = props.c.conditions.length - visibleConditions.length;

  return (
    <li
      aria-current={props.isActive ? "step" : undefined}
      className={[
        "relative shrink-0 rounded-xl overflow-hidden border bg-gradient-to-b from-black/65 to-black/30 transition",
        big
          ? "w-[6.25rem] h-36 sm:w-[7.25rem] sm:h-[11rem] battle-card border-amber-200/70 ring-2 ring-amber-300/50 shadow-[0_0_40px_-8px_rgba(251,191,36,0.55)]"
          : props.c.isPlayer
            ? "w-[4.6rem] h-[6.2rem] sm:w-24 sm:h-32 border-emerald-400/30"
            : "w-[4.6rem] h-[6.2rem] sm:w-24 sm:h-32 border-rose-400/30",
        props.isWrapPreview ? "opacity-40" : "",
      ].join(" ")}
    >
      {/* top accent bar */}
      <div
        className={[
          "absolute inset-x-1 top-1 h-1 rounded-full",
          props.isActive ? "bg-amber-300" : props.c.isPlayer ? "bg-emerald-400/70" : "bg-rose-400/70",
        ].join(" ")}
      />

      {/* initiative badge */}
      <div
        className={[
          "absolute left-1.5 top-2 z-10 px-1.5 py-0.5 rounded-md bg-black/75 border text-[10px] font-serif tabular-nums",
          props.isActive ? "border-amber-300/60 text-amber-100" : "border-white/10 text-amber-100/90",
        ].join(" ")}
      >
        {props.c.initiative}
      </div>

      {/* active pulse dot */}
      {props.isActive && (
        <div className="absolute right-1.5 top-2 z-10 w-2.5 h-2.5 rounded-full bg-amber-300 shadow-[0_0_16px_rgba(251,191,36,0.9)]" />
      )}

      {/* portrait */}
      <Portrait
        src={props.c.portraitPath}
        name={props.c.displayName}
        className={[
          "absolute left-2 right-2",
          big ? "top-7 h-[5.2rem] sm:h-[6.4rem] rounded-lg" : "top-5 h-[3rem] sm:h-[4.2rem] rounded-lg",
        ].join(" ")}
      />

      {/* footer: name + condition dots */}
      <div className="absolute inset-x-1.5 bottom-1.5 z-10">
        <div
          className={[
            "truncate font-serif leading-tight",
            big ? "text-[11px] sm:text-sm text-amber-50 font-semibold" : "text-[10px] sm:text-xs text-zinc-100",
          ].join(" ")}
        >
          {props.c.displayName}
        </div>
        <div className="mt-1 flex items-center gap-1">
          {visibleConditions.map((cond) => (
            <span
              key={cond.id}
              title={CONDITION_BY_SLUG[cond.slug]?.ru ?? cond.slug}
              className="w-1.5 h-1.5 rounded-full bg-amber-300/80"
            />
          ))}
          {hiddenConditions > 0 && <span className="text-[9px] text-zinc-400">+{hiddenConditions}</span>}
          {props.isWrapPreview && <span className="ml-auto text-[9px] text-amber-200/70">круг</span>}
          {props.position && !big && !props.isWrapPreview && (
            <span className="ml-auto text-[9px] text-zinc-500 tabular-nums">#{props.position}</span>
          )}
        </div>
      </div>

      {props.label && big && (
        <div className="absolute left-1/2 -translate-x-1/2 -top-3 z-20 px-2 py-0.5 rounded-full bg-amber-400/90 text-[9px] uppercase tracking-widest text-zinc-900 font-bold whitespace-nowrap shadow-[0_2px_10px_rgba(251,191,36,0.6)]">
          {props.label}
        </div>
      )}
    </li>
  );
}

function ActiveBanner(props: { c: Combatant }) {
  const { c } = props;
  return (
    <div className="w-full max-w-3xl battle-card glass-strong rounded-2xl p-4 sm:p-6 flex items-center gap-4 sm:gap-6">
      <div className="shrink-0 w-24 h-24 sm:w-32 sm:h-32 rounded-2xl overflow-hidden border border-amber-300/40 shadow-[0_0_40px_-8px_rgba(251,191,36,0.55)]">
        <Portrait src={c.portraitPath} name={c.displayName} className="w-full h-full" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[10px] sm:text-xs uppercase tracking-[0.3em] text-amber-200/70">Сейчас ходит</div>
        <h2
          className="font-serif gold-text font-bold leading-tight mt-1 truncate"
          style={{ fontSize: "clamp(1.5rem, 4.4vw, 3rem)" }}
        >
          {c.displayName}
        </h2>
        <div className="mt-2 flex items-center gap-2 flex-wrap">
          <span
            className={[
              "text-[9px] sm:text-[10px] uppercase tracking-widest px-2.5 py-0.5 rounded-full border",
              c.isPlayer
                ? "bg-emerald-500/10 border-emerald-400/30 text-emerald-100"
                : "bg-rose-500/10 border-rose-400/30 text-rose-100",
            ].join(" ")}
          >
            {c.isPlayer ? "Игрок" : "Монстр"}
          </span>
          <span className="glass rounded-full px-3 py-1 text-xs sm:text-sm text-zinc-300">
            Инициатива{" "}
            <span className="text-amber-200 font-semibold tabular-nums">{c.initiative}</span>
          </span>
        </div>
        {c.conditions.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {c.conditions.map((cond) => {
              const def = CONDITION_BY_SLUG[cond.slug];
              return (
                <span
                  key={cond.id}
                  title={def?.desc ?? ""}
                  className="text-[11px] sm:text-xs px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-zinc-200"
                >
                  {formatCondition(cond.slug, cond.value)}
                </span>
              );
            })}
          </div>
        )}
      </div>
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
