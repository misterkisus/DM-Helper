"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ConditionDef } from "@/lib/conditions";
import { formatCondition } from "@/lib/conditions";

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

  // ------- encounter actions
  const ctrl = (action: object) =>
    mutate(() =>
      fetch("/api/encounter/control", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(action),
      }),
    );

  // ------- combatant actions
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
    <div className="min-h-screen bg-zinc-950 text-zinc-100 pb-32">
      <header className="sticky top-0 z-10 bg-zinc-950/95 backdrop-blur border-b border-zinc-800 px-3 py-2">
        <div className="flex items-center justify-between gap-2">
          <input
            value={enc.name}
            onChange={(e) => setEnc({ ...enc, name: e.target.value })}
            onBlur={(e) => ctrl({ type: "rename", name: e.target.value })}
            className="flex-1 bg-transparent text-lg font-bold outline-none border-b border-transparent focus:border-zinc-700"
          />
          <div className="flex items-center gap-1">
            <span className="text-xs text-zinc-500">Раунд</span>
            <span className="text-xl font-bold text-amber-300 tabular-nums w-6 text-center">{enc.round}</span>
          </div>
          <button
            onClick={async () => {
              await fetch("/api/auth", { method: "DELETE" });
              router.replace("/login");
            }}
            className="text-xs text-zinc-500 hover:text-zinc-200 px-2"
          >
            выход
          </button>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <button onClick={() => ctrl({ type: "prev" })} disabled={busy} className="flex-1 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-sm font-medium">
            ← Назад
          </button>
          <button onClick={() => ctrl({ type: "next" })} disabled={busy} className="flex-[2] py-2 rounded-lg bg-amber-300 text-zinc-900 hover:bg-amber-200 text-sm font-bold">
            След. ход →
          </button>
          <button onClick={() => ctrl({ type: "publish" })} disabled={busy} className="px-3 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-sm font-medium">
            Опубликовать
          </button>
        </div>
        <div className="mt-2 flex items-center gap-2 text-xs text-zinc-400">
          <button onClick={() => ctrl({ type: "reset-round" })} className="px-2 py-1 rounded hover:bg-zinc-800">
            Сброс раунда
          </button>
          <button
            onClick={() => {
              if (confirm("Очистить весь бой?")) ctrl({ type: "clear" });
            }}
            className="px-2 py-1 rounded hover:bg-zinc-800 text-rose-400"
          >
            Очистить бой
          </button>
        </div>
      </header>

      <div className="px-3 mt-3 flex gap-2">
        <button
          onClick={() => setTab("fight")}
          className={`flex-1 py-2 rounded-lg text-sm font-medium ${tab === "fight" ? "bg-amber-300 text-zinc-900" : "bg-zinc-900 text-zinc-300"}`}
        >
          Бой ({enc.combatants.length})
        </button>
        <button
          onClick={() => setTab("library")}
          className={`flex-1 py-2 rounded-lg text-sm font-medium ${tab === "library" ? "bg-amber-300 text-zinc-900" : "bg-zinc-900 text-zinc-300"}`}
        >
          Игроки ({chars.length})
        </button>
      </div>

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
  );
}

// ============================================================
// Fight tab
// ============================================================
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
  return (
    <div className="px-3 mt-3 space-y-3">
      {props.enc.combatants.map((c) => (
        <CombatantCard
          key={c.id}
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
      ))}

      <AddCombatant chars={props.chars} encCombatants={props.enc.combatants} onAddChar={props.onAddCharacter} onAddMonster={props.onAddMonster} />
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
      className={[
        "rounded-xl border bg-zinc-900",
        props.isActive ? "border-amber-300 shadow-[0_0_16px_-6px_rgba(252,211,77,0.5)]" : "border-zinc-800",
      ].join(" ")}
    >
      <div className="flex items-center gap-2 p-3">
        <NumberInput
          value={c.initiative}
          onChange={(v) => props.onUpdate(c.id, { initiative: v })}
          className={`w-14 text-center text-xl font-bold tabular-nums ${props.isActive ? "text-amber-300" : ""}`}
          ariaLabel="инициатива"
        />
        <div className="flex-1 min-w-0">
          <input
            value={c.displayName}
            onChange={(e) => props.onUpdate(c.id, { displayName: e.target.value })}
            className="w-full bg-transparent font-semibold outline-none border-b border-transparent focus:border-zinc-700"
          />
          <div className="flex items-center gap-2 mt-0.5">
            <span className={`text-[10px] uppercase px-1.5 rounded ${c.isPlayer ? "bg-emerald-900/60 text-emerald-200" : "bg-rose-900/60 text-rose-200"}`}>
              {c.isPlayer ? "Игрок" : "Моб"}
            </span>
            {c.maxHp != null && (
              <HpBlock current={c.currentHp ?? 0} max={c.maxHp} onChange={(cur) => props.onUpdate(c.id, { currentHp: cur })} />
            )}
          </div>
        </div>
        <button onClick={() => props.onSetActive(c.id)} className="text-[10px] px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700">
          ход
        </button>
        <button onClick={() => setOpen((o) => !o)} className="text-xs px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700">
          {open ? "▲" : "▼"}
        </button>
      </div>

      {c.conditions.length > 0 && (
        <div className="px-3 pb-2 flex flex-wrap gap-1">
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
        <div className="border-t border-zinc-800 p-3 space-y-3">
          <ConditionPicker defs={props.conditions} onPick={(slug, value) => props.onAddCondition(c.id, slug, value)} />
          <div className="flex items-center gap-2 text-xs">
            <label className="flex items-center gap-1">
              <input type="checkbox" checked={c.hasActed} onChange={(e) => props.onUpdate(c.id, { hasActed: e.target.checked })} />
              отыграл
            </label>
            <div className="flex-1" />
            <button
              onClick={() => {
                if (confirm(`Удалить ${c.displayName}?`)) props.onRemove(c.id);
              }}
              className="text-rose-400 hover:text-rose-300"
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
  function apply(sign: 1 | -1) {
    const n = parseInt(delta, 10);
    if (!Number.isFinite(n)) return;
    const next = Math.max(0, Math.min(props.max, props.current + sign * n));
    props.onChange(next);
    setDelta("");
  }
  return (
    <div className="flex items-center gap-1 text-xs">
      <span className="tabular-nums text-zinc-300">
        {props.current}/{props.max}
      </span>
      <input
        value={delta}
        onChange={(e) => setDelta(e.target.value.replace(/[^0-9]/g, ""))}
        placeholder="±"
        className="w-12 px-1 py-0.5 rounded bg-zinc-800 border border-zinc-700 outline-none text-center"
      />
      <button onClick={() => apply(-1)} className="px-1.5 rounded bg-rose-900/60 hover:bg-rose-800">
        −
      </button>
      <button onClick={() => apply(1)} className="px-1.5 rounded bg-emerald-900/60 hover:bg-emerald-800">
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
      className={`bg-zinc-800 border border-zinc-700 rounded outline-none px-1 py-0.5 ${props.className ?? ""}`}
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
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-zinc-800 border border-zinc-700 text-sm" title={def.desc}>
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
          className="w-10 px-1 bg-zinc-900 border border-zinc-700 rounded text-center"
        />
      )}
      <button onClick={props.onRemove} className="text-zinc-500 hover:text-rose-400 ml-0.5">
        ×
      </button>
    </span>
  );
}

function ConditionPicker(props: { defs: ConditionDef[]; onPick: (slug: string, value: number | null) => void }) {
  const [q, setQ] = useState("");
  const items = props.defs.filter((d) => d.ru.toLowerCase().includes(q.toLowerCase()) || d.slug.includes(q.toLowerCase()));
  return (
    <div>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Поиск состояния..."
        className="w-full px-2 py-1.5 rounded bg-zinc-800 border border-zinc-700 outline-none text-sm"
      />
      <div className="mt-2 flex flex-wrap gap-1 max-h-40 overflow-auto">
        {items.map((d) => (
          <button
            key={d.slug}
            onClick={() => props.onPick(d.slug, d.hasValue ? 1 : null)}
            title={d.desc}
            className="text-xs px-2 py-1 rounded bg-zinc-800 border border-zinc-700 hover:border-amber-300"
          >
            {d.ru}
            {d.hasValue && " *"}
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

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-3 space-y-2">
      <div className="flex gap-2">
        <button onClick={() => setMode("player")} className={`flex-1 py-1.5 rounded text-sm ${mode === "player" ? "bg-amber-300 text-zinc-900" : "bg-zinc-800"}`}>
          Из библиотеки
        </button>
        <button onClick={() => setMode("monster")} className={`flex-1 py-1.5 rounded text-sm ${mode === "monster" ? "bg-amber-300 text-zinc-900" : "bg-zinc-800"}`}>
          Монстр
        </button>
      </div>

      {mode === "player" ? (
        <div className="flex gap-2">
          <select value={charId} onChange={(e) => setCharId(e.target.value)} className="flex-1 px-2 py-1.5 rounded bg-zinc-800 border border-zinc-700 text-sm">
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
            className="w-16 px-2 py-1.5 rounded bg-zinc-800 border border-zinc-700 text-sm"
          />
          <button
            onClick={() => {
              if (!charId) return;
              const n = parseInt(init, 10);
              props.onAddChar(charId, Number.isFinite(n) ? n : 0);
              setCharId("");
              setInit("");
            }}
            className="px-3 py-1.5 rounded bg-emerald-700 hover:bg-emerald-600 text-sm font-medium"
          >
            +
          </button>
        </div>
      ) : (
        <div className="flex gap-2">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Имя моба" className="flex-1 px-2 py-1.5 rounded bg-zinc-800 border border-zinc-700 text-sm" />
          <input
            value={hp}
            onChange={(e) => setHp(e.target.value.replace(/[^0-9]/g, ""))}
            placeholder="HP"
            className="w-14 px-2 py-1.5 rounded bg-zinc-800 border border-zinc-700 text-sm"
          />
          <input
            value={init}
            onChange={(e) => setInit(e.target.value.replace(/[^0-9-]/g, ""))}
            placeholder="иниц."
            className="w-16 px-2 py-1.5 rounded bg-zinc-800 border border-zinc-700 text-sm"
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
            className="px-3 py-1.5 rounded bg-emerald-700 hover:bg-emerald-600 text-sm font-medium"
          >
            +
          </button>
        </div>
      )}
    </div>
  );
}

// ============================================================
// Library tab
// ============================================================
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
    <div className="px-3 mt-3 space-y-3">
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-3 space-y-2">
        <div className="text-xs uppercase text-zinc-500">Добавить персонажа</div>
        <div className="flex gap-2">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Имя" className="flex-1 px-2 py-1.5 rounded bg-zinc-800 border border-zinc-700 text-sm" />
          <input
            value={mod}
            onChange={(e) => setMod(e.target.value.replace(/[^0-9-]/g, ""))}
            placeholder="мод."
            className="w-16 px-2 py-1.5 rounded bg-zinc-800 border border-zinc-700 text-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1 text-sm">
            <input type="checkbox" checked={isPlayer} onChange={(e) => setIsPlayer(e.target.checked)} />
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
            className="px-3 py-1.5 rounded bg-emerald-700 hover:bg-emerald-600 text-sm font-medium"
          >
            Создать
          </button>
        </div>
      </div>

      {props.chars.map((c) => (
        <CharRow key={c.id} c={c} onUpdate={props.onUpdate} onDelete={props.onDelete} />
      ))}
    </div>
  );
}

function CharRow(props: { c: Character; onUpdate: (id: string, data: Partial<Character>) => void; onDelete: (id: string) => void }) {
  const { c } = props;
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-3 flex items-center gap-2">
      <input
        value={c.name}
        onChange={(e) => props.onUpdate(c.id, { name: e.target.value })}
        className="flex-1 bg-transparent font-medium outline-none border-b border-transparent focus:border-zinc-700"
      />
      <label className="flex items-center gap-1 text-xs text-zinc-400">
        <input type="checkbox" checked={c.isPlayer} onChange={(e) => props.onUpdate(c.id, { isPlayer: e.target.checked })} />
        игрок
      </label>
      <span className="text-xs text-zinc-500">мод</span>
      <NumberInput value={c.defaultInitMod} onChange={(v) => props.onUpdate(c.id, { defaultInitMod: v })} className="w-12 text-center" />
      <button
        onClick={() => {
          if (confirm(`Удалить ${c.name}?`)) props.onDelete(c.id);
        }}
        className="text-rose-400 hover:text-rose-300 text-sm"
      >
        ×
      </button>
    </div>
  );
}
