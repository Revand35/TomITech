document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('search-input');
    const forumThreads = document.getElementById('forum-threads');
    let selectedCategory = 'semua';
  
    // tombol filter kategori di forum.html (deretan button)
    const categoryButtons = document.querySelectorAll('.bg-gray-100, .bg-green-500, .bg-gray-100.text-gray-600');
    categoryButtons.forEach(button => {
      button.addEventListener('click', () => {
        selectedCategory = button.textContent.toLowerCase();
        // styling aktif
        categoryButtons.forEach(b => b.classList.remove('bg-green-500','text-white'));
        button.classList.add('bg-green-500','text-white');
        filterPosts();
      });
    });
  
    searchInput.addEventListener('input', filterPosts);
  
    function filterPosts() {
      const searchTerm = searchInput.value.toLowerCase();
      Array.from(forumThreads.children).forEach(item => {
        const title = item.querySelector('h3')?.textContent.toLowerCase() || '';
        const content = item.querySelector('p')?.textContent.toLowerCase() || '';
        const categoryBadge = item.querySelector('span.bg-gray-100, span.bg-blue-100, span.bg-red-100, span.bg-green-100, span.bg-gray-700');
        const category = categoryBadge ? categoryBadge.textContent.toLowerCase() : '';
        const matchesSearch = title.includes(searchTerm) || content.includes(searchTerm);
        const matchesCategory = selectedCategory === 'semua' || category === selectedCategory;
        item.style.display = (matchesSearch && matchesCategory) ? '' : 'none';
      });
    }
  });  