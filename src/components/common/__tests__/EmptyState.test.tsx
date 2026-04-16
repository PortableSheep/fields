import { render, screen, fireEvent } from '@testing-library/react';
import { EmptyState } from '../EmptyState';
import type { RecentFile } from '../../../lib/storage';

function defaultProps(overrides: Partial<Parameters<typeof EmptyState>[0]> = {}) {
  return {
    onOpenFile: vi.fn(),
    recentFiles: [] as RecentFile[],
    onOpenRecent: vi.fn(),
    ...overrides,
  };
}

describe('EmptyState', () => {
  it('renders the empty-state message', () => {
    render(<EmptyState {...defaultProps()} />);
    expect(screen.getByText('No PDF loaded')).toBeInTheDocument();
    expect(screen.getByText(/Drag a PDF here or click to open a file/)).toBeInTheDocument();
  });

  it('shows recent files list when there are recent files', () => {
    const recentFiles: RecentFile[] = [
      { path: '/docs/a.pdf', name: 'a.pdf', openedAt: '2024-01-01T00:00:00Z' },
      { path: '/docs/b.pdf', name: 'b.pdf', openedAt: '2024-01-02T00:00:00Z' },
    ];
    render(<EmptyState {...defaultProps({ recentFiles })} />);
    expect(screen.getByText('Recent Files')).toBeInTheDocument();
    expect(screen.getByText(/a\.pdf/)).toBeInTheDocument();
    expect(screen.getByText(/b\.pdf/)).toBeInTheDocument();
  });

  it('clicking a recent file calls onOpenRecent with the path', () => {
    const onOpenRecent = vi.fn();
    const recentFiles: RecentFile[] = [
      { path: '/docs/test.pdf', name: 'test.pdf', openedAt: '2024-01-01T00:00:00Z' },
    ];
    render(<EmptyState {...defaultProps({ recentFiles, onOpenRecent })} />);
    fireEvent.click(screen.getByTitle('/docs/test.pdf'));
    expect(onOpenRecent).toHaveBeenCalledWith('/docs/test.pdf');
  });

  it('does not show recent files section when list is empty', () => {
    render(<EmptyState {...defaultProps()} />);
    expect(screen.queryByText('Recent Files')).not.toBeInTheDocument();
  });

  it('calls onOpenFile when clicking the empty state area', () => {
    const onOpenFile = vi.fn();
    render(<EmptyState {...defaultProps({ onOpenFile })} />);
    fireEvent.click(screen.getByText('No PDF loaded'));
    expect(onOpenFile).toHaveBeenCalled();
  });
});
