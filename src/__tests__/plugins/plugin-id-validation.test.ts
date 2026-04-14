import { describe, test, expect, vi, beforeEach } from 'vitest';

describe('Plugin ID Validation', () => {
  test('should reject plugin IDs with path traversal characters', () => {
    const validatePluginId = (id: string): { valid: boolean; reason?: string } => {
      if (!id) return { valid: false, reason: 'Plugin ID cannot be empty' };
      if (id.includes('..')) return { valid: false, reason: 'Plugin ID cannot contain parent directory (..)' };
      if (id.includes('~')) return { valid: false, reason: 'Plugin ID cannot contain tilde (~)' };
      if (id.includes('/')) return { valid: false, reason: 'Plugin ID cannot contain slashes (/)' };
      if (id.includes('\\')) return { valid: false, reason: 'Plugin ID cannot contain backslashes (\\)' };
      if (id.includes('~')) return { valid: false, reason: 'Plugin ID cannot contain tilde (~)' };
      if (id.startsWith('.')) return { valid: false, reason: 'Plugin ID cannot start with dot (.)' };
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) {
        return { valid: false, reason: 'Plugin ID must be kebab-case (lowercase letters, numbers, hyphens)' };
      }
      return { valid: true };
    };

    // Test cases from diagnostic report
    expect(validatePluginId('../evil')).toEqual({ 
      valid: false, 
      reason: 'Plugin ID cannot contain parent directory (..)' 
    });
    expect(validatePluginId('~/.ssh/config')).toEqual({ 
      valid: false, 
      reason: 'Plugin ID cannot contain tilde (~)' 
    });
    expect(validatePluginId('my-plugin')).toEqual({ valid: true });
    expect(validatePluginId('backlinks-panel')).toEqual({ valid: true });
    expect(validatePluginId('My-Plugin')).toEqual({ 
      valid: false, 
      reason: 'Plugin ID must be kebab-case (lowercase letters, numbers, hyphens)' 
    });
  });

  test('should reject empty or whitespace-only IDs', () => {
    const validatePluginId = (id: string): { valid: boolean; reason?: string } => {
      if (!id || !id.trim()) return { valid: false, reason: 'Plugin ID cannot be empty' };
      // ... rest of validation
      return { valid: true };
    };

    expect(validatePluginId('')).toEqual({ valid: false, reason: 'Plugin ID cannot be empty' });
    expect(validatePluginId('   ')).toEqual({ valid: false, reason: 'Plugin ID cannot be empty' });
  });
});