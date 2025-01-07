import { PDFLoader } from 'langchain/document_loaders/fs/pdf';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { OpenAIEmbeddings } from 'langchain/embeddings/openai';
import { MemoryVectorStore } from "langchain/vectorstores/memory";

let vectorStore: MemoryVectorStore | null = null;

export async function initializeVectorStore() {
  console.log('Starting vector store initialization...');
  if (vectorStore) {
    console.log('Returning existing vector store');
    return vectorStore;
  }

  try {
    console.log('Loading PDF document...');
    const loader = new PDFLoader('public/assets/resume.pdf');
    const docs = await loader.load();
    console.log('PDF loaded successfully:', docs.length, 'pages');
    console.log('First page content sample:', docs[0].pageContent.substring(0, 200));

    console.log('Initializing text splitter...');
    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });

    console.log('Splitting documents...');
    const splitDocs = await textSplitter.splitDocuments(docs);
    console.log('Documents split into', splitDocs.length, 'chunks');
    console.log('Sample chunk:', splitDocs[0].pageContent.substring(0, 200));
    
    console.log('Creating vector store with OpenAI embeddings...');
    vectorStore = await MemoryVectorStore.fromDocuments(
      splitDocs,
      new OpenAIEmbeddings({
        openAIApiKey: process.env.OPENAI_API_KEY,
      })
    );
    console.log('Vector store created successfully');

    return vectorStore;
  } catch (error) {
    console.error('Error in initializeVectorStore:', error);
    throw error;
  }
}

export async function queryVectorStore(query: string) {
  console.log('Starting vector store query:', query);
  try {
    const store = await initializeVectorStore();
    console.log('Vector store initialized for query');

    console.log('Performing similarity search...');
    const results = await store.similaritySearch(query, 3);
    console.log('Search results:', results.length, 'documents found');
    console.log('Results:', results.map(doc => doc.pageContent.substring(0, 100)));

    const combinedResults = results.map(doc => doc.pageContent).join('\n');
    console.log('Combined results length:', combinedResults.length);
    
    return combinedResults;
  } catch (error) {
    console.error('Error in queryVectorStore:', error);
    throw error;
  }
}