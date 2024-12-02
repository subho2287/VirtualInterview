'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { EnvelopeIcon, ArrowUpCircleIcon, PlusCircleIcon, CheckCircleIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline'

interface ModelAnswer {
  isCode: boolean;
  language?: string;
  content: string;
  options?: { [key: number]: string };
  correctOption?: number;
  explanation?: string;
}

interface Question {
  question: string;
  expectedTopics: string[];
  difficulty: number;
  modelAnswer: ModelAnswer;
}

interface Analysis {
  score: number;
  feedback: string;
  coveredTopics: string[];
  missingTopics: string[];
}

interface AnswerWithAnalysis {
  answer: string | number;  // Allow both string and number types
  analysis?: Analysis;
  question: Question;
}

interface InterviewDetails {
  name: string;
  technology: string;
  difficulty: string;
  timestamp: string;
}

// Function to detect if text is likely code
const isCodeBlock = (text: string): boolean => {
  // Check for common code indicators
  const codeIndicators = [
    'function',
    '=>',
    'return',
    'const',
    'let',
    'var',
    'class',
    'import',
    'export',
    '{',
    'for(',
    'if(',
    'while('
  ];
  
  return codeIndicators.some(indicator => text.includes(indicator)) &&
         (text.includes('{') || text.includes(';'));
}

export default function Results() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [answers, setAnswers] = useState<AnswerWithAnalysis[]>([])
  const [averageScore, setAverageScore] = useState(0)
  const [details, setDetails] = useState<InterviewDetails | null>(null)
  const [showScrollTop, setShowScrollTop] = useState(false)
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [emailAddress, setEmailAddress] = useState('')
  const [sendingEmail, setSendingEmail] = useState(false)
  const [emailError, setEmailError] = useState<string | null>(null)

  const handleEmailResults = async () => {
    if (!details) return;
    setShowEmailModal(true);
  };

  const handleSendEmail = async () => {
    if (!details || !emailAddress) return;
    
    try {
      setSendingEmail(true);
      setEmailError(null);

      // Separate email template styles
      const emailStyles = `
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          background: linear-gradient(to bottom right, #EEF2FF, #FDF2F8);
          margin: 0;
          padding: 0;
        }
        .container {
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          background-color: #6610f2;
          color: white;
          padding: 24px;
          border-radius: 8px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
          margin-bottom: 24px;
        }
        .header h1 {
          font-size: 24px;
          font-weight: 700;
          margin-bottom: 24px;
          color: white;
        }
        .header p {
          margin: 8px 0;
          color: rgba(255, 255, 255, 0.9);
        }
        .header strong {
          color: white;
        }
        .question {
          background-color: white;
          margin: 24px 0;
          padding: 24px;
          border-radius: 8px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
        }
        .question h3 {
          font-size: 20px;
          font-weight: 600;
          color: #111827;
          margin-bottom: 16px;
        }
        .question h4 {
          font-size: 16px;
          font-weight: 500;
          color: #374151;
          margin: 16px 0 8px 0;
        }
        .question pre {
          background-color: #F3F4F6;
          padding: 16px;
          border-radius: 6px;
          font-family: monospace;
          white-space: pre-wrap;
          word-wrap: break-word;
          color: #1F2937;
          margin: 8px 0;
        }
        .score {
          font-weight: 600;
          color: #6610f2;
          font-size: 16px;
          margin: 16px 0;
        }
        .topics {
          margin: 16px 0;
          padding: 16px;
          background-color: #F3F4F6;
          border-radius: 6px;
        }
        .topics p {
          margin: 8px 0;
          color: #374151;
        }
        .topic-tag {
          display: inline-block;
          padding: 4px 12px;
          background-color: #C7B8EA;
          color: #6610f2;
          border-radius: 9999px;
          font-size: 14px;
          margin: 4px;
        }
        .feedback {
          padding: 16px;
          background-color: #F3F4F6;
          border-radius: 6px;
          margin: 16px 0;
          color: #374151;
        }
        .footer {
          margin-top: 40px;
          padding: 24px;
          background-color: white;
          border-radius: 8px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
          text-align: center;
        }
        .footer p {
          margin: 8px 0;
          color: #6B7280;
          font-size: 14px;
        }
        .footer a {
          color: #6610f2;
          text-decoration: none;
          font-weight: 500;
        }
        .footer a:hover {
          text-decoration: underline;
        }
      `;

      const htmlContent = `
        <html>
          <head>
            <style>${emailStyles}</style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Technical Interview Results</h1>
                <p><strong>Candidate:</strong> ${details.name}</p>
                <p><strong>Technology:</strong> ${details.technology}</p>
                <p><strong>Difficulty Level:</strong> ${details.difficulty}</p>
                <p><strong>Overall Score:</strong> ${Math.round(averageScore)} / ${answers.length * 10} 
                (${Math.round((averageScore / (answers.length * 10)) * 100)}%)</p>
              </div>

              ${answers.map((item, index) => `
                <div class="question">
                  <h3>Question ${index + 1}</h3>
                  <p>${item.question.question}</p>

                  <h4>Your Answer:</h4>
                  <pre>${item.answer}</pre>

                  <h4>Expected Answer:</h4>
                  <pre>${item.question.modelAnswer.content}</pre>

                  <p class="score">Score: ${Math.round(item.analysis?.score || 0)} / 10</p>
                  
                  <div class="feedback">
                    <strong>Feedback:</strong> ${item.analysis?.feedback ?? 'No feedback available'}
                  </div>

                  <div class="topics">
                    <p><strong>Topics Covered Well:</strong></p>
                    <div>
                      ${item.analysis?.coveredTopics && item.analysis.coveredTopics.length > 0 
                        ? item.analysis.coveredTopics.map(topic => 
                            `<span class="topic-tag">${topic}</span>`
                          ).join(' ')
                        : '<span class="topic-tag">Candidate didn\'t respond with any relevant answer</span>'
                      }
                    </div>
                    
                    <p><strong>Missing Topics:</strong></p>
                    <div>
                      ${item.analysis?.missingTopics && item.analysis.missingTopics.length > 0
                        ? item.analysis.missingTopics.map(topic => 
                            `<span class="topic-tag">${topic}</span>`
                          ).join(' ')
                        : '<span class="topic-tag">Candidate didn\'t respond with any relevant answer</span>'
                      }
                    </div>
                  </div>
                </div>
              `).join('')}

              <div class="footer">
                <p>This interview was conducted using AI Interviewer</p>
                <p>Visit us at: <a href="${window.location.origin}">${window.location.origin}</a></p>
              </div>
            </div>
          </body>
        </html>
      `;

      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: emailAddress,
          subject: `Technical Interview Results - ${details.name} - ${details.technology}`,
          html: htmlContent,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to send email');
      }

      setShowEmailModal(false);
      setEmailAddress('');
      // Show success message (you might want to add a toast notification here)
    } catch (error) {
      setEmailError(error instanceof Error ? error.message : 'Failed to send email');
    } finally {
      setSendingEmail(false);
    }
  };

  const handleStartNewInterview = () => {
    // Clear stored data
    localStorage.removeItem('interviewAnswers')
    localStorage.removeItem('interviewDetails')
    router.push('/')
  }

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    })
  }

  useEffect(() => {
    // Load answers from localStorage
    const savedAnswers = localStorage.getItem('interviewAnswers')
    const savedDetails = localStorage.getItem('interviewDetails')

    if (savedAnswers && savedDetails) {
      const parsedAnswers: AnswerWithAnalysis[] = JSON.parse(savedAnswers)
      const parsedDetails: InterviewDetails = JSON.parse(savedDetails)
      setAnswers(parsedAnswers)
      setDetails(parsedDetails)

      // Calculate average score
      if (parsedAnswers.length > 0) {
        const totalScore = parsedAnswers.reduce((sum, answer) => sum + (answer.analysis?.score || 0), 0);
        const maxPossibleScore = parsedAnswers.length * 10;
        const percentage = (totalScore / maxPossibleScore) * 100;
        setAverageScore(percentage);
      }
    } else {
      router.push('/')
    }

    // Add scroll event listener for the scroll-to-top button
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [router])

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  if (!details) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 relative py-8">
      <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-10 left-10 w-72 h-72 bg-purple-300/40 rotate-45 rounded-3xl"></div>
        <div className="absolute top-1/4 right-20 w-96 h-96 bg-pink-300/40 rotate-12 rounded-full"></div>
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-indigo-300/40 -rotate-12 rounded-3xl"></div>
        <div className="absolute top-1/2 -left-20 w-80 h-80 bg-blue-300/40 rotate-45 rounded-3xl"></div>
        <div className="absolute bottom-20 left-1/3 w-64 h-64 bg-purple-300/40 rotate-90 rounded-full"></div>
      </div>
      
      <div className="container mx-auto px-4 relative">
        <div className="max-w-3xl mx-auto">
          {/* Header Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-lg shadow-xl p-6 mb-6"
          >
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-2xl font-bold text-gray-900">Technical Interview Results</h1>
              <div className="flex gap-3">
                <button
                  onClick={handleEmailResults}
                  className="flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-md shadow-sm transition-colors"
                >
                  <EnvelopeIcon className="h-5 w-5 mr-2" />
                  Email Results
                </button>
                <button
                  onClick={handleStartNewInterview}
                  className="flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-md shadow-sm transition-colors"
                >
                  <PlusCircleIcon className="h-5 w-5 mr-2" />
                  Start New Interview
                </button>
              </div>
            </div>
            
            {/* Interview Details */}
            <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg mb-6">
              <div>
                <p className="text-sm text-gray-600">Candidate Name</p>
                <p className="font-medium text-gray-900">{details.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Technology</p>
                <p className="font-medium text-gray-900">{details.technology}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Difficulty Level</p>
                <p className="font-medium text-gray-900">{details.difficulty}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Questions Answered</p>
                <p className="font-medium text-gray-900">{answers.length}</p>
              </div>
            </div>

            {/* Overall Score */}
            <div className="max-w-full overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-lg font-semibold text-gray-700">Overall Performance</h2>
                <div className="text-right">
                  <div className="flex items-baseline justify-end gap-1">
                    <span className={`text-2xl font-bold ${
                      averageScore >= 70 ? 'text-green-600' :
                      averageScore >= 50 ? 'text-yellow-600' :
                      'text-red-600'
                    }`}>
                      {Math.round(answers.reduce((sum, answer) => sum + (answer.analysis?.score || 0), 0))} / {answers.length * 10}
                    </span>
                    <span className="text-lg text-gray-600">
                      ({Math.round(averageScore)}%)
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">
                    {averageScore >= 70 ? 'Excellent' : 
                     averageScore >= 50 ? 'Good' : 
                     'Needs Improvement'}
                  </p>
                </div>
              </div>
              <div className="relative w-full bg-gray-200 rounded-full h-2.5 mb-2">
                <div
                  className={`absolute left-0 h-2.5 rounded-full ${
                    averageScore >= 70 ? 'bg-green-600' :
                    averageScore >= 50 ? 'bg-yellow-500' :
                    'bg-red-500'
                  }`}
                  style={{ 
                    width: `${Math.min(averageScore, 100)}%`,
                    maxWidth: '100%'
                  }}
                />
              </div>
              <p className="text-sm text-gray-600">
                Based on {answers.length} question{answers.length !== 1 ? 's' : ''} answered
              </p>
            </div>
          </motion.div>

          {answers.map((item, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white rounded-lg shadow-xl p-6 mb-4"
            >
              {/* Question Section */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Question {index + 1}
                </h3>
                <p className="text-gray-700">{item.question.question}</p>
              </div>

              {/* Expected Topics */}
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-600 mb-2">Expected Topics:</h4>
                <div className="flex flex-wrap gap-2">
                  {item.question.expectedTopics.map((topic, topicIndex) => (
                    <span
                      key={topicIndex}
                      className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                    >
                      {topic}
                    </span>
                  ))}
                </div>
              </div>

              {/* Model Answer */}
              <div className="mb-6 p-4 bg-indigo-50 rounded-lg border border-indigo-100">
                <h4 className="text-sm font-medium text-indigo-900 mb-2">Expected Answer:</h4>
                {item.question.modelAnswer.options && item.question.modelAnswer.correctOption !== undefined 
                  ? `Option ${item.question.modelAnswer.correctOption}: ${item.question.modelAnswer.options[item.question.modelAnswer.correctOption]}`
                  : 'No correct option specified'}
                {item.question.modelAnswer.isCode ? (
                  // Code answer display
                  <SyntaxHighlighter
                    language={item.question.modelAnswer.language || 'javascript'}
                    style={vscDarkPlus}
                    className="rounded-md"
                  >
                    {item.question.modelAnswer.content}
                  </SyntaxHighlighter>
                ) : (
                  // Regular text answer display
                  <p className="text-indigo-800">{item.question.modelAnswer.content}</p>
                )}
              </div>

              {/* User's Answer */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Your Answer:</h4>
                {item.question.modelAnswer.options ? (
                  // MCQ user answer display
                  <p className="text-gray-800">
                    Option {item.answer}: {
                      typeof item.answer === 'number' && item.question.modelAnswer.options
                        ? item.question.modelAnswer.options[item.answer] 
                        : 'No option selected'
                    }
                  </p>
                ) : item.question.modelAnswer.isCode ? (
                  // Code user answer display
                  <SyntaxHighlighter
                    language={item.question.modelAnswer.language || 'javascript'}
                    style={vscDarkPlus}
                    className="rounded-md"
                  >
                    {String(item.answer || 'No code answer provided')}
                  </SyntaxHighlighter>
                ) : (
                  // Regular text user answer display
                  <p className="text-gray-800 whitespace-pre-wrap">{item.answer}</p>
                )}
              </div>

              {/* Analysis */}
              {item.analysis && (
                <div className="border-t pt-4">
                  {/* Score */}
                  <div className="mt-6">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-medium text-gray-600">Score:</h4>
                      <div className="flex items-baseline gap-1">
                        <span className={`text-lg font-bold ${
                          (item.analysis?.score || 0) === 10 ? 'text-green-600' :
                          (item.analysis?.score || 0) >= 7 ? 'text-green-600' :
                          (item.analysis?.score || 0) >= 5 ? 'text-yellow-600' :
                          'text-red-600'
                        }`}>
                          {item.analysis?.score || 0} / 10
                        </span>
                        <span className="text-sm text-gray-600">
                          ({Math.round(((item.analysis?.score || 0) / 10) * 100)}%)
                        </span>
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          (item.analysis?.score || 0) === 10 ? 'bg-green-600' :
                          (item.analysis?.score || 0) >= 7 ? 'bg-green-600' :
                          (item.analysis?.score || 0) >= 5 ? 'bg-yellow-500' :
                          'bg-red-500'
                        }`}
                        style={{
                          width: `${Math.min(((item.analysis?.score || 0) / 10) * 100, 100)}%`
                        }}
                      />
                    </div>
                  </div>

                  {/* Feedback */}
                  <div className="mt-6 space-y-4">
                    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
                      <div className="p-4">
                        <h4 className="text-lg font-semibold text-gray-800 mb-3">Detailed Feedback</h4>
                        
                        {/* Feedback Text */}
                        <div className="prose prose-indigo max-w-none">
                          <p className="text-gray-700 mb-4">{item.analysis?.feedback}</p>
                        </div>

                        {/* Topics Section */}
                        <div className="mt-4 space-y-3">
                          {/* Covered Topics */}
                          {item.analysis?.coveredTopics && item.analysis.coveredTopics.length > 0 && (
                            <div>
                              <h5 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                                <CheckCircleIcon className="w-5 h-5 text-green-500 mr-2" />
                                Topics Covered Well
                              </h5>
                              <div className="flex flex-wrap gap-2">
                                {item.analysis?.coveredTopics.map((topic, index) => (
                                  <span
                                    key={index}
                                    className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-50 text-green-700 border border-green-200"
                                  >
                                    {topic}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Missing Topics */}
                          {item.analysis?.missingTopics && item.analysis.missingTopics.length > 0 && (
                            <div>
                              <h5 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                                <ExclamationCircleIcon className="w-5 h-5 text-amber-500 mr-2" />
                                Topics to Review
                              </h5>
                              <div className="flex flex-wrap gap-2">
                                {item.analysis?.missingTopics.map((topic, index) => (
                                  <span
                                    key={index}
                                    className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-amber-50 text-amber-700 border border-amber-200"
                                  >
                                    {topic}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>

      {/* Email Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-semibold mb-4">Send Results via Email</h2>
            <div className="mb-4">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <input
                type="email"
                id="email"
                value={emailAddress}
                onChange={(e) => setEmailAddress(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Enter email address"
              />
              {emailError && (
                <p className="mt-1 text-sm text-red-600">{emailError}</p>
              )}
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowEmailModal(false);
                  setEmailAddress('');
                  setEmailError(null);
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={handleSendEmail}
                disabled={!emailAddress || sendingEmail}
                className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {sendingEmail ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Sending...
                  </>
                ) : (
                  'Send Email'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Scroll to Top Button */}
      <motion.button
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ 
          opacity: showScrollTop ? 1 : 0,
          scale: showScrollTop ? 1 : 0.5,
          y: showScrollTop ? 0 : 20
        }}
        transition={{ duration: 0.2 }}
        onClick={scrollToTop}
        className={`fixed bottom-8 right-8 p-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all transform ${
          showScrollTop ? 'visible translate-y-0' : 'invisible translate-y-4'
        }`}
        aria-label="Scroll to top"
      >
        <ArrowUpCircleIcon className="h-8 w-8" />
      </motion.button>
    </div>
  )
}
