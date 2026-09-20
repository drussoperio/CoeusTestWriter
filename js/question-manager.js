// ========================================
// QUESTION MANAGER - GROUPED BY CATEGORY
// ========================================

// Render the Question Manager list grouped by category with collapsible sections
function renderQuestionManagerList() {
    const container = document.getElementById('sidebarQuestionList');
    if (!container) return;

    renderBankValidationReport('qm-validation-report', questionBank);
    renderBankStats('qm-bank-stats', questionBank);

    // Step 1: Apply search filter
    let filtered = questionBank.filter(q => {
        const searchLower = questionManagerState.searchText.toLowerCase();
        if ((q.question || '').toLowerCase().includes(searchLower) ||
            (q.category || '').toLowerCase().includes(searchLower)) {
            return true;
        }
        if ((q.correct || '').toLowerCase().includes(searchLower)) return true;
        if ((q.choices || []).some(c => (c || '').toLowerCase().includes(searchLower))) return true;
        return false;
    });

    // Step 2: Apply category/type filter
    if (questionManagerState.filterBy !== 'all') {
        if (questionManagerState.filterBy === 'mcq') {
            filtered = filtered.filter(q => q.type === 'multiple_choice');
        } else if (questionManagerState.filterBy === 'tf') {
            filtered = filtered.filter(q => q.type === 'true_false');
        } else if (questionManagerState.filterBy === 'matching') {
            filtered = filtered.filter(q => q.type === 'matching');
        } else if (questionManagerState.filterBy === 'diff-unset') {
            filtered = filtered.filter(q => !q.difficulty || q.difficulty === 'unset');
        } else if (questionManagerState.filterBy === 'diff-easy') {
            filtered = filtered.filter(q => q.difficulty === 'easy');
        } else if (questionManagerState.filterBy === 'diff-medium') {
            filtered = filtered.filter(q => q.difficulty === 'medium');
        } else if (questionManagerState.filterBy === 'diff-hard') {
            filtered = filtered.filter(q => q.difficulty === 'hard');
        } else {
            filtered = filtered.filter(q => q.category === questionManagerState.filterBy);
        }
    }

    // Step 3: Apply sorting
    const _diffOrder = { easy: 0, medium: 1, hard: 2, unset: 3 };
    switch (questionManagerState.sortBy) {
        case 'diff-asc':
            filtered.sort((a, b) =>
                (_diffOrder[a.difficulty] ?? 3) - (_diffOrder[b.difficulty] ?? 3) ||
                (a.category || '').localeCompare(b.category || '')
            );
            break;
        case 'diff-desc':
            filtered.sort((a, b) =>
                (_diffOrder[b.difficulty] ?? 3) - (_diffOrder[a.difficulty] ?? 3) ||
                (a.category || '').localeCompare(b.category || '')
            );
            break;
        case 'cat-desc':
            filtered.sort((a, b) => (b.category || '').localeCompare(a.category || ''));
            break;
        case 'cat-asc':
        default:
            filtered.sort((a, b) => (a.category || '').localeCompare(b.category || ''));
            break;
    }

    // Step 4: Group by category (preserve filtered order for category keys)
    const grouped = {};
    const groupOrder = [];
    filtered.forEach((q, idx) => {
        const cat = q.category || 'Uncategorized';
        if (!grouped[cat]) {
            grouped[cat] = [];
            groupOrder.push(cat);
        }
        grouped[cat].push({ question: q, filteredIdx: idx });
    });

    // Step 5: Render the grouped list
    if (Object.keys(grouped).length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                </svg>
                <p>${questionManagerState.searchText ? 'No matching questions.' : 'No questions loaded yet.'}</p>
            </div>`;
        updateDeleteButtonState();
        updateChangeCategoryButtonState();
        return;
    }

    let html = '<div class="space-y-2">';

    // Render each category as a collapsible section, in the order sortBy produced
    groupOrder.forEach(category => {
        const questions = grouped[category];
        const catColor = badgeColor(category);
        const safeCat = safeIdFromCategory(category);
        const isExpanded = !questionManagerState.collapsedCategories[category];

        html += `
            <div class="qm-category-section">
                <div class="qm-category-header" data-category="${escapeHtml(category)}">
                    <span class="qm-category-chevron ${!isExpanded ? 'collapsed' : ''}">▼</span>
                    <span class="cat-badge" style="background:${catColor}">${escapeHtml(category)}</span>
                    <span class="text-xs text-gray-500 ml-2">(${questions.length})</span>
                    <button class="qm-select-category-btn ml-auto text-xs px-2 py-1 rounded bg-blue-100 hover:bg-blue-200 text-blue-700" data-category="${escapeHtml(category)}" style="white-space: nowrap;">Select All in Category</button>
                </div>
                <div class="qm-category-body ${!isExpanded ? 'hidden' : ''}">
        `;

        questions.forEach(({ question: q, filteredIdx }) => {
            const isSelected = questionManagerState.selectedQuestions.has(q.__uid);
            const isEditing = questionManagerState.editingIndex === filteredIdx;

            if (!isEditing) {
                const preview = (q.question || '').slice(0, 100) + ((q.question || '').length > 100 ? '…' : '');
                let typeLabel = 'MCQ';
                let typeColor = '#0ea5e9';
                if (q.type === 'true_false') {
                    typeLabel = 'T/F';
                    typeColor = '#ef4444';
                } else if (q.type === 'matching') {
                    typeLabel = 'Matching';
                    typeColor = '#f59e0b';
                }

                const compact = questionManagerState.compactView;
                html += `
                    <div class="q-card ${isSelected ? 'ring-2 ring-blue-500' : ''}" style="cursor: pointer; margin-left: 12px; margin-right: 12px; ${compact ? 'padding: 4px 8px !important;' : ''}">
                        <div class="flex items-start gap-2">
                            <input type="checkbox" class="qm-checkbox mt-1" data-uid="${q.__uid}" ${isSelected ? 'checked' : ''} style="cursor: pointer;">
                            <div class="flex-1 min-w-0">
                                <div class="flex items-center gap-2 ${compact ? '' : 'mb-1'} flex-wrap">
                                    <span class="text-xs px-2 py-0.5 rounded" style="background-color: ${typeColor}40; color: ${typeColor}; font-weight: 600;">${typeLabel}</span>
                                    ${difficultyBadge(q.difficulty)}
                                </div>
                                <p class="${compact ? 'text-xs' : 'text-xs mt-0.5'}" style="color: var(--text); line-height: 1.4; word-break: break-word;">${escapeHtml(preview)}</p>
                                ${compact ? '' : (q.correct ? `<p class="text-xs mt-1" style="color: var(--text-muted);">✓ ${escapeHtml(q.correct)}</p>` : '<p class="text-xs mt-1 text-red-500">⚠️ No correct answer</p>')}
                            </div>
                            <button class="qm-edit-btn text-xs px-2 py-1 rounded bg-blue-500 hover:bg-blue-700 text-white font-medium" data-filtered-idx="${filteredIdx}" style="white-space: nowrap;">Edit</button>
                        </div>
                    </div>
                `;
            } else {
                // Editing form
                const editData = questionManagerState.editFormData[filteredIdx] || {
                    category: q.category || '',
                    type: q.type || 'multiple_choice',
                    question: q.question || '',
                    correct: q.correct || '',
                    choices: q.choices ? [...q.choices] : ['', '', '', '']
                };

                // Build choices array: first = correct, rest = wrong
                const allChoices = editData.type === 'multiple_choice' ? (() => {
                    const raw = editData.choices ? [...editData.choices] : ['', '', '', ''];
                    // Ensure 4 slots minimum
                    while (raw.length < 4) raw.push('');
                    // Move correct answer to index 0
                    const correctVal = editData.correct || '';
                    const correctIdx = raw.indexOf(correctVal);
                    if (correctIdx > 0) {
                        raw.splice(correctIdx, 1);
                        raw.unshift(correctVal);
                    } else if (correctIdx === -1 && correctVal) {
                        raw.unshift(correctVal);
                        if (raw.length > 5) raw.length = 5;
                    }
                    return raw;
                })() : [];
                const hasChoiceE = allChoices.length >= 5 && allChoices[4] !== undefined && allChoices[4] !== '';

                const checkIcon = `<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 flex-shrink-0 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>`;
                const xIcon = `<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 flex-shrink-0 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/></svg>`;

                html += `
                    <div class="q-card p-4" style="margin-left: 12px; margin-right: 12px; box-shadow: 0 0 0 2px #3b82f6, 0 4px 12px rgba(59,130,246,0.15); border: none;">
                        <h4 class="font-semibold mb-3" style="color: var(--text);">Edit Question</h4>
                        
                        <div class="space-y-3">
                            <div>
                                <label class="block text-sm font-medium" style="color: var(--text);">Category</label>
                                <input type="text" class="qm-edit-category mt-1 block w-full rounded border text-sm px-2 py-1.5" 
                                    value="${escapeHtml(editData.category || '')}" data-filtered-idx="${filteredIdx}">
                            </div>

                            <div>
                                <label class="block text-sm font-medium" style="color: var(--text);">Type</label>
                                <select class="qm-edit-type mt-1 block w-full rounded border text-sm px-2 py-1.5" data-filtered-idx="${filteredIdx}">
                                    <option value="multiple_choice" ${editData.type === 'multiple_choice' ? 'selected' : ''}>Multiple Choice</option>
                                    <option value="true_false" ${editData.type === 'true_false' ? 'selected' : ''}>True/False</option>
                                    <option value="matching" ${editData.type === 'matching' ? 'selected' : ''}>Matching</option>
                                </select>
                            </div>

                            <div>
                                <label class="block text-sm font-medium" style="color: var(--text);">Question</label>
                                <textarea class="qm-edit-question mt-1 block w-full rounded border text-sm px-2 py-1.5" rows="3" data-filtered-idx="${filteredIdx}">${escapeHtml(editData.question || '')}</textarea>
                            </div>

                            ${editData.type === 'multiple_choice' ? `
                                <div>
                                    <label class="block text-sm font-medium mb-2" style="color: var(--text);">Choices</label>
                                    <div class="space-y-2" id="qm-edit-choices-${filteredIdx}">
                                        ${allChoices.slice(0, 4).map((choice, i) => `
                                            <div class="flex items-center gap-2">
                                                <button type="button" class="qm-mark-correct-btn" data-filtered-idx="${filteredIdx}" data-choice-idx="${i}" title="${i === 0 ? 'Correct answer' : 'Mark as correct answer'}" style="background:none;border:none;padding:0;cursor:pointer;line-height:0;">${i === 0 ? checkIcon : xIcon}</button>
                                                <input type="text" class="qm-edit-choice flex-1 rounded shadow-sm text-sm px-2 py-1.5"
                                                    value="${escapeHtml(choice || '')}"
                                                    data-filtered-idx="${filteredIdx}" data-choice-idx="${i}"
                                                    placeholder="${i === 0 ? 'Correct answer' : 'Wrong answer'}"
                                                    style="border:none;">
                                            </div>
                                        `).join('')}
                                        <div class="flex items-center gap-2 qm-edit-choice-e-row" id="qm-edit-choice-e-${filteredIdx}" style="${hasChoiceE ? '' : 'display:none;'}">
                                            <button type="button" class="qm-mark-correct-btn" data-filtered-idx="${filteredIdx}" data-choice-idx="4" title="Mark as correct answer" style="background:none;border:none;padding:0;cursor:pointer;line-height:0;">${xIcon}</button>
                                            <input type="text" class="qm-edit-choice flex-1 rounded shadow-sm text-sm px-2 py-1.5"
                                                value="${escapeHtml(allChoices[4] || '')}"
                                                data-filtered-idx="${filteredIdx}" data-choice-idx="4"
                                                placeholder="Wrong answer"
                                                style="border:none;">
                                        </div>
                                    </div>
                                    <button type="button" class="qm-toggle-choice-e-btn mt-2 text-xs text-blue-500 hover:underline" data-filtered-idx="${filteredIdx}">${hasChoiceE ? '− Remove Choice E' : '+ Add Choice E'}</button>
                                </div>
                            ` : editData.type === 'matching' ? `
                                <div>
                                    <label class="block text-sm font-medium mb-2" style="color: var(--text);">Column A (Premise)</label>
                                    <input type="text" placeholder="Premise" 
                                        value="${escapeHtml(editData.question || '')}"
                                        class="w-full rounded border text-sm px-2 py-1 qm-edit-question"
                                        data-filtered-idx="${filteredIdx}">
                                </div>
                                <div>
                                    <label class="block text-sm font-medium mb-2" style="color: var(--text);">Column B (Correct Answer)</label>
                                    <input type="text" placeholder="Correct answer" 
                                        value="${escapeHtml(editData.correct || '')}"
                                        class="w-full rounded border text-sm px-2 py-1 qm-edit-correct"
                                        data-filtered-idx="${filteredIdx}">
                                </div>
                            ` : `
                                <div>
                                    <label class="block text-sm font-medium mb-2" style="color: var(--text);">Correct Answer</label>
                                    <div class="space-y-1">
                                        <label class="inline-flex items-center text-sm">
                                            <input type="radio" name="qm-edit-correct-${filteredIdx}" value="True" 
                                                class="qm-edit-tf-radio mr-1" data-filtered-idx="${filteredIdx}"
                                                ${editData.correct === 'True' ? 'checked' : ''}>
                                            True
                                        </label><br>
                                        <label class="inline-flex items-center text-sm">
                                            <input type="radio" name="qm-edit-correct-${filteredIdx}" value="False" 
                                                class="qm-edit-tf-radio mr-1" data-filtered-idx="${filteredIdx}"
                                                ${editData.correct === 'False' ? 'checked' : ''}>
                                            False
                                        </label>
                                    </div>
                                </div>
                            `}

                            <div class="flex gap-2 pt-2">
                                <button class="qm-edit-save-btn flex-1 bg-green-500 hover:bg-green-700 text-white px-3 py-1 rounded text-sm font-medium" data-filtered-idx="${filteredIdx}">Save</button>
                                <button class="qm-edit-cancel-btn flex-1 bg-gray-500 hover:bg-gray-700 text-white px-3 py-1 rounded text-sm" data-filtered-idx="${filteredIdx}">Cancel</button>
                            </div>
                        </div>
                    </div>
                `;
            }
        });

        html += `
                </div>
            </div>
        `;
    });

    html += '</div>';
    container.innerHTML = html;

    // Sync compact toggle icon
    const _compactBtn = document.getElementById('qm-compact-toggle');
    if (_compactBtn) _compactBtn.textContent = questionManagerState.compactView ? '☰' : '▤';

    // Force select values (innerHTML sets 'selected' attr but browser may ignore for selects)
    document.querySelectorAll('.qm-edit-difficulty').forEach(sel => {
        const idx = parseInt(sel.dataset.filteredIdx);
        const q = filtered[idx];
        sel.value = (questionManagerState.editFormData[idx]?.difficulty) || q?.difficulty || 'unset';
    });
    document.querySelectorAll('.qm-edit-type').forEach(sel => {
        const idx = parseInt(sel.dataset.filteredIdx);
        const q = filtered[idx];
        sel.value = (questionManagerState.editFormData[idx]?.type) || q?.type || 'multiple_choice';
    });

    // Attach event listeners
    attachQuestionManagerEventListeners(filtered);
    attachCategoryHeaderEvents();
	attachSelectCategoryButtons();
	attachSelectVisibleButton();
    updateDeleteButtonState();
    updateChangeCategoryButtonState();
    refreshQmPreview();
    updateQmAddQuestionsGate();
}

// Add Questions requires a loaded (non-empty) bank — gates the Compose/Paste
// form behind a message pointing back to Upload File, rather than letting
// Add Questions be used to spin up a bank from nothing.
function updateQmAddQuestionsGate() {
    const gate = document.getElementById('qmAddQuestionsGate');
    const grid = document.getElementById('qmAddQuestionsGrid');
    if (!gate || !grid) return;
    const hasBank = questionBank.length > 0;
    gate.classList.toggle('hidden', hasBank);
    grid.classList.toggle('hidden', !hasBank);
}

// Attach events to category headers for collapse/expand
function attachCategoryHeaderEvents() {
    document.querySelectorAll('.qm-category-header').forEach(header => {
        header.addEventListener('click', (e) => {
            const category = header.dataset.category;
            const body = header.nextElementSibling;
            const chevron = header.querySelector('.qm-category-chevron');
            
            const isHidden = body.classList.contains('hidden');
            body.classList.toggle('hidden', !isHidden);
            chevron.classList.toggle('collapsed', isHidden);
            
            // Store state (new state after toggle)
            if (!questionManagerState.collapsedCategories) {
                questionManagerState.collapsedCategories = {};
            }
            questionManagerState.collapsedCategories[category] = !isHidden;
        });
    });
}

// Attach events to "Select All in Category" buttons (toggle)
function attachSelectCategoryButtons() {
    document.querySelectorAll('.qm-select-category-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent triggering the collapse/expand
            const category = btn.dataset.category;
            
            // Get all questions in this category from questionBank
            const categoryQuestions = questionBank.filter(q => q.category === category);

            if (categoryQuestions.length === 0) {
                showToast(`⚠️ No questions in "${category}"`, 'warning');
                return;
            }

            // Check if all questions in this category are already selected
            const allSelected = categoryQuestions.every(q => questionManagerState.selectedQuestions.has(q.__uid));

            if (allSelected) {
                categoryQuestions.forEach(q => {
                    questionManagerState.selectedQuestions.delete(q.__uid);
                });
                showToast(`❌ Deselected ${categoryQuestions.length} question(s)`, 'success');
            } else {
                categoryQuestions.forEach(q => {
                    questionManagerState.selectedQuestions.add(q.__uid);
                });
                showToast(`✅ Selected ${categoryQuestions.length} question(s)`, 'success');
            }

            renderQuestionManagerList();
            updateDeleteButtonState();
            updateChangeCategoryButtonState();
        });
    });
}

// Select/Deselect all visible questions (respecting filters and search)
function selectAllVisibleQuestions() {
    // Step 1: Rebuild the filtered list (same logic as renderQuestionManagerList)
    let filtered = questionBank.filter(q => {
        const searchLower = questionManagerState.searchText.toLowerCase();
        return (q.question || '').toLowerCase().includes(searchLower) ||
               (q.category || '').toLowerCase().includes(searchLower);
    });

    // Step 2: Apply category/type filter
    if (questionManagerState.filterBy !== 'all') {
        if (questionManagerState.filterBy === 'mcq') {
            filtered = filtered.filter(q => q.type === 'multiple_choice');
        } else if (questionManagerState.filterBy === 'tf') {
            filtered = filtered.filter(q => q.type === 'true_false');
        } else if (questionManagerState.filterBy === 'matching') {
            filtered = filtered.filter(q => q.type === 'matching');
        } else if (questionManagerState.filterBy === 'diff-unset') {
            filtered = filtered.filter(q => !q.difficulty || q.difficulty === 'unset');
        } else if (questionManagerState.filterBy === 'diff-easy') {
            filtered = filtered.filter(q => q.difficulty === 'easy');
        } else if (questionManagerState.filterBy === 'diff-medium') {
            filtered = filtered.filter(q => q.difficulty === 'medium');
        } else if (questionManagerState.filterBy === 'diff-hard') {
            filtered = filtered.filter(q => q.difficulty === 'hard');
        } else {
            filtered = filtered.filter(q => q.category === questionManagerState.filterBy);
        }
    }

    if (filtered.length === 0) {
        showToast('⚠️ No questions match current filters.', 'warning');
        return;
    }

    // Step 3: Check if all visible questions are already selected
    const allSelected = filtered.every(q => questionManagerState.selectedQuestions.has(q.__uid));

    // Step 4: Select or deselect all visible questions
    if (allSelected) {
        // Deselect all visible questions
        filtered.forEach(q => {
            questionManagerState.selectedQuestions.delete(q.__uid);
        });
        showToast(`❌ Deselected ${filtered.length} question(s)`, 'success');
    } else {
        // Select all visible questions
        filtered.forEach(q => {
            questionManagerState.selectedQuestions.add(q.__uid);
        });
        showToast(`✅ Selected ${filtered.length} question(s)`, 'success');
    }

    // Step 5: Update UI
    renderQuestionManagerList();
    updateDeleteButtonState();
    updateChangeCategoryButtonState();
}

// Attach event listener to "Select All Visible" button
function attachSelectVisibleButton() {
    const btn = document.getElementById('qm-select-visible-btn');
    if (!btn) return;

    // Remove old listener to prevent stacking
    const newBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(newBtn, btn);

    newBtn.addEventListener('click', (e) => {
        e.preventDefault();
        selectAllVisibleQuestions();
    });
}

// Attach Question Manager event listeners
function attachQuestionManagerEventListeners(filtered) {
    // Checkboxes
    document.querySelectorAll('.qm-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
            const uid = parseInt(e.target.dataset.uid, 10);
            if (e.target.checked) {
                questionManagerState.selectedQuestions.add(uid);
            } else {
                questionManagerState.selectedQuestions.delete(uid);
            }
            updateDeleteButtonState();
            updateChangeCategoryButtonState();
        });
    });

    // Edit buttons
    document.querySelectorAll('.qm-edit-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const idx = parseInt(e.target.dataset.filteredIdx);
            questionManagerState.editingIndex = idx;
            const q = filtered[idx];
            if (q.type === 'matching') {
                questionManagerState.editFormData[idx] = {
                    category: q.category || '',
                    type: 'matching',
                    question: q.question || '',
                    correct: q.correct || ''
                };
            } else {
                questionManagerState.editFormData[idx] = {
                    category: q.category || '',
                    type: q.type || 'multiple_choice',
                    question: q.question || '',
                    correct: q.correct || '',
                    choices: q.choices ? [...q.choices] : ['', '', '', '']
                };
            }
            renderQuestionManagerList();
        });
    });

    // Save edit button
    document.querySelectorAll('.qm-edit-save-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const idx = parseInt(e.target.dataset.filteredIdx);
            saveQuestionEdit(idx, filtered);
        });
    });

    // Cancel edit button
    document.querySelectorAll('.qm-edit-cancel-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const idx = parseInt(e.target.dataset.filteredIdx);
            questionManagerState.editingIndex = null;
            if (questionManagerState.editFormData[idx]) {
                delete questionManagerState.editFormData[idx];
            }
            renderQuestionManagerList();
        });
    });

    // Mark-correct buttons (check/X icons) - click to swap a choice into the correct slot
    document.querySelectorAll('.qm-mark-correct-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const idx = parseInt(btn.dataset.filteredIdx);
            const choiceIdx = parseInt(btn.dataset.choiceIdx);
            captureEditFormFromDom(idx);
            const data = questionManagerState.editFormData[idx];
            if (!data || !data.choices) return;
            while (data.choices.length <= choiceIdx) data.choices.push('');
            if (choiceIdx !== 0) {
                const [picked] = data.choices.splice(choiceIdx, 1);
                data.choices.unshift(picked);
            }
            data.correct = data.choices[0] || '';
            renderQuestionManagerList();
        });
    });

    // Toggle Choice E button (add/remove the 5th choice)
    document.querySelectorAll('.qm-toggle-choice-e-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const idx = parseInt(btn.dataset.filteredIdx);
            captureEditFormFromDom(idx);
            const data = questionManagerState.editFormData[idx];
            if (!data || !data.choices) return;
            while (data.choices.length < 4) data.choices.push('');
            const hasE = data.choices.length >= 5 && data.choices[4];
            if (hasE) {
                data.choices.length = 4;
            } else {
                data.choices[4] = '';
            }
            renderQuestionManagerList();
        });
    });
}

// Read the currently-typed values out of the edit form's DOM inputs and
// store them into editFormData, so state survives a re-render (e.g. when
// marking a different choice correct or toggling Choice E).
function captureEditFormFromDom(idx) {
    const category = document.querySelector(`.qm-edit-category[data-filtered-idx="${idx}"]`)?.value;
    const type = document.querySelector(`.qm-edit-type[data-filtered-idx="${idx}"]`)?.value;
    const question = document.querySelector(`.qm-edit-question[data-filtered-idx="${idx}"]`)?.value;

    const existing = questionManagerState.editFormData[idx] || {};
    const data = {
        ...existing,
        category: category !== undefined ? category : existing.category,
        type: type !== undefined ? type : existing.type,
        question: question !== undefined ? question : existing.question
    };

    if (data.type === 'multiple_choice') {
        const choiceInputs = document.querySelectorAll(`.qm-edit-choice[data-filtered-idx="${idx}"]`);
        if (choiceInputs.length) {
            const choices = [];
            choiceInputs.forEach(input => {
                choices[parseInt(input.dataset.choiceIdx)] = input.value;
            });
            data.choices = choices;
        }
    }

    questionManagerState.editFormData[idx] = data;
    return data;
}

function saveQuestionEdit(idx, filtered) {
    const category = document.querySelector(`.qm-edit-category[data-filtered-idx="${idx}"]`)?.value || '';
    const type = document.querySelector(`.qm-edit-type[data-filtered-idx="${idx}"]`)?.value || 'multiple_choice';
    const question = document.querySelector(`.qm-edit-question[data-filtered-idx="${idx}"]`)?.value || '';

    let correct = '';
    let choices = null;
    let pairs = null;

    if (type === 'multiple_choice') {
        const choiceInputs = document.querySelectorAll(`.qm-edit-choice[data-filtered-idx="${idx}"]`);
        choices = [];
        choiceInputs.forEach(input => {
            const choiceIdx = parseInt(input.dataset.choiceIdx);
            choices[choiceIdx] = input.value;
        });

        // The first choice slot is always the correct answer (see allChoices
        // reordering in renderQuestionManagerList / markChoiceCorrect).
        correct = choices[0] || '';
    } else if (type === 'true_false') {
        const tfRadio = document.querySelector(`input[name="qm-edit-correct-${idx}"].qm-edit-tf-radio:checked`);
        if (tfRadio) {
            correct = tfRadio.value;
        }
    } else if (type === 'matching') {
        // For matching type, just update the single item (premise/correct answer)
        correct = document.querySelector(`.qm-edit-correct[data-filtered-idx="${idx}"]`)?.value || '';
    }

    const originalQuestion = filtered[idx];
    const originalIdx = questionBank.indexOf(originalQuestion);

    if (originalIdx !== -1) {
        questionBank[originalIdx] = {
            ...originalQuestion,
            category,
            type,
            question,
            correct,
            choices: type === 'multiple_choice' ? choices : (type === 'matching' ? [null, null, null, null] : null)
        };
    }

    saveQBankToStorage();
    questionManagerState.editingIndex = null;
    if (questionManagerState.editFormData[idx]) {
        delete questionManagerState.editFormData[idx];
    }
    renderQuestionManagerList();
    showToast('✅ Question updated', 'success');
}

function updateDeleteButtonState() {
    const btn = document.getElementById('qm-delete-selected-btn');
    if (btn) {
        const count = questionManagerState.selectedQuestions.size;
        btn.disabled = count === 0;
        btn.textContent = `Delete Selected (${count})`;
    }
}

function updateChangeCategoryButtonState() {
    const btn = document.getElementById('qm-change-cat-btn');
    if (btn) {
        btn.disabled = questionManagerState.selectedQuestions.size === 0;
    }
    const diffBtn = document.getElementById('qm-bulk-difficulty-btn');
    if (diffBtn) {
        diffBtn.disabled = questionManagerState.selectedQuestions.size === 0;
    }
}

function deleteSelectedQuestions() {
    if (questionManagerState.selectedQuestions.size === 0) {
        showToast('⚠️ No questions selected.', 'warning');
        return;
    }

    const count = questionManagerState.selectedQuestions.size;
    if (!confirm(`Delete ${count} question(s)?`)) {
        return;
    }

    const selectedUids = questionManagerState.selectedQuestions;

    const snapshot = [...questionBank];

    // Remove them from questionBank
    const newBank = questionBank.filter(q => !selectedUids.has(q.__uid));

    questionBank = newBank;
    saveQBankToStorage();
    questionManagerState.selectedQuestions.clear();
    renderQuestionManagerList();
    updateDeleteButtonState();
    pushUndo(`Deleted ${count} question(s)`, () => {
        questionBank = snapshot;
        saveQBankToStorage();
        renderQuestionManagerList();
        showToast('✅ Change undone', 'success');
    });
    const undoHtml = `<span>🗑️ Deleted ${count} question(s). <button onclick="performUndo()" style="background:#fff;color:#333;padding:4px 8px;border-radius:4px;cursor:pointer;margin-left:8px;border:1px solid #ccc;">Undo</button></span>`;
    showToast(undoHtml, 'warning', 5000, true);
}

function changeSelectedQuestionsCategory() {
    if (questionManagerState.selectedQuestions.size === 0) {
        showToast('⚠️ No questions selected.', 'warning');
        return;
    }

    const newCat = document.getElementById('qm-change-cat-input')?.value.trim();
    if (!newCat) {
        showToast('⚠️ Please enter a new category name.', 'warning');
        return;
    }

    // Clone each question, not just the array, so mutating q.category below
    // doesn't also corrupt the undo snapshot (they'd otherwise share objects).
    const snapshot = questionBank.map(q => ({ ...q }));

    const selectedUids = questionManagerState.selectedQuestions;
    let changedCount = 0;
    questionBank.forEach(q => {
        if (selectedUids.has(q.__uid)) {
            q.category = newCat;
            changedCount++;
        }
    });

    saveQBankToStorage();
    questionManagerState.selectedQuestions.clear();
    renderQuestionManagerList();
    pushUndo(`Changed category to "${newCat}"`, () => {
        questionBank = snapshot;
        saveQBankToStorage();
        renderQuestionManagerList();
        showToast('✅ Change undone', 'success');
    });
    const undoHtml = `<span>✅ Changed category to "${escapeHtml(newCat)}" for ${changedCount} question(s). <button onclick="performUndo()" style="background:#fff;color:#333;padding:4px 8px;border-radius:4px;cursor:pointer;margin-left:8px;border:1px solid #ccc;">Undo</button></span>`;
    showToast(undoHtml, 'success', 5000, true);
}

function updateQuestionManagerCategories() {
    const filterSelect = document.getElementById('qm-filter-select');
    if (filterSelect) {
        const categories = [...new Set(questionBank.map(q => q.category))].sort();
        const currentValue = filterSelect.value;

        // Count per type for static options
        const total = questionBank.length;
        const mcqCount = questionBank.filter(q => q.type === 'multiple_choice').length;
        const tfCount  = questionBank.filter(q => q.type === 'true_false').length;
        const mtCount  = questionBank.filter(q => q.type === 'matching').length;
        const unsetCount  = questionBank.filter(q => !q.difficulty || q.difficulty === 'unset').length;
        const easyCount   = questionBank.filter(q => q.difficulty === 'easy').length;
        const mediumCount = questionBank.filter(q => q.difficulty === 'medium').length;
        const hardCount   = questionBank.filter(q => q.difficulty === 'hard').length;

        const optionsHtml = `
            <option value="all">All Questions (${total})</option>
            <option value="mcq">Multiple Choice Only (${mcqCount})</option>
            <option value="tf">True/False Only (${tfCount})</option>
            <option value="matching">Matching Only (${mtCount})</option>
            <option value="diff-unset">Difficulty: Unset (${unsetCount})</option>
            <option value="diff-easy">Difficulty: Easy (${easyCount})</option>
            <option value="diff-medium">Difficulty: Medium (${mediumCount})</option>
            <option value="diff-hard">Difficulty: Hard (${hardCount})</option>
        ` + categories.map(cat => {
            const n = questionBank.filter(q => q.category === cat).length;
            return `<option value="${escapeHtml(cat)}">${escapeHtml(cat)} (${n})</option>`;
        }).join('');

        filterSelect.innerHTML = optionsHtml;
        filterSelect.value = currentValue;
    }
}

// Initialize Question Manager state
function initializeQuestionManager() {
    // Initialize collapsedCategories object (categories collapsed by default)
    if (!questionManagerState.collapsedCategories) {
        questionManagerState.collapsedCategories = {};
    }
    // Mark all existing categories as collapsed initially
    const categories = [...new Set(questionBank.map(q => q.category))];
    categories.forEach(cat => {
        if (!(cat in questionManagerState.collapsedCategories)) {
            questionManagerState.collapsedCategories[cat] = true; // true = collapsed
        }
    });

    // Search input
    const searchInput = document.getElementById('qm-search-input');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            questionManagerState.searchText = e.target.value;
            renderQuestionManagerList();
        });
    }

    // Sort toggle buttons
    const sortBtns = document.querySelectorAll('.qm-sort-btn');
    function updateSortBtnStyles() {
        sortBtns.forEach(btn => {
            const active = btn.dataset.sort === questionManagerState.sortBy;
            btn.className = `qm-sort-btn flex-1 px-2 py-1.5 rounded text-xs font-medium ${
                active ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`;
        });
    }
    sortBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            questionManagerState.sortBy = btn.dataset.sort;
            updateSortBtnStyles();
            renderQuestionManagerList();
        });
    });
    updateSortBtnStyles();

    // Filter select
    const filterSelect = document.getElementById('qm-filter-select');
    if (filterSelect) {
        filterSelect.addEventListener('change', (e) => {
            questionManagerState.filterBy = e.target.value;
            renderQuestionManagerList();
        });
    }

    // Compact/Comfortable view toggle
    const compactBtn = document.getElementById('qm-compact-toggle');
    if (compactBtn) {
        compactBtn.textContent = questionManagerState.compactView ? '☰' : '▤';
        compactBtn.addEventListener('click', () => {
            questionManagerState.compactView = !questionManagerState.compactView;
            localStorage.setItem('coeus-compact-view', questionManagerState.compactView);
            compactBtn.textContent = questionManagerState.compactView ? '☰' : '▤';
            renderQuestionManagerList();
        });
    }

    // Delete selected button
    const deleteBtn = document.getElementById('qm-delete-selected-btn');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', deleteSelectedQuestions);
    }

    // Change category button
    const changeCatBtn = document.getElementById('qm-change-cat-btn');
    if (changeCatBtn) {
        changeCatBtn.addEventListener('click', changeSelectedQuestionsCategory);
    }

    // Bulk set difficulty button
    const bulkDiffBtn = document.getElementById('qm-bulk-difficulty-btn');
    if (bulkDiffBtn) {
        bulkDiffBtn.addEventListener('click', () => {
            const selected = questionManagerState.selectedQuestions;
            if (selected.size === 0) return;
            const difficulty = document.getElementById('qm-bulk-difficulty-select')?.value || 'unset';
            let count = 0;
            questionBank.forEach(q => {
                if (selected.has(JSON.stringify(q))) {
                    q.difficulty = difficulty;
                    count++;
                }
            });
            saveQBankToStorage();
            renderQuestionManagerList();
            showToast(`✅ Set difficulty to "${difficulty}" for ${count} question${count !== 1 ? 's' : ''}.`, 'success');
        });
    }

    // Inner tabs for Question Manager (bank-editor is now the only tab)
    document.querySelectorAll('.qm-inner-tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const tabName = e.target.dataset.qmTab;
            document.querySelectorAll('.qm-inner-content').forEach(c => c.classList.remove('active'));
            document.getElementById(`qm-${tabName}`)?.classList.add('active');
            document.querySelectorAll('.qm-inner-tab-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            if (tabName === 'bank-editor') renderQuestionManagerList();
        });
    });

    setupQmAddQuestionsForm();
    renderQuestionManagerList();
}

// "Add Questions" inner tab of Manage a Bank - composes a question and
// pushes it straight into questionBank (unlike the Write Questions tab,
// which targets the separate examBank array).
function setupQmAddQuestionsForm() {
    const typeSelect = document.getElementById('qmAddType');
    if (!typeSelect || typeSelect.dataset.qmWired) { refreshQmPreview(); return; } // avoid double-wiring on re-render
    typeSelect.dataset.qmWired = 'true';

    // Compose Question / Paste Text sub-tabs
    const addSubTab = document.getElementById('qmAddSubTab');
    const pasteSubTab = document.getElementById('qmPasteSubTab');
    const addPanel = document.getElementById('qmAddPanel');
    const pastePanel = document.getElementById('qmPastePanel');
    function activateSubTab(which) {
        const isAdd = which === 'add';
        if (addPanel)   { addPanel.classList.toggle('hidden', !isAdd); addPanel.classList.toggle('flex', isAdd); }
        if (pastePanel) { pastePanel.classList.toggle('hidden', isAdd); pastePanel.classList.toggle('flex', !isAdd); }
        if (addSubTab)   { addSubTab.classList.toggle('bg-blue-500', isAdd); addSubTab.classList.toggle('text-white', isAdd); addSubTab.classList.toggle('bg-gray-200', !isAdd); addSubTab.classList.toggle('text-gray-700', !isAdd); }
        if (pasteSubTab) { pasteSubTab.classList.toggle('bg-blue-500', !isAdd); pasteSubTab.classList.toggle('text-white', !isAdd); pasteSubTab.classList.toggle('bg-gray-200', isAdd); pasteSubTab.classList.toggle('text-gray-700', isAdd); }
    }
    if (addSubTab)   addSubTab.addEventListener('click',   () => activateSubTab('add'));
    if (pasteSubTab) pasteSubTab.addEventListener('click', () => activateSubTab('paste'));

    function updateSections() {
        const v = typeSelect.value;
        document.getElementById('qmAddChoicesSection')?.classList.toggle('hidden', v !== 'multiple_choice');
        document.getElementById('qmAddTrueFalseSection')?.classList.toggle('hidden', v !== 'true_false');
        document.getElementById('qmAddMatchingSection')?.classList.toggle('hidden', v !== 'matching');
        if (v !== 'multiple_choice') document.getElementById('qmAddQuestionWarning')?.classList.add('hidden');
    }
    typeSelect.addEventListener('change', updateSections);
    updateSections();

    const choiceEBtn = document.getElementById('qmAddToggleChoiceEBtn');
    const choiceERow = document.getElementById('qmAddChoiceERow');
    if (choiceEBtn && choiceERow) {
        choiceEBtn.addEventListener('click', () => {
            const hidden = choiceERow.classList.toggle('hidden');
            choiceEBtn.textContent = hidden ? '+ Add Choice E' : '− Remove Choice E';
        });
    }

    const addPairBtn = document.getElementById('qmAddMatchingPair');
    if (addPairBtn) {
        addPairBtn.addEventListener('click', () => {
            const colA = document.getElementById('qmAddMatchingColumnA');
            const colB = document.getElementById('qmAddMatchingColumnB');
            if (!colA || !colB) return;
            const idx = colA.children.length + 1;
            colA.insertAdjacentHTML('beforeend', `<div><input type="text" class="w-full rounded border text-sm px-2 py-1.5" placeholder="Premise ${idx}"></div>`);
            colB.insertAdjacentHTML('beforeend', `<div><input type="text" class="w-full rounded border text-sm px-2 py-1.5" placeholder="Answer ${idx}"></div>`);
        });
    }

    function showQmAddQuestionWarning(msg) {
        const w = document.getElementById('qmAddQuestionWarning');
        if (!w) return;
        if (msg) { w.textContent = '⚠️ ' + msg; w.classList.remove('hidden'); }
        else { w.textContent = ''; w.classList.add('hidden'); }
    }

    const form = document.getElementById('qmAddQuestionForm');
    if (!form) return;
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const type = typeSelect.value;
        const subject = (document.getElementById('qmAddSubject')?.value || '').trim();
        const cat = (document.getElementById('qmAddCategory')?.value || '').trim() || 'Uncategorized';
        const diff = document.getElementById('qmAddDifficulty')?.value || 'unset';
        const qText = (document.getElementById('qmAddQuestion')?.value || '').trim();
        if (!qText && type !== 'matching') { showToast('⚠️ Question text is required.', 'warning'); return; }
        if (type !== 'multiple_choice') showQmAddQuestionWarning('');

        let q = { subject, category: cat, type, difficulty: diff, question: qText };

        if (type === 'multiple_choice') {
            const correctVal = (document.getElementById('qmAddCorrectChoiceInput')?.value || '').trim();
            const wrongInputs = document.querySelectorAll('#qmAddChoicesContainer .qm-add-choice-input:not(.hidden) .qm-add-wrong-choice-input');
            const wrongVals = [...wrongInputs].map(i => i.value.trim()).filter(Boolean);
            const err = mcqChoiceValidationError(correctVal, wrongVals);
            if (err) { showQmAddQuestionWarning(err); return; }
            showQmAddQuestionWarning('');
            q.choices = [correctVal, ...wrongVals];
            q.correct = correctVal;
        } else if (type === 'true_false') {
            const checked = document.querySelector('input[name="qmAddTfCorrect"]:checked');
            if (!checked) { showToast('⚠️ Please select True or False.', 'warning'); return; }
            q.choices = [null, null, null, null];
            q.correct = checked.value;
        } else if (type === 'matching') {
            const aInputs = document.querySelectorAll('#qmAddMatchingColumnA input');
            const bInputs = document.querySelectorAll('#qmAddMatchingColumnB input');
            let added = 0;
            aInputs.forEach((a, i) => {
                const b = bInputs[i];
                if (a.value.trim() && b && b.value.trim()) {
                    questionBank.push({ subject, category: cat, type: 'matching', difficulty: diff, question: a.value.trim(), choices: [null, null, null, null], correct: b.value.trim() });
                    added++;
                }
            });
            if (added === 0) { showToast('⚠️ Add at least one premise/answer pair.', 'warning'); return; }
            assignQuestionUids(questionBank);
            saveQBankToStorage();
            renderQuestionManagerList();
            form.reset();
            updateSections();
            document.getElementById('qmAddMatchingColumnA').innerHTML = '';
            document.getElementById('qmAddMatchingColumnB').innerHTML = '';
            showToast(`✅ Added ${added} matching question(s).`, 'success');
            return;
        }

        questionBank.push(q);
        assignQuestionUids(questionBank);
        saveQBankToStorage();
        renderQuestionManagerList();
        form.reset();
        updateSections();
        if (choiceERow) { choiceERow.classList.add('hidden'); const inp = choiceERow.querySelector('input[type="text"]'); if (inp) inp.value = ''; }
        if (choiceEBtn) choiceEBtn.textContent = '+ Add Choice E';
        showToast('✅ Question added to bank.', 'success');
    });

    // Paste Text panel
    function showQmPasteWarning(msg) {
        const w = document.getElementById('qmPasteWarning');
        if (!w) return;
        if (msg) { w.textContent = '⚠️ ' + msg; w.classList.remove('hidden'); }
        else { w.textContent = ''; w.classList.add('hidden'); }
    }
    const pasteConvertBtn = document.getElementById('qmPasteConvertBtn');
    if (pasteConvertBtn) {
        pasteConvertBtn.addEventListener('click', () => {
            showQmPasteWarning('');
            const text = (document.getElementById('qmPasteInput')?.value || '').trim();
            if (!text) { showQmPasteWarning('No text to convert. Paste your questions above.'); return; }
            const subject = (document.getElementById('qmPasteSubject')?.value || '').trim();
            const category = (document.getElementById('qmPasteCategory')?.value || '').trim() || 'Uncategorized';
            const diff = document.getElementById('qmPasteDifficulty')?.value || 'unset';
            const hasNumbered = /^\d+\.\s/m.test(text);
            if (!hasNumbered) {
                showQmPasteWarning('Format not recognized. Each question must start with a number, period, and space (e.g. "1. Question text"). See Show Tips for formatting rules.');
                return;
            }
            try {
                const qs = parsePlainTextToJson(text, subject, category);
                if (!qs.length) {
                    showQmPasteWarning('No questions could be parsed. Check that your questions follow the plain-text format rules. See Show Tips for details.');
                    return;
                }
                const noCorrect = qs.filter(q => q.type === 'multiple_choice' && !q.correct);
                if (noCorrect.length) {
                    showQmPasteWarning(`${noCorrect.length} multiple choice question(s) have no correct answer marked. Prefix the correct choice with = or *.`);
                    return;
                }
                const tooFewChoices = qs.filter(q => q.type === 'multiple_choice' && (q.choices || []).filter(c => (c || '').toString().trim()).length < 4);
                if (tooFewChoices.length) {
                    showQmPasteWarning(`${tooFewChoices.length} multiple choice question(s) have fewer than 4 choices. MCQ requires 4 to 5 choices (a., b., c., d., optionally e.).`);
                    return;
                }
                qs.forEach(q => { q.difficulty = diff; });
                questionBank.push(...qs);
                assignQuestionUids(questionBank);
                saveQBankToStorage();
                renderQuestionManagerList();
                document.getElementById('qmPasteInput').value = '';
                document.getElementById('qmPasteSubject').value = '';
                document.getElementById('qmPasteCategory').value = '';
                document.getElementById('qmPasteDifficulty').value = 'unset';
                showToast(`✅ Added ${qs.length} question(s).`, 'success');
            } catch (err) {
                showQmPasteWarning(err.message);
                showToast('❌ ' + err.message, 'error');
            }
        });
    }

    // Preview format toggles
    const previewBtns = {
        json: document.getElementById('qmPreviewJson'),
        csv:  document.getElementById('qmPreviewCsv'),
        gift: document.getElementById('qmPreviewGift'),
        txt:  document.getElementById('qmPreviewTxt'),
    };
    Object.entries(previewBtns).forEach(([fmt, btn]) => {
        if (!btn) return;
        btn.addEventListener('click', () => {
            questionManagerState.previewFormat = fmt;
            Object.values(previewBtns).forEach(b => { if (b) { b.classList.remove('bg-blue-500', 'text-white'); b.classList.add('bg-gray-200', 'text-gray-700'); } });
            btn.classList.add('bg-blue-500', 'text-white'); btn.classList.remove('bg-gray-200', 'text-gray-700');
            refreshQmPreview();
        });
    });

    // Top/Bottom scroll jump toggle
    const jumpBtn = document.getElementById('qmPreviewJumpToggle');
    const jumpContainer = document.getElementById('qmPreviewOutputContainer');
    if (jumpBtn && jumpContainer) {
        function isNearTop() {
            const maxScroll = jumpContainer.scrollHeight - jumpContainer.clientHeight;
            return maxScroll <= 0 || jumpContainer.scrollTop <= maxScroll / 2;
        }
        function updateJumpLabel() {
            jumpBtn.textContent = isNearTop() ? '↓ Bottom' : '↑ Top';
        }
        jumpBtn.addEventListener('click', () => {
            jumpContainer.scrollTop = isNearTop() ? jumpContainer.scrollHeight : 0;
            updateJumpLabel();
        });
        jumpContainer.addEventListener('scroll', updateJumpLabel);
        updateJumpLabel();
    }

    refreshQmPreview();
}

// Parses a CSV string into rows, respecting quoted fields.
function qmParseCsvToRows(csvStr) {
    return csvStr.trim().split('\n').map(r => {
        const res = []; let cur = '', inQ = false;
        for (let i = 0; i < r.length; i++) {
            const c = r[i];
            if (c === '"') { inQ = !inQ; }
            else if (c === ',' && !inQ) { res.push(cur); cur = ''; }
            else { cur += c; }
        }
        res.push(cur); return res;
    });
}
function qmRenderCsvTable(csvStr) {
    const rows = qmParseCsvToRows(csvStr);
    if (rows.length < 2) return '<p class="text-xs text-gray-400 p-2">No data</p>';
    const hdr = rows[0].map(h => `<th class="px-3 py-2 border border-gray-300 text-left font-semibold text-gray-700 bg-gray-100 whitespace-nowrap text-xs">${h}</th>`).join('');
    const bdy = rows.slice(1).map((row, ri) =>
        '<tr class="' + (ri % 2 === 0 ? 'bg-white' : 'bg-gray-50') + '">' +
        row.map(cell => `<td class="px-3 py-1.5 border border-gray-200 text-gray-700 max-w-xs truncate text-xs">${cell || ''}</td>`).join('') + '</tr>'
    ).join('');
    return `<div class="overflow-auto max-h-96"><table class="min-w-full text-xs border-collapse"><thead><tr>${hdr}</tr></thead><tbody>${bdy}</tbody></table></div>`;
}

// Preview panel for the "Add Questions" tab - shows the live questionBank
// contents in the selected format. Read-only; no export/send controls
// (those already live in the Download File section above Edit Bank).
function refreshQmPreview() {
    const container = document.getElementById('qmPreviewOutputContainer');
    if (!container) return;
    const format = questionManagerState.previewFormat || 'json';
    const emptyState = document.getElementById('qmPreviewEmptyState');
    const pre = container.querySelector('pre');
    if (!questionBank.length) {
        if (emptyState) emptyState.classList.remove('hidden');
        if (pre) pre.classList.add('hidden');
        return;
    }
    if (emptyState) emptyState.classList.add('hidden');
    if (pre) pre.classList.remove('hidden');
    if (format === 'csv') {
        container.innerHTML = qmRenderCsvTable(convertJsonToCsv(questionBank));
    } else {
        if (!document.getElementById('qmPreviewOutput')) {
            container.innerHTML = '<pre class="text-xs"><code id="qmPreviewOutput"></code></pre>';
        }
        const out = document.getElementById('qmPreviewOutput');
        if (!out) return;
        let str = '';
        if (format === 'json') str = JSON.stringify(questionBank, null, 2);
        else if (format === 'txt') str = questionsToPlainText(questionBank);
        else if (format === 'gift') str = questionsToGift(questionBank);
        out.textContent = str;
        if (window.Prism && format === 'json') Prism.highlightElement(out);
    }
}
