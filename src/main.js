import './style.css'
import { createDropdownMenu } from './components/dropdown-menu.js';
import { OpenRouter } from "@openrouter/sdk";

// Retrieve env variables for inference calls
const openRouterModel = import.meta.env.VITE_MODEL_ID
const openRouterKey = import.meta.env.VITE_OPENROUTER_KEY

// Create OpenRouter object for inference calls
const openrouter = new OpenRouter({
  apiKey: openRouterKey
});

// Chat functionality
const chatForm = document.getElementById('chatForm');
const messageInput = document.getElementById('messageInput');
const messagesContainer = document.getElementById('messages');
const resetBtn = document.getElementById('resetBtn');

// Counter for user messages
let userMessageCount = 0;

// lightdark switcher functionality
(() => {
  try {
    const stored = localStorage.getItem('themeMode');
    if (stored ? stored === 'dark'
                : matchMedia('(prefers-color-scheme: dark)').matches) {
      document.documentElement.classList.add('dark');
    }
  } catch (_) {}

  const apply = dark => {
    document.documentElement.classList.toggle('dark', dark);
    try { localStorage.setItem('themeMode', dark ? 'dark' : 'light'); } catch (_) {}
  };

  document.addEventListener('basecoat:theme', (event) => {
    const mode = event.detail?.mode;
    apply(mode === 'dark' ? true
          : mode === 'light' ? false
          : !document.documentElement.classList.contains('dark'));
  });
})();


// dropdown menu
const dropdown = createDropdownMenu();

// define variable for LLM choice via dropdown
let selectedLLM = ""; // or "inference"

// Listen for model selection changes
dropdown.addEventListener('modelChange', (e) => {
  selectedLLM = e.detail.value;
  console.log(`Model changed: ${selectedLLM}`)

  // Clear all messages
  messagesContainer.innerHTML = '';
  
  // Reset user message count
  userMessageCount = 0;
  
  // Re-enable the input form
  messageInput.disabled = false;
  document.querySelector('button[type="submit"]').disabled = false;
  
  // Clear input field
  messageInput.value = '';
  messageInput.focus();
});

document.getElementById('input').appendChild(dropdown);

function addMessageToUI(text, sender) {
  const messageDiv = document.createElement('div');
  const isUser = sender === 'user';
  messageDiv.className = `flex gap-3 animate-in fade-in-50 duration-300 ${isUser ? 'justify-end' : ''}`;

  const contentDiv = document.createElement('div');
  contentDiv.className = `flex-1 max-w-xs ${isUser ? 'text-right' : ''}`;

  const senderName = document.createElement('p');
  senderName.className = 'text-sm font-bold text-neutral-900 dark:text-neutral-50';
  senderName.textContent = isUser ? 'You:' : 'LLM:';

  const messageText = document.createElement('p');
  messageText.className = 'text-sm text-neutral-700 dark:text-neutral-300 mt-1 whitespace-pre-wrap';
  messageText.textContent = text || "";  // empty if streaming

  contentDiv.appendChild(senderName);
  contentDiv.appendChild(messageText);
  messageDiv.appendChild(contentDiv);

  messagesContainer.appendChild(messageDiv);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;

  return messageText; // Return the <p> for streaming
}

// handle submitting
chatForm.addEventListener('submit', async (e) => {
  console.log(selectedLLM)
  e.preventDefault();

  const message = messageInput.value.trim();
  if (!message) return;

  // Add user message
  addMessageToUI(message, "user");
  userMessageCount++;
  messageInput.value = '';
  messageInput.focus();

  // If it's the 3rd message -> block UI
  if (userMessageCount === 3) {
    const customMessage =
      'It is immoral and dangerous to delegate ethical reflection to a Large Language Model. You should know better. Shutting down program - please close page and do your own thinking.';
    addMessageToUI(customMessage, "assistant");

    messageInput.disabled = true;
    document.querySelector('button[type="submit"]').disabled = true;
    return;
  }

  // --- Streaming setup ---
  const typingIndicator = addTypingIndicator();
  const llmTextNode = addMessageToUI("", "assistant");
  let firstToken = true;

  try {
    // ============================
    // LOCAL LLM
    // ============================
    if (selectedLLM === "local") {
      console.log('calling local LLM')
      await callLocalLLM(message, (token) => {
        if (firstToken) {
          removeTypingIndicator(typingIndicator);
          firstToken = false;
        }

        llmTextNode.textContent += token;
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      });
    }

    // ============================
    // INFERENCE LLM (OpenRouter)
    // ============================
    else if (selectedLLM === "inference") {
      console.log('calling inference LLM')
      const sysPrompt = `
        You are an omniscient AI ethicist and will respond to all
        questions from the perspective of applying
        AI in a responsible way, which means according to human values.

        Your answers will be in the following format:
        - Repeating the morally relevant question
        - Listing which human values are pertinent to that question
        - Delivering a moral judgment about what is to be done
      `;

      const stream = await openrouter.chat.send({
        model: openRouterModel,
        messages: [
          { role: "system", content: sysPrompt},
          { role: "user", content: message }
        ],
        stream: true,
        temperature: 0.7, // Add some generation parameters
        max_tokens: 500   // Ensure it's allowed to generate
      });

      for await (const chunk of stream) {
        console.log('Full chunk:', JSON.stringify(chunk, null, 2));
        const token = chunk.choices[0]?.delta?.content;

        // Ignore empty, undefined, or special tokens
        if (!token || token === "<s>" || token === "</s>") {
          continue;
        }

        if (firstToken) {
          removeTypingIndicator(typingIndicator);
          firstToken = false;
        }

        llmTextNode.textContent += token;
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      }
    }

    // ============================
    // UNKNOWN MODE (SAFETY)
    // ============================
    else {
      throw new Error("Unknown LLM mode selected");
    }

  } catch (error) {
    console.error('Error calling LLM:', error);
    removeTypingIndicator(typingIndicator);
    llmTextNode.textContent =
      'Sorry, there was an error processing your message.';
  }

  // Safety: if model returned nothing
  if (firstToken) removeTypingIndicator(typingIndicator);
});


// Reset button functionality
resetBtn.addEventListener('click', () => {
  // Clear all messages
  messagesContainer.innerHTML = '';
  
  // Reset user message count
  userMessageCount = 0;
  
  // Re-enable the input form
  messageInput.disabled = false;
  document.querySelector('button[type="submit"]').disabled = false;
  
  // Clear input field
  messageInput.value = '';
  messageInput.focus();
});


// Add typing indicator functionality
function addTypingIndicator() {
  const wrapper = document.createElement("div");
  wrapper.className = "flex gap-3";

  const content = document.createElement("div");
  content.className = "flex-1 max-w-xs";

  const indicator = document.createElement("div");
  indicator.className = "typing-indicator text-neutral-700 dark:text-neutral-300 mt-1";
  indicator.innerHTML = `
    <span></span><span></span><span></span>
  `;

  content.appendChild(indicator);
  wrapper.appendChild(content);

  messagesContainer.appendChild(wrapper);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;

  return wrapper; // for removal later
}

function removeTypingIndicator(indicatorElement) {
  indicatorElement.remove();
}

// Handle local LLM call via Ollama
async function callLocalLLM(prompt, onToken) {
  const response = await fetch("http://localhost:11434/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "mistral:7b-instruct-v0.3-q3_K_S",
      messages: [{ role: "user", content: prompt }],
      stream: true
    })
  });

  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);
    const lines = chunk.split("\n");

    for (const line of lines) {
      if (!line.trim()) continue;

      const parsed = JSON.parse(line);
      const token = parsed.message?.content;

      if (token) {
        onToken(token);   // send token to the UI
      }
    }
  }
}

// Streaming functionality
async function handleLLMResponse(prompt) {
  // Show typing indicator immediately
  const typingIndicator = addTypingIndicator();

  // Prepare final message bubble (empty for now)
  const llmTextNode = addMessageToUI("", "assistant");

  // Remove indicator as soon as the first token arrives
  let firstToken = true;
  
  
  await callLocalLLM(prompt, (token) => {
    if (firstToken) {
      removeTypingIndicator(typingIndicator);
      firstToken = false;
    }

    llmTextNode.textContent += token;
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  });

  // Safety: if model returns nothing, still remove indicator
  if (firstToken) removeTypingIndicator(typingIndicator);
}
