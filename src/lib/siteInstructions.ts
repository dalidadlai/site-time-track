import type { SiteInstruction } from './types';

export function instructionSnapshot(instruction: SiteInstruction): SiteInstruction {
  return { id: instruction.id, sender: instruction.sender, number: instruction.number, content: instruction.content };
}