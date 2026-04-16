import { renderHook, act } from '@testing-library/react';
import { usePdfDocument } from '../usePdfDocument';

const mockDestroy = vi.fn().mockResolvedValue(undefined);

function createMockDoc(numPages = 3) {
  return {
    numPages,
    destroy: mockDestroy,
    getPage: vi.fn().mockResolvedValue({
      getViewport: vi.fn(() => ({ width: 612, height: 792 })),
    }),
  };
}

vi.mock('pdfjs-dist', () => {
  return {
    getDocument: vi.fn(() => ({
      promise: Promise.resolve(createMockDoc(3)),
    })),
    GlobalWorkerOptions: { workerSrc: '' },
  };
});

import { getDocument } from 'pdfjs-dist';
const mockGetDocument = vi.mocked(getDocument);

describe('usePdfDocument', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('starts with correct initial state', () => {
    const { result } = renderHook(() => usePdfDocument());
    expect(result.current.pdfDoc).toBeNull();
    expect(result.current.totalPages).toBe(0);
    expect(result.current.currentPage).toBe(1);
    expect(result.current.scale).toBe(1.0);
    expect(result.current.fileName).toBe('');
    expect(result.current.pdfBytes).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  describe('loadPdf', () => {
    it('sets loading=true then updates state', async () => {
      const doc = createMockDoc(5);
      mockGetDocument.mockReturnValue({ promise: Promise.resolve(doc) } as any);

      const { result } = renderHook(() => usePdfDocument());
      const bytes = new Uint8Array([1, 2, 3]);

      await act(async () => {
        await result.current.loadPdf(bytes, 'test.pdf');
      });

      expect(result.current.loading).toBe(false);
      expect(result.current.pdfDoc).toBe(doc);
      expect(result.current.totalPages).toBe(5);
      expect(result.current.currentPage).toBe(1);
      expect(result.current.fileName).toBe('test.pdf');
      expect(result.current.pdfBytes).toBe(bytes);
      expect(result.current.error).toBeNull();
    });

    it('destroys previous document before loading new one', async () => {
      const doc1 = createMockDoc(2);
      const doc2 = createMockDoc(4);
      mockGetDocument
        .mockReturnValueOnce({ promise: Promise.resolve(doc1) } as any)
        .mockReturnValueOnce({ promise: Promise.resolve(doc2) } as any);

      const { result } = renderHook(() => usePdfDocument());

      await act(async () => {
        await result.current.loadPdf(new Uint8Array([1]), 'first.pdf');
      });

      await act(async () => {
        await result.current.loadPdf(new Uint8Array([2]), 'second.pdf');
      });

      expect(doc1.destroy).toHaveBeenCalled();
      expect(result.current.pdfDoc).toBe(doc2);
      expect(result.current.totalPages).toBe(4);
    });

    it('sets error on failure', async () => {
      mockGetDocument.mockReturnValue({
        promise: Promise.reject(new Error('bad pdf')),
      } as any);

      const { result } = renderHook(() => usePdfDocument());

      await act(async () => {
        await result.current.loadPdf(new Uint8Array([0]), 'bad.pdf');
      });

      expect(result.current.error).toBe('bad pdf');
      expect(result.current.pdfDoc).toBeNull();
      expect(result.current.totalPages).toBe(0);
      expect(result.current.loading).toBe(false);
    });
  });

  describe('closePdf', () => {
    it('resets all state', async () => {
      const doc = createMockDoc(3);
      mockGetDocument.mockReturnValue({ promise: Promise.resolve(doc) } as any);

      const { result } = renderHook(() => usePdfDocument());

      await act(async () => {
        await result.current.loadPdf(new Uint8Array([1]), 'test.pdf');
      });
      expect(result.current.pdfDoc).not.toBeNull();

      await act(async () => {
        await result.current.closePdf();
      });

      expect(doc.destroy).toHaveBeenCalled();
      expect(result.current.pdfDoc).toBeNull();
      expect(result.current.totalPages).toBe(0);
      expect(result.current.currentPage).toBe(1);
      expect(result.current.pdfBytes).toBeNull();
      expect(result.current.fileName).toBe('');
      expect(result.current.error).toBeNull();
    });
  });

  describe('zoomIn / zoomOut', () => {
    it('zoomIn increments scale by 0.25', () => {
      const { result } = renderHook(() => usePdfDocument());
      expect(result.current.scale).toBe(1.0);

      act(() => {
        result.current.zoomIn();
      });

      expect(result.current.scale).toBe(1.25);
    });

    it('zoomOut decrements scale by 0.25', () => {
      const { result } = renderHook(() => usePdfDocument());

      act(() => {
        result.current.zoomOut();
      });

      expect(result.current.scale).toBe(0.75);
    });

    it('clamps zoom to max 5.0', () => {
      const { result } = renderHook(() => usePdfDocument());

      act(() => {
        result.current.setScale(4.9);
      });

      act(() => {
        result.current.zoomIn();
      });

      expect(result.current.scale).toBe(5.0);
    });

    it('clamps zoom to min 0.25', () => {
      const { result } = renderHook(() => usePdfDocument());

      act(() => {
        result.current.setScale(0.4);
      });

      act(() => {
        result.current.zoomOut();
      });

      expect(result.current.scale).toBe(0.25);
    });
  });

  describe('goToPage', () => {
    it('sets currentPage within bounds', async () => {
      const doc = createMockDoc(10);
      mockGetDocument.mockReturnValue({ promise: Promise.resolve(doc) } as any);

      const { result } = renderHook(() => usePdfDocument());

      await act(async () => {
        await result.current.loadPdf(new Uint8Array([1]), 'test.pdf');
      });

      act(() => {
        result.current.goToPage(5);
      });

      expect(result.current.currentPage).toBe(5);
    });

    it('clamps to 1 for page < 1', async () => {
      const doc = createMockDoc(10);
      mockGetDocument.mockReturnValue({ promise: Promise.resolve(doc) } as any);

      const { result } = renderHook(() => usePdfDocument());

      await act(async () => {
        await result.current.loadPdf(new Uint8Array([1]), 'test.pdf');
      });

      act(() => {
        result.current.goToPage(0);
      });

      expect(result.current.currentPage).toBe(1);
    });

    it('clamps to totalPages for page > totalPages', async () => {
      const doc = createMockDoc(5);
      mockGetDocument.mockReturnValue({ promise: Promise.resolve(doc) } as any);

      const { result } = renderHook(() => usePdfDocument());

      await act(async () => {
        await result.current.loadPdf(new Uint8Array([1]), 'test.pdf');
      });

      act(() => {
        result.current.goToPage(99);
      });

      expect(result.current.currentPage).toBe(5);
    });
  });

  describe('setScale / setCurrentPage', () => {
    it('setScale sets the scale directly', () => {
      const { result } = renderHook(() => usePdfDocument());

      act(() => {
        result.current.setScale(2.5);
      });

      expect(result.current.scale).toBe(2.5);
    });

    it('setCurrentPage sets the page directly', () => {
      const { result } = renderHook(() => usePdfDocument());

      act(() => {
        result.current.setCurrentPage(3);
      });

      expect(result.current.currentPage).toBe(3);
    });
  });
});
