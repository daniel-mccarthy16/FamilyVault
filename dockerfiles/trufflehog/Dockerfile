# Use an official Python runtime as a parent image
FROM python:3.9-slim

# Set the working directory in the container
WORKDIR /usr/src/app

# Install git and any other dependencies you might need
RUN apt-get update && apt-get install -y git

# Install TruffleHog
RUN pip install trufflehog

# Reduce potential security issues and cleanup
RUN apt-get clean && rm -rf /var/lib/apt/lists/*

# Command to run when the container starts
ENTRYPOINT ["trufflehog"]
CMD ["--exclude", ".*node_modules.*", "/data"]
