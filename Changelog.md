# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]
## [v2.6.5] - 2026-08-02
### Added
- Manage a Bank: Filter dropdown now shows question counts per option — e.g. "All Questions (42)", "Chapter 1 (12)"
- Manage a Bank: Compact/Comfortable view toggle button (▤/☰) added beside Filter label; preference persisted in localStorage
### Changed
- Compact mode hides the correct answer preview line and reduces card padding
- Merge JSONs: Summary icon now matches the Summary icon in Design a Test Generation Report

## [v2.6.4] - 2026-08-02
### Fixed
- exportQuestionsAsJson now calls .map(stripRuntimeFields) before serializing, which destructures __uid out and spreads the rest
- saveQBankToStorage does the same, so localStorage is also clean going forward

## [v2.6.3] - 2026-08-02
-Iterate all .qm-edit-difficulty (and .qm-edit-type) selects after DOM insertion and imperatively setting .value from the question data.

## [v2.6.2] - 2026-08-02
### Added
- Difficulty select (Unset / Easy / Medium / Hard) now appears between Type and Question in the Edit Question form, pre-populated from the question's existing difficulty, and saved back on submit.

## [v2.6.1] - 2026-08-02
### Fixed
- Edit Question inputs — category, type, question textarea, and both matching fields now use rounded shadow-sm with border:none instead of rounded border.
- Add Choice E bug — root cause was a missing event listener. The .qm-toggle-choice-e-btn button was rendered in the edit form HTML but attachQuestionManagerEventListeners never wired it up. Added the listener: toggles display:none/flex on the row, updates button text, clears the input on remove.
- Save with Choice E — saveQuestionEdit also had the old radio-based correct logic. Fixed to first-choice-is-correct, and now correctly collects the Choice E input (index 4) — trimming it if empty.
- Breakdown by Difficulty position — the section was being appended to the DOM after reportDiv.innerHTML = reportHtml (as a separate += pass), so it always ended up last regardless of intent. Fixed by inserting it directly into reportHtml before the Shortfall block.

## [v2.6.0] - 2026-08-01
### Changed
- Manage a Bank: Sort options replaced — Default (As Loaded), By Difficulty (Easy→Hard), By Difficulty (Hard→Easy), By Category (A→Z), By Category (Z→A); sort now correctly reorders category groups
- Manage a Bank: "Rename Selected" label renamed to "Change Category"; button renamed from "Rename" to "Change"
- Manage a Bank: Edit Question card now uses box-shadow ring instead of hard border
- Design a Test: Difficulty Breakdown now always shown after test generation (previously only shown when difficulty ratio was active)
- Design a Test: Difficulty Breakdown renamed to "Breakdown by Difficulty"
- Design a Test: Shortfall warning moved below the section heading
- Design a Test: Breakdown by Difficulty uses color-coded rows per tier, equal-width columns, icon in heading, and "No difficulty set." message when all questions are unset

## [v2.5.9] - 2026-08-01
### Changed
- Unused Questions section now always shown after test generation; displays "No unused questions" when all were used
### Fixed
- Breakdown by Category phantom empty last column removed
- All Generation Report tables now use strictly equal column widths

## [v2.5.8] - 2026-08-01
### Fixed
- Unused Questions section now hidden on page load and when no bank is loaded
- Clear Bank and Clear All now clear and hide the Unused Questions section
- Generation Report tables (Breakdown by Category, Shortfall) now use fixed equal column widths

## [v2.5.7] - 2026-08-01
### Added
- "No shortfall detected" message shown in Shortfall section when there are none
### Changed
- "Smart Select Shortfall" renamed to "Shortfall"; now a unified table covering both generation-time (per category) and Smart Select shortfalls
### Fixed
- Clear All now also clears Smart Select inputs and resets shortfall state
- Shortfall table no longer persists after generating a new test without shortfalls
- Unused Questions table columns now use fixed equal widths

## [v2.5.6] - 2026-08-01
### Added
- Smart Select shortfall now tracked and displayed in Generation Report as a red table after Breakdown by Category
### Changed
- Smart Select shortfall is included in the Summary Requested and Shortfall counts
- Shortfall column removed from Breakdown by Category table
- Smart Select shortfall resets on every Smart Select re-run
### Fixed
- Unused Questions section no longer shows placeholder text before a test is generated

## [v2.5.5] - 2026-08-01
### Added
- Icons added to Summary and Breakdown by Category subheadings in Generation Report
### Changed
- Unused Questions section moved inside Generation Report, after Breakdown by Category
- Generation Report tables (Breakdown by Category, Unused Questions) now use color-coded styling

## [v2.5.4] - 2026-08-01
### Added
- Unused Questions now displays a table (Category, MCQ, T/F, Matching, Total) with a Total row at the bottom
### Changed
- Design a Test: increased gap between Answer Distribution Tolerance row and Difficulty Ratio row
- Unused Questions section padding reduced
### Fixed
- Generation Report: Summary and Breakdown by Category subheadings are now smaller than the section heading
### Removed
- "Unused Questions: N" header from Unused Questions section

## [v2.5.3] - 2026-08-01
### Added
- Upload/Download icons added to all Input and Output section headings
### Fixed
- Write Questions > Add Questions: all inputs (including matching pairs and Choice E) now clear after submitting
- Design a Test: loading a bank no longer populates the question list in Manage a Bank

## [v2.5.2] - 2026-08-01
### Added
- Icons next to Edit Bank, Plan a Test, Unused Questions, Generation Report, and Summary (Merge JSONs) section headings
### Fixed
- CSV export and import now correctly handles a 5th answer choice (Option 5)
- Write Questions > Paste Text: Delete All Questions now also clears all input fields

## [v2.5.1] - 2026-08-01
### Fixed
- Write Questions preview buttons (JSON/CSV/GIFT/TXT) now work — had duplicate IDs shared with Convert a File tab
- Convert a File export buttons no longer switch the active preview tab or re-render the preview

## [v2.5.0] - 2026-08-01
### Changed
- Write Questions > Add Questions: radio buttons removed from MCQ choices
- First choice always treated as correct answer (green ✓ icon, "Correct answer" placeholder)
- Choices 2–5 always treated as wrong answers (red ✗ icon, "Wrong answer" placeholder)

## [v2.4.9] - 2026-08-01
### Changed
- Convert a File and Merge JSONs tabs normalized to match Write Questions layout (gap-6, text-sm font-medium buttons, var(--text) labels, consistent output padding and margins)
- Merge JSONs summary box removed; summary now renders flat
- Download JSON button in Merge JSONs matches export button style

## [v2.4.8] - 2026-08-01
### Changed
- Randomize Questions and Answers checkbox removed; randomization always applied automatically
### Removed
- Show/Hide Preview button in the Unused Questions section

## [2.4.7] - 2026-07-31
### Fixed
- "No categories available" placeholder now always renders on page load when no test bank is present (updateCategoryInputs was previously skipped entirely when testBank was empty)

## [2.4.6] - 2026-07-31
### Changed
- Randomize is now always enabled automatically; checkbox removed
- Generation Report no longer wrapped in a nested bordered box
- Show/Hide Preview button moved to left of Export Unused as JSON
### Fixed
- "No categories available" placeholder now correctly appears when test bank is empty

## [2.4.5] - 2026-07-31
### Fixed
- "No categories available" placeholder now shows centered with a document icon and subtext
### Changed
- Smart Selection: Total counter moved above MCQ / T/F / Matching input fields

## [v2.4.2] - 2026-07-31
### Added
- Output preview toggles (JSON / CSV / GIFT / TXT) in Convert a File tab
- Placeholders for Subject, Category, Question, and Choices in Write Questions → Add Questions form
- Matching placeholders in Paste Text (Subject, Category fields)
### Fixed
- Edit Bank section now visible in Manage a Bank (active class was missing after tab restructure)
- Write Questions CSV preview can now be switched away from — other format previews no longer break after selecting CSV
- Design a Test tooltips now use position: fixed + cursor-tracking via mousemove — no longer clipped by overflow-constrained containers
### Changed
- Quick Start Guide rewritten to lead with Write Questions tab workflow
- Default tab on load is now Write Questions; last-visited tab is remembered across sessions via localStorage
  
## [v2.4.0] - 2026-07-31

### Added
- Write Questions tab with Add Questions + Paste Text sub-tabs, output preview toggles (JSON / TXT / GIFT / CSV), all Export as buttons, own examBank (persisted to localStorage), Clear Saved Questions button
- Convert a File tab — single upload-only converter with a "Convert to" dropdown, replacing the four separate Convert tabs
### Changed
- Manage a Bank redesigned — 2-column Input / Output at top, Edit Bank section below
- Tooltips now appear beside their labels on hover (CSS-only, blue ⓘ icon); answer distribution, max consecutive MC/TF, difficulty ratio, and smart selection all converted to this pattern; info-btn / info-popover JS removed
### Removed
- Separate Convert to JSON / CSV / GIFT / Text tabs
- Clear Saved Questions from Manage a Bank (moved to Write Questions)
### Fixed
- Export TXT button in Manage a Bank now consistently labeled "Export as TXT"

## [v2.3.0] - 2026-07-30

### Added
- **Welcome Modal** — shown on first ever launch only. Contains app tagline, 5-step Quick Start, liability disclaimer in an amber callout, and an "I Understand & Get Started" button. Not backdrop-dismissible — must click the button.
- **Changelog Modal** — shown automatically when returning user's stored version ≠ APP_VERSION. Lists entries for the current version from the CHANGELOG object. Backdrop-dismissible. "Got It" or ✕ closes it and stores the new version.
- **CHANGELOG object in main.js** — hardcoded entries for v2.3.0, v2.2.0, and v2.1.1. To add future entries, just add a new key to the object.
- **localStorage keys:** coeus-seen-welcome, coeus-last-seen-version.
- **Footer** — added persistent one-liner: "Provided as-is. Always review exported output before distribution."
- **Show Tips toggle** — button in the tab bar, top-right. Hidden by default. State persists in localStorage (coeus-tips-visible). Clicking toggles both tooltips and tab intros simultaneously.
- **Tab intros** — expanded detail bullets inside each tab's blue header box. Hidden by default, revealed by Show Tips. Cover key workflows, format rules, and gotchas per tab.
- **Tooltip ❓ buttons** — injected next to these section headers when tips are on: QM Input, QM Output/Export, TG Input, TG Generate Test, TG Output, TG Unused Questions, TG Generation Report. Click opens a floating popover. Click again, click outside, or scroll to dismiss. Only one open at a time.

## [v2.2.0] - 2026/07/30

### Added
- **Global Difficulty Ratio UI** — Four inputs (⚪ Unset / 🟢 Easy / 🟡 Medium / 🔴 Hard) with a live total indicator that turns red when not 100%. Defaults to 100% Unset (backward-compatible — existing workflows unchanged).
- **Generation Report** — New Difficulty Breakdown table appears when ratio is active, showing per-category/per-type/per-tier: Requested, From Tier, From Unset (fallback), and Shortfall. A red callout appears if any difficulty shortfall remains unfilled.
###Changed
- **Balanced Pick** — Now validates ratio sums to 100 before running. Toast simplified to either ✅ or ⚠️ shortfall message pointing to report.
- **Test Generation** — selectWithDifficulty() splits each type's requested count by ratio per category, pulls from Unset as fallback when a tier runs short, then logs per-tier stats. Ratio validation runs before generation.

## [v2.1.1] - 2026-07-29

### **Added**
- Footer with About modal, GitHub link, Download Latest, Report a Bug, and AGPLv3 license badge
- About section with project description, tech stack, and credits
- Version number (APP_VERSION) constant in main.js, displayed in footer and About modal
- Export as GIFT in Question Manager (Bank Editor)
- Choice E option in Add New Question form (MCQ)
- Balanced Pick Across Categories in Test Generator — auto-distributes target question counts evenly across all categories
- Zero-padded question numbering in GIFT export (e.g. Q01, Q04)

### **Changed**
- Renamed "Export as Plain Text" to "Export TXT" in Question Manager
- Answer key in TXT export now uses line breaks between entries instead of spaces

### **Fixed**
- Hidden Choice E row excluded from form validation and submission
- Choice E row resets after question is submitted
