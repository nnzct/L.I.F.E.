
import { PlanetData } from './types';

const DB_NAME = 'LifeIndexDB';
const STORE_NAME = 'planets';
const DB_VERSION = 1;

export const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    } catch (err) {
      reject(err);
    }
  });
};

export const savePlanetsToDB = async (planets: PlanetData[]): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    
    const clearReq = store.clear();
    clearReq.onsuccess = () => {
      for (const planet of planets) {
        store.put(planet);
      }
    };

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

export const getPlanetsFromDB = async (): Promise<PlanetData[]> => {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();

    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error("IndexedDB Access Error:", err);
    return [];
  }
};
