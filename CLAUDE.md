# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository purpose

This repo is a personal collection of **Claude Code skills** authored by spearwolf, plus **global behavior instructions** for Claude. It contains no application code, no build pipeline, and no test suite — almost every artifact is either a skill definition that another Claude Code session loads via the `Skill` tool, or a global instruction file that is installed into the user's `$HOME/.claude` directory.

A "skill" here means: one directory at the repo root, containing a `SKILL.md` file (and optionally supporting files like `references/`, `assets/`, scripts). The directory name is the skill's invocation name.

A "global behavior" instruction is **not** a skill: it does not get loaded on demand via the `Skill` tool. It is a `CLAUDE.md` file that defines how Claude should behave generally in certain situations, and it takes effect by being installed as a **marked block inside** the user's `$HOME/.claude/CLAUDE.md` (following `global-behavior/INSTALL.md` — never by symlinking or wholesale copying, which would clobber the user's own content), where it applies across all of that user's projects.

## SKILL.md structure

Every skill file follows the same shape:

```markdown
---
name: kebab-case-slug          # must match the directory name
description: <one paragraph>   # this is the trigger heuristic Claude uses to decide whether to load the skill
---

# Human-readable title

<skill body in markdown — workflow, principles, examples>
```

The `description` field is **load-bearing**. It is the only part of the skill another agent sees before deciding to invoke. Treat it as a precision-engineered trigger: list the file/import/keyword signals that should activate the skill, plus the informal phrasings users actually type ("review my repo", "schau mal drauf"). The body of the skill is only read after the agent has already decided to load it — so put trigger semantics in the frontmatter, not the body.

## The `global-behavior` directory

`global-behavior/` is the home of global behavior instructions (see "Repository purpose"). Its central artifact is `global-behavior/CLAUDE.md`, which is installed as a marked block inside the user's `$HOME/.claude/CLAUDE.md` via the steps in `global-behavior/INSTALL.md`, so it governs Claude's behavior across all projects.

Because that file sits in context on *every* request, it is the one place where token cost is paid unconditionally. Rules that only fire under narrow conditions therefore do not live there — they get their own file next to it, installed alongside into `$HOME/.claude/`, and the block carries only a pointer that says when to read it. There is currently no such file — the ES rule used to be one (`global-behavior/es-protokoll.md`, removed 2026-07-26) and shows the trade-off: a rule the agent must evaluate in *every* session pays the pointer's indirection without ever saving the tokens, so it belongs inline. Adding such a file means adding it to the artifact table in `INSTALL.md` (install *and* uninstall path); a rule whose target file is missing must fail closed.

- **When the user talks about Claude's "behavior" or "behavior rules" (German: *Verhalten* / *Verhaltensweisen*) — how Claude should generally act in some situation — the intended outcome is almost always `global-behavior/CLAUDE.md`.** Edit that file, not a skill and not this project's `CLAUDE.md`.
- Unlike skills, this content is *always active* once installed; there is no `description` trigger and no on-demand loading. Write the instructions so they hold up as standing rules.
- The body follows the author's working language (German prose), matching the rest of the repo.

## Installing skills and behaviors for the user

When the user asks to **install / update / uninstall** the contents of this repo into their machine, two kinds of artifact are handled differently. In all cases, after a successful action, record it in the install log (see below).

### Skills

"Install the skills" means: make this repo's skills available to the user's agents by symlinking each skill directory into the user's agent skills directory `$HOME/.agents/skills/`.

- **Target directory:** `$HOME/.agents/skills/` — create it if it does not exist yet.
- **One symlink per skill:** for skill `<name>`, create `$HOME/.agents/skills/<name>` → the absolute path of this repo's `<name>/` directory. Example: `$HOME/.agents/skills/js-ts-project-audit` → `<repo>/js-ts-project-audit`.
- **Granularity:** install all skills, or only the specific skill(s) the user names. "Install `js-ts-project-audit`" links only that one.
- **Collision on first install:** if `$HOME/.agents/skills/<name>` already exists and is *not already* a symlink into this repo (i.e. it is a real directory, or a symlink pointing at some unknown/foreign folder), move that existing entry into `$HOME/.agents/skills--backupz/` first (create that backup directory if needed), then create the symlink. Never overwrite or delete foreign content — always back it up. If the entry already points at this repo's skill, the skill is already installed (treat as an update / no-op).
- **Uninstall / remove / delete a skill:** just remove the symlink in `$HOME/.agents/skills/`. Do this per-skill when the user names specific skills. Never touch the skill source in this repo, and never delete anything that was moved to `--backupz/`.

### Global behavior (the `global-behavior/` directory)

This is **not** a skill and is not symlinked into `$HOME/.agents/skills/`. When the user asks to install, update, adjust, or remove Claude's *behavior* (German: *Verhalten* / *Verhaltensweisen*), follow the dedicated steps in `global-behavior/INSTALL.md` exactly — those handle the `$HOME/.claude/CLAUDE.md` block and the `spinnerVerbs` key in `$HOME/.claude/settings.json`.

### Install log (`.install-history.md`)

Every install, update, or removal of a skill or of the global behavior — anything that changes the user-wide config — gets logged to `.install-history.md` at the repo root.

- Create the file if it does not exist yet.
- **It must never be committed.** Ensure it is listed in `.gitignore`.
- Append one entry per action with the date (`YYYY-MM-DD`, from the session's current date) and what happened: which skill or which behavior, and whether it was **installed**, **updated**, or **removed** (from the user-wide config). Keep it to one short line per action; newest at the bottom is fine.

## Language conventions in this repo

- Frontmatter `description` is written in **English** so it matches the language of most agent host environments and is universally discoverable.
- The skill **body** (workflow, principles) is written in **German**, matching the author's working language. Mirror that split when adding new skills unless there is a specific reason to deviate.
- Inside skill bodies, technical terms, file paths, CLI flags, and code identifiers stay in English (`package.json`, `tsconfig`, `prefers-color-scheme`, etc.) regardless of surrounding prose language.

## When editing or adding skills

- **Always update `CHANGELOG.md`** in the same change. Every skill addition, removal, or behavioural modification — and equally every change to the global behavior instructions in `global-behavior/` — gets an entry under today's date (`YYYY-MM-DD`, newest on top), grouped as `Hinzugefügt` / `Geändert` / `Entfernt`. Keep entries short and precise — one or two sentences per change, focused on *what shifted for the user of the skill or behavior rule*, not on implementation details. If today's date already has a section, append to it instead of creating a duplicate.
- Keep the `name:` field in the frontmatter in sync with the directory name. They are not independently meaningful — agents resolve skills by directory name and validate against the frontmatter.
- A skill should describe *workflow and decision rules*, not reproduce reference documentation. If the skill needs lookup material, put it in a sibling file (e.g. `references/foo.md`) and have the workflow instruct the agent to read it on demand. The same applies to *conditional* branches: a step that only runs in some situations (a follow-up run, a specific stack) belongs in a reference file that the workflow opens when that situation is actually reached, with the SKILL.md naming the trigger. Say each rule once, in the step that owns it — restating it in three places is what makes an agent weigh instructions against each other instead of following them.
- Skills here lean toward producing concrete artifacts (the existing `js-ts-project-audit` writes `./audit.html`). When an output file is part of the contract, the skill body must state the exact path, overwrite policy, and standalone-ness requirements explicitly — host agents will not infer these.
- No external dependencies (no CDN imports, no fonts, no remote assets) inside artifacts the skill produces unless the skill itself argues for them. The `js-ts-project-audit` skill's "standalone HTML" rule is the local convention.

## Scenario tests (`scenario-tests/`)

`scenario-tests/` is **not** a skill. It holds agent-executed test scenarios that verify the behavior instructions in this repo actually bind when a fresh agent runs them (fixtures with known ground truth → fresh subagent → pass/fail checklist). General rules and the cost discipline live in `scenario-tests/README.md`.

**Run a scenario test only when the user asks for it, in so many words.** A single run spawns fresh subagents that perform a whole audit or install cycle; it routinely costs more tokens than the change that triggered it. Not as a self-imposed quality gate, not as a background check, not "quickly, just to be sure", and not because a change feels risky. Volunteering to run one is fine; starting one unasked is not.

**Instead, when you change a covered artifact:**

1. Update the row in `scenario-tests/STATUS.md` — the mapped test is now stale.
2. Name it when handing the change back: which test went stale, and that the artifact is untested until the user asks. One line, stated once, no lobbying.

**When the user does ask, run only what the change can reach.** The mapped test for the artifact they touched, not the suite; and inside that test, the checkpoints the diff can plausibly affect. Name the arms you skipped so the skip is visible instead of silent.

| Covered artifact | Mapped test |
| --- | --- |
| `global-behavior/INSTALL.md` | `scenario-tests/install-drift.md` |
| `js-ts-project-audit/` (SKILL.md or `references/`) | `scenario-tests/audit-followup.md` |
| ES rule (`## ES` section in `global-behavior/CLAUDE.md`) | `scenario-tests/es-frequency.md` |
| `js-ts-audit-remediation/` (SKILL.md or `references/`) | `scenario-tests/remediation-plan.md` — **not written yet**, so this artifact has never been tested at all |
| `audit-github-sync/` (SKILL.md or `references/`) | none — **no test written**, so this artifact has never been tested at all |

A skill with no mapped test row has never been tested. That is a legitimate state, not a defect to fix on your own initiative — but it belongs in `STATUS.md` and in the handback, same as a stale row.

If a test fails: capture the agent's rationalization verbatim, add a counter-rule to the instruction, re-run until it passes. Test results are reported in the conversation, not committed — the only committed trace is the row in `STATUS.md`.

## Before finishing any change (checklist)

Run through this before committing or handing a change back to the user:

- [ ] `CHANGELOG.md` has an entry under today's date for every skill or global-behavior change (append to today's section if it already exists).
- [ ] Every touched skill's frontmatter `name:` still matches its directory name.
- [ ] If the user-wide config was changed (install/update/removal), the action is logged in `.install-history.md`.
- [ ] If a covered artifact changed (see "Scenario tests"), its row in `scenario-tests/STATUS.md` is marked stale and the handback names the test. Whether it actually runs is the user's call, not yours.

## What this repo is *not*

- Not an npm package. There is no `package.json`, no `node_modules`, no build step. Don't add tooling unless a skill genuinely needs it.
- Not a documentation site. The audience is *agents*, not human readers browsing GitHub. Prose should be terse and instructional.
- Not versioned per-skill. The whole repo is a single git history; there is no per-skill changelog or release flow.
