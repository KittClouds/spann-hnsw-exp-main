
import React from 'react';
import { createReactInlineContentSpec } from '@blocknote/react';

// Color configuration for different entity types
export const ENTITY_COLORS = {
  tag: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  mention: 'bg-green-500/20 text-green-400 border-green-500/30',
  wikilink: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  entity: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  triple: 'bg-gradient-to-r from-pink-500/20 to-purple-500/20 text-pink-400 border-pink-500/30'
};

// Tag inline component
const TagInline = ({ inlineContent }: { inlineContent: any }) => (
  <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-bold border ${ENTITY_COLORS.tag} cursor-pointer hover:opacity-80 transition-opacity`}>
    #{inlineContent.props.text}
  </span>
);

// Mention inline component
const MentionInline = ({ inlineContent }: { inlineContent: any }) => (
  <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-bold border ${ENTITY_COLORS.mention} cursor-pointer hover:opacity-80 transition-opacity`}>
    @{inlineContent.props.text}
  </span>
);

// Wiki link inline component
const WikiLinkInline = ({ inlineContent }: { inlineContent: any }) => (
  <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-bold border ${ENTITY_COLORS.wikilink} cursor-pointer hover:opacity-80 transition-opacity`}>
    {inlineContent.props.text}
  </span>
);

// Entity inline component
const EntityInline = ({ inlineContent }: { inlineContent: any }) => (
  <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-bold border ${ENTITY_COLORS.entity} cursor-pointer hover:opacity-80 transition-opacity`}>
    <span className="text-xs opacity-70">{inlineContent.props.kind}</span>
    {inlineContent.props.label}
  </span>
);

// Triple inline component
const TripleInline = ({ inlineContent }: { inlineContent: any }) => (
  <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-bold border ${ENTITY_COLORS.triple} cursor-pointer hover:opacity-80 transition-opacity`}>
    <span className="opacity-70">{inlineContent.props.subjectKind}</span>
    {inlineContent.props.subjectLabel}
    <span className="opacity-60 mx-1">({inlineContent.props.predicate})</span>
    <span className="opacity-70">{inlineContent.props.objectKind}</span>
    {inlineContent.props.objectLabel}
  </span>
);

// Create custom inline content specs
export const TagInlineSpec = createReactInlineContentSpec(
  {
    type: "tag",
    propSchema: {
      text: { default: "" }
    },
    content: "none"
  },
  {
    render: TagInline,
    serialize: (inlineContent) => `#${inlineContent.props.text}`
  }
);

export const MentionInlineSpec = createReactInlineContentSpec(
  {
    type: "mention", 
    propSchema: {
      text: { default: "" }
    },
    content: "none"
  },
  {
    render: MentionInline,
    serialize: (inlineContent) => `@${inlineContent.props.text}`
  }
);

export const WikiLinkInlineSpec = createReactInlineContentSpec(
  {
    type: "wikilink",
    propSchema: {
      text: { default: "" }
    },
    content: "none"
  },
  {
    render: WikiLinkInline,
    serialize: (inlineContent) => `[[${inlineContent.props.text}]]`
  }
);

export const EntityInlineSpec = createReactInlineContentSpec(
  {
    type: "entity",
    propSchema: {
      kind: { default: "" },
      label: { default: "" },
      attributes: { default: "" } // Store as JSON string instead of object
    },
    content: "none"
  },
  {
    render: EntityInline,
    serialize: (inlineContent) => {
      const attrs = inlineContent.props.attributes && inlineContent.props.attributes !== ""
        ? `|${inlineContent.props.attributes}`
        : '';
      return `[${inlineContent.props.kind}|${inlineContent.props.label}${attrs}]`;
    }
  }
);

export const TripleInlineSpec = createReactInlineContentSpec(
  {
    type: "triple",
    propSchema: {
      subjectKind: { default: "" },
      subjectLabel: { default: "" },
      predicate: { default: "" },
      objectKind: { default: "" },
      objectLabel: { default: "" }
    },
    content: "none"
  },
  {
    render: TripleInline,
    serialize: (inlineContent) => {
      const { subjectKind, subjectLabel, predicate, objectKind, objectLabel } = inlineContent.props;
      return `[${subjectKind}|${subjectLabel}] (${predicate}) [${objectKind}|${objectLabel}]`;
    }
  }
);
