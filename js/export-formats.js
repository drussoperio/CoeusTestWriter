// ========================================
// EXPORT QUESTIONS IN MULTIPLE FORMATS
// ========================================

// Export dropdown functionality
function initializeExportDropdown() {
    const exportJsonBtn = document.getElementById('exportQuestionsJsonBtn');
    const exportTxtBtn = document.getElementById('exportQuestionsCsvBtn');
    const exportPlainBtn = document.getElementById('exportQuestionsPlainBtn');

    if (exportJsonBtn) {
        exportJsonBtn.addEventListener('click', () => {
            exportQuestionsAsJson();
        });
    }

    if (exportTxtBtn) {
        exportTxtBtn.addEventListener('click', () => {
            exportQuestionsAsCsv();
        });
    }

    if (exportPlainBtn) {
        exportPlainBtn.addEventListener('click', () => {
            exportQuestionsAsPlainText();
        });
    }
}

// Export as Coeus JSON
function exportQuestionsAsJson() {
    if (questionBank.length === 0) {
        showToast('⚠️ No questions to export.', 'warning');
        return;
    }
    const fileName = (document.getElementById('questionBankFilename')?.value.trim() || 'questionBank') + '.json';
    const blob = new Blob([JSON.stringify(questionBank, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`📄 Questions exported as ${fileName}`, 'success');
}

// Export as CSV
function exportQuestionsAsCsv() {
    if (questionBank.length === 0) {
        showToast('⚠️ No questions to export.', 'warning');
        return;
    }
    const csvData = convertJsonToCsv(questionBank);
    const fileName = (document.getElementById('questionBankFilename')?.value.trim() || 'questionBank') + '.csv';
    const blob = new Blob([csvData], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`📄 Questions exported as ${fileName}`, 'success');
}

// Export as plain text (human-readable)
function exportQuestionsAsPlainText() {
    if (questionBank.length === 0) {
        showToast('⚠️ No questions to export.', 'warning');
        return;
    }

    const plainText = questionsToPlainText(questionBank);

    const fileName = (document.getElementById('outputFilename')?.value.trim() || 'questionBank') + '.txt';
    const blob = new Blob([plainText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`📄 Questions exported as ${fileName}`, 'success');
}

// ── Toast system ──────────────────────────────────────────────────────────────
function showUndoToast(msg) {
    let stack = document.getElementById('toast-stack');
    if (!stack) {
        stack = document.createElement('div');
        stack.id = 'toast-stack';
        stack.style.cssText = 'position:fixed;top:16px;right:16px;z-index:99999;display:flex;flex-direction:column;gap:8px;pointer-events:none;';
        document.body.appendChild(stack);
    }
    const toast = document.createElement('div');
    toast.style.cssText = 'min-width:260px;max-width:380px;padding:10px 16px;border-radius:8px;font-size:0.85rem;font-weight:500;color:#fff;background:#d97706;box-shadow:0 4px 12px rgba(0,0,0,.25);display:flex;align-items:center;gap:8px;pointer-events:auto;';
    const text = document.createElement('span');
    text.textContent = '\u26a0\ufe0f ' + msg;
    const btn = document.createElement('button');
    btn.textContent = 'Undo';
    btn.style.cssText = 'margin-left:auto;background:#fff;color:#333;border:none;padding:3px 10px;border-radius:4px;cursor:pointer;font-size:0.8rem;font-weight:600;flex-shrink:0;pointer-events:auto;';
    btn.addEventListener('click', function() { performUndo(); toast.remove(); });
    toast.appendChild(text);
    toast.appendChild(btn);
    stack.appendChild(toast);
    setTimeout(function() {
        toast.style.transition = 'opacity .3s';
        toast.style.opacity = '0';
        setTimeout(function() { if (toast.parentNode) toast.remove(); }, 300);
    }, 5000);
}

// Pass isHtml=true only for trusted, hardcoded markup (e.g. an inline Undo button) —
// never for strings built from bank/user data. Those must go through textContent.
function showToast(message, type = 'success', duration = 3000, isHtml = false) {
    let stack = document.getElementById('toast-stack');
    if (!stack) {
        stack = document.createElement('div');
        stack.id = 'toast-stack';
        stack.style.cssText = 'position:fixed;top:16px;right:16px;z-index:99999;display:flex;flex-direction:column;gap:8px;pointer-events:none;';
        document.body.appendChild(stack);
    }
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    if (isHtml) {
        toast.innerHTML = message;
    } else {
        toast.textContent = message;
    }
    stack.appendChild(toast);
    setTimeout(() => { 
        toast.style.opacity = '0'; 
        toast.style.transition = 'opacity .3s'; 
        setTimeout(() => toast.remove(), 300); 
    }, duration);
}

// ── localStorage helpers ──────────────────────────────────────────────────────
function saveQBankToStorage() {
    try {
        localStorage.setItem('coeus-question-bank', JSON.stringify(questionBank));
    } catch (e) {
        console.error('Failed to save question bank to storage:', e);
        showToast('⚠️ Could not save question bank locally (storage full?). Your changes are only in memory.', 'warning');
    }
}

function saveAddedQuestionsToStorage() {
    try {
        localStorage.setItem('coeus-added-questions', JSON.stringify(addedQuestions));
    } catch (e) {
        console.error('Failed to save added questions to storage:', e);
    }
}

function saveTestBankToStorage() {
    try {
        localStorage.setItem('coeus-test-bank', JSON.stringify(testBank));
    } catch (e) {
        console.error('Failed to save test bank to storage:', e);
        showToast('⚠️ Could not save test bank locally (storage full?). Your changes are only in memory.', 'warning');
    }
}

function restoreBanksFromStorage() {
    const savedQBank = localStorage.getItem('coeus-question-bank');
    const savedTBank = localStorage.getItem('coeus-test-bank');
    const savedAdded = localStorage.getItem('coeus-added-questions');
    let restored = false;
    
    if (savedQBank) {
        try {
            questionBank = JSON.parse(savedQBank);
            assignQuestionUids(questionBank);
            restored = true;
        } catch (e) {
            console.error('Failed to parse saved question bank:', e);
        }
    }

    if (savedAdded) {
        try {
            const savedAddedList = JSON.parse(savedAdded);
            // Re-link saved "added" records to their actual object references
            // in the restored question bank (matched by content, each claimed once).
            const used = new Set();
            addedQuestions = savedAddedList.map(saved => {
                const idx = questionBank.findIndex((q, i) => !used.has(i) && JSON.stringify(q) === JSON.stringify(saved));
                if (idx !== -1) {
                    used.add(idx);
                    return questionBank[idx];
                }
                return null;
            }).filter(Boolean);
        } catch (e) {
            console.error('Failed to parse saved added-questions list:', e);
        }
    }
    
    if (savedTBank) {
        try {
            testBank = JSON.parse(savedTBank);
            restored = true;
        } catch (e) {
            console.error('Failed to parse saved test bank:', e);
        }
    }
    
    if (restored) {
        if (questionBank.length > 0) {
            renderQuestionManagerList();
        }
    }
    updateCategoryInputs();
}

// ── Category badge colour (deterministic hash) ────────────────────────────────
const BADGE_PALETTE = ['#6366f1','#0ea5e9','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#14b8a6','#f97316','#84cc16','#06b6d4','#f43f5e','#a855f7','#eab308'];
function badgeColor(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) h = (h * 37 + str.charCodeAt(i)) >>> 0;
    return BADGE_PALETTE[h % BADGE_PALETTE.length];
}
function catBadge(cat) {
    const color = badgeColor(cat);
    return `<span class="cat-badge" style="background:${color}">${escapeHtml(cat)}</span>`;
}

// ── Status bar helpers ────────────────────────────────────────────────────────
function updateStatusBank(filename, count) {
    const el = document.getElementById('sb-bank');
    const ct = document.getElementById('sb-count');
    if (el) el.textContent = filename || 'None loaded';
    if (ct) ct.textContent = count ?? 0;
}
function updateStatusGenerated() {
    const el  = document.getElementById('sb-generated');
    const vEl = document.getElementById('sb-version');
    const vLbl= document.getElementById('sb-version-label');
    const now = new Date();
    const ts  = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (el)  el.textContent  = ts;
    if (vEl) vEl.classList.remove('hidden');
    if (vLbl)vLbl.textContent = VERSION_LABELS[testVersionIndex % VERSION_LABELS.length];
}

// ── Sidebar question list renderer ────────────────────────────────────────────
function renderSidebarQuestions() {
    const list = document.getElementById('sidebarQuestionList');
    if (!list) return;
    const bank = testBank.length ? testBank : questionBank;
    if (!bank.length) {
        list.innerHTML = `<div class="empty-state">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
            </svg>
            <p>No questions loaded yet.<br>Load a JSON bank or add questions above.</p>
        </div>`;
        return;
    }
    list.innerHTML = bank.map((q, i) => {
        let typeLabel = 'MCQ';
        if (q.type === 'true_false') typeLabel = 'T/F';
        if (q.type === 'matching') typeLabel = 'Matching';
        return `
        <div class="q-card">
            <div class="flex items-center gap-2 mb-1 flex-wrap">
                ${catBadge(q.category || 'Uncategorized')}
                <span class="text-xs" style="color:var(--text-muted);">${typeLabel}</span>
            </div>
            <p class="text-xs" style="color:var(--text);line-height:1.4;">${escapeHtml((q.question || '').slice(0, 100))}${(q.question || '').length > 100 ? '…' : ''}</p>
        </div>`;
    }).join('');
}

// ── Helper: Difficulty badge HTML ──────────────────────────────────────────────
function difficultyBadge(difficulty) {
    const d = difficulty || 'unset';
    const map = {
        unset:  { label: 'Unset',  color: '#6b7280' },
        easy:   { label: 'Easy',   color: '#22c55e' },
        medium: { label: 'Medium', color: '#eab308' },
        hard:   { label: 'Hard',   color: '#ef4444' },
    };
    const { label, color } = map[d] || map.unset;
    return `<span class="text-xs px-2 py-0.5 rounded" style="background-color:${color}30;color:${color};font-weight:600;">${label}</span>`;
}

// ── Helper: Make category names safe for use as HTML IDs ──────────────────────
function safeIdFromCategory(cat) {
    return String(cat).trim().toLowerCase().replace(/\W+/g, '_');
}

// Update category inputs in the test generation form
function updateCategoryInputs(categories) {
    const categoryInputs = document.getElementById('categoryInputs');
    if (!categoryInputs) {
        console.error('categoryInputs element not found in the DOM.');
        return;
    }

    // Derive from testBank when no arg provided
    if (!categories) {
        categories = testBank.length > 0 ? [...new Set(testBank.map(q => q.category))].sort() : [];
    }

    // Build a quick lookup of counts per category/type
    const counts = {};
    testBank.forEach(q => {
        if (!counts[q.category]) {
            counts[q.category] = { mc: 0, tf: 0, mt: 0, total: 0 };
        }
        if (q.type === 'multiple_choice') counts[q.category].mc++;
        if (q.type === 'true_false') counts[q.category].tf++;
        if (q.type === 'matching') counts[q.category].mt++;
        counts[q.category].total++;
    });

    categoryInputs.innerHTML = '';

    if (!categories || categories.length === 0) {
        categoryInputs.innerHTML = '<div class="empty-state"><svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg><p>No categories available.<br>Please load a test bank to get started.</p></div>';
        return;
    }

    // Helper function to apply color styles directly to input element
    function applyColorStyle(input, value, available) {
        value = parseInt(value) || 0;
        if (value === 0 || isNaN(value)) {
            input.style.removeProperty('--input-border');
            input.style.removeProperty('--input-bg');
        } else if (value <= available) {
            input.style.setProperty('--input-border', '#22c55e');
            input.style.setProperty('--input-bg', '#f0fdf4');
        } else {
            input.style.setProperty('--input-border', '#ef4444');
            input.style.setProperty('--input-bg', '#fef2f2');
        }
    }

    categories.forEach(cat => {
        const mcAvail = counts[cat]?.mc || 0;
        const tfAvail = counts[cat]?.tf || 0;
        const mtAvail = counts[cat]?.mt || 0;
        const totalAvail = counts[cat]?.total || 0;
        
        // Calculate how many are excluded from this category
        const excludedInCat = excludedQuestions.filter(q => q.category === cat).length;
        const mcExcluded = excludedQuestions.filter(q => q.category === cat && q.type === 'multiple_choice').length;
        const tfExcluded = excludedQuestions.filter(q => q.category === cat && q.type === 'true_false').length;
        const mtExcluded = excludedQuestions.filter(q => q.category === cat && q.type === 'matching').length;
        
        const mcAvailable = mcAvail - mcExcluded;
        const tfAvailable = tfAvail - tfExcluded;
        const mtAvailable = mtAvail - mtExcluded;
        const totalAvailable = totalAvail - excludedInCat;
        
        const safeCat = safeIdFromCategory(cat);

        const div = document.createElement('div');
        div.className = 'shadow-sm hover:shadow-md hover:bg-gray-50 dark:hover:bg-gray-800 transition-shadow duration-150 p-4 rounded-md border border-gray-200 dark:border-gray-700';
        
        let countsText = '';
        if (excludedInCat > 0) {
            countsText = `<span class="text-sm font-normal text-gray-500">(Available: ${totalAvailable}/${totalAvail}, MCQ: ${mcAvailable}/${mcAvail}, T/F: ${tfAvailable}/${tfAvail}, MT: ${mtAvailable}/${mtAvail})</span>
                          <span class="text-xs text-red-600 block">${excludedInCat} excluded</span>`;
        } else {
            countsText = `<span class="text-sm font-normal text-gray-500">(Total: ${totalAvail}, MCQ: ${mcAvail}, T/F: ${tfAvail}, MT: ${mtAvail})</span>`;
        }
        
        div.innerHTML = `
            <div class="col-span-2 font-semibold mb-3">
                ${escapeHtml(cat)}
                ${countsText}
            </div>

            <div class="grid grid-cols-3 gap-4 items-center">
                <div>
                    <label for="cat_${safeCat}_mc" class="block text-sm font-medium text-gray-700">MCQ</label>
                    <div class="flex items-center gap-1">
                        <input type="number" id="cat_${safeCat}_mc" min="0" value="0" class="block w-full rounded-md border shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-200 text-sm" data-available="${mcAvailable}">
                        <span class="text-xs text-gray-500">/ ${mcAvailable}</span>
                    </div>
                </div>

                <div>
                    <label for="cat_${safeCat}_tf" class="block text-sm font-medium text-gray-700">T/F</label>
                    <div class="flex items-center gap-1">
                        <input type="number" id="cat_${safeCat}_tf" min="0" value="0" class="block w-full rounded-md border shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-200 text-sm" data-available="${tfAvailable}">
                        <span class="text-xs text-gray-500">/ ${tfAvailable}</span>
                    </div>
                </div>

                <div>
                    <label for="cat_${safeCat}_mt" class="block text-sm font-medium text-gray-700">Matching</label>
                    <div class="flex items-center gap-1">
                        <input type="number" id="cat_${safeCat}_mt" min="0" value="0" class="block w-full rounded-md border shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-200 text-sm" data-available="${mtAvailable}">
                        <span class="text-xs text-gray-500">/ ${mtAvailable}</span>
                    </div>
                </div>
            </div>
        `;
        categoryInputs.appendChild(div);

        const mcInput = div.querySelector(`#cat_${safeCat}_mc`);
        const tfInput = div.querySelector(`#cat_${safeCat}_tf`);
        const mtInput = div.querySelector(`#cat_${safeCat}_mt`);

        mcInput.addEventListener('input', () => applyColorStyle(mcInput, mcInput.value, mcAvailable));
        tfInput.addEventListener('input', () => applyColorStyle(tfInput, tfInput.value, tfAvailable));
        mtInput.addEventListener('input', () => applyColorStyle(mtInput, mtInput.value, mtAvailable));

        // Apply initial colors
        applyColorStyle(mcInput, mcInput.value, mcAvailable);
        applyColorStyle(tfInput, tfInput.value, tfAvailable);
        applyColorStyle(mtInput, mtInput.value, mtAvailable);
    });
}

// Load file (JSON or TXT)
function loadFile(fileInput, isTxt, bankType) {
    if (!fileInput) {
        showToast('❌ File input not found', 'error');
        return;
    }
    if (fileInput.files.length === 0) {
        showToast('⚠️ Please select a file to load.', 'warning');
        return;
    }

    const file = fileInput.files[0];
    const reader = new FileReader();

    reader.onload = (e) => {
        try {
            const data = isTxt ? parseTxtToJSON(e.target.result) : JSON.parse(e.target.result);

            if (!Array.isArray(data)) {
                throw new Error('Data must be an array');
            }

            const normalizedData = data.map(question => {
                if (question.choices) {
                    return question;
                } else {
                    return {
                        ...question,
                        choices: [
                            question.option_1,
                            question.option_2,
                            question.option_3,
                            question.option_4
                        ]
                    };
                }
            });

            if (bankType === 'testBank') {
                testBank = normalizedData;
                saveTestBankToStorage();
                const categories = [...new Set(testBank.map(q => q.category))].sort();
                updateCategoryInputs(categories);
                const bankStatus = document.getElementById('bankStatus');
                if (bankStatus) {
                    bankStatus.innerHTML = `
                        <div>Total Questions: ${testBank.length}</div>
                    `;
                }
                renderMissingCorrectWarning('testBankMissingCorrectWarning', testBank);
                updateStatusBank(file.name.replace(/\.[^/.]+$/, ''), testBank.length);
                const outputFilenameInput = document.getElementById('outputFilename');
                if (outputFilenameInput) outputFilenameInput.value = file.name.replace(/\.[^/.]+$/, '');
                showToast(`✅ Loaded ${testBank.length} questions from "${file.name}"`, 'success');
            } else {
                questionBank = normalizedData;
                assignQuestionUids(questionBank);
                addedQuestions = [];
                saveQBankToStorage();
                saveAddedQuestionsToStorage();
                clearQuestionManagerState();
                updateQuestionManagerCategories();
                renderQuestionManagerList();
                showToast(`✅ Question bank loaded — ${questionBank.length} questions`, 'success');
            }
        } catch (error) {
            console.error('Error loading file:', error);
            showToast('❌ Error: ' + error.message, 'error');
            resetDropZoneDisplay(fileInput);
        }
    };

    reader.readAsText(file);
}

// Matching pair helper function - creates a row with both columns and shared delete
function addMatchingColumnAItem(text = '') {
    const container = document.getElementById('matchingColumnA');
    if (!document.getElementById('matchingColumnB')) return; // Safety check
    
    const containerB = document.getElementById('matchingColumnB');
    
    // Create pair ID for linking
    const pairId = 'pair-' + Date.now() + '-' + Math.random();
    
    // Add to Column A
    const rowA = document.createElement('div');
    rowA.className = 'flex gap-2 items-center matching-pair-item';
    rowA.setAttribute('data-pair-id', pairId);
    rowA.innerHTML = `
        <input type="text" placeholder="Premise" value="${escapeHtml(text)}"
            class="flex-1 rounded border text-sm px-2 py-1 matching-premise">
        <button type="button" class="delete-pair-btn text-red-500 text-sm px-1" data-pair-id="${pairId}">✕</button>
    `;
    container.appendChild(rowA);
    
    // Add to Column B
    const rowB = document.createElement('div');
    rowB.className = 'flex gap-2 items-center matching-pair-item';
    rowB.setAttribute('data-pair-id', pairId);
    rowB.innerHTML = `
        <input type="text" placeholder="Answer" value=""
            class="flex-1 rounded border text-sm px-2 py-1 matching-answer">
        <button type="button" class="delete-pair-btn text-red-500 text-sm px-1" data-pair-id="${pairId}">✕</button>
    `;
    containerB.appendChild(rowB);
    
    // Attach delete handler (single button deletes both)
    const deleteBtn = rowA.querySelector('.delete-pair-btn');
    deleteBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const id = e.target.getAttribute('data-pair-id');
        document.querySelector(`#matchingColumnA [data-pair-id="${id}"]`)?.remove();
        document.querySelector(`#matchingColumnB [data-pair-id="${id}"]`)?.remove();
    });
    // Remove duplicate delete button from rowB
    rowB.querySelector('.delete-pair-btn')?.remove();
}

function addMatchingColumnBItem(text = '') {
    // This is now handled by addMatchingColumnAItem, but keep stub for compatibility
}

// Clear question manager state
function clearQuestionManagerState() {
    questionManagerState.selectedQuestions.clear();
    questionManagerState.editingIndex = null;
    questionManagerState.editFormData = {};
    questionManagerState.collapsedCategories = {};
}

// Add question to the question bank
function addQuestion() {
    const category = document.getElementById('category').value;
    const type = document.getElementById('type').value;
    const difficulty = document.getElementById('difficulty')?.value || 'unset';
    const questionText = document.getElementById('question').value;

    if (!category.trim()) {
        showToast('⚠️ Please enter a category.', 'warning');
        return;
    }

    let choices = [];
    let correct = '';

    if (type === 'multiple_choice') {
        if (!questionText.trim()) {
            showToast('⚠️ Please enter the question text.', 'warning');
            return;
        }
        const choiceInputs = document.querySelectorAll('.choice-input');
        const selectedRadio = document.querySelector('input[name="correctChoice"]:checked');

        if (!selectedRadio) {
            showToast('⚠️ Please select the correct answer.', 'warning');
            return;
        }

        let hasEmptyChoice = false;
        choiceInputs.forEach(div => {
            if (div.classList.contains('hidden')) return;
            const textInput = div.querySelector('input[type="text"]');
            if (textInput.value.trim() === '') {
                hasEmptyChoice = true;
            }
        });

        if (hasEmptyChoice) {
            showToast('⚠️ Please fill in all choices.', 'warning');
            return;
        }

        choiceInputs.forEach(div => {
            if (div.classList.contains('hidden')) return;
            const textInput = div.querySelector('input[type="text"]');
            const radioInput = div.querySelector('input[type="radio"]');
            choices.push(textInput.value);
            if (radioInput.checked) {
                correct = textInput.value;
            }
        });
    } else if (type === 'true_false') {
        if (!questionText.trim()) {
            showToast('⚠️ Please enter the question text.', 'warning');
            return;
        }
        const tfRadio = document.querySelector('input[name="tfCorrect"]:checked');
        if (!tfRadio) {
            showToast('⚠️ Please select True or False as the correct answer.', 'warning');
            return;
        }
        correct = tfRadio.value;
    } else if (type === 'matching') {
        const columnAItems = Array.from(document.querySelectorAll('#matchingColumnA .matching-premise'))
            .map(el => el.value.trim())
            .filter(text => text);
        const columnBItems = Array.from(document.querySelectorAll('#matchingColumnB .matching-answer'))
            .map(el => el.value.trim())
            .filter(text => text);
        
        if (columnAItems.length === 0 || columnBItems.length === 0) {
            showToast('⚠️ Add at least one item to both Column A and Column B.', 'warning');
            return;
        }
        
        if (columnAItems.length !== columnBItems.length) {
            showToast('⚠️ Column A and Column B must have the same number of items.', 'warning');
            return;
        }
        
        // Store each premise as a separate question with its correct answer
        columnAItems.forEach((premise, idx) => {
            const newQuestion = {
                category,
                type: 'matching',
                difficulty,
                question: premise,
                correct: columnBItems[idx],
                choices: [null, null, null, null]
            };
            assignQuestionUids([newQuestion]);
            questionBank.push(newQuestion);
            addedQuestions.push(newQuestion);
        });
        
        saveQBankToStorage();
        saveAddedQuestionsToStorage();
        showToast(`✅ Matching question set (${columnAItems.length} items) added to the bank`, 'success');
        
        // Clear the form
        const questionForm = document.getElementById('questionForm');
        questionForm.reset();
        document.getElementById('matchingColumnA').innerHTML = '';
        document.getElementById('matchingColumnB').innerHTML = '';
        
        // Update Question Manager UI
        updateQuestionManagerCategories();
        renderQuestionManagerList();
        return;
    }

    const newQuestion = {
        category,
        type,
        difficulty,
        question: questionText,
        choices: type === 'multiple_choice' ? choices : null,
        correct: correct
    };

    assignQuestionUids([newQuestion]);
    questionBank.push(newQuestion);
    addedQuestions.push(newQuestion);
    saveQBankToStorage();
    saveAddedQuestionsToStorage();
    showToast('✅ Question added to the bank', 'success');
    
    // Clear the form
    const questionForm = document.getElementById('questionForm');
    questionForm.reset();
    const choiceInputs = document.querySelectorAll('.choice-input');
    choiceInputs.forEach(div => {
        const textInput = div.querySelector('input[type="text"]');
        const radioInput = div.querySelector('input[type="radio"]');
        if (textInput) textInput.value = '';
        if (radioInput) radioInput.checked = false;
    });
    // Hide Choice E row and reset toggle button
    const choiceERow = document.getElementById('choiceERow');
    if (choiceERow) choiceERow.classList.add('hidden');
    const toggleE = document.getElementById('toggleChoiceEBtn');
    if (toggleE) toggleE.textContent = '+ Add Choice E';
    
    // Re-trigger type change to show correct section after reset
    const typeSelectElem = document.getElementById('type');
    if (typeSelectElem) typeSelectElem.dispatchEvent(new Event('change'));

    // Update Question Manager UI
    updateQuestionManagerCategories();
    renderQuestionManagerList();
}
