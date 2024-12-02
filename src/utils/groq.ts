const GROQ_API_KEY = process.env.NEXT_PUBLIC_GROQ_API_KEY;

const API_URL = 'https://api.groq.com/openai/v1/chat/completions';

// Rate limiting configuration
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 3000; // 3 seconds between requests

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const waitForRateLimit = async () => {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  
  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    const waitTime = MIN_REQUEST_INTERVAL - timeSinceLastRequest;
    await sleep(waitTime);
  }
  
  lastRequestTime = Date.now();
};

async function makeGroqRequest(prompt: string) {
  if (!GROQ_API_KEY) {
    throw new Error('GROQ API key is not configured');
  }

  await waitForRateLimit();

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.2-90b-vision-preview',
        messages: [
          {
            role: 'system',
            content: 'You are a technical interviewer. Your responses must be in valid JSON format. Always wrap property names in double quotes. Do not include any text before or after the JSON object.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 1000,
        top_p: 0.95,
        stream: false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API response error:', {
        status: response.status,
        statusText: response.statusText,
        errorText
      });
      
      if (response.status === 429) {
        throw new Error('Rate limit exceeded');
      }
      
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    const responseData = await response.json();
    console.log('Raw API response:', JSON.stringify(responseData, null, 2));
    return responseData;
  } catch (error) {
    console.error('Error in makeGroqRequest:', error);
    if (error instanceof Error) {
      console.error('Error type:', error.constructor.name);
      console.error('Error stack:', error.stack);
    } else {
      console.error('Non-Error object thrown');
    }
    throw error;
  }
}

interface ModelAnswer {
  isCode: boolean;
  language?: string;
  content: string;
  options?: { [key: string]: string };
  correctOption?: string;
  explanation?: string;
}

interface Question {
  question: string;
  expectedTopics: string[];
  difficulty: number;
  modelAnswer: ModelAnswer;
}

function parseJsonResponse(response: string, requiredFields: string[] = ['question', 'expectedTopics', 'difficulty', 'modelAnswer']): any {
  if (!response || typeof response !== 'string') {
    console.error('Invalid response type:', typeof response);
    throw new Error('Response must be a non-empty string');
  }

  console.log('Attempting to parse response:', response);

  // First, try to find a JSON object in the response
  const jsonMatch = response.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    console.error('No JSON object found in response');
    throw new Error('No JSON object found in response');
  }

  let cleanedResponse = jsonMatch[0];

  try {
    // Try parsing the extracted JSON first
    const parsed = JSON.parse(cleanedResponse);
    
    // Validate required fields
    const missingFields = requiredFields.filter(field => !(field in parsed));
    if (missingFields.length > 0) {
      throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
    }

    return parsed;
  } catch (initialError) {
    console.error('Initial JSON Parse Error:', initialError);
    console.log('Failed to parse JSON. Response details:', {
      type: typeof cleanedResponse,
      length: cleanedResponse.length,
      preview: cleanedResponse.substring(0, 100),
      charCodes: cleanedResponse.substring(0, 50).split('').map((c, i) => `[${i}]${c}(${c.charCodeAt(0)})`).join(' ')
    });
    
    try {
      // Try to fix common JSON issues
      cleanedResponse = cleanedResponse
        .replace(/^\s*|\s*$/g, '') // Trim whitespace
        .replace(/[\u200B-\u200D\uFEFF]/g, '') // Remove zero-width spaces
        .replace(/,(\s*[}\]])/g, '$1') // Remove trailing commas
        .replace(/([{,]\s*)(\w+)(\s*:)/g, '$1"$2"$3') // Quote unquoted keys
        .replace(/:\s*'([^']*)'/g, ':"$1"') // Replace single quotes with double quotes
        .replace(/\\([^"\\\/bfnrtu])/g, '$1') // Fix invalid escape sequences
        .replace(/\n/g, '\\n') // Escape newlines
        .replace(/\r/g, '\\r') // Escape carriage returns
        .replace(/\t/g, '\\t'); // Escape tabs

      console.log('Cleaned response:', cleanedResponse);
      const parsed = JSON.parse(cleanedResponse);
      
      // Validate required fields again
      const missingFields = requiredFields.filter(field => !(field in parsed));
      if (missingFields.length > 0) {
        throw new Error(`Missing required fields after cleaning: ${missingFields.join(', ')}`);
      }

      return parsed;
    } catch (finalError) {
      console.error('Final JSON Parse Error:', finalError);
      const errorMessage = finalError instanceof Error 
        ? finalError.message 
        : 'Unknown error occurred while parsing JSON';
      throw new Error(`Failed to parse response as JSON: ${errorMessage}\nResponse: ${cleanedResponse}`);
    }
  }
}

export function validateQuestionResponse(response: any, questionType: string) {
  if (!response) {
    throw new Error('Response cannot be null or undefined');
  }

  const requiredFields = ['question', 'expectedTopics', 'difficulty', 'modelAnswer'];
  const missingFields = requiredFields.filter(field => !(field in response));
  
  if (missingFields.length > 0) {
    throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
  }

  if (!Array.isArray(response.expectedTopics)) {
    throw new Error('expectedTopics must be an array');
  }

  if (typeof response.difficulty !== 'number') {
    throw new Error('difficulty must be a number');
  }

  if (questionType.toLowerCase() === 'mcq') {
    if (!response.modelAnswer.options || typeof response.modelAnswer.options !== 'object') {
      throw new Error('MCQ response must include options object');
    }

    const requiredOptions = ['A', 'B', 'C', 'D'];
    const missingOptions = requiredOptions.filter(opt => !(opt in response.modelAnswer.options));
    
    if (missingOptions.length > 0) {
      throw new Error(`Missing MCQ options: ${missingOptions.join(', ')}`);
    }

    if (!response.modelAnswer.correctOption || !requiredOptions.includes(response.modelAnswer.correctOption)) {
      throw new Error('MCQ response must include a valid correctOption (A, B, C, or D)');
    }

    if (!response.modelAnswer.explanation || typeof response.modelAnswer.explanation !== 'string') {
      throw new Error('MCQ response must include an explanation');
    }
  } else if (questionType.toLowerCase() === 'coding') {
    if (!response.modelAnswer.isCode || typeof response.modelAnswer.content !== 'string') {
      throw new Error('Coding response must include isCode flag and content');
    }
  } else {
    if (typeof response.modelAnswer.content !== 'string') {
      throw new Error('Model answer must include content string');
    }
  }

  return response;
}

function sanitizeTechnology(tech: string): string {
  // Map of special cases (case-insensitive)
  const specialCases: { [key: string]: string } = {
    'c++': 'cpp',
    'c#': 'csharp',
    '.net': 'dotnet',
    'node.js': 'nodejs',
    'react.js': 'react',
    'vue.js': 'vue',
  };

  // Check for special cases (case-insensitive)
  const lowerTech = tech.toLowerCase();
  if (specialCases[lowerTech]) {
    return specialCases[lowerTech];
  }

  // Remove special characters and spaces for other cases
  return tech.replace(/[^a-zA-Z0-9]/g, '');
}

export function generateQuestionPrompt(technology: string, difficulty: string, questionNumber: number, questionType: string): string {
  // Different prompts based on question type
  if (questionType.toLowerCase() === 'mcq') {
    return `You are a technical interviewer specializing in ${technology}. Generate a multiple choice question (MCQ) that tests knowledge of ${technology}.

The question should:
1. Test specific knowledge in ${technology}
2. Be appropriate for ${difficulty} difficulty level
3. Have exactly 4 options (A, B, C, D)
4. Have only one correct answer
5. Question number ${questionNumber} in the sequence - ensure it's completely different from previous questions
6. Include clear explanations for why each option is correct or incorrect

IMPORTANT: Return ONLY a valid JSON object with the following fields:
{
  "question": "The MCQ question text - must be specific to ${technology}",
  "expectedTopics": [
    "List of concepts being tested",
    "Key ${technology} knowledge points covered"
  ],
  "difficulty": ${difficulty === 'Easy' ? 1 : difficulty === 'Medium' ? 2 : 3},
  "modelAnswer": {
    "options": {
      "A": "First option",
      "B": "Second option",
      "C": "Third option",
      "D": "Fourth option"
    },
    "correctOption": "The correct option letter (A, B, C, or D)",
    "explanation": "Detailed explanation of why the correct answer is right and why others are wrong"
  }
}

Return ONLY the JSON object, no additional text. Ensure all strings are properly escaped.`;
  }

  if (questionType.toLowerCase() === 'subjective') {
    return `You are a technical interviewer specializing in ${technology}. Generate a logical reasoning and analytical thinking question that is relevant to ${technology} development scenarios.

The question should:
1. Test critical thinking and problem-solving abilities in the context of ${technology} projects
2. Focus on real-world scenarios a ${technology} developer might face
3. Be appropriate for ${difficulty} difficulty level
4. Test decision-making and analytical skills specific to ${technology} development
5. Question number ${questionNumber} in the sequence - ensure it's different from previous questions

IMPORTANT: Return ONLY a valid JSON object with the following fields:
{
  "question": "The question text - must be specific to ${technology}",
  "expectedTopics": [
    "List of 4-5 key points that should be covered in the answer",
    "Each point should be relevant to ${technology}"
  ],
  "difficulty": ${difficulty === 'Easy' ? 1 : difficulty === 'Medium' ? 2 : 3},
  "modelAnswer": {
    "isCode": false,
    "content": "A detailed explanation of what a good answer should include, specific to ${technology}"
  }
}

Return ONLY the JSON object, no additional text. Ensure all strings are properly escaped.`;
  }

  // For coding questions
  if (questionType.toLowerCase() === 'coding') {
    return `You are a technical interviewer specializing in ${technology}. Generate a coding question that tests practical ${technology} implementation skills.

The question should:
1. Test coding ability in ${technology}
2. Be appropriate for ${difficulty} difficulty level
3. Focus on real-world scenarios
4. Be clear and unambiguous
5. Question number ${questionNumber} in the sequence - ensure it's different from previous questions

IMPORTANT: Return ONLY a valid JSON object with the following fields. Ensure all code in the content field is properly escaped:
{
  "question": "The coding problem statement with clear requirements and examples",
  "expectedTopics": [
    "List of concepts and skills being tested",
    "Important considerations for the implementation"
  ],
  "difficulty": ${difficulty === 'Easy' ? 1 : difficulty === 'Medium' ? 2 : 3},
  "modelAnswer": {
    "isCode": true,
    "content": "// Your code solution here\\n// Use double backslashes for newlines\\n// Escape all quotes"
  }
}

RULES for the content field:
1. Use double backslashes for newlines (\\n)
2. Escape all quotes (\\" for double quotes)
3. Avoid using backticks
4. Keep indentation using spaces (no tabs)
5. Escape any special characters

Return ONLY the JSON object, no additional text.`;
  }

  // For MCQ questions
  return `You are a technical interviewer specializing in ${technology}. Generate a multiple-choice question that tests ${technology} knowledge.

The question should:
1. Test understanding of ${technology} concepts
2. Be appropriate for ${difficulty} difficulty level
3. Have clear, unambiguous options
4. Question number ${questionNumber} in the sequence - ensure it's different from previous questions

IMPORTANT: Return ONLY a valid JSON object with the following fields:
{
  "question": "The question text",
  "expectedTopics": ["Key concepts being tested"],
  "difficulty": ${difficulty === 'Easy' ? 1 : difficulty === 'Medium' ? 2 : 3},
  "modelAnswer": {
    "isCode": false,
    "content": "Explanation of why the correct answer is right"
  },
  "options": [
    "A) First option",
    "B) Second option",
    "C) Third option",
    "D) Fourth option"
  ],
  "correctOption": "A"
}

Return ONLY the JSON object, no additional text. Ensure all strings are properly escaped.`;
}

export async function generateQuestion(technology: string, difficulty: string, questionNumber: number, questionType: string): Promise<any> {
  try {
    const prompt = generateQuestionPrompt(technology, difficulty, questionNumber, questionType);
    const response = await makeGroqRequest(prompt);

    if (!response?.choices?.[0]?.message?.content) {
      console.error('Invalid GROQ response structure:', response);
      throw new Error('Invalid response structure from GROQ API');
    }

    const content = response.choices[0].message.content;
    
    // Detailed logging of the response content
    console.log('Raw response from GROQ:', content);
    console.log('Response type:', typeof content);
    console.log('Response length:', content.length);
    console.log('First 100 characters:', content.substring(0, 100));
    
    // Parse and validate the JSON
    const parsedResponse = parseJsonResponse(content);
    
    // Log the parsed response
    console.log('Successfully parsed response:', {
      hasQuestion: !!parsedResponse?.question,
      hasTopics: !!parsedResponse?.expectedTopics,
      hasDifficulty: !!parsedResponse?.difficulty,
      hasModelAnswer: !!parsedResponse?.modelAnswer
    });
    
    // Additional validation for the response structure
    validateQuestionResponse(parsedResponse, questionType);

    return parsedResponse;
  } catch (error) {
    console.error('Error in generateQuestion:', error);
    if (error instanceof Error) {
      console.error('Error type:', error.constructor.name);
      console.error('Error stack:', error.stack);
    } else {
      console.error('Non-Error object thrown');
    }
    throw error;
  }
}

export async function analyzeResponse(question: string, response: string, expectedTopics: string[]) {
  if (!GROQ_API_KEY) {
    throw new Error('GROQ API key is not configured');
  }

  const prompt = `Analyze this response to the following interview question. Provide feedback and a score out of 10.

Question: ${question}

Response: ${response}

Expected topics to be covered:
${expectedTopics.map(topic => `- ${topic}`).join('\n')}

Return your analysis in this JSON format:
{
  "score": 8,
  "feedback": "Detailed feedback about the response",
  "coveredTopics": ["Topics that were covered well in the response"],
  "missingTopics": ["Expected topics that were not covered"],
  "improvement": "Suggestions for improvement"
}

Make sure to:
1. Score between 0 and 10 points only
2. Include all topics from the expected topics list in either coveredTopics or missingTopics
3. Provide specific, actionable feedback`;

  try {
    const apiResponse = await makeGroqRequest(prompt);
    
    if (!apiResponse?.choices?.[0]?.message?.content) {
      throw new Error('Invalid response structure from GROQ API');
    }

    // Parse the response with required fields
    const result = parseJsonResponse(
      apiResponse.choices[0].message.content,
      ['score', 'feedback', 'coveredTopics', 'missingTopics'] // Make improvement optional
    );

    // Ensure score is between 0 and 10
    if (typeof result.score === 'number') {
      if (result.score > 10) {
        result.score = Math.min(10, result.score / 10); // Convert percentage to 10-point scale
      }
      result.score = Math.max(0, Math.min(10, result.score));
    } else {
      result.score = 0;
    }

    // Ensure coveredTopics and missingTopics are arrays
    if (!Array.isArray(result.coveredTopics)) {
      result.coveredTopics = [];
    }
    if (!Array.isArray(result.missingTopics)) {
      result.missingTopics = [];
    }

    return result;
  } catch (error) {
    console.error('Error in analyzeResponse:', error);
    if (error instanceof Error) {
      console.error('Error type:', error.constructor.name);
      console.error('Error stack:', error.stack);
    } else {
      console.error('Non-Error object thrown');
    }
    throw error;
  }
}
