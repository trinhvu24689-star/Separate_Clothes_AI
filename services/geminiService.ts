import { GoogleGenAI } from "@google/genai";
import { Resolution } from "../types";

// Safe access to API Key preventing "process is not defined" crashes
const getClient = (customKey?: string) => {
  let apiKey = customKey;
  
  if (!apiKey) {
      try {
          // Vite replaces process.env.API_KEY with string at build time
          apiKey = process.env.API_KEY; 
      } catch (e) {
          // Fallback if process isn't defined
          console.warn("Could not access process.env");
      }
  }
  
  if (!apiKey || apiKey.length === 0) {
    console.error("API Key is missing.");
    throw new Error("API Key chưa được cấu hình. Vui lòng nhập API Key của bạn.");
  }
  return new GoogleGenAI({ apiKey });
};

export const generateSeparatedImage = async (
  base64Data: string, 
  mimeType: string, 
  prompt: string,
  resolution: Resolution,
  customApiKey?: string
): Promise<string> => {
  // Always get a fresh client
  const ai = getClient(customApiKey);
  
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

    // --- ERROR PARSING LOGIC ---
    let errorStr = "";
    if (typeof error === 'string') errorStr = error;
    else if (error.message) errorStr = error.message;
    else errorStr = JSON.stringify(error);

    // 1. Check for Quota / Rate Limit (429) / Resource Exhausted
    if (errorStr.includes("429") || errorStr.includes("RESOURCE_EXHAUSTED") || errorStr.includes("Quota") || errorStr.includes("limit")) {
        // Specific advice for Pro model usage
        if (['1240p', '1440p', '2K', '4K', '8K'].includes(resolution)) {
            throw new Error(`⚠️ Hết lượt dùng thử model PRO (Quota Exceeded).\n\n👉 Hãy chuyển xuống độ phân giải "1040p" hoặc nhập API Key riêng của bạn.`);
        }
        throw new Error("⚠️ Hệ thống đang quá tải (Rate Limit). Vui lòng thử lại sau 1-2 phút hoặc nhập API Key riêng.");
    }

    // 2. Check for Auth errors
    if (errorStr.includes("API key") || errorStr.includes("403") || errorStr.includes("401") || errorStr.includes("UNAUTHENTICATED")) {
        throw new Error("🔑 API Key không hợp lệ. Vui lòng kiểm tra lại Key của bạn.");
    }

    // 3. Clean up raw JSON errors if any
    const jsonMatch = errorStr.match(/\{.*\}/); 
    if (jsonMatch) {
        try {
            const parsed = JSON.parse(jsonMatch[0]);
            if (parsed.error && parsed.error.message) {
                 if (parsed.error.message.includes("Quota")) {
                     throw new Error(`⚠️ Hết lượt dùng thử (Quota Exceeded).\n👉 Hãy chuyển xuống độ phân giải "1040p" hoặc nhập API Key riêng.`);
                 }
                 throw new Error(`Lỗi Google API: ${parsed.error.message}`);
            }
        } catch (e) {}
    }

    throw new Error(`Lỗi không xác định: ${errorStr.substring(0, 100)}...`);
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
    },
    customApiKey?: string
): Promise<string> => {
    const ai = getClient(customApiKey);
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
        if (error.message && (error.message.includes("429") || error.message.includes("Quota"))) {
             throw new Error("Hệ thống đang bận (Quota). Vui lòng thử lại sau.");
        }
        throw error;
    }
};