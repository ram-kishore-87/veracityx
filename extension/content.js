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
        .map(n => ({node: n, score: scoreNodeText(n)}))
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

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    try {
        if (request.action === 'getSelectedText') {
            const text = getSelectedTextFallback();
            if (text && text.length > 0) {
                sendResponse({success: true, text});
            } else {
                sendResponse({success: false, text: ''});
            }
            return true;
        }

        if (request.action === 'getPageContent') {
            const content = extractPageContent();
            if (content && content.length > 50) {
                sendResponse({success: true, content});
            } else {
                sendResponse({success: false, content: 'Unable to extract content. Try selecting text manually or check if page has loaded completely.'});
            }
            return true;
        }
    } catch (error) {
        console.error('Content script error:', error);
        try { sendResponse({success: false, error: error.message}); } catch (e) {}
        return true;
    }
});

// Auto-run on load
console.log('VeracityX content script loaded on:', window.location.href);
