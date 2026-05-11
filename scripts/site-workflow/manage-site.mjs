#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDir, "../..");
const configPath = path.join(scriptDir, "site-pages.json");
const indexPath = path.join(root, "index.html");
const pagesDir = path.join(root, "pages");

const startMarker = "      <!-- LOUISKO_APP_CARDS_START -->";
const endMarker = "      <!-- LOUISKO_APP_CARDS_END -->";

const icons = {
  grid: '<path d="M4 4h16v16H4z"/><path d="M4 10h16"/><path d="M10 4v16"/>',
  backup: '<path d="M12 3v18"/><path d="M5 7h14"/><path d="M7 21h10"/><path d="M7 3h10"/>',
  repo: '<path d="M7 7h10v10H7z"/><path d="M3 3h4v4H3z"/><path d="M17 3h4v4h-4z"/><path d="M3 17h4v4H3z"/><path d="M17 17h4v4h-4z"/>',
  pulse: '<path d="M4 12h4l2-7 4 14 2-7h4"/>',
  document: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6"/><path d="M8 13h8"/><path d="M8 17h5"/>',
  link: '<path d="M10 13a5 5 0 0 0 7.07 0l2.12-2.12a5 5 0 0 0-7.07-7.07L11 4.93"/><path d="M14 11a5 5 0 0 0-7.07 0L4.81 13.12a5 5 0 0 0 7.07 7.07L13 19.07"/>',
  tool: '<path d="M14.7 6.3a4 4 0 0 0-5 5L4 17v3h3l5.7-5.7a4 4 0 0 0 5-5L15 12l-3-3z"/>'
};

function usage() {
  console.log(`Louisko site workflow

Usage:
  node scripts/site-workflow/manage-site.mjs list
  node scripts/site-workflow/manage-site.mjs add-page --slug <slug> --title <title> --description <text> [--code 000000]
  node scripts/site-workflow/manage-site.mjs add-link --slug <slug> --title <title> --description <text> --href <url> [--code 000000]
  node scripts/site-workflow/manage-site.mjs refresh-home
  node scripts/site-workflow/manage-site.mjs verify
  node scripts/site-workflow/manage-site.mjs publish --message <commit message> [--zeabur]

Notes:
  - Future tool pages are created under pages/<slug>.html.
  - Existing files are not overwritten.
  - publish runs verify, git add, git commit when needed, git push, and optionally Zeabur CLI deploy.
`);
}

function readConfig() {
  return JSON.parse(readFileSync(configPath, "utf8"));
}

function writeConfig(config) {
  writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`);
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const item = argv[i];
    if (!item.startsWith("--")) continue;
    const key = item.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) {
      args[key] = true;
    } else {
      args[key] = next;
      i += 1;
    }
  }
  return args;
}

function requireArg(args, key) {
  if (!args[key]) {
    throw new Error(`Missing required option --${key}`);
  }
  return String(args[key]);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function slugToFile(slug) {
  if (!/^[a-z0-9][a-z0-9-]*$/.test(slug)) {
    throw new Error("Slug must use lowercase letters, numbers, and hyphens only.");
  }
  return path.join(pagesDir, `${slug}.html`);
}

function cardHtml(card) {
  const classes = ["portal-button"];
  if (card.code !== false) classes.push("private-link");
  if (card.primary) classes.push("primary");
  const code = card.code === false ? "" : ` data-code="${escapeHtml(card.code || "000000")}"`;
  const title = ` data-title="${escapeHtml(card.title)}"`;
  return `      <a class="${classes.join(" ")}" href="${escapeHtml(card.href)}"${code}${title}>${escapeHtml(card.title)}</a>`;
}

function refreshHome() {
  const config = readConfig();
  const html = readFileSync(indexPath, "utf8");
  const start = html.indexOf(startMarker);
  const end = html.indexOf(endMarker);
  if (start === -1 || end === -1 || end < start) {
    throw new Error("Could not find homepage card markers in index.html.");
  }
  const before = html.slice(0, start + startMarker.length);
  const after = html.slice(end);
  const cards = config.cards.map(cardHtml).join("\n\n");
  writeFileSync(indexPath, `${before}\n${cards}\n${after}`);
  console.log(`Updated homepage cards in ${path.relative(root, indexPath)}.`);
}

function pageTemplate({ title, description }) {
  return `<!DOCTYPE html>
<html lang="zh-Hant">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${escapeHtml(title)}｜Louisko</title>
<style>
:root{--bg:#f4f1ea;--ink:#272520;--muted:#777168;--line:rgba(39,37,32,.16);--panel:#fbfaf6;--accent:#8b2f23}
*{box-sizing:border-box}
body{margin:0;color:var(--ink);background:var(--bg);font-family:-apple-system,BlinkMacSystemFont,"Noto Sans TC","PingFang TC","Microsoft JhengHei",sans-serif;line-height:1.7}
a{color:inherit}
.shell{max-width:980px;margin:0 auto;padding:28px 20px 64px}
.top{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:42px}
.brand{font-weight:900;text-decoration:none}
.back{border:1px solid var(--line);background:white;border-radius:999px;padding:10px 16px;text-decoration:none;font-weight:800}
.hero{padding:34px 0 28px;border-bottom:1px solid var(--line)}
.eyebrow{color:var(--accent);font-size:12px;font-weight:900;text-transform:uppercase;letter-spacing:.14em}
h1{font-family:Georgia,"Times New Roman",serif;font-weight:400;font-size:48px;line-height:1.08;margin:10px 0 14px;letter-spacing:0}
.lead{color:var(--muted);font-size:18px;margin:0;max-width:720px}
.content{margin-top:30px;border:1px solid var(--line);background:var(--panel);border-radius:16px;padding:24px}
@media(max-width:620px){.top{align-items:flex-start;flex-direction:column}h1{font-size:34px}.back{width:100%;text-align:center}}
</style>
</head>
<body>
<main class="shell">
  <nav class="top">
    <a class="brand" href="../index.html">Louisko</a>
    <a class="back" href="../index.html">回首頁</a>
  </nav>
  <section class="hero">
    <div class="eyebrow">Louisko page</div>
    <h1>${escapeHtml(title)}</h1>
    <p class="lead">${escapeHtml(description)}</p>
  </section>
  <section class="content">
    <p>這是新建立的次頁模板。之後可以在這裡加入實際內容、表單、工具或連結。</p>
  </section>
</main>
</body>
</html>
`;
}

function addCard(card) {
  const config = readConfig();
  if (config.cards.some(existing => existing.slug === card.slug)) {
    throw new Error(`Card slug already exists: ${card.slug}`);
  }
  config.cards.push(card);
  writeConfig(config);
  refreshHome();
}

function addPage(args) {
  const slug = requireArg(args, "slug");
  const title = requireArg(args, "title");
  const description = requireArg(args, "description");
  const filePath = slugToFile(slug);
  if (existsSync(filePath)) {
    throw new Error(`Page already exists: ${path.relative(root, filePath)}`);
  }
  mkdirSync(pagesDir, { recursive: true });
  writeFileSync(filePath, pageTemplate({ title, description }));
  addCard({
    slug,
    title,
    description,
    href: `pages/${slug}.html`,
    code: args.code || "000000"
  });
  console.log(`Created ${path.relative(root, filePath)}.`);
}

function addLink(args) {
  const slug = requireArg(args, "slug");
  addCard({
    slug,
    title: requireArg(args, "title"),
    description: requireArg(args, "description"),
    href: requireArg(args, "href"),
    code: args.code || false,
    external: true
  });
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: "inherit",
    shell: false,
    ...options
  });
  if (result.status !== 0) {
    throw new Error(`Command failed: ${command} ${args.join(" ")}`);
  }
}

function capture(command, args) {
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: "utf8",
    shell: false
  });
  if (result.status !== 0) {
    throw new Error(result.stderr || `Command failed: ${command} ${args.join(" ")}`);
  }
  return result.stdout.trim();
}

function verify() {
  const config = readConfig();
  const html = readFileSync(indexPath, "utf8");
  if (!html.includes(startMarker) || !html.includes(endMarker)) {
    throw new Error("index.html is missing Louisko card markers.");
  }
  for (const card of config.cards) {
    if (!html.includes(`href="${card.href}"`)) {
      throw new Error(`Homepage is missing card href: ${card.href}`);
    }
    if (!card.external && !card.href.startsWith("#")) {
      const target = path.join(root, card.href);
      if (!existsSync(target)) {
        throw new Error(`Local card target does not exist: ${card.href}`);
      }
    }
  }
  for (const required of ["index.html", "bazi.html", "Dockerfile", "README.md", "AGENTS.md"]) {
    if (!existsSync(path.join(root, required))) {
      throw new Error(`Missing required file: ${required}`);
    }
  }
  console.log("Site workflow verification passed.");
}

function deployZeabur() {
  const zshCommand = [
    'ZEABUR_TOKEN=$(awk -F "ZEABUR_TOKEN = " \'/ZEABUR_TOKEN/ {gsub(/[\\\"{}, ]/,"",$2); print $2; exit}\' /Users/kolouis/.codex/config.toml)',
    '/Users/kolouis/Desktop/AI_八字/.tools/bin/npx -y zeabur@latest deploy --project-id 6a008755e6a21fff4d962fee --service-id 6a0088674a961c814e9ee899 --environment-id 6a008755e5ed304c1d845a06 --interactive=false --json'
  ].join(" ");
  run("/bin/zsh", ["-lc", zshCommand]);
}

function publish(args) {
  const message = requireArg(args, "message");
  verify();
  run("git", ["add", "index.html", "bazi.html", "pages", "Dockerfile", ".dockerignore", "README.md", "AGENTS.md", "manifest.json", "scripts/site-workflow"]);
  const status = capture("git", ["status", "--short"]);
  if (status) {
    run("git", ["commit", "-m", message]);
  } else {
    console.log("No local changes to commit.");
  }
  run("git", ["push", "origin", "main"]);
  if (args.zeabur) {
    deployZeabur();
  }
}

try {
  const [command, ...rest] = process.argv.slice(2);
  const args = parseArgs(rest);
  switch (command) {
    case "list": {
      const config = readConfig();
      for (const card of config.cards) {
        console.log(`${card.slug}\t${card.href}\t${card.title}`);
      }
      break;
    }
    case "add-page":
      addPage(args);
      break;
    case "add-link":
      addLink(args);
      break;
    case "refresh-home":
      refreshHome();
      break;
    case "verify":
      verify();
      break;
    case "publish":
      publish(args);
      break;
    default:
      usage();
      process.exit(command ? 1 : 0);
  }
} catch (error) {
  console.error(`Error: ${error.message}`);
  process.exit(1);
}
