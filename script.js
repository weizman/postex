// Constants
const MAX_CHARS = 280;
const DRAFTS_STORAGE_KEY = 'x_thread_drafts';
const IMAGE_STORAGE_PREFIX = 'x_thread_image_';

// DOM Elements
const threadPosts = document.querySelector('.thread-posts');
const addPostBtn = document.getElementById('addPost');
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
    newDraftBtn.addEventListener('click', () => createNewDraft());
}

// Create a new draft
function createNewDraft() {
    const draft = {
        id: Date.now(),
        title: 'Untitled Draft',
        posts: [{  // Add an initial empty post
            id: Date.now(),
            content: '',
            image: null
        }],
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

// Render all posts
function renderPosts() {
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