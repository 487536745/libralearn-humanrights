import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';

const CertificatePage = () => {
  const navigate = useNavigate();
  const { user } = useUser();
  const [quizResults, setQuizResults] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    // Load quiz results from localStorage
    const storedResults = localStorage.getItem('quizResults');
    if (storedResults) {
      setQuizResults(JSON.parse(storedResults));
    }
    setIsLoading(false);
  }, []);

  const handleDownloadCertificate = () => {
    if (!quizResults) return;

    setIsDownloading(true);
    
    try {
      // Create a new window for printing
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        throw new Error('Popup blocked. Please allow popups for this site.');
      }

      // Get the certificate content
      const certificateElement = document.getElementById('certificate');
      if (!certificateElement) {
        throw new Error('Certificate not found.');
      }

      // Write the certificate HTML to the new window
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>LibraLearn Certificate</title>
          <style>
            body {
              margin: 0;
              padding: 20px;
              font-family: 'Georgia', serif;
              background: white;
            }
            @media print {
              body { margin: 0; padding: 0; }
              .no-print { display: none !important; }
            }
            .certificate {
              border: 8px double #fbbf24;
              border-radius: 8px;
              padding: 32px;
              background: linear-gradient(to bottom right, #fef3c7, #fed7aa);
              max-width: 800px;
              margin: 0 auto;
              text-align: center;
            }
            .certificate h1 {
              font-size: 2.5rem;
              color: #1f2937;
              margin-bottom: 8px;
            }
            .certificate h2 {
              font-size: 1.5rem;
              color: #6b7280;
              margin-bottom: 32px;
            }
            .certificate h3 {
              font-size: 2rem;
              color: #2563eb;
              margin: 32px 0;
            }
            .results {
              display: flex;
              justify-content: center;
              gap: 32px;
              margin: 32px 0;
            }
            .result-item {
              text-align: center;
            }
            .result-item .score {
              font-size: 2.5rem;
              font-weight: bold;
              margin-bottom: 4px;
            }
            .result-item .label {
              font-size: 0.875rem;
              color: #6b7280;
            }
            .signatures {
              display: flex;
              justify-content: space-between;
              margin-top: 48px;
            }
            .signature {
              text-align: center;
              width: 45%;
            }
            .signature-line {
              border-top: 2px solid #9ca3af;
              padding-top: 8px;
              font-size: 0.875rem;
              color: #6b7280;
            }
          </style>
        </head>
        <body>
          <div class="certificate">
            <h1>Certificate of Achievement</h1>
            <h2>LibraLearn Human Rights Education</h2>
            
            <p style="font-size: 1.25rem; color: #374151; margin-bottom: 24px;">This is to certify that</p>
            <h3>${user.displayName || user.email || 'Student'}</h3>
            <p style="font-size: 1.25rem; color: #374151; margin-bottom: 24px;">has successfully completed the Human Rights Quiz</p>
            
            <div class="results">
              <div class="result-item">
                <div class="score" style="color: ${getGradeColor(quizResults.score)}">${quizResults.score}%</div>
                <div class="label">Score</div>
              </div>
              <div class="result-item">
                <div class="score" style="color: #374151; font-size: 1.5rem;">${quizResults.correct}/${quizResults.total}</div>
                <div class="label">Correct Answers</div>
              </div>
              <div class="result-item">
                <div class="score" style="color: #374151; font-size: 1.25rem;">${getGradeText(quizResults.score)}</div>
                <div class="label">Grade</div>
              </div>
            </div>
            
            <p style="color: #6b7280;">Completed on ${new Date(quizResults.date).toLocaleDateString()}</p>
            
            <div class="signatures">
              <div class="signature">
                <div class="signature-line">Student Signature</div>
              </div>
              <div class="signature">
                <div class="signature-line">LibraLearn Director</div>
              </div>
            </div>
          </div>
          
          <div class="no-print" style="text-align: center; margin-top: 20px;">
            <button onclick="window.print()" style="padding: 10px 20px; background: #3b82f6; color: white; border: none; border-radius: 4px; cursor: pointer;">
              Print Certificate
            </button>
            <button onclick="window.close()" style="margin-left: 10px; padding: 10px 20px; background: #6b7280; color: white; border: none; border-radius: 4px; cursor: pointer;">
              Close
            </button>
          </div>
        </body>
        </html>
      `);

      printWindow.document.close();
      
      // Auto-trigger print dialog after a short delay
      setTimeout(() => {
        printWindow.print();
      }, 500);

    } catch (error) {
      console.error('Error opening certificate:', error);
      alert('Failed to open certificate. Please allow popups for this site and try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  const getGradeColor = (score) => {
    if (score >= 90) return '#10b981'; // green
    if (score >= 80) return '#3b82f6'; // blue
    if (score >= 70) return '#f59e0b'; // yellow
    return '#ef4444'; // red
  };

  const getGradeText = (score) => {
    if (score >= 90) return 'Excellent';
    if (score >= 80) return 'Very Good';
    if (score >= 70) return 'Good';
    return 'Needs Improvement';
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Please sign in to view your certificate.</p>
          <button
            onClick={() => navigate('/login')}
            className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading certificate...</p>
        </div>
      </div>
    );
  }

  if (!quizResults) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="mb-6">
              <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">No Quiz Results Yet</h2>
              <p className="text-gray-600 mb-6">Complete the quiz game to generate your certificate!</p>
            </div>
            <button
              onClick={() => navigate('/quiz-game')}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-lg font-semibold hover:shadow-lg hover:scale-105 transition-all"
            >
              Take Quiz Now
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
            Your Certificate
          </h1>
          <p className="text-gray-600">Download your achievement certificate</p>
        </div>

        {/* Certificate Preview */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
          <div id="certificate" className="border-8 border-double border-yellow-400 rounded-lg p-8 bg-gradient-to-br from-yellow-50 to-orange-50">
            {/* Certificate Header */}
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold text-gray-800 mb-2">Certificate of Achievement</h1>
              <p className="text-lg text-gray-600">LibraLearn Human Rights Education</p>
            </div>

            {/* Certificate Content */}
            <div className="text-center mb-8">
              <p className="text-lg text-gray-700 mb-4">This is to certify that</p>
              <h2 className="text-3xl font-bold text-blue-600 mb-4">
                {user.displayName || user.email || 'Student'}
              </h2>
              <p className="text-lg text-gray-700 mb-6">has successfully completed the Human Rights Quiz</p>
              
              {/* Quiz Results */}
              <div className="flex justify-center items-center space-x-8 mb-6">
                <div className="text-center">
                  <p className="text-4xl font-bold" style={{ color: getGradeColor(quizResults.score) }}>
                    {quizResults.score}%
                  </p>
                  <p className="text-sm text-gray-600">Score</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-semibold text-gray-700">
                    {quizResults.correct}/{quizResults.total}
                  </p>
                  <p className="text-sm text-gray-600">Correct Answers</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-semibold text-gray-700">
                    {getGradeText(quizResults.score)}
                  </p>
                  <p className="text-sm text-gray-600">Grade</p>
                </div>
              </div>

              <p className="text-gray-600">
                Completed on {new Date(quizResults.date).toLocaleDateString()}
              </p>
            </div>

            {/* Certificate Footer */}
            <div className="flex justify-between items-end mt-12">
              <div className="text-center">
                <div className="border-t-2 border-gray-400 pt-2">
                  <p className="text-sm text-gray-600">Student Signature</p>
                </div>
              </div>
              <div className="text-center">
                <div className="border-t-2 border-gray-400 pt-2">
                  <p className="text-sm text-gray-600">LibraLearn Director</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={handleDownloadCertificate}
            disabled={isDownloading}
            className="flex items-center justify-center px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-semibold hover:shadow-lg hover:scale-105 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isDownloading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Opening...
              </>
            ) : (
              <>
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Print Certificate
              </>
            )}
          </button>
          
          <button
            onClick={() => navigate('/quiz-game')}
            className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Retake Quiz
          </button>
          
          <button
            onClick={() => navigate('/avatar')}
            className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Back to Home
          </button>
        </div>
      </div>
    </div>
  );
};

export default CertificatePage;
