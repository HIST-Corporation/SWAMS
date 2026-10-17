# ADR 0003 — XState v5 for core workflow UIs

**Status:** accepted (supersedes Open Decision 4) · **Date:** 2026-10-08 · **Author:** frontend team

## Context

Section 7 defines seven UI workflows as explicit state machines (punch, offline queue, session,
leave request, attendance correction, kanban drag, meetup poll, video call) and requires that
components render from `state.matches(...)` instead of scattered booleans, that every transition
has a unit test, and that the machine be visualizable. Section 5A lists XState v5; Open Decision 4
still asks "XState vs reducers only".

## Decision

- **XState v5** for the workflows in Section 7 (and any workflow whose UI has >3 interdependent
  states): one machine file per feature at `features/<name>/machines/<name>.machine.js`, with a
  test that walks every transition (100% transition coverage gate, Section 14).
- **Plain reducers / `useState`** remain correct for trivial cases (Section 7 preamble): a two-
  step toggle, an open/closed menu.
- Machines model **what the user sees and can do**; server rules stay on the server.

## Consequences

- Deterministic, testable, replayable UI states; the punch flow and offline queue stop being
  boolean spaghetti.
- Visualizer output helps QA and design review.
  − One more dependency; developers must learn actor-model basics.
  − Importing XState into a shared package would break the "no DOM, small surface" rule — machines
  live in `apps/web/src/features/*/machines/` only.

## Alternatives considered

Reducers-only (rejected: 7 multi-state workflows with guards and side-effect mapping exceed
"trivial"); ad-hoc booleans (rejected by Section 7 explicitly).
