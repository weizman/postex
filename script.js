// Constants
const MAX_CHARS = 280;
const DRAFTS_STORAGE_KEY = 'x_thread_drafts';
const IMAGE_STORAGE_PREFIX = 'x_thread_image_';

// IndexedDB setup
let db;
const DB_NAME = 'x_thread_db';
const DB_VERSION = 1;
const DRAFTS_STORE = 'drafts';
const IMAGES_STORE = 'images';

// Initialize IndexedDB
const initDB = () => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            db = request.result;
            resolve(db);
        };

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            
            // Create drafts store
            if (!db.objectStoreNames.contains(DRAFTS_STORE)) {
                db.createObjectStore(DRAFTS_STORE, { keyPath: 'id' });
            }
            
            // Create images store
            if (!db.objectStoreNames.contains(IMAGES_STORE)) {
                db.createObjectStore(IMAGES_STORE, { keyPath: 'id' });
            }
        };
    });
};

// IndexedDB helper functions
const dbGetAll = (storeName) => {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.getAll();
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
    });
};

const dbGet = (storeName, key) => {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.get(key);
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
    });
};

const dbPut = (storeName, value) => {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.put(value);
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
    });
};

const dbDelete = (storeName, key) => {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.delete(key);
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
    });
};

// DOM Elements
const threadPosts = document.querySelector('.thread-posts');
const addPostBtn = document.getElementById('addPost');
const newDraftBtn = document.getElementById('newDraft');
const draftsList = document.querySelector('.drafts-list');

// State
let drafts = [];
let currentDraftId = null;
let currentEmoji = {
    target: null,
    range: null
};

// Initialize emoji picker
const pickerOptions = {
    onEmojiSelect: (emoji) => {
        const { target, range } = currentEmoji;
        // Check if we have a valid target and it's a post content div
        if (target && target.classList.contains('post-content')) {
            // Insert the emoji at the stored range position
            const emojiText = emoji.native;
            const textNode = document.createTextNode(emojiText);
            
            // Focus back on the content div
            target.focus();
            
            // Use the stored range
            const selection = window.getSelection();
            selection.removeAllRanges();
            const newRange = range.cloneRange();
            selection.addRange(newRange);
            
            // Insert the emoji
            newRange.insertNode(textNode);
            
            // Move cursor after emoji
            newRange.setStartAfter(textNode);
            newRange.setEndAfter(textNode);
            
            // Store the new range for next emoji
            currentEmoji.range = newRange.cloneRange();
            
            // Trigger input event to save content
            const event = new Event('input', { bubbles: true });
            target.dispatchEvent(event);
        }
        
        // Hide picker after selection
        const picker = document.querySelector('.emoji-mart');
        if (picker) picker.style.display = 'none';
    }
};

const picker = new EmojiMart.Picker(pickerOptions);
picker.style.display = 'none';
picker.style.position = 'absolute';
picker.style.zIndex = '1000';
document.body.appendChild(picker);

// Add click handler to document to hide picker when clicking outside
document.addEventListener('click', (e) => {
    if (e.target !== picker && !picker.contains(e.target)) {
        picker.style.display = 'none';
    }
});

// Initialize the app
async function init() {
    try {
        await initDB();
        await loadDrafts();
        setupEventListeners();
        if (drafts.length === 0) {
            await createNewDraft();
        } else {
            await switchToDraft(drafts[0].id);
        }
    } catch (error) {
        console.error('Failed to initialize app:', error);
    }
}

// Load drafts from IndexedDB
async function loadDrafts() {
    try {
        drafts = await dbGetAll(DRAFTS_STORE);
        renderDraftsList();
    } catch (error) {
        console.error('Failed to load drafts:', error);
        drafts = [];
    }
}

// Save drafts to IndexedDB
async function saveDrafts() {
    try {
        const promises = drafts.map(draft => dbPut(DRAFTS_STORE, draft));
        await Promise.all(promises);
    } catch (error) {
        console.error('Failed to save drafts:', error);
    }
}

// Setup event listeners
function setupEventListeners() {
    addPostBtn.addEventListener('click', addNewPost);
    newDraftBtn.addEventListener('click', () => createNewDraft());
}

// Create a new draft
async function createNewDraft() {
    const draft = {
        id: Date.now(),
        title: 'Untitled Draft',
        quoteUrl: '',
        posts: [{  // Add an initial empty post
            id: Date.now(),
            content: '',
            images: []  // Changed from image: null to images array
        }],
        lastModified: new Date().toISOString()
    };
    drafts.push(draft);
    await saveDrafts();
    renderDraftsList();
    await switchToDraft(draft.id);
}

// Switch to a specific draft
async function switchToDraft(draftId) {
    currentDraftId = draftId;
    const draft = drafts.find(d => d.id === draftId);
    if (draft) {
        posts = draft.posts;
        // Load images for all posts
        for (const post of posts) {
            // Initialize images array if it doesn't exist (for backward compatibility)
            if (!Array.isArray(post.images)) {
                post.images = post.image ? [post.image] : [];
                delete post.image;
            }
            
            // Load all images for the post
            for (let i = 0; i < post.images.length; i++) {
                try {
                    const imageData = await dbGet(IMAGES_STORE, `${post.id}_${i}`);
                    if (imageData) {
                        post.images[i] = imageData.data;
                    }
                } catch (error) {
                    console.error('Failed to load image for post:', post.id, i, error);
                }
            }
        }
        renderPosts();
        updateDraftTitle();
        renderDraftsList();
    }
}

// Update draft title based on first post content
async function updateDraftTitle() {
    const draft = drafts.find(d => d.id === currentDraftId);
    if (draft && posts.length > 0) {
        const firstPostContent = posts[0].content.trim();
        const words = firstPostContent.split(/\s+/);
        const firstThreeWords = words.slice(0, 3).join(' ');
        draft.title = (firstThreeWords || 'Untitled Draft') + ' ...';
        draft.lastModified = new Date().toISOString();
        await saveDrafts();
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
            <div class="draft-actions">
                <button class="icon-btn post-thread-btn" title="Post Thread">
                    <svg viewBox="0 0 24 24">
                        <path d="M23.77 15.67c-.292-.293-.767-.293-1.06 0l-2.22 2.22V7.65c0-2.068-1.683-3.75-3.75-3.75h-5.85c-.414 0-.75.336-.75.75s.336.75.75.75h5.85c1.24 0 2.25 1.01 2.25 2.25v10.24l-2.22-2.22c-.293-.293-.768-.293-1.06 0s-.294.768 0 1.06l3.5 3.5c.145.147.337.22.53.22s.383-.072.53-.22l3.5-3.5c.294-.292.294-.767 0-1.06zm-10.66 3.28H7.26c-1.24 0-2.25-1.01-2.25-2.25V6.46l2.22 2.22c.148.147.34.22.532.22s.384-.073.53-.22c.293-.293.293-.768 0-1.06l-3.5-3.5c-.293-.294-.768-.294-1.06 0l-3.5 3.5c-.294.292-.294.767 0 1.06s.767.293 1.06 0l2.22-2.22V16.7c0 2.068 1.683 3.75 3.75 3.75h5.85c.414 0 .75-.336.75-.75s-.337-.75-.75-.75z"/>
                    </svg>
                </button>
                <button class="icon-btn delete-thread-btn" title="Delete Thread">
                    <svg viewBox="0 0 24 24">
                        <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                    </svg>
                </button>
            </div>
        `;
        
        // Add click handler for the draft content
        const draftContent = draftElement.querySelector('.draft-content');
        draftContent.addEventListener('click', () => switchToDraft(draft.id));
        
        // Add click handler for the post thread button
        const postThreadBtn = draftElement.querySelector('.post-thread-btn');
        postThreadBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent triggering the draft item click
            postThread(draft.id);
        });

        // Add click handler for the delete thread button
        const deleteThreadBtn = draftElement.querySelector('.delete-thread-btn');
        deleteThreadBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent triggering the draft item click
            deleteDraft(draft.id);
        });
        
        draftsList.appendChild(draftElement);
    });
}

// Delete a draft
async function deleteDraft(draftId) {
    if (confirm('Are you sure you want to delete this draft?')) {
        const draftIndex = drafts.findIndex(d => d.id === draftId);
        if (draftIndex !== -1) {
            const draft = drafts[draftIndex];
            
            // Delete all images associated with the draft's posts
            const deleteImagePromises = draft.posts
                .filter(post => post.images && post.images.length > 0)
                .map(post => post.images.map((_, index) => dbDelete(IMAGES_STORE, `${post.id}_${index}`)));
            
            try {
                // Delete images and draft
                await Promise.all([
                    ...deleteImagePromises.flat(),
                    dbDelete(DRAFTS_STORE, draftId)
                ]);
                
                // Remove from local array
                drafts.splice(draftIndex, 1);
                
                // If we deleted the last draft, create a new one
                if (drafts.length === 0) {
                    await createNewDraft();
                } else {
                    // Switch to the first available draft
                    await switchToDraft(drafts[0].id);
                }
                
                renderDraftsList();
            } catch (error) {
                console.error('Failed to delete draft:', error);
            }
        }
    }
}

// Add a new post to the current draft
async function addNewPost() {
    const post = {
        id: Date.now(),
        content: '',
        images: []  // Initialize with empty images array
    };
    posts.push(post);
    await updateDraftTitle();
    renderPosts();
    
    // Find and focus the newly added post
    const newPostElement = threadPosts.querySelector(`[data-post-id="${post.id}"]`);
    if (newPostElement) {
        newPostElement.focus();
        // Scroll the new post into view with smooth behavior
        newPostElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

// Render all posts
function renderPosts() {
    const draft = drafts.find(d => d.id === currentDraftId);
    
    // Create quote URL input if it doesn't exist
    let quoteUrlInput = document.querySelector('.quote-url-input');
    if (!quoteUrlInput) {
        quoteUrlInput = document.createElement('div');
        quoteUrlInput.className = 'quote-url-input';
        quoteUrlInput.setAttribute('contenteditable', 'true');
        quoteUrlInput.setAttribute('placeholder', 'Place URL of post to quote (optional)');
        threadPosts.parentElement.insertBefore(quoteUrlInput, threadPosts);
        
        // Add input handler for quote URL
        quoteUrlInput.addEventListener('input', () => {
            const draft = drafts.find(d => d.id === currentDraftId);
            if (draft) {
                draft.quoteUrl = quoteUrlInput.textContent.trim();
                saveDrafts();
            }
        });
    }
    
    // Update quote URL input value
    if (draft && draft.quoteUrl) {
        quoteUrlInput.textContent = draft.quoteUrl;
    } else {
        quoteUrlInput.textContent = '';
    }
    
    threadPosts.innerHTML = '';
    posts.forEach((post, index) => {
        const postElement = createPostElement(post, index);
        threadPosts.appendChild(postElement);
    });

    // Focus on the first post's content if it's empty
    if (posts.length > 0 && !posts[0].content) {
        const firstPost = threadPosts.querySelector('.post-content');
        if (firstPost) {
            firstPost.focus();
        }
    }
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
    
    // Create the main post content
    const contentHtml = `
        <div 
            class="post-content" 
            contenteditable="true"
            placeholder="What's happening?"
            data-post-id="${post.id}"
        >${post.content}</div>
        <div class="post-footer">
            <div class="character-count">${post.content.length}/${MAX_CHARS}</div>
            <div class="post-actions">
                <button class="icon-btn emoji-btn" title="Add emoji">
                    <svg viewBox="0 0 24 24">
                        <path d="M12 22.75C6.072 22.75 1.25 17.928 1.25 12S6.072 1.25 12 1.25 22.75 6.072 22.75 12 17.928 22.75 12 22.75zm0-20C6.9 2.75 2.75 6.9 2.75 12S6.9 21.25 12 21.25s9.25-4.15 9.25-9.25S17.1 2.75 12 2.75z"/>
                        <path d="M12 17.115c-2.25 0-4.309-.876-5.875-2.467a.748.748 0 01-.053-.938.751.751 0 011.063-.053c1.314 1.358 3.027 2.106 4.865 2.106s3.551-.748 4.865-2.106a.751.751 0 011.063.053.748.748 0 01-.053.938c-1.566 1.591-3.625 2.467-5.875 2.467z"/>
                        <circle cx="8.5" cy="9.5" r="1.5"/>
                        <circle cx="15.5" cy="9.5" r="1.5"/>
                    </svg>
                </button>
                <button class="icon-btn copy-icon-btn" data-post-id="${post.id}" title="Copy post">
                    <svg viewBox="0 0 24 24">
                        <path d="M16 1H4C2.9 1 2 1.9 2 3v14h2V3h12V1zm3 4H8C6.9 5 6 5.9 6 7v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
                    </svg>
                </button>
                <input type="file" 
                    accept="image/*" 
                    class="image-input" 
                    data-post-id="${post.id}"
                    ${post.images && post.images.length >= 4 ? 'disabled' : ''}
                >
                <button class="icon-btn image-upload-btn" 
                    data-post-id="${post.id}" 
                    title="Add image"
                    ${post.images && post.images.length >= 4 ? 'disabled' : ''}>
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
    `;
    
    div.innerHTML = contentHtml;
    
    // Add images grid if there are images
    if (post.images && post.images.length > 0) {
        const imageGrid = document.createElement('div');
        imageGrid.className = 'image-grid';
        
        post.images.forEach((image, imageIndex) => {
            const imageContainer = document.createElement('div');
            imageContainer.className = 'image-container';
            imageContainer.innerHTML = `
                <div class="image-preview">
                    <img src="${image}" alt="Preview" data-post-id="${post.id}" data-image-index="${imageIndex}">
                    <button class="icon-btn remove-image-btn" data-post-id="${post.id}" data-image-index="${imageIndex}" title="Remove image">
                        <svg viewBox="0 0 24 24">
                            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                        </svg>
                    </button>
                </div>
            `;
            imageGrid.appendChild(imageContainer);
        });
        
        div.appendChild(imageGrid);
    }

    // Add event listeners
    const contentDiv = div.querySelector('.post-content');
    const emojiBtn = div.querySelector('.emoji-btn');
    
    // Initial render
    updateTextHighlighting(contentDiv);
    
    contentDiv.addEventListener('input', (e) => {
        handlePostInput(e);
        updateTextHighlighting(e.target);
    });
    
    contentDiv.addEventListener('drop', (ev) => {
        ev.preventDefault();
        if (ev.dataTransfer.files?.[0]) {
            const file = ev.dataTransfer.files[0];
            const reader = new FileReader();
            reader.onload = e => saveImage(e, post);
            reader.readAsDataURL(file);
        }
    });

    // Add emoji picker handler
    emojiBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        
        // Focus the content div first
        contentDiv.focus();
        
        // Store the current selection state
        const selection = window.getSelection();
        const range = selection.getRangeAt(0);
        
        currentEmoji = {
            target: contentDiv,
            range: range.cloneRange()
        };
        
        // Position picker near the emoji button
        const rect = emojiBtn.getBoundingClientRect();
        picker.style.top = `${rect.bottom + window.scrollY + 5}px`;
        picker.style.left = `${rect.left + window.scrollX}px`;
        
        // Toggle picker visibility
        const isVisible = picker.style.display === 'block';
        picker.style.display = isVisible ? 'none' : 'block';
    });

    const copyBtn = div.querySelector('.copy-icon-btn');
    copyBtn.addEventListener('click', () => copyPostContent(post.id));

    const imageInput = div.querySelector('.image-input');
    const imageUploadBtn = div.querySelector('.image-upload-btn');
    imageUploadBtn.addEventListener('click', () => {
        if (post.images && post.images.length >= 4) {
            alert('Maximum of 4 images allowed per post');
            return;
        }
        imageInput.click();
    });
    
    imageInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = e => saveImage(e, post);
        reader.readAsDataURL(file);
    });

    // Add remove image button handlers
    const removeImageBtns = div.querySelectorAll('.remove-image-btn');
    removeImageBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const imageIndex = parseInt(btn.dataset.imageIndex);
            removeImage(post.id, imageIndex);
        });
    });

    const deleteBtn = div.querySelector('.delete-post-btn');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', () => deletePost(post.id));
    }

    return div;
}

function openUrl(url) {
    window.open(url, '_blank');
}

// Update text highlighting
function updateTextHighlighting(element) {
    const content = element.textContent;
    
    // URL detection regex
    const urlRegex = /(https?:\/\/[^\s<]+[^<.,:;"')\]\s])/g;
    
    // Calculate adjusted character count
    let adjustedCount = content.length;
    const urls = content.match(urlRegex) || [];
    
    // Adjust the count by replacing each URL's actual length with 23
    urls.forEach(url => {
        adjustedCount = adjustedCount - url.length + 23;
    });
    
    // Update character count
    const countElement = element.parentElement.querySelector('.character-count');
    countElement.textContent = `${adjustedCount}/${MAX_CHARS}`;
    countElement.classList.toggle('over', adjustedCount > MAX_CHARS);
    
    // Store cursor position
    let cursorOffset = 0;
    let isInOverLimit = false;
    try {
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            if (range.commonAncestorContainer === element || element.contains(range.commonAncestorContainer)) {
                const preCaretRange = range.cloneRange();
                preCaretRange.selectNodeContents(element);
                preCaretRange.setEnd(range.endContainer, range.endOffset);
                cursorOffset = preCaretRange.toString().length;
                isInOverLimit = cursorOffset > MAX_CHARS;
            }
        }
    } catch (e) {
        console.log('No active selection');
    }
    
    // Format the content with URL highlighting and character limit
    let formattedContent = content;
    
    // First, escape any HTML in the content
    formattedContent = formattedContent.replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    
    // Then highlight URLs
    formattedContent = formattedContent.replace(urlRegex, '<span class="url">$1</span>');
    
    // Finally, apply character limit highlighting if needed
    if (adjustedCount > MAX_CHARS) {
        // We need to find where the actual cut-off should be considering URL lengths
        let visibleLength = 0;
        let cutoffIndex = 0;
        let currentIndex = 0;
        
        while (visibleLength < MAX_CHARS && currentIndex < content.length) {
            let urlMatch = null;
            urlRegex.lastIndex = currentIndex;  // Reset regex search position
            const isUrlStart = content.slice(currentIndex).match(urlRegex);
            
            if (isUrlStart && isUrlStart.index === 0) {
                // We're at the start of a URL
                const url = isUrlStart[0];
                visibleLength += 23;
                currentIndex += url.length;
                if (visibleLength <= MAX_CHARS) {
                    cutoffIndex = currentIndex;
                }
            } else {
                // Regular character
                visibleLength += 1;
                currentIndex += 1;
                if (visibleLength <= MAX_CHARS) {
                    cutoffIndex = currentIndex;
                }
            }
        }
        
        const normalText = content.slice(0, cutoffIndex);
        const overLimitText = content.slice(cutoffIndex);
        
        // Re-format both parts with URL highlighting
        let formattedNormal = normalText.replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(urlRegex, '<span class="url">$1</span>');
            
        let formattedOverLimit = overLimitText.replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(urlRegex, '<span class="url">$1</span>');
            
        element.innerHTML = `${formattedNormal}<span class="over-limit">${formattedOverLimit}</span>`;
    } else {
        element.innerHTML = formattedContent;
    }
    
    // Restore cursor position
    if (cursorOffset > 0) {
        try {
            const selection = window.getSelection();
            const newRange = document.createRange();
            
            // Function to find the correct text node and offset
            function findPositionInFormattedContent(targetOffset) {
                let currentOffset = 0;
                const walker = document.createTreeWalker(
                    element,
                    NodeFilter.SHOW_TEXT,
                    null,
                    false
                );
                
                let node;
                while ((node = walker.nextNode())) {
                    const nodeLength = node.length;
                    if (currentOffset + nodeLength >= targetOffset) {
                        return {
                            node: node,
                            offset: targetOffset - currentOffset
                        };
                    }
                    currentOffset += nodeLength;
                }
                
                // If we couldn't find the exact position, return the last possible position
                const lastNode = element.lastChild;
                return {
                    node: lastNode.nodeType === 3 ? lastNode : element,
                    offset: lastNode.nodeType === 3 ? lastNode.length : 0
                };
            }
            
            const position = findPositionInFormattedContent(cursorOffset);
            newRange.setStart(position.node, position.offset);
            newRange.collapse(true);
            selection.removeAllRanges();
            selection.addRange(newRange);
        } catch (e) {
            console.log('Could not restore cursor position');
        }
    }
}

// Handle post content input
async function handlePostInput(e) {
    const postId = parseInt(e.target.dataset.postId);
    const post = posts.find(p => p.id === postId);
    if (post) {
        const content = e.target.textContent;
        post.content = content;
        await updateDraftTitle();
        await saveDraft();
    }
}

async function saveImage(event, post, index) {
    try {
        // Add the image to the post's images array
        if (!Array.isArray(post.images)) {
            post.images = [];
        }
        
        // Check if we've reached the limit
        if (post.images.length >= 4) {
            alert('Maximum of 4 images allowed per post');
            return;
        }
        
        // If no index provided, add to the end
        if (typeof index !== 'number') {
            index = post.images.length;
        }
        
        post.images[index] = event.target.result;
        
        // Save to IndexedDB with a compound key
        await dbPut(IMAGES_STORE, {
            id: `${post.id}_${index}`,
            data: event.target.result
        });
        
        await updateDraftTitle();
        await saveDraft();
        renderPosts();
    } catch (error) {
        console.error('Failed to save image:', error);
        alert('Failed to save image. Please try again.');
    }
}

// Handle image upload
function handleImageUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    const postId = parseInt(e.target.dataset.postId);
    const post = posts.find(p => p.id === postId);
    const reader = new FileReader();
    reader.onload = e => saveImage(e, post, index);
    reader.readAsDataURL(file);
}

// Delete a post
async function deletePost(postId) {
    if (confirm('Are you sure you want to delete this post?')) {
        const postIndex = posts.findIndex(p => p.id === postId);
        const post = posts[postIndex];
        
        if (post && post.images && post.images.length > 0) {
            try {
                // Delete all images associated with the post
                const deletePromises = post.images.map((_, index) => 
                    dbDelete(IMAGES_STORE, `${postId}_${index}`)
                );
                await Promise.all(deletePromises);
            } catch (error) {
                console.error('Failed to delete images:', error);
            }
        }
        
        // Remove the post
        posts = posts.filter(p => p.id !== postId);
        await updateDraftTitle();
        await saveDraft();
        renderPosts();
        
        // Focus on the post above the deleted one (or the last post if we deleted the first one)
        const targetIndex = Math.min(postIndex, posts.length - 1);
        if (targetIndex >= 0) {
            const targetPost = posts[targetIndex];
            const targetElement = threadPosts.querySelector(`[data-post-id="${targetPost.id}"]`);
            if (targetElement) {
                targetElement.focus();
                // Scroll the target post into view with smooth behavior
                targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    }
}

// Save current draft
async function saveDraft() {
    const draft = drafts.find(d => d.id === currentDraftId);
    if (draft) {
        draft.posts = posts;
        draft.lastModified = new Date().toISOString();
        await saveDrafts();
    }
}

// Remove image from post
async function removeImage(postId, imageIndex) {
    const post = posts.find(p => p.id === postId);
    if (post && post.images && post.images[imageIndex]) {
        try {
            // Remove the image from IndexedDB
            await dbDelete(IMAGES_STORE, `${postId}_${imageIndex}`);
            
            // Remove the image from the array
            post.images.splice(imageIndex, 1);
            
            await updateDraftTitle();
            await saveDraft();
            renderPosts();
        } catch (error) {
            console.error('Failed to remove image:', error);
            alert('Failed to remove image. Please try again.');
        }
    }
}

// Initialize the app when the DOM is loaded
document.addEventListener('DOMContentLoaded', init); 