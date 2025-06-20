// src/lib/ai-service.ts
import { ENV_CONFIG } from './env-check';

export class AIService {
  static async generateHabit(description: string) {
    if (ENV_CONFIG.IS_CAPACITOR) {
      // Direct API call for mobile app
      return await this.callGoogleAIDirectly(description);
    } else {
      // Use your existing API routes for web
      return await fetch('/api/generateHabit', {
        method: 'POST',
        body: JSON.stringify({ description }),
        headers: { 'Content-Type': 'application/json' }
      }).then(r => r.json());
    }
  }

  private static async callGoogleAIDirectly(prompt: string) {
    // Validate API key
    if (!ENV_CONFIG.GOOGLE_AI_KEY) {
      throw new Error('Google AI API key not configured. Please set NEXT_PUBLIC_GOOGLE_AI_KEY environment variable.');
    }

    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${ENV_CONFIG.GOOGLE_AI_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ 
            parts: [{ text: prompt }] 
          }],
          generationConfig: {
            temperature: 0.7,
            topK: 1,
            topP: 1,
            maxOutputTokens: 2048,
          }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Google AI API Error Response:', errorText);
        throw new Error(`Google AI API error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      
      if (!result.candidates || !result.candidates[0] || !result.candidates[0].content) {
        console.error('Unexpected API response structure:', result);
        throw new Error('Invalid response from Google AI API');
      }
      
      return result.candidates[0].content.parts[0].text;
    } catch (error) {
      console.error('AI Service Error:', error);
      throw error;
    }
  }
}