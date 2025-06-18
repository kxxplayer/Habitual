// src/lib/ai-service.ts
const isCapacitor = typeof window !== 'undefined' && (window as any).Capacitor;

export class AIService {
  static async generateHabit(description: string) {
    if (isCapacitor) {
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
    // Direct call to Google AI API
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_AI_KEY; // Note: NEXT_PUBLIC_ for client access
    
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });
    
    return response.json();
  }
}