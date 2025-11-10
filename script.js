
import { GeminiAPI } from './gemini-api.js';
import { StoryParser } from './story-parser.js';

// --- DOM Elements ---
const storyArea = document.getElementById('story-area');
const dmInput = document.getElementById('dm-input');
const playerControls = document.getElementById('player-controls');
const submitBtn = document.getElementById('submit-btn');
const loadingIndicator = document.getElementById('loading-indicator');

// --- Initialization ---
window.addEventListener('load', async () => {
  await GeminiAPI.loadApiKey('api.key');
  // Player buttons are now created by loadStory()
  loadStory();
});

/**
 * Main submit handler.
 */
submitBtn.addEventListener('click', async () => {
  const userPrompt = dmInput.value.trim();
  if (!userPrompt) {
    userPrompt = "Write the next chapter.";
  }

  const selectedPlayers = getSelectedPlayers();

  // For simplicity, we'll generate a response for the first selected player.
  const activePlayer = !selectedPlayers.length ? null : selectedPlayers[0];
  console.log("Active player:", activePlayer);

  setLoading(true);

  storyArea.value += "\n\n{" + userPrompt + "}\n\n";

  // 1. Get history from the text area for the active player
  const fullStoryText = storyArea.value;
  const sections = StoryParser.parseFullText(fullStoryText);
  const playerStory = StoryParser.getPlayerStory(sections, activePlayer);
  const history = StoryParser.getPlayerHistoryForAPI(playerStory);

  // 2. Call the API
  const geminiResponse = await GeminiAPI.generateContent(history, userPrompt);

  // 3. Append the new content to the text area
  let newContent = '';
  const lastSection = sections[sections.length - 1];
  const lastPlayers = lastSection ? lastSection.playersPresent : [];

  // Add player list only if it's different from the last turn
  if (JSON.stringify(lastPlayers) !== JSON.stringify(selectedPlayers)) {
    newContent += `\n\n${JSON.stringify(selectedPlayers)}\n`;
  }

  newContent += geminiResponse;

  storyArea.value += newContent;
  dmInput.value = ''; // Clear input
  storyArea.scrollTop = storyArea.scrollHeight; // Scroll to bottom

  // 4. Save the updated story
  StoryParser.save(storyArea.value);

  setLoading(false);
});

// --- Helper Functions ---

function createPlayerButtons() {
  const fullStoryText = storyArea.value;
  const sections = StoryParser.parseFullText(fullStoryText);
  const players = StoryParser.getAllPlayers(sections);
  playerControls.innerHTML = ''; // Clear existing buttons
  players.forEach(player => {
    const button = document.createElement('button');
    button.classList.add('control-button', 'active');
    button.dataset.player = player;
    button.textContent = player;
    button.addEventListener('click', () => button.classList.toggle('active'));
    playerControls.appendChild(button);
  });
}

function getSelectedPlayers() {
  return Array.from(playerControls.querySelectorAll('.control-button.active'))
    .map(btn => btn.dataset.player);
}

function setLoading(isLoading) {
  loadingIndicator.style.display = isLoading ? 'block' : 'none';
  submitBtn.disabled = isLoading;
}

function loadStory() {
  const savedStory = StoryParser.load();
  storyArea.value = savedStory;
  if (savedStory) {
    console.log("Loaded story from local storage.");
  }
  createPlayerButtons(); // Create buttons based on the loaded story
}
