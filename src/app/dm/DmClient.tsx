"use client";

import { useDeferredValue, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ConditionDef } from "@/lib/conditions";

type Condition = { id: string; slug: string; value: number | null };
type Combatant = {
  id: string;
  encounterId: string;
  characterId: string | null;
  displayName: string;
  isPlayer: boolean;
  initiative: number;
  tiebreaker: number;
  currentHp: number | null;
  maxHp: number | null;
  hasActed: boolean;
  order: number;
  conditions: Condition[];
};
type Encounter = {
  id: string;
  name: string;
  round: number;
  activeId: string | null;
  status: string;
  combatants: Combatant[];
};
type Character = {
  id: string;
  name: string;
  isPlayer: boolean;
  defaultInitMod: number;
  notes: string | null;
};

// ===================== primitives =====================

const btnBase =
  "inline-flex items-center justify-center gap-2 rounded-xl font-medium active:scale-[0.97] transition disabled:opacity-50 disabled:cursor-not-allowed select-none";

const btnGold = `${btnBase} bg-gradient-to-b from-amber-200 via-amber-300 to-amber-500 text-zinc-900 hover:from-amber-100 hover:via-amber-200 hover:to-amber-400 shadow-[0_4px_20px_-6px_rgba(232,193,112,0.5)]`;
const btnDark = `${btnBase} bg-white/5 hover:bg-white/10 text-zinc-100 border border-white/10`;
const btnGhost = `${btnBase} text-zinc-400 hover:text-zinc-100 hover:bg-white/5`;
const btnDanger = `${btnBase} bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-400/20`;
const btnEmerald = `${btnBase} bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-100 border border-emerald-400/30`;

const inputBase =
  "w-full px-3 py-2.5 rounded-xl bg-black/30 border border-white/10 focus:border-amber-300/50 outline-none transition text-[15px] placeholder:text-zinc-600";

// ===================== root =====================

export default function DmClient(props: {
  initialEncounter: Encounter;
  initialCharacters: Character[];
  conditions: ConditionDef[];
}) {
  const router = useRouter();
  const [enc, setEnc] = useState(props.initialEncounter);
  const [chars, setChars] = useState(props.initialCharacters);
  const [busy, startTransition] = useTransition();
  const [tab, setTab] = useState<"fight" | "library">("fight");
  const activeCombatant = enc.combatants.find((c) => c.id === enc.activeId);
  const playerCount = enc.combatants.filter((c) => c.isPlayer).length;
  const monsterCount = enc.combatants.length - playerCount;

  async function refresh() {
    const [e, c] = await Promise.all([
      fetch("/api/encounter").then((r) => r.json()),
      fetch("/api/characters").then((r) => r.json()),
    ]);
    setEnc(e);
    setChars(c);
  }

  function mutate(fn: () => Promise<unknown>) {
    startTransition(async () => {
      await fn();
      await refresh();
      router.refresh();
    });
  }

  const ctrl = (action: object) =>
    mutate(() =>
      fetch("/api/encounter/control", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(action),
      }),
    );

  const updateCombatant = (id: string, patch: Partial<Combatant>) =>
    mutate(() =>
      fetch(`/api/combatants/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(patch),
      }),
    );
  const removeCombatant = (id: string) => mutate(() => fetch(`/api/combatants/${id}`, { method: "DELETE" }));

  const addCondition = (combatantId: string, slug: string, value: number | null) =>
    mutate(() =>
      fetch(`/api/combatants/${combatantId}/conditions`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ slug, value }),
      }),
    );
  const removeCondition = (id: string) => mutate(() => fetch(`/api/conditions/${id}`, { method: "DELETE" }));
  const updateConditionValue = (id: string, value: number) =>
    mutate(() =>
      fetch(`/api/conditions/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ value }),
      }),
    );

  return (
    <div className="min-h-screen pb-40">
      {/* ========================= HEADER ========================= */}
      <header className="sticky top-0 z-20 glass-strong border-b border-white/10">
        <div className="px-3 sm:px-4 py-3 max-w-3xl mx-auto">
          <div className="flex items-center gap-2">
            <input
              value={enc.name}
              onChange={(e) => setEnc({ ...enc, name: e.target.value })}
              onBlur={(e) => ctrl({ type: "rename", name: e.target.value })}
              className="flex-1 bg-transparent font-serif text-lg sm:text-xl font-semibold text-amber-50 outline-none border-b border-transparent focus:border-amber-300/40 pb-0.5 min-w-0"
            />
            <div className="glass rounded-xl px-3 py-1.5 flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-wider text-zinc-500">Раунд</span>
              <span className="font-serif text-xl font-bold gold-text tabular-nums leading-none">{enc.round}</span>
            </div>
            <button
              onClick={async () => {
                await fetch("/api/auth", { method: "DELETE" });
                router.replace("/login");
              }}
              className={`${btnGhost} px-3 py-1.5 text-xs`}
              aria-label="Выйти"
              title="Выйти"
            >
              ⎋
            </button>
          </div>

          <div className="mt-3 grid grid-cols-[1fr_2fr_auto] gap-2">
            <button onClick={() => ctrl({ type: "prev" })} disabled={busy} className={`${btnDark} py-3 text-sm`}>
              ← Назад
            </button>
            <button onClick={() => ctrl({ type: "next" })} disabled={busy} className={`${btnGold} py-3 text-sm font-bold`}>
              След. ход →
            </button>
            <button
              onClick={() => ctrl({ type: "publish" })}
              disabled={busy}
              className={`${btnEmerald} px-3 py-3 text-sm font-semibold`}
              title="Опубликовать на планшет"
            >
              Экран
            </button>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-zinc-500">
            <span className="min-w-0 truncate">
              Сейчас:{" "}
              <span className={activeCombatant ? "text-amber-100" : "text-zinc-600"}>
                {activeCombatant?.displayName ?? "не выбран"}
              </span>
            </span>
            <span>
              Игроки: <span className="text-emerald-200/80 tabular-nums">{playerCount}</span>
            </span>
            <span>
              Мобы: <span className="text-rose-200/80 tabular-nums">{monsterCount}</span>
            </span>
            <span className="flex-1" />
            <button onClick={() => ctrl({ type: "reset-round" })} className={`${btnGhost} px-2 py-1`}>
              Сброс раунда
            </button>
            <button
              onClick={() => {
                if (confirm("Очистить весь бой?")) ctrl({ type: "clear" });
              }}
              className={`${btnGhost} px-2 py-1 text-rose-400 hover:text-rose-300`}
            >
              Очистить бой
            </button>
          </div>
        </div>
      </header>

      {/* ========================= TABS ========================= */}
      <div className="max-w-3xl mx-auto px-3 sm:px-4 mt-4">
        <div className="glass rounded-2xl p-1 grid grid-cols-2 relative">
          <div
            className="absolute top-1 bottom-1 w-1/2 rounded-xl bg-gradient-to-b from-amber-200 via-amber-300 to-amber-500 transition-transform duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] shadow-[0_4px_20px_-6px_rgba(232,193,112,0.5)]"
            style={{ transform: tab === "fight" ? "translateX(0%)" : "translateX(100%)" }}
          />
          <button
            onClick={() => setTab("fight")}
            className={`relative z-10 py-2.5 text-sm font-semibold transition ${tab === "fight" ? "text-zinc-900" : "text-zinc-300"}`}
          >
            Бой · {enc.combatants.length}
          </button>
          <button
            onClick={() => setTab("library")}
            className={`relative z-10 py-2.5 text-sm font-semibold transition ${tab === "library" ? "text-zinc-900" : "text-zinc-300"}`}
          >
            Игроки · {chars.length}
          </button>
        </div>
      </div>

      {/* ========================= CONTENT ========================= */}
      <div className="max-w-3xl mx-auto">
        {tab === "fight" ? (
          <FightTab
            enc={enc}
            chars={chars}
            conditions={props.conditions}
            onSetActive={(id) => ctrl({ type: "set-active", combatantId: id })}
            onAddCharacter={(characterId, initiative) =>
              mutate(() =>
                fetch("/api/combatants", {
                  method: "POST",
                  headers: { "content-type": "application/json" },
                  body: JSON.stringify({ characterId, initiative }),
                }),
              )
            }
            onAddMonster={(name, initiative, maxHp) =>
              mutate(() =>
                fetch("/api/combatants", {
                  method: "POST",
                  headers: { "content-type": "application/json" },
                  body: JSON.stringify({ displayName: name, isPlayer: false, initiative, maxHp }),
                }),
              )
            }
            updateCombatant={updateCombatant}
            removeCombatant={removeCombatant}
            addCondition={addCondition}
            removeCondition={removeCondition}
            updateConditionValue={updateConditionValue}
          />
        ) : (
          <LibraryTab
            chars={chars}
            onCreate={(data) =>
              mutate(() =>
                fetch("/api/characters", {
                  method: "POST",
                  headers: { "content-type": "application/json" },
                  body: JSON.stringify(data),
                }),
              )
            }
            onUpdate={(id, data) =>
              mutate(() =>
                fetch(`/api/characters/${id}`, {
                  method: "PATCH",
                  headers: { "content-type": "application/json" },
                  body: JSON.stringify(data),
                }),
              )
            }
            onDelete={(id) => mutate(() => fetch(`/api/characters/${id}`, { method: "DELETE" }))}
          />
        )}
      </div>
    </div>
  );
}

// ===================== FIGHT TAB =====================

function FightTab(props: {
  enc: Encounter;
  chars: Character[];
  conditions: ConditionDef[];
  onSetActive: (id: string) => void;
  onAddCharacter: (id: string, initiative: number) => void;
  onAddMonster: (name: string, initiative: number, maxHp?: number) => void;
  updateCombatant: (id: string, patch: Partial<Combatant>) => void;
  removeCombatant: (id: string) => void;
  addCondition: (combatantId: string, slug: string, value: number | null) => void;
  removeCondition: (id: string) => void;
  updateConditionValue: (id: string, value: number) => void;
}) {
  const active = props.enc.combatants.find((c) => c.id === props.enc.activeId);
  const activeIdx = active ? props.enc.combatants.findIndex((c) => c.id === active.id) : -1;
  const waitingCount =
    activeIdx >= 0
      ? props.enc.combatants.length - activeIdx - 1
      : props.enc.combatants.filter((c) => !c.hasActed).length;

  return (
    <div className="px-3 sm:px-4 mt-4 space-y-2.5">
      <section className="grid grid-cols-3 gap-2">
        <div className="battle-card glass-strong rounded-2xl p-3 col-span-2">
          <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Сейчас ходит</div>
          <div className="mt-1 font-serif text-xl font-semibold text-amber-50 truncate">
            {active?.displayName ?? "не выбран"}
          </div>
        </div>
        <div className="glass rounded-2xl p-3">
          <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Далее</div>
          <div className="mt-1 font-serif text-xl font-semibold gold-text tabular-nums">
            {waitingCount}
          </div>
        </div>
      </section>

      {props.enc.combatants.length === 0 && (
        <div className="glass rounded-2xl p-6 text-center text-zinc-500 anim-fade-in">
          <div className="font-serif italic">Пока никого нет</div>
          <div className="text-xs mt-1">Добавь персонажей снизу</div>
        </div>
      )}

      {props.enc.combatants.map((c, idx) => (
        <div key={c.id} className="anim-fade-up" style={{ animationDelay: `${Math.min(idx * 40, 300)}ms` }}>
          <CombatantCard
            c={c}
            isActive={c.id === props.enc.activeId}
            conditions={props.conditions}
            onSetActive={props.onSetActive}
            onUpdate={props.updateCombatant}
            onRemove={props.removeCombatant}
            onAddCondition={props.addCondition}
            onRemoveCondition={props.removeCondition}
            onUpdateConditionValue={props.updateConditionValue}
          />
        </div>
      ))}

      <AddCombatant
        chars={props.chars}
        encCombatants={props.enc.combatants}
        onAddChar={props.onAddCharacter}
        onAddMonster={props.onAddMonster}
      />
    </div>
  );
}

function CombatantCard(props: {
  c: Combatant;
  isActive: boolean;
  conditions: ConditionDef[];
  onSetActive: (id: string) => void;
  onUpdate: (id: string, patch: Partial<Combatant>) => void;
  onRemove: (id: string) => void;
  onAddCondition: (combatantId: string, slug: string, value: number | null) => void;
  onRemoveCondition: (id: string) => void;
  onUpdateConditionValue: (id: string, value: number) => void;
}) {
  const { c } = props;
  const [open, setOpen] = useState(false);

  return (
    <div
      aria-current={props.isActive ? "step" : undefined}
      className={[
        "relative rounded-2xl overflow-hidden transition",
        props.isActive ? "battle-card glass-strong anim-pulse-glow" : "glass",
      ].join(" ")}
    >
      {/* accent bar */}
      <div
        className={[
          "absolute left-0 top-0 bottom-0 w-1",
          props.isActive
            ? "bg-gradient-to-b from-amber-200 to-amber-500"
            : c.isPlayer
              ? "bg-gradient-to-b from-emerald-400/60 to-emerald-700/60"
              : "bg-gradient-to-b from-rose-400/60 to-rose-800/60",
        ].join(" ")}
      />

      <div className="flex items-center gap-3 p-3 pl-4">
        <NumberInput
          value={c.initiative}
          onChange={(v) => props.onUpdate(c.id, { initiative: v })}
          ariaLabel="Инициатива"
          className={`w-14 h-12 text-center text-xl font-serif font-bold tabular-nums ${props.isActive ? "gold-text" : "text-zinc-200"}`}
        />

        <div className="flex-1 min-w-0">
          <input
            value={c.displayName}
            onChange={(e) => props.onUpdate(c.id, { displayName: e.target.value })}
            className={`w-full bg-transparent font-serif text-lg font-semibold outline-none border-b border-transparent focus:border-amber-300/30 pb-0.5 ${props.isActive ? "text-amber-50" : "text-zinc-100"}`}
          />
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span
              className={[
                "text-[9px] uppercase tracking-widest px-1.5 py-0.5 rounded-md border",
                c.isPlayer
                  ? "bg-emerald-500/10 border-emerald-400/30 text-emerald-200"
                  : "bg-rose-500/10 border-rose-400/30 text-rose-200",
              ].join(" ")}
            >
              {c.isPlayer ? "Игрок" : "Монстр"}
            </span>
            {props.isActive && (
              <span className="text-[9px] uppercase tracking-widest px-1.5 py-0.5 rounded-md bg-amber-400/15 text-amber-100 border border-amber-300/40">
                активен
              </span>
            )}
            {c.maxHp != null && (
              <HpBlock current={c.currentHp ?? 0} max={c.maxHp} onChange={(cur) => props.onUpdate(c.id, { currentHp: cur })} />
            )}
            {c.hasActed && !props.isActive && (
              <span className="text-[9px] uppercase tracking-widest px-1.5 py-0.5 rounded-md bg-white/5 text-zinc-500 border border-white/10">
                отыграл
              </span>
            )}
          </div>
        </div>

        <button
          onClick={() => props.onSetActive(c.id)}
          className={`${props.isActive ? btnGold : btnDark} px-3 py-2 text-xs font-bold`}
          title="Сделать активным"
        >
          Ход
        </button>
        <button onClick={() => setOpen((o) => !o)} className={`${btnGhost} px-2 py-2 text-sm`} aria-label="Развернуть">
          {open ? "▲" : "▼"}
        </button>
      </div>

      {c.conditions.length > 0 && (
        <div className="px-4 pb-3 flex flex-wrap gap-1.5">
          {c.conditions.map((cond) => (
            <ConditionPill
              key={cond.id}
              cond={cond}
              defs={props.conditions}
              onRemove={() => props.onRemoveCondition(cond.id)}
              onValueChange={(v) => props.onUpdateConditionValue(cond.id, v)}
            />
          ))}
        </div>
      )}

      {open && (
        <div className="border-t border-white/10 bg-black/20 p-4 space-y-3 anim-fade-in">
          <ConditionPicker defs={props.conditions} onPick={(slug, value) => props.onAddCondition(c.id, slug, value)} />
          <div className="flex items-center gap-3 text-sm">
            <label className="flex items-center gap-2 text-zinc-300">
              <input
                type="checkbox"
                checked={c.hasActed}
                onChange={(e) => props.onUpdate(c.id, { hasActed: e.target.checked })}
                className="w-4 h-4 accent-amber-400"
              />
              отыграл
            </label>
            <div className="flex-1" />
            <button
              onClick={() => {
                if (confirm(`Удалить ${c.displayName}?`)) props.onRemove(c.id);
              }}
              className={`${btnDanger} px-3 py-1.5 text-xs`}
            >
              Удалить
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function HpBlock(props: { current: number; max: number; onChange: (n: number) => void }) {
  const [delta, setDelta] = useState("");
  const pct = Math.max(0, Math.min(100, (props.current / Math.max(1, props.max)) * 100));
  const color = pct > 60 ? "from-emerald-400 to-emerald-600" : pct > 25 ? "from-amber-300 to-amber-500" : "from-rose-400 to-rose-600";

  function apply(sign: 1 | -1) {
    const n = parseInt(delta, 10);
    if (!Number.isFinite(n)) return;
    const next = Math.max(0, Math.min(props.max, props.current + sign * n));
    props.onChange(next);
    setDelta("");
  }

  return (
    <div className="flex items-center gap-1.5 text-xs">
      <div className="relative w-20 h-4 rounded-full bg-black/40 overflow-hidden border border-white/10">
        <div className={`absolute inset-y-0 left-0 bg-gradient-to-r ${color} transition-all duration-300`} style={{ width: `${pct}%` }} />
        <span className="absolute inset-0 flex items-center justify-center text-[10px] tabular-nums font-semibold mix-blend-luminosity text-white/90">
          {props.current}/{props.max}
        </span>
      </div>
      <input
        value={delta}
        onChange={(e) => setDelta(e.target.value.replace(/[^0-9]/g, ""))}
        placeholder="±"
        className="w-10 h-6 px-1 rounded-md bg-black/40 border border-white/10 text-center outline-none focus:border-amber-300/40"
      />
      <button onClick={() => apply(-1)} className="w-6 h-6 rounded-md bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 active:scale-95 transition">
        −
      </button>
      <button onClick={() => apply(1)} className="w-6 h-6 rounded-md bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 active:scale-95 transition">
        +
      </button>
    </div>
  );
}

function NumberInput(props: { value: number; onChange: (v: number) => void; className?: string; ariaLabel?: string }) {
  const [local, setLocal] = useState(String(props.value));
  useEffect(() => {
    setLocal(String(props.value));
  }, [props.value]);
  return (
    <input
      aria-label={props.ariaLabel}
      inputMode="numeric"
      value={local}
      onChange={(e) => setLocal(e.target.value.replace(/[^0-9-]/g, ""))}
      onBlur={() => {
        const n = parseInt(local, 10);
        if (Number.isFinite(n) && n !== props.value) props.onChange(n);
        else setLocal(String(props.value));
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
      }}
      className={`bg-black/30 border border-white/10 rounded-xl outline-none focus:border-amber-300/50 ${props.className ?? ""}`}
    />
  );
}

function ConditionPill(props: {
  cond: Condition;
  defs: ConditionDef[];
  onRemove: () => void;
  onValueChange: (v: number) => void;
}) {
  const def = props.defs.find((d) => d.slug === props.cond.slug);
  if (!def) return null;
  return (
    <span className="anim-pop-in inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-sm text-zinc-200" title={def.desc}>
      <span className="w-1.5 h-1.5 rounded-full bg-amber-300/80" />
      {def.ru}
      {def.hasValue && (
        <input
          type="number"
          min={1}
          value={props.cond.value ?? 1}
          onChange={(e) => {
            const v = parseInt(e.target.value, 10);
            if (Number.isFinite(v) && v >= 1) props.onValueChange(v);
          }}
          className="w-9 px-1 bg-black/40 border border-white/10 rounded-md text-center outline-none focus:border-amber-300/40"
        />
      )}
      <button onClick={props.onRemove} className="text-zinc-500 hover:text-rose-400 ml-0.5 text-base leading-none" aria-label="Убрать">
        ×
      </button>
    </span>
  );
}

function ConditionPicker(props: { defs: ConditionDef[]; onPick: (slug: string, value: number | null) => void }) {
  const [q, setQ] = useState("");
  const deferredQ = useDeferredValue(q);
  const normalizedQ = deferredQ.trim().toLowerCase();
  const items = props.defs.filter((d) => d.ru.toLowerCase().includes(normalizedQ) || d.slug.includes(normalizedQ));
  return (
    <div>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Найти состояние..."
        className={inputBase}
      />
      <div className="mt-2 flex flex-wrap gap-1.5 max-h-48 overflow-auto py-1">
        {items.map((d) => (
          <button
            key={d.slug}
            onClick={() => props.onPick(d.slug, d.hasValue ? 1 : null)}
            title={d.desc}
            className="text-xs px-2.5 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 hover:border-amber-300/40 transition active:scale-95"
          >
            {d.ru}
            {d.hasValue && <span className="text-amber-300/80 ml-0.5">*</span>}
          </button>
        ))}
      </div>
    </div>
  );
}

function AddCombatant(props: {
  chars: Character[];
  encCombatants: Combatant[];
  onAddChar: (id: string, initiative: number) => void;
  onAddMonster: (name: string, initiative: number, maxHp?: number) => void;
}) {
  const [mode, setMode] = useState<"player" | "monster">("player");
  const [charId, setCharId] = useState("");
  const [init, setInit] = useState("");
  const [name, setName] = useState("");
  const [hp, setHp] = useState("");

  const inFight = new Set(props.encCombatants.map((c) => c.characterId).filter(Boolean) as string[]);
  const available = props.chars.filter((c) => !inFight.has(c.id));
  const selected = props.chars.find((c) => c.id === charId);

  return (
    <div className="glass rounded-2xl p-3 space-y-3 mt-4">
      <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 px-1">Добавить в бой</div>
      <div className="grid grid-cols-2 gap-2">
        <button onClick={() => setMode("player")} className={mode === "player" ? `${btnGold} py-2 text-sm` : `${btnDark} py-2 text-sm`}>
          Из библиотеки
        </button>
        <button onClick={() => setMode("monster")} className={mode === "monster" ? `${btnGold} py-2 text-sm` : `${btnDark} py-2 text-sm`}>
          Монстр
        </button>
      </div>

      {mode === "player" ? (
        <div className="grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_auto_auto] gap-2">
          <select
            value={charId}
            onChange={(e) => {
              setCharId(e.target.value);
              const s = props.chars.find((c) => c.id === e.target.value);
              if (s && !init) setInit(String(s.defaultInitMod));
            }}
            disabled={available.length === 0}
            className={`${inputBase} col-span-2 sm:col-span-1`}
          >
            <option value="">— выбрать —</option>
            {available.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} {c.isPlayer ? "" : "(моб)"}
              </option>
            ))}
          </select>
          <input
            value={init}
            onChange={(e) => setInit(e.target.value.replace(/[^0-9-]/g, ""))}
            placeholder="иниц."
            inputMode="numeric"
            className={`${inputBase} w-20 text-center`}
          />
          <button
            onClick={() => {
              if (!charId) return;
              const n = parseInt(init, 10);
              props.onAddChar(charId, Number.isFinite(n) ? n : 0);
              setCharId("");
              setInit("");
            }}
            disabled={!charId}
            className={`${btnEmerald} px-4 py-2 text-lg font-bold`}
          >
            +
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-[1fr_1fr_auto] sm:grid-cols-[1fr_auto_auto_auto] gap-2">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Имя" className={`${inputBase} col-span-3 sm:col-span-1`} />
          <input
            value={hp}
            onChange={(e) => setHp(e.target.value.replace(/[^0-9]/g, ""))}
            placeholder="HP"
            inputMode="numeric"
            className={`${inputBase} text-center sm:w-16`}
          />
          <input
            value={init}
            onChange={(e) => setInit(e.target.value.replace(/[^0-9-]/g, ""))}
            placeholder="иниц."
            inputMode="numeric"
            className={`${inputBase} text-center sm:w-20`}
          />
          <button
            onClick={() => {
              if (!name.trim()) return;
              const n = parseInt(init, 10);
              const h = parseInt(hp, 10);
              props.onAddMonster(name.trim(), Number.isFinite(n) ? n : 0, Number.isFinite(h) ? h : undefined);
              setName("");
              setInit("");
              setHp("");
            }}
            disabled={!name.trim()}
            className={`${btnEmerald} px-4 py-2 text-lg font-bold`}
          >
            +
          </button>
        </div>
      )}

      {mode === "player" && available.length === 0 && (
        <div className="text-xs text-zinc-500 px-1">
          Все персонажи из библиотеки уже добавлены в бой.
        </div>
      )}

      {mode === "player" && selected && (
        <div className="text-xs text-zinc-500 px-1">
          Бонус к инициативе: <span className="text-amber-200/80 font-semibold">{selected.defaultInitMod >= 0 ? `+${selected.defaultInitMod}` : selected.defaultInitMod}</span>
        </div>
      )}
    </div>
  );
}

// ===================== LIBRARY TAB =====================

function LibraryTab(props: {
  chars: Character[];
  onCreate: (data: { name: string; isPlayer: boolean; defaultInitMod: number }) => void;
  onUpdate: (id: string, data: Partial<Character>) => void;
  onDelete: (id: string) => void;
}) {
  const [name, setName] = useState("");
  const [isPlayer, setIsPlayer] = useState(true);
  const [mod, setMod] = useState("");

  return (
    <div className="px-3 sm:px-4 mt-4 space-y-2.5">
      <div className="glass rounded-2xl p-3 space-y-3">
        <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 px-1">Новый персонаж</div>
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Имя" className={inputBase} />
          <input
            value={mod}
            onChange={(e) => setMod(e.target.value.replace(/[^0-9-]/g, ""))}
            placeholder="мод."
            inputMode="numeric"
            className={`${inputBase} w-20 text-center`}
          />
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-zinc-300">
            <input type="checkbox" checked={isPlayer} onChange={(e) => setIsPlayer(e.target.checked)} className="w-4 h-4 accent-amber-400" />
            Игрок
          </label>
          <div className="flex-1" />
          <button
            onClick={() => {
              if (!name.trim()) return;
              const m = parseInt(mod, 10);
              props.onCreate({ name: name.trim(), isPlayer, defaultInitMod: Number.isFinite(m) ? m : 0 });
              setName("");
              setMod("");
            }}
            disabled={!name.trim()}
            className={`${btnGold} px-4 py-2 text-sm`}
          >
            Создать
          </button>
        </div>
      </div>

      {props.chars.length === 0 && (
        <div className="glass rounded-2xl p-6 text-center text-zinc-500 anim-fade-in">
          <div className="font-serif italic">Библиотека пуста</div>
          <div className="text-xs mt-1">Добавь игроков — они сохранятся между боями</div>
        </div>
      )}

      {props.chars.map((c, idx) => (
        <div key={c.id} className="anim-fade-up" style={{ animationDelay: `${Math.min(idx * 40, 300)}ms` }}>
          <CharRow c={c} onUpdate={props.onUpdate} onDelete={props.onDelete} />
        </div>
      ))}
    </div>
  );
}

function CharRow(props: { c: Character; onUpdate: (id: string, data: Partial<Character>) => void; onDelete: (id: string) => void }) {
  const { c } = props;
  return (
    <div className="glass rounded-2xl p-3 grid grid-cols-[1fr_auto] sm:flex sm:items-center gap-2 relative overflow-hidden">
      <div
        className={[
          "absolute left-0 top-0 bottom-0 w-1",
          c.isPlayer
            ? "bg-gradient-to-b from-emerald-400/60 to-emerald-700/60"
            : "bg-gradient-to-b from-rose-400/60 to-rose-800/60",
        ].join(" ")}
      />
      <input
        value={c.name}
        onChange={(e) => props.onUpdate(c.id, { name: e.target.value })}
        className="min-w-0 sm:flex-1 bg-transparent font-serif text-base font-semibold outline-none border-b border-transparent focus:border-amber-300/30 pb-0.5 pl-2"
      />
      <label className="flex items-center justify-end gap-1 text-xs text-zinc-400">
        <input type="checkbox" checked={c.isPlayer} onChange={(e) => props.onUpdate(c.id, { isPlayer: e.target.checked })} className="w-3.5 h-3.5 accent-amber-400" />
        игрок
      </label>
      <div className="flex items-center gap-1">
        <span className="text-[10px] text-zinc-500 uppercase">мод</span>
        <NumberInput value={c.defaultInitMod} onChange={(v) => props.onUpdate(c.id, { defaultInitMod: v })} className="w-12 h-8 text-center text-sm tabular-nums" />
      </div>
      <button
        onClick={() => {
          if (confirm(`Удалить ${c.name}?`)) props.onDelete(c.id);
        }}
        className={`${btnGhost} w-8 h-8 text-rose-400 hover:text-rose-300`}
        aria-label="Удалить"
      >
        ×
      </button>
    </div>
  );
}
