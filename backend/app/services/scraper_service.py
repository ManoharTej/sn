import re
import httpx
from bs4 import BeautifulSoup
from youtube_transcript_api import YouTubeTranscriptApi
from app.models.content import ContentSource, Chunk, Topic, ProcessingStatus, SourceType
from app.db.session import AsyncSessionLocal
from sqlalchemy import select
from datetime import datetime, timezone

def is_youtube_url(url: str) -> bool:
    return "youtube.com" in url or "youtu.be" in url

def extract_video_id(url: str) -> str:
    if "youtu.be" in url:
        return url.split("/")[-1].split("?")[0]
    if "youtube.com" in url:
        match = re.search(r"v=([^&]+)", url)
        if match:
            return match.group(1)
    return ""

async def scrape_webpage(url: str) -> str:
    async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
        resp = await client.get(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'})
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, 'html.parser')
        
        for script in soup(["script", "style", "nav", "footer", "header"]):
            script.extract()
            
        text = soup.get_text(separator=' ', strip=True)
        text = re.sub(r'\s+', ' ', text)
        return text

def scrape_youtube(url: str) -> str:
    vid = extract_video_id(url)
    if not vid:
        raise ValueError("Invalid YouTube URL")
    
    try:
        # Check API version availability
        if hasattr(YouTubeTranscriptApi, 'list_transcripts'):
            transcript_list = YouTubeTranscriptApi.list_transcripts(vid)
        elif hasattr(YouTubeTranscriptApi, 'get_transcript'):
            data = YouTubeTranscriptApi.get_transcript(vid, languages=['en'])
            return " ".join([t['text'] for t in data])
        else:
            api = YouTubeTranscriptApi()
            transcript_list = api.list(vid)
            
        try:
            transcript = transcript_list.find_manually_created_transcript(['en'])
        except Exception:
            transcript = transcript_list.find_generated_transcript(['en'])
            
        data = transcript.fetch()
        # Handle both old dict format (0.6.x) and new object format (1.2.x)
        text = " ".join([t['text'] if isinstance(t, dict) else t.text for t in data])
        return text
    except Exception as e:
        raise ValueError(f"YouTube transcript error: {str(e)}")

async def ingest_url_bg(source_id: int, url: str):
    async with AsyncSessionLocal() as db:
        source = await db.get(ContentSource, source_id)
        if not source:
            return

        try:
            source.status = ProcessingStatus.processing
            await db.commit()

            if is_youtube_url(url):
                text = scrape_youtube(url)
            else:
                text = await scrape_webpage(url)

            if not text or len(text.strip()) < 50:
                raise ValueError("Could not extract meaningful text from this source.")

            # Create default topic
            topic = Topic(name="Internet/YouTube Source", content_source_id=source.id, user_id=source.user_id)
            db.add(topic)
            await db.flush()

            # Chunk the text (approx 800 words per chunk for better RAG)
            words = text.split()
            chunk_size = 800
            chunks = []
            for i in range(0, len(words), chunk_size):
                chunk_text = " ".join(words[i:i + chunk_size])
                chunks.append(
                    Chunk(
                        content_source_id=source.id,
                        topic_id=topic.id,
                        chunk_index=len(chunks),
                        text=chunk_text
                    )
                )

            db.add_all(chunks)
            source.total_chunks = len(chunks)
            source.status = ProcessingStatus.completed
            source.processed_at = datetime.now(timezone.utc)
            await db.commit()

            # Auto-generate questions
            from app.api.routes.questions import _generate_and_store
            await _generate_and_store(source.id, max_per_chunk=3, user_id=source.user_id)

        except Exception as e:
            source.status = ProcessingStatus.failed
            source.error_message = str(e)
            await db.commit()


async def search_and_learn_bg(topic: str, user_id: int, max_results: int = 3):
    """
    Find relevant URLs for a topic using LLM and ingest them.
    This is the 'Automatic Internet Learning' feature.
    """
    from app.services.mcq_service import get_llm_client, MCQ_SYSTEM_PROMPT
    
    # 1. Ask LLM for relevant high-quality URLs
    prompt = f"""I want to learn about '{topic}' in ServiceNow. 
    Find 3-5 high-quality, public documentation URLs that cover this topic deeply.
    CRITICAL: You MUST prioritize links from exactly these two domains:
    1. docs.servicenow.com
    2. developer.servicenow.com
    
    Return ONLY a JSON array of strings (the URLs). No other text.
    Example: ["https://docs.servicenow.com/...", "https://developer.servicenow.com/..."]
    """
    
    client, provider = get_llm_client()
    try:
        if provider == "groq":
            from app.services.mcq_service import _call_groq
            raw = _call_groq(client, prompt, MCQ_SYSTEM_PROMPT)
        elif provider == "gemini":
            from app.services.mcq_service import _call_gemini
            raw = _call_gemini(client, prompt, MCQ_SYSTEM_PROMPT)
        else:
            return

        import json
        # Extract JSON array
        match = re.search(r"(\[.*\])", raw, re.DOTALL)
        if not match:
            return
        urls = json.loads(match.group(1))
        
        # 2. Ingest each URL
        from app.models.content import SourceType
        async with AsyncSessionLocal() as db:
            for url in urls[:max_results]:
                # Check if already exists to avoid duplicates
                existing = await db.execute(select(ContentSource).where(ContentSource.filename == url))
                if existing.scalar_one_or_none():
                    continue

                source = ContentSource(
                    user_id=user_id,
                    title=f"Auto-learned: {topic}",
                    filename=url,
                    file_path="url",
                    source_type=SourceType.search,
                    status=ProcessingStatus.pending,
                )
                db.add(source)
                await db.commit()
                await db.refresh(source)
                
                # Run ingestion for this specific URL
                await ingest_url_bg(source.id, url)
                
    except Exception as e:
        print(f"Search & Learn failed: {e}")
