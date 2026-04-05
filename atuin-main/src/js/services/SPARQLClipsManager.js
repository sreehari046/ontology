/**
 * SPARQL Clips Manager for storing and retrieving SPARQL query clips
 * @module services/SPARQLClipsManager
 */

import clipsMetadata from '../../clips/clips-metadata.json';

// Import all clip files
import wikidataCountriesPopulation from '../../clips/wikidata-countries-population.sparql';
import wikidataSimpleExample from '../../clips/wikidata-simple-example.sparql';
import basicSelectTemplate from '../../clips/basic-select-template.sparql';
import wikidataCountriesConstruct from '../../clips/wikidata-countries-construct.sparql';

// Create a mapping of filenames to imported content
const clipFiles = {
  'wikidata-countries-population.sparql': wikidataCountriesPopulation,
  'wikidata-simple-example.sparql': wikidataSimpleExample,
  'basic-select-template.sparql': basicSelectTemplate,
  'wikidata-countries-construct.sparql': wikidataCountriesConstruct
};

/**
 * SPARQL Clips Manager service for localStorage operations
 */
export class SPARQLClipsManager {
  /**
   * Create a new SPARQLClipsManager
   * @param {Object} logger - Logger service instance for debugging
   */
  constructor(logger) {
    this.logger = logger;
    this.storageKey = 'sparqlClips';
    this.clips = [];
    this.loadClips();
  }

  /**
   * Load clips from localStorage
   * @private
   */
  loadClips() {
    try {
      const storedClips = localStorage.getItem(this.storageKey);
      if (storedClips) {
        this.clips = JSON.parse(storedClips);
        this.logger?.info(`Loaded ${this.clips.length} SPARQL clips from localStorage`);
        
        // Check if we need to add missing default clips
        this.ensureDefaultClips();
      } else {
        // Initialize with default clips for first-time users
        this.clips = this.getDefaultClips();
        this.saveClips();
        this.logger?.info(`Initialized with ${this.clips.length} default SPARQL clips`);
      }
    } catch (error) {
      this.logger?.error('Failed to load SPARQL clips from localStorage:', error.message);
      this.clips = [];
    }
  }

  /**
   * Save clips to localStorage
   * @private
   */
  saveClips() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.clips));
      this.logger?.info(`Saved ${this.clips.length} SPARQL clips to localStorage`);
    } catch (error) {
      this.logger?.error('Failed to save SPARQL clips to localStorage:', error.message);
      throw new Error('Failed to save clips to storage');
    }
  }

  /**
   * Get default SPARQL clips loaded from individual files
   * @returns {Array<Object>} Array of default clip objects
   */
  getDefaultClips() {
    const timestamp = Date.now();
    
    return clipsMetadata.clips.map((clipMeta, index) => {
      const query = clipFiles[clipMeta.filename];
      
      if (!query) {
        this.logger?.warn(`Clip file not found: ${clipMeta.filename}`);
        return null;
      }
      
      return {
        id: clipMeta.id,
        name: clipMeta.name,
        query: query.trim(),
        description: clipMeta.description,
        endpoint: clipMeta.endpoint,
        queryType: clipMeta.queryType,
        tags: clipMeta.tags || [],
        difficulty: clipMeta.difficulty,
        timestamp: timestamp - (index + 1) * 1000,
        created: new Date(timestamp - (index + 1) * 1000).toISOString()
      };
    }).filter(Boolean); // Remove any null entries
  }

  /**
   * Ensure that default clips are present, adding any that are missing
   * @private
   */
  ensureDefaultClips() {
    const defaultClips = this.getDefaultClips();
    let addedClips = 0;

    for (const defaultClip of defaultClips) {
      // Check if this default clip already exists (by name or ID)
      const exists = this.clips.some(clip => 
        clip.id === defaultClip.id || 
        clip.name === defaultClip.name
      );

      if (!exists) {
        this.clips.push(defaultClip);
        addedClips++;
      }
    }

    if (addedClips > 0) {
      this.saveClips();
      this.logger?.info(`Added ${addedClips} missing default SPARQL clips`);
    }
  }

  /**
   * Save a new SPARQL clip
   * @param {string} name - Name for the clip
   * @param {string} query - SPARQL query content
   * @returns {Object} The saved clip object
   * @throws {Error} If name is empty, already exists, or query is empty
   */
  saveClip(name, query) {
    if (!name || name.trim() === '') {
      throw new Error('Clip name cannot be empty');
    }

    if (!query || query.trim() === '') {
      throw new Error('SPARQL query cannot be empty');
    }

    const trimmedName = name.trim();
    
    // Check if name already exists
    if (this.clips.some(clip => clip.name === trimmedName)) {
      throw new Error('A clip with this name already exists');
    }

    const clip = {
      id: this.generateId(),
      name: trimmedName,
      query: query.trim(),
      timestamp: Date.now(),
      created: new Date().toISOString()
    };

    this.clips.push(clip);
    this.saveClips();
    
    this.logger?.info(`Saved SPARQL clip: ${trimmedName}`);
    return clip;
  }

  /**
   * Get all clips
   * @returns {Array} Array of clip objects
   */
  getAllClips() {
    return [...this.clips].sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Get a specific clip by ID
   * @param {string} id - Clip ID
   * @returns {Object|null} Clip object or null if not found
   */
  getClip(id) {
    return this.clips.find(clip => clip.id === id) || null;
  }

  /**
   * Delete a clip by ID
   * @param {string} id - Clip ID
   * @returns {boolean} True if deleted, false if not found
   */
  deleteClip(id) {
    const index = this.clips.findIndex(clip => clip.id === id);
    if (index === -1) {
      return false;
    }

    const deletedClip = this.clips[index];
    this.clips.splice(index, 1);
    this.saveClips();
    
    this.logger?.info(`Deleted SPARQL clip: ${deletedClip.name}`);
    return true;
  }

  /**
   * Update a clip
   * @param {string} id - Clip ID
   * @param {string} name - New name
   * @param {string} query - New query
   * @returns {Object|null} Updated clip object or null if not found
   * @throws {Error} If validation fails
   */
  updateClip(id, name, query) {
    const clip = this.getClip(id);
    if (!clip) {
      return null;
    }

    if (!name || name.trim() === '') {
      throw new Error('Clip name cannot be empty');
    }

    if (!query || query.trim() === '') {
      throw new Error('SPARQL query cannot be empty');
    }

    const trimmedName = name.trim();
    
    // Check if name already exists (but not for the current clip)
    if (this.clips.some(c => c.name === trimmedName && c.id !== id)) {
      throw new Error('A clip with this name already exists');
    }

    clip.name = trimmedName;
    clip.query = query.trim();
    clip.timestamp = Date.now();
    clip.modified = new Date().toISOString();

    this.saveClips();
    
    this.logger?.info(`Updated SPARQL clip: ${trimmedName}`);
    return clip;
  }

  /**
   * Clear all clips
   */
  clearAllClips() {
    this.clips = [];
    this.saveClips();
    this.logger?.info('Cleared all SPARQL clips');
  }

  /**
   * Generate a unique ID for clips
   * @private
   * @returns {string} Unique ID
   */
  generateId() {
    return 'clip_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Get clips count
   * @returns {number} Number of clips
   */
  getClipsCount() {
    return this.clips.length;
  }

  /**
   * Export clips as JSON
   * @returns {string} JSON string of all clips
   */
  exportClips() {
    return JSON.stringify(this.clips, null, 2);
  }

  /**
   * Import clips from JSON
   * @param {string} jsonString - JSON string containing clips
   * @param {boolean} replace - Whether to replace existing clips or merge
   * @throws {Error} If JSON is invalid
   */
  importClips(jsonString, replace = false) {
    try {
      const importedClips = JSON.parse(jsonString);
      
      if (!Array.isArray(importedClips)) {
        throw new Error('Invalid clips format: expected array');
      }

      // Validate clip structure
      for (const clip of importedClips) {
        if (!clip.name || !clip.query) {
          throw new Error('Invalid clip structure: name and query are required');
        }
      }

      if (replace) {
        this.clips = importedClips;
      } else {
        // Merge, avoiding name conflicts
        for (const clip of importedClips) {
          if (!this.clips.some(existing => existing.name === clip.name)) {
            this.clips.push({
              ...clip,
              id: this.generateId(),
              timestamp: Date.now()
            });
          }
        }
      }

      this.saveClips();
      this.logger?.info(`Imported ${importedClips.length} SPARQL clips`);
    } catch (error) {
      this.logger?.error('Failed to import SPARQL clips:', error.message);
      throw new Error('Failed to import clips: ' + error.message);
    }
  }
}