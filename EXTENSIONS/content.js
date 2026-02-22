// content.js - Runs on every webpage to extract content

function scoreNodeText(node) {
    try {
        const text = (node.innerText || node.textContent || '').trim();
        if (!text || text.length < 50) return 0;
        const links = (node.querySelectorAll && node.querySelectorAll('a').length) || 0;
        const words = text.split(/\s+/).length;
        const density = Math.max(1, words) - links * 5; // penalize link-heavy nodes
        return Math.max(0, density);
    } catch (e) {
        return 0;
    }
}

function extractPageContent() {
    // Try semantic containers first
    const candidates = [];
    ['article', 'main', '[role="main"]', '[role="article"]'].forEach(sel => {
        document.querySelectorAll(sel).forEach(n => candidates.push(n));
    });

    // Add likely content containers
    const containerSelectors = ['.content', '.post', '.article', '.entry', '.story', '#content', '#main', '.main-content', '.post-body'];
    containerSelectors.forEach(sel => {
        document.querySelectorAll(sel).forEach(n => candidates.push(n));
    });

    // Add paragraphs as fallback
    document.querySelectorAll('p').forEach(n => candidates.push(n));

    // Score and pick the best node(s)
    const scored = candidates
        .filter(n => n)
        .map(n => ({ node: n, score: scoreNodeText(n) }))
        .sort((a, b) => b.score - a.score);

    let content = '';
    if (scored.length > 0 && scored[0].score > 40) {
        // Use top node text
        content = (scored[0].node.innerText || scored[0].node.textContent || '').trim();
    }

    // If still empty, join top paragraphs
    if (!content || content.length < 200) {
        const topParas = Array.from(document.querySelectorAll('p'))
            .map(n => (n.innerText || n.textContent || '').trim())
            .filter(t => t && t.length > 40)
            .slice(0, 40);
        content = topParas.join('\n\n');
    }

    // Last resort: body text
    if (!content || content.length < 200) {
        content = document.body ? (document.body.innerText || document.body.textContent || '') : '';
    }

    // Clean up
    content = content.replace(/\s+/g, ' ').replace(/[^\w\s.!?,;:'"()\-\/]/g, ' ').trim();
    // Limit size for transmission
    if (content.length > 5000) content = content.substring(0, 5000);

    return content;
}

function getSelectedTextFallback() {
    try {
        let selection = window.getSelection();
        if (selection && selection.toString().trim().length > 0) return selection.toString().trim();
        // Active element fallback (inputs/textareas)
        const active = document.activeElement;
        if (active && (active.tagName === 'TEXTAREA' || active.tagName === 'INPUT')) {
            const s = active.value.substring(active.selectionStart || 0, active.selectionEnd || 0);
            if (s && s.trim().length > 0) return s.trim();
        }
        return '';
    } catch (e) {
        return '';
    }
}

// 1. TITAN Pulse HUD Logic
function createPulseHUD() {
    if (document.getElementById('titan-pulse-hud')) return;

    const hud = document.createElement('div');
    hud.id = 'titan-pulse-hud';
    hud.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        width: 60px;
        height: 60px;
        border-radius: 50%;
        background: rgba(0, 255, 255, 0.2);
        backdrop-filter: blur(8px);
        border: 2px solid rgba(0, 255, 255, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 2147483647;
        cursor: pointer;
        box-shadow: 0 0 15px rgba(0, 255, 255, 0.3);
        transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
        overflow: hidden;
    `;

    const label = document.createElement('span');
    label.textContent = 'TITAN';
    label.style.cssText = 'color: #00ffff; font-family: monospace; font-size: 10px; font-weight: bold; letter-spacing: 1px;';
    hud.appendChild(label);

    const pulse = document.createElement('div');
    pulse.style.cssText = `
        position: absolute;
        width: 100%;
        height: 100%;
        border-radius: 50%;
        border: 2px solid #00ffff;
        animation: titan-pulse 2s infinite;
        pointer-events: none;
    `;
    hud.appendChild(pulse);

    // Add Styles
    const style = document.createElement('style');
    style.textContent = `
        @keyframes titan-pulse {
            0% { transform: scale(1); opacity: 0.8; }
            100% { transform: scale(1.5); opacity: 0; }
        }
        .titan-tooltip {
            position: absolute;
            background: rgba(10, 10, 20, 0.95);
            color: #fff;
            padding: 10px 14px;
            border-radius: 8px;
            border: 1px solid #ff4d4d;
            font-size: 12px;
            z-index: 2147483647;
            max-width: 280px;
            box-shadow: 0 5px 20px rgba(0,0,0,0.8);
            pointer-events: none;
            opacity: 0;
            transition: opacity 0.3s, transform 0.3s;
            font-family: 'Segoe UI', system-ui, sans-serif;
            visibility: hidden;
            line-height: 1.4;
        }
        .veracityx-highlight:hover + .titan-tooltip {
            opacity: 1;
            visibility: visible;
        }
    `;
    document.head.appendChild(style);
    document.body.appendChild(hud);
    return hud;
}

function updatePulseHUD(riskLevel, color) {
    const hud = createPulseHUD();
    const hexColor = color === 'Crimson' ? '#ff4d4d' : color === 'Amber' ? '#ffcc00' : '#00ffff';
    hud.style.borderColor = hexColor;
    hud.style.boxShadow = `0 0 20px ${hexColor}`;
    hud.querySelector('span').style.color = hexColor;
    hud.querySelector('div').style.borderColor = hexColor;

    // Animate bounce
    hud.style.transform = 'scale(1.2)';
    setTimeout(() => hud.style.transform = 'scale(1)', 200);
}

// 2. Message Listener
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    try {
        if (request.action === 'getSelectedText') {
            const text = getSelectedTextFallback();
            sendResponse({ success: true, text });
            return true;
        }

        if (request.action === 'getPageContent') {
            const content = extractPageContent();
            sendResponse({ success: true, content });
            return true;
        }

        if (request.action === 'highlightTriggers') {
            const fallacies = request.fallacies || [];
            if (fallacies.length === 0) {
                sendResponse({ success: false, message: 'No fallacies provided' });
                return true;
            }

            // Update HUD
            updatePulseHUD(request.riskLevel, request.riskColor);

            // Remove previous highlights
            const oldHighlights = document.querySelectorAll('.veracityx-highlight, .titan-tooltip');
            oldHighlights.forEach(el => el.remove());

            let count = 0;
            const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
            const nodes = [];
            while (walker.nextNode()) nodes.push(walker.currentNode);

            nodes.forEach(node => {
                let text = node.nodeValue;
                let newHtml = text;
                let foundAny = false;

                // Sort by length desc to avoid partial matches
                const sorted = [...fallacies].sort((a, b) => b.span.length - a.span.length);

                sorted.forEach(f => {
                    const word = f.span;
                    if (word.length < 3) return;

                    // Escape special characters for regex
                    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

                    // Use word boundaries only if the word starts/ends with a word character
                    const startBoundary = /^\w/.test(word) ? '\\b' : '';
                    const endBoundary = /\w$/.test(word) ? '\\b' : '';
                    const regex = new RegExp(`${startBoundary}(${escaped})${endBoundary}`, 'gi');

                    if (regex.test(newHtml)) {
                        foundAny = true;
                        newHtml = newHtml.replace(regex,
                            `<span class="veracityx-highlight" style="background: rgba(255, 77, 77, 0.2); border-bottom: 2px solid #ff4d4d; cursor: help; display: inline; position: relative;">$1</span><div class="titan-tooltip"><b>${f.name}</b><br>${f.explanation}</div>`
                        );
                    }
                });

                if (foundAny) {
                    const temp = document.createElement('span');
                    temp.innerHTML = newHtml;

                    // Re-inject tooltip logic (positioning)
                    const highlights = temp.querySelectorAll('.veracityx-highlight');
                    highlights.forEach(h => {
                        h.addEventListener('mouseover', (e) => {
                            const tooltip = h.nextSibling;
                            if (tooltip && tooltip.classList.contains('titan-tooltip')) {
                                const rect = h.getBoundingClientRect();
                                tooltip.style.left = `${rect.left}px`;
                                tooltip.style.top = `${rect.top - 10}px`;
                                tooltip.style.transform = 'translateY(-100%)';
                            }
                        });
                    });

                    node.parentNode.replaceChild(temp, node);
                    count++;
                }
            });

            sendResponse({ success: true, count });
            return true;
        }
    } catch (error) {
        console.error('Content script error:', error);
        return true;
    }
});

// Auto-run on load
createPulseHUD();
console.log('VeracityX TITAN Interface Active.');
