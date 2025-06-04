import { NextRequest, NextResponse } from "next/server";
import Groq, { APIError } from "groq-sdk"; // Import APIError

// Ensure you have your Groq API key set in your environment variables
// Create a .env.local file in the root of your project and add:
// GROQ_API_KEY=your_actual_groq_api_key

const groqApiKey = process.env.GROQ_API_KEY;

if (!groqApiKey) {
  console.warn(
    "GROQ_API_KEY is not set. Transcription will fail. Please set it in your .env.local file."
  );
}

// Initialize Groq client only if API key is available
const groq = groqApiKey ? new Groq({ apiKey: groqApiKey }) : null;

export async function POST(request: NextRequest) {
  if (!groq) {
    return NextResponse.json(
      {
        error:
          "Groq API key not configured on the server or client not initialized.",
      },
      { status: 500 }
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const model = (formData.get("model") as string) || "whisper-large-v3-turbo"; // Default model

    if (!file) {
      return NextResponse.json({ error: "No file provided." }, { status: 400 });
    }

    console.log(
      `Received file: ${file.name}, size: ${file.size}, type: ${file.type}. Using model: ${model}`
    );

    const transcription = await groq.audio.transcriptions.create({
      file: file,
      model: model,
      response_format: "json",
    });

    console.log("Transcription successful:", transcription);

    return NextResponse.json({ transcriptionText: transcription.text });
  } catch (error: unknown) {
    console.error("Error during transcription:", error);

    let errorMessage = "Failed to transcribe audio.";
    let statusCode = 500;

    if (error instanceof APIError) {
      // This handles errors specifically from the Groq/OpenAI SDK
      errorMessage = `Groq API Error: ${error.message}`;
      if (error.status) {
        statusCode = error.status; // Use status code from API error
        errorMessage = `Groq API Error (${error.status}): ${error.message}`;
      }
      // You can also access error.type, error.code, error.param if needed
      // For example: if (error.code === 'invalid_api_key') { ... }
    } else if (error instanceof Error) {
      // Handle other generic JavaScript errors
      errorMessage = error.message;
    } else if (typeof error === "string") {
      // Handle cases where a string is thrown (less common)
      errorMessage = error;
    }
    // For truly unknown or non-Error objects, the default message and status 500 will be used.

    return NextResponse.json({ error: errorMessage }, { status: statusCode });
  }
}
