FROM stain/jena-fuseki:latest

# Copy the ontology data into the container
COPY vrukshaayurveda.ttl /staging/data.ttl

# Overwrite the default startup command to explicitly create an in-memory DB 
# named /dsc and load our .ttl file into it on every boot.
CMD ["--mem", "--update", "--file", "/staging/data.ttl", "/dsc"]

