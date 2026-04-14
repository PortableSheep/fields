import { useState, useCallback, useEffect, useRef } from 'react';
import { open, save, ask } from '@tauri-apps/plugin-dialog';
import { readFile, writeFile } from '@tauri-apps/plugin-fs';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { usePdfDocument } from './hooks/usePdfDocument';
import { useAnnotations } from './hooks/useAnnotations';
import { useFieldDetection } from './hooks/useFieldDetection';
import { useHistory } from './hooks/useHistory';
import { savePdf } from './lib/pdf-saver';
import {
  loadSavedSignatures,
  saveSignature,
  deleteSavedSignature,
  loadRecentFiles,
  addRecentFile,
  type SavedSignature,
  type RecentFile,
} from './lib/storage';
import { MainToolbar } from './components/Toolbar/MainToolbar';
import { PdfViewer } from './components/Viewer/PdfViewer';
import { Thumbnails } from './components/Viewer/Thumbnails';
import { EmptyState } from './components/common/EmptyState';
import { SignaturePad } from './components/Annotations/SignaturePad';
import { HistoryPanel } from './components/History/HistoryPanel';
import type { ToolType, AnnotationType, Rect } from './types/annotations';
import type { Snapshot } from './lib/history';
import './styles/globals.css';

function App() {
  const pdf = usePdfDocument();
  const ann = useAnnotations();
  const fields = useFieldDetection();
  const history = useHistory();
  const [activeTool, setActiveTool] = useState<ToolType>(null);
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const sigPlacementRef = useRef<{ pageIndex: number; rect: Rect } | null>(null);
  const [filePath, setFilePath] = useState<string | null>(null);
  const [savedSignatures, setSavedSignatures] = useState<SavedSignature[]>([]);
  const [recentFiles, setRecentFiles] = useState<RecentFile[]>([]);
  const [notification, setNotification] = useState<string | null>(null);
  const notifTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const snapshotTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showNotification = useCallback((msg: string, durationMs = 4000) => {
    if (notifTimerRef.current) clearTimeout(notifTimerRef.current);
    setNotification(msg);
    notifTimerRef.current = setTimeout(() => setNotification(null), durationMs);
  }, []);

  // Load saved data on mount
  useEffect(() => {
    loadSavedSignatures().then(setSavedSignatures).catch(() => {});
    loadRecentFiles().then(setRecentFiles).catch(() => {});
  }, []);

  // Dirty check — returns true if safe to proceed, false if user cancelled
  const confirmDiscardIfDirty = useCallback(async (): Promise<boolean> => {
    if (!ann.isDirty) return true;
    const answer = await ask('You have unsaved changes. Do you want to save before continuing?', {
      title: 'Unsaved Changes',
      kind: 'warning',
      okLabel: 'Save',
      cancelLabel: 'Discard',
    });
    if (answer) {
      // User chose "Save" — trigger save flow
      if (pdf.pdfBytes) {
        const savePath = await save({
          filters: [{ name: 'PDF', extensions: ['pdf'] }],
          defaultPath: filePath || undefined,
        });
        if (savePath) {
          const resultBytes = await savePdf(pdf.pdfBytes, ann.annotations, false);
          await writeFile(savePath, resultBytes);
          ann.markClean();
        } else {
          // User cancelled the save dialog — abort the whole operation
          return false;
        }
      }
    }
    // answer=false means "Discard" — proceed without saving
    return true;
  }, [ann, pdf.pdfBytes, filePath]);

  const openPdfByPath = useCallback(async (path: string) => {
    try {
      if (!(await confirmDiscardIfDirty())) return;

      // Snapshot current state before switching files
      if (filePath && ann.annotations.length > 0) {
        await history.addSnapshot(filePath, ann.annotations, 'Before opening another file');
      }

      const bytes = await readFile(path);
      const name = path.split('/').pop() || path.split('\\').pop() || 'document.pdf';
      await pdf.loadPdf(new Uint8Array(bytes), name);
      setFilePath(path);
      fields.clearFields();
      ann.markClean();
      addRecentFile(path, name).then(() => loadRecentFiles().then(setRecentFiles));

      // Load history for the new file
      await history.loadHistory(path);
    } catch (err) {
      console.error('Failed to open file:', err);
    }
  }, [pdf, fields, ann, history, filePath, confirmDiscardIfDirty]);

  const handleOpenFile = useCallback(async () => {
    try {
      if (!(await confirmDiscardIfDirty())) return;

      const selected = await open({
        multiple: false,
        filters: [{ name: 'PDF', extensions: ['pdf'] }],
      });
      if (!selected) return;

      const path = typeof selected === 'string' ? selected : (selected as any).path;
      // Snapshot current state before switching files
      if (filePath && ann.annotations.length > 0) {
        await history.addSnapshot(filePath, ann.annotations, 'Before opening another file');
      }

      const bytes = await readFile(path as string);
      const name = (path as string).split('/').pop() || (path as string).split('\\').pop() || 'document.pdf';
      await pdf.loadPdf(new Uint8Array(bytes), name);
      setFilePath(path as string);
      fields.clearFields();
      ann.markClean();
      addRecentFile(path as string, name).then(() => loadRecentFiles().then(setRecentFiles));
      await history.loadHistory(path as string);
    } catch (err) {
      console.error('Failed to open file:', err);
    }
  }, [pdf, fields, ann, history, filePath, confirmDiscardIfDirty]);

  const handleSave = useCallback(
    async (flatten: boolean) => {
      if (!pdf.pdfBytes) return;
      try {
        const savePath = await save({
          filters: [{ name: 'PDF', extensions: ['pdf'] }],
          defaultPath: filePath || undefined,
        });
        if (!savePath) return;

        const resultBytes = await savePdf(pdf.pdfBytes, ann.annotations, flatten);
        await writeFile(savePath, resultBytes);
        ann.markClean();

        // Snapshot on save
        if (filePath) {
          await history.addSnapshot(filePath, ann.annotations, 'Manual save');
        }
      } catch (err) {
        console.error('Failed to save:', err);
      }
    },
    [pdf.pdfBytes, ann, filePath, history]
  );

  const handleDetectFields = useCallback(async () => {
    if (pdf.pdfDoc) {
      const count = await fields.detectFields(pdf.pdfDoc);
      if (count > 0) {
        showNotification(`Found ${count} field${count !== 1 ? 's' : ''} across ${pdf.totalPages} page${pdf.totalPages !== 1 ? 's' : ''}. Click to accept, right-click to dismiss.`);
      } else {
        showNotification('No fields detected. The PDF may be image-based or use non-standard formatting. Check DevTools console for details.');
      }
    }
  }, [pdf.pdfDoc, fields, showNotification]);

  const handleAnnotationAdd = useCallback(
    (type: Exclude<ToolType, 'select' | null>, pageIndex: number, rect: Rect) => {
      ann.addAnnotation(type as AnnotationType, pageIndex, rect);
    },
    [ann]
  );

  const handleOpenSignaturePad = useCallback(
    (pageIndex: number, rect: Rect) => {
      sigPlacementRef.current = { pageIndex, rect };
      setShowSignaturePad(true);
    },
    []
  );

  const handleSignatureSave = useCallback(
    (dataUrl: string) => {
      const placement = sigPlacementRef.current;
      if (!placement) return;
      ann.addAnnotation('signature', placement.pageIndex, placement.rect, {
        dataUrl,
      } as any);
      setShowSignaturePad(false);
      sigPlacementRef.current = null;
      // Persist for reuse
      saveSignature(dataUrl).then(() =>
        loadSavedSignatures().then(setSavedSignatures)
      );
    },
    [ann]
  );

  const handleDeleteSavedSignature = useCallback(async (id: string) => {
    await deleteSavedSignature(id);
    const updated = await loadSavedSignatures();
    setSavedSignatures(updated);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey;

      if (isMod && e.key === 'o') {
        e.preventDefault();
        handleOpenFile();
      } else if (isMod && e.shiftKey && e.key === 's') {
        e.preventDefault();
        handleSave(true);
      } else if (isMod && e.key === 's') {
        e.preventDefault();
        handleSave(false);
      } else if (isMod && e.key === 'z') {
        e.preventDefault();
        ann.undo();
      } else if (isMod && e.key === 'y') {
        e.preventDefault();
        ann.redo();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        const target = e.target as HTMLElement;
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA' && target.tagName !== 'SELECT') {
          ann.deleteSelected();
        }
      } else if (e.key === 'Escape') {
        if (ann.selectedId) {
          // First ESC: deselect the annotation, keep current tool
          ann.setSelectedId(null);
        } else if (activeTool && activeTool !== 'select') {
          // Second ESC: switch back to pointer mode
          setActiveTool(null);
        }
      } else if (e.key === 't' && !isMod && document.activeElement === document.body) {
        setActiveTool('text');
      } else if (e.key === 'c' && !isMod && document.activeElement === document.body) {
        setActiveTool('checkbox');
      } else if (e.key === 'd' && !isMod && document.activeElement === document.body) {
        setActiveTool('date');
      } else if (e.key === 's' && !isMod && document.activeElement === document.body) {
        setActiveTool('signature');
      } else if (e.key === '=' || e.key === '+') {
        if (!isMod) pdf.zoomIn();
      } else if (e.key === '-') {
        if (!isMod) pdf.zoomOut();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleOpenFile, handleSave, ann, pdf, activeTool]);

  // Close guard — intercept window close if dirty
  useEffect(() => {
    const appWindow = getCurrentWindow();
    const unlisten = appWindow.onCloseRequested(async (event) => {
      if (!ann.isDirty) return;

      event.preventDefault();
      const answer = await ask('You have unsaved changes. Do you want to save before closing?', {
        title: 'Unsaved Changes',
        kind: 'warning',
        okLabel: 'Save',
        cancelLabel: 'Close Without Saving',
      });

      if (answer) {
        // Save first
        if (pdf.pdfBytes) {
          const savePath = await save({
            filters: [{ name: 'PDF', extensions: ['pdf'] }],
            defaultPath: filePath || undefined,
          });
          if (savePath) {
            const resultBytes = await savePdf(pdf.pdfBytes, ann.annotations, false);
            await writeFile(savePath, resultBytes);
          } else {
            return; // User cancelled save dialog — stay open
          }
        }
      }

      // Snapshot before closing
      if (filePath && ann.annotations.length > 0) {
        await history.addSnapshot(filePath, ann.annotations, 'Before close');
      }

      await appWindow.destroy();
    });

    return () => { unlisten.then((fn) => fn()); };
  }, [ann, pdf.pdfBytes, filePath, history]);

  // Auto-snapshot — debounced 5s after last annotation change
  useEffect(() => {
    if (!filePath || !ann.isDirty || ann.annotations.length === 0) return;

    if (snapshotTimerRef.current) clearTimeout(snapshotTimerRef.current);
    snapshotTimerRef.current = setTimeout(() => {
      history.addSnapshot(filePath, ann.annotations).catch(() => {});
    }, 5000);

    return () => {
      if (snapshotTimerRef.current) clearTimeout(snapshotTimerRef.current);
    };
  }, [ann.annotations, ann.isDirty, filePath, history]);

  // Restore snapshot handler
  const handleRestoreSnapshot = useCallback(
    (snapshot: Snapshot) => {
      ann.replaceAnnotations(snapshot.annotations);
      showNotification(`Restored snapshot from ${new Date(snapshot.timestamp).toLocaleString()}`);
    },
    [ann, showNotification]
  );

  const handleClearHistory = useCallback(() => {
    if (filePath) {
      history.clearHistory(filePath);
      showNotification('History cleared');
    }
  }, [filePath, history, showNotification]);

  // Drag and drop
  useEffect(() => {
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };

    const handleDrop = async (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const files = e.dataTransfer?.files;
      if (!files || files.length === 0) return;
      const file = files[0];
      if (!file.name.toLowerCase().endsWith('.pdf')) return;

      if (!(await confirmDiscardIfDirty())) return;

      if (filePath && ann.annotations.length > 0) {
        await history.addSnapshot(filePath, ann.annotations, 'Before drag-drop open');
      }

      const bytes = new Uint8Array(await file.arrayBuffer());
      await pdf.loadPdf(bytes, file.name);
      fields.clearFields();
      ann.markClean();
    };

    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('drop', handleDrop);
    return () => {
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('drop', handleDrop);
    };
  }, [pdf, fields, ann, history, filePath, confirmDiscardIfDirty]);

  // Pinch-to-zoom (trackpad pinch reports as wheel with ctrlKey)
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const delta = -e.deltaY * 0.01;
      pdf.setScale((s: number) => Math.max(0.25, Math.min(5.0, s + delta)));
    };

    const viewer = document.querySelector('.viewer');
    if (viewer) {
      viewer.addEventListener('wheel', handleWheel as EventListener, { passive: false });
      return () => viewer.removeEventListener('wheel', handleWheel as EventListener);
    }
  }, [pdf]);

  const hasPdf = !!pdf.pdfDoc;

  return (
    <div className={`app-layout ${!hasPdf ? 'no-sidebar' : ''}`}>
      <MainToolbar
        activeTool={activeTool}
        onToolChange={setActiveTool}
        onOpenFile={handleOpenFile}
        onSave={handleSave}
        onUndo={ann.undo}
        onRedo={ann.redo}
        onDetectFields={handleDetectFields}
        onToggleHistory={() => setShowHistory((v) => !v)}
        canUndo={ann.canUndo}
        canRedo={ann.canRedo}
        hasPdf={hasPdf}
        detecting={fields.detecting}
        historyOpen={showHistory}
        scale={pdf.scale}
        onZoomIn={pdf.zoomIn}
        onZoomOut={pdf.zoomOut}
        selected={ann.selected}
        onDeleteSelected={ann.deleteSelected}
        onUpdateSelected={(updates) => {
          if (ann.selectedId) ann.updateAnnotation(ann.selectedId, updates);
        }}
      />

      {hasPdf && (
        <Thumbnails
          pdfDoc={pdf.pdfDoc!}
          totalPages={pdf.totalPages}
          currentPage={pdf.currentPage}
          onPageSelect={(page) => {
            pdf.goToPage(page);
            const el = document.querySelector(`[data-page="${page}"]`);
            el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }}
        />
      )}

      {hasPdf ? (
        <PdfViewer
          pdfDoc={pdf.pdfDoc!}
          totalPages={pdf.totalPages}
          currentPage={pdf.currentPage}
          scale={pdf.scale}
          activeTool={activeTool}
          annotations={ann.annotations}
          selectedId={ann.selectedId}
          detectedFields={fields.detectedFields}
          onSetCurrentPage={pdf.setCurrentPage}
          onAnnotationAdd={handleAnnotationAdd}
          onAnnotationUpdate={ann.updateAnnotation}
          onAnnotationSelect={ann.setSelectedId}
          onFieldAccept={fields.acceptField}
          onFieldDismiss={fields.dismissField}
          onOpenSignaturePad={handleOpenSignaturePad}
        />
      ) : (
        <EmptyState onOpenFile={handleOpenFile} recentFiles={recentFiles} onOpenRecent={openPdfByPath} />
      )}

      <div className="statusbar">
        <span>
          {hasPdf
            ? `${pdf.fileName}${ann.isDirty ? ' •' : ''} — Page ${pdf.currentPage} of ${pdf.totalPages}`
            : 'No file loaded'}
        </span>
        <span>
          {ann.annotations.length > 0
            ? `${ann.annotations.length} annotation${ann.annotations.length !== 1 ? 's' : ''}`
            : ''}
        </span>
      </div>

      {showHistory && hasPdf && (
        <HistoryPanel
          snapshots={history.snapshots}
          loading={history.loading}
          onRestore={handleRestoreSnapshot}
          onClear={handleClearHistory}
          onClose={() => setShowHistory(false)}
        />
      )}

      {showSignaturePad && (
        <SignaturePad
          onSave={handleSignatureSave}
          onCancel={() => {
            setShowSignaturePad(false);
            sigPlacementRef.current = null;
          }}
          savedSignatures={savedSignatures}
          onDeleteSaved={handleDeleteSavedSignature}
        />
      )}

      {notification && (
        <div className="notification-toast">{notification}</div>
      )}
    </div>
  );
}

export default App;
