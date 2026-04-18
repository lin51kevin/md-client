/**
 * App — minimal entry point for MarkLite.
 *
 * Wraps the application with providers and renders the AppShell layout.
 * All heavy logic lives in AppShell; this file should stay under ~30 lines.
 */

import { AppProviders } from './components/AppProviders';
import { AppShell } from './components/AppShell';
import './App.css';

export default function App() {
  return (
    <AppProviders>
      <AppShell />
    </AppProviders>
  );
}
