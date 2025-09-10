
// --- Core DOM Elements ---
const storyFeed = document.getElementById('story-feed');
const dmInput = document.getElementById('dm-input');
const playerControls = document.getElementById('player-controls');
const actionButtons = document.getElementById('action-buttons');
const advanceAllBtn = document.getElementById('advance-all-btn');
const loadingIndicator = document.getElementById('loading-indicator');

// --- Hard-coded Data ---
let apiKey = "YOUR_GEMINI_API_KEY_HERE";


window.addEventListener('load', async () => {
  apiKey = await (await fetch('api.key')).text();
  console.log(`API Key: ${apiKey}`);
  makeButtons();
});

// --- Event Listeners ---

// Listener for player filter buttons
playerControls.addEventListener('click', (event) => {
  if (event.target.classList.contains('control-button')) {
    const button = event.target;
    button.classList.toggle('active');
    filterStory();
  }
});

// Function to handle advancing a single player
async function advancePlayer(player, dmText, playersPresent) {
  const fullPrompt = getPlayerHistory(player);
  try {
    console.log(player);
    const response = await callGeminiAPI(fullPrompt);
    addPlayerAction(player, response, playersPresent);
  } catch (error) {
    console.error(`Error with Gemini API for ${player}:`, error);
    addPlayerAction(player, "An error occurred with the AI response.");
  }
}

// Listener for the main "Advance All" button
advanceAllBtn.addEventListener('click', async () => {
  const dmText = dmInput.value.trim();
  const selectedPlayers = getSelectedPlayers();
  if (selectedPlayers.length === 0) {
    alert("Please select at least one player to advance.");
    return;
  }

  loadingIndicator.style.display = 'block';
  advanceAllBtn.disabled = true;

  addDMprompt(dmText, selectedPlayers);
  for (const player of selectedPlayers) {
    await advancePlayer(player, dmText, selectedPlayers);
  }

  dmInput.value = '';
  loadingIndicator.style.display = 'none';
  advanceAllBtn.disabled = false;
});

function makeButtons() {
  for (const player of players) {
    const button = document.createElement('button');
    button.classList.add('action-btn');
    button.textContent = `Advance ${player}`;
    button.addEventListener('click', async () => {
      button.disabled = true;
      const dmText = dmInput.value.trim();
      const selectedPlayers = getSelectedPlayers();
      addDMprompt(dmText, selectedPlayers);
      await advancePlayer(player, dmText, selectedPlayers);
      dmInput.value = '';
      button.disabled = false;
    });

    const selectButton = document.createElement('button');
    selectButton.classList.add('control-button', 'active');
    selectButton.dataset.player = player;
    selectButton.textContent = player;

    actionButtons.appendChild(button);
    playerControls.appendChild(selectButton);
  }
}

// --- Core Functions ---

// Returns an array of players whose buttons are currently active
function getSelectedPlayers() {
  const selected = [];
  document.querySelectorAll('.player-controls .control-button.active').forEach(button => {
    selected.push(button.dataset.player);
  });
  return selected;
}

// Toggles visibility of story elements based on selected players
function filterStory() {
  const selectedPlayers = getSelectedPlayers();
  document.querySelectorAll('.round-item').forEach(item => {
    const playersPresent = JSON.parse(item.dataset.playersPresent || '[]');

    // Show the element if it's a DM prompt for the current players or a player action for a selected player
    const shouldShow = (item.dataset.roundType === 'dm' && playersPresent.some(p => selectedPlayers.includes(p))) ||
      (item.dataset.roundType === 'player' && selectedPlayers.includes(item.dataset.player));

    if (shouldShow) {
      item.classList.remove('hidden-by-filter');
    } else {
      item.classList.add('hidden-by-filter');
    }
  });
}

// Appends a new DM prompt to the story feed
function addDMprompt(text, playersPresent) {
  const roundDiv = document.createElement('div');
  roundDiv.classList.add('round-item', 'dm-prompt');
  roundDiv.dataset.roundType = 'dm';
  roundDiv.dataset.playersPresent = JSON.stringify(playersPresent);
  roundDiv.innerHTML = `<span class="player-name-label">DM:</span><br>${text}`;
  storyFeed.appendChild(roundDiv);
  storyFeed.scrollTop = storyFeed.scrollHeight;
}

// Appends a new player action to the story feed
function addPlayerAction(player, text, playersPresent) {
  if (!playersPresent) {
    console.error('Must pass playersPresent to addPlayerAction');
  }
  const roundDiv = document.createElement('div');
  roundDiv.classList.add('round-item', 'player-action');
  roundDiv.dataset.roundType = 'player';
  roundDiv.dataset.player = player;
  roundDiv.dataset.playersPresent = JSON.stringify(playersPresent);

  // Make the content editable
  const contentSpan = document.createElement('div');
  contentSpan.contentEditable = true;
  contentSpan.classList.add('editable-text');
  contentSpan.textContent = text;

  roundDiv.innerHTML = `<span class="player-name-label">${player}:</span>`;
  roundDiv.appendChild(contentSpan);
  storyFeed.appendChild(roundDiv);
  storyFeed.scrollTop = storyFeed.scrollHeight;
}

// Constructs the history prompt for a specific player by reading the DOM
function getPlayerHistory(playerName) {
  let history = "";
  const storyElements = storyFeed.querySelectorAll('.round-item');

  storyElements.forEach(item => {
    const roundType = item.dataset.roundType;

    if (roundType === 'dm') {
      // DM prompts are only part of a player's history if they were present for that round
      const playersPresent = JSON.parse(item.dataset.playersPresent || '[]');
      if (playersPresent.includes(playerName)) {
        history += `DM: ${item.textContent.replace('DM:', '').trim()}\n\n`;
      }
    } else if (roundType === 'player' && item.dataset.player === playerName) {
      // A player's own actions are always part of their history
      history += `${playerName}: ${item.querySelector('.editable-text').textContent.trim()}\n\n`;
    }
  });

  history = getCharacterDescription(playerName) + "\n\n" + history;

  return history;
}

// Hard-coded character descriptions
const players = ['Sophia', 'Cayle', 'Beverly'];
const descriptionMap = new Map();
(async function () {
  for (const player of players) {
    const response = await fetch(`${player}.txt`);
    descriptionMap.set(player, await response.text());
  }
})();

function getPersonalDescription(playerName) {
  if (descriptionMap.has(playerName)) {
    return descriptionMap.get(playerName);
  } else {
    return "";
  }
}

// Hard-coded character descriptions
function getCharacterDescription(playerName) {
  return getPersonalDescription(playerName);
}

// Call the Gemini API using native fetch
async function callGeminiAPI(prompt) {
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;

  const payload = {
    contents: [{
      parts: [{ text: prompt }]
    }],
    tools: [{
      // "google_search": {}
      // "code_execution": {}
      // "google_maps": {}
    }]
  };

  let response;
  let retryCount = 0;
  const maxRetries = 5;

  while (retryCount < maxRetries) {
    try {
      console.log(payload);
      response = await fetch(apiUrl, {
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
      const candidate = result?.candidates?.[0];
      if (candidate?.content?.parts?.[0]?.text) {
        return candidate.content.parts[0].text;
      } else {
        console.error("Unexpected API response format:", JSON.stringify(result));
        return "An error occurred with the AI response.";
      }
    } catch (error) {
      console.error("Error calling Gemini API:", error);
      return "An error occurred with the AI response.";
    }
  }
  return "Failed to get a response after multiple retries.";
}
