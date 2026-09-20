// ========================================
// EXPORT TESTS
// ========================================

// Shared filename helper
function getFilename(ext) {
    const base    = (document.getElementById('outputFilename')?.value.trim() || 'test');
    const version = VERSION_LABELS[(testVersionIndex - 1) % VERSION_LABELS.length];
    return `${base}_${version}.${ext}`;
}

// Export test as TXT
function exportTestAsTxt() {
    const testPreview = document.getElementById('testPreview');
    const answerKeyPreview = document.getElementById('answerKeyPreview');
    const stripEmptyLines = (text) => text.split('\n').filter(line => line.trim() !== '').join('\n');
    const testContent = stripEmptyLines(testPreview.innerText);
    const akEntries = Array.from(answerKeyPreview.querySelectorAll('.mb-1')).map(el => el.innerText.trim());
    const distDiv = answerKeyPreview.querySelector('.mt-6');
    let answerKeyContent = 'Answer Key\n' + akEntries.join('\n');
    if (distDiv) answerKeyContent += '\n\n' + stripEmptyLines(distDiv.innerText);
    const output = `${testContent}\n\n${answerKeyContent}`;

    const blob = new Blob([output], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = getFilename('txt');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(`📄 TXT exported as ${getFilename('txt')}`, 'success');
}

// Export test as DOCX
function exportTestAsDocx() {
    if (!lastGeneratedQuestions || lastGeneratedQuestions.length === 0) {
        showToast('⚠️ Please generate a test first.', 'warning');
        return;
    }

    if (!window.docx) {
        showToast('❌ DOCX library not loaded. Please refresh the page.', 'error');
        return;
    }

    let Document, Packer, Paragraph, TextRun, AlignmentType, LevelFormat, LineRuleType, Table, TableRow, TableCell, WidthType, BorderStyle, SectionType;
    try {
        ({ Document, Packer, Paragraph, TextRun,
           AlignmentType, LevelFormat, LineRuleType, Table, TableRow, TableCell, WidthType, BorderStyle, SectionType } = window.docx);
    } catch (err) {
        showToast('❌ Failed to load DOCX components: ' + err.message, 'error');
        return;
    }

    const TWIP          = 1440;
    const PAGE_W        = Math.round(8.5 * TWIP);
    const PAGE_H        = Math.round(13  * TWIP);
    const MARGIN        = Math.round(0.5 * TWIP);
    const FONT          = 'Arial';
    const FONT_SIZE     = 22;
    const Q_LEFT        = Math.round(0.25 * TWIP);
    const Q_HANG        = Math.round(0.25 * TWIP);
    const CH_LEFT       = Math.round(0.25 * TWIP);

    // How many characters of Arial at FONT_SIZE actually fit on one line
    // of a two-column table cell, used to decide 1-col vs 2-col layout.
    // Replaces a flat "55 characters" guess (which let a choice like
    // "Lymph may move backward and accumulate in tissues" — 49 chars,
    // under the old limit — still render wide enough at 11pt to spill
    // past its column) with an estimate from the real column geometry:
    // Arial averages ~0.52em per character, and each cell loses a bit of
    // width to its own left/right padding.
    const CELL_PADDING_TWIPS  = 260; // ~0.09in each side, both sides combined
    const AVG_CHAR_WIDTH_TWIP = (FONT_SIZE / 2) * 0.52 * 20;
    const COLUMN_WIDTH_TWIPS  = Math.round((PAGE_W - MARGIN * 2) / 2) - CELL_PADDING_TWIPS;
    const TWO_COL_CHAR_LIMIT  = Math.floor(COLUMN_WIDTH_TWIPS / AVG_CHAR_WIDTH_TWIP);

    // ── Numbering ─────────────────────────────────────────────────────────
    const numberingConfig = {
        config: [{
            reference: 'q-num',
            levels: [{
                level:     0,
                format:    LevelFormat.DECIMAL,
                text:      '%1.',
                alignment: AlignmentType.LEFT,
                style: {
                    run:       { font: FONT, size: FONT_SIZE },
                    paragraph: { indent: { left: Q_LEFT, hanging: Q_HANG } }
                }
            }]
        }]
    };

    // ── Helpers ───────────────────────────────────────────────────────────
    const sp   = { before: 0, after: 0, line: 240, lineRule: LineRuleType.AUTO };
    const run  = t  => new TextRun({ text: String(t  ?? ''), font: FONT, size: FONT_SIZE });
    const bold = t  => new TextRun({ text: String(t  ?? ''), font: FONT, size: FONT_SIZE, bold: true });

    const headerPara = text => new Paragraph({
        children: [bold(text)],
        spacing:  sp
    });

    const qPara = text => new Paragraph({
        children:  [run(String(text ?? ''))],
        numbering: { reference: 'q-num', level: 0 },
        spacing:   sp,
        keepNext:  true
    });

    const noBorders = {
        top:    { style: BorderStyle.NONE, size: 0 },
        bottom: { style: BorderStyle.NONE, size: 0 },
        left:   { style: BorderStyle.NONE, size: 0 },
        right:  { style: BorderStyle.NONE, size: 0 },
    };

    // ── Choice builder ────────────────────────────────────────────────────
    function buildChoiceParas(choices) {
        const texts = choices.map(c => String(c ?? '').trim());
        // +3 for the "X. " letter prefix, which shares the column with the text
        const longestWithPrefix = Math.max(0, ...texts.map(t => t.length + 3));

        // 1-col layout
        if (longestWithPrefix > TWO_COL_CHAR_LIMIT || choices.length > 5 || document.getElementById('forceSingleCol')?.checked) {
            return texts.map((t, i) => new Paragraph({
                children: [run(String.fromCharCode(65 + (i % 5)) + '. ' + t)],
                indent:   { left: CH_LEFT },
                spacing:  sp,
                keepNext: i < texts.length - 1
            }));
        }

        // 2-col layout — a real table, not a tab stop, so a choice longer
        // than expected wraps within its own cell instead of overflowing
        // past the tab stop and pushing into the other column's space.
        const rows = Math.ceil(texts.length / 2);
        const tableRows = [];

        for (let row = 0; row < rows; row++) {
            const li = row;
            const ri = row + rows;

            const ll = String.fromCharCode(65 + (li % 5));
            const lt = texts[li];
            const hasRight = ri < texts.length;
            const rl = hasRight ? String.fromCharCode(65 + (ri % 5)) : null;
            const rt = hasRight ? texts[ri] : null;

            tableRows.push(new TableRow({
                children: [
                    new TableCell({
                        children: [new Paragraph({ children: [run(ll + '. ' + lt)], spacing: sp })],
                        borders:  noBorders,
                        width:    { size: 50, type: WidthType.PERCENTAGE }
                    }),
                    new TableCell({
                        children: [new Paragraph({ children: hasRight ? [run(rl + '. ' + rt)] : [run('')], spacing: sp })],
                        borders:  noBorders,
                        width:    { size: 50, type: WidthType.PERCENTAGE }
                    })
                ]
            }));
        }

        return [new Table({ rows: tableRows, width: { size: 100, type: WidthType.PERCENTAGE } })];
    }

    // ── Assemble paragraphs ───────────────────────────────────────────────
    const allChildren = [];

    const mcqs = lastGeneratedQuestions.filter(q => q.type === 'multiple_choice');
    const tfs  = lastGeneratedQuestions.filter(q => q.type === 'true_false');
    const matchingCount = lastGeneratedQuestions.filter(q => q.type === 'matching').length;

    const DOCX_ROMANS = ['I', 'II', 'III'];
    let docxSectionIdx = 0;
    const mcqRomanDocx = mcqs.length > 0 ? DOCX_ROMANS[docxSectionIdx++] : null;
    const tfRomanDocx  = tfs.length > 0 ? DOCX_ROMANS[docxSectionIdx++] : null;
    const mtRomanDocx  = matchingCount > 0 ? DOCX_ROMANS[docxSectionIdx++] : null;

    if (mcqs.length > 0) {
        allChildren.push(headerPara(
            `${mcqRomanDocx}. Multiple Choice Questions. Choose the letter of the best answer.`
        ));
        let qNum = 1;
        mcqs.forEach(q => {
            const choices = q.displayChoices || q.choices || [];
            allChildren.push(qPara(q.question || ''));
            allChildren.push(...buildChoiceParas(choices));
            qNum++;
        });
    }

    if (tfs.length > 0) {
        allChildren.push(new Paragraph({ children: [run('')], spacing: sp }));
        allChildren.push(headerPara(
            `${tfRomanDocx}. True or False. Shade A if the statement is True. Shade B if the statement is False.`
        ));
        tfs.forEach(q => allChildren.push(qPara(q.question || '')));
    }

    const matching = lastGeneratedQuestions.filter(q => q.type === 'matching');
    if (matching.length > 0) {
        allChildren.push(new Paragraph({ children: [run('')], spacing: sp }));
        allChildren.push(headerPara(
            `${mtRomanDocx}. Matching Type. Match Column A with Column B.`
        ));

        // Get all answers and randomly assign them letters (cycling A-E by row position)
        const allAnswerTexts = matching.map(q => q.correct);
        const shuffledAnswerTexts = shuffleArray([...allAnswerTexts]);
        const sortedAnswers = shuffledAnswerTexts.map((text, idx) => ({
            text,
            letter: String.fromCharCode(65 + (idx % 5))
        }));
        
        // Build table with two columns
        const tableRows = [];
        const maxRows = Math.max(matching.length, sortedAnswers.length);
        
        for (let i = 0; i < maxRows; i++) {
            const premiseText = i < matching.length
                ? `${mcqs.length + tfs.length + i + 1}. ${matching[i].question}` : '';
            const answerText = i < sortedAnswers.length
                ? `${sortedAnswers[i].letter}. ${sortedAnswers[i].text}` : '';
            
            tableRows.push(new TableRow({
                children: [
                    new TableCell({
                        children: [new Paragraph({ children: [run(premiseText)], spacing: sp })],
                        borders: noBorders,
                        width: { size: 50, type: WidthType.PERCENTAGE }
                    }),
                    new TableCell({
                        children: [new Paragraph({ children: [run(answerText)], spacing: sp })],
                        borders: noBorders,
                        width: { size: 50, type: WidthType.PERCENTAGE }
                    })
                ]
            }));
        }
        
        allChildren.push(new Table({
            rows: tableRows,
            width: { size: 100, type: WidthType.PERCENTAGE }
        }));
    }

    // ── Build document ────────────────────────────────────────────────────
    let doc;
    try {
        doc = new Document({
            numbering: numberingConfig,
            sections: [{
                properties: {
                    page: {
                        size:   { width: PAGE_W, height: PAGE_H },
                        margin: { top: MARGIN, right: MARGIN, bottom: MARGIN, left: MARGIN }
                    }
                },
                children: allChildren
            }]
        });
    } catch (err) {
        console.error('DOCX build error:', err);
        showToast('❌ Failed to build document: ' + err.message, 'error');
        return;
    }

    // ── Download ──────────────────────────────────────────────────────────
    const docxFilename = getFilename('docx');
    Packer.toBlob(doc)
        .then(blob => {
            const url = URL.createObjectURL(blob);
            const a   = document.createElement('a');
            a.href     = url;
            a.download = docxFilename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            showToast(`📄 DOCX exported as ${docxFilename}`, 'success');
        })
        .catch(err => {
            console.error('DOCX pack error:', err);
            showToast('❌ Failed to generate DOCX: ' + err.message, 'error');
        });
}

function exportTestAsJson() {
    if (!lastGeneratedQuestions || lastGeneratedQuestions.length === 0) {
        showToast('⚠️ Please generate a test first.', 'warning'); 
        return;
    }

    // Convert back to the original input format
    const dataToExport = lastGeneratedQuestions.map(q => {
        if (q.type === 'multiple_choice') {
            return {
                question: q.question,
                category: q.category,
                type: q.type,
                correct: q.displayCorrectText || q.correct,
                choices: q.displayChoices || q.choices
            };
        } else if (q.type === 'true_false') {
            return {
                question: q.question,
                category: q.category,
                type: q.type,
                correct: q.displayCorrectText || q.correct,
                choices: null
            };
        } else {
            return {
                question: q.question || '',
                category: q.category || '',
                type: q.type || '',
                correct: q.correct || '',
                choices: q.choices || null
            };
        }
    });

    const jsonFilename = getFilename('json');
    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = jsonFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(`📄 JSON exported as ${jsonFilename}`, 'success');
}

function getTestExportData() {
    return lastGeneratedQuestions.map(q => {
        if (q.type === 'multiple_choice') {
            return {
                question: q.question,
                category: q.category,
                type: q.type,
                correct: q.displayCorrectText || q.correct,
                choices: q.displayChoices || q.choices
            };
        } else if (q.type === 'true_false') {
            return {
                question: q.question,
                category: q.category,
                type: q.type,
                correct: q.displayCorrectText || q.correct,
                choices: null
            };
        } else {
            return {
                question: q.question || '',
                category: q.category || '',
                type: q.type || '',
                correct: q.correct || '',
                choices: q.choices || null
            };
        }
    });
}

function exportTestAsGift() {
    if (!lastGeneratedQuestions || lastGeneratedQuestions.length === 0) {
        showToast('⚠️ Please generate a test first.', 'warning');
        return;
    }
    const giftFilename = getFilename('txt').replace(/\.txt$/, '_gift.txt');
    const blob = new Blob([questionsToGift(getTestExportData())], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = giftFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(`📄 GIFT exported as ${giftFilename}`, 'success');
}

function exportTestAsCsv() {
    if (!lastGeneratedQuestions || lastGeneratedQuestions.length === 0) {
        showToast('⚠️ Please generate a test first.', 'warning');
        return;
    }
    const csvFilename = getFilename('csv');
    const blob = new Blob([convertJsonToCsv(getTestExportData())], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = csvFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(`📄 CSV exported as ${csvFilename}`, 'success');
}
