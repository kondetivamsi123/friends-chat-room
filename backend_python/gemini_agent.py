import google.generativeai as genai
import os
import datetime

class GeminiAgent:
    def __init__(self):
        # We assume API KEY is set in env
        self.api_key = os.getenv("GEMINI_API_KEY", "")
        if self.api_key:
            genai.configure(api_key=self.api_key)
            self.model = genai.GenerativeModel('gemini-pro')
        else:
            self.model = None

    def summarize_week(self, ledger_data):
        """
        Summarizes the weekly contributions based on the ledger.
        """
        if not self.model:
            return "Gemini API Key not configured. Please set GEMINI_API_KEY environment variable."

        # Filter for this week (mock logic, actually takes all for demo)
        prompt = f"""
        You are an AI assistant for a Startup DAO. 
        Here is the ledger of contributions for this week:
        {ledger_data}

        Please generate a professional, inspiring Weekly Summary. 
        - Highlight the Top Contributor.
        - Summarize the key categories of work done (based on 'reason').
        - End with a motivational quote for the team.
        """
        
        try:
            response = self.model.generate_content(prompt)
            return response.text
        except Exception as e:
            return f"AI Generation Failed: {str(e)}"
