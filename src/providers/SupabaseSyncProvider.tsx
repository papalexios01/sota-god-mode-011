import { useEffect, createContext, useContext, ReactNode } from 'react';
import { useSupabaseSync } from '@/hooks/useSupabaseSync';

interface SupabaseSyncContextType {
  isLoading: boolean;
  isConnected: boolean;
  lastSyncTime: Date | null;
  error: string | null;
  tableMissing: boolean;
  saveToSupabase: (itemId: string, content?: any) => Promise<boolean>;
  deleteFromSupabase: (itemId: string) => Promise<boolean>;
  syncAllToSupabase: () => Promise<void>;
  loadFromSupabase: () => Promise<void>;
}

const SupabaseSyncContext = createContext<SupabaseSyncContextType | null>(null);

export function useSupabaseSyncContext() {
  const context = useContext(SupabaseSyncContext);
  if (!context) {
    throw new Error('useSupabaseSyncContext must be used within SupabaseSyncProvider');
  }
  return context;
}

interface SupabaseSyncProviderProps {
  children: ReactNode;
}

export function SupabaseSyncProvider({ children }: SupabaseSyncProviderProps) {
  const sync = useSupabaseSync();

  return (
    <SupabaseSyncContext.Provider value={sync}>
      {children}
    </SupabaseSyncContext.Provider>
  );
}
