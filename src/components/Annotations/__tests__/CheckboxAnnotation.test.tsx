import { render, fireEvent } from '@testing-library/react';
import { CheckboxAnnotation } from '../CheckboxAnnotation';
import type { CheckboxAnnotation as CheckboxAnnotationType } from '../../../types/annotations';

function makeAnnotation(overrides: Partial<CheckboxAnnotationType> = {}): CheckboxAnnotationType {
  return {
    id: 'cb-1',
    type: 'checkbox',
    pageIndex: 0,
    rect: { x: 10, y: 20, width: 20, height: 20 },
    checked: false,
    showBorder: true,
    ...overrides,
  };
}

function defaultProps(overrides: Partial<Parameters<typeof CheckboxAnnotation>[0]> = {}) {
  return {
    annotation: makeAnnotation(),
    scale: 1,
    isSelected: false,
    style: { left: 10, top: 20, width: 20, height: 20 },
    onMouseDown: vi.fn(),
    onUpdate: vi.fn(),
    ...overrides,
  };
}

describe('CheckboxAnnotation', () => {
  it('renders checkmark when checked=true', () => {
    const { container } = render(
      <CheckboxAnnotation {...defaultProps({ annotation: makeAnnotation({ checked: true }) })} />,
    );
    const checkbox = container.querySelector('.checkbox-annotation')!;
    expect(checkbox.textContent).toBe('✓');
  });

  it('renders non-breaking space (visually empty) when checked=false', () => {
    const { container } = render(
      <CheckboxAnnotation {...defaultProps({ annotation: makeAnnotation({ checked: false }) })} />,
    );
    const checkbox = container.querySelector('.checkbox-annotation')!;
    expect(checkbox.textContent).toBe('\u00A0');
  });

  it('calls onUpdate toggling checked on click', () => {
    const onUpdate = vi.fn();
    const { container } = render(
      <CheckboxAnnotation {...defaultProps({ onUpdate, annotation: makeAnnotation({ checked: false }) })} />,
    );
    const checkbox = container.querySelector('.checkbox-annotation')!;
    fireEvent.click(checkbox);
    expect(onUpdate).toHaveBeenCalledWith({ checked: true });
  });

  it('toggles from checked to unchecked on click', () => {
    const onUpdate = vi.fn();
    const { container } = render(
      <CheckboxAnnotation {...defaultProps({ onUpdate, annotation: makeAnnotation({ checked: true }) })} />,
    );
    const checkbox = container.querySelector('.checkbox-annotation')!;
    fireEvent.click(checkbox);
    expect(onUpdate).toHaveBeenCalledWith({ checked: false });
  });

  it('shows border when showBorder=true', () => {
    const { container } = render(
      <CheckboxAnnotation {...defaultProps({ annotation: makeAnnotation({ showBorder: true }) })} />,
    );
    const checkbox = container.querySelector('.checkbox-annotation') as HTMLElement;
    expect(checkbox.style.border).toContain('solid');
  });

  it('hides border when showBorder=false', () => {
    const { container } = render(
      <CheckboxAnnotation {...defaultProps({ annotation: makeAnnotation({ showBorder: false }) })} />,
    );
    const checkbox = container.querySelector('.checkbox-annotation') as HTMLElement;
    expect(checkbox.style.borderStyle).toBe('none');
  });

  it('stops click propagation', () => {
    const parentClick = vi.fn();
    const { container } = render(
      <div onClick={parentClick}>
        <CheckboxAnnotation {...defaultProps()} />
      </div>,
    );
    const checkbox = container.querySelector('.checkbox-annotation')!;
    fireEvent.click(checkbox);
    expect(parentClick).not.toHaveBeenCalled();
  });
});
