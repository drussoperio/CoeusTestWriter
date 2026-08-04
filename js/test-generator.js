// ========================================
// SHUFFLE & DISTRIBUTION ALGORITHMS, TEST GENERATION, EXCLUSIONS
// ========================================

// Fisher-Yates shuffle algorithm
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// Compute balanced target letter counts for a group of questions that all
// share the same number of choices (4 or 5), allowing a random deviation
// within +/- tolerance while keeping the total exactly right.
function computeSubGroupTargetCounts(total, letterList, tolerance) {
    const counts = {};
    letterList.forEach(l => counts[l] = 0);
    if (total === 0) return counts;

    const base = Math.floor(total / letterList.length);
    const remainder = total - base * letterList.length;
    letterList.forEach(l => counts[l] = base);
    for (let i = 0; i < remainder; i++) {
        counts[letterList[i % letterList.length]]++;
    }

    if (tolerance > 0) {
        const iterations = letterList.length * 4;
        for (let k = 0; k < iterations; k++) {
            const l1 = letterList[Math.floor(Math.random() * letterList.length)];
            const l2 = letterList[Math.floor(Math.random() * letterList.length)];
            if (l1 === l2) continue;
            const minAllowed = Math.max(base - tolerance, 0);
            if (counts[l1] < base + tolerance && counts[l2] > minAllowed) {
                counts[l1]++;
                counts[l2]--;
            }
        }
    }

    return counts;
}

// Combine target counts for 4-choice and 5-choice MCQ groups into one
// overall target per letter (A-D always, E only if 5-choice questions exist)
function computeMCTargetCounts(mcqs, tolerance) {
    const getChoiceCount = q => (q.displayChoices || q.choices || []).length;
    const fourChoiceQs = mcqs.filter(q => getChoiceCount(q) === 4);
    const fiveChoiceQs = mcqs.filter(q => getChoiceCount(q) === 5);

    const letters4 = ['A', 'B', 'C', 'D'];
    const letters5 = ['A', 'B', 'C', 'D', 'E'];

    const counts4 = computeSubGroupTargetCounts(fourChoiceQs.length, letters4, tolerance);
    const counts5 = computeSubGroupTargetCounts(fiveChoiceQs.length, letters5, tolerance);

    const targets = { A: 0, B: 0, C: 0, D: 0 };
    letters4.forEach(l => targets[l] = (counts4[l] || 0) + (counts5[l] || 0));
    if (fiveChoiceQs.length > 0) {
        targets.E = counts5.E || 0;
    }

    return targets;
}

// Checks whether a sequence with these symbol counts can be arranged with
// no run longer than maxRun (standard "no more than k adjacent" feasibility test)
function isRunConstraintFeasible(counts, maxRun) {
    const values = Object.values(counts).filter(c => c > 0);
    if (values.length === 0) return true;
    const total = values.reduce((a, b) => a + b, 0);
    const maxCount = Math.max(...values);
    const others = total - maxCount;
    const blocksNeeded = Math.ceil(maxCount / maxRun);
    const separatorsNeeded = blocksNeeded - 1;
    return others >= separatorsNeeded;
}

// Assigns a letter to each MCQ item (in its existing, already-randomized order),
// respecting each item's own number of choices, aiming for targetCounts, and
// never letting a letter repeat more than maxRun times in a row (unless truly unavoidable)
function assignMCAnswerLetters(mcqs, targetCounts, maxRun) {
    const remaining = { ...targetCounts };
    let runLetter = null;
    let runLength = 0;
    let forcedRepeats = 0;

    const assignedLetters = mcqs.map(q => {
        const numChoices = (q.displayChoices || q.choices || []).length;
        const allowedLetters = ['A', 'B', 'C', 'D', 'E'].slice(0, numChoices);

        let candidates = allowedLetters.filter(l => (remaining[l] || 0) > 0);
        if (candidates.length === 0) {
            candidates = allowedLetters.slice();
        }

        let pool = candidates.filter(l => !(l === runLetter && runLength >= maxRun));
        if (pool.length === 0) {
            pool = candidates;
            forcedRepeats++;
        }

        const weights = pool.map(l => Math.max(remaining[l] || 0, 0) + 1);
        const totalWeight = weights.reduce((a, b) => a + b, 0);
        let r = Math.random() * totalWeight;
        let chosen = pool[pool.length - 1];
        for (let i = 0; i < pool.length; i++) {
            r -= weights[i];
            if (r <= 0) { chosen = pool[i]; break; }
        }

        remaining[chosen] = (remaining[chosen] || 0) - 1;
        if (chosen === runLetter) runLength++; else { runLetter = chosen; runLength = 1; }

        return chosen;
    });

    return { assignedLetters, forcedRepeats };
}

// Builds a True/False order (a sequence of the strings "True"/"False") from
// the given counts, never letting the same value repeat more than maxRun times
// in a row unless truly unavoidable
function buildTFSequence(counts, maxRun) {
    const remaining = { ...counts };
    const symbols = Object.keys(counts).filter(s => counts[s] > 0);
    const total = symbols.reduce((sum, s) => sum + counts[s], 0);
    let runSymbol = null;
    let runLength = 0;
    let forcedRepeats = 0;
    const sequence = [];

    for (let i = 0; i < total; i++) {
        let candidates = symbols.filter(s => remaining[s] > 0);
        let pool = candidates.filter(s => !(s === runSymbol && runLength >= maxRun));
        if (pool.length === 0) {
            pool = candidates;
            forcedRepeats++;
        }

        const weights = pool.map(s => remaining[s]);
        const totalWeight = weights.reduce((a, b) => a + b, 0);
        let r = Math.random() * totalWeight;
        let chosen = pool[pool.length - 1];
        for (let i2 = 0; i2 < pool.length; i2++) {
            r -= weights[i2];
            if (r <= 0) { chosen = pool[i2]; break; }
        }

        remaining[chosen]--;
        if (chosen === runSymbol) runLength++; else { runSymbol = chosen; runLength = 1; }
        sequence.push(chosen);
    }

    return { sequence, forcedRepeats };
}

// Main entry point: applies answer-letter distribution/rotation to MCQs and
// reorders True/False questions, per the tolerance and consecutive-answer settings
function applyAnswerDistribution(questions, options) {
    const { tolerance, allowConsecutiveMC, allowConsecutiveTF } = options;

    const mcqs = questions.filter(q => q.type === 'multiple_choice');
    const tfQuestions = questions.filter(q => q.type === 'true_false');
    const otherQuestions = questions.filter(q => q.type !== 'multiple_choice' && q.type !== 'true_false');

    // --- Multiple choice ---
    let balancedMcqs = mcqs;
    if (mcqs.length > 0) {
        const targetCounts = computeMCTargetCounts(mcqs, tolerance);
        const mcMaxRun = allowConsecutiveMC;

        if (!isRunConstraintFeasible(targetCounts, mcMaxRun)) {
            const summary = Object.entries(targetCounts).map(([l, c]) => `${l}: ${c}`).join(', ');
            const proceed = confirm(
                `Your multiple-choice answers are distributed as ${summary} — too uneven to avoid all consecutive repeats at this tolerance. ` +
                `Generating anyway will allow only the minimum unavoidable repeats. Proceed?`
            );
            if (!proceed) {
                throw new Error('CANCELLED_BY_USER');
            }
        }

        const { assignedLetters, forcedRepeats } = assignMCAnswerLetters(mcqs, targetCounts, mcMaxRun);
        if (forcedRepeats > 0) {
            console.warn(`MCQ distribution: ${forcedRepeats} unavoidable repeat(s) allowed.`);
        }

        balancedMcqs = mcqs.map((q, idx) => {
            const letter = assignedLetters[idx];
            const choices = q.displayChoices || q.choices || [];
            const correctText = q.displayCorrectText || q.correct;
            const shuffledChoices = [...choices];
            const correctIndex = shuffledChoices.indexOf(correctText);
            const targetIndex = ['A', 'B', 'C', 'D', 'E'].indexOf(letter);

            if (correctIndex >= 0 && targetIndex >= 0 && targetIndex < shuffledChoices.length) {
                [shuffledChoices[correctIndex], shuffledChoices[targetIndex]] =
                [shuffledChoices[targetIndex], shuffledChoices[correctIndex]];
            }

            return {
                ...q,
                displayChoices: shuffledChoices,
                displayCorrectLetter: letter,
                displayCorrectText: correctText
            };
        });
    }

    // --- True/False ---
    let orderedTf = tfQuestions;
    if (tfQuestions.length > 0) {
        const trueQs = tfQuestions.filter(q => q.correct === 'True');
        const falseQs = tfQuestions.filter(q => q.correct !== 'True');
        const counts = { True: trueQs.length, False: falseQs.length };
        const tfMaxRun = allowConsecutiveTF;

        if (!isRunConstraintFeasible(counts, tfMaxRun)) {
            const proceed = confirm(
                `Your True/False questions are split ${counts.True} True to ${counts.False} False — too uneven to avoid all consecutive repeats. ` +
                `Generating anyway will allow only the minimum unavoidable repeats. Proceed?`
            );
            if (!proceed) {
                throw new Error('CANCELLED_BY_USER');
            }
        }

        const { sequence, forcedRepeats } = buildTFSequence(counts, tfMaxRun);
        if (forcedRepeats > 0) {
            console.warn(`True/False distribution: ${forcedRepeats} unavoidable repeat(s) allowed.`);
        }

        const trueQueue = shuffleArray([...trueQs]);
        const falseQueue = shuffleArray([...falseQs]);
        orderedTf = sequence.map(symbol => (symbol === 'True' ? trueQueue : falseQueue).shift());
    }

    return [...balancedMcqs, ...orderedTf, ...otherQuestions];
}

// ========================================
// TEST GENERATION
// ========================================

function generateTest() {
    console.log("Generating test... Test Bank Size:", testBank.length);

    if (testBank.length === 0) {
        showToast('⚠️ Please load a test bank first.', 'warning');
        return;
    }

    const randomize = true;
    const ratio = getDiffRatio();
    const ratioActive = isDiffRatioActive(ratio);
    if (ratioActive && getDiffRatioTotal() !== 100) {
        showToast('⚠️ Difficulty ratio must sum to 100% before generating.', 'warning');
        return;
    }
    const categories = [...new Set(testBank.map(q => q.category))];
    let selectedQuestions = [];
    let unusedQuestions = [];
    
    // Track what was requested per category
    lastSelectedCategories = {};
    generationStats = {}; // reset so stale shortfall from prior run is cleared

    categories.forEach(cat => {
        const safeCat = safeIdFromCategory(cat);
        const mcInput = document.getElementById(`cat_${safeCat}_mc`);
        const tfInput = document.getElementById(`cat_${safeCat}_tf`);
        const mtInput = document.getElementById(`cat_${safeCat}_mt`);

        const mcCount = mcInput ? parseInt(mcInput.value) || 0 : 0;
        const tfCount = tfInput ? parseInt(tfInput.value) || 0 : 0;
        const mtCount = mtInput ? parseInt(mtInput.value) || 0 : 0;

        // Initialize stats for this category
        generationStats[cat] = {
            mcRequested: mcCount,
            tfRequested: tfCount,
            mtRequested: mtCount,
            mcGenerated: 0,
            tfGenerated: 0,
            mtGenerated: 0,
            mcAvailable: 0,
            tfAvailable: 0,
            mtAvailable: 0,
            mcShortfall: 0,
            tfShortfall: 0,
            mtShortfall: 0
        };

        // Filter out excluded questions FIRST
        const catQuestions = testBank.filter(q => q.category === cat && !isQuestionExcluded(q));
        
        // Count available after exclusions
        const mcAvailable = catQuestions.filter(q => q.type === 'multiple_choice').length;
        const tfAvailable = catQuestions.filter(q => q.type === 'true_false').length;
        const mtAvailable = catQuestions.filter(q => q.type === 'matching').length;
        
        generationStats[cat].mcAvailable = mcAvailable;
        generationStats[cat].tfAvailable = tfAvailable;
        generationStats[cat].mtAvailable = mtAvailable;
        
        // Warn if exclusions reduced available questions
        const totalCatQuestions = testBank.filter(q => q.category === cat).length;
        const excludedCount = totalCatQuestions - catQuestions.length;
        if (excludedCount > 0) {
            console.log(`Category "${cat}": ${excludedCount} questions excluded, ${catQuestions.length} available`);
        }

        if (mcCount + tfCount + mtCount <= 0) {
            // No questions requested from this category, all are unused
            unusedQuestions.push(...catQuestions);
            return;
        }

        let mcQuestions = catQuestions.filter(q => q.type === 'multiple_choice');
        let tfQuestions = catQuestions.filter(q => q.type === 'true_false');
        let mtQuestions = catQuestions.filter(q => q.type === 'matching');
        
        // Warn if not enough questions available after exclusions
        if (mcQuestions.length < mcCount) {
            console.warn(`Category "${cat}": Requested ${mcCount} MCQ, but only ${mcQuestions.length} available after exclusions`);
        }
        if (tfQuestions.length < tfCount) {
            console.warn(`Category "${cat}": Requested ${tfCount} T/F, but only ${tfQuestions.length} available after exclusions`);
        }
        if (mtQuestions.length < mtCount) {
            console.warn(`Category "${cat}": Requested ${mtCount} Matching, but only ${mtQuestions.length} available after exclusions`);
        }

        // Select questions with difficulty awareness
        let selectedMcQuestions, selectedTfQuestions, selectedMtQuestions;
        let mcDiffStats = null, tfDiffStats = null, mtDiffStats = null;

        const mcSel = selectWithDifficulty(mcQuestions, mcCount, ratio, randomize);
        selectedMcQuestions = mcSel.selected;
        mcDiffStats = mcSel.diffStats;

        const tfSel = selectWithDifficulty(tfQuestions, tfCount, ratio, randomize);
        selectedTfQuestions = tfSel.selected;
        tfDiffStats = tfSel.diffStats;

        const mtSel = selectWithDifficulty(mtQuestions, mtCount, ratio, randomize);
        selectedMtQuestions = mtSel.selected;
        mtDiffStats = mtSel.diffStats;

        // Track what was actually generated
        generationStats[cat].mcGenerated = selectedMcQuestions.length;
        generationStats[cat].tfGenerated = selectedTfQuestions.length;
        generationStats[cat].mtGenerated = selectedMtQuestions.length;
        generationStats[cat].mcShortfall = mcCount - selectedMcQuestions.length;
        generationStats[cat].tfShortfall = tfCount - selectedTfQuestions.length;
        generationStats[cat].mtShortfall = mtCount - selectedMtQuestions.length;
        generationStats[cat].mcDiffStats = mcDiffStats;
        generationStats[cat].tfDiffStats = tfDiffStats;
        generationStats[cat].mtDiffStats = mtDiffStats;

        // Track selected
        selectedQuestions.push(...selectedMcQuestions, ...selectedTfQuestions, ...selectedMtQuestions);

        // Track unused (questions that weren't selected)
        const selectedIds = new Set([...selectedMcQuestions, ...selectedTfQuestions].map(q => q.question));
        const selectedMtIds = new Set([...selectedMtQuestions].map(q => JSON.stringify(q)));
        const unusedFromCategory = catQuestions.filter(q => {
            if (q.type === 'matching') {
                return !selectedMtIds.has(JSON.stringify(q));
            }
            return !selectedIds.has(q.question);
        });
        unusedQuestions.push(...unusedFromCategory);
    });

    if (selectedQuestions.length === 0) {
        showToast('⚠️ Please select at least one category with questions.', 'warning');
        return;
    }

    if (randomize) {
        selectedQuestions = shuffleArray(selectedQuestions);
    }

    // Create "display" versions with shuffled choices and computed correct letter
    const prepared = selectedQuestions.map((q, idx) => {
        if (q.type === 'multiple_choice' && Array.isArray(q.choices)) {
            const shuffledChoices = shuffleArray([...q.choices]);
            const correctIndex = shuffledChoices.indexOf(q.correct);
            const correctLetter = String.fromCharCode(65 + correctIndex);
            return {
                ...q,
                displayChoices: shuffledChoices,
                displayCorrectLetter: correctLetter,
                displayCorrectText: q.correct,
                displayNumber: idx + 1
            };
        } else if (q.type === 'true_false') {
            const correctLetter = q.correct === "True" ? "A" : "B";
            return {
                ...q,
                displayChoices: ["True", "False"],
                displayCorrectLetter: correctLetter,
                displayCorrectText: q.correct,
                displayNumber: idx + 1
            };
        } else {
            return { ...q, displayNumber: idx + 1 };
        }
    });

    lastGeneratedQuestions = prepared;
    lastUnusedQuestions = unusedQuestions;
    
    console.log("Final selected questions (prepared):", prepared);
    console.log(`Total questions prepared: ${prepared.length}`);
    console.log(`Unused questions: ${unusedQuestions.length}`);
    
    // Apply answer distribution and balancing
    const answerToleranceSelect = document.getElementById('answerTolerance');
    const maxConsecutiveMCSelect = document.getElementById('maxConsecutiveMC');
    const maxConsecutiveTFSelect = document.getElementById('maxConsecutiveTF');
    const tolerance = parseInt(answerToleranceSelect.value) || 0;
    const allowConsecutiveMC = parseInt(maxConsecutiveMCSelect.value);
    const allowConsecutiveTF = parseInt(maxConsecutiveTFSelect.value);

    // Separate matching from non-matching before applying distribution
    const matchingOnly   = prepared.filter(q => q.type === 'matching');
    const nonMatching    = prepared.filter(q => q.type !== 'matching');

    let distributed = [];
    
    try {
        // Apply distribution only to non-matching questions
        if (nonMatching.length > 0) {
            distributed = applyAnswerDistribution(nonMatching, { tolerance, allowConsecutiveMC, allowConsecutiveTF });
        }
        // Matching questions don't need distribution - just add them back
    } catch (err) {
        if (err.message === 'CANCELLED_BY_USER') {
            console.log('Test generation cancelled by user.');
            return;
        }
        throw err;
    }
    
    // Combine non-matching (distributed) with matching (unchanged)
    const final = [...distributed, ...matchingOnly];
    console.log(`After distribution: ${final.length} questions`);
    
    // Safety check: Did we lose any questions?
    if (final.length !== prepared.length) {
        console.error(`⚠️ WARNING: Started with ${prepared.length} questions, ended with ${final.length}!`);
        showToast(`⚠️ Expected ${prepared.length} questions but got ${final.length} — check console.`, 'warning');
    }
    
    console.log("After balancing:", final);
    displayTest(final);
    displayUnusedSummary();
    displayGenerationReport();
    
    // Update lastGeneratedQuestions to the final version
    lastGeneratedQuestions = final;

    const totalShortfall = Object.values(generationStats).reduce((sum, stat) =>
        sum + (stat.mcShortfall || 0) + (stat.tfShortfall || 0) + (stat.mtShortfall || 0), 0);
    if (totalShortfall > 0) {
        showToast(`⚠️ Test generated with a shortfall of ${totalShortfall} question(s). See Generation Report.`, 'warning');
    } else {
        showToast(`✅ Test generated with ${final.length} question(s).`, 'success');
    }
}

// Display test and answer key
function displayTest(questions) {
    const testPreview = document.getElementById('testPreview');
    const answerKeyPreview = document.getElementById('answerKeyPreview');
    
    if (!questions || questions.length === 0) {
        testPreview.innerHTML = '<p class="text-gray-500">No questions selected.</p>';
        answerKeyPreview.innerHTML = '';
        const distributionEl = document.getElementById('answerDistribution');
        if (distributionEl) distributionEl.innerHTML = '';
        return;
    }

    // Increment version counter each time a test is generated
    testVersionIndex++;
    const versionLabel = VERSION_LABELS[(testVersionIndex - 1) % VERSION_LABELS.length];

    // ── Test preview — DM Sans, answer-key spacing ────────────────────────
    const ROMANS = ['I', 'II', 'III'];
    const mcqCount = questions.filter(q => q.type === 'multiple_choice').length;
    const tfCount = questions.filter(q => q.type === 'true_false').length;
    const mtCount = questions.filter(q => q.type === 'matching').length;
    let sectionIdx = 0;
    const mcqRoman = mcqCount > 0 ? ROMANS[sectionIdx++] : null;
    const tfRoman = tfCount > 0 ? ROMANS[sectionIdx++] : null;
    const mtRoman = mtCount > 0 ? ROMANS[sectionIdx++] : null;

    let testHtml = `<div>`;
    if (mcqRoman) {
        testHtml += `<p style="font-weight:600;margin-bottom:0.5rem;">${mcqRoman}. Multiple Choice Questions. Choose the letter of the best answer.</p>`;
    }

    let answerKeyHtml = '';

    let questionNumber = 1;

    const mcqs = questions.filter(q => q.type === 'multiple_choice');
    mcqs.forEach(q => {
        const choices = (q.displayChoices && q.displayChoices.length)
            ? q.displayChoices : (q.choices || []);

        testHtml += `<p style="margin-bottom:0.15rem;padding-left:1.8em;text-indent:-1.8em;">${questionNumber}. ${escapeHtml(String(q.question)).replace(/\n/g, '<br>')}</p>`;
        choices.forEach((choice, i) => {
            const letter = String.fromCharCode(65 + i);
            testHtml += `<p style="margin-bottom:0.1rem;padding-left:3em;text-indent:-1.5em;">${letter}. ${escapeHtml(choice)}</p>`;
        });
        testHtml += `<div style="margin-bottom:0.5rem;"></div>`;

        const correctLetter = q.displayCorrectLetter
            ? q.displayCorrectLetter
            : String.fromCharCode(65 + choices.indexOf(q.correct));
        const correctText = q.displayCorrectText || q.correct || '';
        answerKeyHtml += `<div class="mb-1">${questionNumber}. ${escapeHtml(correctLetter)} (${escapeHtml(correctText)})</div>`;
        questionNumber++;
    });

    if (tfRoman) {
        testHtml += `<p style="font-weight:600;margin-top:0.75rem;margin-bottom:0.5rem;">${tfRoman}. True or False. Shade A if the statement is True. Shade B if the statement is False.</p>`;
    }

    const tfs = questions.filter(q => q.type === 'true_false');
    tfs.forEach(q => {
        testHtml += `<p style="margin-bottom:0.35rem;padding-left:1.8em;text-indent:-1.8em;">${questionNumber}. ${escapeHtml(q.question)}</p>`;
        const correctLetter = q.displayCorrectLetter || (q.correct === 'True' ? 'A' : 'B');
        const correctText   = q.displayCorrectText || q.correct || '';
        answerKeyHtml += `<div class="mb-1">${questionNumber}. ${escapeHtml(correctLetter)} (${escapeHtml(correctText)})</div>`;
        questionNumber++;
    });

    const matching = questions.filter(q => q.type === 'matching');
    if (matching.length > 0) {
        testHtml += `<p style="font-weight:600;margin-top:0.75rem;margin-bottom:0.5rem;">${mtRoman}. Matching Type. Match Column A with Column B.</p>`;

        // Get all answers and randomly assign them letters
        const allAnswers = matching.map(q => q.correct);
        // Shuffle the answers to randomize their order
        const shuffledAnswers = shuffleArray([...allAnswers]);
        
        // Build answer list with shuffled positions (limit to A-E)
        const answerWithLetters = shuffledAnswers.map((answer, idx) => ({
            text: answer,
            letter: String.fromCharCode(65 + (idx % 5))
        }));
        
        // Build table with aligned columns
        const matchingTable = `
            <table style="width:100%;border-collapse:collapse;margin-bottom:0.75rem;">
                <tr>
                    <th style="width:40%;text-align:left;font-weight:600;font-size:0.85rem;padding-bottom:0.25rem;">Column A</th>
                    <th style="width:20%;"></th>
                    <th style="width:40%;text-align:left;font-weight:600;font-size:0.85rem;padding-bottom:0.25rem;">Column B</th>
                </tr>
        `;
        
        let tableHtml = matchingTable;
        if (matching.length !== answerWithLetters.length) {
            console.warn('Matching table: premise/answer count mismatch', matching.length, answerWithLetters.length);
        }
        const maxRows = Math.max(matching.length, answerWithLetters.length);

        for (let i = 0; i < maxRows; i++) {
            const premiseCell = i < matching.length
                ? `${questionNumber + i}. ${escapeHtml(matching[i].question)}` : '';
            const answerCell = i < answerWithLetters.length
                ? `${answerWithLetters[i].letter}. ${escapeHtml(answerWithLetters[i].text)}` : '';

            tableHtml += `<tr>
                <td style="padding:0.1rem 0.5rem 0.1rem 0;">${premiseCell}</td>
                <td></td>
                <td style="padding:0.1rem 0;">${answerCell}</td>
            </tr>`;
        }
        tableHtml += `</table>`;
        testHtml += tableHtml;

        // Add answer key - find which letter each answer was assigned
        matching.forEach((q, idx) => {
            const answerObj = answerWithLetters.find(a => a.text === q.correct);
            const answerLetter = answerObj ? answerObj.letter : 'A';
            const correctText = q.correct || '';
            answerKeyHtml += `<div class="mb-1">${questionNumber + idx}. ${escapeHtml(answerLetter)} (${escapeHtml(correctText)})</div>`;
        });
        
        questionNumber += matching.length;
    }

    testHtml += '</div>';

    // ── Answer distribution stats — MCQ and T/F, own cards outside the scroll boxes ──
    const mcqAnswers = mcqs.map(q => q.displayCorrectLetter);
    const mcqCounts = { A: 0, B: 0, C: 0, D: 0, E: 0 };
    mcqAnswers.forEach(l => { if (mcqCounts[l] !== undefined) mcqCounts[l]++; });
    const hasE = mcqCounts.E > 0;
    let mcqDistText = `A: ${mcqCounts.A} | B: ${mcqCounts.B} | C: ${mcqCounts.C} | D: ${mcqCounts.D}`;
    if (hasE) mcqDistText += ` | E: ${mcqCounts.E}`;

    const tfCounts = { True: 0, False: 0 };
    tfs.forEach(q => { tfCounts[q.correct === 'True' ? 'True' : 'False']++; });
    const tfDistText = `True: ${tfCounts.True} | False: ${tfCounts.False}`;

    const distributionEl = document.getElementById('answerDistribution');
    if (distributionEl) {
        let distributionHtml = '';
        if (mcqs.length > 0) {
            distributionHtml += `
                <div class="p-4 bg-gray-100 rounded">
                    <h4 class="font-semibold mb-2">Answer Distribution (MCQ only)</h4>
                    <div class="text-sm">${mcqDistText}</div>
                    <div class="text-xs text-gray-600 mt-1">Total MCQ: ${mcqAnswers.length} | Version: ${versionLabel}</div>
                </div>`;
        }
        if (tfs.length > 0) {
            distributionHtml += `
                <div class="p-4 bg-gray-100 rounded">
                    <h4 class="font-semibold mb-2">Answer Distribution (T/F only)</h4>
                    <div class="text-sm">${tfDistText}</div>
                    <div class="text-xs text-gray-600 mt-1">Total T/F: ${tfs.length} | Version: ${versionLabel}</div>
                </div>`;
        }
        distributionEl.innerHTML = distributionHtml;
    }

    testPreview.innerHTML = testHtml;
    answerKeyPreview.innerHTML = answerKeyHtml;

    // Show output panel, hide empty state
    const outputEl = document.getElementById('output');
    const emptyEl  = document.getElementById('testEmptyState');
    if (outputEl) outputEl.classList.remove('hidden');
    if (emptyEl)  emptyEl.classList.add('hidden');

    // Update status bar
    updateStatusGenerated();
}

// Display summary of unused questions
function displayUnusedSummary() {
    const summaryDiv = document.getElementById('unusedSummary');
    const exportBtn = document.getElementById('exportUnusedJson');
    const section = document.getElementById('unusedQuestionsSection');

    if (!lastUnusedQuestions || lastUnusedQuestions.length === 0) {
        if (section) section.classList.remove('hidden');
        summaryDiv.innerHTML = `<p class="text-sm text-green-600 font-semibold">✅ No unused questions.</p>`;
        exportBtn.disabled = true;
        return;
    }

    if (section) section.classList.remove('hidden');

    // Count by category and type
    const unusedByCategory = {};
    lastUnusedQuestions.forEach(q => {
        if (!unusedByCategory[q.category]) {
            unusedByCategory[q.category] = { mc: 0, tf: 0, mt: 0, total: 0 };
        }
        if (q.type === 'multiple_choice') unusedByCategory[q.category].mc++;
        else if (q.type === 'true_false') unusedByCategory[q.category].tf++;
        else if (q.type === 'matching') unusedByCategory[q.category].mt++;
        unusedByCategory[q.category].total++;
    });

    const cats = Object.keys(unusedByCategory);
    let totalMc = 0, totalTf = 0, totalMt = 0, grandTotal = 0;
    cats.forEach(cat => {
        totalMc += unusedByCategory[cat].mc;
        totalTf += unusedByCategory[cat].tf;
        totalMt += unusedByCategory[cat].mt;
        grandTotal += unusedByCategory[cat].total;
    });

    const to = TBL.orange;
    let rows = cats.map((cat, i) => {
        const s = unusedByCategory[cat];
        const bg = tblRowBg(to, i);
        return `<tr style="background:${bg};">
            ${tblTd(to, cat, 'left')}
            ${tblTd(to, s.mc || '—')}
            ${tblTd(to, s.tf || '—')}
            ${tblTd(to, s.mt || '—')}
            ${tblTd(to, `<strong>${s.total}</strong>`)}
        </tr>`;
    }).join('');

    rows += `<tr>
        ${tblTotalTd(to, 'Total', 'left')}
        ${tblTotalTd(to, totalMc || '—')}
        ${tblTotalTd(to, totalTf || '—')}
        ${tblTotalTd(to, totalMt || '—')}
        ${tblTotalTd(to, grandTotal)}
    </tr>`;

    summaryDiv.innerHTML = `
        <div class="overflow-x-auto">
            <table class="w-full table-fixed border-collapse" style="border:1px solid ${to.hBdr};">
                <colgroup>
                    <col style="width:20%"><col style="width:20%"><col style="width:20%"><col style="width:20%"><col style="width:20%">
                </colgroup>
                <thead><tr>
                    ${tblTh(to,'Category','left')}
                    ${tblTh(to,'MCQ')}
                    ${tblTh(to,'T/F')}
                    ${tblTh(to,'Matching')}
                    ${tblTh(to,'Total')}
                </tr></thead>
                <tbody>${rows}</tbody>
            </table>
        </div>
    `;

    exportBtn.disabled = false;
    updateUnusedPreview();
}

// Update the preview of unused questions
function updateUnusedPreview() {
    const previewContent = document.getElementById('unusedPreviewContent');
    
    if (!lastUnusedQuestions || lastUnusedQuestions.length === 0) {
        previewContent.textContent = 'No unused questions.';
        return;
    }

    // Show first 20 questions in preview
    const preview = lastUnusedQuestions.slice(0, 20);
    let previewText = JSON.stringify(preview, null, 2);
    
    if (lastUnusedQuestions.length > 20) {
        previewText += `\n\n... and ${lastUnusedQuestions.length - 20} more questions`;
    }

    previewContent.textContent = previewText;
}

// Export unused questions as JSON
function exportUnusedAsJson() {
    if (!lastUnusedQuestions || lastUnusedQuestions.length === 0) {
        showToast('⚠️ No unused questions to export.', 'warning');
        return;
    }

    // Clean up the data (remove display-specific fields)
    const dataToExport = lastUnusedQuestions.map(q => ({
        question: q.question,
        category: q.category,
        type: q.type,
        correct: q.correct,
        choices: q.choices
    }));

    const unusedFilename = getFilename('json').replace('.json','') + '_unused.json';
    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = unusedFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(`📄 Unused questions exported as ${unusedFilename}`, 'success');
    console.log(`Exported ${dataToExport.length} unused questions as ${unusedFilename}`);
}

// ========================================
// EXCLUSION MANAGEMENT
// ========================================

// Load exclusion file (JSON of already-used questions)
function loadExclusionFile() {
    const fileInput = document.getElementById('loadExclusionFile');
    
    if (fileInput.files.length === 0) {
        showToast('⚠️ Please select a JSON file to load.', 'warning');
        return;
    }

    const file = fileInput.files[0];
    const reader = new FileReader();

    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);

            if (!Array.isArray(data)) {
                throw new Error('File must contain an array of questions');
            }

            // Normalize the data (handle both formats)
            const normalizedData = data.map(question => {
                if (question.choices) {
                    return question;
                } else if (question.option_1) {
                    return {
                        ...question,
                        choices: [
                            question.option_1,
                            question.option_2,
                            question.option_3,
                            question.option_4
                        ]
                    };
                } else {
                    return question;
                }
            });

            excludedQuestions = normalizedData;
            updateExclusionStatus();
            
            // Enable clear button
            document.getElementById('clearExclusionBtn').disabled = false;
            
            console.log(`Loaded ${excludedQuestions.length} questions to exclude`);
            
        } catch (error) {
            console.error('Error loading exclusion file:', error);
            showToast('❌ Error loading file: ' + error.message, 'error');
        }
    };

    reader.readAsText(file);
}

// Clear exclusions
function clearExclusions() {
    if (excludedQuestions.length === 0) {
        return;
    }

    if (confirm(`Clear ${excludedQuestions.length} excluded questions? They will be available for selection again.`)) {
        excludedQuestions = [];
        updateExclusionStatus();
        document.getElementById('clearExclusionBtn').disabled = true;
        document.getElementById('loadExclusionFile').value = ''; // Clear file input
        console.log('Exclusions cleared');
    }
}

// Update the exclusion status display
function updateExclusionStatus() {
    const statusDiv = document.getElementById('exclusionStatus');
    
    if (excludedQuestions.length === 0) {
        statusDiv.innerHTML = `
            <p class="text-gray-600">No exclusions loaded. All questions in test bank are available.</p>
        `;
        return;
    }

    // Count by category and type
    const excludedByCategory = {};
    excludedQuestions.forEach(q => {
        if (!excludedByCategory[q.category]) {
            excludedByCategory[q.category] = { mc: 0, tf: 0, total: 0 };
        }
        if (q.type === 'multiple_choice') excludedByCategory[q.category].mc++;
        if (q.type === 'true_false') excludedByCategory[q.category].tf++;
        excludedByCategory[q.category].total++;
    });

    // Build status HTML
    let statusHtml = `
        <div class="p-3 bg-red-50 border border-red-200 rounded">
            <p class="font-semibold text-red-800 mb-2">🚫 Excluding ${excludedQuestions.length} questions:</p>
            <ul class="list-disc list-inside text-sm text-gray-700 ml-2 space-y-1">
    `;

    Object.keys(excludedByCategory).forEach(cat => {
        const stats = excludedByCategory[cat];
        statusHtml += `
            <li><strong>${escapeHtml(cat)}:</strong> ${stats.total} questions (MCQ: ${stats.mc}, T/F: ${stats.tf})</li>
        `;
    });

    statusHtml += `
            </ul>
            <p class="text-xs text-gray-600 mt-2">These questions will not appear in generated tests.</p>
        </div>
    `;

    statusDiv.innerHTML = statusHtml;
}

// Check if a question should be excluded (by matching question text)
function isQuestionExcluded(question) {
    if (excludedQuestions.length === 0) {
        return false;
    }

    // Match by question text (case-insensitive, trimmed)
    const questionText = question.question.trim().toLowerCase();
    
    return excludedQuestions.some(excluded => {
        const excludedText = excluded.question.trim().toLowerCase();
        return questionText === excludedText;
    });
}

// Display detailed generation report
function displayGenerationReport() {
    const reportDiv = document.getElementById('generationReport');
    
    if (!generationStats || Object.keys(generationStats).length === 0) {
        reportDiv.innerHTML = `
            <p class="text-sm text-gray-600">Generate a test to see the detailed breakdown.</p>
        `;
        return;
    }

    // Calculate totals (generation-time shortfall only)
    let totalRequested = 0;
    let totalGenerated = 0;
    let genShortfall = 0;

    Object.values(generationStats).forEach(stat => {
        totalRequested += stat.mcRequested + stat.tfRequested + stat.mtRequested;
        totalGenerated += stat.mcGenerated + stat.tfGenerated + stat.mtGenerated;
        genShortfall  += stat.mcShortfall  + stat.tfShortfall  + stat.mtShortfall;
    });

    // Smart Select shortfall (logged before generateTest ran)
    const ssShortfall = lastSmartSelectShortfalls
        ? lastSmartSelectShortfalls.mcShortfall + lastSmartSelectShortfalls.tfShortfall + lastSmartSelectShortfalls.mtShortfall
        : 0;

    const totalShortfall = genShortfall + ssShortfall;

    // Build report HTML — Summary
    let reportHtml = `
        <div class="mb-4">
            <h3 class="text-sm font-semibold mb-2 flex items-center gap-1" style="color:var(--text);"><svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2"/></svg>Summary</h3>
            <div class="grid grid-cols-3 gap-4 text-center">
                <div class="p-3 bg-blue-50 border border-blue-200 rounded">
                    <div class="text-2xl font-bold text-blue-600">${totalRequested + ssShortfall}</div>
                    <div class="text-xs text-blue-700">Requested</div>
                </div>
                <div class="p-3 bg-green-50 border border-green-200 rounded">
                    <div class="text-2xl font-bold text-green-600">${totalGenerated}</div>
                    <div class="text-xs text-green-700">Generated</div>
                </div>
                <div class="p-3 ${totalShortfall > 0 ? 'bg-red-50 border border-red-200' : 'bg-gray-50 border border-gray-200'} rounded">
                    <div class="text-2xl font-bold ${totalShortfall > 0 ? 'text-red-600' : 'text-gray-400'}">${totalShortfall}</div>
                    <div class="text-xs ${totalShortfall > 0 ? 'text-red-700' : 'text-gray-500'}">Shortfall</div>
                </div>
            </div>
        </div>
    `;

    // Detailed breakdown by category
    {
        const ti = TBL.indigo;
        let catRows = '';
        let rowIdx = 0;
        let totReq = 0, totAvail = 0, totGen = 0;

        Object.keys(generationStats).forEach(cat => {
            const stat = generationStats[cat];
            const activeTypes = [
                stat.mcRequested > 0 && { label:'MCQ',      req:stat.mcRequested, avail:stat.mcAvailable, gen:stat.mcGenerated },
                stat.tfRequested  > 0 && { label:'T/F',      req:stat.tfRequested,  avail:stat.tfAvailable,  gen:stat.tfGenerated  },
                stat.mtRequested  > 0 && { label:'Matching', req:stat.mtRequested,  avail:stat.mtAvailable,  gen:stat.mtGenerated  },
            ].filter(Boolean);
            const span = activeTypes.length || 1;

            if (activeTypes.length === 0) {
                const avail = stat.mcAvailable + stat.tfAvailable + stat.mtAvailable;
                const bg = tblRowBg(ti, rowIdx++);
                catRows += `<tr style="background:${bg};">
                    ${tblTd(ti, escapeHtml(cat), 'left', 'font-weight:600;')}
                    ${tblTd(ti, '—')}${tblTd(ti, '0')}${tblTd(ti, avail)}${tblTd(ti, '0')}
                </tr>`;
            } else {
                activeTypes.forEach((tp, tpIdx) => {
                    const bg = tblRowBg(ti, rowIdx++);
                    totReq += tp.req; totAvail += tp.avail; totGen += tp.gen;
                    const catCell = tpIdx === 0
                        ? `<td class="px-3 py-1.5 text-xs font-semibold border" rowspan="${span}" style="text-align:left;vertical-align:middle;background:${bg};border-color:${ti.cBdr};">${escapeHtml(cat)}</td>`
                        : '';
                    catRows += `<tr style="background:${bg};">
                        ${catCell}
                        ${tblTd(ti, tp.label)}
                        ${tblTd(ti, tp.req)}
                        ${tblTd(ti, tp.avail)}
                        ${tblTd(ti, `<strong>${tp.gen}</strong>`)}
                    </tr>`;
                });
            }
        });

        catRows += `<tr>
            ${tblTotalTd(ti,'Total','left')}
            ${tblTotalTd(ti,'')}
            ${tblTotalTd(ti,totReq)}
            ${tblTotalTd(ti,totAvail)}
            ${tblTotalTd(ti,totGen)}
        </tr>`;

        reportHtml += `
            <div class="mb-4">
                <h3 class="text-sm font-semibold mb-2 flex items-center gap-1" style="color:var(--text);"><svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16"/></svg>Breakdown by Category</h3>
                <div class="overflow-x-auto">
                    <table class="w-full table-fixed border-collapse" style="border:1px solid ${ti.hBdr};">
                        <colgroup><col style="width:20%"><col style="width:20%"><col style="width:20%"><col style="width:20%"><col style="width:20%"></colgroup>
                        <thead><tr>
                            ${tblTh(ti,'Category','left')}
                            ${tblTh(ti,'Type')}${tblTh(ti,'Requested')}${tblTh(ti,'Available')}${tblTh(ti,'Generated')}
                        </tr></thead>
                        <tbody>${catRows}</tbody>
                    </table>
                </div>
            </div>
        `;
    }

    // Unified Shortfall table
    {
        // Build per-category generation shortfall rows
        const catRows = [];
        Object.keys(generationStats).forEach(cat => {
            const s = generationStats[cat];
            if (s.mcShortfall > 0) catRows.push({ source: cat, type: 'MCQ',      requested: s.mcRequested, available: s.mcAvailable, shortfall: s.mcShortfall });
            if (s.tfShortfall > 0) catRows.push({ source: cat, type: 'T/F',      requested: s.tfRequested, available: s.tfAvailable, shortfall: s.tfShortfall });
            if (s.mtShortfall > 0) catRows.push({ source: cat, type: 'Matching', requested: s.mtRequested, available: s.mtAvailable, shortfall: s.mtShortfall });
        });

        // Build SS shortfall rows
        const ssRows = [];
        if (lastSmartSelectShortfalls) {
            const ss = lastSmartSelectShortfalls;
            if (ss.mcShortfall > 0) ssRows.push({ type: 'MCQ',      target: ss.mcTarget, sf: ss.mcShortfall });
            if (ss.tfShortfall > 0) ssRows.push({ type: 'T/F',      target: ss.tfTarget, sf: ss.tfShortfall });
            if (ss.mtShortfall > 0) ssRows.push({ type: 'Matching', target: ss.mtTarget, sf: ss.mtShortfall });
        }

        const hasAnyShortfall = catRows.length > 0 || ssRows.length > 0;

        reportHtml += `
            <div class="mb-4">
                <h3 class="text-sm font-semibold mb-2 flex items-center gap-1 ${hasAnyShortfall ? 'text-red-700' : ''}" style="${hasAnyShortfall ? '' : 'color:var(--text);'}">
                    <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg>
                    Shortfall
                </h3>
        `;

        if (!hasAnyShortfall) {
            reportHtml += `<p class="text-sm text-green-600 font-medium">✅ No shortfall detected.</p>`;
        } else {
            const tr = TBL.red;
            let allRows = '';
            let rowIdx = 0;
            let totalRequested2 = 0, totalAvailable2 = 0, totalSF = 0;

            // Group catRows by source for rowspan
            const catGroups = {};
            catRows.forEach(r => {
                if (!catGroups[r.source]) catGroups[r.source] = [];
                catGroups[r.source].push(r);
            });
            // Emit cat rows with rowspan on source cell
            Object.entries(catGroups).forEach(([src, rows]) => {
                rows.forEach((r, ri) => {
                    const bg = tblRowBg(tr, rowIdx++);
                    totalRequested2 += r.requested; totalAvailable2 += r.available; totalSF += r.shortfall;
                    const srcCell = ri === 0
                        ? `<td class="px-3 py-1.5 text-xs font-semibold border" rowspan="${rows.length}" style="text-align:left;vertical-align:middle;background:${bg};border-color:${tr.cBdr};">${src}</td>`
                        : '';
                    allRows += `<tr style="background:${bg};">
                        ${srcCell}
                        ${tblTd(tr, r.type)}
                        ${tblTd(tr, 'Generation')}
                        ${tblTd(tr, r.requested)}
                        ${tblTd(tr, r.available)}
                        ${tblTd(tr, `<strong style="color:#dc2626;">${r.shortfall}</strong>`)}
                    </tr>`;
                });
            });
            ssRows.forEach(r => {
                const bg = tblRowBg(tr, rowIdx++);
                const avail = r.target - r.sf;
                totalRequested2 += r.target; totalAvailable2 += avail; totalSF += r.sf;
                allRows += `<tr style="background:${bg};">
                    ${tblTd(tr, 'Smart Select', 'left', 'font-weight:600;')}
                    ${tblTd(tr, r.type)}
                    ${tblTd(tr, 'Smart Select')}
                    ${tblTd(tr, r.target)}
                    ${tblTd(tr, avail)}
                    ${tblTd(tr, `<strong style="color:#dc2626;">${r.sf}</strong>`)}
                </tr>`;
            });

            allRows += `<tr>
                <td class="px-3 py-1.5 text-xs font-bold border" colspan="3" style="text-align:left;background:${tr.tBg};color:${tr.tTxt};border-color:${tr.tBdr};">Total</td>
                ${tblTotalTd(tr,totalRequested2)}
                ${tblTotalTd(tr,totalAvailable2)}
                ${tblTotalTd(tr,totalSF)}
            </tr>`;

            reportHtml += `
                <div class="overflow-x-auto">
                    <table class="w-full table-fixed border-collapse" style="border:1px solid ${tr.hBdr};">
                        <colgroup><col style="width:16.6%"><col style="width:16.6%"><col style="width:16.6%"><col style="width:16.6%"><col style="width:16.6%"><col style="width:16.6%"></colgroup>
                        <thead><tr>
                            ${tblTh(tr,'Category','left')}
                            ${tblTh(tr,'Type')}${tblTh(tr,'Source')}${tblTh(tr,'Requested')}${tblTh(tr,'Available')}${tblTh(tr,'Shortfall')}
                        </tr></thead>
                        <tbody>${allRows}</tbody>
                    </table>
                </div>
            `;
        }

        reportHtml += `</div>`;
    }

    reportDiv.innerHTML = reportHtml;

    // Difficulty Breakdown section — always shown
    {
        const tiers = ['easy','medium','hard','unset'];
        const tierLabel  = { unset:'Unset',  easy:'Easy',   medium:'Medium', hard:'Hard' };
        const tierColor  = { easy:'#16a34a', medium:'#d97706', hard:'#dc2626', unset:'#6b7280' };
        const tierBg     = { easy:'#f0fdf4', medium:'#fffbeb', hard:'#fef2f2', unset:'#f9fafb' };

        // Check if any difficulty data exists at all
        let anyDiffData = false;
        let hasDiffShortfall = false;
        let rows = [];

        Object.keys(generationStats).forEach(cat => {
            const stat = generationStats[cat];
            const typeMap = [
                { label: 'MCQ',      stats: stat.mcDiffStats },
                { label: 'T/F',      stats: stat.tfDiffStats },
                { label: 'Matching', stats: stat.mtDiffStats },
            ].filter(t => t.stats);

            typeMap.forEach(({ label, stats }) => {
                tiers.forEach(tier => {
                    const s = stats[tier];
                    if (!s || s.requested === 0) return;
                    anyDiffData = true;
                    if (s.shortfall > 0) hasDiffShortfall = true;
                    rows.push({ cat, label, tier, s });
                });
            });
        });

        const diffIcon = `<svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>`;

        let diffHtml = `<div class="mt-4">
            <h3 class="text-sm font-semibold mb-1 flex items-center gap-1" style="color:var(--text);">${diffIcon}Breakdown by Difficulty</h3>`;

        if (hasDiffShortfall) {
            diffHtml += `<p class="text-xs text-red-600 mb-2">⚠️ Some difficulty tiers ran short. Unset questions were used where available. Consider adjusting the ratio or adding more questions of the needed difficulty.</p>`;
        }

        if (!anyDiffData) {
            diffHtml += `<p class="text-sm text-gray-500 italic">No difficulty set.</p>`;
        } else {
            const ts = TBL.slate;
            // Group rows by cat+label for rowspan on Category and Type cells
            // Build groups: [{cat, label, rows:[]}]
            const groups = [];
            rows.forEach(r => {
                const last = groups[groups.length - 1];
                if (last && last.cat === r.cat && last.label === r.label) {
                    last.rows.push(r);
                } else {
                    groups.push({ cat: r.cat, label: r.label, rows: [r] });
                }
            });
            // For cat-level rowspan, collect consecutive groups with same cat
            const catGroups = [];
            groups.forEach(g => {
                const last = catGroups[catGroups.length - 1];
                if (last && last.cat === g.cat) { last.groups.push(g); }
                else catGroups.push({ cat: g.cat, groups: [g] });
            });

            let diffRowIdx = 0;
            let diffRows = '';
            let totReqD = 0, totFromD = 0, totSFD = 0;

            catGroups.forEach(cg => {
                const catSpan = cg.groups.reduce((sum, g) => sum + g.rows.length, 0);
                let catEmitted = false;
                cg.groups.forEach(g => {
                    const typeSpan = g.rows.length;
                    let typeEmitted = false;
                    g.rows.forEach(({ tier, s }) => {
                        const bg = tblRowBg(ts, diffRowIdx++);
                        totReqD += s.requested; totFromD += s.fromTier; totSFD += s.shortfall;
                        const col = tierColor[tier];
                        const sfVal = s.shortfall > 0 ? `<strong style="color:#dc2626;">${s.shortfall}</strong>` : '—';
                        const catCell = !catEmitted
                            ? `<td class="px-3 py-1.5 text-xs font-semibold border" rowspan="${catSpan}" style="text-align:left;vertical-align:middle;background:${bg};border-color:${ts.cBdr};">${cg.cat}</td>`
                            : '';
                        const typeCell = !typeEmitted
                            ? `<td class="px-3 py-1.5 text-xs border" rowspan="${typeSpan}" style="text-align:center;vertical-align:middle;background:${bg};border-color:${ts.cBdr};">${g.label}</td>`
                            : '';
                        catEmitted = true; typeEmitted = true;
                        diffRows += `<tr style="background:${bg};">
                            ${catCell}${typeCell}
                            <td class="px-3 py-1.5 text-xs font-semibold border" style="text-align:center;color:${col};border-color:${ts.cBdr};">${tierLabel[tier]}</td>
                            ${tblTd(ts, s.requested)}
                            ${tblTd(ts, s.fromTier)}
                            ${tblTd(ts, sfVal)}
                        </tr>`;
                    });
                });
            });

            diffRows += `<tr>
                <td class="px-3 py-1.5 text-xs font-bold border" colspan="3" style="text-align:left;background:${ts.tBg};color:${ts.tTxt};border-color:${ts.tBdr};">Total</td>
                ${tblTotalTd(ts, totReqD)}
                ${tblTotalTd(ts, totFromD)}
                ${tblTotalTd(ts, totSFD || '—')}
            </tr>`;

            diffHtml += `<div class="overflow-x-auto"><table class="w-full table-fixed border-collapse" style="border:1px solid ${ts.hBdr};">
                <colgroup><col style="width:16.66%"><col style="width:16.66%"><col style="width:16.66%"><col style="width:16.66%"><col style="width:16.66%"><col style="width:16.66%"></colgroup>
                <thead><tr>
                    ${tblTh(ts,'Category','left')}
                    ${tblTh(ts,'Type')}${tblTh(ts,'Difficulty')}${tblTh(ts,'Requested')}${tblTh(ts,'From Tier')}${tblTh(ts,'Shortfall')}
                </tr></thead>
                <tbody>${diffRows}</tbody>
            </table></div>`;
        }

        diffHtml += `</div>`;
        reportDiv.innerHTML += diffHtml;
    }
}

// Clear all question count inputs
function clearAllCategoryInputs() {
    const categoryInputs = document.getElementById('categoryInputs');
    const inputs = categoryInputs.querySelectorAll('input[type="number"]');

    // Snapshot current values for undo
    const snapshot = {};
    inputs.forEach(input => { snapshot[input.id] = input.value; });
    pushUndo('Category inputs cleared', () => {
        Object.entries(snapshot).forEach(([id, val]) => {
            const el = document.getElementById(id);
            if (el) {
                el.value = val;
                el.dispatchEvent(new Event('input', { bubbles: true }));
            }
        });
        showToast('✅ Inputs restored', 'success');
    });

    inputs.forEach(input => {
        input.value = '0';
        input.dispatchEvent(new Event('input', { bubbles: true }));
    });

    ['balanceTargetMC', 'balanceTargetTF', 'balanceTargetMT'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '0';
    });
    lastSmartSelectShortfalls = null;

    // Clear generation report and unused questions
    lastUnusedQuestions = [];
    const unusedSection = document.getElementById('unusedQuestionsSection');
    if (unusedSection) unusedSection.classList.add('hidden');
    const unusedSummaryEl = document.getElementById('unusedSummary');
    if (unusedSummaryEl) unusedSummaryEl.innerHTML = '';
    const exportUnusedBtn = document.getElementById('exportUnusedJson');
    if (exportUnusedBtn) exportUnusedBtn.disabled = true;
    const reportDiv2 = document.getElementById('generationReport');
    if (reportDiv2) reportDiv2.innerHTML = 'Generate a test to see the detailed breakdown.';
    const summaryEl = document.getElementById('testSummary');
    if (summaryEl) summaryEl.textContent = `Total questions to generate: 0`;
    const summaryTotal2 = document.getElementById('testSummaryTotal');
    if (summaryTotal2) summaryTotal2.textContent = `Total questions to generate: 0`;

    showUndoToast('Cleared all inputs.');
}

// Select all available questions - Test Generator tab
function selectAllAvailableQuestions() {
    if (!testBank || testBank.length === 0) {
        showToast('⚠️ No questions loaded.', 'warning');
        return;
    }

    const categories = [...new Set(testBank.map(q => q.category))];
    const container = document.getElementById('categoryInputs');
    if (!container) return;

    categories.forEach(cat => {
        const safeCat = safeIdFromCategory(cat);
        const mcInput = document.getElementById(`cat_${safeCat}_mc`);
        const tfInput = document.getElementById(`cat_${safeCat}_tf`);
        const mtInput = document.getElementById(`cat_${safeCat}_mt`);

        const mcAvail = testBank.filter(q => q.category === cat && q.type === 'multiple_choice').length
                      - excludedQuestions.filter(q => q.category === cat && q.type === 'multiple_choice').length;
        const tfAvail = testBank.filter(q => q.category === cat && q.type === 'true_false').length
                      - excludedQuestions.filter(q => q.category === cat && q.type === 'true_false').length;
        const mtAvail = testBank.filter(q => q.category === cat && q.type === 'matching').length
                      - excludedQuestions.filter(q => q.category === cat && q.type === 'matching').length;

        if (mcInput) {
            mcInput.value = Math.max(0, mcAvail);
            mcInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
        if (tfInput) {
            tfInput.value = Math.max(0, tfAvail);
            tfInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
        if (mtInput) {
            mtInput.value = Math.max(0, mtAvail);
            mtInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
    });

    showToast('✅ Selected all available questions', 'success');
}

// ── Difficulty ratio helpers ───────────────────────────────────────────────────

const DIFF_PRESETS = {
    ignore: { unset: 100, easy: 0,  medium: 0,  hard: 0  },
    even:   { unset: 0,   easy: 34, medium: 33, hard: 33 },
    easy:   { unset: 0,   easy: 50, medium: 30, hard: 20 },
    medium: { unset: 0,   easy: 30, medium: 50, hard: 20 },
    hard:   { unset: 0,   easy: 20, medium: 30, hard: 50 },
};

function applyDiffRatioPreset() {
    const preset = document.getElementById('diffRatioPreset')?.value || 'ignore';
    const p = DIFF_PRESETS[preset] || DIFF_PRESETS.ignore;
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };
    set('diffRatioUnset',  p.unset);
    set('diffRatioEasy',   p.easy);
    set('diffRatioMedium', p.medium);
    set('diffRatioHard',   p.hard);
    const fmt = v => v > 0 ? `${v}%` : '—';
    const label = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = fmt(val); };
    label('diffLabelEasy',   p.easy);
    label('diffLabelMedium', p.medium);
    label('diffLabelHard',   p.hard);
}

function updateDiffRatioTotal() { /* no-op — kept for compatibility */ }

function getDiffRatioTotal() {
    return ['diffRatioUnset','diffRatioEasy','diffRatioMedium','diffRatioHard']
        .reduce((sum, id) => sum + (parseInt(document.getElementById(id)?.value, 10) || 0), 0);
}

function getDiffRatio() {
    return {
        unset:  parseInt(document.getElementById('diffRatioUnset')?.value,  10) || 0,
        easy:   parseInt(document.getElementById('diffRatioEasy')?.value,   10) || 0,
        medium: parseInt(document.getElementById('diffRatioMedium')?.value, 10) || 0,
        hard:   parseInt(document.getElementById('diffRatioHard')?.value,   10) || 0,
    };
}

function isDiffRatioActive(ratio) {
    // Ratio is "active" (i.e. not the default 100% unset) if any non-unset tier > 0
    return ratio.easy > 0 || ratio.medium > 0 || ratio.hard > 0;
}

// Split `total` into per-difficulty counts according to ratio, using integer floor + remainder distribution.
// Priority order for remainders: unset → easy → medium → hard
function splitByRatio(total, ratio) {
    const tiers = ['unset','easy','medium','hard'];
    const pct = { unset: ratio.unset, easy: ratio.easy, medium: ratio.medium, hard: ratio.hard };
    const sum = tiers.reduce((s, t) => s + pct[t], 0);
    if (sum === 0) return { unset: total, easy: 0, medium: 0, hard: 0 };

    const floored = {};
    let allocated = 0;
    tiers.forEach(t => {
        floored[t] = Math.floor(total * pct[t] / sum);
        allocated += floored[t];
    });
    let remainder = total - allocated;
    // Distribute remainder by priority
    for (const t of tiers) {
        if (remainder <= 0) break;
        if (pct[t] > 0) { floored[t]++; remainder--; }
    }
    return floored;
}

// Select `count` questions of a specific type from a pool, respecting difficulty ratio.
// Falls back to Unset questions when a difficulty tier runs short.
// Returns { selected, diffStats: { requested, fromTier, fromUnset, shortfall } per diff }
function selectWithDifficulty(pool, count, ratio, randomize) {
    if (count <= 0) return { selected: [], diffStats: {} };

    const active = isDiffRatioActive(ratio);
    if (!active) {
        // No difficulty filtering — just pick count from pool
        const shuffled = randomize ? shuffleArray([...pool]) : [...pool];
        return { selected: shuffled.slice(0, Math.min(count, pool.length)), diffStats: null };
    }

    const split = splitByRatio(count, ratio);
    const tiers = ['unset','easy','medium','hard'];
    const byTier = {};
    tiers.forEach(t => {
        byTier[t] = pool.filter(q => {
            const d = q.difficulty || 'unset';
            return d === t;
        });
        if (randomize) byTier[t] = shuffleArray(byTier[t]);
    });

    const selected = [];
    const diffStats = {};
    const unsetPool = [...byTier.unset];

    tiers.forEach(t => {
        const needed = split[t] || 0;
        if (needed === 0) return;
        const available = byTier[t];
        const fromTier = available.slice(0, Math.min(needed, available.length));
        let shortfall = needed - fromTier.length;
        let fromUnset = [];

        // Pull from Unset pool to cover shortfall (skip unset tier itself)
        if (shortfall > 0 && t !== 'unset') {
            fromUnset = unsetPool.splice(0, Math.min(shortfall, unsetPool.length));
            shortfall -= fromUnset.length;
        }

        diffStats[t] = { requested: needed, fromTier: fromTier.length, fromUnset: fromUnset.length, shortfall };
        selected.push(...fromTier, ...fromUnset);
    });

    return { selected, diffStats };
}

// Evenly distribute `target` items across categories, respecting each category's cap.
function distributeEvenly(target, caps) {
    const alloc = {};
    caps.forEach(c => { alloc[c.key] = 0; });
    let remaining = target;
    let active = caps.filter(c => c.cap > 0).map(c => c.key);
    while (remaining > 0 && active.length > 0) {
        let progressed = false;
        for (const key of active.slice()) {
            if (remaining <= 0) break;
            const cap = caps.find(c => c.key === key).cap;
            if (alloc[key] < cap) {
                alloc[key]++;
                remaining--;
                progressed = true;
            } else {
                active = active.filter(k => k !== key);
            }
        }
        if (!progressed) break;
    }
    return { alloc, shortfall: remaining };
}

// Balanced Pick Across Categories - Test Generator tab
function balancedPickAcrossCategories() {
    if (!testBank || testBank.length === 0) {
        showToast('⚠️ No questions loaded.', 'warning');
        return;
    }

    const ratio = getDiffRatio();
    const ratioTotal = getDiffRatioTotal();
    if (isDiffRatioActive(ratio) && ratioTotal !== 100) {
        showToast('⚠️ Difficulty ratio must sum to 100% before using Balanced Pick.', 'warning');
        return;
    }

    const targetMC = parseInt(document.getElementById('balanceTargetMC')?.value, 10) || 0;
    const targetTF = parseInt(document.getElementById('balanceTargetTF')?.value, 10) || 0;
    const targetMT = parseInt(document.getElementById('balanceTargetMT')?.value, 10) || 0;

    if (targetMC + targetTF + targetMT <= 0) {
        showToast('⚠️ Enter at least one target total (MCQ, T/F, or Matching).', 'warning');
        return;
    }

    const categories = [...new Set(testBank.map(q => q.category))];
    if (categories.length === 0) {
        showToast('⚠️ No categories found in bank.', 'warning');
        return;
    }

    const availFor = (cat, type) =>
        Math.max(0,
            testBank.filter(q => q.category === cat && q.type === type).length -
            excludedQuestions.filter(q => q.category === cat && q.type === type).length
        );

    const mcCaps = categories.map(cat => ({ key: cat, cap: availFor(cat, 'multiple_choice') }));
    const tfCaps = categories.map(cat => ({ key: cat, cap: availFor(cat, 'true_false') }));
    const mtCaps = categories.map(cat => ({ key: cat, cap: availFor(cat, 'matching') }));

    const mcResult = distributeEvenly(targetMC, mcCaps);
    const tfResult = distributeEvenly(targetTF, tfCaps);
    const mtResult = distributeEvenly(targetMT, mtCaps);

    // Reset SS shortfalls on every run
    lastSmartSelectShortfalls = null;

    categories.forEach(cat => {
        const safeCat = safeIdFromCategory(cat);
        const mcInput = document.getElementById(`cat_${safeCat}_mc`);
        const tfInput = document.getElementById(`cat_${safeCat}_tf`);
        const mtInput = document.getElementById(`cat_${safeCat}_mt`);

        if (mcInput) { mcInput.value = mcResult.alloc[cat] || 0; mcInput.dispatchEvent(new Event('input', { bubbles: true })); }
        if (tfInput) { tfInput.value = tfResult.alloc[cat] || 0; tfInput.dispatchEvent(new Event('input', { bubbles: true })); }
        if (mtInput) { mtInput.value = mtResult.alloc[cat] || 0; mtInput.dispatchEvent(new Event('input', { bubbles: true })); }
    });

    const totalShortfall = mcResult.shortfall + tfResult.shortfall + mtResult.shortfall;
    if (totalShortfall > 0) {
        lastSmartSelectShortfalls = {
            mcTarget: targetMC, tfTarget: targetTF, mtTarget: targetMT,
            mcShortfall: mcResult.shortfall, tfShortfall: tfResult.shortfall, mtShortfall: mtResult.shortfall
        };
        showToast('⚠️ Balanced pick applied with shortfalls. See Generation Report after generating.', 'warning');
    } else {
        showToast(`✅ Balanced pick applied across ${categories.length} categories.`, 'success');
    }
}
