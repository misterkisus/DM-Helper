"use client";

import { useDeferredValue, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ConditionDef } from "@/lib/conditions";
import type { SkillDef, SkillActionDef, DcRow, DcAdjust, LevelDc } from "@/lib/skills";

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
  portraitPath: string | null;
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
  displayMode: string;
  activeImageId: string | null;
  combatants: Combatant[];
};
type Character = {
  id: string;
  name: string;
  isPlayer: boolean;
  defaultInitMod: number;
  portraitPath: string | null;
  notes: string | null;
};
type SceneImage = {
  id: string;
  name: string;
  path: string;
  mimeType: string;
  width: number | null;
  height: number | null;
  createdAt: string | Date;
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
  "w-full min-h-11 px-3 py-2.5 rounded-xl bg-black/30 border border-white/10 focus:border-amber-300/50 outline-none transition text-[15px] placeholder:text-zinc-600";

async function readErrorMessage(res: Response, fallback: string) {
  try {
    const data = (await res.json()) as { error?: string; code?: string; hint?: string };
    return [data.error || fallback, data.code ? `Код: ${data.code}` : "", data.hint || ""]
      .filter(Boolean)
      .join("\n");
  } catch {
    return fallback;
  }
}

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "?";
}

async function uploadPortraitFile(file: File) {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch("/api/uploads", { method: "POST", body: fd });
  if (!res.ok) throw new Error(await readErrorMessage(res, "Не удалось загрузить портрет"));
  const data = (await res.json()) as { path?: string };
  if (!data.path) throw new Error("Сервер не вернул путь к портрету");
  return data.path;
}

function PortraitBadge(props: { src?: string | null; name: string; className?: string }) {
  return (
    <span
      className={[
        "relative shrink-0 overflow-hidden rounded-xl border border-amber-300/20 bg-gradient-to-br from-amber-300/20 to-rose-500/10 flex items-center justify-center font-serif font-bold text-amber-100 shadow-inner",
        props.className ?? "w-12 h-12",
      ].join(" ")}
    >
      {props.src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={props.src} alt={props.name} className="w-full h-full object-cover" />
      ) : (
        <span>{initials(props.name)}</span>
      )}
    </span>
  );
}

function PortraitUpload(props: {
  label: string;
  src?: string | null;
  name: string;
  onUpload: (file: File) => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);

  async function upload(file?: File) {
    if (!file) return;
    setBusy(true);
    try {
      await props.onUpload(file);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Не удалось загрузить портрет");
    } finally {
      setBusy(false);
    }
  }

  return (
    <label className="glass rounded-2xl p-2.5 flex items-center gap-3 cursor-pointer hover:border-amber-300/30 transition">
      <input
        type="file"
        accept="image/*"
        className="hidden"
        disabled={busy}
        onChange={(e) => {
          void upload(e.target.files?.[0]);
          e.currentTarget.value = "";
        }}
      />
      <PortraitBadge src={props.src} name={props.name} className="w-12 h-12" />
      <span className="min-w-0 flex-1">
        <span className="block text-[10px] uppercase tracking-[0.2em] text-zinc-500">{props.label}</span>
        <span className="block mt-0.5 text-sm text-zinc-200 truncate">
          {busy ? "Загружаю..." : props.src ? "Нажми, чтобы заменить" : "Нажми, чтобы добавить"}
        </span>
      </span>
    </label>
  );
}

// ===================== root =====================

export default function DmClient(props: {
  initialEncounter: Encounter;
  initialCharacters: Character[];
  initialImages: SceneImage[];
  conditions: ConditionDef[];
  skills: SkillDef[];
  simpleDcs: DcRow[];
  dcAdjustments: DcAdjust[];
  rarityAdjustments: DcAdjust[];
  levelDcs: LevelDc[];
}) {
  const router = useRouter();
  const [enc, setEnc] = useState(props.initialEncounter);
  const [chars, setChars] = useState(props.initialCharacters);
  const [images, setImages] = useState(props.initialImages);
  const [busy, startTransition] = useTransition();
  const [tab, setTab] = useState<"fight" | "library" | "skills" | "gallery">(
    props.initialEncounter.displayMode === "exploration" ? "gallery" : "fight",
  );
  const activeCombatant = enc.combatants.find((c) => c.id === enc.activeId);
  const playerCount = enc.combatants.filter((c) => c.isPlayer).length;
  const monsterCount = enc.combatants.length - playerCount;
  const isExploration = enc.displayMode === "exploration";
  const activeImage = images.find((i) => i.id === enc.activeImageId) ?? null;

  async function refresh() {
    const [e, c, i] = await Promise.all([
      fetch("/api/encounter").then((r) => r.json()),
      fetch("/api/characters").then((r) => r.json()),
      fetch("/api/images").then((r) => r.json()),
    ]);
    setEnc(e);
    setChars(c);
    setImages(i);
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
    <div className="min-h-screen pb-36 sm:pb-14">
      {/* ========================= HEADER ========================= */}
      <header className="sticky top-0 z-20 glass-strong border-b border-white/10">
        <div className="px-3 sm:px-4 py-3 max-w-3xl mx-auto space-y-3">
          <div className="flex items-center gap-2">
            <input
              value={enc.name}
              onChange={(e) => setEnc({ ...enc, name: e.target.value })}
              onBlur={(e) => ctrl({ type: "rename", name: e.target.value })}
              className="flex-1 bg-transparent font-serif text-lg sm:text-xl font-semibold text-amber-50 outline-none border-b border-transparent focus:border-amber-300/40 pb-0.5 min-w-0"
            />
            {!isExploration && (
              <div className="glass rounded-xl px-3 py-1.5 flex items-center gap-2">
                <span className="text-[10px] uppercase tracking-wider text-zinc-500">Раунд</span>
                <span className="font-serif text-xl font-bold gold-text tabular-nums leading-none">{enc.round}</span>
              </div>
            )}
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

          <ModeToggle
            mode={isExploration ? "exploration" : "scene"}
            busy={busy}
            onChange={(m) => {
              if ((m === "exploration") === isExploration) return;
              if (m === "exploration") setTab("gallery");
              else setTab("fight");
              ctrl({ type: "set-mode", mode: m });
            }}
          />

          {!isExploration && (
            <>
              <div className="hidden sm:grid grid-cols-[1fr_2fr_auto] gap-2">
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
                  title="Обновить экран"
                >
                  Обновить
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center sm:gap-x-3 sm:gap-y-1 text-[11px] text-zinc-500">
                <span className="glass rounded-xl px-2.5 py-1.5 min-w-0 truncate col-span-2 sm:col-span-1 sm:bg-transparent sm:border-0 sm:p-0">
                  Сейчас:{" "}
                  <span className={activeCombatant ? "text-amber-100" : "text-zinc-600"}>
                    {activeCombatant?.displayName ?? "не выбран"}
                  </span>
                </span>
                <span className="glass rounded-xl px-2.5 py-1.5 sm:bg-transparent sm:border-0 sm:p-0">
                  Игроки: <span className="text-emerald-200/80 tabular-nums">{playerCount}</span>
                </span>
                <span className="glass rounded-xl px-2.5 py-1.5 sm:bg-transparent sm:border-0 sm:p-0">
                  Мобы: <span className="text-rose-200/80 tabular-nums">{monsterCount}</span>
                </span>
                <span className="flex-1" />
                <button onClick={() => ctrl({ type: "reset-round" })} className={`${btnGhost} hidden sm:inline-flex px-2 py-1`}>
                  Сброс раунда
                </button>
                <button
                  onClick={() => {
                    if (confirm("Очистить весь бой?")) ctrl({ type: "clear" });
                  }}
                  className={`${btnGhost} hidden sm:inline-flex px-2 py-1 text-rose-400 hover:text-rose-300`}
                >
                  Очистить бой
                </button>
              </div>
            </>
          )}

          {isExploration && (
            <div className="text-[11px] text-zinc-500 flex items-center gap-2 flex-wrap">
              <span>На экране:</span>
              <span className={activeImage ? "text-amber-100" : "text-zinc-600"}>
                {activeImage?.name ?? "пусто"}
              </span>
              {activeImage && (
                <button
                  onClick={() => ctrl({ type: "set-image", imageId: null })}
                  className={`${btnGhost} px-2 py-1 text-[11px] ml-auto`}
                >
                  Скрыть
                </button>
              )}
            </div>
          )}
        </div>
      </header>

      {/* ========================= TABS ========================= */}
      <div className="max-w-3xl mx-auto px-3 sm:px-4 mt-4">
        <div className="glass rounded-2xl p-1 grid grid-cols-4 relative">
          <div
            className="absolute top-1 bottom-1 w-1/4 rounded-xl bg-gradient-to-b from-amber-200 via-amber-300 to-amber-500 transition-transform duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] shadow-[0_4px_20px_-6px_rgba(232,193,112,0.5)]"
            style={{
              transform: `translateX(${tab === "fight" ? 0 : tab === "library" ? 100 : tab === "skills" ? 200 : 300}%)`,
            }}
          />
          <button
            onClick={() => setTab("fight")}
            className={`relative z-10 py-2.5 text-xs sm:text-sm font-semibold transition ${tab === "fight" ? "text-zinc-900" : "text-zinc-300"}`}
          >
            Бой · {enc.combatants.length}
          </button>
          <button
            onClick={() => setTab("library")}
            className={`relative z-10 py-2.5 text-xs sm:text-sm font-semibold transition ${tab === "library" ? "text-zinc-900" : "text-zinc-300"}`}
          >
            База · {chars.length}
          </button>
          <button
            onClick={() => setTab("skills")}
            className={`relative z-10 py-2.5 text-xs sm:text-sm font-semibold transition ${tab === "skills" ? "text-zinc-900" : "text-zinc-300"}`}
          >
            Навыки · {props.skills.length}
          </button>
          <button
            onClick={() => setTab("gallery")}
            className={`relative z-10 py-2.5 text-xs sm:text-sm font-semibold transition ${tab === "gallery" ? "text-zinc-900" : "text-zinc-300"}`}
          >
            Галерея · {images.length}
          </button>
        </div>
      </div>

      {/* ========================= CONTENT ========================= */}
      <div className="max-w-3xl mx-auto">
        {tab === "fight" && (
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
            onAddMonster={(data) => {
              startTransition(async () => {
                try {
                  const portraitPath = data.portraitFile ? await uploadPortraitFile(data.portraitFile) : null;
                  const res = await fetch("/api/combatants", {
                    method: "POST",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify({
                      displayName: data.name,
                      isPlayer: false,
                      initiative: data.initiative,
                      maxHp: data.maxHp,
                      count: data.count,
                      portraitPath,
                    }),
                  });
                  if (!res.ok) {
                    alert(await readErrorMessage(res, "Не удалось добавить монстров"));
                    return;
                  }
                  await refresh();
                  router.refresh();
                } catch (error) {
                  alert(error instanceof Error ? error.message : "Не удалось добавить монстров");
                }
              });
            }}
            updateCombatant={updateCombatant}
            removeCombatant={removeCombatant}
            addCondition={addCondition}
            removeCondition={removeCondition}
            updateConditionValue={updateConditionValue}
            uploadPortrait={uploadPortraitFile}
          />
        )}
        {tab === "library" && (
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
            uploadPortrait={uploadPortraitFile}
          />
        )}
        {tab === "skills" && (
          <SkillsTab
            skills={props.skills}
            simpleDcs={props.simpleDcs}
            dcAdjustments={props.dcAdjustments}
            rarityAdjustments={props.rarityAdjustments}
            levelDcs={props.levelDcs}
          />
        )}
        {tab === "gallery" && (
          <GalleryTab
            images={images}
            activeImageId={enc.activeImageId}
            isExploration={isExploration}
            busy={busy}
            onShow={(id) => ctrl({ type: "set-image", imageId: id })}
            onHide={() => ctrl({ type: "set-image", imageId: null })}
            onUpload={async (file, name) => {
              const fd = new FormData();
              fd.append("file", file);
              if (name) fd.append("name", name);
                startTransition(async () => {
                  const res = await fetch("/api/images", { method: "POST", body: fd });
                  if (!res.ok) {
                  alert(await readErrorMessage(res, "Не удалось загрузить картинку"));
                  return;
                }
                await refresh();
                router.refresh();
              });
            }}
            onRename={(id, name) =>
              mutate(() =>
                fetch(`/api/images/${id}`, {
                  method: "PATCH",
                  headers: { "content-type": "application/json" },
                  body: JSON.stringify({ name }),
                }),
              )
            }
            onDelete={(id) => mutate(() => fetch(`/api/images/${id}`, { method: "DELETE" }))}
            onSwitchToExploration={() => ctrl({ type: "set-mode", mode: "exploration" })}
          />
        )}
      </div>

      {!isExploration && (
      <div className="sm:hidden fixed inset-x-0 bottom-0 z-30 px-3 pt-5 safe-bottom bg-gradient-to-t from-[#090704] via-[#090704]/95 to-transparent">
        <div className="glass-strong rounded-2xl p-2 shadow-[0_-14px_50px_-22px_rgba(0,0,0,0.9)]">
          <div className="grid grid-cols-[1fr_1.35fr_0.85fr] gap-2">
            <button onClick={() => ctrl({ type: "prev" })} disabled={busy} className={`${btnDark} min-h-12 text-sm`}>
              Назад
            </button>
            <button onClick={() => ctrl({ type: "next" })} disabled={busy} className={`${btnGold} min-h-12 text-sm font-bold`}>
              След. ход
            </button>
            <button onClick={() => ctrl({ type: "publish" })} disabled={busy} className={`${btnEmerald} min-h-12 text-sm font-semibold`}>
              Экран
            </button>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button onClick={() => ctrl({ type: "reset-round" })} className={`${btnGhost} min-h-9 text-xs`}>
              Сброс раунда
            </button>
            <button
              onClick={() => {
                if (confirm("Очистить весь бой?")) ctrl({ type: "clear" });
              }}
              className={`${btnGhost} min-h-9 text-xs text-rose-400 hover:text-rose-300`}
            >
              Очистить бой
            </button>
          </div>
        </div>
      </div>
      )}
    </div>
  );
}

// ===================== MODE TOGGLE =====================

function ModeToggle(props: {
  mode: "scene" | "exploration";
  busy: boolean;
  onChange: (m: "scene" | "exploration") => void;
}) {
  return (
    <div className="glass rounded-2xl p-1 grid grid-cols-2 relative">
      <div
        className="absolute top-1 bottom-1 w-1/2 rounded-xl bg-gradient-to-b from-amber-200 via-amber-300 to-amber-500 transition-transform duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] shadow-[0_4px_20px_-6px_rgba(232,193,112,0.5)]"
        style={{ transform: `translateX(${props.mode === "scene" ? 0 : 100}%)` }}
      />
      <button
        type="button"
        onClick={() => props.onChange("scene")}
        disabled={props.busy}
        className={`relative z-10 py-2 text-xs sm:text-sm font-semibold transition ${props.mode === "scene" ? "text-zinc-900" : "text-zinc-300"}`}
      >
        ⚔ Сцена
      </button>
      <button
        type="button"
        onClick={() => props.onChange("exploration")}
        disabled={props.busy}
        className={`relative z-10 py-2 text-xs sm:text-sm font-semibold transition ${props.mode === "exploration" ? "text-zinc-900" : "text-zinc-300"}`}
      >
        🗺 Исследование
      </button>
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
  onAddMonster: (data: {
    name: string;
    initiative: number;
    maxHp?: number;
    count: number;
    portraitFile?: File | null;
  }) => void;
  updateCombatant: (id: string, patch: Partial<Combatant>) => void;
  removeCombatant: (id: string) => void;
  addCondition: (combatantId: string, slug: string, value: number | null) => void;
  removeCondition: (id: string) => void;
  updateConditionValue: (id: string, value: number) => void;
  uploadPortrait: (file: File) => Promise<string>;
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
            uploadPortrait={props.uploadPortrait}
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
  uploadPortrait: (file: File) => Promise<string>;
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

      <div className="grid grid-cols-[auto_auto_1fr] sm:flex sm:items-center gap-3 p-3 pl-4">
        <PortraitBadge src={c.portraitPath} name={c.displayName} className="w-14 h-14 sm:w-12 sm:h-12" />
        <NumberInput
          value={c.initiative}
          onChange={(v) => props.onUpdate(c.id, { initiative: v })}
          ariaLabel="Инициатива"
          className={`w-16 h-14 sm:w-14 sm:h-12 text-center text-2xl sm:text-xl font-serif font-bold tabular-nums ${props.isActive ? "gold-text" : "text-zinc-200"}`}
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

        <div className="col-span-3 sm:col-span-1 grid grid-cols-[1fr_auto] sm:flex gap-2">
          <button
            onClick={() => props.onSetActive(c.id)}
            className={`${props.isActive ? btnGold : btnDark} min-h-11 sm:min-h-0 px-3 py-2 text-xs font-bold`}
            title="Сделать активным"
          >
            {props.isActive ? "Активен" : "Сделать ходом"}
          </button>
          <button
            onClick={() => setOpen((o) => !o)}
            className={`${btnGhost} min-h-11 sm:min-h-0 px-4 sm:px-2 py-2 text-sm`}
            aria-label="Развернуть"
          >
            {open ? "Скрыть" : "Ещё"}
          </button>
        </div>
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
          <PortraitUpload
            label="Портрет в бою"
            src={c.portraitPath}
            name={c.displayName}
            onUpload={async (file) => {
              const portraitPath = await props.uploadPortrait(file);
              props.onUpdate(c.id, { portraitPath });
            }}
          />
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
            className="min-h-9 text-xs px-2.5 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 hover:border-amber-300/40 transition active:scale-95"
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
  onAddMonster: (data: {
    name: string;
    initiative: number;
    maxHp?: number;
    count: number;
    portraitFile?: File | null;
  }) => void;
}) {
  const [mode, setMode] = useState<"player" | "monster">("player");
  const [charId, setCharId] = useState("");
  const [init, setInit] = useState("");
  const [name, setName] = useState("");
  const [hp, setHp] = useState("");
  const [count, setCount] = useState("1");
  const [portraitFile, setPortraitFile] = useState<File | null>(null);
  const [open, setOpen] = useState(props.encCombatants.length === 0);

  const inFight = new Set(props.encCombatants.map((c) => c.characterId).filter(Boolean) as string[]);
  const available = props.chars.filter((c) => !inFight.has(c.id));
  const selected = props.chars.find((c) => c.id === charId);

  useEffect(() => {
    if (props.encCombatants.length === 0) setOpen(true);
  }, [props.encCombatants.length]);

  return (
    <div className="glass rounded-2xl p-3 space-y-3 mt-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 text-left rounded-xl px-1 py-1"
      >
        <span>
          <span className="block text-[10px] uppercase tracking-[0.2em] text-zinc-500">Добавить в бой</span>
          <span className="block mt-1 font-serif text-lg text-amber-50">
            {open ? "Выбери участника" : "Игрок или монстр"}
          </span>
        </span>
        <span className={`${btnGold} w-10 h-10 text-xl`} aria-hidden="true">
          {open ? "−" : "+"}
        </span>
      </button>

      {open && (
        <div className="space-y-3 anim-fade-in">
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setMode("player")} className={mode === "player" ? `${btnGold} min-h-11 text-sm` : `${btnDark} min-h-11 text-sm`}>
              Из библиотеки
            </button>
            <button onClick={() => setMode("monster")} className={mode === "monster" ? `${btnGold} min-h-11 text-sm` : `${btnDark} min-h-11 text-sm`}>
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
                className={`${inputBase} min-h-12 col-span-2 sm:col-span-1`}
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
                className={`${inputBase} min-h-12 w-20 text-center`}
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
                className={`${btnEmerald} min-h-12 px-4 text-lg font-bold`}
              >
                +
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-[1fr_1fr_auto] sm:grid-cols-[1fr_auto_auto_auto_auto] gap-2">
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Имя" className={`${inputBase} min-h-12 col-span-3 sm:col-span-1`} />
              <input
                value={hp}
                onChange={(e) => setHp(e.target.value.replace(/[^0-9]/g, ""))}
                placeholder="HP"
                inputMode="numeric"
                className={`${inputBase} min-h-12 text-center sm:w-16`}
              />
              <input
                value={init}
                onChange={(e) => setInit(e.target.value.replace(/[^0-9-]/g, ""))}
                placeholder="иниц."
                inputMode="numeric"
                className={`${inputBase} min-h-12 text-center sm:w-20`}
              />
              <input
                value={count}
                onChange={(e) => setCount(e.target.value.replace(/[^0-9]/g, ""))}
                placeholder="шт."
                inputMode="numeric"
                title="Количество одинаковых монстров"
                className={`${inputBase} min-h-12 text-center sm:w-16`}
              />
              <button
                onClick={() => {
                  if (!name.trim()) return;
                  const n = parseInt(init, 10);
                  const h = parseInt(hp, 10);
                  const amount = Math.max(1, Math.min(50, parseInt(count, 10) || 1));
                  props.onAddMonster({
                    name: name.trim(),
                    initiative: Number.isFinite(n) ? n : 0,
                    maxHp: Number.isFinite(h) ? h : undefined,
                    count: amount,
                    portraitFile,
                  });
                  setName("");
                  setInit("");
                  setHp("");
                  setCount("1");
                  setPortraitFile(null);
                }}
                disabled={!name.trim()}
                className={`${btnEmerald} min-h-12 px-4 text-lg font-bold`}
              >
                +
              </button>
            </div>
          )}

          {mode === "monster" && (
            <label className="glass rounded-xl px-3 py-2 flex items-center gap-3 cursor-pointer hover:border-amber-300/30 transition">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => setPortraitFile(e.target.files?.[0] ?? null)}
              />
              <PortraitBadge name={name || "Монстр"} className="w-10 h-10" />
              <span className="min-w-0 text-sm text-zinc-300 truncate">
                {portraitFile ? portraitFile.name : "Портрет для этих монстров (необязательно)"}
              </span>
            </label>
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
      )}
    </div>
  );
}

// ===================== LIBRARY TAB =====================

function LibraryTab(props: {
  chars: Character[];
  onCreate: (data: { name: string; isPlayer: boolean; defaultInitMod: number; portraitPath?: string | null }) => void;
  onUpdate: (id: string, data: Partial<Character>) => void;
  onDelete: (id: string) => void;
  uploadPortrait: (file: File) => Promise<string>;
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
          <div className="text-xs mt-1">Добавь героев или монстров — они сохранятся между боями</div>
        </div>
      )}

      {props.chars.map((c, idx) => (
        <div key={c.id} className="anim-fade-up" style={{ animationDelay: `${Math.min(idx * 40, 300)}ms` }}>
          <CharRow c={c} onUpdate={props.onUpdate} onDelete={props.onDelete} uploadPortrait={props.uploadPortrait} />
        </div>
      ))}
    </div>
  );
}

function CharRow(props: {
  c: Character;
  onUpdate: (id: string, data: Partial<Character>) => void;
  onDelete: (id: string) => void;
  uploadPortrait: (file: File) => Promise<string>;
}) {
  const { c } = props;
  const [uploading, setUploading] = useState(false);

  async function upload(file?: File) {
    if (!file) return;
    setUploading(true);
    try {
      const portraitPath = await props.uploadPortrait(file);
      props.onUpdate(c.id, { portraitPath });
    } catch (error) {
      alert(error instanceof Error ? error.message : "Не удалось загрузить портрет");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="glass rounded-2xl p-3 grid grid-cols-[auto_1fr_auto] sm:flex sm:items-center gap-2 relative overflow-hidden">
      <div
        className={[
          "absolute left-0 top-0 bottom-0 w-1",
          c.isPlayer
            ? "bg-gradient-to-b from-emerald-400/60 to-emerald-700/60"
            : "bg-gradient-to-b from-rose-400/60 to-rose-800/60",
        ].join(" ")}
      />
      <label className="relative cursor-pointer" title={uploading ? "Загружаю..." : "Нажми, чтобы сменить портрет"}>
        <input
          type="file"
          accept="image/*"
          className="hidden"
          disabled={uploading}
          onChange={(e) => {
            void upload(e.target.files?.[0]);
            e.currentTarget.value = "";
          }}
        />
        <PortraitBadge src={c.portraitPath} name={c.name} className="w-12 h-12" />
        {uploading && <span className="absolute inset-0 rounded-xl bg-black/60 animate-pulse" />}
      </label>
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

// ===================== SKILLS TAB =====================

function SkillsTab(props: {
  skills: SkillDef[];
  simpleDcs: DcRow[];
  dcAdjustments: DcAdjust[];
  rarityAdjustments: DcAdjust[];
  levelDcs: LevelDc[];
}) {
  const [q, setQ] = useState("");
  const [abilityFilter, setAbilityFilter] = useState<string>("");
  const [openSkill, setOpenSkill] = useState<string | null>(null);
  const [showDcRef, setShowDcRef] = useState(false);
  const deferredQ = useDeferredValue(q);
  const normalizedQ = deferredQ.trim().toLowerCase();

  const filtered = useMemo(() => {
    return props.skills
      .filter((s) => !abilityFilter || s.ability === abilityFilter)
      .map((s) => {
        if (!normalizedQ) return { skill: s, actions: s.actions };
        const skillHit =
          s.ru.toLowerCase().includes(normalizedQ) ||
          s.en.toLowerCase().includes(normalizedQ) ||
          s.desc.toLowerCase().includes(normalizedQ);
        const actionHits = s.actions.filter(
          (a) =>
            a.ru.toLowerCase().includes(normalizedQ) ||
            a.en.toLowerCase().includes(normalizedQ) ||
            a.desc.toLowerCase().includes(normalizedQ) ||
            (a.dc ?? "").toLowerCase().includes(normalizedQ),
        );
        if (skillHit) return { skill: s, actions: s.actions };
        if (actionHits.length > 0) return { skill: s, actions: actionHits };
        return null;
      })
      .filter((v): v is { skill: SkillDef; actions: SkillActionDef[] } => v !== null);
  }, [props.skills, abilityFilter, normalizedQ]);

  const abilities = Array.from(new Set(props.skills.map((s) => s.ability)));

  return (
    <div className="px-3 sm:px-4 mt-4 space-y-2.5">
      <div className="glass rounded-2xl p-3 space-y-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Поиск по навыку, действию или DC..."
          className={inputBase}
        />
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setAbilityFilter("")}
            className={`min-h-9 text-xs px-2.5 py-1.5 rounded-full border transition active:scale-95 ${!abilityFilter ? "bg-amber-400/15 text-amber-100 border-amber-300/40" : "bg-white/5 text-zinc-300 border-white/10 hover:border-amber-300/40"}`}
          >
            Все
          </button>
          {abilities.map((ab) => (
            <button
              key={ab}
              onClick={() => setAbilityFilter(ab === abilityFilter ? "" : ab)}
              className={`min-h-9 text-xs px-2.5 py-1.5 rounded-full border transition active:scale-95 ${abilityFilter === ab ? "bg-amber-400/15 text-amber-100 border-amber-300/40" : "bg-white/5 text-zinc-300 border-white/10 hover:border-amber-300/40"}`}
            >
              {ab}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowDcRef((v) => !v)}
          className={`${btnDark} w-full min-h-11 text-sm`}
        >
          {showDcRef ? "Скрыть таблицу DC" : "Показать таблицу DC"}
        </button>
        {showDcRef && (
          <DcReference
            simpleDcs={props.simpleDcs}
            dcAdjustments={props.dcAdjustments}
            rarityAdjustments={props.rarityAdjustments}
            levelDcs={props.levelDcs}
          />
        )}
      </div>

      {filtered.length === 0 && (
        <div className="glass rounded-2xl p-6 text-center text-zinc-500 anim-fade-in">
          <div className="font-serif italic">Ничего не найдено</div>
          <div className="text-xs mt-1">Попробуй другой запрос или сбрось фильтры</div>
        </div>
      )}

      {filtered.map(({ skill, actions }, idx) => {
        const isOpen = openSkill === skill.slug || normalizedQ.length > 0;
        return (
          <div key={skill.slug} className="anim-fade-up" style={{ animationDelay: `${Math.min(idx * 30, 200)}ms` }}>
            <SkillCard
              skill={skill}
              actions={actions}
              isOpen={isOpen}
              onToggle={() => setOpenSkill((cur) => (cur === skill.slug ? null : skill.slug))}
            />
          </div>
        );
      })}
    </div>
  );
}

function SkillCard(props: {
  skill: SkillDef;
  actions: SkillActionDef[];
  isOpen: boolean;
  onToggle: () => void;
}) {
  const { skill, actions, isOpen } = props;
  return (
    <div className="glass rounded-2xl overflow-hidden relative">
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-amber-300/60 to-amber-600/60" />
      <button
        type="button"
        onClick={props.onToggle}
        className="w-full text-left grid grid-cols-[1fr_auto] gap-3 p-3 pl-4 items-center"
      >
        <div className="min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="font-serif text-lg font-semibold text-amber-50">{skill.ru}</span>
            <span className="text-[11px] text-zinc-500">{skill.en}</span>
            <span className="text-[10px] uppercase tracking-widest px-1.5 py-0.5 rounded-md bg-white/5 border border-white/10 text-zinc-300">
              {skill.ability}
            </span>
          </div>
          <div className="text-xs text-zinc-400 mt-1 line-clamp-2">{skill.desc}</div>
        </div>
        <span className={`${btnGhost} w-10 h-10 text-xl`} aria-hidden="true">
          {isOpen ? "−" : "+"}
        </span>
      </button>

      {isOpen && (
        <div className="border-t border-white/10 bg-black/20 p-3 space-y-2 anim-fade-in">
          {actions.length === 0 && (
            <div className="text-xs text-zinc-500 italic px-1">Действий нет</div>
          )}
          {actions.map((a) => (
            <ActionRow key={a.slug} a={a} />
          ))}
        </div>
      )}
    </div>
  );
}

function ActionRow(props: { a: SkillActionDef }) {
  const { a } = props;
  return (
    <div className="rounded-xl bg-white/5 border border-white/10 p-3">
      <div className="flex items-baseline gap-2 flex-wrap">
        <span className="font-serif text-base font-semibold text-amber-100">{a.ru}</span>
        <span className="text-[11px] text-zinc-500">{a.en}</span>
        {a.trained && (
          <span className="text-[9px] uppercase tracking-widest px-1.5 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-400/30 text-emerald-200">
            тренированный
          </span>
        )}
        {a.cost && (
          <span className="text-[9px] uppercase tracking-widest px-1.5 py-0.5 rounded-md bg-white/5 border border-white/10 text-zinc-300">
            {a.cost}
          </span>
        )}
      </div>
      {a.traits && a.traits.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {a.traits.map((t) => (
            <span key={t} className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-black/30 border border-white/10 text-zinc-400">
              {t}
            </span>
          ))}
        </div>
      )}
      <div className="text-sm text-zinc-200 mt-2 leading-snug">{a.desc}</div>
      {a.dc && (
        <div className="mt-2 text-xs text-amber-200/90 bg-amber-400/5 border border-amber-300/20 rounded-lg px-2.5 py-1.5">
          <span className="text-[10px] uppercase tracking-widest text-amber-300/70 mr-1.5">DC</span>
          {a.dc}
        </div>
      )}
    </div>
  );
}

function DcReference(props: {
  simpleDcs: DcRow[];
  dcAdjustments: DcAdjust[];
  rarityAdjustments: DcAdjust[];
  levelDcs: LevelDc[];
}) {
  return (
    <div className="space-y-3 anim-fade-in">
      <div>
        <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 mb-1.5 px-1">Простые DC по рангу</div>
        <div className="grid grid-cols-5 gap-1.5">
          {props.simpleDcs.map((r) => (
            <div key={r.label} className="rounded-lg bg-white/5 border border-white/10 px-2 py-1.5 text-center">
              <div className="text-[9px] uppercase tracking-wider text-zinc-400 leading-tight">{r.label}</div>
              <div className="font-serif text-lg gold-text tabular-nums">{r.dc}</div>
            </div>
          ))}
        </div>
      </div>
      <div>
        <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 mb-1.5 px-1">Модификаторы сложности</div>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
          {props.dcAdjustments.map((r) => (
            <div key={r.label} className="rounded-lg bg-white/5 border border-white/10 px-2 py-1.5 text-center">
              <div className="text-[9px] uppercase tracking-wider text-zinc-400 leading-tight">{r.label}</div>
              <div className={`font-serif text-base tabular-nums ${r.mod < 0 ? "text-emerald-300" : "text-rose-300"}`}>
                {r.mod > 0 ? `+${r.mod}` : r.mod}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div>
        <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 mb-1.5 px-1">Редкость</div>
        <div className="grid grid-cols-4 gap-1.5">
          {props.rarityAdjustments.map((r) => (
            <div key={r.label} className="rounded-lg bg-white/5 border border-white/10 px-2 py-1.5 text-center">
              <div className="text-[9px] uppercase tracking-wider text-zinc-400 leading-tight">{r.label}</div>
              <div className="font-serif text-base tabular-nums text-rose-300">
                {r.mod > 0 ? `+${r.mod}` : r.mod}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div>
        <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 mb-1.5 px-1">DC по уровню</div>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(52px,1fr))] gap-1.5">
          {props.levelDcs.map((r) => (
            <div key={r.level} className="rounded-lg bg-white/5 border border-white/10 px-1.5 py-1 text-center">
              <div className="text-[9px] uppercase tracking-wider text-zinc-500 leading-tight">ур. {r.level}</div>
              <div className="font-serif text-sm tabular-nums text-amber-100">{r.dc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ===================== GALLERY TAB =====================

function GalleryTab(props: {
  images: SceneImage[];
  activeImageId: string | null;
  isExploration: boolean;
  busy: boolean;
  onShow: (id: string) => void;
  onHide: () => void;
  onUpload: (file: File, name?: string) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  onSwitchToExploration: () => void;
}) {
  const [q, setQ] = useState("");
  const deferredQ = useDeferredValue(q);
  const normalizedQ = deferredQ.trim().toLowerCase();
  const filtered = useMemo(
    () =>
      props.images.filter(
        (i) => !normalizedQ || i.name.toLowerCase().includes(normalizedQ),
      ),
    [props.images, normalizedQ],
  );

  return (
    <div className="px-3 sm:px-4 mt-4 space-y-2.5">
      {!props.isExploration && (
        <div className="glass rounded-2xl p-3 flex items-center gap-3 anim-fade-in">
          <div className="text-2xl">💡</div>
          <div className="flex-1 text-xs text-zinc-400">
            Сейчас активна «Сцена». Чтобы картинки отображались на экране, переключись на «Исследование».
          </div>
          <button
            onClick={props.onSwitchToExploration}
            disabled={props.busy}
            className={`${btnGold} px-3 py-2 text-xs font-bold whitespace-nowrap`}
          >
            В исследование
          </button>
        </div>
      )}

      <UploadBox busy={props.busy} onUpload={props.onUpload} />

      <div className="glass rounded-2xl p-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Найти картинку..."
          className={inputBase}
        />
      </div>

      {filtered.length === 0 && (
        <div className="glass rounded-2xl p-6 text-center text-zinc-500 anim-fade-in">
          <div className="font-serif italic">
            {props.images.length === 0 ? "Галерея пуста" : "Ничего не найдено"}
          </div>
          <div className="text-xs mt-1">
            {props.images.length === 0
              ? "Загрузи картинки — их можно будет показывать игрокам в один тап"
              : "Попробуй другой запрос"}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        {filtered.map((img, idx) => (
          <div key={img.id} className="anim-fade-up" style={{ animationDelay: `${Math.min(idx * 30, 200)}ms` }}>
            <ImageCard
              img={img}
              isActive={img.id === props.activeImageId}
              isExploration={props.isExploration}
              busy={props.busy}
              onShow={() => props.onShow(img.id)}
              onHide={props.onHide}
              onRename={(n) => props.onRename(img.id, n)}
              onDelete={() => props.onDelete(img.id)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function UploadBox(props: { busy: boolean; onUpload: (file: File, name?: string) => void }) {
  const [name, setName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [drag, setDrag] = useState(false);

  function reset() {
    setName("");
    setFile(null);
  }

  function submit() {
    if (!file) return;
    props.onUpload(file, name.trim() || undefined);
    reset();
  }

  return (
    <div className="glass rounded-2xl p-3 space-y-3">
      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          const f = e.dataTransfer.files?.[0];
          if (f && f.type.startsWith("image/")) setFile(f);
        }}
        className={`block border-2 border-dashed rounded-xl px-4 py-5 text-center cursor-pointer transition ${
          drag
            ? "border-amber-300/60 bg-amber-400/5"
            : "border-white/15 hover:border-amber-300/40 hover:bg-white/5"
        }`}
      >
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="hidden"
        />
        {file ? (
          <div className="space-y-1">
            <div className="text-sm text-amber-100 font-serif truncate">{file.name}</div>
            <div className="text-[11px] text-zinc-500">
              {(file.size / 1024).toFixed(0)} КБ — тапни, чтобы заменить
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            <div className="text-sm text-zinc-200">📷 Выбери или перетащи картинку</div>
            <div className="text-[11px] text-zinc-500">PNG, JPG, WEBP, GIF, AVIF · до 15 МБ</div>
          </div>
        )}
      </label>

      {file && (
        <div className="grid grid-cols-[1fr_auto] gap-2 anim-fade-in">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Имя (необязательно)"
            className={inputBase}
          />
          <button onClick={submit} disabled={props.busy} className={`${btnGold} px-4 text-sm font-bold`}>
            Загрузить
          </button>
        </div>
      )}
    </div>
  );
}

function ImageCard(props: {
  img: SceneImage;
  isActive: boolean;
  isExploration: boolean;
  busy: boolean;
  onShow: () => void;
  onHide: () => void;
  onRename: (name: string) => void;
  onDelete: () => void;
}) {
  const { img } = props;
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(img.name);

  useEffect(() => {
    setName(img.name);
  }, [img.name]);

  return (
    <div
      className={[
        "group relative rounded-2xl overflow-hidden border transition",
        props.isActive
          ? "border-amber-300/60 shadow-[0_0_0_2px_rgba(251,191,36,0.25)]"
          : "border-white/10 hover:border-amber-300/30",
      ].join(" ")}
    >
      <button
        type="button"
        onClick={props.isActive ? props.onHide : props.onShow}
        disabled={props.busy}
        className="block w-full aspect-[4/3] bg-black/40 relative"
        title={props.isActive ? "Скрыть с экрана" : "Показать на экране"}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={img.path} alt={img.name} className="w-full h-full object-cover" />
        {props.isActive && (
          <span className="absolute top-1.5 left-1.5 text-[9px] uppercase tracking-widest px-1.5 py-0.5 rounded-md bg-amber-400/90 text-zinc-900 font-bold">
            На экране
          </span>
        )}
        {!props.isExploration && (
          <span className="absolute inset-x-0 bottom-0 bg-black/60 text-[10px] uppercase tracking-widest text-zinc-400 py-1">
            Включи «Исследование»
          </span>
        )}
        {props.isExploration && !props.isActive && (
          <span className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/50 transition">
            <span className="text-amber-100 text-sm font-serif font-bold">Показать</span>
          </span>
        )}
      </button>

      <div className="p-2 bg-black/30 flex items-center gap-2">
        {editing ? (
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => {
              setEditing(false);
              if (name.trim() && name.trim() !== img.name) props.onRename(name.trim());
              else setName(img.name);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
              if (e.key === "Escape") {
                setName(img.name);
                setEditing(false);
              }
            }}
            className="flex-1 min-w-0 bg-black/40 rounded-md border border-white/10 px-2 py-1 text-xs outline-none focus:border-amber-300/40"
          />
        ) : (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="flex-1 min-w-0 text-left text-xs text-zinc-200 truncate hover:text-amber-100"
            title="Переименовать"
          >
            {img.name}
          </button>
        )}
        <button
          onClick={() => {
            if (confirm(`Удалить «${img.name}»?`)) props.onDelete();
          }}
          className={`${btnGhost} w-7 h-7 text-rose-400 hover:text-rose-300 text-base leading-none`}
          aria-label="Удалить"
          title="Удалить"
        >
          ×
        </button>
      </div>
    </div>
  );
}
