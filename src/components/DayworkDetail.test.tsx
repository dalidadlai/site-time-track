import { fireEvent, render, screen, cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import DayworkDetail from './DayworkDetail';
import type { Task } from '@/lib/types';

vi.mock('./ImproveWithAI', () => ({ ImproveWithAI: () => null }));
vi.mock('./TaskSI', () => ({ default: ({ items, value, onChange }: any) => <select aria-label="Task SI" value={value?.id ?? ''} onChange={e => onChange(items.find((item: any) => item.id === e.target.value))}><option value="">No SI</option>{items.map((item: any) => <option key={item.id} value={item.id}>{item.number}</option>)}</select> }));
afterEach(cleanup);

describe('task SI saves', () => {
  it('saves different SI on two tasks of the same day without carrying the previous selection', () => {
    const onAddTask = vi.fn();
    const instructions = [
      { id: 'si1', sender: 'John', number: 'SI-123', content: 'Install framing\nLevel 1' },
      { id: 'si2', sender: 'Mary', number: 'SI-124', content: 'Strip formwork' },
    ];
    render(<DayworkDetail daywork={{ id: 'day1', date: '2026-11-13', tasks: [], siteContactName: '', siteContactPhone: '', purchaseOrder: '' }} projectName="Test" siteManagers={[]} workers={[]} siteInstructions={instructions} onBack={vi.fn()} onAddTask={onAddTask} onEditTask={vi.fn()} onDeleteTask={vi.fn()} onAddWorkerLogs={vi.fn()} onAddWorkerLog={vi.fn()} onUpdateWorkerLog={vi.fn()} onDeleteWorkerLog={vi.fn()} onUpdateSignature={vi.fn()} />);
    for (const [index, instruction] of instructions.entries()) {
      fireEvent.click(screen.getByRole('button', { name: 'Add Task' }));
      expect((screen.getByLabelText('Task SI') as HTMLSelectElement).value).toBe('');
      fireEvent.change(screen.getByPlaceholderText('e.g.\n1. Strip formwork\n2. Clean and oil panels\n3. Refix to next pour'), { target: { value: `Task ${index + 1}` } });
      fireEvent.change(screen.getByLabelText('Task SI'), { target: { value: instruction.id } });
      fireEvent.click(screen.getByRole('button', { name: 'Save Task' }));
    }
    const first: Task = onAddTask.mock.calls[0][0];
    const second: Task = onAddTask.mock.calls[1][0];
    expect(first.siteInstruction).toEqual(instructions[0]);
    expect(second.siteInstruction).toEqual(instructions[1]);
    instructions[0].content = 'Changed list';
    expect(first.siteInstruction?.content).toBe('Install framing\nLevel 1');
  });
});