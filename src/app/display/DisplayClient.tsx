"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { EncounterPayload } from "@/lib/encounter";
import { formatCondition, CONDITION_BY_SLUG } from "@/lib/conditions";

type Combatant = EncounterPayload["combatants"][number];

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

function buildRepeatingBelt(queue: Combatant[], targetSlots: number) {
  if (!queue.length) return [];
  const cycle = queue.length > 1 ? [...queue.slice(1), queue[0]] : [queue[0]];
  const items: Array<{ combatant: Combatant; isWrapPreview: boolean; renderKey: string }> = [];

  for (let i = 0; i < targetSlots; i += 1) {
    const combatant = cycle[i % cycle.length];
    items.push({
      combatant,
      isWrapPreview: combatant.id === queue[0]?.id && i === cycle.length - 1,
      renderKey: `${combatant.id}:${i}`,
    });
  }

  return items;
}

function Portrait(props: {
  src?: string | null;
  name: string;
  className?: string;
  fit?: "cover" | "contain";
}) {
  const imageClass = props.fit === "contain" ? "object-contain p-1.5 bg-black/70" : "object-cover";

  return (
    <span
      className={[
        "relative block overflow-hidden bg-gradient-to-br from-amber-300/15 to-rose-500/10 flex items-center justify-center font-serif font-bold text-amber-100/80",
        props.className ?? "w-full h-full",
      ].join(" ")}
    >
      {props.src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={props.src} alt={props.name} className={`w-full h-full ${imageClass}`} />
      ) : (
        <span className="text-[clamp(1.5rem,4vw,3.5rem)] font-serif">{initials(props.name)}</span>
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

      <div className="absolute left-2 top-3 z-10 px-2 py-1 rounded-md bg-black/80 border border-white/10 text-sm sm:text-base font-serif tabular-nums text-amber-100 shadow-lg">
        {props.c.initiative}
      </div>

      {props.isActive && (
        <div className="absolute right-2 top-3 z-10 w-3.5 h-3.5 rounded-full bg-amber-300 shadow-[0_0_24px_rgba(251,191,36,0.95)] animate-pulse" />
      )}

      <Portrait
        src={props.c.portraitPath}
        name={props.c.displayName}
        fit={big ? "contain" : "cover"}
        className={[
          "absolute inset-x-0",
          big ? "top-0 bottom-[4.75rem] sm:bottom-[5.2rem]" : "top-0 bottom-[2.8rem] sm:bottom-[3.15rem]",
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
  const lastBeltSignature = useRef(beltSignature(props.initialEncounter));

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
          <div className="w-full max-w-[120rem] glass-strong rounded-[28px] overflow-hidden">
            <div className="flex items-center gap-3 lg:gap-4 p-3 lg:p-4">
              {active && (
                <div key={`${active.id}:${beltKey}`} className="shrink-0 anim-initiative-focus-shift initiative-track">
                  <QueueToken c={active} isActive size="big" label="Ходит" />
                </div>
              )}

              <div className="min-w-0 flex-1 overflow-hidden initiative-belt">
                <ul key={beltKey} className="flex items-center gap-3 lg:gap-4 min-w-max anim-initiative-belt-slide initiative-track">
                  {repeatedBelt.map((item, idx) => (
                    <QueueToken
                      key={`${item.renderKey}:${beltKey}`}
                      c={item.combatant}
                      isActive={false}
                      isWrapPreview={item.isWrapPreview}
                    />
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
