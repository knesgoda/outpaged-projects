
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';

interface AccessibilityContextType {
  highContrast: boolean;
  reducedMotion: boolean;
  fontSize: 'small' | 'medium' | 'large' | 'xl';
  screenReader: boolean;
  keyboardNavigation: boolean;
  toggleHighContrast: () => void;
  toggleReducedMotion: () => void;
  setFontSize: (size: 'small' | 'medium' | 'large' | 'xl') => void;
  announceToScreenReader: (message: string) => void;
}

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined);

export function AccessibilityProvider({ children }: { children: ReactNode }) {
  const [highContrast, setHighContrast] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [fontSize, setFontSize] = useState<'small' | 'medium' | 'large' | 'xl'>('medium');
  const [screenReader, setScreenReader] = useState(false);
  const [keyboardNavigation, setKeyboardNavigation] = useState(false);

  useEffect(() => {
    // Check for system preferences
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const prefersHighContrast = window.matchMedia('(prefers-contrast: high)').matches;
    
    setReducedMotion(prefersReducedMotion);
    setHighContrast(prefersHighContrast);
    
    // Detect screen reader
    const hasScreenReader = window.speechSynthesis !== undefined;
    setScreenReader(hasScreenReader);
    
    // Detect keyboard navigation
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        setKeyboardNavigation(true);
      }
    };
    
    const handleMouseDown = () => {
      setKeyboardNavigation(false);
    };
    
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleMouseDown);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleMouseDown);
    };
  }, []);

  useEffect(() => {
    // Apply accessibility classes to document
    const root = document.documentElement;
    
    if (highContrast) {
      root.classList.add('high-contrast');
    } else {
      root.classList.remove('high-contrast');
    }
    
    if (reducedMotion) {
      root.classList.add('reduced-motion');
    } else {
      root.classList.remove('reduced-motion');
    }
    
    root.setAttribute('data-font-size', fontSize);
    
    if (keyboardNavigation) {
      root.classList.add('keyboard-navigation');
    } else {
      root.classList.remove('keyboard-navigation');
    }
  }, [highContrast, reducedMotion, fontSize, keyboardNavigation]);

  const toggleHighContrast = () => setHighContrast(!highContrast);
  const toggleReducedMotion = () => setReducedMotion(!reducedMotion);

  const announceToScreenReader = (message: string) => {
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', 'polite');
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.textContent = message;
    
    document.body.appendChild(announcement);
    
    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  };

  return (
    <AccessibilityContext.Provider value={{
      highContrast,
      reducedMotion,
      fontSize,
      screenReader,
      keyboardNavigation,
      toggleHighContrast,
      toggleReducedMotion,
      setFontSize,
      announceToScreenReader
    }}>
      {children}
    </AccessibilityContext.Provider>
  );
}

export function useAccessibility() {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error('useAccessibility must be used within AccessibilityProvider');
  }
  return context;
}
