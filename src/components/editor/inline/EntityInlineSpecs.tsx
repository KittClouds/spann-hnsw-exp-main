
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
const TagInline = ({ inline }: { inline: any }) => (
  <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-bold border ${ENTITY_COLORS.tag} cursor-pointer hover:opacity-80 transition-opacity`}>
    #{inline.props.text}
  </span>
);

// Mention inline component
const MentionInline = ({ inline }: { inline: any }) => (
  <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-bold border ${ENTITY_COLORS.mention} cursor-pointer hover:opacity-80 transition-opacity`}>
    @{inline.props.text}
  </span>
);

// Wiki link inline component
const WikiLinkInline = ({ inline }: { inline: any }) => (
  <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-bold border ${ENTITY_COLORS.wikilink} cursor-pointer hover:opacity-80 transition-opacity`}>
    {inline.props.text}
  </span>
);

// Entity inline component
const EntityInline = ({ inline }: { inline: any }) => (
  <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-bold border ${ENTITY_COLORS.entity} cursor-pointer hover:opacity-80 transition-opacity`}>
    <span className="text-xs opacity-70">{inline.props.kind}</span>
    {inline.props.label}
  </span>
);

// Triple inline component
const TripleInline = ({ inline }: { inline: any }) => (
  <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-bold border ${ENTITY_COLORS.triple} cursor-pointer hover:opacity-80 transition-opacity`}>
    <span className="opacity-70">{inline.props.subject.kind}</span>
    {inline.props.subject.label}
    <span className="opacity-60 mx-1">({inline.props.predicate})</span>
    <span className="opacity-70">{inline.props.object.kind}</span>
    {inline.props.object.label}
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
    serialize: (inline) => `#${inline.props.text}`
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
    serialize: (inline) => `@${inline.props.text}`
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
    serialize: (inline) => `[[${inline.props.text}]]`
  }
);

export const EntityInlineSpec = createReactInlineContentSpec(
  {
    type: "entity",
    propSchema: {
      kind: { default: "" },
      label: { default: "" },
      attributes: { default: {} }
    },
    content: "none"
  },
  {
    render: EntityInline,
    serialize: (inline) => {
      const attrs = inline.props.attributes && Object.keys(inline.props.attributes).length > 0
        ? `|${JSON.stringify(inline.props.attributes)}`
        : '';
      return `[${inline.props.kind}|${inline.props.label}${attrs}]`;
    }
  }
);

export const TripleInlineSpec = createReactInlineContentSpec(
  {
    type: "triple",
    propSchema: {
      subject: { default: { kind: "", label: "" } },
      predicate: { default: "" },
      object: { default: { kind: "", label: "" } }
    },
    content: "none"
  },
  {
    render: TripleInline,
    serialize: (inline) => {
      const { subject, predicate, object } = inline.props;
      return `[${subject.kind}|${subject.label}] (${predicate}) [${object.kind}|${object.label}]`;
    }
  }
);
