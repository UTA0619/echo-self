export type TraitCategory = 'value' | 'personality' | 'skill' | 'role'

export interface IdentityTrait {
  id: string
  userId: string
  traitName: string
  traitCategory: TraitCategory
  confidence: number
  evidenceCount: number
  firstDetectedAt: string
  lastReinforcedAt: string
  metadata: Record<string, unknown>
}

export interface UserRole {
  name: string
  description?: string
  contexts: string[]
}

export interface IdentityGraph {
  traits: IdentityTrait[]
  roles: UserRole[]
  coreValues: string[]
  lastUpdatedAt: string
}

export interface IdentitySnapshot {
  traits: Pick<IdentityTrait, 'traitName' | 'traitCategory' | 'confidence'>[]
  roles: UserRole[]
  capturedAt: string
}
