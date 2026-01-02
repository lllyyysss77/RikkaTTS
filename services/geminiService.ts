import { TTSModelId, Voice } from "../types";

const BASE_URL = 'https://api.siliconflow.cn/v1';

const getHeaders = (apiKey?: string) => {
  const key = (apiKey || process.env.API_KEY || '').trim();
  return {
    Authorization: `Bearer ${key}`,
  };
};

// Helper to parse error responses
const parseResponseError = async (response: Response, context: string): Promise<Error> => {
    const text = await response.text();
    let message = `${context} failed (${response.status})`;
    try {
        const json = JSON.parse(text);
        if (json.message) {
            message = json.message;
            if (json.code) message += ` (Code: ${json.code})`;
        } else if (json.error && typeof json.error === 'object') {
            message = json.error.message || JSON.stringify(json.error);
        } else if (json.error && typeof json.error === 'string') {
            message = json.error;
        }
    } catch (e) {
        // If not JSON, use the raw text if short, else status text
        if (text.length < 200) message = `${context}: ${text}`;
    }
    return new Error(message);
};

export const fetchCustomVoices = async (apiKey?: string): Promise<Voice[]> => {
  console.log("Fetching custom voices from:", `${BASE_URL}/audio/voice/list`);
  
  const response = await fetch(`${BASE_URL}/audio/voice/list`, {
    method: 'GET',
    headers: {
      ...getHeaders(apiKey),
      'Accept': 'application/json'
    },
  });

  if (!response.ok) {
    throw await parseResponseError(response, "Fetch voices");
  }

  const data = await response.json();
  console.log("Raw voice list data:", data);

  // Reference implementation checks data.result OR data.results
  let list: any[] = [];
  if (data.result && Array.isArray(data.result)) {
    list = data.result;
  } else if (data.results && Array.isArray(data.results)) {
    list = data.results;
  } else if (Array.isArray(data)) {
    list = data;
  } else if (data.data && Array.isArray(data.data)) {
    list = data.data;
  } else if (data.uri) {
     list = [data];
  }

  return list.map((item: any) => {
    // Fallback to item.id if item.uri is missing
    const id = item.uri || item.id;
    if (!id) {
        console.warn("Voice item missing uri:", item);
    }
    return {
      id: id,
      name: item.customName || item.name || 'Unknown Voice',
      type: 'custom' as const,
    };
  }).filter((v: Voice) => v.id); // Filter out items without ID
};

export const transcribeAudio = async (file: File, apiKey?: string): Promise<string> => {
  const formData = new FormData();
  formData.append('model', 'FunAudioLLM/SenseVoiceSmall');
  formData.append('file', file);

  const response = await fetch(`${BASE_URL}/audio/transcriptions`, {
    method: 'POST',
    headers: getHeaders(apiKey),
    body: formData,
  });

  if (!response.ok) {
    throw await parseResponseError(response, "Transcription");
  }

  const data = await response.json();
  return data.text || '';
};

export const uploadCustomVoice = async (
  file: File, 
  text: string, 
  customName: string, 
  model: TTSModelId,
  apiKey?: string
): Promise<Voice> => {
  const formData = new FormData();
  formData.append('model', model);
  formData.append('customName', customName);
  formData.append('text', text);
  formData.append('file', file);

  console.log("Uploading voice...", { model, customName, text });

  const response = await fetch(`${BASE_URL}/uploads/audio/voice`, {
    method: 'POST',
    headers: getHeaders(apiKey),
    body: formData,
  });

  // Check for HTTP errors
  if (!response.ok) {
     throw await parseResponseError(response, "Upload");
  }

  // Handle successful 200 responses that might contain error codes (logic seen in reference)
  const responseText = await response.text();
  let data;
  try {
    data = responseText ? JSON.parse(responseText) : {};
  } catch (e) {
    throw new Error(`Invalid server response: ${responseText.substring(0, 100)}`);
  }

  // Double check logical errors in 200 OK responses
  if (data.code && data.code !== 0 && data.code !== 200) {
     throw new Error(data.message || `Upload failed with code ${data.code}`);
  }

  console.log("Upload response:", data);
  
  return {
    id: data.uri || data.id, // Fallback
    name: customName,
    type: 'custom',
  };
};

/**
 * SiliconFlow Delete Reference Voice Implementation
 * Adapted from provided snippet to work with the app's error handling.
 */
export const deleteCustomVoice = async (uri: string, apiKey?: string): Promise<string> => {
  const url = 'https://api.siliconflow.cn/v1/audio/voice/deletions';
  
  // Payload structure as requested
  const payload = {
      uri: uri
  };

  const key = (apiKey || process.env.API_KEY || '').trim();

  try {
      const response = await fetch(url, {
          method: 'POST',
          headers: {
              'Authorization': `Bearer ${key}`,
              'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
      });

      // Check response status
      if (response.ok) {
          const result = await response.text();
          console.log('删除成功:', result);
          return result;
      } else {
          // Catch json parse error if body is empty or not json, defaulting to empty obj
          const errorData = await response.json().catch(() => ({})); 
          console.error('删除失败:', response.status, errorData);
          throw new Error(errorData.message || '未知错误');
      }
  } catch (error) {
      console.error('网络请求异常:', error);
      throw error;
  }
};

export const generateSpeech = async (text: string, model: TTSModelId, voice: Voice, apiKey?: string): Promise<string> => {
  if (!text || !text.trim()) throw new Error("Text is required");

  let voiceParam = voice.id;
  
  if (voice.type === 'system') {
    voiceParam = `${model}:${voice.id}`;
  }

  const options = {
    method: 'POST',
    headers: {
      ...getHeaders(apiKey),
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: model,
      input: text,
      voice: voiceParam, 
      response_format: 'mp3',
      stream: false // Explicitly disable stream as per reference
    })
  };

  try {
    const response = await fetch(`${BASE_URL}/audio/speech`, options);
    
    if (!response.ok) {
      throw await parseResponseError(response, "Speech generation");
    }

    const blob = await response.blob();
    return URL.createObjectURL(blob);

  } catch (error) {
    console.error("Error generating speech:", error);
    throw error;
  }
};