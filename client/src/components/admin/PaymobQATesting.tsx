import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2, XCircle, Clock, Play, RotateCcw, AlertTriangle, Loader2 } from "lucide-react";

interface TestStep {
  step: string;
  status: string;
  action?: string;
  resultStatus?: string;
  expectedStatus?: string;
  match?: boolean;
  userId?: number;
  email?: string;
  planId?: number;
  frequency?: string;
  amount?: string;
  subscriptionId?: string;
  subscriptionStatus?: string;
  cycles?: number;
  renewalDetails?: Array<{
    cycle: number;
    timestamp: string;
    orderId: number;
    status: string;
  }>;
}

interface TestResults {
  startTime: string;
  endTime?: string;
  status: string;
  steps: TestStep[];
  errors: string[];
  testPlan: {
    renewalInterval: string;
    testDuration: string;
    stateTransitions: string[];
  };
  summary?: {
    totalSteps: number;
    passed: number;
    failed: number;
    passRate: string;
  };
}

export function PaymobQATesting() {
  const [isRunning, setIsRunning] = useState(false);
  const [testResults, setTestResults] = useState<TestResults | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const logsEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [logs]);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  const runTest = async () => {
    setIsRunning(true);
    setTestResults(null);
    setCurrentStep(0);
    setLogs([]);

    addLog("Starting Paymob Subscription QA Test...");
    addLog("Renewal interval set to 3 minutes for testing");

    try {
      addLog("Sending request to test endpoint...");
      
      const response = await fetch('/api/qa/paymob-subscription-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`Test failed with status ${response.status}`);
      }

      const results: TestResults = await response.json();
      setTestResults(results);

      // Log each step
      results.steps.forEach((step, index) => {
        setTimeout(() => {
          setCurrentStep(index + 1);
          const icon = step.status?.includes('PASS') ? '✅' : step.status?.includes('FAIL') ? '❌' : '⏳';
          addLog(`${icon} Step ${index + 1}: ${step.step} - ${step.status}`);
        }, index * 500);
      });

      // Final summary
      setTimeout(() => {
        if (results.summary) {
          addLog("═══════════════════════════════════════");
          addLog(`📊 TEST SUMMARY: ${results.status}`);
          addLog(`Total Steps: ${results.summary.totalSteps}`);
          addLog(`Passed: ${results.summary.passed}`);
          addLog(`Failed: ${results.summary.failed}`);
          addLog(`Pass Rate: ${results.summary.passRate}`);
          addLog("═══════════════════════════════════════");
        }
        setIsRunning(false);
      }, results.steps.length * 500 + 500);

    } catch (error: any) {
      addLog(`❌ Error: ${error.message}`);
      setIsRunning(false);
    }
  };

  const resetTest = () => {
    setTestResults(null);
    setCurrentStep(0);
    setLogs([]);
  };

  const getStepIcon = (status: string) => {
    if (status?.includes('PASS')) return <CheckCircle2 className="h-5 w-5 text-green-500" />;
    if (status?.includes('FAIL')) return <XCircle className="h-5 w-5 text-red-500" />;
    return <Clock className="h-5 w-5 text-yellow-500" />;
  };

  const getStepBadge = (status: string) => {
    if (status?.includes('PASS')) return <Badge className="bg-green-100 text-green-800">PASS</Badge>;
    if (status?.includes('FAIL')) return <Badge className="bg-red-100 text-red-800">FAIL</Badge>;
    return <Badge className="bg-yellow-100 text-yellow-800">PENDING</Badge>;
  };

  const progressPercent = testResults?.steps.length 
    ? (currentStep / testResults.steps.length) * 100 
    : 0;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🧪 Paymob Subscription QA Testing
          </CardTitle>
          <CardDescription>
            Full lifecycle test for subscription operations: PAUSE, RESUME, CANCEL, and renewals.
            Uses a 3-minute renewal interval for rapid testing.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-6">
            <Button 
              onClick={runTest} 
              disabled={isRunning}
              className="bg-green-600 hover:bg-green-700"
              data-testid="button-start-test"
            >
              {isRunning ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Running Test...
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  Start Subscription Test
                </>
              )}
            </Button>
            <Button 
              onClick={resetTest} 
              variant="outline"
              disabled={isRunning}
              data-testid="button-reset-test"
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Reset
            </Button>
          </div>

          {/* Test Configuration */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h4 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Test Configuration
            </h4>
            <div className="grid grid-cols-2 gap-4 text-sm text-blue-700">
              <div>
                <span className="font-medium">Renewal Interval:</span> 3 minutes (testing mode)
              </div>
              <div>
                <span className="font-medium">Test Duration:</span> ~30 seconds
              </div>
              <div>
                <span className="font-medium">Renewal Cycles:</span> 3 simulated
              </div>
              <div>
                <span className="font-medium">State Transitions:</span> ACTIVE → PAUSE → RESUME → CANCEL
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          {isRunning && (
            <div className="mb-6">
              <div className="flex justify-between text-sm mb-2">
                <span>Test Progress</span>
                <span>{currentStep}/{testResults?.steps.length || 9} steps</span>
              </div>
              <Progress value={progressPercent} className="h-2" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Test Steps Results */}
      {testResults && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Test Results</span>
              {testResults.summary && (
                <Badge 
                  className={
                    testResults.summary.failed === 0 
                      ? "bg-green-100 text-green-800 text-lg px-4 py-1" 
                      : "bg-red-100 text-red-800 text-lg px-4 py-1"
                  }
                >
                  {testResults.status}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Summary Cards */}
            {testResults.summary && (
              <div className="grid grid-cols-4 gap-4 mb-6">
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold text-gray-800">{testResults.summary.totalSteps}</div>
                  <div className="text-sm text-gray-600">Total Steps</div>
                </div>
                <div className="bg-green-50 rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold text-green-600">{testResults.summary.passed}</div>
                  <div className="text-sm text-gray-600">Passed</div>
                </div>
                <div className="bg-red-50 rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold text-red-600">{testResults.summary.failed}</div>
                  <div className="text-sm text-gray-600">Failed</div>
                </div>
                <div className="bg-blue-50 rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold text-blue-600">{testResults.summary.passRate}</div>
                  <div className="text-sm text-gray-600">Pass Rate</div>
                </div>
              </div>
            )}

            <Separator className="my-4" />

            {/* Individual Steps */}
            <div className="space-y-3">
              <h4 className="font-semibold">Step-by-Step Results</h4>
              {testResults.steps.map((step, index) => (
                <div 
                  key={index}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    step.status?.includes('PASS') 
                      ? 'bg-green-50 border-green-200' 
                      : step.status?.includes('FAIL')
                        ? 'bg-red-50 border-red-200'
                        : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {getStepIcon(step.status)}
                    <div>
                      <div className="font-medium">Step {index + 1}: {step.step}</div>
                      {step.action && (
                        <div className="text-sm text-gray-600">Action: {step.action}</div>
                      )}
                      {step.expectedStatus && (
                        <div className="text-sm text-gray-600">
                          Expected: {step.expectedStatus} → Result: {step.resultStatus}
                        </div>
                      )}
                      {step.subscriptionId && (
                        <div className="text-xs text-gray-500">ID: {step.subscriptionId}</div>
                      )}
                      {step.renewalDetails && (
                        <div className="text-xs text-gray-500 mt-1">
                          {step.renewalDetails.map(r => (
                            <span key={r.cycle} className="mr-2">
                              Cycle {r.cycle}: Order #{r.orderId}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  {getStepBadge(step.status)}
                </div>
              ))}
            </div>

            {/* Errors */}
            {testResults.errors.length > 0 && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <h4 className="font-semibold text-red-800 mb-2">Errors Encountered</h4>
                {testResults.errors.map((error, index) => (
                  <div key={index} className="text-sm text-red-700">{error}</div>
                ))}
              </div>
            )}

            {/* Timing Info */}
            <div className="mt-4 text-sm text-gray-500">
              <span>Started: {new Date(testResults.startTime).toLocaleString()}</span>
              {testResults.endTime && (
                <span className="ml-4">Ended: {new Date(testResults.endTime).toLocaleString()}</span>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Live Logs */}
      <Card>
        <CardHeader>
          <CardTitle>Live Test Logs</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-64 w-full rounded-md border bg-gray-900 p-4">
            <div className="font-mono text-sm text-green-400">
              {logs.length === 0 ? (
                <span className="text-gray-500">Click "Start Subscription Test" to begin...</span>
              ) : (
                logs.map((log, index) => (
                  <div key={index} className="mb-1">{log}</div>
                ))
              )}
              <div ref={logsEndRef} />
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
