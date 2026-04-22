'use client';

import React, { useEffect } from 'react';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // globals.css の `html, body { overflow: hidden !important }` を
  // /admin ルートでは解除してページ全体をスクロール可能にする
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const html = document.documentElement;
    const body = document.body;
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;
    const prevHtmlHeight = html.style.height;
    const prevBodyHeight = body.style.height;
    const prevHtmlDisplay = html.style.display;
    const prevBodyDisplay = body.style.display;

    html.style.setProperty('overflow', 'auto', 'important');
    body.style.setProperty('overflow', 'auto', 'important');
    html.style.height = 'auto';
    body.style.height = 'auto';
    html.style.display = 'block';
    body.style.display = 'block';

    return () => {
      html.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
      html.style.height = prevHtmlHeight;
      body.style.height = prevBodyHeight;
      html.style.display = prevHtmlDisplay;
      body.style.display = prevBodyDisplay;
    };
  }, []);

  return <>{children}</>;
}
