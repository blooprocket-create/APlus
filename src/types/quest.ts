import { ZoneId } from './game';

export type PrototypeQuestStage =
  | 'not_started'               // Step 0: Talk to Commander Vael in Starting Town to accept quest
  | 'clear_stomping_1'          // Step 1: Enter Stomping Grounds & clear all enemies
  | 'talk_market_npc'           // Step 2: Arrive at Market Crossing & tell Grand Merchant Lyra it's clear
  | 'clear_stomping_2'          // Step 3: Go back into Stomping Grounds (monsters are back!) & clear all enemies again
  | 'return_starting_npc'       // Step 4: Return to Starting Town & finish quest at Commander Vael
  | 'completed';                // Quest finished!

export interface CharacterQuestState {
  questId: string;
  title: string;
  stage: PrototypeQuestStage;
  outboundEnemiesKilled: number;
  outboundEnemiesTotal: number;
  inboundEnemiesKilled: number;
  inboundEnemiesTotal: number;
  completedCount: number;
}

export interface QuestObjectiveView {
  questTitle: string;
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
}
