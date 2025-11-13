
import { db, auth } from '../../../config/firebase-init.js';
import { collection, addDoc, getDocs, serverTimestamp, doc, updateDoc, increment, arrayUnion, deleteDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { onAuthStateChanged, updateProfile } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

document.addEventListener('DOMContentLoaded', () => {
    const newPostButton = document.getElementById('new-post-button');
    const newPostModal = document.getElementById('new-post-modal');
    const newPostForm = document.getElementById('new-post-form');
    const cancelPostButton = document.getElementById('cancel-post-button');
    const forumThreads = document.getElementById('forum-threads');

    let currentUser = null;

    onAuthStateChanged(auth, (user) => {
        if (user) {
            currentUser = user;
        } else {
            currentUser = null;
        }
        fetchPosts();
    });

    // Show/hide modal
    newPostButton.addEventListener('click', () => {
        if (currentUser) {
            newPostModal.classList.remove('hidden');
        } else {
            alert('Anda harus login untuk membuat post.');
            window.location.href = '../auth/login.html';
        }
    });

    cancelPostButton.addEventListener('click', () => {
        newPostModal.classList.add('hidden');
    });

    newPostForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!currentUser) {
          alert('Anda harus login untuk membuat post.');
          return;
        }
      
        const title = document.getElementById('post-title').value;
        const content = document.getElementById('post-content').value;
        const category = document.getElementById('post-category').value;
      
        try {
          await addDoc(collection(db, 'posts'), {
            title,
            content,
            category,
            author: currentUser.displayName || currentUser.email || 'Anonymous',
            authorId: currentUser.uid,
            createdAt: serverTimestamp(),
            likes: 0,
            comments: []
          });

          // Update user forum post count
          await updateUserForumPostCount(1);

          // Note: Forum post count will auto-update via real-time listener in user-stats.js
          // No need to manually increment - onSnapshot handles it automatically

          newPostForm.reset();
          newPostModal.classList.add('hidden');
          fetchPosts();
        } catch (error) {
          console.error("Error adding document: ", error);
        }
      });

    // Fetch and display posts
    async function fetchPosts() {
        try {
            // Fetch posts from Firestore with fallback to localStorage
            const querySnapshot = await getDocs(collection(db, 'posts'));
            const posts = [];
            querySnapshot.forEach((doc) => {
                posts.push({ id: doc.id, ...doc.data() });
            });
            
            // Filter out deleted posts (stored in localStorage)
            const deletedPosts = JSON.parse(localStorage.getItem('deletedPosts') || '[]');
            let filteredPosts = posts.filter(post => !deletedPosts.includes(post.id));
            
            // Apply local edits to posts
            const editedPosts = JSON.parse(localStorage.getItem('editedPosts') || '{}');
            filteredPosts = filteredPosts.map(post => {
                if (editedPosts[post.id]) {
                    return { ...post, ...editedPosts[post.id] };
                }
                return post;
            });
            
            // If no posts from Firestore, try localStorage
            if (filteredPosts.length === 0) {
                const localPosts = JSON.parse(localStorage.getItem('forumPosts') || '[]');
                filteredPosts.push(...localPosts);
            }
            
            displayPosts(filteredPosts);
        } catch (error) {
            console.error("Error fetching posts: ", error);
            // Fallback to localStorage if Firestore fails
            const localPosts = JSON.parse(localStorage.getItem('forumPosts') || '[]');
            displayPosts(localPosts);
        }
    }

    function displayPosts(posts) {
        forumThreads.innerHTML = ''; // Clear existing posts
        posts.forEach((post) => {
            const postElement = createPostElement(post.id, post);
            forumThreads.appendChild(postElement);
        });
    }

    // Create post element
    function createPostElement(id, post) {
        const postElement = document.createElement('div');
        postElement.className = 'bg-white rounded-2xl p-5 shadow-lg';

        const isOwner = currentUser && currentUser.uid === post.authorId;
        const ownerActions = isOwner ? `
            <div class="flex space-x-2 ml-4">
                <button data-id="${id}" class="edit-post-button text-blue-500 hover:text-blue-700 text-xs">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </button>
                <button data-id="${id}" class="delete-post-button text-red-500 hover:text-red-700 text-xs">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3,6 5,6 21,6"/><path d="M19,6V20a2,2,0,0,1-2,2H7a2,2,0,0,1-2-2V6M8,6V4a2,2,0,0,1,2-2h4a2,2,0,0,1,2,2V6"/></svg>
                </button>
            </div>
        ` : '';

        // Check if current user has liked this post
        const likedBy = post.likedBy || [];
        const hasLiked = currentUser && likedBy.includes(currentUser.uid);
        const likeButtonStyle = hasLiked ? 'bg-blue-100 text-blue-600 font-semibold' : 'hover:bg-gray-100';

        postElement.innerHTML = `
        <div class="flex items-start space-x-4">
            <div class="w-12 h-12 bg-gradient-to-r from-blue-400 to-cyan-500 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">${post.author.substring(0, 2).toUpperCase()}</div>
            <div class="flex-1">
            <div class="flex items-center justify-between mb-2">
                <h4 class="font-bold text-gray-800">${post.author}</h4>
                <div class="flex items-center">
                <span class="text-gray-400 text-xs">${post.createdAt ? new Date(post.createdAt.seconds * 1000).toLocaleDateString() : 'Baru saja'}</span>
                ${ownerActions}
                </div>
            </div>
            <h3 id="post-title-${id}" class="font-semibold text-gray-800 mb-2">${post.title}</h3>
            <p id="post-content-${id}" class="text-gray-600 text-sm mb-3">${post.content}</p>
            <div class="flex items-center justify-between text-sm text-gray-500">
                <div class="flex space-x-4">
                <button data-id="${id}" class="like-button px-3 py-1 rounded-lg transition-colors ${likeButtonStyle}">${hasLiked ? '👍' : '👍'} ${post.likes || 0}</button>
                <button data-id="${id}" class="comment-button px-3 py-1 rounded-lg hover:bg-gray-100 transition-colors">💬 ${(post.comments || []).length}</button>
                </div>
                ${post.category ? `<span class="bg-gray-100 text-gray-700 px-2 py-1 rounded-full text-xs">${post.category}</span>` : ''}
            </div>
            <!-- Comments Section -->
            <div id="comments-section-${id}" class="mt-4 hidden">
                <div id="comments-list-${id}" class="space-y-2 mb-4">
                ${(post.comments || []).map((comment, index) => createCommentElement(id, comment, index)).join('')}
                </div>
                <form class="add-comment-form" data-id="${id}">
                <input type="text" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="Tulis komentar..." required>
                <button type="submit" class="bg-green-500 text-white px-3 py-1 rounded-lg text-sm mt-2">Kirim</button>
                </form>
            </div>
            </div>
        </div>
        `;
        return postElement;
    }

    // Create comment element
    function createCommentElement(postId, comment, commentIndex) {
        if (!comment || !comment.author || !comment.text) return '';
      
        const isCommentOwner = currentUser && currentUser.uid === comment.authorId;
        const commentActions = `
          <div class="flex space-x-1 ml-2">
            <button data-post-id="${postId}" data-comment-index="${commentIndex}" class="reply-comment-button text-green-500 hover:text-green-700 text-xs">Balas</button>
            ${isCommentOwner ? `
            <button data-post-id="${postId}" data-comment-index="${commentIndex}" class="edit-comment-button text-blue-500 hover:text-blue-700 text-xs">Edit</button>
            <button data-post-id="${postId}" data-comment-index="${commentIndex}" class="delete-comment-button text-red-500 hover:text-red-700 text-xs">Hapus</button>` : ''}
          </div>
        `;
      
        // Render replies
        const repliesHTML = (comment.replies || []).map((reply, i) => `
          <div class="ml-6 text-gray-600 text-sm border-l-2 pl-2 mt-1">
            <b>${reply.author}:</b> ${reply.text}
          </div>
        `).join('');
      
        return `
          <div class="flex flex-col text-sm text-gray-600 space-y-1">
            <div class="flex items-start justify-between">
              <span id="comment-${postId}-${commentIndex}"><b>${comment.author}:</b> ${comment.text}</span>
              ${commentActions}
            </div>
            ${repliesHTML}
            <div id="reply-form-${postId}-${commentIndex}" class="hidden ml-6 mt-2">
              <input type="text" placeholder="Tulis balasan..." class="reply-input w-full border border-gray-300 rounded-lg px-2 py-1 text-sm" />
              <button class="send-reply bg-green-500 text-white px-2 py-1 rounded-lg text-xs mt-1" data-post-id="${postId}" data-comment-index="${commentIndex}">Kirim</button>
            </div>
          </div>
        `;
    }

    // Like post function
    async function likePost(postId) {
        if (!currentUser) {
            alert('Anda harus login untuk menyukai post.');
            return;
        }

        try {
            const postSnap = await getDocs(collection(db, 'posts'));
            let targetPost = null;

            postSnap.forEach((docSnap) => {
                if (docSnap.id === postId) targetPost = { id: docSnap.id, ...docSnap.data() };
            });

            if (!targetPost) {
                alert('Post tidak ditemukan!');
                return;
            }

            const likedBy = targetPost.likedBy || [];
            const hasLiked = likedBy.includes(currentUser.uid);

            // Prevent user from liking their own post
            if (targetPost.authorId === currentUser.uid) {
                alert('Anda tidak bisa menyukai postingan Anda sendiri!');
                return;
            }

            const postRef = doc(db, 'posts', postId);

            // Toggle like - remove if already liked, add if not
            if (hasLiked) {
                await updateDoc(postRef, {
                    likes: increment(-1),
                    likedBy: likedBy.filter(uid => uid !== currentUser.uid)
                });
            } else {
                await updateDoc(postRef, {
                    likes: increment(1),
                    likedBy: arrayUnion(currentUser.uid)
                });
            }

            fetchPosts(); // Refresh display
        } catch (error) {
            console.error("Error liking post: ", error);
            alert('Gagal menyukai post!');
        }
    }

    // Handle likes and comments
    forumThreads.addEventListener('click', async (e) => {
        // Like button
        if (e.target.classList.contains('like-button') || e.target.closest('.like-button')) {
            const button = e.target.classList.contains('like-button') ? e.target : e.target.closest('.like-button');
            const postId = button.dataset.id;
            await likePost(postId);
        }

        // Comment button - toggle comments section
        if (e.target.classList.contains('comment-button') || e.target.closest('.comment-button')) {
            const button = e.target.classList.contains('comment-button') ? e.target : e.target.closest('.comment-button');
            const postId = button.dataset.id;
            const commentsSection = document.getElementById(`comments-section-${postId}`);
            commentsSection.classList.toggle('hidden');
        }

        // Reply button - toggle reply form
        if (e.target.classList.contains('reply-comment-button') || e.target.closest('.reply-comment-button')) {
            const button = e.target.classList.contains('reply-comment-button') ? e.target : e.target.closest('.reply-comment-button');
            const postId = button.dataset.postId;
            const commentIndex = button.dataset.commentIndex;
            const replyForm = document.getElementById(`reply-form-${postId}-${commentIndex}`);
            replyForm.classList.toggle('hidden');
        }

        // Send reply
        if (e.target.classList.contains('send-reply') || e.target.closest('.send-reply')) {
            e.preventDefault();
            const button = e.target.classList.contains('send-reply') ? e.target : e.target.closest('.send-reply');
            const postId = button.dataset.postId;
            const commentIndex = parseInt(button.dataset.commentIndex);
            await sendReply(postId, commentIndex);
        }
    });

    // Send reply function
    async function sendReply(postId, commentIndex) {
        if (!currentUser) {
            alert('Anda harus login untuk membalas komentar.');
            return;
        }

        const replyForm = document.getElementById(`reply-form-${postId}-${commentIndex}`);
        const input = replyForm.querySelector('.reply-input');
        const replyText = input.value.trim();

        if (!replyText) {
            alert('Balasan tidak boleh kosong!');
            return;
        }

        try {
            // Get post from Firestore
            const postSnapshot = await getDocs(collection(db, 'posts'));
            let currentPost = null;
            postSnapshot.forEach(docSnap => {
                if (docSnap.id === postId) currentPost = { id: docSnap.id, ...docSnap.data() };
            });

            if (!currentPost) {
                alert('Post tidak ditemukan!');
                return;
            }

            const comments = currentPost.comments || [];
            const targetComment = comments[commentIndex];

            if (!targetComment) {
                alert('Komentar tidak ditemukan!');
                return;
            }

            if (!targetComment.replies) targetComment.replies = [];

            targetComment.replies.push({
                text: replyText,
                author: currentUser.displayName || currentUser.email || 'Anonymous',
                authorId: currentUser.uid,
                createdAt: new Date().toISOString()
            });

            const postRef = doc(db, 'posts', postId);
            await updateDoc(postRef, { comments });

            input.value = '';
            replyForm.classList.add('hidden');
            fetchPosts();
        } catch (err) {
            console.error("Error sending reply:", err);
            alert('Gagal mengirim balasan!');
        }
    }

    // Handle comment form submission
    forumThreads.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Add comment to post
        if (e.target.classList.contains('add-comment-form')) {
            const postId = e.target.dataset.id;
            const input = e.target.querySelector('input');
            const commentText = input.value.trim();

            if (!commentText) return;

            if (!currentUser) {
                alert('Anda harus login untuk berkomentar.');
                return;
            }

            try {
                const postSnapshot = await getDocs(collection(db, 'posts'));
                let currentPost = null;

                postSnapshot.forEach((docSnap) => {
                    if (docSnap.id === postId) {
                        currentPost = { id: docSnap.id, ...docSnap.data() };
                    }
                });

                if (!currentPost) return;

                const updatedComments = [...(currentPost.comments || []), {
                    text: commentText,
                    author: currentUser.displayName || currentUser.email || 'Anonymous',
                    authorId: currentUser.uid,
                    createdAt: new Date().toISOString(),
                    replies: []
                }];

                const postRef = doc(db, 'posts', postId);
                await updateDoc(postRef, {
                    comments: updatedComments
                });

                input.value = '';
                fetchPosts();
            } catch (error) {
                console.error("Error adding comment: ", error);
                alert('Gagal menambahkan komentar!');
            }
        }
    });

    // Handle edit and delete actions
    forumThreads.addEventListener('click', async (e) => {
        // Edit post
        if (e.target.closest('.edit-post-button')) {
            const postId = e.target.closest('.edit-post-button').dataset.id;
            editPost(postId);
        }

        // Delete post
        if (e.target.closest('.delete-post-button')) {
            const postId = e.target.closest('.delete-post-button').dataset.id;
            deletePost(postId);
        }

        // Edit comment
        if (e.target.closest('.edit-comment-button')) {
            const button = e.target.closest('.edit-comment-button');
            const postId = button.dataset.postId;
            const commentIndex = parseInt(button.dataset.commentIndex);
            editComment(postId, commentIndex);
        }

        // Delete comment
        if (e.target.closest('.delete-comment-button')) {
            const button = e.target.closest('.delete-comment-button');
            const postId = button.dataset.postId;
            const commentIndex = parseInt(button.dataset.commentIndex);
            deleteComment(postId, commentIndex);
        }
    });

    // Edit post function
    async function editPost(postId) {
        const titleElement = document.getElementById(`post-title-${postId}`);
        const contentElement = document.getElementById(`post-content-${postId}`);
        
        const currentTitle = titleElement.textContent;
        const currentContent = contentElement.textContent;

        const newTitle = prompt('Edit judul:', currentTitle);
        if (newTitle === null) return; // User cancelled

        const newContent = prompt('Edit isi:', currentContent);
        if (newContent === null) return; // User cancelled

        if (newTitle.trim() === '' || newContent.trim() === '') {
            alert('Judul dan isi tidak boleh kosong!');
            return;
        }

        try {
            // Try Firestore first, fallback to localStorage
            try {
                const postRef = doc(db, 'posts', postId);
                await updateDoc(postRef, {
                    title: newTitle.trim(),
                    content: newContent.trim(),
                    editedAt: serverTimestamp()
                });
            } catch (firestoreError) {
                console.log('Firestore edit failed, using localStorage fallback');
                // Fallback: store edit in localStorage
                const editedPosts = JSON.parse(localStorage.getItem('editedPosts') || '{}');
                editedPosts[postId] = {
                    title: newTitle.trim(),
                    content: newContent.trim(),
                    editedAt: new Date().toISOString()
                };
                localStorage.setItem('editedPosts', JSON.stringify(editedPosts));
            }
            fetchPosts(); // Refresh to show updated post
        } catch (error) {
            console.error("Error updating post: ", error);
            alert('Gagal mengupdate postingan!');
        }
    }

    // Delete post function
    async function deletePost(postId) {
        if (!confirm('Apakah Anda yakin ingin menghapus postingan ini?')) {
            return;
        }

        try {
            // Try Firestore first, fallback to localStorage
            try {
                await deleteDoc(doc(db, 'posts', postId));
            } catch (firestoreError) {
                console.log('Firestore delete failed, using localStorage fallback');
                // Fallback: mark as deleted in localStorage
                const deletedPosts = JSON.parse(localStorage.getItem('deletedPosts') || '[]');
                deletedPosts.push(postId);
                localStorage.setItem('deletedPosts', JSON.stringify(deletedPosts));
            }
            // Update user forum post count
            await updateUserForumPostCount(-1);

            fetchPosts(); // Refresh to remove deleted post
            alert('Postingan berhasil dihapus!');
        } catch (error) {
            console.error("Error deleting post: ", error);
            alert('Gagal menghapus postingan!');
        }
    }

    // Edit comment function
    async function editComment(postId, commentIndex) {
        try {
            // Get current post data from Firestore
            const postSnapshot = await getDocs(collection(db, 'posts'));
            let currentPost = null;
            
            postSnapshot.forEach((doc) => {
                if (doc.id === postId) {
                    currentPost = { id: doc.id, ...doc.data() };
                }
            });

            if (!currentPost || !currentPost.comments || !currentPost.comments[commentIndex]) {
                alert('Komentar tidak ditemukan!');
                return;
            }

            const currentComment = currentPost.comments[commentIndex];
            const newText = prompt('Edit komentar:', currentComment.text);
            
            if (newText === null) return; // User cancelled

            // Update the comment in the array
            const updatedComments = [...(currentPost.comments || [])];
            updatedComments[commentIndex] = {
                ...currentComment,
                text: newText.trim(),
                editedAt: new Date().toISOString()
            };

            const postRef = doc(db, 'posts', postId);
            await updateDoc(postRef, {
                comments: updatedComments
            });
            
            fetchPosts(); // Refresh to show updated comment
        } catch (error) {
            console.error("Error updating comment: ", error);
            alert('Gagal mengupdate komentar!');
        }
    }

    // Update user forum post count
    async function updateUserForumPostCount(incrementValue) {
        if (!currentUser) return;

        try {
            const userRef = doc(db, 'users', currentUser.uid);
            await updateDoc(userRef, {
                'stats.forumPosts': increment(incrementValue)
            });
        } catch (error) {
            console.error('Error updating forum post count:', error);
        }
    }

    // Delete comment function
    async function deleteComment(postId, commentIndex) {
        if (!confirm('Apakah Anda yakin ingin menghapus komentar ini?')) {
            return;
        }

        try {
            // Get current post data from Firestore
            const postSnapshot = await getDocs(collection(db, 'posts'));
            let currentPost = null;
            
            postSnapshot.forEach((doc) => {
                if (doc.id === postId) {
                    currentPost = { id: doc.id, ...doc.data() };
                }
            });

            if (!currentPost || !currentPost.comments || !currentPost.comments[commentIndex]) {
                alert('Komentar tidak ditemukan!');
                return;
            }

            // Remove the comment from the array
            const updatedComments = (currentPost.comments || []).filter((_, index) => index !== commentIndex);

            const postRef = doc(db, 'posts', postId);
            await updateDoc(postRef, {
                comments: updatedComments
            });
            
            fetchPosts(); // Refresh to remove deleted comment
        } catch (error) {
            console.error("Error deleting comment: ", error);
            alert('Gagal menghapus komentar!');
        }
    }
});
