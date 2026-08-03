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
const APP_VERSION = '2.6.11';

// Changelog entries — add a new array entry for each version
const CHANGELOG = {
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
        'Changed: Site-wide — Input renamed to Upload File (Upload Files in Merge JSONs), Output renamed to Download File, Generation Report renamed to Review Generation Report',
        'Changed: All export and send buttons expanded to full column width',
    ],
    '2.6.7': [
        'Added: Send to Manage a Bank and Send to Design a Test buttons (orange) in Write Questions, Convert a File, and Merge JSONs output panels — loads questions directly into the target tab without requiring a file export',
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
		'Added: Difficulty select (Unset / Easy / Medium / Hard) now appears between Type and Question in the Edit Question form, pre-populated from the questions existing difficulty, and saved back on submit.',
    ],
	'2.6.1': [
        'Added: Edit Question inputs — category, type, question textarea, and both matching fields now use rounded shadow-sm with border:none instead of rounded border.',
		'Added: Add Choice E bug — root cause was a missing event listener. The .qm-toggle-choice-e-btn button was rendered in the edit form HTML but attachQuestionManagerEventListeners never wired it up. Added the listener: toggles display:none/flex on the row, updates button text, clears the input on remove.',
		'Added: Save with Choice E — saveQuestionEdit also had the old radio-based correct logic. Fixed to first-choice-is-correct, and now correctly collects the Choice E input (index 4) — trimming it if empty.',
		'Added: Breakdown by Difficulty position — the section was being appended to the DOM after reportDiv.innerHTML = reportHtml (as a separate += pass), so it always ended up last regardless of intent. Fixed by inserting it directly into reportHtml before the Shortfall block.',
    ],
	'2.6.0': [
        'Changed: Unused Questions section now always shown after test generation; displays "No unused questions" when all were used',
        'Fixed: Breakdown by Category phantom empty last column removed',
        'Fixed: All Generation Report tables now use strictly equal column widths',
    ],
    '2.5.9': [
        'Changed: Unused Questions section now always shown after test generation; displays "No unused questions" when all were used',
        'Fixed: Breakdown by Category phantom empty last column removed',
        'Fixed: All Generation Report tables now use strictly equal column widths',
    ],
    '2.5.8': [
        'Fixed: Unused Questions section now hidden on page load and when no bank is loaded',
        'Fixed: Clear Bank and Clear All now clear and hide the Unused Questions section',
        'Fixed: Generation Report tables now use fixed equal column widths',
    ],
    '2.5.7': [
        'Fixed: Clear All now also clears Smart Select inputs and resets shortfall state',
        'Fixed: Shortfall table no longer persists after generating a new test with no shortfall',
        'Changed: Renamed "Smart Select Shortfall" to "Shortfall"; now unified table covering both generation-time and Smart Select shortfalls',
        'Added: "No shortfall detected" message shown when there are no shortfalls',
        'Fixed: Unused Questions table columns now use fixed equal widths',
    ],
    '2.5.6': [
        'Fixed: Unused Questions section no longer shows placeholder text before a test is generated',
        'Added: Smart Select shortfall now tracked and shown in Generation Report as a red table after Breakdown by Category',
        'Changed: Smart Select shortfall is included in the Summary shortfall count and Requested count',
        'Changed: Shortfall column removed from Breakdown by Category table',
        'Changed: Smart Select shortfall resets on every Smart Select re-run',
    ],
    '2.5.5': [
        'Changed: Unused Questions section moved inside Generation Report, after Breakdown by Category',
        'Added: Icons to Summary and Breakdown by Category subheadings in Generation Report',
        'Changed: Generation Report tables (Breakdown by Category, Unused Questions) now use color-coded styling',
    ],
    '2.5.4': [
        'Changed: Design a Test — increased gap between Answer Distribution Tolerance row and Difficulty Ratio row',
        'Changed: Unused Questions section padding reduced',
        'Removed: "Unused Questions: N" header from Unused Questions section',
        'Added: Unused Questions now displays a table (Category, MCQ, T/F, Matching, Total) with a Total row at the bottom',
        'Fixed: Generation Report — Summary and Breakdown by Category subheadings are now smaller than the section heading',
    ],
    '2.5.3': [
        'Fixed: Write Questions > Add Questions — form inputs, matching pairs, and Choice E now fully clear after submitting a question',
        'Added: Upload (↑) and Download (↓) icons added to all Input and Output section headings',
        'Fixed: Design a Test — loading a bank no longer populates the question list in Manage a Bank',
    ],
    '2.5.2': [
        'Added: Icons next to Edit Bank, Plan a Test, Unused Questions, Generation Report, and Summary (Merge JSONs) section headings',
        'Fixed: CSV export and import now correctly handles a 5th answer choice (Option 5)',
        'Fixed: Write Questions > Paste Text — Delete All Questions now also clears Subject, Category, Difficulty, and text input fields',
    ],
    '2.5.1': [
        'Fixed: Write Questions preview buttons (JSON/CSV/GIFT/TXT) now work correctly — buttons had duplicate IDs shared with Convert a File tab',
        'Fixed: Convert a File export buttons no longer switch the active preview tab or re-render the preview',
    ],
    '2.5.0': [
        'Changed: Write Questions > Add Questions — radio buttons removed from MCQ choices',
        'Changed: First choice is always the correct answer (✓ icon + "Correct answer" placeholder); remaining choices are always wrong (✗ icon + "Wrong answer" placeholder)',
    ],
    '2.4.9': [
        'Changed: Convert a File and Merge JSONs tabs normalized to match Write Questions layout (gap-6, text-sm font-medium buttons, var(--text) labels, consistent output padding and margins)',
        'Changed: Merge JSONs summary box removed; summary renders flat like other tabs',
        'Changed: Download JSON button in Merge JSONs matches export button style',
    ],
    '2.4.8': [
        'Changed: Randomize Questions and Answers checkbox removed; randomization is now always applied automatically',
        'Removed: Show/Hide Preview button in the Unused Questions section',
    ],
    '2.4.7': [
        'Fixed: "No categories available" placeholder now always renders on page load when no test bank is present',
    ],
    '2.4.6': [
        'Changed: Randomize is now always on; checkbox removed',
        'Fixed: "No categories available" placeholder now correctly appears when test bank is empty',
        'Changed: Generation Report no longer has a nested bordered box',
        'Changed: Show/Hide Preview button moved to left of Export Unused as JSON',
    ],
    '2.4.5': [
        'Fixed: "No categories available" placeholder now displays centered with a document icon and descriptive subtext',
        'Changed: Smart Selection — Total counter moved above the MCQ / T/F / Matching input fields',
    ],
    '2.4.4': [
        'Changed: Design a Test layout restructured into 4 rows matching reference image',
        'Changed: Row 1 — Answer Distribution Tolerance, Max Consecutive MC, Max Consecutive T/F in a 3-column grid',
        'Changed: Row 2 — Difficulty Ratio, Smart Selection inputs + total counter, and action buttons (Auto-Select by Type, Select All Available, Clear All) side by side',
        'Changed: Row 3 — Exclude Already-Used Questions (inline, no extra nesting)',
        'Changed: Row 4 — Full-width Construct Test button (renamed from Generate Test)',
        'Changed: Difficulty Ratio and Smart Selection headers enlarged to match Answer Distribution style; enclosing box removed',
    ],
    '2.4.3': [
        'Added: Plain-text formatting rules in Write Questions Show Tips',
        'Added: Format warning in Paste Text when input does not follow expected structure',
        'Added: Delete All Questions in Paste Text tab — mirrors Add Questions behavior with confirm + undo',
        'Added: Convert button in Convert a File (previews without downloading)',
        'Changed: Manage a Bank — Set Difficulty moved to second column beside Rename Selected; Delete Selected button moved below with no header',
    ],
    '2.4.2': [
        'Added: Output preview toggles (JSON/CSV/GIFT/TXT) in Convert a File tab',
        'Added: Placeholders for Subject, Category, Question, and Choices in Write Questions → Add Questions',
        'Added: Matching placeholders in Paste Text tab (Subject, Category)',
        'Fixed: Edit Bank section now visible in Manage a Bank (active class restored)',
        'Fixed: Write Questions CSV preview can now be switched away from without breaking other previews',
        'Fixed: Design a Test tooltips now use fixed positioning and follow the cursor — no longer clipped',
        'Changed: Quick Start Guide rewritten to lead with Write Questions tab',
        'Changed: Default tab is now Write Questions; last-visited tab is remembered across sessions',
    ],
    '2.4.1': [
        'Added: Subject field in Write Questions → Add Questions form',
        'Added: Undo support for Delete All Questions (5-second window)',
        'Added: Confirmation popup before deleting all exam bank questions',
        'Added: CSV preview rendered as table in Write Questions output panel',
        'Changed: Add Question and Delete All Questions buttons placed side by side',
        'Changed: Renamed "Clear Saved Questions" to "Delete All Questions"',
        'Changed: Write Questions form inputs use shadows instead of borders',
        'Changed: Manage a Bank — Add Questions inner tab removed; Edit Bank is now the only view',
        'Changed: Set Difficulty dropdown width matches Rename Selected input',
        'Changed: "Select Questions Across Categories" button shortened to "Auto-Select by Type"',
        'Changed: Convert a File — replaced Convert-to dropdown with four direct Export buttons',
    ],
    '2.4.0': [
        'Added: Write Questions tab — own exam bank (exambank), Add Questions and Paste Text sub-tabs, output preview toggles (JSON/TXT/GIFT/CSV), export buttons, Clear Saved Questions',
        'Added: Convert a File tab — single unified converter replacing four separate Convert tabs; upload-only; format selector',
        'Changed: Manage a Bank redesigned — 2-column Input/Output at top, Edit Bank below',
        'Changed: Tooltips now appear beside labels (hover); info buttons converted to CSS tooltip icons',
        'Removed: Separate Convert to JSON / CSV / GIFT / Text tabs (merged into Convert a File)',
        'Removed: Clear Saved Questions from Manage a Bank (moved to Write Questions)',
        'Fixed: Export TXT button label standardized to "Export as TXT"',
    ],
    '2.3.0': [
        'Welcome modal shown on first launch with Quick Start guide',
        'Liability disclaimer in welcome modal and footer',
        'Changelog modal shown automatically on version update',
    ],
    '2.2.0': [
        'Difficulty setting (Easy / Medium / Hard / Unset) added to questions',
        'Global difficulty ratio presets in Test Generator',
        'Balanced Pick now respects difficulty ratio with Unset fallback',
        'Generation Report now includes Difficulty Breakdown table',
        'Difficulty badge and filter added to Bank Editor',
        'Bulk Set Difficulty for selected questions',
        'Difficulty dropdown in Convert to JSON (Paste Text)',
        'CSV export/import now includes Difficulty column',
    ],
    '2.1.1': [
        'Footer with About modal, GitHub, Download Latest, Report a Bug, AGPLv3',
        'About section with project description and credits',
        'Version number displayed in footer and About modal',
        'Export as GIFT in Question Manager',
        'Choice E option in Add New Question (MCQ)',
        'Select Questions Across Categories (Balanced Pick)',
        'Zero-padded question numbering in GIFT export',
        'Answer key in TXT export uses line breaks between entries',
        'Renamed Export as Plain Text to Export TXT',
    ],
};

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
let lastDeletedBank = null;
let undoTimeoutId = null;
let lastBankEditorSnapshot = null;
let bankEditorUndoTimeoutId = null;

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
