// ========================================
// HELPER FUNCTIONS, SEND TO BANK HELPER
// ========================================

// Helper: Find questions that don't have a correct answer properly marked
function getQuestionsMissingCorrectAnswer(questions) {
    return (questions || []).filter(q => {
        const correct = (q.correct ?? '').toString().trim();
        if (!correct) return true;
        if (q.type === 'true_false') {
            return !/^true$|^false$/i.test(correct);
        }
        return false;
    });
}

// Helper: Render (or clear) a warning banner listing questions missing a correct answer
// ========================================
// SEND TO BANK HELPER
// ========================================

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
        showToast(`✅ Sent ${clean.length} question(s) to Manage a Bank.`, 'success');
        document.getElementById('questionManagerTab')?.click();
    } else {
        testBank = clean;
        saveTestBankToStorage();
        updateCategoryInputs();
        const bankStatus = document.getElementById('bankStatus');
        if (bankStatus) bankStatus.innerHTML = `<div class="text-green-600">Bank loaded (${clean.length} questions)</div>`;
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
    container.innerHTML = `⚠️ ${missing.length} of ${(questions || []).length} question(s) have no correct answer marked: ${preview}${more}.`;
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

    const matchingIssues = list.filter(q =>
        q.type === 'matching' &&
        (!(q.question || '').toString().trim() || !(q.correct || '').toString().trim())
    );

    return { missingCorrect, duplicateGroups, emptyQuestion, mcqIssues, matchingIssues };
}

function bankValidationIssueCount(report) {
    return report.missingCorrect.length
        + report.duplicateGroups.reduce((sum, g) => sum + g.length, 0)
        + report.emptyQuestion.length
        + report.mcqIssues.length
        + report.matchingIssues.length;
}

function questionPreviewLabel(q) {
    const text = (q.question || '(untitled question)').toString().trim() || '(empty question)';
    const truncated = text.length > 70 ? text.slice(0, 70) + '…' : text;
    return `[${escapeHtml(q.category || 'Uncategorized')}] ${escapeHtml(truncated)}`;
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

    const list = questions || [];
    if (list.length === 0) {
        container.innerHTML = '';
        return;
    }

    const report = validateQuestionBank(list);
    const totalIssues = bankValidationIssueCount(report);

    if (totalIssues === 0) {
        container.innerHTML = `<div class="p-3 rounded border border-green-200 bg-green-50 text-sm text-green-700">✅ No issues found in ${list.length} question(s).</div>`;
        return;
    }

    let html = `<div class="p-3 rounded border border-amber-200 bg-amber-50">
        <p class="text-sm font-semibold text-amber-800">⚠️ ${totalIssues} issue(s) found across ${list.length} question(s):</p>`;

    html += renderValidationDetail('Missing correct answer', report.missingCorrect, q => questionPreviewLabel(q));

    html += renderValidationDetail('Duplicate questions', report.duplicateGroups, group =>
        `${group.length}× "${escapeHtml((group[0].question || '').toString().trim().slice(0, 70))}" — categories: ${escapeHtml([...new Set(group.map(q => q.category || 'Uncategorized'))].join(', '))}`
    );

    html += renderValidationDetail('Empty question text', report.emptyQuestion, q => `[${escapeHtml(q.category || 'Uncategorized')}] (no question text)`);

    html += renderValidationDetail('Multiple choice with too few or duplicate choices', report.mcqIssues, q => questionPreviewLabel(q));

    html += renderValidationDetail('Matching pair missing premise or answer', report.matchingIssues, q => questionPreviewLabel(q));

    html += `</div>`;
    container.innerHTML = html;
}
