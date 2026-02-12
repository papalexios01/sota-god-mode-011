// src/lib/sota/index.ts
// SOTA Content Engine - Enterprise Barrel Export v3.0

// Core Types
export type {
  GeneratedContent,
  ContentGenerationOptions,
  QualityScore,
  ContentMetrics,
  NeuronWriterAnalysis,
} from "./types";

// Internal Link Engine
export { generateInternalLinks, applyInternalLinks } from "./SOTAInternalLinkEngine";
export type { InternalLink, SitemapUrl } from "./SOTAInternalLinkEngine";

// NeuronWriter Service
export {
  fetchNeuronWriterAnalysis,
  buildNeuronWriterPromptSection,
  scoreContentAgainstNeuron,
} from "./NeuronWriterService";
export type { NeuronWriterTermData, NeuronWriterHeadingData } from "./NeuronWriterService";

// Content Prompt Builder
export { buildMasterSystemPrompt, buildMasterUserPrompt } from "./prompts/masterContentPrompt";
export type { ContentPromptConfig } from "./prompts/masterContentPrompt";

// Content Post-Processor
export { enhanceHtmlDesign, injectMissingTerms, addFaqSection, postProcessContent } from "./ContentPostProcessor";

// Schema Generator
export { SchemaGenerator } from "./SchemaGenerator";

// EEAT Validator
export { EEATValidator } from "./EEATValidator";

// Quality Validator
export { QualityValidator } from "./QualityValidator";

// Performance Tracker
export { PerformanceTracker, globalPerformanceTracker } from "./PerformanceTracker";
export type { AnalyticsDashboardData } from "./PerformanceTracker";

// Reference Service
export { ReferenceService } from "./ReferenceService";

// YouTube Service
export { YouTubeService } from "./YouTubeService";

// SERP Analyzer
export { SERPAnalyzer } from "./SERPAnalyzer";

// SEO Health Scorer
export { SEOHealthScorer } from "./SEOHealthScorer";

// God Mode Engine
export { GodModeEngine } from "./GodModeEngine";

// Cache
export { SOTACache } from "./cache";

// Sanitize
export { sanitizeContent } from "./sanitize";
