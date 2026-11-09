// Installation identity: components inside one installed plugin package or parent Skill are one
// unit and are never compared with each other (skills/skill-manager/references/redundancy-principles.md).

export const ownerId = owner => `${owner.directory || owner.name}@${owner.marketplace}`;
export const packageId = skill => skill.owner ? `${ownerId(skill.owner)}:${skill.owner.version}` : null;
export const installationUnit = skill => packageId(skill) || skill.parentSkillId || skill.id;
export const sameInstallationUnit = (a, b) => installationUnit(a) === installationUnit(b);
