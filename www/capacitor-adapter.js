/**
 * SGC-MineGesty - Capacitor Adapter
 * Provides unified file operations for both Browser and Capacitor environments
 * 
 * Architecture, Conception, Realisation: SG-Commander
 * Tous droits reserves.
 * 
 * Fait sur demande de l'interesse sur description generique non detaillee
 * des informations reelles.
 * Code Clean de toutes informations reelles et/ou de test.
 * 
 * Contact: StacGate.Commander@gmail.com
 * Date: Janvier 2026
 */

// Detect if running in Capacitor
const isCapacitor = () => {
    return typeof window !== 'undefined' &&
        typeof window.Capacitor !== 'undefined' &&
        window.Capacitor.isNativePlatform();
};

// File Adapter for cross-platform file operations
const FileAdapter = {
    /**
     * Save a file (JSON, Excel exports)
     * @param {string} filename - Name of the file
     * @param {string|Blob} content - File content
     * @param {string} mimeType - MIME type of the file
     */
    async saveFile(filename, content, mimeType = 'application/json') {
        if (isCapacitor()) {
            return await this._saveFileCapacitor(filename, content, mimeType);
        } else {
            return this._saveFileBrowser(filename, content, mimeType);
        }
    },

    /**
     * Save file using Capacitor Filesystem plugin
     */
    async _saveFileCapacitor(filename, content, mimeType) {
        try {
            const { Filesystem, Directory } = window.Capacitor.Plugins;

            let data;
            if (content instanceof Blob) {
                // Convert Blob to base64
                data = await this._blobToBase64(content);
            } else if (typeof content === 'object') {
                data = btoa(unescape(encodeURIComponent(JSON.stringify(content, null, 2))));
            } else {
                data = btoa(unescape(encodeURIComponent(content)));
            }

            const result = await Filesystem.writeFile({
                path: filename,
                data: data,
                directory: Directory.Documents,
                encoding: undefined // binary mode
            });

            // Show success message
            if (typeof toast === 'function') {
                toast(`Fichier sauvegarde: ${filename}`, 'success');
            }

            return { success: true, path: result.uri };
        } catch (error) {
            console.error('Erreur sauvegarde Capacitor:', error);
            if (typeof toast === 'function') {
                toast('Erreur de sauvegarde: ' + error.message, 'error');
            }
            return { success: false, error };
        }
    },

    /**
     * Save file using Browser download
     */
    _saveFileBrowser(filename, content, mimeType) {
        try {
            let blob;
            if (content instanceof Blob) {
                blob = content;
            } else if (typeof content === 'object') {
                blob = new Blob([JSON.stringify(content, null, 2)], { type: mimeType });
            } else {
                blob = new Blob([content], { type: mimeType });
            }

            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            return { success: true };
        } catch (error) {
            console.error('Erreur sauvegarde Browser:', error);
            return { success: false, error };
        }
    },

    /**
     * Read a file (for imports)
     * @param {Function} callback - Callback with file content
     * @param {string} accept - Accepted file types
     */
    async readFile(callback, accept = '.json,.xlsx,.xls') {
        if (isCapacitor()) {
            return await this._readFileCapacitor(callback, accept);
        } else {
            return this._readFileBrowser(callback, accept);
        }
    },

    /**
     * Read file using Browser file input
     */
    _readFileBrowser(callback, accept) {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = accept;
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                callback(file);
            }
        };
        input.click();
    },

    /**
     * Read file using Capacitor (falls back to web input on Android)
     */
    async _readFileCapacitor(callback, accept) {
        // On Android, we still use web file picker for better UX
        this._readFileBrowser(callback, accept);
    },

    /**
     * Convert Blob to base64
     */
    _blobToBase64(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64 = reader.result.split(',')[1];
                resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }
};

// Preferences Adapter for cross-platform storage
const PreferencesAdapter = {
    /**
     * Set a value in storage
     */
    async set(key, value) {
        if (isCapacitor()) {
            const { Preferences } = window.Capacitor.Plugins;
            await Preferences.set({ key, value: JSON.stringify(value) });
        } else {
            localStorage.setItem(key, JSON.stringify(value));
        }
    },

    /**
     * Get a value from storage
     */
    async get(key) {
        if (isCapacitor()) {
            const { Preferences } = window.Capacitor.Plugins;
            const result = await Preferences.get({ key });
            return result.value ? JSON.parse(result.value) : null;
        } else {
            const value = localStorage.getItem(key);
            return value ? JSON.parse(value) : null;
        }
    },

    /**
     * Remove a value from storage
     */
    async remove(key) {
        if (isCapacitor()) {
            const { Preferences } = window.Capacitor.Plugins;
            await Preferences.remove({ key });
        } else {
            localStorage.removeItem(key);
        }
    },

    /**
     * Clear all storage
     */
    async clear() {
        if (isCapacitor()) {
            const { Preferences } = window.Capacitor.Plugins;
            await Preferences.clear();
        } else {
            localStorage.clear();
        }
    }
};

// Export for use in app
window.FileAdapter = FileAdapter;
window.PreferencesAdapter = PreferencesAdapter;
window.isCapacitor = isCapacitor;

console.log('Capacitor Adapter loaded. Running in:', isCapacitor() ? 'Capacitor' : 'Browser');
