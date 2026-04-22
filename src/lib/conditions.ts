export type ConditionDef = {
  slug: string;
  ru: string;
  hasValue: boolean;
  desc: string;
};

export const CONDITIONS: ConditionDef[] = [
  { slug: "blinded", ru: "Ослеплён", hasValue: false, desc: "Не видит. Все враги застигают врасплох; провал проверок Восприятия, требующих зрения." },
  { slug: "clumsy", ru: "Неуклюжий", hasValue: true, desc: "Штраф к броскам и КЗ Ловкости и проверкам, основанным на Ловкости." },
  { slug: "concealed", ru: "Скрытый", hasValue: false, desc: "Атакующий должен пройти DC 5 проверку, иначе атака мажет." },
  { slug: "confused", ru: "Сбит с толку", hasValue: false, desc: "Атакует случайные цели, считается застигнутым врасплох." },
  { slug: "controlled", ru: "Под контролем", hasValue: false, desc: "Действиями персонажа управляет другое существо." },
  { slug: "dazzled", ru: "Ослеплён вспышкой", hasValue: false, desc: "Все существа и объекты считаются скрытыми." },
  { slug: "deafened", ru: "Оглох", hasValue: false, desc: "Не слышит, провал проверок, основанных на слухе; -2 к инициативе на слух." },
  { slug: "doomed", ru: "Обречён", hasValue: true, desc: "Умирающий-порог снижается на значение. При 0 HP сразу мёртв при значении ≥ макс. умирания." },
  { slug: "drained", ru: "Истощён", hasValue: true, desc: "Штраф к броскам Стойкости и проверкам Телосложения, теряет HP равные значению × уровень." },
  { slug: "dying", ru: "Умирает", hasValue: true, desc: "Без сознания и близок к смерти. При 4 — мёртв." },
  { slug: "encumbered", ru: "Перегружен", hasValue: false, desc: "Считается неуклюжим 1, скорость снижена на 10 футов." },
  { slug: "enfeebled", ru: "Ослаблен", hasValue: true, desc: "Штраф к броскам и проверкам, основанным на Силе, включая урон в ближнем бою." },
  { slug: "fascinated", ru: "Очарован", hasValue: false, desc: "Может только Шагать, штраф -2 к проверкам, концентрация только на источнике." },
  { slug: "fatigued", ru: "Утомлён", hasValue: false, desc: "-1 к КЗ и спасброскам; не может Исследовать в режиме исследования." },
  { slug: "fleeing", ru: "Спасается бегством", hasValue: false, desc: "Должен Шагать или бежать прочь от источника каждый ход." },
  { slug: "frightened", ru: "Испуган", hasValue: true, desc: "Штраф ко всем проверкам и КЗ, в конце хода значение уменьшается на 1." },
  { slug: "grabbed", ru: "Схвачен", hasValue: false, desc: "Обездвижен и застигнут врасплох; провал концентрации без проверки." },
  { slug: "hidden", ru: "Спрятан", hasValue: false, desc: "Враг знает примерное местоположение, но не точное. Атакующий проходит DC 11 проверку." },
  { slug: "immobilized", ru: "Обездвижен", hasValue: false, desc: "Не может двигаться." },
  { slug: "invisible", ru: "Невидим", hasValue: false, desc: "Не виден; считается необнаруженным до тех пор, пока не выдаст себя." },
  { slug: "off-guard", ru: "Застигнут врасплох", hasValue: false, desc: "-2 к КЗ. Это новое имя «flat-footed» в Remaster." },
  { slug: "paralyzed", ru: "Парализован", hasValue: false, desc: "Застигнут врасплох, не может действовать кроме перевода на чисто ментальные действия." },
  { slug: "persistent-damage", ru: "Длящийся урон", hasValue: true, desc: "В конце хода получает урон, затем DC 15 плоский — иначе продолжает." },
  { slug: "petrified", ru: "Окаменел", hasValue: false, desc: "Превращён в камень: без сознания, не воспринимает." },
  { slug: "prone", ru: "Лежит", hasValue: false, desc: "-2 к броскам атаки, застигнут врасплох в ближнем бою. Подъём = одно действие." },
  { slug: "quickened", ru: "Ускорен", hasValue: false, desc: "Получает дополнительное действие в начале хода (зависит от источника)." },
  { slug: "restrained", ru: "Связан", hasValue: false, desc: "Обездвижен и застигнут врасплох; нельзя использовать действия с признаками атаки или манипуляции, кроме Освобождения." },
  { slug: "sickened", ru: "Тошнит", hasValue: true, desc: "Штраф ко всем проверкам и КЗ, нельзя добровольно есть/пить. -1 за каждый -1 рвоты." },
  { slug: "slowed", ru: "Замедлен", hasValue: true, desc: "В начале хода теряет указанное число действий." },
  { slug: "stunned", ru: "Ошеломлён", hasValue: true, desc: "Теряет действия в начале хода (или до конца хода, если без значения)." },
  { slug: "stupefied", ru: "Оглушён разумом", hasValue: true, desc: "Штраф к проверкам Интеллекта/Мудрости/Харизмы и DC заклинаний; провал концентрации DC 5 + значение." },
  { slug: "unconscious", ru: "Без сознания", hasValue: false, desc: "Лежит, ослеплён, застигнут врасплох; -4 к КЗ, спасбр. Стойкости и Рефлексам." },
  { slug: "undetected", ru: "Необнаружен", hasValue: false, desc: "Враг не знает, где персонаж; атаки против него мажут (DC 11)." },
  { slug: "unnoticed", ru: "Незамечен", hasValue: false, desc: "Враг даже не подозревает о присутствии персонажа." },
  { slug: "wounded", ru: "Ранен", hasValue: true, desc: "При следующем падении до 0 HP значение умирания увеличивается на величину раны + 1." },
];

export const CONDITION_BY_SLUG: Record<string, ConditionDef> =
  Object.fromEntries(CONDITIONS.map((c) => [c.slug, c]));

export function formatCondition(slug: string, value?: number | null): string {
  const def = CONDITION_BY_SLUG[slug];
  if (!def) return slug;
  if (def.hasValue && value != null) return `${def.ru} ${value}`;
  return def.ru;
}
