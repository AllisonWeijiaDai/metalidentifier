import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { AnalysisResult, GroundingChunk } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const identifyMetalImage = async (base64Image: string): Promise<AnalysisResult> => {
  try {
    // Remove header if present
    const cleanBase64 = base64Image.split(',')[1] || base64Image;

    const prompt = `
      You are an expert in Dark, Black, Doom, and Extreme Metal music history.
      Analyze this image (Logo or Album Cover). You can search on the internet for similar images.
      You will prioritize the information on https://www.metal-archives.com/. 
      
      If you are NOT SURE what this is, or if the text is illegible, output exactly:
      NAME: Unknown Entity
      TYPE: Unknown
      ---
      (Stop generation here)

      Otherwise, use this Output Structure:
      Line 1: NAME: [Band Name] or [Band Name - Album Name]
      Line 2: TYPE: [Band] or [Album]
      Line 3: ---
      
      Followed by a Markdown response structured exactly as follows (Use ## for Section Headers):

      ## Overall Information
      * **Band Name:** [Name]
      * **Album:** [Album Name, or "N/A" if analyzing a Band Logo]
      * **Other Releases:** [List all other releases as lists along with their release year and type]
      * **Band Biography:** [A concise, atmospheric bio of the band's history, genre, and vibe]
      * **Album Description:** [Brief description of this specific album, or if it's a logo, state that this is a logo and describe the band's general soundscape]

      ## Track Highlights
      [List 3 key songs (if Band) or track highlights (if Album) with very brief descriptions]

      ## Similar to this [Band/Album]
      [List 3-5 similar bands or albums. For each item, You MUST find the band followed by a short description.]
      Format exactly like this:
      * **[Band Name]**: [Brief description of why they are similar]

      
      Important: Use the Google Search tool to find these real URLs.
    `;

    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: cleanBase64,
            },
          },
          {
            text: prompt,
          },
        ],
      },
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const fullText = response.text || "Could not identify the image.";
    
    const lines = fullText.split('\n');
    let identifiedName = "Unknown Entity";
    let identifiedType: 'Band' | 'Album' | 'Unknown' = 'Unknown';
    
    const contentLines: string[] = [];

    // Robust parser to extract metadata and strip it from the description
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      
      // Only process headers in the beginning (limit to first 5 lines to be safe)
      if (i < 5) {
        if (trimmed.startsWith('NAME:')) {
          let nameVal = trimmed.substring(5).trim();
          
          // Handle case where TYPE might be on the same line (hallucination safeguard)
          // e.g., "NAME: Band Name TYPE: Band"
          const typeIndex = nameVal.indexOf('TYPE:');
          if (typeIndex !== -1) {
             const potentialType = nameVal.substring(typeIndex + 5).trim().toLowerCase();
             if (potentialType.includes('band')) identifiedType = 'Band';
             else if (potentialType.includes('album')) identifiedType = 'Album';
             
             nameVal = nameVal.substring(0, typeIndex).trim();
          }
          
          identifiedName = nameVal;
          continue; // Skip metadata line from description
        }
        
        if (trimmed.startsWith('TYPE:')) {
           const t = trimmed.substring(5).trim().toLowerCase();
           if (t.includes('band')) identifiedType = 'Band';
           else if (t.includes('album')) identifiedType = 'Album';
           continue; // Skip metadata line from description
        }
        
        if (trimmed === '---') {
           continue; // Skip separator line
        }
      }
      
      contentLines.push(line);
    }

    // If parser failed to find headers or explicitly unknown, force Unknown
    if (identifiedName.toLowerCase().includes('unknown entity')) {
      identifiedName = "Unknown Entity";
    }

    let descriptionText = contentLines.join('\n').trim();

    // Merge with API-provided grounding chunks
    const apiChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks as GroundingChunk[] || [];
    
    // Deduplicate based on URI
    const uniqueChunks = Array.from(new Map(apiChunks.map(c => [c.web?.uri, c])).values()).filter(c => c.web);

    return {
      identifiedName,
      identifiedType,
      text: descriptionText,
      sourceImage: base64Image,
      groundingChunks: uniqueChunks as GroundingChunk[],
    };

  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    throw new Error("The void stared back. Analysis failed.");
  }
};