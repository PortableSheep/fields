import { renderHook, act } from '@testing-library/react';
import { useAnnotations } from '../useAnnotations';
import type { Rect } from '../../types/annotations';

const rect: Rect = { x: 10, y: 20, width: 100, height: 30 };

describe('useAnnotations', () => {
  describe('addAnnotation', () => {
    it('creates annotation with correct ID format (ann-{timestamp}-{counter})', () => {
      const { result } = renderHook(() => useAnnotations());

      act(() => {
        result.current.addAnnotation('text', 0, rect);
      });

      expect(result.current.annotations).toHaveLength(1);
      expect(result.current.annotations[0].id).toMatch(/^ann-\d+-\d+$/);
    });

    it('auto-selects the new annotation', () => {
      const { result } = renderHook(() => useAnnotations());

      act(() => {
        result.current.addAnnotation('text', 0, rect);
      });

      const ann = result.current.annotations[0];
      expect(result.current.selectedId).toBe(ann.id);
      expect(result.current.selected).toEqual(ann);
    });

    it('creates a text annotation with defaults', () => {
      const { result } = renderHook(() => useAnnotations());

      act(() => {
        result.current.addAnnotation('text', 0, rect);
      });

      const ann = result.current.annotations[0];
      expect(ann.type).toBe('text');
      expect(ann).toMatchObject({
        pageIndex: 0,
        rect,
        value: '',
        fontSize: 14,
        fontFamily: 'sans-serif',
        color: '#000000',
      });
    });

    it('creates a checkbox annotation with defaults', () => {
      const { result } = renderHook(() => useAnnotations());

      act(() => {
        result.current.addAnnotation('checkbox', 1, rect);
      });

      const ann = result.current.annotations[0];
      expect(ann.type).toBe('checkbox');
      expect(ann).toMatchObject({ checked: false, showBorder: true });
    });

    it('creates a date annotation with defaults', () => {
      const { result } = renderHook(() => useAnnotations());

      act(() => {
        result.current.addAnnotation('date', 0, rect);
      });

      const ann = result.current.annotations[0];
      expect(ann.type).toBe('date');
      expect(ann).toMatchObject({ value: '', format: 'MM/DD/YYYY' });
    });

    it('creates a signature annotation with defaults', () => {
      const { result } = renderHook(() => useAnnotations());

      act(() => {
        result.current.addAnnotation('signature', 0, rect);
      });

      const ann = result.current.annotations[0];
      expect(ann.type).toBe('signature');
      expect(ann).toMatchObject({ dataUrl: '' });
    });

    it('merges extra partial overrides', () => {
      const { result } = renderHook(() => useAnnotations());

      act(() => {
        result.current.addAnnotation('text', 0, rect, { value: 'hello', fontSize: 20 } as any);
      });

      const ann = result.current.annotations[0] as any;
      expect(ann.value).toBe('hello');
      expect(ann.fontSize).toBe(20);
    });
  });

  describe('updateAnnotation', () => {
    it('merges partial updates into the annotation', () => {
      const { result } = renderHook(() => useAnnotations());

      act(() => {
        result.current.addAnnotation('text', 0, rect);
      });
      const id = result.current.annotations[0].id;

      act(() => {
        result.current.updateAnnotation(id, { value: 'updated' } as any);
      });

      expect((result.current.annotations[0] as any).value).toBe('updated');
      expect(result.current.annotations[0].rect).toEqual(rect);
    });
  });

  describe('deleteAnnotation', () => {
    it('removes the annotation', () => {
      const { result } = renderHook(() => useAnnotations());

      act(() => {
        result.current.addAnnotation('text', 0, rect);
      });
      const id = result.current.annotations[0].id;

      act(() => {
        result.current.deleteAnnotation(id);
      });

      expect(result.current.annotations).toHaveLength(0);
    });

    it('clears selection if the deleted annotation was selected', () => {
      const { result } = renderHook(() => useAnnotations());

      act(() => {
        result.current.addAnnotation('text', 0, rect);
      });
      const id = result.current.annotations[0].id;
      expect(result.current.selectedId).toBe(id);

      act(() => {
        result.current.deleteAnnotation(id);
      });

      expect(result.current.selectedId).toBeNull();
    });

    it('keeps selection if a different annotation was deleted', () => {
      const { result } = renderHook(() => useAnnotations());

      act(() => {
        result.current.addAnnotation('text', 0, rect);
      });
      const id1 = result.current.annotations[0].id;

      act(() => {
        result.current.addAnnotation('checkbox', 0, rect);
      });
      // second add auto-selects the new one
      const id2 = result.current.annotations[1].id;
      expect(result.current.selectedId).toBe(id2);

      act(() => {
        result.current.deleteAnnotation(id1);
      });

      expect(result.current.selectedId).toBe(id2);
    });
  });

  describe('undo / redo', () => {
    it('undo restores previous state and clears selection', () => {
      const { result } = renderHook(() => useAnnotations());

      act(() => {
        result.current.addAnnotation('text', 0, rect);
      });
      expect(result.current.annotations).toHaveLength(1);

      act(() => {
        result.current.undo();
      });

      expect(result.current.annotations).toHaveLength(0);
      expect(result.current.selectedId).toBeNull();
    });

    it('redo re-applies undone change and clears selection', () => {
      const { result } = renderHook(() => useAnnotations());

      act(() => {
        result.current.addAnnotation('text', 0, rect);
      });

      act(() => {
        result.current.undo();
      });
      expect(result.current.annotations).toHaveLength(0);

      act(() => {
        result.current.redo();
      });

      expect(result.current.annotations).toHaveLength(1);
      expect(result.current.selectedId).toBeNull();
    });

    it('handles multiple undo/redo operations (stack depth)', () => {
      const { result } = renderHook(() => useAnnotations());

      act(() => {
        result.current.addAnnotation('text', 0, rect);
      });
      act(() => {
        result.current.addAnnotation('checkbox', 0, rect);
      });
      act(() => {
        result.current.addAnnotation('date', 0, rect);
      });
      expect(result.current.annotations).toHaveLength(3);

      act(() => { result.current.undo(); });
      expect(result.current.annotations).toHaveLength(2);

      act(() => { result.current.undo(); });
      expect(result.current.annotations).toHaveLength(1);

      act(() => { result.current.undo(); });
      expect(result.current.annotations).toHaveLength(0);

      // redo all the way back
      act(() => { result.current.redo(); });
      expect(result.current.annotations).toHaveLength(1);

      act(() => { result.current.redo(); });
      expect(result.current.annotations).toHaveLength(2);

      act(() => { result.current.redo(); });
      expect(result.current.annotations).toHaveLength(3);
    });

    it('undo is a no-op when stack is empty', () => {
      const { result } = renderHook(() => useAnnotations());

      act(() => {
        result.current.undo();
      });

      expect(result.current.annotations).toHaveLength(0);
    });

    it('redo is a no-op when stack is empty', () => {
      const { result } = renderHook(() => useAnnotations());

      act(() => {
        result.current.redo();
      });

      expect(result.current.annotations).toHaveLength(0);
    });
  });

  describe('canUndo / canRedo', () => {
    it('both false initially', () => {
      const { result } = renderHook(() => useAnnotations());
      expect(result.current.canUndo).toBe(false);
      expect(result.current.canRedo).toBe(false);
    });

    it('canUndo becomes true after mutation', () => {
      const { result } = renderHook(() => useAnnotations());

      act(() => {
        result.current.addAnnotation('text', 0, rect);
      });

      expect(result.current.canUndo).toBe(true);
      expect(result.current.canRedo).toBe(false);
    });

    it('canRedo becomes true after undo', () => {
      const { result } = renderHook(() => useAnnotations());

      act(() => {
        result.current.addAnnotation('text', 0, rect);
      });
      act(() => {
        result.current.undo();
      });

      expect(result.current.canUndo).toBe(false);
      expect(result.current.canRedo).toBe(true);
    });
  });

  describe('isDirty / markClean', () => {
    it('isDirty is false initially', () => {
      const { result } = renderHook(() => useAnnotations());
      expect(result.current.isDirty).toBe(false);
    });

    it('isDirty is true after add', () => {
      const { result } = renderHook(() => useAnnotations());

      act(() => {
        result.current.addAnnotation('text', 0, rect);
      });

      expect(result.current.isDirty).toBe(true);
    });

    it('isDirty is true after update', () => {
      const { result } = renderHook(() => useAnnotations());

      act(() => {
        result.current.addAnnotation('text', 0, rect);
      });
      act(() => {
        result.current.markClean();
      });
      expect(result.current.isDirty).toBe(false);

      act(() => {
        result.current.updateAnnotation(result.current.annotations[0].id, { value: 'x' } as any);
      });

      expect(result.current.isDirty).toBe(true);
    });

    it('isDirty is true after delete', () => {
      const { result } = renderHook(() => useAnnotations());

      act(() => {
        result.current.addAnnotation('text', 0, rect);
      });
      act(() => {
        result.current.markClean();
      });

      act(() => {
        result.current.deleteAnnotation(result.current.annotations[0].id);
      });

      expect(result.current.isDirty).toBe(true);
    });

    it('markClean clears isDirty', () => {
      const { result } = renderHook(() => useAnnotations());

      act(() => {
        result.current.addAnnotation('text', 0, rect);
      });
      expect(result.current.isDirty).toBe(true);

      act(() => {
        result.current.markClean();
      });

      expect(result.current.isDirty).toBe(false);
    });
  });

  describe('replaceAnnotations', () => {
    it('bulk-replaces all annotations and clears selection', () => {
      const { result } = renderHook(() => useAnnotations());

      act(() => {
        result.current.addAnnotation('text', 0, rect);
      });
      expect(result.current.selectedId).not.toBeNull();

      const replacement = [
        { id: 'r1', type: 'checkbox' as const, pageIndex: 0, rect, checked: false, showBorder: true },
        { id: 'r2', type: 'text' as const, pageIndex: 1, rect, value: '', fontSize: 14, fontFamily: 'sans-serif', color: '#000' },
      ];

      act(() => {
        result.current.replaceAnnotations(replacement);
      });

      expect(result.current.annotations).toHaveLength(2);
      expect(result.current.annotations[0].id).toBe('r1');
      expect(result.current.annotations[1].id).toBe('r2');
      expect(result.current.selectedId).toBeNull();
    });

    it('pushes undo state before replacing', () => {
      const { result } = renderHook(() => useAnnotations());

      act(() => {
        result.current.addAnnotation('text', 0, rect);
      });

      act(() => {
        result.current.replaceAnnotations([]);
      });

      expect(result.current.annotations).toHaveLength(0);
      expect(result.current.canUndo).toBe(true);

      act(() => {
        result.current.undo();
      });

      expect(result.current.annotations).toHaveLength(1);
    });
  });

  describe('deleteSelected', () => {
    it('deletes the currently selected annotation', () => {
      const { result } = renderHook(() => useAnnotations());

      act(() => {
        result.current.addAnnotation('text', 0, rect);
      });
      expect(result.current.annotations).toHaveLength(1);

      act(() => {
        result.current.deleteSelected();
      });

      expect(result.current.annotations).toHaveLength(0);
      expect(result.current.selectedId).toBeNull();
    });

    it('is a no-op when nothing is selected', () => {
      const { result } = renderHook(() => useAnnotations());

      act(() => {
        result.current.addAnnotation('text', 0, rect);
      });
      act(() => {
        result.current.setSelectedId(null);
      });

      const countBefore = result.current.annotations.length;

      act(() => {
        result.current.deleteSelected();
      });

      expect(result.current.annotations).toHaveLength(countBefore);
    });
  });
});
