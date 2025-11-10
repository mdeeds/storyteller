// @ts-check

import { StorySection } from './story-section.js';

export class StoryParser {
  /**
   * A regular expression to find the start of a new section.
   * @type {RegExp}
   */
  static delimiterRegex = /^\[.*\]$/m;

  /**
   * Takes the entire story text and returns an ordered array of StorySection objects.
   * @param {string} fullText
   * @returns {StorySection[]}
   */
  static parseFullText(fullText) {
    const sections = [];
    const lines = fullText.split('\n');
    /** @type {string[]} */
    let currentPlayersPresent = [];
    let currentContent = [];

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine.startsWith('[') && trimmedLine.endsWith(']')) {
        if (currentContent.length > 0) {
          sections.push(new StorySection(currentPlayersPresent, currentContent.join('\n').trim()));
        }
        try {
          currentPlayersPresent = JSON.parse(trimmedLine);
          currentContent = [];
        } catch (e) {
          console.error("Error parsing players present JSON:", e, `on line "${trimmedLine}"`);
          currentPlayersPresent = [];
        }
      } else {
        currentContent.push(line);
      }
    }

    if (currentContent.length > 0 || currentPlayersPresent.length > 0) {
      sections.push(new StorySection(currentPlayersPresent, currentContent.join('\n').trim()));
    }

    return sections;
  }



  /**
   * Takes an array of StorySection objects and joins them back into a single string
   * @param {StorySection[]} sections
   * @returns {string}
   */
  static reconstructFullText(sections) {
    return sections
      .map(section => `${JSON.stringify(section.playersPresent)}\n${section.text}`)
      .join('\n\n');
  }

  /**
   * Extracts a list of all unique player names from the story sections.
   * @param {StorySection[]} sections
   * @returns {string[]}
   */
  static getAllPlayers(sections) {
    const allPlayers = new Set();
    sections.forEach(section => {
      section.playersPresent.forEach(player => allPlayers.add(player));
    });
    return Array.from(allPlayers).sort();
  }

  /**
   * 
   * @param {StorySection[]} sections 
   * @param {string} playerName 
   * @returns 
   */
  static getPlayerStory(sections, playerName) {
    const filteredSections = [];
    for (const section of sections) {
      if (section.playersPresent.length == 0 || section.playersPresent.includes(playerName)) {
        filteredSections.push(section);
      }
    }
    let result = "";
    for (const section of filteredSections) {
      result += section.text + "\n\n";
    }
    return result;
  }

  /**
   * Takes a player's story string and converts it into a user/model history
   * for the Gemini API. Text in curly braces is 'user', the rest is 'model'.
   * @param {string} playerStory
   * @returns {{role: 'user' | 'model', parts: {text: string}[]}[]}
   */
  static getPlayerHistoryForAPI(playerStory) {
    const history = [];
    // Split the story by user prompts (in curly braces), keeping the user prompt content.
    const parts = playerStory.split(/\{([^}]+)\}/);

    parts.forEach((part, index) => {
      const trimmedPart = part.trim();
      if (trimmedPart) {
        // Even-indexed parts are model responses (outside braces)
        if (index % 2 === 0) {
          history.push({
            role: 'model',
            parts: [{ text: trimmedPart }],
          });
        } else {
          // Odd-indexed parts are user prompts (inside braces)
          history.push({ role: 'user', parts: [{ text: trimmedPart }] });
        }
      }
    });

    return history;
  }

  /**
   * Saves the full story text to local storage.
   * @param {string} fullText The complete text of the story.
   */
  static save(fullText) {
    window.localStorage.setItem('storyteller_story', fullText);
    console.log('Story saved to local storage.');
  }

  /**
   * Loads the full story text from local storage.
   * @returns {string} The story text, or an empty string if none is found.
   */
  static load() {
    return window.localStorage.getItem('storyteller_story') || '';
  }

}