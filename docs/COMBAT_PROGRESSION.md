# Combat, growth, difficulty, and defeat — design brief

Interview draft, November 4, 2026. Read the [decision record](DESIGN_DIRECTION.md) for source answers. This organizes requirements for a future implementation handoff; it does not replace combat code or provide final balance values.

## Combat foundation

Build on the existing combat's feel toward fast, expressive action (D17). The current action vocabulary includes basic attacks, dash, two abilities, and an ultimate, with distinct spear, ranged magic, and kunai styles. These are inspected prototype references, not a requirement to preserve every input, number, animation, or limitation.

The player controls one chosen hero for the whole game, with two independent AI companions (D16). Occasional player-triggered team attacks or finishers provide coordinated action (D19). Companions grow automatically with sensible class presets and minimal management (D69). They can be temporarily knocked out and recover automatically during the ongoing fight, without routine manual revival (D70). Exact AI loadouts, optional customization, and recovery timing remain open.

Gameplay uses the prototype's original isometric camera (D153). Mobile touch play assists target selection while the player controls movement, attacks, abilities, and dodges.

## First playable slice

Hearthmere Outskirts runs from camp through a road encounter to the moat puzzle. Lowering the bridge opens a shortcut back to camp. Use the same layout with each selected hero and their two AI companions. Select **Play the crossing** from hero selection.

| Mechanic | Confirmed behavior | Playtest check and open detail |
| --- | --- | --- |
| Gameplay camera (D153) | Keep the original isometric follow view. | Check movement and encounter readability on touch and desktop. |
| Touch aim (D144, D146) | Use the nearest enemy in range for unlocked combat and offer optional boss lock-on. | Check whether targeting feels predictable in a group, then engage and release lock-on during the guardian fight. |
| Dodge cancel (D145, D147–D148) | A ready dodge interrupts basic attacks or recovery after a committed ability releases. A dodge press during windup is discarded and a fresh press is required. | Dodge during a basic chain. Press and hold dodge before a committed release and check that no dodge fires on release. Press again during recovery and verify that a ready dodge interrupts it. Choose which moves have a committed windup. |

The targeting helper turns the hero toward the closest enemy within the range passed by the attack. In the playtest, Eclipse commits the hero for a 0.38-second windup. Recovery starts when the attack effect begins, even if the effect takes time to reach its target. The windup length is a playtest tuning value.

Use representative combat effects and both companions in the iPhone 14 Pro browser playtest against the 60 fps requirement. Measure traversal and combat in the same loop. At the moat, verify that the automatic cutscene explains the full plan before control returns. Test the proposed next-action prompt after a skip, each hero's playable role and dedicated utility button, and a stealth retry that retains the exposed and transferred key. The [exploration brief](EXPLORATION_PUZZLES.md) records the sequence.

## Growth and per-ability specialization trees

Earn XP and levels, then choose upgrades in per-ability specialization trees (D65, refined by D75). Each of the three regular abilities and the ultimate gets its own tree, and the choices determine how that ability works. This is the main combat progression mechanism. Professions progress independently and are not automatically tied to the same point pool.

The prototype's existing ability-management screen already groups `basic`, `skill1`, `skill2`, and `ultimate` (`src/ui/UIManager.ts`). Use these as the four starting groups: Primary Attack, Skill 1, Skill 2, and Ultimate. Dash remains outside this four-tree grouping; additional dash, utility, or awakening trees are not automatically approved.

Across three classes, this means twelve regular ability/ultimate trees. The user selected specialization per ability, not one global specialization for the whole class. Each tree has successive layers of branching choices: earlier decisions open further differentiated choices (D78). Behavior must change along the paths. Exact depth, node count, exclusivity, cross-branch combinations, point allocation, costs, unlocks, and per-ability identity remain to be designed. This is a finite authored structure, not a requirement for infinitely generated branches.

Start grounded and develop toward superhuman but contained speed, skill, and power against gigantic enemies (D12, D18). Techniques evolve, and temporary awakened forms have distinct visuals and moves (D20). The shared opening catastrophe creates the potential, developed through training, discoveries, and experience (D55).

Ability-tree respec costs currency/resources at a town or camp (D71, refined by D75). Exact costs, full/partial or single-tree resets, and refund rules remain open. Respec changes upgrades within the chosen class, not protagonist identity, profession levels, or story decisions.

Tree nodes, level caps, point awards, unlock timing, prerequisite rules, stat growth, and exact automatic companion progression remain open. Different class selections need complete and viable progression without character switching. Awakening uses a combat-built meter and manual activation (D72), with a major humanoid transformation affecting hair, outfit/armor, and silhouette (D77).

Awakening temporarily replaces the normal specialized kit with a fixed class-specific awakened moveset (D79). Preserve the normal build when the form ends. Do not add separate awakened skill trees or assume the kit is just the current normal branches with increased power. Exact attacks, slot mapping, gear/passive interaction, charge/drain, duration, AI activation, and persistence remain open.

### First awakening — a shared crisis

**Confirmed (D113–D114):** all three first awaken during the giant rematch in C05's defense of Hearthmere, and this shared event is the battle's turning point. It includes three distinct forms, not separate personal unlock episodes or a required protagonist-first order. Precise transformation order, phase design, and choreography remain proposals. The opening catastrophe still creates the potential; training, discoveries, and experience develop the control needed to use it.

Proposed first-use structure:

1. Establish a crisis the company understands and let the player contribute with the normal built kit. The difficulty comes from the authored situation, not arbitrarily disabling a dodge or showing a nearly defeated boss become invulnerable.
2. Bring their earned control into focus through full mutual trust and learned cooperation (D115). Show each committing to the other two's part in a shared plan instead of trying to solve the crisis alone. Exact actions remain proposals. Give all three meaningful participation without requiring a supporting character's death to trigger power.
3. Connect the unlock to a readable first activation. The player still builds a combat meter and chooses activation; the scene must not silently replace D72 with automatic transformation. Exact charging, activation prompt, and camera handoff need encounter design. The two AI companions' first activations and later activation policy also need specification.
4. Reveal each recognizable humanoid transformation with distinct visuals, then return promptly to the selected hero's new moveset. No hero choice makes the player a spectator to the other two's breakthrough.
5. Let the player use the awakened kit in meaningful combat before the scene resolves. When the form ends, restore the chosen regular ability build. Later uses follow the established meter/manual-activation rules rather than requiring the same story trigger again.

These beats are proposals around the confirmed shared-crisis placement and trust catalyst, not approved input sequences or balance values. Keep distinct class forms, the player's combat-built meter/manual activation, and superhuman but contained power. The event marks complete earned trust within the trio (D115); their shared life, responsibilities, disagreements, and response to later consequences continue to develop. A shared meter, fused form, new awakened tree, or frame-perfect simultaneous transformation is not established.

The rematch now begins with developed normal abilities and turns through the shared first awakening (D114). Propose a substantial playable use of the new kit before the killing finisher, rather than revealing transformations only for a noninteractive final blow. Build the initial charge through actual combat and present a readable manual activation for the selected hero; exact first-use rules and camera handoff need encounter design. A skip or interruption must preserve the correctly resolved unlock/activation state, not choose a different outcome.

Both siege authority approaches retain this shared breakthrough, with different allied support and battlefield access. The commander/Mara relationship states affect actual participation without gating the required unlock. Later discoveries can deepen mastery, but must not contradict this first-use chronology. Exact repeat-use charge, duration, and AI activation remain open under the existing system requirements.

Equipment primarily increases stats, with occasional distinctive special effects (D36). The strongest gear mainly comes from crafting with rare adventure-earned materials and recipes (D73). Found rewards mix memorable unique items with regular randomized loot (D74). Exact tiers, exceptions, upgrades, and drop rules remain open. Crafting does not change gear into a system where every item rewrites an ability.

Equipped weapons and armor visibly change the hero (D76). Keep customized appearance, visible equipment, and humanoid awakened transformations coherent in gameplay and cinematics. Exact cosmetic overrides and form/gear interactions remain open.

## Awakened visual direction

**Confirmed (D116):** all three forms are beautiful but intimidating, with dark metal, fierce auras, and visibly dangerous power. Give each a distinct expression: a radiant spear champion, a cosmic time mage, and a shadow-wreathed assassin. Retain the confirmed humanoid transformation, recognizable class silhouettes, and major hair/outfit/armor changes. Their shared awakening event does not make their appearances interchangeable.

The following are proposed art/motion briefs, not approved final models, palettes, or attacks:

| Hero | Proposed silhouette/material treatment | Proposed motion and effect language |
| --- | --- | --- |
| Warrior / Brynhildr | A severe spear champion with sculpted dark armor, a strong shoulder/torso shape, and concentrated radiance along the weapon and armor edges. Keep the spear unmistakable. | Decisive planted poses, explosive changes of position, and sharply directed light/impact shapes. Radiance feels powerful and intimidating rather than softly angelic. Ornamental shapes do not establish flight or new traversal. |
| Mage / Celestia | A recognizable humanoid chronomancer with dark structured garments/armor, a distinct head/hair profile, and restrained celestial geometry around the hands and casting silhouette. | Precise gestures, offset echoes, and local cosmic/time distortions. Keep the active character, targets, and real attack timing readable; visual time effects do not grant world-wide time control or unconfirmed puzzle powers. |
| Assassin / Akatsuki | A lean, sharply readable figure with dark layered armor/fabric and a shadow mantle that frames the body instead of replacing it with an unreadable cloud. Retain the weapon identity. | Compressed anticipation, sudden acceleration, knife-bright accents, and brief shadow trails that resolve back to the real body. The aesthetic does not grant permanent invisibility, invulnerability, or new stealth rules. |

Use a few shared material/light motifs to connect their origin while giving each different contour, posing, and effect behavior. Exact colors, costume components, facial/hair treatment, and form/gear priority need dedicated visual briefs. Represent the selected hero's chosen appearance consistently through transformation; the canonical name is a story role, not a requirement to restore a default model.

Readability is part of the target beauty: separate dark silhouettes from dark terrain, preserve enemy telegraphs during fierce effects, and frame action for the original isometric view. Particle density, lighting, animation, and post-processing need later physical-device budgets and 60 fps validation. No artwork, shaders, or performance result is supplied by these written motifs.

D116 specifies appearance and emotional impression. It adds no health drain, corruption track, loss of player control, rage AI, or mandatory exhaustion state. Activation, duration, and fixed class kit behavior remain governed by the earlier confirmed requirements and unresolved balance work.

## Bosses and spectacle

Major bosses are mostly playable fights with short cinematic phase transitions and spectacular finishers (D21). Huge encounters draw on Final Fantasy's boss scale, while fight choreography draws on Solo Leveling (D08–D09).

Keep each phase a meaningful playable problem. Story cinematics support pause and skip without a replay library (D82); exact application to boss transitions/finishers and reward/state resolution still needs specification. Phase persistence, encounter length, target selection, finisher triggers, and exact timings remain open. The existing fixed finisher sequence is a reference, not the final template for every encounter.

## Difficulty and world danger

Offer **Story**, **Normal**, and **Challenging** modes (D63). The world also retains distinct danger tiers with ordinary enemies scaling within limits (D34). These are complementary requirements: selecting Story does not imply that all geography loses its intended threat differences.

Players can change difficulty only at a town or fixed camp (D68). Exact mode differences, defaults, boss scaling, enemy ranges, resource tuning, and reward differences remain open. Difficulty is a combat-accessibility/balance choice, not permission to remove narrative consequences or replace meaningful combat with automated play.

## Defeat versus stop/resume

**Defeat:** return to a town or camp, keep permanent progression, and repeat the journey (D64). Camps are fixed authored locations (D66). Ordinary enemies repopulate along the return journey, while defeated named bosses and permanent story/puzzle progress remain (D67). Destination selection, camp activation, resources, restoration, unfinished boss phases, and companion recovery still need detail.

**Stopping play:** stop almost anywhere and resume the same situation (D30). Do not send a returning player to town simply because the browser was closed. Detailed interruption and active-battle resume behavior still need design.

Use one evolving save per hero with recovery backups, guest start, optional cloud/cross-device synchronization, and offline play after needed content is downloaded (D84–D86). See [the saving brief](SAVE_AND_OFFLINE.md). Recovery backups are separate from skill respec and do not provide routine manual branch rewinding.

**Narrative loss:** some decisions permanently lose supporting people or places (D48). These outcomes persist in the run and are separate from combat return. The core trio survives all narrative routes (D15).

**AI companion knockout:** temporary incapacitation followed by automatic recovery during the fight (D70). This is separate from player defeat and is not a permanent loss. Recovery timing, health, repeated knockouts, and interaction with an interrupted fight still need rules.

Keep these state transitions distinct in the eventual save design. Ordinary enemy repopulation must not restore a lost settlement, reverse an alliance, resurrect a defeated named boss, or reset a solved cooperative puzzle. Repeating a road fight is distinct from repeating a completed story operation. Respawn outside defeat, and the scope/handling of renewed enemies and rewards, remain open. No new save or combat behavior has been implemented during the interview.

## Fixed camps

Camps are already placed in the world, not player-built (D66). Their positions need to support exploration and defeat return. Discovery/activation, services, rest/refills, destination priority, and density remain to be designed.

Town-to-town fast travel is confirmed separately. Camp fast travel is not an assumed extension. The player can stop/resume away from camps; camps are not mandatory save points.

## Mobile and verification context

Design for browser-link play on Apple/Android phones and tablets, with desktop adapting (D24–D27). Minimum 60 fps on iPhone 14 Pro is a requirement to verify on the physical reference device, including demanding combat and presentation (D28).

Typical sessions are 30–60 minutes (D29). A return journey can be consequential without requiring players to repeat an entire multi-hour dungeon because they needed to stop. Encounter resets, safe-route changes, and persistence must be specified explicitly rather than inferred from difficulty labels.

The major requirements are consolidated in [the design overview](DESIGN_OVERVIEW.md). Ability-tree nodes, AI progression details, recovery timing, balance, awakening duration, and technical persistence remain further design work.
