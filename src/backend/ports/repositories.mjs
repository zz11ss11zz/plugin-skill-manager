// Port: persistence. Application services depend on these shapes; the JSON-file adapter in
// src/backend/adapters/storage/json-file/ implements them today (a SQLite adapter could replace it).

/** @typedef {{ from?: string, to?: string, timeZone?: string }} Period */

/**
 * @typedef {object} AdoptionRepository
 * @property {string} file
 * @property {() => Promise<object>} read
 * @property {(batch: {id: string, skills: string[]}, listSkills: () => Promise<object[]>) => Promise<void>} record
 * @property {(period?: Period) => Promise<object>} summary
 */

/**
 * @typedef {object} PluginCallRepository
 * @property {string} file
 * @property {() => Promise<object>} read
 * @property {(calls: Array<{id: string, plugin: string, tool: string}>) => Promise<void>} record
 * @property {(period?: Period) => Promise<object>} summary
 */

/**
 * @typedef {object} NoteRepository
 * @property {string} file
 * @property {() => Promise<{entries: Record<string, object>}>} read
 * @property {(note: object) => Promise<void>} save
 */

/**
 * @typedef {object} PresenceRepository
 * @property {(keys: string[], now: number) => Promise<Record<string, string>>} observe
 */

/**
 * @typedef {object} ArchiveRepository
 * @property {string} archiveRoot
 * @property {() => Promise<object[]>} list
 * @property {(skillId: string) => Promise<object>} previewArchive
 * @property {(archiveId: string) => Promise<object>} previewRestore
 * @property {(token: string) => Promise<object>} execute
 * @property {(token: string) => void} cancel
 */

/**
 * @typedef {object} Repositories
 * @property {AdoptionRepository} adoptions
 * @property {PluginCallRepository} pluginCalls
 * @property {NoteRepository} notes
 * @property {PresenceRepository} presence
 * @property {ArchiveRepository} archives
 */

export {};
