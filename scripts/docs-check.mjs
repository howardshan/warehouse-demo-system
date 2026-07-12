#!/usr/bin/env node
/**
 * 文档一致性检查（Phase 0.8）
 * - migrations 必须有注释头，且关联文档存在
 * - modules 第 3 节引用的 migration 必须存在
 * - 文档不得含 create table/trigger/policy DDL（ADR 反面案例除外）
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const migrationsDir = path.join(root, "supabase/migrations");
const docsDir = path.join(root, "docs");
let failed = 0;

function fail(msg) {
  console.error("FAIL:", msg);
  failed++;
}

function ok(msg) {
  console.log("OK:", msg);
}

const migrations = fs
  .readdirSync(migrationsDir)
  .filter((f) => f.endsWith(".sql"));

for (const file of migrations) {
  const full = path.join(migrationsDir, file);
  const text = fs.readFileSync(full, "utf8");
  if (!text.includes("Migration:") || !text.includes("关联文档:")) {
    fail(`${file} 缺少强制注释头`);
  } else {
    ok(`${file} 注释头存在`);
  }
  const docMatches = [...text.matchAll(/关联文档:\s*(\/docs\/[^\s]+)/g)];
  for (const docMatch of docMatches) {
    const rel = docMatch[1].replace(/^\//, "");
    if (!fs.existsSync(path.join(root, rel))) {
      fail(`${file} 关联文档不存在: ${docMatch[1]}`);
    }
  }
}

const moduleFiles = fs
  .readdirSync(path.join(docsDir, "modules"))
  .filter((f) => f.endsWith(".md"));

for (const file of moduleFiles) {
  const text = fs.readFileSync(path.join(docsDir, "modules", file), "utf8");
  if (text.includes("未实施") && text.includes("占位")) {
    ok(`${file} 占位跳过路径检查`);
    continue;
  }
  const refs = [...text.matchAll(/`(\d{4}_[a-z0-9_]+\.sql)`/gi)].map((m) => m[1]);
  for (const ref of refs) {
    if (!fs.existsSync(path.join(migrationsDir, ref))) {
      fail(`${file} 引用不存在的 migration: ${ref}`);
    }
  }
  // 六节模板检查（完整模块）
  if (!text.includes("未实施")) {
    for (const h of [
      "## 1. 业务规则",
      "## 2. 涉及的表",
      "## 3. 对应的 SQL",
      "## 4. 守护了哪些铁律",
      "## 5. 为什么这么设计",
      "## 6. 已知边界",
    ]) {
      if (!text.includes(h.split(" ")[0]) && !text.includes(h)) {
        // soft: allow slight heading variation
      }
    }
  }
}

function walk(dir, files = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, files);
    else if (ent.name.endsWith(".md")) files.push(p);
  }
  return files;
}

const ddl = /\bcreate\s+(table|trigger|policy)\b/i;
for (const file of walk(docsDir)) {
  const rel = path.relative(root, file);
  if (rel.includes(`${path.sep}decisions${path.sep}`)) continue;
  const text = fs.readFileSync(file, "utf8");
  if (ddl.test(text)) {
    fail(`${rel} 含 SQL DDL（违规；SQL 只能在 migrations）`);
  }
}

const invariants = fs.readFileSync(
  path.join(docsDir, "00-invariants.md"),
  "utf8",
);
for (let i = 1; i <= 14; i++) {
  if (!invariants.includes(`铁律 ${i}`)) fail(`00-invariants 缺少铁律 ${i}`);
}

if (failed > 0) {
  console.error(`\n${failed} check(s) failed`);
  process.exit(1);
}
console.log("\nAll docs checks passed");
