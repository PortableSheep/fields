import { renderHook, act } from '@testing-library/react';
import { useFieldDetection } from '../useFieldDetection';

vi.mock('../../lib/field-detector', () => ({
  detectHeuristicFields: vi.fn(() => []),
}));

function createMockPage(annotations: any[] = []) {
  return {
    getAnnotations: vi.fn().mockResolvedValue(annotations),
    getViewport: vi.fn(() => ({ width: 612, height: 792, scale: 1 })),
    streamTextContent: vi.fn(() => ({
      getReader: () => ({
        read: vi.fn().mockResolvedValueOnce({ done: true, value: undefined }),
      }),
    })),
  };
}

function createMockPdfDoc(numPages: number, pageOverrides?: Record<number, any>) {
  return {
    numPages,
    getPage: vi.fn(async (pageNum: number) => {
      if (pageOverrides?.[pageNum]) return pageOverrides[pageNum];
      return createMockPage();
    }),
  } as any;
}

describe('useFieldDetection', () => {
  it('starts with empty detectedFields and detecting=false', () => {
    const { result } = renderHook(() => useFieldDetection());
    expect(result.current.detectedFields).toEqual([]);
    expect(result.current.detecting).toBe(false);
  });

  it('detectFields sets detecting=true during detection, false after', async () => {
    const { result } = renderHook(() => useFieldDetection());
    const mockDoc = createMockPdfDoc(1);

    let resolveAnnotations: (v: any[]) => void;
    const page = createMockPage();
    page.getAnnotations.mockReturnValue(
      new Promise<any[]>((r) => {
        resolveAnnotations = r;
      })
    );
    mockDoc.getPage.mockResolvedValue(page);

    let promise: Promise<number>;
    act(() => {
      promise = result.current.detectFields(mockDoc);
    });

    // detecting should be true while awaiting
    expect(result.current.detecting).toBe(true);

    await act(async () => {
      resolveAnnotations!([]);
      await promise!;
    });

    expect(result.current.detecting).toBe(false);
  });

  it('detectFields populates detectedFields with AcroForm widgets', async () => {
    const widgetAnnotation = {
      subtype: 'Widget',
      rect: [100, 200, 300, 250],
      fieldName: 'TestField',
    };
    const page = createMockPage([widgetAnnotation]);
    const mockDoc = createMockPdfDoc(1, { 1: page });

    const { result } = renderHook(() => useFieldDetection());

    await act(async () => {
      await result.current.detectFields(mockDoc);
    });

    expect(result.current.detectedFields.length).toBeGreaterThanOrEqual(1);
    const field = result.current.detectedFields[0];
    expect(field.id).toBe('field-0');
    expect(field.source).toBe('acroform');
    expect(field.label).toBe('TestField');
    expect(field.confidence).toBe(1.0);
    expect(field.accepted).toBe(false);
    expect(field.pageIndex).toBe(0);
    expect(field.fieldType).toBe('text');
  });

  it('detects checkbox field type from AcroForm widget', async () => {
    const checkboxAnnotation = {
      subtype: 'Widget',
      rect: [10, 10, 30, 30],
      fieldName: 'CheckMe',
      checkBox: true,
    };
    const page = createMockPage([checkboxAnnotation]);
    const mockDoc = createMockPdfDoc(1, { 1: page });

    const { result } = renderHook(() => useFieldDetection());

    await act(async () => {
      await result.current.detectFields(mockDoc);
    });

    const field = result.current.detectedFields[0];
    expect(field.fieldType).toBe('checkbox');
  });

  it('returns count of detected fields', async () => {
    const widgets = [
      { subtype: 'Widget', rect: [0, 0, 100, 50], fieldName: 'A' },
      { subtype: 'Widget', rect: [0, 50, 100, 100], fieldName: 'B' },
    ];
    const page = createMockPage(widgets);
    const mockDoc = createMockPdfDoc(1, { 1: page });

    const { result } = renderHook(() => useFieldDetection());

    let count: number = 0;
    await act(async () => {
      count = await result.current.detectFields(mockDoc);
    });

    expect(count).toBe(2);
    expect(result.current.detectedFields).toHaveLength(2);
  });

  it('acceptField marks a field as accepted', async () => {
    const widget = { subtype: 'Widget', rect: [0, 0, 50, 50], fieldName: 'F1' };
    const page = createMockPage([widget]);
    const mockDoc = createMockPdfDoc(1, { 1: page });

    const { result } = renderHook(() => useFieldDetection());

    await act(async () => {
      await result.current.detectFields(mockDoc);
    });

    const fieldId = result.current.detectedFields[0].id;

    act(() => {
      result.current.acceptField(fieldId);
    });

    expect(result.current.detectedFields[0].accepted).toBe(true);
  });

  it('dismissField removes a field from the list', async () => {
    const widget = { subtype: 'Widget', rect: [0, 0, 50, 50], fieldName: 'F1' };
    const page = createMockPage([widget]);
    const mockDoc = createMockPdfDoc(1, { 1: page });

    const { result } = renderHook(() => useFieldDetection());

    await act(async () => {
      await result.current.detectFields(mockDoc);
    });

    const fieldId = result.current.detectedFields[0].id;

    act(() => {
      result.current.dismissField(fieldId);
    });

    expect(result.current.detectedFields).toHaveLength(0);
  });

  it('clearFields resets detectedFields to empty', async () => {
    const widget = { subtype: 'Widget', rect: [0, 0, 50, 50], fieldName: 'F1' };
    const page = createMockPage([widget]);
    const mockDoc = createMockPdfDoc(1, { 1: page });

    const { result } = renderHook(() => useFieldDetection());

    await act(async () => {
      await result.current.detectFields(mockDoc);
    });
    expect(result.current.detectedFields.length).toBeGreaterThan(0);

    act(() => {
      result.current.clearFields();
    });

    expect(result.current.detectedFields).toHaveLength(0);
  });

  it('converts PDF coordinates to screen coordinates', async () => {
    const widget = {
      subtype: 'Widget',
      rect: [100, 200, 300, 250],
      fieldName: 'CoordTest',
    };
    const page = createMockPage([widget]);
    const mockDoc = createMockPdfDoc(1, { 1: page });

    const { result } = renderHook(() => useFieldDetection());

    await act(async () => {
      await result.current.detectFields(mockDoc);
    });

    const field = result.current.detectedFields[0];
    // viewport.height=792, y2=250, y1=200
    // rect.x = x1 = 100, rect.y = 792-250 = 542, width = 200, height = 50
    expect(field.rect).toEqual({ x: 100, y: 542, width: 200, height: 50 });
  });
});
