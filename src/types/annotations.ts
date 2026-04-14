export interface Point {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type AnnotationType = 'text' | 'checkbox' | 'date' | 'signature';

export interface BaseAnnotation {
  id: string;
  type: AnnotationType;
  pageIndex: number;
  rect: Rect;
}

export interface TextAnnotation extends BaseAnnotation {
  type: 'text';
  value: string;
  fontSize: number;
  fontFamily: string;
  color: string;
}

export interface CheckboxAnnotation extends BaseAnnotation {
  type: 'checkbox';
  checked: boolean;
  showBorder: boolean;
}

export interface DateAnnotation extends BaseAnnotation {
  type: 'date';
  value: string;
  format: 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD';
  fontSize: number;
  fontFamily: string;
  color: string;
}

export interface SignatureAnnotation extends BaseAnnotation {
  type: 'signature';
  dataUrl: string;
}

export type Annotation =
  | TextAnnotation
  | CheckboxAnnotation
  | DateAnnotation
  | SignatureAnnotation;

export type ToolType = AnnotationType | 'select' | null;

export interface DetectedField {
  id: string;
  pageIndex: number;
  rect: Rect;
  label: string;
  fieldType: 'text' | 'checkbox' | 'signature' | 'date';
  confidence: number;
  source: 'acroform' | 'heuristic';
  accepted: boolean;
}

export interface ViewerState {
  scale: number;
  currentPage: number;
  totalPages: number;
}
