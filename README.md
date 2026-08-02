# Coeus Test Writer

A single-file, browser-based toolkit for writing, organizing, and creating exam questions. No installation, backend, or account required — open the HTML file and it runs entirely client-side.

## Features

- **Question bank management** — add, search, sort, filter, bulk-rename, and bulk-delete questions in a JSON-based bank.
- **Randomized test generation** — pull questions per category and type, with answer-distribution balancing and consecutive-answer limits.
- **Balanced Pick Across Categories** — auto-split target question counts evenly across every category.
- **Versioned exports** — export generated tests as DOCX, JSON, GIFT (Moodle), CSV, or TXT, each auto-labeled with a version letter.
- **Format converters** — convert between JSON, CSV, GIFT (Moodle), and plain numbered text, via file upload or pasted text.
- **Bank merging** — combine multiple JSON question banks into one file.
- **Local-only storage** — banks and dark-mode preference persist via browser `localStorage`; nothing leaves the browser.

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

Then open `Coeus_Test_Writer.html` directly in your browser.

No server, build step, or internet connection is required after the initial page load, aside from CDN libraries (jsPDF, docx.js, Prism) referenced by the page.

## Updating

### From a Release

1. Go to the [Releases](../../releases) page and download the latest `.zip`.
2. Extract and replace your existing `Coeus_Test_Writer.html` and `main.js` with the new versions.
3. Your saved question bank and preferences in `localStorage` are preserved automatically.

### With Git

```bash
git pull origin main
```

Then reload `Coeus_Test_Writer.html` in your browser.

## Coeus JSON Question Format

Most tabs read/write a common JSON array format:

```json
[
  {
    "question": "What is the capital of France?",
    "category": "Geography",
    "type": "multiple_choice",
    "correct": "Paris",
    "choices": ["London", "Paris", "Berlin", "Madrid"]
  }
]
```

- `type` is one of `multiple_choice`, `true_false`, or `matching`.
- For `true_false`, `correct` is `"True"` or `"False"` (choices omitted).
- For `matching`, each premise is its own question object (`choices` is `[null, null, null, null]`), not a grouped pairs array.

## Tabs

### Edit a Bank

Central hub for building and curating a question bank.

- **Input** — Load an existing JSON bank via drag-and-drop or file picker. **Clear Bank** wipes the current in-memory bank.
- **Export Questions** — Set a filename, then export the current bank as JSON, CSV, or Plain Text.
- **Manage Saved Data** — **Clear Saved Questions** removes any newly added questions.
- **Add Questions** (inner tab) — Form to add one question at a time:
  - Set **Category** and **Type** (Multiple Choice / True-False / Matching).
  - Multiple Choice: enter choices A–E; the first choice is always the correct answer.
  - True/False: select True or False.
  - Matching: use **+ Add Premise & Answer** to add paired rows.
  - Click **Add Question to Bank** to append it to the loaded bank.
- **Bank Editor** (inner tab) — Manage the loaded bank:
  - **Search** by question text, answers, or category.
  - **Sort** by Default (As Loaded), By Difficulty, or By Category.
  - **Filter** to show All Questions, MCQ, True/False, Matching, or a specific category. Each option shows its question count.
  - **Compact/Comfortable** toggle (▤/☰) controls card density; preference is saved.
  - **Select All Visible** selects everything matching the current search/filter.
  - **Change Category** bulk-renames the category of selected questions.
  - **Delete Selected** removes selected questions.

### Design a Test

Builds randomized, versioned tests from a loaded JSON bank.

- **Input** — Load a JSON bank (drag-and-drop or browse). A warning appears if any questions are missing a `correct` field.
- **Generate Test**
  - Per-category inputs let you choose how many MCQ, True/False, Matching questions to pull from each category.
    - **Select All Available** fills these in with every remaining available question per category.
    - **Clear All** resets all inputs to 0.
    - **Balanced Pick Across Categories** — enter target totals for MCQ, T/F, and Matching, and it distributes those totals as evenly as possible across every category, respecting each category's available supply.
  - **Answer Distribution Tolerance** — how evenly the correct-answer letters/T-F values are balanced (0 = exact, up to ±15).
  - **Max Consecutive MC Answers** / **Max Consecutive T/F Answers** — caps how many times the same answer can repeat in a row.
  - **Exclude Already-Used Questions** — upload a JSON file of previously used questions to prevent repeats across test versions.
- **Output**
  - Set a **Filename**; a version letter is appended automatically (e.g. `test_A.docx`).
  - **DOCX format details** (expandable): 8.5"×13" paper size, 0.5" margins, Arial 11pt, MCQ choices auto-set in two columns when they fit. **Force single column** overrides this.
  - Export as **DOCX**, **JSON**, **GIFT**, **CSV**, or **TXT**.
  - Preview pane shows the generated test with a collapsible **Answer Key**.
- **Generation Report** — Detailed breakdown of how the test was assembled: summary, breakdown by category and difficulty, shortfall warnings, and unused questions.

### Convert to JSON

Converts a `.txt` or `.csv` file, or pasted plain numbered text, into the Coeus JSON format.

- Choose input mode: **Upload File** or **Paste Text**.
- Plain-text formatting rules:
  - Number each question (`1. `, `2. `, ...).
  - **Multiple choice**: label choices `a.`–`e.`. Prefix the correct choice with `=` or `*`.
  - **True/False**: put `=True` or `=False` on the line below the question.
  - **Matching**: consecutive premise/answer pairs are grouped automatically.
- Click **Convert**, review the JSON output, set a filename, and **Download JSON**.

Example input:
```
1. What is the fundamental unit of life?
a. Gene
b. Meme
c. Atom
=d. Cell

2. The heart has four chambers.
=True

3. Study of life
=Biology
```

### Convert to CSV

Converts a Coeus JSON file, GIFT `.txt` file, or plain text into CSV for bulk-editing in Excel or Google Sheets.

- Choose input mode: **Upload File** or **Paste Text**.
- Click **Convert**, review the output, then **Download CSV**.

### Convert to GIFT

Converts questions into [Moodle GIFT format](https://docs.moodle.org/en/GIFT_format) for import via *Question bank → Import → GIFT format*.

- Choose input mode: **Upload File** (`.json`, `.csv`) or **Paste Text**.
- Supports multiple choice, true/false, and matching questions.
- Click **Convert**, then **Download TXT** (exported filename gets a `_gift` suffix).

### Convert to Text

Converts a Coeus JSON, CSV, or `.txt` file into plain numbered text.

- Upload a `.json`, `.csv`, or `.txt` file.
- Click **Convert**, review the output, then **Download TXT**.

### Merge JSONs

Combines multiple Coeus JSON question banks into one file.

- Select multiple `.json` files at once (drag-and-drop or Ctrl/Cmd-click).
- Click **Merge** to combine them; a summary shows counts per source file.
- Set an output filename and click **Merge & Download**.

## File Structure

```
.
├── Coeus_Test_Writer.html   # UI/markup
├── main.js                  # Application logic
├── LICENSE                  # AGPL-3.0
└── README.md
```

## License

This project is licensed under the **GNU Affero General Public License v3.0 (AGPL-3.0)**. See [LICENSE](LICENSE) for details. This project and any derivatives must remain free and open source, including when run as a network service.
