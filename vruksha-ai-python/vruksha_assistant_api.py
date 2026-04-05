import sys
import json
import os
import requests
from dotenv import load_dotenv
from groq import Groq

# Load environment variables
load_dotenv()
api_key = os.getenv("GROQ_API_KEY")
if not api_key:
    print(json.dumps({"error": "GROQ_API_KEY not found in .env file"}))
    sys.exit(1)

client = Groq(api_key=api_key)
FUSEKI_URL = "http://localhost:3030/dsc/query"
GROQ_MODEL = "llama-3.1-8b-instant"

def ask_groq(prompt, system=None, temperature=0.1, max_tokens=1000):
    """Send a prompt to Groq and return the response text."""
    messages = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": prompt})
    completion = client.chat.completions.create(
        model=GROQ_MODEL,
        messages=messages,
        temperature=temperature,
        max_tokens=max_tokens
    )
    return completion.choices[0].message.content

def query_fuseki(sparql):
    """Send a SPARQL query to Fuseki and return JSON results."""
    headers = {"Content-Type": "application/sparql-query", "Accept": "application/json"}
    response = requests.post(FUSEKI_URL, data=sparql, headers=headers)
    response.raise_for_status()
    return response.json()

def fetch_comments(entity_uris):
    """Fetch rdfs:comment for a list of entity URIs."""
    if not entity_uris:
        return {}
    values = " ".join(f"<{uri}>" for uri in entity_uris)
    query = f"""
    PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
    SELECT ?entity ?comment WHERE {{
        VALUES ?entity {{ {values} }}
        ?entity rdfs:comment ?comment .
    }}
    """
    try:
        result = query_fuseki(query)
        comments = {}
        for binding in result.get("results", {}).get("bindings", []):
            entity = binding["entity"]["value"]
            comment = binding["comment"]["value"]
            if entity not in comments:
                comments[entity] = []
            comments[entity].append(comment)
        return comments
    except Exception as e:
        # If comment fetch fails, return empty dict (non-critical)
        return {}

# ============================================================================
# Full system prompt (copied from your working interactive assistant)
# ============================================================================
system_prompt = """You are an expert in Vrukshaayurveda, the ancient Indian science of plant life. You convert user questions into precise SPARQL queries that can be run against the ontology. The ontology uses the namespace:
PREFIX : <urn:absolute:h/absolute:h/>

=== ONTOLOGY STRUCTURE ===
Classes (with individuals noted):
- :Plant (subclasses :Tree, :Shrub, :Creeper) – individuals like :Arishta (Neem), :Panasa (Jackfruit), :Arjuna, :Jambu, :Kadamba, :Udumbara, :Ashoka, :Punnaga, :Sirisha, :Kadali, etc.
- :Soil – individuals: :WetLowlandSoil, :MellowFertileSoil, :HardLateriteSoil, :CowDungEnrichedSoil, :LayeredOrganicPit, :SesameSoftenedSoil
- :Location – individuals: :Anupa (Wetland), :Park, :JalaPranta (Lake Bank), :Udyana (Garden)
- :Disease – individuals: :PanduPatrata (Pale Leaves), :Apravala (No New Shoots), :ShakhaShosha (Branch Drying), etc.
- :Symptom – individuals: :NoShoots, :PaleLeaves, :BranchWilting, etc.
- :Material (subclasses: :AnimalProduct, :PlantMaterial, :Grain, :FermentedMixture) – individuals: :Kshira (Milk), :Gomaya (Cow dung), :Ghrita (Ghee), :MamsaMatsya (Meat and Fish), :Vidanga, :Til (Sesame), etc.
- :TreatmentTechnique – individuals: :Kandaroapana (Grafting), :SaptaRatroshita (7-night ferment), :AvataPreparation (Pit Preparation), :Fumigation, :MilkDecoction, :KarakaJala (Hailstone Cold Shock), :ShataAngolaTreatment (100× Angola Treatment), etc.
- :Ritual – individuals: :BathingTree, :TreeWorship, :MedicatedPasteApplication, :PrePlantingPurification
- :Nakshatra – individuals: :Ashvini, :Pushya, :Hasta, :Mula, :Shravana, :Vishakha, etc.
- :Season – individuals: :Varsha (Rainy), :Grishma (Summer), :Hemanta (Winter), :Shishira (Autumn), :Sharad (Post-monsoon), :Vasanta (Spring)

Object properties:
- :growsIn (domain :Soil, range :Plant) – **Note: soil points to plant**, e.g., :WetLowlandSoil :growsIn :Arjuna.
- :suitableForLocation (domain :Plant, range :Location) – e.g., :Arjuna :suitableForLocation :Anupa.
- :occursIn (domain :Disease or :Symptom, range :Plant) – e.g., :PanduPatrata :occursIn :Arishta.
- :hasSymptom (domain :Disease, range :Symptom) – e.g., :PanduPatrata :hasSymptom :PaleLeaves.
- :treatedBy (domain :Disease, range :Material) – e.g., :PanduPatrata :treatedBy :Kshira.
- :plantedInSeason (domain :Plant, range :Season) – e.g., :Arjuna :plantedInSeason :Varsha.
- :auspiciousUnder (domain :PlantingPractice, range :Nakshatra)
- :performedWithRitual (domain :PlantingPractice, range :Ritual)
- :usesMaterial (domain :TreatmentTechnique, range :Material)

Data properties:
- :hasEnglishName (string) – common English name.
- :hasSanskritName (string) – original Sanskrit name.
- :hasModernExplanation (string) – modern scientific note.
- rdfs:comment – detailed explanatory notes about individuals.

=== EXAMPLES OF QUESTION TO SPARQL ===
Use these examples as a guide. Always include the PREFIX line.

Plants & Soils:
1. "What plants grow in wet lowland soil?"
   PREFIX : <urn:absolute:h/absolute:h/>
   SELECT ?plant ?name WHERE { :WetLowlandSoil :growsIn ?plant . OPTIONAL { ?plant :hasEnglishName ?name } }

2. "Show me trees that grow in hard laterite soil."
   PREFIX : <urn:absolute:h/absolute:h/>
   SELECT ?plant ?name WHERE { :HardLateriteSoil :growsIn ?plant . ?plant a :Tree . OPTIONAL { ?plant :hasEnglishName ?name } }

3. "Which plants are suitable for wetlands?"
   PREFIX : <urn:absolute:h/absolute:h/>
   SELECT ?plant ?name WHERE { ?plant :suitableForLocation :Anupa . OPTIONAL { ?plant :hasEnglishName ?name } }

4. "List plants recommended for parks."
   PREFIX : <urn:absolute:h/absolute:h/>
   SELECT ?plant ?name WHERE { ?plant :suitableForLocation :Park . OPTIONAL { ?plant :hasEnglishName ?name } }

5. "What trees are suitable for lake banks?"
   PREFIX : <urn:absolute:h/absolute:h/>
   SELECT ?plant ?name WHERE { ?plant :suitableForLocation :JalaPranta . ?plant a :Tree . OPTIONAL { ?plant :hasEnglishName ?name } }

Diseases & Treatments:
6. "How do I treat pale leaves on Neem?"
   PREFIX : <urn:absolute:h/absolute:h/>
   SELECT ?material ?materialName WHERE { ?disease a :Disease ; :hasEnglishName "Pale Leaves" ; :occursIn :Arishta ; :treatedBy ?material . OPTIONAL { ?material :hasEnglishName ?materialName } }

7. "What diseases affect jackfruit?"
   PREFIX : <urn:absolute:h/absolute:h/>
   SELECT ?disease ?name WHERE { ?disease a :Disease ; :occursIn :Panasa . OPTIONAL { ?disease :hasEnglishName ?name } }

8. "Find treatments for No New Shoots on jackfruit."
   PREFIX : <urn:absolute:h/absolute:h/>
   SELECT ?material ?materialName WHERE { ?disease a :Disease ; :hasEnglishName "No New Shoots" ; :occursIn :Panasa ; :treatedBy ?material . OPTIONAL { ?material :hasEnglishName ?materialName } }

9. "What are the symptoms of PanduPatrata?"
   PREFIX : <urn:absolute:h/absolute:h/>
   SELECT ?symptom ?symptomName WHERE { ?disease a :Disease ; :hasSanskritName "PanduPatrata" ; :hasSymptom ?symptom . ?symptom a :Symptom . OPTIONAL { ?symptom :hasEnglishName ?symptomName } }

10. "Which diseases cause branch drying?"
    PREFIX : <urn:absolute:h/absolute:h/>
    SELECT ?disease ?name WHERE { ?disease a :Disease ; :hasSymptom :BranchWilting . OPTIONAL { ?disease :hasEnglishName ?name } }

Materials & Techniques:
11. "What materials are used for grafting?"
    PREFIX : <urn:absolute:h/absolute:h/>
    SELECT ?material ?name WHERE { :Kandaroapana :usesMaterial ?material . OPTIONAL { ?material :hasEnglishName ?name } }

12. "List all animal products used in treatments."
    PREFIX : <urn:absolute:h/absolute:h/>
    SELECT ?material ?name WHERE { ?material a :AnimalProduct . OPTIONAL { ?material :hasEnglishName ?name } }

13. "Show me all treatment techniques."
    PREFIX : <urn:absolute:h/absolute:h/>
    SELECT ?technique ?name WHERE { ?technique a :TreatmentTechnique . OPTIONAL { ?technique :hasEnglishName ?name } }

14. "Which materials are used in 7‑night ferment?"
    PREFIX : <urn:absolute:h/absolute:h/>
    SELECT ?material ?name WHERE { :SaptaRatroshita :usesMaterial ?material . OPTIONAL { ?material :hasEnglishName ?name } }

Nakshatras & Seasons:
15. "Which nakshatras are auspicious for planting?"
    PREFIX : <urn:absolute:h/absolute:h/>
    SELECT DISTINCT ?nakshatra ?name WHERE { ?practice a :PlantingPractice ; :auspiciousUnder ?nakshatra . ?nakshatra a :Nakshatra . OPTIONAL { ?nakshatra :hasEnglishName ?name } }

16. "What planting practices are associated with Pushya nakshatra?"
    PREFIX : <urn:absolute:h/absolute:h/>
    SELECT ?practice ?name WHERE { ?practice a :PlantingPractice ; :auspiciousUnder :Pushya . OPTIONAL { ?practice :hasEnglishName ?name } }

17. "Which season is best for planting Arjuna?"
    PREFIX : <urn:absolute:h/absolute:h/>
    SELECT ?season ?name WHERE { :Arjuna :plantedInSeason ?season . OPTIONAL { ?season :hasEnglishName ?name } }

General:
18. "What is the English name for Arishta?"
    PREFIX : <urn:absolute:h/absolute:h/>
    SELECT ?name WHERE { :Arishta :hasEnglishName ?name }

19. "What is the Sanskrit name for jackfruit?"
    PREFIX : <urn:absolute:h/absolute:h/>
    SELECT ?name WHERE { :Panasa :hasSanskritName ?name }

20. "Show all soils with their English names."
    PREFIX : <urn:absolute:h/absolute:h/>
    SELECT ?soil ?name WHERE { ?soil a :Soil . OPTIONAL { ?soil :hasEnglishName ?name } }

21. "Find modern scientific explanations for cow dung."
    PREFIX : <urn:absolute:h/absolute:h/>
    SELECT ?explanation WHERE { :Gomaya :hasModernExplanation ?explanation }

=== INSTRUCTIONS ===
- Convert the user's question into a SPARQL query using the correct properties and individuals as shown in the examples.
- Always include the PREFIX line.
- Return ONLY the SPARQL query, no explanations, no markdown, no comments.
"""

# ============================================================================
# Main API entry point
# ============================================================================
if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Usage: python vruksha_assistant_api.py \"your question\""}))
        sys.exit(1)

    question = sys.argv[1].strip()
    if not question:
        print(json.dumps({"error": "Empty question"}))
        sys.exit(1)

    try:
        # Step 1: Generate SPARQL
        sparql = ask_groq(question, system=system_prompt, temperature=0.1, max_tokens=500)
        if not sparql.strip().startswith("PREFIX"):
            sparql = "PREFIX : <urn:absolute:h/absolute:h/>\n" + sparql

        # Step 2: Execute SPARQL
        results = query_fuseki(sparql)

        # Step 3: Extract entity URIs and fetch comments
        bindings = results.get("results", {}).get("bindings", [])
        entity_uris = set()
        for binding in bindings:
            for var, value in binding.items():
                if value["type"] == "uri":
                    entity_uris.add(value["value"])
        comments = fetch_comments(list(entity_uris))

        # Step 4: Generate factual summary (if results exist)
        if bindings:
            results_str = json.dumps(results, indent=2)
            comments_str = ""
            if comments:
                lines = []
                for uri, comm_list in comments.items():
                    local_name = uri.split('/')[-1]
                    comm_text = "; ".join(comm_list)
                    lines.append(f"- {local_name}: {comm_text}")
                comments_str = "\n".join(lines)

            summary_prompt = f"""The user asked: "{question}"

The SPARQL query returned these JSON results:
{results_str}

Additional explanatory comments from the ontology for the entities found:
{comments_str if comments_str else "No comments available."}

Based **only** on these results and the comments, provide a direct, factual answer to the user's question. Do NOT add any extra information, suggestions, disclaimers, or external knowledge. If the results list items, simply state what they are. If there are comments, you may include them as they are. Keep the answer concise and strictly grounded in the provided data.

Example of a good answer:
- "The materials used are Vidanga (antifungal) and Milk (nitrogen source)."
- "The plants found are Arjuna, Jambu, Kadamba, and Udumbara."

Your answer:"""
            answer = ask_groq(summary_prompt, temperature=0.0, max_tokens=300)
        else:
            # No results – generate a helpful suggestion based on ontology structure
            no_results_prompt = f"""The user asked: "{question}"

The SPARQL query returned no results in the ontology. Based on the ontology's structure (classes and properties), suggest what kind of information might be available or what the user could ask instead. Do not invent specific individuals or facts. Keep the response helpful and concise.

Example: "I couldn't find information about pale leaves on Neem. You might try asking about diseases affecting Neem or treatments for other plants."

Your response:"""
            answer = ask_groq(no_results_prompt, temperature=0.2, max_tokens=200)

        # Output JSON
        output = {
            "answer": answer,
            "sparql": sparql,
            "results": results,
            "comments": comments   # optional, can be used by frontend
        }
        print(json.dumps(output, indent=2))

    except Exception as e:
        print(json.dumps({"error": str(e)}))