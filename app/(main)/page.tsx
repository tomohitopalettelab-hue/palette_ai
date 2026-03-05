"use client";

import React, { Suspense, useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { Send, Layout, MessageSquare, Sparkles, User, Box, PenLine, RefreshCw, BellRing } from 'lucide-react';

type ServiceCard = {
  key: string;
  title: string;
  description: string;
  planName: string;
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

type ChatMessage = {
  role: 'ai' | 'user';
  content: string;
  serviceCards?: ServiceCard[];
  contractCards?: ContractInfoCard[];
  actionButtons?: ActionButton[];
};

type PromptSelectionKind = 'single' | 'multi';

function PaletteDesignInner() {
  const searchParams = useSearchParams();
  const queryCid = searchParams.get('cid')?.trim();
  const [activeTab, setActiveTab] = useState<'chat' | 'preview'>('chat');
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'ai', content: 'こんにちは！Palette AIです。まず顧客IDを入力してください。（例: A0001）' }
  ]);
  const [authStep, setAuthStep] = useState<'askId' | 'askPassword' | 'authenticated'>('askId');
  const [authPaletteId, setAuthPaletteId] = useState('');
  const [authServiceSummary, setAuthServiceSummary] = useState('');
  const [authContractCards, setAuthContractCards] = useState<ContractInfoCard[]>([]);
  const [generatedCode, setGeneratedCode] = useState("");
  const [showConfirmSave, setShowConfirmSave] = useState(false);
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
  const [sessionCustomerId] = useState(
    () => queryCid || `cust-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  );

  const scrollEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    scrollEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  
  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [inputText]);

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

    const isWireframeConfirmation = /(ワイヤーフレーム|構成でワイヤーフレーム|以下のような構成)/.test(text)
      && /(よろしいでしょうか|OKであれば|その旨お伝えください|確認してください)/.test(text);
    if (isWireframeConfirmation) {
      return [];
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

  useEffect(() => {
    const latestAiMessage = [...messages].reverse().find((message) => message.role === 'ai');
    const prompts = parseMultiPrompts(String(latestAiMessage?.content || ''));
    setMultiPromptItems(prompts.map((item) => item.question));
    setMultiPromptSelectOptions(prompts.map((item) => item.options));
    setMultiPromptSelectionKinds(prompts.map((item) => item.selectionKind));
    setMultiPromptModes(prompts.map((item) => (item.options.length > 0 ? 'select' : 'text')));
    setMultiPromptSelected(prompts.map(() => ''));
    setMultiPromptSelectedMulti(prompts.map(() => []));
    setMultiPromptAnswers(prompts.map(() => ''));
  }, [messages]);

  // ★DB保存の判定ロジックを含む関数
  const extractCode = async (text: string, currentMessages: any[]) => {
    const match = text.match(/```html([\s\S]*?)```/);
    if (!match || !match[1]) return;

    const code = match[1].trim();
    setGeneratedCode(code);
    
    // HTML コードブロック前の「AI の説明」を抽出
    const explanationMatch = text.match(/```html/i);
    let explanation = "";
    if (explanationMatch) {
      // HTML コードブロックより前のテキスト = AI の意思決定
      explanation = text.substring(0, explanationMatch.index || 0).trim();
    }
    setAiExplanation(explanation);
    
    // 「ワイヤーフレーム」や「構成案」という言葉が含まれている場合は、
    // DB保存のための情報を保持しておく（OK が来たら saveToLab を呼ぶ）
    if (text.includes("ワイヤーフレーム") || text.includes("構成案") || text.includes("図面")) {
      console.log("ワイヤーフレームを検知しました。OK が送信されたら保存します。");
      // wireframe でも currentMessages を保持しておく
      setConfirmMessages(currentMessages);
      setShowConfirmSave(true); // OKボタンを表示
      // conversationEndedはfalseのまま
      return;
    }

    // 本番デザインと判断されたので、保存候補として情報を保持しておく
    setConfirmMessages(currentMessages);
    setShowConfirmSave(true); // HTMLが生成されたら即表示

    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setTimeout(() => setActiveTab('preview'), 1000);
    }
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

  const saveDraftToLab = async (currentMessages: any[], status: 'hearing' | 'reviewing' | 'completed' = 'hearing') => {
    try {
      const firstUserMessage = currentMessages.find((m: any) => m.role === 'user')?.content || '新規顧客';
      const userAnswers = buildUserAnswers(currentMessages);

      const payload = {
        id: sessionCustomerId,
        customer_id: sessionCustomerId,
        name: String(firstUserMessage).slice(0, 80) || '新規顧客',
        answers: userAnswers,
        description: aiExplanation || 'ヒアリング中',
        htmlCode: generatedCode || '',
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
    } catch (err) {
      console.error('下書き保存エラー:', err);
    }
  };

  // 明示的に保存を行う関数
  const saveToLab = async (currentMessages: any[], html: string): Promise<boolean> => {
    if (!html) {
      console.error("保存するHTMLがありません");
      setMessages(prev => [
        ...prev,
        { role: 'ai', content: '保存できるHTMLがまだ生成されていません。先にデザインコードを生成してください。' }
      ]);
      return false;
    }
    try {
      const titleMatch = html.match(/<title>(.*?)<\/title>/);
      let customerName = titleMatch ? titleMatch[1] : (currentMessages.find(m => m.role === 'user')?.content || "新規顧客");
      if (!titleMatch) {
        customerName += ` (${new Date().toLocaleTimeString()})`;
      }

      const userAnswers = buildUserAnswers(currentMessages);

      const payload = {
        id: sessionCustomerId,
        customer_id: sessionCustomerId,
        name: customerName,
        answers: userAnswers,
        description: aiExplanation || "デザイン方針の詳細記録なし",
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

  const getServiceCardStyle = (serviceKey: string): React.CSSProperties => {
    if (serviceKey === 'palette_ai') {
      return {
        backgroundColor: '#FFFFFFCC',
        borderColor: '#E2E8F0',
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

  const handleServiceCardClick = (card: ServiceCard) => {
    setQuickQuestionButtons([]);

    if (card.key === 'pal_studio') {
      const phase = String(card.phase || '');
      const status = String(card.status || '');
      const isHearingWaiting = includesAny(phase, ['ヒアリング待ち', 'awaiting', 'hearing'])
        || includesAny(status, ['ヒアリング待ち', 'awaiting']);
      const isDeliveredOrOperating = includesAny(phase, ['納品完了', '運用中', 'active', 'completed'])
        || includesAny(status, ['納品完了', '運用中', 'delivered', 'in progress']);

      if (isHearingWaiting) {
        appendAiMessage({
          content: 'Pal Studio のヒアリングを開始します。\nまず、HPに記載する屋号名（サービス名）を教えてください。',
        });
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
    if (!messageToSend.trim() || isLoading) return;

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
        setAuthServiceSummary(String(verifyData?.summaryText || ''));
        setAuthContractCards(buildContractInfoCards(verifyData?.summary || {}));
        const customerName = String(verifyData?.accountName || authPaletteId || 'お客様');
        setMessages([
          ...updatedMessages,
          {
            role: 'ai',
            content: `ありがとうございます！${customerName}様 ですね！\n認証が完了しました。ヒアリングを始めます。`,
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

    // ★ wireframe 後（conversationEnded = true）の OK 送信時に保存処理を実行
    if (conversationEnded && /OK|ok|了解|承認/.test(messageToSend)) {
      console.log("wireframe 系統での OK 送信を検知。saveToLab を実行します。");
      const saved = await saveToLab(confirmMessages, generatedCode);
      if (!saved) {
        return;
      }
      // その後、通常通り AI に OK メッセージを送信
    } else if (conversationEnded) {
      // OK 以外のメッセージは無視
      return;
    }

    if (isContractInfoRequest(messageToSend)) {
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
    await saveDraftToLab(updatedMessages, 'hearing');
    setInputText("");
    setIsLoading(true);

    // テンプレート情報をAIへの隠し指示として付与
    const systemContext = `
あなたはプロのWebディレクターです。次の方針で会話してください。
- DB由来の情報は、許可された「契約カード（プラン名・期間・金額）」以外を出力しないでください。
- フェーズ・ステータス・内部管理情報は、ユーザーが聞いても開示しないでください。
- 契約/料金系の問い合わせは画面側でカード回答するため、あなたは通常のヒアリングに必要な質問だけを行ってください。
- 補助UI精度のため、質問は次のタグ形式を優先してください。
  - 2択質問: 質問文の末尾に「(2択)」を付ける（例: お問い合わせフォームは設置しますか？ (2択)）
  - 選択肢あり: 質問文の末尾に「(選択肢: A、B、C)」を付ける
  - 複数選択: 質問文の末尾に「(複数選択) (選択肢: A、B、C)」を付ける
`;

    const sanitizeHistoryText = (text: string) => {
      return String(text || '')
        .replace(/```html[\s\S]*?```/gi, '[HTML omitted]')
        .replace(/\s{3,}/g, ' ')
        .trim();
    };

    const fieldOrder = [
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

    const fieldPatterns: { label: string; pattern: RegExp }[] = [
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
        const aiText = trimSecurityRefusalMessage(String(data.text || ''));
        const hasHtmlBlock = /```html[\s\S]*?```/i.test(aiText);
        const aiMessage: ChatMessage = { role: 'ai', content: aiText };
        const newMessages: ChatMessage[] = [...updatedMessages, aiMessage];
        setMessages(newMessages);
        extractCode(aiText, newMessages);
        await saveDraftToLab(newMessages, /よろしいでしょうか|OKであれば|確認してください/.test(aiText) ? 'reviewing' : 'hearing');
        if (hasHtmlBlock) {
          setShowConfirmSave(true);
        }

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
    const saved = await saveToLab(confirmMessages, html);
    if (!saved) {
      return;
    }
    setMessages(prev => [
      ...prev,
      {
        role: 'ai',
        content: 'ありがとうございました！\nこの構成を参考に制作させていただきます。\n３～５営業日以内に担当よりご連絡いたします。\n楽しみにお待ちください☺'
      }
    ]);
    setConversationEnded(true);
  };

  const handleRequestRevision = () => {
    setShowConfirmSave(false);
    handleSend("修正お願いします");
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
    setIsSubmittingMultiPrompt(true);
    try {
      await handleSend(merged);
      setQuickQuestionButtons([]);
      setMultiPromptItems([]);
      setMultiPromptSelectOptions([]);
      setMultiPromptSelectionKinds([]);
      setMultiPromptModes([]);
      setMultiPromptSelected([]);
      setMultiPromptSelectedMulti([]);
      setMultiPromptAnswers([]);
    } finally {
      setIsSubmittingMultiPrompt(false);
    }
  };

  const handleSingleSelectImmediateSend = async (index: number, option: string) => {
    if (multiPromptItems.length !== 1 || isSubmittingMultiPrompt) return;
    const answer = String(option || '').trim();
    if (!answer) return;
    setIsSubmittingMultiPrompt(true);
    try {
      await handleSend(answer);
      setQuickQuestionButtons([]);
      setMultiPromptItems([]);
      setMultiPromptSelectOptions([]);
      setMultiPromptSelectionKinds([]);
      setMultiPromptModes([]);
      setMultiPromptSelected([]);
      setMultiPromptSelectedMulti([]);
      setMultiPromptAnswers([]);
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

  return (
    <div className="fixed inset-0 w-full h-[100dvh] flex items-center justify-center p-0 md:p-8 overflow-hidden bg-slate-50 touch-none">
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none -z-10 overflow-hidden">
        <div className="absolute w-[500px] h-[500px] bg-pink-400/10 blur-[120px] rounded-full -top-20 -left-20 animate-pulse" />
        <div className="absolute w-[600px] h-[600px] bg-cyan-400/10 blur-[150px] rounded-full -bottom-20 -right-20 animate-pulse" style={{ animationDelay: '-5s' }} />
      </div>

      <div className="w-full max-w-[1300px] h-full md:h-[90vh] bg-white/40 md:backdrop-blur-[30px] md:rounded-[60px] shadow-neu-flat flex flex-col md:flex-row border-none md:border md:border-white/60 overflow-hidden relative">
        <div className="absolute top-4 left-1/2 -translate-x-1/2 flex md:hidden bg-white/90 backdrop-blur-md p-1 rounded-full shadow-lg border border-white/50 z-50">
          <button onClick={() => setActiveTab('chat')} className={`px-6 py-1.5 rounded-full text-[10px] font-black transition-all ${activeTab === 'chat' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-400'}`}>CHAT</button>
          <button onClick={() => setActiveTab('preview')} className={`px-6 py-1.5 rounded-full text-[10px] font-black transition-all ${activeTab === 'preview' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-400'}`}>VIEW</button>
        </div>

        <div className={`flex flex-col p-5 md:p-10 h-full border-r border-white/20 w-full md:w-[400px] lg:w-[460px] shrink-0 ${activeTab === 'chat' ? 'flex' : 'hidden md:flex'}`}>
          <header className="flex justify-between items-center mb-6 shrink-0 pt-12 md:pt-0">
            <div className="flex flex-col text-slate-800">
              <h1 className="text-2xl font-black tracking-tighter italic">Palette AI</h1>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">prototype</span>
            </div>
            <div className="w-10 h-10 rounded-full shadow-neu-flat bg-white/50 flex items-center justify-center border border-white">
              <User className="w-4 h-4 text-slate-400" />
            </div>
          </header>

          <main className="flex-1 overflow-y-auto pr-1 space-y-6 custom-scrollbar flex flex-col pb-4 touch-auto">
            {messages.map((msg, index) => (
              (() => {
                const isCompletionMessage =
                  msg.role === 'ai' &&
                  typeof msg.content === 'string' &&
                  msg.content.startsWith('ありがとうございました！');

                return (
                  <div key={index} className={`flex gap-3 items-start ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    <div className={`w-8 h-8 rounded-xl shadow-neu-flat flex items-center justify-center shrink-0 border ${isCompletionMessage ? 'bg-violet-50 border-violet-200' : 'bg-white/80 border-white'}`}>
                      {msg.role === 'ai' ? (
                        isCompletionMessage ? <BellRing className="w-4 h-4 text-violet-500" /> : <Sparkles className="w-4 h-4 text-indigo-500" />
                      ) : (
                        <User className="w-4 h-4 text-slate-400" />
                      )}
                    </div>
                    <div className={`p-4 rounded-[22px] max-w-[85%] text-sm font-medium whitespace-pre-wrap leading-relaxed ${
                      msg.role === 'ai'
                        ? isCompletionMessage
                          ? 'rounded-tl-none bg-gradient-to-r from-violet-50 to-fuchsia-50 border border-violet-200 text-violet-800 shadow-[0_8px_24px_rgba(139,92,246,0.12)]'
                          : 'rounded-tl-none shadow-neu-inset bg-white/20 text-slate-600'
                        : 'rounded-tr-none shadow-neu-flat bg-white/80 text-slate-600'
                    }`}>
                      {msg.role === 'ai'
                        ? msg.content.replace(/```html[\s\S]*?```/g, '').trim() || "プレビューを生成しました！"
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

          <div className="mt-auto pt-4 pb-2 md:pb-0">
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
                      <div className="flex items-center gap-2 mb-2">
                        <button
                          type="button"
                          onClick={() => {
                            const next = [...multiPromptModes];
                            next[index] = 'select';
                            setMultiPromptModes(next);
                          }}
                          disabled={(multiPromptSelectOptions[index] || []).length === 0}
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
                          className={`px-3 py-1.5 rounded-full text-[11px] font-bold border transition-all duration-300 ${(multiPromptModes[index] || 'text') === 'text' ? 'bg-indigo-50/90 border-indigo-200 text-indigo-700 shadow-[0_6px_16px_rgba(79,70,229,0.12)]' : 'bg-white/80 border-white text-slate-500 hover:bg-white'}`}
                        >
                          自由入力
                        </button>
                      </div>

                      {(multiPromptModes[index] || 'text') === 'select' && (multiPromptSelectOptions[index] || []).length > 0 ? (
                        (multiPromptSelectionKinds[index] || 'single') === 'multi' ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {(multiPromptSelectOptions[index] || []).map((option) => {
                              const selected = multiPromptSelectedMulti[index] || [];
                              const isSelected = selected.includes(option);
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
                                  className={`group relative text-left px-3 py-2.5 rounded-2xl border backdrop-blur-xl transition-all duration-300 overflow-hidden ${isSelected
                                    ? 'border-indigo-200 bg-indigo-50/80 text-indigo-700 shadow-[0_8px_20px_rgba(79,70,229,0.16)]'
                                    : 'border-white bg-white/80 text-slate-700 shadow-[0_6px_18px_rgba(0,0,0,0.04)] hover:bg-white hover:-translate-y-0.5 hover:shadow-[0_12px_24px_rgba(79,70,229,0.1)]'
                                  }`}
                                >
                                  <div className="absolute -right-2 -top-2 w-10 h-10 bg-gradient-to-br from-indigo-500/10 to-fuchsia-500/10 rounded-full blur-xl" />
                                  <span className="relative z-10 text-[12px] font-bold flex items-center gap-2">
                                    <span className={`inline-flex w-4 h-4 rounded border items-center justify-center text-[10px] ${isSelected ? 'bg-indigo-500 border-indigo-500 text-white' : 'bg-white border-slate-300 text-transparent'}`}>✓</span>
                                    {option}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {(multiPromptSelectOptions[index] || []).map((option) => {
                              const isSelected = (multiPromptSelected[index] || '') === option;
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
                                  className={`group relative text-left px-3 py-2.5 rounded-2xl border backdrop-blur-xl transition-all duration-300 overflow-hidden ${isSelected
                                    ? 'border-indigo-200 bg-indigo-50/80 text-indigo-700 shadow-[0_8px_20px_rgba(79,70,229,0.16)]'
                                    : 'border-white bg-white/80 text-slate-700 shadow-[0_6px_18px_rgba(0,0,0,0.04)] hover:bg-white hover:-translate-y-0.5 hover:shadow-[0_12px_24px_rgba(79,70,229,0.1)]'
                                  }`}
                                >
                                  <div className="absolute -right-2 -top-2 w-10 h-10 bg-gradient-to-br from-indigo-500/10 to-fuchsia-500/10 rounded-full blur-xl" />
                                  <span className="relative z-10 text-[12px] font-bold">{option}</span>
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
            <div className="p-2 rounded-[30px] shadow-neu-flat bg-white/30 border border-white/50">
              <div className="flex items-end shadow-neu-inset rounded-[24px] bg-[#F0F2F5]/50 px-3 py-1">
                <textarea 
                  ref={textareaRef} 
                  value={inputText} 
                  onChange={(e) => setInputText(e.target.value)} 
                  onKeyDown={handleKeyDown} 
                  placeholder={authStep === 'askId' ? '顧客ID（例: A0001）を入力...' : authStep === 'askPassword' ? 'パスワードを入力...' : '回答を入力...'} 
                  rows={1} 
                  disabled={conversationEnded}
                  className="flex-1 bg-transparent border-none py-3 text-base focus:outline-none text-slate-700 font-medium resize-none min-h-[40px] max-h-[120px] touch-auto" 
                />
                <button 
                  type="button" 
                  onClick={() => handleSend()} 
                  disabled={isLoading} 
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
          </div>
          <div className="flex-1 rounded-[30px] shadow-neu-inset bg-white md:bg-[#F8FAFC]/50 overflow-hidden border border-white/40">
            {generatedCode ? (
              <iframe 
                srcDoc={`<html><head><script src="https://cdn.tailwindcss.com"></script><style>body { margin: 0; font-family: sans-serif; }</style></head><body>${generatedCode}</body></html>`} 
                className="w-full h-full border-none" 
              />
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
  );
}

export default function PaletteDesign() {
  return (
    <Suspense fallback={<div className="fixed inset-0 bg-slate-50" />}>
      <PaletteDesignInner />
    </Suspense>
  );
}