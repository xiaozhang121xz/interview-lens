'use client';

import { useEffect } from 'react';

export default function BrowserExtensionHandler() {
  useEffect(() => {
    // 移除可能导致hydration不匹配的浏览器扩展属性
    const html = document.documentElement;
    if (html.hasAttribute('data-redeviation-bs-uid')) {
      html.removeAttribute('data-redeviation-bs-uid');
    }

    // 处理其他可能的浏览器扩展属性
    const extensionAttributes = [
      'data-redeviation-bs-uid',
      'data-new-gr-c-s-check-loaded',
      'data-gr-ext-installed',
    ];

    extensionAttributes.forEach((attr) => {
      if (html.hasAttribute(attr)) {
        html.removeAttribute(attr);
      }
    });
  }, []);

  return null;
}
