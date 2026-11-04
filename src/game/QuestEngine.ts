import { ZoneId } from '../types/game';
import {
  CharacterQuestState,
  PrototypeQuestStage,
  QuestObjectiveView,
} from '../types/quest';

export const PROTOTYPE_QUEST_ID = 'quest_riftscar_cycle';
export const PROTOTYPE_QUEST_TITLE = 'Chronicle I: The Riftscar Cycle';

export function createDefaultQuestState(): CharacterQuestState {
  return {
    questId: PROTOTYPE_QUEST_ID,
    title: PROTOTYPE_QUEST_TITLE,
    stage: 'not_started',
    outboundEnemiesKilled: 0,
    outboundEnemiesTotal: 27,
    inboundEnemiesKilled: 0,
    inboundEnemiesTotal: 27,
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
    completedCount: raw.completedCount ?? 0,
  };
}

export class QuestEngine {
  /**
   * Computes the current HUD quest tracker view and whether an interactive NPC action button should appear.
   */
  public static getObjectiveView(
    quest: CharacterQuestState,
    currentZone: ZoneId,
    nearbyNpcId: string | null
  ): QuestObjectiveView {
    switch (quest.stage) {
      case 'not_started': {
        const canTalk =
          currentZone === 'starting_town' && nearbyNpcId === 'npc_commander_vael';
        return {
          questTitle: quest.title,
          stage: quest.stage,
          stepNumber: 1,
          totalSteps: 5,
          objectiveTitle: 'Speak with Commander Vael in Starting Town',
          objectiveHint:
            currentZone === 'starting_town'
              ? 'Walk north toward the portal gate to speak with Commander Vael.'
              : 'Return to Starting Town to speak with Commander Vael.',
          progressText: '0 / 1 Spoken',
          isComplete: false,
          targetZone: 'starting_town',
          targetNpcId: 'npc_commander_vael',
          actionButtonLabel: canTalk
            ? '✦ Accept Quest from Commander Vael [E / TAP]'
            : null,
        };
      }

      case 'clear_stomping_1': {
        const killed = quest.outboundEnemiesKilled;
        const total = Math.max(1, quest.outboundEnemiesTotal);
        return {
          questTitle: quest.title,
          stage: quest.stage,
          stepNumber: 2,
          totalSteps: 5,
          objectiveTitle: 'Clear ALL Enemies in the Stomping Grounds',
          objectiveHint:
            currentZone === 'starting_town'
              ? 'Step into the North Rift Portal to enter the Stomping Grounds.'
              : currentZone === 'stomping_grounds'
                ? 'Defeat every monster along the procedural path to Market Crossing!'
                : 'You must defeat all monsters in the Stomping Grounds first!',
          progressText: `${killed} / ${total} Purged`,
          isComplete: false,
          targetZone: 'stomping_grounds',
          targetNpcId: null,
          actionButtonLabel: null,
        };
      }

      case 'talk_market_npc': {
        const canTalk =
          currentZone === 'market_crossing' && nearbyNpcId === 'npc_merchant_lyra';
        return {
          questTitle: quest.title,
          stage: quest.stage,
          stepNumber: 3,
          totalSteps: 5,
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
            ? '💬 Tell Lyra "The Stomping Grounds Are Clear!" [E / TAP]'
            : null,
        };
      }

      case 'clear_stomping_2': {
        const killed = quest.inboundEnemiesKilled;
        const total = Math.max(1, quest.inboundEnemiesTotal);
        return {
          questTitle: quest.title,
          stage: quest.stage,
          stepNumber: 4,
          totalSteps: 5,
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
        };
      }

      case 'return_starting_npc': {
        const canTurnIn =
          currentZone === 'starting_town' && nearbyNpcId === 'npc_commander_vael';
        return {
          questTitle: quest.title,
          stage: quest.stage,
          stepNumber: 5,
          totalSteps: 5,
          objectiveTitle: 'Return to Starting Town & Finish Quest at Commander Vael',
          objectiveHint:
            currentZone === 'stomping_grounds'
              ? 'All respawned monsters purged! Enter the South Portal back to Starting Town.'
              : currentZone === 'starting_town'
                ? 'Speak with Commander Vael to complete the quest and claim your reward!'
                : 'Return to Commander Vael in Starting Town.',
          progressText: 'Ready to Turn In!',
          isComplete: false,
          targetZone: 'starting_town',
          targetNpcId: 'npc_commander_vael',
          actionButtonLabel: canTurnIn
            ? '★ Finish Quest with Commander Vael [E / TAP]'
            : null,
        };
      }

      case 'completed': {
        const canRestart =
          currentZone === 'starting_town' && nearbyNpcId === 'npc_commander_vael';
        return {
          questTitle: quest.title,
          stage: quest.stage,
          stepNumber: 5,
          totalSteps: 5,
          objectiveTitle: 'Quest Completed: The Riftscar Cycle',
          objectiveHint:
            'You proved the Riftscar regeneration cycle! Speak to Commander Vael anytime to start a new patrol.',
          progressText: `★ Completed (${quest.completedCount}x)`,
          isComplete: true,
          targetZone: null,
          targetNpcId: null,
          actionButtonLabel: canRestart
            ? '↻ Start New Riftscar Patrol Quest [E / TAP]'
            : null,
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
          return 'Pioneer! The Stomping Grounds are crawling with Rift fiends. Head through the North Portal, clear ALL enemies along the path, and tell Grand Merchant Lyra in Market Crossing that the route is clear!';
        case 'clear_stomping_1':
          return 'Step through the North Rift Portal right behind me! Clear every enemy in the Stomping Grounds, then report to Grand Merchant Lyra at Market Crossing.';
        case 'talk_market_npc':
          return 'You cleared the outbound path! Now head through the far portal to Market Crossing and let Grand Merchant Lyra know it is safe.';
        case 'clear_stomping_2':
          return 'Lyra says the monsters came right back in the Stomping Grounds?! Go back into the portal and purge every last one of them!';
        case 'return_starting_npc':
          return 'You cleared the Stomping Grounds there AND back?! So the Riftscar truly rebuilds its path and monsters every time! Here is your Mythic Vanguard Bounty!';
        case 'completed':
          return 'Magnificent work, Pioneer! Whenever you wish to run the Riftscar Patrol quest again for another bounty, just say the word.';
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

    return fallbackDialogue;
  }

  /**
   * Called when the player enters the Stomping Grounds portal.
   */
  public static onEnterStompingGrounds(
    quest: CharacterQuestState,
    totalEnemiesSpawned: number
  ): { bannerTitle?: string; bannerSubtitle?: string } {
    if (quest.stage === 'clear_stomping_1') {
      quest.outboundEnemiesKilled = 0;
      quest.outboundEnemiesTotal = totalEnemiesSpawned;
      return {
        bannerTitle: 'QUEST OBJECTIVE // CLEAR STOMPING GROUNDS',
        bannerSubtitle: `Defeat all ${totalEnemiesSpawned} monsters along the path, then report to Market Crossing!`,
      };
    }

    if (quest.stage === 'clear_stomping_2') {
      quest.inboundEnemiesKilled = 0;
      quest.inboundEnemiesTotal = totalEnemiesSpawned;
      return {
        bannerTitle: 'LYRA WAS RIGHT — THE MONSTERS ARE BACK!',
        bannerSubtitle: `Purge all ${totalEnemiesSpawned} respawned monsters in the Stomping Grounds and return to Starting Town!`,
      };
    }

    return {};
  }

  /**
   * Called whenever an enemy is defeated in the Stomping Grounds.
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
            'Quest Updated: Return through the Portal to Starting Town and finish the quest at Commander Vael!',
        };
      }
    }

    return { stageAdvanced: false, newStage: quest.stage };
  }

  /**
   * Advances the quest when the player interacts with the target NPC in town or market.
   */
  public static interactWithNpc(
    quest: CharacterQuestState,
    npcId: string
  ): {
    advanced: boolean;
    eventType: 'accepted' | 'market_twist' | 'completed' | 'restarted' | null;
    bannerTitle?: string;
    bannerSubtitle?: string;
  } {
    if (quest.stage === 'not_started' && npcId === 'npc_commander_vael') {
      quest.stage = 'clear_stomping_1';
      quest.outboundEnemiesKilled = 0;
      return {
        advanced: true,
        eventType: 'accepted',
        bannerTitle: 'QUEST ACCEPTED // THE RIFTSCAR CYCLE',
        bannerSubtitle:
          'Enter Stomping Grounds, clear all monsters, and report to Grand Merchant Lyra at Market Crossing!',
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
      quest.stage = 'completed';
      quest.completedCount += 1;
      return {
        advanced: true,
        eventType: 'completed',
        bannerTitle: '★ QUEST COMPLETE // THE RIFTSCAR CYCLE ★',
        bannerSubtitle:
          'Awarded +500 XP, +600 Gold, +50 Aether Crystals & Mythic Vanguard Relic!',
      };
    }

    if (quest.stage === 'completed' && npcId === 'npc_commander_vael') {
      quest.stage = 'clear_stomping_1';
      quest.outboundEnemiesKilled = 0;
      quest.inboundEnemiesKilled = 0;
      return {
        advanced: true,
        eventType: 'restarted',
        bannerTitle: 'NEW PATROL CYCLE STARTED',
        bannerSubtitle: 'Clear the Stomping Grounds and report to Market Crossing!',
      };
    }

    return { advanced: false, eventType: null };
  }
}
