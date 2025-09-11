"""
Conversational Agent for Graph Curation
Intelligent agent that guides users through graph refinement via natural conversation
"""
import json
import re
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass
import openai
import os

@dataclass
class CurationContext:
    """Context for the curation conversation"""
    current_graph: Dict
    extracted_data: Dict
    conversation_history: List[Dict]
    focus_area: Optional[str] = None  # "experience", "education", "skills", etc.
    pending_changes: List[Dict] = None
    
    def __post_init__(self):
        if self.pending_changes is None:
            self.pending_changes = []

class ConversationalAgent:
    """AI agent for graph curation conversations"""
    
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv("OPENAI_API_KEY")
        if self.api_key:
            openai.api_key = self.api_key
    
    def generate_initial_questions(self, context: CurationContext) -> List[str]:
        """Generate initial questions to start the curation conversation"""
        nodes = context.extracted_data.get("nodes", [])
        
        questions = []
        
        # Analyze extracted entities
        node_types = {}
        for node in nodes:
            node_type = node.get("type", "Unknown")
            if node_type not in node_types:
                node_types[node_type] = []
            node_types[node_type].append(node)
        
        # Generate type-specific questions
        if "Person" in node_types:
            questions.append("I found your personal information. Is this accurate and complete?")
        
        if "Experience" in node_types:
            exp_count = len(node_types["Experience"])
            questions.append(f"I extracted {exp_count} work experience(s). Should we review each one for accuracy?")
        
        if "Education" in node_types:
            edu_count = len(node_types["Education"])
            questions.append(f"I found {edu_count} education record(s). Are there any missing degrees or certifications?")
        
        if "Skill" in node_types:
            skill_count = len(node_types["Skill"])
            questions.append(f"I identified {skill_count} skills. Would you like to add proficiency levels or group them by category?")
        
        if "Project" in node_types:
            proj_count = len(node_types["Project"])
            questions.append(f"I found {proj_count} project(s). Should we add more details about technologies used or outcomes achieved?")
        
        # General questions
        questions.extend([
            "What's the most important aspect of your profile that should be highlighted?",
            "Are there any recent achievements or experiences missing from the extracted data?",
            "Would you like to organize your skills or experiences in a particular way?"
        ])
        
        return questions[:5]  # Return top 5 questions
    
    def process_user_input(self, user_input: str, context: CurationContext) -> Dict[str, Any]:
        """Process user input and generate appropriate response and actions"""
        
        # Analyze user intent
        intent = self._analyze_intent(user_input)
        
        # Generate response based on intent
        if intent["type"] == "add_information":
            return self._handle_add_information(user_input, intent, context)
        elif intent["type"] == "modify_existing":
            return self._handle_modify_existing(user_input, intent, context)
        elif intent["type"] == "question_about_data":
            return self._handle_question(user_input, intent, context)
        elif intent["type"] == "request_suggestions":
            return self._handle_suggestions(user_input, intent, context)
        else:
            return self._handle_general_conversation(user_input, context)
    
    def _analyze_intent(self, user_input: str) -> Dict[str, Any]:
        """Analyze user intent from input"""
        user_input_lower = user_input.lower()
        
        # Intent patterns
        add_patterns = ["add", "include", "missing", "forgot", "also worked", "also studied"]
        modify_patterns = ["change", "update", "correct", "fix", "wrong", "should be"]
        question_patterns = ["what", "how", "why", "when", "where", "which", "tell me"]
        suggestion_patterns = ["suggest", "recommend", "what should", "help me", "ideas"]
        
        intent = {"type": "general", "confidence": 0.5, "entities": []}
        
        # Check for add intent
        if any(pattern in user_input_lower for pattern in add_patterns):
            intent["type"] = "add_information"
            intent["confidence"] = 0.8
        
        # Check for modify intent
        elif any(pattern in user_input_lower for pattern in modify_patterns):
            intent["type"] = "modify_existing"
            intent["confidence"] = 0.8
        
        # Check for question intent
        elif any(pattern in user_input_lower for pattern in question_patterns):
            intent["type"] = "question_about_data"
            intent["confidence"] = 0.7
        
        # Check for suggestion intent
        elif any(pattern in user_input_lower for pattern in suggestion_patterns):
            intent["type"] = "request_suggestions"
            intent["confidence"] = 0.7
        
        # Extract entities (simplified)
        entities = self._extract_entities(user_input)
        intent["entities"] = entities
        
        return intent
    
    def _extract_entities(self, text: str) -> List[Dict[str, str]]:
        """Extract entities from text (simplified version)"""
        entities = []
        
        # Company names (capitalized words)
        company_pattern = r'\b[A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*\b'
        companies = re.findall(company_pattern, text)
        for company in companies:
            if len(company) > 2 and company not in ["I", "The", "And", "Or", "But"]:
                entities.append({"type": "company", "value": company})
        
        # Years
        year_pattern = r'\b(19|20)\d{2}\b'
        years = re.findall(year_pattern, text)
        for year in years:
            entities.append({"type": "year", "value": year})
        
        # Technologies (common tech terms)
        tech_terms = ["python", "javascript", "react", "node", "aws", "docker", "kubernetes", 
                     "postgresql", "mongodb", "api", "rest", "graphql", "machine learning", "ai"]
        for term in tech_terms:
            if term.lower() in text.lower():
                entities.append({"type": "technology", "value": term})
        
        return entities
    
    def _handle_add_information(self, user_input: str, intent: Dict, context: CurationContext) -> Dict[str, Any]:
        """Handle requests to add new information"""
        entities = intent.get("entities", [])
        
        # Determine what type of information to add
        if any(e["type"] == "company" for e in entities):
            # Adding work experience
            companies = [e["value"] for e in entities if e["type"] == "company"]
            response = f"I see you want to add experience at {', '.join(companies)}. "
            response += "Can you tell me more about your role, responsibilities, and the time period?"
            
            suggested_changes = [{
                "action": "add_node",
                "type": "Experience",
                "data": {"id": companies[0] if companies else "New Experience", "type": "Experience"},
                "status": "pending_details"
            }]
        
        elif any(e["type"] == "technology" for e in entities):
            # Adding skills
            techs = [e["value"] for e in entities if e["type"] == "technology"]
            response = f"Great! I'll add {', '.join(techs)} to your skills. "
            response += "What's your proficiency level with these technologies?"
            
            suggested_changes = []
            for tech in techs:
                suggested_changes.append({
                    "action": "add_node",
                    "type": "Skill",
                    "data": {"id": tech, "type": "Skill", "name": tech},
                    "status": "pending_approval"
                })
        
        else:
            response = "I'd like to help you add that information. Can you be more specific about what you'd like to add? "
            response += "For example: work experience, education, skills, or projects?"
            suggested_changes = []
        
        return {
            "response": response,
            "suggested_changes": suggested_changes,
            "follow_up_questions": self._generate_follow_up_questions(intent, entities)
        }
    
    def _handle_modify_existing(self, user_input: str, intent: Dict, context: CurationContext) -> Dict[str, Any]:
        """Handle requests to modify existing information"""
        nodes = context.current_graph.get("nodes", [])
        
        # Try to identify what needs to be modified
        entities = intent.get("entities", [])
        
        response = "I understand you want to make changes. "
        
        if entities:
            # Try to match entities to existing nodes
            matching_nodes = []
            for entity in entities:
                for node in nodes:
                    if (entity["value"].lower() in str(node.get("id", "")).lower() or
                        entity["value"].lower() in str(node.get("title", "")).lower()):
                        matching_nodes.append(node)
            
            if matching_nodes:
                node = matching_nodes[0]
                response += f"I found '{node.get('id')}' in your graph. What specifically would you like to change about it?"
                
                suggested_changes = [{
                    "action": "modify_node",
                    "node_id": node.get("id"),
                    "current_data": node,
                    "status": "pending_details"
                }]
            else:
                response += "I couldn't find a specific item to modify. Can you tell me which experience, skill, or project you'd like to update?"
                suggested_changes = []
        else:
            response += "What specifically would you like to change? Please mention the company, project, or skill you want to update."
            suggested_changes = []
        
        return {
            "response": response,
            "suggested_changes": suggested_changes,
            "follow_up_questions": ["What specific changes would you like to make?"]
        }
    
    def _handle_question(self, user_input: str, intent: Dict, context: CurationContext) -> Dict[str, Any]:
        """Handle questions about the data"""
        nodes = context.current_graph.get("nodes", [])
        edges = context.current_graph.get("edges", [])
        
        # Analyze what they're asking about
        user_input_lower = user_input.lower()
        
        if "experience" in user_input_lower or "work" in user_input_lower:
            exp_nodes = [n for n in nodes if n.get("type") == "Experience"]
            response = f"You have {len(exp_nodes)} work experiences in your graph: "
            response += ", ".join([n.get("id", "Unknown") for n in exp_nodes[:5]])
            if len(exp_nodes) > 5:
                response += f" and {len(exp_nodes) - 5} more."
        
        elif "skill" in user_input_lower:
            skill_nodes = [n for n in nodes if n.get("type") == "Skill"]
            response = f"You have {len(skill_nodes)} skills listed: "
            response += ", ".join([n.get("id", "Unknown") for n in skill_nodes[:10]])
            if len(skill_nodes) > 10:
                response += f" and {len(skill_nodes) - 10} more."
        
        elif "education" in user_input_lower:
            edu_nodes = [n for n in nodes if n.get("type") == "Education"]
            response = f"You have {len(edu_nodes)} education records: "
            response += ", ".join([n.get("id", "Unknown") for n in edu_nodes])
        
        else:
            response = f"Your graph currently has {len(nodes)} entities and {len(edges)} relationships. "
            response += "You can ask me about specific experiences, skills, education, or projects."
        
        return {
            "response": response,
            "suggested_changes": [],
            "follow_up_questions": ["Would you like to add, modify, or remove anything?"]
        }
    
    def _handle_suggestions(self, user_input: str, intent: Dict, context: CurationContext) -> Dict[str, Any]:
        """Handle requests for suggestions"""
        nodes = context.current_graph.get("nodes", [])
        
        suggestions = []
        
        # Analyze current graph for improvement opportunities
        node_types = {}
        for node in nodes:
            node_type = node.get("type", "Unknown")
            node_types[node_type] = node_types.get(node_type, 0) + 1
        
        # Generate suggestions based on what's missing or could be improved
        if node_types.get("Experience", 0) < 3:
            suggestions.append("Consider adding more work experiences or internships")
        
        if node_types.get("Project", 0) < 2:
            suggestions.append("Add personal or professional projects to showcase your skills")
        
        if node_types.get("Skill", 0) < 10:
            suggestions.append("List more technical skills, tools, and frameworks you've used")
        
        # Check for missing relationships
        edges = context.current_graph.get("edges", [])
        if len(edges) < len(nodes) * 0.5:
            suggestions.append("Add more relationships between your experiences, skills, and projects")
        
        response = "Here are some suggestions to enhance your profile:\n"
        response += "\n".join([f"• {s}" for s in suggestions[:5]])
        
        return {
            "response": response,
            "suggested_changes": [],
            "follow_up_questions": ["Which of these areas would you like to work on first?"]
        }
    
    def _handle_general_conversation(self, user_input: str, context: CurationContext) -> Dict[str, Any]:
        """Handle general conversation"""
        response = "I'm here to help you curate your knowledge graph. "
        response += "You can ask me to add information, modify existing data, or get suggestions for improvements. "
        response += "What would you like to work on?"
        
        return {
            "response": response,
            "suggested_changes": [],
            "follow_up_questions": self.generate_initial_questions(context)[:3]
        }
    
    def _generate_follow_up_questions(self, intent: Dict, entities: List[Dict]) -> List[str]:
        """Generate relevant follow-up questions"""
        questions = []
        
        if intent["type"] == "add_information":
            if any(e["type"] == "company" for e in entities):
                questions.extend([
                    "What was your job title at this company?",
                    "What were your main responsibilities?",
                    "What technologies did you use?",
                    "When did you work there?"
                ])
            elif any(e["type"] == "technology" for e in entities):
                questions.extend([
                    "How would you rate your proficiency with this technology?",
                    "In which projects did you use this skill?",
                    "How many years of experience do you have with it?"
                ])
        
        return questions[:3]  # Return top 3 questions
