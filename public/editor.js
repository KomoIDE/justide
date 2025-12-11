let editor;
let aiButton;

require.config({ paths: { vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs' }});
require(['vs/editor/editor.main'], () => {
  editor = monaco.editor.create(document.getElementById('container'), {
    value: '', language: 'plaintext', theme: 'vs-dark'
  });
  
  // Load content from the new API endpoint
  fetch('/api/file/load?f=default.txt').then(r => r.text()).then(t => editor.setValue(t));
});

// Save functionality
document.getElementById('save').onclick = () =>
  fetch('/api/file/save?f=default.txt', {method:'POST', body: editor.getValue()})
    .then(() => alert('Saved successfully!'));

// AI Suggestion functionality
document.getElementById('ai-suggest').onclick = async () => {
  const currentContent = editor.getValue();
  const userPrompt = prompt("Enter your request for the AI (e.g., 'Fix all typos', 'Convert to a React component', 'Write a function to calculate the factorial'):");

  if (!userPrompt) return;

  aiButton = document.getElementById('ai-suggest');
  aiButton.disabled = true;
  aiButton.textContent = 'AI is thinking...';

  try {
    const response = await fetch('/api/ai/suggest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: currentContent,
        prompt: userPrompt
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      alert(`AI Suggestion Error: ${errorData.error || response.statusText}`);
      return;
    }

    const data = await response.json();
    
    // Display the suggestion in a new window or as a prompt
    const suggestion = data.suggestion;
    const applySuggestion = confirm(`AI Suggestion:\n\n${suggestion}\n\nDo you want to replace the current content with this suggestion?`);

    if (applySuggestion) {
      editor.setValue(suggestion);
    }

  } catch (error) {
    console.error('Fetch error:', error);
    alert('An error occurred while communicating with the AI service.');
  } finally {
    aiButton.disabled = false;
    aiButton.textContent = 'AI Suggestion';
  }
};
