// GeminiAPI.ts

const GEMINI_API_KEY = 'AIzaSyDmx-HLweu9ILPgVYlwnEC2WMGfLFQz6OM'; // Replace with your actual API key

// Function to get a valid model name for Gemini API
const getValidModel = async () => {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_API_KEY}`,
      {
        method: 'GET',
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch models: ${response.status}`);
    }

    const data = await response.json();
    console.log('Available models:', data);
    
    // Find an appropriate Gemini model (prefer newer models)
    const models = data.models || [];
    
    // Try to find newer models first (Gemini 1.5)
    const gemini15Flash = models.find(m => m.name.includes('gemini-1.5-flash'));
    const gemini15Pro = models.find(m => m.name.includes('gemini-1.5-pro'));
    const gemini10Pro = models.find(m => m.name.includes('gemini-1.0-pro') && !m.name.includes('vision'));
    
    // Return the first available model in order of preference
    return gemini15Flash?.name || gemini15Pro?.name || gemini10Pro?.name || 
           (models.length > 0 ? models[0].name : null);
  } catch (error) {
    console.error('Error fetching models:', error);
    // Fallback to a known current model name (as of May 2025)
    return 'models/gemini-1.5-flash';
  }
};

// Function to ask Gemini API a question with expense context
export const askGemini = async (question: string, context: string) => {
  try {
    console.log('Sending request to Gemini API...');

    // Get a valid model name
    const model = await getValidModel();
    
    if (!model) {
      return 'Không thể kết nối với Gemini API. Vui lòng thử lại sau.';
    }
    
    console.log('Using model:', model);
    const modelEndpoint = model.includes('/') ? model : `models/${model}`;

    // Prepare the prompt
    const prompt = `Dữ liệu chi tiêu:\n${context}\n\nCâu hỏi:\n${question}\n\nHãy trả lời câu hỏi dựa trên dữ liệu chi tiêu. Nếu không có thông tin, hãy trả lời "Không có thông tin".`;

    // Make API request with proper structure
    const requestBody = {
      contents: [
        {
          parts: [
            { text: prompt }
          ]
        }
      ]
    };

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/${modelEndpoint}:generateContent?key=${GEMINI_API_KEY}`;
    
    console.log('Request URL:', apiUrl);
    console.log('Request body:', JSON.stringify(requestBody));
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('API error response:', errorData);
      try {
        const parsedError = JSON.parse(errorData);
        return `Lỗi API: ${parsedError.error?.message || 'Đã xảy ra lỗi khi gọi Gemini.'}`;
      } catch (e) {
        return `Lỗi API (${response.status}): ${errorData || 'Không có thông tin chi tiết.'}`;
      }
    }

    const data = await response.json();
    console.log('API Response:', data);

    // Extract the response text from the correct path
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (text) {
      return text;
    } else {
      console.error('No content returned from Gemini.');
      return 'Không có câu trả lời từ Gemini.';
    }
  } catch (error) {
    console.error('Gemini error:', error);
    return `Lỗi khi gọi Gemini: ${error.message}`;
  }
};