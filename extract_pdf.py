import sys
from pypdf import PdfReader

try:
    reader = PdfReader("public/assets/Pedro Reichow - Resume.pdf")
    text = ""
    for page in reader.pages:
        text += page.extract_text() + "\n"
    print(text)
except Exception as e:
    print(f"Error: {e}")
