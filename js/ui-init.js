document.addEventListener('DOMContentLoaded', function () {
    console.log(`🔧 Initializing Coeus v${APP_VERSION}...`);

    // ── Version display ─────────────────────────────────────────
    document.querySelectorAll('.footer-version').forEach(el => el.textContent = APP_VERSION);

    // ── Welcome / Changelog modals ──────────────────────────────
    const seenWelcome      = localStorage.getItem('coeus-seen-welcome');
    const lastSeenVersion  = localStorage.getItem('coeus-last-seen-version');

    const welcomeModal    = document.getElementById('welcomeModal');
    const changelogModal  = document.getElementById('changelogModal');

    function showWelcome() {
        if (welcomeModal) {
            welcomeModal.classList.remove('hidden');
            welcomeModal.classList.add('flex');
        }
    }

    function dismissWelcome() {
        if (welcomeModal) {
            welcomeModal.classList.add('hidden');
            welcomeModal.classList.remove('flex');
        }
        localStorage.setItem('coeus-seen-welcome', 'true');
        localStorage.setItem('coeus-last-seen-version', APP_VERSION);
    }

    function showChangelog() {
        const entries = CHANGELOG[APP_VERSION] || [];
        const content = document.getElementById('changelogContent');
        if (content) {
            content.innerHTML = entries.length
                ? entries.map(e => `<p class="flex gap-2"><span style="color:#3b82f6;">▸</span><span>${e}</span></p>`).join('')
                : '<p>Minor fixes and improvements.</p>';
        }
        if (changelogModal) {
            changelogModal.classList.remove('hidden');
            changelogModal.classList.add('flex');
        }
    }

    function dismissChangelog() {
        if (changelogModal) {
            changelogModal.classList.add('hidden');
            changelogModal.classList.remove('flex');
        }
        localStorage.setItem('coeus-last-seen-version', APP_VERSION);
    }

    document.getElementById('welcomeDismissBtn')?.addEventListener('click', dismissWelcome);
    document.getElementById('changelogDismissBtn')?.addEventListener('click', dismissChangelog);
    document.getElementById('changelogGotItBtn')?.addEventListener('click', dismissChangelog);
    changelogModal?.addEventListener('click', e => { if (e.target === changelogModal) dismissChangelog(); });

    if (!seenWelcome) {
        showWelcome();
    } else if (lastSeenVersion !== APP_VERSION) {
        showChangelog();
    }

    // ── Tooltip / Tips system ───────────────────────────────────────
    let tipsVisible = localStorage.getItem('coeus-tips-visible') === 'true';
    const tipPopover = document.getElementById('tipPopover');

    function positionPopover(btn) {
        const rect = btn.getBoundingClientRect();
        const pw = 280;
        let left = rect.left;
        if (left + pw > window.innerWidth - 12) left = window.innerWidth - pw - 12;
        if (left < 8) left = 8;
        // Show below button; if too close to bottom, show above
        const spaceBelow = window.innerHeight - rect.bottom;
        if (spaceBelow < 120) {
            tipPopover.style.top = `${rect.top - 8}px`;
            tipPopover.style.transform = 'translateY(-100%)';
        } else {
            tipPopover.style.top = `${rect.bottom + 6}px`;
            tipPopover.style.transform = '';
        }
        tipPopover.style.left = `${left}px`;
    }

    function renderTipButtons() {
        document.querySelectorAll('.coeus-tip-btn').forEach(b => b.remove());
        if (!tipsVisible) return;
        document.querySelectorAll('[data-tip]').forEach(el => {
            const tip = el.getAttribute('data-tip');
            if (!tip) return;
            const btn = document.createElement('button');
            btn.className = 'coeus-tip-btn';
            btn.setAttribute('aria-label', 'Help tip');
            btn.style.cssText = 'display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;border-radius:50%;border:1px solid var(--border);background:var(--hover);color:var(--text-muted);font-size:10px;cursor:default;margin-left:5px;vertical-align:middle;flex-shrink:0;line-height:1;';
            btn.textContent = '?';
            btn.addEventListener('mouseenter', () => {
                tipPopover.textContent = tip;
                tipPopover.classList.remove('hidden');
                positionPopover(btn);
            });
            btn.addEventListener('mouseleave', () => {
                tipPopover.classList.add('hidden');
            });
            // Insert immediately after the header element
            if (el.nextSibling) {
                el.parentNode.insertBefore(btn, el.nextSibling);
            } else {
                el.parentNode.appendChild(btn);
            }
        });
    }

    function updateTipsToggle() {
        const btn = document.getElementById('showTipsToggle');
        if (!btn) return;
        btn.textContent = tipsVisible ? '❓ Hide Tips' : '❓ Show Tips';
        btn.style.background = tipsVisible ? 'var(--hover)' : '';
    }

    document.getElementById('showTipsToggle')?.addEventListener('click', () => {
        tipsVisible = !tipsVisible;
        localStorage.setItem('coeus-tips-visible', tipsVisible);
        if (tipPopover) tipPopover.classList.add('hidden');
        renderTipButtons();
        updateTipsToggle();
        document.querySelectorAll('.tab-intro').forEach(el => {
            el.classList.toggle('hidden', !tipsVisible);
        });
    });

    renderTipButtons();
    updateTipsToggle();

    // ── GitHub latest release check ─────────────────────────────
    (async () => {
        try {
            const res = await fetch('https://api.github.com/repos/drussoperio/CoeusTestWriter/releases/latest', {
                headers: { 'Accept': 'application/vnd.github+json' }
            });
            if (!res.ok) return;
            const data = await res.json();
            const latest = (data.tag_name || '').replace(/^v/, '');
            if (latest && latest !== APP_VERSION) {
                const banner = document.createElement('div');
                banner.id = 'updateBanner';
                banner.style.cssText = 'position:fixed;bottom:60px;right:16px;z-index:9000;background:#3b82f6;color:#fff;padding:10px 16px;border-radius:8px;font-size:13px;box-shadow:0 4px 12px rgba(0,0,0,.2);display:flex;align-items:center;gap:10px;';
                banner.innerHTML = `<span>⬆ v${latest} available</span><a href="https://github.com/drussoperio/CoeusTestWriter/releases/latest" target="_blank" rel="noopener" style="color:#fff;font-weight:600;text-decoration:underline;">Download</a><button onclick="this.parentElement.remove()" style="background:transparent;border:none;color:#fff;font-size:16px;cursor:pointer;line-height:1;">&times;</button>`;
                document.body.appendChild(banner);
            }
        } catch (_) { /* network unavailable — silently skip */ }
    })();


    const aboutModal = document.getElementById('aboutModal');
    document.getElementById('openAboutModal')?.addEventListener('click', () => {
        aboutModal.classList.remove('hidden');
        aboutModal.classList.add('flex');
    });
    document.getElementById('closeAboutModal')?.addEventListener('click', () => {
        aboutModal.classList.add('hidden');
        aboutModal.classList.remove('flex');
    });
    aboutModal?.addEventListener('click', (e) => {
        if (e.target === aboutModal) {
            aboutModal.classList.add('hidden');
            aboutModal.classList.remove('flex');
        }
    });

    const shortcutsModal = document.getElementById('shortcutsModal');
    function openShortcutsModal() {
        shortcutsModal?.classList.remove('hidden');
        shortcutsModal?.classList.add('flex');
    }
    function closeShortcutsModal() {
        shortcutsModal?.classList.add('hidden');
        shortcutsModal?.classList.remove('flex');
    }
    document.getElementById('openShortcutsModalBtn')?.addEventListener('click', openShortcutsModal);
    document.getElementById('closeShortcutsModal')?.addEventListener('click', closeShortcutsModal);
    shortcutsModal?.addEventListener('click', (e) => {
        if (e.target === shortcutsModal) closeShortcutsModal();
    });

    // ── Drop zone initialization helper ────────────────────────
    function initDropZone(dropZoneEl, fileInputEl, callback) {
        if (!dropZoneEl || !fileInputEl) return;
        
        // Find or create the text display element (don't use innerHTML which destroys the input)
        let textDisplay = dropZoneEl.querySelector('p');
        if (!textDisplay) {
            textDisplay = document.createElement('p');
            textDisplay.className = 'text-sm text-gray-600';
            dropZoneEl.appendChild(textDisplay);
        }
        
        function updateDropZoneDisplay() {
            const currentInput = document.getElementById(fileInputEl.id);
            if (!currentInput) return;
            if (currentInput.files.length > 0) {
                const fileNames = Array.from(currentInput.files).map(f => f.name).join(', ');
                textDisplay.className = 'text-sm font-medium text-green-700';
                textDisplay.textContent = '✓ ' + fileNames;
                showToast(`✅ File(s) loaded: ${fileNames}`, 'success');
            } else {
                textDisplay.className = 'text-sm text-gray-600';
                textDisplay.textContent = 'Drag & drop file or click to browse';
            }
        }
        
        dropZoneEl.addEventListener('dragenter', (e) => {
            e.preventDefault();
            dropZoneEl.classList.add('dragover');
        });
        
        dropZoneEl.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZoneEl.classList.add('dragover');
        });
        
        dropZoneEl.addEventListener('dragleave', (e) => {
            e.preventDefault();
            dropZoneEl.classList.remove('dragover');
        });
        
        dropZoneEl.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZoneEl.classList.remove('dragover');
            
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                const currentInput = document.getElementById(fileInputEl.id);
                if (!currentInput) return;
                const dt = new DataTransfer();
                for (let i = 0; i < files.length; i++) {
                    dt.items.add(files[i]);
                }
                currentInput.files = dt.files;
                updateDropZoneDisplay();
                if (callback) callback();
            }
        });
        
        dropZoneEl.addEventListener('click', () => {
            const currentInput = document.getElementById(fileInputEl.id);
            if (currentInput) currentInput.click();
        });
        
        fileInputEl.addEventListener('change', () => {
            updateDropZoneDisplay();
            if (callback) callback();
        });
    }

    // ── Tab configuration ──────────────────────────────────────
    const tabConfig = {
        'writeQuestionsTab':   'writeQuestionsContent',
        'questionManagerTab':  'questionManagerContent',
        'testGeneratorTab':    'testGeneratorContent',
        'convertFileTab':      'convertFileContent',
        'jsonMergerTab':       'jsonMergerContent'
    };

    // ── Setup tab switching ────────────────────────────────────
    // ── Tooltip position via mousemove ────────────────────────
    document.querySelectorAll('.tooltip-wrap').forEach(wrap => {
        wrap.addEventListener('mousemove', e => {
            const box = wrap.querySelector('.tooltip-box');
            if (!box) return;
            const vw = window.innerWidth, vh = window.innerHeight;
            let x = e.clientX + 14, y = e.clientY - 10;
            box.style.left = ''; box.style.right = '';
            box.style.top  = ''; box.style.bottom = '';
            // Keep within viewport
            if (x + 290 > vw) x = e.clientX - 294;
            if (y + box.offsetHeight > vh) y = e.clientY - box.offsetHeight - 4;
            box.style.left = x + 'px';
            box.style.top  = Math.max(4, y) + 'px';
        });
    });

    function setupTabSwitching() {
        Object.entries(tabConfig).forEach(([buttonId, contentId]) => {
            const btn = document.getElementById(buttonId);
            const content = document.getElementById(contentId);
            
            if (!btn || !content) {
                console.warn(`Tab "${buttonId}" → "${contentId}" not found`);
                return;
            }

            btn.addEventListener('click', (e) => {
                e.preventDefault();
                // Hide all tabs
                document.querySelectorAll('.tab-content').forEach(el => {
                    el.classList.remove('active-tab');
                });
                // Deactivate all buttons
                document.querySelectorAll('.tab-button').forEach(b => {
                    b.classList.remove('active');
                });
                // Show selected tab and activate button
                content.classList.add('active-tab');
                btn.classList.add('active');
                // Remember last tab
                localStorage.setItem('coeus-last-tab', buttonId);
            });
        });
    }

    // ── Dark mode ──────────────────────────────────────────────
    function setupDarkMode() {
        const darkToggle = document.getElementById('darkToggle');
        const darkIcon = document.getElementById('darkIcon');
        const SUN_PATH = 'M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707M16 12a4 4 0 11-8 0 4 4 0 018 0z';
        const MOON_PATH = 'M21 12.79A9 9 0 1111.21 3a7 7 0 009.79 9.79z';

        function applyDark(dark) {
            document.body.classList.toggle('dark', dark);
            if (darkIcon?.querySelector('path')) {
                darkIcon.querySelector('path').setAttribute('d', dark ? SUN_PATH : MOON_PATH);
                darkIcon.querySelector('path').setAttribute('stroke-width', '2');
            }
        }

        const savedDark = localStorage.getItem('coeus-dark') === 'true';
        applyDark(savedDark);

        if (darkToggle) {
            darkToggle.addEventListener('click', () => {
                const isDark = document.body.classList.contains('dark');
                applyDark(!isDark);
                localStorage.setItem('coeus-dark', !isDark);
            });
        }
    }

    // ── Tooltips are CSS-only (.tooltip-wrap:hover) ────────────

    // ── Get DOM references ─────────────────────────────────────
    const loadButton = document.getElementById('loadButton');
    const loadQuestionButton = document.getElementById('loadQuestionButton');
    const bankStatus = document.getElementById('bankStatus');
    const testForm = document.getElementById('testForm');
    const categoryInputs = document.getElementById('categoryInputs');
    const answerToleranceSelect = document.getElementById('answerTolerance');
    const toleranceWarning = document.getElementById('toleranceWarning');
    const maxConsecutiveMCSelect = document.getElementById('maxConsecutiveMC');
    const maxConsecutiveTFSelect = document.getElementById('maxConsecutiveTF');
    const testPreview = document.getElementById('testPreview');
    const answerKeyPreview = document.getElementById('answerKeyPreview');
    const exportTxtButton = document.getElementById('exportTxt');
    const exportDocxButton = document.getElementById('exportDocx');
    const questionForm = document.getElementById('questionForm');
    const typeSelect = document.getElementById('type');
    const choicesSection = document.getElementById('choicesSection');
    const trueFalseSection = document.getElementById('trueFalseSection');
    const exportJsonButton = document.getElementById('exportJson');
    const exportGiftButton = document.getElementById('exportGiftBtn');
    const exportCsvButton = document.getElementById('exportCsvBtn');

    // ── Form event listeners ───────────────────────────────────
    function setupFormListeners() {
        if (loadButton) {
            loadButton.addEventListener('click', () => {
                const fileInput = document.getElementById('loadTestBank');
                loadFile(fileInput, false, 'testBank');
            });
        }

        if (loadQuestionButton) {
            loadQuestionButton.addEventListener('click', () => {
                const fileInput = document.getElementById('loadQuestionBank');
                loadFile(fileInput, false, 'questionBank');
            });
        }

        if (testForm) {
            testForm.addEventListener('submit', (e) => {
                e.preventDefault();
                generateTest();
            });
        }

        if (questionForm) {
            questionForm.addEventListener('submit', (e) => {
                e.preventDefault();
                addQuestion();
            });
        }

        if (answerToleranceSelect && toleranceWarning) {
            answerToleranceSelect.addEventListener('change', () => {
                toleranceWarning.classList.toggle('hidden', answerToleranceSelect.value !== '0');
            });
        }

        if (typeSelect) {
            typeSelect.addEventListener('change', () => {
                const matchingSection = document.getElementById('matchingSection');
                const questionSection = document.getElementById('questionSection');
                if (typeSelect.value === 'multiple_choice') {
                    questionSection.style.display = 'block';
                    choicesSection.style.display = 'block';
                    trueFalseSection.classList.add('hidden');
                    matchingSection.classList.add('hidden');
                } else if (typeSelect.value === 'true_false') {
                    questionSection.style.display = 'block';
                    choicesSection.style.display = 'none';
                    trueFalseSection.classList.remove('hidden');
                    matchingSection.classList.add('hidden');
                } else if (typeSelect.value === 'matching') {
                    questionSection.style.display = 'none';
                    choicesSection.style.display = 'none';
                    trueFalseSection.classList.add('hidden');
                    matchingSection.classList.remove('hidden');
                    // Initialize with 5 pairs if empty
                    if (document.getElementById('matchingColumnA').children.length === 0) {
                        for (let i = 0; i < 5; i++) {
                            addMatchingColumnAItem();
                        }
                    }
                }
            });
            // Trigger change event on init
            typeSelect.dispatchEvent(new Event('change'));
        }

        if (categoryInputs) {
            categoryInputs.addEventListener('input', () => {
                let totalRequested = 0;
                const categories = [...new Set(testBank.map(q => q.category))];
                categories.forEach(cat => {
                    const safeCat = safeIdFromCategory(cat);
                    const mcInput = document.getElementById(`cat_${safeCat}_mc`);
                    const tfInput = document.getElementById(`cat_${safeCat}_tf`);
                    const mtInput = document.getElementById(`cat_${safeCat}_mt`);
                    const mc = mcInput ? parseInt(mcInput.value) || 0 : 0;
                    const tf = tfInput ? parseInt(tfInput.value) || 0 : 0;
                    const mt = mtInput ? parseInt(mtInput.value) || 0 : 0;
                    totalRequested += mc + tf + mt;
                });
                const summaryEl = document.getElementById('testSummary');
                if (summaryEl) summaryEl.textContent = `Total questions to generate: ${totalRequested}`;
                const summaryTotal = document.getElementById('testSummaryTotal');
                if (summaryTotal) summaryTotal.textContent = `Total questions to generate: ${totalRequested}`;
            });
        }
    }

    // ── Export buttons ─────────────────────────────────────────
    function setupExportButtons() {
        if (exportTxtButton) exportTxtButton.addEventListener('click', () => exportTestAsTxt());
        if (exportDocxButton) exportDocxButton.addEventListener('click', () => exportTestAsDocx());
        if (exportJsonButton) exportJsonButton.addEventListener('click', () => exportTestAsJson());
        if (exportGiftButton) exportGiftButton.addEventListener('click', () => exportTestAsGift());
        if (exportCsvButton) exportCsvButton.addEventListener('click', () => exportTestAsCsv());
        document.getElementById('tgSendToManageBtn')?.addEventListener('click', () => sendToBank(testBank, 'manage'));
    }

    // ── DOCX info panel ────────────────────────────────────────
    function setupDocxInfoToggle() {
        const toggle = document.getElementById('docxInfoToggle');
        const panel = document.getElementById('docxInfoPanel');
        const chevron = document.getElementById('docxInfoChevron');
        
        if (toggle && panel) {
            toggle.addEventListener('click', () => {
                const open = panel.classList.toggle('open');
                if (chevron) chevron.textContent = open ? '▲' : '▼';
            });
        }
    }

    // ── Generic output jump button — single button, toggles direction ──
    // Shows "↓ Bottom" while nearer the top (click scrolls to bottom) and
    // "↑ Top" while nearer the bottom (click scrolls to top); relabels
    // itself as the container is scrolled manually too.
    function setupJumpToggleButton(buttonId, containerId) {
        const btn = document.getElementById(buttonId);
        const container = document.getElementById(containerId);
        if (!btn || !container) return;

        function isNearTop() {
            const maxScroll = container.scrollHeight - container.clientHeight;
            return maxScroll <= 0 || container.scrollTop <= maxScroll / 2;
        }
        function updateLabel() {
            btn.textContent = isNearTop() ? '↓ Bottom' : '↑ Top';
        }

        btn.addEventListener('click', () => {
            container.scrollTop = isNearTop() ? container.scrollHeight : 0;
            updateLabel();
        });
        container.addEventListener('scroll', updateLabel);
        updateLabel();
    }

    // ── Merger buttons ────────────────────────────────────────
    // ── Generic "Convert to X" tab setup ─────────────────────────
    // opts: { prefix, hasSubTabs, inputFormats, outputFormat, downloadExt }
    function setupConverterTab(opts) {
        const { prefix, hasSubTabs, inputFormats, outputFormat, downloadExt } = opts;
        const fileInput = document.getElementById(prefix + 'FileInput');
        const pasteInput = hasSubTabs ? document.getElementById(prefix + 'PasteInput') : null;
        const pasteSubject = hasSubTabs ? document.getElementById(prefix + 'PasteSubject') : null;
        const pasteCategory = hasSubTabs ? document.getElementById(prefix + 'PasteCategory') : null;
        const pasteDifficulty = hasSubTabs ? document.getElementById(prefix + 'PasteDifficulty') : null;
        const convertBtn = document.getElementById(prefix + 'ConvertBtn');
        const clearBtn = document.getElementById(prefix + 'ClearBtn');
        const downloadBtn = document.getElementById(prefix + 'DownloadBtn');
        const filenameInput = document.getElementById(prefix + 'Filename');
        const output = document.getElementById(prefix + 'Output');
        const warningId = prefix + 'MissingCorrectWarning';
        let lastResult = '';
        let lastFileName = '';

        setupJumpToggleButton(prefix + 'JumpToggle', prefix + 'OutputContainer');

        // Sub-tab switching (Upload File / Paste Text)
        if (hasSubTabs) {
            const uploadSubTab = document.getElementById(prefix + 'UploadSubTab');
            const pasteSubTab = document.getElementById(prefix + 'PasteSubTab');
            const uploadPanel = document.getElementById(prefix + 'UploadPanel');
            const pastePanel = document.getElementById(prefix + 'PastePanel');
            if (uploadSubTab && pasteSubTab && uploadPanel && pastePanel) {
                uploadSubTab.addEventListener('click', () => {
                    uploadPanel.classList.remove('hidden');
                    uploadPanel.classList.add('flex');
                    pastePanel.classList.add('hidden');
                    pastePanel.classList.remove('flex');
                    uploadSubTab.classList.add('bg-blue-500', 'text-white');
                    uploadSubTab.classList.remove('bg-gray-200', 'text-gray-700');
                    pasteSubTab.classList.remove('bg-blue-500', 'text-white');
                    pasteSubTab.classList.add('bg-gray-200', 'text-gray-700');
                });
                pasteSubTab.addEventListener('click', () => {
                    pastePanel.classList.remove('hidden');
                    pastePanel.classList.add('flex');
                    uploadPanel.classList.add('hidden');
                    uploadPanel.classList.remove('flex');
                    pasteSubTab.classList.add('bg-blue-500', 'text-white');
                    pasteSubTab.classList.remove('bg-gray-200', 'text-gray-700');
                    uploadSubTab.classList.remove('bg-blue-500', 'text-white');
                    uploadSubTab.classList.add('bg-gray-200', 'text-gray-700');
                });
            }
        }

        function formatResult(questions) {
            if (outputFormat === 'json') return JSON.stringify(questions, null, 2);
            if (outputFormat === 'csv') return convertJsonToCsv(questions);
            if (outputFormat === 'gift') return questionsToGift(questions);
            if (outputFormat === 'text') return questionsToPlainText(questions);
            return '';
        }

        function runConvert() {
            let text = '';
            let format = null;

            const pasteVisible = hasSubTabs && !document.getElementById(prefix + 'PastePanel').classList.contains('hidden');

            try {
                if (pasteVisible) {
                    text = (pasteInput?.value || '').trim();
                    if (!text) { showToast('⚠️ Please paste some text first.', 'warning'); return; }
                } else {
                    if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
                        showToast('⚠️ Please select a file.', 'warning');
                        return;
                    }
                    const file = fileInput.files[0];
                    lastFileName = file.name.replace(/\.[^/.]+$/, '');
                    if (filenameInput) filenameInput.value = lastFileName;
                    format = formatFromFileName(file.name);
                    const reader = new FileReader();
                    reader.onload = function (event) {
                        try {
                            const questions = parseQuestionsByFormat(event.target.result, format);
                            finishConvert(questions);
                        } catch (error) {
                            output.textContent = 'Error: ' + error.message;
                            showToast('❌ Error: ' + error.message, 'error');
                        }
                    };
                    reader.readAsText(file);
                    return;
                }

                let questions;
                if (inputFormats.includes('text') && looksLikePlainText(text)) {
                    const subject = (pasteSubject?.value || '').trim();
                    const category = (pasteCategory?.value || '').trim();
                    const difficulty = pasteDifficulty?.value || 'unset';
                    if (!category) { showToast('⚠️ Please enter a category.', 'warning'); return; }
                    questions = parsePlainTextToJson(text, subject, category);
                    questions.forEach(q => { q.difficulty = difficulty; });
                } else {
                    ({ questions } = autoParseQuestions(text, inputFormats.filter(f => f !== 'text')));
                }
                finishConvert(questions);
            } catch (error) {
                output.textContent = 'Error: ' + error.message;
                showToast('❌ Error: ' + error.message, 'error');
            }
        }

        function renderCsvTable(csvStr) {
            const tableEl = document.getElementById('convCsvTable');
            const headEl  = document.getElementById('convCsvTableHead');
            const bodyEl  = document.getElementById('convCsvTableBody');
            const emptyEl = document.getElementById('convCsvEmptyMsg');
            if (!tableEl || !headEl || !bodyEl) return;

            const rows = csvStr.trim().split('\n').map(r => {
                // Simple CSV split respecting quoted fields
                const result = [];
                let cur = '', inQ = false;
                for (let i = 0; i < r.length; i++) {
                    const c = r[i];
                    if (c === '"') { inQ = !inQ; }
                    else if (c === ',' && !inQ) { result.push(cur); cur = ''; }
                    else { cur += c; }
                }
                result.push(cur);
                return result;
            });

            if (rows.length < 2) return;
            const headers = rows[0];
            headEl.innerHTML = '<tr>' + headers.map(h =>
                `<th class="px-3 py-2 border border-gray-300 text-left font-semibold text-gray-700 whitespace-nowrap bg-gray-100">${escapeHtml(h)}</th>`
            ).join('') + '</tr>';

            bodyEl.innerHTML = rows.slice(1).map((row, ri) =>
                '<tr class="' + (ri % 2 === 0 ? 'bg-white' : 'bg-gray-50') + ' hover:bg-blue-50">' +
                row.map(cell => `<td class="px-3 py-1.5 border border-gray-200 text-gray-700 max-w-xs truncate" title="${escapeHtml(cell)}">${cell ? escapeHtml(cell) : '<span class="text-gray-300">—</span>'}</td>`).join('') +
                '</tr>'
            ).join('');

            tableEl.classList.remove('hidden');
            if (emptyEl) emptyEl.classList.add('hidden');
        }

        function finishConvert(questions) {
            renderMissingCorrectWarning(warningId, questions);
            const resultStr = formatResult(questions);
            lastResult = resultStr;
            if (outputFormat === 'csv') {
                renderCsvTable(resultStr);
            } else {
                if (output) {
                    output.textContent = resultStr;
                    if (window.Prism && outputFormat === 'json') Prism.highlightElement(output);
                }
            }
            showToast('✅ Conversion complete', 'success');
        }

        // Convert is now triggered by each export button

        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                if (fileInput) fileInput.value = '';
                if (pasteInput) pasteInput.value = '';
                if (pasteSubject) pasteSubject.value = '';
                if (pasteCategory) pasteCategory.value = '';
                if (pasteDifficulty) pasteDifficulty.value = 'unset';
                const dz = fileInput ? fileInput.closest('.drop-zone') : null;
                if (dz) {
                    const p = dz.querySelector('p');
                    if (p) {
                        p.className = 'text-sm text-gray-600';
                        p.textContent = 'Drag & drop file or click to browse';
                    }
                }
                output.textContent = '';
                lastResult = '';
                // Also clear CSV table if present
                const csvTable = document.getElementById('convCsvTable');
                const csvEmpty = document.getElementById('convCsvEmptyMsg');
                if (csvTable) { csvTable.classList.add('hidden'); document.getElementById('convCsvTableHead').innerHTML = ''; document.getElementById('convCsvTableBody').innerHTML = ''; }
                if (csvEmpty) csvEmpty.classList.remove('hidden');
                const warnEl = document.getElementById(warningId);
                if (warnEl) { warnEl.classList.add('hidden'); warnEl.innerHTML = ''; }
                showToast('🗑️ Cleared', 'warning');
            });
        }

        if (downloadBtn) {
            downloadBtn.addEventListener('click', () => {
                if (!lastResult) {
                    showToast('⚠️ Please convert first.', 'warning');
                    return;
                }
                const customFilename = filenameInput?.value.trim() || lastFileName || 'questions';
                const mimeType = outputFormat === 'json' ? 'application/json' : 'text/plain';
                const blob = new Blob([lastResult], { type: mimeType });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = customFilename + downloadExt;
                a.click();
                URL.revokeObjectURL(url);
                showToast('✅ File downloaded', 'success');
            });
        }
    }

    // ── Convert a File tab ─────────────────────────────────────
    function setupConvertAFile() {
        const fileInput   = document.getElementById('convertFileInput');
        const convertBtn  = document.getElementById('convertFileConvertBtn');
        const clearBtn    = document.getElementById('convertFileClearBtn');
        const filenameIn  = document.getElementById('convertFileFilename');
        const output      = document.getElementById('convertFileOutput');
        const textWrap    = document.getElementById('convertFileTextOutputWrap');
        const csvWrap     = document.getElementById('convertFileCsvOutputWrap');
        const csvHead     = document.getElementById('convertFileCsvTableHead');
        const csvBody     = document.getElementById('convertFileCsvTableBody');
        const warnEl      = document.getElementById('convertFileMissingCorrectWarning');
        let lastResult = '', lastExt = '.json', lastFmt = 'json', convertFilePendingDownload = null;

        setupJumpToggleButton('convertFileJumpToggle', 'convertFileTextOutputWrap');

        // keep dropzone wired
        if (fileInput) {
            const dz = fileInput.closest('.drop-zone');
            if (dz) {
                dz.addEventListener('click', () => { const cur = document.getElementById('convertFileInput'); if (cur) cur.click(); });
                dz.addEventListener('dragover', e => { e.preventDefault(); dz.classList.add('drag-over'); });
                dz.addEventListener('dragleave', () => dz.classList.remove('drag-over'));
                dz.addEventListener('drop', e => {
                    e.preventDefault(); dz.classList.remove('drag-over');
                    if (e.dataTransfer.files.length) { fileInput.files = e.dataTransfer.files; updateDropZoneName(); }
                });
            }
            fileInput.addEventListener('change', updateDropZoneName);
        }

        function updateDropZoneName() {
            const dz = fileInput ? fileInput.closest('.drop-zone') : null;
            const p = dz ? dz.querySelector('p') : null;
            if (p && fileInput && fileInput.files.length) {
                p.className = 'text-sm text-green-700 font-medium';
                p.textContent = fileInput.files[0].name;
            }
        }

        // 4 separate export buttons — no single export btn

        function renderOutput(fmt, resultStr) {
            const cfEmpty = document.getElementById('convertFileEmptyState');
            const cfPre = textWrap ? textWrap.querySelector('pre') : null;
            if (cfEmpty) cfEmpty.classList.add('hidden');
            if (cfPre) cfPre.classList.remove('hidden');
            if (fmt === 'csv') {
                if (textWrap) textWrap.classList.add('hidden');
                if (csvWrap) csvWrap.classList.remove('hidden');
                // parse csv into table
                const rows = resultStr.trim().split('\n').map(r => {
                    const result = []; let cur = '', inQ = false;
                    for (let i = 0; i < r.length; i++) {
                        const c = r[i];
                        if (c === '"') { inQ = !inQ; }
                        else if (c === ',' && !inQ) { result.push(cur); cur = ''; }
                        else { cur += c; }
                    }
                    result.push(cur); return result;
                });
                if (rows.length < 2) return;
                if (csvHead) csvHead.innerHTML = '<tr>' + rows[0].map(h => `<th class="px-3 py-2 border border-gray-300 text-left font-semibold text-gray-700 whitespace-nowrap bg-gray-100">${escapeHtml(h)}</th>`).join('') + '</tr>';
                if (csvBody) csvBody.innerHTML = rows.slice(1).map((row, ri) =>
                    '<tr class="' + (ri % 2 === 0 ? 'bg-white' : 'bg-gray-50') + ' hover:bg-blue-50">' +
                    row.map(cell => `<td class="px-3 py-1.5 border border-gray-200 text-gray-700 max-w-xs truncate" title="${escapeHtml(cell)}">${cell ? escapeHtml(cell) : '<span class="text-gray-300">—</span>'}</td>`).join('') +
                    '</tr>').join('');
            } else {
                if (csvWrap) csvWrap.classList.add('hidden');
                if (textWrap) textWrap.classList.remove('hidden');
                if (output) {
                    output.textContent = resultStr;
                    if (window.Prism && fmt === 'json') Prism.highlightElement(output);
                }
            }
        }

        function runConvert(fmt) {
            if (!fileInput || !fileInput.files || !fileInput.files.length) {
                showToast('⚠️ Please select a file.', 'warning'); return;
            }
            const file = fileInput.files[0];
            const exts = { json: '.json', csv: '.csv', gift: '_gift.txt', text: '.txt' };
            lastExt = exts[fmt] || '.json';
            const baseName = file.name.replace(/\.[^/.]+$/, '');
            if (filenameIn) filenameIn.value = baseName;

            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    const format = formatFromFileName(file.name);
                    const questions = parseQuestionsByFormat(e.target.result, format);
                    cfStoredQuestions = questions;
                    renderMissingCorrectWarning('convertFileMissingCorrectWarning', questions);
                    let resultStr;
                    if (fmt === 'json')  resultStr = JSON.stringify(questions, null, 2);
                    else if (fmt === 'csv')  resultStr = convertJsonToCsv(questions);
                    else if (fmt === 'gift') resultStr = questionsToGift(questions);
                    else                 resultStr = questionsToPlainText(questions);
                    lastResult = resultStr;
                    lastFmt = fmt;
                    renderOutput(fmt, resultStr);
                    showToast('✅ Converted to ' + fmt.toUpperCase(), 'success');
                    if (convertFilePendingDownload) { convertFilePendingDownload = null; downloadConvertResult(); }
                } catch (err) {
                    if (output) output.textContent = 'Error: ' + err.message;
                    showToast('❌ ' + err.message, 'error');
                    convertFilePendingDownload = null;
                }
            };
            reader.readAsText(file);
        }

        // Convert button: parse + preview in current cfPreviewFormat, no download
        if (convertBtn) {
            convertBtn.addEventListener('click', () => {
                if (!fileInput || !fileInput.files || !fileInput.files.length) {
                    showToast('⚠️ Please select a file.', 'warning'); return;
                }
                runConvert(cfPreviewFormat === 'txt' ? 'text' : cfPreviewFormat);
            });
        }

        // Preview format toggles for Convert a File
        let cfPreviewFormat = 'json';
        const cfPreviewBtns = {
            json: document.getElementById('cfPreviewJson'),
            csv:  document.getElementById('cfPreviewCsv'),
            gift: document.getElementById('cfPreviewGift'),
            txt:  document.getElementById('cfPreviewTxt'),
        };
        function setCfPreviewActive(fmt) {
            cfPreviewFormat = fmt;
            Object.entries(cfPreviewBtns).forEach(([f, b]) => {
                if (!b) return;
                b.classList.toggle('bg-blue-500', f === fmt);
                b.classList.toggle('text-white',  f === fmt);
                b.classList.toggle('bg-gray-200', f !== fmt);
                b.classList.toggle('text-gray-700', f !== fmt);
            });
        }
        Object.entries(cfPreviewBtns).forEach(([fmt, btn]) => {
            if (!btn) return;
            btn.addEventListener('click', () => {
                setCfPreviewActive(fmt);
                if (!lastResult) return;
                // Re-render stored questions in new format
                if (cfStoredQuestions) {
                    let str;
                    if (fmt === 'json')  str = JSON.stringify(cfStoredQuestions, null, 2);
                    else if (fmt === 'csv')  str = convertJsonToCsv(cfStoredQuestions);
                    else if (fmt === 'gift') str = questionsToGift(cfStoredQuestions);
                    else                 str = questionsToPlainText(cfStoredQuestions);
                    lastResult = str;
                    lastExt = { json: '.json', csv: '.csv', gift: '_gift.txt', txt: '.txt' }[fmt] || '.txt';
                    renderOutput(fmt, str);
                }
            });
        });
        let cfStoredQuestions = null;

        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                if (fileInput) fileInput.value = '';
                const dz = fileInput ? fileInput.closest('.drop-zone') : null;
                const p = dz ? dz.querySelector('p') : null;
                if (p) { p.className = 'text-sm text-gray-600'; p.textContent = 'Drag & drop file or click to browse'; }
                if (output) output.textContent = '';
                if (csvHead) csvHead.innerHTML = '';
                if (csvBody) csvBody.innerHTML = '';
                if (csvWrap) csvWrap.classList.add('hidden');
                if (textWrap) textWrap.classList.remove('hidden');
                if (warnEl) { warnEl.classList.add('hidden'); warnEl.innerHTML = ''; }
                lastResult = '';
                cfStoredQuestions = null;
                showToast('🗑️ Cleared', 'warning');
            });
        }

        function doConvertAndExport(fmt) {
            if (!fileInput || !fileInput.files || !fileInput.files.length) {
                showToast('⚠️ Please select a file.', 'warning'); return;
            }
            // If we already have stored questions, just download in the requested format without changing the preview
            if (cfStoredQuestions) {
                let str;
                const fmtKey = fmt === 'text' ? 'txt' : fmt;
                if (fmt === 'json')       str = JSON.stringify(cfStoredQuestions, null, 2);
                else if (fmt === 'csv')   str = convertJsonToCsv(cfStoredQuestions);
                else if (fmt === 'gift')  str = questionsToGift(cfStoredQuestions);
                else                      str = questionsToPlainText(cfStoredQuestions);
                const extMap = { json: '.json', csv: '.csv', gift: '_gift.txt', txt: '.txt' };
                const ext = extMap[fmtKey] || '.txt';
                const fname = (filenameIn?.value.trim() || 'converted') + ext;
                const mime = ext === '.json' ? 'application/json' : 'text/plain';
                const blob = new Blob([str], { type: mime });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a'); a.href = url; a.download = fname; a.click();
                URL.revokeObjectURL(url);
                showToast('✅ File downloaded', 'success');
                return;
            }
            // No stored result yet — convert first then download
            convertFilePendingDownload = fmt;
            runConvert(fmt === 'text' ? 'text' : fmt);
        }
        function downloadConvertResult() {
            if (!lastResult) return;
            const fname = (filenameIn?.value.trim() || 'converted') + lastExt;
            const mime = lastExt === '.json' ? 'application/json' : 'text/plain';
            const blob = new Blob([lastResult], { type: mime });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url; a.download = fname; a.click();
            URL.revokeObjectURL(url);
            showToast('✅ File downloaded', 'success');
        }
        document.getElementById('convertFileExportJsonBtn')?.addEventListener('click', () => doConvertAndExport('json'));
        document.getElementById('convertFileExportCsvBtn')?.addEventListener('click',  () => doConvertAndExport('csv'));
        document.getElementById('convertFileExportGiftBtn')?.addEventListener('click', () => doConvertAndExport('gift'));
        document.getElementById('convertFileExportTxtBtn')?.addEventListener('click',  () => doConvertAndExport('text'));
        document.getElementById('cfSendToManageBtn')?.addEventListener('click', () => sendToBank(cfStoredQuestions, 'manage'));
        document.getElementById('cfSendToDesignBtn')?.addEventListener('click', () => sendToBank(cfStoredQuestions, 'design'));
    }

    // ── Write Questions tab ────────────────────────────────────
    function setupWriteQuestions() {
        // Sub-tab switching
        const addSubTab   = document.getElementById('wqAddSubTab');
        const pasteSubTab = document.getElementById('wqPasteSubTab');
        const addPanel    = document.getElementById('wqAddPanel');
        const pastePanel  = document.getElementById('wqPastePanel');

        function activateSubTab(which) {
            const isAdd = which === 'add';
            if (addPanel)   { addPanel.classList.toggle('hidden', !isAdd); addPanel.classList.toggle('flex', isAdd); }
            if (pastePanel) { pastePanel.classList.toggle('hidden', isAdd); pastePanel.classList.toggle('flex', !isAdd); }
            if (addSubTab)  { addSubTab.classList.toggle('bg-blue-500', isAdd); addSubTab.classList.toggle('text-white', isAdd); addSubTab.classList.toggle('bg-gray-200', !isAdd); addSubTab.classList.toggle('text-gray-700', !isAdd); }
            if (pasteSubTab){ pasteSubTab.classList.toggle('bg-blue-500', !isAdd); pasteSubTab.classList.toggle('text-white', !isAdd); pasteSubTab.classList.toggle('bg-gray-200', isAdd); pasteSubTab.classList.toggle('text-gray-700', isAdd); }
        }
        if (addSubTab)   addSubTab.addEventListener('click',   () => activateSubTab('add'));
        if (pasteSubTab) pasteSubTab.addEventListener('click', () => activateSubTab('paste'));

        // Type switching in Add Questions form
        const typeSelect = document.getElementById('wqType');
        function updateWqFormSections() {
            const v = typeSelect ? typeSelect.value : 'multiple_choice';
            const mc = document.getElementById('wqChoicesSection');
            const tf = document.getElementById('wqTrueFalseSection');
            const mt = document.getElementById('wqMatchingSection');
            if (mc) mc.classList.toggle('hidden', v !== 'multiple_choice');
            if (tf) tf.classList.toggle('hidden', v !== 'true_false');
            if (mt) mt.classList.toggle('hidden', v !== 'matching');
        }
        if (typeSelect) typeSelect.addEventListener('change', updateWqFormSections);
        updateWqFormSections();

        // Choice E toggle
        const choiceEBtn = document.getElementById('wqToggleChoiceEBtn');
        const choiceERow = document.getElementById('wqChoiceERow');
        if (choiceEBtn && choiceERow) {
            choiceEBtn.addEventListener('click', () => {
                const hidden = choiceERow.classList.toggle('hidden');
                choiceEBtn.textContent = hidden ? '+ Add Choice E' : '− Remove Choice E';
            });
        }

        // Matching pairs
        const addPairBtn = document.getElementById('wqAddMatchingPair');
        if (addPairBtn) {
            addPairBtn.addEventListener('click', () => {
                const colA = document.getElementById('wqMatchingColumnA');
                const colB = document.getElementById('wqMatchingColumnB');
                if (!colA || !colB) return;
                const idx = colA.children.length + 1;
                const inp = () => `<input type="text" class="w-full rounded border text-sm px-2 py-1.5" placeholder="`;
                colA.insertAdjacentHTML('beforeend', `<div>${inp()}Premise ${idx}"></div></div>`);
                colB.insertAdjacentHTML('beforeend', `<div>${inp()}Answer ${idx}"></div></div>`);
            });
        }

        // Add Question form submit
        const form = document.getElementById('wqQuestionForm');
        if (form) {
            form.addEventListener('submit', e => {
                e.preventDefault();
                const type    = typeSelect ? typeSelect.value : 'multiple_choice';
                const subject = (document.getElementById('wqSubject')?.value || '').trim();
                const cat     = (document.getElementById('wqCategory')?.value || '').trim() || 'Uncategorized';
                const diff    = document.getElementById('wqDifficulty')?.value || 'unset';
                const qText   = (document.getElementById('wqQuestion')?.value || '').trim();
                if (!qText && type !== 'matching') { showToast('⚠️ Question text is required.', 'warning'); return; }

                let q = { subject, category: cat, type, difficulty: diff, question: qText };

                if (type === 'multiple_choice') {
                    const rows = document.querySelectorAll('#wqChoicesContainer .wq-choice-input:not(.hidden)');
                    const choices = [];
                    rows.forEach(r => {
                        const inp = r.querySelector('input[type="text"]');
                        if (inp && inp.value.trim()) choices.push(inp.value.trim());
                    });
                    if (choices.length < 2) { showToast('⚠️ At least 2 choices required.', 'warning'); return; }
                    q.choices = choices;
                    q.correct = choices[0];
                } else if (type === 'true_false') {
                    const checked = document.querySelector('input[name="wqTfCorrect"]:checked');
                    if (!checked) { showToast('⚠️ Please select True or False.', 'warning'); return; }
                    q.choices = [null, null, null, null];
                    q.correct = checked.value;
                } else if (type === 'matching') {
                    const aInputs = document.querySelectorAll('#wqMatchingColumnA input');
                    const bInputs = document.querySelectorAll('#wqMatchingColumnB input');
                    aInputs.forEach((a, i) => {
                        const b = bInputs[i];
                        if (a.value.trim() && b && b.value.trim()) {
                            examBank.push({ subject, category: cat, type: 'matching', difficulty: diff, question: a.value.trim(), choices: [null, null, null, null], correct: b.value.trim() });
                        }
                    });
                    saveExamBankToStorage();
                    refreshWqPreview();
                    form.reset();
                    updateWqFormSections();
                    showToast('✅ Matching pairs added.', 'success');
                    return;
                }

                examBank.push(q);
                saveExamBankToStorage();
                refreshWqPreview();
                form.reset();
                updateWqFormSections();
                // Clear dynamically-added matching pairs and reset choice E
                const colA = document.getElementById('wqMatchingColumnA');
                const colB = document.getElementById('wqMatchingColumnB');
                if (colA) colA.innerHTML = '';
                if (colB) colB.innerHTML = '';
                const choiceERowEl = document.getElementById('wqChoiceERow');
                const choiceEBtnEl = document.getElementById('wqToggleChoiceEBtn');
                if (choiceERowEl) { choiceERowEl.classList.add('hidden'); choiceERowEl.querySelector('input[type="text"]').value = ''; }
                if (choiceEBtnEl) choiceEBtnEl.textContent = '+ Add Choice E';
                showToast('✅ Question added.', 'success');
            });
        }

        // Preview format toggles
        let wqPreviewFormat = 'json';
        const previewBtns = {
            json: document.getElementById('wqPreviewJson'),
            txt:  document.getElementById('wqPreviewTxt'),
            gift: document.getElementById('wqPreviewGift'),
            csv:  document.getElementById('wqPreviewCsv'),
        };
        Object.entries(previewBtns).forEach(([fmt, btn]) => {
            if (!btn) return;
            btn.addEventListener('click', () => {
                wqPreviewFormat = fmt;
                Object.values(previewBtns).forEach(b => { if (b) { b.classList.remove('bg-blue-500','text-white'); b.classList.add('bg-gray-200','text-gray-700'); } });
                btn.classList.add('bg-blue-500','text-white'); btn.classList.remove('bg-gray-200','text-gray-700');
                refreshWqPreview();
            });
        });

        function parseCsvToRows(csvStr) {
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
        function renderCsvTable(csvStr) {
            const rows = parseCsvToRows(csvStr);
            if (rows.length < 2) return '<p class="text-xs text-gray-400 p-2">No data</p>';
            const hdr = rows[0].map(h => `<th class="px-3 py-2 border border-gray-300 text-left font-semibold text-gray-700 bg-gray-100 whitespace-nowrap text-xs">${h}</th>`).join('');
            const bdy = rows.slice(1).map((row, ri) =>
                '<tr class="' + (ri%2===0?'bg-white':'bg-gray-50') + '">' +
                row.map(cell => `<td class="px-3 py-1.5 border border-gray-200 text-gray-700 max-w-xs truncate text-xs">${cell || ''}</td>`).join('') + '</tr>'
            ).join('');
            return `<div class="overflow-auto max-h-96"><table class="min-w-full text-xs border-collapse"><thead><tr>${hdr}</tr></thead><tbody>${bdy}</tbody></table></div>`;
        }
        function refreshWqPreview() {
            const container = document.getElementById('wqOutputContainer');
            if (!container) return;
            const emptyState = document.getElementById('wqEmptyState');
            const pre = container.querySelector('pre');
            if (!examBank.length) {
                if (emptyState) emptyState.classList.remove('hidden');
                if (pre) pre.classList.add('hidden');
                return;
            }
            if (emptyState) emptyState.classList.add('hidden');
            if (pre) pre.classList.remove('hidden');
            if (wqPreviewFormat === 'csv') {
                container.innerHTML = renderCsvTable(convertJsonToCsv(examBank));
            } else {
                if (!document.getElementById('wqOutput')) {
                    container.innerHTML = '<pre class="text-xs"><code id="wqOutput"></code></pre>';
                }
                const freshOut = document.getElementById('wqOutput');
                if (!freshOut) return;
                let str = '';
                if (wqPreviewFormat === 'json')  str = JSON.stringify(examBank, null, 2);
                else if (wqPreviewFormat === 'txt')  str = questionsToPlainText(examBank);
                else if (wqPreviewFormat === 'gift') str = questionsToGift(examBank);
                freshOut.textContent = str;
                if (window.Prism && wqPreviewFormat === 'json') Prism.highlightElement(freshOut);
            }
        }

        setupJumpToggleButton('wqJumpToggle', 'wqOutputContainer');

        // Export buttons
        function wqExport(fmt) {
            if (!examBank.length) { showToast('⚠️ No questions to export.', 'warning'); return; }
            const fname = (document.getElementById('wqFilename')?.value.trim() || 'exambank');
            let str, ext, mime = 'text/plain';
            if (fmt === 'json')  { str = JSON.stringify(examBank, null, 2); ext = '.json'; mime = 'application/json'; }
            else if (fmt === 'csv')  { str = convertJsonToCsv(examBank); ext = '.csv'; }
            else if (fmt === 'txt')  { str = questionsToPlainText(examBank); ext = '.txt'; }
            else if (fmt === 'gift') { str = questionsToGift(examBank); ext = '_gift.txt'; }
            const blob = new Blob([str], { type: mime });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url; a.download = fname + ext; a.click();
            URL.revokeObjectURL(url);
            showToast('✅ Exported', 'success');
        }
        document.getElementById('wqExportJsonBtn')?.addEventListener('click', () => wqExport('json'));
        document.getElementById('wqExportCsvBtn')?.addEventListener('click',  () => wqExport('csv'));
        document.getElementById('wqExportTxtBtn')?.addEventListener('click',  () => wqExport('txt'));
        document.getElementById('wqExportGiftBtn')?.addEventListener('click', () => wqExport('gift'));
        document.getElementById('wqSendToManageBtn')?.addEventListener('click', () => sendToBank(examBank, 'manage'));
        document.getElementById('wqSendToDesignBtn')?.addEventListener('click', () => sendToBank(examBank, 'design'));

        // Paste & Convert
        function showPasteWarning(msg) {
            const w = document.getElementById('wqPasteWarning');
            if (!w) return;
            if (msg) { w.textContent = '⚠️ ' + msg; w.classList.remove('hidden'); }
            else { w.textContent = ''; w.classList.add('hidden'); }
        }
        const pasteConvertBtn = document.getElementById('wqPasteConvertBtn');
        if (pasteConvertBtn) {
            pasteConvertBtn.addEventListener('click', () => {
                showPasteWarning('');
                const text = (document.getElementById('wqPasteInput')?.value || '').trim();
                if (!text) { showPasteWarning('No text to convert. Paste your questions above.'); return; }
                const subject  = (document.getElementById('wqPasteSubject')?.value || '').trim();
                const category = (document.getElementById('wqPasteCategory')?.value || '').trim() || 'Uncategorized';
                const diff     = document.getElementById('wqPasteDifficulty')?.value || 'unset';
                // Pre-validate: check for numbered questions
                const hasNumbered = /^\d+\.\s/m.test(text);
                if (!hasNumbered) {
                    showPasteWarning('Format not recognized. Each question must start with a number, period, and space (e.g. "1. Question text"). See Show Tips for formatting rules.');
                    return;
                }
                try {
                    const qs = parsePlainTextToJson(text, subject, category);
                    if (!qs.length) {
                        showPasteWarning('No questions could be parsed. Check that your questions follow the plain-text format rules. See Show Tips for details.');
                        return;
                    }
                    // Check for MCQ with no correct answer marked
                    const noCorrect = qs.filter(q => q.type === 'multiple_choice' && !q.correct);
                    if (noCorrect.length) {
                        showPasteWarning(`${noCorrect.length} multiple choice question(s) have no correct answer marked. Prefix the correct choice with = or *.`);
                        return;
                    }
                    qs.forEach(q => { q.difficulty = diff; });
                    examBank.push(...qs);
                    saveExamBankToStorage();
                    refreshWqPreview();
                    showToast(`✅ Added ${qs.length} question(s).`, 'success');
                } catch(err) {
                    showPasteWarning(err.message);
                    showToast('❌ ' + err.message, 'error');
                }
            });
        }
        document.getElementById('wqPasteClearBtn')?.addEventListener('click', () => {
            if (!examBank.length) { showToast('⚠️ Nothing to delete.', 'warning'); return; }
            const confirmed = window.confirm(`Delete all ${examBank.length} question(s) from the exam bank? This can be undone.`);
            if (!confirmed) return;
            const wqSnapshot = [...examBank];
            examBank = [];
            saveExamBankToStorage();
            refreshWqPreview();
            showPasteWarning('');
            // Clear Paste Text input fields
            const pasteInput = document.getElementById('wqPasteInput');
            const pasteSubject = document.getElementById('wqPasteSubject');
            const pasteCategory = document.getElementById('wqPasteCategory');
            const pasteDifficulty = document.getElementById('wqPasteDifficulty');
            if (pasteInput) pasteInput.value = '';
            if (pasteSubject) pasteSubject.value = '';
            if (pasteCategory) pasteCategory.value = '';
            if (pasteDifficulty) pasteDifficulty.value = 'unset';
            pushUndo('Exam bank deleted', () => {
                examBank = wqSnapshot;
                saveExamBankToStorage();
                refreshWqPreview();
                showToast('↩️ Restored.', 'success');
            });
            const undoHtml = '<span>🗑️ All questions deleted. <button onclick="performUndo()" style="background:#fff;color:#333;padding:3px 8px;border-radius:4px;cursor:pointer;margin-left:8px;border:1px solid #ccc;font-size:0.8rem;">Undo</button></span>';
            showToast(undoHtml, 'warning', 5000, true);
        });

        // Delete All Questions — confirm + undo
        const clearSavedBtn = document.getElementById('wqClearSavedBtn');
        if (clearSavedBtn) {
            clearSavedBtn.addEventListener('click', () => {
                if (!examBank.length) { showToast('⚠️ Nothing to delete.', 'warning'); return; }
                const confirmed = window.confirm(`Delete all ${examBank.length} question(s) from the exam bank? This can be undone.`);
                if (!confirmed) return;
                const wqSnapshot = [...examBank];
                examBank = [];
                saveExamBankToStorage();
                refreshWqPreview();
                pushUndo('Exam bank deleted', () => {
                    examBank = wqSnapshot;
                    saveExamBankToStorage();
                    refreshWqPreview();
                    showToast('↩️ Restored.', 'success');
                });
                const undoHtml = '<span>🗑️ All questions deleted. <button onclick="performUndo()" style="background:#fff;color:#333;padding:3px 8px;border-radius:4px;cursor:pointer;margin-left:8px;border:1px solid #ccc;font-size:0.8rem;">Undo</button></span>';
                showToast(undoHtml, 'warning', 5000, true);
            });
        }

        // Load from storage
        loadExamBankFromStorage();
        refreshWqPreview();
    }

    function saveExamBankToStorage() {
        try { localStorage.setItem('coeus-exambank', JSON.stringify(examBank)); } catch(e) {}
    }
    function loadExamBankFromStorage() {
        try { const d = localStorage.getItem('coeus-exambank'); if (d) examBank = JSON.parse(d); } catch(e) {}
    }

    function setupMerger() {
        const addBtn = document.getElementById('addMergerFilesBtn');
        const clearBtn = document.getElementById('clearMergerBtn');
        const downloadBtn = document.getElementById('downloadMergedBtn');

        if (addBtn) addBtn.addEventListener('click', addMergerFiles);
        if (clearBtn) clearBtn.addEventListener('click', clearMerger);
        if (downloadBtn) downloadBtn.addEventListener('click', downloadMergedJSON);
        document.getElementById('mergerSendToManageBtn')?.addEventListener('click', () => sendToBank(mergedQuestions, 'manage'));
        document.getElementById('mergerSendToDesignBtn')?.addEventListener('click', () => sendToBank(mergedQuestions, 'design'));
    }

    // ── Unused questions buttons ───────────────────────────────
    function setupUnusedQuestions() {
        const exportBtn = document.getElementById('exportUnusedJson');

        if (exportBtn) exportBtn.addEventListener('click', exportUnusedAsJson);
    }

    // ── Exclusion buttons ──────────────────────────────────────
    function setupExclusions() {
        const loadBtn = document.getElementById('loadExclusionBtn');
        const clearBtn = document.getElementById('clearExclusionBtn');

        if (loadBtn) loadBtn.addEventListener('click', loadExclusionFile);
        if (clearBtn) clearBtn.addEventListener('click', clearExclusions);
    }

    // ── Clear/Select All buttons ───────────────────────────────
    function setupCategoryButtons() {
        const clearBtn = document.getElementById('clearAllBtn');
        const selectBtn = document.getElementById('selectAllBtn');

        if (clearBtn) clearBtn.addEventListener('click', clearAllCategoryInputs);
        if (selectBtn) selectBtn.addEventListener('click', selectAllAvailableQuestions);

        const balanceBtn = document.getElementById('balancePickBtn');
        if (balanceBtn) balanceBtn.addEventListener('click', balancedPickAcrossCategories);

        // Difficulty preset wiring
        const presetEl = document.getElementById('diffRatioPreset');
        if (presetEl) {
            presetEl.addEventListener('change', applyDiffRatioPreset);
            applyDiffRatioPreset(); // init labels
        }
    }

    // ── Initialize all drop zones ──────────────────────────────
    const dropZones = [
        { dropZone: document.querySelector('#questionManagerContent .drop-zone'), fileInput: document.getElementById('loadQuestionBank') },
        { dropZone: document.querySelector('#testGeneratorContent .drop-zone'), fileInput: document.getElementById('loadTestBank') },
        { dropZone: document.querySelector('#convJsonUploadPanel .drop-zone'), fileInput: document.getElementById('convJsonFileInput') },
        { dropZone: document.querySelector('#convCsvUploadPanel .drop-zone'), fileInput: document.getElementById('convCsvFileInput') },
        { dropZone: document.querySelector('#convGiftUploadPanel .drop-zone'), fileInput: document.getElementById('convGiftFileInput') },
        { dropZone: document.querySelector('#convTextContent .drop-zone'), fileInput: document.getElementById('convTextFileInput') },
        { dropZone: document.querySelector('#jsonMergerContent .drop-zone'), fileInput: document.getElementById('mergerFileInput') }
    ];
    
    dropZones.forEach(({ dropZone, fileInput }) => {
        if (dropZone && fileInput) {
            initDropZone(dropZone, fileInput, null);
        }
    });

    // ─────────────────────────────────────────────────────────
    // RUN ALL SETUPS IN ORDER
    // ─────────────────────────────────────────────────────────
    setupTabSwitching();
    setupDarkMode();
    restoreBanksFromStorage();
    setupFormListeners();
    
    // ── Matching column buttons setup ─────────────────────────────
    document.getElementById('addMatchingPair')
        ?.addEventListener('click', (e) => {
            e.preventDefault();
            addMatchingColumnAItem();
        });
    
    setupExportButtons();
    setupDocxInfoToggle();
    setupJumpToggleButton('testPreviewJumpToggle', 'testPreviewContainer');
    setupJumpToggleButton('answerKeyJumpToggle', 'answerKeyContainer');
    setupMerger();
    setupUnusedQuestions();
    setupExclusions();
    setupCategoryButtons();
    setupConvertAFile();
    setupWriteQuestions();
    setupJumpToggleButton('mergerJumpToggle', 'mergerOutputContainer');
    
    // Initialize Question Manager
    initializeQuestionManager();
    setupJumpToggleButton('qmValidationJumpToggle', 'qmValidationReportWrap');
    
    // Initialize export dropdown
    initializeExportDropdown();
    
    // Setup export as plain text with filename (button renamed to Export TXT, ID updated)
    const exportPlainTextBtn = document.getElementById('exportQuestionsPlainBtn');
    if (exportPlainTextBtn) {
        exportPlainTextBtn.addEventListener('click', () => {
            if (questionBank.length === 0) {
                showToast('⚠️ No questions to export.', 'warning');
                return;
            }
            const filenameInput = document.getElementById('questionBankFilename');
            let filename = filenameInput ? filenameInput.value.trim() : 'questions';
            if (!filename) filename = 'questions';
            if (!filename.endsWith('.txt')) filename += '.txt';
            
            let plainText = '';
            questionBank.forEach((q, i) => {
                plainText += `${i + 1}. ${q.question}\n`;
                if (q.type === 'true_false') {
                    plainText += `=${q.correct}\n\n`;
                } else if (q.type === 'matching') {
                    plainText += `=${q.correct}\n\n`;
                } else if (q.type === 'multiple_choice' && q.choices && Array.isArray(q.choices)) {
                    q.choices.forEach((c, idx) => {
                        const letter = String.fromCharCode(97 + idx);
                        const marker = c === q.correct ? '=' : '';
                        plainText += `${marker}${letter}. ${c}\n`;
                    });
                    plainText += '\n';
                }
            });
            const blob = new Blob([plainText], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.click();
            URL.revokeObjectURL(url);
            showToast('✅ Exported as plain text', 'success');
        });
    }

    // Export as GIFT
    const exportGiftBtn = document.getElementById('exportQuestionsGiftBtn');
    if (exportGiftBtn) {
        exportGiftBtn.addEventListener('click', () => {
            if (questionBank.length === 0) {
                showToast('⚠️ No questions to export.', 'warning');
                return;
            }
            const filenameInput = document.getElementById('questionBankFilename');
            let filename = filenameInput ? filenameInput.value.trim() : 'questions';
            if (!filename) filename = 'questions';
            filename += '_gift.txt';
            const blob = new Blob([questionsToGift(questionBank)], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.click();
            URL.revokeObjectURL(url);
            showToast(`📄 GIFT exported as ${filename}`, 'success');
        });
    }

    // Toggle Choice E in Add Question form
    document.getElementById('qmSendToDesignBtn')?.addEventListener('click', () => sendToBank(questionBank, 'design'));

    const toggleChoiceEBtn = document.getElementById('toggleChoiceEBtn');
    if (toggleChoiceEBtn) {
        toggleChoiceEBtn.addEventListener('click', () => {
            const row = document.getElementById('choiceERow');
            if (!row) return;
            const hidden = row.classList.toggle('hidden');
            toggleChoiceEBtn.textContent = hidden ? '+ Add Choice E' : '− Remove Choice E';
            if (hidden) {
                const input = row.querySelector('input[type="text"]');
                if (input) input.value = '';
                const radio = row.querySelector('input[type="radio"]');
                if (radio) radio.checked = false;
            }
        });
    }

    // Clear Saved Bank buttons
    const clearBankBtn = document.getElementById('clearQuestionBank');
    if (clearBankBtn) {
        clearBankBtn.addEventListener('click', () => {
            resetDropZoneDisplay(document.getElementById('loadQuestionBank'));
            if (questionBank.length === 0) {
                showToast('⚠️ Nothing to clear', 'warning');
                return;
            }
            questionBank = [];
            addedQuestions = [];
            localStorage.removeItem('coeus-question-bank');
            localStorage.removeItem('coeus-added-questions');
            clearQuestionManagerState();
            showToast('🗑️ Cleared', 'warning');
            renderQuestionManagerList();
        });
    }

    // clearSavedTestBank moved to Write Questions tab (wqClearSavedBtn)

    const clearTestBankBtn = document.getElementById('clearTestBank');
    if (clearTestBankBtn) {
        clearTestBankBtn.addEventListener('click', () => {
            resetDropZoneDisplay(document.getElementById('loadTestBank'));
            if (testBank.length === 0) {
                showToast('⚠️ Nothing to clear', 'warning');
                return;
            }
            const testBankSnapshot = [...testBank];
            testBank = [];
            localStorage.removeItem('coeus-test-bank');
            pushUndo('Test bank cleared', () => {
                testBank = testBankSnapshot;
                saveTestBankToStorage();
                updateCategoryInputs();
                renderSidebarQuestions();
                showToast('✅ Test bank restored', 'success');
            });
            const undoHtml = '<span>🗑️ Cleared. <button onclick="performUndo()" style="background:#fff;color:#333;padding:4px 8px;border-radius:4px;cursor:pointer;margin-left:8px;border:1px solid #ccc;">Undo</button></span>';
            showToast(undoHtml, 'warning', 5000, true);
            const bankStatus = document.getElementById('bankStatus');
            if (bankStatus) bankStatus.innerHTML = '';
            const summaryEl = document.getElementById('testSummary');
            if (summaryEl) summaryEl.textContent = 'Total questions to generate: 0';
            const testPreviewEl = document.getElementById('testPreview');
            if (testPreviewEl) testPreviewEl.innerHTML = '';
            const distributionEl = document.getElementById('answerDistribution');
            if (distributionEl) distributionEl.innerHTML = '';
            const reportDiv = document.getElementById('generationReport');
            if (reportDiv) reportDiv.innerHTML = '';
            lastUnusedQuestions = [];
            const unusedSection = document.getElementById('unusedQuestionsSection');
            if (unusedSection) unusedSection.classList.add('hidden');
            const unusedSummaryEl = document.getElementById('unusedSummary');
            if (unusedSummaryEl) unusedSummaryEl.innerHTML = '';
            const exportUnusedBtn = document.getElementById('exportUnusedJson');
            if (exportUnusedBtn) exportUnusedBtn.disabled = true;
            updateCategoryInputs();
            renderSidebarQuestions();
        });
    }

    const TAB_SHORTCUT_IDS = ['writeQuestionsTab', 'questionManagerTab', 'testGeneratorTab', 'convertFileTab', 'jsonMergerTab'];
    function isTypingTarget(el) {
        if (!el) return false;
        const tag = el.tagName;
        return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
    }

    document.addEventListener('keydown', (e) => {
        // Undo — works everywhere, including while a field has focus
        if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
            if (hasUndo()) {
                e.preventDefault();
                performUndo();
            }
            return;
        }

        // Submit the Add Question form from any field inside it, including the textarea
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            const form = document.activeElement?.closest?.('#wqQuestionForm');
            if (form) {
                e.preventDefault();
                form.requestSubmit ? form.requestSubmit() : form.dispatchEvent(new Event('submit', { cancelable: true }));
            }
            return;
        }

        // Cancel the open Manage a Bank question editor
        if (e.key === 'Escape') {
            if (typeof questionManagerState !== 'undefined' && questionManagerState.editingIndex !== null) {
                const idx = questionManagerState.editingIndex;
                questionManagerState.editingIndex = null;
                if (questionManagerState.editFormData[idx]) delete questionManagerState.editFormData[idx];
                renderQuestionManagerList();
                return;
            }
            if (!shortcutsModal?.classList.contains('hidden')) {
                closeShortcutsModal();
                return;
            }
        }

        if (isTypingTarget(e.target)) return;

        // Alt+1..5 — jump to a tab
        if (e.altKey && /^[1-5]$/.test(e.key)) {
            const id = TAB_SHORTCUT_IDS[Number(e.key) - 1];
            const btn = document.getElementById(id);
            if (btn) {
                e.preventDefault();
                btn.click();
            }
            return;
        }

        // ? — show the shortcuts help modal
        if (e.key === '?') {
            e.preventDefault();
            openShortcutsModal();
        }
    });

    // Default: restore last tab or fall back to Write Questions
    const lastTab = localStorage.getItem('coeus-last-tab') || 'writeQuestionsTab';
    const defaultTabBtn = document.getElementById(lastTab) || document.getElementById('writeQuestionsTab');
    if (defaultTabBtn) defaultTabBtn.click();

    renderSidebarQuestions();
    
    console.log('✅ Coeus initialized successfully');
});
