// ========================================
// HELPER FUNCTIONS, SEND TO BANK HELPER
// ========================================

// Validates a composed multiple-choice question's correct-answer input.
// Returns an error string to BLOCK on, or null if valid. Leaving this
// blank used to silently promote the first non-blank wrong answer to
// "correct" instead, which is always wrong, so this stays blocking.
function mcqCorrectAnswerError(correctVal) {
    if (!correctVal) return 'Please enter a correct answer.';
    return null;
}

// Non-blocking heads-up when a composed MCQ has fewer than 4 choices.
// Some questions are legitimately 2-choice (e.g. true/false-style
// questions saved as multiple_choice), so this never blocks adding —
// it's surfaced again, non-urgently, in the Bank Stats validation report.
function mcqChoiceCountWarning(correctVal, wrongVals) {
    const total = (correctVal ? 1 : 0) + wrongVals.length;
    if (total < 4) return `Only ${total} choice(s) — most MCQ have 4. This is fine for a true/false-style question; otherwise double-check.`;
    return null;
}

// Helper: reset a file-input's value and its drop-zone's displayed text back to
// the default prompt. Used after a Clear Bank click (always, even if the bank was
// already empty from a failed load) and after a failed load itself, so a stale
// filename never lingers in the drop zone.
function resetDropZoneDisplay(fileInput) {
    if (!fileInput) return;
    fileInput.value = '';
    const dropZone = fileInput.closest('.drop-zone');
    if (!dropZone) return;
    const p = dropZone.querySelector('p');
    if (p) {
        p.className = 'text-sm text-gray-600';
        p.textContent = 'Drag & drop file or click to browse';
    }
}

// Helper: Find questions that don't have a valid correct answer — either
// nothing marked, or (for multiple choice) a correct answer that doesn't
// match any of the choices. The latter happens easily when a bank's JSON
// is hand-edited outside the app (e.g. in Notepad++) and a choice gets
// edited without updating "correct" to match.
function getQuestionsMissingCorrectAnswer(questions) {
    return (questions || []).filter(q => {
        const correct = (q.correct ?? '').toString().trim();
        if (!correct) return true;
        if (q.type === 'true_false') {
            return !/^true$|^false$/i.test(correct);
        }
        if (q.type === 'multiple_choice') {
            const choices = (q.choices || []).map(c => (c || '').toString().trim()).filter(Boolean);
            if (choices.length === 0) return false; // flagged separately as too-few-choices
            return !choices.some(c => c.toLowerCase() === correct.toLowerCase());
        }
        return false;
    });
}

// Helper: Render (or clear) a warning banner listing questions missing a correct answer
// ========================================
// SEND TO BANK HELPER
// ========================================

// Marks a tab's Upload File drop-zone as "loaded" (green, showing a label)
// without a real File object — used when a bank arrives via Send to X
// instead of an actual file pick/drop.
function setDropZoneLoaded(fileInput, label) {
    if (!fileInput) return;
    const dropZone = fileInput.closest('.drop-zone');
    if (!dropZone) return;
    const p = dropZone.querySelector('p');
    if (p) {
        p.className = 'text-sm text-green-700 font-medium';
        p.textContent = label;
    }
}

function sendToBank(questions, target) {
    if (!questions || questions.length === 0) {
        showToast('⚠️ No questions to send.', 'warning');
        return;
    }
    // Strip display-only fields
    const clean = questions.map(q => ({
        question:   q.question   || '',
        category:   q.category   || 'Uncategorized',
        type:       q.type       || 'multiple_choice',
        difficulty: q.difficulty || 'unset',
        correct:    q.correct    || '',
        choices:    q.choices    || null,
        ...(q.subject ? { subject: q.subject } : {})
    }));

    if (target === 'manage') {
        questionBank = clean;
        assignQuestionUids(questionBank);
        addedQuestions = [];
        saveQBankToStorage();
        saveAddedQuestionsToStorage();
        clearQuestionManagerState();
        updateQuestionManagerCategories();
        renderQuestionManagerList();
        setDropZoneLoaded(document.getElementById('loadQuestionBank'), `${clean.length} question(s) loaded`);
        showToast(`✅ Sent ${clean.length} question(s) to Manage a Bank.`, 'success');
        document.getElementById('questionManagerTab')?.click();
    } else {
        testBank = clean;
        saveTestBankToStorage();
        updateCategoryInputs();
        const bankStatus = document.getElementById('bankStatus');
        if (bankStatus) bankStatus.innerHTML = `<div class="text-green-600">Bank loaded (${clean.length} questions)</div>`;
        setDropZoneLoaded(document.getElementById('loadTestBank'), `${clean.length} question(s) loaded`);
        showToast(`✅ Sent ${clean.length} question(s) to Design a Test.`, 'success');
        document.getElementById('testGeneratorTab')?.click();
    }
}

function renderMissingCorrectWarning(containerId, questions) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const missing = getQuestionsMissingCorrectAnswer(questions);
    if (missing.length === 0) {
        container.classList.add('hidden');
        container.innerHTML = '';
        return;
    }

    const preview = missing.slice(0, 5).map(q => {
        const text = (q.question || '(untitled question)').toString().trim();
        const truncated = text.length > 60 ? text.slice(0, 60) + '…' : text;
        return `"${escapeHtml(truncated)}"`;
    }).join(', ');
    const more = missing.length > 5 ? ` and ${missing.length - 5} more` : '';

    container.classList.remove('hidden');
    container.innerHTML = `⚠️ ${missing.length} of ${(questions || []).length} question(s) have no correct answer marked, or a correct answer that doesn't match any of their choices: ${preview}${more}.`;
}

// ========================================
// BANK VALIDATION REPORT
// ========================================

// Groups questions whose normalized text matches — case/whitespace-insensitive.
// Returns an array of groups (each an array of 2+ questions), duplicates only.
function findDuplicateQuestions(questions) {
    const groups = new Map();
    (questions || []).forEach(q => {
        const key = (q.question || '').toString().trim().toLowerCase().replace(/\s+/g, ' ');
        if (!key) return; // empty question text is reported separately
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(q);
    });
    return [...groups.values()].filter(group => group.length > 1);
}

// Runs every bank-health check and returns categorized results.
function validateQuestionBank(questions) {
    const list = questions || [];

    const missingCorrect = getQuestionsMissingCorrectAnswer(list);
    const duplicateGroups = findDuplicateQuestions(list);
    const emptyQuestion = list.filter(q => !(q.question || '').toString().trim());

    const mcqIssues = list.filter(q => {
        if (q.type !== 'multiple_choice') return false;
        const choices = (q.choices || []).map(c => (c || '').toString().trim()).filter(Boolean);
        if (choices.length < 2) return true;
        const uniqueChoices = new Set(choices.map(c => c.toLowerCase()));
        return uniqueChoices.size !== choices.length;
    });

    // Minor/informational only — 2-3 choices is valid (e.g. a true/false-style
    // question saved as multiple_choice), so this is never a blocking error,
    // just something worth a quick look.
    const mcqShortChoices = list.filter(q => {
        if (q.type !== 'multiple_choice') return false;
        const choices = (q.choices || []).map(c => (c || '').toString().trim()).filter(Boolean);
        return choices.length >= 2 && choices.length < 4;
    });

    const matchingIssues = list.filter(q =>
        q.type === 'matching' &&
        (!(q.question || '').toString().trim() || !(q.correct || '').toString().trim())
    );

    return { missingCorrect, duplicateGroups, emptyQuestion, mcqIssues, mcqShortChoices, matchingIssues };
}

function bankValidationIssueCount(report) {
    return report.missingCorrect.length
        + report.duplicateGroups.reduce((sum, g) => sum + g.length, 0)
        + report.emptyQuestion.length
        + report.mcqIssues.length
        + report.mcqShortChoices.length
        + report.matchingIssues.length;
}

function questionPreviewLabel(q) {
    const text = (q.question || '(untitled question)').toString().trim() || '(empty question)';
    const truncated = text.length > 70 ? text.slice(0, 70) + '…' : text;
    return `[${escapeHtml(q.category || 'Uncategorized')}] ${escapeHtml(truncated)}`;
}

// Same label as questionPreviewLabel, but clickable — jumps to and
// highlights the question in Manage a Bank's Edit Bank list.
function questionJumpLink(q) {
    if (q.__uid == null) return questionPreviewLabel(q);
    return `<button type="button" class="text-left underline decoration-dotted hover:text-blue-700" style="color:inherit;" onclick="jumpToQuestionInBank(${q.__uid})">${questionPreviewLabel(q)}</button>`;
}

function renderValidationDetail(title, items, formatItem) {
    if (!items.length) return '';
    const rows = items.map(item => `<li class="py-0.5">${formatItem(item)}</li>`).join('');
    return `
        <details class="mt-2">
            <summary class="cursor-pointer text-sm font-medium" style="color:var(--text);">${escapeHtml(title)} (${items.length})</summary>
            <ul class="list-disc list-inside text-xs mt-1 ml-2" style="color:var(--text-muted);">${rows}</ul>
        </details>`;
}

// Renders (or clears) the full bank health/validation panel into containerId.
function renderBankValidationReport(containerId, questions) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const section = document.getElementById('qm-validation-section');

    const list = questions || [];
    if (list.length === 0) {
        container.innerHTML = '';
        section?.classList.add('hidden');
        return;
    }
    section?.classList.remove('hidden');

    const report = validateQuestionBank(list);
    const totalIssues = bankValidationIssueCount(report);

    if (totalIssues === 0) {
        container.innerHTML = `<div class="p-3 rounded border border-green-200 bg-green-50 text-sm text-green-700">✅ No issues found in ${list.length} question(s).</div>`;
        return;
    }

    const majorIssueCount = totalIssues - report.mcqShortChoices.length;
    let html = '';

    if (majorIssueCount > 0) {
        html += `<div class="p-3 rounded border border-amber-200 bg-amber-50">
            <p class="text-sm font-semibold text-amber-800">⚠️ ${majorIssueCount} issue(s) found across ${list.length} question(s):</p>`;

        html += renderValidationDetail('Missing or invalid correct answer', report.missingCorrect, q => questionJumpLink(q));

        html += renderValidationDetail('Duplicate questions', report.duplicateGroups, group =>
            `${group.length}× "${escapeHtml((group[0].question || '').toString().trim().slice(0, 70))}" — categories: ${escapeHtml([...new Set(group.map(q => q.category || 'Uncategorized'))].join(', '))}`
        );

        html += renderValidationDetail('Empty question text', report.emptyQuestion, q => `[${escapeHtml(q.category || 'Uncategorized')}] (no question text)`);

        html += renderValidationDetail('Multiple choice with too few or duplicate choices', report.mcqIssues, q => questionPreviewLabel(q));

        html += renderValidationDetail('Matching pair missing premise or answer', report.matchingIssues, q => questionPreviewLabel(q));

        html += `</div>`;
    }

    if (report.mcqShortChoices.length > 0) {
        html += `<div class="p-3 rounded border border-blue-200 bg-blue-50 ${majorIssueCount > 0 ? 'mt-2' : ''}">
            <p class="text-sm font-semibold text-blue-800">ℹ️ ${report.mcqShortChoices.length} multiple choice question(s) have fewer than 4 choices — often fine (e.g. true/false-style), but worth a quick check:</p>
            ${renderValidationDetail('Fewer than 4 choices', report.mcqShortChoices, q => questionJumpLink(q))}
        </div>`;
    }

    container.innerHTML = html;
}

// ========================================
// BANK STATS SIDEBAR
// ========================================

const BANK_STATS_TYPE_LABELS = { multiple_choice: 'Multiple Choice', true_false: 'True/False', matching: 'Matching' };
const BANK_STATS_DIFFICULTY_ORDER = ['easy', 'medium', 'hard', 'unset'];
const BANK_STATS_DIFFICULTY_LABELS = { easy: 'Easy', medium: 'Medium', hard: 'Hard', unset: 'Unset' };
const BANK_STATS_MAX_CATEGORIES = 8;

function statsCountBy(list, keyFn) {
    const counts = new Map();
    list.forEach(q => {
        const key = keyFn(q);
        counts.set(key, (counts.get(key) || 0) + 1);
    });
    return counts;
}

function statsMiniTable(rows) {
    return `<table class="w-full text-xs">
        ${rows.map(([label, count]) => `
            <tr>
                <td class="py-0.5" style="color:var(--text);">${label}</td>
                <td class="py-0.5 text-right font-medium" style="color:var(--text);">${count}</td>
            </tr>`).join('')}
    </table>`;
}

// Renders (or clears) the bank stats sidebar into containerId.
function renderBankStats(containerId, questions) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const list = questions || [];
    if (list.length === 0) {
        container.innerHTML = `<div class="p-3 rounded border border-gray-200 bg-gray-50 text-sm text-gray-500">Load a bank to see stats.</div>`;
        return;
    }

    const byType = statsCountBy(list, q => q.type || 'multiple_choice');
    const typeRows = Object.keys(BANK_STATS_TYPE_LABELS)
        .filter(t => byType.has(t))
        .map(t => [BANK_STATS_TYPE_LABELS[t], byType.get(t)]);

    const byDifficulty = statsCountBy(list, q => q.difficulty || 'unset');
    const difficultyRows = BANK_STATS_DIFFICULTY_ORDER
        .filter(d => byDifficulty.has(d))
        .map(d => [BANK_STATS_DIFFICULTY_LABELS[d], byDifficulty.get(d)]);

    const byCategory = statsCountBy(list, q => q.category || 'Uncategorized');
    const sortedCategories = [...byCategory.entries()].sort((a, b) => b[1] - a[1]);
    const shownCategories = sortedCategories.slice(0, BANK_STATS_MAX_CATEGORIES);
    const moreCategories = sortedCategories.length - shownCategories.length;

    const categoryRows = shownCategories.map(([cat, count]) => `
        <tr>
            <td class="py-0.5">${catBadge(cat)}</td>
            <td class="py-0.5 text-right font-medium" style="color:var(--text);">${count}</td>
        </tr>`).join('');

    container.innerHTML = `
        <p class="text-sm font-semibold mb-3" style="color:var(--text);">📊 ${list.length} question${list.length === 1 ? '' : 's'}</p>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div class="p-3 rounded border border-gray-200 surface">
                <p class="text-xs font-semibold uppercase mb-1" style="color:var(--text-muted);">By Type</p>
                ${statsMiniTable(typeRows)}
            </div>
            <div class="p-3 rounded border border-gray-200 surface">
                <p class="text-xs font-semibold uppercase mb-1" style="color:var(--text-muted);">By Difficulty</p>
                ${statsMiniTable(difficultyRows)}
            </div>
            <div class="p-3 rounded border border-gray-200 surface">
                <p class="text-xs font-semibold uppercase mb-1" style="color:var(--text-muted);">By Category</p>
                <table class="w-full text-xs">${categoryRows}</table>
                ${moreCategories > 0 ? `<p class="text-xs mt-1" style="color:var(--text-muted);">+${moreCategories} more categor${moreCategories === 1 ? 'y' : 'ies'}</p>` : ''}
            </div>
        </div>`;
}
