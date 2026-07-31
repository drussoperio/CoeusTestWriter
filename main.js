/*
 * Coeus Test Writer
 * Copyright (C) 2026 Druss Operio
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published
 * by the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 */

// ========================================
// VERSION
// ========================================
const APP_VERSION = '2.4.3';

// Changelog entries — add a new array entry for each version
const CHANGELOG = {
    '2.4.3': [
        'Added: Plain-text formatting rules in Write Questions Show Tips',
        'Added: Format warning in Paste Text when input does not follow expected structure',
        'Added: Delete All Questions in Paste Text tab — mirrors Add Questions behavior with confirm + undo',
        'Added: Convert button in Convert a File (previews without downloading)',
        'Changed: Manage a Bank — Set Difficulty moved to second column beside Rename Selected; Delete Selected button moved below with no header',
    ],
    '2.4.2': [
        'Added: Output preview toggles (JSON/CSV/GIFT/TXT) in Convert a File tab',
        'Added: Placeholders for Subject, Category, Question, and Choices in Write Questions → Add Questions',
        'Added: Matching placeholders in Paste Text tab (Subject, Category)',
        'Fixed: Edit Bank section now visible in Manage a Bank (active class restored)',
        'Fixed: Write Questions CSV preview can now be switched away from without breaking other previews',
        'Fixed: Design a Test tooltips now use fixed positioning and follow the cursor — no longer clipped',
        'Changed: Quick Start Guide rewritten to lead with Write Questions tab',
        'Changed: Default tab is now Write Questions; last-visited tab is remembered across sessions',
    ],
    '2.4.1': [
        'Added: Subject field in Write Questions → Add Questions form',
        'Added: Undo support for Delete All Questions (5-second window)',
        'Added: Confirmation popup before deleting all exam bank questions',
        'Added: CSV preview rendered as table in Write Questions output panel',
        'Changed: Add Question and Delete All Questions buttons placed side by side',
        'Changed: Renamed "Clear Saved Questions" to "Delete All Questions"',
        'Changed: Write Questions form inputs use shadows instead of borders',
        'Changed: Manage a Bank — Add Questions inner tab removed; Edit Bank is now the only view',
        'Changed: Set Difficulty dropdown width matches Rename Selected input',
        'Changed: "Select Questions Across Categories" button shortened to "Auto-Select by Type"',
        'Changed: Convert a File — replaced Convert-to dropdown with four direct Export buttons',
    ],
    '2.4.0': [
        'Added: Write Questions tab — own exam bank (exambank), Add Questions and Paste Text sub-tabs, output preview toggles (JSON/TXT/GIFT/CSV), export buttons, Clear Saved Questions',
        'Added: Convert a File tab — single unified converter replacing four separate Convert tabs; upload-only; format selector',
        'Changed: Manage a Bank redesigned — 2-column Input/Output at top, Edit Bank below',
        'Changed: Tooltips now appear beside labels (hover); info buttons converted to CSS tooltip icons',
        'Removed: Separate Convert to JSON / CSV / GIFT / Text tabs (merged into Convert a File)',
        'Removed: Clear Saved Questions from Manage a Bank (moved to Write Questions)',
        'Fixed: Export TXT button label standardized to "Export as TXT"',
    ],
    '2.3.0': [
        'Welcome modal shown on first launch with Quick Start guide',
        'Liability disclaimer in welcome modal and footer',
        'Changelog modal shown automatically on version update',
    ],
    '2.2.0': [
        'Difficulty setting (Easy / Medium / Hard / Unset) added to questions',
        'Global difficulty ratio presets in Test Generator',
        'Balanced Pick now respects difficulty ratio with Unset fallback',
        'Generation Report now includes Difficulty Breakdown table',
        'Difficulty badge and filter added to Bank Editor',
        'Bulk Set Difficulty for selected questions',
        'Difficulty dropdown in Convert to JSON (Paste Text)',
        'CSV export/import now includes Difficulty column',
    ],
    '2.1.1': [
        'Footer with About modal, GitHub, Download Latest, Report a Bug, AGPLv3',
        'About section with project description and credits',
        'Version number displayed in footer and About modal',
        'Export as GIFT in Question Manager',
        'Choice E option in Add New Question (MCQ)',
        'Select Questions Across Categories (Balanced Pick)',
        'Zero-padded question numbering in GIFT export',
        'Answer key in TXT export uses line breaks between entries',
        'Renamed Export as Plain Text to Export TXT',
    ],
};

// ========================================
// GLOBAL VARIABLES
// ========================================

let testBank = [];
let questionBank = [];
let __qbUidCounter = 1;
function assignQuestionUids(arr) {
    (arr || []).forEach(q => { if (q && q.__uid == null) q.__uid = __qbUidCounter++; });
    return arr;
}
let addedQuestions = []; // references to questions added via "Add Question to Bank" form
let examBank = [];       // Write Questions tab — own bank (exambank)
let lastGeneratedQuestions = [];
let lastUnusedQuestions = [];
let lastSelectedCategories = {};
let excludedQuestions = [];
let generationStats = {};
let testVersionIndex = 0;
let questionManagerState = {
    searchText: '',
    sortBy: 'category',
    filterBy: 'all',
    selectedQuestions: new Set(),
    editingIndex: null,
    editFormData: {},
    collapsedCategories: {}
};
const VERSION_LABELS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
let giftResults = '';
let bulkResults = [];
let mergedQuestions = [];
let mergerFileStats = [];
let lastDeletedBank = null;
let undoTimeoutId = null;
let lastBankEditorSnapshot = null;
let bankEditorUndoTimeoutId = null;

// ========================================
// MAIN INITIALIZATION
// ========================================

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
    const randomizeCheckbox = document.getElementById('randomize');
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
    }

    // ── Collapsible answer key ─────────────────────────────────
    function setupAnswerKeyToggle() {
        const akToggle = document.getElementById('answerKeyToggle');
        const akBody = document.getElementById('answerKeyBody');
        const akChevron = document.getElementById('answerKeyChevron');
        
        if (akToggle && akBody) {
            akToggle.addEventListener('click', () => {
                const open = akBody.classList.toggle('open');
                if (akChevron) akChevron.textContent = open ? '▼' : '▶';
                const label = akToggle.querySelectorAll('span')[1];
                if (label) label.textContent = open ? 'Hide Answer Key' : 'Show Answer Key';
            });
        }
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

    // ── Jump to top/bottom buttons ─────────────────────────────
    function setupJumpButtons() {
        const jumpToTop = document.getElementById('jumpToTop');
        const jumpToBottom = document.getElementById('jumpToBottom');
        const container = document.getElementById('testPreviewContainer');
        
        if (jumpToTop && container) {
            jumpToTop.addEventListener('click', () => {
                container.scrollTop = 0;
            });
        }
        
        if (jumpToBottom && container) {
            jumpToBottom.addEventListener('click', () => {
                container.scrollTop = container.scrollHeight;
            });
        }
    }

    // ── TXT→JSON output jump buttons ───────────────────────────
    function setupTxtToJsonJumpButtons() {
        const jumpToTop = document.getElementById('txtToJsonJumpToTop');
        const jumpToBottom = document.getElementById('txtToJsonJumpToBottom');
        const container = document.getElementById('txtToJsonOutputContainer');

        if (jumpToTop && container) {
            jumpToTop.addEventListener('click', () => {
                container.scrollTop = 0;
            });
        }

        if (jumpToBottom && container) {
            jumpToBottom.addEventListener('click', () => {
                container.scrollTop = container.scrollHeight;
            });
        }
    }

    // ── Plain Text→JSON output jump buttons ────────────────────
    function setupBulkJumpButtons() {
        const jumpToTop = document.getElementById('bulkJumpToTop');
        const jumpToBottom = document.getElementById('bulkJumpToBottom');
        const container = document.getElementById('bulkOutputContainer');

        if (jumpToTop && container) {
            jumpToTop.addEventListener('click', () => {
                container.scrollTop = 0;
            });
        }

        if (jumpToBottom && container) {
            jumpToBottom.addEventListener('click', () => {
                container.scrollTop = container.scrollHeight;
            });
        }
    }

    // ── Text→GIFT output jump buttons ───────────────────────────
    function setupGiftJumpButtons() {
        const jumpToTop = document.getElementById('giftJumpToTop');
        const jumpToBottom = document.getElementById('giftJumpToBottom');
        const container = document.getElementById('giftOutputContainer');

        if (jumpToTop && container) {
            jumpToTop.addEventListener('click', () => {
                container.scrollTop = 0;
            });
        }

        if (jumpToBottom && container) {
            jumpToBottom.addEventListener('click', () => {
                container.scrollTop = container.scrollHeight;
            });
        }
    }

    // ── Generic output jump buttons (Top/Bottom) ─────────────────
    function setupJumpButtonsFor(topId, bottomId, containerId) {
        const jumpToTop = document.getElementById(topId);
        const jumpToBottom = document.getElementById(bottomId);
        const container = document.getElementById(containerId);

        if (jumpToTop && container) {
            jumpToTop.addEventListener('click', () => { container.scrollTop = 0; });
        }
        if (jumpToBottom && container) {
            jumpToBottom.addEventListener('click', () => { container.scrollTop = container.scrollHeight; });
        }
    }

    // ── JSON Merger output jump buttons ─────────────────────────
    function setupMergerJumpButtons() {
        const jumpToTop = document.getElementById('mergerJumpToTop');
        const jumpToBottom = document.getElementById('mergerJumpToBottom');
        const container = document.getElementById('mergerOutputContainer');

        if (jumpToTop && container) {
            jumpToTop.addEventListener('click', () => {
                container.scrollTop = 0;
            });
        }

        if (jumpToBottom && container) {
            jumpToBottom.addEventListener('click', () => {
                container.scrollTop = container.scrollHeight;
            });
        }
    }

    // ── JSON to TXT conversion ─────────────────────────────────
    function setupJsonToTxtConversion() {
        const btn = document.getElementById('convertJsonToTxtButton');
        console.log('setupJsonToTxtConversion: btn =', btn);
        
        if (!btn) {
            console.warn('convertJsonToTxtButton not found in DOM');
            return;
        }
        
        const fileInput = document.getElementById('jsonFileInput');
        const output = document.getElementById('jsonToTxtOutput');
        const downloadBtn = document.getElementById('downloadJsonToTxtBtn');
        const filenameInput = document.getElementById('jsonToTxtFilename');
        let lastConvertedTxt = '';
        let lastFileName = '';
        
        btn.addEventListener('click', function() {
            if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
                showToast('⚠️ Please select a JSON file.', 'warning');
                return;
            }
            const file = fileInput.files[0];
            lastFileName = file.name.replace('.json', '');
            if (filenameInput) filenameInput.value = lastFileName;
            
            const reader = new FileReader();
            reader.onload = function(event) {
                try {
                    const jsonData = JSON.parse(event.target.result);
                    renderMissingCorrectWarning('jsonToTxtMissingCorrectWarning', jsonData);
                    const txtData = convertJsonToCsv(jsonData);
                    lastConvertedTxt = txtData;
                    output.textContent = txtData;
                    showToast('✅ Conversion complete', 'success');
                } catch (error) {
                    showToast('❌ Error: ' + error.message, 'error');
                }
            };
            reader.readAsText(file);
        });

        if (downloadBtn) {
            downloadBtn.addEventListener('click', () => {
                if (!lastConvertedTxt) {
                    showToast('⚠️ Please convert first.', 'warning');
                    return;
                }
                const customFilename = filenameInput?.value.trim() || lastFileName || 'questions';
                const blob = new Blob([lastConvertedTxt], { type: 'text/csv' });
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = customFilename + '.csv';
                link.click();
                URL.revokeObjectURL(link.href);
                showToast('✅ CSV downloaded', 'success');
            });
        }

        const clearBtn = document.getElementById('clearJsonToTxtButton');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
                    showToast('⚠️ Nothing to clear', 'warning');
                    return;
                }
                const dropZone = document.querySelector('#jsonToTxtContent .drop-zone');
                fileInput.value = '';
                output.textContent = '';
                lastConvertedTxt = '';
                lastFileName = '';
                if (filenameInput) filenameInput.value = '';
                if (dropZone) {
                    const textDisplay = dropZone.querySelector('p');
                    if (textDisplay) {
                        textDisplay.className = 'text-sm text-gray-600';
                        textDisplay.textContent = 'Drag & drop file or click to browse';
                    }
                }
                showToast('🗑️ Cleared', 'success');
            });
        }
    }

    // ── Text to GIFT Converter ─────────────────────────────────
    function setupGiftConverter() {
        const btnJson = document.getElementById('giftModeJson');
        const btnPlain = document.getElementById('giftModePlain');
        const panelJson = document.getElementById('giftJsonPanel');
        const panelPlain = document.getElementById('giftPlainPanel');
        const convertBtn = document.getElementById('convertGiftBtn');
        const clearBtn = document.getElementById('clearGiftBtn');
        const downloadTxtBtn = document.getElementById('downloadGiftTxtBtn');

        if (btnJson && btnPlain && panelJson && panelPlain) {
            function setGiftMode(mode) {
                const jsonActive = mode === 'json';
                panelJson.classList.toggle('hidden', !jsonActive);
                panelPlain.classList.toggle('hidden', jsonActive);
                btnJson.className = `px-4 py-3 rounded font-medium flex-1 ${jsonActive ? 'bg-blue-500 text-white hover:bg-blue-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`;
                btnPlain.className = `px-4 py-3 rounded font-medium flex-1 ${!jsonActive ? 'bg-blue-500 text-white hover:bg-blue-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`;
            }

            btnJson.addEventListener('click', () => setGiftMode('json'));
            btnPlain.addEventListener('click', () => setGiftMode('plain'));
        }

        if (convertBtn) convertBtn.addEventListener('click', convertToGift);
        
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                const jsonInput = document.getElementById('giftJsonInput');
                const plainInput = document.getElementById('giftPlainInput');
                if ((!jsonInput || jsonInput.value === '') && (!plainInput || plainInput.value === '')) {
                    showToast('⚠️ Nothing to clear', 'warning');
                    return;
                }
                document.getElementById('giftJsonInput').value = '';
                document.getElementById('giftPlainSubject').value = '';
                document.getElementById('giftPlainCategory').value = '';
                document.getElementById('giftPlainInput').value = '';
                document.getElementById('giftOutput').textContent = '';
                giftResults = '';
                showToast('🗑️ Cleared', 'success');
            });
        }
        
        if (downloadTxtBtn) {
            downloadTxtBtn.addEventListener('click', () => {
                if (!giftResults) {
                    showToast('⚠️ Please convert first.', 'warning');
                    return;
                }
                const filenameInput = document.getElementById('giftFilename');
                const filename = (filenameInput?.value.trim() || 'questions') + '_gift.txt';
                const blob = new Blob([giftResults], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                a.click();
                URL.revokeObjectURL(url);
                showToast('✅ GIFT downloaded', 'success');
            });
        }
    }

    // ── Bulk converter buttons ─────────────────────────────────
    function setupBulkConverter() {
        const convertBtn = document.getElementById('convertBulkBtn');
        const downloadBtn = document.getElementById('downloadBulkBtn');
        const clearBtn = document.getElementById('clearBulkBtn');

        if (convertBtn) convertBtn.addEventListener('click', convertBulkToJSON);
        if (downloadBtn) downloadBtn.addEventListener('click', downloadBulkJSON);
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                const bulkInput = document.getElementById('bulkInput');
                const bulkOutput = document.getElementById('bulkOutput');
                if (!bulkInput || !bulkInput.value.trim()) {
                    showToast('⚠️ Nothing to clear', 'warning');
                    return;
                }
                document.getElementById('bulkSubject').value = '';
                document.getElementById('bulkCategory').value = '';
                bulkInput.value = '';
                bulkOutput.textContent = '';
                showToast('🗑️ Cleared', 'success');
            });
        }
    }

    // ── TXT to JSON converter ──────────────────────────────────
    function setupTxtToJsonConverter() {
        const btn = document.getElementById('convertTxtToJsonButton');
        const downloadBtn = document.getElementById('downloadTxtToJsonBtn');
        const filenameInput = document.getElementById('txtToJsonFilename');
        let lastConvertedJson = null;
        let lastFileName = '';
        
        if (btn) {
            btn.addEventListener('click', function() {
                const fileInput = document.getElementById('txtFileInput');
                const output = document.getElementById('txtToJsonOutput');

                if (!fileInput.files || fileInput.files.length === 0) {
                    showToast('⚠️ Please select a TXT file.', 'warning');
                    return;
                }

                const file = fileInput.files[0];
                lastFileName = file.name.replace(/\.[^/.]+$/, "");
                if (filenameInput) filenameInput.value = lastFileName;
                const reader = new FileReader();

                reader.onload = function(event) {
                    const text = event.target.result;
                    try {
                        const json = convertCsvToJson(text);
                        lastConvertedJson = json;
                        renderMissingCorrectWarning('txtToJsonMissingCorrectWarning', json);

                        const jsonStr = JSON.stringify(json, null, 2);
                        output.textContent = jsonStr;
                        if (window.Prism) {
                            Prism.highlightElement(output);
                        }
                        showToast('✅ Conversion complete', 'success');
                    } catch (error) {
                        output.textContent = "Error: " + error.message;
                        showToast('❌ Error: ' + error.message, 'error');
                    }
                };

                reader.readAsText(file);
            });
        }

        if (downloadBtn) {
            downloadBtn.addEventListener('click', () => {
                if (!lastConvertedJson) {
                    showToast('⚠️ Please convert first.', 'warning');
                    return;
                }
                const customFilename = filenameInput?.value.trim() || lastFileName || 'questions';
                const jsonStr = JSON.stringify(lastConvertedJson, null, 2);
                const blob = new Blob([jsonStr], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = customFilename + '.json';
                a.click();
                URL.revokeObjectURL(url);
                showToast('✅ JSON downloaded', 'success');
            });
        }

        const clearBtn = document.getElementById('clearTxtToJsonButton');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                const fileInput = document.getElementById('txtFileInput');
                const output = document.getElementById('txtToJsonOutput');
                const dropZone = document.querySelector('#txtToJsonContent .drop-zone');
                if (!fileInput.files || fileInput.files.length === 0) {
                    showToast('⚠️ Nothing to clear', 'warning');
                    return;
                }
                fileInput.value = '';
                output.textContent = '';
                lastConvertedJson = null;
                lastFileName = '';
                if (filenameInput) filenameInput.value = '';
                if (dropZone) {
                    const textDisplay = dropZone.querySelector('p');
                    if (textDisplay) {
                        textDisplay.className = 'text-sm text-gray-600';
                        textDisplay.textContent = 'Drag & drop file or click to browse';
                    }
                }
                showToast('🗑️ Cleared', 'success');
            });
        }
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

        setupJumpButtonsFor(prefix + 'JumpToTop', prefix + 'JumpToBottom', prefix + 'OutputContainer');

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
                `<th class="px-3 py-2 border border-gray-300 text-left font-semibold text-gray-700 whitespace-nowrap bg-gray-100">${h}</th>`
            ).join('') + '</tr>';

            bodyEl.innerHTML = rows.slice(1).map((row, ri) =>
                '<tr class="' + (ri % 2 === 0 ? 'bg-white' : 'bg-gray-50') + ' hover:bg-blue-50">' +
                row.map(cell => `<td class="px-3 py-1.5 border border-gray-200 text-gray-700 max-w-xs truncate" title="${cell.replace(/"/g,'&quot;')}">${cell || '<span class="text-gray-300">—</span>'}</td>`).join('') +
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
                showToast('🗑️ Cleared', 'success');
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

        setupJumpButtonsFor('convertFileJumpToTop', 'convertFileJumpToBottom', 'convertFileTextOutputWrap');

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
                if (csvHead) csvHead.innerHTML = '<tr>' + rows[0].map(h => `<th class="px-3 py-2 border border-gray-300 text-left font-semibold text-gray-700 whitespace-nowrap bg-gray-100">${h}</th>`).join('') + '</tr>';
                if (csvBody) csvBody.innerHTML = rows.slice(1).map((row, ri) =>
                    '<tr class="' + (ri % 2 === 0 ? 'bg-white' : 'bg-gray-50') + ' hover:bg-blue-50">' +
                    row.map(cell => `<td class="px-3 py-1.5 border border-gray-200 text-gray-700 max-w-xs truncate" title="${cell.replace(/"/g,'&quot;')}">${cell || '<span class="text-gray-300">—</span>'}</td>`).join('') +
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
                showToast('🗑️ Cleared', 'success');
            });
        }

        function doConvertAndExport(fmt) {
            if (!fileInput || !fileInput.files || !fileInput.files.length) {
                showToast('⚠️ Please select a file.', 'warning'); return;
            }
            setCfPreviewActive(fmt);
            runConvert(fmt);
            // Defer download until after reader.onload fires
            convertFilePendingDownload = fmt;
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
                    const choices = [], radios = [];
                    rows.forEach(r => {
                        const inp = r.querySelector('input[type="text"]');
                        const rad = r.querySelector('input[type="radio"]');
                        if (inp && inp.value.trim()) { choices.push(inp.value.trim()); radios.push(rad); }
                    });
                    const checkedIdx = radios.findIndex(r => r.checked);
                    if (choices.length < 2) { showToast('⚠️ At least 2 choices required.', 'warning'); return; }
                    if (checkedIdx < 0) { showToast('⚠️ Please mark a correct answer.', 'warning'); return; }
                    q.choices = choices;
                    q.correct = choices[checkedIdx];
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
            if (wqPreviewFormat === 'csv') {
                container.innerHTML = renderCsvTable(convertJsonToCsv(examBank));
            } else {
                container.innerHTML = '<pre class="text-xs"><code id="wqOutput"></code></pre>';
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

        setupJumpButtonsFor('wqJumpToTop', 'wqJumpToBottom', 'wqOutputContainer');

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
            wqDeletedBackup = [...examBank];
            examBank = [];
            saveExamBankToStorage();
            refreshWqPreview();
            showPasteWarning('');
            if (wqUndoTimeout) clearTimeout(wqUndoTimeout);
            const undoHtml = '<span>🗑️ All questions deleted. <button onclick="window.__wqUndo && window.__wqUndo()" style="background:#fff;color:#333;padding:3px 8px;border-radius:4px;cursor:pointer;margin-left:8px;border:1px solid #ccc;font-size:0.8rem;">Undo</button></span>';
            showToast(undoHtml, 'warning', 5000);
            window.__wqUndo = () => {
                if (!wqDeletedBackup) return;
                examBank = [...wqDeletedBackup];
                wqDeletedBackup = null;
                saveExamBankToStorage();
                refreshWqPreview();
                showToast('↩️ Restored.', 'success');
            };
            wqUndoTimeout = setTimeout(() => { wqDeletedBackup = null; window.__wqUndo = null; }, 5000);
        });

        // Delete All Questions — confirm + undo
        let wqDeletedBackup = null, wqUndoTimeout = null;
        const clearSavedBtn = document.getElementById('wqClearSavedBtn');
        if (clearSavedBtn) {
            clearSavedBtn.addEventListener('click', () => {
                if (!examBank.length) { showToast('⚠️ Nothing to delete.', 'warning'); return; }
                const confirmed = window.confirm(`Delete all ${examBank.length} question(s) from the exam bank? This can be undone.`);
                if (!confirmed) return;
                wqDeletedBackup = [...examBank];
                examBank = [];
                saveExamBankToStorage();
                refreshWqPreview();
                if (wqUndoTimeout) clearTimeout(wqUndoTimeout);
                const undoHtml = '<span>🗑️ All questions deleted. <button onclick="window.__wqUndo && window.__wqUndo()" style="background:#fff;color:#333;padding:3px 8px;border-radius:4px;cursor:pointer;margin-left:8px;border:1px solid #ccc;font-size:0.8rem;">Undo</button></span>';
                showToast(undoHtml, 'warning', 5000);
                window.__wqUndo = () => {
                    if (!wqDeletedBackup) return;
                    examBank = [...wqDeletedBackup];
                    wqDeletedBackup = null;
                    saveExamBankToStorage();
                    refreshWqPreview();
                    showToast('↩️ Restored.', 'success');
                };
                wqUndoTimeout = setTimeout(() => { wqDeletedBackup = null; window.__wqUndo = null; }, 5000);
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
    }

    // ── Unused questions buttons ───────────────────────────────
    function setupUnusedQuestions() {
        const exportBtn = document.getElementById('exportUnusedJson');
        const toggleBtn = document.getElementById('toggleUnusedPreview');

        if (exportBtn) exportBtn.addEventListener('click', exportUnusedAsJson);
        if (toggleBtn) toggleBtn.addEventListener('click', toggleUnusedPreview);
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
    setupAnswerKeyToggle();
    setupDocxInfoToggle();
    setupJumpButtons();
    setupGiftConverter();
    setupBulkConverter();
    setupMerger();
    setupUnusedQuestions();
    setupExclusions();
    setupCategoryButtons();
    setupGiftJumpButtons();
    setupConvertAFile();
    setupWriteQuestions();
    setupMergerJumpButtons();
    
    // Initialize Question Manager
    initializeQuestionManager();
    
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
            if (questionBank.length === 0) {
                showToast('⚠️ Nothing to clear', 'warning');
                return;
            }
            questionBank = [];
            addedQuestions = [];
            localStorage.removeItem('coeus-question-bank');
            localStorage.removeItem('coeus-added-questions');
            clearQuestionManagerState();
            showToast('🗑️ Cleared', 'success');
            const qmFileInput = document.getElementById('loadQuestionBank');
            if (qmFileInput) qmFileInput.value = '';
            const qmDropZone = qmFileInput ? qmFileInput.closest('.drop-zone') : null;
            if (qmDropZone) {
                const p = qmDropZone.querySelector('p');
                if (p) {
                    p.className = 'text-sm text-gray-600';
                    p.textContent = 'Drag & drop file or click to browse';
                }
            }
            renderQuestionManagerList();
        });
    }

    // clearSavedTestBank moved to Write Questions tab (wqClearSavedBtn)

    const clearTestBankBtn = document.getElementById('clearTestBank');
    if (clearTestBankBtn) {
        clearTestBankBtn.addEventListener('click', () => {
            if (testBank.length === 0) {
                showToast('⚠️ Nothing to clear', 'warning');
                return;
            }
            lastDeletedBank = {
                type: 'testBank',
                data: [...testBank]
            };
            testBank = [];
            localStorage.removeItem('coeus-test-bank');
            if (undoTimeoutId) clearTimeout(undoTimeoutId);
            undoTimeoutId = setTimeout(() => { lastDeletedBank = null; }, 5000);
            const undoHtml = '<span>🗑️ Cleared. <button onclick="undoClear()" style="background:#fff;color:#333;padding:4px 8px;border-radius:4px;cursor:pointer;margin-left:8px;border:1px solid #ccc;">Undo</button></span>';
            showToast(undoHtml, 'warning', 5000);
            const tgFileInput = document.getElementById('loadTestBank');
            if (tgFileInput) tgFileInput.value = '';
            const tgDropZone = tgFileInput ? tgFileInput.closest('.drop-zone') : null;
            if (tgDropZone) {
                const p = tgDropZone.querySelector('p');
                if (p) {
                    p.className = 'text-sm text-gray-600';
                    p.textContent = 'Drag & drop file or click to browse';
                }
            }
            const bankStatus = document.getElementById('bankStatus');
            if (bankStatus) bankStatus.innerHTML = '';
            const summaryEl = document.getElementById('testSummary');
            if (summaryEl) summaryEl.textContent = 'Total questions to generate: 0';
            const testPreviewEl = document.getElementById('testPreview');
            if (testPreviewEl) testPreviewEl.innerHTML = '';
            const reportDiv = document.getElementById('generationReport');
            if (reportDiv) reportDiv.innerHTML = '';
            updateCategoryInputs();
            renderSidebarQuestions();
        });
    }

    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
            if (lastDeletedBank) {
                e.preventDefault();
                undoClear();
            } else if (lastBankEditorSnapshot) {
                e.preventDefault();
                undoBankEditorChange();
            }
        }
    });

    // Default: restore last tab or fall back to Write Questions
    const lastTab = localStorage.getItem('coeus-last-tab') || 'writeQuestionsTab';
    const defaultTabBtn = document.getElementById(lastTab) || document.getElementById('writeQuestionsTab');
    if (defaultTabBtn) defaultTabBtn.click();

    renderSidebarQuestions();
    
    console.log('✅ Coeus initialized successfully');
});

// ========================================
// QUESTION MANAGER - GROUPED BY CATEGORY
// ========================================

// Render the Question Manager list grouped by category with collapsible sections
function renderQuestionManagerList() {
    const container = document.getElementById('sidebarQuestionList');
    if (!container) return;

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
    switch (questionManagerState.sortBy) {
        case 'type':
            filtered.sort((a, b) => {
                const typeOrder = { 'multiple_choice': 0, 'true_false': 1 };
                const typeA = typeOrder[a.type] ?? 2;
                const typeB = typeOrder[b.type] ?? 2;
                return typeA - typeB || (a.category || '').localeCompare(b.category || '');
            });
            break;
        case 'asLoaded':
            break;
        case 'category':
        default:
            filtered.sort((a, b) => (a.category || '').localeCompare(b.category || ''));
            break;
    }

    // Step 4: Group by category
    const grouped = {};
    filtered.forEach((q, idx) => {
        const cat = q.category || 'Uncategorized';
        if (!grouped[cat]) {
            grouped[cat] = [];
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

    // Render each category as a collapsible section
    Object.keys(grouped).sort().forEach(category => {
        const questions = grouped[category];
        const catColor = badgeColor(category);
        const safeCat = safeIdFromCategory(category);
        const isExpanded = !questionManagerState.collapsedCategories[category];

        html += `
            <div class="qm-category-section">
                <div class="qm-category-header" data-category="${category}">
                    <span class="qm-category-chevron ${!isExpanded ? 'collapsed' : ''}">▼</span>
                    <span class="cat-badge" style="background:${catColor}">${category}</span>
                    <span class="text-xs text-gray-500 ml-2">(${questions.length})</span>
                    <button class="qm-select-category-btn ml-auto text-xs px-2 py-1 rounded bg-blue-100 hover:bg-blue-200 text-blue-700" data-category="${category}" style="white-space: nowrap;">Select All in Category</button>
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

                html += `
                    <div class="q-card ${isSelected ? 'ring-2 ring-blue-500' : ''}" style="cursor: pointer; margin-left: 12px; margin-right: 12px;">
                        <div class="flex items-start gap-2">
                            <input type="checkbox" class="qm-checkbox mt-1" data-uid="${q.__uid}" ${isSelected ? 'checked' : ''} style="cursor: pointer;">
                            <div class="flex-1 min-w-0">
                                <div class="flex items-center gap-2 mb-1 flex-wrap">
                                    <span class="text-xs px-2 py-0.5 rounded" style="background-color: ${typeColor}40; color: ${typeColor}; font-weight: 600;">${typeLabel}</span>
                                    ${difficultyBadge(q.difficulty)}
                                </div>
                                <p class="text-xs" style="color: var(--text); line-height: 1.4; word-break: break-word;">${preview}</p>
                                ${q.correct ? `<p class="text-xs mt-1" style="color: var(--text-muted);">✓ ${q.correct}</p>` : '<p class="text-xs mt-1 text-red-500">⚠️ No correct answer</p>'}
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

                html += `
                    <div class="q-card border-2 border-blue-500 p-4 bg-blue-50" style="margin-left: 12px; margin-right: 12px;">
                        <h4 class="font-semibold mb-3" style="color: var(--text);">Edit Question</h4>
                        
                        <div class="space-y-3">
                            <div>
                                <label class="block text-sm font-medium" style="color: var(--text);">Category</label>
                                <input type="text" class="qm-edit-category mt-1 block w-full rounded border text-sm px-2 py-1.5" 
                                    value="${(editData.category || '').replace(/"/g, '&quot;')}" data-filtered-idx="${filteredIdx}">
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
                                <textarea class="qm-edit-question mt-1 block w-full rounded border text-sm px-2 py-1.5" rows="3" data-filtered-idx="${filteredIdx}">${(editData.question || '').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</textarea>
                            </div>

                            ${editData.type === 'multiple_choice' ? `
                                <div>
                                    <label class="block text-sm font-medium mb-2" style="color: var(--text);">Choices</label>
                                    <div class="space-y-2">
                                        ${(editData.choices || ['', '', '', '']).map((choice, i) => `
                                            <div class="flex items-center gap-2">
                                                <input type="text" class="qm-edit-choice flex-1 rounded border text-sm px-2 py-1" 
                                                    value="${(choice || '').replace(/"/g, '&quot;')}" 
                                                    data-filtered-idx="${filteredIdx}" data-choice-idx="${i}" placeholder="Choice ${String.fromCharCode(65 + i)}">
                                                <label class="flex items-center text-sm whitespace-nowrap">
                                                    <input type="radio" name="qm-edit-correct-${filteredIdx}" 
                                                        class="qm-edit-correct-radio mr-1" 
                                                        data-filtered-idx="${filteredIdx}" 
                                                        value="${i}" 
                                                        ${editData.correct === (choice || '') ? 'checked' : ''}>
                                                    Correct
                                                </label>
                                            </div>
                                        `).join('')}
                                    </div>
                                </div>
                            ` : editData.type === 'matching' ? `
                                <div>
                                    <label class="block text-sm font-medium mb-2" style="color: var(--text);">Column A (Premise)</label>
                                    <input type="text" placeholder="Premise" 
                                        value="${(editData.question || '').replace(/"/g, '&quot;')}"
                                        class="w-full rounded border text-sm px-2 py-1 qm-edit-question"
                                        data-filtered-idx="${filteredIdx}">
                                </div>
                                <div>
                                    <label class="block text-sm font-medium mb-2" style="color: var(--text);">Column B (Correct Answer)</label>
                                    <input type="text" placeholder="Correct answer" 
                                        value="${(editData.correct || '').replace(/"/g, '&quot;')}"
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

    // Attach event listeners
    attachQuestionManagerEventListeners(filtered);
    attachCategoryHeaderEvents();
	attachSelectCategoryButtons();
	attachSelectVisibleButton();
    updateDeleteButtonState();
    updateChangeCategoryButtonState();
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

        const correctRadio = document.querySelector(`input[name="qm-edit-correct-${idx}"]:checked`);
        if (correctRadio) {
            const choiceIdx = parseInt(correctRadio.value);
            correct = choices[choiceIdx];
        }
    } else if (type === 'true_false') {
        const tfRadio = document.querySelector(`input[name="qm-edit-correct-${idx}"][class="qm-edit-tf-radio"]:checked`);
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

    lastBankEditorSnapshot = [...questionBank];

    // Remove them from questionBank
    const newBank = questionBank.filter(q => !selectedUids.has(q.__uid));

    questionBank = newBank;
    saveQBankToStorage();
    questionManagerState.selectedQuestions.clear();
    renderQuestionManagerList();
    updateDeleteButtonState();
    if (bankEditorUndoTimeoutId) clearTimeout(bankEditorUndoTimeoutId);
    bankEditorUndoTimeoutId = setTimeout(() => { lastBankEditorSnapshot = null; }, 5000);
    const undoHtml = `<span>🗑️ Deleted ${count} question(s). <button onclick="undoBankEditorChange()" style="background:#fff;color:#333;padding:4px 8px;border-radius:4px;cursor:pointer;margin-left:8px;border:1px solid #ccc;">Undo</button></span>`;
    showToast(undoHtml, 'success', 5000);
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

    lastBankEditorSnapshot = [...questionBank];

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
    if (bankEditorUndoTimeoutId) clearTimeout(bankEditorUndoTimeoutId);
    bankEditorUndoTimeoutId = setTimeout(() => { lastBankEditorSnapshot = null; }, 5000);
    const undoHtml = `<span>✅ Changed category to "${newCat}" for ${changedCount} question(s). <button onclick="undoBankEditorChange()" style="background:#fff;color:#333;padding:4px 8px;border-radius:4px;cursor:pointer;margin-left:8px;border:1px solid #ccc;">Undo</button></span>`;
    showToast(undoHtml, 'success', 5000);
}

function updateQuestionManagerCategories() {
    const filterSelect = document.getElementById('qm-filter-select');
    if (filterSelect) {
        const categories = [...new Set(questionBank.map(q => q.category))].sort();
        const currentValue = filterSelect.value;
        
        // Preserve existing options for 'all', 'mcq', 'tf', and 'matching'
        const optionsHtml = `
            <option value="all">All Questions</option>
            <option value="mcq">Multiple Choice Only</option>
            <option value="tf">True/False Only</option>
            <option value="matching">Matching Only</option>
        ` + categories.map(cat => `<option value="${cat}">${cat}</option>`).join('');
        
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

    // Sort select
    const sortSelect = document.getElementById('qm-sort-select');
    if (sortSelect) {
        sortSelect.addEventListener('change', (e) => {
            questionManagerState.sortBy = e.target.value;
            renderQuestionManagerList();
        });
    }

    // Filter select
    const filterSelect = document.getElementById('qm-filter-select');
    if (filterSelect) {
        filterSelect.addEventListener('change', (e) => {
            questionManagerState.filterBy = e.target.value;
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

    renderQuestionManagerList();
}

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
    btn.addEventListener('click', function() { undoClear(); toast.remove(); });
    toast.appendChild(text);
    toast.appendChild(btn);
    stack.appendChild(toast);
    setTimeout(function() {
        toast.style.transition = 'opacity .3s';
        toast.style.opacity = '0';
        setTimeout(function() { if (toast.parentNode) toast.remove(); }, 300);
    }, 5000);
}

function showToast(message, type = 'success', duration = 3000) {
    let stack = document.getElementById('toast-stack');
    if (!stack) {
        stack = document.createElement('div');
        stack.id = 'toast-stack';
        stack.style.cssText = 'position:fixed;top:16px;right:16px;z-index:99999;display:flex;flex-direction:column;gap:8px;pointer-events:none;';
        document.body.appendChild(stack);
    }
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    if (typeof message === 'string' && message.includes('<')) {
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
    localStorage.setItem('coeus-question-bank', JSON.stringify(questionBank));
}

function saveAddedQuestionsToStorage() {
    localStorage.setItem('coeus-added-questions', JSON.stringify(addedQuestions));
}

function saveTestBankToStorage() {
    localStorage.setItem('coeus-test-bank', JSON.stringify(testBank));
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
        if (testBank.length > 0) {
            updateCategoryInputs();
        }
    }
}

function undoBankEditorChange() {
    if (!lastBankEditorSnapshot) return;
    questionBank = [...lastBankEditorSnapshot];
    saveQBankToStorage();
    renderQuestionManagerList();
    showToast('✅ Change undone', 'success');
    lastBankEditorSnapshot = null;
    if (bankEditorUndoTimeoutId) clearTimeout(bankEditorUndoTimeoutId);
}

function undoClear() {
    if (!lastDeletedBank) return;
    
    if (lastDeletedBank.type === 'questionBank') {
        questionBank = [...lastDeletedBank.data];
        saveQBankToStorage();
        renderQuestionManagerList();
        showToast('✅ Question bank restored', 'success');
    } else if (lastDeletedBank.type === 'addedQuestions') {
        questionBank = [...questionBank, ...lastDeletedBank.data];
        addedQuestions = [...addedQuestions, ...lastDeletedBank.data];
        saveQBankToStorage();
        saveAddedQuestionsToStorage();
        renderQuestionManagerList();
        showToast('✅ Added questions restored', 'success');
    } else if (lastDeletedBank.type === 'testBank') {
        testBank = [...lastDeletedBank.data];
        saveTestBankToStorage();
        updateCategoryInputs();
        showToast('✅ Test bank restored', 'success');
    } else if (lastDeletedBank.type === 'categoryInputs') {
        const snapshot = lastDeletedBank.data;
        Object.entries(snapshot).forEach(([id, val]) => {
            const el = document.getElementById(id);
            if (el) {
                el.value = val;
                el.dispatchEvent(new Event('input', { bubbles: true }));
            }
        });
        showToast('✅ Inputs restored', 'success');
    }
    
    lastDeletedBank = null;
    if (undoTimeoutId) clearTimeout(undoTimeoutId);
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
    return `<span class="cat-badge" style="background:${color}">${cat}</span>`;
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
            <p class="text-xs" style="color:var(--text);line-height:1.4;">${(q.question || '').slice(0, 100)}${(q.question || '').length > 100 ? '…' : ''}</p>
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
        categoryInputs.innerHTML = '<p class="text-gray-500">No categories available. Please load a test bank.</p>';
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
                ${cat}
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
                const categories = [...new Set(testBank.map(q => q.category))];
                updateCategoryInputs(categories);
                const bankStatus = document.getElementById('bankStatus');
                if (bankStatus) {
                    bankStatus.innerHTML = `
                        <div class="text-green-600">Test bank loaded successfully!</div>
                        <div>Total Questions: ${testBank.length}</div>
                    `;
                }
                renderMissingCorrectWarning('testBankMissingCorrectWarning', testBank);
                updateStatusBank(file.name.replace(/\.[^/.]+$/, ''), testBank.length);
                const outputFilenameInput = document.getElementById('outputFilename');
                if (outputFilenameInput) outputFilenameInput.value = file.name.replace(/\.[^/.]+$/, '');
                renderSidebarQuestions();
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
        <input type="text" placeholder="Premise" value="${text.replace(/"/g, '&quot;')}"
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

// ========================================
// SHUFFLE & DISTRIBUTION ALGORITHMS
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

    const randomizeCheckbox = document.getElementById('randomize');
    const randomize = randomizeCheckbox.checked;
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

    let answerKeyHtml = '<h3 class="text-lg font-semibold mb-4">Answer Key</h3>';

    let questionNumber = 1;

    const mcqs = questions.filter(q => q.type === 'multiple_choice');
    mcqs.forEach(q => {
        const choices = (q.displayChoices && q.displayChoices.length)
            ? q.displayChoices : (q.choices || []);

        testHtml += `<p style="margin-bottom:0.15rem;padding-left:1.8em;text-indent:-1.8em;">${questionNumber}. ${String(q.question).replace(/\n/g, '<br>')}</p>`;
        choices.forEach((choice, i) => {
            const letter = String.fromCharCode(65 + i);
            testHtml += `<p style="margin-bottom:0.1rem;padding-left:3em;text-indent:-1.5em;">${letter}. ${choice}</p>`;
        });
        testHtml += `<div style="margin-bottom:0.5rem;"></div>`;

        const correctLetter = q.displayCorrectLetter
            ? q.displayCorrectLetter
            : String.fromCharCode(65 + choices.indexOf(q.correct));
        const correctText = q.displayCorrectText || q.correct || '';
        answerKeyHtml += `<div class="mb-1">${questionNumber}. ${correctLetter} (${correctText})</div>`;
        questionNumber++;
    });

    if (tfRoman) {
        testHtml += `<p style="font-weight:600;margin-top:0.75rem;margin-bottom:0.5rem;">${tfRoman}. True or False. Shade A if the statement is True. Shade B if the statement is False.</p>`;
    }

    const tfs = questions.filter(q => q.type === 'true_false');
    tfs.forEach(q => {
        testHtml += `<p style="margin-bottom:0.35rem;padding-left:1.8em;text-indent:-1.8em;">${questionNumber}. ${q.question}</p>`;
        const correctLetter = q.displayCorrectLetter || (q.correct === 'True' ? 'A' : 'B');
        const correctText   = q.displayCorrectText || q.correct || '';
        answerKeyHtml += `<div class="mb-1">${questionNumber}. ${correctLetter} (${correctText})</div>`;
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
        const maxRows = Math.max(matching.length, answerWithLetters.length);
        
        for (let i = 0; i < maxRows; i++) {
            const premiseCell = i < matching.length
                ? `${questionNumber + i}. ${matching[i].question}` : '';
            const answerCell = i < answerWithLetters.length
                ? `${answerWithLetters[i].letter}. ${answerWithLetters[i].text}` : '';
            
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
            answerKeyHtml += `<div class="mb-1">${questionNumber + idx}. ${answerLetter} (${correctText})</div>`;
        });
        
        questionNumber += matching.length;
    }

    testHtml += '</div>';

    // ── Answer distribution stats ─────────────────────────────────────────
    const mcqAnswers = mcqs.map(q => q.displayCorrectLetter);
    const counts = { A: 0, B: 0, C: 0, D: 0, E: 0 };
    mcqAnswers.forEach(l => { if (counts[l] !== undefined) counts[l]++; });
    const hasE = counts.E > 0;
    let distHtml = `A: ${counts.A} | B: ${counts.B} | C: ${counts.C} | D: ${counts.D}`;
    if (hasE) distHtml += ` | E: ${counts.E}`;
    answerKeyHtml += `
        <div class="mt-6 p-4 bg-gray-100 rounded">
            <h4 class="font-semibold mb-2">Answer Distribution (MCQ only):</h4>
            <div class="text-sm">${distHtml}</div>
            <div class="text-xs text-gray-600 mt-1">Total MCQ: ${mcqAnswers.length} | Version: ${versionLabel}</div>
        </div>`;

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
    const toggleBtn = document.getElementById('toggleUnusedPreview');
    
    if (!lastUnusedQuestions || lastUnusedQuestions.length === 0) {
        summaryDiv.innerHTML = `
            <p class="text-sm text-green-600 font-semibold">✅ All questions from selected categories were used!</p>
        `;
        exportBtn.disabled = true;
        toggleBtn.disabled = true;
        return;
    }

    // Count by category and type
    const unusedByCategory = {};
    lastUnusedQuestions.forEach(q => {
        if (!unusedByCategory[q.category]) {
            unusedByCategory[q.category] = { mc: 0, tf: 0, total: 0 };
        }
        if (q.type === 'multiple_choice') unusedByCategory[q.category].mc++;
        if (q.type === 'true_false') unusedByCategory[q.category].tf++;
        unusedByCategory[q.category].total++;
    });

    // Build summary HTML
    let summaryHtml = `
        <h3 class="text-lg font-semibold mb-2 text-orange-700">Unused Questions: ${lastUnusedQuestions.length}</h3>
        <div class="text-sm">
            <p class="mb-2 text-gray-700">These questions were not selected for the current test:</p>
            <ul class="list-disc list-inside ml-4 space-y-1">
    `;

    Object.keys(unusedByCategory).forEach(cat => {
        const stats = unusedByCategory[cat];
        summaryHtml += `
            <li><strong>${cat}:</strong> ${stats.total} questions (MCQ: ${stats.mc}, T/F: ${stats.tf})</li>
        `;
    });

    summaryHtml += `
            </ul>
        </div>
    `;

    summaryDiv.innerHTML = summaryHtml;
    
    // Enable buttons
    exportBtn.disabled = false;
    toggleBtn.disabled = false;

    // Update preview
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

// Toggle unused questions preview visibility
function toggleUnusedPreview() {
    const previewDiv = document.getElementById('unusedPreview');
    if (previewDiv.classList.contains('hidden')) {
        previewDiv.classList.remove('hidden');
    } else {
        previewDiv.classList.add('hidden');
    }
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
            <li><strong>${cat}:</strong> ${stats.total} questions (MCQ: ${stats.mc}, T/F: ${stats.tf})</li>
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

    // Calculate totals
    let totalRequested = 0;
    let totalGenerated = 0;
    let totalShortfall = 0;
    let hasShortfall = false;

    Object.values(generationStats).forEach(stat => {
        totalRequested += stat.mcRequested + stat.tfRequested + stat.mtRequested;
        totalGenerated += stat.mcGenerated + stat.tfGenerated + stat.mtGenerated;
        totalShortfall += stat.mcShortfall + stat.tfShortfall + stat.mtShortfall;
        if (stat.mcShortfall > 0 || stat.tfShortfall > 0 || stat.mtShortfall > 0) {
            hasShortfall = true;
        }
    });

    // Build report HTML
    let reportHtml = `
        <div class="mb-4">
            <h3 class="text-lg font-semibold mb-2">Summary</h3>
            <div class="grid grid-cols-3 gap-4 text-center">
                <div class="p-3 bg-white rounded border">
                    <div class="text-2xl font-bold text-blue-600">${totalRequested}</div>
                    <div class="text-xs text-gray-600">Requested</div>
                </div>
                <div class="p-3 bg-white rounded border">
                    <div class="text-2xl font-bold text-green-600">${totalGenerated}</div>
                    <div class="text-xs text-gray-600">Generated</div>
                </div>
                <div class="p-3 bg-white rounded border">
                    <div class="text-2xl font-bold ${totalShortfall > 0 ? 'text-red-600' : 'text-gray-400'}">${totalShortfall}</div>
                    <div class="text-xs text-gray-600">Shortfall</div>
                </div>
            </div>
        </div>
    `;

    if (hasShortfall) {
        reportHtml += `
            <div class="mb-4 p-3 bg-red-50 border border-red-300 rounded">
                <h4 class="font-semibold text-red-800 mb-2">⚠️ Shortfall Detected</h4>
                <p class="text-sm text-red-700 mb-2">
                    Not enough questions available after exclusions. You need to manually select 
                    <strong>${totalShortfall} question(s)</strong> from your excluded bank to reach your target.
                </p>
                <p class="text-sm text-red-700">
                    Use the breakdown below to maintain category distribution.
                </p>
            </div>
        `;
    }

    // Detailed breakdown by category
    reportHtml += `
        <div class="mb-4">
            <h3 class="text-lg font-semibold mb-2">Breakdown by Category</h3>
            <div class="overflow-x-auto">
                <table class="min-w-full bg-white border border-gray-300 text-sm">
                    <thead class="bg-gray-100">
                        <tr>
                            <th class="px-4 py-2 border text-left">Category</th>
                            <th class="px-3 py-2 border text-center">Type</th>
                            <th class="px-3 py-2 border text-center">Requested</th>
                            <th class="px-3 py-2 border text-center">Available</th>
                            <th class="px-3 py-2 border text-center">Generated</th>
                            <th class="px-3 py-2 border text-center">Shortfall</th>
                        </tr>
                    </thead>
                    <tbody>
    `;

    Object.keys(generationStats).forEach(cat => {
        const stat = generationStats[cat];
        const hasMcq = stat.mcRequested > 0;
        const hasTf = stat.tfRequested > 0;
        const hasMt = stat.mtRequested > 0;
        const rowSpan = (hasMcq ? 1 : 0) + (hasTf ? 1 : 0) + (hasMt ? 1 : 0);

        if (hasMcq) {
            const mcShortfallClass = stat.mcShortfall > 0 ? 'text-red-600 font-bold' : 'text-gray-600';
            reportHtml += `
                <tr class="hover:bg-gray-50">
                    ${rowSpan > 0 ? `<td class="px-4 py-2 border font-medium" rowspan="${rowSpan}">${cat}</td>` : ''}
                    <td class="px-3 py-2 border text-center">MCQ</td>
                    <td class="px-3 py-2 border text-center">${stat.mcRequested}</td>
                    <td class="px-3 py-2 border text-center">${stat.mcAvailable}</td>
                    <td class="px-3 py-2 border text-center">${stat.mcGenerated}</td>
                    <td class="px-3 py-2 border text-center ${mcShortfallClass}">${stat.mcShortfall > 0 ? stat.mcShortfall : '—'}</td>
                </tr>
            `;
        }

        if (hasTf) {
            const tfShortfallClass = stat.tfShortfall > 0 ? 'text-red-600 font-bold' : 'text-gray-600';
            reportHtml += `
                <tr class="hover:bg-gray-50">
                    ${!hasMcq && rowSpan > 0 ? `<td class="px-4 py-2 border font-medium" rowspan="${rowSpan}">${cat}</td>` : ''}
                    <td class="px-3 py-2 border text-center">T/F</td>
                    <td class="px-3 py-2 border text-center">${stat.tfRequested}</td>
                    <td class="px-3 py-2 border text-center">${stat.tfAvailable}</td>
                    <td class="px-3 py-2 border text-center">${stat.tfGenerated}</td>
                    <td class="px-3 py-2 border text-center ${tfShortfallClass}">${stat.tfShortfall > 0 ? stat.tfShortfall : '—'}</td>
                </tr>
            `;
        }

        if (hasMt) {
            const mtShortfallClass = stat.mtShortfall > 0 ? 'text-red-600 font-bold' : 'text-gray-600';
            reportHtml += `
                <tr class="hover:bg-gray-50">
                    ${!hasMcq && !hasTf && rowSpan > 0 ? `<td class="px-4 py-2 border font-medium" rowspan="${rowSpan}">${cat}</td>` : ''}
                    <td class="px-3 py-2 border text-center">Matching</td>
                    <td class="px-3 py-2 border text-center">${stat.mtRequested}</td>
                    <td class="px-3 py-2 border text-center">${stat.mtAvailable}</td>
                    <td class="px-3 py-2 border text-center">${stat.mtGenerated}</td>
                    <td class="px-3 py-2 border text-center ${mtShortfallClass}">${stat.mtShortfall > 0 ? stat.mtShortfall : '—'}</td>
                </tr>
            `;
        }

        // If nothing was requested, still show (with 0s)
        if (!hasMcq && !hasTf && !hasMt) {
            reportHtml += `
                <tr class="hover:bg-gray-50">
                    <td class="px-4 py-2 border font-medium">${cat}</td>
                    <td class="px-3 py-2 border text-center">—</td>
                    <td class="px-3 py-2 border text-center">0</td>
                    <td class="px-3 py-2 border text-center">${stat.mcAvailable + stat.tfAvailable + stat.mtAvailable}</td>
                    <td class="px-3 py-2 border text-center">0</td>
                    <td class="px-3 py-2 border text-center">—</td>
                </tr>
            `;
        }
    });

    reportHtml += `
                    </tbody>
                </table>
            </div>
        </div>
    `;

    // Instructions for handling shortfall
    if (hasShortfall) {
        reportHtml += `
            <div class="p-3 bg-yellow-50 border border-yellow-300 rounded">
                <h4 class="font-semibold text-yellow-800 mb-2">📋 How to Complete Your Test:</h4>
                <ol class="list-decimal list-inside text-sm text-gray-700 space-y-1 ml-2">
                    <li>Export your current test (${totalGenerated} questions)</li>
                    <li>Open your excluded questions file</li>
                    <li>Manually select <strong>${totalShortfall} question(s)</strong> following the shortfall breakdown above</li>
                    <li>Add them to your exported test file</li>
                    <li>Or use Manage a Bank to combine them</li>
                </ol>
            </div>
        `;
    }

    reportDiv.innerHTML = reportHtml;

    // Difficulty Breakdown section
    const ratio = getDiffRatio();
    if (isDiffRatioActive(ratio)) {
        const tiers = ['unset','easy','medium','hard'];
        const tierLabel = { unset:'⚪ Unset', easy:'🟢 Easy', medium:'🟡 Medium', hard:'🔴 Hard' };

        let hasDiffShortfall = false;
        let diffHtml = `
            <div class="mt-4">
                <h3 class="text-lg font-semibold mb-2">Difficulty Breakdown</h3>
                <div class="overflow-x-auto">
                    <table class="min-w-full bg-white border border-gray-300 text-sm">
                        <thead class="bg-gray-100">
                            <tr>
                                <th class="px-4 py-2 border text-left">Category</th>
                                <th class="px-3 py-2 border text-center">Type</th>
                                <th class="px-3 py-2 border text-center">Difficulty</th>
                                <th class="px-3 py-2 border text-center">Requested</th>
                                <th class="px-3 py-2 border text-center">From Tier</th>
                                <th class="px-3 py-2 border text-center">From Unset</th>
                                <th class="px-3 py-2 border text-center">Shortfall</th>
                            </tr>
                        </thead>
                        <tbody>
        `;

        Object.keys(generationStats).forEach(cat => {
            const stat = generationStats[cat];
            const typeMap = [
                { key: 'mc', label: 'MCQ',      stats: stat.mcDiffStats },
                { key: 'tf', label: 'T/F',      stats: stat.tfDiffStats },
                { key: 'mt', label: 'Matching', stats: stat.mtDiffStats },
            ].filter(t => t.stats !== null && t.stats !== undefined);

            if (typeMap.length === 0) return;

            let firstRow = true;
            const totalRows = typeMap.reduce((s, t) => s + Object.keys(t.stats).length, 0);

            typeMap.forEach(({ label, stats }) => {
                let firstType = true;
                const typeRows = Object.keys(stats).length;
                tiers.forEach(tier => {
                    if (!stats[tier]) return;
                    const s = stats[tier];
                    if (s.requested === 0) return;
                    const sfClass = s.shortfall > 0 ? 'text-red-600 font-bold' : 'text-gray-600';
                    if (s.shortfall > 0) hasDiffShortfall = true;
                    diffHtml += `<tr class="hover:bg-gray-50">
                        ${firstRow ? `<td class="px-4 py-2 border font-medium" rowspan="${totalRows}">${cat}</td>` : ''}
                        ${firstType ? `<td class="px-3 py-2 border text-center" rowspan="${typeRows}">${label}</td>` : ''}
                        <td class="px-3 py-2 border text-center">${tierLabel[tier]}</td>
                        <td class="px-3 py-2 border text-center">${s.requested}</td>
                        <td class="px-3 py-2 border text-center">${s.fromTier}</td>
                        <td class="px-3 py-2 border text-center">${s.fromUnset > 0 ? s.fromUnset : '—'}</td>
                        <td class="px-3 py-2 border text-center ${sfClass}">${s.shortfall > 0 ? s.shortfall : '—'}</td>
                    </tr>`;
                    firstRow = false;
                    firstType = false;
                });
            });
        });

        diffHtml += `</tbody></table></div>`;

        if (hasDiffShortfall) {
            diffHtml += `
                <div class="mt-3 p-3 bg-red-50 border border-red-300 rounded">
                    <h4 class="font-semibold text-red-800 mb-1">⚠️ Difficulty Shortfall</h4>
                    <p class="text-sm text-red-700">Some difficulty tiers ran short. Unset questions were used where available. Remaining shortfalls could not be filled — consider adjusting the ratio or adding more questions of the needed difficulty.</p>
                </div>`;
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
    lastDeletedBank = { type: 'categoryInputs', data: snapshot };
    if (undoTimeoutId) clearTimeout(undoTimeoutId);
    undoTimeoutId = setTimeout(() => { lastDeletedBank = null; }, 5000);

    inputs.forEach(input => {
        input.value = '0';
        input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    const summaryEl = document.getElementById('testSummary');
    if (summaryEl) summaryEl.textContent = `Total questions to generate: 0`;

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
        showToast('⚠️ Balanced pick applied with shortfalls. See report below.', 'warning');
    } else {
        showToast(`✅ Balanced pick applied across ${categories.length} categories.`, 'success');
    }
}

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
    const TWO_COL_LIMIT = 55;
    const HALF_W        = Math.round((PAGE_W - MARGIN * 2) / 2);
    const Q_LEFT        = Math.round(0.25 * TWIP);
    const Q_HANG        = Math.round(0.25 * TWIP);
    const CH_LEFT       = Math.round(0.25 * TWIP);

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

    // ── Choice builder ────────────────────────────────────────────────────
    function buildChoiceParas(choices) {
        const texts   = choices.map(c => String(c ?? '').trim());
        const longest = Math.max(0, ...texts.map(t => t.length));

        // 1-col layout
        if (longest > TWO_COL_LIMIT || choices.length > 5 || document.getElementById('forceSingleCol')?.checked) {
            return texts.map((t, i) => new Paragraph({
                children: [run(String.fromCharCode(65 + (i % 5)) + '. ' + t)],
                indent:   { left: CH_LEFT },
                spacing:  sp,
                keepNext: i < texts.length - 1
            }));
        }

        // 2-col layout
        const rows   = Math.ceil(texts.length / 2);
        const result = [];

        for (let row = 0; row < rows; row++) {
            const li = row;
            const ri = row + rows;

            const ll = String.fromCharCode(65 + (li % 5));
            const lt = texts[li];
            const hasRight = ri < texts.length;
            const rl = hasRight ? String.fromCharCode(65 + (ri % 5)) : null;
            const rt = hasRight ? texts[ri] : null;

            const children = [run(ll + '. ' + lt)];
            if (hasRight) {
                children.push(new TextRun({ text: '\t', font: FONT, size: FONT_SIZE }));
                children.push(run(rl + '. ' + rt));
            }

            const isLast = row === rows - 1;

            result.push(new Paragraph({
                children,
                indent:   { left: CH_LEFT },
                spacing:  sp,
                keepNext: !isLast,
                tabStops: [{ type: 'left', position: HALF_W }]
            }));
        }

        return result;
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

    const noBorders = {
        top:    { style: BorderStyle.NONE, size: 0 },
        bottom: { style: BorderStyle.NONE, size: 0 },
        left:   { style: BorderStyle.NONE, size: 0 },
        right:  { style: BorderStyle.NONE, size: 0 },
    };

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

// ========================================
// TXT/JSON CONVERSION
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
    const hasDifficulty = headers.length === 9 && headers[3]?.toLowerCase() === 'difficulty';
    const expectedCols = hasDifficulty ? 9 : 8;

    if (headers.length !== expectedCols || headers[0] !== "Question") {
        throw new Error("Invalid format. Ensure the first row contains: Question, Category, Type, [Difficulty,] Correct, Option 1, Option 2, Option 3, Option 4");
    }

    const questions = [];

    for (let i = 1; i < rows.length; i++) {
        const values = rows[i];
        if (values.length !== expectedCols) {
            throw new Error(`Invalid row format at line ${i + 1}. Each row must have ${expectedCols} columns.`);
        }

        let question, category, type, difficulty, correct, option1, option2, option3, option4;
        if (hasDifficulty) {
            [question, category, type, difficulty, correct, option1, option2, option3, option4] = values;
        } else {
            [question, category, type, correct, option1, option2, option3, option4] = values;
            difficulty = 'unset';
        }

        // Build choices array, converting "null" strings to null
        let choices = [option1, option2, option3, option4].map(opt => {
            const trimmed = opt.trim();
            return trimmed === 'null' ? null : trimmed;
        });
        // Filter out null values for MCQ display
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
    let csv = 'Question,Category,Type,Difficulty,Correct,Option 1,Option 2,Option 3,Option 4\n';
    jsonData.forEach(item => {
        let choices = item.choices || [];
        if (item.type === 'true_false' || item.type === 'matching') {
            while (choices.length < 4) choices.push('null');
        } else {
            while (choices.length < 4) choices.push('');
        }
        const difficulty = item.difficulty || 'unset';
        const row = [item.question || '', item.category || '', item.type || '', difficulty, item.correct || '', choices[0], choices[1], choices[2], choices[3]];
        csv += row.map(csvEscape).join(',') + '\n';
    });
    return csv;
}

// ========================================
// BULK Q TO JSON CONVERTER
// ========================================

// Convert bulk questions to JSON
function convertBulkToJSON() {
    const text = document.getElementById('bulkInput').value.trim();
    const category = document.getElementById('bulkCategory').value.trim();

    if (!text) {
        showToast('⚠️ Please paste some questions first.', 'warning');
        return;
    }

    if (!category) {
        showToast('⚠️ Please enter a category.', 'warning');
        return;
    }

    function cleanText(str) {
        return str
            .replace(/\n(?!\d+[.)]\s|[a-e][.)]\s|=?\s*(true|false)\s*$)/gi, ' ')
            .replace(/\s{2,}/g, ' ')
            .trim();
    }

    const blocks = text.split(/\n(?=\d+[.)]\s)/).map(b => b.trim()).filter(b => b);

    bulkResults = [];
    let hasErrors = false;

    try {
    blocks.forEach((block, blockIdx) => {
        const lines = block.split('\n');
        if (!lines || lines.length === 0) {
            hasErrors = true;
            return;
        }

        // Check for T/F format
        const tfLineIndex = lines.findIndex(line => line.trim().match(/^=?\s*(true|false)\s*$/i));

        if (tfLineIndex !== -1) {
            const tfQuestionLines = [];
            for (let i = 0; i < tfLineIndex; i++) {
                const line = lines[i].trim();
                tfQuestionLines.push(line.replace(/^\d+[.)]\s*/, ""));
            }
            const tfQuestion = cleanText(tfQuestionLines.join('\n'));

            const tfMatch = lines[tfLineIndex].trim().match(/^=?\s*(true|false)\s*$/i);
            const tfWord = tfMatch[1].toLowerCase();
            const tfCorrect = tfWord === 'true' ? 'True' : 'False';

            bulkResults.push({
                question: tfQuestion,
                category: category,
                type: "true_false",
                correct: tfCorrect,
                choices: [null, null, null, null]
            });
            return;
        }

        // Check for matching format: premise on one line, =answer or *answer on next
        // BUT exclude MCQ format (=a., =b., etc.)
        const matchingLineIndex = lines.findIndex((line, idx) => {
            if (idx === 0) return false; // Skip the question number line
            const trimmed = line.trim();
            // Match =text or *text, BUT NOT =a., =b., etc. (MCQ format)
            return trimmed.match(/^[=*]\s*(.+)$/) && !trimmed.match(/^[=*]\s*[a-e][.)]\s/i);
        });

        if (matchingLineIndex !== -1) {
            // This is a matching question
            const questionLines = [];
            for (let i = 0; i < matchingLineIndex; i++) {
                const line = lines[i].trim();
                questionLines.push(line.replace(/^\d+[.)]\s*/, ""));
            }
            const premise = cleanText(questionLines.join('\n'));

            const answerMatch = lines[matchingLineIndex].trim().match(/^[=*]\s*(.+)$/);
            const answer = answerMatch ? answerMatch[1].trim() : '';

            bulkResults.push({
                question: premise,
                category: category,
                type: "matching",
                correct: answer,
                choices: [null, null, null, null]
            });
            return;
        }

        let question = '';
        let choices = [];
        let correct = "";

        let questionLines = [];
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line.match(/^[*=]?[a-e][.)]\s+/i)) {
                break;
            } else {
                questionLines.push(line.replace(/^\d+[.)]\s*/, ""));
            }
        }

        question = cleanText(questionLines.join('\n'));

        const firstChoiceIdx = lines.findIndex(line => line.trim().match(/^[*=]?[a-e][.)]\s+/i));
        for (let i = firstChoiceIdx; i !== -1 && i < lines.length; i++) {
            const line = lines[i].trim();
            const match = line.match(/^([*=]?)([a-e])[.)]\s+(.*)$/i);
            if (match) {
                let isCorrect = match[1] === "*" || match[1] === "=";
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

        if (!question || choices.length === 0) {
            hasErrors = true;
            return;
        }

        // Detect question type: if exactly 4 lettered choices with periods, it's MCQ; otherwise matching
        const isMultipleChoice = choices.length === 4;
        const questionType = isMultipleChoice ? "multiple_choice" : "matching";

        bulkResults.push({
            question: question,
            category: category,
            type: questionType,
            correct: correct,
            choices: isMultipleChoice ? choices : [null, null, null, null]
        });
    });
    } catch (err) {
        showToast('⚠️ Invalid format', 'error');
        return;
    }

    if (hasErrors && bulkResults.length > 0) {
        showToast('⚠️ Some questions had formatting issues and were skipped.', 'warning');
    }
    if (bulkResults.length === 0) {
        showToast('❌ No valid questions found. Please check the format.', 'error');
        return;
    }
    const bulkOutputEl = document.getElementById('bulkOutput');
    const jsonStr = JSON.stringify(bulkResults, null, 2);
    bulkOutputEl.textContent = jsonStr;
    if (window.Prism) {
        Prism.highlightElement(bulkOutputEl);
    }
    renderMissingCorrectWarning('bulkMissingCorrectWarning', bulkResults);
    showToast('✅ Conversion complete', 'success');
    console.log('Bulk conversion complete:', bulkResults);
}

// Download bulk converted JSON
function downloadBulkJSON() {
    if (bulkResults.length === 0) {
        showToast("⚠️ Please convert questions first.", "warning");
        return;
    }

    const filenameInput = document.getElementById('bulkFilename');
    const custom = filenameInput ? filenameInput.value.trim() : '';
    let filename;
    if (custom) {
        filename = custom.endsWith('.json') ? custom : `${custom}.json`;
    } else {
        const subject = document.getElementById('bulkSubject').value.trim() || "quiz";
        const category = document.getElementById('bulkCategory').value.trim() || "general";
        filename = `${subject}_${category}.json`;
    }

    const blob = new Blob([JSON.stringify(bulkResults, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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
                    count: data.length
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
function updateMergerDisplay() {
    const summaryDiv = document.getElementById('mergerSummary');
    const outputPre = document.getElementById('mergerOutput');

    if (mergedQuestions.length === 0) {
        summaryDiv.innerHTML = `
            <h3 class="text-lg font-semibold mb-2">Summary:</h3>
            <p class="text-sm text-gray-600">No files loaded yet. Click "Add Files" to start.</p>
        `;
        outputPre.textContent = '';
        renderMissingCorrectWarning('mergerMissingCorrectWarning', []);
        return;
    }

    let summaryHtml = `
        <h3 class="text-lg font-semibold mb-2">Summary:</h3>
        <div class="text-sm">
            <p class="font-semibold text-green-700 mb-2">Total Questions: ${mergedQuestions.length}</p>
            <p class="font-semibold mb-1">Files Loaded:</p>
            <ul class="list-disc list-inside ml-4">
    `;

    mergerFileStats.forEach(stat => {
        summaryHtml += `<li>${stat.name}: ${stat.count} questions</li>`;
    });

    summaryHtml += `
            </ul>
        </div>
    `;

    summaryDiv.innerHTML = summaryHtml;
    renderMissingCorrectWarning('mergerMissingCorrectWarning', mergedQuestions);

    const preview = mergedQuestions.slice(0, 50);
    let previewText = JSON.stringify(preview, null, 2);
    
    if (mergedQuestions.length > 50) {
        previewText += `\n\n... and ${mergedQuestions.length - 50} more questions`;
    }

    outputPre.textContent = previewText;
    if (window.Prism) {
        Prism.highlightElement(outputPre);
    }
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

function convertToGift() {
    const isJson = !document.getElementById('giftJsonPanel').classList.contains('hidden');
    let questions = [];

    if (isJson) {
        const raw = document.getElementById('giftJsonInput').value.trim();
        if (!raw) { showToast('⚠️ Please paste some JSON first.', 'warning'); return; }
        try {
            questions = JSON.parse(raw);
            if (!Array.isArray(questions)) throw new Error('Not an array');
        } catch (e) {
            showToast('❌ Invalid JSON. Please check the format.', 'error');
            return;
        }
    } else {
        const text     = document.getElementById('giftPlainInput').value.trim();
        const subject  = document.getElementById('giftPlainSubject').value.trim();
        const category = document.getElementById('giftPlainCategory').value.trim();
        if (!text) { showToast('⚠️ Please paste some questions first.', 'warning'); return; }
        if (!category) { showToast('⚠️ Please enter a category.', 'warning'); return; }

        function cleanText(str) {
            return str
                .replace(/\n(?!\d+[.)]\s|[a-e][.)]\s|=?\s*(true|false)\s*$)/gi, ' ')
                .replace(/\s{2,}/g, ' ')
                .trim();
        }

        const blocks = text.split(/\n(?=\d+[.)]\s)/).map(b => b.trim()).filter(b => b);
        blocks.forEach(block => {
            const lines = block.split('\n');
            const tfLineIndex = lines.findIndex(line => line.trim().match(/^=?\s*(true|false)\s*$/i));

            if (tfLineIndex !== -1) {
                const tfQuestionLines = [];
                for (let i = 0; i < tfLineIndex; i++) {
                    tfQuestionLines.push(lines[i].trim().replace(/^\d+[.)]\s*/, ''));
                }
                const tfQuestion = cleanText(tfQuestionLines.join('\n'));
                const tfMatch    = lines[tfLineIndex].trim().match(/^=?\s*(true|false)\s*$/i);
                const tfCorrect  = tfMatch[1].toLowerCase() === 'true' ? 'True' : 'False';
                questions.push({ subject, question: tfQuestion, category, type: 'true_false', correct: tfCorrect });
                return;
            }

            // Check for matching type format: "=word" on a line by itself (no letter prefix)
            const matchingLineIndex = lines.findIndex((line, idx) => {
                if (idx === 0) return false;
                const trimmed = line.trim();
                return trimmed.match(/^=\s*\S.*$/) && !trimmed.match(/^=\s*[a-e][.)]\s+/i);
            });

            if (matchingLineIndex !== -1) {
                const matchingQuestionLines = [];
                for (let i = 0; i < matchingLineIndex; i++) {
                    matchingQuestionLines.push(lines[i].trim().replace(/^\d+[.)]\s*/, ''));
                }
                const matchingQuestion = cleanText(matchingQuestionLines.join('\n'));
                const matchingAnswer = lines[matchingLineIndex].trim().replace(/^=\s*/, '').trim();
                questions.push({ subject, question: matchingQuestion, category, type: 'matching', correct: matchingAnswer, choices: [null, null, null, null] });
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

            for (let i = lines.findIndex(l => l && l.trim().match(/^[*=]?[a-e][.)]\s+/i)); i < lines.length; i++) {
                if (!lines[i]) continue;
                const match = lines[i].trim().match(/^([*=]?)([a-e])[.)]\s+(.*)$/i);
                if (match) {
                    const isCorrect = match[1] === '*' || match[1] === '=';
                    let choiceText  = match[3].trim();
                    let j = i + 1;
                    while (j < lines.length && lines[j] && !lines[j].trim().match(/^[*=]?[a-e][.)]\s+/i)) {
                        choiceText += ' ' + lines[j].trim();
                        j++;
                    }
                    i = j - 1;
                    choiceText = cleanText(choiceText);
                    if (isCorrect) correct = choiceText;
                    choices.push(choiceText);
                }
            }
            questions.push({ subject, question, category, type: 'multiple_choice', correct, choices });
        });
    }

    if (questions.length === 0) { showToast('⚠️ No questions found.', 'warning'); return; }

    renderMissingCorrectWarning('giftMissingCorrectWarning', questions);
    giftResults = questionsToGift(questions);
    const giftOutputEl = document.getElementById('giftOutput');
    giftOutputEl.textContent = giftResults;
    if (window.Prism) {
        Prism.highlightElement(giftOutputEl);
    }
}

// ========================================
// HELPER FUNCTIONS
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
        return `"${truncated}"`;
    }).join(', ');
    const more = missing.length > 5 ? ` and ${missing.length - 5} more` : '';

    container.classList.remove('hidden');
    container.innerHTML = `⚠️ ${missing.length} of ${(questions || []).length} question(s) have no correct answer marked: ${preview}${more}.`;
}