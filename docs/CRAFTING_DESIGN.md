# Crafting and economy — design brief

Interview draft, November 4, 2026. This document organizes confirmed crafting requirements and outstanding decisions. It is not an implemented feature list or a complete recipe specification. The [design decision record](DESIGN_DIRECTION.md) remains the source for user answers and decision status.

## Confirmed requirements

- A deep crafting economy with many recipes and professions (D35).
- Rare resources and gear are important exploration rewards (D32).
- Equipment mainly grants stronger stats, with occasional distinctive special effects (D36).
- Crafting supplies the party and supports substantial NPC commissions, contracts, and trade (D39).
- Gathering and crafting use quick interactions, with depth in materials, recipes, and profession progression (D40).
- Smithing refines ore into ingots and makes metal components used by other crafters (D41).
- The selected hero can learn every profession, each with independent progression (D42).
- Recipes come from trainers, shops, exploration, and quest rewards (D43).
- The strongest equipment mainly comes from crafting with rare adventure-earned materials and recipes (D73).
- Found equipment mixes memorable unique items with regular randomized loot (D74).
- Equipped weapons and armor visibly change the hero (D76).
- The game is primarily a phone/tablet browser experience, with manual combat and 30–60-minute sessions. Stopping almost anywhere should preserve the situation for return (D24–D30).

## Profession catalog

The user explicitly named all nine entries below (D38). Keeping them in the catalog does not settle their skill trees, facilities, or exact outputs.

| Profession | Confirmed identity | Outstanding boundary or decision |
| --- | --- | --- |
| Armor crafting | Makes armor. | Armor categories, slots, recipes, materials, appearance, and upgrades. |
| Weapon crafting | Makes weapons. | Class-specific weapon categories, recipes, quality, and upgrades. |
| Accessory crafting | Makes accessories. | Accessory slots, materials, recipes, and occasional special effects. |
| Cooking | Prepares food. | Ingredients, benefits, recipe structure, and relationship to party supply. Hunger is not a confirmed system. |
| Fishing | Obtains fish. | Locations, quick-interaction rules, yields, tools, and economic uses. A fishing minigame is not assumed. |
| Mining | Obtains mined resources. | Resource types, tools, deposits, yields, depletion, and respawn rules. |
| Smithing | Refines ore into ingots and makes metal components for other crafters. | Material types, recipes, facilities, and exact dependencies. Repair and upgrade roles have not been assigned. |
| Foraging | Picking plants, explicitly specified by the user. | Plants, tools if any, yields, locations, depletion, and respawn rules. |
| Potion crafting | Makes potions. | Ingredients, effects, recipes, quality, and links to gathering professions. |

Separate enchanting, tailoring, and other professions offered as interview examples were not selected. Do not add them to the confirmed scope without a later decision. Do not silently fold smithing into another profession.

## Economic purpose

The confirmed activities are supplying the party and fulfilling NPC commissions/contracts, alongside trade. The exact structure remains open: who issues orders, what makes commissions different from contracts, how goods are valued, what merchants stock, and whether demand changes with settlement events.

No player-to-player economy has been requested. No particular market simulation, merchant budget, reputation system, timed order, travel convoy system, or business ownership feature is established by the phrase deep economy.

Town-to-town fast travel and mounts are confirmed elsewhere (D37), but their costs and interactions with trade are undecided. Do not invent cargo restrictions or delivery timers merely to make travel an economic activity.

## Interaction direction

Keep ordinary gathering and crafting quick. The user chose depth in materials, recipes, and profession progression. Useful design questions are what to gather, which recipe to pursue, how to improve the relevant skill, and what to make for the party or an NPC order.

Detailed timing, facilities, batching, quality, failure, upgrades, material substitution, and tools still require decisions. Quick interaction is not approval for idle-game timers, automated offline production, or a repetitive minigame for each item.

## Profession access and recipe learning

The chosen hero can learn all nine professions, each with its own progression. Learning everything is available, not a story requirement. Do not require limited profession slots or distribute access across AI companions. Exact skill levels, experience sources, trainers, progression rates, and mastery rewards remain open.

Recipes come from trainers, shops, exploration, and quest rewards. The design should allocate useful recipes across all four channels. This does not yet settle any recipe's price, location, skill prerequisite, exclusivity, or alternative sources.

Smithing's confirmed role creates a natural metal-goods sequence: mining supplies ore; smithing produces ingots and metal components; weapon and armor recipes use appropriate inputs to produce finished equipment. Exact dependencies are still to be authored, and not every craft must depend on every other profession. Do not infer equipment durability or a repair requirement from the presence of smithing.

## Relationship to combat and exploration

Gear primarily provides stronger stats, with occasional distinctive effects. Each of the three regular abilities and ultimate has a behavior-changing specialization tree (D75), and temporary awakened forms have distinct moves. Crafting depth should therefore not depend on every item rewriting an ability. Equipped weapons and armor visibly change the hero (D76); exact visual slots, asset coverage, cosmetic overrides, and interaction with awakened appearance remain open.

The strongest gear mainly comes from crafting with rare materials and recipes earned through adventures (D73). Found rewards combine memorable unique items and regular randomized loot (D74). Found equipment still needs meaningful value, but top-tier crafted/found parity is not the selected default. Exact tiers, exceptions, upgrade paths, unique rewards, drop rules, and crafted-item variation remain open. Distinct world danger tiers and bounded ordinary-enemy scaling are confirmed, while material tiers and resource distribution remain to be designed against that world.

Recipes, rare materials, and specialist NPCs can motivate detours; these are proposed integrations rather than a confirmed unlock map. Preserve unusual dungeons, lore, scenic discoveries, secrets, and Easter eggs as rewards alongside resources. Do not reduce all exploration to harvesting.

## Outstanding details

The main profession boundaries, access model, recipe channels, interaction direction, and NPC-facing economic purpose are established. Remaining details include exact profession progression, recipe allocation, resource renewal, workshop access, inventory/storage, item quality, recipe quantities, order variety, economic balance, and crafting's relationship to main-story progression. Do not treat these unknowns as permission to choose major systems silently.

The [campaign treatment](CAMPAIGN_TREATMENT.md) predates this detailed profession catalog. Revise production and playtime estimates as the subsystem becomes concrete. Routine crafting and repeated gathering must not be used as an automatic hour multiplier for the authored campaign.
