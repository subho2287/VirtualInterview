'use client'

import { motion } from 'framer-motion'
import { useState, Fragment } from 'react'
import { useRouter } from 'next/navigation'
import { UserIcon, CodeBracketIcon, AdjustmentsHorizontalIcon, HashtagIcon, QuestionMarkCircleIcon, CheckIcon, PlayCircleIcon, LinkIcon } from '@heroicons/react/24/outline'
import { Combobox, Transition } from '@headlessui/react'
import { ArrowRightIcon, ShareIcon } from '@heroicons/react/24/outline'

const difficultyLevels = ['Easy', 'Medium', 'Hard']
const technologies = [
  // Programming Languages
  'JavaScript', 'Python', 'Java', 'C++', 'C#', 'Ruby', 'PHP', 'Swift', 'Go', 'Rust',
  'TypeScript', 'Kotlin', 'Scala', 'R', 'MATLAB', 'Perl', 'Haskell', 'Lua',
  
  // Web Development
  'React', 'Angular', 'Vue.js', 'Node.js', 'Express.js', 'Django', 'Flask',
  'Spring Boot', 'Laravel', 'ASP.NET', 'Ruby on Rails', 'Next.js', 'Nuxt.js',
  'Svelte', 'GraphQL', 'REST API', 'HTML', 'CSS', 'Sass', 'jQuery',
  
  // Mobile Development
  'React Native', 'Flutter', 'iOS', 'Android', 'Xamarin', 'Ionic',
  
  // Database
  'SQL', 'MySQL', 'PostgreSQL', 'MongoDB', 'Redis', 'Oracle', 'SQLite',
  'Microsoft SQL Server', 'Firebase', 'Cassandra', 'DynamoDB',
  
  // Cloud & DevOps
  'AWS', 'Azure', 'Google Cloud', 'Docker', 'Kubernetes', 'Jenkins',
  'GitLab CI/CD', 'Terraform', 'Ansible', 'Linux', 'Nginx',
  
  // Data Science & AI
  'Machine Learning', 'Deep Learning', 'TensorFlow', 'PyTorch', 'Pandas',
  'NumPy', 'scikit-learn', 'Data Analysis', 'Natural Language Processing',
  'Computer Vision', 'Big Data', 'Apache Spark',
  
  // Testing
  'Jest', 'Mocha', 'Selenium', 'JUnit', 'pytest', 'Cypress',
  
  // Other
  'Blockchain', 'WebAssembly', 'Unity', 'Unreal Engine', 'Electron'
].sort()

export default function Home() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    name: '',
    technology: '',
    difficulty: '',
    numQuestions: '',
    questionType: 'subjective'
  })
  const [query, setQuery] = useState('')
  const [showCopiedToast, setShowCopiedToast] = useState(false);

  const filteredTechnologies =
    query === ''
      ? technologies
      : technologies.filter((tech) =>
          tech.toLowerCase().includes(query.toLowerCase())
        )

  const isFormValid = () => {
    return formData.name.trim() !== '' && 
           formData.technology !== '' && 
           formData.difficulty !== '' && 
           formData.numQuestions !== '' &&
           Number(formData.numQuestions) > 0 &&
           Number(formData.numQuestions) <= 10
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const encodedParams = new URLSearchParams({
      name: formData.name.trim(),
      technology: formData.technology.trim(),
      difficulty: formData.difficulty.trim(),
      numQuestions: formData.numQuestions.trim(),
      types: formData.questionType.trim()
    });
    
    router.push(`/interview?${encodedParams.toString()}`);
  }

  const handleQuestionTypeChange = (type: string) => {
    setFormData(prev => ({
      ...prev,
      questionType: type
    }))
  }

  const generateInterviewLink = () => {
    const baseUrl = window.location.origin;
    const params = new URLSearchParams({
      name: formData.name.trim(),
      technology: formData.technology.trim(),
      difficulty: formData.difficulty.trim(),
      numQuestions: formData.numQuestions.trim(),
      types: formData.questionType.trim()
    });
    
    const interviewUrl = `${baseUrl}/interview?${params.toString()}`;
    
    navigator.clipboard.writeText(interviewUrl).then(() => {
      setShowCopiedToast(true);
      setTimeout(() => setShowCopiedToast(false), 2000);
    });
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 relative">
      <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-10 left-10 w-72 h-72 bg-purple-300/40 rotate-45 rounded-3xl"></div>
        <div className="absolute top-1/4 right-20 w-96 h-96 bg-pink-300/40 rotate-12 rounded-full"></div>
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-indigo-300/40 -rotate-12 rounded-3xl"></div>
        <div className="absolute top-1/2 -left-20 w-80 h-80 bg-blue-300/40 rotate-45 rounded-3xl"></div>
        <div className="absolute bottom-20 left-1/3 w-64 h-64 bg-purple-300/40 rotate-90 rounded-full"></div>
        <div className="absolute top-20 right-1/3 w-48 h-48 bg-pink-300/40 -rotate-180 rounded-3xl"></div>
      </div>
      <div className="container mx-auto px-4 py-16 relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-4xl mx-auto bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl p-10"
        >
          <h1 className="text-3xl font-bold text-center mb-2 text-gray-800">
            Mock Technical Interview
          </h1>
          <p className="text-center text-gray-600 mb-8">
            Powered by AI
          </p>
          
          <form onSubmit={handleSubmit} className="flex flex-col md:grid md:grid-cols-2 gap-8">
            {/* Left Column */}
            <div className="space-y-6 order-1">
              {/* Name Input */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
              >
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Your Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <UserIcon className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    required
                    tabIndex={1}
                    className="w-full pl-11 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter your name"
                  />
                </div>
              </motion.div>

              {/* Technology Input */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
              >
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Technology
                </label>
                <Combobox
                  value={formData.technology}
                  onChange={(value: string | null) => setFormData({ ...formData, technology: value || '' })}
                >
                  <div className="relative">
                    <div className="relative w-full">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <CodeBracketIcon className="h-5 w-5 text-gray-400" />
                      </div>
                      <Combobox.Input
                        className="w-full pl-11 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                        onChange={(event) => setQuery(event.target.value)}
                        displayValue={(tech: string) => tech}
                        placeholder="Search for a technology..."
                      />
                      <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-4">
                        <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </Combobox.Button>
                    </div>
                    <Transition
                      as={Fragment}
                      leave="transition ease-in duration-100"
                      leaveFrom="opacity-100"
                      leaveTo="opacity-0"
                      afterLeave={() => setQuery('')}
                    >
                      <Combobox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-lg bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                        {filteredTechnologies.length === 0 && query !== '' ? (
                          <div className="relative cursor-default select-none py-2 px-4 text-gray-700">
                            Nothing found.
                          </div>
                        ) : (
                          filteredTechnologies.map((technology) => (
                            <Combobox.Option
                              key={technology}
                              className={({ active }) =>
                                `relative cursor-default select-none py-2 pl-10 pr-4 ${
                                  active ? 'bg-indigo-600 text-white' : 'text-gray-900'
                                }`
                              }
                              value={technology}
                            >
                              {({ selected, active }) => (
                                <>
                                  <span
                                    className={`block truncate ${
                                      selected ? 'font-medium' : 'font-normal'
                                    }`}
                                  >
                                    {technology}
                                  </span>
                                  {selected ? (
                                    <span
                                      className={`absolute inset-y-0 left-0 flex items-center pl-3 ${
                                        active ? 'text-white' : 'text-indigo-600'
                                      }`}
                                    >
                                      <CheckIcon className="h-5 w-5" aria-hidden="true" />
                                    </span>
                                  ) : null}
                                </>
                              )}
                            </Combobox.Option>
                          ))
                        )}
                      </Combobox.Options>
                    </Transition>
                  </div>
                </Combobox>
              </motion.div>

              {/* Number of Questions */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.35 }}
              >
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Number of Questions
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <HashtagIcon className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    required
                    tabIndex={6}
                    className="w-full pl-11 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    value={formData.numQuestions}
                    placeholder="1-10"
                    onChange={(e) => {
                      const value = Math.min(Math.max(1, Number(e.target.value)), 10);
                      setFormData({
                        ...formData,
                        numQuestions: value.toString()
                      });
                    }}
                  />
                </div>
              </motion.div>
            </div>

            {/* Right Column */}
            <div className="space-y-6 order-2">
              {/* Question Type */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
              >
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Question Type
                </label>
                <div className="space-y-3">
                  {[
                    { type: 'subjective', label: 'Subjective Questions', description: 'Open-ended questions' },
                    { type: 'coding', label: 'Coding Questions', description: 'Programming problems' },
                    { type: 'mcq', label: 'Multiple Choice', description: 'Structured options' }
                  ].map((option, index) => (
                    <label
                      key={option.type}
                      className={`relative flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                        formData.questionType === option.type
                          ? 'border-indigo-500 bg-indigo-50'
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="questionType"
                        value={option.type}
                        tabIndex={7 + index}
                        checked={formData.questionType === option.type}
                        onChange={() => handleQuestionTypeChange(option.type)}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                      />
                      <div className="ml-3 flex items-center">
                        <QuestionMarkCircleIcon className="h-5 w-5 mr-2 text-gray-400" />
                        <div>
                          <span className="text-sm font-medium">{option.label}</span>
                          <p className="text-xs text-gray-500">{option.description}</p>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </motion.div>

              {/* Difficulty Level */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.45 }}
              >
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Difficulty Level
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {difficultyLevels.map((level) => (
                    <label
                      key={level}
                      className="flex-1 flex items-center justify-center py-3 px-4 border rounded-lg cursor-pointer transition-all relative hover:bg-gray-50"
                      style={{
                        backgroundColor:
                          formData.difficulty === level ? '#818cf8' : 'white',
                        color: formData.difficulty === level ? 'white' : 'black',
                        borderColor: formData.difficulty === level ? '#818cf8' : '#e5e7eb',
                      }}
                    >
                      <input
                        type="radio"
                        name="difficulty"
                        value={level}
                        checked={formData.difficulty === level}
                        onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
                        className="sr-only"
                      />
                      <AdjustmentsHorizontalIcon className="h-5 w-5 mr-2" />
                      {level}
                    </label>
                  ))}
                </div>
              </motion.div>
            </div>

            {/* Buttons at Bottom */}
            <div className="col-span-full order-3 mt-8">
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  type="submit"
                  disabled={!isFormValid()}
                  className={`inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-lg ${
                    isFormValid()
                      ? 'text-white bg-indigo-600 hover:bg-indigo-700'
                      : 'text-gray-400 bg-gray-200 cursor-not-allowed'
                  } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}
                >
                  Start Interview
                  <ArrowRightIcon className="ml-2 -mr-1 w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={generateInterviewLink}
                  disabled={!isFormValid()}
                  className={`inline-flex items-center justify-center px-6 py-3 border text-base font-medium rounded-lg ${
                    isFormValid()
                      ? 'text-gray-700 bg-white hover:bg-gray-50 border-gray-300'
                      : 'text-gray-400 bg-gray-100 border-gray-200 cursor-not-allowed'
                  } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}
                >
                  Generate Interview Link
                  <LinkIcon className="ml-2 -mr-1 w-5 h-5" />
                </button>
              </div>
            </div>
          </form>

          {/* Copied Toast */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ 
              opacity: showCopiedToast ? 1 : 0,
              y: showCopiedToast ? 0 : 10
            }}
            className="fixed bottom-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white px-4 py-2 rounded-lg shadow-lg"
          >
            Interview link copied to clipboard!
          </motion.div>
        </motion.div>
      </div>
    </main>
  )
}
