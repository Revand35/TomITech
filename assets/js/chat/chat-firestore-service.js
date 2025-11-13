import { db, auth } from '../../../config/firebase-init.js';
import { 
  collection, addDoc, query, where, orderBy, limit, getDocs, serverTimestamp, deleteDoc, doc, Timestamp, startAfter
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const CHAT_HISTORY_COLLECTION = 'chatHistory';

// Simpan chat ke Firestore
export async function saveChatToFirestore(message, role = 'user') {
  try {
    const user = auth.currentUser;
    if (!user) return null;

    const chatData = {
      userId: user.uid,
      role,                   // 'user' atau 'ai'
      message,
      createdAt: serverTimestamp(),  // native timestamp
      timestamp: new Date().toISOString() // fallback ISO string
    };

    const docRef = await addDoc(collection(db, CHAT_HISTORY_COLLECTION), chatData);
    return docRef.id;
  } catch (err) {
    console.error('❌ Gagal simpan chat ke Firestore:', err);
    return null;
  }
}

// Ambil history chat user
export async function getChatHistoryFromFirestore(limitCount = 50) {
  try {
    const user = auth.currentUser;
    if (!user) {
      console.warn('⚠️ No user logged in');
      return [];
    }

    // Coba dengan createdAt dulu (Firestore Timestamp)
    let q;
    try {
      q = query(
        collection(db, CHAT_HISTORY_COLLECTION),
        where('userId', '==', user.uid),
        orderBy('createdAt', 'asc'),
        limit(limitCount)
      );
      const snapshot = await getDocs(q);
      const chats = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
      console.log('✅ Loaded chat history (limited):', chats.length, 'chats');
      return chats;
    } catch (orderByError) {
      // Jika orderBy gagal, ambil tanpa orderBy dan sort di client
      console.warn('⚠️ orderBy failed, fetching without orderBy:', orderByError.message);
      q = query(
        collection(db, CHAT_HISTORY_COLLECTION),
        where('userId', '==', user.uid)
      );
      const snapshot = await getDocs(q);
      const chats = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
      
      // Sort di client-side
      chats.sort((a, b) => {
        const timeA = _getTimeValue(a);
        const timeB = _getTimeValue(b);
        return timeA - timeB; // Ascending (terlama dulu)
      });
      
      // Limit setelah sort
      const limitedChats = chats.slice(0, limitCount);
      console.log('✅ Loaded chat history (client-sorted, limited):', limitedChats.length, 'chats');
      return limitedChats;
    }
  } catch (err) {
    console.error('❌ Gagal ambil history chat:', err);
    return [];
  }
}

// Ambil semua history chat user (untuk history panel) - dengan pagination untuk load semua data
export async function getAllChatHistoryFromFirestore() {
  try {
    const user = auth.currentUser;
    if (!user) {
      console.warn('⚠️ No user logged in');
      return [];
    }

    console.log('📖 Fetching ALL chat history for user:', user.uid);

    let allChats = [];
    let lastDoc = null;
    const batchSize = 1000; // Firestore limit per query
    let useOrderBy = true;
    let hasMoreData = true;

    // Loop untuk mengambil semua data (pagination jika lebih dari 1000)
    while (hasMoreData) {
      let q;
      try {
        if (useOrderBy) {
          // Coba dengan createdAt dulu (Firestore Timestamp) dengan pagination
          if (lastDoc) {
            q = query(
              collection(db, CHAT_HISTORY_COLLECTION),
              where('userId', '==', user.uid),
              orderBy('createdAt', 'desc'),
              startAfter(lastDoc),
              limit(batchSize)
            );
          } else {
            q = query(
              collection(db, CHAT_HISTORY_COLLECTION),
              where('userId', '==', user.uid),
              orderBy('createdAt', 'desc'),
              limit(batchSize)
            );
          }
        } else {
          // Fallback: tanpa orderBy (jika index belum ada)
          if (lastDoc) {
            q = query(
              collection(db, CHAT_HISTORY_COLLECTION),
              where('userId', '==', user.uid),
              startAfter(lastDoc),
              limit(batchSize)
            );
          } else {
            q = query(
              collection(db, CHAT_HISTORY_COLLECTION),
              where('userId', '==', user.uid),
              limit(batchSize)
            );
          }
        }
        
        const snapshot = await getDocs(q);
        const batch = snapshot.docs.map(docSnap => ({ 
          id: docSnap.id, 
          ...docSnap.data() 
        }));
        
        if (batch.length === 0) {
          hasMoreData = false;
          break;
        }
        
        allChats = allChats.concat(batch);
        console.log(`📦 Loaded batch: ${batch.length} chats (total: ${allChats.length})`);
        
        if (batch.length < batchSize) {
          hasMoreData = false; // No more data
        } else {
          lastDoc = snapshot.docs[snapshot.docs.length - 1];
        }
        
      } catch (orderByError) {
        // Jika orderBy gagal (index belum ada), switch ke mode tanpa orderBy
        if (useOrderBy) {
          console.warn('⚠️ orderBy failed, switching to no-orderBy mode:', orderByError.message);
          useOrderBy = false;
          lastDoc = null; // Reset pagination
          allChats = []; // Reset chats
          continue; // Retry without orderBy
        } else {
          // Jika sudah tanpa orderBy dan masih error, break
          console.error('❌ Error fetching without orderBy:', orderByError);
          hasMoreData = false;
          break;
        }
      }
    }
    
    // Sort di client-side jika menggunakan fallback (tanpa orderBy)
    if (!useOrderBy && allChats.length > 0) {
      allChats.sort((a, b) => {
        const timeA = _getTimeValue(a);
        const timeB = _getTimeValue(b);
        return timeB - timeA; // Descending (terbaru dulu)
      });
      console.log('✅ Sorted all chats on client-side');
    }
    
    console.log(`✅ Loaded ALL chat history: ${allChats.length} total chats`);
    return allChats;
    
  } catch (err) {
    console.error('❌ Gagal ambil semua history chat:', err);
    return [];
  }
}

// Group chat history berdasarkan tanggal
export function groupChatHistoryByDate(chats) {
  const grouped = {};
  
  chats.forEach(chat => {
    let dateKey = '';
    try {
      let date;
      if (chat.createdAt && typeof chat.createdAt.toDate === 'function') {
        date = chat.createdAt.toDate();
      } else if (chat.timestamp) {
        date = new Date(chat.timestamp);
      } else {
        date = new Date();
      }
      
      // Format: YYYY-MM-DD
      dateKey = date.toISOString().split('T')[0];
      
      // Format display: "Hari, DD MMMM YYYY"
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      let displayDate = '';
      if (dateKey === today.toISOString().split('T')[0]) {
        displayDate = 'Hari Ini';
      } else if (dateKey === yesterday.toISOString().split('T')[0]) {
        displayDate = 'Kemarin';
      } else {
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        displayDate = date.toLocaleDateString('id-ID', options);
      }
      
      if (!grouped[dateKey]) {
        grouped[dateKey] = {
          dateKey,
          displayDate,
          chats: []
        };
      }
      
      grouped[dateKey].chats.push(chat);
    } catch (err) {
      console.error('Error grouping chat:', err, chat);
    }
  });
  
  // Sort chats within each group by timestamp (oldest first)
  Object.keys(grouped).forEach(dateKey => {
    grouped[dateKey].chats.sort((a, b) => {
      const timeA = _getTimeValue(a);
      const timeB = _getTimeValue(b);
      return timeA - timeB;
    });
  });
  
  return grouped;
}

// Helper untuk mendapatkan timestamp value
function _getTimeValue(item) {
  if (!item) return 0;
  if (item.createdAt && typeof item.createdAt.toDate === 'function') {
    return item.createdAt.toDate().getTime();
  }
  if (item.createdAt instanceof Date) return item.createdAt.getTime();
  if (typeof item.createdAt === 'number') return item.createdAt;
  if (item.timestamp) {
    const t = Date.parse(item.timestamp);
    if (!isNaN(t)) return t;
  }
  return 0;
}

// Ambil chat dari tanggal tertentu - dengan pagination untuk load semua chat dari tanggal tersebut
export async function getChatHistoryByDate(dateString) {
  try {
    const user = auth.currentUser;
    if (!user) {
      console.warn('⚠️ No user logged in');
      return [];
    }

    // Parse date string (YYYY-MM-DD)
    const targetDate = new Date(dateString);
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    console.log(`📅 Fetching chat history for date: ${dateString} (${startOfDay.toISOString()} to ${endOfDay.toISOString()})`);

    let allChats = [];
    let lastDoc = null;
    const batchSize = 1000;
    let useOrderBy = true;
    let hasMoreData = true;

    // Loop untuk mengambil semua data dengan pagination
    while (hasMoreData) {
      let q;
      try {
        if (useOrderBy) {
          // Coba dengan createdAt dulu (Firestore Timestamp)
          if (lastDoc) {
            q = query(
              collection(db, CHAT_HISTORY_COLLECTION),
              where('userId', '==', user.uid),
              orderBy('createdAt', 'asc'),
              startAfter(lastDoc),
              limit(batchSize)
            );
          } else {
            q = query(
              collection(db, CHAT_HISTORY_COLLECTION),
              where('userId', '==', user.uid),
              orderBy('createdAt', 'asc'),
              limit(batchSize)
            );
          }
        } else {
          // Fallback: tanpa orderBy
          if (lastDoc) {
            q = query(
              collection(db, CHAT_HISTORY_COLLECTION),
              where('userId', '==', user.uid),
              startAfter(lastDoc),
              limit(batchSize)
            );
          } else {
            q = query(
              collection(db, CHAT_HISTORY_COLLECTION),
              where('userId', '==', user.uid),
              limit(batchSize)
            );
          }
        }

        const snapshot = await getDocs(q);
        const batch = snapshot.docs.map(docSnap => ({ 
          id: docSnap.id, 
          ...docSnap.data() 
        }));
        
        if (batch.length === 0) {
          hasMoreData = false;
          break;
        }
        
        // Filter by date untuk batch ini
        const filteredBatch = batch.filter(chat => {
          let chatDate;
          if (chat.createdAt && typeof chat.createdAt.toDate === 'function') {
            chatDate = chat.createdAt.toDate();
          } else if (chat.timestamp) {
            chatDate = new Date(chat.timestamp);
          } else {
            return false;
          }
          
          return chatDate >= startOfDay && chatDate <= endOfDay;
        });
        
        allChats = allChats.concat(filteredBatch);
        console.log(`📦 Loaded batch: ${batch.length} chats, ${filteredBatch.length} match date (total: ${allChats.length})`);
        
        // Jika batch terakhir sudah melewati endOfDay, stop
        if (batch.length > 0) {
          const lastChat = batch[batch.length - 1];
          let lastChatDate;
          if (lastChat.createdAt && typeof lastChat.createdAt.toDate === 'function') {
            lastChatDate = lastChat.createdAt.toDate();
          } else if (lastChat.timestamp) {
            lastChatDate = new Date(lastChat.timestamp);
          }
          
          if (lastChatDate && lastChatDate > endOfDay) {
            hasMoreData = false; // Sudah melewati tanggal target
            break;
          }
        }
        
        if (batch.length < batchSize) {
          hasMoreData = false; // No more data
        } else {
          lastDoc = snapshot.docs[snapshot.docs.length - 1];
        }
        
      } catch (orderByError) {
        // Jika orderBy gagal, switch ke mode tanpa orderBy
        if (useOrderBy) {
          console.warn('⚠️ orderBy failed, switching to no-orderBy mode:', orderByError.message);
          useOrderBy = false;
          lastDoc = null;
          allChats = [];
          continue;
        } else {
          console.error('❌ Error fetching without orderBy:', orderByError);
          hasMoreData = false;
          break;
        }
      }
    }
    
    // Sort di client-side jika menggunakan fallback (tanpa orderBy)
    if (!useOrderBy && allChats.length > 0) {
      allChats.sort((a, b) => {
        const timeA = _getTimeValue(a);
        const timeB = _getTimeValue(b);
        return timeA - timeB; // Ascending (terlama dulu)
      });
      console.log('✅ Sorted chats on client-side');
    }
    
    console.log(`✅ Loaded chat history for date ${dateString}: ${allChats.length} chats`);
    return allChats;
    
  } catch (err) {
    console.error('❌ Gagal ambil chat berdasarkan tanggal:', err);
    return [];
  }
}

// Hapus chat tertentu
export async function deleteChatHistoryItem(id) {
  try {
    await deleteDoc(doc(db, CHAT_HISTORY_COLLECTION, id));
    return true;
  } catch (err) {
    console.error('❌ Gagal hapus chat:', err);
    return false;
  }
}

// Hapus semua chat history user
export async function deleteAllChatHistory() {
  try {
    const user = auth.currentUser;
    if (!user) return false;

    const chats = await getAllChatHistoryFromFirestore();
    const deletePromises = chats.map(chat => deleteChatHistoryItem(chat.id));
    await Promise.all(deletePromises);
    
    return true;
  } catch (err) {
    console.error('❌ Gagal hapus semua chat:', err);
    return false;
  }
}