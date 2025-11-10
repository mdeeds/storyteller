// @ts-check

export class GeminiAPI {
  /** @type {string} */
  static apiKey = "YOUR_GEMINI_API_KEY_HERE";

  /**
   * Loads the Gemini API key from a file.
   * @param {string} path - The path to the API key file.
   */
  static async loadApiKey(path = 'api.key') {
    try {
      this.apiKey = await (await fetch(path)).text();
      console.log(`API Key loaded.`);
    } catch (error) {
      console.error("Could not load API key from file:", path, error);
    }
  }

  static async loadSystemInstruction(path = 'system-instruction.txt') {
    try {
      this._systemInstruction = await (await fetch(path)).text();
      console.log(`System instruction loaded.`);
    } catch (error) {
      console.error("Could not load system instruction from file:", path, error);
    }
  }

  /**
   * Calls the Gemini API to generate content.
   * @param {{role: 'user' | 'model', parts: {text: string}[]}[]} history - The conversation history.
   * @returns {Promise<string>} The generated text from the API.
   */
  static async generateContent(history) {
    if (!this.apiKey) {
      await this.loadApiKey();
    }
    if (!this._systemInstruction) {
      await this.loadSystemInstruction();
    }

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${this.apiKey}`;

    const payload = {
      contents: history,
      system_instruction: { parts: [{ text: this._systemInstruction }] },
    };

    let retryCount = 0;
    const maxRetries = 5;

    while (retryCount < maxRetries) {
      try {
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (response.status === 429) {
          retryCount++;
          const delay = Math.pow(2, retryCount) * 1000;
          console.warn(`Rate limit exceeded. Retrying in ${delay / 1000}s...`);
          await new Promise(res => setTimeout(res, delay));
          continue;
        }

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(`API call failed with status ${response.status}: ${JSON.stringify(errorData)}`);
        }

        const result = await response.json();
        return result?.candidates?.[0]?.content?.parts?.[0]?.text || "An error occurred with the AI response.";
      } catch (error) {
        console.error("Error calling Gemini API:", error);
        // Don't retry on general errors, only on 429
        return "An error occurred with the AI response.";
      }
    }
    return "Failed to get a response after multiple retries.";
  }
}