export type PrimaryEmotion = 'joy' | 'fear' | 'anger' | 'sadness' | 'surprise' | 'disgust' | 'anticipation' | 'trust'

export interface EmotionalEvent {
  id: string
  userId: string
  memoryId?: string
  emotionPrimary: PrimaryEmotion
  emotionSecondary?: string
  valence: number
  arousal: number
  eventDate: string
  createdAt: string
}

export interface EmotionalPattern {
  pattern: string
  frequency: number
  contexts: string[]
  averageValence: number
  averageArousal: number
}

export type TagCategory = 'cognitive' | 'emotional' | 'relational' | 'energy'
export type TagValence = 'positive' | 'negative' | 'neutral'

export interface BehavioralTag {
  id: string
  memoryId: string
  userId: string
  tagName: string
  tagCategory: TagCategory
  valence: TagValence
  intensity: number
  createdAt: string
}

export interface BehavioralPattern {
  id: string
  userId: string
  patternType: string
  patternDescription: string
  frequencyDays?: number
  confidence: number
  firstDetectedAt: string
  lastSeenAt: string
  isActive: boolean
  evidenceMemoryIds: string[]
}
