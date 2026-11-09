# Falling-Bar Rhythm Feedback References, V5

## Status and Evidence Boundaries

Actual REA static analysis succeeded, not merely source reading: REA CLI **6.8.0**, process exit **0**, four downloaded Bemuse production webpack chunks, **71,152 bytes**, four parsed JS files, **zero parse failures**. No downloaded reference game code was executed. No global tool, service, skill, MCP registration or client configuration was installed or changed. Writes for this research were confined to this report and `tmp/references-v5/`.

The primary target is [Bemuse's shipped application](https://bemuse.ninja/), linked by its [official repository](https://github.com/bemusic/bemuse). The secondary osu!mania material below is **official documentation/source comparison, not REA analysis of an osu! binary**. No more reference games are needed for this bounded task.

Evidence labels used here:

- **REA observation:** a fact retained in actual static analyzer output, with its Evidence/node identity.
- **Shipped-text inspection:** manual reading of retained production JS, not an additional REA finding or runtime observation.
- **Official source/docs:** independently published reference material; not proof that the sampled deployment contains the same revision.
- **Recommendation:** an original implementation choice for the parent, not a measured property of either reference.

## Deliverables

All paths below are relative to the project root.

| Path | Purpose |
| --- | --- |
| `tmp/references-v5/fetch-manifest.json` | Original/final URLs, UTC fetch times, byte lengths, SHA256, local filenames and content types for all 12 acquired reference files |
| `tmp/references-v5/shipped/` | Four unmodified production JS chunks |
| `tmp/references-v5/bemuse-page.html` | Original entry HTML containing the webpack URL resolver and game dependency list |
| `tmp/references-v5/rea-analyze-help.txt` | Actual CLI command help checked before analysis |
| `tmp/references-v5/rea-version.txt` | Actual CLI version output: 6.8.0 |
| `tmp/references-v5/rea-evidence.json` | Complete initial two-chunk REA JSON |
| `tmp/references-v5/rea-analysis.stderr.txt` | Initial REA progress stream |
| `tmp/references-v5/rea-evidence-three-chunks.json` | Complete final REA JSON; historical filename says three, but actual inventory and stderr establish **four** files, including the fourth acquired before inventory completed |
| `tmp/references-v5/rea-three-chunks.stderr.txt` | Final REA progress stream, including all four selected files and terminal success |
| `tmp/references-v5/rea-focused-module.json` | Actual REA item projection for returned webpack module 95120, without rerunning analysis |
| `tmp/references-v5/rea-focused-input.json` | Complete inline Evidence input for that projection |
| `tmp/references-v5/derived-evidence-index.json` | Locally derived compact index, not a new REA result; selected semantic nodes, limits and verified download identities |
| `tmp/references-v5/source/` | Official source snapshots and license texts, explicitly separate from the REA input directory |

Reference acquisition total: **449,866 bytes**, below the enforced **10,000,000-byte** cumulative cap. This excludes npm tool dependencies, locally generated Evidence JSON and wrapper files. No source maps, art or audio were downloaded. Four small chunks were selected from the shipped loader, not a repository build or locally rebuilt substitute.

## Acquisition Provenance

All four URLs below are under `https://bemuse.ninja/build/`. Times are on **2026-11-09 UTC**. Each filename links to its exact original public URL; full metadata is in the manifest.

| Shipped file | UTC time | Bytes | SHA256 |
| --- | --- | ---: | --- |
| [game-cedcf233b56b0a1d000b.js](https://bemuse.ninja/build/game-cedcf233b56b0a1d000b.js) | 03:01:07.561Z | 10,634 | `87152482acb43ac9741d9507c4aaecbeb261a097432cb898cf90310bca9c552f` |
| [gameEngine-1aefa49a62bf1e54b8c7.js](https://bemuse.ninja/build/gameEngine-1aefa49a62bf1e54b8c7.js) | 03:01:12.583Z | 20,510 | `abfc4550fb0ae50e2f7def4d94a030f1039da3ab5d0a2e39eef5fd80bbeb5b64` |
| [821-7881c9dbadfb312543f0.js](https://bemuse.ninja/build/821-7881c9dbadfb312543f0.js) | 03:03:15.385Z | 28,803 | `03baeb89686626ceaddcdd5befdb1864d5d85fae1687f578d8965882d4e35375` |
| [728-92971613fcd6bb69dee6.js](https://bemuse.ninja/build/728-92971613fcd6bb69dee6.js) | 03:04:25.491Z | 11,205 | `7b3b83195f65a007f4c806ab96840381b94835a4c4ffade9cbacbb063ad5458a` |

The official project identifies Bemuse's main license as [AGPLv3](https://github.com/bemusic/bemuse/blob/master/LICENSE), with distinct subproject licenses. Retained `source/BEMUSE-LICENSE.txt` is commit-pinned to `4bf3e7d98a44841b323741cc403ecb7b41618ade`. The 728 chunk's named license sidecar is retained as `source/728-LICENSE.txt`. These are research copies, not application assets. Do not copy reference code, skin art, fonts or music into the parent implementation; author effects independently. [Official license attribution](https://github.com/bemusic/bemuse#license).

## Actual REA Commands and Results

Environment: Windows PowerShell, existing Node **v24.14.1**, npm **11.11.0**. No REA MCP tools were registered and no installed `rea` command was available. The explicitly authorized CLI fallback acquired a task-local npm cache. The first acquisition used approval escalation:

```powershell
npx.cmd --cache 'C:/무무서브젝트/mumu리듬액션/tmp/references-v5/npm-cache' --yes rea-agents@latest --help
npx.cmd --offline --cache 'C:/무무서브젝트/mumu리듬액션/tmp/references-v5/npm-cache' --yes rea-agents@latest analyze-javascript-application --help | Tee-Object -FilePath 'tmp/references-v5/rea-analyze-help.txt'
npx.cmd --offline --cache 'C:/무무서브젝트/mumu리듬액션/tmp/references-v5/npm-cache' --yes rea-agents@latest --version | Tee-Object -FilePath 'tmp/references-v5/rea-version.txt'
npx.cmd --offline --cache 'C:/무무서브젝트/mumu리듬액션/tmp/references-v5/npm-cache' --yes rea-agents@latest analyze-javascript-application 'C:/무무서브젝트/mumu리듬액션/tmp/references-v5/shipped' --json --max-heap-mb 512 --analysis-timeout-ms 90000 > 'tmp/references-v5/rea-evidence.json' 2> 'tmp/references-v5/rea-analysis.stderr.txt'
npx.cmd --offline --cache 'C:/무무서브젝트/mumu리듬액션/tmp/references-v5/npm-cache' --yes rea-agents@latest analyze-javascript-application 'C:/무무서브젝트/mumu리듬액션/tmp/references-v5/shipped' --json --max-heap-mb 512 --analysis-timeout-ms 90000 > 'tmp/references-v5/rea-evidence-three-chunks.json' 2> 'tmp/references-v5/rea-three-chunks.stderr.txt'
npx.cmd --offline --cache 'C:/무무서브젝트/mumu리듬액션/tmp/references-v5/npm-cache' --yes rea-agents@latest inspect-analysis-view 'C:/무무서브젝트/mumu리듬액션/tmp/references-v5/rea-focused-input.json' --json > 'tmp/references-v5/rea-focused-module.json' 2> 'tmp/references-v5/rea-focused.stderr.txt'
```

Both analysis commands and the focused projection returned exit 0. The second producer had changed input; it was not an identical retry. `latest` here resolved to the **already cached 6.8.0**, confirmed by the saved version. Future independent reproduction should pin `rea-agents@6.8.0`, rather than assuming a future `latest` matches.

Final Evidence:

- Parent ID: `ev_d69c988f5f5d429c2df6c4225a8903bc73097da0635d1baa7f412db6db63c97a`.
- Root artifact SHA256: `eda3a1547c2e70ba86e9f97632cf6bd4441d641e6a0ff397cb67e1644dc72bc5`.
- Raw JSON SHA256: `cd73572c9fa75231c3b1530f63856612520ca16d9ce2411fef6531a2c6a483f0`; raw file size **29,016,012 bytes**.
- Provider: `rea-javascript-application`, analyzer provider version `1`; distinct from CLI package version 6.8.0.
- Statistics: four parsed JS files; zero skipped/invalid UTF8/parse failures; 19,100 visited AST nodes; 143 findings; 33 modules in the returned statistics. These are static counts, not 143 verified game behaviors.
- Semantic graph: 13,954 retained nodes, 5,012 explicit unknown records; overall semantic coverage `unknown`. Application graph coverage `partial`, not truncated; alias-selection limit 512.
- Gameplay module: webpack key `95120`, returned node `jag_node_8f555b15343573a045abee7db85adc5f48c0a3ac90a17e88e9ebda5a4fc110b4`, in chunk 821.
- Focused item Evidence: `ev_dfc2143bc91671be03f9b031513344ed19a6ea0fa3026bfaf22e2f12a43b9da4`, parent-linked to the ID above. `complete-within-view` applies only to that selected item, not the application.

REA explicitly says HTML/JS were parsed inertly and webpack factories recovered from AST literals without invoking handlers or bootstrap code. Relevant returned semantic observations include:

| Observation | Returned semantic node | Retained location in chunk 821 |
| --- | --- | --- |
| Read `_context.currentTime` | `jsrg_node_069974c5e188b50020901c8fd6d18ae6c9c58723da1c9cc92d693df6e9996626` | line 26 |
| Read `_state.update` | `jsrg_node_562c2239f27f771fadaa3d193f83ec075fb526b4aaa9b25ba74468266b277d9a` | line 49 |
| Read `_audio.update` | `jsrg_node_c5912bd5a0d655a0eca1862f49a28f0751a3ea43533392a484fcaba7a48c6043` | line 49 |
| Read `_display.update` | `jsrg_node_e1c4cec0696b397f2960376fdae935320b8274ac17c483887c2deaabee5b521b` | line 49 |

These observations establish retained syntax locations, not runtime reachability or resolved object identities. Manual shipped-text inspection at lines 26-28 finds an audio-context time offset averaged over at most 60 samples. Lines 47-49 show clock/input/timer updates, then state and display receiving the timer minus `audioInputLatency`, while audio receives the unadjusted timer. This is a static interpretation of those statements, not a claim of measured audio synchronization.

## Six Concrete Patterns for the Parent

### 1. One Gameplay Clock, Separate Visual Lifetime

**Established:** the shipped timing statements above share a timer and explicit latency offset. [Official Bemuse options](https://bemuse.ninja/project/docs/user-guide/#adjusting-options) distinguish scroll lead-time from audio-latency compensation. **Recommendation:** create feedback from authoritative judgment events carrying lane, note ID and song time; age effect animation independently. Do not let particle timing alter hit windows, note-center geometry or touch hit testing. The sampled code does not prove pixel alignment or actual hardware latency.

### 2. Lane-Local Input and Successful-Hit Feedback Are Different Signals

**Official source, not REA:** Bemuse's pinned player display tracks column active/down/up separately and emits per-column explosion timestamps only for judgments that do not break combo. **Recommendation:** show a restrained press response for input, but trigger a stronger pixelfx hit only after a successful judgment. Anchor it to the lane receptor; keep neighboring incoming notes readable. [Pinned display source](https://github.com/bemusic/bemuse/blob/4bf3e7d98a44841b323741cc403ecb7b41618ade/bemuse/src/game/display/player-display.js).

### 3. Accuracy Tier and Early/Late Convey Different Information

**Official docs:** Bemuse records signed millisecond offsets: negative early, positive late. Its judgment thresholds vary by chart level. **Source comparison:** the display stores the judgment and deviation channels separately, suppressing deviation for misses and the best tier. **Recommendation:** keep the parent's five-tier effect hierarchy, add optional compact directional text, and never imply that a bigger effect changes the timing window. Exact colors and effect lifetimes are original design decisions. [Timing sign and result statistics](https://bemuse.ninja/project/docs/user-guide/#view-the-accuracy-data), [judgment thresholds](https://bemuse.ninja/project/docs/scoring-and-judgment/).

### 4. A Hold Is a Persistent State, Not Repeated Tap Bursts

**Official source, not REA:** Bemuse exposes long-note active/missed state. osu!mania's `DrawableHoldNote.Update` tracks holding and break state; body masking starts at/after the object's start, with a successful undropped head, rather than immediately on an early press. **Recommendation:** enter one persistent hold effect, update it from actual holding state, trim the consumed body at the receptor, and stop it when the hold ends. Do not emit a full tap burst every render frame. [osu!mania hold drawable](https://github.com/ppy/osu/blob/master/osu.Game.Rulesets.Mania/Objects/Drawables/DrawableHoldNote.cs), [Bemuse pinned display](https://github.com/bemusic/bemuse/blob/4bf3e7d98a44841b323741cc403ecb7b41618ade/bemuse/src/game/display/player-display.js).

### 5. Hold Completion and Hold Break Need Different Endings

**Official docs:** Bemuse judges long-note start and end separately and expects keyboard release at the tail; scratch is explicitly exceptional. osu!mania's documented default combined judgment and ScoreV2's separate head/tail judgments differ. Do not mix these rule sets. **Source comparison:** osu!'s release path checks the tail and reports the hold stopped. **Recommendation:** successful tail gets one compact completion burst; premature release stops sustained effects immediately and uses a distinct low-intensity break cue. Neither path should retain an orphan hold loop. [Bemuse BML rules](https://bemuse.ninja/project/docs/bms-support/), [osu!mania judgment variants](https://osu.ppy.sh/wiki/en/Gameplay/Judgement/osu!mania).

### 6. Combo Is Judgment State, Not an Animation Counter

**Official docs:** Bemuse scores accuracy and combo separately; combo bonus has increasing bands, and its published example shows a miss dividing two streaks. **Source comparison:** the display takes combo from the latest judgment notification. **Recommendation:** update combo exactly once per judged event; reserve larger celebrations for threshold crossings, not each frame or every simultaneous key. Make a break legible without a success burst, hide/reset persistent combo glow on failure, and keep score and combo independently readable. Suggested milestone spacing is a parent design choice, not a copied Bemuse visual rule. [Official scoring and combo calculation](https://bemuse.ninja/project/docs/scoring-and-judgment/).

These patterns inform five feedback surfaces: input/hit, accuracy/deviation, hold sustain, hold completion/break, and combo/miss. They do not prescribe or replace the parent's already integrated five-tierFX implementation.

## Primary Sources, Attribution and Limits

- Bemuse [official application](https://bemuse.ninja/), [repository](https://github.com/bemusic/bemuse), [guide](https://bemuse.ninja/project/docs/user-guide/), [scoring](https://bemuse.ninja/project/docs/scoring-and-judgment/), [long-note rules](https://bemuse.ninja/project/docs/bms-support/).
- Bemuse source inventory and snapshots are pinned to commit `4bf3e7d98a44841b323741cc403ecb7b41618ade`. The retained game-timer source is corroborating source comparison only; no source-to-deployment revision equivalence was established.
- osu!mania [official judgment documentation](https://osu.ppy.sh/wiki/en/Gameplay/Judgement/osu!mania), [official hold drawable source](https://github.com/ppy/osu/blob/master/osu.Game.Rulesets.Mania/Objects/Drawables/DrawableHoldNote.cs), [MIT license](https://github.com/ppy/osu/blob/master/LICENCE). Source snapshot was fetched from mutable `master`; fetched-byte SHA256 and time, not an invented commit, identify it in the manifest. Copyright ppy Pty Ltd; license retained in `source/OSU-LICENCE.txt`. No osu! executable was downloaded or REA-analyzed.
- The first guessed Bemuse chunk URL returned HTTP 404. The correct `build/name-hash.js` URL was then resolved from retained HTML. The failed fetch also printed a Node libuv shutdown assertion; subsequent successful fetches and all retained-file SHA256 checks passed.
- npm emitted `EBADENGINE`: REA 6.8.0 declares Node `^22.23.4 || ^24.22.1 || >=26.12.1`; the existing runtime was v24.14.1. Nevertheless help, version, both actual analyses and the Evidence projection completed successfully. No runtime upgrade was attempted. Non-escalated pinned npm attempts encountered sandbox `EPERM`/pending acquisition and were stopped; approved cached CLI execution resolved the blocker. Package logs remain under the task-local `npm-cache/_logs/`.
- **No current blocker.** No doctor/setup/configuration repair was necessary. Coverage is deliberately incomplete: omitted chunks, source maps, assets, dynamic paths and 5,012 semantic unknowns remain unresolved. No runtime, screenshot, latency, frame-duration, touch alignment or perceptual quality verification was performed here. The parent owns visual QA and must verify the actual application across desktop/mobile and reduced-motion states.
- Verification helper `node tmp/references-v5/summarize-evidence.mjs` parsed complete raw JSON, checked all 12 acquired files against their manifest hashes and byte lengths, and retained a compact evidence index. Parent application tests/build were outside this research task and were not rerun here.
