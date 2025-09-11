# 🚀 Unified Graph Curation Pipeline

A streamlined, step-by-step interface for transforming documents into precise knowledge graphs through AI-powered extraction and conversational curation.

## 🎯 Overview

The Unified Pipeline consolidates all graph generation tools into one cohesive workflow:

**Document Upload** → **AI Extraction** → **Conversational Curation** → **Conflict Resolution** → **Preview & Apply**

### Key Benefits

- **🎯 Precision**: Step-by-step validation ensures accurate graph representation
- **🧹 Clean Process**: Eliminates messy/duplicate code through unified workflow  
- **💬 Natural Interaction**: Conversational agent guides refinement process
- **🔧 Smart Merging**: Automatic conflict detection and resolution
- **👁️ Preview System**: Review all changes before applying
- **📊 Quality Assurance**: Validation and backup at every step

## 🚀 Quick Start

### 1. Launch the Pipeline

```bash
# From the admin/ directory
python launch_pipeline.py

# Or manually with Streamlit
streamlit run unified_graph_pipeline.py --server.port 8511
```

### 2. Follow the Guided Workflow

1. **📄 Upload Documents**: Drag & drop your resume, CV, or professional documents
2. **🔍 AI Extraction**: Review AI-extracted entities and relationships  
3. **💬 Conversational Curation**: Chat with AI to refine and enhance data
4. **🔧 Conflict Resolution**: Resolve overlaps with existing graph
5. **👁️ Preview & Apply**: Review changes and apply to knowledge graph

## 📋 Prerequisites

### Required Dependencies
```bash
pip install streamlit langextract PyPDF2 openai
```

### Environment Setup
```bash
export OPENAI_API_KEY="your-api-key-here"
```

### File Structure
```
admin/
├── unified_graph_pipeline.py      # Main pipeline interface
├── pipeline_utils.py              # Conflict detection & merging
├── conversational_agent.py        # AI curation agent
├── launch_pipeline.py             # Easy launcher
└── README_UNIFIED_PIPELINE.md     # This file

public/
└── knowledge-graph.json           # Target graph file
```

## 🔧 Pipeline Stages

### Stage 1: Document Upload
- **Supported Formats**: PDF, DOCX, TXT
- **Multi-file Support**: Process multiple documents simultaneously
- **Preview**: See file details before processing

### Stage 2: AI Extraction
- **LangExtract Integration**: Sophisticated entity/relation extraction
- **Entity Types**: Person, Experience, Education, Project, Skill, etc.
- **Confidence Scoring**: Review extraction quality
- **Preview Results**: See extracted entities before curation

### Stage 3: Conversational Curation
- **Intelligent Agent**: Context-aware AI assistant
- **Natural Language**: "Add my experience at Company X"
- **Guided Questions**: Agent asks clarifying questions
- **Real-time Updates**: Graph updates as conversation progresses

### Stage 4: Conflict Resolution
- **Duplicate Detection**: Find overlapping entities
- **Similarity Matching**: Fuzzy matching for similar items
- **Merge Suggestions**: Smart recommendations for conflicts
- **User Control**: Final decision on all merges

### Stage 5: Preview & Apply
- **Visual Diff**: See before/after comparison
- **Validation**: Ensure graph structure integrity
- **Backup Creation**: Automatic backup before changes
- **One-click Apply**: Safe application of all changes

## 🤖 Conversational Agent Features

### Intent Recognition
- **Add Information**: "I also worked at Company Y"
- **Modify Existing**: "Change my title at Company X"
- **Ask Questions**: "What skills do I have listed?"
- **Request Suggestions**: "What should I add to my profile?"

### Smart Responses
- **Context Awareness**: Knows current graph state
- **Follow-up Questions**: Asks for missing details
- **Entity Extraction**: Identifies companies, technologies, dates
- **Validation**: Ensures data completeness

### Example Conversations
```
User: "I also worked at MoveUp AI as a Founding Engineer"
Agent: "Great! I'll add MoveUp AI to your experience. Can you tell me more about your role, responsibilities, and the time period?"

User: "I used Python and FastAPI to build microservices"
Agent: "I'll add Python and FastAPI to your skills. What's your proficiency level with these technologies?"
```

## 🔧 Conflict Resolution System

### Detection Methods
- **Exact ID Match**: Same entity IDs
- **Fuzzy Matching**: Similar names/titles
- **Type-specific Logic**: Company names, skill names, etc.
- **Temporal Overlap**: Overlapping date ranges

### Resolution Strategies
- **Merge**: Combine complementary information
- **Replace**: Use newer/more detailed version
- **Keep Both**: Maintain separate entities
- **Skip**: Ignore new duplicate

### Smart Merging
```json
{
  "existing": {"id": "Python", "type": "Skill"},
  "new": {"id": "Python", "type": "Skill", "level": "Expert", "years": 5},
  "merged": {"id": "Python", "type": "Skill", "level": "Expert", "years": 5}
}
```

## 📊 Quality Assurance

### Validation Checks
- **Required Fields**: Ensure essential data present
- **Relationship Integrity**: Edges connect valid nodes
- **Data Types**: Validate field formats
- **Duplicate Prevention**: No duplicate IDs

### Backup System
- **Automatic Backups**: Before every change
- **Timestamped Files**: Easy recovery
- **Rollback Support**: Restore previous versions

## 🎛️ Configuration

### Pipeline Settings
```python
# In unified_graph_pipeline.py
EXTRACTION_SETTINGS = {
    "model_id": "gpt-4o-mini",
    "extraction_passes": 2,
    "max_workers": 3
}

CONFLICT_THRESHOLDS = {
    "similarity_threshold": 0.6,
    "merge_threshold": 0.8,
    "duplicate_threshold": 0.9
}
```

### Agent Configuration
```python
# In conversational_agent.py
AGENT_SETTINGS = {
    "max_follow_up_questions": 3,
    "confidence_threshold": 0.7,
    "context_window": 10  # conversation turns
}
```

## 🔍 Troubleshooting

### Common Issues

**Pipeline won't start**
- Check dependencies: `pip install -r requirements.txt`
- Verify API key: `echo $OPENAI_API_KEY`
- Run from admin/ directory

**Extraction fails**
- Check document format (PDF, DOCX, TXT only)
- Verify file isn't corrupted
- Try smaller documents first

**Conflicts not detected**
- Check similarity thresholds in config
- Verify node IDs and types
- Review existing graph structure

**Changes not applied**
- Check validation errors
- Verify write permissions
- Review backup creation

### Debug Mode
```bash
# Enable debug logging
export STREAMLIT_LOGGER_LEVEL=debug
streamlit run unified_graph_pipeline.py --logger.level=debug
```

## 🚀 Next Steps

After using the pipeline:

1. **Review Results**: Check updated graph in main application
2. **Iterate**: Run additional cycles with new documents
3. **Fine-tune**: Use manual editors for detailed adjustments
4. **Export**: Generate ontology formats (JSON-LD, RDF)
5. **Deploy**: Update production knowledge graph

## 🤝 Integration

### With Existing Tools
- **Chat Curation v2**: Fallback for complex conversations
- **Manual Editors**: Fine-tuning after pipeline
- **LangExtract POC**: Advanced extraction options
- **GraphDB**: Export to SPARQL endpoints

### API Integration
```python
# Programmatic pipeline usage
from unified_graph_pipeline import PipelineState
from pipeline_utils import detect_node_conflicts

state = PipelineState()
# ... process documents
conflicts = detect_node_conflicts(existing_graph, new_graph)
```

## 📈 Performance

### Benchmarks
- **Small Resume** (1-2 pages): ~30 seconds
- **Detailed CV** (5+ pages): ~2 minutes  
- **Multiple Documents**: ~1 minute per document
- **Conflict Resolution**: ~10 seconds per conflict

### Optimization Tips
- Use smaller extraction passes for speed
- Process documents individually for large batches
- Pre-clean documents for better extraction
- Use specific prompts for domain expertise

---

## 🎉 Success!

You now have a unified, precise pipeline for transforming documents into high-quality knowledge graphs. The conversational interface ensures accuracy while the automated systems handle the complexity.

**Happy Graph Curation! 🧠✨**
