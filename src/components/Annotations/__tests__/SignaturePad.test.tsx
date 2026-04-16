import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SignaturePad } from '../SignaturePad';
import type { SavedSignature } from '../../../lib/storage';

function defaultProps(overrides: Partial<Parameters<typeof SignaturePad>[0]> = {}) {
  return {
    onSave: vi.fn(),
    onCancel: vi.fn(),
    savedSignatures: [] as SavedSignature[],
    onDeleteSaved: vi.fn(),
    ...overrides,
  };
}

describe('SignaturePad', () => {
  it('renders draw and type tabs', () => {
    render(<SignaturePad {...defaultProps()} />);
    expect(screen.getByText(/Draw/)).toBeInTheDocument();
    expect(screen.getByText(/Type/)).toBeInTheDocument();
  });

  it('shows the draw canvas by default', () => {
    const { container } = render(<SignaturePad {...defaultProps()} />);
    const canvas = container.querySelector('canvas.signature-canvas');
    expect(canvas).toBeInTheDocument();
  });

  it('type tab shows a text input', async () => {
    const user = userEvent.setup();
    render(<SignaturePad {...defaultProps()} />);
    await user.click(screen.getByText(/Type/));
    expect(screen.getByPlaceholderText('Type your name...')).toBeInTheDocument();
  });

  it('has a cancel button that calls onCancel', () => {
    const onCancel = vi.fn();
    render(<SignaturePad {...defaultProps({ onCancel })} />);
    fireEvent.click(screen.getByText('Cancel'));
    expect(onCancel).toHaveBeenCalled();
  });

  it('has an Apply Signature button that is disabled initially', () => {
    render(<SignaturePad {...defaultProps()} />);
    expect(screen.getByText('Apply Signature')).toBeDisabled();
  });

  it('shows saved signatures section when there are saved signatures', () => {
    const savedSignatures: SavedSignature[] = [
      { id: 'sig-1', dataUrl: 'data:image/png;base64,abc', createdAt: '2024-01-01', label: 'My Sig' },
    ];
    render(<SignaturePad {...defaultProps({ savedSignatures })} />);
    expect(screen.getByText('Saved Signatures')).toBeInTheDocument();
    expect(screen.getByAltText('My Sig')).toBeInTheDocument();
  });

  it('does not show saved signatures section when there are none', () => {
    render(<SignaturePad {...defaultProps()} />);
    expect(screen.queryByText('Saved Signatures')).not.toBeInTheDocument();
  });

  it('clicking a saved signature calls onSave with its dataUrl', () => {
    const onSave = vi.fn();
    const savedSignatures: SavedSignature[] = [
      { id: 'sig-1', dataUrl: 'data:image/png;base64,abc', createdAt: '2024-01-01', label: 'My Sig' },
    ];
    render(<SignaturePad {...defaultProps({ onSave, savedSignatures })} />);
    fireEvent.click(screen.getByAltText('My Sig'));
    expect(onSave).toHaveBeenCalledWith('data:image/png;base64,abc');
  });

  it('has a clear button', () => {
    render(<SignaturePad {...defaultProps()} />);
    expect(screen.getByText('Clear')).toBeInTheDocument();
  });
});
