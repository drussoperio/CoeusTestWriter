# Coeus Question Writer

A single-file, browser-based toolkit for creating, managing, and exporting exam questions. No installation, backend, or account required — open the HTML file and it runs entirely client-side.

## Features

The app is organized into tabs:

- **Question Manager** — Load, edit, add, and organize a bank of questions stored as JSON.
- **Test Generator** — Build randomized/versioned tests from a question bank and export them (e.g. PDF/DOCX).
- **TXT → JSON** — Convert tab-delimited `.txt` question files into the app's JSON format.
- **JSON → TXT** — Export a JSON question bank back to plain/tab-delimited text.
- **Plain Text → JSON** — Paste loosely formatted question text (numbered questions, lettered choices, `=`/`*` for correct answers, True/False, or matching pairs) and convert it into structured JSON.
- **Text → GIFT** — Convert plain text or JSON questions into [Moodle GIFT format](https://docs.moodle.org/en/GIFT_format), including multiple choice, true/false, and matching questions.
- **JSON Merger** — Combine multiple JSON question banks into one file.

## Getting Started

1. Download `Test_Generator.html` and `main.js` and keep them in the same folder.
2. Open `Test_Generator.html` in a modern browser (Chrome, Firefox, Edge).
3. Use the tabs at the top to switch between tools.

No server, build step, or internet connection is required after the initial page load (aside from any CDN-hosted libraries the page references).

## Input Format Reference (Plain Text)

When pasting plain text for conversion (Plain Text → JSON or Text → GIFT), use:

**Multiple choice**
```
1. What is the capital of France?
a. London
=b. Paris
c. Berlin
d. Madrid
```

**True/False**
```
1. The sky is blue.
=true
```

**Matching**
```
1. Canada
=Ottawa
2. Italy
=Rome
```
Consecutive matching entries are grouped into a single matching question on export.

Mark the correct choice/answer with `=` (or `*`).

## File Structure

```
.
├── Test_Generator.html   # UI/markup
├── main.js               # Application logic
├── LICENSE               # AGPL-3.0
└── README.md
```

## License

This project is licensed under the **GNU Affero General Public License v3.0 (AGPL-3.0)**. See [LICENSE](LICENSE) for details. This project and any derivatives must remain free and open source, including when run as a network service.
