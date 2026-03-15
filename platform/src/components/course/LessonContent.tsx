'use client';

import { MDXRemote, type MDXRemoteSerializeResult } from 'next-mdx-remote';
import { useEffect } from 'react';

interface Props {
  source: MDXRemoteSerializeResult;
}

export default function LessonContent({ source }: Props) {
  useEffect(() => {
    // Add copy buttons to all code blocks
    const codeBlocks = document.querySelectorAll('.prose-wbb pre');
    codeBlocks.forEach((pre) => {
      if (pre.querySelector('.copy-btn')) return;

      const btn = document.createElement('button');
      btn.className = 'copy-btn';
      btn.textContent = 'Copy';
      btn.addEventListener('click', () => {
        const code = pre.querySelector('code');
        if (!code) return;
        const raw = (code.textContent || '')
          .split('\n')
          .map(line => line.replace(/^\$ /, ''))
          .join('\n')
          .trim();
        navigator.clipboard.writeText(raw).then(() => {
          btn.textContent = 'Copied!';
          setTimeout(() => { btn.textContent = 'Copy'; }, 2000);
        });
      });

      (pre as HTMLElement).style.position = 'relative';
      pre.appendChild(btn);
    });
  }, [source]);

  return <MDXRemote {...source} />;
}
