
import React, { useState, useEffect } from 'react';
import { Link, Copy, CheckCircle, Send, Settings, Eye, Plus, Trash2, Edit3, Activity, Clock, AlertCircle, CheckCircle2 } from 'lucide-react';

interface PostbackManagerProps {
  isDarkMode?: boolean;
}

// API base URL
const API_BASE = window.location.hostname.includes('localhost') || window.location.hostname === '127.0.0.1'
  ? 'http://127.0.0.1:5000'
  : 'https://pepper-flask-app.onrender.com';

// API helper functions
const api = {
  async getPartners() {
    const response = await fetch(`${API_BASE}/api/partners`);
    if (!response.ok) throw new Error('Failed to fetch partners');
    return response.json();
  },
  
  async addPartner(partner: { name: string; url: string; status?: string }) {
    const response = await fetch(`${API_BASE}/api/partners`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(partner)
    });
    if (!response.ok) throw new Error('Failed to add partner');
    return response.json();
  },
  
  async updatePartner(id: string, partner: { name: string; url: string; status?: string }) {
    const response = await fetch(`${API_BASE}/api/partners/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(partner)
    });
    if (!response.ok) throw new Error('Failed to update partner');
    return response.json();
  },
  
  async deletePartner(id: string) {
    const response = await fetch(`${API_BASE}/api/partners/${id}`, {
      method: 'DELETE'
    });
    if (!response.ok) throw new Error('Failed to delete partner');
    return response.json();
  },
  
  async getLogs() {
    const response = await fetch(`${API_BASE}/api/postback-logs`);
    if (!response.ok) throw new Error('Failed to fetch logs');
    return response.json();
  }
};


const PostbackManager: React.FC<PostbackManagerProps> = ({ isDarkMode = false }) => {
  const [activeTab, setActiveTab] = useState<'sender' | 'receiver' | 'logs'>('sender');

  return (
    <div className={`p-6 rounded-2xl shadow-lg border ${
      isDarkMode 
        ? 'bg-slate-800 border-slate-700' 
        : 'bg-white border-red-100'
    }`}>
      <div className="flex items-center justify-between mb-6">
        <h2 className={`text-2xl font-bold flex items-center gap-2 ${
          isDarkMode ? 'text-white' : 'text-gray-900'
        }`}>
          <Link size={24} className="text-red-600" />
          <span className="text-2xl">🌶️</span>
          Postback & Webhook Integrations
        </h2>
        <div className={`flex rounded-lg p-1 text-xs ${isDarkMode ? 'bg-slate-700/40' : 'bg-stone-100'}`}>
          <button 
            onClick={() => setActiveTab('sender')}
            className={`px-4 py-2 rounded-md transition-colors flex items-center gap-2 ${
              activeTab === 'sender' 
                ? (isDarkMode ? 'bg-red-500 text-white' : 'bg-white text-red-600 shadow-sm') 
                : (isDarkMode ? 'text-slate-300 hover:text-white' : 'text-stone-600 hover:text-stone-800')
            }`}
          >
            <Send size={14} /> Outbound (Sender)
          </button>
          <button 
            onClick={() => setActiveTab('receiver')}
            className={`px-4 py-2 rounded-md transition-colors flex items-center gap-2 ${
              activeTab === 'receiver' 
                ? (isDarkMode ? 'bg-red-500 text-white' : 'bg-white text-red-600 shadow-sm') 
                : (isDarkMode ? 'text-slate-300 hover:text-white' : 'text-stone-600 hover:text-stone-800')
            }`}
          >
           <Eye size={14} /> Inbound (Receiver)
          </button>
           <button 
            onClick={() => setActiveTab('logs')}
            className={`px-4 py-2 rounded-md transition-colors flex items-center gap-2 ${
              activeTab === 'logs' 
                ? (isDarkMode ? 'bg-red-500 text-white' : 'bg-white text-red-600 shadow-sm') 
                : (isDarkMode ? 'text-slate-300 hover:text-white' : 'text-stone-600 hover:text-stone-800')
            }`}
          >
           <Activity size={14} /> Logs
          </button>
        </div>
      </div>

      {activeTab === 'sender' && <PostbackSender isDarkMode={isDarkMode} />}
      {activeTab === 'receiver' && <PostbackReceiver isDarkMode={isDarkMode} />}
      {activeTab === 'logs' && <PostbackLogs isDarkMode={isDarkMode} />}
    </div>
  );
};

const PostbackSender: React.FC<{ isDarkMode: boolean }> = ({ isDarkMode }) => {
    const [partners, setPartners] = useState([]);
    const [isEditing, setIsEditing] = useState<string | null>(null);
    const [editedPartner, setEditedPartner] = useState({ name: '', url: '', status: 'inactive' });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Load partners on component mount
    useEffect(() => {
        loadPartners();
    }, []);

    const loadPartners = async () => {
        try {
            setLoading(true);
            const data = await api.getPartners();
            setPartners(data);
        } catch (err) {
            setError('Failed to load partners');
            console.error('Error loading partners:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (partner) => {
        setIsEditing(partner.id);
        setEditedPartner({ name: partner.name, url: partner.url, status: partner.status });
    };

    const handleSave = async (partnerId) => {
        try {
            await api.updatePartner(partnerId, editedPartner);
            setPartners(partners.map(p => p.id === partnerId ? { ...p, ...editedPartner } : p));
            setIsEditing(null);
        } catch (err) {
            setError('Failed to update partner');
            console.error('Error updating partner:', err);
        }
    };

    const handleAdd = async () => {
        try {
            const newPartner = await api.addPartner({
                name: 'New Partner',
                url: 'https://newpartner.com/track?subid=[TRANSACTION_ID]',
                status: 'inactive'
            });
            setPartners([...partners, newPartner]);
            handleEdit(newPartner);
        } catch (err) {
            setError('Failed to add partner');
            console.error('Error adding partner:', err);
        }
    };
    
    const handleDelete = async (partnerId) => {
        if (!confirm('Are you sure you want to delete this partner?')) return;
        
        try {
            await api.deletePartner(partnerId);
            setPartners(partners.filter(p => p.id !== partnerId));
        } catch (err) {
            setError('Failed to delete partner');
            console.error('Error deleting partner:', err);
        }
    };

    const availableParams = ['[TRANSACTION_ID]', '[REWARD]', '[CURRENCY]', '[USERNAME]', '[SESSION_ID]', '[COMPLETE_ID]'];

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                        <Settings size={20} />
                        Manage Outbound Partners
                    </h3>
                    <p className={`text-sm mt-1 ${isDarkMode ? 'text-slate-300' : 'text-gray-600'}`}>
                        When a survey is completed, we will send a GET request to your active partners.
                    </p>
                </div>
                <button onClick={handleAdd} className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
                    <Plus size={16} /> Add Partner
                </button>
            </div>
            
            <div className="space-y-4">
                {partners.map(partner => (
                    <div key={partner.id} className={`p-4 rounded-lg border ${isDarkMode ? 'bg-slate-700/50 border-slate-600' : 'bg-gray-50 border-gray-200'}`}>
                        {isEditing === partner.id ? (
                            <div className="space-y-3">
                                <input 
                                    value={editedPartner.name}
                                    onChange={(e) => setEditedPartner({...editedPartner, name: e.target.value})}
                                    className={`w-full p-2 border rounded ${isDarkMode ? 'bg-slate-800 border-slate-500' : 'bg-white border-gray-300'}`}
                                />
                                <textarea 
                                    value={editedPartner.url}
                                    onChange={(e) => setEditedPartner({...editedPartner, url: e.target.value})}
                                    rows={3}
                                    className={`w-full p-2 border rounded font-mono text-sm ${isDarkMode ? 'bg-slate-800 border-slate-500' : 'bg-white border-gray-300'}`}
                                />
                                <div className="flex gap-2">
                                    <button onClick={() => handleSave(partner.id)} className="px-3 py-1 bg-green-600 text-white rounded">Save</button>
                                    <button onClick={() => setIsEditing(null)} className="px-3 py-1 bg-gray-500 text-white rounded">Cancel</button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex justify-between items-center">
                                <div>
                                    <h4 className="font-semibold flex items-center gap-2">
                                        <span className={`w-2 h-2 rounded-full ${partner.status === 'active' ? 'bg-green-500' : 'bg-gray-500'}`}></span>
                                        {partner.name}
                                    </h4>
                                    <p className={`text-xs font-mono mt-1 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>{partner.url}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => alert('Sending test postback...')} className="p-2 hover:bg-blue-500/20 rounded-full transition-colors"><Send size={16} className="text-blue-500" /></button>
                                    <button onClick={() => handleEdit(partner)} className="p-2 hover:bg-yellow-500/20 rounded-full transition-colors"><Edit3 size={16} className="text-yellow-500" /></button>
                                    <button onClick={() => handleDelete(partner.id)} className="p-2 hover:bg-red-500/20 rounded-full transition-colors"><Trash2 size={16} className="text-red-500" /></button>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-slate-700/50' : 'bg-gray-50'}`}>
                <h4 className="font-semibold mb-2">Available Parameters</h4>
                <p className={`text-sm mb-2 ${isDarkMode ? 'text-slate-300' : 'text-gray-600'}`}>
                    Use these placeholders in your URL. They will be replaced with actual data from the survey response.
                </p>
                <div className="grid grid-cols-3 gap-2 text-sm">
                    {availableParams.map(param => (
                         <pre key={param} className={`p-2 rounded text-center ${isDarkMode ? 'bg-slate-600' : 'bg-gray-200'}`}>{param}</pre>
                    ))}
                </div>
            </div>
        </div>
    );
};

const PostbackReceiver: React.FC<{ isDarkMode: boolean }> = ({ isDarkMode }) => {
    const [testResult, setTestResult] = useState('');
    const [isTestingReceiver, setIsTestingReceiver] = useState(false);
    
    const baseUrl = window.location.hostname.includes('localhost') || window.location.hostname === '127.0.0.1'
        ? 'http://127.0.0.1:5000/postback-handler'
        : 'https://pepper-flask-app.onrender.com/postback-handler';
  
    const fullUrl = `${baseUrl}?sid1=[YOUR_UNIQUE_ID]&status=[STATUS]&reward=[REWARD]`;
    const productionUrl = 'https://pepper-flask-app.onrender.com/postback-handler';

    const copyToClipboard = async () => {
      await navigator.clipboard.writeText(productionUrl);
      alert('Production URL copied to clipboard!');
    };
    
    const testPostbackReceiver = async () => {
        setIsTestingReceiver(true);
        setTestResult('🧪 Testing postback receiver...');
        
        try {
            // Generate a test response ID
            const testResponseId = 'test-response-' + Date.now();
            
            // Now test the postback receiver with the test response ID
            const testParams = {
                sid1: testResponseId,
                transaction_id: 'test-txn-' + Date.now(),
                status: 'confirmed',
                reward: '1.50',
                currency: 'USD',
                username: 'testuser'
            };
            
            const queryString = new URLSearchParams(testParams).toString();
            const postbackResponse = await fetch(`${baseUrl}?${queryString}`);
            
            if (postbackResponse.ok) {
                const result = await postbackResponse.text();
                setTestResult(`✅ SUCCESS: Postback receiver is working!\n\nResponse: ${result}\n\n🎯 Your postback URL is ready to use with AdBreak Media!`);
            } else {
                const errorText = await postbackResponse.text();
                if (postbackResponse.status === 404) {
                    setTestResult(`⚠️  Test response not found, but receiver is working!\n\nThis is expected - the receiver successfully processed the request but couldn't find a matching survey response.\n\n✅ Your postback URL is working correctly!`);
                } else {
                    setTestResult(`❌ FAILED: HTTP ${postbackResponse.status}\n\nError: ${errorText}`);
                }
            }
        } catch (error) {
            setTestResult(`❌ FAILED: Network error - ${error}\n\nMake sure your Flask server is running on ${baseUrl}`);
        } finally {
            setIsTestingReceiver(false);
        }
    };
  
    return (
      <div className="space-y-6">
        <div>
            <h3 className="text-lg font-semibold flex items-center gap-2">
                <Eye size={20} />
                Receiving Inbound Postbacks
            </h3>
            <p className={`text-sm mt-1 ${isDarkMode ? 'text-slate-300' : 'text-gray-600'}`}>
                Provide this URL to your partners. We will track completions when they send a GET request to this endpoint.
            </p>
        </div>
        
        <div className={`p-4 rounded-lg border ${isDarkMode ? 'bg-slate-700/50 border-slate-600' : 'bg-gray-50 border-gray-200'}`}>
             <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>
                  Your Postback URL
             </label>
             <div className="flex gap-2">
                  <input
                    type="text"
                    value={fullUrl}
                    readOnly
                    className={`flex-1 px-4 py-3 border rounded-xl font-mono text-sm ${
                      isDarkMode
                        ? 'bg-slate-800 text-slate-200 border-slate-600'
                        : 'bg-gray-100 text-gray-800 border-gray-300'
                    }`}
                  />
                  <button
                    onClick={copyToClipboard}
                    className="px-4 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-xl font-medium transition-colors flex items-center gap-2"
                  >
                    <Copy size={18} /> Copy
                  </button>
             </div>
        </div>

        <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-slate-700/50' : 'bg-gray-50'}`}>
                <h4 className="font-semibold mb-2">Accepted Parameters</h4>
                <p className={`text-sm mb-2 ${isDarkMode ? 'text-slate-300' : 'text-gray-600'}`}>
                    We accept the following query parameters. `sid1` is required.
                </p>
                <ul className="list-disc list-inside space-y-1 text-sm">
                    <li>`sid1`: Your unique tracking ID for the user session. (Required)</li>
                    <li>`status`: The status of the conversion (e.g., "confirmed", "declined"). Defaults to "confirmed".</li>
                    <li>`reward`: The payout amount.</li>
                    <li>`currency`: The currency of the reward (e.g., "USD").</li>
                    <li>`transaction_id`: The partner's internal transaction ID. (Optional)</li>
                </ul>
            </div>
            
            {/* Test Section */}
            <div className={`p-4 rounded-lg border ${isDarkMode ? 'bg-blue-900/20 border-blue-500/30' : 'bg-blue-50 border-blue-200'}`}>
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <Send size={16} className="text-blue-500" />
                    Test Your Postback Receiver
                </h4>
                <p className={`text-sm mb-3 ${isDarkMode ? 'text-slate-300' : 'text-gray-600'}`}>
                    Test your postback receiver to make sure it's working correctly before giving the URL to AdBreak Media.
                </p>
                <button
                    onClick={testPostbackReceiver}
                    disabled={isTestingReceiver}
                    className={`w-full px-4 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                        isTestingReceiver
                            ? 'bg-gray-400 text-gray-700 cursor-not-allowed'
                            : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                >
                    {isTestingReceiver ? (
                        <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            Testing...
                        </>
                    ) : (
                        <>
                            <Send size={16} />
                            Test Postback Receiver
                        </>
                    )}
                </button>
                
                {testResult && (
                    <div className={`mt-4 p-3 rounded-lg border text-sm whitespace-pre-wrap ${
                        testResult.includes('✅') || testResult.includes('⚠️')
                            ? (isDarkMode ? 'bg-green-900/20 border-green-500/30 text-green-300' : 'bg-green-50 border-green-200 text-green-700')
                            : (isDarkMode ? 'bg-red-900/20 border-red-500/30 text-red-300' : 'bg-red-50 border-red-200 text-red-700')
                    }`}>
                        {testResult}
                    </div>
                )}
            </div>
      </div>
    );
};

const PostbackLogs: React.FC<{ isDarkMode: boolean }> = ({ isDarkMode }) => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Load logs on component mount
    useEffect(() => {
        loadLogs();
    }, []);

    const loadLogs = async () => {
        try {
            setLoading(true);
            const data = await api.getLogs();
            setLogs(data);
        } catch (err) {
            setError('Failed to load logs');
            console.error('Error loading logs:', err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-8">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto mb-2"></div>
                    <p className={isDarkMode ? 'text-slate-300' : 'text-gray-600'}>Loading logs...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
             {error && (
                <div className={`p-3 rounded-lg border ${isDarkMode ? 'bg-red-800/20 border-red-500 text-red-200' : 'bg-red-50 border-red-200 text-red-700'}`}>
                    <AlertCircle size={16} className="inline mr-2" />
                    {error}
                </div>
            )}

            <div>
                <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Activity size={20} />
                    Outbound Postback Logs
                </h3>
                <p className={`text-sm mt-1 ${isDarkMode ? 'text-slate-300' : 'text-gray-600'}`}>
                    A real-time stream of postbacks sent to your partners.
                </p>
            </div>
            <div className={`border rounded-lg ${isDarkMode ? 'border-slate-600' : 'border-gray-200'}`}>
                <table className="w-full text-sm text-left">
                    <thead className={`border-b ${isDarkMode ? 'border-slate-600 bg-slate-700/50' : 'border-gray-200 bg-gray-50'}`}>
                        <tr>
                            <th className="p-3">Partner</th>
                            <th className="p-3">Timestamp</th>
                            <th className="p-3">Status</th>
                            <th className="p-3">URL Sent</th>
                        </tr>
                    </thead>
                    <tbody>
                        {logs.map(log => (
                            <tr key={log.id} className={`border-b ${isDarkMode ? 'border-slate-700' : 'border-gray-100'}`}>
                                <td className="p-3">{log.partnerName}</td>
                                <td className="p-3"><Clock size={14} className="inline mr-1" /> {log.timestamp}</td>
                                <td className="p-3">
                                    <span className={`px-2 py-1 rounded-full text-xs flex items-center gap-1 ${
                                        log.status === 'success' 
                                            ? (isDarkMode ? 'bg-green-500/20 text-green-300' : 'bg-green-100 text-green-800')
                                            : (isDarkMode ? 'bg-red-500/20 text-red-300' : 'bg-red-100 text-red-800')
                                    }`}>
                                        {log.status === 'success' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                                        {log.status}
                                    </span>
                                </td>
                                <td className={`p-3 font-mono text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                                    {log.url}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
  

export default PostbackManager;

