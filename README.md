# VeracityX Browser Extension

A Chrome/Firefox browser extension that analyzes webpage content in real-time for misinformation, bias, and credibility.

## Features

✅ **One-Click Analysis** - Analyze any webpage content  
✅ **Text Selection** - Analyze specific selected text  
✅ **Real-time Detection** - Identifies misinformation patterns  
✅ **Credibility Scoring** - Rates content 0-100  
✅ **Sentiment & Emotion Analysis** - Detects emotional manipulation  
✅ **Risk Flags** - Shows logical fallacies and red flags  
✅ **Smart Recommendations** - Actionable insights for users  
✅ **Text Neutralization** - Shows balanced version of content  

## Installation

### Chrome
1. Download/clone this extension folder to your PC
2. Open Chrome and go to: `chrome://extensions/`
3. Enable **Developer Mode** (top right toggle)
4. Click **Load unpacked**
5. Select the `extension` folder
6. Extension is now active!

### Firefox
1. Open Firefox and go to: `about:debugging#/runtime/this-firefox`
2. Click **Load Temporary Add-on**
3. Select `manifest.json` from the `extension` folder
4. Extension is now active (until browser restart)

## Setup

### Step 1: Start VeracityX API Server
```powershell
cd d:\HACKATHON
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

Server should show:
```
INFO:     Uvicorn running on http://127.0.0.1:8000
```

### Step 2: Configure Extension
1. Click the VeracityX extension icon in your browser
2. Enter your API URL (default: `http://127.0.0.1:8000`)
3. Click **Save Settings**

## Usage

### Analyze Webpage Content
1. Click the VeracityX icon
2. Click **🔎 Analyze This Page**
3. View comprehensive analysis

### Analyze Selected Text
1. Highlight/select any text on the page
2. Click the VeracityX icon
3. Click **✏️ Analyze Selected Text**
4. See detailed credibility report

## What Gets Analyzed?

- **Credibility Score** (0-100) - Overall trustworthiness
- **Sentiment** - Positive/Negative/Neutral polarity
- **Emotions Detected** - Anger, Fear, Joy, Sadness levels
- **Risk Flags** - Logical fallacies, unverified claims, emotional manipulation
- **Misinformation Indicators** - Sensational language, ALL CAPS, excessive punctuation
- **Recommendations** - Actionable insights
- **Neutralized Text** - Balanced version of the content

## Supported Browsers

- ✅ Chrome (90+)
- ✅ Edge (90+)
- ✅ Firefox (109+)
- ⚠️ Mobile (Limited support on Firefox Mobile, Chrome Mobile)

## Troubleshooting

### "Failed to connect to API"
1. Make sure the backend server is running
2. Verify API URL is correct in extension settings
3. Check if server is on `http://127.0.0.1:8000`

### "No content extracted"
1. Try right-clicking and selecting "Analyze Selected Text"
2. Some dynamic websites may require a moment to load

### Extension not loading
1. Try disabling/re-enabling the extension
2. Clear extension storage: `chrome://extensions/` → Details → Storage → Clear

## File Structure

```
extension/
├── manifest.json      # Extension configuration
├── popup.html         # UI interface
├── popup.css          # Styling
├── popup.js           # UI logic & API calls
├── content.js         # Webpage interaction
├── background.js      # Service worker
└── icons/             # Extension icons (optional)
```

## Architecture

```
User opens webpage
    ↓
Clicks VeracityX extension
    ↓
Selects text or analyzes page content
    ↓
Content script extracts text
    ↓
Popup sends to VeracityX API
    ↓
API analyzes & returns results
    ↓
Extension displays analysis in popup UI
```

## API Endpoints Used

- `POST /analyze` - Full analysis (sentiment, emotions, credibility, flags)
- `POST /neutralize` - Text neutralization only
- `GET /health` - Server health check

## Privacy & Data

- ✅ Extension runs locally in your browser
- ✅ Content is sent only to YOUR API instance
- ✅ No data sent to third parties
- ✅ Results not stored permanently

## Performance

- Fast analysis on most text (< 1 second)
- Works best with text under 1000 characters
- Can handle dynamic content on most websites

## Future Enhancements

- 🔜 Multi-language support
- 🔜 Custom word lists/rules
- 🔜 Browser sync across devices
- 🔜 Visual highlighting on webpages
- 🔜 Share analysis reports

---

**Made with ❤️ by VeracityX Team**
