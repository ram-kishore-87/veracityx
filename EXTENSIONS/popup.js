// popup.js - Extension UI Logic

document.addEventListener('DOMContentLoaded', () => {
    loadSettings();
    setupEventListeners();
});

function setupEventListeners() {
    document.getElementById('saveSettings').addEventListener('click', saveSettings);
    document.getElementById('analyzeBtn').addEventListener('click', analyzePageContent);
    document.getElementById('analyzeManualBtn').addEventListener('click', analyzeManualInput);
    document.getElementById('closeResult').addEventListener('click', closeResults);

    // Gamification Listeners
    document.getElementById('showResultsBtn').addEventListener('click', revealTitanResults);
    document.getElementById('challengeModeToggle').addEventListener('change', (e) => {
        chrome.storage.local.set({ 'challengeMode': e.target.checked });
    });

    // New Feature Listeners
    document.getElementById('copyNeutralBtn').addEventListener('click', copyNeutralText);

    // Initial Load
    renderHistory();
    initGamification();
}

function initGamification() {
    chrome.storage.local.get(['challengeMode', 'titan_score'], (data) => {
        document.getElementById('challengeModeToggle').checked = !!data.challengeMode;
        const score = data.titan_score || 0;
        updateRankUI(score);
    });
}

function loadSettings() {
    const apiInput = document.getElementById('apiUrl');
    if (!apiInput) return;
    chrome.storage.local.get('apiUrl', (data) => {
        if (data.apiUrl) {
            apiInput.value = data.apiUrl;
        } else {
            apiInput.value = 'http://127.0.0.1:8001';
        }
    });
}

function saveSettings() {
    const apiInput = document.getElementById('apiUrl');
    if (!apiInput) return;
    const apiUrl = apiInput.value;
    if (!apiUrl) {
        showError('Please enter a valid API URL');
        return;
    }
    chrome.storage.local.set({ 'apiUrl': apiUrl.trim() }, () => {
        alert('Settings Saved: Connection redirected to ' + apiUrl);
    });
}

function analyzePageContent() {
    showLoading();

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs || !tabs[0]) { showError('No active tab found.'); return; }
        chrome.tabs.sendMessage(tabs[0].id, { action: 'getPageContent' }, (response) => {
            if (chrome.runtime.lastError) { /* content script not injected, fall through */ }
            if (response && response.content && response.content.length > 50) {
                analyzeText(response.content);
            } else {
                // Fallback: try executing a script to extract content (in case content script wasn't injected)
                runContentScriptFallback('page').then(fallbackText => {
                    if (fallbackText && fallbackText.length > 50) analyzeText(fallbackText);
                    else {
                        const msg = (response && response.content) || 'Could not extract page content. Try using "Analyze Selected Text" instead.';
                        showError(msg);
                    }
                }).catch(err => showError('Failed to extract page content: ' + err.message));
            }
        });
    });
}

function analyzeManualInput() {
    const text = document.getElementById('manualInput').value;
    if (!text || text.trim().length < 10) {
        showError('Please enter at least 10 characters of text to analyze.');
        return;
    }
    analyzeText(text);
}

function runContentScriptFallback(type) {
    return new Promise((resolve, reject) => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (!tabs || !tabs[0]) return reject(new Error('No active tab'));
            const tabId = tabs[0].id;
            try {
                if (type === 'selection') {
                    chrome.scripting.executeScript({
                        target: { tabId },
                        func: () => {
                            const sel = window.getSelection ? window.getSelection().toString().trim() : '';
                            if (sel && sel.length > 0) return sel;
                            const active = document.activeElement;
                            if (active && (active.tagName === 'TEXTAREA' || active.tagName === 'INPUT')) {
                                return active.value.substring(active.selectionStart || 0, active.selectionEnd || 0).trim();
                            }
                            return '';
                        }
                    }, (results) => {
                        try {
                            const res = results && results[0] && results[0].result ? results[0].result : '';
                            resolve(res);
                        } catch (e) { reject(e); }
                    });
                } else {
                    chrome.scripting.executeScript({
                        target: { tabId },
                        func: () => {
                            const paras = Array.from(document.querySelectorAll('article, main, p'));
                            if (paras && paras.length > 0) {
                                return paras.map(n => n.innerText || n.textContent || '').join('\n\n').substring(0, 5000);
                            }
                            return (document.body && (document.body.innerText || document.body.textContent) || '').substring(0, 5000);
                        }
                    }, (results) => {
                        try {
                            const res = results && results[0] && results[0].result ? results[0].result : '';
                            resolve(res);
                        } catch (e) { reject(e); }
                    });
                }
            } catch (e) {
                reject(e);
            }
        });
    });
}

function analyzeText(text) {
    if (!text || text.trim().length === 0) {
        showError('No text to analyze');
        return;
    }

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const url = tabs[0]?.url || "";
        let domain = "";
        try {
            if (url) domain = new URL(url).hostname;
        } catch (e) {
            console.warn("Could not parse domain:", e);
        }

        chrome.storage.local.get('apiUrl', (data) => {
            const apiUrl = data.apiUrl || 'http://127.0.0.1:8001';

            fetch(`${apiUrl}/analyze`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ text: text, domain: domain })
            })
                .then(response => {
                    if (!response.ok) {
                        if (response.status === 422) throw new Error('Text input is too short or malformed. Please provide more text.');
                        throw new Error(`API Error: ${response.status}`);
                    }
                    return response.json();
                })
                .then(data => {
                    data.original = text;
                    displayAnalysis(data);
                })
                .catch(error => {
                    console.error('Error:', error);
                    showError('Failed to connect to API. Make sure your API URL is correct and the server is running.\n\nError: ' + error.message);
                });
        });
    });
}

function copyNeutralText() {
    const text = document.getElementById('neutralText').textContent;
    if (text && text !== '--') {
        navigator.clipboard.writeText(text).then(() => {
            const btn = document.getElementById('copyNeutralBtn');
            const original = btn.textContent;
            btn.textContent = '✅ Copied!';
            btn.style.borderColor = 'var(--success)';
            btn.style.color = 'var(--success)';
            setTimeout(() => {
                btn.textContent = original;
                btn.style.borderColor = 'var(--primary)';
                btn.style.color = 'var(--primary)';
            }, 2000);
        });
    }
}

function highlightTriggersInPage() {
    if (!currentAnalysisData) return;

    const btn = document.getElementById('highlightInPageBtn');

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs || !tabs[0]) return;
        const tabId = tabs[0].id;
        const payload = {
            action: 'highlightTriggers',
            fallacies: currentAnalysisData.fallacies || [],
            riskLevel: currentAnalysisData.risk_level,
            riskColor: currentAnalysisData.risk_color
        };

        const handleResponse = (response) => {
            if (response && response.success) {
                if (btn) {
                    btn.textContent = `⚡ Injected (${response.count})`;
                    btn.style.borderColor = 'var(--success)';
                    btn.style.color = 'var(--success)';
                    setTimeout(() => {
                        btn.textContent = '✨ Highlight in Page';
                        btn.style.borderColor = 'var(--primary)';
                        btn.style.color = 'var(--primary)';
                    }, 3000);
                }
            }
        };

        // Try sending message to existing content script
        chrome.tabs.sendMessage(tabId, payload, (response) => {
            if (chrome.runtime.lastError || !response) {
                // Content script not loaded — inject it on-the-fly, then retry
                chrome.scripting.executeScript({
                    target: { tabId: tabId },
                    files: ['content.js']
                }, () => {
                    if (chrome.runtime.lastError) {
                        console.error('Could not inject content script:', chrome.runtime.lastError.message);
                        if (btn) btn.textContent = '❌ Cannot highlight on this page';
                        setTimeout(() => { if (btn) btn.textContent = '✨ Highlight in Page'; }, 3000);
                        return;
                    }
                    // Retry after injection
                    setTimeout(() => {
                        chrome.tabs.sendMessage(tabId, payload, (retryResponse) => {
                            if (!chrome.runtime.lastError && retryResponse) {
                                handleResponse(retryResponse);
                            }
                        });
                    }, 300);
                });
            } else {
                handleResponse(response);
            }
        });
    });
}

function saveToHistory(data) {
    chrome.storage.local.get('analysisHistory', (result) => {
        let history = result.analysisHistory || [];
        const newItem = {
            id: Date.now(),
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            risk: data.risk_level || data.credibility_risk,
            confidence: (data.weighted_truth_score / 100) || data.confidence,
            snippet: data.original.substring(0, 100) + (data.original.length > 100 ? '...' : ''),
            fullData: data
        };

        // Add to start and limit to 5
        history.unshift(newItem);
        history = history.slice(0, 5);

        chrome.storage.local.set({ 'analysisHistory': history }, () => {
            renderHistory();
        });
    });
}

function renderHistory() {
    chrome.storage.local.get('analysisHistory', (result) => {
        const historyList = document.getElementById('historyList');
        const history = result.analysisHistory || [];

        if (history.length === 0) {
            historyList.innerHTML = '<p class="empty-history">No recent analyses yet.</p>';
            return;
        }

        historyList.innerHTML = history.map(item => `
            <div class="history-item" data-id="${item.id}">
                <div class="history-item-header">
                    <span class="history-item-risk" style="color: ${(item.risk === 'Low' || item.risk === 'Credible') ? 'var(--success)' : (item.risk === 'Medium' || item.risk === 'Suspicious') ? 'var(--warning)' : 'var(--danger)'}">
                        ${(item.risk === 'Low' || item.risk === 'Credible') ? 'CREDIBLE' : (item.risk === 'Medium' || item.risk === 'Suspicious') ? 'CAUTION' : 'MANIPULATIVE'}
                    </span>
                    <span class="history-item-time">${item.time}</span>
                </div>
                <div class="history-item-text">${item.snippet}</div>
            </div>
        `).join('');

        // Add click events
        document.querySelectorAll('.history-item').forEach(el => {
            el.addEventListener('click', () => {
                const id = parseInt(el.getAttribute('data-id'));
                const item = history.find(h => h.id === id);
                if (item) displayAnalysis(item.fullData, false);
            });
        });
    });
}

let currentAnalysisData = null;

function generateChallengeQuestions(data) {
    const questions = [];
    const fallacies = data.fallacies || [];
    const riskLevel = data.risk_level || data.credibility_risk || "Unknown";
    const allFallacies = ["Ad Hominem", "Appeal to Emotion", "Bandwagon", "False Dilemma", "Fear Appeal", "Slippery Slope", "Red Herring", "Straw Man", "Scapegoating"];

    // Question 1: Fallacy detection (always generated)
    if (fallacies.length > 0) {
        const f = fallacies[0];
        const wrongOptions = allFallacies.filter(n => n !== f.name).sort(() => 0.5 - Math.random()).slice(0, 3);
        const options = [f.name, ...wrongOptions].sort(() => 0.5 - Math.random());
        questions.push({
            type: "fallacy",
            question: `🔍 Q1/2 — The phrase "${f.span.substring(0, 50)}" is an example of which logical fallacy?`,
            options,
            correct_answer: f.name,
            points: 10
        });
    } else {
        // No fallacies — ask a general manipulation knowledge question
        const correctFallacy = allFallacies[Math.floor(Math.random() * allFallacies.length)];
        const wrongOptions = allFallacies.filter(n => n !== correctFallacy).sort(() => 0.5 - Math.random()).slice(0, 3);
        const options = [correctFallacy, ...wrongOptions].sort(() => 0.5 - Math.random());
        questions.push({
            type: "fallacy",
            question: `🔍 Q1/2 — Which of these is a type of logical fallacy used in misinformation?`,
            options,
            correct_answer: correctFallacy,
            points: 10
        });
    }

    // Question 2: Risk level verdict (always generated)
    const riskOptions = ["Credible", "Suspicious", "Manipulative"];
    questions.push({
        type: "risk",
        question: `🛡️ Q2/2 — Based on this analysis, what is the overall credibility verdict?`,
        options: riskOptions,
        correct_answer: riskLevel,
        points: 10
    });

    return questions;
}

async function displayAnalysis(data, trackHistory = true) {
    currentAnalysisData = data;
    if (trackHistory) saveToHistory(data);

    hideLoading();

    // Generate challenge questions from existing API data if not already provided
    if (!data.challenge_questions || data.challenge_questions.length === 0) {
        data.challenge_questions = generateChallengeQuestions(data);
    }

    chrome.storage.local.get('challengeMode', (settings) => {
        if (settings.challengeMode && data.challenge_questions && data.challenge_questions.length > 0) {
            setupChallenge(data);
        } else {
            renderFullReport(data);
        }
    });

    // Hide history when result is shown
    const hist = document.getElementById('historySection');
    if (hist) hist.classList.add('hidden');
    const res = document.getElementById('results');
    if (res) res.scrollTop = 0;
}

let currentChallengeIndex = 0;
let sessionScore = 0;
let currentChallengeData = null;

function setupChallenge(data) {
    currentChallengeIndex = 0;
    sessionScore = 0;
    currentChallengeData = data;

    const cArea = document.getElementById('challengeArea');
    const cFeed = document.getElementById('challengeFeedback');
    const aRes = document.getElementById('analysisResult');
    const resArea = document.getElementById('results');
    if (cArea) cArea.classList.remove('hidden');
    if (cFeed) cFeed.classList.add('hidden');
    if (aRes) aRes.classList.add('hidden');
    if (resArea) resArea.classList.remove('hidden');

    updateSessionScoreUI(0);
    renderChallengeQuestion(0);

    // Single persistent click handler on the Results button
    const showResultsBtn = document.getElementById('showResultsBtn');
    if (showResultsBtn) {
        // Clone to remove any stale listeners
        const newBtn = showResultsBtn.cloneNode(true);
        showResultsBtn.parentNode.replaceChild(newBtn, showResultsBtn);
        newBtn.addEventListener('click', onChallengeButtonClick);
    }
}

function onChallengeButtonClick() {
    const total = currentChallengeData.challenge_questions.length;
    if (currentChallengeIndex < total - 1) {
        // Move to next question
        currentChallengeIndex++;
        const cFeed = document.getElementById('challengeFeedback');
        if (cFeed) cFeed.classList.add('hidden');
        renderChallengeQuestion(currentChallengeIndex);
    } else {
        // Reveal full results after last question
        revealTitanResults();
    }
}

function renderChallengeQuestion(index) {
    if (!currentChallengeData) return;
    const challenge = currentChallengeData.challenge_questions[index];
    if (!challenge) return;

    const qEl = document.getElementById('challengeQuestion');
    if (qEl) qEl.textContent = challenge.question;

    const optionsContainer = document.getElementById('challengeOptions');
    if (optionsContainer) {
        optionsContainer.innerHTML = '';
        challenge.options.forEach(opt => {
            const btn = document.createElement('button');
            btn.className = 'option-btn';
            btn.textContent = opt;
            btn.addEventListener('click', () => handleChallengeSelection(opt, challenge.correct_answer, challenge.points));
            optionsContainer.appendChild(btn);
        });
    }

    const cFeed = document.getElementById('challengeFeedback');
    if (cFeed) cFeed.classList.add('hidden');
}

function handleChallengeSelection(selected, correct, points) {
    const feedback = document.getElementById('challengeFeedback');
    const feedbackText = document.getElementById('feedbackText');
    const showResultsBtn = document.getElementById('showResultsBtn');
    if (!feedback || !feedbackText) return;

    // Lock options so user can't change answer
    document.querySelectorAll('.option-btn').forEach(b => b.disabled = true);

    const pts = points || 10;
    const total = (currentChallengeData && currentChallengeData.challenge_questions) ? currentChallengeData.challenge_questions.length : 2;
    const isLast = currentChallengeIndex >= total - 1;

    if (selected === correct) {
        feedback.className = 'challenge-feedback feedback-correct';
        feedbackText.textContent = `✅ CORRECT! +${pts} points`;
        sessionScore += pts;
        addPoints(pts);
        updateSessionScoreUI(sessionScore);
    } else {
        feedback.className = 'challenge-feedback feedback-wrong';
        feedbackText.textContent = `❌ INCORRECT. Answer: ${correct}`;
    }

    feedback.classList.remove('hidden');

    if (showResultsBtn) {
        showResultsBtn.textContent = isLast ? '🏆 See Final Results' : '➡️ Next Question';
    }
}

function updateSessionScoreUI(score) {
    const totalScore = document.getElementById('totalScore');
    if (totalScore) {
        totalScore.textContent = score;
        totalScore.classList.remove('score-glow');
        void totalScore.offsetWidth;
        totalScore.classList.add('score-glow');
    }
}

function addPoints(pts) {
    chrome.storage.local.get('titan_score', (data) => {
        const newScore = (data.titan_score || 0) + pts;
        chrome.storage.local.set({ 'titan_score': newScore }, () => {
            updateRankUI(newScore);
        });
    });
}

function updateRankUI(score) {
    const totalScore = document.getElementById('totalScore');
    const rankBadge = document.getElementById('rankBadge');
    const progress = document.getElementById('rankProgress');
    if (!totalScore || !rankBadge || !progress) return;

    totalScore.textContent = score;

    let rank = "Truth Seeker";
    let nextThreshold = 50;
    let prevThreshold = 0;

    if (score > 300) {
        rank = "Cognitive Guardian";
        nextThreshold = 500;
        prevThreshold = 301;
    } else if (score > 150) {
        rank = "Bias Breaker";
        nextThreshold = 300;
        prevThreshold = 151;
    } else if (score > 50) {
        rank = "Logic Apprentice";
        nextThreshold = 150;
        prevThreshold = 51;
    }

    rankBadge.textContent = rank;
    const percent = Math.min(100, ((score - prevThreshold) / (nextThreshold - prevThreshold)) * 100);
    progress.style.width = `${percent}%`;
}

function revealTitanResults() {
    const cArea = document.getElementById('challengeArea');
    if (cArea) cArea.classList.add('hidden');
    renderFullReport(currentAnalysisData);
}

function renderFullReport(data) {
    const analysisResult = document.getElementById('analysisResult');
    if (!analysisResult) return;

    analysisResult.classList.remove('hidden');
    analysisResult.classList.add('revealing');

    const cards = document.querySelectorAll('.card');
    cards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.animation = 'none';
        card.offsetHeight;
        card.style.animation = `fadeInUp 0.6s ease-out ${index * 0.15}s forwards`;
    });

    const riskLabel = document.getElementById('credibilityRiskLabel');
    const statusIcon = document.getElementById('statusIcon');
    const scoreCircle = document.querySelector('.score-circle');
    const proInsightEl = document.getElementById('proInsight');

    // Robust score: prefer weighted_truth_score (TITAN format), fall back to confidence
    let rawScore = data.weighted_truth_score;
    if (rawScore === undefined || rawScore === null || isNaN(rawScore)) {
        rawScore = (typeof data.confidence === 'number') ? (data.confidence * 100) : 50;
    }
    const confidencePercent = Math.min(100, Math.max(0, Math.round(rawScore)));
    const riskLevel = data.risk_level || data.credibility_risk || 'Suspicious';

    animateValue('credibilityScore', 0, confidencePercent, 1200);

    if (riskLevel === 'Credible' || riskLevel === 'Low') {
        if (statusIcon) statusIcon.textContent = '🛡️';
        if (riskLabel) {
            riskLabel.textContent = '✅ Credible — Accredited Factual';
            riskLabel.style.color = 'var(--success)';
        }
        if (scoreCircle) scoreCircle.style.background = `conic-gradient(var(--success) ${confidencePercent}%, rgba(255,255,255,0.05) 0%)`;
    } else if (riskLevel === 'Suspicious' || riskLevel === 'Medium') {
        if (statusIcon) statusIcon.textContent = '⚠️';
        if (riskLabel) {
            riskLabel.textContent = '⚠️ Suspicious — Caution Advised';
            riskLabel.style.color = 'var(--warning)';
        }
        if (scoreCircle) scoreCircle.style.background = `conic-gradient(var(--warning) ${confidencePercent}%, rgba(255,255,255,0.05) 0%)`;
    } else {
        if (statusIcon) statusIcon.textContent = '🚨';
        if (riskLabel) {
            riskLabel.textContent = '🚨 Manipulative — High Threat';
            riskLabel.style.color = 'var(--danger)';
        }
        if (scoreCircle) scoreCircle.style.background = `conic-gradient(var(--danger) ${confidencePercent}%, rgba(255,255,255,0.05) 0%)`;
    }

    // Populate insight text from whichever API field is available
    if (proInsightEl) {
        const insight = data.human_readable_explanation
            || data.pro_insight
            || data.explanation_summary
            || (data.prediction ? `ML Prediction: ${data.prediction} | Accuracy: ${confidencePercent}%` : null)
            || `Accuracy Score: ${confidencePercent}% — ${riskLevel} content detected.`;
        proInsightEl.textContent = insight;
    }

    const botProb = data.bot_probability !== undefined
        ? data.bot_probability
        : (data.bot_signals ? (data.bot_signals.bot_probability || 0) : 0);
    const botEl = document.getElementById('botProbValue');
    if (botEl) botEl.textContent = `${Math.round(botProb * 100)}%`;

    const fallacyEl = document.getElementById('fallacyCountValue');
    if (fallacyEl) fallacyEl.textContent = (data.fallacies && data.fallacies.length) || 0;

    const emoData = data.emotional_analysis || data.emotion_analysis || {};
    const intensity = emoData.intensity_score !== undefined
        ? emoData.intensity_score : (emoData.emotional_intensity_score || 0);
    const intensityEl = document.getElementById('intensityValue');
    if (intensityEl) intensityEl.textContent = (typeof intensity === 'number') ? intensity.toFixed(2) : '0.00';


    const recsResult = document.getElementById('recommendationsResult');
    if (recsResult && data.recommendations && data.recommendations.length > 0) {
        recsResult.innerHTML = data.recommendations.map(rec => `<div class="rec-item">${rec}</div>`).join('');
    } else if (recsResult) {
        recsResult.innerHTML = `<div class="rec-item">✅ No specific warnings detected.</div>`;
    }

    const highlightedEl = document.getElementById('highlightedText');
    if (highlightedEl) {
        let processedText = data.original || "";
        const triggers = data.manipulative_elements || [];
        if (triggers.length > 0) {
            triggers.forEach(word => {
                if (word.length > 3) {
                    // Escape special regex characters in the phrase
                    const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    const regex = new RegExp(`\\b(${escapedWord})\\b`, 'gi');
                    processedText = processedText.replace(regex, '<span class="highlight-flag">$1</span>');
                }
            });
        }
        highlightedEl.innerHTML = processedText || '<span style="color:var(--text-muted)">No manipulative phrases detected.</span>';
    }

    const factCard = document.getElementById('factCheckCard');
    const factContainer = document.getElementById('factCheckResults');
    if (factCard && factContainer) {
        if (data.fact_checks && data.fact_checks.length > 0) {
            factCard.classList.remove('hidden');
            factContainer.innerHTML = data.fact_checks.map(f => `
                <a href="${f.url}" target="_blank" class="fact-item">
                    <div class="fact-info">
                        <span class="fact-source">${f.source}</span>
                        <span class="fact-match">${Math.round(f.similarity * 100)}% Match</span>
                    </div>
                    <div class="fact-headline">${f.headline}</div>
                </a>
            `).join('');
        } else {
            factCard.classList.add('hidden');
        }
    }

    const neutralEl = document.getElementById('neutralText');
    if (neutralEl) neutralEl.textContent = data.fact_aligned_rewrite || 'No rewrite available for this content.';

    const resArea = document.getElementById('results');
    if (resArea) resArea.classList.remove('hidden');
}

function hideLoading() {
    const loading = document.getElementById('loading');
    if (loading) loading.classList.add('hidden');
}

function animateValue(id, start, end, duration) {
    const obj = document.getElementById(id);
    if (!obj) return;
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        obj.innerHTML = Math.floor(progress * (end - start) + start) + "%";
        if (progress < 1) {
            window.requestAnimationFrame(step);
        }
    };
    window.requestAnimationFrame(step);
}

function showLoading() {
    const results = document.getElementById('results');
    const loading = document.getElementById('loading');
    const analysisResult = document.getElementById('analysisResult');
    const errorEl = document.getElementById('error');
    const historySection = document.getElementById('historySection');
    const challengeArea = document.getElementById('challengeArea');

    if (results) results.classList.remove('hidden');
    if (loading) loading.classList.remove('hidden');
    if (analysisResult) analysisResult.classList.add('hidden');
    if (errorEl) errorEl.classList.add('hidden');
    if (historySection) historySection.classList.add('hidden');
    if (challengeArea) challengeArea.classList.add('hidden');
}

function showError(message) {
    const results = document.getElementById('results');
    const loading = document.getElementById('loading');
    const analysisResult = document.getElementById('analysisResult');
    const errorEl = document.getElementById('error');
    const errorMessage = document.getElementById('errorMessage');
    const historySection = document.getElementById('historySection');
    const challengeArea = document.getElementById('challengeArea');

    if (results) results.classList.remove('hidden');
    if (loading) loading.classList.add('hidden');
    if (analysisResult) analysisResult.classList.add('hidden');
    if (errorEl) errorEl.classList.remove('hidden');
    if (errorMessage) errorMessage.textContent = message;
    if (historySection) historySection.classList.add('hidden');
    if (challengeArea) challengeArea.classList.add('hidden');
}

function closeResults() {
    const results = document.getElementById('results');
    const historySection = document.getElementById('historySection');
    if (results) results.classList.add('hidden');
    if (historySection) historySection.classList.remove('hidden');
    renderHistory();
}
