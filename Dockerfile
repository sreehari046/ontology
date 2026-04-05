FROM stain/jena-fuseki:latest

# Set an admin password so you can use the web interface
ENV ADMIN_PASSWORD=admin
ENV FUSEKI_DATASET_1=dsc

EXPOSE 3030

