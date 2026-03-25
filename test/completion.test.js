// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect } from "vitest";
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const CLI = path.join(import.meta.dirname, "..", "bin", "nemoclaw.js");

function run(args) {
  try {
    const out = execSync(`node "${CLI}" ${args}`, {
      encoding: "utf-8",
      timeout: 10000,
      env: { ...process.env, HOME: "/tmp/nemoclaw-completion-test-" + Date.now() },
    });
    return { code: 0, out };
  } catch (err) {
    return { code: err.status, out: (err.stdout || "") + (err.stderr || "") };
  }
}

describe("completion command", () => {
  it("completion bash outputs valid bash completion", () => {
    const r = run("completion bash");
    expect(r.code).toBe(0);
    expect(r.out).toContain("_nemoclaw");
    expect(r.out).toContain("complete -F _nemoclaw nemoclaw");
    expect(r.out).toContain("onboard");
  });

  it("completion zsh outputs valid zsh completion", () => {
    const r = run("completion zsh");
    expect(r.code).toBe(0);
    expect(r.out).toContain("#compdef nemoclaw");
    expect(r.out).toContain("_nemoclaw");
    expect(r.out).toContain("onboard");
  });

  it("completion fish outputs valid fish completion", () => {
    const r = run("completion fish");
    expect(r.code).toBe(0);
    expect(r.out).toContain("complete -c nemoclaw");
    expect(r.out).toContain("onboard");
  });

  it("completion with no arg auto-detects shell", () => {
    const r = run("completion");
    expect(r.code).toBe(0);
    // Should output some completion script regardless of shell
    expect(r.out.length).toBeGreaterThan(100);
  });

  it("completion with unknown shell exits 1", () => {
    const r = run("completion powershell");
    expect(r.code).toBe(1);
    expect(r.out).toContain("Unknown shell");
    expect(r.out).toContain("Supported: bash, zsh, fish");
  });

  it("completion --list-sandboxes exits 0", () => {
    const r = run("completion --list-sandboxes");
    expect(r.code).toBe(0);
    // With empty HOME, no sandboxes expected — just no error
  });

  it("help mentions completion command", () => {
    const r = run("help");
    expect(r.code).toBe(0);
    expect(r.out).toContain("completion");
    expect(r.out).toContain("Shell Completion");
  });

  it("completion flags match debug.sh", () => {
    // Parse the flags that debug.sh actually accepts from its case statement,
    // so completion stays in sync when debug.sh gains new flags.
    const debugSh = fs.readFileSync(
      path.join(import.meta.dirname, "..", "scripts", "debug.sh"),
      "utf-8",
    );
    // Match case patterns like "    --sandbox)", "    --output | -o)"
    const casePatterns = debugSh.match(/^\s+--[^\n]+\)/gm) || [];
    const debugShFlags = casePatterns
      .map((m) => m.trim().replace(/\)$/, "").split(/\s*\|\s*/))
      .flat()
      .map((f) => f.trim())
      .filter((f) => f.startsWith("--"));

    // eslint-disable-next-line -- CJS require for the exported constant
    const { DEBUG_FLAGS } = require("../bin/lib/completion.js");

    for (const flag of debugShFlags) {
      expect(
        DEBUG_FLAGS,
        `debug.sh accepts ${flag} but completion.js DEBUG_FLAGS is missing it`,
      ).toContain(flag);
    }
  });
});
