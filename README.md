# UX Compare Tool

A powerful visual regression testing tool that captures frontend screenshots using Playwright and compares them against UX design exports using pixel-level diffs with detailed logging.

## Features

- 🎯 **Pixel-perfect comparisons** - Detect visual differences between designs and implementation
- 📱 **Multi-viewport support** - Test desktop, mobile, and custom viewport sizes
- 🔍 **Enhanced detailed logging** - Track every action with timestamps and performance metrics
- 🎭 **Playwright-powered** - Fast, reliable browser automation
- 🌐 **SPA support** - Handle client-side routing and dynamic content
- 📊 **Comprehensive reporting** - Detailed diff statistics and visual diff images
- ⚙️ **Flexible configuration** - JSON-based config with global and per-page actions

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Your Tests

Copy `config.example.json` to `config.json` and customize:

```json
{
  "baseUrl": "http://localhost:8080",
  "outputDir": "output",
  "threshold": 0.1,
  "viewports": [
    { "name": "desktop", "width": 1440, "height": 900, "deviceScaleFactor": 1 },
    { "name": "mobile", "width": 390, "height": 844, "deviceScaleFactor": 2 }
  ],
  "globalActions": [
    { "type": "goto", "url": "/" },
    { "type": "waitForSelector", "selector": "#email" },
    { "type": "type", "selector": "#email", "text": "user@example.com" },
    { "type": "type", "selector": "#password", "text": "password123" },
    { "type": "click", "selector": "button[type='submit']", "waitForNavigation": true }
  ],
  "pages": [
    {
      "name": "dashboard",
      "path": "/dashboard",
      "designImage": "designs/dashboard.png",
      "actions": [
        { "type": "waitForTimeout", "timeout": 2000 }
      ]
    }
  ]
}
```

### 3. Run Comparison

```bash
npm run compare
```

## Configuration Options

### Root Level

| Option | Type | Description | Default |
|--------|------|-------------|---------|
| `baseUrl` | string | Base URL of your application | `http://localhost:8080/` |
| `outputDir` | string | Directory for screenshots and diffs | `output` |
| `threshold` | number | Pixel matching threshold (0-1) | `0.1` |
| `viewports` | array | List of viewport configurations | See below |
| `globalActions` | array | Actions to run once before all pages | `[]` |
| `pages` | array | List of pages to capture and compare | `[]` |

### Viewport Configuration

```json
{
  "name": "desktop",
  "width": 1440,
  "height": 900,
  "deviceScaleFactor": 1
}
```

### Page Configuration

```json
{
  "name": "dashboard",
  "path": "/dashboard",
  "designImage": "designs/dashboard.png",
  "actions": []
}
```

## Action Types

### Navigation Actions

#### `goto`
Navigate to a URL.
```json
{ "type": "goto", "url": "/", "waitUntil": "networkidle" }
```

#### `reload`
Reload the current page.
```json
{ "type": "reload", "waitUntil": "networkidle" }
```

### Interaction Actions

#### `click`
Click an element.
```json
{ 
  "type": "click", 
  "selector": "button#submit",
  "waitForNavigation": true
}
```

#### `type`
Type text into an input field.
```json
{ 
  "type": "type", 
  "selector": "#username", 
  "text": "admin@example.com",
  "options": { "delay": 50 }
}
```

#### `press`
Press a keyboard key.
```json
{ "type": "press", "key": "Enter" }
```

#### `select`
Select option(s) from a dropdown.
```json
{ 
  "type": "select", 
  "selector": "#country", 
  "value": "US"
}
```

### Wait Actions

#### `waitForSelector`
Wait for an element to appear.
```json
{ 
  "type": "waitForSelector", 
  "selector": ".dashboard-loaded",
  "options": { "timeout": 10000 }
}
```

#### `waitForXPath`
Wait for an element matching XPath.
```json
{ 
  "type": "waitForXPath", 
  "xpath": "//div[@class='loaded']"
}
```

#### `waitForTimeout`
Wait for a specific duration.
```json
{ "type": "waitForTimeout", "timeout": 2000 }
```

#### `waitForNavigation`
Wait for page navigation to complete.
```json
{ 
  "type": "waitForNavigation",
  "options": { "waitUntil": "networkidle", "timeout": 10000 }
}
```

### State Actions

#### `setCookie`
Set browser cookies.
```json
{ 
  "type": "setCookie", 
  "cookies": [
    { "name": "session", "value": "abc123", "domain": "localhost" }
  ]
}
```

#### `setLocalStorage`
Set localStorage items.
```json
{ 
  "type": "setLocalStorage", 
  "items": { 
    "token": "xyz789",
    "userId": "12345"
  }
}
```

## Enhanced Logging Output

The tool provides detailed, color-coded logging for every step:

### Configuration Summary
```
============================================================
🚀 UX Compare Tool
============================================================
Base URL: http://localhost:8080
Output Directory: output
Threshold: 0.1
Viewports: desktop, mobile
Pages: 1
```

### Action Execution Details
```
📋 Executing global actions...
    → Navigating to: http://localhost:8080/
    ✓ Loaded in 582ms
    → Waiting for selector: #email
    → Typing into: #email
    → Clicking: form button[type='submit']
✓ Global actions completed in 6209ms
```

### Screenshot Capture
```
📸 Capturing: dashboard
   URL: http://localhost:8080/
   → Navigating to http://localhost:8080/...
   → Executing 1 page action(s)...
   ✓ Screenshot saved: dashboard-desktop.png (75ms)
```

### Comparison Results
```
🔍 Comparing Images
============================================================

Comparing: dashboard-desktop
  Design: designs/dashboard.png
  Screenshot: dashboard-desktop.png
  ❌ MISMATCH: 17 pixels different (0.00%)
  📄 Diff saved: dashboard-desktop.diff.png
```

### Summary Report
```
📊 SUMMARY
============================================================

⚠ Warnings (1):
  - Size mismatch for dashboard-mobile

📈 Results:
  Total comparisons: 2
  Matches: 0
  Mismatches: 2

  Details:
    ❌ dashboard-desktop: 0.00% difference
    ❌ dashboard-mobile: 79.30% difference

⏱ Total execution time: 10.95s
```

## Output Files

### Screenshots
Generated screenshots are saved to `output/screenshots/`:
- Named as `{page-name}-{viewport-name}.png`
- Full-page screenshots by default
- Example: `dashboard-desktop.png`, `dashboard-mobile.png`

### Diff Images
Visual diff images are saved to `output/diffs/`:
- Named as `{page-name}-{viewport-name}.diff.png`
- Highlights differences in pink
- Example: `dashboard-desktop.diff.png`

## Exit Codes

- **0**: All comparisons passed (no visual differences)
- **1**: Visual mismatches detected or errors occurred

This makes it easy to integrate with CI/CD pipelines.

## Best Practices

### 1. Design Export Preparation
- ✅ Export designs at the exact viewport dimensions you're testing
- ✅ Use consistent device scale factors
- ✅ Export as PNG for best quality
- ❌ Avoid JPEG (lossy compression causes false positives)

### 2. Test Data Management
- ✅ Use deterministic, seeded test data
- ✅ Set up dedicated test/QA users
- ✅ Mock time-sensitive data (dates, timestamps)
- ❌ Avoid random data or live API calls

### 3. Authentication
- ✅ Use `globalActions` for login flows
- ✅ Set auth cookies or tokens via `setCookie` or `setLocalStorage`
- ✅ Create test users with predictable data
- ❌ Avoid manual login or production credentials

### 4. SPA Considerations
- ✅ Use `waitForSelector` instead of `waitForNavigation` for route changes
- ✅ Wait for specific elements that indicate the page is ready
- ✅ Use `waitForTimeout` as a last resort for animations
- ❌ Don't rely solely on URL changes for navigation detection

### 5. Handling Dynamic Content
```json
{
  "actions": [
    { "type": "waitForSelector", "selector": ".data-loaded" },
    { "type": "waitForTimeout", "timeout": 1000 }
  ]
}
```

## Troubleshooting

### Size Mismatches
**Problem**: Design and screenshot have different dimensions
```
⚠ Size mismatch for dashboard-mobile (design: 1440x900, screenshot: 390x1250)
```

**Solutions**:
- Export design at the correct viewport size
- Update viewport configuration to match design
- Create separate designs for each viewport

### Connection Refused
**Problem**: Cannot connect to application
```
page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:8080/
```

**Solutions**:
- Ensure your application is running
- Check the `baseUrl` in config.json
- Verify the port number is correct

### Element Not Found
**Problem**: Selector doesn't match any elements
```
✗ Error capturing dashboard: Timeout waiting for selector
```

**Solutions**:
- Verify the selector is correct
- Increase timeout in `waitForSelector` options
- Check if element is in an iframe
- Wait for previous actions to complete

### False Positives
**Problem**: Test fails but visuals look identical

**Solutions**:
- Increase `threshold` value (default: 0.1)
- Check for anti-aliasing differences
- Ensure fonts are loaded consistently
- Mock dynamic content (dates, random data)

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Visual Regression Tests

on: [push, pull_request]

jobs:
  visual-tests:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: |
          npm install
          cd ux-compare && npm install
      
      - name: Start application
        run: npm start &
        
      - name: Wait for application
        run: npx wait-on http://localhost:8080
      
      - name: Run visual tests
        run: cd ux-compare && npm run compare
      
      - name: Upload diff images
        if: failure()
        uses: actions/upload-artifact@v3
        with:
          name: visual-diffs
          path: ux-compare/output/diffs/
```

## Advanced Usage

### Multiple Environments

Create separate config files:
- `config.dev.json`
- `config.staging.json`
- `config.prod.json`

Run with specific config:
```bash
npm run compare -- --config config.staging.json
```

### Custom Viewport Presets

```json
{
  "viewports": [
    { "name": "mobile-sm", "width": 375, "height": 667, "deviceScaleFactor": 2 },
    { "name": "mobile-lg", "width": 428, "height": 926, "deviceScaleFactor": 3 },
    { "name": "tablet", "width": 768, "height": 1024, "deviceScaleFactor": 2 },
    { "name": "desktop", "width": 1440, "height": 900, "deviceScaleFactor": 1 },
    { "name": "desktop-xl", "width": 1920, "height": 1080, "deviceScaleFactor": 1 }
  ]
}
```

## License

MIT
