export async function validateGoogleAIKey(apiKey: string): Promise<{
    valid: boolean;
    error?: string;
    quotaRemaining?: boolean;
  }> {
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
      
      if (response.status === 200) {
        return { valid: true, quotaRemaining: true };
      } else if (response.status === 401 || response.status === 403) {
        return { valid: false, error: 'Invalid API key or insufficient permissions' };
      } else if (response.status === 429) {
        return { valid: true, quotaRemaining: false, error: 'Quota exceeded - billing may be required' };
      } else {
        const errorText = await response.text();
        return { valid: false, error: `API error: ${response.status} - ${errorText}` };
      }
    } catch (error) {
      return { valid: false, error: `Network error: ${error instanceof Error ? error.message : 'Unknown'}` };
    }
  }