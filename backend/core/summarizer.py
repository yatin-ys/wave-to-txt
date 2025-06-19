from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.prompts import ChatPromptTemplate
from langchain.schema.output_parser import StrOutputParser
from backend.core.config import settings


def generate_summary(text_to_summarize: str, is_diarized: bool = False) -> str:
    """
    Generates a summary for the given text using the Google Gemini API.
    Selects a prompt based on whether speaker diarization is enabled.
    """
    if not settings.GOOGLE_API_KEY:
        raise ValueError("Google API key is not configured.")

    llm = ChatGoogleGenerativeAI(
        model="gemini-2.5-flash", google_api_key=settings.GOOGLE_API_KEY
    )

    if is_diarized:
        prompt_template = (
            "Summarize the following transcript, which includes speaker labels. "
            "Provide a concise summary of the key points, decisions, and action items. "
            "Pay close attention to who said what and attribute points to the correct speakers. "
            "Do not include any introductory or concluding remarks, just the summary itself:\n\n{text}"
        )
    else:
        prompt_template = (
            "Summarize the following transcript. Provide a concise summary of the key points and topics discussed. "
            "Do not include any introductory or concluding remarks, just the summary itself:\n\n{text}"
        )

    prompt = ChatPromptTemplate.from_template(prompt_template)

    chain = prompt | llm | StrOutputParser()

    summary = chain.invoke({"text": text_to_summarize})
    return summary
