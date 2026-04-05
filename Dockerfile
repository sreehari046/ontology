# Hugging Face Spaces requires running as a non-root user (id 1000) on port 7860.
# The default jena-fuseki images crash on Hugging Face, so we build it cleanly:

FROM eclipse-temurin:17-jre-jammy

# Install curl
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

# Create the required Hugging Face non-root user
RUN useradd -m -u 1000 user
USER user
WORKDIR /home/user

# Download Apache Jena Fuseki directly
ENV FUSEKI_VERSION=5.1.0
RUN curl -L https://archive.apache.org/dist/jena/binaries/apache-jena-fuseki-${FUSEKI_VERSION}.tar.gz | tar -xz

WORKDIR /home/user/apache-jena-fuseki-${FUSEKI_VERSION}

# Copy your ontology file directly into the container as the correct user
COPY --chown=user:user vrukshaayurveda.ttl /home/user/data.ttl

EXPOSE 7860

# Start Fuseki strictly on port 7860 with the .ttl pre-loaded!
CMD ["./fuseki-server", "--port", "7860", "--mem", "--update", "--file=/home/user/data.ttl", "/dsc"]
