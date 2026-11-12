import { describe, expect, it } from 'vitest';
import { instructionSnapshot } from './siteInstructions';

describe('Daywork SI', () => {
  it('saves the sender, SI number and full multiline content', () => {
    expect(instructionSnapshot({ id: 'si1', sender: 'John', number: 'SI-123', content: 'Level 1\nInstall framing' })).toEqual({ id: 'si1', sender: 'John', number: 'SI-123', content: 'Level 1\nInstall framing' });
  });
  it('keeps saved Daywork details independent from later list edits or deletion', () => {
    const source = { id: 'si1', sender: 'John', number: 'SI-123', content: 'Install framing' };
    const saved = instructionSnapshot(source);
    source.content = 'Revised instruction';
    source.sender = 'Mary';
    expect(saved.content).toBe('Install framing');
    expect(saved.sender).toBe('John');
  });
});