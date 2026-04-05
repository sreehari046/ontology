# SPARQL Clips Directory

This directory contains individual SPARQL query files that are loaded as default clips in the Atuin application.

## Structure

- **`*.sparql`** - Individual SPARQL query files
- **`clips-metadata.json`** - Metadata for all clips including names, descriptions, tags, etc.
- **`README.md`** - This documentation file

## Adding New Clips

To add a new SPARQL clip:

1. **Create a `.sparql` file** with your query (e.g., `my-new-query.sparql`)
2. **Add metadata** to `clips-metadata.json` with the following structure:
   ```json
   {
     "id": "unique_clip_id",
     "name": "Display Name",
     "filename": "my-new-query.sparql",
     "description": "Description of what this query does",
     "endpoint": "https://example.org/sparql",
     "queryType": "SELECT|ASK|CONSTRUCT|DESCRIBE",
     "tags": ["tag1", "tag2"],
     "difficulty": "beginner|intermediate|advanced"
   }
   ```

## Clip Guidelines

- **Filename**: Use kebab-case (lowercase with hyphens)
- **Comments**: Include descriptive comments in the SPARQL file
- **Endpoint**: Specify the intended SPARQL endpoint in comments
- **Testing**: Test queries work with their intended endpoints
- **Size**: Keep queries reasonably sized for demo/learning purposes

## Query Types

- **SELECT**: Retrieve data in tabular format
- **ASK**: Boolean queries (true/false results)
- **CONSTRUCT**: Create RDF graphs for visualization
- **DESCRIBE**: Get RDF description of resources

## Examples

### Wikidata Query
```sparql
# Example Wikidata query
# Works with https://query.wikidata.org/sparql

SELECT ?item ?itemLabel WHERE {
  ?item wdt:P31 wd:Q5 .  # humans
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en" }
}
LIMIT 10
```

### DBpedia Query
```sparql
# Example DBpedia query  
# Works with https://dbpedia.org/sparql

SELECT ?person ?birthPlace WHERE {
  ?person dbo:birthPlace ?birthPlace .
  ?person rdf:type dbo:Person .
}
LIMIT 20
```

## Maintenance

The SPARQLClipsManager automatically loads these files at startup. Changes to files require an application restart to take effect.