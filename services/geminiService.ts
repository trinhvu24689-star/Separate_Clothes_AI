import { GoogleGenAI } from "@google/genai";
import { Resolution } from "../types";

const getClient = () => {
  // Always access the process.env directly to get the latest injected key
  const apiKey = process.env.API_KEY;
  
  if (!apiKey || apiKey.length === 0) {
    console.error("API Key is missing. Please check Vercel Environment Variables.");
    throw new Error("API Key chưa được cấu hình. Vui lòng thêm API_KEY vào biến môi trường hoặc chọn key.");
  }
  return new GoogleGenAI({ apiKey });
};

export const generateSeparatedImage = async (
  base64Data: string, 
  mimeType: string, 
  prompt: string,
  resolution: Resolution
): Promise<string> => {
  // Always get a fresh client to pick up any new API keys
  const ai = getClient();
  
  // Clean base64 string
  const cleanBase64 = base64Data.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, '');

  // Default model
  let model = 'gemini-2.5-flash-image';
  let config: any = {};

  // Configure model based on resolution
  switch (resolution) {
    case '1240p':
    case '1440p':
    case '2K':
    case '4K':
    case '8K':
      model = 'gemini-3-pro-image-preview';
      config = {
        imageConfig: {
          imageSize: '2K' // Pro model supports max 2K output via current API
        }
      };
      break;
    default:
      model = 'gemini-2.5-flash-image';
      break;
  }

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: {
        parts: [
          {
            inlineData: {
              data: cleanBase64,
              mimeType: mimeType,
            },
          },
          {
            // Combined prompt
            text: `${prompt} \n\nIMPORTANT REQUIREMENT: Return ONLY the image output. High precision masking.`,
          },
        ],
      },
      config: config
    });

    const candidates = response.candidates;
    if (candidates && candidates.length > 0) {
      const parts = candidates[0].content.parts;
      for (const part of parts) {
        if (part.inlineData && part.inlineData.data) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
    }

    throw new Error("Không tạo được ảnh. Vui lòng thử lại.");
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    if (error.message && (error.message.includes("API key") || error.message.includes("403") || error.message.includes("401"))) {
        throw new Error("API Key không hợp lệ hoặc đã hết hạn.");
    }
    throw error;
  }
};

export const generateArtisticImage = async (
    base64Data: string,
    mimeType: string,
    options: {
        style: string;
        detailLevel: number;
        creativity: number;
        customPrompt?: string;
    }
): Promise<string> => {
    const ai = getClient();
    const cleanBase64 = base64Data.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, '');

    const prompt = `
        Transform this image into art.
        Style: ${options.style}.
        Detail: ${options.detailLevel}%.
        Creativity: ${options.creativity}%.
        ${options.customPrompt || ''}
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image', // Fast model for art
            contents: {
                parts: [
                    { inlineData: { data: cleanBase64, mimeType: mimeType } },
                    { text: prompt }
                ]
            }
        });

        const candidates = response.candidates;
        if (candidates && candidates.length > 0) {
            const parts = candidates[0].content.parts;
            for (const part of parts) {
                if (part.inlineData && part.inlineData.data) {
                    return `data:image/png;base64,${part.inlineData.data}`;
                }
            }
        }
        throw new Error("No artistic image generated.");
    } catch (error: any) {
        console.error("Artistic Gen Error:", error);
         if (error.message && (error.message.includes("API key") || error.message.includes("403"))) {
            throw new Error("API Key không hợp lệ.");
        }
        throw error;
    }
};