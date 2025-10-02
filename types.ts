export type AspectRatio = "1:1" | "3:4" | "4:3" | "9:16" | "16:9";

export type ImageStatus = 'pending' | 'success' | 'error' | 'editing-bg' | 'animating' | 'animation-success' | 'edit-error' | 'animation-error' | 'refining' | 'refine-error';

export interface GeneratedImageInfo {
  id: string;
  prompt: string;
  imageUrl: string | null;
  videoUrl: string | null;
  status: ImageStatus;
  error: string | null;
}

export interface CustomStyle {
  name: string;
  value: string;
}