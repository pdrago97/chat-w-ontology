# Simple LLM wrapper for PocketFlow
import os
from openai import OpenAI

def call_llm(prompt):
    """Simple LLM wrapper using OpenAI API"""
    client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.3,
        max_tokens=1000
    )
    return response.choices[0].message.content

if __name__ == "__main__":
    # Test the LLM wrapper
    test_prompt = "Hello, how are you?"
    print(call_llm(test_prompt))
