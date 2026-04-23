"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { EncounterPayload } from "@/lib/encounter";
import { formatCondition, CONDITION_BY_SLUG } from "@/lib/conditions";

type Combatant = EncounterPayload["combatants"][number];
type BeltEntry =
  | { type: "token"; combatant: Combatant; isWrapPreview: boolean; renderKey: string }
  | { type: "divider"; renderKey: string };

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

function beltSignature(enc: EncounterPayload) {
  return `${enc.activeId ?? "idle"}|${enc.round}|${enc.combatants.map((c) => `${c.id}:${c.initiative}`).join(",")}`;
}

function queueFromActive(items: Combatant[], activeId: string | null) {
  const idx = activeId ? items.findIndex((c) => c.id === activeId) : -1;
  if (idx < 0) return items;
  return [...items.slice(idx), ...items.slice(0, idx)];
}

function buildRepeatingBelt(queue: Combatant[], targetSlots: number): BeltEntry[] {
  if (!queue.length) return [];
  const items: BeltEntry[] = [];
  const remainder = queue.length > 1 ? queue.slice(1) : [];
  const nextRoundCycle = queue;
  let tokenCount = 0;

  for (let i = 0; i < remainder.length && tokenCount < targetSlots; i += 1) {
    items.push({
      type: "token",
      combatant: remainder[i],
      isWrapPreview: false,
      renderKey: `remainder:${remainder[i].id}:${i}`,
    });
    tokenCount += 1;
  }

  if (queue.length > 1 && tokenCount < targetSlots) {
    items.push({ type: "divider", renderKey: "divider:next-round" });
  }

  let cycleIndex = 0;
  while (tokenCount < targetSlots) {
    for (let i = 0; i < nextRoundCycle.length && tokenCount < targetSlots; i += 1) {
      items.push({
        type: "token",
        combatant: nextRoundCycle[i],
        isWrapPreview: cycleIndex === 0 && i === 0,
        renderKey: `cycle:${cycleIndex}:${nextRoundCycle[i].id}:${i}`,
      });
      tokenCount += 1;
    }
    cycleIndex += 1;
  }

  return items;
}

function Portrait(props: {
  src?: string | null;
  name: string;
  className?: string;
  fit?: "cover" | "contain" | "contain-top";
}) {
  const imageClass =
    props.fit === "contain"
      ? "object-contain object-center p-1.5 bg-black/70"
      : props.fit === "contain-top"
        ? "object-cover object-[center_18%]"
        : "object-cover object-center";

  return (
    <span
      className={[
        "relative block overflow-hidden bg-gradient-to-br from-amber-300/15 to-rose-500/10 font-serif font-bold text-amber-100/80",
        props.className ?? "w-full h-full",
      ].join(" ")}
    >
      {props.src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={props.src} alt={props.name} className={`block w-full h-full ${imageClass}`} />
      ) : (
        <span className="absolute inset-0 flex items-center justify-center text-[clamp(1.5rem,4vw,3.5rem)] font-serif">
          {initials(props.name)}
        </span>
      )}
    </span>
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
          ? "w-[11rem] sm:w-[12.5rem] lg:w-[13.5rem] h-[14rem] sm:h-[15.5rem] lg:h-[17rem] battle-card border-amber-200/70 ring-4 ring-amber-300/40 shadow-[0_0_80px_-10px_rgba(251,191,36,0.55)]"
          : [
              "w-[6.3rem] sm:w-[7.2rem] lg:w-[8rem] h-[8.6rem] sm:h-[9.6rem] lg:h-[10.5rem]",
              props.c.isPlayer ? "border-emerald-400/40" : "border-rose-400/40",
            ].join(" "),
        props.isWrapPreview ? "opacity-55" : "",
      ].join(" ")}
    >
      <div
        className={[
          "absolute inset-x-0 top-0 h-1.5",
          props.isActive ? "bg-gradient-to-r from-amber-200 via-amber-400 to-amber-600" : props.c.isPlayer ? "bg-emerald-400/70" : "bg-rose-400/70",
        ].join(" ")}
      />

      <span className="absolute left-2 top-3 z-10 inline-flex w-auto max-w-max items-center justify-center px-2 py-1 rounded-md bg-black/80 border border-white/10 text-sm sm:text-base leading-none font-serif tabular-nums text-amber-100 shadow-lg">
        {props.c.initiative}
      </span>

      {props.isActive && (
        <div className="absolute right-2 top-3 z-10 w-3.5 h-3.5 rounded-full bg-amber-300 shadow-[0_0_24px_rgba(251,191,36,0.95)] animate-pulse" />
      )}

      <Portrait
        src={props.c.portraitPath}
        name={props.c.displayName}
        fit={big ? "contain-top" : "cover"}
        className={[
          big ? "absolute inset-0" : "absolute inset-x-0 top-0 bottom-[2.8rem] sm:bottom-[3.15rem]",
        ].join(" ")}
      />

      <div className="absolute inset-x-0 bottom-0 z-10 px-3 py-2 bg-gradient-to-t from-black/95 via-black/80 to-transparent">
        <div
          className={[
            "font-serif leading-tight text-center",
            big ? "text-sm sm:text-base lg:text-lg text-amber-50 font-bold" : "text-[11px] sm:text-xs lg:text-sm text-zinc-100 font-semibold",
            "truncate",
          ].join(" ")}
        >
          {props.c.displayName}
        </div>

        {big ? (
          <div className="mt-1.5 flex items-center justify-center gap-1 flex-wrap min-h-[1rem]">
            {allConditions.slice(0, 4).map((cond) => {
              const def = CONDITION_BY_SLUG[cond.slug];
              return (
                <span
                  key={cond.id}
                  title={def?.desc ?? ""}
                  className="text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded-full bg-amber-400/15 border border-amber-300/30 text-amber-100 truncate max-w-[6rem]"
                >
                  {formatCondition(cond.slug, cond.value)}
                </span>
              );
            })}
            {allConditions.length > 4 && (
              <span className="text-[9px] sm:text-[10px] text-amber-200/70">+{allConditions.length - 4}</span>
            )}
          </div>
        ) : (
          <div className="mt-1 flex items-center justify-center gap-1">
            {visibleConditions.map((cond) => (
              <span
                key={cond.id}
                title={CONDITION_BY_SLUG[cond.slug]?.ru ?? cond.slug}
                className="w-1.5 h-1.5 rounded-full bg-amber-300/80"
              />
            ))}
            {hiddenConditions > 0 && <span className="text-[10px] text-zinc-400">+{hiddenConditions}</span>}
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

function RoundDivider() {
  return (
    <li className="shrink-0 flex items-center gap-2 px-1.5 lg:px-2 text-amber-200/70">
      <span className="w-7 lg:w-9 h-px bg-gradient-to-r from-transparent via-amber-300/70 to-amber-300/25" />
      <span className="text-[9px] lg:text-[10px] uppercase tracking-[0.24em] whitespace-nowrap">Новый раунд</span>
      <span className="w-7 lg:w-9 h-px bg-gradient-to-r from-amber-300/25 via-amber-300/70 to-transparent" />
    </li>
  );
}

function ExplorationView(props: { image: { name: string; path: string } | null }) {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-black text-zinc-100 relative">
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

export default function DisplayClient(props: { initialEncounter: EncounterPayload }) {
  const [enc, setEnc] = useState(props.initialEncounter);
  const [beltKey, setBeltKey] = useState(0);
  const [roundBanner, setRoundBanner] = useState<number | null>(null);
  const lastBeltSignature = useRef(beltSignature(props.initialEncounter));
  const lastRound = useRef(props.initialEncounter.round);
  const roundBannerTimer = useRef<number | null>(null);

  useEffect(() => {
    const es = new EventSource("/api/events");
    let disposed = false;
    let currentRequest: AbortController | null = null;

    async function refreshEncounter() {
      currentRequest?.abort();
      const controller = new AbortController();
      currentRequest = controller;

      try {
        const res = await fetch("/api/encounter", {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!res.ok) return;
        const next = (await res.json()) as EncounterPayload;
        if (disposed) return;

        const nextSignature = beltSignature(next);
        if (nextSignature !== lastBeltSignature.current) {
          lastBeltSignature.current = nextSignature;
          setBeltKey((value) => value + 1);
        }

        if (next.round !== lastRound.current) {
          lastRound.current = next.round;
          setRoundBanner(next.round);
          if (roundBannerTimer.current) window.clearTimeout(roundBannerTimer.current);
          roundBannerTimer.current = window.setTimeout(() => setRoundBanner(null), 2400);
        }

        setEnc(next);
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          console.error("[display] failed to refresh encounter", error);
        }
      }
    }

    es.onmessage = () => {
      void refreshEncounter();
    };

    es.onerror = () => {
      // browser auto-reconnects
    };

    return () => {
      disposed = true;
      currentRequest?.abort();
      if (roundBannerTimer.current) window.clearTimeout(roundBannerTimer.current);
      es.close();
    };
  }, []);

  const queue = useMemo(() => queueFromActive(enc.combatants, enc.activeId), [enc.activeId, enc.combatants]);
  const active = enc.activeId ? queue[0] ?? null : null;
  const repeatedBelt = useMemo(
    () => buildRepeatingBelt(queue, Math.max(22, queue.length * 5)),
    [queue],
  );

  if (enc.displayMode === "exploration") {
    return <ExplorationView image={enc.activeImage} />;
  }

  return (
    <div className="min-h-screen w-full flex flex-col text-zinc-100 px-4 sm:px-8 lg:px-12 py-4 sm:py-6">
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
          <div className="relative w-full max-w-[120rem]">
            {roundBanner !== null && (
              <div key={roundBanner} className="pointer-events-none absolute left-1/2 -translate-x-1/2 -top-16 z-30 anim-round-banner">
                <div className="glass-strong rounded-[22px] px-5 py-3 border border-amber-300/35 shadow-[0_14px_46px_-18px_rgba(251,191,36,0.65)]">
                  <div className="text-[10px] uppercase tracking-[0.32em] text-amber-200/70 text-center">Раунд</div>
                  <div className="mt-1 font-serif font-bold gold-text leading-none text-center text-3xl sm:text-4xl">
                    {roundBanner}
                  </div>
                </div>
              </div>
            )}

            <div className="w-full glass-strong rounded-[28px] overflow-hidden">
            <div className="flex items-center gap-3 lg:gap-4 p-3 lg:p-4">
              {active && (
                <div key={`${active.id}:${beltKey}`} className="shrink-0 anim-initiative-focus-shift initiative-track">
                  <QueueToken c={active} isActive size="big" label="Ходит" />
                </div>
              )}

              <div className="min-w-0 flex-1 overflow-hidden initiative-belt">
                <ul key={beltKey} className="flex items-center gap-3 lg:gap-4 min-w-max anim-initiative-belt-slide initiative-track">
                  {repeatedBelt.map((item) =>
                    item.type === "divider" ? (
                      <RoundDivider key={`${item.renderKey}:${beltKey}`} />
                    ) : (
                      <QueueToken
                        key={`${item.renderKey}:${beltKey}`}
                        c={item.combatant}
                        isActive={false}
                        isWrapPreview={item.isWrapPreview}
                      />
                    ),
                  )}
                </ul>
              </div>
            </div>
          </div>
          </div>
        </div>
      )}
    </div>
  );
}
