import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

if (!(globalThis as { __import_meta_env__?: Record<string, unknown> }).__import_meta_env__) {
  (globalThis as { __import_meta_env__?: Record<string, unknown> }).__import_meta_env__ = {
    ...import.meta.env,
  };
}

createRoot(document.getElementById("root")!).render(<App />);
