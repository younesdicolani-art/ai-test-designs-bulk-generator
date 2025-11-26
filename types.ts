export interface Design {
  id: string;
  prompt: string;
  imageUrl: string;
  style: string;
  createdAt: number;
}

export interface GeneratorConfig {
  apiKey: string;
}

export type DesignStyle = 'Vector' | 'Vintage' | 'Cartoon' | 'Realistic' | 'Anime' | 'Neon' | 'Minimalist' | 'Watercolor';

export const DESIGN_STYLES: DesignStyle[] = [
  'Vector', 'Vintage', 'Cartoon', 'Realistic', 'Anime', 'Neon', 'Minimalist', 'Watercolor'
];

export interface BulkItem {
  id: string;
  concept: string;
  status: 'idle' | 'generating' | 'completed' | 'failed';
  result?: Design;
}
