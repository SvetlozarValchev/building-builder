import puppeteer from "puppeteer";
import * as path from "path";
import * as fs from "fs";

const SCREENSHOT_DIR = path.join(process.cwd(), "public");
const SCREENSHOT_PATH = path.join(SCREENSHOT_DIR, "screenshot.png");
const RENDERER_URL = "http://localhost:5173";

export async function takeScreenshot(
  cameraAngle?: string,
  lookAt?: { x: number; y: number; z: number },
  cameraPos?: { x: number; y: number; z: number }
): Promise<{ imagePath: string; base64: string }> {
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--enable-webgl",
      "--enable-unsafe-swiftshader",
      "--use-gl=swiftshader",
    ],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });

    // Use domcontentloaded instead of networkidle0 — polling requests keep the page "busy"
    await page.goto(RENDERER_URL, { waitUntil: "domcontentloaded", timeout: 15000 });

    // Wait for Three.js canvas to appear
    await page.waitForSelector("canvas", { timeout: 10000 });

    // Give models time to load and render
    await new Promise((r) => setTimeout(r, 5000));

    // Set camera position and look-at target
    const camConfig = {
      angle: cameraAngle || "iso",
      lookAt: lookAt || null,
      cameraPos: cameraPos || null,
    };

    // Compute camera position and target
    let pos = { x: 35, y: 25, z: 30 };
    let target = { x: 15, y: 0, z: 4 };

    if (camConfig.cameraPos && camConfig.lookAt) {
      pos = camConfig.cameraPos;
      target = camConfig.lookAt;
    } else if (camConfig.lookAt) {
      const t = camConfig.lookAt;
      pos = { x: t.x + 15, y: t.y + 15, z: t.z + 15 };
      target = t;
    } else {
      switch (camConfig.angle) {
        case "top":
          pos = { x: 20, y: 60, z: 0.1 };
          target = { x: 20, y: 0, z: 0 };
          break;
        case "front":
          pos = { x: 20, y: 10, z: 30 };
          target = { x: 20, y: 2, z: 0 };
          break;
        case "side":
          pos = { x: -15, y: 15, z: 4 };
          target = { x: 20, y: 0, z: 4 };
          break;
        case "iso":
        default:
          pos = { x: 35, y: 25, z: 30 };
          target = { x: 15, y: 0, z: 4 };
          break;
      }
    }

    // Call the exposed window function to move camera
    await page.evaluate((p, t) => {
      const fn = (window as any).__setCameraPosition;
      if (fn) fn(p.x, p.y, p.z, t.x, t.y, t.z);
    }, pos, target);

    // Wait for re-render after camera move
    await new Promise((r) => setTimeout(r, 2000));

    // Take screenshot
    const screenshotBuffer = await page.screenshot({
      type: "png",
      encoding: "binary",
    });

    fs.writeFileSync(SCREENSHOT_PATH, screenshotBuffer);

    const base64 = Buffer.from(screenshotBuffer).toString("base64");
    return { imagePath: SCREENSHOT_PATH, base64 };
  } finally {
    await browser.close();
  }
}
