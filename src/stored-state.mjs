import { lstat, readFile } from 'node:fs/promises';

// Shared by runtime readers and the dependency-free doctor. Never reads session logs.
export async function readStoredJson(file, limit = 64 * 1024 * 1024) {
  const info = await lstat(file);
  if (!info.isFile() || info.isSymbolicLink() || info.size > limit) throw new Error('本地文件类型或容量无效');
  const bytes = await readFile(file);
  if (bytes.length > limit) throw new Error('本地文件容量无效');
  return JSON.parse(bytes.toString('utf8'));
}

export async function readUsageSnapshot(file) {
  const snapshot = await readStoredJson(file);
  if (snapshot?.version !== 2 || !snapshot.coverage || !snapshot.files || typeof snapshot.files !== 'object' || Array.isArray(snapshot.files)) throw new Error('本地索引格式无效，请先检查原文件');
  if (Object.values(snapshot.files).some(s => !s || !Array.isArray(s.events))) throw new Error('本地索引损坏');
  return snapshot;
}

export async function readCaptureState(file) {
  const state = await readStoredJson(file);
  if (state?.version !== 1 || !state.files || typeof state.files !== 'object' || Array.isArray(state.files)) throw new Error('自动采集索引损坏，原文件保留');
  for (const [file, s] of Object.entries(state.files)) {
    if (!s || s.path !== file || !Number.isSafeInteger(s.offset) || s.offset < 0 || !Array.isArray(s.events) || s.events.length || !s.parser || !Number.isSafeInteger(s.prefixLength) || s.prefixLength < 0 || s.prefixLength > 4096 || !Number.isSafeInteger(s.anchorStart) || s.anchorStart < 0 || s.anchorStart > s.offset || s.offset - s.anchorStart > 4096) throw new Error('自动采集游标损坏，原文件保留');
  }
  return state;
}
