// Shared TypeScript types for all Supabase Edge Functions

export type SubscriptionTier = 'free' | 'soul_pass' | 'eternal';
export type EidolonMood = 'calm' | 'excited' | 'anxious' | 'tired' | 'focused' | 'melancholic';
export type MemoryType = 'episodic' | 'semantic' | 'procedural';
export type DungeonTheme = 'forest' | 'cave' | 'ruins' | 'void' | 'ocean_depth' | 'sky_citadel' | 'shadow_realm' | 'crystal_maze';
export type RunStatus = 'in_progress' | 'completed' | 'failed' | 'abandoned';
export type EmotionType = 'happy' | 'neutral' | 'anxious' | 'tired' | 'energized' | 'sad' | 'focused' | 'excited';
export type AiModel = 'claude-sonnet-4-5' | 'claude-haiku-4-5' | 'gpt-4o-mini' | 'local';

export interface PersonalityProfile {
  openness: number;         // 0-100
  conscientiousness: number;
  extraversion: number;
  agreeableness: number;
  neuroticism: number;
}

export interface EidolonProfile {
  id: string;
  userId: string;
  name: string;
  level: number;
  xp: number;
  personality: PersonalityProfile;
  currentMood: EidolonMood;
  autoStrategy: 'aggressive' | 'balanced' | 'defensive' | 'explorer';
}

export interface MemoryEntry {
  id: string;
  eidolonId: string;
  memoryType: MemoryType;
  content: string;
  importance: number;    // 0.0-1.0
  emotionTag?: string;
  createdAt: string;
}

export interface EidolonRespondRequest {
  eidolonId: string;
  eventTrigger: string;
  questContext?: string;
}

export interface EidolonRespondResponse {
  response: string;
  newMemoryId: string;
  personalityDelta: Partial<PersonalityProfile>;
  modelUsed: AiModel;
  latencyMs: number;
}

export interface DungeonGenerateRequest {
  difficulty: number;    // 1-10
  theme?: DungeonTheme;
  eidolonId: string;
}

export interface DungeonRoom {
  index: number;
  description: string;
  eventType: 'combat' | 'treasure' | 'rest' | 'story' | 'boss';
  eventData: Record<string, unknown>;
}

export interface DungeonGenerateResponse {
  dungeonId: string;
  name: string;
  narrativeIntro: string;
  rooms: DungeonRoom[];
  bossConfig: Record<string, unknown>;
  modelUsed: AiModel;
  generationMs: number;
}

export interface RealitySyncRequest {
  steps: number;
  sleepHours?: number;
  hrvScore?: number;
  activeCal?: number;
  emotion?: EmotionType;
  emotionIntensity?: number;
}

export interface RealitySyncResponse {
  statBonuses: {
    atkBonus: number;
    hpModifier: number;
    eidolonMood: EidolonMood;
  };
  worldWeather: 'clear' | 'storm' | 'fog' | 'aurora' | 'blizzard';
}

// Standard API error response
export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}
