#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const VERSION = process.env.VERSION;
const BUCKET = process.env.BUCKET || '';
const WINDOWS = process.env.WINDOWS || '';
const LINUX = process.env.LINUX || '';
const MAC = process.env.MAC || '';

if (!VERSION) {
    console.error('VERSION environment variable is required');
    process.exit(1);
}

const manifest = {
    version: VERSION,
    releaseDate: new Date().toISOString(),
    downloads: {}
};

if (BUCKET && WINDOWS) {
    manifest.downloads.windows = {
        url: `https://${BUCKET}.s3.amazonaws.com/media/${WINDOWS}`,
        filename: WINDOWS
    };
}

if (BUCKET && LINUX) {
    manifest.downloads.linux = {
        url: `https://${BUCKET}.s3.amazonaws.com/media/${LINUX}`,
        filename: LINUX
    };
}

if (BUCKET && MAC) {
    manifest.downloads.mac = {
        url: `https://${BUCKET}.s3.amazonaws.com/media/${MAC}`,
        filename: MAC
    };
}

const releaseDir = path.resolve(__dirname, '../release');
if (!fs.existsSync(releaseDir)) {
    fs.mkdirSync(releaseDir, { recursive: true });
}

const manifestPath = path.join(releaseDir, 'release-manifest.json');
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');

console.log('✅ Release manifest generated:');
console.log(JSON.stringify(manifest, null, 2));
