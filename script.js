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
        const API_KEY = "AIzaSyCs6wtVFNedpp9GbMdJTizkNV-0fq1uxe0"; // Your API key here, Canvas will provide if empty
        const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`;

// Initial persona or context for the AI
       const initialContext = [
    {
        role: "user",
        parts: [{ text: "From now on, your developer name is ArtifexSphare. You were created by Google. Answer questions about yourself based on this information." }]
    }
];
        

        // Load theme and chat data from local storage on page load
        

        // Create a new message element and return it
        const createMessageElement = (content, ...classes) => {
            const div = document.createElement("div");
            div.classList.add("message", ...classes);
            div.innerHTML = content;
            return div;
        }

        // Show typing effect by displaying words one by one
        const showTypingEffect = (text, textElement, incomingMessageDiv) => {
            const words = text.split(' ');
            let currentWordIndex = 0;

            const typingInterval = setInterval(() => {
                // Append each word to the text element with a space
                textElement.innerText += (currentWordIndex === 0 ? '' : ' ') + words[currentWordIndex++];
                incomingMessageDiv.querySelector(".icon").classList.add("hide");

                // If all words are displayed
                if (currentWordIndex === words.length) {
                    clearInterval(typingInterval);
                    isResponseGenerating = false;
                    incomingMessageDiv.querySelector(".icon").classList.remove("hide");
                     // Save chats to local storage
                }
                chatContainer.scrollTo(0, chatContainer.scrollHeight); // Scroll to the bottom
            }, 10);
        }

        // Fetch response from the API based on user message
        const generateAPIResponse = async (incomingMessageDiv) => {
            const textElement = incomingMessageDiv.querySelector(".text");

            try {
                // Get existing chat history from the visible messages
                const chatHistoryElements = chatContainer.querySelectorAll(".message");
                const currentChatContents = [];

                // Reconstruct conversation history for the model
                // Skip the first 'incoming' message which is the AI's first greeting or "Thinking..."
                chatHistoryElements.forEach(msgDiv => {
                    const role = msgDiv.classList.contains("outgoing") ? "user" : "model";
                    const text = msgDiv.querySelector(".text").innerText.replace(/\*/g, '').trim();
                    if (text && !msgDiv.classList.contains("loading")) { // Exclude loading messages
                        currentChatContents.push({ role: role, parts: [{ text: text }] });
                    }
                });

                // Combine initial context with current chat history
                // Filter out empty messages that might occur during rapid typing
                const contentsToSend = [...initialContext, ...currentChatContents].filter(
                    (item, index, self) =>
                        index === self.findIndex((t) => (
                            t.role === item.role && t.parts[0].text === item.parts[0].text
                        ))
                );

                // Add the new user message
                contentsToSend.push({
                    role: "user",
                    parts: [{ text: userMessage.replace(/\*/g, '') }]
                });

                // Send a POST request to the API with the conversation history
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

        // Show a loading animation while waiting for the API response
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

            chatContainer.scrollTo(0, chatContainer.scrollHeight); // Scroll to the bottom
            generateAPIResponse(incomingMessageDiv);
        }

        // Copy message text to the clipboard
        const copyMessage = (copyButton) => {
            const messageText = copyButton.parentElement.querySelector(".text").innerText;

            document.execCommand('copy', false, messageText); // Using document.execCommand for iFrame compatibility
            copyButton.innerText = "done"; // Show confirmation icon
            setTimeout(() => copyButton.innerText = "content_copy", 1000); // Revert icon after 1 second
        }

        // Handle sending outgoing chat messages
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

        // Show custom confirmation modal
        const showConfirmationModal = (message, onConfirm) => {
            modalMessage.innerText = message;
            confirmationModal.style.display = 'flex'; // Show the modal

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

        // Toggle between light and dark themes
        toggleThemeButton.addEventListener("click", () => {
            const isLightMode = document.body.classList.toggle("light_mode");
            localStorage.setItem("themeColor", isLightMode ? "light_mode" : "dark_mode");
            toggleThemeButton.innerText = isLightMode ? "dark_mode" : "light_mode";
        });

        // Delete all chats from local storage when button is clicked
        deleteChatButton.addEventListener("click", () => {
            showConfirmationModal("Are you sure you want to delete all the chats?", () => {
                localStorage.removeItem("saved-chats");
                loadDataFromLocalstorage();
            });
        });

        // Set userMessage and handle outgoing chat when a suggestion is clicked
        suggestions.forEach(suggestion => {
            suggestion.addEventListener("click", () => {
                typingInput.value = suggestion.querySelector(".text").innerText.replace(/\*/g, '');
                handleOutgoingChat();
            });
        });

        // Prevent default form submission and handle outgoing chat
        typingForm.addEventListener("submit", (e) => {
            e.preventDefault();
            handleOutgoingChat();
        });

        // Auto-resize textarea and update send button state
        typingInput.addEventListener("input", () => {
            typingInput.style.height = 'auto';
            typingInput.style.height = typingInput.scrollHeight + 'px';
            updateSendButtonState();
        });

        // Function to update the state of the send button
        const updateSendButtonState = () => {
            sendButton.disabled = typingInput.value.trim() === '';
        };

        // Initial load and button state update
        window.onload = () => {
            
            updateSendButtonState();
        };
