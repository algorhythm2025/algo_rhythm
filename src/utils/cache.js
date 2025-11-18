const CACHE_EXPIRY = 5 * 60 * 1000;

export function getCachedData(key) {
    try {
        const cached = localStorage.getItem(key);
        if (!cached) return null;
        
        const { data, timestamp } = JSON.parse(cached);
        const now = Date.now();
        
        if (now - timestamp > CACHE_EXPIRY) {
            localStorage.removeItem(key);
            return null;
        }
        
        return data;
    } catch (error) {
        return null;
    }
}

export function setCachedData(key, data) {
    try {
        const cacheData = {
            data,
            timestamp: Date.now()
        };
        localStorage.setItem(key, JSON.stringify(cacheData));
    } catch (error) {
        console.warn('캐시 저장 실패:', error);
    }
}

export function clearCache(key) {
    try {
        localStorage.removeItem(key);
    } catch (error) {
        console.warn('캐시 삭제 실패:', error);
    }
}

export function clearAllCache() {
    try {
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
            if (key.startsWith('cache_')) {
                localStorage.removeItem(key);
            }
        });
    } catch (error) {
        console.warn('전체 캐시 삭제 실패:', error);
    }
}

