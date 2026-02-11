// src/lib/sota/prompts/masterContentPrompt.ts
// SOTA Master Content Prompt v3.0 - Enterprise-Grade Blog Post Generation

export interface ContentPromptConfig {
  primaryKeyword: string;
  secondaryKeywords: string[];
  title: string;
  seoTitle?: string;
  metaDescription?: string;
  contentType: 'pillar' | 'cluster' | 'single' | 'refresh';
  targetWordCount: number;
  neuronWriterSection?: string; // Pre-built from NeuronWriterService
  internalLinks?: { anchor: string; url: string }[];
  serpData?: {
    competitorTitles: string[];
    peopleAlsoAsk: string[];
    avgWordCount: number;
  };
  youtubeEmbed?: { videoId: string; title: string };
  tone?: string;
  targetAudience?: string;
  existingContent?: string; // For refresh type
}

/**
 * Builds the master system prompt for AI content generation.
 */
export function buildMasterSystemPrompt(): string {
  return `You are an elite SEO content strategist and technical writer who produces the highest quality, most engaging blog posts on the internet. Your content consistently outranks competitors and achieves 90%+ NeuronWriter scores.

## YOUR CORE RULES:

1. **INCORPORATE ALL PROVIDED SEO TERMS NATURALLY** — Every keyword, entity, and term from the NeuronWriter data MUST appear in the content. Work them into sentences organically — never stuff or force them.

2. **BEAUTIFUL, ENTERPRISE-GRADE HTML** — Your output is polished WordPress-ready HTML with stunning visual design:
   - Use styled <div> containers with backgrounds, borders, padding, and rounded corners
   - Add callout boxes, key takeaway panels, and styled blockquotes
   - Use tables with styled headers for comparisons
   - Include styled <ul>/<ol> lists with custom markers
   - Add visual separators between major sections
   - Use <strong> and <em> for emphasis strategically

3. **E-E-A-T EXCELLENCE** — Demonstrate Experience, Expertise, Authoritativeness, Trust:
   - Include specific data, statistics, and numbers
   - Reference industry sources and authoritative studies
   - Show personal expertise with practical examples
   - Add actionable, step-by-step advice

4. **HEADING STRUCTURE** — Use a proper semantic hierarchy:
   - H2 for major sections (7-12 H2 tags)
   - H3 for sub-topics under each H2 (2-4 per H2)
   - Never skip heading levels

5. **CONTENT DEPTH** — Each section must be substantive:
   - Minimum 150-300 words per H2 section
   - Include real examples, case studies, and practical tips
   - Answer "People Also Ask" questions naturally within sections

6. **OUTPUT FORMAT** — Return ONLY clean HTML. No markdown. No \`\`\`html wrappers. Start directly with <h2> or content tags. Do NOT include <h1> — WordPress handles that.`;
}

/**
 * Builds the complete user prompt for content generation.
 */
export function buildMasterUserPrompt(config: ContentPromptConfig): string {
  const {
    primaryKeyword,
    secondaryKeywords,
    title,
    seoTitle,
    metaDescription,
    contentType,
    targetWordCount,
    neuronWriterSection,
    internalLinks,
    serpData,
    youtubeEmbed,
    tone,
    targetAudience,
    existingContent,
  } = config;

  const sections: string[] = [];

  // Core instruction
  sections.push(`## CONTENT BRIEF\n`);
  sections.push(`**Title:** ${title}`);
  if (seoTitle && seoTitle !== title) sections.push(`**SEO Title:** ${seoTitle}`);
  if (metaDescription) sections.push(`**Meta Description:** ${metaDescription}`);
  sections.push(`**Primary Keyword:** "${primaryKeyword}"`);
  if (secondaryKeywords.length > 0) {
    sections.push(`**Secondary Keywords:** ${secondaryKeywords.map(k => `"${k}"`).join(', ')}`);
  }
  sections.push(`**Content Type:** ${contentType}`);
  sections.push(`**Target Word Count:** ${targetWordCount}+ words (aim for ${Math.round(targetWordCount * 1.1)})`);
  if (tone) sections.push(`**Tone:** ${tone}`);
  if (targetAudience) sections.push(`**Target Audience:** ${targetAudience}`);

  // NeuronWriter data (the critical section for achieving 90%+ score)
  if (neuronWriterSection) {
    sections.push(neuronWriterSection);
    sections.push(`\n⚠️ CRITICAL: You MUST naturally incorporate ALL the basic keywords, extended keywords, and entities listed above. The target NeuronWriter score is 90%+. Every term matters. Weave them into paragraphs, headings, lists, tables, and callout boxes. Do NOT list them — integrate them as a natural part of expert writing.`);
  }

  // SERP data
  if (serpData) {
    sections.push(`\n## SERP INTELLIGENCE\n`);
    if (serpData.competitorTitles.length > 0) {
      sections.push(`**Top Ranking Titles:**`);
      serpData.competitorTitles.slice(0, 5).forEach(t => sections.push(`  - ${t}`));
    }
    if (serpData.peopleAlsoAsk.length > 0) {
      sections.push(`\n**People Also Ask (answer these in content):**`);
      serpData.peopleAlsoAsk.slice(0, 6).forEach(q => sections.push(`  - ${q}`));
    }
    sections.push(`**Avg Competitor Word Count:** ${serpData.avgWordCount}`);
  }

  // Internal links instruction
  if (internalLinks && internalLinks.length > 0) {
    sections.push(`\n## INTERNAL LINKS TO INCLUDE (4-8 links)\n`);
    sections.push(`Naturally embed these internal links within relevant paragraphs using the exact anchor text provided:`);
    for (const link of internalLinks) {
      sections.push(`  • Anchor: "${link.anchor}" → URL: ${link.url}`);
    }
    sections.push(`\nFormat each as: <a href="URL" title="Anchor Text">Anchor Text</a>`);
    sections.push(`Place them within contextually relevant paragraphs. Never cluster links together.`);
  }

  // YouTube embed
  if (youtubeEmbed) {
    sections.push(`\n## VIDEO EMBED\n`);
    sections.push(`Include this YouTube video in a relevant section:`);
    sections.push(`Video: "${youtubeEmbed.title}"`);
    sections.push(`Use this embed code: <figure style="margin: 32px 0;"><div style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; border-radius: 12px;"><iframe style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: 0;" src="https://www.youtube-nocookie.com/embed/${youtubeEmbed.videoId}" allowfullscreen loading="lazy"></iframe></div><figcaption style="text-align: center; color: #6b7280; font-size: 14px; margin-top: 8px;">${youtubeEmbed.title}</figcaption></figure>`);
  }

  // Refresh-specific instructions
  if (contentType === 'refresh' && existingContent) {
    sections.push(`\n## CONTENT REFRESH INSTRUCTIONS\n`);
    sections.push(`You are refreshing/rewriting existing content. Improve it dramatically:`);
    sections.push(`- Keep the same core topic and URL intent`);
    sections.push(`- Add missing NeuronWriter terms`);
    sections.push(`- Expand thin sections with real depth`);
    sections.push(`- Update any outdated information`);
    sections.push(`- Improve heading structure and HTML design`);
    sections.push(`\nExisting content to refresh:\n${existingContent.substring(0, 3000)}...`);
  }

  // HTML design guidelines
  sections.push(`\n## HTML DESIGN GUIDELINES\n`);
  sections.push(`Produce stunning, enterprise-grade HTML. Use these patterns:\n`);
  sections.push(`**Key Takeaway Box:**
<div style="background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border-left: 4px solid #16a34a; padding: 20px 24px; border-radius: 0 12px 12px 0; margin: 24px 0;">
  <p style="font-weight: 700; color: #15803d; margin: 0 0 8px; font-size: 16px;">💡 Key Takeaway</p>
  <p style="color: #166534; margin: 0; line-height: 1.7;">Your takeaway text here.</p>
</div>`);
  
  sections.push(`\n**Pro Tip Box:**
<div style="background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); border-left: 4px solid #2563eb; padding: 20px 24px; border-radius: 0 12px 12px 0; margin: 24px 0;">
  <p style="font-weight: 700; color: #1e40af; margin: 0 0 8px; font-size: 16px;">🎯 Pro Tip</p>
  <p style="color: #1e3a5f; margin: 0; line-height: 1.7;">Your tip text here.</p>
</div>`);

  sections.push(`\n**Warning/Important Box:**
<div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-left: 4px solid #d97706; padding: 20px 24px; border-radius: 0 12px 12px 0; margin: 24px 0;">
  <p style="font-weight: 700; color: #92400e; margin: 0 0 8px; font-size: 16px;">⚠️ Important</p>
  <p style="color: #78350f; margin: 0; line-height: 1.7;">Your warning text here.</p>
</div>`);

  sections.push(`\n**Styled Table:**
<div style="overflow-x: auto; margin: 24px 0; border-radius: 12px; border: 1px solid #e5e7eb;">
<table style="width: 100%; border-collapse: collapse; font-size: 15px;">
  <thead>
    <tr style="background: linear-gradient(135deg, #1e293b 0%, #334155 100%);">
      <th style="padding: 14px 18px; text-align: left; color: #f8fafc; font-weight: 600;">Column</th>
    </tr>
  </thead>
  <tbody>
    <tr style="background: #f8fafc;"><td style="padding: 12px 18px; border-top: 1px solid #e5e7eb;">Data</td></tr>
    <tr style="background: #ffffff;"><td style="padding: 12px 18px; border-top: 1px solid #e5e7eb;">Data</td></tr>
  </tbody>
</table>
</div>`);

  sections.push(`\n**Styled Blockquote:**
<blockquote style="border-left: 4px solid #8b5cf6; background: linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%); padding: 20px 24px; margin: 24px 0; border-radius: 0 12px 12px 0; font-style: italic; color: #4c1d95; line-height: 1.8;">
  "Quote text here."
</blockquote>`);

  sections.push(`\nUse 3-5 of these styled elements throughout the article. Include at least 1 key takeaway box, 1 pro tip, and 1 comparison table.`);

  // Final instruction
  sections.push(`\n## GENERATE NOW\n`);
  sections.push(`Write the complete blog post as clean HTML. Start with the first <h2>. Make it ${targetWordCount}+ words. Incorporate ALL NeuronWriter terms naturally. Make the design stunning.`);

  return sections.join('\n');
}

export default { buildMasterSystemPrompt, buildMasterUserPrompt };
