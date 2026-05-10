"use client";

import React, { Suspense, useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { Send, Layout, Sparkles, User, Box, PenLine, RefreshCw, BellRing, History, Plus, Trash2, Zap, AlertTriangle, Info, Upload } from 'lucide-react';
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
  conciergeActions?: ConciergeAction[];
  progressCards?: ProgressCard[];
  showOrderButton?: boolean;
};

type ChatSessionSummary = {
  id: string;
  paletteId: string;
  title: string;
  serviceMode: string;
  updatedAt: string;
};

type ConciergeAction = {
  priority: 'high' | 'medium' | 'low';
  service: string;
  title: string;
  description: string;
};

type ProgressCard = {
  service: string;
  label: string;
  status: string;
  health: string;
  detail: string;
  lastActivity: string;
};

type PromptSelectionKind = 'single' | 'multi';
type ServiceMode = 'none' | 'pal_studio' | 'pal_video' | 'palette_ai' | 'pal_trust' | 'marketing_advisor' | 'other';
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
  | 'mediaOptional'
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

type BlogStep =
  | 'idle'
  | 'askTopic'
  | 'askKeywords'
  | 'askTarget'
  | 'askImage'
  | 'generating'
  | 'preview'
  | 'publishing'
  | 'done';

type BlogDraft = {
  topic: string;
  keywords: string;
  target: string;
  imageUrl: string;
  title: string;
  bodyHtml: string;
  slug: string;
  excerpt: string;
  tags: string[];
};

const EMPTY_BLOG_DRAFT: BlogDraft = {
  topic: '', keywords: '', target: '', imageUrl: '',
  title: '', bodyHtml: '', slug: '', excerpt: '', tags: [],
};

const UPLOAD_MAX_BYTES = 12 * 1024 * 1024; // 12MB
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif',
  'video/mp4', 'video/quicktime',
]);

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
    { role: 'ai', content: 'こんにちは！Palette AIです。まずログインIDを入力してください。' }
  ]);
  const [authStep, setAuthStep] = useState<'askId' | 'askPassword' | 'authenticated'>('askId');
  const [authPaletteId, setAuthPaletteId] = useState('');
  const [authCustomerName, setAuthCustomerName] = useState('');
  const [authIndustry, setAuthIndustry] = useState('');
  const [authServiceSummary, setAuthServiceSummary] = useState('');
  const [authServiceCards, setAuthServiceCards] = useState<ServiceCard[]>([]);
  const [authContractCards, setAuthContractCards] = useState<ContractInfoCard[]>([]);
  const [mediaAssets, setMediaAssets] = useState<MediaAsset[]>([]);
  const [mediaError, setMediaError] = useState('');
  const [mediaLoading, setMediaLoading] = useState(false);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [selectedMediaUrls, setSelectedMediaUrls] = useState<string[]>([]);
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
  const [showMediaLibraryPanel, setShowMediaLibraryPanel] = useState(false);
  const [activeServiceMode, setActiveServiceMode] = useState<ServiceMode>('none');
  const [activeServiceCard, setActiveServiceCard] = useState<ServiceCard | null>(null);
  const [studioPlanTier, setStudioPlanTier] = useState<StudioPlanTier>('standard');
  const [studioStep, setStudioStep] = useState<StudioStep>('idle');
  const [blogStep, setBlogStep] = useState<BlogStep>('idle');
  const [blogDraft, setBlogDraft] = useState<BlogDraft>(EMPTY_BLOG_DRAFT);
  const [palVideoLiteStep, setPalVideoLiteStep] = useState<'companyName' | 'contactInfo' | 'purpose' | 'destination' | 'duration' | 'appeal' | 'mood' | 'media' | 'done'>('companyName');
  const [palVideoLiteAnswers, setPalVideoLiteAnswers] = useState<{ companyName: string; contactInfo: string; purpose: string; destination: string; duration: string; appeal: string; mood: string; mediaUrls: string[] }>({
    companyName: '',
    contactInfo: '',
    purpose: '',
    destination: '',
    duration: '',
    appeal: '',
    mood: '',
    mediaUrls: [],
  });
  const [palVideoStandardStep, setPalVideoStandardStep] = useState<'purpose' | 'destination' | 'duration' | 'telop' | 'color' | 'media' | 'done'>('purpose');
  const [palVideoStandardAnswers, setPalVideoStandardAnswers] = useState<{ purpose: string; destination: string; duration: string; telop: string; color: string; mediaUrls: string[] }>({
    purpose: '',
    destination: '',
    duration: '',
    telop: '',
    color: '',
    mediaUrls: [],
  });
  const [hasAgency, setHasAgency] = useState(false);
  const [palTrustOrderStep, setPalTrustOrderStep] = useState<'idle' | 'hearing' | 'submitting' | 'done'>('idle');
  const [palTrustOrderAnswers, setPalTrustOrderAnswers] = useState<Record<string, string>>({});
  const [palStudioOrderStep, setPalStudioOrderStep] = useState<'idle' | 'hearing' | 'submitting' | 'done'>('idle');
  const [palStudioOrderAnswers, setPalStudioOrderAnswers] = useState<Record<string, string>>({});
  const [palStudioOrderFiles, setPalStudioOrderFiles] = useState<File[]>([]);
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

  // --- Chat session persistence ---
  const [chatSessionId, setChatSessionId] = useState<string>(() => `cs-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  const [chatSessions, setChatSessions] = useState<ChatSessionSummary[]>([]);
  const [showSessionList, setShowSessionList] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedJsonRef = useRef<string>('');

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

  // --- Session persistence helpers ---
  const saveChatSession = useCallback(async (
    msgs: ChatMessage[],
    sessionId: string,
    paletteId: string,
    svcMode: string,
  ) => {
    if (!paletteId || !/^[A-Z][0-9]{4}$/.test(paletteId)) return;
    // Skip save if nothing changed
    const json = JSON.stringify(msgs);
    if (json === lastSavedJsonRef.current) return;

    try {
      const firstUserMsg = msgs.find((m) => m.role === 'user');
      const title = firstUserMsg
        ? String(firstUserMsg.content).slice(0, 30)
        : 'New conversation';

      await fetch('/api/chat-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: sessionId,
          paletteId,
          title,
          serviceMode: svcMode,
          messages: msgs,
        }),
      });
      lastSavedJsonRef.current = json;
    } catch (err) {
      console.warn('chat session save failed', err);
    }
  }, []);

  const debouncedSave = useCallback((
    msgs: ChatMessage[],
    sessionId: string,
    paletteId: string,
    svcMode: string,
  ) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      void saveChatSession(msgs, sessionId, paletteId, svcMode);
    }, 2000);
  }, [saveChatSession]);

  const loadChatSessions = useCallback(async (paletteId: string) => {
    if (!paletteId || !/^[A-Z][0-9]{4}$/.test(paletteId)) return;
    try {
      const res = await fetch(`/api/chat-sessions?paletteId=${encodeURIComponent(paletteId)}`);
      const data = await res.json().catch(() => ({}));
      if (res.ok && Array.isArray(data?.sessions)) {
        setChatSessions(data.sessions);
      }
    } catch (err) {
      console.warn('chat sessions load failed', err);
    }
  }, []);

  const handleLoadSession = useCallback(async (sessionId: string) => {
    try {
      const res = await fetch(`/api/chat-sessions/${encodeURIComponent(sessionId)}`);
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.session) {
        const session = data.session;
        setChatSessionId(session.id);
        setMessages(Array.isArray(session.messages) ? session.messages : []);
        setActiveServiceMode((session.serviceMode || 'none') as ServiceMode);
        lastSavedJsonRef.current = JSON.stringify(session.messages || []);
        setShowSessionList(false);
      }
    } catch (err) {
      console.warn('chat session load failed', err);
    }
  }, []);

  const handleNewSession = useCallback(() => {
    const newId = `cs-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setChatSessionId(newId);
    lastSavedJsonRef.current = '';
    setMessages([
      { role: 'ai', content: `${normalizeCustomerName(authCustomerName) || 'お客様'}様、なにをお手伝いしますか？`, serviceCards: authServiceCards.length ? authServiceCards : [] },
    ]);
    setActiveServiceMode('none');
    setConversationEnded(false);
    setShowConfirmSave(false);
    setGeneratedCode('');
    setShowSessionList(false);
  }, [authCustomerName, authServiceCards]);

  const handleDeleteSession = useCallback(async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await fetch(`/api/chat-sessions?id=${encodeURIComponent(sessionId)}`, { method: 'DELETE' });
      setChatSessions((prev) => prev.filter((s) => s.id !== sessionId));
      if (sessionId === chatSessionId) {
        handleNewSession();
      }
    } catch (err) {
      console.warn('chat session delete failed', err);
    }
  }, [chatSessionId, handleNewSession]);

  // --- Concierge ---
  const [isConciergeLoading, setIsConciergeLoading] = useState(false);

  const handleConcierge = useCallback(async () => {
    if (!resolvedCustomerId || isConciergeLoading) return;
    setIsConciergeLoading(true);

    const userMsg: ChatMessage = { role: 'user', content: 'サービスの状況を確認したい' };
    setMessages((prev) => [...prev, userMsg]);

    try {
      const res = await fetch('/api/concierge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paletteId: resolvedCustomerId }),
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok && data?.success) {
        const aiMsg: ChatMessage = {
          role: 'ai',
          content: data.summary || 'サービスの状況を確認しました。',
          conciergeActions: Array.isArray(data.actions) ? data.actions : [],
          progressCards: Array.isArray(data.progress) ? data.progress : [],
        };
        setMessages((prev) => [...prev, aiMsg]);
      } else {
        setMessages((prev) => [
          ...prev,
          { role: 'ai', content: data?.error || 'サービス状況の取得に失敗しました。' },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'ai', content: 'サービス状況の確認中にエラーが発生しました。' },
      ]);
    } finally {
      setIsConciergeLoading(false);
    }
  }, [resolvedCustomerId, isConciergeLoading]);

  // Load sessions after authentication
  useEffect(() => {
    if (authStep === 'authenticated' && resolvedCustomerId) {
      void loadChatSessions(resolvedCustomerId);
    }
  }, [authStep, resolvedCustomerId, loadChatSessions]);

  // Auto-save on message change (after auth)
  useEffect(() => {
    if (authStep === 'authenticated' && messages.length > 1) {
      debouncedSave(messages, chatSessionId, resolvedCustomerId, activeServiceMode);
    }
  }, [messages, authStep, chatSessionId, resolvedCustomerId, activeServiceMode, debouncedSave]);

  // Save on page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (authStep === 'authenticated' && messages.length > 1) {
        const firstUserMsg = messages.find((m) => m.role === 'user');
        const title = firstUserMsg ? String(firstUserMsg.content).slice(0, 30) : 'New conversation';
        const body = JSON.stringify({
          id: chatSessionId,
          paletteId: resolvedCustomerId,
          title,
          serviceMode: activeServiceMode,
          messages,
        });
        navigator.sendBeacon('/api/chat-sessions', new Blob([body], { type: 'application/json' }));
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [authStep, messages, chatSessionId, resolvedCustomerId, activeServiceMode]);

  // Cleanup save timer
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  // Close session list on outside click
  useEffect(() => {
    if (!showSessionList) return;
    const handleClick = () => setShowSessionList(false);
    const timer = setTimeout(() => document.addEventListener('click', handleClick), 0);
    return () => { clearTimeout(timer); document.removeEventListener('click', handleClick); };
  }, [showSessionList]);

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

  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);
  const [studioGenerateProgress, setStudioGenerateProgress] = useState(0);
  const studioGenerateTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const validateFile = (file: File): string | null => {
    if (file.size > UPLOAD_MAX_BYTES) {
      return `${file.name} は12MBを超えています（${formatBytes(file.size)}）。`;
    }
    const mime = file.type || '';
    if (!ALLOWED_MIME_TYPES.has(mime) && !mime.startsWith('image/') && !mime.startsWith('video/')) {
      return `${file.name} は対応していないファイル形式です（${mime || '不明'}）。`;
    }
    return null;
  };

  const handleMediaUpload = async (file: File) => {
    if (!canUseMedia) return;

    const validationError = validateFile(file);
    if (validationError) {
      setMediaError(validationError);
      return;
    }

    try {
      const formData = new FormData();
      formData.set('paletteId', resolvedCustomerId);
      formData.set('file', file, file.name || 'upload');

      // Use XMLHttpRequest for progress tracking
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/api/media/upload');
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            setUploadProgress(Math.round((e.loaded / e.total) * 100));
          }
        });
        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            const data = JSON.parse(xhr.responseText || '{}');
            reject(new Error(data?.error || `アップロードに失敗しました (${xhr.status})`));
          }
        });
        xhr.addEventListener('error', () => reject(new Error('アップロード中にネットワークエラーが発生しました。')));
        xhr.send(formData);
      });

      await loadMediaAssets();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'アップロードに失敗しました。';
      setMediaError(message);
    }
  };

  const handleMediaFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    setIsUploadingMedia(true);
    setMediaError('');
    setUploadProgress(0);

    // Validate all first
    const errors: string[] = [];
    const validFiles: File[] = [];
    for (const file of files) {
      const err = validateFile(file);
      if (err) errors.push(err);
      else validFiles.push(file);
    }
    if (errors.length) setMediaError(errors.join('\n'));

    try {
      // Upload up to 3 files in parallel
      const chunks: File[][] = [];
      for (let i = 0; i < validFiles.length; i += 3) {
        chunks.push(validFiles.slice(i, i + 3));
      }
      for (const chunk of chunks) {
        await Promise.all(chunk.map((file) => handleMediaUpload(file)));
      }
    } finally {
      setIsUploadingMedia(false);
      setUploadProgress(0);
      event.target.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (canUseMedia) setIsDragOver(true);
  };
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (!canUseMedia) return;
    const files = Array.from(e.dataTransfer.files);
    if (!files.length) return;
    setIsUploadingMedia(true);
    setMediaError('');
    setUploadProgress(0);
    const errors: string[] = [];
    const validFiles: File[] = [];
    for (const file of files) {
      const err = validateFile(file);
      if (err) errors.push(err);
      else validFiles.push(file);
    }
    if (errors.length) setMediaError(errors.join('\n'));
    try {
      const chunks: File[][] = [];
      for (let i = 0; i < validFiles.length; i += 3) {
        chunks.push(validFiles.slice(i, i + 3));
      }
      for (const chunk of chunks) {
        await Promise.all(chunk.map((file) => handleMediaUpload(file)));
      }
    } finally {
      setIsUploadingMedia(false);
      setUploadProgress(0);
    }
  };

  const handleMediaSelect = (asset: MediaAsset) => {
    const url = String(asset?.url || '').trim();
    if (!url) return;
    const isStudioMediaSelection = activeServiceMode === 'pal_studio'
      && studioStep !== 'idle'
      && studioStep !== 'completed';
    if (activeServiceMode === 'pal_video' || isStudioMediaSelection) {
      setSelectedMediaUrls((prev) => {
        if (prev.includes(url)) {
          return prev.filter((item) => item !== url);
        }
        return [...prev, url];
      });
      return;
    }
    setInputText((prev) => (prev ? `${prev}\n${url}` : url));
    if (isMobileViewport) setActiveTab('chat');
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
    'Warm（温かみ・信頼感）',
    'Noir（モダン・クール）',
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
    'トップ', 'コンセプト', '特徴', 'サービス', '実績・ギャラリー', 'ニュース', 'ブログ', 'お問い合わせ', '会社・店舗情報', 'その他（自由入力）',
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
  const PAL_VIDEO_LITE_MEDIA_BUTTONS: ActionButton[] = [
    { key: 'upload-media', label: 'アップロード' },
    { key: 'no-media', label: 'なし' },
    { key: 'media-done', label: '完了' },
  ];
  const STUDIO_MEDIA_ACTION_BUTTONS: ActionButton[] = [
    { key: 'media-library', label: 'メディア' },
    { key: 'upload-media', label: 'アップロード' },
    { key: 'studio-media-none', label: 'なし' },
    { key: 'studio-media-done', label: '完了' },
  ];
  const PAL_VIDEO_LITE_BGM_OPTIONS = ['明るい・ポップ', 'クール・ミニマル', '感動・シネマ', 'ナチュラル・ほのぼの'];
  const PAL_VIDEO_MOOD_OPTIONS = ['おしゃれ・洗練', '元気・ポップ', '信頼感・プロフェッショナル', 'ナチュラル・温かい', 'クール・テック'];
  const PAL_VIDEO_MOOD_TO_TEMPLATE: Record<string, { style: string; bgm: string; colorPrimary: string; colorAccent: string }> = {
    'おしゃれ・洗練': { style: 'magazine', bgm: 'cinematic', colorPrimary: '#1C1C1C', colorAccent: '#C4973A' },
    '元気・ポップ': { style: 'gradient', bgm: 'bright_pop', colorPrimary: '#E95464', colorAccent: '#F5A623' },
    '信頼感・プロフェッショナル': { style: 'standard', bgm: 'cool_minimal', colorPrimary: '#1A2744', colorAccent: '#2A7FC1' },
    'ナチュラル・温かい': { style: 'standard', bgm: 'natural_warm', colorPrimary: '#3A5A40', colorAccent: '#D4A853' },
    'クール・テック': { style: 'gradient', bgm: 'cool_minimal', colorPrimary: '#0D1B2A', colorAccent: '#4F7CFF' },
  };
  const PAL_VIDEO_PURPOSE_OPTIONS = ['プロモーション動画', 'SNS投稿用', 'SNS広告', '口コミ紹介', '実績紹介'];
  const PAL_VIDEO_DESTINATION_OPTIONS = [
    'Instagram リール', 'Instagram ストーリーズ', 'Instagram フィード',
    'TikTok', 'YouTube ショート', 'YouTube',
    'X (Twitter)', 'LINE VOOM', 'Facebook', 'Webバナー動画',
  ];
  const PAL_VIDEO_PURPOSE_LABELS: Record<string, string> = {
    promotion: 'プロモーション動画',
    sns_post: 'SNS投稿用',
    sns_ad: 'SNS広告',
    review: '口コミ紹介',
    achievement: '実績紹介',
  };
  const PAL_VIDEO_DESTINATION_LABELS: Record<string, string> = {
    instagram_reel: 'Instagram リール',
    instagram_story: 'Instagram ストーリーズ',
    instagram_feed: 'Instagram フィード',
    tiktok: 'TikTok',
    youtube_short: 'YouTube ショート',
    youtube: 'YouTube',
    x_twitter: 'X (Twitter)',
    line_voom: 'LINE VOOM',
    facebook: 'Facebook',
    web_banner: 'Webバナー動画',
  };
  const PAL_VIDEO_BGM_LABELS: Record<string, string> = {
    bright_pop: '明るい・ポップ',
    cool_minimal: 'クール・ミニマル',
    cinematic: '感動・シネマ',
    natural_warm: 'ナチュラル・ほのぼの',
    light: '明るい・ポップ',
    pop: '明るい・ポップ',
    cool: 'クール・ミニマル',
    warm: 'ナチュラル・ほのぼの',
  };

  const applyPalVideoLitePrompt = (text: string) => {
    const normalized = String(text || '');
    if (/動画の用途|コンテンツの目的|用途を教えて/.test(normalized)) {
      applyStudioPrompt(['動画の用途（コンテンツの目的）を教えてください。'], [PAL_VIDEO_PURPOSE_OPTIONS], ['single']);
      return;
    }
    if (/投稿先|プラットフォーム|掲載先/.test(normalized)) {
      applyStudioPrompt(['投稿先を教えてください。'], [PAL_VIDEO_DESTINATION_OPTIONS], ['single']);
      return;
    }
    if (/動画の秒数|秒数は何秒|何秒程度|何秒ぐらい|何秒くらい/.test(normalized)) {
      applyStudioPrompt(['動画の秒数は何秒程度がいいですか？'], [PAL_VIDEO_LITE_DURATION_OPTIONS], ['single']);
      return;
    }
    if (/使いたい色|色はありますか|色の希望|色を教えて|カラー|色味|配色|トーン/.test(normalized)) {
      applyStudioPrompt(['使いたい色を1つ選択してください。'], [STUDIO_COLOR_OPTIONS], ['single']);
      return;
    }
    if (/bgmのイメージ|bgmはありますか|音楽のイメージ/.test(normalized)) {
      applyStudioPrompt(['BGMのイメージはありますか？'], [PAL_VIDEO_LITE_BGM_OPTIONS], ['single']);
    }
  };

  const buildPalVideoCompletionMessage = (payload: ReturnType<typeof buildPalVideoPayload>) => {
    const purposeLabel = PAL_VIDEO_PURPOSE_LABELS[payload.purpose] || '動画';
    const destinationLabel = PAL_VIDEO_DESTINATION_LABELS[payload.destination || ''] || payload.destination || '';
    const duration = Number(payload.durationSec || 0) || 30;
    const destText = destinationLabel ? `（${destinationLabel}）` : '';
    const companyText = payload.companyName ? `「${payload.companyName}」の` : '';
    const moodText = payload.mood || '指定なし';
    return `ありがとうございました！ヒアリングは以上です。\n\n${companyText}${purposeLabel}${destText}を${duration}秒、${moodText}の雰囲気で制作します。\n\n完成まで少々お待ちください！`;
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
    if (t.includes('noir') || t.includes('モダン') || t.includes('クール') || t.includes('シンプル') || t.includes('ミニマル')) {
      return templates.find((tp) => tp.id === 'template-noir') || templates[0];
    }
    return templates.find((tp) => tp.id === 'template-warm') || templates[0];
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

    if (activeServiceMode === 'pal_video') {
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
    if (/プロモーション|promotion/.test(value)) return 'promotion';
    if (/sns投稿|sns.*投稿|投稿用|オーガニック/.test(value)) return 'sns_post';
    if (/sns広告|sns.*広告|有料広告|ads/.test(value)) return 'sns_ad';
    if (/口コミ|レビュー|review/.test(value)) return 'review';
    if (/実績|事例|achievement/.test(value)) return 'achievement';
    return '';
  };

  const normalizeDestination = (raw: string): string => {
    const value = String(raw || '').toLowerCase();
    if (/ストーリー|ストーリーズ|stories/.test(value)) return 'instagram_story';
    if (/リール|reel/.test(value)) return 'instagram_reel';
    if (/フィード|feed/.test(value)) return 'instagram_feed';
    if (/youtube\s*(ショート|short|shorts)/.test(value)) return 'youtube_short';
    if (/youtube|ユーチューブ/.test(value)) return 'youtube';
    if (/tiktok|ティックトック/.test(value)) return 'tiktok';
    if (/(^|\s|\b)x(\b|\s)|twitter|ツイッター/.test(value)) return 'x_twitter';
    if (/line|voom|ライン/.test(value)) return 'line_voom';
    if (/facebook|フェイスブック/.test(value)) return 'facebook';
    if (/webバナー|web\s*banner|バナー/.test(value)) return 'web_banner';
    return '';
  };

  const resolvePalVideoTemplateCandidates = (_destination: string) => {
    return [];
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
    const liteAns = palVideoLiteAnswers;

    // ステップ回答を優先、なければメッセージから抽出
    const companyName = liteAns.companyName || answers.find((item) => /(会社名|サービス名|店名|ブランド名)/i.test(item.q))?.a || '';
    const contactInfo = liteAns.contactInfo || answers.find((item) => /(問い合わせ|連絡先|URL|電話|LINE)/i.test(item.q))?.a || '';
    const purposeAnswer = liteAns.purpose || answers.find((item) => /(動画|用途|目的)/i.test(item.q))?.a || '';
    const destinationAnswer = liteAns.destination || answers.find((item) => /(投稿先|プラットフォーム)/i.test(item.q))?.a || '';
    const durationAnswer = liteAns.duration || answers.find((item) => /(秒|尺)/i.test(item.q))?.a || '';
    const appealAnswer = liteAns.appeal || answers.find((item) => /(ウリ|強み|特長)/i.test(item.q))?.a || '';
    const moodAnswer = liteAns.mood || answers.find((item) => /(雰囲気|イメージ|トーン)/i.test(item.q))?.a || '';
    const materialAnswer = answers.find((item) => /(素材|画像|写真|ロゴ)/i.test(item.q))?.a || '';

    const purpose = normalizePalVideoPurpose(purposeAnswer) || 'promotion';
    const destination = normalizeDestination(destinationAnswer) || 'instagram_reel';
    const durationSec = extractPalVideoDuration(durationAnswer) || 30;

    // 雰囲気からテンプレート・BGM・カラーを自動推定
    const moodConfig = PAL_VIDEO_MOOD_TO_TEMPLATE[moodAnswer] || PAL_VIDEO_MOOD_TO_TEMPLATE['信頼感・プロフェッショナル'];

    const imageUrls = [
      ...liteAns.mediaUrls,
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

    return {
      companyName,
      contactInfo,
      appeal: appealAnswer,
      mood: moodAnswer,
      purpose,
      destination,
      durationSec,
      telopMain: companyName || 'テロップ未設定',
      telopSub: appealAnswer || 'サブテロップ未設定',
      colorPrimary: moodConfig.colorPrimary,
      colorAccent: moodConfig.colorAccent,
      colorNote: moodAnswer,
      style: moodConfig.style,
      bgm: moodConfig.bgm,
      imageUrls: Array.from(new Set(imageUrls)),
      hearingAnswers: answers,
      hearingMessages,
      templateCandidates: resolvePalVideoTemplateCandidates(destination),
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
    try {
      await fetch('/api/palette-ai/pal-video-job', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paletteId: resolvedCustomerId,
          planCode,
          status: 'draft',
          payload: {
            title: payload.companyName || payload.telopMain || '新規動画',
            purpose: payload.purpose,
            destination: payload.destination,
            duration: payload.durationSec,
            colorPrimary: payload.colorPrimary || '',
            colorAccent: payload.colorAccent || '',
            bgm: payload.bgm || '',
            style: payload.style || 'standard',
            cuts: [],
            hearingData: {
              companyName: payload.companyName,
              contactInfo: payload.contactInfo,
              appeal: payload.appeal,
              mood: payload.mood,
              imageUrls: payload.imageUrls,
            },
            hearingAnswers: payload.hearingAnswers || [],
            hearingMessages: payload.hearingMessages || [],
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
    if (serviceKey === 'palette_aix') {
      return {
        background: 'linear-gradient(135deg, #EEF2FF 0%, #FAE8FF 100%)',
        borderColor: '#818CF8',
        boxShadow: '0 8px 24px rgba(99,102,241,0.15)',
      };
    }
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
    if (serviceKey === 'pal_opt') {
      return {
        backgroundColor: '#A6218322',
        borderColor: '#A6218355',
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
あなたはWebデザイナーです。以下のベースHTMLを、顧客情報に合わせて調整してください。

## 顧客情報
- 屋号名: ${profile.shopName}
- 業種: ${profile.industry}
- サービス内容: ${profile.services.join(' / ')}
- 強み・アピールポイント: ${profile.appealPoint || '未設定'}
- テイスト: ${profile.taste}
- 会社情報掲載: ${profile.includeCompanyInfo ? 'あり' : 'なし'}
- 会社情報詳細: ${Object.entries(profile.companyDetails).map(([k, v]) => `${k}:${v}`).join(' / ') || 'なし'}

## 調整ルール（厳守）
- テンプレートのHTML構造・CSS・レイアウトはそのまま維持する。大幅な書き換えは禁止。
- 変更するのはテキスト内容のみ（屋号名・キャッチコピー・サービス説明・会社情報など）
- 画像の<img>タグはすべて以下に置き換える:
  <div style="background:#e5e7eb;display:flex;align-items:center;justify-content:center;width:100%;height:100%;min-height:200px;border-radius:inherit;color:#9ca3af;font-size:14px;font-weight:bold;">ここに画像が入ります</div>
- CSS変数（--main-color等）はそのまま残す
- 不要なセクション（顧客が選択していないもの）は削除してよい
- 本文は日本語で自然な文章にする
- ダミーの電話番号・住所などは「000-0000-0000」「〒000-0000 住所未設定」とする
- 最後は \`\`\`html ... \`\`\` のみ返す（説明文不要）

## ベースHTML
${template.html}
`;
  };

  const generateStudioDraft = (profile: StudioProfile): { html: string; template: Template } => {
    const selected = chooseTemplateByTaste(profile.taste);
    // テンプレートHTMLをそのまま使用（API呼び出し不要で即時表示）
    let html = selected.html;
    // 屋号名を反映
    if (profile.shopName) {
      html = html.replace(/Company\s*<span[^>]*>Name<\/span>/gi, `${profile.shopName}`);
      html = html.replace(/Company Name/g, profile.shopName);
      html = html.replace(/Studio<span[^>]*>\.<\/span>/g, `${profile.shopName}`);
    }
    return { html, template: selected };
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

  const prepareStudioPreview = (profile: StudioProfile, conversation: ChatMessage[]) => {
    if (studioHtmlGenerationCount >= 3) {
      setShowConfirmSave(false);
      setConversationEnded(true);
      appendAiMessage({ content: 'HTML生成が3回に達したため、制作担当に共有して、3営業日以内にご連絡させますので少々お待ちください。' });
      return;
    }

    const draft = generateStudioDraft(profile);

    // 15秒の擬似ローディング演出
    setStudioGenerateProgress(0);
    appendAiMessage({ content: 'モデルページを制作中です...' });

    if (studioGenerateTimerRef.current) clearInterval(studioGenerateTimerRef.current);
    const totalMs = 15000;
    const intervalMs = 200;
    const steps = totalMs / intervalMs;
    let step = 0;

    studioGenerateTimerRef.current = setInterval(() => {
      step++;
      const progress = Math.min(Math.round((step / steps) * 100), 100);
      setStudioGenerateProgress(progress);

      if (progress >= 100) {
        if (studioGenerateTimerRef.current) clearInterval(studioGenerateTimerRef.current);
        studioGenerateTimerRef.current = null;

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
        setStudioGenerateProgress(0);
        appendAiMessage({ content: `モデルページが完成しました！内容を確認して「OK」または「修正」を選んでください。（HTML生成 ${Math.min(studioHtmlGenerationCount + 1, 3)}/3）` });
      }
    }, intervalMs);
  };

  const mergeServiceSelections = (baseServices: string[], freeText: string): string[] => {
    const cleanedFree = String(freeText || '').trim();
    const normalized = baseServices.filter((item) => !/その他/.test(String(item || '')));
    if (!cleanedFree) return normalized;
    return Array.from(new Set([...normalized, cleanedFree]));
  };

  // ── Blog Flow ─────────────────────────────────────────────────────────────

  const handleBlogFlowInput = async (rawInput: string) => {
    const input = rawInput.trim();
    const userMsg: ChatMessage = { role: 'user', content: input };
    setMessages((prev) => [...prev, userMsg]);
    setInputText('');

    if (blogStep === 'askTopic') {
      setBlogDraft((d) => ({ ...d, topic: input }));
      setBlogStep('askKeywords');
      appendAiMessage({ content: 'SEOキーワードを入力してください。\n（例：美容室 渋谷 カット スタイル ヘアケア）' });
      return;
    }

    if (blogStep === 'askKeywords') {
      setBlogDraft((d) => ({ ...d, keywords: input }));
      setBlogStep('askTarget');
      appendAiMessage({ content: 'ターゲット読者を教えてください。\n（例：30代女性 ヘアケアに悩んでいる方）' });
      return;
    }

    if (blogStep === 'askTarget') {
      setBlogDraft((d) => ({ ...d, target: input }));
      setBlogStep('askImage');
      appendAiMessage({ content: '使用する画像URLがあれば入力してください。\nない場合は「スキップ」と入力してください。' });
      return;
    }

    if (blogStep === 'askImage') {
      const imageUrl = /^https?:\/\//i.test(input) ? input : '';
      const nextDraft = { ...blogDraft, imageUrl };
      setBlogDraft(nextDraft);
      setBlogStep('generating');
      appendAiMessage({ content: 'ブログを生成中です。少々お待ちください…' });

      try {
        const res = await fetch('/api/pal-studio-blog/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            topic: nextDraft.topic,
            keywords: nextDraft.keywords,
            target: nextDraft.target,
            imageUrl: nextDraft.imageUrl,
            shopName: authCustomerName,
          }),
        });
        const data = await res.json() as Record<string, unknown>;

        if (!res.ok || data.success === false) {
          setBlogStep('askTopic');
          appendAiMessage({ content: `生成に失敗しました：${String(data.error || '不明なエラー')}\n最初からやり直します。テーマを入力してください。` });
          return;
        }

        const generated: BlogDraft = {
          ...nextDraft,
          title: String(data.title || ''),
          slug: String(data.slug || ''),
          bodyHtml: String(data.bodyHtml || ''),
          excerpt: String(data.excerpt || ''),
          tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
          imageUrl: String(data.imageUrl || nextDraft.imageUrl),
        };
        setBlogDraft(generated);
        setBlogStep('preview');

        const previewText = [
          `📝 **${generated.title}**`,
          '',
          generated.excerpt,
          '',
          generated.tags.length > 0 ? `タグ: ${generated.tags.join(' / ')}` : '',
          generated.imageUrl ? `画像: ${generated.imageUrl}` : '',
        ].filter(Boolean).join('\n');

        appendAiMessage({
          content: `ブログのプレビューです。\n\n${previewText}\n\nこの内容でブログを投稿しますか？`,
          actionButtons: [
            { key: 'blog-publish-confirm', label: '投稿する' },
            { key: 'blog-revise', label: 'やり直す' },
          ],
        });
      } catch (err) {
        setBlogStep('askTopic');
        appendAiMessage({ content: `エラーが発生しました：${err instanceof Error ? err.message : String(err)}\n最初からやり直します。テーマを入力してください。` });
      }
      return;
    }
  };

  const handleBlogPublish = async () => {
    if (blogStep !== 'preview') return;
    setBlogStep('publishing');
    appendAiMessage({ content: 'ブログを投稿中です…' });

    try {
      const res = await fetch('/api/pal-studio-blog/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paletteId: resolvedCustomerId,
          post: {
            id: `palai-${Date.now()}`,
            title: blogDraft.title,
            slug: blogDraft.slug,
            bodyHtml: blogDraft.bodyHtml,
            excerpt: blogDraft.excerpt,
            status: 'published',
            postType: 'blog',
            tags: blogDraft.tags,
            publishedAt: new Date().toISOString(),
            imageUrl: blogDraft.imageUrl || undefined,
          },
        }),
      });
      const data = await res.json() as Record<string, unknown>;

      if (!res.ok || data.success === false) {
        setBlogStep('preview');
        appendAiMessage({ content: `投稿に失敗しました：${String(data.error || '不明なエラー')}` });
        return;
      }

      setBlogStep('done');
      appendAiMessage({ content: `✅ ブログを pal_studio に投稿しました！\n\nタイトル：${blogDraft.title}\n\nPal Studio でご確認ください。` });
    } catch (err) {
      setBlogStep('preview');
      appendAiMessage({ content: `投稿中にエラーが発生しました：${err instanceof Error ? err.message : String(err)}` });
    }
  };

  // ── Studio Flow ────────────────────────────────────────────────────────────

  const handleStudioFlowInput = async (rawInput: string) => {
    const answers = extractStudioAnswers(rawInput);
    const first = String(answers[0] || '').trim();
    const userMessage: ChatMessage = { role: 'user', content: rawInput };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInputText('');

    if (studioStep === 'shopName') {
      const shopNameVal = first;
      // CRM に業種が登録済みならスキップ
      if (authIndustry) {
        setStudioProfile((prev) => ({ ...prev, shopName: shopNameVal, industry: authIndustry }));
        setStudioStep('services');
        applyStudioPrompt(['具体的なサービス内容を選択してください（複数選択可）。'], [getServiceCandidatesByIndustry(authIndustry)], ['multi']);
        appendAiMessage({ content: `業種は「${authIndustry}」で登録されています。続いて、具体的なサービス内容を教えてください。` });
      } else {
        setStudioProfile((prev) => ({ ...prev, shopName: shopNameVal }));
        setStudioStep('industry');
        applyStudioPrompt(['業種を選択してください（該当がなければ自由入力へ切り替え可）。'], [[
          '飲食', '美容・サロン', '士業', '工務店・建築', '不動産', '医療・クリニック', '教育', 'その他（自由入力）',
        ]], ['single']);
        appendAiMessage({ content: '続いて、業種を教えてください。' });
      }
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
      appendAiMessage({
        content: '使いたいロゴや画像があれば、下のボタンから操作してください。',
        actionButtons: STUDIO_MEDIA_ACTION_BUTTONS,
      });
      setStudioStep('mediaOptional');
      return;
    }

    if (studioStep === 'mediaOptional') {
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
      prepareStudioPreview(nextProfile, updatedMessages);
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
        ? generateStudioDraft(studioProfile).html
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
    setSelectedMediaUrls([]);
    setShowMediaLibraryPanel(false);
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
      const phase = String(card.phase || '').toLowerCase();
      const status = String(card.status || '').toLowerCase();

      // 新ステータス: 着手前 / 制作中 / 納品済み
      const isNotStarted = includesAny(phase, ['着手前', 'not started'])
        || includesAny(status, ['着手前', 'not started']);
      const isInProduction = includesAny(phase, ['制作中', 'in progress', 'hearing'])
        || includesAny(status, ['制作中', 'in progress', 'active']);
      const isDelivered = includesAny(phase, ['納品済み', '納品完了', 'completed', 'delivered'])
        || includesAny(status, ['納品済み', '納品完了', 'completed', 'delivered']);

      if (isDelivered) {
        appendAiMessage({
          content: 'Pal Studio で実行したい操作を選んでください。',
          actionButtons: [
            { key: 'news-post', label: 'ニュース投稿（この先実装）' },
            { key: 'blog-post', label: 'ブログ投稿' },
          ],
        });
        return;
      }

      if (isInProduction || isNotStarted) {
        appendAiMessage({
          content: tier === 'lite'
            ? 'ライトプランとしてヒアリングを開始します。必要項目を絞って進めます。'
            : 'スタンダードプランとしてヒアリングを開始します。',
        });
        startStudioFlow();
        return;
      }

      // フォールバック: ヒアリング開始
      appendAiMessage({
        content: 'ヒアリングを開始します。',
      });
      startStudioFlow();
      return;
    }

    setStudioPlanTier('standard');

    if (card.key === 'pal_video') {
      appendAiMessage({
        content: 'Pal Video のヒアリングを開始します！\nまず、動画に表示する会社名（またはサービス名）を教えてください。',
      });
      setPalVideoLiteStep('companyName');
      setPalVideoLiteAnswers({
        companyName: '',
        contactInfo: '',
        purpose: '',
        destination: '',
        duration: '',
        appeal: '',
        mood: '',
        mediaUrls: [],
      });
      applyStudioPrompt(
        ['会社名・サービス名を入力してください'],
        [['株式会社〇〇', '〇〇サロン', '〇〇クリニック', '〇〇カフェ']],
        ['single'],
        ['text'],
      );
      return;
    }

    if (card.key === 'palette_ai') {
      appendAiMessage({
        content: 'Palette Ai について質問ありますか？下の候補から選べます。',
      });
      resetPlanQuestionButtons();
      return;
    }

    if (card.key === 'palette_aix') {
      appendAiMessage({
        content: `Palette AIX をご契約いただきありがとうございます🎉\n\n営業AIチャットBotを自社サイトに設置すると、24時間自動でヒアリング〜提案〜予約/問い合わせ誘導まで行います。\n\n下のボタンからご利用ください。`,
        actionButtons: [
          { key: 'aix-reports', label: 'Botの成果レポートを見る' },
          { key: 'aix-embed-code', label: '埋め込みコードを取得' },
          { key: 'aix-contact-setup', label: 'Bot設定画面を開く' },
        ],
      });
      return;
    }

    appendAiMessage({
      content: `${card.title} の詳細操作はこれから実装します。`,
    });
  };

  // --- 発注フロー: サービス選択 → ヒアリング開始 ---
  const ORDER_SERVICES = [
    { key: 'pal_trust', label: 'Pal Trust', description: '口コミ管理システム' },
    { key: 'pal_studio', label: 'Pal Studio', description: 'AIホームページ制作' },
  ];

  const handleOrderButtonClick = () => {
    setConversationEnded(false);
    appendAiMessage({
      content: '発注するサービスを選択してください。',
      actionButtons: ORDER_SERVICES.map((s) => ({
        key: `order_${s.key}`,
        label: s.label,
      })),
    });
  };

  const PAL_TRUST_HEARING_FIELDS = [
    { key: 'shopName', label: '店舗名・会社名', required: true, type: 'text' as const },
    { key: 'representativeName', label: '代表者名（担当者名）', required: true, type: 'text' as const },
    { key: 'industry', label: '業種（例: 美容院、飲食店、整体院）', required: true, type: 'text' as const },
    { key: 'loginId', label: 'ログインID（半角英数字）', required: true, type: 'text' as const },
    { key: 'loginPassword', label: 'ログインパスワード', required: true, type: 'text' as const },
    { key: 'priceInitial', label: '初期費用（税抜・円）', required: true, type: 'text' as const },
    { key: 'initialFeePaymentMethod', label: '初期費用の支払方法', required: true, type: 'select' as const, options: ['スクエア', '請求書払い'] },
    { key: 'priceYen', label: '月額費用（税抜・円）', required: true, type: 'text' as const },
    { key: 'monthlyFeePaymentMethod', label: '月額費用の支払方法', required: true, type: 'select' as const, options: ['スクエア', '請求書払い'] },
    { key: 'term', label: '契約期間（例: 12ヶ月）', required: true, type: 'text' as const },
    { key: 'dateContract', label: '契約日', required: true, type: 'date' as const },
    { key: 'dateDelivery', label: '納品希望月', required: true, type: 'month' as const },
    { key: 'initialFeeDueDate', label: '初期費用支払予定日', required: true, type: 'date' as const },
    { key: 'firstMonthlyDueDate', label: '初回月額支払予定日', required: true, type: 'date' as const },
    { key: 'googleMapUrl', label: 'Google Map URL', required: false, type: 'text' as const },
    { key: 'adminGoogleMapUrl', label: 'Googleビジネスプロフィール URL', required: true, type: 'text' as const },
    { key: 'surveyQuestions', label: 'アンケートで聞きたい質問（改行区切り）', required: false, type: 'textarea' as const },
    { key: 'minStarsForGoogle', label: 'Google口コミに誘導する最低星数', required: false, type: 'select' as const, options: ['3', '4', '5'] },
    { key: 'aiReviewTaste', label: '口コミの文体', required: false, type: 'select' as const, options: ['親しみやすい', '丁寧', '元気', '感動的', 'シンプル', 'おまかせ'] },
    { key: 'themeName', label: 'デザインテーマ', required: false, type: 'select' as const, options: ['スタンダード', 'ミニマル', 'フェミニン', 'ダーク', 'ポップ'] },
  ];

  const startPalTrustOrderHearing = () => {
    setConversationEnded(false);
    setPalTrustOrderStep('hearing');
    setPalTrustOrderAnswers({
      minStarsForGoogle: '4',
      aiReviewTaste: '親しみやすい',
      themeName: 'スタンダード',
      initialFeePaymentMethod: 'スクエア',
      monthlyFeePaymentMethod: 'スクエア',
    });
    appendAiMessage({
      content: 'Pal Trust の発注ヒアリングを開始します。\nVIEWに表示されたフォームから入力して「発注する」を押してください。',
    });
  };

  const submitPalTrustOrder = async () => {
    const a = palTrustOrderAnswers;
    if (!a.shopName || !a.representativeName || !a.industry || !a.loginId || !a.loginPassword || !a.adminGoogleMapUrl || !a.priceInitial || !a.priceYen || !a.term || !a.dateContract || !a.dateDelivery || !a.initialFeeDueDate || !a.firstMonthlyDueDate || !a.initialFeePaymentMethod || !a.monthlyFeePaymentMethod) {
      appendAiMessage({ content: '必須項目（*マーク）をすべて入力してください。' });
      return;
    }
    setPalTrustOrderStep('submitting');
    const themeMap: Record<string, string> = {
      'スタンダード': 'standard', 'ミニマル': 'minimal', 'フェミニン': 'feminine', 'ダーク': 'dark', 'ポップ': 'pop',
    };
    const tasteMap: Record<string, string> = {
      '親しみやすい': 'friendly', '丁寧': 'polite', '元気': 'energetic', '感動的': 'emotional', 'シンプル': 'minimal', 'おまかせ': 'random',
    };
    const paymentMethodMap: Record<string, string> = {
      'スクエア': 'square',
      '請求書払い': 'invoice',
    };
    try {
      const res = await fetch('/api/pal-trust-setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agencyPaletteId: authPaletteId,
          shopName: a.shopName,
          representativeName: a.representativeName,
          industry: a.industry,
          loginId: a.loginId,
          loginPassword: a.loginPassword,
          priceInitial: a.priceInitial || '',
          priceYen: a.priceYen || '',
          initialFeePaymentMethod: paymentMethodMap[a.initialFeePaymentMethod || ''] || 'square',
          monthlyFeePaymentMethod: paymentMethodMap[a.monthlyFeePaymentMethod || ''] || 'square',
          term: a.term || '',
          dateContract: a.dateContract || '',
          dateDelivery: a.dateDelivery || '',
          initialFeeDueDate: a.initialFeeDueDate || '',
          firstMonthlyDueDate: a.firstMonthlyDueDate || '',
          googleMapUrl: a.googleMapUrl || '',
          adminGoogleMapUrl: a.adminGoogleMapUrl || '',
          surveyQuestions: a.surveyQuestions || '',
          minStarsForGoogle: a.minStarsForGoogle || '4',
          aiReviewTaste: tasteMap[a.aiReviewTaste || ''] || 'friendly',
          themeName: themeMap[a.themeName || ''] || 'standard',
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        appendAiMessage({
          content: `Pal Trust の発注が完了しました！\n\n顧客ID: ${data.paletteId}\nログインID: ${a.loginId}\n店舗名: ${a.shopName}\n\nお客様への案内をお願いします。`,
        });
        setPalTrustOrderStep('done');
      } else {
        appendAiMessage({ content: `発注処理に失敗しました: ${data.error || '不明なエラー'}` });
        setPalTrustOrderStep('hearing');
      }
    } catch {
      appendAiMessage({ content: '発注処理中にエラーが発生しました。再度お試しください。' });
      setPalTrustOrderStep('hearing');
    }
  };

  // ────────────────────────────────────────────────
  // Pal Studio 発注ヒアリング
  // ────────────────────────────────────────────────
  const PAL_STUDIO_HEARING_FIELDS = [
    // ── 共通（契約・請求）──
    { key: 'shopName', label: '店舗名・会社名', required: true, type: 'text' as const },
    { key: 'representativeName', label: '代表者名（担当者名）', required: true, type: 'text' as const },
    { key: 'industry', label: '業種', required: true, type: 'text' as const },
    { key: 'loginId', label: 'ログインID（半角英数字）', required: true, type: 'text' as const },
    { key: 'loginPassword', label: 'ログインパスワード', required: true, type: 'text' as const },
    { key: 'contactEmail', label: '連絡先メールアドレス', required: true, type: 'text' as const },
    { key: 'priceInitial', label: '初期費用（税抜・円）', required: true, type: 'text' as const },
    { key: 'initialFeePaymentMethod', label: '初期費用の支払方法', required: true, type: 'select' as const, options: ['スクエア', '請求書払い'] },
    { key: 'priceYen', label: '月額費用（税抜・円）', required: true, type: 'text' as const },
    { key: 'monthlyFeePaymentMethod', label: '月額費用の支払方法', required: true, type: 'select' as const, options: ['スクエア', '請求書払い'] },
    { key: 'term', label: '契約期間（例: 12ヶ月）', required: true, type: 'text' as const },
    { key: 'dateContract', label: '契約日', required: true, type: 'date' as const },
    { key: 'dateDelivery', label: '納品希望月', required: true, type: 'month' as const },
    { key: 'initialFeeDueDate', label: '初期費用支払予定日', required: true, type: 'date' as const },
    { key: 'firstMonthlyDueDate', label: '初回月額支払予定日', required: true, type: 'date' as const },
    // ── Pal Studio 固有 ──
    { key: 'sitePurpose', label: 'HPの目的', required: true, type: 'select' as const, options: ['新規集客', 'リニューアル', '採用', 'ブランディング', 'その他'] },
    { key: 'sitePurposeOther', label: '└「その他」の場合の内容', required: false, type: 'text' as const },
    { key: 'existingHpUrl', label: '既存HPのURL（あれば）', required: false, type: 'text' as const },
    { key: 'referenceHps', label: '参考HP（複数の場合は改行区切り）', required: true, type: 'textarea' as const },
    { key: 'mainColor', label: 'メインカラー（#000000 または "落ち着いた青" 等）', required: true, type: 'text' as const },
    { key: 'designTaste', label: '希望デザインテイスト', required: true, type: 'select' as const, options: ['シンプル', 'ナチュラル', 'ポップ', '高級感', 'クール', '和風', 'おまかせ'] },
    { key: 'domainPreference', label: '希望ドメイン', required: true, type: 'select' as const, options: ['あり', 'なし', '手配希望'] },
    { key: 'domainName', label: '└「あり」の場合の希望ドメイン', required: false, type: 'text' as const },
    { key: 'desiredDeliveryDate', label: '納品希望日', required: true, type: 'date' as const },
    { key: 'sitemap', label: 'サイトマップ（必要なページ・階層を改行で）', required: true, type: 'textarea' as const },
    { key: 'expectedPageCount', label: '想定ページ数', required: true, type: 'select' as const, options: ['1〜3', '4〜6', '7〜10', '11〜15', '16以上'] },
    { key: 'requiredFeatures', label: '必要機能（あれば）', required: false, type: 'textarea' as const },
    // ファイル添付（参考素材・ロゴなど）
    { key: 'materials', label: '素材ファイル（ロゴ・写真・参考資料／JPG/PNG/WebP/GIF・各12MB以内）', required: false, type: 'file' as const },
  ];

  const startPalStudioOrderHearing = () => {
    setConversationEnded(false);
    setPalStudioOrderStep('hearing');
    setPalStudioOrderAnswers({
      initialFeePaymentMethod: 'スクエア',
      monthlyFeePaymentMethod: 'スクエア',
      designTaste: 'おまかせ',
      domainPreference: '手配希望',
      expectedPageCount: '4〜6',
    });
    setPalStudioOrderFiles([]);
    appendAiMessage({
      content: 'Pal Studio の発注ヒアリングを開始します。\nVIEWに表示されたフォームから入力して「発注する」を押してください。',
    });
  };

  const submitPalStudioOrder = async () => {
    const a = palStudioOrderAnswers;
    const requiredKeys = [
      'shopName', 'representativeName', 'industry', 'loginId', 'loginPassword', 'contactEmail',
      'priceInitial', 'initialFeePaymentMethod', 'priceYen', 'monthlyFeePaymentMethod',
      'term', 'dateContract', 'dateDelivery', 'initialFeeDueDate', 'firstMonthlyDueDate',
      'sitePurpose', 'referenceHps', 'mainColor', 'designTaste',
      'domainPreference', 'desiredDeliveryDate', 'sitemap', 'expectedPageCount',
    ];
    const missing = requiredKeys.find((k) => !a[k]);
    if (missing) {
      appendAiMessage({ content: '必須項目（*マーク）をすべて入力してください。' });
      return;
    }
    if (a.sitePurpose === 'その他' && !a.sitePurposeOther) {
      appendAiMessage({ content: '「HPの目的」で「その他」を選択した場合、内容を入力してください。' });
      return;
    }
    if (a.domainPreference === 'あり' && !a.domainName) {
      appendAiMessage({ content: '「希望ドメイン」が「あり」の場合、ドメイン名を入力してください。' });
      return;
    }
    setPalStudioOrderStep('submitting');
    const tasteMap: Record<string, string> = {
      'シンプル': 'simple', 'ナチュラル': 'natural', 'ポップ': 'pop',
      '高級感': 'premium', 'クール': 'cool', '和風': 'japanese', 'おまかせ': 'random',
    };
    const paymentMethodMap: Record<string, string> = {
      'スクエア': 'square',
      '請求書払い': 'invoice',
    };
    try {
      const formData = new FormData();
      formData.append('agencyPaletteId', authPaletteId || '');
      formData.append('shopName', a.shopName);
      formData.append('representativeName', a.representativeName);
      formData.append('industry', a.industry);
      formData.append('loginId', a.loginId);
      formData.append('loginPassword', a.loginPassword);
      formData.append('contactEmail', a.contactEmail);
      formData.append('priceInitial', a.priceInitial);
      formData.append('priceYen', a.priceYen);
      formData.append('initialFeePaymentMethod', paymentMethodMap[a.initialFeePaymentMethod] || 'square');
      formData.append('monthlyFeePaymentMethod', paymentMethodMap[a.monthlyFeePaymentMethod] || 'square');
      formData.append('term', a.term);
      formData.append('dateContract', a.dateContract);
      formData.append('dateDelivery', a.dateDelivery);
      formData.append('initialFeeDueDate', a.initialFeeDueDate);
      formData.append('firstMonthlyDueDate', a.firstMonthlyDueDate);
      formData.append('sitePurpose', a.sitePurpose === 'その他' ? `その他: ${a.sitePurposeOther}` : a.sitePurpose);
      formData.append('existingHpUrl', a.existingHpUrl || '');
      formData.append('referenceHps', a.referenceHps);
      formData.append('mainColor', a.mainColor);
      formData.append('designTaste', tasteMap[a.designTaste] || 'random');
      formData.append('domainPreference', a.domainPreference);
      formData.append('domainName', a.domainPreference === 'あり' ? (a.domainName || '') : '');
      formData.append('desiredDeliveryDate', a.desiredDeliveryDate);
      formData.append('sitemap', a.sitemap);
      formData.append('expectedPageCount', a.expectedPageCount);
      formData.append('requiredFeatures', a.requiredFeatures || '');
      palStudioOrderFiles.forEach((f) => formData.append('materials', f));

      const res = await fetch('/api/pal-studio-setup', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (res.ok && data.success) {
        appendAiMessage({
          content: `Pal Studio の発注が完了しました！\n\n顧客ID: ${data.paletteId}\nログインID: ${a.loginId}\n店舗名: ${a.shopName}\n\n制作チームに自動通知済みです。`,
        });
        setPalStudioOrderStep('done');
      } else {
        appendAiMessage({ content: `発注処理に失敗しました: ${data.error || '不明なエラー'}` });
        setPalStudioOrderStep('hearing');
      }
    } catch {
      appendAiMessage({ content: '発注処理中にエラーが発生しました。再度お試しください。' });
      setPalStudioOrderStep('hearing');
    }
  };

  const handleActionButtonClick = (button: ActionButton) => {
    if (button.key === 'upload-media') {
      mediaInputRef.current?.click();
      return;
    }
    if (button.key === 'no-media' || button.key === 'media-done') {
      if (activeServiceMode === 'pal_video' && palVideoLiteStep === 'media') {
        // pal_video media ステップを直接完了させる
        const mediaUrls = button.key === 'media-done' ? [...selectedMediaUrls] : [];
        setSelectedMediaUrls([]);
        const userMsg = mediaUrls.length > 0
          ? `以下の画像/ロゴを使用します。\n${mediaUrls.join('\n')}`
          : 'おまかせ（自動選定）';
        const nextMessages: ChatMessage[] = [...messages, { role: 'user' as const, content: userMsg }];
        const nextAnswers = { ...palVideoLiteAnswers, mediaUrls };
        clearMultiPromptState();
        const payload = buildPalVideoPayload(nextMessages);
        nextMessages.push({ role: 'ai' as const, content: buildPalVideoCompletionMessage(payload) });
        const fallbackCards = messages
          .slice().reverse()
          .find((msg) => msg.role === 'ai' && Array.isArray(msg.serviceCards) && msg.serviceCards.length > 0)
          ?.serviceCards || [];
        const cards = authServiceCards.length ? authServiceCards : fallbackCards;
        nextMessages.push({ role: 'ai' as const, content: 'なにかお手伝いできることはありますか？', serviceCards: cards });
        // upsertPalVideoJob は activeServiceMode チェックがあるため、直接 fetch で呼ぶ
        const planCode = String(activeServiceCard?.planCode || 'pal_video_lite');
        fetch('/api/palette-ai/pal-video-job', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            paletteId: resolvedCustomerId,
            planCode,
            status: 'draft',
            payload: {
              title: payload.companyName || payload.telopMain || '新規動画',
              purpose: payload.purpose,
              destination: payload.destination,
              duration: payload.durationSec,
              colorPrimary: payload.colorPrimary || '',
              colorAccent: payload.colorAccent || '',
              bgm: payload.bgm || '',
              style: payload.style || 'standard',
              cuts: [],
              hearingData: {
                companyName: payload.companyName,
                contactInfo: payload.contactInfo,
                appeal: payload.appeal,
                mood: payload.mood,
                imageUrls: payload.imageUrls,
              },
              hearingAnswers: payload.hearingAnswers || [],
              hearingMessages: payload.hearingMessages || [],
            },
          }),
        }).catch((e) => console.error('pal_video job creation failed:', e));
        setActiveServiceMode('none');
        setConversationEnded(false);
        setPalVideoLiteStep('done');
        setPalVideoLiteAnswers(nextAnswers);
        setMessages(nextMessages);
        void saveDraftToLab(nextMessages, 'hearing');
        return;
      }
      const mediaText = button.key === 'media-done' && selectedMediaUrls.length > 0
        ? `以下の画像/ロゴを使用します。\n${selectedMediaUrls.join('\n')}`
        : 'おまかせ（自動選定）';
      setSelectedMediaUrls([]);
      void handleSend(mediaText);
      return;
    }
    if (button.key === 'concierge') {
      void handleConcierge();
      return;
    }
    if (button.key === 'aix-menu') {
      appendAiMessage({
        content: 'Palette AIX メニューです。やりたい操作を選んでください。',
        actionButtons: [
          { key: 'aix-reports', label: '📊 成果レポート' },
          { key: 'aix-embed-code', label: '📋 埋め込みコード' },
          { key: 'aix-contact-setup', label: '⚙️ 設定画面' },
          { key: 'aix-bot-intro', label: '🤖 Botとは？' },
        ],
      });
      return;
    }
    if (button.key === 'aix-bot-intro') {
      appendAiMessage({
        content: `Palette AIX の営業AIチャットBotは、お客様のHPに設置するだけで:\n\n✓ 24時間自動で訪問者と会話\n✓ 悩みをヒアリングして最適なサービスを提案\n✓ 「買う気度」を自動判定（1〜5段階）\n✓ 熱いリードを予約/問い合わせへ誘導\n✓ 会話ログから改善ヒントを取得\n\n設置は</body>直前にscriptタグを1行貼るだけです。`,
      });
      return;
    }
    if (button.key === 'aix-contact-setup') {
      if (typeof window !== 'undefined') {
        window.open('/main/bot-settings', '_blank', 'noopener');
      }
      return;
    }
    if (button.key === 'aix-reports') {
      if (typeof window !== 'undefined') {
        window.open('/main/reports', '_blank', 'noopener');
      }
      return;
    }
    if (button.key === 'aix-embed-code') {
      const origin = typeof window !== 'undefined' ? window.location.origin : 'https://ai.palette-lab.com';
      const code = `<script src="${origin}/widget.js?id=${resolvedCustomerId}" async></script>`;
      appendAiMessage({
        content: `お客様のサイトに以下のコードを</body> 直前に貼り付けてください。\n\n${code}\n\n設置後、訪問者との会話が自動で始まり、管理画面で成果をご確認いただけます。`,
      });
      if (typeof window !== 'undefined' && navigator.clipboard) {
        navigator.clipboard.writeText(code).catch(() => { /* ignore */ });
      }
      return;
    }
    if (button.key === 'marketing-advisor') {
      setActiveServiceMode('marketing_advisor');
      const aiMsg: ChatMessage = {
        role: 'ai',
        content: `${displayCustomerName}様、WEBマーケティングの相談ですね！\n集客・SNS運用・口コミ対策・広告など、なんでもご相談ください。お店の状況に合わせてアドバイスしますね。`,
      };
      setMessages((prev) => [...prev, aiMsg]);
      return;
    }
    if (button.key === 'order_pal_trust') {
      startPalTrustOrderHearing();
      return;
    }
    if (button.key === 'order_pal_studio') {
      startPalStudioOrderHearing();
      return;
    }
    if (button.key?.startsWith('order_') && button.key !== 'order_pal_trust' && button.key !== 'order_pal_studio') {
      appendAiMessage({ content: 'このサービスの発注はまだ準備中です。' });
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
    if (button.key === 'media-library') {
      setShowMediaLibraryPanel((prev) => !prev);
      if (!showMediaLibraryPanel) {
        void loadMediaAssets();
      }
      return;
    }
    if (button.key === 'studio-media-none') {
      setShowMediaLibraryPanel(false);
      setSelectedMediaUrls([]);
      void handleSend('なし');
      return;
    }
    if (button.key === 'studio-media-done') {
      setShowMediaLibraryPanel(false);
      const payload = selectedMediaUrls.length > 0
        ? `以下のロゴ/画像を使用します。\n${selectedMediaUrls.join('\n')}`
        : '完了';
      setSelectedMediaUrls([]);
      void handleSend(payload);
      return;
    }
    if (button.key === 'news-post') {
      appendAiMessage({ content: 'ニュース投稿機能はこの先実装予定です。' });
      return;
    }
    if (button.key === 'blog-post') {
      setBlogStep('askTopic');
      setBlogDraft(EMPTY_BLOG_DRAFT);
      appendAiMessage({ content: 'ブログ投稿を始めます。\nどんなテーマで書きますか？（例：春のヘアスタイル、新メニューのご紹介）' });
      return;
    }
    if (button.key === 'blog-publish-confirm') {
      void handleBlogPublish();
      return;
    }
    if (button.key === 'blog-revise') {
      setBlogStep('askTopic');
      setBlogDraft(EMPTY_BLOG_DRAFT);
      appendAiMessage({ content: '最初からやり直します。\nどんなテーマで書きますか？' });
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
          const paletteId = rawText.trim();
          if (!paletteId) {
            setMessages([
              ...updatedMessages,
              { role: 'ai', content: 'ログインIDを入力してください。' },
            ]);
            return;
          }

          const checkRes = await fetch(`/api/chat-auth/check-id?paletteId=${encodeURIComponent(paletteId)}`);
          const checkData = await checkRes.json().catch(() => ({}));
          if (!checkRes.ok || !checkData?.success || !checkData?.exists) {
            setMessages([
              ...updatedMessages,
              { role: 'ai', content: `ログインID ${paletteId} が見つかりませんでした。もう一度入力してください。` },
            ]);
            return;
          }

          setAuthPaletteId(paletteId);
          setAuthStep('askPassword');
          setMessages([
            ...updatedMessages,
            { role: 'ai', content: `ログインID ${paletteId} を確認しました。続けてパスワードを入力してください。` },
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
        const agencyFlag = verifyData?.hasAgency === true;
        setHasAgency(agencyFlag);
        const customerName = normalizeCustomerName(String(verifyData?.accountName || verifyData?.customerName || ''));
        setAuthCustomerName(customerName || '');
        const industry = String(verifyData?.summary?.account?.industry || '');
        setAuthIndustry(industry);
        setMessages([
          ...updatedMessages,
          {
            role: 'ai',
            content: `${customerName || 'お客様'}様ですね！ 認証が完了しました。\nなにをお手伝いしますか？`,
            serviceCards: Array.isArray(verifyData?.serviceCards) ? verifyData.serviceCards : [],
            showOrderButton: agencyFlag,
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

    // Blog flow intercept (takes priority, step driven)
    if (
      activeServiceMode === 'pal_studio' &&
      blogStep !== 'idle' && blogStep !== 'generating' &&
      blogStep !== 'preview' && blogStep !== 'publishing' && blogStep !== 'done'
    ) {
      setIsLoading(true);
      try {
        await handleBlogFlowInput(messageToSend);
      } finally {
        setIsLoading(false);
      }
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

    // Marketing advisor mode: intercept and call dedicated API
    if (activeServiceMode === 'marketing_advisor') {
      const userMessage: ChatMessage = { role: 'user', content: messageToSend };
      const updatedMsgs = [...messages, userMessage];
      setMessages(updatedMsgs);
      setInputText('');
      setIsLoading(true);
      try {
        const advisorHistory = updatedMsgs
          .filter((m) => m.role === 'user' || m.role === 'ai')
          .slice(-6)
          .map((m) => ({ role: m.role, content: String(m.content).slice(0, 500) }));
        const res = await fetch('/api/marketing-advisor', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            paletteId: resolvedCustomerId,
            message: messageToSend,
            history: advisorHistory,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data?.success) {
          setMessages((prev) => [...prev, { role: 'ai', content: data.text || 'アドバイスを生成できませんでした。' }]);
        } else {
          setMessages((prev) => [...prev, { role: 'ai', content: data?.error || '相談中にエラーが発生しました。' }]);
        }
      } catch {
        setMessages((prev) => [...prev, { role: 'ai', content: '接続エラーです。' }]);
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
    setInputText("");
    setIsLoading(true);

    // 共通ルールは /api/chat/route.ts の systemInstruction に一本化。
    // ここでは顧客名などの動的ヒントだけを追加で渡す。
    if (activeServiceMode === 'pal_video') {
      const nextMessages: ChatMessage[] = [...updatedMessages];
      const nextAnswers = { ...palVideoLiteAnswers };
      let nextStep = palVideoLiteStep;

      const pushAi = (content: string, actionButtons?: ActionButton[]) => {
        nextMessages.push({ role: 'ai', content, actionButtons });
      };

      if (palVideoLiteStep === 'companyName') {
        nextAnswers.companyName = messageToSend.trim();
        nextStep = 'contactInfo';
        pushAi('動画の最後に表示するお問い合わせ先を教えてください。\n（URL、電話番号、LINE ID など）');
        applyStudioPrompt(
          ['お問い合わせ先を入力してください'],
          [['https://example.com', '03-1234-5678', '@line_id', 'info@example.com']],
          ['single'],
          ['text'],
        );
      } else if (palVideoLiteStep === 'contactInfo') {
        nextAnswers.contactInfo = messageToSend.trim();
        nextStep = 'purpose';
        pushAi('どんな動画を作りたいですか？');
        applyStudioPrompt(['どんな動画を作りたいですか？'], [PAL_VIDEO_PURPOSE_OPTIONS], ['single']);
      } else if (palVideoLiteStep === 'purpose') {
        nextAnswers.purpose = messageToSend.trim();
        nextStep = 'destination';
        pushAi('どこに投稿しますか？');
        applyStudioPrompt(['どこに投稿しますか？'], [PAL_VIDEO_DESTINATION_OPTIONS], ['single']);
      } else if (palVideoLiteStep === 'destination') {
        nextAnswers.destination = messageToSend.trim();
        nextStep = 'duration';
        pushAi('何秒の動画がいいですか？');
        applyStudioPrompt(['何秒の動画がいいですか？'], [PAL_VIDEO_LITE_DURATION_OPTIONS], ['single']);
      } else if (palVideoLiteStep === 'duration') {
        nextAnswers.duration = messageToSend.trim();
        nextStep = 'appeal';
        pushAi('お店・サービスの一番のウリ・強みを教えてください。');
        applyStudioPrompt(
          ['ウリ・強みを入力してください（例を参考にどうぞ）'],
          [['国産素材100%の無添加スキンケア', '月額980円で始められるAI営業支援', '創業50年の信頼と実績', '完全予約制のプライベートサロン']],
          ['single'],
          ['text'],
        );
      } else if (palVideoLiteStep === 'appeal') {
        nextAnswers.appeal = messageToSend.trim();
        nextStep = 'mood';
        pushAi('どんな雰囲気の動画にしたいですか？');
        applyStudioPrompt(['どんな雰囲気の動画にしたいですか？'], [PAL_VIDEO_MOOD_OPTIONS], ['single']);
      } else if (palVideoLiteStep === 'mood') {
        nextAnswers.mood = messageToSend.trim();
        nextStep = 'media';
        clearMultiPromptState();
        pushAi('使いたい写真やロゴはありますか？\n（あればアップロードしてください。なければ「おまかせ」で自動選定します）', PAL_VIDEO_LITE_MEDIA_BUTTONS);
      } else if (palVideoLiteStep === 'media') {
        const urlsFromText = extractUrls(messageToSend);
        const urls = Array.from(new Set([...selectedMediaUrls, ...urlsFromText]));
        nextAnswers.mediaUrls = urls;
        setSelectedMediaUrls([]);
        nextStep = 'done';
        clearMultiPromptState();
        const payload = buildPalVideoPayload(nextMessages);
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
        // ジョブ作成はモードリセット前に実行（activeServiceMode が 'pal_video' のうちに）
        void upsertPalVideoJob(nextMessages);
        setActiveServiceMode('none');
        setConversationEnded(false);
      }

      setPalVideoLiteStep(nextStep);
      setPalVideoLiteAnswers(nextAnswers);
      setMessages(nextMessages);
      void saveDraftToLab(nextMessages, 'hearing');
      setIsLoading(false);
      return;
    }

    await saveDraftToLab(updatedMessages, 'hearing');

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

    const isPalVideoMode = false; // pal_video はステップフローで処理済み（ここには到達しない）
    const fieldOrder = isPalVideoMode
      ? ['会社名', '問い合わせ先', '用途', '投稿先', '秒数', 'ウリ', '雰囲気', '素材']
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
      ? [
            { label: '会社名', pattern: /(会社名|サービス名|店名|ブランド名)/i },
            { label: '問い合わせ先', pattern: /(問い合わせ|連絡先|URL|電話|LINE)/i },
            { label: '用途', pattern: /(用途|コンテンツの目的|プロモーション|sns投稿|sns広告|口コミ|実績)/i },
            { label: '投稿先', pattern: /(投稿先|プラットフォーム|掲載先|instagram|インスタ|youtube|tiktok)/i },
            { label: '秒数', pattern: /(尺|秒|時間|長さ|動画の長さ)/i },
            { label: 'ウリ', pattern: /(ウリ|強み|特長|アピール)/i },
            { label: '雰囲気', pattern: /(雰囲気|イメージ|トーン|おしゃれ|元気|信頼|ナチュラル|クール)/i },
            { label: '素材', pattern: /(素材|画像|写真|ロゴ|動画素材|アップロード)/i },
          ]
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
        // Marketing advisor trigger from chat API
        if (String(data.text || '') === '__MARKETING_ADVISOR__') {
          setActiveServiceMode('marketing_advisor');
          // Re-send the original message through the advisor API
          try {
            const advisorHistory = updatedMessages
              .slice(-6)
              .map((m: any) => ({ role: m.role, content: String(m.content).slice(0, 500) }));
            const advisorRes = await fetch('/api/marketing-advisor', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                paletteId: resolvedCustomerId,
                message: messageToSend,
                history: advisorHistory,
              }),
            });
            const advisorData = await advisorRes.json().catch(() => ({}));
            if (advisorRes.ok && advisorData?.success) {
              setMessages((prev) => [...prev, { role: 'ai', content: advisorData.text || 'アドバイスを生成できませんでした。' }]);
            } else {
              setMessages((prev) => [...prev, { role: 'ai', content: advisorData?.error || '相談中にエラーが発生しました。' }]);
            }
          } catch {
            setMessages((prev) => [...prev, { role: 'ai', content: '接続エラーです。' }]);
          } finally {
            setIsLoading(false);
          }
          return;
        }
        // Concierge trigger from chat API
        if (String(data.text || '') === '__CONCIERGE__') {
          setIsLoading(false);
          void handleConcierge();
          return;
        }
        const aiRawText = trimSecurityRefusalMessage(String(data.text || ''));
        const aiText = normalizeAssistantOutput(aiRawText);
        const isPalVideoLiteMode = false; // pal_video はステップフローで処理済み
        const isPalVideoCompletion = isPalVideoLiteMode && /(制作に必要な情報|確認事項は以上|制作を開始します|制作します)/.test(aiText);
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
            aiMessage.actionButtons = PAL_VIDEO_LITE_MEDIA_BUTTONS;
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
    setNeutralActionButtons([
      { key: 'contract-services', label: '契約サービス' },
      { key: 'media-library', label: 'メディア' },
    ]);
    clearMultiPromptState();
    setShowMediaLibraryPanel(false);
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

    // 各項目の回答を取得
    const answers = multiPromptItems.map((item, index) => {
      const mode = multiPromptModes[index] || 'text';
      const selectionKind = multiPromptSelectionKinds[index] || 'single';
      return mode === 'select'
        ? (selectionKind === 'multi'
          ? (multiPromptSelectedMulti[index] || []).join('、').trim()
          : String(multiPromptSelected[index] || '').trim())
        : String(multiPromptAnswers[index] || '').trim();
    });

    const filled = answers
      .map((answer, index) => {
        if (!answer) return '';
        return `${index + 1}. ${multiPromptItems[index]}\n→ ${answer}`;
      })
      .filter(Boolean);

    if (!filled.length) {
      return;
    }

    const merged = filled.join('\n\n');
    const isStudioFlow = activeServiceMode === 'pal_studio' && studioStep !== 'idle' && studioStep !== 'completed';
    const isStructuredFlow = isStudioFlow || activeServiceMode === 'pal_video';
    setIsSubmittingMultiPrompt(true);
    try {
      await handleSend(merged);
      setQuickQuestionButtons([]);
      if (!isStructuredFlow) {
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
    const isStructuredFlow = isStudioFlow || activeServiceMode === 'pal_video';
    setIsSubmittingMultiPrompt(true);
    try {
      await handleSend(answer);
      setQuickQuestionButtons([]);
      if (!isStructuredFlow) {
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
  const isBlogWaitingForAction = blogStep === 'preview' || blogStep === 'generating' || blogStep === 'publishing';
  const isMainInputDisabled = conversationEnded || isSelectionOnlyStage || isBlogWaitingForAction;
  const isPalVideoMediaStep = activeServiceMode === 'pal_video' && palVideoLiteStep === 'media';
  const isStudioHearingStep = activeServiceMode === 'pal_studio'
    && !conversationEnded
    && !isSelectionOnlyStage
    && studioStep !== 'idle'
    && studioStep !== 'completed';
  const imageAssets = mediaAssets.filter((asset) => String(asset.mimeType || '').startsWith('image/'));
  const mediaButton: ActionButton = { key: 'media-library', label: 'メディア' };
  const conciergeButton: ActionButton = { key: 'concierge', label: '状況チェック' };
  const advisorButton: ActionButton = { key: 'marketing-advisor', label: '運用相談' };
  const aixButton: ActionButton = { key: 'aix-menu', label: 'AIX メニュー' };
  const hasAixPlan = authServiceCards.some((c) => c.key === 'palette_aix');
  const mergedNeutralButtons = authStep === 'authenticated'
    ? (neutralActionButtons.some((button) => button.key === 'media-library')
      ? neutralActionButtons
      : [
          ...neutralActionButtons,
          ...(hasAixPlan ? [aixButton] : []),
          conciergeButton,
          advisorButton,
          mediaButton,
        ])
    : neutralActionButtons;
  return (
    <div className="fixed inset-0 w-full h-[100dvh] flex items-start md:items-center justify-start md:justify-center p-0 md:p-8 overflow-hidden bg-slate-50 touch-auto md:touch-none">
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none -z-10 overflow-hidden">
        <div className="absolute w-[500px] h-[500px] bg-pink-400/10 blur-[120px] rounded-full -top-20 -left-20 animate-pulse" />
        <div className="absolute w-[600px] h-[600px] bg-cyan-400/10 blur-[150px] rounded-full -bottom-20 -right-20 animate-pulse" style={{ animationDelay: '-5s' }} />
      </div>

      <div className="w-full max-w-[1300px] h-full md:h-[90vh] bg-white/40 md:backdrop-blur-[30px] md:rounded-[60px] shadow-neu-flat flex flex-col md:flex-row border-none md:border md:border-white/60 overflow-hidden relative">
        <div className="absolute top-2 left-2 right-2 md:hidden flex items-center justify-between bg-white/45 backdrop-blur-sm px-2 py-1 rounded-full border border-white/60 z-50">
          <div className="flex items-center gap-1">
            <span className="text-[11px] font-black text-slate-500 px-2">P</span>
            {authStep === 'authenticated' && (
              <>
                <button onClick={handleNewSession} className="w-6 h-6 rounded-lg flex items-center justify-center text-slate-400 hover:text-indigo-500">
                  <Plus className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => { setShowSessionList((v) => !v); void loadChatSessions(resolvedCustomerId); }} className="w-6 h-6 rounded-lg flex items-center justify-center text-slate-400 hover:text-indigo-500">
                  <History className="w-3.5 h-3.5" />
                </button>
              </>
            )}
          </div>
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
            {authStep === 'authenticated' && (
              <div className="relative flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleNewSession}
                  title="新しい会話"
                  className="w-8 h-8 rounded-xl bg-white/80 border border-white shadow-neu-flat flex items-center justify-center text-slate-400 hover:text-indigo-500 hover:-translate-y-0.5 transition-all duration-300"
                >
                  <Plus className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => { setShowSessionList((v) => !v); void loadChatSessions(resolvedCustomerId); }}
                  title="会話履歴"
                  className="w-8 h-8 rounded-xl bg-white/80 border border-white shadow-neu-flat flex items-center justify-center text-slate-400 hover:text-indigo-500 hover:-translate-y-0.5 transition-all duration-300"
                >
                  <History className="w-4 h-4" />
                </button>
                {showSessionList && (
                  <div className="absolute right-0 top-10 w-72 max-h-80 overflow-y-auto bg-white/95 backdrop-blur-xl rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.12)] border border-white/60 z-50 p-2">
                    <div className="px-2 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">会話履歴</div>
                    {chatSessions.length === 0 && (
                      <div className="px-3 py-4 text-xs text-slate-400 text-center">履歴はありません</div>
                    )}
                    {chatSessions.map((session) => (
                      <button
                        key={session.id}
                        type="button"
                        onClick={() => handleLoadSession(session.id)}
                        className={`w-full text-left px-3 py-2.5 rounded-xl text-xs hover:bg-indigo-50 transition-colors group flex items-start justify-between gap-2 ${session.id === chatSessionId ? 'bg-indigo-50/60 ring-1 ring-indigo-200' : ''}`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-slate-700 truncate">{session.title || '(無題)'}</div>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            {new Date(session.updatedAt).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            {session.serviceMode !== 'none' && (
                              <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-slate-100 text-[9px] font-bold">{session.serviceMode.replace('pal_', '')}</span>
                            )}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteSession(session.id, e)}
                          className="opacity-0 group-hover:opacity-100 w-6 h-6 rounded-lg flex items-center justify-center text-slate-300 hover:text-red-400 hover:bg-red-50 transition-all shrink-0"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
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
                      {msg.role === 'ai' && msg.showOrderButton && (
                        <div className="mt-3">
                          <button
                            type="button"
                            onClick={handleOrderButtonClick}
                            className="group relative w-full text-left p-4 rounded-[24px] border-2 border-dashed border-indigo-300 bg-indigo-50/40 backdrop-blur-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgba(79,70,229,0.15)] hover:bg-indigo-50/80 hover:border-indigo-400 hover:-translate-y-1 transition-all duration-300 overflow-hidden"
                          >
                            <div className="relative z-10 flex items-center gap-3">
                              <div className="w-10 h-10 rounded-2xl bg-indigo-100 flex items-center justify-center text-lg">+</div>
                              <div>
                                <div className="text-[13px] font-bold text-indigo-700 tracking-tight">新規発注</div>
                                <div className="text-[11px] font-medium text-indigo-400 mt-0.5">お客様のサービスを新しく発注します</div>
                              </div>
                            </div>
                          </button>
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
                      {msg.role === 'ai' && Array.isArray(msg.conciergeActions) && msg.conciergeActions.length > 0 && (
                        <div className="mt-3 space-y-2">
                          {msg.conciergeActions.map((action, ai) => {
                            const colorMap = {
                              high: { bg: 'bg-red-50/80', border: 'border-red-200', text: 'text-red-700', badge: 'bg-red-100 text-red-600', icon: <AlertTriangle className="w-3.5 h-3.5 text-red-500" /> },
                              medium: { bg: 'bg-amber-50/80', border: 'border-amber-200', text: 'text-amber-700', badge: 'bg-amber-100 text-amber-600', icon: <Zap className="w-3.5 h-3.5 text-amber-500" /> },
                              low: { bg: 'bg-blue-50/80', border: 'border-blue-200', text: 'text-blue-700', badge: 'bg-blue-100 text-blue-600', icon: <Info className="w-3.5 h-3.5 text-blue-500" /> },
                            };
                            const colors = colorMap[action.priority] || colorMap.low;
                            return (
                              <div
                                key={`concierge-${ai}`}
                                className={`p-3 rounded-2xl border ${colors.bg} ${colors.border} transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md`}
                              >
                                <div className="flex items-start gap-2.5">
                                  <div className="mt-0.5 shrink-0">{colors.icon}</div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span className={`text-[12px] font-bold ${colors.text}`}>{action.title}</span>
                                      <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${colors.badge}`}>{action.service.replace('pal_', '')}</span>
                                    </div>
                                    <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">{action.description}</p>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                      {msg.role === 'ai' && Array.isArray(msg.progressCards) && msg.progressCards.length > 0 && (
                        <div className="mt-3 space-y-2">
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">サービス進捗</div>
                          {msg.progressCards.map((card, pi) => {
                            const healthColor = card.health === 'red'
                              ? 'bg-red-400'
                              : card.health === 'yellow'
                                ? 'bg-amber-400'
                                : 'bg-emerald-400';
                            return (
                              <div
                                key={`progress-${pi}`}
                                className="p-3 rounded-2xl border border-white bg-white/50 shadow-[0_4px_12px_rgba(0,0,0,0.03)] hover:-translate-y-0.5 transition-all duration-300"
                              >
                                <div className="flex items-center gap-2.5">
                                  <div className={`w-2 h-2 rounded-full ${healthColor} shrink-0`} />
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span className="text-[12px] font-bold text-slate-700">{card.label}</span>
                                      <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-slate-100 text-slate-500">{card.status}</span>
                                    </div>
                                    <p className="text-[10px] text-slate-400 mt-0.5">{card.detail}</p>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
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
            {studioGenerateProgress > 0 && (
              <div className="px-6 py-3">
                <div className="flex items-center gap-3 mb-2">
                  <Sparkles className="w-4 h-4 text-indigo-500 animate-pulse" />
                  <span className="text-xs font-bold text-slate-500">モデルページ制作中...</span>
                  <span className="text-xs font-black text-indigo-600 ml-auto">{studioGenerateProgress}%</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-fuchsia-500 transition-all duration-200"
                    style={{ width: `${studioGenerateProgress}%` }}
                  />
                </div>
              </div>
            )}
            <div ref={scrollEndRef} />
          </main>

          <div className="mt-auto pt-3 pb-2 md:pb-0 shrink-0 sticky bottom-0 z-20 bg-white/35 backdrop-blur-md rounded-t-2xl md:bg-transparent md:backdrop-blur-0 md:rounded-none" style={{ paddingBottom: isMobileViewport ? 'calc(0.5rem + env(safe-area-inset-bottom, 0px))' : undefined }}>
            {showMediaLibraryPanel && authStep === 'authenticated' && (
              <div
                className={`mb-3 rounded-[24px] border bg-white/60 backdrop-blur-xl p-3 shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-colors ${isDragOver ? 'border-indigo-300 bg-indigo-50/40' : 'border-white'}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Media Library</div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => loadMediaAssets()}
                      disabled={!canUseMedia || mediaLoading}
                      className="px-2.5 py-1 rounded-full text-[10px] font-black border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-50"
                    >
                      更新
                    </button>
                    <button
                      type="button"
                      onClick={() => mediaInputRef.current?.click()}
                      disabled={!canUseMedia || isUploadingMedia}
                      className="px-2.5 py-1 rounded-full text-[10px] font-black text-white bg-gradient-to-r from-indigo-500 to-fuchsia-500 shadow-[0_8px_16px_rgba(79,70,229,0.24)] hover:from-indigo-400 hover:to-fuchsia-400 disabled:opacity-50"
                    >
                      {isUploadingMedia ? 'アップロード中' : 'アップロード'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowMediaLibraryPanel(false)}
                      className="px-2.5 py-1 rounded-full text-[10px] font-black border border-slate-200 text-slate-500 bg-white hover:bg-slate-50"
                    >
                      閉じる
                    </button>
                  </div>
                </div>

                {isUploadingMedia && (
                  <div className="mb-2">
                    <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-fuchsia-500 transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1">{uploadProgress}% アップロード中...</div>
                  </div>
                )}

                {isDragOver && (
                  <div className="mb-2 py-6 rounded-2xl border-2 border-dashed border-indigo-300 bg-indigo-50/30 flex flex-col items-center justify-center gap-1">
                    <Upload className="w-6 h-6 text-indigo-400" />
                    <div className="text-[11px] font-bold text-indigo-500">ここにドロップしてアップロード</div>
                  </div>
                )}

                {!canUseMedia && (
                  <div className="text-[11px] text-slate-400">ログイン後に利用できます。</div>
                )}

                {canUseMedia && mediaLoading && (
                  <div className="text-[11px] text-slate-400">読み込み中...</div>
                )}

                {canUseMedia && !mediaLoading && mediaError && (
                  <div className="text-[11px] text-red-500 whitespace-pre-line">{mediaError}</div>
                )}

                {canUseMedia && !mediaLoading && !mediaError && mediaAssets.length === 0 && !isDragOver && (
                  <div className="py-4 rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-1">
                    <Upload className="w-5 h-5 text-slate-300" />
                    <div className="text-[11px] text-slate-400">画像や動画をドラッグ&ドロップ、またはアップロードボタンで追加</div>
                  </div>
                )}

                {canUseMedia && !mediaLoading && mediaAssets.length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    {mediaAssets.map((asset) => {
                      const isVideo = String(asset.mimeType || '').startsWith('video/');
                      const isSelected = selectedMediaUrls.includes(String(asset.url || ''));
                      return (
                        <div key={asset.id} className={`group relative rounded-xl border bg-white/80 shadow-[0_6px_16px_rgba(15,23,42,0.08)] overflow-hidden ${isSelected ? 'border-indigo-300 ring-2 ring-indigo-200' : 'border-white'}`}>
                          <button
                            type="button"
                            onClick={() => handleMediaSelect(asset)}
                            className="relative w-full aspect-[4/3] flex items-center justify-center bg-slate-100/60"
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
                            {isSelected && (
                              <span className="absolute top-2 left-2 text-[10px] font-black px-2 py-0.5 rounded-full bg-indigo-600 text-white shadow">選択中</span>
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
            )}

            {isPalVideoMediaStep && authStep === 'authenticated' && !conversationEnded && (
              <div className="mb-3 rounded-[24px] border border-white bg-white/55 backdrop-blur-xl p-3 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-[11px] font-black text-slate-500 uppercase tracking-widest">メディアアップロード</div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => loadMediaAssets()}
                      disabled={!canUseMedia || mediaLoading}
                      className="px-2.5 py-1 rounded-full text-[10px] font-black border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-50"
                    >
                      更新
                    </button>
                    <button
                      type="button"
                      onClick={() => mediaInputRef.current?.click()}
                      disabled={!canUseMedia || isUploadingMedia}
                      className="px-2.5 py-1 rounded-full text-[10px] font-black text-white bg-gradient-to-r from-indigo-500 to-fuchsia-500 shadow-[0_8px_16px_rgba(79,70,229,0.24)] hover:from-indigo-400 hover:to-fuchsia-400 disabled:opacity-50"
                    >
                      {isUploadingMedia ? 'アップロード中' : 'アップロード'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleActionButtonClick({ key: 'media-done', label: '完了' })}
                      disabled={!canUseMedia}
                      className="px-2.5 py-1 rounded-full text-[10px] font-black border border-indigo-200 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 disabled:opacity-50"
                    >
                      完了
                    </button>
                    <button
                      type="button"
                      onClick={() => handleActionButtonClick({ key: 'no-media', label: 'なし' })}
                      disabled={!canUseMedia}
                      className="px-2.5 py-1 rounded-full text-[10px] font-black border border-slate-200 text-slate-500 bg-white hover:bg-slate-50 disabled:opacity-50"
                    >
                      なし
                    </button>
                  </div>
                </div>

                {!canUseMedia && (
                  <div className="text-[11px] text-slate-400">ログイン後に利用できます。</div>
                )}

                {canUseMedia && mediaLoading && (
                  <div className="text-[11px] text-slate-400">読み込み中...</div>
                )}

                {canUseMedia && !mediaLoading && mediaError && (
                  <div className="text-[11px] text-red-500">{mediaError}</div>
                )}

                {canUseMedia && !mediaLoading && !mediaError && imageAssets.length === 0 && (
                  <div className="text-[11px] text-slate-400">まだメディアがありません。</div>
                )}

                {canUseMedia && !mediaLoading && imageAssets.length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    {imageAssets.map((asset) => {
                      const isSelected = selectedMediaUrls.includes(String(asset.url || ''));
                      return (
                        <button
                          key={asset.id}
                          type="button"
                          onClick={() => handleMediaSelect(asset)}
                          className={`group relative rounded-xl border bg-white/80 shadow-[0_6px_16px_rgba(15,23,42,0.08)] overflow-hidden ${isSelected ? 'border-indigo-300 ring-2 ring-indigo-200' : 'border-white'}`}
                        >
                          <div className="aspect-[4/3] bg-slate-100">
                            <img
                              src={asset.url}
                              alt={asset.originalName || 'media'}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          {isSelected && (
                            <span className="absolute top-1 left-1 text-[9px] font-black px-2 py-0.5 rounded-full bg-indigo-600 text-white shadow">選択中</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

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

            {mergedNeutralButtons.length > 0 && authStep === 'authenticated' && (
              <div className="mb-2 flex items-center justify-end gap-2 px-1">
                {mergedNeutralButtons.map((button) => (
                  <button
                    key={button.key}
                    type="button"
                    onClick={() => handleActionButtonClick(button)}
                    className={button.key === 'aix-menu'
                      ? "px-2.5 py-1 rounded-full text-[10px] font-black tracking-wide text-white bg-gradient-to-r from-fuchsia-500 via-pink-500 to-orange-400 shadow-[0_8px_18px_rgba(236,72,153,0.35)] hover:-translate-y-0.5 transition-all duration-300 ring-1 ring-white/40"
                      : "px-2.5 py-1 rounded-full text-[10px] font-black tracking-wide text-white bg-gradient-to-r from-indigo-500 to-cyan-500 shadow-[0_8px_18px_rgba(59,130,246,0.28)] hover:from-indigo-400 hover:to-cyan-400 hover:-translate-y-0.5 transition-all duration-300"}
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
                  placeholder={isSelectionOnlyStage ? '上の選択ボタンから回答してください。' : authStep === 'askId' ? 'ログインIDを入力...' : authStep === 'askPassword' ? 'パスワードを入力...' : '回答を入力...'} 
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
            <input
              ref={mediaInputRef}
              type="file"
              accept="image/*,video/*"
              multiple
              onChange={handleMediaFileChange}
              className="hidden"
            />
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
              ) : palTrustOrderStep === 'hearing' || palTrustOrderStep === 'submitting' ? (
                <div className="h-full overflow-y-auto p-6">
                  <div className="mb-5">
                    <h3 className="text-sm font-black text-slate-700 tracking-tight">Pal Trust 発注ヒアリング</h3>
                    <p className="text-[10px] text-slate-400 mt-1">各項目を入力して「発注する」を押してください</p>
                  </div>
                  <div className="space-y-4">
                    {PAL_TRUST_HEARING_FIELDS.map((field) => (
                      <div key={field.key}>
                        <label className="block text-[11px] font-bold text-slate-500 mb-1">
                          {field.label}{field.required && <span className="text-red-400 ml-0.5">*</span>}
                        </label>
                        {field.type === 'select' && field.options ? (
                          <div className="flex flex-wrap gap-1.5">
                            {field.options.map((opt) => (
                              <button
                                key={opt}
                                type="button"
                                onClick={() => setPalTrustOrderAnswers((prev) => ({ ...prev, [field.key]: opt }))}
                                className={`px-3 py-1.5 rounded-full text-[11px] font-bold border transition-all ${
                                  palTrustOrderAnswers[field.key] === opt
                                    ? 'bg-indigo-50 border-indigo-300 text-indigo-700 shadow-sm'
                                    : 'bg-white/80 border-slate-200 text-slate-500 hover:bg-white'
                                }`}
                              >
                                {opt}
                              </button>
                            ))}
                          </div>
                        ) : field.type === 'textarea' ? (
                          <textarea
                            value={palTrustOrderAnswers[field.key] || ''}
                            onChange={(e) => setPalTrustOrderAnswers((prev) => ({ ...prev, [field.key]: e.target.value }))}
                            placeholder={field.required ? '必須' : '任意（スキップ可）'}
                            rows={3}
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white/90 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-indigo-200 resize-none"
                          />
                        ) : (
                          <input
                            type={field.type === 'date' ? 'date' : field.type === 'month' ? 'month' : 'text'}
                            value={palTrustOrderAnswers[field.key] || ''}
                            onChange={(e) => setPalTrustOrderAnswers((prev) => ({ ...prev, [field.key]: e.target.value }))}
                            placeholder={field.required ? '必須' : '任意（スキップ可）'}
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white/90 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-indigo-200"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="mt-6 flex justify-center">
                    <button
                      type="button"
                      onClick={submitPalTrustOrder}
                      disabled={palTrustOrderStep === 'submitting'}
                      className="px-8 py-3 rounded-2xl bg-gradient-to-r from-indigo-500 to-cyan-500 text-white text-sm font-black shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-60"
                    >
                      {palTrustOrderStep === 'submitting' ? '発注処理中...' : '発注する'}
                    </button>
                  </div>
                </div>
              ) : palStudioOrderStep === 'hearing' || palStudioOrderStep === 'submitting' ? (
                <div className="h-full overflow-y-auto p-6">
                  <div className="mb-5">
                    <h3 className="text-sm font-black text-slate-700 tracking-tight">Pal Studio 発注ヒアリング</h3>
                    <p className="text-[10px] text-slate-400 mt-1">各項目を入力して「発注する」を押してください（プランは Standard で登録されます）</p>
                  </div>
                  <div className="space-y-4">
                    {PAL_STUDIO_HEARING_FIELDS.map((field) => {
                      // 条件付き表示: HP の目的=その他 のときのみ sitePurposeOther、希望ドメイン=あり のときのみ domainName
                      if (field.key === 'sitePurposeOther' && palStudioOrderAnswers.sitePurpose !== 'その他') return null;
                      if (field.key === 'domainName' && palStudioOrderAnswers.domainPreference !== 'あり') return null;
                      return (
                        <div key={field.key}>
                          <label className="block text-[11px] font-bold text-slate-500 mb-1">
                            {field.label}{field.required && <span className="text-red-400 ml-0.5">*</span>}
                          </label>
                          {field.type === 'select' && (field as any).options ? (
                            <div className="flex flex-wrap gap-1.5">
                              {(field as any).options.map((opt: string) => (
                                <button
                                  key={opt}
                                  type="button"
                                  onClick={() => setPalStudioOrderAnswers((prev) => ({ ...prev, [field.key]: opt }))}
                                  className={`px-3 py-1.5 rounded-full text-[11px] font-bold border transition-all ${
                                    palStudioOrderAnswers[field.key] === opt
                                      ? 'bg-indigo-50 border-indigo-300 text-indigo-700 shadow-sm'
                                      : 'bg-white/80 border-slate-200 text-slate-500 hover:bg-white'
                                  }`}
                                >
                                  {opt}
                                </button>
                              ))}
                            </div>
                          ) : field.type === 'textarea' ? (
                            <textarea
                              value={palStudioOrderAnswers[field.key] || ''}
                              onChange={(e) => setPalStudioOrderAnswers((prev) => ({ ...prev, [field.key]: e.target.value }))}
                              placeholder={field.required ? '必須' : '任意（スキップ可）'}
                              rows={3}
                              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white/90 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-indigo-200 resize-none"
                            />
                          ) : field.type === 'file' ? (
                            <div className="space-y-2">
                              <input
                                type="file"
                                multiple
                                accept="image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif"
                                onChange={(e) => {
                                  const files = Array.from(e.target.files || []);
                                  setPalStudioOrderFiles((prev) => [...prev, ...files]);
                                }}
                                className="w-full text-xs text-slate-600 file:mr-3 file:px-3 file:py-1.5 file:rounded-full file:border-0 file:bg-indigo-50 file:text-indigo-700 file:text-[11px] file:font-bold hover:file:bg-indigo-100"
                              />
                              {palStudioOrderFiles.length > 0 && (
                                <div className="space-y-1">
                                  {palStudioOrderFiles.map((f, i) => (
                                    <div key={i} className="flex items-center justify-between text-[11px] text-slate-600 bg-slate-50 rounded px-2 py-1">
                                      <span className="truncate flex-1">{f.name} ({Math.round(f.size / 1024)} KB)</span>
                                      <button
                                        type="button"
                                        onClick={() => setPalStudioOrderFiles((prev) => prev.filter((_, j) => j !== i))}
                                        className="ml-2 text-red-400 hover:text-red-600"
                                      >
                                        ×
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ) : (
                            <input
                              type={field.type === 'date' ? 'date' : field.type === 'month' ? 'month' : 'text'}
                              value={palStudioOrderAnswers[field.key] || ''}
                              onChange={(e) => setPalStudioOrderAnswers((prev) => ({ ...prev, [field.key]: e.target.value }))}
                              placeholder={field.required ? '必須' : '任意（スキップ可）'}
                              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white/90 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-indigo-200"
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-6 flex justify-center">
                    <button
                      type="button"
                      onClick={submitPalStudioOrder}
                      disabled={palStudioOrderStep === 'submitting'}
                      className="px-8 py-3 rounded-2xl bg-gradient-to-r from-indigo-500 to-fuchsia-500 text-white text-sm font-black shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-60"
                    >
                      {palStudioOrderStep === 'submitting' ? '発注処理中...' : '発注する'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-300 space-y-4">
                  <Box className="w-16 h-16 opacity-10" />
                  <p className="text-[10px] font-bold tracking-[0.3em] opacity-30 uppercase text-center">Hearing in progress...</p>
                </div>
              )}
            </div>

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