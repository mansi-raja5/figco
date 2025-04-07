// src/utils/generator.js
import { parseNodeToComponent } from './parser';

export const generateComponents = (node) => {
  if (!node.children) return parseNodeToComponent(node);

  const children = node.children.map(generateComponents).join('\n');
  return `<div>${children}</div>`;
};
