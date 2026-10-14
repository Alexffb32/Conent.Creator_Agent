'use client';
import { createContext, useContext, type ReactNode } from 'react';
import type { FlagKey, Flags } from './flags';

const FlagsContext = createContext<Partial<Flags>>({});

/** Disponibiliza as flags (já resolvidas no servidor) aos componentes de cliente. */
export function FlagsProvider({ flags, children }: { flags: Flags; children: ReactNode }) {
  return <FlagsContext.Provider value={flags}>{children}</FlagsContext.Provider>;
}

/** `useFlag('ordering')`: falso enquanto a flag não estiver ligada (desligada por omissão). */
export function useFlag(key: FlagKey): boolean {
  return Boolean(useContext(FlagsContext)[key]);
}
