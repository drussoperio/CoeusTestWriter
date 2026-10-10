// ========================================
// ANSWER KEY CONSISTENCY CHECK (hidden feature — Alt+9)
// ========================================
//
// Checks a DOCX export's Answer Key against its own test body, catching
// the kind of mismatch a manual Word edit (e.g. repositioning a question
// to make room for an image) can introduce. Multiple choice questions
// only — True/False prints no per-question choice list in the body, and
// Matching uses a Column A/B table, so neither has the same "letter next
// to text" structure this check relies on.
//
// Word's own auto-numbering (used for question numbers in the exported
// DOCX) is not literal text and does not survive mammoth's text
// extraction — so this works off document ORDER, not printed numbers.
// Choice letters ("A. ...") and Answer Key lines ("1. A (...)") are both
// literal text in the export and do survive extraction.

async function extractDocxRawText(file) {
    const arrayBuffer = await file.arrayBuffer();
    const result = await window.mammoth.extractRawText({ arrayBuffer });
    return result.value;
}

// Returns the slice of rawText between the "Multiple Choice" section
// header and the next section header (True or False / Matching Type),
// or end-of-text if neither follows.
function extractMcqSectionText(rawText) {
    const lines = rawText.split('\n');
    const startIdx = lines.findIndex(l => /multiple choice/i.test(l));
    if (startIdx === -1) return '';
    const endIdx = lines.findIndex((l, i) =>
        i > startIdx && (/true or false/i.test(l) || /matching type/i.test(l))
    );
    return lines.slice(startIdx + 1, endIdx === -1 ? lines.length : endIdx).join('\n');
}

// Parses the MCQ section into ordered question blocks: [{ choices: [{letter, text}] }].
// A line matching /^[A-E]\.\s+/ is a choice; any other non-blank line that
// follows a block already holding choices starts a new question block.
function parseMcqSectionFromDocxText(rawText) {
    const section = extractMcqSectionText(rawText);
    const lines = section.split('\n').map(l => l.trim()).filter(Boolean);
    const blocks = [];
    let current = null;

    lines.forEach(line => {
        const choiceMatch = line.match(/^([A-E])\.\s+(.*)$/);
        if (choiceMatch) {
            if (!current) current = { choices: [] };
            current.choices.push({ letter: choiceMatch[1], text: choiceMatch[2].trim() });
        } else {
            if (current && current.choices.length > 0) {
                blocks.push(current);
                current = null;
            }
            // non-choice line with no open block (or an open block with no
            // choices yet) is premise text — ignored, we only need choices
        }
    });
    if (current && current.choices.length > 0) blocks.push(current);
    return blocks;
}

// Parses the Answer Key section: lines matching "N. LETTER (text)".
// Returns ordered [{ num, letter, text }, ...].
function parseAnswerKeySection(rawText) {
    const akIdx = rawText.search(/answer key/i);
    const akText = akIdx === -1 ? rawText : rawText.slice(akIdx);
    const lines = akText.split('\n').map(l => l.trim()).filter(Boolean);
    const entries = [];
    lines.forEach(line => {
        const m = line.match(/^(\d+)\.\s+([A-E])\s*\(([^)]*)\)/);
        if (m) entries.push({ num: parseInt(m[1], 10), letter: m[2], text: m[3].trim() });
    });
    return entries;
}

// Core check. Pairs Answer Key entry i (by position) with MCQ question
// block i — not by printed number, since question numbers don't survive
// extraction (see file header). Entries beyond the MCQ block count are
// T/F or Matching answers, always appended last in this app's generation
// order, and are reported as skipped rather than silently ignored.
function checkAnswerKeyConsistency(rawText) {
    const mcqBlocks = parseMcqSectionFromDocxText(rawText);
    const akEntries = parseAnswerKeySection(rawText);

    const mismatches = [];
    const checkedCount = Math.min(mcqBlocks.length, akEntries.length);

    for (let i = 0; i < checkedCount; i++) {
        const block = mcqBlocks[i];
        const entry = akEntries[i];
        const matchingChoice = block.choices.find(c => c.letter === entry.letter);
        if (!matchingChoice) {
            mismatches.push({
                position: i + 1,
                claimedLetter: entry.letter,
                claimedText: entry.text,
                foundText: null
            });
        } else if (matchingChoice.text.trim() !== entry.text.trim()) {
            mismatches.push({
                position: i + 1,
                claimedLetter: entry.letter,
                claimedText: entry.text,
                foundText: matchingChoice.text
            });
        }
    }

    return {
        checked: checkedCount,
        mismatches,
        skipped: Math.max(0, akEntries.length - mcqBlocks.length)
    };
}

// ========================================
// DOCX → JSON CONVERTER (Convert a File, MCQ only)
// ========================================
//
// Reuses the extraction/parsing building blocks above to reconstruct MCQ
// question objects from a Design a Test DOCX export. True/False and
// Matching questions are skipped (see file header for why) and reported
// via skippedCount rather than silently dropped.

// Matches each [A-E]. <text> run within a line, 1 or 2 per line depending
// on whether the DOCX used 1-column or 2-column choice layout (2-column
// packs two choices into one paragraph, tab-separated — see
// buildChoiceParas in js/test-export.js). Splitting on this regex handles
// both without needing to know which layout was used.
const CHOICE_RUN_RE = /([A-E])\.\s+([^\t]+?)(?=\t[A-E]\.|\t*$)/g;

function extractChoiceRunsFromLine(line) {
    return [...line.matchAll(CHOICE_RUN_RE)].map(m => ({ letter: m[1], text: m[2].trim() }));
}

// Like parseMcqSectionFromDocxText, but also keeps each block's premise
// (question) text and uses extractChoiceRunsFromLine so it handles both
// 1-column and 2-column choice layouts.
function parseMcqQuestionsFromDocxText(rawText) {
    const section = extractMcqSectionText(rawText);
    const lines = section.split('\n').map(l => l.trim()).filter(Boolean);

    // Non-choice lines preceding a block's first choice line accumulate as
    // that block's premise (question) text.
    const finalBlocks = [];
    let pendingPremise = [];
    let blockIdx = 0;
    let inBlock = false;
    lines.forEach(line => {
        const runs = extractChoiceRunsFromLine(line);
        if (runs.length > 0) {
            if (!inBlock) {
                finalBlocks.push({ question: pendingPremise.join(' ').trim(), choices: [] });
                pendingPremise = [];
                inBlock = true;
            }
            finalBlocks[finalBlocks.length - 1].choices.push(...runs);
        } else {
            inBlock = false;
            pendingPremise.push(line);
        }
    });

    return finalBlocks.filter(b => b.choices.length > 0);
}

// Parses the Category Key section: lines matching "N. CategoryName" after
// a "Category Key" header. Returns [] when the section doesn't exist
// (DOCX exported before this feature was added) so callers can fall back
// gracefully instead of erroring.
function parseCategoryKeySection(rawText) {
    const ckIdx = rawText.search(/category key/i);
    if (ckIdx === -1) return [];
    const ckText = rawText.slice(ckIdx);
    const lines = ckText.split('\n').map(l => l.trim()).filter(Boolean);
    const entries = [];
    lines.forEach(line => {
        const m = line.match(/^(\d+)\.\s+(.+)$/);
        if (m) entries.push({ num: parseInt(m[1], 10), category: m[2].trim() });
    });
    return entries;
}

// Builds MCQ question objects from a DOCX export's raw text. Pairs MCQ
// block i with Answer Key entry i and Category Key entry i by position
// (Word's own numbering doesn't survive extraction — see file header).
function buildMcqJsonFromDocx(rawText) {
    const blocks = parseMcqQuestionsFromDocxText(rawText);
    const answerKeyEntries = parseAnswerKeySection(rawText);
    const categoryEntries = parseCategoryKeySection(rawText);

    const questions = blocks.map((block, i) => {
        const entry = answerKeyEntries[i];
        const sortedChoices = [...block.choices].sort((a, b) => a.letter.localeCompare(b.letter));
        return {
            subject: '',
            category: (categoryEntries[i] && categoryEntries[i].category) || 'Uncategorized',
            difficulty: 'unset',
            type: 'multiple_choice',
            question: block.question,
            choices: sortedChoices.map(c => c.text),
            correct: entry ? entry.text : (sortedChoices[0] ? sortedChoices[0].text : '')
        };
    });

    // True/False always prints "True"/"False" as its Answer Key text
    // (js/test-export.js's tfs loop), and always comes right after MCQ and
    // before Matching in this app's own generation order — so consume
    // consecutive True/False entries positionally, then stop (whatever
    // follows is Matching, which this converter can't recover; see
    // js/answer-key-check.js file header).
    let tfRecoveredCount = 0;
    for (let i = blocks.length; i < answerKeyEntries.length; i++) {
        const entry = answerKeyEntries[i];
        if (entry.text !== 'True' && entry.text !== 'False') break;
        questions.push({
            subject: '',
            category: (categoryEntries[i] && categoryEntries[i].category) || 'Uncategorized',
            difficulty: 'unset',
            type: 'true_false',
            question: '',
            choices: ['True', 'False'],
            correct: entry.text
        });
        tfRecoveredCount++;
    }

    const skippedCount = Math.max(0, answerKeyEntries.length - blocks.length - tfRecoveredCount);
    return { questions, skippedCount };
}

function renderAnswerKeyCheckResults(result) {
    const container = document.getElementById('answerKeyCheckResults');
    if (!container) return;

    let html = '';
    if (result.mismatches.length === 0) {
        html += `<p class="text-green-600">✅ ${result.checked}/${result.checked} MCQ answer(s) consistent.</p>`;
    } else {
        html += `<p class="text-red-600 font-semibold">⚠️ ${result.mismatches.length} mismatch(es) out of ${result.checked} MCQ answer(s) checked:</p>`;
        html += '<ul class="list-disc list-inside mt-1 text-xs">';
        result.mismatches.forEach(m => {
            const found = m.foundText === null
                ? `no choice ${escapeHtml(m.claimedLetter)} found in that question`
                : `${escapeHtml(m.claimedLetter)} in the test body reads "${escapeHtml(m.foundText)}"`;
            html += `<li>Position ${m.position}: Answer Key says ${escapeHtml(m.claimedLetter)} ("${escapeHtml(m.claimedText)}"), but ${found}</li>`;
        });
        html += '</ul>';
    }
    if (result.skipped > 0) {
        html += `<p class="text-xs mt-2" style="color:var(--text-muted);">${result.skipped} True/False or Matching answer(s) not checked.</p>`;
    }
    container.innerHTML = html;
}
