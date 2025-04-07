// src/utils/parser.js
export const parseNodeToComponent = (node) => {
    switch (node.type) {
      case 'TEXT':
        return `<p style="font-size:${node.style.fontSize}px">${node.characters}</p>`;
      case 'RECTANGLE':
        return `<div style="width:${node.absoluteBoundingBox.width}px;height:${node.absoluteBoundingBox.height}px;background:${node.fills[0]?.color ? `rgba(${Object.values(node.fills[0].color).map((c, i) => i < 3 ? Math.round(c * 255) : c).join(',')})` : 'none'};"></div>`;
      default:
        return '';
    }
  };
  