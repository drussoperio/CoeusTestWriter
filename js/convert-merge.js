// ========================================
// TXT/JSON CONVERSION, JSON MERGER, GIFT CONVERTER
// ========================================

function parseTxtToJSON(txtData) {
    const lines = txtData.trim().split('\n');
    const headers = lines[0].split('\t');

    return lines.slice(1).map(line => {
        const values = line.split('\t');
        const questionObject = {};

        headers.forEach((header, index) => {
            const formattedHeader = header.trim().toLowerCase();
            const value = values[index].trim();

            if (formattedHeader.startsWith('option')) {
                if (!questionObject.choices) {
                    questionObject.choices = [];
                }
                questionObject.choices.push(value);
            } else if (formattedHeader === 'correct') {
                questionObject.correct = value;
            } else {
                questionObject[formattedHeader] = value;
            }
        });

        return questionObject;
    });
}

// Parse a CSV string into an array of rows (arrays of field strings), honoring quoted fields
function parseCsvRows(text) {
    const rows = [];
    let row = [];
    let field = '';
    let inQuotes = false;
    for (let i = 0; i < text.length; i++) {
        const c = text[i];
        if (inQuotes) {
            if (c === '"') {
                if (text[i + 1] === '"') { field += '"'; i++; }
                else { inQuotes = false; }
            } else {
                field += c;
            }
        } else {
            if (c === '"') {
                inQuotes = true;
            } else if (c === ',') {
                row.push(field); field = '';
            } else if (c === '\r') {
                // skip
            } else if (c === '\n') {
                row.push(field); field = '';
                rows.push(row); row = [];
            } else {
                field += c;
            }
        }
    }
    if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
    return rows.filter(r => !(r.length === 1 && r[0] === ''));
}

// Escape a single CSV field
function csvEscape(value) {
    const str = (value === undefined || value === null) ? '' : String(value);
    if (/[",\n\r]/.test(str)) {
        return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
}

function convertCsvToJson(text) {
    const rows = parseCsvRows(text);
    if (rows.length < 2) {
        throw new Error("The file must contain at least one question plus headers.");
    }

    const headers = rows[0];
    const hasDifficulty = headers[3]?.toLowerCase() === 'difficulty';
    const has5 = headers[headers.length - 1]?.toLowerCase().includes('option 5') || headers[headers.length - 1]?.toLowerCase().includes('5');
    const expectedCols = hasDifficulty ? (has5 ? 10 : 9) : (has5 ? 9 : 8);

    if (headers[0] !== "Question") {
        throw new Error("Invalid format. Ensure the first row starts with: Question, Category, Type, [Difficulty,] Correct, Option 1, Option 2, Option 3, Option 4[, Option 5]");
    }

    const questions = [];

    for (let i = 1; i < rows.length; i++) {
        const values = rows[i];
        if (values.length < expectedCols - 1) {
            throw new Error(`Invalid row format at line ${i + 1}. Expected ${expectedCols} columns.`);
        }

        let question, category, type, difficulty, correct, option1, option2, option3, option4, option5;
        if (hasDifficulty) {
            [question, category, type, difficulty, correct, option1, option2, option3, option4, option5] = values;
        } else {
            [question, category, type, correct, option1, option2, option3, option4, option5] = values;
            difficulty = 'unset';
        }

        // Build choices array, converting "null" strings to null
        const rawChoices = has5
            ? [option1, option2, option3, option4, option5]
            : [option1, option2, option3, option4];
        let choices = rawChoices.map(opt => {
            if (opt === undefined) return null;
            const trimmed = opt.trim();
            return trimmed === 'null' ? null : trimmed;
        });
        // Filter out null/empty values for MCQ
        if (type !== 'true_false' && type !== 'matching') {
            choices = choices.filter(c => c !== null && c !== '');
        }

        questions.push({
            question,
            category,
            type,
            difficulty: difficulty || 'unset',
            correct,
            choices
        });
    }

    return questions;
}

function convertJsonToCsv(jsonData) {
    // Check if any question has 5 choices
    const has5 = jsonData.some(item => item.choices && item.choices.filter(c => c !== null).length >= 5);
    const header = has5
        ? 'Question,Category,Type,Difficulty,Correct,Option 1,Option 2,Option 3,Option 4,Option 5\n'
        : 'Question,Category,Type,Difficulty,Correct,Option 1,Option 2,Option 3,Option 4\n';
    let csv = header;
    jsonData.forEach(item => {
        let choices = (item.choices || []).slice();
        const isTfOrMatch = item.type === 'true_false' || item.type === 'matching';
        const fillVal = isTfOrMatch ? 'null' : '';
        const targetLen = has5 ? 5 : 4;
        while (choices.length < targetLen) choices.push(fillVal);
        const difficulty = item.difficulty || 'unset';
        const row = [item.question || '', item.category || '', item.type || '', difficulty, item.correct || '',
            choices[0], choices[1], choices[2], choices[3]];
        if (has5) row.push(choices[4] ?? fillVal);
        csv += row.map(csvEscape).join(',') + '\n';
    });
    return csv;
}


// ========================================
// JSON MERGER
// ========================================

// Add files to the merger
function addMergerFiles() {
    const fileInput = document.getElementById('mergerFileInput');
    const files = fileInput.files;

    if (files.length === 0) {
        showToast('⚠️ Please select at least one JSON file.', 'warning');
        return;
    }

    let filesProcessed = 0;
    const totalFiles = files.length;

    Array.from(files).forEach(file => {
        const reader = new FileReader();
        
        reader.onload = function(e) {
            try {
                const data = JSON.parse(e.target.result);
                
                if (!Array.isArray(data)) {
                    showToast(`⚠️ File "${file.name}" is not a valid JSON array — skipping.`, "warning");
                    filesProcessed++;
                    if (filesProcessed === totalFiles) updateMergerDisplay();
                    return;
                }

                mergedQuestions.push(...data);
                
                mergerFileStats.push({
                    name: file.name,
                    count: data.length,
                    questions: data
                });

                filesProcessed++;
                
                if (filesProcessed === totalFiles) {
                    updateMergerDisplay();
                    fileInput.value = '';
                }
            } catch (error) {
                showToast(`❌ Error reading "${file.name}": ${error.message}`, "error");
                filesProcessed++;
                if (filesProcessed === totalFiles) updateMergerDisplay();
            }
        };

        reader.readAsText(file);
    });
}

// Update the display with current merged data
// ── Shared table style tokens ─────────────────────────────────────────────────
const TBL = {
    // Per-theme: [headerBg, headerText, headerBorder, totalBg, totalText, totalBorder, evenBg, oddBg, cellBorder]
    indigo: {
        hBg:'#4338ca', hTxt:'#ffffff', hBdr:'#4338ca',
        tBg:'#3730a3', tTxt:'#ffffff', tBdr:'#3730a3',
        eBg:'#f5f3ff', oBg:'#ede9fe', cBdr:'#c7d2fe'
    },
    red: {
        hBg:'#b91c1c', hTxt:'#ffffff', hBdr:'#b91c1c',
        tBg:'#991b1b', tTxt:'#ffffff', tBdr:'#991b1b',
        eBg:'#fff1f2', oBg:'#ffe4e6', cBdr:'#fecaca'
    },
    orange: {
        hBg:'#c2410c', hTxt:'#ffffff', hBdr:'#c2410c',
        tBg:'#9a3412', tTxt:'#ffffff', tBdr:'#9a3412',
        eBg:'#fff7ed', oBg:'#ffedd5', cBdr:'#fed7aa'
    },
    slate: {
        hBg:'#334155', hTxt:'#ffffff', hBdr:'#334155',
        tBg:'#1e293b', tTxt:'#ffffff', tBdr:'#1e293b',
        eBg:'#f8fafc', oBg:'#f1f5f9', cBdr:'#cbd5e1'
    },
    teal: {
        hBg:'#0f766e', hTxt:'#ffffff', hBdr:'#0f766e',
        tBg:'#0d6b63', tTxt:'#ffffff', tBdr:'#0d6b63',
        eBg:'#f0fdfa', oBg:'#ccfbf1', cBdr:'#99f6e4'
    },
};

function tblTh(t, text, align='center', extra='') {
    return `<th class="px-3 py-2 text-xs font-bold border" style="text-align:${align};background:${t.hBg};color:${t.hTxt};border-color:${t.hBdr};${extra}">${text}</th>`;
}
function tblTd(t, text, align='center', extra='') {
    return `<td class="px-3 py-1.5 text-xs border" style="text-align:${align};border-color:${t.cBdr};${extra}">${text}</td>`;
}
function tblTotalTd(t, text, align='center', extra='') {
    return `<td class="px-3 py-1.5 text-xs font-bold border" style="text-align:${align};background:${t.tBg};color:${t.tTxt};border-color:${t.tBdr};${extra}">${text}</td>`;
}
function tblRowBg(t, i) { return i % 2 === 0 ? t.eBg : t.oBg; }

const SUMMARY_ICON = `<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2"/></svg>`;

function updateMergerDisplay() {
    const summaryDiv = document.getElementById('mergerSummary');
    const outputPre = document.getElementById('mergerOutput');

    const mergerEmpty = document.getElementById('mergerEmptyState');
    const mergerPre = outputPre ? outputPre.closest('pre') : null;
    if (mergedQuestions.length === 0) {
        summaryDiv.innerHTML = `
            <p class="text-sm font-semibold mb-1 flex items-center gap-2" style="color:var(--text);">${SUMMARY_ICON}Summary</p>
            <p class="text-xs" style="color:var(--text-muted);">No files loaded yet. Click "Merge" to start.</p>
        `;
        outputPre.textContent = '';
        if (mergerEmpty) mergerEmpty.classList.remove('hidden');
        if (mergerPre) mergerPre.classList.add('hidden');
        renderMissingCorrectWarning('mergerMissingCorrectWarning', []);
        return;
    }
    if (mergerEmpty) mergerEmpty.classList.add('hidden');
    if (mergerPre) mergerPre.classList.remove('hidden');

    // ── Build comprehensive summary table ─────────────────────────────────
    const types = ['multiple_choice', 'true_false', 'matching'];
    const typeLabel = { multiple_choice: 'MCQ', true_false: 'T/F', matching: 'Matching' };
    const diffs = ['easy', 'medium', 'hard', 'unset'];
    const diffLabel = { easy: 'Easy', medium: 'Medium', hard: 'Hard', unset: 'Unset' };

    const tc = TBL.teal;
    let rows = '';
    let rowIdx = 0;
    let grandTotal = 0;
    const colTotals = { easy:0, medium:0, hard:0, unset:0, total:0 };

    mergerFileStats.forEach(fileStat => {
        const fileQs = fileStat.questions || [];
        const fileCats = [...new Set(fileQs.map(q => q.category || 'Uncategorized'))].sort();

        // Aggregate per-cat/type/diff for this file
        const data = {};
        fileCats.forEach(c => { data[c] = {}; types.forEach(tp => { data[c][tp] = { easy:0, medium:0, hard:0, unset:0, total:0 }; }); });
        fileQs.forEach(q => {
            const c = q.category || 'Uncategorized';
            const tp = q.type || 'multiple_choice';
            const d = q.difficulty || 'unset';
            if (!data[c]) { data[c] = {}; types.forEach(tt => { data[c][tt] = { easy:0, medium:0, hard:0, unset:0, total:0 }; }); }
            if (!data[c][tp]) data[c][tp] = { easy:0, medium:0, hard:0, unset:0, total:0 };
            if (data[c][tp][d] !== undefined) data[c][tp][d]++;
            data[c][tp].total++;
            colTotals[d]++; colTotals.total++;
            grandTotal++;
        });

        // Count total type-rows for this file (for filename rowspan)
        let fileRowCount = 0;
        fileCats.forEach(cat => {
            const activeTypes = types.filter(tp => data[cat][tp].total > 0);
            fileRowCount += activeTypes.length || 1;
        });

        let fileEmitted = false;

        fileCats.forEach(cat => {
            const activeTypes = types.filter(tp => data[cat][tp].total > 0);
            const catSpan = activeTypes.length || 1;
            let catEmitted = false;

            const renderRow = (tp) => {
                const d = tp ? data[cat][tp] : null;
                const bg = tblRowBg(tc, rowIdx++);
                const fileCell = !fileEmitted
                    ? `<td class="px-3 py-1.5 text-xs font-semibold border" rowspan="${fileRowCount}" style="text-align:left;vertical-align:middle;background:${bg};border-color:${tc.cBdr};word-break:break-all;">${escapeHtml(fileStat.name)}</td>`
                    : '';
                const catCell = !catEmitted
                    ? `<td class="px-3 py-1.5 text-xs font-semibold border" rowspan="${catSpan}" style="text-align:left;vertical-align:middle;background:${bg};border-color:${tc.cBdr};">${escapeHtml(cat)}</td>`
                    : '';
                fileEmitted = true;
                catEmitted = true;
                rows += `<tr style="background:${bg};">
                    ${fileCell}${catCell}
                    <td class="px-3 py-1.5 text-xs border" style="text-align:center;border-color:${tc.cBdr};">${tp ? typeLabel[tp] : '—'}</td>
                    ${diffs.map(df => `<td class="px-3 py-1.5 text-xs border" style="text-align:center;border-color:${tc.cBdr};">${d && d[df] ? d[df] : '—'}</td>`).join('')}
                    <td class="px-3 py-1.5 text-xs font-bold border" style="text-align:center;border-color:${tc.cBdr};">${d ? d.total : '—'}</td>
                </tr>`;
            };

            if (activeTypes.length === 0) {
                renderRow(null);
            } else {
                activeTypes.forEach(tp => renderRow(tp));
            }
        });

        if (fileCats.length === 0) {
            const bg = tblRowBg(tc, rowIdx++);
            rows += `<tr style="background:${bg};">
                <td class="px-3 py-1.5 text-xs font-semibold border" style="text-align:left;border-color:${tc.cBdr};word-break:break-all;">${escapeHtml(fileStat.name)}</td>
                <td class="px-3 py-1.5 text-xs border" style="border-color:${tc.cBdr};" colspan="6">—</td>
            </tr>`;
            grandTotal; // already counted above (0 for this file)
        }
    });

    // Total row — spans Filename+Category+Type cols
    rows += `<tr>
        <td class="px-3 py-1.5 text-xs font-bold border" colspan="3" style="text-align:left;background:${tc.tBg};color:${tc.tTxt};border-color:${tc.tBdr};">Total</td>
        ${diffs.map(df => tblTotalTd(tc, colTotals[df] || '—')).join('')}
        ${tblTotalTd(tc, grandTotal)}
    </tr>`;

    let summaryHtml = `
        <p class="text-sm font-semibold mb-2 flex items-center gap-2" style="color:var(--text);">${SUMMARY_ICON}Summary</p>
        <p class="text-xs mb-3" style="color:var(--text-muted);">Files merged: <strong>${mergerFileStats.length}</strong> &nbsp;·&nbsp; Total questions: <strong>${grandTotal}</strong></p>
        <div class="overflow-x-auto">
            <table class="w-full border-collapse" style="table-layout:fixed;width:100%;">
                <colgroup>
                    <col style="width:18%">
                    <col style="width:16%">
                    <col style="width:10%">
                    <col style="width:10%">
                    <col style="width:10%">
                    <col style="width:10%">
                    <col style="width:10%">
                    <col style="width:10%">
                </colgroup>
                <thead>
                    <tr>
                        ${tblTh(tc,'Filename','left')}
                        ${tblTh(tc,'Category','left')}
                        ${tblTh(tc,'Type')}
                        ${diffs.map(df => tblTh(tc, diffLabel[df])).join('')}
                        ${tblTh(tc,'Total')}
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
        </div>
    `;

    summaryDiv.innerHTML = summaryHtml;
    renderMissingCorrectWarning('mergerMissingCorrectWarning', mergedQuestions);

    const preview = mergedQuestions.slice(0, 50);
    let previewText = JSON.stringify(preview, null, 2);
    if (mergedQuestions.length > 50) previewText += `\n\n... and ${mergedQuestions.length - 50} more questions`;
    outputPre.textContent = previewText;
    if (window.Prism) Prism.highlightElement(outputPre);
}

// Clear all merged data
function clearMerger() {
    if (mergedQuestions.length === 0 && mergerFileStats.length === 0) {
        showToast('⚠️ Nothing to clear.', 'info');
        return;
    }

    mergedQuestions = [];
    mergerFileStats = [];
    const fileInput = document.getElementById('mergerFileInput');
    if (fileInput) fileInput.value = '';
    
    // Reset drop-zone display text
    const dropZone = document.querySelector('#jsonMergerContent .drop-zone');
    if (dropZone) {
        let textDisplay = dropZone.querySelector('p');
        if (!textDisplay) {
            textDisplay = document.createElement('p');
            textDisplay.className = 'text-sm text-gray-600';
            dropZone.appendChild(textDisplay);
        }
        textDisplay.className = 'text-sm text-gray-600';
        textDisplay.textContent = 'Drag & drop files or click to browse (hold Ctrl/Cmd for multiple)';
    }
    
    updateMergerDisplay();
    showToast('🗑️ Cleared', 'success');
}

// Download merged JSON
function downloadMergedJSON() {
    if (mergedQuestions.length === 0) {
        showToast('⚠️ No questions to download. Please add files first.', 'warning');
        return;
    }

    const mergedFilename = (document.getElementById('mergerOutputFilename')?.value.trim() || 'merged') + '.json';
    const blob = new Blob([JSON.stringify(mergedQuestions, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = mergedFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(`📄 Merged JSON downloaded as ${mergedFilename}`, 'success');
    console.log(`Downloaded ${mergedQuestions.length} questions as ${mergedFilename}`);
}

// ========================================
// GIFT CONVERTER
// ========================================

// Escape special GIFT characters in question/choice text
function escapeGift(str) {
    return (str || '').replace(/([~=#{}\\])/g, '\\$1');
}

// Convert an array of question objects (JSON format) to a GIFT string
function questionsToGift(questions) {
    const blocks = [];
    let i = 0;
    let qNum = 0;
    const pad = String(questions.length).length;
    const fmt = n => String(n).padStart(pad > 1 ? pad : 2, '0');

    while (i < questions.length) {
        const q = questions[i];

        if (q.type === 'matching') {
            // Group consecutive matching-type entries into a single GIFT matching block
            const group = [];
            let j = i;
            while (j < questions.length && questions[j].type === 'matching') {
                group.push(questions[j]);
                j++;
            }

            qNum++;
            const subject  = (group[0].subject  || '').trim();
            const category = (group[0].category || '').trim();
            let title = '';
            if (subject && category) title = `${subject}_${category}_Q${fmt(qNum)}`;
            else if (category)       title = `${category}_Q${fmt(qNum)}`;
            else if (subject)        title = `${subject}_Q${fmt(qNum)}`;
            else                     title = `Question${fmt(qNum)}`;

            const pairLines = group.map(g => {
                const term = escapeGift((g.question || '').trim());
                const ans  = escapeGift((g.correct  || '').trim());
                if (!ans) return `\t// WARNING: no match marked\n\t=${term} -> ${term}`;
                return `\t=${term} -> ${ans}`;
            }).join('\n');

            blocks.push(`::${title}:: Match the following. {\n${pairLines}\n}`);
            i = j;
            continue;
        }

        qNum++;
        const subject  = (q.subject  || '').trim();
        const category = (q.category || '').trim();
        let title = '';
        if (subject && category) title = `${subject}_${category}_Q${fmt(qNum)}`;
        else if (category)       title = `${category}_Q${fmt(qNum)}`;
        else if (subject)        title = `${subject}_Q${fmt(qNum)}`;
        else                     title = `Question${fmt(qNum)}`;

        const qText   = escapeGift((q.question || '').trim());
        const correct = (q.correct  || '').trim();

        if (q.type === 'true_false') {
            if (!correct) {
                blocks.push(`// WARNING: no correct answer marked\n::${title}:: ${qText} {// WARNING: no correct answer\nTRUE\n}`);
            } else {
                const ans = /^true$/i.test(correct) ? 'TRUE' : 'FALSE';
                blocks.push(`::${title}:: ${qText} {${ans}}`);
            }
            i++;
            continue;
        }

        // Multiple choice
        const choices = q.choices || [];
        if (choices.length === 0) {
            blocks.push(`// WARNING: no choices found\n::${title}:: ${qText} {}`);
            i++;
            continue;
        }

        const choiceLines = choices.map(c => {
            if (c === null) return '';
            const cText = escapeGift(c.trim());
            const isCorrect = c.trim() === correct.trim();
            if (!correct) return `// WARNING: no correct answer\n\t~${cText}`;
            return isCorrect ? `\t=${cText}` : `\t~${cText}`;
        }).filter(line => line).join('\n');

        blocks.push(`::${title}:: ${qText} {\n${choiceLines}\n}`);
        i++;
    }

    return blocks.join('\n\n');
}

function questionsToPlainText(questions) {
    return questions.map((q, idx) => {
        const num = idx + 1;
        let block = `${num}. ${q.question || ''}\n`;

        if (q.type === 'multiple_choice') {
            (q.choices || []).forEach((choice, i) => {
                const letter = String.fromCharCode(97 + i);
                const isCorrect = choice === q.correct;
                block += `${isCorrect ? '=' : ''}${letter}. ${choice}\n`;
            });
        } else if (q.type === 'true_false') {
            block += `=${q.correct === 'True' ? 'True' : 'False'}\n`;
        } else if (q.type === 'matching') {
            block += `=${q.correct || ''}\n`;
        }

        return block;
    }).join('\n');
}

function parsePlainTextToJson(text, subject, category) {
    function cleanText(str) {
        return str
            .replace(/\n(?!\d+[.)]\s|[a-e][.)]\s|=?\s*(true|false)\s*$)/gi, ' ')
            .replace(/\s{2,}/g, ' ')
            .trim();
    }

    const blocks = text.trim().split(/\n(?=\d+[.)]\s)/).map(b => b.trim()).filter(b => b);
    const questions = [];

    blocks.forEach(block => {
        const lines = block.split('\n');
        if (!lines || lines.length === 0) return;

        const tfLineIndex = lines.findIndex(line => line.trim().match(/^=?\s*(true|false)\s*$/i));
        if (tfLineIndex !== -1) {
            const tfQuestionLines = [];
            for (let i = 0; i < tfLineIndex; i++) {
                tfQuestionLines.push(lines[i].trim().replace(/^\d+[.)]\s*/, ''));
            }
            const tfQuestion = cleanText(tfQuestionLines.join('\n'));
            const tfMatch = lines[tfLineIndex].trim().match(/^=?\s*(true|false)\s*$/i);
            const tfCorrect = tfMatch[1].toLowerCase() === 'true' ? 'True' : 'False';
            questions.push({ subject, question: tfQuestion, category, type: 'true_false', correct: tfCorrect, choices: [null, null, null, null] });
            return;
        }

        const matchingLineIndex = lines.findIndex((line, idx) => {
            if (idx === 0) return false;
            const trimmed = line.trim();
            return trimmed.match(/^[=*]\s*(.+)$/) && !trimmed.match(/^[=*]\s*[a-e][.)]\s/i);
        });
        if (matchingLineIndex !== -1) {
            const questionLines = [];
            for (let i = 0; i < matchingLineIndex; i++) {
                questionLines.push(lines[i].trim().replace(/^\d+[.)]\s*/, ''));
            }
            const premise = cleanText(questionLines.join('\n'));
            const answerMatch = lines[matchingLineIndex].trim().match(/^[=*]\s*(.+)$/);
            const answer = answerMatch ? answerMatch[1].trim() : '';
            questions.push({ subject, question: premise, category, type: 'matching', correct: answer, choices: [null, null, null, null] });
            return;
        }

        const questionLines = [];
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line.match(/^[*=]?[a-e][.)]\s+/i)) break;
            questionLines.push(line.replace(/^\d+[.)]\s*/, ''));
        }
        const question = cleanText(questionLines.join('\n'));
        const choices = [];
        let correct = '';
        const firstChoiceIdx = lines.findIndex(line => line.trim().match(/^[*=]?[a-e][.)]\s+/i));
        for (let i = firstChoiceIdx; i !== -1 && i < lines.length; i++) {
            const line = lines[i].trim();
            const match = line.match(/^([*=]?)([a-e])[.)]\s+(.*)$/i);
            if (match) {
                const isCorrect = match[1] === '*' || match[1] === '=';
                let choiceText = match[3].trim();
                let j = i + 1;
                while (j < lines.length && !lines[j].trim().match(/^[*=]?[a-e][.)]\s+/i)) {
                    choiceText += ' ' + lines[j].trim();
                    j++;
                }
                i = j - 1;
                choiceText = cleanText(choiceText);
                if (isCorrect) correct = choiceText;
                choices.push(choiceText);
            }
        }

        if (!question || choices.length === 0) return;
        questions.push({ subject, question, category, type: 'multiple_choice', correct, choices });
    });

    return questions;
}

function looksLikePlainText(text) {
    return /^\s*\d+[.)]\s/.test(text.trim());
}

function unescapeGift(str) {
    return (str || '').replace(/\\([~=#{}\\])/g, '$1');
}

// Parse a GIFT-format string back into an array of question objects (JSON format)
function giftToJson(text) {
    const blocks = text.split(/\r?\n\s*\r?\n/).map(b => b.trim()).filter(Boolean);
    const questions = [];

    blocks.forEach(rawBlock => {
        const block = rawBlock.split('\n').filter(l => !l.trim().startsWith('//')).join('\n').trim();
        if (!block) return;

        const m = block.match(/^::(.*?)::\s*([\s\S]*?)\{([\s\S]*)\}\s*$/);
        if (!m) return;

        const title = m[1].trim();
        const qText = unescapeGift(m[2].trim());
        const body = m[3].trim();
        const category = title.replace(/_Q\d+$/, '').split('_').pop() || '';

        // Matching block
        if (body.split('\n').some(l => /^\s*=.*->/.test(l))) {
            body.split('\n').map(l => l.trim()).filter(Boolean).forEach(line => {
                const pm = line.match(/^=(.*?)\s*->\s*(.*)$/);
                if (pm) {
                    questions.push({
                        question: unescapeGift(pm[1].trim()),
                        category,
                        type: 'matching',
                        correct: unescapeGift(pm[2].trim()),
                        choices: [null, null, null, null]
                    });
                }
            });
            return;
        }

        // True/False block
        if (/^(TRUE|FALSE|T|F)$/i.test(body)) {
            questions.push({
                question: qText,
                category,
                type: 'true_false',
                correct: /^(TRUE|T)$/i.test(body) ? 'True' : 'False',
                choices: []
            });
            return;
        }

        // Multiple choice block
        const choices = [];
        let correct = '';
        body.split('\n').map(l => l.trim()).filter(Boolean).forEach(line => {
            const cm = line.match(/^([=~])(.*)$/);
            if (cm) {
                const cText = unescapeGift(cm[2].trim());
                choices.push(cText);
                if (cm[1] === '=') correct = cText;
            }
        });
        questions.push({ question: qText, category, type: 'multiple_choice', correct, choices });
    });

    return questions;
}

// Parse text into a questions array given a known source format ('json' | 'csv' | 'gift')
function parseQuestionsByFormat(text, format) {
    if (format === 'json') {
        const q = JSON.parse(text);
        if (!Array.isArray(q)) throw new Error('JSON must be an array of questions.');
        return q;
    }
    if (format === 'csv') return convertCsvToJson(text);
    if (format === 'gift') {
        const gq = giftToJson(text);
        if (gq.length > 0) return gq;
        return parsePlainTextToJson(text, '', '');
    }
    if (format === 'text') return parsePlainTextToJson(text, '', '');
    throw new Error('Unknown format: ' + format);
}

// Try parsing text against a list of candidate formats, returning the first that succeeds
function autoParseQuestions(text, formats) {
    let lastError = null;
    for (const format of formats) {
        try {
            const questions = parseQuestionsByFormat(text, format);
            if (Array.isArray(questions) && questions.length > 0) return { questions, format };
        } catch (e) {
            lastError = e;
        }
    }
    throw new Error('Could not parse input as ' + formats.join(' or ') + '.' + (lastError ? ' (' + lastError.message + ')' : ''));
}

// Detect format from an uploaded file's extension
function formatFromFileName(name) {
    const ext = (name.split('.').pop() || '').toLowerCase();
    if (ext === 'csv') return 'csv';
    if (ext === 'json') return 'json';
    return 'gift';
}
