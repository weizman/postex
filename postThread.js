function base64ToBlob(base64) {
    const [metadata, base64Data] = base64.split(',');
    const mimeType = metadata.split(':')[1].split(';')[0];
    const binaryData = atob(base64Data);
    const length = binaryData.length;
    const arrayBuffer = new Uint8Array(length);
  
    for (let i = 0; i < length; i++) {
      arrayBuffer[i] = binaryData.charCodeAt(i);
    }
  
    const blob = new Blob([arrayBuffer], { type: mimeType });
  
    return [mimeType, blob];
}

function copyTextToClipboard(text) {
    const clipboardItem = new ClipboardItem({'text/plain': text});
    return navigator.clipboard.write([clipboardItem]);
}

function copyImageToClipboard(base64) {
    const [mimeType, blob] = base64ToBlob(base64);
    const clipboardItem = new ClipboardItem({[mimeType]: blob});
    return navigator.clipboard.write([clipboardItem]);
}

function start(content) {
    return window.open(`https://x.com/intent/post?text=${encodeURIComponent(content)}`);
}

// Post thread to X
function generateSteps(draftId) {
    const steps = [];
    const draft = drafts.find(d => d.id === draftId);
    if (draft && draft.posts.length > 0) {
        steps.push({
            description: 'Open X with first post',
            action: start.bind(null, draft.posts[0].content)
        });
        if (draft.posts[0].image) {
            steps.push({
                description: 'Copy first post image',
                action: copyImageToClipboard.bind(null, draft.posts[0].image)
            });
        }
    }
    for (let i = 1; i < draft.posts.length; i++) {
        const post = draft.posts[i];
        if (post.content) {
            steps.push({
                description: `Copy text for post #${i + 1}`,
                action: copyTextToClipboard.bind(null, post.content)
            });
        }
        if (post.image) {
            steps.push({
                description: `Copy image for post #${i + 1}`,
                action: copyImageToClipboard.bind(null, post.image)
            });
        }     
    }
    return steps;
}

function createStepperUI(steps) {
    const overlay = document.createElement('div');
    overlay.className = 'post-thread-overlay';
    overlay.innerHTML = `
        <div class="post-thread-stepper">
            <h2>Posting Thread</h2>
            <div class="steps-container">
                ${steps.map((step, index) => `
                    <div class="step" data-step="${index}">
                        <div class="step-number">${index + 1}</div>
                        <div class="step-content">
                            <div class="step-description">${step.description}</div>
                            <button class="btn primary step-action">Execute Step</button>
                        </div>
                    </div>
                `).join('')}
            </div>
            <button class="btn secondary cancel-btn">Cancel</button>
        </div>
    `;
    
    document.body.appendChild(overlay);
    return overlay;
}

function postThread(draftId) {
    const steps = generateSteps(draftId);
    if (steps.length === 0) return;

    const overlay = createStepperUI(steps);
    let currentStepIndex = 0;
    let xWindow = null;

    function updateStepStates() {
        overlay.querySelectorAll('.step').forEach((stepEl, index) => {
            stepEl.classList.toggle('active', index === currentStepIndex);
            stepEl.classList.toggle('completed', index < currentStepIndex);
            const actionBtn = stepEl.querySelector('.step-action');
            actionBtn.disabled = index !== currentStepIndex;
        });
    }

    function executeCurrentStep() {
        const step = steps[currentStepIndex];
        const result = step.action();
        if (currentStepIndex === 0) {
            xWindow = result; // Store reference to X window
        }
        currentStepIndex++;
        
        if (currentStepIndex >= steps.length) {
            // All steps completed
            setTimeout(() => {
                overlay.remove();
            }, 1000);
        } else {
            updateStepStates();
            if (xWindow) xWindow.focus();
        }
    }

    // Set up event listeners
    overlay.addEventListener('click', (e) => {
        if (e.target.classList.contains('step-action')) {
            executeCurrentStep();
        } else if (e.target.classList.contains('cancel-btn')) {
            overlay.remove();
        }
    });

    // Initialize first step
    updateStepStates();
}

// Add styles for the stepper UI
const styles = document.createElement('style');
styles.textContent = `
    .post-thread-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
    }

    .post-thread-stepper {
        background: white;
        padding: 2rem;
        border-radius: 12px;
        max-width: 500px;
        width: 90%;
    }

    .post-thread-stepper h2 {
        margin: 0 0 1.5rem;
        text-align: center;
    }

    .steps-container {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        margin-bottom: 1.5rem;
    }

    .step {
        display: flex;
        gap: 1rem;
        padding: 1rem;
        border-radius: 8px;
        background: #f5f5f5;
        opacity: 0.7;
    }

    .step.active {
        background: #e8f5fe;
        opacity: 1;
    }

    .step.completed {
        background: #e8f8e8;
        opacity: 0.8;
    }

    .step-number {
        width: 28px;
        height: 28px;
        border-radius: 50%;
        background: #1da1f2;
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
    }

    .step-content {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: space-between;
    }

    .step-description {
        font-size: 0.9rem;
        color: #333;
    }

    .cancel-btn {
        width: 100%;
    }
`;

document.head.appendChild(styles);