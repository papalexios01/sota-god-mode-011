import { useEffect, createContext, useContext, ReactNode, Component, ErrorInfo } from 'react';
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

class ErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[SupabaseSyncProvider] Error caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.children;
    }

    return this.props.children;
  }
}

export function SupabaseSyncProvider({ children }: SupabaseSyncProviderProps) {
  const sync = useSupabaseSync();

  return (
    <ErrorBoundary>
      <SupabaseSyncContext.Provider value={sync}>
        {children}
      </SupabaseSyncContext.Provider>
    </ErrorBoundary>
  );
}
