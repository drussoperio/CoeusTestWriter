# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.4.0] - 2026-07-31

### Added
- Write Questions tab with Add Questions + Paste Text sub-tabs, output preview toggles (JSON / TXT / GIFT / CSV), all Export as buttons, own examBank (persisted to localStorage), Clear Saved Questions button
- Convert a File tab — single upload-only converter with a "Convert to" dropdown, replacing the four separate Convert tabs
### Changed
- Manage a Bank redesigned — 2-column Input / Output at top, Edit Bank section below
- Tooltips now appear beside their labels on hover (CSS-only, blue ⓘ icon); answer distribution, max consecutive MC/TF, difficulty ratio, and smart selection all converted to this pattern; info-btn / info-popover JS removed
### Removed
-Separate Convert to JSON / CSV / GIFT / Text tabs
-Clear Saved Questions from Manage a Bank (moved to Write Questions)
### Fixed
- Export TXT button in Manage a Bank now consistently labeled "Export as TXT"

## [2.3.0] - 2026-07-30

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

## [2.1.1] - 2026-07-29

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
