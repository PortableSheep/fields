import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TextAnnotation } from '../TextAnnotation';
import type { TextAnnotation as TextAnnotationType } from '../../../types/annotations';

function makeAnnotation(overrides: Partial<TextAnnotationType> = {}): TextAnnotationType {
  return {
    id: 'txt-1',
    type: 'text',
    pageIndex: 0,
    rect: { x: 10, y: 20, width: 200, height: 24 },
    value: 'Hello',
    fontSize: 14,
    fontFamily: 'sans-serif',
    color: '#000000',
    ...overrides,
  };
}

function defaultProps(overrides: Partial<Parameters<typeof TextAnnotation>[0]> = {}) {
  return {
    annotation: makeAnnotation(),
    scale: 1,
    isSelected: false,
    style: { left: 10, top: 20, width: 200, height: 24 },
    onMouseDown: vi.fn(),
    onUpdate: vi.fn(),
    ...overrides,
  };
}

describe('TextAnnotation', () => {
  it('renders a textarea with the annotation value', () => {
    render(<TextAnnotation {...defaultProps()} />);
    const textarea = screen.getByPlaceholderText('Type here...');
    expect(textarea).toBeInTheDocument();
    expect(textarea).toHaveValue('Hello');
  });

  it('applies font styling scaled by the scale prop', () => {
    const props = defaultProps({
      annotation: makeAnnotation({ fontSize: 16, fontFamily: 'serif', color: '#ff0000' }),
      scale: 2,
    });
    render(<TextAnnotation {...props} />);
    const textarea = screen.getByPlaceholderText('Type here...');
    expect(textarea).toHaveStyle({ fontSize: '32px', fontFamily: 'serif', color: '#ff0000' });
  });

  it('maps "handwriting" fontFamily to cursive stack', () => {
    const props = defaultProps({
      annotation: makeAnnotation({ fontFamily: 'handwriting' }),
    });
    render(<TextAnnotation {...props} />);
    const textarea = screen.getByPlaceholderText('Type here...');
    expect(textarea.style.fontFamily).toContain('Caveat');
  });

  it('calls onUpdate when text changes', async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn();
    render(<TextAnnotation {...defaultProps({ onUpdate, isSelected: true })} />);
    const textarea = screen.getByPlaceholderText('Type here...');
    await user.clear(textarea);
    await user.type(textarea, 'World');
    expect(onUpdate).toHaveBeenCalled();
    const lastCall = onUpdate.mock.calls[onUpdate.mock.calls.length - 1][0];
    expect(lastCall).toHaveProperty('value');
  });

  it('stops click propagation on the textarea', () => {
    const parentClick = vi.fn();
    render(
      <div onClick={parentClick}>
        <TextAnnotation {...defaultProps()} />
      </div>,
    );
    const textarea = screen.getByPlaceholderText('Type here...');
    fireEvent.click(textarea);
    expect(parentClick).not.toHaveBeenCalled();
  });

  it('shows resize handles when selected', () => {
    const { container } = render(<TextAnnotation {...defaultProps({ isSelected: true })} />);
    expect(container.querySelectorAll('.resize-handle')).toHaveLength(4);
  });

  it('hides resize handles when not selected', () => {
    const { container } = render(<TextAnnotation {...defaultProps({ isSelected: false })} />);
    expect(container.querySelectorAll('.resize-handle')).toHaveLength(0);
  });
});
