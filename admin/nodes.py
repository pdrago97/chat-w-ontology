# PocketFlow nodes for knowledge graph generation
import json
import yaml
import os
import sys
from pocketflow import Node
from utils import call_llm

# Add parent directory to path to import from main app
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

try:
    from app.routes.pdfProcessor import queryVectorStore
except ImportError:
    try:
        # Alternative import path
        sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'app', 'routes'))
        from pdfProcessor import queryVectorStore
    except ImportError:
        print("Warning: Could not import PDF processor. PDF-based graph generation will be limited.")
        queryVectorStore = None

class ProcessPDFsNode(Node):
    """Process multiple uploaded PDF files and extract content"""

    def prep(self, shared):
        return shared.get("uploaded_files", [])

    def exec(self, uploaded_files):
        if not uploaded_files:
            return {"error": "No PDF files uploaded"}

        all_content = []

        for uploaded_file in uploaded_files:
            try:
                # Process each PDF file
                filename = uploaded_file.name if hasattr(uploaded_file, 'name') else "unknown"

                # Try to read as PDF first
                try:
                    from PyPDF2 import PdfReader
                    import io

                    # Read PDF content
                    file_content = uploaded_file.read()
                    pdf_reader = PdfReader(io.BytesIO(file_content))
                    text_content = ""

                    for page in pdf_reader.pages:
                        text_content += page.extract_text() + "\n"

                    all_content.append({
                        "filename": filename,
                        "content": text_content
                    })

                except Exception as pdf_error:
                    # Fallback: try to read as text
                    try:
                        if hasattr(uploaded_file, 'read'):
                            content = uploaded_file.read()
                            if isinstance(content, bytes):
                                content = content.decode('utf-8', errors='ignore')
                        else:
                            content = str(uploaded_file)

                        all_content.append({
                            "filename": filename,
                            "content": content
                        })
                    except Exception as text_error:
                        all_content.append({
                            "filename": filename,
                            "error": f"PDF error: {pdf_error}, Text error: {text_error}"
                        })

            except Exception as e:
                all_content.append({
                    "filename": uploaded_file.name if hasattr(uploaded_file, 'name') else "unknown",
                    "error": str(e)
                })

        return all_content

    def post(self, shared, prep_res, exec_res):
        shared["pdf_contents"] = exec_res
        return "generate_graph"

class GenerateFromPDFNode(Node):
    """Generate initial knowledge graph from PDF content"""

    def prep(self, shared):
        pdf_contents = shared.get("pdf_contents", [])
        if not pdf_contents:
            # Fallback to existing PDF processor if available
            queries = [
                "work experience, companies, roles, technologies, responsibilities",
                "education, degrees, institutions, academic background",
                "technical skills, programming languages, frameworks, tools",
                "projects, achievements, certifications",
                "personal information, interests, languages"
            ]
            return {"type": "query", "data": queries}
        else:
            return {"type": "content", "data": pdf_contents}

    def exec(self, inputs):
        input_type = inputs["type"]
        data = inputs["data"]

        if input_type == "content":
            # Process uploaded PDF contents
            combined_content = ""
            for pdf_data in data:
                if "error" in pdf_data:
                    combined_content += f"Error processing {pdf_data['filename']}: {pdf_data['error']}\n"
                else:
                    combined_content += f"=== {pdf_data['filename']} ===\n{pdf_data['content']}\n\n"

        elif input_type == "query" and queryVectorStore:
            # Use existing vector store
            all_content = []
            for query in data:
                try:
                    content = queryVectorStore(query)
                    all_content.append(f"Query: {query}\nContent: {content}\n")
                except Exception as e:
                    print(f"Error querying PDF for '{query}': {e}")
            combined_content = "\n---\n".join(all_content)

        else:
            # Fallback: create a basic graph structure
            return {
                "nodes": [
                    {
                        "id": "Pedro Reichow",
                        "type": "Person",
                        "contact": {
                            "email": "pedroreichow3@gmail.com",
                            "linkedin": "https://www.linkedin.com/in/pedroreichow",
                            "github": "https://github.com/pdrago97"
                        }
                    }
                ],
                "edges": []
            }

        # Enhanced AI workflow for graph extraction (optimized for token limits)
        # Truncate content if too long
        max_content_length = 3000
        if len(combined_content) > max_content_length:
            combined_content = combined_content[:max_content_length] + "...[truncated]"

        prompt = f"""
Extract professional information from this content and create a knowledge graph in YAML format.

CONTENT:
{combined_content}

OUTPUT - Return ONLY valid YAML:

```yaml
nodes:
  - id: "Pedro Reichow"
    type: "Person"
    contact:
      email: "pedroreichow3@gmail.com"
      linkedin: "https://www.linkedin.com/in/pedroreichow"
      github: "https://github.com/pdrago97"
    summary: "Brief professional summary"

  # WORK EXPERIENCE - Create one node per company/role
  - id: "QI Tech"
    type: "Experience"
    title: "Senior Software Engineer"
    years: "2022-2024"
    location: "São Paulo, Brazil"
    technologies: ["Python", "React", "Apache Kafka", "Redis", "PostgreSQL"]
    responsibilities: ["Led development of fintech platform", "Implemented microservices"]
    achievements: ["Increased system performance by 40%"]

  # EDUCATION - Create one node per institution
  - id: "Universidade Federal do Rio Grande do Sul"
    type: "Education"
    degree: "Bachelor in Computer Science"
    years: "2018-2022"
    location: "Porto Alegre, Brazil"
    gpa: "3.8/4.0"
    relevant_courses: ["Data Structures", "Algorithms", "Machine Learning"]

  # SKILLS - Group by category
  - id: "Programming Languages"
    type: "Skills"
    category: "Technical"
    items: ["Python", "JavaScript", "TypeScript", "Java", "Go"]
    proficiency: "Expert"

  - id: "Web Development"
    type: "Skills"
    category: "Technical"
    items: ["React", "Node.js", "Next.js", "Express", "FastAPI"]
    proficiency: "Expert"

  # PROJECTS - Create one node per significant project
  - id: "AI-Powered Trading Platform"
    type: "Project"
    description: "Built machine learning platform for algorithmic trading"
    technologies: ["Python", "TensorFlow", "PostgreSQL", "Redis"]
    year: "2023"
    impact: "Processed $10M+ in transactions"

  # CERTIFICATIONS
  - id: "AWS Solutions Architect"
    type: "Certification"
    issuer: "Amazon Web Services"
    year: "2023"
    credential_id: "ABC123"

edges:
  # Person to Experience
  - source: "Pedro Reichow"
    target: "QI Tech"
    relation: "WORKED_AT"
    duration: "2 years"

  # Person to Education
  - source: "Pedro Reichow"
    target: "Universidade Federal do Rio Grande do Sul"
    relation: "STUDIED_AT"
    duration: "4 years"

  # Person to Skills
  - source: "Pedro Reichow"
    target: "Programming Languages"
    relation: "HAS_SKILL"
    level: "Expert"

  # Person to Projects
  - source: "Pedro Reichow"
    target: "AI-Powered Trading Platform"
    relation: "CREATED"
    role: "Lead Developer"

  # Experience to Skills (what skills were used where)
  - source: "QI Tech"
    target: "Programming Languages"
    relation: "USED_SKILLS"
    context: "Daily development work"

  # Projects to Skills
  - source: "AI-Powered Trading Platform"
    target: "Programming Languages"
    relation: "IMPLEMENTED_WITH"
    technologies: ["Python", "TensorFlow"]
```

CRITICAL: Extract EVERYTHING from the documents. Include all companies, roles, technologies, projects, education, certifications, and achievements. Create rich relationships between entities.
"""

        response = call_llm(prompt)
        try:
            # Try to extract YAML from response
            if "```yaml" in response:
                yaml_str = response.split("```yaml")[1].split("```")[0].strip()
            elif "```" in response:
                yaml_str = response.split("```")[1].split("```")[0].strip()
            else:
                yaml_str = response.strip()

            graph_data = yaml.safe_load(yaml_str)

            # Merge with existing graph if available
            existing_graph = self.load_existing_graph()
            if existing_graph:
                merged_graph = self.merge_graphs(existing_graph, graph_data)
                return merged_graph
            else:
                return graph_data

        except Exception as e:
            print(f"Error parsing graph structure: {e}")
            print(f"Response was: {response[:500]}...")
            return {"error": f"Failed to parse graph structure: {e}"}

    def load_existing_graph(self):
        """Load existing graph from file"""
        try:
            import json
            with open("../public/knowledge-graph.json", "r") as f:
                return json.load(f)
        except FileNotFoundError:
            return None
        except Exception as e:
            print(f"Error loading existing graph: {e}")
            return None

    def merge_graphs(self, existing_graph, new_graph):
        """Intelligently merge new graph data with existing graph"""
        merged = {
            "nodes": existing_graph.get("nodes", []),
            "edges": existing_graph.get("edges", [])
        }

        # Track existing node IDs
        existing_node_ids = {node["id"] for node in merged["nodes"]}

        # Add new nodes (avoid duplicates)
        for new_node in new_graph.get("nodes", []):
            node_id = new_node["id"]
            if node_id not in existing_node_ids:
                merged["nodes"].append(new_node)
                existing_node_ids.add(node_id)
            else:
                # Update existing node with new information
                for i, existing_node in enumerate(merged["nodes"]):
                    if existing_node["id"] == node_id:
                        # Merge node data intelligently
                        merged_node = self.merge_node_data(existing_node, new_node)
                        merged["nodes"][i] = merged_node
                        break

        # Track existing edges
        existing_edges = {(edge["source"], edge["target"], edge["relation"]) for edge in merged["edges"]}

        # Add new edges (avoid duplicates)
        for new_edge in new_graph.get("edges", []):
            edge_key = (new_edge["source"], new_edge["target"], new_edge["relation"])
            if edge_key not in existing_edges:
                merged["edges"].append(new_edge)
                existing_edges.add(edge_key)

        return merged

    def merge_node_data(self, existing_node, new_node):
        """Merge data from two nodes intelligently"""
        merged = existing_node.copy()

        # Merge lists (like technologies, responsibilities)
        for key, value in new_node.items():
            if key == "id" or key == "type":
                continue  # Don't change ID or type
            elif isinstance(value, list) and key in merged and isinstance(merged[key], list):
                # Merge lists, avoiding duplicates
                merged[key] = list(set(merged[key] + value))
            elif isinstance(value, dict) and key in merged and isinstance(merged[key], dict):
                # Merge dictionaries
                merged[key].update(value)
            else:
                # Use new value if not exists or if it's more detailed
                if key not in merged or len(str(value)) > len(str(merged.get(key, ""))):
                    merged[key] = value

        return merged

    def post(self, shared, prep_res, exec_res):
        if "error" in exec_res:
            shared["pdf_graph_error"] = exec_res["error"]
            return "complete"
        else:
            shared["pdf_generated_graph"] = exec_res
            return "validate_graph"

class ProcessConversationNode(Node):
    """Process user conversation and extract knowledge updates"""
    
    def prep(self, shared):
        user_message = shared["user_message"]
        current_graph = shared.get("current_graph", {"nodes": [], "edges": []})
        pdf_graph = shared.get("pdf_generated_graph")

        # If we have a PDF-generated graph and no current graph, use PDF as base
        if pdf_graph and not current_graph.get("nodes"):
            current_graph = pdf_graph
            shared["current_graph"] = current_graph

        return user_message, current_graph
    
    def exec(self, inputs):
        user_message, current_graph = inputs
        # Show current graph context to LLM
        current_nodes = [node.get("id", "Unknown") for node in current_graph.get("nodes", [])]

        prompt = f"""
You are a knowledge graph curator for Pedro's professional profile. You have access to the current knowledge graph and need to process user updates.

Current graph contains these nodes: {', '.join(current_nodes[:10])}{'...' if len(current_nodes) > 10 else ''}

User message: "{user_message}"

Extract information about:
- Work experience (companies, roles, technologies, dates, responsibilities)
- Education (degrees, institutions, dates, descriptions)
- Skills (technical skills, tools, frameworks, proficiency levels)
- Projects (names, descriptions, technologies, years)
- Personal information (interests, languages, achievements)

IMPORTANT: Be specific and structured. For experience, include company name, role, years, technologies used, and key responsibilities.

Return your response in YAML format:
```yaml
action: add/update/remove
category: experience/education/skills/projects/personal
data:
  # For experience:
  company: "Company Name"
  role: "Job Title"
  years: "Start - End"
  technologies: ["Tech1", "Tech2"]
  responsibilities: ["Responsibility 1", "Responsibility 2"]

  # For skills:
  name: "Skill Category"
  items: ["Skill1", "Skill2", "Skill3"]

  # For education:
  institution: "Institution Name"
  degree: "Degree Name"
  years: "Start - End"
  description: "Description"

  # For projects:
  name: "Project Name"
  description: "Project description"
  technologies: ["Tech1", "Tech2"]
  year: "Year"

  # For updates/removes:
  id: "Existing Node ID"
```

Examples:
- "I worked at Google as a Software Engineer from 2020-2022 using Python and React"
- "Add my new skill in Machine Learning with TensorFlow and PyTorch"
- "Update my QI Tech experience to include Apache Kafka"
- "Remove the old internship at Company X"

If no actionable information is found, return:
```yaml
action: none
message: "No specific profile updates detected. Please be more specific about what you'd like to add, update, or remove."
```
"""

        response = call_llm(prompt)
        try:
            yaml_str = response.split("```yaml")[1].split("```")[0].strip()
            return yaml.safe_load(yaml_str)
        except (IndexError, yaml.YAMLError) as e:
            # Fallback if YAML parsing fails
            return {
                "action": "none",
                "message": f"Could not parse the response. Please try rephrasing your request."
            }
    
    def post(self, shared, prep_res, exec_res):
        shared["extracted_info"] = exec_res
        return "generate_graph"

class GenerateGraphNode(Node):
    """Generate knowledge graph from extracted information"""
    
    def prep(self, shared):
        current_graph = shared.get("current_graph", {"nodes": [], "edges": []})
        extracted_info = shared.get("extracted_info", {})
        return current_graph, extracted_info
    
    def exec(self, inputs):
        current_graph, extracted_info = inputs
        
        if extracted_info.get("action") == "none":
            return current_graph
        
        # Simple graph generation logic
        new_graph = self._update_graph(current_graph, extracted_info)
        return new_graph
    
    def _update_graph(self, graph, info):
        """Enhanced graph update logic"""
        nodes = graph.get("nodes", [])
        edges = graph.get("edges", [])

        action = info.get("action")
        category = info.get("category")
        data = info.get("data", {})

        # Ensure Pedro node exists
        self._ensure_pedro_node(nodes)

        if action == "add":
            self._handle_add_action(nodes, edges, category, data)
        elif action == "update":
            self._handle_update_action(nodes, category, data)
        elif action == "remove":
            self._handle_remove_action(nodes, edges, category, data)

        return {"nodes": nodes, "edges": edges}

    def _ensure_pedro_node(self, nodes):
        """Ensure Pedro node exists in the graph"""
        if not any(node.get("id") == "Pedro Reichow" for node in nodes):
            nodes.insert(0, {
                "id": "Pedro Reichow",
                "type": "Person",
                "contact": {
                    "email": "pedroreichow3@gmail.com",
                    "linkedin": "https://www.linkedin.com/in/pedroreichow",
                    "github": "https://github.com/pdrago97"
                }
            })

    def _handle_add_action(self, nodes, edges, category, data):
        """Handle add actions for different categories"""
        if category == "experience":
            node_id = data.get("company", "Unknown Company")
            new_node = {
                "id": node_id,
                "type": "Experience",
                "title": data.get("role", ""),
                "years": data.get("years", ""),
                "technologies": data.get("technologies", []),
                "responsibilities": data.get("responsibilities", [])
            }
            nodes.append(new_node)
            edges.append({
                "source": "Pedro Reichow",
                "target": node_id,
                "relation": "WORKED_AT"
            })

        elif category == "skills":
            skill_name = data.get("name", "New Skill")
            new_node = {
                "id": skill_name,
                "type": "Skills",
                "items": data.get("items", [])
            }
            nodes.append(new_node)
            edges.append({
                "source": "Pedro Reichow",
                "target": skill_name,
                "relation": "HAS_SKILL"
            })

        elif category == "education":
            institution = data.get("institution", "Unknown Institution")
            new_node = {
                "id": institution,
                "type": "Education",
                "degree": data.get("degree", ""),
                "years": data.get("years", ""),
                "description": data.get("description", "")
            }
            nodes.append(new_node)
            edges.append({
                "source": "Pedro Reichow",
                "target": institution,
                "relation": "STUDIED_AT"
            })

        elif category == "projects":
            project_name = data.get("name", "New Project")
            new_node = {
                "id": project_name,
                "type": "Project",
                "description": data.get("description", ""),
                "technologies": data.get("technologies", []),
                "year": data.get("year", "")
            }
            nodes.append(new_node)
            edges.append({
                "source": "Pedro Reichow",
                "target": project_name,
                "relation": "CREATED"
            })

    def _handle_update_action(self, nodes, category, data):
        """Handle update actions for existing nodes"""
        target_id = data.get("id") or data.get("name") or data.get("company") or data.get("institution")
        if target_id:
            for node in nodes:
                if node.get("id") == target_id:
                    # Update node with new data
                    for key, value in data.items():
                        if key != "id":
                            node[key] = value
                    break

    def _handle_remove_action(self, nodes, edges, category, data):
        """Handle remove actions"""
        target_id = data.get("id") or data.get("name") or data.get("company") or data.get("institution")
        if target_id:
            # Remove node
            nodes[:] = [node for node in nodes if node.get("id") != target_id]
            # Remove related edges
            edges[:] = [edge for edge in edges if edge.get("source") != target_id and edge.get("target") != target_id]
    
    def post(self, shared, prep_res, exec_res):
        shared["updated_graph"] = exec_res
        return "validate_graph"

class ValidateGraphNode(Node):
    """Validate and optimize the generated graph"""

    def prep(self, shared):
        return shared["updated_graph"]

    def exec(self, graph):
        """Validate graph structure and optimize"""
        nodes = graph.get("nodes", [])
        edges = graph.get("edges", [])

        # Remove duplicate nodes
        seen_ids = set()
        unique_nodes = []
        for node in nodes:
            node_id = node.get("id")
            if node_id and node_id not in seen_ids:
                seen_ids.add(node_id)
                unique_nodes.append(node)

        # Validate edges (ensure source and target exist)
        valid_edges = []
        for edge in edges:
            source = edge.get("source")
            target = edge.get("target")
            if source in seen_ids and target in seen_ids:
                valid_edges.append(edge)

        # Remove duplicate edges
        edge_set = set()
        unique_edges = []
        for edge in valid_edges:
            edge_key = (edge.get("source"), edge.get("target"), edge.get("relation"))
            if edge_key not in edge_set:
                edge_set.add(edge_key)
                unique_edges.append(edge)

        return {"nodes": unique_nodes, "edges": unique_edges}

    def post(self, shared, prep_res, exec_res):
        from graph_utils import save_graph_safely, merge_graph_updates, load_and_normalize_graph

        try:
            # Load current graph and merge updates
            current_graph, _, _ = load_and_normalize_graph()
            merged_graph = merge_graph_updates(current_graph, exec_res)

            # Save using safe method
            warnings = save_graph_safely(merged_graph)

            shared["final_graph"] = merged_graph

            if warnings:
                print("Graph saved with warnings:", warnings)
            else:
                print("✅ Graph saved successfully with consistency checks")

        except Exception as e:
            print(f"❌ Error saving graph: {e}")
            # Fallback to original method
            shared["final_graph"] = exec_res
            try:
                with open("../public/knowledge-graph.json", "w") as f:
                    json.dump(exec_res, f, indent=2)
            except Exception as e2:
                print(f"Fallback save also failed: {e2}")

        return "complete"

def call_llm(prompt):
    """Call OpenAI API with the given prompt"""
    from openai import OpenAI
    import os

    client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",  # Use smaller model to avoid token limits
            messages=[
                {
                    "role": "system",
                    "content": "You are a knowledge graph architect. Return valid YAML format wrapped in ```yaml code blocks."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            temperature=0.3,
            max_tokens=2000  # Reduced token limit
        )
        return response.choices[0].message.content
    except Exception as e:
        print(f"Error calling LLM: {e}")
        return f"Error: {e}"
