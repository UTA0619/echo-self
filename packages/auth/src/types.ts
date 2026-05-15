import type { User, Session } from '@supabase/supabase-js'

export type { User, Session }

export interface AuthUser {
  id: string
  email: string | null
  displayName: string | null
  avatarUrl: string | null
  onboardingCompleted: boolean
}

export interface AuthState {
  user: AuthUser | null
  session: Session | null
  isLoading: boolean
}

export class AuthError extends Error {
  constructor(
    message: string,
    public readonly code: string
  ) {
    super(message)
    this.name = 'AuthError'
  }
}

export class UnauthenticatedError extends AuthError {
  constructor() {
    super('User is not authenticated', 'UNAUTHENTICATED')
  }
}
