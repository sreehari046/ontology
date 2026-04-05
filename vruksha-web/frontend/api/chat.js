const axios = require('axios');

const SYSTEM_PROMPT = `You are an expert in Vrukshaayurveda, the ancient Indian science of plant life. You convert user questions into precise SPARQL queries that can be run against the ontology. The ontology uses the namespace:
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
- :growsIn (domain :Soil, range :Plant)
- :suitableForLocation (domain :Plant, range :Location)
- :occursIn (domain :Disease or :Symptom, range :Plant)
- :hasSymptom (domain :Disease, range :Symptom)
- :treatedBy (domain :Disease, range :Material)
- :plantedInSeason (domain :Plant, range :Season)
- :auspiciousUnder (domain :PlantingPractice, range :Nakshatra)
- :performedWithRitual (domain :PlantingPractice, range :Ritual)
- :usesMaterial (domain :TreatmentTechnique, range :Material)

Data properties:
- :hasEnglishName (string)
- :hasSanskritName (string)
- :hasModernExplanation (string)
- rdfs:comment

=== EXAMPLES OF QUESTION TO SPARQL ===
Use these examples as a guide. Always include the PREFIX line.

1. "What plants grow in wet lowland soil?"
   PREFIX : <urn:absolute:h/absolute:h/>
   SELECT ?plant ?name WHERE { :WetLowlandSoil :growsIn ?plant . OPTIONAL { ?plant :hasEnglishName ?name } }

2. "Which plants are suitable for wetlands?"
   PREFIX : <urn:absolute:h/absolute:h/>
   SELECT ?plant ?name WHERE { ?plant :suitableForLocation :Anupa . OPTIONAL { ?plant :hasEnglishName ?name } }

3. "How do I treat pale leaves on Neem?"
   PREFIX : <urn:absolute:h/absolute:h/>
   SELECT ?material ?materialName WHERE { ?disease a :Disease ; :hasEnglishName "Pale Leaves" ; :occursIn :Arishta ; :treatedBy ?material . OPTIONAL { ?material :hasEnglishName ?materialName } }

4. "What are the symptoms of PanduPatrata?"
   PREFIX : <urn:absolute:h/absolute:h/>
   SELECT ?symptom ?symptomName WHERE { ?disease a :Disease ; :hasSanskritName "PanduPatrata" ; :hasSymptom ?symptom . ?symptom a :Symptom . OPTIONAL { ?symptom :hasEnglishName ?symptomName } }

5. "What materials are used for grafting?"
   PREFIX : <urn:absolute:h/absolute:h/>
   SELECT ?material ?name WHERE { :Kandaroapana :usesMaterial ?material . OPTIONAL { ?material :hasEnglishName ?name } }

6. "Which nakshatras are auspicious for planting?"
   PREFIX : <urn:absolute:h/absolute:h/>
   SELECT DISTINCT ?nakshatra ?name WHERE { ?practice a :PlantingPractice ; :auspiciousUnder ?nakshatra . ?nakshatra a :Nakshatra . OPTIONAL { ?nakshatra :hasEnglishName ?name } }

7. "What is the English name for Arishta?"
   PREFIX : <urn:absolute:h/absolute:h/>
   SELECT ?name WHERE { :Arishta :hasEnglishName ?name }

=== INSTRUCTIONS ===
- Convert the user's question into a SPARQL query using the correct properties and individuals as shown in the examples.
- Always include the PREFIX line.
- Return ONLY the SPARQL query, no explanations, no markdown, no comments.
`;

async function askGroq(prompt, system, temperature = 0.1, maxTokens = 1000) {
    const GROQ_API_KEY = process.env.GROQ_API_KEY;
    if (!GROQ_API_KEY) throw new Error("GROQ_API_KEY is not configured in Vercel Environment Variables.");
    const messages = [];
    if (system) messages.push({ role: "system", content: system });
    messages.push({ role: "user", content: prompt });
    
    const response = await axios.post("https://api.groq.com/openai/v1/chat/completions", {
        model: "llama-3.1-8b-instant",
        messages,
        temperature,
        max_tokens: maxTokens
    }, {
        headers: {
            "Authorization": `Bearer ${GROQ_API_KEY}`,
            "Content-Type": "application/json"
        }
    });
    return response.data.choices[0].message.content;
}

async function fetchComments(uris, fuseki_url) {
    if (!uris || uris.length === 0) return {};
    const values = uris.map(u => `<${u}>`).join(' ');
    const query = `
    PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
    SELECT ?entity ?comment WHERE {
        VALUES ?entity { ${values} }
        ?entity rdfs:comment ?comment .
    }`;
    
    try {
        const response = await axios.post(fuseki_url, query, { headers: { 'Content-Type': 'application/sparql-query' } });
        const comments = {};
        const bindings = response.data?.results?.bindings || [];
        for (const b of bindings) {
            const ent = b.entity?.value;
            if (!comments[ent]) comments[ent] = [];
            comments[ent].push(b.comment?.value);
        }
        return comments;
    } catch (e) {
        return {};
    }
}

module.exports = async function(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    const { question } = req.body;
    if (!question) return res.status(400).json({ error: 'Question required' });

    const FUSEKI_URL = process.env.FUSEKI_URL;
    if (!FUSEKI_URL) return res.status(500).json({ error: 'FUSEKI_URL not configured' });

    try {
        let sparql = await askGroq(question, SYSTEM_PROMPT, 0.1, 500);
        
        // Remove markdown formatting (like ```sparql ... ```) if the AI includes it
        sparql = sparql.replace(/```[a-zA-Z]*\n?/g, '').replace(/```/g, '').trim();

        if (!sparql.startsWith("PREFIX")) {
            sparql = "PREFIX : <urn:absolute:h/absolute:h/>\n" + sparql;
        }

        const fbResponse = await axios.post(FUSEKI_URL, sparql, {
            headers: { 'Content-Type': 'application/sparql-query' }
        });
        const results = fbResponse.data;
        
        let bindings = results.results?.bindings || [];
        const uris = new Set();
        for (const b of bindings) {
            for (const key of Object.keys(b)) {
                if (b[key].type === 'uri') uris.add(b[key].value);
            }
        }
        
        const comments = await fetchComments(Array.from(uris), FUSEKI_URL);
        
        let answer = "";
        if (bindings.length > 0) {
            const commentsStr = Object.entries(comments).map(([k, v]) => `- ${k.split('/').pop()}: ${v.join('; ')}`).join('\n');
            const summaryPrompt = `The user asked: "${question}"\n\nResults: ${JSON.stringify(results)}\n\nComments:\n${commentsStr || 'None'}\n\nBased ONLY on these results/comments, give a direct, factual answer without extra additions.`;
            answer = await askGroq(summaryPrompt, null, 0.0, 300);
        } else {
            const noResultsPrompt = `The user asked: "${question}"\n\nSPARQL returned no results. Based on the ontology classes (Plant, Soil, Disease, Material, etc.), what else could they ask? Be helpful but brief.`;
            answer = await askGroq(noResultsPrompt, null, 0.2, 200);
        }
        
        res.status(200).json({ answer, sparql, results, comments });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
