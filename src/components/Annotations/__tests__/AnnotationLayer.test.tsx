import { render, screen, fireEvent } from '@testing-library/react';
import { AnnotationLayer } from '../AnnotationLayer';
import type { Annotation, ToolType, DetectedField, TextAnnotation, CheckboxAnnotation } from '../../../types/annotations';

vi.mock('../TextAnnotation', () => ({
  TextAnnotation: (props: any) => (
    <div data-testid={`text-annotation-${props.annotation.id}`} onMouseDown={props.onMouseDown}>
      {props.annotation.value}
    </div>
  ),
}));

vi.mock('../CheckboxAnnotation', () => ({
  CheckboxAnnotation: (props: any) => (
    <div data-testid={`checkbox-annotation-${props.annotation.id}`} onMouseDown={props.onMouseDown}>
      {props.annotation.checked ? '✓' : ''}
    </div>
  ),
}));

vi.mock('../DateAnnotation', () => ({
  DateAnnotation: (props: any) => (
    <div data-testid={`date-annotation-${props.annotation.id}`} onMouseDown={props.onMouseDown}>
      {props.annotation.value}
    </div>
  ),
}));

function defaultProps(overrides: Partial<Parameters<typeof AnnotationLayer>[0]> = {}) {
  return {
    pageIndex: 0,
    scale: 1,
    activeTool: null as ToolType,
    annotations: [] as Annotation[],
    selectedId: null as string | null,
    detectedFields: [] as DetectedField[],
    onAnnotationAdd: vi.fn(),
    onAnnotationUpdate: vi.fn(),
    onAnnotationSelect: vi.fn(),
    onFieldAccept: vi.fn(),
    onFieldDismiss: vi.fn(),
    onOpenSignaturePad: vi.fn(),
    ...overrides,
  };
}

const sampleTextAnnotation: TextAnnotation = {
  id: 'txt-1',
  type: 'text',
  pageIndex: 0,
  rect: { x: 10, y: 20, width: 200, height: 24 },
  value: 'Hello',
  fontSize: 14,
  fontFamily: 'sans-serif',
  color: '#000000',
};

const sampleCheckboxAnnotation: CheckboxAnnotation = {
  id: 'cb-1',
  type: 'checkbox',
  pageIndex: 0,
  rect: { x: 50, y: 60, width: 20, height: 20 },
  checked: true,
  showBorder: true,
};

const sampleDetectedField: DetectedField = {
  id: 'field-1',
  pageIndex: 0,
  rect: { x: 100, y: 100, width: 150, height: 30 },
  label: 'Name',
  fieldType: 'text',
  confidence: 0.9,
  source: 'acroform',
  accepted: false,
};

describe('AnnotationLayer', () => {
  it('renders existing annotations', () => {
    render(
      <AnnotationLayer
        {...defaultProps({ annotations: [sampleTextAnnotation, sampleCheckboxAnnotation] })}
      />,
    );
    expect(screen.getByTestId('text-annotation-txt-1')).toBeInTheDocument();
    expect(screen.getByTestId('checkbox-annotation-cb-1')).toBeInTheDocument();
  });

  it('calls onAnnotationAdd when clicking with an active tool', () => {
    const onAnnotationAdd = vi.fn();
    const { container } = render(
      <AnnotationLayer {...defaultProps({ activeTool: 'text', onAnnotationAdd })} />,
    );
    const layer = container.querySelector('.annotation-layer')!;
    fireEvent.click(layer, { clientX: 100, clientY: 100 });
    expect(onAnnotationAdd).toHaveBeenCalled();
    expect(onAnnotationAdd.mock.calls[0][0]).toBe('text');
  });

  it('does NOT create annotation when tool is null', () => {
    const onAnnotationAdd = vi.fn();
    const onAnnotationSelect = vi.fn();
    const { container } = render(
      <AnnotationLayer {...defaultProps({ activeTool: null, onAnnotationAdd, onAnnotationSelect })} />,
    );
    const layer = container.querySelector('.annotation-layer')!;
    fireEvent.click(layer);
    expect(onAnnotationAdd).not.toHaveBeenCalled();
    expect(onAnnotationSelect).toHaveBeenCalledWith(null);
  });

  it('does NOT create annotation when tool is "select"', () => {
    const onAnnotationAdd = vi.fn();
    const onAnnotationSelect = vi.fn();
    const { container } = render(
      <AnnotationLayer {...defaultProps({ activeTool: 'select', onAnnotationAdd, onAnnotationSelect })} />,
    );
    const layer = container.querySelector('.annotation-layer')!;
    fireEvent.click(layer);
    expect(onAnnotationAdd).not.toHaveBeenCalled();
    expect(onAnnotationSelect).toHaveBeenCalledWith(null);
  });

  it('shows detected field suggestions as overlays', () => {
    render(
      <AnnotationLayer {...defaultProps({ detectedFields: [sampleDetectedField] })} />,
    );
    expect(screen.getByText('Name')).toBeInTheDocument();
  });

  it('clicking a field suggestion calls onFieldAccept and onAnnotationAdd', () => {
    const onFieldAccept = vi.fn();
    const onAnnotationAdd = vi.fn();
    render(
      <AnnotationLayer
        {...defaultProps({ detectedFields: [sampleDetectedField], onFieldAccept, onAnnotationAdd })}
      />,
    );
    fireEvent.click(screen.getByText('Name'));
    expect(onFieldAccept).toHaveBeenCalledWith('field-1');
    expect(onAnnotationAdd).toHaveBeenCalledWith('text', 0, sampleDetectedField.rect);
  });

  it('opens signature pad instead of adding annotation for signature tool', () => {
    const onOpenSignaturePad = vi.fn();
    const onAnnotationAdd = vi.fn();
    const { container } = render(
      <AnnotationLayer
        {...defaultProps({ activeTool: 'signature', onOpenSignaturePad, onAnnotationAdd })}
      />,
    );
    const layer = container.querySelector('.annotation-layer')!;
    fireEvent.click(layer, { clientX: 50, clientY: 50 });
    expect(onOpenSignaturePad).toHaveBeenCalled();
    expect(onAnnotationAdd).not.toHaveBeenCalled();
  });
});
