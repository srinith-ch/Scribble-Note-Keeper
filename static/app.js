document.addEventListener('DOMContentLoaded', () => {
    const creatorCard = document.getElementById('note-creator');
    const textarea = document.getElementById('note-textarea');
    const creatorActions = document.getElementById('creator-actions');
    const noteForm = document.getElementById('note-form');
    const colorBtns = document.querySelectorAll('.color-btn');
    const notesGrid = document.getElementById('notes-grid');
    const loadingState = document.getElementById('loading-state');
    const emptyState = document.getElementById('empty-state');
    const searchInput = document.getElementById('search-input');

    let notesData = [];
    let selectedColor = '#ffffff';

    // Auto-expand/collapse textarea and show actions
    textarea.addEventListener('focus', () => {
        creatorCard.classList.add('expanded');
        textarea.rows = 3;
    });

    // Close note creator on clicking outside
    document.addEventListener('click', (e) => {
        if (!creatorCard.contains(e.target) && textarea.value.trim() === '') {
            creatorCard.classList.remove('expanded');
            textarea.rows = 1;
        }
    });

    // Color picker logic
    colorBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            colorBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            selectedColor = btn.dataset.color;
        });
    });

    // Format SQL datetime to human-readable format
    function formatDate(dateStr) {
        // SQLite timestamp usually comes as YYYY-MM-DD HH:MM:SS or similar
        // Convert string to date object. In python we return ISO format or default
        try {
            const date = new Date(dateStr.replace(' ', 'T') + 'Z');
            if (isNaN(date.getTime())) {
                return dateStr;
            }
            return date.toLocaleDateString(undefined, { 
                month: 'short', 
                day: 'numeric', 
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (e) {
            return dateStr;
        }
    }

    // Create a note HTML element
    function createNoteElement(note) {
        const card = document.createElement('div');
        card.className = 'note-card';
        card.setAttribute('data-theme', note.color);
        card.setAttribute('data-id', note.id);
        
        card.innerHTML = `
            <div class="note-content">${escapeHTML(note.content)}</div>
            <div class="note-footer">
                <span class="note-date">${formatDate(note.created_at)}</span>
                <button class="delete-note-btn" title="Delete note">
                    <i class="fa-regular fa-trash-can"></i>
                </button>
            </div>
        `;

        // Delete button click handler
        const deleteBtn = card.querySelector('.delete-note-btn');
        deleteBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            if (confirm('Are you sure you want to delete this note?')) {
                await deleteNote(note.id, card);
            }
        });

        return card;
    }

    // Fetch notes from server
    async function fetchNotes() {
        try {
            loadingState.classList.remove('hidden');
            emptyState.classList.add('hidden');
            
            const response = await fetch('/api/notes');
            if (!response.ok) throw new Error('Failed to fetch notes');
            
            notesData = await response.json();
            renderNotes(notesData);
        } catch (error) {
            console.error('Error fetching notes:', error);
            notesGrid.innerHTML = `
                <div class="loading-state">
                    <i class="fa-solid fa-triangle-exclamation spinner" style="color: #ef4444;"></i>
                    <p>Failed to load notes. Please try again later.</p>
                </div>
            `;
        } finally {
            loadingState.classList.add('hidden');
        }
    }

    // Render list of notes
    function renderNotes(notes) {
        // Clear all except loading and empty states
        const cards = notesGrid.querySelectorAll('.note-card');
        cards.forEach(c => c.remove());

        if (notes.length === 0) {
            emptyState.classList.remove('hidden');
            return;
        }

        emptyState.classList.add('hidden');
        notes.forEach(note => {
            const card = createNoteElement(note);
            notesGrid.appendChild(card);
        });
    }

    // Add note
    noteForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const content = textarea.value.trim();
        if (!content) return;

        const submitBtn = document.getElementById('submit-btn');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Adding...';

        try {
            const response = await fetch('/api/notes', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    content: content,
                    color: selectedColor
                })
            });

            if (!response.ok) throw new Error('Failed to save note');

            const newNote = await response.json();
            
            // Add to data and re-render
            notesData.unshift(newNote);
            
            // Render locally
            const card = createNoteElement(newNote);
            if (emptyState.classList.contains('hidden')) {
                notesGrid.insertBefore(card, notesGrid.firstChild);
            } else {
                emptyState.classList.add('hidden');
                notesGrid.appendChild(card);
            }

            // Clear input
            textarea.value = '';
            textarea.rows = 1;
            creatorCard.classList.remove('expanded');
            
            // Reset color choice
            colorBtns.forEach(b => b.classList.remove('active'));
            colorBtns[0].classList.add('active');
            selectedColor = '#ffffff';

        } catch (error) {
            console.error('Error adding note:', error);
            alert('Failed to save note. Please try again.');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fa-solid fa-plus"></i> Add Note';
        }
    });

    // Delete note
    async function deleteNote(id, cardElement) {
        try {
            const response = await fetch(`/api/notes/${id}`, {
                method: 'DELETE'
            });

            if (!response.ok) throw new Error('Failed to delete note');

            // Animation
            cardElement.classList.add('fade-out');
            cardElement.addEventListener('animationend', () => {
                cardElement.remove();
                notesData = notesData.filter(note => note.id !== id);
                if (notesGrid.querySelectorAll('.note-card').length === 0) {
                    emptyState.classList.remove('hidden');
                }
            });
        } catch (error) {
            console.error('Error deleting note:', error);
            alert('Failed to delete note. Please try again.');
        }
    }

    // Search / Filter
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        const filtered = notesData.filter(note => 
            note.content.toLowerCase().includes(query)
        );
        renderNotes(filtered);
    });

    // Helper to escape HTML characters
    function escapeHTML(str) {
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    // Initial load
    fetchNotes();
});
