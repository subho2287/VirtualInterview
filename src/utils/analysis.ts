export async function analyzeResponse(question: string, userResponse: string, expectedTopics: string[]) {
  const prompt = `As a technical interviewer, analyze and score this response:

Question: "${question}"

User's Response: "${userResponse}"

Expected Topics to Cover: ${expectedTopics.join(', ')}

Please analyze the response considering:
1. Accuracy of the answer
2. Completeness in covering expected topics
3. Technical depth and understanding
4. Clarity of explanation

IMPORTANT: You must return ONLY a valid JSON object in a single line. No markdown, no formatting, no additional text.
Do not include any explanations or notes before or after the JSON.
Ensure all strings are properly escaped, especially quotes and newlines.
The response must be parseable by JSON.parse() without any cleaning.

Example format:
{
  "score": 8,
  "feedback": "Clear explanation with good technical depth",
  "coveredTopics": ["topic1", "topic2"],
  "missingTopics": ["topic3"]
}`;

  try {
    console.log('Starting response analysis');
    
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [
          {
            role: "system",
            content: "You are a technical interviewer generating interview analysis. Always respond with valid JSON only.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        model: "llama-3.2-90b-vision-preview",
        temperature: 0.7,
        max_tokens: 1000,
        top_p: 0.95,
        stream: false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API response error:', errorText);
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    const rawResponseText = await response.text();
    console.log('Raw API response text:', rawResponseText);

    let responseData;
    try {
      responseData = JSON.parse(rawResponseText);
    } catch (error) {
      console.error('Failed to parse API response:', error);
      throw new Error('Invalid JSON response from API');
    }

    if (!responseData.choices?.[0]?.message?.content) {
      console.error('Unexpected API response structure:', responseData);
      throw new Error('Invalid API response structure');
    }

    const content = responseData.choices[0].message.content.trim();
    console.log('Content from API:', content);

    // Parse the analysis JSON with required fields validation
    const requiredFields = ['score', 'feedback', 'coveredTopics', 'missingTopics'];
    const analysisData = parseJsonResponse(content, requiredFields);
    
    console.log('Successfully parsed analysis data');
    return analysisData;

  } catch (error) {
    console.error('Error in analyzeResponse:', error instanceof Error ? error.message : String(error));
    throw error;
  }
}

// Utility function to parse JSON response with required field validation
function parseJsonResponse(jsonString: string, requiredFields: string[]): any {
  try {
    const parsedData = JSON.parse(jsonString);
    
    // Check if all required fields are present
    for (const field of requiredFields) {
      if (!(field in parsedData)) {
        throw new Error(`Missing required field: ${field}`);
      }
    }
    
    return parsedData;
  } catch (error) {
    console.error('Error parsing JSON response:', error);
    throw new Error(`Invalid JSON response: ${error instanceof Error ? error.message : String(error)}`);
  }
}
