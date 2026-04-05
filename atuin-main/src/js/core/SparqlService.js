/**
 * @file SparqlService.js
 * Service for executing SPARQL queries against a given endpoint.
 */

import { eventBus, EVENTS } from 'evb';
import { isRdfContentType } from '../../config.js';

export class SparqlService {
  /**
   * Creates a new SparqlService.
   * @param {LoggerService} logger - The logger service instance.
   */
  constructor(logger) {
    this.logger = logger;
  }

  /**
   * Executes a SPARQL query against the specified endpoint.
   * @param {string} query - The SPARQL query string.
   * @param {string} endpoint - The URL of the SPARQL endpoint.
   * @returns {Promise<object>} A promise that resolves with the response from the endpoint or rejects with an error.
   */
  async executeQuery(query, endpoint) {
    this.logger.info(`Executing query on endpoint: ${endpoint}`);
    this.logger.debug(`Query:\n${query}`);

    if (!endpoint) {
      this.logger.error('Endpoint URL is missing.');
      return Promise.reject(new Error('SPARQL endpoint URL is required.'));
    }
    if (!query || query.trim() === '') {
        this.logger.error('SPARQL query is empty.');
        return Promise.reject(new Error('SPARQL query cannot be empty.'));
    }

    // Determine query type to set appropriate Accept header
    const queryType = this._detectQueryType(query);
    const acceptHeader = queryType === 'CONSTRUCT' || queryType === 'DESCRIBE' 
      ? 'text/turtle, application/rdf+xml, application/n-triples, text/n3, application/trig, application/rdf+json, application/sparql-results+json' 
      : 'application/sparql-results+json';

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded', // Standard for SPARQL POST requests
          'Accept': acceptHeader
        },
        // SPARQL query is typically sent as a URL-encoded parameter named 'query'
        body: `query=${encodeURIComponent(query)}` 
      });

      if (!response.ok) {
        let errorDetails = `HTTP error ${response.status}`;
        try {
            const errorText = await response.text();
            errorDetails += ` - ${errorText}`;
        } catch (e) {
            // Ignore if can't read error text
        }
        this.logger.error(`Failed to execute SPARQL query: ${errorDetails}`);
        throw new Error(`Failed to execute SPARQL query: ${errorDetails}`);
      }

      // Handle different response types based on content-type
      const contentType = response.headers.get('content-type') || '';
      
      // Enhanced logging to debug content-type detection
      this.logger.info(`Response content-type: "${contentType}"`);
      this.logger.info(`Query type detected: ${queryType}`);
      this.logger.info(`Accept header sent: ${acceptHeader}`);
      
      if (isRdfContentType(contentType)) {
        // Handle RDF response - route to turtle editor and graph visualization
        const rdfContent = await response.text();
        this.logger.info(`SPARQL CONSTRUCT/DESCRIBE query executed successfully - routing RDF (${contentType}) to editor/graph`);
        this.logger.debug('RDF content:', rdfContent);
        
        // Emit MODEL_SYNCED event to update turtle editor and graph visualization
        eventBus.emit(EVENTS.MODEL_SYNCED, rdfContent);
        
        // Emit SPARQL_QUERY_COMPLETED event to trigger view switch for CONSTRUCT results
        eventBus.emit(EVENTS.SPARQL_QUERY_COMPLETED, {
          type: 'construct',
          queryType: queryType,
          contentType: contentType,
          switchToTurtleView: true
        });
        
        return {
          type: 'rdf',
          content: rdfContent,
          contentType: contentType,
          message: `CONSTRUCT/DESCRIBE results (${contentType}) loaded into turtle editor and graph visualization`
        };
      } else {
        // Handle JSON response (SELECT, ASK queries)
        const results = await response.json();
        this.logger.info('SPARQL query executed successfully.');
        this.logger.debug('Results:', results);
        return results;
      }

    } catch (error) {
      this.logger.error('Error during SPARQL query execution:', error);
      // Re-throw the error so the caller can handle it
      throw error; 
    }
  }

  /**
   * Detects the type of SPARQL query
   * @private
   * @param {string} query - The SPARQL query string
   * @returns {string} Query type ('SELECT', 'ASK', 'CONSTRUCT', 'DESCRIBE', 'INSERT', 'DELETE')
   */
  _detectQueryType(query) {
    // Remove comments and whitespace to get the actual query content
    const cleanQuery = query
      .split('\n')
      .map(line => line.trim())
      .filter(line => !line.startsWith('#') && line.length > 0)
      .join(' ')
      .trim()
      .toUpperCase();
    
    // Look for query type keywords anywhere in the query, but prioritize by order
    // SPARQL queries can have PREFIX declarations before the main query type
    if (cleanQuery.includes('CONSTRUCT')) {
      return 'CONSTRUCT';
    }
    if (cleanQuery.includes('DESCRIBE')) {
      return 'DESCRIBE';
    }
    if (cleanQuery.includes('SELECT')) {
      return 'SELECT';
    }
    if (cleanQuery.includes('ASK')) {
      return 'ASK';
    }
    if (cleanQuery.includes('INSERT')) {
      return 'INSERT';
    }
    if (cleanQuery.includes('DELETE')) {
      return 'DELETE';
    }
    
    // Default to SELECT if cannot detect
    return 'SELECT';
  }

}
