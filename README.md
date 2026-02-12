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
  "failureThreshold": 1.0,
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
      "designImages": {
        "desktop": "designs/dashboard-desktop.png",
        "mobile": "designs/dashboard-mobile.png"
      },
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
| `threshold` | number | Pixel matching threshold (0-1) for pixelmatch | `0.1` |
| `failureThreshold` | number | Percentage difference to consider as failure (%) | `0.5` |
| `viewports` | array | List of viewport configurations | See below |
| `globalActions` | array | Actions to run once before all pages | `[]` |
| `pages` | array | List of pages to capture and compare | `[]` |

### Understanding Thresholds

The tool uses two threshold values to give you fine-grained control over what constitutes a failure:

#### `threshold` (Pixel Matching Sensitivity)
- Range: `0.0` to `1.0`
- Controls how similar two pixels need to be to be considered "matching"
- Lower values = stricter matching (more sensitive to tiny color differences)
- Higher values = looser matching (more forgiving of minor color variations)
- Default: `0.1` (recommended for most cases)
- This is passed directly to pixelmatch library

#### `failureThreshold` (Failure Percentage)
- Range: `0` to `100` (percentage)
- Controls what percentage of different pixels causes the test to FAIL
- Differences below this threshold are marked as "ACCEPTABLE" (exit code 0)
- Differences above this threshold are marked as "FAILURE" (exit code 1)
- Default: `0.5%`
- Examples:
  - `0.1` = Fail if more than 0.1% of pixels differ (very strict)
  - `1.0` = Fail if more than 1% of pixels differ (recommended)
  - `5.0` = Fail if more than 5% of pixels differ (lenient)

**Example scenarios:**
- **0.00% difference**: Perfect match ✅
- **0.05% difference** (with `failureThreshold: 1.0`): Acceptable ⚠️ (minor anti-aliasing differences)
- **2.50% difference** (with `failureThreshold: 1.0`): Failure ❌ (significant visual differences)

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

### Multiple Viewports and Design Mapping

When testing multiple viewports, use the `designImages` object to map each viewport to its corresponding design file. The **viewport `name`** is used as the key in the `designImages` object.

#### Important Notes:
- ✅ The `name` property in each viewport configuration is the identifier
- ✅ Use the same `name` as the key in `designImages` for each page
- ✅ You can have as many viewports as needed (mobile, tablet, desktop, desktop-xl, etc.)
- ✅ Not every page needs designs for every viewport - omit keys for missing designs
- ✅ Missing designs will be skipped (screenshot will still be captured)

#### Example with 4 Viewports:

```json
{
  "viewports": [
    { "name": "mobile", "width": 390, "height": 844, "deviceScaleFactor": 2 },
    { "name": "tablet", "width": 768, "height": 1024, "deviceScaleFactor": 2 },
    { "name": "desktop", "width": 1440, "height": 900, "deviceScaleFactor": 1 },
    { "name": "desktop-xl", "width": 1920, "height": 1080, "deviceScaleFactor": 1 }
  ],
  "pages": [
    {
      "name": "homepage",
      "path": "/",
      "designImages": {
        "mobile": "designs/homepage-mobile.png",
        "tablet": "designs/homepage-tablet.png",
        "desktop": "designs/homepage-desktop.png",
        "desktop-xl": "designs/homepage-desktop-xl.png"
      }
    },
    {
      "name": "checkout",
      "path": "/checkout",
      "designImages": {
        "mobile": "designs/checkout-mobile.png",
        "desktop": "designs/checkout-desktop.png"
      }
    }
  ]
}
```

In this example:
- **homepage** has designs for all 4 viewports - all will be compared
- **checkout** only has designs for mobile and desktop - tablet and desktop-xl screenshots will be captured but comparison will be skipped

#### Legacy `designImage` Format:
The single `designImage` property is still supported for backwards compatibility but only works with one viewport. Use `designImages` (plural) for multi-viewport testing.

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
Pixel threshold: 0.1
Failure threshold: 1%

Comparing: dashboard-desktop
  Design: designs/dashboard.png (1440x900)
  Screenshot: dashboard-desktop.png (1440x900)
  ⚠️  ACCEPTABLE: 17 of 1,296,000 pixels different (0.00%)
     Within acceptable threshold of 1%
  📄 Diff saved: dashboard-desktop.diff.png

Comparing: dashboard-mobile
  Design: designs/dashboard.png (1440x900)
  Screenshot: dashboard-mobile.png (390x1250)
  ❌ FAILURE: 386,598 of 487,500 pixels different (79.30%)
     Exceeds failure threshold of 1%
  📄 Diff saved: dashboard-mobile.diff.png
```

### Summary Report
```
📊 SUMMARY
============================================================

⚠ Warnings (1):
  - Size mismatch for dashboard-mobile

📈 Results:
  Total comparisons: 2
  Perfect matches: 0
  Acceptable differences: 1
  Failures: 1
  Average difference: 39.65%
  Maximum difference: 79.30%
  Failure threshold: 1%

  Details:
    ⚠️ ACCEPTABLE: dashboard-desktop - 0.00% difference (17 pixels)
    ❌ FAIL: dashboard-mobile - 79.30% difference (386,598 pixels)

⏱ Total execution time: 10.96s
============================================================

❌ Visual comparison FAILED: 1 comparison(s) exceeded 1% threshold (avg 79.30% difference)
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

- **0**: All comparisons passed
  - All images are perfect matches (0% difference), OR
  - All differences are within acceptable `failureThreshold`
- **1**: Visual comparison failed
  - One or more comparisons exceeded the `failureThreshold`, OR
  - Errors occurred during execution

This makes it easy to integrate with CI/CD pipelines while allowing for acceptable minor differences (e.g., anti-aliasing, font rendering variations).

## Best Practices

### 1. Setting Appropriate Thresholds

Choose your `failureThreshold` based on your use case:

**Strict (0.1% - 0.5%)**
- Use when: Pixel-perfect accuracy is required
- Good for: Marketing pages, brand-critical layouts
- Warning: May flag minor anti-aliasing differences

**Recommended (1.0% - 2.0%)**
- Use when: General UI testing with some tolerance
- Good for: Most web applications
- Allows: Minor font rendering and anti-aliasing variations

**Lenient (3.0% - 5.0%)**
- Use when: Testing dynamic content or data-heavy pages
- Good for: Dashboards with charts, user-generated content
- Allows: Moderate visual variations

**Example configurations:**
```json
{
  "threshold": 0.1,
  "failureThreshold": 1.0  // Recommended starting point
}
```

### 2. Design Export Preparation
- ✅ Export designs at the exact viewport dimensions you're testing
- ✅ Use consistent device scale factors
- ✅ Export as PNG for best quality
- ❌ Avoid JPEG (lossy compression causes false positives)

### 3. Test Data Management
- ✅ Use deterministic, seeded test data
- ✅ Set up dedicated test/QA users
- ✅ Mock time-sensitive data (dates, timestamps)
- ❌ Avoid random data or live API calls

### 4. Authentication
- ✅ Use `globalActions` for login flows
- ✅ Set auth cookies or tokens via `setCookie` or `setLocalStorage`
- ✅ Create test users with predictable data
- ❌ Avoid manual login or production credentials

### 5. SPA Considerations
- ✅ Use `waitForSelector` instead of `waitForNavigation` for route changes
- ✅ Wait for specific elements that indicate the page is ready
- ✅ Use `waitForTimeout` as a last resort for animations
- ❌ Don't rely solely on URL changes for navigation detection

### 6. Handling Dynamic Content
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

You can define as many viewports as needed for your testing requirements:

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

**Important**: Remember to use the viewport `name` values as keys in your `designImages` object for each page. See [Multiple Viewports and Design Mapping](#multiple-viewports-and-design-mapping) for details on how to map designs to viewports.

## License

MIT
