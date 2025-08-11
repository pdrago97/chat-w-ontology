.PHONY: poc service up down

# Build and run the LangExtract service in Docker (clean, reproducible)
service:
	docker build -f tools/langextract.Dockerfile -t langextract-svc .
	OPENAI_API_KEY=$${OPENAI_API_KEY} \
	docker run --rm -it -p 8788:8788 \
	  -e OPENAI_API_KEY \
	  --name langextract-svc \
	  langextract-svc

# Run the Streamlit POC against the service (works on Python 3.9+)
poc:
	LANGEXTRACT_SERVICE_URL=http://127.0.0.1:8788 \
	OPENAI_API_KEY=$${OPENAI_API_KEY} \
	streamlit run admin/langextract_poc.py --server.port 8510

up: service
	down:
	-docker stop langextract-svc

