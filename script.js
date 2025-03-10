// Constants
const MAX_CHARS = 280;
const DRAFTS_STORAGE_KEY = 'x_thread_drafts';
const IMAGE_STORAGE_PREFIX = 'x_thread_image_';

// DOM Elements
const threadPosts = document.querySelector('.thread-posts');
const addPostBtn = document.getElementById('addPost');
const clearThreadBtn = document.getElementById('clearThread');
const newDraftBtn = document.getElementById('newDraft');
const draftsList = document.querySelector('.drafts-list');

// State
let drafts = [];
let currentDraftId = null;

// Initialize the app
function init() {
    loadDrafts();
    setupEventListeners();
    if (drafts.length === 0) {
        createNewDraft();
    } else {
        switchToDraft(drafts[0].id);
    }
}

// Load drafts from localStorage
function loadDrafts() {
    const savedDrafts = localStorage.getItem(DRAFTS_STORAGE_KEY);
    if (savedDrafts) {
        drafts = JSON.parse(savedDrafts);
        renderDraftsList();
    }
}

// Save drafts to localStorage
function saveDrafts() {
    localStorage.setItem(DRAFTS_STORAGE_KEY, JSON.stringify(drafts));
}

// Setup event listeners
function setupEventListeners() {
    addPostBtn.addEventListener('click', addNewPost);
    clearThreadBtn.addEventListener('click', clearThread);
    newDraftBtn.addEventListener('click', () => createNewDraft());
}

// Create a new draft
function createNewDraft() {
    const draft = {
        id: Date.now(),
        title: 'Untitled Draft',
        posts: [],
        lastModified: new Date().toISOString()
    };
    drafts.push(draft);
    saveDrafts();
    renderDraftsList();
    switchToDraft(draft.id);
}

// Switch to a specific draft
function switchToDraft(draftId) {
    currentDraftId = draftId;
    const draft = drafts.find(d => d.id === draftId);
    if (draft) {
        posts = draft.posts;
        renderPosts();
        updateDraftTitle();
        renderDraftsList();
    }
}

// Update draft title based on first post content
function updateDraftTitle() {
    const draft = drafts.find(d => d.id === currentDraftId);
    if (draft && posts.length > 0) {
        const firstPostContent = posts[0].content.trim();
        const words = firstPostContent.split(/\s+/);
        const firstThreeWords = words.slice(0, 3).join(' ');
        draft.title = (firstThreeWords || 'Untitled Draft') + ' ...';
        draft.lastModified = new Date().toISOString();
        saveDrafts();
        renderDraftsList();
    }
}

// Render the drafts list
function renderDraftsList() {
    draftsList.innerHTML = '';
    drafts.forEach(draft => {
        const draftElement = document.createElement('div');
        draftElement.className = `draft-item ${draft.id === currentDraftId ? 'active' : ''}`;
        draftElement.innerHTML = `
            <div class="draft-content">
                <div class="draft-item-title">${draft.title}</div>
                <div class="draft-item-date">${new Date(draft.lastModified).toLocaleString()}</div>
            </div>
        `;
        
        // Add click handler for the draft content
        const draftContent = draftElement.querySelector('.draft-content');
        draftContent.addEventListener('click', () => switchToDraft(draft.id));
        
        draftsList.appendChild(draftElement);
    });
}

// Delete a draft
function deleteDraft(draftId) {
    if (confirm('Are you sure you want to delete this draft?')) {
        const draftIndex = drafts.findIndex(d => d.id === draftId);
        if (draftIndex !== -1) {
            // Remove the draft
            drafts.splice(draftIndex, 1);
            
            // If we deleted the last draft, create a new one
            if (drafts.length === 0) {
                createNewDraft();
            } else {
                // Switch to the first available draft
                switchToDraft(drafts[0].id);
            }
            
            saveDrafts();
            renderDraftsList();
        }
    }
}

// Add a new post to the current draft
function addNewPost() {
    const post = {
        id: Date.now(),
        content: '',
        image: null
    };
    posts.push(post);
    updateDraftTitle();
    renderPosts();
}

// Clear the current draft
function clearThread() {
    if (confirm('Are you sure you want to clear this draft?')) {
        const draftIndex = drafts.findIndex(d => d.id === currentDraftId);
        if (draftIndex !== -1) {
            drafts.splice(draftIndex, 1);
            saveDrafts();
            renderDraftsList();
            if (drafts.length === 0) {
                createNewDraft();
            } else {
                switchToDraft(drafts[0].id);
            }
        }
    }
}

// Render all posts
function renderPosts() {
    threadPosts.innerHTML = '';
    posts.forEach((post, index) => {
        const postElement = createPostElement(post, index);
        threadPosts.appendChild(postElement);
    });
}

// Copy post content to clipboard
function copyPostContent(postId) {
    const post = posts.find(p => p.id === postId);
    if (post) {
        navigator.clipboard.writeText(post.content)
            .then(() => {
                // Visual feedback could be added here
                console.log('Content copied to clipboard');
            })
            .catch(err => {
                console.error('Failed to copy content: ', err);
            });
    }
}

// Create a post element
function createPostElement(post, index) {
    const div = document.createElement('div');
    div.className = 'post';
    div.innerHTML = `
        <div 
            class="post-content" 
            contenteditable="true"
            placeholder="What's happening?"
            data-post-id="${post.id}"
        >${post.content}</div>
        <div class="post-footer">
            <div class="character-count">${post.content.length}/${MAX_CHARS}</div>
            <div class="post-actions">
                <button class="icon-btn copy-icon-btn" data-post-id="${post.id}" title="Copy post">
                    <svg viewBox="0 0 24 24">
                        <path d="M16 1H4C2.9 1 2 1.9 2 3v14h2V3h12V1zm3 4H8C6.9 5 6 5.9 6 7v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
                    </svg>
                </button>
                <input type="file" 
                    accept="image/*" 
                    class="image-input" 
                    data-post-id="${post.id}"
                >
                <button class="icon-btn image-upload-btn" data-post-id="${post.id}" title="Add image">
                    <svg viewBox="0 0 24 24">
                        <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
                    </svg>
                </button>
                ${index > 0 ? `
                    <button class="icon-btn delete-post-btn" data-post-id="${post.id}" title="Delete post">
                        <svg viewBox="0 0 24 24">
                            <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                        </svg>
                    </button>
                ` : ''}
            </div>
        </div>
        ${post.image ? `
            <div class="image-preview">
                <img src="${post.image}" alt="Preview">
            </div>
        ` : ''}
    `;

    // Add event listeners
    const contentDiv = div.querySelector('.post-content');
    
    // Initial render
    updateTextHighlighting(contentDiv);
    
    contentDiv.addEventListener('input', (e) => {
        handlePostInput(e);
        updateTextHighlighting(e.target);
    });

    const copyBtn = div.querySelector('.copy-icon-btn');
    copyBtn.addEventListener('click', () => copyPostContent(post.id));

    const imageInput = div.querySelector('.image-input');
    const imageUploadBtn = div.querySelector('.image-upload-btn');
    imageUploadBtn.addEventListener('click', () => imageInput.click());
    imageInput.addEventListener('change', handleImageUpload);

    const deleteBtn = div.querySelector('.delete-post-btn');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', () => deletePost(post.id));
    }

    return div;
}

// Update text highlighting
function updateTextHighlighting(element) {
    const content = element.textContent;
    const count = content.length;
    
    // Update character count
    const countElement = element.parentElement.querySelector('.character-count');
    countElement.textContent = `${count}/${MAX_CHARS}`;
    countElement.classList.toggle('over', count > MAX_CHARS);
    
    // Store cursor position and selection
    let cursorOffset = 0;
    let isInOverLimit = false;
    try {
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            if (range.commonAncestorContainer === element || element.contains(range.commonAncestorContainer)) {
                // Get the text content up to the cursor
                const preCaretRange = range.cloneRange();
                preCaretRange.selectNodeContents(element);
                preCaretRange.setEnd(range.endContainer, range.endOffset);
                cursorOffset = preCaretRange.toString().length;
                
                // Check if cursor is in the over-limit section
                isInOverLimit = cursorOffset > MAX_CHARS;
            }
        }
    } catch (e) {
        console.log('No active selection');
    }
    
    // Update text highlighting
    if (count > MAX_CHARS) {
        const normalText = content.slice(0, MAX_CHARS);
        const overLimitText = content.slice(MAX_CHARS);
        element.innerHTML = `${normalText}<span class="over-limit">${overLimitText}</span>`;
        
        // Restore cursor position if we had one
        if (cursorOffset > 0) {
            try {
                const selection = window.getSelection();
                const newRange = document.createRange();
                const textNodes = element.childNodes;
                
                if (isInOverLimit) {
                    // Cursor should be in the over-limit span
                    const overLimitSpan = element.querySelector('.over-limit');
                    const adjustedOffset = cursorOffset - MAX_CHARS;
                    newRange.setStart(overLimitSpan.firstChild, adjustedOffset);
                } else {
                    // Cursor should be in the normal text
                    newRange.setStart(element.firstChild, cursorOffset);
                }
                
                newRange.collapse(true);
                selection.removeAllRanges();
                selection.addRange(newRange);
            } catch (e) {
                console.log('Could not restore cursor position');
            }
        }
    } else {
        // If under limit, just show the text without any highlighting
        element.textContent = content;
        
        // Restore cursor position if we had one
        if (cursorOffset > 0) {
            try {
                const selection = window.getSelection();
                const newRange = document.createRange();
                newRange.setStart(element.firstChild, cursorOffset);
                newRange.collapse(true);
                selection.removeAllRanges();
                selection.addRange(newRange);
            } catch (e) {
                console.log('Could not restore cursor position');
            }
        }
    }
}

// Handle post content input
function handlePostInput(e) {
    const postId = parseInt(e.target.dataset.postId);
    const post = posts.find(p => p.id === postId);
    if (post) {
        const content = e.target.textContent;
        post.content = content;
        updateDraftTitle();
        saveDraft();
    }
}

// Handle image upload
function handleImageUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    const postId = parseInt(e.target.dataset.postId);
    const reader = new FileReader();

    reader.onload = (event) => {
        const post = posts.find(p => p.id === postId);
        if (post) {
            post.image = event.target.result;
            localStorage.setItem(`${IMAGE_STORAGE_PREFIX}${postId}`, event.target.result);
            updateDraftTitle();
            saveDraft();
            renderPosts();
        }
    };

    reader.readAsDataURL(file);
}

// Delete a post
function deletePost(postId) {
    if (confirm('Are you sure you want to delete this post?')) {
        posts = posts.filter(p => p.id !== postId);
        localStorage.removeItem(`${IMAGE_STORAGE_PREFIX}${postId}`);
        updateDraftTitle();
        saveDraft();
        renderPosts();
    }
}

// Save current draft
function saveDraft() {
    const draft = drafts.find(d => d.id === currentDraftId);
    if (draft) {
        draft.posts = posts;
        draft.lastModified = new Date().toISOString();
        saveDrafts();
    }
}

// Initialize the app when the DOM is loaded
document.addEventListener('DOMContentLoaded', init); 