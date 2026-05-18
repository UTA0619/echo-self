export type HorizonMonths = 1 | 3 | 12 | 36

export interface FutureSelfSimulation {
  id: string
  userId: string
  horizonMonths: HorizonMonths
  narrative: string
  letterText?: string
  trajectoryScore: number
  createdAt: string
  snapshotIdentity: Record<string, unknown>
  snapshotBehaviors: Record<string, unknown>
}

export interface Intervention {
  id: string
  userId: string
  triggerPatternId?: string
  interventionText: string
  deliveryChannel: 'in-app' | 'push' | 'email'
  deliveredAt?: string
  userResponse?: 'dismissed' | 'acted' | 'saved'
}

export interface NudgePayload {
  title: string
  body: string
  interventionId: string
  deepLink?: string
}
