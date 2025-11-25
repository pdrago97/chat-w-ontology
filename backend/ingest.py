import os
import asyncio
import asyncio
from pypdf import PdfReader
from bs4 import BeautifulSoup
from dotenv import load_dotenv

# Load env from root
load_dotenv(os.path.join(os.path.dirname(__file__), '../.env'))

RESUME_PDF_PATH = os.path.join(os.path.dirname(__file__), 'assets/Pedro Reichow - Resume.pdf')
RESUME_HTML_PATH = os.path.join(os.path.dirname(__file__), 'assets/resume.html')

async def extract_text_from_pdf(pdf_path):
    reader = PdfReader(pdf_path)
    text = ""
    for page in reader.pages:
        text += page.extract_text() + "\n"
    return text

async def extract_text_from_html(html_path):
    with open(html_path, 'r', encoding='utf-8') as f:
        soup = BeautifulSoup(f, 'html.parser')
        # Get text with separator to avoid merging words
        text = soup.get_text(separator='\n')
        return text

async def main():
    print("Starting ingestion process...")
    
    # Ensure API key is present
    openai_key = os.getenv("OPENAI_API_KEY").strip() if os.getenv("OPENAI_API_KEY") else None
    if not openai_key:
        print("Error: OPENAI_API_KEY not found in environment variables.")
        return
    
    # Set LLM_API_KEY for Cognee if it expects that
    os.environ["LLM_API_KEY"] = openai_key
    
    import cognee

    print("Resetting Cognee state...")
    await cognee.prune.prune_data()
    # await cognee.prune.prune_system(metadata=True) # Cannot prune system when using volumes

    # Ingest PDF
    if os.path.exists(RESUME_PDF_PATH):
        print(f"Extracting text from PDF resume at {RESUME_PDF_PATH}...")
        pdf_text = await extract_text_from_pdf(RESUME_PDF_PATH)
        print(f"Extracted {len(pdf_text)} characters from PDF.")
        print("Adding PDF content to Cognee...")
        await cognee.add(pdf_text, dataset_name="resume_pdf")
    else:
        print(f"Warning: PDF Resume not found at {RESUME_PDF_PATH}")

    # Ingest HTML
    if os.path.exists(RESUME_HTML_PATH):
        print(f"Extracting text from HTML resume at {RESUME_HTML_PATH}...")
        html_text = await extract_text_from_html(RESUME_HTML_PATH)
        print(f"Extracted {len(html_text)} characters from HTML.")
        print("Adding HTML content to Cognee...")
        await cognee.add(html_text, dataset_name="resume_html")
    else:
        print(f"Warning: HTML Resume not found at {RESUME_HTML_PATH}")

    print("Cognifying (building graph)...")
    await cognee.cognify()

    print("Ingestion complete!")

if __name__ == "__main__":
    asyncio.run(main())
