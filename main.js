/*
 * Test Generator & Question Manager
 * Copyright (C) 2026 [Your Name]
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
// GLOBAL VARIABLES
// ========================================

let testBank = [];
let questionBank = [];
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

// ========================================
// MAIN INITIALIZATION
// ========================================

document.addEventListener('DOMContentLoaded', function () {
    console.log('🔧 Initializing Coeus...');

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
        'questionManagerTab':  'questionManagerContent',
        'testGeneratorTab':    'testGeneratorContent',
        'txtToJsonTab':        'txtToJsonContent',
        'jsonToTxtTab':        'jsonToTxtContent',
        'bulkQ2JsonTab':       'bulkQ2JsonContent',
        'textToGiftTab':       'textToGiftContent',
        'jsonMergerTab':       'jsonMergerContent'
    };

    // ── Setup tab switching ────────────────────────────────────
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

    // ── Info button & popover setup ────────────────────────────
    document.querySelectorAll('.info-btn').forEach(btn => {
        btn.addEventListener('click', e => {
            e.stopPropagation();
            const popover = btn.nextElementSibling;
            document.querySelectorAll('.info-popover').forEach(p => {
                if (p !== popover) p.classList.add('hidden');
            });
            popover.classList.toggle('hidden');
        });
    });
    document.addEventListener('click', () => {
        document.querySelectorAll('.info-popover').forEach(p => p.classList.add('hidden'));
    });

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
    const exportPdfButton = document.getElementById('exportPdf');
    const exportDocxButton = document.getElementById('exportDocx');
    const questionForm = document.getElementById('questionForm');
    const typeSelect = document.getElementById('type');
    const choicesSection = document.getElementById('choicesSection');
    const trueFalseSection = document.getElementById('trueFalseSection');
    const exportJsonButton = document.getElementById('exportJson');

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
        if (exportPdfButton) exportPdfButton.addEventListener('click', () => exportTestAsPdf());
        if (exportDocxButton) exportDocxButton.addEventListener('click', () => exportTestAsDocx());
        if (exportJsonButton) exportJsonButton.addEventListener('click', () => exportTestAsJson());
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
                    let txtData = 'Question\tCategory\tType\tCorrect\tOption 1\tOption 2\tOption 3\tOption 4\n';
                    jsonData.forEach(item => {
                        let choices = item.choices || [];
                        // For T/F questions, pad with null instead of empty strings
                        if (item.type === 'true_false' || item.type === 'matching') {
                            while (choices.length < 4) choices.push('null');
                        } else {
                            while (choices.length < 4) choices.push('');
                        }
                        txtData += `${item.question||''}\t${item.category||''}\t${item.type||''}\t${item.correct||''}\t${choices[0]}\t${choices[1]}\t${choices[2]}\t${choices[3]}\n`;
                    });
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
                const blob = new Blob([lastConvertedTxt], { type: 'text/plain' });
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = customFilename + '.txt';
                link.click();
                URL.revokeObjectURL(link.href);
                showToast('✅ TXT downloaded', 'success');
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
                showToast('🔄 Cleared', 'success');
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
                showToast('🔄 Cleared', 'success');
            });
        }
        
        if (downloadTxtBtn) {
            downloadTxtBtn.addEventListener('click', () => {
                if (!giftResults) {
                    showToast('⚠️ Please convert first.', 'warning');
                    return;
                }
                const filenameInput = document.getElementById('giftFilename');
                const filename = (filenameInput?.value.trim() || 'questions') + '.gift.txt';
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
                showToast('🔄 Cleared', 'success');
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
                        const json = convertTabDelimitedTxtToJson(text);
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
                showToast('🔄 Cleared', 'success');
            });
        }
    }

    // ── Merger buttons ────────────────────────────────────────
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
    }

    // ── Initialize all drop zones ──────────────────────────────
    const dropZones = [
        { dropZone: document.querySelector('#questionManagerContent .drop-zone'), fileInput: document.getElementById('loadQuestionBank') },
        { dropZone: document.querySelector('#testGeneratorContent .drop-zone'), fileInput: document.getElementById('loadTestBank') },
        { dropZone: document.querySelector('#txtToJsonContent .drop-zone'), fileInput: document.getElementById('txtFileInput') },
        { dropZone: document.querySelector('#jsonToTxtContent .drop-zone'), fileInput: document.getElementById('jsonFileInput') },
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
    setupJsonToTxtConversion();
    setupGiftConverter();
    setupBulkConverter();
    setupTxtToJsonConverter();
    setupMerger();
    setupUnusedQuestions();
    setupExclusions();
    setupCategoryButtons();
    setupTxtToJsonJumpButtons();
    setupBulkJumpButtons();
    setupGiftJumpButtons();
    
    // Initialize Question Manager
    initializeQuestionManager();
    
    // Initialize export dropdown
    initializeExportDropdown();
    
    // Setup export as plain text with filename
    const exportPlainTextBtn = document.getElementById('exportQuestionBankPlainText');
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

    // Clear Saved Bank buttons
    const clearBankBtn = document.getElementById('clearQuestionBank');
    if (clearBankBtn) {
        clearBankBtn.addEventListener('click', () => {
            if (questionBank.length === 0) {
                showToast('⚠️ Nothing to clear', 'warning');
                return;
            }
            lastDeletedBank = {
                type: 'questionBank',
                data: [...questionBank]
            };
            questionBank = [];
            localStorage.removeItem('coeus-question-bank');
            clearQuestionManagerState();
            if (undoTimeoutId) clearTimeout(undoTimeoutId);
            undoTimeoutId = setTimeout(() => { lastDeletedBank = null; }, 5000);
            const undoHtml = '<span>⚠️ Cleared question bank. <button onclick="undoClear()" style="background:#fff;color:#333;padding:4px 8px;border-radius:4px;cursor:pointer;margin-left:8px;border:1px solid #ccc;">Undo</button></span>';
            showToast(undoHtml, 'warning', 5000);
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
            const undoHtml = '<span>⚠️ Cleared test bank. <button onclick="undoClear()" style="background:#fff;color:#333;padding:4px 8px;border-radius:4px;cursor:pointer;margin-left:8px;border:1px solid #ccc;">Undo</button></span>';
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
            updateCategoryInputs();
            renderSidebarQuestions();
        });
    }

    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'z' && lastDeletedBank) {
            e.preventDefault();
            undoClear();
        }
    });

    // Default: show Test Generator tab
    const testGenTab = document.getElementById('testGeneratorTab');
    if (testGenTab) testGenTab.click();

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
            const isSelected = questionManagerState.selectedQuestions.has(JSON.stringify(q));
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
                    <div class="q-card ${isSelected ? 'ring-2 ring-blue-500' : ''}" style="cursor: pointer; margin-left: 12px;">
                        <div class="flex items-start gap-2">
                            <input type="checkbox" class="qm-checkbox mt-1" data-question="${JSON.stringify(q).replace(/"/g, '&quot;')}" ${isSelected ? 'checked' : ''} style="cursor: pointer;">
                            <div class="flex-1 min-w-0">
                                <div class="flex items-center gap-2 mb-1 flex-wrap">
                                    <span class="text-xs px-2 py-0.5 rounded" style="background-color: ${typeColor}40; color: ${typeColor}; font-weight: 600;">${typeLabel}</span>
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
                    <div class="q-card border-2 border-blue-500 p-4 bg-blue-50" style="margin-left: 12px;">
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
            
            // Store state
            if (!questionManagerState.collapsedCategories) {
                questionManagerState.collapsedCategories = {};
            }
            questionManagerState.collapsedCategories[category] = isHidden;
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
            const allSelected = categoryQuestions.every(q => questionManagerState.selectedQuestions.has(JSON.stringify(q)));

            if (allSelected) {
                categoryQuestions.forEach(q => {
                    questionManagerState.selectedQuestions.delete(JSON.stringify(q));
                });
                showToast(`❌ Deselected ${categoryQuestions.length} question(s)`, 'success');
            } else {
                categoryQuestions.forEach(q => {
                    questionManagerState.selectedQuestions.add(JSON.stringify(q));
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
        } else {
            filtered = filtered.filter(q => q.category === questionManagerState.filterBy);
        }
    }

    if (filtered.length === 0) {
        showToast('⚠️ No questions match current filters.', 'warning');
        return;
    }

    // Step 3: Check if all visible questions are already selected
    const allSelected = filtered.every(q => questionManagerState.selectedQuestions.has(JSON.stringify(q)));

    // Step 4: Select or deselect all visible questions
    if (allSelected) {
        // Deselect all visible questions
        filtered.forEach(q => {
            questionManagerState.selectedQuestions.delete(JSON.stringify(q));
        });
        showToast(`❌ Deselected ${filtered.length} question(s)`, 'success');
    } else {
        // Select all visible questions
        filtered.forEach(q => {
            questionManagerState.selectedQuestions.add(JSON.stringify(q));
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
            const questionJson = e.target.dataset.question;
            const question = JSON.parse(questionJson);
            const questionStr = JSON.stringify(question);
            if (e.target.checked) {
                questionManagerState.selectedQuestions.add(questionStr);
            } else {
                questionManagerState.selectedQuestions.delete(questionStr);
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
}

function deleteSelectedQuestions() {
    if (questionManagerState.selectedQuestions.size === 0) {
        showToast('⚠️ No questions selected.', 'warning');
        return;
    }

    const count = questionManagerState.selectedQuestions.size;
    if (!confirm(`Delete ${count} question(s)? This cannot be undone.`)) {
        return;
    }

    // Convert selected question strings back to objects
    const questionsToDelete = Array.from(questionManagerState.selectedQuestions).map(qStr => JSON.parse(qStr));
    
    // Remove them from questionBank
    const newBank = questionBank.filter(q => !questionsToDelete.some(del => JSON.stringify(del) === JSON.stringify(q)));

    questionBank = newBank;
    saveQBankToStorage();
    questionManagerState.selectedQuestions.clear();
    renderQuestionManagerList();
    updateDeleteButtonState();
    showToast(`✅ Deleted ${count} question(s)`, 'success');
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

    // Convert selected question strings back to objects and update them
    const selectedQuestions = Array.from(questionManagerState.selectedQuestions).map(qStr => JSON.parse(qStr));
    
    selectedQuestions.forEach(selectedQ => {
        const q = questionBank.find(bankQ => JSON.stringify(bankQ) === JSON.stringify(selectedQ));
        if (q) {
            q.category = newCat;
        }
    });

    saveQBankToStorage();
    questionManagerState.selectedQuestions.clear();
    renderQuestionManagerList();
    showToast(`✅ Changed category to "${newCat}" for ${selectedQuestions.length} question(s)`, 'success');
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

    // Inner tabs for Question Manager
    document.querySelectorAll('.qm-inner-tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const tabName = e.target.dataset.qmTab;
            
            // Hide all inner content
            document.querySelectorAll('.qm-inner-content').forEach(content => {
                content.classList.remove('active');
            });
            
            // Show selected tab
            document.getElementById(`qm-${tabName}`).classList.add('active');
            
            // Update button styling
            document.querySelectorAll('.qm-inner-tab-btn').forEach(b => {
                b.classList.remove('active');
            });
            e.target.classList.add('active');
            
            // Re-render question list if switching to bank-editor tab
            if (tabName === 'bank-editor') {
                renderQuestionManagerList();
            }
        });
    });
	
    // Inner tabs for Question Manager
    document.querySelectorAll('.qm-inner-tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const tabName = e.target.dataset.qmTab;
            
            // Hide all inner content
            document.querySelectorAll('.qm-inner-content').forEach(content => {
                content.classList.remove('active');
            });
            
            // Show selected tab
            document.getElementById(`qm-${tabName}`).classList.add('active');
            
            // Update button styling
            document.querySelectorAll('.qm-inner-tab-btn').forEach(b => {
                b.classList.remove('active');
            });
            e.target.classList.add('active');
            
            // Re-render question list if switching to bank-editor tab
            if (tabName === 'bank-editor') {
                renderQuestionManagerList();
            }
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
    const exportTxtBtn = document.getElementById('exportQuestionsTxtBtn');
    const exportPlainBtn = document.getElementById('exportQuestionsPlainBtn');

    if (exportJsonBtn) {
        exportJsonBtn.addEventListener('click', () => {
            exportQuestionsAsJson();
        });
    }

    if (exportTxtBtn) {
        exportTxtBtn.addEventListener('click', () => {
            exportQuestionsAsTxt();
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

// Export as tab-delimited TXT
function exportQuestionsAsTxt() {
    if (questionBank.length === 0) {
        showToast('⚠️ No questions to export.', 'warning');
        return;
    }
    let txtData = 'Question\tCategory\tType\tCorrect\tOption 1\tOption 2\tOption 3\tOption 4\n';
    questionBank.forEach(q => {
        const choices = q.choices || [];
        while (choices.length < 4) choices.push('');
        txtData += `${q.question || ''}\t${q.category || ''}\t${q.type || ''}\t${q.correct || ''}\t${choices[0]}\t${choices[1]}\t${choices[2]}\t${choices[3]}\n`;
    });
    const fileName = (document.getElementById('questionBankFilename')?.value.trim() || 'questionBank') + '.txt';
    const blob = new Blob([txtData], { type: 'text/plain' });
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

    let plainText = `QUESTION BANK EXPORT\n`;
    plainText += `Generated: ${new Date().toLocaleString()}\n`;
    plainText += `Total Questions: ${questionBank.length}\n`;
    plainText += `${'='.repeat(80)}\n\n`;

    // Group by category
    const grouped = {};
    questionBank.forEach(q => {
        const cat = q.category || 'Uncategorized';
        if (!grouped[cat]) grouped[cat] = [];
        grouped[cat].push(q);
    });

    Object.keys(grouped).sort().forEach(category => {
        plainText += `\n## ${category}\n`;
        plainText += `${'-'.repeat(40)}\n\n`;

        grouped[category].forEach((q, idx) => {
            const num = idx + 1;
            plainText += `${num}. ${q.question || '(untitled)'}\n`;
            
            if (q.type === 'multiple_choice') {
                (q.choices || []).forEach((choice, i) => {
                    const marker = choice === q.correct ? '[✓] ' : '    ';
                    plainText += `${marker}${String.fromCharCode(97 + i)}) ${choice}\n`;
                });
            } else if (q.type === 'true_false') {
                plainText += `${q.correct === 'True' ? '[✓] ' : '    '}a) True\n`;
                plainText += `${q.correct === 'False' ? '[✓] ' : '    '}b) False\n`;
            }
            plainText += `\n`;
        });
    });

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

function saveTestBankToStorage() {
    localStorage.setItem('coeus-test-bank', JSON.stringify(testBank));
}

function restoreBanksFromStorage() {
    const savedQBank = localStorage.getItem('coeus-question-bank');
    const savedTBank = localStorage.getItem('coeus-test-bank');
    let restored = false;
    
    if (savedQBank) {
        try {
            questionBank = JSON.parse(savedQBank);
            restored = true;
        } catch (e) {
            console.error('Failed to parse saved question bank:', e);
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
        showToast('✅ Restored saved banks from last session', 'success', 3000);
    }
}

function undoClear() {
    if (!lastDeletedBank) return;
    
    if (lastDeletedBank.type === 'questionBank') {
        questionBank = [...lastDeletedBank.data];
        saveQBankToStorage();
        renderQuestionManagerList();
        showToast('✅ Question bank restored', 'success');
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
                renderSidebarQuestions();
                showToast(`✅ Loaded ${testBank.length} questions from "${file.name}"`, 'success');
            } else {
                questionBank = normalizedData;
                saveQBankToStorage();
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
                question: premise,
                correct: columnBItems[idx],
                choices: [null, null, null, null]
            };
            questionBank.push(newQuestion);
        });
        
        saveQBankToStorage();
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
        question: questionText,
        choices: type === 'multiple_choice' ? choices : null,
        correct: correct
    };

    questionBank.push(newQuestion);
    saveQBankToStorage();
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

        // Select questions
        let selectedMcQuestions, selectedTfQuestions, selectedMtQuestions;
        
        if (randomize) {
            selectedMcQuestions = shuffleArray([...mcQuestions]).slice(0, Math.min(mcCount, mcQuestions.length));
            selectedTfQuestions = shuffleArray([...tfQuestions]).slice(0, Math.min(tfCount, tfQuestions.length));
            selectedMtQuestions = shuffleArray([...mtQuestions]).slice(0, Math.min(mtCount, mtQuestions.length));
        } else {
            selectedMcQuestions = mcQuestions.slice(0, Math.min(mcCount, mcQuestions.length));
            selectedTfQuestions = tfQuestions.slice(0, Math.min(tfCount, tfQuestions.length));
            selectedMtQuestions = mtQuestions.slice(0, Math.min(mtCount, mtQuestions.length));
        }

        // Track what was actually generated
        generationStats[cat].mcGenerated = selectedMcQuestions.length;
        generationStats[cat].tfGenerated = selectedTfQuestions.length;
        generationStats[cat].mtGenerated = selectedMtQuestions.length;
        generationStats[cat].mcShortfall = mcCount - selectedMcQuestions.length;
        generationStats[cat].tfShortfall = tfCount - selectedTfQuestions.length;
        generationStats[cat].mtShortfall = mtCount - selectedMtQuestions.length;

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
    let testHtml = `<div>`;
    testHtml += `<p style="font-weight:600;margin-bottom:0.5rem;">I. Multiple Choice Questions. Choose the letter of the best answer.</p>`;

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

    testHtml += `<p style="font-weight:600;margin-top:0.75rem;margin-bottom:0.5rem;">II. True or False. Shade A if the statement is True. Shade B if the statement is False.</p>`;

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
        testHtml += `<p style="font-weight:600;margin-top:0.75rem;margin-bottom:0.5rem;">III. Matching Type. Match Column A with Column B.</p>`;

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
                    <li>Or use the Question Manager to combine them</li>
                </ol>
            </div>
        `;
    }

    reportDiv.innerHTML = reportHtml;
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
    const testContent = testPreview.innerText;
    const answerKeyContent = answerKeyPreview.innerText;
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

// Export test as PDF
function exportTestAsPdf() {
    const testPreview = document.getElementById('testPreview');
    const answerKeyPreview = document.getElementById('answerKeyPreview');
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 10;
    const maxLineWidth = pageWidth - margin * 2;

    const testContent = testPreview.innerText;
    const answerKeyContent = answerKeyPreview.innerText;

    const testLines = testContent.split('\n');
    let y = 10;

    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('TEST QUESTIONS', margin, y);
    doc.setFont(undefined, 'normal');
    y += 10;

    testLines.forEach(line => {
        const isQuestionStart = /^\d+\./.test(line);
        doc.setFont(undefined, isQuestionStart ? 'bold' : 'normal');
        if (isQuestionStart) y += 5;

        const wrappedLines = doc.splitTextToSize(line, maxLineWidth);
        wrappedLines.forEach(wrappedLine => {
            if (y > 280) {
                doc.addPage();
                y = 10;
            }
            doc.text(wrappedLine, margin, y);
            y += 7;
        });
    });

    doc.addPage();
    y = 10;
    doc.setFont(undefined, 'bold');
    doc.text('ANSWER KEY', margin, y);
    doc.setFont(undefined, 'normal');
    y += 10;

    const answerLines = answerKeyContent.split('\n');
    answerLines.forEach(line => {
        const wrappedLines = doc.splitTextToSize(line, maxLineWidth);
        wrappedLines.forEach(wrappedLine => {
            if (y > 280) {
                doc.addPage();
                y = 10;
            }
            doc.text(wrappedLine, margin, y);
            y += 7;
        });
    });

    const fileName = getFilename('pdf').replace('.pdf','');
    doc.save(fileName + ".pdf");
    showToast(`📄 PDF exported as ${getFilename('pdf')}`, 'success');
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

    if (mcqs.length > 0) {
        allChildren.push(headerPara(
            'I. Multiple Choice Questions. Choose the letter of the best answer.'
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
            'II. True or False. Shade A if the statement is True. Shade B if the statement is False.'
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
            'III. Matching Type. Match Column A with Column B.'
        ));

        // Get all answers with letters (cycling through ABCDE)
        const allAnswers = matching.map((q, idx) => ({
            text: q.correct,
            letter: String.fromCharCode(65 + (idx % 5))
        }));
        
        // Shuffle answers but keep letters in alphabetical order
        const shuffledAnswers = [...allAnswers].sort(() => Math.random() - 0.5);
        const sortedAnswers = shuffledAnswers.sort((a, b) => a.letter.charCodeAt(0) - b.letter.charCodeAt(0));
        
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

function convertTabDelimitedTxtToJson(text) {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line);
    if (lines.length < 2) {
        throw new Error("The file must contain at least one question plus headers.");
    }

    const headers = lines[0].split('\t');
    if (headers.length !== 8 || headers[0] !== "Question") {
        throw new Error("Invalid format. Ensure the first row contains: Question, Category, Type, Correct, Option 1, Option 2, Option 3, Option 4");
    }

    const questions = [];

    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split('\t');
        if (values.length !== 8) {
            throw new Error(`Invalid row format at line ${i + 1}. Each row must have 8 columns.`);
        }

        const [question, category, type, correct, option1, option2, option3, option4] = values;
        
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
            question: question,
            category: category,
            type: type,
            correct: correct,
            choices: choices
        });
    }

    return questions;
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
    showToast('🔄 Cleared', 'success');
}

// Download merged JSON
function downloadMergedJSON() {
    if (mergedQuestions.length === 0) {
        showToast('⚠️ No questions to download. Please add files first.', 'warning');
        return;
    }

    const mergedFilename = (document.getElementById('outputFilename')?.value.trim() || 'merged') + '_merged.json';
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
            if (subject && category) title = `${subject}_${category}_Q${qNum}`;
            else if (category)       title = `${category}_Q${qNum}`;
            else if (subject)        title = `${subject}_Q${qNum}`;
            else                     title = `Question${qNum}`;

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
        if (subject && category) title = `${subject}_${category}_Q${qNum}`;
        else if (category)       title = `${category}_Q${qNum}`;
        else if (subject)        title = `${subject}_Q${qNum}`;
        else                     title = `Question${qNum}`;

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