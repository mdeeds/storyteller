//@ts-check

export class StorySection {
  /** @type {string[]} */
  playersPresent;
  /** @type {string} */
  text;

  /**
   * @param {string[]} playersPresent
   * @param {string} text
   */
  constructor(playersPresent, text) {
    this.playersPresent = playersPresent;
    this.text = text;
  }
}