import axios from 'axios';

const FIGMA_TOKEN = 'your-personal-access-token';

export const fetchFigmaFile = async (fileKey, accessToken) => {
  const url = `https://api.figma.com/v1/files/${fileKey}`;
  const headers = { 'X-Figma-Token': accessToken};

  const response = await axios.get(url, { headers });
  return response.data;
};

export const exportFigmaImage = async (fileKey, nodeId, accessToken) => {
  // Format nodeId to match API response format (replace '-' with ':')
  const formattedNodeId = nodeId.replace('-', ':');
  const url = `https://api.figma.com/v1/images/${fileKey}?ids=${formattedNodeId}&format=png&scale=2`;
  const headers = { 'X-Figma-Token': accessToken };

  try {
    const response = await axios.get(url, { headers });
    console.log('API Response:', response.data); // Debug log
    
    // Check if response has the expected structure
    if (response.data && response.data.images) {
      // Use the formatted nodeId to access the image URL
      const imageUrl = response.data.images[formattedNodeId];
      console.log('Extracted Image URL:', imageUrl); // Debug log
      return imageUrl;
    } else {
      console.error('Unexpected API response structure:', response.data);
      return null;
    }
  } catch (error) {
    console.error('Error exporting image:', error.response || error);
    return null;
  }
};
