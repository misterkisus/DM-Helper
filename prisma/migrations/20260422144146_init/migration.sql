-- CreateTable
CREATE TABLE "Character" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "isPlayer" BOOLEAN NOT NULL DEFAULT true,
    "defaultInitMod" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Encounter" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL DEFAULT 'Бой',
    "round" INTEGER NOT NULL DEFAULT 1,
    "activeId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'idle',
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Combatant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "encounterId" TEXT NOT NULL,
    "characterId" TEXT,
    "displayName" TEXT NOT NULL,
    "isPlayer" BOOLEAN NOT NULL DEFAULT false,
    "initiative" INTEGER NOT NULL DEFAULT 0,
    "tiebreaker" INTEGER NOT NULL DEFAULT 0,
    "currentHp" INTEGER,
    "maxHp" INTEGER,
    "hasActed" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "Combatant_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "Encounter" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Combatant_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Condition" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "combatantId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "value" INTEGER,
    CONSTRAINT "Condition_combatantId_fkey" FOREIGN KEY ("combatantId") REFERENCES "Combatant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Combatant_encounterId_idx" ON "Combatant"("encounterId");

-- CreateIndex
CREATE INDEX "Condition_combatantId_idx" ON "Condition"("combatantId");
