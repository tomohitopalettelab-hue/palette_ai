export type IconStyle = 'chat' | 'ai' | 'sparkle' | 'heart' | 'robot';
export type BubbleShape = 'circle' | 'rounded' | 'square';

export type WidgetTemplate = {
  id: string;
  name: string;
  description: string;
  primaryColor: string;
  gradientTo?: string;     // グラデーション対応
  bubbleShape: BubbleShape;
  iconStyle: IconStyle;
  gradient: boolean;
};

export const WIDGET_TEMPLATES: WidgetTemplate[] = [
  {
    id: 'indigo',
    name: 'Indigo',
    description: 'スタンダードで信頼感のある紫系',
    primaryColor: '#6366f1',
    gradientTo: '#d946ef',
    bubbleShape: 'circle',
    iconStyle: 'chat',
    gradient: true,
  },
  {
    id: 'warm',
    name: 'Warm',
    description: '温かみのあるゴールド。士業・美容院向け',
    primaryColor: '#c59500',
    gradientTo: '#f59e0b',
    bubbleShape: 'circle',
    iconStyle: 'sparkle',
    gradient: true,
  },
  {
    id: 'noir',
    name: 'Noir',
    description: 'モダンでクール。デザイン/IT/クリエイティブ向け',
    primaryColor: '#1a1a1a',
    bubbleShape: 'square',
    iconStyle: 'ai',
    gradient: false,
  },
  {
    id: 'pink',
    name: 'Pink',
    description: '親しみやすい桜色。美容/雑貨/カフェ向け',
    primaryColor: '#ec4899',
    gradientTo: '#f97316',
    bubbleShape: 'circle',
    iconStyle: 'heart',
    gradient: true,
  },
  {
    id: 'emerald',
    name: 'Emerald',
    description: '爽やかなグリーン。健康/自然派/飲食向け',
    primaryColor: '#10b981',
    gradientTo: '#06b6d4',
    bubbleShape: 'circle',
    iconStyle: 'sparkle',
    gradient: true,
  },
  {
    id: 'navy',
    name: 'Navy',
    description: '格調高いネイビー。法律/金融/BtoB向け',
    primaryColor: '#1e3a8a',
    bubbleShape: 'rounded',
    iconStyle: 'chat',
    gradient: false,
  },
  {
    id: 'sunset',
    name: 'Sunset',
    description: '明るいオレンジ。飲食/エンタメ向け',
    primaryColor: '#f97316',
    gradientTo: '#facc15',
    bubbleShape: 'circle',
    iconStyle: 'robot',
    gradient: true,
  },
  {
    id: 'mono',
    name: 'Mono',
    description: 'シンプルなモノトーン。ミニマル重視',
    primaryColor: '#334155',
    bubbleShape: 'rounded',
    iconStyle: 'chat',
    gradient: false,
  },
];

// SVGパス（インラインSVGで共通利用）
export const ICON_SVG_PATHS: Record<IconStyle, string> = {
  chat: 'M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z',
  ai: 'M12 2a10 10 0 100 20 10 10 0 000-20zm0 3a2 2 0 110 4 2 2 0 010-4zm-1 6h2v6h-2v-6zm-3 3h8v2H8v-2z',
  sparkle: 'M12 2l2.4 5.6L20 10l-5.6 2.4L12 18l-2.4-5.6L4 10l5.6-2.4L12 2z',
  heart: 'M12 21s-7-4.5-9-9c-1.5-3.5 1-7 5-7 2 0 3 1 4 2 1-1 2-2 4-2 4 0 6.5 3.5 5 7-2 4.5-9 9-9 9z',
  robot: 'M20 5h-3V3a1 1 0 00-2 0v2H9V3a1 1 0 00-2 0v2H4a2 2 0 00-2 2v12a2 2 0 002 2h16a2 2 0 002-2V7a2 2 0 00-2-2zM8 15a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm8 0a1.5 1.5 0 110-3 1.5 1.5 0 010 3z',
};

export const getBubbleRadius = (shape: BubbleShape): string => {
  if (shape === 'square') return '12px';
  if (shape === 'rounded') return '20px';
  return '50%';
};

export const getBubbleGradient = (t: WidgetTemplate): string => {
  if (t.gradient && t.gradientTo) {
    return `linear-gradient(135deg, ${t.primaryColor} 0%, ${t.gradientTo} 100%)`;
  }
  return t.primaryColor;
};
