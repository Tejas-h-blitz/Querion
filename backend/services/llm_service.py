import google.generativeai as genai
import os
import json
import asyncio
from typing import Dict, Any

class LLMService:
    def __init__(self):
        # Configuration is loaded dynamically on request in case env is populated later
        pass

    async def optimize_query(self, query: str, explain_plan: Dict[str, Any]) -> Dict[str, Any]:
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise ValueError("GEMINI_API_KEY environment variable is not set. Please add it to your configuration.")
            
        genai.configure(api_key=api_key, transport='rest')
        
        model = genai.GenerativeModel(
            model_name="gemini-2.5-flash",
            generation_config={"response_mime_type": "application/json"},
            system_instruction=(
                "You are a PostgreSQL performance expert. You will receive a SQL query and its EXPLAIN ANALYZE output.\n"
                "Return a JSON object with exactly these fields:\n"
                "{\n"
                '  "issues": [\n'
                '    { "type": "string", "description": "string", "severity": "low|medium|high", "node": "string", "confidence": "low|medium|high" }\n'
                "  ],\n"
                '  "optimized_query": "string — the rewritten SQL query",\n'
                '  "changes": ["string — description of each change made"],\n'
                '  "index_recommendations": [\n'
                '    { "sql": "CREATE INDEX ...", "reason": "string" }\n'
                "  ],\n"
                '  "summary": "string — one paragraph plain English explanation"\n'
                "}\n"
                "Rules:\n"
                "- Only return valid JSON. No markdown, no code fences, no preamble.\n"
                "- The optimized_query must be valid PostgreSQL SQL.\n"
                "- Be specific about which table/column each issue refers to.\n"
                "- Only recommend indexes that are clearly justified by the plan."
            )
        )
        
        prompt = (
            f"Original Query:\n{query}\n\n"
            f"EXPLAIN ANALYZE Plan Tree:\n{json.dumps(explain_plan, indent=2)}\n"
        )
        
        # Run blocking SDK call in executor to keep FastAPI async loop responsive
        loop = asyncio.get_running_loop()
        try:
            response = await loop.run_in_executor(
                None,
                lambda: model.generate_content(prompt)
            )
        except Exception as e:
            raise RuntimeError(f"Gemini API call failed: {str(e)}")
            
        if not response or not response.text:
            raise RuntimeError("Gemini API returned an empty response.")
            
        try:
            return json.loads(response.text)
        except Exception as e:
            raise RuntimeError(f"Failed to parse Gemini response as JSON: {str(e)}. Raw text: {response.text}")
