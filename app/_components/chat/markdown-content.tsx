import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import remarkGfm from "remark-gfm";

// Allow all default-safe elements plus code-highlighting class attributes.
// defaultSchema blocks <script>, inline event handlers, javascript: hrefs, etc.
const sanitizeSchema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    // Allow syntax-highlight classes added by rehype-highlight
    code: [...(defaultSchema.attributes?.code ?? []), "className"],
    span: [...(defaultSchema.attributes?.span ?? []), "className"],
    pre: [...(defaultSchema.attributes?.pre ?? []), "className"],
  },
};

interface MarkdownContentProps {
  content: string;
}

export function MarkdownContent({ content }: MarkdownContentProps): React.ReactElement {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeHighlight, [rehypeSanitize, sanitizeSchema]]}
      components={{
        a: ({ href, children }) => (
          <a
            href={href}
            target="_blank"
            rel="noreferrer noopener"
            className="text-violet-300 underline decoration-violet-300/40 underline-offset-2 hover:text-violet-200"
          >
            {children}
          </a>
        ),
        code: ({ className, children, ...props }) => {
          const isBlock = className?.includes("language-");
          if (!isBlock) {
            return (
              <code
                className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[0.9em] text-violet-100"
                {...props}
              >
                {children}
              </code>
            );
          }

          return (
            <code className={`${className ?? ""} font-mono text-[13px]`} {...props}>
              {children}
            </code>
          );
        },
        pre: ({ children }) => (
          <pre className="my-3 overflow-x-auto rounded-xl border border-white/10 bg-black/60 p-3 text-sm leading-relaxed">
            {children}
          </pre>
        ),
        ul: ({ children }) => <ul className="my-2 list-disc space-y-1 pl-5">{children}</ul>,
        ol: ({ children }) => <ol className="my-2 list-decimal space-y-1 pl-5">{children}</ol>,
        blockquote: ({ children }) => (
          <blockquote className="my-3 border-l-2 border-violet-400/50 pl-3 text-white/80">
            {children}
          </blockquote>
        ),
        table: ({ children }) => (
          <div className="my-3 overflow-x-auto">
            <table className="min-w-full border-collapse text-left text-sm">{children}</table>
          </div>
        ),
        th: ({ children }) => (
          <th className="border border-white/10 bg-white/5 px-2 py-1 font-semibold">{children}</th>
        ),
        td: ({ children }) => <td className="border border-white/10 px-2 py-1">{children}</td>,
        p: ({ children }) => <p className="my-2 first:mt-0 last:mb-0">{children}</p>,
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
