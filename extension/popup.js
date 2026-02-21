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
}

function loadSettings() {
    chrome.storage.local.get('apiUrl', (data) => {
        if (data.apiUrl) {
            document.getElementById('apiUrl').value = data.apiUrl;
        } else {
            document.getElementById('apiUrl').value = 'http://127.0.0.1:8000';
        }
    });
}

function saveSettings() {
    const apiUrl = document.getElementById('apiUrl').value;
    if (!apiUrl) {
        showError('Please enter a valid API URL');
        return;
    }
    chrome.storage.local.set({ 'apiUrl': apiUrl }, () => {
        alert('Settings saved! API will use: ' + apiUrl);
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

// Helper: execute small script in the page to extract selection or content when messaging fails
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
                    // page content
                    chrome.scripting.executeScript({
                        target: { tabId },
                        func: () => {
                            // simple content extraction fallback
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

    chrome.storage.local.get('apiUrl', (data) => {
        const apiUrl = data.apiUrl || 'http://127.0.0.1:8000';

        fetch(`${apiUrl}/analyze`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ text: text })
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`API Error: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                displayAnalysis(data);
            })
            .catch(error => {
                console.error('Error:', error);
                showError('Failed to connect to API. Make sure your API URL is correct and the server is running.\n\nError: ' + error.message);
            });
    });
}

function displayAnalysis(data) {
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('analysisResult').classList.remove('hidden');

    // Credibility Score and Label
    document.getElementById('credibilityScore').textContent = data.credibility_score;
    const riskLabel = document.getElementById('credibilityRiskLabel');

    // Color code the score
    const scoreCircle = document.querySelector('.score-circle');
    if (data.credibility_score >= 70) {
        scoreCircle.style.background = 'linear-gradient(135deg, #4caf50 0%, #45a049 100%)';
        riskLabel.textContent = "Low Risk";
        riskLabel.style.color = "#166534";
    } else if (data.credibility_score >= 40) {
        scoreCircle.style.background = 'linear-gradient(135deg, #ff9800 0%, #fb8c00 100%)';
        riskLabel.textContent = "Medium Risk";
        riskLabel.style.color = "#9a3412";
    } else {
        scoreCircle.style.background = 'linear-gradient(135deg, #f44336 0%, #e53935 100%)';
        riskLabel.textContent = "High Risk";
        riskLabel.style.color = "#991b1b";
    }

    // Sentiment
    const sentiment = data.sentiment;
    document.getElementById('sentimentResult').innerHTML =
        `<strong>${sentiment.polarity.toUpperCase()}</strong> (Confidence: ${(sentiment.confidence * 100).toFixed(0)}%)`;

    // Emotions
    const emotionsHtml = Object.entries(data.emotions).map(([emotion, score]) => {
        const barWidth = (score * 100).toFixed(0);
        return `
            <div class="emotion-item">
                <span>${emotion.charAt(0).toUpperCase() + emotion.slice(1)}</span>
                <div class="bar">
                    <div class="bar-fill" style="width: ${barWidth}%"></div>
                </div>
                <span>${(score * 100).toFixed(0)}%</span>
            </div>
        `;
    }).join('');
    document.getElementById('emotionsResult').innerHTML = emotionsHtml;

    // Flags
    const flagsHtml = data.misinformation_analysis.flags.length > 0
        ? data.misinformation_analysis.flags.map(flag => `<div class="flag-item">⚠️ ${flag}</div>`).join('')
        : '<p>No major red flags detected</p>';
    document.getElementById('flagsResult').innerHTML = flagsHtml;

    // Recommendations
    const recsHtml = data.recommendations.map(rec => `<div class="rec-item">${rec}</div>`).join('');
    document.getElementById('recommendationsResult').innerHTML = recsHtml;

    // Highlight Manipulative Text Logic
    // Compare original with neutralized to find changed words to highlight
    const originalWords = data.original.split(/\s+/);
    const neutralWords = data.neutralized.toLowerCase().split(/\s+/);

    let highlightedHtml = "";
    for (let word of originalWords) {
        const cleanWord = word.replace(/[^\w]/g, '').toLowerCase();
        // If the original word is not in the neutralized text, it was likely removed/changed as a trigger
        if (cleanWord.length > 3 && !neutralWords.includes(cleanWord)) {
            highlightedHtml += `<span class="highlight-flag">${word}</span> `;
        } else {
            highlightedHtml += `${word} `;
        }
    }

    // Fallback if texts match completely but there are flags
    if (data.original === data.neutralized && data.misinformation_analysis.flags.length > 0) {
        document.getElementById('highlightedText').innerHTML = `<em>Text mostly unchanged, but structural flags present.</em><br><br>${data.original}`;
    } else {
        document.getElementById('highlightedText').innerHTML = highlightedHtml;
    }

    // Neutral Fact-Aligned Rewrite
    document.getElementById('neutralText').textContent = data.neutralized;

    document.getElementById('results').classList.remove('hidden');
}

function showLoading() {
    document.getElementById('results').classList.remove('hidden');
    document.getElementById('loading').classList.remove('hidden');
    document.getElementById('analysisResult').classList.add('hidden');
    document.getElementById('error').classList.add('hidden');
}

function showError(message) {
    document.getElementById('results').classList.remove('hidden');
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('analysisResult').classList.add('hidden');
    document.getElementById('error').classList.remove('hidden');
    document.getElementById('errorMessage').textContent = message;
}

function closeResults() {
    document.getElementById('results').classList.add('hidden');
}
