import { CharacterClassId, ZoneId } from './game';

export type PrototypeQuestStage =
  // ACT I: The Riftscar Cycle (Starting Town <-> Stomping Grounds <-> Market Crossing)
  | 'not_started'               // Step 1: Talk to Commander Vael in Starting Town with your 2 companions
  | 'clear_stomping_1'          // Step 2: Enter Stomping Grounds & clear all enemies
  | 'talk_market_npc'           // Step 3: Arrive at Market Crossing & tell Grand Merchant Lyra it's clear
  | 'clear_stomping_2'          // Step 4: Lyra says "No it's not! Go back!" — Clear respawned enemies in Stomping Grounds
  | 'return_starting_npc'       // Step 5: Finish Act I report at Commander Vael in Starting Town
  // ACT II: Shadows of the Sunken Spire (Market Crossing -> Sunken Astral Ruins)
  | 'talk_sol_market'           // Step 6: Meet Artificer Sol in Market Crossing to unseal the North Ruins Portal
  | 'clear_sunken_ruins'        // Step 7: Traverse & clear all guardians in the procedural Sunken Astral Ruins
  // ACT III: The Sovereign of the Eclipse (Abyssal Sanctum Summit)
  | 'defeat_abyssal_sanctum'    // Step 8: Enter the Abyssal Sanctum & defeat the Eclipse Sovereign Boss
  | 'talk_sage_orin'            // Step 9: Speak with High Sage Orin at the Sanctum Altar to seal the Eclipse Rift
  | 'completed';                // Storyline completed!

export interface CharacterQuestState {
  questId: string;
  title: string;
  stage: PrototypeQuestStage;
  outboundEnemiesKilled: number;
  outboundEnemiesTotal: number;
  inboundEnemiesKilled: number;
  inboundEnemiesTotal: number;
  ruinsEnemiesKilled?: number;
  ruinsEnemiesTotal?: number;
  sanctumEnemiesKilled?: number;
  sanctumEnemiesTotal?: number;
  completedCount: number;
}

export interface CompanionBanterLine {
  speakerName: string;
  speakerClass: CharacterClassId;
  text: string;
}

export interface QuestObjectiveView {
  questTitle: string;
  chapterTitle: string;
  stage: PrototypeQuestStage;
  stepNumber: number;
  totalSteps: number;
  objectiveTitle: string;
  objectiveHint: string;
  progressText: string;
  isComplete: boolean;
  targetZone: ZoneId | null;
  targetNpcId: string | null;
  actionButtonLabel: string | null;
  companionBanter: CompanionBanterLine | null;
}
