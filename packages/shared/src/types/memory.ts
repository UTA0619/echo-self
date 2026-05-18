export type ContentType = 'journal' | 'voice' | 'photo' | 'auto'

export interface Memory {
  id: string
  userId: string
  content: string
  contentType: ContentType
  sourceUrl?: string
  createdAt: string
  memoryDate: string
  isPrivate: boolean
  isDeleted: boolean
  metadata: Record<string, unknown>
}

export interface MemorySummary {
  id: string
  userId: string
  periodType: 'day' | 'week' | 'month' | 'year'
  periodStart: string
  periodEnd: string
  summaryText: string
  createdAt: string
  sourceMemoryIds: string[]
}

export interface MemorySearchResult {
  memory: Memory
  similarity: number
}

export interface MemoryIngestionInput {
  content: string
  contentType: ContentType
  memoryDate?: string
  sourceUrl?: string
  isPrivate?: boolean
  metadata?: Record<string, unknown>
}
