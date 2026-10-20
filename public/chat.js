
/**
 * LLM Chat App Frontend
 *
 * Handles chat UI interactions and communication with Cloudflare Workers AI.
 */

// DOM elements
const chatMessages = document.getElementById("chat-messages");
const userInput = document.getElementById("user-input");
const sendButton = document.getElementById("send-button");
const typingIndicator = document.getElementById("typing-indicator");

// Chat state
let chatHistory = [
	{
		role: "assistant",
		content:
			"Hello! I'm an LLM chat app powered by Cloudflare Workers AI. How can I help you today?",
	},
];
let isProcessing = false;

// Auto-resize textarea as user types
userInput.addEventListener("input", function () {
	this.style.height = "auto";
	this.style.height = this.scrollHeight + "px";
});

// Send message on Enter (without Shift)
userInput.addEventListener("keydown", function (e) {
	if (e.key === "Enter" && !e.shiftKey) {
		e.preventDefault();
		sendMessage();
	}
});

// Send button click handler
sendButton.addEventListener("click", sendMessage);

/**
 * Sends a message to the chat API and processes the response.
 */
async function sendMessage() {
	const message = userInput.value.trim();

	if (message === "" || isProcessing) return;

	isProcessing = true;
	userInput.disabled = true;
	sendButton.disabled = true;

	addMessageToChat("user", message);

	userInput.value = "";
	userInput.style.height = "auto";

	typingIndicator.classList.add("visible");

	chatHistory.push({ role: "user", content: message });

	try {
		// Create assistant response element
		const assistantMessageEl = document.createElement("div");
		assistantMessageEl.className = "message assistant-message";

		const assistantTextEl = document.createElement("p");
		assistantMessageEl.appendChild(assistantTextEl);
		chatMessages.appendChild(assistantMessageEl);

		chatMessages.scrollTop = chatMessages.scrollHeight;

		// Send request to the Cloudflare API
		const response = await fetch("/api/chat", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				messages: chatHistory,
			}),
		});

		// Show the actual backend error if the request fails
		if (!response.ok) {
			const errorText = await response.text();
			throw new Error(`API error ${response.status}: ${errorText}`);
		}

		// Backend returns plain text, not a streaming response
		const responseText = await response.text();

		if (!responseText.trim()) {
			throw new Error("The API returned an empty response.");
		}

		assistantTextEl.textContent = responseText;
		chatMessages.scrollTop = chatMessages.scrollHeight;

		// Save the completed response to chat history
		chatHistory.push({
			role: "assistant",
			content: responseText,
		});
	} catch (error) {
		console.error("Project X API error:", error);

		addMessageToChat(
			"assistant",
			`Sorry, something went wrong. ${error.message}`
		);
	} finally {
		typingIndicator.classList.remove("visible");

		isProcessing = false;
		userInput.disabled = false;
		sendButton.disabled = false;
		userInput.focus();
	}
}

/**
 * Adds a message to the chat.
 */
function addMessageToChat(role, content) {
	const messageEl = document.createElement("div");
	messageEl.className = `message ${role}-message`;

	const paragraph = document.createElement("p");
	paragraph.textContent = content;
	messageEl.appendChild(paragraph);

	chatMessages.appendChild(messageEl);
	chatMessages.scrollTop = chatMessages.scrollHeight;
}
