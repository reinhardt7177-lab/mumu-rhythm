# Fullscreen Rhythm V3

## Explicit User Requirements

- Full-viewport layout without centered page margins.
- Remove muted green background panels and repetitive image-card presentation.
- Era-specific image casts for all heroes/enemies.
- Ten additional selectable songs beyond the four exposed world songs.
- Diagnose actual falling-bar behavior, not just decorate around it.
- Retain pre-play song explanation and post-play music questions.

## Design

Unframed pixel world fills the screen. On desktop, compact neutral-charcoal music rows occupy a right rail, with coral action controls. On mobile, world above and a scrollable music list below. No decorative header slogan or footer. Fullscreen API control is functional. During play, a vertical five-lane deck and battle scene fill the viewport, stacked on mobile.

Typography: existing locally hosted NeoDunggeunmo. Colors: charcoal #1b1b20, ink #121215, off-white #f5f3ef, coral #ff806f, muted violet-gray #aaa9b2. World art retains its independent era palettes; green forest illustration is not a green UI panel.

## Work Items

- [x] Record explicit project design prohibitions in root AGENTS.md and submit global preference candidate.
- [x] Generate and normalize four full image casts, shared CSS/Canvas paths and named enemies.
- [x] Rebuild full-viewport music selection, track rows, all/era filtering and fullscreen control.
- [x] Source and prepare eight newly cleared acoustic recordings; expose two trusted previously hidden tracks to reach fourteen selectable songs. Exclude the unreliable legacy Hungarian recording instead of presenting its distributor claim as clearance.
- [x] Trace note-center/hitline mismatch, timing defaults, hold completion/reconnect and touch bounds; add regression tests and integrate challenge lane routing.
- [x] Finish source/credit review, run complete unit/build checks, verify all fourteen audio outputs, actual full clears and all twenty cast members in browser.

## Release Evidence

- 104 unit tests, 13 files passed; production build and TypeScript passed.
- `tmp/release-v3-qa.mjs`: all14 recordings emitted measured audio after count-in, peak184-211. No page or asset errors.
- All four base-world songs completed with4/4 enemies and3/3 quizzes. Every cast rendered in the actual battle Canvas. These were synthetic input playthroughs in explore mode, not claims of a human challenge-mode perfect run.
- Desktop1440x900 and mobile390x844 game root exactly fill the viewport, no horizontal overflow. Fullscreen enter/exit tested successfully.
- Parent integration routes keyboard and challenge touch through the same lane/timestamp API; explore preserves direct bar selection. MISS feedback is visible. Controlled source/runtime geometry evidence is in the REA audit.
- Final small fix: clamp pre-roll negative song time to hero idle frame0, with failing-then-passing regression test.
- User-wide design rules were also appended to `C:/Users/JNEPC/.codex/AGENTS.md`, preserving all existing skill preferences, and read back. Subbrain separately holds the user's preference as a review candidate.
- No GitHub push or online deployment in this task. Local preview remains at port5201.

## Evidence Boundary

REA tools are not registered. No provider analysis, package installation or MCP reconfiguration was performed. Runtime conclusions use complete source and actual browser rendering/input. Review details: docs/rhythm-rea-audit.md.
