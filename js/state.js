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
const APP_VERSION = '2.15.0';

// Changelog entries, generated from Changelog.md by scripts/sync-changelog.js.
// Do not hand-edit — update Changelog.md and run: node scripts/sync-changelog.js
// SYNC-CHANGELOG:START
const CHANGELOG = {
    '2.15.0': [
        'Changed: Write Questions and Manage a Bank: the fewer-than-4-choices check from 2.14.0 is no longer blocking on Compose Question or Paste Text — some multiple choice questions are legitimately 2-choice (e.g. a true/false-style question saved as multiple_choice), so it\'s now a non-blocking heads-up toast on add, plus a permanent record in Manage a Bank\'s Bank Stats validation report (see Added below). Leaving Correct Answer blank is still blocked — that\'s always wrong, not a judgment call.',
        'Added: Manage a Bank → Bank Stats validation report: new "fewer than 4 choices" section, styled as a minor/informational notice (blue) separate from real issues (amber) like missing correct answers or duplicates. Each listed question is a clickable link that jumps to Edit Bank, expands its category, scrolls to it, and briefly highlights it — so a whole bank\'s worth of these can be found and eyeballed at once instead of only catching them one at a time while composing.',
        'Added: Write Questions and Manage a Bank Paste Text: now warns and blocks if a pasted question has more than 5 choices (only a.–e. are supported; anything from f. onward was previously silently merged into choice e\'s text instead of becoming its own choice or raising any warning).',
    ],
    '2.14.0': [
        'Changed: Write Questions and Manage a Bank: the "fewer than 4 choices" check from 2.13.1 is replaced with inline, blocking validation on both Compose Question (warning appears below the Question field) and Paste Text (below "Paste plain text here"), matching the existing "no correct answer marked" warning style — instead of a passive whole-bank banner that only existed in Write Questions and never stopped a bad question from being added.',
        'Fixed: Write Questions and Manage a Bank Compose Question: leaving the Correct Answer field blank silently promoted the first non-blank Wrong Answer to the correct one, because blank choice inputs were filtered out before the first surviving one was used as index 0. The correct-answer input is now read directly; submitting blank, or with fewer than 4 total choices, is blocked with an inline warning instead of silently saving bad data.',
        'Fixed: Manage a Bank: Delete Selected undercounted (capped at 1) and failed to delete anything for questions added via the Add Questions tab (Compose Question, Paste Text, or Matching), or for any question after it was edited once in Edit Bank. Both paths built a brand-new question object without the internal `__uid` used to track selection, so multiple such checkboxes collapsed to a single entry and never matched on delete. Question edits also silently dropped their `subject` and `difficulty` fields for the same reason; edits now preserve every existing field and only overwrite the ones actually changed.',
        'Fixed: Send to Manage a Bank / Send to Design a Test (from Write Questions, Convert a File, Merge JSONs, or between Manage a Bank and Design a Test) now marks the destination tab\'s Upload File drop zone as loaded (question count, green text) instead of leaving it showing "Drag & drop file or click to browse" while a bank was actually loaded behind the scenes.',
    ],
    '2.13.1': [
        'Added: Write Questions: new warning banner, shown whenever any multiple choice question in the exam bank has fewer than 4 choices — not just the question currently being composed. Lists each affected question and updates live as questions are added, pasted, or deleted.',
    ],
    '2.13.0': [
        'Added: Design a Test: new "Reshuffle Test" button next to Construct New Test (side by side, each with its own subtitle explaining what it does) — creates another version of the current test using the exact same questions, with a freshly shuffled question order and shuffled answer choices, without re-rolling which questions were picked from the bank. Previously the only way to do this was exporting the generated test as JSON and re-loading it as a new bank. Disabled until a test has been constructed; re-disables on Clear Test Bank. Versions are labeled A/B/C… (already-existing version tracking), which also carries into exported filenames.',
        'Changed: Design a Test: "Construct Test" renamed to "Construct New Test" to distinguish it from the new "Reshuffle Test" button.',
    ],
    '2.12.0': [
        'Added: Manage a Bank → Add Questions: Compose Question and Paste Text now both capture a Subject field, matching Write Questions.',
        'Changed: Manage a Bank → Add Questions is now gated behind a loaded bank: Compose Question and Paste Text are hidden behind a message pointing back to Upload File whenever the bank is empty, instead of letting Add Questions spin up a bank from nothing.',
        'Fixed: Write Questions and Manage a Bank: Paste Text no longer leaves the Subject, Category, and Difficulty fields (and the pasted text itself) filled in after successfully adding questions — all Paste Text and Compose Question forms now fully clear on add, matching each other.',
    ],
    '2.11.1': [
        'Fixed: update.sh / update.bat now check whether the folder is actually a git repository before running `git pull`, and print a clear explanation (plus the `git clone` command to fix it) instead of a raw `fatal: not a git repository` error — this happens when the app was downloaded as a ZIP file instead of cloned with git.',
    ],
    '2.11.0': [
        'Added: Manage a Bank → Add Questions: split into "Compose Question" and "Paste Text" sub-tabs, mirroring Write Questions — paste plain numbered text and convert it directly into the bank you\'re managing, instead of only being able to compose one question at a time.',
        'Added: Manage a Bank → Add Questions: new "Preview Questions" panel showing the live bank contents with JSON/CSV/GIFT/TXT format toggles and a top/bottom scroll jump button. It\'s read-only (no export/filename/send-to controls), since those already live in the Download File section above Edit Bank.',
    ],
    '2.10.0': [
        'Added: Manage a Bank: new "Add Questions" subtab alongside "Edit Bank" — compose a question (multiple choice, true/false, or matching, including the Choice E toggle) and add it straight into the bank you\'re managing, without switching to the Write Questions tab',
        'Fixed: Manage a Bank: editing any field of a multiple-choice question — including just its category — was silently wiping its correct answer on save. `saveQuestionEdit()` looked for a radio input that\'s only ever rendered for true/false questions, so it never found a match for multiple choice and reset `correct` to blank every time.',
        'Fixed: Manage a Bank: there was no way to actually change which choice is correct when editing a question — the check/✗ icons next to each choice were purely decorative. They\'re now clickable: click a choice\'s icon to mark it correct.',
        'Fixed: Manage a Bank: the true/false edit form\'s correct-answer radio also failed to save, due to a malformed `[class="..."]` attribute selector that never matched the rendered multi-class attribute.',
        'Fixed: Manage a Bank: the "Remove Choice E" button in the question editor had no click handler and did nothing when clicked.',
    ],
    '2.9.3': [
        'Fixed: Merge JSONs: removed an unnecessary `flex flex-col` wrapper on the Upload Files / Download File columns that was nesting the heading\'s own internal flex layout inside another flex context, causing the heading icons to render slightly lower than their text (and out of alignment with every other tab\'s headings) from initial page load.',
    ],
    '2.9.2': [
        'Changed: Write Questions: renamed the "Upload File" heading (a leftover mislabel — this tab doesn\'t upload anything) to "Add Questions", and renamed the "Add Questions" sub-tab to "Compose Question"',
        'Fixed: The GitHub update-check now logs what it found (or why it failed) to the console on every path instead of silently swallowing everything — makes a failed/blocked check diagnosable via devtools instead of indistinguishable from "already up to date". Also hardened the release-tag parsing to strip a stray "v." prefix (some older release tags used "v.2.4.3" instead of "v2.4.3"), which could otherwise produce a garbled version number in the banner.',
    ],
    '2.9.1': [
        'Added: update.bat (Windows) and update.sh (Mac/Linux) — double-click scripts that run `git pull origin main` from the app\'s own folder, for one-click updating instead of retyping the git command',
        'Added: Icons added to the Test Preview and Answer Key headings',
        'Fixed: Select All Available now also resets the Smart Selection target inputs (MCQ/T-F/Matching), which previously kept showing stale numbers after being superseded',
        'Fixed: Generation Report tables (Breakdown by Category, Shortfall, Breakdown by Difficulty, Unused Questions) no longer show cell borders — zebra striping only',
        'Fixed: Design a Test\'s Upload File status no longer shows a redundant "Test bank loaded successfully!" line — just the question count',
        'Fixed: Clear Bank (Manage a Bank and Design a Test) now also clears the Filename field, instead of leaving the previous filename behind',
        'Changed: Design a Test\'s Download File filename input now shows a faint "testbank" placeholder (matching the style of every other filename field) instead of being pre-filled with the literal value "test"',
    ],
    '2.9.0': [
        'Fixed: Clear Bank (Manage a Bank and Design a Test) could get permanently stuck showing a failed-load filename in the drop zone: the reset code ran after an "if bank is empty, show Nothing to clear" guard, which always fired first when a load had just failed. The drop zone now always resets on Clear Bank, and a failed load resets its own drop zone immediately too.',
        'Fixed: Clear Test Bank left the Answer Key showing stale content and Test Preview as an empty box instead of returning to the "No test generated yet" state — it now clears the Answer Key too and properly hides the output panel.',
        'Fixed: Design a Test\'s Shortfall table could report a stale Smart Select shortfall indefinitely: running Smart Select with a shortfall, then generating a completely different selection (e.g. via Select All Available), kept showing the old Smart Select shortfall in every subsequent Generation Report. It\'s now treated as a one-shot value for the very next report, and is also cleared immediately when Select All Available replaces the selection.',
        'Changed: Manage a Bank: pulled the stats and validation panels out of the cramped Edit Bank sidebar into their own standalone "Bank Stats" section (stat cards in a row + validation report below, both full width) between Upload/Download and Edit Bank; Edit Bank is back to a single column.',
        'Changed: Design a Test: Test Preview and Answer Key are no longer nested in one shared scroll box behind a Show/Hide toggle — the Answer Key is now always visible under its own heading, in its own independently-scrollable box with its own jump button.',
        'Changed: Design a Test: the MCQ answer distribution is now its own card, with a new T/F answer distribution card beside it (both always visible, outside the scrollable boxes).',
        'Changed: Design a Test: the Generation Report\'s 4 tables (Breakdown by Category, Shortfall, Breakdown by Difficulty, Unused Questions) are now laid out in a 2x2 grid instead of stacked vertically, cutting down on excess whitespace.',
    ],
    '2.8.0': [
        'Added: Manage a Bank: new bank health/validation panel — flags duplicate questions (case/whitespace-insensitive text match), missing correct answers, empty question text, multiple choice questions with too few or duplicate choices, and matching pairs missing a premise or answer. Shows a green "no issues" message when the bank is clean. Includes its own scroll-jump button for long reports.',
        'Added: Manage a Bank: new stats sidebar next to the question list — total count, breakdown by type, by difficulty, and by category (top 8 + "N more")',
        'Added: Keyboard shortcuts: Alt+1..5 to jump between tabs, Ctrl/Cmd+Enter to submit the Add Question form from any field, Escape to cancel the open question editor, and ? to open a new shortcuts help modal (also linked from the footer)',
        'Changed: Undo is now a shared, capped 5-step stack instead of one snapshot per feature with a 5-second timeout — clearing a bank, bulk-deleting questions, changing category, and deleting all exam-bank questions can each be undone even after several of them happen in a row; Ctrl/Cmd+Z now works uniformly across all of them',
        'Changed: All Top/Bottom scroll button pairs (Write Questions, Convert a File, Merge JSONs, and the new Manage a Bank validation report) are now a single button that jumps to whichever end you\'re not at, and relabels itself ("↓ Bottom" / "↑ Top") based on scroll position — including while scrolling manually',
        'Changed: Manage a Bank\'s Sort dropdown is now 4 toggle buttons (Category A→Z, Category Z→A, Difficulty Easy→Hard, Difficulty Hard→Easy); the "Default (As Loaded)" option is gone and Category A→Z is the default view',
        'Changed: All "Cleared"/"Deleted" toasts (Clear Bank in every tab, bulk-delete undo) are now consistently orange instead of a mix of green and orange',
        'Fixed: Manage a Bank → Change Category undo previously restored a snapshot that shared question objects with the live bank, so the category change was never actually undone; the snapshot is now a proper per-question clone',
        'Fixed: Manage a Bank\'s category sections always rendered in ascending alphabetical order regardless of the chosen sort — "By Category (Z→A)" never actually reversed the section order. Sections now follow the order the selected sort actually produces.',
    ],
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
let lastSelectionQuestions = []; // the raw (unshuffled) question set behind the last Construct New Test, reused by Reshuffle Test
let lastUnusedQuestions = [];
let lastSelectedCategories = {};
let excludedQuestions = [];
let generationStats = {};
let lastSmartSelectShortfalls = null; // { mcTarget, tfTarget, mtTarget, mcShortfall, tfShortfall, mtShortfall }
let testVersionIndex = 0;
let questionManagerState = {
    searchText: '',
    sortBy: 'cat-asc',
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
