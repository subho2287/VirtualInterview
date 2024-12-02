import { analyzeResponse } from '@/utils/groq';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { question, response, expectedTopics, questionType, correctOption, explanation } = body;

    console.log('Analyze API received:', {
      questionType,
      expectedTopics,
      responseLength: response?.length,
      hasCorrectOption: !!correctOption
    });

    if (!question || !response || !expectedTopics || !questionType) {
      console.error('Missing required fields:', { question: !!question, response: !!response, expectedTopics: !!expectedTopics, questionType: !!questionType });
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // For MCQ questions, directly compare with correct answer
    if (questionType.toLowerCase() === 'mcq') {
      if (!correctOption) {
        console.error('Missing correct option for MCQ');
        return NextResponse.json(
          { error: 'Missing correct option for MCQ' },
          { status: 400 }
        );
      }

      const isCorrect = response.toUpperCase() === correctOption.toUpperCase();
      const mcqAnalysis = {
        score: isCorrect ? 10 : 0, // 10 points for correct, 0 for wrong
        feedback: isCorrect 
          ? `Correct! ${explanation || ''}`
          : `Incorrect. The correct answer is ${correctOption}. ${explanation || ''}`,
        coveredTopics: isCorrect ? expectedTopics : [],
        missingTopics: isCorrect ? [] : expectedTopics
      };

      console.log('MCQ Analysis:', mcqAnalysis);
      return NextResponse.json(mcqAnalysis);
    }

    // For other question types, use GROQ API
    try {
      console.log('Analyzing response with GROQ...');
      const analysis = await analyzeResponse(question, response, expectedTopics);
      console.log('GROQ Analysis result:', analysis);
      return NextResponse.json(analysis);
    } catch (error) {
      console.error('Error analyzing response:', error);
      console.error('Error details:', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      return NextResponse.json(
        { 
          error: 'Failed to analyze response', 
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in analyze API route:', error);
    console.error('Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    );
  }
}
