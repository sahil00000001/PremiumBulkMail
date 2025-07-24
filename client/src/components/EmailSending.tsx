import { useState, useEffect } from "react";
import { useEmail } from "@/hooks/use-email";
import { Button } from "@/components/ui/button";
import { ArrowLeftIcon, SendIcon } from "lucide-react";
import StatusBox from "@/components/StatusBox";
import { Progress } from "@/components/ui/progress";

export default function EmailSending() {
  const { 
    credentials, 
    recipients, 
    batchId,
    setCurrentStep, 
    isSending, 
    sendEmails,
    sendingProgress
  } = useEmail();
  
  const [batchInfo, setBatchInfo] = useState<any>(null);

  const [csvContent, setCSVContent] = useState<string | null>(null);

  // Load batch info to get template details
  useEffect(() => {
    const loadBatchInfo = async () => {
      if (batchId) {
        try {
          const response = await fetch(`/api/template/${batchId}`);
          if (response.ok) {
            const data = await response.json();
            setBatchInfo(data);
          }
        } catch (error) {
          console.error('Failed to load batch info:', error);
        }
      }
    };
    
    loadBatchInfo();
  }, [batchId]);

  // Handle export report functionality
  useEffect(() => {
    if (sendingProgress.completed) {
      // Generate CSV
      const headers = ["Name", "Email", "Designation", "Company", "Status"];
      const rows = recipients.map(r => {
        const data = typeof r.data === 'string' ? JSON.parse(r.data) : r.data;
        return [
          data.Name || data.name || '',
          r.email,
          data.role || data.designation || data.Designation || '',
          data.Company || data.company || '',
          r.status
        ].join(",");
      });
      
      const csvContent = [
        headers.join(","),
        ...rows
      ].join("\n");
      
      setCSVContent(csvContent);
    }
  }, [sendingProgress.completed, recipients]);

  const handleBack = () => {
    setCurrentStep(3);
  };

  const handleExport = () => {
    if (!csvContent) return;
    
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `email_report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <>
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-medium text-gray-800">Send Bulk Emails</h2>
        <p className="text-sm text-gray-600 mt-1">Review and send emails to all recipients</p>
      </div>

      <div className="p-6">
        {/* Email Template Preview */}
        <div className="mb-8">
          <h3 className="text-sm font-medium text-gray-700 mb-4">Email Template Preview</h3>
          
          <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h4 className="text-base font-medium text-gray-800">
                  Subject: {batchInfo?.subject || 'Loading...'}
                </h4>
                <p className="text-xs text-gray-500 mt-1">From: {credentials?.email}</p>
              </div>
            </div>
            
            <div className="border-t border-gray-100 pt-4 prose prose-sm max-w-none text-gray-600">
              {batchInfo?.template ? (
                <div className="whitespace-pre-wrap">
                  {(() => {
                    // Show template with sample data from first recipient
                    if (recipients.length > 0) {
                      const sampleData = typeof recipients[0].data === 'string' 
                        ? JSON.parse(recipients[0].data) 
                        : recipients[0].data;
                      
                      return batchInfo.template.replace(/@(\w+)/g, (match: string, variable: string) => {
                        return sampleData[variable] || match;
                      });
                    }
                    return batchInfo.template;
                  })()}
                </div>
              ) : (
                <p>Loading template...</p>
              )}
            </div>
          </div>
        </div>

        {/* Sending Controls */}
        <div className="bg-gray-50 rounded-lg p-6 mb-8 border border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h3 className="text-sm font-medium text-gray-700">Ready to Send</h3>
              <p className="text-xs text-gray-500 mt-1">Will send at a rate of 80 emails per minute max</p>
            </div>
            <div className="flex items-center space-x-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleBack}
                disabled={isSending}
              >
                <ArrowLeftIcon className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button
                type="button"
                onClick={sendEmails}
                disabled={isSending || !recipients.length}
              >
                <SendIcon className="mr-2 h-4 w-4" />
                {isSending ? "Sending..." : "Start Sending"}
              </Button>
            </div>
          </div>
          
          {/* Progress Bar */}
          {(isSending || sendingProgress.sent > 0 || sendingProgress.failed > 0) && (
            <div className="mt-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-gray-700">Sending Progress</span>
                <span className="text-xs text-gray-500">
                  <span id="sent-count">{sendingProgress.sent + sendingProgress.failed}</span>/<span id="total-count">{sendingProgress.total}</span> emails
                </span>
              </div>
              <Progress 
                value={(sendingProgress.sent + sendingProgress.failed) / sendingProgress.total * 100} 
                className="h-2.5"
              />
            </div>
          )}
        </div>

        {/* Authentication Error Alert */}
        {sendingProgress.failed > 0 && sendingProgress.sent === 0 && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Gmail Authentication Error</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>Unable to send emails due to a Gmail authentication error. Please make sure you:</p>
                  <ul className="list-disc pl-5 mt-1 space-y-1">
                    <li>Are using an <strong>App Password</strong>, NOT your regular Gmail password</li>
                    <li>Have 2-Step Verification enabled for your Google Account</li>
                    <li>Created the App Password correctly (16 characters without spaces)</li>
                  </ul>
                  <p className="mt-2 font-medium">
                    <a href="https://myaccount.google.com/apppasswords" target="_blank" className="text-red-600 underline">
                      Click here to generate a Google App Password
                    </a>
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Recipients Table with Live Status */}
        <h3 className="text-sm font-medium text-gray-700 mb-4">Recipients Status</h3>
        
        <div className="overflow-x-auto shadow rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Designation</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Company</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tracking</th>
              </tr>
            </thead>
            <tbody id="recipients-status" className="bg-white divide-y divide-gray-200">
              {recipients.map((recipient, index) => {
                const data = typeof recipient.data === 'string' 
                  ? JSON.parse(recipient.data) 
                  : recipient.data;
                return (
                  <tr key={`${recipient.email}-${index}`}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{data.Name || data.name || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{recipient.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{data.role || data.designation || data.Designation || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{data.Company || data.company || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <StatusBox status={recipient.status} openedAt={recipient.openedAt} />
                        <span className="text-xs text-gray-500 capitalize">
                          {recipient.status === "sent" && recipient.openedAt ? "opened" : recipient.status}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500">
                      {recipient.openedAt ? (
                        <div className="flex flex-col">
                          <span className="text-green-600 font-medium">✓ Opened</span>
                          <span className="text-gray-400">
                            {new Date(recipient.openedAt).toLocaleString()}
                          </span>
                        </div>
                      ) : recipient.status === "sent" ? (
                        <span className="text-blue-600">📧 Sent</span>
                      ) : recipient.status === "failed" ? (
                        <span className="text-red-600">✗ Failed</span>
                      ) : (
                        <span className="text-yellow-600">⏳ Pending</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        
        {/* Summary Report */}
        {sendingProgress.completed && (
          <div className="mt-10 animate-fade-in">
            <h3 className="text-base font-medium text-gray-800 mb-6">Email Sending Summary</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
                <div className="flex items-start">
                  <div className="flex-shrink-0 bg-blue-50 rounded-md p-3">
                    <SendIcon className="h-5 w-5 text-primary-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Total Emails</p>
                    <p className="text-2xl font-semibold text-gray-900 mt-1">{sendingProgress.total}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
                <div className="flex items-start">
                  <div className="flex-shrink-0 bg-green-50 rounded-md p-3">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-success-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Sent Successfully</p>
                    <p className="text-2xl font-semibold text-success-500 mt-1">{sendingProgress.sent}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
                <div className="flex items-start">
                  <div className="flex-shrink-0 bg-red-50 rounded-md p-3">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-error-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Failed</p>
                    <p className="text-2xl font-semibold text-error-500 mt-1">{sendingProgress.failed}</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex justify-between items-center mt-8">
              <Button 
                type="button" 
                onClick={() => setCurrentStep(5)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                📊 View Tracking Dashboard
              </Button>
              <Button 
                type="button" 
                variant="outline"
                onClick={handleExport}
              >
                <DownloadIcon className="mr-2 h-4 w-4" />
                Export Report
              </Button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function DownloadIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" x2="12" y1="15" y2="3" />
    </svg>
  );
}
