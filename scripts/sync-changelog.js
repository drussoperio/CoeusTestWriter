#!/usr/bin/env node
/*
 * Regenerates the CHANGELOG object in js/state.js from Changelog.md, so the
 * markdown file stays the single source of truth for both the repo's
 * changelog and the in-app "What's New" modal.
 *
 * Usage: node scripts/sync-changelog.js
 */

const fs = require('fs');
const path = require('path');

const CHANGELOG_MD = path.join(__dirname, '..', 'Changelog.md');
const STATE_JS = path.join(__dirname, '..', 'js', 'state.js');
const START_MARKER = '// SYNC-CHANGELOG:START';
const END_MARKER = '// SYNC-CHANGELOG:END';

function parseChangelogMd(md) {
    const lines = md.split('\n');
    const versions = []; // [{ version, entries: [] }]
    let current = null;
    let currentCategory = null;

    for (const rawLine of lines) {
        const line = rawLine.trimEnd();

        const versionMatch = line.match(/^## \[v?([0-9][0-9.]*)\]/i);
        if (versionMatch) {
            if (current && current.entries.length > 0) versions.push(current);
            current = { version: versionMatch[1], entries: [] };
            currentCategory = null;
            continue;
        }

        if (/^## \[Unreleased\]/i.test(line)) {
            if (current && current.entries.length > 0) versions.push(current);
            current = null;
            currentCategory = null;
            continue;
        }

        if (!current) continue;

        const categoryMatch = line.match(/^###\s*\**(\w+)\**/);
        if (categoryMatch) {
            currentCategory = categoryMatch[1];
            continue;
        }

        const bulletMatch = line.match(/^-\s*(.+)$/);
        if (bulletMatch) {
            const text = bulletMatch[1].trim();
            if (!text) continue;
            current.entries.push(currentCategory ? `${currentCategory}: ${text}` : text);
        }
    }
    if (current && current.entries.length > 0) versions.push(current);
    return versions;
}

function toJsObjectSource(versions) {
    const escapeJs = (s) => s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    const lines = ['const CHANGELOG = {'];
    for (const { version, entries } of versions) {
        lines.push(`    '${version}': [`);
        for (const entry of entries) {
            lines.push(`        '${escapeJs(entry)}',`);
        }
        lines.push('    ],');
    }
    lines.push('};');
    return lines.join('\n');
}

function main() {
    const md = fs.readFileSync(CHANGELOG_MD, 'utf8');
    const versions = parseChangelogMd(md);
    if (versions.length === 0) {
        throw new Error('No versioned entries found in Changelog.md');
    }

    const stateSrc = fs.readFileSync(STATE_JS, 'utf8');
    const startIdx = stateSrc.indexOf(START_MARKER);
    const endIdx = stateSrc.indexOf(END_MARKER);
    if (startIdx === -1 || endIdx === -1 || endIdx < startIdx) {
        throw new Error(`Could not find ${START_MARKER} / ${END_MARKER} markers in js/state.js`);
    }

    const before = stateSrc.slice(0, startIdx + START_MARKER.length);
    const after = stateSrc.slice(endIdx);
    const newSrc = `${before}\n${toJsObjectSource(versions)}\n${after}`;

    fs.writeFileSync(STATE_JS, newSrc);
    console.log(`Synced ${versions.length} version(s) from Changelog.md into js/state.js`);
}

main();
