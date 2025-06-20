# 📚 WaveToTxt Persistent History Setup Guide

## Overview

The WaveToTxt application now includes persistent history functionality that stores all transcriptions, summaries, and chat conversations in a Supabase database. Users can access their complete transcription history, view detailed information, and manage their data.

## 🗄️ Features

### ✅ What Gets Saved

- **Transcriptions**: Full transcript text, utterances, metadata (file size, duration, engine used)
- **Summaries**: AI-generated summaries with timestamps
- **Chat History**: Complete Q&A conversations with RAG sources
- **Metadata**: File names, creation dates, transcription engines, speaker diarization status

### ✅ What's NOT Saved

- **Audio files**: Only transcripts are stored for privacy and storage efficiency
- **Temporary files**: Original uploads are processed and removed

## 🛠️ Setup Instructions

### 1. Supabase Database Setup

#### Create Tables

Run the following SQL in your Supabase SQL editor (`database_schema.sql`):

```sql
-- Create transcriptions table
CREATE TABLE IF NOT EXISTS transcriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  original_filename TEXT,
  file_size BIGINT,
  duration_seconds INTEGER,
  transcription_engine TEXT NOT NULL, -- 'groq' or 'assemblyai'
  has_diarization BOOLEAN DEFAULT FALSE,
  transcript_text TEXT NOT NULL,
  utterances JSONB, -- Store structured transcript with speakers/timestamps
  status TEXT DEFAULT 'completed',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create summaries table
CREATE TABLE IF NOT EXISTS summaries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  transcription_id UUID REFERENCES transcriptions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  summary_text TEXT NOT NULL,
  summary_type TEXT DEFAULT 'ai_generated',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create chat_sessions table
CREATE TABLE IF NOT EXISTS chat_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  transcription_id UUID REFERENCES transcriptions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create chat_messages table
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  chat_session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  message_type TEXT NOT NULL, -- 'user' or 'assistant'
  content TEXT NOT NULL,
  sources JSONB, -- Store RAG sources for assistant messages
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE transcriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (users can only see their own data)
CREATE POLICY "Users can manage own transcriptions" ON transcriptions
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own summaries" ON summaries
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own chat sessions" ON chat_sessions
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own chat messages" ON chat_messages
  FOR ALL USING (auth.uid() = user_id);
```

#### Create Indexes

```sql
-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_transcriptions_user_id ON transcriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_transcriptions_created_at ON transcriptions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_summaries_transcription_id ON summaries(transcription_id);
CREATE INDEX IF NOT EXISTS idx_summaries_user_id ON summaries(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_transcription_id ON chat_sessions(transcription_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON chat_messages(chat_session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at);
```

### 2. Environment Configuration

#### Backend Environment Variables

Add these to your `.env` file:

```bash
# Supabase Database Configuration (for backend persistence)
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
SUPABASE_JWT_SECRET=your-jwt-secret-here
```

**Important**:

- Use the **Service Role Key** for backend operations (not the anon key)
- Find your JWT Secret in Supabase Dashboard → Settings → API → JWT Settings

#### Frontend Environment Variables

Already configured if you have authentication setup:

```bash
VITE_SUPABASE_URL=your_supabase_project_url_here
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

### 3. Dependency Installation

The required dependencies are already added to `pyproject.toml`:

- `supabase>=2.4.3` - Python Supabase client
- `pyjwt>=2.8.0` - JWT token verification

Install dependencies:

```bash
cd backend
uv sync
```

## 🎯 User Interface

### History Navigation

- **History Button**: Access via the header navigation
- **Transcribe Button**: Return to main transcription interface

### History Page Features

- **Transcription List**: Shows all user's transcriptions with metadata
- **Search & Filter**: Browse transcriptions by date, engine, features
- **Quick Actions**: View details or delete transcriptions
- **Status Badges**: Indicates if summary or chat history exists

### Detailed View

- **Full Transcript**: Complete transcription with speaker identification
- **Summary Tab**: AI-generated summary (if available)
- **Chat History Tab**: Complete Q&A conversation history
- **Download Options**: Export transcript and summary as text files
- **Metadata Display**: File info, duration, engine used, creation date

## 🔄 Automatic Data Saving

### When Data is Saved

1. **Transcription Complete**: Automatically saved when transcription finishes
2. **Summary Generated**: Saved when AI summary completes
3. **Chat Messages**: Saved in real-time during conversations

### Data Privacy

- **Row Level Security**: Users can only access their own data
- **No Audio Storage**: Only transcripts saved, audio files processed and removed
- **Secure Authentication**: JWT token validation for all database operations

## 🗑️ Data Management

### User Controls

- **Delete Transcriptions**: Remove transcription and all related data (summary + chat)
- **View History**: Access complete historical data
- **Export Data**: Download transcripts and summaries

### Cascading Deletes

When a transcription is deleted:

1. Associated summary is deleted
2. Associated chat sessions are deleted
3. All chat messages are deleted
4. User cannot accidentally orphan data

## 🚀 API Endpoints

### Backend Routes

- `POST /api/history/transcriptions` - Save transcription
- `POST /api/history/summaries` - Save summary
- `POST /api/history/chat-sessions` - Create chat session
- `POST /api/history/chat-messages` - Save chat message
- `GET /api/history/transcriptions` - Get user's transcriptions
- `GET /api/history/transcriptions/{id}` - Get detailed transcription
- `DELETE /api/history/transcriptions/{id}` - Delete transcription

### Authentication

All history API endpoints require:

- Valid JWT token in `Authorization: Bearer <token>` header
- User ID extracted from token for data isolation

## 🔧 Development Notes

### Database Schema Design

- **UUIDs**: Primary keys use UUIDs for security
- **Foreign Keys**: Proper relationships with CASCADE deletes
- **JSONB**: Structured data (utterances, sources) stored efficiently
- **Timestamps**: Automatic created_at/updated_at tracking

### Error Handling

- **Non-Critical**: History saving failures don't interrupt user experience
- **Graceful Degradation**: App works even if history service is down
- **User Feedback**: Clear error messages for user-facing operations

### Performance Optimizations

- **Indexes**: Strategic indexes for common queries
- **Pagination**: Ready for large datasets (can be added later)
- **Efficient Queries**: Single queries with joins to minimize database calls

## 🧪 Testing

### Manual Testing

1. **Complete Transcription Flow**: Upload → Transcribe → Verify history saved
2. **Generate Summary**: Create summary → Verify saved to history
3. **Chat Functionality**: Have conversation → Verify messages saved
4. **History Navigation**: View history → Check all data displays correctly
5. **Delete Operations**: Delete transcription → Verify all data removed

### Database Verification

```sql
-- Check user's transcriptions
SELECT * FROM transcriptions WHERE user_id = 'your-user-id';

-- Check data relationships
SELECT
  t.title,
  COUNT(DISTINCT s.id) as summary_count,
  COUNT(DISTINCT cs.id) as chat_session_count,
  COUNT(DISTINCT cm.id) as message_count
FROM transcriptions t
LEFT JOIN summaries s ON t.id = s.transcription_id
LEFT JOIN chat_sessions cs ON t.id = cs.transcription_id
LEFT JOIN chat_messages cm ON cs.id = cm.chat_session_id
WHERE t.user_id = 'your-user-id'
GROUP BY t.id, t.title;
```

## 🔒 Security Considerations

### Row Level Security (RLS)

- **Enabled**: All tables have RLS enabled
- **User Isolation**: Policies ensure users only see their own data
- **JWT Verification**: Backend verifies token authenticity

### Data Protection

- **No Sensitive Data**: Audio files not stored permanently
- **Minimal Storage**: Only necessary metadata preserved
- **Secure Deletion**: CASCADE deletes prevent orphaned data

### Authentication Flow

1. User authenticates with Supabase
2. Frontend gets JWT token
3. Backend verifies token and extracts user ID
4. Database operations filtered by user ID
5. RLS policies provide additional protection layer

---

✅ **Your WaveToTxt application now has full persistent history functionality!**

Users can transcribe audio, generate summaries, have conversations, and access their complete historical data through an intuitive interface.
