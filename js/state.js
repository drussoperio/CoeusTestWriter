/*
 * Coeus Test Writer
 * Copyright (C) 2026 Druss Operio
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published
 * by the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 */

// ========================================
// VERSION
// ========================================
const APP_VERSION = '2.7.0';

// Changelog entries, generated from Changelog.md by scripts/sync-changelog.js.
// Do not hand-edit — update Changelog.md and run: node scripts/sync-changelog.js
// SYNC-CHANGELOG:START
const CHANGELOG = {
    '2.7.0': [
        'Security: Added a shared escapeHtml() helper and applied it throughout Manage a Bank, Design a Test, Convert a File, and Merge JSONs rendering, closing a stored-XSS path where question/category/choice/correct-answer text loaded from a bank file could execute as HTML',
        'Security: Manage a Bank → Change Category now escapes the typed category name before it\'s shown in the Undo toast, closing a second stored-XSS path (a crafted category name could otherwise execute)',
        'Security: showToast() now only renders HTML when a call site explicitly opts in via a new isHtml parameter, instead of guessing based on whether the message contains "<" — fixes the Design a Test / Write Questions / Manage a Bank "Undo" toasts (which intentionally include a real button) while keeping all other toasts safely text-only',
        'Security: Added Subresource Integrity (SRI) hashes and crossorigin attributes to the CDN-loaded Tailwind, docx.js, and Prism scripts/stylesheets, so a compromised CDN or tampered file can no longer execute silently',
        'Fixed: saveQBankToStorage, saveAddedQuestionsToStorage, and saveTestBankToStorage now catch localStorage quota errors and show a warning toast instead of throwing',
        'Fixed: Matching-question table generation now logs a warning if the premise and answer counts diverge instead of failing silently',
        'Changed: Split main.js into logical modules under js/ (state, question-manager, export-formats, test-generator, test-export, convert-merge, helpers, ui-init) loaded via multiple &lt;script&gt; tags — no build step added, still works fully offline via file://',
        'Changed: CHANGELOG object in js/state.js is now generated from this file by scripts/sync-changelog.js instead of hand-duplicated',
        'Removed: ~600 lines of dead legacy converter code (old JSON→TXT, Text→GIFT, and bulk converters, plus their jump-button wiring) left over from before the unified Convert a File tab',
    ],
    '2.6.11': [
        'Fixed: DOCX format details panel in Design a Test — removed conflicting hidden class that prevented it from opening',
    ],
    '2.6.10': [
        'Fixed: Export buttons now sit side-by-side as their own row spanning full column width; Send buttons form a separate row below, also spanning full column width',
    ],
    '2.6.9': [
        'Changed: Export and Send buttons now sit side-by-side, together spanning the full column width, across all tabs',
        'Fixed: Plan a Test category-list empty state now matches the standard empty-state size/style used elsewhere',
    ],
    '2.6.8': [
        'Changed: Design a Test — Upload/Download two-column layout matching other tabs',
        'Changed: Preview Test and Answer Key extracted as its own section with eye icon',
        'Changed: Download File section now contains only filename, DOCX format details, export and send buttons; shading removed from filename row',
        'Changed: Site-wide — Input → Upload File (Upload Files in Merge JSONs), Output → Download File, Generation Report → Review Generation Report',
        'Changed: All export and send buttons expanded to full column width',
    ],
    '2.6.7': [
        'Fixed: Merge JSONs: Summary heading icon now persists after merging (was lost when innerHTML was rewritten)',
        'Added: Merge JSONs: Comprehensive summary table showing Category × Type × Difficulty (Easy / Medium / Hard / Unset) × Total, with rowspan cell merging and a Total row',
        'Changed: All report tables (Breakdown by Category, Shortfall, Unused Questions, Breakdown by Difficulty, Merger Summary): header row and total row are now the darkest shade + bold white text; body rows alternate two lighter shades; identical adjacent cells merged via rowspan; font size unified to text-xs across all tables',
    ],
    '2.6.6': [
        'Added: Empty state placeholders for Write Questions output, Convert a File output, and Merge JSONs output panels',
    ],
    '2.6.5': [
        'Added: Manage a Bank: Filter dropdown now shows question counts per option — e.g. "All Questions (42)", "Chapter 1 (12)"',
        'Added: Manage a Bank: Compact/Comfortable view toggle button (▤/☰) added beside Filter label; preference persisted in localStorage',
        'Changed: Compact mode hides the correct answer preview line and reduces card padding',
        'Changed: Merge JSONs: Summary icon now matches the Summary icon in Design a Test Generation Report',
    ],
    '2.6.4': [
        'Fixed: exportQuestionsAsJson now calls .map(stripRuntimeFields) before serializing, which destructures __uid out and spreads the rest',
        'Fixed: saveQBankToStorage does the same, so localStorage is also clean going forward',
    ],
    '2.6.3': [
        'Fixed: Iterate all .qm-edit-difficulty (and .qm-edit-type) selects after DOM insertion and imperatively setting .value from the question data.',
    ],
    '2.6.2': [
        'Added: Difficulty select (Unset / Easy / Medium / Hard) now appears between Type and Question in the Edit Question form, pre-populated from the question\'s existing difficulty, and saved back on submit.',
    ],
    '2.6.1': [
        'Fixed: Edit Question inputs — category, type, question textarea, and both matching fields now use rounded shadow-sm with border:none instead of rounded border.',
        'Fixed: Add Choice E bug — root cause was a missing event listener. The .qm-toggle-choice-e-btn button was rendered in the edit form HTML but attachQuestionManagerEventListeners never wired it up. Added the listener: toggles display:none/flex on the row, updates button text, clears the input on remove.',
        'Fixed: Save with Choice E — saveQuestionEdit also had the old radio-based correct logic. Fixed to first-choice-is-correct, and now correctly collects the Choice E input (index 4) — trimming it if empty.',
        'Fixed: Breakdown by Difficulty position — the section was being appended to the DOM after reportDiv.innerHTML = reportHtml (as a separate += pass), so it always ended up last regardless of intent. Fixed by inserting it directly into reportHtml before the Shortfall block.',
    ],
    '2.6.0': [
        'Changed: Manage a Bank: Sort options replaced — Default (As Loaded), By Difficulty (Easy→Hard), By Difficulty (Hard→Easy), By Category (A→Z), By Category (Z→A); sort now correctly reorders category groups',
        'Changed: Manage a Bank: "Rename Selected" label renamed to "Change Category"; button renamed from "Rename" to "Change"',
        'Changed: Manage a Bank: Edit Question card now uses box-shadow ring instead of hard border',
        'Changed: Design a Test: Difficulty Breakdown now always shown after test generation (previously only shown when difficulty ratio was active)',
        'Changed: Design a Test: Difficulty Breakdown renamed to "Breakdown by Difficulty"',
        'Changed: Design a Test: Shortfall warning moved below the section heading',
        'Changed: Design a Test: Breakdown by Difficulty uses color-coded rows per tier, equal-width columns, icon in heading, and "No difficulty set." message when all questions are unset',
    ],
    '2.5.9': [
        'Changed: Unused Questions section now always shown after test generation; displays "No unused questions" when all were used',
        'Fixed: Breakdown by Category phantom empty last column removed',
        'Fixed: All Generation Report tables now use strictly equal column widths',
    ],
    '2.5.8': [
        'Fixed: Unused Questions section now hidden on page load and when no bank is loaded',
        'Fixed: Clear Bank and Clear All now clear and hide the Unused Questions section',
        'Fixed: Generation Report tables (Breakdown by Category, Shortfall) now use fixed equal column widths',
    ],
    '2.5.7': [
        'Added: "No shortfall detected" message shown in Shortfall section when there are none',
        'Changed: "Smart Select Shortfall" renamed to "Shortfall"; now a unified table covering both generation-time (per category) and Smart Select shortfalls',
        'Fixed: Clear All now also clears Smart Select inputs and resets shortfall state',
        'Fixed: Shortfall table no longer persists after generating a new test without shortfalls',
        'Fixed: Unused Questions table columns now use fixed equal widths',
    ],
    '2.5.6': [
        'Added: Smart Select shortfall now tracked and displayed in Generation Report as a red table after Breakdown by Category',
        'Changed: Smart Select shortfall is included in the Summary Requested and Shortfall counts',
        'Changed: Shortfall column removed from Breakdown by Category table',
        'Changed: Smart Select shortfall resets on every Smart Select re-run',
        'Fixed: Unused Questions section no longer shows placeholder text before a test is generated',
    ],
    '2.5.5': [
        'Added: Icons added to Summary and Breakdown by Category subheadings in Generation Report',
        'Changed: Unused Questions section moved inside Generation Report, after Breakdown by Category',
        'Changed: Generation Report tables (Breakdown by Category, Unused Questions) now use color-coded styling',
    ],
    '2.5.4': [
        'Added: Unused Questions now displays a table (Category, MCQ, T/F, Matching, Total) with a Total row at the bottom',
        'Changed: Design a Test: increased gap between Answer Distribution Tolerance row and Difficulty Ratio row',
        'Changed: Unused Questions section padding reduced',
        'Fixed: Generation Report: Summary and Breakdown by Category subheadings are now smaller than the section heading',
        'Removed: "Unused Questions: N" header from Unused Questions section',
    ],
    '2.5.3': [
        'Added: Upload/Download icons added to all Input and Output section headings',
        'Fixed: Write Questions > Add Questions: all inputs (including matching pairs and Choice E) now clear after submitting',
        'Fixed: Design a Test: loading a bank no longer populates the question list in Manage a Bank',
    ],
    '2.5.2': [
        'Added: Icons next to Edit Bank, Plan a Test, Unused Questions, Generation Report, and Summary (Merge JSONs) section headings',
        'Fixed: CSV export and import now correctly handles a 5th answer choice (Option 5)',
        'Fixed: Write Questions > Paste Text: Delete All Questions now also clears all input fields',
    ],
    '2.5.1': [
        'Fixed: Write Questions preview buttons (JSON/CSV/GIFT/TXT) now work — had duplicate IDs shared with Convert a File tab',
        'Fixed: Convert a File export buttons no longer switch the active preview tab or re-render the preview',
    ],
    '2.5.0': [
        'Changed: Write Questions > Add Questions: radio buttons removed from MCQ choices',
        'Changed: First choice always treated as correct answer (green ✓ icon, "Correct answer" placeholder)',
        'Changed: Choices 2–5 always treated as wrong answers (red ✗ icon, "Wrong answer" placeholder)',
    ],
    '2.4.9': [
        'Changed: Convert a File and Merge JSONs tabs normalized to match Write Questions layout (gap-6, text-sm font-medium buttons, var(--text) labels, consistent output padding and margins)',
        'Changed: Merge JSONs summary box removed; summary now renders flat',
        'Changed: Download JSON button in Merge JSONs matches export button style',
    ],
    '2.4.8': [
        'Changed: Randomize Questions and Answers checkbox removed; randomization always applied automatically',
        'Removed: Show/Hide Preview button in the Unused Questions section',
    ],
    '2.4.7': [
        'Fixed: "No categories available" placeholder now always renders on page load when no test bank is present (updateCategoryInputs was previously skipped entirely when testBank was empty)',
    ],
    '2.4.6': [
        'Changed: Randomize is now always enabled automatically; checkbox removed',
        'Changed: Generation Report no longer wrapped in a nested bordered box',
        'Changed: Show/Hide Preview button moved to left of Export Unused as JSON',
        'Fixed: "No categories available" placeholder now correctly appears when test bank is empty',
    ],
    '2.4.5': [
        'Fixed: "No categories available" placeholder now shows centered with a document icon and subtext',
        'Changed: Smart Selection: Total counter moved above MCQ / T/F / Matching input fields',
    ],
    '2.4.2': [
        'Added: Output preview toggles (JSON / CSV / GIFT / TXT) in Convert a File tab',
        'Added: Placeholders for Subject, Category, Question, and Choices in Write Questions → Add Questions form',
        'Added: Matching placeholders in Paste Text (Subject, Category fields)',
        'Fixed: Edit Bank section now visible in Manage a Bank (active class was missing after tab restructure)',
        'Fixed: Write Questions CSV preview can now be switched away from — other format previews no longer break after selecting CSV',
        'Fixed: Design a Test tooltips now use position: fixed + cursor-tracking via mousemove — no longer clipped by overflow-constrained containers',
        'Changed: Quick Start Guide rewritten to lead with Write Questions tab workflow',
        'Changed: Default tab on load is now Write Questions; last-visited tab is remembered across sessions via localStorage',
    ],
    '2.4.0': [
        'Added: Write Questions tab with Add Questions + Paste Text sub-tabs, output preview toggles (JSON / TXT / GIFT / CSV), all Export as buttons, own examBank (persisted to localStorage), Clear Saved Questions button',
        'Added: Convert a File tab — single upload-only converter with a "Convert to" dropdown, replacing the four separate Convert tabs',
        'Changed: Manage a Bank redesigned — 2-column Input / Output at top, Edit Bank section below',
        'Changed: Tooltips now appear beside their labels on hover (CSS-only, blue ⓘ icon); answer distribution, max consecutive MC/TF, difficulty ratio, and smart selection all converted to this pattern; info-btn / info-popover JS removed',
        'Removed: Separate Convert to JSON / CSV / GIFT / Text tabs',
        'Removed: Clear Saved Questions from Manage a Bank (moved to Write Questions)',
        'Fixed: Export TXT button in Manage a Bank now consistently labeled "Export as TXT"',
    ],
    '2.3.0': [
        'Added: **Welcome Modal** — shown on first ever launch only. Contains app tagline, 5-step Quick Start, liability disclaimer in an amber callout, and an "I Understand & Get Started" button. Not backdrop-dismissible — must click the button.',
        'Added: **Changelog Modal** — shown automatically when returning user\'s stored version ≠ APP_VERSION. Lists entries for the current version from the CHANGELOG object. Backdrop-dismissible. "Got It" or ✕ closes it and stores the new version.',
        'Added: **CHANGELOG object in main.js** — hardcoded entries for v2.3.0, v2.2.0, and v2.1.1. To add future entries, just add a new key to the object.',
        'Added: **localStorage keys:** coeus-seen-welcome, coeus-last-seen-version.',
        'Added: **Footer** — added persistent one-liner: "Provided as-is. Always review exported output before distribution."',
        'Added: **Show Tips toggle** — button in the tab bar, top-right. Hidden by default. State persists in localStorage (coeus-tips-visible). Clicking toggles both tooltips and tab intros simultaneously.',
        'Added: **Tab intros** — expanded detail bullets inside each tab\'s blue header box. Hidden by default, revealed by Show Tips. Cover key workflows, format rules, and gotchas per tab.',
        'Added: **Tooltip ❓ buttons** — injected next to these section headers when tips are on: QM Input, QM Output/Export, TG Input, TG Generate Test, TG Output, TG Unused Questions, TG Generation Report. Click opens a floating popover. Click again, click outside, or scroll to dismiss. Only one open at a time.',
    ],
    '2.2.0': [
        'Added: **Global Difficulty Ratio UI** — Four inputs (⚪ Unset / 🟢 Easy / 🟡 Medium / 🔴 Hard) with a live total indicator that turns red when not 100%. Defaults to 100% Unset (backward-compatible — existing workflows unchanged).',
        'Added: **Generation Report** — New Difficulty Breakdown table appears when ratio is active, showing per-category/per-type/per-tier: Requested, From Tier, From Unset (fallback), and Shortfall. A red callout appears if any difficulty shortfall remains unfilled.',
        'Changed: **Balanced Pick** — Now validates ratio sums to 100 before running. Toast simplified to either ✅ or ⚠️ shortfall message pointing to report.',
        'Changed: **Test Generation** — selectWithDifficulty() splits each type\'s requested count by ratio per category, pulls from Unset as fallback when a tier runs short, then logs per-tier stats. Ratio validation runs before generation.',
    ],
    '2.1.1': [
        'Added: Footer with About modal, GitHub link, Download Latest, Report a Bug, and AGPLv3 license badge',
        'Added: About section with project description, tech stack, and credits',
        'Added: Version number (APP_VERSION) constant in main.js, displayed in footer and About modal',
        'Added: Export as GIFT in Question Manager (Bank Editor)',
        'Added: Choice E option in Add New Question form (MCQ)',
        'Added: Balanced Pick Across Categories in Test Generator — auto-distributes target question counts evenly across all categories',
        'Added: Zero-padded question numbering in GIFT export (e.g. Q01, Q04)',
        'Changed: Renamed "Export as Plain Text" to "Export TXT" in Question Manager',
        'Changed: Answer key in TXT export now uses line breaks between entries instead of spaces',
        'Fixed: Hidden Choice E row excluded from form validation and submission',
        'Fixed: Choice E row resets after question is submitted',
    ],
};
// SYNC-CHANGELOG:END

// ========================================
// GLOBAL VARIABLES
// ========================================

let testBank = [];
let questionBank = [];
let __qbUidCounter = 1;
function assignQuestionUids(arr) {
    (arr || []).forEach(q => { if (q && q.__uid == null) q.__uid = __qbUidCounter++; });
    return arr;
}
let addedQuestions = []; // references to questions added via "Add Question to Bank" form
let examBank = [];       // Write Questions tab — own bank (exambank)
let lastGeneratedQuestions = [];
let lastUnusedQuestions = [];
let lastSelectedCategories = {};
let excludedQuestions = [];
let generationStats = {};
let lastSmartSelectShortfalls = null; // { mcTarget, tfTarget, mtTarget, mcShortfall, tfShortfall, mtShortfall }
let testVersionIndex = 0;
let questionManagerState = {
    searchText: '',
    sortBy: 'asLoaded',
    filterBy: 'all',
    selectedQuestions: new Set(),
    editingIndex: null,
    editFormData: {},
    collapsedCategories: {},
    compactView: localStorage.getItem('coeus-compact-view') === 'true'
};
const VERSION_LABELS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
let mergedQuestions = [];
let mergerFileStats = [];

// ========================================
// HTML ESCAPING
// ========================================

// Escapes untrusted text (e.g. loaded from bank files) before inserting into innerHTML.
function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (ch) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
    }[ch]));
}
