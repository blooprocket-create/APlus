# Saving, optional cloud sync, and offline play

Design brief, November 4, 2026. Requirements are confirmed in [the decision record](DESIGN_DIRECTION.md), particularly D30 and D84–D86. Nothing in this brief is a claim that the new save/cloud/offline system has been implemented.

## Confirmed experience

- Start from a browser link without creating an account.
- Optionally enable cloud saves and cross-device synchronization.
- Keep one evolving save per hero, with recovery backups rather than manual timeline slots.
- Stop almost anywhere and resume the same situation.
- Play offline once needed content is downloaded; synchronize later when connected.

The number of hero slots, sign-in provider, cloud service, download size, exact offline content coverage, and backup retention are not yet selected. Existing prototype settings are implementation facts, not automatically final requirements.

## Three distinct transitions

| Event | Required behavior |
| --- | --- |
| Stop and return | Restore the relevant saved situation, including location and persistent adventure state. Detailed active-battle/cinematic handling still needs specification. |
| Player defeat | Return to a town/fixed camp, retaining permanent progression. Ordinary enemies repopulate the return journey; defeated named bosses and permanent story/puzzle outcomes remain. |
| Narrative consequence | Keep the consequences in the hero's evolving timeline, including permanent losses and changed alliances. Recovery backups do not serve as a normal decision-rewind menu. |

## Data the eventual design must account for

The Compact finale now has a confirmed recovery-before-loss rule (D93): a failed rescue objective while the player survives offers an in-mission recovery opportunity, whose failure can cause a permanent loss. Preserve the distinction between an unresolved threatened/recovery state and a committed narrative outcome. Interruption must not manufacture rescue failure; recovery backups are not routine retries of an already committed casualty. Exact persistence boundaries and unresolved-rescue handling after player defeat remain to be specified in the encounter/save design.

Plan preservation of hero identity/customization, equipment, XP/levels, per-ability builds, profession progress/recipes/materials, narrative choices, permanent world outcomes, cooperative puzzle state, relevant encounter state, companions, and the current return/suspension situation. This is a planning inventory, not a finalized schema or a promise to serialize every animation frame.

## Offline and audio

Make downloaded game content playable without a continuous connection. Decide what is downloaded, how the player sees available offline content, how updates are applied, and how returning online resumes synchronization.

Generated speech or expressive vocalizations are accepted, but live generation is not required. Package or otherwise make required vocal presence and music available for offline content. Do not design every story scene around an unavoidable live synthesis call.

## Recovery and synchronization work still needed

Specify local guest-to-account association, save versioning/migration, recovery triggers, backup retention, and conflict resolution when more than one device advances a hero offline. A proposed validation criterion is that reconnecting must not silently discard a newer timeline or merge incompatible story decisions. The actual resolution policy remains to be designed.

Validate normal quitting, abrupt interruptions, stale versions, interrupted writes, downloads, reconnection, and recovery on physical target devices. No technical provider, persistence library, authentication product, or network architecture is selected by this brief.
