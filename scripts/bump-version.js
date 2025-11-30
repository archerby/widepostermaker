#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const RELEASE_TYPE = process.env.RELEASE_TYPE || 'patch';
const VALID_TYPES = ['major', 'minor', 'patch'];

if (!VALID_TYPES.includes(RELEASE_TYPE)) {
    console.error(`Invalid release type: ${RELEASE_TYPE}`);
    console.error(`Must be one of: ${VALID_TYPES.join(', ')}`);
    process.exit(1);
}

const packageJsonPath = path.resolve(__dirname, '../package.json');
const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

const [major, minor, patch] = pkg.version.split('.').map(Number);

let newVersion;
switch (RELEASE_TYPE) {
    case 'major':
        newVersion = `${major + 1}.0.0`;
        break;
    case 'minor':
        newVersion = `${major}.${minor + 1}.0`;
        break;
    case 'patch':
        newVersion = `${major}.${minor}.${patch + 1}`;
        break;
}

console.log(`Bumping version from ${pkg.version} to ${newVersion}`);

// Update package.json
pkg.version = newVersion;
fs.writeFileSync(packageJsonPath, JSON.stringify(pkg, null, 2) + '\n');

// Update CHANGELOG.md
const changelogPath = path.resolve(__dirname, '../CHANGELOG.md');
const today = new Date().toISOString().split('T')[0];

if (fs.existsSync(changelogPath)) {
    let changelog = fs.readFileSync(changelogPath, 'utf8');

    // Insert new version section after the # Changelog header
    const newSection = `\n## [${newVersion}] - ${today}\n\n### Added\n- \n\n### Changed\n- \n\n### Fixed\n- \n`;

    // Find the position after the first header
    const lines = changelog.split('\n');
    const insertIndex = lines.findIndex(line => line.startsWith('## [')) || 2;

    lines.splice(insertIndex, 0, newSection);
    changelog = lines.join('\n');

    fs.writeFileSync(changelogPath, changelog);
    console.log(`Updated CHANGELOG.md with version ${newVersion}`);
} else {
    console.warn('CHANGELOG.md not found, skipping changelog update');
}

// Output for GitHub Actions
if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `version=${newVersion}\n`);
}

console.log(`✅ Version bumped to ${newVersion}`);
