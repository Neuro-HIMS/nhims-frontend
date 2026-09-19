#!/usr/bin/env node
// Verifies WCAG contrast ratios for the design tokens in app/globals.css.
// No dependencies — parses the `:root { ... }` block and checks HSL triplets.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const cssPath = path.join(__dirname, "..", "app", "globals.css");
const css = readFileSync(cssPath, "utf8");

// Grab the first `:root { ... }` block only (light theme — the app has no dark mode).
const rootMatch = css.match(/:root\s*\{([\s\S]*?)\n\s*\}/);
if (!rootMatch) {
  console.error("Could not find a :root block in app/globals.css");
  process.exit(1);
}
const rootBody = rootMatch[1];

const tokens = {};
for (const line of rootBody.split("\n")) {
  const m = line.match(/--([a-z0-9-]+):\s*([\d.]+)\s+([\d.]+)%\s+([\d.]+)%\s*;/i);
  if (m) {
    const [, name, h, s, l] = m;
    tokens[name] = { h: Number(h), s: Number(s), l: Number(l) };
  }
}

function hslToRgb({ h, s, l }) {
  const S = s / 100;
  const L = l / 100;
  const C = (1 - Math.abs(2 * L - 1)) * S;
  const X = C * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = L - C / 2;
  let r1 = 0, g1 = 0, b1 = 0;
  if (h < 60) [r1, g1, b1] = [C, X, 0];
  else if (h < 120) [r1, g1, b1] = [X, C, 0];
  else if (h < 180) [r1, g1, b1] = [0, C, X];
  else if (h < 240) [r1, g1, b1] = [0, X, C];
  else if (h < 300) [r1, g1, b1] = [X, 0, C];
  else [r1, g1, b1] = [C, 0, X];
  return { r: r1 + m, g: g1 + m, b: b1 + m };
}

function channelLuminance(c) {
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function relativeLuminance(hsl) {
  const { r, g, b } = hslToRgb(hsl);
  return 0.2126 * channelLuminance(r) + 0.7152 * channelLuminance(g) + 0.0722 * channelLuminance(b);
}

const WHITE = { h: 0, s: 0, l: 100 };

function contrast(a, b) {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const lighter = Math.max(la, lb);
  const darker = Math.min(la, lb);
  return (lighter + 0.05) / (darker + 0.05);
}

function fmt(ratio) {
  return `${ratio.toFixed(2)}:1`;
}

const checks = [];
let failures = 0;

function check(label, a, b, minRatio) {
  if (!a || !b) {
    checks.push({ label, ok: false, note: "token not found" });
    failures++;
    return;
  }
  const ratio = contrast(a, b);
  const ok = ratio >= minRatio;
  if (!ok) failures++;
  checks.push({ label, ok, note: `${fmt(ratio)} (need >= ${minRatio}:1)` });
}

// Text tokens on white >= 4.5:1
for (const name of ["foreground", "muted-foreground"]) {
  check(`--${name} on white`, tokens[name], WHITE, 4.5);
}

// Control borders >= 3:1 (WCAG 1.4.11 non-text contrast)
check("--input on white", tokens["input"], WHITE, 3);

// Sidebar text on sidebar background >= 4.5:1
check("--sidebar-foreground on --sidebar", tokens["sidebar-foreground"], tokens["sidebar"], 4.5);

// White text on primary buttons >= 4.5:1
check("white on --primary", WHITE, tokens["primary"], 4.5);

// Every --x on --x-bg >= 4.5:1
const bgTokenNames = Object.keys(tokens).filter((n) => n.endsWith("-bg"));
for (const bgName of bgTokenNames) {
  const base = bgName.slice(0, -3);
  if (tokens[base]) {
    check(`--${base} on --${bgName}`, tokens[base], tokens[bgName], 4.5);
  }
}

for (const c of checks) {
  console.log(`${c.ok ? "PASS" : "FAIL"}  ${c.label.padEnd(40)} ${c.note}`);
}

if (failures > 0) {
  console.error(`\n${failures} contrast check(s) failed.`);
  process.exit(1);
}
console.log(`\nAll ${checks.length} contrast checks passed.`);
