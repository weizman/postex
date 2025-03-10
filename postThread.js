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
    navigator.clipboard.write([clipboardItem]);
}

function copyImageToClipboard(base64) {
    const [mimeType, blob] = base64ToBlob(base64);
    const clipboardItem = new ClipboardItem({[mimeType]: blob});
    navigator.clipboard.write([clipboardItem]);
}

function start(content) {
    window.open(`https://x.com/intent/post?text=${encodeURIComponent(content)}`);
}


// Post thread to X
function generateSteps(draftId) {
    const steps = [];
    const draft = drafts.find(d => d.id === draftId);
    if (draft && draft.posts.length > 0) {
        steps.push(start.bind(null, draft.posts[0].content));
        if (draft.posts[0].image) {
            steps.push(copyImageToClipboard.bind(null, draft.posts[0].image));
        }
    }
    for (let i = 1; i < draft.posts.length; i++) {
        const post = draft.posts[i];
        if (post.content) {
            steps.push(copyTextToClipboard.bind(null, post.content));
        }
        if (post.image) {
            steps.push(copyImageToClipboard.bind(null, post.image));
        }     
    }
    
}

function postThread(draftId) {
}