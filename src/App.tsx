import React, { useState, useRef, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Database, 
  Ship, 
  Search, 
  MessageSquare, 
  ArrowRight, 
  Code, 
  AlertTriangle,
  CheckCircle2,
  Terminal,
  ChevronRight,
  Zap,
  Globe,
  Menu,
  X,
  Download,
  Bell,
  ZapOff,
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { nexusArchitect, SYSTEM_PROMPTS } from './services/gemini';
import { cn } from './lib/utils';

// --- Types ---
type Tab = 'dashboard' | 'migration' | 'disruption' | 'search' | 'chat' | 'architecture';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface Alert {
  id: string;
  type: 'weather' | 'labor' | 'customs' | 'shortage' | 'other';
  keyword: string;
  active: boolean;
  createdAt: string;
}

// --- Components ---

const SidebarItem = ({ 
  icon: Icon, 
  label, 
  active, 
  onClick 
}: { 
  icon: any, 
  label: string, 
  active: boolean, 
  onClick: () => void 
}) => (
  <button
    onClick={onClick}
    className={cn(
      "flex items-center w-full gap-3 px-4 py-3 text-sm font-medium transition-all rounded-lg",
      active 
        ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20" 
        : "text-slate-400 hover:text-white hover:bg-slate-800"
    )}
  >
    <Icon size={18} />
    <span>{label}</span>
  </button>
);

const Card = ({ children, className, title, icon: Icon }: { children: React.ReactNode, className?: string, title?: string, icon?: any }) => (
  <div className={cn("bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden", className)}>
    {title && (
      <div className="px-6 py-4 border-b border-slate-800 flex items-center gap-2">
        {Icon && <Icon size={18} className="text-blue-400" />}
        <h3 className="font-semibold text-slate-100">{title}</h3>
      </div>
    )}
    <div className="p-6">
      {children}
    </div>
  </div>
);

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [tabMessages, setTabMessages] = useState<Record<Tab, Message[]>>({
    dashboard: [],
    migration: [],
    disruption: [],
    search: [],
    chat: [
      { role: 'assistant', content: "Welcome, Architect. I am Nexus, your AI-driven Supply Chain Consultant. How can I optimize your APAC logistics today?" }
    ],
    architecture: []
  });
  
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [newAlertKeyword, setNewAlertKeyword] = useState('');
  const [newAlertType, setNewAlertType] = useState<Alert['type']>('weather');
  const [activeNotifications, setActiveNotifications] = useState<string[]>([]);
  
  const messages = tabMessages[activeTab] || [];

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('nexus_tab_messages');
    if (saved) {
      try {
        setTabMessages(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load saved messages", e);
      }
    }
    
    const savedAlerts = localStorage.getItem('nexus_alerts');
    if (savedAlerts) {
      try {
        setAlerts(JSON.parse(savedAlerts));
      } catch (e) {
        console.error("Failed to load saved alerts", e);
      }
    }
  }, []);

  // Save to localStorage whenever tabMessages changes
  useEffect(() => {
    localStorage.setItem('nexus_tab_messages', JSON.stringify(tabMessages));
  }, [tabMessages]);

  useEffect(() => {
    localStorage.setItem('nexus_alerts', JSON.stringify(alerts));
  }, [alerts]);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [tabMessages, activeTab]);

  useEffect(() => {
    setValidationError(null);
    setInput('');
  }, [activeTab]);

  const validateMigrationData = (data: string): boolean => {
    const trimmed = data.trim();
    if (!trimmed) {
      setValidationError("Input cannot be empty.");
      return false;
    }

    // Check if it's JSON
    try {
      JSON.parse(trimmed);
      setValidationError(null);
      return true;
    } catch (e) {
      // Not JSON, check if it's valid CSV
      const lines = trimmed.split('\n').filter(line => line.trim() !== '');
      if (lines.length < 2) {
        setValidationError("Invalid format. Please provide valid JSON or CSV data (at least a header and one row).");
        return false;
      }

      const firstLine = lines[0];
      const delimiter = firstLine.includes(',') ? ',' : firstLine.includes(';') ? ';' : firstLine.includes('\t') ? '\t' : null;

      if (!delimiter) {
        setValidationError("Invalid format. CSV data must use commas, semicolons, or tabs as delimiters.");
        return false;
      }

      const headerCount = firstLine.split(delimiter).length;
      if (headerCount < 2) {
        setValidationError("Invalid CSV format. At least two columns are required.");
        return false;
      }

      // Check consistency of columns in the first few rows
      for (let i = 1; i < Math.min(lines.length, 5); i++) {
        if (lines[i].split(delimiter).length !== headerCount) {
          setValidationError(`Inconsistent CSV data at line ${i + 1}. Expected ${headerCount} columns.`);
          return false;
        }
      }

      setValidationError(null);
      return true;
    }
  };

  const exportData = (format: 'json' | 'csv') => {
    const currentMessages = tabMessages[activeTab] || [];
    const dataToExport = currentMessages.map(m => ({
      timestamp: new Date().toISOString(),
      role: m.role,
      content: m.content,
      tab: activeTab
    }));

    let blob: Blob;
    let filename: string;

    if (format === 'json') {
      const jsonString = JSON.stringify(dataToExport, null, 2);
      blob = new Blob([jsonString], { type: 'application/json' });
      filename = `nexus_export_${activeTab}_${new Date().getTime()}.json`;
    } else {
      const headers = ['Timestamp', 'Role', 'Content', 'Tab'];
      const csvContent = [
        headers.join(','),
        ...dataToExport.map(row => [
          `"${row.timestamp}"`,
          `"${row.role}"`,
          `"${row.content.replace(/"/g, '""')}"`,
          `"${row.tab}"`
        ].join(','))
      ].join('\n');
      blob = new Blob([csvContent], { type: 'text/csv' });
      filename = `nexus_export_${activeTab}_${new Date().getTime()}.csv`;
    }

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleSendMessage = async (e?: React.FormEvent, customPrompt?: string) => {
    e?.preventDefault();
    const text = customPrompt || input;
    if (!text.trim() || loading) return;

    const currentTabMessages = tabMessages[activeTab] || [];
    const newMessages: Message[] = [...currentTabMessages, { role: 'user', content: text }];
    
    setTabMessages(prev => ({
      ...prev,
      [activeTab]: newMessages
    }));
    
    setInput('');
    setLoading(true);

    let systemPrompt = SYSTEM_PROMPTS.CONSULTANT;
    if (activeTab === 'migration') systemPrompt = SYSTEM_PROMPTS.MIGRATION;
    if (activeTab === 'disruption') systemPrompt = SYSTEM_PROMPTS.DISRUPTION;

    const response = await nexusArchitect(text, systemPrompt);
    
    // Check for alerts in disruption tab
    if (activeTab === 'disruption') {
      const matchedAlerts = alerts.filter(a => 
        a.active && 
        (text.toLowerCase().includes(a.keyword.toLowerCase()) || 
         response.toLowerCase().includes(a.keyword.toLowerCase()))
      );
      
      if (matchedAlerts.length > 0) {
        setActiveNotifications(prev => [
          ...prev, 
          `Alert Triggered: ${matchedAlerts.map(a => a.keyword).join(', ')}`
        ]);
      }
    }
    
    setTabMessages(prev => ({
      ...prev,
      [activeTab]: [...(prev[activeTab] || []), { role: 'assistant', content: response }]
    }));
    
    setLoading(false);
  };

  const clearHistory = () => {
    setTabMessages(prev => ({
      ...prev,
      [activeTab]: activeTab === 'chat' ? [
        { role: 'assistant', content: "Welcome, Architect. I am Nexus, your AI-driven Supply Chain Consultant. How can I optimize your APAC logistics today?" }
      ] : []
    }));
  };

  const renderDashboard = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-gradient-to-br from-blue-600/20 to-transparent">
          <div className="flex flex-col gap-2">
            <Zap className="text-blue-400 mb-2" size={24} />
            <h4 className="text-2xl font-bold text-white">10,000+</h4>
            <p className="text-slate-400 text-sm">SKUs Ready for Vectorization</p>
          </div>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-600/20 to-transparent">
          <div className="flex flex-col gap-2">
            <Globe className="text-emerald-400 mb-2" size={24} />
            <h4 className="text-2xl font-bold text-white">APAC North</h4>
            <p className="text-slate-400 text-sm">Active Logistics Corridor</p>
          </div>
        </Card>
        <Card className="bg-gradient-to-br from-purple-600/20 to-transparent">
          <div className="flex flex-col gap-2">
            <Database className="text-purple-400 mb-2" size={24} />
            <h4 className="text-2xl font-bold text-white">Cloud Spanner</h4>
            <p className="text-slate-400 text-sm">AI-Ready Database Instance</p>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Recent Disruption Alerts" icon={AlertTriangle}>
          <div className="space-y-4">
            {[
              { id: 1, location: "Port of Busan", issue: "Typhoon Warning", impact: "High", status: "Analyzing" },
              { id: 2, location: "South China Sea", issue: "Route Congestion", impact: "Medium", status: "Resolved" },
              { id: 3, location: "Singapore Changi", issue: "Customs Delay", impact: "Low", status: "Monitoring" },
            ].map((alert) => (
              <div key={alert.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50 border border-slate-700">
                <div>
                  <div className="font-medium text-slate-200">{alert.location}</div>
                  <div className="text-xs text-slate-400">{alert.issue}</div>
                </div>
                <div className="text-right">
                  <div className={cn(
                    "text-xs px-2 py-1 rounded font-semibold",
                    alert.impact === 'High' ? "bg-red-500/20 text-red-400" : 
                    alert.impact === 'Medium' ? "bg-amber-500/20 text-amber-400" : 
                    "bg-blue-500/20 text-blue-400"
                  )}>
                    {alert.impact} Impact
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1 uppercase tracking-wider">{alert.status}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Migration Progress" icon={Database}>
          <div className="space-y-6">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-slate-300">MySQL to Spanner Migration</span>
                <span className="text-blue-400 font-medium">65%</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2">
                <div className="bg-blue-600 h-2 rounded-full" style={{ width: '65%' }}></div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-slate-800/30 border border-slate-700">
                <div className="text-xs text-slate-400 uppercase mb-1">Vectorized SKUs</div>
                <div className="text-xl font-bold text-white">6,542</div>
              </div>
              <div className="p-4 rounded-lg bg-slate-800/30 border border-slate-700">
                <div className="text-xs text-slate-400 uppercase mb-1">Latency (ms)</div>
                <div className="text-xl font-bold text-emerald-400">12ms</div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );

  const renderMigration = () => (
    <div className="space-y-6">
      <Card title="Data Migration Analyst" icon={Database}>
        <p className="text-slate-400 mb-6">
          Paste your inventory data in JSON or CSV format. I will generate an AI-Ready Cloud Spanner DDL with vector support.
        </p>
        <div className="space-y-4">
          <textarea
            className={cn(
              "w-full h-40 bg-slate-950 border rounded-lg p-4 text-slate-300 font-mono text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all",
              validationError ? "border-red-500/50" : "border-slate-800"
            )}
            placeholder='{ "sku": "EL-902", "name": "Hydrophobic Circuit Board", "description": "High-performance water-resistant electronics for marine use..." }'
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              if (validationError) setValidationError(null);
            }}
          />
          {validationError && (
            <motion.p 
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-red-400 text-xs flex items-center gap-1.5"
            >
              <AlertTriangle size={14} /> {validationError}
            </motion.p>
          )}
          <button
            onClick={() => {
              if (validateMigrationData(input)) {
                handleSendMessage(undefined, `Analyze this legacy data and suggest a Spanner schema: ${input}`);
              }
            }}
            disabled={loading || !input}
            className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors"
          >
            {loading ? <Zap className="animate-spin" size={18} /> : <Code size={18} />}
            Generate AI-Ready Schema
          </button>
        </div>
      </Card>
      
      {messages.length > 1 && activeTab === 'migration' && (
        <Card title="Architect's Suggestion" icon={CheckCircle2} className="border-emerald-500/30">
          <div className="prose prose-invert max-w-none">
            <ReactMarkdown>{messages[messages.length - 1].content}</ReactMarkdown>
          </div>
        </Card>
      )}

      <Card title="Migrate Faster: AI-Automated Sanitization Script" icon={Terminal}>
        <div className="space-y-4">
          <p className="text-sm text-slate-400">
            This Python script uses **Vertex AI (Gemini)** to sanitize messy legacy CSV data (e.g., <code className="text-blue-400">Part_Notes</code>, <code className="text-blue-400">Category_ID</code>) and map it directly to our AI-Ready Spanner schema.
          </p>
          <div className="relative group">
            <pre className="p-4 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-slate-300 overflow-x-auto">
{`import pandas as pd
from google.cloud import spanner
from vertexai.generative_models import GenerativeModel
import vertexai

# Initialize Vertex AI and Spanner
vertexai.init(project="your-project-id", location="asia-southeast1")
spanner_client = spanner.Client()
instance = spanner_client.instance("nexus-instance")
database = instance.database("supply-chain-db")
model = GenerativeModel("gemini-1.5-flash")

def sanitize_and_migrate(csv_path):
    df = pd.read_csv(csv_path)
    
    for _, row in df.iterrows():
        # AI-Powered Sanitization Prompt
        prompt = f"""
        Sanitize this legacy inventory record into our clean schema:
        Legacy Data: {row.to_dict()}
        Target Schema: ItemId, ItemName, SupplierName, Description
        Rules: Extract name from 'Part_Notes', map 'Category_ID' to context.
        Return ONLY a JSON object.
        """
        
        # 1. Sanitize with LLM
        response = model.generate_content(prompt)
        clean_data = eval(response.text) # In production, use json.loads
        
        # 2. Generate Vector Embedding (AI-Ready)
        # (Assuming a helper function to call Vertex Embeddings API)
        vector = generate_embedding(clean_data['Description'])
        
        # 3. Insert into Spanner
        with database.batch() as batch:
            batch.insert(
                table='SupplyChainItems',
                columns=['ItemId', 'ItemName', 'SupplierName', 'Description', 'DescriptionVector'],
                values=[(
                    clean_data['ItemId'], 
                    clean_data['ItemName'], 
                    clean_data['SupplierName'], 
                    clean_data['Description'],
                    vector
                )]
            )
    print("Migration Complete: 100% Data Sanitized via AI.")`}
            </pre>
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="px-2 py-1 bg-slate-800 rounded text-[10px] text-slate-400 border border-slate-700">Python + Spanner SDK</div>
            </div>
          </div>
          <div className="flex items-center gap-4 p-3 rounded-lg bg-blue-900/10 border border-blue-500/20">
            <Zap className="text-blue-400" size={16} />
            <p className="text-[10px] text-slate-400">
              <strong>Migration Speedup:</strong> By using LLMs for data cleaning, we eliminate 90% of manual ETL mapping effort, enabling "Migrate Faster" for messy legacy datasets.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );

  const addAlert = () => {
    if (!newAlertKeyword.trim()) return;
    const alert: Alert = {
      id: Math.random().toString(36).substr(2, 9),
      type: newAlertType,
      keyword: newAlertKeyword.trim(),
      active: true,
      createdAt: new Date().toISOString()
    };
    setAlerts([...alerts, alert]);
    setNewAlertKeyword('');
  };

  const toggleAlert = (id: string) => {
    setAlerts(alerts.map(a => a.id === id ? { ...a, active: !a.active } : a));
  };

  const deleteAlert = (id: string) => {
    setAlerts(alerts.filter(a => a.id !== id));
  };

  const renderDisruption = () => (
    <div className="space-y-6">
      {activeNotifications.length > 0 && (
        <div className="space-y-2">
          {activeNotifications.map((note, idx) => (
            <div key={idx} className="bg-red-900/40 border border-red-500/50 p-4 rounded-lg flex justify-between items-center animate-pulse">
              <div className="flex items-center gap-3">
                <Bell className="text-red-400" size={20} />
                <span className="text-red-100 font-medium">{note}</span>
              </div>
              <button 
                onClick={() => setActiveNotifications(prev => prev.filter((_, i) => i !== idx))}
                className="text-red-300 hover:text-white"
              >
                Dismiss
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card title="Disruption Solver" icon={Ship}>
        <p className="text-slate-400 mb-6">
          Report a logistics disruption. I will use RAG to find alternative suppliers or routes from our AI-Ready database.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {[
            "Typhoon in South China Sea affecting Port of Busan",
            "Labor strike at Port of Melbourne",
            "Customs outage in Shanghai Free Trade Zone",
            "Shortage of hydrophobic components in Taiwan"
          ].map((scenario) => (
            <button
              key={scenario}
              onClick={() => handleSendMessage(undefined, scenario)}
              className="text-left p-4 rounded-lg bg-slate-800/50 border border-slate-700 hover:border-blue-500 hover:bg-slate-800 transition-all text-sm text-slate-300"
            >
              {scenario}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-slate-300 outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Describe a custom disruption..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
          />
          <button
            onClick={() => handleSendMessage()}
            disabled={loading || !input}
            className="px-6 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold rounded-lg flex items-center gap-2 transition-colors"
          >
            {loading ? <Zap className="animate-spin" size={18} /> : <ArrowRight size={18} />}
          </button>
        </div>
      </Card>

      {messages.length > 1 && activeTab === 'disruption' && (
        <Card title="Strategic Response" icon={Globe} className="border-blue-500/30">
          <div className="flex justify-end gap-2 mb-4">
            <button 
              onClick={() => exportData('json')}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg flex items-center gap-2 border border-slate-700 transition-colors"
            >
              <Download size={14} /> JSON
            </button>
            <button 
              onClick={() => exportData('csv')}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg flex items-center gap-2 border border-slate-700 transition-colors"
            >
              <Download size={14} /> CSV
            </button>
          </div>
          <div className="prose prose-invert max-w-none">
            <ReactMarkdown>{messages[messages.length - 1].content}</ReactMarkdown>
          </div>
        </Card>
      )}

          <Card title="AI Orchestrator: Disruption Mitigation Prompt" icon={Code}>
            <div className="space-y-4">
              <p className="text-sm text-slate-400">
                This prompt acts as the <strong>Orchestrator</strong>. It combines the real-time disruption report with retrieved Spanner vector search results to generate a structured, actionable JSON mitigation plan.
              </p>
              <div className="relative group">
                <pre className="p-4 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-slate-300 overflow-x-auto whitespace-pre-wrap">
    {`You are the Nexus Orchestrator, an AI Supply Chain expert.

CONTEXT:
Disruption Report: {{user_disruption_report}}
Retrieved Spanner Vector Results: {{spanner_search_results}}

TASK:
Analyze the disruption and the available alternatives. Suggest a specific mitigation strategy.

OUTPUT FORMAT:
Return ONLY a JSON object with the following structure:
{
  "disruption_summary": "Brief summary of the issue",
  "risk_level": "High | Medium | Low",
  "mitigation_strategy": "Detailed explanation of the proposed action",
  "action_items": [
    {
      "step": 1,
      "action": "Description of action",
      "assigned_to": "Logistics | Procurement | Warehouse",
      "estimated_time": "e.g., 24 hours"
    }
  ],
  "alternative_suppliers": [
    {
      "name": "Supplier Name",
      "reason": "Why this supplier was chosen based on semantic match"
    }
  ],
  "expected_outcome": "What this strategy achieves"
}`}
                </pre>
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="px-2 py-1 bg-slate-800 rounded text-[10px] text-slate-400 border border-slate-700">Gemini 1.5 Pro Prompt</div>
                </div>
              </div>
              <div className="p-3 rounded-lg bg-purple-900/10 border border-purple-500/20">
                <h6 className="text-xs font-bold text-purple-400 mb-1">Architect's Note</h6>
                <p className="text-[10px] text-slate-500">
                  By forcing a JSON output, the Orchestrator's response can be directly consumed by downstream ERP systems or automated logistics triggers, enabling a truly "AI-Ready" autonomous supply chain.
                </p>
              </div>
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Alert Subscriptions" icon={Bell}>
            <p className="text-xs text-slate-500 mb-4">
              Set up notifications for specific keywords or regions.
            </p>
            
            <div className="space-y-3 mb-6">
              <div className="flex flex-col gap-2">
                <select 
                  value={newAlertType}
                  onChange={(e) => setNewAlertType(e.target.value as Alert['type'])}
                  className="bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-slate-300 outline-none"
                >
                  <option value="weather">Weather</option>
                  <option value="labor">Labor</option>
                  <option value="customs">Customs</option>
                  <option value="shortage">Shortage</option>
                  <option value="other">Other</option>
                </select>
                <input 
                  type="text"
                  placeholder="Keyword (e.g. Busan, Strike)"
                  value={newAlertKeyword}
                  onChange={(e) => setNewAlertKeyword(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-slate-300 outline-none"
                />
                <button 
                  onClick={addAlert}
                  className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded transition-colors"
                >
                  Add Alert
                </button>
              </div>
            </div>

            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
              {alerts.length === 0 ? (
                <p className="text-center text-slate-600 text-xs py-4 italic">No active alerts</p>
              ) : (
                alerts.map(alert => (
                  <div key={alert.id} className={`p-3 rounded border ${alert.active ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-900/20 border-slate-800 opacity-50'}`}>
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[10px] uppercase font-bold text-blue-400 tracking-wider">{alert.type}</span>
                      <div className="flex gap-2">
                        <button onClick={() => toggleAlert(alert.id)} className="text-slate-500 hover:text-blue-400">
                          {alert.active ? <Zap size={12} /> : <ZapOff size={12} />}
                        </button>
                        <button onClick={() => deleteAlert(alert.id)} className="text-slate-500 hover:text-red-400">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                    <p className="text-sm text-slate-200 font-medium">{alert.keyword}</p>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );

  const renderSemanticSearch = () => (
    <div className="space-y-6">
      <Card title="Semantic Search Demo" icon={Search}>
        <p className="text-slate-400 mb-6">
          Experience "AI-Ready" search. Try searching for "water-resistant electronics" to see how vector embeddings find "hydrophobic" components.
        </p>
        <div className="flex gap-2 mb-6">
          <input
            type="text"
            className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-slate-300 outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g., water-resistant electronics"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
          />
          <button
            onClick={() => handleSendMessage()}
            disabled={loading || !input}
            className="px-6 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold rounded-lg flex items-center gap-2 transition-colors"
          >
            {loading ? <Zap className="animate-spin" size={18} /> : <Search size={18} />}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-lg bg-slate-800/30 border border-slate-700">
            <h5 className="text-sm font-semibold text-blue-400 mb-2 flex items-center gap-2">
              <Terminal size={14} /> Traditional SQL
            </h5>
            <code className="text-xs text-slate-500 block bg-slate-950 p-2 rounded">
              SELECT * FROM inventory <br />
              WHERE description LIKE '%water-resistant%'
            </code>
            <p className="text-xs text-red-400/70 mt-2">Result: 0 matches (if only "hydrophobic" is used)</p>
          </div>
          <div className="p-4 rounded-lg bg-blue-900/10 border border-blue-500/30">
            <h5 className="text-sm font-semibold text-emerald-400 mb-2 flex items-center gap-2">
              <Zap size={14} /> AI-Ready Spanner
            </h5>
            <code className="text-xs text-slate-300 block bg-slate-950 p-2 rounded">
              SELECT * FROM inventory <br />
              ORDER BY COSINE_DISTANCE( <br />
              &nbsp;&nbsp;description_vector, <br />
              &nbsp;&nbsp;@query_vector <br />
              ) LIMIT 5
            </code>
            <p className="text-xs text-emerald-400 mt-2">Result: Found "Hydrophobic Circuit Board" (98% match)</p>
          </div>
        </div>
      </Card>

      {messages.length > 1 && activeTab === 'search' && (
        <Card title="Search Analysis" icon={Search} className="border-emerald-500/30">
          <div className="flex justify-end gap-2 mb-4">
            <button 
              onClick={() => exportData('json')}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg flex items-center gap-2 border border-slate-700 transition-colors"
            >
              <Download size={14} /> JSON
            </button>
            <button 
              onClick={() => exportData('csv')}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg flex items-center gap-2 border border-slate-700 transition-colors"
            >
              <Download size={14} /> CSV
            </button>
          </div>
          <div className="prose prose-invert max-w-none">
            <ReactMarkdown>{messages[messages.length - 1].content}</ReactMarkdown>
          </div>
        </Card>
      )}

      <Card title="Production Vector Search Query" icon={Code}>
        <div className="space-y-4">
          <p className="text-sm text-slate-400">
            This query demonstrates how to perform a semantic search in a single step. It converts the user's natural language problem into an embedding using <code className="text-blue-400">ML.PREDICT</code> and then finds the top 5 matches using <code className="text-blue-400">COSINE_DISTANCE</code>.
          </p>
          <div className="relative group">
            <pre className="p-4 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-slate-300 overflow-x-auto">
{`-- Find alternatives for a specific disruption scenario
SELECT 
  ItemName, 
  SupplierName, 
  Description,
  COSINE_DISTANCE(
    DescriptionVector, 
    (SELECT embeddings.values 
     FROM ML.PREDICT(
       MODEL text_embedding_model, 
       {content: 'Need a waterproof alternative for a high-voltage sensor due to a port delay'}
     ))
  ) AS distance
FROM SupplyChainItems
ORDER BY distance
LIMIT 5;`}
            </pre>
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="px-2 py-1 bg-slate-800 rounded text-[10px] text-slate-400 border border-slate-700">Spanner SQL</div>
            </div>
          </div>
          <div className="p-3 rounded-lg bg-blue-900/10 border border-blue-500/20">
            <h6 className="text-xs font-bold text-blue-400 mb-1">Architect's Note</h6>
            <p className="text-[10px] text-slate-500">
              By nesting <code className="text-slate-400">ML.PREDICT</code> inside the <code className="text-slate-400">SELECT</code>, we achieve "Search-in-Place." The database handles the embedding generation and the vector search in a single execution plan, ensuring maximum performance and minimal latency.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );

  const renderChat = () => (
    <div className="flex flex-col h-[calc(100vh-12rem)]">
      <div className="flex justify-between items-center mb-4">
        <h4 className="text-sm font-semibold text-slate-400">Nexus Conversation</h4>
        <div className="flex gap-2">
          <button 
            onClick={clearHistory}
            className="px-3 py-1.5 bg-slate-800 hover:bg-red-900/30 text-slate-400 hover:text-red-400 text-xs rounded-lg flex items-center gap-2 border border-slate-700 transition-colors"
          >
            Clear History
          </button>
          <button 
            onClick={() => exportData('json')}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg flex items-center gap-2 border border-slate-700 transition-colors"
          >
            <Download size={14} /> Export JSON
          </button>
          <button 
            onClick={() => exportData('csv')}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg flex items-center gap-2 border border-slate-700 transition-colors"
          >
            <Download size={14} /> Export CSV
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2 custom-scrollbar">
        {messages.map((msg, i) => (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            key={i}
            className={cn(
              "max-w-[80%] p-4 rounded-2xl",
              msg.role === 'assistant' 
                ? "bg-slate-800 text-slate-200 self-start rounded-tl-none border border-slate-700" 
                : "bg-blue-600 text-white self-end ml-auto rounded-tr-none shadow-lg shadow-blue-500/20"
            )}
          >
            <div className="prose prose-invert prose-sm max-w-none">
              <ReactMarkdown>{msg.content}</ReactMarkdown>
            </div>
          </motion.div>
        ))}
        {loading && (
          <div className="bg-slate-800 text-slate-200 self-start p-4 rounded-2xl rounded-tl-none border border-slate-700 animate-pulse flex items-center gap-2">
            <Zap size={16} className="animate-spin text-blue-400" />
            <span>Nexus is thinking...</span>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>
      <form onSubmit={handleSendMessage} className="flex gap-2">
        <input
          type="text"
          className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
          placeholder="Ask Nexus Architect anything..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button
          type="submit"
          disabled={loading || !input}
          className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white p-3 rounded-xl transition-all shadow-lg shadow-blue-500/20"
        >
          <ArrowRight size={20} />
        </button>
      </form>
    </div>
  );

  const renderArchitecture = () => (
    <div className="space-y-8 pb-12">
      <Card title="AI-Ready Supply Chain Resilience Architecture" icon={Globe}>
        <div className="relative p-8 bg-slate-950 rounded-xl border border-slate-800 overflow-hidden">
          {/* Background Grid */}
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#3b82f6 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
          
          <div className="relative flex flex-col items-center gap-12">
            {/* Layer 1: Ingestion */}
            <div className="flex gap-4">
              <div className="px-4 py-2 bg-slate-800 border border-slate-700 rounded text-xs font-mono text-slate-400">IoT Sensors</div>
              <div className="px-4 py-2 bg-slate-800 border border-slate-700 rounded text-xs font-mono text-slate-400">ERP Systems</div>
              <div className="px-4 py-2 bg-slate-800 border border-slate-700 rounded text-xs font-mono text-slate-400">External APIs</div>
            </div>

            <ArrowRight className="rotate-90 text-slate-700" size={24} />

            {/* Layer 2: Core Processing */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full">
              <div className="flex flex-col items-center gap-4 p-6 bg-blue-900/20 border border-blue-500/30 rounded-xl">
                <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20">
                  <Database className="text-white" size={24} />
                </div>
                <div className="text-center">
                  <h5 className="font-bold text-white text-sm">Cloud Spanner</h5>
                  <p className="text-[10px] text-blue-400 uppercase tracking-wider mt-1">Operational Core</p>
                </div>
              </div>

              <div className="flex flex-col items-center gap-4 p-6 bg-purple-900/20 border border-purple-500/30 rounded-xl">
                <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center shadow-lg shadow-purple-500/20">
                  <Zap className="text-white" size={24} />
                </div>
                <div className="text-center">
                  <h5 className="font-bold text-white text-sm">Vertex AI</h5>
                  <p className="text-[10px] text-purple-400 uppercase tracking-wider mt-1">Embeddings Engine</p>
                </div>
              </div>

              <div className="flex flex-col items-center gap-4 p-6 bg-emerald-900/20 border border-emerald-500/30 rounded-xl">
                <div className="w-12 h-12 bg-emerald-600 rounded-lg flex items-center justify-center shadow-lg shadow-emerald-500/20">
                  <Search className="text-white" size={24} />
                </div>
                <div className="text-center">
                  <h5 className="font-bold text-white text-sm">Vector Search</h5>
                  <p className="text-[10px] text-emerald-400 uppercase tracking-wider mt-1">Semantic Recovery</p>
                </div>
              </div>
            </div>

            <div className="w-full h-px bg-slate-800 relative">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 px-4 bg-slate-950 text-[10px] text-slate-500 uppercase tracking-[0.3em]">RAG Pipeline</div>
            </div>

            {/* Layer 3: Application */}
            <div className="p-6 bg-slate-900 border border-slate-700 rounded-xl w-full max-w-md text-center">
              <h5 className="font-bold text-white mb-2">Resilience Dashboard</h5>
              <p className="text-xs text-slate-400">Real-time disruption solving & semantic inventory recovery</p>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card title="Traditional MySQL Setup" icon={X} className="border-red-500/20">
          <ul className="space-y-4 text-sm text-slate-400">
            <li className="flex gap-3">
              <div className="w-5 h-5 rounded-full bg-red-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-red-500 text-[10px]">✕</span>
              </div>
              <span><strong>Keyword Search Only:</strong> Searching for "water-resistant" fails if data uses "hydrophobic".</span>
            </li>
            <li className="flex gap-3">
              <div className="w-5 h-5 rounded-full bg-red-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-red-500 text-[10px]">✕</span>
              </div>
              <span><strong>Manual Recovery:</strong> Disruption solving requires manual lookup and human intervention.</span>
            </li>
            <li className="flex gap-3">
              <div className="w-5 h-5 rounded-full bg-red-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-red-500 text-[10px]">✕</span>
              </div>
              <span><strong>Regional Silos:</strong> Scaling across APAC requires complex sharding and replication logic.</span>
            </li>
          </ul>
        </Card>

        <Card title="AI-Ready Spanner Setup" icon={CheckCircle2} className="border-emerald-500/20">
          <ul className="space-y-4 text-sm text-slate-300">
            <li className="flex gap-3">
              <div className="w-5 h-5 rounded-full bg-emerald-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <CheckCircle2 className="text-emerald-500" size={12} />
              </div>
              <span><strong>Semantic Search:</strong> Vector embeddings find conceptually similar items (e.g., "water-resistant" ↔ "hydrophobic").</span>
            </li>
            <li className="flex gap-3">
              <div className="w-5 h-5 rounded-full bg-emerald-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <CheckCircle2 className="text-emerald-500" size={12} />
              </div>
              <span><strong>Automated RAG:</strong> Vertex AI uses Spanner context to generate real-time shipping alternatives.</span>
            </li>
            <li className="flex gap-3">
              <div className="w-5 h-5 rounded-full bg-emerald-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <CheckCircle2 className="text-emerald-500" size={12} />
              </div>
              <span><strong>Global Consistency:</strong> Spanner handles massive APAC loads with built-in high availability and consistency.</span>
            </li>
          </ul>
        </Card>
      </div>

      <Card title="Architect's Technical Deep Dive" icon={Terminal}>
        <div className="prose prose-invert max-w-none text-sm">
          <p>
            The "AI-Ready" distinction lies in the <strong>unification of operational data and vector intelligence</strong>. 
            In a traditional setup, you would need to export data to a separate vector database, leading to latency and consistency issues.
          </p>
          <p>
            Our <strong>Nexus Architecture</strong> leverages Cloud Spanner's native ability to store and query vector embeddings alongside relational data. 
            When a disruption occurs (e.g., a typhoon in Busan), the system:
          </p>
          <ol>
            <li>Retrieves the affected SKU context from Spanner.</li>
            <li>Generates a query embedding via Vertex AI.</li>
            <li>Performs a Vector Search within Spanner to find alternative suppliers with conceptually similar capabilities.</li>
            <li>Feeds the results into a RAG pipeline to generate a human-readable mitigation strategy.</li>
          </ol>
        </div>
      </Card>

      <Card title="AI-Ready Spanner DDL Reference" icon={Code}>
        <div className="space-y-4">
          <p className="text-sm text-slate-400">
            This Google Standard SQL DDL defines the core <code className="text-blue-400">SupplyChainItems</code> table with a specialized vector column and an ANN (Approximate Nearest Neighbor) index for high-performance semantic recovery.
          </p>
          <div className="relative group">
            <pre className="p-4 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-slate-300 overflow-x-auto">
{`-- Create the core supply chain table
CREATE TABLE SupplyChainItems (
  ItemId STRING(36) NOT NULL,
  ItemName STRING(MAX) NOT NULL,
  SupplierName STRING(MAX) NOT NULL,
  Description STRING(MAX),
  -- Vector column for semantic embeddings (768 dimensions for Vertex AI)
  DescriptionVector ARRAY<FLOAT32>(vector_length=768),
  CreatedAt TIMESTAMP NOT NULL OPTIONS (allow_commit_timestamp=true),
) PRIMARY KEY (ItemId);

-- Create a Vector Index for ANN (Approximate Nearest Neighbor) search
CREATE VECTOR INDEX SupplyChainItemVectorIndex
ON SupplyChainItems(DescriptionVector)
OPTIONS (
  distance_type='COSINE', 
  index_type='SCANN'
);`}
            </pre>
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="px-2 py-1 bg-slate-800 rounded text-[10px] text-slate-400 border border-slate-700">Spanner DDL</div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div className="p-3 rounded-lg bg-blue-900/10 border border-blue-500/20">
              <h6 className="text-xs font-bold text-blue-400 mb-1">Vector Length</h6>
              <p className="text-[10px] text-slate-500">Optimized for Vertex AI <code className="text-slate-400">text-embedding-004</code> models (768 dims).</p>
            </div>
            <div className="p-3 rounded-lg bg-emerald-900/10 border border-emerald-500/20">
              <h6 className="text-xs font-bold text-emerald-400 mb-1">ScaNN Index</h6>
              <p className="text-[10px] text-slate-500">Industry-leading ANN algorithm for sub-millisecond retrieval at scale.</p>
            </div>
          </div>
        </div>
      </Card>

      <Card title="In-Database ML: Accelerating Migration with ML.PREDICT" icon={Zap}>
        <div className="space-y-4">
          <p className="text-sm text-slate-400">
            Nexus Architect uses <strong>In-Database ML</strong> to eliminate the "ETL bottleneck." By calling Vertex AI models directly via SQL, we generate embeddings without moving data to external processing layers.
          </p>
          
          <div className="relative group">
            <pre className="p-4 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-slate-300 overflow-x-auto">
{`-- 1. Register the Vertex AI model in Spanner
CREATE MODEL text_embedding_model
INPUT (content STRING(MAX))
OUTPUT (embeddings STRUCT<
  statistics STRUCT<truncated BOOL, token_count INT64>, 
  values ARRAY<FLOAT32>
>)
REMOTE OPTIONS (
  endpoint = 'https://asia-southeast1-aiplatform.googleapis.com/v1/projects/my-project/locations/asia-southeast1/publishers/google/models/text-embedding-004'
);

-- 2. Generate embeddings in-place for all items
UPDATE SupplyChainItems
SET DescriptionVector = (
  SELECT embeddings.values
  FROM ML.PREDICT(
    MODEL text_embedding_model,
    {content: Description}
  )
)
WHERE DescriptionVector IS NULL;`}
            </pre>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-slate-800/30 border border-slate-700">
              <h5 className="text-xs font-bold text-white mb-2 uppercase tracking-wider">Traditional ETL Migration</h5>
              <ul className="text-[10px] text-slate-500 space-y-1 list-disc pl-4">
                <li>Export data to Python/Dataflow</li>
                <li>Call Vertex AI API externally</li>
                <li>Manage API rate limits & retries</li>
                <li>Write vectorized data back to DB</li>
                <li className="text-red-400/70 font-bold">Result: High Latency & Complexity</li>
              </ul>
            </div>
            <div className="p-4 rounded-lg bg-blue-900/10 border border-blue-500/30">
              <h5 className="text-xs font-bold text-blue-400 mb-2 uppercase tracking-wider">AI-Ready Spanner Migration</h5>
              <ul className="text-[10px] text-slate-300 space-y-1 list-disc pl-4">
                <li>Data stays inside the database</li>
                <li>SQL-native ML.PREDICT calls</li>
                <li>Automatic parallelization by Spanner</li>
                <li>Atomic updates in a single step</li>
                <li className="text-emerald-400 font-bold">Result: 10x Faster "Time-to-Intelligence"</li>
              </ul>
            </div>
          </div>
        </div>
      </Card>

      <Card title="Scaling to 1 Million Items: KNN vs ANN" icon={Zap}>
        <div className="space-y-6">
          <p className="text-sm text-slate-400">
            To scale from a prototype (1,000 items) to a global production environment (1,000,000+ items), the choice between <strong>Exact (KNN)</strong> and <strong>Approximate (ANN)</strong> search is critical for supply chain speed.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
              <h6 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">KNN (Exact Search)</h6>
              <p className="text-[11px] text-slate-500 leading-relaxed mb-3">
                Scans every row in the database to find the absolute closest matches.
              </p>
              <ul className="space-y-2 text-[10px]">
                <li className="flex items-center gap-2 text-red-400/70">
                  <X size={10} /> O(N) Complexity (Slows as data grows)
                </li>
                <li className="flex items-center gap-2 text-emerald-400/70">
                  <CheckCircle2 size={10} /> 100% Precision
                </li>
              </ul>
            </div>

            <div className="p-4 rounded-xl bg-blue-900/10 border border-blue-500/20">
              <h6 className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-2">ANN (Approximate Search)</h6>
              <p className="text-[11px] text-slate-400 leading-relaxed mb-3">
                Uses the <code className="text-blue-300">SCANN</code> index to narrow the search space instantly.
              </p>
              <ul className="space-y-2 text-[10px]">
                <li className="flex items-center gap-2 text-emerald-400">
                  <CheckCircle2 size={10} /> O(log N) Complexity (Sub-ms at scale)
                </li>
                <li className="flex items-center gap-2 text-blue-400/70">
                  <CheckCircle2 size={10} /> 99%+ Recall (Near-perfect accuracy)
                </li>
              </ul>
            </div>
          </div>

          <div className="p-4 bg-slate-950 border border-slate-800 rounded-lg">
            <h6 className="text-xs font-bold text-white mb-2">The "Supply Chain Speed" Advantage</h6>
            <p className="text-xs text-slate-400 leading-relaxed">
              In a port delay scenario, <strong>latency is the enemy</strong>. Finding a 99% accurate alternative supplier in <strong>10 milliseconds</strong> using ANN allows for immediate automated re-routing. Waiting <strong>5 seconds</strong> for a 100% exact KNN match could mean missing the last available shipping container on an alternative vessel.
            </p>
          </div>

          <div className="relative group">
            <pre className="p-4 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-slate-300 overflow-x-auto">
{`-- Production-Grade Vector Index for 1M+ Items
CREATE VECTOR INDEX SupplyChainItemVectorIndex
ON SupplyChainItems(DescriptionVector)
OPTIONS (
  distance_type='COSINE', 
  index_type='SCANN',    -- Google's state-of-the-art ANN algorithm
  tree_size=1000,        -- Optimizes search space partitioning
  num_leaves=10          -- Balances speed vs. recall
);`}
            </pre>
            <div className="absolute top-2 right-2 px-2 py-1 bg-slate-800 rounded text-[10px] text-slate-400 border border-slate-700">
              Scalable DDL
            </div>
          </div>
        </div>
      </Card>

      <Card title="Global Resilience: Multi-Region APAC Strategy" icon={Globe}>
        <div className="space-y-6">
          <p className="text-sm text-slate-400">
            For APAC logistics, a single-region database is a single point of failure. Spanner's <strong>Multi-Region</strong> configuration ensures that your "AI-Ready" intelligence remains online even during a total regional infrastructure failure.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
              <h6 className="text-[10px] font-bold text-blue-400 uppercase tracking-wider mb-2">High Availability</h6>
              <p className="text-[11px] text-slate-300">
                <strong>99.999% SLA</strong>. Synchronous replication across multiple regions (e.g., Singapore, Tokyo, Sydney) means zero data loss and near-zero downtime.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
              <h6 className="text-[10px] font-bold text-purple-400 uppercase tracking-wider mb-2">Regional Failover</h6>
              <p className="text-[11px] text-slate-300">
                If a typhoon takes out a data center in <strong>Tokyo</strong>, Spanner automatically routes traffic to <strong>Singapore</strong> without manual intervention or app code changes.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
              <h6 className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider mb-2">AI-Ready Uptime</h6>
              <p className="text-[11px] text-slate-300">
                Your <strong>Vector Search</strong> and <strong>ML.PREDICT</strong> models are globally available. Disruption solving continues even if the primary region is offline.
              </p>
            </div>
          </div>

          <div className="p-4 bg-blue-900/10 border border-blue-500/20 rounded-lg">
            <h6 className="text-xs font-bold text-blue-400 mb-2">The "AI-Ready" Advantage in APAC</h6>
            <p className="text-xs text-slate-400 leading-relaxed">
              In a traditional MySQL setup, a regional failure requires complex DNS changes, manual failover, and potential data loss (RPO &gt; 0). With Spanner, the <strong>Operational Core</strong> is natively global. This means your AI Orchestrator can still access the <strong>DescriptionVector</strong> and alternative suppliers from a healthy region, ensuring the supply chain never stops moving.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-blue-500/30">
      {/* --- Mobile Header --- */}
      <div className="lg:hidden flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <Zap size={18} className="text-white" />
          </div>
          <span className="font-bold text-lg tracking-tight">Nexus Architect</span>
        </div>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-slate-400">
          {isMobileMenuOpen ? <X /> : <Menu />}
        </button>
      </div>

      <div className="flex">
        {/* --- Sidebar --- */}
        <aside className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 bg-slate-950 border-r border-slate-800 transition-transform lg:translate-x-0 lg:static lg:block",
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        )}>
          <div className="flex flex-col h-full p-6">
            <div className="hidden lg:flex items-center gap-3 mb-10">
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
                <Zap size={22} className="text-white" />
              </div>
              <div>
                <h1 className="font-bold text-xl leading-none tracking-tight">Nexus</h1>
                <p className="text-[10px] text-blue-400 uppercase tracking-[0.2em] mt-1 font-semibold">Architect</p>
              </div>
            </div>

            <nav className="space-y-2 flex-1">
              <SidebarItem 
                icon={LayoutDashboard} 
                label="Dashboard" 
                active={activeTab === 'dashboard'} 
                onClick={() => { setActiveTab('dashboard'); setIsMobileMenuOpen(false); }} 
              />
              <SidebarItem 
                icon={Database} 
                label="Data Migration" 
                active={activeTab === 'migration'} 
                onClick={() => { setActiveTab('migration'); setIsMobileMenuOpen(false); }} 
              />
              <SidebarItem 
                icon={Ship} 
                label="Disruption Solver" 
                active={activeTab === 'disruption'} 
                onClick={() => { setActiveTab('disruption'); setIsMobileMenuOpen(false); }} 
              />
              <SidebarItem 
                icon={Search} 
                label="Semantic Search" 
                active={activeTab === 'search'} 
                onClick={() => { setActiveTab('search'); setIsMobileMenuOpen(false); }} 
              />
              <SidebarItem 
                icon={Globe} 
                label="System Architecture" 
                active={activeTab === 'architecture'} 
                onClick={() => { setActiveTab('architecture'); setIsMobileMenuOpen(false); }} 
              />
              <SidebarItem 
                icon={MessageSquare} 
                label="Consultant Chat" 
                active={activeTab === 'chat'} 
                onClick={() => { setActiveTab('chat'); setIsMobileMenuOpen(false); }} 
              />
            </nav>

            <div className="mt-auto pt-6 border-t border-slate-800">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-900/50 border border-slate-800">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500"></div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-slate-200 truncate">APAC Manager</p>
                  <p className="text-[10px] text-slate-500 truncate">Singapore Retail</p>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* --- Main Content --- */}
        <main className="flex-1 min-h-screen p-4 lg:p-8 max-w-6xl mx-auto w-full">
          <header className="mb-8 hidden lg:block">
            <h2 className="text-3xl font-bold text-white tracking-tight capitalize">
              {activeTab.replace('-', ' ')}
            </h2>
            <p className="text-slate-400 mt-1">
              {activeTab === 'dashboard' && "Real-time overview of your AI-Ready supply chain."}
              {activeTab === 'migration' && "Migrate legacy inventory to vector-enabled Spanner."}
              {activeTab === 'disruption' && "Solve logistics bottlenecks with RAG intelligence."}
              {activeTab === 'search' && "Experience the power of semantic vector search."}
              {activeTab === 'chat' && "Direct consultation with the Nexus AI Architect."}
            </p>
          </header>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'dashboard' && renderDashboard()}
              {activeTab === 'migration' && renderMigration()}
              {activeTab === 'disruption' && renderDisruption()}
              {activeTab === 'search' && renderSemanticSearch()}
              {activeTab === 'architecture' && renderArchitecture()}
              {activeTab === 'chat' && renderChat()}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #1e293b;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #334155;
        }
      `}} />
    </div>
  );
}
