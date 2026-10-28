import React, { useState, useMemo } from 'react';
import {
  ChevronDown,
  ChevronRight,
  GitBranch,
  ExternalLink,
  CheckCircle2,
  Copy,
  Check,
  Maximize2,
  Minimize2,
  Sparkles,
  BookOpen,
} from 'lucide-react';

export interface ResearchNode {
  id: string;
  numbering: string; // e.g. "1.0", "1.1", "1.1.1"
  title: string;
  level: number; // 1, 2, 3
  summary?: string;
  facts: string[];
  sources?: Array<{ name: string; url?: string }>;
  children: ResearchNode[];
}

export interface ResearchTreeData {
  topic: string;
  overview?: string;
  nodes: ResearchNode[];
  totalFacts: number;
  totalSources: number;
}

/**
 * Intelligent parser that converts numbered markdown research outputs
 * into a structured hierarchy tree.
 */
export function parseMarkdownToResearchTree(content: string): ResearchTreeData | null {
  if (!content || typeof content !== 'string') return null;

  const lines = content.split('\n');
  const rootNodes: ResearchNode[] = [];
  let currentL1: ResearchNode | null = null;
  let currentL2: ResearchNode | null = null;
  let currentL3: ResearchNode | null = null;

  let topic = '';
  let overview = '';
  let totalFacts = 0;
  const sourcesSet = new Set<string>();

  // Extract topic from first H1 or H2
  for (const line of lines) {
    const trimmed = line.trim();
    if (!topic && /^#+\s+(.+)$/.test(trimmed)) {
      topic = trimmed.replace(/^#+\s+/, '').replace(/^(\d+(\.\d+)*\s*[-:.]?\s*)/, '');
      break;
    }
  }

  // Regexes for numbered sections:
  // e.g. "### 1.0 العنوان", "## 1.1 العنوان", "1.0: العنوان", "1.1 - العنوان", "1.1.1 العنوان"
  const l1Regex = /^(?:#{1,3}\s*)?(\d+)\.0(?:\s*[:.-]|\s+)(.+)$/;
  const l2Regex = /^(?:#{2,4}\s*)?(\d+\.\d+)(?:\s*[:.-]|\s+)(.+)$/;
  const l3Regex = /^(?:#{3,5}\s*)?(\d+\.\d+\.\d+)(?:\s*[:.-]|\s+)(.+)$/;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();
    if (!trimmed) continue;

    // Check Level 3 (e.g. 1.1.1)
    const m3 = trimmed.match(l3Regex);
    if (m3 && m3[1].split('.').length === 3) {
      const num = m3[1];
      const title = m3[2].trim().replace(/\*\*/g, '');
      const node: ResearchNode = {
        id: `node-${num}`,
        numbering: num,
        title,
        level: 3,
        facts: [],
        sources: [],
        children: [],
      };
      if (currentL2) {
        currentL2.children.push(node);
      } else if (currentL1) {
        currentL1.children.push(node);
      } else {
        rootNodes.push(node);
      }
      currentL3 = node;
      continue;
    }

    // Check Level 1 (e.g. 1.0 or 2.0)
    const m1 = trimmed.match(l1Regex);
    if (m1) {
      const num = `${m1[1]}.0`;
      const title = m1[2].trim().replace(/\*\*/g, '');
      const node: ResearchNode = {
        id: `node-${num}`,
        numbering: num,
        title,
        level: 1,
        facts: [],
        sources: [],
        children: [],
      };
      rootNodes.push(node);
      currentL1 = node;
      currentL2 = null;
      currentL3 = null;
      continue;
    }

    // Check Level 2 (e.g. 1.1 or 2.3)
    const m2 = trimmed.match(l2Regex);
    if (m2 && m2[1].split('.').length === 2) {
      const num = m2[1];
      const title = m2[2].trim().replace(/\*\*/g, '');
      const node: ResearchNode = {
        id: `node-${num}`,
        numbering: num,
        title,
        level: 2,
        facts: [],
        sources: [],
        children: [],
      };
      if (currentL1) {
        currentL1.children.push(node);
      } else {
        rootNodes.push(node);
      }
      currentL2 = node;
      currentL3 = null;
      continue;
    }

    // Capture facts or bullet points under the active node
    const activeNode = currentL3 || currentL2 || currentL1;
    if (activeNode) {
      if (/^[-*•]\s+/.test(trimmed) || /^\d+\.\s+/.test(trimmed)) {
        const cleanBullet = trimmed
          .replace(/^[-*•]\s+/, '')
          .replace(/^\d+\.\s+/, '')
          .trim();

        // Extract sources if formatted inside bullet e.g. [المصدر: اسم المصدر (رابط)]
        const sourceMatch = cleanBullet.match(/\[(?:المصدر|Source|Ref):\s*([^\]]+)\]/i);
        if (sourceMatch) {
          const srcText = sourceMatch[1].trim();
          let srcName = srcText;
          let srcUrl = '';
          const urlMatch = srcText.match(/https?:\/\/[^\s)]+/);
          if (urlMatch) {
            srcUrl = urlMatch[0];
            srcName = srcText.replace(srcUrl, '').replace(/[()]/g, '').trim() || srcUrl;
          }
          activeNode.sources = activeNode.sources || [];
          activeNode.sources.push({ name: srcName, url: srcUrl });
          sourcesSet.add(srcName);
        }

        activeNode.facts.push(cleanBullet);
        totalFacts++;
      } else if (!activeNode.summary && trimmed.length > 20 && !trimmed.startsWith('#')) {
        activeNode.summary = trimmed.replace(/\*\*/g, '');
      }
    } else if (!overview && trimmed.length > 30 && !trimmed.startsWith('#')) {
      overview = trimmed.replace(/\*\*/g, '');
    }
  }

  // If at least 2 nodes were recognized with numbering, return valid tree
  if (rootNodes.length >= 2 || (rootNodes.length >= 1 && rootNodes[0].children.length >= 1)) {
    return {
      topic: topic || 'شجرة البحث المعمق المنظم',
      overview,
      nodes: rootNodes,
      totalFacts,
      totalSources: sourcesSet.size,
    };
  }

  return null;
}

interface TreeNodeItemProps {
  node: ResearchNode;
  isExpanded: boolean;
  onToggle: (id: string) => void;
  expandedMap: Record<string, boolean>;
}

const TreeNodeItem: React.FC<TreeNodeItemProps> = ({
  node,
  isExpanded,
  onToggle,
  expandedMap,
}) => {
  const hasChildren = node.children && node.children.length > 0;
  const hasFacts = node.facts && node.facts.length > 0;
  const hasSources = node.sources && node.sources.length > 0;

  // Level-based styling
  const levelStyles = {
    1: 'border-r-4 border-r-blue-500 bg-[var(--bg)]/80 hover:bg-[var(--bg)]',
    2: 'border-r-3 border-r-emerald-500 bg-[var(--card)]/90 hover:bg-[var(--card)] ms-3 sm:ms-5',
    3: 'border-r-2 border-r-amber-500 bg-[var(--bg)]/50 hover:bg-[var(--bg)]/90 ms-6 sm:ms-10',
  }[node.level as 1 | 2 | 3] || 'border-r-2 border-r-[var(--line)] ms-4';

  const badgeStyles = {
    1: 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30',
    2: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
    3: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
  }[node.level as 1 | 2 | 3] || 'bg-gray-500/15 text-gray-700 border-gray-500/30';

  return (
    <div className="space-y-2 transition-all">
      {/* Node Header Card */}
      <div
        onClick={() => onToggle(node.id)}
        className={`p-3 rounded-2xl border border-[var(--line)] shadow-2xs cursor-pointer transition-all select-none group ${levelStyles}`}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            {/* Numbering Badge */}
            <span
              className={`font-mono text-[11px] sm:text-xs font-black px-2 py-0.5 rounded-lg border shrink-0 ${badgeStyles}`}
            >
              {node.numbering}
            </span>

            {/* Title */}
            <h4 className="text-xs sm:text-[13px] font-bold text-[var(--ink)] tracking-tight truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              {node.title}
            </h4>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {hasChildren && (
              <span className="text-[10px] font-mono text-[var(--mute)] bg-[var(--card)] px-1.5 py-0.5 rounded border border-[var(--line)]">
                {node.children.length} {node.children.length === 1 ? 'فرع' : 'فروع'}
              </span>
            )}
            <div className="w-5 h-5 rounded-md flex items-center justify-center text-[var(--mute)] group-hover:text-[var(--ink)] transition-colors">
              {isExpanded ? (
                <ChevronDown className="w-3.5 h-3.5" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 rtl:rotate-180" />
              )}
            </div>
          </div>
        </div>

        {/* Short Summary (if available) */}
        {node.summary && (
          <p className="text-[11px] text-[var(--mute)] mt-1.5 line-clamp-2 leading-relaxed ps-1">
            {node.summary}
          </p>
        )}
      </div>

      {/* Expanded Content (Facts, Sources, and Sub-Branches) */}
      {isExpanded && (
        <div className="space-y-2 ps-2 sm:ps-4 border-r border-dashed border-[var(--line)]/80 ms-2 me-1 animate-in fade-in duration-150">
          {/* Detailed Facts list */}
          {hasFacts && (
            <div className="space-y-1.5 py-1">
              {node.facts.map((fact, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-2 p-2 rounded-xl bg-[var(--bg)]/60 border border-[var(--line)]/50 text-[11.5px] leading-relaxed text-[var(--ink)]"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                  <span className="flex-1">{fact}</span>
                </div>
              ))}
            </div>
          )}

          {/* Sources under this node */}
          {hasSources && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {node.sources!.map((src, sIdx) => (
                <span
                  key={sIdx}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-blue-500/10 border border-blue-500/25 text-blue-700 dark:text-blue-300 text-[10px] font-semibold"
                  title={src.name}
                >
                  <span>{src.name}</span>
                  {src.url && (
                    <a
                      href={src.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-blue-500"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  )}
                </span>
              ))}
            </div>
          )}

          {/* Render Nested Children Sub-Branches */}
          {hasChildren && (
            <div className="space-y-2 pt-1">
              {node.children.map((child) => (
                <TreeNodeItem
                  key={child.id}
                  node={child}
                  isExpanded={Boolean(expandedMap[child.id])}
                  onToggle={onToggle}
                  expandedMap={expandedMap}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export interface InteractiveResearchTreeProps {
  treeData: ResearchTreeData;
  isRtl?: boolean;
}

export const InteractiveResearchTree: React.FC<InteractiveResearchTreeProps> = React.memo(({
  treeData,
  isRtl = true,
}) => {
  // Initially expand top-level nodes
  const [expandedMap, setExpandedMap] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    const expandRec = (nodes: ResearchNode[]) => {
      nodes.forEach((n) => {
        initial[n.id] = true;
        if (n.children) expandRec(n.children);
      });
    };
    expandRec(treeData.nodes);
    return initial;
  });

  const [copied, setCopied] = useState(false);

  const toggleNode = (id: string) => {
    setExpandedMap((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const expandAll = () => {
    const allExp: Record<string, boolean> = {};
    const rec = (nodes: ResearchNode[]) => {
      nodes.forEach((n) => {
        allExp[n.id] = true;
        if (n.children) rec(n.children);
      });
    };
    rec(treeData.nodes);
    setExpandedMap(allExp);
  };

  const collapseAll = () => {
    setExpandedMap({});
  };

  const copyTreeOutline = () => {
    const lines: string[] = [`# ${treeData.topic}\n`];
    if (treeData.overview) lines.push(`${treeData.overview}\n`);

    const formatRec = (nodes: ResearchNode[], depth = 0) => {
      nodes.forEach((n) => {
        const indent = '  '.repeat(depth);
        lines.push(`${indent}- **${n.numbering} ${n.title}**`);
        if (n.summary) lines.push(`${indent}  ${n.summary}`);
        n.facts.forEach((f) => lines.push(`${indent}    • ${f}`));
        if (n.children && n.children.length > 0) {
          formatRec(n.children, depth + 1);
        }
      });
    };
    formatRec(treeData.nodes);

    if (navigator.clipboard) {
      navigator.clipboard.writeText(lines.join('\n'));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div
      dir={isRtl ? 'rtl' : 'ltr'}
      className="w-full my-4 rounded-3xl bg-[var(--card)]/90 border border-[var(--line)] shadow-xs overflow-hidden transition-all"
    >
      {/* Research Tree Header */}
      <div className="p-3.5 sm:p-4 bg-[var(--bg)] border-b border-[var(--line)]/70 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-emerald-600 text-white flex items-center justify-center shadow-xs">
            <GitBranch className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs sm:text-sm font-black text-[var(--ink)] tracking-tight">
                {treeData.topic}
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5" />
                <span>هيكل شجري معتمد</span>
              </span>
            </div>
            <div className="flex items-center gap-3 text-[10.5px] text-[var(--mute)] mt-0.5 font-medium">
              <span>{treeData.nodes.length} محاور رئيسية</span>
              <span>·</span>
              <span>{treeData.totalFacts} حقائق موثقة</span>
              {treeData.totalSources > 0 && (
                <>
                  <span>·</span>
                  <span>{treeData.totalSources} مصادر بحث</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Tree Control Actions */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={expandAll}
            className="px-2 py-1 rounded-lg bg-[var(--card)] hover:bg-[var(--line)]/40 border border-[var(--line)] text-[10.5px] font-bold text-[var(--ink)] flex items-center gap-1 cursor-pointer transition-colors"
            title="توسيع كافة الفروع"
          >
            <Maximize2 className="w-3 h-3 text-blue-500" />
            <span className="hidden sm:inline">توسيع الكل</span>
          </button>

          <button
            type="button"
            onClick={collapseAll}
            className="px-2 py-1 rounded-lg bg-[var(--card)] hover:bg-[var(--line)]/40 border border-[var(--line)] text-[10.5px] font-bold text-[var(--ink)] flex items-center gap-1 cursor-pointer transition-colors"
            title="طي كافة الفروع"
          >
            <Minimize2 className="w-3 h-3 text-amber-500" />
            <span className="hidden sm:inline">طي الكل</span>
          </button>

          <button
            type="button"
            onClick={copyTreeOutline}
            className="px-2 py-1 rounded-lg bg-[var(--card)] hover:bg-[var(--line)]/40 border border-[var(--line)] text-[10.5px] font-bold text-[var(--ink)] flex items-center gap-1 cursor-pointer transition-colors"
            title="نسخ مخطط الهيكل الشجري"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-emerald-500" />
                <span className="text-emerald-600 dark:text-emerald-400">تم النسخ</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3 text-[var(--mute)]" />
                <span className="hidden sm:inline">نسخ المخطط</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Topic Overview (if present) */}
      {treeData.overview && (
        <div className="px-4 py-2.5 bg-blue-500/5 border-b border-[var(--line)]/50 text-[11.5px] leading-relaxed text-[var(--ink)] flex items-start gap-2">
          <BookOpen className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
          <p className="m-0">{treeData.overview}</p>
        </div>
      )}

      {/* Collapsible Nodes Tree Container */}
      <div className="p-3.5 sm:p-4 space-y-2.5 max-h-[600px] overflow-y-auto">
        {treeData.nodes.map((node) => (
          <TreeNodeItem
            key={node.id}
            node={node}
            isExpanded={Boolean(expandedMap[node.id])}
            onToggle={toggleNode}
            expandedMap={expandedMap}
          />
        ))}
      </div>
    </div>
  );
});

export default InteractiveResearchTree;
