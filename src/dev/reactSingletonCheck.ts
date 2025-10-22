import React from 'react';

declare global {
  interface Window {
    __REACT_SINGLETON?: typeof React;
  }
}

if (typeof window !== 'undefined') {
  if (!window.__REACT_SINGLETON) {
    window.__REACT_SINGLETON = React;
    console.log('[reactSingletonCheck] First React instance registered (version:', React.version, ')');
  } else if (window.__REACT_SINGLETON !== React) {
    console.error(
      '[reactSingletonCheck] DUPLICATE REACT DETECTED!\n' +
      'First React version:', window.__REACT_SINGLETON.version, '\n' +
      'Current React version:', React.version, '\n' +
      'This will cause the "Cannot read properties of null (reading \'useState\')" error.'
    );
  }
}

export {};
