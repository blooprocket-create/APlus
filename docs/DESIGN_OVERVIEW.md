# Astral Chronicles — consolidated design overview

November 4, 2026. Start here to review the replacement game's direction. This consolidates the user interview into a readable brief. It is a design package in progress, not a completed implementation handoff or a description of features already built.

For the build sequence and the specifications each milestone needs, start with the [production roadmap](PRODUCTION_ROADMAP.md).

## What we are making

A cinematic, strongly cel-shaded 3D open-world ARPG for phones and tablets, played from a browser link. Desktop adapts to that primary experience. The original isometric camera follows one selected hero, with assisted targeting and manual movement, attacks, abilities, and dodges.

Keep the spear warrior, chronomancer, and kunai assassin, with major visual redesigns that preserve their identities and class silhouettes. The player chooses one for the playthrough, customizes their name and appearance, and retains that character's authored personality and history. The other two are AI companions. Equipped weapons and armor visibly change the hero.

Build on the existing combat feel toward fast, expressive action. The references are Final Fantasy's huge boss encounters, Solo Leveling's epic fights, and The Last of Us's emotional impact. The look uses bold forms and shadow shapes rather than photorealism.

Minimum **60 fps on iPhone 14 Pro** is a requirement to verify on physical hardware, including demanding play. Support Apple and Android browsers; exact versions, Android reference hardware, and minimum device coverage still need technical definition. No new performance claim is established by this document.

## World Architecture V2 — confirmed direction

The latest decisions (D155–D165) establish **procedural-first geographical generation, one canonical shared world, multiple continents/islands, fully explorable oceans, player-controlled ships with accessible action-RPG handling, optional fast travel, a wider isometric sailing camera, physically accessible free landings, and persistent ships with port/shipyard recovery**. Major story locations remain fixed in the published world, but **Hearthmere's current town layout and source coordinates may be completely rebuilt** if its working assets, quests, story outcomes and cinematic functionality are preserved. Legacy saves need not migrate (D165); World V2 gets a fresh save namespace.

The implementation authority is [World Architecture V2](WORLD_V2_ARCHITECTURE.md). The [Phase 0 audit](WORLD_V2_PHASE0_AUDIT.md) distinguishes current active Hearthmere code from old, still-reachable prototype systems and lists the legacy-retirement and new-world save gates. Proposed terrain, streaming, save, ship and world-builder interfaces are **not yet implemented**; exact landmass geography and scale remain undecided.

## Emotional and narrative identity

The world is harsh and tense, with rare warmth. Three strangers are forced together by the opening crisis and gradually become a close found family. All three survive every narrative route, and their bond remains intact even in the darkest endings: they face the consequences together (D98). Supporting people and places can be permanently lost, including in choices with no perfect answer.

Begin with a roughly 15–20-minute playable lead-in in Hearthmere, meeting people including Mara and Rowan before the crisis (D101). The first major action sequence is an overwhelming giant attack: survive, rescue civilians, and escape rather than defeat it (D102). The [opening sequence draft](OPENING_HOUR.md) proposes the shared activity, connected spaces, class-specific arrival, and rescue/escape stages. Particular scene details remain for review.

The same giant returns during Hearthmere's defense: the trio kills it with a spectacular, earned finisher while protecting the town and people they once had to flee (D103–D105). Both siege authority approaches include this shared main-story payoff. Its death is permanent; exact phases, choreography, and input remain for review.

All three heroes first awaken during Hearthmere's giant rematch, making the shared breakthrough the battle's turning point (D113–D114). Full earned mutual trust is the emotional catalyst: they combine learned mastery instead of fighting as individuals (D115). They retain distinct forms and kits, with the player's combat-meter/manual activation. This grows from the opening catastrophe's potential and earlier mastery. Specific actions, dialogue, phases, reveal order, and activation staging remain for review.

Awakened forms are beautiful but intimidating, combining dark metal and fierce auras with distinct class expressions: a dangerously radiant spear champion, a cosmic time mage, and a shadow-wreathed assassin (D116). Exact designs and palettes remain proposals. This visual direction does not add health drain, corruption, or loss-of-control mechanics.

Between those encounters, Hearthmere is occupied. The trio works covertly with residents and must liberate it before the later siege (D106). Liberation is a covert operation that dismantles garrison control and removes its leadership before a full response (D107). This replaces the earlier immediate public-refuge assumption. If detected before leadership is isolated, the operation continues as harder combat with changed objectives, and liberation remains achievable (D108). Liberation and defense remain distinct; exact access, escalation tasks, other failure rules, timing, and recovery scenes are proposals.

The occupation commander is a capable royal officer who sincerely believes harsh military control prevents another disaster (D109). They believe the official account and do not know Caedran manufactures the attacks; credible evidence can challenge their loyalty (D110). Identity, specific policies, and the evidence/confrontation scenes remain for review; D111–D112 define the possible alliance and fatal unconvinced defeat. Ignorance of the conspiracy does not erase responsibility for coercive rule.

A conditional long-term alliance with that officer is possible: they must give up occupation control, face accountability, and earn trust through later actions (D111). Evidence alone is not recruitment, and alliance does not automatically restore command, select a faction, or erase residents' grievances. Exact alliance conditions and living-branch scenes remain for review.

If defeated without being convinced of Caedran's deception, the commander fights to the death and the alliance opportunity is permanently lost (D112). There is no post-victory capture/recruitment recovery. Exact evidence/confrontation timing remains for review; being detected does not itself close that possibility or select the officer's fate.

The working story is **The Starforged Crown**. A royal shipment brings catastrophe to Hearthmere. The heroes discover that Lord Marshal Caedran manufactures monster threats to make communities dependent on his protection and binding technology. Caedran remains the enemy in every route. The title, exact opening staging, supporting events, and detailed outcomes remain draft fiction.

Player decisions must produce different missions, alliances, final routes, and endings. Endings range from hopeful through bittersweet to genuinely dark. Alliances can change through much of the game, with the largest route commitments late. Earlier permanent consequences do not reset when allies change. Explicit warnings are reserved for the largest irreversible commitments; other decisions rely on understandable context and dialogue.

Under the user's explicit delegation, the resistance conflict has three working identities:

| Group | Priority | Pressure and cost |
| --- | --- | --- |
| Hearth Compact | Protect communities and local civilian independence. | Slower agreement and local protection can leave captives elsewhere waiting. |
| Free Standard | Win through coordinated military action. | Urgency and centralized command can expose civilians and repeat dangerous habits of authority. |
| Severance Circle | Permanently dismantle coercive infrastructure. | Destruction before adequate replacements exist can endanger dependent communities. |

None is simply the good, neutral, or evil route. The confirmed structure has **three final campaigns and nine principal endings**: a distinct hopeful, bittersweet, and dark outcome per route, plus personal and world variations (D96). Both world recovery and personal cost jointly determine hopeful versus bittersweet (D97); personal losses and relationships can affect the principal ending rather than just its epilogue details. [The branching campaign draft](BRANCHING_CAMPAIGN.md) supplies proposed missions, ending titles, conditions, and aftermath scenes, with persistent earlier losses. Those specifics remain for review. The older eight-movement treatment describes one route and is a reference, not the authority for the new branch structure.

The reservoir dilemma is confirmed: save Rowan/the captive ward and lose Lowbank's lower district, or save the district/clinic while Rowan and the remaining captives die. The rejected siege sacrifice split is replaced by a confirmed authority choice: civilian-led defense or emergency military command, with consequences for the resistance afterward. Both can defend Hearthmere. Particular objectives, mandate terms, and costs remain proposals; the initial authority choice does not automatically select an ending.

If Rowan dies, later choices can rebuild Mara's trust or lead to a permanent break with the trio (D99). She understands the reservoir's unavoidable constraint, and grief remains even if trust recovers. After a break she refuses direct cooperation: missions/support change and the trio must work through other allies (D100). The Compact remains available and Mara still opposes Caedran. Specific trust triggers and alternate mission details remain for review.

Emergency authority has **no guaranteed end date**. Persuading or forcing commanders to relinquish it becomes a later story conflict; the siege ending or Caedran's defeat does not automatically restore civilian control. The branch draft proposes a playable relief-route/depot confrontation to develop this requirement. Exact powers, participants, and resolutions remain draft details.

The Hearth Compact finale can save both Sera's rescue group and the allied rearguard through earlier preparation and playable rescue. A failed rescue objective offers an in-mission recovery opportunity; failing recovery can cause a permanent loss. Its former forced sacrifice is removed. That success does not reverse the reservoir loss. Exact rescue tasks, recovery conditions, and casualties are still being designed.

The Free Standard finale retains its confirmed unavoidable tradeoff: silence Caedran's guns to save Hearthmere's forge district while bound conscripts die, or free the conscripts while the district and machinery are destroyed. Earlier evacuation can save residents, but cannot preserve both the district and conscripts. This choice is separate from whether victorious military command relinquishes power.

The Severance Circle finale retains its confirmed shutdown-timing decision: a gradual cut protects dependent patients but lets Caedran's last command cause allied troop losses; an immediate cut protects those troops, with damage to clinics and water systems determined by earlier civilian preparation. Specific casualties, preparation effects, and ending conditions remain to be authored.

Caedran's mother made love conditional on obedience and achievement. She is alive and present, openly dismissing him with the user's line, "you ain’t shit" (D117–D120). He argues back but keeps returning, desperate for a kind word, while demanding obedience from others. Her identity/influence and exact scenes remain to be decided. This deepens his need for control while preserving his responsibility as the antagonist; the trio's freely chosen trust provides a proposed thematic contrast.

Occasional cutscenes can leave the trio's viewpoint, including private scenes with Caedran and his mother (D121). The player may learn things the heroes do not know; private revelations do not automatically become usable character knowledge or evidence. Exact interlude inventory and timing remain for review.

The trio first meets Caedran face-to-face around the campaign's middle, in a tense parley after learning he manufactures the attacks (D122). He wants dangerous research and evidence surrendered, offering positions of power (D123–D124). The player can accept or refuse, creating consequential branches (D125). Acceptance grants real authority, followed by pressure to use it his way (D126). The warrior receives military command, the mage royal research leadership, and the assassin intelligence leadership; all three hold inner-council seats with frontier policy authority (D127). Exact titles, jurisdiction, council procedures, materials, duties, demanded orders, motives, venue, and chronology remain for review. Acceptance is not automatically an undercover plan or a permanent pro-Caedran finale; the eventual-antagonist requirement remains.

In the accepting-power branch, Caedran demands protected witnesses who could expose the attacks (D128). The player can comply, openly refuse, or attempt deception (D129). Handover leads to imprisonment/coercion with a difficult later rescue possible (D130). Open refusal revokes the offices and starts an arrest/witness-seizure attempt (D131). Deception stages a prison-transfer escape (D132); full success protects the witnesses and preserves office/apparent loyalty for continued insider play (D133). Exposure revokes office and starts a playable arrest/extraction, with witness escape still possible (D134). At Hearthmere's giant defense, the trio publicly exposes Caedran's role and rallies resistance. Any remaining insiders sacrifice their cover and offices (D135, D138). Sera and her technicians are the protected witnesses (D136). Captivity opens an optional prison dungeon with substantial puzzles, a distinctive warden boss, and a coordinated escape (D137, D139). Confirming one of the three final campaigns at C06 closes the rescue window. Warn the player before confirmation that Sera and any technicians still captive will die permanently (D140–D142). Each final campaign accounts for the actual survivors and losses.

## Combat, growth, and spectacle

The Hearthmere crossing playtest uses the original isometric camera (D153). Unlocked combat starts from the prototype's automatic targeting, with optional boss lock-on. Dodges interrupt basics and Eclipse recovery after release. A press during commitment is discarded and requires a fresh press (D144–D148). The [combat brief](COMBAT_PROGRESSION.md) records the test loop and open tuning details.

The hero begins grounded and grows to superhuman but contained speed, skill, and power against gigantic enemies. The opening catastrophe creates awakening potential; training, discoveries, and experience develop mastery.

XP and levels support **four independent behavior-changing ability trees per class**: Primary Attack, Skill 1, Skill 2, and Ultimate, matching the current ability-management grouping. Each tree has successive layers of branching decisions. Choices alter how the ability works; this is not a single whole-class specialization or a sequence of percentage increases. Three classes imply twelve normal ability trees. Exact nodes, depth, point allocation, and cross-branch rules remain to be designed. Dash and utility trees are not automatically added.

Awakening uses a combat-built meter with manual activation. A major humanoid transformation changes hair, outfit/armor, and silhouette while preserving identity. During the form, a **fixed class-specific awakened moveset** replaces the normal specialized kit. The selected normal build returns afterward. Separate awakened upgrade trees are not the selected model. Exact attacks, duration, charge rules, gear/passive interaction, and AI activation remain open.

Companions fight independently and grow automatically with minimal management. They can be temporarily knocked out and recover automatically during the ongoing fight. Occasional player-triggered team attacks or finishers provide deliberate coordination.

Bosses are mostly playable, with short cinematic phase transitions and spectacular finishers. Their size must be supported by choreography, arenas, camera framing, and readable playable attacks. A larger mesh or health pool alone does not meet the intended experience.

## Exploration and cooperative puzzles

Make the physically connected world fully explorable, using Skyrim as the user's reference for freedom. Remove the old portal/chapter progression. Exact map size, local access rules, and final-story prerequisites are not yet fixed.

Exploration rewards rare resources and gear, unusual dungeons/bosses, lore snippets, impressive places, secrets, and Easter eggs. Navigation adjusts between clear markers/routes and minimal guidance. Distinct danger tiers remain meaningful, with ordinary enemies scaling within limits. Mounts support physical travel; optional fast travel connects towns. Camps are fixed authored locations, not player-built or automatically fast-travel destinations.

Each hero has one signature puzzle utility:

| Hero/class | Utility |
| --- | --- |
| Mage | Move items instantly between places. |
| Assassin | Stealth. |
| Warrior | Spear-vault across large gaps. |

Utilities work broadly during exploration, with tighter rules for important story puzzles. Once an objective is clear, the player performs their chosen hero's part and AI companions automatically execute the other parts in sequence. Teamwork can open a shared route. The user's reference is a warrior exposing a key across a moat, a mage teleporting it back, and an assassin using stealth and the key to lower a bridge. It must work with each hero selected, without character switching or repeated companion commands.

Include substantial dungeon puzzles and smaller discoveries. Companions gradually offer hints when the player appears stuck. Exact targeting, detection, failure, costs, unlocks, and hint timing remain to be designed.

For the moat in the first slice, the trio explains the full plan in an automatic cutscene before play resumes (D149, D151). Detection restarts the assassin's stealth step with the warrior and mage's progress preserved (D150). A dedicated mobile button activates the selected hero's utility during exploration (D152).

## Crafting, rewards, and the economy

Crafting is deep, with many recipes and nine professions: armor crafting, weapon crafting, accessory crafting, cooking, fishing, mining, smithing, foraging, and potion crafting. Smithing refines ore into ingots and makes metal components; it is distinct from finished weapon/armor crafting. Foraging means picking plants.

The chosen hero can learn all professions, each with independent progression. Recipes come from trainers, shops, exploration, and quest rewards. Gathering and crafting use quick interactions; depth comes from materials, recipes, and profession growth rather than mandatory minigames.

Crafting supplies the party and supports substantial NPC commissions, contracts, and trade. The strongest equipment mainly comes from crafting with rare adventure-earned materials/recipes. Found rewards mix memorable unique items with regular randomized loot. Equipment mainly increases stats, with occasional special effects; ability trees supply the primary behavior changes. Prices, processing recipes, profession levels, resource renewal, and loot details remain design work.

## Difficulty, defeat, and returning to play

Offer Story, Normal, and Challenging modes, changeable only at towns/fixed camps. Paid skill-tree respec is available there for currency/resources.

| Situation | Required outcome |
| --- | --- |
| Ordinary stop/resume | Stop almost anywhere and return to the saved situation. |
| Player defeat | Return to a town/camp, retain permanent progression, repeat the journey. Ordinary enemies repopulate; defeated named bosses and permanent story/puzzle outcomes remain. |
| Companion knockout | Temporary incapacitation followed by automatic recovery during combat. |
| Narrative loss | Remains in that hero's evolving timeline; a respawn does not reverse it. |

Pace primarily for 30–60-minute sessions. Longer dungeons can span sessions. Exact defeat destination, unfinished-boss resets, recovery timing, and interruption behavior still need technical/gameplay specifications.

Start without an account. Optional cloud saves support cross-device synchronization. Each hero has one evolving save with recovery backups rather than manual timeline slots for revisiting choices. Support offline play after needed content is downloaded, synchronizing later. Providers, versions, cache/download coverage, recovery policy, and multi-device conflicts still need design.

## Cinematic and audio direction

Substantial story scenes belong at major turns. Most target 1–3 minutes, with occasional longer scenes. Ordinary conversations stay brief and in-world; boss-phase transitions remain short. Support pause and skip without a replay library.

Generated speech or expressive Sims-like vocalizations are acceptable: dialogue/story presentation needs vocal presence rather than silence. Preserve meaning through readable dialogue where sounds are nonliteral. Exact production is open; live generation is not required and must not become a dependency for downloaded offline scenes.

The score has an orchestral foundation, from intimate themes to enormous boss scores, with electronic/rock elements for battles. Exact motifs, tracks, adaptive rules, facial performance, cinematography, and shot lists remain production/design work.

## Scope status and next concrete writing

The user requires a substantial adventure comparable in completion time to Final Fantasy or Zelda. The current **provisional** targets are 45–55 main-story hours, 70–90 hours for a first run with substantial optional adventures, and 100–120 for a thorough run. These exact ranges are proposals, not confirmed measured outcomes. Branches, deep crafting, and mounts require revisiting the original inventory and measuring per-run playtime rather than summing exclusive routes.

The proposed five-area basin, six settlements, ten main dungeons, four optional dungeons, nine regional sagas, three personal stories, and boss counts are draft inventory. They are not all individually confirmed requirements or authored content ready to implement.

The major direction is established; the next work should produce concrete design rather than an endless interview about tuning numbers:

1. Review the proposed conditions and aftermaths for the nine principal endings in [the branching campaign](BRANCHING_CAMPAIGN.md), then develop detailed scenes and playable consequences. The major finale decision models, reservoir tradeoff, and no-expiry authority conflict are confirmed; precise encounter conditions remain to be authored.
2. Review and develop the [opening sequence draft](OPENING_HOUR.md) into a complete opening-hour treatment and region/encounter brief. The 15–20-minute playable lead-in and giant survival/rescue/escape direction are confirmed; specific activities, encounter stages, and aftermath remain proposals.
3. The twelve ability-tree designs, three awakened kits, and hero/gear/form visual briefs.
4. A technical delivery/persistence/performance plan and a staged implementation handoff with acceptance criteria.

The branching campaign and opening drafts remain story authorities, but the latest technical implementation priority is **World Architecture V2, beginning with Phase 0 audit and non-destructive isolation**. The planned Hearthmere restructuring supersedes any expectation that existing opening-world coordinates must remain fixed. The full campaign and exact landscape are not yet implemented.

## Document map and authority

The user's latest explicit direction governs. [The decision record](DESIGN_DIRECTION.md) preserves original answers and refinement history; specialist briefs organize current requirements. Story treatments remain proposals where not confirmed. [The Long Dawn bible](WORLD_BIBLE.md) documents legacy content only.

| Document | Role |
| --- | --- |
| [Design decision record](DESIGN_DIRECTION.md) | Original user requirements, delegated choices, and interview history. |
| [Story foundation](OPEN_WORLD_STORY.md) | Premise, cast, proposed geography, and synopsis. |
| [Campaign treatment](CAMPAIGN_TREATMENT.md) | Expanded proposed route and provisional content/time inventory; needs branching rewrite. |
| [Branching campaign](BRANCHING_CAMPAIGN.md) | Major decisions, divergent missions, confirmed three-route/nine-ending structure, proposed ending conditions, and continuity ledger. Supersedes conflicting single-route assumptions. |
| [Opening sequence](OPENING_HOUR.md) | Confirmed 15–20-minute playable lead-in; proposed town layout, Mara/Rowan scenes, class arrivals, and first-hour crisis beats. |
| [Resistance design](RESISTANCE_DESIGN.md) | Delegated faction priorities and boundaries. |
| [Combat and progression](COMBAT_PROGRESSION.md) | Action, ability trees, awakening, AI, difficulty, and defeat. |
| [Exploration and puzzles](EXPLORATION_PUZZLES.md) | Utilities, cooperative moat example, exploration, and hints. |
| [Crafting and economy](CRAFTING_DESIGN.md) | Nine professions, recipes, trade, and gear direction. |
| [Narrative and cinematics](NARRATIVE_PRESENTATION.md) | Emotional direction, branching requirements, visual performance, vocals, music, and scene pacing. |
| [Saving and offline](SAVE_AND_OFFLINE.md) | Guest/cloud saves, evolving timelines, recovery, offline content, and unresolved synchronization. |
| [World Architecture V2](WORLD_V2_ARCHITECTURE.md) | Approved world/maritime direction, proposed contracts, phase gates and quality requirements. |
| [World V2 Phase 0 audit](WORLD_V2_PHASE0_AUDIT.md) | Actual entrypoint, source classification, preservation/legacy risks and verification checklist. |

Hearthmere is the sole player-facing campaign. It runs through the refuge, with a local resume per hero. The Hearthmere Outskirts prototype serves as an internal reference for the connected road fight and moat puzzle. The lead-in needs pacing development, and art, vocal performances, and device targets still need production validation. The production roadmap sequences the remaining campaign and delivery work.
