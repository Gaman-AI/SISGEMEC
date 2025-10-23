import type { AuthState } from './auth.store';

type AuthenticatedState = Extract<AuthState, { status: 'authenticated' }>;

export function isAuthenticated(state: AuthState): state is AuthenticatedState {
  return state.status === 'authenticated';
}

export function hasRole(state: AuthState, role: 'ADMIN' | 'RESPONSABLE') {
  return isAuthenticated(state) && state.profile.role === role;
}
