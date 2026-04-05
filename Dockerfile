FROM stain/jena-fuseki:latest

# Copy the ontology data into the container
COPY vrukshaayurveda.ttl /staging/data.ttl

# Tell Fuseki to load this data into the "dsc" dataset path automatically
ENV FUSEKI_DATASET_1 dsc
ENV FUSEKI_DATASET_1_FILE /staging/data.ttl

# Expose standard Fuseki port (although Render relies on the PORT env variable)
EXPOSE 3030
