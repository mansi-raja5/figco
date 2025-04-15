export const generateReactCode = async (figmaJson, componentName = 'FigmaComponent') => {
  try {
    console.log('Preparing to send request...');
    
    // Basic validation
    if (!figmaJson) {
      throw new Error('Figma JSON is required');
    }

    // Convert to string once to check size
    const jsonString = JSON.stringify({
      figmaJson,
      componentName
    });

    // Warn if payload is large
    const payloadSizeMB = (jsonString.length / (1024 * 1024)).toFixed(2);
    if (payloadSizeMB > 10) {
      console.warn(`Large payload detected: ${payloadSizeMB}MB`);
    }

    const response = await fetch('http://localhost:3002/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: jsonString
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`HTTP error! status: ${response.status}, message: ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    console.log('Generation response:', data);
    return data;
  } catch (error) {
    console.error('Error generating code:', error);
    throw error;
  }
}; 