'use client';

import React, { useEffect } from 'react';

export default function ReportsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // globals.css / (main) layout の overflow:hidden を /main/reports では解除
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const html = document.documentElement;
    const body = document.body;
    const prev = {
      ho: html.style.overflow,
      bo: body.style.overflow,
      hh: html.style.height,
      bh: body.style.height,
      hd: html.style.display,
      bd: body.style.display,
    };

    html.style.setProperty('overflow', 'auto', 'important');
    body.style.setProperty('overflow', 'auto', 'important');
    html.style.height = 'auto';
    body.style.height = 'auto';
    html.style.display = 'block';
    body.style.display = 'block';

    return () => {
      html.style.overflow = prev.ho;
      body.style.overflow = prev.bo;
      html.style.height = prev.hh;
      body.style.height = prev.bh;
      html.style.display = prev.hd;
      body.style.display = prev.bd;
    };
  }, []);

  return <>{children}</>;
}
