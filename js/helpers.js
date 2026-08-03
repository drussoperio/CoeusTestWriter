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
