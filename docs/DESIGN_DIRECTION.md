# Astral Chronicles — design direction and interview record

Original interview record updated through November 4, 2026. **World V2 implementation-status cross-reference added November 8, 2026.**

**IMPORTANT for coding agents:** This file is the historical **creative decision log**, NOT an assertion that the project remains unimplemented. Start with [AGENTS.md](../AGENTS.md), the [current evidence-backed implementation status](WORLD_V2_STATUS.md), [World V2 decision register](WORLD_V2_DECISIONS.md), [architecture](WORLD_V2_ARCHITECTURE.md), [roadmap](PRODUCTION_ROADMAP.md) and [Phase 3 handoff](WORLD_V2_PHASE3_HANDOFF.md). Phase 0 preflight, Phase 1 engineering and Phase 2 **staging runtime** are implemented and merged; the existing player-facing Hearthmere opening is still separate from V2. The final world atlas, ships, V2 campaign and production performance are NOT shipped.

This is the record of user-confirmed direction and outstanding design decisions for the replacement game. Read it alongside the [story foundation](OPEN_WORLD_STORY.md) and [expanded campaign treatment](CAMPAIGN_TREATMENT.md). Those documents contain creative proposals; this record distinguishes explicit requirements from ideas still under discussion.

## Latest user art-direction refinement (D166, November 8, 2026)\n\n**Confirmed high-level goal:** Astral Chronicles should become a **beautiful original anime-style game** whose environments lean toward the lush, inviting, hand-painted atmospheric qualities associated with Studio Ghibli, while the **characters and ability effects** have the sharp, intense, spectacular feeling the user associates with Solo Leveling. Treat these works as reference points for visual *qualities*, not a request to duplicate specific copyrighted characters, scenes or designs. The original painted/cel-shaded runtime is a reusable engineering baseline, **not an accepted final visual quality bar**. Exact models, color scripts, VFX techniques and example target frames are **OPEN for look-development and user approval**. Record art-direction target work in [Phase 2.5](WORLD_V2_PHASE2_5_GAMEPLAY_INTEGRATION.md), with full production asset polish still later. This refines D05, D06, D09, D22 and D154 rather than abandoning the isometric gameplay camera.\n\n## How we are working

The user requested an interview process: the agent asks questions, the user answers, and the agent documents the answers. Continue developing the design through focused rounds of questions. Turn answers into concrete design implications, while identifying any implications that require another decision.

The user explicitly requested clickable questions on November 4, 2026. Use the interactive question tool for subsequent interview rounds rather than requiring typed A/B/C replies. Previously typed selections remain valid and are recorded below.

The user authorized building the Hearthmere crossing playtest during the interview. The **full campaign's content** remains in design, while **World V2 engineering implementation has already started**. Record newly approved creative choices here; refer to the status and phase handoffs for implementation state.

A World V2 implementation handoff **has been issued**: [AGENTS.md](../AGENTS.md) gives reading order and coding boundaries, [World V2 status](WORLD_V2_STATUS.md) gives actual code/evidence, and [Phase 3](WORLD_V2_PHASE3_HANDOFF.md) gives the next acceptance plan. Continue interviewing only for **open** creative decisions, not as a prerequisite to working on approved engineering tasks.

## Confirmed direction

| ID | User requirement | Meaning for the design |
| --- | --- | --- |
| D01 | Replace the portals and travel between separate places with an open-world ARPG. | Design a physically connected world, with exploration and travel central to the experience. |
| D02 | Scrap the current quests and establish the storyline before making replacement quests. | Both existing quest chains are legacy material. Develop story and world before production quest scripting. |
| D03 | "Fresh story; keep classes and companions." | Keep the existing combat class and companion foundation while developing fresh fiction. Detailed character, visual, and mechanical revisions still need discussion. |
| D04 | A full game comparable in completion time to Final Fantasy or Zelda. | Plan a substantial campaign and optional adventures. Exact hour targets remain a proposal until confirmed and eventually measured. |
| D05 | "i want this game to be a cinematic marvel. the cutscenes should be beautiful." | Cinematic presentation is a core creative requirement. Develop composition, staging, animation, performance, lighting, editing, music, and transitions as part of the design. D22 establishes cel-shaded 3D; precise cinematic grammar and production approach remain undecided. |
| D06 | "the gameplay abilities, effects, vibe should lean very Anime Over the Top heavy." | Strong anime influence and exaggerated spectacle must shape abilities, effects, and overall presentation. Determine the references, visual language, and escalation through the interview. |
| D07 | Ask questions, document the answers, then hand all documents to an agent when ready. | Use an explicit decision record and an eventual implementation package. The decision-interview entry predates the current World V2 engineering implementation; see the current status document. |
| D08 | "Final Fantasy with the huge bosses fights" | Use Final Fantasy as the reference for huge boss encounters. Exact entries, creature designs, encounter structure, and frequency remain to be discussed. |
| D09 | "Solo Leveling epic fight scenes" | Use Solo Leveling as the reference for epic fight presentation. Translate this into original choreography, action staging, and effects. D22 establishes cel-shaded 3D; specific choreography and effect techniques remain open. |
| D10 | "Last of Us hits the emotional core" | Use The Last of Us as the emotional reference. Build relationships and consequences that make the spectacle matter. D13–D15 establish the emotional tone, central bond, and limits on permanent loss. |
| D11 | "Close third-person, behind the hero" | Superseded by D153 after playtesting. |
| D12 | "Start grounded; gradually become overwhelmingly powerful" | Begin with grounded heroes and escalate their capabilities and spectacle over the adventure. Do not introduce the party with its late-game power already unlocked. |
| D13 | "A harsh, tense world with rare moments of warmth" | Sustained danger, pressure, and hardship define the journey. Warmth is infrequent and meaningful. This supersedes the foundation's earlier broadly adventurous tone. |
| D14 | "The three heroes becoming a close found family" | The evolving bond among Brynhildr, Celestia, and Akatsuki is the emotional center. Settlements and supporting characters enrich that bond rather than displacing it as the main emotional focus. |
| D15 | "The core trio survives; major supporting characters can die" | All three core heroes survive the main story and its optional narrative outcomes. Earned permanent deaths are permitted for major supporting characters, without being required. |
| D16 | "Choose one hero for the whole game; the other two use AI" | The player selects one of the three heroes for a playthrough. The other two remain AI-controlled companions. Do not plan free character switching or required player-controlled sequences as the other heroes. |
| D17 | "what we have right now, kinda works. we can build on that. fast expressive actions." | Evolve the current combat foundation and feel toward fast, expressive action. Preserve what works while improving presentation and responsiveness; do not replace it wholesale with a different combat model. |
| D18 | "Superhuman but contained: incredible speed and skill against gigantic enemies" | Refines D12's endgame ceiling: extraordinary speed, skill, and power against gigantic opponents, with contained effects and human-scale stakes. Terrain-shattering or army-erasing power is not the selected direction. |
| D19 | "They act independently, with occasional player-triggered team attacks or finishers" | AI companions handle routine combat independently. The player can occasionally trigger coordinated team attacks or finishers without taking control of another hero. |
| D20 | "Evolving techniques plus temporary awakened forms with distinct visuals and moves" | Progression develops normal techniques and introduces temporary awakened forms that change both appearance and moves. Awakening is a gameplay capability, not solely a cinematic event or a numerical damage boost. |
| D21 | "Mostly playable combat, with short cinematic phase transitions and spectacular finishers" | Major boss encounters remain primarily under direct player control. Short authored transitions and spectacular finishers punctuate the action. Extended cinematic action is not the default fight structure. |
| D22 | "Strongly cel-shaded 3D: bold shapes and shadows, like an animated anime" | Strong cel shading, bold forms, and deliberate shadow shapes define the visual foundation across gameplay and cinematics. |
| D23 | "Major visual redesigns while preserving their identities and class silhouettes" | Substantially redesign Brynhildr, Celestia, and Akatsuki while preserving who they are and their recognizable class silhouettes. Existing meshes and outfits are references, not final designs. |
| D24 | "Phones/tablets first; desktop adapts to that experience" | Design the replacement experience primarily for phones and tablets. Desktop adapts to that design. Mobile control, camera, readability, pacing, and performance are primary design concerns. |
| D25 | "Open a browser link and play" | The primary mobile launch experience is opening a web link and playing. An installed app is not required to access the game. |
| D26 | "Assisted camera and target selection; I handle movement, attacks, abilities, and dodges" | Assist camera behavior and target selection on touch while the player manually controls movement and combat actions. Assistance does not imply automated attacks, dodges, movement, or quest completion. |
| D27 | "Both Android and Apple. its web so... yea." | Support browser play on both Android and Apple phones/tablets. Treat each as a validation target; web delivery alone does not establish tested compatibility. |
| D28 | "im running on an iphone 14 pro. so ide like that to have at minimum 60fps." | iPhone 14 Pro is a named reference device with a minimum 60 fps requirement. This is a target to demonstrate on physical hardware, not a performance result already achieved. |
| D29 | "Primarily 30–60-minute sessions" | Pace the full-length adventure around 30–60-minute play sessions, with meaningful progress and natural pauses within that span. This does not shorten the total campaign target. |
| D30 | "Stop almost anywhere and resume the same situation" | Let players suspend almost anywhere and return to the situation they left, rather than routinely replay travel or return to a town/checkpoint. Boss, cinematic, and interruption edge cases need detailed rules. |
| D31 | "ide say like skyrim. fully explorable." | Skyrim is the user's reference for exploration freedom. The world should be fully explorable, rather than a sequence of regions unlocked by completing chapters. Final-story access, local barriers, and danger rules remain distinct design questions. |
| D32 | "rare resources+gear, unusual dungeons+bosses, lore snippets, impressive places, secrets and easter eggs." | Exploration should reward the player with this mix of tangible rewards, distinctive challenges, environmental spectacle, lore, and hidden discoveries. The user did not assign a strict ranking or content count. |
| D33 | "Let players adjust between clear markers/routes and minimal guidance" | Navigation guidance is adjustable, supporting both explicit markers/routes and a low-guidance experience. Default settings and individual controls remain open. |
| D34 | "Distinct danger tiers, with ordinary enemies scaling within limits" | Preserve distinct world danger tiers while limiting how far ordinary enemies scale with the hero. Exact tier ranges, scaling rules, and boss behavior remain to be designed. |
| D35 | "A deep crafting economy with many recipes and professions" | Develop a substantial crafting economy with multiple professions and many recipes, giving gathered resources a meaningful progression and economic role. The profession list and economic rules remain open. |
| D36 | "Mostly stronger stats, with occasional distinctive special effects" | Equipment progression primarily improves stats, with selected items providing special effects. Major ability/build changes are not the baseline role of gear. |
| D37 | "mounts, and fast travel between towns." | Include mounts for physical travel and an optional fast-travel network between towns. Discovery requirements, costs, restrictions, and the mount system remain undecided. |
| D38 | "armor crafting, weapon crafting, accessory crafting, cooking, fishing, mining, smithing, foraging(picking plants), potion crafting." | Include these nine named professions. D41 clarifies smithing as refining and metal-component production, separate from finished weapon/armor crafting. |
| D39 | "Supply the party and support a substantial system of NPC commissions, contracts, and trade" | Crafting serves the party and a substantial NPC-facing economic system, including commissions, contracts, and trade. Detailed market and contract rules remain open. |
| D40 | "Quick interactions; depth comes from materials, recipes, and profession progression" | Gathering and crafting use quick interactions. Depth comes from materials, recipes, and profession progression, rather than a baseline of hands-on minigames. |
| D41 | "Refine ore into ingots and make metal components used by other crafters" | Smithing processes ore into ingots and produces metal components for other crafting professions. It remains separate from making finished weapons and armor. |
| D42 | "The chosen hero can learn every profession, each with its own progression" | All nine professions are available to the selected hero, each progressing independently. Do not require profession distribution across companions or a limited profession selection. |
| D43 | "A mix of trainers, shops, exploration, and quest rewards" | Recipes come through all four channels: trainers, shops, exploration, and quest rewards. Exact recipes, prerequisites, and distribution remain open. |
| D44 | "Customize the selected hero's name and appearance, keeping their authored personality and history" | The selected hero supports custom naming and appearance while retaining the chosen character's authored personality, history, relationships, and role. Customization is not a blank-slate replacement protagonist. |
| D45 | "voice can be procedurally generated. they can sound like sims for all i care, as long as its not straight silence." | Generated vocal audio is acceptable, including expressive Sims-like vocalizations. Dialogue/story presentation needs vocal presence; intelligible human-style speech is not required for every line. Exact coverage and the mix of speech/vocalizations remain open. |
| D46 | "choice should matter... it should drive the narrative." | Player choices must causally drive narrative developments. D47 confirms different missions, alliances, final routes, and endings; exact branch content remains to be authored. |
| D47 | "Different missions, alliances, final routes, and endings" | Major choices produce different missions, alliances, final routes, and endings. A shared finale with only epilogue variations is not the selected branch scope. |
| D48 | "Sometimes there is no perfect answer: saving one person or place can mean losing another permanently" | Some decisions impose unavoidable, permanent tradeoffs involving supporting people or places. Perfect preparation is not a universal way to prevent every loss. The core trio still survives. |
| D49 | "Use explicit warnings only for the largest irreversible commitments" | Reserve explicit consequence warnings for the largest irreversible commitments. Other decisions communicate through the situation, dialogue, and context. Exact warning thresholds remain to be designed. |
| D50 | "Strangers forced together by the opening crisis" | The three heroes do not begin as an established company or old friends. The opening crisis forces strangers to cooperate, beginning their found-family development. |
| D51 | "Caedran stays the enemy; branching alliances are among the groups resisting him" | Caedran remains the antagonist across routes. Branching alliances involve groups resisting him, not joining his cause as a full route. |
| D52 | "A range from hopeful to bittersweet to genuinely dark, depending on the choices" | Endings span hopeful, bittersweet, and genuinely dark outcomes driven by player choices. Every ending preserves the core trio's survival. |
| D53 | "u decide." — resistance disagreements | The user delegates the resistance-conflict design to the documenting agent. Adopt the three-priority conflict in [the resistance design](RESISTANCE_DESIGN.md): protect communities, win through coordinated military action, or permanently dismantle coercive infrastructure. |
| D54 | "Alliances can shift through much of the game; the largest route commitments come late" | Let alliances change during much of the campaign, with the largest route commitments late. Earlier choices can still have permanent consequences. |
| D55 | "1 + 3." — awakening origin | Combine the shared opening catastrophe with difficult techniques developed through training, discoveries, and experience. The incident creates potential; development of mastery earns the powers. |
| D56 | "all get 1 special utility ability that can be used for puzzles" | Give each hero one signature puzzle utility: mage item teleportation, assassin stealth, and warrior spear-vaulting over large gaps. D57–D59 refine access, freedom, and puzzle emphasis. Exact ability rules remain open. |
| D57 | "Companions recognize opportunities and use their utilities automatically" | AI companions apply puzzle utilities automatically. D60 clarifies coordinated roles after the objective is clear: the player performs their selected hero's part, while AI performs the other two. |
| D58 | "Broadly during exploration, with tighter rules for important story puzzles" | Support broad utility use on compatible world objects/terrain during exploration, with tighter authored rules for important story puzzles. |
| D59 | "A mix of substantial dungeon puzzles and smaller exploration discoveries" | Include substantial dungeon puzzles as well as smaller environmental discoveries. Puzzles are more than brief obstacles between fights, without making every discovery a large puzzle. |
| D60 | "after the objective is clear, everyone springs into action." | Coordinate puzzle roles once the objective is understood. The player executes the selected hero's role; AI companions execute the others in the necessary sequence. |
| D61 | Moat example; "see previous response." | Cooperative utility sequences can open a shared route: warrior vaults/breaks a key container, mage teleports the key back, assassin uses stealth and the key to lower a bridge, and the remaining party crosses. |
| D62 | "Companions gradually offer hints if I seem stuck" | Companions provide progressive puzzle hints when the player appears stuck. Exact timing, escalation, repetition, and settings remain open. |
| D63 | "Selectable Story, Normal, and Challenging modes" | Offer all three combat difficulty modes. D68 restricts changes to towns/camps; exact balance and defaults remain open. |
| D64 | "Return to a town or camp, keeping permanent progression but repeating the journey" | Defeat returns the player to a town or camp, retaining permanent progression and requiring travel back. This is separate from stopping/resuming the same situation. |
| D65 | "Earn XP and levels, then choose upgrades in class skill trees" | Combat progression uses XP, levels, and player-selected class skill-tree upgrades. Professions retain their separate progression. |
| D66 | "Fixed camps already placed in the world" | Camps are authored fixed locations in the world. Player-created camps are not the selected system. |
| D67 | "Repopulate ordinary enemies along the return journey, while defeated named bosses stay defeated" | After defeat, ordinary enemies repopulate the return journey. Previously defeated named bosses remain defeated, and permanent story/puzzle progress remains. |
| D68 | "Only at a town or camp" — changing difficulty | Players can change difficulty only at towns or fixed camps. Exact interface and encounter/reward effects remain open. |
| D69 | Round 20, 1.B: automatic companion growth | Companions grow automatically with sensible class presets and minimal management. Do not require separately managed companion XP/skill-tree builds as the default. |
| D70 | Round 20, 2.B: automatic recovery during combat | Companions can suffer temporary knockouts and recover automatically during the fight. Manual revival is not required for routine recovery. |
| D71 | Round 20, 3.B: paid respec at towns/camps | Class skill-tree respec is available at towns/camps for currency or resources. Exact cost and payment type remain open. |
| D72 | Round 21, 1.A: combat-meter awakening | Build an awakening meter through combat, then let the player activate the temporary form manually. Exact charge rules, duration, and relation to ultimates remain open. |
| D73 | Round 21, 2.B: strongest gear mainly crafted | The strongest equipment mainly comes from crafting with rare materials and recipes earned through adventures. Found gear still has a role; exact relative tiers and exceptions remain to be designed. |
| D74 | Round 21, 3.A: authored uniques plus randomized loot | Mix memorable unique items with regular randomized equipment drops. Exact drop frequency, stat rolls, rarities, and crafted-item variation remain open. |
| D75 | "B but for each ability... Each one gets its own tree. How u build that tree determines how the ability works." | Each of the three regular abilities and the ultimate gets its own behavior-changing specialization tree. This refines class skill trees into four independent ability trees rather than one whole-class specialization. |
| D76 | Round 22, 2.A: visible equipped weapons and armor | Equipped weapons and armor visibly change the hero. Exact visual coverage, cosmetic overrides, and item appearances remain open. |
| D77 | Round 22, 3.B: major humanoid awakened transformation | Awakening substantially changes the humanoid appearance, including hair, outfit/armor, and silhouette, while preserving recognizable character/class identity. |
| D78 | "Make choices with branches that make more branches that make more branches." | Each ability tree has successive layers of branching choices, with earlier decisions opening further differentiated choices. It is not a single flat specialization selection. Exact depth, node count, and cross-branch rules remain open. |
| D79 | Round 23, 2.B: fixed awakened moveset | Awakening temporarily replaces the normal specialized moves with a fixed class-specific awakened moveset. Separate awakened upgrade trees are not the selected model. |
| D80 | Round 23, 3.A: major-turning-point cinematics | Give major story turning points substantial cinematic scenes, while ordinary conversations stay brief and in-world. Boss transitions remain short under D21. |
| D81 | Round 24, 1.A: mostly 1–3-minute scenes | Most story cinematics target roughly 1–3 minutes, with occasional longer major turning points. These are pacing targets, not mandatory lengths for every scene. |
| D82 | Round 24, 2.B: pause and skip, no replay library | Let players pause and skip cinematics. A scene replay library is not part of the selected direction. |
| D83 | Round 24, 3.A+B: orchestral foundation with electronic/rock battle elements | Use an orchestral musical foundation, from intimate character material to large boss scores, blended with electronic and rock elements for battles. |
| D84 | Round 25, 1.A: guest start with optional cloud sync | Start without an account; optionally enable cloud saves and cross-device synchronization. No provider or backend has been selected. |
| D85 | Round 25, 2.B: one evolving save per hero | Each hero has one evolving save with recovery backups, rather than multiple manual slots for rewinding decisions. |
| D86 | Round 25, 3.A: downloaded-content offline play | Support offline play once needed content is downloaded, synchronizing later when connected. Exact download/cache coverage and sync rules remain to be designed. |
| D87 | "Branching campaign, major choices, final routes, and endings" — next writing focus | Develop the concrete branching narrative next. This authorizes design/document writing, not gameplay implementation or an automatic endorsement of every new proposed event. |
| D88 | "Keep this specific tradeoff" — reservoir | Confirm C02: save Rowan/the captive ward at the cost of Lowbank's lower district, or save the district/clinic while Rowan and the remaining ward captives die. Preserve the unavoidable loss and its later consequences. |
| D89 | "Rework the siege decision entirely" | Withdraw the proposed Mara-versus-Sera/regiment siege split. Redesign C05 substantially; do not retain its assigned deaths, capture, or regiment outcome as approved consequences. This does not establish permanent plot protection for either supporting character. |
| D90 | "Authority fork: civilian-led defense versus emergency military command, with consequences for the resistance's power afterward" | C05 is a choice of civilian-led coordination or emergency military authority. Make it affect the defense and post-siege institutions. The user selected the model, not a preferred in-game side or every proposed consequence. |
| D91 | "No guaranteed end date; forcing or persuading commanders to relinquish power becomes a later conflict" | Emergency command has no automatic expiry at the siege's end or Caedran's defeat. Restoring civilian control becomes a later conflict with persuasion or force as possible approaches. Scope of powers is distinct from their duration. |
| D92 | "Let earlier preparation and the playable rescue make saving both possible here" | The Hearth Compact finale can save both Sera's rescue group and the allied rearguard through preparation and playable action. Remove its scripted unavoidable either/or loss. The reservoir tradeoff remains irreversible. |
| D93 | "Give an in-mission recovery opportunity; failing that can cause a permanent loss" | If the player survives combat but fails a Compact finale rescue objective, provide an in-mission recovery opportunity before a permanent loss can occur. Recovery failure can have lasting consequences; success is not guaranteed. Exact objectives and loss conditions remain proposals. |
| D94 | "Keep this specific unavoidable tradeoff" — Free Standard finale | Confirm S3: silence Caedran's guns to save Hearthmere's forge district while the exposed bound conscripts die, or free those conscripts while the district and its machinery are destroyed. Earlier evacuation efforts can save residents, but cannot save the district as well. |
| D95 | "Keep this timing decision, with civilian preparation affecting the consequences" — Severance Circle finale | Confirm C3: gradual shutdown protects dependent patients but lets Caedran's last command reach allied troops and cause losses; immediate shutdown protects those troops, while earlier civilian preparation determines damage to clinics and water systems. Exact casualties and preparation thresholds remain to be authored. |
| D96 | "A distinct hopeful, bittersweet, and dark ending per route, plus variations (nine main endings)" | Establish three final campaign routes with three distinct principal outcomes each: hopeful, bittersweet, and dark. Add personal and world variations within those nine endings. Supersedes the earlier six-ending proposal; titles, exact conditions, and scenes remain proposals. |
| D97 | "Both together: the world's recovery and the personal cost should jointly determine the ending" | Determine hopeful versus bittersweet outcomes using both the world's recovery and the personal cost of the journey. Personal consequences can affect the principal ending, not only variations within a world-state category. Exact combinations and thresholds remain to be authored. |
| D98 | "Their bond remains intact: they face the consequences together, even when the world ends badly" | The trio survives and retains its found-family bond in every ending, including the darkest outcomes. Do not use permanent estrangement, an emotionally broken trio, or separate departures as an ending cost. Personal and world consequences still matter. |
| D99 | "Later choices can rebuild her trust or lead to a permanent break with the trio" — Mara after Rowan's death | If the player saves Lowbank and Rowan dies, Mara understands the unavoidable tradeoff, but later choices can restore her trust or produce a permanent relationship break. Grief remains. Exact triggers, scope of the break, and ending effects still need authoring. |
| D100 | "Refusal to cooperate directly: her missions and support change, and the trio must work through other allies" | After a permanent break, Mara refuses direct cooperation. Change her missions/support and provide approaches through other established allies. The Compact remains a possible alliance and Mara still opposes Caedran. This is not merely distant dialogue or automatic active political opposition. |
| D101 | "A brief playable lead-in, roughly 15–20 minutes: meet people and experience town life, then the crisis hits" | Begin with roughly 15–20 minutes of playable life in Hearthmere, introducing people including Mara and Rowan before the opening crisis forces the trio together. Specific tasks, scene order, and encounter staging remain proposals. |
| D102 | "An overwhelming giant attack: the three must survive, rescue civilians, and escape rather than defeat it" | The opening's first major action sequence is survival, civilian rescue, and escape from an overwhelming giant. The grounded heroes do not defeat it here. Specific creature design, rescue stages, damage rules, and later appearances remain proposals. |
| D103 | "Yes—a major main-story rematch that shows how far the trio has grown" | Bring the opening giant back for a major required-story rematch that demonstrates the trio's growth. It is not only an optional hunt. D104 sets its placement in Hearthmere's defense; D105 establishes its death. Encounter mechanics remain to be authored. |
| D104 | "During the return to defend Hearthmere: defeat the creature that once drove you out while protecting the same town and people" | Place the rematch in C05, Hearthmere's defense, on the shared main-story path. The company defeats the same giant while protecting the town. Both siege authority approaches retain this payoff. D105 subsequently confirms a killing finisher; exact phases remain to be authored. |
| D105 | "Kill it with a spectacular, earned finisher—the threat that drove them out is finally ended" | The Hearthmere rematch ends with the giant's death and a spectacular finisher earned through playable combat. This resolves its individual threat permanently; no liberation-versus-killing branch is required. Exact choreography and input remain proposals. |
| D106 | "An occupied town: the trio works covertly with residents and must liberate it before defending it" | After the opening attack, Hearthmere is occupied. The trio cooperates covertly with residents and liberates the town before C05's later defense/giant rematch. Supersedes immediate open-refuge assumptions. D107 selects covert liberation; occupation access, exact timing/objectives, and specific resident roles remain proposals. |
| D107 | "A covert operation: the trio dismantles the garrison's control and removes its leadership before it can mount a full response" | Liberation is led by a covert operation that dismantles the garrison's control and removes its leadership before a full response. Earlier resident cooperation prepares access. D108 establishes combat escalation after exposure; exact objectives, other failure rules, leadership fate, and timing remain to be authored. |
| D108 | "Let the operation turn into harder combat with changed objectives, while liberation remains achievable" | If detected before garrison leadership is isolated, continue into a more difficult combat version with changed objectives. Liberation remains achievable; detection itself is not instant failure or compulsory retreat. Specific escalation tasks and other failure rules remain to be authored. |
| D109 | "A capable royal officer who sincerely believes harsh military control prevents another disaster" | Hearthmere's occupation commander is a competent royal officer with a sincere protective rationale for coercive military rule. D110 establishes ignorance of Caedran's manufactured attacks. Identity and specific actions remain to be authored; D111–D112 define the possible alliance and fatal unconvinced defeat. |
| D110 | "They believe the official account and do not know the attacks are manufactured; credible evidence could challenge their loyalty" | The commander is unaware of Caedran's manufactured attacks and believes the official account. Credible evidence can challenge their loyalty. This does not guarantee surrender, future alliance, or absolution for occupation policies; those responses remain to be authored. |
| D111 | Phone reply A: "Yes, eventually—but they must surrender control, face accountability, and earn trust through later actions" | A conditional long-term alliance with the former occupation commander is possible. They must relinquish occupation authority, face accountability, and earn trust through subsequent actions. Proof alone does not create a trusted ally; this outcome is not mandatory. |
| D112 | Phone reply C: "They fight to the death; the chance for an alliance is lost" | If the trio defeats the commander without convincing them of Caedran's deception, the commander dies fighting. There is no post-victory capture/evidence/recruitment recovery in that branch. Exact confrontation and evidence-opportunity timing remain to be authored. |
| D113 | Phone reply B: "All three awaken during one shared crisis" | All three heroes experience their first awakenings during the same shared main-story crisis. D114 places it in Hearthmere's giant rematch. Keep distinct class-specific forms, the catastrophe-plus-earned-mastery origin, and manual combat-meter activation for the player. Exact staging and input handoff remain to be authored. |
| D114 | Phone reply B: "During the rematch—the shared awakening becomes the battle's turning point" | The trio's first shared awakening occurs during C05's giant rematch, turning the battle. The giant's permanent death and earned finisher remain. D115 establishes complete earned mutual trust as the emotional catalyst. Exact scene actions, phase design, reveal order, and playable activation remain to be authored. |
| D115 | Phone reply C: "They finally trust one another completely, combining everything they've learned instead of fighting as individuals" | Complete earned mutual trust is the emotional catalyst for the shared awakening in the giant rematch. They combine learned mastery and commit to each other's roles. Exact scene actions and dialogue remain proposals; no new bond-meter or fused-form system is established. |
| D116 | Phone reply "B and C": intimidating beauty plus distinct class expressions | Awakened forms combine dark metal, fierce auras, and visibly dangerous power with distinct identities: a radiant spear champion, a cosmic time mage, and a shadow-wreathed assassin. Apply the intimidating tone across all three; the warrior's radiance can be severe rather than serene. Exact designs/palettes remain proposals. This visual direction does not add a gameplay cost or loss-of-control mechanic. |
| D117 | "Mommy issues" — Caedran's motivation | Root Caedran's need for control in unresolved issues involving his mother. The nature of that relationship, what happened, her present status, and its specific expression remain to be clarified. This does not establish a diagnosis, a hidden mother-mastermind, or absolution for his actions. |
| D118 | Phone reply A: "Her love depended on obedience and achievement. He still needs approval—and demands obedience from everyone else" | Caedran grew up with maternal love conditional on obedience and achievement. His continuing need for approval feeds his demand for others' obedience. Mother's identity, present status/involvement, specific incidents, and reveal scenes remain open. He remains responsible for his choices. |
| D119 | "She just walk around saying ‘you ain’t shit’ to him" | His mother is alive and present in his life, openly belittling him and dismissing his worth/achievements. The user's phrase supplies her blunt voice. Her name, rank/influence, public versus private context, and Caedran's response remain to be authored. |
| D120 | Phone reply C: "Argues back—but keeps returning, desperate for one kind word" | Caedran challenges his mother's insults but repeatedly returns seeking affection/approval. His defiance does not end the need. Exact dialogue, witnesses, scene placement, and her social/political role remain open. |
| D121 | Phone reply A: occasional private scenes outside the trio's viewpoint | Cutscenes may occasionally show events the trio does not witness, including Caedran's private interactions with his mother. Separate player knowledge from character knowledge. This permits cinematic viewpoint changes, not playable protagonist switching. Exact scene inventory and timing remain proposals. |
| D122 | Phone reply B: "Around the middle—a tense parley after they know what he's doing" | The trio first meets Caedran face-to-face around the campaign's middle, in a tense parley after learning he manufactures the attacks. Earlier private cutscenes can introduce him to the player. Exact purpose, terms, venue, and outcome remain to be authored. |
| D123 | Phone reply B: "Their leverage—he wants dangerous research and evidence surrendered in exchange for concessions" | Caedran's primary parley goal is to obtain research and evidence that give the resistance leverage. He offers concessions in exchange. Exact material demanded, concessions, enforcement, player options, and consequences remain to be authored. This is not a demand for public endorsement by default. |
| D124 | "Positions of power" — Caedran's concession | Caedran offers positions of power in exchange for the demanded research and evidence. Exact offices, authority, conditions, whether the offer is genuine, and whether/how the player may accept remain open. Offering power does not itself establish a route permanently joining Caedran. |
| D125 | "Yea it's a choice for the player" — accepting power | The player may accept or refuse Caedran's offered positions. Make this a consequential branch rather than a fixed party refusal. Acceptance is not automatically an infiltration plan; motives, actual authority, obligations, and later course remain to be authored. Caedran's established eventual-antagonist role is unchanged unless explicitly revised. |
| D126 | Phone reply A: "Real authority, followed by pressure to use it his way" | Accepting the offer grants genuine authority, not merely titles or ceremonial access. Caedran subsequently pressures the office-holders to exercise it according to his priorities. Exact offices, scope, initial decisions, demanded orders, and consequences remain to be authored. |
| D127 | Phone reply "A+C": class-specific offices plus inner-council seats | Caedran offers military command to the warrior, royal research leadership to the mage, and intelligence leadership to the assassin, each with a seat on his inner council and authority over frontier policy. Exact titles, jurisdiction, council procedures, resources, and demands remain to be authored. |
| D128 | Reply B: "Hand over protected witnesses who could expose his manufactured attacks" | In the accepting-power branch, Caedran's first major loyalty demand is surrender of protected witnesses who can expose the engineered attacks. Exact identities, evidence, player responses, witness fates, and response to refusal remain to be authored. |
| D129 | "Comply, openly refuse, or attempt deception to protect the witnesses" | Author all three responses to the witness demand. Deception is a playable attempt, not an automatic success or the assumed motive for originally taking office. Exact plans and success/failure conditions remain open. |
| D130 | "They are imprisoned and coerced, with a difficult later rescue possible" | A deliberate handover leads to captivity and coercion, with a difficult later rescue opportunity. Do not replace it with automatic execution. Rescue is possible, not guaranteed; its requirements and failure outcomes remain to be authored. |
| D131 | "Revoke their offices and attempt to arrest them and seize the witnesses" | Open refusal causes Caedran to revoke the trio's offices and initiate an arrest/witness-seizure attempt. The attempt is not automatic capture, a forced death, or instant game over. Exact confrontation/escape and seizure outcomes remain open. |
| D132 | "Stage a prison-transfer escape so it appears the witnesses got away without the trio's help" | The deception plan stages an apparent escape during a prison transfer, concealing the trio's assistance. Exact preparation, route, cooperation, and verification remain to be authored. Fake deaths and multiple alternative plans are not confirmed. |
| D133 | "Yes—they can continue working from inside until later choices or events cause a break" | Complete deception success protects the witnesses while preserving the trio's offices and apparent loyalty. Continued insider play is possible; do not immediately revoke office merely to merge the branches. Exact duration and later break remain open. |
| D134 | "Offices are revoked and an arrest/extraction fight begins; saving the witnesses is still possible during play" | An unraveling deception causes revocation and a playable arrest/extraction confrontation. The player can still get witnesses out; capture is not automatic. Exact rescue/capture conditions and encounter/defeat behavior remain to be authored. |
| D135 | "Until Hearthmere's giant defense, which forces an open break with Caedran" | Successful deception can preserve the insider branch until C05's giant defense. That event forces an open break with Caedran; do not expose the earlier successful escape merely to end the branch. Exact cause/staging of the break remains to be authored. |
| D136 | "Sera and a small team of technicians with direct knowledge of Caedran's work" | Sera anchors the protected witness group, alongside a small technical team with direct knowledge. Their identities/details, testimony, individual outcomes, and availability in later scenes must follow the actual branch. |
| D137 | "A substantial optional rescue arc; leaving it unresolved has lasting consequences" | If Sera/the witnesses are captured or handed over, provide a substantial optional rescue arc. Leaving it unresolved matters permanently to the timeline; the main story must remain playable without completing it. Exact rescue operation, cutoff, unrescued fate, and personal consequences remain to be authored. |
| D138 | "The trio publicly exposes his role in the attack while defending Hearthmere, sacrificing its cover to rally resistance" | During C05 the trio publicly exposes Caedran's role in the giant attack to rally resistance. If still serving as insiders, they openly sacrifice their cover and offices. Exact proof, witnesses, and encounter staging remain to be authored. |
| D139 | "A prison-dungeon expedition: substantial puzzles, a distinctive warden boss, and a coordinated escape" | Sera's optional rescue takes place in a prison dungeon with substantial puzzles, a distinctive warden boss, and a coordinated escape. |
| D140 | "A clearly warned story commitment closes the rescue window; leaving her behind past that point causes her permanent death" | An explicit story commitment before the finale closes Sera's rescue window and permanently kills her if she remains captive. D141–D142 define the commitment and extend the same consequence to captive technicians. |
| D141 | "When the player commits to one of the three final campaigns" | Confirming the choice of final campaign at C06 closes the optional prison rescue window. Warn the player while they can still leave and attempt the rescue. |
| D142 | "They die alongside Sera" | The C06 cutoff permanently kills the technicians still captive. Apply the cutoff to each witness's actual custody state. |
| D143 | "Follow behind automatically, with a swipe to look around and a tap to recenter" | Superseded by D153 after playtesting. |
| D144 | "Soft aim toward the enemy I’m pointing at, with an optional lock-on for bosses" | Use directional soft aim in touch combat. Offer optional boss lock-on. The input that expresses aim direction and the lock controls remain open. |
| D145 | "Let me cancel basic attacks, but make the strongest abilities a commitment" | A dodge can interrupt basic attacks. The strongest abilities have a committed phase. Which abilities qualify and when the phase ends remain open. |
| D146 | "honestly the way its handled right now feels alright. adapt that maybe?" | Use the existing automatic targeting feel as the baseline for the first slice. The prototype turns attacks toward the nearest enemy in range. Evaluate directional refinements with the new camera. Optional boss lock-on remains part of D144. |
| D147 | "As soon as the attack releases. Dodge can interrupt the recovery." | Committed abilities hold the player through windup. A ready dodge becomes available when the attack releases and can interrupt recovery. |
| D148 | "Wait for me to press dodge again after the commitment ends." | Discard a dodge press received during commitment. Require a fresh press at or after release. |
| D149 | "a cutscene automatically triggers. we guide the player..." | An automatic cutscene starts the moat sequence. D151 specifies how much of the plan it reveals. Exact shots and prompts remain open. |
| D150 | "Retry the stealth step while keeping the earlier puzzle progress." | If the assassin is spotted, retry the stealth step. Preserve the completed warrior and mage steps and access to the transferred key. |
| D151 | "Have the trio explain the whole plan before the player takes over." | In the automatic moat cutscene, the trio explains the complete sequence before returning control to the player. |
| D152 | "Use a dedicated utility button that stays available during exploration." | The mobile HUD provides a dedicated button for the selected hero's utility throughout exploration. Exact button placement, targeting, and availability feedback remain open. |
| D153 | "lets keep it the iso camera we had." | Use the prototype's original isometric follow camera and movement for gameplay. The moat scene uses its authored shots, and boss lock-on assists targeting. This supersedes D11 and D143. |
| D154 | "the game should look like an anime" | Use smooth sculpted silhouettes, shaped eyes and hair, deliberate cel shadows, ink contours, and painted scenery. Review how those details read at gameplay zoom and in close cinematic shots. |
| D155 | "that procedural underlying architecture needs to be rewritten" / "Let's make the world primarily procedural" | Replace route-first geography with procedural-first open-world generation. Preserve fixed story destinations as constraints; roads are features, not walkable boundaries. |
| D156 | "Let's use one canonical procedurally generated world shared by all Astral Chronicles playthroughs." | Publish consistent world geography and seed across player saves. Save-specific consequences do not reroll terrain. |
| D157 | "Let's build Astral Chronicles with multiple continents and islands." | Design one world atlas with several landmasses and archipelagos. Exact geography and extent remain open. |
| D158 | "Let's make Astral Chronicles' oceans fully explorable" | Oceans are navigable world space, not solely loading transitions. |
| D159 | "with player-controlled ships and optional fast travel" | Ship travel is directly controlled; fast travel supplements physical exploration rather than replacing it. |
| D160 | "Let's make ... ship handling responsive and action-RPG-style." | Fast, accessible steering and acceleration with believable weight; mandatory sailing simulation is not the selected direction. |
| D161 | "Let's keep ... ship camera isometric, with a wider view when sailing." | Retain the original isometric camera language, expanding visible area on ships; supersedes the suggested third-person chase camera. |
| D162 | "Let's allow ships to land anywhere physically accessible ... coastlines." | Landing is validated by terrain, depth and clearance, not restricted to designated docks or markers. |
| D163 | "Let's make ... ships persistent, with recovery services at ports and shipyards." | Ship identities and positions survive absence, saves and fast travel; port/shipyard recovery is available. Fees and implementation remain open. |
| D164 | "we can disrupt hearthmere structurally. as long as the assets and quests continue to work. they dont have to be in the same place" | Rebuild and relocate Hearthmere terrain, town structures, quest staging and cinematic shots as needed. Preserve asset/quest functionality and narrative continuity, not original coordinates. |
| D165 | "dont worry about migrating saves" | World V2 does **not** need to migrate saves from the older Hearthmere/prototype build. Preserve quest/asset functionality, not old player progress or coordinates. Start the replacement world with a clean, versioned save namespace; do not delete existing browser saves as an unintended side effect. |

D05 and D06 apply across story, characters, environments, combat, bosses, audio, and cinematics. Treat them as requirements when reviewing the existing story treatment. The current prototype's visuals, camera, and cutscene techniques do not determine the replacement game's quality ceiling or creative direction.

Beautiful cinematics and anime spectacle are desired outcomes, not already verified capabilities. Concrete criteria will follow from the reference and presentation decisions below.

## World Architecture V2 — confirmed direction (November 8, 2026)

D155–D165 govern the new geography, ocean traversal and Hearthmere re-staging. D165 explicitly removes *legacy save migration* as a prerequisite for the world rebuild; versioned saving for **new World V2 progress** remains required. The technical proposal and phase gates are in [WORLD_V2_ARCHITECTURE.md](WORLD_V2_ARCHITECTURE.md); the source/code and preservation audit is in [WORLD_V2_PHASE0_AUDIT.md](WORLD_V2_PHASE0_AUDIT.md). All unselected parameters (landmass counts, generator algorithms, cell sizes, ship economics and exact Hearthmere layout) remain proposals, not additional confirmed decisions. These choices supersede conflicting prototype route and fixed-geometry assumptions while keeping D01, D24, D28, D31, D46–D49 and D153 intact.

## Proposals awaiting confirmation

- Working story and subtitle: **The Starforged Crown**, including its supporting cast, antagonist, and detailed events. The user described its bones positively and requested more depth; that does not approve every proposed scene. D46–D49 require different missions, alliances, final routes, and endings, including some unavoidable permanent tradeoffs. Exact branch content and endings are not yet selected.
- Duration: 45–55 hours of main story, 70–90 hours for a first run with substantial optional content, and 100–120 hours for a thorough run.
- Content inventory: eight story movements, ten main dungeons, four optional dungeons, nine regional sagas, three optional personal stories, six settlements, and the suggested boss/hunt scope.
- World geography: the March of Aster and the five proposed areas. Continuous open-world direction is confirmed; the exact map and footprint are not.
- The treatment's specific traversal tools, liberation mechanics, quest structures, and local consequence systems.

Preserve these as useful drafts, and revise them when interview answers establish a stronger direction. Do not treat proposed content counts as fixed contractual requirements for a future implementing agent.

## Interview sequence

Use small rounds so answers can build on one another. These topics are an agenda, not settled design.

1. **Creative identity:** visual and cinematic references; gameplay camera; power fantasy and escalation.
2. **Emotional identity:** tone, relationships, humor, mature themes, player identity, and companion roles.
3. **Combat and spectacle:** controls, movement, ability language, transformations, party interactions, bosses, finishers, and readability.
4. **World and adventure:** exploration, settlement life, routes, dungeons, traversal, discoveries, progression, and optional activities.
5. **Cinematic direction:** scene frequency and duration, camera grammar, dialogue presentation, acting, choreography, music, sound, player control, skipping, and replay.
6. **Delivery and production:** target devices and input, visual fidelity, performance, asset creation, implementation stages, save continuity, and measurable acceptance criteria.

Raise dependencies early when needed. In particular, the gameplay camera affects world layout and combat; target devices affect the achievable presentation; power escalation affects how the story introduces danger. D24–D28 now confirm mobile priority, browser-link delivery, Apple and Android coverage, assisted touch camera/targeting, and the iPhone 14 Pro minimum 60 fps requirement. Exact browser/OS versions, Android reference devices, and the broader minimum hardware range remain open.

## Round 1 — answered

### Q1. References

Which two to four games, anime, or specific scenes best represent the desired look and feeling? Identify what should carry over: art style, fight choreography, ability effects, camera work, emotional moments, or another quality.

User answer: "Final Fantasy with the huge bosses fights, Solo Leveling epic fight scenes, Last of Us hits the emotional core...."

Confirmed as D08–D10. Each reference has a specific role: boss scale, epic fights, and emotional impact. D22 later establishes strong cel-shaded 3D. The user has not selected an exact Final Fantasy entry or a particular scene to reproduce. These references guide an original work; do not copy their characters, settings, or scenes.

### Q2. Gameplay camera

Should ordinary exploration and combat use an elevated/isometric camera, a close third-person camera behind the hero, or another arrangement? Cinematic scenes can use authored camera shots regardless of this decision.

User answer: "Close third-person, behind the hero".

Recorded as D11. The playtest feedback in D153 restores the original isometric view for ordinary play. Plan world spaces, travel, player movement, and encounter sightlines around that view.

### Q3. Power fantasy and progression

Should the party begin with spectacular anime power and escalate further, grow from grounded mercenaries into spectacular power, or be visually spectacular immediately while earning its largest feats and transformations later?

User answer: "Start grounded; gradually become overwhelmingly powerful".

Confirmed as D12. The early game must express skill, effort, and vulnerability; the late game must deliver a substantially greater power fantasy. Grounded does not mean visually careless or without magic. Strong cinematography and polished combat are needed from the opening. D18 later establishes a superhuman but contained power ceiling. Specific power sources, unlocks, transformations, and individual feats remain open.

## Implications of round 1

These are planning implications of the confirmed answers, not separately approved mechanics:

- Use the isometric view to keep routes, landmarks, and enemy movement readable. Authored shots can frame enormous enemies at human scale.
- Plan huge boss encounters around the player's view from behind the hero. Boss animation, arena geometry, framing, and readable attack anticipation must work together. An enemy scaled up inside an ordinary arena is not a sufficient design brief.
- Develop progression across capabilities, animation, effects, sound, and encounter situations. Later spectacle should demonstrate growth beyond the opening rather than repeat the same presentation with larger damage numbers.
- Proposed broad progression: early survival through skill and teamwork; middle-game breakthroughs and larger confrontations; late-game overwhelming feats with correspondingly formidable opposition. The exact milestones and feats require further answers.
- Revisit the grounded industrial/military story treatment so its discoveries and climaxes can support the requested anime escalation. The human conflict can remain emotionally legible as the action grows in scale.
- Establish recurring relationships through ordinary interactions, disagreements, shared efforts, and aftermath. Emotional impact must be developed before a threatened loss; copying The Last of Us's genre, plot, or particular tragedies is not implied.
- Do not infer a shadow army, summon system, specific transformation, or photorealistic rendering merely from the references. The references alone did not establish tone; D13 now separately establishes a harsh, tense world with rare warmth.

## Round 2 — answered

### Q4. Emotional tone

What should most of the journey feel like: a warm, adventurous bond tested by dark events; a harsh, tense world with rare moments of warmth; or a predominantly tragic story?

User answer: "A harsh, tense world with rare moments of warmth".

Confirmed as D13. Reframe the story's baseline as harsh and tense. Moments of relief can exist, but constant joking, frequent festivals, or an otherwise cheerful adventure would undermine this direction. This does not by itself establish gore, an age rating, a hopeless ending, or a mandatory body count.

### Q5. Party relationships

Should the emotional heart be the three heroes becoming a close found family, the player hero's bond with one particularly important character, or a wider ensemble with the town and companions sharing the focus?

User answer: "The three heroes becoming a close found family".

Confirmed as D14. Their changing relationships are the emotional throughline across the campaign. Existing personal arcs should interlock through shared experiences and consequences. D16 establishes one selected player hero with two AI companions; D50 later establishes strangers brought together by the opening crisis. Exact early dynamics and whether romance exists remain open.

### Q6. Lasting loss

Are earned permanent deaths acceptable for core companions, acceptable only for supporting characters while the core trio survives, or something to avoid among all major named characters?

User answer: "The core trio survives; major supporting characters can die".

Confirmed as D15. Do not write permanent deaths of Brynhildr, Celestia, or Akatsuki, including sacrifice endings, optional failure branches, or post-story reversals. Temporary separation, injury, rescue, and conflict remain possible narrative devices, subject to later details. D64 establishes player defeat return to town/camp, while D70 establishes temporary companion knockouts with automatic recovery during combat. Exact recovery timing remains open. Supporting-character deaths need development, consequences, and space for grief; the answer does not approve any specific victim.

## Implications of round 2

These are planning implications, not separately approved scenes or mechanics:

- Make the party's found-family progression part of the required story, so the emotional center does not depend on optional loyalty quests. Optional personal stories can deepen it.
- D50 later establishes strangers forced together by the crisis. Proposed progression from there: reluctant cooperation, trust earned through shared danger, a serious strain after a setback, and conscious recommitment. Exact turning points and how different endings express the bond still need authoring.
- Let the heroes care for each other through actions as well as dialogue: noticing exhaustion, sharing scarce resources, adapting to another's fear, admitting fault, and returning after a disagreement. These are examples for future scenes, not a mandatory checklist.
- Preserve occasional meals, small jokes, and quiet company, but stage them as fragile relief inside a dangerous world. Reassess social events that currently read as broadly festive.
- Stakes can include loss of home, civilian deaths, betrayal, capture, injury, and moral consequences. The trio's survival does not make every other outcome safe, and supporting losses should not become a repetitive escalation device.
- Review supporting characters individually before deciding deaths. Their relationships and contributions must be established before the story asks the player to grieve them. No specific supporting death was selected in this round.

## Round 3 — answered

### Q7. Party control

Would you rather directly control one chosen hero for the entire game with AI companions, freely switch among all three during gameplay and combat, or mainly control one hero with occasional authored sequences as the others?

User answer: "Choose one hero for the whole game; the other two use AI".

Confirmed as D16. All three class choices need complete, viable player experiences through the campaign. Companions keep their identities and contribute without requiring the player to take them over. D19 later establishes independent AI with occasional player-triggered team attacks or finishers. D44 confirms custom name/appearance while preserving authored personality/history, and D45 permits generated speech or expressive vocalizations. Team-move rules, companion customization, and exact vocal coverage remain open.

### Q8. Combat feel

Which should lead the combat design: fast, expressive action with combos, dodges, and counters; heavier, deliberate fighting with punishing mistakes; or ability-driven party tactics where coordination and timing matter more than manual combos?

User answer: "what we have right now, kinda works. we can build on that. fast expressive actions."

Confirmed as D17. The prototype is the combat reference to build upon, not a request to preserve every number, animation, or limitation. The user has not specifically approved new parry, air-combo, launch, stamina, or tactical-pause systems. Potential changes need to preserve responsiveness and the preferred action feel. Validate combat readability with the original isometric camera (D153).

### Q9. Late-game power ceiling

At the peak, should the heroes feel superhuman while defeating gigantic enemies, dominate whole battlefields with enormous attacks, or reach mythic feats that can reshape terrain and make ordinary armies irrelevant?

User answer: "Superhuman but contained: incredible speed and skill against gigantic enemies".

Confirmed as D18. Read D12's phrase "overwhelmingly powerful" through this refinement. The intended growth does not culminate in casual destruction of landscapes or automatic victory over ordinary armies. Anime intensity can come from speed, choreography, focused impacts, magical technique, effects, sound, and staging. D20 later confirms temporary awakened forms. Specific attacks, magic range, form designs, and environmental damage remain undecided. Keep cinematic feats consistent with the established power ceiling.

## Current combat foundation — inspected reference, not new requirements

Inspected November 4, 2026 to make the request to build on existing combat concrete. These implementation facts describe the prototype; their exact tuning and presentation are not newly confirmed requirements.

| Existing feature | Source | Relevance to the design |
| --- | --- | --- |
| Basic attack, dash, two equipped abilities, and ultimate action categories | `src/input/InputManager.ts`, `src/data/classes.ts` | The current action vocabulary is a starting point for refinement. Future ability-slot count is not fixed by this record. |
| Distinct spear melee, arcane ranged, and kunai ranged delivery | `src/data/classes.ts` | Preserve recognizable class identities while developing camera, targeting, movement, and presentation. |
| Attack sequences, dash invulnerability, cooldowns, energy, and combo feedback | `src/game/GameEngine.ts` | Review these as part of the existing action feel. Their timings, interactions, and balance need actual play validation after changes. |
| AI companion movement and class-specific attacks | `src/game/GameEngine.ts` | Evolve the AI companion foundation in accordance with D16 and D19: independent operation with occasional player-triggered coordination. Detailed rules remain open. |
| Enemy windup/recovery patterns and attacks evaluated against a committed target position | `src/game/CombatRules.ts`, `src/game/GameEngine.ts` | The isometric view should make attacks readable and avoidable. The current ground-marker style is not automatically prescribed. |

## Implications of round 3

These are planning implications, not separately approved mechanics:

- Preserve the player's connection to one chosen hero throughout exploration, story, and combat. Create dramatic participation for the other two through AI action and authored scenes.
- Develop encounter solutions and shared traversal tools for every class choice. Avoid a required obstacle that only the AI companion's unavailable player input can solve.
- The current combat is the reference for feel; the current code architecture is not a permanent constraint. Adapt camera-relative control, target selection, visibility, and enemy approach to the new view while preserving the preferred responsiveness.
- Use precision, movement, pressure, and distinctive class techniques to create growth. Do not equate progression with ever-larger blast radii or damage numbers alone.
- Audit existing ability names, descriptions, effects, and finisher staging against grounded beginnings and the contained endgame ceiling. Existing cosmic terminology does not authorize literal astronomical destruction.
- Keep physical threats and the need for allies credible late in the story. A spectacular giant-boss victory does not imply the party can protect every settlement alone.

## Round 4 — answered

### Q10. Companion coordination

Should companions act autonomously with occasional player-triggered team moves, operate entirely on their own, or require frequent player commands for skills and targets?

User answer: "They act independently, with occasional player-triggered team attacks or finishers".

Confirmed as D19. Routine fighting should not require repeatedly issuing orders to the other two heroes. Team attacks and finishers let the player deliberately involve the party at selected moments while remaining the chosen hero. Exact inputs, readiness conditions, resources, availability, companion positioning, and which combinations exist remain open.

### Q11. How power growth appears

Should power growth use evolving techniques plus temporary awakened forms, evolving techniques without transformations, or transformations reserved for exceptional story scenes?

User answer: "Evolving techniques plus temporary awakened forms with distinct visuals and moves".

Confirmed as D20. Plan both normal-kit evolution and temporary gameplay forms, with meaningful visual and move changes for the heroes. Their designs must retain recognizable class identity and respect D18's contained power ceiling. D55 later establishes the shared catastrophe plus earned mastery as the origin. Number of forms, visual motifs, unlock timing, activation, duration, costs, AI activation rules, and relationship to ultimates remain open. Do not write late-game awakening into the starting kit without a later decision.

### Q12. Boss control and cinematics

Should major bosses be mostly playable fights with short cinematic transitions and finishers, regularly shift into extended cinematic action, or keep nearly all action under direct player control?

User answer: "Mostly playable combat, with short cinematic phase transitions and spectacular finishers".

Confirmed as D21. The playable encounter supplies the bulk of the boss experience. Use short cinematics to mark a changed situation and give the finisher a distinctive payoff. The user has not requested repeated quick-time events, long mandatory mid-fight movies, or automatic spectacle replacing the fight. Finisher trigger rules, exact scene lengths, phase persistence, skipping, and replay remain open. The prototype's fixed 12.4-second finisher is an implementation reference, not an approved duration for every future boss.

## Implications of round 4

These are planning implications, not separately approved mechanics or scenes:

- AI companions need to handle ordinary movement, attacks, and encounter participation credibly without player micromanagement. Detailed behaviors should be designed against actual encounter needs.
- Coordinated moves can express the trio's growing trust through shared timing and choreography. Their emotional meaning should be developed alongside their gameplay use; a bond meter or specific unlock system is not yet selected.
- Give awakening a readable silhouette, animation language, effects, audio treatment, and changed moves while retaining the hero's identity. D22 and D23 later establish cel-shaded 3D and major redesigns preserving identities and class silhouettes; exact form designs remain open.
- Design awakening as part of the playable combat loop. A form must be more than a transformation movie followed by larger numbers on unchanged moves.
- Keep the grounded opening, evolving ordinary techniques, and eventual awakened capabilities consistent across all three selectable heroes. Awakening cannot invalidate every danger in the harsh world.
- Build each boss's phase around a changed playable problem. A cinematic transition communicates that change; it does not replace the phase's gameplay design.
- Preserve control orientation when returning from cinematic shots. Exact camera behavior and transition duration need prototyping later.
- Develop class-appropriate solo and team-finisher concepts for review. The answer allows team finishers but does not prescribe one after every kill, a shared meter, or a universal execution sequence.

## Round 5 — answered

### Q13. Visual rendering

Should the visual foundation be detailed stylized 3D with anime characters and atmospheric environments, strongly cel-shaded 3D with an animated-anime look, or mostly realistic 3D with anime influence concentrated in action and effects?

User answer: "Strongly cel-shaded 3D: bold shapes and shadows, like an animated anime".

Confirmed as D22. This is the selected visual foundation, rather than photorealistic rendering or simply realistic materials with flashy effects. Specific palettes, line treatment, shading bands, facial style, environmental treatment, and animation techniques remain open. The selection does not itself require thick outlines, low-detail models, or choppy animation.

### Q14. Character redesign

Should the heroes retain their recognizable current designs with much greater detail and animation quality, receive major visual redesigns while preserving their identities and class silhouettes, or get completely new appearances while retaining their names and roles?

User answer: "Major visual redesigns while preserving their identities and class silhouettes".

Confirmed as D23. Preserve character identity and class recognition while substantially reworking visual presentation. Preserve the spear-warrior, chronomancer, and kunai-assassin identities. D44 later establishes customizable name/appearance for the selected hero, with authored personality/history retained. Exact options, faces, proportions, outfits, palettes, weapons, and awakened designs require concepts and review later. No specific new appearance has been approved.

### Q15. Target devices

Should the experience be designed for desktop PC first with mobile later, desktop and mobile equally from the outset, or phones/tablets first with desktop adapting to them?

User answer: "Phones/tablets first; desktop adapts to that experience".

Confirmed as D24. Mobile is the primary design context, including the isometric camera and expressive combat; desktop is an adaptation. D25–D28 later establish browser-link delivery, Apple and Android coverage, assisted camera/targeting, and minimum 60 fps on iPhone 14 Pro. Orientation, other reference devices, detailed performance test conditions, and controller support remain open. Do not treat mobile priority as approval to reduce the cinematic ambition or automate combat.

## Implications of round 5

These are planning implications, not separately approved rendering settings, assets, or controls:

- Develop one coherent cel-shaded visual language for heroes, enemies, environments, awakening, effects, and cinematic lighting. Bold value shapes and silhouettes should remain legible on phone screens.
- Design expressive faces, hands, poses, and animation for close cinematic framing. A toon shader alone cannot establish the requested emotional performances or beautiful cutscenes.
- Prepare future character briefs with ordinary and awakened appearances, class silhouette, expressions, movement, and weapon handling. Preserve identity while allowing major redesign; do not constrain concept work to polishing the current meshes.
- Compose huge-boss encounters so the player can read attacks, navigate, and see the hero on the primary mobile display. Validate isometric framing alongside touch input.
- Treat effects, camera motion, visual density, UI, and touch reach as coordinated choices. Preserve the anime spectacle while keeping actionable information readable.
- Validate presentation during sustained play and the most demanding fights on physical target devices. D28 later names iPhone 14 Pro with a minimum 60 fps requirement. Android reference devices and wider hardware coverage remain to be selected.
- Mobile priority does not change the confirmed continuous world or mostly playable bosses. Streaming, asset budgets, and implementation approach require later planning against selected devices and delivery.

## Round 6 — answered

### Q16. How the game launches

Should the primary mobile experience launch from a browser link, be an installed mobile app, or offer both as first-class versions?

User answer: "Open a browser link and play".

Confirmed as D25. Opening a web link is the primary entry, including on phones and tablets. Do not require app-store installation to play. D84–D86 later establish guest start, optional cloud/cross-device sync, one evolving save per hero with recovery backups, and offline play after content download. Engine, hosting, installable-web-app support, and download size remain open.

### Q17. Touch control and aiming

Should touch play use assisted camera and target selection while combat stays manually controlled, or require manual camera and aiming as well as manual combat?

User answer: "Assisted camera and target selection; I handle movement, attacks, abilities, and dodges".

Confirmed as D26. Reduce the touch burden of aiming while the player controls combat. D153 restores the original isometric follow camera. Target-switching input, lock-on rules, assistance strength, orientation, and controller support remain open for production. Preserve manual control during ordinary play and awakened forms.

### Q18. Device baseline

Which phones or tablets should run the game well? Specific models the user owns or wants to support are useful; otherwise establish whether the baseline is older/midrange hardware or recent high-end devices, and which mobile operating systems matter.

User answer: "Both Android and Apple. its web so... yea. and im running on an iphone 14 pro. so ide like that to have at minimum 60fps."

Confirmed as D27 and D28. Support both mobile ecosystems through web delivery and use the user's iPhone 14 Pro as a concrete performance reference. The 60 fps requirement must influence world, rendering, effects, AI, and cinematic planning. It is not a blanket promise of 60 fps on every Apple or Android device. Android reference hardware, supported browser/OS versions, resolution/quality settings, and performance on older devices remain open. Do not label iPhone 14 Pro the minimum supported model without a separate decision.

## Implications of round 6

These are planning implications and proposed validation practices, not achieved compatibility results or finalized technical settings:

- Keep the entry experience compatible with opening a link and beginning play on a phone. D84–D86 later select guest start, optional cloud/cross-device sync, an evolving save with recovery backups, and downloaded-content offline play. Loading, interruption recovery, downloads, and synchronization need deliberate design.
- Validate Apple and Android browsers separately on physical devices. Desktop browser emulation does not establish touch behavior or sustained phone performance.
- Plan for minimum 60 fps on the iPhone 14 Pro reference device across normal exploration, AI party combat, demanding boss phases, awakening effects, and in-engine cinematics. Do not report a menu, an empty scene, or an average hiding repeated severe stalls as proof of the requirement.
- A 60 fps cadence corresponds to approximately 16.7 milliseconds per frame. Establish scene, effects, animation, AI, and streaming budgets together rather than reserving performance work for the end. Exact quality settings and profiling methodology remain to be specified and measured.
- Proposed performance validation includes sustained sessions, busy encounters, world traversal, transitions, and interruption/resume, with frame pacing and stalls reported alongside average frame rate. Record device, browser/OS, settings, and test conditions. No benchmark has been run in this design phase.
- Preserve the cel-shaded cinematic ambition through composition, strong forms, animation, and intentionally budgeted effects. Exact rendering choices and any visual/performance tradeoffs require later review; do not silently substitute a lower frame-rate goal.
- Design target selection, camera assistance, and touch placement together so the player can move, evade, attack, activate forms, and trigger team moves without unnecessary precision gestures. Specific controls are still proposals to develop.

## Round 7 — answered

### Q19. Typical session

Should the adventure support satisfying 10–20-minute sessions, primarily 30–60-minute sessions, or long console-style sessions of one hour or more? This selects the pacing emphasis, not the total campaign length.

User answer: "Primarily 30–60-minute sessions".

Confirmed as D29. Plan satisfying portions of play with a clear accomplishment, discovery, or story development within ordinary sessions. This is a pacing preference, not a mandatory session limit or a timer that ends play. Longer dungeons and story arcs can span sessions, supported by D30.

### Q20. Save and resume

Should players be able to stop almost anywhere and resume that exact situation, resume at frequent checkpoints, or save progress primarily at safe locations?

User answer: "Stop almost anywhere and resume the same situation".

Confirmed as D30. Preserve where the player was and the relevant state of the adventure rather than generally sending them back to a checkpoint or safe location. Detailed active-battle, boss-phase, cinematic, and interruption behavior still needs specification. D84–D86 later establish optional cloud/cross-device sync, guest start, one evolving save with recovery backups rather than manual rewind slots, and offline play after content download. Defeat follows its separate town/camp rule.

### Q21. Exploration freedom

After the opening, should most of the world be physically accessible with story milestones and danger guiding progress, should regions open gradually through story/traversal progress, or should players be able to reach everything including the final fortress immediately?

User answer: "ide say like skyrim. fully explorable."

Confirmed as D31. Give the player freedom to explore the connected world rather than directing them through a sequence of unlocked region maps. The reference establishes the desired freedom; it does not import Skyrim's specific quest, combat, scaling, faction, or crime systems. Reaching an area, entering a particular locked interior, and triggering a final story confrontation are different decisions. The answer does not yet establish immediate access to the final boss or completion of the campaign in arbitrary order. The opening's exact length and any initial constraints remain to be reviewed.

## Implications of round 7

These are planning implications and proposed acceptance criteria, not finalized save architecture, quest rules, or map dimensions:

- Plan short-term accomplishments within a 30–60-minute session while retaining the larger story's momentum. Avoid assuming every session must contain a boss or a cinematic reveal.
- The proposed 75–120-minute dungeon visits and longer finale are not required uninterrupted sittings. Design internal progress and return-state handling so players can continue them across sessions. Pausing is not conditional on reaching a designated safe room.
- Treat save/resume as preservation of a persistent world: player location and state, companions, story facts, local consequences, encounter progress, and relevant interactable state need an explicit persistence plan. Exact transient combat and cinematic handling remain open.
- Develop interruption and recovery behavior around actual phone use. Validate normal quits and abrupt interruptions separately; no exact-state recovery guarantee has yet been demonstrated.
- Author locations so exploration and discoveries made before their intended story introduction remain meaningful. Track the facts the player has actually learned and the outcomes already achieved.
- Review the treatment's military advances, machinery access, and fortress approaches as changing local situations rather than reasons to lock whole geographic regions behind act completion. The final confrontation's prerequisites require their own decision.
- Distinguish freedom from power: exploration access does not automatically mean all encounters are safe for an early hero. D34 later establishes distinct danger tiers with bounded ordinary-enemy scaling; exact danger signaling and retreat behavior remain open.
- The existing five-area basin is a proposed map, not a confirmed Skyrim-sized landmass. Size should follow meaningful exploration, cinematic geography, and mobile performance requirements.

## Round 8 — answered

### Q22. Reasons to explore

What discoveries should make detours most rewarding: unusual dungeons and bosses, rare equipment, hidden stories and people, traversal secrets, impressive places, or something else? Identify the strongest priorities or describe the desired mix.

User answer: "rare resources+gear, unusual dungeons+bosses, lore snippets, impressive places, secrets and easter eggs."

Confirmed as D32. These are the desired exploration rewards; vary what players find rather than making every detour another identical chest or combat pack. D35 later selects a deep crafting economy with many recipes and professions. Survival meters, repeat-farming requirements, and resource quotas have not been selected. Secrets and Easter eggs do not automatically imply a fourth-wall-breaking tone. Specific discoveries, quantities, rewards, and repeatability remain open.

### Q23. Navigation guidance

Should navigation use clear objective markers and routes, rely mostly on landmarks and clues with minimal markers, or let players freely adjust guidance between those styles?

User answer: "Let players adjust between clear markers/routes and minimal guidance".

Confirmed as D33. Support explicit objective guidance and a more exploratory navigation style through player settings. Exact toggles, defaults, route rendering, map/compass behavior, and how assistance affects undiscovered secrets remain open. Keep required clues understandable in low-guidance play rather than simply hiding essential information. Do not assume that selecting clear guidance reveals every secret on the map.

### Q24. Enemy strength across the world

Should areas have fixed danger levels that the hero can eventually outgrow, should most enemies scale with the hero, or should ordinary enemies scale within limits while dangerous areas and major threats retain distinct difficulty tiers?

User answer: "Distinct danger tiers, with ordinary enemies scaling within limits".

Confirmed as D34. World locations and threats retain meaningful differences in danger. Ordinary enemies can scale within bounds rather than tracking the player without limit. The answer does not establish numerical level ranges, encounter density, respawn rules, loot scaling, or boss scaling. It does not override fully explorable geography or select a difficulty mode.

## Implications of round 8

These are planning implications and examples, not approved loot systems, discoveries, settings, or numerical balance:

- Give exploration multiple kinds of reward: useful rare materials, exciting equipment, an unusual encounter, a short piece of lore, a striking place, or a concealed discovery. Not every location needs every reward type.
- D35 later establishes a deep crafting economy as a central use for rare resources. Rarity should not become an excuse to add compulsory repetitive harvesting to the main story.
- Connect rewards to geography and local history where appropriate. A resource vein, hidden workshop, or distinctive boss can explain why a place is worth noticing. Exact crafting and loot rules remain open.
- Preserve the harsh, tense tone when planning Easter eggs. Their content and degree of humor require review; references can be subtle rather than disruptive.
- Design landmarks, routes, dialogue directions, and journals so minimal-guidance navigation is functional. Explicit navigation settings should provide genuine assistance without being required for basic map comprehension.
- Keep enemy strength consistent with recognizable threat tiers. Develop limits and messaging later so players can judge danger and feel growth when revisiting areas. A bounded scaling model should not erase the distinction between an early pack and a major late-game threat.

## Round 9 — answered

### Q25. Uses for resources

Should gathering mainly support a focused equipment-upgrade/crafting system and useful consumables, a deep crafting economy with recipes and professions, or occasional special upgrades with most equipment acquired directly?

User answer: "A deep crafting economy with many recipes and professions".

Confirmed as D35. Crafting is a substantive part of the game, not only an occasional upgrade button. D38–D40 later establish nine named professions, NPC commissions/contracts/trade, and quick interactions. Exact recipes, progression, processing, facilities, and market rules remain open. No multiplayer market, real-time crafting timers, survival requirements, resource respawn rules, or mandatory mastery of every profession has been selected.

### Q26. Equipment and playstyle

Should equipment create major ability/build changes, mainly improve stats with occasional distinctive effects, or play a smaller role while class techniques and awakening drive progression?

User answer: "Mostly stronger stats, with occasional distinctive special effects".

Confirmed as D36. Equipment mainly improves numerical strength, with occasional special items offering distinctive effects. Techniques and awakened forms remain the separately confirmed sources of evolving moves. Revise earlier proposals that assumed gear routinely rewrites ability behavior or defines radically different builds. Acquisition, randomness, rarity, equipment slots, appearance, and exact effects remain open.

### Q27. Travel options

Should travel offer mounts and fast travel to discovered places, movement on foot plus discovered-place fast travel, or physical travel on foot/mounts without instant fast travel?

User answer: "mounts, and fast travel between towns."

Confirmed as D37. Mounts serve physical exploration, while towns are the fast-travel endpoints. Do not broaden the network to every dungeon, camp, or discovered point of interest without another decision. Town discovery requirements, costs, availability during danger, presentation, companion travel, mount types, acquisition, handling, and mounted combat remain open. Optional town fast travel does not replace the connected world or reinstate required portal progression.

## Implications of round 9

These are planning implications, not a confirmed recipe catalog, economy simulation, gear table, or mount specification:

- Develop a crafting loop connecting exploration, gathering, processing, profession growth, recipes, crafted goods, and useful economic outlets. Ask which professions and outlets matter before fixing the loop's details.
- Integrate professions with people and places: workshops, trainers, material sources, and recipes can give settlements and discoveries enduring value. Their exact availability and progression are proposals to develop.
- Keep stats and occasional special effects as equipment's primary language. Deep crafting should provide meaningful material, recipe, and quality decisions without turning every item into a new ability system.
- Preserve the value of found rare gear alongside crafted gear. How the two compare and whether either can be upgraded into late-game relevance remains open.
- Review the treatment's proposed rewards and replace assumptions of routine gear-driven build changes. Distinctive effects are possible, but are occasional rather than universal.
- Physical routes should accommodate mounts and the isometric mobile controls. Companion travel, dismounting near interiors, and navigation through dense settlements require later decisions.
- Town fast travel can support the 30–60-minute session target while preserving the need to explore between settlements. Unlock rules and costs are not established by this implication.
- The campaign time inventory predates the detailed crafting and mount requirements. Integrate them into content and pacing estimates without automatically adding profession grinding to the advertised adventure length or counting the same exploration twice.

## Round 10 — answered

### Q28. Profession list

Which professions should exist? Possible examples include smithing, armorworking, alchemy, cooking, enchanting, tailoring, mining, herbalism, fishing, or other disciplines. Identify must-haves and any that do not fit.

User answer: "armor crafting, weapon crafting, accessory crafting, cooking, fishing, mining, smithing, foraging(picking plants), potion crafting."

Confirmed as D38. Preserve all nine names. The user explicitly defined foraging as picking plants. D41 later establishes smithing as refining ore into ingots and making metal components for other crafters. Keep it separate from finished weapon/armor crafting. Examples from the question that the user did not select, such as enchanting or tailoring as separate professions, are not confirmed requirements.

### Q29. Economic role

Should crafting mainly supply the party and NPC shops, also support a substantial NPC commission/trade system, or mainly support a self-sufficient party with little trading?

User answer: "Supply the party and support a substantial system of NPC commissions, contracts, and trade".

Confirmed as D39. Develop party supply, commissions, contracts, and trade as meaningful economic activities. No player-to-player market was selected. Contract variety, availability, rewards, reputation, deadlines, price behavior, merchant stock, and settlement-specific demand remain open.

### Q30. Crafting interaction

Should gathering/crafting mainly use quick interactions with depth in recipes and progression, include hands-on minigames, or use a mix with minigames only for selected professions or special crafts?

User answer: "Quick interactions; depth comes from materials, recipes, and profession progression".

Confirmed as D40. Prioritize quick gathering/crafting interactions and meaningful decisions about materials, known recipes, and skill growth. Mandatory hands-on minigames are not the selected baseline. Exact interaction times, batching, quality, success/failure, profession unlocks, and repetition rules remain open. Fishing belongs within this quick-interaction direction unless separately refined.

## Implications of round 10

These are planning implications, not approved profession boundaries, recipe lists, market simulation, or progression numbers:

- Maintain a focused [crafting and economy design](CRAFTING_DESIGN.md) alongside this decision record so the eventual implementation handoff can find the subsystem's requirements without reconstructing the interview.
- Give every named profession a clear identity, inputs, outputs, progression, and economic purpose. D41 later clarifies smithing's refining/component role; exact metal-processing recipes remain open.
- Plan NPC commissions and contracts around actual crafted goods and useful rewards. Keep routine economic orders distinct from the authored story adventures in the campaign treatment.
- Quick execution should allow depth in preparation, material choice, recipe discovery, progression, and trade decisions. Do not equate a deep economy with long progress bars or repeated precision minigames.
- The profession catalog does not establish hunger/thirst, equipment durability, real-time expiration, multiplayer trading, or a requirement to level every skill. Decide those features explicitly if needed.
- Crafting and gathering interactions should fit touch play and 30–60-minute sessions. Batch handling, interface structure, and save/resume treatment still need design.

## Round 11 — answered

### Q31. Smithing's role

Should smithing refine ore and make metal components, repair/upgrade existing gear, or act as an umbrella with weapon/armor crafting as branches? The user can combine roles or describe another distinction.

User answer: "Refine ore into ingots and make metal components used by other crafters".

Confirmed as D41. Smithing handles refining and metal components. Weapon crafting and armor crafting create their respective finished equipment. Repair, durability, and upgrading are not automatically assigned to smithing by this answer. Exact materials, recipes, facilities, and which other crafts consume particular components remain open.

### Q32. Who learns professions

Can the selected hero learn every profession with independent progression, should players specialize in a limited set, or should crafting disciplines be distributed across the trio?

User answer: "The chosen hero can learn every profession, each with its own progression".

Confirmed as D42. One selected hero can learn and progress all nine professions. Do not force specialization into only a few professions or require switching to a companion to access a craft. Experience sources, skill levels, trainers, mastery rewards, and progression rates remain open. Learning every profession is available, not required for completing the story.

### Q33. Recipe acquisition

Should recipes come from a mix of trainers, shops, exploration, and quest rewards; mainly from trainers/shops; or mainly from discovering them in the world?

User answer: "A mix of trainers, shops, exploration, and quest rewards".

Confirmed as D43. Include all four recipe channels. Exact recipe allocation, costs, prerequisites, uniqueness, acquisition rates, and whether recipes can have alternative sources remain open. Do not confine all valuable recipes to one channel without a later decision.

## Implications of round 11

These are planning implications, not approved item lists, numerical progression, or recipe placement:

- A metal-goods loop can connect mining to smithing and then to finished weapon/armor crafting. Other crafts can use smithing components where their recipes call for them. The exact dependency graph must be designed without requiring every craft to use every other profession.
- Track profession knowledge and progression independently on the chosen hero. Companion AI control and party membership do not determine access to a profession.
- Develop recipes with source and prerequisite information so trainers, shops, exploration, and quest rewards all have a purposeful role. Avoid repeating the same unlock with different labels merely to populate all channels.
- Preserve independent profession growth through save/resume and any eventual hero migration plan. The existing game has not implemented the new profession system.
- The main crafting structure is now established. Return to narrative and cinematic decisions before specifying every numerical recipe or economic parameter.

## Round 12 — answered; voice coverage and branching details require refinement

### Q34. Selected hero's identity

Should the player choose an established named hero with an authored personality/history, personalize that hero's name/appearance while keeping the authored identity, or create a more player-defined protagonist identity within the selected class?

User answer: "Customize the selected hero's name and appearance, keeping their authored personality and history".

Confirmed as D44. Preserve the chosen hero's authored identity beneath personalization. The spear-warrior, chronomancer, and kunai-assassin story roles remain distinct, and the party remains three people. Exact appearance options, naming restrictions, voice selection, spoken references to a custom name, and whether companion appearances can be customized remain open. Do not infer a fully custom origin or morality/personality system.

### Q35. Voice coverage

Should main-story dialogue and cinematics be fully voiced with optional dialogue mainly text, should essentially all conversations including optional NPC interactions be voiced, or should voice be reserved for selected major scenes?

User answer: "voice can be procedurally generated. they can sound like sims for all i care, as long as its not straight silence."

Confirmed as D45. Generated voices and expressive nonliteral vocalizations are acceptable ways to give dialogue vocal presence. The answer does not choose between full generated speech, vocalizations, or a mixture, and does not settle coverage for routine NPC conversations. Keep dialogue meaning understandable through text where the sound is nonliteral. Language, character vocal identities, production method, timing, subtitles, and delivery format remain details to establish. Procedurally generated sound does not imply procedurally improvised story dialogue or runtime speech generation.

### Q36. Narrative choice scope

Should the main story have an authored ending with meaningful local choices, branch into substantially different main-story routes and endings, or be largely linear with dialogue choices mainly affecting expression?

User answer: "choice should matter... it should drive the narrative."

Confirmed as D46. Choices must change what happens in the story. The earlier treatment's assumption that variation stays local around a fixed route is no longer sufficient as the governing design. D47–D49 later establish different missions/alliances/final routes/endings, unavoidable permanent tradeoffs, and explicit warnings only for the largest irreversible commitments. Exact branches, shared events, and exclusive content still need authoring. The trio's survival requirement remains in force across all branches.

### Implications of Q34

These are planning implications, not approved customization options or a dialogue-production method:

- Develop the hero redesigns with room for player appearance customization while preserving readable class silhouettes and the authored character's identity.
- Keep the selected hero's appearance consistent between gameplay, awakened forms, and cinematic shots. Exact customization scope and implementation require later design.
- Retain distinct histories and emotional arcs for all three class selections. Custom naming does not erase the chosen character's role in the trio's found-family story.
- Design dialogue references to the selected hero's customized identity alongside D45's generated audio/vocalization direction. No particular spoken-name solution or exact vocal style has been chosen.

## Implications of the voice and choice answers

These are planning implications, not approved voice assets, branches, or endings:

- Maintain a focused [narrative and cinematic brief](NARRATIVE_PRESENTATION.md) for the implementation handoff, covering performance, vocal presence, player identity, and the evolving choice structure.
- Generated dialogue audio can use intelligible speech or expressive nonliteral sounds. Preserve character identity, emotion, timing, and readable story meaning without assuming traditional full voice acting is required.
- Record a decision's cause and resulting story facts. Subsequent scenes, available missions, character actions, or conflicts must respond to those facts rather than merely mentioning a choice after unchanged events.
- Review compulsory refusal, rescue, alliance, and finale assumptions in the story drafts. They currently describe one proposed route, not an approved outcome regardless of player decisions.
- D47 later confirms different final routes and endings. Author concrete alternatives and consequences within that scope, rather than returning to an identical finale with different references afterward.
- Keep the core trio alive across branches and preserve their authored personalities. Disagreement and consequences can matter without using a companion's permanent death as punishment.
- Branching changes the content inventory and production estimate. Distinguish content a single run experiences from the full set of possible scenes; do not add mutually exclusive branches together as one playthrough's duration.

## Round 13 — answered

The user expressed flexibility about the vocal technique. A specific speech/vocalization mix is an outstanding production detail, not a reason to repeat the voice question before continuing the narrative interview. Develop a suitable proposal within D45 when the audiovisual plan is written.

### Q37. Branching and endings

Should major choices lead to different missions, alliances, final routes, and endings; should the main finale stay shared while earlier paths and character/settlement fates vary; or should the route stay mostly shared with consequential changes to the events and outcomes within it?

User answer: "Different missions, alliances, final routes, and endings".

Confirmed as D47. Branches need meaningfully different playable missions, alliances, finale routes, and conclusions. Shared locations and scenes can still exist, but their reuse cannot erase the required differences. Exact route count, faction structure, branch points, exclusive content, and how a run reaches an ending remain open. Do not infer that one final dialogue menu alone chooses the entire outcome.

### Q38. Cost of choices

Should major choices sometimes impose unavoidable tradeoffs with permanent supporting-character/settlement losses, should excellent preparation make an outcome that saves everyone possible, or should consequences mostly change alliances and available paths rather than create severe losses?

User answer: "Sometimes there is no perfect answer: saving one person or place can mean losing another permanently".

Confirmed as D48. Some tradeoffs are genuinely unavoidable and persist in that run. They can cost supporting lives or places; no specific victim or destroyed settlement has been selected. Do not add a hidden perfect route that always rescues both sides through grinding, a stat threshold, or completion of every optional task. Not every choice must be tragic. The core trio remains outside permanent-death outcomes.

### Q39. Communicating consequences

Should major choices clearly communicate the main risks without spoiling exact results, rely on dialogue/context without explicit warnings, or use a mix with warnings for only the largest irreversible commitments?

User answer: "Use explicit warnings only for the largest irreversible commitments".

Confirmed as D49. Reserve explicit warnings for the largest commitments. Other choices should be informed by dialogue and the situation, without a warning panel for each consequence. This is not permission to hide essential facts or use misleading options. Exact thresholds, wording, consequence timing, autosave behavior, and the ability to reload an earlier decision remain open.

## Implications of round 13

These are planning implications and proposed authoring practices, not approved routes, factions, or endings:

- Replace the treatment's single-route assumption with a branch design showing major decisions, divergent playable missions, changing alliances, distinct final approaches, and actual endings.
- For each choice, record information the player has, intent expressed by each option, affected story facts, immediate and later consequences, and any mutually exclusive content. Cinematics and dialogue need to reflect the resulting state.
- Present unavoidable tradeoffs through credible situations, limited capacity, and conflicting commitments. Good preparation can improve outcomes where designed, but cannot eliminate every hard choice.
- Preserve permanent losses through continued exploration, economy, character interactions, and later story scenes where relevant. The depth of any settlement simulation is still a production decision.
- Distinguish explicit irreversible-commitment warnings from ordinary contextual foreshadowing. Define a small, consistent set of warning conditions during narrative design.
- Validate every intended branch and ending, with all three hero selections, against the trio-survival requirement and the found-family emotional center.
- Re-estimate per-route playtime and total production scope. Each intended full route should meet the eventual agreed duration target; mutually exclusive scenes do not add hours to a single run.

## Round 14 — answered

### Q40. Starting relationship

Should the trio begin as strangers forced together, coworkers who know one another but have not built deep trust, or old friends with a damaged bond to rebuild?

User answer: "Strangers forced together by the opening crisis".

Confirmed as D50. Remove the earlier assumption that the three start as an experienced company with shared jokes and history. The crisis initiates their cooperation. Each still has the authored personal history established by the selected class/story role. Their reasons for being present, first impressions, initial disagreements, and moments of earned trust remain to be written.

### Q41. Alliance boundaries

Can a full route side with Caedran, can the party negotiate or temporarily cooperate while ultimately opposing his binding system, or should branching alliances remain among groups resisting him?

User answer: "Caedran stays the enemy; branching alliances are among the groups resisting him".

Confirmed as D51. Build different resistance alliances and approaches while keeping Caedran the enemy in every route. Do not add a full Caedran-aligned campaign. An antagonist can still talk, threaten, or offer terms; an existing proposed truce scene is not itself permission to join his cause. D53 later delegates and establishes the resistance's core disagreements, and D54 puts the largest commitments late. Specific missions and endings remain open.

### Q42. Ending tone

Should endings span hopeful, bittersweet, and genuinely dark outcomes; all retain clear hope despite different costs; or mainly leave the trio surviving in a deeply damaged world?

User answer: "A range from hopeful to bittersweet to genuinely dark, depending on the choices".

Confirmed as D52. Develop genuinely different tonal outcomes across the endings rather than requiring a uniformly hopeful result. The trio survives even dark outcomes. Supporting deaths, lasting harm to places, and political consequences are possible, but no specific ending, victim, or destroyed settlement has been selected. Exact final relationship states and ending conditions remain to be authored.

## Implications of round 14

These are planning implications, not approved faction names, opening staging, power origins, or endings:

- Rewrite the opening so the player meets the other two heroes as strangers during the crisis. Do not require prior personal history between the trio or perform an established-team introduction.
- Give each hero an individual reason to be present and a capability that matters to their first cooperation. Those reasons must work with every selected protagonist and remain understandable through play.
- Earn the eventual coordinated attacks and found-family intimacy through shared actions and developing trust. Do not assume they already fight as a perfectly rehearsed unit at the opening.
- Give resistance groups credible, conflicting goals or methods. Choosing among them should change missions, allies, final approaches, and endings, not only uniforms or a reputation label.
- Preserve Caedran as the antagonist while varying the resistance's response and the consequences of its success or failure. Keeping one enemy does not imply a single final route.
- Dark outcomes can follow costly victories, fractured communities, or other consequential failures without killing a core hero. Their exact meaning needs authoring; do not automatically equate an ending with a simple morality score.

## Round 15 — answered, including a new utility requirement

### Q43. Resistance disagreements

What should groups resisting Caedran disagree about most? Examples include civilian protection versus rapid victory, preserving useful star-metal technology versus destroying the binding infrastructure, and centralized military authority versus settlement independence. The user can choose a mix or propose other conflicts.

User answer: "u decide."

Confirmed as D53: the user delegates this creative decision. Adopt a resistance split between protecting communities and independent civilian life, winning quickly through coordinated military action, and permanently dismantling the infrastructure that enables coercion. Working factions are the Hearth Compact, the Free Standard, and the Severance Circle. Their reasoning, costs, and design boundaries are recorded in [the resistance design](RESISTANCE_DESIGN.md). This delegated decision does not authorize implementing factions or silently deciding every mission and ending.

### Q44. Route commitment timing

Should alliances remain changeable until late major commitments, should the main route settle around the middle for a substantially different second half, or should an early allegiance shape most of the campaign?

User answer: "Alliances can shift through much of the game; the largest route commitments come late".

Confirmed as D54. Do not choose a permanently exclusive main route at the opening or midpoint by default. Let the player develop relationships and change alliances through much of the game, then make consequential late commitments. Earlier losses and decisions remain part of the world rather than resetting when allegiance changes. The exact commitment points, requirements, and warning wording remain open.

### Q45. Awakening origin

Should temporary awakened powers originate in the shared opening catastrophe, in a different personal history for each hero, or in difficult techniques developed through training and experience?

User answer: "1 + 3. they should also all get 1 special utility ability that can be used for puzzles. like the mage can move items from one place to another instantly, the assassin can go stealth, and the warrior can use the spear to vault over large chasms and stuff."

Confirmed as D55 and D56. Awakening combines the shared opening incident with earned mastery through training, discoveries, and experience. Each hero also receives one signature utility for puzzles: moving items instantly for the mage, stealth for the assassin, and spear-vaulting over gaps for the warrior. D57 later establishes automatic AI companion use; D58–D59 establish broad exploration use, tighter important-story rules, and a mix of puzzle scales. Range, targets, duration, unlock timing, and combat/awakening interaction remain open. Do not make the utility available only during awakening without a further decision.

## Implications of round 15

The resistance priorities below are adopted under explicit delegation. Other implementation and content implications remain proposals:

- Develop the Hearth Compact around civilian survival and local self-government; the Free Standard around a coordinated campaign to defeat Caedran; and the Severance Circle around ending coercive infrastructure permanently. All oppose Caedran, all can help people, and all can impose serious costs.
- Keep faction identity separate from a simple good/neutral/evil ending assignment. Choices within and between alliances must determine consequences.
- Put the largest route locks late while allowing different missions and consequences earlier. Changing allies must not resurrect people, restore destroyed places, or erase promises already broken.
- Seed awakening potential in the opening catastrophe, but make techniques and temporary forms a progression of learned control. The exact first awakening scene and mastery milestones still need writing.
- Integrate the three class utilities into world and dungeon design. Reassess the earlier shared traversal-line/lens proposals instead of treating them as mandatory tools alongside the newly requested abilities.
- D57 later selects automatic companion utilities. Resolve intent recognition and traversal continuity without contradicting the one-playable-hero rule or assuming a different class must be directly controlled.
- Preserve full-world exploration: utility puzzles and local obstacles should not silently recreate act-locked geographic regions. Exact traversal constraints still need review.

## Round 16 — answered

### Q46. Companion utilities

Should contextual requests trigger AI companions' utilities, should companions apply their utilities automatically when useful, or should each selected hero solve obstacles primarily through class-specific alternatives?

User answer: "Companions recognize opportunities and use their utilities automatically".

Confirmed as D57. Do not require routine companion utility commands or direct character switching. D60–D61 later clarify role-based coordination once the objective is clear, with the player doing their selected hero's part and AI executing the other parts. Cooperative actions can open a shared route. Exact objective-recognition and action timing still need design.

### Q47. Utility freedom

Should utilities work broadly on compatible world objects/terrain, mainly at authored puzzle interaction points, or combine broad use with more constrained story-critical interactions?

User answer: "Broadly during exploration, with tighter rules for important story puzzles".

Confirmed as D58. Allow useful exploration interactions beyond a handful of marked puzzle points, while important story puzzles can define tighter compatible targets and rules. Exact ranges, target criteria, stealth detection, costs, cooldowns, and vault surfaces remain open. Broad use is not unlimited range, invisibility to every enemy, or unrestricted movement across the entire map.

### Q48. Puzzle emphasis

Should puzzles be substantial multi-room dungeon challenges, mostly short environmental obstacles between fights, or a mix of major dungeon puzzles and smaller exploration discoveries?

User answer: "A mix of substantial dungeon puzzles and smaller exploration discoveries".

Confirmed as D59. Give dungeons meaningful puzzle development and reward smaller discoveries in the open world. Exact frequency, complexity, hints, failure behavior, and combat integration remain open. Do not make every dungeon follow an identical sequence of one puzzle per class.

## Implications of round 16

These are planning implications, not approved puzzle solutions, targeting rules, or follow behavior:

- Maintain a focused [exploration and puzzle brief](EXPLORATION_PUZZLES.md) collecting utilities, automatic companion access, world freedom, and unresolved interaction details.
- Separate recognizing that a companion can help from deciding the puzzle's answer. Clarify how player observation, positioning, and interaction guide automatic companion actions before writing detailed puzzle sequences.
- Design every required puzzle for all three hero selections, with two AI companions supplying the other utilities. A missing manual companion command must not make a valid solution inaccessible.
- Maintain consistent feedback for compatible targets and any special story-puzzle constraints. Tighter rules need an understandable in-world basis rather than an unexplained failure of a familiar ability.
- Develop utility combinations through space, timing, and player decisions without assuming an unrestricted physics sandbox or adding extra signature utilities.
- Make party continuity explicit when one hero can cross a gap or pass a guarded route alone. Do not silently strand the player or the two companions.

## Round 17 — answered through the user's cooperative puzzle example

### Q49. Automatic action boundary

Should companions perform the relevant action after the player investigates/positions/interacts to establish intent, or act as soon as they identify a useful opportunity, even before the player investigates it?

User answer: the three encounter a moat. The warrior vaults across and breaks a container with a key; the mage teleports the key back; the assassin takes the key and uses stealth to get past a guard and lower the bridge. The player performs the warrior, mage, or assassin portion according to their selected hero. "so after the objective is clear, everyone springs into action."

Confirmed as D60 and D61. This is role-based cooperative puzzle execution, not AI replacing the player or repeated requests for each companion move. The objective and dependencies organize the sequence. The AI must wait for any prerequisite controlled by the player and then continue its own role. The example is documented in [the exploration and puzzle brief](EXPLORATION_PUZZLES.md), including a three-hero playability table. Exact input, guard placement, and objective-recognition rules remain to be authored.

### Q50. Keeping the party together

When a utility lets one hero reach a place the others cannot directly reach, should that hero open a route for everyone, should the party regroup automatically once the route is safe, or should brief teamwork animations show the group helping each other across?

User answer: "see previous response."

Confirmed as part of D61. The example creates a shared path through teamwork rather than teleporting the whole party past the obstacle. In the moat sequence, the bridge lets the heroes who remained on the starting side cross. Do not assume every obstacle must contain a literal bridge; develop coherent shared-route results for other sequences.

### Q51. Puzzle hints

Should hints be available only when requested, should companions gradually offer them after the player appears stuck, or should puzzles rely on environmental clues without a separate hint system?

User answer: "Companions gradually offer hints if I seem stuck".

Confirmed as D62. Companions progressively help when the player appears stuck. Exact delay, escalation, repeat suppression, settings, and the threshold for revealing a solution remain open. Navigation-guidance settings and puzzle hints are related but not automatically identical.

## Implications of round 17

These are authoring and implementation implications, not approved numerical triggers or every puzzle's structure:

- Define objective clarity separately from puzzle completion. Once the plan is understood, the party can act, but player-controlled steps must remain playable.
- Represent action prerequisites explicitly so AI does not teleport an unexposed key, consume an item twice, begin a later stage prematurely, or stall after the player completes a step.
- Author each cooperative puzzle for all three hero selections. The player's contribution changes with selection, while the objective and shared result remain coherent.
- Show what companions are doing and how their actions depend on one another, using staging, animation, and appropriate dialogue/vocal presence. Avoid a sequence that resolves entirely off-screen without the player's involvement.
- Make the shared route and relevant puzzle outcomes persistent across stop/resume. Exact failure and retry rules still need design.
- Escalate hints from an observation toward more specific help. Timing and the degree of explicitness are open; do not make the first hint automatically reveal the full sequence.
- The moat is a reference for teamwork, not a mandatory three-stage template for every puzzle. Preserve varied dungeon and exploration problems.

## Round 18 — answered

### Q52. Difficulty approach

Should the game offer selectable story/normal/challenging modes, focus on one carefully tuned difficulty, or emphasize a demanding default with optional assists?

User answer: "Selectable Story, Normal, and Challenging modes".

Confirmed as D63. Offer Story, Normal, and Challenging. Distinct world danger tiers and bounded ordinary-enemy scaling still apply. Exact changes to damage, enemy behavior, timing, resources, and assistance remain to be designed. Do not assume that a selected mode alters narrative consequences or cancels permanent story tradeoffs.

### Q53. Consequences of defeat

Should defeat allow a nearby retry with equipment/progression retained and little penalty, cost recoverable currency/resources, or return the player to a town/camp while keeping permanent progression?

User answer: "Return to a town or camp, keeping permanent progression but repeating the journey".

Confirmed as D64. Defeat moves the player back to a town/camp while permanent progression remains. D66 establishes fixed camps, and D67 establishes ordinary-enemy repopulation on the return journey with defeated named bosses and permanent story/puzzle outcomes preserved. Destination selection, carried resources, restoration, unfinished boss phases, and companion recovery remain open. Ordinary stop/resume still returns to the saved situation under D30 rather than applying the defeat rule.

### Q54. Combat progression

Should combat upgrades mainly use XP levels and class skill trees, techniques learned through story/trainers/discoveries, or use-based mastery and challenges?

User answer: "Earn XP and levels, then choose upgrades in class skill trees".

Confirmed as D65. Use XP/levels and chosen upgrades for combat progression. D75 later refines the structure to four independent ability specialization trees whose choices change behavior. Ground mastery in training, discoveries, and experience. D69 establishes automatic companion growth; D71 establishes paid town/camp respec. Node designs, point awards, stat growth, level caps, exact costs, and awakening prerequisites remain open. Professions progress separately.

## Implications of round 18

These are planning implications, not approved balance values, reset rules, or skill-tree layouts:

- Collect combat, progression, difficulty, and defeat requirements in [the combat brief](COMBAT_PROGRESSION.md) so the implementation handoff can distinguish the current combat foundation from the new design.
- Keep difficulty modes compatible with the preferred fast, expressive action and mobile camera assistance. Exact differences need encounter testing rather than only larger health bars.
- Make the defeat destination and journey back legible. Town fast travel and mounts remain separate confirmed systems; a camp is not automatically a fast-travel endpoint.
- Separate quit/resume, combat defeat, and narrative loss in persistence design. A permanent story tradeoff is not undone by applying an unrelated respawn rule.
- Define which parts of a defeated encounter reset and what already-earned progress remains before implementing death return. Ask about camps and reset scope next.
- Keep class trees compatible with grounded beginnings, evolving techniques, and later temporary awakened forms. They need meaningful choices without assuming equipment routinely rewrites abilities.

## Round 19 — answered

### Q55. Camps

Should camps be fixed places discovered in the world, player-established camps in allowed locations using supplies, or a mix of both?

User answer: "Fixed camps already placed in the world".

Confirmed as D66. Place camps as authored world locations; do not add player-crafted or freely placed camps as a requirement. Discovery/activation, rest services, defeat-destination selection, and supplies still need details. Town-to-town fast travel remains the confirmed travel network; camps are not automatically additional fast-travel destinations.

### Q56. Encounter resets after defeat

Should only the lost fight reset while previous clears/puzzle/story progress remain, should ordinary enemies along the return journey repopulate, or should damage and defeated enemies in the lost fight also persist?

User answer: "Repopulate ordinary enemies along the return journey, while defeated named bosses stay defeated".

Confirmed as D67. Ordinary enemies return along the journey after defeat. Previously defeated named bosses, permanent story consequences, and persistent puzzle progress do not reset. Distinguish ordinary enemy repopulation from recreating a completed story operation or restoring an occupied settlement. Exact population scope, reward/resource behavior, respawn outside defeat, and unfinished-boss health/phase resets remain open.

### Q57. Changing difficulty

Can players change difficulty outside combat, only at a town/camp, or only when starting a new playthrough?

User answer: "Only at a town or camp".

Confirmed as D68. Restrict difficulty changes to towns and fixed camps, rather than allowing changes anywhere outside combat or fixing the mode for an entire playthrough. Exact menu access, encounter reset behavior, and effects on rewards remain to be designed.

## Implications of round 19

These are planning implications, not a camp map, respawn schedule, or reward formula:

- Place fixed camps to support meaningful return journeys through the fully explorable world. Camp density and destination choice should be evaluated alongside mounts and the 30–60-minute session target.
- Keep town-to-town fast travel separate from defeat return and camp services. Neither camp fast travel nor player camp construction is newly implied.
- Preserve a distinction between ordinary combat populations and unique story entities. Defeat can repopulate a road without resurrecting a slain named boss, reversing an alliance outcome, or reclosing a solved bridge.
- Persistent losses and cleared story operations must survive the respawn process. Exact quest-target and ordinary-enemy classifications need authoring.
- Make difficulty changes available at valid towns/camps and explain the selected mode. Exact tuning still needs testing across all three heroes and the reference mobile devices.

## Round 20 — answered

The user answered the lettered follow-up with "1. B / 2. B / 3. B". The records below map those choices to the displayed options.

### Q58. Companion progression

Should companions match the player's level with player-managed equipment/upgrades, grow automatically with sensible class presets and minimal management, or have separately managed XP/levels/skill trees?

User selection: B — grow automatically with minimal management.

Confirmed as D69. Companions grow automatically with sensible class presets. Do not require the player to manage separate XP curves or manually spend every companion skill point. Exact scaling, presets, equipment handling, and any optional customization remain to be designed. This answer does not specifically select numerical level matching to the player.

### Q59. Companions in danger

Should companions be downable with player revival and post-fight recovery, suffer temporary knockouts and recover automatically during the fight, or stay active without a downed state?

User selection: B — temporary knockouts with automatic recovery during combat.

Confirmed as D70. AI companions temporarily leave active combat when knocked out, then recover automatically during the ongoing fight. Routine recovery does not require a player revival action or waiting until combat ends. Recovery time, restored health, repeated-knockout rules, and interaction with player defeat remain open. The core trio never dies permanently.

### Q60. Skill-tree respec

Should resetting class skill-tree choices be free at towns/camps, cost currency/resources there, or require rare limited-use opportunities/items?

User selection: B — spend currency/resources to respec at a town/camp.

Confirmed as D71. Allow class skill-tree reset at towns/camps for a currency or resource cost. Exact costs, scaling, refund behavior, and full versus partial reset remain open. Respec does not switch the selected hero or class and does not automatically reset professions or narrative decisions.

## Implications of round 20

These are planning implications, not approved AI loadouts, recovery timers, or respec prices:

- Keep companion advancement low-maintenance and compatible with each class's story growth, evolving techniques, and awakened forms. Specific AI unlock schedules remain to be authored.
- Temporary knockouts create intervals when companion support is unavailable. Make recovery readable and keep the player in control; exact vulnerability and encounter behavior need tuning.
- Separate companion knockout recovery from player defeat return and narrative survival. A companion can recover during combat without negating the player's return-to-town/camp rule when defeated.
- Price respec as an economic service at valid towns/camps. Its relation to the crafting economy is a design opportunity, not a requirement to spend rare story-critical materials.
- Preserve chosen upgrades, automatic companion growth state, and recovery state through the eventual persistence design. No runtime behavior is changed in this phase.

## Round 21 — answered

The user answered the lettered questions with "1. A / 2. B / 3. A". These selections map to the options recorded below.

### Q61. Awakening activation

Should the player build a combat meter and activate awakening manually, activate it manually on a cooldown, or spend limited charges/consumables to activate it?

User selection: A — build a combat meter, then activate manually.

Confirmed as D72. Combat charges an awakening meter and the player chooses activation. Do not replace this with automatic transformation, a cooldown-only system, or consumable-only access. Exact charging actions, capacity, duration, drain, persistence, interruption, and relationship to the existing ultimate resource remain open. AI companion awakening behavior still needs design.

### Q62. Strongest equipment

Should top-tier crafted and found gear be comparably viable, should the strongest gear mainly be crafted from rare adventure materials/recipes, or should the strongest gear mainly be found through major bosses/dungeons?

User selection: B — mainly crafting with rare materials and recipes earned through adventures.

Confirmed as D73. Crafting is the main route to the strongest equipment, with rare inputs and recipes earned through adventures. Do not make the default top tier depend primarily on ready-to-equip boss drops or assume crafted/found top-tier parity. Exact tiers, exceptions, upgrade paths, NPC crafting services, and recipe distribution remain open. All four confirmed recipe channels can still serve progression.

### Q63. Loot style

Should equipment rewards mix memorable authored items with regular randomized loot, mainly use curated fixed items, or emphasize frequent randomized drops and stat rolls?

User selection: A — a mix of memorable unique items and regular randomized loot.

Confirmed as D74. Include authored unique rewards alongside regular randomized equipment drops. Randomness does not mean every stat/effect is rolled or that drops are extremely frequent. Exact rates, rarities, duplicate handling, fixed/variable properties, and how found gear relates to crafted upgrades remain open. Equipment remains mainly stat-driven with occasional distinctive effects.

## Implications of round 21

These are planning implications, not approved meters, loot tables, item recipes, or numerical balance:

- Make meter readiness and manual activation readable on touch without sacrificing the player's movement and combat control. Exact input and UI remain to be designed.
- Preserve distinct form visuals and moves, plus the grounded-to-superhuman progression. Meter access is a combat mechanic; awakening unlocks still need story and skill-tree placement.
- Use adventure-earned materials and recipes to connect major discoveries, dungeons, and professions to top equipment. This does not require every profession to be mastered or compulsory repetitive farming for the main ending.
- Give found uniques and randomized gear meaningful roles before and alongside top crafted equipment. Do not silently add dismantling, mandatory repair, or a specific reroll system as the solution.
- Keep recipe sources mixed across trainers, shops, exploration, and quest rewards while reserving appropriate rare inputs for adventures. Exact allocations need authoring.
- Update crafting and combat briefs together so item rewards, skill growth, and awakening have consistent responsibilities.

## Round 22 — answered with a per-ability tree refinement

### Q64. Class skill-tree structure

Should players mix upgrades across several branches within their class, choose one committed specialization, or follow a mostly linear tree with choice mainly in upgrade order?

User answer: "B but for each ability. right now we have 3 basic and an ult. Each one gets its own tree. How u build that tree determines how the ability works."

Confirmed as D75. Each regular ability and the ultimate has its own specialization tree; choices change how that ability functions. This is not one exclusive specialization for the whole class, nor only a list of numerical rank increases. Inspection of the current abilities screen (`src/ui/UIManager.ts`, ability management) confirms four upgrade groups: `basic`, `skill1`, `skill2`, and `ultimate`; dash is separate. Use this existing grouping to name the user's three regular abilities plus ultimate. Exact branches, node interactions, point pools, exclusivity within each tree, and awakening interaction remain open. Do not add separate dash/utility trees by assumption.

### Q65. Visible equipment

Should weapons and armor visibly change with equipment, should weapons change while signature outfits mostly remain, or should the customized appearance remain largely independent of equipment stats?

User selection: A — equipped weapons and armor visibly change the hero.

Confirmed as D76. Represent equipped weapons and armor visually. Appearance customization remains confirmed, but independent cosmetic overrides, transmog, dyes, accessory visibility, per-piece slots, and unlock rules remain open. These changes must be represented consistently in gameplay and cinematics.

### Q66. Awakened appearance

Should awakening primarily enhance the familiar hero with aura/eyes/weapons and marked details, dramatically transform the humanoid silhouette/outfit, or introduce a clearly supernatural nonhuman aspect?

User selection: B — major humanoid transformation.

Confirmed as D77. Awakened appearance can change hair, outfit/armor, and silhouette substantially, while remaining humanoid and recognizable as the chosen character/class. Distinct awakened moves and the contained power ceiling remain required. Exact designs and how equipped items/custom appearance carry through transformation remain open. A nonhuman creature form is not the selected baseline.

## Implications of round 22

These are planning implications, not approved ability branches, equipment assets, or transformation concepts:

- Design four behavior-changing trees per class around the existing primary attack, two regular skills, and ultimate. The three-hero roster therefore needs twelve ability trees, not twelve entirely separate combat classes.
- Keep gear primarily stat-driven with occasional special effects; ability trees are the intended source of substantial changes in ability behavior. This distinction resolves the earlier equipment/build question rather than contradicting it.
- Write ability branches in terms of changed player actions, targeting, movement, timing, delivery, or effects, not only damage percentages. Exact changes need class-specific designs and playtesting.
- Preserve recognizable core class identity across different combinations of ability specializations. Do not assume every tree can unlock every branch simultaneously or impose global specialization locks.
- Extend paid respec design to per-ability trees; exact reset scope, costs, and point refunds remain open.
- Visible gear and major transformations both need asset and animation plans compatible with customized heroes, cel shading, cinematics, and the mobile performance requirement. The visual implementation is not already supplied by this decision.

## Round 23 — answered

### Q67. Choices within an ability tree

Should a player commit each ability to one main branch, combine nodes from multiple branches, or eventually unlock the whole tree?

User answer: "Make choices with branches that make more branches that make more branches."

Confirmed as D78. Use layered branching decisions within each ability tree, so choices create further choices and distinct behavior paths. The answer does not set an exact number of branch levels, node count, point budget, cross-branch links, or unlock-all end state. Do not interpret repeated branching as an infinite or procedurally generated tree requirement. Author the tree's gameplay consequences rather than just increasing percentages at each fork.

### Q68. Awakening and specialized abilities

Should awakening turn the player's specialized abilities into more advanced variants, replace them with a fixed class-specific awakened kit, or provide awakened moves with their own separate upgrade choices?

User selection: B — temporarily replace the normal kit with a fixed class-specific awakened moveset.

Confirmed as D79. During awakening, use a fixed class-specific kit rather than simply upgrading the current branch selections or offering a separate set of awakened specialization trees. Preserve the normal ability build for return after the temporary form ends. Exact slot mapping, skill interactions, passive/stat effects, gear effects, duration, and companion behavior remain open.

### Q69. Cinematic story pacing

Should major turning points receive substantial cinematic scenes while ordinary conversations stay brief/in-world, should important conversations frequently use cinematic staging, or should story mostly unfold through playable scenes with occasional cutscenes?

User selection: A — substantial scenes at major turning points; ordinary conversations brief and in-world.

Confirmed as D80. Concentrate substantial story cinematics at major turns, retaining brief in-world ordinary dialogue. D81 later targets most story scenes at 1–3 minutes with occasional longer turning points; D82 establishes pause/skip without a replay library; D83 establishes the orchestral/electronic/rock score direction. Boss-phase transitions stay short and fights mostly playable. Exact shot lists, editing, and production remain open.

## Implications of round 23

These are planning implications, not approved tree diagrams, awakened attacks, or shot lists:

- Design each ability tree as a finite authored structure with several successive decisions and differentiated downstream paths. Earlier choices should affect later options and the resulting ability behavior.
- The twelve normal ability trees and three fixed awakened kits have different jobs. Avoid duplicating every normal branch into an awakened variant or silently adding twelve more awakened trees.
- Returning from awakening restores the hero's selected normal branches, rather than resetting a build or consuming its upgrade choices. Exact persistent state and combat transition rules require implementation design.
- Put cinematic production effort into the opening crisis, earned awakenings, branch-changing turning points, major losses, and the distinct endings. These are candidate priorities, not a final scene inventory.
- Keep ordinary conversations concise and staged in the world, with the accepted generated vocal presence and readable meaning. Main story cinematics must still reflect custom appearance, visible equipment, and branch state.
- Resolve scene-length expectations, playback control, and musical identity next, then consolidate the major decisions before expanding fine balance numbers.

## Round 24 — answered

The user answered "1. A / 2. B / 3. A+B" to the lettered questions.

### Q70. Story scene length

Should most cinematic scenes last roughly 1–3 minutes with occasional longer turning points, should 3–6-minute scenes be common with a few much longer sequences, or should most stay under two minutes?

User selection: A — mostly 1–3 minutes, with occasional longer turning points.

Confirmed as D81. Target most story cinematics to roughly 1–3 minutes while allowing longer scenes when a major turn earns them. Do not extend a short scene merely to meet a timer. Brief ordinary dialogue and short boss transitions remain distinct from the story-scene target. Exact per-scene timing remains to be authored.

### Q71. Cinematic controls

Should players be able to pause, skip, and replay unlocked scenes; pause/skip without a replay library; or skip only scenes already watched?

User selection: B — pause and skip, without a replay library.

Confirmed as D82. Support pausing and skipping story cinematics. Do not add a cinematic replay library as a requirement. The answer does not restrict skipping to repeat viewings. Exact controls, interrupted-scene resume, state resolution, and handling of player choices inside a scene still need implementation rules.

### Q72. Music identity

Should the score blend orchestra with electronic/rock elements for battles, lean mainly orchestral, or make rock/metal the main action sound with quieter emotional contrasts?

User selection: A+B — orchestral core plus electronic/rock elements for battles.

Confirmed as D83. Build on an orchestral foundation with intimate character themes and large boss scoring, while incorporating electronic and rock elements in battle music. This is not a rock/metal-led score for the whole game. Exact themes, instrumentation, adaptive behavior, track counts, and music-production method remain open.

## Implications of round 24

These are proposed production and implementation practices, not approved tracks, scenes, or audio services:

- Allocate cinematic effort by narrative importance and route state, not by a fixed duration quota. The 1–3-minute target should support the selected 30–60-minute play sessions.
- Implement pause and skip so a scene resolves the correct narrative state once. A proposed rule is that skipping a scene containing an unresolved player decision stops at the decision rather than choosing an answer automatically; finalize this in the cinematic specification.
- Keep a replay library out of the replacement scope. Existing prototype theatre/finisher-preview features are legacy references, not a reason to reintroduce one.
- Develop recurring character/family motifs and faction/antagonist material within the orchestral foundation. Electronic/rock battle layers can supply momentum without carrying over into every quiet scene.
- Plan music transitions alongside mostly playable boss phases, short transitions, awakenings, and finishers. Exact adaptive scoring is a production proposal, not an already chosen engine feature.
- The major creative direction is now extensively documented. Resolve save protection and connectivity next, then consolidate rather than extending the interview into every numerical tuning choice.

## Round 25 — answered

The user answered "1. A / 2. B / 3. A" and requested clickable questions for future rounds.

### Q73. Save storage and accounts

Should players start without an account and optionally enable cloud sync, use a required account with cloud saves, or stay local-only with save export/import for backup?

User selection: A — start without an account and optionally enable cloud saves/cross-device sync.

Confirmed as D84. Immediate browser play does not require account creation. Optional accounts provide cloud save protection and cross-device synchronization. Identity provider, account setup, local-save association, sync conflicts, and backend architecture remain open. Do not turn optional sign-in into a mandatory gate.

### Q74. Save slots and revisiting choices

Should autosaves coexist with multiple manual slots that can revisit earlier decisions, or should each hero have one evolving save with recovery backups rather than manual decision rewinding?

User selection: B — one evolving save per hero, with recovery backups rather than manual decision rewinding.

Confirmed as D85. Preserve a continuous timeline for each hero. Recovery backups protect progress; they are not a manual-slot feature for replaying a decision until a preferred branch is chosen. Backup retention, recovery triggers/interface, hero-slot count, new-run behavior, and synchronization remain open. Do not add multiple manually selectable timeline slots as the default.

### Q75. Connectivity

Should the game support offline play after needed content is downloaded, require a connection to start/load content while tolerating brief disconnections in play, or require an ongoing connection throughout play?

User selection: A — offline play once needed content is downloaded; synchronize later.

Confirmed as D86. Downloaded content is playable offline, with later synchronization when connected and enabled. Exact offline coverage, content packaging, download controls, cache updates, audio delivery, and sync conflict handling remain technical design work. Do not require a live audio-generation request or network check for every offline-play scene.

## Implications of round 25 and consolidation

These are planning implications, not a selected provider, data schema, or cache implementation:

- Keep local guest play functional before account creation, and design optional cloud attachment without losing an existing hero's progress.
- Treat local persistence, cloud synchronization, content downloads, and recovery backups as distinct responsibilities. Specify conflict handling for offline changes across devices before implementation.
- Preserve the evolving timeline's story decisions, permanent losses, profession state, ability builds, puzzle progress, and defeat/return state. Backups are recovery, not a routine branching-menu feature.
- Plan offline content and vocal/music delivery together. Accepted generated audio can be produced or packaged in advance; live procedural generation is not required by the user.
- Review actual device behavior and persistence/download limits during technical planning and physical-device validation. No offline/cloud feature is implemented by this design document.
- Consolidate the major creative and system requirements in [the design overview](DESIGN_OVERVIEW.md). Use focused follow-up questions for remaining major decisions, with clickable options as requested.
- Continue design work; no implementing agent has been dispatched and no runtime replacement is authorized by this consolidation alone.

## Next writing focus — selected and drafted

User selection: "Branching campaign, major choices, final routes, and endings".

Confirmed as D87. The [branching campaign draft](BRANCHING_CAMPAIGN.md) initially proposed three late final campaigns, six principal endings, earlier consequential operations, persistent outcomes, and cinematic/gameplay briefs. D96 supersedes that ending count with nine: hopeful, bittersweet, and dark for each route. D88 subsequently confirms the reservoir tradeoff. D89 rejects the siege split and requires a new design. Other individual missions, ending conditions, and titles remain proposals. Continue using clickable questions for substantive feedback.

## Branch review 1 — reservoir confirmed, siege rejected

The user selected "Keep this specific tradeoff" for the reservoir dilemma and "Rework the siege decision entirely" for the proposed Hearthmere split.

The reservoir retains its two irreversible outcomes (D88). The siege must not simply substitute another victim into the same rescue split. Three replacement models were offered; the next review selected authority, recorded below.

## Branch review 2 — siege authority model selected

User selection: "Authority fork: civilian-led defense versus emergency military command, with consequences for the resistance's power afterward".

Confirmed as D90. Develop C05 around who can direct the defense, requisition supplies, and bind the resistance to decisions afterward. Both approaches can defend Hearthmere. The initial military choice is not automatically a bad ending, and civilian leadership is not a guarantee against later abuse. Proposed objectives, costs, charter terms, and Whitewake missions remain authoring material rather than separate user confirmations.

Consolidate overlapping questions: C03 addresses evidence and responsibility for past occupations; C05 creates the present defense mandate; later missions test whether actual terms are honored. Do not repeatedly ask a fresh civilian-versus-military question at each checkpoint. D91 subsequently establishes that emergency power has no guaranteed end date and must be contested later.

## Branch review 3 — authority does not expire automatically

User selection: "No guaranteed end date; forcing or persuading commanders to relinquish power becomes a later conflict".

Confirmed as D91. Do not automatically return power when the siege ends, a clock runs out, or Caedran dies. The player may have to persuade or force commanders to relinquish it. This does not make the initial grant unlimited in subject matter or automatically make every commander a villain.

The branch draft now develops **The Orders That Remain** as a proposed playable conflict: protect a civilian relief route, confront the staff using the siege mandate, and pursue a negotiated transfer, forcible disarmament, or continued military authority. Named participants, specific concessions, encounters, and resolution conditions remain proposals. Record whether power actually returned separately from the original siege choice, and reflect it in final-route scenes and endings.

## Branch review 4 — Compact rescue can save both groups

User selection: "Let earlier preparation and the playable rescue make saving both possible here".

Confirmed as D92. Remove H3's forced choice between losing the allied rearguard and losing Sera's ward/rescue team. Develop a route preparation and playable rescue sequence that can bring both out. This does not undo Rowan's death or Lowbank's destruction from C02 and does not make every other campaign tradeoff solvable.

The revised draft proposes preparing an independent ward bypass, opening the rearguard's withdrawal route, containing the final command broadcast, and completing the evacuation during the final operation. These are concrete authoring proposals, not individually approved mechanics. Essential preparation must be communicated through the main route, not hidden behind optional completion or high profession levels. D93 subsequently establishes recovery before possible permanent loss; do not silently replace the removed guaranteed sacrifice with an opaque timer.

## Branch review 5 — rescue setback and recovery

User selection: "Give an in-mission recovery opportunity; failing that can cause a permanent loss."

Confirmed as D93 for a failed Compact rescue objective while the player survives combat. The first setback opens a playable recovery opportunity within the mission. Successful recovery can still save the threatened group; failing recovery can cause a permanent loss that continues in the evolving story. This does not guarantee a named death, extend the rule automatically to every mission, or replace the existing town/camp return after player defeat.

The branch draft proposes a legible threatened state, a concrete alternate rescue task, and commitment of the actual outcome only after that recovery resolves. Specific hazards, timing, casualties, difficulty tuning, and active-boss/save interactions still need encounter design. Browser interruption, AI faults, or pausing must not masquerade as a failed rescue. Next review the other final operations and ending conditions.

## Branch review 6 — Free Standard finale tradeoff confirmed

User selection: "Keep this specific unavoidable tradeoff."

Confirmed as D94. Preserve the specific final choice between saving Hearthmere's forge district and freeing the exposed bound conscripts. Earlier evacuation can protect residents in the district-loss branch; it does not provide a third outcome that saves both the conscripts and the district. The user approved the dilemma, not a preferred in-game side. Do not import the Compact's save-both/recovery model into this separate commitment or assign Mara a new mandatory death.

Make the two playable plans and their stakes clear before the largest irreversible commitment. Carry the actual conscript survival and district condition into the return journey and later world state. Neither choice alone determines whether military authority is accountable: that remains a separate record of promises and conduct. Exact battlefield geometry, named participants, service replacements, and execution-failure behavior still need authoring. Next review the Severance Circle finale.

## Branch review 7 — Severance Circle timing decision confirmed

User selection: "Keep this timing decision, with civilian preparation affecting the consequences."

Confirmed as D95. Retain gradual versus immediate shutdown as the Circle finale's major timing decision. Gradual shutdown protects dependent patients but permits the final command to reach allied troops and cause losses. Immediate shutdown prevents that military loss, with consequences for clinics and water systems affected by earlier civilian preparation. The user approved the decision structure, not a preferred in-game plan or particular casualty list.

Do not flatten preparation into an irrelevant epilogue line, make every immediate cut equally catastrophic, or guarantee that every patient survives a prepared immediate cut. Specific local dependencies, preparation effects, battlefield objectives, loss severity, and ending conditions still need authoring. The Compact's save-both/recovery rule is specific to that rescue. Next review the proposed ending structure and conditions across all three routes.

## Branch review 8 — nine distinct principal endings

User selection: "A distinct hopeful, bittersweet, and dark ending per route, plus variations (nine main endings)."

Confirmed as D96. Expand the three-route structure to nine principal endings. Bittersweet is a separate authored outcome for each route, not merely a sad personal variation of its hopeful ending. Preserve additional variations for people, settlements, alliances, and actual permanent losses. All nine retain the core trio's survival and Caedran as the enemy.

The draft proposes three new bittersweet conclusions: **The Long Work of Home** (free communities with fragile recovery), **Peace Without a Banner** (returned civilian power but fragmented regional security), and **Small Lights in Winter** (surviving local lifelines amid uneven recovery). Titles, conditions, scenes, and the proposed distinction between lasting recovery and fragile freedom await review. Do not claim those specifics were individually approved by the selected ending count. Earlier unavoidable losses remain in every applicable outcome; no casualty-free run is required by a hopeful label.

## Branch review 9 — world recovery and personal cost jointly matter

User selection: "Both together: the world's recovery and the personal cost should jointly determine the ending."

Confirmed as D97. Replace the previous proposed world-first distinction between hopeful and bittersweet. The condition of communities and the personal cost to the company and people close to it must jointly shape the principal outcome. Personal consequences are not restricted to memorial lines layered over an ending already determined by services and government.

The revised proposal considers actual losses, displacement, kept or broken trust, and how survivors rebuild relationships alongside services, freedom, and security. These particular factors and their combinations remain authoring proposals. Do not use a death tally, punish one side of an approved unavoidable tradeoff automatically, or require a casualty-free run for hope. The trio survives every ending. D98 subsequently confirms that their found-family bond also remains intact in the darkest conclusions.

## Branch review 10 — the trio stays a family in every ending

User selection: "Their bond remains intact: they face the consequences together, even when the world ends badly."

Confirmed as D98. Preserve the emotional bond as well as the lives of Brynhildr, Celestia, and Akatsuki across all nine endings. They can argue, grieve, confront mistakes, and carry responsibility, but the conclusion does not split them apart or leave their family defined by unresolved mistrust. Shared survival alone is not sufficient: show their continuing trust and commitment.

D97 still makes personal cost part of ending evaluation. Develop that cost through actual supporting relationships, losses, displacement, changed homes, and obligations rather than breaking the trio. Particular incidents and supporting-character reactions remain proposals. Their bond does not absolve the harm caused or automatically turn a dark world into a hopeful ending. Next develop a concrete supporting relationship before finalizing personal-cost conditions.

## Branch review 11 — Mara's trust can recover or break permanently

User selection: "Later choices can rebuild her trust or lead to a permanent break with the trio."

Confirmed as D99 for the branch where Lowbank is saved and Rowan dies. Mara understands that saving both was impossible. Later decisions determine whether trust can be rebuilt or the relationship breaks permanently; neither reconciliation nor permanent rejection is automatic. Her grief is not removed by reconciliation. This is a supporting relationship consequence and does not break the core trio's bond (D98).

The branch draft proposes later scenes about families' needs, honest public accountability, and the company's conduct during relief. These scene ideas and conditions remain proposals. Do not use gifts, a hidden affection tally, or unrelated errands to erase the loss. Keep the personal relationship distinct from Mara's public role and the Compact's collective support; a break must not silently remove the final route or essential services. D100 subsequently establishes refusal of direct cooperation and changed missions/support through other allies.

## Branch review 12 — Mara refuses direct cooperation

User selection: "Refusal to cooperate directly: her missions and support change, and the trio must work through other allies."

Confirmed as D100. A permanent break affects playable missions and direct support, not only conversational warmth. Mara will not personally cooperate with the trio. Other established allies provide changed approaches while the Compact remains available and she continues opposing Caedran. Do not automatically turn this into organized political opposition, make her a Covenant ally, or erase the break by routing unchanged friendly dialogue through another character.

Proposed operation variants distinguish Mara's personal resources/coordination from public faction resources, involve existing people such as Nessa or Joren where actually available, and change logistics or objectives. Specific tasks and resource costs remain proposals. Essential progression and professions stay accessible through coherent alternatives; the relationship consequence remains real in access, participation, and the aftermath.

## Opening review 1 — a brief playable lead-in

User selection: "A brief playable lead-in, roughly 15–20 minutes: meet people and experience town life, then the crisis hits."

Confirmed as D101. Give the player a short experience of Hearthmere and its people before the catastrophe, rather than beginning amid the attack or requiring a long sequence of town chores. The duration is an approximate creative pacing target, not a real-time countdown. Preserve the harsh frontier tone with rare warmth and the trio's initial status as strangers.

The [opening sequence draft](OPENING_HOUR.md) proposes connected town spaces, one small shared repair with Rowan, Mara's public responsibilities, class-specific reasons for arrival, and a first-hour outline. These details are authoring proposals, not individually approved quests. D102 subsequently establishes an overwhelming giant attack with survival, rescue, and escape rather than defeating it. Specific crisis staging and aftermath remain to review. No new utility/awakening unlock or compulsory profession lesson is established by this answer.

## Opening review 2 — survive the giant

User selection: "An overwhelming giant attack: the three must survive, rescue civilians, and escape rather than defeat it."

Confirmed as D102. Make the first major action sequence an escape/rescue encounter with an enemy beyond the heroes' starting capability. Do not give the player an ordinary kill objective and then invalidate a victory, force a defeat, or unlock an unearned endgame form. The three cooperate while still strangers and each selected hero remains player-controlled.

The revised opening draft proposes readable local rescue objectives, smaller threats that can be fought, temporary openings against the giant, and an escape through previously seen streets. Particular hazards, NPC outcomes, giant damage/stagger rules, and cinematic shots remain proposals. The escape does not mean defeating the giant or automatically making Hearthmere permanently inaccessible. D103 subsequently establishes a major main-story rematch; its timing and final resolution still need review.

## Opening review 3 — required-story rematch

User selection: "Yes—a major main-story rematch that shows how far the trio has grown."

Confirmed as D103. Return the same giant for a major main-story confrontation after the opening survival encounter. The second encounter must demonstrate growth in capability and cooperation, rather than being an optional repeat or merely having a larger damage number. D104 subsequently places it in Hearthmere's defense; D105 establishes its permanent death through an earned finisher.

The draft proposes recognizable attack motifs with new playable answers, developed trio coordination, and an earned playable victory. Specific phases, visual identifiers, available forms/utilities, and aftermath are proposals. Fit it into the existing story/boss budget rather than automatically adding another dungeon or several hours. If all final routes must share this payoff, place it on the common campaign path or explicitly author route access; do not silently confine the required rematch to one ending route.

## Opening review 4 — defend Hearthmere in the rematch

User selection: "During the return to defend Hearthmere: defeat the creature that once drove you out while protecting the same town and people."

Confirmed as D104. Identify C05's siege beast as the opening giant and stage its defeat during Hearthmere's defense. Both civilian-led and emergency-command paths include the rematch; their support, approach, and institutional consequences differ. Do not make this payoff depend on the late faction route, Mara's personal cooperation, or an optional hunt.

The draft proposes recognizable town geometry, familiar attacks with new player responses, a sustained playable confrontation, and an aftermath showing the people actually present. These are scene/encounter proposals, not approved numerical mechanics. Victory does not erase the reservoir loss, Mara's relationship state, siege requisitions, or the later authority conflict. D105 subsequently confirms that the creature dies in an earned spectacular finisher.

## Opening review 5 — the giant's threat ends permanently

User selection: "Kill it with a spectacular, earned finisher—the threat that drove them out is finally ended."

Confirmed as D105. The rematch kills the giant and permanently ends that individual's threat. Make the finisher a payoff to the player's successful combat, not an automatic rescue or a film substituting for the fight. Both siege authority paths retain this ending, and any later return to the world respects the defeated named-boss state.

The draft proposes a short trio-assisted finisher that gives the selected hero a decisive contribution, using earned capabilities and the contained superhuman power scale. Exact animation, inputs, phase conditions, and visual effects remain proposals. No additional mercy decision, unearned awakened form, region-destroying attack, or mandatory supporting death is implied. Next develop Hearthmere's state between the opening escape and its later defense.

## Hearthmere review 1 — occupation, liberation, then defense

User selection: "An occupied town: the trio works covertly with residents and must liberate it before defending it."

Confirmed as D106. Hearthmere does not immediately become a freely welcoming safe hub after the opening escape. It is occupied; covert cooperation and a required liberation precede the later siege and giant's death. Keep those events distinct: freeing the town from its garrison is not the same operation as defeating the returning giant.

The branch draft proposes discreet resident contacts, different useful approaches for all three playable heroes, and a liberation involving the town rather than just a single enemy camp clear. D107 subsequently selects a covert operation; specific objectives, placement, and costs await review. The old public-refuge scenes are superseded; shelter can be covert or outside the occupied center until liberation. Mara's trust state affects direct cooperation without removing the town's resistance or essential progression. Revisit the provisional main-story budget instead of automatically adding a new chapter's hours.

## Hearthmere review 2 — covert liberation

User selection: "A covert operation: the trio dismantles the garrison's control and removes its leadership before it can mount a full response."

Confirmed as D107. The main approach is coordinated covert action rather than an uprising or an outside army assault. Resident cooperation prepares access and opportunities. The selected hero performs their role while AI companions act on understood objectives; choosing warrior or mage cannot prevent this required operation.

The draft proposes isolating local communications and routes, releasing detained people, and confronting the command staff once they cannot coordinate the whole garrison. These particular stages remain proposals, as do whether leadership is captured, killed, or compelled to surrender. Local sabotage does not destroy Caedran's entire command lattice or replace the final campaign. D108 subsequently makes exposure a harder combat version with changed objectives and liberation still achievable. Exact escalation and defeat handling remain to be authored.

## Hearthmere review 3 — exposure changes the operation

User selection: "Let the operation turn into harder combat with changed objectives, while liberation remains achievable."

Confirmed as D108 for detection before garrison leadership is isolated. Continue the operation with harder combat and changed objectives instead of automatically failing or requiring retreat. This does not change the selected Story/Normal/Challenging mode, guarantee victory, or replace the established town/camp return after defeat.

The branch draft proposes intercepting response forces, opening a changed rescue route, and reaching relocated command staff according to what sabotage was already completed. Specific events remain proposals. Preserve completed permanent progress; detection does not automatically kill civilians, restore disabled infrastructure, or summon the later giant siege. Browser interruption and AI faults are not authored reasons to force this branch. Next develop the garrison leadership as characters rather than leaving liberation as anonymous objective markers.

## Hearthmere review 4 — the occupation commander

User selection: "A capable royal officer who sincerely believes harsh military control prevents another disaster."

Confirmed as D109. Give the occupation a capable royal officer whose belief in protective military control is sincere. Competence and conviction should appear in conduct, not just a speech; neither establishes that the occupation is justified or harmless. Keep this antagonist distinct from a cartoon sadist or an automatically innocent victim of orders.

The branch draft proposes practical disaster relief alongside enforced movement, supply, and detention policies. Those particular acts and the officer's identity remain proposals. D110 subsequently establishes that they believe the official account and do not know the attacks are manufactured. Do not silently make them the opening cover-up officer, reuse Tal/Dorr without a continuity decision, or reveal a replacement mastermind behind Caedran.

## Hearthmere review 5 — a loyalty built on a false account

User selection: "They believe the official account and do not know the attacks are manufactured; credible evidence could challenge their loyalty."

Confirmed as D110. The commander has not knowingly joined Caedran's disaster scheme. Their belief in the royal explanation is sincere, and credible proof can challenge loyalty. Keep ignorance of that conspiracy separate from responsibility for the coercive policies they chose to enforce.

The draft proposes corroborated evidence tied to main-story events and a reaction that changes conduct, rather than a hidden collectible unlocking a persuasion button. D111 subsequently permits a conditional long-term alliance after relinquishing occupation authority, accountability, and earned trust. Specific proof, confrontation scenes, conditions, and other possible fates remain proposals. Do not treat one eloquent line as automatic conversion or add mind control to erase the officer's agency.

## Hearthmere review 6 — a conditional long-term ally

User selection on phone: A — "Yes, eventually—but they must surrender control, face accountability, and earn trust through later actions."

Confirmed as D111. The former occupation commander can become a long-term ally, but only through relinquished occupation power, accountability, and later conduct that earns trust. Do not make evidence an instant recruitment button or treat useful military experience as absolution. Cooperation is a possible branch, not a guaranteed outcome or a new playable companion replacing the trio.

The draft proposes a transfer of actual control, release/records commitments, supervised restitution, and later support under a limited role. Specific terms, scenes, and eligibility remain proposals. This does not automatically grant the former commander military authority during C05, choose a faction, satisfy Rusk's separate accountability obligations, or resolve Mara's personal relationship. D112 subsequently confirms death in battle if defeated without being convinced; conditions after a successful challenge to loyalty still need authoring.

## Hearthmere review 7 — an unconvinced commander dies fighting

User selection on phone: C — "They fight to the death; the chance for an alliance is lost."

Confirmed as D112 for defeating the commander without convincing them of Caedran's deception. Resolve that battle with their permanent death, not a capture prompt or a later prison conversation that restores the alliance opportunity. This is death in combat, not a newly required execution scene. The conditional living-ally branch (D111) remains possible if their loyalty is successfully challenged and its requirements are met.

Exact evidence opportunities and the confrontation's commitment point remain scene-design proposals. Detection during liberation changes objectives under D108; it does not alone mean the officer has rejected proof or automatically remove the alliance possibility. The commander cannot appear in later support scenes if killed. Their death alone does not select a dark ending, and it does not remove the later Hearthmere defense or the core trio's unbroken bond.

## Awakening review 1 — one shared first awakening crisis

User selection on phone: B — "All three awaken during one shared crisis."

Confirmed as D113. The first awakenings belong to one shared main-story crisis, not three separate personal unlock episodes or a guaranteed protagonist-first sequence. The exact timing of each hero's transformation within that event is still scene design. Their class identities, distinct humanoid forms, and fixed class-specific awakened movesets remain intact.

The opening catastrophe creates potential, with mastery earned through the journey. This answer does not move full forms into the opening escape, establish a bond meter, fuse the heroes into one entity, or override the player's combat-meter/manual activation rule. The combat brief proposes a playable buildup, a cinematic reveal, and immediate use of the new kit while companions participate. D114 subsequently places the shared breakthrough during Hearthmere's giant rematch.

## Awakening review 2 — the rematch's turning point

User selection on phone: B — "During the rematch—the shared awakening becomes the battle's turning point."

Confirmed as D114. The first shared awakening belongs to C05's defense of Hearthmere, during the rematch with the opening giant. Both civilian and emergency-command approaches retain it. The heroes begin the confrontation with their developed normal techniques, then the shared breakthrough turns the battle and leads to the earned victory and spectacular killing finisher.

The draft proposes a playable buildup, a clear manual first activation for the chosen hero, three distinct transformation reveals, and meaningful awakened combat before the finisher. D115 subsequently selects complete earned mutual trust as the emotional catalyst. Exact phases, charge/activation handoff, duration, and AI staging remain proposals. Preserve mastery earned before this battle rather than making the whole victory an unexplained emergency gift. Later scenes such as the First Fall develop control and understanding, not another first awakening. No new supporting death is required.

## Awakening review 3 — earned trust unlocks the breakthrough

User selection on phone: C — "They finally trust one another completely, combining everything they've learned instead of fighting as individuals."

Confirmed as D115. The emotional turn is full mutual trust expressed through learned cooperation during the rematch. Seed that trust through the preceding required story and let the climax demonstrate it in action. Their shared catastrophe supplies potential and earned mastery supplies control; trusting one another lets them bring that growth together under pressure.

The draft proposes complementary commitments reflecting their arcs: the warrior relies on the others instead of carrying every danger alone; the mage shares responsibility rather than directing everything; the assassin commits to a shared future rather than preserving a solitary escape. Particular actions and dialogue remain proposals. Their continuing disagreements, supporting relationships, grief, and political consequences still have room to develop after this milestone. No supporting death, sacrificial trap, merged form, or new bond-meter mechanic is required by this catalyst.

## Awakening review 4 — intimidating beauty, distinct class identities

User selection on phone: "B and C" — combine "Beautiful but intimidating—dark metal, fierce auras, and visibly dangerous power" with "Different for each hero—a radiant spear champion, a cosmic time mage, and a shadow-wreathed assassin."

Confirmed as D116. Use a shared intimidating tone and a different class expression for each hero. The spear champion can radiate harsh, dangerous brilliance through dark armor; the mage expresses cosmic/time power; the assassin is shadow-wreathed. Preserve recognizable humanoid silhouettes, major hair/outfit/armor changes, customization continuity, and distinct movesets from earlier decisions.

The combat brief proposes silhouette, material, motion, and effect motifs for the three forms. Specific colors, ornaments, animations, and choreography remain art-direction proposals. Dark visuals must retain readable shapes in the cel-shaded isometric mobile view. Visibly dangerous power is not approval of health drain, corruption, automatic aggression, loss of control, or a new awakening penalty. Those mechanics remain unselected.

## Antagonist review 1 — the maternal relationship behind control

User answer: "Mommy issues."

Confirmed as D117 at the level stated: Caedran's relationship with his mother is central to the emotional root of his need for control. Do not select one of the prior offered motives as though the user chose it. D118 subsequently selects affection conditional on obedience and achievement; bereavement, abandonment, her identity/status, and present involvement remain unconfirmed.

Develop the specific relationship before writing a definitive childhood scene or confession. Caedran remains responsible for engineering disasters, binding people, and exploiting dependence; explaining a wound does not make the Crown possess him or transfer final-antagonist responsibility to his mother. A proposed thematic contrast is his attempt to secure attachment through control versus the trio's earned, freely chosen trust. Exact expression awaits the next answer.

## Antagonist review 2 — affection conditional on obedience

User selection on phone: A — "Her love depended on obedience and achievement. He still needs approval—and demands obedience from everyone else."

Confirmed as D118. Caedran's need for approval and his demand for obedience grow from maternal love tied to compliance and accomplishment. His repeated achievements do not resolve that need. D119 subsequently establishes a living, present mother who openly belittles him. Specific childhood events, her identity/influence, and the exact way this history is revealed remain to be developed.

The story draft proposes showing the pattern in adult behavior: useful service earns conditional praise, dissent is treated as ingratitude, and apparent protection becomes an obligation to obey. These scenes and interpretations remain proposals rather than a diagnosis or a complete explanation for every action. Preserve his adult agency, the complicit court, and his responsibility as the antagonist. The trio's freely chosen trust can provide a thematic contrast without turning a final confrontation into instant therapeutic redemption.

## Antagonist review 3 — alive, present, and contemptuous

User answer: "She just walk around saying ‘you ain’t shit’ to him."

Confirmed as D119. Treat the mother as alive and present, with blunt, ongoing contempt for Caedran even amid his achievements. Preserve the user's line as a voice reference and possible authored dialogue. His need for approval persists in an active relationship rather than being only a memory of a dead or absent parent.

Her name, social position, political influence, and whether she humiliates him publicly or privately remain open. D120 subsequently establishes that he argues back but keeps returning for affection. The line's frequency and comic versus threatening staging remain scene choices; it is not a requirement for an endlessly repeating ambient NPC bark. This does not make her the mastermind behind his crimes or remove his responsibility.

## Antagonist review 4 — defiance followed by return

User selection on phone: C — "Argues back—but keeps returning, desperate for one kind word."

Confirmed as D120. Caedran actively disputes his mother's judgment, yet repeatedly seeks her approval and affection. Do not substitute passive submission or automatic retaliation against subordinates as the chosen response. His argument and return belong to the same unresolved relationship.

Proposed scenes can show him insist on the worth of what he has done, end an exchange without the approval he wanted, and later reinitiate contact. Exact words, chronology, public/private context, and tone remain proposals. Keep his political choices and responsibility intact; this pattern adds depth without making his mother a secret commander. D121 subsequently permits occasional private cutscenes outside the trio's viewpoint.

## Cinematic review — events beyond the trio's viewpoint

User selection on phone: A — "Yes—occasional private scenes with Caedran, including his mother, can reveal what the heroes don't know."

Confirmed as D121. Allow occasional cinematic scenes outside the trio's immediate experience. They can reveal Caedran's private relationships, behavior, and response to the campaign. Preserve the difference between information shown to the player and evidence acquired by the heroes; a private scene does not automatically give the trio that knowledge.

The presentation brief proposes a few story-turn interludes rather than a cutaway after every operation. Exact placement, dialogue, length, and spoilers remain authoring choices under the established cinematic pacing and pause/skip rules. The player still controls only the selected hero during gameplay, and route-specific scenes must respect actual losses, allies, and world state. D122 subsequently places their first direct meeting around the middle, in a tense parley after they learn the truth.

## Antagonist review 5 — the first face-to-face meeting

User selection on phone: B — "Around the middle—a tense parley after they know what he's doing."

Confirmed as D122. The trio's first direct meeting with Caedran is a mid-campaign parley between informed opponents. The heroes already know that he manufactures the attacks; their knowledge must come from actual story discoveries, not only private cutscenes shown to the player. D123 subsequently makes obtaining research and evidence his primary goal. Exact placement relative to liberation, witnesses, venue, terms, choices, and outcome remain to be developed.

The older treatment's particular prisoner/Sera bargain and fixed refusal remain proposals, not automatically approved by this timing choice. Use the actual reservoir outcome, research policy, allied participation, and surviving characters. Caedran stays the antagonist; a negotiation does not create a route joining his cause. D123 narrows the meeting's goal below.

## Antagonist review 6 — a bargain for leverage

User selection on phone: B — "Their leverage—he wants dangerous research and evidence surrendered in exchange for concessions."

Confirmed as D123. Caedran primarily wants the resistance's research and evidence, not its public endorsement or merely an opportunity to study the trio. D124 subsequently makes positions of power the concession. Exact materials, offices/authority, verification/enforcement, and available player responses remain open.

The branch draft proposes distinguishing technical countermeasures from proof of manufactured attacks, and making terms reflect C04's actual research state. Distributed copies cannot be made nonexistent by surrendering one book; destroyed models cannot reappear for the exchange. Do not automatically trade Sera, erase party knowledge, undo the reservoir choice, or force one refusal for every run. D124 selects the concession below.

## Antagonist review 7 — positions of power

User answer: "Positions of power."

Confirmed as D124. Caedran offers power rather than one of the proposed humanitarian concessions as the main exchange for research and evidence. Exact titles, whether each hero receives an office, scope of authority, practical benefits, imposed obligations, and his sincerity remain open. Do not silently add prisoners, supplies, or a ceasefire as approved benefits.

The draft proposes a temptation to use authority to shape the frontier, alongside the dependence created by taking office under Caedran. Specific military, research, or civil/intelligence posts are examples, not confirmed appointments. D125 subsequently makes acceptance/refusal a player choice; exact motives, obligations, and consequences still need authoring. D51 keeps Caedran the eventual enemy; the offer alone does not approve an ending in his service or a fourth faction route.

## Antagonist review 8 — the player can accept or refuse

User answer: "Yea it's a choice for the player."

Confirmed as D125. Both acceptance and refusal must be available, with meaningful differences in missions, access, relationships, and consequences under the broader choice-driven design. Do not replace acceptance with a forced refusal or automatically decide that every player is secretly infiltrating. The answer does not select one of the preceding proposed motives or define the offer's actual authority/sincerity.

The draft proposes an office-taking branch and an independent-resistance branch, with chronology preserving covert liberation and the later giant defense. Those operations, timing, trade costs, and the eventual break remain proposals. Earlier permanent outcomes persist. Acceptance is not an automatic dark ending or a new permanent pro-Caedran finale; the earlier eventual-enemy requirement remains in force. D126 subsequently confirms genuine authority followed by pressure to obey.

## Antagonist review 9 — real power and subsequent pressure

User selection on phone: A — "Real authority, followed by pressure to use it his way."

Confirmed as D126. Taking office grants meaningful power with practical effects. Caedran later pressures the company to use that authority for his priorities. Do not reveal that the entire appointment was ceremonial or invalidate every benefit to make the decision meaningless. Genuine power does not itself define unlimited jurisdiction, the specific job titles, or how he reacts to a refused order.

The draft proposes a chance to exercise authority in actual operations before a major loyalty test. Particular powers, affected people, tasks, costs, and timing remain proposals. Preserve the distinction between royal office and the separate C05 defense mandate; neither silently replaces the other. Acceptance still has real research/evidence costs to specify, and earlier outcomes persist. D127 subsequently selects class-specific senior offices plus inner-council seats.

## Antagonist review 10 — senior offices and the inner council

User selection on phone: "A+C" — combine class-specific offices with seats in Caedran's inner council and authority over frontier policy.

Confirmed as D127. The warrior receives military command, the mage royal research leadership, and the assassin intelligence leadership. All three sit on the inner council. These are genuine offices under D126, with both field responsibilities and wider policy influence. This does not select the alternative of joint governorship over a single region.

Exact titles, chain of command, jurisdiction, council decision rules, resources, and initial assignments remain proposals. Keep the chosen protagonist playable and the other two as authored AI companions; office-holding does not create character switching, an RTS mode, or full companion build management. D128 subsequently selects handing over protected witnesses as Caedran's first major loyalty demand.

## Antagonist review 11 — the demand for protected witnesses

User selection: B — "Hand over protected witnesses who could expose his manufactured attacks."

Confirmed as D128. After the accepting branch has established real authority, the first major loyalty test demands the surrender of people under protection whose testimony threatens Caedran's manufactured-disaster scheme. This escalates the bargain from handing over research/evidence to control of people. D129–D131 subsequently establish three responses, imprisonment/coercion after handover with possible rescue, and revocation/arrest after open refusal. Exact witnesses, proof, and encounter outcomes remain open.

The branch draft proposes a clear setup showing who they are, why the trio protects them, and what they can actually substantiate. Do not automatically execute them, substitute a dead character, use private-cutscene knowledge as testimony, or make the player obey. The next review records the response branches.

## Antagonist review 12 — compliance, refusal, and deception

User selections:

- "Comply, openly refuse, or attempt deception to protect the witnesses."
- "They are imprisoned and coerced, with a difficult later rescue possible."
- "Revoke their offices and attempt to arrest them and seize the witnesses."

Confirmed as D129–D131. Build three playable responses. Compliance transfers the witnesses into captivity and coercion; later rescue is possible but difficult. Open refusal immediately costs the offices and initiates an arrest/seizure attempt. D132–D134 subsequently establish a staged transfer escape, office retention on full success, and a playable extraction after exposure.

Do not silently make handover fatal, make the arrest attempt an automatic loss, or make deception free guaranteed success. Later rescue is a new action in the same timeline, not reversal of the handover: harm, coerced testimony, damaged trust, and actual earlier consequences need specific authoring. A living rescued witness is not automatically a forgiving witness. The core trio's survival and family bond remain. Ordinary defeat and interruption retain their separate existing rules.

## Antagonist review 13 — the staged transfer escape

User selections:

- "Stage a prison-transfer escape so it appears the witnesses got away without the trio's help."
- "Yes—they can continue working from inside until later choices or events cause a break."
- "Offices are revoked and an arrest/extraction fight begins; saving the witnesses is still possible during play."

Confirmed as D132–D134. The deception is a staged escape during transfer, not fake deaths. Complete success preserves both witness safety and the trio's offices/apparent loyalty, allowing the insider branch to continue. If the cover unravels, revoke the offices and begin a playable arrest/extraction; the witnesses can still escape through play.

The branch draft proposes preparation through genuine office access, an authored transfer route, coordinated hero roles, and a credible account of the escape. Exact stages and success/capture conditions remain proposals. Do not assume automatic witness capture, add an extra guaranteed recovery stage, or force successful deception to end office-holding immediately. D135–D137 subsequently set the branch's endpoint at C05, identify Sera's technical group, and make later rescue a substantial optional arc.

## Antagonist review 14 — Sera's group and the insider endpoint

User selections:

- "Until Hearthmere's giant defense, which forces an open break with Caedran."
- "Sera and a small team of technicians with direct knowledge of Caedran's work."
- "A substantial optional rescue arc; leaving it unresolved has lasting consequences."

Confirmed as D135–D137. Preserve the successful insider branch until the giant defense; a new confrontation at that event ends the cover/office relationship rather than retroactively invalidating the staged escape. Sera and her technicians are the witnesses. If captured or surrendered, their rescue is substantial but optional, with lasting consequences if unresolved.

Main-story and final-route scenes use Sera's actual availability and provide alternative expertise as needed. The Compact evacuation group and rearguard retain their save-both opportunity. Sera's custody follows the witness branch. D138–D140 settle the public break, rescue format, and fate of Sera if the rescue window closes while she is still captive.

## Antagonist review 15 — public exposure and Sera's rescue window

During Hearthmere's defense the trio publicly proves Caedran's involvement in the attack to rally resistance (D138). Any serving insiders sacrifice their cover and offices in that act. The draft proposes authenticating a command link in view of defenders, with the source of proof depending on what the trio can actually access.

Sera's optional rescue is a prison dungeon with substantial puzzles, a distinctive warden boss, and a coordinated escape (D139). A clearly warned story commitment before the finale permanently closes her rescue window (D140). D141–D142 identify that commitment and the technicians' fate. The prison layout remains open.

## Antagonist review 16 — the final campaign locks in the prison outcome

The rescue window closes when the player confirms one of the three final campaigns at C06 (D141). Sera and the technicians still captive die permanently (D140, D142). Show the actual captives and the consequence before confirmation. The player can back out and attempt the rescue while the window is open.

Apply the cutoff to each person's custody state. This handles anyone already safe and gives a consistent rule if the dungeon later supports partial extraction. Partial extraction is still an encounter design question. All three campaigns account for the survivors, losses, and resulting gaps in expertise.

## First playable slice — combat and moat decisions

D153 restores the original isometric gameplay camera after the behind-the-hero playtest. D144 and D146 retain the prototype's automatic targeting as the unlocked baseline with optional boss lock-on. D145, D147, and D148 confirm basic attack dodge cancellation, commitment until release for the strongest abilities, and a fresh dodge press once the commitment ends.

D149 and D151 confirm that an automatic cutscene starts the moat sequence and the trio explains the whole plan before play resumes. D150 confirms a local stealth retry after detection. D152 gives the selected hero a dedicated mobile utility button throughout exploration. The exploration brief proposes a next-action prompt after the scene, including when skipped, and a restart position for the stealth step.

### Current interview format — desktop

The user is back on a computer and explicitly permits more than one question at a time. Return to clickable questions and group two or three related substantive questions where useful. The earlier direct-chat A/B/C format applied while they were on a phone. Keep questions self-contained, record the full meaning of every answer, and continue documentation before the next round.

## Recording future answers

For each answer, record the user's stated preference, the resulting confirmed decision, its implications for existing documents, and any unresolved detail. Keep direct requirements distinct from suggested implementations. Update this document and affected design sections before proceeding to the next round. If a later answer changes an earlier decision, record the replacement and revise dependent proposals rather than leaving conflicting instructions for implementation.
