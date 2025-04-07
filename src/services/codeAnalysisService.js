export const analyzeCode = (fileContent, fileName) => {
  // Basic metrics calculation
  const metrics = {
    complexity: calculateComplexity(fileContent),
    maintainability: calculateMaintainability(fileContent),
    reliability: calculateReliability(fileContent),
    duplication: calculateDuplication(fileContent),
    coverage: estimateTestability(fileContent)
  };

  // Calculate overall score
  const overallScore = calculateOverallScore(metrics);

  const codeSmells = detectCodeSmells(fileContent);
  
  return {
    fileName,
    metrics,
    overallScore,
    summary: generateSummary(metrics, fileContent),
    codeSmells
  };
};

const calculateComplexity = (code) => {
  let score = 100;
  
  // Cyclomatic complexity estimation
  const conditionals = (code.match(/(if|else|for|while|switch|case|catch)/g) || []).length;
  const functions = (code.match(/(function|=>)/g) || []).length;
  
  // Reduce score based on number of conditionals and functions
  score -= (conditionals * 2);
  score -= (functions * 1);
  
  // Normalize score between 0 and 100
  return Math.max(Math.min(score, 100), 0) + '%';
};

const calculateMaintainability = (code) => {
  let score = 100;
  
  // Check line length
  const lines = code.split('\n');
  const longLines = lines.filter(line => line.length > 80).length;
  
  // Check function length
  const functionMatches = code.match(/function.*?\{([^]*?)\}/g) || [];
  const longFunctions = functionMatches.filter(fn => fn.split('\n').length > 20).length;
  
  score -= (longLines * 1);
  score -= (longFunctions * 5);
  
  return Math.max(Math.min(score, 100), 0) + '%';
};

const calculateReliability = (code) => {
  let score = 100;
  
  // Check error handling
  const errorHandling = (code.match(/(try|catch|throw|finally)/g) || []).length;
  const potentialErrors = (code.match(/(null|undefined|NaN)/g) || []).length;
  
  score += (errorHandling * 2);
  score -= (potentialErrors * 2);
  
  return Math.max(Math.min(score, 100), 0) + '%';
};

const calculateDuplication = (code) => {
  // Simple duplication check
  const lines = code.split('\n').map(line => line.trim());
  const uniqueLines = new Set(lines);
  
  const duplicationRate = ((lines.length - uniqueLines.size) / lines.length) * 100;
  return Math.round(duplicationRate) + '%';
};

const estimateTestability = (code) => {
  let score = 75; // Base score
  
  // Check for testable patterns
  const hasExports = code.includes('export');
  const hasPureFunction = code.match(/function\s+\w+\s*\([^)]*\)\s*{[^}]*return/g);
  const hasStateManagement = code.includes('useState') || code.includes('useReducer');
  
  if (hasExports) score += 5;
  if (hasPureFunction) score += 10;
  if (hasStateManagement) score += 5;
  
  return Math.min(score, 100) + '%';
};

const calculateOverallScore = (metrics) => {
  const scores = Object.values(metrics).map(value => parseInt(value));
  const average = scores.reduce((a, b) => a + b, 0) / scores.length;
  return Math.round(average);
};

const generateSummary = (metrics, code) => {
  const practices = [];
  
  // Analyze code practices
  if (code.includes('console.log')) {
    practices.push('Remove console.log statements in production code');
  }
  
  if (code.match(/function\s*\(\)\s*{/g)) {
    practices.push('Consider using named functions for better debugging');
  }
  
  if (code.includes('var ')) {
    practices.push('Replace var with const/let for better scoping');
  }

  return {
    practices,
    organization: metrics.maintainability > 80 ? 'Excellent' : 'Good',
    performance: metrics.complexity > 80 ? 'Good' : 'Moderate'
  };
};

// Add code smells detection
const detectCodeSmells = (code) => {
  const smells = [];
  
  // Long function detection
  const functionMatches = code.match(/function.*?\{([^]*?)\}/g) || [];
  functionMatches.forEach(func => {
    const lines = func.split('\n').length;
    if (lines > 20) {
      smells.push({
        type: 'Long Function',
        description: `Function with ${lines} lines detected. Consider breaking it down.`
      });
    }
  });

  // Magic numbers
  const magicNumbers = code.match(/[^0-9a-zA-Z][-+]?[0-9]+(?:\.[0-9]+)?(?![0-9a-zA-Z])/g) || [];
  if (magicNumbers.length > 3) {
    smells.push({
      type: 'Magic Numbers',
      description: `${magicNumbers.length} magic numbers found. Consider using named constants.`
    });
  }

  // Long parameter list
  const longParams = code.match(/function.*?\((.*?)\)/g) || [];
  longParams.forEach(func => {
    const params = func.match(/,/g) || [];
    if (params.length >= 3) {
      smells.push({
        type: 'Long Parameter List',
        description: 'Function has more than 3 parameters. Consider using an object parameter.'
      });
    }
  });

  // Nested callbacks/promises
  const nestedCallbacks = (code.match(/\.then\(/g) || []).length;
  if (nestedCallbacks > 2) {
    smells.push({
      type: 'Callback Hell',
      description: 'Multiple nested promises detected. Consider using async/await.'
    });
  }

  // Console statements
  const consoleStatements = (code.match(/console\.(log|warn|error)/g) || []).length;
  if (consoleStatements > 0) {
    smells.push({
      type: 'Debug Statements',
      description: `${consoleStatements} console statements found. Remove in production.`
    });
  }

  return smells;
}; 