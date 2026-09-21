# Coeus Test Writer

A browser-based toolkit for writing, organizing, and generating exam questions. No installation, backend, or account required — open the HTML file and it runs entirely client-side.

## Features

- **Write questions** — type questions one at a time or paste plain numbered text; preview in JSON, CSV, GIFT, or TXT instantly.
- **Manage a bank** — load, search, filter, sort, bulk-rename, set difficulty, and bulk-delete from a JSON question bank, or add new questions to it directly without leaving the tab.
- **Design a test** — generate randomized, versioned tests with answer-distribution balancing, difficulty ratios, and per-category quotas; reshuffle a generated test into another version without re-picking questions.
- **Convert a file** — upload any supported format (JSON, CSV, GIFT TXT, plain TXT) and export to any other format.
- **Merge JSONs** — combine multiple JSON question banks into one file.
- **Send between tabs** — push a bank directly from one tab to another (e.g. Manage a Bank → Design a Test) without exporting and re-uploading a file.
- **Local-only storage** — question banks and preferences persist via browser `localStorage`; nothing leaves the browser.
- **Multi-step undo** — a shared, capped 5-step undo stack covers clearing a bank, bulk-deleting questions, changing category, and similar destructive actions; press Ctrl/Cmd+Z to step back through recent changes.
- **Keyboard shortcuts** — Alt+1..5 to jump between tabs, Ctrl/Cmd+Enter to submit the active form, Escape to cancel an open editor, and ? to open the shortcuts help modal.

## Installation

### Option A — Download a Release

1. Go to the [Releases](../../releases) page and download the latest `.zip`.
2. Extract the archive.
3. Open `Coeus_Test_Writer.html` in any modern browser (Chrome, Firefox, Edge).

### Option B — Clone with Git

```bash
git clone https://github.com/your-username/coeus-test-writer.git
cd coeus-test-writer
```

Then open `Coeus_Test_Writer.html` in your browser.

No server or build step is required. CDN libraries (docx.js, Prism) are loaded from the internet on first use.

## Updating

### From a Release

1. Download the latest `.zip` from [Releases](../../releases).
2. Replace your existing `Coeus_Test_Writer.html` and `js/` folder with the new versions.
3. Your saved bank and preferences in `localStorage` are preserved automatically.

### With Git

```bash
git pull origin main
```

Then reload `Coeus_Test_Writer.html` in your browser. Alternatively, double-click `update.bat` (Windows) or `update.sh` (Mac/Linux) in the app's folder to run the same `git pull` without typing the command.

## Coeus JSON Question Format

All tabs share a common JSON array format:

```json
[
  {
    "question": "What is the capital of France?",
    "category": "Geography",
    "type": "multiple_choice",
    "difficulty": "easy",
    "correct": "Paris",
    "choices": ["London", "Paris", "Berlin", "Madrid"]
  }
]
```

- `type` — `"multiple_choice"`, `"true_false"`, or `"matching"`.
- `difficulty` — `"unset"`, `"easy"`, `"medium"`, or `"hard"`. Defaults to `"unset"`.
- For `true_false`, `correct` is `"True"` or `"False"`; `choices` is omitted.
- For `matching`, each premise is its own question object with `choices: [null, null, null, null]` — not a grouped pairs array.

## Tabs

### Write Questions

Write and accumulate questions into a local exam bank, then export the whole bank at once.

**Compose Question** (sub-tab) — One-question-at-a-time form:
- Set **Subject**, **Category**, **Type** (Multiple Choice / True/False / Matching), and **Difficulty**.
- Multiple Choice: the first choice is always the correct answer (✓); choices 2–5 are wrong answers (✗). Use **+ Add Choice E** to show a fifth option. Leaving Correct Answer blank is blocked; fewer than 4 total choices shows a warning but is still allowed.
- True/False: select True or False.
- Matching: click **+ Add Premise & Answer** to add premise/answer pairs in two columns.
- **Add Question** appends to the bank. **Delete All Questions** clears the entire saved bank.

**Paste Text** (sub-tab) — Bulk-add via plain numbered text (same format as Convert a File → JSON; see the formatting rules there). Set Subject, Category, and Difficulty first, then paste and click **Add Question**.

**Download File** panel — preview the current bank as JSON, CSV, GIFT, or TXT. Export using **Export as JSON / CSV / TXT / GIFT**, or use **Send to Manage a Bank** / **Send to Design a Test** to load the bank directly into another tab without exporting a file.

---

### Manage a Bank

Load and curate an existing JSON question bank.

**Upload File** — Drag-and-drop or browse for a `.json` file. **Clear Bank** removes it from memory without affecting `localStorage`.

**Download File** — Export the current bank as **JSON**, **CSV**, **TXT**, or **GIFT**, or use **Send to Design a Test** to load it directly into the test generator. Sending or receiving a bank via Send to X shows the source filename in the destination tab's Upload File drop zone.

**Bank Stats** — a standalone section showing total question count, breakdown by type/difficulty/category, and a validation report split into two parts:
- **Issues** (amber) — duplicate questions, missing or invalid correct answers (including a correct answer that no longer matches any of its choices — catches hand-edited JSON), empty question text, and malformed multiple-choice or matching entries.
- **Minor** (blue) — multiple choice questions with fewer than 4 choices; often fine (e.g. a true/false-style question saved as multiple choice), but worth a look. Every listed question is a clickable link that jumps to it in Edit Bank, expands its category, and briefly highlights it.

Sits alongside two inner tabs:

**Edit Bank** — Search, sort, and filter the loaded bank:
- **Search** — matches question text, answers, or category.
- **Sort** — 4 toggle buttons: By Category (A→Z / Z→A) and By Difficulty (Easy→Hard / Hard→Easy). Category A→Z is the default view.
- **Filter** — All Questions, Multiple Choice Only, True/False Only, Matching Only, or any Difficulty tier. Each option shows its question count.
- **Compact/Comfortable toggle** (▤/☰) — compact mode hides the correct-answer preview line and reduces card padding. Preference is saved in `localStorage`.
- **Change Category** — bulk-renames the category of selected questions.
- **Set Difficulty** — bulk-sets the difficulty of selected questions.
- **Select All Visible** — selects all questions matching the current search/filter.
- **Delete (N)** — removes selected questions permanently.
- **Edit** a question inline — click a choice's check/✗ icon to mark it correct (the first choice slot is always the correct one). Blank wrong choices (e.g. an unused Choice E left empty) are dropped automatically instead of being saved as an empty choice.

**Add Questions** — compose or paste new questions straight into the bank being managed, without switching to Write Questions. Only available once a bank is loaded.
- **Compose Question** — same one-question-at-a-time form as Write Questions (see below), including the Correct Answer / Wrong Answer fields and Choice E toggle. Leaving Correct Answer blank is blocked; a choice count under 4 shows a warning but doesn't block adding.
- **Paste Text** — same plain-text bulk format as Write Questions. Blocks if a question has more than 5 choices (only `a.`–`e.` are recognized); warns (without blocking) if fewer than 4.
- **Preview Questions** — read-only live preview of the bank in JSON/CSV/GIFT/TXT, with format toggles and a scroll jump button.

---

### Design a Test

Generate a randomized, versioned test from a loaded JSON bank.

**Upload File** — Load a `.json` bank. A warning appears if any questions lack a `correct` field.

**Download File** — Set a filename (a version letter is appended automatically, e.g. `exam_A.docx`). DOCX format details are expandable: 8.5"×13" long bond paper, 0.5" margins, Arial 11pt, two-column MCQ choices when every choice is 48 characters or less (otherwise single column; override with **Force single column**). DOCX export includes a full Answer Key section on its own page. Export as **DOCX**, **JSON**, **GIFT**, **CSV**, or **TXT**, or use **Send to Manage a Bank** to load the current test bank directly into the bank editor.

**Generate Test** — Configure per-category question counts:
- Enter MCQ, T/F, and Matching counts for each category row (listed alphabetically).
- **Select All Available** — fills in the maximum available for every category.
- **Clear All** — resets all inputs to zero.
- **Smart Selection** — enter total target counts for MCQ, T/F, and Matching; the engine distributes them as evenly as possible across all categories, respecting each category's supply. Shortfalls are reported.
- **Answer Distribution Tolerance** — controls how evenly correct-answer letters are balanced (0 = exact balance, up to ±15).
- **Max Consecutive MC / T/F Answers** — prevents the same answer from repeating more than N times in a row.
- **Difficulty Ratio** — set the ⚪ Unset / 🟢 Easy / 🟡 Medium / 🔴 Hard mix. Unset questions are used as fallback when a tier runs short.
- **Exclude Already-Used Questions** — upload a previous test's JSON to prevent repeats.
- **Construct New Test** — picks a fresh set of questions from the bank. If a test was already generated, a confirmation popup warns that this replaces it (with a "don't ask again" option); the popup resets whenever a new bank is loaded or sent in.
- **Reshuffle Test** — generates another version (labeled A, B, C…) using the *same* questions as the last Construct New Test, with freshly shuffled order and choices. Disabled until a test exists.

**Preview Test and Answer Key** — shows the generated test with a collapsible answer key, once a test has been generated.

**Review Generation Report** — appears after generating a test:
- **Summary** — total questions requested, selected, and any shortfall.
- **Breakdown by Category** — per-category and per-type counts.
- **Breakdown by Difficulty** — per-tier counts; shows "No difficulty set." when all questions are Unset.
- **Shortfall** — red table of unfilled requests, or "No shortfall detected."
- **Unused Questions** — questions not selected for the test, with a count table by category and type. Export unused questions as JSON.

---

### Convert a File

Upload any supported file and convert it to any other format in one step.

- **Upload File** — drag-and-drop or browse for a `.json`, `.csv`, or `.txt` file (plain text or GIFT).
- **Convert** — detects the input format automatically and converts.
- **Download File** — preview the result as **JSON**, **CSV**, **GIFT**, or **TXT** using the format toggles. A single scroll button jumps to the far end of the output and relabels itself (↓ Bottom / ↑ Top) based on scroll position. Export using **Export as JSON / CSV / GIFT / TXT**, or use **Send to Manage a Bank** / **Send to Design a Test** to load the converted questions directly into another tab.

**Accepted inputs per output format:**

| Export as | Accepts |
|-----------|---------|
| JSON | GIFT `.txt`, `.csv`, plain numbered `.txt` |
| CSV | `.json`, GIFT `.txt`, plain numbered `.txt` |
| GIFT | `.json`, `.csv` |
| TXT | `.json`, `.csv`, GIFT `.txt` |

**Plain-text formatting rules** (for TXT → JSON/CSV):
- Number each question: `1. `, `2. `, … (numbers can repeat and don't need to be in order).
- Multiple choice: label choices `a.`–`e.` (up to 5; more than that is blocked — anything past `e.` isn't recognized). Prefix the correct choice with `=` or `*`; an error appears if none is marked correct. Fewer than 4 choices is allowed but shows a heads-up (some questions, like true/false-style ones, are legitimately 2-choice).
- True/False: put `=True` or `=False` on the line immediately below the question.
- Matching: write a premise line followed by `=Answer`; consecutive pairs are grouped into one matching question automatically.

Example:
```
1. What is the fundamental unit of life?
a. Gene
b. Meme
c. Atom
=d. Cell

2. The heart has four chambers.
=True

3. The study of plants
=Botany
```

---

### Merge JSONs

Combine multiple Coeus JSON question banks into a single file.

- **Upload Files** — drag-and-drop or Ctrl/Cmd-click to select multiple `.json` files.
- **Merge** — combines all files; a summary shows question counts per source file.
- **Download File** — set a filename and click **Download JSON**, or use **Send to Manage a Bank** / **Send to Design a Test** to load the merged bank directly into another tab.
- A warning appears if any merged question is missing a `correct` field. Duplicate questions are not automatically removed.

---

## File Structure

```
.
├── Coeus_Test_Writer.html   # UI/markup
├── js/                      # Application logic, loaded via sequential <script> tags
│   ├── state.js              # App version, changelog, shared state
│   ├── undo-stack.js          # Shared multi-step undo stack
│   ├── question-manager.js    # Bank CRUD, search/sort/filter
│   ├── export-formats.js      # JSON/CSV/GIFT/TXT conversion
│   ├── test-generator.js      # Test generation engine
│   ├── test-export.js         # DOCX/JSON/GIFT/CSV/TXT test export
│   ├── convert-merge.js       # Convert a File / Merge JSONs tabs
│   ├── helpers.js             # Shared utilities (escaping, stats, validation)
│   └── ui-init.js             # Event wiring, tab/UI initialization
├── scripts/
│   └── sync-changelog.js    # Regenerates the CHANGELOG object in js/state.js from Changelog.md
├── update.bat                # Windows double-click updater (git pull origin main)
├── update.sh                 # Mac/Linux double-click updater
├── Changelog.md              # Source of truth for the in-app changelog
├── LICENSE                   # GPL-3.0
└── README.md
```

## License

This project is licensed under the **GNU General Public License v3.0 (GPL-3.0)**. See [LICENSE](LICENSE) for details. This project and any derivatives must remain free and open source.
