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
            description: 'Open X with post #1',
            action: start.bind(null, draft.posts[0].content.trim())
        });
        if (draft.posts[0].image) {
            steps.push({
                description: 'Copy image for post #1',
                action: copyImageToClipboard.bind(null, draft.posts[0].image)
            });
        }
    }
    for (let i = 1; i < draft.posts.length; i++) {
        const post = draft.posts[i];
        if (post.content) {
            steps.push({
                description: `Copy text for post #${i + 1}`,
                action: copyTextToClipboard.bind(null, post.content.trim())
            });
        }
        if (post.image) {
            steps.push({
                description: `Copy image for post #${i + 1}`,
                action: copyImageToClipboard.bind(null, post.image)
            });
        }     
    }
    
    // Add final finish step
    steps.push({
        description: 'All set - post it!',
        action: () => {
            overlay.remove();
        }
    });
    
    return steps;
}

const overlay = document.createElement('div');

function createStepperUI(steps) {
    overlay.className = 'post-thread-overlay';
    overlay.innerHTML = `
        <div class="post-thread-stepper">
            <div class="stepper-header">
                <h2>Posting Thread</h2>
                <button class="close-btn" title="Close">
                    <svg viewBox="0 0 24 24">
                        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                    </svg>
                </button>
            </div>
            <div class="steps-container">
                ${steps.map((step, index) => `
                    <div class="step ${index === steps.length - 1 ? 'finish-step' : ''}" data-step="${index}">
                        <div class="step-number">${index === steps.length - 1 ? '✓' : index + 1}</div>
                        <div class="step-content">
                            <div class="step-description">${step.description}</div>
                            <button class="btn ${index === steps.length - 1 ? 'success' : 'primary'} step-action">
                                ${index === steps.length - 1 ? 'Finish' : 'Execute Step'}
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>
            <button class="btn secondary cancel-btn">Cancel</button>
        </div>
    `;
    
    document.body.appendChild(overlay);

    // Close on overlay click (outside stepper)
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            overlay.remove();
        }
    });

    // Close on X button click
    const closeBtn = overlay.querySelector('.close-btn');
    closeBtn.addEventListener('click', () => overlay.remove());

    return overlay;
}

function postThread(draftId) {
    const draft = drafts.find(d => d.id === draftId);
    if (!draft) return;

    // Check for posts exceeding character limit
    const invalidPosts = draft.posts.map((post, index) => ({
        index: index + 1,
        length: post.content.length
    })).filter(post => post.length > MAX_CHARS);

    if (invalidPosts.length > 0) {
        const message = invalidPosts.map(post => 
            `Post #${post.index} has ${post.length} characters (${post.length - MAX_CHARS} over limit)`
        ).join('\n');
        
        alert(`Cannot post thread. The following posts exceed ${MAX_CHARS} characters:\n\n${message}`);
        return;
    }

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
            // Close immediately on finish
            overlay.remove();
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
        background: var(--secondary-background);
        padding: 2rem;
        border-radius: 12px;
        max-width: 500px;
        width: 90%;
        color: var(--text-color);
    }

    .stepper-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1.5rem;
    }

    .stepper-header h2 {
        margin: 0;
    }

    .close-btn {
        background: none;
        border: none;
        cursor: pointer;
        padding: 8px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background-color 0.2s ease;
    }

    .close-btn:hover {
        background-color: rgba(255, 255, 255, 0.1);
    }

    .close-btn svg {
        width: 20px;
        height: 20px;
        fill: var(--text-color);
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
        background: var(--background-color);
        opacity: 0.7;
    }

    .step.active {
        background: rgba(29, 161, 242, 0.1);
        opacity: 1;
    }

    .step.completed {
        background: rgba(23, 191, 99, 0.1);
        opacity: 0.8;
    }

    .step.finish-step.active {
        background: rgba(23, 191, 99, 0.2);
        border: 1px solid var(--success-color);
    }

    .step-number {
        width: 28px;
        height: 28px;
        border-radius: 50%;
        background: var(--primary-color);
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
    }

    .finish-step .step-number {
        background: var(--success-color);
        font-size: 1.2rem;
    }

    .step-content {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: space-between;
    }

    .step-description {
        font-size: 0.9rem;
    }

    .btn.success {
        background-color: var(--success-color);
        color: white;
    }

    .cancel-btn {
        width: 100%;
    }
`;

document.head.appendChild(styles);