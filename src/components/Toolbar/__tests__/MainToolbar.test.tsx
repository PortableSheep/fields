import { render, screen, fireEvent } from '@testing-library/react';
import { MainToolbar } from '../MainToolbar';
import type { ToolType, Annotation, TextAnnotation, CheckboxAnnotation } from '../../../types/annotations';

function defaultProps(overrides: Partial<Parameters<typeof MainToolbar>[0]> = {}) {
  return {
    activeTool: null as ToolType,
    onToolChange: vi.fn(),
    onOpenFile: vi.fn(),
    onSave: vi.fn(),
    onUndo: vi.fn(),
    onRedo: vi.fn(),
    onDetectFields: vi.fn(),
    onToggleHistory: vi.fn(),
    canUndo: false,
    canRedo: false,
    hasPdf: true,
    detecting: false,
    historyOpen: false,
    scale: 1,
    onZoomIn: vi.fn(),
    onZoomOut: vi.fn(),
    selected: null as Annotation | null,
    onDeleteSelected: vi.fn(),
    onUpdateSelected: vi.fn(),
    ...overrides,
  };
}

describe('MainToolbar', () => {
  it('renders tool buttons (text, checkbox, date, signature)', () => {
    render(<MainToolbar {...defaultProps()} />);
    expect(screen.getByTitle('Text Tool (T)')).toBeInTheDocument();
    expect(screen.getByTitle('Checkbox Tool (C)')).toBeInTheDocument();
    expect(screen.getByTitle('Date Tool (D)')).toBeInTheDocument();
    expect(screen.getByTitle('Signature Tool (S)')).toBeInTheDocument();
  });

  it('marks the active tool button with "active" class', () => {
    render(<MainToolbar {...defaultProps({ activeTool: 'text' })} />);
    const btn = screen.getByTitle('Text Tool (T)');
    expect(btn).toHaveClass('active');
    expect(screen.getByTitle('Checkbox Tool (C)')).not.toHaveClass('active');
  });

  it('calls onToolChange with the correct tool type on click', () => {
    const onToolChange = vi.fn();
    render(<MainToolbar {...defaultProps({ onToolChange })} />);
    fireEvent.click(screen.getByTitle('Text Tool (T)'));
    expect(onToolChange).toHaveBeenCalledWith('text');
  });

  it('deactivates tool when clicking the already-active tool', () => {
    const onToolChange = vi.fn();
    render(<MainToolbar {...defaultProps({ activeTool: 'text', onToolChange })} />);
    fireEvent.click(screen.getByTitle('Text Tool (T)'));
    expect(onToolChange).toHaveBeenCalledWith(null);
  });

  it('disables tool buttons when hasPdf=false', () => {
    render(<MainToolbar {...defaultProps({ hasPdf: false })} />);
    expect(screen.getByTitle('Text Tool (T)')).toBeDisabled();
    expect(screen.getByTitle('Checkbox Tool (C)')).toBeDisabled();
    expect(screen.getByTitle('Date Tool (D)')).toBeDisabled();
    expect(screen.getByTitle('Signature Tool (S)')).toBeDisabled();
  });

  it('shows font controls when a text annotation is selected', () => {
    const textAnnotation: TextAnnotation = {
      id: 'txt-1',
      type: 'text',
      pageIndex: 0,
      rect: { x: 0, y: 0, width: 200, height: 24 },
      value: 'Hello',
      fontSize: 14,
      fontFamily: 'sans-serif',
      color: '#000000',
    };
    render(<MainToolbar {...defaultProps({ selected: textAnnotation })} />);
    expect(screen.getByTitle('Font Size')).toBeInTheDocument();
    expect(screen.getByTitle('Color')).toBeInTheDocument();
  });

  it('shows border toggle when a checkbox annotation is selected', () => {
    const cbAnnotation: CheckboxAnnotation = {
      id: 'cb-1',
      type: 'checkbox',
      pageIndex: 0,
      rect: { x: 0, y: 0, width: 20, height: 20 },
      checked: false,
      showBorder: true,
    };
    render(<MainToolbar {...defaultProps({ selected: cbAnnotation })} />);
    expect(screen.getByText('Border')).toBeInTheDocument();
  });

  it('does not show font controls when no annotation is selected', () => {
    render(<MainToolbar {...defaultProps()} />);
    expect(screen.queryByTitle('Font Size')).not.toBeInTheDocument();
  });

  it('undo button is disabled when canUndo=false', () => {
    render(<MainToolbar {...defaultProps({ canUndo: false })} />);
    expect(screen.getByTitle('Undo (Ctrl+Z)')).toBeDisabled();
  });

  it('undo button is enabled when canUndo=true', () => {
    render(<MainToolbar {...defaultProps({ canUndo: true })} />);
    expect(screen.getByTitle('Undo (Ctrl+Z)')).not.toBeDisabled();
  });

  it('redo button is disabled when canRedo=false', () => {
    render(<MainToolbar {...defaultProps({ canRedo: false })} />);
    expect(screen.getByTitle('Redo (Ctrl+Y)')).toBeDisabled();
  });

  it('redo button is enabled when canRedo=true', () => {
    render(<MainToolbar {...defaultProps({ canRedo: true })} />);
    expect(screen.getByTitle('Redo (Ctrl+Y)')).not.toBeDisabled();
  });
});
