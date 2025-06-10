import os
from typing import Any, Dict

# --- Crew AI Imports ---
from crewai import LLM, Agent, Crew, Process, Task
from crewai_tools import SerperDevTool
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# --- Supabase Imports ---
from supabase import Client, create_client

# --- Environment Setup ---
load_dotenv()

# Initialize Supabase client
supabase_url = os.environ.get("SUPABASE_URL")
supabase_key = os.environ.get("SUPABASE_KEY")

if not supabase_url or not supabase_key:
    raise ValueError("Missing Supabase URL or Key in environment variables")

supabase: Client = create_client(supabase_url, supabase_key)
print("Supabase client created successfully")

# --- FastAPI App Initialization ---
app = FastAPI()

origins = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3001",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- Pydantic Models ---
class TopicRequest(BaseModel):
    topic: str


class BlogPost(BaseModel):
    """Blog post output model"""

    title: str = Field(..., description="Title of the blog post")
    introduction: str = Field(..., description="Introduction paragraph")
    main_content: str = Field(..., description="Main body content with 3-4 paragraphs")
    conclusion: str = Field(..., description="Conclusion paragraph")
    keywords: list[str] = Field(..., description="SEO keywords related to the topic")


class ContentGenerationCrew:
    """Content Generation Crew for creating blog posts"""

    def __init__(self, topic: str):
        self.topic = topic
        self.output = {}

        # Initialize tools
        self.search_tool = SerperDevTool()

        # Initialize LLM
        gemini_api_key = os.environ.get("GEMINI_API_KEY")
        if not gemini_api_key:
            raise ValueError("Missing GEMINI_API_KEY in environment variables")

        self.llm = LLM(
            model="gemini/gemini-1.5-flash",
            api_key=gemini_api_key,
            temperature=0.7,
        )

    def researcher_agent(self) -> Agent:
        return Agent(
            role="Senior Research Analyst",
            goal=f"Conduct comprehensive research about {self.topic}",
            backstory="""You are a world-class research analyst with expertise in 
            identifying emerging trends and breakthrough technologies. You excel at 
            finding reliable sources and synthesizing complex information into 
            clear, actionable insights.""",
            tools=[self.search_tool],
            llm=self.llm,
            verbose=True,
            max_iter=3,
            allow_delegation=False,
        )

    def writer_agent(self) -> Agent:
        return Agent(
            role="Content Writer",
            goal=f"Create engaging and informative content about {self.topic}",
            backstory="""You are a skilled content writer who specializes in making 
            complex topics accessible to general audiences. You have a talent for 
            creating compelling narratives that both educate and entertain readers.""",
            llm=self.llm,
            verbose=True,
            max_iter=3,
            allow_delegation=False,
        )

    def editor_agent(self) -> Agent:
        return Agent(
            role="Senior Editor",
            goal=f"Polish and perfect the content about {self.topic}",
            backstory="""You are a meticulous editor with years of experience in 
            digital publishing. You have an eagle eye for grammar, style, and flow, 
            ensuring every piece of content is polished to perfection.""",
            llm=self.llm,
            verbose=True,
            max_iter=3,
            allow_delegation=False,
        )

    def research_task(self) -> Task:
        return Task(
            description=f"""Research comprehensive information about {self.topic}.
            Focus on:
            1. Latest developments and trends
            2. Key players and technologies
            3. Real-world applications and impact
            4. Future prospects and challenges
            
            Provide a detailed research summary with specific examples and data points.""",
            expected_output="A comprehensive research report with key findings, statistics, and examples",
            agent=self.researcher_agent(),
        )

    def writing_task(self) -> Task:
        return Task(
            description=f"""Using the research provided, write an engaging blog post about {self.topic}.
            
            Structure:
            1. Catchy title that captures attention
            2. Engaging introduction that hooks the reader
            3. 3-4 detailed body paragraphs covering different aspects
            4. Forward-looking conclusion
            5. Include relevant keywords for SEO
            
            Make it informative yet accessible to a general audience.""",
            expected_output="A complete blog post with all required sections",
            agent=self.writer_agent(),
            context=[self.research_task()],
            output_json=BlogPost,
        )

    def editing_task(self) -> Task:
        return Task(
            description="""Review and polish the blog post to perfection.
            
            Focus on:
            1. Grammar and spelling corrections
            2. Improving clarity and flow
            3. Ensuring consistent tone and style
            4. Verifying factual accuracy
            5. Optimizing for readability
            
            Deliver the final polished version.""",
            expected_output="A professionally edited blog post ready for publication",
            agent=self.editor_agent(),
            context=[self.writing_task()],
        )

    def kickoff(self) -> Dict[str, Any]:
        """Execute the crew tasks"""
        crew = Crew(
            agents=[
                self.researcher_agent(),
                self.writer_agent(),
                self.editor_agent(),
            ],
            tasks=[
                self.research_task(),
                self.writing_task(),
                self.editing_task(),
            ],
            process=Process.sequential,
            verbose=True,
        )

        result = crew.kickoff(inputs={"topic": self.topic})
        return result


# --- FastAPI Endpoints ---


@app.get("/")
async def root():
    return {"message": "CrewAI Content Generation API", "status": "active"}


@app.get("/health")
async def health_check():
    health_status = {"status": "healthy", "services": {}}

    try:
        # Test Supabase connection
        supabase.table("content_generations").select("count").limit(1).execute()
        health_status["services"]["supabase"] = "connected"
    except Exception as e:
        health_status["services"]["supabase"] = f"error: {str(e)}"
        health_status["status"] = "degraded"

    # Check environment variables
    health_status["services"]["gemini_api_key"] = (
        "configured" if os.environ.get("GEMINI_API_KEY") else "missing"
    )

    return health_status


@app.post("/api/generate-content")
async def generate_content(request: TopicRequest):
    topic = request.topic

    try:
        print(f"\n{'='*60}")
        print(f"Starting content generation for topic: {topic}")
        print(f"{'='*60}\n")

        # Create and execute the crew
        content_crew = ContentGenerationCrew(topic=topic)
        result = content_crew.kickoff()

        # Extract the final output
        if hasattr(result, "raw"):
            content = result.raw
        elif hasattr(result, "output"):
            content = result.output
        else:
            content = str(result)

        print(f"\nContent generation complete. Length: {len(str(content))} characters")

        # Parse the content if it's a BlogPost object
        if isinstance(content, dict) and "title" in content:
            formatted_content = f"""# {content.get('title', 'Untitled')}

{content.get('introduction', '')}

{content.get('main_content', '')}

{content.get('conclusion', '')}

**Keywords:** {', '.join(content.get('keywords', []))}"""
            content = formatted_content

        # Save to Supabase
        try:
            response = (
                supabase.table("content_generations")
                .insert(
                    {
                        "topic": topic,
                        "content": str(content)[:65000],  # Limit to prevent DB errors
                    }
                )
                .execute()
            )
            save_status = "saved"
            print("Content saved to Supabase successfully")
        except Exception as db_error:
            print(f"Supabase save error: {db_error}")
            save_status = f"not saved: {str(db_error)}"

        return {
            "status": "success",
            "topic": topic,
            "content": str(content),
            "save_status": save_status,
            "timestamp": (
                str(result.created_at) if hasattr(result, "created_at") else None
            ),
        }

    except Exception as e:
        print(f"Error in content generation: {e}")
        import traceback

        traceback.print_exc()
        raise HTTPException(
            status_code=500, detail=f"Content generation failed: {str(e)}"
        )


@app.get("/api/content")
async def list_content(limit: int = 10):
    """List recent generated content"""
    try:
        response = (
            supabase.table("content_generations")
            .select("*")
            .order("created_at", desc=True)
            .limit(limit)
            .execute()
        )
        return {
            "status": "success",
            "count": len(response.data),
            "data": response.data,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/content/{content_id}")
async def delete_content(content_id: int):
    """Delete a specific content entry"""
    try:
        response = (
            supabase.table("content_generations")
            .delete()
            .eq("id", content_id)
            .execute()
        )
        return {"status": "success", "message": "Content deleted"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
