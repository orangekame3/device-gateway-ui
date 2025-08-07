'use client';

import React, { createContext, useContext } from 'react';

interface EnvironmentContextType {
  refreshEnvironment: () => void;
}

const EnvironmentContext = createContext<EnvironmentContextType | undefined>(undefined);

export function useEnvironmentContext() {
  const context = useContext(EnvironmentContext);
  if (!context) {
    throw new Error('useEnvironmentContext must be used within an EnvironmentProvider');
  }
  return context;
}

interface EnvironmentProviderProps {
  children: React.ReactNode;
  refreshEnvironment: () => void;
}

export function EnvironmentProvider({ children, refreshEnvironment }: EnvironmentProviderProps) {
  return (
    <EnvironmentContext.Provider value={{ refreshEnvironment }}>
      {children}
    </EnvironmentContext.Provider>
  );
}