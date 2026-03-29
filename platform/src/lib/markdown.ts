import { serialize } from 'next-mdx-remote/serialize';
import rehypeHighlight from 'rehype-highlight';
import remarkGfm from 'remark-gfm';

export async function renderMarkdown(content: string) {
  const mdxSource = await serialize(content, {
    mdxOptions: {
      remarkPlugins: [remarkGfm as any],
      rehypePlugins: [rehypeHighlight as any],
    },
  });

  return mdxSource;
}
