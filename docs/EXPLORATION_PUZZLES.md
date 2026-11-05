# Exploration, class utilities, and puzzles — design brief

Interview draft, November 4, 2026. Requirements come from the [design decision record](DESIGN_DIRECTION.md). Interaction rules, puzzle layouts, and AI behavior below remain open where identified. No new gameplay is implemented by this brief.

## World context

The connected world is fully explorable, with Skyrim as the user's reference for freedom (D31). Exploration rewards include rare resources and gear, unusual dungeons/bosses, lore snippets, impressive places, secrets, and Easter eggs (D32). Guidance is adjustable between clear markers/routes and minimal navigation assistance (D33).

World danger retains distinct tiers, with ordinary enemies scaling within limits (D34). Geographic freedom does not promise that every encounter is safe. Mounts and town-to-town fast travel are confirmed (D37), with exact travel and danger rules still to be specified.

Utility puzzles must fit this broad exploration freedom. Local dungeon challenges and tighter story interactions do not authorize act-locked geographic regions or returning to portal/chapter maps.

## Three signature utilities

Each hero has one special utility that can be used for puzzles (D56). These are distinct from temporary awakened forms unless a later decision links them. Exact unlock timing is open.

On mobile, the selected hero has a dedicated utility button available throughout exploration (D152). The button invokes that hero's signature utility under its target and use rules. The first slice can use guidance prompts to identify valid targets and explain the next action. Exact placement, target selection, and feedback when a utility cannot act are playtest details.

| Hero/class | Confirmed utility direction | Rules still to design |
| --- | --- | --- |
| Celestia / mage | Move items instantly from one place to another. | Compatible items, source/destination selection, range, line of sight, weight/size, costs, feedback, and any combat use. Do not assume teleporting people or freely bypassing every locked space. |
| Akatsuki / assassin | Stealth. | Concealment versus magical invisibility, detection, duration, movement, costs, interaction with enemies/objects, and any combat use. |
| Brynhildr / warrior | Use the spear to vault over large chasms and similar gaps. | Valid surfaces, trajectories, range, landing selection, costs, failure recovery, and any combat use. |

The names identify canonical class/story roles even when the chosen hero has a customized name and appearance. All three selectable heroes need valid exploration and puzzle experiences.

## AI companion access

The user controls one selected hero for the game; the other two are AI companions (D16). Companions recognize opportunities and use their puzzle utilities automatically (D57). Routine utility commands and character switching are not the selected approach.

The user's moat example establishes role-based cooperation once the objective is clear (D60). The player performs their selected hero's part; AI companions perform the other parts in the appropriate sequence. Automatic execution does not replace the player-controlled contribution or require issuing an order before each AI step.

Detailed objective recognition, timing, positioning, retry, cancellation, and stuck-recovery rules remain open. Required interactions need to work for each hero selection with the corresponding two AI companions.

The example opens a shared route through teamwork (D61), so the heroes left on the starting side can cross after the bridge lowers. Use coherent shared-route outcomes for other obstacles rather than assuming arbitrary long-distance teleportation or leaving required companions behind.

## Reference sequence — the moat

This is the user's example of the desired coordination, not a finalized dungeon layout. The objective is to get the whole party past the moat by opening the bridge.

1. The warrior vaults across the gap and breaks a container, exposing a key.
2. The mage moves the exposed key instantly back to the starting side.
3. The assassin takes the key and uses stealth to pass the guard and operate the bridge mechanism.
4. The lowered bridge creates the shared crossing for the party members still on the starting side.

| Selected player hero | Player contribution | AI contributions |
| --- | --- | --- |
| Warrior | Vault across and break the key container. | Mage teleports the exposed key; assassin takes it through the stealth section and lowers the bridge. |
| Mage | Teleport the key after the warrior exposes it. | Warrior vaults and breaks the container; assassin then uses the transferred key to lower the bridge. |
| Assassin | Take the transferred key, perform the stealth section, and use the key at the bridge mechanism. | Warrior exposes the key; mage transfers it before the player's stealth stage. |

The spatial layout still needs authoring. One coherent interpretation puts the guarded bridge-control approach on the starting bank, reachable by the assassin without inventing another chasm-crossing power; the warrior waits on the far bank. This interpretation is a layout proposal, not an additional user requirement.

The steps have dependencies, not just cinematic timing: the container must be broken before the key is available; the key must be transferred before the assassin can use it; the bridge must be down before the remaining heroes cross. Keep those facts persistent and make all three player roles active. The player need not repeatedly command the other two heroes, and the AI must not execute the player's role on their behalf.

### Entry, guidance, and retry

The moat sequence starts with an automatically triggered cutscene (D149). The trio explains the whole plan before handing control back, covering the vault and key exposure, the mage's transfer, the assassin's passage past the guard, and the bridge lowering (D151). If the assassin is spotted, retry the stealth step and preserve earlier puzzle progress (D150). The container stays open and the transferred key stays available on the starting side.

For the first slice, the proposed cutscene plays on the first approach to the crossing. Frame the raised bridge and the landmarks as the trio explains the plan. Return control with a prompt for the next action, including after a skip. The player uses the dedicated button for their utility. Companions take their turns as the prerequisites become available. The dialogue and shots are open for authoring.

The proposed retry puts the assassin back at the stealth approach, resets the guard's alert, and makes the same key available for another attempt. Keep the warrior and mage's completed work recorded. Test the retry both when the player controls the assassin and when the assassin is a companion. Exact placement and retry feedback are playtest details.

Other puzzles can use different sequences and recovery rules.

## Freedom and constraints

Utilities work broadly during exploration, with tighter rules for important story puzzles (D58). This is neither a utility limited to a few highlighted sockets nor a promise of an unrestricted simulation.

Develop clear compatible-target rules and feedback. Story constraints should be readable through the environment, object properties, and established rules, rather than a familiar utility failing without explanation. Exact range, costs, cooldowns, target filters, and interaction limits remain to be designed.

Broad exploration can support experimentation and secrets without letting one utility automatically erase another class's identity. Do not add extra signature utilities or require awakened mode just to make a basic puzzle work.

## Puzzle scale and structure

The user wants substantial dungeon puzzles and smaller exploration discoveries (D59). A major dungeon can introduce a rule, vary it, and combine it with earlier knowledge. A smaller discovery can reward observation, a clever use of a utility, or an alternative route. These are authoring directions, not approved puzzle sequences.

Avoid a mandatory template of one teleport puzzle, one stealth lane, and one gap in every dungeon. Utilities can combine with layout, machinery, terrain, enemies, and discoveries where the eventual design supports it. Boss fights remain mostly playable action; specific puzzle/combat integration is still open.

## Hints, failure, and continuity

Companions gradually offer puzzle hints when the player appears stuck (D62). Exact timing, escalation, repetition limits, and settings remain open. A proposed progression is an observation, a more specific suggestion, and more direct guidance if the player still needs help; that sequence is an authoring proposal rather than a fixed system. Objective-navigation settings do not automatically determine puzzle hints.

Failure recovery, movable-object reset, interrupted interactions, companion recovery, and mid-puzzle save/resume need explicit rules. The game should support stopping almost anywhere and returning to the same situation (D30), so persistent puzzle state is part of the design work rather than an afterthought.

The primary experience is assisted-camera, manually controlled action on phone/tablet browsers, with minimum 60 fps required on iPhone 14 Pro (D24–D28). Utility input, target feedback, automatic AI, and environmental complexity must be designed for that context. No targeting UI or performance implementation has yet been chosen.
