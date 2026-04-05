/**
 * @file config.js
 * Central configuration file for Atuin application
 */

/**
 * Default SPARQL endpoints configuration
 * @type {Array<Object>}
 */
export const DEFAULT_SPARQL_ENDPOINTS = [
  {
    url: 'https://query.wikidata.org/sparql',
    name: 'Wikidata',
    description: 'Wikidata Query Service - comprehensive knowledge base',
    timeout: 30000,
    maxResults: 1000
  },
  {
    url: 'https://dbpedia.org/sparql',
    name: 'DBpedia',
    description: 'DBpedia SPARQL endpoint - structured Wikipedia data',
    timeout: 30000,
    maxResults: 1000
  },
    {
    url: 'http://localhost:3030/semem/query',
    name: 'Local Semem',
    description: 'Semantic Web Memory',
    timeout: 30000,
    maxResults: 1000
  },
    {
    url: 'https://semem-fuseki.tensegrity.it/semem/sparql',
    name: 'Semem Server',
    description: 'Semantic Web Memory',
    timeout: 30000,
    maxResults: 1000
  } 
];

/**
 * Application configuration constants
 */
export const CONFIG = {
  // Editor settings
  EDITOR: {
    SYNTAX_CHECK_DEBOUNCE_MS: 500,
    DEFAULT_FONT_SIZE: 14,
    LINE_NUMBERS: true,
    HIGHLIGHT_ACTIVE_LINE: true
  },

  // Graph visualization settings
  GRAPH: {
    DEFAULT_NODE_SIZE: 20,
    DEFAULT_EDGE_WIDTH: 2,
    PHYSICS_ENABLED: true,
    CLUSTERING_ENABLED: false,
    MIN_LEFT_WIDTH: 200,
    MIN_RIGHT_WIDTH: 200,
    DEFAULT_SPLIT_PERCENTAGE: 50
  },

  // SPARQL query settings
  SPARQL: {
    DEFAULT_TIMEOUT_MS: 30000,
    DEFAULT_MAX_RESULTS: 1000,
    SUPPORTED_QUERY_TYPES: ['SELECT', 'ASK', 'CONSTRUCT', 'DESCRIBE', 'INSERT', 'DELETE'],
    RDF_CONTENT_TYPES: [
      'text/turtle',
      'application/turtle',
      'application/rdf+xml',
      'application/n-triples',
      'text/n3',
      'application/trig',
      'application/rdf+json',
      'text/plain'
    ]
  },

  // Local storage keys
  STORAGE_KEYS: {
    SPARQL_ENDPOINTS: 'atuin-sparql-endpoints',
    ACTIVE_ENDPOINT: 'atuin-active-sparql-endpoint',
    SPARQL_CLIPS: 'atuin-sparql-clips',
    SETTINGS: 'atuin-settings'
  },

  // Event bus event names (for reference - actual events defined in evb)
  EVENTS: {
    MODEL_SYNCED: 'MODEL_SYNCED',
    ENDPOINT_UPDATED: 'ENDPOINT_UPDATED',
    SPARQL_QUERY_COMPLETED: 'SPARQL_QUERY_COMPLETED'
  },

  // UI settings
  UI: {
    MESSAGE_DISPLAY_DURATION_MS: 3000,
    NOTIFICATION_TYPES: ['info', 'success', 'warning', 'error'],
    SPLIT_VIEW_BREAKPOINT: 768
  }
};

/**
 * Get default SPARQL endpoint URLs (for backward compatibility)
 * @returns {Array<string>} Array of default endpoint URLs
 */
export function getDefaultEndpointUrls() {
  return DEFAULT_SPARQL_ENDPOINTS.map(endpoint => endpoint.url);
}

/**
 * Get SPARQL endpoint configuration by URL
 * @param {string} url - The endpoint URL
 * @returns {Object|null} Endpoint configuration or null if not found
 */
export function getEndpointConfig(url) {
  return DEFAULT_SPARQL_ENDPOINTS.find(endpoint => endpoint.url === url) || null;
}

/**
 * Check if a content type indicates RDF data
 * @param {string} contentType - The content-type header value
 * @returns {boolean} True if the content-type indicates RDF data
 */
export function isRdfContentType(contentType) {
  const lowercaseType = contentType.toLowerCase();
  return CONFIG.SPARQL.RDF_CONTENT_TYPES.some(mediaType => 
    lowercaseType.includes(mediaType)
  );
}