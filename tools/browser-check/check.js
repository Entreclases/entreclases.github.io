#!/usr/bin/env node
"use strict";
// Driver minimo (estilo chromium-cli) para probar la UI de esta app con Playwright, sin
// escribir un script de Node distinto cada vez. Ver README.md en esta carpeta para el
// listado de comandos y ejemplos. Pipeá un script de texto por stdin:
//   node check.js < script.txt
const { chromium } = require("playwright");
const readline = require("readline");
const path = require("path");
const fs = require("fs");

const SCREEN_DIR = path.join(__dirname, "screenshots");
if (!fs.existsSync(SCREEN_DIR)) fs.mkdirSync(SCREEN_DIR, { recursive: true });

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const consoleErrors = [];
  page.on("console", (msg) => { if (msg.type() === "error") consoleErrors.push(msg.text()); });
  page.on("pageerror", (err) => consoleErrors.push("pageerror: " + err.message));

  const rl = readline.createInterface({ input: process.stdin });
  let shotCount = 0;
  for await (const raw of rl) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const sp = line.indexOf(" ");
    const cmd = sp === -1 ? line : line.slice(0, sp);
    const arg = sp === -1 ? "" : line.slice(sp + 1).trim();
    try {
      if (cmd === "nav") {
        await page.goto(arg, { waitUntil: "load" });
        console.log("nav ->", arg);
      } else if (cmd === "wait-for") {
        if (arg.startsWith("text=")) await page.getByText(arg.slice(5), { exact: false }).first().waitFor({ timeout: 15000 });
        else await page.waitForSelector(arg.startsWith("selector=") ? arg.slice(9) : arg, { timeout: 15000 });
        console.log("wait-for ok:", arg);
      } else if (cmd === "click") {
        await page.click(arg);
        console.log("click ok:", arg);
      } else if (cmd === "fill") {
        const i = arg.indexOf(" ");
        await page.fill(arg.slice(0, i), arg.slice(i + 1));
        console.log("fill ok:", arg.slice(0, i));
      } else if (cmd === "press") {
        await page.keyboard.press(arg);
        console.log("press ok:", arg);
      } else if (cmd === "eval") {
        // Statements, no auto-wrap: escribí "return ..." vos mismo si querés recuperar un valor.
        const result = await page.evaluate(new Function(arg));
        console.log("eval ->", JSON.stringify(result));
      } else if (cmd === "screenshot" || cmd === "screenshot-viewport") {
        shotCount++;
        const name = arg || `shot-${shotCount}`;
        const file = path.join(SCREEN_DIR, name.endsWith(".png") ? name : name + ".png");
        await page.screenshot({ path: file, fullPage: cmd === "screenshot" });
        console.log("screenshot ->", file);
      } else if (cmd === "console-errors") {
        console.log(consoleErrors.length ? consoleErrors.join("\n") : "(sin errores de consola)");
      } else if (cmd === "sleep") {
        await new Promise((r) => setTimeout(r, parseInt(arg, 10) || 500));
      } else {
        console.log("comando desconocido:", cmd);
      }
    } catch (e) {
      console.log(`ERROR en "${line}":`, e.message);
    }
  }
  await browser.close();
}

main();
