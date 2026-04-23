-- CreateTable
CREATE TABLE "SceneImage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Encounter" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL DEFAULT 'Бой',
    "round" INTEGER NOT NULL DEFAULT 1,
    "activeId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'idle',
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,
    "displayMode" TEXT NOT NULL DEFAULT 'scene',
    "activeImageId" TEXT,
    "publishedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Encounter" ("activeId", "id", "isCurrent", "name", "publishedAt", "round", "status", "updatedAt") SELECT "activeId", "id", "isCurrent", "name", "publishedAt", "round", "status", "updatedAt" FROM "Encounter";
DROP TABLE "Encounter";
ALTER TABLE "new_Encounter" RENAME TO "Encounter";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
