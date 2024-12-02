import { NextResponse } from 'next/server';
import { generateQuestion } from '@/utils/groq';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { technology, difficulty, questionNumber, questionType } = body;

    // Debug log the raw values
    console.log('Raw request values:', {
      technology: JSON.stringify(technology),
      difficulty: JSON.stringify(difficulty),
      questionNumber,
      questionType,
      technologyType: typeof technology,
      difficultyType: typeof difficulty
    });

    if (!technology || !difficulty || !questionType) {
      console.log('Missing required fields:', { technology, difficulty, questionType });
      return NextResponse.json(
        { error: 'Technology, difficulty, and question type are required' },
        { status: 400 }
      );
    }

    // Validate and clean inputs
    const cleanTechnology = decodeURIComponent(technology.trim());
    const cleanDifficulty = difficulty.trim().toLowerCase();

    console.log('Cleaned values:', {
      technology: cleanTechnology,
      difficulty: cleanDifficulty
    });

    console.log('Generating question with params:', {
      technology: cleanTechnology,
      difficulty: cleanDifficulty,
      questionNumber,
      questionType
    });
    
    try {
      const question = await generateQuestion(cleanTechnology, cleanDifficulty, questionNumber, questionType);
      
      console.log('Successfully generated question:', {
        hasQuestion: !!question?.question,
        topics: question?.expectedTopics,
        type: questionType
      });
      
      if (!question || typeof question !== 'object') {
        console.error('Invalid question response:', question);
        throw new Error('Invalid question format received');
      }

      return NextResponse.json(question);
    } catch (error) {
      console.error('Error in question generation:', error);
      
      // Check if it's a rate limit error
      if (error instanceof Error && error.message.includes('rate limit')) {
        return NextResponse.json(
          { error: 'Rate limit exceeded. Please wait a moment before trying again.' },
          { status: 429 }
        );
      }
      
      throw error; // Re-throw other errors
    }
  } catch (error) {
    console.error('Error in route handler:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate question' },
      { status: 500 }
    );
  }
}
