// High-Capacity Browser-Side IndexedDB Storage Manager
// Solves LocalStorage 5MB limit QuotaExceededError by storing large customized 3D meshes & 2D texture maps

const dbName = "Thread3D_Storage";
const storeName = "design_cache";

const openDB = () => {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      reject(new Error("IndexedDB is not supported on this environment"));
      return;
    }
    const request = indexedDB.open(dbName, 1);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(storeName)) {
        db.createObjectStore(storeName, { keyPath: "id" });
      }
    };
    request.onsuccess = (e) => resolve(e.target.result);
    request.onerror = (e) => reject(e.target.error);
  });
};

export const saveDesignData = async (id, data) => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, "readwrite");
      const store = transaction.objectStore(storeName);
      store.put({ id, data });
      transaction.oncomplete = () => resolve(true);
      transaction.onerror = (e) => reject(e.target.error);
    });
  } catch (err) {
    console.error("IndexedDB write failed:", err);
    return false;
  }
};

export const getDesignData = async (id) => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, "readonly");
      const store = transaction.objectStore(storeName);
      const request = store.get(id);
      request.onsuccess = (e) => resolve(e.target.result ? e.target.result.data : null);
      request.onerror = (e) => reject(e.target.error);
    });
  } catch (err) {
    console.error("IndexedDB read failed:", err);
    return null;
  }
};

export const deleteDesignData = async (id) => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, "readwrite");
      const store = transaction.objectStore(storeName);
      store.delete(id);
      transaction.oncomplete = () => resolve(true);
      transaction.onerror = (e) => reject(e.target.error);
    });
  } catch (err) {
    console.error("IndexedDB delete failed:", err);
    return false;
  }
};
