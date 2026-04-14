import { describe, it, expect } from 'vitest';
import { EditHistoryManager } from '../../lib/edit-history';
import type { EditOperation } from '../../types/edit';

function makeOp(id: string): EditOperation {
  return { type: 'block-replace', nodeId: id, before: '', after: '', timestamp: Date.now() };
}

describe('EditHistoryManager', () => {
  it('push and undo basic flow', () => {
    const h = new EditHistoryManager();
    h.push(makeOp('1'));
    h.push(makeOp('2'));
    const op = h.undo()!;
    expect(op.nodeId).toBe('2');
    expect(h.canUndo).toBe(true);
    expect(h.canRedo).toBe(true);
  });

  it('redo pops from redo stack', () => {
    const h = new EditHistoryManager();
    h.push(makeOp('1'));
    h.undo();
    const op = h.redo()!;
    expect(op.nodeId).toBe('1');
    expect(h.canRedo).toBe(false);
  });

  it('push clears redo stack', () => {
    const h = new EditHistoryManager();
    h.push(makeOp('1'));
    h.undo();
    h.push(makeOp('2'));
    expect(h.canRedo).toBe(false);
    // After undo+push, only '2' remains on undo stack (undone '1' was discarded)
    expect(h.undoStack.map((o) => o.nodeId)).toEqual(['2']);
  });

  it('undo returns null when empty', () => {
    const h = new EditHistoryManager();
    expect(h.undo()).toBeNull();
  });

  it('redo returns null when empty', () => {
    const h = new EditHistoryManager();
    expect(h.redo()).toBeNull();
  });

  it('maxSize evicts oldest entry', () => {
    const h = new EditHistoryManager(3);
    h.push(makeOp('1'));
    h.push(makeOp('2'));
    h.push(makeOp('3'));
    h.push(makeOp('4'));
    expect(h.size).toBe(3);
    expect(h.undoStack[0].nodeId).toBe('2');
  });

  it('clear empties both stacks', () => {
    const h = new EditHistoryManager();
    h.push(makeOp('1'));
    h.undo();
    h.clear();
    expect(h.canUndo).toBe(false);
    expect(h.canRedo).toBe(false);
    expect(h.size).toBe(0);
  });

  it('size reflects total entries', () => {
    const h = new EditHistoryManager();
    h.push(makeOp('1'));
    h.push(makeOp('2'));
    h.undo();
    expect(h.size).toBe(2);
  });

  it('canUndo and canRedo are correct', () => {
    const h = new EditHistoryManager();
    expect(h.canUndo).toBe(false);
    expect(h.canRedo).toBe(false);
    h.push(makeOp('1'));
    expect(h.canUndo).toBe(true);
    expect(h.canRedo).toBe(false);
    h.undo();
    expect(h.canUndo).toBe(false);
    expect(h.canRedo).toBe(true);
  });
});
