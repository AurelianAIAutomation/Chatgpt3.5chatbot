<script lang="ts">

const chatContainer = document.querySelector('.chat') as HTMLElement;
const userInput = document.getElementById('user-input') as HTMLInputElement;
const sendButton = document.getElementById('send-button') as HTMLButtonElement;

// Function to add a message to the chat
function addMessage(message: string, sender: string) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', sender);
    messageDiv.textContent = message;
    chatContainer.appendChild(messageDiv);
}

// Simulate a response from ChatGPT
function simulateChatGPTResponse(userInput: string): string {
    // In a real application, you would send the user input to a server for processing.
    // Here, we simulate a simple response.
    const response = `You said: "${userInput}" - ChatGPT's response.`;
    return response;
}

// Event listener for sending messages
sendButton.addEventListener('click', () => {
    const userMessage = userInput.value;
    if (userMessage) {
        // Add the user's message to the chat
        addMessage(userMessage, 'user');
        
        // Simulate a ChatGPT response
        const chatGPTResponse = simulateChatGPTResponse(userMessage);

        // Add the ChatGPT response to the chat
        addMessage(chatGPTResponse, 'chatgpt');

        // Clear the user input
        userInput.value = '';
    }
});

// Initial system message
addMessage("Welcome to ChatGPT-like Page!", 'system');
