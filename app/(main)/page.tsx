"use client";

import React, { Suspense, useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { Send, Layout, MessageSquare, Sparkles, User, Box, PenLine, RefreshCw, BellRing } from 'lucide-react';
import { templates, Template } from '../admin/templates';

type ServiceCard = {
  key: string;
  title: string;
  description: string;
  planName: string;
  planCode?: string;
  phase: string;
  status: string;
};

type ActionButton = {
  key: string;
  label: string;
};

type QuickQuestionButton = {
  key: string;
  label: string;
  prompt: string;
};

type ContractInfoCard = {
  id: string;
  planName: string;
  phaseName: string;
  period: string;
  amount: string;
};

type MediaAsset = {
  id: string;
  paletteId: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  url: string;
  createdAt: string;
};

type ChatMessage = {
  role: 'ai' | 'user';
  content: string;
  serviceCards?: ServiceCard[];
  contractCards?: ContractInfoCard[];
  actionButtons?: ActionButton[];
};

type PromptSelectionKind = 'single' | 'multi';
type ServiceMode = 'none' | 'pal_studio' | 'pal_video' | 'palette_ai' | 'pal_trust' | 'other';
type StudioPlanTier = 'lite' | 'standard' | 'pro';

type HearingSummary = {
  companyName: string | null;
  businessService: string | null;
  target: string | null;
  designPreference: string | null;
  contents: string | null;
  works: string | null;
  companyProfile: string | null;
  contactForm: string | null;
  recruiting: string | null;
};

type HearingChecklist = {
  shopName: boolean;
  sections: boolean;
  phoneAddress: boolean;
  concept: boolean;
  color: boolean;
  email: boolean;
  missingLabels: string[];
};

type StudioStep =
  | 'idle'
  | 'shopName'
  | 'industry'
  | 'industryOther'
  | 'services'
  | 'servicesOther'
  | 'sections'
  | 'taste'
  | 'color'
  | 'companyInfoToggle'
  | 'companyInfoFields'
  | 'companyInfoDetails'
  | 'appealPoint'
  | 'revisionSelect'
  | 'revisionDetail'
  | 'revisionConfirm'
  | 'postOkMessageToggle'
  | 'postOkMessageInput'
  | 'completed';

type ConfirmMode = 'preview' | 'revision' | null;

type StudioRevisionDraft = {
  field: string;
  before: string;
  after: string;
  instruction: string;
};

type StudioProfile = {
  shopName: string;
  industry: string;
  services: string[];
  sections: string[];
  appealPoint: string;
  taste: string;
  color: string;
  includeCompanyInfo: boolean | null;
  companyFields: string[];
  companyDetails: Record<string, string>;
};

function PaletteDesignInner() {
  const searchParams = useSearchParams();
  const queryCid = searchParams.get('cid')?.trim();
  const PALETTE_ID_REGEX = /^[A-Z][0-9]{4}$/;
  const [activeTab, setActiveTab] = useState<'chat' | 'preview'>('chat');
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'ai', content: 'こんにちは！Palette AIです。まず顧客IDを入力してください。（例: A0001）' }
  ]);
  const [authStep, setAuthStep] = useState<'askId' | 'askPassword' | 'authenticated'>('askId');
  const [authPaletteId, setAuthPaletteId] = useState('');
  const [authCustomerName, setAuthCustomerName] = useState('');
  const [authServiceSummary, setAuthServiceSummary] = useState('');
  const [authServiceCards, setAuthServiceCards] = useState<ServiceCard[]>([]);
  const [authContractCards, setAuthContractCards] = useState<ContractInfoCard[]>([]);
  const [mediaAssets, setMediaAssets] = useState<MediaAsset[]>([]);
  const [mediaError, setMediaError] = useState('');
  const [mediaLoading, setMediaLoading] = useState(false);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [generatedCode, setGeneratedCode] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(templates[0]?.id || '');
  const [showConfirmSave, setShowConfirmSave] = useState(false);
  const [previewRenderMode, setPreviewRenderMode] = useState<'desktop' | 'mobile'>('desktop');
  const [previewImageUrl, setPreviewImageUrl] = useState('');
  const [isPreviewImageLoading, setIsPreviewImageLoading] = useState(false);
  const [confirmMessages, setConfirmMessages] = useState<any[]>([]);
  const [aiExplanation, setAiExplanation] = useState(""); // AI の意思決定・方針を保存
  const [conversationEnded, setConversationEnded] = useState(false); // ヒアリング完了フラグ
  const [multiPromptItems, setMultiPromptItems] = useState<string[]>([]);
  const [multiPromptAnswers, setMultiPromptAnswers] = useState<string[]>([]);
  const [multiPromptModes, setMultiPromptModes] = useState<Array<'select' | 'text'>>([]);
  const [multiPromptSelectOptions, setMultiPromptSelectOptions] = useState<string[][]>([]);
  const [multiPromptSelectionKinds, setMultiPromptSelectionKinds] = useState<PromptSelectionKind[]>([]);
  const [multiPromptSelected, setMultiPromptSelected] = useState<string[]>([]);
  const [multiPromptSelectedMulti, setMultiPromptSelectedMulti] = useState<string[][]>([]);
  const [isSubmittingMultiPrompt, setIsSubmittingMultiPrompt] = useState(false);
  const [quickQuestionButtons, setQuickQuestionButtons] = useState<QuickQuestionButton[]>([]);
  const [neutralActionButtons, setNeutralActionButtons] = useState<ActionButton[]>([]);
  const [activeServiceMode, setActiveServiceMode] = useState<ServiceMode>('none');
  const [activeServiceCard, setActiveServiceCard] = useState<ServiceCard | null>(null);
  const [studioPlanTier, setStudioPlanTier] = useState<StudioPlanTier>('standard');
  const [studioStep, setStudioStep] = useState<StudioStep>('idle');
  const [studioHtmlGenerationCount, setStudioHtmlGenerationCount] = useState(0);
  const [confirmMode, setConfirmMode] = useState<ConfirmMode>(null);
  const [studioRevisionTarget, setStudioRevisionTarget] = useState<string>('');
  const [studioRevisionDraft, setStudioRevisionDraft] = useState<StudioRevisionDraft | null>(null);
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [mobileKeyboardInset, setMobileKeyboardInset] = useState(0);
  const [studioProfile, setStudioProfile] = useState<StudioProfile>({
    shopName: '',
    industry: '',
    services: [],
    sections: [],
    appealPoint: '',
    taste: '',
    color: '',
    includeCompanyInfo: null,
    companyFields: [],
    companyDetails: {},
  });
  const [sessionCustomerId] = useState(
    () => queryCid || `cust-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  );
  const resolvedCustomerId = String(authPaletteId || queryCid || sessionCustomerId || '').trim().toUpperCase();
  const canUseMedia = authStep === 'authenticated' && PALETTE_ID_REGEX.test(resolvedCustomerId);

  const normalizeCustomerName = (raw: string): string => {
    const value = String(raw || '').trim();
    if (!value) return '';
    if (/^[A-Z][0-9]{4}$/i.test(value)) return '';
    return value.replace(/\s*様\s*$/u, '').trim();
  };

  const displayCustomerName = normalizeCustomerName(authCustomerName) || 'お客様';

  const resolvePersistedCustomerName = (currentMessages: ChatMessage[], html?: string): string => {
    const authName = normalizeCustomerName(authCustomerName);
    if (authName) return authName;

    const shopName = normalizeCustomerName(String(studioProfile.shopName || ''));
    if (shopName) return shopName;

    const titleMatch = String(html || '').match(/<title>(.*?)<\/title>/i);
    const titleName = normalizeCustomerName(String(titleMatch?.[1] || ''));
    if (titleName) return titleName;

    const firstUserMessage = normalizeCustomerName(
      String(currentMessages.find((m: any) => m.role === 'user')?.content || ''),
    );
    return firstUserMessage || '新規顧客';
  };

  const scrollEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mediaInputRef = useRef<HTMLInputElement>(null);
  const previewModeInitializedRef = useRef(false);
  const keepInputTimerRef = useRef<number | null>(null);
  const isComposerFocusedRef = useRef(false);

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    scrollEndRef.current?.scrollIntoView({ behavior, block: 'end' });
  };

  const formatBytes = (value: number): string => {
    if (!Number.isFinite(value) || value <= 0) return '0 KB';
    if (value < 1024) return `${value} B`;
    const kb = value / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    const mb = kb / 1024;
    return `${mb.toFixed(1)} MB`;
  };

  const loadMediaAssets = async () => {
    if (!canUseMedia) return;
    setMediaLoading(true);
    setMediaError('');
    try {
      const response = await fetch(`/api/media?paletteId=${encodeURIComponent(resolvedCustomerId)}`);
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data?.success === false) {
        throw new Error(data?.error || `メディア取得に失敗しました (${response.status})`);
      }
      const assets = Array.isArray(data?.assets) ? data.assets : [];
      setMediaAssets(assets);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'メディア取得に失敗しました。';
      setMediaError(message);
      setMediaAssets([]);
    } finally {
      setMediaLoading(false);
    }
  };

  const handleMediaUpload = async (file: File) => {
    if (!canUseMedia) return;
    setIsUploadingMedia(true);
    setMediaError('');
    try {
      const formData = new FormData();
      formData.set('paletteId', resolvedCustomerId);
      formData.set('file', file, file.name || 'upload');
      const response = await fetch('/api/media/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data?.success === false) {
        throw new Error(data?.error || `アップロードに失敗しました (${response.status})`);
      }
      await loadMediaAssets();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'アップロードに失敗しました。';
      setMediaError(message);
    } finally {
      setIsUploadingMedia(false);
    }
  };

  const handleMediaFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await handleMediaUpload(file);
    event.target.value = '';
  };

  const handleMediaSelect = (asset: MediaAsset) => {
    const url = String(asset?.url || '').trim();
    if (!url) return;
    setInputText((prev) => (prev ? `${prev}\n${url}` : url));
    if (isMobileViewport) {
      setActiveTab('chat');
    }
  };

  const handleMediaDelete = async (assetId: string) => {
    if (!assetId) return;
    if (typeof window !== 'undefined' && !window.confirm('このメディアを削除しますか？')) return;
    setMediaError('');
    try {
      const response = await fetch(`/api/media/${encodeURIComponent(assetId)}`, { method: 'DELETE' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data?.success === false) {
        throw new Error(data?.error || `削除に失敗しました (${response.status})`);
      }
      await loadMediaAssets();
    } catch (error) {
      const message = error instanceof Error ? error.message : '削除に失敗しました。';
      setMediaError(message);
    }
  };

  const keepInputVisible = () => {
    if (typeof window === 'undefined') return;
    if (isMobileViewport) return;
    if (keepInputTimerRef.current) {
      window.clearTimeout(keepInputTimerRef.current);
    }

    // Wait for keyboard animation once, then align input without adding extra momentum.
    keepInputTimerRef.current = window.setTimeout(() => {
      if (!isComposerFocusedRef.current) {
        keepInputTimerRef.current = null;
        return;
      }
      scrollToBottom('auto');
      keepInputTimerRef.current = null;
    }, mobileKeyboardInset > 0 ? 80 : 220);
  };
  
  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  useEffect(() => {
    if (!canUseMedia) {
      setMediaAssets([]);
      return;
    }
    void loadMediaAssets();
  }, [canUseMedia, resolvedCustomerId]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [inputText]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const updateMobileFlag = () => {
      const isMobile = window.innerWidth < 768;
      setIsMobileViewport(isMobile);
      if (!previewModeInitializedRef.current) {
        setPreviewRenderMode(isMobile ? 'mobile' : 'desktop');
        previewModeInitializedRef.current = true;
      }
    };
    updateMobileFlag();
    window.addEventListener('resize', updateMobileFlag);
    return () => window.removeEventListener('resize', updateMobileFlag);
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (!isMobileViewport) return;

    const html = document.documentElement;
    const body = document.body;
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;

    // Prevent iOS Safari from moving the whole page while focusing the textarea.
    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';

    return () => {
      html.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
    };
  }, [isMobileViewport]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const viewport = window.visualViewport;
    if (!viewport) return;

    const updateViewportMetrics = () => {
      const keyboardHeight = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop);
      // Ignore tiny viewport jitters and react only when keyboard is likely visible.
      setMobileKeyboardInset(keyboardHeight > 60 ? Math.round(keyboardHeight) : 0);
    };

    updateViewportMetrics();
    viewport.addEventListener('resize', updateViewportMetrics);
    viewport.addEventListener('scroll', updateViewportMetrics);
    window.addEventListener('orientationchange', updateViewportMetrics);
    return () => {
      viewport.removeEventListener('resize', updateViewportMetrics);
      viewport.removeEventListener('scroll', updateViewportMetrics);
      window.removeEventListener('orientationchange', updateViewportMetrics);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && keepInputTimerRef.current) {
        window.clearTimeout(keepInputTimerRef.current);
      }
    };
  }, []);

  const sanitizePromptText = (text: string): string => {
    return String(text || '')
      .replace(/\*\*/g, '')
      .replace(/[「」『』]/g, '')
      .trim();
  };

  const extractOptionsFromSupplement = (supplements: string[]): string[] => {
    if (!supplements.length) return [];

    const joined = supplements
      .map((line) => sanitizePromptText(line))
      .join(' ')
      .replace(/[()（）]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!joined) return [];

    const sourceMatch = joined.match(/(?:例|候補|選択肢)[:：]?\s*(.*)/i);
    const source = (sourceMatch?.[1] || joined).trim();

    const tokens = source
      .split(/\s*[\/|,，、・]\s*|\s+または\s+|\s+or\s+|\s+もしくは\s+|\s+及び\s+|\s+および\s+/i)
      .map((token) => token.trim())
      .filter((token) => token.length >= 1 && token.length <= 24)
      .filter((token) => !/[?？。]/.test(token))
      .filter((token) => !/^(例|候補|選択肢|入力|回答|ください|お願いします|など)$/i.test(token));

    const unique = Array.from(new Set(tokens));
    return unique.length >= 2 ? unique.slice(0, 8) : [];
  };

  const parseMultiPrompts = (content: string): Array<{ question: string; options: string[]; selectionKind: PromptSelectionKind }> => {
    const text = String(content || '')
      .replace(/```html[\s\S]*?```/gi, '')
      .trim();

    if (!text) return [];

    const splitOptionTokensSimple = (source: string): string[] => {
      return Array.from(new Set(
        String(source || '')
          .replace(/[()（）]/g, ' ')
          .replace(/など.*$/i, '')
          .split(/\s*[\/，、,・]\s*|\s+または\s+|\s+or\s+|\s+もしくは\s+|\s+及び\s+|\s+および\s+/i)
          .map((token) => token.trim())
          .filter((token) => token.length >= 1 && token.length <= 24)
          .filter((token) => !/^(選択肢|候補|例|入力|回答|ください|お願いします)$/i.test(token))
      )).slice(0, 10);
    };

    // 最優先: 「(複数選択) (選択肢: ...)」があれば必ず補助UIを出す。
    const normalizedTagText = text.replace(/[（]/g, '(').replace(/[）]/g, ')');
    const forcedMultiTagMatch = normalizedTagText.match(/\(\s*複数選択\s*\)[\s\S]*?\(\s*(?:選択肢|候補)\s*[:：]\s*([^\)]+)\)/i);
    if (forcedMultiTagMatch) {
      const forcedOptions = splitOptionTokensSimple(forcedMultiTagMatch[1] || '');
      if (forcedOptions.length >= 2) {
        const questionLine = normalizedTagText
          .split('\n')
          .map((line) => sanitizePromptText(line))
          .find((line) => /[?？]/.test(line));
        const question = sanitizePromptText(
          String(questionLine || '当てはまるものを選択してください。')
            .replace(/[（(]\s*複数選択\s*[）)]/gi, '')
            .replace(/[（(]\s*(?:選択肢|候補)\s*[:：][^）)]*[）)]/gi, '')
            .replace(/\s+/g, ' ')
            .trim(),
        ) || '当てはまるものを選択してください。';

        return [{
          question,
          options: forcedOptions,
          selectionKind: 'multi',
        }];
      }
    }

    // 強制補助UI: 質問文にタグが入っていれば、通常推論をスキップしてUI生成を優先する。
    const hasTagPrompt = /\((?:2択|二択|単一選択|複数選択|チェック)\)|\((?:選択肢|候補)\s*[:：]/i.test(normalizedTagText);
    if (hasTagPrompt) {
      const taggedLines = normalizedTagText
        .split('\n')
        .map((line) => sanitizePromptText(line))
        .filter(Boolean);

      const taggedQuestionLine = taggedLines.find((line) => /[?？]/.test(line) && /(2択|二択|単一選択|複数選択|チェック|選択肢\s*[:：]|候補\s*[:：])/i.test(line));
      const latestQuestionLine = [...taggedLines].reverse().find((line) => /[?？]/.test(line));

      const extractedQuestion = sanitizePromptText(
        (taggedQuestionLine || latestQuestionLine || '')
          .replace(/[（(]\s*(2択|二択|単一選択|複数選択|チェック)\s*[）)]/gi, '')
          .replace(/[（(]\s*(?:選択肢|候補)\s*[:：][^）)]*[）)]/gi, '')
          .replace(/\s+/g, ' ')
          .trim(),
      );
      const question = extractedQuestion || '当てはまるものを選択してください。';
      const optionTagMatchForced = normalizedTagText.match(/\((?:選択肢|候補)\s*[:：]\s*([^\)]+)\)/i);
      const forcedOptions = splitOptionTokensSimple(optionTagMatchForced?.[1] || '');
      const forcedMulti = /\((?:複数選択|チェック)\)|\b複数選択\b|\bチェック\b/i.test(normalizedTagText);
      const forcedSingle = /\((?:2択|二択|単一選択)\)|\b2択\b|\b二択\b|\b単一選択\b/i.test(normalizedTagText);

      const options = forcedOptions.length >= 2
        ? forcedOptions
        : (forcedSingle ? ['はい', 'いいえ'] : []);

      if (options.length >= 2) {
        return [{
          question,
          options,
          selectionKind: forcedMulti ? 'multi' : 'single',
        }];
      }
    }

    const lines = text.split('\n');
    // 最強2択検出: 質問文全体（改行含む）に「(2択)」「（2択）」があれば必ず2択UI
    const twoChoiceGlobalPattern = /[（(]\s*2択\s*[）)]|[（(]\s*二択\s*[）)]|\(2択\)|\(二択\)|（2択）|（二択）|2択|二択|単一選択/i;
    if (twoChoiceGlobalPattern.test(text)) {
      // 質問文抽出: 最初の「？」まで or 1行目
      const questionMatch = text.match(/^(.*?[?？])/);
      const question = sanitizePromptText(questionMatch ? questionMatch[1] : text.replace(twoChoiceGlobalPattern, '').trim());
      if (question.length > 0) {
        return [{
          question,
          options: ['はい', 'いいえ'],
          selectionKind: 'single',
        }];
      }
    }

    // 最強選択肢検出: 質問文全体に「(選択肢: ...)」タグがあれば必ず選択肢UI
    const optionTagPattern = /[（(]\s*選択肢\s*[:：]\s*([^）)]*)[）)]/i;
    const optionTagMatch = text.match(optionTagPattern);
    if (optionTagMatch) {
      const questionMatch = text.match(/^(.*?[?？])/);
      const question = sanitizePromptText(questionMatch ? questionMatch[1] : text.replace(optionTagPattern, '').trim());
      const rawOptions = optionTagMatch[1];
      const hasExplicitMulti = /[（(]\s*(複数選択|チェック)\s*[）)]|\b複数選択\b|\bチェック\b/i.test(text);
      const hasExplicitSingle = /[（(]\s*(2択|二択|単一選択)\s*[）)]|\b2択\b|\b二択\b|\b単一選択\b/i.test(text);
      const options = rawOptions.split(/\s*[\/，、,・]\s*|\s+または\s+|\s+or\s+|\s+もしくは\s+/i)
        .map((token) => token.trim())
        .filter((token) => token.length >= 1 && token.length <= 24)
        .filter((token) => !/[?？。]/.test(token))
        .filter((token) => !/^(例えば|例|候補|選択肢|入力|回答|ください|お願いします|など)$/i.test(token));
      if (question.length > 0 && options.length >= 2) {
        const selectionKind: PromptSelectionKind = hasExplicitSingle
          ? 'single'
          : (hasExplicitMulti || options.length >= 3)
            ? 'multi'
            : 'single';
        return [{
          question,
          options,
          selectionKind,
        }];
      }
    }

    const stripUiTags = (value: string): string => {
      return String(value || '')
        .replace(/[（(]\s*(2択|二択|単一選択|複数選択|チェック)\s*[）)]/gi, '')
        .replace(/[（(]\s*(?:選択肢|候補)\s*[:：][^）)]*[）)]/gi, '')
        .trim();
    };

    const splitOptionTokens = (source: string): string[] => {
      const raw = String(source || '').trim();
      if (!raw) return [];
      return Array.from(new Set(
        raw
          .replace(/[()（）]/g, ' ')
          .replace(/など.*$/i, '')
          .split(/\s*[\/,，、・]\s*|\s+または\s+|\s+or\s+|\s+もしくは\s+|\s+及び\s+|\s+および\s+/i)
          .map((token) => token.trim())
          .filter((token) => token.length >= 1 && token.length <= 24)
          .filter((token) => !/^(選択肢|候補|例|入力|回答|ください|お願いします)$/i.test(token))
      )).slice(0, 10);
    };

    const taggedPrompts: Array<{ question: string; options: string[]; selectionKind: PromptSelectionKind }> = [];
    let taggedModeDetected = false;
    let lastTaggedIndex = -1;

    lines.forEach((rawLine) => {
      const line = sanitizePromptText(String(rawLine || '').trim());
      if (!line) return;
      const normalizedLine = line.replace(/[（]/g, '(').replace(/[）]/g, ')');

      const alphaOptionDetail = normalizedLine.match(/^([A-ZＡ-Ｚ])\s*[\.．:：]\s*(.+)$/);
      if (alphaOptionDetail && lastTaggedIndex >= 0) {
        const key = String(alphaOptionDetail[1] || '').toUpperCase();
        const label = sanitizePromptText(String(alphaOptionDetail[2] || '').trim());
        if (label) {
          const current = taggedPrompts[lastTaggedIndex];
          const options = Array.isArray(current?.options) ? current.options : [];
          const hasAlphaSkeleton = options.some((option) => option.toUpperCase() === key);
          if (hasAlphaSkeleton) {
            current.options = options.map((option) => {
              if (option.toUpperCase() !== key) return option;
              return `${key}. ${label}`;
            });
            taggedModeDetected = true;
            return;
          }
        }
      }

      const questionMatch = line.match(/^(.*?[?？])/);
      if (questionMatch) {
        const question = sanitizePromptText(questionMatch[1]);
        const optionTag = normalizedLine.match(/(?:選択肢|候補)\s*[:：]\s*([^\)\]]+)/i);
        const isMulti = /(複数選択|チェック)/i.test(normalizedLine);
        const isTwoChoice = /(2択|二択|yes\/no|はい\/いいえ|単一選択)/i.test(normalizedLine);
        const options = splitOptionTokens(optionTag?.[1] || '');

        if (optionTag || isMulti || isTwoChoice) taggedModeDetected = true;

        taggedPrompts.push({
          question,
          options: options.length > 0 ? options : (isTwoChoice ? ['はい', 'いいえ'] : []),
          selectionKind: isMulti ? 'multi' : 'single',
        });
        lastTaggedIndex = taggedPrompts.length - 1;
        return;
      }

      if (lastTaggedIndex >= 0) {
        const extraOptionTag = normalizedLine.match(/^(?:\(?)(?:選択肢|候補)\s*[:：]\s*(.+?)(?:\)?)$/i);
        if (extraOptionTag) {
          const options = splitOptionTokens(extraOptionTag[1]);
          if (options.length > 0) {
            const existing = taggedPrompts[lastTaggedIndex].options;
            taggedPrompts[lastTaggedIndex].options = Array.from(new Set([...existing, ...options])).slice(0, 10);
            taggedModeDetected = true;
          }
          return;
        }

        if (/^\(?複数選択\)?$/i.test(normalizedLine) || /複数選択/i.test(normalizedLine)) {
          taggedPrompts[lastTaggedIndex].selectionKind = 'multi';
          taggedModeDetected = true;
          return;
        }

        if (/^\(?(2択|二択|単一選択)\)?$/i.test(normalizedLine) || /(2択|二択|単一選択)/i.test(normalizedLine)) {
          taggedPrompts[lastTaggedIndex].selectionKind = 'single';
          if (taggedPrompts[lastTaggedIndex].options.length === 0) {
            taggedPrompts[lastTaggedIndex].options = ['はい', 'いいえ'];
          }
          taggedModeDetected = true;
        }
      }
    });

    if (taggedModeDetected && taggedPrompts.length > 0) {
      return taggedPrompts.map((prompt) => ({
        question: prompt.question,
        options: prompt.options,
        selectionKind: prompt.selectionKind,
      }));
    }

    const normalizedText = text.replace(/[（]/g, '(').replace(/[）]/g, ')');

    const globalTwoChoice = normalizedText.match(/(.+?[?？]).*?\((?:2択|二択|単一選択)\)/i);
    if (globalTwoChoice) {
      const question = sanitizePromptText(globalTwoChoice[1]);
      if (question) {
        return [{ question, options: ['はい', 'いいえ'], selectionKind: 'single' }];
      }
    }

    const taggedLineFallback: Array<{ question: string; options: string[]; selectionKind: PromptSelectionKind }> = [];
    normalizedText.split('\n').forEach((rawLine) => {
      const line = sanitizePromptText(String(rawLine || '').trim());
      if (!line) return;

      const optionInline = line.match(/(?:選択肢|候補)\s*[:：]\s*([^\)\]]+)/i);
      if (!optionInline) return;

      const question = sanitizePromptText((line.match(/^(.*?[?？])/)?.[1] || ''));
      const options = splitOptionTokens(optionInline[1]);
      if (!question || options.length < 2) return;

      const isMulti = /(複数選択|チェック)/i.test(line);
      taggedLineFallback.push({
        question,
        options,
        selectionKind: isMulti ? 'multi' : inferSelectionKind(line, options),
      });
    });

    if (taggedLineFallback.length > 0) {
      return taggedLineFallback;
    }

    const optionListBullets: string[] = [];
    let latestQuestionLine = '';
    lines.forEach((rawLine) => {
      const line = String(rawLine || '').trim();
      if (!line) return;

      const bulletMatch = line.match(/^\*+\s*(.+)$/)
        || line.match(/^([\-・●])\s*(.+)$/)
        || line.match(/^(\d+[\.)．]|[①-⑨])\s*(.+)$/);
      if (bulletMatch) {
        const bulletText = sanitizePromptText(bulletMatch[2] || bulletMatch[1] || '')
          .replace(/^[\-・●\*]\s*/, '')
          .trim();
        const isOptionLike = bulletText
          && !/[?？]/.test(bulletText)
          && !/(教えて|入力|記載|回答|お願いします|でしょうか|ですか)$/i.test(bulletText);
        if (isOptionLike) {
          optionListBullets.push(bulletText);
        }
        return;
      }

      if (/[?？]/.test(line)) {
        const question = sanitizePromptText((line.match(/^(.*?[?？])/)?.[1] || line));
        if (question) latestQuestionLine = question;
      }
    });

    if (latestQuestionLine && optionListBullets.length >= 2) {
      return [{
        question: latestQuestionLine,
        options: Array.from(new Set(optionListBullets)).slice(0, 10),
        selectionKind: 'multi',
      }];
    }

    const blocks: Array<{ question: string; supplements: string[] }> = [];
    let current: { question: string; supplements: string[] } | null = null;

    lines.forEach((rawLine) => {
      const line = String(rawLine || '').trim();
      if (!line) return;

      const bulletMatch = line.match(/^([\-・●]|\d+[\.)．]|[①-⑨])\s*(.+)$/);
      if (bulletMatch) {
        if (current) blocks.push(current);
        current = {
          question: sanitizePromptText(bulletMatch[2]),
          supplements: [],
        };
        return;
      }

      if (
        current
        && /^(（?例|\(?example|候補|選択肢)/i.test(line)
      ) {
        current.supplements.push(line);
      }
    });

    if (current) blocks.push(current);
    const extractInlineOptionsFromQuestion = (question: string): string[] => {
      const normalized = sanitizePromptText(question);
      if (!normalized) return [];

      // 例: メニュー、コース紹介、店舗情報、こだわりなど
      // 括弧内や「例:」以降の区切りワードを抽出
      let source = '';
      const labeled = normalized.match(/(?:例|候補|選択肢)\s*[:：]\s*([^）)]+)/i);
      if (labeled) {
        source = labeled[1];
      } else {
        const parenthesized = normalized.match(/[（(]([^）)]+)[）)]/);
        if (parenthesized) {
          source = parenthesized[1];
        } else {
          // 末尾「など」も含めて区切り抽出
          const exampleMatch = normalized.match(/(メニュー|コース紹介|店舗情報|こだわり|[\wぁ-んァ-ン一-龥・/、，\s]{2,})など/i);
          if (exampleMatch) {
            source = exampleMatch[0].replace(/など.*$/i, '');
          }
        }
      }
      source = String(source).replace(/など.*$/i, '').trim();
      if (!source) return [];

      let tokens = source
        .split(/\s*[\/，、,・]\s*|\s+または\s+|\s+or\s+|\s+もしくは\s+|\s+及び\s+|\s+および\s+/i)
        .map((token) => token.trim())
        .filter((token) => token.length >= 1 && token.length <= 24)
        .filter((token) => !/[?？。]/.test(token))
        // 「例えば」「例」などを除外
        .filter((token) => !/^(例えば|例|候補|選択肢|入力|回答|ください|お願いします|など)$/i.test(token));

      // 〇〇の販売、〇〇のコンサルティングなど → 「販売」「コンサルティング」抽出
      if (tokens.length < 2 && /〇〇の[\wぁ-んァ-ン一-龥]+(、|，|,|・)〇〇の[\wぁ-んァ-ン一-龥]+/.test(source)) {
        tokens = Array.from(
          source.matchAll(/〇〇の([\wぁ-んァ-ン一-龥]+)/g)
        ).map((m) => m[1]).filter(Boolean);
      }

      const unique = Array.from(new Set(tokens)).slice(0, 8);
      if (unique.length >= 2) return unique;

      // 追加: 「は必要ですか」系のリスト抽出
      const listBeforeNeedMatch = normalized.match(/([\wぁ-んァ-ン一-龥・/、，\s]{4,})は(?:必要|必須|不要|いりますか|必要でしょうか|必要ですか)/i);
      const sourceFromList = String(listBeforeNeedMatch?.[1] || '').trim();
      if (!sourceFromList) return unique;

      const scoped = sourceFromList
        .replace(/^(会社概要ページに記載する情報として|お問い合わせフォームの必須項目として|以下の項目|次の項目|項目として|記載情報として)/, '')
        .trim();

      const listTokens = scoped
        .split(/\s*[\/，、・]\s*|\s+および\s+|\s+及び\s+|\s+と\s+/i)
        .map((token) => token.trim())
        .filter((token) => token.length >= 2 && token.length <= 24)
        .filter((token) => !/^(は|が|を|に|で|として|必要|必須)$/i.test(token))
        .filter((token) => !/(記載する情報|必須項目|ページ|会社概要)/.test(token));

      const listUnique = Array.from(new Set(listTokens)).slice(0, 10);
      return listUnique.length >= 2 ? listUnique : unique;
    };

    const inferSelectionKind = (question: string, options: string[]): PromptSelectionKind => {
      if (options.length < 2) return 'single';

      const normalized = sanitizePromptText(stripUiTags(question));
      const isYesNoOnly = options.length === 2 && options.includes('はい') && options.includes('いいえ');
      if (isYesNoOnly) return 'single';

      if (options.length >= 3) return 'multi';

      const multiKeywords = /(含める情報|必須項目|項目|チェック|当てはまる|複数|選んで|確定している|掲載したいコンテンツ|必要なもの)/;
      if (multiKeywords.test(normalized)) return 'multi';

      return 'single';
    };

    const splitCompoundQuestion = (question: string): string[] => {
      const normalized = sanitizePromptText(question)
        .replace(/^(それでは|では|次に|続いて)[、,\s]*/i, '')
        .replace(/[?？]$/, '')
        .trim();
      if (!normalized) return [];

      const pairMatch = normalized.match(/^(.+?)と(.+?)(は|を|について)/);
      if (!pairMatch) return [];

      const leftRaw = String(pairMatch[1] || '').trim();
      const rightRaw = String(pairMatch[2] || '').trim();
      const splitAnchor = pairMatch.index ?? 0;
      const prefix = normalized.slice(0, splitAnchor);

      const cleanup = (value: string) => value
        .replace(/^(会社の|御社の|店舗の|貴社の)/, '')
        .replace(/(は|を|について)$/,'')
        .trim();

      const left = cleanup(leftRaw);
      const right = cleanup(rightRaw);
      if (!left || !right) return [];

      const hasKnownPair = /(営業時間|定休日|住所|電話番号|メール|代表者名|設立年月日|アクセス|料金|予算|連絡先)/.test(left)
        && /(営業時間|定休日|住所|電話番号|メール|代表者名|設立年月日|アクセス|料金|予算|連絡先)/.test(right);
      if (!hasKnownPair) return [];

      const ownerPrefix = /^(会社の|御社の|店舗の|貴社の)/.exec(leftRaw)?.[1] || '';
      return [
        `${ownerPrefix}${left}を教えてください。`,
        `${ownerPrefix}${right}を教えてください。`,
      ];
    };

    const inferOptionsFromQuestion = (question: string): string[] => {
      const normalized = sanitizePromptText(stripUiTags(question));
      if (!normalized) return [];

      const inline = extractInlineOptionsFromQuestion(normalized);
      if (inline.length >= 2) return inline;

      const isOpenEnded = /(どのよう|何|なに|具体的|詳しく|教えてください|サービス内容|コンテンツ|内容)/i.test(normalized);
      if (isOpenEnded) return [];

      const isStrictYesNoQuestion = /(設置しますか|必要ですか|希望しますか|導入しますか|掲載しますか|利用しますか|追加しますか|ご希望ですか|よろしいですか|問題ないですか)[?？]?$/i.test(normalized);
      if (isStrictYesNoQuestion) {
        return ['はい', 'いいえ'];
      }
      return [];
    };

    if (blocks.length >= 2) {
      return blocks.map((block) => ({
        question: block.question,
        options: (() => {
          const supplementOptions = extractOptionsFromSupplement(block.supplements);
          const inlineOptions = extractInlineOptionsFromQuestion(block.question);
          const merged = Array.from(new Set([...supplementOptions, ...inlineOptions]));
          return merged.length >= 2 ? merged.slice(0, 8) : inferOptionsFromQuestion(block.question);
        })(),
        selectionKind: 'single',
      }));
    }

    if (blocks.length === 1) {
      const only = blocks[0];
      const compound = splitCompoundQuestion(only.question);
      if (compound.length >= 2) {
        return compound.map((q) => ({
          question: q,
          options: inferOptionsFromQuestion(q),
          selectionKind: 'single',
        }));
      }

      const supplementOptions = extractOptionsFromSupplement(only.supplements);
      const inlineOptions = extractInlineOptionsFromQuestion(only.question);
      const merged = Array.from(new Set([...supplementOptions, ...inlineOptions]));
      const options = merged.length >= 2 ? merged.slice(0, 8) : inferOptionsFromQuestion(only.question);
      if (!options.length) return [];
      return [{
        question: only.question,
        options,
        selectionKind: inferSelectionKind(only.question, options),
      }];
    }

    const plainQuestionRows = text
      .split('\n')
      .map((line) => String(line || '').trim())
      .filter(Boolean)
      .map((line) => line.replace(/^(次に|また|続いて|それでは|では)[、,\s]*/i, '').trim())
      .filter((line) => /[?？]/.test(line))
      .map((line) => {
        const normalized = sanitizePromptText(line);
        if (!normalized) return null;

        const head = sanitizePromptText((normalized.match(/^(.*?[?？])/ )?.[1] || normalized));
        const key = head.length >= 4 ? head : normalized;
        return { key, raw: normalized };
      })
      .filter((row): row is { key: string; raw: string } => Boolean(row));

    const plainQuestionMap = new Map<string, string>();
    plainQuestionRows.forEach((row) => {
      if (!plainQuestionMap.has(row.key)) {
        plainQuestionMap.set(row.key, row.raw);
      }
    });

    const plainQuestions = Array.from(plainQuestionMap.entries()).map(([question, raw]) => ({ question, raw }));

    if (!plainQuestions.length) return [];

    if (plainQuestions.length === 1) {
      const only = plainQuestions[0];
      const compound = splitCompoundQuestion(only.question);
      if (compound.length >= 2) {
        return compound.map((q) => ({
          question: q,
          options: inferOptionsFromQuestion(q),
          selectionKind: 'single',
        }));
      }

      const options = inferOptionsFromQuestion(only.raw);
      if (!options.length) return [];
      return [{ question: only.question, options, selectionKind: inferSelectionKind(only.raw, options) }];
    }

    return plainQuestions.map((row) => ({
      question: row.question,
      options: inferOptionsFromQuestion(row.raw),
      selectionKind: inferSelectionKind(row.raw, inferOptionsFromQuestion(row.raw)),
    }));
  };

  const parseTaggedPromptFallback = (content: string): { question: string; options: string[]; selectionKind: PromptSelectionKind } | null => {
    const normalized = String(content || '').replace(/[（]/g, '(').replace(/[）]/g, ')').trim();
    if (!normalized) return null;

    const optionMatch = normalized.match(/\(\s*(?:選択肢|候補)\s*[:：]\s*([\s\S]*?)\)/i);
    if (!optionMatch) return null;

    const options = Array.from(new Set(
      String(optionMatch[1] || '')
        .replace(/など.*$/i, '')
        .split(/\s*[\/，、,・]\s*|\s+または\s+|\s+or\s+|\s+もしくは\s+|\s+及び\s+|\s+および\s+/i)
        .map((token) => token.trim())
        .filter((token) => token.length >= 1 && token.length <= 24)
        .filter((token) => !/^(選択肢|候補|例|入力|回答|ください|お願いします)$/i.test(token))
    ));

    if (options.length < 2) return null;

    const beforeTag = normalized.slice(0, optionMatch.index || normalized.length);
    const qMatches = Array.from(beforeTag.matchAll(/([^。！？\n]*[?？])/g));
    const question = sanitizePromptText(
      (qMatches.length ? qMatches[qMatches.length - 1][1] : '').trim(),
    ) || '当てはまるものを選択してください。';

    const forcedMulti = /\(\s*(?:複数選択|チェック)\s*\)|\b複数選択\b|\bチェック\b/i.test(normalized);
    const forcedSingle = /\(\s*(?:2択|二択|単一選択)\s*\)|\b2択\b|\b二択\b|\b単一選択\b/i.test(normalized);
    const selectionKind: PromptSelectionKind = forcedSingle ? 'single' : (forcedMulti || options.length >= 3) ? 'multi' : 'single';

    return {
      question,
      options,
      selectionKind,
    };
  };

  const clearMultiPromptState = () => {
    setMultiPromptItems([]);
    setMultiPromptSelectOptions([]);
    setMultiPromptSelectionKinds([]);
    setMultiPromptModes([]);
    setMultiPromptSelected([]);
    setMultiPromptSelectedMulti([]);
    setMultiPromptAnswers([]);
  };

  const STUDIO_TASTE_OPTIONS = [
    'モダン', 'クリーン', 'シンプル', 'ラグジュアリー', '大人っぽい',
    '信頼感', '堅実', '元気', 'POP', 'ミニマル',
    '余白', 'テック感', 'クール', 'オーガニック', '柔らかい雰囲気',
    '和風', '伝統', 'ポートフォリオ', 'ギャラリー', 'LP', 'コンバージョン特化',
  ];

  const STUDIO_COLOR_OPTIONS = [
    '#0f172a ネイビー', '#1d4ed8 ブルー', '#0f766e ティール', '#15803d グリーン',
    '#ca8a04 マスタード', '#ea580c オレンジ', '#dc2626 レッド', '#be185d ピンク',
    '#7c3aed パープル', '#374151 グレー', '#111827 ブラック', '#f8fafc ホワイト',
  ];

  const STUDIO_REVISION_OPTIONS = [
    '屋号名（会社名）',
    '業種',
    'サービス内容',
    'テイスト',
    '使いたい色',
    '店舗（会社）情報',
    '最初からやり直し',
  ];

  const STUDIO_SECTION_OPTIONS_STANDARD = [
    'トップ', 'コンセプト', '特徴', 'サービス', '実績・ギャラリー', 'お問い合わせ', '会社・店舗情報', 'その他（自由入力）',
  ];

  const STUDIO_SECTION_OPTIONS_LITE = [
    'トップ', 'コンセプト', 'サービス', 'お問い合わせ', '会社・店舗情報',
  ];

  const resolveStudioPlanTier = (card: ServiceCard): StudioPlanTier => {
    const code = String(card.planCode || '').toLowerCase();
    const name = String(card.planName || '').toLowerCase();
    if (code.includes('pro') || name.includes('pro') || name.includes('プロ')) {
      return 'pro';
    }
    if (code.includes('lite') || code.includes('light') || name.includes('lite') || name.includes('ライト')) {
      return 'lite';
    }
    return 'standard';
  };

  const getStudioSectionOptions = (tier: StudioPlanTier): string[] => {
    return tier === 'lite' ? STUDIO_SECTION_OPTIONS_LITE : STUDIO_SECTION_OPTIONS_STANDARD;
  };

  const applyStudioPrompt = (
    items: string[],
    options: string[][],
    kinds: PromptSelectionKind[],
    modes?: Array<'select' | 'text'>,
  ) => {
    setShowConfirmSave(false);
    setMultiPromptItems(items);
    setMultiPromptSelectOptions(options);
    setMultiPromptSelectionKinds(kinds);
    setMultiPromptModes(modes || items.map((_, index) => (options[index] && options[index].length > 0 ? 'select' : 'text')));
    setMultiPromptSelected(items.map(() => ''));
    setMultiPromptSelectedMulti(items.map(() => []));
    setMultiPromptAnswers(items.map(() => ''));
  };

  const PAL_VIDEO_LITE_DURATION_OPTIONS = ['15秒', '20秒', '25秒', '30秒'];
  const PAL_VIDEO_PURPOSE_LABELS: Record<string, string> = {
    instagram_reel: 'Instagramリール',
    instagram_story: 'Instagramストーリーズ',
    instagram_feed: 'Instagramフィード',
    youtube_short: 'YouTubeショート',
    youtube: 'YouTube',
    tiktok: 'TikTok',
    x: 'X',
    line_voom: 'LINE VOOM',
    facebook: 'Facebook',
    promotion: 'プロモーション/広告',
  };
  const PAL_VIDEO_BGM_LABELS: Record<string, string> = {
    light: 'ライト/ポップ',
    pop: 'ライト/ポップ',
    cool: 'クール/ミニマル',
    warm: 'ウォーム/ナチュラル',
  };

  const applyPalVideoLitePrompt = (text: string) => {
    const normalized = String(text || '');
    if (/動画の秒数|秒数は何秒|何秒程度/.test(normalized)) {
      applyStudioPrompt(['動画の秒数は何秒程度がいいですか？'], [PAL_VIDEO_LITE_DURATION_OPTIONS], ['single']);
      return;
    }
    if (/使いたい色|色はありますか/.test(normalized)) {
      applyStudioPrompt(['使いたい色を1つ選択してください。'], [STUDIO_COLOR_OPTIONS], ['single']);
    }
  };

  const buildPalVideoCompletionMessage = (payload: ReturnType<typeof buildPalVideoPayload>) => {
    const purposeLabel = PAL_VIDEO_PURPOSE_LABELS[payload.purpose] || '動画';
    const duration = Number(payload.durationSec || 0) || 15;
    const colorText = payload.colorNote || payload.colorPrimary || '指定なし';
    const rawBgm = String(payload.bgm || '').trim();
    const bgmLabel = PAL_VIDEO_BGM_LABELS[rawBgm] || rawBgm || 'BGM指定なし';
    return `ありがとうございました！これで、制作に必要な情報は全て揃いました。${purposeLabel}で、${duration}秒、${colorText}を基調とした${bgmLabel}のBGMの動画を制作します。\n5営業日以内に連絡しますので、楽しみにお待ちください！`;
  };

  const extractStudioAnswers = (raw: string): string[] => {
    const source = String(raw || '').trim();
    if (!source) return [];
    if (!/^\d+\.\s/.test(source)) return [source];

    const matches = Array.from(source.matchAll(/\d+\.\s[^\n]*\n→\s*([\s\S]*?)(?=\n\d+\.\s|$)/g));
    const values = matches
      .map((match) => String(match[1] || '').trim())
      .filter(Boolean);
    return values.length ? values : [source];
  };

  const splitChoiceValues = (raw: string): string[] => {
    return Array.from(new Set(
      String(raw || '')
        .split(/\s*[、,\/\n]+\s*/)
        .map((token) => token.trim())
        .filter(Boolean),
    ));
  };

  const getServiceCandidatesByIndustry = (industry: string): string[] => {
    const text = String(industry || '').toLowerCase();
    if (/(飲食|カフェ|レストラン|居酒屋|ベーカリー|喫茶|bar|バー)/.test(text)) {
      return ['ランチ営業', 'ディナー営業', '宴会・コース料理', 'テイクアウト・デリバリー', 'その他（自由入力）'];
    }
    if (/(美容|サロン|エステ|ネイル|整体|美容室|理容|まつげ|アイラッシュ)/.test(text)) {
      return ['カット・カラー', 'パーマ・縮毛矯正', 'ヘッドスパ・トリートメント', '着付け・ヘアセット', 'その他（自由入力）'];
    }
    if (/(士業|法律|会計|税理士|社労士|行政書士|弁護士|司法書士)/.test(text)) {
      return ['顧問契約', 'スポット相談', '書類作成・申請代行', '相続・労務・税務サポート', 'その他（自由入力）'];
    }
    if (/(工務店|建築|リフォーム|住宅|外構|内装)/.test(text)) {
      return ['新築住宅の設計施工', 'リフォーム・リノベーション', '外構・エクステリア工事', '耐震・断熱改修', 'その他（自由入力）'];
    }
    if (/(不動産|賃貸|売買|仲介|管理)/.test(text)) {
      return ['賃貸仲介', '売買仲介', '不動産管理', '査定・売却相談', 'その他（自由入力）'];
    }
    if (/(医療|クリニック|歯科|病院|整形|内科|皮膚科)/.test(text)) {
      return ['一般外来', '予防接種・健康診断', '自由診療', '訪問診療', 'その他（自由入力）'];
    }
    if (/(教育|スクール|塾|教室|習い事|講座)/.test(text)) {
      return ['受験対策コース', '補習・基礎学習コース', 'オンライン指導', '体験授業・学習相談', 'その他（自由入力）'];
    }
    return ['主力サービス提供', '導入支援・コンサルティング', '保守・アフターサポート', '法人向け・個人向けプラン', 'その他（自由入力）'];
  };

  const sanitizeSectionSelections = (sections: string[]): string[] => {
    const filtered = sections.filter((item) => !/フッター/.test(String(item || '')));
    return Array.from(new Set(filtered));
  };

  const escapeHtml = (value: string): string => {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  };

  const buildStudioWireframeHtml = (profile: StudioProfile): string => {
    const selectedSections = sanitizeSectionSelections(profile.sections || []);
    const sectionSet = new Set(selectedSections);
    const shouldShow = (label: string) => sectionSet.has(label);
    const fallbackSections = selectedSections.length === 0;

    const showTop = fallbackSections || shouldShow('トップ');
    const showConcept = fallbackSections || shouldShow('コンセプト');
    const showFeatures = fallbackSections || shouldShow('特徴');
    const showService = fallbackSections || shouldShow('サービス');
    const showWorks = fallbackSections || shouldShow('実績・ギャラリー');
    const showContact = fallbackSections || shouldShow('お問い合わせ');
    const showCompany = fallbackSections || shouldShow('会社・店舗情報');

    const shopName = escapeHtml(profile.shopName || '屋号名が入ります');
    const industry = escapeHtml(profile.industry || '業種が入ります');
    const color = escapeHtml(profile.color || '#FFFFFF');
    const appeal = escapeHtml(profile.appealPoint || 'ここに強み・アピールポイントが入ります。');
    const services = (profile.services || []).map((item) => escapeHtml(item)).filter(Boolean);

    const companyRows = Object.entries(profile.companyDetails || {})
      .map(([key, value]) => `<tr><th class="w-40 text-left p-3 text-slate-500">${escapeHtml(key)}</th><td class="p-3">${escapeHtml(value)}</td></tr>`)
      .join('');

    return `
<div class="template-root" style="--bg-color: #ffffff; --border-color: #e2e8f0;">
  <div class="min-h-screen bg-[var(--bg-color)] text-slate-900 font-sans">
    <header class="sticky top-0 bg-white border-b border-[var(--border-color)] z-30">
      <div class="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <h1 class="text-xl font-bold">${shopName}</h1>
        <p class="text-sm text-slate-500">業種: ${industry}</p>
      </div>
    </header>

    <main class="max-w-6xl mx-auto px-6 py-8 space-y-8">
      ${showTop ? `
      <section class="bg-white border border-[var(--border-color)] rounded-xl p-6">
        <h2 class="text-2xl font-bold mb-3">トップセクション（下書き）</h2>
        <p class="text-slate-600 mb-4">キャッチコピーと導入文がここに入ります。</p>
        <div class="h-48 rounded-lg bg-slate-200 border border-slate-300 flex items-center justify-center text-slate-600 text-sm">画像エリア: メインビジュアル（店舗外観 / サービス利用シーン）</div>
      </section>` : ''}

      ${showConcept ? `
      <section class="bg-white border border-[var(--border-color)] rounded-xl p-6">
        <h2 class="text-xl font-bold mb-3">コンセプト</h2>
        <p class="text-slate-700">${appeal}</p>
      </section>` : ''}

      ${showFeatures ? `
      <section class="bg-white border border-[var(--border-color)] rounded-xl p-6">
        <h2 class="text-xl font-bold mb-3">特徴</h2>
        <ul class="list-disc pl-5 text-slate-700 space-y-1">
          <li>特徴テキスト1（ここに具体的な強み）</li>
          <li>特徴テキスト2（ここに差別化ポイント）</li>
          <li>特徴テキスト3（ここに信頼要素）</li>
        </ul>
      </section>` : ''}

      ${showService ? `
      <section class="bg-white border border-[var(--border-color)] rounded-xl p-6">
        <h2 class="text-xl font-bold mb-3">サービス内容</h2>
        <div class="grid sm:grid-cols-2 gap-3">
          ${(services.length ? services : ['サービス内容がここに入ります']).map((item) => `<div class="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">${item}</div>`).join('')}
        </div>
      </section>` : ''}

      ${showWorks ? `
      <section class="bg-white border border-[var(--border-color)] rounded-xl p-6">
        <h2 class="text-xl font-bold mb-3">実績・ギャラリー</h2>
        <div class="grid md:grid-cols-3 gap-3">
          <div class="h-36 rounded-lg bg-slate-200 border border-slate-300 flex items-center justify-center text-xs text-slate-600">画像エリア: 施工実績 / 制作物1</div>
          <div class="h-36 rounded-lg bg-slate-200 border border-slate-300 flex items-center justify-center text-xs text-slate-600">画像エリア: サービス提供シーン2</div>
          <div class="h-36 rounded-lg bg-slate-200 border border-slate-300 flex items-center justify-center text-xs text-slate-600">画像エリア: スタッフ・店舗写真3</div>
        </div>
      </section>` : ''}

      ${showContact ? `
      <section class="bg-white border border-[var(--border-color)] rounded-xl p-6">
        <h2 class="text-xl font-bold mb-3">お問い合わせ</h2>
        <p class="text-slate-700 mb-3">お問い合わせ導線をここに配置します。</p>
        <div class="rounded-lg bg-slate-50 border border-slate-200 p-4 text-sm text-slate-600">フォーム項目（名前 / メール / 内容）をここに表示</div>
      </section>` : ''}

      ${showCompany ? `
      <section class="bg-white border border-[var(--border-color)] rounded-xl p-6">
        <h2 class="text-xl font-bold mb-3">会社・店舗情報</h2>
        ${profile.includeCompanyInfo && companyRows ? `<table class="w-full text-sm border border-slate-200">${companyRows}</table>` : '<p class="text-slate-600">会社情報の掲載内容がここに入ります。</p>'}
      </section>` : ''}
    </main>

    <footer class="border-t border-[var(--border-color)] bg-white">
      <div class="max-w-6xl mx-auto px-6 py-6 text-xs text-slate-500 flex items-center justify-between">
        <span>${shopName}</span>
        <span>配色メモ: ${color}（最終デザインで適用予定）</span>
      </div>
    </footer>
  </div>
</div>`;
  };

  const chooseTemplateByTaste = (taste: string): Template => {
    const t = String(taste || '').trim().toLowerCase();
    if (!t) return templates[0];

    const tasteKeywordMap: Record<string, string[]> = {
      'モダン': ['modern', 'モダン', 'clean', 'startup'],
      'クリーン': ['clean', 'クリーン', 'simple'],
      'シンプル': ['simple', 'minimal', 'シンプル'],
      'ラグジュアリー': ['luxury', 'elegant', 'ラグジュアリー'],
      '大人っぽい': ['luxury', 'elegant', 'minimal'],
      '信頼感': ['corporate', 'business', 'trust', '信頼'],
      '堅実': ['corporate', 'business', 'firm'],
      '元気': ['pop', 'colorful', '元気'],
      'POP': ['pop', 'colorful', '元気', '親しみ'],
      '親しみ': ['pop', 'natural', '親しみ'],
      'ミニマル': ['minimal', '洗練'],
      '余白': ['minimal', '余白'],
      'テック感': ['dark', 'tech', 'テック'],
      'クール': ['dark', 'cool', 'クール'],
      'オーガニック': ['natural', 'organic', 'オーガニック'],
      '柔らかい雰囲気': ['natural', 'soft', '柔らかい'],
      '和風': ['japanese', '和風'],
      '伝統': ['japanese', 'traditional', '伝統'],
      'ポートフォリオ': ['portfolio', 'creator'],
      'ギャラリー': ['gallery', 'portfolio', 'works'],
      'LP': ['lp', 'marketing', 'sales'],
      'コンバージョン特化': ['lp', 'conversion', 'marketing'],
    };

    const key = STUDIO_TASTE_OPTIONS.find((label) => label.toLowerCase() === t) || taste;
    const keywords = tasteKeywordMap[key] || [t];

    let best = templates[0];
    let bestScore = -1;
    templates.forEach((template) => {
      const hay = `${template.name} ${template.description} ${template.tags.join(' ')}`.toLowerCase();
      let score = 0;
      keywords.forEach((keyword) => {
        if (hay.includes(keyword.toLowerCase())) score += 3;
      });
      if (score > bestScore) {
        best = template;
        bestScore = score;
      }
    });
    return best;
  };

  const decodeHtmlEntities = (value: string): string => {
    return String(value || '')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&amp;/g, '&');
  };

  const extractHtmlCandidate = (text: string): { html: string; explanation: string } | null => {
    const source = String(text || '').trim();
    if (!source) return null;

    const fenced = source.match(/```html\s*([\s\S]*?)```/i);
    if (fenced && fenced[1]) {
      const html = decodeHtmlEntities(String(fenced[1]).trim());
      const explanation = source.replace(fenced[0], '').trim();
      return html ? { html, explanation } : null;
    }

    // LLMが ```html ではなく ``` で返すケースを吸収する。
    const genericFence = source.match(/```\s*([\s\S]*?)```/i);
    if (genericFence && genericFence[1]) {
      const candidate = decodeHtmlEntities(String(genericFence[1]).trim());
      if (/<(?:!DOCTYPE|html|head|body|main|section|div|header|footer|article|nav|style)\b/i.test(candidate)) {
        const explanation = source.replace(genericFence[0], '').trim();
        return { html: candidate, explanation };
      }
    }

    // 検出漏れ防止: フェンス自体を外してからHTMLを探索する。
    const decoded = decodeHtmlEntities(source).replace(/```(?:html)?/gi, '').replace(/```/g, '').trim();
    const htmlBlock = decoded.match(/<html[\s\S]*?<\/html>/i);
    if (htmlBlock && htmlBlock[0]) {
      const start = decoded.indexOf(htmlBlock[0]);
      const explanation = decoded.slice(0, Math.max(0, start)).trim();
      return { html: htmlBlock[0].trim(), explanation };
    }

    const fragmentStart = decoded.search(/<(?:!DOCTYPE|style|main|section|div|header|footer|article|nav|body)\b/i);
    if (fragmentStart >= 0) {
      const html = decoded.slice(fragmentStart).trim();
      const explanation = decoded.slice(0, fragmentStart).trim();
      if (/<[^>]+>/.test(html)) {
        return { html, explanation };
      }
    }

    return null;
  };

  useEffect(() => {
    if (activeServiceMode === 'pal_studio' && studioStep !== 'idle' && studioStep !== 'completed') {
      return;
    }

    const latestMessage = messages[messages.length - 1];
    if (!latestMessage || latestMessage.role !== 'ai') {
      clearMultiPromptState();
      return;
    }

    const content = String(latestMessage.content || '');
    const normalized = content.replace(/[（]/g, '(').replace(/[）]/g, ')');

    // 最終フォールバック: 明示タグがある場合は必ず補助UIを表示する。
    const hardMultiMatch = normalized.match(/\(\s*複数選択\s*\)[\s\S]*?\(\s*(?:選択肢|候補)\s*[:：]\s*([^\)]+)\)/i);
    if (hardMultiMatch) {
      const options = Array.from(new Set(
        String(hardMultiMatch[1] || '')
          .replace(/など.*$/i, '')
          .split(/\s*[\/，、,・]\s*|\s+または\s+|\s+or\s+|\s+もしくは\s+|\s+及び\s+|\s+および\s+/i)
          .map((token) => token.trim())
          .filter((token) => token.length >= 1 && token.length <= 24)
          .filter((token) => !/^(選択肢|候補|例|入力|回答|ください|お願いします)$/i.test(token)),
      ));

      if (options.length >= 2) {
        const questionLine = normalized
          .split('\n')
          .map((line) => sanitizePromptText(line))
          .find((line) => /[?？]/.test(line));
        const question = sanitizePromptText(
          String(questionLine || '当てはまるものを選択してください。')
            .replace(/[（(]\s*複数選択\s*[）)]/gi, '')
            .replace(/[（(]\s*(?:選択肢|候補)\s*[:：][^）)]*[）)]/gi, '')
            .replace(/\s+/g, ' ')
            .trim(),
        ) || '当てはまるものを選択してください。';

        setShowConfirmSave(false);
        setMultiPromptItems([question]);
        setMultiPromptSelectOptions([options]);
        setMultiPromptSelectionKinds(['multi']);
        setMultiPromptModes(['select']);
        setMultiPromptSelected(['']);
        setMultiPromptSelectedMulti([[]]);
        setMultiPromptAnswers(['']);
        return;
      }
    }

    // 補助UIの最終保険: 「(選択肢: ...)」があれば必ず選択UIを表示する。
    const hardOptionMatch = normalized.match(/\(\s*(?:選択肢|候補)\s*[:：]\s*([^\)]+)\)/i);
    if (hardOptionMatch) {
      const options = Array.from(new Set(
        String(hardOptionMatch[1] || '')
          .replace(/など.*$/i, '')
          .split(/\s*[\/，、,・]\s*|\s+または\s+|\s+or\s+|\s+もしくは\s+|\s+及び\s+|\s+および\s+/i)
          .map((token) => token.trim())
          .filter((token) => token.length >= 1 && token.length <= 24)
          .filter((token) => !/^(選択肢|候補|例|入力|回答|ください|お願いします)$/i.test(token)),
      ));

      if (options.length >= 2) {
        const questionLine = normalized
          .split('\n')
          .map((line) => sanitizePromptText(line))
          .find((line) => /[?？]/.test(line));
        const question = sanitizePromptText(
          String(questionLine || '当てはまるものを選択してください。')
            .replace(/[（(]\s*(?:複数選択|チェック|2択|二択|単一選択)\s*[）)]/gi, '')
            .replace(/[（(]\s*(?:選択肢|候補)\s*[:：][^）)]*[）)]/gi, '')
            .replace(/\s+/g, ' ')
            .trim(),
        ) || '当てはまるものを選択してください。';

        const selectionKind: PromptSelectionKind = /\(\s*(?:複数選択|チェック)\s*\)|\b複数選択\b|\bチェック\b/i.test(normalized)
          ? 'multi'
          : 'single';

        setShowConfirmSave(false);
        setMultiPromptItems([question]);
        setMultiPromptSelectOptions([options]);
        setMultiPromptSelectionKinds([selectionKind]);
        setMultiPromptModes(['select']);
        setMultiPromptSelected(['']);
        setMultiPromptSelectedMulti([[]]);
        setMultiPromptAnswers(['']);
        return;
      }
    }

    let prompts = parseMultiPrompts(content);
    if (!prompts.length) {
      const forced = parseTaggedPromptFallback(content);
      if (forced) prompts = [forced];
    }
    if (!prompts.length) {
      clearMultiPromptState();
      return;
    }

    setShowConfirmSave(false);

    setMultiPromptItems(prompts.map((item) => item.question));
    setMultiPromptSelectOptions(prompts.map((item) => item.options));
    setMultiPromptSelectionKinds(prompts.map((item) => item.selectionKind));
    setMultiPromptModes(
      prompts.map((item) => (item.options.length > 0 ? 'select' : 'text')),
    );
    setMultiPromptSelected(prompts.map(() => ''));
    setMultiPromptSelectedMulti(prompts.map(() => []));
    setMultiPromptAnswers(prompts.map(() => ''));
  }, [messages, activeServiceMode, studioStep]);

  // ★DB保存の判定ロジックを含む関数
  const extractCode = async (text: string, currentMessages: any[]): Promise<boolean> => {
    const extracted = extractHtmlCandidate(text);
    if (!extracted?.html) return false;

    const code = extracted.html.trim();
    setGeneratedCode(code);
    
    // HTML コードブロック前の「AI の説明」を抽出
    const explanation = extracted.explanation || '';
    setAiExplanation(explanation);
    
    // 本番デザインと判断されたので、保存候補として情報を保持しておく
    setConfirmMessages(currentMessages);
    setShowConfirmSave(true); // HTMLが生成されたら即表示

    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setTimeout(() => setActiveTab('preview'), 1000);
    }

    return true;
  };

  const buildUserAnswers = (currentMessages: any[]) => {
    const userAnswers: { q: string, a: string }[] = [];
    for (let i = 0; i < currentMessages.length; i++) {
      const msg = currentMessages[i];
      if (msg.role !== 'user') continue;
      const prevAiMsg = currentMessages
        .slice(0, i)
        .reverse()
        .find((m: any) => m.role === 'ai');
      userAnswers.push({
        q: prevAiMsg?.content || '質問',
        a: String(msg.content || ''),
      });
    }
    return userAnswers;
  };

  const autoSelectTemplate = (answers: { q: string; a: string }[]): Template => {
    if (!answers || answers.length === 0) return templates[0];

    const text = answers
      .map((item) => `${item.q || ''} ${item.a || ''}`)
      .join(' ')
      .toLowerCase();

    const extractDescriptionTokens = (description: string): string[] => {
      const cleaned = String(description || '')
        .replace(/[(){}\[\]"'`]/g, ' ')
        .replace(/[。、，,・/:;!！?？]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      if (!cleaned) return [];

      const raw = cleaned
        .split(/\s+/)
        .map((token) => token.trim().toLowerCase())
        .filter((token) => token.length >= 2)
        .filter((token) => !/^(デザイン|テンプレート|レイアウト|セクション|対応|高い|汎用性|モダン|クリーン)$/i.test(token));

      return Array.from(new Set(raw)).slice(0, 24);
    };

    const scores: Record<string, number> = {};

    templates.forEach((template) => {
      scores[template.id] = 0;
      template.tags.forEach((tag) => {
        if (text.includes(tag.toLowerCase())) scores[template.id] += 3;

        const keywords: Record<string, string[]> = {
          simple: ['シンプル', 'すっきり', '簡潔', '標準'],
          luxury: ['高級', 'エレガント', '上品', '高価', 'ラグジュアリー'],
          business: ['企業', '会社', '信頼', '誠実', 'ビジネス', 'コーポレート'],
          pop: ['元気', '明るい', '楽しい', 'ポップ', '子供', 'キッズ'],
          minimal: ['ミニマル', '余白', '洗練', '無駄のない', '白'],
          dark: ['クール', 'かっこいい', '黒', 'ダーク', '夜', 'テック'],
          natural: ['自然', 'オーガニック', '優しい', '緑', 'カフェ', 'ナチュラル'],
          japanese: ['和風', '日本', '伝統', '和食', '旅館'],
          portfolio: ['写真', '作品', 'ポートフォリオ', 'ギャラリー', 'クリエイター'],
          lp: ['販売', '集客', 'ランディング', '訴求', 'コンバージョン'],
        };

        (keywords[tag] || []).forEach((keyword) => {
          if (text.includes(keyword.toLowerCase())) scores[template.id] += 1;
        });
      });

      // description に含まれる語句との一致を重視する。
      const descriptionTokens = extractDescriptionTokens(template.description);
      descriptionTokens.forEach((token) => {
        if (text.includes(token)) scores[template.id] += 2;
      });

      const fullDescription = String(template.description || '').toLowerCase();
      if (fullDescription.length >= 6 && text.includes(fullDescription.slice(0, Math.min(16, fullDescription.length)))) {
        scores[template.id] += 2;
      }
    });

    const sorted = Object.entries(scores).sort(([, a], [, b]) => b - a);
    const selectedId = sorted[0] && sorted[0][1] > 0 ? sorted[0][0] : templates[0].id;
    return templates.find((template) => template.id === selectedId) || templates[0];
  };

  const fetchPreviewImage = async (query: string) => {
    const q = String(query || '').trim();
    if (!q) {
      setPreviewImageUrl('');
      return;
    }
    try {
      setIsPreviewImageLoading(true);
      const response = await fetch('/api/search-images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || `画像プレビュー取得に失敗 (${response.status})`);
      }
      const firstImage = Array.isArray(data?.images) ? data.images[0] : null;
      setPreviewImageUrl(String(firstImage?.url || firstImage?.thumb || '').trim());
    } catch (error) {
      console.error('preview image fetch error:', error);
      setPreviewImageUrl('');
    } finally {
      setIsPreviewImageLoading(false);
    }
  };

  const createPreviewImageQuery = (summary: HearingSummary, template: Template) => {
    const parts = [
      summary.businessService,
      summary.designPreference,
      summary.target,
      template.tags.slice(0, 2).join(' '),
      'website hero',
    ]
      .filter(Boolean)
      .map((part) => String(part).trim())
      .filter((part) => part.length > 0);

    return parts.join(' ');
  };

  const collectHearingChecklist = (currentMessages: ChatMessage[]): HearingChecklist => {
    const answers = buildUserAnswers(currentMessages);
    const joined = answers
      .map((item) => `${item.q || ''} ${item.a || ''}`)
      .join('\n')
      .toLowerCase();

    const emailPattern = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;
    const phonePattern = /0\d{1,4}-\d{1,4}-\d{3,4}/;
    const hasAddressKeyword = /(住所|所在地|都|道|府|県|市|区|町|丁目|番地|アクセス)/i.test(joined);

    const shopName = /(屋号|会社名|法人名|ブランド名|サービス名)/i.test(joined);
    const sections = /(セクション|構成|掲載|表示する内容|載せたい内容|ページ構成)/i.test(joined);
    const phoneAddress = phonePattern.test(joined) || (/(電話番号|tel|住所|所在地)/i.test(joined) && hasAddressKeyword);
    const concept = /(強み|コンセプト|特徴|売り|差別化|想い)/i.test(joined);
    const color = /(色|カラー|配色|カラーパレット)/i.test(joined);
    const email = emailPattern.test(joined) || /(メールアドレス|mail|e-mail|お問い合わせ先メール)/i.test(joined);

    const missingLabels: string[] = [];
    if (!shopName) missingLabels.push('屋号名');
    if (!sections) missingLabels.push('表示するセクション');
    if (!phoneAddress) missingLabels.push('電話番号・住所');
    if (!concept) missingLabels.push('強み・コンセプト');
    if (!color) missingLabels.push('使いたい色');
    if (!email) missingLabels.push('メールアドレス');

    return { shopName, sections, phoneAddress, concept, color, email, missingLabels };
  };

  const generateDraftFromTemplate = async (
    template: Template,
    currentMessages: ChatMessage[],
    summary: HearingSummary,
  ): Promise<string> => {
    const answerSummary = buildUserAnswers(currentMessages)
      .map((item) => `Q: ${String(item.q || '').slice(0, 120)}\nA: ${String(item.a || '')}`)
      .join('\n\n');

    const draftPrompt = `
あなたはWebデザイナーです。以下のヒアリング内容をもとに、ベースHTMLを顧客専用の下書きデザインへ書き換えてください。

制約:
- HTML構造は大きく崩さない
- 本文は日本語中心
- 未確認情報は捏造せず、必要最小限のプレースホルダー表現にする
- 最後は \`\`\`html ... \`\`\` だけを返す

必須反映:
- 屋号名
- 表示セクション
- 電話番号/住所
- 強み/コンセプト
- 希望色
- メールアドレス

要約:
${JSON.stringify(summary)}

ヒアリング内容:
${answerSummary}

ベースHTML:
${template.html}
`;

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ system: draftPrompt, history: [] }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(String(data?.text || `draft generate failed (${response.status})`));
      }
      const extracted = extractHtmlCandidate(String(data?.text || ''));
      return extracted?.html?.trim() || template.html;
    } catch (error) {
      console.error('draft generation error:', error);
      return template.html;
    }
  };

  const maybePrepareTemplatePreview = async (
    currentMessages: ChatMessage[],
    summary: HearingSummary,
    triggerText: string,
  ): Promise<boolean> => {
    if (activeServiceMode !== 'pal_studio') return false;
    const explicitPreviewRequest = /(プレビュー|テンプレ|デザイン案|進めて|作成|提案|確認|ok|OK|お任せ)/.test(String(triggerText || ''));

    const checklist = collectHearingChecklist(currentMessages);
    if (checklist.missingLabels.length > 0) {
      if (explicitPreviewRequest) {
        setMessages((prev) => [
          ...prev,
          {
            role: 'ai',
            content: `下書き作成の前に、以下を確認させてください。\n- ${checklist.missingLabels.join('\n- ')}`,
          },
        ]);
      }
      return false;
    }

    const selectedTemplate = autoSelectTemplate(buildUserAnswers(currentMessages));
    const draftHtml = await generateDraftFromTemplate(selectedTemplate, currentMessages, summary);
    setSelectedTemplateId(selectedTemplate.id);
    setGeneratedCode(draftHtml);
    setConfirmMessages(currentMessages);
    setAiExplanation(`テンプレート選定: ${selectedTemplate.name} (${selectedTemplate.id})`);
    setShowConfirmSave(true);
    setPreviewRenderMode('desktop');

    const imageQuery = createPreviewImageQuery(summary, selectedTemplate);
    void fetchPreviewImage(imageQuery);

    setMessages((prev) => [
      ...prev,
      {
        role: 'ai',
        content: 'ヒアリング内容から下書きを作成しました。右側でHTMLまたは画像プレビューを確認して、修正かOKを選んでください。',
      },
    ]);

    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setTimeout(() => setActiveTab('preview'), 300);
    }

    return true;
  };

  const normalizePalVideoPurpose = (raw: string): string => {
    const value = String(raw || '').toLowerCase();
    if (/ストーリー|ストーリーズ|stories/.test(value)) return 'instagram_story';
    if (/reel|リール|ショート|short/.test(value)) return 'instagram_reel';
    if (/フィード|feed/.test(value)) return 'instagram_feed';
    if (/youtubeショート|youtube\s*short|shorts/.test(value)) return 'youtube_short';
    if (/youtube|ユーチューブ/.test(value)) return 'youtube';
    if (/tiktok|ティックトック/.test(value)) return 'tiktok';
    if (/(^|\s|\b)x(\b|\s)|twitter|ツイッター/.test(value)) return 'x';
    if (/line|voom|ライン/.test(value)) return 'line_voom';
    if (/facebook|フェイスブック/.test(value)) return 'facebook';
    if (/広告|プロモ|promotion|ad/.test(value)) return 'promotion';
    if (/説明|解説|チュートリアル/.test(value)) return 'promotion';
    return '';
  };

  const PAL_VIDEO_TEMPLATE_MAP: Record<string, string> = {
    instagram_feed: 'a02095a2-9469-4f52-9bcd-66fc884453a1',
    promotion: '516cafa1-15cc-44e3-8a39-af5a07862bc0',
    youtube: '979f7579-5567-4d7b-a615-777d825d9f9d',
  };

  const resolvePalVideoTemplateCandidates = (purpose: string) => {
    const mapped = PAL_VIDEO_TEMPLATE_MAP[purpose];
    return [mapped, 'pal_video_fixed_v1'].filter(Boolean);
  };

  const extractPalVideoDuration = (raw: string): number | null => {
    const text = String(raw || '');
    const match = text.match(/(\d+)\s*(秒|分)/);
    if (!match) return null;
    const value = Number(match[1]);
    if (!Number.isFinite(value)) return null;
    return match[2] === '分' ? value * 60 : value;
  };

  const splitTelop = (raw: string): { main: string; sub: string } => {
    const text = String(raw || '').trim();
    if (!text) return { main: '', sub: '' };
    const parts = text.split(/[\n\/／]/).map((part) => part.trim()).filter(Boolean);
    if (parts.length === 0) return { main: '', sub: '' };
    if (parts.length === 1) return { main: parts[0], sub: '' };
    return { main: parts[0], sub: parts.slice(1).join(' / ') };
  };

  const extractHexColors = (raw: string): string[] => {
    const matches = String(raw || '').match(/#[0-9a-fA-F]{6}/g);
    return Array.isArray(matches) ? matches.slice(0, 2) : [];
  };

  const extractUrls = (raw: string): string[] => {
    const matches = String(raw || '').match(/https?:\/\/[^\s)]+/g);
    return Array.isArray(matches) ? matches : [];
  };

  const buildPalVideoPayload = (currentMessages: any[]) => {
    const answers = buildUserAnswers(currentMessages);
    const purposeAnswer = answers.find((item) => /(制作目的|用途|媒体|プラットフォーム|instagram|インスタ|youtube|tiktok|x|twitter|line|voom|facebook|広告|プロモ|説明)/i.test(item.q))?.a || '';
    const durationAnswer = answers.find((item) => /(尺|秒|時間|長さ|動画の長さ)/i.test(item.q))?.a || '';
    const telopAnswer = answers.find((item) => /(テロップ|コピー|キャッチ|キャッチコピー)/i.test(item.q))?.a || '';
    const colorAnswer = answers.find((item) => /(色|カラー|配色|トーン|雰囲気)/i.test(item.q))?.a || '';
    const materialAnswer = answers.find((item) => /(素材|画像|写真|ロゴ|動画素材)/i.test(item.q))?.a || '';
    const bgmAnswer = answers.find((item) => /(bgm|音楽|曲|サウンド)/i.test(item.q))?.a || '';

    const purpose = normalizePalVideoPurpose(purposeAnswer) || normalizePalVideoPurpose(answers.map((item) => item.a).join(' '));
    const durationSec = extractPalVideoDuration(durationAnswer || answers.map((item) => item.a).join(' ')) || 30;
    const telop = splitTelop(telopAnswer || '');
    const colors = extractHexColors(colorAnswer);
    const imageUrls = [
      ...extractUrls(materialAnswer),
      ...answers.flatMap((item) => extractUrls(item.a)),
    ];

    const hearingMessages = currentMessages
      .filter((msg: any) => msg?.role === 'ai' || msg?.role === 'user')
      .map((msg: any) => ({
        role: msg.role === 'ai' ? 'assistant' : 'user',
        content: String(msg.content || ''),
      }))
      .filter((msg: any) => !/(顧客id|palette id|パスワード|認証|ログイン|こんにちは！palette ai)/i.test(msg.content))
      .filter((msg: any) => !/•{3,}/.test(msg.content));

    const resolvedPurpose = purpose || 'instagram_reel';

    return {
      purpose: resolvedPurpose,
      durationSec,
      telopMain: telop.main || 'テロップ未設定',
      telopSub: telop.sub || 'サブテロップ未設定',
      colorPrimary: colors[0] || '',
      colorAccent: colors[1] || '',
      colorNote: colorAnswer || '',
      imageUrls: Array.from(new Set(imageUrls)),
      bgm: bgmAnswer || '',
      hearingAnswers: answers,
      hearingMessages,
      templateCandidates: resolvePalVideoTemplateCandidates(resolvedPurpose),
    };
  };

  const buildCreatomateFallbackPlan = (payload: any) => {
    const cuts = Array.isArray(payload?.cuts) ? payload.cuts : [];
    const durationSec = Number(payload?.durationSec || 30);
    const sceneCount = cuts.length > 0 ? cuts.length : Math.max(1, Math.min(7, Math.ceil(durationSec / 4)));
    const baseDuration = 4;
    const lastDuration = Math.max(1, durationSec - baseDuration * (sceneCount - 1));
    const resolvedPurpose = String(payload?.purpose || 'instagram_reel');
    const templateCandidates = Array.isArray(payload?.templateCandidates) && payload.templateCandidates.length > 0
      ? payload.templateCandidates
      : resolvePalVideoTemplateCandidates(resolvedPurpose);
    const safeCuts = cuts.length > 0
      ? cuts
      : Array.from({ length: sceneCount }).map((_, index) => ({
          durationSec: index === sceneCount - 1 ? lastDuration : baseDuration,
          imageUrl: payload?.imageUrls?.[index] || payload?.imageUrls?.[0] || '',
          textMain: index === 0 ? payload?.telopMain : `ポイント${index + 1}`,
          textSub: index === 0 ? payload?.telopSub : '',
          templateId: templateCandidates[index % templateCandidates.length],
          textAnimation: 'none',
          textTransition: 'none',
        }));

    return {
      templateId: 'pal_video_fixed_v1',
      templateMode: 'dynamic',
      scenes: safeCuts.map((cut: any) => ({
        durationSec: Number(cut.durationSec || baseDuration),
        imageUrl: String(cut.imageUrl || ''),
        title: String(cut.textMain || payload?.telopMain || ''),
        subtitle: String(cut.textSub || payload?.telopSub || ''),
        templateId: String(cut.templateId || 'pal_video_fixed_v1'),
        textAnimation: String(cut.textAnimation || 'none'),
        textTransition: String(cut.textTransition || 'none'),
      })),
      style: {
        primaryColor: String(payload?.colorPrimary || '#E95464'),
        accentColor: String(payload?.colorAccent || '#1c9a8b'),
        font: 'NotoSansJP',
      },
      audio: { bgm: String(payload?.bgm || 'light') },
      dynamicTemplateCandidates: templateCandidates,
    };
  };

  const generateCreatomatePlan = async (payload: any, currentMessages: any[]) => {
    try {
      const response = await fetch('/api/palette-ai/pal-video-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payload, hearingMessages: currentMessages }),
      });
      if (!response.ok) throw new Error(`script generate failed: ${response.status}`);
      const data = await response.json().catch(() => ({}));
      if (data?.success && data?.plan) return data.plan;
      return buildCreatomateFallbackPlan(payload);
    } catch (error) {
      console.warn('creatomate plan fallback:', error);
      return buildCreatomateFallbackPlan(payload);
    }
  };

  const upsertPalVideoJob = async (currentMessages: any[]) => {
    if (activeServiceMode !== 'pal_video') return;
    const planCode = String(activeServiceCard?.planCode || 'pal_video_lite');
    const payload = buildPalVideoPayload(currentMessages);
    const creatomatePlan = await generateCreatomatePlan(payload, currentMessages);
    try {
      await fetch('/api/palette-ai/pal-video-job', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paletteId: resolvedCustomerId,
          planCode,
          status: '編集中',
          payload: {
            ...payload,
            creatomatePlan,
            creatomateTemplateId: creatomatePlan?.templateId || 'pal_video_fixed_v1',
            creatomateTemplateMode: creatomatePlan?.templateMode || 'fixed',
          },
        }),
      });
    } catch (error) {
      console.error('pal_video job sync failed:', error);
    }
  };

  const saveDraftToLab = async (
    currentMessages: any[],
    status: 'hearing' | 'reviewing' | 'completed' = 'hearing',
    htmlOverride?: string,
    descriptionOverride?: string,
    templateIdOverride?: string,
  ) => {
    try {
      const userAnswers = buildUserAnswers(currentMessages);
      const customerName = resolvePersistedCustomerName(currentMessages, htmlOverride || generatedCode);

      const payload = {
        id: sessionCustomerId,
        customer_id: resolvedCustomerId || sessionCustomerId,
        name: customerName,
        selectedTemplateId: templateIdOverride || selectedTemplateId,
        answers: userAnswers,
        description: descriptionOverride || aiExplanation || 'ヒアリング中',
        htmlCode: htmlOverride ?? generatedCode ?? '',
        status,
      };

      const response = await fetch('/api/save-customer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err?.error || `保存に失敗しました (${response.status})`);
      }

      await upsertPalVideoJob(currentMessages);
    } catch (err) {
      console.error('下書き保存エラー:', err);
    }
  };

  // 明示的に保存を行う関数
  const saveToLab = async (currentMessages: any[], html: string, descriptionOverride?: string): Promise<boolean> => {
    if (!html) {
      console.error("保存するHTMLがありません");
      setMessages(prev => [
        ...prev,
        { role: 'ai', content: '保存できるHTMLがまだ生成されていません。先にデザインコードを生成してください。' }
      ]);
      return false;
    }
    try {
      const customerName = resolvePersistedCustomerName(currentMessages, html);

      const userAnswers = buildUserAnswers(currentMessages);

      const payload = {
        id: sessionCustomerId,
        customer_id: resolvedCustomerId || sessionCustomerId,
        name: customerName,
        selectedTemplateId,
        answers: userAnswers,
        description: descriptionOverride || aiExplanation || "デザイン方針の詳細記録なし",
        htmlCode: html,
        status: 'reviewing',
      };

      const response = await fetch('/api/save-customer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err?.error || `保存に失敗しました (${response.status})`);
      }

      console.log("Labへの保存が完了しました");
      return true;
    } catch (err) {
      console.error("保存エラー:", err);
      const message = err instanceof Error ? err.message : '保存に失敗しました。時間をおいて再度お試しください。';
      setMessages(prev => [
        ...prev,
        { role: 'ai', content: `保存に失敗しました: ${message}` }
      ]);
      return false;
    }
  };

  const appendAiMessage = (message: Omit<ChatMessage, 'role'>) => {
    setMessages((prev) => [...prev, { role: 'ai', ...message }]);
  };

  const includesAny = (value: string, candidates: string[]) => {
    const text = String(value || '').toLowerCase();
    return candidates.some((candidate) => text.includes(candidate));
  };

  const toDateLabel = (raw?: string | null): string => {
    if (!raw) return '未設定';
    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) return String(raw);
    return date.toLocaleDateString('ja-JP');
  };

  const buildContractInfoCards = (summary: any): ContractInfoCard[] => {
    const contracts: any[] = Array.isArray(summary?.contracts) ? summary.contracts : [];
    const plans: any[] = Array.isArray(summary?.plans) ? summary.plans : [];
    const planMap = new Map<string, any>(plans.map((plan) => [String(plan.id), plan]));

    return contracts.map((contract, index) => {
      const plan = planMap.get(String(contract?.planId || ''));
      const planName = String(plan?.name || '未設定プラン');
      const phaseName = String(contract?.phaseDisplayName || contract?.phaseLabel || contract?.phase || '未設定');
      const start = toDateLabel(contract?.startDate);
      const end = contract?.endDate ? toDateLabel(contract.endDate) : '継続中';
      const amount = `¥${Number(contract?.priceYen || 0).toLocaleString('ja-JP')}`;

      return {
        id: String(contract?.id || `contract-${index}`),
        planName,
        phaseName,
        period: `${start} 〜 ${end}`,
        amount,
      };
    });
  };

  const isContractInfoRequest = (text: string): boolean => {
    const value = String(text || '').toLowerCase();
    const contractTopic = /(契約内容|契約情報|契約一覧|契約プラン|現在の契約|契約カード|契約|契約書)/;
    const asking = /(教えて|知りたい|確認したい|確認したいです|見せて|表示して|見たい|確認したいん|確認できますか|教えてください)/;
    const hasQuestionTone = /[?？]$/.test(value.trim());

    // 「料金プラン」「サービス一覧」などのヒアリング回答を契約照会として誤判定しない。
    if (!contractTopic.test(value)) return false;
    return asking.test(value) || hasQuestionTone;
  };

  const resetPlanQuestionButtons = () => {
    setQuickQuestionButtons([
      { key: 'q-contract', label: '契約内容を教えて', prompt: '契約内容を教えて' },
      { key: 'q-price', label: '料金を教えて', prompt: '料金を教えて' },
      { key: 'q-plan', label: 'プラン内容を教えて', prompt: 'プラン内容を教えて' },
    ]);
  };

  const trimSecurityRefusalMessage = (text: string): string => {
    const content = String(text || '');
    if (!content) return content;

    const isSecurityRefusal = /セキュリティの観点|契約に関する具体的なサービス内容|このチャットで直接お伝えすることはできません/.test(content);
    if (!isSecurityRefusal) return content;

    const endToken = 'お願い申し上げます。';
    const endIndex = content.indexOf(endToken);
    if (endIndex < 0) return content;

    return content.slice(0, endIndex + endToken.length).trim();
  };

  const normalizeAssistantOutput = (text: string): string => {
    const content = String(text || '');
    if (!content) return content;
    return content
      .replace(/\b[A-Z][0-9]{4}\s*様/g, `${displayCustomerName}様`)
      .replace(/[（(]\s*(?:2択|二択|単一選択)\s*[）)]/gi, '');
  };

  const getServiceCardStyle = (serviceKey: string): React.CSSProperties => {
    if (serviceKey === 'palette_ai') {
      return {
        backgroundColor: '#FFFFFFCC',
        borderColor: '#E2E8F0',
      };
    }
    if (serviceKey === 'pal_video') {
      return {
        backgroundColor: '#FBE9EC',
        borderColor: '#E95464',
      };
    }
    if (serviceKey === 'pal_studio') {
      return {
        backgroundColor: '#00B7CE22',
        borderColor: '#00B7CE55',
      };
    }
    if (serviceKey === 'pal_trust') {
      return {
        backgroundColor: '#F9C11C22',
        borderColor: '#F9C11C55',
      };
    }
    return {
      backgroundColor: '#FFFFFF99',
      borderColor: '#CBD5E1',
    };
  };

  const startStudioFlow = () => {
    setConversationEnded(false);
    setStudioHtmlGenerationCount(0);
    setConfirmMode(null);
    setStudioRevisionTarget('');
    setStudioRevisionDraft(null);
    setStudioStep('shopName');
    setStudioProfile({
      shopName: '',
      industry: '',
      services: [],
      sections: [],
      appealPoint: '',
      taste: '',
      color: '',
      includeCompanyInfo: null,
      companyFields: [],
      companyDetails: {},
    });
    applyStudioPrompt(['屋号名（会社名）を入力してください。'], [[]], ['single'], ['text']);
    appendAiMessage({
      content: `Pal Studio（${studioPlanTier === 'lite' ? 'ライトプラン' : 'スタンダードプラン'}）のヒアリングを開始します。まず、屋号名（会社名）を教えてください。`,
    });
  };

  const buildStudioSummary = (profile: StudioProfile): HearingSummary => {
    const companyInfo = Object.entries(profile.companyDetails)
      .map(([key, value]) => `${key}: ${value}`)
      .join(' / ');
    return {
      companyName: profile.shopName || null,
      businessService: [profile.industry, ...profile.services].filter(Boolean).join(' / ') || null,
      target: null,
      designPreference: [profile.taste, profile.color].filter(Boolean).join(' / ') || null,
      contents: [profile.sections.join(' / '), profile.appealPoint].filter(Boolean).join(' / ') || null,
      works: null,
      companyProfile: companyInfo || null,
      contactForm: profile.companyDetails['メールアドレス'] || null,
      recruiting: null,
    };
  };

  const buildStudioDraftPrompt = (template: Template, profile: StudioProfile): string => {
    return `
あなたはWebデザイナーです。以下の要件で、ベースHTMLを顧客向けの下書きHTMLに調整してください。

要件:
- 本文は日本語中心
- 指定したセクションのみを中心に構成（フッターは固定で残す）
- 選択テンプレートの構造・レイアウトの雰囲気は維持する
- 配色は白背景 + 黒系テキスト + 薄いグレー枠線のワイヤーフレーム調に統一
- 画像エリアは実画像を使わず、グレーのプレースホルダー領域に「どんな画像を入れるか」をテキストで記載
- リンクやボタンは動作不要のダミー表示でよい
- 屋号名は「${profile.shopName}」
- 業種は「${profile.industry}」
- サービス内容: ${profile.services.join(' / ')}
- 強み・アピールポイント: ${profile.appealPoint || '未設定'}
- テイスト: ${profile.taste}
- 会社情報掲載: ${profile.includeCompanyInfo ? 'あり' : 'なし'}
- 会社情報詳細: ${Object.entries(profile.companyDetails).map(([k, v]) => `${k}:${v}`).join(' / ') || 'なし'}

制約:
- HTML構造は極力維持（セクションの順序や骨組みを壊さない）
- 説明文は自然な日本語
- 最後は \`\`\`html ... \`\`\` のみ返す

ベースHTML:
${template.html}
`;
  };

  const generateStudioDraft = async (profile: StudioProfile): Promise<{ html: string; template: Template }> => {
    const selected = chooseTemplateByTaste(profile.taste);
    const prompt = buildStudioDraftPrompt(selected, profile);
    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ system: prompt, history: [] }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(String(data?.text || `draft generate failed (${response.status})`));
      }
      const extracted = extractHtmlCandidate(String(data?.text || ''));
      return { html: extracted?.html?.trim() || selected.html, template: selected };
    } catch (error) {
      console.error('studio draft generation error:', error);
      return { html: selected.html, template: selected };
    }
  };

  const generateStudioRevision = async (currentHtml: string, instruction: string, profile: StudioProfile): Promise<string> => {
    const prompt = `
以下のHTML下書きを、修正要望に沿って調整してください。

修正要望:
${instruction}

前提:
- 屋号名: ${profile.shopName}
- 業種: ${profile.industry}
- テイスト: ${profile.taste}
- メインカラー: ${profile.color}
- 強み・アピールポイント: ${profile.appealPoint || '未設定'}

制約:
- テンプレート由来の構造・レイアウトの雰囲気は維持する
- 配色は白背景 + 黒系文字 + グレー枠線のワイヤーフレーム調に統一
- 画像エリアはグレーのプレースホルダー + 「どんな画像を入れるか」の説明テキストにする
- 日本語中心
- 最後は \`\`\`html ... \`\`\` のみ返す

現在HTML:
${currentHtml}
`;

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ system: prompt, history: [] }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(String(data?.text || `revision generate failed (${response.status})`));
      }
      const extracted = extractHtmlCandidate(String(data?.text || ''));
      return extracted?.html?.trim() || currentHtml;
    } catch (error) {
      console.error('studio revision generation error:', error);
      return currentHtml;
    }
  };

  const profileCompanyInfoSummary = (profile: StudioProfile): string => {
    if (profile.includeCompanyInfo === false) return '掲載しない';
    if (profile.includeCompanyInfo === null) return '未設定';
    const detail = Object.entries(profile.companyDetails)
      .map(([key, value]) => `${key}:${value}`)
      .join(' / ');
    return detail ? `掲載する (${detail})` : '掲載する';
  };

  const getStudioFieldBeforeValue = (profile: StudioProfile, field: string): string => {
    if (field === '屋号名（会社名）') return profile.shopName || '未設定';
    if (field === '業種') return profile.industry || '未設定';
    if (field === 'サービス内容') return profile.services.join(' / ') || '未設定';
    if (field === 'テイスト') return profile.taste || '未設定';
    if (field === '使いたい色') return profile.color || '未設定';
    if (field === '店舗（会社）情報') return profileCompanyInfoSummary(profile);
    return '未設定';
  };

  const buildRevisionInstruction = (field: string, before: string, after: string): string => {
    return `${field}を「${before}」から「${after}」へ変更してください。`; 
  };

  const startStudioRevisionSelection = () => {
    setShowConfirmSave(false);
    setConfirmMode(null);
    setStudioRevisionTarget('');
    setStudioRevisionDraft(null);
    setStudioStep('revisionSelect');
    applyStudioPrompt(['修正したい項目を1つ選択してください。'], [STUDIO_REVISION_OPTIONS], ['single']);
    appendAiMessage({ content: '修正したい項目を選択してください。' });
  };

  const prepareStudioPreview = async (profile: StudioProfile, conversation: ChatMessage[]) => {
    if (studioHtmlGenerationCount >= 3) {
      setShowConfirmSave(false);
      setConversationEnded(true);
      appendAiMessage({ content: 'HTML生成が3回に達したため、制作担当に共有して、3営業日以内にご連絡させますので少々お待ちください。' });
      return;
    }

    appendAiMessage({ content: 'いまからモデルページを制作します。少々お待ちください！' });
    const draft = await generateStudioDraft(profile);
    setStudioHtmlGenerationCount((count) => count + 1);
    setSelectedTemplateId(draft.template.id);
    setGeneratedCode(draft.html);
    setConfirmMessages(conversation);
    setAiExplanation(`下書き生成: ${draft.template.id}`);
    setShowConfirmSave(true);
    setConfirmMode('preview');
    setStudioStep('completed');
    setPreviewRenderMode('desktop');
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setTimeout(() => setActiveTab('preview'), 250);
    }
    appendAiMessage({ content: `下書きを表示しました。内容を確認して「OK」または「修正」を選んでください。（HTML生成 ${Math.min(studioHtmlGenerationCount + 1, 3)}/3）` });
  };

  const mergeServiceSelections = (baseServices: string[], freeText: string): string[] => {
    const cleanedFree = String(freeText || '').trim();
    const normalized = baseServices.filter((item) => !/その他/.test(String(item || '')));
    if (!cleanedFree) return normalized;
    return Array.from(new Set([...normalized, cleanedFree]));
  };

  const handleStudioFlowInput = async (rawInput: string) => {
    const answers = extractStudioAnswers(rawInput);
    const first = String(answers[0] || '').trim();
    const userMessage: ChatMessage = { role: 'user', content: rawInput };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInputText('');

    if (studioStep === 'shopName') {
      setStudioProfile((prev) => ({ ...prev, shopName: first }));
      setStudioStep('industry');
      applyStudioPrompt(['業種を選択してください（該当がなければ自由入力へ切り替え可）。'], [[
        '飲食', '美容・サロン', '士業', '工務店・建築', '不動産', '医療・クリニック', '教育', 'その他（自由入力）',
      ]], ['single']);
      appendAiMessage({ content: '続いて、業種を教えてください。' });
      return;
    }

    if (studioStep === 'industry') {
      if (first.includes('その他')) {
        setStudioStep('industryOther');
        applyStudioPrompt(['業種を自由入力してください。'], [[]], ['single'], ['text']);
        appendAiMessage({ content: '業種を自由入力で教えてください。' });
        return;
      }
      const industry = first;
      setStudioProfile((prev) => ({ ...prev, industry }));
      setStudioStep('services');
      applyStudioPrompt(['具体的なサービス内容を選択してください（複数選択可）。'], [getServiceCandidatesByIndustry(industry)], ['multi']);
      appendAiMessage({ content: '具体的なサービス内容を教えてください。' });
      return;
    }

    if (studioStep === 'industryOther') {
      const industry = first;
      setStudioProfile((prev) => ({ ...prev, industry }));
      setStudioStep('services');
      applyStudioPrompt(['具体的なサービス内容を選択してください（複数選択可）。'], [getServiceCandidatesByIndustry(industry)], ['multi']);
      appendAiMessage({ content: '具体的なサービス内容を教えてください。' });
      return;
    }

    if (studioStep === 'services') {
      const services = splitChoiceValues(first);
      const hasOther = services.some((item) => /その他/.test(item));
      if (hasOther) {
        setStudioProfile((prev) => ({ ...prev, services: services.filter((item) => !/その他/.test(item)) }));
        setStudioStep('servicesOther');
        applyStudioPrompt(['その他のサービス内容を自由入力してください。'], [[]], ['single'], ['text']);
        appendAiMessage({ content: 'その他のサービス内容を自由入力してください。' });
        return;
      }
      setStudioProfile((prev) => ({ ...prev, services }));
      setStudioStep('sections');
      applyStudioPrompt(
        ['表示したいセクションを選択してください（複数選択可）。'],
        [getStudioSectionOptions(studioPlanTier)],
        ['multi'],
      );
      appendAiMessage({ content: '次に、表示したいセクションを教えてください。' });
      return;
    }

    if (studioStep === 'servicesOther') {
      const merged = mergeServiceSelections(studioProfile.services, first);
      setStudioProfile((prev) => ({ ...prev, services: merged }));
      setStudioStep('sections');
      applyStudioPrompt(
        ['表示したいセクションを選択してください（複数選択可）。'],
        [getStudioSectionOptions(studioPlanTier)],
        ['multi'],
      );
      appendAiMessage({ content: '次に、表示したいセクションを教えてください。' });
      return;
    }

    if (studioStep === 'sections') {
      setStudioProfile((prev) => ({ ...prev, sections: sanitizeSectionSelections(splitChoiceValues(first)) }));
      setStudioStep('taste');
      applyStudioPrompt(['テイストを1つ選択してください。'], [STUDIO_TASTE_OPTIONS], ['single']);
      appendAiMessage({ content: 'テイストを1つ選択してください。' });
      return;
    }

    if (studioStep === 'taste') {
      setStudioProfile((prev) => ({ ...prev, taste: first }));
      setStudioStep('color');
      applyStudioPrompt(['使いたい色を1つ選択してください。'], [STUDIO_COLOR_OPTIONS], ['single']);
      appendAiMessage({ content: '使いたい色を選択してください。' });
      return;
    }

    if (studioStep === 'color') {
      const color = (first.match(/#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{3})/) || [first])[0];
      setStudioProfile((prev) => ({ ...prev, color }));
      setStudioStep('companyInfoToggle');
      applyStudioPrompt(['会社（店舗）情報を掲載しますか？'], [['はい', 'いいえ']], ['single']);
      appendAiMessage({ content: '会社（店舗）情報を掲載するか選択してください。' });
      return;
    }

    if (studioStep === 'companyInfoToggle') {
      const include = /はい|yes|載せる|のせる/i.test(first);
      setStudioProfile((prev) => ({ ...prev, includeCompanyInfo: include }));
      if (!include) {
        const nextProfile = { ...studioProfile, includeCompanyInfo: false, companyFields: [], companyDetails: {} };
        setStudioProfile(nextProfile);
        setStudioStep('appealPoint');
        applyStudioPrompt(['最後に強みやアピールポイントをお聞かせください！'], [[]], ['single'], ['text']);
        appendAiMessage({ content: '最後に強みやアピールポイントをお聞かせください！' });
        return;
      }
      setStudioStep('companyInfoFields');
      applyStudioPrompt(['掲載する会社（店舗）情報を選択してください（複数選択可）。'], [[
        '会社名', '住所', '電話番号', 'メールアドレス', '名前', '事業内容', 'その他（自由入力）',
      ]], ['multi']);
      appendAiMessage({ content: '掲載する情報を選択してください。' });
      return;
    }

    if (studioStep === 'companyInfoFields') {
      const fields = splitChoiceValues(first);
      const detailFields = fields.length ? fields : ['会社名', '住所', '電話番号', 'メールアドレス'];
      setStudioProfile((prev) => ({ ...prev, companyFields: detailFields }));
      setStudioStep('companyInfoDetails');
      applyStudioPrompt(
        detailFields.map((field) => `${field}を入力してください。`),
        detailFields.map(() => []),
        detailFields.map(() => 'single'),
        detailFields.map(() => 'text'),
      );
      appendAiMessage({ content: '選択された情報を入力してください。' });
      return;
    }

    if (studioStep === 'companyInfoDetails') {
      const nextDetails: Record<string, string> = {};
      studioProfile.companyFields.forEach((field, index) => {
        nextDetails[field] = String(answers[index] || '').trim();
      });
      const nextProfile = {
        ...studioProfile,
        companyDetails: nextDetails,
      };
      setStudioProfile(nextProfile);
      setStudioStep('appealPoint');
      applyStudioPrompt(['最後に強みやアピールポイントをお聞かせください！'], [[]], ['single'], ['text']);
      appendAiMessage({ content: '最後に強みやアピールポイントをお聞かせください！' });
      return;
    }

    if (studioStep === 'appealPoint') {
      const nextProfile = { ...studioProfile, appealPoint: first };
      setStudioProfile(nextProfile);
      setStudioStep('completed');
      clearMultiPromptState();
      await prepareStudioPreview(nextProfile, updatedMessages);
      return;
    }

    if (studioStep === 'postOkMessageToggle') {
      const hasMessage = /あり|はい|yes/i.test(first);
      if (!hasMessage) {
        finishStudioFlow(false);
        return;
      }
      setStudioStep('postOkMessageInput');
      applyStudioPrompt(['制作担当へのメッセージをご記入ください。'], [[]], ['single'], ['text']);
      appendAiMessage({ content: 'メッセージをご記入ください！' });
      return;
    }

    if (studioStep === 'postOkMessageInput') {
      const note = String(first || '').trim();
      if (note) {
        const savedMessages = [...updatedMessages, { role: 'ai', content: `制作担当メモ: ${note}` } as ChatMessage];
        void saveDraftToLab(savedMessages, 'reviewing', generatedCode, `${aiExplanation || '下書き確認完了'} / 制作担当メモ: ${note}`);
      }
      finishStudioFlow(true);
      return;
    }

    if (studioStep === 'revisionSelect') {
      if (first.includes('最初からやり直し')) {
        appendAiMessage({ content: '最初の質問からやり直します！' });
        startStudioFlow();
        return;
      }

      setStudioRevisionTarget(first);
      setStudioStep('revisionDetail');

      if (first === 'テイスト') {
        applyStudioPrompt(['新しいテイストを1つ選択してください。'], [STUDIO_TASTE_OPTIONS], ['single']);
      } else if (first === '使いたい色') {
        applyStudioPrompt(['新しい色を1つ選択してください。'], [STUDIO_COLOR_OPTIONS], ['single']);
      } else if (first === '店舗（会社）情報') {
        applyStudioPrompt(['店舗（会社）情報を掲載しますか？'], [['はい', 'いいえ']], ['single']);
      } else if (first === 'サービス内容') {
        applyStudioPrompt(['新しいサービス内容を入力してください（複数ある場合は「、」区切り）。'], [[]], ['single'], ['text']);
      } else if (first === '業種') {
        applyStudioPrompt(['新しい業種を入力してください。'], [[]], ['single'], ['text']);
      } else {
        applyStudioPrompt(['新しい屋号名（会社名）を入力してください。'], [[]], ['single'], ['text']);
      }
      appendAiMessage({ content: `${first}の新しい内容を教えてください。` });
      return;
    }

    if (studioStep === 'revisionDetail') {
      const field = studioRevisionTarget || '屋号名（会社名）';
      const before = getStudioFieldBeforeValue(studioProfile, field);

      let afterValue = first;
      let nextProfile = { ...studioProfile };

      if (field === '屋号名（会社名）') {
        nextProfile = { ...nextProfile, shopName: afterValue };
      } else if (field === '業種') {
        nextProfile = { ...nextProfile, industry: afterValue };
      } else if (field === 'サービス内容') {
        const services = splitChoiceValues(afterValue);
        nextProfile = { ...nextProfile, services };
        afterValue = services.join(' / ') || afterValue;
      } else if (field === 'テイスト') {
        nextProfile = { ...nextProfile, taste: afterValue };
      } else if (field === '使いたい色') {
        const color = (afterValue.match(/#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{3})/) || [afterValue])[0];
        nextProfile = { ...nextProfile, color };
        afterValue = color;
      } else if (field === '店舗（会社）情報') {
        const include = /はい|yes|載せる|のせる/i.test(afterValue);
        nextProfile = {
          ...nextProfile,
          includeCompanyInfo: include,
          companyFields: include ? nextProfile.companyFields : [],
          companyDetails: include ? nextProfile.companyDetails : {},
        };
        afterValue = include ? profileCompanyInfoSummary(nextProfile) : '掲載しない';
      }

      setStudioProfile(nextProfile);
      const instruction = buildRevisionInstruction(field, before, afterValue);
      setStudioRevisionDraft({ field, before, after: afterValue, instruction });
      setShowConfirmSave(false);
      setConfirmMode(null);
      setStudioStep('revisionConfirm');
      clearMultiPromptState();
      applyStudioPrompt(['この内容で制作しますか？'], [['はい', 'いいえ']], ['single']);
      appendAiMessage({
        content: `この内容で制作しますか？\n-修正項目：${field}\n${before}⇒${afterValue}`,
      });
      return;
    }

    if (studioStep === 'revisionConfirm') {
      const accept = /はい|yes/i.test(first);
      if (!accept) {
        startStudioRevisionSelection();
        return;
      }

      if (!studioRevisionDraft) {
        appendAiMessage({ content: '修正内容を確認できなかったため、もう一度「修正」からやり直してください。' });
        startStudioRevisionSelection();
        return;
      }
      if (studioHtmlGenerationCount >= 3) {
        setShowConfirmSave(false);
        setConversationEnded(true);
        appendAiMessage({ content: 'HTML生成が3回に達したため、制作担当に共有して、3営業日以内にご連絡させますので少々お待ちください。' });
        return;
      }

      const isTasteRevision = studioRevisionDraft.field === 'テイスト';
      const revised = isTasteRevision
        ? (await generateStudioDraft(studioProfile)).html
        : await generateStudioRevision(String(generatedCode || ''), studioRevisionDraft.instruction, studioProfile);
      const nextCount = studioHtmlGenerationCount + 1;
      setStudioHtmlGenerationCount(nextCount);
      setGeneratedCode(revised);
      if (isTasteRevision) {
        const selected = chooseTemplateByTaste(studioProfile.taste);
        setSelectedTemplateId(selected.id);
      }
      setConfirmMode('preview');
      setShowConfirmSave(true);
      setStudioStep('completed');
      setStudioRevisionTarget('');
      setStudioRevisionDraft(null);
      clearMultiPromptState();
      appendAiMessage({ content: `修正を反映しました。内容を確認して「OK」または「修正」を選んでください。（HTML生成 ${Math.min(nextCount, 3)}/3）` });
      return;
    }
  };

  const handleServiceCardClick = (card: ServiceCard) => {
    setConversationEnded(false);
    setQuickQuestionButtons([]);
    setNeutralActionButtons([]);
    setActiveServiceCard(card);
    setActiveServiceMode(card.key === 'pal_studio'
      ? 'pal_studio'
      : card.key === 'pal_video'
        ? 'pal_video'
      : card.key === 'palette_ai'
        ? 'palette_ai'
        : card.key === 'pal_trust'
          ? 'pal_trust'
          : 'other');

    if (card.key === 'pal_studio') {
      const tier = resolveStudioPlanTier(card);
      setStudioPlanTier(tier);
      if (tier === 'pro') {
        appendAiMessage({
          content: 'Pal Studio Pro は現在準備中です。いったん Lite / Standard での運用をお願いします。',
        });
        return;
      }
      const phase = String(card.phase || '');
      const status = String(card.status || '');
      const isHearingWaiting = includesAny(phase, ['ヒアリング待ち', 'awaiting', 'hearing'])
        || includesAny(status, ['ヒアリング待ち', 'awaiting']);
      const isDeliveredOrOperating = includesAny(phase, ['納品完了', '運用中', 'active', 'completed'])
        || includesAny(status, ['納品完了', '運用中', 'delivered', 'in progress']);

      if (isHearingWaiting) {
        appendAiMessage({
          content: tier === 'lite'
            ? 'ライトプランとしてヒアリングを開始します。必要項目を絞って進めます。'
            : 'スタンダードプランとしてヒアリングを開始します。',
        });
        startStudioFlow();
        return;
      }

      if (isDeliveredOrOperating) {
        appendAiMessage({
          content: 'Pal Studio で実行したい操作を選んでください。',
          actionButtons: [
            { key: 'news-post', label: 'ニュース投稿（この先実装）' },
            { key: 'blog-post', label: 'ブログ投稿（この先実装）' },
          ],
        });
        return;
      }

      appendAiMessage({
        content: 'Pal Studio の操作準備中です。続ける内容を教えてください。',
      });
      return;
    }

    setStudioPlanTier('standard');

    if (card.key === 'pal_video') {
      const palVideoPlanCode = String(card.planCode || '').toLowerCase();
      const isLite = palVideoPlanCode.includes('pal_video_lite');
      appendAiMessage({
        content: isLite
          ? 'Pal Video ライトのヒアリングを開始します。まず用途を教えてください。(選択肢: Instagramリール, Instagramストーリーズ, Instagramフィード, YouTubeショート, TikTok, X, LINE VOOM, Facebook, プロモーション/広告)'
          : 'Pal Video のヒアリングを開始します。用途・尺・テロップ・色・素材（画像/ロゴ）の希望を教えてください。',
      });
      return;
    }

    if (card.key === 'palette_ai') {
      appendAiMessage({
        content: 'Palette Ai について質問ありますか？下の候補から選べます。',
      });
      resetPlanQuestionButtons();
      return;
    }

    appendAiMessage({
      content: `${card.title} の詳細操作はこれから実装します。`,
    });
  };

  const handleActionButtonClick = (button: ActionButton) => {
    if (button.key === 'upload-media') {
      mediaInputRef.current?.click();
      return;
    }
    if (button.key === 'no-media') {
      void handleSend('なし');
      return;
    }
    if (button.key === 'contract-services') {
      const fallbackCards = messages
        .slice()
        .reverse()
        .find((msg) => msg.role === 'ai' && Array.isArray(msg.serviceCards) && msg.serviceCards.length > 0)
        ?.serviceCards || [];
      const cards = authServiceCards.length ? authServiceCards : fallbackCards;
      appendAiMessage({
        content: cards.length ? 'ご契約中のサービスです。' : '現在表示できる契約サービスがありません。',
        serviceCards: cards,
      });
      return;
    }
    if (button.key === 'news-post') {
      appendAiMessage({ content: 'ニュース投稿機能はこの先実装予定です。' });
      return;
    }
    if (button.key === 'blog-post') {
      appendAiMessage({ content: 'ブログ投稿機能はこの先実装予定です。' });
      return;
    }
  };

  const handleQuickQuestionClick = async (button: QuickQuestionButton) => {
    setQuickQuestionButtons([]);
    await handleSend(button.prompt);
  };

  const handleSend = async (overrideText?: string, e?: React.FormEvent | React.KeyboardEvent) => {
    if (e) e.preventDefault();
    // 新規送信があれば確認UIを閉じる
    setShowConfirmSave(false);
    setQuickQuestionButtons([]);
    const messageToSend = overrideText || inputText;

    // 複数質問UI表示中は、通常の送信ボタンでも「まとめ送信」を実行する。
    if (!overrideText && multiPromptItems.length > 0 && !isSubmittingMultiPrompt && !isLoading && !conversationEnded) {
      await handleSubmitMultiPrompt();
      return;
    }

    if (!messageToSend.trim() || isLoading) return;

    // 送信時は補助UIをいったん閉じ、直後のAI回答で再構築する。
    clearMultiPromptState();

    if (authStep !== 'authenticated') {
      const rawText = String(messageToSend || '').trim();
      const maskedText = authStep === 'askPassword' ? '••••••' : rawText;
      const userMessage: ChatMessage = { role: 'user', content: maskedText };
      const updatedMessages = [...messages, userMessage];

      setMessages(updatedMessages);
      setInputText('');
      setIsLoading(true);

      try {
        if (authStep === 'askId') {
          const paletteId = rawText.toUpperCase();
          if (!/^[A-Z][0-9]{4}$/.test(paletteId)) {
            setMessages([
              ...updatedMessages,
              { role: 'ai', content: '顧客IDは「英字1文字 + 数字4桁」で入力してください。（例: A0001）' },
            ]);
            return;
          }

          const checkRes = await fetch(`/api/chat-auth/check-id?paletteId=${encodeURIComponent(paletteId)}`);
          const checkData = await checkRes.json().catch(() => ({}));
          if (!checkRes.ok || !checkData?.success || !checkData?.exists) {
            setMessages([
              ...updatedMessages,
              { role: 'ai', content: `顧客ID ${paletteId} が見つかりませんでした。もう一度入力してください。` },
            ]);
            return;
          }

          setAuthPaletteId(paletteId);
          setAuthStep('askPassword');
          setMessages([
            ...updatedMessages,
            { role: 'ai', content: `顧客ID ${paletteId} を確認しました。続けてパスワードを入力してください。` },
          ]);
          return;
        }

        const verifyRes = await fetch('/api/chat-auth/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ paletteId: authPaletteId, password: rawText }),
        });
        const verifyData = await verifyRes.json().catch(() => ({}));

        if (!verifyRes.ok || !verifyData?.success) {
          const backendError = String(verifyData?.error || '').trim();
          const message = backendError || 'パスワードが正しくありません。もう一度入力してください。';
          setMessages([
            ...updatedMessages,
            { role: 'ai', content: message },
          ]);
          return;
        }

        setAuthStep('authenticated');
        const verifiedPaletteId = String(verifyData?.paletteId || authPaletteId || '').trim().toUpperCase();
        if (verifiedPaletteId) {
          setAuthPaletteId(verifiedPaletteId);
        }
        setAuthServiceSummary(String(verifyData?.summaryText || ''));
        setAuthServiceCards(Array.isArray(verifyData?.serviceCards) ? verifyData.serviceCards : []);
        setAuthContractCards(buildContractInfoCards(verifyData?.summary || {}));
        const customerName = normalizeCustomerName(String(verifyData?.accountName || verifyData?.customerName || ''));
        setAuthCustomerName(customerName || '');
        setMessages([
          ...updatedMessages,
          {
            role: 'ai',
            content: `ありがとうございます！${customerName || 'お客様'}様ですね！\n認証が完了しました。ヒアリングを始めます。`,
            serviceCards: Array.isArray(verifyData?.serviceCards) ? verifyData.serviceCards : [],
          },
        ]);
        return;
      } catch {
        setMessages([
          ...updatedMessages,
          { role: 'ai', content: '認証処理でエラーが発生しました。時間をおいて再度お試しください。' },
        ]);
        return;
      } finally {
        setIsLoading(false);
      }
    }

    if (conversationEnded) {
      // OK 以外のメッセージは無視
      return;
    }

    if (activeServiceMode === 'pal_studio' && studioStep === 'completed' && showConfirmSave) {
      const normalized = String(messageToSend || '').trim();
      if (/^(ok|OK|了解|承認|これでOK)$/i.test(normalized)) {
        await handleConfirmSave();
        return;
      }
      if (/修正/.test(normalized)) {
        handleRequestRevision();
        return;
      }
      appendAiMessage({ content: '下の「OK」または「修正」ボタンから選択してください。' });
      return;
    }

    if (activeServiceMode === 'pal_studio' && studioStep !== 'idle' && studioStep !== 'completed') {
      setIsLoading(true);
      try {
        await handleStudioFlowInput(messageToSend);
      } finally {
        setIsLoading(false);
      }
      return;
    }

    if (activeServiceMode !== 'pal_studio' && isContractInfoRequest(messageToSend)) {
      const userMessage: ChatMessage = { role: 'user', content: messageToSend };
      const cards = authContractCards;
      setMessages([
        ...messages,
        userMessage,
        {
          role: 'ai',
          content: cards.length > 0
            ? '契約内容です。各カードでご確認ください。'
            : '現在表示できる契約情報がありません。',
          contractCards: cards,
        },
      ]);
      resetPlanQuestionButtons();
      setInputText('');
      return;
    }

    const userMessage: ChatMessage = { role: 'user', content: messageToSend };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setNeutralActionButtons([]);
    await saveDraftToLab(updatedMessages, 'hearing');
    setInputText("");
    setIsLoading(true);

    // 共通ルールは /api/chat/route.ts の systemInstruction に一本化。
    // ここでは顧客名などの動的ヒントだけを追加で渡す。
    const palVideoPlanCode = String(activeServiceCard?.planCode || '').toLowerCase();
    const isPalVideoLite = palVideoPlanCode.includes('pal_video_lite');

    const systemContext = activeServiceMode === 'pal_studio'
      ? `
動的補足:
- 現在は Pal Studio 専用モードです。以降は「1ページHPのHTMLヒアリング」のみを行ってください。
- 契約プランは「${studioPlanTier === 'lite' ? 'lite' : 'standard'}」です。ライトの場合は質問を最小限に絞り、過剰なページ構成を提案しないでください。
- 他サービス（Palette Ai / Pal Trust）の案内・分岐・提案は行わないでください。
- 回答は必ずヒアリング継続（質問）のみを返してください。HTMLコードは出力しないでください。
- チャット文中で「テンプレート」という単語を使わないでください。代わりに「下書き」「プレビュー」と表現してください。
- 次の項目が揃うまで、テンプレート選定に進まないでください: 屋号名 / 表示するセクション / 電話番号と住所 / 強みやコンセプト / 使いたい色 / メールアドレス。
- 質問順序は原則として、屋号名 → 表示セクション → 電話番号・住所 → 強み・コンセプト → 色 → メールアドレス。
- 顧客の呼称は「${displayCustomerName}様」を優先し、顧客ID（例: P1111）で呼ばないでください。
- 会社概要の質問は次の形式を使用してください。
  お店の場所や連絡先など、「会社概要」について、どのような情報をお伝えしますか？ (複数選択) (選択肢: 住所、電話番号、営業時間、定休日、アクセス方法、その他)
`
      : activeServiceMode === 'pal_video'
        ? `
動的補足:
- 現在は Pal Video 専用モードです。動画制作のヒアリングのみを行ってください。
- ${isPalVideoLite ? 'ライトプラン向けの質問を固定順で進めてください。' : '標準の質問項目を揃えてください。'}
- 次の項目が揃うまで、制作完了の宣言はしないでください: ${isPalVideoLite ? '制作目的 / 秒数 / 素材（画像・ロゴ） / 色 / BGM' : '用途 / 尺 / テロップ / 色 / 素材（画像・ロゴ）'}
- ${isPalVideoLite ? '質問順序は 1)制作目的 2)秒数 3)素材 4)色 5)BGM の順にしてください。' : '用途は Instagramリール/ストーリーズ/フィード・YouTube/YouTubeショート・TikTok・X・LINE VOOM・Facebook・プロモーション のいずれかに分類できるように確認してください。'}
- ${isPalVideoLite ? '用途の質問は次の形式で出してください: 用途を教えてください。(選択肢: Instagramリール, Instagramストーリーズ, Instagramフィード, YouTubeショート, TikTok, X, LINE VOOM, Facebook, プロモーション/広告)' : 'テロップはメインとサブがあれば分けて確認してください。1つしかない場合はメイン扱いで構いません。'}
- ${isPalVideoLite ? '秒数の質問は次の形式で出してください: 動画の秒数は何秒程度がいいですか？(選択肢: 15秒, 20秒, 25秒, 30秒)' : '素材の有無を必ず確認し、画像/ロゴURLの提示方法を案内してください。'}
- ${isPalVideoLite ? '素材の質問は次の形式で出してください: 使いたいロゴや画像はありますか？（あればアップロードやURLで教えてください）' : ''}
- ${isPalVideoLite ? '色の質問は次の形式で出してください: 使いたい色はありますか？（例: #E95464 など / pal_studioと同じイメージ）' : ''}
- ${isPalVideoLite ? '色の質問は次の形式で出してください: 使いたい色はありますか？（例: #E95464 など）' : ''}
- ${isPalVideoLite ? 'BGMの質問は次の形式で出してください: BGMのイメージはありますか？(選択肢: ライト/ポップ, クール/ミニマル, ウォーム/ナチュラル)' : ''}
- 顧客の呼称は「${displayCustomerName}様」を優先し、顧客ID（例: P1111）で呼ばないでください。
`
      : `
動的補足:
- 顧客の呼称は「${displayCustomerName}様」を優先し、顧客ID（例: P1111）で呼ばないでください。
- 会社概要の質問は次の形式を使用してください。
  お店の場所や連絡先など、「会社概要」について、どのような情報をお伝えしますか？ (複数選択) (選択肢: 住所、電話番号、営業時間、定休日、アクセス方法、その他)
`;

    const sanitizeHistoryText = (text: string) => {
      return String(text || '')
        .replace(/```html[\s\S]*?```/gi, '[HTML omitted]')
        .replace(/\s{3,}/g, ' ')
        .trim();
    };

    const isPalVideoMode = activeServiceMode === 'pal_video';
    const fieldOrder = isPalVideoMode
      ? (isPalVideoLite
        ? ['制作目的', '秒数', '素材', '色', 'BGM']
        : ['用途', '尺', 'テロップ', '色', '素材'])
      : [
          '屋号名・会社名',
          '業種・サービス',
          'ターゲット',
          'デザインの好み',
          '掲載内容',
          '実績紹介',
          '会社概要',
          'お問い合わせ',
          '採用情報',
        ];

    const fieldPatterns: { label: string; pattern: RegExp }[] = isPalVideoMode
      ? (isPalVideoLite
        ? [
            { label: '制作目的', pattern: /(制作目的|用途|広告動画|sns|プロモーション|説明動画|instagram|インスタ|youtube|tiktok|x|twitter|line|voom|facebook|リール|ストーリー|ショート)/i },
            { label: '秒数', pattern: /(尺|秒|時間|長さ|動画の長さ)/i },
            { label: '素材', pattern: /(素材|画像|写真|ロゴ|動画素材|アップロード)/i },
            { label: '色', pattern: /(色|カラー|配色|トーン|雰囲気)/i },
            { label: 'BGM', pattern: /(bgm|音楽|曲|サウンド|ミニマル|ポップ|ナチュラル)/i },
          ]
        : [
            { label: '用途', pattern: /(用途|媒体|プラットフォーム|instagram|インスタ|youtube|tiktok|x|twitter|line|voom|facebook|リール|ストーリー|ショート|広告|プロモ)/i },
            { label: '尺', pattern: /(尺|秒|時間|長さ|動画の長さ)/i },
            { label: 'テロップ', pattern: /(テロップ|コピー|キャッチ|キャッチコピー)/i },
            { label: '色', pattern: /(色|カラー|配色|トーン|雰囲気)/i },
            { label: '素材', pattern: /(素材|画像|写真|ロゴ|動画素材)/i },
          ])
      : [
          { label: '屋号名・会社名', pattern: /(屋号|会社名|法人名|社名|ブランド名)/i },
          { label: '業種・サービス', pattern: /(業種|サービス|事業内容|取扱|提供)/i },
          { label: 'ターゲット', pattern: /(ターゲット|対象|顧客層|ペルソナ)/i },
          { label: 'デザインの好み', pattern: /(雰囲気|デザイン|テイスト|トーン|色味)/i },
          { label: '掲載内容', pattern: /(掲載|内容|ページ|必要な項目|構成)/i },
          { label: '実績紹介', pattern: /(実績|制作実績|事例|ポートフォリオ|ギャラリー)/i },
          { label: '会社概要', pattern: /(会社概要|アクセス|住所|電話|営業時間|定休日|所在地)/i },
          { label: 'お問い合わせ', pattern: /(問い合わせ|お問合せ|フォーム|連絡先|メール|電話窓口)/i },
          { label: '採用情報', pattern: /(採用|求人|募集|雇用形態|職種|応募方法)/i },
        ];

    const summaryMap = new Map<string, string>();
    const addSummary = (label: string, value: string) => {
      if (!summaryMap.has(label) && value.length >= 2) {
        summaryMap.set(label, value.slice(0, 160));
      }
    };

    updatedMessages.forEach((msg: any, index: number) => {
      if (msg.role !== 'user') return;
      const answer = sanitizeHistoryText(msg.content);
      if (!answer || /^(ok|了解|承認|お願いします|修正お願いします)$/i.test(answer)) return;
      const prevAi = updatedMessages.slice(0, index).reverse().find((m: any) => m.role === 'ai');
      const questionText = sanitizeHistoryText(prevAi?.content || '');
      const matched = fieldPatterns.find(({ pattern }) => pattern.test(questionText));
      if (matched) {
        addSummary(matched.label, answer);
      }
    });

    if (!summaryMap.has('屋号名・会社名')) {
      const fallbackCompany = updatedMessages
        .filter((m: any) => m.role === 'user')
        .map((m: any) => sanitizeHistoryText(m.content))
        .find((text: string) => /株式会社|有限会社|合同会社|Inc\.|LLC|店|サロン|クリニック|工務店|Studio|スタジオ/i.test(text));
      if (fallbackCompany) addSummary('屋号名・会社名', fallbackCompany);
    }

    const summaryLines = fieldOrder
      .filter((label) => summaryMap.has(label))
      .map((label) => `- ${label}: ${summaryMap.get(label)}`);

    const summaryPayload = {
      companyName: summaryMap.get('屋号名・会社名') || null,
      businessService: summaryMap.get('業種・サービス') || null,
      target: summaryMap.get('ターゲット') || null,
      designPreference: summaryMap.get('デザインの好み') || null,
      contents: summaryMap.get('掲載内容') || null,
      works: summaryMap.get('実績紹介') || null,
      companyProfile: summaryMap.get('会社概要') || null,
      contactForm: summaryMap.get('お問い合わせ') || null,
      recruiting: summaryMap.get('採用情報') || null,
    };

    const recentUserFacts = updatedMessages
      .filter((m: any) => m.role === 'user')
      .map((m: any) => sanitizeHistoryText(m.content))
      .filter((text: string) => text.length >= 3)
      .filter((text: string) => !/^(ok|了解|承認|お願いします|修正お願いします)$/i.test(text))
      .slice(-4)
      .map((text: string, index: number) => `${index + 1}. ${text.slice(0, 120)}`);

    const summaryContent = summaryLines.length
      ? `確定事項サマリ(JSON):\n${JSON.stringify(summaryPayload)}\n\n確定事項サマリ（可読）:\n${summaryLines.join('\n')}`
      : recentUserFacts.length
        ? `確定事項サマリ（直近回答）:\n${recentUserFacts.join('\n')}`
        : '';

    const summaryHistory = summaryContent
      ? [{
          role: 'user',
          content: summaryContent,
        }]
      : [];

    const recentHistory = updatedMessages
      .slice(-8)
      .map((m: any) => ({
        role: m.role === 'ai' ? 'ai' : 'user',
        content: sanitizeHistoryText(m.content).slice(0, 500),
      }))
      .filter((m: any) => m.content.length > 0);

    const compactHistory = [...summaryHistory, ...recentHistory];

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: messageToSend,
          system: systemContext,
          history: compactHistory
        }),
      });
      
      const data = await response.json();
      if (response.ok) {
        const aiRawText = trimSecurityRefusalMessage(String(data.text || ''));
        const aiText = normalizeAssistantOutput(aiRawText);
        const isPalVideoLiteMode = activeServiceMode === 'pal_video' && isPalVideoLite;
        const isPalVideoCompletion = isPalVideoLiteMode && /制作に必要な情報|制作を開始します|制作します/.test(aiText);
        const nextMessages: ChatMessage[] = [...updatedMessages];

        if (isPalVideoCompletion) {
          const payload = buildPalVideoPayload(updatedMessages);
          nextMessages.push({ role: 'ai', content: buildPalVideoCompletionMessage(payload) });

          const fallbackCards = messages
            .slice()
            .reverse()
            .find((msg) => msg.role === 'ai' && Array.isArray(msg.serviceCards) && msg.serviceCards.length > 0)
            ?.serviceCards || [];
          const cards = authServiceCards.length ? authServiceCards : fallbackCards;
          nextMessages.push({
            role: 'ai',
            content: 'なにかお手伝いできることはありますか？',
            serviceCards: cards,
          });
          setActiveServiceMode('none');
          setConversationEnded(false);
        } else {
          const aiMessage: ChatMessage = { role: 'ai', content: aiText };
          if (isPalVideoLiteMode && /(ロゴ|画像).*ありますか/.test(aiText)) {
            aiMessage.actionButtons = [
              { key: 'upload-media', label: 'アップロード' },
              { key: 'no-media', label: 'なし' },
            ];
          }
          nextMessages.push(aiMessage);
        }

        setMessages(nextMessages);

        if (isPalVideoLiteMode && !isPalVideoCompletion) {
          applyPalVideoLitePrompt(aiText);
        }

        if (activeServiceMode === 'pal_studio') {
          const prepared = await maybePrepareTemplatePreview(nextMessages, summaryPayload, `${messageToSend}\n${aiText}`);
          if (prepared) {
            const selectedTemplate = templates.find((template) => template.id === selectedTemplateId) || autoSelectTemplate(buildUserAnswers(nextMessages));
            await saveDraftToLab(
              nextMessages,
              'reviewing',
              selectedTemplate.html,
              `テンプレート選定: ${selectedTemplate.name} (${selectedTemplate.id})`,
              selectedTemplate.id,
            );
            return;
          }

          await saveDraftToLab(nextMessages, 'hearing');
          return;
        }

        await saveDraftToLab(nextMessages, 'hearing');

      } else {
        setMessages(prev => [...prev, { role: 'ai', content: "すみません、エラーが起きてしまいました。" } as ChatMessage]);
      }
    } catch (error) {
      setMessages(prev => [...prev, { role: 'ai', content: "接続エラーです。" } as ChatMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // 確認ボタンが押されたとき
  const handleConfirmSave = async () => {
    if (confirmMode === 'revision') {
      if (!studioRevisionDraft) {
        setShowConfirmSave(false);
        appendAiMessage({ content: '修正内容を確認できなかったため、もう一度「修正」からやり直してください。' });
        return;
      }
      if (studioHtmlGenerationCount >= 3) {
        setShowConfirmSave(false);
        setConversationEnded(true);
        appendAiMessage({ content: 'HTML生成が3回に達したため、制作担当に共有して、3営業日以内にご連絡させますので少々お待ちください。' });
        return;
      }

      setShowConfirmSave(false);
      const revised = await generateStudioRevision(String(generatedCode || ''), studioRevisionDraft.instruction, studioProfile);
      const nextCount = studioHtmlGenerationCount + 1;
      setStudioHtmlGenerationCount(nextCount);
      setGeneratedCode(revised);
      setConfirmMode('preview');
      setShowConfirmSave(true);
      setStudioStep('completed');
      setStudioRevisionTarget('');
      setStudioRevisionDraft(null);
      appendAiMessage({ content: `修正を反映しました。内容を確認して「OK」または「修正」を選んでください。（HTML生成 ${Math.min(nextCount, 3)}/3）` });
      return;
    }

    const html = String(generatedCode || '').trim();
    if (!html) {
      setShowConfirmSave(false);
      setMessages(prev => [
        ...prev,
        {
          role: 'ai',
          content: 'まだ保存できるHTMLが生成されていません。先にデザインコードを生成してからOKを押してください。',
        }
      ]);
      return;
    }

    setShowConfirmSave(false);
    void saveToLab(confirmMessages.length ? confirmMessages : messages, html, aiExplanation || '下書き確認完了');
    setConfirmMode(null);
    setStudioStep('postOkMessageToggle');
    applyStudioPrompt(['制作担当にメッセージはありますか？'], [['あり', 'なし']], ['single']);
    appendAiMessage({ content: '制作担当にメッセージはありますか？' });
  };

  const handleRequestRevision = () => {
    if (activeServiceMode === 'pal_studio') {
      if (confirmMode === 'revision') {
        startStudioRevisionSelection();
        return;
      }
      if (studioHtmlGenerationCount >= 3) {
        setShowConfirmSave(false);
        setConversationEnded(true);
        appendAiMessage({ content: 'HTML生成が3回に達したため、制作担当に共有して、3営業日以内にご連絡させますので少々お待ちください。' });
        return;
      }
      startStudioRevisionSelection();
      return;
    }

    setShowConfirmSave(false);
    handleSend("修正お願いします");
  };

  const finishStudioFlow = (withAcknowledgement: boolean) => {
    const nextMessages: ChatMessage[] = [];
    if (withAcknowledgement) {
      nextMessages.push({ role: 'ai', content: '承りました！' });
    }
    nextMessages.push({ role: 'ai', content: '制作担当に送ります！5営業日以内にご連絡しますので、少々お待ちください！' });
    nextMessages.push({
      role: 'ai',
      content: 'なにかお手伝いできることはありますか？',
    });

    setShowConfirmSave(false);
    setConfirmMode(null);
    setActiveServiceMode('none');
    setStudioPlanTier('standard');
    setStudioStep('idle');
    setNeutralActionButtons([{ key: 'contract-services', label: '契約サービス' }]);
    clearMultiPromptState();
    setConversationEnded(false);
    setMessages((prev) => [...prev, ...nextMessages]);
  };

  const buildPreviewSrcDoc = (html: string): string => {
    return `<html><head><script src="https://cdn.tailwindcss.com"></script><style>
      body { margin: 0; font-family: sans-serif; background: #ffffff !important; color: #111827 !important; }
      /* テンプレート構造は維持しつつ、プレビューだけモノクロ化する */
      [class*="bg-"], [style*="background"], [style*="--bg-color"], [style*="--main-color"], [style*="--accent-color"] {
        background-color: #ffffff !important;
        background-image: none !important;
      }
      .template-root, main, section, header, footer, nav, article, aside, div {
        border-color: #d1d5db !important;
      }
      h1, h2, h3, h4, h5, h6, p, span, li, dt, dd, a, button, strong, em, small, label {
        color: #111827 !important;
      }
      img, picture, video, canvas, svg {
        filter: grayscale(1) saturate(0) contrast(1.02) !important;
      }
      img, picture, video {
        background: #d1d5db !important;
      }
      a, button, [role="button"], input, select, textarea, form {
        pointer-events: none !important;
        cursor: default !important;
      }
    </style></head><body>${html}<script>document.addEventListener('click', function(e){ var target = e.target; if (target && target.closest) { var interactive = target.closest('a, button, [role="button"], input, select, textarea, form'); if (interactive) { e.preventDefault(); e.stopPropagation(); } } }, true);</script></body></html>`;
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.nativeEvent.isComposing) return;
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSubmitMultiPrompt = async () => {
    if (!multiPromptItems.length || isSubmittingMultiPrompt) return;

    const filled = multiPromptItems
      .map((item, index) => {
        const mode = multiPromptModes[index] || 'text';
        const selectionKind = multiPromptSelectionKinds[index] || 'single';
        const answer = mode === 'select'
          ? (selectionKind === 'multi'
            ? (multiPromptSelectedMulti[index] || []).join('、').trim()
            : String(multiPromptSelected[index] || '').trim())
          : String(multiPromptAnswers[index] || '').trim();
        if (!answer) return '';
        return `${index + 1}. ${item}\n→ ${answer}`;
      })
      .filter(Boolean);

    if (!filled.length) {
      return;
    }

    const merged = filled.join('\n\n');
    const isStudioFlow = activeServiceMode === 'pal_studio' && studioStep !== 'idle' && studioStep !== 'completed';
    setIsSubmittingMultiPrompt(true);
    try {
      await handleSend(merged);
      setQuickQuestionButtons([]);
      if (!isStudioFlow) {
        clearMultiPromptState();
      }
    } finally {
      setIsSubmittingMultiPrompt(false);
    }
  };

  const handleSingleSelectImmediateSend = async (index: number, option: string) => {
    if (multiPromptItems.length !== 1 || isSubmittingMultiPrompt) return;
    const answer = String(option || '').trim();
    if (!answer) return;
    const isStudioFlow = activeServiceMode === 'pal_studio' && studioStep !== 'idle' && studioStep !== 'completed';
    setIsSubmittingMultiPrompt(true);
    try {
      await handleSend(answer);
      setQuickQuestionButtons([]);
      if (!isStudioFlow) {
        clearMultiPromptState();
      }
    } finally {
      setIsSubmittingMultiPrompt(false);
    }
  };

  const handleMultiPromptKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.nativeEvent.isComposing) return;
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmitMultiPrompt();
    }
  };

  const isSelectionOnlyStage = activeServiceMode === 'pal_studio' && (studioStep === 'revisionSelect' || studioStep === 'revisionConfirm' || studioStep === 'postOkMessageToggle');
  const isMainInputDisabled = conversationEnded || isSelectionOnlyStage;
  return (
    <div className="fixed inset-0 w-full h-[100dvh] flex items-start md:items-center justify-start md:justify-center p-0 md:p-8 overflow-hidden bg-slate-50 touch-auto md:touch-none">
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none -z-10 overflow-hidden">
        <div className="absolute w-[500px] h-[500px] bg-pink-400/10 blur-[120px] rounded-full -top-20 -left-20 animate-pulse" />
        <div className="absolute w-[600px] h-[600px] bg-cyan-400/10 blur-[150px] rounded-full -bottom-20 -right-20 animate-pulse" style={{ animationDelay: '-5s' }} />
      </div>

      <div className="w-full max-w-[1300px] h-full md:h-[90vh] bg-white/40 md:backdrop-blur-[30px] md:rounded-[60px] shadow-neu-flat flex flex-col md:flex-row border-none md:border md:border-white/60 overflow-hidden relative">
        <div className="absolute top-2 left-2 right-2 md:hidden flex items-center justify-between bg-white/45 backdrop-blur-sm px-2 py-1 rounded-full border border-white/60 z-50">
          <span className="text-[11px] font-black text-slate-500 px-2">P</span>
          <div className="flex items-center gap-1">
            <button onClick={() => setActiveTab('chat')} className={`px-4 py-1 rounded-full text-[10px] font-black transition-all ${activeTab === 'chat' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-500'}`}>CHAT</button>
            <button onClick={() => setActiveTab('preview')} className={`px-4 py-1 rounded-full text-[10px] font-black transition-all ${activeTab === 'preview' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-500'}`}>VIEW</button>
          </div>
        </div>

        <div className={`flex flex-col p-5 md:p-10 h-full border-r border-white/20 w-full md:w-[400px] lg:w-[460px] shrink-0 ${activeTab === 'chat' ? 'flex' : 'hidden md:flex'}`}>
          <header className="hidden md:flex justify-between items-center mb-6 shrink-0">
            <div className="flex flex-col text-slate-800">
              <h1 className="text-2xl font-black tracking-tighter italic">Palette AI</h1>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">prototype</span>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto pr-1 space-y-6 custom-scrollbar flex flex-col pb-32 md:pb-4 pt-9 md:pt-0 touch-auto" style={{ paddingBottom: isMobileViewport ? 'calc(8rem + env(safe-area-inset-bottom, 0px))' : undefined }}>
            {messages.map((msg, index) => (
              (() => {
                const isCompletionMessage =
                  msg.role === 'ai' &&
                  typeof msg.content === 'string' &&
                  msg.content.startsWith('ありがとうございました！');
                const isDeliveryNoticeMessage =
                  msg.role === 'ai' &&
                  typeof msg.content === 'string' &&
                  msg.content.includes('制作担当に送ります！5営業日以内にご連絡しますので、少々お待ちください！');
                const isHighlightedAiMessage = isCompletionMessage || isDeliveryNoticeMessage;

                return (
                  <div key={index} className={`flex gap-3 items-start ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    <div className={`w-8 h-8 rounded-xl shadow-neu-flat flex items-center justify-center shrink-0 border ${isHighlightedAiMessage ? 'bg-violet-50 border-violet-200' : 'bg-white/80 border-white'}`}>
                      {msg.role === 'ai' ? (
                        isHighlightedAiMessage ? <BellRing className="w-4 h-4 text-violet-500" /> : <Sparkles className="w-4 h-4 text-indigo-500" />
                      ) : (
                        <User className="w-4 h-4 text-slate-400" />
                      )}
                    </div>
                    <div className={`p-4 rounded-[22px] max-w-[85%] text-sm font-medium whitespace-pre-wrap leading-relaxed ${
                      msg.role === 'ai'
                        ? isHighlightedAiMessage
                          ? 'rounded-tl-none bg-gradient-to-r from-violet-50 to-fuchsia-50 border border-violet-200 text-violet-800 shadow-[0_8px_24px_rgba(139,92,246,0.12)]'
                          : 'rounded-tl-none shadow-neu-inset bg-white/20 text-slate-600'
                        : 'rounded-tr-none shadow-neu-flat bg-white/80 text-slate-600'
                    }`}>
                      {msg.role === 'ai'
                        ? msg.content
                            .replace(/```html[\s\S]*?```/g, '')
                            .replace(/\b[A-Z][0-9]{4}\s*様/g, `${displayCustomerName}様`)
                            .replace(/[（(]\s*(?:2択|二択|単一選択)\s*[）)]/gi, '')
                            .trim() || "プレビューを生成しました！"
                        : msg.content}
                      {msg.role === 'ai' && Array.isArray(msg.serviceCards) && msg.serviceCards.length > 0 && (
                        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {msg.serviceCards.map((card) => (
                            <button
                              key={`${card.key}-${card.planName}`}
                              type="button"
                              onClick={() => handleServiceCardClick(card)}
                              className="group relative h-[120px] text-left p-4 rounded-[24px] border border-white bg-white/40 backdrop-blur-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgba(79,70,229,0.1)] hover:bg-white/80 hover:-translate-y-1 transition-all duration-300 overflow-hidden"
                              style={getServiceCardStyle(card.key)}
                            >
                              <div className="absolute -right-2 -top-2 w-12 h-12 bg-gradient-to-br from-indigo-500/10 to-fuchsia-500/10 rounded-full blur-xl group-hover:scale-150 transition-transform duration-500" />
                              <div className="relative z-10 flex flex-col h-full justify-between">
                                <div>
                                  <div className="text-[13px] font-bold text-slate-900 tracking-tight group-hover:text-indigo-600 transition-colors">{card.title}</div>
                                  <div className="text-[11px] font-medium text-slate-500 mt-1.5 leading-relaxed line-clamp-2">{card.description}</div>
                                </div>
                                <div className="flex items-center justify-between mt-auto pt-2">
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-slate-100 text-slate-500 uppercase tracking-wider group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">{card.planName}</span>
                                  <div className="w-5 h-5 rounded-full bg-slate-50 flex items-center justify-center opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all duration-300">
                                    <svg className="w-3 h-3 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                                    </svg>
                                  </div>
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                      {msg.role === 'ai' && Array.isArray(msg.contractCards) && msg.contractCards.length > 0 && (
                        <div className="mt-3 grid grid-cols-1 gap-3">
                          {msg.contractCards.map((card) => (
                            <div
                              key={card.id}
                              className="group relative text-left p-4 rounded-[24px] border border-white bg-white/40 backdrop-blur-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgba(79,70,229,0.1)] hover:bg-white/80 hover:-translate-y-1 transition-all duration-300 overflow-hidden"
                            >
                              <div className="absolute -right-2 -top-2 w-12 h-12 bg-gradient-to-br from-indigo-500/10 to-fuchsia-500/10 rounded-full blur-xl group-hover:scale-150 transition-transform duration-500" />
                              <div className="relative z-10">
                                <div className="text-[13px] font-bold text-slate-900 tracking-tight group-hover:text-indigo-600 transition-colors">{card.planName}</div>
                                <div className="mt-2.5 space-y-1.5">
                                  <div className="text-[11px] font-medium text-slate-600">フェーズ: {card.phaseName}</div>
                                  <div className="text-[11px] font-medium text-slate-600">期間: {card.period}</div>
                                </div>
                                <div className="mt-3 pt-2 border-t border-white/70 flex items-center justify-between">
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-slate-100 text-slate-500 uppercase tracking-wider group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">金額</span>
                                  <span className="text-[12px] font-bold text-slate-800">{card.amount}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      {msg.role === 'ai' && Array.isArray(msg.actionButtons) && msg.actionButtons.length > 0 && (
                        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {msg.actionButtons.map((btn) => (
                            <button
                              key={btn.key}
                              type="button"
                              onClick={() => handleActionButtonClick(btn)}
                              className="group relative h-[58px] text-left p-3 rounded-2xl border border-white bg-white/40 backdrop-blur-xl shadow-[0_8px_20px_rgb(0,0,0,0.04)] hover:shadow-[0_16px_32px_rgba(79,70,229,0.1)] hover:bg-white/80 hover:-translate-y-0.5 transition-all duration-300 text-xs font-bold text-slate-700 overflow-hidden"
                            >
                              <div className="absolute -right-2 -top-2 w-10 h-10 bg-gradient-to-br from-indigo-500/10 to-fuchsia-500/10 rounded-full blur-xl" />
                              <span className="relative z-10">{btn.label}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()
            ))}
            {isLoading && (
              <div className="flex gap-2 items-center px-10">
                <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" />
                <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.4s]" />
              </div>
            )}
            <div ref={scrollEndRef} />
          </main>

          <div className="mt-auto pt-3 pb-2 md:pb-0 shrink-0 sticky bottom-0 z-20 bg-white/35 backdrop-blur-md rounded-t-2xl md:bg-transparent md:backdrop-blur-0 md:rounded-none" style={{ paddingBottom: isMobileViewport ? 'calc(0.5rem + env(safe-area-inset-bottom, 0px))' : undefined }}>
            {quickQuestionButtons.length > 0 && authStep === 'authenticated' && !isLoading && !conversationEnded && multiPromptItems.length === 0 && !showConfirmSave && messages[messages.length - 1]?.role === 'ai' && /質問ありますか/.test(String(messages[messages.length - 1]?.content || '')) && (
              <div className="mb-3 rounded-[24px] border border-white bg-white/45 backdrop-blur-xl p-3 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                <p className="text-[11px] font-black text-slate-500 mb-2 tracking-wide">質問ありますか？</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {quickQuestionButtons.map((button) => (
                    <button
                      key={button.key}
                      type="button"
                      onClick={() => handleQuickQuestionClick(button)}
                      className="group relative px-3.5 py-1.5 rounded-full border border-white bg-white/70 text-[11px] font-bold text-slate-700 hover:bg-white hover:-translate-y-0.5 shadow-[0_6px_16px_rgba(0,0,0,0.04)] transition-all duration-300"
                    >
                      {button.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {showConfirmSave && !conversationEnded && (
              <div className="mb-3 rounded-[24px] border border-white bg-white/55 backdrop-blur-xl p-2.5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex items-center justify-center gap-2">
                <button onClick={handleRequestRevision} className="px-4 py-2.5 bg-white/90 text-slate-700 rounded-xl text-xs font-black tracking-wide border border-white shadow-[0_6px_16px_rgba(0,0,0,0.04)] hover:bg-white hover:-translate-y-0.5 transition-all duration-300 active:scale-95">
                  修正
                </button>
                <button onClick={handleConfirmSave} className="px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-fuchsia-500 text-white rounded-xl text-xs font-black tracking-wide shadow-[0_10px_24px_rgba(79,70,229,0.28)] hover:from-indigo-400 hover:to-fuchsia-400 hover:-translate-y-0.5 transition-all duration-300 active:scale-95">
                  OK
                </button>
              </div>
            )}

            {multiPromptItems.length > 0 && authStep === 'authenticated' && !isLoading && !conversationEnded && (
              <div className={`mb-3 rounded-[24px] border border-white bg-white/45 backdrop-blur-xl p-3 shadow-[0_8px_30px_rgb(0,0,0,0.04)] ${isSubmittingMultiPrompt ? 'opacity-80 pointer-events-none' : ''}`}>
                <p className="text-[11px] font-black text-slate-500 mb-2">項目ごとに入力してまとめて送信できます</p>
                <div className="space-y-2">
                  {multiPromptItems.map((item, index) => (
                    <div key={`${index}-${item}`}>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">{index + 1}. {item}</label>
                      {(() => {
                        const selectionKind = multiPromptSelectionKinds[index] || 'single';
                        const options = multiPromptSelectOptions[index] || [];
                        return (
                          <>
                      <div className="flex items-center gap-2 mb-2">
                        <button
                          type="button"
                          onClick={() => {
                            const next = [...multiPromptModes];
                            next[index] = 'select';
                            setMultiPromptModes(next);
                          }}
                          disabled={options.length === 0}
                          className={`px-3 py-1.5 rounded-full text-[11px] font-bold border transition-all duration-300 ${(multiPromptModes[index] || 'text') === 'select' ? 'bg-indigo-50/90 border-indigo-200 text-indigo-700 shadow-[0_6px_16px_rgba(79,70,229,0.12)]' : 'bg-white/80 border-white text-slate-500 hover:bg-white'}`}
                        >
                          選択式
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const next = [...multiPromptModes];
                            next[index] = 'text';
                            setMultiPromptModes(next);
                          }}
                          disabled={isSelectionOnlyStage}
                          className={`px-3 py-1.5 rounded-full text-[11px] font-bold border transition-all duration-300 ${(multiPromptModes[index] || 'text') === 'text' ? 'bg-indigo-50/90 border-indigo-200 text-indigo-700 shadow-[0_6px_16px_rgba(79,70,229,0.12)]' : 'bg-white/80 border-white text-slate-500 hover:bg-white'}`}
                        >
                          自由入力
                        </button>
                      </div>

                      {(multiPromptModes[index] || 'text') === 'select' && options.length > 0 ? (
                        selectionKind === 'multi' ? (
                          <div className={`${options.length >= 8 ? 'flex flex-wrap gap-2' : 'grid grid-cols-1 sm:grid-cols-2 gap-2'}`}>
                            {options.map((option) => {
                              const selected = multiPromptSelectedMulti[index] || [];
                              const isSelected = selected.includes(option);
                              const colorMatch = option.match(/#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{3})/);
                              return (
                                <button
                                  key={`${index}-${option}`}
                                  type="button"
                                  onClick={() => {
                                    const next = [...multiPromptSelectedMulti];
                                    const current = new Set(next[index] || []);
                                    if (current.has(option)) {
                                      current.delete(option);
                                    } else {
                                      current.add(option);
                                    }
                                    next[index] = Array.from(current);
                                    setMultiPromptSelectedMulti(next);
                                  }}
                                  className={`group relative text-left px-3 py-2.5 rounded-2xl border backdrop-blur-xl transition-all duration-300 overflow-hidden ${options.length >= 8 ? 'text-[11px]' : ''} ${isSelected
                                    ? 'border-indigo-200 bg-indigo-50/80 text-indigo-700 shadow-[0_8px_20px_rgba(79,70,229,0.16)]'
                                    : 'border-white bg-white/80 text-slate-700 shadow-[0_6px_18px_rgba(0,0,0,0.04)] hover:bg-white hover:-translate-y-0.5 hover:shadow-[0_12px_24px_rgba(79,70,229,0.1)]'
                                  }`}
                                >
                                  <div className="absolute -right-2 -top-2 w-10 h-10 bg-gradient-to-br from-indigo-500/10 to-fuchsia-500/10 rounded-full blur-xl" />
                                  <span className="relative z-10 text-[12px] font-bold flex items-center gap-2">
                                    <span className={`inline-flex w-4 h-4 rounded border items-center justify-center text-[10px] ${isSelected ? 'bg-indigo-500 border-indigo-500 text-white' : 'bg-white border-slate-300 text-transparent'}`}>✓</span>
                                    {colorMatch && (
                                      <span className="inline-flex w-3 h-3 rounded-full border border-slate-300" style={{ backgroundColor: colorMatch[0] }} />
                                    )}
                                    {option}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        ) : (
                          <div className={`${options.length >= 10 ? 'flex flex-wrap gap-2' : 'grid grid-cols-1 sm:grid-cols-2 gap-2'}`}>
                            {options.map((option) => {
                              const isSelected = (multiPromptSelected[index] || '') === option;
                              const colorMatch = option.match(/#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{3})/);
                              return (
                                <button
                                  key={`${index}-${option}`}
                                  type="button"
                                  onClick={async () => {
                                    if (isSubmittingMultiPrompt) return;
                                    const next = [...multiPromptSelected];
                                    next[index] = option;
                                    setMultiPromptSelected(next);

                                    if ((multiPromptSelectionKinds[index] || 'single') === 'single') {
                                      await handleSingleSelectImmediateSend(index, option);
                                    }
                                  }}
                                  className={`group relative text-left px-3 py-2.5 rounded-2xl border backdrop-blur-xl transition-all duration-300 overflow-hidden ${options.length >= 10 ? 'text-[11px] px-2.5 py-2 rounded-xl' : ''} ${isSelected
                                    ? 'border-indigo-200 bg-indigo-50/80 text-indigo-700 shadow-[0_8px_20px_rgba(79,70,229,0.16)]'
                                    : 'border-white bg-white/80 text-slate-700 shadow-[0_6px_18px_rgba(0,0,0,0.04)] hover:bg-white hover:-translate-y-0.5 hover:shadow-[0_12px_24px_rgba(79,70,229,0.1)]'
                                  }`}
                                >
                                  <div className="absolute -right-2 -top-2 w-10 h-10 bg-gradient-to-br from-indigo-500/10 to-fuchsia-500/10 rounded-full blur-xl" />
                                  <span className="relative z-10 text-[12px] font-bold flex items-center gap-2">
                                    {colorMatch && (
                                      <span className="inline-flex w-3 h-3 rounded-full border border-slate-300" style={{ backgroundColor: colorMatch[0] }} />
                                    )}
                                    {option}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        )
                      ) : (
                        <textarea
                          value={multiPromptAnswers[index] || ''}
                          onChange={(e) => {
                            const next = [...multiPromptAnswers];
                            next[index] = e.target.value;
                            setMultiPromptAnswers(next);
                          }}
                          onKeyDown={handleMultiPromptKeyDown}
                          placeholder="ここに回答を入力"
                          rows={1}
                          className="w-full px-3 py-2.5 rounded-2xl border border-white bg-white/85 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-indigo-200/60 shadow-[0_6px_18px_rgba(0,0,0,0.04)] resize-y min-h-[44px]"
                        />
                      )}
                          </>
                        );
                      })()}
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex justify-center">
                  {(multiPromptItems.length > 1 || multiPromptModes.some((mode, idx) => mode === 'text' || (mode === 'select' && (multiPromptSelectionKinds[idx] || 'single') === 'multi'))) && (
                    <button
                      type="button"
                      onClick={handleSubmitMultiPrompt}
                      disabled={isSubmittingMultiPrompt}
                      className="px-4 py-2.5 rounded-xl border border-white bg-white/90 text-xs font-black text-slate-700 shadow-[0_6px_16px_rgba(0,0,0,0.04)] hover:bg-white hover:-translate-y-0.5 transition-all duration-300"
                    >
                      {isSubmittingMultiPrompt ? '送信中...' : '送信'}
                    </button>
                  )}
                </div>
              </div>
            )}

            {neutralActionButtons.length > 0 && authStep === 'authenticated' && !isLoading && activeServiceMode === 'none' && (
              <div className="mb-2 flex items-center justify-end gap-2 px-1">
                {neutralActionButtons.map((button) => (
                  <button
                    key={button.key}
                    type="button"
                    onClick={() => handleActionButtonClick(button)}
                    className="px-2.5 py-1 rounded-full text-[10px] font-black tracking-wide text-white bg-gradient-to-r from-indigo-500 to-cyan-500 shadow-[0_8px_18px_rgba(59,130,246,0.28)] hover:from-indigo-400 hover:to-cyan-400 hover:-translate-y-0.5 transition-all duration-300"
                  >
                    {button.label}
                  </button>
                ))}
              </div>
            )}
            <div className="p-2 rounded-[30px] shadow-neu-flat bg-white/30 border border-white/50">
              <div className="flex items-end shadow-neu-inset rounded-[24px] bg-[#F0F2F5]/50 px-3 py-1">
                <textarea 
                  ref={textareaRef} 
                  value={inputText} 
                  onChange={(e) => setInputText(e.target.value)} 
                  onFocus={() => {
                    isComposerFocusedRef.current = true;
                  }}
                  onBlur={() => {
                    isComposerFocusedRef.current = false;
                  }}
                  onKeyDown={handleKeyDown} 
                  placeholder={isSelectionOnlyStage ? '上の選択ボタンから回答してください。' : authStep === 'askId' ? '顧客ID（例: A0001）を入力...' : authStep === 'askPassword' ? 'パスワードを入力...' : '回答を入力...'} 
                  rows={1} 
                  disabled={isMainInputDisabled}
                  className="flex-1 bg-transparent border-none py-3 text-base focus:outline-none text-slate-700 font-medium resize-none min-h-[40px] max-h-[120px] touch-auto" 
                />
                <button 
                  type="button" 
                  onClick={() => handleSend()} 
                  disabled={isLoading || isMainInputDisabled} 
                  className="bg-gradient-to-r from-indigo-500 to-fuchsia-500 w-10 h-10 rounded-full flex items-center justify-center text-white shadow-[0_10px_24px_rgba(79,70,229,0.28)] hover:from-indigo-400 hover:to-fuchsia-400 hover:-translate-y-0.5 active:scale-90 shrink-0 mb-1 ml-2 transition-all duration-300"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className={`${activeTab === 'preview' ? 'flex' : 'hidden'} md:flex flex-1 p-5 md:p-10 flex-col bg-slate-50/50 md:bg-white/10 overflow-hidden touch-auto`}>
          <div className="flex justify-between items-center mb-6 shrink-0 pt-12 md:pt-0">
             <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
               <Layout className="w-4 h-4" /> Live Preview
             </h2>
             <div className="flex items-center gap-2">
               {!isMobileViewport && (
                 <>
                   <button
                     type="button"
                     onClick={() => setPreviewRenderMode('desktop')}
                     className={`px-3 py-1.5 rounded-full text-[10px] font-black border transition-all ${previewRenderMode === 'desktop' ? 'bg-slate-800 text-white border-slate-700' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}
                   >
                     PC
                   </button>
                   <button
                     type="button"
                     onClick={() => setPreviewRenderMode('mobile')}
                     className={`px-3 py-1.5 rounded-full text-[10px] font-black border transition-all ${previewRenderMode === 'mobile' ? 'bg-slate-800 text-white border-slate-700' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}
                   >
                     スマホ
                   </button>
                 </>
               )}
             </div>
          </div>
          <div className="flex-1 flex flex-col gap-4 overflow-hidden">
            <div className="flex-1 rounded-[30px] shadow-neu-inset bg-white md:bg-[#F8FAFC]/50 overflow-hidden border border-white/40">
              {generatedCode ? (
                previewRenderMode === 'mobile' ? (
                  <div className="h-full w-full flex items-center justify-center p-4 md:p-6 bg-slate-100/60">
                    <div className="w-[360px] max-w-full h-full max-h-[760px] rounded-[32px] border-[8px] border-slate-900 bg-white shadow-2xl overflow-hidden">
                      <iframe
                        srcDoc={buildPreviewSrcDoc(generatedCode)}
                        className="w-full h-full border-none"
                      />
                    </div>
                  </div>
                ) : (
                  <iframe
                    srcDoc={buildPreviewSrcDoc(generatedCode)}
                    className="w-full h-full border-none"
                  />
                )
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-300 space-y-4">
                  <Box className="w-16 h-16 opacity-10" />
                  <p className="text-[10px] font-bold tracking-[0.3em] opacity-30 uppercase text-center">Hearing in progress...</p>
                </div>
              )}
            </div>

            <section className="rounded-[24px] border border-white/60 bg-white/70 backdrop-blur-xl shadow-[0_10px_24px_rgba(15,23,42,0.08)] p-4 flex flex-col h-[220px] md:h-[240px]">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-white shadow-neu-flat flex items-center justify-center">
                    <MessageSquare className="w-4 h-4 text-indigo-500" />
                  </div>
                  <div>
                    <p className="text-[11px] font-black tracking-[0.2em] uppercase text-slate-500">Media Library</p>
                    <p className="text-[11px] text-slate-400">クリックでURLを入力欄へ追加</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => loadMediaAssets()}
                    disabled={!canUseMedia || mediaLoading}
                    className="px-3 py-1.5 rounded-full text-[10px] font-black border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-50"
                  >
                    <RefreshCw className="w-3 h-3 inline-block mr-1" />
                    更新
                  </button>
                  <button
                    type="button"
                    onClick={() => mediaInputRef.current?.click()}
                    disabled={!canUseMedia || isUploadingMedia}
                    className="px-3.5 py-1.5 rounded-full text-[10px] font-black text-white bg-gradient-to-r from-indigo-500 to-fuchsia-500 shadow-[0_8px_16px_rgba(79,70,229,0.24)] hover:from-indigo-400 hover:to-fuchsia-400 disabled:opacity-50"
                  >
                    {isUploadingMedia ? 'アップロード中...' : 'アップロード'}
                  </button>
                  <input
                    ref={mediaInputRef}
                    type="file"
                    accept="image/*,video/*"
                    onChange={handleMediaFileChange}
                    className="hidden"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar">
                {!canUseMedia && (
                  <div className="h-full flex items-center justify-center text-xs text-slate-400">
                    顧客ID認証後にメディアを利用できます。
                  </div>
                )}

                {canUseMedia && mediaLoading && (
                  <div className="h-full flex items-center justify-center text-xs text-slate-400">
                    読み込み中...
                  </div>
                )}

                {canUseMedia && !mediaLoading && mediaError && (
                  <div className="text-xs text-red-500">{mediaError}</div>
                )}

                {canUseMedia && !mediaLoading && !mediaError && mediaAssets.length === 0 && (
                  <div className="h-full flex items-center justify-center text-xs text-slate-400">
                    まだメディアがありません。画像や動画をアップロードしてください。
                  </div>
                )}

                {canUseMedia && !mediaLoading && mediaAssets.length > 0 && (
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                    {mediaAssets.map((asset) => {
                      const isVideo = String(asset.mimeType || '').startsWith('video/');
                      return (
                        <div key={asset.id} className="group relative rounded-xl border border-white bg-white/80 shadow-[0_6px_16px_rgba(15,23,42,0.08)] overflow-hidden">
                          <button
                            type="button"
                            onClick={() => handleMediaSelect(asset)}
                            className="w-full aspect-[4/3] flex items-center justify-center bg-slate-100/60"
                          >
                            {isVideo ? (
                              <video
                                src={asset.url}
                                className="w-full h-full object-cover"
                                muted
                                playsInline
                                preload="metadata"
                              />
                            ) : (
                              <img
                                src={asset.url}
                                alt={asset.originalName || 'media'}
                                className="w-full h-full object-cover"
                              />
                            )}
                          </button>
                          <div className="px-2 py-1 text-[10px] text-slate-500 flex items-center justify-between">
                            <span className="truncate">{asset.originalName || asset.fileName}</span>
                            <span>{formatBytes(Number(asset.sizeBytes || 0))}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleMediaDelete(asset.id)}
                            className="absolute top-1 right-1 w-6 h-6 rounded-full bg-white/90 text-slate-500 text-[10px] font-black shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            ×
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </section>
          </div>

        </div>
      </div>
    </div>
  );
}

export default function PaletteDesign() {
  return (
    <Suspense fallback={<div className="fixed inset-0 bg-slate-50" />}>
      <PaletteDesignInner />
    </Suspense>
  );
}