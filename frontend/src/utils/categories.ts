/**
 * Category detection and styling helpers for ContextIQ documents
 * Categories:
 * - Technical Report
 * - Research Paper
 * - Academic Notes
 * - Project Documentation
 */

export interface CategoryMeta {
  label: string;
  badgeBg: string;
  badgeText: string;
  borderColor: string;
  iconBg: string;
  iconColor: string;
  color: string;
  bg: string;
  border: string;
}

export const CATEGORIES: Record<string, CategoryMeta> = {
  'Technical Report': {
    label: 'Technical Report',
    badgeBg: 'bg-[#EEF2FF]',
    badgeText: 'text-[#4F46E5]',
    borderColor: 'border-[#C7D2FE]',
    iconBg: 'bg-[#EEF2FF]',
    iconColor: 'text-[#4F46E5]',
    color: 'text-[#4F46E5]',
    bg: 'bg-[#EEF2FF]',
    border: 'border-[#C7D2FE]',
  },
  'Research Paper': {
    label: 'Research Paper',
    badgeBg: 'bg-[#F0FDF4]',
    badgeText: 'text-[#15803D]',
    borderColor: 'border-[#BBF7D0]',
    iconBg: 'bg-[#F0FDF4]',
    iconColor: 'text-[#16A34A]',
    color: 'text-[#15803D]',
    bg: 'bg-[#F0FDF4]',
    border: 'border-[#BBF7D0]',
  },
  'Project Documentation': {
    label: 'Project Documentation',
    badgeBg: 'bg-[#EFF6FF]',
    badgeText: 'text-[#1D4ED8]',
    borderColor: 'border-[#BFDBFE]',
    iconBg: 'bg-[#EFF6FF]',
    iconColor: 'text-[#2563EB]',
    color: 'text-[#1D4ED8]',
    bg: 'bg-[#EFF6FF]',
    border: 'border-[#BFDBFE]',
  },
  'Academic Notes': {
    label: 'Academic Notes',
    badgeBg: 'bg-[#FAF5FF]',
    badgeText: 'text-[#7E22CE]',
    borderColor: 'border-[#E9D5FF]',
    iconBg: 'bg-[#FAF5FF]',
    iconColor: 'text-[#9333EA]',
    color: 'text-[#7E22CE]',
    bg: 'bg-[#FAF5FF]',
    border: 'border-[#E9D5FF]',
  },
};

export const DEFAULT_CATEGORY: CategoryMeta = {
  label: 'Technical Report',
  badgeBg: 'bg-[#EEF2FF]',
  badgeText: 'text-[#4F46E5]',
  borderColor: 'border-[#C7D2FE]',
  iconBg: 'bg-[#EEF2FF]',
  iconColor: 'text-[#4F46E5]',
  color: 'text-[#4F46E5]',
  bg: 'bg-[#EEF2FF]',
  border: 'border-[#C7D2FE]',
};

export function getDocumentCategory(docName: string): string {
  const lower = docName.toLowerCase();
  if (lower.includes('research') || lower.includes('paper') || lower.includes('arxiv') || lower.includes('10462') || lower.includes('journal')) {
    return 'Research Paper';
  }
  if (lower.includes('internship') || lower.includes('report') || lower.includes('verification') || lower.includes('letter')) {
    return 'Technical Report';
  }
  if (lower.includes('project') || lower.includes('doc') || lower.includes('spec') || lower.includes('plan') || lower.includes('rag')) {
    return 'Project Documentation';
  }
  if (lower.includes('note') || lower.includes('lecture') || lower.includes('academic') || lower.includes('thesis') || lower.includes('syllabus')) {
    return 'Academic Notes';
  }
  return 'Technical Report';
}

export function getCategoryMeta(categoryName: string): CategoryMeta {
  return CATEGORIES[categoryName] || DEFAULT_CATEGORY;
}
