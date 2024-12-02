'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import { motion, AnimatePresence } from 'framer-motion'
import { type EditorProps } from '@monaco-editor/react'

// Dynamically import Monaco editor with no SSR
const MonacoEditor = dynamic(
  () => import('@monaco-editor/react').then(mod => mod.Editor),
  { ssr: false }
)

// Loading component for the editor
const EditorLoading = () => (
  <div className="w-full h-[400px] bg-gray-100 rounded-lg flex items-center justify-center">
    <div className="flex flex-col items-center">
      <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
      <p className="text-gray-600">Loading editor...</p>
    </div>
  </div>
)

interface Question {
  question: string;
  expectedTopics: string[];
  difficulty: number;
  options?: string[];
  modelAnswer: {
    isCode: boolean;
    content: string;
    correctOption?: string;
    language?: string;
    options?: { [key: string]: string };
    explanation?: string;
  };
}

interface Analysis {
  score: number;
  feedback: string;
  coveredTopics: string[];
  missingTopics: string[];
}

interface AnswerWithAnalysis {
  answer: string;
  analysis?: Analysis;
  question: Question;
}

export default function Interview() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // Get and validate URL parameters
  const name = searchParams.get('name')?.trim()
  const technology = searchParams.get('technology')?.trim()
  const difficulty = searchParams.get('difficulty')?.trim()
  const numQuestions = searchParams.get('numQuestions')?.trim()
  const types = searchParams.get('types')?.split(',').map(t => t.trim()).filter(Boolean) || []

  // Validate required parameters
  useEffect(() => {
    if (!name || !technology || !difficulty || !numQuestions || !types.length) {
      console.error('Missing or invalid parameters:', {
        name,
        technology,
        difficulty,
        numQuestions,
        types
      });
      router.push('/')
      return
    }

    // Store interview details
    const interviewDetails = {
      name,
      technology,
      difficulty,
      questionTypes: types,
      timestamp: new Date().toISOString()
    }
    localStorage.setItem('interviewDetails', JSON.stringify(interviewDetails))
  }, [name, technology, difficulty, numQuestions, types, router]);

  const initialLoadRef = useRef(false)
  const [currentQuestionNumber, setCurrentQuestionNumber] = useState(1)
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null)
  const [answers, setAnswers] = useState<AnswerWithAnalysis[]>([])
  const [timeLeft, setTimeLeft] = useState(600) // 10 minutes in seconds
  const [answer, setAnswer] = useState('')
  const [loading, setLoading] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isGeneratingQuestion, setIsGeneratingQuestion] = useState(false)
  const [editorLanguage, setEditorLanguage] = useState('javascript')

  useEffect(() => {
    // Set editor language based on the technology
    if (technology) {
      const lang = technology.toLowerCase()
      if (lang.includes('python')) {
        setEditorLanguage('python')
      } else if (lang.includes('java')) {
        setEditorLanguage('java')
      } else if (lang.includes('c#')) {
        setEditorLanguage('csharp')
      } else if (lang.includes('c++')) {
        setEditorLanguage('cpp')
      } else if (lang.includes('typescript')) {
        setEditorLanguage('typescript')
      } else if (lang.includes('php')) {
        setEditorLanguage('php')
      } else if (lang.includes('ruby')) {
        setEditorLanguage('ruby')
      } else if (lang.includes('swift')) {
        setEditorLanguage('swift')
      } else if (lang.includes('go')) {
        setEditorLanguage('go')
      } else if (lang.includes('rust')) {
        setEditorLanguage('rust')
      }
      // Default is 'javascript'
    }
  }, [technology])

  const TOTAL_QUESTIONS = Number(numQuestions) || 5;
  const MINUTES_PER_QUESTION = 2;
  const TOTAL_TIME_MINUTES = TOTAL_QUESTIONS * MINUTES_PER_QUESTION;
  const TOTAL_TIME_SECONDS = TOTAL_TIME_MINUTES * 60;

  // Question generation effect
  useEffect(() => {
    // Skip if parameters are invalid
    if (!name || !technology || !difficulty || !types.length) return;
    
    // Only run once
    if (initialLoadRef.current) return;
    initialLoadRef.current = true;

    // Generate first question
    if (!currentQuestion && !isGeneratingQuestion) {
      generateNextQuestion();
    }
  }, [name, technology, difficulty, types]);

  const generateNextQuestion = async () => {
    if (!technology || !difficulty) {
      console.error('Missing required parameters for question generation');
      return;
    }

    if (isGeneratingQuestion) {
      console.log('Already generating a question, skipping...');
      return;
    }

    try {
      setIsGeneratingQuestion(true);
      setLoading(true);
      setError(null);

      // Rotate through question types
      const typeIndex = (currentQuestionNumber - 1) % types.length;
      const questionType = types[typeIndex];
      
      console.log('Generating question:', {
        technology,
        difficulty,
        questionNumber: currentQuestionNumber,
        questionType,
      });

      const response = await fetch('/api/questions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          technology,
          difficulty,
          questionNumber: currentQuestionNumber,
          questionType,
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch question');
      }

      if (!data || !data.question) {
        throw new Error('Invalid question format received');
      }

      setCurrentQuestion(data);
      setError(null);
    } catch (error) {
      console.error('Error generating question:', error);
      setError(error instanceof Error ? error.message : 'Failed to generate question');
      setCurrentQuestion(null);
    } finally {
      setLoading(false);
      setIsGeneratingQuestion(false);
    }
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          // Store the current answer before redirecting
          if (answer && currentQuestion) {
            const newAnswers = [...answers, { answer, question: currentQuestion }];
            localStorage.setItem('interviewAnswers', JSON.stringify(newAnswers));
          }
          router.push('/results')
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [router, answers, answer, currentQuestion])

  const analyzeAnswer = async (question: Question, answerText: string) => {
    try {
      const questionType = types[(currentQuestionNumber - 1) % types.length];
      console.log('Analyzing answer:', {
        questionType,
        answerLength: answerText.length,
        expectedTopics: question.expectedTopics,
        hasCorrectOption: questionType === 'mcq' ? question.modelAnswer.correctOption : undefined
      });

      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: question.question,
          response: answerText,
          expectedTopics: question.expectedTopics,
          questionType,
          correctOption: questionType === 'mcq' ? question.modelAnswer.correctOption : undefined,
          explanation: questionType === 'mcq' ? question.modelAnswer.explanation : undefined
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        console.error('API error response:', {
          status: response.status,
          statusText: response.statusText,
          errorData
        });
        throw new Error(`Failed to analyze answer: ${response.status} ${response.statusText}`);
      }

      const analysis = await response.json();
      console.log('Analysis result:', analysis);
      
      if (!analysis || typeof analysis.score !== 'number') {
        console.error('Invalid analysis format:', analysis);
        throw new Error('Invalid analysis format received');
      }

      return analysis;
    } catch (error) {
      console.error('Error analyzing answer:', error);
      if (error instanceof Error) {
        console.error('Error details:', {
          name: error.name,
          message: error.message,
          stack: error.stack
        });
      }
      throw error;
    }
  };

  const handleNext = async () => {
    if (!currentQuestion || analyzing || isGeneratingQuestion) return;
    
    setAnalyzing(true);
    
    try {
      const analysis = await analyzeAnswer(currentQuestion, answer);
      const newAnswer: AnswerWithAnalysis = {
        answer,
        analysis,
        question: currentQuestion,
      };
      
      const newAnswers = [...answers, newAnswer];
      setAnswers(newAnswers);
      setAnswer('');

      if (currentQuestionNumber === TOTAL_QUESTIONS) {
        // Store answers and interview details
        localStorage.setItem('interviewAnswers', JSON.stringify(newAnswers));
        localStorage.setItem('interviewDetails', JSON.stringify({
          name,
          technology,
          difficulty,
          timestamp: new Date().toISOString()
        }));
        router.push('/results');
      } else {
        setCurrentQuestionNumber(prev => prev + 1);
        setCurrentQuestion(null);
        generateNextQuestion();
      }
    } catch (error) {
      console.error('Error in handleNext:', error);
    } finally {
      setAnalyzing(false);
    }
  };

  const formatTime = (timeInSeconds: number) => {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = timeInSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const renderAnswerInput = () => {
    if (!currentQuestion) return null;

    const questionType = types[(currentQuestionNumber - 1) % types.length];

    if (questionType === 'mcq') {
      const options = currentQuestion.modelAnswer.options || {};
      return (
        <div className="space-y-4">
          {Object.entries(options).map(([letter, text]) => (
            <div key={letter} className="flex items-center space-x-3">
              <input
                type="radio"
                id={letter}
                name="mcq-answer"
                value={letter}
                checked={answer === letter}
                onChange={(e) => setAnswer(e.target.value)}
                className="h-4 w-4 text-blue-600"
              />
              <label htmlFor={letter} className="text-gray-700">
                {letter}. {text}
              </label>
            </div>
          ))}
        </div>
      );
    }

    if (questionType === 'coding') {
      return (
        <div className="w-full h-[400px] border border-gray-300 rounded-lg">
          <MonacoEditor
            height="400px"
            defaultLanguage={editorLanguage}
            language={editorLanguage}
            value={answer}
            onChange={(value) => setAnswer(value || '')}
            theme="vs-dark"
            loading={<EditorLoading />}
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              lineNumbers: 'on',
              roundedSelection: true,
              scrollBeyondLastLine: false,
              automaticLayout: true,
              wordWrap: 'on'
            }}
            className="border-none"
          />
        </div>
      );
    }

    return (
      <textarea
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        placeholder="Type your answer here..."
        className="w-full h-48 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-xl">
          <div className="flex items-center space-x-4">
            <div className="w-6 h-6 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-lg font-medium text-gray-700">Loading your next question...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-xl">
          <h2 className="text-xl font-bold text-red-600 mb-4">Error</h2>
          <p className="text-gray-700 mb-4">{error}</p>
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Return Home
          </button>
        </div>
      </div>
    )
  }

  if (!currentQuestion) {
    return null;
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-white rounded-lg shadow-xl p-6 mb-4"
          >
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-sm text-gray-600">Interviewing</h2>
                <p className="text-lg font-semibold">{name}</p>
              </div>
              <div className="text-right">
                <h2 className="text-sm text-gray-600">Time Remaining</h2>
                <p className={`text-lg font-semibold ${timeLeft < 60 ? 'text-red-600' : ''}`}>
                  {formatTime(timeLeft)}
                </p>
              </div>
            </div>

            <div className="mb-4">
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <motion.div
                  className="bg-indigo-600 h-2.5 rounded-full"
                  initial={{ width: '0%' }}
                  animate={{ width: `${(currentQuestionNumber / TOTAL_QUESTIONS) * 100}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
              <p className="text-sm text-gray-600 mt-2">
                Question {currentQuestionNumber} of {TOTAL_QUESTIONS}
              </p>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={currentQuestionNumber}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="mb-6"
              >
                <div className="mb-6">
                  <h3 className="text-xl font-semibold mb-4">
                    {currentQuestion.question}
                  </h3>
                </div>
                <div className="mb-4">
                  <p className="text-sm text-gray-600">Expected topics to cover:</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {currentQuestion.expectedTopics.map((topic, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm"
                      >
                        {topic}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mb-6">
                  {renderAnswerInput()}
                </div>
              </motion.div>
            </AnimatePresence>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`w-full py-3 px-4 bg-indigo-600 text-white rounded-md font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center`}
              onClick={handleNext}
              disabled={analyzing || !answer.trim()}
            >
              {analyzing ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Analyzing Response...
                </>
              ) : (
                currentQuestionNumber === TOTAL_QUESTIONS ? 'Finish Interview' : 'Next Question'
              )}
            </motion.button>
          </motion.div>
        </div>
      </div>
    </main>
  );
}
