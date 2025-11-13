document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('search-input');
    const materiList = document.getElementById('materi-list');
    
    if (!searchInput || !materiList) {
        console.warn('Required elements not found');
        return;
    }

    let materiItems = [];
    
    // Function to update the search items
    const updateSearchItems = () => {
        materiItems = Array.from(materiList.children).filter(
            child => child.classList && child.classList.contains('materi-item')
        );
    };

    // Initial setup
    updateSearchItems();

    // Watch for changes in the materi-list (for dynamic content)
    const observer = new MutationObserver(updateSearchItems);
    observer.observe(materiList, { childList: true, subtree: true });

    // Search functionality
    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase().trim();
        
        if (!materiItems.length) {
            updateSearchItems();
        }

        materiItems.forEach(item => {
            const title = item.querySelector('h4')?.textContent?.toLowerCase() || '';
            const description = item.querySelector('p')?.textContent?.toLowerCase() || '';
            const isVisible = !searchTerm || 
                            title.includes(searchTerm) || 
                            description.includes(searchTerm);
            item.style.display = isVisible ? '' : 'none';
        });
    });
});
