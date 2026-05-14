# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository purpose

This repo is a personal collection of **Claude Code skills** authored by spearwolf. It contains no application code, no build pipeline, and no test suite — every artifact is a skill definition that another Claude Code session will load via the `Skill` tool.

A "skill" here means: one directory at the repo root, containing a `SKILL.md` file (and optionally supporting files like `references/`, `assets/`, scripts). The directory name is the skill's invocation name.

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

## Language conventions in this repo

- Frontmatter `description` is written in **English** so it matches the language of most agent host environments and is universally discoverable.
- The skill **body** (workflow, principles) is written in **German**, matching the author's working language. Mirror that split when adding new skills unless there is a specific reason to deviate.
- Inside skill bodies, technical terms, file paths, CLI flags, and code identifiers stay in English (`package.json`, `tsconfig`, `prefers-color-scheme`, etc.) regardless of surrounding prose language.

## When editing or adding skills

- **Always update `CHANGELOG.md`** in the same change. Every skill addition, removal, or behavioural modification gets an entry under today's date (`YYYY-MM-DD`, newest on top), grouped as `Hinzugefügt` / `Geändert` / `Entfernt`. Keep entries short and precise — one or two sentences per change, focused on *what shifted for users of the skill*, not on implementation details. If today's date already has a section, append to it instead of creating a duplicate.
- Keep the `name:` field in the frontmatter in sync with the directory name. They are not independently meaningful — agents resolve skills by directory name and validate against the frontmatter.
- A skill should describe *workflow and decision rules*, not reproduce reference documentation. If the skill needs lookup material, put it in a sibling file (e.g. `references/foo.md`) and have the workflow instruct the agent to read it on demand.
- Skills here lean toward producing concrete artifacts (the existing `js-ts-project-audit` writes `./audit.html`). When an output file is part of the contract, the skill body must state the exact path, overwrite policy, and standalone-ness requirements explicitly — host agents will not infer these.
- No external dependencies (no CDN imports, no fonts, no remote assets) inside artifacts the skill produces unless the skill itself argues for them. The `js-ts-project-audit` skill's "standalone HTML" rule is the local convention.

## What this repo is *not*

- Not an npm package. There is no `package.json`, no `node_modules`, no build step. Don't add tooling unless a skill genuinely needs it.
- Not a documentation site. The audience is *agents*, not human readers browsing GitHub. Prose should be terse and instructional.
- Not versioned per-skill. The whole repo is a single git history; there is no per-skill changelog or release flow.
