import { CharacterClassId, ZoneId } from '../types/game';
import {
  CharacterQuestState,
  CompanionBanterLine,
  PrototypeQuestStage,
  QuestObjectiveView,
} from '../types/quest';

export const PROTOTYPE_QUEST_ID = 'quest_riftscar_cycle';
export const PROTOTYPE_QUEST_TITLE = 'Chronicles of the Eclipse Triad';

export const CANONICAL_HERO_NAMES: Record<CharacterClassId, string> = {
  warrior: 'Brynhildr',
  mage: 'Celestia',
  assassin: 'Akatsuki',
};

/**
 * Returns the two companion classes that accompany the player based on the player's chosen class.
 * - Pick Assassin -> Warrior + Mage are your companions
 * - Pick Mage     -> Warrior + Assassin are your companions
 * - Pick Warrior  -> Mage + Assassin are your companions
 */
export function getCompanionClassesForPlayer(
  playerClassId: CharacterClassId
): [CharacterClassId, CharacterClassId] {
  if (playerClassId === 'assassin') {
    return ['warrior', 'mage'];
  }
  if (playerClassId === 'mage') {
    return ['warrior', 'assassin'];
  }
  return ['mage', 'assassin'];
}

export function createDefaultQuestState(): CharacterQuestState {
  return {
    questId: PROTOTYPE_QUEST_ID,
    title: PROTOTYPE_QUEST_TITLE,
    stage: 'not_started',
    outboundEnemiesKilled: 0,
    outboundEnemiesTotal: 27,
    inboundEnemiesKilled: 0,
    inboundEnemiesTotal: 27,
    ruinsEnemiesKilled: 0,
    ruinsEnemiesTotal: 27,
    sanctumEnemiesKilled: 0,
    sanctumEnemiesTotal: 5,
    completedCount: 0,
  };
}

export function normalizeQuestState(
  raw?: Partial<CharacterQuestState> | null
): CharacterQuestState {
  const def = createDefaultQuestState();
  if (!raw || typeof raw !== 'object') return def;
  return {
    questId: raw.questId ?? def.questId,
    title: raw.title ?? def.title,
    stage: raw.stage ?? def.stage,
    outboundEnemiesKilled: raw.outboundEnemiesKilled ?? 0,
    outboundEnemiesTotal: raw.outboundEnemiesTotal ?? 27,
    inboundEnemiesKilled: raw.inboundEnemiesKilled ?? 0,
    inboundEnemiesTotal: raw.inboundEnemiesTotal ?? 27,
    ruinsEnemiesKilled: raw.ruinsEnemiesKilled ?? 0,
    ruinsEnemiesTotal: raw.ruinsEnemiesTotal ?? 27,
    sanctumEnemiesKilled: raw.sanctumEnemiesKilled ?? 0,
    sanctumEnemiesTotal: raw.sanctumEnemiesTotal ?? 5,
    completedCount: raw.completedCount ?? 0,
  };
}

const BANTER_BY_CLASS: Record<
  CharacterClassId,
  Record<PrototypeQuestStage, string>
> = {
  warrior: {
    not_started:
      'My Dragon-Spear is ready! Let us report to Commander Vael and march as one.',
    clear_stomping_1:
      'Stay behind my shield! We will skewer every fiend in the Stomping Grounds!',
    talk_market_npc:
      'The path is clear! Let us inform Grand Merchant Lyra at Market Crossing.',
    clear_stomping_2:
      'What?! The monsters respawned behind us?! Turn around—my spear still thirsts!',
    return_starting_npc:
      'Twice we purged the Riftscar! Commander Vael must hear of this cycle.',
    talk_sol_market:
      'Artificer Sol at Market Crossing can unseal the North Gate to the Sunken Ruins!',
    clear_sunken_ruins:
      'Ancient guardians ahead! Keep formation along the Sunken Spire causeway!',
    defeat_abyssal_sanctum:
      'The Eclipse Sovereign awaits in the Sanctum! Together, the Triad cannot fall!',
    talk_sage_orin:
      'The Sovereign has fallen! Let us seal the Altar with High Sage Orin!',
    completed:
      'The Eclipse Triad stands victorious! Lead on whenever you want another crusade.',
  },
  mage: {
    not_started:
      'The Starlight Grimoire senses a temporal loop nearby. Commander Vael is waiting for us.',
    clear_stomping_1:
      'I will pull the packs together with Gravity Singularities—strike while they are grouped!',
    talk_market_npc:
      'Strange... the Aether in these wilds didn\'t disperse. Let\'s ask Lyra in Market Crossing.',
    clear_stomping_2:
      'I knew it! The Riftscar is anchored to a spatial loop—the monsters reconstructed themselves!',
    return_starting_npc:
      'The loop is confirmed. Let\'s report our findings to Commander Vael in Starting Town.',
    talk_sol_market:
      'The anchor lies north of Market Crossing! Let\'s speak to Artificer Sol to open the Sunken Ruins.',
    clear_sunken_ruins:
      'These Sunken Astral Ruins are channelling the loop. Purge every construct on the path!',
    defeat_abyssal_sanctum:
      'We\'ve reached the Abyssal Sanctum! Shatter the Eclipse Sovereign to break the curse!',
    talk_sage_orin:
      'Speak with High Sage Orin at the Sanctum Shrine—our three crests will seal the rift!',
    completed:
      'Our three resonance frequencies are in perfect harmony. What a journey!',
  },
  assassin: {
    not_started:
      'Three of us working together? Fine, let\'s hear what Commander Vael wants in Starting Town.',
    clear_stomping_1:
      'I\'ll pepper them with kunai volleys from the flank. Don\'t leave a single one standing!',
    talk_market_npc:
      'That was too easy. Let\'s tell Grand Merchant Lyra in Market Crossing that the road is open.',
    clear_stomping_2:
      'Are you kidding me?! They\'re already back in the Stomping Grounds?! Time for round two!',
    return_starting_npc:
      'Cleared it both ways. Let\'s head back to Starting Town and collect our bounty from Vael.',
    talk_sol_market:
      'So the real culprit is past Market Crossing? Let\'s get Artificer Sol to open that North Portal.',
    clear_sunken_ruins:
      'Sunken Ruins, huh? Watch your step—my shadow-traps will shred anything that ambushes us.',
    defeat_abyssal_sanctum:
      'End of the line! Let\'s take down the Eclipse Sovereign in the Abyssal Sanctum!',
    talk_sage_orin:
      'Talk to High Sage Orin by the altar and let\'s lock this rift down for good!',
    completed:
      'Not bad, partner. The Triad of the Eclipse makes a pretty lethal squad.',
  },
};

export class QuestEngine {
  /**
   * Returns a companion banter line from one of the player's two active companions.
   */
  public static getCompanionBanter(
    stage: PrototypeQuestStage,
    playerClassId: CharacterClassId,
    companionNames?: Partial<Record<CharacterClassId, string>>
  ): CompanionBanterLine {
    const [comp1, comp2] = getCompanionClassesForPlayer(playerClassId);
    // Alternate which companion speaks based on the stage so both companions feel alive in the story
    const useSecond =
      stage === 'talk_market_npc' ||
      stage === 'clear_stomping_2' ||
      stage === 'clear_sunken_ruins' ||
      stage === 'talk_sage_orin';
    const speakerClass = useSecond ? comp2 : comp1;
    const speakerName =
      companionNames?.[speakerClass] ?? CANONICAL_HERO_NAMES[speakerClass];
    return {
      speakerName,
      speakerClass,
      text: BANTER_BY_CLASS[speakerClass][stage],
    };
  }

  /**
   * Computes the current HUD quest tracker view and whether an interactive NPC action button should appear.
   */
  public static getObjectiveView(
    quest: CharacterQuestState,
    currentZone: ZoneId,
    nearbyNpcId: string | null,
    playerClassId: CharacterClassId = 'warrior',
    companionNames?: Partial<Record<CharacterClassId, string>>
  ): QuestObjectiveView {
    const banter = QuestEngine.getCompanionBanter(
      quest.stage,
      playerClassId,
      companionNames
    );

    switch (quest.stage) {
      case 'not_started': {
        const canTalk =
          currentZone === 'starting_town' && nearbyNpcId === 'npc_commander_vael';
        return {
          questTitle: quest.title,
          chapterTitle: 'ACT I // THE RIFTSCAR CYCLE',
          stage: quest.stage,
          stepNumber: 1,
          totalSteps: 9,
          objectiveTitle: 'Speak with Commander Vael in Starting Town',
          objectiveHint:
            currentZone === 'starting_town'
              ? 'Walk north with your two companions to speak with Commander Vael.'
              : 'Return to Starting Town to speak with Commander Vael.',
          progressText: '0 / 1 Spoken',
          isComplete: false,
          targetZone: 'starting_town',
          targetNpcId: 'npc_commander_vael',
          actionButtonLabel: canTalk
            ? '✦ Accept Quest from Commander Vael [F / TAP]'
            : null,
          companionBanter: banter,
        };
      }

      case 'clear_stomping_1': {
        const killed = quest.outboundEnemiesKilled;
        const total = Math.max(1, quest.outboundEnemiesTotal);
        return {
          questTitle: quest.title,
          chapterTitle: 'ACT I // THE RIFTSCAR CYCLE',
          stage: quest.stage,
          stepNumber: 2,
          totalSteps: 9,
          objectiveTitle: 'Clear ALL Enemies in the Stomping Grounds',
          objectiveHint:
            currentZone === 'starting_town'
              ? 'Step into the North Rift Portal with your companions to enter Stomping Grounds.'
              : currentZone === 'stomping_grounds'
                ? 'Fight alongside your companions and defeat every monster along the path!'
                : 'You must defeat all monsters in the Stomping Grounds first!',
          progressText: `${killed} / ${total} Purged`,
          isComplete: false,
          targetZone: 'stomping_grounds',
          targetNpcId: null,
          actionButtonLabel: null,
          companionBanter: banter,
        };
      }

      case 'talk_market_npc': {
        const canTalk =
          currentZone === 'market_crossing' && nearbyNpcId === 'npc_merchant_lyra';
        return {
          questTitle: quest.title,
          chapterTitle: 'ACT I // THE RIFTSCAR CYCLE',
          stage: quest.stage,
          stepNumber: 3,
          totalSteps: 9,
          objectiveTitle: 'Tell Grand Merchant Lyra at Market Crossing It Is Clear',
          objectiveHint:
            currentZone === 'stomping_grounds'
              ? 'Stomping Grounds cleared! Enter the North Portal into Market Crossing.'
              : currentZone === 'market_crossing'
                ? 'Approach Grand Merchant Lyra in the plaza to report that the path is clear.'
                : 'Travel through Stomping Grounds to Market Crossing.',
          progressText: 'Stomping Grounds Cleared (1/1)',
          isComplete: false,
          targetZone: 'market_crossing',
          targetNpcId: 'npc_merchant_lyra',
          actionButtonLabel: canTalk
            ? '💬 Tell Lyra "The Stomping Grounds Are Clear!" [F / TAP]'
            : null,
          companionBanter: banter,
        };
      }

      case 'clear_stomping_2': {
        const killed = quest.inboundEnemiesKilled;
        const total = Math.max(1, quest.inboundEnemiesTotal);
        return {
          questTitle: quest.title,
          chapterTitle: 'ACT I // THE RIFTSCAR CYCLE',
          stage: quest.stage,
          stepNumber: 4,
          totalSteps: 9,
          objectiveTitle: 'Monsters Are Back! Clear the Stomping Grounds Again',
          objectiveHint:
            currentZone === 'market_crossing'
              ? 'Lyra says the monsters are back! Enter the South Portal to return to Stomping Grounds.'
              : currentZone === 'stomping_grounds'
                ? 'She was right—the monsters respawned! Clear every enemy on your way back to Starting Town!'
                : 'Re-enter Stomping Grounds and clear all respawned monsters!',
          progressText: `${killed} / ${total} Purged (Return Trip)`,
          isComplete: false,
          targetZone: 'stomping_grounds',
          targetNpcId: null,
          actionButtonLabel: null,
          companionBanter: banter,
        };
      }

      case 'return_starting_npc': {
        const canTurnIn =
          currentZone === 'starting_town' && nearbyNpcId === 'npc_commander_vael';
        return {
          questTitle: quest.title,
          chapterTitle: 'ACT I // THE RIFTSCAR CYCLE',
          stage: quest.stage,
          stepNumber: 5,
          totalSteps: 9,
          objectiveTitle: 'Return to Starting Town & Report to Commander Vael',
          objectiveHint:
            currentZone === 'stomping_grounds'
              ? 'All respawned monsters purged! Enter the South Portal back to Starting Town.'
              : currentZone === 'starting_town'
                ? 'Speak with Commander Vael to finish Act I and unlock the Sunken Ruins!'
                : 'Return to Commander Vael in Starting Town.',
          progressText: 'Ready to Report!',
          isComplete: false,
          targetZone: 'starting_town',
          targetNpcId: 'npc_commander_vael',
          actionButtonLabel: canTurnIn
            ? '★ Complete Act I at Commander Vael [F / TAP]'
            : null,
          companionBanter: banter,
        };
      }

      case 'talk_sol_market': {
        const canTalk =
          currentZone === 'market_crossing' && nearbyNpcId === 'npc_artificer_sol';
        return {
          questTitle: quest.title,
          chapterTitle: 'ACT II // SUNKEN ASTRAL RUINS',
          stage: quest.stage,
          stepNumber: 6,
          totalSteps: 9,
          objectiveTitle: 'Speak with Artificer Sol in Market Crossing',
          objectiveHint:
            currentZone === 'market_crossing'
              ? 'Speak with Artificer Sol (east side of Market Crossing) to unseal the North Ruins Portal.'
              : 'Traverse Stomping Grounds back to Market Crossing to meet Artificer Sol.',
          progressText: 'Unseal Sunken Ruins',
          isComplete: false,
          targetZone: 'market_crossing',
          targetNpcId: 'npc_artificer_sol',
          actionButtonLabel: canTalk
            ? '🔮 Unseal the Sunken Ruins with Artificer Sol [F / TAP]'
            : null,
          companionBanter: banter,
        };
      }

      case 'clear_sunken_ruins': {
        const killed = quest.ruinsEnemiesKilled ?? 0;
        const total = Math.max(1, quest.ruinsEnemiesTotal ?? 27);
        return {
          questTitle: quest.title,
          chapterTitle: 'ACT II // SUNKEN ASTRAL RUINS',
          stage: quest.stage,
          stepNumber: 7,
          totalSteps: 9,
          objectiveTitle: 'Purge All Guardians in the Sunken Astral Ruins',
          objectiveHint:
            currentZone === 'market_crossing'
              ? 'Enter the North Portal in Market Crossing to enter the Sunken Astral Ruins!'
              : currentZone === 'sunken_ruins'
                ? 'Battle through the procedural Sunken Ruins path with your two companions!'
                : 'Head to Market Crossing North Gate to enter the Sunken Astral Ruins.',
          progressText: `${killed} / ${total} Ruins Guardians`,
          isComplete: false,
          targetZone: 'sunken_ruins',
          targetNpcId: null,
          actionButtonLabel: null,
          companionBanter: banter,
        };
      }

      case 'defeat_abyssal_sanctum': {
        const killed = quest.sanctumEnemiesKilled ?? 0;
        const total = Math.max(1, quest.sanctumEnemiesTotal ?? 5);
        return {
          questTitle: quest.title,
          chapterTitle: 'ACT III // THE ECLIPSE SANCTUM',
          stage: quest.stage,
          stepNumber: 8,
          totalSteps: 9,
          objectiveTitle: 'Defeat the Eclipse Sovereign in the Abyssal Sanctum',
          objectiveHint:
            currentZone === 'sunken_ruins'
              ? 'Sunken Ruins cleared! Step through the North Portal into the Abyssal Sanctum!'
              : currentZone === 'abyssal_sanctum'
                ? 'Unite the Triad and vanquish the Eclipse Sovereign & Royal Guard!'
                : 'Travel through the Sunken Ruins into the Abyssal Sanctum.',
          progressText: `${killed} / ${total} Sanctum Bosses`,
          isComplete: false,
          targetZone: 'abyssal_sanctum',
          targetNpcId: null,
          actionButtonLabel: null,
          companionBanter: banter,
        };
      }

      case 'talk_sage_orin': {
        const canTalk =
          currentZone === 'abyssal_sanctum' && nearbyNpcId === 'npc_sage_orin';
        return {
          questTitle: quest.title,
          chapterTitle: 'ACT III // THE ECLIPSE SANCTUM',
          stage: quest.stage,
          stepNumber: 9,
          totalSteps: 9,
          objectiveTitle: 'Seal the Eclipse Rift with High Sage Orin',
          objectiveHint:
            'Speak with High Sage Orin at the Abyssal Sanctum Altar to complete the Triad Storyline!',
          progressText: 'Sovereign Defeated!',
          isComplete: false,
          targetZone: 'abyssal_sanctum',
          targetNpcId: 'npc_sage_orin',
          actionButtonLabel: canTalk
            ? '★ Seal the Eclipse Rift & Claim Final Reward [F / TAP]'
            : null,
          companionBanter: banter,
        };
      }

      case 'completed': {
        const canRestart =
          (currentZone === 'starting_town' && nearbyNpcId === 'npc_commander_vael') ||
          (currentZone === 'abyssal_sanctum' && nearbyNpcId === 'npc_sage_orin');
        return {
          questTitle: quest.title,
          chapterTitle: 'EPILOGUE // TRIAD OF THE ECLIPSE',
          stage: quest.stage,
          stepNumber: 9,
          totalSteps: 9,
          objectiveTitle: 'Storyline Complete: Triad of the Eclipse',
          objectiveHint:
            'All 5 zones unlocked! Speak to Commander Vael or High Sage Orin anytime to start a New Campaign Cycle.',
          progressText: `★ Completed (${quest.completedCount}x)`,
          isComplete: true,
          targetZone: null,
          targetNpcId: null,
          actionButtonLabel: canRestart
            ? '↻ Begin New Campaign Cycle [F / TAP]'
            : null,
          companionBanter: banter,
        };
      }
    }
  }

  /**
   * Returns context-aware quest dialogue for an NPC based on the active quest stage.
   */
  public static getContextualNpcDialogue(
    quest: CharacterQuestState,
    npcId: string,
    fallbackDialogue: string
  ): string {
    if (npcId === 'npc_commander_vael') {
      switch (quest.stage) {
        case 'not_started':
          return 'Three heroes of the Eclipse—Warrior, Mage, and Assassin—standing together at last! Enter the North Portal into the Stomping Grounds, clear ALL enemies along the path, and tell Grand Merchant Lyra at Market Crossing that the route is clear!';
        case 'clear_stomping_1':
          return 'Lead your two companions through the North Rift Portal! Clear every enemy in the Stomping Grounds, then report to Grand Merchant Lyra at Market Crossing.';
        case 'talk_market_npc':
          return 'You cleared the outbound path! Now head through the far portal to Market Crossing and let Grand Merchant Lyra know it is safe.';
        case 'clear_stomping_2':
          return 'Lyra says the monsters came right back in the Stomping Grounds?! Go back into the portal with your companions and purge every last one of them!';
        case 'return_starting_npc':
          return 'You cleared the Stomping Grounds there AND back?! Then the Riftscar is being fed by an anchor beyond Market Crossing! Take this Vanguard Bounty, and go speak with Artificer Sol in Market Crossing to unseal the Sunken Astral Ruins!';
        default:
          return 'The Triad of the Eclipse is our realm\'s greatest hope! Head through Market Crossing into the Sunken Ruins and Abyssal Sanctum!';
      }
    }

    if (npcId === 'npc_merchant_lyra') {
      switch (quest.stage) {
        case 'clear_stomping_1':
          return 'Wait—you made it here, but my sensors still show monsters alive in the Stomping Grounds! Go back and clear ALL of them first!';
        case 'talk_market_npc':
          return 'What?! You say the Stomping Grounds are clear? NO IT\'S NOT! Look at the Rift readings—go back toward Starting Town right now, you\'ll see the monsters are back! Clear them all again!';
        case 'clear_stomping_2':
          return 'Go back through the South Portal toward Starting Town—you\'ll see the monsters are back in the Stomping Grounds! Clear them all out and report back to Commander Vael!';
        case 'return_starting_npc':
          return 'You actually cleared them a second time! Hurry back through the portal to Starting Town and tell Commander Vael what happened!';
        default:
          return fallbackDialogue;
      }
    }

    if (npcId === 'npc_artificer_sol') {
      switch (quest.stage) {
        case 'talk_sol_market':
          return 'So Commander Vael sent the Triad! The Stomping Grounds keep regenerating because of the Eclipse Anchor inside the Sunken Astral Ruins. Stand back—I am unsealing the North Portal for you three right now!';
        case 'clear_sunken_ruins':
          return 'The North Gate is open! Step through into the Sunken Astral Ruins and purge every guardian along the causeway!';
        default:
          return fallbackDialogue;
      }
    }

    if (npcId === 'npc_sage_orin') {
      switch (quest.stage) {
        case 'defeat_abyssal_sanctum':
          return 'Heroes of the Triad! Vanquish the Eclipse Sovereign and its Royal Guard in this Sanctum so we can seal the Rift!';
        case 'talk_sage_orin':
          return 'By Spear, Grimoire, and Shadow-Kunai, the Eclipse Sovereign has fallen! Place your weapons upon the Altar to seal the Riftscar and claim the Sovereign\'s Mythic Treasury!';
        default:
          return 'Peace returns to Aethelgard thanks to the three of you. Speak with me or Commander Vael anytime to embark on a new cycle!';
      }
    }

    return fallbackDialogue;
  }

  /**
   * Called when the player enters a combat zone (Stomping Grounds, Sunken Ruins, or Abyssal Sanctum).
   */
  public static onEnterCombatZone(
    quest: CharacterQuestState,
    zoneId: ZoneId,
    totalEnemiesSpawned: number
  ): { bannerTitle?: string; bannerSubtitle?: string } {
    if (zoneId === 'stomping_grounds') {
      if (quest.stage === 'clear_stomping_1') {
        quest.outboundEnemiesKilled = 0;
        quest.outboundEnemiesTotal = totalEnemiesSpawned;
        return {
          bannerTitle: 'ACT I // CLEAR THE STOMPING GROUNDS',
          bannerSubtitle: `Fight alongside your 2 companions! Defeat all ${totalEnemiesSpawned} monsters, then report to Market Crossing.`,
        };
      }
      if (quest.stage === 'clear_stomping_2') {
        quest.inboundEnemiesKilled = 0;
        quest.inboundEnemiesTotal = totalEnemiesSpawned;
        return {
          bannerTitle: 'LYRA WAS RIGHT — THE MONSTERS ARE BACK!',
          bannerSubtitle: `Purge all ${totalEnemiesSpawned} respawned monsters in the Stomping Grounds and return to Commander Vael!`,
        };
      }
    } else if (zoneId === 'sunken_ruins' && quest.stage === 'clear_sunken_ruins') {
      quest.ruinsEnemiesKilled = 0;
      quest.ruinsEnemiesTotal = totalEnemiesSpawned;
      return {
        bannerTitle: 'ACT II // SUNKEN ASTRAL RUINS',
        bannerSubtitle: `Purge all ${totalEnemiesSpawned} Ancient Guardians along the procedural temple path!`,
      };
    } else if (zoneId === 'abyssal_sanctum' && quest.stage === 'defeat_abyssal_sanctum') {
      quest.sanctumEnemiesKilled = 0;
      quest.sanctumEnemiesTotal = totalEnemiesSpawned;
      return {
        bannerTitle: 'ACT III // THE ABYSSAL SANCTUM',
        bannerSubtitle: 'Vanquish the Eclipse Sovereign & Royal Guard alongside your companions!',
      };
    }

    return {};
  }

  /**
   * Legacy alias for Stomping Grounds entry.
   */
  public static onEnterStompingGrounds(
    quest: CharacterQuestState,
    totalEnemiesSpawned: number
  ): { bannerTitle?: string; bannerSubtitle?: string } {
    return QuestEngine.onEnterCombatZone(quest, 'stomping_grounds', totalEnemiesSpawned);
  }

  /**
   * Called whenever an enemy is defeated in any combat zone.
   */
  public static onCombatZoneEnemyCountChanged(
    quest: CharacterQuestState,
    zoneId: ZoneId,
    remainingEnemies: number
  ): {
    stageAdvanced: boolean;
    newStage: PrototypeQuestStage;
    bannerTitle?: string;
    bannerSubtitle?: string;
  } {
    if (zoneId === 'stomping_grounds') {
      if (quest.stage === 'clear_stomping_1') {
        quest.outboundEnemiesKilled = Math.max(
          0,
          quest.outboundEnemiesTotal - remainingEnemies
        );
        if (remainingEnemies === 0) {
          quest.stage = 'talk_market_npc';
          return {
            stageAdvanced: true,
            newStage: 'talk_market_npc',
            bannerTitle: 'STOMPING GROUNDS CLEARED!',
            bannerSubtitle:
              'Quest Updated: Enter the Market Crossing Portal and tell Grand Merchant Lyra it is clear!',
          };
        }
      } else if (quest.stage === 'clear_stomping_2') {
        quest.inboundEnemiesKilled = Math.max(
          0,
          quest.inboundEnemiesTotal - remainingEnemies
        );
        if (remainingEnemies === 0) {
          quest.stage = 'return_starting_npc';
          return {
            stageAdvanced: true,
            newStage: 'return_starting_npc',
            bannerTitle: 'RESPAWNED HORDE PURGED!',
            bannerSubtitle:
              'Quest Updated: Return through the South Portal to Starting Town and finish Act I at Commander Vael!',
          };
        }
      }
    } else if (zoneId === 'sunken_ruins' && quest.stage === 'clear_sunken_ruins') {
      const total = quest.ruinsEnemiesTotal ?? 27;
      quest.ruinsEnemiesKilled = Math.max(0, total - remainingEnemies);
      if (remainingEnemies === 0) {
        quest.stage = 'defeat_abyssal_sanctum';
        return {
          stageAdvanced: true,
          newStage: 'defeat_abyssal_sanctum',
          bannerTitle: 'SUNKEN RUINS PURGED!',
          bannerSubtitle:
            'Quest Updated: Enter the North Portal into the Abyssal Sanctum to confront the Eclipse Sovereign!',
        };
      }
    } else if (zoneId === 'abyssal_sanctum' && quest.stage === 'defeat_abyssal_sanctum') {
      const total = quest.sanctumEnemiesTotal ?? 5;
      quest.sanctumEnemiesKilled = Math.max(0, total - remainingEnemies);
      if (remainingEnemies === 0) {
        quest.stage = 'talk_sage_orin';
        return {
          stageAdvanced: true,
          newStage: 'talk_sage_orin',
          bannerTitle: 'ECLIPSE SOVEREIGN VANQUISHED!',
          bannerSubtitle:
            'Quest Updated: Speak with High Sage Orin at the Sanctum Altar to seal the Rift!',
        };
      }
    }

    return { stageAdvanced: false, newStage: quest.stage };
  }

  /**
   * Legacy alias for Stomping Grounds enemy count change.
   */
  public static onStompingGroundsEnemyCountChanged(
    quest: CharacterQuestState,
    remainingEnemies: number
  ): {
    stageAdvanced: boolean;
    newStage: PrototypeQuestStage;
    bannerTitle?: string;
    bannerSubtitle?: string;
  } {
    return QuestEngine.onCombatZoneEnemyCountChanged(
      quest,
      'stomping_grounds',
      remainingEnemies
    );
  }

  /**
   * Advances the quest when the player interacts with the target NPC.
   */
  public static interactWithNpc(
    quest: CharacterQuestState,
    npcId: string
  ): {
    advanced: boolean;
    eventType:
      | 'accepted'
      | 'market_twist'
      | 'act1_completed'
      | 'ruins_unsealed'
      | 'completed'
      | 'restarted'
      | null;
    bannerTitle?: string;
    bannerSubtitle?: string;
  } {
    if (quest.stage === 'not_started' && npcId === 'npc_commander_vael') {
      quest.stage = 'clear_stomping_1';
      quest.outboundEnemiesKilled = 0;
      return {
        advanced: true,
        eventType: 'accepted',
        bannerTitle: 'ACT I ACCEPTED // THE RIFTSCAR CYCLE',
        bannerSubtitle:
          'Enter Stomping Grounds with your 2 companions, clear all monsters, and report to Grand Merchant Lyra!',
      };
    }

    if (quest.stage === 'talk_market_npc' && npcId === 'npc_merchant_lyra') {
      quest.stage = 'clear_stomping_2';
      quest.inboundEnemiesKilled = 0;
      return {
        advanced: true,
        eventType: 'market_twist',
        bannerTitle: 'LYRA: "NO IT\'S NOT CLEAR! GO BACK!"',
        bannerSubtitle:
          'The monsters have already returned in Stomping Grounds! Go back and clear them all again!',
      };
    }

    if (quest.stage === 'return_starting_npc' && npcId === 'npc_commander_vael') {
      quest.stage = 'talk_sol_market';
      quest.completedCount += 1;
      return {
        advanced: true,
        eventType: 'act1_completed',
        bannerTitle: '★ ACT I COMPLETE // ACT II UNLOCKED ★',
        bannerSubtitle:
          'Awarded Bounty! Now travel to Market Crossing and speak with Artificer Sol to unseal the Sunken Ruins!',
      };
    }

    if (quest.stage === 'talk_sol_market' && npcId === 'npc_artificer_sol') {
      quest.stage = 'clear_sunken_ruins';
      quest.ruinsEnemiesKilled = 0;
      return {
        advanced: true,
        eventType: 'ruins_unsealed',
        bannerTitle: 'ACT II // SUNKEN RUINS UNSEALED',
        bannerSubtitle:
          'Enter the North Portal in Market Crossing with your companions to purge the Sunken Astral Ruins!',
      };
    }

    if (quest.stage === 'talk_sage_orin' && npcId === 'npc_sage_orin') {
      quest.stage = 'completed';
      quest.completedCount += 1;
      return {
        advanced: true,
        eventType: 'completed',
        bannerTitle: '★ STORYLINE COMPLETE // TRIAD OF THE ECLIPSE ★',
        bannerSubtitle:
          'The Eclipse Rift is sealed! Awarded +1000 XP, +1200 Gold, +100 Crystals & Mythic Sovereign Relic!',
      };
    }

    if (
      quest.stage === 'completed' &&
      (npcId === 'npc_commander_vael' || npcId === 'npc_sage_orin')
    ) {
      quest.stage = 'clear_stomping_1';
      quest.outboundEnemiesKilled = 0;
      quest.inboundEnemiesKilled = 0;
      quest.ruinsEnemiesKilled = 0;
      quest.sanctumEnemiesKilled = 0;
      return {
        advanced: true,
        eventType: 'restarted',
        bannerTitle: 'NEW CAMPAIGN CYCLE STARTED',
        bannerSubtitle: 'Lead the Triad through the Stomping Grounds once more!',
      };
    }

    return { advanced: false, eventType: null };
  }
}
