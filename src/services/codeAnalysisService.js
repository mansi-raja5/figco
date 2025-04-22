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
  // Start with a base score of 70%
  let score = 70;
  
  // Check line length (max -20)
  const lines = code.split('\n');
  const longLines = lines.filter(line => line.length > 80).length;
  score -= Math.min(longLines * 2, 20);
  
  // Check function length (max -20)
  const functionMatches = code.match(/function.*?\{([^]*?)\}/g) || [];
  const longFunctions = functionMatches.filter(fn => fn.split('\n').length > 20).length;
  score -= Math.min(longFunctions * 5, 20);
  
  // Check component complexity (max -15)
  const hasMultipleStates = (code.match(/useState/g) || []).length > 3;
  const hasNestedJSX = code.includes('>{') || code.includes('</') || code.includes('/>');
  if (hasMultipleStates) score -= 10;
  if (hasNestedJSX) score -= 5;
  
  // Check naming conventions (max +15)
  const hasDescriptiveNames = !code.match(/\b[a-z]{1,2}\b(?!:)/g); // Look for single/double letter variables
  const followsConventions = code.match(/[A-Z][a-zA-Z]+\s*=/g); // Component/constant naming
  if (hasDescriptiveNames) score += 10;
  if (followsConventions) score += 5;
  
  // Check code organization (max +15)
  const hasComments = (code.match(/\/\//g) || []).length > 0;
  const hasJSDoc = code.includes('/**') || code.includes('@param') || code.includes('@return');
  const hasImports = code.match(/import.*from/g);
  if (hasComments) score += 5;
  if (hasJSDoc) score += 5;
  if (hasImports) score += 5;
  
  // Check for code smells (max -15)
  const magicNumbers = (code.match(/\b\d+\b/g) || []).length > 5;
  const hasInlineStyles = code.includes('style={{');
  const hasDuplicateCode = new Set(code.split('\n')).size < code.split('\n').length * 0.8;
  if (magicNumbers) score -= 5;
  if (hasInlineStyles) score -= 5;
  if (hasDuplicateCode) score -= 5;

  // Ensure score stays between 0 and 100
  return Math.max(Math.min(score, 100), 0) + '%';
};

const calculateReliability = (code) => {
  // Start with a base score of 50%
  let score = 50;
  
  // Type safety checks (max +15)
  const hasTypeScript = code.includes(': React.') || code.includes(': JSX.') || code.includes(': Props');
  const hasInterfaces = code.includes('interface ') || code.includes('type ');
  if (hasTypeScript) score += 10;
  if (hasInterfaces) score += 5;

  // Error handling checks (max +15)
  const errorHandling = (code.match(/(try|catch|throw|finally)/g) || []).length;
  const hasErrorBoundary = code.includes('ErrorBoundary');
  score += Math.min(errorHandling * 3, 10);
  if (hasErrorBoundary) score += 5;

  // Loading states (max +10)
  const hasLoadingStates = code.includes('loading') || code.includes('isLoading');
  const hasLoadingUI = code.includes('Spinner') || code.includes('Loading');
  if (hasLoadingStates) score += 5;
  if (hasLoadingUI) score += 5;

  // Input validation (max +10)
  const hasValidation = code.includes('validate') || code.includes('validation');
  const hasSanitization = code.includes('sanitize') || code.includes('escape');
  if (hasValidation) score += 5;
  if (hasSanitization) score += 5;

  // Deductions for unsafe practices
  // Images without error handling (-10 each, max -30)
  const unsafeImages = (code.match(/src=["'][^"']+["'](?![^<>]*onError)/g) || []).length;
  score -= Math.min(unsafeImages * 10, 30);

  // Console statements (-2 each, max -10)
  const consoleStatements = (code.match(/console\.(log|warn|error)/g) || []).length;
  score -= Math.min(consoleStatements * 2, 10);

  // Direct DOM manipulation (-5 each, max -15)
  const domManipulation = (code.match(/document\.(getElementById|querySelector)/g) || []).length;
  score -= Math.min(domManipulation * 5, 15);

  // Ensure score stays between 0 and 100
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
  
  // Analyze the code and add relevant suggestions
  const codePatterns = {
    inlineStyles: (code.match(/style={{/g) || []).length,
    consoleStatements: (code.match(/console\.(log|warn|error)/g) || []).length,
    imageWithoutError: (code.match(/src=["'][^"']+["'](?![^<>]*onError)/g) || []).length,
    anonymousFunctions: (code.match(/function\s*\(\)\s*{/g) || []).length,
    stateVariables: (code.match(/useState/g) || []).length,
    arrayOperations: (code.match(/\.(map|filter|reduce)\(/g) || []).length
  };

  console.error('Performance Analysis:');
  console.error('Code patterns found:', JSON.stringify(codePatterns, null, 2));

  // Add suggestions based on actual code analysis
  Object.entries(codePatterns).forEach(([pattern, count]) => {
    if (count > 0) {
      switch (pattern) {
        case 'inlineStyles':
          practices.push(`Consider moving ${count} inline style(s) to CSS files`);
          break;
        case 'consoleStatements':
          practices.push(`Remove ${count} console statement(s)`);
          break;
        case 'imageWithoutError':
          practices.push(`Add error handling for ${count} image(s)`);
          break;
        case 'anonymousFunctions':
          practices.push(`Name ${count} anonymous function(s) for better debugging`);
          break;
        case 'stateVariables':
          if (count > 3) {
            practices.push('Consider combining related state variables');
          }
          break;
        case 'arrayOperations':
          if (count > 2) {
            practices.push('Consider optimizing array operations');
          }
          break;
      }
    }
  });

  // Calculate ratings based on metrics
  const organizationScore = parseInt(metrics.maintainability);
  
  // Calculate performance score with detailed logging
  let performanceDeductions = 0;
  const deductions = {
    inlineStyles: codePatterns.inlineStyles * 5,
    arrayOperations: codePatterns.arrayOperations * 3,
    stateVariables: codePatterns.stateVariables > 3 ? 15 : 0,
    imageHandling: Math.min(codePatterns.imageWithoutError * 10, 30)
  };

  console.error('Performance deductions:', JSON.stringify(deductions, null, 2));
  
  performanceDeductions = Object.values(deductions).reduce((a, b) => a + b, 0);
  const performanceScore = Math.max(0, 100 - performanceDeductions);
  
  console.error('Final performance score:', performanceScore);
  console.error('Performance rating:', getScoreRating(performanceScore, {
    excellent: 90,
    good: 75,
    moderate: 60
  }));

  return {
    practices,
    organization: getScoreRating(organizationScore),
    performance: getScoreRating(performanceScore, {
      excellent: 90,
      good: 75,
      moderate: 60
    })
  };
};

const getScoreRating = (score, thresholds = { excellent: 80, good: 60, moderate: 40 }) => {
  if (score >= thresholds.excellent) return 'Excellent';
  if (score >= thresholds.good) return 'Good';
  if (score >= thresholds.moderate) return 'Moderate';
  return 'Needs Improvement';
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