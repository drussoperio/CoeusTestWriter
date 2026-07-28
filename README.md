# Coeus Question Writer

A single-file, browser-based toolkit for creating, managing, and exporting exam questions. No installation, backend, or account required — open the HTML file and it runs entirely client-side.

## Getting Started

1. Download `Coeus_Question_Writer.html` and `main.js` and keep them in the same folder.
2. Open `Coeus_Question_Writer.html` in a modern browser (Chrome, Firefox, Edge).
3. Use the tabs at the top to switch between tools.

No server, build step, or internet connection is required after the initial page load, aside from CDN libraries (jsPDF, docx.js, Prism) referenced by the page.

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
- For `matching`, pairs are represented as premises/answers rather than `choices`.

## Tabs

### Question Manager

Central hub for building and curating a question bank.

- **Input** — Load an existing JSON bank via drag-and-drop or file picker. **Clear Bank** wipes the current in-memory bank.
- **Export Questions** — Set a filename, then export the current bank as JSON, tab-delimited TXT, or Plain Text.
- **Manage Saved Data** — **Clear Saved Tests** removes any locally saved generated-test history.
- **Add Questions** (inner tab) — Form to add one question at a time:
  - Set **Category** and **Type** (Multiple Choice / True-False / Matching).
  - Multiple Choice: enter choices A–D and mark the correct one with the radio button.
  - True/False: select True or False.
  - Matching: use **+ Add Premise & Answer** to add paired rows.
  - Click **Add Question to Bank** to append it to the loaded bank.
- **Bank Editor** (inner tab) — Manage the loaded bank:
  - **Search** by question text or category.
  - **Sort** by Category (A–Z), Type (MCQ first), or As Loaded.
  - **Filter** to show only MCQ, True/False, or Matching questions.
  - **Select All Visible** selects everything matching the current search/filter.
  - **Rename Selected** bulk-renames the category of selected questions.
  - **Delete Selected** removes selected questions (button shows live count).

### Test Generator

Builds randomized, versioned tests from a loaded JSON bank.

- **Input** — Load a JSON bank (drag-and-drop or browse). A warning appears if any questions are missing a `correct` field.
- **Generate Test**
  - Per-category inputs let you choose how many MCQ, True/False, Matching questions to pull from each category (**Select All Available** fills these in automatically; **Clear All** resets them).
  - **Randomize Questions and Answers** shuffles question order and choice order.
  - **Answer Distribution Tolerance** — how evenly the correct-answer letters/T-F values are balanced (0 = exact, up to ±15).
  - **Max Consecutive MC Answers** / **Max Consecutive T/F Answers** — caps how many times the same answer can repeat in a row (1 = strict alternation). Very tight settings combined with skewed distributions can trigger a feasibility warning.
  - **Exclude Already-Used Questions** — upload a JSON file of previously used questions to prevent repeats across test versions.
- **Output**
  - Set a **Filename**; a version letter is appended automatically (e.g. `test_A.pdf`).
  - **DOCX format details** (expandable): 8.5"×13" long bond paper, 0.5" margins, Arial 11pt, MCQ choices auto-set in two columns when they fit (~3.25"), continuous numbering across sections. **Force single column** overrides the auto two-column layout.
  - Export as **TXT**, **PDF**, **DOCX**, or **JSON**.
  - Preview pane shows the generated test with a collapsible **Answer Key**.
- **Unused Questions** — Shows questions not selected for the test; export them as JSON or preview inline.
- **Generation Report** — Detailed breakdown of how the test was assembled (counts per category, distribution results, any warnings).

### TXT → JSON

Converts a tab-delimited `.txt` file into Coeus JSON. The file must have exactly 8 tab-separated columns, in this order:

```
Question | Category | Type | Correct | Option 1 | Option 2 | Option 3 | Option 4
```

Load the file, click **Convert**, set an output filename, and **Download JSON**. A warning is shown if any row is missing a correct answer.

### JSON → TXT

Converts a Coeus JSON file back into the same 8-column tab-delimited `.txt` layout — useful for bulk-editing in Excel or Google Sheets before re-importing. Load JSON, **Convert**, then **Download TXT**.

### Plain Text → JSON

Paste loosely formatted question text (e.g. copied from a Word doc or PDF) and convert it into structured JSON.

- Set a default **Subject** and **Category** to apply to all parsed questions.
- Formatting rules:
  - Number each question (`1. `, `2. `, ...). A question can only be recognized if it has a number, period, and space before the question itself. Numbers can be repeated; they also do not need to be arranged numerically.
  - **Multiple choice**: label choices with letters `a. `–`e. `. A choice can only be recognized if it has a letter, period, and space before the choice itself. Similar to the question format, letter choices can be repeated and do not need to be arranged. MCQ only accepts four to five choices. Prefix the correct choice with `=` or `*`. An error would appear if no choice has been marked correct.
  - **True/False**: put `=True` or `=False` on the line below the question.
  - **Matching**: consecutive premise/answer pairs (premise line, then `=Answer` line) are grouped into one matching question automatically.
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

### Text → GIFT

Converts questions into [Moodle GIFT format](https://docs.moodle.org/en/GIFT_format) for import via *Question bank → Import → GIFT format*.

- Choose input mode: **Paste JSON** (a Coeus JSON array) or **Paste Plain Text** (same numbered/lettered format as the Plain Text → JSON tab, with Subject/Category fields).
- Supports multiple choice, true/false, and matching questions.
- Click **Convert**, then **Download TXT** (GIFT files are plain text).

### JSON Merger

Combines multiple Coeus JSON question banks into one file.

- Select multiple `.json` files at once (drag-and-drop or Ctrl/Cmd-click in the file picker).
- Click **Merge** to combine them; a summary shows counts per source file.
- Set an output filename and click **Merge & Download**.
- A warning is shown if any merged question is missing a correct answer.

## File Structure

```
.
├── Coeus_Question_Writer.html   # UI/markup
├── main.js                      # Application logic
├── LICENSE                      # AGPL-3.0
└── README.md
```

## License

This project is licensed under the **GNU Affero General Public License v3.0 (AGPL-3.0)**. See [LICENSE](LICENSE) for details. This project and any derivatives must remain free and open source, including when run as a network service.
