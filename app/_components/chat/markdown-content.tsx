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
            className="text-primary underline decoration-primary/40 underline-offset-2 hover:text-primary/80"
          >
            {children}
          </a>
        ),
        code: ({ className, children, ...props }) => {
          const isBlock = className?.includes("language-");
          if (!isBlock) {
            return (
              <code
                className="rounded bg-muted/30 px-1.5 py-0.5 font-mono text-[0.9em] text-foreground border border-border/50"
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
          <pre className="my-3 overflow-x-auto rounded-xl border border-border bg-muted/20 p-3 text-sm leading-relaxed text-foreground">
            {children}
          </pre>
        ),
        ul: ({ children }) => <ul className="my-2 list-disc space-y-1 pl-5">{children}</ul>,
        ol: ({ children }) => <ol className="my-2 list-decimal space-y-1 pl-5">{children}</ol>,
        blockquote: ({ children }) => (
          <blockquote className="my-3 border-l-2 border-primary/40 pl-3 text-muted-foreground">
            {children}
          </blockquote>
        ),
        table: ({ children }) => (
          <div className="my-3 overflow-x-auto">
            <table className="min-w-full border-collapse text-left text-sm">{children}</table>
          </div>
        ),
        th: ({ children }) => (
          <th className="border border-border bg-muted/30 px-2 py-1 font-semibold text-foreground">{children}</th>
        ),
        td: ({ children }) => <td className="border border-border px-2 py-1 text-foreground">{children}</td>,
        p: ({ children }) => <p className="my-2 first:mt-0 last:mb-0">{children}</p>,
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
