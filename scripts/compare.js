const fs = require("fs/promises");
const path = require("path");
const { existsSync } = require("node:fs");
const { chromium } = require("playwright");
const pixelmatch = require("pixelmatch");
const { PNG } = require("pngjs");
const sharp = require("sharp");

const DEFAULT_CONFIG = {
  baseUrl: "http://localhost:8080/",
  outputDir: "output",
  threshold: 0.1,
  failureThreshold: 0.5,
  viewports: [
    { name: "desktop", width: 1440, height: 900, deviceScaleFactor: 1 }
  ],
  pages: []
};

const CONFIG_ARG = "--config";

const parseArgs = () => {
  const idx = process.argv.indexOf(CONFIG_ARG);
  if (idx !== -1 && process.argv[idx + 1]) {
    return process.argv[idx + 1];
  }
  return "config.json";
};

const readJson = async (filePath) => {
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(raw);
};

const ensureDir = async (dirPath) => {
  await fs.mkdir(dirPath, { recursive: true });
};

const loadPng = async (filePath) => {
  const buffer = await fs.readFile(filePath);
  return PNG.sync.read(buffer);
};

const savePng = async (png, filePath) => {
  const buffer = PNG.sync.write(png);
  await fs.writeFile(filePath, buffer);
};

const resizeImage = async (imagePath, width, height) => {
  const buffer = await sharp(imagePath)
    .resize(width, height, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .png()
    .toBuffer();
  return PNG.sync.read(buffer);
};

const normalizeName = (value) =>
  value.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-").replaceAll(/^-|-$/g, "");

const resolveConfig = async () => {
  const configPath = path.resolve(parseArgs());
  if (!existsSync(configPath)) {
    throw new Error(`Config not found: ${configPath}`);
  }
  const configDir = path.dirname(configPath);
  const userConfig = await readJson(configPath);
  const config = { ...DEFAULT_CONFIG, ...userConfig };

  // Ensure baseUrl ends with / for consistent URL resolution
  if (config.baseUrl && !config.baseUrl.endsWith('/')) {
    config.baseUrl = config.baseUrl + '/';
  }

  return { configDir, configPath, config };
};

const resolveDesignPath = (configDir, designImage) =>
  path.resolve(configDir, designImage);

const runActions = async (page, actions, baseUrl) => {
  if (!Array.isArray(actions) || actions.length === 0) {
    return;
  }

  for (const action of actions) {
    if (!action || !action.type) {
      throw new Error("Action is missing a type.");
    }

    const startTime = Date.now();
    
    switch (action.type) {
      case "goto": {
        const url = new URL(action.url, baseUrl).toString();
        console.log(`    → Navigating to: ${url}`);
        // Convert Puppeteer's waitUntil options to Playwright equivalents
        let waitUntil = action.waitUntil || "networkidle";
        if (waitUntil === "networkidle0" || waitUntil === "networkidle2") {
          waitUntil = "networkidle";
        }
        await page.goto(url, { waitUntil });
        console.log(`    ✓ Loaded in ${Date.now() - startTime}ms`);
        break;
      }
      case "reload": {
        let waitUntil = action.waitUntil || "networkidle";
        if (waitUntil === "networkidle0" || waitUntil === "networkidle2") {
          waitUntil = "networkidle";
        }
        await page.reload({ waitUntil });
        break;
      }
      case "click": {
        console.log(`    → Clicking: ${action.selector}`);
        let retries = 3;
        while (retries > 0) {
          try {
            if (action.waitForNavigation) {
              // For SPAs, we need to wait for URL change or network idle
              const currentUrl = page.url();
              await page.click(action.selector, action.options || {});
              
              // Wait for either URL change or network idle (whichever comes first)
              try {
                await Promise.race([
                  page.waitForURL(url => url !== currentUrl, { timeout: action.navigationOptions?.timeout || 10000 }),
                  page.waitForLoadState('networkidle', { timeout: action.navigationOptions?.timeout || 10000 })
                ]);
              } catch (e) {
                // If neither happens, just continue - might be a SPA without URL change
              }
              
              // Add a small delay after navigation to let page stabilize (helps with SPAs)
              await page.waitForTimeout(500);
            } else {
              await page.click(action.selector, action.options || {});
            }
            break;
          } catch (error) {
            if (error.message.includes('Target page, context or browser has been closed') || 
                error.message.includes('Unable to find element')) {
              retries--;
              if (retries > 0) {
                await page.waitForTimeout(500);
                continue;
              }
            }
            throw error;
          }
        }
        break;
      }
      case "type": {
        console.log(`    → Typing into: ${action.selector}`);
        // Retry logic to handle stale context errors
        let retries = 3;
        while (retries > 0) {
          try {
            // Playwright prefers fill() for input fields, but we can use type() for character-by-character
            const options = action.options || {};
            if (options.delay !== undefined) {
              await page.locator(action.selector).pressSequentially(action.text || "", { delay: options.delay });
            } else {
              await page.locator(action.selector).fill(action.text || "");
            }
            break;
          } catch (error) {
            if (error.message.includes('Target page, context or browser has been closed') || 
                error.message.includes('Unable to find element')) {
              retries--;
              if (retries > 0) {
                await page.waitForTimeout(500);
                continue;
              }
            }
            throw error;
          }
        }
        break;
      }
      case "press":
        await page.keyboard.press(action.key, action.options || {});
        break;
      case "select": {
        if (Array.isArray(action.values)) {
          await page.selectOption(action.selector, action.values);
        } else if (action.value) {
          await page.selectOption(action.selector, action.value);
        } else {
          throw new Error(`Select action missing value(s): ${action.selector}`);
        }
        break;
      }
      case "waitForSelector": {
        console.log(`    → Waiting for selector: ${action.selector}`);
        // Retry logic to handle stale context errors (common in SPAs)
        let retries = 3;
        let lastError;
        while (retries > 0) {
          try {
            const options = action.options || {};
            // Convert Puppeteer options to Playwright (support both state string and visible/hidden booleans)
            const state = options.state ?? (options.visible ? 'visible' : options.hidden ? 'hidden' : 'attached');
            const playwrightOptions = {
              timeout: options.timeout,
              state
            };
            await page.waitForSelector(action.selector, playwrightOptions);
            break;
          } catch (error) {
            lastError = error;
            if (error.message.includes('Target page, context or browser has been closed')) {
              retries--;
              if (retries > 0) {
                await page.waitForTimeout(500);
                continue;
              }
            }
            throw error;
          }
        }
        break;
      }
      case "waitForXPath": {
        // Retry logic to handle stale context errors (common in SPAs)
        let retries = 3;
        let lastError;
        while (retries > 0) {
          try {
            const locator = page.locator(`xpath=${action.xpath}`);
            await locator.waitFor(action.options || {});
            break;
          } catch (error) {
            lastError = error;
            if (error.message.includes('Target page, context or browser has been closed')) {
              retries--;
              if (retries > 0) {
                await page.waitForTimeout(500);
                continue;
              }
            }
            throw error;
          }
        }
        break;
      }
      case "clickXPath": {
        const locator = page.locator(`xpath=${action.xpath}`);
        await locator.click(action.options || {});
        break;
      }
      case "waitForTimeout":
        console.log(`    → Waiting ${action.timeout || 0}ms...`);
        await page.waitForTimeout(action.timeout || 0);
        break;
      case "waitForNavigation": {
        const waitUntil = action.options?.waitUntil || 'domcontentloaded';
        const timeout = action.options?.timeout || 10000;
        await page.waitForLoadState(waitUntil, { timeout });
        break;
      }
      case "setCookie":
        await page.context().addCookies(action.cookies || []);
        break;
      case "setLocalStorage":
        await page.evaluate((items) => {
          Object.entries(items || {}).forEach(([key, value]) => {
            localStorage.setItem(key, String(value));
          });
        }, action.items);
        break;
      default:
        throw new Error(`Unsupported action type: ${action.type}`);
    }
  }
};

const captureScreenshots = async (browser, config, configDir) => {
  const outputDir = path.resolve(configDir, config.outputDir);
  const screenshotsDir = path.join(outputDir, "screenshots");
  await ensureDir(screenshotsDir);

  const context = await browser.newContext();
  const page = await context.newPage();
  
  const results = [];
  let globalActionsExecuted = false;

  for (const viewport of config.viewports) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Processing viewport: ${viewport.name} (${viewport.width}x${viewport.height})`);
    console.log(`${'='.repeat(60)}`);
    await page.setViewportSize({
      width: viewport.width,
      height: viewport.height
    });

    // Run global actions only once (on first viewport)
    if (!globalActionsExecuted) {
      console.log('\n📋 Executing global actions...');
      const globalStart = Date.now();
      await runActions(page, config.globalActions, config.baseUrl);
      console.log(`✓ Global actions completed in ${Date.now() - globalStart}ms\n`);
      globalActionsExecuted = true;
    }

    for (const entry of config.pages) {
      const url = new URL(entry.path, config.baseUrl).toString();
      const name = normalizeName(`${entry.name}-${viewport.name}`);
      const screenshotPath = path.join(screenshotsDir, `${name}.png`);

      console.log(`\n  📸 Capturing: ${entry.name}`);
      console.log(`     URL: ${url}`);

      try {
        // Only navigate if we're not already on the target URL
        const currentURL = page.url();
        if (currentURL !== url) {
          console.log(`     → Navigating to ${url}...`);
          await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
        } else {
          console.log(`     ℹ Already on target URL`);
        }
        
        if (entry.actions && entry.actions.length > 0) {
          console.log(`     → Executing ${entry.actions.length} page action(s)...`);
        }
        await runActions(page, entry.actions, config.baseUrl);
        
        const screenshotStart = Date.now();
        await page.screenshot({ path: screenshotPath, fullPage: true });
        console.log(`     ✓ Screenshot saved: ${name}.png (${Date.now() - screenshotStart}ms)`);
      } catch (error) {
        console.error(`     ✗ Error capturing ${name}:`, error.message);
        throw error;
      }

      // Prefer viewport-specific design; fall back to shared designImage
      const designImage = entry.designImages?.[viewport.name] ?? entry.designImage;

      results.push({
        name,
        viewport: viewport.name,
        url,
        screenshotPath,
        designImage
      });
    }
  }

  await page.close();
  await context.close();
  return results;
};

const compareImages = async (configDir, outputDir, config, entries) => {
  const diffsDir = path.join(outputDir, "diffs");
  await ensureDir(diffsDir);

  console.log(`\n${'='.repeat(60)}`);
  console.log(`🔍 Comparing Images`);
  console.log(`${'='.repeat(60)}`);
  console.log(`Pixel threshold: ${config.threshold}`);
  console.log(`Failure threshold: ${config.failureThreshold}%\n`);

  let mismatches = 0;
  let failures = 0;
  const warnings = [];
  const comparisonResults = [];

  for (const entry of entries) {
    console.log(`  Comparing: ${entry.name}`);
    
    if (!entry.designImage) {
      warnings.push(`No designImage for ${entry.name}`);
      console.log(`    ⚠ No design image specified`);
      continue;
    }

    const designPath = resolveDesignPath(configDir, entry.designImage);
    if (!existsSync(designPath)) {
      warnings.push(`Design image missing: ${designPath}`);
      console.log(`    ⚠ Design image not found: ${designPath}`);
      continue;
    }

    const screenshot = await loadPng(entry.screenshotPath);
    let design = await loadPng(designPath);

    console.log(`    Design: ${entry.designImage} (${design.width}x${design.height})`);
    console.log(`    Screenshot: ${path.basename(entry.screenshotPath)} (${screenshot.width}x${screenshot.height})`);

    if (screenshot.width !== design.width || screenshot.height !== design.height) {
      const msg = `Size mismatch for ${entry.name} (design: ${design.width}x${design.height}, ` +
          `screenshot: ${screenshot.width}x${screenshot.height}), resizing design to match screenshot...`;
      warnings.push(msg);
      console.log(`    ⚠ ${msg}`);
      design = await resizeImage(designPath, screenshot.width, screenshot.height);
    }

    const diff = new PNG({ width: design.width, height: design.height });
    const diffPixels = pixelmatch(
      design.data,
      screenshot.data,
      diff.data,
      design.width,
      design.height,
      { threshold: config.threshold }
    );

    const totalPixels = design.width * design.height;
    const diffPercentage = ((diffPixels / totalPixels) * 100).toFixed(2);

    const diffPath = path.join(diffsDir, `${entry.name}.diff.png`);
    await savePng(diff, diffPath);

    const diffPercent = parseFloat(diffPercentage);
    const isFailure = diffPercent > config.failureThreshold;
    
    if (diffPixels > 0) {
      mismatches += 1;
      if (isFailure) {
        failures += 1;
        console.log(`    ❌ FAILURE: ${diffPixels.toLocaleString()} of ${totalPixels.toLocaleString()} pixels different (${diffPercentage}%)`);
        console.log(`       Exceeds failure threshold of ${config.failureThreshold}%`);
      } else {
        console.log(`    ⚠️  ACCEPTABLE: ${diffPixels.toLocaleString()} of ${totalPixels.toLocaleString()} pixels different (${diffPercentage}%)`);
        console.log(`       Within acceptable threshold of ${config.failureThreshold}%`);
      }
      console.log(`    📄 Diff saved: ${path.basename(diffPath)}`);
      comparisonResults.push({ name: entry.name, diffPixels, diffPercentage, match: false, failure: isFailure });
    } else {
      console.log(`    ✅ MATCH: ${totalPixels.toLocaleString()} pixels identical (0.00% difference)`);
      comparisonResults.push({ name: entry.name, diffPixels: 0, diffPercentage: '0.00', match: true, failure: false });
    }
    console.log('');
  }

  return { mismatches, failures, warnings, comparisonResults };
};

const main = async () => {
  const startTime = Date.now();
  const { config, configDir } = await resolveConfig();
  const outputDir = path.resolve(configDir, config.outputDir);
  await ensureDir(outputDir);

  console.log(`\n${'='.repeat(60)}`);
  console.log(`🚀 UX Compare Tool`);
  console.log(`${'='.repeat(60)}`);
  console.log(`Base URL: ${config.baseUrl}`);
  console.log(`Output Directory: ${config.outputDir}`);
  console.log(`Threshold: ${config.threshold}`);
  console.log(`Viewports: ${config.viewports.map(v => v.name).join(', ')}`);
  console.log(`Pages: ${config.pages.length}`);

  const browser = await chromium.launch({
    // headless: false,
    // slowMo: 100,
    // devtools: true
  });
  let exitCode = 0;

  try {
    const captures = await captureScreenshots(browser, config, configDir);
    const result = await compareImages(configDir, outputDir, config, captures);

    console.log(`\n${'='.repeat(60)}`);
    console.log(`📊 SUMMARY`);
    console.log(`${'='.repeat(60)}`);
    
    if (result.warnings.length > 0) {
      console.log(`\n⚠ Warnings (${result.warnings.length}):`);
      for (const warning of result.warnings) {
        console.warn(`  - ${warning}`);
      }
    }

    console.log(`\n📈 Results:`);
    console.log(`  Total comparisons: ${result.comparisonResults?.length || 0}`);
    console.log(`  Perfect matches: ${result.comparisonResults?.filter(r => r.match).length || 0}`);
    console.log(`  Acceptable differences: ${result.comparisonResults?.filter(r => !r.match && !r.failure).length || 0}`);
    console.log(`  Failures: ${result.failures || 0}`);

    if (result.comparisonResults && result.comparisonResults.length > 0) {
      // Calculate statistics
      const totalDiff = result.comparisonResults.reduce((sum, r) => sum + parseFloat(r.diffPercentage), 0);
      const avgDiff = (totalDiff / result.comparisonResults.length).toFixed(2);
      const maxDiff = Math.max(...result.comparisonResults.map(r => parseFloat(r.diffPercentage))).toFixed(2);
      
      console.log(`  Average difference: ${avgDiff}%`);
      console.log(`  Maximum difference: ${maxDiff}%`);
      console.log(`  Failure threshold: ${config.failureThreshold}%`);

      console.log(`\n  Details:`);
      for (const r of result.comparisonResults) {
        let icon, status;
        if (r.match) {
          icon = '✅';
          status = 'MATCH';
        } else if (r.failure) {
          icon = '❌';
          status = 'FAIL';
        } else {
          icon = '⚠️';
          status = 'ACCEPTABLE';
        }
        const pixelInfo = r.diffPixels > 0 ? ` (${r.diffPixels.toLocaleString()} pixels)` : '';
        console.log(`    ${icon} ${status}: ${r.name} - ${r.diffPercentage}% difference${pixelInfo}`);
      }
    }

    const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n⏱ Total execution time: ${totalTime}s`);
    console.log(`${'='.repeat(60)}\n`);

    if (result.failures > 0) {
      const failedResults = result.comparisonResults?.filter(r => r.failure) || [];
      const avgFailureDiff = failedResults.length > 0 
        ? (failedResults.reduce((sum, r) => sum + parseFloat(r.diffPercentage), 0) / failedResults.length).toFixed(2)
        : '0.00';
      console.error(`❌ Visual comparison FAILED: ${result.failures} comparison(s) exceeded ${config.failureThreshold}% threshold (avg ${avgFailureDiff}% difference)`);
      exitCode = 1;
    } else if (result.mismatches > 0) {
      const acceptableResults = result.comparisonResults?.filter(r => !r.match && !r.failure) || [];
      const avgAcceptableDiff = acceptableResults.length > 0 
        ? (acceptableResults.reduce((sum, r) => sum + parseFloat(r.diffPercentage), 0) / acceptableResults.length).toFixed(2)
        : '0.00';
      console.log(`✅ Visual comparison PASSED: ${result.mismatches} comparison(s) with acceptable differences (avg ${avgAcceptableDiff}%, within ${config.failureThreshold}% threshold)`);
    } else {
      console.log("✅ Visual comparison PASSED: All images match 100%!");
    }
  } finally {
    await browser.close();
  }

  process.exitCode = exitCode;
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
