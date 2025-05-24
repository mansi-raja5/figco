// src/utils/parser.js

/**
 * Parses a Figma node to a React component string
 * @param {Object} node - The Figma node object
 * @returns {string} - The React component string
 */
export const parseNodeToComponent = (node) => {
  if (!node) return '';

  // Helper function to generate style string from node properties
  const generateStyles = (node) => {
    const styles = {
      width: node.absoluteBoundingBox?.width ? `${node.absoluteBoundingBox.width}px` : 'auto',
      height: node.absoluteBoundingBox?.height ? `${node.absoluteBoundingBox.height}px` : 'auto',
      position: 'relative',
      display: node.layoutMode === 'VERTICAL' ? 'flex' : 'block',
      flexDirection: node.layoutMode === 'VERTICAL' ? 'column' : 'row',
      gap: node.itemSpacing ? `${node.itemSpacing}px` : '0',
      padding: node.paddingTop ? `${node.paddingTop}px ${node.paddingRight}px ${node.paddingBottom}px ${node.paddingLeft}px` : '0',
      backgroundColor: node.backgroundColor ? `rgba(${Object.values(node.backgroundColor).map((c, i) => i < 3 ? Math.round(c * 255) : c).join(',')})` : 'transparent',
      borderRadius: node.cornerRadius ? `${node.cornerRadius}px` : '0',
    };

    return Object.entries(styles)
      .filter(([_, value]) => value !== undefined && value !== 'auto' && value !== '0' && value !== 'transparent')
      .map(([key, value]) => `${key}: ${value}`)
      .join('; ');
  };

  // Helper function to parse color
  const parseColor = (color) => {
    if (!color) return 'transparent';
    const { r, g, b, a = 1 } = color;
    return `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${a})`;
  };

  // Helper function to parse effects
  const parseEffects = (effects) => {
    if (!effects || !effects.length) return '';
    
    return effects.map(effect => {
      switch (effect.type) {
        case 'DROP_SHADOW':
          return `box-shadow: ${effect.offset.x}px ${effect.offset.y}px ${effect.radius}px ${parseColor(effect.color)}`;
        case 'INNER_SHADOW':
          return `box-shadow: inset ${effect.offset.x}px ${effect.offset.y}px ${effect.radius}px ${parseColor(effect.color)}`;
        case 'LAYER_BLUR':
          return `filter: blur(${effect.radius}px)`;
        case 'BACKGROUND_BLUR':
          return `backdrop-filter: blur(${effect.radius}px)`;
        default:
          return '';
      }
    }).filter(Boolean).join('; ');
  };

  switch (node.type) {
    case 'DOCUMENT':
      return `<div className="document">${node.children?.map(child => parseNodeToComponent(child)).join('') || ''}</div>`;

    case 'CANVAS':
      return `<div className="canvas" style="${generateStyles(node)}">${node.children?.map(child => parseNodeToComponent(child)).join('') || ''}</div>`;

    case 'FRAME':
      return `<div className="frame ${node.name.toLowerCase().replace(/\s+/g, '-')}" style="${generateStyles(node)}">${node.children?.map(child => parseNodeToComponent(child)).join('') || ''}</div>`;

    case 'GROUP':
      return `<div className="group ${node.name.toLowerCase().replace(/\s+/g, '-')}" style="${generateStyles(node)}">${node.children?.map(child => parseNodeToComponent(child)).join('') || ''}</div>`;

    case 'VECTOR':
      // For vectors, we'd ideally convert the vector data to SVG, but for now we'll create a placeholder
      return `<div className="vector" style="width: ${node.absoluteBoundingBox?.width}px; height: ${node.absoluteBoundingBox?.height}px;"></div>`;

    case 'BOOLEAN_OPERATION':
      // Boolean operations (union, intersection, etc.) are rendered as their resulting shape
      return `<div className="boolean-operation" style="${generateStyles(node)}">${node.children?.map(child => parseNodeToComponent(child)).join('') || ''}</div>`;

    case 'STAR':
    case 'LINE':
    case 'ELLIPSE':
    case 'REGULAR_POLYGON':
      // These shapes would ideally be converted to SVG elements
      return `<div className="${node.type.toLowerCase()}" style="${generateStyles(node)}"></div>`;

    case 'RECTANGLE':
      const background = node.fills?.[0]?.type === 'SOLID' 
        ? `background-color: ${parseColor(node.fills[0].color)}` 
        : node.fills?.[0]?.type === 'IMAGE'
        ? `background-image: url('/images/Image_${node.fills[0].imageRef}.png')`
        : '';
      
      // Check if the rectangle is clickable (has onClick event or is marked as interactive)
      const isClickable = node.name.toLowerCase().includes('button') || 
                         node.reactions?.length > 0 || 
                         node.name.toLowerCase().includes('clickable');
      
      if (isClickable) {
        const buttonStyles = {
          ...generateStyles(node),
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '8px 16px',
          border: 'none',
          outline: 'none',
          backgroundColor: node.fills?.[0]?.type === 'SOLID' ? parseColor(node.fills[0].color) : '#007bff',
          color: '#ffffff',
          borderRadius: node.cornerRadius ? `${node.cornerRadius}px` : '4px',
          transition: 'background-color 0.2s ease',
        };
        const buttonStyleString = Object.entries(buttonStyles)
          .filter(([_, value]) => value !== undefined)
          .map(([key, value]) => `${key}: ${value}`)
          .join('; ');
        return `<button className="button" style="${buttonStyleString}">
          ${node.children?.map(child => parseNodeToComponent(child)).join('') || node.name || 'Button'}
        </button>`;
      }
      
      return `<div className="rectangle" style="${generateStyles(node)}; ${background}"></div>`;

    case 'TEXT':
      const isHeading = node.name.toLowerCase().includes('heading') || 
                       (node.style?.fontSize && node.style.fontSize >= 24) ||
                       node.style?.fontWeight >= 600;
      
      const textStyles = {
        fontSize: node.style?.fontSize ? `${node.style.fontSize}px` : 'inherit',
        fontWeight: node.style?.fontWeight || (isHeading ? '600' : 'normal'),
        fontFamily: node.style?.fontFamily || 'inherit',
        letterSpacing: node.style?.letterSpacing ? `${node.style.letterSpacing}px` : 'normal',
        lineHeight: node.style?.lineHeightPx ? `${node.style.lineHeightPx}px` : 'normal',
        textAlign: node.style?.textAlignHorizontal?.toLowerCase() || 'left',
        color: node.fills?.[0]?.type === 'SOLID' ? parseColor(node.fills[0].color) : 'inherit',
        margin: isHeading ? '0 0 0.5em 0' : 'inherit',
      };
      
      const textStyleString = Object.entries(textStyles)
        .filter(([_, value]) => value !== 'inherit' && value !== 'normal')
        .map(([key, value]) => `${key}: ${value}`)
        .join('; ');

      if (isHeading) {
        // Determine heading level based on font size or name
        let headingLevel = 1;
        if (node.style?.fontSize) {
          if (node.style.fontSize < 30) headingLevel = 2;
          if (node.style.fontSize < 24) headingLevel = 3;
          if (node.style.fontSize < 20) headingLevel = 4;
        }
        // Check if heading level is specified in the name (h1, h2, etc.)
        const headingMatch = node.name.match(/h[1-6]/i);
        if (headingMatch) {
          headingLevel = parseInt(headingMatch[0].charAt(1));
        }
        return `<h${headingLevel} className="heading" style="${textStyleString}">${node.characters || ''}</h${headingLevel}>`;
      }

      return `<p className="text" style="${textStyleString}">${node.characters || ''}</p>`;

    case 'COMPONENT':
    case 'COMPONENT_SET':
    case 'INSTANCE':
      // Components and instances are rendered similar to frames
      return `<div className="${node.type.toLowerCase()} ${node.name.toLowerCase().replace(/\s+/g, '-')}" style="${generateStyles(node)}">${node.children?.map(child => parseNodeToComponent(child)).join('') || ''}</div>`;

    case 'STICKY':
    case 'SHAPE_WITH_TEXT':
    case 'STAMP':
      // These are specialized containers that can contain text and other elements
      return `<div className="${node.type.toLowerCase()}" style="${generateStyles(node)}">${node.children?.map(child => parseNodeToComponent(child)).join('') || ''}</div>`;

    case 'SECTION':
      // Sections are organizational containers in Figma
      return `<section className="section ${node.name.toLowerCase().replace(/\s+/g, '-')}" style="${generateStyles(node)}">${node.children?.map(child => parseNodeToComponent(child)).join('') || ''}</section>`;

    case 'TABLE':
      // Tables require special handling to maintain their structure
      return `<div className="table" style="${generateStyles(node)}">${node.children?.map(child => parseNodeToComponent(child)).join('') || ''}</div>`;

    case 'CONNECTOR':
      // Connectors are typically used in diagrams and flows
      return `<div className="connector" style="${generateStyles(node)}"></div>`;

    case 'CODE_BLOCK':
      // Code blocks should preserve formatting
      return `<pre className="code-block" style="${generateStyles(node)}"><code>${node.characters || ''}</code></pre>`;

    case 'EMBED':
      // Embedded content placeholder
      return `<div className="embed" style="${generateStyles(node)}">Embedded content: ${node.name}</div>`;

    case 'LINK':
      // Links should maintain their href
      return `<a href="${node.url || '#'}" className="link" style="${generateStyles(node)}">${node.children?.map(child => parseNodeToComponent(child)).join('') || node.name}</a>`;

    case 'SLICE':
      // Slices are export regions
      return `<div className="slice" style="${generateStyles(node)}"></div>`;

    case 'WIDGET':
      // Widgets are external plugins or components
      return `<div className="widget" style="${generateStyles(node)}">Widget: ${node.name}</div>`;

    case 'SHAPE':
      // Generic shape container
      return `<div className="shape" style="${generateStyles(node)}">${node.children?.map(child => parseNodeToComponent(child)).join('') || ''}</div>`;

    case 'INPUT':
      const inputStyles = {
        ...generateStyles(node),
        padding: '8px 12px',
        border: '1px solid #ddd',
        borderRadius: '4px',
        fontSize: node.style?.fontSize ? `${node.style.fontSize}px` : '16px',
      };
      const inputStyleString = Object.entries(inputStyles)
        .filter(([_, value]) => value !== undefined)
        .map(([key, value]) => `${key}: ${value}`)
        .join('; ');
      return `<input
        type="text"
        className="input-field"
        placeholder="${node.characters || ''}"
        style="${inputStyleString}"
      />`;

    case 'COMBOBOX':
      const selectStyles = {
        ...generateStyles(node),
        padding: '8px 12px',
        border: '1px solid #ddd',
        borderRadius: '4px',
        fontSize: node.style?.fontSize ? `${node.style.fontSize}px` : '16px',
        backgroundColor: 'white',
      };
      const selectStyleString = Object.entries(selectStyles)
        .filter(([_, value]) => value !== undefined)
        .map(([key, value]) => `${key}: ${value}`)
        .join('; ');
      // Extract options from node's children or use placeholder options
      const options = node.children?.map(child => child.characters) || ['Option 1', 'Option 2'];
      return `<select className="select-field" style="${selectStyleString}">
        ${options.map(option => `<option value="${option}">${option}</option>`).join('\n')}
      </select>`;

    case 'RADIO':
      const radioStyles = {
        ...generateStyles(node),
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
      };
      const radioStyleString = Object.entries(radioStyles)
        .filter(([_, value]) => value !== undefined)
        .map(([key, value]) => `${key}: ${value}`)
        .join('; ');
      const radioId = `radio-${node.id || Math.random().toString(36).substr(2, 9)}`;
      return `<div style="${radioStyleString}">
        <input
          type="radio"
          id="${radioId}"
          name="${node.name || 'radio-group'}"
          className="radio-input"
        />
        <label htmlFor="${radioId}" className="radio-label">
          ${node.characters || 'Radio Option'}
        </label>
      </div>`;

    default:
      // For any unhandled node types, create a generic container
      return `<div className="unknown-type" style="${generateStyles(node)}">${node.children?.map(child => parseNodeToComponent(child)).join('') || ''}</div>`;
  }
};

/**
 * Extracts all text content from a Figma node tree
 * @param {Object} node - The Figma node object
 * @returns {string[]} - Array of text content
 */
export const extractTextContent = (node) => {
  if (!node) return [];
  
  let texts = [];
  
  if (node.type === 'TEXT' && node.characters) {
    texts.push(node.characters);
  }
  
  if (node.children) {
    node.children.forEach(child => {
      texts = texts.concat(extractTextContent(child));
    });
  }
  
  return texts;
};

/**
 * Finds all nodes of a specific type in a Figma node tree
 * @param {Object} node - The Figma node object
 * @param {string} type - The node type to find
 * @returns {Object[]} - Array of matching nodes
 */
export const findNodesByType = (node, type) => {
  if (!node) return [];
  
  let nodes = [];
  
  if (node.type === type) {
    nodes.push(node);
  }
  
  if (node.children) {
    node.children.forEach(child => {
      nodes = nodes.concat(findNodesByType(child, type));
    });
  }
  
  return nodes;
};
  