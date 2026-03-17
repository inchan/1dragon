---
project: 1dragon
workflow_version: 1
autonomy:
  goal_source: request_context_and_quality_feedback
  completion_gate: quality_control
  default_mode: goal_directed
---

# 1Dragon Reference-First Workflow

This repository treats execution policy as a durable in-repo contract, not chat memory.

## Soul

Turn one product brief into trustworthy, reference-backed storyline options before anyone makes an ad.

## Philosophy

1. Decompose the brief before generating creative.
2. Collect product facts, market language, platform grammar, and official references before proposing storylines.
3. Mimic structure, not expression.
4. Keep one active roadmap item or OpenSpec change per execution lane.
5. Treat evidence-backed ranking and review, not raw generation, as the definition of done.

## Purpose

Each run should decide what facts and references are missing, normalize them, extract reusable patterns, and produce ranked storyline options with explainable evidence.

## Operating Goals

1. Preserve product truth and landing-page truth.
2. Capture rights-safe reference evidence before any downstream creative validation.
3. Produce multiple structured angles instead of one opaque answer.
4. Finish only when the ranking rationale and review evidence are attached to the latest work.

## Execution Rules

1. One active roadmap item or OpenSpec change owns one execution lane: one worktree or branch, one canonical workpad, and one evidence bundle.
2. The Lead or Orchestrator claims the item, chooses any parallel subtracks, and decides whether the item loops back, moves to review, or closes.
3. Before behavior-changing work, record the current signal: failing test, baseline output, reproducible doc mismatch, or runtime behavior.
4. `ready_for_review` requires a current plan, checked acceptance criteria, recorded validation steps, and evidence tied to the latest commit.
5. `done` requires review closure or explicit approval; implementation success alone is not enough.
