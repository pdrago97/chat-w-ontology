"""
Simple Document Extraction for Pipeline
Standalone extraction functions without dependencies on langextract_poc.py
"""
import json
import os
from typing import Dict, List, Any, Optional
import openai

def extract_with_openai(text: str, model_id: str = "gpt-4o-mini") -> Dict[str, Any]:
    """Extract entities and relationships using OpenAI directly"""
    
    prompt = """
    Extract a professional resume/CV knowledge graph from the following text:
    
    ENTITIES to extract (use exact text spans):
    - Person: { full_name, headline?, location?, email?, phone? }
    - Experience: { company, role, start_date?, end_date?, location?, description? }
    - Education: { institution, degree?, field?, start_date?, end_date?, location? }
    - Project: { name, description?, technologies?, url?, outcomes? }
    - Skill: { name, category?, level? }
    - Certification: { name, issuer?, date?, url? }
    
    RELATIONSHIPS to extract:
    - worked_at: Person -> Experience
    - studied_at: Person -> Education
    - built: Person -> Project
    - has_skill: Person -> Skill
    - earned: Person -> Certification
    - used_technology: Experience/Project -> Skill
    
    Return a JSON object with:
    {
        "nodes": [
            {"id": "unique_id", "type": "EntityType", "field1": "value1", ...}
        ],
        "edges": [
            {"source": "source_id", "target": "target_id", "relation": "relationship_type"}
        ]
    }
    
    TEXT TO ANALYZE:
    """ + text
    
    try:
        client = openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        
        response = client.chat.completions.create(
            model=model_id,
            messages=[
                {"role": "system", "content": "You are an expert at extracting structured information from professional documents. Always return valid JSON."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.1,
            max_tokens=4000
        )
        
        content = response.choices[0].message.content
        
        # Try to parse JSON from the response
        try:
            # Look for JSON in the response
            start_idx = content.find('{')
            end_idx = content.rfind('}') + 1
            
            if start_idx != -1 and end_idx != -1:
                json_str = content[start_idx:end_idx]
                result = json.loads(json_str)
                
                # Ensure we have the expected structure
                if "nodes" not in result:
                    result["nodes"] = []
                if "edges" not in result:
                    result["edges"] = []
                
                return {
                    "nodes": result["nodes"],
                    "edges": result["edges"],
                    "raw_response": content,
                    "meta": {"model": model_id, "method": "openai_direct"}
                }
            else:
                # Fallback: create basic structure from text
                return create_fallback_extraction(text)
                
        except json.JSONDecodeError:
            # Fallback if JSON parsing fails
            return create_fallback_extraction(text)
            
    except Exception as e:
        print(f"OpenAI extraction failed: {e}")
        return create_fallback_extraction(text)

def create_fallback_extraction(text: str) -> Dict[str, Any]:
    """Create a basic extraction when AI fails"""
    
    # Simple keyword-based extraction
    nodes = []
    edges = []
    
    # Look for common patterns
    lines = text.split('\n')
    
    # Try to find a name (usually in first few lines)
    name = "Professional"
    for line in lines[:5]:
        line = line.strip()
        if len(line) > 2 and len(line) < 50 and not any(char.isdigit() for char in line):
            # Might be a name
            words = line.split()
            if len(words) >= 2 and all(word.isalpha() or word in ['Jr.', 'Sr.', 'III'] for word in words):
                name = line
                break
    
    # Add person node
    person_node = {
        "id": name,
        "type": "Person",
        "name": name
    }
    nodes.append(person_node)
    
    # Look for companies (capitalized words)
    companies = set()
    for line in lines:
        words = line.split()
        for i, word in enumerate(words):
            if (word[0].isupper() if word else False) and len(word) > 2:
                # Check if next word is also capitalized (company name)
                if i + 1 < len(words) and (words[i + 1][0].isupper() if words[i + 1] else False):
                    company = f"{word} {words[i + 1]}"
                    if len(company) < 30:  # Reasonable company name length
                        companies.add(company)
    
    # Add company nodes and relationships
    for company in list(companies)[:5]:  # Limit to 5 companies
        exp_node = {
            "id": company,
            "type": "Experience",
            "company": company
        }
        nodes.append(exp_node)
        
        # Add relationship
        edges.append({
            "source": name,
            "target": company,
            "relation": "worked_at"
        })
    
    # Look for common skills
    common_skills = [
        "Python", "JavaScript", "Java", "React", "Node.js", "AWS", "Docker", 
        "Kubernetes", "PostgreSQL", "MongoDB", "API", "REST", "GraphQL",
        "Machine Learning", "AI", "Data Science", "Analytics", "SQL"
    ]
    
    found_skills = set()
    text_lower = text.lower()
    for skill in common_skills:
        if skill.lower() in text_lower:
            found_skills.add(skill)
    
    # Add skill nodes and relationships
    for skill in found_skills:
        skill_node = {
            "id": skill,
            "type": "Skill",
            "name": skill
        }
        nodes.append(skill_node)
        
        edges.append({
            "source": name,
            "target": skill,
            "relation": "has_skill"
        })
    
    return {
        "nodes": nodes,
        "edges": edges,
        "raw_response": "Fallback extraction used",
        "meta": {"method": "fallback", "note": "AI extraction failed, used keyword matching"}
    }

def extract_from_file(file_content: bytes, filename: str) -> str:
    """Extract text from uploaded file"""
    
    if filename.lower().endswith('.pdf'):
        try:
            from PyPDF2 import PdfReader
            import io
            
            reader = PdfReader(io.BytesIO(file_content))
            text = ""
            for page in reader.pages:
                text += page.extract_text() + "\n"
            return text
        except Exception as e:
            return f"Error reading PDF: {e}"
    
    elif filename.lower().endswith(('.txt', '.md')):
        try:
            return file_content.decode('utf-8', errors='ignore')
        except Exception as e:
            return f"Error reading text file: {e}"
    
    elif filename.lower().endswith('.docx'):
        try:
            import docx
            import io
            
            doc = docx.Document(io.BytesIO(file_content))
            text = ""
            for paragraph in doc.paragraphs:
                text += paragraph.text + "\n"
            return text
        except Exception as e:
            return f"Error reading DOCX: {e}. Install python-docx: pip install python-docx"
    
    else:
        # Try to decode as text
        try:
            return file_content.decode('utf-8', errors='ignore')
        except:
            return "Unsupported file format"

# Compatibility functions for the pipeline
def extract_with_langextract(text: str, model_id: str = "gpt-4o-mini", **kwargs) -> Dict[str, Any]:
    """Compatibility wrapper for the pipeline"""
    return extract_with_openai(text, model_id)

def map_lx_to_graph(extraction_result: Dict[str, Any]) -> Dict[str, Any]:
    """Compatibility wrapper - just return the result as-is"""
    return {
        "nodes": extraction_result.get("nodes", []),
        "edges": extraction_result.get("edges", [])
    }
