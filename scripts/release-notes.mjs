// Extracts one version's release notes from CHANGELOG.md for the plugin manifest
// (`extensions.com.openai.publication.release_notes`).
//
// A version section starts with `## <version> — <date>` and ends at the next `## ` heading. When it has
// a `### Release notes` subsection, everything after that heading is returned; otherwise the whole
// section body is used. Throws when the version has no section or the result is empty, so a release
// cannot be packaged without notes.

/**
 * @param {string} changelog  contents of CHANGELOG.md
 * @param {string} version    e.g. '0.5.0'
 * @returns {string}
 */
export function releaseNotes(changelog, version) {
  const lines = changelog.split(/\r?\n/);
  const start = lines.findIndex(line => line.startsWith('## ') && line.slice(3).split(/\s/)[0] === version);
  if (start < 0) throw new Error(`CHANGELOG.md has no section for ${version}`);
  let end = lines.findIndex((line, index) => index > start && line.startsWith('## '));
  if (end < 0) end = lines.length;
  const section = lines.slice(start + 1, end);
  const heading = section.findIndex(line => /^### Release notes\b/.test(line));
  const notes = (heading < 0 ? section : section.slice(heading + 1)).join('\n').trim();
  if (!notes) throw new Error(`CHANGELOG.md section ${version} has no release notes`);
  return notes;
}
