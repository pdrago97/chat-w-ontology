# PocketFlow Integration - Knowledge Graph Curation System

## Overview

This system integrates PocketFlow (100-line LLM framework) to create a dual-interface knowledge graph curation system for Pedro's professional profile.

## Architecture

### 🏗️ System Components

1. **Internal Admin Interface** (Streamlit) - `admin/`
   - Chat-based knowledge curation
   - PDF-to-graph generation
   - Manual JSON editor (Monaco-style)

2. **Public Interface** (Remix.run) - `app/`
   - Interactive knowledge graph visualization
   - Public chat interface
   - Auto-refresh capabilities

### 🔄 Data Flow

```
PDF Resume → PocketFlow Agents → Initial Graph → Conversation Enhancement → Rich Graph → Public Display
```

## Features

### Internal Admin Interface (`http://localhost:8501`)

#### 💬 Chat Curation Tab
- Conversation-based graph enhancement
- Natural language commands:
  - "Add my new role at Company X as Senior Developer using React and Node.js"
  - "Update my QI Tech experience to include Apache Kafka"
  - "Remove the old internship at Company Y"

#### 📄 PDF Generation Tab
- One-click graph generation from PDF resume
- Comprehensive extraction of experience, education, skills, projects
- Uses existing PDF vector store for rich content

#### 📝 Manual Editor Tab
- Monaco-style JSON editor
- Real-time validation
- Direct graph structure editing

### Public Interface (`http://localhost:5173`)

#### 🎯 Main Features
- Interactive Cytoscape.js graph visualization
- Node expansion with detailed information
- Auto-refresh every 30 seconds
- Manual refresh button
- Enhanced chat using both PDF content + graph data

## PocketFlow Implementation

### Core Nodes (~100 lines total)

1. **GenerateFromPDFNode** - Extracts comprehensive graph from PDF
2. **ProcessConversationNode** - Processes natural language updates
3. **GenerateGraphNode** - Updates graph structure
4. **ValidateGraphNode** - Validates and optimizes graph

### Flow Architecture

```
PDF Processing Flow:
GenerateFromPDFNode → ValidateGraphNode → Save

Conversation Flow:
ProcessConversationNode → GenerateGraphNode → ValidateGraphNode → Save
```

## Usage

### Starting the System

1. **Admin Interface:**
   ```bash
   cd admin
   python3 -m streamlit run app.py --server.port 8501
   ```

2. **Main Application:**
   ```bash
   npm run dev
   ```

### Environment Variables

```bash
OPENAI_API_KEY=your_openai_key
PORTKEY_API_KEY=your_portkey_key
```

### Example Workflows

#### Initial Setup
1. Go to admin interface → PDF Generation tab
2. Click "Generate Graph from PDF"
3. Review generated graph in Manual Editor
4. Use Chat tab to enhance with additional information

#### Ongoing Curation
1. Use Chat tab for natural language updates
2. Manual Editor for precise structural changes
3. Main app auto-refreshes to show changes

## File Structure

```
admin/
├── app.py              # Main Streamlit interface
├── nodes.py            # PocketFlow nodes (~100 lines)
├── flow.py             # PocketFlow flows
├── utils.py            # LLM wrapper
└── graph_editor.py     # Monaco editor component

app/
├── routes/
│   ├── _index.tsx      # Main interface
│   ├── api.chat.tsx    # Enhanced chat API
│   └── api.graph.tsx   # Graph refresh API
└── components/
    └── GraphComponent.tsx  # Enhanced with auto-refresh
```

## Key Benefits

✅ **Simple**: ~100 lines of PocketFlow code
✅ **Powerful**: PDF processing + conversation enhancement + manual editing
✅ **Real-time**: Auto-refresh and live updates
✅ **Flexible**: Multiple input methods (PDF, chat, manual)
✅ **Robust**: Validation, error handling, fallbacks

## Next Steps

- Test the complete workflow
- Add more sophisticated graph generation logic
- Enhance conversation processing with more context
- Add graph visualization improvements
