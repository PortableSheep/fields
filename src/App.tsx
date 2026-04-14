import { useState, useCallback, useEffect, useRef } from 'react';
import { open, save } from '@tauri-apps/plugin-dialog';
import { readFile, writeFile } from '@tauri-apps/plugin-fs';
import { usePdfDocument } from './hooks/usePdfDocument';
import { useAnnotations } from './hooks/useAnnotations';
import { useFieldDetection } from './hooks/useFieldDetection';
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
import type { ToolType, AnnotationType, Rect } from './types/annotations';
import './styles/globals.css';

function App() {
  const pdf = usePdfDocument();
  const ann = useAnnotations();
  const fields = useFieldDetection();
  const [activeTool, setActiveTool] = useState<ToolType>(null);
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const sigPlacementRef = useRef<{ pageIndex: number; rect: Rect } | null>(null);
  const [filePath, setFilePath] = useState<string | null>(null);
  const [savedSignatures, setSavedSignatures] = useState<SavedSignature[]>([]);
  const [recentFiles, setRecentFiles] = useState<RecentFile[]>([]);

  // Load saved data on mount
  useEffect(() => {
    loadSavedSignatures().then(setSavedSignatures).catch(() => {});
    loadRecentFiles().then(setRecentFiles).catch(() => {});
  }, []);

  const openPdfByPath = useCallback(async (path: string) => {
    try {
      const bytes = await readFile(path);
      const name = path.split('/').pop() || path.split('\\').pop() || 'document.pdf';
      await pdf.loadPdf(new Uint8Array(bytes), name);
      setFilePath(path);
      fields.clearFields();
      addRecentFile(path, name).then(() => loadRecentFiles().then(setRecentFiles));
    } catch (err) {
      console.error('Failed to open file:', err);
    }
  }, [pdf, fields]);

  const handleOpenFile = useCallback(async () => {
    try {
      const selected = await open({
        multiple: false,
        filters: [{ name: 'PDF', extensions: ['pdf'] }],
      });
      if (!selected) return;

      const path = typeof selected === 'string' ? selected : (selected as any).path;
      await openPdfByPath(path as string);
    } catch (err) {
      console.error('Failed to open file:', err);
    }
  }, [pdf, fields]);

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
      } catch (err) {
        console.error('Failed to save:', err);
      }
    },
    [pdf.pdfBytes, ann.annotations, filePath]
  );

  const handleDetectFields = useCallback(async () => {
    if (pdf.pdfDoc) {
      await fields.detectFields(pdf.pdfDoc);
    }
  }, [pdf.pdfDoc, fields]);

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
        setActiveTool(null);
        ann.setSelectedId(null);
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
  }, [handleOpenFile, handleSave, ann, pdf]);

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
      const bytes = new Uint8Array(await file.arrayBuffer());
      await pdf.loadPdf(bytes, file.name);
      fields.clearFields();
    };

    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('drop', handleDrop);
    return () => {
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('drop', handleDrop);
    };
  }, [pdf, fields]);

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
        canUndo={ann.canUndo}
        canRedo={ann.canRedo}
        hasPdf={hasPdf}
        detecting={fields.detecting}
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
            ? `${pdf.fileName} — Page ${pdf.currentPage} of ${pdf.totalPages}`
            : 'No file loaded'}
        </span>
        <span>
          {ann.annotations.length > 0
            ? `${ann.annotations.length} annotation${ann.annotations.length !== 1 ? 's' : ''}`
            : ''}
        </span>
      </div>

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
    </div>
  );
}

export default App;
