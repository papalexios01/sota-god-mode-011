/**
 * SOTA Content Post-Processor v1.0.0
 * ===================================
 * Enterprise-grade post-generation HTML processor.
 * - Enforces a maximum consecutive word count between visual HTML breaks.
 * - Injects rich, styled visual elements (callout boxes, pull-quotes, key-takeaways, tips).
 * - Validates content for "wall of text" violations before publishing.
 *
 * Usage:
 *   import { ContentPostProcessor } from '@/lib/sota/ContentPostProcessor';
 *   const processed = ContentPostProcessor.enforceVisualBreaks(htmlString);
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface VisualBreakOptions {
  /** Maximum consecutive words allowed in <p> runs before a visual break is injected. Default: 200 */
  maxConsecutiveWords: number;
  /** Ordered list of visual element types to cycle through when injecting breaks. */
  breakElementCycle: BreakElementType[];
  /** If true, extract a sentence from the preceding paragraph as a pull-quote. */
  usePullQuotes: boolean;
}

export type BreakElementType =
  | "callout-info"
  | "callout-tip"
  | "callout-warning"
  | "callout-success"
  | "pullquote"
  | "key-takeaway"
  | "hr"
  | "highlight-box";

export interface WallOfTextViolation {
  /** Zero-based index of the first paragraph block in the consecutive run. */
  blockIndex: number;
  /** Number of words in this consecutive paragraph run. */
  wordCount: number;
}

export interface ValidationResult {
  valid: boolean;
  violations: WallOfTextViolation[];
}

// ---------------------------------------------------------------------------
// Constants – styled HTML snippets
// ---------------------------------------------------------------------------

const VISUAL_ELEMENTS: Record<BreakElementType, (context?: string) => string> = {
  "callout-info": (ctx) => `
<div style="background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); border-left: 4px solid #3b82f6; border-radius: 0 12px 12px 0; padding: 20px 24px; margin: 28px 0; font-size: 15px; color: #1e3a5f;">
  <strong style="display: block; margin-bottom: 6px; color: #1d4ed8; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em;">ℹ️ Did You Know?</strong>
  ${ctx || "This is a key insight that adds depth to the topic discussed above."}
</div>`,

  "callout-tip": (ctx) => `
<div style="background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border-left: 4px solid #22c55e; border-radius: 0 12px 12px 0; padding: 20px 24px; margin: 28px 0; font-size: 15px; color: #14532d;">
  <strong style="display: block; margin-bottom: 6px; color: #16a34a; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em;">💡 Pro Tip</strong>
  ${ctx || "Apply the advice above immediately for the best results."}
</div>`,

  "callout-warning": (ctx) => `
<div style="background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%); border-left: 4px solid #f59e0b; border-radius: 0 12px 12px 0; padding: 20px 24px; margin: 28px 0; font-size: 15px; color: #78350f;">
  <strong style="display: block; margin-bottom: 6px; color: #d97706; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em;">⚠️ Important</strong>
  ${ctx || "Keep this in mind as you implement the strategies discussed above."}
</div>`,

  "callout-success": (ctx) => `
<div style="background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); border-left: 4px solid #10b981; border-radius: 0 12px 12px 0; padding: 20px 24px; margin: 28px 0; font-size: 15px; color: #064e3b;">
  <strong style="display: block; margin-bottom: 6px; color: #059669; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em;">✅ Key Point</strong>
  ${ctx || "This is a crucial takeaway from the section above."}
</div>`,

  pullquote: (ctx) => `
<blockquote style="border-left: 4px solid #8b5cf6; background: linear-gradient(135deg, #faf5ff 0%, #ede9fe 100%); margin: 32px 0; padding: 24px 28px; border-radius: 0 16px 16px 0; font-size: 18px; font-style: italic; color: #4c1d95; line-height: 1.7; position: relative;">
  <span style="position: absolute; top: -8px; left: 16px; font-size: 48px; color: #c4b5fd; line-height: 1;">"</span>
  ${ctx || "The most impactful insight from the discussion above."}
</blockquote>`,

  "key-takeaway": (ctx) => `
<div style="background: linear-gradient(135deg, #fefce8 0%, #fef9c3 100%); border: 2px solid #eab308; border-radius: 12px; padding: 20px 24px; margin: 28px 0; font-size: 15px; color: #713f12;">
  <strong style="display: block; margin-bottom: 6px; color: #a16207; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em;">🔑 Key Takeaway</strong>
  ${ctx || "Remember this core concept as you continue reading."}
</div>`,

  hr: () => `
<hr style="border: none; border-top: 2px solid #e5e7eb; margin: 40px 0;" />`,

  "highlight-box": (ctx) => `
<div style="background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); border: 1px solid #cbd5e1; border-radius: 12px; padding: 20px 24px; margin: 28px 0; font-size: 15px; color: #334155;">
  <strong style="display: block; margin-bottom: 6px; color: #0f172a; font-size: 14px;">📌 Quick Summary</strong>
  ${ctx || "Here's a brief recap of the points covered so far."}
</div>`,
};

// Block-level tags that count as "visual breaks"
const VISUAL_BREAK_TAGS = new Set([
  "h1", "h2", "h3", "h4", "h5", "h6",
  "blockquote", "table", "ul", "ol",
  "figure", "img", "hr", "div",
  "details", "aside", "section", "pre",
]);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function countWords(text: string): number {
  return text.replace(/<[^>]*>/g, "").split(/\s+/).filter(Boolean).length;
}

function extractFirstSentence(html: string): string {
  const text = html.replace(/<[^>]*>/g, "").trim();
  const match = text.match(/^(.+?[.!?])\s/);
  return match ? match[1] : text.substring(0, 120) + "…";
}

/**
 * Parse HTML into an ordered list of block-level elements.
 * Each entry stores the tag name, the raw HTML, and its word count.
 */
interface HtmlBlock {
  tag: string; // e.g. "p", "h2", "div", "blockquote"
  html: string;
  wordCount: number;
}

function parseBlocks(html: string): HtmlBlock[] {
  const blocks: HtmlBlock[] = [];
  // Split on opening block-level tags while keeping them
  const blockRegex = /(<(?:p|h[1-6]|div|blockquote|table|ul|ol|li|figure|figcaption|section|article|aside|details|summary|pre|hr|img)[^>]*>[\s\S]*?<\/(?:p|h[1-6]|div|blockquote|table|ul|ol|li|figure|figcaption|section|article|aside|details|summary|pre)>|<(?:hr|img)[^>]*\/?>)/gi;

  let match: RegExpExecArray | null;
  while ((match = blockRegex.exec(html)) !== null) {
    const raw = match[0];
    const tagMatch = raw.match(/^<(\w+)/);
    const tag = tagMatch ? tagMatch[1].toLowerCase() : "p";
    blocks.push({ tag, html: raw, wordCount: countWords(raw) });
  }

  // If regex missed some content (plain text between blocks), treat as <p>
  if (blocks.length === 0 && html.trim().length > 0) {
    blocks.push({ tag: "p", html, wordCount: countWords(html) });
  }

  return blocks;
}

// ---------------------------------------------------------------------------
// Main Class
// ---------------------------------------------------------------------------

export class ContentPostProcessor {
  private static readonly DEFAULT_OPTIONS: VisualBreakOptions = {
    maxConsecutiveWords: 200,
    breakElementCycle: [
      "callout-tip",
      "key-takeaway",
      "callout-info",
      "pullquote",
      "highlight-box",
      "callout-success",
      "callout-warning",
      "hr",
    ],
    usePullQuotes: true,
  };

  /**
   * Validate HTML content for "wall of text" violations.
   * Returns a list of violations where consecutive <p> blocks exceed the word limit.
   */
  static validateVisualBreaks(
    html: string,
    maxConsecutiveWords: number = 200,
  ): ValidationResult {
    const blocks = parseBlocks(html);
    const violations: WallOfTextViolation[] = [];

    let consecutiveWords = 0;
    let runStartIndex = -1;

    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];
      const isVisualBreak = VISUAL_BREAK_TAGS.has(block.tag) && block.tag !== "p";

      if (isVisualBreak) {
        // Check if the preceding run exceeded the limit
        if (consecutiveWords > maxConsecutiveWords && runStartIndex >= 0) {
          violations.push({ blockIndex: runStartIndex, wordCount: consecutiveWords });
        }
        consecutiveWords = 0;
        runStartIndex = -1;
      } else {
        // It's a <p> or similar text block
        if (runStartIndex === -1) runStartIndex = i;
        consecutiveWords += block.wordCount;
      }
    }

    // Check trailing run
    if (consecutiveWords > maxConsecutiveWords && runStartIndex >= 0) {
      violations.push({ blockIndex: runStartIndex, wordCount: consecutiveWords });
    }

    return { valid: violations.length === 0, violations };
  }

  /**
   * Process HTML to ensure no more than `maxConsecutiveWords` appear
   * in consecutive <p> blocks without a visual break element in between.
   *
   * When a violation is found the processor injects a styled visual element
   * (cycling through the configured element types to maintain variety).
   */
  static enforceVisualBreaks(
    html: string,
    options?: Partial<VisualBreakOptions>,
  ): string {
    const opts = { ...this.DEFAULT_OPTIONS, ...options };
    const blocks = parseBlocks(html);

    if (blocks.length === 0) return html;

    const result: string[] = [];
    let consecutiveWords = 0;
    let cycleIndex = 0;
    let lastParagraphHtml = "";

    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];
      const isVisualBreak = VISUAL_BREAK_TAGS.has(block.tag) && block.tag !== "p";

      if (isVisualBreak) {
        consecutiveWords = 0;
        result.push(block.html);
        continue;
      }

      // Accumulate paragraph words
      consecutiveWords += block.wordCount;

      if (consecutiveWords > opts.maxConsecutiveWords) {
        // Inject a visual break BEFORE this paragraph
        const elementType = opts.breakElementCycle[cycleIndex % opts.breakElementCycle.length];
        cycleIndex++;

        // For pull-quotes, try to extract a meaningful sentence from the preceding paragraph
        let contextSentence: string | undefined;
        if (elementType === "pullquote" && opts.usePullQuotes && lastParagraphHtml) {
          contextSentence = extractFirstSentence(lastParagraphHtml);
        }

        const generator = VISUAL_ELEMENTS[elementType];
        if (generator) {
          result.push(generator(contextSentence));
        }

        consecutiveWords = block.wordCount; // Reset counter
      }

      result.push(block.html);
      lastParagraphHtml = block.html;
    }

    return result.join("\n\n");
  }

  /**
   * Apply all post-processing enhancements to generated content.
   * This is the main entry point to call after content generation.
   */
  static process(
    html: string,
    options?: Partial<VisualBreakOptions>,
  ): { html: string; violations: WallOfTextViolation[]; wasModified: boolean } {
    // First validate
    const preValidation = this.validateVisualBreaks(html, options?.maxConsecutiveWords);

    if (preValidation.valid) {
      return { html, violations: [], wasModified: false };
    }

    // Apply fixes
    const processed = this.enforceVisualBreaks(html, options);
    const postValidation = this.validateVisualBreaks(processed, options?.maxConsecutiveWords);

    return {
      html: processed,
      violations: postValidation.violations,
      wasModified: true,
    };
  }
}

export default ContentPostProcessor;

