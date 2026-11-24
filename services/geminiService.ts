import { AnalysisResult } from "../types.ts";

// The browser never sees the Gemini API key. It sends the image to our own
// server function (api/identify.ts), which calls Gemini with the key stored on Vercel.
export const identifyMetalImage = async (base64Image: string): Promise<AnalysisResult> => {
  const res = await fetch('/api/identify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: base64Image }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error || 'Analysis failed');
  }

  return { ...data, sourceImage: base64Image } as AnalysisResult;
};
