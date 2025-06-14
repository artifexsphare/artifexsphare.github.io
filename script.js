const typingForm = document.querySelector(".typing-form");
const chatContainer = document.querySelector(".chat-list");
const suggestions = document.querySelectorAll(".suggestion");
const toggleThemeButton = document.querySelector("#theme-toggle-button");
const deleteChatButton = document.querySelector("#delete-chat-button");
const sendButton = document.querySelector(".send-button");
const typingInput = document.querySelector(".typing-input");

// Modal elements
const confirmationModal = document.getElementById("confirmationModal");
const modalMessage = document.getElementById("modalMessage");
const confirmActionBtn = document.getElementById("confirmAction");
const cancelActionBtn = document.getElementById("cancelAction");

// State variables
let userMessage = null;
let isResponseGenerating = false;

// API configuration
const API_KEY = "AIzaSyCs6wtVFNedpp9GbMdJTizkNV-0fq1uxe0"; // Your API key here
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`;

// Create a new message element and return it
const createMessageElement = (content, ...classes) => {
    const div = document.createElement("div");
    div.classList.add("message", ...classes);
    div.innerHTML = content;
    return div;
}

// Show typing effect
const showTypingEffect = (text, textElement, incomingMessageDiv) => {
    const words = text.split(' ');
    let currentWordIndex = 0;

    const typingInterval = setInterval(() => {
        textElement.innerText += (currentWordIndex === 0 ? '' : ' ') + words[currentWordIndex++];
        incomingMessageDiv.querySelector(".icon").classList.add("hide");

        if (currentWordIndex === words.length) {
            clearInterval(typingInterval);
            isResponseGenerating = false;
            incomingMessageDiv.querySelector(".icon").classList.remove("hide");
        }
        chatContainer.scrollTo(0, chatContainer.scrollHeight);
    }, 10);
}

// Fetch response from the API
const generateAPIResponse = async (incomingMessageDiv) => {
    const textElement = incomingMessageDiv.querySelector(".text");

    try {
        const chatHistoryElements = chatContainer.querySelectorAll(".message");
        const currentChatContents = [];

        chatHistoryElements.forEach(msgDiv => {
            const role = msgDiv.classList.contains("outgoing") ? "user" : "model";
            const text = msgDiv.querySelector(".text").innerText.replace(/\*/g, '').trim();
            if (text && !msgDiv.classList.contains("loading")) {
                currentChatContents.push({ role: role, parts: [{ text: text }] });
            }
        });

        const contentsToSend = [...currentChatContents].filter(
            (item, index, self) =>
                index === self.findIndex((t) => (
                    t.role === item.role && t.parts[0].text === item.parts[0].text
                ))
        );

        contentsToSend.push({
            role: "user",
            parts: [{ text: userMessage.replace(/\*/g, '') }]
        });

        const payload = {
            contents: contentsToSend
        };

        const response = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error.message || "An error occurred during API call.");
        }

        const apiResponse = data?.candidates[0]?.content?.parts[0]?.text?.replace(/\*/g, '') || "No response received.";
        showTypingEffect(apiResponse, textElement, incomingMessageDiv);
    } catch (error) {
        console.error("Error generating API response:", error);
        isResponseGenerating = false;
        textElement.innerText = error.message;
        textElement.parentElement.closest(".message").classList.add("error");
    } finally {
        incomingMessageDiv.classList.remove("loading");
    }
}

// Show loading animation
const showLoadingAnimation = () => {
    const html = `<div class="message-content">
                    <img class="avatar" src="images/gemini.svg" alt="AI avatar">
                    <p class="text"></p>
                    <div class="loading-indicator">
                        <p class="" style="color: var(--text-color); font-size: 0.8rem;">Thinking...</p>
                        <div class="loading-bar"></div>
                        <div class="loading-bar"></div>
                        <div class="loading-bar"></div>
                    </div>
                </div>
                <span onClick="copyMessage(this)" class="icon material-symbols-rounded">content_copy</span>`;

    const incomingMessageDiv = createMessageElement(html, "incoming", "loading");
    chatContainer.appendChild(incomingMessageDiv);
    chatContainer.scrollTo(0, chatContainer.scrollHeight);
    generateAPIResponse(incomingMessageDiv);
}

// Copy message to clipboard
const copyMessage = (copyButton) => {
    const messageText = copyButton.parentElement.querySelector(".text").innerText;
    document.execCommand('copy', false, messageText);
    copyButton.innerText = "done";
    setTimeout(() => copyButton.innerText = "content_copy", 1000);
}

// Handle outgoing chat
const handleOutgoingChat = () => {
    userMessage = typingInput.value.trim().replace(/\*/g, '');
    if (!userMessage || isResponseGenerating) return;

    isResponseGenerating = true;

    const html = `<div class="message-content">
                    <img class="avatar" src="White-user.png">
                    <p class="text"></p>
                </div>`;

    const outgoingMessageDiv = createMessageElement(html, "outgoing");
    outgoingMessageDiv.querySelector(".text").innerText = userMessage;
    chatContainer.appendChild(outgoingMessageDiv);

    typingForm.reset();
    document.body.classList.add("hide-header");
    chatContainer.scrollTo(0, chatContainer.scrollHeight);
    setTimeout(showLoadingAnimation, 500);
    updateSendButtonState();
}

// Show modal for confirmation
const showConfirmationModal = (message, onConfirm) => {
    modalMessage.innerText = message;
    confirmationModal.style.display = 'flex';

    const handleConfirm = () => {
        onConfirm();
        confirmationModal.style.display = 'none';
        confirmActionBtn.removeEventListener('click', handleConfirm);
        cancelActionBtn.removeEventListener('click', handleCancel);
    };

    const handleCancel = () => {
        confirmationModal.style.display = 'none';
        confirmActionBtn.removeEventListener('click', handleConfirm);
        cancelActionBtn.removeEventListener('click', handleCancel);
    };

    confirmActionBtn.addEventListener('click', handleConfirm);
    cancelActionBtn.addEventListener('click', handleCancel);
};

// Theme toggle logic
toggleThemeButton.addEventListener("click", () => {
    const isLightMode = document.body.classList.toggle("light_mode");
    localStorage.setItem("themeColor", isLightMode ? "light_mode" : "dark_mode");
    toggleThemeButton.innerText = isLightMode ? "dark_mode" : "light_mode";
});

// Chat deletion logic
deleteChatButton.addEventListener("click", () => {
    showConfirmationModal("Are you sure you want to delete all the chats?", () => {
        localStorage.removeItem("saved-chats");
        loadDataFromLocalstorage();
    });
});

// Suggestion click handler
suggestions.forEach(suggestion => {
    suggestion.addEventListener("click", () => {
        typingInput.value = suggestion.querySelector(".text").innerText.replace(/\*/g, '');
        handleOutgoingChat();
    });
});

// Handle form submit
typingForm.addEventListener("submit", (e) => {
    e.preventDefault();
    handleOutgoingChat();
});

// Auto-resize textarea and button state
typingInput.addEventListener("input", () => {
    typingInput.style.height = 'auto';
    typingInput.style.height = typingInput.scrollHeight + 'px';
    updateSendButtonState();
});

// Enable/disable send button
const updateSendButtonState = () => {
    sendButton.disabled = typingInput.value.trim() === '';
};

// On window load
window.onload = () => {
    updateSendButtonState();
};
